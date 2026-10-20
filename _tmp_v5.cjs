
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
  await p.waitForTimeout(9000);
  const snap = async (tag) => {
    const d = await p.evaluate(() => {
      const w = document.getElementById('frame').contentWindow;
      const ex = w.__experience;
      const r = ex.engine.renderer.instance || ex.engine.renderer;
      let meshes = 0, vis = 0;
      ex.engine.scene.traverse(o => { if (o.isMesh || o.isInstancedMesh) { meshes++; if (o.visible) vis++; } });
      return { st: w.__wuSkyState(), mem: { g: r.info.memory.geometries, t: r.info.memory.textures, p: r.info.programs ? r.info.programs.length : -1 },
               calls: r.info.render.calls, tris: r.info.render.triangles, meshes: meshes, vis: vis };
    });
    console.log(tag + ' ' + JSON.stringify(d));
    return d;
  };
  await p.click('#btnDist');
  await p.waitForTimeout(2500);
  await snap('HIDE');
  await p.screenshot({ path: OUT + '/h_hidden.png' });
  await p.click('#btnDist');
  await p.waitForTimeout(2500);
  await snap('SHOW');
  await p.screenshot({ path: OUT + '/h_shown.png' });
  await p.click('#btnDist');
  await p.waitForTimeout(2500);
  const before = await snap('BEFORE_DEL');
  await p.click('#btnDistDel');
  await p.waitForTimeout(3500);
  const after = await snap('AFTER_DEL');
  await p.screenshot({ path: OUT + '/h_deleted.png' });
  const dl2 = document;
  const r = await p.evaluate(() => window.__wuSkyPurged || null);
  console.log('PURGED ' + JSON.stringify(r));
  console.log('MEMDELTA g=' + (before.mem.g - after.mem.g) + ' t=' + (before.mem.t - after.mem.t) + ' tris=' + (before.tris - after.tris));
  console.log('ERRS ' + JSON.stringify(errs.slice(0, 6)));
  await b.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
