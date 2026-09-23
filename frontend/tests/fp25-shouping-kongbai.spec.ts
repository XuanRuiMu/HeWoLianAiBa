import { expect, test, type Browser } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  baoZhengCeShiZhangHao,
  daKaiJiaJuQingQiu,
  zhuRuJiaJuShenFen,
  type JiaJuShenFen,
} from './测试夹具'
import { 挂桩, 挂帧延后, 档, 页内记录器, 桩会话ID } from './fp25-共用'

/**
 * FP-25 专诊（只诊断/只计数，不改任何 src）：移动档进入 `/chat/:id` 首屏偶发不渲染输入区。
 *
 * 三组对照（每组 N 次「全新上下文 + 全新文档」进入，一次进入 = 一轮）：
 *   A = page.route 桩注入（无需后端） + 移动档 390x844(isMobile+hasTouch)
 *   B = 真实登录夹具（真调 /api/认证/登录，需后端） + 同一移动档
 *   C = 同代码桌面档 1440x900（证明档间差异真实存在）
 *   D = 桩注入 + 仅 viewport 390x844（不开 isMobile/hasTouch）⇒ 区分「CSS 媒体查询分支」与「Chromium 移动端仿真」
 *   E = 桩注入 + 移动档 + SPA 导航（先落 /login 再由前端路由进聊天页）⇒ 覆盖 out-in 过渡「有前序组件」的分支
 *
 * 判据（与 fp-verify-chat-input.spec.ts / fp11 完全同口径，不放宽）：
 *   导航后不做任何交互，`footer.shuru-quyu` 必须在 20 秒内 visible；否则记为「空白」。
 *   每轮都落 DOM 快照时序 + 网络时序 + 控制台计数；空白轮额外落 main 外 HTML 与整页截图。
 *
 * 本文件只读 src，不写 src。取证落仓库外 .agents/evidence/traces，前缀 FP-25 + 日期（L-10 纪律）。
 */

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 前端根 = path.resolve(本目录, '..')
const 证据目录 = path.resolve(前端根, '..', '..', '..', '.agents', 'evidence', 'traces')
const 日期 = '20260922'
const 后缀 = process.env.FP25_EVIDENCE_SUFFIX ? `-${process.env.FP25_EVIDENCE_SUFFIX}` : ''
const 证据文件 = path.resolve(证据目录, `FP-25-首屏空白计数-${日期}${后缀}.json`)
const 截图目录 = 证据目录

const 轮数 = Number(process.env.FP25_ROUNDS ?? 12)
const 组清单 = (process.env.FP25_GROUPS ?? 'A,C,B')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)

/**
 * 主线程节流档（诊断仪器，不改判据）：原取证发生在多 agent 并发压满 CPU 的机器上，
 * 本机静默时 14×3 轮 0 复现 ⇒ 用 CDP `Emulation.setCPUThrottlingRate` 把「同一份代码、
 * 更慢的帧」这一自变量单独拉出来。判据仍是「footer.shuru-quyu 20s 内 visible」，不放宽。
 */
const 节流倍率 = Number(process.env.FP25_CPU_THROTTLE ?? 0)

/**
 * 帧门探针（FP25_RAF_DELAY 毫秒）：只把 `window.requestAnimationFrame` 换成「延后 D 毫秒再回调」，
 * 其余一切（JS 执行、网络、Vue 响应式调度＝微任务）保持全速。
 * Vue 的 out-in leave 恰好只等 `nextFrame(nextFrame(...))` 这两帧 ⇒ 若空白窗宽度随 D 线性变化
 * （理论值 ≈2D），归因就钉死在「enter 被 out-in leave 的动画帧门控」这一条上，
 * 而不是笼统的「机器慢所以偶发」。这是因果实验，不是相关性观察。
 */
const 帧延后 = Number(process.env.FP25_RAF_DELAY ?? 0)

/* ─────────────────────────────── 单轮执行 ─────────────────────────────── */

type 轮记录 = {
  组: string
  档位: string
  序号: number
  结果: '渲染' | '空白'
  输入区出现ms: number | null
  导航到可见ms: number | null
  判据窗口后延迟出现ms?: number | null
  最终URL: string
  视口自证: Record<string, unknown>
  快照: Record<string, unknown>[]
  空壳帧?: { t: number; html: string } | null
  页面错误: unknown[]
  未捕获拒绝: unknown[]
  网络: { t: number; 路径: string; 状态: number }[]
  请求失败: string[]
  控制台: { error: number; warning: number; pageerror: number; error样本: string[]; warning样本: string[] }
  判据时刻main外HTML?: string
  判据时刻截图?: string
  恢复后main外HTML?: string
  桩逃逸路径?: string[]
}

async function 跑一轮(
  浏览器: Browser,
  组名: string,
  档名: keyof typeof 档,
  模式: '桩' | '真',
  序号: number,
  身份?: JiaJuShenFen,
  会话ID?: string,
  SPA导航?: boolean,
  路径?: string,
  判据选择器 = 'footer.shuru-quyu',
  注入令牌 = true,
): Promise<轮记录> {
  const 选择的档 = 档[档名]
  const context = await 浏览器.newContext({ ...选择的档.选项 })
  const page = await context.newPage()
  if (节流倍率 > 0) {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 节流倍率 })
  }
  const 逃逸: string[] = []
  const 请求失败: string[] = []
  const 网络: { t: number; 路径: string; 状态: number }[] = []
  const 控制台 = { error: 0, warning: 0, pageerror: 0, error样本: [] as string[], warning样本: [] as string[] }
  const t0 = Date.now()
  page.on('response', (响) => {
    const u = 响.url()
    if (u.includes('/api/') || u.includes('/socket.io')) {
      网络.push({ t: Date.now() - t0, 路径: decodeURIComponent(new URL(u).pathname), 状态: 响.status() })
    }
  })
  page.on('console', (志) => {
    if (志.type() === 'error') {
      控制台.error += 1
      if (控制台.error样本.length < 20) 控制台.error样本.push(志.text().slice(0, 300))
    } else if (志.type() === 'warning') {
      控制台.warning += 1
      if (控制台.warning样本.length < 20) 控制台.warning样本.push(志.text().slice(0, 300))
    }
  })
  page.on('pageerror', () => {
    控制台.pageerror += 1
  })
  page.on('requestfailed', (请) => {
    请求失败.push(`${请.url().slice(0, 140)} :: ${String(请.failure()?.errorText ?? '')}`)
  })

  if (帧延后 > 0) await 挂帧延后(page, 帧延后)
  await page.addInitScript(页内记录器)
  if (模式 === '桩') await 挂桩(page, 逃逸, 注入令牌)

  const 目标 = 路径 ?? `/chat/${会话ID ?? 桩会话ID}`
  let 导航到可见ms: number | null = null
  let 延迟出现ms: number | null = null
  let 判据时刻mainHTML: string | undefined
  let 判据时刻截图: string | undefined
  let 恢复后mainHTML: string | undefined
  let 结果: '渲染' | '空白' = '空白'
  let 报错 = ''

  try {
    if (模式 === '真') {
      await zhuRuJiaJuShenFen(page, 身份 as JiaJuShenFen)
    }
    if (SPA导航) {
      if (模式 === '桩') await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.evaluate((路: string) => {
        const 应用 = (document.querySelector('#app') as HTMLElement & { __vue_app__?: unknown })?.__vue_app__
        const 路由 = 应用 && (应用 as { config: { globalProperties: { $router?: unknown } } }).config.globalProperties.$router
        if (!路由) throw new Error('FP25: 取不到 router 实例，SPA 导航档不可用')
         
        void (路由 as any).replace(路)
      }, 目标)
    } else {
      await page.goto(目标, { waitUntil: 'domcontentloaded', timeout: 60000 })
    }
    try {
      await page.locator(判据选择器).waitFor({ state: 'visible', timeout: 20000 })
      结果 = '渲染'
      导航到可见ms = Date.now() - t0
    } catch (e) {
      结果 = '空白'
      报错 = String((e as Error).message).slice(0, 400)
      // 先钉住「判据时刻」那一帧的证据（main 外 HTML + 截图），再做延迟观察——否则证据会被
      // 恢复后的状态覆盖，失去归因价值。
      判据时刻mainHTML = await page
        .evaluate(() => (document.querySelector('main.app-zhuti')?.outerHTML ?? '(无 main.app-zhuti)').slice(0, 4000))
        .catch(() => '(读取失败)')
      判据时刻截图 = path.join(
        截图目录,
        `FP-25-判据时刻空白-${组名}-${选择的档.名}${节流倍率 > 0 ? `-CPUx${节流倍率}` : ''}-第${序号}轮-${日期}${后缀}.png`,
      )
      await page.screenshot({ path: 判据时刻截图, fullPage: false, timeout: 60000 }).catch(() => {
        判据时刻截图 = '(截图失败)'
      })
      // 判据窗口之后再观察 40 秒：区分「主线程饿死但会补上」与「out-in 状态永久卡死」，
      // 两者修法不同，不能混为一谈。判据本身不放宽。
      try {
        await page.locator('footer.shuru-quyu').waitFor({ state: 'visible', timeout: 40000 })
        延迟出现ms = Date.now() - t0
        恢复后mainHTML = await page
          .evaluate(() => (document.querySelector('main.app-zhuti')?.outerHTML ?? '(无)').slice(0, 300))
          .catch(() => '(读取失败)')
      } catch {
        延迟出现ms = null
      }
    }
  } catch (e) {
    报错 = `导航异常：${String((e as Error).message).slice(0, 300)}`
  }

  const 页内 = await page
    .evaluate(() => {
      const 记 = (window as unknown as { __FP25?: Record<string, unknown> }).__FP25 ?? {}
      const 视口 = {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        maxTouchPoints: navigator.maxTouchPoints,
        移动媒体查询: window.matchMedia('(max-width: 767px)').matches,
        仿真媒体查询: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
        DPR: window.devicePixelRatio,
        UA: navigator.userAgent.slice(0, 60),
      }
      return {
        快照: (记.快照 as Record<string, unknown>[]) ?? [],
        页面错误: (记.页面错误 as unknown[]) ?? [],
        未捕获拒绝: (记.未捕获拒绝 as unknown[]) ?? [],
        首次输入区: (记.首次输入区 as number) ?? null,
        空壳样本: (记.空壳样本 as { t: number; html: string } | null) ?? null,
        URL: location.pathname,
        视口,
      }
    })
    .catch((e) => ({
      快照: [{ 记录器读取失败: String((e as Error).message).slice(0, 200) }],
      页面错误: [],
      未捕获拒绝: [],
      首次输入区: null,
      空壳样本: null,
      URL: '(读不到)',
      视口: {},
    }))

  const 轮: 轮记录 = {
    组: 组名,
    档位:
      选择的档.名 +
      (节流倍率 > 0 ? `@CPUx${节流倍率}` : '') +
      (帧延后 > 0 ? `@rAF+${帧延后}ms` : ''),
    序号,
    结果,
    输入区出现ms: 页内.首次输入区,
    导航到可见ms: 导航到可见ms,
    判据窗口后延迟出现ms: 延迟出现ms,
    最终URL: 页内.URL,
    视口自证: 页内.视口 as Record<string, unknown>,
    快照: 页内.快照,
    空壳帧: 页内.空壳样本,
    页面错误: 页内.页面错误,
    未捕获拒绝: 页内.未捕获拒绝,
    网络: 网络.slice(-80),
    请求失败: 请求失败.slice(-20),
    控制台,
    判据时刻main外HTML: 判据时刻mainHTML,
    判据时刻截图: 判据时刻截图,
    恢复后main外HTML: 恢复后mainHTML,
    桩逃逸路径: 模式 === '桩' ? 逃逸 : undefined,
  }

  if (结果 === '空白') (轮 as Record<string, unknown>).空白报错 = 报错

  await context.close()
  return 轮
}

/* ─────────────────────────────── 证据落盘 ─────────────────────────────── */

const 全部轮: 轮记录[] = []
const 计数: Record<string, { 总: number; 渲染: number; 空白: number }> = {}

function 写证据(阶段: string) {
  try {
    fs.mkdirSync(证据目录, { recursive: true })
    fs.writeFileSync(
      证据文件,
      JSON.stringify({ 阶段, 生成于: new Date().toISOString(), 判据: '导航后无交互，footer.shuru-quyu 20s 内必须 visible', 计数, 轮: 全部轮 }, null, 2),
    )
  } catch (e) {
    console.log(`FP25 证据写入失败：${String((e as Error).message)}`)
  }
}

function 记账(组名: string, 轮: 轮记录) {
  全部轮.push(轮)
  计数[组名] ??= { 总: 0, 渲染: 0, 空白: 0 }
  计数[组名].总 += 1
  if (轮.结果 === '渲染') 计数[组名].渲染 += 1
  else 计数[组名].空白 += 1
  写证据(`进行中：${组名} 第 ${轮.序号} 轮`)
  console.log(
    `FP25 ${组名} 第${轮.序号}轮 → ${轮.结果}｜URL=${轮.最终URL}｜输入区t=${轮.输入区出现ms}ms｜` +
      (轮.判据窗口后延迟出现ms ? `判据后补上=${轮.判据窗口后延迟出现ms}ms｜` : '') +
      `视口=${JSON.stringify(轮.视口自证.innerWidth)}x${JSON.stringify(轮.视口自证.innerHeight)} touch=${JSON.stringify(轮.视口自证.maxTouchPoints)}` +
      `｜console error=${轮.控制台.error} warn=${轮.控制台.warning} pageerror=${轮.控制台.pageerror}`,
  )
}

/* ─────────────────────────────── 用例 ─────────────────────────────── */

test.setTimeout(1_800_000)

test.describe('FP-25 移动档首屏输入区空白计数', () => {
  test('A 桩注入 + 移动档', async ({ browser }) => {
    test.skip(!组清单.includes('A'), 'FP25_GROUPS 未包含 A')
    for (let i = 1; i <= 轮数; i += 1) {
      记账('A', await 跑一轮(browser, 'A', '移动', '桩', i))
    }
  })

  test('C 桩注入 + 桌面档（对照）', async ({ browser }) => {
    test.skip(!组清单.includes('C'), 'FP25_GROUPS 未包含 C')
    for (let i = 1; i <= 轮数; i += 1) {
      记账('C', await 跑一轮(browser, 'C', '桌面', '桩', i))
    }
  })

  test('B 真实登录夹具 + 移动档（真后端）', async ({ browser }) => {
    test.skip(!组清单.includes('B'), 'FP25_GROUPS 未包含 B')
    const 请求 = await daKaiJiaJuQingQiu()
    const 身份 = await baoZhengCeShiZhangHao(请求)
    const 列 = await 请求.get('/api/聊天/会话', { headers: { Authorization: `Bearer ${身份.lingPai}` } })
    const 体 = await 列.json().catch(() => null)
    const 会话ID = String(体?.shu_ju?.[0]?.id ?? 体?.shu_ju?.lie_biao?.[0]?.id ?? '')
    expect(会话ID, `FP25 B 组前置：夹具账号无可用会话（HTTP ${列.status()}）`).toBeTruthy()
    await 请求.dispose()
    for (let i = 1; i <= 轮数; i += 1) {
      记账('B', await 跑一轮(browser, 'B', '移动', '真', i, 身份, 会话ID))
    }
  })

  test('D 桩注入 + 仅 viewport 390x844（不开 isMobile/hasTouch）', async ({ browser }) => {
    test.skip(!组清单.includes('D'), 'FP25_GROUPS 未包含 D')
    for (let i = 1; i <= 轮数; i += 1) {
      记账('D', await 跑一轮(browser, 'D', '移动裸视口', '桩', i))
    }
  })

  test('E 桩注入 + 移动档 + SPA 导航（/login → 前端路由 replace 进聊天页）', async ({ browser }) => {
    test.skip(!组清单.includes('E'), 'FP25_GROUPS 未包含 E')
    for (let i = 1; i <= 轮数; i += 1) {
      记账('E', await 跑一轮(browser, 'E', '移动', '桩', i, undefined, undefined, true))
    }
  })

  test('F 桩注入 + 移动档 + 主线程节流（FP25_CPU_THROTTLE）', async ({ browser }) => {
    test.skip(!组清单.includes('F'), 'FP25_GROUPS 未包含 F')
    for (let i = 1; i <= 轮数; i += 1) {
      记账('F', await 跑一轮(browser, 'F', '移动', '桩', i))
    }
  })

  test('G 桩注入 + 桌面档 + 主线程节流（同倍率对照）', async ({ browser }) => {
    test.skip(!组清单.includes('G'), 'FP25_GROUPS 未包含 G')
    for (let i = 1; i <= 轮数; i += 1) {
      记账('G', await 跑一轮(browser, 'G', '桌面', '桩', i))
    }
  })

  test('H 真实登录夹具 + 移动档 + SPA 导航（真后端：/login 注入令牌 → 前端路由进聊天页）', async ({ browser }) => {
    test.skip(!组清单.includes('H'), 'FP25_GROUPS 未包含 H')
    const 请求 = await daKaiJiaJuQingQiu()
    const 身份 = await baoZhengCeShiZhangHao(请求)
    const 列 = await 请求.get('/api/聊天/会话', { headers: { Authorization: `Bearer ${身份.lingPai}` } })
    const 体 = await 列.json().catch(() => null)
    const 会话ID = String(体?.shu_ju?.[0]?.id ?? 体?.shu_ju?.lie_biao?.[0]?.id ?? '')
    expect(会话ID, `FP25 H 组前置：夹具账号无可用会话（HTTP ${列.status()}）`).toBeTruthy()
    await 请求.dispose()
    for (let i = 1; i <= 轮数; i += 1) {
      记账('H', await 跑一轮(browser, 'H', '移动', '真', i, 身份, 会话ID, true))
    }
  })

  test('J 帧门探针：rAF 延后 FP25_RAF_DELAY（其余全速）+ 移动档', async ({ browser }) => {
    test.skip(!组清单.includes('J'), 'FP25_GROUPS 未包含 J')
    for (let i = 1; i <= 轮数; i += 1) {
      记账('J', await 跑一轮(browser, 'J', '移动', '桩', i))
    }
  })

  test('I 对照组：冷加载 /login（无令牌、无会话竞态）——验证「空窗」是否聊天页特有', async ({ browser }) => {    test.skip(!组清单.includes('I'), 'FP25_GROUPS 未包含 I')
    for (let i = 1; i <= 轮数; i += 1) {
      记账('I', await 跑一轮(browser, 'I', '移动', '桩', i, undefined, undefined, false, '/login', '#denglu-shoujihao', false))
    }
  })

  test('汇总门禁：任一档出现「空白」即红（不改判据，只计数）', async () => {
    fs.mkdirSync(证据目录, { recursive: true })
    写证据('最终')
    const 明细 = Object.entries(计数)
      .map(([组, c]) => `${组}: ${c.渲染}/${c.总} 渲染、${c.空白}/${c.总} 空白`)
      .join('；')
    const 空白轮 = 全部轮.filter((轮) => 轮.结果 === '空白')
    for (const 轮 of 空白轮) {
      console.log(
        `FP25 空白轮 ${轮.组}#${轮.序号} URL=${轮.最终URL} 判据时刻main=${String(轮.判据时刻main外HTML).slice(0, 220)} ` +
          `判据后补上=${轮.判据窗口后延迟出现ms ?? '仍未出现'}ms 截图=${轮.判据时刻截图 ?? '(无)'} 控制台error=${轮.控制台.error}`,
      )
    }
    expect(空白轮.length, `FP-25 首屏空白复现：${明细}`).toBe(0)
  })
})
