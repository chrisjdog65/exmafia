/* ============================================================
   40-family.js :: crews, membership, wars
   ============================================================ */

GAME.family = (function () {

  function all() { return S.fams || []; }
  function get(id) { return famById(id); }
  function mine() { return famById(S.player.fam); }

  function membersOf(f) {
    var out = [];
    if (!f) return out;
    for (var i = 0; i < f.members.length; i++) {
      var m = byId(f.members[i]);
      if (m) out.push(m);
    }
    if (f.playerMember) out.push(S.player);
    out.sort(function (a, b) { return (b.respect || 0) - (a.respect || 0); });
    return out;
  }

  function power(f) {
    var m = membersOf(f), t = 0;
    for (var i = 0; i < m.length; i++) t += GAME.combat.power(m[i]);
    return t;
  }

  function ranked() {
    return all().slice().sort(function (a, b) { return power(b) - power(a); });
  }

  function join(id) {
    var f = get(id), p = S.player;
    if (!f) return { err: 'No such family.' };
    if (p.fam) return { err: 'Leave your family first.' };
    if (!f.open && !(S.famInvites || []).some(function (x) { return x.fam === id; })) {
      return { err: f.name + ' is invite only.' };
    }
    if (membersOf(f).length >= 36) return { err: 'They are full.' };
    p.fam = id;
    p.famRole = 'soldier';
    f.playerMember = true;
    S.famInvites = (S.famInvites || []).filter(function (x) { return x.fam !== id; });
    GAME.feed.newsFrom('familyJoin', 'fam', { who: p.name, family: f.name, city: p.city });
    GAME.feed.log('family', 'You joined ' + f.name + '.');
    /* the crew says hello */
    var ms = membersOf(f).filter(function (m) { return m.id !== 0; });
    for (var i = 0; i < Math.min(3, ms.length); i++) {
      if (chance(0.7)) GAME.mail.fromNpc(ms[i], 'friendly', { family: f.name });
    }
    return { ok: true, name: f.name };
  }

  function leave() {
    var f = mine(), p = S.player;
    if (!f) return { err: 'You are not in a family.' };
    f.playerMember = false;
    p.fam = null; p.famRole = null;
    GAME.feed.newsFrom('familyLeave', 'fam', { who: p.name, family: f.name, city: p.city });
    GAME.feed.log('family', 'You walked away from ' + f.name + '.');
    /* the loyal ones take it personally */
    var ms = membersOf(f);
    for (var i = 0; i < ms.length; i++) {
      if (ms[i].id === 0) continue;
      ms[i].op -= Math.round(ms[i].p.loyalty * 22);
      if (ms[i].id === f.leader && chance(0.6)) GAME.mail.fromNpc(ms[i], 'threat', { family: f.name });
    }
    return { ok: true, name: f.name };
  }

  function found(name, tag) {
    var p = S.player;
    if (p.fam) return { err: 'Leave your family first.' };
    if (!name || name.trim().length < 3) return { err: 'Pick a real name.' };
    var cost = 2500000;
    if (p.money + p.bank < cost) return { err: 'It costs ' + money(cost) + ' to register a family.' };
    var fromCash = Math.min(p.money, cost);
    p.money -= fromCash; p.bank -= (cost - fromCash);
    var f = {
      id: (S.fams.length ? Math.max.apply(null, S.fams.map(function (x) { return x.id; })) : 0) + 1,
      name: name.trim().slice(0, 34), tag: (tag || name.slice(0, 3)).toUpperCase().slice(0, 5),
      leader: 0, founded: NOW(), members: [], respect: 0, money: 0, wars: [],
      motd: 'Recruiting.', open: true, playerMember: true, playerFounded: true
    };
    S.fams.push(f);
    p.fam = f.id; p.famRole = 'boss';
    GAME.feed.newsFrom('familyForm', 'fam', { who: p.name, family: f.name, city: p.city });
    GAME.feed.log('family', 'You founded ' + f.name + '.');
    return { ok: true, id: f.id };
  }

  function invites() { return S.famInvites || []; }

  function recruit(npcId) {
    var f = mine(), n = byId(npcId);
    if (!f) return { err: 'You are not in a family.' };
    if (f.leader !== 0 && S.player.famRole !== 'underboss') return { err: 'Only the boss can recruit.' };
    if (!n || n.fam) return { err: 'They are already in a crew.' };
    var appeal = 0.1 + n.p.loyalty * 0.2 + (n.op / 200) + (GAME.combat.power(S.player) > GAME.combat.power(n) ? 0.2 : -0.1);
    if (chance(clamp(appeal, 0.03, 0.9))) {
      n.fam = f.id; n.famRole = 'soldier'; f.members.push(n.id);
      GAME.feed.newsFrom('familyJoin', 'fam', { who: n.name, family: f.name, city: n.city });
      return { ok: true, name: n.name };
    }
    n.op -= 3;
    return { ok: false, name: n.name };
  }

  function declareWar(id) {
    var f = mine(), o = get(id);
    if (!f) return { err: 'You are not in a family.' };
    if (f.leader !== 0) return { err: 'Only the boss declares war.' };
    if (!o || o.id === f.id) return { err: 'Pick another family.' };
    if (f.wars.indexOf(o.id) >= 0) return { err: 'You are already at war with them.' };
    f.wars.push(o.id); o.wars.push(f.id);
    GAME.feed.newsFrom('familyWar', 'war', { family: f.name, other: o.name, who: S.player.name });
    return { ok: true, name: o.name };
  }

  function atWarWith(a, b) {
    var f = get(a);
    return !!(f && f.wars.indexOf(b) >= 0);
  }

  return {
    all: all, get: get, mine: mine, membersOf: membersOf, power: power, ranked: ranked,
    join: join, leave: leave, found: found, recruit: recruit, declareWar: declareWar,
    invites: invites, atWarWith: atWarWith
  };
})();
