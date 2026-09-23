import { expect, test, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createConsoleCollector } from './console-error-collector'

// FP-23 / FP-24a 真机取证（独立取证工人，headless Chromium，全部数据由 page.route 注入，
// 不依赖后端/数据库）。取证点 A = 输入区三图标与折叠态输入框等高 + ::before 外扩 44px 热区可命中；
// 取证点 B = 历史行「表情包块 + 文字块」按块顺序渲染、贴纸 120×120 contain、照片 180×200 cover、
// 待发块序列贴纸 contain。
// 本文件只做取证，不改任何 src；发现的缺陷一律写进 .agents/evidence/traces 的结论，不做顺手修。

test.setTimeout(180000)

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 前端根 = path.resolve(本目录, '..')
const 截图目录 = path.resolve(前端根, '..', '测试截图')
// 不能写进 Playwright 的 outputDir —— 每次运行开头会被清空
// 复跑必换名（L-10）：默认名保持原样，定点复跑一律用 FP2324_SUFFIX 换出新一轮取证产物
const 后缀 = process.env.FP2324_SUFFIX ? `-${process.env.FP2324_SUFFIX}` : ''
const 结果文件 = path.resolve(前端根, 'test-results', 'fp2324-取证', `取证结果${后缀}.json`)
// 截图文件名里的日期戳同样要能换（落盘基建，不动判据）：默认值保持原样不改契约
const 日期 = process.env.FP2324_LABEL ?? '20260922'

const 色: [number, number, number] = [0, 229, 255]
const 素材 = {
  贴纸: { url: '/__fp2324__/tiezhi-600x200.svg', kuan: 600, gao: 200 },
  照片: { url: '/__fp2324__/zhaopian-360x400.svg', kuan: 360, gao: 400 },
}
const 贴纸素材 = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const 照片素材 = '4e3b2c1d-6f70-4a9b-8c0d-1e2f3a4b5c6d'

const 会话ID = 'fp2324-huihua'
const 我的ID = 'fp2324-uid'

function svg素材(kuan: number, gao: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${kuan}" height="${gao}" ` +
    `viewBox="0 0 ${kuan} ${gao}"><rect width="${kuan}" height="${gao}" fill="rgb(0,229,255)"/></svg>`
  )
}

const 测试用户 = {
  id: 我的ID,
  shou_ji_hao: '13800138009',
  yong_hu_ming: 'fp2324',
  ni_cheng: '取证用户',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
}

const 用户设置 = {
  uid: 我的ID,
  shou_ji_hao: '13800138009',
  tou_xiang: null,
  qian_ming: null,
  qian_ming_ke_jian_xing: 'gong_kai',
  qian_ming_bai_ming_dan: [],
  liao_tian_bei_jing: 'moRen',
  qi_pao_zi_ji: 'yunBai',
  qi_pao_ai: 'yunBai',
  gong_kai_zhang_hao: true,
  gong_kai_shou_ji_hao: false,
  gong_kai_you_xiang: false,
  bang_ding_you_xiang: '',
}

/**
 * M1 = FP-24a 的回归行：类型是 biaoQingBao 且带随附文字，服务端没给 nei_rong_kuai
 *      ⇒ 前端 fanGouKuaiCongXiaoXi 反构成 [贴纸块, 文字块]（块数 2 且含图片块 ⇒ 走块渲染）。
 *      改前 聊天页面.vue:141 无 !shiXuYaoKuaiXuanRan 守卫 ⇒ v-if 链短路在媒体分支，文字被静默丢弃。
 * M2 = 同一行混排 [贴纸块, 文字块, 照片块]（服务端出参形态），验贴纸 contain 与照片 cover 并存。
 */
const 历史消息 = [
  {
    id: 'fp2324-m1',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 我的ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '贴纸随附文字甲',
    lei_xing: 'biaoQingBao',
    mei_ti_id: 贴纸素材,
    mei_ti_url: 素材.贴纸.url,
    mei_ti_lei_bie: 'biaoqingshu',
    shi_jian_chuo: 1700000000000,
    yi_du: true,
  },
  {
    id: 'fp2324-m2',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '混排文字乙',
    lei_xing: 'wenben',
    mei_ti_id: null,
    nei_rong_kuai: [
      {
        lei_xing: 'tupian',
        mei_ti_id: 贴纸素材,
        mei_ti_url: 素材.贴纸.url,
        mei_ti_lei_bie: 'biaoqingshu',
      },
      { lei_xing: 'wenzi', nei_rong: '混排文字乙' },
      {
        lei_xing: 'tupian',
        mei_ti_id: 照片素材,
        mei_ti_url: 素材.照片.url,
        mei_ti_lei_bie: 'tupian',
      },
    ],
    shi_jian_chuo: 1700000001000,
    yi_du: true,
  },
]

async function 挂载夹具(page: Page) {
  await page.addInitScript(() => {
    // 令牌真源是 sessionStorage（utils/令牌存储.ts::huiHuaCunChu），写 localStorage 路由守卫读不到
    window.sessionStorage.setItem('令牌', 'fp2324-token')
  })
  await page.route('**/socket.io/**', (route) => route.abort())
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort())
  await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }))
  await page.route('**/__fp2324__/**', (route) => {
    const 路径 = new URL(route.request().url()).pathname
    const [k, g] = 路径.includes('tiezhi')
      ? [素材.贴纸.kuan, 素材.贴纸.gao]
      : [素材.照片.kuan, 素材.照片.gao]
    return route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: svg素材(k, g),
    })
  })
  await page.route('**/api/**', (route) => {
    const 路径 = decodeURIComponent(new URL(route.request().url()).pathname)
    if (!路径.startsWith('/api')) return route.fallback()
    if (路径.endsWith('/api/认证/信息')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 测试用户 }) })
    }
    if (路径 === '/api/用户设置' || 路径.startsWith('/api/用户设置/')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 用户设置 }) })
    }
    if (路径.includes('/api/聊天/会话/') && 路径.endsWith('/消息')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { lie_biao: 历史消息, zong_shu: 历史消息.length, hai_you_geng_duo: false },
        }),
      })
    }
    if (路径.endsWith('/api/聊天/会话列表') || 路径.includes('/api/聊天/会话列表')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { lie_biao: [{ id: 会话ID, ming_cheng: '取证会话', jiao_se_id: 会话ID }] },
        }),
      })
    }
    if (路径.startsWith('/api/角色/详情/')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { jiao_se: { id: 会话ID, 名字: '取证角色', 头像: null }, dang_an_zhuang_tai: null },
        }),
      })
    }
    if (路径.endsWith('/api/聊天/多模态配置')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: {
            yuYinLiJieQiYong: false,
            shiPinLiJieQiYong: false,
            tuXiangShengChengQiYong: false,
            shiPinShengChengQiYong: false,
            meiRiShengChengShangXian: 0,
          },
        }),
      })
    }
    if (路径.startsWith('/api/表情/我的')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], zong_shu: 0 } }),
      })
    }
    if (路径.startsWith('/api/通知')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], wei_du_shu: 0 } }),
      })
    }
    if (路径.endsWith('/api/资料/封禁状态')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { bei_feng_jin: false, ji_bie: 'zheng_chang', wei_gui_ci_shu: 0, jie_feng_shi_jian: null, shu_su_zhuang_tai: 'wu' },
        }),
      })
    }
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) })
  })
}

async function 进入聊天页(page: Page) {
  await page.goto(`/chat/${会话ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(page.locator('footer.shuru-rongqi, .shuru-rongqi').first()).toBeVisible({ timeout: 60000 })
  // FP-10c 改判：载体换成图文真内联的 contenteditable（textarea 已退役），锚点同一条 .shuru-kuang
  await expect(page.locator('.shuru-kuang')).toBeVisible({ timeout: 60000 })
  await expect(page.locator('textarea.shuru-kuang'), 'textarea 载体不得复活').toHaveCount(0)
  await page.waitForTimeout(600)
}

/* -------------------------------- 取证点 A -------------------------------- */

const 图标表 = [
  { 名: '表情', 选择器: '.biaoqing-anniu' },
  { 名: '加号', 选择器: '.gengduo-plus-anniu' },
  { 名: '语音', 选择器: '.yuyin-anniu' },
]

/** 证据 md 的必填项：页面 URL、关键容器 rect、有无横向溢出（前端验证技巧 §5） */
async function 记容器与溢出(page: Page, 记: Record<string, unknown>) {
  const 页 = await page.evaluate(() => {
    function 矩(选择器: string) {
      const el = document.querySelector(选择器)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
    }
    return {
      url: location.href,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      容器: { shuruRongqi: 矩('.shuru-rongqi'), xiaoxiQuyu: 矩('main.xiaoxi-quyu'), qipaoNeirong: 矩('.qipao-neirong') },
    }
  })
  记.URL = 页.url
  记.容器 = 页.容器
  记.横向溢出 = { scrollWidth: 页.scrollWidth, clientWidth: 页.clientWidth, 有: 页.scrollWidth > 页.clientWidth }
}

async function 测几何(page: Page) {
  return page.evaluate((表) => {
    const 根样式 = getComputedStyle(document.documentElement)
    function 读(选择器: string) {
      const el = document.querySelector(选择器) as HTMLElement | null
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const bf = getComputedStyle(el, '::before')
      const svg = el.querySelector('svg')
      const sr = svg ? svg.getBoundingClientRect() : null
      return {
        宽: Math.round(r.width * 100) / 100,
        高: Math.round(r.height * 100) / 100,
        计算宽: cs.width,
        计算高: cs.height,
        热区宽: bf.width,
        热区高: bf.height,
        热区位移: bf.transform,
        热区存在: bf.content !== 'none' && bf.content !== '',
        字形宽: sr ? Math.round(sr.width * 100) / 100 : null,
        字形高: sr ? Math.round(sr.height * 100) / 100 : null,
      }
    }
    const 图标: Record<string, unknown> = {}
    for (const x of 表) 图标[x.名] = 读(x.选择器)
    return {
      令牌: {
        danxing: 根样式.getPropertyValue('--shuru-danxing-gao-du').trim(),
        tubiao: 根样式.getPropertyValue('--shuru-tubiao-chicun').trim(),
        glyph: 根样式.getPropertyValue('--shuru-tubiao-glyph-chicun').trim(),
        reku: 根样式.getPropertyValue('--shuru-anniu-re-ku').trim(),
      },
      输入框: 读('.shuru-kuang'),
      图标,
    }
  }, 图标表)
}

type 探针 = { 标签: string; 轴: 'x' | 'y' | 'xy'; 符号: number; 外扩: number }

// 注意：外扩量一律**从盒边起算**（盒半轴 + 外扩），不是从中心起算。
// 35px 盒 ⇒ 半轴 17.5，热区半轴 22 ⇒ 真实"盒外·带内"只有 4.5px 宽的一圈。
async function 热区探测(page: Page, 选择器: string, 探: 探针) {
  await page.waitForTimeout(320)
  const el = page.locator(选择器)
  let 盒 = await el.boundingBox()
  if (!盒) throw new Error(`找不到 ${选择器}`)
  // 面板开合动画会把输入行顶走 ⇒ 连测两次，稳定才敢下点（最多 6 次）
  for (let i = 0; i < 6; i += 1) {
    await page.waitForTimeout(200)
    const 再测 = await el.boundingBox()
    if (!再测) break
    if (Math.abs(再测.x - 盒.x) <= 0.5 && Math.abs(再测.y - 盒.y) <= 0.5 && Math.abs(再测.width - 盒.width) <= 0.5) {
      盒 = 再测
      break
    }
    盒 = 再测
  }
  const 半 = 探.轴 === 'y' ? 盒.height / 2 : 盒.width / 2
  const 半高 = 盒.height / 2
  const 半宽 = 盒.width / 2
  const dx = 探.轴 === 'x' ? 探.符号 * (半宽 + 探.外扩) : 探.轴 === 'xy' ? 探.符号 * (半宽 + 探.外扩) : 0
  const dy = 探.轴 === 'y' ? 探.符号 * (半高 + 探.外扩) : 探.轴 === 'xy' ? 探.符号 * (半高 + 探.外扩) : 0
  const x = Math.round(盒.x + 盒.width / 2 + dx)
  const y = Math.round(盒.y + 盒.height / 2 + dy)
  const 顶元素 = await page.evaluate(
    ([px, py]) => {
      const e = document.elementFromPoint(px, py)
      if (!e) return 'null'
      const b = e.closest('button')
      return `${e.tagName.toLowerCase()}.${typeof e.className === 'string' ? e.className : ''} → 最近button=${b ? b.className : '无'}`
    },
    [x, y],
  )
  const 前 = await el.evaluate((n) => n.classList.contains('huoyue'))
  await page.mouse.click(x, y)
  await page.waitForTimeout(240)
  const 后 = await el.evaluate((n) => n.classList.contains('huoyue'))
  const 盒后 = await el.boundingBox()
  const 活动元素 = await page.evaluate(() => {
    const a = document.activeElement
    if (!a) return 'null'
    const b = a.closest('button')
    return `${a.tagName.toLowerCase()}.${typeof a.className === 'string' ? a.className : ''} → 最近button=${b ? b.className : '无'}`
  })
  return {
    坐标: [x, y],
    盒外偏移: [dx, dy],
    盒: { 宽: 盒.width, 高: 盒.height, 左: 盒.x, 上: 盒.y },
    顶元素,
    活动元素,
    前,
    后,
    命中: 前 !== 后,
    漂移: 盒后 ? Math.round((Math.abs(盒后.x - 盒.x) + Math.abs(盒后.y - 盒.y)) * 100) / 100 : null,
  }
}

async function 确保关闭(page: Page, 选择器: string) {
  const 遮罩关闭 = page.locator('.luyin-guanbi-anniu')
  if (await 遮罩关闭.count()) {
    await 遮罩关闭.click()
    await page.waitForTimeout(300)
  }
  const el = page.locator(选择器)
  const 盒 = await el.boundingBox()
  if (!盒) return
  if (await el.evaluate((n) => n.classList.contains('huoyue'))) {
    await page.mouse.click(Math.round(盒.x + 盒.width / 2), Math.round(盒.y + 盒.height / 2))
    await page.waitForTimeout(300)
  }
}

async function 取证A(page: Page, 档位: string, 记: Record<string, unknown>) {
  const 内高 = await page.evaluate(() => window.innerHeight)
  const 内宽 = await page.evaluate(() => window.innerWidth)
  await 记容器与溢出(page, 记)
  记.几何 = await 测几何(page)
  const 探测: Record<string, unknown> = {}
  for (const 图 of 图标表) {
    const 项: Record<string, unknown> = {}
    for (const 探 of [
      { 标签: '中心(盒内对照)', 轴: 'y', 符号: 0, 外扩: -999 } as 探针,
      { 标签: '上外2px(盒外·带内)', 轴: 'y', 符号: -1, 外扩: 2 } as 探针,
      { 标签: '上外4px(盒外·带内贴边)', 轴: 'y', 符号: -1, 外扩: 4 } as 探针,
      { 标签: '下外2px(盒外·带内)', 轴: 'y', 符号: 1, 外扩: 2 } as 探针,
      { 标签: '左外2px(盒外·带内)', 轴: 'x', 符号: -1, 外扩: 2 } as 探针,
      { 标签: '右外2px(盒外·带内)', 轴: 'x', 符号: 1, 外扩: 2 } as 探针,
      { 标签: '左上角外2px(盒外·带内)', 轴: 'xy', 符号: -1, 外扩: 2 } as 探针,
      { 标签: '上外10px(盒外·带外·反证)', 轴: 'y', 符号: -1, 外扩: 10 } as 探针,
    ]) {
      await 确保关闭(page, 图.选择器)
      项[探.标签] = await 热区探测(page, 图.选择器, 探)
      await 确保关闭(page, 图.选择器)
    }
    探测[图.名] = 项
  }
  记.热区 = 探测
  记.视口 = { 档位, innerWidth: 内宽, innerHeight: 内高 }
  await page
    .locator('.shuru-rongqi')
    .first()
    .screenshot({
      path: path.join(截图目录, `FP-23-24a-输入区图标几何特写-${档位}-${日期}.png`),
      timeout: 60000,
    })

  // ―― 判定（先记全再断，失败也不丢已取到的数）――
  const 框高 = (记.几何 as any).输入框.高 as number
  expect(框高, '折叠态输入框渲染高').toBeGreaterThan(0)
  const 带内点 = [
    '上外2px(盒外·带内)',
    '上外4px(盒外·带内贴边)',
    '下外2px(盒外·带内)',
    '左外2px(盒外·带内)',
    '右外2px(盒外·带内)',
    '左上角外2px(盒外·带内)',
  ]
  for (const 图 of 图标表) {
    const g = (记.几何 as any).图标[图.名]
    expect(g, `${图.名} 图标盒存在`).not.toBeNull()
    // FP-10c 改判（收紧，不放宽）：折叠档高度与图标盒改吃同一枚 --shuru-danxing-gao-du，
    // 旧的 JS 量高链（FP-20⑦ 量到 0.61px 差）已删除 ⇒ 等高的容差从 ≤1px 收到恰为 0。
    expect(Math.abs(g.高 - 框高), `${图.名}盒高 vs 输入框高（同源令牌，必须严格等高）`).toBe(0)
    expect(Math.abs(g.宽 - g.高), `${图.名}盒等比（未被拉扁）`).toBeLessThanOrEqual(1)
    expect(Math.abs(g.字形宽 - g.字形高), `${图.名}字形等比`).toBeLessThanOrEqual(1)
    expect(Math.abs(g.字形宽 - 22), `${图.名}字形 ≈22px`).toBeLessThanOrEqual(1)
    expect(g.热区宽, `${图.名}::before 热区宽`).toBe('44px')
    expect(g.热区高, `${图.名}::before 热区高`).toBe('44px')
    const 项 = (记.热区 as any)[图.名]
    expect(项['中心(盒内对照)'].命中, `${图.名} 中心（对照）应命中`).toBe(true)
    const 命中数 = 带内点.filter((k) => 项[k].命中).length
    项.带内命中 = `${命中数}/${带内点.length}`
    expect(命中数, `${图.名} 盒外·带内命中数（44px 热区可命中性）`).toBeGreaterThan(0)
    expect(项['上外10px(盒外·带外·反证)'].命中, `${图.名} 盒外 10px（热区外）不应命中`).toBe(false)
  }
}

/* -------------------------------- 取证点 B -------------------------------- */

async function 量块(page: Page, 定位器: ReturnType<Page['locator']>) {
  return 定位器.evaluate((el: HTMLElement) => {
    const img = el as HTMLImageElement
    const r = img.getBoundingClientRect()
    const cs = getComputedStyle(img)
    return {
      类: img.className,
      渲染宽: Math.round(r.width * 100) / 100,
      渲染高: Math.round(r.height * 100) / 100,
      计算宽: cs.width,
      计算高: cs.height,
      objectFit: cs.objectFit,
      maxWidth: cs.maxWidth,
      maxHeight: cs.maxHeight,
      natural宽: img.naturalWidth,
      natural高: img.naturalHeight,
      已加载: img.complete && img.naturalWidth > 0,
    }
  })
}

async function 量内容带(page: Page, 定位器: ReturnType<Page['locator']>, 名: string) {
  const 缓冲 = await 定位器.screenshot({ omitBackground: true, timeout: 60000 })
  const b64 = 缓冲.toString('base64')
  const 带 = await page.evaluate(
    async ([源, RGB]) => {
      const 图 = new Image()
      图.src = `data:image/png;base64,${源}`
      await 图.decode()
      const c = document.createElement('canvas')
      c.width = 图.naturalWidth
      c.height = 图.naturalHeight
      const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
      ctx.drawImage(图, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      let 最x = 1e9
      let 最y = 1e9
      let 大x = -1
      let 大y = -1
      let 数 = 0
      for (let y = 0; y < c.height; y += 1) {
        for (let x = 0; x < c.width; x += 1) {
          const i = (y * c.width + x) * 4
          if (
            d[i + 3] > 200 &&
            Math.abs(d[i] - RGB[0]) < 24 &&
            Math.abs(d[i + 1] - RGB[1]) < 24 &&
            Math.abs(d[i + 2] - RGB[2]) < 24
          ) {
            数 += 1
            if (x < 最x) 最x = x
            if (y < 最y) 最y = y
            if (x > 大x) 大x = x
            if (y > 大y) 大y = y
          }
        }
      }
      return {
        截图宽: c.width,
        截图高: c.height,
        带X: 最x === 1e9 ? null : 最x,
        带Y: 最y === 1e9 ? null : 最y,
        带宽: 大x - 最x + 1,
        带高: 大y - 最y + 1,
        命中像素: 数,
      }
    },
    [b64, 色],
  )
  return { 名, ...带 }
}

const 文字甲 = '贴纸随附文字甲'
const 文字乙 = '混排文字乙'

async function 取证B(page: Page, 档位: string, 记: Record<string, unknown>) {
  await 记容器与溢出(page, 记)
  // M1 行：唯一由用户发出的行；M2 行：含照片素材 URL 的那一行（按 src 定位，不依赖列表位次）
  const 行1 = page.locator('.xiaoxi-xiangmu.yonghu-xiaoxi').first()
  const 行2 = page.locator(`.xiaoxi-xiangmu:has(img[src*="zhaopian-360x400"])`).first()
  await expect(行1).toBeVisible({ timeout: 20000 })
  await expect(行2).toBeVisible({ timeout: 20000 })

  // B-1 文字进 DOM 且可读。改前（:141 无守卫）M1 走媒体分支：DOM 里只有 .biaoqingbao-waike，
  // 没有 .qipao-neirong，文字整棵子树不存在 ⇒ 下面两个计数即为「是否被静默丢弃」的判据。
  const 结构: Record<string, unknown> = {}
  for (const [名, 行, 文字] of [
    ['M1', 行1, 文字甲],
    ['M2', 行2, 文字乙],
  ] as const) {
    const 气泡 = 行.locator('.qipao-neirong')
    const 文块 = 行.locator('.tuwen-kuai--wen')
    const 个数 = await 文块.count()
    const 项: Array<Record<string, unknown>> = []
    for (let i = 0; i < 个数; i += 1) {
      const x = 文块.nth(i)
      const r = await x.evaluate((el: HTMLElement) => {
        const b = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return { 宽: b.width, 高: b.height, 字号: cs.fontSize, 透明度: cs.opacity, 颜色: cs.color, 可见文本: el.innerText }
      })
      项.push({ 序号: i, ...r, 可见: await x.isVisible() })
    }
    结构[名] = {
      块渲染气泡数: await 气泡.count(),
      媒体分支贴纸盒数: await 行.locator('.biaoqingbao-waike').count(),
      块总数: await 行.locator('.tuwen-kuai').count(),
      文字块: 项,
      整行文本: (await 行.innerText()).replace(/\s+/g, ' ').trim(),
      含目标文字: (await 行.innerText()).includes(文字),
    }
  }
  记.结构 = 结构

  // B-2 贴纸
  const 贴纸图 = 行1.locator('img.tuwen-kuai-tu--biaoqingbao').first()
  await expect(贴纸图).toBeVisible({ timeout: 15000 })
  await 贴纸图.scrollIntoViewIfNeeded()
  await expect
    .poll(async () => 贴纸图.evaluate((el: HTMLImageElement) => el.naturalWidth > 0), { timeout: 15000 })
    .toBe(true)
  记.贴纸 = await 量块(page, 贴纸图)
  记.贴纸内容带 = await 量内容带(page, 贴纸图, 'M1 贴纸 600×200 → 120 方盒')

  // B-3 照片回归（M2 同行）：贴纸与照片并存时必须各自吃各自那套度量
  记.照片 = await 量块(page, 行2.locator('img.tuwen-kuai-tu:not(.tuwen-kuai-tu--biaoqingbao)').first())
  await 行2.locator('img.tuwen-kuai-tu:not(.tuwen-kuai-tu--biaoqingbao)')
    .first()
    .scrollIntoViewIfNeeded()
  记.照片内容带 = await 量内容带(
    page,
    行2.locator('img.tuwen-kuai-tu:not(.tuwen-kuai-tu--biaoqingbao)').first(),
    'M2 照片 360×400 → 180×200 盒 cover',
  )
  const M2贴纸 = 行2.locator('img.tuwen-kuai-tu--biaoqingbao').first()
  await M2贴纸.scrollIntoViewIfNeeded()
  记.M2贴纸 = await 量块(page, M2贴纸)
  记.M2贴纸内容带 = await 量内容带(page, M2贴纸, 'M2 贴纸 600×200 → 120 方盒')
  记.档位 = 档位

  // ―― 判定 ――
  const m1 = (记.结构 as any).M1
  expect(m1.媒体分支贴纸盒数, 'M1 不得再短路进媒体分支').toBe(0)
  expect(m1.块渲染气泡数, 'M1 应走块渲染气泡').toBe(1)
  expect(m1.含目标文字, `M1 DOM 内应含文字「${文字甲}」`).toBe(true)
  expect(m1.文字块[0].可见, 'M1 文字块可见').toBe(true)
  expect(m1.文字块[0].高, 'M1 文字块有渲染行高').toBeGreaterThan(8)
  expect(m1.文字块[0].透明度, 'M1 文字块不透明').toBe('1')
  const t = 记.贴纸 as any
  expect(t.类).toContain('tuwen-kuai-tu--biaoqingbao')
  expect(Math.abs(t.渲染宽 - 120), '贴纸盒宽 =120px').toBeLessThanOrEqual(1)
  expect(Math.abs(t.渲染高 - 120), '贴纸盒高 =120px').toBeLessThanOrEqual(1)
  expect(t.objectFit, '贴纸 object-fit').toBe('contain')
  expect(t.natural宽 !== t.natural高, '素材必须非方形（否则证不出裁切）').toBe(true)
  const tb = 记.贴纸内容带 as any
  expect(Math.abs(tb.带宽 - 120), '贴纸内容带宽（等比铺满短边）').toBeLessThanOrEqual(2)
  expect(Math.abs(tb.带高 - 40), '贴纸内容带高 =120/(600/200)=40（cover 会是 120）').toBeLessThanOrEqual(2)
  const p = 记.照片 as any
  expect(p.类).not.toContain('--biaoqingbao')
  expect(Math.abs(p.渲染宽 - 180), '照片盒宽 =180px').toBeLessThanOrEqual(1)
  expect(Math.abs(p.渲染高 - 200), '照片盒高 =200px').toBeLessThanOrEqual(1)
  expect(p.objectFit, '照片 object-fit 仍为 cover（未被 B 改动带偏）').toBe('cover')
  expect((记.结构 as any).M2.含目标文字, `M2 DOM 内应含文字「${文字乙}」`).toBe(true)
}

async function 取证待发(page: Page, 记: Record<string, unknown>, 判几何 = false) {
  const 输入 = page.locator('input[type="file"][accept="image/*"]').first()
  await expect(输入).toHaveCount(1)
  await 输入.setInputFiles({
    name: 'zhaopian.png',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg素材(素材.照片.kuan, 素材.照片.gao)),
  })
  const 缩略 = page.locator('.dai-fa-kuai-tu').first()
  await expect(缩略).toBeVisible({ timeout: 15000 })
  // 后台压缩会把预览换成压缩后的 blob，等它落定再量（否则量到的是替换瞬间）
  await page.waitForTimeout(1800)
  await 缩略.scrollIntoViewIfNeeded()
  await expect
    .poll(async () => 缩略.evaluate((el: HTMLImageElement) => el.naturalWidth > 0), { timeout: 15000 })
    .toBe(true)
  记.UI路径 = await 量块(page, 缩略)
  // 块自带的浮层会压在图上，量像素带前先隐去（只是取像辅助，不改度量）。
  // FP-10c 改判：旧待发序列的序号角标 .dai-fa-kuai-xu / 位移按钮 .dai-fa-kuai-anniu 随序列组件一起退役，
  // 真内联下压在缩略图左上角的是单块删除钮 .dai-fa-kuai-shanchu ⇒ 辅助对象等价换成它（不放宽判据）。
  await page.evaluate(() => {
    document.querySelectorAll('.dai-fa-kuai-shanchu').forEach((n) => {
      ;(n as HTMLElement).style.visibility = 'hidden'
    })
  })
  // 真机 CSS 生效性：给同一元素加上贴纸修饰类，读回 computed object-fit 并量内容带。
  // 注意：这一步只证明「类存在时规则在 Chromium 里真的生效」；UI 侧有没有生产者路径另记（见结论）。
  await 缩略.evaluate((el: HTMLElement) => {
    el.classList.add('dai-fa-kuai-tu--biaoqingbao')
    el.src = '/__fp2324__/tiezhi-600x200.svg'
  })
  await expect
    .poll(async () => 缩略.evaluate((el: HTMLImageElement) => el.naturalWidth === 600), { timeout: 15000 })
    .toBe(true)
  await page.waitForTimeout(200)
  记.贴纸缩略 = await 量块(page, 缩略)
  记.贴纸缩略内容带 = await 量内容带(page, 缩略, '待发贴纸 600×200 → 64 方盒')
  await 缩略.evaluate((el: HTMLElement) => el.classList.remove('dai-fa-kuai-tu--biaoqingbao'))
  await page.evaluate(() => {
    document.querySelectorAll('.dai-fa-kuai-shanchu').forEach((n) => {
      ;(n as HTMLElement).style.visibility = ''
    })
  })
  // ―― 判定 ――
  const u = 记.UI路径 as any
  expect(u.类.includes('biaoqingbao'), 'UI 生产路径是否给照片块贴上贴纸修饰类').toBe(false)
  /*
   * 下面这一批是 FP-24a 的 64px / cover / contain 契约，原文一字未改，只是**换了用例**：
   * 它们红在实现侧（待发块由 document.createElement 造出 ⇒ 没有 Vue 的 data-v 作用域属性，
   * 而 .dai-fa-kuai* 那批规则住在同文件的 <style scoped>（图文输入区.vue:543-579）⇒ 一条都不命中，
   * 本轮起点基线实测 渲染宽比契约多 296px）。留在本用例里判 = 让一条已知红掩掉同用例其余判据，
   * 故由专用用例 `B 待发块 64px/cover/contain 契约【已知实现缺陷】` 以 test.fail 单独定罪：
   * 实现修好后它以 unexpected pass 逼着摘标记，取证数值（UI路径/贴纸缩略/内容带）仍然照旧落盘。
   */
  if (判几何) {
    expect(Math.abs(u.渲染宽 - 64), '待发缩略宽 =--daifa-kuai-tu-kuan 64px').toBeLessThanOrEqual(1)
    expect(Math.abs(u.渲染高 - 64), '待发缩略高 =64px').toBeLessThanOrEqual(1)
    expect(u.objectFit, '待发照片仍 cover').toBe('cover')
    const s = 记.贴纸缩略 as any
    expect(s.objectFit, '贴纸修饰类在真机 Chromium 里把 cover 换成 contain').toBe('contain')
    expect(Math.abs(s.渲染宽 - 64), '加类后几何不变（只换裁切）').toBeLessThanOrEqual(1)
    const sb = 记.贴纸缩略内容带 as any
    expect(Math.abs(sb.带宽 - 64), '贴纸缩略内容带宽').toBeLessThanOrEqual(2)
    expect(Math.abs(sb.带高 - 21.33), '贴纸缩略内容带高 =64/3（cover 会填满 64）').toBeLessThanOrEqual(2)
  } else {
    test.info().annotations.push({
      type: 'bug',
      description:
        `待发块几何本轮实测：UI 路径 ${u.渲染宽}×${u.渲染高}（契约 64×64）、object-fit=${u.objectFit}（契约 cover）。` +
        '64px/cover/contain 那一批判据没在本用例里判，改由 `B 待发块 64px/cover/contain 契约【已知实现缺陷】` 单独定罪' +
        '（同一条根因：<style scoped> 打不到 JS 造出的节点，见 图文输入区.vue:197-227 与 :543-579）。',
    })
  }
}

function 收控制台(collector: ReturnType<typeof createConsoleCollector>, 记: Record<string, unknown>, 名: string) {
  const 错误 = collector
    .getErrors()
    .filter((e) => !/\.(woff2?|ttf|otf)(\?.*)?$/.test(e.location?.url || ''))
  const 警告 = collector.getWarnings()
  const 资源 = collector.getResourceFailures ? collector.getResourceFailures() : []
  记.控制台 = { 错误: 错误.map((e) => e.text), 警告: 警告.map((w) => w.text), 资源失败: 资源.map((r) => r.text) }
  if (错误.length > 0) {
    throw new Error(`${名} 控制台 error 非零:\n${错误.map((e) => `${e.text} @ ${e.location?.url ?? ''}`).join('\n')}`)
  }
}

const 结果: Record<string, unknown> = {
  素材: {
    贴纸: '600×200 非方形实心 #00e5ff（纵横比 3:1）',
    照片: '360×400（纵横比 0.9 = 180/200，恰好吃满 max-width/max-height）',
    判据: 'contain 时内容带 = 盒短边铺满 + 另一边等比留白；cover 时内容带 = 整盒',
  },
  端口: process.env.FP2324_PORT ?? 5181,
  headless: true,
}

function 落盘(名?: string) {
  fs.mkdirSync(path.dirname(结果文件), { recursive: true })
  // 与已存在的盘上结果合并：worker 重启 / 分批 -g 重跑都不会把先前取证数覆盖成空
  let 已存: Record<string, unknown>
  try {
    已存 = JSON.parse(fs.readFileSync(结果文件, 'utf8')) as Record<string, unknown>
  } catch {
    已存 = {}
  }
  const 合并 = { ...已存, ...结果 }
  for (const k of Object.keys(合并)) {
    if (合并[k] && typeof 合并[k] === 'object' && Object.keys(合并[k] as object).length === 0 && 已存[k]) {
      合并[k] = 已存[k]
    }
  }
  fs.writeFileSync(结果文件, JSON.stringify(合并, null, 2), 'utf8')
  // 单测快照：worker 若被重启，聚合文件会被新进程的空 结果 覆盖，快照可保住已测到的数
  if (名) {
    fs.writeFileSync(
      path.resolve(path.dirname(结果文件), `快照-${名.replace(/[^\w一-龥.+-]/g, '_')}.json`),
      JSON.stringify(合并, null, 2),
      'utf8',
    )
  }
}

let 当前用例名 = '初始化'

test.afterEach(() => {
  落盘(当前用例名.replace(/\s+/g, ''))
})

test.afterAll(() => {
  落盘()
})

test('A 桌面 1440x900 输入区图标几何 + 44px 热区可命中', async ({ page }) => {
  const collector = createConsoleCollector(page)
  const 记: Record<string, unknown> = {}
  结果.A_桌面 = 记
  当前用例名 = 'A_桌面'
  await 挂载夹具(page)
  await 进入聊天页(page)
  await 取证A(page, '1440x900', 记)
  await page.screenshot({ path: path.join(截图目录, `FP-23-24a-输入区图标几何-桌面1440x900-${日期}.png`), timeout: 60000 })
  收控制台(collector, 记, 'A 桌面')
})

test('A 移动 390x844 输入区图标几何 + 44px 热区可命中', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  const collector = createConsoleCollector(page)
  const 记: Record<string, unknown> = {}
  结果.A_移动 = 记
  当前用例名 = 'A_移动'
  await 挂载夹具(page)
  await 进入聊天页(page)
  await 取证A(page, '390x844', 记)
  await page.screenshot({ path: path.join(截图目录, `FP-23-24a-输入区图标几何-移动390x844-${日期}.png`), timeout: 60000 })
  收控制台(collector, 记, 'A 移动')
  await ctx.close()
})

test('B 桌面 1440x900 历史行贴纸+文字 / 照片并存 + 待发序列', async ({ page }) => {
  const collector = createConsoleCollector(page)
  const 记: Record<string, unknown> = {}
  结果.B_桌面 = 记
  当前用例名 = 'B_桌面'
  await 挂载夹具(page)
  await 进入聊天页(page)
  await 取证B(page, '1440x900', 记)
  await 取证待发(page, 记)
  await page.screenshot({ path: path.join(截图目录, `FP-23-24a-历史行贴纸加文字-桌面1440x900-${日期}.png`), timeout: 60000 })
  收控制台(collector, 记, 'B 桌面')
})

test('B 移动 390x844 历史行贴纸+文字 / 照片并存', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  const collector = createConsoleCollector(page)
  const 记: Record<string, unknown> = {}
  结果.B_移动 = 记
  当前用例名 = 'B_移动'
  await 挂载夹具(page)
  await 进入聊天页(page)
  await 取证B(page, '390x844', 记)
  await page.screenshot({ path: path.join(截图目录, `FP-23-24a-历史行贴纸加文字-移动390x844-${日期}.png`), timeout: 60000 })
  收控制台(collector, 记, 'B 移动')
  await ctx.close()
})

/**
 * 待发块 64px / cover / contain 契约（FP-24a 既有判据原文，一字未改）——【已知实现缺陷】
 *
 * 为什么要单独立一条并标 test.fail（而不是留在 B 桌面里判，也不是删掉、也不是放宽阈值）：
 * 这一批判据现在红在实现侧，且根因只有一条：待发块节点由 `document.createElement` 造出
 * （src/components/聊天/图文输入区.vue:197-227），拿不到 Vue 的 `data-v-*` 作用域属性，
 * 而 `.dai-fa-kuai*` 那批规则住在同文件的 `<style scoped>`（:543-579）⇒ 选择器一条都不命中，
 * 64px 档与 cover/contain 全部不生效（起点基线实测：渲染宽比契约多 296px、object-fit 落回 fill）。
 * 混在 B 桌面里判 = 一条已知红掩掉同用例其余十几条判据；标 test.fail 单独立案后
 * 其余判据各判各的，而实现一旦修好这条会以 unexpected pass 变红，逼着把标记摘掉。
 */
test('B 待发块 64px/cover/contain 契约【已知实现缺陷】', async ({ page }) => {
  test.fail(true, '待发块吃不到 <style scoped>（JS 造节点无 data-v）⇒ 64px/cover/contain 全部不生效：图文输入区.vue:197-227 与 :543-579')
  const collector = createConsoleCollector(page)
  const 记: Record<string, unknown> = {}
  结果.B_待发块几何契约 = 记
  当前用例名 = 'B_待发块几何契约'
  await 挂载夹具(page)
  await 进入聊天页(page)
  await 取证待发(page, 记, true)
  await page.screenshot({ path: path.join(截图目录, `FP-23-24a-待发块几何契约-桌面1440x900-${日期}.png`), timeout: 60000 })
  收控制台(collector, 记, 'B 待发块几何契约')
})
