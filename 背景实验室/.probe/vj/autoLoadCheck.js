(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var st = w.__placeState();
  return {
    count: st.count,
    items: st.items.map(function (o) {
      return { kind: o.kind, variant: o.variant, x: +o.x.toFixed(2), y: +o.y.toFixed(2), z: +o.z.toFixed(2), scale: o.scale };
    }),
    frozen: w.__camFrozen(),
    camOk: (function () {
      var c = w.__getCam();
      return Math.abs(c.px - 3.4939) < 0.01 && Math.abs(c.p - (-22.55)) < 0.05;
    })()
  };
})()
