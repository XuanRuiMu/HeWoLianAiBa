(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var st = w.__placeState();
  var c = w.__getCam();
  return {
    count: st.count,
    items: st.items.map(function (o) {
      return { kind: o.kind, variant: o.variant, x: +o.x.toFixed(2), y: +o.y.toFixed(2), z: +o.z.toFixed(2), rotY: o.rotY, scale: o.scale, leaves: o.leaves || 0 };
    }),
    frozen: w.__camFrozen(),
    cam: { px: +c.px.toFixed(4), py: +c.py.toFixed(4), pz: +c.pz.toFixed(4), p: c.p, a: c.a, d: c.d },
    camOk: Math.abs(c.px - 3.4939) < 0.01 && Math.abs(c.p - (-22.55)) < 0.05 && Math.abs(c.a - (-31.5)) < 0.05
  };
})()
