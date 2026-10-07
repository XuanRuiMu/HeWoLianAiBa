(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var scene = w.__experience.engine.scene;
  var out = {};
  // 1) 默认机位
  var cam = w.__getCam();
  out.camOk = Math.abs(cam.px - 3.4939) < 0.01 && Math.abs(cam.py - 1.4263) < 0.01 &&
              Math.abs(cam.pz - 0.3179) < 0.01 && Math.abs(cam.p - (-22.55)) < 0.05 &&
              Math.abs(cam.a - (-31.5)) < 0.05;
  out.frozen = w.__camFrozen();
  // 2) 放四件（碎石用岛内坐标，不再掉 -353）
  w.__placeClear();
  var gyT = w.__groundY(3, -6), gyC = w.__groundY(0, -8), gyR = w.__groundY(-3, -6), gyP = w.__groundY(-4.6, -4.2);
  out.ground = { tree: gyT, camp: gyC, rock: gyR, pebble: gyP };
  out.pebbleGroundFixed = gyP !== null && gyP > -10;
  var r1 = w.__placeAdd('tree', 3, gyT, -6, 0, 1, 'big');
  var r2 = w.__placeAdd('campfire', 0, gyC, -8, 0, 1, 'default');
  var r3 = w.__placeAdd('rock', -3, gyR, -6, 0, 1, 'big-top');
  var r4 = gyP !== null ? w.__placeAdd('rock', -4.6, gyP, -4.2, 0, 8, 'pebble') : { ok: false, reason: 'gyP null' };
  function pk(r) { return (r && r.ok) ? r.item : 'FAIL:' + ((r && r.reason) || '?'); }
  out.tree = pk(r1); out.camp = pk(r2); out.rock = pk(r3); out.pebble = pk(r4);
  // 3) 树的世界底面（用 __placeBox，InstancedMesh 已聚合）
  function idOf(r) { return (r && r.ok) ? r.item.id : null; }
  out.boxTree = idOf(r1) ? w.__placeBox(idOf(r1)) : null;
  // 4) 快照往返
  var items = w.__placeState().items.map(function (o) {
    return { kind: o.kind, variant: o.variant, x: o.x, y: o.y, z: o.z, rotY: o.rotY, scale: o.scale };
  });
  var imp = w.__placeImport(items);
  out.roundtrip = { exported: items.length, reimported: imp.state.count, bad: imp.bad };
  out.roundtripOk = imp.state.count === items.length && imp.bad === 0;
  // 5) 树木开关往返 + 枯树覆盖
  var treeObj = function () {
    var vis = 0, total = 0;
    scene.traverse(function (o) {
      if (o.name && (o.name.indexOf('tree-') === 0 || o.name.indexOf('Foliage_chunk') === 0 ||
                     o.name.indexOf('DistantFoliage') === 0 || o.name.indexOf('foliage-occlusion') === 0)) {
        total++; if (o.visible) vis++;
      }
    });
    return { total: total, visible: vis };
  };
  var before = treeObj();
  w.__setTrees(true);
  var shown = treeObj();
  w.__setTrees(false);
  var hidden = treeObj();
  out.treeToggle = { before: before, whenShown: shown, whenHidden: hidden,
                     deadTreesNowRemoved: hidden.visible === 0 };
  // 6) 恢复放置物（开关测试清不了 placements，但 import 会 clear——重新导入一次）
  var imp2 = w.__placeImport(items);
  out.finalCount = imp2.state.count;
  out.frames = w.__camState.frames;
  return out;
})()
