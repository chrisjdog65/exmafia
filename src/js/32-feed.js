/* ============================================================
   32-feed.js :: news ticker, shoutbox, personal log
   ============================================================ */

GAME.feed = (function () {

  function push(arr, obj, cap) {
    arr.push(obj);
    while (arr.length > cap) arr.shift();
  }

  /* Every template slot gets a plausible value even when the caller did
     not supply one, so a raw {family} never reaches the screen. */
  function defaults() {
    var a = pick(S.npcs) || S.player;
    var b = pick(S.npcs) || S.player;
    var f = pick(S.fams);
    var it = pick(DATA.items || []);
    var cr = pick(DATA.crimes || []);
    return {
      who: a.name, other: b.name, attacker: a.name, defender: b.name,
      family: (f && f.name) || 'the family',
      city: a.city || 'the city',
      rank: GAME.progress.rankFor(a.xp || 0).name,
      amount: money(rint(500, 250000)),
      n: rint(2, 90),
      item: (it && it.name) || 'a piece',
      crime: ((cr && cr.name) || 'a job').toLowerCase()
    };
  }

  function fill(vars) {
    var d = defaults(), k;
    if (!vars) return d;
    for (k in d) if (d.hasOwnProperty(k) && (vars[k] === undefined || vars[k] === null)) vars[k] = d[k];
    return vars;
  }

  /* World news line. kind drives colour. */
  function news(kind, template, vars, t) {
    if (!S.news) S.news = [];
    var line = tpl(template, vars || {});
    /* belt and braces: strip any slot nothing filled */
    if (line.indexOf('{') >= 0) line = tpl(line, defaults()).replace(/\{\w+\}/g, 'somebody');
    push(S.news, { t: t || NOW(), k: kind, x: line }, CFG.NEWS_CAP);
  }

  function newsFrom(bank, kind, vars, t) {
    var pool = (DATA.news && DATA.news[bank]) || null;
    if (!pool || !pool.length) return;
    news(kind, pick(pool), fill(vars || {}), t);
  }

  /* Shoutbox line. */
  function say(npc, text, t) {
    if (!S.chat) S.chat = [];
    push(S.chat, {
      t: t || NOW(),
      id: npc ? npc.id : 0,
      n: npc ? npc.name : S.player.name,
      x: text
    }, CFG.CHAT_CAP);
  }

  /* The player's own event log (what happened to me). */
  function log(kind, text, t) {
    if (!S.log) S.log = [];
    push(S.log, { t: t || NOW(), k: kind, x: text }, CFG.LOG_CAP);
  }

  function recentNews(n) {
    var a = S.news || [];
    return a.slice(Math.max(0, a.length - (n || 40))).reverse();
  }
  function recentChat(n) {
    var a = S.chat || [];
    return a.slice(Math.max(0, a.length - (n || 60)));
  }

  return { news: news, newsFrom: newsFrom, say: say, log: log, recentNews: recentNews, recentChat: recentChat };
})();
