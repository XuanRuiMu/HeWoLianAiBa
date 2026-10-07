(function () {
  var w = document.getElementById('frame').contentWindow;
  var CAM = { px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: -31.5, dist: 5.6014 };
  var STONE = { variant: 'big-top', scale: 0.22, rotY: 15 };
  var TREE = { x: 0.2, z: -6.5, rotY: 40, scale: 0.55 };
  w.__camSetFrozen(false, true);
  w.__setCam(CAM);
  var f = null, tries = [[0.15, -0.1], [0.2, -0.08], [0.1, -0.15]];
  for (var i = 0; i < tries.length; i++) { f = w.__groundHit(tries[i][0], tries[i][1]); if (f) break; }
  if (!f) return { err: 'no-fire-hit' };
  var gyF = w.__groundY(f.x, f.z); if (gyF == null) return { err: 'no-gy-fire' };
  var gyT = w.__groundY(TREE.x, TREE.z); if (gyT == null) return { err: 'no-gy-tree' };
  var stoneH = (STONE.variant === 'big-top' ? 1.5 : 2.7) * STONE.scale;
  var stoneY = gyF - 0.02;
  var list = [
    { kind: 'rock', variant: STONE.variant, x: f.x, y: stoneY, z: f.z, rotY: STONE.rotY, scale: STONE.scale },
    { kind: 'campfire', variant: 'default', x: f.x, y: stoneY + stoneH - 0.03, z: f.z, rotY: 0, scale: 1 },
    { kind: 'tree', variant: 'big', x: TREE.x, y: gyT + 0.02, z: TREE.z, rotY: TREE.rotY, scale: TREE.scale }
  ];
  w.__placeClear();
  w.__placeImport(list);
  w.__camSetFrozen(true, true);
  return { tag: 'A yaw-31.5 big-top0.22 T1', fire: [+f.x.toFixed(2), +f.z.toFixed(2)], gyF: gyF, gyT: gyT };
})()
