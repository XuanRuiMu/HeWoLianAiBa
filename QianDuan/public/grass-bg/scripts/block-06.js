
        (function () {
            var yiKaiShi = false;
            var yiWanCheng = false;
            var wenDingDingShiQi = null;
            var chaoShiDingShiQi = null;
            var zaiFuYe = false;
            try { zaiFuYe = !!(window.parent && window.parent !== window); } catch (eFu) {}
            var jieShiChaoShiHaoMiao = 8000;
            var diaoShi = false;
            try {
                var canShuMen = new URLSearchParams(window.location.search);
                var chaoShiCanShu = parseInt(canShuMen.get('jieShiChaoShi'), 10);
                if (isFinite(chaoShiCanShu) && chaoShiCanShu >= 2000) jieShiChaoShiHaoMiao = chaoShiCanShu;
                diaoShi = canShuMen.get('diaoShi') === '1';
            } catch (eCanShu) {}

            function quXiaoGuo() {
                try {
                    return window.__experience.postProcessing.waterColorRevealIntegration.waterColorRevealEffect;
                } catch (e) { return null; }
            }
            function sheZhiJinDu(zhi) {
                var e = quXiaoGuo(); if (!e) return false;
                try {
                    e.getUniform('uProgress').value = zhi;
                    e.tweaksValue.progress = zhi;
                    return true;
                } catch (e2) { return false; }
            }
            function tingZhiJieShi() {
                var e = quXiaoGuo();
                try { if (e && e.tween && typeof e.tween.kill === 'function') e.tween.kill(); } catch (eKill) {}
                sheZhiJinDu(1);
            }
            function jiLu(ming) {
                try {
                    var z = window.__caoDiZhunBeiZhuangTai;
                    if (z && z.riZhi) z.riZhi.push({ m: 'jieShi-' + ming, t: Math.round(performance.now()) });
                } catch (e) {}
            }
            function faWanCheng(yuanYin) {
                if (yiWanCheng) return;
                yiWanCheng = true;
                if (wenDingDingShiQi) { clearTimeout(wenDingDingShiQi); wenDingDingShiQi = null; }
                if (chaoShiDingShiQi) { clearTimeout(chaoShiDingShiQi); chaoShiDingShiQi = null; }
                tingZhiJieShi();
                jiLu('wanCheng-' + (yuanYin || 'weiZhi'));
                if (diaoShi) console.info('[草地背景] 揭示完成', yuanYin || '');
                try {
                    window.dispatchEvent(new window.CustomEvent('cao-di-jie-shi-wan-cheng', { detail: { yuanYin: yuanYin || '' } }));
                } catch (eShiJian) {}
            }
            function paiDuiWanCheng(yuanYin) {
                if (yiWanCheng) return;
                var yanShi = 500;
                try {
                    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) yanShi = 0;
                } catch (eM) {}
                if (wenDingDingShiQi) clearTimeout(wenDingDingShiQi);
                wenDingDingShiQi = setTimeout(function () {
                    wenDingDingShiQi = null;
                    faWanCheng(yuanYin);
                }, yanShi);
            }
            function kaiShiJieShi() {
                if (yiKaiShi || yiWanCheng) return;
                yiKaiShi = true;
                jiLu('kaiShi');
                if (!zaiFuYe) {
                    tingZhiJieShi();
                    jiLu('guLi');
                    return;
                }
                var jianRuoDongHua = false;
                try {
                    jianRuoDongHua = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                } catch (eJianRuo) {}
                if (jianRuoDongHua) {
                    tingZhiJieShi();
                    faWanCheng('reduced-motion');
                    return;
                }
                var exp = window.__experience;
                if (!exp || !exp.postProcessing || typeof exp.postProcessing.startReveal !== 'function') {
                    tingZhiJieShi();
                    paiDuiWanCheng('wuJieKou');
                    return;
                }
                chaoShiDingShiQi = setTimeout(function () {
                    chaoShiDingShiQi = null;
                    tingZhiJieShi();
                    faWanCheng('chaoShi');
                }, jieShiChaoShiHaoMiao);
                try {
                    exp.postProcessing.startReveal(function () {
                        paiDuiWanCheng('callback');
                    });
                } catch (e) {
                    tingZhiJieShi();
                    faWanCheng('shiBai');
                }
            }

            sheZhiJinDu(0);
            window.addEventListener('cao-di-jiu-xu', kaiShiJieShi);
            window.addEventListener('message', function (e) {
                try {
                    if (e.origin !== window.location.origin) return;
                    if (!e.data || e.data.type !== 'grass-reveal-finish') return;
                    tingZhiJieShi();
                    if (yiWanCheng) {
                        try {
                            window.dispatchEvent(new window.CustomEvent('cao-di-jie-shi-wan-cheng', { detail: { yuanYin: 'waiBu-chongFu' } }));
                        } catch (eChongFu) {}
                        return;
                    }
                    faWanCheng('waiBu');
                } catch (eM) {}
            });
            if (window.__caoDiZhunBeiZhuangTai && window.__caoDiZhunBeiZhuangTai.zhunBei) kaiShiJieShi();
        })();
