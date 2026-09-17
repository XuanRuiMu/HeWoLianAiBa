// FP-03 引擎注入测试服务器：/ 服务 frontend/public（只读），/wu3d/* 服务本任务目录
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PUB = "D:\\xuanr\\Desktop\\燃烧之陨我的世界服务端\\和我恋爱吧\\frontend\\public";
const WU = "D:\\xuanr\\Desktop\\燃烧之陨我的世界服务端\\和我恋爱吧\\吴昊阳3D模型qwen3.8flash";
const PORT = Number(process.env.PORT || 5201);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css", ".json": "application/json", ".glb": "model/gltf-binary",
  ".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f;
  if (p.startsWith("/wu3d/")) f = normalize(join(WU, p.slice(6)));
  else if (p === "/ceShiZiYuan/wu3d-pazi.glb") f = normalize(join(WU, "吴昊阳趴姿.glb"));
  else f = normalize(join(PUB, p === "/" ? "grass-bg/grass-bg.html" : p));
  if (!f.startsWith(PUB) && !f.startsWith(WU)) { res.writeHead(403); res.end("403"); return; }
  try {
    const buf = await readFile(f);
    res.writeHead(200, { "Content-Type": MIME[extname(f).toLowerCase()] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end("404 " + p);
  }
}).listen(PORT, "127.0.0.1", () => console.log("TESTSRV " + PORT));
