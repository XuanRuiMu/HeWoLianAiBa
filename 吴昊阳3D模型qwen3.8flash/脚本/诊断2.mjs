// 诊断2：验证 THREE 全局、loader 文件可达性、iframe 转注
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on("console", m => logs.push(`[${m.type()}] ${m.text().slice(0, 160)}`));
page.on("response", r => { if (r.status() >= 400) logs.push(`[http${r.status()}] ${r.url()}`); });
page.on("requestfailed", r => logs.push(`[fail] ${r.url()} ${r.failure()?.errorText}`));

await page.goto("http://127.0.0.1:5201/wu3d/test-shell.html", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(12000);
const st = await page.evaluate(() => {
  const f = document.getElementById("bg");
  const iw = f && f.contentWindow;
  let iwThree = null, iwErr = null;
  try { iwThree = !!iw.THREE; } catch (e) { iwErr = e.message; }
  return {
    parentTHREE: typeof window.THREE,
    parentRevision: window.THREE && window.THREE.REVISION,
    parentLoader: typeof window.GLTFLoader,
    iwThree, iwErr,
    iwLoader: (() => { try { return typeof iw.GLTFLoader; } catch (e) { return "err"; } })(),
    daoLu: (() => { try { return iw.__wu3DaoLu; } catch (e) { return "x"; } })(),
  };
});
console.log(JSON.stringify(st, null, 1));
console.log("LOGS:\n" + logs.slice(0, 25).join("\n"));
await browser.close();
