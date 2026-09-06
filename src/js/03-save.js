/* ============================================================
   03-save.js :: persistence
   localStorage is primary. When the page is opened straight off
   the filesystem some browsers hand back an opaque origin and
   throw on access, so this falls back to IndexedDB and then to
   an in-memory store, and always offers manual export/import.
   ============================================================ */

GAME.save = (function () {
  var mem = {};            // last-resort store
  var backend = 'unknown'; // 'local' | 'idb' | 'memory'
  var idb = null;
  var dirty = false;
  var lastWrite = 0;

  function probeLocal() {
    try {
      var k = '__exm_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  function openIDB() {
    return new Promise(function (res) {
      try {
        var req = indexedDB.open('exmafia', 1);
        req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
        req.onsuccess = function () { res(req.result); };
        req.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }

  function idbGet(key) {
    return new Promise(function (res) {
      if (!idb) return res(null);
      try {
        var tx = idb.transaction('kv', 'readonly').objectStore('kv').get(key);
        tx.onsuccess = function () { res(tx.result || null); };
        tx.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }

  function idbPut(key, val) {
    return new Promise(function (res) {
      if (!idb) return res(false);
      try {
        var tx = idb.transaction('kv', 'readwrite').objectStore('kv').put(val, key);
        tx.onsuccess = function () { res(true); };
        tx.onerror = function () { res(false); };
      } catch (e) { res(false); }
    });
  }

  function init() {
    if (probeLocal()) { backend = 'local'; return Promise.resolve(backend); }
    return openIDB().then(function (db) {
      idb = db;
      backend = db ? 'idb' : 'memory';
      return backend;
    });
  }

  function readRaw(key) {
    if (backend === 'local') { try { return Promise.resolve(window.localStorage.getItem(key)); } catch (e) { return Promise.resolve(null); } }
    if (backend === 'idb') return idbGet(key);
    return Promise.resolve(mem[key] || null);
  }

  function writeRaw(key, str) {
    if (backend === 'local') {
      try { window.localStorage.setItem(key, str); return Promise.resolve(true); }
      catch (e) { backend = 'memory'; mem[key] = str; return Promise.resolve(false); }
    }
    if (backend === 'idb') return idbPut(key, str);
    mem[key] = str; return Promise.resolve(true);
  }

  function serialize() {
    S.rngCursor = RNG.cursor;
    S.savedAt = Date.now();
    S.cfg = CFG;                 // tuning edits from the back office travel with the game
    /* underscore keys are derived caches - they cost space and go stale */
    return JSON.stringify(S, function (k, v) {
      return (k.charAt(0) === '_' && k !== '_rankName' && k !== '_lastInterest' && k !== '_lastIncome') ? undefined : v;
    });
  }

  function write(force) {
    if (!S) return Promise.resolve(false);
    var now = Date.now();
    if (!force && now - lastWrite < 4000 && !dirty) return Promise.resolve(false);
    lastWrite = now;
    dirty = false;
    var str;
    try { str = serialize(); } catch (e) { GAME.save.lastError = 'serialize: ' + e.message; return Promise.resolve(false); }
    // keep one generation of backup so a corrupt write is survivable
    return readRaw(CFG.SAVE_KEY).then(function (prev) {
      if (prev && prev.length > 200) writeRaw(CFG.SAVE_BACKUP_KEY, prev);
      return writeRaw(CFG.SAVE_KEY, str);
    }).then(function (ok) {
      GAME.save.lastSaved = Date.now();
      return ok;
    });
  }

  function load() {
    return readRaw(CFG.SAVE_KEY).then(function (str) {
      if (!str) return null;
      try { return JSON.parse(str); }
      catch (e) {
        return readRaw(CFG.SAVE_BACKUP_KEY).then(function (b) {
          try { return b ? JSON.parse(b) : null; } catch (e2) { return null; }
        });
      }
    });
  }

  function wipe() {
    return Promise.all([writeRaw(CFG.SAVE_KEY, ''), writeRaw(CFG.SAVE_BACKUP_KEY, '')]).then(function () {
      if (backend === 'local') { try { localStorage.removeItem(CFG.SAVE_KEY); localStorage.removeItem(CFG.SAVE_BACKUP_KEY); } catch (e) {} }
      delete mem[CFG.SAVE_KEY];
      return true;
    });
  }

  function exportText() { return serialize(); }

  function importText(str) {
    var obj;
    try { obj = JSON.parse(str); } catch (e) { return 'That is not a valid save file.'; }
    if (!obj || !obj.player || !obj.npcs) return 'That file is missing player data.';
    S = GAME.state.migrate(obj);
    RNG.init(S.seed, S.rngCursor || 0);
    return null;
  }

  function download() {
    try {
      var blob = new Blob([serialize()], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'exmafia-save-' + (S.player.name || 'player').replace(/[^\w]+/g, '_') + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
      return true;
    } catch (e) { return false; }
  }

  return {
    init: init, write: write, load: load, wipe: wipe,
    exportText: exportText, importText: importText, download: download,
    markDirty: function () { dirty = true; },
    backend: function () { return backend; },
    lastSaved: 0,
    lastError: null
  };
})();
