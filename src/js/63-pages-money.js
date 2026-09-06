/* ============================================================
   63-pages-money.js :: Shop, Item Market, Truck Stop, Fence,
   Bank, Property, Casino, Lottery, Stock Market, Inventory
   ============================================================ */

var CAT_LABEL = {
  melee: 'Melee', pistol: 'Pistols', smg: 'SMGs', rifle: 'Rifles', heavy: 'Heavy',
  armor: 'Armour', medical: 'Medical', booster: 'Boosters', drop: 'Junk', trophy: 'Trophies'
};

PAGES.shop = function () {
  var p = S.player;
  var cat = S.uiShopCat || 'melee';
  var cats = ['melee', 'pistol', 'smg', 'rifle', 'heavy', 'armor', 'medical', 'booster'];
  var h = '<div class="box"><h3>The Shop<span class="sub">' + money(p.money) + ' on you</span></h3><div class="bd">' +
    '<div class="cats">';
  for (var c = 0; c < cats.length; c++) {
    h += '<a href="#" class="' + (cat === cats[c] ? 'on' : '') + '" data-act="shopcat" data-id="' + cats[c] + '">' + CAT_LABEL[cats[c]] + '</a>';
  }
  h += '</div></div><div class="scroll"><table class="t"><tr><th>Item</th><th class="c">Lvl</th><th class="c">Atk</th><th class="c">Def</th><th class="c">Acc</th><th class="r">Price</th><th class="c">Own</th><th></th></tr>';
  var stock = GAME.items.shopStock(p.level, GAME.travel.currentId()).filter(function (i) { return i.cat === cat; });
  for (var i = 0; i < stock.length; i++) {
    var it = stock[i];
    var locked = p.level < it.lvl;
    var afford = p.money >= it.price;
    h += '<tr' + (locked ? ' style="opacity:.45"' : '') + '><td><b>' + esc(it.name) + '</b><div class="dimmer" style="font-size:9.5px">' + esc(it.desc) + '</div></td>' +
      '<td class="c">' + it.lvl + '</td>' +
      '<td class="c">' + (it.atk || '&mdash;') + '</td>' +
      '<td class="c">' + (it.def || '&mdash;') + (it.spd ? ' <span class="bad">' + it.spd + 'spd</span>' : '') + '</td>' +
      '<td class="c dim">' + (it.atk ? Math.round((it.acc || 0.9) * 100) + '%' : (it.heal ? it.heal + '% hp' : (it.effect ? '+' + it.effect.amount + ' ' + it.effect.stat : '&mdash;'))) + '</td>' +
      '<td class="r">' + money(it.price) + '</td>' +
      '<td class="c dim">' + (GAME.items.count(it.id) || '') + '</td>' +
      '<td class="r nowrap"><button class="btn sm ' + (!locked && afford ? '' : 'off') + '" data-act="buy" data-id="' + it.id + '" data-n="1">Buy</button>' +
      (it.price * 5 <= p.money && !locked ? ' <button class="btn sm" data-act="buy" data-id="' + it.id + '" data-n="5">x5</button>' : '') +
      '</td></tr>';
  }
  h += '</table></div></div>';
  return h;
};

PAGES.inventory = function () {
  var p = S.player;
  var ids = Object.keys(p.inv);
  var h = '<div class="box"><h3>Inventory<span class="sub">' + ids.length + ' lines</span></h3><div class="bd">';
  var w = GAME.items.get(p.wpn), a = GAME.items.get(p.arm);
  h += '<div class="pgrid" style="grid-template-columns:1fr 1fr">' +
    '<div class="prow"><span class="k">Weapon</span><span class="v">' + (w ? esc(w.name) + ' <span class="dim">(' + w.atk + ' atk)</span>' : '<span class="dim">bare knuckle</span>') +
    (w ? ' <button class="btn sm" data-act="unequip" data-id="wpn">x</button>' : '') + '</span></div>' +
    '<div class="prow"><span class="k">Armour</span><span class="v">' + (a ? esc(a.name) + ' <span class="dim">(' + a.def + ' def)</span>' : '<span class="dim">just a shirt</span>') +
    (a ? ' <button class="btn sm" data-act="unequip" data-id="arm">x</button>' : '') + '</span></div>' +
    '</div></div>';
  if (!ids.length) {
    h += '<div class="bd dim">You are carrying nothing.</div></div>';
    return h;
  }
  h += '<div class="scroll"><table class="t"><tr><th>Item</th><th class="c">Type</th><th class="c">Qty</th><th class="c">Atk/Def</th><th class="r">Value</th><th></th></tr>';
  ids.sort(function (x, y) {
    var ix = GAME.items.get(x) || {}, iy = GAME.items.get(y) || {};
    return (iy.price || 0) - (ix.price || 0);
  });
  for (var i = 0; i < ids.length; i++) {
    var it = GAME.items.get(ids[i]);
    if (!it) continue;
    var qty = p.inv[ids[i]];
    var eq = (p.wpn === it.id) || (p.arm === it.id);
    h += '<tr><td><b>' + esc(it.name) + '</b>' + (eq ? ' <span class="tag on">equipped</span>' : '') +
      '<div class="dimmer" style="font-size:9.5px">' + esc(it.desc) + '</div></td>' +
      '<td class="c dim">' + (CAT_LABEL[it.cat] || it.cat) + '</td>' +
      '<td class="c">' + qty + '</td>' +
      '<td class="c">' + (it.atk || 0) + '/' + (it.def || 0) + '</td>' +
      '<td class="r">' + money(it.price) + '</td>' +
      '<td class="r nowrap">' +
      ((GAME.items.isWeapon(it) || GAME.items.isArmor(it)) && !eq ? '<button class="btn sm" data-act="equip" data-id="' + it.id + '">Equip</button> ' : '') +
      (it.heal || it.effect ? '<button class="btn sm green" data-act="use" data-id="' + it.id + '">Use</button> ' : '') +
      (it.cat !== 'trophy' ? '<button class="btn sm" data-act="listitem" data-id="' + it.id + '">Sell</button>' : '') +
      '</td></tr>';
  }
  h += '</table></div></div>';
  return h;
};

/* ---------------- Item Market ---------------- */
PAGES.market = function () {
  var p = S.player;
  var l = GAME.market.listings().slice();
  var q = (S.uiMktQ || '').toLowerCase();
  l.sort(function (a, b) { return a.price - b.price; });
  if (q) l = l.filter(function (r) { var it = GAME.items.get(r.item); return it && it.name.toLowerCase().indexOf(q) >= 0; });

  var h = '<div class="box"><h3>Item Market<span class="sub">' + l.length + ' lots</span></h3><div class="bd">' +
    '<p class="dim">Everything here was posted by another player. Good lots get sniped fast &mdash; by you if you are quick, by somebody else if you are not.</p>' +
    '<input type="text" id="mq" placeholder="filter by item name" value="' + esc(S.uiMktQ || '') + '" style="width:200px"> ' +
    '<button class="btn sm" data-act="mktsearch">Filter</button></div>' +
    '<div class="scroll"><table class="t"><tr><th>Item</th><th class="c">Atk/Def</th><th class="c">Qty</th><th class="r">Each</th><th class="r">Shop</th><th>Seller</th><th></th></tr>';
  for (var i = 0; i < Math.min(l.length, 90); i++) {
    var r = l[i], it = GAME.items.get(r.item);
    if (!it) continue;
    var deal = it.price && r.price < it.price * 0.85;
    h += '<tr><td><b>' + esc(it.name) + '</b>' + (deal ? ' <span class="tag on">under shop</span>' : '') + '</td>' +
      '<td class="c dim">' + (it.atk || 0) + '/' + (it.def || 0) + '</td>' +
      '<td class="c">' + r.qty + '</td>' +
      '<td class="r"><b>' + money(r.price) + '</b></td>' +
      '<td class="r dim">' + (it.stock ? money(it.price) : '&mdash;') + '</td>' +
      '<td class="dim">' + (r.seller === 0 ? '<b class="warn">you</b>' : esc(r.sellerName)) + '</td>' +
      '<td class="r">' + (r.seller === 0 ?
        '<button class="btn sm" data-act="cancellist" data-id="' + r.id + '">Cancel</button>' :
        '<button class="btn sm ' + (p.money >= r.price ? '' : 'off') + '" data-act="mktbuy" data-id="' + r.id + '">Buy</button>') +
      '</td></tr>';
  }
  h += '</table></div></div>';
  return h;
};

/* ---------------- Truck Stop / Downtown Fence ---------------- */
PAGES.truckstop = function () {
  var p = S.player, F = GAME.fence;
  var bd = F.band(p.level);
  var h = '<div class="box"><h3>The Truck Stop<span class="sub">Dexterity ' + Math.floor(p.dexg || 0) + '/' + (p.dexgMax || 20) + '</span></h3><div class="bd">' +
    '<p class="dim">Out by the interchange, past the weighbridge. Nobody asks where any of it came from and nobody writes anything down. ' +
    'Runs cost <b>Dexterity</b> &mdash; the one gauge nothing else in the city touches.</p>' +
    '<div class="hr"></div><b>What you need before they let you near a trailer</b>' +
    '<table class="t"><tr><th>Kit</th><th class="r">Price</th><th class="c">Have</th><th></th></tr>';
  var kit = F.kit();
  for (var i = 0; i < kit.length; i++) {
    var k = kit[i];
    var got = k.once ? (F.have(k.id) ? 'yes' : 'no') : F.ammo();
    h += '<tr><td><b>' + esc(k.name) + '</b><div class="dimmer" style="font-size:9.5px">' + esc(k.desc) + '</div></td>' +
      '<td class="r">' + money(k.price) + '</td>' +
      '<td class="c ' + ((k.once && F.have(k.id)) || (!k.once && F.ammo() > 0) ? 'good' : 'bad') + '">' + got + '</td>' +
      '<td class="r nowrap"><button class="btn sm ' + (p.money >= k.price && !(k.once && F.have(k.id)) ? '' : 'off') + '" data-act="kitbuy" data-id="' + k.id + '" data-n="1">Buy</button>' +
      (k.once ? '' : ' <button class="btn sm ' + (p.money >= k.price * 10 ? '' : 'off') + '" data-act="kitbuy" data-id="' + k.id + '" data-n="10">x10</button>') +
      '</td></tr>';
  }
  h += '</table></div>';

  h += '<div class="bd"><div class="hr"></div><b>Tonight you are on the ' + esc(bd.job.toLowerCase()) + '</b>' +
    '<p class="dim">' + bd.dex + ' Dexterity and a box of ammo a run. ' + bd.units[0] + '&ndash;' + bd.units[1] + ' units, worth ' +
    money(bd.value) + ' each to the fence, plus <b>one extra unit per 250 Labour</b> (you have ' + fmt(p.dex) + ', so +' +
    Math.min(3, Math.floor((p.dex || 10) / 250)) + ').</p>' +
    '<p>In the lockup: <b class="warn">' + fmt(F.units()) + ' units</b>' +
    (F.units() < F.MIN_LOAD ? ' <span class="dim">(the fence wants ' + F.MIN_LOAD + ')</span>' : ' <span class="good">(enough to move)</span>') + '</p>' +
    '<button class="btn red ' + (F.ready() && (p.dexg || 0) >= bd.dex && !GAME.player.blocked() ? '' : 'off') + '" data-act="truckrun">Run a load</button> ' +
    '<button class="btn ' + (F.ready() && (p.dexg || 0) >= bd.dex * 3 && !GAME.player.blocked() ? '' : 'off') + '" data-act="truckrun3">Run three</button> ' +
    '<a class="btn" href="#/fence" data-nav="fence">Take it downtown</a>' +
    '</div>';

  h += '<div class="scroll"><table class="t"><tr><th>Level</th><th>Job</th><th class="c">Dex</th><th class="c">Units</th><th class="r">Unit value</th></tr>';
  var bands = F.bands();
  for (var j = 0; j < bands.length; j++) {
    var B = bands[j], here = B === bd;
    h += '<tr' + (here ? ' style="background:#241a12"' : (p.level < B.lo ? ' style="opacity:.45"' : '')) + '>' +
      '<td>' + B.lo + (B.hi > 900 ? '+' : '&ndash;' + B.hi) + '</td><td><b>' + esc(B.job) + '</b>' + (here ? ' <span class="tag on">yours</span>' : '') + '</td>' +
      '<td class="c">' + B.dex + '</td><td class="c">' + B.units[0] + '&ndash;' + B.units[1] + '</td>' +
      '<td class="r">' + money(B.value) + '</td></tr>';
  }
  h += '</table></div></div>';
  if (S.lastRun) h = '<div class="box"><h3>' + esc(S.lastRun.job) + '</h3><div class="bd"><p class="good">' +
    S.lastRun.got + ' units off the back. ' + fmt(S.lastRun.total) + ' in the lockup now.</p></div></div>' + h;
  return h;
};

PAGES.fence = function () {
  var p = S.player, F = GAME.fence;
  var u = F.units(), bd = F.band(p.level);
  var h = '<div class="box"><h3>Downtown Fence<span class="sub">no receipts</span></h3><div class="bd">' +
    '<p class="dim">Back room behind the carpet showroom. He counts it twice, pays in used notes, and has never once asked a question. ' +
    'He will not open the shutter for less than <b>' + F.MIN_LOAD + ' units</b> &mdash; under that you are dumping, and dumping costs you forty percent.</p>' +
    '<div class="hr"></div>' +
    '<div class="pgrid" style="grid-template-columns:1fr 1fr">' +
    '<div class="prow"><span class="k">In the lockup</span><span class="v"><b>' + fmt(u) + '</b> units</span></div>' +
    '<div class="prow"><span class="k">He is paying</span><span class="v">' + money(bd.value) + ' a unit</span></div>' +
    '<div class="prow"><span class="k">Your IQ premium</span><span class="v good">+' + Math.round((F.rate() - 1) * 100) + '%</span></div>' +
    '<div class="prow"><span class="k">Full load is worth</span><span class="v warn"><b>' + money(F.quote(false)) + '</b></span></div>' +
    '</div><div class="hr"></div>' +
    '<button class="btn green ' + (u >= F.MIN_LOAD ? '' : 'off') + '" data-act="fencesell">Move the lot &mdash; ' + money(F.quote(false)) + '</button> ' +
    '<button class="btn ' + (u > 0 && u < F.MIN_LOAD ? '' : 'off') + '" data-act="fencedump">Dump it at sixty cents &mdash; ' + money(F.quote(true)) + '</button> ' +
    '<a class="btn" href="#/truckstop" data-nav="truckstop">Back to the yard</a>' +
    '</div></div>';
  h += '<div class="box"><h3>The Run</h3><div class="bd"><div class="pgrid">' +
    row('Loads run', fmt(p.st.runs || 0)) + row('Times you sold', fmt(p.st.fenceRuns || 0)) +
    '</div><p class="dim" style="margin-top:8px">Safe money. No failure roll, no jail, nobody hits you. It is also worse per hour than the crimes ' +
    'you could be pulling, which is exactly why it is the thing you do when your Brave is empty.</p></div></div>';
  return h;
};

/* ---------------- Bank ---------------- */
PAGES.bank = function () {
  var p = S.player;
  var h = '<div class="box"><h3>Bank of the Five Boroughs</h3><div class="bd">' +
    '<div class="pgrid" style="grid-template-columns:1fr 1fr">' +
    '<div class="prow"><span class="k">On you</span><span class="v">' + money(p.money) + '</span></div>' +
    '<div class="prow"><span class="k">In the bank</span><span class="v">' + money(p.bank) + '</span></div>' +
    '<div class="prow"><span class="k">Interest</span><span class="v">' + GAME.bank.rateText() + '</span></div>' +
    '<div class="prow"><span class="k">Last credit</span><span class="v">' + (p._lastInterest ? money(p._lastInterest) : '&mdash;') + '</span></div>' +
    '</div><div class="hr"></div>' +
    '<p class="dim">Cash on you can be mugged. Cash in the bank cannot. It is the first thing anybody tells a new player ' +
    'and the last thing they remember. Interest is ' + GAME.bank.rateText() + ', compounding, which is not why you use it.</p>' +
    '<label class="f"><span>Amount</span><input type="number" id="bank-amt" value="' + Math.max(0, Math.floor(p.money)) + '" min="0"></label>' +
    '<button class="btn green" data-act="deposit">Deposit</button> ' +
    '<button class="btn" data-act="withdraw">Withdraw</button> ' +
    '<button class="btn sm" data-act="depositall">Deposit everything</button>' +
    '</div></div>';
  return h;
};

/* ---------------- Property ---------------- */
PAGES.property = function () {
  var p = S.player, inc = GAME.props.income();
  var h = '<div class="box"><h3>Property<span class="sub">' + money(inc.hourly) + '/hr, ' + money(inc.daily) + '/day upkeep</span></h3><div class="bd">' +
    '<p class="dim">Homes raise your maximum health and speed up how fast Energy comes back. Businesses pay out every hour into the bank and cost you upkeep every day whether they earn or not.</p></div>' +
    '<div class="scroll"><table class="t"><tr><th>Property</th><th class="c">Lvl</th><th class="r">Price</th><th class="r">Income/hr</th><th class="r">Upkeep/day</th><th class="c">Bonus</th><th></th></tr>';
  var l = GAME.props.list();
  for (var i = 0; i < l.length; i++) {
    var pr = l[i], own = GAME.props.owns(pr.id);
    var afford = (p.money + p.bank) >= pr.price;
    h += '<tr' + (p.level < pr.lvl ? ' style="opacity:.45"' : '') + '><td><b>' + esc(pr.name) + '</b> <span class="tag">' + pr.kind + '</span>' +
      '<div class="dimmer" style="font-size:9.5px">' + esc(pr.desc) + '</div></td>' +
      '<td class="c">' + pr.lvl + '</td>' +
      '<td class="r">' + money(pr.price) + '</td>' +
      '<td class="r">' + (pr.income ? money(pr.income) : '&mdash;') + '</td>' +
      '<td class="r dim">' + (pr.upkeep ? money(pr.upkeep) : '&mdash;') + '</td>' +
      '<td class="c dim">' + (pr.hp ? '+' + fmt(pr.hp) + ' hp ' : '') + (pr.energyRegen ? '+' + pr.energyRegen + '% en' : '') + '</td>' +
      '<td class="r">' + (own ?
        '<button class="btn sm" data-act="sellprop" data-id="' + pr.id + '">Sell</button>' :
        '<button class="btn sm ' + (p.level >= pr.lvl && afford ? '' : 'off') + '" data-act="buyprop" data-id="' + pr.id + '">Buy</button>') + '</td></tr>';
  }
  h += '</table></div></div>';
  return h;
};

/* ---------------- Casino ---------------- */
PAGES.casino = function () {
  var p = S.player, r = S.lastGamble;
  var h = '<div class="box"><h3>The Blue Room<span class="sub">' + money(p.money) + '</span></h3><div class="bd">' +
    '<p class="dim">Members only, upstairs, no windows. The house is not honest but it is consistent.</p>';
  if (r) {
    h += '<div class="hr"></div><div class="' + (r.win ? 'good' : 'bad') + '" style="font-size:13px">' + esc(r.text) + '</div>';
  }
  h += '<div class="hr"></div><label class="f"><span>Stake</span><input type="number" id="stake" value="' + Math.min(10000, Math.max(100, Math.floor(p.money / 10) || 100)) + '" min="1"></label></div></div>';

  h += '<div class="box"><h3>Slots</h3><div class="bd"><p class="dim">Three of a kind pays 12x, bars 25x, sevens 60x. Two of a kind gives you your stake and a bit back.</p>' +
    '<button class="btn gold" data-act="slots">Pull the handle</button></div></div>';

  h += '<div class="box"><h3>Roulette</h3><div class="bd"><p class="dim">Reds and blacks pay double. Zero pays 36 and never lands.</p>' +
    ['red', 'black', 'odd', 'even', 'green'].map(function (c) {
      return '<button class="btn ' + (c === 'red' ? 'red' : c === 'green' ? 'green' : '') + '" data-act="roulette" data-id="' + c + '">' + c + '</button>';
    }).join(' ') + '</div></div>';

  h += '<div class="box"><h3>High Low</h3><div class="bd"><p class="dim">One card down, one card up. Call it. Pays 1.9x.</p>' +
    '<button class="btn" data-act="highlow" data-id="high">Higher</button> ' +
    '<button class="btn" data-act="highlow" data-id="low">Lower</button></div></div>';

  h += '<div class="box"><h3>Your Luck</h3><div class="bd"><div class="pgrid">' +
    row('Staked all time', money(p.st.gambled || 0)) +
    row('Won all time', money(p.st.gambleWon || 0)) +
    row('Net', GAME.ui.money2((p.st.gambleWon || 0) - (p.st.gambled || 0))) +
    '</div></div></div>';
  return h;
};

/* ---------------- Lottery ---------------- */
PAGES.lottery = function () {
  var st = GAME.lottery.state(), p = S.player;
  var h = '<div class="box"><h3>The Weekly Draw<span class="sub">pot ' + money(st.pot) + '</span></h3><div class="bd">' +
    '<p class="dim">Six numbers, one to forty-nine, drawn once a week. Three matches pays a flat twenty-five grand. Six takes the pot.</p>' +
    '<p>Tickets: <b>' + money(GAME.lottery.price()) + '</b> each. You hold <b>' + st.tickets.length + '</b>.</p>';
  if (st.drawn) {
    h += '<div class="hr"></div><p>Drawn: <b class="mono">' + st.nums.join(' ') + '</b></p>' +
      '<p class="' + (st.prize ? 'good' : 'dim') + '">Best ticket matched ' + st.best + '. ' + (st.prize ? 'You took ' + money(st.prize) + '.' : 'Nothing.') + '</p>' +
      '<p class="dim">Next draw next week.</p>';
  } else {
    h += '<div class="hr"></div>' +
      '<button class="btn ' + (p.money >= GAME.lottery.price() ? '' : 'off') + '" data-act="lotto" data-n="1">Buy 1</button> ' +
      '<button class="btn ' + (p.money >= GAME.lottery.price() * 10 ? '' : 'off') + '" data-act="lotto" data-n="10">Buy 10</button> ' +
      '<button class="btn gold ' + (st.tickets.length ? '' : 'off') + '" data-act="lottodraw">Watch the draw</button>';
  }
  if (st.tickets.length) {
    h += '<div class="hr"></div><div class="mono dim" style="font-size:10px;max-height:140px;overflow:auto">';
    for (var i = 0; i < st.tickets.length; i++) h += st.tickets[i].join(' ') + '<br>';
    h += '</div>';
  }
  h += '</div></div>';
  return h;
};

/* ---------------- Stock Market ---------------- */
PAGES.stocks = function () {
  var p = S.player, held = GAME.stocks.held();
  var h = '<div class="box"><h3>Stock Market<span class="sub">prices move hourly</span></h3><div class="bd">' +
    '<p class="dim">Front companies, mostly. The prices are real enough.</p></div>' +
    '<div class="scroll"><table class="t"><tr><th>Ticker</th><th>Company</th><th class="r">Price</th><th class="c">Move</th><th class="c">Held</th><th class="r">P/L</th><th></th></tr>';
  var l = GAME.stocks.list();
  for (var i = 0; i < l.length; i++) {
    var s = l[i], pr = GAME.stocks.price(s), pv = GAME.stocks.prev(s);
    var mv = pv ? (pr - pv) / pv * 100 : 0;
    var hd = held[s.id];
    var pl = hd ? Math.round((pr - hd.avg) * hd.qty) : 0;
    h += '<tr><td><b class="mono">' + s.id + '</b></td><td>' + esc(s.name) + '</td>' +
      '<td class="r">' + money(pr) + '</td>' +
      '<td class="c ' + (mv >= 0 ? 'good' : 'bad') + '">' + (mv >= 0 ? '+' : '') + mv.toFixed(1) + '%</td>' +
      '<td class="c">' + (hd ? fmt(hd.qty) : '&mdash;') + '</td>' +
      '<td class="r">' + (hd ? GAME.ui.money2(pl) : '&mdash;') + '</td>' +
      '<td class="r nowrap"><button class="btn sm ' + (p.money >= pr ? '' : 'off') + '" data-act="stockbuy" data-id="' + s.id + '">Buy</button> ' +
      '<button class="btn sm ' + (hd ? '' : 'off') + '" data-act="stocksell" data-id="' + s.id + '">Sell</button></td></tr>';
  }
  h += '</table></div><div class="bd"><label class="f"><span>Shares per trade</span><input type="number" id="shares" value="10" min="1"></label></div></div>';
  return h;
};

/* ---------------- Auction ---------------- */
PAGES.auction = function () {
  var p = S.player, lots = GAME.auction.lots().slice().sort(function (a, b) { return a.ends - b.ends; });
  var h = '<div class="box"><h3>The Auction<span class="sub">' + lots.length + ' lots</span></h3><div class="bd">' +
    '<p class="dim">Timed lots, open bidding, and two hundred other people watching the same clock. Bid and your money is held; ' +
    'get outbid and it comes straight back. When the hammer falls the item is yours and there is no arguing about it.</p></div>' +
    '<div class="scroll"><table class="t"><tr><th>Lot</th><th class="c">Atk/Def</th><th class="r">Current</th><th>High bidder</th><th class="c">Closes</th><th class="r">Next bid</th><th></th></tr>';
  for (var i = 0; i < lots.length; i++) {
    var l = lots[i], it = GAME.items.get(l.item);
    if (!it) continue;
    var mine = l.bidder === 0;
    var next = GAME.auction.minBid(l);
    h += '<tr' + (mine ? ' style="background:#16241a"' : '') + '><td><b>' + esc(it.name) + '</b>' +
      '<div class="dimmer" style="font-size:9.5px">' + esc(it.desc) + '</div></td>' +
      '<td class="c dim">' + (it.atk || 0) + '/' + (it.def || 0) + '</td>' +
      '<td class="r">' + money(GAME.auction.price(l)) + (l.bid ? '' : ' <span class="dimmer">start</span>') + '</td>' +
      '<td class="' + (mine ? 'good' : 'dim') + '">' + (l.bid ? esc(mine ? 'you' : l.bidderName) : '&mdash;') + '</td>' +
      '<td class="c">' + clock(l.ends - NOW()) + '</td>' +
      '<td class="r">' + money(next) + '</td>' +
      '<td class="r"><button class="btn sm ' + (!mine && p.money >= next ? '' : 'off') + '" data-act="bid" data-id="' + l.id + '">Bid</button></td></tr>';
  }
  if (!lots.length) h += '<tr><td colspan="7" class="dim">Nothing under the hammer right now.</td></tr>';
  h += '</table></div></div>';
  return h;
};
