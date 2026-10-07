// 枚举原生树与原石头的世界坐标 + NDC 投影（按用户当前相机），用于匹配用户标出的三处。
// 用法：node reset-enum.cjs <url> <out.json> <waitMs>
const { chromium } = require('playwright-core');
const fs = require('fs');
const url = process.argv[2] || 'http://127.0.0.1:8937/positioner.html';
const out = process.argv[3] || 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/背景实验室/.probe/reset-enum.json';
const waitMs = parseInt(process.argv[4] || '110000', 10);

(async () => {
  const exe = 'C:\\Users\\xuanr\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: exe,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=swiftshader']
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('console', msg => console.log('[browser:' + msg.type() + ']', msg.text().slice(0, 200)));
  page.on('pageerror', err => console.log('[browser:pageerror]', err.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(waitMs);

  // 模拟用户当前的相机：Y=4.17 D=14.24 P=-20.0° A=5.3°
  await page.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    w.__camSetFrozen(false, true);
    w.__setCam({ y: 4.17, dist: 14.24, pitch: -20.0, yaw: 5.3 });
  });
  await page.waitForTimeout(3000); // 等相机稳定

  // 枚举原生树与石头
  const data = await page.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    const E = w.__experience, eng = E.engine;
    const cam = eng.camera.instance;
    const scene = (eng.scene && eng.scene.instance) || eng.scene;
    const camWorldPos = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    const proj = cam.projectionMatrix;
    const view = cam.matrixWorldInverse;

    function projectToNDC(wx, wy, wz) {
      const x = wx, y = wy, z = wz, w = 1;
      // view * worldPos
      const v4 = {
        x: view.elements[0]*x + view.elements[4]*y + view.elements[8]*z + view.elements[12],
        y: view.elements[1]*x + view.elements[5]*y + view.elements[9]*z + view.elements[13],
        z: view.elements[2]*x + view.elements[6]*y + view.elements[10]*z + view.elements[14],
        w: view.elements[3]*x + view.elements[7]*y + view.elements[11]*z + view.elements[15]
      };
      // proj * viewPos
      const p4 = {
        x: proj.elements[0]*v4.x + proj.elements[4]*v4.y + proj.elements[8]*v4.z + proj.elements[12]*v4.w,
        y: proj.elements[1]*v4.x + proj.elements[5]*v4.y + proj.elements[9]*v4.z + proj.elements[13]*v4.w,
        z: proj.elements[2]*v4.x + proj.elements[6]*v4.y + proj.elements[10]*v4.z + proj.elements[14]*v4.w,
        w: proj.elements[3]*v4.x + proj.elements[7]*v4.y + proj.elements[11]*v4.z + proj.elements[15]*v4.w
      };
      if (p4.w === 0) return null;
      return { x: p4.x / p4.w, y: p4.y / p4.w, z: p4.z / p4.w };
    }
    function toScreen(ndc, W, H) {
      return { sx: (ndc.x + 1) / 2 * W, sy: (1 - ndc.y) / 2 * H };
    }

    const trees = [], rocks = [];
    scene.updateMatrixWorld(true);

    scene.traverse(o => {
      if (!o.name) return;
      // 树：包含 pl-leaves-N、tree-mesh、pl-tree 等关键词
      const n = o.name;
      if (/pl-leaves|pl-tree|pl-trunk|tree-|pl_/i.test(n) ||
          /^[A-Za-z]+\d+$/.test(n) && /tree/i.test(n)) {
        // 取世界位置
        let wp;
        if (o.isInstancedMesh && o.count > 0) {
          // 取首个实例的世界位置作为参考
          const m = o.matrix.constructor;
          const im = new m();
          o.getMatrixAt(0, im);
          const worldM = new m();
          o.matrixWorld.multiply(im);
          wp = { x: o.matrixWorld.elements[12], y: o.matrixWorld.elements[13], z: o.matrixWorld.elements[14] };
          // 还原（不能直接赋值回 getMatrixAt 用的 im）
        } else {
          wp = { x: o.matrixWorld.elements[12], y: o.matrixWorld.elements[13], z: o.matrixWorld.elements[14] };
        }
        const ndc = projectToNDC(wp.x, wp.y, wp.z);
        const W = window.innerWidth, H = window.innerHeight;
        trees.push({ name: n, wp, ndc, screen: ndc ? toScreen(ndc, W, H) : null, kind: o.isInstancedMesh ? 'instanced:'+o.count : 'mesh' });
      }
      // 石头：basalt-floating-rock*
      if (/floating-rock|basalt/i.test(n)) {
        const wp = { x: o.matrixWorld.elements[12], y: o.matrixWorld.elements[13], z: o.matrixWorld.elements[14] };
        const ndc = projectToNDC(wp.x, wp.y, wp.z);
        const W = window.innerWidth, H = window.innerHeight;
        rocks.push({ name: n, wp, ndc, screen: ndc ? toScreen(ndc, W, H) : null });
      }
    });

    return {
      cam: camWorldPos,
      camMatrix: { px: cam.position.x, py: cam.position.y, pz: cam.position.z,
                   qx: cam.quaternion.x, qy: cam.quaternion.y, qz: cam.quaternion.z, qw: cam.quaternion.w },
      treesCount: trees.length,
      rocksCount: rocks.length,
      trees: trees.slice(0, 80), // 截前 80 个
      rocks: rocks.slice(0, 50)
    };
  });

  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log('written', out);
  console.log('treesCount:', data.treesCount, 'rocksCount:', data.rocksCount);
  await browser.close();
  console.log('done');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
