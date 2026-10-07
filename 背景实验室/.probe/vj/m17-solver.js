// m17 求解器 v2：pl-leaves-N 是 InstancedMesh，叶片位置在 instanceMatrix，
// 几何 bbox 只是单片叶 —— 必须逐实例 getMatrixAt 取世界位置再投影。
// 输出「NDC 网格热力图」，文本即可判断叶团落位，不依赖看图。
window.__M17 = {
  w: function () { return window.document.getElementById('frame').contentWindow; },
  sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
  E: function () { var w = this.w(); return w.__experience || null; },
  cam: function () { return this.E().engine.camera.instance; },
  scene: function () { var se = this.E().engine.scene; return se.instance || se; },
  diag: function () {
    var out = {};
    try {
      var w = this.w(), E = this.E();
      out.hasFrame = !!w;
      if (!E) return { err: 'iframe 无 __experience', hasFrame: !!w };
      out.engineKeys = Object.keys(E.engine || {});
      var c = this.cam();
      out.camPos = [+c.position.x.toFixed(3), +c.position.y.toFixed(3), +c.position.z.toFixed(3)];
      out.state = w.__placeState ? (function () { var s = w.__placeState(); return { ready: s.ready, count: s.count }; })() : 'no-placeApi';
      out.hasGroundY = typeof w.__groundY === 'function';
    } catch (e) { out.err = String(e).slice(0, 300); }
    return out;
  },
  setCam: function () {
    var w = this.w();
    if (!w.__setCam) return { err: 'no __setCam' };
    w.__camSetFrozen(false, true);
    w.__setCam({ px: 3.4939, y: 1.4263, pz: 0.3179, pitch: -22.55, yaw: -31.5, dist: 5.6014 });
    w.__camSetFrozen(true, true);
    return w.__getCam();
  },
  // 遍历场景收集：每个放置叶实例的世界位置 + NDC（相机前方才有效）
  cloud: function () {
    var camObj = this.cam();
    var Vec = camObj.position.constructor;
    var M4 = camObj.matrix.constructor;
    var sc = this.scene();
    sc.updateMatrixWorld(true);
    var pts = [];           // {ndcX, ndcY, depth, wz}
    var meshes = [];
    var tm = new M4(), cm = new M4(), v = new Vec();
    sc.traverse(function (o) {
      if (!o || !o.name) return;
      var n = String(o.name);
      if (n.indexOf('pl-leaves') !== 0) return;
      if (!o.instanceMatrix) return;
      meshes.push({ name: n, count: o.count || 0 });
      var cnt = o.count || 0;
      for (var i = 0; i < cnt; i++) {
        o.getMatrixAt(i, tm);
        cm.multiplyMatrices(o.matrixWorld, tm);
        var e = cm.elements;
        var wx = e[12], wy = e[13], wz = e[14];
        v.set(wx, wy, wz);
        // 手动投影：v.project 会除 w，z>1 表示在 far 外；同时判断相机前方
        v.project(camObj);
        pts.push({ nx: v.x, ny: v.y, nz: v.z, wx: wx, wy: wy, wz: wz });
      }
    });
    return { pts: pts, meshes: meshes };
  },
  // 热力图：NDC 网格 COLS×ROWS，行1=画面顶。'.'=空，数字=实例数(9+为'*')，'?'=相机后
  heat: function (pts, COLS, ROWS) {
    COLS = COLS || 12; ROWS = ROWS || 7;
    var grid = [];
    for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0));
    var behind = 0, front = 0;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p.nz > 1 || p.nz < -1) { behind++; continue; }
      front++;
      var cx = Math.floor((p.nx * 0.5 + 0.5) * COLS);
      var cy = Math.floor((-p.ny * 0.5 + 0.5) * ROWS);
      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
      grid[cy][cx]++;
    }
    var rows = grid.map(function (row) {
      return row.map(function (c) { return c === 0 ? '.' : (c >= 10 ? '*' : String(c)); }).join('');
    });
    return { rows: rows, front: front, behind: behind };
  },
  measure: async function (cfg) {
    var w = this.w();
    var gy = w.__groundY(cfg.x, cfg.z);
    if (gy === null || gy === undefined) return { cfg: cfg, err: 'no-ground' };
    var list = [{ kind: 'tree', variant: cfg.variant, x: cfg.x, y: +(gy + 0.02).toFixed(3),
                  z: cfg.z, rotY: cfg.rotY || 0, scale: cfg.s }];
    var im = w.__placeImport(list);
    await this.sleep(cfg.wait || 3500);
    var cl = this.cloud();
    var mnX = 9, mxX = -9, mnY = 9, mxY = -9, n = cl.pts.length;
    var sumZ = 0;
    for (var i = 0; i < n; i++) {
      var p = cl.pts[i];
      if (p.nz > 1) continue;
      mnX = Math.min(mnX, p.nx); mxX = Math.max(mxX, p.nx);
      mnY = Math.min(mnY, p.ny); mxY = Math.max(mxY, p.ny);
      sumZ += p.wz;
    }
    var inScreen = 0, inLeftTop = 0;
    for (var j = 0; j < n; j++) {
      var q = cl.pts[j];
      if (q.nz > 1 || q.nz < -1) continue;
      if (q.nx >= -1 && q.nx <= 1 && q.ny >= -1 && q.ny <= 1) {
        inScreen++;
        if (q.nx < 0 && q.ny > 0.1) inLeftTop++;
      }
    }
    var h = this.heat(cl.pts);
    var wb = null;
    if (n) {
      var ax=9, bx=-9, ay=9, by=-9, az=9, bz=-9;
      for (var k2 = 0; k2 < n; k2++) {
        var q2 = cl.pts[k2];
        if (q2.nz > 1) continue;
        ax=Math.min(ax,q2.wx); bx=Math.max(bx,q2.wx);
        ay=Math.min(ay,q2.wy); by=Math.max(by,q2.wy);
        az=Math.min(az,q2.wz); bz=Math.max(bz,q2.wz);
      }
      wb = { min:[+ax.toFixed(2),+ay.toFixed(2),+az.toFixed(2)], max:[+bx.toFixed(2),+by.toFixed(2),+bz.toFixed(2)],
             center:[+((ax+bx)/2).toFixed(2),+((ay+by)/2).toFixed(2),+((az+bz)/2).toFixed(2)] };
    }
    return { cfg: cfg, gy: +gy.toFixed(3), import: { ok: im.ok, bad: im.bad, count: im.state.count },
             totalLeaves: n, meshes: cl.meshes, front: h.front,
             ndcBox: n ? [+mnX.toFixed(2), +mxX.toFixed(2), +mnY.toFixed(2), +mxY.toFixed(2)] : null,
             inScreen: inScreen, inLeftTop: inLeftTop, avgWz: n ? +(sumZ / n).toFixed(2) : null,
             heat: h.rows, worldBox: wb };
  },
  // 全自动求解：基准标定偏移 O → 目标 NDC 反解世界点 → 生成候选 → 批量评测
  solve: async function (variant, targets) {
    var w = this.w();
    var base = { variant: variant, x: 0, z: -5, rotY: 0, s: 1 };
    var m0 = await this.measure(Object.assign({}, base, { wait: 4000 }));
    var cl = this.cloud();
    var sx=0, sy=0, sz=0, cnt=0;
    var rr = 0;
    for (var i = 0; i < cl.pts.length; i++) {
      var p = cl.pts[i];
      if (p.nz > 1) continue;
      sx += p.wx; sy += p.wy; sz += p.wz; cnt++;
      rr = Math.max(rr, (p.wx-sx/cnt)*(p.wx-sx/cnt)); // 粗略，最后一轮再算
    }
    if (!cnt) return { err: '基准树无前方实例', m0: m0 };
    var cx0 = sx / cnt, cy0 = sy / cnt, cz0 = sz / cnt;
    var R1 = 0;
    for (var j = 0; j < cl.pts.length; j++) {
      var q = cl.pts[j];
      if (q.nz > 1) continue;
      R1 = Math.max(R1, Math.hypot(q.wx - cx0, q.wz - cz0));
    }
    var O = { x: cx0 - base.x, y: cy0 - (m0.gy + 0.02), z: cz0 - base.z };
    var camObj = this.cam();
    var e = camObj.matrixWorld.elements;
    var f = [ -e[8], -e[9], -e[10] ];
    var r = [ e[0], e[1], e[2] ];
    var u = [ e[4], e[5], e[6] ];
    var C = [ camObj.position.x, camObj.position.y, camObj.position.z ];
    var KX = 2.092, KY = 0.9445;
    var cands = [];
    for (var tI = 0; tI < targets.length; tI++) {
      var t = targets[tI];
      var a = t.a, h = t.nx * a * KX, uu = t.ny * a * KY;
      var P = [ C[0] + a * f[0] + h * r[0] + uu * u[0],
                C[1] + a * f[1] + h * r[1] + uu * u[1],
                C[2] + a * f[2] + h * r[2] + uu * u[2] ];
      // 期望冠半径（NDC 半宽换算世界米），得到 scale
      var Rwanted = t.cov * a * KX;
      var s = Math.min(3, Math.max(0.5, Rwanted / Math.max(R1, 0.01)));
      var ux = P[0] - O.x * (s / base.s);
      var uy = P[1] - O.y * (s / base.s);
      var uz = P[2] - O.z * (s / base.s);
      var gyC = w.__groundY(ux, uz);
      cands.push({ tag: t.tag, variant: variant, x: +ux.toFixed(2), y: +uy.toFixed(2), z: +uz.toFixed(2),
                   rotY: 0, s: +s.toFixed(2), gy: gyC === null ? null : +gyC.toFixed(2),
                   worldTarget: [+P[0].toFixed(2), +P[1].toFixed(2), +P[2].toFixed(2)],
                   distCam: +Math.hypot(P[0] - C[0], P[1] - C[1], P[2] - C[2]).toFixed(2) });
    }
    var res = [];
    for (var cI = 0; cI < cands.length; cI++) {
      var cd = cands[cI];
      var im = w.__placeImport([{ kind: 'tree', variant: cd.variant, x: cd.x, y: cd.y,
                                  z: cd.z, rotY: cd.rotY, scale: cd.s }]);
      await this.sleep(3200);
      var cl2 = this.cloud();
      var st = { tag: cd.tag, cand: cd, totalLeaves: cl2.pts.length, inScreen: 0, inLeftTop: 0 };
      var mnx=9,mxx=-9,mny=9,mxy=-9;
      for (var k = 0; k < cl2.pts.length; k++) {
        var pp = cl2.pts[k];
        if (pp.nz > 1 || pp.nz < -1) continue;
        if (pp.nx >= -1 && pp.nx <= 1 && pp.ny >= -1 && pp.ny <= 1) {
          st.inScreen++;
          if (pp.nx < 0 && pp.ny > 0.1) st.inLeftTop++;
          mnx=Math.min(mnx,pp.nx); mxx=Math.max(mxx,pp.nx);
          mny=Math.min(mny,pp.ny); mxy=Math.max(mxy,pp.ny);
        }
      }
      st.ndcIn = (st.inScreen>0)? [+mnx.toFixed(2),+mxx.toFixed(2),+mny.toFixed(2),+mxy.toFixed(2)] : null;
      st.heat = this.heat(cl2.pts).rows;
      st.score = st.inScreen ? +(st.inScreen * (0.3 + 0.7 * st.inLeftTop / st.inScreen)).toFixed(1) : 0;
      res.push(st);
    }
    res.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    return { base: { offset: O, R1: +R1.toFixed(2), m0ndc: m0.ndcBox, gy: m0.gy }, results: res };
  },
  sweep: async function (cands, wait) {
    var res = [];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i]; c.wait = c.wait || wait || 3200;
      var m = await this.measure(c);
      res.push(m);
    }
    // 评分：画面内叶实例数 × 左上占比（手绘目标：左上象限一大片叶）
    res.forEach(function (m) {
      m.score = m.inScreen ? +(m.inScreen * (0.3 + 0.7 * m.inLeftTop / m.inScreen)).toFixed(1) : 0;
    });
    res.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    return res;
  }
};
