// FP-03 诊断：pageerror 堆栈 / 引擎场景结构 / 相机同步 / 亮度网格
import { writeFileSync } from 'node:fs'

const 任_根 = 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/吴昊阳3D模型glm5.3flash'
const 任_chrome = 'C:\\Users\\xuanr\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe'
const 任_playwright = 'file:///D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/frontend/node_modules/playwright/index.mjs'
const { chromium } = await import(任_playwright)

const 浏览器 = await chromium.launch({
    headless: true, executablePath: 任_chrome,
    args: ['--use-gl=angle', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--no-sandbox']
})
const 页 = await 浏览器.newPage({ viewport: { width: 1280, height: 720 } })
页.on('pageerror', e => { console.log('[pageerror]', e.message); if (e.stack) console.log('[stack]\n' + e.stack.split('\n').slice(0, 12).join('\n')) })
页.on('console', m => { if (m.type() === 'error' && !/addSamplingWeights|PBO/i.test(m.text())) console.log('[console.error]', m.text()) })

await 页.goto('http://localhost:8777/', { waitUntil: 'load', timeout: 60000 })
await 页.waitForFunction(() => window.THREE && window.GLTFLoader && document.getElementById('caodiIframe'), null, { timeout: 30000 })
await 页.evaluate(() => { document.getElementById('caodiIframe').src = './grass-bg/grass-bg.html?wu3d=1' })
let 帧 = null
for (let i = 0; i < 120; i++) {
    帧 = 页.frames().find(f => /grass-bg\.html\?wu3d=1/.test(f.url()))
    if (帧 && await 帧.evaluate(() => window.__wuMoShi3D === true).catch(() => false)) break
    await 页.waitForTimeout(500)
}
await 帧.waitForFunction(() => window.__wu3DYiJiuXu === true, null, { timeout: 120000 })
await 帧.waitForFunction(() => (window.__wuTouMingDu || 0) >= 0.9, null, { timeout: 60000 }).catch(() => {})
// 首个克隆尝试在模型就绪后约 90 个节流帧（≈3s）；等 14s 确保 pageerror 有机会抛出
for (let i = 0; i < 14; i++) { await 页.waitForTimeout(1000); process.stdout.write('.'); }
console.log('')
await 页.waitForTimeout(500)

// 1. 引擎场景结构
const 场景 = await 帧.evaluate(() => {
    const exp = window.__experience
    const out = { instanced: [], 普通Mesh带Uniforms: [], sceneChildren: exp.engine.scene.children.map(c => (c.type || '?') + ':' + (c.name || '?')).slice(0, 40) }
    exp.engine.scene.traverse(o => {
        if (o.isInstancedMesh) {
            out.instanced.push({
                name: o.name || '(匿名)', count: o.count,
                attrs: Object.keys(o.geometry.attributes || {}).slice(0, 10),
                matType: o.material && o.material.type,
                uniKeys: o.material && o.material.uniforms ? Object.keys(o.material.uniforms).slice(0, 24) : null,
                posxz: [+o.matrixWorld.elements[12].toFixed(2), +o.matrixWorld.elements[14].toFixed(2)],
                可克隆判定: !!(o.material && o.material.uniforms && (o.material.uniforms.uBendingTexture || o.material.uniforms.uBendTexture || o.material.uniforms.uCharStrength))
            })
        } else if (o.isMesh && o.material && o.material.uniforms) {
            out.普通Mesh带Uniforms.push({
                name: o.name || '(匿名)', matType: o.material.type,
                uniKeys: Object.keys(o.material.uniforms).slice(0, 24),
                是草着色器: !!(o.material.uniforms.uCharStrength || o.material.uniforms.uBendingTexture || o.material.uniforms.uBendTexture)
            })
        }
    })
    out.instanced = out.instanced.slice(0, 12)
    out.普通Mesh带Uniforms = out.普通Mesh带Uniforms.slice(0, 12)
    return out
})
console.log('[场景] instancedMesh 数:', 场景.instanced.length, '普通带uniforms:', 场景.普通Mesh带Uniforms.length)
console.log('[场景]', JSON.stringify(场景, null, 1))

// 2. 相机同步核对：引擎相机投影锚点 vs 覆盖层 TouYing 中心
const 相机 = await 帧.evaluate(() => {
    const exp = window.__experience
    const cam = exp.engine.camera.instance
    const PT = window.parent.THREE
    const v = new PT.Vector3(5.05, 0.58, 3.0928).project(cam)
    const ty = window.__wu3DTouYing()
    return {
        引擎NDC: [+v.x.toFixed(3), +v.y.toFixed(3)],
        TouYing: ty,
        引擎相机位: [+cam.position.x.toFixed(2), +cam.position.y.toFixed(2), +cam.position.z.toFixed(2)]
    }
})
console.log('[相机]', JSON.stringify(相机))

// 3. 亮度网格图（16×9，全帧）
const 图 = await 页.screenshot({ type: 'png' })
const 网格 = await 页.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0)
    const W = c.width, H = c.height, GX = 16, GY = 9, 行 = []
    const d = g.getImageData(0, 0, W, H).data
    for (let gy = 0; gy < GY; gy++) {
        let s = ''
        for (let gx = 0; gx < GX; gx++) {
            let sum = 0, n = 0
            for (let y = Math.floor(gy * H / GY); y < Math.floor((gy + 1) * H / GY); y += 3)
                for (let x = Math.floor(gx * W / GX); x < Math.floor((gx + 1) * W / GX); x += 3) {
                    const i = (y * W + x) * 4
                    sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++
                }
            const m = sum / n
            s += m < 20 ? ' .' : m < 45 ? '::' : m < 80 ? '++' : m < 130 ? '##' : '@@'
        }
        行.push(s)
    }
    return 行.join('\n')
}, 图.toString('base64'))
console.log('[亮度网格] (.:暗 ::较暗 ++中 ##亮 @@很亮)')
console.log(网格)
writeFileSync(任_根 + '/evidence/traces/fp03-诊断截图.png', 图)

// 4. __wuD 状态与日志能力
const wud = await 帧.evaluate(() => {
    const w = window.__wuD
    if (!w) return null
    const s = w.state ? w.state() : null
    return { keys: Object.keys(w), state: s }
})
console.log('[__wuD]', JSON.stringify(wud))

// 5. 手动复刻遮挡克隆判定（找锚点5米内可克隆对象）
const 判定 = await 帧.evaluate(() => {
    const exp = window.__experience
    const ax = 5.05, az = 3.0928, banJing = 5
    let 总instanced = 0, 近处 = [], 有草Uniforms = 0
    exp.engine.scene.traverse(o => {
        if (!o.isInstancedMesh) return
        总instanced++
        const uni = o.material && o.material.uniforms
        const shiCao = !!(uni && (uni.uBendingTexture || uni.uBendTexture || uni.uCharStrength))
        if (shiCao) 有草Uniforms++
        if (!o.boundingSphere && o.computeBoundingSphere) { try { o.computeBoundingSphere() } catch (e) {} }
        const w = o.matrixWorld.elements
        const dx = (o.boundingSphere ? o.boundingSphere.center.x + w[12] : w[12]) - ax
        const dz = (o.boundingSphere ? o.boundingSphere.center.z + w[14] : w[14]) - az
        const juli = Math.sqrt(dx * dx + dz * dz) - (o.boundingSphere ? o.boundingSphere.radius : 0)
        if (juli <= banJing) 近处.push({ name: o.name || '(匿名)', count: o.count, shiCao, juli: +juli.toFixed(2) })
    })
    return { 总instanced, 有草Uniforms, 近处: 近处.slice(0, 10) }
})
console.log('[遮挡判定]', JSON.stringify(判定))

// 6. 3D 分支状态 + 覆盖层/引擎心跳（冻结检测：两次截图字节级一致 = 引擎/页面停摆）
const zt = await 帧.evaluate(() => ({
    zhuangTai: window.__wu3DZhuangTai ? window.__wu3DZhuangTai() : null,
    xinTiao: window.__wuTickXinTiao || 0,
    logs: (window.__wuD && window.__wuD.logs || []).slice(-12)
}))
console.log('[3D状态]', JSON.stringify(zt, null, 1))
const 图A = await 页.screenshot({ type: 'png' })
await 页.waitForTimeout(1200)
const 图B = await 页.screenshot({ type: 'png' })
console.log('[冻结检测] A=', 图A.length, 'B=', 图B.length, '一致=', 图A.length === 图B.length && 图A.equals(图B))

await 浏览器.close()
console.log('[诊断] 完成')
