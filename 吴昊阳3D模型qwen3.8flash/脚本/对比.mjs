import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const shots = [
  { name: "A060", q: "scale=0.60&ry=250&px=0.55&pz=0.55" },
  { name: "B070", q: "scale=0.70&ry=250&px=0.55&pz=0.55" },
  { name: "C085", q: "scale=0.85&ry=250&px=0.55&pz=0.55" },
];
const out = [];
for (const s of shots) {
  await page.goto(`http://127.0.0.1:5199/preview.html?${s.q}`, { waitUntil: "load" });
  await page.waitForFunction("window.__ready === true", null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  out.push({ shot: s.name, pct: await page.evaluate("window.__pct") });
  await page.screenshot({ path: `证据/FP-02-对比-${s.name}.png` });
}
console.log(JSON.stringify(out));
await browser.close();
