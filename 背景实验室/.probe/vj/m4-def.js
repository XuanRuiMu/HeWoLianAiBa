window.__M4 = function (cfg) {
  var w = window.document.getElementById('frame').contentWindow;
  w.__placeClear();
  w.__camSetFrozen(false, true);
  w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: cfg.yaw, dist: 5.6014 });
  var a = cfg.anchor || [0.06, -0.35];
  var f = null;
  try { f = w.__groundHit(a[0], a[1]); } catch (e) {}
  if (!f) return { err: 'no-fire-hit', yaw: cfg.yaw };
  var gyF = w.__groundY(f.x, f.z);
  if (gyF == null) return { err: 'no-gy-fire', yaw: cfg.yaw };
  var gyT = w.__groundY(cfg.tree.x, cfg.tree.z);
  if (gyT == null) return { err: 'no-gy-tree', yaw: cfg.yaw };
  var stoneH = cfg.plinth.h;
  var stoneY = gyF + (cfg.plinth.sink || -0.02);
  var list = [
    { kind: 'rock', variant: cfg.plinth.v, x: f.x, y: stoneY, z: f.z, rotY: cfg.plinth.rotY || 0, scale: cfg.plinth.s },
    { kind: 'campfire', variant: 'default', x: f.x, y: stoneY + stoneH - 0.06, z: f.z, rotY: 0, scale: 1 },
    { kind: 'tree', variant: 'big', x: cfg.tree.x, y: gyT + 0.02, z: cfg.tree.z, rotY: cfg.tree.rotY, scale: cfg.tree.s }
  ];
  w.__placeImport(list);
  if (cfg.wuX != null) {
    var inp = document.getElementById('wuX');
    inp.value = String(cfg.wuX);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
  w.__camSetFrozen(true, true);
  return { yaw: cfg.yaw, fire: [+f.x.toFixed(2), +f.z.toFixed(2)], gyF: +gyF.toFixed(3), gyT: +gyT.toFixed(3), plinth: cfg.plinth.v + '@' + cfg.plinth.s, wuX: cfg.wuX || null };
}
window.__M4probe = function () {
  var w = window.document.getElementById('frame').contentWindow;
  w.__placeClear();
  w.__camSetFrozen(false, true);
  w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: 8, dist: 5.6014 });
  var spots = [[-0.35, -0.3, 0.8], [0.0, -0.3, 1.2], [0.35, -0.3, 1.6]];
  var list = [], out = [];
  for (var i = 0; i < spots.length; i++) {
    var h = null;
    try { h = w.__groundHit(spots[i][0], spots[i][1]); } catch (e) {}
    if (!h) { out.push({ ndc: spots[i], err: 'no-hit' }); continue; }
    var gy = w.__groundY(h.x, h.z);
    if (gy == null) { out.push({ ndc: spots[i], err: 'no-gy' }); continue; }
    list.push({ kind: 'rock', variant: 'pebble', x: h.x, y: gy + 0.02, z: h.z, rotY: 0, scale: spots[i][2] });
    out.push({ ndc: spots[i], p: [+h.x.toFixed(2), +h.z.toFixed(2)], gy: +gy.toFixed(3), s: spots[i][2] });
  }
  var hf = null;
  try { hf = w.__groundHit(-0.62, -0.32); } catch (e) {}
  if (hf && w.__groundY(hf.x, hf.z) != null) {
    list.push({ kind: 'campfire', variant: 'default', x: hf.x, y: w.__groundY(hf.x, hf.z) + 0.02, z: hf.z, rotY: 0, scale: 1 });
    out.push({ ref: 'fire', p: [+hf.x.toFixed(2), +hf.z.toFixed(2)] });
  }
  w.__placeImport(list);
  w.__camSetFrozen(true, true);
  return out;
}
