
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
  while (Date.now() < dl) {
    if (await p.evaluate(() => { const w = document.getElementById('frame').contentWindow; return !!(w && w.__wuSkyState && w.__wuSkyState().mesh); })) break;
    await p.waitForTimeout(1500);
  }
  await p.waitForTimeout(8000);
  const day = await p.evaluate(() => document.getElementById('frame').contentWindow.__wuSkyState());
  console.log('DAY ' + JSON.stringify(day));
  const nr = await p.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    const dcm = w.__experience.dayCycleManager;
    try { dcm.setPhase('night'); } catch (e) { try { dcm.togglePhase(); } catch (e2) { return 'ERR ' + String(e); } }
    return dcm.phase;
  });
  console.log('SET ' + JSON.stringify(nr));
  await p.waitForTimeout(5000);
  const night = await p.evaluate(() => document.getElementById('frame').contentWindow.__wuSkyState());
  console.log('NIGHT ' + JSON.stringify(night));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + '/n_on.png' });
  await p.click('#btnAurora');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + '/n_off.png' });
  await p.click('#btnAurora');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + '/n_on2.png' });
  const after = await p.evaluate(() => document.getElementById('frame').contentWindow.__wuSkyState());
  console.log('AFTER ' + JSON.stringify(after));
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
