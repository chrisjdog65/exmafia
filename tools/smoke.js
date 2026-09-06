/* Drive the built exmafia.html in headless Chromium and report every
   console error, page error, and broken interaction. */
const { chromium } = require('playwright-core');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '..', 'exmafia.html');

const errors = [];
const logs = [];

function record(page) {
  page.on('console', m => {
    const t = m.type();
    logs.push(`[${t}] ${m.text()}`);
    if (t === 'error') errors.push('CONSOLE: ' + m.text());
  });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + (e && e.stack || e)));
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  record(page);

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  // ---- new game ----
  await page.waitForSelector('#ng-name', { timeout: 8000 });
  await page.fill('#ng-name', 'xX_TestSubject_Xx');
  await page.click('[data-act="startgame"]');
  await page.waitForTimeout(1500);

  const boot = await page.evaluate(() => ({
    npcs: window.__S ? 0 : 0,
  })).catch(() => ({}));

  // expose internals for assertions
  await page.evaluate(() => { /* noop */ });

  const stats = await page.evaluate(() => {
    // reach into the IIFE via a global hook if present, else scrape DOM
    return {
      title: document.title,
      hasMasthead: !!document.querySelector('.masthead'),
      nav: document.querySelectorAll('.nav a').length,
      shout: document.querySelectorAll('#shout .ln').length,
      news: document.querySelectorAll('#newsfeed .ln').length,
      online: document.querySelectorAll('#onlist .u').length,
      meters: document.querySelectorAll('.meter').length,
    };
  });
  console.log('BOOT', JSON.stringify(stats));

  // ---- visit every nav route ----
  const routes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.nav a')).map(a => a.getAttribute('data-nav')));
  const pageInfo = [];
  for (const r of routes) {
    const before = errors.length;
    await page.evaluate(rr => { window.location.hash = '#/' + rr; }, r);
    await page.waitForTimeout(160);
    const info = await page.evaluate(() => ({
      boxes: document.querySelectorAll('.col-mid .box').length,
      err: !!document.querySelector('.col-mid .bad.mono, .col-mid h3'),
      text: (document.querySelector('.col-mid') || {}).innerText ? document.querySelector('.col-mid').innerText.slice(0, 60) : '',
      crashed: (document.querySelector('.col-mid') || { innerText: '' }).innerText.indexOf('Something went wrong') >= 0,
    }));
    pageInfo.push({ r, boxes: info.boxes, crashed: info.crashed, newErrors: errors.length - before });
    if (info.crashed) errors.push('PAGE CRASH: ' + r);
  }
  console.log('ROUTES');
  for (const p of pageInfo) {
    console.log(`  ${p.crashed ? 'CRASH' : 'ok   '} ${String(p.boxes).padStart(2)} boxes  ${p.newErrors ? '(' + p.newErrors + ' errs) ' : ''}${p.r}`);
  }

  // ---- exercise interactions ----
  async function click(sel, label) {
    const before = errors.length;
    try {
      const el = await page.$(sel);
      if (!el) { console.log('  MISSING ' + label + '  (' + sel + ')'); return false; }
      await el.click();
      await page.waitForTimeout(220);
      const extra = errors.length - before;
      console.log(`  ${extra ? 'ERR  ' : 'ok   '} ${label}`);
      return true;
    } catch (e) {
      errors.push('CLICK ' + label + ': ' + e.message);
      console.log('  FAIL ' + label + ' ' + e.message);
      return false;
    }
  }

  console.log('INTERACTIONS');
  await page.evaluate(() => { window.location.hash = '#/crimes'; });
  await page.waitForTimeout(200);
  await click('[data-act="crime"]', 'do a crime');
  await click('[data-act="crime"]', 'do a crime again');

  await page.evaluate(() => { window.location.hash = '#/jobs'; });
  await page.waitForTimeout(200);
  await click('[data-act="job"]', 'work a shift');

  await page.evaluate(() => { window.location.hash = '#/gym'; });
  await page.waitForTimeout(200);
  await click('[data-act="train"]', 'train a stat');

  await page.evaluate(() => { window.location.hash = '#/streets'; });
  await page.waitForTimeout(200);
  await click('[data-act="walk"]', 'walk the streets');

  await page.evaluate(() => { window.location.hash = '#/shop'; });
  await page.waitForTimeout(200);
  await click('[data-act="buy"]', 'buy an item');

  await page.evaluate(() => { window.location.hash = '#/inventory'; });
  await page.waitForTimeout(200);
  await click('[data-act="equip"]', 'equip something');

  await page.evaluate(() => { window.location.hash = '#/players'; });
  await page.waitForTimeout(300);
  await click('[data-act="attack"]:not(.off)', 'open attack screen');
  await page.waitForTimeout(200);
  await click('[data-act="doattack"]:not(.off)', 'attack somebody');
  await page.waitForTimeout(300);
  const finished = await click('[data-act="finish"][data-id="mug"]', 'mug them');
  const fightText = await page.evaluate(() => {
    const el = document.querySelector('.fightlog');
    return el ? el.innerText.split('\n').slice(0, 4).join(' | ') : '(no fight log)';
  });
  console.log('  FIGHT: ' + fightText.slice(0, 200));

  await page.evaluate(() => { window.location.hash = '#/ladder'; });
  await page.waitForTimeout(250);
  const ladder = await page.evaluate(() => ({
    rows: document.querySelectorAll('.col-mid table.t tr').length - 1,
    gf: (document.querySelector('.tag.gf') || {}).textContent || '(none)',
  }));
  console.log('  LADDER rows=' + ladder.rows + ' gf=' + ladder.gf);

  await page.evaluate(() => { window.location.hash = '#/forum'; });
  await page.waitForTimeout(200);
  await click('[data-act="board"]', 'open a board');
  await click('[data-act="thread"]', 'open a thread');

  await page.evaluate(() => { window.location.hash = '#/mail'; });
  await page.waitForTimeout(200);
  await click('.mrow', 'open a mail');

  await page.evaluate(() => { window.location.hash = '#/bank'; });
  await page.waitForTimeout(200);
  await click('[data-act="depositall"]', 'deposit everything');

  await page.evaluate(() => { window.location.hash = '#/vote'; });
  await page.waitForTimeout(200);
  await click('[data-act="vote"]', 'vote for points');

  await page.evaluate(() => { window.location.hash = '#/trade'; });
  await page.waitForTimeout(200);
  await click('[data-act="refill"][data-id="will"]:not(.off)', 'refill will with points');

  await page.evaluate(() => { window.location.hash = '#/casino'; });
  await page.waitForTimeout(200);
  await click('[data-act="slots"]', 'pull the slots');

  await page.evaluate(() => { window.location.hash = '#/truckstop'; });
  await page.waitForTimeout(200);
  await click('[data-act="kitbuy"]:not(.off)', 'buy truck stop kit');

  await page.evaluate(() => { window.location.hash = '#/family'; });
  await page.waitForTimeout(200);
  await click('[data-act="joinfam"]:not(.off)', 'join a family');

  // shoutbox
  await page.fill('#shout-in', 'test test is this thing on');
  await click('[data-act="shout"]', 'post to shoutbox');

  // ---- let the sim run ----
  console.log('SIM (running 12s of live ticks)');
  const t0 = await page.evaluate(() => ({
    chat: document.querySelectorAll('#shout .ln').length,
    news: document.querySelectorAll('#newsfeed .ln').length,
  }));
  await page.waitForTimeout(12000);
  const t1 = await page.evaluate(() => ({
    chat: document.querySelectorAll('#shout .ln').length,
    news: document.querySelectorAll('#newsfeed .ln').length,
    online: document.querySelectorAll('#onlist .u').length,
  }));
  console.log('  chat ' + t0.chat + ' -> ' + t1.chat + ', news ' + t0.news + ' -> ' + t1.news + ', online ' + t1.online);

  // ---- save / reload ----
  console.log('PERSISTENCE');
  const saveInfo = await page.evaluate(() => {
    let k = null, len = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.indexOf('exmafia') === 0) { k = key; len = localStorage.getItem(key).length; }
      }
    } catch (e) { return { err: e.message }; }
    return { key: k, bytes: len };
  });
  console.log('  storage: ' + JSON.stringify(saveInfo));

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => {
    const mast = document.querySelector('.mast-right');
    return {
      name: mast ? mast.innerText.split('\n')[0] : '(none)',
      splash: !!document.querySelector('#ng-name'),
      boxes: document.querySelectorAll('.box').length,
    };
  });
  console.log('  after reload: ' + JSON.stringify(after));
  if (after.splash) errors.push('PERSISTENCE: save did not restore, splash shown again');

  await page.screenshot({ path: path.resolve(__dirname, '..', 'shot-city.png'), fullPage: false });
  await page.evaluate(() => { window.location.hash = '#/ladder'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve(__dirname, '..', 'shot-ladder.png'), fullPage: false });

  console.log('\nERRORS: ' + errors.length);
  errors.slice(0, 40).forEach(e => console.log('  * ' + e.slice(0, 400)));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('HARNESS FAILED', e); process.exit(2); });
