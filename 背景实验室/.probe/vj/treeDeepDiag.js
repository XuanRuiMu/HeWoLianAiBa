(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var scene = w.__experience.engine.scene;
  w.__placeClear();
  var gy = w.__groundY(3, -6);
  var r = w.__placeAdd('tree', 3, gy, -6, 0, 1, 'big');
  if (!r || !r.ok) return { err: 'place-failed: ' + (r && r.reason) };
  var id = r.item.id;
  var out = { id: id, leaves: r.item.leaves };
  scene.updateMatrixWorld(true);
  // 直接解析 matrixWorld.elements（列主序），不依赖 __THREE 缺失的类
  function worldOf(o) {
    var e = o.matrixWorld.elements;
    return { pos: [+e[12].toFixed(3), +e[13].toFixed(3), +e[14].toFixed(3)],
             scale: [+Math.hypot(e[0], e[1], e[2]).toFixed(3),
                     +Math.hypot(e[4], e[5], e[6]).toFixed(3),
                     +Math.hypot(e[8], e[9], e[10]).toFixed(3)] };
  }
  function localOf(o) {
    var e = o.matrix.elements;
    return { pos: [+e[12].toFixed(3), +e[13].toFixed(3), +e[14].toFixed(3)],
             scale: [+Math.hypot(e[0], e[1], e[2]).toFixed(3),
                     +Math.hypot(e[4], e[5], e[6]).toFixed(3),
                     +Math.hypot(e[8], e[9], e[10]).toFixed(3)] };
  }
  function bboxOf(g) {
    g.computeBoundingBox();
    var b = g.boundingBox;
    return [[+b.min.x.toFixed(2), +b.min.y.toFixed(2), +b.min.z.toFixed(2)],
            [+b.max.x.toFixed(2), +b.max.y.toFixed(2), +b.max.z.toFixed(2)]];
  }
  // 1) 克隆树干组
  var grp = scene.getObjectByName('pl-treegrp-' + id);
  if (grp) {
    out.cloneGrp = { world: worldOf(grp), local: localOf(grp),
                     matrixAutoUpdate: grp.matrixAutoUpdate,
                     kids: grp.children.map(function (o) { return o.name; }).slice(0, 12) };
    var trunk = null;
    grp.traverse(function (o) { if (!trunk && o.isMesh) trunk = o; });
    if (trunk) out.cloneTrunk = { name: trunk.name, world: worldOf(trunk),
                                  geoBBox: bboxOf(trunk.geometry) };
  } else out.cloneGrp = 'MISSING';
  // 2) 原 tree-main 组与其第一个 mesh
  var src = scene.getObjectByName('tree-main');
  if (src) {
    out.srcGrp = { world: worldOf(src), kids: src.children.length };
    var st = null; src.traverse(function (o) { if (!st && o.isMesh) st = o; });
    if (st) out.srcTrunk = { name: st.name, world: worldOf(st), geoBBox: bboxOf(st.geometry) };
  } else out.srcGrp = 'MISSING';
  // 3) inner 容器世界缩放
  var inner = scene.getObjectByName('pl-inner-' + id);
  out.inner = inner ? { world: worldOf(inner), localScale: localOf(inner).scale } : 'MISSING';
  // 4) 克隆树叶 InstancedMesh
  var leaf = scene.getObjectByName('pl-leaves-' + id);
  if (leaf) {
    var arr = leaf.instanceMatrix.array;
    out.leaf = { count: leaf.count, visible: leaf.visible, frustumCulled: leaf.frustumCulled,
                 parent: leaf.parent ? leaf.parent.name : null,
                 matType: leaf.material ? leaf.material.type : null,
                 inst0: Array.prototype.slice.call(arr, 0, 16).map(function (e) { return +e.toFixed(3); }),
                 inst1: Array.prototype.slice.call(arr, 16, 32).map(function (e) { return +e.toFixed(3); }),
                 geoBBox: bboxOf(leaf.geometry) };
  } else out.leaf = 'MISSING';
  // 5) 原生 chunk 参照
  var c0 = null;
  scene.traverse(function (o) { if (!c0 && o.isInstancedMesh && o.name.indexOf('Foliage_chunk') === 0) c0 = o; });
  if (c0) {
    var a0 = c0.instanceMatrix.array;
    out.refChunk = { name: c0.name, count: c0.count, visible: c0.visible,
                     inst0: Array.prototype.slice.call(a0, 0, 16).map(function (e) { return +e.toFixed(3); }),
                     geoBBox: bboxOf(c0.geometry) };
  }
  // 6) 树叶着色器关键源码
  if (leaf && leaf.material && leaf.material.vertexShader) {
    var vs = leaf.material.vertexShader;
    out.leafVS = {
      usesInstanceMatrix: vs.indexOf('instanceMatrix') >= 0,
      usesModelMatrix: vs.indexOf('modelMatrix') >= 0,
      finalScaleLine: (vs.match(/.*finalScale.*/g) || []).slice(0, 4),
      originalPosLine: (vs.match(/.*originalPos.*/g) || []).slice(0, 4)
    };
  }
  return out;
})()
