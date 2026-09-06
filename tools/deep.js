/* Long-run simulation checks: presence, ladder churn, offline catch-up,
   economy sanity and state integrity. */
const { chromium } = require('playwright-core');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'exmafia.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-dev-shm-usage'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForSelector('#ng-name');
  await page.fill('#ng-name', 'DeepTester');
  await page.click('[data-act="startgame"]');
  await page.waitForTimeout(1200);

  // --- 1. presence across a simulated 24 hours ---
  const presence = await page.evaluate(() => {
    const E = window.EXM, out = [];
    const base = Date.now();
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 12; m++) {
        const t = base + h * 3600000 + m * 300000;
        E.setClock(t);
        E.GAME.sim.updatePresence(t, true);
      }
      out.push(E.GAME.sim.onlineList().length);
    }
    E.realClock();
    return out;
  });
  const mx = Math.max(...presence), mn = Math.min(...presence);
  const avg = (presence.reduce((a, b) => a + b, 0) / presence.length).toFixed(1);
  console.log('PRESENCE over 24h  min=' + mn + ' avg=' + avg + ' max=' + mx);
  console.log('  hourly: ' + presence.join(' '));

  // --- 2. offline catch-up over 7 days ---
  const before = await page.evaluate(() => {
    const E = window.EXM, S = E.S;
    return {
      ladder: E.GAME.ladder.roster().map(id => (E.byId(id) || {}).name),
      lvls: S.npcs.map(n => n.level),
      byId: (() => { const m = {}; S.npcs.forEach(n => m[n.id] = { lvl: n.level, money: n.money, str: n.str, xp: n.xp }); return m; })(),
      fams: S.fams.length,
      dead: S.npcs.filter(n => n.dead).length,
      npcs: S.npcs.length,
      chat: S.chat.length, news: S.news.length,
      mail: S.mail.length,
      money: S.player.money + S.player.bank,
      threads: S.forum.threads.length,
    };
  });

  const t0 = Date.now();
  const cu = await page.evaluate(() => {
    const E = window.EXM;
    E.S.lastSeen = Date.now() - 7 * 86400000;
    const a = performance.now();
    const sum = E.GAME.sim.catchUp(Date.now());
    return { ms: Math.round(performance.now() - a), sum: { attacks: sum.attacks.length, losses: sum.losses, wins: sum.wins, mail: sum.newMail, money: sum.moneyDelta, rungFrom: sum.rungFrom, rungTo: sum.rungTo } };
  });
  console.log('CATCHUP 7 days took ' + cu.ms + 'ms (wall ' + (Date.now() - t0) + 'ms)');
  console.log('  summary: ' + JSON.stringify(cu.sum));

  const after = await page.evaluate(() => {
    const E = window.EXM, S = E.S;
    return {
      ladder: E.GAME.ladder.roster().map(id => (E.byId(id) || {}).name),
      lvls: S.npcs.map(n => n.level),
      byId: (() => { const m = {}; S.npcs.forEach(n => m[n.id] = { lvl: n.level, money: n.money, str: n.str, xp: n.xp }); return m; })(),
      fams: S.fams.length,
      dead: S.npcs.filter(n => n.dead).length,
      npcs: S.npcs.length,
      chat: S.chat.length, news: S.news.length,
      mail: S.mail.length,
      money: S.player.money + S.player.bank,
      threads: S.forum.threads.length,
      hitlist: S.hitlist.length,
      hosp: S.npcs.filter(n => n.hospUntil > Date.now()).length,
      jail: S.npcs.filter(n => n.jailUntil > Date.now()).length,
    };
  });

  const stillThere = after.ladder.filter(n => before.ladder.indexOf(n) >= 0).length;
  const changed = after.ladder.filter((n, i) => n !== before.ladder[i]).length;
  const avgL = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log('LADDER churn: ' + changed + '/' + after.ladder.length + ' rungs moved, ' + stillThere + '/' + after.ladder.length + ' of the old names still on it');
  console.log('  before: ' + before.ladder.slice(0, 6).join(', '));
  console.log('  after : ' + after.ladder.slice(0, 6).join(', '));
  console.log('NPCS  count ' + before.npcs + ' -> ' + after.npcs + ', retired ' + before.dead + ' -> ' + after.dead);
  console.log('LEVELS avg ' + avgL(before.lvls) + ' -> ' + avgL(after.lvls) + ' max ' + Math.max(...after.lvls));
  {
    const ids = Object.keys(before.byId).filter(id => after.byId[id]);
    const dL = ids.map(id => after.byId[id].lvl - before.byId[id].lvl);
    const dS = ids.map(id => after.byId[id].str - before.byId[id].str);
    const dM = ids.map(id => after.byId[id].money - before.byId[id].money);
    const grew = dL.filter(x => x > 0).length;
    console.log('  survivors ' + ids.length + ': avg +' + avgL(dL) + ' levels, ' + grew + ' gained a level, avg +' +
      avgL(dS) + ' strength, avg money ' + (dM.reduce((a,b)=>a+b,0)/ids.length).toFixed(0));
    console.log('  biggest gainers: +' + dL.slice().sort((a,b)=>b-a).slice(0,5).join(' +'));
  }
  console.log('FEEDS chat ' + before.chat + '->' + after.chat + ' news ' + before.news + '->' + after.news +
    ' mail ' + before.mail + '->' + after.mail + ' threads ' + before.threads + '->' + after.threads);
  console.log('WORLD hospital=' + after.hosp + ' jail=' + after.jail + ' hitlist=' + after.hitlist + ' families=' + after.fams);

  // --- 3. state integrity ---
  const bad = await page.evaluate(() => {
    const S = window.EXM.S, problems = [];
    function chk(obj, label, keys) {
      keys.forEach(k => {
        const v = obj[k];
        if (v === undefined) problems.push(label + '.' + k + ' undefined');
        else if (typeof v === 'number' && !isFinite(v)) problems.push(label + '.' + k + ' = ' + v);
      });
    }
    chk(S.player, 'player', ['level', 'xp', 'money', 'bank', 'str', 'def', 'spd', 'dex', 'iq', 'energy', 'will', 'nerve', 'dexg', 'health', 'attacks', 'points', 'respect']);
    S.npcs.forEach((n, i) => {
      if (i > 40) return;
      chk(n, 'npc[' + i + ']', ['level', 'xp', 'money', 'str', 'def', 'spd', 'dex', 'iq', 'health', 'healthMax', 'rung']);
      if (n.money < 0) problems.push(n.name + ' has negative money ' + Math.round(n.money));
      if (n.health > n.healthMax + 1) problems.push(n.name + ' hp over max');
    });
    const seen = {};
    S.ladder.forEach(id => { if (seen[id]) problems.push('duplicate ladder entry ' + id); seen[id] = 1; });
    if (S.ladder.length !== 20) problems.push('ladder length ' + S.ladder.length);
    if (S.npcs.filter(n => !n.dead).length !== 200) problems.push('living roster is ' + S.npcs.filter(n => !n.dead).length + ', should be 200');
    if (S.player.lab !== undefined) problems.push('the old duplicate Labour stat is back');
    const names = {};
    S.npcs.forEach(n => { if (names[n.name]) problems.push('duplicate name ' + n.name); names[n.name] = 1; });
    return problems;
  });
  console.log('INTEGRITY ' + (bad.length ? bad.length + ' problems' : 'clean'));
  bad.slice(0, 20).forEach(b => console.log('  ! ' + b));

  // --- 4. a long catch-up (14 days, the cap) for performance ---
  const cu2 = await page.evaluate(() => {
    const E = window.EXM;
    E.S.lastSeen = Date.now() - 40 * 86400000;
    const a = performance.now();
    const s = E.GAME.sim.catchUp(Date.now());
    return { ms: Math.round(performance.now() - a), capped: s.capped, attacks: s.attacks.length };
  });
  console.log('CATCHUP 40 days (capped at 14) ' + cu2.ms + 'ms capped=' + cu2.capped + ' attacks=' + cu2.attacks);

  // --- 5. save size & round trip ---
  const sz = await page.evaluate(() => {
    const E = window.EXM;
    const txt = E.GAME.save.exportText();
    let ok = false;
    try { const o = JSON.parse(txt); ok = !!(o.player && o.npcs && o.npcs.length); } catch (e) {}
    return { kb: Math.round(txt.length / 1024), parses: ok };
  });
  console.log('SAVE ' + sz.kb + ' KB, parses=' + sz.parses);

  // --- 6. chat authenticity sample ---
  const sample = await page.evaluate(() => window.EXM.S.chat.slice(-14).map(c => c.n + ': ' + c.x));
  console.log('CHAT SAMPLE');
  sample.forEach(l => console.log('  ' + l));

  const newsSample = await page.evaluate(() => window.EXM.S.news.slice(-12).map(c => c.x));
  console.log('NEWS SAMPLE');
  newsSample.forEach(l => console.log('  ' + l));

  const leftover = await page.evaluate(() => {
    const S = window.EXM.S;
    const all = S.news.map(n => n.x).concat(S.chat.map(c => c.x));
    return all.filter(x => /\{\w+\}/.test(x)).slice(0, 8);
  });
  console.log('UNSUBSTITUTED SLOTS: ' + (leftover.length ? leftover.length : 'none'));
  leftover.forEach(l => console.log('  ! ' + l));

  console.log('\nERRORS ' + errs.length);
  errs.slice(0, 15).forEach(e => console.log('  * ' + e.slice(0, 300)));
  await browser.close();
})().catch(e => { console.error('HARNESS FAILED', e); process.exit(2); });
