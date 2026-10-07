(function () {
  var w = document.getElementById('frame').contentWindow;
  w.__setCam({ px: -3, y: 0.8, pz: -3.2, pitch: -12, yaw: 0, dist: 3 });
  return w.__getCam();
})()
