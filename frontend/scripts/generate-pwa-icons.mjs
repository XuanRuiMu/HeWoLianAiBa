import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

mkdirSync(publicDir, { recursive: true })

async function generateIcon(size, filename) {
  const svgBuffer =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B9D"/>
      <stop offset="100%" style="stop-color:#FF8E53"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="${size * 0.45}" font-weight="bold" font-family="sans-serif">恋</text>
</svg>`)

  await sharp(svgBuffer).png().toFile(join(publicDir, filename))
  console.warn(`已生成: ${filename} (${size}x${size})`)
}

await generateIcon(192, 'pwa-192x192.png')
await generateIcon(512, 'pwa-512x512.png')
console.warn('PWA 图标生成完成')
