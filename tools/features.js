/* Organised Crime and the Notice Board, driven end to end. */
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
  await page.fill('#ng-name', 'FeatureTester');
  await page.click('[data-act="startgame"]');
  await page.waitForTimeout(1500);

  const click = async sel => page.evaluate(s => {
    const e = document.querySelector(s);
    if (!e) return false;
    e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }, sel).then(async r => { await page.waitForTimeout(200); return r; });
  const read = fn => page.evaluate(fn);
  const go = async r => { await page.evaluate(x => { window.location.hash = '#/' + x; }, r); await page.waitForTimeout(250); };

  const res = [];
  async function step(label, fn) {
    const before = errs.length;
    let note = '';
    try { note = (await fn()) || ''; } catch (e) { errs.push('STEP ' + label + ': ' + e.message); note = 'threw ' + e.message; }
    const bad = errs.length - before;
    res.push(bad === 0);
    console.log(`  ${bad ? 'ERR ' : 'ok  '} ${label}${note ? '  — ' + note : ''}`);
  }

  // make the player capable and put them in a family with a real crew
  await page.evaluate(() => {
    const E = window.EXM, P = E.S.player;
    P.level = 60; E.GAME.progress.applyLevel(P);
    P.xp = E.GAME.progress.xpForLevel(60);
    P.money = 5e8; P.points = 5000; P.nerve = P.nerveMax; P.energy = P.energyMax;
    P.str = 9000; P.def = 9000; P.spd = 9000; P.dex = 9000; P.iq = 9000;
    P.health = P.healthMax; P.attacks = 20;
    // level the roster up so a crew exists that can pass real roles
    E.S.npcs.forEach(n => { n.str = 6000; n.def = 6000; n.spd = 6000; n.dex = 6000; n.iq = 6000; n.level = 55; n.hospUntil = 0; n.jailUntil = 0; });
    const f = E.GAME.family.ranked()[0];
    P.fam = f.id; P.famRole = 'boss'; f.leader = 0; f.playerMember = true;
    // make sure the family is big enough for the biggest job
    E.S.npcs.slice(0, 12).forEach(n => { if (f.members.indexOf(n.id) < 0) { f.members.push(n.id); n.fam = f.id; } });
    E.GAME.ui.render();
  });

  console.log('ORGANISED CRIME');
  await step('the page lists jobs', async () => {
    await go('oc');
    const n = await read(() => document.querySelectorAll('.col-mid table.t tr').length - 1);
    const bench = await read(() => window.EXM.GAME.oc.bench().length);
    return n + ' jobs listed, ' + bench + ' people on the bench';
  });

  await step('open a job and auto-pick a crew', async () => {
    await click('[data-act="ocopen"]');
    const r = await read(() => {
      const j = window.EXM.GAME.oc.get(window.EXM.S.ocJob);
      const rd = window.EXM.GAME.oc.readiness(j);
      return { job: j.name, roles: j.roles.length, filled: rd.filled, chance: Math.round(rd.chance * 100) };
    });
    return '"' + r.job + '", ' + r.filled + '/' + r.roles + ' roles filled, ' + r.chance + '% chance';
  });

  await step('changing one crew member changes the odds', async () => {
    const before = await read(() => Math.round(window.EXM.GAME.oc.readiness(window.EXM.GAME.oc.get(window.EXM.S.ocJob)).chance * 100));
    await page.evaluate(() => {
      const E = window.EXM;
      const j = E.GAME.oc.get(E.S.ocJob);
      const weak = E.GAME.oc.bench().sort((a, b) => a[j.roles[0].stat] - b[j.roles[0].stat])[0];
      weak[j.roles[0].stat] = 1;
      E.GAME.oc.assign(j.roles[0].id, weak.id);
      E.GAME.ui.render();
    });
    const after = await read(() => Math.round(window.EXM.GAME.oc.readiness(window.EXM.GAME.oc.get(window.EXM.S.ocJob)).chance * 100));
    return before + '% -> ' + after + '% after putting a useless man in the first role';
  });

  await step('run the job', async () => {
    await click('[data-act="ocauto"]');
    await click('[data-act="ocrun"]');
    const r = await read(() => {
      const R = window.EXM.S.lastOc;
      return R ? { ok: R.success, cut: R.cut, blown: R.blown, weak: R.weak ? (R.weak.member || {}).name : null } : null;
    });
    if (!r) return 'no result recorded';
    return r.ok ? ('came off, cut ' + '$' + r.cut.toLocaleString()) : ('fell apart, ' + r.blown + ' role(s) blown' + (r.weak ? ' (' + r.weak + ')' : ''));
  });

  await step('the cooldown bites', async () => {
    const again = await read(() => window.EXM.GAME.oc.canRun(window.EXM.GAME.oc.get(window.EXM.S.ocJob)));
    return again ? '"' + again.slice(0, 60) + '"' : 'WRONG: it let me run it twice';
  });

  await step('crew members were paid and their opinion moved', async () => {
    return await read(() => {
      const E = window.EXM;
      const R = E.S.lastOc;
      if (!R) return 'no job run';
      const m = R.results.map(x => x.member).filter(Boolean)[0];
      return m ? (m.name + ' now has $' + Math.round(m.money).toLocaleString() + ' and thinks ' + Math.round(m.op) + ' of you') : 'no crew';
    });
  });

  await step('AI families run their own jobs', async () => {
    const before = await read(() => window.EXM.S.news.length);
    await page.evaluate(() => window.EXM.GAME.oc.npcTick(300));
    const after = await read(() => window.EXM.S.news.length);
    const line = await read(() => {
      const n = window.EXM.S.news.filter(x => /crew|took|pulled|job|split|walked/i.test(x.x));
      return n.length ? n[n.length - 1].x : '';
    });
    return (after - before) + ' news lines from 300 game-hours of other families working';
  });

  console.log('\nTHE NOTICE BOARD');
  await step('the board has postings', async () => {
    await go('board');
    const b = await read(() => window.EXM.GAME.contracts.board().map(c => ({ k: c.kind, t: c.title.slice(0, 46), r: c.reward })));
    b.slice(0, 4).forEach(x => console.log('        [' + x.k + '] "' + x.t + '"  $' + x.r.toLocaleString()));
    return b.length + ' up';
  });

  await step('accept up to the limit, then refuse', async () => {
    for (let i = 0; i < 5; i++) await click('[data-act="conaccept"]');
    const n = await read(() => window.EXM.GAME.contracts.active().length);
    const err = await read(() => {
      const b = window.EXM.GAME.contracts.board();
      return b.length ? (window.EXM.GAME.contracts.accept(b[0].id).err || 'accepted a fourth (WRONG)') : 'board empty';
    });
    return n + ' active; a further one was refused: "' + String(err).slice(0, 44) + '"';
  });

  await step('a "hit" contract completes when the target goes to hospital', async () => {
    return await read(() => {
      const E = window.EXM;
      // force one of the known kinds onto the active list so the hook is exercised
      const t = E.S.npcs.find(n => !n.dead && !E.GAME.ladder.busy(n) && n.fam !== E.S.player.fam && E.GAME.ladder.canAttack(n.id).ok);
      if (!t) return 'no legal target (family rule and newbie shield both hold)';
      const c = { id: 99001, kind: 'hit', by: E.S.npcs[1].id, byName: E.S.npcs[1].name, target: t.id, targetName: t.name,
        reward: 50000, points: 5, rep: 9, posted: Date.now(), expires: Date.now() + 3600000, taken: Date.now(),
        snap: { crimes: E.S.player.st.crimes, stat: 0, hosp: 0 }, title: 'x', body: 'x' };
      E.GAME.contracts.active().push(c);
      const wasDone = E.GAME.contracts.isDone(c);
      E.S.cd = {};
      E.S.player.attacks = 9; E.S.player.energy = 9999; E.S.player.health = E.S.player.healthMax;
      const r = E.GAME.ladder.attack(t.id);
      if (r.err) return 'attack refused: ' + r.err;
      if (!r.fight.win) return 'lost the fight, cannot test the hook';
      E.GAME.ladder.finish('hosp');
      const nowDone = E.GAME.contracts.isDone(c);
      return 'before the fight done=' + wasDone + ', after hospitalising them done=' + nowDone;
    });
  });

  await step('claim it and get paid', async () => {
    return await read(() => {
      const E = window.EXM, P = E.S.player;
      const before = P.money, pts = P.points;
      const c = E.GAME.contracts.active().find(x => x.id === 99001);
      if (!c) return 'contract gone';
      const poster = E.byId(c.by);
      const opBefore = Math.round(poster.op);
      const r = E.GAME.contracts.claim(99001);
      if (r.err) return 'claim refused: ' + r.err;
      return '+$' + Math.round(P.money - before).toLocaleString() + ', +' + (P.points - pts) +
        ' points, poster opinion ' + opBefore + ' -> ' + Math.round(poster.op);
    });
  });

  await step('a "crime" contract tracks crimes done', async () => {
    return await read(() => {
      const E = window.EXM, P = E.S.player;
      const c = { id: 99002, kind: 'crime', by: E.S.npcs[2].id, byName: E.S.npcs[2].name, n: 3,
        reward: 10000, points: 2, rep: 4, posted: Date.now(), expires: Date.now() + 3600000, taken: Date.now(),
        snap: { crimes: P.st.crimes, stat: 0, hosp: 0 }, title: 'x', body: 'x' };
      E.GAME.contracts.active().push(c);
      const a = E.GAME.contracts.progress(c);
      for (let i = 0; i < 4; i++) { P.nerve = P.nerveMax; E.GAME.crimes.commit(E.GAME.crimes.list()[0].id); }
      const b = E.GAME.contracts.progress(c);
      return a.have + '/' + a.need + '  ->  ' + b.have + '/' + b.need + ', done=' + E.GAME.contracts.isDone(c);
    });
  });

  await step('dropping a job costs you with the poster', async () => {
    return await read(() => {
      const E = window.EXM;
      const c = E.GAME.contracts.active()[0];
      if (!c) return 'nothing active';
      const poster = E.byId(c.by);
      const before = Math.round(poster.op);
      E.GAME.contracts.drop(c.id);
      return poster.name + ' opinion ' + before + ' -> ' + Math.round(poster.op);
    });
  });

  await step('the board restocks itself', async () => {
    const before = await read(() => window.EXM.GAME.contracts.board().length);
    await page.evaluate(() => { for (let i = 0; i < 60; i++) window.EXM.GAME.contracts.tick(Date.now()); });
    const after = await read(() => window.EXM.GAME.contracts.board().length);
    return before + ' -> ' + after + ' postings';
  });

  await step('The Pack panel shows where I sit', async () => {
    await go('city');
    const txt = await read(() => {
      const b = Array.from(document.querySelectorAll('.col-mid .box')).find(x => /The Pack/.test(x.textContent));
      return b ? b.innerText.split('\n').slice(1, 3).join(' ').slice(0, 150) : 'MISSING';
    });
    return txt;
  });

  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' clean');
  console.log('ERRORS ' + errs.length);
  errs.slice(0, 10).forEach(e => console.log('  * ' + e.slice(0, 260)));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('HARNESS FAILED', e); process.exit(2); });
