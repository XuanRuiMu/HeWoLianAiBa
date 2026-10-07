(function () {
  var w = document.getElementById('frame').contentWindow;
  w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: -31.5, dist: 5.6014 });
  w.__camSetFrozen(true, true);
  return w.__getCam();
})()
