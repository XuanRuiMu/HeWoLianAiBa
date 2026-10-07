(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var out = {};
  // 0) 机位对齐到手绘底图（= 用户确认的默认机位）
  var cam = w.__getCam();
  var isDefault = Math.abs(cam.px - 3.4939) < 0.05 && Math.abs(cam.py - 1.4263) < 0.05 &&
                  Math.abs(cam.pz - 0.3179) < 0.05 && Math.abs(cam.p - (-22.55)) < 0.1 &&
                  Math.abs(cam.a - (-31.5)) < 0.1;
  out.camWas = { px: cam.px, py: cam.py, pz: cam.pz, p: cam.p, a: cam.a, d: cam.d };
  if (!isDefault) {
    w.__camSetFrozen(false, true);
    w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: -31.5, dist: 5.6014 });
    w.__camSetFrozen(true, true);
    out.camReset = true;
  }
  // 1) 清空重来
  w.__placeClear();
  // 2) 营火：手绘位置 = 屏幕 (39.6%, 61%) → NDC (-0.208, -0.22) → 地面射线
  var campHit = w.__groundHit(-0.208, -0.22);
  out.campHit = campHit;
  var rC = campHit ? w.__placeAdd('campfire', campHit.x, campHit.y, campHit.z, 0, 1, 'default') : { ok: false, reason: 'no-hit' };
  out.camp = (rC && rC.ok) ? rC.item : ('FAIL:' + (rC && rC.reason));
  // 3) 树候选 5 棵（岛南缘远端，画面左上方向），全放上去一轮看效果
  var cands = [
    { x: 3.4, z: -10.0, tag: 'A-正前远' },
    { x: 3.4, z: -11.5, tag: 'B-更远' },
    { x: 4.5, z: -9.0,  tag: 'C-偏右' },
    { x: 2.2, z: -10.0, tag: 'D-偏左' },
    { x: 3.4, z: -8.5,  tag: 'E-近一点' }
  ];
  out.trees = [];
  cands.forEach(function (c) {
    var gy = w.__groundY(c.x, c.z);
    if (gy === null) { out.trees.push({ tag: c.tag, err: 'ground-null(岛外)' }); return; }
    var r = w.__placeAdd('tree', c.x, gy, c.z, 0, 1, 'big');
    out.trees.push({ tag: c.tag, x: c.x, z: c.z, gy: gy,
                     ok: r && r.ok, leaves: r && r.item ? r.item.leaves : null });
  });
  out.count = w.__placeState().count;
  return out;
})()
