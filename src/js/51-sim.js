/* ============================================================
   51-sim.js :: the world clock
   Two hundred accounts log in on their own schedules, play, fall
   out with each other and drift away from the game whether or not
   anyone is watching. This is what runs that.
   ============================================================ */

GAME.sim = (function () {

  var timer = null;
  var lastPresence = 0;
  var lastEconomy = 0;
  var onlineCache = null;
  var onlineCacheAt = 0;

  /* ---- presence -------------------------------------------------- */
  function updatePresence(now, coarse) {
    for (var i = 0; i < S.npcs.length; i++) {
      var n = S.npcs[i];
      if (n.dead) { n.online = false; continue; }
      if (n.online) {
        if (now >= n.onlineUntil) {
          n.online = false;
          n.lastOnline = now;
          if (!coarse && chance(0.10 + n.p.chatty * 0.2)) GAME.npc.chatEvent(n, 'farewell', now);
          if (!coarse && chance(0.05)) GAME.feed.newsFrom('logout', 'presence', { who: n.name, city: n.city });
        }
        continue;
      }
      var pressure = GAME.npc.onlinePressure(n, now);
      /* pressure is a per-window intensity. The window is clamped: without
         it, a page reload leaves lastPresence at zero and the whole roster
         logs in at once. */
      var win = coarse ? CFG.OFFLINE_STEP_MS : clamp(now - lastPresence, 1000, 20 * MIN);
      var p = 1 - Math.pow(1 - clamp(pressure * 0.42, 0, 0.9), win / (45 * MIN));
      if (chance(p)) {
        n.online = true;
        n.onlineUntil = now + Math.round(n.sessionLen * MIN * rflt(0.5, 1.7));
        GAME.npc.catchUpPools(n, now);
        n.lastOnline = now;
        if (!coarse && chance(0.14 + n.p.chatty * 0.3)) GAME.npc.chatEvent(n, 'greeting', now);
        if (!coarse && chance(0.04)) GAME.feed.newsFrom('login', 'presence', { who: n.name, city: n.city });
      }
    }
    lastPresence = now;
    onlineCache = null;
  }

  function onlineList() {
    var now = NOW();
    if (onlineCache && now - onlineCacheAt < 2000) return onlineCache;
    var out = [];
    for (var i = 0; i < S.npcs.length; i++) if (S.npcs[i].online && !S.npcs[i].dead) out.push(S.npcs[i]);
    onlineCache = out; onlineCacheAt = now;
    return out;
  }

  function onlineCount() { return onlineList().length; }

  /* ---- churn ------------------------------------------------------
     Accounts go quiet and never come back. New people sign up and start
     at the bottom of the ladder. Over weeks the roster genuinely turns
     over, which is the single most convincing thing about a live game.
  -------------------------------------------------------------------- */
  function churn(now) {
    var day = Math.floor((now - S.createdAt) / DAY);
    if (S.counters.day === day) return;
    S.counters.day = day;
    S.player.st.daysActive = (S.player.st.daysActive || 1) + 1;

    /* People do drift away, but slowly - most of the roster you meet on day
       one is still here months later, levelling alongside you. */
    var quits = 0;
    for (var i = 0; i < S.npcs.length; i++) {
      var n = S.npcs[i];
      if (n.dead) continue;
      var idleDays = (now - n.lastOnline) / DAY;
      var q = 0.0004 + (1 - n.p.activity) * 0.0022 + (1 - n.p.patience) * 0.0012;
      if (idleDays > 14) q += 0.012;
      if (idleDays > 45) q += 0.06;
      if (chance(q)) {
        n.dead = true; n.online = false; quits++;
        GAME.feed.newsFrom('logout', 'presence', { who: n.name, city: n.city });
      }
    }

    /* one in, one out: the city is always CFG.NPC_COUNT strong */
    var living = 0;
    for (var lv = 0; lv < S.npcs.length; lv++) if (!S.npcs[lv].dead) living++;
    var joins = Math.max(0, CFG.NPC_COUNT - living);
    var used = {};
    for (var u = 0; u < S.npcs.length; u++) used[S.npcs[u].name.toLowerCase()] = 1;
    used[S.player.name.toLowerCase()] = 1;
    for (var j = 0; j < joins; j++) {
      var fresh = GAME.state.makeNPC(S.nextNpcId++, used, now, true);
      fresh.joined = now;
      fresh.rung = 0;                     // nobody starts on the Attack Ladder
      fresh.w = 0; fresh.l = 0; fresh.crimes = rint(0, 12); fresh.posts = 0;
      fresh.fam = null;
      S.npcs.push(fresh);
      GAME.feed.news('presence', '{who} signed up. Somebody get the kid a drink.', { who: fresh.name });
    }

    /* An account that stopped logging in eventually gets purged. If it was
       holding a rung, the strongest name outside the twenty moves up into
       the empty slot - the ladder is never short. */
    for (var d = S.npcs.length - 1; d >= 0; d--) {
      var e = S.npcs[d];
      if (!e.dead || (now - e.lastOnline) < 21 * DAY) continue;
      var li = S.ladder.indexOf(e.id);
      if (li >= 0) S.ladder.splice(li, 1);
      S.npcs.splice(d, 1);
      reindex();
    }
    backfillLadder();
    GAME.ladder.sync();

    /* grudges cool off */
    for (var g = 0; g < S.npcs.length; g++) {
      var m = S.npcs[g];
      m.grudge = Math.max(0, m.grudge - (2 + m.p.patience * 5));
      m.fear = Math.max(0, m.fear - 3);
      if (m.op > 0) m.op = Math.max(0, m.op - 0.5);
      if (m.op < 0) m.op = Math.min(0, m.op + 0.7);
    }

    /* families drift: people leave, wars start and end */
    familyDrift(now);
  }

  /* Keep the ladder at exactly its full height. */
  function backfillLadder() {
    var l = S.ladder;
    /* drop anybody who no longer exists or has been purged */
    for (var i = l.length - 1; i >= 0; i--) {
      var e = byId(l[i]);
      if (!e) l.splice(i, 1);
    }
    while (l.length > CFG.LADDER_RUNGS) l.pop();
    if (l.length >= CFG.LADDER_RUNGS) return;
    var pool = [];
    for (var j = 0; j < S.npcs.length; j++) {
      var n = S.npcs[j];
      if (n.dead || l.indexOf(n.id) >= 0) continue;
      pool.push(n);
    }
    pool.sort(function (a, b) { return GAME.combat.power(b) - GAME.combat.power(a); });
    var k = 0;
    while (l.length < CFG.LADDER_RUNGS && k < pool.length) {
      l.push(pool[k].id);
      GAME.feed.news('ladder', '{who} moves into the empty rung at the bottom of the Attack Ladder.', { who: pool[k].name });
      k++;
    }
  }

  function familyDrift(now) {
    for (var i = 0; i < S.fams.length; i++) {
      var f = S.fams[i];
      /* end a war */
      for (var w = f.wars.length - 1; w >= 0; w--) {
        if (chance(0.09)) {
          var o = famById(f.wars[w]);
          f.wars.splice(w, 1);
          if (o) { var oi = o.wars.indexOf(f.id); if (oi >= 0) o.wars.splice(oi, 1); }
          if (o) GAME.feed.news('war', 'The {family} and {other} have called a truce.', { family: f.name, other: o.name });
        }
      }
      /* start one */
      if (chance(0.035) && S.fams.length > 2) {
        var e = pick(S.fams);
        if (e && e.id !== f.id && f.wars.indexOf(e.id) < 0) {
          f.wars.push(e.id); e.wars.push(f.id);
          GAME.feed.newsFrom('familyWar', 'war', { family: f.name, other: e.name, who: (byId(f.leader) || {}).name || f.name });
        }
      }
      /* somebody walks */
      if (f.members.length > 3 && chance(0.12)) {
        var mid = pick(f.members);
        var m = byId(mid);
        if (m && m.id !== f.leader && chance(1 - m.p.loyalty)) {
          f.members.splice(f.members.indexOf(mid), 1);
          m.fam = null;
          GAME.feed.newsFrom('familyLeave', 'fam', { who: m.name, family: f.name, city: m.city });
        }
      }
      /* and somebody signs up */
      if (chance(0.2) && f.members.length < 34) {
        var free = [];
        for (var q = 0; q < S.npcs.length; q++) if (!S.npcs[q].fam && !S.npcs[q].dead) free.push(S.npcs[q]);
        if (free.length) {
          var nn = pick(free);
          if (chance(nn.p.loyalty)) {
            f.members.push(nn.id); nn.fam = f.id; nn.famRole = 'soldier';
            if (chance(0.35)) GAME.feed.newsFrom('familyJoin', 'fam', { who: nn.name, family: f.name, city: nn.city });
          }
        }
      }
      GAME.state.recalcFamily(f, S.npcs);
    }

    /* an unaffiliated big fish sometimes founds a new crew */
    if (chance(0.05) && S.fams.length < 26) {
      var founders = S.npcs.filter(function (n) { return !n.fam && !n.dead && n.level > 18 && n.p.ego > 0.6; });
      if (founders.length) {
        var fo = pick(founders);
        var nf = {
          id: Math.max.apply(null, S.fams.map(function (x) { return x.id; })) + 1,
          name: pick(DATA.names.familyNames) + (chance(0.2) ? ' II' : ''),
          tag: pick(DATA.names.familyTags),
          leader: fo.id, founded: now, members: [fo.id], respect: 0,
          money: rint(1000, 200000), wars: [], motd: 'Recruiting.', open: true, playerMember: false
        };
        fo.fam = nf.id; fo.famRole = 'boss';
        S.fams.push(nf);
        GAME.feed.newsFrom('familyForm', 'fam', { who: fo.name, family: nf.name, city: fo.city });
      }
    }
  }

  /* ---- ambient colour --------------------------------------------- */
  function flavor(now) {
    if (chance(0.05)) GAME.feed.newsFrom('flavor', 'flavor', { city: pick(DATA.names.cities).name });
  }

  /* ---- a single live second ---------------------------------------- */
  function tick() {
    var now = NOW();
    var p = S.player;

    GAME.player.regen(now);
    if (now - lastEconomy > 30000) { GAME.player.economy(now); GAME.ladder.payout(now); lastEconomy = now; }
    if (now - lastPresence > 9000) updatePresence(now, false);

    var on = onlineList();
    for (var i = 0; i < on.length; i++) {
      var n = on[i];
      /* an engaged player takes an action every 15-40 seconds */
      if (chance(0.028 + n.p.activity * 0.045)) GAME.npc.act(n, now);
    }

    GAME.mail.tick(now);
    GAME.forumSim.tick(now);
    /* the ladder fights over itself in real time too */
    GAME.ladder.npcChallengeTick(CFG.UI_TICK / HOUR);
    if (chance(0.12)) GAME.market.tick(now);
    if (chance(0.05)) GAME.points.tickMarket(now);
    if (chance(0.10)) GAME.auction.tick(now);
    if (chance(0.02)) GAME.contracts.tick(now);
    GAME.oc.npcTick(CFG.UI_TICK / HOUR);
    flavor(now);
    churn(now);

    /* an NPC occasionally writes to the player out of the blue */
    if (chance(0.0016) && on.length) {
      var w = pick(on);
      if (w) {
        var bank = w.grudge > 40 ? 'threat'
          : (w.op > 35 ? 'friendly'
            : (!p.fam && w.fam && chance(0.5) ? 'familyInvite'
              : pick(['friendly', 'tradeOffer', 'scam', 'newbieHelp', 'spam', 'respect'])));
        GAME.mail.fromNpc(w, bank);
      }
    }
    /* somebody puts money on your head */
    if (chance(0.0006)) {
      var angry = S.npcs.filter(function (x) { return !x.dead && x.grudge > 55 && x.money > 20000; });
      if (angry.length) {
        var a = pick(angry);
        GAME.hitlist.npcPlace(a, 0, Math.round(a.money * rflt(0.05, 0.3)));
      }
    }
    S.lastSeen = now;
  }

  /* ---- offline catch-up --------------------------------------------
     The world is stepped forward in five minute slices. Presence and the
     visible, discrete events - ladder challenges, somebody coming after
     you, market trades, forum posts - are played out for real, but the
     grind underneath is credited in bulk once an hour per account. That
     keeps two weeks of two hundred people playing down to a fraction of
     a second while still landing everybody where they should be.
  --------------------------------------------------------------------- */
  function catchUp(now) {
    var from = S.lastSeen || now;
    var elapsed = now - from;
    if (elapsed < 45 * 1000) { S.lastSeen = now; lastPresence = now; return null; }
    var capped = Math.min(elapsed, CFG.OFFLINE_MAX);
    var start = now - capped;

    var before = {
      rung: GAME.ladder.rungOf(0),
      money: S.player.money + S.player.bank,
      mail: (S.mail || []).length,
      w: S.player.st.w, l: S.player.st.l
    };
    S.pendingAttackedBy = [];

    var step = CFG.OFFLINE_STEP_MS;
    var steps = Math.min(Math.floor(capped / step), 4200);
    if (steps < 1) steps = 1;
    step = capped / steps;
    var stepMin = step / MIN;
    var lastFlush = start;
    var i, k, m, a;

    for (i = 0; i < steps; i++) {
      var t = start + i * step;
      setClock(t);
      updatePresence(t, true);
      var on = onlineList();

      /* bank the minutes everybody spent logged in */
      for (k = 0; k < on.length; k++) on[k]._acc = (on[k]._acc || 0) + stepMin;

      /* once a simulated hour, turn those minutes into progress */
      if (t - lastFlush >= HOUR) {
        lastFlush = t;
        for (m = 0; m < S.npcs.length; m++) {
          var nn = S.npcs[m];
          if (!nn._acc) continue;
          GAME.npc.bulkProgress(nn, nn._acc);
          nn._acc = 0;
        }
      }

      /* a handful of fully played-out events per slice */
      var real = Math.min(5, Math.round(on.length * 0.06));
      for (a = 0; a < real; a++) {
        var who = on[Math.floor(rnd() * on.length)];
        if (who) GAME.npc.act(who, t);
      }

      GAME.ladder.npcChallengeTick(stepMin / 60);
      if (chance(0.4)) GAME.market.tick(t);
      if (chance(0.2)) GAME.points.tickMarket(t);
      if (chance(0.5)) GAME.auction.tick(t);
      if (chance(0.4)) GAME.contracts.tick(t);
      GAME.oc.npcTick(stepMin / 60);
      if (chance(0.5)) GAME.forumSim.tick(t);
      GAME.mail.tick(t);
      if (chance(0.35)) flavor(t);

      /* somebody writes to you while you are out */
      if (chance(0.0035) && on.length) {
        var w = on[Math.floor(rnd() * on.length)];
        if (w) {
          var bank = w.grudge > 40 ? 'threat'
            : (w.op > 35 ? 'friendly'
              : (!S.player.fam && w.fam && chance(0.4) ? 'familyInvite'
                : pick(['friendly', 'tradeOffer', 'scam', 'newbieHelp', 'spam', 'respect'])));
          GAME.mail.fromNpc(w, bank);
        }
      }
      if (chance(0.004)) {
        var angry = [];
        for (var g = 0; g < S.npcs.length; g++) {
          var x = S.npcs[g];
          if (!x.dead && x.grudge > 50 && x.money > 20000) angry.push(x);
        }
        if (angry.length) {
          var ag = pick(angry);
          GAME.hitlist.npcPlace(ag, chance(0.4) ? 0 : pick(S.npcs).id, Math.round(ag.money * rflt(0.05, 0.3)));
        }
      }
      churn(t);
    }

    /* flush whatever is left over */
    for (var z = 0; z < S.npcs.length; z++) {
      if (S.npcs[z]._acc) { GAME.npc.bulkProgress(S.npcs[z], S.npcs[z]._acc); S.npcs[z]._acc = 0; }
    }
    realClock();

    GAME.player.regen(now);
    GAME.player.economy(now);
    GAME.ladder.payout(now);
    GAME.ladder.sync();
    S.lastSeen = now;
    lastPresence = now;

    var after = {
      rung: GAME.ladder.rungOf(0),
      money: S.player.money + S.player.bank,
      mail: (S.mail || []).length
    };
    return {
      away: elapsed,
      capped: capped < elapsed,
      rungFrom: before.rung, rungTo: after.rung,
      moneyDelta: after.money - before.money,
      newMail: after.mail - before.mail,
      attacks: (S.pendingAttackedBy || []).slice(),
      losses: S.player.st.l - before.l,
      wins: S.player.st.w - before.w
    };
  }

  /* ---- backfill so a fresh world does not look brand new ---------- */
  function seedHistory(now) {
    var t = now - 6 * HOUR;
    setClock(t);
    updatePresence(t, true);
    for (var i = 0; i < 260; i++) {
      t += rint(40, 120) * 1000;
      setClock(t);
      if (chance(0.35)) updatePresence(t, true);
      var on = onlineList();
      if (!on.length) continue;
      var n = on[Math.floor(rnd() * on.length)];
      if (chance(0.55)) GAME.npc.act(n, t);
      else GAME.npc.chatEvent(n, null, t);
      GAME.ladder.npcChallengeTick(0.05);
      if (chance(0.08)) flavor(t);
    }
    realClock();
    S.lastSeen = now;
    /* the shoutbox should already be mid-conversation when you arrive */
    while ((S.chat || []).length < 30) {
      var m = pick(S.npcs);
      GAME.npc.chatEvent(m, null, now - rint(30, 3000) * 1000);
      if ((S.chat || []).length > 200) break;
    }
    S.chat.sort(function (a, b) { return a.t - b.t; });
  }

  function start() {
    stop();
    lastPresence = NOW();
    lastEconomy = NOW();
    timer = setInterval(function () {
      try { tick(); GAME.ui.liveRefresh(); }
      catch (e) { if (window.console) console.error('tick', e); }
    }, CFG.UI_TICK);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  return {
    start: start, stop: stop, tick: tick, catchUp: catchUp, seedHistory: seedHistory,
    onlineList: onlineList, onlineCount: onlineCount, updatePresence: updatePresence,
    churn: churn, backfillLadder: backfillLadder
  };
})();
