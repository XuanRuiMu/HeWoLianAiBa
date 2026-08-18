// Screenshot + pixel analysis to verify Wu Hao Yang visibility.
// Uses --enable-unsafe-swiftshader (required for WebGL in newer headless Chromium).
const { chromium } = require('playwright');
const sharp = require('sharp');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--ignore-gpu-blocklist',
      '--enable-webgl'
    ]
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', m => { if (m.type()==='error' && !/webgl|context|swiftshader/i.test(m.text())) console.log('[err]', m.text()); });

  // ---------- 1. STANDALONE MODEL ----------
  console.log('\n=== [1] Standalone model page ===');
  await page.goto('http://localhost:5173/wuhaoyang-standalone.html', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots_standalone.png' });
  console.log('saved shots_standalone.png');

  // ---------- 2. GRASS SCENE ----------
  console.log('\n=== [2] Grass scene ===');
  await page.goto('http://localhost:5173/grass-bg/grass-bg.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait for character build + fade-in
  await page.waitForTimeout(4000);
  const proj = await page.evaluate(() => {
    try {
      const T = window.__THREE;
      const root = window.__experience?.engine?.scene?.children?.find(c => c.name === 'WuHaoYangRoot');
      const cam = window.__experience?.engine?.camera?.instance;
      if (!root || !cam) return { ok:false, reason:!root?'no root':'no cam' };
      root.updateMatrixWorld(true);
      const center = new T.Vector3();
      root.getWorldPosition(center);
      const p = center.clone().project(cam);
      return {
        ok:true,
        ndc: { x: p.x, y: p.y },
        screen: { x: (p.x*0.5+0.5)*1280, y: (-p.y*0.5+0.5)*800 },
        world: { x:center.x, y:center.y, z:center.z }
      };
    } catch(e) { return { ok:false, reason:e.message }; }
  });
  console.log('character projection:', JSON.stringify(proj));
  await page.screenshot({ path: 'shots_grass.png' });
  console.log('saved shots_grass.png');

  // ---------- 3. PIXEL ANALYSIS ----------
  async function analyzeRegion(file, cx, cy, r=120) {
    const img = sharp(file);
    const meta = await img.metadata();
    const W = meta.width, H = meta.height;
    cx = Math.max(r, Math.min(W-r, cx|0)); cy = Math.max(r, Math.min(H-r, cy|0));
    const buf = await sharp(file).extract({ left: cx-r, top: cy-r, width: 2*r, height: 2*r }).raw().toBuffer({ resolveWithObject:true });
    const { data, info } = buf;
    let n = info.width*info.height;
    let sumR=0,sumG=0,sumB=0, minL=255, maxL=0;
    for (let i=0;i<data.length;i+=info.channels){
      const r=data[i],g=data[i+1],b=data[i+2];
      sumR+=r;sumG+=g;sumB+=b;
      const l=(r+g+b)/3; minL=Math.min(minL,l); maxL=Math.max(maxL,l);
    }
    return { avg:[Math.round(sumR/n),Math.round(sumG/n),Math.round(sumB/n)], minL:Math.round(minL), maxL:Math.round(maxL), contrast:Math.round(maxL-minL) };
  }

  console.log('\n=== [3] Pixel analysis ===');
  // Standalone: character should be centered (top view → roughly center)
  const std = await analyzeRegion('shots_standalone.png', 640, 400, 200);
  console.log('standalone center region:', JSON.stringify(std));

  // Grass: character at projected screen pos (or center fallback)
  const gx = proj.ok ? proj.screen.x : 640;
  const gy = proj.ok ? proj.screen.y : 400;
  const gr = await analyzeRegion('shots_grass.png', gx, gy, 100);
  console.log('grass char-region (screen', Math.round(gx)+','+Math.round(gy)+'):', JSON.stringify(gr));

  // Also sample a known grass-only area for comparison (top-left corner)
  const grassOnly = await analyzeRegion('shots_grass.png', 120, 150, 80);
  console.log('grass-only area (top-left):', JSON.stringify(grassOnly));

  await browser.close();
  console.log('\nDONE');
})().catch(e => { console.error('SCRIPT FAILED:', e); process.exit(1); });
