/* ============================================================
   13-data-props.js :: properties, gyms and travel destinations
   ------------------------------------------------------------
   DATA.props   - 26 buyable holdings: 12 residences + 14 fronts.
   DATA.gym     - 9 gyms, the Will sink.
   DATA.cities  - 8 destinations, the crime-odds / payout dial.

   HOW THE ENGINE READS THESE  (36-world.js, 34-player.js, 30-items.js)

     props[].income   is credited PER GAME HOUR   (34-player economy)
     props[].upkeep   is charged  PER GAME DAY    (economy divides /24)
     props[].hp       adds flat max health        (30-items maxHealth)
     props[].energyRegen is a PERCENT speed-up of the energy tick
                      (34-player energyRegenMs: mult += pct/100)
     props[].lvl / price are gates checked in GAME.props.buy;
                      buy() draws from cash first, then bank.
                      sell() refunds 68%, so churn is punished.

     gym[].str/def/spd/dex are per-Will-point multipliers fed into
                      GAME.gym.gainFor(). A 0 means that gym simply
                      does not teach that stat. Membership is a
                      ONE-OFF fee and is kept forever, so switching
                      between owned gyms afterwards is free - which
                      is what makes the specialist gyms worth buying.

     cities[].bonus.crime is ADDED to a crime's success chance
                      (35-crimes successChance, clamped 0.03-0.97)
     cities[].bonus.pay   is ADDED to the payout multiplier
                      (35-crimes: payMult = 1 + pay)
     cities[].exclusive lists item ids sold only in that city. The
                      market ignores ids it does not recognise, so
                      this list is safe to over-specify.

   CURVE NOTES
     Homes:      price ratio eases smoothly x3.40 -> x2.69 per tier
                 ($5k to $900M). hp tracks price^0.42, so every tier
                 is a strict upgrade while value per dollar decays
                 by a near-constant ~0.53x a rung. Level gates run
                 1 -> 71 (they used to stop at 42, which left the
                 back half of the game with nothing to buy).
     Businesses: payback runs 8.5 real days on the newsstand out to
                 19.5 on the offshore casino - inside the 8-20 band
                 at every rung, but SLOPING UP, not down. A corner
                 shop is the fast payer and the billion-dollar
                 casino is the slow prestige buy. The old table had
                 it the other way round (18.9 -> 8.0), which meant
                 passive income compounded faster the richer you
                 got and the money curve ran away by the third
                 month. Level gates stretched 2 -> 76 for the same
                 reason. Gross yield is ~2.1x net at every tier;
                 the daily nut is a little over half the take.
     Gyms:       priced on MARGINAL value, not on the sticker. Each
                 rung costs almost exactly 2.68x the last one per
                 point it adds to your best-available multipliers:
                   $6.7k  $17.9k  $48k  $128k  $344k  $921k  $2.5M  $6.6M
                 Sal's Basement is now a strict aggregate upgrade on
                 the free YMCA (4.5 vs 4.0 across the four stats);
                 it used to total 3.9 and was the only paid rung in
                 the game that made you worse.
     Cities:     airfare x1.67-x2.33 per hop. The bonus pairs sit on
                 a strict Pareto frontier - sorted by success odds,
                 payout rises monotonically - so every step away
                 from New York buys money with risk and no
                 destination is outright better than another.

   PACING (simulated: crimes + jobs + gym, all pools spent, always
   buying the best thing affordable). First purchase inside the
   opening minute, then something new every 0.8 days on average for
   the first month, with the longest early drought 5 days (saving
   for the Auto Body Shop). Idle cash sits at 1-2 days of income
   through the first two months and drifts up from there as the
   26-item property ladder runs out; see the audit notes.
   ============================================================ */


/* ------------------------------------------------------------
   PROPERTIES
   ------------------------------------------------------------ */
DATA.props = [

  /* ---- RESIDENCES : health and energy, never income ---- */

  { id: 'roomAboveDeli', name: 'Rented Room Above the Deli', kind: 'home',
    lvl: 1, price: 5000, upkeep: 3, income: 0,
    hp: 0, energyRegen: 0,
    desc: 'A cot, a hotplate, and the smell of provolone coming up through the floorboards.' },

  { id: 'coldWaterWalkUp', name: 'Cold-Water Walk-Up', kind: 'home',
    lvl: 3, price: 17000, upkeep: 13, income: 0,
    hp: 30, energyRegen: 2,
    desc: 'Five flights up and no hot water, but the fire escape puts you on three different rooftops.' },

  { id: 'roomsOverClub', name: 'Two Rooms Over the Social Club', kind: 'home',
    lvl: 6, price: 56000, upkeep: 44, income: 0,
    hp: 50, energyRegen: 5,
    desc: 'You sleep to the sound of pinochle downstairs and somebody losing at it badly.' },

  { id: 'brownstoneFlat', name: 'Brownstone Apartment', kind: 'home',
    lvl: 10, price: 180000, upkeep: 150, income: 0,
    hp: 85, energyRegen: 8,
    desc: 'Stoop out front, iron radiators inside, and a landlady who has never once seen anything.' },

  { id: 'rowHouse', name: 'Row House on the Old Block', kind: 'home',
    lvl: 15, price: 570000, upkeep: 500, income: 0,
    hp: 135, energyRegen: 12,
    desc: 'The whole street knows your mother by name, which is worth more than any lock.' },

  { id: 'splitLevel', name: 'Suburban Split-Level', kind: 'home',
    lvl: 20, price: 1750000, upkeep: 1625, income: 0,
    hp: 215, energyRegen: 16,
    desc: 'Two-car garage, trimmed hedges, and a basement that nobody is ever invited into.' },

  { id: 'lakesideLodge', name: 'Lakeside Lodge', kind: 'home',
    lvl: 26, price: 5300000, upkeep: 5250, income: 0,
    hp: 345, energyRegen: 20,
    desc: 'Pine walls, a boathouse, and forty minutes of gravel road between you and a subpoena.' },

  { id: 'gatedEstate', name: 'Gated Estate', kind: 'home',
    lvl: 33, price: 15500000, upkeep: 16250, income: 0,
    hp: 545, energyRegen: 25,
    desc: 'Wrought iron, bad dogs, and a gatehouse with a man awake in it around the clock.' },

  { id: 'parkPenthouse', name: 'Penthouse Over the Park', kind: 'home',
    lvl: 41, price: 44000000, upkeep: 48800, income: 0,
    hp: 845, energyRegen: 30,
    desc: 'Private elevator, forty floors of nothing below you, and the city laid out like a menu.' },

  { id: 'cliffsideVilla', name: 'Cliffside Villa', kind: 'home',
    lvl: 50, price: 123000000, upkeep: 145000, income: 0,
    hp: 1300, energyRegen: 35,
    desc: 'Marble, sea spray, and exactly one road in that you can watch from the terrace.' },

  { id: 'runwayCompound', name: 'Country Compound with a Runway', kind: 'home',
    lvl: 60, price: 335000000, upkeep: 429000, income: 0,
    hp: 1980, energyRegen: 40,
    desc: 'Guest houses, a stable, and a strip of tarmac long enough to leave the country from.' },

  { id: 'islandCompound', name: 'Private Island Compound', kind: 'home',
    lvl: 71, price: 900000000, upkeep: 1260000, income: 0,
    hp: 3000, energyRegen: 45,
    desc: 'No bridge, no neighbours, no extradition treaty, and a dock built for two fast boats.' },


  /* ---- BUSINESSES : hourly income, heavy daily nut ---- */

  { id: 'newsstand', name: 'Newsstand', kind: 'biz',
    lvl: 2, price: 25000, upkeep: 2410, income: 223,
    hp: 0, energyRegen: 0,
    desc: 'Papers, gum, and a cigar box under the counter that has never once held cigars.' },

  { id: 'laundromat', name: 'Corner Laundromat', kind: 'biz',
    lvl: 5, price: 70000, upkeep: 6700, income: 591,
    hp: 0, energyRegen: 0,
    desc: 'Quarters go in dirty and come out clean, and so does everything else in the building.' },

  { id: 'poolHall', name: 'Pool Hall', kind: 'biz',
    lvl: 9, price: 185000, upkeep: 16000, income: 1420,
    hp: 0, energyRegen: 0,
    desc: 'Green felt, cheap beer, and a back room where the games that matter get played.' },

  { id: 'pizzeria', name: 'Pizzeria', kind: 'biz',
    lvl: 13, price: 460000, upkeep: 37100, income: 3280,
    hp: 0, energyRegen: 0,
    desc: 'Best slice on the avenue and the busiest telephone in the whole neighbourhood.' },

  { id: 'bodyShop', name: 'Auto Body Shop', kind: 'biz',
    lvl: 18, price: 1100000, upkeep: 83100, income: 7320,
    hp: 0, energyRegen: 0,
    desc: 'Dents hammered out in front, plates stamped out back, no questions asked in either room.' },

  { id: 'checkCashing', name: 'Check-Cashing Storefront', kind: 'biz',
    lvl: 23, price: 2600000, upkeep: 180000, income: 16000,
    hp: 0, energyRegen: 0,
    desc: 'Bulletproof glass, terrible rates, and a line out the door every single Friday.' },

  { id: 'nightclub', name: 'Nightclub', kind: 'biz',
    lvl: 28, price: 6000000, upkeep: 389000, income: 34600,
    hp: 0, energyRegen: 0,
    desc: 'Velvet rope, terrible music, and a register that has never balanced twice the same way.' },

  { id: 'wasteHauling', name: 'Waste Hauling Company', kind: 'biz',
    lvl: 34, price: 13500000, upkeep: 804000, income: 72500,
    hp: 0, energyRegen: 0,
    desc: 'Nobody outbids you, nobody wants to, and nobody ever looks inside the trucks.' },

  { id: 'unionLocal', name: 'Union Local', kind: 'biz',
    lvl: 40, price: 30000000, upkeep: 1620000, income: 149000,
    hp: 0, energyRegen: 0,
    desc: 'Dues come in, jobs go out, and the vote is settled well before the meeting opens.' },

  { id: 'downtownHotel', name: 'Downtown Hotel', kind: 'biz',
    lvl: 46, price: 65000000, upkeep: 3220000, income: 302000,
    hp: 0, energyRegen: 0,
    desc: 'Four hundred rooms, one house detective, and a laundry chute with a reputation.' },

  { id: 'racetrack', name: 'Racetrack', kind: 'biz',
    lvl: 53, price: 140000000, upkeep: 6300000, income: 607000,
    hp: 0, energyRegen: 0,
    desc: 'The horses run honest most afternoons, and the tote board quietly handles the rest.' },

  { id: 'portTerminal', name: 'Container Port Terminal', kind: 'biz',
    lvl: 60, price: 290000000, upkeep: 11800000, income: 1170000,
    hp: 0, energyRegen: 0,
    desc: 'Ten thousand boxes a week and a customs inspector who thinks the world of you.' },

  { id: 'riverboatCasino', name: 'Riverboat Casino', kind: 'biz',
    lvl: 68, price: 600000000, upkeep: 23000000, income: 2300000,
    hp: 0, energyRegen: 0,
    desc: "Once she clears the last buoy she is nobody's jurisdiction but yours." },

  { id: 'offshoreCasino', name: 'Offshore Casino', kind: 'biz',
    lvl: 76, price: 1200000000, upkeep: 44700000, income: 4430000,
    hp: 0, energyRegen: 0,
    desc: 'Sun, sand, a very friendly finance minister, and a vault the size of a chapel.' }
];


/* ------------------------------------------------------------
   GYMS
   Multipliers are per Will point. The free gym is flat 1.0 across
   the board and is the yardstick everything else is measured by.
   A 0 means the gym does not teach that stat at all.

   Best multiplier available if you own every gym up to tier N:
     tier   1    2    3    4    5    6    7    8    9
     str  1.0  1.6  2.3  3.3  3.3  4.6  5.4  6.0  7.4
     def  1.0  1.4  1.4  3.0  3.0  4.3  4.8  6.4  7.2
     spd  1.0  1.0  2.5  2.5  3.4  3.4  5.2  5.6  7.0
     dex  1.0  1.0  1.2  1.2  3.8  3.8  4.1  5.8  6.8
   Every tier moves at least one column, so there is no dead rung.
   ------------------------------------------------------------ */
DATA.gym = [

  { id: 'oldY', name: 'The Old YMCA',
    lvl: 1, price: 0,
    str: 1, def: 1, spd: 1, dex: 1,
    desc: 'Rusted plates, a heavy bag held together with tape, and it does not cost a dime.' },

  { id: 'salsBasement', name: "Sal's Basement Weights",
    lvl: 5, price: 10000,
    str: 1.9, def: 1.6, spd: 1, dex: 0,
    desc: 'Chalk dust, one flickering bulb, and Sal miscounting your reps on purpose.' },

  { id: 'ringside', name: 'Ringside Boxing Club',
    lvl: 10, price: 53000,
    str: 2.4, def: 1.5, spd: 2.6, dex: 1.3,
    desc: 'Skip rope until the bell rings, then get hit steadily until it rings again.' },

  { id: 'docksideBarbell', name: 'Dockside Barbell Hall',
    lvl: 16, price: 173000,
    str: 3.4, def: 3.1, spd: 1.9, dex: 0,
    desc: 'Longshoremen move iron here the way they move freight: all day, no complaints.' },

  { id: 'fencingSalle', name: 'The Fencing Salle',
    lvl: 23, price: 647000,
    str: 1.5, def: 2.7, spd: 3.6, dex: 4,
    desc: 'Foils, footwork, and a master who calls you clumsy in three different languages.' },

  { id: 'ironCathedral', name: 'Iron Cathedral',
    lvl: 31, price: 1610000,
    str: 4.8, def: 4.5, spd: 3.6, dex: 3,
    desc: 'Forty thousand square feet of steel and a sound system that rattles your fillings.' },

  { id: 'cageOnNinth', name: 'The Cage on Ninth',
    lvl: 40, price: 4740000,
    str: 5.6, def: 5, spd: 5.4, dex: 4.3,
    desc: 'No bell, no rounds, and a doctor on the payroll standing in for a referee.' },

  { id: 'palazzoSociety', name: 'Palazzo Athletic Society',
    lvl: 50, price: 15400000,
    str: 6.2, def: 6.6, spd: 5.8, dex: 6,
    desc: 'Marble baths, a fencing floor, and a membership roll that is never put in print.' },

  { id: 'theVault', name: 'The Vault',
    lvl: 62, price: 45800000,
    str: 7.6, def: 7.4, spd: 7.2, dex: 7,
    desc: 'No sign, no windows, and a waiting list that money by itself will not clear.' }
];


/* ------------------------------------------------------------
   CITIES
   bonus.crime is added to success chance, bonus.pay to the payout
   multiplier. Sorted by airfare; past Chicago each hop trades odds
   for money on a clean frontier, so nothing here is a dead choice.

     city         fare    min   crime    pay
     Chicago      3,500    18   +0.06  -0.05   safest, thinnest
     Tijuana      7,000    26   +0.03  -0.02
     New York     1,500    10    0.00   0.00   the baseline
     Miami       12,000    35   -0.02  +0.07
     Las Vegas   20,000    46   -0.04  +0.16
     London      38,000    60   -0.06  +0.26
     Sicily      65,000    78   -0.08  +0.37
     Hong Kong  120,000   100   -0.11  +0.50   richest, coldest
   (listed in frontier order, not the fare order used below)
   ------------------------------------------------------------ */
DATA.cities = [

  { id: 'newyork', name: 'New York', country: 'United States',
    cost: 1500, flightMin: 10,
    bonus: { crime: 0.00, pay: 0.00 },
    exclusive: ['switchblade', 'brassKnuckles'],
    desc: "Home turf. Every stoop, every chain fence, every patrolman's route - you learned them here." },

  { id: 'chicago', name: 'Chicago', country: 'United States',
    cost: 3500, flightMin: 18,
    bonus: { crime: 0.06, pay: -0.05 },
    exclusive: ['chicagoTypewriter'],
    desc: 'Wind off the lake, meat on the rails, and a ward boss who has never told you no.' },

  { id: 'tijuana', name: 'Tijuana', country: 'Mexico',
    cost: 7000, flightMin: 26,
    bonus: { crime: 0.03, pay: -0.02 },
    exclusive: ['boneHandledMachete'],
    desc: 'Dust and neon, and a border you can be on either side of before the paperwork starts.' },

  { id: 'miami', name: 'Miami', country: 'United States',
    cost: 12000, flightMin: 35,
    bonus: { crime: -0.02, pay: 0.07 },
    exclusive: ['pearlGripRevolver'],
    desc: 'Pastel stucco, palm shadows, and go-fast boats leaving the marina at three in the morning.' },

  { id: 'lasvegas', name: 'Las Vegas', country: 'United States',
    cost: 20000, flightMin: 46,
    bonus: { crime: -0.04, pay: 0.16 },
    exclusive: ['goldenderringer'],
    desc: 'A neon smear in the desert where the money is loose and the pit bosses count every card.' },

  { id: 'london', name: 'London', country: 'United Kingdom',
    cost: 38000, flightMin: 60,
    bonus: { crime: -0.06, pay: 0.26 },
    exclusive: ['gentlemansCane'],
    desc: 'Fog, fixed odds, and East End firms that only ever do business by appointment.' },

  { id: 'sicily', name: 'Sicily', country: 'Italy',
    cost: 65000, flightMin: 78,
    bonus: { crime: -0.08, pay: 0.37 },
    exclusive: ['luparaSawnoff', 'stiletto'],
    desc: "Lemon groves and stone villages full of old men who remember your grandfather's face." },

  { id: 'hongkong', name: 'Hong Kong', country: 'Hong Kong',
    cost: 120000, flightMin: 100,
    bonus: { crime: -0.11, pay: 0.50 },
    exclusive: ['butterflySwords', 'jadeHandledPistol'],
    desc: 'Harbour lights and container cranes, and a hundred outfits who have never heard of you.' }
];
