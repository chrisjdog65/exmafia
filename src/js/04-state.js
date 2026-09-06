/* ============================================================
   04-state.js :: world creation, NPC generation, migration
   ============================================================ */

var SAVE_VERSION = 1;

/* ---- Archetypes ----------------------------------------------------
   A real roster is mostly newbies and casuals with a thin crust of
   monsters at the top. The weights below reproduce that shape.
   Each archetype supplies the CENTRE of the personality vector; the
   generator adds gaussian noise so no two members of an archetype
   behave the same.
--------------------------------------------------------------------- */
var ARCHETYPES = [
  { id: 'noob',     w: 24, label: 'new blood',
    p: { aggro:.35, activity:.30, chatty:.55, vindictive:.40, loyalty:.50, greed:.45, honesty:.70, ego:.35, humor:.50, skill:.15, patience:.30, generosity:.45 },
    pow: .12, growth: .55, churn: .55 },
  { id: 'casual',   w: 21, label: 'casual',
    p: { aggro:.40, activity:.45, chatty:.45, vindictive:.45, loyalty:.60, greed:.50, honesty:.75, ego:.40, humor:.55, skill:.40, patience:.55, generosity:.50 },
    pow: .32, growth: .45, churn: .28 },
  { id: 'grinder',  w: 12, label: 'grinder',
    p: { aggro:.25, activity:.85, chatty:.25, vindictive:.35, loyalty:.55, greed:.75, honesty:.70, ego:.45, humor:.35, skill:.75, patience:.90, generosity:.35 },
    pow: .58, growth: .85, churn: .12 },
  { id: 'brawler',  w: 12, label: 'brawler',
    p: { aggro:.95, activity:.75, chatty:.55, vindictive:.85, loyalty:.55, greed:.55, honesty:.55, ego:.80, humor:.45, skill:.70, patience:.25, generosity:.30 },
    pow: .62, growth: .70, churn: .18 },
  { id: 'veteran',  w: 8,  label: 'old timer',
    p: { aggro:.45, activity:.50, chatty:.70, vindictive:.50, loyalty:.85, greed:.40, honesty:.85, ego:.65, humor:.70, skill:.95, patience:.85, generosity:.75 },
    pow: .88, growth: .25, churn: .10 },
  { id: 'socialite',w: 7,  label: 'shoutbox regular',
    p: { aggro:.20, activity:.65, chatty:.98, vindictive:.35, loyalty:.75, greed:.35, honesty:.70, ego:.55, humor:.85, skill:.30, patience:.60, generosity:.80 },
    pow: .24, growth: .30, churn: .22 },
  { id: 'merchant', w: 5,  label: 'trader',
    p: { aggro:.15, activity:.70, chatty:.60, vindictive:.30, loyalty:.50, greed:.95, honesty:.55, ego:.50, humor:.40, skill:.60, patience:.85, generosity:.25 },
    pow: .45, growth: .55, churn: .15 },
  { id: 'troll',    w: 4,  label: 'agitator',
    p: { aggro:.85, activity:.60, chatty:.90, vindictive:.90, loyalty:.20, greed:.55, honesty:.25, ego:.90, humor:.75, skill:.45, patience:.15, generosity:.10 },
    pow: .38, growth: .40, churn: .35 },
  { id: 'lurker',   w: 4,  label: 'lurker',
    p: { aggro:.30, activity:.18, chatty:.06, vindictive:.45, loyalty:.45, greed:.50, honesty:.75, ego:.25, humor:.35, skill:.50, patience:.70, generosity:.40 },
    pow: .36, growth: .30, churn: .40 },
  { id: 'whale',    w: 3,  label: 'donator',
    p: { aggro:.70, activity:.65, chatty:.50, vindictive:.60, loyalty:.55, greed:.60, honesty:.60, ego:.95, humor:.45, skill:.65, patience:.35, generosity:.55 },
    pow: .97, growth: .60, churn: .08 }
];

/* Where the roster lives, roughly matching a 2008 English-language
   browser game: US heavy, with real UK / AU / PH contingents. */
var TZ_POOL = [
  [-5, 32], [-6, 14], [-8, 13], [-7, 6], [-4, 4],
  [0, 11], [1, 6], [10, 5], [8, 6], [5.5, 3]
];

GAME.state = (function () {

  function personality(arch) {
    var p = {}, k;
    for (k in arch.p) {
      if (!arch.p.hasOwnProperty(k)) continue;
      p[k] = clamp(gauss(arch.p[k], 0.13), 0.02, 0.99);
    }
    return p;
  }

  function pickArchetype() {
    return pickW(ARCHETYPES.map(function (a) { return [a, a.w]; }));
  }

  /* Integrate the same diminishing-returns gym curve the live game uses,
     so a generated account has exactly the stats it would have earned. */
  function statFromSets(sets, mult, level) {
    var cur = 10;
    if (sets <= 0) return cur;
    var chunks = 50;
    var step = sets / chunks;
    var lvlBonus = 1 + Math.log(1 + level) / Math.LN10 * 0.22;
    for (var i = 0; i < chunks; i++) {
      cur += step * mult * (1.6 / (1 + Math.pow(cur / 240, 0.82))) * lvlBonus;
    }
    return Math.round(cur * 100) / 100;
  }

  /* How much of the game an account has actually played, in the units the
     experience curve is calibrated in: days of committed play.

     The important part is `played`: almost nobody plays right through the
     life of their account. A real roster is mostly people who signed up,
     poked at it for an evening and never came back, sitting under a much
     thinner crust of people who never stopped. Without that, everybody
     drifts up to the middle of the ladder and a new player has nobody
     they can beat. */
  function playedFraction(p) {
    var played = clamp(gauss(0.06 + p.activity * 0.72, 0.2), 0.004, 1);
    if (chance(0.34)) played *= rflt(0.02, 0.2);      // came, saw, left
    return played;
  }
  function effectiveDays(p, ageDays, played) {
    var capture = (0.05 + p.activity * 0.55) * (0.4 + p.skill * 0.7);
    return Math.max(0, ageDays * played * capture * rflt(0.6, 1.35));
  }

  function makeNPC(id, usedNames, now) {
    var arch = pickArchetype();
    var p = personality(arch);
    var name = null, guard = 0;
    while (guard++ < 400) {
      var cand = pick(DATA.names.handles);
      if (cand && !usedNames[cand.toLowerCase()]) { name = cand; break; }
    }
    if (!name) name = 'player_' + id + '_' + rint(100, 999);
    usedNames[name.toLowerCase()] = 1;

    var city = pick(DATA.names.cities);
    var tz = pickW(TZ_POOL.map(function (t) { return [t[0], t[1]]; }));

    /* Account age: a real roster is a long tail of veterans plus a
       fat cluster of people who signed up in the last month. */
    var ageDays = pickW([[rflt(0, 30), 34], [rflt(30, 120), 26], [rflt(120, 400), 22], [rflt(400, 1100), 18]]);
    var joined = now - ageDays * DAY;

    /* Where this account has actually got to, from how long it has been
       here and how hard it plays. Same curve the live game runs on. */
    var played = playedFraction(p);
    var effDays = effectiveDays(p, ageDays, played) * (0.5 + arch.growth);
    var level = clamp(GAME.progress.levelForDays(effDays), 1, 100);

    /* Gym time is whatever Energy was left after the fighting. */
    var setsTotal = effDays * 96 * clamp(1 - p.aggro * 0.7, 0.15, 1) * clamp(0.3 + p.skill * 0.8, 0.2, 1);
    var gymMult = clamp(1 + p.skill * 4.5 * Math.min(1, level / 45), 1, 6.5);
    var st = {
      str: statFromSets(setsTotal * rflt(0.18, 0.38), gymMult, level),
      def: statFromSets(setsTotal * rflt(0.15, 0.34), gymMult, level),
      spd: statFromSets(setsTotal * rflt(0.10, 0.28), gymMult, level),
      dex: statFromSets(setsTotal * rflt(0.08, 0.24), gymMult, level)
    };

    var hp = 100 + level * 12;
    var money = Math.round(Math.pow(level, 2.35) * (18 + p.greed * 90) * rflt(0.35, 2.4));

    var n = {
      id: id,
      name: name,
      real: pick(DATA.names.firstNames) + ' ' + pick(DATA.names.lastNames),
      gender: chance(0.72) ? 'm' : 'f',
      city: city.name,
      hood: city.hood,
      age: rint(14, 41),
      joined: joined,
      arch: arch.id,
      p: p,
      pf: Math.round(played * 1000) / 1000,   // how much of their account life they actually played
      tz: tz,
      peak: clamp(Math.round(gauss(20.5, 3.4)), 0, 23),
      sessionLen: Math.round(clamp(gauss(18 + p.activity * 85, 25), 6, 260)),

      level: level,
      xp: 0,   /* set from the level table just below */
      money: money,
      bank: Math.round(money * rflt(0.4, 6) * p.patience),
      str: st.str, def: st.def, spd: st.spd, dex: st.dex,
      healthMax: hp,
      health: Math.round(hp * rflt(0.55, 1)),
      energyMax: 50 + level * 2,
      energy: 0,
      nerve: rint(0, 8),
      will: rint(0, 12),
      dexg: rint(0, 20),
      lastFightAt: 0, ladderLock: 0,

      rung: 0,               // assigned when the ladder is built
      bestRung: 0,
      wpn: null, arm: null,  // equipment ids, filled by the item pass
      gear: 0,               // cached equipment power

      hospUntil: 0, hospWhy: '',
      jailUntil: 0, jailWhy: '',

      fam: null, famRole: 'soldier',
      bounty: 0,
      points: rint(0, 400),
      iq: Math.round(10 + rflt(0, 1) * 40),
      lab: Math.round(10 + rflt(0, 1) * 30),
      bgUntil: 0,
      respect: Math.round(Math.pow(level, 1.5) * rflt(0.5, 2.2)),

      online: false,
      onlineUntil: 0,
      lastOnline: now - Math.round(rflt(0, 6) * DAY * (1.2 - p.activity)),
      lastAct: 0,
      lastChat: 0,

      /* memory of the human player */
      op: Math.round(gauss(0, 8)),   // opinion, -100..100
      grudge: 0,                      // decays over time
      fear: 0,
      metPlayer: false,
      lastSeenPlayer: 0,
      hitsOnMe: 0, hitsByMe: 0,      // vs the player specifically

      /* memory of other NPCs: sparse maps, id -> score */
      rivals: {},
      pals: {},

      w: Math.round(Math.pow(level, 1.7) * rflt(0.4, 3) * (0.4 + p.aggro)),
      l: Math.round(Math.pow(level, 1.6) * rflt(0.4, 2.6)),
      crimes: Math.round(Math.pow(level, 2.1) * rflt(1, 4)),
      busts: Math.round(Math.pow(level, 1.2) * rflt(0, 3)),
      posts: Math.round(Math.pow(level, 1.3) * rflt(0.2, 6) * (0.2 + p.chatty)),
      friends: rint(0, 60),

      sig: pick(DATA.names.signatures),
      bio: pick(DATA.names.bios),
      quote: pick(DATA.names.quotes),
      aim: chance(0.55) ? pick(DATA.names.aimNames) : '',
      mood: rflt(0.3, 0.8),
      streak: 0,
      dead: false,          // permanently retired account
      warn: 0               // staff warnings, shown on profile
    };
    /* XP has to agree with the level table or nobody ever ranks up */
    var floorXP = GAME.progress.xpForLevel(n.level);
    var nextXP = GAME.progress.xpForLevel(Math.min(100, n.level + 1));
    n.xp = Math.round(floorXP + (nextXP - floorXP) * rflt(0, 0.92));
    n.respect = Math.round(Math.pow(n.level, 1.5) * rflt(0.5, 2.2));
    n.gear = Math.round((n.str + n.def) * rflt(0.05, 0.45) * (0.4 + p.greed));
    return n;
  }

  function buildFamilies(npcs, now) {
    var count = rint(13, 20);
    var fams = [];
    var usedName = {};
    /* leaders are drawn from the strongest, most social accounts */
    var pool = npcs.slice().sort(function (a, b) {
      return (b.level * (0.5 + b.p.loyalty + b.p.ego)) - (a.level * (0.5 + a.p.loyalty + a.p.ego));
    }).slice(0, Math.max(count * 3, 40));

    for (var i = 0; i < count; i++) {
      var nm = null, g = 0;
      while (g++ < 200) { var c = pick(DATA.names.familyNames); if (c && !usedName[c]) { nm = c; break; } }
      if (!nm) nm = 'Crew ' + (i + 1);
      usedName[nm] = 1;
      var leader = null;
      for (var j = 0; j < pool.length; j++) { if (pool[j].fam === null) { leader = pool[j]; break; } }
      if (!leader) break;
      var f = {
        id: i + 1,
        name: nm,
        tag: pick(DATA.names.familyTags),
        leader: leader.id,
        founded: now - rflt(20, 900) * DAY,
        members: [leader.id],
        respect: 0,
        money: rint(20000, 4000000),
        wars: [],
        motd: pick(DATA.forum && DATA.forum.bumps ? ['Recruiting active players only.', 'No drama. No alts.', 'We hit back. Always.'] : ['Recruiting.']),
        open: chance(0.6),
        playerMember: false
      };
      leader.fam = f.id; leader.famRole = 'boss';
      fams.push(f);
    }

    /* ~62% of the roster ends up in a family, weighted to loyal, active players */
    for (var k = 0; k < npcs.length; k++) {
      var n = npcs[k];
      if (n.fam !== null || !fams.length) continue;
      var joinP = 0.28 + n.p.loyalty * 0.45 + n.p.activity * 0.2 - (n.arch === 'lurker' ? 0.3 : 0);
      if (!chance(clamp(joinP, 0.05, 0.92))) continue;
      /* people join big / strong families more often */
      var f2 = pickW(fams.map(function (f) { return [f, 1 + f.members.length * 0.6]; }));
      if (f2.members.length >= 34) continue;
      f2.members.push(n.id);
      n.fam = f2.id;
      n.famRole = chance(0.12) ? 'underboss' : (chance(0.2) ? 'capo' : 'soldier');
    }

    for (var q = 0; q < fams.length; q++) recalcFamily(fams[q], npcs);

    /* a couple of live wars for texture */
    var warCount = rint(1, 3);
    for (var w = 0; w < warCount && fams.length > 2; w++) {
      var a = pick(fams), b = pick(fams);
      if (a.id === b.id) continue;
      if (a.wars.indexOf(b.id) < 0) { a.wars.push(b.id); b.wars.push(a.id); }
    }
    return fams;
  }

  function recalcFamily(f, npcs) {
    var byId = {};
    for (var i = 0; i < npcs.length; i++) byId[npcs[i].id] = npcs[i];
    var r = 0;
    for (var j = 0; j < f.members.length; j++) {
      var m = byId[f.members[j]];
      if (m) r += m.respect;
    }
    f.respect = r;
  }

  /* The ladder is built in 33-attack.js: the strongest twenty accounts
     in the city, rung 1 being The Godfather. */

  function newGame(opts) {
    var now = NOW();
    var seed = (hashStr(opts.name + '|' + now) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    RNG.init(seed, 0);

    var used = {};
    used[String(opts.name).toLowerCase()] = 1;
    var npcs = [];
    for (var i = 1; i <= CFG.NPC_COUNT; i++) npcs.push(makeNPC(i, used, now));

    var player = {
      id: 0,
      name: opts.name,
      real: opts.real || '',
      gender: opts.gender || 'm',
      city: opts.city || 'Brooklyn, NY',
      hood: opts.hood || '',
      joined: now,
      level: 1,
      xp: 0,
      money: CFG.START_MONEY,
      bank: 0,
      str: 10, def: 10, spd: 10, dex: 10,
      healthMax: 100, health: 100,
      energyMax: 30, energy: 30,
      nerveMax: 5, nerve: 5,
      willMax: 12, will: 12,
      dexgMax: 20, dexg: 20,
      attacksMax: 5, attacks: 5,
      rung: 0,
      bestRung: 0,
      hospUntil: 0, hospWhy: '',
      jailUntil: 0, jailWhy: '', bail: 0,
      inv: {},
      wpn: null, arm: null,
      props: [],
      fam: null, famRole: null,
      bounty: 0,
      respect: 0,
      points: 25,
      iq: 10, lab: 10,
      bgUntil: 0,
      ladderLock: 0, lastFightAt: 0, bestLadderRung: 0,
      truckKit: {}, goodsUnits: 0,
      school: null, donator: 0,
      cityId: 'newyork',
      gyms: [], gym: null,
      votesToday: 0, voteDay: 0,
      regen: { energy: now, nerve: now, will: now, health: now, attacks: now, bank: now, ladder: now },
      st: {
        w: 0, l: 0, mugged: 0, muggedBy: 0, crimes: 0, crimeFail: 0, jailed: 0, hosped: 0,
        earned: 0, spent: 0, gymSets: 0, busts: 0, bustFail: 0, sent: 0, killsOnLadder: 0,
        bestMug: 0, chatLines: 0, posts: 0, daysActive: 1, walks: 0, finds: 0, jobs: 0,
        pointsEarned: 0, gambled: 0, gambleWon: 0, topRung: 0
      },
      seen: {},          // npcId -> last interaction ts
      friends: [],
      sig: '',
      bio: ''
    };

    var fams = buildFamilies(npcs, now);
    var ladder = GAME.ladder.build(npcs, player);

    S = {
      v: SAVE_VERSION,
      seed: seed,
      rngCursor: RNG.cursor,
      createdAt: now,
      lastSeen: now,
      savedAt: now,
      player: player,
      npcs: npcs,
      fams: fams,
      ladder: ladder,
      news: [],
      chat: [],
      mail: [],
      log: [],
      market: [],
      hitlist: [],
      forum: { threads: [], nextId: 1 },
      nextNpcId: CFG.NPC_COUNT + 1,
      nextMailId: 1,
      nextMktId: 1,
      counters: { day: 0, simSteps: 0 },
      flags: { tutorialSeen: false },
      settings: { pace: 1, chatOn: true, newsOn: true, sfx: false, confirmAttack: true, compact: false }
    };

    /* The people holding the ladder got there by fighting, so start them
       with a recent fight on the clock. Otherwise half the rungs read as
       dormant on day one and the reach rules never bite. */
    for (var z = 0; z < ladder.length; z++) {
      var lm = byId(ladder[z]);
      if (!lm) continue;
      lm.lastFightAt = now - Math.round(rflt(0.2, 2.4) * DAY * (1.3 - lm.p.activity));
      lm.rungSince = now - Math.round(rflt(1, 40) * DAY);
    }
    GAME.ladder.sync();

    GAME.items.equipNPCs();
    GAME.forumSim.seed(now);
    GAME.market.seed(now);
    GAME.points.seedMarket(now);
    GAME.auction.seed(now);
    GAME.sim.seedHistory(now);
    GAME.mail.system('welcome', {});

    return S;
  }

  function migrate(obj) {
    if (!obj.v) obj.v = 1;
    /* forward-compatible defaults for anything added after a save was made */
    if (!obj.settings) obj.settings = { pace: 1, chatOn: true, newsOn: true, sfx: false, confirmAttack: true, compact: false };
    if (!obj.hitlist) obj.hitlist = [];
    if (!obj.market) obj.market = [];
    if (!obj.forum) obj.forum = { threads: [], nextId: 1 };
    if (!obj.log) obj.log = [];
    if (!obj.counters) obj.counters = { day: 0, simSteps: 0 };
    if (!obj.player.st) obj.player.st = {};
    if (!obj.player.regen) obj.player.regen = { energy: NOW(), nerve: NOW(), will: NOW(), health: NOW(), attacks: NOW(), bank: NOW() };
    if (!obj.player.inv) obj.player.inv = {};
    if (!obj.player.props) obj.player.props = [];
    if (!obj.player.seen) obj.player.seen = {};
    if (obj.player.points === undefined) obj.player.points = 10;
    if (obj.player.dexg === undefined) { obj.player.dexg = 20; obj.player.dexgMax = 20; }
    if (obj.player.iq === undefined) obj.player.iq = 10;
    if (obj.player.lab === undefined) obj.player.lab = 10;
    if (obj.player.truckKit === undefined) obj.player.truckKit = {};
    if (obj.player.goodsUnits === undefined) obj.player.goodsUnits = 0;
    if (obj.player.school === undefined) obj.player.school = null;
    if (obj.player.gyms === undefined) obj.player.gyms = [];
    return obj;
  }

  return {
    newGame: newGame,
    migrate: migrate,
    makeNPC: makeNPC,
    recalcFamily: recalcFamily,
    ARCHETYPES: ARCHETYPES
  };
})();

/* ---- global lookups (hot path: keep an index) ---- */
var _npcIndex = null;
function reindex() {
  _npcIndex = {};
  for (var i = 0; i < S.npcs.length; i++) _npcIndex[S.npcs[i].id] = S.npcs[i];
}
function byId(id) {
  if (id === 0) return S.player;
  if (!_npcIndex || _npcIndex[id] === undefined) reindex();
  return _npcIndex[id] || null;
}
function famById(id) {
  if (!id) return null;
  for (var i = 0; i < S.fams.length; i++) if (S.fams[i].id === id) return S.fams[i];
  return null;
}
