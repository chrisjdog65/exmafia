# exMafia — single player

A faithful offline recreation of **exMafia**, the 2D text-based mafia MMORPG that ran at
exmafia.com and as a MySpace application in the late 2000s.

**Open `exmafia.html`. That is the whole thing.** One file, no install, no server, no
internet. It saves to your browser automatically.

![The city](docs/screenshot-city.png)

---

## What is in it

Two hundred other players. Not a leaderboard of names — two hundred accounts, each with its
own time zone, its own hours, its own temper and its own idea of how to play. They log in when
it is evening where they live, do crimes, train, fight each other over the Attack Ladder,
argue in the shoutbox, run scams on each other in the market, join and leave families, hold
grudges for weeks, and eventually stop logging in for good while new people sign up underneath
them. None of it waits for you. Come back after a week and the city will have moved.

### The Attack Ladder

Twenty rungs. Rung one is **The Godfather**. The ladder is a place, not a score — you take a
rung *off a person*.

* A **plain attack**, from the player lists, is money, experience and a hospital bed for them.
  It never moves a rung, however hard you hit.
* A **Challenge**, from the ladder page, is the only thing that does. From off the ladder you
  may challenge the bottom three rungs. Once you are on it your reach is five rungs upward. A
  rung whose holder has not fought in three days is open to anybody.
* Win and you take their rung. Everybody under them slides down one and the holder of rung
  twenty comes off.
* A rung pays **10 points every hour of every day**; rung one pays 25. It also means **no
  bodyguard in this town will cover you** until you are off it. Passive income for permanent
  exposure — that trade is the whole game.

![The Attack Ladder](docs/screenshot-ladder.png)

Every eight weeks the round ends, everybody on the ladder goes into **The Rumble**, and the
city resets to level one. Your name on the wall carries over. Nothing else does.

### The rest of the city

Crimes · Your Job · Go For A Walk · Gym · Point Gym · Local Schools · Travel · Attack Ladder ·
Players · Hitlist · Bodyguard · Shop · Item Market · Auction · Truck Stop · Downtown Fence ·
Bank · Property · Casino · Lottery · Stock Market · Trade Point · Point Market · Vote ·
Profile · Inventory · Mail · Family · Newspaper · Forums · Rankings · Lawyer · Hospital · Jail

### The six gauges

| Gauge | Spent on | Refills |
|---|---|---|
| Energy | Attacking, the gym, walking the streets, working a shift | 1 / 3 min |
| Brave | Crimes, and nothing else | 1 / 5 min |
| Will | Nothing directly — it is the **gym multiplier** | 1 / 12 min |
| Dexterity | Truck Stop runs, and nothing else | 1 / 8 min |
| Health | Taking beatings. Zero is a hospital bed on a real clock. | 1% / 90 s |
| Attacks | One per attack, one per challenge | 1 / 20 min |

Five stats — **Strength, Guard, Agility, Labour, IQ** — decide how well you do any of it. IQ is
the one the gym will not sell you: it comes from the schools, from working, and from points.

---

## How faithful is it?

Direct archives of exmafia.com are gone. This is reconstructed from the operator's own surviving
help pages, the game directory listings, and the MCCodes v2 engine lineage the game was built on.
[`docs/RESEARCH.md`](docs/RESEARCH.md) sets out, line by line, what is sourced and what is not.

**Sourced from the game's own copy:** the six gauges; Energy paying for attacks, the gym and
walking the streets; "Attacks Remaining" as a separate counter you can buy with points; the
Attack Ladder and its ten points an hour; the bodyguard that costs 25 points, lasts two hours,
blocks attacks both ways and *stops working the moment you are on the ladder*; The Godfather as
rung one; mug-or-hospitalise after a win, with hospitalising raising Strength and Guard; picking
targets off the "Online Now" and "Total Players" lists; walking the streets and its table of
guns, bodies, points and squad cars; the Trade Point menu and its refill-Will-before-Energy trap;
voting for 5–10 points up to 80 a day; the Truck Stop to Downtown Fence run and its twenty-five
unit minimum; the schools; the eight-week round and The Rumble; Dewey, Screwem and Howe.

**Reconstructed, because no source survives:** every specific number. Regeneration rates, the
experience curve, crime payouts, item prices, hospital and jail timers, combat equations, and the
size of the ladder. The stat *roles* are confirmed; the formulas behind them are tuned by hand
and validated by simulation.

---

## Building it

`exmafia.html` is generated. Sources live in `src/` and are concatenated in filename order.

```
node tools/build.js       # src/  ->  exmafia.html
node tools/smoke.js       # boot, visit all 41 routes, save, reload
node tools/paths.js       # exercise every interaction path end to end
node tools/deep.js        # long-run world simulation and state integrity
node tools/newplayer.js [casual|dedicated]   # simulated progression arc
```

The tests drive the real built file in headless Chromium.

| | |
|---|---|
| `src/js/0*` | RNG, config, save, world creation |
| `src/js/1*`, `2*` | content tables — crimes, items, ranks, names, chat, forum, mail, news |
| `src/js/3*`, `4*` | the game systems |
| `src/js/5*` | the two hundred, and the clock that runs them |
| `src/js/6*`, `7*` | interface and input |

## Your save

Saves to `localStorage`, with IndexedDB as a fallback and a memory store behind that, so it
works even when a browser refuses storage to a page opened off the filesystem. Settings has an
export button and a paste box if you want to move a game between machines.
