/* ============================================================
   38-mail.js :: the inbox
   ============================================================ */

GAME.mail = (function () {

  var SYSTEM = {
    welcome: {
      subj: 'Welcome to exMafia',
      body: "You made it off the boat.\n\nThe city is run by two hundred people who all got here before you, and every one of them is on the ladder above you. Work the crimes for money, the gym for muscle, and the ladder for a name.\n\nDo not get comfortable at the bottom. Nobody stays there long, one way or the other.\n\n- The Management"
    },
    levelup: { subj: 'You made level {n}', body: 'Word travels. You are level {n} now.\n\nAll your pools have been refilled and your maximums went up.' },
    mugged: { subj: 'You were rolled', body: '{who} caught you and took {amount}.\n\nYou have a six hour window to hit them back regardless of how far up the ladder they sit. Use it.' },
    hospitalised: { subj: 'St. Anthony\'s Mercy', body: '{who} put you in a bed.\n\nThe doctors say you will live. The nurses say you should pick easier fights.' },
    sold: { subj: 'Market: {item} sold', body: '{who} bought {n}x {item} from your listing.\n\n{amount} has been credited to you.' },
    listingExpired: { subj: 'Market: listing expired', body: 'Nobody wanted your {item}. It has been returned to your stash.' },
    bailed: { subj: 'You made bail', body: '{who} covered your bail. You owe them one.' },
    famInvite: { subj: 'Invitation from {family}', body: '{who} has invited you to join {family}.\n\nCheck the Family page to accept.' },
    godfather: { subj: 'You are the Godfather', body: 'Rung one. The whole city knows your name by morning.\n\nEnjoy it. Every single person below you is now working out how to take it off you, and no bodyguard in this town will cover a man on the ladder.' },
    ladderJoin: { subj: 'You are on the Attack Ladder', body: 'You beat somebody who was on it, so now you are on it, at rung {n}.\n\nThat is 10 points an hour, every hour, for as long as you hold the rung. It also means no bodyguard will take your money while you are up there. That is the deal.' },
    ladderOff: { subj: 'Knocked off the ladder', body: '{who} took your rung and you came off the bottom of the Attack Ladder.\n\nThe points stop today. Go and take it back.' },
    pointsSold: { subj: 'Point Market: sold', body: '{who} bought {n} points off your listing.\n\n{amount} credited.' },
    newround: { subj: 'Round {n} begins', body: 'The Rumble is over and the books are closed on the last round.\n\nEverybody is back to level one. The wall in the social club still has the old names on it, and yours had better be up there before this one ends too.' },
    rumble: { subj: 'The Rumble', body: 'Eight weeks are up. Everybody on the Attack Ladder, one room, last one standing.\n\nGo to the Attack Ladder page.' },
    wonAuction: { subj: 'Auction won: {item}', body: 'The hammer came down on your bid.\n\n{item} is in your inventory. {amount} has already left your pocket.' },
    outbid: { subj: 'Outbid on {item}', body: '{who} has gone over the top of you at {amount}.\n\nYour money has been returned. Bid again or let it go.' },
    warning: { subj: 'Staff warning', body: 'Keep it civil in the shoutbox. This is your only warning.\n\n- Staff' }
  };

  function inbox() { return S.mail || (S.mail = []); }
  function unread() {
    var m = inbox(), n = 0;
    for (var i = 0; i < m.length; i++) if (!m[i].read && m[i].folder !== 'sent') n++;
    return n;
  }

  function push(msg) {
    var m = inbox();
    m.push(msg);
    while (m.length > CFG.MAIL_CAP) m.shift();
    return msg;
  }

  function vars(extra) {
    var p = S.player;
    var v = {
      me: p.name,
      rank: GAME.progress.rankFor(p.xp).name,
      city: p.city,
      n: p.level,
      amount: money(p.money),
      family: (famById(p.fam) || {}).name || 'your family'
    };
    for (var k in (extra || {})) if (extra.hasOwnProperty(k)) v[k] = extra[k];
    return v;
  }

  function system(kind, extra) {
    var t = SYSTEM[kind];
    if (!t) return null;
    var v = vars(extra);
    return push({
      id: S.nextMailId++, t: NOW(), from: -1, fromName: 'exMafia',
      subj: tpl(t.subj, v), body: tpl(t.body, v), read: false, folder: 'in', sys: true
    });
  }

  /* An NPC writes to the player. Their typing style is applied so the
     mail reads like it came from that specific person. */
  function fromNpc(npc, bank, extra) {
    var pool = (DATA.mail && DATA.mail[bank]) || null;
    if (!pool || !pool.length) return null;
    var t = pick(pool);
    var v = vars(extra);
    v.target = npc.name;
    v.other = pick(S.npcs).name;
    v.family = (famById(npc.fam) || {}).name || pick(DATA.names.familyNames);
    v.item = (pick(GAME.items.all()) || {}).name || 'a piece';
    v.crime = ((pick(DATA.crimes || []) || {}).name || 'a job').toLowerCase();
    var subj = tpl(t.subj || pick(DATA.mail.subjects || ['(no subject)']), v);
    var body = tpl(t.body || '', v);
    return push({
      id: S.nextMailId++, t: NOW(), from: npc.id, fromName: npc.name,
      subj: GAME.npc.style(npc, subj, true),
      body: GAME.npc.style(npc, body),
      read: false, folder: 'in', bank: bank
    });
  }

  function send(toId, subj, body) {
    var to = byId(toId);
    if (!to || toId === 0) return { err: 'Pick a recipient.' };
    if (!body || !String(body).trim()) return { err: 'Write something first.' };
    push({
      id: S.nextMailId++, t: NOW(), from: 0, fromName: S.player.name,
      to: toId, toName: to.name, subj: subj || '(no subject)', body: body,
      read: true, folder: 'sent'
    });
    S.player.st.sent++;
    S.player.seen[toId] = NOW();
    GAME.npc.remember(to, 'mailed_by_player', { body: body });
    /* they might write back */
    var replyP = clamp(0.25 + to.p.chatty * 0.5 + (to.op > 20 ? 0.2 : 0) - (to.op < -30 ? 0.25 : 0), 0.05, 0.9);
    if (chance(replyP)) {
      var bank = to.op < -25 ? 'threat' : (to.op > 25 ? 'friendly' : (chance(0.5) ? 'friendly' : 'newbieHelp'));
      S.pendingReplies = S.pendingReplies || [];
      S.pendingReplies.push({ id: to.id, bank: bank, at: NOW() + rint(20, 400) * 1000 });
    }
    return { ok: true };
  }

  function read(id) {
    var m = inbox();
    for (var i = 0; i < m.length; i++) if (m[i].id === id) { m[i].read = true; return m[i]; }
    return null;
  }
  function del(id) {
    var m = inbox();
    for (var i = 0; i < m.length; i++) if (m[i].id === id) { m.splice(i, 1); return true; }
    return false;
  }
  function readAll() { var m = inbox(); for (var i = 0; i < m.length; i++) m[i].read = true; }

  function tick(now) {
    var q = S.pendingReplies || [];
    for (var i = q.length - 1; i >= 0; i--) {
      if (q[i].at <= now) {
        var n = byId(q[i].id);
        if (n) fromNpc(n, q[i].bank);
        q.splice(i, 1);
      }
    }
  }

  return { inbox: inbox, unread: unread, system: system, fromNpc: fromNpc, send: send, read: read, del: del, readAll: readAll, tick: tick, SYSTEM: SYSTEM };
})();
