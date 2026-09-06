/* ============================================================
   43-season.js :: the round, and The Rumble
   "Unlike most RPGs Exmafia has rounds and after a given round is
    over the players are reset to having nothing."
   Eight weeks, then a last-man-standing free-for-all between the
   twenty people on the Attack Ladder, then everybody starts again.
   ============================================================ */

GAME.season = (function () {

  function startedAt() { return S.seasonStart || S.createdAt; }
  function endsAt() { return startedAt() + CFG.SEASON_LENGTH; }
  function left() { return Math.max(0, endsAt() - NOW()); }
  function over() { return NOW() >= endsAt(); }
  function number() { return (S.roundNo || 1); }
  function week() { return Math.floor((NOW() - startedAt()) / (7 * DAY)) + 1; }
  /* the HUD only starts nagging from week six */
  function showCountdown() { return week() >= 6 || left() < 14 * DAY; }

  function hall() { return S.hall || (S.hall = []); }

  /* A single-elimination bracket of the ladder, seeded by rung. The
     player enters at their rung, or as a wildcard if they are off it. */
  function rumble() {
    if (!over()) return { err: 'The round is not over yet. ' + clock(left()) + ' to go.' };
    if (S.rumbleDone) return { err: 'The Rumble has already been fought.' };

    var seeds = [];
    var roster = GAME.ladder.roster();
    for (var i = 0; i < roster.length; i++) {
      var e = byId(roster[i]);
      if (e) seeds.push(e);
    }
    if (GAME.ladder.rungOf(0) === 0) seeds.push(S.player);   // wildcard

    /* everybody comes in fresh - no hospital, no half-health excuses */
    var hp = {};
    for (var h = 0; h < seeds.length; h++) hp[seeds[h].id] = maxHealth(seeds[h]);

    var rounds = [];
    var field = seeds.slice();
    var guard = 0;
    while (field.length > 1 && guard++ < 12) {
      var next = [], bouts = [];
      for (var k = 0; k < field.length; k += 2) {
        var a = field[k], b = field[k + 1];
        if (!b) { next.push(a); bouts.push({ bye: true, a: a.name }); continue; }
        var saveA = a.health, saveB = b.health;
        a.health = hp[a.id]; b.health = hp[b.id];
        var res = GAME.combat.fight(a, b);
        a.health = saveA; b.health = saveB;
        var win = res.win ? a : b;
        next.push(win);
        bouts.push({ a: a.name, b: b.name, winner: win.name, rounds: res.rounds, log: res.log });
      }
      rounds.push(bouts);
      field = next;
    }

    var champ = field[0] || seeds[0];
    S.rumbleDone = true;
    S.lastRumble = {
      round: number(), at: NOW(),
      champion: champ ? champ.name : 'nobody',
      championIsPlayer: champ && champ.id === 0,
      entrants: seeds.length,
      bracket: rounds
    };
    hall().push({
      round: number(), champion: S.lastRumble.champion, wasPlayer: S.lastRumble.championIsPlayer,
      at: NOW(), bestRung: S.player.bestLadderRung || 0, level: S.player.level
    });
    if (S.lastRumble.championIsPlayer) {
      S.player.money += 500;
      GAME.feed.news('ladder', '{who} is the last one standing. The Rumble, round {n}.', { who: S.player.name, n: number() });
      GAME.feed.log('rumble', 'You won The Rumble for round ' + number() + '. $500 and your name on the wall.');
    } else {
      GAME.feed.news('ladder', '{who} took The Rumble for round {n}.', { who: S.lastRumble.champion, n: number() });
    }
    return { ok: true, result: S.lastRumble };
  }

  /* Start the next round. Everything goes except the wall, the lifetime
     counters and any donator days you paid for. */
  function reset() {
    if (!over()) return { err: 'The round is not over.' };
    var keepHall = hall().slice();
    var keepRound = number() + 1;
    var keepName = S.player.name, keepCity = S.player.city, keepHood = S.player.hood;
    var keepGender = S.player.gender, keepSig = S.player.sig, keepBio = S.player.bio;
    var keepDonator = S.player.donator || 0;
    var lifetime = S.lifetime || { rounds: 0, bestRung: 0, rumbles: 0, totalXP: 0, totalCrimes: 0 };
    lifetime.rounds = keepRound - 1;
    lifetime.bestRung = Math.min(lifetime.bestRung || 999, S.player.bestLadderRung || 999);
    if (S.lastRumble && S.lastRumble.championIsPlayer) lifetime.rumbles = (lifetime.rumbles || 0) + 1;
    lifetime.totalXP = (lifetime.totalXP || 0) + S.player.xp;
    lifetime.totalCrimes = (lifetime.totalCrimes || 0) + (S.player.st.crimes || 0);
    var settings = S.settings;

    GAME.state.newGame({ name: keepName, city: keepCity, hood: keepHood, gender: keepGender });
    reindex();
    GAME.progress.applyLevel(S.player);
    S.player.sig = keepSig; S.player.bio = keepBio;
    S.player.donator = keepDonator;
    S.player.energy = S.player.energyMax; S.player.will = S.player.willMax;
    S.player.nerve = S.player.nerveMax; S.player.dexg = S.player.dexgMax;
    S.player.attacks = S.player.attacksMax; S.player.health = maxHealth(S.player);
    S.hall = keepHall;
    S.roundNo = keepRound;
    S.lifetime = lifetime;
    S.seasonStart = NOW();
    S.rumbleDone = false;
    S.settings = settings || S.settings;
    GAME.mail.system('newround', { n: keepRound });
    return { ok: true, round: keepRound };
  }

  return {
    startedAt: startedAt, endsAt: endsAt, left: left, over: over, number: number,
    week: week, showCountdown: showCountdown, rumble: rumble, reset: reset, hall: hall
  };
})();
