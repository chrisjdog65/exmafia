/* ============================================================
   60-ui.js :: shell, router, chrome
   ============================================================ */

var PAGES = {};

var NAV = [
  { grp: 'The City' },
  { r: 'city', t: 'City' },
  { r: 'crimes', t: 'Crimes' },
  { r: 'jobs', t: 'Your Job' },
  { r: 'streets', t: 'Go For A Walk' },
  { r: 'gym', t: 'Gym' },
  { r: 'pointgym', t: 'Point Gym' },
  { r: 'school', t: 'Local Schools' },
  { r: 'travel', t: 'Travel' },

  { grp: 'Violence' },
  { r: 'ladder', t: 'Attack Ladder', hot: true },
  { r: 'oc', t: 'Organised Crime' },
  { r: 'board', t: 'Notice Board' },
  { r: 'players', t: 'Players' },
  { r: 'hitlist', t: 'Hitlist' },
  { r: 'bodyguard', t: 'Bodyguard' },

  { grp: 'Money' },
  { r: 'shop', t: 'Shop' },
  { r: 'market', t: 'Item Market' },
  { r: 'auction', t: 'Auction' },
  { r: 'truckstop', t: 'Truck Stop' },
  { r: 'fence', t: 'Downtown Fence' },
  { r: 'bank', t: 'Bank' },
  { r: 'property', t: 'Property' },
  { r: 'casino', t: 'Casino' },
  { r: 'lottery', t: 'Lottery' },
  { r: 'stocks', t: 'Stock Market' },

  { grp: 'Points' },
  { r: 'trade', t: 'Trade Point' },
  { r: 'pointmarket', t: 'Point Market' },
  { r: 'vote', t: 'Vote' },

  { grp: 'You' },
  { r: 'profile', t: 'My Profile' },
  { r: 'inventory', t: 'Inventory' },
  { r: 'mail', t: 'Mail' },
  { r: 'family', t: 'Family' },
  { r: 'log', t: 'My Events' },

  { grp: 'The Round' },
  { r: 'round', t: 'Round & Rumble' },

  { grp: 'Community' },
  { r: 'newspaper', t: 'Newspaper' },
  { r: 'forum', t: 'Forums' },
  { r: 'rankings', t: 'Rankings' },
  { r: 'lawyer', t: 'Lawyer' },
  { r: 'hospital', t: 'Hospital' },
  { r: 'jail', t: 'Jail' },

  { grp: 'Account' },
  { r: 'help', t: 'How To Play' },
  { r: 'settings', t: 'Settings' }
];

GAME.ui = (function () {

  var route = 'city';
  var params = {};
  var lastRender = 0;
  var booted = false;

  function go(r, p) {
    route = r; params = p || {};
    try { window.location.hash = '#/' + r + (p && p.id !== undefined ? '/' + p.id : ''); } catch (e) {}
    render();
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function current() { return route; }
  function param(k) { return params[k]; }

  function fromHash() {
    var h = (window.location.hash || '').replace(/^#\/?/, '');
    if (!h) return null;
    var bits = h.split('/');
    return { r: bits[0], id: bits[1] };
  }

  /* ---------- chrome pieces ---------- */

  function meter(cls, label, cur, max, extra) {
    var pct = max > 0 ? clamp(cur / max * 100, 0, 100) : 0;
    return '<div class="meter"><div class="lbl"><span>' + label + '</span><b>' +
      fmt(Math.floor(cur)) + '/' + fmt(max) + (extra ? ' <span class="dim">' + extra + '</span>' : '') +
      '</b></div><div class="bar ' + cls + '"><i style="width:' + pct.toFixed(1) + '%" class="' + (pct >= 100 ? 'full' : '') + '"></i></div></div>';
  }

  function nextTickText(key, every) {
    var p = S.player, r = p.regen[key] || NOW();
    var cur = p[key];
    var max = p[key + 'Max'];
    if (cur >= max) return 'full';
    return clock(every - ((NOW() - r) % every));
  }

  function meters() {
    var p = S.player;
    var hm = maxHealth(p);
    var hosp = p.hospUntil > NOW();
    return '<div class="meters">' +
      meter('energy', 'Energy', p.energy, p.energyMax, nextTickText('energy', GAME.player.energyRegenMs())) +
      meter('brave', 'Brave', p.nerve, p.nerveMax, nextTickText('nerve', paced(CFG.NERVE_TICK))) +
      meter('will', 'Will', p.will, p.willMax, nextTickText('will', paced(CFG.WILL_TICK))) +
      meter('dex', 'Dexterity', p.dexg || 0, p.dexgMax || 20, nextTickText('dexg', paced(CFG.DEX_TICK))) +
      meter('health', 'Health', hosp ? 0 : p.health, hm, hosp ? clock(p.hospUntil - NOW()) : (p.health >= hm ? 'full' : '')) +
      '<div class="meter"><div class="lbl"><span>Attacks Remaining</span><b>' + p.attacks + '/' + p.attacksMax +
        ' <span class="dim">' + nextTickText('attacks', paced(CFG.ATTACK_TICK)) + '</span></b></div>' +
        '<div class="bar"><i style="width:' + clamp(p.attacks / Math.max(1, p.attacksMax) * 100, 0, 100) + '%"></i></div></div>' +
      '<div class="meter"><div class="lbl"><span>Experience</span><b>' + fmtShort(p.xp) + '</b></div>' +
        '<div class="bar xp"><i style="width:' + xpPct() + '%"></i></div></div>' +
      '</div>';
  }

  function xpPct() {
    var p = S.player;
    var a = GAME.progress.xpForLevel(p.level), b = GAME.progress.xpForLevel(p.level + 1);
    if (b <= a) return 100;
    return clamp((p.xp - a) / (b - a) * 100, 0, 100).toFixed(1);
  }

  function statusChips() {
    var p = S.player, out = [], now = NOW();
    if (p.hospUntil > now) out.push('<span class="chip hosp">Hospital ' + clock(p.hospUntil - now) + '</span>');
    if (p.jailUntil > now) out.push('<span class="chip jail">Jail ' + clock(p.jailUntil - now) + '</span>');
    if ((p.bgUntil || 0) > now && !GAME.ladder.onLadder(0)) out.push('<span class="chip guard">Bodyguard ' + clock(p.bgUntil - now) + '</span>');
    if ((p.travelUntil || 0) > now) out.push('<span class="chip air">Landing in ' + clock(p.travelUntil - now) + '</span>');
    if (GAME.lawyer.onRetainer()) out.push('<span class="chip">Howe on retainer</span>');
    return out.join(' ');
  }

  function masthead() {
    var p = S.player;
    var rank = GAME.progress.rankFor(p.xp);
    var rung = GAME.ladder.rungOf(0);
    var seasonBit = GAME.season.showCountdown()
      ? ' &nbsp;&middot;&nbsp; <b class="warn">ROUND ' + GAME.season.number() + ' ENDS IN ' +
        (GAME.season.over() ? 'THE RUMBLE' : Math.ceil(GAME.season.left() / DAY) + ' DAYS') + '</b>'
      : ' &nbsp;&middot;&nbsp; round ' + GAME.season.number() + ', week ' + GAME.season.week();
    return '<div class="masthead">' +
      '<div class="logo">ex<em>Mafia</em></div>' +
      '<div class="tagline">TEXT BASED MAFIA RPG &nbsp;&middot;&nbsp; ' + fmt(S.npcs.length + 1) + ' registered &nbsp;&middot;&nbsp; ' +
      GAME.sim.onlineCount() + ' online now' + seasonBit + '</div>' +
      '<div class="mast-right">' +
        '<b>' + esc(p.name) + '</b> &nbsp; <span class="dim">lvl</span> <b>' + p.level + '</b><br>' +
        '<span class="dim">' + esc(rank.name) + '</span><br>' +
        '<b class="warn">' + money(p.money) + '</b> cash<br>' +
        '<span class="dim">' + fmt(p.points || 0) + ' points</span>' +
        (rung ? '<br><span class="tag ' + (rung === 1 ? 'gf' : 'ladder') + '">' + (rung === 1 ? 'THE GODFATHER' : 'LADDER RUNG ' + rung) + '</span>' : '') +
      '</div></div>';
  }

  function navHtml() {
    var unread = GAME.mail.unread();
    var out = '<div class="box nav"><h3>Main Menu</h3>';
    for (var i = 0; i < NAV.length; i++) {
      var n = NAV[i];
      if (n.grp) { out += '<div class="grp">' + n.grp + '</div>'; continue; }
      var badge = '';
      if (n.r === 'mail' && unread) badge = '<span class="badge">' + unread + '</span>';
      if (n.r === 'ladder' && GAME.ladder.onLadder(0)) badge = '<span class="badge gold">' + GAME.ladder.rungOf(0) + '</span>';
      if (n.r === 'jail' && GAME.player.inJail()) badge = '<span class="badge">!</span>';
      if (n.r === 'hospital' && GAME.player.inHospital()) badge = '<span class="badge">!</span>';
      if (n.r === 'round' && GAME.season.over() && !S.rumbleDone) badge = '<span class="badge gold">!</span>';
      if (n.r === 'board') {
        var ready = GAME.contracts.active().filter(function (c) { return GAME.contracts.isDone(c); }).length;
        if (ready) badge = '<span class="badge green">' + ready + '</span>';
      }
      if (n.r === 'school') {
        var sc = GAME.school.current();
        if (sc && sc.done) badge = '<span class="badge green">&#10003;</span>';
      }
      out += '<a href="#/' + n.r + '" data-nav="' + n.r + '" class="' + (route === n.r ? 'on' : '') + '">' + badge + n.t + '</a>';
    }
    out += '</div>';
    return out;
  }

  function shoutbox() {
    return '<div class="box"><h3>Shoutbox <span class="sub" id="sb-count">' + GAME.sim.onlineCount() + ' on</span></h3>' +
      '<div class="shout" id="shout">' + shoutLines() + '</div>' +
      '<div class="shoutform"><input type="text" id="shout-in" maxlength="180" placeholder="say something..."><button class="btn sm" data-act="shout">Send</button></div>' +
      '</div>';
  }

  function shoutLines() {
    var c = GAME.feed.recentChat(70), out = '';
    for (var i = 0; i < c.length; i++) {
      var l = c[i];
      out += '<div class="ln' + (l.id === 0 ? ' me' : '') + '"><span class="tm">' + stampShort(l.t) + '</span> ' +
        '<span class="who" data-who="' + l.id + '">' + esc(l.n) + ':</span> ' + esc(l.x) + '</div>';
    }
    return out;
  }

  function onlineBox() {
    var on = GAME.sim.onlineList().slice(0, 60);
    on.sort(function (a, b) { return b.level - a.level; });
    var out = '<div class="box"><h3>Online Now <span class="sub">' + GAME.sim.onlineCount() + '</span></h3><div class="onlist" id="onlist">';
    for (var i = 0; i < on.length; i++) {
      var n = on[i];
      out += '<div class="u" data-who="' + n.id + '"><span class="dot"></span>' +
        '<span class="nm">' + esc(n.name) + '</span><span class="lv">' + n.level + '</span></div>';
    }
    out += '</div><div style="padding:5px"><a class="btn sm wide" href="#/players" data-nav="players">Total Players &raquo;</a></div></div>';
    return out;
  }

  function newsBox() {
    return '<div class="box"><h3>The Word On The Street</h3><div class="feed" id="newsfeed">' + newsLines(28) + '</div></div>';
  }

  function newsLines(n) {
    var f = GAME.feed.recentNews(n), out = '';
    for (var i = 0; i < f.length; i++) {
      out += '<div class="ln k-' + f[i].k + '"><span class="tm">' + stampShort(f[i].t) + '</span> ' + esc(f[i].x) + '</div>';
    }
    return out || '<div class="ln dim">Quiet so far tonight.</div>';
  }

  function blocker() {
    var b = GAME.player.blocked();
    if (!b) return '';
    if (b.why === 'hospital') {
      return '<div class="blocker"><b>You are in a hospital bed.</b> ' + esc(b.text || '') +
        ' <span class="chip hosp">' + clock(b.until - NOW()) + '</span><br>' +
        '<span class="dim">Read the newspaper while you wait, or </span>' +
        '<a class="btn sm" href="#/hospital" data-nav="hospital">check out early</a></div>';
    }
    if (b.why === 'jail') {
      return '<div class="blocker jail"><b>You are in jail.</b> ' + esc(b.text || '') +
        ' <span class="chip jail">' + clock(b.until - NOW()) + '</span><br>' +
        '<span class="dim">Bail is ' + money(S.player.bail || 0) + '. </span>' +
        '<a class="btn sm" href="#/jail" data-nav="jail">Go to Jail page</a> ' +
        '<a class="btn sm" href="#/lawyer" data-nav="lawyer">Call Dewey</a></div>';
    }
    return '<div class="blocker"><b>You are in transit.</b> ' + esc(b.text || '') +
      ' <span class="chip air">' + clock(b.until - NOW()) + '</span></div>';
  }

  function ticker() {
    var gf = byId(GAME.ladder.godfatherId());
    var top = GAME.ladder.rows().slice(0, 3).map(function (r) { return esc(r.e.name); }).join(' &middot; ');
    return '<div class="ticker"><b>GODFATHER:</b> ' + (gf ? esc(gf.name) : '&mdash;') +
      ' &nbsp;|&nbsp; <b>LADDER:</b> ' + top +
      ' &nbsp;|&nbsp; <b>' + GAME.sim.onlineCount() + '</b> online' +
      ' &nbsp;|&nbsp; <b>' + fmt((S.hitlist || []).length) + '</b> on the hitlist</div>';
  }

  /* ---------- render ---------- */

  function render() {
    if (!S) return;
    var body;
    try {
      body = (PAGES[route] || PAGES.city)();
    } catch (e) {
      if (window.console) console.error('page ' + route, e);
      body = '<div class="box"><h3>Something went wrong</h3><div class="bd"><p class="bad">' +
        esc(e && e.message) + '</p><p class="dim mono" style="white-space:pre-wrap">' + esc(e && e.stack) + '</p></div></div>';
    }

    var html = masthead() +
      '<div class="box"><div class="bd">' + meters() +
      (statusChips() ? '<div class="hr"></div>' + statusChips() : '') + '</div></div>' +
      '<div class="wrap">' +
        '<div class="col-left">' + navHtml() + saveBox() + '</div>' +
        '<div class="col-mid">' + ticker() + blocker() + body + '</div>' +
        '<div class="col-right">' + shoutbox() + onlineBox() + newsBox() + '</div>' +
      '</div>' + footer();

    resetSig();
    $('#root').innerHTML = html;
    var sh = $('#shout'); if (sh) sh.scrollTop = sh.scrollHeight;
    lastRender = NOW();
  }

  function saveBox() {
    var ago2 = GAME.save.lastSaved ? Math.round((Date.now() - GAME.save.lastSaved) / 1000) : null;
    return '<div class="box"><h3>Game</h3><div class="bd">' +
      '<div class="dim" style="font-size:9.5px;line-height:1.6">Saved ' +
      (ago2 === null ? 'not yet' : ago2 + 's ago') + '<br>Storage: ' + GAME.save.backend() + '</div>' +
      '<div class="hr"></div>' +
      '<button class="btn sm wide" data-act="savenow">Save Now</button>' +
      '</div></div>';
  }

  function footer() {
    return '<div class="foot">' +
      'exMafia single player &middot; a faithful offline recreation of the MySpace-era text mafia RPG<br>' +
      'Everything runs in this one file. Your game saves to this browser automatically.<br>' +
      '<a href="#/help" data-nav="help">How To Play</a> &middot; <a href="#/settings" data-nav="settings">Settings</a>' +
      '</div>';
  }

  /* ---------- live refresh ----------------------------------------
     Runs every second. Each region is only rewritten when its content
     has actually changed, so the page is not quietly reflowing under
     the cursor while you are trying to click something.
  ------------------------------------------------------------------- */
  var sig = {};
  function changed(key, value) {
    if (sig[key] === value) return false;
    sig[key] = value;
    return true;
  }
  function resetSig() { sig = {}; }

  function liveRefresh() {
    if (!S || !$('#root')) return;
    var p = S.player;

    var mSig = [Math.floor(p.energy), Math.floor(p.nerve), Math.floor(p.will), Math.floor(p.dexg || 0), Math.floor(p.health),
      p.attacks, p.energyMax, p.nerveMax, p.willMax, p.attacksMax, p.xp, p.level,
      Math.floor((p.hospUntil - NOW()) / 1000), Math.floor((NOW() - (p.regen.energy || 0)) / 1000)].join('|');
    if (changed('meters', mSig)) {
      var mBox = $('.meters');
      if (mBox) mBox.outerHTML = meters();
    }

    var chat = S.chat || [];
    var cSig = chat.length + ':' + (chat.length ? chat[chat.length - 1].t : 0);
    if (changed('chat', cSig)) {
      var sh = $('#shout');
      if (sh) {
        var atBottom = sh.scrollHeight - sh.scrollTop - sh.clientHeight < 40;
        sh.innerHTML = shoutLines();
        if (atBottom) sh.scrollTop = sh.scrollHeight;
      }
    }

    var news = S.news || [];
    var nSig = news.length + ':' + (news.length ? news[news.length - 1].t : 0);
    if (changed('news', nSig)) {
      var nf = $('#newsfeed');
      if (nf) nf.innerHTML = newsLines(28);
    }

    var on = GAME.sim.onlineList();
    if (changed('online', on.length + ':' + on.map(function (x) { return x.id; }).join(','))) {
      var ol = $('#onlist');
      if (ol) {
        var list = on.slice(0, 60).sort(function (a, b) { return b.level - a.level; });
        var o = '';
        for (var i = 0; i < list.length; i++) {
          o += '<div class="u" data-who="' + list[i].id + '"><span class="dot"></span><span class="nm">' +
            esc(list[i].name) + '</span><span class="lv">' + list[i].level + '</span></div>';
        }
        ol.innerHTML = o;
      }
      var sc = $('#sb-count');
      if (sc) sc.textContent = on.length + ' on';
    }

    var gf = byId(GAME.ladder.godfatherId());
    if (changed('ticker', (gf ? gf.name : '') + '|' + GAME.ladder.roster().slice(0, 3).join(',') + '|' + on.length + '|' + (S.hitlist || []).length)) {
      var tk = $('.ticker');
      if (tk) tk.outerHTML = ticker();
    }

    var b = GAME.player.blocked();
    var bSig = b ? b.why + ':' + Math.floor((b.until - NOW()) / 1000) : 'none';
    if (changed('blocker', bSig)) {
      var bl = $('.blocker');
      var mid = $('.col-mid');
      if (bl && !b) bl.parentNode.removeChild(bl);
      else if (bl && b) bl.outerHTML = blocker();
      else if (!bl && b && mid) mid.insertAdjacentHTML('afterbegin', blocker());
    }

    if (PAGES[route] && PAGES[route].live) {
      try { PAGES[route].live(); } catch (e) {}
    }
    drainAttacks();
  }

  function drainAttacks() {
    var q = S.pendingAttackedBy || [];
    if (!q.length) return;
    /* only surface them while the player is actually looking */
    while (q.length) {
      var a = q.shift();
      toast(a.line, a.won ? 'bad' : 'good');
    }
  }

  /* ---------- toast & modal ---------- */
  function toast(msg, kind) {
    var host = $('#toasts');
    if (!host) { host = el('div'); host.id = 'toasts'; document.body.appendChild(host); }
    var t = el('div', 'toast ' + (kind || ''), esc(msg));
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .4s'; t.style.opacity = '0';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 420);
    }, kind === 'bad' ? 6500 : 4200);
    while (host.children.length > 4) host.removeChild(host.firstChild);
  }

  function modal(title, html) {
    closeModal();
    var m = el('div');
    m.id = 'modal';
    m.innerHTML = '<div class="m"><h3><span class="x" data-act="closemodal">[ close ]</span>' + title + '</h3><div class="mb">' + html + '</div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
  }
  function closeModal() {
    var m = $('#modal');
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }

  function confirmBox(title, text, actYes) {
    modal(title, '<p>' + text + '</p><div class="hr"></div>' +
      '<button class="btn red" data-act="' + actYes + '">Yes, do it</button> ' +
      '<button class="btn" data-act="closemodal">Cancel</button>');
  }

  /* ---------- helpers pages can reuse ---------- */
  function avatarTag(n, size, cls) {
    return '<span class="av ' + (cls || '') + '" style="width:' + size + 'px;height:' + size + 'px">' +
      GAME.npc.avatar(n, size) + '</span>';
  }

  function userLink(n, opts) {
    opts = opts || {};
    var tags = '';
    var rung = GAME.ladder.rungOf(n.id);
    if (rung === 1) tags += ' <span class="tag gf">GF</span>';
    else if (rung) tags += ' <span class="tag ladder">R' + rung + '</span>';
    if (opts.status !== false) {
      var st = GAME.ladder.busy(n);
      if (st === 'hospital') tags += ' <span class="tag hosp">hosp</span>';
      else if (st === 'jail') tags += ' <span class="tag jail">jail</span>';
      else if (st === 'inactive') tags += ' <span class="tag off">gone</span>';
      else if (GAME.ladder.guarded(n)) tags += ' <span class="tag guard">guard</span>';
      else if (n.online) tags += ' <span class="tag on">on</span>';
    }
    if (n.bounty) tags += ' <span class="tag" style="background:#4a2b6b;color:#dcc4ff">' + fmtShort(n.bounty) + '</span>';
    return '<a href="#" data-who="' + n.id + '">' + esc(n.name) + '</a>' + tags;
  }

  function statusOf(n) {
    var st = GAME.ladder.busy(n);
    if (st === 'hospital') return '<span class="bad">Hospital ' + clock(n.hospUntil - NOW()) + '</span>';
    if (st === 'jail') return '<span class="warn">Jail ' + clock(n.jailUntil - NOW()) + '</span>';
    if (st === 'inactive') return '<span class="dimmer">Inactive</span>';
    if (st === 'abroad') return '<span class="dim">Abroad</span>';
    if (GAME.ladder.guarded(n)) return '<span class="tag guard">Bodyguard</span>';
    if (n.online) return '<span class="good">Online</span>';
    return '<span class="dim">' + ago(NOW() - (n.lastOnline || 0)) + '</span>';
  }

  function fightLog(res) {
    var out = '<div class="fightlog">';
    for (var i = 0; i < res.log.length; i++) {
      var l = res.log[i];
      var cls = l.k === 'hit' ? (l.side === 'a' ? 'a' : 'd') : (l.k === 'miss' ? 'miss' : l.k);
      out += '<div class="r ' + cls + '">' + esc(l.t).replace('CRITICAL HIT!', '<span class="crit">CRITICAL HIT!</span>') + '</div>';
    }
    out += '</div>';
    return out;
  }

  function money2(n) { return '<span class="' + (n >= 0 ? 'good' : 'bad') + '">' + (n >= 0 ? '+' : '') + money(n) + '</span>'; }

  function pageTitle(t, sub) {
    return '<div class="box"><h3>' + t + (sub ? '<span class="sub">' + sub + '</span>' : '') + '</h3>';
  }

  return {
    go: go, render: render, liveRefresh: liveRefresh, toast: toast, modal: modal,
    closeModal: closeModal, confirmBox: confirmBox, current: current, param: param,
    fromHash: fromHash, avatarTag: avatarTag, userLink: userLink, statusOf: statusOf,
    fightLog: fightLog, money2: money2, pageTitle: pageTitle, meters: meters,
    newsLines: newsLines, shoutLines: shoutLines,
    setBooted: function (v) { booted = v; }, booted: function () { return booted; }
  };
})();
