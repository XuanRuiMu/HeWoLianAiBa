
(function () {
  var yiTongZhiJiuXu = false;
  var yiTongZhiShiBai = false;
  var jianCeDingShiQi = null;
  var yiBaoZhuangXuanRanQi = false;
  var yiJianTingHuaBu = false;

  var chaoShiHaoMiao = 30000;
  var diaoShi = false;
  try {
    var canShuMen = new URLSearchParams(window.location.search);
    var canShu = canShuMen.get('zhunBeiChaoShi');
    var n = parseInt(canShu, 10);
    if (isFinite(n) && n >= 5000) chaoShiHaoMiao = n;
    diaoShi = canShuMen.get('diaoShi') === '1';
  } catch (eCanShu) {}

  function tongZhi(zhuangTai, yuanYin, fuJia) {
    try {
      if (window.parent && window.parent !== window) {
        var xiaoXi = { source: 'cao-di-bei-jing', zhuangTai: zhuangTai, yuanYin: yuanYin || '' };
        if (fuJia) for (var k in fuJia) xiaoXi[k] = fuJia[k];
        window.parent.postMessage(xiaoXi, window.location.origin);
      }
    } catch (e) {}
  }

  function biaoShiShiBai(yuanYin) {
    if (yiTongZhiShiBai) return;
    yiTongZhiShiBai = true;
    var z = window.__caoDiZhunBeiZhuangTai;
    if (diaoShi) console.warn('[草地背景] 失败', yuanYin, z || null);
    tongZhi('shi-bai', yuanYin, z ? { jieDuan: z.jieDuan, haoShi: z.haoShi, chongJian: z.chongJianCiShu } : null);
  }

  function baoZhuangXuanRanQi() {
    if (yiBaoZhuangXuanRanQi) return true;
    var tiYan = window.__experience;
    var xuanRanQi = tiYan && tiYan.engine && tiYan.engine.renderer && tiYan.engine.renderer.instance;
    if (!xuanRanQi || typeof xuanRanQi.render !== 'function') return false;
    var yuanShi = xuanRanQi.render.bind(xuanRanQi);
    xuanRanQi.render = function () {
      if (window.__caoDiZanTing) return;
      return yuanShi.apply(xuanRanQi, arguments);
    };
    yiBaoZhuangXuanRanQi = true;
    return true;
  }

  function jianTingHuaBu() {
    if (yiJianTingHuaBu) return;
    var tiYan = window.__experience;
    var huaBu = tiYan && tiYan.engine && tiYan.engine.canvas;
    if (!huaBu) return;
    yiJianTingHuaBu = true;
    huaBu.addEventListener('webglcontextlost', function (shiJian) {
      try { shiJian.preventDefault(); } catch (e) {}
      biaoShiShiBai('webgl-diushi');
    });
    huaBu.addEventListener('webglcontextrestored', function () {
      yiTongZhiShiBai = false;
      yiTongZhiJiuXu = false;
      if (jianChaJiuXu()) tongZhiJiuXu();
    });
  }

  function tongZhiJiuXu() {
    if (yiTongZhiJiuXu) return;
    yiTongZhiJiuXu = true;
    if (jianCeDingShiQi) {
      clearInterval(jianCeDingShiQi);
      jianCeDingShiQi = null;
    }
    try {
      if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
        window.dispatchEvent(new window.CustomEvent('cao-di-jiu-xu'));
      }
    } catch (eShiJian) {}
    var z = window.__caoDiZhunBeiZhuangTai;
    if (diaoShi) console.info('[草地背景] 就绪', z || null);
    tongZhi('jiu-xu', '', z ? {
      haoShi: z.haoShi,
      chongJian: z.chongJianCiShu,
      riZhi: z.riZhi ? z.riZhi.slice(-10) : null
    } : null);
  }

  window.addEventListener('cao-di-ke-bo-fang', function (shiJian) {
    if (!yiTongZhiJiuXu) return;
    var z = window.__caoDiZhunBeiZhuangTai;
    var xiQing = shiJian && shiJian.detail ? shiJian.detail : {};
    if (diaoShi) console.info('[草地背景] 可播放', xiQing, z || null);
    tongZhi('ke-bo-fang', '', {
      haoShi: z ? z.haoShi : null,
      yuanYin: xiQing.yuanYin || '',
      riZhi: z && z.riZhi ? z.riZhi.slice(-10) : null
    });
  });

  window.addEventListener('cao-di-jie-shi-wan-cheng', function (shiJian) {
    if (!yiTongZhiJiuXu) return;
    var z = window.__caoDiZhunBeiZhuangTai;
    var xiQing = shiJian && shiJian.detail ? shiJian.detail : {};
    if (diaoShi) console.info('[草地背景] 揭示完成', xiQing, z || null);
    tongZhi('jie-shi-wan-cheng', '', {
      haoShi: z ? z.haoShi : null,
      yuanYin: xiQing.yuanYin || '',
      riZhi: z && z.riZhi ? z.riZhi.slice(-10) : null
    });
  });

  function jianChaJiuXu() {
    if (yiTongZhiJiuXu) return true;
    var tiYan = window.__experience;
    if (!tiYan || !tiYan.engine || !tiYan.engine.camera || !tiYan.engine.canvas) return false;
    if (!baoZhuangXuanRanQi()) return false;
    var z = window.__caoDiZhunBeiZhuangTai;
    if (!z || z.zhunBei !== true) return false;
    jianTingHuaBu();
    return true;
  }

  function jianCe() {
    if (yiTongZhiJiuXu) return;
    if (jianChaJiuXu()) tongZhiJiuXu();
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

  jianCeDingShiQi = setInterval(jianCe, 200);
  setTimeout(function () {
    if (yiTongZhiJiuXu) return;
    var z = window.__caoDiZhunBeiZhuangTai;
    biaoShiShiBai('chao-shi');
    if (z && !z.yuanYin) z.yuanYin = 'chao-shi:' + (z.jieDuan || 'wu-zhuang-tai');
    if (jianCeDingShiQi) clearInterval(jianCeDingShiQi);
    jianCeDingShiQi = setInterval(jianCe, 1000);
  }, chaoShiHaoMiao);
})();
