/* ============================================================
   16-data-features.js :: the two newer systems

   The level cap is gone, the crime sheet and the shop have been
   pushed out past level 160 by 14- and 15-, and the two systems
   the engine grew last were left with no content at all. This
   file fills them.

     DATA.oc         12  Organised Crime, levels 5 -> 140
     DATA.contracts   7  Notice Board kinds, 92 titles, 92 bodies,
                         and 83 lines of poster reaction
     DATA.news      +40  blotter lines for both, appended to the
                         crimeWin, flavor and milestone banks

   ------------------------------------------------------------
   ORGANISED CRIME  (44-oc.js)

   A family job. You fill every chair out of your own family, each
   chair rolls against one stat of the person sitting in it, and
   the job rolls on the crew. The engine is unforgiving about it:

     rolePass = 0.10 + 0.85 * (r / (r + 0.85)),  r = have / need
     chance   = product(rolePass) ^ 0.72
     the run then rolls each chair separately and forgives
     EXACTLY ONE slip, 45% of the time. Two and it comes apart.

   So a chair filled at exactly its `need` passes 56% of the time,
   at 2x need 70%, at 4x need 80%. Because the chairs multiply,
   an eight-hand job is a different animal to a two-hand job even
   when every man in it is over the bar.

     LEVELS      5 14 24 34 45 56 68 80 93 106 122 140. Twelve
                 rungs, none of them colliding, spread so that a
                 new job lands roughly every time the crime sheet
                 moves a tier.
     POT         $7,500 average at the bottom to $405M at the top.
                 The ratio EASES x3.00 -> x2.40 a rung, the same
                 way the property ladder and the crime sheet ease.
                 The engine splits the pot: you take
                 0.30 + 0.70/heads of it and the crew share the
                 rest, so the boss of an eight-hand job keeps 38%
                 and the boss of a two-hand job keeps 53%.
     COOLDOWN    4 hours to 96, x1.33 a rung. The number that
                 actually matters is POT PER COOLDOWN HOUR, and it
                 rises strictly, $1,875 -> $4.2M, so no job is ever
                 out-earned by the job below it. Nothing here is
                 dead on arrival.
     XP          65 average to 1,004,500, easing x2.64 -> x2.17.
                 XP climbs a shade slower than money, exactly as it
                 does across the crime tiers (money x4.2 a tier
                 against xp x3.4), so OC stays a money system with
                 experience attached and never becomes the fastest
                 way to level.
     JAIL        [120,600] seconds to [1600,4800], for everybody
                 on the crew and usually for you as well.

   THE `need` NUMBERS, which are the whole balance of the system.
   Each is solved as

       need = base(L) * avail(stat) * R(chair)

     base(L) = 50 * (L/5)^1.15    50 at level 5, 2,310 at 140
     avail   = str 1.00  def 0.95  spd 0.72  dex 0.66
     R       = 0.85 to 1.30, how demanding that chair is

   `avail` is measured, not invented. A 365-day run of the shipped
   build puts median Strength at 1,961 and the roster trains the
   four gym stats at weights 1.5 / 1.4 / 0.8 / 0.7, which under the
   gym's diminishing returns settles at roughly str : def : spd :
   dex = 1 : 0.96 : 0.71 : 0.66. Dividing it out means a Wheelman's
   number is always smaller than a Muscle's number and the two
   chairs are still the same difficulty to fill. It also means the
   Safecracker's number looks modest next to the Muscle's and is
   the harder chair to fill, because Labour is the stat the roster
   trains last.

   IQ IS DELIBERATELY NOT USED. The engine accepts it as a role
   stat, but nothing in the game trains an NPC's IQ - the roster is
   generated at 10 and stays at 10 forever (04-state makeNPC, and
   there is no npc equivalent of the school in 42-city). A chair
   gated on IQ would therefore not be a decision, it would be a
   flat multiplier on every job that had one. All 60 chairs roll
   against Strength, Guard, Agility or Labour, the four the gym
   actually moves.

   WHAT THAT FEELS LIKE. Against the measured roster, a crew of the
   best people in an average family passes the level-5 job about a
   third of the time, the middle of the table about half, and the
   Mint about one time in four. Every one of those numbers improves
   the moment the family starts training on purpose, which is the
   point of the system.

   ------------------------------------------------------------
   THE NOTICE BOARD  (46-contracts.js)

   Seven kinds of job the other two hundred post for each other and
   for you. `reward` is a multiplier band on the engine's own base
   rate, 1,200 * level^1.9, and `rep` is the opinion swing with the
   poster - a swing back down at 0.8x if you take the job and
   welch on it.

     hit      0.8-1.6   rep 8    the dangerous one
     mug      0.65-1.25 rep 6    the cheap one
     bail     0.5-1.0   rep 12   pays worst, buys the most goodwill
     fetch    0.6-1.2   rep 7    an errand with a reason behind it
     crime    0.5-1.1   rep 4    an audition
     gym      0.5-1.0   rep 4    somebody sponsoring your barbell
     protect  0.8-1.5   rep 10   the boring one, well paid

   Thirteen or fourteen titles and the same again in bodies for
   each kind, run through the poster's own typing voice by the
   50-npc style() function before any of it reaches the board,
   so the same line reads differently out of a fourteen year old
   and out of a man who writes like a solicitor. Titles are kept
   under 60 characters because 46-contracts clips them at 78.

   The four reaction banks - accept, done, failed, nudge - are
   shared across all seven kinds, so they use only the {me} slot.
   {target} is filled for every contract including the gym and
   crime ones, where it means nothing, so it is left out of them.
   ============================================================ */


DATA.oc = (DATA.oc || []).concat([

  { id: 'liquorstore', name: 'Turn Over a Liquor Store', lvl: 5, minCrew: 2,
    cut: [4000, 11000],
    xp: [40, 90],
    cooldownH: 4,
    jailS: [120, 600],
    roles: [
      { id: 'driver', name: 'Driver', stat: 'spd', need: 40, desc: 'Engine running, facing the right way.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 60, desc: 'Says nothing. Does not have to.' }
    ],
    brief: 'Two of you, one register, and the man behind it will hand it over if the big one just stands there. Be back before the ice melts.',
    ok: 'Ninety seconds door to door. The register was fuller than it looked and nobody so much as raised their voice.',
    fail: 'The owner banks at nine, the same as he has every night of his life, and neither of you thought to look at a clock.',
    caught: 'There is a squad car parked round the side of the building for the coffee, and it is still warm when the pair of you come out at a run.' },

  { id: 'armouredvan', name: 'Take an Armoured Van', lvl: 14, minCrew: 2,
    cut: [12000, 33000],
    xp: [106, 238],
    cooldownH: 6,
    jailS: [180, 780],
    roles: [
      { id: 'wheelman', name: 'Wheelman', stat: 'spd', need: 125, desc: 'Sits across the ramp with the handbrake off.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 190, desc: 'Meets the guard at the door and does not blink.' },
      { id: 'cutter', name: 'Cutter', stat: 'dex', need: 120, desc: 'Thirty seconds on the lock, and thirty is all he gets.' }
    ],
    brief: 'It stops at the same bank at the same hour every Tuesday and the door is open for forty seconds. Take the forty seconds off them.',
    ok: 'Four bags off the tail lift and away down the service road while the guard is still deciding whether any of this is his problem.',
    fail: 'The driver sees the van swing across and simply reverses the whole thing back up the ramp. Doors shut, nobody hurt, nobody paid.',
    caught: 'They put a second crew on that route this month, and the second crew were in the car behind you the entire way.' },

  { id: 'jewellers', name: 'Empty the Jewellers', lvl: 24, minCrew: 3,
    cut: [35500, 96500],
    xp: [275, 618],
    cooldownH: 8,
    jailS: [250, 980],
    roles: [
      { id: 'cutter', name: 'Cutter', stat: 'dex', need: 240, desc: 'Takes the case out clean and leaves the alarm loop whole.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 335, desc: 'Holds the room, and the room stays held.' },
      { id: 'driver', name: 'Driver', stat: 'spd', need: 210, desc: 'Double parked, engine running, one eye on each end of the street.' }
    ],
    brief: 'Ninety cases on that shop floor and only the front six are worth carrying. Take the front six and leave the rest for the insurance men.',
    ok: 'Under two minutes, six trays, and a pillowcase that goes out the door looking like laundry. The window is not even broken.',
    fail: 'The trays go into the floor safe at six and it is ten past. All that is left in the cases is the good lighting.',
    caught: 'The jeweller two doors down has been robbed twice this year and now watches the whole street like a hawk with a telephone.' },

  { id: 'bankbranch', name: 'Do a Bank Branch Properly', lvl: 34, minCrew: 3,
    cut: [102000, 279000],
    xp: [700, 1580],
    cooldownH: 10,
    jailS: [330, 1200],
    roles: [
      { id: 'safecracker', name: 'Safecracker', stat: 'dex', need: 360, desc: 'Listens to the dial while everybody else listens for sirens.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 525, desc: 'Stands at the counter and turns the whole room polite.' },
      { id: 'doorman', name: 'Doorman', stat: 'def', need: 430, desc: 'Keeps the customers coming in and nobody at all going out.' },
      { id: 'wheelman', name: 'Wheelman', stat: 'spd', need: 310, desc: 'Round the corner, facing the bridge, meter running.' }
    ],
    brief: 'Not the drawers. The drawers are pocket money. You go in at opening, you go through the manager, and you leave through the vault.',
    ok: 'In with the morning staff and out before the doors officially open, pushing a trolley the bank will spend all week arguing about.',
    fail: 'The vault is on a time lock nobody thought to ask about, and standing in front of it looking at your watch is not a plan.',
    caught: 'One of the tellers has a pedal under her knee and she has been waiting eleven years for a reason to use it.' },

  { id: 'countroom', name: 'Walk the Casino Count Room', lvl: 45, minCrew: 4,
    cut: [290000, 785000],
    xp: [1750, 3950],
    cooldownH: 13,
    jailS: [420, 1450],
    roles: [
      { id: 'counter', name: 'Counter', stat: 'dex', need: 495, desc: 'Adds faster than the machine does and never once looks up.' },
      { id: 'cleaner', name: 'Cleaner', stat: 'def', need: 625, desc: 'Wears the overalls, pushes the cart, takes whatever comes.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 690, desc: 'One man in that doorway is worth four anywhere else in the building.' },
      { id: 'wheelman', name: 'Wheelman', stat: 'spd', need: 405, desc: 'Parking structure, level two, nose out.' }
    ],
    brief: 'The drop comes off the floor at four in the morning and sits on a table in an unlocked room for eleven minutes. Be in the room.',
    ok: 'Two carts of banded notes out through the service corridor behind a man in overalls, and the pit boss is still finishing his sentence.',
    fail: 'They moved the count to five this week for the auditors, so all your crew finds at four is an empty table and a mop.',
    caught: 'There are eleven cameras on that corridor and a man upstairs whose entire job is to watch all eleven at once.' },

  { id: 'containeryard', name: 'Clear a Container Yard', lvl: 56, minCrew: 4,
    cut: [800000, 2170000],
    xp: [4300, 9700],
    cooldownH: 17,
    jailS: [530, 1750],
    roles: [
      { id: 'forger', name: 'Forger', stat: 'dex', need: 610, desc: 'Writes the seals and the seal numbers, and they match.' },
      { id: 'quartermaster', name: 'Quartermaster', stat: 'dex', need: 505, desc: 'Knows which box is worth lifting before anybody opens it.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 925, desc: 'Persuades the night gateman to take his break early.' },
      { id: 'gateman', name: 'Gate Man', stat: 'def', need: 765, desc: 'Stands in the gatehouse in the right shirt and waves the trucks through.' },
      { id: 'wheelman', name: 'Wheelman', stat: 'spd', need: 520, desc: 'Six trucks, one night, and all six leaving by different roads.' }
    ],
    brief: 'Nine hundred boxes on that hardstand and forty of them are worth more than the ship. Take the forty and leave the paperwork tidy.',
    ok: 'Six trucks out through a gate that logs every one of them, all six against numbers that were perfectly real until you wrote them down.',
    fail: 'The port goes over to electronic seals halfway through the shift, and your very fine paper ones stop matching anything on earth.',
    caught: 'A crane driver on overtime counts the trucks going out, gets a different number to the book, and does the responsible thing.' },

  { id: 'museum', name: 'Take the Museum Off the Wall', lvl: 68, minCrew: 5,
    cut: [2160000, 5850000],
    xp: [10400, 23300],
    cooldownH: 22,
    jailS: [650, 2100],
    roles: [
      { id: 'alarmman', name: 'Alarm Man', stat: 'dex', need: 830, desc: 'Bridges the loop and keeps it humming while the wall goes empty.' },
      { id: 'cutter', name: 'Cutter', stat: 'dex', need: 695, desc: 'Takes a canvas out of a frame the way a barber takes a fringe.' },
      { id: 'ropeman', name: 'Rope Man', stat: 'spd', need: 795, desc: 'Comes down through the roof lights and never touches the floor.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 1055, desc: 'Carries what four men would carry, and carries it quietly.' },
      { id: 'cleaner', name: 'Cleaner', stat: 'def', need: 905, desc: 'Walks the night guard round the long way for twenty minutes.' }
    ],
    brief: 'Eleven paintings, one skylight, and a night guard who walks the same round at the same speed every night of his life. Use his round.',
    ok: 'Eleven frames left hanging with nothing in them, which the morning staff do not notice for forty minutes, because at dawn that is how museums look.',
    fail: 'Case seven turns out to be bolted through the wall into the beam, and your crew has the sense to leave it there and go home.',
    caught: 'There is a seismic pad under the parquet in the long gallery, and it has been quietly screaming since the first man landed.' },

  { id: 'goldvault', name: 'Empty a Gold Vault', lvl: 80, minCrew: 5,
    cut: [5700000, 15450000],
    xp: [24500, 55100],
    cooldownH: 29,
    jailS: [790, 2500],
    roles: [
      { id: 'safecracker', name: 'Safecracker', stat: 'dex', need: 1000, desc: 'Two doors, one dial, and a wall the plans swore was concrete.' },
      { id: 'chemist', name: 'Chemist', stat: 'dex', need: 840, desc: 'Mixes something that eats a hinge and smells like a swimming pool.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 1450, desc: 'Bullion is heavy. Somebody in the crew has to be heavier.' },
      { id: 'bagman', name: 'Bagman', stat: 'def', need: 1205, desc: 'Carries the load out and takes the corner if the corner comes.' },
      { id: 'wheelman', name: 'Wheelman', stat: 'spd', need: 830, desc: 'Two axles, four tonnes, and a bridge with a weight limit on it.' },
      { id: 'lookout', name: 'Lookout', stat: 'spd', need: 740, desc: 'Sits on the roof opposite with a flask and a radio.' }
    ],
    brief: 'Gold is heavy, boring and impossible to hide, so they guard the ledger far harder than they guard the loading bay. You are going in the loading bay.',
    ok: 'Fourteen pallets, one bay, and a truck riding so low on its springs that the whole crew walks the last mile behind it out of respect.',
    fail: 'The pallets come in over the rating of the truck and the rear axle folds in the bay. Gold does not care how clever anybody is.',
    caught: 'Every vehicle is weighed going in and weighed coming out, and there is no conversation on earth that talks around the difference.' },

  { id: 'privatebank', name: 'Turn Over a Private Bank', lvl: 93, minCrew: 6,
    cut: [14700000, 39800000],
    xp: [56700, 127500],
    cooldownH: 38,
    jailS: [950, 2950],
    roles: [
      { id: 'forger', name: 'Forger', stat: 'dex', need: 1190, desc: 'Produces a letter of introduction that a partner will read twice and believe.' },
      { id: 'safecracker', name: 'Safecracker', stat: 'dex', need: 1045, desc: 'The boxes in that basement are older than the bank and open like books.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 1655, desc: 'Nobody in a building like this has ever been shouted at. Fix that.' },
      { id: 'doorman', name: 'Doorman', stat: 'def', need: 1435, desc: 'Stands at the street door being a commissionaire until it is time not to be.' },
      { id: 'wheelman', name: 'Wheelman', stat: 'spd', need: 985, desc: 'A grey saloon on a private square, indicating properly.' },
      { id: 'cleaner', name: 'Cleaner', stat: 'def', need: 1230, desc: 'Walks out last, with the visitor book under his coat.' }
    ],
    brief: 'No queue, no tellers, no sign on the street. Eleven clients, one partner in a very good suit, and a basement nobody has audited since the war.',
    ok: 'You are shown into the sitting room and offered coffee, and by the time the coffee arrives there is nobody left in the building who can say what has gone.',
    fail: 'The partner reads the letter twice, smiles, and asks you to wait a moment. The whole crew is out on the pavement before the moment ends.',
    caught: 'Private banks keep private security, and two of them stood behind your crew the entire time anybody was signing the visitor book.' },

  { id: 'stadiumgate', name: 'Take the Stadium Gate', lvl: 106, minCrew: 6,
    cut: [37100000, 100400000],
    xp: [128000, 289000],
    cooldownH: 50,
    jailS: [1130, 3450],
    roles: [
      { id: 'counter', name: 'Counter', stat: 'dex', need: 1325, desc: 'Two hundred windows, four hours, one man holding the total in his head.' },
      { id: 'quartermaster', name: 'Quartermaster', stat: 'dex', need: 1105, desc: 'Knows which tunnel the bags come down and in what order.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 2010, desc: 'Eighty thousand people is a great deal of cover and a great many witnesses.' },
      { id: 'gateman', name: 'Gate Man', stat: 'def', need: 1750, desc: 'Wears the yellow jacket and owns turnstile bank C for the evening.' },
      { id: 'cleaner', name: 'Cleaner', stat: 'def', need: 1510, desc: 'Follows the receipts down with a bin liner and a whistle.' },
      { id: 'wheelman', name: 'Wheelman', stat: 'spd', need: 1205, desc: 'Waits in the coach park with the engine running and the radio on.' },
      { id: 'runner', name: 'Runner', stat: 'spd', need: 1025, desc: 'Moves the bags two hundred yards through a crowd going the other way.' }
    ],
    brief: 'Eighty thousand paying customers, four hours of cash through two hundred windows, and every camera in the building pointed at the grass.',
    ok: "The bags go down the players' tunnel with the stewards, into a laundry cage, and out with the kit. Nobody in that stadium looks anywhere but the pitch.",
    fail: 'They armour the gate take this season and run it out at half time in a van full of towels, which is annoyingly clever of them.',
    caught: 'The tunnels get their own police detail on a night like this, and those men are profoundly bored right up until they see your crew.' },

  { id: 'freightterminal', name: 'Own the Freight Terminal', lvl: 122, minCrew: 7,
    cut: [91200000, 246800000],
    xp: [285000, 641000],
    cooldownH: 70,
    jailS: [1340, 4050],
    roles: [
      { id: 'forger', name: 'Forger', stat: 'dex', need: 1625, desc: 'Writes a shift roster, an airway bill and a customs release, all before lunch.' },
      { id: 'alarmman', name: 'Alarm Man', stat: 'dex', need: 1430, desc: 'Puts the fence line to sleep for six hours without anybody losing a light.' },
      { id: 'quartermaster', name: 'Quartermaster', stat: 'dex', need: 1235, desc: 'Four hundred consignments, and he can name the nine worth taking.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 2265, desc: 'The night supervisor is going to have a very quiet evening indeed.' },
      { id: 'cleaner', name: 'Cleaner', stat: 'def', need: 1965, desc: 'Signs for everything under the name of a man who retired in 1988.' },
      { id: 'driver', name: 'Driver', stat: 'spd', need: 1420, desc: 'Drives a baggage tug across an active apron as though he has done it for years.' },
      { id: 'lookout', name: 'Lookout', stat: 'spd', need: 1205, desc: 'Counts the inbounds and calls it the second the count is wrong.' }
    ],
    brief: 'Not a pallet and not a plane. The whole terminal, for six hours, running off a shift roster one of your own men wrote and signed.',
    ok: 'Six hours of a building that belongs to you, four hundred consignments deep, and by the time the real shift arrives the paperwork says it was always like this.',
    fail: 'Fog stacks the inbounds and by two in the morning there are three times as many people in that building as your roster ever allowed for.',
    caught: 'Air freight turns federal the second it crosses the fence, and the men who came through the door carried badges from three different agencies.' },

  { id: 'themint', name: 'Take the Mint', lvl: 140, minCrew: 8,
    cut: [219000000, 592000000],
    xp: [618000, 1391000],
    cooldownH: 96,
    jailS: [1600, 4800],
    roles: [
      { id: 'forger', name: 'Forger', stat: 'dex', need: 1980, desc: 'The plates are the job. Everything else in this building is transport.' },
      { id: 'safecracker', name: 'Safecracker', stat: 'dex', need: 1755, desc: 'Three doors, and the third has never once been opened by anybody from outside.' },
      { id: 'chemist', name: 'Chemist', stat: 'dex', need: 1525, desc: 'Turns a hardened hinge into something you can put a thumb through.' },
      { id: 'muscle', name: 'Muscle', stat: 'str', need: 2890, desc: 'Two tonnes of pallets and a stairwell that was never designed for this.' },
      { id: 'bagman', name: 'Bagman', stat: 'def', need: 2525, desc: 'Carries the run out in banded bricks and does not put it down for anyone.' },
      { id: 'doorman', name: 'Doorman', stat: 'def', need: 2195, desc: 'Holds the north gate for eleven minutes against whoever turns up.' },
      { id: 'wheelman', name: 'Wheelman', stat: 'spd', need: 1745, desc: 'Three trucks, three routes, three sets of plates and one bridge.' },
      { id: 'runner', name: 'Runner', stat: 'spd', need: 1495, desc: 'Carries word between the floors, because nobody in there trusts a radio.' }
    ],
    brief: "The plates, the paper and one night's run, out of a building the government does not believe can be robbed. Bring everybody. Bring the whole family.",
    ok: 'By dawn there are three trucks in three states, a set of plates in a hatbox, and a building full of people who cannot agree on what happened to them.',
    fail: 'The run is short, the plates are in a different wing to the one the drawings promised, and the crew walks out with a hatbox full of nothing at all.',
    caught: 'You get eleven minutes, which is nine more than anybody has ever had, and then the entire world arrives at once through every door in the place.' }

]);


DATA.contracts = {

  kinds: [
    { id: 'hit', name: 'Put somebody down', verb: 'Hospitalise {target}',
      desc: 'Somebody wants a name in a hospital bed and does not want their own name anywhere near it.',
      reward: [0.8, 1.6], rep: 8 },

    { id: 'mug', name: 'Take money off somebody', verb: 'Roll {target} for what he is carrying',
      desc: 'Not a beating. A lesson in banking, delivered in the street.',
      reward: [0.65, 1.25], rep: 6 },

    { id: 'bail', name: 'Get somebody out', verb: 'Spring {target} from a cell',
      desc: 'Bail him or bust him, nobody minds which. Pays the least and buys the most goodwill on the board.',
      reward: [0.5, 1.0], rep: 12 },

    { id: 'fetch', name: 'Get hold of something', verb: 'Buy a {item} and hand it over',
      desc: 'A piece somebody wants and cannot be seen buying. You buy it. They take it off you in a bar.',
      reward: [0.6, 1.2], rep: 7 },

    { id: 'crime', name: 'Show me you can work', verb: 'Pull off {n} crimes',
      desc: 'An audition, and the money is real whether or not the chair at the end of it is.',
      reward: [0.5, 1.1], rep: 4 },

    { id: 'gym', name: 'Put the hours in', verb: 'Put {n} points on the bar',
      desc: 'Somebody paying a stranger to go and lift things. There is always a reason, and it is usually next month.',
      reward: [0.5, 1.0], rep: 4 },

    { id: 'protect', name: 'Keep somebody standing', verb: 'Keep {target} out of hospital for {n} hours',
      desc: 'The boring one. Stand near a name, be seen standing near it, and get paid for a night of nothing.',
      reward: [0.8, 1.5], rep: 10 }
  ],

  titles: {

    hit: [
      'Somebody needs to put {target} down',
      'PAYING WELL - {target} needs a hospital bed',
      'anyone free to hit {target}?',
      'Wanted: one beating, professionally delivered',
      '{target} has been camping my crew all week',
      'I will pay {amount} for {target} in a hospital bed',
      'this is not a joke i want {target} hurt',
      'Contract on {target}. No questions, no chat, no bragging.',
      'looking for someone bigger than me lol',
      '{target} took my rung. {target} gives it back.',
      'easy {amount} if you can actually fight',
      'need {target} off the ladder for one hour thats all',
      'Open contract on {target}, first one done gets paid',
      'somebody hospitalize {target} im begging here'
    ],

    mug: [
      'Take {target} for whatever he is carrying',
      'he owes me. go and get it off him.',
      'Roll {target} and keep half of it',
      'somebody empty {target}s pockets',
      '{target} is walking round with a fortune on him',
      'PAYING FOR A MUG. NOT A KILL. A MUG.',
      'need {target} broke by tonight',
      'Simple job for somebody who can count',
      'he wont bank it. he never banks it.',
      'Take the money off {target}. I want him poor, not hurt.',
      'easy money, hes carrying about {amount}',
      'first person to mug {target} gets paid twice',
      'anyone want {amount} for two minutes work'
    ],

    bail: [
      'Get {target} out, I will cover whatever it costs',
      'my underboss is in a cell and im not allowed to touch it',
      'PLEASE somebody bust {target} out',
      'Bail wanted for {target}, paying over the odds',
      'need {target} out before the war starts',
      'hes in for {n} more minutes and we need him NOW',
      'Bust him, do not bail him. I want it to look good.',
      'somebody with will to spare?',
      '{target} is inside again. Third time this week.',
      'Will pay {amount} for one jailbreak',
      'i cant afford the bail but i can afford u',
      'Getting {target} out is worth more than it costs',
      'urgent, {family} business, {target} is inside'
    ],

    fetch: [
      'Need a {item}. Cannot be seen buying one.',
      'paying over shop price for a {item}',
      'WTB {item}, will pay {amount}',
      'somebody get me a {item} pls',
      'A {item}, delivered, and no chat about it afterwards',
      'cant travel rn, need a {item} brought to me',
      'Looking for a {item} and a discreet person',
      'my account is watched. buy this for me.',
      'Anyone in {city} holding a spare {item}?',
      '{amount} for a {item} in my hand tonight',
      'i need a {item} and i need it b4 he logs on',
      'Simple errand, generous fee, no risk at all',
      'Buy me a {item}. Do not ask what it is for.'
    ],

    crime: [
      'Show me you can actually work',
      'need {n} crimes done, dont care which ones',
      'Recruiting. Prove it first.',
      '{family} is hiring. Small test.',
      'paying u to do crimes lol easiest money on the board',
      'Anybody grinding tonight? Get paid for it.',
      'Do {n} jobs and I will pay you for them twice',
      'want to see ur crime log before i trust u',
      'Simple: {n} crimes. Then we talk properly.',
      'my crew wont grind so im paying strangers to',
      'THE BOARD IS FULL OF TALKERS. THIS IS FOR WORKERS.',
      'Free money for something you were doing anyway',
      'need someone active. very active. worryingly active.'
    ],

    gym: [
      'Put the hours in and I will pay for them',
      'someone please train, this city has gone soft',
      'I am sponsoring one person. Could be you.',
      'get {n} points on a stat, get paid',
      'PAYING PEOPLE TO GO TO THE GYM',
      'my crew is weak and it is embarrassing',
      'Gym money. No fighting, no crimes, no risk.',
      'Train up. I want somebody worth beating.',
      'free money for lifting a barbell',
      'Looking to back somebody who actually trains',
      'the easiest {amount} on this whole board',
      'need a bigger sparring partner. building one.',
      'Stat check. Come back when the number has moved.'
    ],

    protect: [
      'Keep {target} out of hospital for {n} hours',
      'need a bodyguard for my little brother',
      'DO NOT LET THEM TOUCH {target}',
      'Babysitting job. Well paid. Extremely boring.',
      'somebody watch {target} while im at work',
      'Paying for {target} to stay standing up',
      'if {target} goes down tonight the deal is off',
      'shield {target} pls he cant defend himself yet',
      'Keep him upright until the round flips',
      'One night. {target}. Nobody touches him.',
      'my whole family is riding on {target} not getting hit',
      'need eyes on {target} for a few hours',
      'Insurance job, {amount}, easy if nobody notices'
    ]
  },

  bodies: {

    hit: [
      '{target} has hit me eleven times since Sunday.\n\nI do not care how it is done. I care when.\n\n{amount} on delivery, and I have never once welched.',
      'hes in {city} rite now and hes on about half health\n\nsomeone go\n\nGO',
      'Straightforward job. Put {target} in a hospital bed and post here when it is done.\nPayment the same evening. I have been on this board four years and my word is the only thing I own.',
      'listen i kno {amount} isnt much but its everything i got\n\n{target} keeps taking my crime money and i cant train fast enough to stop him',
      'I want {target} to know that somebody paid for it. That is half of what I am buying.\n\nTell him a family name. Not mine. Say {family} and let him worry.',
      'ANYONE. ANYONE AT ALL.\n\n{target} HAS RUINED MY ENTIRE WEEK\n\nI WILL PAY {amount} AND I WILL SAY NICE THINGS ABOUT U IN SHOUTBOX FOREVER',
      'One hospital visit. {target}. Tonight if it can be done tonight.\n\nI am good for {amount}. Ask {other}, I paid him last month without being chased for it.',
      'he thinks nobody in {city} will touch him because of who hes with\n\nprove him wrong and ill make it worth ur while',
      'Not a revenge thing. Purely business. {target} is standing between {family} and a rung we want.\n\n{amount}. Half up front if you insist, though I would rather not.',
      'plz i been in the hospital four times today\n\n{target}\n\n{amount} is all i have i swear on my account',
      'You will need a real weapon for this one. He is not soft and he does not stay down.\n\nDo not take it if you are going to lose, because then he knows somebody is paying and the price goes up for everybody.',
      'i already paid {other} to do this and he took the money and did nothing\n\nso now im paying twice\n\ndont be like {other}',
      'Terms: hospital, not jail. Jail does nothing for me.\n\n{amount} on confirmation. I read the news feed every ten minutes so please do not tell me stories.',
      'hit {target}\n\nget {amount}\n\nthats the whole post'
    ],

    mug: [
      '{target} carries everything in his pocket because he does not trust the bank. He has said so out loud, in shoutbox, more than once.\n\nGo and be the lesson.',
      'i dont want the money i want him to feel it\n\nkeep whatever u take AND ill pay u {amount} on top of it',
      'He owes {family} three weeks of protection and will not answer his mail.\n\nTake it off him in the street. It is cheaper than the alternative and he knows that too.',
      'hes online rite now\n\nGO GO GO',
      'Do not hospitalise him. I need him walking around broke where people can see it.\n\n{amount} the moment it shows up in the feed.',
      'ok so this is my first time posting on the board so idk if im doing it right\n\nbut {target} took basically everything i had and id like some of it back\n\nis {amount} enough? i can do a bit more maybe',
      'Straight mug. Nothing personal in it. I simply need his cash number down before the round ends.\n\nI pay on the day. Ask anybody who has worked for me.',
      'he keeps bragging in shoutbox about how much hes sitting on\n\nso\n\nu know\n\ngo and look',
      'Take it off {target} and I will double whatever the mug pays, out of my own pocket.\nI am not asking you to like me. I am asking you to do a job.',
      'THIS IS THE THIRD TIME I HAVE POSTED THIS\n\nWHY WILL NOBODY MUG {target}\n\nIS EVERY SINGLE PERSON IN {city} SCARED OF HIM',
      'quiet one. no shoutbox, no bragging, no telling {other}.\n\nmoney lands the same night it is done.',
      'my brother in law plays this game and he reckons {target} is loaded\n\nhe might be lying, he lies about most things\n\nbut if hes not youll do very well out of it',
      'Roll him. Keep the cash. My fee is {amount} and it is for the inconvenience to him, not the profit to me.'
    ],

    bail: [
      '{target} went down on a job for {family} and we do not leave people in there.\n\nBail him, bust him, I genuinely do not mind which. {amount} either way.',
      'i would do it myself but i got no will left and i been awake since four in the morning\n\nplz',
      'He is our best fighter and there is a war on. Every minute he sits in that cell is a rung.\n\n{amount}, and {family} owes you a favour on top, which is worth considerably more than the {amount}.',
      'HE IS IN THERE BECAUSE OF ME\n\nI TOLD HIM THE JOB WAS SAFE\n\nGET HIM OUT AND I WILL PAY WHATEVER YOU WANT',
      'Bail is money and money is nothing. Do it the quick way if you can.\n\nPays {amount}. I am online another hour and then I am asleep, so post here and not in shoutbox.',
      'busting is better than bailing cuz the bail money goes to the city and i hate the city',
      'One jailbreak. {target}. He has about {n} minutes left on the clock, so there is no rush, but there is no glory in waiting either.',
      'im new and i dont really understand how busting works yet\n\nbut my friend {target} is in jail and hes sad about it\n\nis this what the board is for',
      'Do not bail him. I want the news feed to say that somebody broke him out. Half of what I am paying for is the headline.',
      'he is my brother in this game and in the other one\n\nget him out\n\n{amount}',
      'Standard rate for a bust, paid the moment the news line prints. I have posted forty of these and paid out on forty of them.',
      'if u fail u go in there with him and thats on u not me. read the risk before u click the button.',
      '{target} is in a cell.\n\nGet him out.\n\n{amount}, and I will remember it.'
    ],

    fetch: [
      'I want a {item} and I do not want my name on the receipt.\n\nBuy it, hand it over, take {amount} for your trouble. Everybody wins and nobody remembers.',
      'the shop in my city dont stock it and i cant afford the flight this week\n\nhelp a guy out',
      'One {item}. Any condition, I am not fussy and I am not haggling.\n\n{amount}, paid the second it changes hands.',
      'ITS FOR A SURPRISE\n\nDONT TELL {other}\n\nI AM SERIOUS DO NOT TELL HIM',
      'I have the money. What I do not have is a clean account.\n\nYou buy the {item}, I take it off you for {amount}, and if anybody ever asks, you sold a stranger a thing in a bar.',
      'need it before tonight. after tonight i dont need it at all and i wont pay for it. be quick.',
      'a {item} pls. i tried to buy one myself but i clicked the wrong button and bought a hat instead\n\ndont laugh im learning',
      'Standard fetch. One {item}. The fee is {amount} over the market and I round up, never down.\n\nI have done sixty of these. Ask {other} about me.',
      'my whole family is buying these this week so if u see two of these posts thats why\n\n{family} is gearing up for something and thats all im saying',
      'Do not hand it to me in {city}. Somewhere else. I will tell you where once you have taken the job.',
      'im not gonna lie to u its for hitting {other} with\n\nstill want the job?',
      'A {item}, in my hands, before the round ends. That is the entire brief and there is nothing hidden in it.\n\nI pay {amount}, and I will pay first if you would rather have it that way.',
      'ill throw in {n} points on top if ur quick about it'
    ],

    crime: [
      '{family} does not take people on a handshake. Do {n} crimes, come back here, and we will have a proper conversation about a chair.',
      'i just want to see if ur a real person or one of those accounts that logs in once a week\n\ndo {n} crimes and ill pay u {amount}',
      'You were going to spend the Brave anyway. This way somebody pays you for it.\n\n{n} of them. Any tier. I am not going to check which ones.',
      'im writing a guide for the forum and i need numbers\n\nsomeone do {n} crimes and tell me how many failed\n\nthe {amount} is for ur time not the data',
      'DO. THE. CRIMES.\n\n{n} OF THEM.\n\nTHEN COME BACK AND I WILL SING YOUR PRAISES IN SHOUTBOX FOR AN HOUR',
      'Straightforward. {n} successful crimes, {amount} on completion.\nI post one of these most weeks and I have never once argued about a payout.',
      'my son plays this game and he says nobody does crimes anymore, everyone just fights\n\nprove him wrong\n\n{amount}',
      'The city has been quiet and quiet is bad for {family}. Make some noise. {n} jobs, anywhere you like, tonight.',
      'not a test. i genuinely just enjoy watching the news feed fill up.\n\n{n} crimes. {amount}. go nuts.',
      'If you are new, take this one. It pays properly and it teaches you the loop.\n\n{n} crimes, then click claim. That is the whole of it.',
      'do {n} crimes\n\nno u cant do jobs instead, i checked, the board counts crimes and only crimes',
      'Consider it an audition. {other} took the same job off me last month and he is an underboss now.\nNo promises. But I remember who works.',
      '{n} crimes. {amount}. And if you make it look easy I will have something considerably bigger for you.'
    ],

    gym: [
      'I have watched you log in and do nothing but crimes for a month. Go and train.\n\n{amount} when the number moves. This is a gift and I think you know it.',
      'im trying to build up the whole family not just me\n\n{family} pays for gym time now. thats a real policy, i wrote it in the motd and everything',
      'Zero risk. No jail, no hospital, no drama. Put {n} on a stat and take {amount} off me.\n\nThere is a catch and the catch is that it is boring.',
      'THE ONLY REASON ANY OF U EVER LOSE IS BECAUSE U DONT TRAIN\n\nGO\n\nTRAIN\n\nILL PAY FOR IT',
      'Sponsorship, and I mean it properly. I will fund the sets if you will do them.\n\nCome back when it has moved and I will fund the next lot as well.',
      'i want to fight someone good and theres nobody good left in {city}\n\nso im making one\n\nthat could be u',
      'This is not charity. When you are big I am going to ask you for a favour, and I would like you to remember this post when I do.',
      'idk if this is even allowed on the board but im paying for gym sets\n\nmy old family used to do it and it seemed like a nice thing',
      'Move the number. Any of them. I will check the profile page myself.\n\n{amount}, and I round up if you overshoot.',
      'youll spend the energy anyway. might as well have {amount} for it.',
      'Everybody in {family} trains or everybody in {family} loses. That is the entire arrangement and it has held for two rounds now.',
      'i been at the gym since six this morning and im lonely\n\ncome and do sets with me\n\nill pay {amount}, its fine, i have loads',
      'Put the work in. Come back. Get paid. Then do it again without being paid, which is the actual lesson.'
    ],

    protect: [
      '{target} is one rung off something that matters to {family} and half of {city} knows it.\n\nKeep him standing {n} hours. Hit anybody who tries it. {amount} at the end.',
      'hes my little brother in real life and hes twelve and he cries\n\nplz just watch him for a bit\n\nill pay',
      'I do not need you to fight anybody. I need you to be visible, standing next to him, so that nobody bothers.\n\nThat is what the money is for.',
      'IF {target} GOES INTO THE HOSPITAL TONIGHT I AM QUITTING THIS GAME I SWEAR ON EVERYTHING',
      'Simple minding job, {n} hours. If he takes a bed the contract is void and neither of us is happy about it.\n\n{amount} if he is still walking at the end of it.',
      '{other} has been threatening him in shoutbox all week and I think {other} means it this time.',
      'im going to sleep and hes going to do something stupid the second i do\n\nstop him\n\nor at least be nearby when he does it',
      'He is carrying something for {family} and he cannot be hospitalised while he has it. That is all I am going to say on the subject.',
      'watch him. thats it. thats the job. {amount}.',
      'The trick is not guarding him, it is making people believe he is guarded. Say something in shoutbox. Be seen near him.\n\nWorks nine times in ten.',
      'i already lost two crew this week and i cannot lose another one\n\nplz\n\n{n} hours thats all im asking',
      'You will get bored. That is the job. Bored and paid is a good night in this city.',
      'If he goes down I will know inside a minute, because I watch that feed like a hawk. Do not take this one unless you mean it.'
    ]
  },

  accept: [
    'ok {me} is on it. dont let me down',
    'Good. I will be watching the feed, {me}.',
    'THANK YOU {me} SERIOUSLY THANK YOU',
    '{me} took it. finally somebody with a spine',
    'nice one {me}. moneys sitting right here waiting.',
    'i hope u kno what ur doing {me}, this one isnt as easy as it looks',
    'Appreciated, {me}. Take your time and do it properly.',
    'lol {me} took my job. this should be interesting',
    '{me} ur my favourite person on this board right now',
    'about time. {me} is on it.',
    'dont tell anybody it was me who posted that. seriously.',
    'ok ok ok its actually happening. {me} is doing it.',
    'You have my word on the payment, {me}. I have never stiffed anybody yet.',
    'good luck {me}, youll need it if im honest',
    'if {me} pulls this off im buying the whole shoutbox a round',
    'somebody finally took it. {me}. remember that name.',
    'i was about to take it down. good timing {me}.',
    'Understood. Post here when it is done, not in the shoutbox.',
    '{me} dont mess this up. i mean it.',
    'oh thank god. {me} thank u thank u thank u',
    'Noted, {me}. The clock is yours from here.',
    'welcome aboard {me}. sort of. temporarily.'
  ],

  done: [
    'nice work {me}, sending it now',
    'Paid. Pleasure doing business, {me}.',
    'HAHAHA I SAW IT ON THE FEED. {me} YOU BEAUTIFUL MANIAC',
    'thats what i like to see. money sent {me}',
    'good. that is exactly what I asked for. paying now.',
    '{me} came through. everybody take note of that.',
    'quick as well. ill be posting more if ur interested {me}',
    'Payment sent, and a favour owed. Do not forget the second part.',
    'ok that was worth every penny of it',
    'u actually did it lol. i had no faith. sorry. money sent.',
    '{me} is the only person on this board who does what they say',
    'Done and settled. I will look for your name next time.',
    'im telling everyone i know about u {me}',
    'thats the job. thats exactly the job. thank u',
    'Money is with you, {me}. Spend it on something loud.',
    'thats sorted then, and about time. money sent.',
    'flawless. genuinely. paid in full, {me}.',
    'thx {me} ur a legend',
    'Settled. If anybody ever asks whether I pay, send them to me.',
    'took u long enough but ur paid',
    'sent. and a little extra on top, because that was clean.',
    'first person on this board to actually finish one of mine. {me}. respect.'
  ],

  failed: [
    '{me} took my job and did nothing. remember that',
    'Noted. I will not be posting anything else you can see, {me}.',
    'SO THATS HOW IT IS THEN {me}',
    'wow. wow. ok. cool. thanks {me}.',
    'i knew it. i actually knew it the second u took it.',
    'Contract dropped. That is fine. It is remembered, but it is fine.',
    'everyone in shoutbox needs to know what {me} just did',
    'thats twice now. no, ur right, i should stop counting.',
    'dont bother taking my jobs again {me}',
    'It was not a hard job. That is the part that stings.',
    'u had one thing to do',
    'sat on it all day and handed it back. classic.',
    'Fine. Somebody else will. Somebody always does.',
    'and i was nice to u in shoutbox and everything',
    'ADDING {me} TO THE LIST. THE LIST IS LONG BUT IT IS ACCURATE.',
    'no hard feelings. genuinely. but no more jobs either.',
    'Disappointing. I had you down as reliable, {me}.',
    'lol ok. next.',
    'thats my whole night wasted waiting on {me}',
    'i would rather u never took it than took it and quit',
    'Right. Reposting. Somebody with a spine can have it.',
    'thats the last time i post anything worth having'
  ],

  nudge: [
    'any progress on that job {me}?',
    'not rushing u. just checking. slightly rushing u.',
    'IS IT DONE. IS IT DONE YET.',
    'Any word, {me}? The money is still sitting here.',
    'hey. hey. {me}. hey.',
    'im not gonna keep asking, but i am gonna keep asking',
    'still on it or should i repost',
    'A gentle reminder, nothing more than that.',
    'my whole plan is waiting on this one thing',
    'u still alive {me}?',
    'clock is going. no pressure. clock is going tho.',
    'If you have changed your mind that is fine, just tell me.',
    'been checking the feed all night and nothing',
    'sorry to mail u again. its been a while tho.',
    'i can pay more if thats the hold up. can u tell me if thats the hold up.',
    'Two hours left in my evening, {me}, and then I am asleep and unreachable.',
    'this is the last time im asking and then im just going to be quiet and disappointed'
  ]
};


/* ------------------------------------------------------------
   DATA.news :: forty more blotter lines for the two systems.

   ORDER OF LOADING. The build concatenates src/js in filename
   order, so this file runs BEFORE 24-data-news.js, and that file
   opens with a plain "DATA.news = { ... }" which would wipe a
   straight append made from here. Rather than quietly lose the
   lines, the banks below are merged through a property accessor:
   whenever anything assigns DATA.news, the new object gets these
   lines folded into the right banks on its way in. Objects that
   have already been merged are remembered by identity, so
   45-normalize doing "DATA.news = DATA.news || {}" cannot double
   them up, and the merge works whichever order the two files end
   up loading in.

     crimeWin  +20  organised crime crews, slots {who} {family}
                    {amount} {other} {n} {city}
     flavor    +14  ambient notice board colour
     milestone  +6  contracts finished, slots {who} {other}
                    {amount} {n}
   ------------------------------------------------------------ */

(function () {

  var extra = {

    crimeWin: [
      '{family} put {n} men on one door in {city} and came away with {amount}.',
      'Organised, rehearsed and out in four minutes. {family} is up {amount}.',
      '{who} sat a crew down, ran it, and split {amount} {n} ways.',
      'Whatever {family} pulled in {city} last night, the insurers are calling it {amount}.',
      '{n} of them went in. {n} came out. {amount} did not.',
      '{who} called it, {other} drove it, and {family} banked {amount}.',
      'A whole crew working {city} and not one of them left a name behind. {amount}.',
      'They had a man inside, a man on the roof and a man on the ramp. {family} took {amount}.',
      '{family} has not run a job that clean in a year. {amount}, and no arrests.',
      'Somebody in {family} did the arithmetic properly for once. {amount}.',
      '{who} put the word out, {n} turned up, and the take was {amount}.',
      'The alarm was still ringing when {family} finished counting the {amount}.',
      'Word out of {city}: a crew, a truck, and {amount} gone before the shift changed.',
      '{family} ran a job with {n} on the crew and every single one of them held.',
      '{other} says he was only the lookout. {other} is {amount} richer than he was.',
      'The whole thing took nine minutes. {family} is {amount} better off for it.',
      '{who} put a crew together out of nothing at all and it paid {amount}.',
      'Nobody in {city} heard a thing. {family} is quietly {amount} up.',
      'A job that size usually falls apart. {family} made {amount} out of it instead.',
      'Crew work out of {city} again. {family}, {amount}, and not one arrest.'
    ],

    flavor: [
      'Somebody pinned a job to the notice board in {city} and took it down an hour later.',
      'The board is full of work tonight and empty of anybody willing to do it.',
      'Three contracts went up on the board this morning. All three are for the same name.',
      '{who} posted a job, {other} took it, and neither of them has been seen since.',
      'Somebody is offering silly money on the board for a very small favour. Read it twice.',
      'A contract came off the board unclaimed for the fourth day running.',
      'There is a posting on the board in {city} with no name and no price. Just an address.',
      'Word is {who} has stopped paying out on board jobs. Word gets around fast.',
      'Two people took the same contract and are now arguing about which of them gets paid.',
      'Somebody welched on a board job in {city} and the entire shoutbox knows about it.',
      'The notice board has been wiped clean overnight and nobody is saying by whom.',
      'A posting on the board just says you know what you did. It has been up three days.',
      'Everybody on the board wants the same thing done and nobody wants to be the one to do it.',
      'Somebody is paying strangers for gym time again. There is always a reason.'
    ],

    milestone: [
      '{who} has now finished {n} jobs off the notice board.',
      'Contract number {n} for {who}. {other} paid up without being asked twice.',
      '{who} cleared another board job and took {amount} for it.',
      '{who} has taken work off {n} different people and finished every one of them.',
      '{other} says {who} is the only name on the board worth hiring.',
      '{n} contracts settled. {who} is becoming a habit for people with problems.'
    ]
  };

  var seen = [];

  function merge(base) {
    if (!base) base = {};
    for (var s = 0; s < seen.length; s++) if (seen[s] === base) return base;
    seen.push(base);
    for (var k in extra) {
      if (!extra.hasOwnProperty(k)) continue;
      base[k] = (base[k] || []).concat(extra[k]);
    }
    return base;
  }

  var store = DATA.news;

  if (Object.defineProperty) {
    try {
      Object.defineProperty(DATA, 'news', {
        configurable: true,
        enumerable: true,
        get: function () { return store; },
        set: function (v) { store = merge(v); }
      });
      if (store) store = merge(store);
      return;
    } catch (e) { /* very old engine: fall through to the plain append */ }
  }

  DATA.news = merge(DATA.news);
})();
