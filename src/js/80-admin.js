/* ============================================================
   80-admin.js :: the back office
   Click CITY six times quickly and this opens. Everything in the
   game is reachable from here - the player, all two hundred
   accounts, the ladder, the clock, the economy, every content
   table and every tuning constant - either through a curated
   panel or through the raw object browser, which can reach any
   value the game holds.
   ============================================================ */

GAME.admin = (function () {

  var open = false;
  var tab = 'you';
  var npcQuery = '';
  var npcSel = null;
  var browsePath = 'S';
  var lastMsg = '';

  var TABS = [
    ['you', 'You'], ['npcs', 'Players'], ['ladder', 'Ladder'], ['world', 'World & Time'],
    ['economy', 'Economy'], ['data', 'Content'], ['fams', 'Families'], ['feeds', 'Feeds'],
    ['config', 'Tuning'], ['browse', 'Raw Data'], ['save', 'Save']
  ];

  function roots() { return { S: S, CFG: CFG, DATA: DATA }; }

  /* ---- path access: "S.player.money", "DATA.crimes.3.pay.0" ---- */
  function getPath(path) {
    var parts = String(path).split('.');
    var node = roots()[parts[0]];
    for (var i = 1; i < parts.length && node !== undefined && node !== null; i++) node = node[parts[i]];
    return node;
  }
  function setPath(path, raw) {
    var parts = String(path).split('.');
    var node = roots()[parts[0]];
    for (var i = 1; i < parts.length - 1; i++) {
      if (node === undefined || node === null) return 'No such path.';
      node = node[parts[i]];
    }
    if (node === undefined || node === null) return 'No such path.';
    var key = parts[parts.length - 1];
    var cur = node[key];
    var val = raw;
    if (typeof cur === 'number') {
      val = Number(raw);
      if (isNaN(val)) return 'Not a number.';
    } else if (typeof cur === 'boolean') {
      val = (raw === 'true' || raw === true || raw === '1' || raw === 1);
    } else if (cur !== null && typeof cur === 'object') {
      try { val = JSON.parse(raw); } catch (e) { return 'Not valid JSON.'; }
    }
    node[key] = val;
    return null;
  }

  function typeOf(v) {
    if (v === null) return 'null';
    if (Object.prototype.toString.call(v) === '[object Array]') return 'array';
    return typeof v;
  }

  /* ---- shared field widgets ---- */
  function field(path, label, opts) {
    opts = opts || {};
    var v = getPath(path);
    var t = typeOf(v);
    var id = 'adm_' + path.replace(/[^\w]/g, '_');
    var input;
    if (t === 'boolean') {
      input = '<input type="checkbox" id="' + id + '" data-adm="tog" data-path="' + esc(path) + '"' + (v ? ' checked' : '') + '>';
    } else if (t === 'object' || t === 'array') {
      input = '<input type="text" id="' + id + '" value="' + esc(JSON.stringify(v)) + '" data-adm-live="' + esc(path) + '">';
    } else {
      input = '<input type="' + (t === 'number' ? 'number' : 'text') + '" step="any" id="' + id + '" value="' +
        esc(v === undefined ? '' : v) + '" data-adm-live="' + esc(path) + '">';
    }
    return '<label class="admf"><span title="' + esc(path) + '">' + esc(label || path.split('.').pop()) +
      (opts.hint ? ' <i>' + esc(opts.hint) + '</i>' : '') + '</span>' + input + '</label>';
  }

  function fields(prefix, keys, labels) {
    var out = '';
    for (var i = 0; i < keys.length; i++) {
      if (getPath(prefix + '.' + keys[i]) === undefined) continue;
      out += field(prefix + '.' + keys[i], (labels && labels[i]) || keys[i]);
    }
    return out;
  }

  function btn(act, label, cls, extra) {
    return '<button class="btn sm ' + (cls || '') + '" data-adm="' + act + '"' + (extra || '') + '>' + label + '</button>';
  }

  function grid(inner) { return '<div class="admgrid">' + inner + '</div>'; }
  function sect(title, inner) { return '<div class="admsect"><h4>' + title + '</h4>' + inner + '</div>'; }

  /* ================= tabs ================= */

  function tabYou() {
    var p = S.player;
    var h = sect('Identity', grid(
      fields('S.player', ['name', 'real', 'city', 'hood', 'gender', 'sig', 'bio'])
    ));
    h += sect('Level and rank', grid(
      fields('S.player', ['level', 'xp', 'respect', 'points'])
    ) + '<div class="admrow">' +
      btn('lvlup', '+1 level') + btn('lvl10', '+10 levels') + btn('lvl50', '+50 levels') +
      btn('maxrank', 'Jump to the top rank', 'gold') + btn('resetlvl', 'Back to level 1', 'red') +
      '</div><p class="dim">Rank follows experience. Setting the level directly does not move experience, so use the buttons if you want both to agree.</p>');

    h += sect('Stats', grid(fields('S.player', ['str', 'def', 'spd', 'dex', 'iq'],
      ['Strength', 'Guard', 'Agility', 'Labour', 'IQ'])) +
      '<div class="admrow">' + btn('stats100', 'All stats +100') + btn('stats10k', 'All stats +10,000') +
      btn('statsmatch', 'Match the strongest player in the city', 'gold') + '</div>');

    h += sect('Gauges', grid(fields('S.player',
      ['energy', 'energyMax', 'nerve', 'nerveMax', 'will', 'willMax', 'dexg', 'dexgMax', 'health', 'healthMax', 'attacks', 'attacksMax'])) +
      '<div class="admrow">' + btn('fillall', 'Fill everything', 'green') + btn('emptyall', 'Empty everything') + '</div>');

    h += sect('Money', grid(fields('S.player', ['money', 'bank'])) +
      '<div class="admrow">' + btn('cash1m', '+$1m') + btn('cash1b', '+$1bn') + btn('cash1t', '+$1tn') +
      btn('pts1k', '+1,000 points') + btn('broke', 'Take it all', 'red') + '</div>');

    h += sect('Status', grid(fields('S.player', ['hospUntil', 'jailUntil', 'bail', 'bgUntil', 'travelUntil', 'ladderLock', 'retainerUntil'])) +
      '<div class="admrow">' + btn('clearstatus', 'Clear hospital, jail, transit and locks', 'green') +
      btn('hospme', 'Put me in hospital') + btn('jailme', 'Put me in jail') + '</div>');

    h += sect('Records', grid(fields('S.player.st',
      ['w', 'l', 'crimes', 'crimeFail', 'jailed', 'hosped', 'mugged', 'muggedBy', 'earned', 'spent', 'gymSets', 'busts', 'posts', 'walks', 'runs', 'killsOnLadder'])));
    return h;
  }

  function tabNpcs() {
    var q = npcQuery.toLowerCase();
    var list = S.npcs.filter(function (n) { return !q || n.name.toLowerCase().indexOf(q) >= 0; });
    list.sort(function (a, b) { return b.level - a.level; });

    var h = sect('Find an account',
      '<div class="admrow"><input type="text" id="adm-q" placeholder="screen name" value="' + esc(npcQuery) + '" style="width:200px"> ' +
      btn('search', 'Search') + btn('clearq', 'Clear') +
      ' <span class="dim">' + list.length + ' of ' + S.npcs.length + '</span></div>' +
      '<div class="admrow">' + btn('addnpc', 'Create an account', 'green') +
      btn('bulklvl', 'Give everybody +5 levels') +
      btn('bulkreset', 'Send everybody back to level 1', 'red') +
      btn('bulkheal', 'Empty the hospital and the cells') +
      btn('bulkcash', 'Give everybody $1m') + '</div>');

    if (npcSel !== null) {
      var n = byId(npcSel);
      if (n && n.id !== 0) {
        var i = S.npcs.indexOf(n);
        var pre = 'S.npcs.' + i;
        h += sect('Editing ' + esc(n.name) + ' <span class="dim">(id ' + n.id + ', rung ' +
          (GAME.ladder.rungOf(n.id) || '&mdash;') + ')</span>',
          grid(fields(pre, ['name', 'real', 'city', 'age', 'gender', 'arch', 'level', 'xp', 'money', 'bank', 'points',
            'str', 'def', 'spd', 'dex', 'iq', 'health', 'healthMax', 'energy', 'nerve', 'will', 'dexg', 'attacks',
            'respect', 'w', 'l', 'crimes', 'posts', 'op', 'grudge', 'fear', 'bounty', 'fam', 'famRole',
            'hospUntil', 'jailUntil', 'bgUntil', 'dead', 'pf', 'tz', 'peak', 'sessionLen', 'wpn', 'arm', 'sig', 'bio'])) +
          '<h5>Temperament</h5>' +
          grid(fields(pre + '.p', ['aggro', 'activity', 'chatty', 'vindictive', 'loyalty', 'greed', 'honesty', 'ego', 'humor', 'skill', 'patience', 'generosity'])) +
          '<div class="admrow">' +
          btn('npcHere', 'Bring them online') + btn('npcGone', 'Log them off') +
          btn('npcLove', 'Make them like me') + btn('npcHate', 'Make them hate me') +
          btn('npcLadder', 'Put them on the ladder', 'gold') +
          btn('npcGear', 'Give them the best gear they can hold') +
          btn('npcKill', 'Retire this account', 'red') +
          btn('npcClose', 'Close') + '</div>');
      }
    }

    h += '<div class="scroll"><table class="t"><tr><th>Name</th><th class="c">Lvl</th><th class="r">Power</th><th class="c">Rung</th><th class="c">Online</th><th class="c">Opinion</th><th></th></tr>';
    for (var k = 0; k < Math.min(list.length, 120); k++) {
      var e = list[k];
      h += '<tr><td>' + esc(e.name) + (e.dead ? ' <span class="tag off">retired</span>' : '') + '</td>' +
        '<td class="c">' + e.level + '</td><td class="r">' + fmt(GAME.combat.power(e)) + '</td>' +
        '<td class="c">' + (GAME.ladder.rungOf(e.id) || '&mdash;') + '</td>' +
        '<td class="c">' + (e.online ? '<span class="good">yes</span>' : '<span class="dim">no</span>') + '</td>' +
        '<td class="c ' + (e.op < -20 ? 'bad' : e.op > 20 ? 'good' : 'dim') + '">' + Math.round(e.op) + '</td>' +
        '<td class="r">' + btn('pick', 'Edit', '', ' data-id="' + e.id + '"') + '</td></tr>';
    }
    h += '</table></div>';
    return h;
  }

  function tabLadder() {
    var rows = GAME.ladder.rows();
    var h = sect('The Attack Ladder',
      '<div class="admrow">' +
      btn('ladme1', 'Put me on rung 1', 'gold') + btn('ladme20', 'Put me on rung 20') +
      btn('ladoff', 'Take me off the ladder') + btn('ladseed', 'Reseed from raw power') +
      btn('ladshuffle', 'Shuffle it') + btn('ladchal', 'Run 50 game-hours of challenges') +
      '</div><p class="dim">Rung one is the Godfather. Dragging is not a thing here &mdash; use the arrows.</p>');
    h += '<div class="scroll"><table class="t"><tr><th class="c">Rung</th><th>Holder</th><th class="c">Lvl</th><th class="r">Power</th><th class="c">Held</th><th></th></tr>';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      h += '<tr><td class="c"><b>' + r.rung + '</b></td>' +
        '<td>' + (r.isMe ? '<b class="warn">' + esc(r.e.name) + ' (you)</b>' : esc(r.e.name)) + '</td>' +
        '<td class="c">' + r.e.level + '</td><td class="r">' + fmt(GAME.combat.power(r.e)) + '</td>' +
        '<td class="c dim">' + r.held + 'd</td>' +
        '<td class="r nowrap">' + btn('ladup', '&uarr;', '', ' data-n="' + r.rung + '"') + ' ' +
        btn('laddown', '&darr;', '', ' data-n="' + r.rung + '"') + ' ' +
        btn('ladkick', 'Off', 'red', ' data-n="' + r.rung + '"') + '</td></tr>';
    }
    h += '</table></div>';
    return h;
  }

  function tabWorld() {
    var h = sect('Skip forward',
      '<p class="dim">Runs the whole city forward: everybody plays, the ladder fights, the market moves, ' +
      'people quit and sign up. Exactly what happens while the tab is closed.</p><div class="admrow">' +
      btn('fw1h', '1 hour') + btn('fw6h', '6 hours') + btn('fw1d', '1 day') + btn('fw3d', '3 days') +
      btn('fw7d', '1 week') + btn('fw30d', '1 month', 'gold') + btn('fw90d', '3 months', 'gold') +
      '</div><div class="admrow"><input type="number" id="adm-fw" value="24" style="width:80px"> ' +
      btn('fwn', 'hours &mdash; go', 'green') + '</div>');

    h += sect('The round', grid(fields('S', ['roundNo', 'seasonStart', 'rumbleDone'])) +
      '<div class="admrow">' + btn('endround', 'End the round now') + btn('rumble', 'Fight The Rumble', 'red') +
      btn('nextround', 'Start the next round', 'gold') + '</div>' +
      '<p class="dim">Round ' + GAME.season.number() + ', week ' + GAME.season.week() + ', ' +
      (GAME.season.over() ? 'over' : clock(GAME.season.left()) + ' left') + '.</p>');

    h += sect('Who is about',
      '<p class="dim">' + GAME.sim.onlineCount() + ' online of ' + S.npcs.filter(function (n) { return !n.dead; }).length + ' living accounts.</p>' +
      '<div class="admrow">' + btn('allon', 'Bring everybody online') + btn('alloff', 'Send everybody home') +
      btn('presence', 'Roll presence again') + '</div>');

    h += sect('Make something happen', '<div class="admrow">' +
      btn('evAttackMe', 'Have somebody jump me') +
      btn('evMailMe', 'Send me some mail') +
      btn('evBounty', 'Put a bounty on my head') +
      btn('evChat', 'Get the shoutbox going') +
      btn('evWar', 'Start a family war') +
      btn('evNews', 'Fill the newspaper') + '</div>');

    h += sect('The simulation', grid(fields('CFG', ['UI_TICK', 'SIM_STEP', 'OFFLINE_MAX', 'OFFLINE_STEP_MS', 'NPC_COUNT', 'pace'])) +
      '<div class="admrow">' + btn('simstop', 'Pause the world') + btn('simstart', 'Start it again', 'green') + '</div>');
    return h;
  }

  function tabEconomy() {
    var h = sect('Markets', '<p class="dim">' + GAME.market.listings().length + ' item lots, ' +
      GAME.auction.lots().length + ' auction lots, ' + GAME.points.market().length + ' point listings.</p>' +
      '<div class="admrow">' + btn('reseedmkt', 'Restock the item market') + btn('reseedauc', 'Restock the auction') +
      btn('reseedpts', 'Restock the point market') + btn('clearmkt', 'Clear every market', 'red') + '</div>');
    h += sect('Give yourself', '<div class="admrow">' +
      btn('allitems', 'One of every item', 'gold') + btn('allprops', 'Every property', 'gold') +
      btn('allgyms', 'Every gym membership') + btn('bestgear', 'The best weapon and armour in the game') + '</div>');
    h += sect('Tuning', grid(fields('CFG', ['BANK_RATE', 'MUG_FRACTION', 'DROP_CHANCE', 'START_MONEY', 'HOSP_MIN', 'HOSP_MAX', 'JAIL_MIN', 'JAIL_MAX'])));
    h += sect('The hitlist', '<p class="dim">' + (S.hitlist || []).length + ' open bounties.</p>' +
      '<div class="admrow">' + btn('clearhits', 'Clear the hitlist') + '</div>');
    return h;
  }

  function tabData() {
    var sets = [
      ['crimes', 'Crimes', ['id', 'name', 'tier', 'lvl', 'brave', 'base', 'pay', 'xp', 'jail', 'jailP']],
      ['jobs', 'Jobs', ['id', 'name', 'lvl', 'energy', 'lab', 'pay', 'xp']],
      ['items', 'Items', ['id', 'name', 'cat', 'lvl', 'price', 'atk', 'def', 'acc', 'heal', 'stock']],
      ['props', 'Property', ['id', 'name', 'kind', 'lvl', 'price', 'upkeep', 'income', 'hp', 'energyRegen']],
      ['gym', 'Gyms', ['id', 'name', 'lvl', 'price', 'str', 'def', 'spd', 'dex']],
      ['cities', 'Cities', ['id', 'name', 'cost', 'flightMin']],
      ['ranks', 'Ranks', ['name', 'lvl', 'xp']],
      ['oc', 'Organised Crime', ['id', 'name', 'lvl', 'minCrew', 'cut', 'xp', 'cooldownH']]
    ];
    var which = S._admData || 'crimes';
    var h = '<div class="admrow">';
    for (var i = 0; i < sets.length; i++) {
      h += btn('dset', sets[i][1] + ' <span class="dim">(' + ((DATA[sets[i][0]] || []).length) + ')</span>',
        which === sets[i][0] ? 'gold' : '', ' data-id="' + sets[i][0] + '"');
    }
    h += '</div>';
    var def = null;
    for (var k = 0; k < sets.length; k++) if (sets[k][0] === which) def = sets[k];
    if (!def) return h + '<p class="dim">Nothing selected.</p>';
    var arr = DATA[which] || [];
    h += '<p class="dim">Editing <b>DATA.' + which + '</b>. Changes take effect immediately and are saved with your game.</p>';
    h += '<div class="scroll" style="max-height:52vh"><table class="t admtable"><tr><th class="c">#</th>';
    for (var c = 0; c < def[2].length; c++) h += '<th>' + def[2][c] + '</th>';
    h += '</tr>';
    for (var r = 0; r < Math.min(arr.length, 300); r++) {
      h += '<tr><td class="c dim">' + r + '</td>';
      for (var f = 0; f < def[2].length; f++) {
        var path = 'DATA.' + which + '.' + r + '.' + def[2][f];
        var v = getPath(path);
        if (v === undefined) { h += '<td class="dimmer">&mdash;</td>'; continue; }
        var show = (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
        h += '<td><input class="admcell" value="' + esc(show) + '" data-adm-live="' + esc(path) + '"></td>';
      }
      h += '</tr>';
    }
    h += '</table></div>';
    if (arr.length > 300) h += '<p class="dim">Showing the first 300 of ' + arr.length + '. Use Raw Data to reach the rest.</p>';
    return h;
  }

  function tabFams() {
    var h = sect('Families', '<div class="admrow">' + btn('addfam', 'Found one', 'green') +
      btn('joinfam1', 'Put me in the strongest family') + btn('leavefam', 'Take me out') + '</div>');
    h += '<div class="scroll"><table class="t"><tr><th>Name</th><th>Tag</th><th class="c">Members</th><th class="r">Power</th><th class="c">Wars</th><th></th></tr>';
    for (var i = 0; i < S.fams.length; i++) {
      var f = S.fams[i];
      h += '<tr><td><input class="admcell" value="' + esc(f.name) + '" data-adm-live="S.fams.' + i + '.name"></td>' +
        '<td><input class="admcell" style="width:60px" value="' + esc(f.tag) + '" data-adm-live="S.fams.' + i + '.tag"></td>' +
        '<td class="c">' + GAME.family.membersOf(f).length + '</td>' +
        '<td class="r">' + fmt(GAME.family.power(f)) + '</td>' +
        '<td class="c">' + f.wars.length + '</td>' +
        '<td class="r">' + btn('famboom', 'Disband', 'red', ' data-id="' + f.id + '"') + '</td></tr>';
    }
    h += '</table></div>';
    return h;
  }

  function tabFeeds() {
    var h = sect('Put something in the newspaper',
      '<input type="text" id="adm-news" placeholder="Somebody did something to somebody." style="width:70%"> ' +
      btn('postnews', 'Print it', 'green'));
    h += sect('Say something in the shoutbox as anybody',
      '<div class="admrow"><input type="text" id="adm-who" placeholder="screen name (blank = a random one)" style="width:200px"> ' +
      '<input type="text" id="adm-say" placeholder="what they say" style="width:45%"> ' + btn('postsay', 'Send') + '</div>');
    h += sect('Send yourself mail from anybody',
      '<div class="admrow"><input type="text" id="adm-mfrom" placeholder="screen name" style="width:180px"> ' +
      '<input type="text" id="adm-msub" placeholder="subject" style="width:180px"></div>' +
      '<textarea id="adm-mbody" placeholder="body" style="min-height:60px"></textarea>' + btn('postmail', 'Deliver it'));
    h += sect('Housekeeping', '<div class="admrow">' +
      btn('clearnews', 'Empty the newspaper') + btn('clearchat', 'Empty the shoutbox') +
      btn('clearmail', 'Empty my inbox') + btn('clearlog', 'Empty my event log') + '</div>');
    return h;
  }

  function tabConfig() {
    var keys = [];
    for (var k in CFG) if (CFG.hasOwnProperty(k) && typeof CFG[k] !== 'function') keys.push(k);
    keys.sort();
    var h = '<p class="dim">Every tuning constant in the game. Times are in milliseconds. A cap of 0 means no cap. ' +
      'These are saved with your game.</p>' + grid(fields('CFG', keys));
    h += '<div class="admrow">' + btn('cfgdefault', 'Put everything back', 'red') + '</div>';
    return h;
  }

  function tabBrowse() {
    var node = getPath(browsePath);
    var t = typeOf(node);
    var parts = browsePath.split('.');
    var crumb = '';
    for (var i = 0; i < parts.length; i++) {
      crumb += (i ? ' <span class="dim">.</span> ' : '') +
        btn('crumb', esc(parts[i]), i === parts.length - 1 ? 'gold' : '', ' data-id="' + esc(parts.slice(0, i + 1).join('.')) + '"');
    }
    var h = sect('Raw data browser',
      '<p class="dim">Everything the game holds, live. <b>S</b> is your saved world, <b>CFG</b> the tuning constants, ' +
      '<b>DATA</b> the content tables. Click into anything; edit any value in place.</p>' +
      '<div class="admrow">' + btn('crumb', 'S', '', ' data-id="S"') + btn('crumb', 'CFG', '', ' data-id="CFG"') +
      btn('crumb', 'DATA', '', ' data-id="DATA"') + '</div>' +
      '<div class="admrow admcrumb">' + crumb + '</div>');

    if (t !== 'object' && t !== 'array') {
      return h + '<div class="admsect">' + field(browsePath, parts[parts.length - 1]) + '</div>';
    }
    var keys = [];
    for (var k2 in node) if (Object.prototype.hasOwnProperty.call(node, k2)) keys.push(k2);
    if (t !== 'array') keys.sort();
    h += '<p class="dim">' + t + ', ' + keys.length + ' ' + (t === 'array' ? 'entries' : 'keys') + '</p>';
    h += '<div class="scroll" style="max-height:56vh"><table class="t"><tr><th style="width:26%">Key</th><th>Value</th><th class="r">Type</th></tr>';
    for (var j = 0; j < Math.min(keys.length, 400); j++) {
      var key = keys[j], val = node[key], vt = typeOf(val);
      var path = browsePath + '.' + key;
      var cell;
      if (vt === 'object' || vt === 'array') {
        var n = 0; for (var z in val) if (Object.prototype.hasOwnProperty.call(val, z)) n++;
        cell = btn('crumb', (vt === 'array' ? '[' + n + ' entries]' : '{' + n + ' keys}'), '', ' data-id="' + esc(path) + '"') +
          ' <span class="dimmer">' + esc(JSON.stringify(val).slice(0, 90)) + '</span>';
      } else if (vt === 'boolean') {
        cell = '<input type="checkbox" data-adm="tog" data-path="' + esc(path) + '"' + (val ? ' checked' : '') + '>';
      } else {
        cell = '<input class="admcell" style="width:100%" value="' + esc(val === null ? 'null' : val) + '" data-adm-live="' + esc(path) + '">';
      }
      h += '<tr><td class="mono dim">' + esc(key) + '</td><td>' + cell + '</td><td class="r dimmer">' + vt + '</td></tr>';
    }
    h += '</table></div>';
    if (keys.length > 400) h += '<p class="dim">Showing the first 400.</p>';
    return h;
  }

  function tabSave() {
    var h = sect('This game',
      '<p class="dim">Storage: <b>' + GAME.save.backend() + '</b>. Round ' + GAME.season.number() +
      ', ' + S.npcs.length + ' accounts, ' + (S.news || []).length + ' news lines, ' +
      (S.forum.threads || []).length + ' forum threads.</p>' +
      '<div class="admrow">' + btn('savenow', 'Save now', 'green') + btn('export', 'Download a copy') +
      btn('showraw', 'Show the save text') + '</div>');
    h += sect('Rebuild the city',
      '<p class="dim">Keeps you exactly as you are and regenerates all two hundred accounts around you.</p>' +
      '<div class="admrow">' + btn('regenFresh', 'Fresh round: everybody at level 1', 'gold') +
      btn('regenEst', 'Established world: years of history already in it') + '</div>');
    h += sect('Load a save', '<textarea id="adm-imp" placeholder="paste a save file"></textarea>' + btn('import', 'Load it'));
    h += sect('Start over', '<div class="admrow">' + btn('wipe', 'Delete this game', 'red') + '</div>');
    return h;
  }

  /* ================= shell ================= */

  function render() {
    if (!open) return;
    var host = document.getElementById('adminpanel');
    if (!host) {
      host = document.createElement('div');
      host.id = 'adminpanel';
      document.body.appendChild(host);
      host.addEventListener('click', onClick, false);
      host.addEventListener('change', onChange, false);
      host.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); }, false);
    }
    var body;
    try {
      body = ({ you: tabYou, npcs: tabNpcs, ladder: tabLadder, world: tabWorld, economy: tabEconomy,
        data: tabData, fams: tabFams, feeds: tabFeeds, config: tabConfig, browse: tabBrowse, save: tabSave }[tab] || tabYou)();
    } catch (e) {
      body = '<p class="bad">' + esc(e.message) + '</p><pre class="dim" style="white-space:pre-wrap">' + esc(e.stack) + '</pre>';
    }
    var tabsHtml = '';
    for (var i = 0; i < TABS.length; i++) {
      tabsHtml += '<a href="#" class="' + (tab === TABS[i][0] ? 'on' : '') + '" data-adm="tab" data-id="' + TABS[i][0] + '">' + TABS[i][1] + '</a>';
    }
    host.innerHTML =
      '<div class="admwrap"><div class="admbar">' +
      '<b>BACK OFFICE</b> <span class="dim">everything in the game, live</span>' +
      '<span class="admclose" data-adm="close">[ close ]</span></div>' +
      '<div class="admtabs">' + tabsHtml + '</div>' +
      (lastMsg ? '<div class="admmsg">' + esc(lastMsg) + '</div>' : '') +
      '<div class="admbody">' + body + '</div></div>';
  }

  function say(m) { lastMsg = m; }

  function show() { open = true; lastMsg = 'Six clicks on CITY brings this back any time.'; render(); }
  function hide() {
    open = false;
    var host = document.getElementById('adminpanel');
    if (host && host.parentNode) host.parentNode.removeChild(host);
    GAME.ui.render();
  }
  function isOpen() { return open; }

  /* ---- edits ---- */
  function onChange(e) {
    var t = e.target;
    var live = t.getAttribute && t.getAttribute('data-adm-live');
    if (live) {
      var err = setPath(live, t.value);
      say(err ? err : live + ' = ' + t.value);
      afterEdit();
      return;
    }
    if (t.getAttribute && t.getAttribute('data-adm') === 'tog') {
      setPath(t.getAttribute('data-path'), t.checked);
      say(t.getAttribute('data-path') + ' = ' + t.checked);
      afterEdit();
    }
  }

  function afterEdit() {
    try {
      GAME.progress.applyLevel(S.player);
      GAME.normalize.run();
      GAME.ladder.sync();
      reindex();
    } catch (e) {}
    GAME.save.markDirty();
    render();
  }

  /* ---- every button on the panel ---- */
  function v(sel, d) { var e = document.getElementById(sel); return e ? e.value : d; }
  function nv(sel, d) { var x = Number(v(sel, d)); return isNaN(x) ? d : x; }
  function P() { return S.player; }
  function livingNpcs() { return S.npcs.filter(function (n) { return !n.dead; }); }

  /* Every timestamp the game holds, so a skip can move the whole world
     instead of only the parts somebody remembered to list. */
  var TIMEKEYS = {
    createdAt: 1, lastSeen: 1, savedAt: 1, seasonStart: 1, joined: 1,
    hospUntil: 1, jailUntil: 1, bgUntil: 1, travelUntil: 1, ladderLock: 1,
    retainerUntil: 1, lastFightAt: 1, rungSince: 1, lastOnline: 1, lastRegen: 1,
    lastChat: 1, lastAct: 1, onlineUntil: 1, lastSeenPlayer: 1, founded: 1,
    t: 1, posted: 1, expires: 1, taken: 1, until: 1, ends: 1, at: 1
  };

  function shiftNode(node, ms, depth) {
    if (!node || typeof node !== 'object' || depth > 9) return;
    var isArr = Object.prototype.toString.call(node) === '[object Array]';
    for (var k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      var v = node[k];
      if (typeof v === 'number') {
        if (!isArr && TIMEKEYS[k] && v > 1e11) node[k] = v - ms;
      } else if (v && typeof v === 'object') {
        shiftNode(v, ms, depth + 1);
      }
    }
  }

  /* Maps whose VALUES are timestamps and whose keys are ids. */
  function shiftMap(m, ms) {
    if (!m) return;
    for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k) && typeof m[k] === 'number' && m[k] > 1e11) m[k] -= ms;
  }

  function shiftWorld(ms) {
    shiftNode(S, ms, 0);
    shiftMap(S.cd, ms); shiftMap(S.chLock, ms); shiftMap(S.revenge, ms); shiftMap(S.ocCool, ms);
    shiftMap(S.player.regen, ms);
    for (var i = 0; i < S.npcs.length; i++) if (S.npcs[i].regen) shiftMap(S.npcs[i].regen, ms);
  }

  /* Run the whole city forward. The clock is advanced for real while the
     simulation runs, then every timestamp in the world is pulled back by
     the same amount - so the round really is that much older, hospital
     clocks are still short, and nothing is left sitting in the future. */
  function forward(hours) {
    var ms = Math.max(0, hours) * HOUR;
    if (!ms) return;
    var realNow = Date.now;
    var off = 0;
    Date.now = function () { return realNow() + off; };
    try {
      var left = ms, guard = 0;
      while (left > 0 && guard++ < 400) {
        var take = Math.min(7 * DAY, left);
        off += take;
        GAME.sim.catchUp(Date.now());
        left -= take;
      }
    } finally { Date.now = realNow; }

    shiftWorld(off);
    S.lastSeen = Date.now();

    /* anything still sitting in the future after the shift was set during
       the very last slice; leave it, but never longer than a day out */
    var now = Date.now(), capAt = now + DAY;
    var clampFuture = function (e) {
      ['hospUntil', 'jailUntil', 'bgUntil', 'travelUntil', 'ladderLock', 'onlineUntil'].forEach(function (k) {
        if (e[k] > capAt) e[k] = capAt;
      });
      if (e.lastOnline > now) e.lastOnline = now;
      if (e.lastRegen > now) e.lastRegen = now;
      if (e.lastFightAt > now) e.lastFightAt = now;
    };
    clampFuture(S.player);
    for (var i = 0; i < S.npcs.length; i++) clampFuture(S.npcs[i]);
    GAME.ladder.sync();
    say('Ran the city forward ' + (hours >= 24 ? Math.round(hours / 24) + ' days' : hours + ' hours') +
      '. It is now round ' + GAME.season.number() + ', week ' + GAME.season.week() + '.');
  }

  function bestItem(cats, forWho) {
    var best = null;
    var all = GAME.items.all();
    for (var i = 0; i < all.length; i++) {
      var it = all[i];
      if (cats.indexOf(it.cat) < 0) continue;
      var v2 = (it.atk || 0) + (it.def || 0);
      if (!best || v2 > (best.atk || 0) + (best.def || 0)) best = it;
    }
    return best;
  }

  var ACTS = {
    close: function () { hide(); },
    tab: function (id) { tab = id; },
    crumb: function (id) { browsePath = id; },
    dset: function (id) { S._admData = id; },
    search: function () { npcQuery = v('adm-q', ''); },
    clearq: function () { npcQuery = ''; },
    pick: function (id) { npcSel = Number(id); },
    npcClose: function () { npcSel = null; },

    /* --- you --- */
    lvlup: function () { GAME.progress.gainXP(GAME.progress.xpForLevel(P().level + 1) - P().xp); },
    lvl10: function () { GAME.progress.gainXP(GAME.progress.xpForLevel(P().level + 10) - P().xp); },
    lvl50: function () { GAME.progress.gainXP(GAME.progress.xpForLevel(P().level + 50) - P().xp); },
    maxrank: function () {
      var r = DATA.ranks[DATA.ranks.length - 1];
      GAME.progress.gainXP(Math.max(0, r.xp - P().xp));
      say('You are ' + r.name + '.');
    },
    resetlvl: function () { var p = P(); p.level = 1; p.xp = 0; GAME.progress.applyLevel(p); },
    stats100: function () { var p = P(); ['str', 'def', 'spd', 'dex'].forEach(function (k) { p[k] += 100; }); },
    stats10k: function () { var p = P(); ['str', 'def', 'spd', 'dex'].forEach(function (k) { p[k] += 10000; }); },
    statsmatch: function () {
      var p = P(), best = null;
      livingNpcs().forEach(function (n) { if (!best || GAME.combat.power(n) > GAME.combat.power(best)) best = n; });
      if (!best) return;
      ['str', 'def', 'spd', 'dex'].forEach(function (k) { p[k] = Math.max(p[k], best[k]); });
      p.iq = Math.max(p.iq, best.iq || 10);
      say('Matched ' + best.name + '.');
    },
    fillall: function () {
      var p = P();
      p.energy = p.energyMax; p.will = p.willMax; p.nerve = p.nerveMax;
      p.dexg = p.dexgMax; p.attacks = p.attacksMax; p.hospUntil = 0; p.health = maxHealth(p);
    },
    emptyall: function () { var p = P(); p.energy = 0; p.will = 0; p.nerve = 0; p.dexg = 0; p.attacks = 0; },
    cash1m: function () { P().money += 1e6; },
    cash1b: function () { P().money += 1e9; },
    cash1t: function () { P().money += 1e12; },
    pts1k: function () { P().points = (P().points || 0) + 1000; },
    broke: function () { P().money = 0; P().bank = 0; P().points = 0; },
    clearstatus: function () {
      var p = P();
      p.hospUntil = 0; p.jailUntil = 0; p.travelUntil = 0; p.ladderLock = 0; p.bgUntil = 0;
      p.health = maxHealth(p); S.cd = {}; S.chLock = {};
    },
    hospme: function () { GAME.player.hospitalize(30 * MIN, 'The back office put you here.'); },
    jailme: function () { GAME.player.jail(30 * MIN, 'The back office put you here.', 5000); },

    /* --- npcs --- */
    addnpc: function () {
      var used = {};
      S.npcs.forEach(function (n) { used[n.name.toLowerCase()] = 1; });
      var n2 = GAME.state.makeNPC(S.nextNpcId++, used, NOW(), true);
      S.npcs.push(n2); reindex();
      npcSel = n2.id;
      say('Created ' + n2.name + '.');
    },
    bulklvl: function () {
      livingNpcs().forEach(function (n) { GAME.npc.gainXP(n, GAME.progress.xpForLevel(n.level + 5) - n.xp); });
      say('Everybody gained five levels.');
    },
    bulkreset: function () {
      livingNpcs().forEach(function (n) {
        n.level = 1; n.xp = 0; n.str = 10; n.def = 10; n.spd = 10; n.dex = 10; n.iq = 10;
        n.money = rint(300, 800); n.bank = 0; n.wpn = null; n.arm = null; n.w = 0; n.l = 0;
        n.crimes = 0; n.respect = 0; GAME.npc.recompute(n);
      });
      say('The whole city is back at level one.');
    },
    bulkheal: function () {
      S.npcs.forEach(function (n) { n.hospUntil = 0; n.jailUntil = 0; n.health = n.healthMax; });
      say('Everybody is out.');
    },
    bulkcash: function () { livingNpcs().forEach(function (n) { n.money += 1e6; }); },
    npcHere: function () { var n = byId(npcSel); if (n) { n.online = true; n.onlineUntil = NOW() + 2 * HOUR; n.dead = false; } },
    npcGone: function () { var n = byId(npcSel); if (n) { n.online = false; n.onlineUntil = 0; } },
    npcLove: function () { var n = byId(npcSel); if (n) { n.op = 100; n.grudge = 0; n.fear = 0; } },
    npcHate: function () { var n = byId(npcSel); if (n) { n.op = -100; n.grudge = 100; } },
    npcLadder: function () {
      var n = byId(npcSel); if (!n) return;
      if (GAME.ladder.rungOf(n.id)) return say('Already on it.');
      S.ladder.splice(S.ladder.length - 1, 1, n.id);
      GAME.ladder.sync(); say(n.name + ' is on rung ' + GAME.ladder.rungOf(n.id) + '.');
    },
    npcGear: function () {
      var n = byId(npcSel); if (!n) return;
      var w = GAME.items.bestFor(['melee', 'pistol', 'smg', 'rifle', 'heavy'], n.level, Infinity);
      var a = GAME.items.bestFor(['armor'], n.level, Infinity);
      if (w) n.wpn = w.id; if (a) n.arm = a.id;
      GAME.npc.recompute(n);
    },
    npcKill: function () { var n = byId(npcSel); if (n) { n.dead = true; n.online = false; } },

    /* --- ladder --- */
    ladme1: function () { putMeOn(1); },
    ladme20: function () { putMeOn(CFG.LADDER_RUNGS); },
    ladoff: function () {
      var i = S.ladder.indexOf(0);
      if (i >= 0) { S.ladder.splice(i, 1); GAME.sim.backfillLadder(); GAME.ladder.sync(); }
    },
    ladseed: function () {
      var all = livingNpcs().slice().sort(function (a, b) { return GAME.combat.power(b) - GAME.combat.power(a); });
      S.ladder = all.slice(0, CFG.LADDER_RUNGS).map(function (n) { return n.id; });
      GAME.ladder.sync(); say('Reseeded from raw power.');
    },
    ladshuffle: function () { shuffle(S.ladder); GAME.ladder.sync(); },
    ladchal: function () { var f = GAME.ladder.npcChallengeTick(50); say(f + ' challenges fought.'); },
    ladup: function (id, n) {
      var r = Number(n); if (r <= 1) return;
      var t2 = S.ladder[r - 1]; S.ladder[r - 1] = S.ladder[r - 2]; S.ladder[r - 2] = t2; GAME.ladder.sync();
    },
    laddown: function (id, n) {
      var r = Number(n); if (r >= S.ladder.length) return;
      var t3 = S.ladder[r - 1]; S.ladder[r - 1] = S.ladder[r]; S.ladder[r] = t3; GAME.ladder.sync();
    },
    ladkick: function (id, n) {
      S.ladder.splice(Number(n) - 1, 1); GAME.sim.backfillLadder(); GAME.ladder.sync();
    },

    /* --- world --- */
    fw1h: function () { forward(1); }, fw6h: function () { forward(6); },
    fw1d: function () { forward(24); }, fw3d: function () { forward(72); },
    fw7d: function () { forward(168); }, fw30d: function () { forward(720); },
    fw90d: function () { forward(2160); },
    fwn: function () { forward(Math.max(0.1, nv('adm-fw', 24))); },
    endround: function () { S.seasonStart = NOW() - CFG.SEASON_LENGTH - MIN; say('The round is over.'); },
    rumble: function () { var r = GAME.season.rumble(); say(r.err || (r.result.champion + ' won The Rumble.')); },
    nextround: function () { var r = GAME.season.reset(); say(r.err || ('Round ' + r.round + ' has started.')); },
    allon: function () { S.npcs.forEach(function (n) { if (!n.dead) { n.online = true; n.onlineUntil = NOW() + 3 * HOUR; } }); },
    alloff: function () { S.npcs.forEach(function (n) { n.online = false; n.onlineUntil = 0; }); },
    presence: function () { GAME.sim.updatePresence(NOW(), false); },
    evAttackMe: function () {
      var pool = livingNpcs().filter(function (n) { return !GAME.ladder.busy(n); });
      var n3 = pick(pool);
      if (!n3) return say('Nobody available.');
      n3.attacks = Math.max(1, n3.attacks); n3.energy = Math.max(50, n3.energy);
      S.cd = {}; S.player.bgUntil = 0;
      GAME.ladder.npcAttack(n3, 0);
      say(n3.name + ' came for you.');
    },
    evMailMe: function () {
      var n4 = pick(livingNpcs());
      GAME.mail.fromNpc(n4, pick(['threat', 'friendly', 'scam', 'familyInvite', 'tradeOffer', 'respect', 'spam']));
      say('Mail from ' + n4.name + '.');
    },
    evBounty: function () {
      var n5 = pick(livingNpcs().filter(function (n) { return n.money > 10000; })) || pick(livingNpcs());
      GAME.hitlist.npcPlace(n5, 0, Math.max(25000, Math.round(n5.money * 0.3)));
      say(n5.name + ' put money on you.');
    },
    evChat: function () {
      var on = GAME.sim.onlineList();
      for (var i = 0; i < 12; i++) { var w = pick(on.length ? on : S.npcs); if (w) { w.lastChat = 0; GAME.npc.chatEvent(w, null, NOW()); } }
      say('The shoutbox is going.');
    },
    evWar: function () {
      if (S.fams.length < 2) return say('Not enough families.');
      var a = pick(S.fams), b = pick(S.fams);
      if (a.id === b.id) return;
      if (a.wars.indexOf(b.id) < 0) { a.wars.push(b.id); b.wars.push(a.id); }
      GAME.feed.newsFrom('familyWar', 'war', { family: a.name, other: b.name, who: (byId(a.leader) || {}).name });
      say(a.name + ' is at war with ' + b.name + '.');
    },
    evNews: function () { for (var i = 0; i < 30; i++) GAME.feed.newsFrom('flavor', 'flavor', {}); },
    simstop: function () { GAME.sim.stop(); say('The world is paused.'); },
    simstart: function () { GAME.sim.start(); say('Running again.'); },

    /* --- economy --- */
    reseedmkt: function () { GAME.market.seed(NOW()); },
    reseedauc: function () { GAME.auction.seed(NOW()); },
    reseedpts: function () { GAME.points.seedMarket(NOW()); },
    clearmkt: function () { S.market = []; S.auction = []; S.pointMarket = []; },
    allitems: function () {
      GAME.items.all().forEach(function (it) { GAME.items.add(it.id, 1); });
      say('One of everything is in your inventory.');
    },
    allprops: function () {
      S.player.props = GAME.props.list().map(function (pr) { return pr.id; });
      say('You own the whole city.');
    },
    allgyms: function () { S.player.gyms = GAME.gym.list().map(function (g) { return g.id; }); },
    bestgear: function () {
      var w = bestItem(['melee', 'pistol', 'smg', 'rifle', 'heavy']);
      var a = bestItem(['armor']);
      if (w) { GAME.items.add(w.id, 1); GAME.items.equip(w.id); }
      if (a) { GAME.items.add(a.id, 1); GAME.items.equip(a.id); }
      say('Kitted out.');
    },
    clearhits: function () { S.hitlist = []; },

    /* --- families --- */
    addfam: function () {
      var id = (S.fams.length ? Math.max.apply(null, S.fams.map(function (f) { return f.id; })) : 0) + 1;
      S.fams.push({ id: id, name: pick(DATA.names.familyNames) || ('Crew ' + id), tag: pick(DATA.names.familyTags) || 'NEW',
        leader: pick(livingNpcs()).id, founded: NOW(), members: [], respect: 0, money: 0, wars: [], motd: 'Recruiting.', open: true, playerMember: false });
      say('Founded.');
    },
    joinfam1: function () {
      var f = GAME.family.ranked()[0];
      if (!f) return;
      S.player.fam = f.id; S.player.famRole = 'boss'; f.playerMember = true;
      say('You are in ' + f.name + '.');
    },
    leavefam: function () {
      var f = famById(S.player.fam);
      if (f) f.playerMember = false;
      S.player.fam = null; S.player.famRole = null;
    },
    famboom: function (id) {
      var i = -1;
      for (var k = 0; k < S.fams.length; k++) if (S.fams[k].id === Number(id)) i = k;
      if (i < 0) return;
      var f = S.fams[i];
      S.npcs.forEach(function (n) { if (n.fam === f.id) { n.fam = null; n.famRole = 'soldier'; } });
      if (S.player.fam === f.id) { S.player.fam = null; S.player.famRole = null; }
      S.fams.splice(i, 1);
      say('Disbanded.');
    },

    /* --- feeds --- */
    postnews: function () { var t4 = v('adm-news', ''); if (t4) { GAME.feed.news('flavor', t4, {}); say('Printed.'); } },
    postsay: function () {
      var who = String(v('adm-who', '')).toLowerCase().trim();
      var n6 = null;
      S.npcs.forEach(function (n) { if (n.name.toLowerCase() === who) n6 = n; });
      if (!n6) n6 = pick(livingNpcs());
      var txt = v('adm-say', '');
      if (!txt) return say('Nothing to say.');
      GAME.feed.say(n6, GAME.npc.style(n6, txt));
      say(n6.name + ' said it.');
    },
    postmail: function () {
      var who2 = String(v('adm-mfrom', '')).toLowerCase().trim();
      var n7 = null;
      S.npcs.forEach(function (n) { if (n.name.toLowerCase() === who2) n7 = n; });
      if (!n7) n7 = pick(livingNpcs());
      S.mail.push({ id: S.nextMailId++, t: NOW(), from: n7.id, fromName: n7.name,
        subj: v('adm-msub', '(no subject)'), body: v('adm-mbody', ''), read: false, folder: 'in' });
      say('Delivered from ' + n7.name + '.');
    },
    clearnews: function () { S.news = []; },
    clearchat: function () { S.chat = []; },
    clearmail: function () { S.mail = []; },
    clearlog: function () { S.log = []; },

    /* --- config --- */
    cfgdefault: function () {
      if (!GAME.admin._cfg0) return say('No snapshot to go back to.');
      for (var k in GAME.admin._cfg0) if (GAME.admin._cfg0.hasOwnProperty(k)) CFG[k] = GAME.admin._cfg0[k];
      say('Tuning restored.');
    },

    /* --- save --- */
    savenow: function () { GAME.save.write(true); say('Saved.'); },
    export: function () { GAME.save.download(); },
    showraw: function () { GAME.ui.modal('Save data', '<textarea style="min-height:240px" readonly>' + esc(GAME.save.exportText()) + '</textarea>'); },
    import: function () {
      var err = GAME.save.importText(v('adm-imp', ''));
      if (err) return say(err);
      reindex(); GAME.normalize.run(); GAME.progress.applyLevel(S.player);
      say('Loaded.');
    },
    regenFresh: function () { regen(false); },
    regenEst: function () { regen(true); },
    wipe: function () {
      GAME.sim.stop();
      GAME.save.wipe().then(function () { S = null; hide(); GAME.boot.newGameScreen(); });
    }
  };

  /* Rebuild the roster around the player without touching the player. */
  function regen(established) {
    var keep = JSON.parse(JSON.stringify(S.player));
    var hall = S.hall, round = S.roundNo, life = S.lifetime, settings = S.settings;
    GAME.state.newGame({ name: keep.name, city: keep.city, hood: keep.hood, gender: keep.gender, established: established });
    S.player = keep;
    S.hall = hall || []; S.roundNo = round || 1; S.lifetime = life; S.settings = settings || S.settings;
    reindex();
    GAME.sim.backfillLadder();
    GAME.ladder.sync();
    say(established ? 'Rebuilt with years of history in it.' : 'Rebuilt: two hundred accounts at level one.');
  }

  function putMeOn(rung) {
    var i = S.ladder.indexOf(0);
    if (i >= 0) S.ladder.splice(i, 1);
    S.ladder.splice(clamp(rung, 1, CFG.LADDER_RUNGS) - 1, 0, 0);
    while (S.ladder.length > CFG.LADDER_RUNGS) S.ladder.pop();
    GAME.ladder.sync();
    say('You are on rung ' + GAME.ladder.rungOf(0) + '.');
  }

  function onClick(e) {
    var el2 = e.target, act = null, depth = 0;
    while (el2 && depth++ < 5) {
      if (el2.getAttribute) { act = el2.getAttribute('data-adm'); if (act) break; }
      el2 = el2.parentNode;
    }
    if (!act || act === 'tog') return;
    e.preventDefault();
    var fn = ACTS[act];
    if (!fn) return;
    try { fn(el2.getAttribute('data-id'), el2.getAttribute('data-n')); }
    catch (err) { say('That broke: ' + err.message); if (window.console) console.error(err); }
    if (act !== 'close' && act !== 'wipe') {
      GAME.save.markDirty();
      try { GAME.ladder.sync(); reindex(); } catch (e2) {}
      render();
      GAME.ui.render();
      render();
    }
  }

  return {
    show: show, hide: hide, isOpen: isOpen, render: render, say: say,
    getPath: getPath, setPath: setPath, afterEdit: afterEdit, forward: forward,
    act: function (a, id, n) { if (ACTS[a]) ACTS[a](id, n); },
    setTab: function (t2) { tab = t2; render(); }, tab: function () { return tab; },
    _cfg0: null
  };
})();

