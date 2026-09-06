/* ============================================================
   45-normalize.js :: reconcile the content tables
   The data tables are authored separately from the engine, so this
   pass fills in anything they left out and guarantees every table
   the engine touches exists in a usable shape.
   ============================================================ */

GAME.normalize = (function () {

  function arr(v) { return Object.prototype.toString.call(v) === '[object Array]' ? v : []; }

  function run() {
    DATA.ranks = arr(DATA.ranks);
    if (!DATA.ranks.length) DATA.ranks = [{ name: 'Empty Suit', xp: 0, blurb: '' }];

    if (!DATA.levels || !arr(DATA.levels.table).length) {
      var t = [];
      for (var i = 1; i <= 100; i++) t.push(Math.round(110 * Math.pow(i - 1, 2.42) + (i - 1) * 60));
      DATA.levels = { table: t, perLevel: { energy: 2, will: 1, brave: 0.34, health: 12, attacks: 0.06 } };
    }
    if (!DATA.levels.perLevel) DATA.levels.perLevel = { energy: 2, will: 1, brave: 0.34, health: 12, attacks: 0.06 };

    /* ---- crimes ---- */
    DATA.crimes = arr(DATA.crimes);
    for (var c = 0; c < DATA.crimes.length; c++) {
      var cr = DATA.crimes[c];
      cr.brave = cr.brave || cr.nerve || 1;
      cr.lvl = cr.lvl || 1;
      cr.base = cr.base === undefined ? 0.5 : cr.base;
      cr.pay = arr(cr.pay).length === 2 ? cr.pay : [10, 40];
      cr.xp = arr(cr.xp).length === 2 ? cr.xp : [2, 5];
      cr.jail = arr(cr.jail).length === 2 ? cr.jail : [60, 240];
      cr.jailP = cr.jailP === undefined ? 0.5 : cr.jailP;
      cr.ok = cr.ok || 'It goes clean.';
      cr.fail = cr.fail || 'It does not come off.';
      cr.caught = cr.caught || 'Somebody was watching.';
      cr.tier = cr.tier || 1;
    }
    DATA.crimes.sort(function (a, b) { return (a.lvl - b.lvl) || (a.brave - b.brave); });

    /* ---- jobs: authored with an energy cost, paid for in Will ---- */
    DATA.jobs = arr(DATA.jobs);
    for (var j = 0; j < DATA.jobs.length; j++) {
      var jb = DATA.jobs[j];
      jb.will = jb.will || jb.energy || 1;
      jb.lvl = jb.lvl || 1;
      jb.pay = arr(jb.pay).length === 2 ? jb.pay : [10, 30];
      jb.xp = arr(jb.xp).length === 2 ? jb.xp : [1, 3];
      jb.desc = jb.desc || '';
    }
    DATA.jobs.sort(function (a, b) { return a.lvl - b.lvl; });

    /* ---- the experience curve ---------------------------------------
       The authored table put level 50 roughly a hundred and fifty weeks
       of solid play away, which is not a game. Rather than hand-pick new
       numbers, the curve is derived from the crime and job tables that
       actually exist: work out what a committed player can earn in a day
       at each level, then decide how many days that level should take.
       Retune the crimes and the curve follows them.
    -------------------------------------------------------------------- */
    fitLevelCurve();
    fitRankCurve();

    /* ---- items ---- */
    DATA.items = arr(DATA.items);
    if (!DATA.items.length) DATA.items = fallbackItems();
    for (var i2 = 0; i2 < DATA.items.length; i2++) {
      var it = DATA.items[i2];
      it.cat = it.cat || 'drop';
      it.lvl = it.lvl || 1;
      it.price = it.price || 0;
      it.atk = it.atk || 0;
      it.def = it.def || 0;
      it.acc = it.acc === undefined ? 0.9 : it.acc;
      it.heal = it.heal || 0;
      it.stock = it.stock === undefined ? true : !!it.stock;
      it.desc = it.desc || '';
      it.name = it.name || it.id;
    }

    /* ---- props / gym / cities ---- */
    DATA.props = arr(DATA.props);
    if (!DATA.props.length) DATA.props = fallbackProps();
    for (var q = 0; q < DATA.props.length; q++) {
      var pr = DATA.props[q];
      pr.kind = pr.kind || (pr.income ? 'biz' : 'home');
      pr.hp = pr.hp || 0; pr.income = pr.income || 0;
      pr.upkeep = pr.upkeep || 0; pr.energyRegen = pr.energyRegen || 0;
      pr.lvl = pr.lvl || 1; pr.desc = pr.desc || '';
    }

    DATA.gym = arr(DATA.gym);
    if (!DATA.gym.length) DATA.gym = fallbackGyms();
    for (var g = 0; g < DATA.gym.length; g++) {
      var gm = DATA.gym[g];
      gm.price = gm.price || 0; gm.lvl = gm.lvl || 1;
      gm.str = gm.str || 0; gm.def = gm.def || 0; gm.spd = gm.spd || 0; gm.dex = gm.dex || 0;
      gm.lab = gm.lab === undefined ? Math.max(0, (gm.dex || 0) * 0.7) : gm.lab;
      gm.desc = gm.desc || '';
    }
    DATA.gym.sort(function (a, b) { return a.price - b.price; });

    DATA.cities = arr(DATA.cities);
    if (!DATA.cities.length) DATA.cities = fallbackCities();
    for (var ci = 0; ci < DATA.cities.length; ci++) {
      var cy = DATA.cities[ci];
      cy.cost = cy.cost || 0; cy.flightMin = cy.flightMin || 10;
      cy.bonus = cy.bonus || { crime: 0, pay: 0 };
      cy.desc = cy.desc || '';
    }

    /* ---- flavour tables: never let a missing bank crash a render ---- */
    DATA.names = DATA.names || {};
    var nk = ['handles', 'firstNames', 'lastNames', 'signatures', 'bios', 'quotes', 'familyNames', 'familyTags', 'aimNames'];
    for (var k = 0; k < nk.length; k++) if (!arr(DATA.names[nk[k]]).length) DATA.names[nk[k]] = [nk[k] + '1', nk[k] + '2'];
    if (!arr(DATA.names.cities).length) DATA.names.cities = [{ name: 'Brooklyn, NY', hood: 'Bensonhurst' }];
    if (!arr(DATA.names.handles).length || DATA.names.handles.length < 260) {
      /* pad so 200 unique names is always possible */
      var base = DATA.names.handles.slice();
      var suffix = ['x', '_', '69', '88', '187', '2k7', 'xx', '01', '99', 'z'];
      for (var b = 0; base.length + b < 400; b++) {
        DATA.names.handles.push(base[b % base.length] + suffix[b % suffix.length] + (b > 40 ? b : ''));
      }
    }

    DATA.chat = DATA.chat || {};
    var ck = ['greeting', 'farewell', 'smalltalk', 'brag', 'trashtalk', 'revengeThreat', 'beg',
      'noobQuestion', 'vetAnswer', 'sell', 'buy', 'recruit', 'complainAdmin', 'accuseCheat',
      'drama', 'quitting', 'flirt', 'lolspam', 'hospitalWhine', 'jailWhine', 'congrats',
      'welcomeNewbie', 'afk', 'reactAttack', 'reactLadder', 'reactDeath', 'toPlayerFriendly',
      'toPlayerHostile', 'toPlayerRespect', 'toPlayerMocking', 'interjections'];
    for (var c2 = 0; c2 < ck.length; c2++) if (!arr(DATA.chat[ck[c2]]).length) DATA.chat[ck[c2]] = ['...'];

    DATA.news = DATA.news || {};
    var nwk = ['attackWin', 'attackLoss', 'mug', 'hospital', 'jail', 'bustOut', 'bustFail',
      'rankUp', 'ladderClimb', 'ladderFall', 'crimeWin', 'familyForm', 'familyJoin',
      'familyLeave', 'familyWar', 'bountyPlaced', 'bountyClaim', 'marketSale', 'bigPurchase',
      'death', 'login', 'logout', 'milestone', 'flavor'];
    var GENERIC = {
      attackWin: '{attacker} put {defender} on the ground.',
      attackLoss: '{defender} saw off an attack from {attacker}.',
      mug: '{attacker} took {amount} off {defender}.',
      hospital: '{defender} is in a hospital bed.',
      jail: '{who} got pinched.',
      bustOut: '{who} sprung {other}.',
      bustFail: '{who} got caught trying to spring {other}.',
      rankUp: '{who} is now a {rank}.',
      ladderClimb: '{who} took rung {n} off {other}.',
      ladderFall: '{who} came off the Attack Ladder.',
      crimeWin: '{who} pulled {amount} out of a job.',
      familyForm: '{who} founded {family}.',
      familyJoin: '{who} joined {family}.',
      familyLeave: '{who} walked out of {family}.',
      familyWar: '{family} declared war on {other}.',
      bountyPlaced: '{who} put {amount} on {other}.',
      bountyClaim: '{who} collected {amount} for {other}.',
      marketSale: '{who} bought a {item} for {amount}.',
      bigPurchase: '{who} bought {item}.',
      death: 'They found {who} in the river.',
      login: '{who} came online.',
      logout: '{who} logged off.',
      milestone: '{who} hit {n}.',
      flavor: 'Quiet night in {city}.'
    };
    for (var w = 0; w < nwk.length; w++) if (!arr(DATA.news[nwk[w]]).length) DATA.news[nwk[w]] = [GENERIC[nwk[w]]];

    DATA.mail = DATA.mail || {};
    var mk = ['threat', 'revenge', 'apology', 'familyInvite', 'tradeOffer', 'scam', 'newbieHelp',
      'friendly', 'bountyNotice', 'warDeclare', 'spam', 'respect', 'system', 'subjects'];
    for (var m = 0; m < mk.length; m++) {
      if (!arr(DATA.mail[mk[m]]).length) {
        DATA.mail[mk[m]] = mk[m] === 'subjects' ? ['(no subject)'] : [{ subj: 'hey', body: '...' }];
      }
    }

    DATA.forum = DATA.forum || {};
    if (!arr(DATA.forum.boards).length) {
      DATA.forum.boards = [
        { id: 'announce', name: 'Announcements', desc: 'Official word from the staff.' },
        { id: 'general', name: 'General Discussion', desc: 'Talk about anything exMafia.' },
        { id: 'newbie', name: 'New Player Help', desc: 'Ask your questions here. USE SEARCH FIRST.' },
        { id: 'market', name: 'Marketplace', desc: 'Buy, sell, trade.' },
        { id: 'families', name: 'Family Recruitment', desc: 'Looking for members?' },
        { id: 'flame', name: 'The Pit', desc: 'Take it here before you get modded.' },
        { id: 'offtopic', name: 'Off Topic', desc: 'Everything that is not this game.' }
      ];
    }
    if (!arr(DATA.forum.threads).length) DATA.forum.threads = [{ board: 'general', title: 'anyone here', op: 'is this thing on', replies: ['yeah', 'lol'] }];
    if (!arr(DATA.forum.stickies).length) DATA.forum.stickies = [{ board: 'announce', title: 'Rules', body: 'Do not spam. Do not scam. Do not multi.' }];
    if (!arr(DATA.forum.bumps).length) DATA.forum.bumps = ['bump', 'lol', 'this', '^', 'agreed'];
    if (!arr(DATA.forum.modNotes).length) DATA.forum.modNotes = ['Thread locked.'];
  }


  /* Best crime / job an account of this level would settle on. */
  function bestCrimeAt(L) {
    var out = null, list = DATA.crimes;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if ((c.lvl || 1) > L) continue;
      if (!out || (c.tier || 1) > (out.tier || 1) || ((c.tier || 1) === (out.tier || 1) && c.lvl > out.lvl)) out = c;
    }
    return out;
  }
  function bestJobAt(L) {
    var out = null, list = DATA.jobs;
    for (var i = 0; i < list.length; i++) {
      var j = list[i];
      if ((j.lvl || 1) > L) continue;
      if (!out || j.lvl > out.lvl) out = j;
    }
    return out;
  }

  /* What a player who checks in through the day earns in 24 hours. */
  function dailyXP(L) {
    var xp = 0;
    var c = bestCrimeAt(L);
    if (c) {
      var braveDay = 24 * 60 / 5;                       // 1 Brave every 5 minutes
      var crimes = braveDay / Math.max(1, c.brave || 1) * 0.85;
      xp += crimes * ((c.xp[0] + c.xp[1]) / 2) * 0.78;  // typical success rate
    }
    var j = bestJobAt(L);
    if (j) {
      var willDay = 24 * 60 / 12;
      var shifts = willDay / Math.max(1, j.will || j.energy || 1) * 0.7;
      xp += shifts * ((j.xp[0] + j.xp[1]) / 2);
    }
    /* attacks: Energy limited, 10 a swing, against roughly your own level */
    var energyDay = 24 * 60 / 3;
    var swings = Math.min(energyDay / 10 * 0.45, 24 * 60 / 20);
    xp += swings * Math.max(2, L * 3.4) * 0.55;
    return Math.max(20, xp);
  }

  /* How long a level ought to take. Minutes at the start, weeks at the top. */
  function daysForLevel(L) { return 0.05 + 0.00035 * Math.pow(L, 2.4); }

  function fitLevelCurve() {
    var table = [0], days = [0];
    var total = 0, d = 0;
    for (var L = 2; L <= 100; L++) {
      var dl = daysForLevel(L - 1);
      var gap = dailyXP(L - 1) * dl;
      /* round to something that reads like a game number */
      var mag = Math.pow(10, Math.max(0, Math.floor(Math.log(gap) / Math.LN10) - 2));
      gap = Math.max(40, Math.round(gap / mag) * mag);
      total += gap; d += dl;
      table.push(total); days.push(d);
    }
    DATA.levels.table = table;
    DATA.levels.days = days;        // committed play-days to reach each level
    DATA.levels.fitted = true;
  }

  /* Rank titles are spread across the whole level range so every one of
     them is reachable, weighted so the early promotions come quickly. */
  function fitRankCurve() {
    var r = DATA.ranks, n = r.length, t = DATA.levels.table;
    if (n < 2) return;
    for (var i = 0; i < n; i++) {
      var lvl = 1 + Math.round(99 * Math.pow(i / (n - 1), 1.25));
      r[i].xp = t[clamp(lvl, 1, 100) - 1];
      r[i].lvl = lvl;
    }
    /* keep it strictly increasing even if two ranks land on one level */
    for (var k = 1; k < n; k++) if (r[k].xp <= r[k - 1].xp) r[k].xp = r[k - 1].xp + 1;
  }

  /* ---- last-resort tables so the game always boots ---- */
  function fallbackItems() {
    var out = [], cats = [['melee', 4, 0], ['pistol', 9, 0], ['smg', 16, 0], ['rifle', 26, 0], ['heavy', 40, 0], ['armor', 0, 8]];
    for (var c = 0; c < cats.length; c++) {
      for (var i = 1; i <= 8; i++) {
        out.push({
          id: cats[c][0] + i, name: cats[c][0].toUpperCase() + ' Mk' + i, cat: cats[c][0],
          lvl: i * 4, price: Math.round(200 * Math.pow(3.1, i)),
          atk: cats[c][1] * i, def: cats[c][2] * i, acc: 0.95 - c * 0.04, stock: true,
          desc: 'Standard issue.'
        });
      }
    }
    out.push({ id: 'bandage', name: 'Bandage', cat: 'medical', lvl: 1, price: 400, heal: 20, stock: true, desc: 'Better than nothing.' });
    out.push({ id: 'firstaid', name: 'First Aid Kit', cat: 'medical', lvl: 5, price: 4000, heal: 60, stock: true, desc: 'Green box, white cross.' });
    out.push({ id: 'coffee', name: 'Cup of Coffee', cat: 'booster', lvl: 1, price: 250, effect: { stat: 'energy', amount: 15 }, stock: true, desc: 'Three sugars.' });
    out.push({ id: 'toothpick', name: 'Chewed Toothpick', cat: 'drop', lvl: 1, price: 3, stock: false, desc: 'Somebody else had this in their mouth.' });
    return out;
  }
  function fallbackProps() {
    return [
      { id: 'room', name: 'Rented Room Above the Deli', kind: 'home', lvl: 1, price: 5000, upkeep: 60, income: 0, hp: 25, energyRegen: 2, desc: 'It smells like provolone. Always.' },
      { id: 'walkup', name: 'Brownstone Walk-Up', kind: 'home', lvl: 12, price: 480000, upkeep: 2600, income: 0, hp: 220, energyRegen: 10, desc: 'Four floors, no elevator, good neighbours.' },
      { id: 'newsstand', name: 'Newsstand', kind: 'biz', lvl: 5, price: 25000, upkeep: 240, income: 140, hp: 0, energyRegen: 0, desc: 'Papers on top, numbers underneath.' },
      { id: 'laundry', name: 'Laundromat', kind: 'biz', lvl: 18, price: 900000, upkeep: 7000, income: 5200, hp: 0, energyRegen: 0, desc: 'Money goes in dirty and comes out clean. Literally.' }
    ];
  }
  function fallbackGyms() {
    return [
      { id: 'ymca', name: 'The Old YMCA', lvl: 1, price: 0, str: 1, def: 1, spd: 1, dex: 1, lab: 1, desc: 'Free, and worth every penny.' },
      { id: 'boxing', name: "Sal's Boxing Club", lvl: 8, price: 60000, str: 2.4, def: 1.2, spd: 2.1, dex: 0.9, lab: 0.6, desc: 'Heavy bags and a hard old man shouting.' },
      { id: 'iron', name: 'Iron House', lvl: 20, price: 2400000, str: 3.6, def: 3.2, spd: 1.4, dex: 1.4, lab: 1.2, desc: 'Chalk, rust and no mirrors.' }
    ];
  }
  function fallbackCities() {
    return [
      { id: 'newyork', name: 'New York', country: 'USA', cost: 0, flightMin: 0, desc: 'Home.', bonus: { crime: 0, pay: 0 }, exclusive: [] },
      { id: 'chicago', name: 'Chicago', country: 'USA', cost: 22000, flightMin: 18, desc: 'Windy, and everybody is somebody\'s cousin.', bonus: { crime: 0.03, pay: 0.06 }, exclusive: [] },
      { id: 'sicily', name: 'Sicily', country: 'Italy', cost: 240000, flightMin: 55, desc: 'Where it started.', bonus: { crime: 0.06, pay: 0.18 }, exclusive: [] }
    ];
  }

  return { run: run };
})();
