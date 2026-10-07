window.__M6 = {
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
  reset: function () { this.w().__placeClear(); return 'cleared'; },
  fireStone: function (anchor) {
    var w = this.w();
    var f = null;
    try { f = w.__groundHit(anchor[0], anchor[1]); } catch (e) {}
    if (!f) return { err: 'no-hit' };
    var gy = w.__groundY(f.x, f.z);
    if (gy == null) return { err: 'no-gy' };
    var stoneY = gy + 0.07;
    var r1 = w.__placeAdd('rock', f.x, stoneY, f.z, 60, 0.19, 'big-top');
    var r2 = w.__placeAdd('campfire', f.x, stoneY + 0.235, f.z, 0, 1, 'default');
    return { p: [+f.x.toFixed(2), +f.z.toFixed(2)], gy: +gy.toFixed(3), ok1: r1.ok, ok2: r2.ok };
  },
  tree: function (t) {
    var w = this.w();
    var gy = w.__groundY(t.x, t.z);
    if (gy == null) return { err: 'no-gy-tree' };
    var r = w.__placeAdd('tree', t.x, gy + 0.02, t.z, t.rotY, t.s, 'big');
    return { ok: r.ok, leaves: r.item ? r.item.leaves : 0 };
  },
  probe: async function () {
    var w = this.w();
    this.reset();
    this.cam(8);
    var spots = [[-0.4, -0.28, 0.8], [-0.05, -0.3, 1.2], [0.3, -0.32, 1.6]];
    var out = [];
    for (var i = 0; i < spots.length; i++) {
      var h = null;
      try { h = w.__groundHit(spots[i][0], spots[i][1]); } catch (e) {}
      if (!h || w.__groundY(h.x, h.z) == null) { out.push({ s: spots[i][2], err: 'no-hit' }); continue; }
      var gy = w.__groundY(h.x, h.z);
      w.__placeAdd('rock', h.x, gy + 0.02, h.z, 0, spots[i][2], 'pebble');
      out.push({ s: spots[i][2], p: [+h.x.toFixed(2), +h.z.toFixed(2)] });
    }
    var hf = null;
    try { hf = w.__groundHit(-0.7, -0.34); } catch (e) {}
    if (hf && w.__groundY(hf.x, hf.z) != null) {
      w.__placeAdd('campfire', hf.x, w.__groundY(hf.x, hf.z) + 0.02, hf.z, 0, 1, 'default');
      out.push({ ref: 'fire' });
    }
    await this.fpsGuard();
    return out;
  },
  variant: async function (cfg) {
    var w = this.w();
    this.reset();
    this.cam(cfg.yaw || 8);
    var fire = this.fireStone(cfg.anchor || [0.06, -0.35]);
    var tree = this.tree(cfg.tree);
    await this.fpsGuard();
    return { fire: fire, tree: tree, yaw: cfg.yaw || 8 };
  }
}
