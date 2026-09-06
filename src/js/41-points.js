/* ============================================================
   41-points.js :: the points economy
   Points are the premium currency. The Attack Ladder drips 10 an
   hour, voting gives 5-10 a pop up to 80 a day, and the Trade
   Point menu turns them into refills, attacks and IQ. Players buy
   and sell them to each other on the Point Market.
   ============================================================ */

GAME.points = (function () {

  var COSTS = {
    energy: 30,     // full Energy refill
    brave: 25,      // full Brave refill
    will: 20,       // full Will refill
    attack: 12,     // one extra attack
    iq: 8,          // one IQ
    hospital: 40,   // walk out of the hospital
    jail: 45        // walk out of the cells
  };

  function have() { return S.player.points || 0; }
  function take(n) {
    if (have() < n) return false;
    S.player.points -= n;
    return true;
  }
  function give(n, why) {
    S.player.points = (S.player.points || 0) + n;
    S.player.st.pointsEarned = (S.player.st.pointsEarned || 0) + n;
    if (why) GAME.feed.log('points', '+' + n + ' points. ' + why);
    return n;
  }

  /* The order rule is straight out of the game's own advice:
     "you must refill your will before your energy, since doing it the
      other way around will wipe out your energy in the process." */
  function refill(which) {
    var p = S.player, c = COSTS[which];
    if (!c) return { err: 'Cannot buy that.' };
    if (!take(c)) return { err: 'That costs ' + c + ' points. You have ' + have() + '.' };
    if (which === 'energy') { p.energy = p.energyMax; p.regen.energy = NOW(); }
    else if (which === 'brave') { p.nerve = p.nerveMax; p.regen.nerve = NOW(); }
    else if (which === 'will') {
      p.will = p.willMax; p.regen.will = NOW();
      /* the quirk the veterans warned newbies about */
      p.energy = 0; p.regen.energy = NOW();
      return { ok: true, which: which, paid: c, warned: true };
    }
    return { ok: true, which: which, paid: c };
  }

  function buyAttack(n) {
    n = Math.max(1, Math.floor(n || 1));
    var cost = COSTS.attack * n;
    if (!take(cost)) return { err: cost + ' points for ' + n + '. You have ' + have() + '.' };
    S.player.attacks += n;
    return { ok: true, n: n, paid: cost };
  }

  function buyIQ(n) {
    n = Math.max(1, Math.floor(n || 1));
    var cost = COSTS.iq * n;
    if (!take(cost)) return { err: cost + ' points for ' + n + ' IQ.' };
    S.player.iq = (S.player.iq || 10) + n;
    return { ok: true, n: n, paid: cost };
  }

  function springHospital() {
    var p = S.player;
    if (p.hospUntil <= NOW()) return { err: 'You are not in hospital.' };
    if (!take(COSTS.hospital)) return { err: COSTS.hospital + ' points to check out early.' };
    p.hospUntil = 0; p.health = maxHealth(p); p.regen.health = NOW();
    return { ok: true };
  }
  function springJail() {
    var p = S.player;
    if (p.jailUntil <= NOW()) return { err: 'You are not in jail.' };
    if (!take(COSTS.jail)) return { err: COSTS.jail + ' points to make this go away.' };
    p.jailUntil = 0;
    return { ok: true };
  }

  /* ---- voting: 5-10 points a click, capped at 80 a day ---- */
  var VOTE_SITES = [
    'TopMafiaGames', 'BrowserGame100', 'RPG-Top500', 'Gamesites200', 'MPOGD',
    'TextGameList', 'ArcadeTop50', 'TheMobRanks'
  ];
  function voteDay() { return Math.floor(NOW() / DAY); }
  function votesLeft() {
    var p = S.player;
    if (p.voteDay !== voteDay()) return 80;
    return Math.max(0, 80 - (p.votesToday || 0));
  }
  function vote(site) {
    var p = S.player;
    if (p.voteDay !== voteDay()) { p.voteDay = voteDay(); p.votesToday = 0; }
    if (p.votesToday >= 80) return { err: 'You have taken all 80 points you can get from voting today.' };
    var got = Math.min(rint(5, 10), 80 - p.votesToday);
    p.votesToday += got;
    give(got, 'Voted on ' + site + '.');
    return { ok: true, got: got, left: 80 - p.votesToday, site: site };
  }
  function sites() { return VOTE_SITES; }

  /* ---- the player run point market ---- */
  function market() { return S.pointMarket || (S.pointMarket = []); }
  function seedMarket(now) {
    S.pointMarket = [];
    for (var i = 0; i < rint(8, 16); i++) {
      var seller = pick(S.npcs);
      market().push({
        id: i + 1, seller: seller.id, sellerName: seller.name,
        qty: rint(20, 900),
        price: Math.round(rflt(900, 4200) * (1.1 - seller.p.greed * 0.25)),
        t: now - rflt(0, 2) * DAY
      });
    }
    S.nextPtId = market().length + 1;
  }
  function buyPoints(listingId, qty) {
    var m = market(), p = S.player;
    for (var i = 0; i < m.length; i++) {
      if (m[i].id !== listingId) continue;
      var row = m[i];
      qty = Math.max(1, Math.min(qty || row.qty, row.qty));
      var cost = row.price * qty;
      if (p.money < cost) return { err: 'That is ' + money(cost) + '.' };
      GAME.player.spend(cost);
      give(qty);
      row.qty -= qty;
      var s = byId(row.seller);
      if (s && s.id !== 0) s.money += cost;
      if (row.qty <= 0) m.splice(i, 1);
      return { ok: true, qty: qty, cost: cost };
    }
    return { err: 'Gone. Somebody was faster.' };
  }
  function sellPoints(qty, price) {
    var p = S.player;
    qty = Math.max(1, Math.floor(qty || 0));
    price = Math.max(1, Math.floor(price || 0));
    if (have() < qty) return { err: 'You do not have that many points.' };
    p.points -= qty;
    market().push({ id: S.nextPtId++, seller: 0, sellerName: p.name, qty: qty, price: price, t: NOW() });
    return { ok: true };
  }
  function tickMarket(now) {
    var m = market();
    /* somebody buys the player's points if the price is sane */
    for (var i = m.length - 1; i >= 0; i--) {
      var row = m[i];
      if (row.seller !== 0) {
        if (chance(0.02)) { m.splice(i, 1); }
        continue;
      }
      if (row.price < 3200 && chance(0.06)) {
        var take = Math.min(row.qty, rint(10, 200));
        var buyer = pick(S.npcs);
        if (buyer && buyer.money > row.price * take) {
          buyer.money -= row.price * take;
          S.player.money += row.price * take;
          S.player.st.earned += row.price * take;
          row.qty -= take;
          GAME.mail.system('pointsSold', { n: take, amount: money(row.price * take), who: buyer.name });
          if (row.qty <= 0) m.splice(i, 1);
        }
      }
    }
    if (m.length < 18 && chance(0.05)) {
      var s2 = pick(S.npcs);
      m.push({ id: S.nextPtId++, seller: s2.id, sellerName: s2.name, qty: rint(20, 900), price: Math.round(rflt(900, 4200)), t: now });
    }
  }

  /* ---- the Point Gym: train with points instead of energy ---- */
  function pointTrain(stat, n) {
    var p = S.player;
    n = Math.max(1, Math.floor(n || 1));
    var cost = 6 * n;
    if (!take(cost)) return { err: cost + ' points for ' + n + ' sets.' };
    var cur = p[stat] || 10;
    var gain = 0;
    for (var i = 0; i < n; i++) {
      var per = 5.2 * (1.6 / (1 + Math.pow((cur + gain) / 240, 0.82)));
      gain += per;
    }
    p[stat] = Math.round((cur + gain) * 100) / 100;
    return { ok: true, gain: gain, stat: stat, paid: cost };
  }

  return {
    COSTS: COSTS, have: have, take: take, give: give, refill: refill,
    buyAttack: buyAttack, buyIQ: buyIQ, springHospital: springHospital, springJail: springJail,
    vote: vote, votesLeft: votesLeft, sites: sites,
    market: market, seedMarket: seedMarket, buyPoints: buyPoints, sellPoints: sellPoints,
    tickMarket: tickMarket, pointTrain: pointTrain
  };
})();
