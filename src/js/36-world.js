/* ============================================================
   36-world.js :: gym, bank, properties, travel, hitlist, market
   ============================================================ */

var ENERGY_PER_SET = 5;

GAME.gym = (function () {
  function list() { return DATA.gym || []; }
  function get(id) { var g = list(); for (var i = 0; i < g.length; i++) if (g[i].id === id) return g[i]; return null; }
  function current() {
    var id = S.player.gym || (list()[0] && list()[0].id);
    return get(id) || list()[0] || null;
  }
  function owned() {
    var p = S.player;
    if (!p.gyms || !p.gyms.length) p.gyms = [(list()[0] && list()[0].id)].filter(Boolean);
    return p.gyms;
  }
  function join(id) {
    var g = get(id), p = S.player;
    if (!g) return { err: 'No such gym.' };
    if (owned().indexOf(id) >= 0) { p.gym = id; return { ok: true, switched: true, name: g.name }; }
    if (p.level < (g.lvl || 1)) return { err: 'They will not let you in below level ' + g.lvl + '.' };
    if (p.money < g.price) return { err: 'Membership is ' + money(g.price) + '.' };
    GAME.player.spend(g.price);
    owned().push(id);
    p.gym = id;
    GAME.feed.log('gym', 'You joined ' + g.name + '.');
    return { ok: true, name: g.name, paid: g.price };
  }

  /* Diminishing returns: each point is worth less as the stat grows,
     which is why the top of the ladder is so hard to reach. */
  /* Energy buys the set. Will decides how much the set is worth - which is
     why the veterans told everybody to refill Will before Energy. */
  function willFactor() {
    var p = S.player;
    return 0.55 + 0.45 * clamp((p.will || 0) / Math.max(1, p.willMax), 0, 1);
  }
  function gainFor(stat, sets) {
    var p = S.player, g = current();
    if (!g) return 0;
    var mult = g[stat] || 0;
    if (!mult) return 0;
    var cur = p[stat] || 10;
    var per = mult
      * (1.6 / (1 + Math.pow(cur / 240, 0.82)))
      * (1 + Math.log(1 + p.level) / Math.LN10 * 0.22)
      * willFactor()
      * (GAME.player.inJail() ? 0.5 : 1);
    return per * sets;
  }

  function train(stat, sets) {
    var p = S.player, g = current();
    var b = GAME.player.blocked();
    /* the jail gym is the one thing you can do from inside */
    if (b && b.why !== 'jail') return { err: 'You cannot train right now.' };
    if (!g) return { err: 'No gym.' };
    if (!g[stat]) return { err: g.name + ' does not train ' + stat + '.' };
    sets = Math.max(1, Math.min(sets || 1, Math.floor(p.energy / ENERGY_PER_SET)));
    if (p.energy < ENERGY_PER_SET) return { err: 'Training takes ' + ENERGY_PER_SET + ' Energy a set. You have ' + Math.floor(p.energy) + '.' };
    var gain = gainFor(stat, sets);
    p.energy -= sets * ENERGY_PER_SET;
    p.will = Math.max(0, p.will - sets);
    p[stat] = Math.round((p[stat] + gain) * 100) / 100;
    p.st.gymSets += sets;
    GAME.progress.gainXP(Math.round(sets * 0.7));
    GAME.feed.log('gym', 'Trained ' + stat + ' x' + sets + ' at ' + g.name + '. +' + gain.toFixed(2) + '.');
    return { ok: true, gain: gain, stat: stat, sets: sets, gym: g.name };
  }
  return { list: list, get: get, current: current, owned: owned, join: join, train: train, gainFor: gainFor, willFactor: willFactor, ENERGY_PER_SET: ENERGY_PER_SET };
})();


GAME.bank = (function () {
  function deposit(n) {
    var p = S.player;
    n = Math.floor(n);
    if (!(n > 0)) return { err: 'Enter an amount.' };
    if (p.money < n) return { err: 'You are not carrying that much.' };
    p.money -= n; p.bank += n;
    return { ok: true, n: n };
  }
  function withdraw(n) {
    var p = S.player;
    n = Math.floor(n);
    if (!(n > 0)) return { err: 'Enter an amount.' };
    if (p.bank < n) return { err: 'You do not have that in the bank.' };
    p.bank -= n; p.money += n;
    return { ok: true, n: n };
  }
  function rateText() { return (CFG.BANK_RATE * 100).toFixed(2) + '% per hour'; }
  return { deposit: deposit, withdraw: withdraw, rateText: rateText };
})();


GAME.props = (function () {
  function list() { return DATA.props || []; }
  function get(id) { var l = list(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function owns(id) { return (S.player.props || []).indexOf(id) >= 0; }
  function buy(id) {
    var pr = get(id), p = S.player;
    if (!pr) return { err: 'No such property.' };
    if (owns(id)) return { err: 'You already own that.' };
    if (p.level < (pr.lvl || 1)) return { err: 'You need to be level ' + pr.lvl + '.' };
    var have = p.money + p.bank;
    if (have < pr.price) return { err: 'You are ' + money(pr.price - have) + ' short.' };
    var fromCash = Math.min(p.money, pr.price);
    p.money -= fromCash;
    p.bank -= (pr.price - fromCash);
    p.st.spent += pr.price;
    (p.props = p.props || []).push(id);
    if (pr.hp) p.health = Math.min(maxHealth(p), p.health + pr.hp);
    GAME.feed.newsFrom('bigPurchase', 'money', { who: p.name, item: pr.name, amount: money(pr.price), city: p.city });
    GAME.feed.log('buy', 'You bought ' + pr.name + ' for ' + money(pr.price) + '.');
    return { ok: true, name: pr.name, paid: pr.price };
  }
  function sell(id) {
    var pr = get(id), p = S.player;
    if (!owns(id)) return { err: 'You do not own that.' };
    var back = Math.round(pr.price * 0.68);
    p.props.splice(p.props.indexOf(id), 1);
    p.money += back;
    p.health = Math.min(maxHealth(p), p.health);
    GAME.feed.log('sell', 'You sold ' + pr.name + ' for ' + money(back) + '.');
    return { ok: true, back: back, name: pr.name };
  }
  function income() {
    var t = 0, u = 0, l = S.player.props || [];
    for (var i = 0; i < l.length; i++) { var pr = get(l[i]); if (pr) { t += pr.income || 0; u += pr.upkeep || 0; } }
    return { hourly: t, daily: u };
  }
  return { list: list, get: get, owns: owns, buy: buy, sell: sell, income: income };
})();


GAME.travel = (function () {
  function list() { return DATA.cities || []; }
  function get(id) { var l = list(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function currentId() { return S.player.cityId || (list()[0] && list()[0].id) || 'newyork'; }
  function current() { return get(currentId()); }
  function fly(id) {
    var c = get(id), p = S.player;
    if (!c) return { err: 'No such destination.' };
    if (id === currentId()) return { err: 'You are already there.' };
    var b = GAME.player.blocked();
    if (b) return { err: 'You cannot leave right now.' };
    if (p.money < c.cost) return { err: 'Airfare is ' + money(c.cost) + '.' };
    GAME.player.spend(c.cost);
    p.travelUntil = NOW() + (c.flightMin || 20) * MIN;
    p.travelTo = c.name;
    p.cityId = id;
    GAME.feed.log('travel', 'You booked a flight to ' + c.name + '.');
    return { ok: true, name: c.name, mins: c.flightMin };
  }
  return { list: list, get: get, current: current, currentId: currentId, fly: fly };
})();


/* ============================================================
   hitlist :: put money on somebody's head
   ============================================================ */
GAME.hitlist = (function () {
  function list() { return (S.hitlist || []).slice().sort(function (a, b) { return b.amount - a.amount; }); }
  function on(id) {
    var l = S.hitlist || [], t = 0;
    for (var i = 0; i < l.length; i++) if (l[i].target === id) t += l[i].amount;
    return t;
  }
  function place(targetId, amount) {
    var p = S.player, t = byId(targetId);
    amount = Math.floor(amount);
    if (!t || targetId === 0) return { err: 'Pick somebody else.' };
    if (!(amount >= 1000)) return { err: 'The minimum bounty is $1,000.' };
    if (p.money < amount) return { err: 'You cannot cover that.' };
    GAME.player.spend(amount);
    (S.hitlist = S.hitlist || []).push({ target: targetId, amount: amount, by: 0, byName: p.name, t: NOW() });
    t.bounty = on(targetId);
    GAME.feed.newsFrom('bountyPlaced', 'bounty', { who: p.name, other: t.name, amount: money(amount), city: t.city });
    GAME.feed.log('bounty', 'You put ' + money(amount) + ' on ' + t.name + '.');
    GAME.npc.remember(t, 'bounty_by_player', { amount: amount });
    return { ok: true };
  }
  function npcPlace(npc, targetId, amount) {
    var t = byId(targetId);
    if (!t || npc.money < amount) return;
    npc.money -= amount;
    (S.hitlist = S.hitlist || []).push({ target: targetId, amount: amount, by: npc.id, byName: npc.name, t: NOW() });
    t.bounty = on(targetId);
    GAME.feed.newsFrom('bountyPlaced', 'bounty', { who: npc.name, other: t.name, amount: money(amount), city: t.city });
    if (targetId === 0) GAME.mail.fromNpc(npc, 'bountyNotice', { amount: money(amount) });
  }
  /* Pay out every bounty on `targetId` to `claimerId`. */
  function collect(targetId, claimerId) {
    var l = S.hitlist || [], total = 0, keep = [];
    for (var i = 0; i < l.length; i++) {
      if (l[i].target === targetId && l[i].by !== claimerId) total += l[i].amount;
      else keep.push(l[i]);
    }
    if (!total) return 0;
    S.hitlist = keep;
    var t = byId(targetId);
    if (t) t.bounty = on(targetId);
    var c = byId(claimerId);
    if (c) {
      c.money += total;
      if (claimerId === 0) {
        S.player.st.earned += total;
        GAME.feed.log('bounty', 'You collected a ' + money(total) + ' bounty on ' + (t ? t.name : 'them') + '.');
      }
      GAME.feed.newsFrom('bountyClaim', 'bounty', { who: c.name, other: t ? t.name : 'someone', amount: money(total), city: c.city });
    }
    return total;
  }
  return { list: list, on: on, place: place, npcPlace: npcPlace, collect: collect };
})();
