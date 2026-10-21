
const pw = require('D:/xuanr/Desktop/玄锐暮工作区/个人简历/node_modules/playwright');
(async () => {
  const b = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto('http://127.0.0.1:8941/grass-bg/grass-bg.html', { waitUntil: 'domcontentloaded' });
  let ok = false; const dl = Date.now() + 170000;
  while (Date.now() < dl) {
    ok = await p.evaluate(() => !!(window.__camReady && window.__bareDiag));
    if (ok) break;
    await p.waitForTimeout(2000);
  }
  await p.waitForTimeout(8000);
  const fps = await p.evaluate(function () {
    return new Promise(function (res) {
      var n = 0, t0 = performance.now();
      function tick() { n++; if (performance.now() - t0 < 2000) { requestAnimationFrame(tick); } else { res(Math.round(n / 2)); } }
      requestAnimationFrame(tick);
    });
  });
  const d = await p.evaluate(() => ({
    cam: window.__getCam(), err: window.__wuCamErr || null,
    canvas: (function(){ const c = window.__experience.engine.canvas; return { cw: c.clientWidth, ch: c.clientHeight, w: c.width, h: c.height }; })(),
    mesh: window.__wuMeshState ? window.__wuMeshState() : null,
    rect: window.__wuRectGet ? window.__wuRectGet() : null
  }));
  console.log('FPS ' + fps);
  console.log('DIAG ' + JSON.stringify(d).slice(0, 900));
  try { await p.screenshot({ path: 'D:/xuanr/Desktop/玄锐暮工作区/和我恋爱吧/_tmp_cmp/port_day.png', timeout: 90000 }); console.log('SHOT ok'); }
  catch (e) { console.log('SHOT fail ' + e.message.slice(0, 80)); }
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 4)));
  await b.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
