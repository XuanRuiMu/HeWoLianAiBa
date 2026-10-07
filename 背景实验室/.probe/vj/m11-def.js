window.__M11 = {
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
  cam: function () {
    var w = this.w();
    w.__camSetFrozen(false, true);
    w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: -31.5, dist: 5.6014 });
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
    return { seenCounts: seen, afterClear: w.__placeState().count };
  },
  fireY: function (w, scale) {
    var gy = w.__groundY(4.1444, -2.1778);
    if (gy == null) return null;
    var stoneY = gy + 0.07;
    return { gy: +gy.toFixed(3), stoneY: +stoneY.toFixed(3), fireY: +(stoneY + 1.5 * scale - 0.05).toFixed(3) };
  },
  variant: async function (cfg) {
    var w = this.w();
    w.__placeClear();
    await this.sleep(3000);
    this.cam();
    var fy = this.fireY(w, 0.17);
    if (!fy) return { err: 'no-gy-fire' };
    var list = [
      { kind: 'rock', variant: 'big-top', x: 4.1444, y: fy.stoneY, z: -2.1778, rotY: 60, scale: 0.17 },
      { kind: 'campfire', variant: 'default', x: 4.1444, y: fy.fireY, z: -2.1778, rotY: 0, scale: 1 }
    ];
    var treeInfo = null;
    if (cfg.tree) {
      var t = cfg.tree;
      var gyT = w.__groundY(t.x, t.z);
      if (gyT == null) treeInfo = { err: 'no-gy-tree' };
      else {
        list.push({ kind: 'tree', variant: 'big', x: t.x, y: +(gyT + 0.02).toFixed(3), z: t.z, rotY: t.rotY, scale: t.s });
        treeInfo = { gyT: +gyT.toFixed(3), rotY: t.rotY, s: t.s };
      }
    }
    w.__placeImport(list);
    await this.fpsGuard();
    var st = w.__placeState();
    return { fy: fy, tree: treeInfo, count: st.count, fps: cfg.fps || null };
  }
}
