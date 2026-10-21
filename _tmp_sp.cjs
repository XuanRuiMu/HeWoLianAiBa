
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
  let ok = false; const dl = Date.now() + 170000;
  while (Date.now() < dl) {
    ok = await p.evaluate(() => { const w = document.getElementById('frame') && document.getElementById('frame').contentWindow; return !!(w && w.__bareDiag && w.__wuSkyState); });
    if (ok) break;
    await p.waitForTimeout(2000);
  }
  await p.waitForTimeout(6000);
  await p.click('#btnTheme');
  await p.waitForTimeout(12000);
  const info = await p.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    const sc = w.__experience.engine.scene;
    let found = null;
    sc.traverse(o => { if (o && o.material && o.material.uniforms && o.material.uniforms.uWuAur) found = o; });
    if (!found) return { found: false };
    window.__skyM = found;
    found.material.uniforms.uWuInt.value = 0;
    return { found: true, name: found.name, scale: found.scale.x, vis: found.visible, order: found.renderOrder };
  });
  console.log('MESH ' + JSON.stringify(info));
  await p.waitForTimeout(3000);
  await p.screenshot({ path: OUT + '/s_stars.png' });
  await p.evaluate(() => { window.__skyM.visible = false; });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/s_none.png' });
  await p.evaluate(() => { window.__skyM.visible = true; window.__skyM.material.uniforms.uWuInt.value = 1; });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/s_all.png' });
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 4)));
  await b.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
