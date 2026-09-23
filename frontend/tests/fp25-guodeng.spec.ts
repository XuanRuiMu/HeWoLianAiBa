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
import { 挂桩, 挂帧延后, 档, 页内记录器, 桩会话ID, type 档位 } from './fp25-共用'

/**
 * FP-25 常驻帧级回归门禁（修复落地后的守门人，与诊断 spec fp25-shouping-kongbai 共享探针与桩）。
 *
 * 根因（专诊定性、用户裁定修法）：main.ts 同步 app.mount 使首帧 route.name=undefined，
 * App.vue 的 `:key="nei-${route.name}"` 在初始路由解析完成时翻转，`Transition mode="out-in"`
 * 把新页 enter 完全排在 leave 之后，而 Vue leave 依赖 rAF(rAF(cb)) ⇒ 冷加载首屏被两帧门控。
 * 修复 = `router.isReady().then(mount)`（只等当前路由解析，不等网络）。
 *
 * 四条硬判据（任何一条破即红，禁止放宽收口）：
 *  ① ≥20 轮冷加载（桩移动档 + 桩桌面档 + FP25_REAL=1 真实登录移动档）任何一帧都不得出现
 *    「main.app-zhuti 有子元素但无 .yemian-rongqi」空壳签名（空壳帧恒 null）；
 *  ② 冷加载组输入区（footer.shuru-quyu）出现耗时 p95 < 1500ms；
 *  ③ rAF 延后 11000ms 帧门探针下输入区仍须在 20s 内出现——首屏渲染一旦重新依赖动画帧，
 *    leave 的两帧门控会变成 2×11s > 20s 立刻红（谁改回帧门控立刻红）；
 *  ④ 连跑 20 轮 0 失败（本文件跑通即为该记录，证据 JSON 含逐轮计数）。
 *
 * 判据选择器 / 档位 / 记录器与 fp11、fp-verify-chat-input、诊断 spec 同口径（共用 fp25-共用.ts）。
 * 档位一律 browser.newContext 显式开 + 回读 innerWidth/innerHeight/maxTouchPoints 自证
 * （派生 config 的 project 层 viewport 会被 devices spread 干扰，实跑以回读为准——L 记录定案）。
 *
 * 运行：`npx playwright test --config playwright.config-fp25.ts fp25-guodeng`（端口 5201）。
 * G3 真实登录档需 backend 于 3010（VITE_API_PROXY_TARGET）且 FP25_REAL=1，否则整组 skip。
 * 证据落仓库外 .agents/evidence/traces，前缀 FP-25G + 执行 ID，永不与诊断前缀 FP-25- 相撞（L-10）。
 */

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 前端根 = path.resolve(本目录, '..')
const 证据目录 = path.resolve(前端根, '..', '..', '..', '.agents', 'evidence', 'traces')
const 日期 = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const 执行ID = `run${Date.now()}`
const 证据文件 = path.resolve(证据目录, `FP-25G-帧门门禁-${日期}${process.env.FP25G_EVIDENCE_SUFFIX ? `-${process.env.FP25G_EVIDENCE_SUFFIX}` : ''}-${执行ID}.json`)

const 轮数 = Number(process.env.FP25G_ROUNDS ?? 20)
const 判据窗口毫秒 = 20000
const 帧门延后毫秒 = 11000
const p95上界毫秒 = 1500

type 轮记录 = {
  组: string
  档位: string
  序号: number
  结果: '渲染' | '空白'
  输入区出现ms: number | null
  空壳帧: { t: number; html: string } | null
  视口自证: Record<string, unknown>
  最终URL: string
  判据时刻main片段?: string
  判据时刻截图?: string
  控制台error数: number
  桩逃逸路径?: string[]
}

const 全部轮: 轮记录[] = []
const 计数: Record<string, { 总: number; 渲染: number; 空白: number; 空壳帧: number }> = {}

function 写证据(阶段: string) {
  try {
    fs.mkdirSync(证据目录, { recursive: true })
    fs.writeFileSync(
      证据文件,
      JSON.stringify(
        {
          阶段,
          生成于: new Date().toISOString(),
          判据: {
            空白: '冷加载/探针轮：footer.shuru-quyu 20s 内必须出现（渲染），空白计数=0',
            空壳帧: '任何一帧不得出现 main.app-zhuti 有子元素但无 .yemian-rongqi（空壳帧恒 null）',
            p95: `冷加载组（不含探针）输入区出现耗时 p95 < ${p95上界毫秒}ms`,
            探针: `rAF 延后 ${帧门延后毫秒}ms 下输入区仍须 ${判据窗口毫秒 / 1000}s 内出现（帧门控回归即红）`,
            轮数: 轮数,
          },
          计数,
          轮: 全部轮,
        },
        null,
        2,
      ),
    )
  } catch (e) {
    console.log(`FP25G 证据写入失败：${String((e as Error).message)}`)
  }
}

async function 跑一轮(
  浏览器: Browser,
  组名: string,
  选择的档: 档位,
  模式: '桩' | '真',
  序号: number,
  选项: { rAF延后?: number; 身份?: JiaJuShenFen; 会话ID?: string } = {},
): Promise<轮记录> {
  const context = await 浏览器.newContext({ ...选择的档.选项 })
  const page = await context.newPage()
  const 逃逸: string[] = []
  let 控制台error数 = 0
  page.on('console', (志) => {
    if (志.type() === 'error') 控制台error数 += 1
  })

  if (选项.rAF延后) await 挂帧延后(page, 选项.rAF延后)
  await page.addInitScript(页内记录器)
  if (模式 === '桩') await 挂桩(page, 逃逸)

  let 结果: '渲染' | '空白'
  let 判据时刻main片段: string | undefined
  let 判据时刻截图: string | undefined
  try {
    if (模式 === '真') await zhuRuJiaJuShenFen(page, 选项.身份 as JiaJuShenFen)
    await page.goto(`/chat/${选项.会话ID ?? 桩会话ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.locator('footer.shuru-quyu').waitFor({ state: 'visible', timeout: 判据窗口毫秒 })
    结果 = '渲染'
  } catch {
    结果 = '空白'
    判据时刻main片段 = await page
      .evaluate(() => (document.querySelector('main.app-zhuti')?.outerHTML ?? '(无 main.app-zhuti)').slice(0, 1200))
      .catch(() => '(读取失败)')
    判据时刻截图 = path.resolve(证据目录, `FP-25G-判据时刻空白-${组名}-${选择的档.名}-第${序号}轮-${日期}-${执行ID}.png`)
    await page.screenshot({ path: 判据时刻截图, fullPage: false, timeout: 60000 }).catch(() => {
      判据时刻截图 = '(截图失败)'
    })
  }

  const 页内 = await page
    .evaluate(() => {
      const 记 = (window as unknown as { __FP25?: Record<string, unknown> }).__FP25 ?? {}
      return {
        首次输入区: (记.首次输入区 as number) ?? null,
        空壳样本: (记.空壳样本 as { t: number; html: string } | null) ?? null,
        URL: location.pathname,
        视口: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          maxTouchPoints: navigator.maxTouchPoints,
          DPR: window.devicePixelRatio,
        },
      }
    })
    .catch(() => ({ 首次输入区: null, 空壳样本: null, URL: '(读不到)', 视口: {} }))

  await context.close()

  const 轮: 轮记录 = {
    组: 组名,
    档位: 选择的档.名 + (选项.rAF延后 ? `@rAF+${选项.rAF延后}ms` : ''),
    序号,
    结果,
    输入区出现ms: 页内.首次输入区,
    空壳帧: 页内.空壳样本,
    视口自证: 页内.视口 as Record<string, unknown>,
    最终URL: 页内.URL,
    判据时刻main片段,
    判据时刻截图,
    控制台error数,
    桩逃逸路径: 模式 === '桩' ? 逃逸 : undefined,
  }
  全部轮.push(轮)
  计数[组名] ??= { 总: 0, 渲染: 0, 空白: 0, 空壳帧: 0 }
  计数[组名].总 += 1
  if (轮.结果 === '渲染') 计数[组名].渲染 += 1
  else 计数[组名].空白 += 1
  if (轮.空壳帧) 计数[组名].空壳帧 += 1
  写证据(`进行中：${组名} 第 ${轮.序号} 轮`)
  console.log(
    `FP25G ${组名} 第${轮.序号}轮 → ${轮.结果}｜输入区t=${轮.输入区出现ms}ms｜空壳帧=${轮.空壳帧 ? `命中@${轮.空壳帧.t}ms` : 'null'}｜` +
      `视口=${JSON.stringify(轮.视口自证.innerWidth)}x${JSON.stringify(轮.视口自证.innerHeight)} touch=${JSON.stringify(轮.视口自证.maxTouchPoints)}`,
  )

  // 逐轮硬断言（fail-fast，证据已先行落盘）
  const 期望视口 = 选择的档.选项.viewport
  expect(
    [轮.视口自证.innerWidth, 轮.视口自证.innerHeight],
    `FP25G ${组名}#${序号} 视口自证必须等于档位 ${期望视口.width}x${期望视口.height}（顶层/项目层 viewport 被 devices spread 覆盖是已知陷阱，以回读为准）`,
  ).toEqual([期望视口.width, 期望视口.height])
  if (选择的档.选项.hasTouch) {
    expect(Number(轮.视口自证.maxTouchPoints), `FP25G ${组名}#${序号} 移动仿真档 maxTouchPoints 必须 >0`).toBeGreaterThan(0)
  }
  expect(轮.空壳帧, `FP25G ${组名}#${序号} 出现空壳帧（app-zhuti 有子元素但无 .yemian-rongqi）：${JSON.stringify(轮.空壳帧)?.slice(0, 300)}`).toBeNull()
  expect(轮.结果, `FP25G ${组名}#${序号} 判据窗口 ${判据窗口毫秒}ms 内未出现输入区`).toBe('渲染')
  return 轮
}

function p95(值: number[]): number {
  const 排 = [...值].sort((a, b) => a - b)
  return 排[Math.max(0, Math.ceil(0.95 * 排.length) - 1)]
}

test.setTimeout(3_600_000)

test.describe('FP-25 首屏帧门控常驻门禁', () => {
  test.describe.configure({ mode: 'serial' })

  test('G1 桩注入 + 移动档 冷加载', async ({ browser }) => {
    for (let i = 1; i <= 轮数; i += 1) await 跑一轮(browser, 'G1', 档.移动, '桩', i)
  })

  test('G2 桩注入 + 桌面档 冷加载', async ({ browser }) => {
    for (let i = 1; i <= 轮数; i += 1) await 跑一轮(browser, 'G2', 档.桌面, '桩', i)
  })

  test('G3 真实登录夹具 + 移动档 冷加载（仅 FP25_REAL=1，需 backend :3010）', async ({ browser }) => {
    test.skip(process.env.FP25_REAL !== '1', 'FP25_REAL!=1：真实登录档需要后端，默认 skip（主代理全量跑不受环境牵连）')
    const 请求 = await daKaiJiaJuQingQiu()
    const 身份 = await baoZhengCeShiZhangHao(请求)
    const 列 = await 请求.get('/api/聊天/会话', { headers: { Authorization: `Bearer ${身份.lingPai}` } })
    const 体 = await 列.json().catch(() => null)
    const 会话ID = String(体?.shu_ju?.[0]?.id ?? 体?.shu_ju?.lie_biao?.[0]?.id ?? '')
    expect(会话ID, `FP25G G3 前置：夹具账号无可用会话（HTTP ${列.status()}）`).toBeTruthy()
    await 请求.dispose()
    for (let i = 1; i <= 轮数; i += 1) await 跑一轮(browser, 'G3', 档.移动, '真', i, { 身份, 会话ID })
  })

  test('G4 帧门探针：rAF 延后 11000ms + 移动档，输入区仍须 20s 内出现（改回帧门控即红）', async ({ browser }) => {
    for (let i = 1; i <= 轮数; i += 1) await 跑一轮(browser, 'G4', 档.移动, '桩', i, { rAF延后: 帧门延后毫秒 })
  })

  test('汇总门禁：空白=0、空壳帧=0、冷加载组 p95 < 1500ms', async () => {
    const 空白轮 = 全部轮.filter((轮) => 轮.结果 === '空白')
    const 空壳轮 = 全部轮.filter((轮) => 轮.空壳帧 !== null)
    expect(
      { 空白: 空白轮.length, 空壳帧: 空壳轮.length, 计数 },
      `FP25G 空白轮=${空白轮.map((r) => `${r.组}#${r.序号}`).join(',')} 空壳帧轮=${空壳轮.map((r) => `${r.组}#${r.序号}`).join(',')}`,
    ).toEqual({ 空白: 0, 空壳帧: 0, 计数: expect.anything() })

    const 冷加载组 = Object.keys(计数).filter((组) => 组 !== 'G4')
    expect(冷加载组.length, 'FP25G 至少要有冷加载组跑过才有 p95 判据').toBeGreaterThan(0)
    for (const 组 of 冷加载组) {
      const 值 = 全部轮.filter((轮) => 轮.组 === 组 && 轮.输入区出现ms !== null).map((轮) => 轮.输入区出现ms as number)
      expect(值.length, `FP25G ${组} 输入区出现耗时读数缺失（记录器未采到＝判据不可证明）`).toBe(计数[组].总)
      expect(p95(值), `FP25G ${组} 输入区出现耗时 p95 ≥ ${p95上界毫秒}ms（首屏两帧门控回归的信号带）`).toBeLessThan(p95上界毫秒)
      console.log(`FP25G p95 ${组} = ${p95(值)}ms（n=${值.length}）`)
    }
    写证据('最终')
  })
})
