/* ============================================================
   35-crimes.js :: crimes (cost Brave) and jobs (cost Energy)
   ============================================================ */

GAME.crimes = (function () {

  function list() { return DATA.crimes || []; }
  function get(id) {
    var c = list();
    for (var i = 0; i < c.length; i++) if (c[i].id === id) return c[i];
    return null;
  }

  /* Success chance: the listed base, lifted by level headroom and by
     Dexterity, and nudged by whichever city you are standing in. */
  function successChance(c, p) {
    if (!c) return 0;
    var head = Math.max(0, (p.level || 1) - (c.lvl || 1));
    var lvlBonus = (1 - Math.exp(-head / 9)) * 0.30;
    var dexBonus = Math.min(0.16, Math.log10(1 + (p.dex || 10)) * 0.07) + Math.min(0.14, Math.log10(1 + (p.iq || 10)) * 0.07);
    var cityBonus = 0;
    var city = GAME.travel.current();
    if (city && city.bonus && city.bonus.crime) cityBonus = city.bonus.crime;
    var mastery = Math.min(0.10, ((S.mastery && S.mastery[c.id]) || 0) * 0.0025);
    return clamp((c.base || 0.5) + lvlBonus + dexBonus + cityBonus + mastery, 0.03, 0.97);
  }

  function canDo(c) {
    var p = S.player;
    var b = GAME.player.blocked();
    if (b) return 'You are ' + (b.why === 'jail' ? 'in jail' : b.why === 'hospital' ? 'in hospital' : 'in transit') + '.';
    if (!c) return 'No such job.';
    if (p.level < (c.lvl || 1)) return 'You need to be level ' + c.lvl + '.';
    if (p.nerve < (c.brave || 1)) return 'Not enough Brave. You need ' + c.brave + '.';
    return null;
  }

  function commit(id) {
    var c = get(id), p = S.player;
    var err = canDo(c);
    if (err) return { err: err };

    p.nerve -= (c.brave || 1);
    if (!S.mastery) S.mastery = {};
    S.mastery[c.id] = (S.mastery[c.id] || 0) + 1;

    var chanceOk = successChance(c, p);
    if (chance(chanceOk)) {
      var payMult = 1;
      var city = GAME.travel.current();
      if (city && city.bonus && city.bonus.pay) payMult += city.bonus.pay;
      var cash = Math.round(rint(c.pay[0], c.pay[1]) * payMult);
      var xp = rint(c.xp[0], c.xp[1]);
      GAME.player.pay(cash);
      GAME.progress.gainXP(xp);
      p.st.crimes++;
      if (p.st.crimes % 100 === 0) {
        GAME.feed.newsFrom('milestone', 'good', { who: p.name, n: p.st.crimes, crime: c.name });
      }
      if (cash > 25000 && chance(0.3)) {
        GAME.feed.newsFrom('crimeWin', 'crime', { who: p.name, amount: money(cash), crime: c.name.toLowerCase(), city: p.city });
      }
      GAME.feed.log('crime', c.ok + ' (+' + money(cash) + ', +' + xp + ' xp)');
      return { ok: true, cash: cash, xp: xp, text: c.ok, chance: chanceOk };
    }

    p.st.crimeFail++;
    if (chance(c.jailP === undefined ? 0.5 : c.jailP)) {
      var secs = rint(c.jail[0], c.jail[1]);
      GAME.player.jail(secs * 1000, c.caught || 'You got pinched.', p.level * 2000);
      GAME.feed.newsFrom('jail', 'jail', { who: p.name, crime: c.name.toLowerCase(), n: Math.round(secs / 60), city: p.city });
      GAME.feed.log('jail', c.caught + ' ' + Math.round(secs / 60) + ' minutes in the cells.');
      return { ok: false, jailed: true, secs: secs, text: c.caught, chance: chanceOk };
    }
    GAME.feed.log('fail', c.fail);
    return { ok: false, jailed: false, text: c.fail, chance: chanceOk };
  }

  /* ---- jobs: safe, energy-priced grind ---- */
  function jobs() { return DATA.jobs || []; }
  function getJob(id) {
    var j = jobs();
    for (var i = 0; i < j.length; i++) if (j[i].id === id) return j[i];
    return null;
  }
  function work(id) {
    var j = getJob(id), p = S.player;
    var b = GAME.player.blocked();
    if (b) return { err: 'You cannot work right now.' };
    if (!j) return { err: 'No such job.' };
    if (p.level < (j.lvl || 1)) return { err: 'You need to be level ' + j.lvl + '.' };
    if ((p.dex || 10) < (j.lab || 0)) return { err: 'They want somebody with ' + fmt(j.lab) + ' Labour. You have ' + fmt(Math.round(p.dex || 10)) + '.' };
    if (p.energy < j.energy) return { err: 'That shift takes ' + j.energy + ' Energy. You have ' + Math.floor(p.energy) + '.' };
    p.energy -= j.energy;
    var cash = Math.round(rint(j.pay[0], j.pay[1]) * (1 + Math.log(1 + (p.dex || 10)) / Math.LN10 * 0.28));
    var xp = rint(j.xp[0], j.xp[1]);
    GAME.player.pay(cash);
    GAME.progress.gainXP(xp);
    p.st.jobs = (p.st.jobs || 0) + 1;
    /* working teaches you a little of both, slowly */
    p.dex = Math.round((p.dex + 0.55) * 100) / 100;
    p.iq = Math.round((p.iq + 0.12) * 100) / 100;
    GAME.feed.log('job', j.name + '. (+' + money(cash) + ', +' + xp + ' xp)');
    return { ok: true, cash: cash, xp: xp, name: j.name, desc: j.desc };
  }

  return {
    list: list, get: get, successChance: successChance, canDo: canDo, commit: commit,
    jobs: jobs, getJob: getJob, work: work
  };
})();


/* ============================================================
   jail :: bailing yourself out, busting other players out
   ============================================================ */
GAME.jail = (function () {

  function inmates() {
    var now = NOW(), out = [];
    for (var i = 0; i < S.npcs.length; i++) {
      var n = S.npcs[i];
      if (n.jailUntil > now) out.push(n);
    }
    if (S.player.jailUntil > now) out.push(S.player);
    out.sort(function (a, b) { return a.jailUntil - b.jailUntil; });
    return out;
  }

  function bailSelf() {
    var p = S.player;
    if (p.jailUntil <= NOW()) return { err: 'You are not in jail.' };
    if (p.money < p.bail) return { err: 'You cannot cover the bail. You need ' + money(p.bail) + '.' };
    GAME.player.spend(p.bail);
    p.jailUntil = 0;
    GAME.feed.log('jail', 'You posted ' + money(p.bail) + ' bail and walked.');
    return { ok: true, paid: p.bail };
  }

  function bailCost(n) { return (n.level || 1) * 2000; }

  function bailOut(id) {
    var n = byId(id), p = S.player;
    if (!n || n.jailUntil <= NOW()) return { err: 'They are not in jail.' };
    var cost = bailCost(n);
    if (p.money < cost) return { err: 'Bail is ' + money(cost) + '. You are short.' };
    GAME.player.spend(cost);
    n.jailUntil = 0;
    GAME.npc.remember(n, 'bailed_by_player', { amount: cost });
    GAME.progress.gainXP(Math.round(cost / 900) + 2);
    p.st.busts++;
    GAME.feed.newsFrom('bustOut', 'jail', { who: p.name, other: n.name, amount: money(cost), city: p.city });
    GAME.feed.log('jail', 'You posted ' + money(cost) + ' to spring ' + n.name + '.');
    GAME.contracts.note('freed', { id: n.id });
    return { ok: true, cost: cost, name: n.name };
  }

  /* Breaking somebody out is free but risky: fail and you join them. */
  /* "IQ determines how successful you are at crimes, and also helps you
     bust people out of jail easier." */
  function bustChance(n) {
    var p = S.player;
    return clamp(((p.iq || 10) / Math.max(1, Math.pow(n.level || 1, 2))) * 50 + 0.01, 0.01, 0.95);
  }

  function bust(id) {
    var n = byId(id), p = S.player;
    if (!n || n.jailUntil <= NOW()) return { err: 'They are not in jail.' };
    if (GAME.player.inJail()) return { err: 'You are in here with them.' };
    if (GAME.player.blocked()) return { err: 'You cannot do that right now.' };
    if (p.energy < 10) return { err: 'Breaking somebody out takes 10 Energy.' };
    p.energy -= 10;
    var ch = bustChance(n);
    if (chance(ch)) {
      n.jailUntil = 0;
      p.st.busts++;
      GAME.npc.remember(n, 'busted_by_player', {});
      var xp = Math.round(4 + (n.level || 1) * 0.8);
      GAME.progress.gainXP(xp);
      GAME.feed.newsFrom('bustOut', 'jail', { who: p.name, other: n.name, city: p.city });
      GAME.feed.log('jail', 'You broke ' + n.name + ' out of the can. (+' + xp + ' xp)');
      GAME.contracts.note('freed', { id: n.id });
      return { ok: true, name: n.name, xp: xp };
    }
    p.st.bustFail++;
    var secs = Math.min(Math.pow(n.level || 1, 2), 100) * 60;
    GAME.player.jail(secs * 1000, 'Caught trying to bust out ' + n.name + '.', p.level * 2000);
    GAME.feed.newsFrom('bustFail', 'jail', { who: p.name, other: n.name, city: p.city });
    GAME.feed.log('jail', 'A guard spotted you. You are in the cells for ' + Math.round(secs / 60) + ' minutes.');
    return { ok: false, name: n.name, secs: secs };
  }

  return { inmates: inmates, bailSelf: bailSelf, bailOut: bailOut, bailCost: bailCost, bust: bust, bustChance: bustChance };
})();


/* ============================================================
   hospital :: paying to skip the bed
   ============================================================ */
GAME.hospital = (function () {
  function patients() {
    var now = NOW(), out = [];
    for (var i = 0; i < S.npcs.length; i++) if (S.npcs[i].hospUntil > now) out.push(S.npcs[i]);
    out.sort(function (a, b) { return a.hospUntil - b.hospUntil; });
    return out;
  }
  function cost() {
    var left = Math.max(0, S.player.hospUntil - NOW()) / 1000;
    return Math.round(left * 46 * (1 + S.player.level * 0.22));
  }
  function checkOut() {
    var p = S.player, c = cost();
    if (p.hospUntil <= NOW()) return { err: 'You are not in hospital.' };
    if (p.money < c) return { err: 'The bill is ' + money(c) + '. You cannot pay it.' };
    GAME.player.spend(c);
    p.hospUntil = 0;
    p.health = maxHealth(p);
    p.regen.health = NOW();
    GAME.feed.log('heal', 'You paid ' + money(c) + ' and checked yourself out.');
    return { ok: true, paid: c };
  }
  return { patients: patients, cost: cost, checkOut: checkOut };
})();
