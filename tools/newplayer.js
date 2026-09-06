/* Play the game the way a new player would and report where they get to.
   Resources are granted by winding the regeneration clocks back, so this
   uses exactly the same economy the real game runs on. */
const { chromium } = require('playwright-core');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'exmafia.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await (await browser.newContext()).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForSelector('#ng-name');
  await page.fill('#ng-name', 'FreshMeat');
  await page.click('[data-act="startgame"]');
  await page.waitForTimeout(1200);

  await page.evaluate(pf => { window.__PROFILE__ = pf; }, process.argv[2] || 'casual');
  const report = await page.evaluate(() => {
    const E = window.EXM, G = E.GAME;
    const P = () => E.S.player;
    const log = [];

    /* give back the resources an hour of real time would produce */
    function passTime(minutes) {
      const p = P();
      const back = minutes * 60000;
      ['energy', 'nerve', 'will', 'attacks', 'health'].forEach(k => { p.regen[k] -= back; });
      G.player.regen(Date.now());
    }

    function bestAffordable(cats, mult) {
      const p = P();
      let best = null;
      E.DATA.items.forEach(it => {
        if (!it.stock || cats.indexOf(it.cat) < 0) return;
        if ((it.lvl || 1) > p.level || it.price > p.money * (mult || 0.6)) return;
        const v = (it.atk || 0) + (it.def || 0);
        if (!best || v > (best.atk || 0) + (best.def || 0)) best = it;
      });
      return best;
    }

    /* one session: spend everything sensibly */
    function playSession(minutes) {
      passTime(minutes);
      const p = P();
      let guard = 0;

      // crimes with all the Brave
      while (p.nerve > 0 && guard++ < 4000) {
        const list = G.crimes.list().filter(c => c.lvl <= p.level && c.brave <= p.nerve);
        if (!list.length) break;
        let pick = null;
        for (let i = list.length - 1; i >= 0; i--) {
          if (G.crimes.successChance(list[i], p) > 0.62) { pick = list[i]; break; }
        }
        if (!pick) pick = list[0];
        const r = G.crimes.commit(pick.id);
        if (r.err) break;
        if (r.jailed) { p.jailUntil = 0; }   // assume they wait it out
      }
      // shifts with all the Will
      while (p.will > 0 && guard++ < 4000) {
        const jobs = G.crimes.jobs().filter(j => j.lvl <= p.level && j.will <= p.will);
        if (!jobs.length) break;
        const r = G.crimes.work(jobs[jobs.length - 1].id);
        if (r.err) break;
      }
      // buy the best kit they can justify
      const w = bestAffordable(['melee', 'pistol', 'smg', 'rifle', 'heavy'], 0.5);
      if (w && (!G.items.get(p.wpn) || G.items.get(p.wpn).atk < w.atk)) {
        G.player.spend(w.price); G.items.add(w.id, 1); G.items.equip(w.id);
      }
      const a = bestAffordable(['armor'], 0.35);
      if (a && (!G.items.get(p.arm) || G.items.get(p.arm).def < a.def)) {
        G.player.spend(a.price); G.items.add(a.id, 1); G.items.equip(a.id);
      }
      // fight anybody the odds like, then train on what is left
      let fights = 0, wins = 0;
      while (p.attacks > 0 && p.energy >= 10 && guard++ < 4000) {
        const targets = E.S.npcs.filter(n => !n.dead && G.ladder.canAttack(n.id).ok && G.combat.odds(p, n) > 0.66);
        if (!targets.length) break;
        targets.sort((x, y) => G.combat.power(y) - G.combat.power(x));
        const t = targets[0];
        const r = G.ladder.attack(t.id);
        if (r.err) break;
        fights++;
        if (r.fight.win) { wins++; G.ladder.finish(Math.random() < 0.5 ? 'mug' : 'hosp'); }
        else { p.hospUntil = 0; p.health = Math.max(1, E.GAME.combat.sheet(p).hpMax * 0.5); }
      }
      while (p.energy >= G.gym.ENERGY_PER_SET && guard++ < 4000) {
        const r = G.gym.train(['str', 'def', 'spd', 'dex'][guard % 4], Math.floor(p.energy / G.gym.ENERGY_PER_SET));
        if (r.err) break;
      }
      // bank it
      G.bank.deposit(Math.floor(p.money * 0.8));
      return { fights, wins };
    }

    function snapshot(label) {
      const p = P();
      const beat = E.S.npcs.filter(n => !n.dead && G.combat.odds(p, n) > 0.55).length;
      log.push({
        label,
        level: p.level,
        rank: G.progress.rankFor(p.xp).name,
        cash: Math.round(p.money + p.bank),
        str: Math.round(p.str), def: Math.round(p.def),
        power: G.combat.power(p),
        wpn: (G.items.get(p.wpn) || {}).name || 'fists',
        arm: (G.items.get(p.arm) || {}).name || 'shirt',
        w: p.st.w, l: p.st.l, crimes: p.st.crimes,
        beatable: beat,
        rung: G.ladder.rungOf(0),
        bottomRung: (() => { const id = G.ladder.roster()[G.ladder.roster().length - 1]; const e = E.byId(id); return e ? G.combat.power(e) : 0; })(),
        gfPower: (() => { const e = E.byId(G.ladder.godfatherId()); return e ? G.combat.power(e) : 0; })()
      });
    }

    const profile = window.__PROFILE__ || 'casual';
    // casual: one long sit-down a day. dedicated: checks in through the day.
    const perDay = profile === 'dedicated' ? 16 : 1;
    const gapMin = profile === 'dedicated' ? 65 : 60 * 18;
    function playDay() { for (let i = 0; i < perDay; i++) playSession(gapMin); }

    snapshot('signup');
    playSession(0);   snapshot('first sit-down');
    playSession(60);  snapshot('after 1 hour');
    playSession(300); snapshot('after 6 hours');
    for (let d = 1; d <= 6; d++) playDay();
    snapshot('after 1 week');
    for (let d = 0; d < 21; d++) playDay();
    snapshot('after 1 month');
    for (let d = 0; d < 60; d++) playDay();
    snapshot('after 3 months');
    for (let d = 0; d < 90; d++) playDay();
    snapshot('after 6 months');
    return log;
  });

  const cols = ['label', 'level', 'rank', 'cash', 'str', 'def', 'power', 'beatable', 'w', 'l', 'crimes', 'rung', 'wpn'];
  console.log('PROFILE: ' + (process.argv[2] || 'casual'));
  console.log('  ' + ['when'.padEnd(18), 'lvl'.padStart(4), 'rank'.padEnd(19), 'money'.padStart(14), 'str'.padStart(7), 'grd'.padStart(7), 'power'.padStart(8), 'beat'.padStart(5), 'W/L'.padStart(9), 'rung'.padStart(5), 'weapon'].join(' '));
  report.forEach(r => {
    console.log('  ' + [
      r.label.padEnd(18), String(r.level).padStart(4), r.rank.slice(0, 19).padEnd(19),
      ('$' + r.cash.toLocaleString()).padStart(14), String(r.str).padStart(7), String(r.def).padStart(7),
      String(r.power).padStart(8), String(r.beatable).padStart(5),
      (r.w + '/' + r.l).padStart(9), String(r.rung || '-').padStart(5),
      ('bottom rung ' + r.bottomRung).padEnd(20), r.wpn
    ].join(' '));
  });
  console.log('\nERRORS ' + errs.length);
  errs.slice(0, 10).forEach(e => console.log('  * ' + e.slice(0, 250)));
  await browser.close();
})().catch(e => { console.error('HARNESS FAILED', e); process.exit(2); });
