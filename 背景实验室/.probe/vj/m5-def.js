window.__M5 = {
  w: function () { return window.document.getElementById('frame').contentWindow; },
  cam: function (yaw) {
    var w = this.w();
    w.__camSetFrozen(false, true);
    w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: yaw, dist: 5.6014 });
    w.__camSetFrozen(true, true);
    return w.__getCam();
  },
  clear: function () { this.w().__placeClear(); return 'cleared'; },
  tree: function (t) {
    var w = this.w();
    var gy = w.__groundY(t.x, t.z);
    if (gy == null) return { err: 'no-gy-tree' };
    var r = w.__placeAdd('tree', t.x, gy + 0.02, t.z, t.rotY, t.s, 'big');
    return { ok: r.ok, leaves: r.item ? r.item.leaves : 0, err: r.reason || null };
  },
  fireNative: function (anchors) {
    var w = this.w();
    var rep = [];
    for (var i = 0; i < anchors.length; i++) {
      var h = null;
      try { h = w.__groundHit(anchors[i][0], anchors[i][1]); } catch (e) {}
      if (!h) { rep.push({ a: anchors[i], err: 'no-hit' }); continue; }
      var gy = w.__groundY(h.x, h.z);
      if (gy == null) { rep.push({ a: anchors[i], err: 'no-gy' }); continue; }
      var dx = h.x - 3.4939, dz = h.z - 0.3179;
      var d = Math.sqrt(dx * dx + dz * dz);
      var delta = +(h.y - gy).toFixed(3);
      rep.push({ a: anchors[i], p: [+h.x.toFixed(2), +h.z.toFixed(2)], hitY: +h.y.toFixed(3), gy: +gy.toFixed(3), delta: delta, dist: +d.toFixed(2) });
      if (delta > 0.25 && d > 2.6 && d < 5.5) {
        var r = w.__placeAdd('campfire', h.x, h.y + 0.02, h.z, 0, 1, 'default');
        return { placed: 'native-rock', at: rep[rep.length - 1], ok: r.ok, err: r.reason || null, all: rep };
      }
    }
    return { placed: null, all: rep };
  },
  firePlinth: function (anchor, v, s, raise) {
    var w = this.w();
    var f = null;
    try { f = w.__groundHit(anchor[0], anchor[1]); } catch (e) {}
    if (!f) return { err: 'no-hit' };
    var gy = w.__groundY(f.x, f.z);
    if (gy == null) return { err: 'no-gy' };
    var stoneY = gy + (raise != null ? raise : 0.05);
    var H = (v === 'big-top' ? 1.5 : 2.7) * s;
    var r1 = w.__placeAdd('rock', f.x, stoneY, f.z, 15, s, v);
    var r2 = w.__placeAdd('campfire', f.x, stoneY + H - 0.05, f.z, 0, 1, 'default');
    return { plinth: v + '@' + s, stoneY: +stoneY.toFixed(3), fireY: +(stoneY + H - 0.05).toFixed(3), p: [+f.x.toFixed(2), +f.z.toFixed(2)], ok1: r1.ok, ok2: r2.ok, e1: r1.reason || null, e2: r2.reason || null };
  },
  state: function () { return this.w().__placeState(); }
}
