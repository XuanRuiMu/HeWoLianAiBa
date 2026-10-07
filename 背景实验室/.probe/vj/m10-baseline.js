(async function () {
  var M = window.__M8;
  var w = M.w();
  w.__placeClear();
  await M.sleep(3000);
  M.cam(8);
  var fire = M.fireStone([0.06, -0.35]);
  var g = await M.fpsGuard();
  var st = w.__placeState();
  return { baseline: fire, fps: g, count: st.count };
})()
