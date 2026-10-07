(function () {
  var w = document.getElementById('frame').contentWindow;
  w.__camSetFrozen(false, true);
  w.__setCam({ px: 4.14, y: 0.8, pz: 0.7, pitch: -13, yaw: 0, dist: 3 });
  return w.__getCam();
})()
