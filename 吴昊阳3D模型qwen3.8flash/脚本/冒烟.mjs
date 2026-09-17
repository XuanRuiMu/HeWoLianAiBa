// FP-01 冒烟：three r186 GLTFLoader 解析 Draco glb
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as THREE from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/three/build/three.module.js";
import { GLTFLoader } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/three/examples/jsm/loaders/DRACOLoader.js";

const glbPath = process.argv[2];
const dracoPath = "file:///D:/xuanr/Desktop/%E7%87%83%E7%83%A7%E4%B9%8B%E9%99%A8%E6%88%91%E7%9A%84%E4%B8%96%E7%95%8C%E6%9C%8D%E5%8A%A1%E7%AB%AF/%E5%92%8C%E6%88%91%E6%81%8B%E7%88%B1%E5%90%A7/frontend/node_modules/three/examples/jsm/libs/draco/gltf/";

const buf = readFileSync(glbPath);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath(dracoPath);
loader.setDRACOLoader(draco);
loader.parse(ab, "", (gltf) => {
  let meshes = 0, tris = 0, mats = new Set(), texes = new Set();
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) {
        mats.add(m.name || m.uuid);
        if (m.map) texes.add(m.map.name || m.map.uuid);
      }
    }
  });
  console.log(JSON.stringify({
    ok: true, meshes, tris: Math.round(tris),
    materials: mats.size, textures: texes.size,
    bbox: { min: box.min.toArray().map(v => +v.toFixed(3)), max: box.max.toArray().map(v => +v.toFixed(3)) },
    size: { x: +size.x.toFixed(3), y: +size.y.toFixed(3), z: +size.z.toFixed(3) },
    animations: gltf.animations.length,
  }));
  draco.dispose();
  process.exit(0);
}, (err) => {
  console.log(JSON.stringify({ ok: false, err: String(err && err.message || err) }));
  process.exit(1);
});
