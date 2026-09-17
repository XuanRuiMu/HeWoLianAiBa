// 遮挡实验：真实页注入 T4 → 驱动reveal → 把角色挪到卡片下方可见区 → 截图+canvas采样
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";

const code = await readFile(new URL("../wu3DZhuRu.js", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5173/login", { waitUntil: "load", timeout: 60000 });
let frame = null;
for (let i = 0; i < 30 && !frame; i++) { frame = page.frames().find(f => f.url().includes("grass-bg")); if (!frame) await page.waitForTimeout(1000); }
if (!frame) { console.log(JSON.stringify({ err: "noFrame" })); await browser.close(); process.exit(0); }
for (let i = 0; i < 40; i++) { const ok = await frame.evaluate(() => !!(window.__experience && window.__experience.engine && window.__experience.engine.scene)).catch(() => false); if (ok) break; await page.waitForTimeout(1000); }
await page.waitForTimeout(3000);
await frame.evaluate((c) => { window.__wu3dGlb = "http://127.0.0.1:5201/ceShiZiYuan/wu3d-pazi.glb"; try { window.eval(c); return 1; } catch (e) { return "err:" + e.message; } }, code);
for (let i = 0; i < 40; i++) { const d = await frame.evaluate(() => window.__wu3DaoLu).catch(() => ""); if (d === "zhuDao" || String(d).startsWith("jiangJi")) break; await page.waitForTimeout(1500); }

const r = await frame.evaluate(async () => {
  const out = { daoLu: window.__wu3DaoLu };
  const exp = window.__experience;
  const T = window.parent.THREE;
  const cam = exp.engine.camera.instance || exp.engine.camera;
  try { const uni = exp.revealMesh.mesh.material.uniforms; if (uni && uni.uRevealProgress) uni.uRevealProgress.value = 1; } catch (e) { out.revealErr = e.message; }
  const zu = window.__wu3dZu;
  if (!zu) { out.err = "noZu"; return out; }
  // 候选位置：相机→锚点水平线插值，找 NDC y 落在卡片下方(-0.85..-0.62)
  const camXZ = [cam.position.x, cam.position.z], anXZ = [3.24, 2.77];
  const ndcOf = (p) => { const v = p.clone().project(cam); return [v.x, v.y]; };
  let best = null;
  for (let t = 0.55; t <= 0.98; t += 0.05) {
    const p = new T.Vector3(camXZ[0] + (anXZ[0] - camXZ[0]) * t, 0.161, camXZ[1] + (anXZ[1] - camXZ[1]) * t);
    const [nx, ny] = ndcOf(p);
    out["t" + t.toFixed(2)] = [+nx.toFixed(2), +ny.toFixed(2)];
    if (ny >= -0.86 && ny <= -0.60 && (!best || Math.abs(nx) < Math.abs(best.nx))) best = { t, p, nx, ny };
  }
  if (best) { zu.position.copy(best.p); zu.updateMatrixWorld(true); out.chosen = { t: best.t, ndc: [+best.nx.toFixed(2), +best.ny.toFixed(2)] }; }
  // 屏幕包围盒（8角点投影）
  zu.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(zu);
  const pts = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const v = new T.Vector3(x, y, z).project(cam); pts.push(v);
  }
  const sx = pts.map(v => (v.x + 1) / 2 * 1280), sy = pts.map(v => (1 - v.y) / 2 * 720);
  out.screenBox = [Math.min(...sx) | 0, Math.min(...sy) | 0, Math.max(...sx) | 0, Math.max(...sy) | 0];
  // rAF 内 drawImage 采样 canvas 颜色（防 preserveDrawingBuffer 空读）
  const cv = exp.engine.canvas || document.querySelector("canvas");
  out.canvasInfo = cv ? cv.width + "x" + cv.height : "none";
  const colors = await new Promise((res) => {
    requestAnimationFrame(() => {
      try {
        const off = document.createElement("canvas"); off.width = cv.width; off.height = cv.height;
        const c2 = off.getContext("2d", { willReadFrequently: true });
        c2.drawImage(cv, 0, 0);
        const [x0, y0, x1, y1] = out.screenBox;
        const w = Math.max(2, x1 - x0), h = Math.max(2, y1 - y0);
        const d = c2.getImageData(x0 * (cv.width / 1280), y0 * (cv.height / 720), w * (cv.width / 1280), h * (cv.height / 720)).data;
        const hist = {};
        for (let i = 0; i < d.length; i += 4) {
          const k = (d[i] >> 5) + "," + (d[i + 1] >> 5) + "," + (d[i + 2] >> 5);
          hist[k] = (hist[k] || 0) + 1;
        }
        const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 6);
        res({ total: d.length / 4, top });
      } catch (e) { res({ err: e.message }); }
    });
  });
  out.canvasColors = colors;
  return out;
});
await page.waitForTimeout(4000);
await page.screenshot({ path: "证据/FP-03-遮挡实验.png" });
console.log(JSON.stringify(r, null, 1));
await browser.close();
