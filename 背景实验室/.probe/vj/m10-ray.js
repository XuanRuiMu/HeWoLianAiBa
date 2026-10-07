// 用射线投射找出用户圈出位置的场景对象名
// 用法：node m10-ray.js <url> <out.json> <waitMs>
const { chromium } = require('playwright-core');
const fs = require('fs');
const url = process.argv[2] || 'http://127.0.0.1:8937/positioner.html';
const out = process.argv[3] || 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/背景实验室/.probe/m10-ray.json';
const waitMs = parseInt(process.argv[4] || '110000', 10);

(async () => {
  const exe = 'C:\\Users\\xuanr\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: exe,
    headless: true,
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

  // 用户圈出的三处中心（原图 1920×869 坐标）
  const pts = [
    { label: 'c1-树干', x: 770, y: 400 },
    { label: 'c1-叶冠', x: 770, y: 180 },
    { label: 'c2-小石', x: 890, y: 515 },
    { label: 'c3-长石', x: 1010, y: 590 }
  ];
  const data = await page.evaluate((pts) => {
    const w = document.getElementById('frame').contentWindow;
    const E = w.__experience, eng = E.engine;
    const cam = eng.camera.instance;
    const scene = (eng.scene && eng.scene.instance) || eng.scene;
    // 找 THREE
    const rc = E.engine.raycaster.raycaster;
    if (!rc) return { error: 'no engine.raycaster.raycaster' };
    scene.updateMatrixWorld(true);
    const results = [];
    for (const p of pts) {
      const ndcX = (p.x / window.innerWidth) * 2 - 1;
      const ndcY = -((p.y / window.innerHeight) * 2 - 1);
      rc.setFromCamera({ x: ndcX, y: ndcY }, cam);
      const hits = rc.intersectObjects(scene.children, true);
      const list = [];
      for (const h of hits.slice(0, 6)) {
        list.push({ name: h.object.name, type: h.object.type, dist: Math.round(h.distance * 100) / 100,
                    point: { x: Math.round(h.point.x*100)/100, y: Math.round(h.point.y*100)/100, z: Math.round(h.point.z*100)/100 },
                    parent: h.object.parent ? h.object.parent.name : null });
      }
      results.push({ label: p.label, hits: list });
    }
    return { results };
  }, pts);

  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
