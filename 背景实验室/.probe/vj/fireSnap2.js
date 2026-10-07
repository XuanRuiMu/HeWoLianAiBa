(function () {
  var w = document.getElementById('frame').contentWindow;
  var fire = null, orig = null;
  w.__experience.engine.scene.traverse(function (o) {
    if (o.name && o.name.indexOf('pl-fire-') === 0) fire = o;
    if (o.name === 'Campfire_fire') orig = o;
  });
  function snap(m) {
    var u = (m && m.material && m.material.uniforms) || {}, s = {};
    Object.keys(u).forEach(function (k) {
      var v = u[k].value;
      s[k] = (v && v.x !== undefined) ? [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)]
           : (typeof v === 'number') ? +v.toFixed(4) : String(v).slice(0, 24);
    });
    return s;
  }
  return { fireSnap2: fire ? snap(fire) : null, origSnap2: orig ? snap(orig) : null,
           fireVisible: fire ? fire.visible : null };
})()
