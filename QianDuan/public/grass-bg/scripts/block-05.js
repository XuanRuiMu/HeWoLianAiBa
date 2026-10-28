
        /* 主题联动（深色=夜晚 / 浅色=白天）+ 草色 + 鼠标跟随视差：
           - 读取父页（同源）data-theme：dark(暗色) → 夜晚相位 + 夜草色；light(浅色) → 白天 + 金草。
             默认跟随用户设置（首次访问 data-theme=dark → 默认夜晚）。standalone 时退化为白天金草。
             同时监听父页 postMessage('grass-theme') 作为跨域兜底。
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

            // 草（含脚下土地）颜色
            function applyGrass(palette) {
                window.__grassOverride = palette;
                var mats = window.__grassMats;
                if (mats && mats.length) {
                    for (var i = 0; i < mats.length; i++) {
                        var u = mats[i].uniforms;
                        if (!u) continue;
                        if (u.uLightGreen && u.uLightGreen.value) u.uLightGreen.value.set(palette[0]);
                        if (u.uDarkGreen && u.uDarkGreen.value) u.uDarkGreen.value.set(palette[1]);
                        if (u.uLightDirt && u.uLightDirt.value) u.uLightDirt.value.set(palette[2]);
                        if (u.uDarkDirt && u.uDarkDirt.value) u.uDarkDirt.value.set(palette[3]);
                    }
                }
            }

            // 远处地形地面（DistantTerrainGround）拥有独立颜色 uniform，
            // nightConfig 不会改它，故深色模式下草变紫、远处地面仍停在白天金（黄）。
            // 这里把地形颜色 uniform 一并压成主题色；首次记录白天金以便浅色还原。
            var terrainCaptured = null;
            var TERRAIN_KEYS = ['uGrassColor', 'uGrassColorAlt', 'uDirtColor', 'uRockColor', 'uWaterColor', 'uSnowColor'];
            function applyTerrain(theme, palette) {
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
                        if (!u.uGrassColor) continue; // 仅处理远处地形地面材质
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
                                // 紫草配色映射到地形：草->浅紫, 草Alt->中紫, 泥->深紫, 岩->更深紫
                                var purpleMap = { uGrassColor: palette[0], uGrassColorAlt: palette[1], uDirtColor: palette[2], uRockColor: palette[3], uWaterColor: '#2a1245', uSnowColor: '#c89be8' };
                                u[key2].value.set(purpleMap[key2] || palette[3]);
                            } else if (terrainCaptured[key2]) {
                                u[key2].value.copy(terrainCaptured[key2]);
                            }
                        }
                    }
                });
            }

            var subscribed = false;
            function syncTheme() {
                var theme = currentTheme();
                var d = window.__dcm;
                if (d && d.getPhase) {
                    if (!subscribed) {
                        try { d.on('phaseChanged', function () { setTimeout(syncTheme, 50); }); subscribed = true; } catch (e) {}
                    }
                    var want = phaseFor(theme);
                    if (d.getPhase() !== want) { try { d.setPhase(want); } catch (e) {} }
                }
                var palette = paletteFor(theme);
                applyGrass(palette);
                applyTerrain(theme, palette);
            }
            setInterval(syncTheme, 400); // 持续确保相位/草色/地形匹配主题，覆盖引擎自带的昼夜循环

            // 父页主题变化即时响应（避免轮询间隔内的短暂相位错位）
            try {
                var pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
                var pEl = pDoc && pDoc.documentElement;
                if (pEl && pEl.addEventListener) {
                    new MutationObserver(function () { syncTheme(); }).observe(pEl, { attributes: true, attributeFilter: ['data-theme'] });
                }
            } catch (e) {}

            // 鼠标跟随：接收父页转发的归一化光标(-1..1)，rAF 轻推 CameraGroup 旋转
            window.__cursor = { x: 0, y: 0 };
            window.addEventListener('message', function (e) {
                try {
                    var d = e.data;
                    if (!d) return;
                    if (d.type === 'grass-cursor') { window.__cursor.x = d.x || 0; window.__cursor.y = d.y || 0; }
                    else if (d.type === 'grass-theme') { themeOverride = (d.mode === 'dark') ? 'dark' : 'light'; }
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
    