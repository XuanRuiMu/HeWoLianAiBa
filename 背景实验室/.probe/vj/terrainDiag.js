(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var scene = w.__experience.engine.scene;
  var out = {};
  out.cam = w.__getCam();
  out.groundHitCenter = w.__groundHit(0, 0);
  out.groundHitCamp = w.__groundHit(-0.208, -0.22);
  out.groundYCamp = w.__groundY(4.14, -2.18);
  // 地形候选 mesh 名单
  var meshes = [];
  scene.traverse(function (o) {
    if (!o.isMesh || !o.geometry) return;
    var n = (o.name || '').toLowerCase();
    if (n.indexOf('island') >= 0 || n.indexOf('basalt') >= 0 ||
        n.indexOf('terrain') >= 0 || n.indexOf('ground') >= 0) {
      meshes.push({ name: o.name, visible: o.visible,
                    parent: o.parent ? o.parent.name : null });
    }
  });
  out.terrainMeshes = meshes.slice(0, 25);
  out.terrainCount = meshes.length;
  // 引擎地形句柄
  try {
    var dt = w.__experience.engine.world ? null : null;
  } catch (e) {}
  try {
    var isl = scene.getObjectByName('islands');
    out.islandsVisible = isl ? isl.visible : null;
    var mi = scene.getObjectByName('main-island');
    out.mainIsland = mi ? { visible: mi.visible, type: mi.type,
                             parentVis: mi.parent ? mi.parent.visible : null } : null;
  } catch (e) { out.errI = String(e).slice(0, 150); }
  return out;
})()
