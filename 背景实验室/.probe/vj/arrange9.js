(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return Promise.resolve({ err: 'not-ready' });

  // 机位对齐
  var cam = w.__getCam();
  var isDefault = Math.abs(cam.px - 3.4939) < 0.05 && Math.abs(cam.p - (-22.55)) < 0.1 &&
                  Math.abs(cam.a - (-31.5)) < 0.1;
  if (!isDefault) {
    w.__camSetFrozen(false, true);
    w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: -31.5, dist: 5.6014 });
    w.__camSetFrozen(true, true);
  }
  w.__placeClear();

  return new Promise(function (res) {
    var tries = 0;
    (function pollCamp() {
      var campHit = w.__groundHit(-0.208, -0.22);
      if (!campHit && tries < 50) { tries++; setTimeout(pollCamp, 2000); return; }
      if (!campHit) { res({ err: 'camp-no-hit-after-100s' }); return; }
      res(arrangeBody(campHit));
    })();
  });

  function arrangeBody(campHit) {
    var out = { campHit: campHit };
    // 1) 石头地基：小岩板（几何尺寸可控：0.58×0.12×0.95m），高 12cm 的凸起
    var gyC = w.__groundY(campHit.x, campHit.z);
    if (gyC === null) gyC = campHit.y;
    var rS = w.__placeAdd('rock', campHit.x, gyC, campHit.z, 30, 0.08, 'big-top');
    out.stone = (rS && rS.ok) ? rS.item : ('FAIL:' + (rS && rS.reason));
    // 两颗小碎石（pebble 视觉≈1.3m×s → s0.3≈0.4m）点缀左右
    out.stones = [];
    [[-0.42, 0.05, 0.3, 80], [0.4, -0.08, 0.32, 210]].forEach(function (st) {
      var sx = campHit.x + st[0], sz = campHit.z + st[1];
      var sy = w.__groundY(sx, sz);
      if (sy === null) sy = campHit.y;
      var rs = w.__placeAdd('rock', sx, sy + 0.02, sz, st[2], st[3], 'pebble');
      out.stones.push((rs && rs.ok) ? 'ok' : ('FAIL:' + (rs && rs.reason)));
    });
    // 营火坐岩板上（板高 0.12m）
    var campY = gyC + 0.1;
    // 2) 营火
    var rC = w.__placeAdd('campfire', campHit.x, campY, campHit.z, 0, 1, 'default');
    out.camp = (rC && rC.ok) ? rC.item : ('FAIL:' + (rC && rC.reason));
    // 3) 树：带干大树，岛内，树冠右缘探入画面左上
    var cands = [
      { x: 2.5, z: -5.5, s: 0.6, ry: -30, tag: 'T' }
    ];
    out.trees = [];
    cands.forEach(function (c) {
      var gy = w.__groundY(c.x, c.z);
      if (gy === null) { out.trees.push({ tag: c.tag, err: 'ground-null' }); return; }
      var r = w.__placeAdd('tree', c.x, gy, c.z, c.ry, c.s, 'big');
      out.trees.push({ tag: c.tag, x: c.x, z: c.z, gy: gy, scale: c.s,
                       ok: r && r.ok, id: r && r.item ? r.item.id : null });
    });
    out.items = w.__placeState().items.map(function (o) {
      return { id: o.id, kind: o.kind, variant: o.variant, x: +o.x.toFixed(2), y: +o.y.toFixed(2), z: +o.z.toFixed(2), scale: o.scale };
    });
    return out;
  }
})()
