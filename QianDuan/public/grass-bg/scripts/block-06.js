
        (function () {
            var zaiFuYe = false;
            try { zaiFuYe = !!(window.parent && window.parent !== window); } catch (eFu) {}
            var diaoShi = false;
            var jieShiChaoShiHaoMiao = 8000;
            var yuReHaoMiao = 250;
            try {
                var canShuMen = new URLSearchParams(window.location.search);
                var chaoShiCanShu = parseInt(canShuMen.get('jieShiChaoShi'), 10);
                if (isFinite(chaoShiCanShu) && chaoShiCanShu >= 2000) jieShiChaoShiHaoMiao = chaoShiCanShu;
                var yuReCanShu = parseInt(canShuMen.get('yuReHaoMiao'), 10);
                if (isFinite(yuReCanShu) && yuReCanShu >= 0 && yuReCanShu <= 3000) yuReHaoMiao = yuReCanShu;
                diaoShi = canShuMen.get('diaoShi') === '1';
            } catch (eCanShu) {}

            var yiYuRe = false;
            var yiZhunBei = false;
            var yiBoFang = false;
            var yiWanCheng = false;
            var yuReDingShiQi = null;
            var huiTuiDingShiQi = null;
            var anQuanDingShiQi = null;
            var dongHuaQingQiu = 0;
            var shangCiShiJian = 0;
            var yiDiYiZhen = false;
            var jingGuoHaoMiao = 0;
            var boWenShiChang = 4000;
            var xianJingShiChang = 5000;

            function quTiYan() {
                try { return window.__experience; } catch (e) { return null; }
            }
            function quRevealMesh() {
                var tiYan = quTiYan();
                try { return tiYan && tiYan.revealMesh; } catch (e) { return null; }
            }
            function quXiaoGuo() {
                try {
                    return quTiYan().postProcessing.waterColorRevealIntegration.waterColorRevealEffect;
                } catch (e) { return null; }
            }
            function sheZhiBoWen(zhi) {
                var rm = quRevealMesh();
                if (!rm || typeof rm.setProgress !== 'function') return false;
                try { rm.setProgress(zhi); return true; } catch (e) { return false; }
            }
            function sheZhiXianJing(zhi) {
                var e = quXiaoGuo();
                if (!e) return false;
                try {
                    e.getUniform('uProgress').value = zhi;
                    e.tweaksValue.progress = zhi;
                    return true;
                } catch (e2) { return false; }
            }
            function sheZhiGuang(qiang) {
                var e = quXiaoGuo();
                if (!e) return false;
                try {
                    var u = e.getUniform('uLineGlowIntensity');
                    if (u) u.value = qiang;
                    return true;
                } catch (e2) { return false; }
            }
            function xianShiBoWen(keJian) {
                var rm = quRevealMesh();
                if (!rm || !rm.mesh) return false;
                try { if (rm.tween && typeof rm.tween.kill === 'function') rm.tween.kill(); } catch (e) {}
                try { rm.mesh.visible = !!keJian; } catch (e) {}
                try { if (rm.material) rm.material.visible = !!keJian; } catch (e) {}
                if (keJian) {
                    try { rm.setProgress(0); } catch (e) {}
                }
                return true;
            }
            function quShiChang() {
                var rm = quRevealMesh();
                var e = quXiaoGuo();
                var bo = 4000;
                var xian = 5000;
                try {
                    if (rm && rm.config && isFinite(rm.config.revealDuration) && rm.config.revealDuration > 0) {
                        bo = rm.config.revealDuration * 1000;
                    }
                } catch (eBo) {}
                try {
                    if (e && isFinite(e.duration) && e.duration > 0) xian = e.duration * 1000;
                } catch (eXian) {}
                return { bo: bo, xian: xian };
            }
            function power2InOut(t) {
                if (t <= 0) return 0;
                if (t >= 1) return 1;
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            }
            function power2Out(t) {
                if (t <= 0) return 0;
                if (t >= 1) return 1;
                return 1 - Math.pow(1 - t, 3);
            }
            function jiLu(ming) {
                try {
                    var z = window.__caoDiZhunBeiZhuangTai;
                    if (z && z.riZhi) z.riZhi.push({ m: 'jieShi-' + ming, t: Math.round(performance.now()) });
                } catch (e) {}
            }
            function faKeBoFang() {
                try {
                    window.dispatchEvent(new window.CustomEvent('cao-di-ke-bo-fang', { detail: { yuanYin: 'yuRe' } }));
                } catch (e) {}
            }
            function qingLiDingShiQi() {
                if (yuReDingShiQi) { clearTimeout(yuReDingShiQi); yuReDingShiQi = null; }
                if (huiTuiDingShiQi) { clearTimeout(huiTuiDingShiQi); huiTuiDingShiQi = null; }
                if (anQuanDingShiQi) { clearTimeout(anQuanDingShiQi); anQuanDingShiQi = null; }
                if (dongHuaQingQiu) {
                    try { cancelAnimationFrame(dongHuaQingQiu); } catch (e) {}
                    dongHuaQingQiu = 0;
                }
            }
            function sheZhiZuiZhong() {
                xianShiBoWen(false);
                sheZhiXianJing(1);
            }
            function faWanCheng(yuanYin) {
                if (yiWanCheng) return;
                yiWanCheng = true;
                yiBoFang = true;
                qingLiDingShiQi();
                sheZhiZuiZhong();
                jiLu('wanCheng-' + (yuanYin || 'weiZhi'));
                if (diaoShi) console.info('[草地背景] 揭示完成', yuanYin || '');
                try {
                    window.dispatchEvent(new window.CustomEvent('cao-di-jie-shi-wan-cheng', { detail: { yuanYin: yuanYin || '' } }));
                } catch (eShiJian) {}
            }
            function kaiShiAnQuanDengDai() {
                if (anQuanDingShiQi) clearTimeout(anQuanDingShiQi);
                anQuanDingShiQi = setTimeout(function () {
                    anQuanDingShiQi = null;
                    faWanCheng('chaoShi');
                }, jieShiChaoShiHaoMiao);
            }
            function kaiShiHuiTui() {
                if (!zaiFuYe) return;
                if (huiTuiDingShiQi) clearTimeout(huiTuiDingShiQi);
                huiTuiDingShiQi = setTimeout(function () {
                    huiTuiDingShiQi = null;
                    kaiShiDongHua();
                }, 3500);
            }
            function kaiShiDongHua() {
                if (yiBoFang || yiWanCheng) return;
                yiZhunBei = true;
                yiBoFang = true;
                if (huiTuiDingShiQi) { clearTimeout(huiTuiDingShiQi); huiTuiDingShiQi = null; }
                if (!xianShiBoWen(true)) {
                    sheZhiXianJing(1);
                    faWanCheng('wuBoWen');
                    return;
                }
                sheZhiBoWen(0);
                sheZhiXianJing(0.5);
                sheZhiGuang(1.5);
                var shiChang = quShiChang();
                boWenShiChang = shiChang.bo;
                xianJingShiChang = shiChang.xian;
                shangCiShiJian = 0;
                yiDiYiZhen = false;
                jingGuoHaoMiao = 0;
                kaiShiAnQuanDengDai();
                jiLu('boFang');
                var zhen = function (shiJian) {
                    if (yiWanCheng) return;
                    if (!yiDiYiZhen) {
                        yiDiYiZhen = true;
                        shangCiShiJian = shiJian;
                        dongHuaQingQiu = requestAnimationFrame(zhen);
                        return;
                    }
                    var bu = Math.min(Math.max(shiJian - shangCiShiJian, 0), 250);
                    shangCiShiJian = shiJian;
                    jingGuoHaoMiao += bu;
                    var boT = Math.min(jingGuoHaoMiao / boWenShiChang, 1);
                    var xianT = Math.min(jingGuoHaoMiao / xianJingShiChang, 1);
                    sheZhiBoWen(power2InOut(boT));
                    sheZhiXianJing(0.5 + 0.5 * power2Out(xianT));
                    if (boT >= 1 && xianT >= 1) {
                        faWanCheng('zhengChang');
                        return;
                    }
                    dongHuaQingQiu = requestAnimationFrame(zhen);
                };
                dongHuaQingQiu = requestAnimationFrame(zhen);
            }
            function zhiJieWanCheng() {
                if (yiWanCheng) return;
                yiZhunBei = true;
                sheZhiZuiZhong();
                faKeBoFang();
                faWanCheng('zhiJie');
            }
            function zhunBeiBoFang() {
                if (yiZhunBei || yiBoFang || yiWanCheng) return;
                yiZhunBei = true;
                var rm = quRevealMesh();
                var e = quXiaoGuo();
                if (!rm || !rm.mesh || !e) {
                    sheZhiZuiZhong();
                    jiLu('wuJieKou');
                    faKeBoFang();
                    faWanCheng('wuJieKou');
                    return;
                }
                sheZhiGuang(1.5);
                xianShiBoWen(true);
                sheZhiBoWen(0);
                sheZhiXianJing(0.5);
                jiLu('zhunBei');
                faKeBoFang();
                if (!zaiFuYe) {
                    kaiShiDongHua();
                    return;
                }
                kaiShiHuiTui();
            }
            function yuRe() {
                if (yiYuRe || yiWanCheng) return;
                yiYuRe = true;
                jiLu('yuRe');
                var jianRuo = false;
                try {
                    jianRuo = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                } catch (eJianRuo) {}
                if (jianRuo) {
                    zhiJieWanCheng();
                    return;
                }
                if (zaiFuYe) {
                    xianShiBoWen(false);
                    sheZhiXianJing(1);
                } else {
                    xianShiBoWen(true);
                    sheZhiBoWen(0);
                    sheZhiXianJing(0.5);
                }
                sheZhiGuang(1.5);
                var yanShi = yuReHaoMiao;
                if (yanShi <= 0) {
                    zhunBeiBoFang();
                    return;
                }
                yuReDingShiQi = setTimeout(function () {
                    yuReDingShiQi = null;
                    zhunBeiBoFang();
                }, yanShi);
            }

            xianShiBoWen(false);
            sheZhiXianJing(1);
            window.addEventListener('cao-di-jiu-xu', yuRe);
            window.addEventListener('message', function (e) {
                try {
                    if (e.origin !== window.location.origin) return;
                    if (!e.data) return;
                    if (e.data.type === 'grass-wave-start') {
                        if (!yiZhunBei) zhunBeiBoFang();
                        kaiShiDongHua();
                        return;
                    }
                    if (e.data.type === 'grass-reveal-finish') {
                        if (yiWanCheng) {
                            try {
                                window.dispatchEvent(new window.CustomEvent('cao-di-jie-shi-wan-cheng', { detail: { yuanYin: 'waiBu-chongFu' } }));
                            } catch (eChongFu) {}
                            return;
                        }
                        yiZhunBei = true;
                        faWanCheng('waiBu');
                        return;
                    }
                } catch (eM) {}
            });
            if (window.__caoDiZhunBeiZhuangTai && window.__caoDiZhunBeiZhuangTai.zhunBei) yuRe();
        })();
