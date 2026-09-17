// 诊断5：真实登录页 iframe 内 THREE/GLTFLoader/网络 状态
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const net = [];
page.on("response", r => { if (r.url().includes("GLTFLoader") || r.url().includes("three-r128")) net.push(r.status() + " " + r.url()); });
page.on("requestfailed", r => { if (r.url().includes("GLTFLoader") || r.url().includes("three")) net.push("fail " + r.url()); });

await page.goto("http://localhost:5173/login", { waitUntil: "load", timeout: 60000 });
let frame = null;
for (let i = 0; i < 30 && !frame; i++) {
  frame = page.frames().find(f => f.url().includes("grass-bg"));
  if (!frame) await page.waitForTimeout(1000);
}
if (!frame) { console.log(JSON.stringify({ err: "noFrame" })); await browser.close(); process.exit(0); }
await page.waitForTimeout(8000);

const st = await frame.evaluate(() => {
  const out = {};
  out.iwTHREE = typeof window.THREE;
  out.iwRev = window.THREE && window.THREE.REVISION;
  out.iwLoader = typeof window.GLTFLoader;
  out.iwTHREELoader = window.THREE && typeof window.THREE.GLTFLoader;
  try {
    out.pTHREE = typeof window.parent.THREE;
    out.pRev = window.parent.THREE && window.parent.THREE.REVISION;
    out.pLoader = typeof window.parent.GLTFLoader;
    out.pTHREELoader = window.parent.THREE && typeof window.parent.THREE.GLTFLoader;
  } catch (e) { out.pErr = e.message; }
  out.scripts = [...document.querySelectorAll("script")].map(s => s.src.split("/").pop()).filter(Boolean);
  out.expScene = !!(window.__experience && window.__experience.engine && window.__experience.engine.scene);
  return out;
});
// 父窗（Vue 应用）状态
const top = await page.evaluate(() => ({
  tTHREE: typeof window.THREE, tRev: window.THREE && window.THREE.REVISION, tLoader: typeof window.GLTFLoader,
}));
console.log(JSON.stringify({ st, top, net }, null, 1));
await browser.close();
