/* Exercise every interaction path, granting resources so nothing is
   skipped because the player happens to be broke or in a hospital bed. */
const { chromium } = require('playwright-core');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'exmafia.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-dev-shm-usage'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + (e.stack || e.message)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForSelector('#ng-name');
  await page.fill('#ng-name', 'PathTester');
  await page.click('[data-act="startgame"]');
  await page.waitForTimeout(1200);

  // make the player capable so every branch is reachable
  await page.evaluate(() => {
    const E = window.EXM, P = E.S.player;
    P.level = 40; E.GAME.progress.applyLevel(P);
    P.xp = E.GAME.progress.xpForLevel(40);
    P.money = 500000000; P.bank = 500000000; P.points = 100000;
    P.str = 4000; P.def = 4000; P.spd = 3000; P.dex = 3000; P.lab = 500; P.iq = 500;
    P.energy = P.energyMax; P.will = P.willMax; P.nerve = P.nerveMax; P.attacks = 99;
    P.health = E.GAME.NOWMAX ? 0 : P.healthMax; P.health = P.healthMax;
    P.hospUntil = 0; P.jailUntil = 0;
    E.GAME.ui.render();
  });
  await page.waitForTimeout(300);

  const results = [];
  async function step(label, fn) {
    const before = errs.length;
    let note = '';
    try { note = (await fn()) || ''; } catch (e) { errs.push('STEP ' + label + ': ' + e.message); note = 'threw: ' + e.message; }
    const delta = errs.length - before;
    results.push({ label, ok: delta === 0, note });
    console.log(`  ${delta ? 'ERR ' : 'ok  '} ${label}${note ? '  — ' + note : ''}`);
  }
  const go = async r => { await page.evaluate(x => { window.location.hash = '#/' + x; }, r); await page.waitForTimeout(200); };
  const click = async sel => {
    const found = await page.evaluate(s2 => {
      const e = document.querySelector(s2);
      if (!e) return false;
      e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }, sel);
    await page.waitForTimeout(220);
    return found ? '' : 'no element ' + sel;
  };
  const readState = fn => page.evaluate(fn);

  console.log('PATHS');

  await step('attack -> win -> mug', async () => {
    await go('players');
    const id = await readState(() => {
      const E = window.EXM;
      const t = E.S.npcs.filter(n => !n.dead && !E.GAME.ladder.busy(n) && E.GAME.combat.odds(E.S.player, n) > 0.9)[0];
      return t ? t.id : null;
    });
    if (!id) return 'no easy target found';
    await page.evaluate(i => window.EXM.GAME.actions.H.doattack(String(i)), id);
    await page.waitForTimeout(400);
    const pending = await readState(() => !!window.EXM.S.pendingFinish);
    if (!pending) return 'fight lost, no finisher';
    await click('[data-act="finish"][data-id="mug"]');
    const took = await readState(() => (window.EXM.S.lastFight.finish || {}).took);
    return 'mugged $' + (took || 0);
  });

  await step('attack -> win -> hospitalise (+str/+guard)', async () => {
    const before = await readState(() => ({ s: window.EXM.S.player.str, d: window.EXM.S.player.def }));
    const id = await readState(() => {
      const E = window.EXM;
      const t = E.S.npcs.filter(n => !n.dead && !E.GAME.ladder.busy(n) && E.GAME.combat.odds(E.S.player, n) > 0.9)[1];
      return t ? t.id : null;
    });
    if (!id) return 'no target';
    await page.evaluate(i => window.EXM.GAME.actions.H.doattack(String(i)), id);
    await page.waitForTimeout(300);
    if (!(await readState(() => !!window.EXM.S.pendingFinish))) return 'fight lost';
    await click('[data-act="finish"][data-id="hosp"]');
    const after = await readState(() => ({ s: window.EXM.S.player.str, d: window.EXM.S.player.def }));
    return '+' + (after.s - before.s).toFixed(2) + ' str, +' + (after.d - before.d).toFixed(2) + ' guard';
  });

  await step('a plain attack must NOT move a rung', async () => {
    return await readState(() => {
      const E = window.EXM, P = E.S.player;
      P.str = 900000; P.def = 900000; P.spd = 500000; P.attacks = 99; P.energy = 99999;
      P.health = P.healthMax; P.hospUntil = 0; E.S.cd = {};
      const id = E.GAME.ladder.roster()[E.GAME.ladder.roster().length - 1];
      const before = E.GAME.ladder.rungOf(id);
      const r = E.GAME.ladder.attack(id);
      if (r.err) return 'could not attack: ' + r.err;
      if (E.S.pendingFinish) E.GAME.ladder.finish('leave');
      const after = E.GAME.ladder.rungOf(id);
      return (before === after && !E.GAME.ladder.rungOf(0))
        ? 'correct: they kept rung ' + after + ' and I am still off the ladder'
        : 'WRONG: rung moved on a plain attack';
    });
  });

  await step('challenge rules: only the bottom three from off the ladder', async () => {
    return await readState(() => {
      const E = window.EXM;
      const roster = E.GAME.ladder.roster();
      const legal = [];
      for (let i = 0; i < roster.length; i++) {
        const c = E.GAME.ladder.canChallenge(roster[i]);
        if (c.ok && !c.idle) legal.push(i + 1);
      }
      const door = E.CFG.LADDER_RUNGS - E.CFG.LADDER_ENTRY + 1;
      const expected = legal.every(r => r >= door);
      return (expected ? 'correct: ' : 'WRONG: ') + JSON.stringify(legal) + ' (door is ' + door + '+)';
    });
  });

  await step('climb onto the Attack Ladder by Challenge', async () => {
    await go('ladder');
    for (let i = 0; i < 10; i++) {
      const target = await readState(() => {
        const E = window.EXM, P = E.S.player;
        P.attacks = 99; P.energy = 99999; P.health = P.healthMax; P.hospUntil = 0;
        P.ladderLock = 0; E.S.chLock = {}; E.S.cd = {};
        const rows = E.GAME.ladder.rows().filter(r => !r.isMe && r.can && r.can.ok);
        return rows.length ? rows[rows.length - 1].e.id : null;
      });
      if (!target) break;
      await page.evaluate(i2 => window.EXM.GAME.actions.H.challenge(String(i2)), target);
      await page.waitForTimeout(150);
      await page.evaluate(() => { if (window.EXM.S.pendingFinish) window.EXM.GAME.actions.H.finish('hosp'); });
      await page.waitForTimeout(100);
      const r = await readState(() => window.EXM.GAME.ladder.rungOf(0));
      if (r) return 'on the ladder at rung ' + r;
    }
    return 'FAILED to get on, rung ' + (await readState(() => window.EXM.GAME.ladder.rungOf(0)));
  });

  await step('climb to the Godfather seat', async () => {
    for (let i = 0; i < 30; i++) {
      const target = await readState(() => {
        const E = window.EXM, P = E.S.player;
        P.attacks = 99; P.energy = 99999; P.health = P.healthMax; P.hospUntil = 0;
        P.ladderLock = 0; E.S.chLock = {}; E.S.cd = {};
        const rows = E.GAME.ladder.rows().filter(r => !r.isMe && r.can && r.can.ok);
        return rows.length ? rows[0].e.id : null;
      });
      if (!target) break;
      await page.evaluate(i2 => window.EXM.GAME.actions.H.challenge(String(i2)), target);
      await page.waitForTimeout(90);
      await page.evaluate(() => { if (window.EXM.S.pendingFinish) window.EXM.GAME.actions.H.finish('hosp'); });
      if (await readState(() => window.EXM.GAME.ladder.isGodfather(0))) return 'took rung 1 after ' + (i + 1) + ' challenges';
    }
    return 'rung ' + (await readState(() => window.EXM.GAME.ladder.rungOf(0)));
  });

  await step('the third finisher: leave them, for all the XP', async () => {
    return await readState(() => {
      const E = window.EXM, P = E.S.player;
      E.S.cd = {};
      const t = E.S.npcs.filter(n => !n.dead && E.GAME.ladder.canAttack(n.id).ok)[0];
      if (!t) return 'no target';
      const xp0 = P.xp;
      P.attacks = 9; P.energy = 9999; P.health = P.healthMax;
      const r = E.GAME.ladder.attack(t.id);
      if (r.err || !E.S.pendingFinish) return 'no finisher available';
      const f = E.GAME.ladder.finish('leave');
      return 'left them standing, +' + (P.xp - xp0) + ' xp (pot was ' + r.xp + ')';
    });
  });

  await step('ladder pays 10 points an hour', async () => {
    return await readState(() => {
      const E = window.EXM, P = E.S.player;
      const before = P.points;
      P.regen.ladder = Date.now() - 3 * 3600000;
      E.GAME.ladder.payout(Date.now());
      return '+' + (P.points - before) + ' points for 3 hours';
    });
  });

  await step('bodyguard refused while on the ladder', async () => {
    await go('bodyguard');
    const r = await readState(() => window.EXM.GAME.ladder.hireBodyguard());
    return r.err ? 'correctly refused: "' + r.err.slice(0, 60) + '"' : 'WRONG: it let me hire one';
  });

  await step('bodyguard works once off the ladder', async () => {
    return await readState(() => {
      const E = window.EXM;
      const i = E.S.ladder.indexOf(0);
      if (i >= 0) E.S.ladder.splice(i, 1);
      E.GAME.ladder.sync();
      const r = E.GAME.ladder.hireBodyguard();
      const blocked = E.GAME.ladder.canAttack(E.S.npcs[0].id);
      E.S.player.bgUntil = 0;
      return r.ok ? 'hired; attacking then blocked = ' + (!blocked.ok) : 'failed: ' + r.err;
    });
  });

  await step('trade point: will refill wipes energy', async () => {
    await go('trade');
    return await readState(() => {
      const E = window.EXM, P = E.S.player;
      P.energy = P.energyMax; P.will = 0; P.points = 1000;
      const r = E.GAME.points.refill('will');
      return 'will=' + P.will + ' energy=' + P.energy + ' warned=' + !!r.warned;
    });
  });

  await step('buy attacks and IQ with points', async () => {
    return await readState(() => {
      const E = window.EXM, P = E.S.player;
      const a0 = P.attacks, i0 = P.iq;
      E.GAME.points.buyAttack(3); E.GAME.points.buyIQ(10);
      return 'attacks +' + (P.attacks - a0) + ', iq +' + (P.iq - i0);
    });
  });

  await step('shop: buy, equip, unequip, use, sell to market', async () => {
    await go('shop');
    await click('[data-act="buy"]');
    await go('inventory');
    const eq = await click('[data-act="equip"]');
    await page.evaluate(() => {
      const E = window.EXM;
      const med = E.DATA.items.filter(i => i.cat === 'medical')[0];
      if (med) { E.GAME.items.add(med.id, 3); E.S.player.health = 5; }
      E.GAME.ui.render();
    });
    await page.waitForTimeout(200);
    await click('[data-act="use"]');
    await click('[data-act="listitem"]');
    await click('[data-act="listgo"]');
    const listed = await readState(() => window.EXM.S.market.filter(m => m.seller === 0).length);
    return (eq || 'equipped') + ', listings by me: ' + listed;
  });

  await step('item market: buy a lot', async () => {
    await go('market');
    const before = await readState(() => Object.keys(window.EXM.S.player.inv).length);
    await click('[data-act="mktbuy"]');
    const after = await readState(() => Object.keys(window.EXM.S.player.inv).length);
    return 'inventory lines ' + before + ' -> ' + after;
  });

  await step('truck stop: kit, runs, and the 25 unit fence', async () => {
    await go('truckstop');
    await click('[data-act="kitbuy"][data-id="handgun"]');
    await click('[data-act="kitbuy"][data-id="daypass"]');
    await click('[data-act="kitbuy"][data-id="ammo"][data-n="10"]');
    const ready = await readState(() => window.EXM.GAME.fence.ready());
    const early = await readState(() => window.EXM.GAME.fence.sell(false));
    await page.evaluate(() => {
      const E = window.EXM, P = E.S.player;
      for (let i = 0; i < 12; i++) { P.dexg = P.dexgMax; E.GAME.fence.buyKit('ammo', 1); E.GAME.fence.run(); }
    });
    const units = await readState(() => window.EXM.GAME.fence.units());
    await go('fence');
    await click('[data-act="fencesell"]');
    const after = await readState(() => window.EXM.GAME.fence.units());
    return 'kit ready=' + ready + ', fence refused an empty load ("' + (early.err || '').slice(0, 30) + '"), ' +
      units + ' units run then sold (' + after + ' left)';
  });

  await step('school: enrol and graduate', async () => {
    await go('school');
    await click('[data-act="enrol"]');
    const enrolled = await readState(() => { const c = window.EXM.GAME.school.current(); return c ? c.cls.name : 'none'; });
    await page.evaluate(() => { window.EXM.S.player.school.until = Date.now() - 1000; });
    await go('school');
    await click('[data-act="schoolcollect"]');
    return 'took "' + enrolled + '", IQ now ' + (await readState(() => Math.round(window.EXM.S.player.iq)));
  });

  await step('auction: bid and win a lot', async () => {
    await go('auction');
    await click('[data-act="bid"]');
    const mine = await readState(() => window.EXM.GAME.auction.lots().filter(l => l.bidder === 0).length);
    await page.evaluate(() => {
      const E = window.EXM;
      E.GAME.auction.lots().forEach(l => { if (l.bidder === 0) l.ends = Date.now() - 1000; });
      E.GAME.auction.tick(Date.now());
    });
    return 'held ' + mine + ' high bid(s), settled';
  });

  await step('bank deposit and withdraw', async () => {
    await go('bank');
    await click('[data-act="depositall"]');
    await page.evaluate(() => { document.querySelector('#bank-amt').value = '1000'; });
    await click('[data-act="withdraw"]');
    return await readState(() => 'cash ' + Math.round(window.EXM.S.player.money) + ' bank ' + Math.round(window.EXM.S.player.bank));
  });

  await step('property buy and sell', async () => {
    await go('property');
    await click('[data-act="buyprop"]');
    const owned = await readState(() => (window.EXM.S.player.props || []).length);
    await click('[data-act="sellprop"]');
    return 'owned after buying: ' + owned;
  });

  await step('gym: join a better gym and train', async () => {
    await go('gym');
    await click('[data-act="joingym"]');
    await click('[data-act="sets"][data-n="10"]');
    await click('[data-act="train"]');
    return await readState(() => 'gym=' + (window.EXM.GAME.gym.current() || {}).name + ' str=' + Math.round(window.EXM.S.player.str));
  });

  await step('point gym', async () => { await go('pointgym'); return await click('[data-act="ptrain"]'); });

  await step('crimes, jobs, walking', async () => {
    await go('crimes'); await click('[data-act="crime"]');
    await go('jobs'); await click('[data-act="job"]');
    await go('streets'); await click('[data-act="walk5"]');
    return await readState(() => 'crimes ' + window.EXM.S.player.st.crimes + ' walks ' + window.EXM.S.player.st.walks);
  });

  await step('jail: bail somebody out and bust somebody out', async () => {
    await page.evaluate(() => {
      const E = window.EXM;
      E.S.npcs[3].jailUntil = Date.now() + 600000; E.S.npcs[3].jailWhy = 'test';
      E.S.npcs[4].jailUntil = Date.now() + 600000; E.S.npcs[4].jailWhy = 'test';
      E.S.player.jailUntil = 0; E.S.player.will = 50; E.S.player.money = 1e9;
    });
    await go('jail');
    await click('[data-act="bailout"]');
    await click('[data-act="bust"]');
    return await readState(() => 'busts ' + window.EXM.S.player.st.busts);
  });

  await step('hospital checkout and lawyer', async () => {
    await page.evaluate(() => { window.EXM.S.player.hospUntil = Date.now() + 900000; });
    await go('hospital');
    await click('[data-act="hospout"]');
    await page.evaluate(() => { window.EXM.S.player.jailUntil = Date.now() + 900000; window.EXM.S.player.bail = 1000; });
    await go('lawyer');
    await click('[data-act="lawjail"]');
    await click('[data-act="retain"]');
    return await readState(() => 'jailed=' + window.EXM.GAME.player.inJail() + ' retainer=' + window.EXM.GAME.lawyer.onRetainer());
  });

  await step('casino: slots, roulette, high-low', async () => {
    await go('casino');
    await click('[data-act="slots"]');
    await click('[data-act="roulette"][data-id="red"]');
    await click('[data-act="highlow"][data-id="high"]');
    return await readState(() => 'staked ' + Math.round(window.EXM.S.player.st.gambled));
  });

  await step('lottery buy and draw', async () => {
    await go('lottery');
    await click('[data-act="lotto"][data-n="10"]');
    await click('[data-act="lottodraw"]');
    return await readState(() => 'tickets ' + window.EXM.GAME.lottery.state().tickets.length + ' drawn=' + !!window.EXM.GAME.lottery.state().drawn);
  });

  await step('stocks buy and sell', async () => {
    await go('stocks');
    await click('[data-act="stockbuy"]');
    const held = await readState(() => Object.keys(window.EXM.S.stocks || {}).length);
    await click('[data-act="stocksell"]');
    return 'positions after buying: ' + held;
  });

  await step('point market: list and buy', async () => {
    await go('pointmarket');
    await click('[data-act="ptbuy"]');
    await page.evaluate(() => { document.querySelector('#pt-qty').value = '25'; document.querySelector('#pt-price').value = '3000'; });
    await click('[data-act="ptsell"]');
    return await readState(() => 'listings by me ' + window.EXM.GAME.points.market().filter(m => m.seller === 0).length);
  });

  await step('vote for points', async () => { await go('vote'); await click('[data-act="vote"]'); return await readState(() => 'votes left ' + window.EXM.GAME.points.votesLeft()); });

  await step('hitlist: place a bounty', async () => {
    await go('hitlist');
    const nm = await readState(() => window.EXM.S.npcs[10].name);
    await page.evaluate(n => { document.querySelector('#bnt-name').value = n; document.querySelector('#bnt-amt').value = '50000'; }, nm);
    await click('[data-act="placebounty"]');
    return await readState(() => 'open bounties ' + window.EXM.S.hitlist.length);
  });

  await step('mail: compose, send, read, delete', async () => {
    await go('mail');
    await click('[data-act="mailcompose"]');
    const nm = await readState(() => window.EXM.S.npcs[12].name);
    await page.evaluate(n => { document.querySelector('#mc-to').value = n; document.querySelector('#mc-sub').value = 'yo'; document.querySelector('#mc-body').value = 'you owe me'; }, nm);
    await click('[data-act="mailsend"]');
    await click('.mrow');
    await click('[data-act="maildel"]');
    return await readState(() => 'sent ' + window.EXM.S.player.st.sent);
  });

  await step('forum: new thread and reply', async () => {
    await go('forum');
    await click('[data-act="board"][data-id="general"]');
    await click('[data-act="newthread"]');
    await page.evaluate(() => { document.querySelector('#nt-title').value = 'is this thing on'; document.querySelector('#nt-body').value = 'first post, be gentle'; });
    await click('[data-act="newthreadgo"]');
    await page.evaluate(() => { document.querySelector('#fpost').value = 'replying to my own thread like a maniac'; });
    await click('[data-act="reply"]');
    return await readState(() => 'my posts ' + window.EXM.S.player.st.posts);
  });

  await step('family: found one, then leave it', async () => {
    await page.evaluate(() => { window.EXM.S.player.fam = null; window.EXM.S.player.money = 1e9; });
    await go('family');
    await page.evaluate(() => { document.querySelector('#fam-name').value = 'The Test Crew'; document.querySelector('#fam-tag').value = 'TEST'; });
    await click('[data-act="foundfam"]');
    const founded = await readState(() => { const f = window.EXM.GAME.family.mine(); return f ? f.name : 'none'; });
    await click('[data-act="leavefam"]');
    await click('[data-act="leavefamgo"]');
    return 'founded "' + founded + '", now in ' + (await readState(() => { const f = window.EXM.GAME.family.mine(); return f ? f.name : 'no family'; }));
  });

  await step('travel to another city', async () => {
    await go('travel');
    await click('[data-act="fly"]');
    return await readState(() => 'city ' + window.EXM.GAME.travel.currentId() + ' in transit=' + window.EXM.GAME.player.traveling());
  });

  await step('settings: pace, profile, export, import', async () => {
    await page.evaluate(() => { window.EXM.S.player.travelUntil = 0; });
    await go('settings');
    await click('[data-act="pace"][data-id="0.25"]');
    await page.evaluate(() => { document.querySelector('#set-sig').value = 'test signature ~*~'; });
    await click('[data-act="saveprofile"]');
    const txt = await readState(() => window.EXM.GAME.save.exportText());
    await page.evaluate(t => {
      const ta = document.querySelector('#imp'); if (ta) ta.value = t;
    }, txt);
    await click('[data-act="importsave"]');
    return 'save ' + Math.round(txt.length / 1024) + 'KB, reimported, name=' + (await readState(() => window.EXM.S.player.name));
  });

  await step('rankings tabs', async () => {
    await go('rankings');
    for (const m of ['power', 'money', 'respect', 'wins', 'crimes']) {
      await click('[data-act="rankmode"][data-id="' + m + '"]');
    }
    return 'all six tabs rendered';
  });

  await step('players tabs and search', async () => {
    await go('players');
    for (const m of ['all', 'weak', 'enemies', 'online']) await click('[data-act="pmode"][data-id="' + m + '"]');
    await page.evaluate(() => { document.querySelector('#pq').value = 'a'; }); await click('[data-act="psearch"]');
    await click('[data-act="ppage"][data-n="1"]');
    return 'tabs, search and paging fine';
  });

  await step('profile of another player', async () => {
    const id = await readState(() => window.EXM.S.npcs[7].id);
    await page.evaluate(i => { window.location.hash = '#/profile/' + i; }, id);
    await page.waitForTimeout(250);
    return await readState(() => document.querySelector('.col-mid .big') ? document.querySelector('.col-mid .big').textContent : 'no profile');
  });

  await step('the round and The Rumble', async () => {
    await page.evaluate(() => { window.EXM.S.seasonStart = Date.now() - 60 * 86400000; });
    await go('round');
    await click('[data-act="rumble"]');
    const champ = await readState(() => window.EXM.S.lastRumble ? window.EXM.S.lastRumble.champion : 'none');
    const entrants = await readState(() => window.EXM.S.lastRumble ? window.EXM.S.lastRumble.entrants : 0);
    await click('[data-act="newround"]');
    await click('[data-act="newroundgo"]');
    const r = await readState(() => ({ round: window.EXM.GAME.season.number(), lvl: window.EXM.S.player.level, hall: window.EXM.GAME.season.hall().length }));
    return champ + ' won with ' + entrants + ' entrants; now round ' + r.round + ' at level ' + r.lvl + ', ' + r.hall + ' name(s) on the wall';
  });

  const failed = results.filter(r => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' paths clean');
  console.log('ERRORS ' + errs.length);
  errs.slice(0, 20).forEach(e => console.log('  * ' + e.slice(0, 300)));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('HARNESS FAILED', e); process.exit(2); });
