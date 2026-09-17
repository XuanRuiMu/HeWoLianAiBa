// 任务目录静态服务器（FP-02 预览/冒烟共用）；端口默认 5199，避开 5173
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const PORT = Number(process.env.PORT || 5199);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json",
  ".glb": "model/gltf-binary", ".wasm": "application/wasm", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const f = normalize(join(ROOT, p === "/" ? "preview.html" : p));
  if (!f.startsWith(ROOT)) { res.writeHead(403); res.end("403"); return; }
  try {
    const buf = await readFile(f);
    res.writeHead(200, { "Content-Type": MIME[extname(f).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end("404 " + p);
  }
}).listen(PORT, "127.0.0.1", () => console.log("STATIC " + PORT + " root=" + ROOT));
