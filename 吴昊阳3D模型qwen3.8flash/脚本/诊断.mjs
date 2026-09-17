// 诊断：加载 preview.html，抓 console/pageerror/网络失败/模块执行状态
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on("console", m => logs.push(`[console.${m.type()}] ${m.text()}`));
page.on("pageerror", e => logs.push(`[pageerror] ${e.message}`));
page.on("requestfailed", r => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
page.on("response", r => { if (r.status() >= 400) logs.push(`[http${r.status()}] ${r.url()}`); });

await page.goto("http://127.0.0.1:5199/preview.html?scale=0.85&ry=180", { waitUntil: "load", timeout: 20000 }).catch(e => logs.push("[goto] " + e.message));
await page.waitForTimeout(8000);
const state = await page.evaluate(() => ({
  ready: window.__ready,
  errors: window.__errors ? window.__errors.slice(0, 5) : null,
  hud: document.getElementById("hud")?.textContent,
})).catch(e => ({ evalFail: String(e.message) }));
console.log(JSON.stringify({ logs: logs.slice(0, 30), state }, null, 1));
await browser.close();
