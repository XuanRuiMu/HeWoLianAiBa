(function () {
  var w = document.getElementById('frame').contentWindow;
  function dump(tag) {
    var found = [];
    var E = w.__experience;
    var scene = E && (E.scene || (E.world && E.world.scene));
    if (!scene) return { tag: tag, err: 'no-scene', hasE: !!E, keys: E ? Object.keys(E).slice(0, 30) : null };
    scene.traverse(function (o) {
      var n = o.name || '';
      if (n.indexOf('pl-') === 0 || (o.userData && (o.userData.placeId != null || o.userData.leaves != null))) {
        found.push({
          name: n, type: o.type, visible: o.visible,
          pos: [+o.position.x.toFixed(2), +o.position.y.toFixed(2), +o.position.z.toFixed(2)],
          scl: [+o.scale.x.toFixed(3), +o.scale.y.toFixed(3), +o.scale.z.toFixed(3)],
          kids: o.children ? o.children.length : 0,
          isIM: o.isInstancedMesh || false, count: o.count || null
        });
      }
    });
    return { tag: tag, n: found.length, nodes: found.slice(0, 24) };
  }
  return dump('after-placeAdd');
})()
