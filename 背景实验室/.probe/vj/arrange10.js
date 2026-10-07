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
    // 1) 石头地基：小岩板（0.88×0.18×1.43m，高 18cm 的凸起）——big-top 几何可控
    var gyC = w.__groundY(campHit.x, campHit.z);
    if (gyC === null) gyC = campHit.y;
    var rS = w.__placeAdd('rock', campHit.x, gyC, campHit.z, 30, 0.12, 'big-top');
    out.stone = (rS && rS.ok) ? rS.item : ('FAIL:' + (rS && rS.reason));
    // 营火坐岩板上（板高 0.18m）
    var campY = gyC + 0.15;
    // 2) 营火
    var rC = w.__placeAdd('campfire', campHit.x, campY, campHit.z, 0, 1, 'default');
    out.camp = (rC && rC.ok) ? rC.item : ('FAIL:' + (rC && rC.reason));
    // 3) 树：两棵候选错位摆放，一轮对比挑优
    var cands = [
      { x: 2.5, z: -5.5, s: 0.6, ry: -30, tag: 'T1' },
      { x: 1.2, z: -6.2, s: 0.5, ry: 40, tag: 'T2' }
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
