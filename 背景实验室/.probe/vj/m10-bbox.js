// 返回每个 Mesh 的世界 AABB 屏幕投影范围，用于定位树干/暗斑的网格
const { chromium } = require('playwright-core');
const fs = require('fs');
const url = process.argv[2] || 'http://127.0.0.1:8937/positioner.html';
const out = process.argv[3] || 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/背景实验室/.probe/m10-bbox.json';
const waitMs = parseInt(process.argv[4] || '110000', 10);

(async () => {
  const exe = 'C:\\Users\\xuanr\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: exe, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=swiftshader']
  });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 869 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(waitMs);
  await page.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    w.__camSetFrozen(false, true);
    w.__setCam({ y: 4.17, dist: 14.24, pitch: -20.0, yaw: 5.3 });
  });
  await page.waitForTimeout(3000);
  const data = await page.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    const E = w.__experience, eng = E.engine;
    const cam = eng.camera.instance;
    const scene = (eng.scene && eng.scene.instance) || eng.scene;
    const proj = cam.projectionMatrix, view = cam.matrixWorldInverse;
    function project(wx, wy, wz) {
      const v = view.elements, p = proj.elements;
      const vx = v[0]*wx + v[4]*wy + v[8]*wz + v[12];
      const vy = v[1]*wx + v[5]*wy + v[9]*wz + v[13];
      const vz = v[2]*wx + v[6]*wy + v[10]*wz + v[14];
      const vw = v[3]*wx + v[7]*wy + v[11]*wz + v[15];
      const px = p[0]*vx + p[4]*vy + p[8]*vz + p[12]*vw;
      const py = p[1]*vx + p[5]*vy + p[9]*vz + p[13]*vw;
      const pz = p[2]*vx + p[6]*vy + p[10]*vz + p[14]*vw;
      const pw = p[3]*vx + p[7]*vy + p[11]*vz + p[15]*vw;
      if (pw === 0) return null;
      return { sx: (px/pw + 1) / 2 * window.innerWidth, sy: (1 - py/pw) / 2 * window.innerHeight };
    }
    const list = [];
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (!o.name || !o.geometry) return;
      try {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const b = o.geometry.boundingBox, m = o.matrixWorld.elements;
        const xs = [], ys = [];
        for (let xi = 0; xi < 2; xi++) for (let yi = 0; yi < 2; yi++) for (let zi = 0; zi < 2; zi++) {
          const cx = xi ? b.max.x : b.min.x, cy = yi ? b.max.y : b.min.y, cz = zi ? b.max.z : b.min.z;
          const wx = m[0]*cx + m[4]*cy + m[8]*cz + m[12];
          const wy = m[1]*cx + m[5]*cy + m[9]*cz + m[13];
          const wz = m[2]*cx + m[6]*cy + m[10]*cz + m[14];
          const s = project(wx, wy, wz);
          if (s) { xs.push(s.sx); ys.push(s.sy); }
        }
        if (!xs.length) return;
        list.push({ name: o.name, type: o.type, parent: o.parent ? o.parent.name : '',
                    minx: Math.min.apply(null, xs), maxx: Math.max.apply(null, xs),
                    miny: Math.min.apply(null, ys), maxy: Math.max.apply(null, ys),
                    vis: o.visible });
      } catch (e) { }
    });
    return { count: list.length, list };
  });
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log('count', data.count);
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
