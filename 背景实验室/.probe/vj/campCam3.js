(function () {
  var w = document.getElementById('frame').contentWindow;
  w.__camSetFrozen(false, true);
  w.__setCam({ px: 3.4, y: 1.2, pz: -5.2, pitch: -9, yaw: 0, dist: 3.3 });
  return w.__getCam();
})()
