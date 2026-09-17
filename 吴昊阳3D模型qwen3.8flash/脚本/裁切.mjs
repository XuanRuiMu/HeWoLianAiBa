// 裁切放大真实页角色区域
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";
const code = await readFile(new URL("../wu3DZhuRu.js", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5173/login", { waitUntil: "load", timeout: 60000 });
let frame = null;
for (let i = 0; i < 30 && !frame; i++) { frame = page.frames().find(f => f.url().includes("grass-bg")); if (!frame) await page.waitForTimeout(1000); }
for (let i = 0; i < 40; i++) { const ok = await frame.evaluate(() => !!(window.__experience && window.__experience.engine && window.__experience.engine.scene)).catch(() => false); if (ok) break; await page.waitForTimeout(1000); }
await page.waitForTimeout(3000);
await frame.evaluate((c) => { window.__wu3dGlb = "http://127.0.0.1:5201/ceShiZiYuan/wu3d-pazi.glb"; window.eval(c); return 1; }, code);
for (let i = 0; i < 40; i++) { const d = await frame.evaluate(() => window.__wu3DaoLu).catch(() => ""); if (d === "zhuDao" || String(d).startsWith("jiangJi")) break; await page.waitForTimeout(1500); }
// 材质诊断 + 裁切截图
const mat = await frame.evaluate(() => {
  const zu = window.__wu3dZu; if (!zu) return null;
  const out = [];
  zu.traverse(o => {
    if (o.isMesh) {
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      out.push({ name: o.name, matType: m.type, hasMap: !!m.map, mapType: m.map && m.map.type, mapColorSpace: m.map && m.map.colorSpace, mapFlipY: m.map && m.map.flipY, imgW: m.map && m.map.image && (m.map.image.width || m.map.image.naturalWidth), imgH: m.map && m.map.image && (m.map.image.height || m.map.image.naturalHeight), obc: !!m.onBeforeCompile, obcSrc: m.onBeforeCompile ? String(m.onBeforeCompile).slice(0, 80) : null });
    }
  });
  return out;
});
await page.waitForTimeout(4000);
await page.screenshot({ path: "证据/FP-03-角色裁切.png", clip: { x: 480, y: 380, width: 500, height: 340 } });
console.log(JSON.stringify(mat, null, 1));
await browser.close();
