/* ============================================================
   42-city.js :: the rest of the city
   Streets, Truck Stop, Downtown Fence, Casino, Lottery, Stock
   Market, and the offices of Dewey, Screwem and Howe.
   ============================================================ */

/* ---- Walking the streets -----------------------------------------
   "When you walk around, both good and bad things can happen to you.
    You may find a new gun or a dead body, find more attacks or get
    hit by a car, find points or lose them."
-------------------------------------------------------------------- */
GAME.streets = (function () {
  var COST = 4;

  var NOTHING = [
    'You walk six blocks and see nothing but a cat going through a garbage bag.',
    'Nothing doing. A guy asks you for a light and that is the whole evening.',
    'You do a lap of the block. Quiet. Too quiet, but quiet.',
    'Some kid on a bike nearly takes your knee off. That is it.',
    'You stand outside the pizzeria for twenty minutes. Nobody comes, nobody goes.',
    'You walk. It rains. You walk back.',
    'A patrol car crawls past and slows down. You keep walking and so do they.',
    'You find a payphone that still works. Nobody to call.'
  ];

  function walk() {
    var p = S.player;
    var b = GAME.player.blocked();
    if (b) return { err: 'You cannot go anywhere right now.' };
    if (p.energy < COST) return { err: 'Walking the streets takes ' + COST + ' Energy.' };
    p.energy -= COST;
    p.st.walks = (p.st.walks || 0) + 1;

    var r = rnd();
    var out;

    if (r < 0.22) {
      var cash = Math.round(rint(15, 260) * (1 + p.level * 0.55) * rflt(0.6, 1.6));
      GAME.player.pay(cash);
      out = { kind: 'cash', text: pick([
        'A roll of bills in a gutter, still dry. ' + money(cash) + '.',
        'You find a wallet behind a dumpster. The cards are useless. The ' + money(cash) + ' is not.',
        'Somebody dropped an envelope outside the check cashing place. ' + money(cash) + '.',
        'A drunk hands you ' + money(cash) + ' and calls you Sal. You do not correct him.'
      ]), cash: cash };
    } else if (r < 0.30) {
      var pts = rint(2, 12);
      GAME.points.give(pts);
      p.st.finds = (p.st.finds || 0) + 1;
      out = { kind: 'points', text: 'You find ' + pts + ' points in a jacket somebody left on a bench.', points: pts };
    } else if (r < 0.345) {
      var lost = Math.min(GAME.points.have(), rint(2, 15));
      if (lost > 0) { S.player.points -= lost; out = { kind: 'badpoints', text: 'A kid on a bike snatches your jacket off the bench. ' + lost + ' points gone.', points: -lost }; }
      else out = { kind: 'none', text: pick(NOTHING) };
    } else if (r < 0.40) {
      p.attacks += 1;
      out = { kind: 'attacks', text: 'You catch your second wind coming out of the subway. One extra attack.' };
    } else if (r < 0.475) {
      var pool = GAME.items.all().filter(function (i) { return (i.cat === 'pistol' || i.cat === 'melee' || i.cat === 'drop') && i.lvl <= p.level + 4; });
      if (pool.length) {
        var it = pick(pool);
        GAME.items.add(it.id, 1);
        out = { kind: 'item', text: pick([
          'There is a ' + it.name + ' taped under a bench. Finders keepers.',
          'Somebody threw a ' + it.name + ' in the storm drain. You fish it out.',
          'A ' + it.name + ' in a paper bag, left on a stoop. You take the bag.'
        ]), item: it };
      } else out = { kind: 'none', text: pick(NOTHING) };
    } else if (r < 0.52) {
      var dmg = Math.round(maxHealth(p) * rflt(0.08, 0.30));
      p.health = Math.max(1, p.health - dmg);
      out = { kind: 'hurt', text: pick([
        'A gypsy cab clips you crossing Third. You lose ' + fmt(dmg) + ' health and the driver does not stop.',
        'Two kids jump you for your shoes. You keep the shoes. You lose ' + fmt(dmg) + ' health.',
        'You go down a fire escape you should not have. ' + fmt(dmg) + ' health.'
      ]), dmg: dmg };
    } else if (r < 0.555) {
      var secs = rint(90, 700);
      GAME.player.jail(secs * 1000, 'Loitering with intent. The officer did not like your face.', p.level * 2000);
      out = { kind: 'jail', text: 'A cruiser pulls up. Loitering with intent, they call it. ' + Math.round(secs / 60) + ' minutes in the cells.', secs: secs };
    } else if (r < 0.585) {
      var hosp = rint(3, 16) * MIN;
      GAME.player.hospitalize(hosp, 'You picked the wrong alley.');
      out = { kind: 'hospital', text: 'Three of them come out of the alley behind the laundromat. You wake up at St. Anthony\'s.', hosp: hosp };
    } else if (r < 0.615) {
      out = { kind: 'body', text: pick([
        'There is a body behind the dumpster on Kent. You did not see anything.',
        'A pair of shoes sticking out from under a tarp on the pier. You keep walking.',
        'Somebody is face down in the fountain. Somebody else\'s problem.'
      ]) };
      GAME.feed.newsFrom('death', 'flavor', { city: p.city, who: pick(S.npcs).name });
    } else if (r < 0.65) {
      var xp = rint(2, 12);
      GAME.progress.gainXP(xp);
      out = { kind: 'xp', text: 'You spend an hour listening to the old men outside the social club. You learn something. +' + xp + ' xp.', xp: xp };
    } else if (r < 0.68) {
      var who = pick(GAME.sim.onlineList().length ? GAME.sim.onlineList() : S.npcs);
      if (who) {
        who.op += 4;
        GAME.npc.remember(who, 'mailed_by_player', {});
        out = { kind: 'meet', text: 'You run into ' + who.name + ' outside the bar. You talk for a while. They seem to like you.', who: who };
      } else out = { kind: 'none', text: pick(NOTHING) };
    } else {
      out = { kind: 'none', text: pick(NOTHING) };
    }

    GAME.feed.log('street', out.text);
    return out;
  }

  return { walk: walk, COST: COST };
})();


/* ---- Truck Stop -> Downtown Fence --------------------------------
   The confirmed Dexterity sink, and the one thing in exMafia with no
   analogue anywhere else. You buy a concealed handgun, a docking yard
   day pass and a box of ammo, run a truck for Dexterity, and carry the
   goods downtown. The fence will not talk to you under twenty-five
   units, which is the whole shape of it: several runs, then a payday.
-------------------------------------------------------------------- */
GAME.fence = (function () {

  var KIT = [
    { id: 'handgun', name: 'Concealed Handgun', price: 1200, once: true, desc: 'You will not use it. You will not get in the yard without it.' },
    { id: 'daypass', name: 'Docking Yard Day Pass', price: 350, once: true, desc: 'A laminated square of nothing that opens a gate.' },
    { id: 'ammo', name: 'Box of Ammo', price: 90, once: false, desc: 'One box a run. Nobody checks. Everybody carries.' }
  ];

  var BANDS = [
    { lo: 1, hi: 9, job: 'Beer truck', dex: 4, units: [1, 3], value: 22 },
    { lo: 10, hi: 24, job: 'Cigarette load', dex: 5, units: [2, 4], value: 145 },
    { lo: 25, hi: 44, job: 'Appliance trailer', dex: 6, units: [2, 5], value: 900 },
    { lo: 45, hi: 64, job: 'Electronics container', dex: 7, units: [3, 6], value: 6200 },
    { lo: 65, hi: 999, job: 'Pharmaceutical reefer', dex: 8, units: [3, 7], value: 41000 }
  ];

  var MIN_LOAD = 25;

  function kit() { return KIT; }
  function bands() { return BANDS; }
  function band(level) {
    for (var i = 0; i < BANDS.length; i++) if (level >= BANDS[i].lo && level <= BANDS[i].hi) return BANDS[i];
    return BANDS[0];
  }
  function have(id) { return !!(S.player.truckKit && S.player.truckKit[id]); }
  function ammo() { return (S.player.truckKit && S.player.truckKit.ammo) || 0; }
  function ready() { return have('handgun') && have('daypass') && ammo() > 0; }
  function units() { return S.player.goodsUnits || 0; }

  function buyKit(id, qty) {
    var p = S.player, it = null;
    for (var i = 0; i < KIT.length; i++) if (KIT[i].id === id) it = KIT[i];
    if (!it) return { err: 'They do not sell that.' };
    qty = it.once ? 1 : Math.max(1, Math.floor(qty || 1));
    if (it.once && have(id)) return { err: 'You already have one.' };
    var cost = it.price * qty;
    if (p.money < cost) return { err: 'That is ' + money(cost) + '.' };
    GAME.player.spend(cost);
    p.truckKit = p.truckKit || {};
    p.truckKit[id] = (p.truckKit[id] || 0) + qty;
    return { ok: true, name: it.name, qty: qty, cost: cost };
  }

  function run() {
    var p = S.player;
    var b = GAME.player.blocked();
    if (b) return { err: 'You cannot get out to the yard right now.' };
    if (!have('handgun')) return { err: 'They will not let you near a trailer without a concealed handgun.' };
    if (!have('daypass')) return { err: 'You need a docking yard day pass.' };
    if (ammo() < 1) return { err: 'Out of ammo. Buy a box.' };
    var bd = band(p.level);
    if ((p.dexg || 0) < bd.dex) return { err: 'A ' + bd.job.toLowerCase() + ' takes ' + bd.dex + ' Dexterity. You have ' + Math.floor(p.dexg || 0) + '.' };

    p.dexg -= bd.dex;
    p.truckKit.ammo -= 1;
    if (p.truckKit.ammo <= 0) delete p.truckKit.ammo;

    var got = rint(bd.units[0], bd.units[1]) + Math.min(3, Math.floor((p.lab || 10) / 250));
    p.goodsUnits = units() + got;
    p.st.runs = (p.st.runs || 0) + 1;
    p.lab = Math.round((p.lab + 0.2) * 100) / 100;
    GAME.progress.gainXP(Math.max(1, Math.round(got * 0.8)));
    GAME.feed.log('fence', bd.job + ': ' + got + ' units off the back. ' + p.goodsUnits + ' in the lockup.');
    return { ok: true, got: got, total: p.goodsUnits, job: bd.job, band: bd };
  }

  /* The fence pays better the smarter you are, and he does not do
     business under twenty-five units unless you want sixty cents on
     the dollar to get rid of them. */
  function rate() { return 1 + Math.min(0.25, Math.log(1 + (S.player.iq || 10)) / Math.LN10 * 0.09); }
  function quote(dump) {
    var p = S.player, bd = band(p.level);
    var u = units();
    var gross = u * bd.value * rate();
    return Math.round(dump ? gross * 0.6 : gross);
  }

  function sell(dump) {
    var p = S.player, u = units();
    if (!u) return { err: 'You are not carrying anything.' };
    if (!dump && u < MIN_LOAD) return { err: 'He will not open the shutter for less than ' + MIN_LOAD + ' units. You have ' + u + '.' };
    var got = quote(dump);
    p.goodsUnits = 0;
    GAME.player.pay(got);
    p.st.fenceRuns = (p.st.fenceRuns || 0) + 1;
    GAME.progress.gainXP(Math.max(1, Math.round(got / 6000)));
    GAME.feed.log('fence', 'Moved ' + u + ' units for ' + money(got) + (dump ? ' (dumped at sixty cents).' : '.'));
    if (got > 400000 && chance(0.4)) GAME.feed.newsFrom('marketSale', 'money', { who: p.name, amount: money(got), item: band(p.level).job.toLowerCase(), city: p.city });
    return { ok: true, units: u, got: got, dumped: !!dump };
  }

  return { kit: kit, bands: bands, band: band, have: have, ammo: ammo, ready: ready,
           units: units, buyKit: buyKit, run: run, sell: sell, quote: quote, rate: rate, MIN_LOAD: MIN_LOAD };
})();


/* ---- The local schools -------------------------------------------
   "The more expensive the class, the longer the class, and the more
   stats you receive when the class is over." IQ's main faucet, and the
   one stat the gym will not sell you.
-------------------------------------------------------------------- */
GAME.school = (function () {
  var CLASSES = [
    { id: 'nightschool', name: 'Night School Basics', price: 500, hours: 6, iq: 25, lab: 0, desc: 'Two evenings a week in a room that smells of floor polish.' },
    { id: 'bookkeeping', name: 'Bookkeeping', price: 4000, hours: 18, iq: 80, lab: 0, desc: 'Two sets of books, and how to keep them apart.' },
    { id: 'busadmin', name: 'Business Administration', price: 22000, hours: 48, iq: 220, lab: 150, desc: 'Legitimate business is a costume. Learn to wear it.' },
    { id: 'crimlaw', name: 'Criminal Law', price: 120000, hours: 96, iq: 500, lab: 0, desc: 'Not to practise. To know what they can and cannot prove.' },
    { id: 'forensic', name: 'Forensic Accounting', price: 850000, hours: 168, iq: 1200, lab: 400, desc: 'How they find it, so you know where not to put it.' },
    { id: 'doctorate', name: 'Doctorate in Finance', price: 6000000, hours: 336, iq: 3000, lab: 0, desc: 'Nobody in this city will ever call you doctor. You will know.' }
  ];
  function list() { return CLASSES; }
  function get(id) { for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i].id === id) return CLASSES[i]; return null; }
  function current() {
    var s = S.player.school;
    if (!s) return null;
    var c = get(s.id);
    return c ? { cls: c, until: s.until, done: NOW() >= s.until } : null;
  }
  function enrol(id) {
    var c = get(id), p = S.player;
    if (!c) return { err: 'No such class.' };
    if (p.school) return { err: 'You are already enrolled in something.' };
    if (GAME.player.inJail()) return { err: 'They do not run classes in the cells.' };
    if (p.money < c.price) return { err: 'That class is ' + money(c.price) + '.' };
    GAME.player.spend(c.price);
    p.school = { id: id, until: NOW() + c.hours * HOUR };
    GAME.feed.log('school', 'Enrolled in ' + c.name + '. ' + c.hours + ' hours.');
    return { ok: true, name: c.name, hours: c.hours };
  }
  function collect() {
    var cur = current(), p = S.player;
    if (!cur) return { err: 'You are not enrolled.' };
    if (!cur.done) return { err: 'The course runs for another ' + clock(cur.until - NOW()) + '.' };
    p.iq = Math.round((p.iq + cur.cls.iq) * 100) / 100;
    if (cur.cls.lab) p.lab = Math.round((p.lab + cur.cls.lab) * 100) / 100;
    p.school = null;
    p.st.classes = (p.st.classes || 0) + 1;
    GAME.progress.gainXP(Math.round(cur.cls.iq * 0.6));
    GAME.feed.log('school', 'Graduated ' + cur.cls.name + '. +' + cur.cls.iq + ' IQ' + (cur.cls.lab ? ', +' + cur.cls.lab + ' Labour' : '') + '.');
    return { ok: true, iq: cur.cls.iq, lab: cur.cls.lab, name: cur.cls.name };
  }
  return { list: list, get: get, current: current, enrol: enrol, collect: collect };
})();


/* ---- Casino, Lottery, Stock Market -------------------------------- */
GAME.casino = (function () {

  function bet(n) {
    n = Math.floor(n);
    if (!(n > 0)) return 'Put something on the table.';
    if (S.player.money < n) return 'You are not carrying that.';
    return null;
  }

  function slots(n) {
    var e = bet(n); if (e) return { err: e };
    GAME.player.spend(n);
    S.player.st.gambled += n;
    var REELS = ['7', 'BAR', 'CHERRY', 'BELL', 'PLUM', 'LEMON', 'HORSESHOE'];
    var a = pick(REELS), b = pick(REELS), c = pick(REELS);
    var win = 0;
    if (a === b && b === c) win = n * (a === '7' ? 60 : a === 'BAR' ? 25 : 12);
    else if (a === b || b === c || a === c) win = Math.round(n * 1.6);
    if (win) { GAME.player.pay(win); S.player.st.gambleWon += win; }
    return { ok: true, reels: [a, b, c], win: win, stake: n };
  }

  function roulette(n, choice) {
    var e = bet(n); if (e) return { err: e };
    GAME.player.spend(n);
    S.player.st.gambled += n;
    var num = rint(0, 36);
    var red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    var isRed = red.indexOf(num) >= 0;
    var win = 0;
    if (choice === 'red' && isRed) win = n * 2;
    else if (choice === 'black' && num !== 0 && !isRed) win = n * 2;
    else if (choice === 'odd' && num % 2 === 1) win = n * 2;
    else if (choice === 'even' && num !== 0 && num % 2 === 0) win = n * 2;
    else if (choice === 'green' && num === 0) win = n * 36;
    if (win) { GAME.player.pay(win); S.player.st.gambleWon += win; }
    return { ok: true, num: num, red: isRed, win: win, stake: n, choice: choice };
  }

  function highlow(n, guess) {
    var e = bet(n); if (e) return { err: e };
    GAME.player.spend(n);
    S.player.st.gambled += n;
    var card = rint(1, 13), next = rint(1, 13);
    var win = 0;
    if ((guess === 'high' && next > card) || (guess === 'low' && next < card)) win = Math.round(n * 1.9);
    else if (next === card) win = n;
    if (win) { GAME.player.pay(win); S.player.st.gambleWon += win; }
    return { ok: true, card: card, next: next, win: win, stake: n, guess: guess };
  }

  return { slots: slots, roulette: roulette, highlow: highlow };
})();


GAME.lottery = (function () {
  function week() { return Math.floor(NOW() / (7 * DAY)); }
  function state() {
    if (!S.lotto || S.lotto.week !== week()) {
      S.lotto = { week: week(), tickets: [], pot: rint(400000, 4500000) };
    }
    return S.lotto;
  }
  function price() { return 5000 + S.player.level * 500; }
  function buy(n) {
    var st = state(), p = S.player;
    n = Math.max(1, Math.floor(n || 1));
    var cost = price() * n;
    if (p.money < cost) return { err: 'Tickets are ' + money(price()) + ' each.' };
    GAME.player.spend(cost);
    st.pot += Math.round(cost * 0.6);
    for (var i = 0; i < n; i++) st.tickets.push([rint(1, 49), rint(1, 49), rint(1, 49), rint(1, 49), rint(1, 49), rint(1, 49)]);
    return { ok: true, n: n, cost: cost };
  }
  function draw() {
    var st = state();
    if (st.drawn) return { err: 'This week is already drawn. Come back next week.' };
    var nums = [rint(1, 49), rint(1, 49), rint(1, 49), rint(1, 49), rint(1, 49), rint(1, 49)];
    var best = 0;
    for (var i = 0; i < st.tickets.length; i++) {
      var m = 0;
      for (var j = 0; j < 6; j++) if (nums.indexOf(st.tickets[i][j]) >= 0) m++;
      if (m > best) best = m;
    }
    var prize = best >= 6 ? st.pot : best === 5 ? Math.round(st.pot * 0.08) : best === 4 ? Math.round(st.pot * 0.01) : best === 3 ? 25000 : 0;
    if (prize) {
      GAME.player.pay(prize);
      GAME.feed.newsFrom('milestone', 'money', { who: S.player.name, n: best, amount: money(prize), city: S.player.city });
    }
    st.drawn = true; st.nums = nums; st.best = best; st.prize = prize;
    return { ok: true, nums: nums, best: best, prize: prize };
  }
  return { state: state, price: price, buy: buy, draw: draw };
})();


GAME.stocks = (function () {
  var LIST = [
    { id: 'CNL', name: 'Canoli Bros. Bakeries', base: 42 },
    { id: 'DOK', name: 'Eastside Dockworks', base: 118 },
    { id: 'LNS', name: 'Lansky Holdings', base: 640 },
    { id: 'TRW', name: 'Trawler Fisheries', base: 27 },
    { id: 'CMT', name: 'Cement & Aggregate Co.', base: 210 },
    { id: 'VGS', name: 'Desert Star Resorts', base: 385 },
    { id: 'WST', name: 'Municipal Waste Services', base: 96 },
    { id: 'UNI', name: 'Local 402 Pension Fund', base: 1490 }
  ];
  function hour() { return Math.floor(NOW() / HOUR); }
  function price(s) {
    var h = hour();
    var drift = 0;
    for (var i = 0; i < 6; i++) drift += (seededFloat(s.id, 'h' + (h - i)) - 0.5);
    return Math.max(1, Math.round(s.base * (1 + drift * 0.22) * 100) / 100);
  }
  function prev(s) {
    var h = hour() - 1, drift = 0;
    for (var i = 0; i < 6; i++) drift += (seededFloat(s.id, 'h' + (h - i)) - 0.5);
    return Math.max(1, Math.round(s.base * (1 + drift * 0.22) * 100) / 100);
  }
  function list() { return LIST; }
  function get(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i]; return null; }
  function held() { return S.stocks || (S.stocks = {}); }
  function buy(id, qty) {
    var s = get(id), p = S.player;
    if (!s) return { err: 'No such listing.' };
    qty = Math.max(1, Math.floor(qty || 1));
    var cost = Math.round(price(s) * qty);
    if (p.money < cost) return { err: 'That is ' + money(cost) + '.' };
    GAME.player.spend(cost);
    var h = held();
    var cur = h[id] || { qty: 0, avg: 0 };
    cur.avg = (cur.avg * cur.qty + cost) / (cur.qty + qty);
    cur.qty += qty;
    h[id] = cur;
    return { ok: true, qty: qty, cost: cost };
  }
  function sell(id, qty) {
    var s = get(id), h = held();
    if (!s || !h[id]) return { err: 'You hold none.' };
    qty = Math.max(1, Math.min(Math.floor(qty || 1), h[id].qty));
    var got = Math.round(price(s) * qty);
    var profit = got - Math.round(h[id].avg * qty);
    h[id].qty -= qty;
    if (h[id].qty <= 0) delete h[id];
    GAME.player.pay(got);
    return { ok: true, qty: qty, got: got, profit: profit };
  }
  return { list: list, get: get, price: price, prev: prev, held: held, buy: buy, sell: sell };
})();


/* ---- Dewey, Screwem and Howe -------------------------------------- */
GAME.lawyer = (function () {
  function quote() {
    var p = S.player;
    var jailLeft = Math.max(0, p.jailUntil - NOW());
    var hospLeft = Math.max(0, p.hospUntil - NOW());
    return {
      /* $2,500 to walk in the door, $180 a minute after that */
      jail: 2500 + Math.round(jailLeft / MIN * 180),
      hosp: Math.round(hospLeft / 1000 * 34 * (1 + p.level * 0.16)),
      jailLeft: jailLeft, hospLeft: hospLeft,
      retainer: 100000 + p.level * 9000
    };
  }
  /* One in five he gets it thrown out entirely. The rest of the time he
     shaves half the sentence off and sends the bill either way. */
  function springJail() {
    var q = quote(), p = S.player;
    if (!q.jailLeft) return { err: 'You are not in jail.' };
    if (p.money < q.jail) return { err: 'Dewey wants ' + money(q.jail) + ' up front.' };
    GAME.player.spend(q.jail);
    if (chance(0.20)) {
      p.jailUntil = 0;
      GAME.feed.log('jail', 'Charges dropped. Dewey did not even sit down. ' + money(q.jail) + '.');
      return { ok: true, paid: q.jail, dropped: true };
    }
    var cut = rflt(0.4, 0.7);
    p.jailUntil = NOW() + Math.round(q.jailLeft * (1 - cut));
    GAME.feed.log('jail', 'Dewey got ' + Math.round(cut * 100) + '% knocked off. ' + money(q.jail) + '.');
    return { ok: true, paid: q.jail, cut: Math.round(cut * 100) };
  }
  function springHosp() {
    var q = quote(), p = S.player;
    if (!q.hospLeft) return { err: 'You are not in a hospital bed.' };
    if (p.money < q.hosp) return { err: 'The bill is ' + money(q.hosp) + '.' };
    GAME.player.spend(q.hosp);
    p.hospUntil = 0; p.health = maxHealth(p); p.regen.health = NOW();
    return { ok: true, paid: q.hosp };
  }
  function retain() {
    var q = quote(), p = S.player;
    if (p.retainerUntil > NOW()) return { err: 'Howe is already on retainer.' };
    if (p.money < q.retainer) return { err: 'The retainer is ' + money(q.retainer) + '.' };
    GAME.player.spend(q.retainer);
    p.retainerUntil = NOW() + 24 * HOUR;
    GAME.feed.log('law', 'You put Howe on retainer for 24 hours. Jail terms cut in half.');
    return { ok: true };
  }
  function onRetainer() { return (S.player.retainerUntil || 0) > NOW(); }
  return { quote: quote, springJail: springJail, springHosp: springHosp, retain: retain, onRetainer: onRetainer };
})();
