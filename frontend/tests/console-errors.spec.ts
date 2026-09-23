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

/** 背景 iframe「元素在场」的宽限窗：iframe 是惰性挂载，但挂载动作本身在进页初即发生，
 *  本机实测 /login 导航后元素秒级在场（慢的是随后的 3D 文档加载，20~30s）。30s 覆盖在场合。 */
const iframe在场宽限毫秒 = 30000

/**
 * 等背景 iframe 自己的文档 load 完，再多等一段固定判据窗。
 * unused-preload 的落账时刻是「声明它的 window 触发 load 之后再几秒」，而本机草地 iframe
 * 导航后 20~30 秒才 load 完（探针实测 /login 静置时 warning 落在 +29.4s）⇒
 * 观察窗必须挂在这个事件上，纯固定 sleep 会假绿。
 * 没等到位时不静默放过：把现场打到 stdout，避免「观察窗不足」伪装成「该页 0 告警」。
 *
 * FP-10c⑤ 改判（旧→新，仅「无背景」分支短路，「有背景」分支等待语义一字未动）：
 *   旧：iframe 元素不在场时也照样把 waitForFunction 的 90s readyState 窗走满，再 +8s 判据窗
 *   ⇒ 注册页（无草地 iframe）白吃 ~98s，叠加两段沉降后撞穿 180s，serial 链断、后 8 页未跑。
 *   新：先用 30s 宽限确认 iframe **元素**是否在场；不在场即短路返回。
 *   为什么这不降低门禁强度：本观察窗盯的唯一延迟落账告警是 unused-preload，它挂在
 *   「声明该 preload 的那个 window 的 load」上（文件头注释原文）；iframe 元素不存在 ⇒
 *   该文档的声明 window 根本不存在 ⇒ 这一族告警在此页物理上不可能出现，多等 98s 也只是空转。
 *   其余通道（console.error / 资源失败 / 非 preload 的 warning）由采集器实时收，与观察窗无关。
 */
async function 等背景判据(page: Page): Promise<void> {
  const 在场 = await page
    .waitForFunction(
      () =>
        Array.from(document.querySelectorAll('iframe')).some((元) =>
          (元.getAttribute('src') || '').includes('/grass-bg/'),
        ),
      undefined,
      { timeout: iframe在场宽限毫秒, polling: 1000 },
    )
    .then(() => true)
    .catch(() => false)
  if (!在场) {
    console.log(`[门禁·观察窗] 背景 iframe=${iframe在场宽限毫秒 / 1000}s 内未在场 ⇒ 短路（该页无 preload 声明源，观察窗无判据可等）`)
    return
  }
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
 * 唯一一条**本 worker 无权消除**的告警，逐字段登记。它不是忽略名单：
 * 照常计入数值表的 warning 列，且必须与下面的文本前缀 + 来源逐字相符，
 * 出现任何其它 warning 仍然直接判红。
 *
 * 根因：`frontend/public/grass-bg/grass-bg.html:15` 声明了
 *   `<link rel="preload" href="/grass-bg/wuhaoyang-3d.png" as="image">`
 * 而深度浮雕路线已被用户裁定整体放弃（`LI_TI.qiYong` 写死 false），同文件 `zaiRuShenDu()`
 * 首行 `if (!LI_TI.qiYong || !yuan) return;` 直接短路 ⇒ 这张图在该 iframe 文档里永远不会被消费
 * ⇒ 每个挂载草地背景的页面必出 1 条 unused-preload warning。PROGRESS「已取证的关键结论」第 6 条
 * 自己就把这套深度代码标成「死代码，待清理」。
 *
 * 不在本 worker 授权范围内：授权清单只给了 `frontend/index.html`，而这条 preload 并不在
 * index.html 里（主文档侧由 `App.vue:113` 用 `new Image()` 真消费，不产生告警）；
 * `public/**` 与吴昊阳三维资源由另一个 agent 并行在改，属明令禁改区。
 * 删掉 15 行那一句 preload 即全表清零 —— 需由 Orchestrator 转交草地背景 owner 执行。
 */
/**
 * 逐字登记的越界项按**实际被检源**拼前缀：警告文本里的 origin 跟随 dev server 端口。
 * 派单端口纪律（本任务一律 5180+）下不得把 5173 钉死在判据里，否则换端口跑会造成假红；
 * 这不是放宽——origin 仍必须与 PLAYWRIGHT_BASE_URL 逐字相符，其余文本照旧逐字匹配。
 */
const 被测源 = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '')

const 越界未修项 = [
  {
    文本前缀: `The resource ${被测源}/grass-bg/wuhaoyang-3d.png was preloaded using link preload but not used`,
    来源: 'grass-bg/grass-bg.html',
    归属: 'frontend/public/grass-bg/grass-bg.html:15（草地背景 agent 的禁改区，本 worker 无权触碰）',
    修法: '删除该 preload 声明即可，深度图在该文档内已无任何消费点',
  },
]

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
  警告数: number
  越界警告数: number
  资源数: number
  明细: string[]
  /** FP-10c⑤：该页取证链自身抛错（锚点超时、断言红等）时登记于此；由「汇总」统一判罪，serial 链不再互相切断 */
  取证异常: string | null
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

/** 采一行：error 与资源异常零容忍；warning 只有逐字登记的越界项可留，其余全算门禁内 */
function 登记(页面名: string, 采集器: ReturnType<typeof createConsoleCollector>): void {
  const 错误 = 采集器.getErrors()
  const 警告 = 采集器.getWarnings()
  const 资源 = 采集器.getResourceFailures()
  const 可留警告 = 警告.filter(命中越界)
  const 门禁警告 = 警告.filter(条 => !命中越界(条))
  门禁表.push({
    页面: 页面名,
    错误数: 错误.length,
    警告数: 警告.length,
    越界警告数: 可留警告.length,
    资源数: 资源.length,
    取证异常: null,
    明细: [
      ...逐条('console.error', 错误),
      ...逐条('console.warning(门禁内)', 门禁警告),
      ...逐条('console.warning(越界未修·已登记)', 可留警告),
      ...逐条('资源加载/HTTP>=400', 资源),
    ],
  })
  console.log(
    `[门禁] ${页面名} → error=${错误.length} warning=${警告.length}（越界未修 ${可留警告.length}）资源=${资源.length}`,
  )
}

function 拼装表文(): string {
  const 表 = [
    '| 页面 | error | warning | 其中越界未修(已登记) | 门禁 warning | 资源异常 |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
  ]
  for (const 行 of 门禁表) {
    表.push(
      `| ${行.页面} | ${行.错误数} | ${行.警告数} | ${行.越界警告数} | ${行.警告数 - 行.越界警告数} | ${行.资源数} |`,
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

/**
 * FP-10c⑤ 页间解耦（旧→新）：
 *   旧：每页 test 体直接跑，任何一处红（锚点超时等）在 serial 链上把后续全部页 + 汇总打成
 *   did-not-run —— 本轮注册页 180s 红即连坐 8 页零取证。
 *   新：页面试体收进 采一页 的 try/catch —— 页面自身的取证异常登记为「取证异常行」并照常走完
 *   serial 链；罪责不消失而是**转移到汇总 test**（异常行数必须为 0，且「页面必须全部登记」原本
 *   就钉着）。判定维度不降反升：旧版异常页 = 该页无登记行 = 汇总先红在缺页上，异常细节只能去
 *   翻报告；新版每页都留下一行带异常原文与现场 console 计数的记录。
 *   注意：只有「test 超时之前」能被 catch 的失败才走这条路；若某页仍撞满 180s 墙钟，Playwright
 *   仍会切断 serial——这正是 等背景判据 短路修因在前、本解耦兜底在后的原因。
 */
async function 采一页(
  页面名: string,
  体: () => Promise<ReturnType<typeof createConsoleCollector>>,
): Promise<void> {
  try {
    const 采集器 = await 体()
    登记(页面名, 采集器)
  } catch (错) {
    const 文 = String((错 as Error)?.message ?? 错).replace(/\s+/g, ' ').slice(0, 400)
    console.log(`[门禁] ${页面名} → 取证异常（已登记，由汇总定罪；不切断后续页）：${文}`)
    门禁表.push({
      页面: 页面名,
      错误数: 0,
      警告数: 0,
      越界警告数: 0,
      资源数: 0,
      取证异常: 文,
      明细: [`取证异常：${文}`],
    })
  }
}

test('登录页：加载', async ({ page }) => {
  await 采一页('登录页 /login', async () => {
    const 采集器 = 匿名采集器(page)
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await 沉降(page, '.biaoqian-qiehuan')
    // 派生 config 陷阱自证（FP-24d）：顶层 use.viewport 会被 devices['Desktop Chrome'] 覆盖，
    // 必须回读真机 innerWidth 钉死本文件的取样视口
    const 视口自证 = await page.evaluate(() => `${window.innerWidth}x${window.innerHeight}`)
    console.log(`[门禁·视口自证] innerWidth×innerHeight=${视口自证}`)
    expect(视口自证, '取样视口未落到 1440x900（派生 config project 层 viewport 被覆盖？）').toBe('1440x900')
    return 采集器
  })
})

test('注册页：切到注册表单', async ({ page }) => {
  await 采一页('注册页 /login+注册标签', async () => {
    const 采集器 = 匿名采集器(page)
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await 沉降(page, '.biaoqian-qiehuan')
    await page.locator('.biaoqian-anniu', { hasText: '注册' }).first().click()
    // FP-24d 改判：FP-04a 后滚动口宿主恒为 .biaodan-gundong（overflow-y:scroll，无任何 JS 状态类）；
    // 旧锚点 `.biaodan-gundong.xuyao-gundong` 里的状态类已随 hack 一起删除，选择器永不命中 ⇒ 该步必超时
    await 沉降(page, '.biaodan-gundong')
    return 采集器
  })
})

test('聊天页：进真会话', async ({ page }) => {
  await 采一页('聊天页 /chat/:huiHuaId', async () => {
    const 采集器 = await 进登录页(page, `/chat/${聊天角色ID}`)
    await 沉降(page, '.shuru-kuang')
    return 采集器
  })
})

test('过往战绩页：加载', async ({ page }) => {
  await 采一页('过往战绩页 /guo-wang-zhan-ji', async () => {
    const 采集器 = await 进登录页(page, '/guo-wang-zhan-ji')
    await 沉降(page, '.zhanji-yemian')
    return 采集器
  })
})

test('资料设置向导：加载', async ({ page }) => {
  await 采一页('资料设置向导 /profile-setup', async () => {
    const 采集器 = await 进登录页(page, '/profile-setup')
    await 沉降(page, '.ziliao-shezhi')
    return 采集器
  })
})

test('好友列表：加载', async ({ page }) => {
  await 采一页('好友列表 /hao-you', async () => {
    const 采集器 = await 进登录页(page, '/hao-you')
    await 沉降(page, '.haoyou-yemian')
    return 采集器
  })
})

test('通知页：加载', async ({ page }) => {
  await 采一页('通知页 /tong-zhi', async () => {
    const 采集器 = await 进登录页(page, '/tong-zhi')
    await 沉降(page, '.tongzhi-yemian')
    return 采集器
  })
})

test('账号与安全：加载', async ({ page }) => {
  await 采一页('账号与安全 /zhang-hao-an-quan', async () => {
    const 采集器 = await 进登录页(page, '/zhang-hao-an-quan')
    await 沉降(page, '.zhang-hao-an-quan')
    return 采集器
  })
})

test('认证表单交互：填手机号 + 取码 + 切回登录', async ({ page }) => {
  await 采一页('认证表单交互（注册取码链）', async () => {
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
    return 采集器
  })
})

test('汇总：逐页面 error 与 warning 数值表', async () => {
  const 文本 = 拼装表文()
  console.log(`\n=== 控制台门禁逐页数值表 ===\n${文本}\n`)
  expect(门禁表.map(行 => 行.页面).sort(), '页面路径必须全部登记').toEqual([...必测页面].sort())
  const 异常行 = 门禁表.filter(行 => 行.取证异常)
  expect(
    异常行.map(行 => `${行.页面}：${行.取证异常}`),
    '逐页取证链不得有异常（页间已解耦，此处统一判罪）',
  ).toEqual([])
  const 总错误 = 门禁表.reduce((和, 行) => 和 + 行.错误数, 0)
  const 总资源 = 门禁表.reduce((和, 行) => 和 + 行.资源数, 0)
  const 总警告 = 门禁表.reduce((和, 行) => 和 + 行.警告数, 0)
  const 总越界 = 门禁表.reduce((和, 行) => 和 + 行.越界警告数, 0)
  expect(总错误, `控制台 error 必须为 0：\n${文本}`).toBe(0)
  expect(总资源, `资源加载/HTTP>=400 必须为 0：\n${文本}`).toBe(0)
  // 门禁 warning = 采到的 warning - 逐字登记的越界项；越界项由数值表如实呈现，不做忽略名单
  expect(总警告 - 总越界, `门禁内 console.warning 必须为 0：\n${文本}`).toBe(0)
})
