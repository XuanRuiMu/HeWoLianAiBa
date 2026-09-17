// FP-01 冒烟 v2：本地 http 服务 + three r186 GLTFLoader.load 解析 Draco glb
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
if (typeof globalThis.self === "undefined") globalThis.self = globalThis;
if (typeof globalThis.ProgressEvent === "undefined") {
  globalThis.ProgressEvent = class ProgressEvent {
    constructor(type, init = {}) { Object.assign(this, { type, lengthComputable: false, loaded: 0, total: 0 }, init); }
  };
}
import * as THREE from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/three/build/three.module.js";
import { GLTFLoader } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/three/examples/jsm/loaders/DRACOLoader.js";

const ROOTS = [
  normalize(process.cwd()),
  "D:\\xuanr\\Desktop\\燃烧之陨我的世界服务端\\和我恋爱吧\\frontend\\node_modules\\three\\examples\\jsm\\libs\\draco\\gltf",
];
const MIME = { ".glb": "model/gltf-binary", ".js": "text/javascript", ".wasm": "application/wasm" };

const server = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  for (const root of ROOTS) {
    const f = join(root, p.replace(/^\//, ""));
    try {
      const buf = await readFile(f);
      res.writeHead(200, { "Content-Type": MIME[extname(f)] || "application/octet-stream" });
      res.end(buf);
      return;
    } catch {}
  }
  res.writeHead(404); res.end("nf");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath(`http://127.0.0.1:${port}/`);
loader.setDRACOLoader(draco);
loader.load(`http://127.0.0.1:${port}/${encodeURIComponent(process.argv[2] || "吴昊阳趴姿.glb")}`, (gltf) => {
  let meshes = 0, tris = 0; const mats = new Set(), texes = new Set();
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        mats.add(m.name || m.uuid);
        if (m.map) texes.add(m.map.name || m.map.uuid);
      }
    }
  });
  console.log(JSON.stringify({
    ok: true, meshes, tris: Math.round(tris), materials: mats.size, textures: texes.size,
    bboxMin: box.min.toArray().map(v => +v.toFixed(3)), bboxMax: box.max.toArray().map(v => +v.toFixed(3)),
    animations: gltf.animations.length,
  }));
  draco.dispose(); server.close(); process.exit(0);
}, undefined, (err) => {
  console.log(JSON.stringify({ ok: false, err: String(err && err.message || err) }));
  server.close(); process.exit(1);
});
