
(function () {
  if (!window || window.__caoDiXunHuan) return;

  var PIAN_YI = 1000000;
  var shengRaf = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame.bind(window) : null;
  var shengQuXiao = typeof window.cancelAnimationFrame === 'function' ? window.cancelAnimationFrame.bind(window) : null;
  var shengZhouQi = typeof window.setInterval === 'function' ? window.setInterval.bind(window) : null;
  var shengXiaoZhouQi = typeof window.clearInterval === 'function' ? window.clearInterval.bind(window) : null;
  var ShengGuanChaZhe = typeof window.MutationObserver === 'function' ? window.MutationObserver : null;

  var yiQingQiu = false;
  var qingQiuYuanYin = '';
  var menYiKai = false;
  var menYuanYin = '';

  var zhenCe = {};
  var zhenQingQiuZeng = 0;
  var zhenZhiXingZeng = 0;
  var zhouCe = {};
  var zhouZeng = 0;
  var zhouZhiXingZeng = 0;
  var chaCe = [];
  var chaDuanKaiZeng = 0;
  var fangCe = [];
  var fangZhiXingZeng = 0;

  function zuSai() { return yiQingQiu; }

  function shuCe() {
    var n = 0;
    for (var id in zhenCe) n++;
    return n;
  }

  function zhenHuiZhuan(zhenId, shiJian) {
    var tiao = zhenCe[zhenId];
    if (!tiao) return;
    tiao.zaiTu = 0;
    if (zuSai()) {
      tiao.dengDai = true;
      return;
    }
    delete zhenCe[zhenId];
    zhenZhiXingZeng++;
    tiao.han(shiJian);
  }

  function zhenSongDa(tiao) {
    if (!shengRaf) return;
    tiao.dengDai = false;
    tiao.zaiTu = shengRaf(function (shiJian) { zhenHuiZhuan(tiao.id, shiJian); });
  }

  function daiQingQiuZhen(han) {
    if (typeof han !== 'function' || !shengRaf) return shengRaf ? shengRaf(han) : 0;
    zhenQingQiuZeng++;
    var id = PIAN_YI + zhenQingQiuZeng;
    var tiao = { id: id, han: han, zaiTu: 0, dengDai: true };
    zhenCe[id] = tiao;
    if (zuSai()) return id;
    zhenSongDa(tiao);
    return id;
  }

  function daiQuXiaoZhen(id) {
    var tiao = typeof id === 'number' ? zhenCe[id] : null;
    if (!tiao) {
      if (shengQuXiao) shengQuXiao(id);
      return;
    }
    delete zhenCe[id];
    if (tiao.zaiTu && shengQuXiao) shengQuXiao(tiao.zaiTu);
    tiao.zaiTu = 0;
  }

  function zhenQuanHuoFu() {
    for (var id in zhenCe) {
      var tiao = zhenCe[id];
      if (tiao && tiao.dengDai && tiao.han) {
        zhenSongDa(tiao);
      }
    }
  }

  function zhouAnZhuang(xiang) {
    if (xiang.yiAnZhuang || !shengZhouQi) return;
    xiang.yiAnZhuang = true;
    xiang.zhenJu = shengZhouQi(function () {
      zhouZhiXingZeng++;
      try { xiang.han.apply(null, xiang.can); } catch (eH) { window.__caoDiZhouQiCuo = String(eH && eH.message || eH); }
    }, xiang.miao);
  }

  function zhouXiaZai(xiang) {
    if (!xiang.yiAnZhuang) return;
    xiang.yiAnZhuang = false;
    if (xiang.zhenJu && shengXiaoZhouQi) shengXiaoZhouQi(xiang.zhenJu);
    xiang.zhenJu = 0;
  }

  function daiQingQiuZhouQi(han, miao) {
    var can = [];
    for (var i = 2; i < arguments.length; i++) can.push(arguments[i]);
    if (typeof han !== 'function' || !shengZhouQi) return shengZhouQi ? shengZhouQi.apply(window, arguments) : 0;
    var zhi = Number(miao);
    if (!isFinite(zhi) || zhi < 0) zhi = 0;
    zhouZeng++;
    var id = PIAN_YI + zhouZeng;
    var xiang = { id: id, han: han, miao: zhi, can: can, zhenJu: 0, yiAnZhuang: false };
    zhouCe[id] = xiang;
    if (!zuSai()) zhouAnZhuang(xiang);
    return id;
  }

  function daiXiaoZhouQi(id) {
    var xiang = typeof id === 'number' ? zhouCe[id] : null;
    if (!xiang) {
      if (shengXiaoZhouQi) shengXiaoZhouQi(id);
      return;
    }
    zhouXiaZai(xiang);
    delete zhouCe[id];
  }

  function chaDuanKai(lu) {
    if (!lu.lianJie) return;
    lu.lianJie = false;
    chaDuanKaiZeng++;
    try { lu.shengDuanKai(); } catch (eD) { window.__caoDiGuanChaCuo = String(eD && eD.message || eD); }
  }

  function chaChongLian(lu) {
    if (lu.lianJie || !lu.mubiao || !lu.xuanXiang) return;
    try {
      lu.shengGuanCha(lu.mubiao, lu.xuanXiang);
      lu.lianJie = true;
    } catch (eL) { window.__caoDiGuanChaCuo = String(eL && eL.message || eL); }
  }

  function DaiGuanChaZhe(cb) {
    if (!(this instanceof DaiGuanChaZhe)) return new DaiGuanChaZhe(cb);
    var shi = new ShengGuanChaZhe(cb);
    var lu = {
      mubiao: null,
      xuanXiang: null,
      lianJie: false,
      shengGuanCha: shi.observe.bind(shi),
      shengDuanKai: shi.disconnect.bind(shi)
    };
    shi.observe = function (mubiao, xuanXiang) {
      lu.mubiao = mubiao;
      lu.xuanXiang = xuanXiang;
      chaDuanKai(lu);
      if (zuSai()) return;
      chaChongLian(lu);
    };
    shi.disconnect = function () {
      lu.mubiao = null;
      lu.xuanXiang = null;
      chaDuanKai(lu);
    };
    shi.__caoDiGuanCha = lu;
    chaCe.push(lu);
    return shi;
  }

  if (ShengGuanChaZhe) {
    DaiGuanChaZhe.prototype = ShengGuanChaZhe.prototype;
    window.MutationObserver = DaiGuanChaZhe;
  }

  function fangChongFang() {
    for (var i = 0; i < fangCe.length; i++) {
      try {
        fangCe[i].han();
        fangZhiXingZeng++;
      } catch (eF) { window.__caoDiChongFangCuo = String(eF && eF.message || eF); }
    }
  }

  function zhiXingZanTing() {
    window.__caoDiZanTing = yiQingQiu;
    for (var id in zhouCe) zhouXiaZai(zhouCe[id]);
    for (var i = 0; i < chaCe.length; i++) chaDuanKai(chaCe[i]);
  }

  function zhiXingHuoFu() {
    window.__caoDiZanTing = yiQingQiu;
    zhenQuanHuoFu();
    for (var id in zhouCe) zhouAnZhuang(zhouCe[id]);
    for (var i = 0; i < chaCe.length; i++) chaChongLian(chaCe[i]);
    fangChongFang();
  }

  function heXin() {
    if (zuSai()) zhiXingZanTing();
    else zhiXingHuoFu();
  }

  function qiangZhuangTai() {
    var deng = 0;
    var zai = 0;
    for (var id in zhenCe) {
      var tiao = zhenCe[id];
      if (!tiao) continue;
      if (tiao.dengDai) deng++;
      else zai++;
    }
    var zhouZong = 0;
    var zhouHuo = 0;
    for (var k in zhouCe) {
      zhouZong++;
      if (zhouCe[k].yiAnZhuang) zhouHuo++;
    }
    var chaLian = 0;
    for (var i = 0; i < chaCe.length; i++) if (chaCe[i].lianJie) chaLian++;
    return { zhenDengDai: deng, zhenZaiTu: zai, zhouQiZong: zhouZong, zhouQiHuoYue: zhouHuo, guanChaLian: chaLian, guanChaZong: chaCe.length };
  }

  window.__caoDiXunHuan = {
    kaiFa: 'FP-08',
    sheZanTing: function (yao, yuanYin) {
      var zhi = !!yao;
      if (zhi === yiQingQiu) {
        qingQiuYuanYin = String(yuanYin || qingQiuYuanYin);
        window.__caoDiZanTing = yiQingQiu;
        return yiQingQiu;
      }
      yiQingQiu = zhi;
      qingQiuYuanYin = String(yuanYin || '');
      heXin();
      return yiQingQiu;
    },
    kaiZanTingMen: function (yuanYin) {
      if (menYiKai) return true;
      menYiKai = true;
      menYuanYin = String(yuanYin || '');
      heXin();
      return true;
    },
    yiYunXuZanTing: function () { return menYiKai; },
    yiZuSai: function () { return zuSai(); },
    yuanYin: function () {
      return { qingQiu: yiQingQiu, qingQiuYuanYin: qingQiuYuanYin, men: menYiKai, menYuanYin: menYuanYin };
    },
    guiDangChongFang: function (ming, han) {
      if (typeof han !== 'function' || !ming) return false;
      for (var i = 0; i < fangCe.length; i++) if (fangCe[i].ming === ming) return false;
      fangCe.push({ ming: String(ming), han: han });
      return true;
    },
    guiDangChongFangLieBiao: function () {
      var ming = [];
      for (var i = 0; i < fangCe.length; i++) ming.push(fangCe[i].ming);
      return ming;
    },
    jiShu: function () {
      return {
        zhenQingQiu: zhenQingQiuZeng,
        zhenZhiXing: zhenZhiXingZeng,
        zhenZaiCe: shuCe(),
        zhouQiZhiXing: zhouZhiXingZeng,
        duanKaiCiShu: chaDuanKaiZeng,
        chongFangCiShu: fangZhiXingZeng,
        yiZanTing: zuSai(),
        menYiKai: menYiKai,
        qiang: qiangZhuangTai()
      };
    }
  };

  window.__caoDiZanTing = false;
  window.requestAnimationFrame = daiQingQiuZhen;
  window.cancelAnimationFrame = daiQuXiaoZhen;
  window.setInterval = daiQingQiuZhouQi;
  window.clearInterval = daiXiaoZhouQi;
})();
