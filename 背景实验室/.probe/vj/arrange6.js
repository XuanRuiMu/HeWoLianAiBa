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
    // 1) 石台：一块玄武岩板（巨石缩小 scale 0.15 → 1.1×0.23×1.8m）垫在营火正下方
    var gyC = w.__groundY(campHit.x, campHit.z);
    if (gyC === null) gyC = campHit.y;
    var rS = w.__placeAdd('rock', campHit.x, gyC, campHit.z, 40, 0.15, 'big-top');
    out.stone = (rS && rS.ok) ? rS.item : ('FAIL:' + (rS && rS.reason));
    // 石台顶面高度 ≈ 石高 1.5×0.15=0.225 → 营火坐在台面上（略压入 2cm 防悬浮）
    var campY = gyC + 0.205;
    // 2) 营火坐在石台上
    var rC = w.__placeAdd('campfire', campHit.x, campY, campHit.z, 0, 1, 'default');
    out.camp = (rC && rC.ok) ? rC.item : ('FAIL:' + (rC && rC.reason));
    // 3) 树：只放一棵绿色小树 t008（手绘的绿色叶簇），远处只露一团在画面左上
    var cands = [
      { x: 2.7, z: -7.6, s: 1.0, tag: 'T1' },
      { x: 2.2, z: -7.2, s: 1.0, tag: 'T2' }
    ];
    out.trees = [];
    var placed = 0;
    for (var i = 0; i < cands.length && placed < 1; i++) {
      var c = cands[i];
      var gy = w.__groundY(c.x, c.z);
      if (gy === null) { out.trees.push({ tag: c.tag, err: 'ground-null' }); continue; }
      var r = w.__placeAdd('tree', c.x, gy, c.z, 25, c.s, 't008');
      out.trees.push({ tag: c.tag, x: c.x, z: c.z, gy: gy, scale: c.s,
                       ok: r && r.ok, id: r && r.item ? r.item.id : null });
      if (r && r.ok) placed++;
    }
    out.items = w.__placeState().items.map(function (o) {
      return { id: o.id, kind: o.kind, variant: o.variant, x: +o.x.toFixed(2), y: +o.y.toFixed(2), z: +o.z.toFixed(2), scale: o.scale };
    });
    return out;
  }
})()
