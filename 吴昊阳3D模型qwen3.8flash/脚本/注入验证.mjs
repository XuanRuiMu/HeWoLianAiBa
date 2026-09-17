// FP-03 注入验证：test-shell 加载引擎+注入脚本，轮询 __wu3DaoLu，截图落盘
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on("console", m => {
  const t = m.text();
  if (m.type() === "error") errs.push(t);
  else if (t.includes("[T4]") || t.includes("WuHaoYang")) errs.push("[" + m.type() + "] " + t);
});
page.on("pageerror", e => errs.push("pageerror:" + e.message));

await page.goto("http://127.0.0.1:5201/wu3d/test-shell.html", { waitUntil: "load", timeout: 60000 });
let daoLu = "timeout";
for (let i = 0; i < 45; i++) {
  await page.waitForTimeout(2000);
  daoLu = await page.evaluate(() => {
    try { return document.getElementById("bg").contentWindow.__wu3DaoLu; } catch (e) { return "x:" + e.message; }
  });
  if (daoLu === "zhuDao" || String(daoLu).startsWith("jiangJi")) break;
}
const zhiRu = await page.evaluate(() => window.__zhiRu);
await page.screenshot({ path: "证据/FP-03-引擎注入.png" });
console.log(JSON.stringify({ daoLu, zhiRu, errs: errs.slice(0, 12) }, null, 1));
await browser.close();
