/* ============================================================
   34-player.js :: regeneration, levelling, hospital, jail, bank
   ============================================================ */

GAME.progress = (function () {

  /* The fitted table runs to a few hundred levels. Past the end of it the
     curve is extrapolated from its own final slope, so nobody ever hits a
     wall - there is no level cap in this game. */
  function xpForLevel(lv) {
    var t = (DATA.levels && DATA.levels.table) || null;
    if (!t || !t.length) return Math.round(110 * Math.pow(lv - 1, 2.42) + (lv - 1) * 60);
    if (lv <= t.length) return t[lv - 1];
    var last = t[t.length - 1];
    var gap = last - t[t.length - 2];
    var growth = gap / (t[t.length - 2] - t[t.length - 3]);
    if (!isFinite(growth) || growth < 1.001) growth = 1.02;
    var over = lv - t.length, total = last;
    for (var i = 0; i < over && i < 4000; i++) { gap *= growth; total += gap; }
    return Math.round(total);
  }

  function rankFor(xp) {
    var r = DATA.ranks || [];
    var out = r.length ? r[0] : { name: 'Nobody', xp: 0, blurb: '' };
    for (var i = 0; i < r.length; i++) if (xp >= r[i].xp) out = r[i]; else break;
    return out;
  }
  function rankIndex(xp) {
    var r = DATA.ranks || [], k = 0;
    for (var i = 0; i < r.length; i++) if (xp >= r[i].xp) k = i; else break;
    return k;
  }
  function nextRank(xp) {
    var r = DATA.ranks || [];
    for (var i = 0; i < r.length; i++) if (xp < r[i].xp) return r[i];
    return null;
  }

  function perLevel() {
    return (DATA.levels && DATA.levels.perLevel) || { energy: 2, will: 1, brave: 0.34, health: 12, attacks: 0.06 };
  }

  function cap(v, c) { return (c && c > 0) ? Math.min(c, v) : v; }

  function applyLevel(p) {
    var lv = p.level - 1, C = CFG.CAP || {};
    p.energyMax = cap(Math.round(30 + 2.05 * lv), C.energy);
    p.willMax = cap(Math.round(12 + 0.98 * lv), C.will);
    p.nerveMax = cap(Math.round(5 + 0.35 * lv), C.nerve);
    p.dexgMax = cap(Math.round(20 + 0.60 * lv), C.dexg);
    p.healthMax = cap(Math.round(100 + 12.25 * lv), C.health);
    p.attacksMax = cap(Math.round(5 + 0.07 * lv), C.attacks);
    if (p.dexg === undefined) p.dexg = p.dexgMax;
  }

  function gainXP(n) {
    var p = S.player;
    p.xp += Math.max(0, Math.round(n));
    var before = p.level, leveled = [];
    var ceiling = CFG.MAX_LEVEL > 0 ? CFG.MAX_LEVEL : 100000;
    while (p.level < ceiling && p.xp >= xpForLevel(p.level + 1) && leveled.length < 400) {
      p.level++;
      leveled.push(p.level);
    }
    if (leveled.length) {
      var oldRank = p._rankName;
      applyLevel(p);
      p.energy = p.energyMax; p.nerve = p.nerveMax; p.will = p.willMax;
      p.health = maxHealth(p);
      p.attacks = p.attacksMax;
      p.points = (p.points || 0) + leveled.length;
      GAME.feed.log('level', 'LEVEL UP. You are now level ' + p.level + '. All stats refilled.');
      GAME.feed.newsFrom('rankUp', 'rank', { who: p.name, rank: rankFor(p.xp).name, n: p.level, city: p.city });
      GAME.mail.system('levelup', { n: p.level });
      GAME.ui.toast('Level ' + p.level + '!', 'good');
    }
    var rn = rankFor(p.xp).name;
    if (p._rankName && p._rankName !== rn) {
      GAME.feed.log('rank', 'You have been made ' + rn + '.');
      GAME.ui.toast('New rank: ' + rn, 'good');
    }
    p._rankName = rn;
    return p.level - before;
  }

  /* Inverse of the curve: what level does this much committed play buy? */
  function levelForDays(d) {
    var t = (DATA.levels && DATA.levels.days) || null;
    if (!t) return clamp(Math.round(1 + Math.pow(Math.max(0, d) * 3, 0.62)), 1, 100);
    for (var i = t.length - 1; i >= 0; i--) if (d >= t[i]) return i + 1;
    return 1;
  }

  return {
    levelForDays: levelForDays,
    xpForLevel: xpForLevel, rankFor: rankFor, rankIndex: rankIndex,
    nextRank: nextRank, gainXP: gainXP, applyLevel: applyLevel, perLevel: perLevel
  };
})();


GAME.player = (function () {

  function energyRegenMs() {
    var mult = 1;
    var props = S.player.props || [];
    for (var i = 0; i < props.length; i++) {
      var pr = GAME.props.get(props[i]);
      if (pr && pr.energyRegen) mult += pr.energyRegen / 100;
    }
    return paced(CFG.ENERGY_TICK) / mult;
  }

  /* Catch every pool up to `now`, crediting whole ticks only so no
     fraction is ever lost across a save/load. */
  function regen(now) {
    var p = S.player, r = p.regen;
    var pools = [
      ['energy', 'energyMax', energyRegenMs()],
      ['nerve', 'nerveMax', paced(CFG.NERVE_TICK)],
      ['will', 'willMax', paced(CFG.WILL_TICK)],
      ['dexg', 'dexgMax', paced(CFG.DEX_TICK)],
      ['attacks', 'attacksMax', paced(CFG.ATTACK_TICK)]
    ];
    for (var i = 0; i < pools.length; i++) {
      var key = pools[i][0], maxKey = pools[i][1], every = pools[i][2];
      if (!r[key]) r[key] = now;
      var max = p[maxKey];
      if (p[key] >= max) { r[key] = now; continue; }
      var ticks = Math.floor((now - r[key]) / every);
      if (ticks > 0) {
        p[key] = Math.min(max, p[key] + ticks);
        r[key] += ticks * every;
        if (p[key] >= max) r[key] = now;
      }
    }
    /* health only heals out of hospital; hospital discharge is full */
    if (!r.health) r.health = now;
    if (p.hospUntil > now) {
      r.health = now;
    } else {
      var hm = maxHealth(p);
      if (p.health < hm) {
        var ht = Math.floor((now - r.health) / paced(CFG.HEALTH_TICK));
        if (ht > 0) {
          p.health = Math.min(hm, p.health + ht * Math.max(1, Math.round(hm / 100)));
          r.health += ht * paced(CFG.HEALTH_TICK);
        }
      } else r.health = now;
    }
  }

  function hospitalize(ms, why) {
    var p = S.player;
    p.hospUntil = Math.max(p.hospUntil, NOW() + ms);
    p.hospWhy = why || '';
    p.health = 0;
    p.st.hosped++;
    p.regen.health = NOW();
  }

  function jail(ms, why, bail) {
    var p = S.player;
    if (GAME.lawyer.onRetainer()) ms = Math.round(ms * 0.5);
    /* The bounds are a knob in the back office, so they have to actually
       bind - CFG.JAIL_MAX was documented in the crime tables and read by
       nothing. Hospital time has always been clamped this way. */
    ms = clamp(ms, CFG.JAIL_MIN, CFG.JAIL_MAX);
    p.jailUntil = Math.max(p.jailUntil, NOW() + ms);
    p.jailWhy = why || '';
    p.bail = bail || Math.round(ms / 1000 * 55 * (1 + p.level * 0.3));
    p.st.jailed++;
  }

  function inHospital() { return S.player.hospUntil > NOW(); }
  function inJail() { return S.player.jailUntil > NOW(); }
  function traveling() { return (S.player.travelUntil || 0) > NOW(); }

  function blocked() {
    if (inHospital()) return { why: 'hospital', until: S.player.hospUntil, text: S.player.hospWhy };
    if (inJail()) return { why: 'jail', until: S.player.jailUntil, text: S.player.jailWhy };
    if (traveling()) return { why: 'travel', until: S.player.travelUntil, text: 'In transit to ' + (S.player.travelTo || 'somewhere') + '.' };
    return null;
  }

  function pay(n) {
    S.player.money += n;
    if (n > 0) S.player.st.earned += n; else S.player.st.spent += -n;
  }

  function spend(n) {
    if (S.player.money < n) return false;
    S.player.money -= n;
    S.player.st.spent += n;
    return true;
  }

  /* Bank interest, property income and daily upkeep, credited per hour. */
  function economy(now) {
    var p = S.player;
    if (!p.regen.bank) p.regen.bank = now;
    var hours = Math.floor((now - p.regen.bank) / HOUR);
    if (hours <= 0) return;
    p.regen.bank += hours * HOUR;
    hours = Math.min(hours, 24 * 30);

    if (p.bank > 0) {
      var cap = p.bank * CFG.BANK_CAP_MULT;
      var interest = Math.min(cap, Math.round(p.bank * (Math.pow(1 + CFG.BANK_RATE, hours) - 1)));
      if (interest > 0) { p.bank += interest; p._lastInterest = interest; }
    }
    var income = 0, upkeep = 0;
    for (var i = 0; i < (p.props || []).length; i++) {
      var pr = GAME.props.get(p.props[i]);
      if (!pr) continue;
      income += (pr.income || 0) * hours;
      upkeep += (pr.upkeep || 0) * (hours / 24);
    }
    income = Math.round(income); upkeep = Math.round(upkeep);
    if (income) { p.bank += income; p.st.earned += income; }
    if (upkeep) {
      if (p.bank >= upkeep) p.bank -= upkeep;
      else { p.money = Math.max(0, p.money - (upkeep - p.bank)); p.bank = 0; }
      p.st.spent += upkeep;
    }
    if (income || upkeep) p._lastIncome = { income: income, upkeep: upkeep, hours: hours };
  }

  /* Points drip in from the Attack Ladder every hour. */
  function points(now) { GAME.ladder.payout(now); }

  return {
    points: points,
    regen: regen, hospitalize: hospitalize, jail: jail,
    inHospital: inHospital, inJail: inJail, traveling: traveling, blocked: blocked,
    pay: pay, spend: spend, economy: economy, energyRegenMs: energyRegenMs
  };
})();
