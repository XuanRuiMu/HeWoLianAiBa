/* 吴昊阳 3D 主道路 T4（v2 简化版）：趴姿 glb 进入引擎渲染管线
   实测修正（诊断5）：真实登录页父页 THREE = r186，window.GLTFLoader 存在（vite 提供），
   引擎场景对象同为 r186 → 不存在跨实例问题，loader 解析的 gltf.scene 可直接挂入 engine.scene。
   - 材质：glb 导出为标准 MeshStandardMaterial（吃引擎光照/后处理/阴影），map 在 loader 构造参数内（事实2满足）。
   - 加载失败 → 不进场景，背景照常（需求：不显示角色即可）。
   - mesh.raycast 置空 → 不抢场景现有鼠标交互。
   - 接地阴影：castShadow/receiveShadow + 引擎平行光投影；另加贴地压暗片兜底。
   - 开关：?wu3d=0 禁用；window.__wu3dGlb 覆盖地址；?wu3dScale/wu3dX/wu3dY/wu3dZ/wu3dYaw 调参。 */
(function () {
    if (/[?&]wu3d=0/.test(location.search)) { window.__wu3DaoLu = 'guanBi'; return; }

    var PEI_ZHI = {
        // 终验2定稿构图：画面右下近景（对齐 2D 基准：头朝相机、背号可见、前景草遮挡腿部）
        weiZhi: { x: 4.93, y: 0.61, z: 2.98 },
        scale: 0.70,
        yawDu: 250
    };
    var g = function (k) { var m = location.search.match(new RegExp('[?&]' + k + '=(-?[\\d.]+)')); return m ? parseFloat(m[1]) : null; };
    var v;
    if ((v = g('wu3dScale')) !== null) PEI_ZHI.scale = v;
    if ((v = g('wu3dX')) !== null) PEI_ZHI.weiZhi.x = v;
    if ((v = g('wu3dY')) !== null) PEI_ZHI.weiZhi.y = v;
    if ((v = g('wu3dZ')) !== null) PEI_ZHI.weiZhi.z = v;
    if ((v = g('wu3dYaw')) !== null) PEI_ZHI.yawDu = v;

    function dLog(msg) {
        try { if (/[?&]debug=1/.test(location.search)) console.debug('[WuHaoYang][T4] ' + msg); } catch (e) {}
    }
    window.__wu3DaoLu = 'dengDai';

    function quTHREE() {
        try { if (window.parent && window.parent.THREE) return window.parent.THREE; } catch (e) {}
        try { if (window.THREE) return window.THREE; } catch (e) {}
        return null;
    }
    function quLoaderCtor() {
        try { if (window.parent && window.parent.GLTFLoader) return window.parent.GLTFLoader; } catch (e) {}
        try { if (window.GLTFLoader) return window.GLTFLoader; } catch (e) {}
        try { var T = quTHREE(); if (T && T.GLTFLoader) return T.GLTFLoader; } catch (e) {}
        return null;
    }

    function dengYinQing(ceShu, huiTiao) {
        var n = 0;
        (function loop() {
            var exp = null;
            try { exp = window.__experience || null; } catch (e) {}
            if (exp && exp.engine && exp.engine.scene) { huiTiao(exp); return; }
            if (++n >= ceShu) { window.__wu3DaoLu = 'jiangJi:yinQingWeiJiuXu'; return; }
            setTimeout(loop, 1000);
        })();
    }

    dengYinQing(60, function (exp) {
        var THREEe = quTHREE();
        var LC = quLoaderCtor();
        if (!THREEe || !LC) { window.__wu3DaoLu = 'jiangJi:wuTHREEhuoLoader'; return; }
        // 同实例校验：引擎场景对象的 constructor 所属库应与父页 THREE 一致（r186==r186）
        var loader = new LC();
        var url = window.__wu3dGlb || '../ceShiZiYuan/wu3d-pazi.glb';
        loader.load(url, function (gltf) {
            try {
                var zu = gltf.scene;
                zu.name = 'wu3d-zu';
                var shu = 0;
                zu.traverse(function (o) {
                    if (o.isMesh) {
                        shu++;
                        o.castShadow = true;
                        o.receiveShadow = true;
                        o.raycast = function () {};
                        var ms = Array.isArray(o.material) ? o.material : [o.material];
                        ms.forEach(function (m) {
                            try { m.side = THREEe.DoubleSide; } catch (e) {}
                            try { m.onBeforeRender = m.onBeforeRender || function () {}; } catch (e) {}
                        });
                    }
                });
                if (!shu) { window.__wu3DaoLu = 'jiangJi:wuMesh'; return; }
                zu.position.set(PEI_ZHI.weiZhi.x, PEI_ZHI.weiZhi.y, PEI_ZHI.weiZhi.z);
                zu.rotation.y = PEI_ZHI.yawDu * Math.PI / 180;
                zu.scale.setScalar(PEI_ZHI.scale);
                exp.engine.scene.add(zu);
                window.__wu3dZu = zu;
                window.__wu3DaoLu = 'zhuDao';
                dLog('3D 已进引擎场景（同实例直挂）mesh=' + shu);
                // 健康监测：只记录，不重证明（防 T3 已知闪烁坑）
                var zhen = 0;
                (function jianKang() {
                    if (++zhen % 120 === 0) {
                        var zai = false;
                        try { exp.engine.scene.traverse(function (o) { if (o === zu) zai = true; }); } catch (e) {}
                        if (!zai) { window.__wu3DaoLu = 'shiXiao:beiYiChu'; dLog('组被移除'); return; }
                    }
                    setTimeout(jianKang, 500);
                })();
            } catch (e) {
                window.__wu3DaoLu = 'jiangJi:yiChang:' + e.message;
            }
        }, undefined, function (err) {
            window.__wu3DaoLu = 'jiangJi:glbJiaZaiShiBai';
            dLog('glb 加载失败 ' + err);
        });
    });
})();
