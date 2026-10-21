
const pw = require('D:/xuanr/Desktop/玄锐暮工作区/个人简历/node_modules/playwright');
(async () => {
  const b = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 240)); });
  p.on('pageerror', e => errs.push('pageerror ' + String(e).slice(0, 240)));
  await p.goto('http://127.0.0.1:8941/grass-bg/grass-bg.html', { waitUntil: 'domcontentloaded' });
  let ok = false; const dl = Date.now() + 170000;
  while (Date.now() < dl) {
    ok = await p.evaluate(() => !!(window.__camReady && window.__bareDiag));
    if (ok) break;
    await p.waitForTimeout(2000);
  }
  await p.waitForTimeout(10000);
  const r = await p.evaluate(() => {
    const cm = window.__getCam ? window.__getCam() : null;
    const api = [];
    for (const k in window) { if (k.indexOf('__wu') === 0 || k.indexOf('__bare') === 0) api.push(k); }
    let wuObj = null;
    const sc = window.__experience.engine.scene;
    sc.traverse(o => { if (o && o.name && o.name.indexOf('wu') === 0) wuObj = o.name; });
    return {
      camReady: !!window.__camReady, err: window.__beiJingCuoWu || null,
      cam: cm ? { px: +cm.px.toFixed(3), py: +cm.py.toFixed(3), pz: +cm.pz.toFixed(3), d: +cm.d.toFixed(3), p: +cm.p.toFixed(2), a: +cm.a.toFixed(2) } : null,
      bare: window.__bareDiag || null,
      rect: window.__wuRectGet ? window.__wuRectGet() : null,
      sky: window.__wuSkyState ? window.__wuSkyState() : null,
      wuMesh: wuObj, api: api.slice(0, 30), starExtend: !!window.__wuStarExtend
    };
  });
  console.log('PORT ' + JSON.stringify(r).slice(0, 1600));
  await p.screenshot({ path: 'D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/_tmp_cmp/port_day.png' });
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
