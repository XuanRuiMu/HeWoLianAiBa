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
// 驱动 reveal 满 + 换纯红 basic 对照
const step = await frame.evaluate(() => {
  const exp = window.__experience; const out = {};
  try {
    const uni = exp.revealMesh && exp.revealMesh.mesh && exp.revealMesh.mesh.material.uniforms;
    if (uni && uni.uRevealProgress) { uni.uRevealProgress.value = 1; out.reveal = "driven"; }
    else out.reveal = uni ? Object.keys(uni).join(",") : "none";
  } catch (e) { out.reveal = "err:" + e.message; }
  try {
    const T = window.parent.THREE; const zu = window.__wu3dZu;
    zu.traverse(o => { if (o.isMesh) { const m = new T.MeshBasicMaterial({ color: 0xff0000, side: 2 }); o.material = m; } });
    out.red = "ok";
  } catch (e) { out.red = "err:" + e.message; }
  return out;
});
await page.waitForTimeout(5000);
await page.screenshot({ path: "证据/FP-03-对照红.png" });
// 采样：角色 NDC 区域是否有红色像素
const red = await page.evaluate(() => {
  const cv = document.querySelector("#bg") ? null : null; return null;
}).catch(()=>null);
console.log(JSON.stringify(step));
await browser.close();
