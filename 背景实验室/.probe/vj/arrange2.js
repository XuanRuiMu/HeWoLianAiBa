(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var out = {};
  // 0) 机位对齐默认（手绘底图机位）
  var cam = w.__getCam();
  var isDefault = Math.abs(cam.px - 3.4939) < 0.05 && Math.abs(cam.p - (-22.55)) < 0.1 &&
                  Math.abs(cam.a - (-31.5)) < 0.1;
  if (!isDefault) {
    w.__camSetFrozen(false, true);
    w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: -31.5, dist: 5.6014 });
    w.__camSetFrozen(true, true);
    out.camReset = true;
  }
  w.__placeClear();
  // 1) 营火：手绘位置 = 屏幕 (39.6%, 61%) → NDC (-0.208, -0.22)
  var campHit = w.__groundHit(-0.208, -0.22);
  out.campHit = campHit;
  if (!campHit) return { err: 'camp-no-hit' };
  var rC = w.__placeAdd('campfire', campHit.x, campHit.y, campHit.z, 0, 1, 'default');
  out.camp = (rC && rC.ok) ? rC.item : ('FAIL:' + (rC && rC.reason));
  // 2) 营火垫石：同落点一颗放大碎石（视觉约 1.1m 与柴堆同宽），营火略抬坐石上
  var rS = w.__placeAdd('rock', campHit.x, campHit.y - 0.02, campHit.z, 0, 22, 'pebble');
  out.stone = (rS && rS.ok) ? rS.item : ('FAIL:' + (rS && rS.reason));
  // 3) 树候选 3 棵（画面左上探入位）
  var cands = [
    { x: 0.5, z: -7.5, s: 0.8, tag: 'T1-主选' },
    { x: 1.5, z: -8.0, s: 0.8, tag: 'T2-偏右' },
    { x: -0.5, z: -7.0, s: 0.8, tag: 'T3-偏左近' }
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
})()
