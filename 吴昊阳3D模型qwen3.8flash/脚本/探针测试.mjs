// FP-03 纯色探针测试：注入纯色诊断，截图并扫描像素判定哪些方块可见
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";

const code = await readFile(new URL("../纯色诊断.js", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://127.0.0.1:5201/wu3d/test-shell.html", { waitUntil: "load", timeout: 60000 });
// 等引擎就绪（__experience.engine.scene 存在）
for (let i = 0; i < 40; i++) {
  const ok = await page.evaluate(() => {
    try { const iw = document.getElementById("bg").contentWindow; return !!(iw.__experience && iw.__experience.engine && iw.__experience.engine.scene); } catch (e) { return false; }
  });
  if (ok) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(3000);
const inject = await page.evaluate((c) => {
  const iw = document.getElementById("bg").contentWindow;
  try { iw.eval(c); return "ok"; } catch (e) { return "err:" + e.message; }
}, code);
await page.waitForTimeout(5000);
const probe = await page.evaluate(() => { try { return document.getElementById("bg").contentWindow.__probe; } catch (e) { return { x: e.message }; } });
await page.screenshot({ path: "证据/FP-03-纯色探针.png" });
// 像素扫描：统计红/绿/蓝/黄像素数
const px = await page.evaluate(() => new Promise((res) => {
  const cv = document.createElement("canvas");
  const img = new Image();
  img.onload = () => {
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    let r = 0, g = 0, b = 0, y = 0;
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i], G = d[i + 1], B = d[i + 2];
      if (R > 180 && G < 90 && B < 90) r++;
      else if (G > 150 && R < 120 && B < 120) g++;
      else if (B > 180 && R < 100 && G < 140) b++;
      else if (R > 180 && G > 150 && B < 100) y++;
    }
    res({ red: r, green: g, blue: b, yellow: y });
  };
  img.src = "证据/FP-03-纯色探针.png";
})).catch(() => null);
console.log(JSON.stringify({ inject, probe, px }, null, 1));
await browser.close();
