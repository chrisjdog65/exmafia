/* ============================================================
   50-npc.js :: the two hundred
   Typing voice, memory, opinion, targeting, and the per-minute
   decision each account makes while it is logged in.
   ============================================================ */

/* ---- txt-speak substitution table ---- */
var TXT = {
  'you': 'u', 'your': 'ur', "you're": 'ur', 'youre': 'ur', 'are': 'r', 'why': 'y',
  'to': '2', 'too': '2', 'for': '4', 'be': 'b', 'see': 'c', 'okay': 'k', 'ok': 'k',
  'people': 'ppl', 'please': 'plz', 'thanks': 'thx', 'because': 'cuz', 'cause': 'cuz',
  'what': 'wat', 'know': 'kno', 'about': 'bout', 'probably': 'prolly', 'going to': 'gonna',
  'want to': 'wanna', 'got to': 'gotta', 'something': 'sumthin', 'nothing': 'nuthin',
  'anyone': 'ne1', 'everyone': 'every1', 'someone': 'some1', 'right': 'rite',
  'tonight': '2nite', 'tomorrow': '2moro', 'later': 'l8r', 'great': 'gr8', 'mate': 'm8',
  'with': 'wit', 'them': 'em', 'though': 'tho', 'through': 'thru', 'yes': 'ya', 'have': 'hav'
};
var TXT_KEYS = Object.keys(TXT).sort(function (a, b) { return b.length - a.length; });

var APOS = /\b(dont|cant|wont|im|its|thats|hes|shes|theyre|youre|ive|id|ill|aint|couldnt|shouldnt|wouldnt|isnt|wasnt|didnt|doesnt|hasnt|havent)\b/g;

var LEET = { 'e': '3', 'a': '4', 'o': '0', 's': '5', 'i': '1', 't': '7' };

GAME.npc = (function () {

  /* ---- voice ---------------------------------------------------
     Every account types the same way every time, forever, because
     the profile is derived from a hash of the name.
  ----------------------------------------------------------------- */
  function voice(n) {
    if (n._v) return n._v;
    var k = n.name;
    var chatty = n.p ? n.p.chatty : 0.5;
    var age = n.age || 20;
    var proper = seededFloat(k, 'proper');
    var v = {
      /* young + chatty accounts type worse */
      lower: seededFloat(k, 'lower') < (0.72 - (age - 14) * 0.012),
      shout: seededFloat(k, 'shout') < 0.07,
      txt: clamp(seededFloat(k, 'txt') * 1.25 - (age - 14) * 0.018, 0, 0.9),
      dropApos: seededFloat(k, 'apos') < 0.62,
      leet: seededFloat(k, 'leet') < 0.10,
      typo: seededFloat(k, 'typo') * 0.13,
      stretch: seededFloat(k, 'stretch') * 0.55,
      emote: clamp(seededFloat(k, 'emote') * 0.7 * (0.4 + chatty), 0, 0.7),
      dots: seededFloat(k, 'dots') < 0.22,
      /* the ~8% who write like a school essay */
      pedant: proper > 0.92
    };
    if (v.pedant) { v.lower = false; v.txt = 0; v.dropApos = false; v.leet = false; v.stretch = 0; v.emote = 0.03; }
    n._v = v;
    return v;
  }

  function txtify(s, amount) {
    for (var i = 0; i < TXT_KEYS.length; i++) {
      var k = TXT_KEYS[i];
      if (seededFloat(k, s.length + '|' + i) > amount) continue;
      s = s.replace(new RegExp('\\b' + k.replace(' ', '\\s+') + '\\b', 'gi'), TXT[k]);
    }
    return s;
  }

  function typoify(s, rate) {
    if (rate <= 0) return s;
    var out = s.split('');
    for (var i = 1; i < out.length - 1; i++) {
      if (out[i] === ' ' || out[i - 1] === ' ') continue;
      var r = seededFloat(s, 'ty' + i);
      if (r < rate * 0.4) { var t = out[i]; out[i] = out[i + 1]; out[i + 1] = t; i++; }
      else if (r < rate * 0.6) { out[i] = out[i] + out[i]; }
      else if (r < rate * 0.7) { out.splice(i, 1); }
    }
    return out.join('');
  }

  function stretch(s, amount) {
    return s.replace(/([!?])\1*$/, function (m, c) {
      var n = 1 + Math.floor(seededFloat(s, 'st') * amount * 8);
      var out = ''; for (var i = 0; i < n; i++) out += c; return out;
    });
  }

  /* Run a line through an account's voice. */
  function style(n, text, isSubject) {
    if (!text) return '';
    if (!n || n.id === -1) return text;
    var v = voice(n);
    var s = String(text);

    if (v.txt > 0.02) s = txtify(s, v.txt);
    if (v.dropApos) s = s.replace(/'/g, '');
    if (v.lower) s = s.toLowerCase();
    else if (v.shout && !isSubject && seededFloat(s, 'sh') < 0.4) s = s.toUpperCase();
    if (v.leet) {
      s = s.replace(/[eaos]/g, function (c) {
        return seededFloat(s + c, 'lt') < 0.35 ? LEET[c] : c;
      });
    }
    if (v.typo > 0.005) s = typoify(s, v.typo);
    if (v.stretch > 0.05) s = stretch(s, v.stretch);
    if (v.dots && !isSubject && seededFloat(s, 'dt') < 0.35) s = s.replace(/\.\s*$/, '...');
    if (v.emote > 0.02 && !isSubject && seededFloat(s, 'em') < v.emote) {
      s += ' ' + (DATA.chat && DATA.chat.interjections ? seededPick(s, 'ij', DATA.chat.interjections) : 'lol');
    }
    return s;
  }

  /* ---- memory ---------------------------------------------------- */
  function remember(n, event, data) {
    if (!n || n.id === 0) return;
    data = data || {};
    var vind = n.p.vindictive, ego = n.p.ego;
    n.metPlayer = true;
    n.lastSeenPlayer = NOW();
    switch (event) {
      case 'beaten_by_player':
        n.op -= Math.round(6 + vind * 18 + ego * 8);
        n.grudge += Math.round(14 + vind * 34);
        n.fear += Math.round(8 + (1 - n.p.aggro) * 22);
        n.hitsOnMe = (n.hitsOnMe || 0) + 1;
        break;
      case 'mugged_by_player':
        n.op -= Math.round(12 + vind * 22 + n.p.greed * 16);
        n.grudge += Math.round(24 + vind * 38 + n.p.greed * 18);
        n.fear += 6;
        break;
      case 'hospitalised_by_player':
        n.op -= Math.round(20 + vind * 30);
        n.grudge += Math.round(34 + vind * 44);
        n.fear += Math.round(14 + (1 - n.p.aggro) * 26);
        break;
      case 'spared_by_player':
        n.op += Math.round(8 + n.p.honesty * 14);
        n.grudge = Math.max(0, n.grudge - 18);
        n.fear += 12;
        break;
      case 'beat_player':
        n.op += 2; n.fear = Math.max(0, n.fear - 14); n.hitsByMe = (n.hitsByMe || 0) + 1;
        break;
      case 'lost_to_player':
        n.fear += Math.round(16 + (1 - n.p.ego) * 18);
        n.grudge += Math.round(6 + vind * 16);
        break;
      case 'bailed_by_player':
      case 'busted_by_player':
        n.op += Math.round(20 + n.p.honesty * 22);
        n.grudge = Math.max(0, n.grudge - 25);
        break;
      case 'bought_from_player': n.op += 2; break;
      case 'mailed_by_player': n.op += 1; break;
      case 'knocked_off_ladder':
        n.op -= Math.round(18 + ego * 26);
        n.grudge += Math.round(30 + vind * 40 + ego * 20);
        break;
      case 'bounty_by_player':
        n.op -= Math.round(25 + vind * 25);
        n.grudge += Math.round(30 + vind * 40);
        break;
    }
    n.op = clamp(n.op, -100, 100);
    n.grudge = clamp(n.grudge, 0, 100);
    n.fear = clamp(n.fear, 0, 100);

    /* loyal crew members take their friend's side */
    if (n.fam && (event === 'hospitalised_by_player' || event === 'mugged_by_player')) {
      var f = famById(n.fam);
      if (f) {
        for (var i = 0; i < f.members.length; i++) {
          var m = byId(f.members[i]);
          if (!m || m.id === n.id) continue;
          if (chance(m.p.loyalty * 0.5)) {
            m.op -= Math.round(4 + m.p.loyalty * 10);
            m.grudge += Math.round(3 + m.p.loyalty * 12);
          }
        }
      }
    }
  }

  function rivalry(n, otherId, amount) {
    if (!n.rivals) n.rivals = {};
    n.rivals[otherId] = clamp((n.rivals[otherId] || 0) + amount, 0, 100);
    var keys = Object.keys(n.rivals);
    if (keys.length > 8) {
      keys.sort(function (a, b) { return n.rivals[a] - n.rivals[b]; });
      delete n.rivals[keys[0]];
    }
  }

  function recompute(n) {
    if (n.id === 0) return;
    n.gear = GAME.items.gearPower(n);
    n.healthMax = Math.max(50, Math.round(100 + (n.level - 1) * 12.25));
    if (n.health > n.healthMax) n.health = n.healthMax;
  }

  /* ---- presence -------------------------------------------------- */
  function localHour(n, now) {
    var d = new Date(now);
    return (((d.getUTCHours() + d.getUTCMinutes() / 60) + n.tz) % 24 + 24) % 24;
  }

  function onlinePressure(n, now) {
    if (n.dead) return 0;
    var h = localHour(n, now);
    var d = Math.abs(h - n.peak);
    if (d > 12) d = 24 - d;
    var width = 2.6 + n.p.activity * 3.2;
    var hourFactor = Math.exp(-(d * d) / (2 * width * width));
    var day = new Date(now).getUTCDay();
    var weekend = (day === 0 || day === 6) ? 1.28 : 1;
    /* everybody sleeps sometime */
    if (h > 2.5 && h < 6.5) hourFactor *= 0.10;
    /* somebody who barely played their account is not suddenly going to
       start now - the roster keeps its dead weight */
    var stickiness = clamp(0.42 + (n.pf === undefined ? 0.7 : n.pf) * 1.1, 0.25, 1);
    return clamp(n.p.activity * hourFactor * weekend * stickiness, 0, 1);
  }

  /* Bring an offline account's pools up to date in one shot. */
  function catchUpPools(n, now) {
    var last = n.lastRegen || n.lastOnline || now;
    var mins = Math.min((now - last) / MIN, 60 * 24 * 3);
    var lv = n.level - 1;
    n.energyMax = Math.round(30 + 2.05 * lv);
    n.energy = Math.min(n.energyMax, (n.energy || 0) + Math.floor(mins / 3));
    n.nerve = Math.min(Math.round(5 + 0.35 * lv), (n.nerve || 0) + Math.floor(mins / 5));
    n.will = Math.min(Math.round(12 + 0.98 * lv), (n.will || 0) + Math.floor(mins / 12));
    n.dexg = Math.min(Math.round(20 + 0.60 * lv), (n.dexg || 0) + Math.floor(mins / 8));
    n.attacks = Math.min(Math.round(5 + 0.07 * lv), (n.attacks || 0) + Math.floor(mins / 20));
    if (n.hospUntil <= now && n.health < n.healthMax) {
      n.health = Math.min(n.healthMax, n.health + Math.floor(mins / 1.5) * Math.max(1, Math.round(n.healthMax / 100)));
    }
    n.lastRegen = now;
  }

  /* ---- targeting -------------------------------------------------
     Everybody is attackable from the player lists. The ladder is the
     prize: twenty rungs, and the only way on is to beat somebody who
     is already there.
  -------------------------------------------------------------------- */
  function pickTarget(n, now) {
    /* 1. settle a score with the human */
    if (n.grudge > 28 && chance(n.grudge / 190 + n.p.vindictive * 0.14)) {
      if (!GAME.ladder.guarded(S.player) && GAME.combat.odds(n, S.player) > 0.30 - n.p.aggro * 0.15) return 0;
    }
    /* 2. hunt a bounty */
    var hl = GAME.hitlist.list();
    for (var i = 0; i < hl.length && i < 6; i++) {
      var t = byId(hl[i].target);
      if (!t || t.id === n.id || hl[i].amount < 4000) continue;
      if (GAME.ladder.guarded(t)) continue;
      if (GAME.combat.odds(n, t) > 0.55 && chance(0.14 + n.p.greed * 0.3)) return t.id;
    }
    /* 3. take a run at the Attack Ladder - the ambition of every fighter */
    var myRung = GAME.ladder.rungOf(n.id);
    var wantLadder = 0.10 + n.p.aggro * 0.35 + n.p.ego * 0.25;
    if (chance(wantLadder)) {
      var best = null, bestScore = -1;
      var roster = GAME.ladder.roster();
      for (var r = 0; r < roster.length; r++) {
        if (myRung && r + 1 >= myRung) continue;      // only worth climbing
        var e = byId(roster[r]);
        if (!e || e.id === n.id) continue;
        if (GAME.ladder.busy(e)) continue;
        if (GAME.ladder.cooldownLeft(n.id, e.id) > 0) continue;
        var o = GAME.combat.odds(n, e);
        var want = 0.66 - n.p.aggro * 0.30 + n.p.patience * 0.10;
        if (o < want) continue;
        var score = (roster.length - r) * (0.4 + o);
        if (score > bestScore) { bestScore = score; best = e.id; }
      }
      if (best !== null) return best;
    }
    /* 4. family war */
    if (n.fam) {
      var f = famById(n.fam);
      if (f && f.wars.length && chance(0.16 + n.p.loyalty * 0.22)) {
        var enemy = famById(pick(f.wars));
        if (enemy) {
          var ms = GAME.family.membersOf(enemy).filter(function (m) { return !GAME.ladder.busy(m) && !GAME.ladder.guarded(m); });
          if (ms.length) {
            var cand = pick(ms);
            if (GAME.combat.odds(n, cand) > 0.35) return cand.id;
          }
        }
      }
    }
    /* 5. a personal rival */
    var rk = Object.keys(n.rivals || {});
    if (rk.length && chance(0.18 + n.p.vindictive * 0.25)) {
      var rid = Number(rk[Math.floor(rnd() * rk.length)]);
      var rv = byId(rid);
      if (rv && !GAME.ladder.busy(rv) && !GAME.ladder.guarded(rv) && GAME.combat.odds(n, rv) > 0.32) return rid;
    }
    /* 6. otherwise pick somebody off the online list, the way a real
          player browses for an easy mark or a fair fight */
    var pool = GAME.sim.onlineList();
    if (!pool.length) pool = S.npcs;
    var tries = 8;
    var wantEasy = n.p.aggro > 0.6 && n.p.honesty < 0.55;
    while (tries-- > 0) {
      var c = pool[Math.floor(rnd() * pool.length)];
      if (!c || c.id === n.id || c.dead) continue;
      if (GAME.ladder.busy(c) || GAME.ladder.guarded(c)) continue;
      if (GAME.ladder.cooldownLeft(n.id, c.id) > 0) continue;
      var od = GAME.combat.odds(n, c);
      if (wantEasy ? od > 0.75 : (od > 0.45 && od < 0.95)) return c.id;
    }
    /* They might swing at the human, but there is nothing in it for them
       while you are a broke nobody at the bottom of the board - which is
       what gives a new account room to breathe. */
    var worth = (S.player.money > 4000 ? 1 : 0) + (S.player.level > 6 ? 1 : 0) +
      (GAME.ladder.onLadder(0) ? 2 : 0) + (S.player.respect > 60 ? 1 : 0);
    if (worth > 0 && chance(0.012 * worth) && !GAME.ladder.guarded(S.player) && !GAME.ladder.busy(S.player)) {
      if (GAME.combat.odds(n, S.player) > 0.6) return 0;
    }
    return null;
  }

  /* ---- one decision, made while logged in ------------------------ */
  function act(n, now) {
    if (n.dead) return;
    if (n.hospUntil > now || n.jailUntil > now) {
      if (chance(n.p.chatty * 0.05)) chatEvent(n, n.hospUntil > now ? 'hospitalWhine' : 'jailWhine', now);
      if (n.jailUntil > now && n.money > 40000 && chance(0.03)) {
        n.money -= Math.round((n.jailUntil - now) / 1000 * 55);
        n.jailUntil = 0;
      }
      if (n.hospUntil > now && n.points > 40 && chance(0.02)) {
        n.points -= 40; n.hospUntil = 0; n.health = n.healthMax;
      }
      return;
    }

    var p = n.p;
    var weights = [
      ['crime', (n.nerve > 0 ? 1 : 0) * (0.5 + p.greed * 0.9 + p.patience * 0.4)],
      ['job', (n.will > 0 ? 1 : 0) * (0.3 + p.patience * 0.8 - p.aggro * 0.15)],
      ['gym', (n.energy > 5 ? 1 : 0) * (0.3 + p.skill * 1.1 + p.patience * 0.5)],
      ['attack', (n.attacks > 0 && n.energy >= 10 ? 1 : 0) * (0.15 + p.aggro * 1.9 + n.grudge / 90)],
      ['walk', (n.energy > 3 ? 1 : 0) * (0.15 + p.humor * 0.4)],
      ['chat', 0.25 + p.chatty * 2.1],
      ['forum', 0.05 + p.chatty * 0.5],
      ['idle', 0.7 + (1 - p.activity) * 1.4]
    ];
    var choice = pickW(weights);

    if (choice === 'crime') doCrime(n, now);
    else if (choice === 'job') doJob(n);
    else if (choice === 'gym') doGym(n);
    else if (choice === 'attack') doAttack(n, now);
    else if (choice === 'walk') doWalk(n);
    else if (choice === 'chat') chatEvent(n, null, now);
    else if (choice === 'forum') { if (chance(0.35)) GAME.forumSim.tick(now); }
  }

  function doJob(n) {
    var list = DATA.jobs || [];
    if (!list.length || n.will < 1) return;
    var best = null;
    for (var i = list.length - 1; i >= 0; i--) {
      var j = list[i];
      if ((j.lvl || 1) <= n.level && (j.will || j.energy || 1) <= n.will) { best = j; break; }
    }
    if (!best) return;
    n.will -= (best.will || best.energy || 1);
    n.money += rint(best.pay[0], best.pay[1]);
    gainNpcXP(n, rint(best.xp[0], best.xp[1]));
  }

  function doWalk(n) {
    if (n.energy < 3) return;
    n.energy -= 3;
    var r = rnd();
    if (r < 0.30) n.money += rint(20, 400) * Math.max(1, Math.round(n.level / 3));
    else if (r < 0.40) n.points = (n.points || 0) + rint(1, 8);
    else if (r < 0.46) n.attacks = (n.attacks || 0) + 1;
    else if (r < 0.50) n.health = Math.max(1, n.health - rint(5, 40));
    else if (r < 0.53) n.jailUntil = NOW() + rint(60, 600) * 1000;
  }

  function doCrime(n, now) {
    if (n.nerve < 1) return;
    var list = DATA.crimes || [];
    if (!list.length) return;
    /* they take the best crime they can pass reliably, the same way a
       real player settles into one they trust */
    var target = null;
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      if ((c.lvl || 1) > n.level) continue;
      if ((c.brave || 1) > n.nerve) continue;
      var head = n.level - (c.lvl || 1);
      var ch = clamp((c.base || 0.5) + (1 - Math.exp(-head / 9)) * 0.3 +
        Math.min(0.16, Math.log10(1 + n.dex) * 0.07) + Math.min(0.14, Math.log10(1 + (n.iq || 10)) * 0.07), 0.03, 0.97);
      if (ch > 0.55 + n.p.patience * 0.2 || (n.p.aggro > 0.75 && ch > 0.35)) { target = { c: c, ch: ch }; break; }
    }
    if (!target) {
      for (var j = 0; j < list.length; j++) {
        if ((list[j].lvl || 1) <= n.level && (list[j].brave || 1) <= n.nerve) { target = { c: list[j], ch: 0.6 }; break; }
      }
    }
    if (!target) return;
    n.nerve -= (target.c.brave || 1);
    if (chance(target.ch)) {
      var cash = rint(target.c.pay[0], target.c.pay[1]);
      n.money += cash;
      n.crimes = (n.crimes || 0) + 1;
      gainNpcXP(n, rint(target.c.xp[0], target.c.xp[1]));
      if (cash > 200000 && chance(0.25)) {
        GAME.feed.newsFrom('crimeWin', 'crime', { who: n.name, amount: money(cash), crime: target.c.name.toLowerCase(), city: n.city });
      }
    } else if (chance(target.c.jailP === undefined ? 0.5 : target.c.jailP)) {
      var secs = rint(target.c.jail[0], target.c.jail[1]);
      n.jailUntil = now + secs * 1000;
      n.jailWhy = target.c.name;
      if (chance(0.16)) GAME.feed.newsFrom('jail', 'jail', { who: n.name, crime: target.c.name.toLowerCase(), n: Math.round(secs / 60), city: n.city });
    }
  }

  function doGym(n) {
    if (n.energy < 5) return;
    var sets = Math.min(Math.floor(n.energy / 5), rint(1, 4));
    if (sets < 1) return;
    n.energy -= sets * 5;
    var stat = pickW([['str', 1 + n.p.aggro], ['def', 1 + (1 - n.p.aggro) * 0.8], ['spd', 0.8], ['dex', 0.7]]);
    n.will = Math.max(0, (n.will || 0) - sets);
    trainNpc(n, stat, sets);
  }

  function doAttack(n, now) {
    if (n.attacks < 1 || n.energy < 10) return;
    var tid = pickTarget(n, now);
    if (tid === null) return;
    n.attacks -= 1;
    GAME.ladder.npcAttack(n, tid);
  }

  function gainNpcXP(n, xp) {
    n.xp = (n.xp || 0) + xp;
    var ceiling = CFG.MAX_LEVEL > 0 ? CFG.MAX_LEVEL : 100000;
    var need = GAME.progress.xpForLevel(n.level + 1);
    var guard = 0;
    while (n.level < ceiling && n.xp >= need && guard++ < 400) {
      n.level++;
      n.healthMax = Math.round(100 + (n.level - 1) * 12.25);
      n.health = n.healthMax;
      n.energyMax = Math.round(30 + 2.05 * (n.level - 1));
      need = GAME.progress.xpForLevel(n.level + 1);
      if (chance(0.30)) GAME.feed.newsFrom('rankUp', 'rank', { who: n.name, rank: GAME.progress.rankFor(n.xp).name, n: n.level, city: n.city });
      /* they upgrade their kit as they grow */
      if (chance(0.4)) {
        var w = GAME.items.bestFor(['melee', 'pistol', 'smg', 'rifle', 'heavy'], n.level, n.money * 0.5);
        if (w && (!n.wpn || (GAME.items.get(n.wpn) || {}).atk < w.atk)) { n.money -= w.price; n.wpn = w.id; }
        var a = GAME.items.bestFor(['armor'], n.level, n.money * 0.4);
        if (a && (!n.arm || (GAME.items.get(n.arm) || {}).def < a.def)) { n.money -= a.price; n.arm = a.id; }
        recompute(n);
      }
    }
  }

  /* The gym an account has actually paid its way into. They train on the
     same curve the player does - same multipliers, same diminishing
     returns, same Will factor - so a level 30 account is a level 30
     account whoever is driving it. */
  function gymFor(n) {
    var list = DATA.gym || [];
    var best = list[0] || { str: 1, def: 1, spd: 1, dex: 1 };
    var purse = (n.money || 0) + (n.bank || 0);
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      if ((g.lvl || 1) > n.level) continue;
      if (g.price > purse * (0.6 + n.p.greed * 1.4)) continue;
      if ((g.str + g.def + g.spd + g.dex) > (best.str + best.def + best.spd + best.dex)) best = g;
    }
    return best;
  }

  function npcWillFactor(n) {
    var max = Math.max(1, Math.round(12 + 0.98 * (n.level - 1)));
    return 0.55 + 0.45 * clamp((n.will || 0) / max, 0, 1);
  }

  function trainNpc(n, stat, sets, willF) {
    var g = gymFor(n);
    var mult = g[stat] || 0;
    if (!mult) { stat = 'str'; mult = g.str || 1; }
    var cur = n[stat] || 10;
    var per = mult
      * (1.6 / (1 + Math.pow(cur / 240, 0.82)))
      * (1 + Math.log(1 + n.level) / Math.LN10 * 0.22)
      * (willF === undefined ? npcWillFactor(n) : willF);
    n[stat] = Math.round((cur + per * sets) * 100) / 100;
    return per * sets;
  }

  /* ---- bulk progression ------------------------------------------
     While you are away the roster is simulated in bulk: an account is
     credited with everything it would have done over the minutes it was
     logged in, rather than being stepped one action at a time. Discrete,
     visible events - ladder challenges, anybody coming after you - are
     still played out for real by the sim; this is the grind underneath.
  -------------------------------------------------------------------- */
  function crimeChance(n, c) {
    var head = n.level - (c.lvl || 1);
    return clamp((c.base || 0.5) + (1 - Math.exp(-head / 9)) * 0.3 +
      Math.min(0.16, Math.log10(1 + n.dex) * 0.07) +
      Math.min(0.14, Math.log10(1 + (n.iq || 10)) * 0.07), 0.03, 0.97);
  }

  /* `budget` is how much Brave / Will they have to spend across the whole
     session, not just what is standing in the bar right now. Filtering on
     the bar alone leaves an account that just emptied it unable to pick a
     crime at all for the rest of the night. */
  function bestCrime(n, budget) {
    var list = DATA.crimes || [];
    if (budget === undefined) budget = n.nerve;
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      if ((c.lvl || 1) > n.level || (c.brave || 1) > budget) continue;
      var ch = crimeChance(n, c);
      if (ch > 0.55 + n.p.patience * 0.2 || (n.p.aggro > 0.75 && ch > 0.35)) return c;
    }
    for (var j = 0; j < list.length; j++) {
      if ((list[j].lvl || 1) <= n.level && (list[j].brave || 1) <= budget) return list[j];
    }
    return null;
  }

  function bestJob(n, budget) {
    var list = DATA.jobs || [];
    if (budget === undefined) budget = n.will;
    for (var i = list.length - 1; i >= 0; i--) {
      var j = list[i];
      if ((j.lvl || 1) <= n.level && (j.will || j.energy || 1) <= budget) return j;
    }
    return null;
  }

  function bulkProgress(n, minutes) {
    if (n.dead || minutes <= 0) return;
    var now = NOW();
    if (n.jailUntil > now || n.hospUntil > now) { n.lastRegen = now; return; }
    var p = n.p;

    /* What they had when they sat down PLUS everything that trickled in
       while they were sitting there. Spending only the standing pool is
       what a session actually looks like for about ten seconds. */
    var braveMax = Math.round(5 + 0.35 * (n.level - 1));
    var willMax = Math.round(12 + 0.98 * (n.level - 1));
    var atkMax = Math.round(5 + 0.07 * (n.level - 1));
    var brave = (n.nerve || 0) + minutes / 5;
    var will = (n.will || 0) + minutes / 12;
    var energy = (n.energy || 0) + minutes / 3;
    var attacks = (n.attacks || 0) + minutes / 20;
    n.lastRegen = now;

    /* crimes eat Brave */
    var c = bestCrime(n, brave);
    if (c) {
      var num = Math.floor(brave / (c.brave || 1));
      num = Math.floor(num * clamp(0.35 + p.greed * 0.6 + p.patience * 0.25, 0.1, 1));
      if (num > 0) {
        brave -= num * (c.brave || 1);
        var ch = crimeChance(n, c);
        var wins = Math.round(num * ch);
        var fails = num - wins;
        n.money += Math.round(wins * (c.pay[0] + c.pay[1]) / 2);
        n.crimes = (n.crimes || 0) + wins;
        gainNpcXP(n, Math.round(wins * (c.xp[0] + c.xp[1]) / 2));
        if (fails > 0 && chance(clamp(fails * (c.jailP === undefined ? 0.5 : c.jailP) * 0.22, 0, 0.55))) {
          n.jailUntil = now + rint(c.jail[0], c.jail[1]) * 1000;
          n.jailWhy = c.name;
        }
      }
    }

    /* shifts eat Will */
    var j2 = bestJob(n, will);
    if (j2) {
      var shifts = Math.floor(will / (j2.will || j2.energy || 1));
      shifts = Math.floor(shifts * clamp(0.3 + p.patience * 0.7 - p.aggro * 0.2, 0.05, 1));
      if (shifts > 0) {
        will -= shifts * (j2.will || j2.energy || 1);
        n.money += Math.round(shifts * (j2.pay[0] + j2.pay[1]) / 2);
        gainNpcXP(n, Math.round(shifts * (j2.xp[0] + j2.xp[1]) / 2));
      }
    }

    /* Energy splits between the gym and the street, exactly the tension
       the original had - the same bar pays for both. */
    var atkShare = clamp(p.aggro * 0.85, 0.05, 0.9);
    var wantAttacks = Math.min(Math.floor(attacks), Math.floor(energy * atkShare / 10));
    var gymEnergy = Math.max(0, energy - wantAttacks * 10);
    var sets = Math.floor(gymEnergy / 5 * clamp(0.4 + p.skill * 0.8, 0.15, 1));
    sets = Math.min(sets, Math.floor(will));    // a set costs Will as well as Energy
    if (sets > 0) {
      energy -= sets * 5;
      var willF = 0.55 + 0.45 * clamp(will / Math.max(1, willMax), 0, 1);
      will -= sets;
      /* they spread their sets the way their temperament says they should */
      var plan = [['str', 1 + p.aggro], ['def', 1 + (1 - p.aggro) * 0.8], ['spd', 0.8], ['dex', 0.7]];
      var chunks = Math.min(3, sets);
      for (var q = 0; q < chunks; q++) {
        trainNpc(n, pickW(plan), Math.floor(sets / chunks), willF);
      }
    }

    /* Fights. One in five is played out properly so the ladder really
       moves and so somebody can come looking for you; the rest resolve
       on the numbers alone. */
    /* Fights are capped per flush so one very aggressive account cannot
       run a hundred of them inside a single simulated hour. */
    wantAttacks = Math.min(wantAttacks, 6);
    for (var a = 0; a < wantAttacks; a++) {
      if (attacks < 1 || energy < 10) break;
      attacks -= 1;
      energy -= 10;
      if (chance(0.25)) {
        n.attacks = Math.max(1, n.attacks);
        n.energy = Math.max(10, n.energy);
        doAttack(n, now);
      } else {
        abstractFight(n, now);
      }
      if (n.hospUntil > now || n.jailUntil > now) break;
    }

    /* whatever they did not get through goes back in the tank */
    n.nerve = clamp(Math.floor(brave), 0, braveMax);
    n.will = clamp(Math.floor(will), 0, willMax);
    n.energy = clamp(Math.floor(energy), 0, n.energyMax || 50);
    n.attacks = clamp(Math.floor(attacks), 0, atkMax);

    /* the shoutbox regulars keep talking */
    if (chance(clamp(p.chatty * minutes / 90, 0, 0.5))) chatEvent(n, null, now);

    /* they spend what they earn */
    if (chance(0.12)) {
      var w = GAME.items.bestFor(['melee', 'pistol', 'smg', 'rifle', 'heavy'], n.level, n.money * 0.5);
      if (w && (!n.wpn || (GAME.items.get(n.wpn) || {}).atk < w.atk)) { n.money -= w.price; n.wpn = w.id; recompute(n); }
      var ar = GAME.items.bestFor(['armor'], n.level, n.money * 0.35);
      if (ar && (!n.arm || (GAME.items.get(n.arm) || {}).def < ar.def)) { n.money -= ar.price; n.arm = ar.id; recompute(n); }
    }
    if (n.money < 0) n.money = 0;
  }

  /* A fight between two accounts nobody is watching. Resolved on odds
     with no blow-by-blow, but with real consequences. */
  function abstractFight(n, now) {
    var pool = GAME.sim.onlineList();
    var d = pool.length ? pool[Math.floor(rnd() * pool.length)] : S.npcs[Math.floor(rnd() * S.npcs.length)];
    if (!d || d.id === n.id || d.dead) return;
    if (GAME.ladder.busy(d) || GAME.ladder.guarded(d)) return;
    if (GAME.ladder.rungOf(d.id)) return;      // ladder fights are always played out for real
    var o = GAME.combat.odds(n, d);
    if (chance(o)) {
      n.w++; d.l++;
      gainNpcXP(n, Math.max(2, Math.round((d.level || 1) * 3.2)));
      n.respect += Math.max(1, Math.round(5 * Math.max(0.2, GAME.combat.power(d) / Math.max(1, GAME.combat.power(n)))));
      if (chance(0.3 + n.p.greed * 0.5)) {
        var take = Math.round((d.money || 0) * clamp(CFG.MUG_FRACTION * rflt(0.6, 1.4), 0.05, 0.5));
        d.money -= take; n.money += take;
      }
      d.hospUntil = now + GAME.ladder.hospTime(maxHealth(d) * rflt(0.35, 1.1), d);
      d.hospWhy = 'Beaten by ' + n.name;
      d.health = Math.max(1, Math.round(maxHealth(d) * 0.15));
      GAME.npc.rivalry(d, n.id, 10);
    } else {
      n.l++; d.w++;
      n.hospUntil = now + GAME.ladder.hospTime(maxHealth(n) * rflt(0.3, 1), n);
      n.hospWhy = 'Picked the wrong fight with ' + d.name;
      n.health = Math.max(1, Math.round(maxHealth(n) * 0.15));
      GAME.npc.rivalry(n, d.id, 8);
    }
  }

  /* ---- talking --------------------------------------------------- */
  function chatEvent(n, forceBank, now) {
    if (!DATA.chat) return;
    if (now - (n.lastChat || 0) < rint(20, 240) * 1000) return;
    n.lastChat = now;
    var bank = forceBank || chooseBank(n);
    var pool = DATA.chat[bank];
    if (!pool || !pool.length) return;
    var other = pick(S.npcs);
    var line = tpl(pick(pool), {
      me: S.player.name,
      target: n.grudge > 30 && chance(0.5) ? S.player.name : other.name,
      other: pick(S.npcs).name,
      family: (famById(n.fam) || pick(S.fams) || {}).name || 'the family',
      item: (pick(GAME.items.all()) || {}).name || 'a piece',
      amount: money(rint(200, 2000000)),
      city: n.city,
      rank: GAME.progress.rankFor(n.xp || 0).name,
      n: rint(2, 900),
      crime: ((pick(DATA.crimes || []) || {}).name || 'a job').toLowerCase()
    });
    GAME.feed.say(n, style(n, line), now);
  }

  function chooseBank(n) {
    var p = n.p;
    var w = [
      ['smalltalk', 2.2 + p.chatty],
      ['greeting', 0.5],
      ['brag', 0.6 + p.ego * 2.2],
      ['trashtalk', 0.3 + p.aggro * 1.9],
      ['lolspam', 0.4 + p.humor * 1.8],
      ['noobQuestion', n.level < 12 ? 2.4 : 0.15],
      ['vetAnswer', n.level > 28 ? 1.5 + p.ego : 0.1],
      ['sell', 0.3 + p.greed * 1.4],
      ['buy', 0.2 + p.greed * 0.8],
      ['recruit', n.fam ? 0.4 + p.loyalty * 1.1 : 0.05],
      ['complainAdmin', 0.4 + (1 - p.patience) * 1.2],
      ['accuseCheat', 0.15 + p.vindictive * 0.9],
      ['drama', 0.3 + p.vindictive * 1.4],
      ['beg', n.money < 5000 ? 1.2 : 0.1],
      ['flirt', 0.15 + p.humor * 0.5],
      ['congrats', 0.4],
      ['welcomeNewbie', 0.3 + p.generosity],
      ['afk', 0.35],
      ['quitting', (1 - p.patience) * 0.35],
      ['revengeThreat', n.grudge > 25 ? 1.6 + p.vindictive : 0.08],
      ['farewell', 0.3]
    ];
    /* how they talk to the human specifically */
    if (chance(0.14) && S.player.st && (S.player.st.w + S.player.st.l) > 0) {
      if (n.grudge > 35 || n.op < -30) return 'toPlayerHostile';
      if (GAME.ladder.rungOf(0) <= 45) return 'toPlayerRespect';
      if (n.op > 30) return 'toPlayerFriendly';
      if (GAME.ladder.rungOf(0) > 140) return 'toPlayerMocking';
    }
    return pickW(w);
  }

  /* ---- avatars: deterministic mugshots, no external images ------- */
  var SKIN = ['#f0c8a0', '#e8b489', '#d99b6c', '#b5794b', '#8d5a34', '#6b4226', '#f6d5b8'];
  var HAIR = ['#1a1208', '#2b1a0b', '#4a2c14', '#7a4a1c', '#b07a30', '#d9c07a', '#8a8a8a', '#151515', '#5c1f1f'];
  var SHIRT = ['#8b1a1a', '#1a3a6b', '#2b5c2b', '#4a2b6b', '#6b5a1a', '#2b2b2b', '#5c5c6b', '#7a3a1a', '#1a5c5c'];
  var BG = ['#2a2a2a', '#332b22', '#22292e', '#2e2622', '#262e26'];

  function avatar(n, size) {
    var k = n.name || 'x';
    var sk = seededPick(k, 'sk', SKIN), hr = seededPick(k, 'hr', HAIR);
    var sh = seededPick(k, 'sh', SHIRT), bg = seededPick(k, 'bg', BG);
    var bald = seededFloat(k, 'bald') < 0.13;
    var hat = seededFloat(k, 'hat') < 0.22;
    var shades = seededFloat(k, 'shd') < 0.18;
    var beard = seededFloat(k, 'brd') < 0.28 && n.gender === 'm';
    var scar = seededFloat(k, 'scr') < 0.12;
    var w = size || 40;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="' + w + '" height="' + w + '" shape-rendering="crispEdges">';
    s += '<rect width="32" height="32" fill="' + bg + '"/>';
    s += '<rect x="6" y="24" width="20" height="8" fill="' + sh + '"/>';
    s += '<rect x="13" y="20" width="6" height="5" fill="' + sk + '"/>';
    s += '<rect x="8" y="6" width="16" height="16" rx="1" fill="' + sk + '"/>';
    if (!bald) s += '<rect x="7" y="4" width="18" height="5" fill="' + hr + '"/><rect x="7" y="9" width="2" height="6" fill="' + hr + '"/><rect x="23" y="9" width="2" height="6" fill="' + hr + '"/>';
    if (hat) s += '<rect x="6" y="2" width="20" height="4" fill="#151515"/><rect x="4" y="6" width="24" height="2" fill="#0d0d0d"/>';
    if (shades) s += '<rect x="10" y="12" width="12" height="4" fill="#111"/>';
    else {
      s += '<rect x="11" y="13" width="3" height="2" fill="#fff"/><rect x="18" y="13" width="3" height="2" fill="#fff"/>';
      s += '<rect x="12" y="13" width="1" height="2" fill="#222"/><rect x="19" y="13" width="1" height="2" fill="#222"/>';
    }
    s += '<rect x="15" y="16" width="2" height="2" fill="rgba(0,0,0,.25)"/>';
    if (beard) s += '<rect x="11" y="18" width="10" height="4" fill="' + hr + '" opacity=".85"/>';
    else s += '<rect x="13" y="19" width="6" height="1" fill="rgba(0,0,0,.45)"/>';
    if (scar) s += '<rect x="21" y="10" width="1" height="6" fill="#a34"/>';
    s += '</svg>';
    return s;
  }

  return {
    style: style, voice: voice, remember: remember, rivalry: rivalry, recompute: recompute,
    onlinePressure: onlinePressure, localHour: localHour, catchUpPools: catchUpPools,
    act: act, pickTarget: pickTarget, chatEvent: chatEvent, avatar: avatar, gainXP: gainNpcXP,
    bulkProgress: bulkProgress, crimeChance: crimeChance, bestCrime: bestCrime, bestJob: bestJob,
    gymFor: gymFor, trainNpc: trainNpc
  };
})();
