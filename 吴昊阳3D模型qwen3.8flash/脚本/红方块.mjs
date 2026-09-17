import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5173/login", { waitUntil: "load", timeout: 60000 });
let frame = null;
for (let i = 0; i < 30 && !frame; i++) { frame = page.frames().find(f => f.url().includes("grass-bg")); if (!frame) await page.waitForTimeout(1000); }
for (let i = 0; i < 40; i++) { const ok = await frame.evaluate(() => !!(window.__experience && window.__experience.engine && window.__experience.engine.scene)).catch(() => false); if (ok) break; await page.waitForTimeout(1000); }
await page.waitForTimeout(5000);
const r = await frame.evaluate(() => {
  const out = {};
  const exp = window.__experience;
  const scene = exp.engine.scene;
  // 杀 T3（贴图注入路径直接返回）
  try { window.__wuYiXiaoHui = true; out.t3Kill = true; } catch (e) {}
  // 反构引擎类
  let meshCtor = null, geoCtor = null, attrCtor = null, indexCtor = null, basicCtor = null;
  scene.traverse(o => {
    if (o.isMesh && !o.isInstancedMesh) {
      if (!meshCtor) meshCtor = o.constructor;
      const g = o.geometry;
      if (g && !geoCtor) {
        geoCtor = g.constructor;
        if (g.attributes && g.attributes.position) attrCtor = g.attributes.position.constructor;
        if (g.index) indexCtor = g.index.constructor;
      }
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(m => { if (m && m.type === "MeshBasicMaterial" && !basicCtor) basicCtor = m.constructor; });
    }
  });
  out.ctors = [!!meshCtor, !!geoCtor, !!attrCtor, !!basicCtor];
  if (!meshCtor || !geoCtor || !attrCtor) { out.err = "反构失败"; return out; }
  // 巨型红方块 @ 锚点
  const pos = new Float32Array([-1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1, -1,-1,1, 1,-1,1, 1,1,1, -1,1,1]);
  const idx = [0,1,2,0,2,3, 5,4,7,5,7,6, 1,5,6,1,6,2, 4,0,3,4,3,7, 3,2,6,3,6,7, 4,5,1,4,1,0];
  const geo = new geoCtor();
  geo.setAttribute("position", new attrCtor(pos, 3));
  if (indexCtor) geo.setIndex(new indexCtor(idx));
  const mat = new (basicCtor || meshCtor.prototype.constructor)({ color: 0xff0000, side: 2 });
  const cube = new meshCtor(geo, mat);
  cube.name = "probe-red";
  cube.position.set(3.24, 1.2, 2.77);
  cube.scale.setScalar(1.6);
  cube.frustumCulled = false;
  cube.raycast = function(){};
  scene.add(cube);
  window.__probeCube = cube;
  out.added = true;
  const cam = exp.engine.camera.instance || exp.engine.camera;
  const v = cube.position.clone().project(cam);
  out.ndc = [+v.x.toFixed(2), +v.y.toFixed(2)];
  return out;
});
await page.waitForTimeout(6000);
await page.screenshot({ path: "证据/FP-03-红方块.png" });
console.log(JSON.stringify(r, null, 1));
await browser.close();
