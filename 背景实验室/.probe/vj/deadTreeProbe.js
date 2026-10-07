(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var scene = w.__experience.engine.scene;
  var V3 = w.__experience.engine.camera.instance.position.constructor;
  var p = new V3();
  var out = [];
  scene.traverse(function (o) {
    if (!o.isMesh || !o.visible) return;
    var n = o.name || '';
    if (n.indexOf('pl-') === 0) return;                 // 放置物
    var ln = n.toLowerCase();
    if (ln.indexOf('tree') >= 0 || n.indexOf('Foliage') >= 0 || ln.indexOf('grass') >= 0 ||
        ln.indexOf('island') >= 0 || ln.indexOf('basalt') >= 0 || ln.indexOf('terrain') >= 0 ||
        ln.indexOf('ground') >= 0 || ln.indexOf('water') >= 0 || ln.indexOf('fall') >= 0 ||
        ln.indexOf('rock') >= 0) return;
    o.getWorldPosition(p);
    if (p.y < 1.5) return;                              // 只看悬空的高处物体
    try { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); } catch (e) {}
    var h = o.geometry.boundingBox ? +(o.geometry.boundingBox.max.y - o.geometry.boundingBox.min.y).toFixed(2) : -1;
    out.push({ name: n, pos: [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)],
               parent: o.parent ? (o.parent.name || '(无名组)') : null, geoH: h });
  });
  return { count: out.length, list: out.slice(0, 30) };
})()
