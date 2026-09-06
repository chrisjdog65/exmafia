# exMafia — what the recreation is built on

Direct archives of exmafia.com are unreachable from this environment (archive.org is
blocked by the egress proxy), so the reconstruction rests on search-indexed copies of
two operator/host pages plus the game directory listing.

## Confirmed from sources

| Fact | Source |
|---|---|
| "Your character actions are limited by energy, will, brave, health, dexterity and remaining attacks" | newrpg.com Ex Mafia listing |
| "over 100 different in-game items and over 50 crimes available" · "real life prizes ... for best and active players" | newrpg.com |
| "Energy is used for several things – attacking other mobsters, training in the gym, and walking the streets to see what you can find." | fairgamers how-to-play |
| "Health will go down as you attack or as you get attacked." Losers go to hospital, on a real-time timer. | fairgamers |
| "Attacks Remaining are the number of attacks you have and number you started with." Buyable with points. | fairgamers |
| **"The Attack Ladder is where the best attackers are, and you get on it by beating one of them."** | fairgamers |
| **"There is a benefit to being on the attack ladder of 10 points every hour of every day."** | fairgamers |
| **"If you are on the attack ladder, or if you are the Godfather, a bodyguard will not block any attacks till you are off the ladder."** | fairgamers |
| "A bodyguard can be hired with points and will be in effect for 2 hours. While you are under the protection of a bodyguard, no one can attack you, however you may not attack anyone either." | fairgamers |
| Post-win choice: **"when you successfully attack another player, and you hospitalize them rather than mug them, your Strength and Guard will increase."** | fairgamers mobster-rpg |
| Targets are picked from the **"online now"** and **"total"** player lists at the bottom of the screen | fairgamers |
| Walking the streets: "You may find a new gun or a dead body, find more attacks or get hit by a car, find points or lose them" — and can land you in jail or hospital | fairgamers |
| "Trade Point" menu: "trade points for refills of your Energy, Brave, and Will, buy more attacks, gain IQ, or more" | fairgamers |
| Quirk: "you must refill your will before your energy, since doing it the other way around will wipe out your energy in the process" | fairgamers |
| Voting for points: 5–10 per vote, up to 80/day | fairgamers |
| Jobs pay daily at 5pm game time | fairgamers |
| The #1 spot is **The Godfather** | fairgamers / mobster-rpg |
| Screens that existed by name: City, Gym, Point Gym, Crimes, Streets, Truck Stop, Downtown Fence, Shop, Item Market, Auction, Point Market, Inventory, Bank, Jail, Lawyer ("Dewey, Screwem and Howe"), Hospital, Newspaper, Casino, Lottery, Stock Market, Trade Point, Bodyguard, Attack Ladder, mail, Forums, Donate, Vote, Prizes | fairgamers |
| Money: "crimes and selling items in the item market or auction, selling points or walking the streets" | fairgamers |
| Season resets on an 8-week cycle | fairgamers |

## Later additions, and where they came from

The second pass drew on a wider research sweep that reached the operator's own
help pages more completely. Newly **confirmed** and now implemented:

| Fact | Source |
|---|---|
| exMafia was a customised fork of **MCCodes v2**, the PHP engine behind most 2006–2011 mafia browser games — its page set and stat vocabulary match | engine-lineage analysis across indexed sources |
| The five trainable stats are **Strength, Agility, Guard, Labor, IQ**, with exMafia's own definitions: Strength "how hard you will hit", Agility "how easy it is for an opponent to hit you", Guard "how much damage an opponent will do to you", Labor "enables you to get a better job", IQ "determines how successful you are at crimes, and also helps you bust people out of jail easier" | fairgamers |
| **IQ is not gym-trainable** — it comes from the schools, from working, and from the Trade Point menu | fairgamers |
| **Two gyms**: "either your energy in the regular gym, or your points in the point gym" | fairgamers |
| Gym output scales with **Will** ("the higher the Will, the more stats you get") and with **level** | fairgamers |
| **Schools**: "the more expensive the class, the longer the class, and the more stats you receive when the class is over" | fairgamers |
| Truck Stop entry needs "a concealed handgun, a docking yard day pass, and ammo"; the run starts on the **beer truck** at levels 1–4; the **Downtown Fence** wants **25 units** | fairgamers |
| **Rounds**: "unlike most RPGs Exmafia has rounds and after a given round is over the players are reset to having nothing" — eight weeks, then **The Rumble**, "a last man standing free-for-all with a $500 prize" | fairgamers |
| Jail: "each unsuccessful crime will earn you time in Jail. Jail time is in real time, and the amount of time depends on how risky the crime was" | fairgamers |
| Three markets: **Shop**, **Item Market** ("all sales are final") and **Auction**; plus a player-run **Point Market** on the City page | fairgamers |
| The bank's purpose is **mug-proofing**, and auto-banking was a donator perk | fairgamers |
| Voting: 5–10 points a link, **up to 80 a day**; a referral pays **300 points** when they reach level 4 | fairgamers |

Reconstructed in the same pass, and flagged as such:

* **Organised Crime** and **The Notice Board** are the two systems added at the player's
  request. Organised Crime is a documented feature of the MCCodes engine family exMafia was
  built on, but no source describes exMafia's own version, so its jobs, roles, crew mechanics
  and numbers are all invented here. The Notice Board has no precedent in exMafia at all — it
  exists to give the 200 simulated accounts a way to ask the player for things.
* **Everybody starting at level 1.** This is how an exMafia round genuinely began, and it is
  now the default. The alternative — a world generated with years of history already in it —
  is still available from the back office.
* **No level cap.** exMafia had an eight-week round and never needed one. Removing it is a
  deliberate departure, and the experience curve is generated to level 600 and extrapolated
  beyond.

## Reconstructed where sources are silent

* **Brave** is the crime resource; **Will** multiplies gym output rather than being spent on
  anything directly; **Dexterity** is the Truck Stop resource. Energy's uses are confirmed, and
  Will's role as the gym multiplier is confirmed; that Brave's only sink is crimes, and
  Dexterity's only sink is the Truck Stop, is inference from what is left over.
* Regeneration rates. No source gives a tick rate — only that the gauges refill in real time and
  that the game beats hourly and daily.
* Every specific number: crime payouts, XP curve, item prices, hospital/jail durations, ladder
  size (20 rungs here), and combat equations. The stat *roles* are confirmed
  (Strength drives damage, Guard reduces it, Agility drives evasion); the equations are not.
* The hitlist/bounty board. No bounty system was found for exMafia; it is included because it is
  near-universal in the genre and the ladder alone gives thin PvP motivation in single player.
