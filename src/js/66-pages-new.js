/* ============================================================
   66-pages-new.js :: Organised Crime and the Notice Board
   ============================================================ */

PAGES.oc = function () {
  var p = S.player, f = GAME.family.mine();
  var sel = S.ocJob;
  var job = sel ? GAME.oc.get(sel) : null;

  var h = '<div class="box"><h3>Organised Crime<span class="sub">' + (f ? esc(f.name) : 'no family') + '</span></h3><div class="bd">' +
    '<p>Some jobs cannot be done alone. You put a crew together out of your own family, one player to a role, ' +
    'and every one of them rolls against their own stats when the night comes.</p>' +
    '<p class="dim">Bring a driver who cannot drive and it comes apart on the ramp. One slip can be covered. Two and everybody walks home, ' +
    'or does not. Sitting a crew down costs <b>4 Brave</b>.</p>';
  if (!f) {
    h += '<p class="bad">You are not in a family. Join one or start one and then come back.</p>' +
      '<a class="btn" href="#/family" data-nav="family">Families</a>';
    return h + '</div></div>';
  }
  h += '<p class="dim">Your family has <b>' + GAME.oc.bench().length + '</b> people available tonight.</p></div>';

  if (S.lastOc) {
    var R = S.lastOc;
    h += '<div class="bd"><div class="hr"></div>' +
      '<p class="' + (R.success ? 'good big' : 'bad big') + '">' + esc(R.success ? R.job.ok : (R.blown > 1 ? R.job.caught : R.job.fail)) + '</p>';
    h += '<table class="t"><tr><th>Role</th><th>Who</th><th class="c">Odds</th><th class="c">Held up</th></tr>';
    for (var i = 0; i < R.results.length; i++) {
      var x = R.results[i];
      h += '<tr><td>' + esc(x.role.name) + '</td><td>' + (x.member ? esc(x.member.name) : '&mdash;') + '</td>' +
        '<td class="c dim">' + Math.round(x.chance * 100) + '%</td>' +
        '<td class="c">' + (x.ok ? '<span class="good">yes</span>' : '<span class="bad">no</span>') + '</td></tr>';
    }
    h += '</table>';
    if (R.success) h += '<p class="good">Pot ' + money(R.pot) + '. Your cut: <b>' + money(R.cut) + '</b>, plus ' + R.xp + ' experience. The rest went round the crew.</p>';
    else if (R.jailed) h += '<p class="bad">You are in the cells for ' + Math.round(R.jailSecs / 60) + ' minutes.</p>';
    h += '</div>';
  }
  h += '</div>';

  if (job) {
    var r = GAME.oc.readiness(job);
    var err = GAME.oc.canRun(job);
    h += '<div class="box"><h3>' + esc(job.name) + '<span class="sub">level ' + job.lvl + ' &middot; ' + job.roles.length + ' on the crew</span></h3><div class="bd">' +
      '<p>' + esc(job.brief || '') + '</p>' +
      '<p class="dim">Pot ' + money(job.cut[0]) + ' &ndash; ' + money(job.cut[1]) +
      ' &middot; cools off for ' + job.cooldownH + ' hours &middot; ' + Math.round(job.jailS[0] / 60) + '&ndash;' + Math.round(job.jailS[1] / 60) + ' minutes inside if it goes wrong</p>' +
      '<div class="admrow"><button class="btn sm" data-act="ocauto">Pick the best crew for me</button> ' +
      '<button class="btn sm" data-act="occlear">Empty the crew</button> ' +
      '<button class="btn sm" data-act="ocback">Other jobs</button></div>' +
      '</div>';
    h += '<div class="scroll"><table class="t"><tr><th>Role</th><th>Wants</th><th>Who is on it</th><th class="c">They hold up</th></tr>';
    var benchList = GAME.oc.bench();
    for (var k = 0; k < r.rows.length; k++) {
      var slot = r.rows[k], role = slot.role;
      var opts = '<option value="">&mdash; nobody &mdash;</option>';
      benchList.sort(function (a, b) { return (b[role.stat] || 0) - (a[role.stat] || 0); });
      for (var m = 0; m < benchList.length; m++) {
        var mem = benchList[m];
        opts += '<option value="' + mem.id + '"' + (slot.member && slot.member.id === mem.id ? ' selected' : '') + '>' +
          esc(mem.name) + ' — ' + (GAME.oc.STATLABEL[role.stat] || role.stat) + ' ' + fmt(Math.round(mem[role.stat] || 0)) + '</option>';
      }
      h += '<tr><td><b>' + esc(role.name) + '</b><div class="dimmer" style="font-size:9.5px">' + esc(role.desc || '') + '</div></td>' +
        '<td class="dim">' + (GAME.oc.STATLABEL[role.stat] || role.stat) + ' ' + fmt(role.need) + '</td>' +
        '<td><select data-act="ocpick" data-id="' + role.id + '" style="max-width:230px">' + opts + '</select></td>' +
        '<td class="c ' + (slot.chance > 0.8 ? 'good' : slot.chance > 0.5 ? 'warn' : 'bad') + '">' +
        (slot.member ? Math.round(slot.chance * 100) + '%' : '&mdash;') + '</td></tr>';
    }
    h += '</table></div><div class="bd">' +
      '<p>Chance the job comes off: <b class="' + (r.chance > 0.7 ? 'good' : r.chance > 0.4 ? 'warn' : 'bad') + '">' + Math.round(r.chance * 100) + '%</b></p>' +
      (err ? '<p class="bad">' + esc(err) + '</p>' : '') +
      '<button class="btn red big ' + (err ? 'off' : '') + '" data-act="ocrun" data-id="' + job.id + '">Do it tonight</button>' +
      '</div></div>';
    return h;
  }

  h += '<div class="box"><h3>The Jobs</h3><div class="scroll"><table class="t">' +
    '<tr><th>Job</th><th class="c">Lvl</th><th class="c">Crew</th><th class="r">Pot</th><th class="c">Cools</th><th></th></tr>';
  var l = GAME.oc.list();
  for (var j = 0; j < l.length; j++) {
    var job2 = l[j];
    var cd = GAME.oc.cooldownLeft(f.id, job2.id);
    var locked = p.level < job2.lvl;
    h += '<tr' + (locked ? ' style="opacity:.45"' : '') + '><td><b>' + esc(job2.name) + '</b>' +
      '<div class="dimmer" style="font-size:9.5px">' + esc(job2.brief || '') + '</div></td>' +
      '<td class="c">' + job2.lvl + '</td><td class="c">' + job2.roles.length + '</td>' +
      '<td class="r">' + money(job2.cut[0]) + '&ndash;' + money(job2.cut[1]) + '</td>' +
      '<td class="c dim">' + (cd > 0 ? clock(cd) : job2.cooldownH + 'h') + '</td>' +
      '<td class="r"><button class="btn sm ' + (locked ? 'off' : '') + '" data-act="ocopen" data-id="' + job2.id + '">Set it up</button></td></tr>';
  }
  h += '</table></div></div>';

  h += '<div class="box"><h3>Your Record</h3><div class="bd"><div class="pgrid">' +
    row('Jobs that came off', fmt(p.st.ocDone || 0)) + row('Jobs that did not', fmt(p.st.ocFail || 0)) +
    '</div></div></div>';
  return h;
};


PAGES.board = function () {
  var p = S.player;
  var mine = GAME.contracts.active();
  var b = GAME.contracts.board();

  var h = '<div class="box"><h3>The Notice Board<span class="sub">' + b.length + ' up, ' + mine.length + '/' + GAME.contracts.MAX_ACTIVE + ' taken</span></h3><div class="bd">' +
    '<p>Work the other two hundred want doing and will not do themselves. Take a job and the person who posted it is watching. ' +
    'Finish it and they remember. Sit on it for a day and they remember that instead.</p></div>';

  if (mine.length) {
    h += '<div class="bd"><div class="hr"></div><b>What you are carrying</b></div>';
    h += '<div class="scroll"><table class="t"><tr><th>For</th><th>Job</th><th class="c">How it is going</th><th class="r">Pays</th><th></th></tr>';
    for (var i = 0; i < mine.length; i++) {
      var c = mine[i];
      var pr = GAME.contracts.progress(c);
      var done = GAME.contracts.isDone(c) && !c.failed;
      var bar = pr.time
        ? clock(Math.max(0, c.until - NOW())) + ' left'
        : fmt(Math.min(pr.have, pr.need)) + ' / ' + fmt(pr.need);
      h += '<tr><td>' + esc(c.byName) + '</td>' +
        '<td>' + esc(GAME.contracts.describe(c)) + '</td>' +
        '<td class="c ' + (c.failed ? 'bad' : done ? 'good' : '') + '">' + (c.failed ? 'blown' : bar) + '</td>' +
        '<td class="r">' + money(c.reward) + '<div class="dimmer" style="font-size:9.5px">+' + c.points + ' pts</div></td>' +
        '<td class="r nowrap">' +
        '<button class="btn sm green ' + (done ? '' : 'off') + '" data-act="conclaim" data-id="' + c.id + '">Collect</button> ' +
        '<button class="btn sm" data-act="condrop" data-id="' + c.id + '">Drop</button></td></tr>';
    }
    h += '</table></div>';
  }

  h += '<div class="bd"><div class="hr"></div><b>Posted</b></div>';
  h += '<div class="bd tight">';
  if (!b.length) h += '<div class="bd dim">Board is empty. Somebody will want something soon enough.</div>';
  for (var k = 0; k < b.length; k++) {
    var c2 = b[k];
    var poster = byId(c2.by);
    h += '<div class="post"><div class="ph">' +
      '<span>' + (poster ? '<a href="#" data-who="' + poster.id + '">' + esc(c2.byName) + '</a> <span class="dimmer">lvl ' + poster.level + '</span>' : esc(c2.byName)) + '</span>' +
      '<span class="dim">' + ago(NOW() - c2.posted) + ' &middot; gone in ' + clock(c2.expires - NOW()) + '</span></div>' +
      '<div class="pb"><b>' + esc(c2.title) + '</b>\n' + esc(c2.body) +
      '<div class="hr"></div>' +
      '<span class="dim">' + esc(GAME.contracts.describe(c2)) + '</span> &nbsp; ' +
      '<b class="warn">' + money(c2.reward) + '</b> <span class="dim">+ ' + c2.points + ' points</span> ' +
      '<button class="btn sm red" data-act="conaccept" data-id="' + c2.id + '" style="float:right">Take it</button>' +
      '</div></div>';
  }
  h += '</div>';

  h += '<div class="bd"><div class="hr"></div><div class="pgrid">' +
    row('Jobs finished', fmt(p.st.contracts || 0)) +
    row('Board pays out', money(Math.round(1200 * Math.pow(p.level, 1.9)))) +
    '</div></div></div>';
  return h;
};
