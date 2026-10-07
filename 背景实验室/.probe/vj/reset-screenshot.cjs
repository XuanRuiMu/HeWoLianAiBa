// 直接调 playwright-core，跳过 agent-browser daemon。
// 用法：node screenshot-reset.cjs <url> <out.png> <waitMs>
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://127.0.0.1:8937/positioner.html';
const out = process.argv[3] || 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/背景实验室/.probe/reset-A-init.png';
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
  console.log('navigating', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('navigated; waiting', waitMs, 'ms for engine init...');
  await page.waitForTimeout(waitMs);
  console.log('screenshotting ->', out);
  await page.screenshot({ path: out, fullPage: false });
  const probe = await page.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    if (!w || !w.__camState) return { err: 'no __camState' };
    const s = w.__camState;
    const cam = w.__getCam ? w.__getCam() : null;
    const place = w.__placeState ? w.__placeState() : null;
    return {
      frozen: w.__camFrozen ? w.__camFrozen() : 'noApi',
      treesVisible: s.treesVisible,
      props: s.props,
      cam: cam ? { px: +cam.px.toFixed(3), py: +cam.py.toFixed(3), pz: +cam.pz.toFixed(3),
                  d: +cam.d.toFixed(3), p: +cam.p.toFixed(2), a: +cam.a.toFixed(2) } : null,
      place: place ? { count: place.count, ready: place.ready } : null
    };
  });
  console.log('probe:', JSON.stringify(probe, null, 2));
  await browser.close();
  console.log('done');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
