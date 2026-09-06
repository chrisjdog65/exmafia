/* ============================================================
   44-oc.js :: Organised Crime
   A family job needs a crew, and the crew are other players. You
   pick who fills each role out of your own family, and every one
   of them rolls against their own stats. Bring a driver who cannot
   drive and the whole thing comes apart on the ramp.
   ============================================================ */

GAME.oc = (function () {

  var STATLABEL = { str: 'Strength', def: 'Guard', spd: 'Agility', dex: 'Labour', iq: 'IQ' };

  function list() { return DATA.oc || []; }
  function get(id) {
    var l = list();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }

  function cools() { return S.ocCool || (S.ocCool = {}); }
  function cooldownLeft(famId, jobId) {
    return Math.max(0, (cools()[famId + ':' + jobId] || 0) - NOW());
  }
  function setCooldown(famId, job) {
    cools()[famId + ':' + job.id] = NOW() + (job.cooldownH || 4) * HOUR;
  }

  /* Who in your family is available to be put on a job. */
  function bench() {
    var f = GAME.family.mine();
    if (!f) return [];
    return GAME.family.membersOf(f).filter(function (m) {
      return m.id !== 0 && !m.dead && !GAME.ladder.busy(m);
    });
  }

  /* How likely one crew member is to hold up their end. */
  function rolePass(member, role) {
    if (!member) return 0;
    var have = member[role.stat] || 10;
    var need = role.need || 1;
    var r = have / need;
    /* well over the bar is close to certain, well under is close to hopeless */
    return clamp(0.10 + 0.85 * (r / (r + 0.85)), 0.03, 0.97);
  }

  function bestFor(role, taken) {
    var pool = bench(), best = null;
    for (var i = 0; i < pool.length; i++) {
      var m = pool[i];
      if (taken[m.id]) continue;
      if (!best || (m[role.stat] || 0) > (best[role.stat] || 0)) best = m;
    }
    return best;
  }

  /* The crew you have picked, as an id per role. */
  function crew() { return S.ocCrew || (S.ocCrew = {}); }
  function assign(roleId, memberId) {
    var c = crew();
    /* nobody works two jobs at once */
    for (var k in c) if (c.hasOwnProperty(k) && c[k] === memberId) delete c[k];
    if (memberId === null || memberId === undefined || memberId === '') delete c[roleId];
    else c[roleId] = Number(memberId);
  }
  function autoFill(job) {
    var c = {}, taken = {};
    for (var i = 0; i < job.roles.length; i++) {
      var m = bestFor(job.roles[i], taken);
      if (m) { c[job.roles[i].id] = m.id; taken[m.id] = 1; }
    }
    S.ocCrew = c;
    return c;
  }
  function clearCrew() { S.ocCrew = {}; }

  function readiness(job) {
    if (!job || !job.roles) return { rows: [], filled: 0, enough: false, chance: 0 };
    var c = crew(), filled = 0, product = 1, rows = [];
    for (var i = 0; i < job.roles.length; i++) {
      var role = job.roles[i];
      var m = c[role.id] ? byId(c[role.id]) : null;
      var p = m ? rolePass(m, role) : 0;
      if (m) filled++;
      product *= (m ? p : 0.0001);
      rows.push({ role: role, member: m, chance: p });
    }
    /* a job the boss turns up to personally goes better */
    var mine = GAME.family.mine();
    var lead = mine && mine.leader === 0 ? 1.05 : 1;
    return {
      rows: rows, filled: filled,
      enough: filled >= (job.minCrew || job.roles.length) && filled === job.roles.length,
      chance: clamp(Math.pow(product, 0.72) * lead, 0.01, 0.96)
    };
  }

  function canRun(job) {
    var f = GAME.family.mine();
    if (!f) return 'You need a family to put a crew together.';
    if (!job) return 'No such job.';
    if (S.player.level < (job.lvl || 1)) return 'You need to be level ' + job.lvl + '.';
    var b = GAME.player.blocked();
    if (b) return 'You cannot go anywhere right now.';
    if (S.player.nerve < 4) return 'Sitting down a crew takes 4 Brave.';
    var cd = cooldownLeft(f.id, job.id);
    if (cd > 0) return 'Your family ran this one recently. Wait ' + clock(cd) + '.';
    var r = readiness(job);
    if (!r.enough) return 'Every role has to be filled. ' + r.filled + ' of ' + job.roles.length + ' so far.';
    return null;
  }

  function run(jobId) {
    var job = get(jobId);
    var err = canRun(job);
    if (err) return { err: err };
    var f = GAME.family.mine(), p = S.player;
    var r = readiness(job);

    p.nerve -= 4;
    setCooldown(f.id, job);

    /* every role rolls on its own, then the job rolls on the crew */
    var results = [], weak = null;
    for (var i = 0; i < r.rows.length; i++) {
      var row = r.rows[i];
      var okRole = chance(row.chance);
      results.push({ role: row.role, member: row.member, ok: okRole, chance: row.chance });
      if (!okRole && (!weak || row.chance < weak.chance)) weak = { role: row.role, member: row.member, chance: row.chance };
    }
    var blown = results.filter(function (x) { return !x.ok; }).length;
    /* one slip can be covered; two and it falls apart */
    var success = blown === 0 || (blown === 1 && chance(0.45));

    var out = { job: job, results: results, weak: weak, success: success, blown: blown, cut: 0, xp: 0, jailed: false };

    if (success) {
      var pot = rint(job.cut[0], job.cut[1]);
      var heads = r.rows.length + 1;                 // the crew, plus you
      var yours = Math.round(pot * (0.30 + 0.70 / heads));
      out.pot = pot;
      out.cut = yours;
      GAME.player.pay(yours);
      out.xp = rint(job.xp[0], job.xp[1]);
      GAME.progress.gainXP(out.xp);
      p.st.ocDone = (p.st.ocDone || 0) + 1;
      p.respect += Math.max(2, Math.round(job.lvl / 3));
      var share = Math.round((pot - yours) / Math.max(1, r.rows.length));
      for (var k = 0; k < r.rows.length; k++) {
        var m = r.rows[k].member;
        if (!m) continue;
        m.money += share;
        m.op = clamp(m.op + rint(4, 11), -100, 100);
        GAME.npc.gainXP(m, Math.round(out.xp * 0.6));
      }
      if (f) { f.money = (f.money || 0) + Math.round(pot * 0.1); f.respect += Math.round(job.lvl / 2); }
      GAME.feed.newsFrom('crimeWin', 'crime', { who: p.name, family: f.name, amount: money(pot), n: heads, city: p.city });
      GAME.feed.log('oc', job.name + ' came off. Your cut was ' + money(yours) + '.');
    } else {
      p.st.ocFail = (p.st.ocFail || 0) + 1;
      /* the crew take it personally, and somebody usually gets pinched */
      for (var q = 0; q < r.rows.length; q++) {
        var mm = r.rows[q].member;
        if (!mm) continue;
        mm.op = clamp(mm.op - rint(3, 9), -100, 100);
        if (chance(0.5)) {
          mm.jailUntil = NOW() + rint(job.jailS[0], job.jailS[1]) * 1000;
          mm.jailWhy = job.name;
        }
      }
      if (chance(0.55)) {
        var secs = rint(job.jailS[0], job.jailS[1]);
        GAME.player.jail(secs * 1000, 'It went wrong on ' + job.name + '.', S.player.level * 2000);
        out.jailed = true;
        out.jailSecs = secs;
      }
      GAME.feed.log('oc', job.name + ' fell apart. ' + (weak && weak.member ? weak.member.name + ' did not hold up their end.' : ''));
      GAME.feed.newsFrom('bustFail', 'jail', { who: p.name, other: (weak && weak.member ? weak.member.name : f.name), family: f.name, city: p.city });
    }
    return out;
  }

  /* The AI families run their own jobs, and you read about it. */
  function npcTick(hours) {
    var expected = Math.max(0, hours) * 0.22;
    var n = Math.floor(expected);
    if (chance(expected - n)) n++;
    for (var i = 0; i < Math.min(n, 40); i++) {
      var f = pick(S.fams);
      if (!f) continue;
      var members = GAME.family.membersOf(f).filter(function (m) { return m.id !== 0 && !m.dead && !GAME.ladder.busy(m); });
      if (members.length < 2) continue;
      var pool = list().filter(function (j) { return members.length >= (j.minCrew || 2); });
      if (!pool.length) continue;
      /* they pick something their crew can actually handle */
      var avg = members.reduce(function (a, m) { return a + m.level; }, 0) / members.length;
      var job = pick(pool.filter(function (j) { return j.lvl <= avg * 1.3; })) || pool[0];
      if (cooldownLeft(f.id, job.id) > 0) continue;
      setCooldown(f.id, job);
      var ok = chance(clamp(0.25 + (avg / Math.max(1, job.lvl)) * 0.4, 0.1, 0.85));
      if (ok) {
        var pot = rint(job.cut[0], job.cut[1]);
        var share = Math.round(pot / members.length);
        for (var m2 = 0; m2 < members.length; m2++) {
          members[m2].money += share;
          GAME.npc.gainXP(members[m2], Math.round(rint(job.xp[0], job.xp[1]) * 0.6));
        }
        f.money = (f.money || 0) + Math.round(pot * 0.1);
        if (chance(0.5)) GAME.feed.newsFrom('crimeWin', 'crime', { who: (byId(f.leader) || {}).name || f.name, family: f.name, amount: money(pot), n: members.length, city: f.name });
      } else if (chance(0.6)) {
        var v = pick(members);
        if (v) { v.jailUntil = NOW() + rint(job.jailS[0], job.jailS[1]) * 1000; v.jailWhy = job.name; }
        if (chance(0.35)) GAME.feed.newsFrom('bustFail', 'jail', { who: (v || {}).name || f.name, other: f.name, family: f.name, city: (v || {}).city });
      }
    }
  }

  return {
    list: list, get: get, bench: bench, crew: crew, assign: assign, autoFill: autoFill,
    clearCrew: clearCrew, readiness: readiness, canRun: canRun, run: run,
    cooldownLeft: cooldownLeft, rolePass: rolePass, npcTick: npcTick, STATLABEL: STATLABEL
  };
})();
