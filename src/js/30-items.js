/* ============================================================
   30-items.js :: item lookup, equipping, NPC gear
   ============================================================ */

GAME.items = (function () {
  var index = null;

  function idx() {
    if (index) return index;
    index = {};
    var list = (DATA.items || []);
    for (var i = 0; i < list.length; i++) index[list[i].id] = list[i];
    return index;
  }

  function get(id) { return id ? (idx()[id] || null) : null; }

  var WEAPON_CATS = { melee: 1, pistol: 1, smg: 1, rifle: 1, heavy: 1 };
  function isWeapon(it) { return !!(it && WEAPON_CATS[it.cat]); }
  function isArmor(it) { return !!(it && it.cat === 'armor'); }

  function all() { return DATA.items || []; }

  function shopStock(level, cityId) {
    return all().filter(function (it) {
      if (!it.stock) return false;
      if (it.city && it.city !== (cityId || 'newyork')) return false;
      return true;
    }).sort(function (a, b) { return a.price - b.price; });
  }

  /* Best item of a category an account of this level/wallet would own. */
  function bestFor(cats, level, wallet) {
    var best = null;
    var list = all();
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (cats.indexOf(it.cat) < 0) continue;
      if (!it.stock) continue;
      if ((it.lvl || 1) > level) continue;
      if (it.price > wallet) continue;
      var v = (it.atk || 0) + (it.def || 0);
      if (!best || v > (best.atk || 0) + (best.def || 0)) best = it;
    }
    return best;
  }

  /* Give every NPC plausible gear for their level and bankroll. Skilled,
     greedy accounts kit themselves out properly; noobs run around with a
     baseball bat long after they should have upgraded. */
  function equipNPCs() {
    for (var i = 0; i < S.npcs.length; i++) {
      var n = S.npcs[i];
      var budget = (n.money + n.bank) * (0.25 + n.p.skill * 0.7);
      var lvl = Math.round(n.level * (0.6 + n.p.skill * 0.55));
      var w = bestFor(['melee', 'pistol', 'smg', 'rifle', 'heavy'], lvl, budget);
      var a = bestFor(['armor'], lvl, budget * 0.6);
      n.wpn = w ? w.id : null;
      n.arm = a ? a.id : null;
      n.gear = gearPower(n);
    }
  }

  function gearPower(p) {
    var w = get(p.wpn), a = get(p.arm);
    return (w ? w.atk || 0 : 0) + (a ? a.def || 0 : 0);
  }

  /* ---- player inventory ---- */
  function count(id) { return (S.player.inv[id] || 0); }
  function add(id, qty) {
    qty = qty || 1;
    S.player.inv[id] = (S.player.inv[id] || 0) + qty;
    return S.player.inv[id];
  }
  function remove(id, qty) {
    qty = qty || 1;
    var have = S.player.inv[id] || 0;
    if (have < qty) return false;
    if (have === qty) delete S.player.inv[id]; else S.player.inv[id] = have - qty;
    if (S.player.wpn === id && !S.player.inv[id]) S.player.wpn = null;
    if (S.player.arm === id && !S.player.inv[id]) S.player.arm = null;
    return true;
  }

  function equip(id) {
    var it = get(id);
    if (!it || !count(id)) return 'You do not own that.';
    if (isWeapon(it)) { S.player.wpn = id; return null; }
    if (isArmor(it)) { S.player.arm = id; return null; }
    return 'You cannot equip that.';
  }
  function unequip(slot) {
    if (slot === 'wpn') S.player.wpn = null; else S.player.arm = null;
  }

  function useItem(id) {
    var it = get(id), p = S.player;
    if (!it || !count(id)) return { err: 'You do not own that.' };
    if (it.heal) {
      if (p.hospUntil > NOW()) return { err: 'You are already in a hospital bed.' };
      if (p.health >= maxHealth(p)) return { err: 'You are not hurt.' };
      var amt = Math.round(maxHealth(p) * (it.heal / 100));
      p.health = Math.min(maxHealth(p), p.health + amt);
      remove(id, 1);
      return { msg: 'You use the ' + it.name + ' and recover ' + fmt(amt) + ' health.' };
    }
    if (it.effect) {
      var e = it.effect;
      if (e.stat === 'energy') p.energy = Math.min(p.energyMax, p.energy + e.amount);
      else if (e.stat === 'brave') p.nerve = Math.min(p.nerveMax, p.nerve + e.amount);
      else if (e.stat === 'will') p.will = Math.min(p.willMax, p.will + e.amount);
      else if (e.stat === 'attacks') p.attacks = Math.min(p.attacksMax, p.attacks + e.amount);
      remove(id, 1);
      return { msg: 'You use the ' + it.name + '. +' + e.amount + ' ' + e.stat + '.' };
    }
    return { err: 'Nothing happens.' };
  }

  return {
    get: get, all: all, shopStock: shopStock, isWeapon: isWeapon, isArmor: isArmor,
    equipNPCs: equipNPCs, gearPower: gearPower, bestFor: bestFor,
    count: count, add: add, remove: remove, equip: equip, unequip: unequip, use: useItem
  };
})();

/* max health includes property bonuses for the player */
function maxHealth(p) {
  var base = p.healthMax || 100;
  if (p.id === 0 && p.props) {
    for (var i = 0; i < p.props.length; i++) {
      var pr = GAME.props.get(p.props[i]);
      if (pr && pr.hp) base += pr.hp;
    }
  }
  return base;
}
