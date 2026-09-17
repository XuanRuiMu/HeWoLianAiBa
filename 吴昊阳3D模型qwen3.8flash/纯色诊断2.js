/* FP-03 纯色诊断探针 v2：定位"对象进场景但无像素"的根因
   全部放在相机注视锚点(3.24,0.161,2.77)正前方，逐项开关变量：
   P1 红 = 引擎basic + fc=false + 手动boundingSphere + 挂scene
   P2 绿 = P1 + 挂 main-island 的父组
   P3 蓝 = P1 + 图层mask复制 main-island
   P4 黄 = P1 + toneMapped=false + depthTest=false
   结果写 window.__probe2 */
(function () {
    var exp = window.__experience;
    if (!exp || !exp.engine || !exp.engine.scene) { window.__probe2 = { err: "noExp" }; return; }
    var eng = exp.engine;
    var scene = eng.scene;

    var geoCtor, attrCtor, indexCtor, meshCtor, basicCtor, island = null;
    scene.traverse(function (o) {
        if (o.name === "main-island") island = o;
        if (o.isMesh && !o.isInstancedMesh) {
            if (!meshCtor) meshCtor = o.constructor;
            var g = o.geometry;
            if (g && !geoCtor) {
                geoCtor = g.constructor;
                var pa = g.attributes && g.attributes.position;
                if (pa && !attrCtor) attrCtor = pa.constructor;
                if (g.index && !indexCtor) indexCtor = g.index.constructor;
            }
            var m = Array.isArray(o.material) ? o.material[0] : o.material;
            if (m && m.type === "MeshBasicMaterial" && !basicCtor) basicCtor = m.constructor;
        }
    });
    var rm = exp.revealMesh && exp.revealMesh.mesh;
    var rmm = rm && (Array.isArray(rm.material) ? rm.material[0] : rm.material);
    var rmMatCtor = rmm && rmm.constructor;
    var MatC = basicCtor || rmMatCtor;
    window.__probe2 = { ctor: !!(meshCtor && geoCtor && attrCtor && MatC), island: !!island };
    if (!meshCtor || !geoCtor || !attrCtor || !MatC) { window.__probe2.err = "缺类"; return; }

    var ANCH = [3.24, 0.161, 2.77];

    function cubeGeo() {
        var pos = new Float32Array([-1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1, -1,-1,1, 1,-1,1, 1,1,1, -1,1,1]);
        var idx = [0,1,2,0,2,3, 5,4,7,5,7,6, 1,5,6,1,6,2, 4,0,3,4,3,7, 3,2,6,3,6,7, 4,5,1,4,1,0];
        var g = new geoCtor();
        g.setAttribute("position", new attrCtor(pos, 3));
        if (indexCtor) g.setIndex(new indexCtor(idx));
        try { g.computeBoundingSphere(); } catch (e) {}
        try { g.computeBoundingBox(); } catch (e) {}
        return g;
    }
    function make(color, tweak) {
        var m = new MatC({ color: color, side: 2 });
        try { m.onBeforeRender = m.onBeforeRender || function () {}; } catch (e) {}
        var mesh = new meshCtor(cubeGeo(), m);
        mesh.position.set(ANCH[0], ANCH[1] + 0.5, ANCH[2]);
        mesh.scale.setScalar(0.45);
        mesh.frustumCulled = false;
        if (island) mesh.renderOrder = island.renderOrder;
        tweak(mesh, m);
        mesh.raycast = function () {};
        return mesh;
    }
    var defs = [
        ["P1", 0xff2222, function (me) { me.name = "probe2-P1"; scene.add(me); }],
        ["P2", 0x22cc22, function (me) { me.name = "probe2-P2"; if (island && island.parent) island.parent.add(me); else scene.add(me); }],
        ["P3", 0x2255ff, function (me, ma) { me.name = "probe2-P3"; if (island) me.layers.mask = island.layers.mask; scene.add(me); }],
        ["P4", 0xffcc00, function (me, ma) { me.name = "probe2-P4"; try { ma.toneMapped = false; } catch (e) {} try { ma.depthTest = false; me.renderOrder = 999; } catch (e) {} scene.add(me); }],
    ];
    var placed = [];
    defs.forEach(function (d) {
        try {
            var me = make(d[1], d[2]);
            placed.push(me);
            window.__probe2[d[0]] = "ok";
        } catch (e) { window.__probe2[d[0]] = "err:" + e.message; }
    });
    window.__probe2Placed = placed;
    window.__probe2Done = true;
})();
