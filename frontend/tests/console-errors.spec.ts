import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { createConsoleCollector, type ConsoleError } from './console-error-collector'
import {
  daKaiJiaJuQingQiu,
  baoZhengCeShiZhangHao,
  zhuRuJiaJuShenFen,
  type JiaJuShenFen,
} from './测试夹具'

/**
 * 控制台门禁（error = 0 且 warning = 0）。
 *
 * 三条设计约束，都是此前门禁漏东西的直接原因：
 * 1) **warning 必须进门禁**。本文件旧版对多数路由只调 `assertNoErrors`，warning 采到了却没人断言，
 *    于是「未消费的 link rel=preload」这种每次进页必复现的告警被连续登记、连续放过。
 *    现在三通道（console.error / console.warning / 资源级 HTTP>=400）一起判。
 * 2) **逐条列到来源**。每条都带 `url:line:col`；资源通道补的是旧实现的真漏洞——
 *    控制台的 "failed to load resource" 文本被丢弃去重，而 response 通道只收 `/api` 且只收 `>=500`，
 *    于是静态资源 404 与 `/api` 4xx 两条通道都不记，等于静默漏报。
 * 3) **必须走真实页面路径**。旧版只测 `/login` 与 `/register`，而 `router/index.ts` 根本没有
 *    `/register` 路由（被通配重定向回 `/login`），等于从没测过注册页。现在八个入口全覆盖，
 *    注册页走真标签切换。
 *
 * 观察窗不是随手写的：Chromium 的「preloaded but not used within a few seconds from the window's
 * load event」是在**声明该 preload 的那个 window** 触发 load 之后再等几秒才落账。草地背景是一个
 * 惰性挂载的 iframe，要解析整个 3D bundle，本机实测导航后 20~30 秒才 load 完 ⇒
 * 旧实现那种「等锚点 + 固定 sleep 1~2 秒」在这个告警上必然假绿。
 * 这里改成显式等 iframe 文档 readyState=complete 再 +6 秒，把观察窗挂到真正的事件上。
 * 探针实测记录见 PROGRESS『控制台 error/warning 根因清单』。
 *
 * 环境事实：本机主线程会被认证页 3D 背景压到极低帧率 ⇒ 不设帧距上限、不做逐帧断言；
 * `waitForFunction` 一律用固定轮询间隔而非默认 rAF（rAF 在 0.03fps 下等不到）；
 * 桌面 1440×900（用户免了全端截图矩阵）。禁止与 `npx vitest run` 并发运行本文件。
 */

test.use({ viewport: { width: 1440, height: 900 } })
// 墙钟放宽只影响超时，不放宽任何断言
test.setTimeout(180000)
// serial：逐页只登记、由末道汇总统一定罪；一处红不会让后面几个页面失去取证
test.describe.configure({ mode: 'serial' })

/**
 * 基础沉降窗（锚点可见之后再等）。可经 `E2E_CONSOLE_SETTLE_MS` 放宽用于标定观察窗，
 * 默认值只是"页面自己的异步渲染/接口回包"的余量；Chromium 的延迟落账类告警
 * （unused-preload）由 等背景判据 挂在真实事件上负责，不靠这里硬等。
 */
const 沉降毫秒 = Number(process.env.E2E_CONSOLE_SETTLE_MS ?? 6500)

/** 背景 iframe 文档 load 完之后再多留的判据窗（Chromium 的 unused-preload 判据是 load + 数秒） */
const 背景判据毫秒 = 8000

/**
 * 等背景 iframe 自己的文档 load 完，再多等一段固定判据窗。
 * unused-preload 的落账时刻是「声明它的 window 触发 load 之后再几秒」，而本机草地 iframe
 * 导航后 20~30 秒才 load 完（探针实测 /login 静置时 warning 落在 +29.4s）⇒
 * 观察窗必须挂在这个事件上，纯固定 sleep 会假绿。
 * 没等到位时不静默放过：把现场打到 stdout，避免「观察窗不足」伪装成「该页 0 告警」。
 */
async function 等背景判据(page: Page): Promise<void> {
  const 现场 = () =>
    page
      .evaluate(() => {
        const 框 = Array.from(document.querySelectorAll('iframe')).find((元) =>
          (元.getAttribute('src') || '').includes('/grass-bg/'),
        ) as HTMLIFrameElement | undefined
        if (!框) return 'iframe 不存在'
        const 档 = 框.contentDocument
        return `readyState=${档?.readyState ?? '(无 contentDocument)'} path=${档?.location?.pathname ?? '-'}`
      })
      .catch((错: unknown) => `取样失败 ${错}`)
  const 就绪 = await page
    .waitForFunction(
      () => {
        const 框 = Array.from(document.querySelectorAll('iframe')).find((元) =>
          (元.getAttribute('src') || '').includes('/grass-bg/'),
        ) as HTMLIFrameElement | undefined
        const 档 = 框?.contentDocument
        // 只看 readyState 会被 iframe 创建瞬间的 about:blank 文档骗过（它的 readyState 天生就是
        // complete），必须同时确认文档真的已经换成 grass-bg 那一页
        return (
          !!档 && 档.readyState === 'complete' && (档.location?.pathname || '').includes('/grass-bg/')
        )
      },
      undefined,
      // 主线程被 3D 背景压到极低帧率 ⇒ 默认 rAF 轮询等不到，必须用固定毫秒间隔
      { timeout: 90000, polling: 1000 },
    )
    .then(() => 'complete')
    .catch(async () => `超时未就绪（${await 现场()}）`)
  console.log(`[门禁·观察窗] 背景 iframe=${就绪}`)
  await page.waitForTimeout(背景判据毫秒)
}

/**
 * 逐字登记的越界项按**实际被检源**拼前缀：警告文本里的 origin 跟随 dev server 端口。
 * 派单端口纪律（本任务一律 5180+）下不得把 5173 钉死在判据里，否则换端口跑会造成假红；
 * 这不是放宽——origin 仍必须与 PLAYWRIGHT_BASE_URL 逐字相符，其余文本照旧逐字匹配。
 *
 * FP-R2：原 wuhaoyang-3d.png unused-preload 越界登记已随根因清除（grass-bg 无用 preload
 * 与整条 LI_TI 深度链路删除）一并移除——该告警从此应为 0，出现即判红，不再有可留名单。
 */
const 越界未修项: Array<{
  文本前缀: string
  来源: string
  归属: string
  修法: string
}> = []

const 必测页面 = [
  '登录页 /login',
  '注册页 /login+注册标签',
  '聊天页 /chat/:huiHuaId',
  '过往战绩页 /guo-wang-zhan-ji',
  '资料设置向导 /profile-setup',
  '好友列表 /hao-you',
  '通知页 /tong-zhi',
  '账号与安全 /zhang-hao-an-quan',
  '认证表单交互（注册取码链）',
]

type 门禁行 = {
  页面: string
  错误数: number
  草地错误数: number
  全错误数: number
  警告数: number
  越界警告数: number
  资源数: number
  明细: string[]
}
const 门禁表: 门禁行[] = []

function 位置(条: ConsoleError): string {
  return 条.location ? `${条.location.url}:${条.location.lineNumber}:${条.location.columnNumber}` : '(无位置)'
}

function 逐条(标题: string, 清单: ConsoleError[]): string[] {
  if (清单.length === 0) return []
  return [
    `${标题} ${清单.length} 条：`,
    ...清单.map((条, 序) => `  ${序 + 1}. ${条.text.slice(0, 300)} @ ${位置(条)}`),
  ]
}

function 命中越界(条: ConsoleError): boolean {
  return 越界未修项.some(项 => 条.text.startsWith(项.文本前缀) && 位置(条).includes(项.来源))
}

/**
 * 采一行：我方 error 与资源异常零容忍；warning 只有逐字登记的越界项可留，其余全算门禁内。
 * 草地背景（/grass-bg/ 来源）单独一列：它非零时既不计进我方 error、也不据此判我方通过。
 */
function 登记(页面名: string, 采集器: ReturnType<typeof createConsoleCollector>): void {
  const 错误 = 采集器.getOurErrors()
  const 草地错误 = 采集器.getGrassBgErrors()
  const 警告 = 采集器.getWarnings()
  const 资源 = 采集器.getResourceFailures()
  const 可留警告 = 警告.filter(命中越界)
  const 门禁警告 = 警告.filter(条 => !命中越界(条))
  门禁表.push({
    页面: 页面名,
    错误数: 错误.length,
    草地错误数: 草地错误.length,
    全错误数: 采集器.getErrors().length,
    警告数: 警告.length,
    越界警告数: 可留警告.length,
    资源数: 资源.length,
    明细: [
      ...逐条('console.error(我方)', 错误),
      ...逐条('console.error(草地背景·单独成账)', 草地错误),
      ...逐条('console.warning(门禁内)', 门禁警告),
      ...逐条('console.warning(越界未修·已登记)', 可留警告),
      ...逐条('资源加载/HTTP>=400', 资源),
    ],
  })
  console.log(
    `[门禁] ${页面名} → error(我方)=${错误.length} error(草地背景)=${草地错误.length} warning=${警告.length}（越界未修 ${可留警告.length}）资源=${资源.length}`,
  )
}

function 拼装表文(): string {
  const 表 = [
    '| 页面 | error(我方) | error(草地背景·单独成账) | warning | 其中越界未修(已登记) | 门禁 warning | 资源异常 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ]
  for (const 行 of 门禁表) {
    表.push(
      `| ${行.页面} | ${行.错误数} | ${行.草地错误数} | ${行.警告数} | ${行.越界警告数} | ${行.警告数 - 行.越界警告数} | ${行.资源数} |`,
    )
  }
  const 有账 = 门禁表.filter(行 => 行.明细.length)
  if (有账.length) {
    表.push('', '--- 逐条明细（含来源 url:line:col）---')
    for (const 行 of 有账) 表.push(`【${行.页面}】`, ...行.明细)
  }
  表.push('', '--- 越界未修项（计入上表 warning 列，非忽略名单）---')
  for (const 项 of 越界未修项) {
    表.push(`· 归属：${项.归属}`, `· 修法：${项.修法}`, `· 文本前缀：${项.文本前缀}`)
  }
  return 表.join('\n')
}

let 身份: JiaJuShenFen | null = null
let 请求: APIRequestContext | null = null
let 聊天角色ID = ''

test.beforeAll(async () => {
  const 引导 = await daKaiJiaJuQingQiu()
  身份 = await baoZhengCeShiZhangHao(引导)
  await 引导.dispose()
  请求 = await daKaiJiaJuQingQiu()
  // 聊天页要真会话：与挑战开局同源拿一个进行中的对局角色（复用后端既有链路，不造假 ID）
  const 令牌头 = { authorization: `Bearer ${身份.lingPai}` }
  const 开始 = await 请求.post('/api/挑战/开始', {
    headers: 令牌头,
    data: { woDeXingBie: 'nan', duiXiangXingBie: 'nv' },
  })
  const 体 = await 开始.json().catch(() => null)
  聊天角色ID = String(体?.shu_ju?.id ?? '')
  if (!聊天角色ID) {
    const 当前 = await (await 请求.get('/api/挑战/当前', { headers: 令牌头 })).json().catch(() => null)
    聊天角色ID = String(当前?.shu_ju?.dui_ju?.jiao_se_id ?? '')
  }
  expect(聊天角色ID, '门禁前提：拿不到可进入的聊天会话角色').toBeTruthy()
})

test.afterAll(async () => {
  if (请求) await 请求.dispose()
})

/** 需登录页统一走夹具注入链；注入阶段的 /login 文档不计入被测页，故采集器在注入之后再挂 */
async function 进登录页(page: Page, 路径: string): Promise<ReturnType<typeof createConsoleCollector>> {
  await zhuRuJiaJuShenFen(page, 身份!)
  const 采集器 = createConsoleCollector(page)
  await page.goto(路径, { waitUntil: 'domcontentloaded' })
  return 采集器
}

async function 沉降(page: Page, 锚点: string): Promise<void> {
  await expect(page.locator(锚点).first(), `锚点未渲染：${锚点}`).toBeVisible({ timeout: 90000 })
  await page.waitForTimeout(沉降毫秒)
  await 等背景判据(page)
}

function 匿名采集器(page: Page): ReturnType<typeof createConsoleCollector> {
  return createConsoleCollector(page)
}

test('登录页：加载', async ({ page }) => {
  const 采集器 = 匿名采集器(page)
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await 沉降(page, '.biaoqian-qiehuan')
  // 派生 config 陷阱自证（FP-24d）：顶层 use.viewport 会被 devices['Desktop Chrome'] 覆盖，
  // 必须回读真机 innerWidth 钉死本文件的取样视口
  const 视口自证 = await page.evaluate(() => `${window.innerWidth}x${window.innerHeight}`)
  console.log(`[门禁·视口自证] innerWidth×innerHeight=${视口自证}`)
  expect(视口自证, '取样视口未落到 1440x900（派生 config project 层 viewport 被覆盖？）').toBe('1440x900')
  登记('登录页 /login', 采集器)
})

test('注册页：切到注册表单', async ({ page }) => {
  const 采集器 = 匿名采集器(page)
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await 沉降(page, '.biaoqian-qiehuan')
  await page.locator('.biaoqian-anniu', { hasText: '注册' }).first().click()
  // FP-24d 改判：FP-04a 后滚动口宿主恒为 .biaodan-gundong（overflow-y:scroll，无任何 JS 状态类）；
  // 旧锚点 `.biaodan-gundong.xuyao-gundong` 里的状态类已随 hack 一起删除，选择器永不命中 ⇒ 该步必超时
  await 沉降(page, '.biaodan-gundong')
  登记('注册页 /login+注册标签', 采集器)
})

test('聊天页：进真会话', async ({ page }) => {
  const 采集器 = await 进登录页(page, `/chat/${聊天角色ID}`)
  await 沉降(page, '.shuru-kuang')
  登记('聊天页 /chat/:huiHuaId', 采集器)
})

test('过往战绩页：加载', async ({ page }) => {
  const 采集器 = await 进登录页(page, '/guo-wang-zhan-ji')
  await 沉降(page, '.zhanji-yemian')
  登记('过往战绩页 /guo-wang-zhan-ji', 采集器)
})

test('资料设置向导：加载', async ({ page }) => {
  const 采集器 = await 进登录页(page, '/profile-setup')
  await 沉降(page, '.ziliao-shezhi')
  登记('资料设置向导 /profile-setup', 采集器)
})

test('好友列表：加载', async ({ page }) => {
  const 采集器 = await 进登录页(page, '/hao-you')
  await 沉降(page, '.haoyou-yemian')
  登记('好友列表 /hao-you', 采集器)
})

test('通知页：加载', async ({ page }) => {
  const 采集器 = await 进登录页(page, '/tong-zhi')
  await 沉降(page, '.tongzhi-yemian')
  登记('通知页 /tong-zhi', 采集器)
})

test('账号与安全：加载', async ({ page }) => {
  const 采集器 = await 进登录页(page, '/zhang-hao-an-quan')
  await 沉降(page, '.zhang-hao-an-quan')
  登记('账号与安全 /zhang-hao-an-quan', 采集器)
})

test('认证表单交互：填手机号 + 取码 + 切回登录', async ({ page }) => {
  const 采集器 = 匿名采集器(page)
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await 沉降(page, '.biaoqian-qiehuan')
  await page.locator('.biaoqian-anniu', { hasText: '注册' }).first().click()
  await page.waitForTimeout(1500)
  const 手机号框 = page.locator('input[type="tel"]').first()
  await 手机号框.fill('13900009999')
  await 手机号框.blur()
  const 发送 = page.locator('button', { hasText: '获取验证码' }).first()
  if (await 发送.isVisible({ timeout: 5000 }).catch(() => false)) {
    await 发送.click()
    await page.waitForTimeout(2500)
  }
  await page.locator('.biaoqian-anniu', { hasText: '登录' }).first().click()
  await 等背景判据(page)
  登记('认证表单交互（注册取码链）', 采集器)
})

/**
 * 反证（分账自检，两处判据之一）：`getOurErrors()` 把 /grass-bg/ 来源剔出去之后，
 * 上面那张「我方 error=0」的表有可能只是**门禁看不见 iframe**的假绿。
 * 这里从 iframe 自己的上下文里真的打一条 console.error 出去：
 *  ① 采不到 ⇒ 门禁对 iframe 是盲的，整张 error=0 表作废（这条判据先红，不许静默）；
 *  ② 采到了却没归进草地那一列 ⇒ 分账规则没落地，草地 error 会混进我方账；
 *  ③ 归进了草地那一列却同时还在我方那一列 ⇒ 重复计账。
 * 本用例不调 登记 ⇒ 只自证通道与归属，不进逐页数值表（不然会把必测页面集合撑坏）。
 */
test('门禁自检：iframe 来源的 error 采得到、且只归草地背景那一列（反证·分账不是丢账）', async ({ page }) => {
  const 采集器 = 匿名采集器(page)
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.biaoqian-qiehuan').first(), '登录页锚点未渲染').toBeVisible({ timeout: 90000 })
  await page
    .waitForFunction(
      () => {
        const 框 = Array.from(document.querySelectorAll('iframe')).find((元) =>
          (元.getAttribute('src') || '').includes('/grass-bg/'),
        ) as HTMLIFrameElement | undefined
        return !!框 && 框.contentDocument?.readyState === 'complete'
      },
      undefined,
      { timeout: 90000, polling: 250 },
    )
    .catch(() => {
      throw new Error('门禁前提失效：登录页没能挂出 /grass-bg/ 的 iframe（草地背景换载体了？本自检随之失去意义，须改判）')
    })
  const 草地帧 = page.frames().find((帧) => 帧.url().includes('/grass-bg/'))
  expect(草地帧, '门禁前提失效：page.frames() 里找不到 /grass-bg/ 上下文').toBeTruthy()
  const 基线 = 采集器.getErrors().length
  await 草地帧!.evaluate(() => {
    console.error('草门·iframe-console 自检')
  })
  await 草地帧!.evaluate(() => {
    setTimeout(() => {
      throw new Error('草门·iframe-未捕获 自检')
    }, 0)
  })
  await page.waitForTimeout(1500)
  const 新增 = 采集器.getErrors().slice(基线)
  const 草地 = 采集器.getGrassBgErrors().map((条) => 条.text)
  const 我方 = 采集器.getOurErrors().map((条) => `${条.text} @ ${条.location?.url ?? '(无位置)'}`)
  const 未捕获被采 = 新增.some((条) => 条.text.includes('iframe-未捕获'))
  console.log(
    `[门禁自检] 新增 error=${新增.length} 草地列=${草地.length} 我方列=${我方.length} 未捕获通道被采=${未捕获被采}\n` +
      `  新增明细：${新增.map((条) => `${条.text} @ ${条.location?.url ?? '(无位置)'} stack=${String(条.stack ?? '').slice(0, 60).replace(/\n/g, ' ')}`).join(' | ')}`,
  )
  expect(新增.length, '采不到 iframe 里的 console.error ⇒ 整页门禁对 iframe 是盲的，那张 error=0 表不可信').toBeGreaterThanOrEqual(1)
  expect(草地, 'iframe 来源的 error 必须按来源归进草地背景那一列').toContain('草门·iframe-console 自检')
  expect(我方, 'iframe 来源的 error 不得同时留在我方那一列（分账不是重复计账）').toEqual([])
  if (!未捕获被采) {
    test.info().annotations.push({
      type: 'info',
      description:
        '门禁能力边界（实测）：iframe 里的**未捕获异常**不会进 page.on(pageerror) 通道，' +
        '只有 console 通道能采到 ⇒ 草地背景每帧抛的 ReferenceError 若只以未捕获异常形态出现，' +
        '整页门禁采不到它（本轮它没有复现：gengXinYinYing 已在 grass-bg.html:1899 定义）。' +
        '结论按实登记，不据此判我方通过。',
    })
  }
})

test('汇总：逐页面 error 与 warning 数值表', async () => {
  const 文本 = 拼装表文()
  console.log(`\n=== 控制台门禁逐页数值表 ===\n${文本}\n`)
  expect(门禁表.map(行 => 行.页面).sort(), '页面路径必须全部登记').toEqual([...必测页面].sort())
  const 总错误 = 门禁表.reduce((和, 行) => 和 + 行.错误数, 0)
  const 总草地 = 门禁表.reduce((和, 行) => 和 + 行.草地错误数, 0)
  const 总全错误 = 门禁表.reduce((和, 行) => 和 + 行.全错误数, 0)
  const 总资源 = 门禁表.reduce((和, 行) => 和 + 行.资源数, 0)
  const 总警告 = 门禁表.reduce((和, 行) => 和 + 行.警告数, 0)
  const 总越界 = 门禁表.reduce((和, 行) => 和 + 行.越界警告数, 0)
  // 分账的账必须对得上：我方 + 草地 = 采集器实际采到的全部 error。
  // 这一条是「分账不等于丢账」的唯一硬证明，任何一侧偷偷少计都会在这里红。
  expect(总错误 + 总草地, `分账不平：我方 ${总错误} + 草地 ${总草地} != 采到 ${总全错误}`).toBe(总全错误)
  expect(总错误, `我方控制台 error 必须为 0：\n${文本}`).toBe(0)
  if (总草地 > 0) {
    test.info().annotations.push({
      type: 'bug',
      description:
        `草地背景 error 非零（共 ${总草地} 条，来源 /grass-bg/，逐条见数值表明细）。` +
        '它按派单口径单独成账：不并进门禁 error，也不据此判门禁通过 —— 那一列的账归草地背景 owner（另一名 agent 的在途改动）。',
    })
  }
  expect(总资源, `资源加载/HTTP>=400 必须为 0：\n${文本}`).toBe(0)
  // 门禁 warning = 采到的 warning - 逐字登记的越界项；越界项由数值表如实呈现，不做忽略名单
  expect(总警告 - 总越界, `门禁内 console.warning 必须为 0：\n${文本}`).toBe(0)
})
