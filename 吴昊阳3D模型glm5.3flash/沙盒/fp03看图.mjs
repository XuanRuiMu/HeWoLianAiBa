// FP-03 临时看图：解码上次验证截图，输出亮度网格 + 关键区域色彩统计（用后即删）
import { readFileSync } from 'node:fs'
const 任_playwright = 'file:///D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/frontend/node_modules/playwright/index.mjs'
const 任_chrome = 'C:\\Users\\xuanr\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe'
const { chromium } = await import(任_playwright)
const 图 = readFileSync('D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/吴昊阳3D模型glm5.3flash/evidence/traces/fp03-模型可见.png').toString('base64')
const 图2 = readFileSync('D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/吴昊阳3D模型glm5.3flash/evidence/traces/fp03-阴影.png').toString('base64')
const b = await chromium.launch({ headless: true, executablePath: 任_chrome, args: ['--no-sandbox'] })
const p = await b.newPage()
const 出 = await p.evaluate(async ({ a, b: b2 }) => {
    function 解(b64) {
        return new Promise((res, rej) => {
            const img = new Image(); img.onload = () => res(img); img.onerror = rej
            img.src = 'data:image/png;base64,' + b64
        })
    }
    const img = await 解(a), img2 = await 解(b2)
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    const W = img.width, H = img.height
    const 亮度 = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    // 16x9 网格
    let 网格 = ''
    const 桶 = ' .:-=+*#%@'
    for (let gy = 0; gy < 9; gy++) {
        for (let gx = 0; gx < 16; gx++) {
            let s = 0, n = 0
            for (let y = gy * H / 9; y < (gy + 1) * H / 9; y += 4)
                for (let x = gx * W / 16; x < (gx + 1) * W / 16; x += 4) { s += 亮度(((y | 0) * W + (x | 0)) * 4); n++ }
            const m = s / n
            网格 += 桶[Math.min(9, Math.floor(m / 128 * 10))]
        }
        网格 += '\n'
    }
    // 区域统计：模型区 / 底部带 / 对照左右 / 整图
    function 区统计(x0, y0, x1, y1, 名) {
        x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(W, x1 | 0); y1 = Math.min(H, y1 | 0)
        let s = 0, n = 0, 亮 = 0, 绿 = 0, 暖 = 0, rS = 0, gS = 0, bS = 0, s2 = 0
        for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
            const i = (y * W + x) * 4
            const l = 亮度(i), r = d[i], gg = d[i + 1], bb = d[i + 2]
            s += l; s2 += l * l; n++
            rS += r; gS += gg; bS += bb
            if (l > 90) 亮++
            if (gg > r + 15 && gg > bb + 15) 绿++
            if (r > bb + 20 && r > 60) 暖++
        }
        const m = s / n
        return { 名, 均值: +m.toFixed(1), 标准差: +Math.sqrt(Math.max(0, s2 / n - m * m)).toFixed(1), 亮像素占比: +(亮 / n).toFixed(3), 绿像素占比: +(绿 / n).toFixed(3), 暖像素占比: +(暖 / n).toFixed(3), 均色: [Math.round(rS / n), Math.round(gS / n), Math.round(bS / n)], 面积: n }
    }
    const 模型区 = 区统计(919, 362, 1127, 720, '模型区(y362-720)')
    const 模型上 = 区统计(919, 362, 1127, 540, '模型上半(y362-540)')
    const 模型下 = 区统计(919, 540, 1127, 720, '模型下半(y540-720)')
    const 底带 = 区统计(950, 694, 1094, 720, '阴影带(y694-720)')
    const 照L = 区统计(789, 694, 889, 720, '对照左')
    const 照R = 区统计(1154, 694, 1254, 720, '对照右')
    // 模型区行剖面：每 24px 行带的均值亮度+绿占比（判断模型从哪行开始、底部到哪）
    const 剖 = []
    for (let y = 340; y < 720; y += 24) {
        const st = 区统计(919, y, 1127, y + 24, '')
        剖.push('y' + y + '-' + (y + 24) + ' 亮度' + st.均值 + ' 绿' + st.绿像素占比 + ' 暖' + st.暖像素占比)
    }
    // 阴影图与模型图全图差分（是否同一画面）
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H
    const g2 = c2.getContext('2d', { willReadFrequently: true })
    g2.drawImage(img2, 0, 0)
    const d2 = g2.getImageData(0, 0, W, H).data
    let 差 = 0, 总 = 0
    for (let i = 0; i < d.length; i += 16) { 总++; if (Math.abs(d[i] - d2[i]) > 12) 差++ }
    return { W, H, 网格, 模型区, 模型上, 模型下, 底带, 照L, 照R, 剖面: 剖, 阴影图与模型图差异像素: 差 + '/' + 总 }
}, { a: 图, b: 图2 })
console.log(JSON.stringify(出, null, 1))
await b.close()
