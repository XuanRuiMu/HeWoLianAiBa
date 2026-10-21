
const pw = require('D:/xuanr/Desktop/玄锐暮工作区/个人简历/node_modules/playwright');
const fs = require('fs');
const OUT = process.argv[2];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 400)); });
  p.on('pageerror', e => errs.push('pageerror ' + String(e).slice(0, 300)));
  await p.goto('http://127.0.0.1:8937/positioner.html', { waitUntil: 'domcontentloaded' });
  let ok = false; const dl = Date.now() + 170000;
  while (Date.now() < dl) {
    ok = await p.evaluate(() => { const w = document.getElementById('frame') && document.getElementById('frame').contentWindow; return !!(w && w.__bareDiag && w.__wuSkyState); });
    if (ok) break;
    await p.waitForTimeout(2000);
  }
  await p.waitForTimeout(16000);
  await p.screenshot({ path: OUT + '/a_day.png' });
  await p.click('#btnTheme');
  await p.waitForTimeout(11000);
  const st = await p.evaluate(() => { const w = document.getElementById('frame').contentWindow; return { sky: w.__wuSkyState(), err: w.__wuSkyErr || null }; });
  console.log('NIGHT ' + JSON.stringify(st).slice(0, 500));
  await p.screenshot({ path: OUT + '/a_night.png' });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + '/a_night2.png' });
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
