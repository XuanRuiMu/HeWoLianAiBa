// FP-03 沙盒验证：吴昊阳 3D glb 接入草地引擎渲染全链路
// 验收四项：①模型可见（贴图非纯白/纯黑）②接地阴影 ③前景草遮挡 ④过滤后 error=0
// 参考 沙盒/验证截图.mjs 写法；已知噪音：g5.addSamplingWeights TypeError、PBO 警告
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const 任_根 = 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/吴昊阳3D模型glm5.3flash'
const 任_沙盒 = 任_根 + '/沙盒'
const 任_证据 = 任_根 + '/evidence/traces'
const 任_playwright = 'file:///D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/frontend/node_modules/playwright/index.mjs'
const 任_chrome = 'C:\\Users\\xuanr\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe'
const 址_首页 = 'http://localhost:8777/'

mkdirSync(任_证据, { recursive: true })

// 已知噪音过滤（错误级）：addSamplingWeights TypeError、PBO 警告
const 噪音规则 = [
    /addSamplingWeights/i,
    /PBO/i,
]
function 过滤(列表) {
    return (列表 || []).filter(t => !噪音规则.some(r => r.test(t)))
}

const { chromium } = await import(任_playwright)

const 结 = {
    任务: 'FP-03', 时间: new Date().toISOString(),
    服务器可达: false, iframe3D模式: null, 模型就绪: null,
    画布不透明度: null, 状态3D: null, 锚点: null, 投影: null,
    模型可见: { 通过: false, 数据: null },
    阴影: { 通过: false, 数据: null },
    草遮挡: { 通过: false, 数据: null },
    错误: { 原始数: 0, 过滤后数: 0, 过滤后列表: [], 噪音已滤: [] },
    耗时: {}, 结论: 'FAIL', 失败原因: []
}
const t0 = Date.now()
function 计时(名) { 结.耗时[名] = ((Date.now() - t0) / 1000).toFixed(1) + 's' }

// ---- 像素统计（页面内解码 PNG buffer，返回区域亮度统计）----
async function 像素统计(页, 缓冲, 区) {
    const b64 = 缓冲.toString('base64')
    return await 页.evaluate(async ({ b64, 区 }) => {
        const img = new Image()
        img.src = 'data:image/png;base64,' + b64
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.width; c.height = img.height
        const g = c.getContext('2d', { willReadFrequently: true })
        g.drawImage(img, 0, 0)
        const x0 = Math.max(0, Math.floor(区.x0)), y0 = Math.max(0, Math.floor(区.y0))
        const x1 = Math.min(c.width, Math.ceil(区.x1)), y1 = Math.min(c.height, Math.ceil(区.y1))
        const w = x1 - x0, h = y1 - y0
        if (w <= 0 || h <= 0) return { 面积: 0 }
        const d = g.getImageData(x0, y0, w, h).data
        let sum = 0, sum2 = 0, 白 = 0, 黑 = 0, n = 0
        for (let i = 0; i < d.length; i += 4) {
            const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
            sum += l; sum2 += l * l; n++
            if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) 白++
            if (d[i] < 10 && d[i + 1] < 10 && d[i + 2] < 10) 黑++
        }
        const mean = sum / n
        return {
            面积: n, 宽: w, 高: h, 均值亮度: +mean.toFixed(2),
            标准差: +Math.sqrt(Math.max(0, sum2 / n - mean * mean)).toFixed(2),
            纯白占比: +(白 / n).toFixed(4), 纯黑占比: +(黑 / n).toFixed(4)
        }
    }, { b64, 区 })
}

// ---- 差分（两个 PNG buffer 在区域内按通道差 > 阈值计像素）----
async function 像素差分(页, 缓冲A, 缓冲B, 区, 阈) {
    const a64 = 缓冲A.toString('base64'), b64 = 缓冲B.toString('base64')
    return await 页.evaluate(async ({ a64, b64, 区, 阈 }) => {
        const 载 = async (b64) => {
            const img = new Image()
            img.src = 'data:image/png;base64,' + b64
            await img.decode()
            return img
        }
        const A = await 载(a64), B = await 载(b64)
        const c = document.createElement('canvas')
        c.width = A.width; c.height = A.height
        const g = c.getContext('2d', { willReadFrequently: true })
        g.drawImage(A, 0, 0)
        const dA = g.getImageData(0, 0, c.width, c.height).data
        g.clearRect(0, 0, c.width, c.height)
        g.drawImage(B, 0, 0)
        const dB = g.getImageData(0, 0, c.width, c.height).data
        const x0 = Math.max(0, Math.floor(区.x0)), y0 = Math.max(0, Math.floor(区.y0))
        const x1 = Math.min(c.width, Math.ceil(区.x1)), y1 = Math.min(c.height, Math.ceil(区.y1))
        let n = 0, 总 = 0
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = (y * c.width + x) * 4
                const 差 = Math.max(Math.abs(dA[i] - dB[i]), Math.abs(dA[i + 1] - dB[i + 1]), Math.abs(dA[i + 2] - dB[i + 2]))
                总++
                if (差 > 阈) n++
            }
        }
        return { 区域像素: 总, 差异像素: n }
    }, { a64, b64, 区, 阈 })
}

let 浏览器 = null
try {
    // ---- 0. 服务器可达性（含 glb 路径，验证中文文件名解码）----
    const 探 = await fetch('http://localhost:8777/grass-bg/models/wuhaoyang-3d-%E5%8D%A0%E4%BD%8D.glb', { method: 'HEAD' })
    结.服务器可达 = 探.ok
    if (!探.ok) throw new Error('服务器不可达或 glb 404: ' + 探.status)
    console.log('[验证] 服务器可达，glb HTTP', 探.status)

    浏览器 = await chromium.launch({
        headless: true, executablePath: 任_chrome,
        args: ['--use-gl=angle', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--no-sandbox']
    })
    const 页 = await 浏览器.newPage({ viewport: { width: 1280, height: 720 } })

    // ---- 错误采集（只拦 error；噪音单独归档）----
    const 错误原始 = []
    页.on('console', m => { if (m.type() === 'error') 错误原始.push(m.text()) })
    页.on('pageerror', e => 错误原始.push('pageerror: ' + e.message +
        (e.stack ? '  栈:' + e.stack.split('\n').filter(Boolean).slice(1, 4).join(' | ') : '')))

    // ---- 1. 进 harness；路由拦截把 harness 的 iframe 首载 URL 直接改写为 ?wu3d=1。
    //         旧法"先无参加载再改 src"会销毁启动中的首文档，其引擎初始化竞态
    //         曾抛出唯一 pageerror（reading 'geometry'）——单次加载从根上消除。 ----
    await 页.route('**/grass-bg/grass-bg.html',
        r => r.continue({ url: 'http://localhost:8777/grass-bg/grass-bg.html?wu3d=1' }))
    await 页.goto(址_首页, { waitUntil: 'load', timeout: 60000 })
    await 页.waitForFunction(() => window.THREE && window.GLTFLoader && document.getElementById('caodiIframe'),
        null, { timeout: 30000 })
    计时('加载')

    // ---- 2. 等 3D 模式生效 + 模型就绪（57MB 本地加载）----
    let 帧 = null
    for (let i = 0; i < 120; i++) {
        帧 = 页.frames().find(f => /grass-bg\.html\?wu3d=1/.test(f.url()))
        if (帧) {
            const ok = await 帧.evaluate(() => window.__wuMoShi3D === true).catch(() => false)
            if (ok) break
        }
        await 页.waitForTimeout(500)
    }
    if (!帧) throw new Error('未找到 ?wu3d=1 的 iframe')
    结.iframe3D模式 = await 帧.evaluate(() => window.__wuMoShi3D === true)
    console.log('[验证] 3D 模式激活:', 结.iframe3D模式)

    await 帧.waitForFunction(() => window.__wu3DYiJiuXu === true, null, { timeout: 120000 })
    结.模型就绪 = true
    计时('模型加载')
    console.log('[验证] 3D 模型就绪')

    // 等 2D 贴图也就绪（保证 plane 存在 → 不透明度驱动链完整）+ 揭露推进
    await 帧.waitForFunction(() => window.__wuOverlayReady === true, null, { timeout: 30000 }).catch(() => {})
    await 帧.waitForFunction(() => (window.__wuTouMingDu || 0) >= 0.9, null, { timeout: 60000 })
        .catch(() => { 结.失败原因.push('画布不透明度未达 0.9') })
    结.画布不透明度 = await 帧.evaluate(() => window.__wuTouMingDu || 0)
    结.状态3D = await 帧.evaluate(() => window.__wu3DZhuangTai ? window.__wu3DZhuangTai() : null)
    结.锚点 = await 帧.evaluate(() => window.__wuPEIZHI || null)
    计时('揭露')
    console.log('[验证] 不透明度:', 结.画布不透明度, '状态3D:', JSON.stringify(结.状态3D))

    // 等草遮挡克隆构建完成（无头软渲染帧率低，90 个节流帧可能超 45s，放宽到 90s）
    await 帧.waitForFunction(() => window.__wu3DZhuangTai && window.__wu3DZhuangTai().zheDangKeLongShu > 0,
        null, { timeout: 90000 }).catch(() => { 结.失败原因.push('草遮挡克隆未构建') })
    结.状态3D = await 帧.evaluate(() => window.__wu3DZhuangTai())
    计时('遮挡克隆')
    console.log('[验证] 草遮挡克隆:', 结.状态3D.zheDangKeLongShu, '个')

    // ---- 3. 模型投影区（iframe NDC → 父页屏幕像素；iframe 满窗口 offset≈0，仍实测）----
    结.投影 = await 帧.evaluate(() => window.__wu3DTouYing ? window.__wu3DTouYing() : null)
    const 框 = await 页.$eval('#caodiIframe', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    const P = 结.投影
    const 区 = {
        x0: 框.x + P.ndcX0 * 框.w, y0: 框.y + P.ndcY0 * 框.h,
        x1: 框.x + P.ndcX1 * 框.w, y1: 框.y + P.ndcY1 * 框.h
    }
    // 区域外扩少许（抗锯齿/阴影边缘），并夹紧到屏幕
    区.x0 = Math.max(0, 区.x0 - 12); 区.y0 = Math.max(0, 区.y0 - 12)
    区.x1 = Math.min(1280, 区.x1 + 12); 区.y1 = Math.min(720, 区.y1 + 12)
    console.log('[验证] 模型屏幕区:', JSON.stringify(区))

    // ---- 4. 验收①：模型可见截图 + 像素证据 ----
    await 页.waitForTimeout(800) // 等风摆/揭露稳定
    const 图_模型 = await 页.screenshot({ type: 'png' })
    writeFileSync(任_证据 + '/fp03-模型可见.png', 图_模型)
    const 模型统计 = await 像素统计(页, 图_模型, 区)
    结.模型可见.数据 = 模型统计
    结.模型可见.通过 = !!(
        结.状态3D && 结.状态3D.yiJiuXu && 模型统计.面积 > 1500 &&
        模型统计.均值亮度 > 30 && 模型统计.均值亮度 < 225 &&
        模型统计.标准差 > 12 &&
        模型统计.纯白占比 < 0.85 && 模型统计.纯黑占比 < 0.85
    )
    计时('模型可见证据')
    console.log('[验证] 模型可见:', 结.模型可见.通过, JSON.stringify(模型统计))

    // ---- 5. 验收②：接地阴影（阴影片开关差分为主证，亮度对照为辅）----
    const 阴影区 = { x0: 区.x0 + 10, y0: Math.max(0, 区.y1 - 110), x1: 区.x1 - 10, y1: Math.min(716, 区.y1) }
    await 页.waitForTimeout(300)
    const 图_阴开1 = await 页.screenshot({ type: 'png' })
    const 图_阴开2 = await 页.screenshot({ type: 'png' }) // 基线噪音对：同为阴开，仅风摆差异
    const 基线阴 = await 像素差分(页, 图_阴开1, 图_阴开2, 阴影区, 12)
    await 帧.evaluate(() => window.__wu3DYingMian(false))
    await 页.waitForTimeout(450)
    const 图_阴关 = await 页.screenshot({ type: 'png' })
    writeFileSync(任_证据 + '/fp03-阴影-关闭.png', 图_阴关)
    await 帧.evaluate(() => window.__wu3DYingMian(true))
    await 页.waitForTimeout(450)
    const 图_阴影 = await 页.screenshot({ type: 'png' })
    writeFileSync(任_证据 + '/fp03-阴影.png', 图_阴影)
    const 阴差 = await 像素差分(页, 图_阴影, 图_阴关, 阴影区, 12)
    const 阴亮 = await 像素统计(页, 图_阴影, 阴影区)
    const 照L = await 像素统计(页, 图_阴影, { x0: Math.max(0, 区.x0 - 130), y0: 阴影区.y0, x1: Math.max(0, 区.x0 - 30), y1: 阴影区.y1 })
    const 照R = await 像素统计(页, 图_阴影, { x0: Math.min(1280, 区.x1 + 30), y0: 阴影区.y0, x1: Math.min(1280, 区.x1 + 130), y1: 阴影区.y1 })
    const 阴影降幅 = (照L.面积 && 照R.面积 ? (照L.均值亮度 + 照R.均值亮度) / 2 : (照L.面积 ? 照L.均值亮度 : 照R.均值亮度)) - 阴亮.均值亮度
    结.阴影.数据 = {
        阴影开关_差异像素: 阴差.差异像素, 基线噪音对_差异像素: 基线阴.差异像素,
        区域像素: 阴差.区域像素, 差异通道阈值: 12,
        阴影带亮度: 阴亮.均值亮度, 对照左亮度: 照L.均值亮度, 对照右亮度: 照R.均值亮度,
        阴影降幅: +阴影降幅.toFixed(2),
        yingMian钩子: await 帧.evaluate(() => window.__wu3DYingMian ? window.__wu3DYingMian(true) : false)
    }
    结.阴影.通过 = 结.阴影.数据.yingMian钩子 === true && 结.状态3D && 结.状态3D.yingMian &&
        阴差.差异像素 > 300 && 阴差.差异像素 > 基线阴.差异像素 * 3
    计时('阴影证据')
    console.log('[验证] 阴影:', 结.阴影.通过, '开关差', 阴差.差异像素, '基线差', 基线阴.差异像素, '降幅', 阴影降幅.toFixed(1))

    // ---- 6. 验收③：草遮挡（遮挡开→关→开 差分，扣除基线噪音对）----
    const 差阈 = 12
    await 页.waitForTimeout(300)
    const 图_遮挡开1 = await 页.screenshot({ type: 'png' })
    const 图_遮挡开2 = await 页.screenshot({ type: 'png' }) // 基线噪音对：同为遮挡开，仅风摆差异
    const 基线 = await 像素差分(页, 图_遮挡开1, 图_遮挡开2, 区, 差阈)
    await 帧.evaluate(() => window.__wu3DZheDang(false))
    await 页.waitForTimeout(450)
    const 图_遮挡关 = await 页.screenshot({ type: 'png' })
    writeFileSync(任_证据 + '/fp03-草遮挡-关闭.png', 图_遮挡关)
    await 帧.evaluate(() => window.__wu3DZheDang(true))
    await 页.waitForTimeout(450)
    const 图_遮挡开3 = await 页.screenshot({ type: 'png' })
    writeFileSync(任_证据 + '/fp03-草遮挡.png', 图_遮挡开3)
    writeFileSync(任_证据 + '/fp03-草遮挡-开启.png', 图_遮挡开3)
    const 差关开 = await 像素差分(页, 图_遮挡开3, 图_遮挡关, 区, 差阈)
    结.草遮挡.数据 = {
        基线噪音对_差异像素: 基线.差异像素,
        遮挡开关_差异像素: 差关开.差异像素,
        区域像素: 差关开.区域像素, 差异通道阈值: 差阈,
        克隆草块数: 结.状态3D.zheDangKeLongShu
    }
    结.草遮挡.通过 = 结.状态3D.zheDangKeLongShu > 0 &&
        差关开.差异像素 > 300 && 差关开.差异像素 > 基线.差异像素 * 3
    计时('遮挡证据')
    console.log('[验证] 草遮挡:', 结.草遮挡.通过, '开关差', 差关开.差异像素, '基线差', 基线.差异像素)

    // ---- 7. 错误过滤统计 ----
    结.错误.原始数 = 错误原始.length
    结.错误.过滤后列表 = 过滤(错误原始)
    结.错误.过滤后数 = 结.错误.过滤后列表.length
    结.错误.噪音已滤 = 错误原始.filter(t => !结.错误.过滤后列表.includes(t))
    console.log('[验证] 错误: 原始', 结.错误.原始数, '过滤后', 结.错误.过滤后数)
    if (结.错误.过滤后数) console.log('[验证] 过滤后错误明细:', JSON.stringify(结.错误.过滤后列表, null, 2))

    // ---- 8. 结论 ----
    const 各项 = {
        模型可见: 结.模型可见.通过, 阴影: 结.阴影.通过,
        草遮挡: 结.草遮挡.通过, 错误为零: 结.错误.过滤后数 === 0,
        模型就绪: 结.模型就绪 === true, 遮挡克隆: 结.状态3D && 结.状态3D.zheDangKeLongShu > 0
    }
    结.各项验收 = 各项
    结.结论 = Object.values(各项).every(Boolean) ? 'PASS' : 'FAIL'
    if (结.结论 === 'FAIL') {
        for (const k in 各项) if (!各项[k]) 结.失败原因.push('未通过: ' + k)
    }
} catch (e) {
    结.结论 = 'FAIL'
    结.失败原因.push('异常: ' + (e && e.message || e))
    console.error('[验证] 异常:', e)
} finally {
    计时('总耗时')
    writeFileSync(任_根 + '/evidence/traces/fp03验证.json', JSON.stringify(结, null, 2))
    console.log('[验证] 结论:', 结.结论, '→ evidence/traces/fp03验证.json')
    if (浏览器) await 浏览器.close()
    process.exit(结.结论 === 'PASS' ? 0 : 1)
}
