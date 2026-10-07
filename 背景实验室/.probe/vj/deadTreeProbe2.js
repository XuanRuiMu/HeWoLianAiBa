(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var scene = w.__experience.engine.scene;
  var V3 = w.__experience.engine.camera.instance.position.constructor;
  var p = new V3();
  var out = [];
  scene.traverse(function (o) {
    if (!o.isMesh || !o.visible) return;
    o.getWorldPosition(p);
    // 树根特写截图中悬空枯树所在的空域（岛东北上空）
    if (!(p.x > -2 && p.x < 16 && p.y > 2.5 && p.z < -4 && p.z > -22)) return;
    try { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); } catch (e) {}
    var bb = o.geometry.boundingBox;
    out.push({ name: o.name || '(无名)',
               parent: o.parent ? (o.parent.name || '(无名组)') : null,
               pos: [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)],
               geoSize: bb ? [(bb.max.x - bb.min.x).toFixed(1), (bb.max.y - bb.min.y).toFixed(1), (bb.max.z - bb.min.z).toFixed(1)] : null });
  });
  return { count: out.length, list: out.slice(0, 40) };
})()
