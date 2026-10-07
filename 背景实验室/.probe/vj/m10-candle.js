// 候选对象可见性烘焙测试：逐个隐藏候选组，截图确认
const { chromium } = require('playwright-core');
const fs = require('fs');
const url = process.argv[2] || 'http://127.0.0.1:8937/positioner.html';
const waitMs = parseInt(process.argv[3] || '110000', 10);
const outDir = 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/背景实验室/.probe';

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
  await page.screenshot({ path: outDir + '/m10-candle-0-baseline.png' });

  const candidates = ['tree-main', 'bushes001', 'crystals', 'floating-rocks', 'basalt-main-old', 'basalt-top-old', 'islands'];
  for (let i = 0; i < candidates.length; i++) {
    const name = candidates[i];
    await page.evaluate((name) => {
      const w = document.getElementById('frame').contentWindow;
      const E = w.__experience, eng = E.engine;
      const scene = (eng.scene && eng.scene.instance) || eng.scene;
      const rend = eng.renderer.instance;
      // 保存原 hook
      window.__restoreVis = [];
      scene.traverse(o => { if (o.name === name) window.__restoreVis.push([o, o.visible]); });
      // 每帧重申隐藏（引擎 culling 会重写 visible）
      if (!window.__origRender2) window.__origRender2 = rend.render;
      rend.render = function (sc, cm) {
        scene.traverse(o => { if (o.name === name) o.visible = false; });
        return window.__origRender2.call(this, sc, cm);
      };
    }, name);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: outDir + '/m10-candle-' + (i + 1) + '-no-' + name + '.png' });
    await page.evaluate((name) => {
      const w = document.getElementById('frame').contentWindow;
      const E = w.__experience, eng = E.engine;
      const rend = eng.renderer.instance;
      rend.render = window.__origRender2;
      const scene = (eng.scene && eng.scene.instance) || eng.scene;
      (window.__restoreVis || []).forEach(([o, v]) => { o.visible = v; });
      const t = window.__restoreVis; window.__restoreVis = [];
    }, name);
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: outDir + '/m10-candle-9-restored.png' });
  await browser.close();
  console.log('done');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
