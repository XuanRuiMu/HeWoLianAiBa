// FP-02 截图：Playwright 打开 preview.html 多档位截图，落盘 证据\
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";

const BASE = process.env.BASE || "http://127.0.0.1:5199";
const shots = [
  { name: "070", q: "scale=0.70&ry=250" },
  { name: "085", q: "scale=0.85&ry=250" },
  { name: "100", q: "scale=1.00&ry=250" },
  { name: "070-近", q: "scale=0.70&ry=250&px=1.1&pz=1.1" },
  { name: "085-近", q: "scale=0.85&ry=250&px=1.1&pz=1.1" },
];
const browser = await chromium.launch({
  executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleErrors = [];
page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", e => consoleErrors.push("pageerror:" + e.message));

const out = [];
for (const s of shots) {
  await page.goto(`${BASE}/preview.html?${s.q}`, { waitUntil: "load" });
  await page.waitForFunction("window.__ready === true", null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const pct = await page.evaluate("window.__pct");
  const errs = await page.evaluate("window.__errors.length");
  await page.screenshot({ path: `证据/FP-02-默认视角-${s.name}.png` });
  out.push({ shot: s.name, pct, pageErrors: errs });
}
console.log(JSON.stringify({ out, consoleErrors: consoleErrors.slice(0, 8) }, null, 1));
await browser.close();
