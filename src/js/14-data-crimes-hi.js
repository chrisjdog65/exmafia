/* ============================================================
   14-data-crimes-hi.js :: the late game

   The level cap is gone. Levels run past 100 for as long as
   anybody keeps logging in, and 45-normalize.js already fits the
   XP curve out to 600, but the content tables stopped at level 85
   and left the back half of the game with an empty city. This file
   extends the three tables that gate the late game. It APPENDS -
   it never replaces - so 11-data-crimes.js and 13-data-props.js
   remain the authority on everything below.

     DATA.crimes  +16   tiers 9 and 10, levels 84 -> 170
     DATA.jobs    +10   levels 55 -> 160, Labour 400 -> 9,000
     DATA.cities  +4    airfare $220,000 -> $2,400,000

   ------------------------------------------------------------
   CRIMES - continuing the curve out of 11-data-crimes.js

   The old table ended on the Commission: tier 8, level 80, 14
   Brave, $1.87M-$4.19M, 22,600-38,500 xp, base 0.30, jailP 0.78.
   Everything here is measured off that row.

     money   the per-crime payout ratio EASES from x1.265 down to
             x1.220 across the sixteen, the same way the property
             ladder eases. Compounded that is x32.2 over the run:
             average take climbs $3.03M -> $97.7M and the top pull
             is $60.3M-$135M. A tier is still worth roughly x4.
     xp      eases x1.225 -> x1.190, so xp grows a shade slower
             than money exactly as it did across tiers 1-8
             (money x4.2 a tier against xp x3.4). Average xp runs
             30,550 -> 623,500.
     brave   15 -> 24. pay/Brave and xp/Brave both rise strictly
             with unlock level across all 72 crimes, so nothing
             in this file is dead on arrival and nothing below it
             is made redundant.
     base    0.29 -> 0.16, falling monotonically out of the old
             0.30 floor. At the listed level a committed account
             is still landing these around one time in two once
             Dexterity, IQ and mastery are added on top; the
             level-headroom term does the rest.
     jail    [1040, 3690] -> [1850, 5400] seconds and jailP 0.79
             -> 0.85. This is the one place the old table's stated
             ceiling gets lifted: CFG.JAIL_MAX is a note, not an
             enforced clamp (nothing in the engine reads it), and
             a legendary score has to cost a legendary sit. The
             lawyer's retainer still halves it.
     levels  every crime owns its own unlock level, and none of
             the sixteen collides with the 56 below.

   TIER 9 is the tier where you stop being a problem for people
   and start being a problem for institutions. TIER 10 is the tier
   people are still arguing about in forty years.

   ------------------------------------------------------------
   JOBS - still the safe option, still never the right one

   Ten legitimate-front titles, levels 55 to 160, gated on Labour
   from 400 up to 9,000 - the first jobs in the game to want the
   stat at all. Energy 10 -> 22.

   Pay is set at 0.40x the headline take of a same-level crime at
   the bottom and tapers to 0.26x at the top, which is the ratio
   the old table already ran at. What matters is the DAILY figure:
   Will regenerates 120 a day against Brave's 288, so once the
   costs are divided out a job earner clears 18-24% of what a
   crime earner clears at the same level. Roughly a fifth, every
   rung, all the way up. XP is held at 0.50-0.57x of the crime at
   the same level, matching the old table's 0.61-0.70 band as
   Brave costs climb away from Will costs.

   pay/Will and xp/Will both rise strictly with level across all
   32 jobs, including where these ten interleave with the old
   ones at 55, 66 and 71. Nothing here dominates a job below it.

   ------------------------------------------------------------
   CITIES - four more hops off the frontier

   Airfare keeps its x1.8-x2.3 a hop ($120,000 -> $2,400,000) and
   the flight clock keeps climbing (100 -> 210 minutes). The
   Pareto rule from 13-data-props.js holds: sorted by success
   odds, payout rises monotonically, so no destination is
   strictly better than another and every hop away from New York
   is the same trade - money bought with risk.

     city            fare      min   crime    pay
     Hong Kong       120,000   100   -0.11  +0.50   (the old top)
     Marseille       220,000   115   -0.12  +0.58
     Macau           490,000   135   -0.13  +0.67
     Panama City   1,090,000   165   -0.14  +0.76
     Dubai         2,400,000   210   -0.16  +0.85
   ============================================================ */


DATA.crimes = (DATA.crimes || []).concat([

  /* ---------- TIER 9 :: a problem for institutions ---------- */

  { id: 'privatebank', name: "Turn a private bank inside out", tier: 9, lvl: 84, brave: 15,
    base: 0.29, pay: [2370000, 5300000], xp: [27700, 47200], jail: [1040, 3690], jailP: 0.79,
    ok: 'No queue, no tellers, no sign on the street. Just a partner in a good suit and eleven clients who cannot say out loud what they have lost.',
    fail: 'The partner reads your letter of introduction twice and asks you to wait in the sitting room. You do not wait in the sitting room.',
    caught: 'Private banks keep private security, and two of them were standing behind you while you signed the visitor book.' },

  { id: 'customshouse', name: "Empty the bonded warehouse", tier: 9, lvl: 86, brave: 15,
    base: 0.28, pay: [2990000, 6690000], xp: [33900, 57700], jail: [1080, 3790], jailP: 0.79,
    ok: 'Everything in that building is seized, which means nobody owns it, which means nobody misses it. Four trucks, one night, one extremely relaxed inventory.',
    fail: 'They changed the seals on the bay doors this morning and the new ones are numbered. You leave every number exactly where you found it.',
    caught: 'A customs officer walking a midnight count finds a truck that is not on the schedule and a driver who is not on the payroll.' },

  { id: 'interstate', name: "Peel a convoy off the interstate", tier: 9, lvl: 88, brave: 16,
    base: 0.28, pay: [3760000, 8420000], xp: [41300, 70400], jail: [1120, 3885], jailP: 0.80,
    ok: 'A closed ramp, a borrowed highway crew and eight minutes on a frontage road nobody has resurfaced since the war. Three trucks go in and none come out.',
    fail: 'The lead driver clocks the cones, says something into his radio, and takes the whole convoy past you at seventy. You wave. He does not.',
    caught: 'Troopers were working that stretch looking for something else entirely, and what they found on the frontage road was you.' },

  { id: 'auditnight', name: "Rob the count room on audit night", tier: 9, lvl: 91, brave: 16,
    base: 0.27, pay: [4720000, 10600000], xp: [50300, 85700], jail: [1165, 3985], jailP: 0.80,
    ok: "Every dollar in the building is out on a table being counted by strangers with clipboards. You take it while it is still nobody in particular's responsibility.",
    fail: 'The auditors seal the room at eight and sleep there in shifts, which is a level of dedication you had frankly not budgeted for.',
    caught: 'One of the men with a clipboard is not an auditor. He has been sitting in that room for two weeks waiting to meet you.' },

  { id: 'evidencelocker', name: "Clean out a federal evidence locker", tier: 9, lvl: 94, brave: 17,
    base: 0.26, pay: [5920000, 13300000], xp: [61200, 104000], jail: [1210, 4085], jailP: 0.81,
    ok: "Nine years of other people's confiscated fortunes, tagged, boxed and alphabetised for your convenience. You take the bags and leave the tags.",
    fail: 'The combination rotates at shift handover and today the handover ran early. You walk back out through the same door, holding the same nothing.',
    caught: 'Every shelf in that room has a lens on it and a marshal who watches the tape with his coffee at six in the morning.' },

  { id: 'exchangevault', name: "Open the vault on the diamond floor", tier: 9, lvl: 97, brave: 17,
    base: 0.25, pay: [7400000, 16600000], xp: [74200, 126000], jail: [1260, 4190], jailP: 0.81,
    ok: 'Two hundred dealers keep their whole week in that vault and every one of them insures it privately. By the closing bell the floor is worth the price of the carpet.',
    fail: 'It takes two keys held by two men who genuinely dislike each other and refuse to stand in the same room. Nothing opens, ever, including today.',
    caught: 'The exchange keeps investigators who answer to nobody at all, and they spent the entire afternoon on the floor directly above you.' },

  { id: 'manifestfraud', name: "Rewrite a season of shipping manifests", tier: 9, lvl: 100, brave: 18,
    base: 0.25, pay: [9220000, 20700000], xp: [89900, 153000], jail: [1310, 4300], jailP: 0.82,
    ok: 'Nine hundred containers of gravel, insured at the value of what the paperwork says is inside them, unloaded by men who cannot read the paperwork. Every claim settles beautifully.',
    fail: 'The line moves to a new documentation system halfway through your season and your very fine forgeries stop matching anything on earth.',
    caught: 'An insurance adjuster with a slow week lays two manifests side by side and finds the same container sitting in two oceans.' },

  { id: 'pensionfund', name: "Retire a pension fund early", tier: 9, lvl: 104, brave: 18,
    base: 0.24, pay: [11500000, 25700000], xp: [109000, 185000], jail: [1360, 4410], jailP: 0.82,
    ok: "Forty years of somebody else's overtime, moved into three funds that do not exist and back out through a broker who does. The statements keep arriving on time for another year.",
    fail: 'The trustees vote in an outside actuary and the whole arrangement has to be quietly put back the way it was before he lands.',
    caught: 'A retired shop steward reads his statement properly, which nobody has ever done before, and starts making telephone calls.' },


  /* ---------- TIER 10 :: forty years of stories ---------- */

  { id: 'golddepot', name: "Walk a gold depository out in daylight", tier: 10, lvl: 108, brave: 19,
    base: 0.23, pay: [14200000, 31900000], xp: [131000, 223000], jail: [1410, 4520], jailP: 0.83,
    ok: 'Bullion is heavy, boring and impossible to hide, so they guard the ledger far harder than they guard the door. You take the door.',
    fail: 'The pallets come in over the rating of your truck and the rear axle folds in the loading bay. Gold does not care how clever you are.',
    caught: 'They weigh every vehicle going in and every vehicle coming out, and the difference between the two numbers is not something you can talk around.' },

  { id: 'centralwire', name: "Move a central bank overnight", tier: 10, lvl: 113, brave: 19,
    base: 0.22, pay: [17600000, 39500000], xp: [158000, 269000], jail: [1470, 4640], jailP: 0.83,
    ok: 'One instruction, one settlement window, forty seconds either side of midnight. The money exists in eleven countries at once and then it does not exist anywhere.',
    fail: 'The window shuts four minutes early for a public holiday nobody thought to tell you that country observes.',
    caught: 'A quiet man reconciles the position at dawn, and by breakfast three governments are asking each other the same short question.' },

  { id: 'freightterminal', name: "Take an entire freight terminal", tier: 10, lvl: 119, brave: 20,
    base: 0.21, pay: [21800000, 48800000], xp: [190000, 323000], jail: [1525, 4760], jailP: 0.83,
    ok: 'Not a pallet and not a plane. The whole terminal, for six hours, four hundred consignments deep, running off a shift roster you wrote yourself.',
    fail: 'Fog stacks the inbounds and by two in the morning there are three times as many people in that building as your roster ever allowed for.',
    caught: 'Air freight turns federal the second it crosses the fence, and the men who came for you carried badges from three different agencies.' },

  { id: 'bearerbonds', name: "Lift a sovereign bond issue in transit", tier: 10, lvl: 126, brave: 21,
    base: 0.20, pay: [26800000, 60100000], xp: [227000, 387000], jail: [1585, 4880], jailP: 0.84,
    ok: 'Bearer paper belongs to whoever is holding it, which is the most beautiful sentence in the language. Tonight that is you, in the back of a laundry van.',
    fail: 'The issue turns out to be registered rather than bearer, which makes it a very heavy case of extremely expensive stationery.',
    caught: 'Two treasury couriers with nothing left to lose sit down on the case in the middle of the concourse and simply decline to move.' },

  { id: 'coastnumbers', name: "Take the numbers of a whole coast", tier: 10, lvl: 134, brave: 21,
    base: 0.19, pay: [33000000, 73800000], xp: [272000, 464000], jail: [1645, 5000], jailP: 0.84,
    ok: 'Nine cities, one wire, one figure drawn off the closing handle at a track none of them can see. Every corner from the harbour to the state line pays into your hand.',
    fail: 'Three cities in the middle will not come in, and a wire with a hole in it is only ever a very long telephone call.',
    caught: 'Somewhere in city six a runner keeps the notebook he was told a hundred times never to keep, and a grand jury reads it out loud.' },

  { id: 'submarine', name: "Buy a submarine and load it", tier: 10, lvl: 144, brave: 22,
    base: 0.18, pay: [40400000, 90500000], xp: [325000, 554000], jail: [1710, 5130], jailP: 0.84,
    ok: 'Diesel-electric, sold off for scrap, refitted in a mangrove by men paid in cash. She goes under off one coast and comes up off another with every crate bone dry.',
    fail: 'She will not hold trim below sixty feet, and the crew quite reasonably decline to discover what happens at eighty.',
    caught: 'A patrol aircraft photographs a wake with nothing in front of it, and there is precisely one thing in the world that makes a wake like that.' },

  { id: 'stadiumnight', name: "Empty a stadium on championship night", tier: 10, lvl: 156, brave: 23,
    base: 0.17, pay: [49400000, 111000000], xp: [388000, 660000], jail: [1775, 5265], jailP: 0.85,
    ok: 'Eighty thousand people, four hours of cash through two hundred windows, and every camera in the building pointed at the grass. You work the tunnels while the crowd sings.',
    fail: 'They armour the receipts this season and run them out at half time in a laundry truck, which is annoyingly clever of them.',
    caught: 'The tunnels get their own police detail on a night like this. Those men are profoundly bored right up until the moment they see you.' },

  { id: 'thefiling', name: "File the amendment", tier: 10, lvl: 170, brave: 24,
    base: 0.16, pay: [60300000, 135000000], xp: [461000, 786000], jail: [1850, 5400], jailP: 0.85,
    ok: 'Three pages, one notary, one clerk who stamps it without reading it. By Friday you hold a bank, a port and a pension board, and not one living person is looking for you.',
    fail: 'It comes back across the counter for a missing schedule, and by the time you have the schedule the whole arrangement underneath it has expired.',
    caught: 'Filings are public. A man with a library card and a long grudge reads yours on the day it lands and walks it straight to a prosecutor.' }

]);


DATA.jobs = (DATA.jobs || []).concat([

  { id: 'uniontrustee', name: "Sit as trustee on the union local", lvl: 55, energy: 10, lab: 400,
    pay: [44200, 63800], xp: [1310, 1890],
    desc: 'Your name on the fund, your signature on the cheques, and one meeting a quarter where nobody asks a single question.' },

  { id: 'portscheduler', name: "Schedule the berths for the port authority", lvl: 66, energy: 13, lab: 620,
    pay: [131000, 189000], xp: [3430, 4970],
    desc: 'You decide which ship unloads and which ship waits, and every hour of waiting costs somebody twelve thousand dollars.' },

  { id: 'cagesupervisor', name: "Supervise the casino cage", lvl: 71, energy: 15, lab: 900,
    pay: [311000, 449000], xp: [5870, 8530],
    desc: 'Every chip in the building crosses your window twice. They trust you with the count because you always look so tired.' },

  { id: 'bondingagent', name: "Write bonds for the construction trade", lvl: 80, energy: 16, lab: 1300,
    pay: [943000, 1360000], xp: [14000, 20200],
    desc: 'No bond, no site. You have never refused a contractor in your life and not one of them has ever asked you why.' },

  { id: 'haulagedirector', name: "Direct the waste haulage board", lvl: 92, energy: 17, lab: 1850,
    pay: [2320000, 3350000], xp: [30500, 44300],
    desc: 'Nine hundred trucks across four states, and a landfill that has been quietly accepting deliveries after dark since 1974.' },

  { id: 'complianceofficer', name: "Be the compliance officer at a private bank", lvl: 105, energy: 18, lab: 2550,
    pay: [5480000, 7910000], xp: [64700, 94100],
    desc: 'Your entire job is to notice things. Corner office, name on the door, and a spotless record of noticing nothing whatsoever.' },

  { id: 'freeportcurator', name: "Curate a freeport art vault", lvl: 118, energy: 19, lab: 3400,
    pay: [7950000, 11500000], xp: [92300, 134000],
    desc: 'Crates that never clear customs, owners who never visit, and a valuation that climbs every time the crate changes hands in the dark.' },

  { id: 'ratingsanalyst', name: "Rate the paper for the ratings house", lvl: 132, energy: 20, lab: 4500,
    pay: [11400000, 16400000], xp: [130000, 189000],
    desc: 'You put a letter on a stack of debt nobody has read. It is always the same letter, and it is always the same fee.' },

  { id: 'wealthconsultant', name: "Consult for a sovereign wealth fund", lvl: 146, energy: 21, lab: 6300,
    pay: [15500000, 22400000], xp: [183000, 265000],
    desc: "A small country's entire savings, one committee of nine, and a per-diem that would embarrass a head of state." },

  { id: 'centralbankchair', name: "Advise a central bank on reserves", lvl: 160, energy: 22, lab: 9000,
    pay: [18400000, 26500000], xp: [222000, 322000],
    desc: 'They pay you to tell them what their own money is doing all day. You tell them most of it, and you tell them slowly.' }

]);


DATA.cities = (DATA.cities || []).concat([

  { id: 'marseille', name: 'Marseille', country: 'France',
    cost: 220000, flightMin: 115,
    bonus: { crime: -0.12, pay: 0.58 },
    exclusive: [],
    desc: "Sardines, sunlight and a stairwell quarter full of families who have been moving other people's cargo since Napoleon." },

  { id: 'macau', name: 'Macau', country: 'China',
    cost: 490000, flightMin: 135,
    bonus: { crime: -0.13, pay: 0.67 },
    exclusive: [],
    desc: 'Portuguese tiles over baccarat tables, and junket rooms where the chips on the felt are worth more than the building.' },

  { id: 'panama', name: 'Panama City', country: 'Panama',
    cost: 1090000, flightMin: 165,
    bonus: { crime: -0.14, pay: 0.76 },
    exclusive: [],
    desc: 'Glass towers over a ditch that runs the world, and a lawyer on every floor who will incorporate you before lunch.' },

  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates',
    cost: 2400000, flightMin: 210,
    bonus: { crime: -0.16, pay: 0.85 },
    exclusive: [],
    desc: 'Gold sold by the kilo and a free zone where a container can change hands four times without ever once moving.' }

]);
