(function () {
  var w = document.getElementById('frame').contentWindow;
  w.__camSetFrozen(false, true);
  w.__setCam({ px: 0, y: 0.55, pz: -5.2, pitch: -7, yaw: 0, dist: 3 });
  return w.__getCam();
})()
