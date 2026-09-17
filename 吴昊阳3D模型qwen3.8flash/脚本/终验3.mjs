// 终验3：仅用 T4 默认参数（不覆盖位置），验证交付配置本身出画
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";

const code = await readFile(new URL("../wu3D-ronghe.js", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5173/login", { waitUntil: "load", timeout: 60000 });
let frame = null;
for (let i = 0; i < 30 && !frame; i++) { frame = page.frames().find(f => f.url().includes("grass-bg")); if (!frame) await page.waitForTimeout(1000); }
for (let i = 0; i < 40; i++) { const ok = await frame.evaluate(() => !!(window.__experience && window.__experience.engine && window.__experience.engine.scene)).catch(() => false); if (ok) break; await page.waitForTimeout(1000); }
let rev = -1;
for (let i = 0; i < 60; i++) {
  rev = await frame.evaluate(() => { try { const u = window.__experience.revealMesh.mesh.material.uniforms; return u && u.uRevealProgress ? +u.uRevealProgress.value.toFixed(2) : -2; } catch (e) { return -3; } }).catch(() => -4);
  if (rev >= 0.95) break;
  await page.waitForTimeout(1000);
}
if (rev < 0.95) await frame.evaluate(() => { try { window.__experience.revealMesh.mesh.material.uniforms.uRevealProgress.value = 1; } catch (e) {} });
await page.waitForTimeout(3000);
// 注入交付版脚本；glb 走 vite 路径（若尚未复制则回退测试服务器）
const inj = await frame.evaluate((c) => {
  try { window.eval(c); return "default"; } catch (e) { return "err:" + e.message; }
}, code);
let daoLu = "";
for (let i = 0; i < 30; i++) { daoLu = await frame.evaluate(() => window.__wu3DaoLu).catch(() => ""); if (daoLu === "zhuDao" || String(daoLu).startsWith("jiangJi")) break; await page.waitForTimeout(1500); }
if (daoLu.startsWith("jiangJi:glb")) {
  await frame.evaluate((c) => { window.__wu3dGlb = "http://127.0.0.1:5201/ceShiZiYuan/wu3d-pazi.glb"; window.__wu3DaoLu = "dengDai"; window.eval(c); }, code);
  for (let i = 0; i < 30; i++) { daoLu = await frame.evaluate(() => window.__wu3DaoLu).catch(() => ""); if (daoLu === "zhuDao" || String(daoLu).startsWith("jiangJi")) break; await page.waitForTimeout(1500); }
}
await page.waitForTimeout(5000);
await page.screenshot({ path: "证据/FP-03-终验3.png" });
console.log(JSON.stringify({ rev, inj, daoLu }));
await browser.close();
