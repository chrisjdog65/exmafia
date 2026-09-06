/* ============================================================
   01-util.js :: RNG, math, formatting, tiny DOM helpers
   ============================================================ */

/* ---- Seeded PRNG (mulberry32). The world is deterministic per save. ---- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  var h = 2166136261 >>> 0;
  s = String(s);
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/* The main world stream. Its cursor lives in the save so reloads continue
   the same sequence instead of replaying it. */
var RNG = {
  seed: 1,
  cursor: 0,
  fn: mulberry32(1),
  init: function (seed, cursor) {
    RNG.seed = seed >>> 0;
    RNG.cursor = cursor || 0;
    RNG.fn = mulberry32((RNG.seed + RNG.cursor * 2654435761) >>> 0);
  },
  next: function () {
    RNG.cursor++;
    if ((RNG.cursor & 1023) === 0) RNG.fn = mulberry32((RNG.seed + RNG.cursor * 2654435761) >>> 0);
    return RNG.fn();
  }
};

function rnd() { return RNG.next(); }
function rint(lo, hi) { return lo + Math.floor(rnd() * (hi - lo + 1)); }
function rflt(lo, hi) { return lo + rnd() * (hi - lo); }
function chance(p) { return rnd() < p; }
function pick(arr) { return (arr && arr.length) ? arr[Math.floor(rnd() * arr.length)] : undefined; }

function pickN(arr, n) {
  var copy = arr.slice(), out = [];
  n = Math.min(n, copy.length);
  for (var i = 0; i < n; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

/* Weighted pick: items is [[value, weight], ...] */
function pickW(items) {
  var total = 0, i;
  for (i = 0; i < items.length; i++) total += items[i][1];
  var r = rnd() * total;
  for (i = 0; i < items.length; i++) { r -= items[i][1]; if (r <= 0) return items[i][0]; }
  return items[items.length - 1][0];
}

/* Approximate normal via sum of uniforms; clamped to +/-3 sd. */
function gauss(mean, sd) {
  var s = 0;
  for (var i = 0; i < 6; i++) s += rnd();
  return mean + (s - 3) / 1.2247 * sd;
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* Deterministic per-entity randomness that does NOT consume the world stream. */
function seededFloat(key, salt) {
  return mulberry32(hashStr(key + '|' + (salt || '')))();
}
function seededPick(key, salt, arr) {
  if (!arr || !arr.length) return undefined;
  return arr[Math.floor(seededFloat(key, salt) * arr.length) % arr.length];
}
function seededInt(key, salt, lo, hi) {
  return lo + Math.floor(seededFloat(key, salt) * (hi - lo + 1));
}

/* ---- formatting ---- */
function fmt(n) {
  n = Math.round(Number(n) || 0);
  var neg = n < 0; n = Math.abs(n);
  var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + s;
}
function money(n) { return '$' + fmt(n); }

function fmtShort(n) {
  n = Number(n) || 0;
  var a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2) + 't';
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'b';
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'm';
  if (a >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return fmt(n);
}

/* mm:ss / h:mm:ss countdown */
function clock(ms) {
  if (ms <= 0) return '0:00';
  var t = Math.ceil(ms / 1000);
  var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  var pad = function (x) { return x < 10 ? '0' + x : String(x); };
  return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
}

/* "3 minutes ago" */
function ago(ms) {
  var t = Math.max(0, Math.floor(ms / 1000));
  if (t < 45) return t <= 5 ? 'just now' : t + ' seconds ago';
  var m = Math.round(t / 60);
  if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
  var h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  var d = Math.round(h / 24);
  if (d < 30) return d + (d === 1 ? ' day ago' : ' days ago');
  var mo = Math.round(d / 30);
  if (mo < 12) return mo + (mo === 1 ? ' month ago' : ' months ago');
  return Math.round(mo / 12) + ' years ago';
}

function stamp(t) {
  var d = new Date(t);
  var pad = function (x) { return x < 10 ? '0' + x : String(x); };
  var h = d.getHours(), ap = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return (d.getMonth() + 1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(2) +
    ' ' + h + ':' + pad(d.getMinutes()) + ap;
}
function stampShort(t) {
  var d = new Date(t), pad = function (x) { return x < 10 ? '0' + x : String(x); };
  var h = d.getHours(), ap = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return h + ':' + pad(d.getMinutes()) + ap;
}

function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pluralize(n, one, many) { return n === 1 ? one : (many || one + 's'); }

function ordinal(n) {
  var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* Substitute {slots} in a template string. */
function tpl(str, vars) {
  if (!str) return '';
  return String(str).replace(/\{(\w+)\}/g, function (m, k) {
    return (vars && vars[k] !== undefined && vars[k] !== null) ? String(vars[k]) : m;
  });
}

/* ---- tiny DOM ---- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

var MIN = 60000, HOUR = 3600000, DAY = 86400000;

/* ---- world clock ------------------------------------------------
   Everything in the engine reads the time through NOW(). During the
   offline catch-up pass the clock is pinned to each simulated step so
   hospital and jail timers land where they actually belong instead of
   all bunching up at the moment you opened the page.
------------------------------------------------------------------- */
var _clock = null;
function NOW() { return _clock === null ? Date.now() : _clock; }
function setClock(t) { _clock = t; }
function realClock() { _clock = null; }
