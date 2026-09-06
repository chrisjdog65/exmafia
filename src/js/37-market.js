/* ============================================================
   37-market.js :: the player run market
   NPCs list gear and buy from the board on their own schedule, so
   prices drift and good deals get sniped whether you are looking
   or not.
   ============================================================ */

GAME.market = (function () {

  function fair(it) {
    var base = it.price || 100;
    if (!it.stock) base = Math.max(50, (it.atk || 0) * 900 + (it.def || 0) * 850 + base);
    return base;
  }

  function listings() { return S.market || (S.market = []); }

  function seed(now) {
    S.market = [];
    var pool = GAME.items.all().filter(function (i) { return i.cat !== 'trophy'; });
    var n = rint(28, 46);
    for (var i = 0; i < n; i++) {
      var it = pick(pool);
      if (!it) continue;
      var seller = pick(S.npcs);
      var mult = rflt(0.72, 1.55);
      /* traders undercut, egomaniacs overprice */
      mult *= (1.15 - seller.p.greed * 0.3);
      listings().push({
        id: S.nextMktId++,
        item: it.id,
        qty: chance(0.75) ? 1 : rint(2, 6),
        price: Math.max(1, Math.round(fair(it) * mult)),
        seller: seller.id,
        sellerName: seller.name,
        t: now - Math.round(rflt(0, 3) * DAY)
      });
    }
  }

  function buy(listingId, qty) {
    var l = listings(), p = S.player;
    for (var i = 0; i < l.length; i++) {
      if (l[i].id !== listingId) continue;
      var row = l[i];
      qty = Math.max(1, Math.min(qty || 1, row.qty));
      var cost = row.price * qty;
      if (p.money < cost) return { err: 'You need ' + money(cost) + '.' };
      GAME.player.spend(cost);
      GAME.items.add(row.item, qty);
      row.qty -= qty;
      var seller = byId(row.seller);
      if (seller && seller.id !== 0) {
        seller.money += cost;
        GAME.npc.remember(seller, 'bought_from_player', { amount: cost });
      }
      if (row.qty <= 0) l.splice(i, 1);
      var it = GAME.items.get(row.item);
      GAME.feed.log('buy', 'You bought ' + qty + 'x ' + (it ? it.name : row.item) + ' for ' + money(cost) + '.');
      return { ok: true, cost: cost, name: it ? it.name : row.item, qty: qty };
    }
    return { err: 'That listing is gone. Somebody beat you to it.' };
  }

  function sell(itemId, qty, price) {
    var p = S.player;
    qty = Math.max(1, Math.floor(qty || 1));
    price = Math.max(1, Math.floor(price || 1));
    if (GAME.items.count(itemId) < qty) return { err: 'You do not have that many.' };
    var it = GAME.items.get(itemId);
    if (it && it.cat === 'trophy') return { err: 'That is not for sale at any price.' };
    if (listings().filter(function (x) { return x.seller === 0; }).length >= 12) return { err: 'You already have 12 listings up.' };
    GAME.items.remove(itemId, qty);
    listings().push({
      id: S.nextMktId++, item: itemId, qty: qty, price: price,
      seller: 0, sellerName: p.name, t: NOW()
    });
    GAME.feed.log('sell', 'Listed ' + qty + 'x ' + (it ? it.name : itemId) + ' at ' + money(price) + ' each.');
    return { ok: true };
  }

  function cancel(listingId) {
    var l = listings();
    for (var i = 0; i < l.length; i++) {
      if (l[i].id === listingId && l[i].seller === 0) {
        GAME.items.add(l[i].item, l[i].qty);
        l.splice(i, 1);
        return { ok: true };
      }
    }
    return { err: 'Not your listing.' };
  }

  /* Called by the world sim. NPCs buy underpriced stock and post new
     lots; old listings expire. */
  function tick(now) {
    var l = listings();
    /* expire */
    for (var i = l.length - 1; i >= 0; i--) {
      if (now - l[i].t > 6 * DAY) {
        if (l[i].seller === 0) {
          GAME.items.add(l[i].item, l[i].qty);
          GAME.mail.system('listingExpired', { item: (GAME.items.get(l[i].item) || {}).name || 'item' });
        }
        l.splice(i, 1);
      }
    }
    /* an NPC buys something that is a good deal */
    if (chance(0.35) && l.length) {
      var idx = Math.floor(rnd() * l.length);
      var row = l[idx];
      var it = GAME.items.get(row.item);
      if (it) {
        var f = fair(it);
        var deal = f / Math.max(1, row.price);
        var buyer = pick(S.npcs);
        if (buyer && buyer.id !== row.seller && chance(clamp((deal - 0.85) * 1.2, 0.02, 0.85)) && buyer.money > row.price) {
          var take = Math.min(row.qty, chance(0.8) ? 1 : row.qty);
          /* never spend money they do not have */
          take = Math.min(take, Math.floor(buyer.money / Math.max(1, row.price)));
          if (take < 1) { if (row.qty <= 0) l.splice(idx, 1); return; }
          buyer.money -= row.price * take;
          row.qty -= take;
          if (row.seller === 0) {
            S.player.money += row.price * take;
            S.player.st.earned += row.price * take;
            GAME.mail.system('sold', { item: it.name, amount: money(row.price * take), who: buyer.name, n: take });
            GAME.feed.log('sell', buyer.name + ' bought ' + take + 'x ' + it.name + ' for ' + money(row.price * take) + '.');
          } else {
            var s = byId(row.seller);
            if (s) s.money += row.price * take;
          }
          if (row.price * take > 100000) {
            GAME.feed.newsFrom('marketSale', 'money', { who: buyer.name, item: it.name, amount: money(row.price * take), other: row.sellerName, city: buyer.city });
          }
          if (row.qty <= 0) l.splice(idx, 1);
        }
      }
    }
    /* new NPC listings keep the board stocked */
    if (l.length < CFG.MARKET_CAP && chance(0.5)) {
      var pool = GAME.items.all().filter(function (x) { return x.cat !== 'trophy'; });
      var itm = pick(pool);
      var sel = pick(S.npcs);
      if (itm && sel) {
        l.push({
          id: S.nextMktId++, item: itm.id,
          qty: chance(0.78) ? 1 : rint(2, 5),
          price: Math.max(1, Math.round(fair(itm) * rflt(0.7, 1.6) * (1.15 - sel.p.greed * 0.3))),
          seller: sel.id, sellerName: sel.name, t: now
        });
      }
    }
  }

  return { seed: seed, buy: buy, sell: sell, cancel: cancel, tick: tick, listings: listings, fair: fair };
})();


/* ============================================================
   The Auction. Same stock as the market, but timed and bid on -
   and the other two hundred bid against you.
   ============================================================ */
GAME.auction = (function () {
  function lots() { return S.auction || (S.auction = []); }

  function seed(now) {
    S.auction = [];
    S.nextAucId = 1;
    for (var i = 0; i < rint(6, 12); i++) newLot(now - rflt(0, 6) * HOUR);
  }

  function newLot(t) {
    var pool = GAME.items.all().filter(function (x) { return x.cat !== 'trophy' && x.price > 500; });
    var it = pick(pool);
    var seller = pick(S.npcs);
    if (!it || !seller) return;
    lots().push({
      id: S.nextAucId++, item: it.id, seller: seller.id, sellerName: seller.name,
      start: Math.max(1, Math.round(GAME.market.fair(it) * rflt(0.25, 0.6))),
      bid: 0, bidder: null, bidderName: '',
      t: t, ends: t + rint(20, 240) * MIN
    });
  }

  function price(l) { return l.bid || l.start; }
  function minBid(l) { return l.bid ? Math.ceil(l.bid * 1.06) : l.start; }

  function bid(lotId, amount) {
    var l = lots(), p = S.player;
    for (var i = 0; i < l.length; i++) {
      if (l[i].id !== lotId) continue;
      var lot = l[i];
      if (lot.ends <= NOW()) return { err: 'That lot has closed.' };
      if (lot.bidder === 0) return { err: 'You are already the high bidder.' };
      amount = Math.floor(amount || minBid(lot));
      if (amount < minBid(lot)) return { err: 'The next bid is ' + money(minBid(lot)) + '.' };
      if (p.money < amount) return { err: 'You cannot cover that.' };
      /* the previous bidder gets their money back */
      if (lot.bidder === 0) p.money += lot.bid;
      GAME.player.spend(amount);
      lot.bid = amount; lot.bidder = 0; lot.bidderName = p.name;
      return { ok: true, amount: amount };
    }
    return { err: 'No such lot.' };
  }

  function tick(now) {
    var l = lots();
    for (var i = l.length - 1; i >= 0; i--) {
      var lot = l[i];
      if (now >= lot.ends) {
        var it = GAME.items.get(lot.item);
        if (lot.bidder === 0) {
          GAME.items.add(lot.item, 1);
          GAME.mail.system('wonAuction', { item: (it || {}).name || 'a lot', amount: money(lot.bid) });
          GAME.feed.log('buy', 'You won ' + ((it || {}).name || 'a lot') + ' at auction for ' + money(lot.bid) + '.');
        } else if (lot.bidder !== null) {
          var w = byId(lot.bidder);
          if (w && w.id !== 0) { w.money -= lot.bid; }
        }
        l.splice(i, 1);
        continue;
      }
      /* somebody else wants it too */
      if (chance(0.06)) {
        var next = lot.bid ? Math.ceil(lot.bid * rflt(1.06, 1.3)) : lot.start;
        var it2 = GAME.items.get(lot.item);
        var ceiling = it2 ? GAME.market.fair(it2) * rflt(0.7, 1.25) : next;
        if (next > ceiling) continue;
        var b = pick(S.npcs);
        if (!b || b.money < next || b.id === lot.seller) continue;
        var outbidPlayer = lot.bidder === 0;
        if (outbidPlayer) {
          S.player.money += lot.bid;           // refund
          GAME.mail.system('outbid', { item: (it2 || {}).name || 'a lot', who: b.name, amount: money(next) });
        }
        lot.bid = next; lot.bidder = b.id; lot.bidderName = b.name;
      }
    }
    while (lots().length < 10 && chance(0.25)) newLot(now);
  }

  return { lots: lots, seed: seed, bid: bid, tick: tick, price: price, minBid: minBid };
})();
