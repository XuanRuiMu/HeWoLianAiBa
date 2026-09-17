// FP-03 探针v2测试：注入纯色诊断2，截图+像素扫描判定哪些方块可见
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";

const code = await readFile(new URL("../纯色诊断2.js", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://127.0.0.1:5201/wu3d/test-shell.html", { waitUntil: "load", timeout: 60000 });
for (let i = 0; i < 40; i++) {
  const ok = await page.evaluate(() => { try { const iw = document.getElementById("bg").contentWindow; return !!(iw.__experience && iw.__experience.engine && iw.__experience.engine.scene); } catch (e) { return false; } });
  if (ok) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(4000);
const inj = await page.evaluate((c) => { try { document.getElementById("bg").contentWindow.eval(c); return "ok"; } catch (e) { return "err:" + e.message; } }, code);
// 驱动 reveal 满
await page.evaluate(() => {
  try {
    const iw = document.getElementById("bg").contentWindow;
    const uni = iw.__experience.revealMesh.mesh.material.uniforms;
    if (uni && uni.uRevealProgress) uni.uRevealProgress.value = 1;
  } catch (e) {}
});
await page.waitForTimeout(6000);
const probe = await page.evaluate(() => { try { return document.getElementById("bg").contentWindow.__probe2; } catch (e) { return { x: e.message }; } });
await page.screenshot({ path: "证据/FP-03-探针2.png" });
console.log(JSON.stringify({ inj, probe }, null, 1));
await browser.close();
