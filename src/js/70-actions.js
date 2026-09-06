/* ============================================================
   70-actions.js :: every click in the game
   One delegated listener. Buttons carry data-act plus optional
   data-id / data-n.
   ============================================================ */

GAME.actions = (function () {

  function val(sel, def) {
    var e = $(sel);
    if (!e) return def;
    var v = e.value;
    return v === '' || v === undefined ? def : v;
  }
  function num(sel, def) {
    var v = Number(val(sel, def));
    return isNaN(v) ? def : v;
  }
  function ok(r, msg) {
    if (!r) return false;
    if (r.err) { GAME.ui.toast(r.err, 'bad'); return false; }
    if (msg) GAME.ui.toast(msg, 'good');
    return true;
  }

  var H = {};

  /* ---- chrome ---- */
  H.savenow = function () { GAME.save.write(true).then(function () { GAME.ui.toast('Saved.', 'good'); GAME.ui.render(); }); };
  H.closemodal = function () { GAME.ui.closeModal(); };

  H.shout = function () {
    var t = val('#shout-in', '').trim();
    if (!t) return;
    $('#shout-in').value = '';
    GAME.feed.say(S.player, t.slice(0, 180));
    S.player.st.chatLines++;
    /* people react to what you say */
    var on = GAME.sim.onlineList();
    var n = Math.min(on.length, rint(0, 3));
    for (var i = 0; i < n; i++) {
      var who = pick(on);
      if (!who) continue;
      (function (w, delay) {
        setTimeout(function () {
          if (!S) return;
          var bank = w.grudge > 35 ? 'toPlayerHostile'
            : (GAME.ladder.onLadder(0) ? 'toPlayerRespect'
              : (w.op > 25 ? 'toPlayerFriendly' : pick(['smalltalk', 'lolspam', 'toPlayerMocking', 'interjections'])));
          GAME.npc.chatEvent(w, bank, NOW());
          GAME.ui.liveRefresh();
        }, delay);
      })(who, rint(1200, 9000));
    }
    GAME.ui.liveRefresh();
  };

  /* ---- crimes / jobs / streets ---- */
  H.togglecrimes = function () { S.uiShowAllCrimes = !S.uiShowAllCrimes; GAME.ui.render(); };
  H.crime = function (id) {
    var r = GAME.crimes.commit(id);
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    S.lastCrime = r;
    GAME.ui.render();
  };
  H.job = function (id) {
    var r = GAME.crimes.work(id);
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    S.lastJob = r;
    GAME.ui.render();
  };
  H.walk = function () { doWalks(1); };
  H.walk5 = function () { doWalks(5); };
  function doWalks(n) {
    S.walkLog = S.walkLog || [];
    for (var i = 0; i < n; i++) {
      var r = GAME.streets.walk();
      if (r.err) { if (i === 0) GAME.ui.toast(r.err, 'bad'); break; }
      r.t = NOW();
      S.walkLog.push(r);
      if (r.kind === 'jail' || r.kind === 'hospital') break;
    }
    while (S.walkLog.length > 14) S.walkLog.shift();
    GAME.ui.render();
  }

  /* ---- gym ---- */
  H.sets = function (n) { S.uiSets = (n === 'max' ? 'max' : Number(n)); GAME.ui.render(); };
  H.train = function (stat) {
    var sets = S.uiSets === 'max' ? Math.max(1, Math.floor(S.player.energy / GAME.gym.ENERGY_PER_SET)) : (S.uiSets || 1);
    var r = GAME.gym.train(stat, sets);
    if (!ok(r)) return;
    GAME.ui.toast('+' + r.gain.toFixed(2) + ' ' + stat + ' (' + r.sets + ' sets)', 'good');
    GAME.ui.render();
  };
  H.joingym = function (id) { if (ok(GAME.gym.join(id))) GAME.ui.render(); };
  H.ptrain = function (stat, n) {
    var r = GAME.points.pointTrain(stat, Number(n));
    if (!ok(r)) return;
    GAME.ui.toast('+' + r.gain.toFixed(2) + ' ' + stat, 'good');
    GAME.ui.render();
  };

  H.fly = function (id) {
    var r = GAME.travel.fly(id);
    if (!ok(r)) return;
    GAME.ui.toast('Wheels up. ' + r.mins + ' minutes to ' + r.name + '.', 'good');
    GAME.ui.render();
  };

  /* ---- fighting ---- */
  H.attack = function (id) { GAME.ui.go('attack', { id: id }); };
  H.doattack = function (id) {
    var r = GAME.ladder.attack(Number(id));
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    r.targetId = Number(id);
    S.lastFight = r;
    GAME.ui.go('attack', { id: id });
  };
  H.challenge = function (id) {
    var r = GAME.ladder.challenge(Number(id));
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    r.targetId = Number(id);
    S.lastFight = r;
    GAME.ui.go('attack', { id: id });
  };
  H.finish = function (kind) {
    var r = GAME.ladder.finish(kind);
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    if (S.lastFight) S.lastFight.finish = r;
    GAME.ui.render();
  };

  H.pmode = function (id) { S.uiPlayerMode = id; S.uiPlayerPage = 0; GAME.ui.render(); };
  H.psort = function (id) { S.uiPlayerSort = id; GAME.ui.render(); };
  H.psearch = function () { S.uiPlayerQ = val('#pq', ''); S.uiPlayerPage = 0; GAME.ui.render(); };
  H.ppage = function (n) { S.uiPlayerPage = Number(n); GAME.ui.render(); };

  H.hireguard = function () { if (ok(GAME.ladder.hireBodyguard(), 'A bodyguard is on your door.')) GAME.ui.render(); };
  H.dismissguard = function () { S.player.bgUntil = 0; GAME.ui.render(); };

  H.bountyon = function (id) {
    var n = byId(Number(id));
    if (!n) return;
    GAME.ui.modal('Put money on ' + esc(n.name),
      '<p class="dim">Whoever puts them in a hospital bed collects the whole pot.</p>' +
      '<label class="f"><span>Amount (minimum $1,000)</span><input type="number" id="bm-amt" value="10000" min="1000"></label>' +
      '<button class="btn red" data-act="bountygo" data-id="' + id + '">Place it</button>');
  };
  H.bountygo = function (id) {
    var r = GAME.hitlist.place(Number(id), num('#bm-amt', 0));
    GAME.ui.closeModal();
    if (ok(r, 'The word is out.')) GAME.ui.render();
  };
  H.placebounty = function () {
    var nm = String(val('#bnt-name', '')).toLowerCase().trim();
    var target = null;
    for (var i = 0; i < S.npcs.length; i++) if (S.npcs[i].name.toLowerCase() === nm) target = S.npcs[i];
    if (!target) return GAME.ui.toast('No player by that name.', 'bad');
    if (ok(GAME.hitlist.place(target.id, num('#bnt-amt', 0)), 'The word is out.')) GAME.ui.render();
  };

  /* ---- truck stop, fence, school, the round ---- */
  H.kitbuy = function (id, n) { if (ok(GAME.fence.buyKit(id, Number(n) || 1))) GAME.ui.render(); };
  H.truckrun = function () { doRuns(1); };
  H.truckrun3 = function () { doRuns(3); };
  function doRuns(n) {
    var last = null;
    for (var i = 0; i < n; i++) {
      var r = GAME.fence.run();
      if (r.err) { if (i === 0) GAME.ui.toast(r.err, 'bad'); break; }
      last = r;
    }
    if (last) S.lastRun = last;
    GAME.ui.render();
  }
  H.fencesell = function () {
    var r = GAME.fence.sell(false);
    if (!ok(r)) return;
    S.lastRun = null;
    GAME.ui.toast('Moved ' + r.units + ' units for ' + money(r.got) + '.', 'good');
    GAME.ui.render();
  };
  H.fencedump = function () {
    var r = GAME.fence.sell(true);
    if (!ok(r)) return;
    S.lastRun = null;
    GAME.ui.toast('Dumped ' + r.units + ' units for ' + money(r.got) + '.', 'warn');
    GAME.ui.render();
  };
  H.enrol = function (id) {
    var r = GAME.school.enrol(id);
    if (!ok(r)) return;
    GAME.ui.toast('Enrolled in ' + r.name + '. ' + r.hours + ' hours.', 'good');
    GAME.ui.render();
  };
  H.schoolcollect = function () {
    var r = GAME.school.collect();
    if (!ok(r)) return;
    GAME.ui.toast('+' + r.iq + ' IQ' + (r.lab ? ', +' + r.lab + ' Labour' : ''), 'good');
    GAME.ui.render();
  };
  H.rumble = function () {
    var r = GAME.season.rumble();
    if (!ok(r)) return;
    GAME.ui.toast(r.result.championIsPlayer ? 'You won The Rumble.' : r.result.champion + ' won The Rumble.',
      r.result.championIsPlayer ? 'good' : 'warn');
    GAME.ui.render();
  };
  H.newround = function () {
    GAME.ui.confirmBox('Start the next round?',
      'Everybody goes back to level one, including you. The wall keeps your name and your lifetime counters carry over. Nothing else does.',
      'newroundgo');
  };
  H.newroundgo = function () {
    GAME.ui.closeModal();
    var r = GAME.season.reset();
    if (!ok(r)) return;
    GAME.save.write(true);
    GAME.ui.toast('Round ' + r.round + '. Everybody back to zero.', 'good');
    GAME.ui.go('city');
  };
  H.bid = function (id) {
    var r = GAME.auction.bid(Number(id));
    if (!ok(r)) return;
    GAME.ui.toast('Bid ' + money(r.amount) + '.', 'good');
    GAME.ui.render();
  };

  /* ---- organised crime ---- */
  H.ocopen = function (id) { S.ocJob = id; GAME.oc.clearCrew(); GAME.oc.autoFill(GAME.oc.get(id) || { roles: [] }); GAME.ui.render(); };
  H.ocback = function () { S.ocJob = null; S.lastOc = null; GAME.ui.render(); };
  H.ocauto = function () { var j = GAME.oc.get(S.ocJob); if (j) GAME.oc.autoFill(j); GAME.ui.render(); };
  H.occlear = function () { GAME.oc.clearCrew(); GAME.ui.render(); };
  H.ocrun = function (id) {
    var r = GAME.oc.run(id);
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    S.lastOc = r;
    GAME.ui.toast(r.success ? 'It came off. Your cut: ' + money(r.cut) : 'It fell apart.', r.success ? 'good' : 'bad');
    GAME.ui.render();
  };

  /* ---- the notice board ---- */
  H.conaccept = function (id) {
    var r = GAME.contracts.accept(Number(id));
    if (!ok(r, 'Taken.')) return;
    GAME.ui.render();
  };
  H.conclaim = function (id) {
    var r = GAME.contracts.claim(Number(id));
    if (!ok(r)) return;
    GAME.ui.toast('Paid: ' + money(r.c.reward) + ' and ' + r.c.points + ' points.', 'good');
    GAME.ui.render();
  };
  H.condrop = function (id) {
    var r = GAME.contracts.drop(Number(id));
    if (!ok(r, 'Dropped. They noticed.')) return;
    GAME.ui.render();
  };

  /* ---- shop & items ---- */
  H.shopcat = function (id) { S.uiShopCat = id; GAME.ui.render(); };
  H.buy = function (id, n) {
    var it = GAME.items.get(id), p = S.player;
    n = Math.max(1, Number(n) || 1);
    if (!it) return;
    if (p.level < it.lvl) return GAME.ui.toast('You need to be level ' + it.lvl + '.', 'bad');
    if (p.money < it.price * n) return GAME.ui.toast('You cannot afford that.', 'bad');
    GAME.player.spend(it.price * n);
    GAME.items.add(it.id, n);
    if ((GAME.items.isWeapon(it) && !p.wpn) || (GAME.items.isArmor(it) && !p.arm)) GAME.items.equip(it.id);
    GAME.ui.toast('Bought ' + n + 'x ' + it.name + '.', 'good');
    GAME.ui.render();
  };
  H.equip = function (id) { var e = GAME.items.equip(id); if (e) GAME.ui.toast(e, 'bad'); GAME.ui.render(); };
  H.unequip = function (slot) { GAME.items.unequip(slot); GAME.ui.render(); };
  H.use = function (id) {
    var r = GAME.items.use(id);
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    GAME.ui.toast(r.msg, 'good');
    GAME.ui.render();
  };
  H.listitem = function (id) {
    var it = GAME.items.get(id);
    if (!it) return;
    GAME.ui.modal('Sell ' + esc(it.name),
      '<p class="dim">Shop price ' + (it.stock ? money(it.price) : 'n/a') + '. You hold ' + GAME.items.count(id) + '.</p>' +
      '<label class="f"><span>Quantity</span><input type="number" id="sl-q" value="1" min="1" max="' + GAME.items.count(id) + '"></label>' +
      '<label class="f"><span>Price each</span><input type="number" id="sl-p" value="' + Math.max(1, Math.round((it.price || 100) * 0.9)) + '" min="1"></label>' +
      '<button class="btn" data-act="listgo" data-id="' + id + '">List it</button>');
  };
  H.listgo = function (id) {
    var r = GAME.market.sell(id, num('#sl-q', 1), num('#sl-p', 1));
    GAME.ui.closeModal();
    if (ok(r, 'Listed.')) GAME.ui.render();
  };
  H.mktsearch = function () { S.uiMktQ = val('#mq', ''); GAME.ui.render(); };
  H.mktbuy = function (id) { if (ok(GAME.market.buy(Number(id), 1))) GAME.ui.render(); };
  H.cancellist = function (id) { if (ok(GAME.market.cancel(Number(id)), 'Pulled.')) GAME.ui.render(); };

  /* ---- truck stop / fence ---- */
  H.fbuy = function (id, n) { if (ok(GAME.fence.buy(id, Number(n)))) GAME.ui.render(); };
  H.fsell = function (id, n) {
    var r = GAME.fence.sell(id, Number(n));
    if (!ok(r)) return;
    GAME.ui.toast('Sold ' + r.qty + ' for ' + money(r.got) + ' (' + (r.profit >= 0 ? '+' : '') + money(r.profit) + ').', r.profit >= 0 ? 'good' : 'warn');
    GAME.ui.render();
  };

  /* ---- bank / property ---- */
  H.deposit = function () { if (ok(GAME.bank.deposit(num('#bank-amt', 0)))) GAME.ui.render(); };
  H.withdraw = function () { if (ok(GAME.bank.withdraw(num('#bank-amt', 0)))) GAME.ui.render(); };
  H.depositall = function () { if (ok(GAME.bank.deposit(S.player.money))) GAME.ui.render(); };
  H.buyprop = function (id) { if (ok(GAME.props.buy(id))) GAME.ui.render(); };
  H.sellprop = function (id) { if (ok(GAME.props.sell(id))) GAME.ui.render(); };

  /* ---- gambling ---- */
  H.slots = function () {
    var r = GAME.casino.slots(num('#stake', 0));
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    S.lastGamble = { win: r.win > 0, text: r.reels.join(' | ') + (r.win ? '  ---  ' + money(r.win) + '!' : '  ---  nothing.') };
    GAME.ui.render();
  };
  H.roulette = function (c) {
    var r = GAME.casino.roulette(num('#stake', 0), c);
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    S.lastGamble = { win: r.win > 0, text: 'The ball drops on ' + r.num + ' ' + (r.num === 0 ? 'green' : r.red ? 'red' : 'black') + '. ' + (r.win ? money(r.win) + '!' : 'You lose.') };
    GAME.ui.render();
  };
  H.highlow = function (g) {
    var r = GAME.casino.highlow(num('#stake', 0), g);
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    S.lastGamble = { win: r.win > 0, text: 'Showing ' + r.card + ', next was ' + r.next + '. ' + (r.win ? money(r.win) + '!' : 'You lose.') };
    GAME.ui.render();
  };
  H.lotto = function (n) { if (ok(GAME.lottery.buy(Number(n)))) GAME.ui.render(); };
  H.lottodraw = function () {
    var r = GAME.lottery.draw();
    if (!ok(r)) return;
    GAME.ui.toast(r.prize ? 'You matched ' + r.best + ' and took ' + money(r.prize) + '.' : 'Best was ' + r.best + '. Nothing.', r.prize ? 'good' : 'warn');
    GAME.ui.render();
  };
  H.stockbuy = function (id) { if (ok(GAME.stocks.buy(id, num('#shares', 1)))) GAME.ui.render(); };
  H.stocksell = function (id) {
    var r = GAME.stocks.sell(id, num('#shares', 1));
    if (!ok(r)) return;
    GAME.ui.toast('Sold for ' + money(r.got) + ' (' + (r.profit >= 0 ? '+' : '') + money(r.profit) + ').', r.profit >= 0 ? 'good' : 'warn');
    GAME.ui.render();
  };

  /* ---- mail ---- */
  H.mailfolder = function (id) { S.uiMailFolder = id; S.uiMailOpen = null; GAME.ui.render(); };
  H.mailopen = function (id) { GAME.mail.read(Number(id)); S.uiMailOpen = Number(id); GAME.ui.render(); };
  H.mailclose = function () { S.uiMailOpen = null; GAME.ui.render(); };
  H.maildel = function (id) { GAME.mail.del(Number(id)); S.uiMailOpen = null; GAME.ui.render(); };
  H.mailreadall = function () { GAME.mail.readAll(); GAME.ui.render(); };
  H.mailcompose = function () { composeTo(null); };
  H.mailto = function (id) { composeTo(Number(id)); };
  function composeTo(id) {
    var n = id ? byId(id) : null;
    GAME.ui.modal('New Message',
      '<label class="f"><span>To</span><input type="text" id="mc-to" value="' + esc(n ? n.name : '') + '" placeholder="screen name"></label>' +
      '<label class="f"><span>Subject</span><input type="text" id="mc-sub" value="" maxlength="60"></label>' +
      '<textarea id="mc-body" placeholder="..."></textarea>' +
      '<button class="btn" data-act="mailsend">Send</button>');
  }
  H.mailsend = function () {
    var nm = String(val('#mc-to', '')).toLowerCase().trim();
    var target = null;
    for (var i = 0; i < S.npcs.length; i++) if (S.npcs[i].name.toLowerCase() === nm) target = S.npcs[i];
    if (!target) { GAME.ui.toast('No player by that name.', 'bad'); return; }
    var r = GAME.mail.send(target.id, val('#mc-sub', '(no subject)'), val('#mc-body', ''));
    GAME.ui.closeModal();
    if (ok(r, 'Sent.')) GAME.ui.render();
  };

  /* ---- forum ---- */
  H.board = function (id) { S.uiBoard = id; S.uiThread = null; GAME.ui.render(); };
  H.boardback = function () { S.uiBoard = null; S.uiThread = null; GAME.ui.render(); };
  H.thread = function (id) { S.uiThread = Number(id); GAME.ui.render(); };
  H.reply = function (id) {
    var r = GAME.forumSim.post(Number(id), val('#fpost', ''));
    if (!ok(r)) return;
    GAME.ui.render();
  };
  H.newthread = function () {
    GAME.ui.modal('New Thread',
      '<label class="f"><span>Title</span><input type="text" id="nt-title" maxlength="90"></label>' +
      '<textarea id="nt-body" placeholder="..."></textarea>' +
      '<button class="btn" data-act="newthreadgo">Post it</button>');
  };
  H.newthreadgo = function () {
    var r = GAME.forumSim.create(S.uiBoard || 'general', val('#nt-title', ''), val('#nt-body', ''));
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    GAME.ui.closeModal();
    S.uiThread = r.id;
    GAME.ui.render();
  };

  /* ---- family ---- */
  H.viewfam = function (id) { GAME.ui.go('family', { id: id }); };
  H.joinfam = function (id) { if (ok(GAME.family.join(Number(id)))) GAME.ui.go('family'); };
  H.leavefam = function () {
    GAME.ui.confirmBox('Leave the family?', 'They will take it personally. Some of them will take it very personally.', 'leavefamgo');
  };
  H.leavefamgo = function () { GAME.ui.closeModal(); if (ok(GAME.family.leave())) GAME.ui.go('family'); };
  H.foundfam = function () {
    var r = GAME.family.found(val('#fam-name', ''), val('#fam-tag', ''));
    if (ok(r, 'Registered.')) GAME.ui.go('family');
  };
  H.declarewar = function () {
    var all = GAME.family.all().filter(function (f) { return f.id !== S.player.fam; });
    GAME.ui.modal('Declare War',
      '<p class="dim">Your people will start hunting theirs. Theirs will start hunting you.</p>' +
      '<select id="war-t">' + all.map(function (f) { return '<option value="' + f.id + '">' + esc(f.name) + '</option>'; }).join('') + '</select> ' +
      '<button class="btn red" data-act="declarewargo">Declare</button>');
  };
  H.declarewargo = function () {
    var r = GAME.family.declareWar(Number(val('#war-t', 0)));
    GAME.ui.closeModal();
    if (ok(r, 'It is on.')) GAME.ui.render();
  };

  H.rankmode = function (id) { S.uiRankMode = id; GAME.ui.render(); };

  /* ---- points ---- */
  H.refill = function (which) {
    var r = GAME.points.refill(which);
    if (!ok(r)) return;
    GAME.ui.toast(r.warned ? 'Will refilled. Your Energy is gone, exactly as advertised.' : which + ' refilled.', r.warned ? 'warn' : 'good');
    GAME.ui.render();
  };
  H.buyattack = function (n) { if (ok(GAME.points.buyAttack(Number(n)), 'Attacks bought.')) GAME.ui.render(); };
  H.buyiq = function (n) { if (ok(GAME.points.buyIQ(Number(n)), 'IQ up.')) GAME.ui.render(); };
  H.sprhosp = function () { if (ok(GAME.points.springHospital(), 'Discharged.')) GAME.ui.render(); };
  H.sprjail = function () { if (ok(GAME.points.springJail(), 'You walk.')) GAME.ui.render(); };
  H.ptbuy = function (id) { if (ok(GAME.points.buyPoints(Number(id)), 'Points bought.')) GAME.ui.render(); };
  H.ptsell = function () { if (ok(GAME.points.sellPoints(num('#pt-qty', 0), num('#pt-price', 0)), 'Listed.')) GAME.ui.render(); };
  H.vote = function (site) {
    var r = GAME.points.vote(site);
    if (!ok(r)) return;
    GAME.ui.toast('+' + r.got + ' points. ' + r.left + ' left today.', 'good');
    GAME.ui.render();
  };

  /* ---- hospital / jail / lawyer ---- */
  H.hospout = function () { if (ok(GAME.hospital.checkOut(), 'Discharged.')) GAME.ui.render(); };
  H.bailself = function () { if (ok(GAME.jail.bailSelf(), 'You walk.')) GAME.ui.render(); };
  H.bailout = function (id) {
    var r = GAME.jail.bailOut(Number(id));
    if (!ok(r)) return;
    GAME.ui.toast('You bailed out ' + r.name + '.', 'good');
    GAME.ui.render();
  };
  H.bust = function (id) {
    var r = GAME.jail.bust(Number(id));
    if (r.err) return GAME.ui.toast(r.err, 'bad');
    GAME.ui.toast(r.ok ? 'You got ' + r.name + ' out.' : 'Caught. ' + Math.round(r.secs / 60) + ' minutes for you.', r.ok ? 'good' : 'bad');
    GAME.ui.render();
  };
  H.lawjail = function () {
    var r = GAME.lawyer.springJail();
    if (!ok(r)) return;
    GAME.ui.toast(r.dropped ? 'Charges dropped. You walk.' : 'Dewey got ' + r.cut + '% off the sentence.', r.dropped ? 'good' : 'warn');
    GAME.ui.render();
  };
  H.lawhosp = function () { if (ok(GAME.lawyer.springHosp(), 'Settled.')) GAME.ui.render(); };
  H.retain = function () { if (ok(GAME.lawyer.retain(), 'Howe is on call.')) GAME.ui.render(); };

  /* ---- settings ---- */
  H.pace = function (id) {
    CFG.pace = Number(id);
    S.settings.pace = CFG.pace;
    GAME.ui.toast('Pace set.', 'good');
    GAME.ui.render();
  };
  H.saveprofile = function () {
    S.player.sig = val('#set-sig', '');
    S.player.bio = val('#set-bio', '');
    GAME.ui.toast('Profile saved.', 'good');
    GAME.save.write(true);
  };
  H.exportsave = function () {
    if (!GAME.save.download()) GAME.ui.toast('Your browser blocked the download. Use "Show save text" instead.', 'bad');
  };
  H.showsave = function () {
    GAME.ui.modal('Your Save', '<p class="dim">Copy all of this and keep it somewhere.</p><textarea style="min-height:220px" readonly>' +
      esc(GAME.save.exportText()) + '</textarea>');
  };
  H.importsave = function () {
    var txt = val('#imp', '') || val('#ng-imp', '');
    if (!txt) return GAME.ui.toast('Paste a save first.', 'bad');
    var err = GAME.save.importText(txt);
    if (err) return GAME.ui.toast(err, 'bad');
    reindex();
    GAME.normalize.run();
    GAME.progress.applyLevel(S.player);
    CFG.pace = (S.settings && S.settings.pace) || 1;
    GAME.sim.catchUp(Date.now());
    GAME.save.write(true);
    GAME.ui.toast('Save loaded.', 'good');
    GAME.ui.go('city');
  };
  H.wipe = function () {
    GAME.ui.confirmBox('Delete everything?', 'The city, the two hundred, your rung, all of it. There is no undo.', 'wipego');
  };
  H.wipego = function () {
    GAME.ui.closeModal();
    GAME.sim.stop();
    GAME.save.wipe().then(function () {
      S = null;
      GAME.boot.newGameScreen();
    });
  };

  H.startgame = function () {
    var name = String(val('#ng-name', '')).trim();
    if (name.length < 2) return GAME.ui.toast('Pick a screen name.', 'bad');
    if (name.length > 22) name = name.slice(0, 22);
    var ci = Number(val('#ng-city', 0));
    var city = (DATA.names.cities || [])[ci] || { name: 'Brooklyn, NY', hood: '' };
    var g = 'm';
    var radios = $$('input[name=ng-g]');
    for (var i = 0; i < radios.length; i++) if (radios[i].checked) g = radios[i].value;
    GAME.boot.start({ name: name, city: city.name, hood: city.hood, gender: g });
  };

  /* ---- the knock ------------------------------------------------
     Six clicks on CITY, quickly, and the back office opens. Nothing
     advertises it and nothing else in the game uses the gesture.
  ------------------------------------------------------------------ */
  var knocks = [];
  function cityKnock() {
    var now = Date.now();
    knocks = knocks.filter(function (t) { return now - t < 2500; });
    knocks.push(now);
    if (knocks.length >= 6) {
      knocks = [];
      GAME.admin.show();
      return true;
    }
    return false;
  }

  /* ---- dispatch ---- */
  function onClick(e) {
    var t = e.target;
    /* walk up to the nearest actionable element */
    var el2 = t, act = null, who = null, nav = null, navFam = null, depth = 0;
    while (el2 && depth++ < 6) {
      if (el2.getAttribute) {
        act = act || el2.getAttribute('data-act');
        who = who || el2.getAttribute('data-who');
        nav = nav || el2.getAttribute('data-nav');
        navFam = navFam || el2.getAttribute('data-nav-fam');
        if (act || who || nav || navFam) break;
      }
      el2 = el2.parentNode;
    }
    if (navFam) { e.preventDefault(); GAME.ui.go('family', { id: navFam }); return; }
    if (nav) {
      e.preventDefault();
      if (nav === 'city' && cityKnock()) return;
      GAME.ui.go(nav);
      return;
    }
    if (who !== null && who !== undefined && !act) {
      e.preventDefault();
      GAME.ui.go('profile', { id: who });
      return;
    }
    if (!act) return;
    e.preventDefault();
    if (el2.classList && el2.classList.contains('off')) return;
    var fn = H[act];
    if (!fn) return;
    try {
      fn(el2.getAttribute('data-id'), el2.getAttribute('data-n'));
    } catch (err) {
      if (window.console) console.error('action ' + act, err);
      GAME.ui.toast('Something broke doing that: ' + (err && err.message), 'bad');
    }
    GAME.save.markDirty();
  }

  function onChange(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    if (t.getAttribute('data-act') === 'ocpick') {
      GAME.oc.assign(t.getAttribute('data-id'), t.value === '' ? null : Number(t.value));
      GAME.ui.render();
    }
  }

  function onKey(e) {
    if (e.key === 'Enter') {
      var id = e.target && e.target.id;
      if (id === 'shout-in') { H.shout(); e.preventDefault(); }
      else if (id === 'pq') { H.psearch(); e.preventDefault(); }
      else if (id === 'mq') { H.mktsearch(); e.preventDefault(); }
      else if (id === 'ng-name') { H.startgame(); e.preventDefault(); }
    }
    if (e.key === 'Escape') GAME.ui.closeModal();
  }

  function bind() {
    document.addEventListener('click', onClick, false);
    document.addEventListener('change', onChange, false);
    document.addEventListener('keydown', onKey, false);
  }

  return { bind: bind, H: H };
})();
