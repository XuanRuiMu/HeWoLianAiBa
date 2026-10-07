(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var cam = w.__getCam();
  var st = w.__placeState();
  return {
    camera: {
      pointerLocked: false,
      frozen: w.__camFrozen(),
      height: cam.y, distance: cam.d,
      pitchDeg: cam.p, azimuthDeg: cam.a,
      position: [cam.px, cam.py, cam.pz],
      target: [cam.tx, cam.ty, cam.tz]
    },
    wuhaoyang: {
      visible: true, src: '/wu-2d.png',
      screen: { xPct: 24.5, yPct: 71 },
      widthPct: 24, opacity: 1,
      aspect: 1.419871795
    },
    treesVisible: false,
    props: { campfire: false, rocks: false },
    placeKind: 'campfire',
    placements: st.items.map(function (o) {
      return { kind: o.kind, variant: o.variant, x: o.x, y: o.y, z: o.z,
               rotY: o.rotY, scale: o.scale, leaves: o.leaves };
    })
  };
})()
