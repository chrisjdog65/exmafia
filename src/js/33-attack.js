/* ============================================================
   33-attack.js :: attacking, and THE ATTACK LADDER
   ------------------------------------------------------------
   Straight from the game's own help pages:

     "The Attack Ladder is where the best attackers are, and you
      get on it by beating one of them."
     "There is a benefit to being on the attack ladder of 10
      points every hour of every day."
     "If you are on the attack ladder, or if you are the
      Godfather, a bodyguard will not block any attacks till you
      are off the ladder."

   So the ladder is not a ranking of everybody. It is a short,
   fixed roster of the best fighters in the city. Rung 1 is The
   Godfather. You get on it by beating somebody who is already on
   it, and you take their rung when you do. Everybody below them
   slides down, and whoever was on the bottom rung falls off.

   Holding a rung pays 10 points an hour forever, and costs you
   the right to hide behind a bodyguard. That trade - passive
   income for permanent exposure - is the whole game.

   There are two different things you can do to a person, and
   keeping them apart is the whole design:

     A PLAIN ATTACK, launched from Online Now, the player list, a
     profile or the hitlist, is money, XP, respect and a hospital
     bed for them. It never moves a rung, even against somebody
     who is on the ladder. Without that rule a level four account
     farms the Godfather.

     A CHALLENGE, launched only from the Attack Ladder page, is
     the only thing that moves rungs. From off the ladder you may
     only challenge the bottom three. Once you are on it your
     reach is five rungs upward.
   ============================================================ */

var REVENGE_WINDOW = 6 * HOUR;
var TARGET_COOLDOWN = 25 * MIN;
var BODYGUARD_MS = 2 * HOUR;
var BODYGUARD_PTS = 25;

GAME.ladder = (function () {

  function roster() { return S.ladder || (S.ladder = []); }
  function size() { return roster().length; }
  function idAt(rung) { return roster()[rung - 1]; }
  function rungOf(id) {
    var i = roster().indexOf(id);
    return i < 0 ? 0 : i + 1;      // 0 means "not on the ladder"
  }
  function onLadder(id) { return rungOf(id) > 0; }
  function godfatherId() { return roster()[0]; }
  function isGodfather(id) { return roster()[0] === id; }

  function sync() {
    for (var i = 0; i < S.npcs.length; i++) S.npcs[i].rung = 0;
    S.player.rung = 0;
    for (var r = 0; r < roster().length; r++) {
      var e = byId(roster()[r]);
      if (!e) continue;
      e.rung = r + 1;
      if (!e.bestRung || r + 1 < e.bestRung) e.bestRung = r + 1;
    }
  }

  /* The winner takes the loser's rung. If the winner was already on the
     ladder but lower down, they swap upward; if they were off it, the
     bottom rung falls off to make room. */
  function claim(winnerId, loserRung) {
    var l = roster();
    var wi = l.indexOf(winnerId);
    if (wi >= 0) {
      if (wi <= loserRung - 1) return null;         // already higher, nothing to take
      l.splice(wi, 1);
      l.splice(loserRung - 1, 0, winnerId);
      sync();
      var w1 = byId(winnerId); if (w1) w1.rungSince = NOW();
      return { climbed: true, rung: loserRung, dropped: null };
    }
    l.splice(loserRung - 1, 0, winnerId);
    var dropped = null;
    while (l.length > CFG.LADDER_RUNGS) dropped = l.pop();
    sync();
    var w2 = byId(winnerId); if (w2) w2.rungSince = NOW();
    return { climbed: true, rung: loserRung, dropped: dropped, joined: true };
  }

  function build(npcs, player) {
    var all = npcs.map(function (n) { return { id: n.id, s: GAME.combat.power(n) * rflt(0.85, 1.2) }; });
    all.sort(function (a, b) { return b.s - a.s; });
    return all.slice(0, CFG.LADDER_RUNGS).map(function (x) { return x.id; });
  }

  /* When did this rung holder last give or take a fight? A rung held by
     somebody dormant stops being protected by reach. */
  function lastFight(e) { return Math.max(e.lastFightAt || 0, e.lastOnline || 0); }
  function idle(e) { return (NOW() - lastFight(e)) > CFG.LADDER_IDLE_H * HOUR; }
  function touch(e) { if (e) e.lastFightAt = NOW(); }

  /* ---- bodyguards ------------------------------------------------- */
  function guarded(e) {
    if (!e) return false;
    if (onLadder(e.id)) return false;      // the ladder voids the bodyguard
    return (e.bgUntil || 0) > NOW();
  }
  function hireBodyguard() {
    var p = S.player, cost = BODYGUARD_PTS;
    if (onLadder(0)) return { err: 'You are on the Attack Ladder. No bodyguard will cover you until you are off it.' };
    if ((p.points || 0) < cost) return { err: 'A bodyguard costs ' + cost + ' points.' };
    p.points -= cost;
    p.bgUntil = Math.max(p.bgUntil || 0, NOW()) + BODYGUARD_MS;
    GAME.feed.log('guard', 'You put a bodyguard on the door for two hours. Nobody in, nobody out.');
    return { ok: true, until: p.bgUntil };
  }

  /* ---- cooldown & revenge ----------------------------------------- */
  function cdKey(a, b) { return Math.min(a, b) + ':' + Math.max(a, b); }
  function cooldownLeft(aId, bId) {
    if (!S.cd) S.cd = {};
    return Math.max(0, (S.cd[cdKey(aId, bId)] || 0) - NOW());
  }
  function setCooldown(aId, bId) {
    if (!S.cd) S.cd = {};
    S.cd[cdKey(aId, bId)] = NOW() + TARGET_COOLDOWN;
    var keys = Object.keys(S.cd);
    if (keys.length > 700) {
      var now = NOW();
      for (var i = 0; i < keys.length; i++) if (S.cd[keys[i]] < now) delete S.cd[keys[i]];
    }
  }
  function hasRevenge(id) {
    return S.revenge && (NOW() - (S.revenge[id] || 0) < REVENGE_WINDOW);
  }
  function markRevenge(id) { (S.revenge = S.revenge || {})[id] = NOW(); }

  function busy(e) {
    var now = NOW();
    if (!e) return 'gone';
    if (e.dead) return 'inactive';
    if (e.hospUntil > now) return 'hospital';
    if (e.jailUntil > now) return 'jail';
    if ((e.travelUntil || 0) > now) return 'abroad';
    return null;
  }

  /* Nobody may lay a finger on an account under level 5, or one less than
     two days old, whichever protection lasts longer. Newbies may still
     attack - the shield only points one way. */
  function isNewbie(e) {
    return (e.level || 1) < CFG.NEWBIE_LEVEL || (NOW() - (e.joined || 0)) < CFG.NEWBIE_HOURS * HOUR;
  }

  function canAttack(targetId) {
    var p = S.player, t = byId(targetId);
    if (!t || t.id === 0) return { ok: false, why: 'Pick somebody else.' };
    if ((p.bgUntil || 0) > NOW() && !onLadder(0)) return { ok: false, why: 'Your own bodyguard will not let you start anything. Send him home first.' };
    var st = busy(p);
    if (st === 'hospital') return { ok: false, why: 'You are in a hospital bed.' };
    if (st === 'jail') return { ok: false, why: 'You are behind bars.' };
    if (st === 'abroad') return { ok: false, why: 'You are still in the air.' };
    if (p.attacks < 1) return { ok: false, why: 'No attacks remaining. They come back on their own, or buy more with points.' };
    if (p.energy < CFG.ATTACK_ENERGY) return { ok: false, why: 'Attacking takes ' + CFG.ATTACK_ENERGY + ' Energy.' };
    if (p.health < Math.max(10, maxHealth(p) * 0.10)) return { ok: false, why: 'You are in no shape for this. Heal up.' };
    var ts = busy(t);
    if (ts === 'hospital') return { ok: false, why: t.name + ' is already in a hospital bed.' };
    if (ts === 'jail') return { ok: false, why: t.name + ' is in jail.' };
    if (ts === 'inactive') return { ok: false, why: t.name + ' has not logged in for months.' };
    if (ts === 'abroad') return { ok: false, why: t.name + ' is out of the country.' };
    if (isNewbie(t)) return { ok: false, why: t.name + ' is under newbie protection.' };
    if (p.fam && t.fam === p.fam) return { ok: false, why: 'That is your own family.' };
    if (guarded(t)) return { ok: false, why: t.name + ' has a bodyguard on the door.' };
    var cd = cooldownLeft(0, targetId);
    if (cd > 0) return { ok: false, why: 'You just went at it with ' + t.name + '. Wait ' + clock(cd) + '.' };
    return {
      ok: true,
      ladder: onLadder(targetId),
      rung: rungOf(targetId),
      gf: isGodfather(targetId),
      revenge: hasRevenge(targetId)
    };
  }

  /* ---- the Challenge: the only thing that moves a rung -------------- */
  function challengeLockLeft(targetId) {
    if (!S.chLock) S.chLock = {};
    return Math.max(0, (S.chLock[targetId] || 0) - NOW());
  }
  function reentryLeft() { return Math.max(0, (S.player.ladderLock || 0) - NOW()); }

  function canChallenge(targetId) {
    var p = S.player, t = byId(targetId);
    if (!t) return { ok: false, why: 'Nobody there.' };
    var theirs = rungOf(targetId);
    if (!theirs) return { ok: false, why: 'They are not on the ladder.' };
    var mine = rungOf(0);
    if (mine && theirs > mine) return { ok: false, why: 'You already sit above them.' };

    var st = busy(p);
    if (st === 'hospital') return { ok: false, why: 'You are in a hospital bed.' };
    if (st === 'jail') return { ok: false, why: 'You are behind bars.' };
    if (st === 'abroad') return { ok: false, why: 'You are still in the air.' };
    if (p.attacks < 1) return { ok: false, why: 'A challenge costs one attack and you have none.' };
    if (p.energy < CFG.CHALLENGE_ENERGY) return { ok: false, why: 'A challenge takes ' + CFG.CHALLENGE_ENERGY + ' Energy.' };
    if (p.health < maxHealth(p) * CFG.CHALLENGE_MIN_HP) {
      return { ok: false, why: 'You have to be at half health to challenge. You are at ' + Math.round(p.health / maxHealth(p) * 100) + '%.' };
    }
    var re = reentryLeft();
    if (re > 0) return { ok: false, why: 'You were knocked off. You may challenge again in ' + clock(re) + '.' };
    var lk = challengeLockLeft(targetId);
    if (lk > 0) return { ok: false, why: 'They saw you off. You may challenge them again in ' + clock(lk) + '.' };

    var ts = busy(t);
    if (ts === 'hospital') return { ok: false, why: t.name + ' is in a hospital bed and keeps the rung until they are out.' };
    if (ts === 'jail') return { ok: false, why: t.name + ' is in jail.' };
    if (ts === 'abroad') return { ok: false, why: t.name + ' is out of the country.' };

    /* a rung held by somebody dormant is open to anybody */
    if (idle(t)) return { ok: true, rung: theirs, idle: true };

    if (!mine) {
      var door = CFG.LADDER_RUNGS - CFG.LADDER_ENTRY + 1;
      if (theirs < door) {
        return { ok: false, why: 'From off the ladder you can only challenge the bottom ' + CFG.LADDER_ENTRY +
          ' rungs (' + door + '-' + CFG.LADDER_RUNGS + '). Get on first.' };
      }
      return { ok: true, rung: theirs, entry: true };
    }
    if (mine - theirs > CFG.LADDER_REACH) {
      return { ok: false, why: 'Your reach is ' + CFG.LADDER_REACH + ' rungs. Rung ' + theirs + ' is ' + (mine - theirs) + ' above you.' };
    }
    return { ok: true, rung: theirs };
  }

  function challenge(targetId) {
    var chk = canChallenge(targetId);
    if (!chk.ok) return { err: chk.why };
    var p = S.player, t = byId(targetId);
    var wasGf = chk.rung === 1;
    var before = rungOf(0);

    p.attacks -= 1;
    p.energy = Math.max(0, p.energy - CFG.CHALLENGE_ENERGY);
    setCooldown(0, targetId);
    touch(p); touch(t);
    p.seen[targetId] = NOW();

    var res = GAME.combat.fight(p, t);
    p.health = Math.max(0, res.hpA);
    t.health = Math.max(0, res.hpD);

    var out = { fight: res, target: t, challenge: true, theirRung: chk.rung, gf: wasGf, climbed: null, respect: 0, xp: 0, bounty: 0, pending: false };

    if (res.win) {
      p.st.w++; t.l++; t.streak = 0;
      var diff = clamp(GAME.combat.power(t) / Math.max(1, GAME.combat.power(p)), 0.25, 4);
      out.respect = Math.max(1, Math.round(6 * diff * 3));
      out.xp = Math.max(2, Math.round((t.level || 1) * 3.4 * diff * 2.2));
      p.respect += out.respect;
      GAME.progress.gainXP(out.xp);
      out.climbed = claim(0, chk.rung);
      if (out.climbed) {
        p.st.killsOnLadder++;
        if (p.bestRung === undefined || out.climbed.rung < (p.bestLadderRung || 999)) p.bestLadderRung = out.climbed.rung;
        if (wasGf) {
          GAME.feed.news('ladder', '{who} has taken the Godfather spot from {other}. The city has a new boss.', { who: p.name, other: t.name });
          GAME.mail.system('godfather', {});
        } else if (!before) {
          GAME.feed.news('ladder', '{who} beat {other} and is on the Attack Ladder at rung {n}.', { who: p.name, other: t.name, n: out.climbed.rung });
          GAME.mail.system('ladderJoin', { n: out.climbed.rung });
        } else {
          GAME.feed.newsFrom('ladderClimb', 'ladder', { who: p.name, other: t.name, n: out.climbed.rung, city: p.city });
        }
        if (out.climbed.dropped !== null && out.climbed.dropped !== undefined) {
          var dn = byId(out.climbed.dropped);
          if (dn) {
            dn.ladderLock = NOW() + CFG.REENTRY_LOCK;
            GAME.feed.news('ladder', '{who} has been knocked off the Attack Ladder.', { who: dn.name });
            GAME.npc.remember(dn, 'knocked_off_ladder', {});
          }
        }
      }
      out.bounty = GAME.hitlist.collect(targetId, 0);
      GAME.npc.remember(t, 'beaten_by_player', { dmg: res.dmgDealt });
      out.pending = true;
      S.pendingFinish = { id: targetId, at: NOW(), dmg: res.dmgDealt, onLadder: true, xp: out.xp };
    } else {
      p.st.l++; t.w++; t.streak++;
      t.respect += 2;
      if (!S.chLock) S.chLock = {};
      S.chLock[targetId] = NOW() + CFG.CHALLENGE_LOCK;
      GAME.player.hospitalize(hospTime(res.dmgTaken * 0.8, p), t.name + ' held the rung against you.');
      GAME.feed.news('ladder', '{who} defended rung {n} against {other}.', { who: t.name, n: chk.rung, other: p.name });
      GAME.npc.remember(t, 'beat_player', {});
      GAME.feed.log('lose', 'You challenged ' + t.name + ' for rung ' + chk.rung + ' and lost.');
    }
    GAME.npc.recompute(t);
    return out;
  }

  function attack(targetId) {
    var chk = canAttack(targetId);
    if (!chk.ok) return { err: chk.why };
    var p = S.player, t = byId(targetId);

    p.attacks -= 1;
    p.energy = Math.max(0, p.energy - CFG.ATTACK_ENERGY);
    setCooldown(0, targetId);
    touch(p); touch(t);
    p.seen[targetId] = NOW();

    var res = GAME.combat.fight(p, t);
    p.health = Math.max(0, res.hpA);
    t.health = Math.max(0, res.hpD);

    var out = {
      fight: res, target: t, wasOnLadder: chk.ladder, theirRung: chk.rung, gf: chk.gf,
      climbed: null, respect: 0, xp: 0, bounty: 0, pending: false
    };

    if (res.win) {
      p.st.w++; t.l++; t.streak = 0;
      var diff = clamp(GAME.combat.power(t) / Math.max(1, GAME.combat.power(p)), 0.25, 4);
      out.respect = Math.max(1, Math.round(6 * diff * (chk.ladder ? 3 : 1)));
      out.xp = Math.max(2, Math.round((t.level || 1) * 3.4 * diff * (chk.ladder ? 2.2 : 1)));
      p.respect += out.respect;
      /* the XP is handed over by the finisher, which decides how much of it you keep */
      out.bounty = GAME.hitlist.collect(targetId, 0);
      GAME.npc.remember(t, 'beaten_by_player', { dmg: res.dmgDealt });
      out.pending = true;
      S.pendingFinish = { id: targetId, at: NOW(), dmg: res.dmgDealt, onLadder: chk.ladder, xp: out.xp };
      if (!chk.ladder) GAME.feed.newsFrom('attackWin', 'atk', { attacker: p.name, defender: t.name, city: t.city, n: res.dmgDealt });
    } else {
      p.st.l++; t.w++; t.streak++;
      GAME.player.hospitalize(hospTime(res.dmgTaken * 0.8, p), 'You went after ' + t.name + ' and came off worse.');
      GAME.feed.newsFrom('attackLoss', 'atk', { attacker: p.name, defender: t.name, city: t.city });
      GAME.npc.remember(t, 'beat_player', {});
      GAME.feed.log('lose', 'You attacked ' + t.name + ' and lost.');
    }

    GAME.npc.recompute(t);
    return out;
  }

  /* ---- the three things you can do to somebody on the floor --------
     exMafia documents two, mug and hospitalise; the parent engine has a
     third. All three ship, because the third is what makes the choice
     interesting - walking away is the experience play.
  -------------------------------------------------------------------- */
  var FINISHERS = {
    leave: { xp: 1.00, respect: 1, hosp: 0.35, label: 'Leave them' },
    mug:   { xp: 0.30, respect: 2, hosp: 0.60, label: 'Mug them' },
    hosp:  { xp: 0.50, respect: 3, hosp: 1.90, label: 'Hospitalise them' }
  };

  function finish(kind) {
    var pf = S.pendingFinish;
    if (!pf) return { err: 'Nothing to finish.' };
    var f = FINISHERS[kind] || FINISHERS.leave;
    var t = byId(pf.id), p = S.player;
    S.pendingFinish = null;
    if (!t) return { err: 'They are already gone.' };

    var out = { kind: kind, name: t.name, took: 0, hosp: 0, str: 0, def: 0, xp: 0, respect: f.respect };
    out.xp = Math.max(1, Math.round((pf.xp || 0) * f.xp));
    GAME.progress.gainXP(out.xp);
    p.respect += f.respect;
    out.hosp = hospTime(pf.dmg * f.hosp, t);
    t.hospUntil = NOW() + out.hosp;

    if (kind === 'mug') {
      /* only what they are carrying - the bank is exactly why the bank exists */
      var take = Math.round((t.money || 0) * clamp(CFG.MUG_FRACTION * rflt(0.70, 1.45), 0.05, 0.55));
      take = Math.max(0, Math.min(take, t.money || 0));
      t.money -= take;
      p.money += take;
      p.st.mugged += take; p.st.earned += take;
      if (take > (p.st.bestMug || 0)) p.st.bestMug = take;
      out.took = take;
      t.hospWhy = 'Mugged by ' + p.name;
      t.health = Math.max(1, Math.round(maxHealth(t) * 0.12));
      GAME.feed.newsFrom('mug', 'atk', { attacker: p.name, defender: t.name, amount: money(take), city: t.city });
      GAME.feed.log('win', 'You mugged ' + money(take) + ' off ' + t.name + '. (+' + out.xp + ' xp)');
      GAME.npc.remember(t, 'mugged_by_player', { amount: take });
      if (chance(CFG.DROP_CHANCE)) {
        var drops = GAME.items.all().filter(function (i) { return i.cat === 'drop'; });
        if (drops.length) { var d = pick(drops); GAME.items.add(d.id, 1); out.drop = d; }
      }
    } else if (kind === 'hosp') {
      /* "when you hospitalize them rather than mug them, your Strength
         and Guard will increase" - exMafia's own words */
      t.hospWhy = 'Hospitalised by ' + p.name;
      t.health = 1;
      out.str = 0.6; out.def = 0.6;
      p.str = Math.round((p.str + out.str) * 100) / 100;
      p.def = Math.round((p.def + out.def) * 100) / 100;
      GAME.feed.newsFrom('hospital', 'atk', { attacker: p.name, defender: t.name, city: t.city, n: Math.round(out.hosp / MIN) });
      GAME.feed.log('win', 'You put ' + t.name + ' in a bed for ' + Math.round(out.hosp / MIN) +
        ' minutes. +0.6 Strength, +0.6 Guard, +' + out.xp + ' xp.');
      GAME.npc.remember(t, 'hospitalised_by_player', {});
    } else {
      t.hospWhy = 'Left in the street by ' + p.name;
      t.health = Math.max(1, Math.round(maxHealth(t) * 0.12));
      GAME.feed.log('win', 'You left ' + t.name + ' where they fell and walked. +' + out.xp + ' xp.');
      GAME.npc.remember(t, 'spared_by_player', {});
    }
    GAME.npc.recompute(t);
    return out;
  }

  function hospTime(dmg, victim) {
    var frac = clamp(dmg / Math.max(1, maxHealth(victim)), 0.05, 1.6);
    var ms = CFG.HOSP_MIN + frac * (CFG.HOSP_MAX - CFG.HOSP_MIN) * rflt(0.65, 1.25);
    /* A new account that gets flattened should not lose an hour to it.
       The ceiling opens up as you become somebody worth putting away. */
    var lvl = victim.level || 1;
    var ceiling = clamp(CFG.HOSP_MIN + (CFG.HOSP_MAX - CFG.HOSP_MIN) * (0.14 + Math.min(1, lvl / 34) * 0.86),
      CFG.HOSP_MIN, CFG.HOSP_MAX * 1.4);
    return Math.round(clamp(ms, CFG.HOSP_MIN, ceiling));
  }

  /* ---- an NPC attacks somebody ------------------------------------ */
  function npcAttack(att, defId) {
    var def = byId(defId);
    if (!def || att.id === defId) return null;
    if (busy(att) || busy(def)) return null;
    if (guarded(def)) return null;
    if (cooldownLeft(att.id, defId) > 0) return null;

    if (isNewbie(def)) return null;
    if (att.fam && def.fam === att.fam) return null;
    setCooldown(att.id, defId);
    touch(att); touch(def);
    att.energy = Math.max(0, att.energy - CFG.ATTACK_ENERGY);

    var res = GAME.combat.fight(att, def);
    att.health = Math.max(0, res.hpA);
    def.health = Math.max(0, res.hpD);

    if (res.win) {
      att.w++; def.l++; att.streak = (att.streak || 0) + 1;
      att.respect += Math.max(1, Math.round(5 * Math.max(0.2, GAME.combat.power(def) / Math.max(1, GAME.combat.power(att)))));
      GAME.npc.gainXP(att, Math.max(2, Math.round((def.level || 1) * 3.2)));

      if (chance(0.55)) {
        GAME.feed.newsFrom('attackWin', 'atk', { attacker: att.name, defender: def.name, city: def.city, n: res.dmgDealt });
      }

      /* mug or hospitalise, in character */
      var mugP = 0.3 + att.p.greed * 0.6 - att.p.honesty * 0.15;
      var hospP = 0.2 + att.p.aggro * 0.5 + att.p.vindictive * 0.35;
      var pickMug = rnd() * (mugP + hospP) < mugP;
      if (defId === 0) onPlayerBeaten(att, res, pickMug);
      else {
        if (pickMug) {
          var take = Math.round((def.money || 0) * clamp(CFG.MUG_FRACTION * rflt(0.6, 1.5), 0.05, 0.5));
          def.money -= take; att.money += take;
          def.hospUntil = NOW() + hospTime(res.dmgDealt * 0.6, def);
          if (take > 200000 && chance(0.4)) GAME.feed.newsFrom('mug', 'atk', { attacker: att.name, defender: def.name, amount: money(take), city: def.city });
        } else {
          def.hospUntil = NOW() + hospTime(res.dmgDealt * 1.7, def);
          def.hospWhy = 'Hospitalised by ' + att.name;
          def.health = 1;
          att.str = Math.round((att.str + 0.6 + rnd()) * 100) / 100;
          att.def = Math.round((att.def + 0.5 + rnd() * 0.8) * 100) / 100;
        }
        GAME.hitlist.collect(defId, att.id);
        GAME.npc.rivalry(def, att.id, 12);
      }
    } else {
      att.l++; def.w++; att.streak = 0;
      att.hospUntil = NOW() + hospTime(res.dmgTaken, att);
      att.hospWhy = 'Picked the wrong fight with ' + def.name;
      if (defId === 0) {
        S.player.st.w++;
        S.player.health = Math.max(0, res.hpD);
        S.player.respect += 2;
        GAME.feed.log('defend', 'You fought off an attack from ' + att.name + '.');
        S.pendingAttackedBy = S.pendingAttackedBy || [];
        S.pendingAttackedBy.push({ id: att.id, name: att.name, t: NOW(), won: false, line: 'You beat off an attack from ' + att.name + '.', log: res.log });
        if (chance(0.4)) GAME.mail.fromNpc(att, 'apology');
        GAME.npc.remember(att, 'lost_to_player', {});
      } else {
        GAME.npc.rivalry(att, defId, 8);
      }
    }
    GAME.npc.recompute(att);
    if (defId !== 0) GAME.npc.recompute(def);
    return res;
  }

  function onPlayerBeaten(att, res, pickMug) {
    var p = S.player;
    p.st.l++;
    markRevenge(att.id);
    var line;
    if (pickMug) {
      var take = Math.round(p.money * clamp(CFG.MUG_FRACTION * rflt(0.6, 1.5), 0.05, 0.5));
      p.money -= take; att.money += take; p.st.muggedBy += take;
      GAME.player.hospitalize(hospTime(res.dmgDealt * 0.6, p), att.name + ' rolled you for ' + money(take) + '.');
      line = att.name + ' beat you down and took ' + money(take) + ' off you.';
      GAME.feed.newsFrom('mug', 'atk', { attacker: att.name, defender: p.name, amount: money(take), city: p.city });
      GAME.mail.system('mugged', { who: att.name, amount: money(take) });
    } else {
      GAME.player.hospitalize(hospTime(res.dmgDealt * 1.8, p), att.name + ' put you in the hospital.');
      line = att.name + ' put you in a hospital bed.';
      att.str = Math.round((att.str + 0.6 + rnd()) * 100) / 100;
      att.def = Math.round((att.def + 0.5 + rnd() * 0.8) * 100) / 100;
      GAME.feed.newsFrom('hospital', 'atk', { attacker: att.name, defender: p.name, city: p.city });
      GAME.mail.system('hospitalised', { who: att.name });
    }
    GAME.feed.log('attacked', line);
    S.pendingAttackedBy = S.pendingAttackedBy || [];
    S.pendingAttackedBy.push({ id: att.id, name: att.name, t: NOW(), won: true, line: line, log: res.log });
    if (S.pendingAttackedBy.length > 25) S.pendingAttackedBy.shift();
    GAME.hitlist.collect(0, att.id);
    if (chance(0.30 + att.p.ego * 0.4)) GAME.mail.fromNpc(att, 'threat');
  }

  /* ---- the ladder's hourly payout --------------------------------- */
  function payout(now) {
    var p = S.player;
    if (!p.regen.ladder) p.regen.ladder = now;
    var hours = Math.floor((now - p.regen.ladder) / HOUR);
    if (hours <= 0) return 0;
    p.regen.ladder += hours * HOUR;
    if (!onLadder(0)) return 0;
    var rate = isGodfather(0) ? CFG.GODFATHER_PTS_HOUR : CFG.LADDER_PTS_HOUR;
    var pts = hours * rate;
    p.points = (p.points || 0) + pts;
    GAME.feed.log('points', 'Attack Ladder payout: +' + pts + ' points.');
    return pts;
  }

  function rows() {
    var out = [];
    for (var r = 1; r <= roster().length; r++) {
      var e = byId(idAt(r));
      if (!e) continue;
      out.push({
        rung: r, e: e, isMe: e.id === 0, gf: r === 1,
        status: busy(e), guarded: guarded(e), idle: idle(e),
        held: Math.max(0, Math.round((NOW() - (e.rungSince || S.createdAt || NOW())) / DAY)),
        odds: e.id === 0 ? 1 : GAME.combat.odds(S.player, e),
        can: e.id === 0 ? null : canChallenge(e.id),
        canAtk: e.id === 0 ? null : canAttack(e.id)
      });
    }
    return out;
  }

  /* ---- the roster fights over itself around the clock ---------------
     Eighteen percent of game-hours somewhere on the ladder a challenge
     fires. Four or five a day: enough that the top twenty is a different
     list two months later, few enough that holding rung one for a
     fortnight means something.
  -------------------------------------------------------------------- */
  function npcChallengeTick(hours) {
    var fired = 0;
    for (var h = 0; h < Math.min(hours, 400); h++) {
      if (!chance(0.18)) continue;
      var l = roster();
      var challenger = null, targetRung = 0;
      if (chance(0.6)) {
        /* somebody already on it reaching upward */
        var picks = [];
        for (var r = 2; r <= l.length; r++) {
          var e = byId(l[r - 1]);
          if (!e || e.id === 0 || busy(e)) continue;
          var lo = Math.max(1, r - CFG.LADDER_REACH);
          for (var up = lo; up < r; up++) {
            var d = byId(l[up - 1]);
            if (!d || busy(d) || d.id === e.id) continue;
            var adv = GAME.combat.power(e) / Math.max(1, GAME.combat.power(d));
            if (adv > 0.85) picks.push([{ a: e, rung: up }, adv]);
          }
        }
        if (picks.length) { var w = pickW(picks); challenger = w.a; targetRung = w.rung; }
      }
      if (!challenger) {
        /* the strongest hungry account outside the twenty going for the door */
        var out2 = S.npcs.filter(function (n) {
          return !n.dead && !rungOf(n.id) && !busy(n) && (n.ladderLock || 0) < NOW();
        }).sort(function (a, b) { return GAME.combat.power(b) - GAME.combat.power(a); }).slice(0, 40);
        if (out2.length) {
          challenger = pickW(out2.map(function (n) { return [n, 1 + n.p.aggro * 2 + n.p.ego]; }));
          targetRung = rint(Math.max(1, CFG.LADDER_RUNGS - CFG.LADDER_ENTRY + 1), l.length);
        }
      }
      if (!challenger || !targetRung) continue;
      var def = byId(l[targetRung - 1]);
      if (!def || def.id === challenger.id || busy(def)) continue;
      resolveNpcChallenge(challenger, def, targetRung);
      fired++;
    }
    return fired;
  }

  function resolveNpcChallenge(att, def, rung) {
    touch(att); touch(def);
    var res = GAME.combat.fight(att, def);
    att.health = Math.max(0, res.hpA);
    def.health = Math.max(0, res.hpD);
    if (res.win) {
      att.w++; def.l++;
      GAME.npc.gainXP(att, Math.max(4, Math.round((def.level || 1) * 5)));
      var wasGf = rung === 1;
      var c = claim(att.id, rung);
      if (c) {
        if (wasGf) GAME.feed.news('ladder', '{who} has taken the Godfather spot from {other}. The city has a new boss.', { who: att.name, other: def.name });
        else GAME.feed.newsFrom('ladderClimb', 'ladder', { who: att.name, other: def.name, n: c.rung, city: att.city });
        if (c.dropped === 0) {
          S.player.ladderLock = NOW() + CFG.REENTRY_LOCK;
          GAME.feed.log('ladder', 'You have been knocked off the Attack Ladder.');
          GAME.mail.system('ladderOff', { who: att.name });
        } else if (c.dropped !== null && c.dropped !== undefined) {
          var dn = byId(c.dropped);
          if (dn) { dn.ladderLock = NOW() + CFG.REENTRY_LOCK; GAME.feed.news('ladder', '{who} has been knocked off the Attack Ladder.', { who: dn.name }); }
        }
      }
      if (def.id === 0) onPlayerBeaten(att, res, chance(0.4));
      else {
        def.hospUntil = NOW() + hospTime(res.dmgDealt * 1.6, def);
        def.hospWhy = 'Lost the rung to ' + att.name;
        def.health = 1;
        GAME.npc.rivalry(def, att.id, 20);
      }
    } else {
      att.l++; def.w++; def.respect += 2;
      att.hospUntil = NOW() + hospTime(res.dmgTaken * 0.8, att);
      att.hospWhy = 'Bounced off rung ' + rung;
      if (chance(0.5)) GAME.feed.news('ladder', '{who} defended rung {n} against {other}.', { who: def.name, n: rung, other: att.name });
      if (def.id === 0) {
        S.player.st.w++;
        S.player.respect += 2;
        S.player.health = Math.max(0, res.hpD);
        GAME.feed.log('defend', 'You held rung ' + rung + ' against ' + att.name + '.');
      }
    }
    GAME.npc.recompute(att);
    if (def.id !== 0) GAME.npc.recompute(def);
  }

  return {
    roster: roster, size: size, idAt: idAt, rungOf: rungOf, onLadder: onLadder,
    isGodfather: isGodfather, godfatherId: godfatherId, sync: sync, claim: claim, build: build,
    canAttack: canAttack, attack: attack, finish: finish, npcAttack: npcAttack,
    canChallenge: canChallenge, challenge: challenge, npcChallengeTick: npcChallengeTick,
    rows: rows, busy: busy, guarded: guarded, hireBodyguard: hireBodyguard, isNewbie: isNewbie,
    hospTime: hospTime, cooldownLeft: cooldownLeft, hasRevenge: hasRevenge, markRevenge: markRevenge,
    challengeLockLeft: challengeLockLeft, reentryLeft: reentryLeft, idle: idle, touch: touch,
    payout: payout, FINISHERS: FINISHERS,
    RUNGS: CFG.LADDER_RUNGS, POINTS_PER_HOUR: CFG.LADDER_PTS_HOUR
  };
})();
