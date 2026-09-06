/* ============================================================
   46-contracts.js :: The Notice Board
   Work the other two hundred want doing and will not do
   themselves. Somebody wants a name put in a hospital bed.
   Somebody wants their brother-in-law bailed out. Somebody wants
   a piece they cannot be seen buying. Take it, do it, get paid -
   and they remember either way.
   ============================================================ */

GAME.contracts = (function () {

  var MAX_ACTIVE = 3;

  var FALLBACK_KINDS = [
    { id: 'hit', name: 'Put somebody down', reward: [0.9, 1.7], rep: 9 },
    { id: 'mug', name: 'Take money off somebody', reward: [0.7, 1.3], rep: 6 },
    { id: 'bail', name: 'Get somebody out', reward: [0.5, 1.0], rep: 12 },
    { id: 'fetch', name: 'Get hold of something', reward: [0.6, 1.2], rep: 7 },
    { id: 'crime', name: 'Show me you can work', reward: [0.5, 1.1], rep: 4 },
    { id: 'gym', name: 'Put the hours in', reward: [0.5, 1.0], rep: 4 },
    { id: 'protect', name: 'Keep somebody standing', reward: [0.8, 1.5], rep: 10 }
  ];

  function kinds() {
    var k = (DATA.contracts && DATA.contracts.kinds) || null;
    return (k && k.length) ? k : FALLBACK_KINDS;
  }
  function kind(id) {
    var k = kinds();
    for (var i = 0; i < k.length; i++) if (k[i].id === id) return k[i];
    return FALLBACK_KINDS[0];
  }
  function bankLine(map, id, fallback) {
    var b = DATA.contracts && DATA.contracts[map] && DATA.contracts[map][id];
    if (b && b.length) return pick(b);
    return fallback;
  }

  function board() { return S.board || (S.board = []); }
  function active() { return S.myContracts || (S.myContracts = []); }

  /* What a job of this size is worth to somebody at your level. */
  function baseRate() { return Math.max(4000, Math.round(1200 * Math.pow(S.player.level, 1.9))); }

  function describe(c) {
    switch (c.kind) {
      case 'hit': return 'Put ' + c.targetName + ' in a hospital bed.';
      case 'mug': return 'Take money off ' + c.targetName + '.';
      case 'bail': return 'Get ' + c.targetName + ' out of jail.';
      case 'fetch': return 'Get hold of a ' + c.itemName + ' and hand it over.';
      case 'crime': return 'Pull off ' + c.n + ' crimes.';
      case 'gym': return 'Put ' + fmt(c.n) + ' points on your ' + (GAME.oc.STATLABEL[c.stat] || c.stat) + '.';
      case 'protect': return 'Keep ' + c.targetName + ' out of hospital for ' + Math.round(c.ms / HOUR) + ' hours.';
    }
    return 'Do the thing.';
  }

  function make(now) {
    var poster = pick(S.npcs.filter(function (n) { return !n.dead; }));
    if (!poster) return null;
    var k = pick(kinds());
    var pool = S.npcs.filter(function (n) { return !n.dead && n.id !== poster.id; });
    var target = pick(pool);
    if (!target) return null;

    var c = {
      id: (S.nextConId = (S.nextConId || 1) + 1),
      kind: k.id, by: poster.id, byName: poster.name,
      posted: now, expires: now + rint(6, 60) * HOUR,
      rep: k.rep || 6
    };

    if (k.id === 'bail') {
      /* only worth posting if somebody is actually inside */
      var inside = S.npcs.filter(function (n) { return n.jailUntil > now && n.id !== poster.id; });
      target = pick(inside) || target;
      if (target.jailUntil <= now) { target.jailUntil = now + rint(300, 2400) * 1000; target.jailWhy = 'Nobody is saying.'; }
    }
    if (k.id === 'protect') c.ms = rint(2, 10) * HOUR;
    if (k.id === 'fetch') {
      var it = pick(GAME.items.all().filter(function (i) { return i.stock && i.lvl <= S.player.level + 6; }));
      if (!it) return null;
      c.itemId = it.id; c.itemName = it.name;
    }
    if (k.id === 'crime') c.n = rint(6, 30);
    if (k.id === 'gym') {
      c.stat = pick(['str', 'def', 'spd', 'dex']);
      c.n = Math.max(3, Math.round((S.player[c.stat] || 10) * rflt(0.04, 0.14)));
    }
    c.target = target.id;
    c.targetName = target.name;

    var band = k.reward || [0.6, 1.2];
    c.reward = Math.round(baseRate() * rflt(band[0], band[1]) * (0.7 + poster.p.generosity * 0.8));
    c.points = rint(2, 18);

    var vars = {
      target: c.targetName, other: pick(S.npcs).name, item: c.itemName || 'a piece',
      amount: money(c.reward), n: c.n || rint(2, 20), city: poster.city,
      family: (famById(poster.fam) || {}).name || 'my people', me: S.player.name
    };
    c.title = GAME.npc.style(poster, tpl(bankLine('titles', k.id, k.name), vars), true);
    if (c.title.length > 78) c.title = c.title.slice(0, 76) + '..';
    c.body = GAME.npc.style(poster, tpl(bankLine('bodies', k.id, describe(c) + '\nPays ' + money(c.reward) + '.'), vars));
    return c;
  }

  function accept(id) {
    var b = board(), p = S.player;
    if (active().length >= MAX_ACTIVE) return { err: 'You are carrying ' + MAX_ACTIVE + ' jobs already. Finish one.' };
    for (var i = 0; i < b.length; i++) {
      if (b[i].id !== id) continue;
      var c = b.splice(i, 1)[0];
      c.taken = NOW();
      /* snapshot whatever we have to measure against */
      c.snap = {
        crimes: p.st.crimes,
        stat: c.stat ? (p[c.stat] || 0) : 0,
        hosp: c.kind === 'protect' ? (byId(c.target) || {}).hospUntil || 0 : 0
      };
      if (c.kind === 'protect') c.until = NOW() + c.ms;
      active().push(c);
      var poster = byId(c.by);
      if (poster) {
        GAME.feed.log('board', 'You took ' + poster.name + "'s job: " + describe(c));
        if (chance(0.5)) GAME.feed.say(poster, GAME.npc.style(poster, tpl(
          (DATA.contracts && DATA.contracts.accept && pick(DATA.contracts.accept)) || 'ok {me} is on it',
          { me: p.name, target: c.targetName })));
      }
      return { ok: true, c: c };
    }
    return { err: 'Somebody else took it.' };
  }

  function progress(c) {
    var p = S.player;
    switch (c.kind) {
      case 'crime': return { have: p.st.crimes - c.snap.crimes, need: c.n };
      case 'gym': return { have: Math.max(0, Math.round((p[c.stat] || 0) - c.snap.stat)), need: c.n };
      case 'fetch': return { have: GAME.items.count(c.itemId), need: 1 };
      case 'protect': return { have: Math.max(0, Math.min(c.ms, NOW() - c.taken)), need: c.ms, time: true };
      default: return { have: c.done ? 1 : 0, need: 1 };
    }
  }

  function isDone(c) {
    var pr = progress(c);
    if (c.kind === 'protect') return NOW() >= c.until && !c.failed;
    return pr.have >= pr.need;
  }

  /* Called by the rest of the game when something happens that a
     contract might have been waiting for. */
  function note(what, data) {
    var a = active();
    for (var i = 0; i < a.length; i++) {
      var c = a[i];
      if (what === 'hospitalised' && c.kind === 'hit' && data.id === c.target) c.done = true;
      if (what === 'mugged' && c.kind === 'mug' && data.id === c.target && data.amount > 0) c.done = true;
      if (what === 'freed' && c.kind === 'bail' && data.id === c.target) c.done = true;
      if (what === 'hospitalised' && c.kind === 'protect' && data.id === c.target && NOW() < c.until) c.failed = true;
    }
  }

  function claim(id) {
    var a = active(), p = S.player;
    for (var i = 0; i < a.length; i++) {
      var c = a[i];
      if (c.id !== id) continue;
      if (c.failed) return { err: 'You let that one go wrong.' };
      if (!isDone(c)) return { err: 'Not finished yet.' };
      if (c.kind === 'fetch') {
        if (!GAME.items.count(c.itemId)) return { err: 'You are not carrying the ' + c.itemName + '.' };
        GAME.items.remove(c.itemId, 1);
      }
      a.splice(i, 1);
      GAME.player.pay(c.reward);
      GAME.points.give(c.points);
      GAME.progress.gainXP(Math.max(3, Math.round(c.reward / 900)));
      p.st.contracts = (p.st.contracts || 0) + 1;
      var poster = byId(c.by);
      if (poster) {
        poster.op = clamp(poster.op + c.rep, -100, 100);
        poster.grudge = Math.max(0, poster.grudge - 6);
        if (chance(0.55)) GAME.feed.say(poster, GAME.npc.style(poster, tpl(
          (DATA.contracts && DATA.contracts.done && pick(DATA.contracts.done)) || 'nice work {me}, sending it now',
          { me: p.name, target: c.targetName })));
      }
      GAME.feed.log('board', 'Paid out: ' + money(c.reward) + ' and ' + c.points + ' points from ' + c.byName + '.');
      GAME.feed.newsFrom('milestone', 'money', { who: p.name, other: c.byName, amount: money(c.reward), n: p.st.contracts, city: p.city });
      return { ok: true, c: c };
    }
    return { err: 'Not one of yours.' };
  }

  function drop(id, quiet) {
    var a = active();
    for (var i = 0; i < a.length; i++) {
      if (a[i].id !== id) continue;
      var c = a.splice(i, 1)[0];
      var poster = byId(c.by);
      if (poster) {
        poster.op = clamp(poster.op - Math.round(c.rep * 0.8), -100, 100);
        poster.grudge = clamp(poster.grudge + 4, 0, 100);
        if (!quiet && chance(0.5)) GAME.feed.say(poster, GAME.npc.style(poster, tpl(
          (DATA.contracts && DATA.contracts.failed && pick(DATA.contracts.failed)) || '{me} took my job and did nothing. remember that',
          { me: S.player.name, target: c.targetName })));
      }
      GAME.feed.log('board', 'You dropped ' + c.byName + "'s job.");
      return { ok: true };
    }
    return { err: 'Not one of yours.' };
  }

  function tick(now) {
    var b = board();
    /* postings come and go */
    for (var i = b.length - 1; i >= 0; i--) if (b[i].expires <= now) b.splice(i, 1);
    while (b.length < 12 && chance(0.35)) {
      var c = make(now);
      if (c) b.push(c); else break;
    }
    /* jobs you are sitting on go stale, and the poster notices */
    var a = active();
    for (var k = a.length - 1; k >= 0; k--) {
      var mine = a[k];
      if (mine.kind === 'protect') {
        var t = byId(mine.target);
        if (t && t.hospUntil > mine.taken && NOW() < mine.until) mine.failed = true;
      }
      if (now > mine.taken + 24 * HOUR && !isDone(mine)) {
        drop(mine.id, false);
      } else if (!mine.nudged && now > mine.taken + 8 * HOUR && !isDone(mine)) {
        mine.nudged = true;
        var poster = byId(mine.by);
        if (poster) GAME.mail.fromNpc(poster, 'threat', {});
      }
    }
  }

  function seed(now) {
    S.board = []; S.myContracts = []; S.nextConId = 1;
    for (var i = 0; i < rint(6, 11); i++) {
      var c = make(now - rflt(0, 8) * HOUR);
      if (c) S.board.push(c);
    }
  }

  return {
    board: board, active: active, kinds: kinds, describe: describe, progress: progress,
    isDone: isDone, accept: accept, claim: claim, drop: drop, tick: tick, seed: seed,
    note: note, MAX_ACTIVE: MAX_ACTIVE
  };
})();
