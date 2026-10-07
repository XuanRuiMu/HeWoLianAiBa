(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var scene = w.__experience.engine.scene;
  var rend = w.__experience.engine.renderer.instance;
  var out = {};
  // 有树：平视树冠
  w.__placeClear();
  var gy = w.__groundY(3, -6);
  var r = w.__placeAdd('tree', 3, gy, -6, 0, 1, 'big');
  out.place = r && r.ok ? r.item.leaves : String(r && r.reason);
  w.__camSetFrozen(false, true);
  // 树冠中心 ≈ (3.5, 5.5, -3)；从东南方 14m 外平视
  w.__setCam({ px: 12, y: 5, pz: 8, yaw: 37.6, pitch: 2, dist: 14 });
  out.cam = w.__getCam();
  out.infoWithTree = { calls: rend.info.render.calls, triangles: rend.info.render.triangles };
  return out;
})()
