/* FP-03 纯色诊断探针：注入 4 个不同类组合的方块，定位引擎可渲染路径
   D1 红=revealMesh几何clone + 反构basic
   D2 绿=重建BufferGeometry + 反构basic
   D3 蓝=重建BufferGeometry + 反构basic + 父页Texture纯色图
   D4 黄=重建BufferGeometry + revealMesh材质构造器
   结果写 window.__probe */
(function () {
    var exp = window.__experience;
    if (!exp || !exp.engine || !exp.engine.scene) { window.__probe = { err: "noExp" }; return; }
    var cam = exp.engine.camera && (exp.engine.camera.instance || exp.engine.camera);
    var geoCtor, attrCtor, indexCtor, meshCtor, basicCtor;
    exp.engine.scene.traverse(function (o) {
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
    var rmGeo = rm && rm.geometry;
    var rmm = rm && (Array.isArray(rm.material) ? rm.material[0] : rm.material);
    var rmMatCtor = rmm && rmm.constructor;
    window.__probe = {
        geoCtor: !!geoCtor, attrCtor: !!attrCtor, indexCtor: !!indexCtor,
        meshCtor: !!meshCtor, basicCtor: !!basicCtor, rmGeo: !!rmGeo, rmMatCtor: !!rmMatCtor,
        camPos: cam && cam.position && cam.position.toArray(),
    };
    if (!meshCtor || !geoCtor || !attrCtor) { window.__probe.err = "缺核心类"; return; }
    var MatC = basicCtor || rmMatCtor;
    if (!MatC) { window.__probe.err = "无材质类"; return; }

    function cubeGeo() {
        var pos = new Float32Array([-1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1, -1,-1,1, 1,-1,1, 1,1,1, -1,1,1]);
        var idx = [0,1,2,0,2,3, 5,4,7,5,7,6, 1,5,6,1,6,2, 4,0,3,4,3,7, 3,2,6,3,6,7, 4,5,1,4,1,0];
        var g = new geoCtor();
        g.setAttribute("position", new attrCtor(pos, 3));
        if (indexCtor) g.setIndex(new indexCtor(idx));
        return g;
    }
    function solid(C, color) {
        var m = new C({ color: color, side: 2 });
        try { m.onBeforeRender = m.onBeforeRender || function () {}; } catch (e) {}
        return m;
    }
    function texSolid(C) {
        var cv = document.createElement("canvas"); cv.width = cv.height = 8;
        var cx = cv.getContext("2d"); cx.fillStyle = "#3355ff"; cx.fillRect(0, 0, 8, 8);
        var T = window.parent && window.parent.THREE;
        var t = T && T.Texture ? new T.Texture(cv) : null;
        if (t) { t.needsUpdate = true; try { t.flipY = true; } catch (e) {} }
        var m = new C({ color: 0xffffff, side: 2, map: t });
        try { m.onBeforeRender = m.onBeforeRender || function () {}; } catch (e) {}
        return m;
    }

    var dir = new window.THREE.Vector3(); cam.getWorldDirection(dir);
    var el = cam.matrixWorld.elements;
    var right = new window.THREE.Vector3(el[0], el[1], el[2]).normalize();
    var up = new window.THREE.Vector3(el[4], el[5], el[6]).normalize();
    var center = cam.position.clone().add(dir.clone().multiplyScalar(7));
    var defs = [
        { geo: rmGeo ? rmGeo.clone() : null, mat: solid(MatC, 0xff2222), off: -2.2, tag: "D1" },
        { geo: cubeGeo(), mat: solid(MatC, 0x22cc22), off: -0.7, tag: "D2" },
        { geo: cubeGeo(), mat: texSolid(MatC), off: 0.8, tag: "D3" },
        { geo: cubeGeo(), mat: solid(rmMatCtor || MatC, 0xffcc00), off: 2.3, tag: "D4" },
    ];
    var zu = exp.engine.scene;
    var added = [];
    defs.forEach(function (d) {
        if (!d.geo) { window.__probe[d.tag] = "noGeo"; return; }
        try {
            var mesh = new meshCtor(d.geo, d.mat);
            var p = center.clone().add(right.clone().multiplyScalar(d.off * 1.6)).add(up.clone().multiplyScalar(0.3));
            mesh.position.copy(p);
            mesh.scale.setScalar(0.5);
            mesh.name = "probe-" + d.tag;
            mesh.raycast = function () {};
            zu.add(mesh);
            added.push(mesh);
            window.__probe[d.tag] = "ok@" + p.toArray().map(function (v) { return +v.toFixed(1); }).join(",");
        } catch (e) { window.__probe[d.tag] = "err:" + e.message; }
    });
    window.__probeAdded = added;
    window.__probeDone = true;
})();
