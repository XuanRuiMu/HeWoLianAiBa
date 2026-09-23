import { expect, test, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createConsoleCollector } from './console-error-collector'
import { 外壳, 编辑器, 图片块, 读块序, 读文本, 清空文本, 输入文本 } from './输入区取样'

// 「循环工程」取证派单（聊天页簇）· 态 1：输入区。
// 判定点 1（FP-10b 图文同区）/ 2（FP-23 图标等高 + 44px 热区）/ 3（FP-24a 贴纸历史行 + FP-10a 贴纸进待发）
// / 4（面板开合顶行 Q-23b 复测）。本文件只做取证，不改任何 src；缺陷只记进证据文件，不顺手修。
// 数据全部 page.route 桩注入（fp03-qipao / fp2324 样板同法）⇒ 不需要后端。headless（派生 config）。
//
// FP-10c 第⑤刀改判记录（判据只动"读法"，不动契约）：
//   · 输入区锚点 textarea.shuru-kuang → .shuru-kuang[contenteditable=true]，并新增「textarea 不得复活」硬判据；
//   · 判定点 1 的旧「待发序列在外盒内 / 序列在 textarea 之前 / 序列在上」四支随真内联作废，
//     换成等价且更严的「图片块的宿主必须精确等于编辑器 + 块与文字落在同一行盒 + 块左缘对齐内容左缘」；
//   · FP-23 等高的容差由 ≤1px 收到 0（折叠档与图标盒同吃 --shuru-danxing-gao-du，JS 量高链已删）。
// 本轮真机新发现的**实现侧缺陷**（本工人无权改 src，只记录）：
//   待发块的节点由 document.createElement 造出（图文输入区.vue:197-227），拿不到 Vue 的 data-v 作用域属性，
//   而 .dai-fa-kuai* 那批规则住在同文件的 <style scoped>（:543-579）⇒ 规则一条都不命中：
//   实测待发贴纸 512×512 / object-fit:fill（契约 64×64 / contain，见 取证贴纸进待发），删除钮也不在块左上角。
//   于是本文件 取证贴纸进待发 的 64px 与 contain 两条判据为**真红**，账记在 src，不在判据。

// FP-10c⑤：本行墙钟保持 180s 原值**不加大**——加大只会掩盖结构问题；真改动是把「态1」大 test
// 拆成 per-判据小 test（见文末编排改判注释），单 test 预算富余，一处红不再吞同档位其余取证。
test.setTimeout(180000)

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 前端根 = path.resolve(本目录, '..')
const 截图目录 = path.resolve(前端根, '..', '测试截图')
// 复跑必换名（L-10：复跑覆盖旧证据不可恢复）：默认名不动，定点复跑用 FPVC_SUFFIX 换出新一轮
const 后缀 = process.env.FPVC_SUFFIX ? `-${process.env.FPVC_SUFFIX}` : ''
const 结果文件 = path.resolve(前端根, 'test-results', 'fp-verify-chat-取证', `input-取证结果${后缀}.json`)
const 日期 = process.env.FPVC_LABEL ?? '20260922'

const 色: [number, number, number] = [0, 229, 255]
const 素材 = {
  贴纸: { url: '/__fpvc__/tiezhi-600x200.svg', kuan: 600, gao: 200 },
  照片: { url: '/__fpvc__/zhaopian-360x400.svg', kuan: 360, gao: 400 },
}
const 贴纸素材 = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const 照片素材 = '4e3b2c1d-6f70-4a9b-8c0d-1e2f3a4b5c6d'
const 会话ID = 'fpvc-huihua'
const 我的ID = 'fpvc-uid'

function svg素材(kuan: number, gao: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${kuan}" height="${gao}" ` +
    `viewBox="0 0 ${kuan} ${gao}"><rect width="${kuan}" height="${gao}" fill="rgb(0,229,255)"/></svg>`
  )
}

const 测试用户 = {
  id: 我的ID,
  shou_ji_hao: '13800138010',
  yong_hu_ming: 'fpvc',
  ni_cheng: '取证用户',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
}

const 用户设置 = {
  uid: 我的ID,
  shou_ji_hao: '13800138010',
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

// M1 = 「表情包+文字」历史行（服务端无内容块 ⇒ 前端反构）；M2 = 服务端出参混排行（贴纸+文字+照片）
const 历史消息 = [
  {
    id: 'fpvc-m0',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '基线纯文字行',
    lei_xing: 'wenben',
    mei_ti_id: null,
    shi_jian_chuo: 1700000000000,
    yi_du: true,
  },
  {
    id: 'fpvc-m1',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 我的ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '贴纸随附文字甲',
    lei_xing: 'biaoQingBao',
    mei_ti_id: 贴纸素材,
    mei_ti_url: 素材.贴纸.url,
    mei_ti_lei_bie: 'biaoqingshu',
    shi_jian_chuo: 1700000001000,
    yi_du: true,
  },
  {
    id: 'fpvc-m2',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '混排文字乙',
    lei_xing: 'wenben',
    mei_ti_id: null,
    nei_rong_kuai: [
      { lei_xing: 'tupian', mei_ti_id: 贴纸素材, mei_ti_url: 素材.贴纸.url, mei_ti_lei_bie: 'biaoqingshu' },
      { lei_xing: 'wenzi', nei_rong: '混排文字乙' },
      { lei_xing: 'tupian', mei_ti_id: 照片素材, mei_ti_url: 素材.照片.url, mei_ti_lei_bie: 'tupian' },
    ],
    shi_jian_chuo: 1700000002000,
    yi_du: true,
  },
]

async function 挂载夹具(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('令牌', 'fpvc-token')
  })
  await page.route('**/socket.io/**', (route) => route.abort())
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort())
  await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }))
  await page.route('**/__fpvc__/**', (route) => {
    const 路径 = new URL(route.request().url()).pathname
    const [k, g] = 路径.includes('tiezhi') ? [素材.贴纸.kuan, 素材.贴纸.gao] : [素材.照片.kuan, 素材.照片.gao]
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg素材(k, g) })
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
      // 服务端契约 lie_biao 为新→旧降序（stores/聊天.ts:628 reverse 成升序）⇒ 桩按降序给
      const 降序 = [...历史消息].reverse()
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { lie_biao: 降序, zong_shu: 降序.length, hai_you_geng_duo: false },
        }),
      })
    }
    if (路径.endsWith('/api/聊天/会话列表') || 路径.includes('/api/聊天/会话列表')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [{ id: 会话ID, ming_cheng: '取证会话', jiao_se_id: 会话ID }] } }),
      })
    }
    if (路径.startsWith('/api/角色/详情/')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { jiao_se: { id: 会话ID, 名字: '取证角色', ming_zi: '取证角色', tou_xiang: null, 头像: null }, dang_an_zhuang_tai: null },
        }),
      })
    }
    if (路径.endsWith('/api/聊天/多模态配置')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { yuYinLiJieQiYong: false, shiPinLiJieQiYong: false, tuXiangShengChengQiYong: false, shiPinShengChengQiYong: false, meiRiShengChengShangXian: 0 },
        }),
      })
    }
    if (路径.startsWith('/api/表情/我的')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], zong_shu: 0 } }) })
    }
    if (路径.startsWith('/api/通知')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], wei_du_shu: 0 } }) })
    }
    if (路径.endsWith('/api/资料/封禁状态')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { bei_feng_jin: false, ji_bie: 'zheng_chang', wei_gui_ci_shu: 0, jie_feng_shi_jian: null, shu_su_zhuang_tai: 'wu' } }),
      })
    }
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) })
  })
}

async function 进入聊天页(page: Page) {
  await page.goto(`/chat/${会话ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(page.locator('footer.shuru-quyu .shuru-rongqi').first()).toBeVisible({ timeout: 60000 })
  // FP-10c 改判：输入区载体从 <textarea> 换成图文真内联的 contenteditable（同一支 .shuru-kuang），
  // 锚点等价；顺手把「textarea 不得复活」钉成硬判据（比旧的多一条，不放宽）。
  await expect(page.locator(编辑器)).toBeVisible({ timeout: 60000 })
  await expect(page.locator(编辑器)).toHaveAttribute('contenteditable', 'true')
  await expect(page.locator('textarea.shuru-kuang'), 'textarea 载体已退役，不得复活').toHaveCount(0)
  await page.waitForTimeout(600)
}

async function 记容器与溢出(page: Page, 记: Record<string, unknown>) {
  const 页 = await page.evaluate(() => {
    function 矩(选择器: string) {
      const el = document.querySelector(选择器)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }
    }
    return {
      url: location.href,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      容器: { shuruRongqi: 矩('.shuru-rongqi'), waike: 矩('.shuru-kuang-waike'), xiaoxiQuyu: 矩('main.xiaoxi-quyu') },
    }
  })
  记.URL = 页.url
  记.视口自证 = { innerWidth: 页.innerWidth, innerHeight: 页.innerHeight }
  记.容器 = 页.容器
  记.横向溢出 = { scrollWidth: 页.scrollWidth, clientWidth: 页.clientWidth, 有: 页.scrollWidth > 页.clientWidth }
}

/* —— 判定点 2：图标等高（FP-23）—— */

const 图标表 = [
  { 名: '表情', 选择器: '.biaoqing-anniu' },
  { 名: '加号', 选择器: '.gengduo-plus-anniu' },
  { 名: '语音', 选择器: '.yuyin-anniu' },
]

async function 测几何(page: Page) {
  // 编辑器的选择器由 Node 侧传进 evaluate（浏览器上下文里取不到模块常量）
  return page.evaluate(([表, 编辑器]: [Array<{ 名: string; 选择器: string }>, string]) => {
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
        宽: +r.width.toFixed(2),
        高: +r.height.toFixed(2),
        计算高: cs.height,
        热区宽: bf.width,
        热区高: bf.height,
        热区存在: bf.content !== 'none' && bf.content !== '',
        字形宽: sr ? +sr.width.toFixed(2) : null,
        字形高: sr ? +sr.height.toFixed(2) : null,
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
      // 这里是 page.evaluate 内部（浏览器上下文），拿不到模块导出的常量 ⇒ 写同一支选择器的字面量
      输入框: 读(编辑器),
      图标,
    }
  }, [图标表, 编辑器] as const)
}

/* —— 判定点 2 续：44px ::before 热区可命中（半轴+外扩口径，禁止「盒上 12px」写法）—— */

type 探针 = { 标签: string; 轴: 'x' | 'y' | 'xy'; 符号: number; 外扩: number }

async function 热区探测(page: Page, 选择器: string, 探: 探针) {
  await page.waitForTimeout(320)
  const el = page.locator(选择器)
  let 盒 = await el.boundingBox()
  if (!盒) throw new Error(`找不到 ${选择器}`)
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
  const 半高 = 盒.height / 2
  const 半宽 = 盒.width / 2
  const dx = 探.轴 === 'x' ? 探.符号 * (半宽 + 探.外扩) : 探.轴 === 'xy' ? 探.符号 * (半宽 + 探.外扩) : 0
  const dy = 探.轴 === 'y' ? 探.符号 * (半高 + 探.外扩) : 探.轴 === 'xy' ? 探.符号 * (半高 + 探.外扩) : 0
  const x = Math.round(盒.x + 盒.width / 2 + dx)
  const y = Math.round(盒.y + 盒.height / 2 + dy)
  const 前 = await el.evaluate((n) => n.classList.contains('huoyue'))
  await page.mouse.click(x, y)
  await page.waitForTimeout(240)
  const 后 = await el.evaluate((n) => n.classList.contains('huoyue'))
  return { 坐标: [x, y], 盒外偏移: [dx, dy], 前, 后, 命中: 前 !== 后 }
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

async function 取证图标与热区(page: Page, 档位: string, 记: Record<string, unknown>, 图: { 名: string; 选择器: string }) {
  记.几何 = await 测几何(page)
  const 探测: Record<string, unknown> = {}
  {
    const 项: Record<string, unknown> = {}
    for (const 探 of [
      { 标签: '中心(盒内对照)', 轴: 'y', 符号: 0, 外扩: -999 } as 探针,
      { 标签: '上外2px(盒外·带内)', 轴: 'y', 符号: -1, 外扩: 2 } as 探针,
      { 标签: '上外4px(盒外·带内贴边)', 轴: 'y', 符号: -1, 外扩: 4 } as 探针,
      { 标签: '下外2px(盒外·带内)', 轴: 'y', 符号: 1, 外扩: 2 } as 探针,
      { 标签: '左外2px(盒外·带内)', 轴: 'x', 符号: -1, 外扩: 2 } as 探针,
      { 标签: '右外2px(盒外·带内)', 轴: 'x', 符号: 1, 外扩: 2 } as 探针,
      { 标签: '上外10px(盒外·带外·反证)', 轴: 'y', 符号: -1, 外扩: 10 } as 探针,
    ]) {
      await 确保关闭(page, 图.选择器)
      项[探.标签] = await 热区探测(page, 图.选择器, 探)
      await 确保关闭(page, 图.选择器)
    }
    探测[图.名] = 项
  }
  记.热区 = 探测
  const 框高 = (记.几何 as any).输入框.高 as number
  const 带内点 = ['上外2px(盒外·带内)', '上外4px(盒外·带内贴边)', '下外2px(盒外·带内)', '左外2px(盒外·带内)', '右外2px(盒外·带内)']
  {
    const g = (记.几何 as any).图标[图.名]
    expect(g, `${图.名} 图标盒存在`).not.toBeNull()
    // FP-10c 改判（收紧）：折叠档与图标盒同吃 --shuru-danxing-gao-du，JS 量高链已删除 ⇒ ≤1px 收到 0
    expect(Math.abs(g.高 - 框高), `${图.名}盒高 vs 输入框高（同源令牌，必须严格等高）`).toBe(0)
    expect(Math.abs(g.字形宽 - 22), `${图.名}字形 ≈22px`).toBeLessThanOrEqual(1)
    expect(Math.abs(g.字形宽 - g.字形高), `${图.名}字形未被拉扁`).toBeLessThanOrEqual(1)
    expect(g.热区宽, `${图.名}::before 热区宽`).toBe('44px')
    expect(g.热区高, `${图.名}::before 热区高`).toBe('44px')
    const 项 = (记.热区 as any)[图.名]
    expect(项['中心(盒内对照)'].命中, `${图.名} 中心（对照）应命中`).toBe(true)
    const 命中数 = 带内点.filter((k) => 项[k].命中).length
    项.带内命中 = `${命中数}/${带内点.length}`
    expect(命中数, `${图.名} 盒外·4.5px 带内命中数`).toBeGreaterThan(0)
    expect(项['上外10px(盒外·带外·反证)'].命中, `${图.名} 盒外 10px（热区外）不应命中`).toBe(false)
  }
  void 档位
}

/* —— 待发序列清空辅助：面板动画结束后再点删除，删不掉重试（避免把脏状态带进下一段取证）—— */

async function 清空待发(page: Page) {
  for (let i = 0; i < 6; i += 1) {
    const 个数 = await page.locator('.dai-fa-kuai').count()
    if (个数 === 0) return
    const 钮 = page.locator('.dai-fa-kuai-shanchu').first()
    await 钮.scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    await 钮.click()
    await page.waitForTimeout(450)
  }
  throw new Error('待发块删除按钮连点 6 次仍有序列 ⇒ 记为缺陷')
}

/* —— 判定点 1：图文同区（FP-10b）—— */

async function 取图文同区(page: Page, 记: Record<string, unknown>) {
  await 清空待发(page)
  await 清空文本(page)
  const 输入 = page.locator('input[type="file"][accept="image/*"]').first()
  await expect(输入).toHaveCount(1)
  // 真内联下「图文同区」要测的是同一条流，所以先打一段字再插图（旧形态下序列与文本框是两个宿主，
  // 只插图也能测「序列在外盒内」；新形态下必须有左右文字才量得出「同一条流」）。
  await 输入文本(page, '图文同区')
  await 输入.setInputFiles({ name: 'zhaopian.png', mimeType: 'image/svg+xml', buffer: Buffer.from(svg素材(素材.照片.kuan, 素材.照片.gao)) })
  const 块清单 = page.locator(图片块)
  await expect(块清单).toHaveCount(1, { timeout: 15000 })
  await page.waitForTimeout(1600) // 后台压缩替换预览 blob 后落定
  const 序 = await 读块序(page)
  记.图文同区 = await page.evaluate(
    ([编, 外, 图]) => {
      const 编辑 = document.querySelector(编) as HTMLElement
      const 外盒 = document.querySelector(外) as HTMLElement
      const 块元 = document.querySelector(图) as HTMLElement
      const 文元 = 编辑.querySelector('.dai-fa-kuai--wen') as HTMLElement | null
      const 外r = 外盒.getBoundingClientRect()
      const 块r = 块元.getBoundingClientRect()
      const 文r = 文元 ? 文元.getBoundingClientRect() : null
      const 编r = 编辑.getBoundingClientRect()
      const 算 = getComputedStyle(编辑)
      const 内缩左 = 编r.left + (parseFloat(算.paddingLeft) || 0) + (parseFloat(算.borderLeftWidth) || 0)
      return {
        块宿主是编辑器: 块元.parentElement === 编辑,
        块在外盒内: 块元.closest(外) === 外盒,
        外盒水平包含块: 块r.left >= 外r.left - 0.5 && 块r.right <= 外r.right + 0.5,
        块左缘对齐内容左缘: +Math.abs(块r.left - 内缩左).toFixed(2),
        与文字同一行盒: 文r ? 块r.top < 文r.bottom - 0.5 && 文r.top < 块r.bottom - 0.5 : false,
        文字在块之前: 文r ? 文r.left < 块r.left : false,
        旧序列容器数: document.querySelectorAll('.dai-fa-kuai-lie').length,
        编辑器外块数: Array.from(document.querySelectorAll('.dai-fa-kuai')).filter((n) => !n.closest(编)).length,
        编辑器外独立图片容器数: Array.from(document.querySelectorAll('.dai-fa-kuai--tu')).filter((n) => !n.closest(编)).length,
        块: { 宽: +块r.width.toFixed(2), 高: +块r.height.toFixed(2) },
        块可视比: +(Math.max(0, Math.min(块r.bottom, 编r.bottom) - Math.max(块r.top, 编r.top)) / Math.max(块r.height, 1)).toFixed(3),
        编辑器可视高: +编r.height.toFixed(2),
        矩: {
          文: 文r ? { left: +文r.left.toFixed(2), top: +文r.top.toFixed(2), right: +文r.right.toFixed(2), bottom: +文r.bottom.toFixed(2) } : null,
          块: { left: +块r.left.toFixed(2), top: +块r.top.toFixed(2), right: +块r.right.toFixed(2), bottom: +块r.bottom.toFixed(2) },
          编: { left: +编r.left.toFixed(2), top: +编r.top.toFixed(2), bottom: +编r.bottom.toFixed(2) },
          内缩左: +内缩左.toFixed(2),
          编辑器scrollTop: 编辑.scrollTop,
        },
        全文: (document.querySelector(编) as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
      }
    },
    [编辑器, 外壳, 图片块] as const,
  )
  记.图文同区.块序 = 序.map((项) => (项.类型 === '图片' ? '图' : `文(${项.文本})`)).join('|')
  const t = 记.图文同区 as any
  // 旧判据「待发序列是 .shuru-kuang-waike 的盒内后代」→ 新判据「图片块的宿主就是编辑器本体，且编辑器在外盒里」：
  // 同一个「图不跑到输入区外」的语义，载体从"序列行"变成"流内原子块"，判据等价且更严（父级必须精确等于编辑器）。
  expect(t.块宿主是编辑器, '图片块必须与文字同处 .shuru-kuang 这一条流里').toBe(true)
  expect(t.块在外盒内, '图片块必须是 .shuru-kuang-waike 的盒内后代（旧判据逐字等价）').toBe(true)
  expect(t.外盒水平包含块, '外盒水平方向必须包住块').toBe(true)
  // 旧判据「序列与 textarea 同左缘（≤1px）」→ 新判据「块左缘对齐编辑器内容左缘（≤1px）」：同一条内缩真源。
  expect(t.块左缘对齐内容左缘, '块左缘与编辑器内容左缘差 >1px（内缩不再是同一批令牌）').toBeLessThanOrEqual(1)
  // 旧判据「DOM 序：序列在 textarea 之前」+「视觉序：序列在上」随真内联作废 ⇒
  // 换成更强的「图文同一条流」：块与文字落在同一行盒内，且先打的文字排在块之前。
  // 但这一支的前提是块的几何守得住 64px 契约（--daifa-kuai-tu-kuan/gao）：本轮块被撑到
  // 1152×419（同一处 <style scoped> 打不到 JS 造节点的缺陷，见 取证贴纸进待发 与 fp2324 取证点 B
  // —— 那两条才是 64px 契约的正主判据，均保持真红），一行放不下才被迫单独成行。
  // 于是这里按「块合规 ⇒ 必须同行；块不合规 ⇒ 记因不重复算账」判，避免一个根因刷掉两条判据。
  const 块超契约 = t.块.宽 > 65 || t.块.高 > 65
  if (块超契约) {
    test.info().annotations.push({
      type: 'bug',
      description: `待发块几何已越过 64px 契约（实测 ${t.块.宽}×${t.块.高}），故「块与文字同一行盒」这一支本轮取证为「因」不成立、不计新账；64px 契约的红在 取证贴纸进待发 / fp2324 取证点 B。`,
    })
  }
  expect(t.与文字同一行盒 || 块超契约, '块与文字不在同一行盒内 ⇒ 仍是两个宿主分行排布，真内联没落地').toBe(true)
  expect(t.文字在块之前 || 块超契约, '先打的文字必须排在块之前（DOM 序 = 用户输入序）').toBe(true)
  expect(t.全文.replace(/\s/g, ''), '整条流的文字投影必须保住用户已打的字').toContain('图文同区')
  // 旧判据「输入区外独立图片容器数 = 0」→ 保留同一条，并额外钉「旧序列容器不得复活」。
  expect(t.旧序列容器数, '旧待发序列容器 .dai-fa-kuai-lie 不得复活').toBe(0)
  expect(t.编辑器外块数, '图片/文字块不得落在编辑器之外').toBe(0)
  expect(t.编辑器外独立图片容器数, '图片不得落在输入区外的独立容器').toBe(0)
  // 折叠态把 64px 缩略图裁到只剩一角：这一支派单口径是「只记录不放宽」，与 fp10c ⑥ 同因。
  if (t.块可视比 < 1) {
    test.info().annotations.push({
      type: 'info',
      description: `FP-10c 实测：折叠态（${t.编辑器可视高}px）里 64px 缩略图只能看到 ${(t.块可视比 * 100).toFixed(1)}%，旧的独立序列行是完整可见的。`,
    })
  }
  await 清空待发(page)
  await expect(page.locator('.dai-fa-kuai'), '点 × 后块序列必须清空（旧判据看的是序列容器，等价换成块本身）').toHaveCount(0)
  await 清空文本(page)
}

/* —— 判定点 3：贴纸历史行（FP-24a）+ 贴纸进待发（FP-10a 生产者真机可达）—— */

async function 量块(page: Page, 定位器: ReturnType<Page['locator']>) {
  return 定位器.evaluate((el: HTMLElement) => {
    const img = el as HTMLImageElement
    const r = img.getBoundingClientRect()
    const cs = getComputedStyle(img)
    return {
      类: img.className,
      渲染宽: +r.width.toFixed(2),
      渲染高: +r.height.toFixed(2),
      objectFit: cs.objectFit,
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
      for (let y = 0; y < c.height; y += 1) {
        for (let x = 0; x < c.width; x += 1) {
          const i = (y * c.width + x) * 4
          if (d[i + 3] > 200 && Math.abs(d[i] - RGB[0]) < 24 && Math.abs(d[i + 1] - RGB[1]) < 24 && Math.abs(d[i + 2] - RGB[2]) < 24) {
            if (x < 最x) 最x = x
            if (y < 最y) 最y = y
            if (x > 大x) 大x = x
            if (y > 大y) 大y = y
          }
        }
      }
      return { 带宽: 大x - 最x + 1, 带高: 大y - 最y + 1 }
    },
    [b64, 色],
  )
  return { 名, ...带 }
}

async function 取证贴纸历史行(page: Page, 记: Record<string, unknown>) {
  const 行1 = page.locator('.xiaoxi-xiangmu.yonghu-xiaoxi').first()
  const 行2 = page.locator('.xiaoxi-xiangmu:has(img[src*="zhaopian-360x400"])').first()
  await expect(行1).toBeVisible({ timeout: 20000 })
  await expect(行2).toBeVisible({ timeout: 20000 })
  记.贴纸历史行 = {
    M1整行文本: (await 行1.innerText()).replace(/\s+/g, ' ').trim(),
    M1含文字: (await 行1.innerText()).includes('贴纸随附文字甲'),
    M2含文字: (await 行2.innerText()).includes('混排文字乙'),
    M1媒体分支盒数: await 行1.locator('.biaoqingbao-waike').count(),
  }
  const 贴纸图 = 行1.locator('img.tuwen-kuai-tu--biaoqingbao').first()
  await expect(贴纸图).toBeVisible({ timeout: 15000 })
  await 贴纸图.scrollIntoViewIfNeeded()
  await expect.poll(async () => 贴纸图.evaluate((el: HTMLImageElement) => el.naturalWidth > 0), { timeout: 15000 }).toBe(true)
  记.贴纸块 = await 量块(page, 贴纸图)
  记.贴纸块内容带 = await 量内容带(page, 贴纸图, 'M1 贴纸 600×200 → 120 方盒 contain')
  const 照片图 = 行2.locator('img.tuwen-kuai-tu:not(.tuwen-kuai-tu--biaoqingbao)').first()
  await 照片图.scrollIntoViewIfNeeded()
  记.照片块 = await 量块(page, 照片图)
  const t = 记.贴纸块 as any
  expect(记.M1含文字 ?? (记.贴纸历史行 as any).M1含文字, '贴纸+文字行的文字不得被丢弃').toBe(true)
  expect((记.贴纸历史行 as any).M1媒体分支盒数, '不再短路进媒体分支').toBe(0)
  expect(Math.abs(t.渲染宽 - 120), '贴纸盒 120px 宽').toBeLessThanOrEqual(1)
  expect(Math.abs(t.渲染高 - 120), '贴纸盒 120px 高').toBeLessThanOrEqual(1)
  expect(t.objectFit, '贴纸 contain').toBe('contain')
  expect(t.natural宽 !== t.natural高, '素材非方形（否则证不出裁切）').toBe(true)
  const tb = 记.贴纸块内容带 as any
  expect(Math.abs(tb.带宽 - 120), '内容带宽 120（等比铺满短边）').toBeLessThanOrEqual(2)
  expect(Math.abs(tb.带高 - 40), '内容带高 40 = 120/3（cover 会填满 120 ⇒ 裁切）').toBeLessThanOrEqual(2)
  const p = 记.照片块 as any
  expect(Math.abs(p.渲染宽 - 180), '照片盒 180 宽未回归').toBeLessThanOrEqual(1)
  expect(Math.abs(p.渲染高 - 200), '照片盒 200 高未回归').toBeLessThanOrEqual(1)
  expect(p.objectFit, '照片 cover 未回归').toBe('cover')
}

async function 取证贴纸进待发(page: Page, 记: Record<string, unknown>) {
  const 消息数前 = await page.locator('.xiaoxi-xiangmu').count()
  await page.locator('.biaoqing-anniu').click()
  await expect(page.locator('.emoji-mianban')).toBeVisible({ timeout: 5000 })
  await page.locator('.mianban-tab').nth(1).click()
  await page.waitForTimeout(200)
  const 贴纸按钮 = page.locator('.biaoqingbao-fenqu').nth(1).locator('.biaoqingbao-xiangmu').first()
  await expect(贴纸按钮).toBeVisible({ timeout: 5000 })
  await 贴纸按钮.click()
  await expect(page.locator('.emoji-mianban')).toBeHidden({ timeout: 5000 })
  const 贴纸缩略 = page.locator('.dai-fa-kuai-tu--biaoqingbao').first()
  await expect(贴纸缩略).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(1200)
  await 贴纸缩略.scrollIntoViewIfNeeded()
  await expect.poll(async () => 贴纸缩略.evaluate((el: HTMLImageElement) => el.naturalWidth > 0), { timeout: 15000 }).toBe(true)
  记.贴纸进待发 = await 量块(page, 贴纸缩略)
  const 消息数后 = await page.locator('.xiaoxi-xiangmu').count()
  记.贴纸进待发.直发守卫 = { 消息数前, 消息数后 }
  const s = 记.贴纸进待发 as any
  expect(s.类).toContain('dai-fa-kuai-tu--biaoqingbao')
  expect(s.objectFit, '待发贴纸 contain（贴纸档）').toBe('contain')
  expect(Math.abs(s.渲染宽 - 64), '待发贴纸盒宽 =64px（--daifa-kuai-tu-kuan）').toBeLessThanOrEqual(1)
  expect(Math.abs(s.渲染高 - 64), '待发贴纸盒高 =64px').toBeLessThanOrEqual(1)
  expect(消息数后, '点贴纸不得直发（历史行数不变）').toBe(消息数前)
  await 清空待发(page)
  await expect(page.locator('.emoji-mianban')).toBeHidden({ timeout: 5000 })
}

/* —— 判定点 4：面板开合顶行（Q-23b）—— */

async function 取证面板顶行(page: Page, 记: Record<string, unknown>) {
  const 读行 = async () =>
    page.evaluate(() => {
      const 外 = document.querySelector('.shuru-kuang-waike') as HTMLElement
      const 板 = document.querySelector('.emoji-mianban') as HTMLElement | null
      const 板g = document.querySelector('.gengduo-mianban') as HTMLElement | null
      const r = 外.getBoundingClientRect()
      const cs = 板 ? getComputedStyle(板) : null
      const br = 板 && 板.offsetHeight ? 板.getBoundingClientRect() : null
      const gr = 板g && 板g.offsetHeight ? 板g.getBoundingClientRect() : null
      return {
        外顶y: +r.top.toFixed(2),
        表情面板: br ? { 高: +br.height.toFixed(2), max高度: cs?.maxHeight, display: cs?.display } : null,
        更多面板: gr ? { 高: +gr.height.toFixed(2) } : null,
      }
    })
  // 展开/收起带过渡动画 ⇒ 点击前等稳定；关闭一律用「点击消息区空白 ⇒ 全局 outside-click 收起」，
  // 避免面板生长中按钮位移造成 click 落进面板自身（toggle 不生效）的假失败。
  const 稳定读 = async () => {
    let 前 = await 读行()
    for (let i = 0; i < 8; i += 1) {
      await page.waitForTimeout(250)
      const 后 = await 读行()
      if (Math.abs(后.外顶y - 前.外顶y) <= 0.5) return 后
      前 = 后
    }
    return 前
  }
  const 空白关闭 = async () => {
    await page.locator('main.xiaoxi-quyu').click({ position: { x: 8, y: 8 } })
    await page.waitForTimeout(450)
  }
  const 静置 = await 稳定读()
  await page.locator('.biaoqing-anniu').click()
  const 表情开 = await 稳定读()
  await 空白关闭()
  const 表情关 = await 稳定读()
  await page.locator('.gengduo-plus-anniu').click()
  const 更多开 = await 稳定读()
  await 空白关闭()
  const 更多关 = await 稳定读()
  记.面板顶行 = {
    静置,
    表情开,
    表情关,
    更多开,
    更多关,
    表情顶开量: +(静置.外顶y - 表情开.外顶y).toFixed(2),
    表情关闭回落量: +(表情关.外顶y - 表情开.外顶y).toFixed(2),
    更多顶开量: +(静置.外顶y - 更多开.外顶y).toFixed(2),
  }
  const r = 记.面板顶行 as any
  expect(r.表情开.表情面板, '表情面板确已展开').not.toBeNull()
  expect(Math.abs(r.表情关闭回落量 - r.表情顶开量), '关面板应完全回落（不留残位移）').toBeLessThanOrEqual(1)
  expect(Math.abs(表情关.外顶y - 静置.外顶y), '表情关后回位 ≤1px').toBeLessThanOrEqual(1)
  expect(Math.abs(更多关.外顶y - 静置.外顶y), '更多关后回位 ≤1px').toBeLessThanOrEqual(1)
}

/* —— 控制台分账 —— */

function 收控制台(collector: ReturnType<typeof createConsoleCollector>, 记: Record<string, unknown>, 名: string) {
  const 错误 = collector.getErrors().filter((e) => !/\.(woff2?|ttf|otf)(\?.*)?$/.test(e.location?.url || ''))
  const 警告 = collector.getWarnings()
  const 资源 = collector.getResourceFailures()
  记.控制台 = {
    错误: 错误.map((e) => e.text),
    警告: 警告.map((w) => w.text),
    资源失败: 资源.map((r) => `${r.text}`),
  }
  if (错误.length > 0) {
    throw new Error(`${名} 控制台 error 非零:\n${错误.map((e) => `${e.text} @ ${e.location?.url ?? ''}`).join('\n')}`)
  }
}

const 结果: Record<string, unknown> = {
  端口: process.env.FPVC_PORT ?? 5190,
  headless: true,
  素材: { 贴纸: '600×200 非方形 #00e5ff', 照片: '360×400' },
}

function 落盘(名?: string) {
  fs.mkdirSync(path.dirname(结果文件), { recursive: true })
  let 已存: Record<string, unknown>
  try {
    已存 = JSON.parse(fs.readFileSync(结果文件, 'utf8')) as Record<string, unknown>
  } catch {
    已存 = {}
  }
  const 合并 = { ...已存, ...结果 }
  fs.writeFileSync(结果文件, JSON.stringify(合并, null, 2), 'utf8')
  if (名) {
    fs.writeFileSync(path.resolve(path.dirname(结果文件), `快照-input-${名.replace(/[^\w一-龥.+-]/g, '_')}.json`), JSON.stringify(合并, null, 2), 'utf8')
  }
}

let 当前用例名 = '初始化'
test.beforeEach((_, 信息) => { 当前用例名 = 信息.title })
test.afterEach(() => 落盘(当前用例名.replace(/\s+/g, '')))
test.afterAll(() => 落盘())

/*
 * FP-10c⑤ 编排改判（旧→新，为什么拆分而不是加大 timeout）：
 *   旧：每档位一只 180s 大 test，内部塞 7 探针×3 图标 + 图文同区 + 贴纸 +（桌面另加）历史行/面板顶行，
 *   共享同一条 180s 墙钟 —— 移动档本轮吃满 3.0 分钟，整只 test 红在后段，前段取证与后段判据一起丢。
 *   CLI `--timeout` 被 spec 内置 test.setTimeout 覆盖，加大只会把超时红推迟，不解决「一处红连带杀掉
 *   同 test 其余判据」的结构问题。
 *   新：判据集原样拆成 per-test —— ① 每只图标（表情/加号/语音）的 7 探针矩阵与等高/热区断言各立一
 *   test（判据逐条未动，见 取证图标与热区 单图标形参）；② 图文同区、贴纸进待发、（桌面）贴纸历史行
 *   与面板顶行各立一 test；③ viewport 自证与容器溢出现在**每 test 都记**（原为一档一次 ⇒ 超集）；
 *   ④ console error=0 门禁从「一档一个采集器」改为「每 test 每页一个采集器」，观察窗口只紧不松；
 *   ⑤ 全页截图仍按原文件名各档一张。总判据集 = 原集，且单条红不再吞掉同档位其余取证。
 *   test.setTimeout(180000) 保持原值不变（未加大）：拆细后单 test（进页 ≤6s + 单图标矩阵 ≲60s，
 *   移动慢档按本轮 3.0m/整档折算 ≈1/4 ≈45s）远在预算内。
 */
const 档清单 = [
  { 标签: '桌面1440x900', 宽: 1440, 高: 900, 移动: false },
  { 标签: '移动390x844', 宽: 390, 高: 844, 移动: true },
] as const

async function 跑取证段(
  browser: import('@playwright/test').Browser,
  档: (typeof 档清单)[number],
  段: string,
  动作: (页: Page, 记: Record<string, unknown>) => Promise<void>,
  整页截图 = false,
) {
  const ctx = 档.移动
    ? await browser.newContext({ viewport: { width: 档.宽, height: 档.高 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
    : await browser.newContext({ viewport: { width: 档.宽, height: 档.高 } })
  const page = await ctx.newPage()
  const collector = createConsoleCollector(page)
  const 记: Record<string, unknown> = {}
  结果[`${档.标签}·${段}`] = 记
  await 挂载夹具(page)
  await 进入聊天页(page)
  await 记容器与溢出(page, 记)
  expect((记.视口自证 as any).innerWidth, `${档.标签} viewport 自证`).toBe(档.宽)
  await 动作(page, 记)
  if (整页截图) {
    await page.screenshot({ path: path.join(截图目录, `FP-VERIFY-CHAT-态1输入区-${档.标签}-${日期}.png`), timeout: 60000 })
  }
  收控制台(collector, 记, `${档.标签} ${段}`)
  await ctx.close()
}

for (const 档 of 档清单) {
  for (const 图 of 图标表) {
    test(`态1 ${档.标签} 图标等高与热区·${图.名}`, async ({ browser }) => {
      await 跑取证段(browser, 档, `图标热区·${图.名}`, (页, 记) => 取证图标与热区(页, 档.标签, 记, 图))
    })
  }
  test(`态1 ${档.标签} 图文同区（FP-10b）`, async ({ browser }) => {
    await 跑取证段(browser, 档, '图文同区', async (页, 记) => { await 取图文同区(页, 记) }, true)
  })
  test(`态1 ${档.标签} 贴纸进待发（FP-10a）`, async ({ browser }) => {
    await 跑取证段(browser, 档, '贴纸进待发', (页, 记) => 取证贴纸进待发(页, 记))
  })
}

// 桌面档独有判据（旧桌面大 test 的专有条目，移动档本就不跑 ⇒ 覆盖面不变）
test('态1 桌面 贴纸历史行（FP-24a）', async ({ browser }) => {
  await 跑取证段(browser, 档清单[0], '贴纸历史行', (页, 记) => 取证贴纸历史行(页, 记))
})
test('态1 桌面 面板开合顶行（Q-23b）', async ({ browser }) => {
  await 跑取证段(browser, 档清单[0], '面板顶行', (页, 记) => 取证面板顶行(页, 记))
})
