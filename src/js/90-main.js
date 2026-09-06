/* ============================================================
   90-main.js :: boot
   ============================================================ */

GAME.boot = (function () {

  function newGameScreen() {
    GAME.ui.render = renderSplash;
    renderSplash();
  }

  function renderSplash() {
    $('#root').innerHTML = PAGES.newgame();
    var n = $('#ng-name');
    if (n) n.focus();
  }

  function start(opts) {
    GAME.ui.render = realRender;
    GAME.state.newGame(opts);
    reindex();
    GAME.progress.applyLevel(S.player);
    S.player.energy = S.player.energyMax;
    S.player.will = S.player.willMax;
    S.player.nerve = S.player.nerveMax;
    S.player.health = maxHealth(S.player);
    S.player.attacks = S.player.attacksMax;
    S.player._rankName = GAME.progress.rankFor(S.player.xp).name;
    GAME.save.write(true);
    GAME.sim.start();
    GAME.ui.go('city');
    setTimeout(function () {
      GAME.ui.toast('Welcome to exMafia. Two hundred people got here first.', 'good');
    }, 600);
  }

  var realRender = null;

  function resume(saved) {
    GAME.ui.render = realRender;
    S = GAME.state.migrate(saved);
    RNG.init(S.seed, S.rngCursor || 0);
    reindex();
    CFG.pace = (S.settings && S.settings.pace) || 1;
    GAME.progress.applyLevel(S.player);
    if (!S.player._rankName) S.player._rankName = GAME.progress.rankFor(S.player.xp).name;
    GAME.sim.backfillLadder();
    GAME.ladder.sync();

    var summary = GAME.sim.catchUp(Date.now());
    GAME.sim.start();
    GAME.ui.go('city');
    if (summary) showWelcomeBack(summary);
    GAME.save.write(true);
  }

  function showWelcomeBack(s) {
    if (s.away < 5 * MIN) return;
    var h = '<p class="dim">You were away for <b>' + ago(s.away) + '</b>.' +
      (s.capped ? ' The city only kept two weeks of history, so that is as far back as this goes.' : '') + '</p>';
    h += '<div class="pgrid" style="grid-template-columns:1fr 1fr">' +
      '<div class="prow"><span class="k">Attacks on you</span><span class="v">' + s.attacks.length + '</span></div>' +
      '<div class="prow"><span class="k">Fights you lost</span><span class="v">' + s.losses + '</span></div>' +
      '<div class="prow"><span class="k">New mail</span><span class="v">' + Math.max(0, s.newMail) + '</span></div>' +
      '<div class="prow"><span class="k">Money change</span><span class="v">' + GAME.ui.money2(s.moneyDelta) + '</span></div>' +
      '</div>';
    if (s.rungFrom || s.rungTo) {
      h += '<div class="hr"></div><p>' +
        (s.rungTo === 0 && s.rungFrom > 0 ? '<span class="bad">You were knocked off the Attack Ladder.</span>'
          : s.rungTo > 0 && s.rungFrom === 0 ? '<span class="good">You are on the ladder at rung ' + s.rungTo + '.</span>'
            : s.rungTo < s.rungFrom ? '<span class="good">You climbed to rung ' + s.rungTo + '.</span>'
              : s.rungTo > s.rungFrom ? '<span class="bad">You slid to rung ' + s.rungTo + '.</span>'
                : 'You are still holding rung ' + s.rungTo + '.') + '</p>';
    }
    if (s.attacks.length) {
      h += '<div class="hr"></div><b>While you were out</b>';
      for (var i = 0; i < Math.min(s.attacks.length, 12); i++) {
        h += '<div class="ln" style="padding:3px 0;border-bottom:1px solid #202127">' +
          '<span class="tm">' + stampShort(s.attacks[i].t) + '</span> ' + esc(s.attacks[i].line) + '</div>';
      }
      S.pendingAttackedBy = [];
    }
    h += '<div class="hr"></div><button class="btn" data-act="closemodal">Get back to work</button>';
    GAME.ui.modal('Welcome back', h);
  }

  function init() {
    /* stash the real renderer so the splash can swap it out */
    realRender = GAME.ui.render;

    GAME.normalize.run();
    GAME.actions.bind();

    window.addEventListener('hashchange', function () {
      var h = GAME.ui.fromHash();
      if (!S || !h) return;
      if (h.r !== GAME.ui.current() || h.id !== undefined) {
        if (PAGES[h.r]) GAME.ui.go(h.r, h.id !== undefined ? { id: h.id } : {});
      }
    });

    var flush = function () { if (S) GAME.save.write(true); };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) flush();
      else if (S) {
        var sum = GAME.sim.catchUp(Date.now());
        GAME.ui.render();
        if (sum && sum.away > 20 * MIN) showWelcomeBack(sum);
      }
    });
    setInterval(function () { if (S) GAME.save.write(false); }, 12000);

    GAME.save.init().then(function () {
      return GAME.save.load();
    }).then(function (saved) {
      if (saved && saved.player && saved.npcs) {
        try { resume(saved); return; }
        catch (e) {
          if (window.console) console.error('resume failed', e);
          GAME.ui.toast('That save would not load. Starting fresh.', 'bad');
        }
      }
      newGameScreen();
    }).catch(function (e) {
      if (window.console) console.error(e);
      newGameScreen();
    });
  }

  return { init: init, start: start, newGameScreen: newGameScreen, resume: resume };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', GAME.boot.init);
else GAME.boot.init();

/* A small window into the running game. Handy for anybody who wants to
   poke at the simulation from the console, and used by the test harness. */
try {
  window.EXM = {
    get S() { return S; },
    GAME: GAME, DATA: DATA, CFG: CFG, RNG: RNG, PAGES: PAGES,
    NOW: NOW, setClock: setClock, realClock: realClock,
    byId: byId, power: function (e) { return GAME.combat.power(e); }
  };
} catch (e) {}
