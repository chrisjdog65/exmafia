/* ============================================================
   12-data-items.js :: the item catalogue
   ------------------------------------------------------------
   124 items. exMafia advertised "over 100 different in-game
   items" on the MySpace app page, so 124 it is.

   Categories
     melee pistol smg rifle heavy   weapons  (atk + acc)
     armor                          gear     (def, sometimes spd)
     medical                        heal %
     booster                        refills a resource pool
     drop                           junk looted off beaten players
     trophy                         prestige only, price 0

   THE PRICE CURVE
   Shop prices are solved against the crime table, not against the
   weapon's raw numbers. For a weapon w unlocking at level L:

       price(w) = D(L) * power(w, L) * income(L)

   where power is the engine's expected damage per swing

       power = (str*0.115 + atk*1.45 + 2) * acc            (31-combat)

   income(L) is what a player at level L earns in a day off the best
   crime plus the best job, and D(L) is the "deal" - how many days of
   income one point of power costs. D falls smoothly and strictly,
   0.00270 at level 1 down to 0.00132 at level 85, so every rung up
   the shop is better value than the rung below it and the top of
   the catalogue is never a rip-off. Runs $201 (Broken Bottle) to
   $40,000,000 (Last Rites). Armor is priced the same way against
   def instead of power, $60 to $8,000,000, D 0.00233 -> 0.00136.

   NOTHING IS DOMINATED. Price is a strictly increasing function of
   a weapon's value at zero Strength, so for every one of the 80 shop
   weapons there is a Strength at which it is the most power you can
   buy for the money - no dead tiers, no trap purchases.

   WHY SHAPE MATTERS (see 31-combat.js)
     damage = (str*0.115 + atk*1.45 + 2) * soak
     hit    = base * acc
   Accuracy multiplies the WHOLE damage line, including the part
   that comes from your Strength, so a high-atk / low-acc weapon is
   worth most to a LOW-Strength account and loses ground as you
   train. That is the trade the heavy line is selling: the Stovepipe
   (221 atk / 0.55) beats the Six Hundred Yards (152 / 0.94) until
   your Strength passes roughly 1,700, and never again after.

   ARMOR trades def against speed. Speed feeds both your own hit
   chance and your evasion, so a spd:-8 Iron Suit is a real
   decision and not a free upgrade.

   MEDICAL is priced at roughly two hours of level-L income for
   the best kit you can carry, because what you are really buying
   is hospital time you do not have to sit through.

   BOOSTERS are deliberately loss-making. Every one of them costs
   more than the resource it hands back can earn at the level it
   unlocks, so they stay a convenience and never become a money
   printer. (The Lucky Rabbit's Foot is pure superstition - the
   engine has nothing called 'happy' and that is the joke.)
   ============================================================ */

DATA.items = [

  /* ==========================================================
     MELEE  (18)
     Cheap, accurate, available early, and hard-capped low. The
     budget line: a melee weapon is never the best thing at your
     level, it is the best thing you can afford at your level.
     ========================================================== */

  { id: 'brokenbottle', name: 'Broken Bottle', cat: 'melee', lvl: 1, price: 201,
    atk: 3, def: 0, acc: 0.86, heal: 0, effect: null, stock: true,
    desc: 'Free with every beer. The trick is remembering which end to hold.' },

  { id: 'leadpipe', name: 'Lead Pipe', cat: 'melee', lvl: 1, price: 379,
    atk: 4, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'Eighteen inches of plumbing that never made it to a building site.' },

  { id: 'ashbat', name: 'Ash Bat', cat: 'melee', lvl: 2, price: 649,
    atk: 5, def: 0, acc: 0.90, heal: 0, effect: null, stock: true,
    desc: 'Thirty-four ounces of honest lumber. Nobody can prove you were not going to a game.' },

  { id: 'brassknuckles', name: 'Brass Knuckles', cat: 'melee', lvl: 3, price: 1010,
    atk: 6, def: 0, acc: 0.92, heal: 0, effect: null, stock: true,
    desc: 'Four rings of cold steel. Simple, and it never jams.' },

  { id: 'tireiron', name: 'Tire Iron', cat: 'melee', lvl: 4, price: 1260,
    atk: 7, def: 0, acc: 0.90, heal: 0, effect: null, stock: true,
    desc: 'Lives in the trunk with the jack and a very convincing shrug.' },

  { id: 'switchblade', name: 'Switchblade', cat: 'melee', lvl: 6, price: 1950,
    atk: 9, def: 0, acc: 0.93, heal: 0, effect: null, stock: true,
    desc: 'Pearl handle, six-inch temper. The click alone settles most arguments.' },

  { id: 'bikechain', name: 'Bike Chain', cat: 'melee', lvl: 7, price: 2070,
    atk: 10, def: 0, acc: 0.86, heal: 0, effect: null, stock: true,
    desc: 'Wrapped twice round the fist and greased black. It goes where it likes.' },

  { id: 'crowbar', name: 'Crowbar', cat: 'melee', lvl: 9, price: 3470,
    atk: 11, def: 0, acc: 0.89, heal: 0, effect: null, stock: true,
    desc: 'Opens doors, windows, cash drawers and the occasional discussion.' },

  { id: 'hatchet', name: 'Hatchet', cat: 'melee', lvl: 11, price: 4780,
    atk: 13, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'Fits under a jacket. Comes out looking a lot bigger than it went in.' },

  { id: 'clawhammer', name: 'Claw Hammer', cat: 'melee', lvl: 13, price: 7030,
    atk: 14, def: 0, acc: 0.90, heal: 0, effect: null, stock: true,
    desc: 'Two useful ends and a perfectly innocent explanation for both.' },

  { id: 'butcherknife', name: "Butcher's Knife", cat: 'melee', lvl: 15, price: 12100,
    atk: 16, def: 0, acc: 0.92, heal: 0, effect: null, stock: true,
    desc: 'Borrowed from the back of the salumeria and never once mentioned again.' },

  { id: 'nailbat', name: 'Nail Bat', cat: 'melee', lvl: 18, price: 23100,
    atk: 21, def: 0, acc: 0.84, heal: 0, effect: null, stock: true,
    desc: 'Somebody spent a whole afternoon improving a perfectly good bat. It shows.' },

  { id: 'machete', name: 'Machete', cat: 'melee', lvl: 21, price: 32200,
    atk: 22, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'Two feet of cane-field steel, and there is no cane within a thousand miles.' },

  { id: 'sledgehammer', name: 'Sledgehammer', cat: 'melee', lvl: 24, price: 47400,
    atk: 30, def: 0, acc: 0.76, heal: 0, effect: null, stock: true,
    desc: 'Slow as a Sunday. Connects about three times in four, and those three count.' },

  { id: 'cleaver', name: 'Meat Cleaver', cat: 'melee', lvl: 28, price: 77600,
    atk: 31, def: 0, acc: 0.90, heal: 0, effect: null, stock: true,
    desc: 'Heavy at the front, balanced at the back, and it has never met a bone it respected.' },

  { id: 'sabre', name: 'Ceremonial Sabre', cat: 'melee', lvl: 32, price: 134000,
    atk: 36, def: 0, acc: 0.91, heal: 0, effect: null, stock: true,
    desc: 'Off the wall of a veterans hall. Nobody there is going to file a report.' },

  { id: 'icepick', name: 'Ice Pick', cat: 'melee', lvl: 37, price: 244000,
    atk: 41, def: 0, acc: 0.97, heal: 0, effect: null, stock: true,
    desc: 'Six ounces, one point, and it lands practically every time. The purists swear by it.' },

  { id: 'persuader', name: 'The Persuader', cat: 'melee', lvl: 43, price: 441000,
    atk: 53, def: 0, acc: 0.93, heal: 0, effect: null, stock: true,
    desc: 'A pipe, a roll of tape and forty years of institutional knowledge. Ends conversations.' },

  /* ==========================================================
     PISTOL  (20)
     The all-rounder line. Revolvers are accurate and honest,
     automatics trade a little of that for weight of fire.
     ========================================================== */

  { id: 'zipgun', name: 'Zip Gun', cat: 'pistol', lvl: 2, price: 349,
    atk: 5, def: 0, acc: 0.72, heal: 0, effect: null, stock: true,
    desc: 'A car aerial, a rubber band and a prayer. Fires once, maybe.' },

  { id: 'satnight', name: 'Saturday Night Special', cat: 'pistol', lvl: 3, price: 608,
    atk: 6, def: 0, acc: 0.76, heal: 0, effect: null, stock: true,
    desc: 'Twelve dollars of pot metal that shoots a little to the left of wherever you point it.' },

  { id: 'snubnose', name: 'Snubnose .38', cat: 'pistol', lvl: 5, price: 1520,
    atk: 8, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'Five shots, no hammer to snag, and it disappears into a coat pocket.' },

  { id: 'pocketauto', name: 'Pocket Auto', cat: 'pistol', lvl: 7, price: 1660,
    atk: 9, def: 0, acc: 0.84, heal: 0, effect: null, stock: true,
    desc: 'Flat as a wallet and about as accurate past ten feet. Nobody frisks a wallet.' },

  { id: 'servicerev', name: 'Service Revolver', cat: 'pistol', lvl: 9, price: 2520,
    atk: 10, def: 0, acc: 0.90, heal: 0, effect: null, stock: true,
    desc: 'Somebody retired, and somebody else forgot to hand this in.' },

  { id: 'armysidearm', name: 'Army Sidearm', cat: 'pistol', lvl: 11, price: 3940,
    atk: 12, def: 0, acc: 0.87, heal: 0, effect: null, stock: true,
    desc: 'Came home in a duffel bag with two medals and a very quiet man.' },

  { id: 'nickelplate', name: 'Nickel-Plated .45', cat: 'pistol', lvl: 13, price: 6700,
    atk: 14, def: 0, acc: 0.89, heal: 0, effect: null, stock: true,
    desc: 'Shines like a hubcap. Half the point of carrying it is being seen carrying it.' },

  { id: 'longbarrel', name: 'Long Barrel .357', cat: 'pistol', lvl: 16, price: 11600,
    atk: 16, def: 0, acc: 0.91, heal: 0, effect: null, stock: true,
    desc: 'Six inches of barrel buys you six inches of accuracy and a coat that hangs wrong.' },

  { id: 'ninemil', name: 'Nine Millimetre', cat: 'pistol', lvl: 18, price: 18200,
    atk: 19, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'Fifteen in the magazine and one in the pipe. The workhorse of the whole block.' },

  { id: 'targetpistol', name: 'Target Pistol', cat: 'pistol', lvl: 20, price: 28200,
    atk: 19, def: 0, acc: 0.96, heal: 0, effect: null, stock: true,
    desc: 'Built for paper at fifty yards. Hits whatever you look at, which is the whole idea.' },

  { id: 'huntingmag', name: 'Hunting Magnum', cat: 'pistol', lvl: 23, price: 41600,
    atk: 25, def: 0, acc: 0.86, heal: 0, effect: null, stock: true,
    desc: 'Sold to men who hunt bear. Bought by men who do not.' },

  { id: 'doubleaction', name: 'Double-Action .44', cat: 'pistol', lvl: 26, price: 62200,
    atk: 28, def: 0, acc: 0.90, heal: 0, effect: null, stock: true,
    desc: 'A wrist-breaker with a trigger like a church door. Worth every ounce.' },

  { id: 'machinepistol', name: 'Machine Pistol', cat: 'pistol', lvl: 29, price: 84300,
    atk: 35, def: 0, acc: 0.82, heal: 0, effect: null, stock: true,
    desc: 'Empties itself in under two seconds and climbs the whole time. Terrifying to be near.' },

  { id: 'silenced', name: 'Silenced Automatic', cat: 'pistol', lvl: 32, price: 137000,
    atk: 35, def: 0, acc: 0.94, heal: 0, effect: null, stock: true,
    desc: 'Screws on in three turns and turns a bang into a cough. Steady as a bench rest.' },

  { id: 'handcannon', name: 'Hand Cannon', cat: 'pistol', lvl: 36, price: 220000,
    atk: 46, def: 0, acc: 0.84, heal: 0, effect: null, stock: true,
    desc: 'Weighs four pounds loaded and kicks like a mule with opinions.' },

  { id: 'goldplated', name: 'Gold-Plated Automatic', cat: 'pistol', lvl: 39, price: 293000,
    atk: 47, def: 0, acc: 0.92, heal: 0, effect: null, stock: true,
    desc: 'Vulgar, impractical, and everyone in the room notices it. Which is the point.' },

  { id: 'bigbore', name: 'Big Bore Magnum', cat: 'pistol', lvl: 43, price: 455000,
    atk: 56, def: 0, acc: 0.89, heal: 0, effect: null, stock: true,
    desc: 'A cylinder you could park a car in. Five rounds, and five is plenty.' },

  { id: 'matchpistol', name: 'Competition Match Pistol', cat: 'pistol', lvl: 47, price: 706000,
    atk: 58, def: 0, acc: 0.99, heal: 0, effect: null, stock: true,
    desc: 'Hand-fitted by a Swiss man who would faint if he knew where it ended up. It does not miss.' },

  { id: 'twinnickels', name: 'Twin Nickels', cat: 'pistol', lvl: 52, price: 1260000,
    atk: 80, def: 0, acc: 0.87, heal: 0, effect: null, stock: true,
    desc: 'A matched pair in a shoulder rig. Twice the noise, twice the theatre, twice the price.' },

  { id: 'widowmaker', name: 'The Widowmaker', cat: 'pistol', lvl: 58, price: 2390000,
    atk: 102, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'One of nine ever built, and the man who built them stopped taking orders in 1974.' },

  /* ==========================================================
     SMG  (16)
     Volume of fire. Low accuracy, high raw numbers, and the
     damage arrives in lumps. Two exceptions with glass in them.
     ========================================================== */

  { id: 'greasegun', name: 'Grease Gun', cat: 'smg', lvl: 8, price: 1940,
    atk: 12, def: 0, acc: 0.72, heal: 0, effect: null, stock: true,
    desc: 'Stamped out of sheet metal in about nine minutes. Looks like a tool, works like one.' },

  { id: 'chopper', name: 'Chopper', cat: 'smg', lvl: 11, price: 3740,
    atk: 14, def: 0, acc: 0.74, heal: 0, effect: null, stock: true,
    desc: 'Wood furniture and a stick magazine. Grandpa had one and grandpa was busy.' },

  { id: 'burpgun', name: 'Burp Gun', cat: 'smg', lvl: 14, price: 8450,
    atk: 18, def: 0, acc: 0.75, heal: 0, effect: null, stock: true,
    desc: 'Cycles so fast the whole magazine leaves in one long rude noise.' },

  { id: 'spraycan', name: 'Spray Can', cat: 'smg', lvl: 17, price: 13100,
    atk: 21, def: 0, acc: 0.73, heal: 0, effect: null, stock: true,
    desc: 'Point it in the general direction and redecorate. Aiming is optional and mostly ignored.' },

  { id: 'roombroom', name: 'Room Broom', cat: 'smg', lvl: 20, price: 26300,
    atk: 24, def: 0, acc: 0.76, heal: 0, effect: null, stock: true,
    desc: 'Clears a room the way a broom clears a floor: quickly, and not very neatly.' },

  { id: 'typewriter', name: 'Typewriter', cat: 'smg', lvl: 23, price: 42700,
    atk: 28, def: 0, acc: 0.78, heal: 0, effect: null, stock: true,
    desc: 'Rattles out a page a second and everybody in the neighbourhood reads it.' },

  { id: 'buzzsaw', name: 'Buzzsaw', cat: 'smg', lvl: 26, price: 60300,
    atk: 33, def: 0, acc: 0.76, heal: 0, effect: null, stock: true,
    desc: 'A rate of fire nobody asked for attached to a grip nobody can hold on to.' },

  { id: 'drumchopper', name: 'Drum Chopper', cat: 'smg', lvl: 29, price: 85100,
    atk: 36, def: 0, acc: 0.80, heal: 0, effect: null, stock: true,
    desc: 'Fifty rounds in a drum the size of a dinner plate. Heavy going in, light coming out.' },

  { id: 'sidewalksweep', name: 'Sidewalk Sweeper', cat: 'smg', lvl: 33, price: 154000,
    atk: 43, def: 0, acc: 0.80, heal: 0, effect: null, stock: true,
    desc: 'Fits under a folded newspaper if the newspaper is a Sunday edition.' },

  { id: 'bullethose', name: 'Bullet Hose', cat: 'smg', lvl: 37, price: 234000,
    atk: 50, def: 0, acc: 0.79, heal: 0, effect: null, stock: true,
    desc: 'Somebody welded a second barrel shroud on for the look. It did not need it.' },

  { id: 'whisperbox', name: 'Whisper Box', cat: 'smg', lvl: 41, price: 381000,
    atk: 48, def: 0, acc: 0.96, heal: 0, effect: null, stock: true,
    desc: 'Integrally suppressed, wire stock, and a bolt that barely moves. Deadly polite.' },

  { id: 'alleycleaner', name: 'Alley Cleaner', cat: 'smg', lvl: 45, price: 542000,
    atk: 60, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'Short, tight and unfashionably accurate for something that empties this fast.' },

  { id: 'rattlesnake', name: 'Rattlesnake', cat: 'smg', lvl: 49, price: 875000,
    atk: 71, def: 0, acc: 0.87, heal: 0, effect: null, stock: true,
    desc: 'Gives one warning burst and then stops warning people.' },

  { id: 'hornetsnest', name: "Hornet's Nest", cat: 'smg', lvl: 54, price: 1580000,
    atk: 87, def: 0, acc: 0.87, heal: 0, effect: null, stock: true,
    desc: 'Twin magazines taped back to back and a reload you can do in the dark.' },

  { id: 'sewingmachine', name: 'The Sewing Machine', cat: 'smg', lvl: 59, price: 2500000,
    atk: 111, def: 0, acc: 0.85, heal: 0, effect: null, stock: true,
    desc: 'Stitches a straight line across anything in front of it. Hems included.' },

  { id: 'lastword', name: 'The Last Word', cat: 'smg', lvl: 64, price: 4440000,
    atk: 132, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'Custom built for a man who liked to finish sentences. It always finishes his.' },

  /* ==========================================================
     RIFLE  (16)
     Range and reach. Starts as ugly shotguns, ends as the most
     accurate heavy hitters in the game.
     ========================================================== */

  { id: 'sawnoff', name: 'Sawn-Off', cat: 'rifle', lvl: 12, price: 4360,
    atk: 16, def: 0, acc: 0.70, heal: 0, effect: null, stock: true,
    desc: 'A perfectly good field gun with two feet hacked off it by somebody in a hurry.' },

  { id: 'pumpgun', name: 'Pump Gun', cat: 'rifle', lvl: 15, price: 9710,
    atk: 19, def: 0, acc: 0.74, heal: 0, effect: null, stock: true,
    desc: 'The sound of the slide going back has cleared more rooms than the shells ever have.' },

  { id: 'huntingrifle', name: 'Hunting Rifle', cat: 'rifle', lvl: 18, price: 16800,
    atk: 19, def: 0, acc: 0.86, heal: 0, effect: null, stock: true,
    desc: 'Walnut stock, worn sling, deer camp sticker. Utterly, boringly legal to own.' },

  { id: 'leveraction', name: 'Lever Action', cat: 'rifle', lvl: 21, price: 32800,
    atk: 23, def: 0, acc: 0.85, heal: 0, effect: null, stock: true,
    desc: 'A hundred years out of date and still hits what it is pointed at.' },

  { id: 'carbine', name: 'Paratrooper Carbine', cat: 'rifle', lvl: 25, price: 53500,
    atk: 28, def: 0, acc: 0.85, heal: 0, effect: null, stock: true,
    desc: 'Folding stock, light as a shopping bag, and it fits behind the seat of a sedan.' },

  { id: 'boltaction', name: 'Bolt Action', cat: 'rifle', lvl: 28, price: 73700,
    atk: 31, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'One shot at a time, which sharpens the mind considerably.' },

  { id: 'combatshotgun', name: 'Combat Shotgun', cat: 'rifle', lvl: 32, price: 132000,
    atk: 42, def: 0, acc: 0.78, heal: 0, effect: null, stock: true,
    desc: 'Eight in the tube, heat shield on the barrel, and no pretence about deer whatsoever.' },

  { id: 'assaultrifle', name: 'Assault Rifle', cat: 'rifle', lvl: 36, price: 222000,
    atk: 45, def: 0, acc: 0.86, heal: 0, effect: null, stock: true,
    desc: 'Came off a container ship in a crate marked TRACTOR PARTS.' },

  { id: 'marksman', name: 'Marksman Rifle', cat: 'rifle', lvl: 40, price: 322000,
    atk: 49, def: 0, acc: 0.92, heal: 0, effect: null, stock: true,
    desc: 'Glass on top, bipod underneath, and a trigger you have to be invited to touch.' },

  { id: 'battlerifle', name: 'Battle Rifle', cat: 'rifle', lvl: 44, price: 488000,
    atk: 58, def: 0, acc: 0.88, heal: 0, effect: null, stock: true,
    desc: 'Full-power cartridge, wooden furniture, and a recoil that rearranges your dental work.' },

  { id: 'scopedmag', name: 'Scoped Magnum Rifle', cat: 'rifle', lvl: 48, price: 778000,
    atk: 66, def: 0, acc: 0.90, heal: 0, effect: null, stock: true,
    desc: 'Built for elk at four hundred yards. Used for men at forty, which feels excessive.' },

  { id: 'nightscope', name: 'Night Scope Rifle', cat: 'rifle', lvl: 53, price: 1390000,
    atk: 78, def: 0, acc: 0.92, heal: 0, effect: null, stock: true,
    desc: 'Turns two in the morning into a slightly green afternoon.' },

  { id: 'elephantgun', name: 'Elephant Gun', cat: 'rifle', lvl: 58, price: 2360000,
    atk: 109, def: 0, acc: 0.82, heal: 0, effect: null, stock: true,
    desc: 'Two barrels, brass the size of cigars, and a kick that puts you on the floor with him.' },

  { id: 'theghost', name: 'The Ghost', cat: 'rifle', lvl: 63, price: 4220000,
    atk: 124, def: 0, acc: 0.90, heal: 0, effect: null, stock: true,
    desc: 'Matte black, no serial, no receipt, no witnesses. Comes in a violin case that fools nobody.' },

  { id: 'sixhundred', name: 'Six Hundred Yards', cat: 'rifle', lvl: 69, price: 7880000,
    atk: 152, def: 0, acc: 0.94, heal: 0, effect: null, stock: true,
    desc: 'Named for the distance at which the previous owner stopped being a problem.' },

  { id: 'kingmaker', name: 'The Kingmaker', cat: 'rifle', lvl: 76, price: 21200000,
    atk: 209, def: 0, acc: 0.93, heal: 0, effect: null, stock: true,
    desc: 'Three families changed hands because of this rifle, and it has never once been fired twice.' },

  /* ==========================================================
     HEAVY  (10)
     Enormous numbers, terrible accuracy, and a price premium on
     top. When one connects the fight is usually over.
     ========================================================== */

  { id: 'streetsweeper', name: 'Street Sweeper', cat: 'heavy', lvl: 30, price: 103000,
    atk: 45, def: 0, acc: 0.68, heal: 0, effect: null, stock: true,
    desc: 'A twelve-round drum on a shotgun frame. Winds up like a clock and unwinds like a riot.' },

  { id: 'riotgun', name: 'Riot Gun', cat: 'heavy', lvl: 35, price: 200000,
    atk: 53, def: 0, acc: 0.71, heal: 0, effect: null, stock: true,
    desc: 'Municipal property, municipal weight, and absolutely no municipal paperwork.' },

  { id: 'thepig', name: 'The Pig', cat: 'heavy', lvl: 41, price: 364000,
    atk: 70, def: 0, acc: 0.66, heal: 0, effect: null, stock: true,
    desc: 'Twenty-three pounds of belt-fed bad idea. You do not carry it, you commit to it.' },

  { id: 'beltfed', name: 'Belt-Fed Chopper', cat: 'heavy', lvl: 47, price: 690000,
    atk: 82, def: 0, acc: 0.70, heal: 0, effect: null, stock: true,
    desc: 'Needs a second man to feed it and a third man to explain it to the neighbours.' },

  { id: 'thumper', name: 'Thumper', cat: 'heavy', lvl: 53, price: 1370000,
    atk: 124, def: 0, acc: 0.58, heal: 0, effect: null, stock: true,
    desc: 'Lobs one fat round in a lazy arc. Misses more than half the time and nobody cares.' },

  { id: 'theanvil', name: 'The Anvil', cat: 'heavy', lvl: 59, price: 2470000,
    atk: 128, def: 0, acc: 0.73, heal: 0, effect: null, stock: true,
    desc: 'Bolted to a tripod because the alternative was bolting it to a man.' },

  { id: 'stovepipe', name: 'Stovepipe', cat: 'heavy', lvl: 65, price: 4980000,
    atk: 221, def: 0, acc: 0.55, heal: 0, effect: null, stock: true,
    desc: 'One tube, one shot, one very short conversation. Hits about half the time. Half is enough.' },

  { id: 'carousel', name: 'The Carousel', cat: 'heavy', lvl: 71, price: 10500000,
    atk: 230, def: 0, acc: 0.68, heal: 0, effect: null, stock: true,
    desc: 'Six barrels on a spinning hub. Takes a second to wind up and then time stops meaning much.' },

  { id: 'thefoundry', name: 'The Foundry', cat: 'heavy', lvl: 78, price: 23700000,
    atk: 280, def: 0, acc: 0.75, heal: 0, effect: null, stock: true,
    desc: 'Came off a boat, off a truck, off a ship of the line before that. Shoots something like a hubcap.' },

  { id: 'lastrites', name: 'Last Rites', cat: 'heavy', lvl: 85, price: 40000000,
    atk: 420, def: 0, acc: 0.72, heal: 0, effect: null, stock: true,
    desc: 'Nobody agrees on what it started life as. Everybody agrees on what it is for now.' },

  /* ==========================================================
     ARMOR  (20)
     def soaks damage. Anything with plate in it costs you Speed,
     which feeds your hit chance and your evasion both, so the
     heavy suits are a trade and not a straight upgrade.
     ========================================================== */

  { id: 'leatherjacket', name: 'Leather Jacket', cat: 'armor', lvl: 1, price: 60,
    atk: 0, def: 2, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Second hand, third owner, and it has already survived worse than you.' },

  { id: 'paddedvest', name: 'Padded Vest', cat: 'armor', lvl: 2, price: 108,
    atk: 0, def: 3, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Quilted nylon off a moving-crew rack. Stops a bad night from becoming a worse one.' },

  { id: 'thickovercoat', name: 'Thick Overcoat', cat: 'armor', lvl: 3, price: 214,
    atk: 0, def: 5, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Heavy wool, deep pockets, and it hides absolutely everything you own.' },

  { id: 'bikeleathers', name: 'Motorcycle Leathers', cat: 'armor', lvl: 5, price: 375,
    atk: 0, def: 8, spd: -1, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Armoured at the elbows and shoulders. Squeaks when you walk, which is not ideal.' },

  { id: 'chainvest', name: 'Chain Vest', cat: 'armor', lvl: 7, price: 582,
    atk: 0, def: 11, spd: -2, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'A butcher wore this to keep his fingers. You have other plans for it.' },

  { id: 'ballisticinsert', name: 'Ballistic Insert', cat: 'armor', lvl: 9, price: 880,
    atk: 0, def: 13, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'A single soft panel that slides into any jacket lining. Nobody can tell.' },

  { id: 'flakjacket', name: 'Flak Jacket', cat: 'armor', lvl: 11, price: 1270,
    atk: 0, def: 16, spd: -2, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Army surplus, smells of canvas and mothballs, and it is stiffer than a Sunday collar.' },

  { id: 'bulletproofvest', name: 'Bulletproof Vest', cat: 'armor', lvl: 13, price: 1800,
    atk: 0, def: 18, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Soft armour with a wrap-around cummerbund. Hot in July, priceless in December.' },

  { id: 'concealcarrier', name: 'Concealed Carrier', cat: 'armor', lvl: 16, price: 3250,
    atk: 0, def: 21, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Cut to sit under a dress shirt. You can wear it to a wedding, and people do.' },

  { id: 'steelplatevest', name: 'Steel Plate Vest', cat: 'armor', lvl: 19, price: 6280,
    atk: 0, def: 27, spd: -3, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Two slabs of hardened steel in canvas pockets. You will feel every stair.' },

  { id: 'tacticalcarrier', name: 'Tactical Carrier', cat: 'armor', lvl: 22, price: 8130,
    atk: 0, def: 29, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Adjustable everywhere, pouches for days, and it actually fits, which is the expensive part.' },

  { id: 'riotvest', name: 'Riot Vest', cat: 'armor', lvl: 26, price: 17500,
    atk: 0, def: 38, spd: -3, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Padded shoulders, padded spine, and a collar that makes turning your head a project.' },

  { id: 'bombapron', name: 'Bomb Squad Apron', cat: 'armor', lvl: 30, price: 27800,
    atk: 0, def: 47, spd: -6, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Absurd, enormous, and the single most protective thing in the shop. You will move like a fridge.' },

  { id: 'armouredcoat', name: 'Armoured Trenchcoat', cat: 'armor', lvl: 34, price: 50900,
    atk: 0, def: 54, spd: -2, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Panels sewn between the lining and the wool by a tailor who asked no questions.' },

  { id: 'riotplate', name: 'Riot Plate', cat: 'armor', lvl: 39, price: 95500,
    atk: 0, def: 66, spd: -4, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Hard plate front and back with a trauma pad behind it. Sounds like a dropped pan when hit.' },

  { id: 'assaultcarrier', name: 'Assault Carrier', cat: 'armor', lvl: 44, price: 161000,
    atk: 0, def: 74, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Light composite plates in a cut-away rig. Costs a fortune precisely because it weighs nothing.' },

  { id: 'breachersuit', name: 'Breacher Suit', cat: 'armor', lvl: 50, price: 334000,
    atk: 0, def: 96, spd: -5, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Neck, groin and shoulders all covered. Built for men who go through doors first.' },

  { id: 'heavyriotplate', name: 'Heavy Riot Plate', cat: 'armor', lvl: 57, price: 743000,
    atk: 0, def: 128, spd: -7, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Full torso, upper arms, thighs. You are a filing cabinet with a grudge.' },

  { id: 'execarmour', name: 'Executive Armour', cat: 'armor', lvl: 65, price: 2030000,
    atk: 0, def: 160, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Bespoke, three fittings, hand-stitched, and it looks exactly like a very good suit.' },

  { id: 'ironsuit', name: 'The Iron Suit', cat: 'armor', lvl: 74, price: 8000000,
    atk: 0, def: 255, spd: -8, acc: 0, heal: 0, effect: null, stock: true,
    desc: 'Somebody welded a bank vault into a jacket. Almost nothing gets through. Almost nothing gets past you either.' },

  /* ==========================================================
     MEDICAL  (8)
     heal is a percentage of your maximum health. Cannot be used
     while you are lying in a hospital bed - buy them BEFORE.
     ========================================================== */

  { id: 'bandages', name: 'Roll of Bandages', cat: 'medical', lvl: 1, price: 120,
    atk: 0, def: 0, acc: 0, heal: 15, effect: null, stock: true,
    desc: 'Gauze and tape from the corner drugstore. Stops the dripping, mostly.' },

  { id: 'painkillers', name: 'Bottle of Painkillers', cat: 'medical', lvl: 3, price: 400,
    atk: 0, def: 0, acc: 0, heal: 25, effect: null, stock: true,
    desc: 'Prescribed to somebody, at some point, for something. The label came off years ago.' },

  { id: 'firstaid', name: 'First Aid Kit', cat: 'medical', lvl: 6, price: 1000,
    atk: 0, def: 0, acc: 0, heal: 35, effect: null, stock: true,
    desc: 'Green tin box off a factory wall. Scissors, iodine, and a booklet nobody has ever read.' },

  { id: 'stitchkit', name: 'Back-Room Stitch Kit', cat: 'medical', lvl: 12, price: 3000,
    atk: 0, def: 0, acc: 0, heal: 50, effect: null, stock: true,
    desc: 'Curved needle, fishing line and a bottle of something to bite down on.' },

  { id: 'morphine', name: 'Morphine Syrette', cat: 'medical', lvl: 20, price: 9000,
    atk: 0, def: 0, acc: 0, heal: 65, effect: null, stock: true,
    desc: "Squeeze, jab, and the whole evening becomes somebody else's problem." },

  { id: 'bloodbag', name: 'Bag of O-Neg', cat: 'medical', lvl: 30, price: 30000,
    atk: 0, def: 0, acc: 0, heal: 80, effect: null, stock: true,
    desc: 'Kept cold in the back of the social club next to the espresso beans. Do not ask.' },

  { id: 'housecall', name: 'House Call from the Doc', cat: 'medical', lvl: 40, price: 90000,
    atk: 0, def: 0, acc: 0, heal: 90, effect: null, stock: true,
    desc: 'He lost his licence in 1979 and has been busier ever since. Cash, and he never saw you.' },

  { id: 'clinicsuite', name: 'Private Clinic Suite', cat: 'medical', lvl: 55, price: 300000,
    atk: 0, def: 0, acc: 0, heal: 100, effect: null, stock: true,
    desc: "A whole floor, a whole team, and a chart with somebody else's name on the front." },

  /* ==========================================================
     BOOSTERS  (8)
     Buy back a resource you would otherwise wait for. Priced at
     roughly what the resource earns you at the level it unlocks,
     so they are a convenience and never a printing press.
       energy +1 = 3 real minutes   brave +1 = 5   will +1 = 12
     ========================================================== */

  { id: 'coffee', name: 'Cup of Diner Coffee', cat: 'booster', lvl: 1, price: 150,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'energy', amount: 8 }, stock: true,
    desc: 'Burnt, bottomless and served by a woman who has heard every story in the city.' },

  { id: 'rabbitfoot', name: "Lucky Rabbit's Foot", cat: 'booster', lvl: 1, price: 100,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'happy', amount: 1 }, stock: true,
    desc: 'Dyed green, worn smooth, and it did precisely nothing for the rabbit. You feel better anyway.' },

  { id: 'cigar', name: 'Good Cigar', cat: 'booster', lvl: 6, price: 350,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'brave', amount: 3 }, stock: true,
    desc: 'Rolled somewhere warm, smuggled somewhere cold, smoked somewhere it is not allowed.' },

  { id: 'energydrink', name: 'Can of Rocket Fuel', cat: 'booster', lvl: 4, price: 600,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'energy', amount: 25 }, stock: true,
    desc: 'Tastes like liquid bubblegum and regret. Your hands will shake for an hour.' },

  { id: 'whiskey', name: 'Shot of Rye', cat: 'booster', lvl: 9, price: 850,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'brave', amount: 6 }, stock: true,
    desc: 'One at the bar before you go. Two is planning. Three is an excuse.' },

  { id: 'proteinshake', name: 'Protein Shake', cat: 'booster', lvl: 12, price: 2400,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'will', amount: 5 }, stock: true,
    desc: 'Chalk, banana flavour and a tub the size of a fire hydrant. The gym guys swear by it.' },

  { id: 'peptalk', name: 'Pep Talk from the Old Man', cat: 'booster', lvl: 18, price: 12000,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'will', amount: 12 }, stock: true,
    desc: 'Ten minutes in the back booth. He does not raise his voice once and you leave ready to move a building.' },

  { id: 'adrenaline', name: 'Adrenaline Shot', cat: 'booster', lvl: 25, price: 22000,
    atk: 0, def: 0, acc: 0, heal: 0, effect: { stat: 'energy', amount: 75 }, stock: true,
    desc: 'Straight through the shirt, straight into the thigh. You will not sit down until Thursday.' },

  /* ==========================================================
     DROPS  (6)
     Junk that falls out of somebody's pockets when you put them
     on the pavement. Worth almost nothing. Kept anyway.
     ========================================================== */

  { id: 'lottoticket', name: 'Losing Lottery Ticket', cat: 'drop', lvl: 1, price: 1,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Two numbers off. He had been carrying it around for eleven days.' },

  { id: 'toothpick', name: 'Chewed Toothpick', cat: 'drop', lvl: 1, price: 2,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Splintered flat at one end. Somebody had a lot on his mind.' },

  { id: 'halfcannoli', name: 'Half a Cannoli', cat: 'drop', lvl: 1, price: 3,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Wrapped in a napkin from a bakery on Mott Street. Still, technically, a cannoli.' },

  { id: 'kidsphoto', name: "Photo of Somebody's Kids", cat: 'drop', lvl: 1, price: 5,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Two of them, front steps, squinting into the sun. Soft at the corners from a wallet.' },

  { id: 'masscard', name: 'Laminated Mass Card', cat: 'drop', lvl: 1, price: 8,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Saint Jude, patron of lost causes, dated last spring. He kept it in his breast pocket.' },

  { id: 'crackedphone', name: 'Nextel with a Cracked Screen', cat: 'drop', lvl: 1, price: 35,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Still chirps. Nine missed calls from MA and one from a contact saved as DO NOT ANSWER.' },

  /* ==========================================================
     TROPHIES  (2)
     Not sold, not bought, not listed on the market at any price.
     ========================================================== */

  { id: 'donsring', name: "The Don's Ring", cat: 'trophy', lvl: 1, price: 0,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Heavy gold, worn thin on the inside by sixty years of being kissed. It is not for sale and never was.' },

  { id: 'commissionledger', name: 'The Commission Ledger', cat: 'trophy', lvl: 1, price: 0,
    atk: 0, def: 0, acc: 0, heal: 0, effect: null, stock: false,
    desc: 'Every name, every envelope, every Tuesday since 1961. Owning it is the whole point of owning it.' }

];
