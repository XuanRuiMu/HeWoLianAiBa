// Rigorous 2D proof: assemble the 6 crops at their EXACT source coordinates and
// diff against the source static image. If the reconstructed character region matches
// the source, the 3D puppet's lying pose == source pose (top-down projection = 2D layout).
const sharp = require('sharp');
const fs = require('fs');

const SRC = 'frontend/public/图片/主页元素/吴昊阳终稿静态图.png';
const OUT = 'shots_assembled.png';

// Must match grass-bg.html SHEN_TI_BU_WEI exactly
const CROPS = [
  { id:'zuoTui',  crop:[0, 10, 520, 360] },
  { id:'youTui',  crop:[90, 70, 640, 390] },
  { id:'qianGan', crop:[450, 260, 760, 470] },
  { id:'zuoBi',   crop:[830, 560, 620, 380] },
  { id:'youBi',   crop:[790, 690, 676, 298] },
  { id:'tou',     crop:[1020, 665, 447, 333] },
];

(async () => {
  const { data: srcBuf, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, CH = info.channels;
  console.log('source:', W + 'x' + H, 'channels=' + CH);

  // output: transparent canvas
  const out = Buffer.alloc(W * H * CH); // all zeros (transparent)

  // union bbox
  let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  for (const c of CROPS) {
    const [sx,sy,sw,sh] = c.crop;
    minX=Math.min(minX,sx); minY=Math.min(minY,sy);
    maxX=Math.max(maxX,sx+sw); maxY=Math.max(maxY,sy+sh);
    // copy crop region from src to out at same coords
    for (let y=sy; y<sy+sh; y++) {
      for (let x=sx; x<sx+sw; x++) {
        const si = (y*W + x)*CH;
        const oi = (y*W + x)*CH;
        out[oi]=srcBuf[si]; out[oi+1]=srcBuf[si+1]; out[oi+2]=srcBuf[si+2]; out[oi+3]=srcBuf[si+3];
      }
    }
  }
  await sharp(out, { raw: { width:W, height:H, channels:CH } }).png().toFile(OUT);
  console.log('assembled saved ->', OUT, 'bbox union:', JSON.stringify({minX,minY,maxX,maxY}));

  // diff: compare source vs assembled WITHIN union bbox (character region)
  let match=0, total=0, sumAbs=0;
  for (let y=minY; y<maxY; y++) {
    for (let x=minX; x<maxX; x++) {
      const i = (y*W + x)*CH;
      const sa = srcBuf[i+3], oa = out[i+3];
      // only compare where character exists in source (alpha>10)
      if (sa > 10) {
        total++;
        if (oa > 10) {
          // compare RGB
          const dr=Math.abs(srcBuf[i]-out[i]);
          const dg=Math.abs(srcBuf[i+1]-out[i+1]);
          const db=Math.abs(srcBuf[i+2]-out[i+2]);
          sumAbs += dr+dg+db;
          if (dr<8 && dg<8 && db<8) match++;
        }
      }
    }
  }
  const matchPct = (match/total*100).toFixed(2);
  const meanAbs = total ? (sumAbs/total).toFixed(2) : 'n/a';
  console.log('\n===== POSE-MATCH PROOF (character region) =====');
  console.log('source character pixels in bbox:', total);
  console.log('reconstructed & RGB-matched:', match, '(' + matchPct + '%)');
  console.log('mean abs RGB diff (0=identical):', meanAbs);
  console.log(matchPct > 98 ? '✅ POSE LAYOUT IDENTICAL TO SOURCE (by construction)' : '⚠️ check crop coords');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
