
const pw = require('D:/xuanr/Desktop/玄锐暮工作区/个人简历/node_modules/playwright');
const fs = require('fs');
const OUT = process.argv[2];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  p.on('pageerror', e => errs.push('pageerror ' + String(e).slice(0, 300)));
  await p.goto('http://127.0.0.1:8937/positioner.html', { waitUntil: 'domcontentloaded' });
  const dl = Date.now() + 180000;
  let ok = false;
  while (Date.now() < dl) {
    ok = await p.evaluate(() => { const w = document.getElementById('frame').contentWindow; return !!(w && w.__wuMesh && w.__wuSkyState && w.__wuSkyState().mesh); });
    if (ok) break;
    await p.waitForTimeout(1500);
  }
  const d = await p.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    const ex = w.__experience;
    const dcm = ex.dayCycleManager;
    const proto = dcm ? Object.getOwnPropertyNames(Object.getPrototypeOf(dcm)) : null;
    return { st: w.__wuSkyState(), dcmKeys: dcm ? Object.keys(dcm) : null, dcmProto: proto,
      hasNoise: !!w.__wuSkyNoise, panel: !!document.getElementById('btnAurora') };
  });
  console.log('D ' + JSON.stringify(d).slice(0, 1800));
  console.log('ERRS1 ' + JSON.stringify(errs.slice(0, 4)));
  await b.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
