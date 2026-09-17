// 诊断4：查后处理 composer 实际渲染的场景与材质程序状态
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";

const code = await readFile(new URL("../纯色诊断.js", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://127.0.0.1:5201/wu3d/test-shell.html", { waitUntil: "load", timeout: 60000 });
for (let i = 0; i < 40; i++) {
  const ok = await page.evaluate(() => { try { const iw = document.getElementById("bg").contentWindow; return !!(iw.__experience && iw.__experience.engine && iw.__experience.engine.scene); } catch (e) { return false; } });
  if (ok) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(4000);
await page.evaluate((c) => { try { document.getElementById("bg").contentWindow.eval(c); return "ok"; } catch (e) { return "err:" + e.message; } }, code);
await page.waitForTimeout(2000);

const r = await page.evaluate(() => {
  const iw = document.getElementById("bg").contentWindow;
  const eng = iw.__experience.engine;
  const pp = eng.postProcessing;
  const out = { direct: pp.directRenderMode, built: pp.built, originalIsScene: pp.originalScene === eng.scene };
  const ec = pp.effectComposer;
  if (ec) {
    out.composerKeys = Object.keys(ec).slice(0, 20);
    const passes = ec.passes || [];
    out.passes = passes.map(p => ({
      type: p.constructor && p.constructor.name,
      sceneEq: p.scene === eng.scene,
      sceneName: p.scene && p.scene.name,
      enabled: p.enabled,
    }));
  }
  // 探针方块的材质程序状态：渲染器是否编译了它
  try {
    const probe = eng.scene.getObjectByName("probe-D2");
    if (probe) {
      out.probeMatType = probe.material.type;
      out.probeMatCtor = probe.material.constructor.name;
      out.rendererInfo = eng.renderer.info ? {
        programs: eng.renderer.info.programs && eng.renderer.info.programs.length,
        calls: eng.renderer.info.render.calls,
        triangles: eng.renderer.info.render.triangles,
      } : null;
      // 手动渲染一次到屏幕外看是否报错
      out.manualRenderErr = null;
      try { eng.renderer.render(eng.scene, eng.camera.instance || eng.camera); } catch (e) { out.manualRenderErr = e.message; }
      out.afterManual = eng.renderer.info ? { calls: eng.renderer.info.render.calls, tris: eng.renderer.info.render.triangles } : null;
    }
  } catch (e) { out.probeErr = e.message; }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
