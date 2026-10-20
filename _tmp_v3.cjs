
const pw = require('D:/xuanr/Desktop/玄锐暮工作区/个人简历/node_modules/playwright');
(async () => {
  const b = await pw.chromium.launch({ headless: true, args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto('http://127.0.0.1:8937/positioner.html', { waitUntil: 'domcontentloaded' });
  const dl = Date.now() + 180000;
  while (Date.now() < dl) {
    if (await p.evaluate(() => { const w = document.getElementById('frame').contentWindow; return !!(w && w.__wuMesh); })) break;
    await p.waitForTimeout(1500);
  }
  await p.waitForTimeout(4000);
  const d = await p.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    const ex = w.__experience;
    const mi = ex.engine.scene.getObjectByName('main-island');
    const u = mi.material.uniforms;
    const g = u.uGrassLightColor && u.uGrassLightColor.value;
    const out = { g: g ? [g.r, g.g, g.b] : null, li: u.lightIntensity ? u.lightIntensity.value : null };
    out.worldKeys = Object.keys(ex.world || {}).slice(0, 40);
    out.envKeys = Object.keys(ex.environment || {}).slice(0, 40);
    out.dcm = { phase: ex.dayCycleManager.phase, paused: ex.dayCycleManager.isPaused, auto: ex.dayCycleManager.isAutoCycling, night: ex.dayCycleManager.nightConfig };
    return out;
  });
  console.log('P ' + JSON.stringify(d).slice(0, 2000));
  const d2 = await p.evaluate(() => {
    const w = document.getElementById('frame').contentWindow;
    const ex = w.__experience;
    const mi = ex.engine.scene.getObjectByName('main-island');
    const u = mi.material.uniforms;
    const snap = () => { const g = u.uGrassLightColor.value; return [g.r, g.g, g.b, u.lightIntensity.value]; };
    const before = snap();
    const tries = [];
    const call = (n, f) => { try { f(); tries.push(n + ':ok'); } catch (e) { tries.push(n + ':' + String(e.message).slice(0, 40)); } };
    call('world.setTheme', () => ex.world.setTheme('night'));
    call('world.setTimeOfDay', () => ex.world.setTimeOfDay(0.0));
    call('env.setTheme', () => ex.environment.setTheme('night'));
    call('dcm.setPhase', () => ex.dayCycleManager.setPhase('night'));
    call('dcm.update', () => ex.dayCycleManager.update(1));
    return { before: before, after: snap(), tries: tries, worldKeys2: Object.getOwnPropertyNames(Object.getPrototypeOf(ex.world) || {}).slice(0, 30), envProto: Object.getOwnPropertyNames(Object.getPrototypeOf(ex.environment) || {}).slice(0, 30) };
  });
  console.log('T ' + JSON.stringify(d2).slice(0, 2000));
  await b.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
