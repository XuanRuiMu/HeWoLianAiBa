// Injects the Wu Hao Yang source PNG as a base64 data URI into the HTML files,
// bypassing Vite's broken publicDir static serving (returns 0 bytes for binaries).
const fs = require('fs');
const path = require('path');

const SRC_PNG = 'frontend/public/grass-bg/wuhaoyang-source.png';
const b64 = fs.readFileSync(SRC_PNG).toString('base64');
const dataUri = 'data:image/png;base64,' + b64;
console.log('source png base64 length:', dataUri.length);

const targets = [
  { file: 'frontend/public/grass-bg/grass-bg.html', from: "var YUAN_TU_URL = '/grass-bg/wuhaoyang-source.png';", name: 'YUAN_TU_URL' },
  { file: 'frontend/public/wuhaoyang-standalone.html', from: "var YUAN_TU_URL = '/grass-bg/wuhaoyang-source.png';", name: 'YUAN_TU_URL' },
];

for (const t of targets) {
  let html = fs.readFileSync(t.file, 'utf8');
  if (html.includes('data:image/png;base64,')) {
    console.log('[skip]', t.file, 'already embedded');
    continue;
  }
  if (!html.includes(t.from)) {
    console.log('[WARN] anchor not found in', t.file);
    continue;
  }
  html = html.replace(t.from, "var YUAN_TU_URL = '" + dataUri + "';");
  fs.writeFileSync(t.file, html);
  console.log('[ok] embedded into', t.file, '(', (html.length/1024/1024).toFixed(2), 'MB )');
}
console.log('DONE');
