(function () {
  var w = document.getElementById('frame').contentWindow;
  w.__camSetFrozen(false, true);
  w.__setCam({ px: 0, y: 18, pz: 6, pitch: -56, yaw: 0, dist: 22 });
  return w.__getCam();
})()
