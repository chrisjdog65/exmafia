/* ============================================================
   02-config.js :: balance constants
   "Classic" mirrors the slow real-time pacing of the original
   browser game. "Relaxed" is a quality-of-life multiplier the
   player can pick on the settings page.
   ============================================================ */

var CFG = {
  SAVE_KEY: 'exmafia.save.v1',
  SAVE_BACKUP_KEY: 'exmafia.save.v1.bak',
  NPC_COUNT: 200,

  /* ---- real-time regeneration, in ms per point ---- */
  ENERGY_TICK: 3 * MIN,     // +1 Energy    / 3 min
  NERVE_TICK: 5 * MIN,      // +1 Brave     / 5 min
  WILL_TICK: 12 * MIN,      // +1 Will      / 12 min
  DEX_TICK: 8 * MIN,        // +1 Dexterity / 8 min
  HEALTH_TICK: 90 * 1000,   // +1% health   / 90 s, out of hospital only
  ATTACK_TICK: 20 * MIN,    // +1 Attack    / 20 min

  /* hard ceilings on the gauges, whatever the level */
  CAP: { energy: 300, will: 150, nerve: 50, dexg: 120, health: 2000, attacks: 10 },

  /* ---- caps ---- */
  NEWS_CAP: 400,
  CHAT_CAP: 250,
  MAIL_CAP: 300,
  LOG_CAP: 300,
  MARKET_CAP: 120,
  EVENT_CAP: 500,

  /* ---- world simulation ---- */
  UI_TICK: 1000,            // ms between UI/chat/news ticks
  SIM_STEP: 60 * 1000,      // one simulated world step = 1 game minute
  OFFLINE_MAX: 14 * DAY,    // cap catch-up simulation at two weeks
  OFFLINE_STEP_MS: 5 * MIN, // coarse step size when catching up

  /* ---- the Attack Ladder ---- */
  LADDER_RUNGS: 20,
  LADDER_REACH: 5,          // rungs upward you may challenge once you are on it
  LADDER_ENTRY: 3,          // bottom N rungs are the door in from off the ladder
  LADDER_PTS_HOUR: 10,      // per hour while you hold a rung
  GODFATHER_PTS_HOUR: 25,   // rung one pays more
  LADDER_IDLE_H: 72,        // a rung held by somebody dormant loses its reach protection
  CHALLENGE_LOCK: 45 * MIN, // after a failed challenge, against that defender
  REENTRY_LOCK: 30 * MIN,   // after being knocked off the ladder

  /* ---- combat ---- */
  ATTACK_ENERGY: 2,         // a plain attack
  CHALLENGE_ENERGY: 6,      // a ladder challenge
  CHALLENGE_MIN_HP: 0.5,    // and you must be at half health to make one
  HOSP_MIN: 3 * MIN,
  HOSP_MAX: 75 * MIN,
  JAIL_MIN: 2 * MIN,
  JAIL_MAX: 60 * MIN,
  MUG_FRACTION: 0.18,       // share of a loser's CARRIED cash a mugger takes
  DROP_CHANCE: 0.22,
  NEWBIE_LEVEL: 5,          // nobody may attack an account under this level
  NEWBIE_HOURS: 48,         // or younger than this, whichever ends later
  SEASON_LENGTH: 56 * DAY,  // a round is eight weeks, then The Rumble

  /* ---- economy ---- */
  BANK_RATE: 0.0007,        // per game-hour on banked cash (compounding, capped)
  BANK_CAP_MULT: 50,
  START_MONEY: 500,

  /* ---- gym ---- */
  GYM_WILL_PER_SET: 1,

  pace: 1                   // multiplier applied to all regen timers (settings)
};

function paced(ms) { return ms * CFG.pace; }
