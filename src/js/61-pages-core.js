/* ============================================================
   61-pages-core.js :: City, Crimes, Job, Streets, Gym, Travel
   ============================================================ */

PAGES.city = function () {
  var p = S.player, rank = GAME.progress.rankFor(p.xp), nxt = GAME.progress.nextRank(p.xp);
  var rung = GAME.ladder.rungOf(0);
  var city = GAME.travel.current();
  var inc = GAME.props.income();

  var h = '<div class="box"><h3>' + esc(city ? city.name : 'The City') + '<span class="sub">' + esc(p.hood || p.city) + '</span></h3><div class="bd">';
  h += '<div class="who-line" style="margin-bottom:8px">' + GAME.ui.avatarTag(p, 48) +
    '<div><div class="big">' + esc(p.name) + '</div>' +
    '<div class="dim">' + esc(rank.name) + ' &middot; level ' + p.level + ' &middot; ' + esc(p.city) + '</div>' +
    (rung ? '<div><span class="tag ' + (rung === 1 ? 'gf' : 'ladder') + '">' + (rung === 1 ? 'THE GODFATHER' : 'ATTACK LADDER RUNG ' + rung) + '</span></div>' : '') +
    '</div></div>';
  h += '<div class="dim" style="font-style:italic">' + esc(rank.blurb || '') + '</div>';
  if (nxt) h += '<div class="dim" style="margin-top:4px">Next rank: <b>' + esc(nxt.name) + '</b> at ' + fmt(nxt.xp) + ' xp (' + fmt(nxt.xp - p.xp) + ' to go)</div>';
  h += '</div></div>';

  h += firstSteps();
  h += '<div class="box"><h3>Where To</h3><div class="bd">' + quickGrid() + '</div></div>';

  h += '<div class="box"><h3>Your Numbers</h3><div class="bd"><div class="pgrid">' +
    row('Strength', fmt(p.str)) + row('Guard', fmt(p.def)) +
    row('Agility', fmt(p.spd)) + row('Labour', fmt(p.dex)) +
    row('IQ', fmt(p.iq || 10)) + row('Round', GAME.season.number() + ', week ' + GAME.season.week()) +
    row('Cash', money(p.money)) + row('Bank', money(p.bank)) +
    row('Points', fmt(p.points || 0)) + row('Respect', fmt(p.respect)) +
    row('Attack power', fmt(GAME.combat.power(p))) +
    row('Property income', money(inc.hourly) + '/hr') +
    '</div></div></div>';

  if ((S.log || []).length) {
    h += '<div class="box"><h3>What Just Happened To You</h3><div class="feed">';
    var l = S.log.slice(-14).reverse();
    for (var i = 0; i < l.length; i++) h += '<div class="ln"><span class="tm">' + stampShort(l[i].t) + '</span> ' + esc(l[i].x) + '</div>';
    h += '</div></div>';
  }
  return h;
};

function row(k, v) { return '<div class="prow"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }

/* The first hour is the one that loses people. Two hundred accounts got
   here first and every one of them can flatten a man with no weapon, so
   say plainly what to do about that. */
function firstSteps() {
  var p = S.player;
  if (p.level > 6 || S.flags.stepsDone) return '';
  var steps = [
    { done: p.st.crimes > 0, t: 'Do a few crimes', d: 'Brave is the only thing they cost and it fills back up on its own.', r: 'crimes' },
    { done: !!p.wpn, t: 'Buy something to hit people with', d: 'Bare knuckle you lose to everybody. Even a pipe changes the maths.', r: 'shop' },
    { done: !!p.arm, t: 'Buy something to hit people through', d: 'Armour is the cheapest fight you will ever win.', r: 'shop' },
    { done: p.st.gymSets > 4, t: 'Put some Energy through the gym', d: 'Strength is how hard you hit, Guard is how much you soak. Keep Will topped up - it multiplies every set.', r: 'gym' },
    { done: p.st.w > 0, t: 'Win a fight', d: 'Players, then Easy Marks. Pick somebody the odds like.', r: 'players' },
    { done: p.bank > 0, t: 'Bank your cash', d: 'Money on you can be mugged. Money in the bank cannot.', r: 'bank' }
  ];
  var left = 0;
  var body = '';
  for (var i = 0; i < steps.length; i++) {
    var s2 = steps[i];
    if (!s2.done) left++;
    body += '<div class="prow" style="align-items:baseline">' +
      '<span class="k">' + (s2.done ? '<span class="good">done</span>' : '<span class="dimmer">&mdash;</span>') + ' <b class="' + (s2.done ? 'dim' : '') + '">' + s2.t + '</b>' +
      '<div class="dimmer" style="font-size:9.5px;margin-left:34px">' + s2.d + '</div></span>' +
      '<span class="v">' + (s2.done ? '' : '<a class="btn sm" href="#/' + s2.r + '" data-nav="' + s2.r + '">go</a>') + '</span></div>';
  }
  if (!left) { S.flags.stepsDone = true; return ''; }
  return '<div class="box"><h3>First Week On The Street<span class="sub">' + left + ' to go</span></h3><div class="bd">' +
    body + '</div></div>';
}

function quickGrid() {
  var items = [
    ['crimes', 'Do a crime', 'Spend Brave for money and xp'],
    ['ladder', 'Attack Ladder', 'Twenty rungs. Ten points an hour.'],
    ['players', 'Find someone to hit', 'Browse who is online'],
    ['gym', 'Train', 'Energy buys the set, Will multiplies it'],
    ['jobs', 'Work a shift', 'Spend Energy for safe money'],
    ['streets', 'Go for a walk', 'Spend Energy, see what turns up']
  ];
  var out = '<div class="pgrid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px">';
  for (var i = 0; i < items.length; i++) {
    out += '<a class="btn" style="text-align:left;padding:6px 8px" href="#/' + items[i][0] + '" data-nav="' + items[i][0] + '">' +
      '<b>' + items[i][1] + '</b><br><span class="dim" style="font-size:9.5px">' + items[i][2] + '</span></a>';
  }
  return out + '</div>';
}

/* ---------------- Crimes ---------------- */
PAGES.crimes = function () {
  var p = S.player;
  var list = GAME.crimes.list();
  var showAll = !!S.uiShowAllCrimes;
  var h = '<div class="box"><h3>Crimes<span class="sub">Brave ' + Math.floor(p.nerve) + '/' + p.nerveMax + '</span></h3><div class="bd">' +
    '<p class="dim">Crimes cost <b>Brave</b>. Fail one and you might do time. Your Dexterity and IQ raise the odds, and so does being well above the level it was written for.</p>' +
    '<label><input type="checkbox" data-act="togglecrimes" ' + (showAll ? 'checked' : '') + '> <span class="dim">show crimes I cannot do yet</span></label>' +
    '</div><div class="scroll"><table class="t"><tr><th>Crime</th><th class="c">Lvl</th><th class="c">Brave</th><th class="c">Odds</th><th class="r">Pays</th><th class="c">Done</th><th></th></tr>';

  var shown = 0;
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    var locked = p.level < c.lvl;
    if (locked && !showAll) continue;
    shown++;
    var ch = GAME.crimes.successChance(c, p);
    var can = !locked && p.nerve >= c.brave && !GAME.player.blocked();
    var oc = ch > 0.85 ? 'd-easy' : ch > 0.65 ? 'd-fav' : ch > 0.45 ? 'd-even' : ch > 0.25 ? 'd-risk' : 'd-hard';
    h += '<tr' + (locked ? ' style="opacity:.45"' : '') + '><td><b>' + esc(c.name) + '</b><div class="dimmer" style="font-size:9.5px">tier ' + c.tier + '</div></td>' +
      '<td class="c">' + c.lvl + '</td>' +
      '<td class="c">' + c.brave + '</td>' +
      '<td class="c ' + oc + '">' + Math.round(ch * 100) + '%</td>' +
      '<td class="r">' + money(c.pay[0]) + ' &ndash; ' + money(c.pay[1]) + '</td>' +
      '<td class="c dim">' + fmt((S.mastery && S.mastery[c.id]) || 0) + '</td>' +
      '<td class="r"><button class="btn sm red ' + (can ? '' : 'off') + '" data-act="crime" data-id="' + c.id + '">Do it</button></td></tr>';
  }
  if (!shown) h += '<tr><td colspan="7" class="dim">Nothing you can pull off yet. Work a shift and come back.</td></tr>';
  h += '</table></div></div>';

  if (S.lastCrime) {
    h = '<div class="box"><h3>' + (S.lastCrime.ok ? 'It went clean' : (S.lastCrime.jailed ? 'You got pinched' : 'It fell apart')) + '</h3><div class="bd">' +
      '<p>' + esc(S.lastCrime.text) + '</p>' +
      (S.lastCrime.ok ? '<p class="good">' + money(S.lastCrime.cash) + ' and ' + S.lastCrime.xp + ' experience.</p>' : '') +
      (S.lastCrime.jailed ? '<p class="bad">' + Math.round(S.lastCrime.secs / 60) + ' minutes in the cells.</p>' : '') +
      '</div></div>' + h;
  }
  return h;
};

/* ---------------- Your Job ---------------- */
PAGES.jobs = function () {
  var p = S.player, list = GAME.crimes.jobs();
  var h = '<div class="box"><h3>Your Job<span class="sub">Energy ' + Math.floor(p.energy) + '/' + p.energyMax + ' &middot; Labour ' + fmt(p.dex) + '</span></h3><div class="bd">' +
    '<p class="dim">Honest-ish work. Shifts cost <b>Energy</b>, never fail and never put you inside. Better positions want more <b>Labour</b>, ' +
    'and every shift you work teaches you a little more of it. It pays worse than the crime you could be doing instead, which is exactly the point.</p></div>' +
    '<div class="scroll"><table class="t"><tr><th>Shift</th><th class="c">Lvl</th><th class="c">Labour</th><th class="c">Energy</th><th class="r">Pays</th><th class="r">XP</th><th></th></tr>';
  for (var i = 0; i < list.length; i++) {
    var j = list[i];
    var locked = p.level < j.lvl || (p.dex || 10) < (j.lab || 0);
    var can = !locked && p.energy >= j.energy && !GAME.player.blocked();
    h += '<tr' + (locked ? ' style="opacity:.45"' : '') + '><td><b>' + esc(j.name) + '</b><div class="dimmer" style="font-size:9.5px">' + esc(j.desc || '') + '</div></td>' +
      '<td class="c">' + j.lvl + '</td><td class="c">' + (j.lab ? fmt(j.lab) : '&mdash;') + '</td><td class="c">' + j.energy + '</td>' +
      '<td class="r">' + money(j.pay[0]) + ' &ndash; ' + money(j.pay[1]) + '</td>' +
      '<td class="r dim">' + j.xp[0] + '&ndash;' + j.xp[1] + '</td>' +
      '<td class="r"><button class="btn sm ' + (can ? '' : 'off') + '" data-act="job" data-id="' + j.id + '">Work</button></td></tr>';
  }
  h += '</table></div></div>';
  if (S.lastJob) h = '<div class="box"><h3>Shift done</h3><div class="bd"><p>' + esc(S.lastJob.desc || S.lastJob.name) +
    '</p><p class="good">' + money(S.lastJob.cash) + ' and ' + S.lastJob.xp + ' xp.</p></div></div>' + h;
  return h;
};

/* ---------------- Go For A Walk ---------------- */
PAGES.streets = function () {
  var p = S.player;
  var h = '<div class="box"><h3>The Streets<span class="sub">' + GAME.streets.COST + ' Energy a lap</span></h3><div class="bd">' +
    '<p class="dim">Walk around and see what turns up. You might find a gun, a roll of bills, or a body. You might also find a squad car, a fist, or the front of a gypsy cab.</p>' +
    '<button class="btn red ' + (p.energy >= GAME.streets.COST && !GAME.player.blocked() ? '' : 'off') + '" data-act="walk">Take a walk</button> ' +
    '<button class="btn ' + (p.energy >= GAME.streets.COST * 5 && !GAME.player.blocked() ? '' : 'off') + '" data-act="walk5">Walk five blocks</button>' +
    '</div></div>';
  var w = S.walkLog || [];
  if (w.length) {
    h += '<div class="box"><h3>What You Found</h3><div class="feed">';
    for (var i = w.length - 1; i >= 0; i--) {
      h += '<div class="ln k-' + (w[i].kind === 'cash' || w[i].kind === 'item' || w[i].kind === 'points' ? 'money' : w[i].kind === 'none' ? 'flavor' : 'atk') + '">' +
        '<span class="tm">' + stampShort(w[i].t) + '</span> ' + esc(w[i].text) + '</div>';
    }
    h += '</div></div>';
  }
  h += '<div class="box"><h3>Walking Record</h3><div class="bd"><div class="pgrid">' +
    row('Laps walked', fmt(p.st.walks || 0)) + row('Things found', fmt(p.st.finds || 0)) +
    '</div></div></div>';
  return h;
};

/* ---------------- Gym ---------------- */
PAGES.gym = function () {
  var p = S.player, cur = GAME.gym.current(), owned = GAME.gym.owned();
  var sets = S.uiSets || 1;
  var STATS = [['str', 'Strength', 'how hard you hit'], ['def', 'Guard', 'how much you soak'],
               ['spd', 'Agility', 'how easy you are to hit'], ['dex', 'Labour', 'what a shift pays, and truck loads']];
  var inJail = GAME.player.inJail();
  var wf = GAME.gym.willFactor();

  var h = '<div class="box"><h3>' + (inJail ? 'The Jail Gym' : esc(cur ? cur.name : 'Gym')) +
    '<span class="sub">Energy ' + Math.floor(p.energy) + '/' + p.energyMax + ' &middot; Will ' + Math.floor(p.will) + '/' + p.willMax + '</span></h3><div class="bd">' +
    (inJail ? '<p class="warn">A bare room with a bench and no plates. Everything trains at half rate in here.</p>' : '<p class="dim">' + esc(cur ? cur.desc : '') + '</p>') +
    '<p class="dim">A set costs <b>' + GAME.gym.ENERGY_PER_SET + ' Energy and 1 Will</b>. Energy is the same bar you attack with, so you are always choosing. ' +
    '<b>Will is the multiplier</b> &mdash; the fuller it is, the more every set is worth, which is why the old hands tell you to refill Will before Energy. ' +
    'Right now Will is worth <b>' + Math.round(wf * 100) + '%</b>.</p>' +
    '<div style="margin-bottom:6px">Sets per click: ' +
    [1, 5, 10, 25, 'max'].map(function (n) {
      return '<button class="btn sm ' + (String(sets) === String(n) ? 'gold' : '') + '" data-act="sets" data-n="' + n + '">' + n + '</button>';
    }).join(' ') + '</div>';
  h += '<table class="t"><tr><th>Stat</th><th class="r">Now</th><th class="c">Gym rate</th><th class="r">Gain</th><th></th></tr>';
  for (var i = 0; i < STATS.length; i++) {
    var k = STATS[i][0];
    var mult = cur ? (cur[k] || 0) : 0;
    var n = sets === 'max' ? Math.max(1, Math.floor(p.energy / GAME.gym.ENERGY_PER_SET)) : Number(sets);
    var gain = GAME.gym.gainFor(k, n);
    h += '<tr><td><b>' + STATS[i][1] + '</b> <span class="dimmer">' + STATS[i][2] + '</span></td>' +
      '<td class="r">' + fmt(p[k] || 10) + '</td>' +
      '<td class="c ' + (mult ? '' : 'dimmer') + '">' + (mult ? mult.toFixed(1) + 'x' : 'not here') + '</td>' +
      '<td class="r good">' + (mult ? '+' + gain.toFixed(2) : '&mdash;') + '</td>' +
      '<td class="r"><button class="btn sm ' + (mult && p.energy >= GAME.gym.ENERGY_PER_SET && (!GAME.player.blocked() || inJail) ? '' : 'off') +
      '" data-act="train" data-id="' + k + '">Train</button></td></tr>';
  }
  h += '</table></div></div>';

  h += '<div class="box"><h3>Gyms In Town</h3><div class="scroll"><table class="t"><tr><th>Gym</th><th class="c">Lvl</th><th class="r">Membership</th><th class="c">Str</th><th class="c">Grd</th><th class="c">Agi</th><th class="c">Lab</th><th></th></tr>';
  var gl = GAME.gym.list();
  for (var g = 0; g < gl.length; g++) {
    var G = gl[g], have = owned.indexOf(G.id) >= 0, here = cur && cur.id === G.id;
    h += '<tr' + (p.level < G.lvl ? ' style="opacity:.5"' : '') + '><td><b>' + esc(G.name) + '</b><div class="dimmer" style="font-size:9.5px">' + esc(G.desc || '') + '</div></td>' +
      '<td class="c">' + G.lvl + '</td><td class="r">' + (G.price ? money(G.price) : 'free') + '</td>' +
      '<td class="c">' + (G.str || '&mdash;') + '</td><td class="c">' + (G.def || '&mdash;') + '</td>' +
      '<td class="c">' + (G.spd || '&mdash;') + '</td><td class="c">' + (G.dex || '&mdash;') + '</td>' +
      '<td class="r">' + (here ? '<span class="tag on">training here</span>' :
        '<button class="btn sm ' + (p.level >= G.lvl && (have || p.money >= G.price) ? '' : 'off') + '" data-act="joingym" data-id="' + G.id + '">' + (have ? 'Switch' : 'Join') + '</button>') + '</td></tr>';
  }
  h += '</table></div></div>';
  h += '<div class="box"><h3>What The Gym Will Not Sell You</h3><div class="bd">' +
    '<p class="dim"><b>IQ</b> cannot be trained here at any price. It comes from the <a href="#/school" data-nav="school">local schools</a>, ' +
    'from working shifts, and from the <a href="#/trade" data-nav="trade">Trade Point</a> menu at 8 points apiece. ' +
    'It decides how often your crimes come off and how well you bust people out of jail. You have <b>' + fmt(p.iq || 10) + '</b>.</p></div></div>';
  return h;
};

/* ---------------- Point Gym ---------------- */
PAGES.pointgym = function () {
  var p = S.player;
  var STATS = [['str', 'Strength'], ['def', 'Guard'], ['spd', 'Agility'], ['dex', 'Labour']];
  var h = '<div class="box"><h3>The Point Gym<span class="sub">' + fmt(p.points || 0) + ' points</span></h3><div class="bd">' +
    '<p class="dim">Private floor, no windows, no waiting. Training here costs <b>points</b> instead of Energy, and a point set is worth a lot more than an Energy set.</p>' +
    '<p class="dim">6 points a set.</p></div><table class="t"><tr><th>Stat</th><th class="r">Now</th><th></th></tr>';
  for (var i = 0; i < STATS.length; i++) {
    h += '<tr><td><b>' + STATS[i][1] + '</b></td><td class="r">' + fmt(p[STATS[i][0]] || 10) + '</td><td class="r">' +
      [1, 5, 25].map(function (n) {
        return '<button class="btn sm ' + ((p.points || 0) >= 6 * n ? '' : 'off') + '" data-act="ptrain" data-id="' + STATS[i][0] + '" data-n="' + n + '">x' + n + '</button>';
      }).join(' ') + '</td></tr>';
  }
  h += '</table></div>';
  return h;
};

/* ---------------- Travel ---------------- */
PAGES.travel = function () {
  var p = S.player, cur = GAME.travel.currentId();
  var h = '<div class="box"><h3>Airport</h3><div class="bd"><p class="dim">Different cities run different games. Crimes pay better in some places and the heat is lower in others. You keep everything you are carrying.</p></div>' +
    '<div class="scroll"><table class="t"><tr><th>City</th><th class="r">Airfare</th><th class="c">Flight</th><th class="c">Crime</th><th class="c">Payout</th><th></th></tr>';
  var l = GAME.travel.list();
  for (var i = 0; i < l.length; i++) {
    var c = l[i], here = c.id === cur;
    h += '<tr><td><b>' + esc(c.name) + '</b> <span class="dimmer">' + esc(c.country || '') + '</span>' +
      '<div class="dimmer" style="font-size:9.5px">' + esc(c.desc || '') + '</div></td>' +
      '<td class="r">' + (c.cost ? money(c.cost) : '&mdash;') + '</td>' +
      '<td class="c">' + (c.flightMin || 0) + 'm</td>' +
      '<td class="c ' + ((c.bonus.crime || 0) >= 0 ? 'good' : 'bad') + '">' + ((c.bonus.crime || 0) >= 0 ? '+' : '') + Math.round((c.bonus.crime || 0) * 100) + '%</td>' +
      '<td class="c ' + ((c.bonus.pay || 0) >= 0 ? 'good' : 'bad') + '">' + ((c.bonus.pay || 0) >= 0 ? '+' : '') + Math.round((c.bonus.pay || 0) * 100) + '%</td>' +
      '<td class="r">' + (here ? '<span class="tag on">you are here</span>' :
        '<button class="btn sm ' + (p.money >= c.cost && !GAME.player.blocked() ? '' : 'off') + '" data-act="fly" data-id="' + c.id + '">Fly</button>') + '</td></tr>';
  }
  h += '</table></div></div>';
  return h;
};
