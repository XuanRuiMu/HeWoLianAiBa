import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto("http://127.0.0.1:5199/preview.html?scale=2.2&ry=250&px=1.1&pz=1.1&hide=1", { waitUntil: "load" });
await page.waitForFunction("window.__ready === true", null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "证据/FP-02-特写.png", clip: { x: 0, y: 0, width: 860, height: 900 } });
await browser.close();
console.log("done");
