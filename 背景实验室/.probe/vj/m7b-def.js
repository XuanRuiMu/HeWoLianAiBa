window.__M6.tree = function (cands) {
  var list = Array.isArray(cands) ? cands : [cands];
  var w = this.w();
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    var gy = w.__groundY(t.x, t.z);
    if (gy == null) continue;
    var r = w.__placeAdd('tree', t.x, gy + 0.02, t.z, t.rotY, t.s, 'big');
    return { ok: r.ok, leaves: r.item ? r.item.leaves : 0, used: t, gy: +gy.toFixed(3) };
  }
  return { err: 'all-candidates-null' };
}
window.__M6.variant2 = async function (cfg) {
  var w = this.w();
  this.reset();
  this.cam(cfg.yaw || 8);
  var fire = this.fireStone(cfg.anchor || [0.06, -0.35]);
  var tree = this.tree(cfg.treeCands);
  await this.fpsGuard();
  return { fire: fire, tree: tree, yaw: cfg.yaw || 8 };
}
'patched'
