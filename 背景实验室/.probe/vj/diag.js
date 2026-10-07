(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { ready: false };
  var E = w.__experience, scene = E.engine.scene;
  var out = { frames: w.__camState.frames };
  // 关键对象的可达性
  function has(n) { return !!scene.getObjectByName(n); }
  out.obj = {
    islands: has('islands'), campfire: has('campfire'),
    Campfire_fire: has('Campfire_fire'), Campfire_sparks: has('Campfire_sparks'),
    CampfireLight: has('CampfireLight'), floatingRocks: has('floating-rocks'),
    treeMain: has('tree-main'), tree008: has('tree-008'), tree001: has('tree-001'),
    basaltTopOld: has('basalt-top-old'), basaltMainOld: has('basalt-main-old'),
    basaltFloatingRock: has('basalt-floating-rock')
  };
  // 按前缀统计
  var stat = { Foliage_chunk: 0, treeTrunk: 0, treeGrp: 0, basalt: 0, DistantFoliage: 0, campfireWood: 0 };
  var topKids = [];
  scene.children.forEach(function (o) { topKids.push((o.type || '?') + ':' + (o.name || '(无名)')); });
  scene.traverse(function (o) {
    var n = o.name || '';
    if (n.indexOf('Foliage_chunk') === 0) stat.Foliage_chunk++;
    else if (n.indexOf('tree-trunk') === 0) stat.treeTrunk++;
    else if (n.indexOf('tree-') === 0) stat.treeGrp++;
    else if (n.indexOf('basalt') === 0) stat.basalt++;
    else if (n.indexOf('DistantFoliage') === 0) stat.DistantFoliage++;
    else if (n.indexOf('campfire-wood') === 0) stat.campfireWood++;
  });
  out.stat = stat;
  out.topKids = topKids.slice(0, 80);
  // 组件句柄（引擎侧，与场景树不同）
  try {
    var isl = E.world && E.world.islands;
    out.comp = isl ? {
      hasIslands: true,
      campfire: !!(isl.campfire),
      trees: !!(isl.trees), treesGroup: !!(isl.trees && isl.trees.group),
      foliage: !!(isl.foliage), foliageGroup: !!(isl.foliage && isl.foliage.group)
    } : { hasIslands: false };
  } catch (e) { out.comp = String(e).slice(0, 200); }
  // 营火类组件内部
  try {
    var cf = E.world && E.world.islands && E.world.islands.campfire;
    if (cf) out.campComp = { keys: Object.keys(cf).slice(0, 20),
                             wood: cf.woodMeshes ? cf.woodMeshes.length : null };
  } catch (e) {}
  // islands 组的场景子节点概览
  var islObj = scene.getObjectByName('islands');
  if (islObj) {
    out.islandsKids = islObj.children.map(function (o) { return (o.type || '?') + ':' + (o.name || '(无名)'); }).slice(0, 60);
    out.islandsScale = islObj.scale.x;
  }
  // dayCycle 相位
  out.phase = E.dayCycleManager ? E.dayCycleManager.getPhase() : null;
  return out;
})()
