window.__M8 = {
  w: function () { return window.document.getElementById('frame').contentWindow; },
  sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
  fpsGuard: async function () {
    var w = this.w();
    for (var i = 0; i < 10; i++) {
      var f1 = w.__camState.frames;
      await this.sleep(1200);
      var f2 = w.__camState.frames;
      var fps = (f2 - f1) / 1.2;
      if (fps > 25) return { fps: +fps.toFixed(0) };
      await this.sleep(1500);
    }
    return { fps: 0, stalled: true };
  },
  cam: function (yaw) {
    var w = this.w();
    w.__camSetFrozen(false, true);
    w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: yaw, dist: 5.6014 });
    w.__camSetFrozen(true, true);
    return w.__getCam();
  },
  waitAutoLoadThenClear: async function () {
    var w = this.w();
    var seen = [];
    for (var i = 0; i < 14; i++) {
      var st = w.__placeState();
      seen.push(st.count);
      if (st.count > 0 && st.ready) break;
      await this.sleep(10000);
    }
    w.__placeClear();
    await this.sleep(4000);
    var after = w.__placeState();
    return { seenCounts: seen, afterClear: after.count, ready: after.ready };
  },
  fireStone: function (anchor) {
    var w = this.w();
    var f = null;
    try { f = w.__groundHit(anchor[0], anchor[1]); } catch (e) {}
    if (!f) return { err: 'no-hit' };
    var gy = w.__groundY(f.x, f.z);
    if (gy == null) return { err: 'no-gy' };
    var stoneY = gy + 0.08;
    var r1 = w.__placeAdd('rock', f.x, stoneY, f.z, 60, 0.18, 'big-top');
    var r2 = w.__placeAdd('campfire', f.x, stoneY + 0.22, f.z, 0, 1, 'default');
    return { p: [+f.x.toFixed(2), +f.z.toFixed(2)], gy: +gy.toFixed(3), stoneY: +stoneY.toFixed(3), ok1: r1.ok, ok2: r2.ok };
  },
  tree: function (t) {
    var w = this.w();
    var gy = w.__groundY(t.x, t.z);
    if (gy == null) return { err: 'no-gy-tree', at: t };
    var r = w.__placeAdd('tree', t.x, gy + 0.02, t.z, t.rotY, t.s, 'big');
    return { ok: r.ok, leaves: r.item ? r.item.leaves : 0, gy: +gy.toFixed(3) };
  },
  variant: async function (cfg) {
    var w = this.w();
    w.__placeClear();
    await this.sleep(3000);
    this.cam(cfg.yaw || 8);
    var fire = this.fireStone(cfg.anchor || [0.06, -0.35]);
    var tree = this.tree(cfg.tree);
    await this.fpsGuard();
    var st = w.__placeState();
    return { fire: fire, tree: tree, yaw: cfg.yaw || 8, count: st.count, items: st.items.map(function (o) { return o.kind + '@' + (+o.x.toFixed(1)) + ',' + (+o.z.toFixed(1)); }) };
  }
}
