(function () {
  var w = document.getElementById('frame').contentWindow;
  w.__camSetFrozen(false, true);
  w.__setCam({ px: 4.5, y: 0.4, pz: -3.4, pitch: -6, yaw: 28, dist: 3 });
  return w.__getCam();
})()
