(function () {
  var w = document.getElementById('frame').contentWindow;
  var out = { cam: null, hits: {}, gys: {} };
  var ndcs = [[0.15, -0.1], [0.3, -0.2], [0.5, -0.35], [0.7, -0.6], [0.85, -0.9], [-0.2, -0.3], [-0.4, -0.5], [0, -0.6]];
  for (var i = 0; i < ndcs.length; i++) {
    var h = null;
    try { h = w.__groundHit(ndcs[i][0], ndcs[i][1]); } catch (e) { h = 'err'; }
    out.hits[ndcs[i][0] + ',' + ndcs[i][1]] = h ? { x: +h.x.toFixed(2), y: +h.y.toFixed(2), z: +h.z.toFixed(2) } : null;
  }
  var pts = [[0.2, -6.5], [-0.6, -5.8], [1.2, -6.2], [-0.5, -7.0], [0.5, -7.2], [-1.5, -4.0], [-2.0, -3.0], [2.0, -7.0]];
  for (var j = 0; j < pts.length; j++) {
    var g = null;
    try { g = w.__groundY(pts[j][0], pts[j][1]); } catch (e) { g = 'err'; }
    out.gys[pts[j][0] + ',' + pts[j][1]] = g;
  }
  out.cam = w.__getCam();
  return out;
})()
