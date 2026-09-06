/* ============================================================
   10-data-ranks.js :: the rank ladder and the level XP table
   ------------------------------------------------------------
   Two SEPARATE progressions, both driven by lifetime XP:

     DATA.levels  - 100 levels. Gates content and grows your
                    max Energy / Will / Brave / Health / Attacks.
     DATA.ranks   - 30 mob titles. Pure prestige + flavour, and
                    a much slower ladder than levels: rank 30
                    lands somewhere around level 80.

   Both curves were generated from formulas and then written out
   as literals so nothing has to be computed at boot.

   levels.table[i] = cumulative XP required to REACH level i+1.
     table[0]  = 0          (level 1)
     table[1]  = 120        (level 2)
     table[9]  = 9,000      (level 10)
     table[24] = 220,000    (level 25)
     table[49] = 4,500,000  (level 50)
     table[99] = 380,000,000(level 100)
   Monotone log-log interpolation through those anchors, so the
   per-level cost rises smoothly the whole way - no cliffs, and
   every single level costs more than the one before it.

   NOTE: there is deliberately no xpFor() function here. This is
   a pure data file; look levels up with DATA.levels.table.
   ============================================================ */

/* ------------------------------------------------------------
   RANKS
   Ratio between consecutive rank thresholds decays smoothly from
   ~4.9x at the bottom to ~1.32x at the top, so early promotions
   come thick and fast and the last few take months.
   Generated with  xp(i) = 243.2 * n^2 * 1.2336^n,  n = i - 1.
   ------------------------------------------------------------ */
DATA.ranks = [
  { name: 'Empty Suit',        xp: 0,
    blurb: 'Nobody knows your name yet, and nobody is asking.' },
  { name: 'Corner Kid',        xp: 300,
    blurb: 'You hold down a corner and run messages for coffee money.' },
  { name: 'Pickpocket',        xp: 1480,
    blurb: 'Light fingers, quick feet, and a very forgettable face.' },
  { name: 'Petty Thief',       xp: 4110,
    blurb: 'Car radios, cash drawers, anything not bolted down.' },
  { name: 'Street Thug',       xp: 9010,
    blurb: 'People cross the road when they see you coming.' },
  { name: 'Hoodlum',           xp: 17400,
    blurb: 'You have a crew of two and a reputation worth about that.' },
  { name: 'Bagman',            xp: 30900,
    blurb: 'You carry the envelopes now, and nobody counts them twice.' },
  { name: 'Leg Breaker',       xp: 51800,
    blurb: 'Late payers get one warning, and you are the warning.' },
  { name: 'Enforcer',          xp: 83500,
    blurb: 'The family sends you when a conversation needs weight behind it.' },
  { name: 'Racketeer',         xp: 130000,
    blurb: 'Half the shops on the block pay you for the privilege of staying open.' },
  { name: 'Fixer',             xp: 198000,
    blurb: 'Problems arrive on your desk and quietly stop existing.' },
  { name: 'Associate',         xp: 296000,
    blurb: 'Not blood, not made, but the bosses know your first name.' },
  { name: 'Earner',            xp: 435000,
    blurb: 'You move real money upstairs every week and the family notices.' },
  { name: 'Wiseguy',           xp: 630000,
    blurb: 'Sharp suit, sharper mouth, and a table waiting at every restaurant.' },
  { name: 'Button Man',        xp: 901000,
    blurb: 'When a button gets pushed somewhere in the city, it is usually you.' },
  { name: 'Soldier',           xp: 1280000,
    blurb: 'Sworn in, straightened out, and answerable to one capo only.' },
  { name: 'Made Man',          xp: 1790000,
    blurb: 'You went through the ceremony. Touching you is now a declaration of war.' },
  { name: 'Hitman',            xp: 2490000,
    blurb: 'You get the calls that never go through a telephone.' },
  { name: 'Crew Chief',        xp: 3450000,
    blurb: 'Six guys, four blocks, and every dollar that walks across them.' },
  { name: 'Caporegime',        xp: 4740000,
    blurb: 'A whole regime reports to you, and you report to exactly one man.' },
  { name: 'Street Boss',       xp: 6480000,
    blurb: 'You run the day-to-day so the old man never has to be seen running anything.' },
  { name: 'Consigliere',       xp: 8790000,
    blurb: 'You do not raise your voice. You have never needed to.' },
  { name: 'Underboss',         xp: 11900000,
    blurb: 'Second chair at the table, and the whole table knows it.' },
  { name: 'Boss',              xp: 16100000,
    blurb: 'The family is yours. So is every mistake anybody in it makes.' },
  { name: 'Don',               xp: 21600000,
    blurb: 'They kiss the ring, and they mean it.' },
  { name: 'Godfather',         xp: 28900000,
    blurb: 'Weddings stop when you walk in. Nobody remembers who invited you.' },
  { name: 'Capo di Tutti Capi', xp: 38600000,
    blurb: 'Boss of all bosses. The other dons ask permission now.' },
  { name: 'Kingpin',           xp: 51300000,
    blurb: 'Five families, one phone number, and it rings on your nightstand.' },
  { name: 'Living Legend',     xp: 68100000,
    blurb: 'Old men tell stories about you and the young ones do not believe them.' },
  { name: 'Immortal',          xp: 90000000,
    blurb: 'They stopped putting your name in the papers. They just say "him".' }
];

/* ------------------------------------------------------------
   LEVELS
   ------------------------------------------------------------ */
DATA.levels = {

  maxLevel: 100,

  /* cumulative XP to REACH level 1..100 */
  table: [
    0, 120, 430, 890, 1523,
    2371, 3482, 4912, 6726, 9000,
    11880, 15550, 20160, 25860, 32820,
    41250, 51330, 63300, 77360, 93770,
    112800, 134600, 159600, 188000, 220000,
    256100, 296600, 342100, 393100, 450200,
    513900, 585000, 664200, 752500, 850600,
    959600, 1081000, 1215000, 1364000, 1529000,
    1712000, 1913000, 2137000, 2384000, 2656000,
    2957000, 3288000, 3654000, 4056000, 4500000,
    4992000, 5541000, 6154000, 6835000, 7594000,
    8436000, 9370000, 10400000, 11550000, 12810000,
    14210000, 15750000, 17440000, 19300000, 21350000,
    23590000, 26040000, 28720000, 31650000, 34850000,
    38330000, 42110000, 46220000, 50680000, 55510000,
    60740000, 66390000, 72480000, 79050000, 86110000,
    93710000, 101900000, 110600000, 120000000, 130000000,
    140700000, 152100000, 164200000, 177100000, 190900000,
    205400000, 220900000, 237300000, 254600000, 272800000,
    292100000, 312500000, 333900000, 356400000, 380000000
  ],

  /* Level-1 maxima. Mirrors the fresh player built in 04-state.js;
     kept here so anything can recompute a cap from a level alone. */
  base: {
    energy: 30,
    will: 12,
    brave: 5,
    nerve: 5,      /* alias - the save state calls Brave "nerve" */
    health: 100,
    attacks: 5
  },

  /* Max-stat gain PER LEVEL above level 1. Fractional values are
     floored by the engine at use time, i.e.

         max = base + Math.floor(perLevel * (level - 1))

     Level 50 therefore lands on:
        energy  30 + floor(2.05  * 49) =  30 + 100 = 130
        will    12 + floor(0.98  * 49) =  12 +  48 =  60
        brave    5 + floor(0.35  * 49) =   5 +  17 =  22
        health 100 + floor(12.25 * 49) = 100 + 600 = 700
        attacks  5 + floor(0.07  * 49) =   5 +   3 =   8      */
  perLevel: {
    energy: 2.05,
    will: 0.98,
    brave: 0.35,
    nerve: 0.35,
    health: 12.25,
    attacks: 0.07
  },

  /* Hard ceilings. Only Attacks would otherwise run away - the
     regen timer is 20 minutes a point, so a huge pool is no fun. */
  cap: {
    energy: 300,
    will: 150,
    brave: 50,
    nerve: 50,
    health: 2000,
    attacks: 10
  }
};
