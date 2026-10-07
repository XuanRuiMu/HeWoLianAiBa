(function () {
  var w = document.getElementById('frame').contentWindow;
  var rend = w.__experience.engine.renderer.instance;
  // 清掉树后再采一次 draw call，差值 = 树的真实渲染消耗
  w.__placeClear();
  return { infoAfterClear: { calls: rend.info.render.calls, triangles: rend.info.render.triangles } };
})()
