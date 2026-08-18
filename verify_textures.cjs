// Verifies the embedded source image actually loaded (textures have real pixels),
// and re-checks character scale.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', m => { if (m.type()==='error' && !/webgl|context|swiftshader/i.test(m.text())) console.log('[err]', m.text()); });

  await page.goto('http://localhost:5173/grass-bg/grass-bg.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const result = await page.evaluate(() => new Promise((resolve) => {
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      const T = window.__THREE;
      const root = window.__experience?.engine?.scene?.children?.find(c => c.name === 'WuHaoYangRoot');
      if (!root && tries < 80) return;
      if (!root) { clearInterval(iv); resolve({ ok:false, reason:'no root' }); return; }
      try {
        const parts = [];
        let totalAlpha = 0;
        root.traverse(o => {
          if (o.isMesh && o.material && o.material.map && o.material.map.image) {
            const cv = o.material.map.image;
            let nonTransparent = 0;
            try {
              const ctx = cv.getContext('2d');
              const d = ctx.getImageData(0,0,cv.width,cv.height).data;
              for (let i=3;i<d.length;i+=4) if (d[i] > 10) nonTransparent++;
              totalAlpha += nonTransparent;
            } catch(e) {}
            parts.push({ name:o.name, canvasW:cv.width, canvasH:cv.height, nonTransparentPx:nonTransparent });
          }
        });
        root.updateMatrixWorld(true);
        const box = { min:{}, max:{} };
        // manual bbox from part world positions + half-size
        let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,minZ=1e9,maxZ=-1e9;
        root.traverse(o => {
          if (o.isMesh && o.geometry && o.geometry.parameters) {
            const wp = new T.Vector3(); o.getWorldPosition(wp);
            const hw = o.geometry.parameters.width/2*Math.abs(o.scale.x);
            const hh = o.geometry.parameters.height/2*Math.abs(o.scale.y);
            minX=Math.min(minX,wp.x-hw); maxX=Math.max(maxX,wp.x+hw);
            minY=Math.min(minY,wp.y-hh); maxY=Math.max(maxY,wp.y+hh);
            minZ=Math.min(minZ,wp.z-hw); maxZ=Math.max(maxZ,wp.z+hw);
          }
        });
        clearInterval(iv);
        resolve({
          ok:true, parts, totalAlphaPx: totalAlpha,
          size: { x:+(maxX-minX).toFixed(2), y:+(maxY-minY).toFixed(2), z:+(maxZ-minZ).toFixed(2) },
          rootScale: { x:+root.scale.x.toFixed(3), y:+root.scale.y.toFixed(3), z:+root.scale.z.toFixed(3) }
        });
      } catch(e) { clearInterval(iv); resolve({ ok:false, reason:e.message }); }
    }, 250);
  }));

  console.log('\n===== TEXTURE + SCALE VERIFY =====');
  console.log(JSON.stringify(result, null, 2));

  // Also check the standalone page image loads
  const standalone = await page.evaluate(() => new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ ok:true, w:img.naturalWidth, h:img.naturalHeight });
    img.onerror = () => res({ ok:false });
    img.src = 'data:image/png;base64,' + (window.WUHAO_YANG_SRC_B64 || '');
    setTimeout(() => res({ ok:false, reason:'timeout' }), 3000);
  })).catch(()=>({ok:false,reason:'eval-fail'}));
  console.log('\nstandalone data-uri image test:', JSON.stringify(standalone));

  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
