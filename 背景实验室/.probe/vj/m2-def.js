window.__M2 = function (cfg) {
  var w = window.document.getElementById('frame').contentWindow;
  w.__camSetFrozen(false, true);
  w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: cfg.yaw, dist: 5.6014 });
  var anchors = cfg.anchors || [[0.1, -0.25], [0.05, -0.3], [0.12, -0.2], [0.0, -0.28], [0.15, -0.32]];
  var f = null, chosen = null, d = 0, i, h, dx, dy, dz;
  for (i = 0; i < anchors.length; i++) {
    h = null; try { h = w.__groundHit(anchors[i][0], anchors[i][1]); } catch (e) {}
    if (!h) continue;
    var g0 = w.__groundY(h.x, h.z); if (g0 == null) continue;
    dx = h.x - 3.4939; dy = h.y - 1.4263; dz = h.z - 0.3179;
    d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 2.2 || d > 5.2) continue;
    f = h; chosen = anchors[i]; break;
  }
  if (!f) return { err: 'no-anchor', yaw: cfg.yaw };
  var gyF = w.__groundY(f.x, f.z);
  var gyT = w.__groundY(cfg.tree.x, cfg.tree.z);
  if (gyT == null) return { err: 'no-gy-tree', yaw: cfg.yaw, fire: [+f.x.toFixed(2), +f.z.toFixed(2)] };
  var stoneH = (cfg.stone.v === 'big-top' ? 1.5 : cfg.stone.v === 'big-main' ? 2.7 : 1.0) * cfg.stone.s;
  var stoneY = gyF - 0.02;
  var list = [
    { kind: 'rock', variant: cfg.stone.v, x: f.x, y: stoneY, z: f.z, rotY: cfg.stone.rotY || 15, scale: cfg.stone.s },
    { kind: 'campfire', variant: 'default', x: f.x, y: stoneY + stoneH - 0.04, z: f.z, rotY: 0, scale: 1 },
    { kind: 'tree', variant: 'big', x: cfg.tree.x, y: gyT + 0.02, z: cfg.tree.z, rotY: cfg.tree.rotY, scale: cfg.tree.s }
  ];
  w.__placeClear();
  w.__placeImport(list);
  w.__camSetFrozen(true, true);
  return { yaw: cfg.yaw, fire: [+f.x.toFixed(2), +f.z.toFixed(2)], fireDist: +d.toFixed(2), gyF: +gyF.toFixed(3), gyT: +gyT.toFixed(3), anchor: chosen, stone: cfg.stone.v + '@' + cfg.stone.s, tree: cfg.tree };
}
