
(function () {
  var 雨开启 = false;

  function 取天气控制器() {
    var 体验 = window.__experience;
    var 后期 = 体验 && 体验.postProcessing;
    if (!后期 || !后期.weatherController || !后期.weatherController.tweaksValue) return null;
    return 后期.weatherController;
  }

  function 同步雨() {
    var 控制器 = 取天气控制器();
    if (!控制器) return false;
    var 目标 = 雨开启 ? 'rain' : 'clear';
    if (控制器.tweaksValue.forceState === 目标) return true;
    控制器.tweaksValue.forceState = 目标;
    控制器.cycleTimer = 0;
    window.__yuZhuangTai = { forceState: 目标, 时间: Date.now() };
    return true;
  }

  window.addEventListener('message', function (事件) {
    var 数据 = 事件.data;
    if (!数据 || 数据.type !== 'grass-rain') return;
    雨开启 = !!数据.enabled;
    同步雨();
  });

  setInterval(同步雨, 1200);
})();
