// 终验2：等登录页自然揭示完成 → 注入 T4 → 挪右下构图 → 截图读图
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";

const code = await readFile(new URL("../wu3DZhuRu.js", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5173/login", { waitUntil: "load", timeout: 60000 });
let frame = null;
for (let i = 0; i < 30 && !frame; i++) { frame = page.frames().find(f => f.url().includes("grass-bg")); if (!frame) await page.waitForTimeout(1000); }
for (let i = 0; i < 40; i++) { const ok = await frame.evaluate(() => !!(window.__experience && window.__experience.engine && window.__experience.engine.scene)).catch(() => false); if (ok) break; await page.waitForTimeout(1000); }
// 等自然揭示完成（uRevealProgress ≥ 0.95），最多 60s；卡住则手动驱动（仅测试环境）
let rev = -1;
for (let i = 0; i < 60; i++) {
  rev = await frame.evaluate(() => {
    try {
      const u = window.__experience.revealMesh.mesh.material.uniforms;
      return u && u.uRevealProgress ? +u.uRevealProgress.value.toFixed(2) : -2;
    } catch (e) { return -3; }
  }).catch(() => -4);
  if (rev >= 0.95) break;
  await page.waitForTimeout(1000);
}
let driven = false;
if (rev < 0.95) {
  driven = true;
  await frame.evaluate(() => { try { window.__experience.revealMesh.mesh.material.uniforms.uRevealProgress.value = 1; } catch (e) {} });
}
await page.waitForTimeout(3000);
await frame.evaluate((c) => { window.__wu3dGlb = "http://127.0.0.1:5201/ceShiZiYuan/wu3d-pazi.glb"; try { window.eval(c); return 1; } catch (e) { return "err:" + e.message; } }, code);
let daoLu = "";
for (let i = 0; i < 40; i++) { daoLu = await frame.evaluate(() => window.__wu3DaoLu).catch(() => ""); if (daoLu === "zhuDao" || String(daoLu).startsWith("jiangJi")) break; await page.waitForTimeout(1500); }
const pos = await frame.evaluate(() => {
  const exp = window.__experience; const T = window.parent.THREE;
  const cam = exp.engine.camera.instance || exp.engine.camera;
  const an = new T.Vector3(3.24, 0.161, 2.77);
  const d = an.clone().sub(cam.position);
  const p = cam.position.clone().add(d.clone().multiplyScalar(0.62));
  const right = new T.Vector3().crossVectors(d, new T.Vector3(0, 1, 0)).normalize();
  p.add(right.multiplyScalar(1.05));
  const zu = window.__wu3dZu;
  zu.position.copy(p);
  zu.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(zu);
  const c = box.getCenter(new T.Vector3()).project(cam);
  return { ndc: [+c.x.toFixed(2), +c.y.toFixed(2)], h: +(box.max.y - box.min.y).toFixed(2) };
});
await page.waitForTimeout(5000);
await page.screenshot({ path: "证据/FP-03-终验2.png" });
console.log(JSON.stringify({ rev, driven, daoLu, pos }));
await browser.close();
