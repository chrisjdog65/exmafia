/* ============================================================
   62-pages-fight.js :: Attack Ladder, Players, profiles, hitlist,
   the bodyguard, and the attack screen itself
   ============================================================ */

PAGES.ladder = function () {
  var p = S.player, rows = GAME.ladder.rows(), myRung = GAME.ladder.rungOf(0);
  var door = CFG.LADDER_RUNGS - CFG.LADDER_ENTRY + 1;
  var lock = GAME.ladder.reentryLeft();

  var h = '<div class="box"><h3>The Attack Ladder<span class="sub">' + rows.length + ' rungs &middot; round ' + GAME.season.number() + '</span></h3><div class="bd">' +
    '<p>The Attack Ladder is where the best attackers in the city are. <b>You get on it by beating one of them.</b></p>' +
    '<p>A <b>Challenge</b> is the only thing that moves a rung. A plain attack from the player lists is money and a hospital bed &mdash; ' +
    'it never takes anybody\'s place, however hard you hit them.</p>' +
    '<table class="t"><tr><th>Where you stand</th><th>What you may challenge</th></tr>' +
    '<tr><td>Off the ladder</td><td>Rungs <b>' + door + '&ndash;' + CFG.LADDER_RUNGS + '</b> only. That is the door in.</td></tr>' +
    '<tr><td>On it, at rung R</td><td>Anything within <b>' + CFG.LADDER_REACH + ' rungs</b> above you.</td></tr>' +
    '<tr><td>Anyone</td><td>A rung whose holder has not fought in <b>' + CFG.LADDER_IDLE_H + ' hours</b>. Reach is ignored.</td></tr>' +
    '</table>' +
    '<p class="dim">A challenge costs <b>1 attack and ' + CFG.CHALLENGE_ENERGY + ' Energy</b>, and you must be at half health. ' +
    'Win and you take their rung; they and everybody under them slide down one, and the holder of rung ' + CFG.LADDER_RUNGS + ' comes off. ' +
    'Lose and nothing moves, but you are in a bed and locked out of that defender for ' + Math.round(CFG.CHALLENGE_LOCK / MIN) + ' minutes.</p>' +
    '<p class="warn">Rung one is <b>The Godfather</b> and pays <b>' + CFG.GODFATHER_PTS_HOUR + ' points an hour</b>. ' +
    'Every other rung pays <b>' + CFG.LADDER_PTS_HOUR + '</b>. It also means no bodyguard in this town will cover you until you are off it. That is the trade.</p>';

  if (myRung) {
    h += '<div class="hr"></div><p class="good">You are holding rung <b>' + myRung + '</b>' +
      (myRung === 1 ? ' &mdash; <b class="warn">you are the Godfather</b>' : '') + '. ' +
      (myRung === 1 ? CFG.GODFATHER_PTS_HOUR : CFG.LADDER_PTS_HOUR) + ' points an hour, and no bodyguard.</p>';
  } else if (lock > 0) {
    h += '<div class="hr"></div><p class="bad">You were knocked off. You cannot challenge again for <b>' + clock(lock) + '</b>.</p>';
  } else {
    h += '<div class="hr"></div><p class="dim">You are not on the ladder. Beat whoever is holding rung ' + door + ', ' + (door + 1) + ' or ' + CFG.LADDER_RUNGS + ' and you take their place.</p>';
  }
  h += '</div>';

  h += '<div class="scroll"><table class="t"><tr><th class="c">Rung</th><th>Player</th><th class="c">Lvl</th><th class="r">Power</th><th>Family</th><th class="c">W/L</th><th class="c">Status</th><th class="c">Odds</th><th class="r">Challenge</th></tr>';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i], e = r.e;
    var fam = famById(e.fam);
    var dl = r.isMe ? null : GAME.combat.difficultyLabel(r.odds);
    var canCh = r.can && r.can.ok;
    h += '<tr' + (r.isMe ? ' style="background:#241a12"' : '') + '>' +
      '<td class="c"><b style="font-size:13px">' + r.rung + '</b></td>' +
      '<td><div class="who-line">' + GAME.ui.avatarTag(e, 22, 'sm') + '<span>' +
        (r.isMe ? '<b class="warn">' + esc(e.name) + ' (you)</b>' : GAME.ui.userLink(e)) +
        (r.gf ? ' <span class="tag gf">GODFATHER</span>' : '') +
        (r.idle && !r.isMe ? ' <span class="tag">dormant</span>' : '') +
      '</span></div></td>' +
      '<td class="c">' + e.level + '</td>' +
      '<td class="r">' + fmt(GAME.combat.power(e)) + '</td>' +
      '<td class="dim">' + (fam ? esc(fam.name) : '&mdash;') + '</td>' +
      '<td class="c dim">' + fmt(e.id === 0 ? e.st.w : (e.w || 0)) + '/' + fmt(e.id === 0 ? e.st.l : (e.l || 0)) + '</td>' +
      '<td class="c">' + GAME.ui.statusOf(e) + '</td>' +
      '<td class="c">' + (dl ? '<span class="' + dl.c + '">' + dl.t + '</span>' : '&mdash;') + '</td>' +
      '<td class="r nowrap">' + (r.isMe ? '' :
        '<button class="btn sm red ' + (canCh ? '' : 'off') + '" data-act="challenge" data-id="' + e.id + '" title="' +
        esc(r.can && r.can.why ? r.can.why : 'Take rung ' + r.rung) + '">Challenge</button>') +
      '</td></tr>';
  }
  h += '</table></div></div>';

  if (GAME.season.over() && !S.rumbleDone) {
    h += '<div class="box"><h3>The Round Is Over</h3><div class="bd">' +
      '<p class="warn">Eight weeks are up. Everybody on the ladder in one room, last one standing.</p>' +
      '<a class="btn red" href="#/round" data-nav="round">Go to The Rumble</a></div></div>';
  }
  return h;
};

/* ---------------- Total Players / Online Now ---------------- */
PAGES.players = function () {
  var p = S.player;
  var mode = S.uiPlayerMode || 'online';
  var sort = S.uiPlayerSort || 'level';
  var q = (S.uiPlayerQ || '').toLowerCase();

  var pool;
  if (mode === 'online') pool = GAME.sim.onlineList().slice();
  else if (mode === 'weak') pool = S.npcs.filter(function (n) { return !n.dead && GAME.combat.odds(p, n) > 0.7; });
  else if (mode === 'enemies') pool = S.npcs.filter(function (n) { return !n.dead && (n.grudge > 20 || n.op < -25); });
  else pool = S.npcs.filter(function (n) { return !n.dead; });

  if (q) pool = pool.filter(function (n) { return n.name.toLowerCase().indexOf(q) >= 0; });

  pool.sort(function (a, b) {
    if (sort === 'level') return b.level - a.level;
    if (sort === 'power') return GAME.combat.power(b) - GAME.combat.power(a);
    if (sort === 'name') return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    if (sort === 'easy') return GAME.combat.odds(p, b) - GAME.combat.odds(p, a);
    if (sort === 'money') return (b.money || 0) - (a.money || 0);
    return 0;
  });

  var total = pool.length;
  var page = S.uiPlayerPage || 0;
  var per = 40;
  if (page * per >= total) page = 0;
  var slice = pool.slice(page * per, page * per + per);

  var h = '<div class="box"><h3>Players<span class="sub">' + fmt(total) + ' listed</span></h3><div class="bd">' +
    '<div class="cats">' +
    tab('online', 'Online Now (' + GAME.sim.onlineCount() + ')', mode) +
    tab('all', 'Total Players', mode) +
    tab('weak', 'Easy Marks', mode) +
    tab('enemies', 'People With A Problem', mode) +
    '</div>' +
    '<input type="text" id="pq" placeholder="search a name..." value="' + esc(S.uiPlayerQ || '') + '" style="width:180px"> ' +
    '<button class="btn sm" data-act="psearch">Search</button> ' +
    '<span class="dim">sort:</span> ' +
    ['level', 'power', 'easy', 'money', 'name'].map(function (s) {
      return '<button class="btn sm ' + (sort === s ? 'gold' : '') + '" data-act="psort" data-id="' + s + '">' + s + '</button>';
    }).join(' ') +
    '</div><div class="scroll"><table class="t"><tr><th>Player</th><th class="c">Lvl</th><th>Rank</th><th class="r">Power</th><th class="c">Status</th><th class="c">Odds</th><th></th></tr>';

  for (var i = 0; i < slice.length; i++) {
    var n = slice[i];
    var dl = GAME.combat.difficultyLabel(GAME.combat.odds(p, n));
    var can = GAME.ladder.canAttack(n.id);
    h += '<tr><td><div class="who-line">' + GAME.ui.avatarTag(n, 22, 'sm') + '<span>' + GAME.ui.userLink(n) + '</span></div></td>' +
      '<td class="c">' + n.level + '</td>' +
      '<td class="dim">' + esc(GAME.progress.rankFor(n.xp || 0).name) + '</td>' +
      '<td class="r">' + fmt(GAME.combat.power(n)) + '</td>' +
      '<td class="c">' + GAME.ui.statusOf(n) + '</td>' +
      '<td class="c"><span class="' + dl.c + '">' + dl.t + '</span></td>' +
      '<td class="r nowrap"><button class="btn sm red ' + (can.ok ? '' : 'off') + '" data-act="attack" data-id="' + n.id + '" title="' + esc(can.why || '') + '">Attack</button> ' +
      '<button class="btn sm" data-who="' + n.id + '">Profile</button></td></tr>';
  }
  h += '</table></div>';

  if (total > per) {
    h += '<div class="bd center">';
    var pages = Math.ceil(total / per);
    for (var pg = 0; pg < Math.min(pages, 14); pg++) {
      h += '<button class="btn sm ' + (pg === page ? 'gold' : '') + '" data-act="ppage" data-n="' + pg + '">' + (pg + 1) + '</button> ';
    }
    h += '</div>';
  }
  h += '</div>';
  return h;
};

function tab(id, label, cur) {
  return '<a href="#" class="' + (cur === id ? 'on' : '') + '" data-act="pmode" data-id="' + id + '">' + label + '</a>';
}

/* ---------------- Attack screen ---------------- */
PAGES.attack = function () {
  var id = Number(GAME.ui.param('id'));
  var t = byId(id);
  if (!t) return '<div class="box"><h3>Gone</h3><div class="bd">Nobody by that name.</div></div>';
  var p = S.player;
  var res = S.lastFight;

  if (res && res.targetId === id) {
    var f = res.fight;
    var h = '<div class="box"><h3>' + (f.win ? 'You won' : 'You lost') + '<span class="sub">' + esc(t.name) + '</span></h3><div class="bd">' +
      GAME.ui.fightLog(f) + '<div class="hr"></div>';
    if (f.win) {
      h += '<p class="good">You beat ' + esc(t.name) + ' in ' + f.rounds + ' rounds.' +
        (res.challenge ? ' <b>Challenge won.</b>' : '') + ' +' + res.respect + ' respect.</p>';
      if (res.climbed) {
        h += '<p class="warn"><b>' + (res.climbed.rung === 1 ? 'You are the Godfather.' : 'You are on the Attack Ladder at rung ' + res.climbed.rung + '.') + '</b>' +
          (res.climbed.joined ? ' ' + (res.climbed.rung === 1 ? CFG.GODFATHER_PTS_HOUR : CFG.LADDER_PTS_HOUR) + ' points an hour from now on, and no bodyguard will cover you.' : '') + '</p>';
      } else if (res.wasOnLadder) {
        h += '<p class="dim">They are on the ladder, but a plain attack never moves a rung. Challenge them from the ladder page to take it.</p>';
      }
      if (res.bounty) h += '<p class="good">You collected a ' + money(res.bounty) + ' bounty.</p>';
      if (S.pendingFinish) {
        var pot = S.pendingFinish.xp || 0;
        h += '<div class="hr"></div><p><b>They are on the ground. What now?</b></p>' +
          '<table class="t"><tr><th>Finisher</th><th class="r">XP</th><th>What you get</th></tr>' +
          '<tr><td><b>Leave them</b></td><td class="r good">' + Math.max(1, Math.round(pot * 1.0)) + '</td>' +
            '<td class="dim">All of it. They are up again quickly, and they will remember it.</td></tr>' +
          '<tr><td><b>Mug them</b></td><td class="r">' + Math.max(1, Math.round(pot * 0.3)) + '</td>' +
            '<td class="dim">Whatever cash they are carrying. Not a penny of what is banked.</td></tr>' +
          '<tr><td><b>Hospitalise them</b></td><td class="r">' + Math.max(1, Math.round(pot * 0.5)) + '</td>' +
            '<td class="dim">A long bed, and <b>+0.6 Strength, +0.6 Guard</b> for doing it the hard way.</td></tr>' +
          '</table>' +
          '<button class="btn" data-act="finish" data-id="leave">Leave them</button> ' +
          '<button class="btn gold" data-act="finish" data-id="mug">Mug them</button> ' +
          '<button class="btn red" data-act="finish" data-id="hosp">Hospitalise them</button>';
      } else if (res.finish) {
        var fin = res.finish;
        h += '<div class="hr"></div>';
        if (fin.kind === 'mug') {
          h += '<p class="good">You went through their pockets: ' + money(fin.took) + '. +' + fin.xp + ' xp.' +
            (fin.drop ? ' You also came away with a ' + esc(fin.drop.name) + '.' : '') + '</p>';
        } else if (fin.kind === 'hosp') {
          h += '<p class="good">' + esc(fin.name) + ' is in a bed for ' + Math.round(fin.hosp / MIN) + ' minutes. ' +
            '+' + fin.str + ' Strength, +' + fin.def + ' Guard, +' + fin.xp + ' xp.</p>';
        } else {
          h += '<p class="good">You left ' + esc(fin.name) + ' where they fell. +' + fin.xp + ' xp &mdash; all of it.</p>';
        }
      }
    } else {
      h += '<p class="bad">' + esc(t.name) + ' put you down. You are in a hospital bed.</p>';
    }
    if (!f.win && res.challenge) {
      h += '<p class="dim">Nothing moved. Rung ' + res.theirRung + ' stays where it was, and they will not take a challenge from you again for ' +
        Math.round(CFG.CHALLENGE_LOCK / MIN) + ' minutes.</p>';
    }
    h += '<div class="hr"></div><a class="btn" href="#/ladder" data-nav="ladder">Attack Ladder</a> ' +
      '<a class="btn" href="#/players" data-nav="players">Players</a> ' +
      '<button class="btn" data-who="' + id + '">Their profile</button>' +
      '</div></div>';
    return h;
  }

  /* pre-fight sizing up */
  var odds = GAME.combat.odds(p, t);
  var dl = GAME.combat.difficultyLabel(odds);
  var can = GAME.ladder.canAttack(id);
  var rung = GAME.ladder.rungOf(id);
  var mine = GAME.combat.sheet(p), theirs = GAME.combat.sheet(t);

  var out = '<div class="box"><h3>Attack ' + esc(t.name) + (rung ? '<span class="sub">Attack Ladder rung ' + rung + '</span>' : '') + '</h3><div class="bd">';
  out += '<table class="t"><tr><th></th><th class="r">You</th><th class="r">' + esc(t.name) + '</th></tr>' +
    cmp('Level', p.level, t.level) +
    cmp('Strength', fmt(Math.round(mine.str)), '???') +
    cmp('Guard', fmt(Math.round(mine.def)), '???') +
    cmp('Agility', fmt(Math.round(mine.spd)), '???') +
    cmp('Health', Math.round(p.health) + '/' + fmt(maxHealth(p)), Math.round(t.health) + '/' + fmt(maxHealth(t))) +
    cmp('Weapon', mine.wpn ? mine.wpn.name : 'bare knuckle', theirs.wpn ? '???' : '???') +
    cmp('Estimated power', fmt(GAME.combat.power(p)), fmt(GAME.combat.power(t))) +
    '</table>';
  out += '<div class="hr"></div><p>Your read on this: <b class="' + dl.c + '">' + dl.t + '</b> <span class="dim">(' + Math.round(odds * 100) + '% in your favour)</span></p>';
  var ch = rung ? GAME.ladder.canChallenge(id) : null;
  if (rung) {
    out += '<p class="warn">They are holding <b>Attack Ladder rung ' + rung + '</b>' + (rung === 1 ? ' &mdash; the Godfather seat' : '') + '. ' +
      'A plain attack will not take it. Only a <b>Challenge</b> moves a rung.</p>';
    if (ch && !ch.ok) out += '<p class="dim">' + esc(ch.why) + '</p>';
  }
  if (GAME.ladder.hasRevenge(id)) out += '<p class="warn">Revenge window: they hit you recently.</p>';
  out += '<p class="dim">A plain attack costs 1 attack and ' + CFG.ATTACK_ENERGY + ' Energy. ' +
    'A challenge costs 1 attack and ' + CFG.CHALLENGE_ENERGY + ' Energy and needs you at half health.</p>';
  if (!can.ok) out += '<p class="bad">' + esc(can.why) + '</p>';
  out += '<button class="btn red big ' + (can.ok ? '' : 'off') + '" data-act="doattack" data-id="' + id + '">Attack ' + esc(t.name) + '</button> ' +
    (ch ? '<button class="btn gold big ' + (ch.ok ? '' : 'off') + '" data-act="challenge" data-id="' + id + '">Challenge for rung ' + rung + '</button> ' : '') +
    '<button class="btn" data-who="' + id + '">Profile</button>';
  out += '</div></div>';
  return out;
};

function cmp(k, a, b) {
  return '<tr><td class="dim">' + k + '</td><td class="r">' + a + '</td><td class="r">' + b + '</td></tr>';
}

/* ---------------- Profile ---------------- */
PAGES.profile = function () {
  var id = GAME.ui.param('id');
  var n = id === undefined || id === '' ? S.player : byId(Number(id));
  if (!n) return '<div class="box"><h3>No such player</h3><div class="bd">That account does not exist.</div></div>';
  var me = n.id === 0;
  var fam = famById(n.fam);
  var rung = GAME.ladder.rungOf(n.id);
  var rank = GAME.progress.rankFor(n.xp || 0);

  var h = '<div class="box"><h3>' + esc(n.name) + (me ? ' <span class="sub">this is you</span>' : '') + '</h3><div class="bd">';
  h += '<div class="who-line" style="align-items:flex-start;gap:10px">' + GAME.ui.avatarTag(n, 64) +
    '<div style="flex:1"><div class="big">' + esc(n.name) + '</div>' +
    '<div class="dim">' + esc(rank.name) + ' &middot; level ' + n.level + '</div>' +
    '<div class="dim">' + esc(n.city || '') + (n.hood ? ' &middot; ' + esc(n.hood) : '') + '</div>' +
    (rung ? '<div style="margin-top:3px"><span class="tag ' + (rung === 1 ? 'gf' : 'ladder') + '">' + (rung === 1 ? 'THE GODFATHER' : 'LADDER RUNG ' + rung) + '</span></div>' : '') +
    (fam ? '<div style="margin-top:3px"><span class="dim">Family:</span> <a href="#/family/' + fam.id + '" data-nav-fam="' + fam.id + '">' + esc(fam.name) + '</a> <span class="dimmer">(' + esc(n.famRole || 'soldier') + ')</span></div>' : '') +
    '</div>';
  if (!me) {
    var can = GAME.ladder.canAttack(n.id);
    h += '<div style="text-align:right">' +
      '<button class="btn red ' + (can.ok ? '' : 'off') + '" data-act="attack" data-id="' + n.id + '" title="' + esc(can.why || '') + '">Attack</button><br>' +
      '<button class="btn sm" data-act="mailto" data-id="' + n.id + '" style="margin-top:4px">Send Mail</button><br>' +
      '<button class="btn sm" data-act="bountyon" data-id="' + n.id + '" style="margin-top:4px">Put money on them</button>' +
      '</div>';
  }
  h += '</div>';

  if (n.bio) h += '<div class="hr"></div><div style="white-space:pre-wrap">' + esc(tpl(n.bio, { me: n.name, family: fam ? fam.name : 'nobody', city: n.city })) + '</div>';
  if (n.quote) h += '<div class="dim" style="margin-top:6px;font-style:italic">&ldquo;' + esc(n.quote) + '&rdquo;</div>';
  h += '</div></div>';

  h += '<div class="box"><h3>Statistics</h3><div class="bd"><div class="pgrid">' +
    row('Experience', fmtShort(n.xp || 0)) +
    row('Respect', fmt(n.respect || 0)) +
    row('Attacks won', fmt(me ? n.st.w : n.w || 0)) +
    row('Attacks lost', fmt(me ? n.st.l : n.l || 0)) +
    row('Crimes done', fmt(me ? n.st.crimes : n.crimes || 0)) +
    row('Forum posts', fmt(me ? n.st.posts : n.posts || 0)) +
    row('Member since', new Date(n.joined || NOW()).toLocaleDateString()) +
    row('Last seen', me ? 'now' : ago(NOW() - (n.lastOnline || 0))) +
    row('Best ladder rung', n.bestRung ? '#' + n.bestRung : 'never on it') +
    (me ? row('Points', fmt(n.points || 0)) : '') +
    (me ? row('Money mugged', money(n.st.mugged || 0)) : '') +
    (me ? row('Money lost to muggers', money(n.st.muggedBy || 0)) : '') +
    (!me && n.aim ? row('AIM', esc(n.aim)) : '') +
    (!me ? row('Age', (n.age || '?')) : '') +
    '</div></div></div>';

  if (!me) {
    var feeling = n.grudge > 55 ? 'wants you dead' : n.grudge > 25 ? 'has a problem with you'
      : n.op > 40 ? 'likes you' : n.op > 15 ? 'is friendly enough' : n.op < -35 ? 'cannot stand you'
      : n.op < -12 ? 'is cold with you' : 'has no strong opinion of you';
    h += '<div class="box"><h3>Where You Stand</h3><div class="bd">' +
      '<p>' + esc(n.name) + ' ' + feeling + '.</p>' +
      (n.hitsOnMe ? '<p class="dim">You have beaten them ' + n.hitsOnMe + ' ' + pluralize(n.hitsOnMe, 'time') + '.</p>' : '') +
      (n.hitsByMe ? '<p class="dim">They have beaten you ' + n.hitsByMe + ' ' + pluralize(n.hitsByMe, 'time') + '.</p>' : '') +
      (GAME.ladder.hasRevenge(n.id) ? '<p class="warn">Revenge window open.</p>' : '') +
      '</div></div>';
  }

  if (n.sig) {
    h += '<div class="box"><h3>Signature</h3><div class="bd"><div class="dim mono" style="white-space:pre-wrap;font-size:10px">' +
      esc(tpl(n.sig, { me: n.name })) + '</div></div></div>';
  }
  return h;
};

/* ---------------- Hitlist ---------------- */
PAGES.hitlist = function () {
  var l = GAME.hitlist.list(), p = S.player;
  var h = '<div class="box"><h3>The Hitlist<span class="sub">' + l.length + ' open</span></h3><div class="bd">' +
    '<p class="dim">Money on somebody\'s head. Put them in a hospital bed and the whole pot is yours. ' +
    'Anybody can add to a bounty and nobody has to say who they are &mdash; except that everybody always finds out.</p></div>' +
    '<div class="scroll"><table class="t"><tr><th>Target</th><th class="c">Lvl</th><th class="r">Bounty</th><th>Placed by</th><th class="c">Status</th><th></th></tr>';
  if (!l.length) h += '<tr><td colspan="6" class="dim">Nobody has a price on them right now.</td></tr>';
  for (var i = 0; i < l.length; i++) {
    var t = byId(l[i].target);
    if (!t) continue;
    var can = t.id === 0 ? { ok: false, why: 'That is you.' } : GAME.ladder.canAttack(t.id);
    h += '<tr><td><div class="who-line">' + GAME.ui.avatarTag(t, 22, 'sm') + '<span>' + (t.id === 0 ? '<b class="bad">You</b>' : GAME.ui.userLink(t)) + '</span></div></td>' +
      '<td class="c">' + t.level + '</td>' +
      '<td class="r warn"><b>' + money(l[i].amount) + '</b></td>' +
      '<td class="dim">' + esc(l[i].byName) + '</td>' +
      '<td class="c">' + GAME.ui.statusOf(t) + '</td>' +
      '<td class="r">' + (t.id === 0 ? '<span class="dim">watch your back</span>' :
        '<button class="btn sm red ' + (can.ok ? '' : 'off') + '" data-act="attack" data-id="' + t.id + '">Collect</button>') + '</td></tr>';
  }
  h += '</table></div></div>';

  h += '<div class="box"><h3>Put Money On Somebody</h3><div class="bd">' +
    '<label class="f"><span>Player name</span><input type="text" id="bnt-name" placeholder="exact screen name"></label>' +
    '<label class="f"><span>Amount (minimum $1,000)</span><input type="number" id="bnt-amt" value="10000" min="1000"></label>' +
    '<button class="btn red" data-act="placebounty">Place it</button> <span class="dim">You have ' + money(p.money) + '.</span>' +
    '</div></div>';
  return h;
};

/* ---------------- Bodyguard ---------------- */
PAGES.bodyguard = function () {
  var p = S.player, on = GAME.ladder.onLadder(0);
  var active = (p.bgUntil || 0) > NOW() && !on;
  var h = '<div class="box"><h3>Bodyguard</h3><div class="bd">' +
    '<p>A bodyguard can be hired with <b>points</b> and is in effect for <b>two hours</b>. While you are under the ' +
    'protection of a bodyguard nobody can attack you &mdash; however you may not attack anyone either.</p>' +
    '<p class="dim">Handy if you need to train without being jumped, or you are carrying a lot of cash and do not want to get mugged.</p>' +
    '<div class="hr"></div>';
  if (on) {
    h += '<p class="bad"><b>You are on the Attack Ladder.</b> A bodyguard will not block any attacks until you are off it. ' +
      'That is the price of the ' + GAME.ladder.POINTS_PER_HOUR + ' points an hour.</p>';
  } else if (active) {
    h += '<p class="good">A bodyguard is on your door for another <b>' + clock(p.bgUntil - NOW()) + '</b>.</p>' +
      '<button class="btn" data-act="dismissguard">Send him home</button>';
  } else {
    h += '<p>Cost: <b>25 points</b>. You have ' + fmt(p.points || 0) + '.</p>' +
      '<button class="btn red ' + ((p.points || 0) >= 25 ? '' : 'off') + '" data-act="hireguard">Hire a bodyguard</button>';
  }
  h += '</div></div>';
  return h;
};
