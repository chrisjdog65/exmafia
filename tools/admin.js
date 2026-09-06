/* Open the back office the way a player would, then work every tab. */
const { chromium } = require('playwright-core');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'exmafia.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + (e.stack || e.message)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForSelector('#ng-name');
  await page.fill('#ng-name', 'AdminTester');
  await page.click('[data-act="startgame"]');
  await page.waitForTimeout(1500);

  const click = async sel => {
    const found = await page.evaluate(s => {
      const e = document.querySelector(s);
      if (!e) return false;
      e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }, sel);
    await page.waitForTimeout(180);
    return found;
  };
  const read = fn => page.evaluate(fn);

  // --- the knock: six quick clicks on CITY ---
  console.log('THE KNOCK');
  for (let i = 0; i < 5; i++) await click('[data-nav="city"]');
  let openAfter5 = await read(() => !!document.getElementById('adminpanel'));
  await click('[data-nav="city"]');
  let openAfter6 = await read(() => !!document.getElementById('adminpanel'));
  console.log('  after 5 quick clicks: ' + (openAfter5 ? 'OPEN (wrong)' : 'closed, correct'));
  console.log('  after 6 quick clicks: ' + (openAfter6 ? 'OPEN, correct' : 'closed (WRONG)'));

  // slow clicks must not open it
  await click('[data-adm="close"]');
  for (let i = 0; i < 6; i++) { await click('[data-nav="city"]'); await page.waitForTimeout(500); }
  const slow = await read(() => !!document.getElementById('adminpanel'));
  console.log('  6 slow clicks (500ms apart): ' + (slow ? 'OPEN (wrong)' : 'stayed closed, correct'));
  for (let i = 0; i < 6; i++) await click('[data-nav="city"]');

  const tabs = await read(() => Array.from(document.querySelectorAll('.admtabs a')).map(a => a.getAttribute('data-id')));
  console.log('\nTABS: ' + tabs.join(', '));

  const results = [];
  async function step(label, fn) {
    const before = errs.length;
    let note = '';
    try { note = (await fn()) || ''; } catch (e) { errs.push('STEP ' + label + ': ' + e.message); note = 'threw ' + e.message; }
    const bad = errs.length - before;
    results.push(bad === 0);
    console.log(`  ${bad ? 'ERR ' : 'ok  '} ${label}${note ? '  — ' + note : ''}`);
  }

  console.log('\nEVERY TAB RENDERS');
  for (const t of tabs) {
    await step('tab: ' + t, async () => {
      await click(`.admtabs a[data-id="${t}"]`);
      const info = await read(() => ({
        n: document.querySelectorAll('#adminpanel .admsect, #adminpanel table').length,
        crash: (document.querySelector('#adminpanel .admbody') || {}).innerText?.indexOf('at Object') >= 0,
      }));
      if (info.crash) throw new Error('tab crashed');
      return info.n + ' sections';
    });
  }

  console.log('\nEDITING');
  await step('set money by typing into the field', async () => {
    await click('.admtabs a[data-id="you"]');
    await page.evaluate(() => {
      const el = document.querySelector('[data-adm-live="S.player.money"]');
      el.value = '123456789';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    return '$' + (await read(() => Math.round(window.EXM.S.player.money))).toLocaleString();
  });

  await step('+50 levels', async () => {
    await click('[data-adm="lvl50"]');
    return 'level ' + (await read(() => window.EXM.S.player.level)) + ', rank ' +
      (await read(() => window.EXM.GAME.progress.rankFor(window.EXM.S.player.xp).name));
  });

  await step('jump to the top rank (uncapped)', async () => {
    await click('[data-adm="maxrank"]');
    return 'level ' + (await read(() => window.EXM.S.player.level)) + ', rank ' +
      (await read(() => window.EXM.GAME.progress.rankFor(window.EXM.S.player.xp).name));
  });

  await step('put me on rung 1', async () => {
    await click('.admtabs a[data-id="ladder"]');
    await click('[data-adm="ladme1"]');
    return 'rung ' + (await read(() => window.EXM.GAME.ladder.rungOf(0))) +
      ', godfather=' + (await read(() => window.EXM.GAME.ladder.isGodfather(0)));
  });

  await step('reorder a rung', async () => {
    const before = await read(() => window.EXM.GAME.ladder.roster().slice(0, 3).join(','));
    await click('[data-adm="laddown"][data-n="1"]');
    const after = await read(() => window.EXM.GAME.ladder.roster().slice(0, 3).join(','));
    return before + '  ->  ' + after;
  });

  await step('run 50 game-hours of challenges', async () => {
    await click('[data-adm="ladchal"]');
    return await read(() => (document.querySelector('.admmsg') || {}).textContent || '');
  });

  await step('edit an NPC', async () => {
    await click('.admtabs a[data-id="npcs"]');
    await click('[data-adm="pick"]');
    const nm = await read(() => { const n = window.EXM.byId(window.EXM.S.npcs[0].id); return n.name; });
    await page.evaluate(() => {
      const el = document.querySelector('[data-adm-live^="S.npcs."][data-adm-live$=".level"]');
      el.value = '250';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    const lv = await read(() => Math.max.apply(null, window.EXM.S.npcs.map(n => n.level)));
    return 'highest NPC level is now ' + lv;
  });

  await step('bulk: everybody +5 levels', async () => {
    await click('[data-adm="bulklvl"]');
    const med = await read(() => { const l = window.EXM.S.npcs.map(n => n.level).sort((a, b) => a - b); return l[Math.floor(l.length / 2)]; });
    return 'median NPC level ' + med;
  });

  await step('edit a content table (crime payout)', async () => {
    await click('.admtabs a[data-id="data"]');
    await page.evaluate(() => {
      const el = document.querySelector('[data-adm-live="DATA.crimes.0.pay"]');
      el.value = '[999,1000]';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    return 'crime 0 now pays ' + JSON.stringify(await read(() => window.EXM.DATA.crimes[0].pay));
  });

  await step('edit a tuning constant', async () => {
    await click('.admtabs a[data-id="config"]');
    await page.evaluate(() => {
      const el = document.querySelector('[data-adm-live="CFG.LADDER_PTS_HOUR"]');
      el.value = '99';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    return 'ladder pays ' + (await read(() => window.EXM.CFG.LADDER_PTS_HOUR)) + ' points an hour';
  });

  await step('raw browser: dig into S.player.st and change a value', async () => {
    await click('.admtabs a[data-id="browse"]');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[data-adm="crumb"]')).find(x => x.getAttribute('data-id') === 'S.player');
      b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[data-adm="crumb"]')).find(x => x.getAttribute('data-id') === 'S.player.st');
      if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    const path2 = await read(() => window.EXM.GAME.admin.browse ? '' : '');
    await page.evaluate(() => {
      const el = document.querySelector('[data-adm-live="S.player.st.crimes"]');
      if (el) { el.value = '4242'; el.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await page.waitForTimeout(200);
    return 'crimes stat = ' + (await read(() => window.EXM.S.player.st.crimes));
  });

  await step('world: run the city forward a month', async () => {
    await click('.admtabs a[data-id="world"]');
    const before = await read(() => { const l = window.EXM.S.npcs.map(n => n.level).sort((a, b) => a - b); return l[Math.floor(l.length / 2)]; });
    await click('[data-adm="fw30d"]');
    await page.waitForTimeout(700);
    const after = await read(() => { const l = window.EXM.S.npcs.map(n => n.level).sort((a, b) => a - b); return l[Math.floor(l.length / 2)]; });
    return 'median NPC level ' + before + ' -> ' + after;
  });

  await step('world: make somebody jump me', async () => {
    await click('[data-adm="evAttackMe"]');
    return await read(() => (document.querySelector('.admmsg') || {}).textContent || '');
  });

  await step('economy: give me one of every item', async () => {
    await click('.admtabs a[data-id="economy"]');
    await click('[data-adm="allitems"]');
    return (await read(() => Object.keys(window.EXM.S.player.inv).length)) + ' item lines in the inventory';
  });

  await step('feeds: shout as somebody and print news', async () => {
    await click('.admtabs a[data-id="feeds"]');
    await page.evaluate(() => {
      document.getElementById('adm-say').value = 'the back office was here';
      document.getElementById('adm-news').value = 'A test of the emergency broadcast system.';
    });
    await click('[data-adm="postsay"]');
    await click('[data-adm="postnews"]');
    const last = await read(() => window.EXM.S.chat[window.EXM.S.chat.length - 1].x);
    return 'last shout: "' + last + '"';
  });

  await step('save: rebuild the city fresh', async () => {
    await click('.admtabs a[data-id="save"]');
    const nameBefore = await read(() => window.EXM.S.player.name);
    await click('[data-adm="regenFresh"]');
    await page.waitForTimeout(400);
    const st = await read(() => ({
      name: window.EXM.S.player.name,
      lvls: [...new Set(window.EXM.S.npcs.map(n => n.level))],
      n: window.EXM.S.npcs.length,
      myLvl: window.EXM.S.player.level,
    }));
    return 'kept ' + nameBefore + ' at level ' + st.myLvl + '; ' + st.n + ' accounts all at level ' + st.lvls.join('/');
  });

  await step('close and reopen, edits persisted', async () => {
    await click('[data-adm="close"]');
    const gone = await read(() => !document.getElementById('adminpanel'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const kept = await read(() => ({ pts: window.EXM.CFG.LADDER_PTS_HOUR, pay: window.EXM.DATA.crimes[0].pay }));
    return 'panel closed=' + gone + '; after reload ladder pays ' + kept.pts + '/hr';
  });

  console.log('\n' + results.filter(Boolean).length + '/' + results.length + ' admin operations clean');
  console.log('ERRORS ' + errs.length);
  errs.slice(0, 12).forEach(e => console.log('  * ' + e.slice(0, 260)));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('HARNESS FAILED', e); process.exit(2); });
