/* A genuine forward-running clock. Date.now() is replaced with an
   advancing virtual time so regeneration, timers, hospital clocks and the
   offline catch-up all move the same way they would over real months. */
const { chromium } = require('playwright-core');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'exmafia.html');
const DAYS = Number(process.argv[2] || 180);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForSelector('#ng-name');
  await page.fill('#ng-name', 'TheHuman');
  await page.click('[data-act="startgame"]');
  await page.waitForTimeout(1200);

  const rows = await page.evaluate(days => {
    const E = window.EXM, S = E.S;
    E.GAME.sim.stop();

    /* virtual clock */
    const real = Date.now;
    let offset = 0;
    Date.now = function () { return real() + offset; };
    const advance = ms => { offset += ms; };

    const snap = d => {
      const alive = S.npcs.filter(n => !n.dead);
      const l = alive.map(n => n.level).sort((a, b) => a - b);
      const q = f => l[Math.min(l.length - 1, Math.floor(l.length * f))];
      const lad = E.GAME.ladder.roster().map(i => E.byId(i)).filter(Boolean);
      const powers = alive.map(n => E.GAME.combat.power(n)).sort((a, b) => a - b);
      return {
        d, n: alive.length,
        min: l[0], p25: q(.25), med: q(.5), p75: q(.75), p90: q(.9), max: l[l.length - 1],
        lo: Math.min.apply(null, lad.map(x => x.level)), hi: Math.max.apply(null, lad.map(x => x.level)),
        gf: (E.byId(E.GAME.ladder.godfatherId()) || {}).name || '?',
        medPow: powers[Math.floor(powers.length / 2)],
        medStr: Math.round(alive.map(n => n.str).sort((a, b) => a - b)[Math.floor(alive.length / 2)]),
        cash: Math.round(alive.map(n => n.money + n.bank).sort((a, b) => a - b)[Math.floor(alive.length / 2)]),
        gear: alive.filter(n => n.wpn).length,
        fams: S.fams.length,
        gfChanges: window.__gfChanges || 0,
      };
    };

    /* watch how often the top of the ladder actually turns over */
    window.__gfChanges = 0;
    let lastGf = E.GAME.ladder.godfatherId();

    const out = [snap(0)];
    const marks = [1, 3, 7, 14, 30, 60, 90, 120, 180, 270, 365].filter(m => m <= days);
    let at = 0;
    for (const m of marks) {
      const chunkDays = m - at;
      /* step forward in 7-day slices so nothing exceeds the catch-up cap */
      let left = chunkDays;
      while (left > 0) {
        const slice = Math.min(7, left);
        advance(slice * 86400000);
        E.GAME.sim.catchUp(Date.now());
        const gf = E.GAME.ladder.godfatherId();
        if (gf !== lastGf) { window.__gfChanges++; lastGf = gf; }
        left -= slice;
      }
      at = m;
      out.push(snap(m));
    }
    Date.now = real;
    return out;
  }, DAYS);

  console.log(`A CITY THAT STARTED AT LEVEL ONE, ${DAYS} DAYS LATER`);
  console.log('   day  roster |  min  p25  med  p75  p90  max | ladder | med power | med str |   median worth | gear | GF changes | godfather');
  rows.forEach(r => console.log(
    '  ' + String(r.d).padStart(4) + String(r.n).padStart(8) + ' |' +
    String(r.min).padStart(5) + String(r.p25).padStart(5) + String(r.med).padStart(5) + String(r.p75).padStart(5) + String(r.p90).padStart(5) + String(r.max).padStart(5) + ' |' +
    String(r.lo + '-' + r.hi).padStart(7) + ' |' + String(r.medPow).padStart(10) + ' |' + String(r.medStr).padStart(8) + ' |' +
    ('$' + r.cash.toLocaleString()).padStart(16) + ' |' + String(r.gear).padStart(5) + ' |' + String(r.gfChanges).padStart(11) + ' | ' + r.gf));
  console.log('\nERRORS ' + errs.length);
  errs.slice(0, 8).forEach(e => console.log('  * ' + e.slice(0, 200)));
  await browser.close();
})().catch(e => { console.error('HARNESS FAILED', e); process.exit(2); });
