(function () {
  var w = document.getElementById('frame').contentWindow;
  w.__camSetFrozen(false, true);
  w.__setCam({ px: 12, y: 5, pz: 8, yaw: 37.6, pitch: 2, dist: 14 });
  return w.__getCam();
})()
