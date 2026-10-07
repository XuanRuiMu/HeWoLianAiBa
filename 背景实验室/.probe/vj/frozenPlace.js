(function () {
  var w = document.getElementById('frame').contentWindow;
  // 冻结态放置：用户要求「冻结只锁相机，不锁场地」
  var frozenBefore = w.__camFrozen();
  w.__camSetFrozen(true, true);
  var gy = w.__groundY(-1.5, -4.5);
  var r = w.__placeAdd('campfire', -1.5, gy, -4.5, 0, 1, 'default');
  // 幽灵预览：进入放置模式 + 合成 mousemove（只验证幽灵跟手，真手感由用户实测）
  var ent = w.__placeEnter('tree', 't008');
  var cv = (w.__experience.engine.canvas) || w.document.querySelector('canvas');
  var ghostBefore = null;
  if (cv) {
    var rct = cv.getBoundingClientRect();
    var ev = new w.MouseEvent('mousemove', { clientX: rct.left + rct.width * 0.5, clientY: rct.top + rct.height * 0.55, bubbles: true });
    cv.dispatchEvent(ev);
    // 等 enforceCamera 下一帧跑 updateGhost
  }
  return new Promise(function (res) {
    setTimeout(function () {
      var st = w.__placeState();
      w.__placeExit();
      var out = {
        frozenBefore: frozenBefore,
        frozenPlaceOk: r && r.ok ? r.item : String(r && r.reason),
        ghost: st.ghost, mode: st.mode
      };
      // 恢复默认机位并冻结
      w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: -31.5, dist: 5.6014 });
      w.__camSetFrozen(true, true);
      out.finalCam = w.__getCam();
      res(out);
    }, 600);
  });
})()
