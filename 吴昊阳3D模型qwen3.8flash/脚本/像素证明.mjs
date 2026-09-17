// FP-03 像素证明：驱动reveal到1 + 把角色挪到相机正前方 + NDC核对 + 截图
import { chromium } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ executablePath: "C:/Users/xuanr/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://127.0.0.1:5201/wu3d/test-shell.html", { waitUntil: "load", timeout: 60000 });

let daoLu = "timeout";
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1500);
  daoLu = await page.evaluate(() => { try { return document.getElementById("bg").contentWindow.__wu3DaoLu; } catch (e) { return "x"; } });
  if (daoLu === "zhuDao" || String(daoLu).startsWith("jiangJi")) break;
}

const info = await page.evaluate(() => {
  const iw = document.getElementById("bg").contentWindow;
  const exp = iw.__experience;
  const out = { daoLu: iw.__wu3DaoLu };
  try {
    const cam = exp.engine.camera && (exp.engine.camera.instance || exp.engine.camera);
    out.camPos = cam.position.toArray().map(v => +v.toFixed(2));
    const rm = exp.revealMesh;
    const uni = rm && rm.mesh && rm.mesh.material && rm.mesh.material.uniforms;
    if (uni && uni.uRevealProgress) { uni.uRevealProgress.value = 1; out.reveal = "driven"; }
    else out.reveal = uni ? Object.keys(uni).join(",") : "noUniforms";
    const zu = iw.__wu3dZu;
    if (zu) {
      const dir = new iw.THREE.Vector3();
      cam.getWorldDirection(dir);
      const p = cam.position.clone().add(dir.multiplyScalar(4.5));
      zu.position.set(p.x, 0.45, p.z);
      zu.updateMatrixWorld(true);
      const v = zu.position.clone().project(cam);
      out.ndc = [+v.x.toFixed(2), +v.y.toFixed(2)];
      out.moved = true;
      // 统计重建网格
      let meshes = 0; zu.traverse(o => { if (o.isMesh) meshes++; });
      out.meshes = meshes;
    } else out.moved = false;
  } catch (e) { out.err = e.message; }
  return out;
});
await page.waitForTimeout(4000);
await page.screenshot({ path: "证据/FP-03-像素证明.png" });
console.log(JSON.stringify(info, null, 1));
await browser.close();
