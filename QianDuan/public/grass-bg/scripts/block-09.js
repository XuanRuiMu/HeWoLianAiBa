
(function () {
  var yiTongZhiJiuXu = false;
  var yiTongZhiShiBai = false;
  var jianCeDingShiQi = null;

  function tongZhi(zhuangTai, yuanYin) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { source: 'cao-di-bei-jing', zhuangTai: zhuangTai, yuanYin: yuanYin || '' },
          window.location.origin,
        );
      }
    } catch (e) {}
  }

  function biaoShiShiBai(yuanYin) {
    if (yiTongZhiShiBai) return;
    yiTongZhiShiBai = true;
    tongZhi('shi-bai', yuanYin);
  }

  function baoZhuangXuanRanQi() {
    var tiYan = window.__experience;
    var xuanRanQi = tiYan && tiYan.engine && tiYan.engine.renderer && tiYan.engine.renderer.instance;
    if (!xuanRanQi || typeof xuanRanQi.render !== 'function' || xuanRanQi.__caoDiYiBaoZhuang) return false;
    var yuanShi = xuanRanQi.render.bind(xuanRanQi);
    xuanRanQi.render = function () {
      if (window.__caoDiZanTing) return;
      return yuanShi.apply(xuanRanQi, arguments);
    };
    xuanRanQi.__caoDiYiBaoZhuang = true;
    return true;
  }

  function jianTingHuaBu() {
    var tiYan = window.__experience;
    var huaBu = tiYan && tiYan.engine && tiYan.engine.canvas;
    if (!huaBu || huaBu.__caoDiYiJianTing) return;
    huaBu.__caoDiYiJianTing = true;
    huaBu.addEventListener('webglcontextlost', function (shiJian) {
      try { shiJian.preventDefault(); } catch (e) {}
      biaoShiShiBai('webgl-diushi');
    });
    huaBu.addEventListener('webglcontextrestored', function () {
      yiTongZhiShiBai = false;
      yiTongZhiJiuXu = true;
      tongZhi('jiu-xu');
    });
  }

  function jianChaJiuXu() {
    if (yiTongZhiJiuXu) return;
    if (!window.__dcm) return;
    if (!baoZhuangXuanRanQi()) return;
    var tiYan = window.__experience;
    if (!tiYan || !tiYan.engine || !tiYan.engine.camera || !tiYan.engine.canvas) return;
    jianTingHuaBu();
    yiTongZhiJiuXu = true;
    if (jianCeDingShiQi) {
      clearInterval(jianCeDingShiQi);
      jianCeDingShiQi = null;
    }
    tongZhi('jiu-xu');
  }

  window.addEventListener('message', function (shiJian) {
    var shuJu = shiJian.data;
    if (!shuJu || shuJu.type !== 'grass-pause') return;
    window.__caoDiZanTing = !!shuJu.paused;
  });

  if (!window.WebGLRenderingContext) {
    biaoShiShiBai('wu-webgl');
    return;
  }

  jianCeDingShiQi = setInterval(jianChaJiuXu, 250);
  setTimeout(function () {
    if (jianCeDingShiQi) {
      clearInterval(jianCeDingShiQi);
      jianCeDingShiQi = null;
    }
    if (yiTongZhiJiuXu) return;
    biaoShiShiBai('chao-shi');
    jianCeDingShiQi = setInterval(function () {
      if (!yiTongZhiJiuXu) jianChaJiuXu();
    }, 1000);
  }, 15000);
})();
