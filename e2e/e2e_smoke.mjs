import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const jieGuo = []
const luYouLieBiao = [
  { ming: 'dengLu', url: 'http://localhost:5173/login' },
  { ming: 'zhuCe', url: 'http://localhost:5173/login?mode=register' },
]

const jieTuMuLu = path.resolve('..', '测试截图')
fs.mkdirSync(jieTuMuLu, { recursive: true })

const liuLanQi = await chromium.launch()
const ye = await liuLanQi.newPage()
ye.on('pageerror', (cuoWu) => jieGuo.push(`JS错误[${ye.url()}]: ${cuoWu.message}`))

for (const xiang of luYouLieBiao) {
  const xiangYing = await ye.goto(xiang.url, { waitUntil: 'networkidle', timeout: 30000 })
  if (!xiangYing || xiangYing.status() >= 400) {
    jieGuo.push(`${xiang.ming}: HTTP ${xiangYing ? xiangYing.status() : 'null'}`)
  }
  await ye.waitForTimeout(1500)
  await ye.screenshot({ path: path.join(jieTuMuLu, `E2E_${xiang.ming}.png`), fullPage: false })
  jieGuo.push(`${xiang.ming}: 截图完成`)
}

await liuLanQi.close()

fs.writeFileSync(path.join(jieTuMuLu, 'E2E_冒烟结果.txt'), jieGuo.join('\n'), 'utf8')
console.log(jieGuo.join('\n'))
