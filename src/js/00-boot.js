/* ============================================================
   exMafia :: Single Player
   Boot namespace. Every subsequent file appends to DATA / GAME.
   All files are concatenated, in filename order, into ONE IIFE
   inside the built exmafia.html — so top-level `const` is shared
   across files. Never redeclare a name.
   ============================================================ */
'use strict';

var DATA = {};   // static content tables (crimes, items, names, chat, ...)
var GAME = {};   // engine namespace (rng, sim, combat, ui, save, ...)
var S    = null; // the live save state, assigned by GAME.save.load()
