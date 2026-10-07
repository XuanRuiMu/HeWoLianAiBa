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
    // 营火
    var rC = w.__placeAdd('campfire', campHit.x, campHit.y, campHit.z, 0, 1, 'default');
    out.camp = (rC && rC.ok) ? rC.item : ('FAIL:' + (rC && rC.reason));
    // 火圈石：8 颗碎石 scale 1.2（视觉 ≈ 0.35m 石块）绕营火 r=0.5m
    out.stones = [];
    var R = 0.5;
    for (var k = 0; k < 8; k++) {
      var ang = k * Math.PI / 4 + 0.4;
      var sx = campHit.x + Math.cos(ang) * R;
      var sz = campHit.z + Math.sin(ang) * R;
      var sy = w.__groundY(sx, sz);
      if (sy === null) sy = campHit.y;
      var rs = w.__placeAdd('rock', sx, sy + 0.02, sz, 0, 1.2, 'pebble');
      out.stones.push((rs && rs.ok) ? 'ok' : ('FAIL:' + (rs && rs.reason)));
    }
    // 树候选 3 棵：错开位置+不同缩放，一轮看清各自探入量
    var cands = [
      { x: 0.5, z: -7.5, s: 0.4, tag: 'A-s0.4中位' },
      { x: 2.2, z: -7.2, s: 0.55, tag: 'B-s0.55偏右' },
      { x: -1.2, z: -6.5, s: 0.35, tag: 'C-s0.35偏左' }
    ];
    out.trees = [];
    cands.forEach(function (c) {
      var gy = w.__groundY(c.x, c.z);
      if (gy === null) { out.trees.push({ tag: c.tag, err: 'ground-null' }); return; }
      var r = w.__placeAdd('tree', c.x, gy, c.z, 0, c.s, 'big');
      out.trees.push({ tag: c.tag, x: c.x, z: c.z, gy: gy, scale: c.s,
                       ok: r && r.ok, id: r && r.item ? r.item.id : null });
    });
    out.items = w.__placeState().items.map(function (o) {
      return { id: o.id, kind: o.kind, variant: o.variant, x: +o.x.toFixed(2), y: +o.y.toFixed(2), z: +o.z.toFixed(2), scale: o.scale };
    });
    return out;
  }
})()
