/* ============================================================
   15-data-items-hi.js :: the late catalogue
   ------------------------------------------------------------
   The level cap is gone. Levels run past 100 and keep going, and
   the shop used to stop dead at 85 (Last Rites) with nothing left
   to want. This file continues every ladder in 12-data-items.js
   and 13-data-props.js out to level 160.

     DATA.items  +41   24 weapons, 6 armour, 4 medical,
                       3 boosters, 4 drops
     DATA.props  +8    4 residences, 4 fronts
     DATA.gym    +4    tiers ten through thirteen

   WEAPON PRICING. Same law as the base catalogue: shop price is
   solved against expected damage per swing at zero Strength,

       power = (atk * 1.45 + 2) * acc            (31-combat)
       price = power * PP(L)

   PP(L) is the going rate for one point of power at level L. It
   is read straight off the existing table below 85 (log-linear
   between the real rungs: $8.9k at 48, $16.4k at 57, $28.1k at
   65, $39.8k at 70, $49.6k at 74, $65.3k at 79, $85.8k at 84,
   $90.9k at 85 - Last Rites) and above 85 it keeps climbing at a
   rate that decays every single level:

       PP(L+1) / PP(L) = 1 + 0.0545 - 0.000225 * (L - 85)

   5.45% a level at 85, 3.76% a level at 160. Power over the same
   stretch not quite doubles, so PRICE PER POINT OF ATTACK RISES
   MONOTONICALLY inside every category, all the way up:

       melee    $8.3k  ->  $466k        pistol   $23k  ->  $767k
       smg      $34k   ->  $836k        rifle   $101k  ->  $1.74m
       heavy    $95k   ->  $2.73m

   One point of weapon attack is worth 12.6 Strength and one point
   of armour defence 5.0 Guard, so a rising price per point is the
   thing that stops a rich man buying his way past the gym. He
   cannot. The Reckoning costs 61 times what Last Rites costs and
   hits a shade UNDER twice as hard.

   THE ACCURACY TRADE, which is the whole game up here. Accuracy
   multiplies the entire damage line, Strength included, so a
   low-accuracy monster is worth most to a WEAK account and loses
   ground every day you train. Three pairs are built as genuine
   forks rather than upgrades:

     Meat Grinder (smg 107, 440/0.79, $144m)  vs
     The Actuary  (rifle 108, 358/0.91, $142m)
       Same money, one level apart. The Grinder wins below
       Strength 2,275 and never again after.

     Widow's Walk  (heavy 110, 640/0.62, $190m)  vs
     The Full Stop (melee 110, 208/0.97, $97m)
       The heavy hits harder until Strength 7,009, at which point
       a lead pipe costing half as much overtakes it for good.

     The Notary (pistol 120, 300/0.99, $230m)  vs
     The Actuary (rifle 108, 358/0.91, $142m)
       The Notary is a worse weapon that costs 62% more, until
       Strength 4,519. Past that it is the best pistol ever built.

   ARMOUR is priced against def on the base table's own curve
   (log-quadratic fit through all twenty existing suits, which is
   still climbing at 4.7% a level at 150). Plate costs Speed, and
   Speed feeds both your hit chance and your evasion, so the line
   deliberately zig-zags: -10, 0, -15, -5, -26, -9. The
   Sarcophagus is 20% more defence than The Confessional for 3.1
   times the money and twenty-one more points of Speed, and it is
   supposed to be an argument.

   MEDICAL. heal is a percentage and 30-items.js clamps the result
   at your maximum, so 100 is 100 and the Private Clinic Suite
   reached the ceiling back at level 55. Everything above it is
   priced as a luxury good and written as one: the joke is that
   the four-million-dollar surgeon gets you to exactly the same
   place as the roll of bandages, only with better parking.

   BOOSTERS stay loss-making. Priced at the time-value of the
   resource they hand back - minutes of regeneration times what a
   day is worth at that level - times 1.9 for Brave and Will and
   times 1.0 for Energy, which is the ratio the base table already
   uses. Amounts are sized to fill the bar at their unlock level
   and no further, because 30-items.js clamps the overflow.
   ============================================================ */

DATA.items = (DATA.items || []).concat([

  /* ==========================================================
     MELEE  (5)  levels 48 - 110
     Still the budget line. Lowest attack in the game and the
     highest accuracy, which is exactly why it comes back into
     fashion once your Strength is enormous.
     ========================================================== */

  { id: 'boathook', name: 'Boat Hook', cat: 'melee', lvl: 48, price: 780000,
    atk: 63, def: 0, acc: 0.94, heal: 0, effect: null, stock: true,
    desc: 'Eight feet of ash with a hooked steel head. Came off a tug and went straight into the back of a station wagon.' },

  { id: 'quarrymaul', name: 'Quarry Maul', cat: 'melee', lvl: 57, price: 1640000,
    atk: 86, def: 0, acc: 0.79, heal: 0, effect: null, stock: true,
    desc: 'Twelve pounds on a hickory handle. Slow enough to read a paper between swings, and it does not seem to matter.' },

  { id: 'barbersrazor', name: "Barber's Razor", cat: 'melee', lvl: 68, price: 4850000,
    atk: 96, def: 0, acc: 0.98, heal: 0, effect: null, stock: true,
    desc: 'Bone handle, stropped every morning for forty years by a man who never once nicked a customer.' },

  { id: 'rebarwhip', name: 'Rebar Whip', cat: 'melee', lvl: 86, price: 18300000,
    atk: 140, def: 0, acc: 0.93, heal: 0, effect: null, stock: true,
    desc: 'Four feet of construction steel with the ribs still on it. Bends around whatever you were aiming at and finds it anyway.' },

  { id: 'fullstop', name: 'The Full Stop', cat: 'melee', lvl: 110, price: 97000000,
    atk: 208, def: 0, acc: 0.97, heal: 0, effect: null, stock: true,
    desc: 'A pipe, filled with lead, capped at both ends and balanced by somebody who understood punctuation.' },


  /* ==========================================================
     PISTOL  (5)  levels 65 - 120
     ========================================================== */

  { id: 'undertaker', name: 'The Undertaker', cat: 'pistol', lvl: 65, price: 4720000,
    atk: 129, def: 0, acc: 0.89, heal: 0, effect: null, stock: true,
    desc: 'Matte grey, no shine, no engraving. It turns up, handles the arrangements and is gone before the family arrives.' },

  { id: 'nightwatchman', name: 'Nightwatchman', cat: 'pistol', lvl: 74, price: 9980000,
    atk: 160, def: 0, acc: 0.86, heal: 0, effect: null, stock: true,
    desc: 'A big slow automatic built for men who sit in booths. Chambered for something you could post a letter with.' },

  { id: 'quietman', name: 'The Quiet Man', cat: 'pistol', lvl: 87, price: 28100000,
    atk: 202, def: 0, acc: 0.94, heal: 0, effect: null, stock: true,
    desc: 'Suppressed, subsonic and about as loud as a chair being moved in the next room. Steady as a bench rest.' },

  { id: 'bishopspiece', name: "Bishop's Piece", cat: 'pistol', lvl: 101, price: 71700000,
    atk: 268, def: 0, acc: 0.87, heal: 0, effect: null, stock: true,
    desc: 'Came out of a cathedral safe alongside two passports and a bearer bond. Nobody has ever asked the obvious question.' },

  { id: 'thenotary', name: 'The Notary', cat: 'pistol', lvl: 120, price: 230000000,
    atk: 300, def: 0, acc: 0.99, heal: 0, effect: null, stock: true,
    desc: 'Small, slow and it does not miss. A waste of money in a weak hand and the last word in a strong one.' },


  /* ==========================================================
     SMG  (5)  levels 70 - 125
     ========================================================== */

  { id: 'papershredder', name: 'Paper Shredder', cat: 'smg', lvl: 70, price: 8310000,
    atk: 168, def: 0, acc: 0.85, heal: 0, effect: null, stock: true,
    desc: 'Feeds from the top, empties in a hurry, and leaves behind nothing anybody could put back together.' },

  { id: 'metronome', name: 'The Metronome', cat: 'smg', lvl: 79, price: 17600000,
    atk: 205, def: 0, acc: 0.90, heal: 0, effect: null, stock: true,
    desc: 'Six hundred a minute, dead even, never a stumble. You could set a watch by it and one or two people have.' },

  { id: 'hailstorm', name: 'The Hailstorm', cat: 'smg', lvl: 92, price: 44500000,
    atk: 275, def: 0, acc: 0.84, heal: 0, effect: null, stock: true,
    desc: 'Two barrels, one trigger, and a noise on the roof that carries on considerably longer than you expect.' },

  { id: 'meatgrinder', name: 'Meat Grinder', cat: 'smg', lvl: 107, price: 144000000,
    atk: 440, def: 0, acc: 0.79, heal: 0, effect: null, stock: true,
    desc: 'Throws far more lead than it aims. Devastating right up until the day you get strong enough to notice how much of it goes nowhere.' },

  { id: 'closingargument', name: 'The Closing Argument', cat: 'smg', lvl: 125, price: 418000000,
    atk: 500, def: 0, acc: 0.86, heal: 0, effect: null, stock: true,
    desc: 'Delivered at length, at volume and without interruption. Nobody has ever asked for a rebuttal.' },


  /* ==========================================================
     RIFLE  (5)  levels 84 - 140
     The accurate end of the catalogue, 0.91 to 0.95.
     ========================================================== */

  { id: 'longgoodbye', name: 'The Long Goodbye', cat: 'rifle', lvl: 84, price: 29000000,
    atk: 252, def: 0, acc: 0.92, heal: 0, effect: null, stock: true,
    desc: 'Heavy barrel, folding bipod, and you are three streets away before the sound catches up with anybody.' },

  { id: 'steeplejack', name: 'Steeplejack', cat: 'rifle', lvl: 95, price: 63600000,
    atk: 300, def: 0, acc: 0.94, heal: 0, effect: null, stock: true,
    desc: 'Built for a man who works high up and takes his time. Comes apart into a toolbag in eleven seconds.' },

  { id: 'theactuary', name: 'The Actuary', cat: 'rifle', lvl: 108, price: 142000000,
    atk: 358, def: 0, acc: 0.91, heal: 0, effect: null, stock: true,
    desc: 'Works out the odds, states them plainly and collects on them. Boring, thorough and almost never wrong.' },

  { id: 'thousandyards', name: 'One Thousand Yards', cat: 'rifle', lvl: 122, price: 342000000,
    atk: 424, def: 0, acc: 0.95, heal: 0, effect: null, stock: true,
    desc: 'The old one was named for six hundred. Somebody got ambitious, and somebody else got unlucky at four hundred yards further out.' },

  { id: 'lastaddress', name: 'The Last Address', cat: 'rifle', lvl: 140, price: 892000000,
    atk: 512, def: 0, acc: 0.93, heal: 0, effect: null, stock: true,
    desc: 'Chambered for a cartridge they stopped making in 1958. There are eleven rounds left in the world and you own nine of them.' },


  /* ==========================================================
     HEAVY  (4)  levels 92 - 160
     Enormous numbers, 0.62 to 0.71 accuracy, and a price premium
     on top of both. The end of the catalogue.
     ========================================================== */

  { id: 'blastfurnace', name: 'The Blast Furnace', cat: 'heavy', lvl: 92, price: 68300000,
    atk: 500, def: 0, acc: 0.71, heal: 0, effect: null, stock: true,
    desc: 'Belt-fed and water-cooled, and the barrel will glow if you hold the trigger long enough. Somebody always does.' },

  { id: 'widowswalk', name: "Widow's Walk", cat: 'heavy', lvl: 110, price: 190000000,
    atk: 640, def: 0, acc: 0.62, heal: 0, effect: null, stock: true,
    desc: 'Lobs a shell the size of a milk bottle in a long lazy arc. Misses better than a third of the time, and the misses are still an event.' },

  { id: 'wreckingball', name: 'The Wrecking Ball', cat: 'heavy', lvl: 132, price: 695000000,
    atk: 748, def: 0, acc: 0.70, heal: 0, effect: null, stock: true,
    desc: 'Less a weapon than a piece of demolition plant that somebody fitted with a trigger and a shoulder strap.' },

  { id: 'reckoning', name: 'The Reckoning', cat: 'heavy', lvl: 160, price: 2460000000,
    atk: 900, def: 0, acc: 0.66, heal: 0, effect: null, stock: true,
    desc: 'Nobody will say where it came from and nobody has to. It arrives, it is used once, and the argument is settled permanently.' },


  /* ==========================================================
     ARMOR  (6)  levels 80 - 150
     def soaks damage. spd feeds your hit chance and your evasion
     both, so the plate is a trade every single rung.
     ========================================================== */

  { id: 'bankjobrig', name: 'Bank Job Rig', cat: 'armor', lvl: 80, price: 12500000,
    atk: 0, def: 296, spd: -10, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Plate front, plate back, plate down both arms. Built for ten minutes of standing very still in a marble lobby.' },

  { id: 'tailoredcomposite', name: 'Tailored Composite', cat: 'armor', lvl: 92, price: 40000000,
    atk: 0, def: 348, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Woven in a laboratory, cut by a tailor, and it weighs less than the jacket over it. You are paying for the nothing.' },

  { id: 'sappersharness', name: "Sapper's Harness", cat: 'armor', lvl: 105, price: 97800000,
    atk: 0, def: 412, spd: -15, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Collar, apron and groin flap, all of it rated for a bad afternoon. You will move like a piece of furniture.' },

  { id: 'confessional', name: 'The Confessional', cat: 'armor', lvl: 118, price: 284000000,
    atk: 0, def: 470, spd: -5, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Panels, padding and a high stiff collar, and whatever gets said to it stays inside.' },

  { id: 'sarcophagus', name: 'The Sarcophagus', cat: 'armor', lvl: 138, price: 883000000,
    atk: 0, def: 566, spd: -26, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Four hundred pounds of layered plate that two men bolt you into. Nothing gets through. Nothing much gets past you either.' },

  { id: 'cathedralplate', name: 'Cathedral Plate', cat: 'armor', lvl: 150, price: 1800000000,
    atk: 0, def: 620, spd: -9, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Articulated, mirror-finished, nine months of one man in one shed. You can hear yourself breathing inside it.' },


  /* ==========================================================
     MEDICAL  (4)
     heal is clamped at your maximum, so 100 is the ceiling and
     the Private Clinic Suite hit it at level 55. These are the
     same outcome at four escalating prices, which is the joke.
     ========================================================== */

  { id: 'ambulanceretainer', name: 'Ambulance on Retainer', cat: 'medical', lvl: 72, price: 1050000,
    atk: 0, def: 0, acc: 0, heal: 100, effect: null, stock: true,
    desc: 'Parked around the corner from wherever you happen to be, engine running and meter running. Gets you upright entirely, which is all anything does.' },

  { id: 'surgeonowes', name: 'The Surgeon Who Owes You', cat: 'medical', lvl: 92, price: 4000000,
    atk: 0, def: 0, acc: 0, heal: 100, effect: null, stock: true,
    desc: 'He lost badly at your table in 1981 and has been paying it back in sutures ever since. Same result as a roll of gauze, reached with far better lighting.' },

  { id: 'hospitalwing', name: 'A Wing With Your Name Off It', cat: 'medical', lvl: 115, price: 16000000,
    atk: 0, def: 0, acc: 0, heal: 100, effect: null, stock: true,
    desc: 'You funded the whole floor, they thanked you privately, and there is always a bed made up. Full recovery. So were the bandages.' },

  { id: 'standingorder', name: 'The Standing Order', cat: 'medical', lvl: 145, price: 77000000,
    atk: 0, def: 0, acc: 0, heal: 100, effect: null, stock: true,
    desc: 'Three specialists on salary, a helicopter on a roof and your blood type on ice in four cities. You will be completely fine. You were always going to be.' },


  /* ==========================================================
     BOOSTERS  (3)
     Amounts fill the bar at their unlock level and no further -
     30-items.js clamps the overflow and you would be paying for
     nothing. Still deliberately loss-making, same as the rest.
       energy +1 = 3 real minutes   brave +1 = 5   will +1 = 12
     ========================================================== */

  { id: 'vitaminshot', name: 'The Vitamin Shot', cat: 'booster', lvl: 66, price: 1850000,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'energy', amount: 150 }, stock: true,
    desc: 'Whatever is in the little brown bottle, it is not a vitamin. You will reorganise the entire garage at four in the morning.' },

  { id: 'cellarbottle', name: 'The Last Bottle in the Cellar', cat: 'booster', lvl: 82, price: 5700000,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'brave', amount: 30 }, stock: true,
    desc: 'Pre-war, dust an inch thick, and the man who laid it down laid it down for precisely this kind of evening.' },

  { id: 'sixweeks', name: 'Six Weeks in the Country', cat: 'booster', lvl: 96, price: 51000000,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'will', amount: 50 }, stock: true,
    desc: 'A farmhouse, a cook and no telephone. You come back with steady hands and the patience of a much younger man.' },


  /* ==========================================================
     DROPS  (4)
     Junk out of a beaten man's pockets. Worth nothing. Kept.
     ========================================================== */

  { id: 'cleaningticket', name: 'Dry-Cleaning Ticket, Six Weeks Old', cat: 'drop', lvl: 1, price: 1,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Two suits and a topcoat, still on the rail on Elizabeth Street. Somebody is about to get a bargain.' },

  { id: 'fallenhorse', name: 'Betting Slip on a Horse That Fell', cat: 'drop', lvl: 1, price: 2,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Fifty to win in the fourth. The horse made it as far as the turn and then it did not.' },

  { id: 'keytonothing', name: 'A Key That Fits Nothing You Own', cat: 'drop', lvl: 1, price: 3,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Brass, worn smooth, and stamped DO NOT DUPLICATE by somebody with a sense of humour.' },

  { id: 'matchbooknumber', name: 'Matchbook with a Number Inside', cat: 'drop', lvl: 1, price: 4,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'No name, just seven digits in blue biro. It rings a long time before anybody picks up, and then they hang up.' }

]);


/* ============================================================
   PROPERTIES
   ------------------------------------------------------------
   RESIDENCES continue the base table's two laws exactly.
     hp    = 0.52 * price^0.42, the same coefficient that runs
             from the Cold-Water Walk-Up to the Private Island.
     price growth per level keeps easing, and it never ticks up:
             1.0940 (60->71) -> 1.0833 -> 1.0702 -> 1.0573 -> 1.0445
     upkeep as a share of price per day keeps climbing the way it
             already was: 0.111% -> 0.128% -> 0.140% -> 0.153%,
             0.167%, 0.182%, 0.198%. A palace is a hole in the
             floor you pour money into, which is the point.

   BUSINESSES pay back in 8 to 20 real days at the level they
   unlock, and the payback keeps SLOPING UP, so the newsstand
   stays the fastest earner in the game and the hundred-billion
   holding is the slowest. Measured properly - income is per game
   hour, upkeep per game day:

       payback = price / (income * 24 - upkeep)

       Offshore Casino  (76, existing)   19.47 days
       Regional Airline (86)             19.61 days
       Shipping Line   (106)             19.75 days
       Private Bank    (130)             19.86 days
       Clearing House  (160)             19.95 days

   The daily nut stays a little over 40% of gross, drifting down
   from the base table's 42% the same way it has been drifting
   since the pool hall. Price growth per level eases 1.0905 ->
   1.0887 -> 1.0714 -> 1.0543 -> 1.0373.
   ============================================================ */

DATA.props = (DATA.props || []).concat([

  /* ---- RESIDENCES ---- */

  { id: 'borderRanch', name: 'Ranch on the Border', kind: 'home',
    lvl: 82, price: 2200000000, upkeep: 3360000, income: 0,
    hp: 4400, energyRegen: 53,
    desc: "Forty thousand acres, two countries, and a gate in the fence that is not on anybody else's map." },

  { id: 'canalPalazzo', name: 'Palazzo on the Canal', kind: 'home',
    lvl: 102, price: 8400000000, upkeep: 14030000, income: 0,
    hp: 7700, energyRegen: 62,
    desc: "Three hundred years of somebody else's family on the walls and your name on the deed at the bottom." },

  { id: 'mountainHouse', name: 'The Mountain House', kind: 'home',
    lvl: 125, price: 30000000000, upkeep: 54600000, income: 0,
    hp: 13100, energyRegen: 71,
    desc: 'You own the mountain, the road up it, and the man at the weather station who decides when the road is closed.' },

  { id: 'principality', name: 'The Principality', kind: 'home',
    lvl: 150, price: 90000000000, upkeep: 178200000, income: 0,
    hp: 20700, energyRegen: 80,
    desc: 'Eleven square miles, a flag, a currency and a seat at a table nobody can vote you off.' },


  /* ---- BUSINESSES ---- */

  { id: 'regionalAirline', name: 'Regional Airline', kind: 'biz',
    lvl: 86, price: 2800000000, upkeep: 101800000, income: 10190000,
    hp: 0, energyRegen: 0,
    desc: 'Forty aircraft, ninety routes and a cargo hold that nobody has ever inspected twice in the same week.' },

  { id: 'shippingLine', name: 'Merchant Shipping Line', kind: 'biz',
    lvl: 106, price: 11200000000, upkeep: 397400000, income: 40190000,
    hp: 0, energyRegen: 0,
    desc: 'Sixty hulls under four flags, and not one of those four countries answers a telephone after Friday lunch.' },

  { id: 'privateBank', name: 'Private Bank', kind: 'biz',
    lvl: 130, price: 40000000000, upkeep: 1389000000, income: 141800000,
    hp: 0, energyRegen: 0,
    desc: 'Marble lobby, brass letterbox, no sign, and a client list that fits comfortably on one index card.' },

  { id: 'clearingHouse', name: 'The Clearing House', kind: 'biz',
    lvl: 160, price: 120000000000, upkeep: 4077000000, income: 420500000,
    hp: 0, energyRegen: 0,
    desc: 'Every dollar on the continent passes through your ledger for a tenth of a second, and you keep the interest on that tenth.' }

]);


/* ============================================================
   GYMS  -  tiers ten through thirteen
   ------------------------------------------------------------
   Priced on MARGINAL value exactly like the base nine: what a
   rung costs per point it adds to your best-available multiplier
   across all four stats, given you already own everything below
   it. Membership is one-off and kept forever, so a gym you have
   outgrown is still free to walk back into - which is what makes
   a specialist worth buying at all.

     tier  lvl   price      pts added   $ per point   growth/lvl
       9    62   $45.8m        4.6        $9.96m        1.0879
      10    75   $155m         5.6        $27.7m        1.0812
      11    98   $1.28bn       8.6        $148.8m       1.0757
      12   122   $4.35bn       5.6        $776.8m       1.0713
      13   150   $38bn         8.2        $4.63bn       1.0655

   Best multiplier available if you own every gym up to tier N:
     tier    9     10     11     12     13
     str   7.6    9.0   13.4   13.4   14.6
     def   7.4    8.8    8.8   11.6   14.4
     spd   7.2    8.6    8.6   11.4   14.2
     dex   7.0    8.4   12.6   12.6   14.0
   Every rung moves at least two columns, so there is no dead
   tier. The Yard is the specialist: monstrous on Strength and
   Labour, teaches Guard and Agility not at all, and the tier
   above it is deliberately the exact complement.

   dex trains Labour, which is what a shift pays and what a truck
   load is worth.
   ============================================================ */

DATA.gym = (DATA.gym || []).concat([

  { id: 'theQuarry', name: 'The Quarry',
    lvl: 75, price: 155000000,
    str: 9, def: 8.8, spd: 8.6, dex: 8.4,
    desc: 'A working stone quarry with a bench in the cutting shed. You lift what the crane is too slow to be bothered with.' },

  { id: 'theYard', name: 'The Yard',
    lvl: 98, price: 1280000000,
    str: 13.4, def: 0, spd: 0, dex: 12.6,
    desc: 'No machines, no mirrors, no music. A pile of rocks, a pile of sandbags, and a man with a whistle who used to run a prison.' },

  { id: 'conservatory', name: 'The Conservatory',
    lvl: 122, price: 4350000000,
    str: 11.8, def: 11.6, spd: 11.4, dex: 11.2,
    desc: 'Glass roof, sprung floor, a fencing master, a swimming coach and one old man whose entire job is teaching you how to fall.' },

  { id: 'provingGround', name: 'The Proving Ground',
    lvl: 150, price: 38000000000,
    str: 14.6, def: 14.4, spd: 14.2, dex: 14,
    desc: 'Forty acres behind a wire fence with no name on the gate. There is no waiting list because there is nobody left to wait behind.' }

]);
