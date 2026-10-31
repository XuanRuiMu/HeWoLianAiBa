
        /* 主题联动（深色=夜晚 / 浅色=白天）+ 草色 + 鼠标跟随视差：
           - 读取父页（同源）data-theme：dark(暗色) → 夜晚相位 + 夜草色；light(浅色) → 白天 + 金草。
             默认跟随用户设置（首次访问 data-theme=dark → 默认夜晚）。standalone 时退化为白天金草。
             同时监听父页 postMessage('grass-theme') 作为跨域兜底。
           - 配色不再靠 400ms 全场景轮询：bundle 每创建一个草地材质都会 push 到 __grassMats，
             这里改写该数组的 push，材质创建当帧就上色；主题变化由 MutationObserver / postMessage 驱动。
           - 提前 setPhase + initialized=true：避免 resources.ready 时引擎按本地时间再切一次昼夜，
             造成整屏光照/草色闪变。
           - 鼠标视差：iframe 设了 pointer-events:none 且压在应用内容之下，收不到鼠标事件；
             故由 App.vue 转发归一化光标到本页，本页用 rAF 轻推 CameraGroup 旋转，形成"跟随鼠标微晃"。 */
        (function () {
            var DAY = ['#d9a441', '#9c6b1e', '#b08746', '#8a6a38'];        // 白天金草 L,D,dL,dD
            var NIGHT = ['#b07be0', '#7a3fa0', '#5e2d8a', '#2e1450'];      // 夜晚紫草（深色模式=全紫草+紫地）
            var themeOverride = null;
            try {
                var wangZhiCanShu = new URLSearchParams(window.location.search);
                var wangZhiZhuTi = wangZhiCanShu.get('zhuti');
                if (wangZhiZhuTi === 'dark' || wangZhiZhuTi === 'light') themeOverride = wangZhiZhuTi;
            } catch (eWangZhi) {}

            function parentTheme() {
                try {
                    var el = (window.parent && window.parent !== window)
                        ? window.parent.document.documentElement : document.documentElement;
                    var t = el && el.getAttribute('data-theme');
                    return t === 'light' ? 'light' : (t === 'dark' ? 'dark' : 'light');
                } catch (e) { return 'light'; }
            }
            function currentTheme() { return themeOverride || parentTheme(); }
            function paletteFor(theme) { return theme === 'dark' ? NIGHT : DAY; }
            function phaseFor(theme) { return theme === 'dark' ? 'night' : 'day'; }

            var 当前调色板 = paletteFor(currentTheme());
            window.__grassOverride = 当前调色板;
            window.__caoDiZhuTiJiuXu = false;

            function 应用草地材质(m, palette) {
                if (!m || !m.uniforms) return false;
                var u = m.uniforms;
                if (u.uLightGreen && u.uLightGreen.value) u.uLightGreen.value.set(palette[0]);
                if (u.uDarkGreen && u.uDarkGreen.value) u.uDarkGreen.value.set(palette[1]);
                if (u.uLightDirt && u.uLightDirt.value) u.uLightDirt.value.set(palette[2]);
                if (u.uDarkDirt && u.uDarkDirt.value) u.uDarkDirt.value.set(palette[3]);
                return true;
            }

            // 草地材质创建钩子：push 进来当帧上色，第一帧就是正确主题色。
            var 材质表 = window.__grassMats || [];
            if (!材质表.__caoDiZhuTiGouZi) {
                材质表.__caoDiZhuTiGouZi = true;
                var 原始Push = 材质表.push;
                材质表.push = function () {
                    var jieGuo = 原始Push.apply(this, arguments);
                    var tuiRu = [];
                    for (var i = 0; i < arguments.length; i++) {
                        tuiRu.push(arguments[i]);
                        应用草地材质(arguments[i], 当前调色板);
                    }
                    var chongFu = function () {
                        for (var j = 0; j < tuiRu.length; j++) 应用草地材质(tuiRu[j], 当前调色板);
                    };
                    if (typeof queueMicrotask === 'function') queueMicrotask(chongFu);
                    else Promise.resolve().then(chongFu);
                    return jieGuo;
                };
            }
            window.__grassMats = 材质表;

            function 应用材质表() {
                var mats = window.__grassMats;
                if (!mats || !mats.length) return 0;
                for (var i = 0; i < mats.length; i++) 应用草地材质(mats[i], 当前调色板);
                return mats.length;
            }

            // 地形地面 / 岛体地形颜色
            var terrainCaptured = null;
            var TERRAIN_KEYS = ['uGrassColor', 'uGrassColorAlt', 'uDirtColor', 'uRockColor', 'uWaterColor', 'uSnowColor'];
            function 应用地形(theme, palette) {
                var exp = window.__experience; if (!exp) return;
                var sc = exp.scene || (exp.engine && exp.engine.scene);
                if (!sc || !sc.traverse) return;
                var isDark = (theme === 'dark');
                sc.traverse(function (o) {
                    var m = o.material; if (!m) return;
                    var list = Array.isArray(m) ? m : [m];
                    for (var i = 0; i < list.length; i++) {
                        var u = list[i].uniforms;
                        if (!u) continue;
                        if (u.uGrassLightColor && u.uGrassDarkColor) {
                            if (u.uGrassLightColor.value) u.uGrassLightColor.value.set(palette[0]);
                            if (u.uGrassDarkColor.value) u.uGrassDarkColor.value.set(palette[1]);
                        }
                        if (!u.uGrassColor) continue;
                        if (!terrainCaptured) {
                            terrainCaptured = {};
                            for (var k = 0; k < TERRAIN_KEYS.length; k++) {
                                var key = TERRAIN_KEYS[k];
                                if (u[key] && u[key].value && u[key].value.clone) {
                                    terrainCaptured[key] = u[key].value.clone();
                                }
                            }
                        }
                        for (var j = 0; j < TERRAIN_KEYS.length; j++) {
                            var key2 = TERRAIN_KEYS[j];
                            if (!u[key2] || !u[key2].value || !u[key2].value.set) continue;
                            if (isDark) {
                                var purpleMap = { uGrassColor: palette[0], uGrassColorAlt: palette[1], uDirtColor: palette[2], uRockColor: palette[3], uWaterColor: '#2a1245', uSnowColor: '#c89be8' };
                                u[key2].value.set(purpleMap[key2] || palette[3]);
                            } else if (terrainCaptured[key2]) {
                                u[key2].value.copy(terrainCaptured[key2]);
                            }
                        }
                    }
                });
            }

            var 已订阅相位 = false;
            function 同步主题() {
                var theme = currentTheme();
                var palette = paletteFor(theme);
                当前调色板 = palette;
                window.__grassOverride = palette;

                var d = window.__dcm;
                var want = phaseFor(theme);
                window.__caoDiQiDaiXiangWei = want;
                if (d) {
                    try {
                        if (typeof d.getPhase === 'function') {
                            if (d.getPhase() !== want) d.setPhase(want);
                            if (d.getPhase() === want) d.initialized = true;
                        }
                    } catch (ePhase) {}
                    if (!已订阅相位 && typeof d.on === 'function') {
                        try {
                            d.on('phaseChanged', function () { setTimeout(同步主题, 50); });
                            已订阅相位 = true;
                        } catch (eOn) {}
                    }
                }

                var n = 应用材质表();
                应用地形(theme, palette);
                var 相位正确 = !d || (typeof d.getPhase === 'function' && d.getPhase() === want);
                window.__caoDiZhuTiJiuXu = n > 0 && 相位正确;
                return window.__caoDiZhuTiJiuXu;
            }
            window.__caoDiTongBuZhuTi = function () { return 同步主题(); };

            // 父页主题变化即时响应（避免轮询间隔内的短暂相位错位）
            try {
                var pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
                var pEl = pDoc && pDoc.documentElement;
                if (pEl && pEl.addEventListener) {
                    new MutationObserver(function () { 同步主题(); }).observe(pEl, { attributes: true, attributeFilter: ['data-theme'] });
                }
            } catch (eMO) {}

            // 启动期轮询：只负责等引擎/材质出现并把相位锁死；就绪后立即停表。
            (function 启动同步() {
                var kaiShi = performance.now();
                (function 下一次() {
                    同步主题();
                    var z = window.__caoDiZhunBeiZhuangTai;
                    if ((z && z.zhunBei) || performance.now() - kaiShi > 20000) return;
                    setTimeout(下一次, 100);
                })();
            })();

            // 鼠标跟随：接收父页转发的归一化光标(-1..1)，rAF 轻推 CameraGroup 旋转
            window.__cursor = { x: 0, y: 0 };
            window.addEventListener('message', function (e) {
                try {
                    var d = e.data;
                    if (!d) return;
                    if (d.type === 'grass-cursor') { window.__cursor.x = d.x || 0; window.__cursor.y = d.y || 0; }
                    else if (d.type === 'grass-theme') { themeOverride = (d.mode === 'dark') ? 'dark' : 'light'; 同步主题(); }
                } catch (e2) {}
            });
            var MAX_Y = 0.025, MAX_X = 0.015;
            function parallaxLoop() {
                var cam = window.__experience && window.__experience.engine && window.__experience.engine.camera;
                if (cam && cam.group) {
                    var ty = window.__cursor.x * MAX_Y;
                    var tx = -window.__cursor.y * MAX_X;
                    cam.group.rotation.y += (ty - cam.group.rotation.y) * 0.05;
                    cam.group.rotation.x += (tx - cam.group.rotation.x) * 0.05;
                }
                requestAnimationFrame(parallaxLoop);
            }
            (function waitCam() {
                var ok = window.__experience && window.__experience.engine && window.__experience.engine.camera && window.__experience.engine.camera.group;
                if (ok) { parallaxLoop(); return; }
                setTimeout(waitCam, 200);
            })();
        })();
