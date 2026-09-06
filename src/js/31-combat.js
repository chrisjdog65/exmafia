/* ============================================================
   31-combat.js :: fight resolution
   Fights resolve instantly but are reported blow by blow, the way
   the original game printed an attack log you could scroll.
   ============================================================ */

var BODY = ['head', 'throat', 'chest', 'ribs', 'stomach', 'groin', 'left arm', 'right arm', 'left leg', 'right leg', 'jaw', 'kidneys', 'shoulder', 'back'];

var HIT_VERB = {
  melee:  ['cracks', 'clubs', 'smashes', 'batters', 'lays into', 'swings on', 'wallops', 'clocks'],
  pistol: ['pops', 'plugs', 'drills', 'tags', 'clips', 'puts one in'],
  smg:    ['stitches', 'rakes', 'hoses', 'sprays', 'chews up'],
  rifle:  ['drops', 'punches through', 'blows apart', 'nails'],
  heavy:  ['flattens', 'obliterates', 'wrecks', 'levels'],
  fist:   ['socks', 'cracks', 'jabs', 'hooks', 'rocks', 'clobbers', 'decks']
};

var MISS_LINE = [
  '{a} swings wide and hits nothing but air.',
  '{a} telegraphs it and {d} slips the punch.',
  '{a} misses. {d} is already moving.',
  '{d} ducks under {a} and comes up grinning.',
  '{a} loses his footing on the wet pavement.',
  '{d} gets an arm up and eats most of it on the elbow.',
  '{a} rushes it and blows the shot.',
  '{d} steps inside and smothers the swing.'
];

GAME.combat = (function () {

  function verbFor(it) {
    if (!it) return pick(HIT_VERB.fist);
    return pick(HIT_VERB[it.cat] || HIT_VERB.fist);
  }

  /* Effective fighting stats, gear folded in. */
  function sheet(p) {
    var w = GAME.items.get(p.wpn), a = GAME.items.get(p.arm);
    var spd = (p.spd || 10) + (a && a.spd ? a.spd : 0);
    return {
      str: p.str || 10,
      def: p.def || 10,
      spd: Math.max(1, spd),
      dex: p.dex || 10,
      wpn: w, arm: a,
      atk: w ? (w.atk || 0) : 0,
      armDef: a ? (a.def || 0) : 0,
      acc: w ? (w.acc !== undefined ? w.acc : 0.9) : 0.92,
      hp: Math.max(1, Math.round(p.health || 1)),
      hpMax: Math.max(1, maxHealth(p)),
      name: p.name
    };
  }

  /* A single scalar used for ranking, matchmaking and AI decisions. */
  function power(p) {
    var s = sheet(p);
    var off = (s.str * 1.0 + s.atk * 3.2) * (0.55 + s.spd / (s.spd + 60) * 0.9);
    var dfn = (s.def * 1.0 + s.armDef * 3.0) * (0.55 + s.spd / (s.spd + 60) * 0.9);
    return Math.round((off * 0.58 + dfn * 0.42) * (1 + Math.log10(1 + s.hpMax / 100) * 0.35));
  }

  /* Rough odds one side beats the other, for UI hints and AI planning. */
  function odds(a, d) {
    var pa = power(a), pd = power(d);
    var hpA = (a.health || 1) / Math.max(1, maxHealth(a));
    var hpD = (d.health || 1) / Math.max(1, maxHealth(d));
    var r = (pa * (0.45 + 0.55 * hpA)) / Math.max(1, pa * (0.45 + 0.55 * hpA) + pd * (0.45 + 0.55 * hpD));
    return clamp(r, 0.02, 0.98);
  }

  function difficultyLabel(o) {
    if (o >= 0.88) return { t: 'Easy', c: 'd-easy' };
    if (o >= 0.68) return { t: 'Favoured', c: 'd-fav' };
    if (o >= 0.46) return { t: 'Even', c: 'd-even' };
    if (o >= 0.26) return { t: 'Risky', c: 'd-risk' };
    if (o >= 0.10) return { t: 'Hard', c: 'd-hard' };
    return { t: 'Suicide', c: 'd-sui' };
  }

  /* Agility is the only thing that decides whether a punch lands, either
     way round - that is exMafia's own definition of the stat. Equal
     Agility gives the engine's 60% baseline. */
  function hitChance(A, D) {
    var base = 0.30 + 0.60 * (A.spd / (A.spd + D.spd));
    return clamp(base * A.acc, 0.08, 0.96);
  }

  function damage(A, D) {
    var raw = (A.str * 0.115 + A.atk * 1.45 + 2) * rflt(0.72, 1.34);
    var soak = 100 / (100 + D.def * 0.42 + D.armDef * 2.1);
    return Math.max(1, Math.round(raw * soak));
  }

  /* Resolve a fight. Returns {win, log[], dmgTo, dmgFrom, rounds, fled} */
  function fight(att, def, opts) {
    opts = opts || {};
    var A = sheet(att), D = sheet(def);
    var log = [];
    var hpA = A.hp, hpD = D.hp;
    var startA = hpA, startD = hpD;
    var round = 0, maxRounds = 26;
    var critA = 0, critD = 0;

    log.push({ k: 'start', t: A.name + ' attacks ' + D.name + '.' });
    if (A.wpn) log.push({ k: 'gear', t: A.name + ' is carrying a ' + A.wpn.name + '.' });
    else log.push({ k: 'gear', t: A.name + ' comes in bare knuckle.' });
    if (D.arm) log.push({ k: 'gear', t: D.name + ' is wearing ' + D.arm.name + '.' });

    while (round < maxRounds && hpA > 0 && hpD > 0) {
      round++;
      /* attacker swings */
      if (chance(hitChance(A, D))) {
        var dmg = damage(A, D);
        var crit = chance(0.06 + A.spd / (A.spd + 900));
        if (crit) { dmg = Math.round(dmg * rflt(1.6, 2.3)); critA++; }
        hpD -= dmg;
        log.push({
          k: 'hit', side: 'a',
          t: A.name + ' ' + verbFor(A.wpn) + ' ' + D.name + ' in the ' + pick(BODY) + ' for ' + fmt(dmg) + ' damage.' + (crit ? ' CRITICAL HIT!' : '')
        });
      } else {
        log.push({ k: 'miss', side: 'a', t: tpl(pick(MISS_LINE), { a: A.name, d: D.name }) });
      }
      if (hpD <= 0) break;

      /* defender swings back */
      if (chance(hitChance(D, A))) {
        var dmg2 = damage(D, A);
        var crit2 = chance(0.06 + D.spd / (D.spd + 900));
        if (crit2) { dmg2 = Math.round(dmg2 * rflt(1.6, 2.3)); critD++; }
        hpA -= dmg2;
        log.push({
          k: 'hit', side: 'd',
          t: D.name + ' ' + verbFor(D.wpn) + ' ' + A.name + ' in the ' + pick(BODY) + ' for ' + fmt(dmg2) + ' damage.' + (crit2 ? ' CRITICAL HIT!' : '')
        });
      } else {
        log.push({ k: 'miss', side: 'd', t: tpl(pick(MISS_LINE), { d: A.name, a: D.name }) });
      }
    }

    var win;
    if (hpD <= 0 && hpA > 0) win = true;
    else if (hpA <= 0 && hpD > 0) win = false;
    else if (hpA <= 0 && hpD <= 0) win = chance(0.5);
    else {
      /* stalemate: whoever is in better shape walks away with it */
      win = (hpA / A.hpMax) >= (hpD / D.hpMax);
      log.push({ k: 'stale', t: 'The two of you break apart, both wheezing. ' + (win ? A.name : D.name) + ' is left standing.' });
    }

    hpA = Math.max(0, hpA); hpD = Math.max(0, hpD);
    log.push({
      k: 'end',
      t: win
        ? A.name + ' beats ' + D.name + ' down. (' + fmt(hpA) + ' hp left)'
        : D.name + ' turns it around and puts ' + A.name + ' on the ground.'
    });

    return {
      win: win,
      log: log,
      rounds: round,
      hpA: hpA, hpD: hpD,
      dmgDealt: startD - hpD,
      dmgTaken: startA - hpA,
      critA: critA, critD: critD
    };
  }

  return {
    fight: fight, power: power, odds: odds, sheet: sheet,
    difficultyLabel: difficultyLabel, hitChance: hitChance
  };
})();
