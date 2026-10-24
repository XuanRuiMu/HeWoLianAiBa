
(function () {
  var 雨开启 = false;

  function 取雨系统() {
    var 体验 = window.__experience;
    if (!体验 || !体验.postProcessing) return null;
    var 水珠 = 体验.postProcessing.waterDropsEffect || null;
    var 粒子 = 体验.rain || 体验.postProcessing.rainParticles || null;
    if (!水珠) return null;
    return { 水珠: 水珠, 粒子: 粒子 };
  }

  function 应用雨(系统) {
    var 目标 = 雨开启 ? 1 : 0;
    try {
      系统.水珠.setIntensity(目标);
    } catch (e) {}
    try {
      if (系统.粒子 && typeof 系统.粒子.setIntensity === 'function') 系统.粒子.setIntensity(0);
    } catch (e) {}
    return true;
  }

  function 同步雨() {
    var 系统 = 取雨系统();
    if (!系统) return false;
    var 水珠当前 = 系统.水珠.tweaksValue ? 系统.水珠.tweaksValue.intensity : null;
    var 粒子当前 = 系统.粒子 ? 系统.粒子.intensity : null;
    if (水珠当前 === (雨开启 ? 1 : 0) && (粒子当前 === null || 粒子当前 === 0)) return true;
    return 应用雨(系统);
  }

  window.addEventListener('message', function (事件) {
    var 数据 = 事件.data;
    if (!数据 || 数据.type !== 'grass-rain') return;
    雨开启 = !!数据.enabled;
    同步雨();
  });

  setInterval(同步雨, 1200);
})();
