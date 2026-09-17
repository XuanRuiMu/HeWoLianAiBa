// 沙盒静态服务器：根=本文件所在目录，端口 8777
import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const 根目录 = fileURLToPath(new URL('.', import.meta.url))
const 端口 = 8777
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2',
  '.basis': 'image/basis', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
}

http.createServer((req, res) => {
  try {
    let 路径 = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (路径.endsWith('/')) 路径 += 'index.html'
    const 绝对 = normalize(join(根目录, 路径))
    if (!绝对.startsWith(normalize(根目录))) { res.writeHead(403); return res.end() }
    if (!existsSync(绝对) || statSync(绝对).isDirectory()) { res.writeHead(404); return res.end('404 ' + 路径) }
    res.writeHead(200, { 'Content-Type': MIME[extname(绝对).toLowerCase()] || 'application/octet-stream' })
    createReadStream(绝对).pipe(res)
  } catch (e) { res.writeHead(500); res.end(String(e)) }
}).listen(端口, () => console.log(`[沙盒服务器] http://localhost:${端口}/ 根=${根目录}`))
