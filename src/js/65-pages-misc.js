/* ============================================================
   65-pages-misc.js :: Hospital, Jail, Lawyer, Help, Settings,
   and the new-game screen
   ============================================================ */

PAGES.hospital = function () {
  var p = S.player, pats = GAME.hospital.patients();
  var h = '<div class="box"><h3>St. Anthony&rsquo;s Mercy</h3><div class="bd">';
  if (GAME.player.inHospital()) {
    h += '<p class="bad"><b>You are in a bed.</b> ' + esc(p.hospWhy || '') + '</p>' +
      '<p>Out in <b>' + clock(p.hospUntil - NOW()) + '</b>.</p>' +
      '<p>Discharge yourself early: <b>' + money(GAME.hospital.cost()) + '</b> or <b>' + GAME.points.COSTS.hospital + ' points</b>.</p>' +
      '<button class="btn ' + (p.money >= GAME.hospital.cost() ? '' : 'off') + '" data-act="hospout">Pay the bill</button> ' +
      '<button class="btn gold ' + ((p.points || 0) >= GAME.points.COSTS.hospital ? '' : 'off') + '" data-act="sprhosp">Use points</button> ' +
      '<a class="btn" href="#/newspaper" data-nav="newspaper">Read the newspaper</a>';
  } else {
    h += '<p class="dim">You are on your feet. The waiting room is full of people who are not.</p>';
  }
  h += '</div>';
  h += '<div class="scroll"><table class="t"><tr><th>Patient</th><th class="c">Lvl</th><th>Why</th><th class="c">Out in</th></tr>';
  for (var i = 0; i < Math.min(pats.length, 40); i++) {
    var n = pats[i];
    h += '<tr><td>' + GAME.ui.userLink(n, { status: false }) + '</td><td class="c">' + n.level + '</td>' +
      '<td class="dim">' + esc(n.hospWhy || 'took a beating') + '</td>' +
      '<td class="c">' + clock(n.hospUntil - NOW()) + '</td></tr>';
  }
  if (!pats.length) h += '<tr><td colspan="4" class="dim">Nobody is in tonight. Unusual.</td></tr>';
  h += '</table></div></div>';
  return h;
};

PAGES.jail = function () {
  var p = S.player, inm = GAME.jail.inmates();
  var h = '<div class="box"><h3>City Jail</h3><div class="bd">';
  if (GAME.player.inJail()) {
    h += '<p class="warn"><b>You are inside.</b> ' + esc(p.jailWhy || '') + '</p>' +
      '<p>Out in <b>' + clock(p.jailUntil - NOW()) + '</b>. Bail is <b>' + money(p.bail || 0) + '</b>.</p>' +
      '<button class="btn ' + (p.money >= (p.bail || 0) ? '' : 'off') + '" data-act="bailself">Post bail</button> ' +
      '<button class="btn gold ' + ((p.points || 0) >= GAME.points.COSTS.jail ? '' : 'off') + '" data-act="sprjail">Use ' + GAME.points.COSTS.jail + ' points</button> ' +
      '<a class="btn" href="#/lawyer" data-nav="lawyer">Call Dewey</a>';
  } else {
    h += '<p class="dim">Bail somebody out and they will remember it. Break somebody out and they will really remember it &mdash; ' +
      'but if a guard sees you, you take their place.</p>';
  }
  h += '</div><div class="scroll"><table class="t"><tr><th>Inmate</th><th class="c">Lvl</th><th>Charge</th><th class="c">Out in</th><th class="r">Bail</th><th></th></tr>';
  for (var i = 0; i < Math.min(inm.length, 45); i++) {
    var n = inm[i];
    if (n.id === 0) continue;
    h += '<tr><td>' + GAME.ui.userLink(n, { status: false }) + '</td><td class="c">' + n.level + '</td>' +
      '<td class="dim">' + esc(n.jailWhy || 'unknown') + '</td>' +
      '<td class="c">' + clock(n.jailUntil - NOW()) + '</td>' +
      '<td class="r">' + money(GAME.jail.bailCost(n)) + '</td>' +
      '<td class="r nowrap"><button class="btn sm ' + (S.player.money >= GAME.jail.bailCost(n) && !GAME.player.inJail() ? '' : 'off') + '" data-act="bailout" data-id="' + n.id + '">Bail</button> ' +
      '<button class="btn sm red ' + (!GAME.player.blocked() && S.player.will >= 3 ? '' : 'off') + '" data-act="bust" data-id="' + n.id + '" title="' + Math.round(GAME.jail.bustChance(n) * 100) + '% chance">Bust</button></td></tr>';
  }
  if (inm.length <= 1) h += '<tr><td colspan="6" class="dim">The cells are empty.</td></tr>';
  h += '</table></div></div>';
  return h;
};

PAGES.lawyer = function () {
  var q = GAME.lawyer.quote(), p = S.player;
  var h = '<div class="box"><h3>Dewey, Screwem and Howe<span class="sub">attorneys at law</span></h3><div class="bd">' +
    '<p class="dim">Three names on the glass, one desk, and a filing cabinet that has never been opened. They are very good.</p><div class="hr"></div>';
  if (q.jailLeft) {
    h += '<p><b>Get me out of jail.</b> ' + clock(q.jailLeft) + ' left. Dewey wants <b>' + money(q.jail) + '</b> ' +
      '<span class="dim">($2,500 to walk in the door, $180 a minute after that)</span>.</p>' +
      '<p class="dim">One time in five he gets it thrown out completely. The rest of the time he takes forty to seventy percent off. He bills you either way.</p>' +
      '<button class="btn ' + (p.money >= q.jail ? '' : 'off') + '" data-act="lawjail">Pay Dewey</button><div class="hr"></div>';
  }
  if (q.hospLeft) {
    h += '<p><b>Get me out of that bed.</b> ' + clock(q.hospLeft) + ' left. The bill is <b>' + money(q.hosp) + '</b>.</p>' +
      '<button class="btn ' + (p.money >= q.hosp ? '' : 'off') + '" data-act="lawhosp">Settle it</button><div class="hr"></div>';
  }
  h += '<p><b>Retainer.</b> ' + money(q.retainer) + ' keeps Howe on call for twenty-four hours. Every jail term you pick up in that time is halved.</p>';
  if (GAME.lawyer.onRetainer()) h += '<p class="good">On retainer for another ' + clock(p.retainerUntil - NOW()) + '.</p>';
  else h += '<button class="btn gold ' + (p.money >= q.retainer ? '' : 'off') + '" data-act="retain">Put him on retainer</button>';
  h += '</div></div>';
  return h;
};

/* ---------------- How To Play ---------------- */
PAGES.help = function () {
  return '<div class="box"><h3>How To Play</h3><div class="bd" style="line-height:1.75">' +
  '<p><b>Six things limit what you can do.</b> They all refill in real time whether this page is open or not.</p>' +
  '<table class="t"><tr><th>Gauge</th><th>Spent on</th><th class="c">Refills</th></tr>' +
  '<tr><td><b>Energy</b></td><td>Attacking, the gym, walking the streets, working a shift</td><td class="c">1 / 3 min</td></tr>' +
  '<tr><td><b>Brave</b></td><td>Crimes, and nothing else</td><td class="c">1 / 5 min</td></tr>' +
  '<tr><td><b>Will</b></td><td>Nothing directly &mdash; it is the <b>gym multiplier</b>. A set costs 1 Will and is worth more the fuller the bar is.</td><td class="c">1 / 12 min</td></tr>' +
  '<tr><td><b>Dexterity</b></td><td>Truck Stop runs, and nothing else</td><td class="c">1 / 8 min</td></tr>' +
  '<tr><td><b>Health</b></td><td>Taking beatings. Zero means a hospital bed on a real-time clock.</td><td class="c">1% / 90 s</td></tr>' +
  '<tr><td><b>Attacks</b></td><td>One per attack, one per challenge. The scarcest thing in the game.</td><td class="c">1 / 20 min</td></tr>' +
  '</table>' +
  '<p class="dim">The Trade Point menu will refill any of them for points. <b>Refill your Will before your Energy</b> &mdash; doing it the other way round wipes your Energy out in the process. Everybody learns this exactly once.</p>' +
  '<div class="hr"></div>' +
  '<p><b>Five stats decide how well you do it.</b> They start at 10 and they never go down.</p>' +
  '<table class="t"><tr><th>Stat</th><th>What it does</th><th>Where it comes from</th></tr>' +
  '<tr><td><b>Strength</b></td><td>How hard you hit</td><td>Gym, and hospitalising people</td></tr>' +
  '<tr><td><b>Guard</b></td><td>How much of a hit you soak</td><td>Gym, and hospitalising people</td></tr>' +
  '<tr><td><b>Agility</b></td><td>How easy you are to hit, and how easily you hit back</td><td>Gym</td></tr>' +
  '<tr><td><b>Labour</b></td><td>Which jobs will have you, and how much comes off a truck</td><td>Gym, and working</td></tr>' +
  '<tr><td><b>IQ</b></td><td>How often a crime comes off, how cleanly you bust somebody out, what the fence pays</td><td><b>Not the gym.</b> School, shifts, and 8 points apiece</td></tr>' +
  '</table>' +
  '<div class="hr"></div>' +
  '<p><b>The Attack Ladder.</b> Twenty rungs. Rung one is <b>The Godfather</b>. The ladder is a place, not a score: you take a rung <i>off a person</i>.</p>' +
  '<ul style="margin:0 0 8px 18px;padding:0">' +
  '<li>A <b>plain attack</b> &mdash; from Online Now, the player list, a profile, the hitlist &mdash; is money, experience, respect and a hospital bed for them. <b>It never moves a rung</b>, however hard you hit.</li>' +
  '<li>A <b>Challenge</b>, from the Attack Ladder page, is the only thing that does. From off the ladder you may only challenge the bottom three rungs. Once you are on it your reach is five rungs upward. A rung whose holder has not fought in three days is open to anybody.</li>' +
  '<li>Win and you take their rung. They and everybody under them slide down one, and whoever was holding rung twenty comes off it.</li>' +
  '<li>Lose and nothing moves. You are in a bed, and that defender will not take another challenge from you for forty-five minutes.</li>' +
  '</ul>' +
  '<p class="warn">A rung pays <b>10 points every hour of every day</b>. Rung one pays <b>25</b>. It also means <b>no bodyguard in this town will cover you</b> until you are off it. Passive income for permanent exposure: that trade is the whole game.</p>' +
  '<div class="hr"></div>' +
  '<p><b>Winning a fight.</b> They are on the ground and you pick one of three:</p>' +
  '<table class="t"><tr><th>Finisher</th><th class="c">Experience</th><th>And</th></tr>' +
  '<tr><td><b>Leave them</b></td><td class="c">all of it</td><td>They are up again quickly, and they remember it</td></tr>' +
  '<tr><td><b>Mug them</b></td><td class="c">30%</td><td>Whatever cash they are carrying. Banked money is untouchable.</td></tr>' +
  '<tr><td><b>Hospitalise them</b></td><td class="c">50%</td><td>A long bed, and +0.6 Strength and +0.6 Guard for doing it the hard way</td></tr>' +
  '</table>' +
  '<p class="dim">Anybody who hits you opens a six hour revenge window. Nobody may touch an account under level 5 or less than two days old. A bodyguard is 25 points and covers two hours, in which nobody can attack you and you cannot attack anybody.</p>' +
  '<div class="hr"></div>' +
  '<p><b>Money.</b> Cash on you can be mugged. Cash in the bank cannot. Crimes pay best and can put you inside; shifts are slow and safe; ' +
  'the Truck Stop is Dexterity turned into goods and the fence downtown will not open the shutter for under twenty-five units. ' +
  'The Item Market, the Auction and the Point Market are all run by the other two hundred people here.</p>' +
  '<div class="hr"></div>' +
  '<p><b>The round.</b> exMafia runs in eight week rounds. When one ends, everybody on the ladder goes into <b>The Rumble</b> &mdash; ' +
  'one room, last one standing &mdash; and then the whole city resets to level one. Your name on the wall and your lifetime counters are all that carry over.</p>' +
  '<div class="hr"></div>' +
  '<p><b>The other two hundred.</b> Every other name here is an account with its own time zone, its own hours, its own temper and its own idea ' +
  'of how to play. They do crimes, train, fight over the ladder, argue in the shoutbox, join and leave families, hold grudges for weeks, and ' +
  'eventually stop logging in for good while new people sign up underneath them. None of that waits for you. Come back after a week away and ' +
  'the city will have moved without you.</p>' +
  '<div class="hr"></div>' +
  '<p class="dim">Your game saves to this browser by itself. Settings has an export button if you want a copy of it.</p>' +
  '</div></div>';
};

/* ---------------- Settings ---------------- */
PAGES.settings = function () {
  var s = S.settings || {};
  var h = '<div class="box"><h3>Settings</h3><div class="bd">' +
    '<p><b>Pace.</b> How fast the gauges refill. Classic is the original real-time crawl.</p>' +
    [['1', 'Classic'], ['0.5', 'Double speed'], ['0.25', 'Quadruple speed'], ['0.1', 'Ten times']].map(function (o) {
      return '<button class="btn sm ' + (String(CFG.pace) === o[0] ? 'gold' : '') + '" data-act="pace" data-id="' + o[0] + '">' + o[1] + '</button>';
    }).join(' ') +
    '<div class="hr"></div>' +
    '<p><b>Your signature</b> <span class="dim">(shows under your forum posts)</span></p>' +
    '<textarea id="set-sig" maxlength="240">' + esc(S.player.sig || '') + '</textarea>' +
    '<p><b>Your profile</b></p>' +
    '<textarea id="set-bio" maxlength="600">' + esc(S.player.bio || '') + '</textarea>' +
    '<button class="btn" data-act="saveprofile">Save profile</button>' +
    '</div></div>';

  h += '<div class="box"><h3>Your Save</h3><div class="bd">' +
    '<p class="dim">Storage backend: <b>' + GAME.save.backend() + '</b>. ' +
    (GAME.save.backend() === 'memory' ? '<span class="bad">This browser is not letting the page store anything, so export a copy before you close the tab.</span>' : 'Saves happen automatically.') + '</p>' +
    '<button class="btn" data-act="savenow">Save now</button> ' +
    '<button class="btn" data-act="exportsave">Download a copy</button> ' +
    '<button class="btn" data-act="showsave">Show save text</button>' +
    '<div class="hr"></div>' +
    '<p><b>Load a save</b></p><textarea id="imp" placeholder="paste a save file here"></textarea>' +
    '<button class="btn" data-act="importsave">Load it</button>' +
    '<div class="hr"></div>' +
    '<p class="bad"><b>Start over.</b> This wipes the city and everybody in it.</p>' +
    '<button class="btn red" data-act="wipe">Delete my game</button>' +
    '</div></div>';

  h += '<div class="box"><h3>About</h3><div class="bd" style="line-height:1.7">' +
    '<p>A single player recreation of <b>exMafia</b>, the text based mafia RPG that ran as a MySpace application in the late 2000s.</p>' +
    '<p class="dim">The gauges, the Attack Ladder and its ten points an hour, the bodyguard that stops working the moment you are on it, ' +
    'the mug-or-hospitalise choice, the Trade Point menu and its refill-Will-before-Energy trap, walking the streets, the truck stop and ' +
    'the fence, Dewey Screwem and Howe &mdash; all of that is reconstructed from the game\'s own help pages. The exact numbers behind them ' +
    'were never published anywhere that survived, so those are tuned by hand to feel like the original.</p>' +
    '</div></div>';
  return h;
};

/* ---------------- New game ---------------- */
PAGES.newgame = function () {
  var cities = (DATA.names.cities || []).slice(0, 40);
  var h = '<div class="splash">' +
    '<div class="logo">ex<em>Mafia</em></div>' +
    '<div class="tagline">TEXT BASED MAFIA RPG &middot; SINGLE PLAYER</div>' +
    '<div class="box"><h3>Sign Up</h3><div class="bd">' +
    '<p class="dim">Two hundred people already play here. They have been at it for months. You have not.</p>' +
    '<label class="f"><span>Screen name</span><input type="text" id="ng-name" maxlength="22" placeholder="pick something you will regret"></label>' +
    '<label class="f"><span>City</span><select id="ng-city">' +
    cities.map(function (c, i) { return '<option value="' + i + '">' + esc(c.name) + '</option>'; }).join('') +
    '</select></label>' +
    '<label class="f"><span></span><label><input type="radio" name="ng-g" value="m" checked> male</label> ' +
    '<label><input type="radio" name="ng-g" value="f"> female</label></label>' +
    '<button class="btn red wide" data-act="startgame">Start playing</button>' +
    '<div class="hr"></div>' +
    '<p class="dim">Already have a save file?</p>' +
    '<textarea id="ng-imp" placeholder="paste it here"></textarea>' +
    '<button class="btn" data-act="importsave">Load save</button>' +
    '</div></div>' +
    '<div class="foot">Everything runs in this one file. Nothing is sent anywhere.</div>' +
    '</div>';
  return h;
};

/* ---------------- Local Schools ---------------- */
PAGES.school = function () {
  var p = S.player, cur = GAME.school.current();
  var h = '<div class="box"><h3>Local Schools<span class="sub">IQ ' + fmt(p.iq || 10) + '</span></h3><div class="bd">' +
    '<p class="dim">The more expensive the class, the longer the class, and the more you come out with. Classes run in real time whether ' +
    'the page is open or not. You can attend from a hospital bed. You cannot attend from a cell.</p>' +
    '<p class="dim"><b>IQ</b> is the one stat no gym in this city will sell you. It decides how often a crime comes off and how ' +
    'cleanly you get somebody out of jail.</p>';
  if (cur) {
    h += '<div class="hr"></div>';
    if (cur.done) {
      h += '<p class="good"><b>' + esc(cur.cls.name) + ' is finished.</b> Go and collect: +' + cur.cls.iq + ' IQ' +
        (cur.cls.lab ? ', +' + cur.cls.lab + ' Labour' : '') + '.</p>' +
        '<button class="btn green" data-act="schoolcollect">Collect your certificate</button>';
    } else {
      h += '<p class="warn">You are enrolled in <b>' + esc(cur.cls.name) + '</b>. ' +
        '<span class="chip">' + clock(cur.until - NOW()) + ' left</span></p>' +
        '<p class="dim">One class at a time. Nothing to do but wait.</p>';
    }
  }
  h += '</div><div class="scroll"><table class="t"><tr><th>Class</th><th class="r">Fee</th><th class="c">Runs for</th><th class="c">Grants</th><th></th></tr>';
  var l = GAME.school.list();
  for (var i = 0; i < l.length; i++) {
    var c = l[i];
    var can = !cur && p.money >= c.price && !GAME.player.inJail();
    h += '<tr><td><b>' + esc(c.name) + '</b><div class="dimmer" style="font-size:9.5px">' + esc(c.desc) + '</div></td>' +
      '<td class="r">' + money(c.price) + '</td>' +
      '<td class="c">' + (c.hours >= 24 ? Math.round(c.hours / 24) + ' days' : c.hours + ' hrs') + '</td>' +
      '<td class="c good">+' + fmt(c.iq) + ' IQ' + (c.lab ? '<br>+' + fmt(c.lab) + ' Labour' : '') + '</td>' +
      '<td class="r"><button class="btn sm ' + (can ? '' : 'off') + '" data-act="enrol" data-id="' + c.id + '">Enrol</button></td></tr>';
  }
  h += '</table></div></div>';
  return h;
};

/* ---------------- The Round and The Rumble ---------------- */
PAGES.round = function () {
  var p = S.player;
  var over = GAME.season.over();
  var h = '<div class="box"><h3>Round ' + GAME.season.number() + '<span class="sub">week ' + GAME.season.week() + ' of 8</span></h3><div class="bd">' +
    '<p>exMafia runs in <b>rounds</b>. Eight weeks, then everybody on the Attack Ladder is put in one room for <b>The Rumble</b>, ' +
    'and then the whole city starts again at level one.</p>' +
    '<p class="dim">Nothing survives a reset except the wall in the social club, your lifetime counters, and any donator days you paid for. ' +
    'That is the deal the original made and it is the deal here: eight weeks to make your name, then prove it and lose it.</p>' +
    '<div class="hr"></div>';
  if (over) {
    h += '<p class="warn big">The round is over.</p>';
    if (!S.rumbleDone) {
      h += '<p>Twenty people hold the Attack Ladder' + (GAME.ladder.rungOf(0) ? ' and one of them is you' : ', and you are not one of them &mdash; you go in as a wildcard') + '. ' +
        'Single elimination, everybody at full health, no items, no hospital between bouts.</p>' +
        '<button class="btn red big" data-act="rumble">Fight The Rumble</button>';
    } else if (S.lastRumble) {
      var R = S.lastRumble;
      h += '<p class="' + (R.championIsPlayer ? 'good' : 'dim') + ' big">' +
        (R.championIsPlayer ? 'You won The Rumble.' : esc(R.champion) + ' won The Rumble.') + '</p>' +
        '<p class="dim">' + R.entrants + ' entrants, ' + R.bracket.length + ' rounds.</p>' +
        '<div class="hr"></div><button class="btn gold" data-act="newround">Start round ' + (GAME.season.number() + 1) + '</button>' +
        '<p class="dim" style="margin-top:6px">Nothing forces you. You can stay in a finished round as long as you like.</p>';
    }
  } else {
    h += '<p>Time left in the round: <b class="warn">' + clock(GAME.season.left()) + '</b></p>' +
      '<p class="dim">Your best rung this round: <b>' + (p.bestLadderRung ? '#' + p.bestLadderRung : 'never on the ladder') + '</b></p>';
  }
  h += '</div></div>';

  if (S.lastRumble && S.lastRumble.bracket) {
    h += '<div class="box"><h3>The Bracket<span class="sub">round ' + S.lastRumble.round + '</span></h3><div class="bd">';
    for (var r = 0; r < S.lastRumble.bracket.length; r++) {
      h += '<div class="hr"></div><b>' + (r === S.lastRumble.bracket.length - 1 ? 'Final' : 'Round ' + (r + 1)) + '</b>';
      var bouts = S.lastRumble.bracket[r];
      for (var b = 0; b < bouts.length; b++) {
        var bo = bouts[b];
        if (bo.bye) { h += '<div class="dim">' + esc(bo.a) + ' walks through on a bye.</div>'; continue; }
        h += '<div>' + esc(bo.a) + ' vs ' + esc(bo.b) + ' &mdash; <b class="warn">' + esc(bo.winner) + '</b> <span class="dimmer">(' + bo.rounds + ' rounds)</span></div>';
      }
    }
    h += '</div></div>';
  }

  var hall = GAME.season.hall();
  h += '<div class="box"><h3>The Wall<span class="sub">' + hall.length + ' names</span></h3>';
  if (!hall.length) h += '<div class="bd dim">Nothing on it yet. Rounds end, names go up.</div>';
  else {
    h += '<div class="scroll"><table class="t"><tr><th class="c">Round</th><th>Champion</th><th class="c">Won</th></tr>';
    for (var i = hall.length - 1; i >= 0; i--) {
      h += '<tr><td class="c">' + hall[i].round + '</td><td>' + (hall[i].wasPlayer ? '<b class="warn">' + esc(hall[i].champion) + ' (you)</b>' : esc(hall[i].champion)) +
        '</td><td class="c dim">' + new Date(hall[i].at).toLocaleDateString() + '</td></tr>';
    }
    h += '</table></div>';
  }
  h += '</div>';

  var lt = S.lifetime;
  if (lt) {
    h += '<div class="box"><h3>Lifetime</h3><div class="bd"><div class="pgrid">' +
      '<div class="prow"><span class="k">Rounds played</span><span class="v">' + fmt(lt.rounds || 0) + '</span></div>' +
      '<div class="prow"><span class="k">Rumbles won</span><span class="v">' + fmt(lt.rumbles || 0) + '</span></div>' +
      '<div class="prow"><span class="k">Best rung ever</span><span class="v">' + (lt.bestRung && lt.bestRung < 999 ? '#' + lt.bestRung : '&mdash;') + '</span></div>' +
      '<div class="prow"><span class="k">Lifetime crimes</span><span class="v">' + fmt(lt.totalCrimes || 0) + '</span></div>' +
      '</div></div></div>';
  }
  return h;
};
