(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { err: 'not-ready' };
  var E = w.__experience, scene = E.engine.scene;
  var out = {};
  // 0) 手动复刻 findProto 的全部判定条件（findProto 在闭包内不可直调，从场景侧逐条件核）
  var isl = scene.getObjectByName('islands');
  var camp = scene.getObjectByName('campfire');
  var n0 = 0;
  if (camp) camp.traverse(function (o) { if (o.isMesh) n0++; });
  var chunks = [];
  scene.traverse(function (o) {
    if (o.isInstancedMesh && o.name && o.name.indexOf('Foliage_chunk') === 0) chunks.push(o);
  });
  var chunksNameOnly = 0;
  scene.traverse(function (o) {
    if (o.name && o.name.indexOf('Foliage_chunk') === 0) chunksNameOnly++;
  });
  out.protoDiag = {
    islands: !!isl, camp: !!camp, campMeshCount: n0,
    chunksInstanced: chunks.length, chunksNameOnly: chunksNameOnly,
    treeMain: !!scene.getObjectByName('tree-main'),
    tree008: !!scene.getObjectByName('tree-008'),
    basaltTopOld: !!scene.getObjectByName('basalt-top-old'),
    basaltMainOld: !!scene.getObjectByName('basalt-main-old'),
    placeStateReady: w.__placeState ? w.__placeState().ready : null
  };
  var protoOk = isl && camp && n0 > 0 && chunks.length > 0;
  out.protoOk = protoOk;
  if (!protoOk) return out;
  // 1) 默认机位是否精确落地（applyDefaultCam 竞态验证）
  var cam = w.__getCam();
  out.cam = cam;
  out.camOk = Math.abs(cam.px - 3.4939) < 0.01 && Math.abs(cam.py - 1.4263) < 0.01 &&
              Math.abs(cam.pz - 0.3179) < 0.01 && Math.abs(cam.p - (-22.55)) < 0.05 &&
              Math.abs(cam.a - (-31.5)) < 0.05;
  out.frozen = w.__camFrozen();
  try { out.camReport = w.__verifyCamReport ? w.__verifyCamReport() : null; } catch (e) { out.camReport = String(e).slice(0, 200); }
  // 2) 清空后按地面高度放四件：大树 / 营火 / 巨石 / 碎石
  w.__placeClear();
  var gyT = w.__groundY(3, -6), gyC = w.__groundY(0, -8), gyR = w.__groundY(-3, -6), gyP = w.__groundY(-4.4, -7.2);
  out.ground = { tree: gyT, camp: gyC, rock: gyR, pebble: gyP };
  var r1 = w.__placeAdd('tree', 3, gyT, -6, 0, 1, 'big');
  var r2 = w.__placeAdd('campfire', 0, gyC, -8, 0, 1, 'default');
  var r3 = w.__placeAdd('rock', -3, gyR, -6, 0, 1, 'big-top');
  var r4 = w.__placeAdd('rock', -4.4, gyP, -7.2, 0, 8, 'pebble');
  function pick(r) { return (r && r.ok) ? r.item : ('FAIL:' + ((r && r.reason) || '?')); }
  out.tree = pick(r1); out.camp = pick(r2); out.rock = pick(r3); out.pebble = pick(r4);
  function idOf(r) { return (r && r.ok) ? r.item.id : null; }
  out.boxTree = idOf(r1) !== null ? w.__placeBox(idOf(r1)) : null;
  out.boxCamp = idOf(r2) !== null ? w.__placeBox(idOf(r2)) : null;
  out.boxRock = idOf(r3) !== null ? w.__placeBox(idOf(r3)) : null;
  out.boxPebble = idOf(r4) !== null ? w.__placeBox(idOf(r4)) : null;
  // 3) 火焰：克隆件与原件是否共享材质、uniform 快照（稍后再采一次对比动画）
  var fire = null, orig = null;
  scene.traverse(function (o) {
    if (o.name === 'pl-fire-' + idOf(r2)) fire = o;
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
  out.fireFound = !!fire;
  out.fireSameMat = !!(fire && orig && fire.material === orig.material);
  out.fireSnap1 = fire ? snap(fire) : null;
  out.fireVis = fire ? { visible: fire.visible, inScene: !!fire.parent } : null;
  // 4) 火/火星/光源的世界落位（应与营火锚点同点附近）
  function posOf(name) {
    var o = null;
    scene.traverse(function (q) { if (q.name === name) o = q; });
    if (!o) return null;
    var p = new (o.position.constructor)();
    o.getWorldPosition(p);
    return [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)];
  }
  out.wPos = {
    fire: posOf('pl-fire-' + idOf(r2)),
    sparks: posOf('pl-sparks-' + idOf(r2)),
    light: posOf('pl-light-' + idOf(r2)),
    woodClone: posOf('pl-wood-' + idOf(r2)),
    campAnchor: posOf('campfire')
  };
  // 5) 音频克隆件
  var au = null;
  scene.traverse(function (o) { if (o.name === 'pl-audio-' + idOf(r2)) au = o; });
  out.audio = au ? { type: au.type, playing: !!au.isPlaying,
                     parentVisible: au.parent ? au.parent.visible : null } : null;
  // 6) 帧率与昼夜相位
  out.phase = E.dayCycleManager ? E.dayCycleManager.getPhase() : null;
  out.frames = w.__camState.frames;
  return out;
})()
