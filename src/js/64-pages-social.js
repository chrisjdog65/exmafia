/* ============================================================
   64-pages-social.js :: Mail, Forums, Family, Rankings,
   Newspaper, Trade Point, Point Market, Vote, My Events
   ============================================================ */

/* ---------------- Mail ---------------- */
PAGES.mail = function () {
  var folder = S.uiMailFolder || 'in';
  var open = S.uiMailOpen;
  var m = GAME.mail.inbox().filter(function (x) { return (x.folder || 'in') === folder; }).slice().reverse();

  var h = '<div class="box"><h3>Mail<span class="sub">' + GAME.mail.unread() + ' unread</span></h3><div class="bd">' +
    '<div class="cats">' +
    '<a href="#" class="' + (folder === 'in' ? 'on' : '') + '" data-act="mailfolder" data-id="in">Inbox</a>' +
    '<a href="#" class="' + (folder === 'sent' ? 'on' : '') + '" data-act="mailfolder" data-id="sent">Sent</a>' +
    '</div>' +
    '<button class="btn sm" data-act="mailcompose">Compose</button> ' +
    '<button class="btn sm" data-act="mailreadall">Mark all read</button>' +
    '</div>';

  if (open) {
    var msg = null, all = GAME.mail.inbox();
    for (var i = 0; i < all.length; i++) if (all[i].id === open) msg = all[i];
    if (msg) {
      var from = msg.from === -1 ? null : byId(msg.from);
      h += '<div class="bd"><div class="hr"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div><b>' + esc(msg.subj) + '</b><br><span class="dim">' +
        (msg.folder === 'sent' ? 'To ' : 'From ') +
        (from ? '<a href="#" data-who="' + from.id + '">' + esc(msg.folder === 'sent' ? msg.toName : msg.fromName) + '</a>' :
          '<b class="warn">' + esc(msg.folder === 'sent' ? msg.toName : msg.fromName) + '</b>') +
        ' &middot; ' + stamp(msg.t) + '</span></div>' +
        '<div class="nowrap">' +
        (from ? '<button class="btn sm" data-act="mailto" data-id="' + from.id + '">Reply</button> ' : '') +
        '<button class="btn sm" data-act="maildel" data-id="' + msg.id + '">Delete</button> ' +
        '<button class="btn sm" data-act="mailclose">Close</button></div></div>' +
        '<div class="mbody" style="margin-top:6px">' + esc(msg.body) + '</div>';
      if (from && from.sig) h += '<div class="dim mono" style="font-size:9.5px;white-space:pre-wrap;margin-top:6px">' + esc(tpl(from.sig, { me: from.name })) + '</div>';
      h += '</div>';
    }
  }

  h += '<div class="bd tight">';
  if (!m.length) h += '<div class="bd dim">Nothing here.</div>';
  for (var j = 0; j < m.length; j++) {
    var x = m[j];
    h += '<div class="mrow ' + (x.read ? '' : 'unread') + '" data-act="mailopen" data-id="' + x.id + '">' +
      '<span class="from">' + esc(x.folder === 'sent' ? x.toName : x.fromName) + '</span>' +
      '<span class="sj">' + esc(x.subj) + '</span>' +
      '<span class="dt">' + ago(NOW() - x.t) + '</span></div>';
  }
  h += '</div></div>';
  return h;
};

/* ---------------- Forums ---------------- */
PAGES.forum = function () {
  var board = S.uiBoard;
  var tid = S.uiThread;

  if (tid) return forumThread(tid);

  if (!board) {
    var h = '<div class="box"><h3>exMafia Forums</h3><div class="bd tight">';
    var bs = GAME.forumSim.boards();
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      var th = GAME.forumSim.byBoard(b.id);
      var last = th.length ? th[0] : null;
      h += '<div class="thread"><div class="ti"><a href="#" data-act="board" data-id="' + b.id + '"><b>' + esc(b.name) + '</b></a>' +
        '<div class="meta">' + esc(b.desc) + '</div></div>' +
        '<div class="meta nowrap">' + th.length + ' threads' +
        (last ? '<br>last: ' + ago(NOW() - GAME.forumSim.lastAt(last)) : '') + '</div></div>';
    }
    h += '</div></div>';
    return h;
  }

  var bo = null, bl = GAME.forumSim.boards();
  for (var k = 0; k < bl.length; k++) if (bl[k].id === board) bo = bl[k];
  var list = GAME.forumSim.byBoard(board);
  var out = '<div class="box"><h3>' + esc(bo ? bo.name : board) + '<span class="sub">' + list.length + ' threads</span></h3><div class="bd">' +
    '<button class="btn sm" data-act="boardback">All boards</button> ' +
    (board !== 'announce' ? '<button class="btn sm gold" data-act="newthread">New thread</button>' : '') +
    '</div><div class="bd tight">';
  for (var t = 0; t < Math.min(list.length, 60); t++) {
    var th2 = list[t];
    out += '<div class="thread"><div class="ti">' +
      (th2.sticky ? '<span class="tag gold">STICKY</span> ' : '') +
      (th2.locked ? '<span class="tag">LOCKED</span> ' : '') +
      '<a href="#" data-act="thread" data-id="' + th2.id + '">' + esc(th2.title) + '</a>' +
      '<div class="meta">by ' + esc(th2.authorName) + ' &middot; ' + th2.posts.length + ' posts &middot; ' + fmt(th2.views) + ' views</div></div>' +
      '<div class="meta nowrap">' + ago(NOW() - GAME.forumSim.lastAt(th2)) + '<br>' +
      esc(th2.posts[th2.posts.length - 1].authorName) + '</div></div>';
  }
  out += '</div></div>';
  return out;
};

function forumThread(id) {
  var th = GAME.forumSim.get(id);
  if (!th) return '<div class="box"><h3>Gone</h3><div class="bd">That thread was deleted.</div></div>';
  th.views++;
  var h = '<div class="box"><h3>' + esc(th.title) + '<span class="sub">' + th.posts.length + ' posts</span></h3><div class="bd">' +
    '<button class="btn sm" data-act="board" data-id="' + th.board + '">Back to board</button></div><div class="bd">';
  for (var i = 0; i < th.posts.length; i++) {
    var p = th.posts[i];
    var au = p.author === -1 ? null : byId(p.author);
    h += '<div class="post' + (p.author === 0 ? ' mine' : '') + '">' +
      '<div class="ph"><span>' +
      (au ? '<a href="#" data-who="' + au.id + '">' + esc(p.authorName) + '</a>' + (au.id !== 0 ? ' <span class="dimmer">lvl ' + au.level + '</span>' : ' <span class="warn">(you)</span>')
          : '<b class="warn">' + esc(p.authorName) + '</b>') +
      '</span><span class="dim">' + stamp(p.t) + ' &middot; #' + (i + 1) + '</span></div>' +
      '<div class="pb">' + esc(p.body) +
      (au && au.id !== 0 && au.sig && i % 3 === 0 ? '<div class="sig">' + esc(tpl(au.sig, { me: au.name })) + '</div>' : '') +
      '</div></div>';
  }
  if (!th.locked) {
    h += '<div class="hr"></div><textarea id="fpost" placeholder="post a reply"></textarea>' +
      '<button class="btn" data-act="reply" data-id="' + th.id + '">Post reply</button>';
  } else {
    h += '<p class="dim">This thread is locked.</p>';
  }
  h += '</div></div>';
  return h;
}

/* ---------------- Family ---------------- */
PAGES.family = function () {
  var viewId = GAME.ui.param('id');
  var mine = GAME.family.mine();
  var f = viewId ? GAME.family.get(Number(viewId)) : mine;

  var h = '';
  if (f) {
    var ms = GAME.family.membersOf(f);
    var leader = byId(f.leader);
    var isMine = mine && mine.id === f.id;
    h += '<div class="box"><h3>' + esc(f.name) + ' <span class="tag">' + esc(f.tag) + '</span><span class="sub">' + ms.length + ' members</span></h3><div class="bd">' +
      '<div class="pgrid" style="grid-template-columns:1fr 1fr">' +
      '<div class="prow"><span class="k">Boss</span><span class="v">' + (leader ? GAME.ui.userLink(leader, { status: false }) : '&mdash;') + '</span></div>' +
      '<div class="prow"><span class="k">Founded</span><span class="v">' + new Date(f.founded).toLocaleDateString() + '</span></div>' +
      '<div class="prow"><span class="k">Respect</span><span class="v">' + fmt(f.respect) + '</span></div>' +
      '<div class="prow"><span class="k">Combined power</span><span class="v">' + fmt(GAME.family.power(f)) + '</span></div>' +
      '<div class="prow"><span class="k">Recruiting</span><span class="v">' + (f.open ? '<span class="good">open</span>' : '<span class="dim">invite only</span>') + '</span></div>' +
      '<div class="prow"><span class="k">At war with</span><span class="v">' + (f.wars.length ? f.wars.map(function (w) { var o = famById(w); return o ? esc(o.name) : ''; }).join(', ') : '<span class="dim">nobody</span>') + '</span></div>' +
      '</div>';
    if (f.motd) h += '<div class="hr"></div><div class="dim">&ldquo;' + esc(f.motd) + '&rdquo;</div>';
    h += '<div class="hr"></div>';
    if (isMine) {
      h += '<button class="btn" data-act="leavefam">Leave the family</button> ';
      if (f.leader === 0) h += '<button class="btn red" data-act="declarewar">Declare war</button>';
    } else if (!mine) {
      h += '<button class="btn green ' + (f.open ? '' : 'off') + '" data-act="joinfam" data-id="' + f.id + '">Ask to join</button>';
    }
    h += '</div>';

    h += '<div class="scroll"><table class="t"><tr><th>Member</th><th>Role</th><th class="c">Lvl</th><th class="r">Respect</th><th class="c">Status</th></tr>';
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      h += '<tr><td><div class="who-line">' + GAME.ui.avatarTag(m, 22, 'sm') + '<span>' + (m.id === 0 ? '<b class="warn">' + esc(m.name) + '</b>' : GAME.ui.userLink(m, { status: false })) + '</span></div></td>' +
        '<td class="dim">' + esc(m.famRole || 'soldier') + '</td>' +
        '<td class="c">' + m.level + '</td>' +
        '<td class="r">' + fmt(m.respect || 0) + '</td>' +
        '<td class="c">' + GAME.ui.statusOf(m) + '</td></tr>';
    }
    h += '</table></div></div>';
  }

  if (!mine) {
    h += '<div class="box"><h3>Families<span class="sub">' + GAME.family.all().length + '</span></h3>' +
      '<div class="scroll"><table class="t"><tr><th>Family</th><th class="c">Members</th><th class="r">Power</th><th class="c">Recruiting</th><th></th></tr>';
    var all = GAME.family.ranked();
    for (var j = 0; j < all.length; j++) {
      var fa = all[j];
      h += '<tr><td><a href="#" data-act="viewfam" data-id="' + fa.id + '"><b>' + esc(fa.name) + '</b></a> <span class="tag">' + esc(fa.tag) + '</span></td>' +
        '<td class="c">' + GAME.family.membersOf(fa).length + '</td>' +
        '<td class="r">' + fmt(GAME.family.power(fa)) + '</td>' +
        '<td class="c">' + (fa.open ? '<span class="good">open</span>' : '<span class="dim">closed</span>') + '</td>' +
        '<td class="r"><button class="btn sm ' + (fa.open ? '' : 'off') + '" data-act="joinfam" data-id="' + fa.id + '">Join</button></td></tr>';
    }
    h += '</table></div></div>';
    h += '<div class="box"><h3>Start Your Own</h3><div class="bd">' +
      '<p class="dim">Registering a family costs ' + money(2500000) + '. You will be the boss and the recruiting is your problem.</p>' +
      '<label class="f"><span>Family name</span><input type="text" id="fam-name" maxlength="34"></label>' +
      '<label class="f"><span>Tag (up to 5 characters)</span><input type="text" id="fam-tag" maxlength="5"></label>' +
      '<button class="btn gold" data-act="foundfam">Register it</button></div></div>';
  }
  return h;
};

/* ---------------- Rankings ---------------- */
PAGES.rankings = function () {
  var mode = S.uiRankMode || 'level';
  var pool = S.npcs.filter(function (n) { return !n.dead; }).concat([S.player]);
  var key = {
    level: function (n) { return n.xp || 0; },
    power: function (n) { return GAME.combat.power(n); },
    money: function (n) { return (n.money || 0) + (n.bank || 0); },
    respect: function (n) { return n.respect || 0; },
    wins: function (n) { return n.id === 0 ? n.st.w : (n.w || 0); },
    crimes: function (n) { return n.id === 0 ? n.st.crimes : (n.crimes || 0); }
  }[mode] || function (n) { return n.xp || 0; };
  pool.sort(function (a, b) { return key(b) - key(a); });

  var h = '<div class="box"><h3>Rankings</h3><div class="bd"><div class="cats">' +
    [['level', 'Experience'], ['power', 'Fighting power'], ['money', 'Wealth'], ['respect', 'Respect'], ['wins', 'Attacks won'], ['crimes', 'Crimes']]
      .map(function (m) { return '<a href="#" class="' + (mode === m[0] ? 'on' : '') + '" data-act="rankmode" data-id="' + m[0] + '">' + m[1] + '</a>'; }).join('') +
    '</div></div><div class="scroll"><table class="t"><tr><th class="c">#</th><th>Player</th><th class="c">Lvl</th><th>Rank</th><th class="r">' + mode + '</th></tr>';
  for (var i = 0; i < Math.min(pool.length, 100); i++) {
    var n = pool[i];
    var me = n.id === 0;
    h += '<tr' + (me ? ' style="background:#241a12"' : '') + '><td class="c">' + (i + 1) + '</td>' +
      '<td><div class="who-line">' + GAME.ui.avatarTag(n, 22, 'sm') + '<span>' + (me ? '<b class="warn">' + esc(n.name) + ' (you)</b>' : GAME.ui.userLink(n, { status: false })) + '</span></div></td>' +
      '<td class="c">' + n.level + '</td>' +
      '<td class="dim">' + esc(GAME.progress.rankFor(n.xp || 0).name) + '</td>' +
      '<td class="r">' + (mode === 'money' ? money(key(n)) : fmt(key(n))) + '</td></tr>';
  }
  h += '</table></div></div>';
  return h;
};

/* ---------------- Newspaper ---------------- */
PAGES.newspaper = function () {
  var n = GAME.feed.recentNews(140);
  var h = '<div class="box"><h3>The City Ledger<span class="sub">' + new Date().toDateString() + '</span></h3>' +
    '<div class="bd"><p class="dim">Everything the city saw fit to write down. Somewhere to sit while the hospital clock runs.</p></div>' +
    '<div class="feed" style="max-height:none">';
  for (var i = 0; i < n.length; i++) {
    h += '<div class="ln k-' + n[i].k + '"><span class="tm">' + stamp(n[i].t) + '</span> ' + esc(n[i].x) + '</div>';
  }
  if (!n.length) h += '<div class="ln dim">Slow news day.</div>';
  h += '</div></div>';
  return h;
};

/* ---------------- My Events ---------------- */
PAGES.log = function () {
  var l = (S.log || []).slice().reverse();
  var h = '<div class="box"><h3>My Events<span class="sub">' + l.length + '</span></h3><div class="feed" style="max-height:none">';
  for (var i = 0; i < l.length; i++) {
    h += '<div class="ln k-' + (l[i].k === 'win' || l[i].k === 'crime' ? 'crime' : l[i].k === 'attacked' || l[i].k === 'lose' ? 'atk' : 'flavor') + '">' +
      '<span class="tm">' + stamp(l[i].t) + '</span> ' + esc(l[i].x) + '</div>';
  }
  if (!l.length) h += '<div class="ln dim">Nothing has happened to you yet.</div>';
  h += '</div></div>';
  return h;
};

/* ---------------- Trade Point ---------------- */
PAGES.trade = function () {
  var p = S.player, C = GAME.points.COSTS;
  var h = '<div class="box"><h3>Trade Point<span class="sub">' + fmt(p.points || 0) + ' points</span></h3><div class="bd">' +
    '<p class="dim">Trade points for refills of your Energy, Brave and Will, buy more attacks, gain IQ, or more.</p>' +
    '<p class="warn"><b>Refill your Will before your Energy.</b> Doing it the other way around will wipe out your energy in the process. ' +
    'Everybody learns this once.</p><div class="hr"></div>' +
    '<table class="t"><tr><th>Buy</th><th class="c">Cost</th><th class="c">You have</th><th></th></tr>' +
    tradeRow('Refill Will', C.will, Math.floor(p.will) + '/' + p.willMax, 'refill', 'will', (p.points || 0) >= C.will) +
    tradeRow('Refill Energy', C.energy, Math.floor(p.energy) + '/' + p.energyMax, 'refill', 'energy', (p.points || 0) >= C.energy) +
    tradeRow('Refill Brave', C.brave, Math.floor(p.nerve) + '/' + p.nerveMax, 'refill', 'brave', (p.points || 0) >= C.brave) +
    tradeRow('One more attack', C.attack, p.attacks + '/' + p.attacksMax, 'buyattack', '1', (p.points || 0) >= C.attack) +
    tradeRow('Five more attacks', C.attack * 5, '', 'buyattack', '5', (p.points || 0) >= C.attack * 5) +
    tradeRow('+1 IQ', C.iq, fmt(p.iq || 10), 'buyiq', '1', (p.points || 0) >= C.iq) +
    tradeRow('+10 IQ', C.iq * 10, '', 'buyiq', '10', (p.points || 0) >= C.iq * 10) +
    tradeRow('Out of hospital', C.hospital, GAME.player.inHospital() ? clock(p.hospUntil - NOW()) : 'not in', 'sprhosp', '', (p.points || 0) >= C.hospital && GAME.player.inHospital()) +
    tradeRow('Out of jail', C.jail, GAME.player.inJail() ? clock(p.jailUntil - NOW()) : 'not in', 'sprjail', '', (p.points || 0) >= C.jail && GAME.player.inJail()) +
    '</table></div>';
  h += '<div class="bd"><p class="dim">Points come from the Attack Ladder (' + GAME.ladder.POINTS_PER_HOUR +
    ' an hour while you hold a rung), from voting, from walking the streets, and from other players on the Point Market.</p></div></div>';
  return h;
};

function tradeRow(label, cost, have, act, id, enabled) {
  return '<tr><td><b>' + label + '</b></td><td class="c">' + cost + ' pts</td><td class="c dim">' + have + '</td>' +
    '<td class="r"><button class="btn sm ' + (enabled ? '' : 'off') + '" data-act="' + act + '" data-id="' + id + '">Buy</button></td></tr>';
}

/* ---------------- Point Market ---------------- */
PAGES.pointmarket = function () {
  var p = S.player, m = GAME.points.market().slice().sort(function (a, b) { return a.price - b.price; });
  var h = '<div class="box"><h3>Point Market<span class="sub">prices set by players</span></h3><div class="bd">' +
    '<p class="dim">Players post points for sale and set their own price. If you are short of points and long on cash, this is where you fix that.</p></div>' +
    '<div class="scroll"><table class="t"><tr><th>Seller</th><th class="c">Points</th><th class="r">Each</th><th class="r">Total</th><th></th></tr>';
  for (var i = 0; i < m.length; i++) {
    var r = m[i];
    h += '<tr><td>' + (r.seller === 0 ? '<b class="warn">you</b>' : esc(r.sellerName)) + '</td>' +
      '<td class="c">' + fmt(r.qty) + '</td>' +
      '<td class="r">' + money(r.price) + '</td>' +
      '<td class="r">' + money(r.price * r.qty) + '</td>' +
      '<td class="r">' + (r.seller === 0 ? '<span class="dim">listed</span>' :
        '<button class="btn sm ' + (p.money >= r.price ? '' : 'off') + '" data-act="ptbuy" data-id="' + r.id + '">Buy</button>') + '</td></tr>';
  }
  if (!m.length) h += '<tr><td colspan="5" class="dim">Nothing listed.</td></tr>';
  h += '</table></div>';
  h += '<div class="bd"><div class="hr"></div><b>Sell your points</b><br>' +
    '<label class="f"><span>How many (you have ' + fmt(p.points || 0) + ')</span><input type="number" id="pt-qty" value="50" min="1"></label>' +
    '<label class="f"><span>Price each</span><input type="number" id="pt-price" value="2500" min="1"></label>' +
    '<button class="btn" data-act="ptsell">List them</button></div></div>';
  return h;
};

/* ---------------- Vote ---------------- */
PAGES.vote = function () {
  var left = GAME.points.votesLeft();
  var h = '<div class="box"><h3>Vote For Us<span class="sub">' + left + ' points left today</span></h3><div class="bd">' +
    '<p class="dim">Click through to the game listing sites and vote. Each vote is worth 5 to 10 points and you can take up to 80 points a day this way.</p>' +
    '<p class="dimmer">(There is nothing on the other end of these buttons. There never really was.)</p><div class="hr"></div>';
  var s = GAME.points.sites();
  for (var i = 0; i < s.length; i++) {
    h += '<button class="btn ' + (left > 0 ? 'gold' : 'off') + '" data-act="vote" data-id="' + esc(s[i]) + '" style="margin:0 4px 4px 0">' + esc(s[i]) + '</button>';
  }
  h += '</div></div>';
  return h;
};
