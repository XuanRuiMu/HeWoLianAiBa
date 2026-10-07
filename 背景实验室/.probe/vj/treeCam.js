(function () {
  var w = document.getElementById('frame').contentWindow;
  w.__setCam({ px: 3, y: 1.6, pz: -2.2, pitch: -14, yaw: 0, dist: 3 });
  return w.__getCam();
})()
