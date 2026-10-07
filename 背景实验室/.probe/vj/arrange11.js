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
    // 石头地基：小岩板凸起（0.88×0.18×1.43m）
    var gyC = w.__groundY(campHit.x, campHit.z);
    if (gyC === null) gyC = campHit.y;
    var rS = w.__placeAdd('rock', campHit.x, gyC, campHit.z, 30, 0.12, 'big-top');
    out.stone = (rS && rS.ok) ? rS.item : ('FAIL:' + (rS && rS.reason));
    // 营火坐岩板
    var rC = w.__placeAdd('campfire', campHit.x, gyC + 0.15, campHit.z, 0, 1, 'default');
    out.camp = (rC && rC.ok) ? rC.item : ('FAIL:' + (rC && rC.reason));
    // 树：单棵带干大树，根藏岛内草丛，冠右缘探入画面左上角（nx≈-1~-0.73）
    var gy = w.__groundY(1.2, -6.2);
    if (gy === null) { out.tree = 'ground-null'; return out; }
    var r = w.__placeAdd('tree', 1.2, gy, -6.2, 40, 0.5, 'big');
    out.tree = (r && r.ok) ? r.item : ('FAIL:' + (r && r.reason));
    out.items = w.__placeState().items.map(function (o) {
      return { id: o.id, kind: o.kind, variant: o.variant, x: +o.x.toFixed(2), y: +o.y.toFixed(2), z: +o.z.toFixed(2), scale: o.scale };
    });
    return out;
  }
})()
