/* ============================================================
   39-forum.js :: the message board
   Threads are seeded with backdated history at world creation, then
   the AI roster keeps posting while you play.
   ============================================================ */

GAME.forumSim = (function () {

  function boards() { return (DATA.forum && DATA.forum.boards) || []; }
  function threads() { return (S.forum && S.forum.threads) || []; }

  function authorFor(seedKey, i) {
    var n = S.npcs[Math.floor(seededFloat(seedKey, 'a' + i) * S.npcs.length) % S.npcs.length];
    return n;
  }

  function subst(text, ctx) {
    return tpl(text, {
      target: ctx.a ? ctx.a.name : 'him',
      other: ctx.b ? ctx.b.name : 'somebody',
      family: ctx.fam || 'the family',
      item: ctx.item || 'a piece',
      amount: ctx.amount || money(rint(1000, 500000)),
      n: rint(2, 400),
      me: S.player.name
    });
  }

  function seed(now) {
    S.forum = { threads: [], nextId: 1 };
    var seeds = (DATA.forum && DATA.forum.threads) || [];
    var stickies = (DATA.forum && DATA.forum.stickies) || [];

    /* pinned staff posts first */
    for (var s = 0; s < stickies.length; s++) {
      var st = stickies[s];
      S.forum.threads.push({
        id: S.forum.nextId++,
        board: st.board || 'announce',
        title: st.title || 'Announcement',
        sticky: true,
        locked: !!st.locked,
        author: -1, authorName: 'Staff',
        t: now - rflt(1, 220) * DAY,
        views: rint(400, 40000),
        posts: [{ author: -1, authorName: 'Staff', t: now - rflt(1, 220) * DAY, body: st.body || '' }]
      });
    }

    for (var i = 0; i < seeds.length; i++) {
      var sd = seeds[i];
      var opAuthor = authorFor('thread' + i, 0);
      var start = now - rflt(0.02, 190) * DAY;
      var ctx = {
        a: authorFor('thread' + i, 91),
        b: authorFor('thread' + i, 92),
        fam: (pick(S.fams) || {}).name || 'the family',
        item: (pick(GAME.items.all()) || {}).name || 'a piece'
      };
      var posts = [{
        author: opAuthor.id, authorName: opAuthor.name, t: start,
        body: GAME.npc.style(opAuthor, subst(sd.op || '', ctx))
      }];
      var cursor = start;
      var replies = sd.replies || [];
      for (var r = 0; r < replies.length; r++) {
        cursor += rflt(0.3, 40) * HOUR;
        if (cursor > now) cursor = now - rflt(0, 2) * HOUR;
        var ra = authorFor('thread' + i, r + 1);
        posts.push({
          author: ra.id, authorName: ra.name, t: cursor,
          body: GAME.npc.style(ra, subst(replies[r], ctx))
        });
        ra.posts = (ra.posts || 0) + 1;
      }
      S.forum.threads.push({
        id: S.forum.nextId++,
        board: sd.board || 'general',
        title: subst(sd.title || 'untitled', ctx),
        sticky: false, locked: !!sd.locked,
        author: opAuthor.id, authorName: opAuthor.name,
        t: start, views: rint(12, 9000), posts: posts
      });
    }
    sortThreads();
  }

  function sortThreads() {
    S.forum.threads.sort(function (a, b) {
      if (a.sticky !== b.sticky) return a.sticky ? -1 : 1;
      return lastAt(b) - lastAt(a);
    });
  }
  function lastAt(th) { return th.posts.length ? th.posts[th.posts.length - 1].t : th.t; }

  function byBoard(id) {
    return threads().filter(function (t) { return t.board === id; });
  }
  function get(id) {
    var t = threads();
    for (var i = 0; i < t.length; i++) if (t[i].id === id) return t[i];
    return null;
  }

  function post(threadId, body) {
    var th = get(threadId);
    if (!th) return { err: 'Thread not found.' };
    if (th.locked) return { err: 'That thread is locked.' };
    if (!body || !body.trim()) return { err: 'Say something.' };
    th.posts.push({ author: 0, authorName: S.player.name, t: NOW(), body: body });
    S.player.st.posts++;
    GAME.progress.gainXP(1);
    sortThreads();
    /* somebody usually replies to a human post */
    scheduleReplies(th, rint(0, 3));
    return { ok: true };
  }

  function create(board, title, body) {
    if (!title || !title.trim()) return { err: 'Your thread needs a title.' };
    if (!body || !body.trim()) return { err: 'Your thread needs a post.' };
    if (board === 'announce') return { err: 'Only staff can post there.' };
    var th = {
      id: S.forum.nextId++, board: board, title: title.slice(0, 90),
      sticky: false, locked: false, author: 0, authorName: S.player.name,
      t: NOW(), views: 1,
      posts: [{ author: 0, authorName: S.player.name, t: NOW(), body: body }]
    };
    S.forum.threads.push(th);
    S.player.st.posts++;
    GAME.progress.gainXP(2);
    sortThreads();
    scheduleReplies(th, rint(1, 5));
    return { ok: true, id: th.id };
  }

  function scheduleReplies(th, n) {
    S.forumQueue = S.forumQueue || [];
    var at = NOW();
    for (var i = 0; i < n; i++) {
      at += rint(25, 900) * 1000;
      S.forumQueue.push({ thread: th.id, at: at });
    }
  }

  /* Ambient board activity. */
  function tick(now) {
    var q = S.forumQueue || [];
    for (var i = q.length - 1; i >= 0; i--) {
      if (q[i].at <= now) { npcReply(get(q[i].thread), now); q.splice(i, 1); }
    }
    if (chance(0.03)) {
      var live = threads().filter(function (t) { return !t.locked && !t.sticky; });
      if (live.length) npcReply(pick(live), now);
    }
    if (chance(0.004)) npcThread(now);
  }

  function npcReply(th, now) {
    if (!th || th.locked) return;
    var online = GAME.sim.onlineList();
    var a = online.length ? pick(online) : pick(S.npcs);
    if (!a) return;
    var bank;
    var lastIsPlayer = th.posts.length && th.posts[th.posts.length - 1].author === 0;
    if (lastIsPlayer) {
      bank = a.op < -20 ? DATA.chat.toPlayerHostile
        : (S.player.rung <= 40 ? DATA.chat.toPlayerRespect : (a.op > 20 ? DATA.chat.toPlayerFriendly : DATA.chat.toPlayerMocking));
    } else {
      bank = pick([DATA.forum.bumps, DATA.chat.smalltalk, DATA.chat.brag, DATA.chat.trashtalk, DATA.chat.vetAnswer, DATA.forum.bumps]);
    }
    if (!bank || !bank.length) return;
    var body = tpl(pick(bank), {
      me: S.player.name, target: pick(S.npcs).name, other: pick(S.npcs).name,
      family: (pick(S.fams) || {}).name || 'the family',
      item: (pick(GAME.items.all()) || {}).name || 'a piece',
      amount: money(rint(500, 900000)), n: rint(2, 900),
      rank: GAME.progress.rankFor(a.xp || 0).name, city: a.city
    });
    th.posts.push({ author: a.id, authorName: a.name, t: now, body: GAME.npc.style(a, body) });
    th.views += rint(1, 40);
    a.posts = (a.posts || 0) + 1;
    while (th.posts.length > 120) th.posts.splice(1, 1);
    sortThreads();
  }

  function npcThread(now) {
    var seeds = (DATA.forum && DATA.forum.threads) || [];
    if (!seeds.length) return;
    var sd = pick(seeds);
    var a = pick(GAME.sim.onlineList().length ? GAME.sim.onlineList() : S.npcs);
    var ctx = { a: pick(S.npcs), b: pick(S.npcs), fam: (pick(S.fams) || {}).name, item: (pick(GAME.items.all()) || {}).name };
    S.forum.threads.push({
      id: S.forum.nextId++, board: sd.board || 'general',
      title: subst(sd.title, ctx), sticky: false, locked: false,
      author: a.id, authorName: a.name, t: now, views: rint(1, 20),
      posts: [{ author: a.id, authorName: a.name, t: now, body: GAME.npc.style(a, subst(sd.op, ctx)) }]
    });
    while (S.forum.threads.length > 220) {
      /* drop the coldest non-sticky thread */
      var oldest = -1, oldT = Infinity;
      for (var i = 0; i < S.forum.threads.length; i++) {
        var th = S.forum.threads[i];
        if (th.sticky || th.author === 0) continue;
        if (lastAt(th) < oldT) { oldT = lastAt(th); oldest = i; }
      }
      if (oldest < 0) break;
      S.forum.threads.splice(oldest, 1);
    }
    sortThreads();
  }

  return {
    seed: seed, boards: boards, threads: threads, byBoard: byBoard, get: get,
    post: post, create: create, tick: tick, lastAt: lastAt, sortThreads: sortThreads
  };
})();
