import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  daKaiJiaJuQingQiu,
  baoZhengCeShiZhangHao,
  zhuRuJiaJuShenFen,
  type JiaJuShenFen,
} from './测试夹具'
import { createConsoleCollector } from './console-error-collector'
import { scanScrollStrip } from './滚动条像素取样'

/**
 * FP-11 浏览器取证与零错误总门禁（末道验收）。
 *
 * 覆盖已完成 9 个缺陷项 × 桌面 1440×900 / 手机 375×667 × 浅色/暗色 = 每场景 4 组截图，
 * 每组采 console error / console warning / pageerror 三条通道（既有单项 spec 多数只收 error，
 * warning 采集 + 白名单噪音逐条列出是本文件的增量）。
 *
 * 既有单项 spec（fp01/fp02/fp03/fp04/fp05/fp06/fp07b）仍是其各自主张的唯一钉住处，本文件不重复实现；
 * 本文件新增的三件：
 *   ① 缺陷8 真机插话（WebSocket 协议帧级判据，见 场景G）；
 *   ② 缺陷4 结算趣味文案的快照 10 次读回恒定（见 快照恒定）；
 *   ③ 缺陷11 无权限秘籍的可见反馈（见 采聊天静态）。
 *
 * 环境事实（PROGRESS.md 已核实，全部按此写）：
 *   F21 无头给 Chromium 无条件传 --hide-scrollbars ⇒ 本文件整体 headed。
 *   F22 <1px 边框取整为 0.8px/边 ⇒ 像素高差留 0.65px 容差。
 *   F25 core.autocrlf=true ⇒ 源码正则一律 `\r?\n`。
 *   主线程可被认证页 3D 背景压到 0.03~2.3 帧/秒 ⇒ 判据一律走协议帧/事件/时间戳，不设帧距上限。
 *   禁止与 `npx vitest run` 并发运行本文件。
 */

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 截图目录 = path.resolve(本目录, '../../测试截图')
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces')
const 后端翻译路径 = path.resolve(本目录, '../../backend/src/config/translations.ts')
const 日期 = '20260921'
const 前缀 = 'fp11'

const 视口清单 = [
  { 名: '桌面1440x900', 宽: 1440, 高: 900 },
  { 名: '手机375x667', 宽: 375, 高: 667 },
] as const
type 主题 = '浅色' | '暗色'
type 组合 = { 主题: 主题; 视口: (typeof 视口清单)[number] }
/** `FP11_SOLO=1` 只跑第一组合（浅色/桌面），用于定点快速复现与冒烟；正式门禁必须全量 */
const 定点 = process.env.FP11_SOLO === '1'
const 全组合清单: 组合[] = (['浅色', '暗色'] as 主题[]).flatMap((主) =>
  视口清单.map((视) => ({ 主题: 主, 视口: 视 })),
)
const 组合清单: 组合[] = 定点 ? [全组合清单[0]] : 全组合清单
const 组合名 = (组: 组合) => `${组.主题 === '浅色' ? 'light' : 'dark'}-${组.视口.名}`
const 期望主题属性 = (组: 组合) => (组.主题 === '浅色' ? 'light' : 'dark')

const 通关口令 = 'whosyourdaddy'
const 无权限口令 = 'greedisgood'
const 无权限文案 = '当前账号没有打开管理员面板的权限'
const 旧标签集 = new Set(['在一起了 💕', '放弃了本局挑战'])
const 通关结局键 = 'sheng_li_ai_qing'
const 失败结局键 = 'shi_bai_fang_qi_tiao_zhan'

type 控制台条 = { 文本: string; 位置: string }
type 探针 = {
  采集器: ReturnType<typeof createConsoleCollector>
  原始错误: 控制台条[]
  原始警告: 控制台条[]
  页面异常: string[]
}
type 取证行 = {
  场景: string
  组合: string
  主题属性: string
  数值: Record<string, string | number>
  截图: string[]
  门禁错误: 控制台条[]
  门禁警告: 控制台条[]
  白名单错误: 控制台条[]
  原始错误: 控制台条[]
  原始警告: 控制台条[]
  页面异常: string[]
}

const 行集: 取证行[] = []
const 专项结论: string[] = []
const 视觉复核: string[] = []

function 装探针(page: Page): 探针 {
  const 采集器 = createConsoleCollector(page)
  const 探针值: 探针 = { 采集器, 原始错误: [], 原始警告: [], 页面异常: [] }
  page.on('console', (志) => {
    const 位 = 志.location()
    const 条: 控制台条 = {
      文本: 志.text(),
      位置: 位?.url ? `${位.url}:${位.lineNumber}:${位.columnNumber}` : '(无位置)',
    }
    if (志.type() === 'error') 探针值.原始错误.push(条)
    else if (志.type() === 'warning') 探针值.原始警告.push(条)
  })
  page.on('pageerror', (异) => 探针值.页面异常.push(String(异?.message ?? 异)))
  return 探针值
}

/** 门禁口径：以既有单源采集器（console-error-collector）的白名单为唯一分界线，白名单外的 error 一律进门禁 */
function 分门禁(探针值: 探针) {
  const 允许 = new Set(探针值.采集器.getErrors().map((项) => 项.text))
  return {
    门禁错误: 探针值.原始错误.filter((条) => 允许.has(条.文本)),
    白名单错误: 探针值.原始错误.filter((条) => !允许.has(条.文本)),
    门禁警告: 探针值.原始警告,
  }
}

function 签名(文本: string): string {
  return 文本
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .slice(0, 190)
}

function 分桶(清单: 控制台条[]) {
  const 表 = new Map<string, { 条数: number; 样例: 控制台条 }>()
  for (const 条 of 清单) {
    const 项 = 表.get(签名(条.文本))
    if (项) 项.条数 += 1
    else 表.set(签名(条.文本), { 条数: 1, 样例: 条 })
  }
  return [...表.entries()].map(([签, 项]) => ({ 签名: 签, 条数: 项.条数, 样例: 项.样例 }))
}

async function 拍照(page: Page, 组: 组合, 场景: string, 状态: string, 选择器?: string): Promise<string> {
  await fs.promises.mkdir(截图目录, { recursive: true })
  const 名 = `${前缀}-${场景}-${组合名(组)}-${状态}.png`
  const 路径 = path.join(截图目录, 名)
  if (选择器) await page.locator(选择器).first().screenshot({ path: 路径, timeout: 120000 })
  else await page.screenshot({ path: 路径, timeout: 180000 })
  return `测试截图/${名}`
}

async function 开上下文(浏览器: Browser, 组: 组合): Promise<{ page: Page; 探针值: 探针 }> {
  const context = await 浏览器.newContext({ viewport: { width: 组.视口.宽, height: 组.视口.高 } })
  await context.addInitScript(([主]: string[]) => localStorage.setItem('主题', 主), [组.主题])
  const page = await context.newPage()
  return { page, 探针值: 装探针(page) }
}

async function 读主题属性(page: Page): Promise<string> {
  return (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) ?? '(未设置)'
}

function 记行(场景: string, 组: 组合, 值: Record<string, string | number>, 截图: string[], 探针值: 探针): 取证行 {
  const 切 = 分门禁(探针值)
  const 主题属性 = String(值.主题属性 ?? '(未记录)')
  const 行: 取证行 = {
    场景,
    组合: 组合名(组),
    主题属性,
    数值: 值,
    截图,
    门禁错误: 切.门禁错误,
    白名单错误: 切.白名单错误,
    门禁警告: 切.门禁警告,
    原始错误: [...探针值.原始错误],
    原始警告: [...探针值.原始警告],
    页面异常: [...探针值.页面异常],
  }
  行集.push(行)
  断言主题(行, 组)
  写证据('增量')
  return 行
}

function 断言主题(行: 取证行, 组: 组合) {
  if (行.场景.startsWith('A ')) return
  expect(
    行.主题属性,
    `主题未真正切换（4 组合前提不成立）：${行.场景}/${行.组合} data-theme=${行.主题属性}`,
  ).toBe(期望主题属性(组))
}

/* ───────────────────────── 后端趣味池真源（F25：一律 \r?\n） ───────────────────────── */

function 取段(全文: string, 段名: string): string {
  const 起 = 全文.indexOf(`${段名}: {`)
  if (起 < 0) throw new Error(`后端翻译缺类目 ${段名}`)
  const 余 = 全文.slice(起)
  const 收 = 余.search(/\r?\n {2}\},/)
  if (收 < 0) throw new Error(`${段名} 段收尾异常`)
  return 余.slice(0, 收)
}

function 取池(段名: string, 键: string): string[] {
  const 段 = 取段(fs.readFileSync(后端翻译路径, 'utf-8'), 段名)
  const 起 = 段.search(new RegExp(`\\r?\\n {4}${键}: \\[`))
  if (起 < 0) throw new Error(`${段名} 段里没有 ${键}`)
  const 子 = 段.slice(起, 段.indexOf(']', 起))
  return [...子.matchAll(/'([^']*)'/g)].map((项) => 项[1])
}

function 代入性别(句: string, 性别: string): string {
  return 句.replaceAll('{TA}', 性别 === 'nan' ? '他' : 性别 === 'nv' ? '她' : 'TA')
}

/* ───────────────────────── WCAG 对比度取样（自建最小实现） ───────────────────────── */

async function 对比度取样(page: Page, 范围选择器: string, 目标: string[]) {
  return page.evaluate(
    ([范围, 目标集]) => {
      const 根 = document.querySelector(范围) as HTMLElement | null
      if (!根) return [] as any[]
      const 分量 = (串: string): [number, number, number, number] => {
        const m = 串.match(/rgba?\(([^)]+)\)/)
        if (!m) return [0, 0, 0, 1]
        const 数 = m[1].split(',').map((x) => parseFloat(x.trim()))
        return [数[0] || 0, 数[1] || 0, 数[2] || 0, 数.length > 3 ? 数[3] : 1]
      }
      const 合成 = (
        底: [number, number, number],
        前: [number, number, number, number],
      ): [number, number, number] => [
        前[0] * 前[3] + 底[0] * (1 - 前[3]),
        前[1] * 前[3] + 底[1] * (1 - 前[3]),
        前[2] * 前[3] + 底[2] * (1 - 前[3]),
      ]
      const 有效背景 = (元: HTMLElement | null): [number, number, number] => {
        const 层: [number, number, number, number][] = []
        let 游: HTMLElement | null = 元
        while (游) {
          const c = 分量(getComputedStyle(游).backgroundColor)
          if (c[3] > 0) {
            层.push(c)
            if (c[3] >= 0.999) break
          }
          游 = 游.parentElement
        }
        let 底: [number, number, number] = [255, 255, 255]
        for (let i = 层.length - 1; i >= 0; i--) 底 = 合成(底, 层[i])
        return 底
      }
      const 亮度 = (色: [number, number, number]) => {
        const v = 色.map((x) => {
          const s = x / 255
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
      }
      const 出: any[] = []
      for (const 选 of 目标集) {
        const 集合 = 根.querySelectorAll(选)
        if (!集合.length) continue
        const 元 = 集合[0] as HTMLElement
        const 前 = 分量(getComputedStyle(元).color)
        const 底 = 有效背景(元)
        const l1 = 亮度(合成(底, 前))
        const l2 = 亮度(底)
        const r = 元.getBoundingClientRect()
        出.push({
          标识: 选,
          对比度: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100,
          前景: `rgb(${Math.round(前[0])},${Math.round(前[1])},${Math.round(前[2])})`,
          背景: `rgb(${Math.round(底[0])},${Math.round(底[1])},${Math.round(底[2])})`,
          宽: Math.round(r.width * 100) / 100,
          高: Math.round(r.height * 100) / 100,
          禁用: (元 as HTMLButtonElement).disabled === true,
        })
      }
      return 出
    },
    [范围选择器, 目标] as [string, string[]],
  )
}

/* ───────────────────────── 场景A+B：认证页（缺陷1/2）与草地背景直采（事故 A1） ───────────────────────── */

/**
 * 只截「滚动条条带列」与「相邻内容列」两条窄带各取主色：宽元素上直接整块逐列取样
 * 会把表单内容列当成条带（实测 `.biaodan-gundong` 上量出 299px 假条宽），故另写这一版。
 */
async function 条带取色(page: Page, 选择器: string, 条宽: number) {
  const 盒 = await page.locator(选择器).first().boundingBox()
  if (!盒) return { 条带色: 'n/a', 内容色: 'n/a' }
  const { default: sharp } = await import('sharp')
  const 高 = Math.round(Math.max(8, Math.min(盒.height - 8, 220)))
  const 宽 = Math.max(2, Math.round(条宽) - 2)
  const 截 = async (x: number, w: number) =>
    page.screenshot({ clip: { x: Math.round(x), y: Math.round(盒.y + 4), width: Math.max(1, Math.round(w)), height: 高 } })
  const 主色 = async (图: Buffer) => {
    const { data, info } = await sharp(图).raw().toBuffer({ resolveWithObject: true })
    const 表 = new Map<string, number>()
    for (let i = 0; i < data.length; i += info.channels) {
      const 色 = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`
      表.set(色, (表.get(色) ?? 0) + 1)
    }
    return [...表.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'n/a'
  }
  return {
    条带色: await 主色(await 截(盒.x + 盒.width - 条宽 + 1, 宽)),
    内容色: await 主色(await 截(盒.x + 6, 18)),
  }
}

/** 两张同尺寸截图的逐像素差异比例（%）：判「画面仍在累积/收敛」还是「已稳定」，稳定后的观感才是真观感 */
async function 图差(甲: string, 乙: string): Promise<number> {
  const { default: sharp } = await import('sharp')
  const a = await sharp(甲).raw().toBuffer({ resolveWithObject: true })
  const b = await sharp(乙)
    .resize({ width: a.info.width, height: a.info.height })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const 道 = a.info.channels
  const 像素 = Math.floor(Math.min(a.data.length, b.data.length) / 道)
  let 不同 = 0
  for (let i = 0; i < 像素; i++) {
    const p = i * 道
    if (a.data[p] !== b.data[p] || a.data[p + 1] !== b.data[p + 1] || a.data[p + 2] !== b.data[p + 2]) 不同++
  }
  return Math.round((不同 / Math.max(1, 像素)) * 1000) / 10
}

async function 采认证与草地(浏览器: Browser, 组: 组合, 收敛探针: boolean) {
  const { page, 探针值 } = await 开上下文(浏览器, 组)
  const 截图: string[] = []

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#denglu-shoujihao'), `登录输入框未渲染：${组合名(组)}`).toBeVisible({
    timeout: 90000,
  })
  await page.waitForTimeout(2500)

  /* —— 事故 A1：草地与人物在应用内（iframe）的真实呈现 + 三维几何读数 —— */
  const 草地页 = page.frames().find((帧) => 帧.url().includes('grass-bg'))
  const 草地值: Record<string, string | number> = { 主题属性: await 读主题属性(page) }
  if (草地页) {
    const 到齐 = await 草地页
      .waitForFunction(
        () => {
          const w = window as any
          return w.__caoDiYiJieLu === true && w.__wuDaoLu === 'zhuDao' && w.__wuZhuJueZhuGuan === true
        },
        null,
        { timeout: 120000, polling: 500 },
      )
      .then(() => true)
      .catch(() => false)
    await page.waitForTimeout(3000)
    const 读数 = await 草地页
      .evaluate(() => {
        const w = window as any
        const 结: Record<string, unknown> = {
          揭示: w.__caoDiYiJieLu ?? null,
          阶段: w.__caoDiJieDuan ?? null,
          道路: w.__wuDaoLu ?? null,
          主观点: w.__wuZhuJueZhuGuan ?? null,
          染色: w.__caoDiYiRanSe ?? null,
          阴影: w.__wuYinYingZhuangTai ?? null,
          内部错误: (w.__errors ?? []).slice(0, 5),
          配置: w.__wuPEIZHI ?? null,
        }
        const 网 = w.__wuZhuJueMesh
        if (!网) return 结
        网.updateWorldMatrix(true, false)
        const e = 网.matrixWorld.elements
        const 世界Y = (x: number, y: number, z: number) => e[1] * x + e[5] * y + e[9] * z + e[13]
        const 位 = 网.geometry.attributes.position
        const uv = 网.geometry.attributes.uv
        const 步 = Math.max(1, Math.floor(位.count / 800))
        const 读 = { v0小: Infinity, v0大: -Infinity, v1小: Infinity, v1大: -Infinity, 小: Infinity, 大: -Infinity }
        for (let i = 0; i < 位.count; i += 步) {
          const yy = 世界Y(位.getX(i), 位.getY(i), 位.getZ(i))
          读.小 = Math.min(读.小, yy)
          读.大 = Math.max(读.大, yy)
          const v = uv ? uv.getY(i) : 0.5
          if (v < 0.01) {
            读.v0小 = Math.min(读.v0小, yy)
            读.v0大 = Math.max(读.v0大, yy)
          } else if (v > 0.99) {
            读.v1小 = Math.min(读.v1小, yy)
            读.v1大 = Math.max(读.v1大, yy)
          }
        }
        const 圆 = (n: number) => Math.round(n * 1e4) / 1e4
        结.几何 = {
          位置: 网.position.toArray().map(圆),
          旋转度: [圆((网.rotation.x * 180) / Math.PI), 圆((网.rotation.y * 180) / Math.PI)],
          排序: 网.rotation.order,
          缩放: 圆(网.scale.x),
          贴地边世界Y: 读.v0小 === Infinity ? null : [圆(读.v0小), 圆(读.v0大)],
          远端边世界Y: 读.v1小 === Infinity ? null : [圆(读.v1小), 圆(读.v1大)],
          整体世界Y: [圆(读.小), 圆(读.大)],
        }
        return 结
      })
      .catch(() => ({ 内部错误: ['frame evaluate 失败'] }))
    草地值.揭示 = String((读数 as any).揭示)
    草地值.阶段 = String((读数 as any).阶段)
    草地值.道路 = String((读数 as any).道路)
    草地值.染色就绪 = String((读数 as any).染色)
    草地值.阴影片 = String((读数 as any).阴影)
    草地值.内部错误 = ((读数 as any).内部错误 ?? []).join(' | ') || '0 条'
    草地值.几何 = JSON.stringify((读数 as any).几何 ?? null)
    草地值.配置 = JSON.stringify((读数 as any).配置 ?? null)
    草地值.门控达成 = 到齐 ? '是' : '否'
    const 渲染器 = await 草地页
      .evaluate(() => {
        try {
          const c = document.createElement('canvas')
          const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
          if (!gl) return { 厂商: 'n/a', 渲染器: '无 WebGL 上下文' }
          const e = gl.getExtension('WEBGL_debug_renderer_info')
          return {
            厂商: e ? String(gl.getParameter(e.UNMASKED_VENDOR_WEBGL)) : '(受保护)',
            渲染器: e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : '(受保护)',
          }
        } catch (异) {
          return { 厂商: 'n/a', 渲染器: String(异) }
        }
      })
      .catch(() => ({ 厂商: 'n/a', 渲染器: 'evaluate 失败' }))
    草地值.WebGL厂商 = 渲染器.厂商
    草地值.WebGL渲染器 = 渲染器.渲染器
    截图.push(await 拍照(page, 组, 'caodi', 'iframe', '.grass-bg-iframe'))
    // 判观感一律用整页截图：iframe 元素截图走的是另一条合成通道（实测同一时刻元素截图呈"边缘检测"化、整页正常），不可当肉眼观感依据
    const 早 = await 拍照(page, 组, 'caodi', 'full')
    if (收敛探针) {
      // 先做收敛复拍（同视口、同构图），再做 1920×1080  excursion —— 改视口会重置引擎累积历史，混在一起就分不清差异来源
      await page.waitForTimeout(45000)
      const 晚名 = `${前缀}-caodi-${组合名(组)}-full-late.png`
      await page.screenshot({ path: path.join(截图目录, 晚名), timeout: 180000 })
      截图.push(`测试截图/${晚名}`)
      草地值.收敛差异pct = await 图差(path.join(截图目录, path.basename(早)), path.join(截图目录, 晚名))
      草地值.收敛判据 = `同视口间隔 45s 两次整页截图差异 ${草地值.收敛差异pct}%（≈0 ⇒ 稳态观感即截图所见；>0 ⇒ 仍在累积）`
      // 参考构图 `备用资源（重要，勿删）/最终效果图.png` 是 16:9（1920×1080）拍的，人物在下中前景；
      // 本门禁的 4 组合是 16:10 / 9:16，人物是否仍入画必须单独取一帧 16:9 判构图，不能拿参考图当结论。
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.waitForTimeout(10000)
      const 宽屏名 = `${前缀}-caodi-${组合名(组)}-1920x1080.png`
      await page.screenshot({ path: path.join(截图目录, 宽屏名), timeout: 180000 })
      截图.push(`测试截图/${宽屏名}`)
      await page.setViewportSize({ width: 组.视口.宽, height: 组.视口.高 })
      await page.waitForTimeout(3000)
    }
    截图.push(早)
    视觉复核.push(
      `A 草地背景 ${组合名(组)}：${截图[截图.length - 1]}（门控=${草地值.门控达成} 阶段=${草地值.阶段} 染色=${草地值.染色就绪}）`,
    )
    expect(
      草地值.门控达成,
      `事故 A1 复核前提：草地/人物在应用内未完成揭示（阶段=${草地值.阶段} 内部错误=${草地值.内部错误}）`,
    ).toBe('是')
  } else {
    草地值.门控达成 = 'iframe 未在场'
    expect(草地页, `事故 A1 复核前提：${组合名(组)} 认证页上找不到 grass-bg iframe`).toBeTruthy()
  }
  记行('A 草地背景(A1)', 组, 草地值, 截图.filter((项) => 项.includes('-caodi-')), 探针值)

  /* —— 缺陷1：文本输入框焦点不绘 outline；缺陷2：表单居中 —— */
  await page.click('#denglu-shoujihao')
  await page.waitForTimeout(500)
  const 焦点态 = await page.evaluate(() => {
    const 元 = document.querySelector('#denglu-shoujihao') as HTMLElement
    const cs = getComputedStyle(元)
    const 口 = document.querySelector('.yemian-rongqi') as HTMLElement | null
    const 表单 = document.querySelector('.denglu-neirong') as HTMLElement | null
    const 线 = document.querySelector('.dixian-dixian') as HTMLElement | null
    const 标 = document.querySelector('.fudong-biaoqian') as HTMLElement | null
    const 偏 =
      口 && 表单
        ? Math.round(
            Math.abs(
              表单.getBoundingClientRect().left +
                表单.getBoundingClientRect().width / 2 -
                (口.getBoundingClientRect().left + 口.getBoundingClientRect().width / 2),
            ) * 100,
          ) / 100
        : -1
    return {
      outline式: cs.outlineStyle,
      outline宽: cs.outlineWidth,
      下划线: 线 ? getComputedStyle(线, '::after').transform : 'n/a',
      标签色: 标 ? getComputedStyle(标).color : 'n/a',
      居中偏差: 偏,
      滚动口: 口 ? `${口.scrollHeight}/${口.clientHeight}` : 'n/a',
    }
  })
  const 登录值: Record<string, string | number> = {
    主题属性: await 读主题属性(page),
    输入框outline: `${焦点态.outline式} ${焦点态.outline宽}`,
    焦点下划线: 焦点态.下划线,
    焦点标签色: 焦点态.标签色,
    表单水平偏差px: 焦点态.居中偏差,
    滚动口scrollH除clientH: 焦点态.滚动口,
  }
  expect(焦点态.outline式, '缺陷1 回归：文本输入框仍绘制 outline（白线）').toBe('none')
  // 缺陷1 摘掉 outline 后，金色下划线 scaleX(1) 就是文本框唯一的焦点指示，必须在位（FP-02 契约）
  expect(焦点态.下划线, `缺陷1 副作用：文本输入框既无 outline 也无下划线焦点指示（${焦点态.下划线}）`).toMatch(
    /matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)/,
  )
  expect(Math.abs(焦点态.居中偏差), '缺陷2 回归：登录表单水平不居中').toBeLessThanOrEqual(1)
  截图.push(await 拍照(page, 组, 'denglu', 'jujiao'))

  /* —— 缺陷1 的另一半：非文本控件必须有可见焦点环 —— */
  await page.evaluate(() => (document.querySelector('#denglu-mima') as HTMLElement).focus())
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  const 环 = await page.evaluate(() => {
    const 元 = document.activeElement as HTMLElement
    const cs = getComputedStyle(元)
    return {
      元: `${元.tagName.toLowerCase()}#${元.id || '-'}.${typeof 元.className === 'string' ? 元.className.slice(0, 30) : ''}`,
      式: cs.outlineStyle,
      宽: cs.outlineWidth,
      色: cs.outlineColor,
    }
  })
  登录值.Tab焦点元素 = 环.元
  登录值.Tab焦点环 = `${环.式} ${环.宽} ${环.色}`
  expect(环.式, `缺陷1 回归：键盘焦点落在 ${环.元} 却无焦点环`).not.toBe('none')
  expect(parseFloat(环.宽), `缺陷1 回归：焦点环宽度为 0（${环.元}）`).toBeGreaterThan(0)
  记行('B 认证页-登录(缺陷1/2)', 组, 登录值, 截图.filter((项) => 项.includes('-denglu-')), 探针值)

  /* —— 缺陷2 注册态：滚动口必须真的出条 —— */
  await page.locator('.biaoqian-anniu').filter({ hasText: '注册' }).first().click()
  await page.waitForTimeout(1500)
  const 注册态 = await page.evaluate(() => {
    const 条 = document.querySelector('.biaodan-gundong') as HTMLElement | null
    if (!条) return { 在场: false as const }
    const cs = getComputedStyle(条)
    return {
      在场: true as const,
      scrollH: 条.scrollHeight,
      clientH: 条.clientHeight,
      溢出: 条.scrollHeight > 条.clientHeight,
      需类: 条.classList.contains('xuyao-gundong'),
      scrollbarWidth属: cs.scrollbarWidth,
      生效条宽: Math.round((条.offsetWidth - 条.clientWidth) * 100) / 100,
    }
  })
  const 注册值: Record<string, string | number> = { 主题属性: await 读主题属性(page), 注册滚动口: JSON.stringify(注册态) }
  expect(注册态.在场, '缺陷2 前提：注册滚动口 .biaodan-gundong 不在场').toBe(true)
  if (注册态.在场 && 注册态.溢出) {
    const 带 = await 条带取色(page, '.biaodan-gundong', Math.max(4, 注册态.生效条宽))
    注册值.注册条带色 = 带.条带色
    注册值.注册内容色 = 带.内容色
    expect(注册态.需类, `缺陷2 回归：注册口溢出却未挂 xuyao-gundong（${注册值.注册滚动口}）`).toBe(true)
    expect(注册态.生效条宽, `缺陷2 回归：注册滚动条不占位/不可点（生效条宽 ${注册态.生效条宽}）`).toBeGreaterThanOrEqual(4)
    expect(带.条带色, `缺陷2 回归：滚动条条带与内容同色（画不出来）：${带.条带色}`).not.toBe(带.内容色)
  }
  截图.push(await 拍照(page, 组, 'zhuCe', 'full'))
  记行('B 认证页-注册(缺陷2)', 组, 注册值, 截图.filter((项) => 项.includes('-zhuCe-')), 探针值)
  await page.context().close()
}

/* ───────────────────────── 场景C：资料设置向导（缺陷3 性别配色） ───────────────────────── */

async function 采向导(浏览器: Browser, 组: 组合, 身份: JiaJuShenFen) {
  const { page, 探针值 } = await 开上下文(浏览器, 组)
  const 值: Record<string, string | number> = {}
  const 截图: string[] = []
  // 与 fp03 同一手法：把服务端出参的默认性别钉成 null，让「未选→中性」档可复现；其余数据不伪造
  await page.route('**/api/认证/信息', async (路) => {
    const 响 = await 路.fetch()
    let 体: unknown
    try {
      体 = await 响.json()
    } catch {
      await 路.fallback()
      return
    }
    const 数 = (体 as { shu_ju?: Record<string, unknown> } | null)?.shu_ju
    if (数 && 'mo_ren_xing_bie' in 数) 数.mo_ren_xing_bie = null
    await 路.fulfill({ status: 响.status(), headers: 响.headers(), body: JSON.stringify(体) })
  })
  await zhuRuJiaJuShenFen(page, 身份)
  await page.goto('/profile-setup?moshi=putong', { waitUntil: 'domcontentloaded' })
  const 卡 = page.locator('.ziliao-kapian').first()
  try {
    await 卡.waitFor({ state: 'visible', timeout: 60000 })
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await 卡.waitFor({ state: 'visible', timeout: 90000 })
  }
  await page.waitForTimeout(4000)

  const 取色 = () =>
    page.evaluate(() => {
      const 读 = (选: string) => {
        const 元 = document.querySelector(选) as HTMLElement | null
        if (!元) return null
        const cs = getComputedStyle(元)
        return {
          底: cs.backgroundColor,
          文字: cs.color,
          属性: 元.closest('.ziliao-kapian')?.getAttribute('data-xingbie') ?? '(无)',
        }
      }
      return { 按钮: 读('.anniu-zhuYao'), 圆点: 读('.jindu-dian.dangQian'), 卡: 读('.ziliao-kapian') }
    })

  const 未选 = await 取色()
  截图.push(await 拍照(page, 组, 'xiangDao', 'wei-xuan', '.ziliao-kapian'))
  const 点档 = async (标签: string) => {
    await page.locator('.ziJi-xingBie-kaPian').filter({ hasText: 标签 }).first().click({ timeout: 30000 })
    await page.waitForTimeout(1300)
    return 取色()
  }
  const 男 = await 点档('男')
  const 女 = await 点档('女')
  值.主题属性 = await 读主题属性(page)
  值.性别档 = `${未选.卡?.属性} → ${男.卡?.属性} → ${女.卡?.属性}`
  值.按钮底色 = [未选.按钮?.底, 男.按钮?.底, 女.按钮?.底].join(' | ')
  值.按钮文字 = [未选.按钮?.文字, 男.按钮?.文字, 女.按钮?.文字].join(' | ')
  值.圆点底色 = [未选.圆点?.底, 男.圆点?.底, 女.圆点?.底].join(' | ')
  截图.push(await 拍照(page, 组, 'xiangDao', 'nv', '.ziliao-kapian'))
  const 三档唯一 = (取: (项: typeof 未选) => string | undefined) =>
    new Set([未选, 男, 女].map((项) => 取(项))).size
  expect(三档唯一((项) => 项.按钮?.底), `缺陷3 回归：主按钮底色不随性别三档变化 → ${值.按钮底色}`).toBe(3)
  expect(三档唯一((项) => 项.圆点?.底), `缺陷3/F24 回归：进度圆点不随性别三档变化 → ${值.圆点底色}`).toBe(3)
  expect(值.圆点底色, 'F24 回归：浅色档圆点又被主题覆写压成 rgba(55,42,63,.5)').not.toContain('rgba(55, 42, 63, 0.5)')
  await page.context().close()
  return 记行('C 向导性别配色(缺陷3)', 组, 值, 截图, 探针值)
}

/* ───────────────────────── 场景D：聊天页几何 / 折叠滚动条 / 表情面板 / 无权限秘籍 ───────────────────────── */

/**
 * socket 监听必须在导航之前挂上：`page.waitForEvent('websocket')` 只收注册之后打开的连接，
 * 而 socket.io 在聊天页首屏就建连（`stores/聊天.ts:406` transports 首选 websocket）⇒
 * 先 goto 再等就永远等不到（实测：3 次尝试全部误报「socket 未建连」）。
 */
async function 开聊天页(浏览器: Browser, 组: 组合, 身份: JiaJuShenFen) {
  const { page, 探针值 } = await 开上下文(浏览器, 组)
  const 连接 = page
    .waitForEvent('websocket', (ws) => ws.url().includes('/socket.io'), { timeout: 60000 })
    .catch(() => null)
  await zhuRuJiaJuShenFen(page, 身份)
  return { page, 探针值, 连接 }
}

async function 进聊天页(浏览器: Browser, 组: 组合, 身份: JiaJuShenFen, 角色ID: string) {
  const 开 = await 开聊天页(浏览器, 组, 身份)
  await 开.page.goto(`/chat/${角色ID}`, { waitUntil: 'domcontentloaded' })
  await expect(开.page.locator('.shuru-kuang'), `聊天输入区未渲染：${组合名(组)}`).toBeVisible({ timeout: 90000 })
  await 开.page.waitForTimeout(2500)
  return 开
}

async function 采聊天静态(浏览器: Browser, 组: 组合, 身份: JiaJuShenFen, 角色ID: string) {
  const { page, 探针值 } = await 进聊天页(浏览器, 组, 身份, 角色ID)
  const 值: Record<string, string | number> = {}
  const 截图: string[] = []

  const 几何 = await page.evaluate(() => {
    const an = document.querySelector('.fasong-anniu') as HTMLElement
    const 壳 = document.querySelector('.shuru-kuang-waike') as HTMLElement
    const 框 = document.querySelector('.shuru-kuang') as HTMLElement
    const a = an.getBoundingClientRect()
    const 中 = (x: number, y: number) => {
      const 命中 = document.elementFromPoint(Math.round(x), Math.round(y))
      return !!命中 && (命中 === an || an.contains(命中) || 命中.contains(an))
    }
    return {
      按钮高: Math.round(a.height * 100) / 100,
      外壳高: Math.round(壳.getBoundingClientRect().height * 100) / 100,
      输入框高: Math.round(框.getBoundingClientRect().height * 100) / 100,
      上20: 中(a.left + a.width / 2, a.top + a.height / 2 - 20),
      下20: 中(a.left + a.width / 2, a.top + a.height / 2 + 20),
      最小高: getComputedStyle(an).minHeight,
    }
  })
  值.发送按钮高 = 几何.按钮高
  值.输入框外壳高 = 几何.外壳高
  值.输入框实高 = 几何.输入框高
  值.按钮外壳高差 = Math.abs(几何.按钮高 - 几何.外壳高)
  值.按钮44热区 = `上${几何.上20 ? '中' : '空'}/下${几何.下20 ? '中' : '空'}`
  值.按钮minHeight = 几何.最小高
  // F22：0.5px 边框被 Chromium 取整为 0.8px/边 ⇒ 0.65px 容差
  expect(值.按钮外壳高差, `缺陷5 回归：发送按钮与输入框外壳高差 ${值.按钮外壳高差}px`).toBeLessThanOrEqual(0.65)
  // 未声明 min-height 时 computed 是 `auto`（FP-05 删掉了 44px 地板）；出现任何 ≥40px 的字面值即回归
  expect(
    ['auto', 'none', '0px', '0'].includes(几何.最小高) || parseFloat(几何.最小高) < 40,
    `缺陷5 回归：发送按钮又写回 min-height 字面值（${几何.最小高}）`,
  ).toBe(true)
  expect(几何.上20 && 几何.下20, '缺陷5 回归：44×44 热区不再命中发送按钮').toBe(true)

  await page.fill('.shuru-kuang', '一\n二\n三\n四\n五\n六\n七\n八\n九\n十\n十一\n十二')
  await page.waitForTimeout(800)
  const 溢出 = await page.evaluate(() => {
    const 框 = document.querySelector('.shuru-kuang') as HTMLTextAreaElement
    const cs = getComputedStyle(框)
    const r = 框.getBoundingClientRect()
    const 边 = parseFloat(cs.borderLeftWidth) || 0
    return {
      scrollH: 框.scrollHeight,
      clientH: 框.clientHeight,
      scrollbarWidth属: cs.scrollbarWidth,
      生效条宽: Math.max(0, Math.round((r.width - 框.clientWidth - 边 * 2) * 100) / 100),
    }
  })
  值.折叠scrollH = 溢出.scrollH
  值.折叠clientH = 溢出.clientH
  值.折叠生效条宽 = 溢出.生效条宽
  值.折叠scrollbarWidth属 = 溢出.scrollbarWidth属
  const 条像素 = await scanScrollStrip(page, '.shuru-kuang', Math.max(8, 溢出.生效条宽))
  const 条令牌 = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    return {
      滑块: cs.getPropertyValue('--gundong-tiao-huakuai').trim(),
      轨道: cs.getPropertyValue('--gundong-tiao-guidao').trim(),
    }
  })
  值.折叠条宽像素 = 条像素.条宽
  // 取样按条带的上/下半命名（thumb 在打字后随光标语在底部，硬叫 thumb/track 会反）
  值.折叠条带上色 = 条像素.thumb色
  值.折叠条带下色 = 条像素.track色
  值.折叠底色 = 条像素.底色
  值.滚动条令牌 = `滑块=${条令牌.滑块} 轨道=${条令牌.轨道}`
  expect(溢出.scrollH, `折叠态取样前提：无溢出（scrollH ${溢出.scrollH} ≤ clientH ${溢出.clientH}）`).toBeGreaterThan(溢出.clientH)
  expect(溢出.生效条宽, `缺陷6 回归：折叠态滚动条不占位（生效条宽 ${溢出.生效条宽}）`).toBeGreaterThanOrEqual(4)
  expect(条像素.条宽, `缺陷6 回归：渲染出的折叠态滚动条 ${条像素.条宽}px 不足 4px`).toBeGreaterThanOrEqual(4)
  expect(条像素.底色, '折叠态滚动条像素取样取到底色与条带同色（取样失效）').not.toBe(条像素.thumb色)
  const 输入带 = await 条带取色(page, '.shuru-kuang', Math.max(4, 溢出.生效条宽))
  值.折叠条带色 = 输入带.条带色
  值.折叠内容色 = 输入带.内容色
  expect(输入带.条带色, `缺陷6 回归：折叠态滚动条条带与内容同色（画不出来）：${输入带.条带色}`).not.toBe(输入带.内容色)
  截图.push(await 拍照(page, 组, 'liaotian', 'zhedie', '.shuru-rongqi'))
  await page.fill('.shuru-kuang', '')
  await page.waitForTimeout(500)

  await page.click('.biaoqing-anniu', { timeout: 30000 })
  await expect(page.locator('.emoji-mianban'), '缺陷10 前提：表情面板打不开').toBeVisible({ timeout: 30000 })
  await page.waitForTimeout(1000)
  const 面板行 = await 对比度取样(page, '.emoji-mianban', [
    '.tian-jia',
    '.tian-jia-jia',
    '.fenqu-guanli',
    '.biaoqingbao-ge',
    '.biaoqingbao-tupian',
    '.biaoqingbao-wenzi',
    '.emoji-xiangmu',
    '.mianban-tab',
    '.fenqu-biaoti',
  ])
  值.表情面板控件数 = 面板行.length
  值.面板最低对比度 = 面板行.length ? Math.min(...面板行.map((项) => 项.对比度)) : 'n/a'
  值.面板对比度 = 面板行.map((项) => `${项.标识.replace(/^\./, '')}=${项.对比度}${项.禁用 ? '(禁)' : ''}`).join(' | ')
  expect(面板行.length, '缺陷10 前提：表情面板内一个控件都没采到').toBeGreaterThan(0)
  const 不达标 = 面板行.filter((项) => 项.对比度 < (项.禁用 ? 3 : 4.5))
  expect(
    不达标.map((项) => `${项.标识} ${项.前景}/${项.背景}=${项.对比度}`),
    '缺陷10 回归：表情面板存在对比度不达标控件',
  ).toEqual([])
  截图.push(await 拍照(page, 组, 'biaoqing', 'open', '.emoji-mianban'))

  await page.click('.shuru-kuang', { timeout: 30000 })
  await page.fill('.shuru-kuang', 无权限口令)
  await page.press('.shuru-kuang', 'Enter')
  const 提示 = page.locator('.fasong-cuowu')
  await 提示.waitFor({ state: 'visible', timeout: 30000 })
  const 提示文本 = (await 提示.innerText()).trim()
  const 提示可见 = await 提示.isVisible()
  const 提示色 = await 提示.evaluate((元) => getComputedStyle(元).color)
  const 面板开 = await page.locator('.guanli-jiankong-fuchuang').count()
  const 输入已清 = (await page.inputValue('.shuru-kuang')) === ''
  值.无权限提示 = 提示文本
  值.提示可见 = 提示可见 ? '是' : '否'
  值.提示颜色 = 提示色
  值.管理员面板开 = 面板开
  值.指令后输入清空 = 输入已清 ? '是' : '否'
  expect(提示文本, '缺陷11 回归：无权限提示文案不是翻译值').toBe(无权限文案)
  expect(面板开, '缺陷11 回归：无权限账号仍弹出了管理员面板').toBe(0)
  expect(输入已清, '缺陷11：秘籍指令未被吃掉（输入框残留）').toBe(true)
  截图.push(await 拍照(page, 组, 'liaotian', 'wuquanxian'))
  值.主题属性 = await 读主题属性(page)
  await page.context().close()
  return 记行('D 聊天页(缺陷5/6/10/11)', 组, 值, 截图, 探针值)
}

/* ───────────────────────── 场景E：过往战绩底板 + 真拖拽跟手（缺陷7） ───────────────────────── */

async function 采战绩(浏览器: Browser, 组: 组合, 身份: JiaJuShenFen, 拖一把: boolean) {
  const { page, 探针值 } = await 开上下文(浏览器, 组)
  const 值: Record<string, string | number> = {}
  const 截图: string[] = []
  await zhuRuJiaJuShenFen(page, 身份)
  await page.goto('/guo-wang-zhan-ji', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.zhanji-kapian').first(), `战绩卡片未渲染：${组合名(组)}`).toBeVisible({ timeout: 90000 })
  await page.waitForTimeout(2500)
  const 底板 = await page.evaluate(() => {
    const 卡 = document.querySelector('.zhanji-kapian') as HTMLElement
    const 列 = document.querySelector('.zhanji-liebiao') as HTMLElement | null
    return {
      卡背景: getComputedStyle(卡).backgroundColor,
      列背景: 列 ? getComputedStyle(列).backgroundColor : 'n/a',
      令牌: getComputedStyle(document.documentElement).getPropertyValue('--yemian-di-beijing').trim(),
      卡数: document.querySelectorAll('.zhanji-kapian').length,
    }
  })
  值.卡片背景 = 底板.卡背景
  值.列表背景 = 底板.列背景
  值.令牌值 = 底板.令牌
  值.卡片数 = 底板.卡数
  expect(底板.卡背景, '缺陷7 回归：卡片底板未走 --yemian-di-beijing 令牌').toBe(底板.令牌)
  expect(底板.列背景, '缺陷7 回归：滚动层自带第二块底板（与卡片叠加）').toBe('rgba(0, 0, 0, 0)')
  截图.push(await 拍照(page, 组, 'zhanji', 'full'))

  if (拖一把) {
    expect(底板.卡数, `缺陷7 取证前提：夹具账号真实战绩卡片 ${底板.卡数} 张，不足 2 张`).toBeGreaterThanOrEqual(2)
    const 卡 = page.locator('.zhanji-liebiao .zhanji-kapian').nth(1)
    const 盒 = await 卡.boundingBox()
    expect(盒, '缺陷7 取证前提：取不到卡片几何').toBeTruthy()
    const x = 盒!.x + 盒!.width / 2
    let y = 盒!.y + 盒!.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y - 14, { steps: 5 })
    await page.waitForTimeout(400)
    const 甲 = await page.evaluate(() => {
      const g = document.querySelector('.zhanji-kapian.sortable-drag') as HTMLElement | null
      const 内 = g?.querySelector('.zhanji-kapian-nei') as HTMLElement | null
      return {
        顶: g ? Math.round(g.getBoundingClientRect().top * 100) / 100 : null,
        外层变换: g ? getComputedStyle(g).transform : 'n/a',
        内层变换: 内 ? getComputedStyle(内).transform : 'n/a',
        外层过渡: g ? getComputedStyle(g).transitionDuration : 'n/a',
        内层动画: 内 ? getComputedStyle(内).animationName : 'n/a',
      }
    })
    expect(甲.顶, '缺陷7 取证前提：拖拽未激活（无 sortable-drag 鬼影）').not.toBeNull()
    const 再移 = 130
    y -= 再移
    await page.mouse.move(x, y, { steps: 14 })
    await page.waitForTimeout(400)
    const 乙 = await page.evaluate(
      () => Math.round((document.querySelector('.zhanji-kapian.sortable-drag') as HTMLElement).getBoundingClientRect().top * 100) / 100,
    )
    await page.mouse.up()
    await page.waitForTimeout(1000)
    const 位移 = Math.round((Number(甲.顶) - 乙) * 100) / 100
    const 比值 = Math.round(((位移 / 再移) as number) * 1000) / 1000
    值.鬼影外层 = 甲.外层变换
    值.鬼影内层 = 甲.内层变换
    值.鬼影外层过渡 = 甲.外层过渡
    值.鬼影内层动画 = 甲.内层动画
    值.指针位移px = 再移
    值.鬼影位移px = 位移
    值.跟手比值 = 比值
    截图.push(await 拍照(page, 组, 'zhanji', 'luoding'))
    expect(比值, `缺陷7 回归：拖拽跟手比值 ${比值}（改前 0.981，FP-04b 实测 1.000）越出 ±3%`).toBeGreaterThanOrEqual(0.97)
    expect(比值, `缺陷7 回归：拖拽跟手比值 ${比值} 越出 ±3%`).toBeLessThanOrEqual(1.03)
    expect(甲.外层变换, `缺陷7 回归：鬼影外层又带上 scale（位移被库归一化吃掉，F9）`).not.toMatch(/matrix\((?!1, 0, 0, 1)/)
    expect(甲.内层变换, `缺陷7 起手倾斜（F10/7d）：tilt 不在内层了`).toContain('matrix')
  }
  值.主题属性 = await 读主题属性(page)
  await page.context().close()
  return 记行('E 过往战绩(缺陷7)', 组, 值, 截图, 探针值)
}

/* ───────────────────────── 场景F：结算弹窗（缺陷4） ───────────────────────── */

/**
 * 发送口判据：`/api/聊天/会话/:id/消息` 里的中文在浏览器网络层被百分号编码，
 * `响.url()` 拿到的是编码态 ⇒ 直接用中文字面量正则永不命中（既有 spec `fp07-jieju-wen'an.spec.ts:196`
 * 正是栽在这里：它的通关分支必然 TimeoutError）。一律先 decode 再匹配。
 */
/** 把编码态 URL 还原成可正则的中文路径（Playwright 的 `响.url()` 是网络层编码态） */
function 解码URL(串: string): string {
  try {
    return decodeURIComponent(串)
  } catch {
    return 串
  }
}

function 是发送消息接口(响: { url(): string; request(): { method(): string } }): boolean {
  return /\/api\/聊天\/会话\/[^/]+\/消息/.test(解码URL(响.url())) && 响.request().method() === 'POST'
}

function 令牌头(身份: JiaJuShenFen): Record<string, string> {
  return { authorization: `Bearer ${身份.lingPai}` }
}

async function 新角色(请求: APIRequestContext, 头: Record<string, string>) {
  const 开始 = await 请求.post('/api/挑战/开始', {
    headers: 头,
    data: { woDeXingBie: 'nan', duiXiangXingBie: 'nv' },
  })
  expect([200, 409], `开始挑战异常：HTTP ${开始.status()}`).toContain(开始.status())
  const 体 = await 开始.json().catch(() => null)
  let 角色ID = String(体?.shu_ju?.id ?? '')
  let 性别 = String(体?.shu_ju?.xing_bie ?? 'nv')
  if (开始.status() === 409 || !角色ID) {
    const 当前 = await (await 请求.get('/api/挑战/当前', { headers: 头 })).json().catch(() => null)
    角色ID = String(当前?.shu_ju?.dui_ju?.jiao_se_id ?? 角色ID)
    性别 = String(当前?.shu_ju?.dui_ju?.dui_xiang_xing_bie ?? 性别)
  }
  expect(角色ID, '未取得进行中的挑战对局角色').toBeTruthy()
  return { 角色ID, 性别 }
}

async function 读回文案(请求: APIRequestContext, 头: Record<string, string>, 角色ID: string) {
  const 列表 = await (await 请求.get('/api/战绩/列表', { headers: 头 })).json().catch(() => null)
  const 条目 = (列表?.shu_ju?.dangAnLieBiao ?? []).find(
    (项: { jiao_se_id?: string }) => String(项.jiao_se_id) === 角色ID,
  )
  return String(条目?.jie_guo_lei_xing ?? '')
}

async function 采结算(
  浏览器: Browser,
  组: 组合,
  身份: JiaJuShenFen,
  请求: APIRequestContext,
  档: '通关' | '失败',
) {
  const 头 = 令牌头(身份)
  const { 角色ID, 性别 } = await 新角色(请求, 头)
  const { page, 探针值, 连接: 连接Promise } = await 开聊天页(浏览器, 组, 身份)
  const 值: Record<string, string | number> = {}
  const 截图: string[] = []
  await page.goto(`/chat/${角色ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.shuru-kuang'), `聊天输入区未渲染：${组合名(组)}`).toBeVisible({ timeout: 90000 })
  await page.waitForTimeout(2500)
  const 连接 = !!(await 连接Promise)
  expect(连接, `缺陷4 前提：socket 未建连（结算弹窗靠推送），${组合名(组)}`).toBe(true)

  let 服务端句 = ''
  if (档 === '通关') {
    const 回执 = page
      .waitForResponse(
        (响) => /\/api\/聊天\/会话\/[^/]+\/消息/.test(响.url()) && 响.request().method() === 'POST',
        { timeout: 40000 },
      )
      .then((响) => 响.json().catch(() => null))
    await page.fill('.shuru-kuang', 通关口令)
    await page.press('.shuru-kuang', 'Enter')
    const 体 = await 回执
    expect(体?.shu_ju?.shi_mi_ji, `通关档未走秘籍分支：${JSON.stringify(体).slice(0, 160)}`).toBe(true)
  } else {
    const 放弃 = await 请求.post('/api/挑战/放弃', { headers: 头 })
    expect(放弃.status(), '放弃结算接口异常').toBe(200)
    const 体 = await 放弃.json().catch(() => null)
    const 结算 = 体?.shu_ju?.jie_guo ?? {}
    expect(String(结算.jie_guo_lei_xing ?? ''), '结算结局键不对').toBe(失败结局键)
    expect(结算.shi_fou_tong_guan, '放弃必判失败，服务端却下发通关').toBe(false)
    服务端句 = String(结算.jie_guo_wen_an ?? '')
  }
  const 弹层 = page.locator('.youxi-tanchuang')
  await 弹层.waitFor({ state: 'visible', timeout: 90000 })
  await page.waitForTimeout(1000)
  const 正文 = (await page.locator('.youxi-miaoshu').innerText()).trim()
  const 标题 = (await page.locator('.youxi-biaoti').innerText()).trim()
  const 类名 = (await 弹层.getAttribute('class')) ?? ''
  截图.push(await 拍照(page, 组, 'jiesuan', 'tanchuang', '.youxi-tanchuang'))
  截图.push(await 拍照(page, 组, 'jiesuan', 'yemian'))
  const 池 = 取池(档 === '通关' ? 'jieGuoTongGuanChi' : 'jieGuoShiBaiChi', 档 === '通关' ? 通关结局键 : 失败结局键).map(
    (句) => 代入性别(句, 性别),
  )
  值.主题属性 = await 读主题属性(page)
  值.档位 = 档
  值.角色ID = 角色ID
  值.结局键 = 档 === '通关' ? 通关结局键 : 失败结局键
  值.弹窗类名 = 类名
  值.标题 = 标题
  值.正文 = 正文
  值.命中趣味池 = 池.includes(正文) ? '是' : '否'
  值.服务端下发句 = 服务端句 || '(通关档只走 socket)'
  值.趣味池句数 = 池.length
  expect(旧标签集.has(正文), `缺陷4 回归：弹窗仍是改版前短标签 ${正文}`).toBe(false)
  expect(池.includes(正文), `缺陷4：弹窗正文不在该结局的后端趣味池内 → ${正文}`).toBe(true)
  expect(正文).not.toContain('{TA}')
  expect(类名).toContain(档 === '通关' ? 'shengli' : 'shibai')
  const 一次读回 = await 读回文案(请求, 头, 角色ID)
  值.一次读回 = 一次读回
  expect(一次读回, '缺陷4 快照回归：读回与结算那一刻不同').toBe(正文)
  await page.context().close()
  记行('F 结算弹窗(缺陷4)', 组, 值, 截图, 探针值)
  return { 角色ID, 正文 }
}

/**
 * 同一局重复加载 10 次文案恒定：7 次服务端读回 + 3 次真浏览器加载（捕获前端实际收到的
 * /api/战绩/列表 响应体）。该句在 DOM 的唯一渲染点是结算弹窗与战报海报入参
 * （`过往战绩.vue:880`），弹窗只在结算那一刻由 socket 下发 ⇒ 恒定判据取「读回链逐字一致」。
 */
async function 快照恒定(
  浏览器: Browser,
  组: 组合,
  身份: JiaJuShenFen,
  请求: APIRequestContext,
  角色ID: string,
  正文: string,
) {
  const 头 = 令牌头(身份)
  const 序列: string[] = []
  for (let i = 0; i < 7; i++) 序列.push(`api:${await 读回文案(请求, 头, 角色ID)}`)
  for (let i = 0; i < 3; i++) {
    const { page } = await 开上下文(浏览器, 组)
    const 响应文本 = page
      .waitForResponse((响) => /\/api\/战绩\/列表/.test(响.url()), { timeout: 60000 })
      .then(async (响) => {
        const 体 = await 响.json().catch(() => null)
        const 条目 = (体?.shu_ju?.dangAnLieBiao ?? []).find(
          (项: { jiao_se_id?: string }) => String(项.jiao_se_id) === 角色ID,
        )
        return String(条目?.jie_guo_lei_xing ?? '')
      })
      .catch(() => '(前端未发出该请求)')
    await zhuRuJiaJuShenFen(page, 身份)
    await page.goto('/guo-wang-zhan-ji', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.zhanji-kapian', { timeout: 90000 })
    await page.waitForTimeout(1500)
    序列.push(`page:${await 响应文本}`)
    await page.context().close()
  }
  const 唯一 = [...new Set(序列.map((项) => 项.split(':').slice(1).join(':')))]
  const 判定 = 唯一.length === 1 && 唯一[0] === 正文
  专项结论.push(
    `[缺陷4] 快照恒定 10 次读回（7 服务端 + 3 真页面加载）：唯一值 ${唯一.length} 个 ${判定 ? '恒定 ✓' : '漂移 ✗ → ' + 序列.join(' ‖ ')}`,
  )
  expect(唯一.length, `缺陷4 快照回归：10 次读回出现多个值 → ${序列.join(' ‖ ')}`).toBe(1)
  expect(唯一[0], '缺陷4 快照回归：10 次读回的值不是结算那一刻的句子').toBe(正文)
}

/* ───────────────────────── 场景G：缺陷8 真机插话（WebSocket 协议帧判据） ───────────────────────── */

type 帧 = { t: number; 事件: string; 轮次: number | null; 驱动: string | null; 文本: string[]; 状态?: string }

async function 采插话(浏览器: Browser, 组: 组合, 身份: JiaJuShenFen, 请求: APIRequestContext) {
  const 头 = 令牌头(身份)
  const 尝试记录: Record<string, string | number>[] = []
  for (let 序 = 1; 序 <= 3; 序++) {
    志(`插话 第 ${序} 次：开局`)
    const { 角色ID } = await 新角色(请求, 头)
    志(`插话 第 ${序} 次：进聊天页 ${角色ID}`)
    const { page, 探针值, 连接: 连接Promise } = await 开聊天页(浏览器, 组, 身份)
    const 帧集: 帧[] = []
    // 挂在 page 级而非单个 ws 上：socket.io 可能重连/换实例，页级监听保证每条连接都被采到
    page.on('websocket', (w) => {
      if (!w.url().includes('/socket.io')) return
      w.on('framereceived', (f) => {
        const 文 = typeof f.payload === 'string' ? f.payload : ''
        const 起 = 文.indexOf('[')
        if (起 < 0) return
        let 数: unknown
        try {
          数 = JSON.parse(文.slice(起))
        } catch {
          return
        }
        if (!Array.isArray(数)) return
        const 事件 = String(数[0])
        const 据 = (数[1] ?? {}) as Record<string, unknown>
        if (事件 === '角色回复' || 事件 === 'AI状态') {
          帧集.push({
            t: Date.now(),
            事件,
            轮次: typeof 据.轮次 === 'number' ? 据.轮次 : null,
            驱动: typeof 据.驱动消息ID === 'string' ? String(据.驱动消息ID) : null,
            文本: ((据.消息列表 ?? []) as Record<string, unknown>[]).map((项) => String(项.nei_rong ?? '')),
            状态: 事件 === 'AI状态' ? String((据 as Record<string, unknown>).zhuang_tai ?? '') : undefined,
          })
        }
      })
    })
    await page.goto(`/chat/${角色ID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.shuru-kuang'), `聊天输入区未渲染：${组合名(组)}`).toBeVisible({ timeout: 90000 })
    await page.waitForTimeout(2500)
    const ws = await 连接Promise
    if (!ws) {
      尝试记录.push({ 序, 结果: 'socket 未建连' })
      志(`插话 第 ${序} 次：socket 未建连，跳过`)
      await page.context().close()
      continue
    }
    const 句1 = `插话取证第一句${序}：你今天过得怎么样`
    const 句2 = `插话取证第二句${序}：我刚刚想起一件事`
    志(`插话 第 ${序} 次：ws=${ws ? '已连' : '未连'}，发第一句`)
    await page.fill('.shuru-kuang', 句1)
    const 第一条发送 = Date.now()
    await page.press('.shuru-kuang', 'Enter')
    const 截止 = Date.now() + 150000
    let 首条 = 0
    let 心跳 = 0
    while (Date.now() < 截止) {
      const 命中 = 帧集.find((项) => 项.事件 === '角色回复')
      if (命中) {
        首条 = 命中.t
        break
      }
      if (++心跳 % 40 === 0) 志(`插话 第 ${序} 次：等 AI 首条中（已等 ${心跳 * 50 / 1000}s，帧数 ${帧集.length}）`)
      await new Promise((r) => setTimeout(r, 50))
    }
    志(`插话 第 ${序} 次：首条${首条 ? '已到（延迟 ' + (首条 - 第一条发送) + 'ms）' : '未到，150s 超时'}；帧时间线 ${JSON.stringify(帧集.map((项) => `${项.事件}:${项.状态 ?? 项.轮次 ?? ''}`))}`)
    if (!首条) {
      尝试记录.push({ 序, 角色ID, 结果: 'AI 首条回复 150s 内未送达（外部模型链路超时）' })
      记行('G 插话(缺陷8)', 组, { 主题属性: await 读主题属性(page), 尝试: 序, 结果: 'AI 无回复' }, [], 探针值)
      await page.context().close()
      continue
    }

    // 真用户动作：第二句先只填进输入框，等第一轮首条落地的这一刻按回车 ⇒ 插入延迟压到最低
    await page.fill('.shuru-kuang', 句2)
    const 回执 = page
      .waitForResponse(是发送消息接口, { timeout: 60000 })
      .then(async (响) => ({ 状态: 响.status(), 体: await 响.json().catch(() => null) }))
    const 按下 = Date.now()
    await page.press('.shuru-kuang', 'Enter')
    const { 状态: 回执状态, 体: 回执体 } = await 回执
    const 插入完成 = Date.now()
    const 我那条 = String(回执体?.shu_ju?.id ?? '')
    const 前置状态 = [...帧集].reverse().find((项) => 项.事件 === 'AI状态' && 项.t <= 按下)?.状态 ?? '(无)'
    const 旧轮条数 = 帧集.filter((项) => 项.事件 === '角色回复' && 项.t <= 按下).length
    const 真插话 = 回执状态 === 200 && 旧轮条数 >= 1 && 前置状态 !== 'kong_xian'
    志(`插话 第 ${序} 次：插入 HTTP=${回执状态} 前置AI状态=${前置状态} 旧轮条数=${旧轮条数} ⇒ 窗口${真插话 ? '成立' : '不成立'}；静置 18s`)

    await page.waitForTimeout(18000)
    const 回复帧 = 帧集.filter((项) => 项.事件 === '角色回复')
    const 新轮 = 回复帧.filter((项) => 项.驱动 === 我那条)
    const 新轮次号 = 新轮.length ? Math.max(...新轮.map((项) => 项.轮次 ?? 0)) : 0
    const 残余帧 = 回复帧.filter(
      (项) => 项.t > 插入完成 && 项.轮次 !== null && 新轮次号 > 0 && 项.轮次 < 新轮次号,
    )
    const 气泡 = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.qipao-neirong')).map((元) => (元.textContent ?? '').trim()),
    )
    const 库 = await 读回消息(请求, 头, 角色ID)
    const 重复 = 库.角色消息.filter((文, i) => 文 && 库.角色消息.indexOf(文) !== i)
    const 值: Record<string, string | number> = {
      主题属性: await 读主题属性(page),
      尝试: 序,
      角色ID,
      首条回复延迟ms: 首条 - 第一条发送,
      插入前置AI状态: 前置状态,
      按下前旧轮已送达条数: 旧轮条数,
      真插话窗口: 真插话 ? '成立' : '不成立',
      插入HTTP状态: 回执状态,
      回车到落库ms: 插入完成 - 按下,
      我那条服务端ID: 我那条 || '(无)',
      新回复延迟ms: 新轮.length ? Math.min(...新轮.map((项) => 项.t)) - 插入完成 : -1,
      旧轮次残余帧: 残余帧.length,
      角色回复帧总数: 回复帧.length,
      插入条上屏: 气泡.some((项) => 项.includes(句2)) ? '是' : '否',
      插入条在库: 库.用户消息.some((项) => 项.includes(句2)) ? '是' : '否',
      重复AI文本条数: 重复.length,
      重复内容: 重复.join(' ‖ ') || '(无)',
      会话条数: 库.条数,
    }
    const 截图 = [await 拍照(page, 组, 'chahua', `try${序}`)]
    尝试记录.push(值)
    记行('G 插话(缺陷8)', 组, 值, 截图, 探针值)
    await page.context().close()

    if (真插话) {
      专项结论.push(
        `[缺陷8] 真机插话成立（第 ${序} 次，${组合名(组)}）：插话前 AI状态=${前置状态}（非 kong_xian ⇒ 旧轮次仍在分条/延迟队列中）、` +
          `旧轮已送达 ${旧轮条数} 条；插入那条上屏=${值.插入条上屏} 在库=${值.插入条在库}；` +
          `旧轮次残余帧 ${残余帧.length}；内容相同的两条 AI 消息 ${重复.length} 条；` +
          `新回复（驱动消息ID 命中我那条）延迟 ${值.新回复延迟ms}ms。实测首条回复延迟 ${值.首条回复延迟ms}ms = 角色配置的回复延迟毫秒量级，` +
          `「1~3s 内新回复」是条目间隔（后端 计算间隔 0.4~4.5s）而非首轮应答窗口，见报告。`,
      )
      expect(值.插入条上屏, '缺陷8 回归：插入的用户消息未上屏（被吞）').toBe('是')
      expect(值.插入条在库, '缺陷8 回归：插入的用户消息未落库（被吞）').toBe('是')
      expect(重复.length, `缺陷8 回归：出现内容相同的两条 AI 消息 → ${值.重复内容}`).toBe(0)
      expect(残余帧.length, '缺陷8 回归：作废轮次的残余条目仍在送达').toBe(0)
      expect(新轮.length, '缺陷8 回归：插话后没有产生基于新句的新回复').toBeGreaterThan(0)
      return { 成立: true, 尝试记录 }
    }
    专项结论.push(`[缺陷8] 第 ${序} 次未落进插话窗口（前置状态=${前置状态}, 旧轮条数=${旧轮条数}），重试`)
  }
  return { 成立: false, 尝试记录 }
}

async function 读回消息(请求: APIRequestContext, 头: Record<string, string>, 角色ID: string) {
  const 体 = await (
    await 请求.get(`/api/聊天/会话/${角色ID}/消息?pageSize=80`, { headers: 头 })
  ).json().catch(() => null)
  const 列 = (体?.shu_ju?.lie_biao ?? []) as Record<string, unknown>[]
  const 用户消息: string[] = []
  const 角色消息: string[] = []
  for (const 项 of 列) {
    const 文 = String(项.nei_rong ?? '')
    if (项.fa_song_zhe_lei_xing === 'yonghu') 用户消息.push(文)
    else if (项.fa_song_zhe_lei_xing === 'jiao_se') 角色消息.push(文)
  }
  return { 用户消息, 角色消息, 条数: 列.length }
}

/* ───────────────────────── 证据写出 ───────────────────────── */

function 写证据(时机: string) {
  fs.mkdirSync(证据目录, { recursive: true })
  const 门禁错误 = 行集.flatMap((项) => 项.门禁错误.map((条) => ({ 项, 条 })))
  const 白名单 = 行集.flatMap((项) => 项.白名单错误.map((条) => ({ 项, 条 })))
  const 门禁警告 = 行集.flatMap((项) => 项.门禁警告.map((条) => ({ 项, 条 })))
  const 异常 = 行集.flatMap((项) => 项.页面异常.map((条) => ({ 项, 条 })))
  const 行: string[] = [
    `# FP-11 浏览器取证与零错误总门禁（${日期}）`,
    '',
    `写出时刻：${时机} ${new Date().toISOString()}`,
    '',
    '运行：`cd frontend && npx playwright test tests/fp11-menjin-zonglan.spec.ts --workers=1`',
    '**整体 headed**（F21：无头给 Chromium 无条件传 `--hide-scrollbars`，滚动条与像素取样在无头下恒假）。',
    'F22 像素高差容差 0.65px；F25 源码正则一律 `\\r?\\n`；不设帧距上限（本环境主线程可被 3D 背景压到 0.03~2.3 帧/秒）。',
    '禁与 `npx vitest run` 并发。',
    '',
    '## 覆盖矩阵（场景 × 4 组合：桌面 1440×900 / 手机 375×667 × 浅色 / 暗色）',
    '',
    '| 场景 | 组合 | data-theme | 截图 | 门禁 error | 白名单 error | warning | pageerror |',
    '| ---- | ---- | -------- | ---- | --------- | ----------- | ------- | --------- |',
    ...行集.map(
      (项) =>
        `| ${项.场景} | ${项.组合} | ${项.主题属性} | ${项.截图.length} | ${项.门禁错误.length} | ${项.白名单错误.length} | ${项.门禁警告.length} | ${项.页面异常.length} |`,
    ),
    '',
    '## 逐场景数值',
    '',
    ...行集.map((项) => {
      const 表 = Object.entries(项.数值)
        .map(([键, 值]) => `  - ${键} = ${值}`)
        .join('\n')
      return `- **${项.场景} / ${项.组合}**\n${表}\n  - 截图：${项.截图.join(' , ') || '(无)'}`
    }),
    '',
    '## 三项关键取证结论',
    '',
    ...(专项结论.length ? 专项结论.map((项) => `- ${项}`) : ['- (尚未产出)']),
    '',
    '## 控制台 error 逐条清单（门禁内，必须为 0）',
    '',
    门禁错误.length
      ? 分桶(门禁错误.map((项) => 项.条))
          .map(
            (桶, i) =>
              `${i + 1}. ×${桶.条数} —— ${桶.样例.文本.slice(0, 260)}\n   - 位置：${桶.样例.位置}\n   - 出现于：${[...new Set(门禁错误.filter((项) => 签名(项.条.文本) === 桶.签名).map((项) => `${项.项.场景}/${项.项.组合}`))].join(' | ')}`,
          )
          .join('\n')
      : '（0 条）',
    '',
    '## 被既有单源白名单吸收的 error（逐条列出 + 保留理由，不是一律忽略）',
    '',
    白名单.length
      ? 分桶(白名单.map((项) => 项.条))
          .map((桶, i) => `${i + 1}. ×${桶.条数} —— ${桶.样例.文本.slice(0, 260)}\n   - 位置：${桶.样例.位置}`)
          .join('\n') +
        '\n\n白名单真源：`frontend/tests/console-error-collector.ts`（GL 驱动消息 / 429 / 无 socket 服务端 / 后端未起时 /api/logs 与 feature-flags 的 502 穿透），范围均为精确签名。'
      : '（0 条）',
    '',
    '## 控制台 warning 逐条清单（用户硬要求：必须逐条列出）',
    '',
    门禁警告.length
      ? 分桶(门禁警告.map((项) => 项.条))
          .map(
            (桶, i) =>
              `${i + 1}. ×${桶.条数} —— ${桶.样例.文本.slice(0, 260)}\n   - 位置：${桶.样例.位置}\n   - 出现于：${[...new Set(门禁警告.filter((项) => 签名(项.条.文本) === 桶.签名).map((项) => `${项.项.场景}/${项.项.组合}`))].join(' | ')}`,
          )
          .join('\n')
      : '（0 条）',
    '',
    '## pageerror 逐条清单',
    '',
    异常.length ? 异常.map((项) => `- ${项.项.场景}/${项.项.组合}：${项.条.slice(0, 260)}`).join('\n') : '（0 条）',
    '',
    '## 视觉复核清单（逐张看图后回填结论）',
    '',
    ...(视觉复核.length ? 视觉复核.map((项) => `- ${项}`) : ['- (待跑完列出)']),
    '',
    '## 截图全量',
    '',
    ...行集.flatMap((项) => 项.截图.map((路) => `- ${路}（${项.场景} / ${项.组合}）`)),
  ]
  fs.writeFileSync(path.join(证据目录, `FP-11-门禁-${日期}.md`), 行.join('\n'), 'utf8')
}

/* ───────────────────────── 编排：workers=1 串行；场景G 最先（外部 AI 链路最慢） ───────────────────────── */

test.use({ headless: false })
// 本仓 playwright 配置未设 actionTimeout ⇒ 默认 0（永不超时）。本文件必须显式设，
// 否则任一动作卡住就是整轮挂死（实测 场景G 卡 27 分钟无输出）。
test.use({ actionTimeout: 90000, navigationTimeout: 120000 })

/** 进度打印：Playwright 会把用例内 stdout 攒到用例结束才吐，所以同时落文件才能区分「慢」与「挂死」 */
const 运行日志 = path.join(证据目录, `FP-11-门禁-运行日志-${日期}.txt`)
function 志(步: string) {
  const 线 = `[${new Date().toISOString()}] ${步}`
  try {
    fs.mkdirSync(证据目录, { recursive: true })
    fs.appendFileSync(运行日志, 线 + '\n', 'utf8')
  } catch {
    /* 日志写不进不影响取证 */
  }
  console.log(线)
}

let 身份缓存: JiaJuShenFen | null = null
let 请求缓存: APIRequestContext | null = null
let 聊天角色ID = ''

test.beforeAll(async () => {
  fs.mkdirSync(截图目录, { recursive: true })
  const 引导 = await daKaiJiaJuQingQiu()
  身份缓存 = await baoZhengCeShiZhangHao(引导)
  await 引导.dispose()
  请求缓存 = await daKaiJiaJuQingQiu()
  聊天角色ID = (await 新角色(请求缓存, 令牌头(身份缓存))).角色ID
  写证据('起点')
})

test.afterAll(async () => {
  if (请求缓存) await 请求缓存.dispose()
  写证据('收尾')
})

test('场景G 缺陷8 真机插话取证', async ({ browser }) => {
  test.setTimeout(1500000)
  const 组: 组合 = { 主题: '暗色', 视口: 视口清单[0] }
  const 结果 = await 采插话(browser, 组, 身份缓存!, 请求缓存!)
  expect(结果.成立, `缺陷8 真机插话窗口 3 次均未捕捉到：${JSON.stringify(结果.尝试记录)}`).toBe(true)
})

test('场景F 结算弹窗趣味文案 + 快照 10 次读回（缺陷4）', async ({ browser }) => {
  test.setTimeout(1500000)
  let 恒定: { 角色ID: string; 正文: string; 组: 组合 } | null = null
  let 序 = 0
  for (const 组 of 组合清单) {
    const 档 = 序 % 2 === 0 ? ('通关' as const) : ('失败' as const)
    序++
    const 结 = await 采结算(browser, 组, 身份缓存!, 请求缓存!, 档)
    if (!恒定) 恒定 = { 角色ID: 结.角色ID, 正文: 结.正文, 组 }
  }
  expect(恒定, '快照恒定取证前提：没有跑成任何一局结算').toBeTruthy()
  await 快照恒定(browser, 恒定!.组, 身份缓存!, 请求缓存!, 恒定!.角色ID, 恒定!.正文)
})

test('场景A+B 认证页焦点白线与居中滚动条 + 草地背景直采（缺陷1/2 + A1）', async ({ browser }) => {
  test.setTimeout(1500000)
  let 序 = 0
  for (const 组 of 组合清单) {
    await 采认证与草地(browser, 组, 序 === 0)
    序++
  }
})

test('场景C 资料设置向导性别配色（缺陷3）', async ({ browser }) => {
  test.setTimeout(1200000)
  for (const 组 of 组合清单) await 采向导(browser, 组, 身份缓存!)
})

test('场景D 聊天页几何/折叠滚动条/表情面板/无权限秘籍（缺陷5/6/10/11）', async ({ browser }) => {
  test.setTimeout(1500000)
  for (const 组 of 组合清单) await 采聊天静态(browser, 组, 身份缓存!, 聊天角色ID)
})

test('场景E 过往战绩底板与真拖拽（缺陷7）', async ({ browser }) => {
  test.setTimeout(1200000)
  let 序 = 0
  for (const 组 of 组合清单) {
    await 采战绩(browser, 组, 身份缓存!, 序 === 0)
    序++
  }
})

test('收尾 门禁：4 组合覆盖齐全 + 截图落盘 + error=0 + pageerror=0', async () => {
  const 必须 = [
    'A 草地背景(A1)',
    'B 认证页-登录(缺陷1/2)',
    'B 认证页-注册(缺陷2)',
    'C 向导性别配色(缺陷3)',
    'D 聊天页(缺陷5/6/10/11)',
    'E 过往战绩(缺陷7)',
    'F 结算弹窗(缺陷4)',
  ]
  const 键 = new Set(行集.map((项) => `${项.场景}|${项.组合}`))
  for (const 名 of 必须) for (const 组 of 组合清单) expect(键.has(`${名}|${组合名(组)}`), `覆盖矩阵缺口：${名} × ${组合名(组)}`).toBe(true)
  const 截图 = [...new Set(行集.flatMap((项) => 项.截图))]
  expect(截图.length, '截图产出不足').toBeGreaterThanOrEqual(必须.length * 4)
  for (const 路 of 截图) expect(fs.existsSync(path.resolve(截图目录, path.basename(路))), `截图缺失：${路}`).toBe(true)
  const 异常 = 行集.flatMap((项) => 项.页面异常.map((条) => `${项.场景}/${项.组合}: ${条.slice(0, 200)}`))
  expect(异常.slice(0, 12), 'pageerror 必须为 0').toHaveLength(0)
  const 错误 = 行集.flatMap((项) => 项.门禁错误.map((条) => `${项.场景}/${项.组合}: ${条.文本.slice(0, 200)} @ ${条.位置}`))
  expect(错误.slice(0, 12), 'error 必须为 0').toHaveLength(0)
  expect(
    行集.filter((项) => 项.场景.startsWith('G ') && 项.数值.真插话窗口 === '成立').length,
    '缺陷8 真机插话取证必须至少一次成立',
  ).toBeGreaterThanOrEqual(1)
})
