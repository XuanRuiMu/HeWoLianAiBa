// FP-01 沙盒验证：草地场景渲染 + window.THREE 暴露链 + 控制台error检查 + 截图落盘
// 运行: node 沙盒/验证截图.mjs
const { chromium } = await import('file://' + encodeURI('D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/frontend/node_modules/playwright/index.mjs'))
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const 沙盒根 = dirname(fileURLToPath(import.meta.url))
const 证据目录 = join(沙盒根, '..', 'evidence', 'traces')
mkdirSync(证据目录, { recursive: true })

const 浏览器 = await chromium.launch({ executablePath: 'C:\\Users\\xuanr\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe' })
const 页 = await 浏览器.newPage({ viewport: { width: 1280, height: 720 } })
const 控制台错误 = []
页.on('console', (m) => { if (m.type() === 'error') 控制台错误.push(m.text()) })
页.on('pageerror', (e) => 控制台错误.push('PAGEERROR: ' + e.message))
const 网络失败 = []
页.on('response', (r) => { if (r.status() >= 400) 网络失败.push(r.status() + ' ' + r.url()) })

await 页.goto('http://localhost:8777/', { waitUntil: 'load' })

// 等 iframe 出现并定位
const iframe元素 = await 页.waitForSelector('#caodiIframe', { timeout: 15000 })
const frame = await iframe元素.contentFrame()

// 等 WebGL canvas 出现（草地引擎初始化完成的标志）
let canvas信息 = null
try {
  await frame.waitForSelector('canvas', { timeout: 20000 })
  canvas信息 = await frame.evaluate(() => {
    const c = document.querySelector('canvas')
    return { 存在: true, 宽: c.clientWidth, 高: c.clientHeight, 数量: document.querySelectorAll('canvas').length }
  })
} catch { canvas信息 = { 存在: false } }

// 给引擎留渲染时间（草生长动画/资源加载）
await 页.waitForTimeout(6000)

const 断言 = await 页.evaluate(() => ({
  父页THREE: typeof window.THREE !== 'undefined',
  父页GLTFLoader: typeof window.GLTFLoader !== 'undefined',
  父页three版本: window.THREE ? window.THREE.REVISION : null,
}))
const iframe断言 = await frame.evaluate(() => {
  const 覆盖画布 = document.getElementById('wuhaoyang-overlay')
  return {
    parentTHREE版本: window.parent.THREE ? window.parent.THREE.REVISION : null,
    wuXuanRanQiHuoZai: window.__wuXuanRanQiHuoZai === true,
    wuPEIZHI存在: !!window.__wuPEIZHI,
    wuPEIZHI: window.__wuPEIZHI || null,
    覆盖画布存在: !!覆盖画布,
    wuD存在: !!window.__wuD,
    wu状态: window.__wuD ? window.__wuD.state() : null,
    静态图存在: !!window.__wuJingTaiTu,
  }
})

const 截图路径 = join(证据目录, 'fp01-沙盒草地.png')
await 页.screenshot({ path: 截图路径, fullPage: false })

const 摘要 = {
  canvas信息, 断言, iframe断言,
  网络失败,
  控制台错误数量: 控制台错误.length,
  控制台错误样例: 控制台错误.slice(0, 5),
  截图: 截图路径,
  结论: canvas信息.存在 && 断言.父页THREE && 断言.父页three版本 === '186' && iframe断言.wuXuanRanQiHuoZai && iframe断言.wuPEIZHI存在 && iframe断言.覆盖画布存在 && 控制台错误.length === 0 ? 'FP01_SANDBOX_PASS' : 'FP01_SANDBOX_FAIL',
}
writeFileSync(join(证据目录, 'fp01-沙盒验证.json'), JSON.stringify(摘要, null, 1))
console.log(JSON.stringify(摘要, null, 1))
await 浏览器.close()
process.exit(摘要.结论 === 'FP01_SANDBOX_PASS' ? 0 : 1)
