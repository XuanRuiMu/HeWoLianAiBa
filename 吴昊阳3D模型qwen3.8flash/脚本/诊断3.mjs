// 诊断3：定位引擎"真正被渲染的场景"与探针方块不可见的根因
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://127.0.0.1:5201/wu3d/test-shell.html", { waitUntil: "load", timeout: 60000 });
for (let i = 0; i < 40; i++) {
  const ok = await page.evaluate(() => { try { const iw = document.getElementById("bg").contentWindow; return !!(iw.__experience && iw.__experience.engine && iw.__experience.engine.scene); } catch (e) { return false; } });
  if (ok) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(4000);
const code = await (await import("node:fs/promises")).readFile(new URL("../纯色诊断.js", import.meta.url), "utf8");
await page.evaluate((c) => { try { document.getElementById("bg").contentWindow.eval(c); return "ok"; } catch (e) { return "err:" + e.message; } }, code);
await page.waitForTimeout(2000);

const r = await page.evaluate(() => {
  const iw = document.getElementById("bg").contentWindow;
  const exp = iw.__experience;
  const eng = exp.engine;
  const out = {};
  out.canvases = [...iw.document.querySelectorAll("canvas")].map(c => ({
    id: c.id, w: c.width, h: c.height,
    disp: getComputedStyle(c).display, vis: getComputedStyle(c).visibility,
    z: getComputedStyle(c).zIndex, op: getComputedStyle(c).opacity,
    rect: c.getBoundingClientRect().width + "x" + c.getBoundingClientRect().height,
  }));
  out.sceneChildren = eng.scene.children.length;
  out.engineKeys = Object.keys(eng).slice(0, 40);
  // 找后处理/渲染器
  try {
    out.hasPP = !!eng.postProcessing;
    if (eng.postProcessing) {
      out.ppKeys = Object.keys(eng.postProcessing).slice(0, 30);
      const passes = eng.postProcessing.passes || eng.postProcessing.renderPasses || (eng.postProcessing.composer && eng.postProcessing.composer.passes);
      if (passes) out.passScenes = passes.map(p => ({ type: p.constructor && p.constructor.name, same: p.scene === eng.scene }));
    }
  } catch (e) { out.ppErr = e.message; }
  try {
    out.hasRenderer = !!eng.renderer;
    if (eng.renderer) out.rendererCanvas = eng.renderer.domElement && (eng.renderer.domElement.id || eng.renderer.domElement.tagName + ":" + eng.renderer.domElement.width);
  } catch (e) {}
  // 探针方块与T3平面状态
  const found = [];
  eng.scene.traverse(o => {
    if (o.name && (o.name.startsWith("probe-") || o.name === "__wu_zhujue_plane__" || o.name === "main-island")) {
      found.push({
        name: o.name, vis: o.visible, fc: o.frustumCulled, layer: o.layers.mask,
        parent: o.parent ? (o.parent.name || o.parent.type) : null,
        matVis: o.material ? o.material.visible : null,
        bs: o.geometry && o.geometry.boundingSphere ? +o.geometry.boundingSphere.radius.toFixed(2) : null,
      });
    }
  });
  out.found = found;
  try { out.camLayer = (eng.camera.instance || eng.camera).layers.mask; } catch (e) {}
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
