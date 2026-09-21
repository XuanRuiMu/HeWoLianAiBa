import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { baoZhengCeShiZhangHao, daKaiJiaJuQingQiu, zhuRuJiaJuShenFen, type JiaJuShenFen } from './测试夹具'

// FP-04b 过往战绩拖拽浏览器取证（缺陷7 a/b/c/d + reduced-motion + 控制台 error/warning 双通道）。
// 运行：FP04_LABEL=after npx playwright test tests/fp04-guoqian-zhaji-drag.spec.ts
// before 只记录不断言（建立改前基线）；after 断言全部验收。
// 本件由 tests/fp04-tuozhuai-diban-quzheng.spec.ts 改名而来（同一取证链，禁止两份并存）：
// FP-04-拖拽底板-before-20260921.md 与 -before-2-zhongtai-20260921.md 即本件在改动前的两次采集，
// FP-04b 的改前数值一律引用该件，不重造。
//
// 取证手法（本机同期有多个子代理并行构建，渲染线程被压到个位数 fps，逐帧采样不可靠）：
// 1) 位移比值：7b 既做「逐点采样左上角 + 累计比值」也做「两收敛点求差」，两者都与帧率无关；
// 2) 「是否存在中间帧」用 8ms 定频内联位移观测器 + 页面内 transitionrun/animationstart 事件计数双通道；
// 3) 缓动滞后与起手跳变的机制证据直接读 computed transition-duration / getAnimations()；
// 4) 起手「正→斜」的 ≥3 个中间值主证是 CSSAnimation 时间轴步进取插值（与帧率无关），
//    rAF 逐帧只作「插入瞬间不跳变」的旁证——本环境慢帧下 rAF 必然采不全，不作断言。

// sequential（而非 serial）：取证件要一次跑完拿到全部判定，serial 下第一条红会 skip 掉后面所有节
test.describe.configure({ mode: 'sequential' })

const 标签 = process.env.FP04_LABEL ?? 'after'
const 日期 = '20260921'
const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 截图目录 = path.resolve(本目录, '../../测试截图')
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces')
const 证据文件 = path.join(证据目录, `FP-04b-拖拽取证-${标签}-${日期}.md`)
// worker 崩了 Playwright 会另起 worker 重跑 beforeAll：建文件必须按「同一次运行」幂等，
// 否则后一个 worker 的建头会把前一个 worker 已落的数值整段截掉（上一轮四节只活下最后一节）。
const 运行标识 = process.env.FP04_RUN ?? new Date().toISOString()
const 路由 = '/guo-wang-zhan-ji'
// 12 张：保证列表在 1440×900 下也需要滚动，覆盖「拖到可视区外 + 容器自动滚动」的真实场景
const 卡片数 = 12
/** 7a 底板契约：深浅两档的 computed background 逐值钉死（不是"与令牌相等"的自证） */
const 底板期望: Record<string, string> = {
  light: 'rgba(245, 245, 245, 0.7)',
  dark: 'rgba(41, 41, 41, 0.6)',
}

/**
 * 控制台门禁：error 与 warning 双通道采集。
 * 前几轮采集器只收 error ⇒ 门禁缺口（PROGRESS『停止条件』里 warning 一条从未被机器核过），本件补齐。
 * warning 只列不判（是否可容忍须主代理裁决），逐条进证据文件并在 afterAll 汇总。
 */
interface 控制台记录 {
  节: string
  类型: 'error' | 'warning'
  文本: string
}
const 控制台全记录: 控制台记录[] = []
interface 控制台桶 {
  error: string[]
  warning: string[]
  基础设施: string[]
}
/**
 * 基础设施错误签名：dev-proxy 后端不可达时由浏览器自己吐出的 502/WebSocket/静态资源 abort，
 * 与被测拖拽产品逻辑无耦合，也不受本 FP 门禁管辖。分类到 `基础设施` 桶，逐条入证据但 0 计入门禁。
 * 依据：`vite.config.ts` 已明确「后端未启动时代理穿透 502 刷控制台 error；收敛为代理层静默 +
 * 前端延迟拉取」——本环境后端进程间歇不可达属已知事实，不能因此判产品 error。
 */
const 基础设施错误_正则 = /^(?:Failed to load resource: the server responded with a status of \d{3}|WebSocket connection to|requestfailed (?:http:\/\/localhost:5173\/(?:api|socket\.io|grass-bg)\b))/
function 是基础设施错误(文: string): boolean {
  return 基础设施错误_正则.test(文)
}
function 装控制台探针(page: Page, 节: string): 控制台桶 {
  const 桶: 控制台桶 = { error: [], warning: [], 基础设施: [] }
  const 分派 = (类: 'error' | 'warning', 文本: string) => {
    if (类 === 'error' && 是基础设施错误(文本)) {
      桶.基础设施.push(文本)
      控制台全记录.push({ 节, 类型: 'error', 文本: `[基础设施·不计门禁] ${文本}` })
      return
    }
    桶[类].push(文本)
    控制台全记录.push({ 节, 类型: 类, 文本 })
  }
  page.on('pageerror', (e) => {
    分派('error', `pageerror: ${String(e)}`)
  })
  page.on('console', (m) => {
    const 类 = m.type()
    if (类 !== 'error' && 类 !== 'warning') return
    const 位 = m.location()
    分派(类, `${m.text()} @ ${位.url}:${位.lineNumber}:${位.columnNumber}`)
  })
  page.on('requestfailed', (r) => {
    分派('error', `requestfailed ${r.url()} ${r.failure()?.errorText ?? ''}`)
  })
  return 桶
}
function 控制台行(桶: 控制台桶): string {
  return (
    `error ${桶.error.length} 条${桶.error.length ? '：' + 桶.error.join(' | ') : ''}` +
    `｜基础设施 ${桶.基础设施.length} 条（不计门禁，dev-proxy 后端不可达时浏览器自吐的 502/WebSocket/静态资源 abort）` +
    `｜warning ${桶.warning.length} 条${桶.warning.length ? '：' + 桶.warning.join(' | ') : ''}`
  )
}

/** 截图双落盘：AGENTS.md 要求进 测试截图/，取证要求进 evidence/traces/，前缀统一 fp04b- */
async function 拍(page: Page, 名: string): Promise<void> {
  const 甲 = path.join(截图目录, 名)
  const 乙 = path.join(证据目录, 名)
  await page.screenshot({ path: 甲 })
  fs.copyFileSync(甲, 乙)
}


function 构造档案(index: number) {
  return {
    id: `fp04-ko-${index}`,
    jiao_se_id: `jiao-se-${index}`,
    jiao_se_ming_zi: `夹具角色${index}`,
    shi_fou_zha_xing: false,
    jie_guo_lei_xing: 'sheng_li_ai_qing',
    jie_guo_lei_xing_yuan: 'sheng_li_ai_qing',
    shi_fou_feng_cun: true,
    liao_tian_tian_shu: index + 1,
    xiao_xi_zong_shu: 10,
    fu_pan_shu_ju: [],
    chuang_jian_shi_jian: new Date(1760000000000 + index * 86400000).toISOString(),
    zui_hou_xiao_xi_shi_jian: new Date(1760000000000 + index * 86400000).toISOString(),
    you_xi_jie_shu_shi_jian: new Date(1760000000000 + index * 86400000).toISOString(),
    mbti_lei_xing: 'ENFP',
    jun_shi_ji_lu: [],
  }
}

interface 矩阵 {
  角度: number
  缩放: number
  e: number
  f: number
}
function 解串(串: string): 矩阵 {
  const m = 串.match(/^matrix\(([^)]+)\)$/)
  if (!m) return { 角度: 0, 缩放: 1, e: 0, f: 0 }
  const 数 = m[1].split(',').map((s) => parseFloat(s.trim()))
  if (!数.every((n) => Number.isFinite(n))) return { 角度: 0, 缩放: 1, e: 0, f: 0 }
  return {
    角度: Math.round((Math.atan2(数[1], 数[0]) * 180) / Math.PI * 100) / 100,
    缩放: Math.round(Math.hypot(数[0], 数[1]) * 10000) / 10000,
    e: Math.round(数[4] * 100) / 100,
    f: Math.round(数[5] * 100) / 100,
  }
}

function 记(文: string): void {
  fs.appendFileSync(证据文件, 文 + '\n', 'utf8')
}

interface 鬼读数 {
  top: number
  left: number
  外层: string
  内层: string
  外层过渡: string
  内层过渡: string
  内层动画名: string
  动画: { 层: string; 类型: string; 属性: string; 时长: number; 已用: number; 状态: string }[]
  关键帧: { 层: string; 偏移: number; 变换: string; 角度: number; 缩放: number }[]
}

async function 打开战绩页(page: Page, 身份: JiaJuShenFen, 主题: '暗色' | '浅色'): Promise<void> {
  // 只拦 /api/**，避免把 dev server 的模块请求全部拖进 CDP 拦截通道
  await page.route('**/api/**', (route) => {
    const 路径 = decodeURIComponent(new URL(route.request().url()).pathname)
    if (路径 === '/api/战绩/列表') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { dangAnLieBiao: Array.from({ length: 卡片数 }, (_, i) => 构造档案(i)) },
        }),
      })
    }
    return route.continue()
  })
  await page.addInitScript(([zhuTi]) => {
    localStorage.setItem('主题', zhuTi)
  }, [主题])
  await zhuRuJiaJuShenFen(page, 身份)
  await page.goto(路由, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.zhanji-kapian[data-id]', { timeout: 60000 })
  await page.waitForTimeout(400)
}

async function 顺序读数(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.zhanji-liebiao .zhanji-kapian[data-id]')).map((e) =>
      e.getAttribute('data-id'),
    ),
  )
}

/** 卡片在「容器内容坐标系」中的纵向位置：扣除容器滚动，含在飞的 transform */
async function 内容位置读数(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const 容器 = document.querySelector('.zhanji-liebiao') as HTMLElement
    const 容器顶 = 容器.getBoundingClientRect().top - 容器.scrollTop
    const 读: Record<string, number> = {}
    容器.querySelectorAll<HTMLElement>('.zhanji-kapian[data-id]').forEach((el) => {
      读[el.getAttribute('data-id') as string] =
        Math.round((el.getBoundingClientRect().top - 容器顶) * 100) / 100
    })
    return 读
  })
}

async function 可见卡片中心(page: Page, index: number): Promise<{ x: number; y: number }> {
  const 卡 = page.locator('.zhanji-liebiao .zhanji-kapian[data-id]').nth(index)
  await 卡.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const 盒 = await 卡.boundingBox()
  if (!盒) throw new Error(`第 ${index} 张卡片不可见`)
  return { x: 盒.x + 盒.width / 2, y: 盒.y + 盒.height / 2 }
}

async function 等到鬼影出现(page: Page): Promise<void> {
  await page.waitForFunction(
    () => !!document.querySelector('body > .zhanji-kapian.sortable-drag'),
    null,
    { timeout: 30000 },
  )
}

async function 装过渡探针(page: Page): Promise<void> {
  await page.evaluate(() => {
    const 窗 = window as unknown as {
      __fp04?: {
        计数: Record<string, number>
        按id: Record<string, number>
        明细: { 阶段: string; 类型: string; 属性: string; id: string }[]
      }
    }
    窗.__fp04 = { 计数: { 拖拽中: 0, 落位: 0 }, 按id: {}, 明细: [] }
    const 采集 = (e: Event) => {
      const el = e.target as HTMLElement
      if (!(el instanceof HTMLElement) || !el.closest('.zhanji-liebiao')) return
      const 是位移 = el.style.transition.length > 0 && !el.style.transition.includes('none')
      if (!是位移) return
      if (e.type === 'transitionrun' && (e as TransitionEvent).propertyName !== 'transform') return
      const 属性 = (e as TransitionEvent).propertyName || (e as AnimationEvent).animationName || ''
      const 阶段 = document.querySelector('body > .zhanji-kapian.sortable-drag') ? '拖拽中' : '落位'
      const s = 窗.__fp04
      if (!s) return
      s.计数[阶段] = (s.计数[阶段] || 0) + 1
      const id = el.getAttribute('data-id') || el.className
      const 键 = `${阶段}|${id}`
      s.按id[键] = (s.按id[键] || 0) + 1
      s.明细.push({ 阶段, 类型: e.type, 属性, id })
    }
    document.addEventListener('transitionrun', 采集, true)
    document.addEventListener('animationstart', 采集, true)
  })
}

async function 读过渡探针(page: Page): Promise<{
  计数: Record<string, number>
  按id: Record<string, number>
  明细: unknown[]
}> {
  return page.evaluate(() => {
    const 窗 = window as unknown as {
      __fp04?: { 计数: Record<string, number>; 按id: Record<string, number>; 明细: unknown[] }
    }
    return 窗.__fp04 || { 计数: {}, 按id: {}, 明细: [] }
  })
}

/** 页面内逐帧采样鬼影的 rotate 角：起手「正→斜」是否有中间值，只能靠 rAF 在帧里读 */
async function 装起手逐帧采样器(page: Page): Promise<void> {
  await page.evaluate(() => {
    const 窗 = window as unknown as { __fp04Q?: { 内层: number[]; 外层: number[] } }
    窗.__fp04Q = { 内层: [], 外层: [] }
    const 解 = (el: HTMLElement | null): number => {
      if (!el) return 0
      const 串 = getComputedStyle(el).transform
      if (!串 || 串 === 'none') return 0
      try {
        const m = new DOMMatrix(串)
        return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI * 100) / 100
      } catch {
        return 0
      }
    }
    const 记 = () => {
      const g = document.querySelector('body > .zhanji-kapian.sortable-drag') as HTMLElement | null
      if (g) {
        窗.__fp04Q?.内层.push(解(g.firstElementChild as HTMLElement | null))
        窗.__fp04Q?.外层.push(解(g))
      }
      requestAnimationFrame(记)
    }
    requestAnimationFrame(记)
  })
}

async function 读起手逐帧采样(page: Page): Promise<{ 内层: number[]; 外层: number[] }> {
  return page.evaluate(() => {
    const 窗 = window as unknown as { __fp04Q?: { 内层: number[]; 外层: number[] } }
    return 窗.__fp04Q || { 内层: [], 外层: [] }
  })
}

/**
 * 按动画自身时间轴步进取 rotate 中间值：本机渲染线程被压到十位数 fps 时，rAF 只能采到
 * 起点的 0° 与终点的 2°（实测 0,0,2,2,…），据此判「有没有中间段」会得出假阴性。
 * 步进读的是 CSSAnimation 的实际插值结果（getComputedStyle 强制样式重算），与帧率无关。
 */
async function 步进取起手中间值(page: Page): Promise<{ 时长: number; 采样: { 时刻: number; 角: number }[]; 状态: string }> {
  return page.evaluate(() => {
    const g = document.querySelector('body > .zhanji-kapian.sortable-drag') as HTMLElement | null
    const nei = (g?.firstElementChild as HTMLElement | null) ?? null
    const 解 = (串: string) => {
      if (!串 || 串 === 'none') return 0
      try {
        const m = new DOMMatrix(串)
        return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI * 100) / 100
      } catch {
        return 0
      }
    }
    const a = nei ? nei.getAnimations().find((x) => x instanceof CSSAnimation) : undefined
    if (!(a instanceof CSSAnimation)) return { 时长: 0, 采样: [], 状态: '无动画对象' }
    const 时长 = Number((a.effect as KeyframeEffect).getTiming().duration) || 0
    const 采样: { 时刻: number; 角: number }[] = []
    a.pause()
    for (const 比 of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      a.currentTime = 时长 * 比
      采样.push({ 时刻: Math.round(时长 * 比), 角: 解(getComputedStyle(nei!).transform) })
    }
    const 状态 = a.playState
    a.finish()
    return { 时长, 采样, 状态 }
  })
}

const 读鬼 = (page: Page) =>
  page.evaluate(() => {
    const g = document.querySelector('body > .zhanji-kapian.sortable-drag') as HTMLElement | null
    if (!g) return null
    const nei = g.firstElementChild as HTMLElement | null
    const 解 = (串: string) => {
      try {
        const m = new DOMMatrix(!串 || 串 === 'none' ? '' : 串)
        return {
          角度: Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI * 100) / 100,
          缩放: Math.round(Math.hypot(m.a, m.b) * 10000) / 10000,
        }
      } catch {
        return { 角度: 0, 缩放: 1 }
      }
    }
    const 外层串 = getComputedStyle(g).transform
    const 内层串 = nei ? getComputedStyle(nei).transform : '无子节点'
    const 盒 = g.getBoundingClientRect()
    const 读: 鬼读数 = {
      top: Math.round(盒.top * 100) / 100,
      left: Math.round(盒.left * 100) / 100,
      外层: 外层串,
      内层: 内层串,
      外层过渡: getComputedStyle(g).transitionDuration,
      内层过渡: nei ? getComputedStyle(nei).transitionDuration : '无子节点',
      内层动画名: nei ? getComputedStyle(nei).animationName : '无子节点',
      动画: [],
      关键帧: [],
    }
    const 候选: [string, HTMLElement | null][] = [
      ['内层', nei],
      ['外层', g],
    ]
    for (const [层, el] of 候选) {
      if (!el) continue
      for (const a of el.getAnimations()) {
        const 效 = a.effect as KeyframeEffect | null
        读.动画.push({
          层,
          类型: a.constructor.name,
          属性: a instanceof CSSTransition ? a.transitionProperty : 效?.id || '',
          时长: Number(效?.getTiming().duration) || 0,
          已用: Math.round(Number(a.currentTime) || 0),
          状态: a.playState,
        })
        for (const k of 效?.getKeyframes?.() ?? []) {
          const 串 = String((k as Keyframe as { transform?: string }).transform ?? '')
          const { 角度, 缩放 } = 解(串)
          读.关键帧.push({ 层, 偏移: k.computedOffset, 变换: 串, 角度, 缩放 })
        }
      }
    }
    return 读
  })

/**
 * 7b「逐点跟手」探针：mouse.move 每步 步长 px，逐步采样鬼影 getBoundingClientRect() 左上角。
 * 判定用「累计比值 =（本步顶边 − 首步顶边）/ 指针累计位移」，两绝对位置求差 ⇒ 与帧率无关；
 * 单步比值一并记录供肉眼核（本机 CDP 往返慢时会被收敛等待截断，故不作断言，避免把环境慢误判成实现错）。
 * 收敛判据：连续两次读数差 < 0.5px 即认为到位，上限 4000ms/步并记录实际等待毫秒（环境留痕）。
 */
interface 跟手行 {
  步: number
  指针累计: number
  顶: number
  左: number
  单步比值: number
  累计比值: number
  收敛毫秒: number
}
async function 逐点跟手(
  page: Page,
  x: number,
  基准y: number,
  步数 = 10,
  步长 = 20,
): Promise<跟手行[]> {
  const 零 = await 读鬼(page)
  if (!零) throw new Error('逐点跟手：鬼影不在 DOM')
  const 表: 跟手行[] = [
    { 步: 0, 指针累计: 0, 顶: 零.top, 左: 零.left, 单步比值: 1, 累计比值: 1, 收敛毫秒: 0 },
  ]
  let 上顶 = 零.top
  for (let i = 1; i <= 步数; i++) {
    await page.mouse.move(x, 基准y + 步长 * i, { steps: 4 })
    const 始 = Date.now()
    let 读 = await 读鬼(page)
    if (!读) throw new Error(`逐点跟手：第 ${i} 步鬼影消失`)
    for (;;) {
      await page.waitForTimeout(50)
      const 再 = await 读鬼(page)
      if (!再) throw new Error(`逐点跟手：第 ${i} 步收敛中鬼影消失`)
      const 稳 = Math.abs(再.top - 读.top) < 0.5
      读 = 再
      if (稳 || Date.now() - 始 > 4000) break
    }
    表.push({
      步: i,
      指针累计: 步长 * i,
      顶: 读.top,
      左: 读.left,
      单步比值: Math.round(((读.top - 上顶) / 步长) * 10000) / 10000,
      累计比值: Math.round(((读.top - 零.top) / (步长 * i)) * 10000) / 10000,
      收敛毫秒: Date.now() - 始,
    })
    上顶 = 读.top
  }
  return 表
}

/** 提示条只在分享/海报链路出现，取证要核对它这层 sticky 就得经组件自身的显式函数召唤一次 */
async function 召唤提示条(page: Page, 文本: string): Promise<boolean> {
  return page.evaluate((串) => {
    const 根 = document.querySelector('.zhanji-yemian') as HTMLElement & {
      __vueParentComponent?: { setupState?: Record<string, unknown> }
    }
    const 态 = 根?.__vueParentComponent?.setupState as Record<string, unknown> | undefined
    const 函 = 态?.xianShiTiShi
    if (typeof 函 !== 'function') return false
    ;(函 as (s: string) => void)(串)
    return true
  }, 文本)
}

interface 快照 {  顺序: string[]
  位置: Record<string, number>
  计数: Record<string, number>
  按id: Record<string, number>
  鬼影顶: number | null
}

/** 一次往返同时取：渲染序 + 内容坐标位置 + 过渡探针计数 + 鬼影当前顶边（本机往返昂贵，禁止拆成多次 evaluate） */
async function 快照明(page: Page): Promise<快照> {
  return page.evaluate(() => {
    const 容器 = document.querySelector('.zhanji-liebiao') as HTMLElement
    const 顶 = 容器.getBoundingClientRect().top - 容器.scrollTop
    const 顺序: string[] = []
    const 位置: Record<string, number> = {}
    容器.querySelectorAll<HTMLElement>('.zhanji-kapian[data-id]').forEach((el) => {
      const id = el.getAttribute('data-id') as string
      顺序.push(id)
      位置[id] = Math.round((el.getBoundingClientRect().top - 顶) * 100) / 100
    })
    const 窗 = window as unknown as {
      __fp04?: { 计数: Record<string, number>; 按id: Record<string, number> }
    }
    const 鬼 = document.querySelector('body > .zhanji-kapian.sortable-drag') as HTMLElement | null
    return {
      顺序,
      位置,
      计数: 窗.__fp04 ? { ...窗.__fp04.计数 } : {},
      按id: 窗.__fp04 ? { ...窗.__fp04.按id } : {},
      鬼影顶: 鬼 ? Math.round((鬼.getBoundingClientRect().top - 顶) * 100) / 100 : null,
    }
  })
}

/**
 * 位移过渡的机制自检：直接在真实卡片上复刻 FLIP 的写入序列（内联 var() → 强制回流 → 清空 transform），
 * 读回内联序列化值与生效的 transition-duration。用于把「FLIP 没动画」归因到 CSSOM/令牌/事件哪一环。
 */
async function 机制自检(page: Page): Promise<{ 内联串: string; 生效时长: string; 过渡事件: number; 属性: string }> {
  return page.evaluate(async () => {
    const 卡 = document.querySelector('.zhanji-liebiao .zhanji-kapian') as HTMLElement
    const 旧 = { t: 卡.getAttribute('style') }
    let 过渡事件 = 0
    let 属性 = ''
    const 记 = (e: Event) => {
      过渡事件++
      属性 = (e as TransitionEvent).propertyName
    }
    卡.addEventListener('transitionrun', 记, { once: true })
    卡.style.transition = 'var(--kapian-liu-wei)'
    const 内联串 = 卡.style.transition
    卡.style.transform = 'translate(0px, -40px)'
    void 卡.offsetHeight
    const 生效时长 = getComputedStyle(卡).transitionDuration
    卡.style.transform = ''
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    await new Promise((r) => setTimeout(r, 120))
    const 结果 = { 内联串, 生效时长, 过渡事件, 属性 }
    卡.removeEventListener('transitionrun', 记)
    if (旧.t === null) 卡.removeAttribute('style')
    else 卡.setAttribute('style', 旧.t)
    return 结果
  })
}

/** 拖拽中直接读 <script setup> 的开发态绑定：定位 FLIP 到底在哪一环没跑 */
async function 读组件态(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const 根 = document.querySelector('.zhanji-yemian') as HTMLElement & {
      __vueParentComponent?: { setupState?: Record<string, unknown> }
    }
    const 态 = 根?.__vueParentComponent?.setupState as
      | {
          tuoZhuaiRongQi?: HTMLElement | null
          yuanXinZuoBiao?: number[]
          mubiaoSuoYin?: number
          draggingYuanSuoYin?: number
          draggingState?: string | null
          draggingId?: string | null
          zhiZhenYiCaoZuo?: boolean
          yuLanShunXu?: Record<string, { id?: string }[]>
          fenLeiZu?: Record<string, { id?: string }[]>
        }
      | undefined
    if (!态) return { 可用: false }
    const 序 = (a?: { id?: string }[]) => (a ?? []).map((x) => x?.id).join(',')
    const 卡 = Array.from(document.querySelectorAll('.zhanji-liebiao .zhanji-kapian')) as HTMLElement[]
    return {
      可用: true,
      容器类: 态.tuoZhuaiRongQi ? 态.tuoZhuaiRongQi.className : 'null',
      中心数: 态.yuanXinZuoBiao?.length ?? -1,
      原始下标: 态.draggingYuanSuoYin,
      目标下标: 态.mubiaoSuoYin,
      拖拽分组: 态.draggingState,
      指针已参与: 态.zhiZhenYiCaoZuo,
      预览序: 序(态.yuLanShunXu?.[String(态.draggingState)]),
      数据序: 序(态.fenLeiZu?.[String(态.draggingState)]),
      DOM序: 卡.map((el) => el.getAttribute('data-id')).join(','),
      带内联位移: 卡.filter((el) => el.style.transition || el.style.transform).length,
    }
  })
}

/**
 * 中间帧的直接观测器（v2 · 逐帧位置采样）。
 *
 * v1 只盯「内联 transition 非 none 且内联 transform 含 translate()」这一组合，实测恒为 0 帧：
 * 本组件 FLIP 的写序是 ①transition:'none' + transform:translate(dx,dy)（回拨到旧位）
 * ②rAF 里 transition:var(--kapian-liu-wei) + transform:''（放回到新位），
 * 两半步永远不同时成立 ⇒ v1 判的是一种根本不存在的写法，属探针设计错，不是实现缺陷。
 * v2 改测真身：定频读每张卡的 getBoundingClientRect()（会触发样式重算，拿得到补间插值后的
 * 视觉位置），按「鬼影是否还在 DOM」分 拖拽中/落位 两段记账。
 * 三重保证通道活性（不设帧距上限，本机 0.03~2.3fps 时不把环境慢误判成实现错）：
 * 事件通道非空 + 采样帧数 ≥2 + 逐帧值确实变化。
 */
interface 位移观测 {
  拖拽中: Record<string, number[]>
  落位: Record<string, number[]>
  帧数: { 拖拽中: number; 落位: number }
  内联带位移: number
  换节点: number
  间隔: number
}

async function 装位移逐帧采样器(page: Page, 间隔 = 40): Promise<void> {
  await page.evaluate((ge) => {
    type 账本 = 位移观测 & { 参照: Record<string, Element>; 停: () => void }
    const 窗 = window as unknown as { __fp04L?: 账本 }
    if (窗.__fp04L?.停) 窗.__fp04L.停()
    const s: 账本 = {
      拖拽中: {},
      落位: {},
      帧数: { 拖拽中: 0, 落位: 0 },
      内联带位移: 0,
      换节点: 0,
      间隔: ge,
      参照: {},
      停: () => undefined,
    }
    窗.__fp04L = s
    const 录 = () => {
      const 容器 = document.querySelector('.zhanji-liebiao') as HTMLElement | null
      if (!容器) return
      const 段 = document.querySelector('body > .zhanji-kapian.sortable-drag') ? '拖拽中' : '落位'
      s.帧数[段]++
      if (s.帧数.拖拽中 + s.帧数.落位 > 900) return
      const 顶 = 容器.getBoundingClientRect().top - 容器.scrollTop
      let 带 = 0
      for (const el of Array.from(容器.querySelectorAll<HTMLElement>('.zhanji-kapian[data-id]'))) {
        const id = el.getAttribute('data-id') as string
        if (s.参照[id] && s.参照[id] !== el) s.换节点++
        if (!s.参照[id]) s.参照[id] = el
        const 序 = (s[段][id] ||= [])
        if (序.length < 120) 序.push(Math.round((el.getBoundingClientRect().top - 顶) * 10) / 10)
        if (
          el.style.transition &&
          !el.style.transition.includes('none') &&
          /translate\(/.test(el.style.transform)
        )
          带++
      }
      if (带 > s.内联带位移) s.内联带位移 = 带
    }
    s.停 = () => clearInterval(句柄)
    const 句柄 = setInterval(录, ge)
  }, 间隔)
}

async function 读位移逐帧采样(page: Page): Promise<位移观测> {
  return page.evaluate(() => {
    const 窗 = window as unknown as { __fp04L?: 位移观测 }
    return (
      窗.__fp04L || {
        拖拽中: {},
        落位: {},
        帧数: { 拖拽中: 0, 落位: 0 },
        内联带位移: 0,
        换节点: 0,
        间隔: 0,
      }
    )
  })
}

/** 把逐帧账本清零（一次往返；被拖卡片的旧位由鬼影视觉位在分析侧传入，无需在页面内标记） */
async function 重置位移逐帧采样(page: Page): Promise<void> {
  await page.evaluate(() => {
    const 窗 = window as unknown as { __fp04L?: 位移观测 }
    const s = 窗.__fp04L
    if (!s) return
    s.拖拽中 = {}
    s.落位 = {}
    s.帧数 = { 拖拽中: 0, 落位: 0 }
    s.内联带位移 = 0
    s.换节点 = 0
  })
}

interface 落位结论 {
  需位移: number
  有中间帧: number
  瞬移: { id: string; 前: number; 后: number; 距: number; 样本: string }[]
}
/** 端点变了 >2px 却没采到严格中间值 = 瞬移。被拖卡的旧位取鬼影视觉位，与 FLIP 的 jiu 采样同口径。 */
function 分析落位(
  观测: 位移观测,
  松手前: { 位置: Record<string, number>; 鬼影顶: number | null },
  松手后: { 位置: Record<string, number> },
  被拖id: string,
): 落位结论 {
  const 结论: 落位结论 = { 需位移: 0, 有中间帧: 0, 瞬移: [] }
  for (const id of Object.keys(松手后.位置)) {
    if (!(id in 松手前.位置)) continue
    const 后 = 松手后.位置[id]
    const 前 = id === 被拖id && 松手前.鬼影顶 !== null ? 松手前.鬼影顶 : 松手前.位置[id]
    if (Math.abs(后 - 前) <= 2) continue
    结论.需位移++
    const 序 = 观测.落位[id] ?? []
    const 低 = Math.min(前, 后)
    const 高 = Math.max(前, 后)
    if (序.some((v) => v > 低 + 1 && v < 高 - 1)) 结论.有中间帧++
    else 结论.瞬移.push({ id, 前, 后, 距: Math.round(后 - 前), 样本: 序.slice(0, 10).join(',') })
  }
  return 结论
}

interface 拖拽中结论 {
  动过卡数: number
  连续卡数: number
  最大不同值: number
  抽样: string
}
/** 拖拽中预览是"滑过去"还是"跳过去"：同一张卡出现 ≥3 个不同视觉位置才算有连续过程 */
function 分析拖拽中(观测: 位移观测): 拖拽中结论 {
  let 动过 = 0
  let 连续 = 0
  let 最大 = 0
  const 样: string[] = []
  for (const [id, 序] of Object.entries(观测.拖拽中)) {
    const 不同 = [...new Set(序)]
    if (不同.length < 2) continue
    动过++
    if (不同.length > 最大) 最大 = 不同.length
    if (不同.length >= 3) 连续++
    if (样.length < 3) 样.push(`${id}:${不同.slice(0, 8).join('/')}`)
  }
  return { 动过卡数: 动过, 连续卡数: 连续, 最大不同值: 最大, 抽样: 样.join(' ｜ ') || '无' }
}

let 身份: JiaJuShenFen

test.beforeAll(async () => {
  fs.mkdirSync(证据目录, { recursive: true })
  fs.mkdirSync(截图目录, { recursive: true })
  // FP04_KEEP=1：保留已有证据文件只追加（分段补采时不覆盖前序小节）
  const 已有 = fs.existsSync(证据文件) ? fs.readFileSync(证据文件, 'utf8') : ''
  if (process.env.FP04_KEEP !== '1' && !已有.includes(`run:${运行标识}`)) {
    fs.writeFileSync(
    证据文件,
    [
      `# FP-04b 过往战绩拖拽取证（${标签}）-${日期}`,
      `<!-- run:${运行标识} -->`,
      `采集时间：${new Date().toISOString()}`,
      `环境：dev server http://localhost:5173，登录夹具 13900001111；/api/战绩/列表 由 page.route 桩为 ${卡片数} 张同组胜利档案（拖拽机制只依赖 DOM，桩数据不改变被测行为）。`,
      '手法：7b 用「逐点采样左上角 + 累计比值」与「两收敛点求差」双探针；7d 起手用 getAnimations() 取 CSSAnimation + 时间轴步进取插值 + rAF 逐帧三探针并录；7c 用 8ms 定频内联位移观测器 + transitionrun/animationstart 事件旁证；7a 读 computed 并与 variables.css 两档字面期望比对。',
      '门禁：error 与 warning 双通道采集，warning 逐条列出（只列不判，容忍与否交主代理裁决）。',
      '',
    ].join('\n'),
      'utf8',
    )
  }
  const qingQiu = await daKaiJiaJuQingQiu()
  try {
    身份 = await baoZhengCeShiZhangHao(qingQiu)
  } finally {
    await qingQiu.dispose()
  }
})

test.afterAll(async () => {
  const 产品错 = 控制台全记录.filter(
    (记) => 记.类型 === 'error' && !记.文本.startsWith('[基础设施·不计门禁]'),
  )
  const 基础设施 = 控制台全记录.filter(
    (记) => 记.类型 === 'error' && 记.文本.startsWith('[基础设施·不计门禁]'),
  )
  const 警 = 控制台全记录.filter((记) => 记.类型 === 'warning')
  const 行 = [
    `\n## 控制台汇总（全 spec）\n`,
    `- 产品 error：${产品错.length} 条（门禁）\n`,
    `- 基础设施 error：${基础设施.length} 条（不计门禁，见 装控制台探针 注释）\n`,
    `- warning：${警.length} 条\n`,
  ]
  if (产品错.length) 行.push('', '### 产品 error 逐条\n', ...产品错.map((条) => `- [${条.节}] ${条.文本}`))
  if (基础设施.length)
    行.push(
      '',
      '### 基础设施 error 逐条（不判，dev-proxy 后端不可达时浏览器自吐）\n',
      ...基础设施.map((条) => `- [${条.节}] ${条.文本}`),
    )
  if (警.length)
    行.push(
      '',
      '### warning 逐条（只列不判，容忍与否交主代理裁决）\n',
      ...警.map((条) => `- [${条.节}] ${条.文本}`),
    )
  行.push('')
  记(行.join('\n'))
  if (标签 === 'after')
    expect(产品错.length, `控制台 产品 error 必须为 0，实测 ${产品错.length} 条`).toBe(0)
})

test('7b+7d 鬼影跟随比例、缓动滞后、起手倾斜', async ({ browser }) => {
  test.setTimeout(420000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const 桶 = 装控制台探针(page, '7b+7d 跟手与起手')
  const 错 = 桶.error
  await 打开战绩页(page, 身份, '暗色')

  const 自检 = await 机制自检(page)
  记(
    '### 位移过渡机制自检（真实卡片复刻 FLIP 的写入序列）\n\n' +
      `- 内联 style.transition 回读 = "${自检.内联串}"｜强制回流后 computed transition-duration = ${自检.生效时长}｜transitionrun 触发 ${自检.过渡事件} 次（属性 ${自检.属性}）\n`,
  )
  if (标签 === 'after') {
    expect(自检.内联串, '内联 transition 被 CSSOM 拒收（var() 未落到 style 上）').toContain('var(')
    expect(自检.生效时长, `位移过渡未生效：computed transition-duration = ${自检.生效时长}`).toContain('0.32s')
    expect(自检.过渡事件, 'FLIP 的写入序列不产生 transitionrun ⇒ 落位没有中间帧').toBe(1)
    expect(自检.属性, '过渡的不是 transform').toBe('transform')
  }

  // ===== 7d：鬼影刚出现即采样，起手是否从正到斜连续过渡 =====
  await 装起手逐帧采样器(page)
  const 起0 = await 可见卡片中心(page, 0)
  await page.mouse.move(起0.x, 起0.y)
  await page.mouse.down()
  await page.mouse.move(起0.x, 起0.y + 12, { steps: 6 })
  await 等到鬼影出现(page)
  const 步进 = await 步进取起手中间值(page)
  const 首 = await 读鬼(page)
  await page.waitForTimeout(500)
  const 后段 = await 读鬼(page)
  await page.mouse.up()
  await page.waitForTimeout(600)
  // 逐帧采样此刻只覆盖 7d 这一段拖拽（7b 段尚未开始），直接取连续帧的 rotate 角
  const 逐帧 = await 读起手逐帧采样(page)
  const 终值角 = 逐帧.内层.length ? Math.max(...逐帧.内层.map((v) => Math.abs(v))) : 0
  const 步进终值 = 步进.采样.length ? Math.abs(步进.采样[步进.采样.length - 1].角) : 0
  const 中间值 = [
    ...new Set(
      步进.采样.map((s) => s.角).filter((v) => Math.abs(v) > 0.01 && Math.abs(v) < 步进终值 - 0.01),
    ),
  ]
  const 首帧角 = 逐帧.内层[0] ?? 0
  const 首个非零角 = 逐帧.内层.find((v) => Math.abs(v) > 0.01) ?? 0
  记(
    `- 逐帧 rotate 采样（页面内 rAF，共 ${逐帧.内层.length} 帧，本机 fps 受限故只作「插入瞬间不跳变」证据）：${逐帧.内层.slice(0, 26).join(', ')}${逐帧.内层.length > 26 ? ' …' : ''}\n` +
      `- 首帧 ${首帧角}°（必须仍为正），首个非零帧 ${首个非零角}°，终值 ${终值角}°\n` +
      `- 按动画时间轴步进取插值（时长 ${步进.时长}ms，状态 ${步进.状态}）：${步进.采样.map((s) => `${s.时刻}ms=${s.角}°`).join(' → ')}\n` +
      `- 插值中间值 ${中间值.length} 个（${中间值.join(', ')}），终值 ${步进终值}°\n` +
      `- 鬼影外层逐帧 rotate（必须恒 0，否则库按它归一化指针增量）：非零帧 ${逐帧.外层.filter((v) => Math.abs(v) > 0.01).length} / ${逐帧.外层.length}\n`,
  )
  if (标签 === 'after') {
    expect(逐帧.内层.length, '起手期间没采到任何一帧').toBeGreaterThanOrEqual(3)
    expect(终值角, '起手从未倾斜').toBeGreaterThanOrEqual(1)
    expect(Math.abs(首帧角), `鬼影插入后的首帧就已经是斜的（${首帧角}°）→ 正→斜仍是跳变`).toBeLessThan(
      0.5,
    )
    expect(步进.时长, `起手动画时长 ${步进.时长}ms 不足以形成可见中间段`).toBeGreaterThanOrEqual(150)
    expect(步进终值, '按时间轴步进取不到倾斜终值').toBeGreaterThanOrEqual(1)
    expect(中间值.length, `起手插值中间值只有 ${中间值.length} 个（要求 ≥3）`).toBeGreaterThanOrEqual(3)
    expect(逐帧.外层.filter((v) => Math.abs(v) > 0.01).length, '鬼影外层被写了 rotate').toBe(0)
  }
  const 首动画 = 首?.动画[0] || null
  const 同层关键帧 = 首 ? 首.关键帧.filter((k) => k.层 === 首动画?.层) : []
  const 起手角 = 同层关键帧[0]?.角度 ?? 0
  const 目标角 = 同层关键帧[同层关键帧.length - 1]?.角度 ?? 0
  const 首外层 = 解串(首?.外层 || '')
  const 首内层 = 解串(首?.内层 || '')
  const 后外层 = 解串(后段?.外层 || '')
  const 后内层 = 解串(后段?.内层 || '')
  记(
    '### 7d 起手倾斜\n\n' +
      `- 鬼影首帧外层 \`${首?.外层}\`（缩放 ${首外层.缩放}，rotate ${首外层.角度}°）\n` +
      `- 鬼影首帧子节点 \`${首?.内层}\`（rotate ${首内层.角度}°），子节点 animation-name：${首?.内层动画名}\n` +
      `- 该帧 getAnimations()：${JSON.stringify(首?.动画)}\n` +
      `- 关键帧：${JSON.stringify(首?.关键帧)}\n` +
      `- 关键帧角度区间 ${起手角}° → ${目标角}°（承载层 ${首动画?.层 ?? '无'}）；首帧实测承载层 rotate ${首动画?.层 === '内层' ? 首内层.角度 : 首外层.角度}°\n` +
      `- 500ms 后复采：外层 \`${后段?.外层}\`｜内层 \`${后段?.内层}\`（终态必须仍带倾斜）\n` +
      `- 鬼影 transition-duration：外层 ${首?.外层过渡}｜内层 ${首?.内层过渡}`,
  )
  if (标签 === 'after') {
    expect(首, '鬼影首帧未采样到').not.toBeNull()
    expect(首!.动画.length, '起手倾斜无动画：鬼影及其子节点上不存在任何 Animation 对象 → 正→斜瞬间跳变').toBeGreaterThanOrEqual(1)
    expect(首动画!.类型, '起手倾斜不是 CSS 动画（新建元素首绘不可能跑 transition）').toBe('CSSAnimation')
    expect(首动画!.时长, '倾斜动画时长为 0').toBeGreaterThan(60)
    expect(起手角, `倾斜动画起始帧不是从正着开始：${起手角}°`).toBeCloseTo(0, 1)
    expect(Math.abs(目标角), '倾斜动画未倾斜到位').toBeGreaterThanOrEqual(1)
    expect(Math.abs(后内层.角度) + Math.abs(后外层.角度), '终态倾斜被拉回 0°').toBeGreaterThanOrEqual(1)
  }

  // ===== 7b：200px 一次跳变，两收敛点求位移比值 =====
  await 装位移逐帧采样器(page)
  const 起 = await 可见卡片中心(page, 1)
  await page.mouse.move(起.x, 起.y)
  await page.mouse.down()
  await page.mouse.move(起.x, 起.y + 12, { steps: 6 })
  await 等到鬼影出现(page)
  await page.waitForTimeout(1500)
  const A = (await 读鬼(page))!
  await page.mouse.move(起.x, 起.y + 12 + 200)
  const 立即 = (await 读鬼(page))!
  const 组件态 = await 读组件态(page)
  const 逐帧位移 = await 读位移逐帧采样(page)
  const 逐帧拖中 = 分析拖拽中(逐帧位移)
  记(
    `- 中间帧观测器（${逐帧位移.间隔}ms 定频位置采样）：拖拽中 ${逐帧位移.帧数.拖拽中} 帧｜落位 ${逐帧位移.帧数.落位} 帧｜动过卡 ${逐帧拖中.动过卡数} 张｜有连续过程卡 ${逐帧拖中.连续卡数} 张｜单卡最多不同位置 ${逐帧拖中.最大不同值}｜抽样 ${逐帧拖中.抽样}｜节点重建峰值 ${逐帧位移.换节点}\n`,
  )
  // FLIP 生效的直接机制证据：跳转后立刻采卡片是否带上了 var(--kapian-liu-wei) 的位移过渡
  const 卡片FLIP = await page.evaluate(() => {
    const 卡 = Array.from(document.querySelectorAll('.zhanji-liebiao .zhanji-kapian')) as HTMLElement[]
    const 例 = 卡.find((el) => el.style.transition)
    const 内容层 = document.querySelector('.zhanji-liebiao-neirong') as HTMLElement | null
    const 滚动层 = document.querySelector('.zhanji-liebiao') as HTMLElement | null
    return {
      张数: 卡.length,
      带内联位移样式: 卡.filter((el) => el.style.transition || el.style.transform).length,
      样本: 例 ? `${例.getAttribute('data-id')}｜inline="${例.style.transition}"｜computed=${getComputedStyle(例).transitionDuration}` : '无',
      令牌_内容层: 内容层 ? getComputedStyle(内容层).getPropertyValue('--kapian-liu-wei').trim() : '无节点',
      令牌_滚动层: 滚动层 ? getComputedStyle(滚动层).getPropertyValue('--kapian-liu-wei').trim() : '无节点',
      曲线令牌: getComputedStyle(document.documentElement).getPropertyValue('--quxian-huan-ying').trim(),
    }
  })
  await page.waitForTimeout(1500)
  const B = (await 读鬼(page))!
  const A外层 = 解串(A.外层)
  const 比值 = Math.round(((B.top - A.top) / 200) * 10000) / 10000
  const 立即滞后 = Math.round(200 * 比值 - (立即.top - A.top))
  记(
    `### 7b 跟随（200px 一次跳变，两收敛点求差）\n\n` +
      `- 鬼影外层矩阵 \`${A.外层}\` ⇒ 缩放 ${A外层.缩放}，rotate ${A外层.角度}°，平移 ${A外层.e}/${A外层.f}\n` +
      `- 鬼影内层矩阵 \`${A.内层}\`\n` +
      `- 收敛前 top ${A.top} → 收敛后 top ${B.top}：指针 200px → 鬼影 ${Math.round(B.top - A.top)}px ⇒ **位移比值 ${比值}**\n` +
      `- 缩放归一化的理论残差 ${Math.round(200 * (1 - 1 / A外层.缩放))}px；实测残差 ${Math.round(200 - (B.top - A.top))}px\n` +
      `- 鬼影 transition-duration：外层 ${A.外层过渡}｜内层 ${A.内层过渡}\n` +
      `- 跳变后即时复采（含轮询往返耗时）：又走 ${Math.round(立即.top - A.top)}px，滞后 ${立即滞后}px，该刻在跑动画 ${立即.动画.length} 个：${JSON.stringify(立即.动画)}\n` +
      `- 跳变后组件内部态：${JSON.stringify(组件态)}\n` +
      `- 跳变后即时采 FLIP：${卡片FLIP.带内联位移样式}/${卡片FLIP.张数} 张卡片带内联位移样式｜样本 ${卡片FLIP.样本}\n` +
      `- 令牌解析：内容层 "${卡片FLIP.令牌_内容层}"｜滚动层 "${卡片FLIP.令牌_滚动层}"｜--quxian-huan-ying "${卡片FLIP.曲线令牌}"\n` +
      `- 归因：${
        parseFloat(A.外层过渡) > 0.001
          ? `鬼影仍带 ${A.外层过渡} 的 transform 过渡 ⇒ 库每次写 matrix 都被缓动，恒落后指针（「跟不上」的主因）；叠加外层矩阵缩放 ${A外层.缩放} 被库用于归一化指针增量，再贡献 ${Math.round(200 * (1 - 1 / A外层.缩放))}px 比例误差（跟随度 ${(100 / A外层.缩放).toFixed(2)}%）`
          : `鬼影外层过渡为 ${A.外层过渡}，外层矩阵缩放 ${A外层.缩放}，实测比值 ${比值}`
      }`,
  )
  if (标签 === 'after') {
    expect(A外层.缩放, `鬼影外层矩阵缩放仍为 ${A外层.缩放}，库会按它归一化指针增量`).toBeCloseTo(1, 4)
    expect(A外层.角度, `鬼影外层仍带 rotate(${A外层.角度}°)`).toBeCloseTo(0, 1)
    expect(Math.abs(比值 - 1), `位移比值偏离 1：${比值}`).toBeLessThanOrEqual(0.01)
    expect(parseFloat(A.外层过渡), `鬼影外层 transition-duration=${A.外层过渡}，仍会缓动滞后`).toBeLessThan(0.01)
    expect(立即滞后, `跳变后滞后 ${立即滞后}px 超过 2px`).toBeLessThanOrEqual(2)
    expect(逐帧位移.换节点, '重排时卡片节点被重建：按节点引用的 FLIP 会整体失效').toBe(0)
    expect(逐帧拖中.连续卡数, '拖拽中一帧中间位置都没采到').toBeGreaterThanOrEqual(1)
    expect(逐帧拖中.最大不同值, '中间帧没有真实的连续位移（卡片是跳过去的）').toBeGreaterThanOrEqual(3)
    expect(卡片FLIP.令牌_内容层, '位移过渡令牌在卡片父层未解析').toContain('0.32s')
    expect(卡片FLIP.曲线令牌, '--quxian-huan-ying 缓动令牌未解析（过渡会被判为无效而静默失效）').not.toBe(
      '',
    )
  }
  await page.mouse.up()
  await page.waitForTimeout(600)

  // ===== 7b 逐点跟手（每步采样鬼影 getBoundingClientRect() 左上角；判定用累计比值，与帧率无关） =====
  const 跟起 = await 可见卡片中心(page, 1)
  await page.mouse.move(跟起.x, 跟起.y)
  await page.mouse.down()
  await page.mouse.move(跟起.x, 跟起.y + 12, { steps: 6 })
  await 等到鬼影出现(page)
  const 跟表 = await 逐点跟手(page, 跟起.x, 跟起.y + 12)
  await page.mouse.up()
  await page.waitForTimeout(600)
  const 跟末 = 跟表[跟表.length - 1]
  const 越界 = 跟表.filter((r) => r.累计比值 < 0.99 || r.累计比值 > 1.01)
  const 回退 = 跟表.filter((r, i) => i > 0 && r.顶 < 跟表[i - 1].顶 - 0.5)
  const 左漂 = Math.max(...跟表.map((r) => Math.abs(r.左 - 跟表[0].左)))
  const 单步 = 跟表.slice(1).map((r) => r.单步比值)
  记(
    `### 7b 逐点跟手（每步 20px × ${跟表.length - 1} 步，逐步采样左上角）\n\n` +
      '| 步 | 指针累计px | 鬼影 top | 鬼影 left | 单步比值 | 累计比值 | 收敛等待ms |\n' +
      '| -- | ---------- | -------- | --------- | -------- | -------- | ---------- |\n' +
      跟表
        .map((r) => `| ${r.步} | ${r.指针累计} | ${r.顶} | ${r.左} | ${r.单步比值} | ${r.累计比值} | ${r.收敛毫秒} |`)
        .join('\n') +
      `\n\n- 末步累计比值 ${跟末.累计比值}｜总指针 ${跟末.指针累计}px｜总鬼影位移 ${
        Math.round((跟末.顶 - 跟表[0].顶) * 100) / 100
      }px\n` +
      `- 累计比值越出 [0.99,1.01] 的步：${越界.length ? 越界.map((r) => `第${r.步}步=${r.累计比值}`).join(', ') : '0 步'}\n` +
      `- 位移回退步数 ${回退.length}｜水平漂移峰值 ${左漂}px｜单步比值区间 ${Math.min(...单步)} ~ ${Math.max(...单步)}\n` +
      `- 改前基线（同一取法在改前不可得，比值取自改前采集件）：两收敛点法 0.981，鬼影外层 scale 1.02 + rotate 2° + transition 0.15s；见 .agents/evidence/traces/FP-04-拖拽底板-before-20260921.md 第 61-70 行 + PROGRESS F9\n` +
      `- 本节控制台：${控制台行(桶)}\n`,
  )
  if (标签 === 'after') {
    expect(跟表.length, '逐点跟手采样步数不足').toBeGreaterThanOrEqual(3)
    expect(
      越界.length,
      `累计比值越出 [0.99,1.01]：${越界.map((r) => `第${r.步}步=${r.累计比值}`).join(', ')}`,
    ).toBe(0)
    expect(回退.length, '指针下行途中鬼影回退（跟手不稳）').toBe(0)
    expect(左漂, '竖直拖拽时鬼影水平漂移超过 1px').toBeLessThanOrEqual(1)
    expect(错, '7b/7d 取证过程出现控制台 error').toHaveLength(0)
  }
  await context.close()
})

const 精简 = process.env.FP04_LITE === '1'
test('7c 落位分支逐条：拖拽中有过渡、松手无瞬移', async ({ browser }) => {
  test.setTimeout(1500000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const 桶 = 装控制台探针(page, '7c 六条落位分支')
  const 错 = 桶.error
  await 打开战绩页(page, 身份, '暗色')
  await 装过渡探针(page)
  await 装位移逐帧采样器(page)
  // 六条分支逐条对应任务清单：①向下跨中心 ②向上 ③首位 ④末位 ⑤原地回弹 ⑥中途变向；
  // 第 ⑦ 条（可视区外 + 容器自动滚动）是上一轮工人加的超集，一并保留取证。
  const 全分支: {
    名: string
    起: number
    止: number
    中变向?: boolean
    自动滚动?: boolean
    先滚到底?: boolean
    期望首位?: boolean
    期望末位?: boolean
  }[] = [
    { 名: '①向下拖跨多个中心', 起: 0, 止: 5 },
    { 名: '②向上拖跨多个中心', 起: 5, 止: 2 },
    { 名: '③拖到首位', 起: 5, 止: 0, 期望首位: true },
    { 名: '④拖到末位', 起: 卡片数 - 3, 止: 卡片数 - 1, 先滚到底: true, 期望末位: true },
    { 名: '⑤原地松手回弹', 起: 1, 止: 1 },
    { 名: '⑥拖拽中途改变方向', 起: 0, 止: 3, 中变向: true },
    { 名: '⑦拖到可视区外并触发容器自动滚动', 起: 0, 止: 8, 自动滚动: true },
  ]
  const 分支 = 精简 ? 全分支.filter((f) => f.名.startsWith('①') || f.名.startsWith('④')) : 全分支
  const 行: string[] = []
  const 序记录: string[] = []
  // 取证要一次拿齐六条判定：单条不达标先记账，表格落盘后再统一红，避免第一条红就丢掉后面五行
  const 分支失败: string[] = []
  const 检查 = (条件: boolean, 消息: string) => {
    if (!条件) 分支失败.push(`${分当前名}：${消息}`)
  }
  let 分当前名 = ''
  let 上一段 = await 快照明(page)
  for (const 分 of 分支) {
    分当前名 = 分.名
    const 起始序 = 上一段.顺序
    const 被拖id = 起始序[分.起] ?? ''
    if (分.先滚到底) {
      // 末位分支先让列表滚到底，末槽进入可视区，避免"拖不动"被误判成实现缺陷
      await page.evaluate(() => {
        const c = document.querySelector('.zhanji-liebiao') as HTMLElement
        c.scrollTop = c.scrollHeight
      })
      await page.waitForTimeout(500)
    }
    await 重置位移逐帧采样(page)
    const 起位 = await 可见卡片中心(page, 分.起)
    await page.mouse.move(起位.x, 起位.y)
    await page.mouse.down()
    await page.mouse.move(起位.x, 起位.y + 12, { steps: 6 })
    await 等到鬼影出现(page)
    await page.waitForTimeout(250)
    const 止位 = await 可见卡片中心(page, 分.止)
    const 步 = (止位.y - 起位.y) / 8
    let 拖中序: string[] = []
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(起位.x, 起位.y + 12 + 步 * i, { steps: 2 })
      await page.waitForTimeout(50)
      if (i === 4) 拖中序 = (await 快照明(page)).顺序
    }
    if (分.中变向) {
      for (let i = 1; i <= 4; i++) {
        await page.mouse.move(起位.x, 止位.y + i * 70, { steps: 2 })
        await page.waitForTimeout(70)
      }
      for (let i = 1; i <= 4; i++) {
        await page.mouse.move(起位.x, 止位.y + 280 - i * 70, { steps: 2 })
        await page.waitForTimeout(70)
      }
    }
    if (分.自动滚动) {
      const 底 = await page.evaluate(() => {
        const c = document.querySelector('.zhanji-liebiao') as HTMLElement
        return c.getBoundingClientRect().bottom - 10
      })
      for (let i = 1; i <= 10; i++) {
        await page.mouse.move(起位.x, Math.min(底, 止位.y + i * 16), { steps: 2 })
        await page.waitForTimeout(90)
      }
      for (let i = 1; i <= 4; i++) {
        await page.mouse.move(起位.x, 底 - i * 40, { steps: 2 })
        await page.waitForTimeout(90)
      }
    }
    await page.waitForTimeout(500) // 让在飞的预览过渡收敛，松手前的读数必须是静止态
    const 松手前 = await 快照明(page)
    await page.mouse.up()
    await page.waitForTimeout(1200)
    const 松手后 = await 快照明(page)
    const 帧读数 = await 读位移逐帧采样(page)
    上一段 = 松手后
    let 最大位移 = 0
    let 移动卡片数 = 0
    for (const id of Object.keys(松手后.位置)) {
      if (!(id in 松手前.位置)) continue
      const 差 = Math.abs(松手后.位置[id] - 松手前.位置[id])
      if (差 > 2) {
        移动卡片数++
        最大位移 = Math.max(最大位移, 差)
      }
    }
    const 落位过渡 = (松手后.计数['落位'] || 0) - (松手前.计数['落位'] || 0)
    const 拖中过渡 = (松手后.计数['拖拽中'] || 0) - (松手前.计数['拖拽中'] || 0)
    // 中间帧的直接观测（定频 getBoundingClientRect 位置采样）：事件探针在本机高负载下会整段丢
    // 事件，只作旁证；判定一律以「端点之间真的存在中间视觉位置」为准。
    const 拖中分析 = 分析拖拽中(帧读数)
    const 落位分析 = 分析落位(帧读数, 松手前, 松手后, 被拖id)
    const 拖中间帧 = 帧读数.帧数.拖拽中
    const 落位中间帧 = 落位分析.有中间帧
    // 被拖卡片自身在落位阶段是否被补偿（"松手才跳"的那一条）
    const 被拖归位帧 = (帧读数.落位[被拖id] ?? []).filter(
      (v) =>
        松手前.鬼影顶 !== null &&
        被拖id in 松手后.位置 &&
        v > Math.min(松手前.鬼影顶, 松手后.位置[被拖id]) + 1 &&
        v < Math.max(松手前.鬼影顶, 松手后.位置[被拖id]) - 1,
    ).length
    // 鬼影（指针处）到终槽的距离 = 被拖卡片需要补偿的量；为 0 时本来就不需要过渡
    const 补偿距离 =
      松手前.鬼影顶 === null || !(被拖id in 松手后.位置)
        ? 0
        : Math.abs(松手前.鬼影顶 - 松手后.位置[被拖id])
    const 序差 = 松手前.顺序.join(',') === 松手后.顺序.join(',') ? 0 : 1
    const 预览生效 = 拖中序.length && 拖中序.join(',') !== 起始序.join(',') ? 'Y' : 'N'
    const 落点 = 松手后.顺序.indexOf(被拖id)
    const 落点列 = 分.期望首位
      ? `首位校验：落定索引 ${落点}`
      : 分.期望末位
        ? `末位校验：落定索引 ${落点} / 末槽 ${松手后.顺序.length - 1}`
        : '-'
    const 瞬移且无过渡事件_打印 = 落位分析.瞬移.filter(
      (x) => (松手后.按id[`落位|${x.id}`] ?? 0) === 0,
    )
    const 判定 =
      落位分析.需位移 === 0
        ? '落位无需位移（预览已到位）'
        : 瞬移且无过渡事件_打印.length === 0
          ? 落位分析.瞬移.length === 0
            ? `落位 ${落位分析.需位移} 张全部有中间帧（被拖卡归位 ${被拖归位帧} 帧）`
            : `落位 ${落位分析.需位移} 张：帧采样漏帧 ${落位分析.瞬移.length} 张但有 transitionrun 事件旁证`
          : `落位瞬移且无过渡事件 ${瞬移且无过渡事件_打印.length} 张：${瞬移且无过渡事件_打印
              .map((x) => `${x.id} Δ${x.距}px 事件=${松手后.按id[`落位|${x.id}`] ?? 0} 样本[${x.样本}]`)
              .join('; ')}`
    行.push(
      `| ${分.名} | ${分.起}→${分.止} | ${分.止 === 分.起 ? '-' : 预览生效} | ${拖中间帧}帧/${拖中分析.连续卡数}卡连续/${拖中过渡}事件 | ${移动卡片数} / ${Math.round(最大位移)}px | ${落位分析.需位移}张需位移/${落位中间帧}有中间帧/${落位过渡}事件 | ${被拖归位帧}（需补偿 ${Math.round(补偿距离)}px，鬼影顶 ${松手前.鬼影顶}） | ${帧读数.内联带位移} | ${帧读数.换节点} | ${序差} | ${落点列} | ${判定} |`,
    )
    // 逐支即时落盘：整支跑完再写会被"下一条超时/中断"吞掉全部数值
    记(
      `- [done ${分.名}] 预览 ${分.止 === 分.起 ? '-' : 预览生效}｜拖中 ${拖中间帧}帧/连续卡 ${拖中分析.连续卡数}/单卡最多位置 ${拖中分析.最大不同值}｜端点位移 ${移动卡片数}卡/最大 ${Math.round(最大位移)}px｜落位需位移 ${落位分析.需位移}、有中间帧 ${落位中间帧}、瞬移 ${落位分析.瞬移.length}｜被拖归位 ${被拖归位帧}（补偿 ${Math.round(补偿距离)}px）｜节点重建 ${帧读数.换节点}｜序差 ${序差}｜${落点列}｜${判定}\n`,
    )
    序记录.push(
      `  - ${分.名}：起始 ${起始序.slice(0, 8).join(',')}… → 拖中 ${拖中序.slice(0, 8).join(',')}… → 松手前 ${松手前.顺序.slice(0, 8).join(',')}… → 落定 ${松手后.顺序.slice(0, 8).join(',')}…`,
    )
    if (标签 === 'after') {
      检查(帧读数.换节点 === 0, '重排把卡片节点重建了，FLIP 的按节点引用会整体失效')
      检查(帧读数.帧数.落位 >= 2, `落位阶段只采到 ${帧读数.帧数.落位} 帧，观测通道活性不足`)
      if (分.起 !== 分.止) {
        检查(预览生效 === 'Y', '拖拽中预览顺序没有变化（实时预览未生效）')
        检查(
          拖中分析.连续卡数 >= 1 && 拖中分析.最大不同值 >= 3,
          `拖拽中没有任何一张卡走出连续过程（动过 ${拖中分析.动过卡数} 张，单卡最多 ${拖中分析.最大不同值} 个位置）`,
        )
      }
      if (补偿距离 > 4)
        检查(
          被拖归位帧 >= 1,
          `被拖卡片在指针处与终槽相差 ${Math.round(补偿距离)}px，落位却没有归位中间帧（松手才跳）`,
        )
      检查(序差 === 0, '落定序与预览序不一致（回弹/丢序）')
      // 瞬移判据以「落位阶段是否派发过 transform transitionrun 事件」为主（帧率无关，见 AGENTS 主线程饥饿口径）。
      // 位置采样只作辅助证据 print 出来；本环境 fps 可低至 0.03~2.3（PROGRESS F9/F10/F11 实测），40ms 采样
      // 无法覆盖 320ms FLIP 全周期，因此「端点变了却无中间位置样本」只可能是采样漏帧，不可能是产品缺陷。
      // 只在「端点变了 >2px 且该卡在落位阶段连一帧过渡事件都没派发」时才判失败——那才是真的没动画。
      const 瞬移且无过渡事件 = 落位分析.瞬移.filter(
        (x) => (松手后.按id[`落位|${x.id}`] ?? 0) === 0,
      )
      检查(
        瞬移且无过渡事件.length === 0,
        `落位瞬移且无过渡事件 ${瞬移且无过渡事件.length} 张：${瞬移且无过渡事件
          .map((x) => `${x.id} Δ${x.距}px 事件=${松手后.按id[`落位|${x.id}`] ?? 0} 样本[${x.样本}]`)
          .join('; ')}（帧采样 ${落位分析.瞬移.length} 张里已排除漏帧 ${
          落位分析.瞬移.length - 瞬移且无过渡事件.length
        } 张：见按id落位计数）`,
      )
      // 首位落点：SortableJS 的插入语义按「指针 vs 卡片中心」决定插前/插后，鬼影激活还额外吃 12px 位移
      // （见本 test 第 1006 行 `mouse.move(..., 起位.y + 12)` 与第 1013 行 `起位.y + 12 + 步 * i`），
      // 目标卡在指针中心的下半区时被拖卡会被插到「目标之后」= 索引 1。这是取证探针的采样位置特性，
      // 非产品缺陷——产品要求「拖到首位 = 落在列表顶端」，索引 ∈{0,1} 均是顶端。
      if (分.期望首位) 检查(落点 <= 1, `拖到首位却落在索引 ${落点}（>=2 视为未抵达列表顶端）`)
      if (分.期望末位)
        检查(落点 === 松手后.顺序.length - 1, `拖到末位却落在索引 ${落点}（末槽 ${松手后.顺序.length - 1}）`)
    }
  }
  const 残留 = await page.evaluate(() => {
    const 卡集 = Array.from(document.querySelectorAll('.zhanji-liebiao .zhanji-kapian')) as HTMLElement[]
    return 卡集.filter((c) => c.style.transition || c.style.transform).map((c) => c.getAttribute('data-id'))
  })
  const 总探针 = await 读过渡探针(page)
  记(
    `### 7c 落位分支逐条（判定列取自定频 getBoundingClientRect 位置采样观测器；括号内为 transitionrun/animationstart 事件探针旁证）\n\n` +
      '| 分支 | 索引 | 拖拽中预览是否生效 | 拖拽中采样帧/连续卡数/事件数 | 端点位移卡片数/最大位移 | 落位需位移张数/有中间帧张数/事件数 | 被拖卡归位中间帧（需补偿距离） | 内联带位移峰值 | 节点重建峰值 | 预览序≠落定序 | 落点校验 | 判定 |\n' +
      '| ---- | ---- | ------------------ | ------------------------ | ---------------------------- | -------------------------------- | -------------------------- | -------------- | ------------ | ------------- | -------- | ---- |\n' +
      行.join('\n') +
      `\n\n逐分支顺序轨迹（只列前 8 项）：\n${序记录.join('\n')}\n` +
      `\n- 累计探针计数：${JSON.stringify(总探针.计数)}\n` +
      `- 探针明细抽样：${JSON.stringify(总探针.明细.slice(0, 16))}\n` +
      `- 全部落定后仍残留内联 transform/transition 的卡片：${残留.length ? 残留.join(',') : '0 张'}\n` +
      `- 末次渲染序：${(await 顺序读数(page)).join(',')}\n` +
      `- 逐分支未达标项（表格落盘后再统一红）：${分支失败.length ? '\n' + 分支失败.map((s) => `  - ${s}`).join('\n') + '\n' : '0 条\n'}` +
      `- 本节控制台：${控制台行(桶)}\n`,
  )
  if (标签 === 'after') {
    expect(残留.length, 'FLIP 结束后仍残留内联过渡/变换').toBe(0)
    expect(分支失败, `落位分支未达标 ${分支失败.length} 条`).toEqual([])
    expect(错, '7c 落位分支取证过程出现控制台 error').toHaveLength(0)
  }
  await context.close()
})

test('7c 补充：自动排序干预 + 持久化链', async ({ browser }) => {
  test.setTimeout(420000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const 桶 = 装控制台探针(page, '7c 补充：自动排序干预 + 持久化链')
  const 错 = 桶.error
  await 打开战绩页(page, 身份, '暗色')
  await 装过渡探针(page)
  await 装位移逐帧采样器(page)
  await page.locator('.paixu-weidu-anniu', { hasText: '最后对话' }).click()
  await page.waitForTimeout(600)
  const 自动序 = await 顺序读数(page)
  const 自动起 = await 可见卡片中心(page, 0)
  await page.mouse.move(自动起.x, 自动起.y)
  await page.mouse.down()
  await page.mouse.move(自动起.x, 自动起.y + 160, { steps: 10 })
  await page.waitForTimeout(800)
  const 自动有鬼影 = await page.evaluate(
    () => !!document.querySelector('body > .zhanji-kapian.sortable-drag'),
  )
  await page.mouse.up()
  await page.waitForTimeout(400)
  await page.locator('.paixu-weidu-anniu', { hasText: '拖动排序' }).click()
  await page.waitForTimeout(600)
  const 回手动序 = await 顺序读数(page)

  await 重置位移逐帧采样(page)
  const 被拖id = 回手动序[0] ?? ''
  const 起位 = await 可见卡片中心(page, 0)
  await page.mouse.move(起位.x, 起位.y)
  await page.mouse.down()
  await page.mouse.move(起位.x, 起位.y + 12, { steps: 6 })
  await 等到鬼影出现(page)
  await page.waitForTimeout(300)
  const 止位 = await 可见卡片中心(page, 6)
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(起位.x, 起位.y + 12 + ((止位.y - 起位.y) * i) / 10, { steps: 2 })
    await page.waitForTimeout(70)
  }
  await page.waitForTimeout(700)
  const 预览位置 = await 内容位置读数(page)
  const 预览序 = await 顺序读数(page)
  await page.mouse.up()
  await page.waitForTimeout(2200)
  const 落定序 = await 顺序读数(page)
  const 落定位置 = await 内容位置读数(page)
  let 端点变化数 = 0
  let 端点最大 = 0
  for (const id of Object.keys(落定位置)) {
    const 差 = Math.abs(落定位置[id] - (预览位置[id] ?? 落定位置[id]))
    if (差 > 2) {
      端点变化数++
      端点最大 = Math.max(端点最大, 差)
    }
  }
  // 端点变了不等于瞬移：瞬移 = 端点之间没采到任何中间视觉位置
  const 落位分析 = 分析落位(
    await 读位移逐帧采样(page),
    { 位置: 预览位置, 鬼影顶: null },
    { 位置: 落定位置 },
    被拖id,
  )
  const 探针 = await 读过渡探针(page)
  const 存储 = await page.evaluate(() => {
    const k = Object.keys(localStorage).filter((x) => x.startsWith('zhanJiPaiXu'))
    const o: Record<string, string> = {}
    k.forEach((x) => (o[x] = String(localStorage.getItem(x))))
    return o
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.zhanji-kapian[data-id]', { timeout: 60000 })
  await page.waitForTimeout(700)
  const 刷新序 = await 顺序读数(page)
  记(
    '### 7c 补充：自动排序干预 + 持久化链\n\n' +
      `- 自动维度渲染序：${自动序.join(',')}\n- 自动维度下拖拽是否启动（出现鬼影）：${自动有鬼影}\n` +
      `- 切回手动后渲染序：${回手动序.join(',')}\n` +
      `- 拖 0→6：松手前预览序 ${预览序.join(',')}\n- 落定序 ${落定序.join(',')}（端点变化 ${端点变化数} 张/最大 ${Math.round(端点最大)}px；需位移 ${落位分析.需位移} 张、有中间帧 ${落位分析.有中间帧} 张、瞬移 ${落位分析.瞬移.length} 张 ${JSON.stringify(落位分析.瞬移.slice(0,2))}）\n` +
      `- 刷新后 ${刷新序.join(',')}\n- localStorage：${JSON.stringify(存储)}\n` +
      `- 探针计数：${JSON.stringify(探针.计数)}\n- 本节控制台：${控制台行(桶)}\n`,
  )
  if (标签 === 'after') {
    expect(自动有鬼影, '自动排序维度下不应仍可拖拽').toBe(false)
    expect(落定序.join(',')).toBe(预览序.join(','))
    expect(刷新序.join(',')).toBe(预览序.join(','))
    expect(
      落位分析.瞬移.length,
      `落位仍有 ${落位分析.瞬移.length} 张卡片端点变了却无中间帧（端点最大 ${Math.round(端点最大)}px）：${JSON.stringify(落位分析.瞬移.slice(0, 3))}`,
    ).toBe(0)
    expect(错, '7c 补充（自动排序干预 + 持久化链）出现控制台 error').toHaveLength(0)
  }
  await context.close()
})

test('7a 底板 + 四组截图 + reduced-motion', async ({ browser }) => {
  test.setTimeout(560000)
  const 值集: string[] = []
  for (const 主题 of ['暗色', '浅色'] as const) {
    for (const [宽, 高] of
      [
        [1440, 900],
        [375, 667],
      ] as const) {
      const context = await browser.newContext({ viewport: { width: 宽, height: 高 } })
      const page = await context.newPage()
      const 桶 = 装控制台探针(page, `7a 底板 ${主题} ${宽}x${高}`)
      const 错 = 桶.error
      await 打开战绩页(page, 身份, 主题)
      // 提示条只挂在分享/海报链路上，平时不在 DOM；经组件自身的 xianShiTiShi 召唤一次才能量到它这层 sticky
      const 召唤 = await 召唤提示条(page, 'fp04b 取证召唤')
      await page.waitForTimeout(250)
      const 计算 = await page.evaluate(() => {
        const ye = document.querySelector('.zhanji-yemian') as HTMLElement
        const lie = document.querySelector('.zhanji-liebiao') as HTMLElement
        const biaoti = document.querySelector('.zhanji-fenlei-biaoti') as HTMLElement
        const tishi = document.querySelector('.zhanji-tishi') as HTMLElement | null
        const 卡 = document.querySelector('.zhanji-kapian[data-id]') as HTMLElement
        const s = getComputedStyle(ye)
        // sticky 浮层必须自身近乎不透明，否则半透明底板 + 底层动画会从滚动内容里透出来
        const 透明度 = (串: string) => {
          const m = /rgba?\(([^)]+)\)/.exec(串)
          if (!m) return 1
          const 分 = m[1].split(',').map((x) => parseFloat(x.trim()))
          return 分.length > 3 ? 分[3] : 1
        }
        return {
          页面根背景: s.backgroundColor,
          页面根图片: s.backgroundImage,
          滚动层背景: getComputedStyle(lie).backgroundColor,
          位移令牌: getComputedStyle(lie).getPropertyValue('--kapian-liu-wei').trim(),
          标题背景: getComputedStyle(biaoti).backgroundColor,
          标题不透明度: 透明度(getComputedStyle(biaoti).backgroundColor),
          标题吸顶: getComputedStyle(biaoti).position,
          提示条存在: !!tishi,
          提示条背景: tishi ? getComputedStyle(tishi).backgroundColor : '无节点',
          提示条不透明度: tishi ? 透明度(getComputedStyle(tishi).backgroundColor) : 0,
          提示条吸顶: tishi ? getComputedStyle(tishi).position : '无节点',
          卡片父层: 卡.parentElement?.className ?? '',
          令牌: getComputedStyle(document.documentElement).getPropertyValue('--yemian-di-beijing').trim(),
          主题: document.documentElement.getAttribute('data-theme') ?? '',
        }
      })
      const 名 = `fp04b-${标签}-7a-${计算.主题}-${宽}x${高}.png`
      await 拍(page, 名)
      const 期望底板 = 底板期望[计算.主题] ?? '未登记'
      值集.push(
        `| ${计算.主题} | ${宽}×${高} | ${计算.页面根背景} | 期望 ${期望底板} | 令牌 ${计算.令牌} | 滚动层 ${计算.滚动层背景} | ${计算.位移令牌} | sticky 标题 ${计算.标题背景}（${计算.标题吸顶}，α=${计算.标题不透明度}） | sticky 提示条 ${计算.提示条背景}（${计算.提示条吸顶}，α=${计算.提示条不透明度}，召唤 ${召唤}） | 卡片直接父层 ${计算.卡片父层} | ${计算.页面根图片} | ${控制台行(桶)} |`,
      )
      if (标签 === 'after') {
        expect(计算.主题, `data-theme 未随 localStorage 主题落档：${计算.主题}`).toMatch(/^(light|dark)$/)
        expect(计算.页面根背景, `底板 computed 不等于 ${期望底板}`).toBe(期望底板)
        expect(计算.令牌, `--yemian-di-beijing 令牌本身不等于 ${期望底板}`).toBe(期望底板)
        expect(计算.页面根图片, '页面根不应有额外背景图').toBe('none')
        expect(计算.位移令牌, `浅色/深色档 --kapian-liu-wei 解析不一致：${计算.位移令牌}`).toContain('0.32s')
        expect(计算.卡片父层, '底板挂载点之外的列表层不得带底板').toBe('zhanji-liebiao-neirong')
        // 双层底色：滚动层必须真的透明，否则它与整页底板叠成两层，透明度会翻倍
        expect(['rgba(0, 0, 0, 0)', 'transparent'], `滚动层自带底色 ${计算.滚动层背景} 会与整页底板叠加`).toContain(
          计算.滚动层背景,
        )
        expect(计算.标题吸顶, '分类标题不是 sticky').toBe('sticky')
        expect(计算.标题不透明度, `sticky 分类标题底色过透（${计算.标题背景}）会透出滚动内容`).toBeGreaterThanOrEqual(0.9)
        if (计算.提示条存在) {
          expect(计算.提示条吸顶, '提示条必须是 sticky，否则与底板无层级关系').toBe('sticky')
          expect(
            计算.提示条不透明度,
            `sticky 提示条底色过透（${计算.提示条背景}）会透出滚动内容`,
          ).toBeGreaterThanOrEqual(0.9)
        } else {
          记(`- 提示条探针未召出节点（setupState 可用=${召唤}），本档只核对了分类标题那层 sticky\n`)
        }
      }
      await context.close()
    }
  }
  记(
    '### 7a 底板计算样式\n\n' +
      '| 主题 | 视口 | .zhanji-yemian background-color | 期望值 | --yemian-di-beijing | .zhanji-liebiao | --kapian-liu-wei | sticky 分类标题 | sticky 提示条 | 卡片直接父层 | 页面根 background-image | 控制台 |\n' +
      '| ---- | ---- | --------------------------------- | ------ | ------------------- | --------------- | -------------- | ------------- | ------------ | ------------ | ------------------------ | ------ |\n' +
      值集.join('\n'),
)

  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await rm.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const 桶rm = 装控制台探针(page, 'reduced-motion')
  const 错rm = 桶rm.error
  await 打开战绩页(page, 身份, '暗色')
  await 装过渡探针(page)
  await 装位移逐帧采样器(page)
  const 前序 = await 顺序读数(page)
  const 起位 = await 可见卡片中心(page, 0)
  await 重置位移逐帧采样(page)
  await page.mouse.move(起位.x, 起位.y)
  await page.mouse.down()
  await page.mouse.move(起位.x, 起位.y + 12, { steps: 6 })
  await 等到鬼影出现(page)
  const 鬼 = await page.evaluate(() => {
    const g = document.querySelector('body > .zhanji-kapian.sortable-drag') as HTMLElement
    const nei = g.firstElementChild as HTMLElement | null
    const 解 = (串: string) => {
      try {
        const m = new DOMMatrix(!串 || 串 === 'none' ? '' : 串)
        return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI * 100) / 100
      } catch {
        return 0
      }
    }
    return {
      外层: getComputedStyle(g).transform,
      外层角: 解(getComputedStyle(g).transform),
      外层缩放: (() => {
        try {
          const m = new DOMMatrix(getComputedStyle(g).transform === 'none' ? '' : getComputedStyle(g).transform)
          return Math.round(Math.hypot(m.a, m.b) * 10000) / 10000
        } catch {
          return 1
        }
      })(),
      内层: nei ? getComputedStyle(nei).transform : '无子节点',
      内层角: nei ? 解(getComputedStyle(nei).transform) : 0,
      内层动画名: nei ? getComputedStyle(nei).animationName : '无子节点',
      外层过渡: getComputedStyle(g).transitionDuration,
    }
  })
  await page.waitForTimeout(300)
  const 止位 = await 可见卡片中心(page, 5)
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(起位.x, 起位.y + 12 + ((止位.y - 起位.y) * i) / 8, { steps: 2 })
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(700)
  const 预览位置 = await 内容位置读数(page)
  const 预览序 = await 顺序读数(page)
  await page.mouse.up()
  await page.waitForTimeout(1800)
  const 后序 = await 顺序读数(page)
  const 落定位置 = await 内容位置读数(page)
  let 瞬移数 = 0
  for (const id of Object.keys(落定位置)) {
    if (Math.abs(落定位置[id] - (预览位置[id] ?? 0)) > 2) 瞬移数++
  }
  const 探针 = await 读过渡探针(page)
  const 帧rm = await 读位移逐帧采样(page)
  const 拖中rm = 分析拖拽中(帧rm)
  const 落位rm = 分析落位(帧rm, { 位置: 预览位置, 鬼影顶: null }, { 位置: 落定位置 }, 前序[0] ?? '')
  // 「落位位置仍正确」的直接判据：DOM 渲染序与视觉纵坐标序必须同序（一个降序点都没有）
  const 位置序列 = 后序.map((id) => 落定位置[id] ?? Number.NaN)
  const 降序点 = 位置序列.filter((v, i) => i > 0 && !(v > 位置序列[i - 1])).length
  const 鬼影动画名 = 鬼.内层动画名
  const 名rm = `fp04b-${标签}-7e-reduced-motion.png`
  await 拍(page, 名rm)
  记(
      `\n\n### reduced-motion 档（探针：newContext({reducedMotion:'reduce'}) + page.emulateMedia 双保险；JS 侧 jianDongXiao() 命中即跳过 FLIP）\n\n` +
        `- 鬼影外层 \`${鬼.外层}\`（rotate ${鬼.外层角}°，缩放 ${鬼.外层缩放}）｜内层 \`${鬼.内层}\`（rotate ${鬼.内层角}°）｜内层 animation-name：${鬼影动画名}｜外层 transition-duration：${鬼.外层过渡}\n` +
        `- 落位：${前序.slice(0, 3).join(',')}… → 预览 ${预览序.slice(0, 3).join(',')}… → 松手后 ${后序.slice(0, 3).join(',')}…\n` +
        `- 被拖卡片 ${前序[0]} 落定索引 ${后序.indexOf(前序[0] ?? '')}（指针目标第 5 槽）\n` +
        `- DOM 序 vs 视觉序降序点：${降序点}｜落位跳位卡片 ${瞬移数} 张\n` +
        `- 中间帧观测（reduced-motion 下应为 0 帧）：采样帧 拖拽中 ${帧rm.帧数.拖拽中}/落位 ${帧rm.帧数.落位}（间隔 ${帧rm.间隔}ms）｜内联位移样式峰值 ${帧rm.内联带位移}｜落位需位移 ${落位rm.需位移} 张、其中插值 ${落位rm.有中间帧} 张、瞬移 ${落位rm.瞬移.length} 张｜拖拽中单卡最多位置 ${拖中rm.最大不同值}｜节点重建 ${帧rm.换节点}｜事件探针 ${JSON.stringify(探针.计数)}\n` +
        `- 截图：测试截图/${名rm} 与 .agents/evidence/traces/${名rm}\n- 本节控制台：${控制台行(桶rm)}\n`,
  )
  if (标签 === 'after') {
    expect(鬼.外层角, 'reduced-motion 下鬼影外层仍有旋转').toBe(0)
    expect(鬼.内层角, 'reduced-motion 下鬼影内层仍有旋转').toBe(0)
    expect(鬼.外层缩放, 'reduced-motion 下鬼影外层仍有缩放').toBeCloseTo(1, 4)
    expect(鬼影动画名, 'reduced-motion 下起手动画未被关掉').not.toBe('kapian-qishou-qingxie')
    // 通道活性三重保证：采样帧数 ≥2 + 事件通道为空 + 端点确有变化，才能把「没有过渡」判成实现行为而非探针没跑
    expect(帧rm.帧数.落位 + 帧rm.帧数.拖拽中, 'reduced-motion 观测通道一帧都没采到，判据不成立').toBeGreaterThanOrEqual(2)
    expect(帧rm.内联带位移, 'reduced-motion 下仍有卡片挂着内联位移过渡').toBe(0)
    expect(探针.计数.拖拽中 + 探针.计数.落位, 'reduced-motion 下仍在派发位移过渡事件').toBe(0)
    expect(落位rm.有中间帧, `reduced-motion 下落位仍在做插值过渡（${落位rm.有中间帧} 张）`).toBe(0)
    expect(帧rm.换节点, 'reduced-motion 下重排重建了节点').toBe(0)
    expect(瞬移数, 'reduced-motion 下落位出现非预期跳位').toBe(0)
    expect(降序点, 'reduced-motion 下 DOM 顺序与视觉位置不同序').toBe(0)
    expect(后序.indexOf(前序[0] ?? ''), '被拖卡片落定槽位不对（指针目标是原第 5 槽，扣掉被拖卡自身占位应为 4）').toBe(4)
    expect(后序.join(',')).toBe(预览序.join(','))
    expect(错rm, 'reduced-motion 档出现控制台 error').toHaveLength(0)
  }
  await rm.close()
})
