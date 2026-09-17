// FP-03 真实页验证：打开 vite 登录页(5173)，在 grass-bg iframe 注入 T4，截图核像素
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";

const code = await readFile(new URL("../wu3DZhuRu.js", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on("console", m => { const t = m.text(); if (t.includes("WuHaoYang") || m.type() === "error") logs.push(`[${m.type()}] ${t.slice(0, 150)}`); });

await page.goto("http://localhost:5173/login", { waitUntil: "load", timeout: 60000 });
// 找 grass-bg iframe
let frame = null;
for (let i = 0; i < 30 && !frame; i++) {
  frame = page.frames().find(f => f.url().includes("grass-bg"));
  if (!frame) await page.waitForTimeout(1000);
}
if (!frame) { console.log(JSON.stringify({ err: "noFrame", urls: page.frames().map(f => f.url()) })); await browser.close(); process.exit(1); }
// 等引擎就绪
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  ready = await frame.evaluate(() => !!(window.__experience && window.__experience.engine && window.__experience.engine.scene)).catch(() => false);
  if (!ready) await page.waitForTimeout(1000);
}
await page.waitForTimeout(3000);
const inj = await frame.evaluate((c) => {
  try { window.__wu3dGlb = "http://127.0.0.1:5201/ceShiZiYuan/wu3d-pazi.glb"; window.eval(c); return "ok"; } catch (e) { return "err:" + e.message; }
}, code);
let daoLu = "timeout";
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1500);
  daoLu = await frame.evaluate(() => window.__wu3DaoLu).catch(() => "x");
  if (daoLu === "zhuDao" || String(daoLu).startsWith("jiangJi")) break;
}
await page.waitForTimeout(5000);
await page.screenshot({ path: "证据/FP-03-真实页.png" });
console.log(JSON.stringify({ ready, inj, daoLu, logs: logs.slice(0, 15) }, null, 1));
await browser.close();
