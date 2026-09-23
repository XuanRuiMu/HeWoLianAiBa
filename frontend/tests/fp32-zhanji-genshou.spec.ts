import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { baoZhengCeShiZhangHao, daKaiJiaJuQingQiu, zhuRuJiaJuShenFen, type JiaJuShenFen } from './测试夹具'

/**
 * FP-32：`过往战绩` 拖拽「指针位移 == 卡片位移」同源守卫。
 *
 * 立单由头：fp11 场景E 的比值门禁两次实跑同为 0.892。定性结论（逐点表见本件写出的证据文件）：
 * **0.892 = 116/130** ——旧取样器写 `y -= 再移`，`y` 从卡中心起算，没接住起手探针那 14px，
 * 第二段指针实走 116px 而分母写名义 130 ⇒ 比值恒为算术常量 0.892307…，与负载无关（所以两次同值）。
 * 鬼影自身在同样参数下走 130.00px（矩阵 f：-14 → -144.001），产品侧 1:1 成立 ⇒ 只改取样器，
 * 不给比值乘补偿系数，也不碰 `过往战绩.vue` 的拖拽几何。
 *
 * 本件把三件事钉成机判：
 *  ① 逐点：每一步鬼影位移 = 该步指针位移（±1px），累计比值落在 ±3% 内（与场景E 同带宽，不放宽）；
 *  ② 分解：`getBoundingClientRect().top` == 内联 top + 矩阵 f − 页滚动（证明量的是鬼影**自身**盒，
 *     不吃内层 rotate/scale 的外扩），且祖先链累计缩放 a/d 恒为 1（F9「位移被库归一化吃掉」的端到端钉）；
 *  ③ 同源：`.zhanji-kapian.sortable-drag` 命中数恒 1、恒为 `document.body` 直属子、
 *     全程同一个元素（页内打身份标记后复验）——排除「拖影与占位/真卡片不同源」这一类。
 * 边界覆盖：跨半行 / 贴边（触发库自动滚动的容器上沿）/ 列表滚动中途。
 *
 * 数据面：FP32-0/FP32-2 用 page.route 桩 `/api/战绩/列表`（卡片高度与页数固定，红因不漂移）；
 * FP32-1 用真实夹具账号数据，逐项复刻场景E 的参数（nth(1)、14px 探针、130px 段、固定 400ms），
 * 用来证明「同参数 + 正确分母 ⇒ 1.000」，即红在取样器而不是数据。
 * 禁与 `npx vitest run` 并发（同 fp11 口径）。
 */

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
/** worktree 深度不固定（主树与 `.wt/laneD` 的相对层数不同），证据目录一律可 env 覆盖 */
const 证据目录 =
  process.env.FP32_EVIDENCE_DIR ?? path.resolve(本目录, '../../../../.agents/evidence/traces')
const 后缀 = process.env.FP32_SUFFIX ? `-${process.env.FP32_SUFFIX}` : ''
const 证据文件 = path.resolve(证据目录, `FP-32-逐点跟手${后缀}-20260923.md`)
const 视口 = { width: 1440, height: 900 }
const 卡片数 = 8
/** 与场景E 同带宽：跟手比值 1.0 ±3% */
const 比值下限 = 0.97
const 比值上限 = 1.03

function 构造档案(index: number) {
  return {
    id: `fp32-ko-${index}`,
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

interface 读数 {
  有鬼: boolean
  命中数: number
  是body子: boolean
  身份标记: string
  联合顶: number
  自身顶: number
  内层顶: number
  内层高: number
  外层a: number
  外层d: number
  祖先a: number
  祖先d: number
  内层角: number
  内层缩: number
  外层矩阵: string
  内联顶: string
  定位方式: string
  指针Y: number
  页滚动: number
  容器滚动: number
  容器顶: number
  视觉缩放: number
}

/** 一次往返取全部：鬼影自身盒 / 内层视觉盒 / 祖先累计缩放 / 页内实测指针位 */
const 读鬼 = (page: Page) =>
  page.evaluate(() => {
    const 圆 = (n: number) => Math.round(n * 100) / 100
    const 列 = Array.from(document.querySelectorAll<HTMLElement>('.zhanji-kapian.sortable-drag'))
    const g = 列[0] ?? null
    const 容 = document.querySelector('.zhanji-liebiao') as HTMLElement | null
    const 指针Y = (window as unknown as { __fp32Y?: number }).__fp32Y ?? -1
    const 页滚动 = 圆(document.documentElement.scrollTop)
    const 容器滚动 = 容 ? 圆(容.scrollTop) : -1
    const 容器顶 = 容 ? 圆(容.getBoundingClientRect().top) : -1
    const 视觉缩放 = window.visualViewport ? 圆(window.visualViewport.scale) : -1
    const 解 = (串: string) => {
      const m = /^matrix\(([^)]+)\)$/.exec(串)
      if (!m) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
      const n = m[1].split(',').map((s) => parseFloat(s.trim()))
      return { a: n[0], b: n[1], c: n[2], d: n[3], e: n[4], f: n[5] }
    }
    if (!g) {
      return {
        有鬼: false,
        命中数: 列.length,
        是body子: false,
        身份标记: '(无)',
        联合顶: 0,
        自身顶: 0,
        内层顶: 0,
        内层高: 0,
        外层a: 1,
        外层d: 1,
        祖先a: 1,
        祖先d: 1,
        内层角: 0,
        内层缩: 1,
        外层矩阵: '',
        内联顶: '',
        定位方式: '',
        指针Y,
        页滚动,
        容器滚动,
        容器顶,
        视觉缩放,
      }
    }
    if (!g.dataset.fp32) g.dataset.fp32 = '首帧'
    const 内 = g.firstElementChild as HTMLElement | null
    const m = 解(getComputedStyle(g).transform)
    const 内m = 解(内 ? getComputedStyle(内).transform : '')
    // 祖先累计缩放：库把指针增量除以「鬼影 + 祖先」累计矩阵的 a/d（sortablejs getDOMMatrix(el, true)），
    // 这条链上任何一处 scale 都会让卡片只走指针位移的 1/scale（F9），与内层装饰倾斜无关。
    let 祖a = 1
    let 祖d = 1
    for (let 游 = g.parentElement; 游; 游 = 游.parentElement) {
      const z = 解(getComputedStyle(游).transform)
      祖a *= z.a
      祖d *= z.d
    }
    const 顶 = 圆(g.getBoundingClientRect().top)
    return {
      有鬼: true,
      命中数: 列.length,
      是body子: g.parentElement === document.body,
      身份标记: g.dataset.fp32,
      联合顶: 顶,
      自身顶: 圆(
        (parseFloat(g.style.top) || 0) +
          m.f -
          (getComputedStyle(g).position === 'fixed' ? 0 : 页滚动),
      ),
      内层顶: 内 ? 圆(内.getBoundingClientRect().top) : -1,
      内层高: 内 ? 圆(内.getBoundingClientRect().height) : -1,
      外层a: 圆(m.a),
      外层d: 圆(m.d),
      祖先a: 圆(祖a),
      祖先d: 圆(祖d),
      内层角: 圆((Math.atan2(内m.b, 内m.a) * 180) / Math.PI),
      内层缩: 圆(Math.hypot(内m.a, 内m.b)),
      外层矩阵: getComputedStyle(g).transform,
      内联顶: g.style.top,
      定位方式: getComputedStyle(g).position,
      指针Y,
      页滚动,
      容器滚动,
      容器顶,
      视觉缩放,
    }
  })

async function 打桩战绩(page: Page): Promise<void> {
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
}

async function 进战绩页(page: Page, 身份: JiaJuShenFen, 桩: boolean): Promise<void> {
  if (桩) await 打桩战绩(page)
  await page.addInitScript(() => localStorage.setItem('主题', '浅色'))
  await page.addInitScript(() => {
    window.addEventListener(
      'mousemove',
      (事) => {
        ;(window as unknown as { __fp32Y?: number }).__fp32Y = Math.round(事.clientY * 100) / 100
      },
      { capture: true },
    )
  })
  await zhuRuJiaJuShenFen(page, 身份)
  await page.goto('/guo-wang-zhan-ji', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.zhanji-kapian').first()).toBeVisible({ timeout: 90000 })
  await page.waitForTimeout(2500)
}

/** 收敛等待：连续两次读数差 < 阈值即到位（与帧率无关；本环境主线程可被压到个位数 fps） */
async function 等收敛(page: Page, 上限 = 6000): Promise<读数> {
  const 始 = Date.now()
  let 上 = await 读鬼(page)
  for (;;) {
    await page.waitForTimeout(60)
    const 本 = await 读鬼(page)
    if (Math.abs(本.联合顶 - 上.联合顶) < 0.5) return 本
    上 = 本
    if (Date.now() - 始 > 上限) return 本
  }
}

function 表(标题: string, 行: Record<string, string | number>[]): string {
  if (行.length === 0) return `${标题}：（无行）\n`
  const 键 = Object.keys(行[0])
  return (
    `## ${标题}\n\n| ${键.join(' | ')} |\n|${键.map(() => ' --- ').join('|')}|\n` +
    行.map((项) => `| ${键.map((k) => String(项[k])).join(' | ')} |\n`).join('') +
    '\n'
  )
}

const 差 = (a: number, b: number) => Math.round((a - b) * 100) / 100
const 比 = (a: number, b: number) => Math.round((a / b) * 10000) / 10000
/** Chromium 把派发进来的鼠标坐标落到整数 CSS px（实测 82.8 → 82），名义步长一律取整 */
const 整 = (n: number) => Math.round(n)

let 身份: JiaJuShenFen

test.describe.configure({ mode: 'sequential' })

test.beforeAll(async () => {
  fs.mkdirSync(证据目录, { recursive: true })
  fs.writeFileSync(
    证据文件,
    [
      `# FP-32 过往战绩拖拽逐点跟手取证-${new Date().toISOString()}`,
      `<!-- run:${process.env.FP32_SUFFIX ?? 'default'} -->`,
      `视口 ${视口.width}×${视口.height}；FP32-0/FP32-2 的 /api/战绩/列表 由 page.route 桩为 ${卡片数} 张同组胜利档案（拖拽机制只依赖 DOM，桩数据不改变被测行为），FP32-1 用真实夹具数据复刻场景E 参数。`,
      '手法：位移一律「两收敛点求差」+ 页内 mousemove 自报指针位，与帧率无关；比值分母取页内实测指针位移，不取名义步长（0.892 的根因正是分母取名义值）。',
      '',
    ].join('\n'),
    'utf8',
  )
  const 请求 = await daKaiJiaJuQingQiu()
  身份 = await baoZhengCeShiZhangHao(请求)
  await 请求.dispose()
})

/** 预滚到 值 后，取「最后一张中心距容器可视顶 ≥ 需下距 且仍在视口内」的卡：滚动中途/贴边两段用它选起点 */
async function 选卡(page: Page, 预滚: number, 需下距: number) {
  await page.evaluate((值) => {
    ;(document.querySelector('.zhanji-liebiao') as HTMLElement).scrollTop = 值
  }, 预滚)
  await page.waitForTimeout(400)
  return page.evaluate((需) => {
    const 列 = Array.from(document.querySelectorAll<HTMLElement>('.zhanji-liebiao .zhanji-kapian'))
    const 容 = document.querySelector('.zhanji-liebiao') as HTMLElement
    const 容顶 = Math.round(容.getBoundingClientRect().top * 100) / 100
    for (let i = 列.length - 1; i >= 0; i--) {
      const r = 列[i].getBoundingClientRect()
      const 中心 = Math.round((r.y + r.height / 2) * 100) / 100
      if (中心 - 容顶 >= 需 && 中心 < window.innerHeight - 20) return { 序: i, 中心, 容顶 }
    }
    return { 序: -1, 中心: 0, 容顶 }
  }, 需下距)
}

/** 起手：按下序号卡中心，先走 14px 探针激活鬼影；终点必须在容器可视上沿之下 余量下限 px 处 */
async function 起手于(page: Page, 序号: number, 上拖距离: number, 余量下限: number, 预滚: number | null) {
  const 卡 = page.locator('.zhanji-liebiao .zhanji-kapian').nth(序号)
  if (预滚 === null) {
    await 卡.scrollIntoViewIfNeeded()
  } else {
    await page.evaluate((值) => {
      ;(document.querySelector('.zhanji-liebiao') as HTMLElement).scrollTop = 值
    }, 预滚)
    await page.waitForTimeout(400)
  }
  const 盒 = (await 卡.boundingBox())!
  const 容顶 = await page.evaluate(
    () => Math.round(document.querySelector('.zhanji-liebiao')!.getBoundingClientRect().top * 100) / 100,
  )
  const x = 整(盒.x + 盒.width / 2)
  const 中心 = 整(盒.y + 盒.height / 2)
  const 终点 = 中心 - 14 - 上拖距离
  expect(
    终点 - 容顶,
    `取样前提：${序号} 号卡上拖 ${上拖距离}px 后指针落在 ${终点}，容器可视顶 ${容顶}，余量不足 ${余量下限}px`,
  ).toBeGreaterThanOrEqual(余量下限)
  expect(中心, `取样前提：起手卡片中心 ${中心} 不在视口内`).toBeLessThan(视口.height - 20)
  await page.mouse.move(x, 中心)
  await page.mouse.down()
  await page.mouse.move(x, 中心 - 14, { steps: 5 })
  await page.waitForTimeout(400)
  await 等收敛(page)
  const 零 = await 读鬼(page)
  expect(零.有鬼, '取样前提：拖拽未激活（页内无 .zhanji-kapian.sortable-drag）').toBe(true)
  expect(零.命中数, `取样前提：鬼影命中 ${零.命中数} 个，不唯一`).toBe(1)
  expect(零.是body子, '取样前提：鬼影不是 document.body 直属子（量的不是跟随指针的那一个）').toBe(true)
  return { x, 中心, 零 }
}

function 钉同源(读: 读数, 名: string) {
  expect(读.有鬼, `${名}：鬼影中途消失（拖拽被打断）`).toBe(true)
  expect(读.命中数, `${名}：鬼影命中数 ${读.命中数} ≠ 1（拖影与占位/真卡片不同源）`).toBe(1)
  expect(读.是body子, `${名}：鬼影脱离 document.body 直属层（被换成列表内元素）`).toBe(true)
  expect(读.身份标记, `${名}：鬼影被替换成另一个元素（身份标记丢失）`).toBe('首帧')
  expect(读.外层a, `${名}：鬼影外层矩阵 a=${读.外层a}，平移通道被掺进缩放`).toBe(1)
  expect(读.外层d, `${名}：鬼影外层矩阵 d=${读.外层d}，平移通道被掺进缩放`).toBe(1)
  expect(读.祖先a, `${名}：祖先累计缩放 a=${读.祖先a}，库会把指针增量除以它（F9）`).toBe(1)
  expect(读.祖先d, `${名}：祖先累计缩放 d=${读.祖先d}，库会把指针增量除以它（F9）`).toBe(1)
  expect(
    ['absolute', 'fixed'],
    `${名}：鬼影计算定位方式是「${读.定位方式}」，不在库的 fallback 挂点形态内（fallback-on-body 变了）`,
  ).toContain(读.定位方式)
  expect(
    Math.abs(差(读.联合顶, 读.自身顶)),
    `${名}：getBoundingClientRect().top=${读.联合顶} 与「内联 top + 矩阵 f − 页滚动」=${读.自身顶} 不等值 ⇒ 取样吃进了非自身盒的外扩（内层倾斜/祖先缩放污染）`,
  ).toBeLessThanOrEqual(0.5)
}

test('FP32-0 逐点：每一步鬼影位移 == 指针位移，且量的是鬼影自身盒', async ({ browser }) => {
  test.setTimeout(600000)
  const context = await browser.newContext({ viewport: 视口 })
  const page = await context.newPage()
  await 进战绩页(page, 身份, true)
  const 步数 = 8
  const 步长 = 30
  const { x, 中心, 零 } = await 起手于(page, 卡片数 - 2, 步长 * 步数, 10, null)

  const 行: Record<string, string | number>[] = [
    {
      步: 0,
      指针Y: 零.指针Y,
      鬼影顶: 零.联合顶,
      自身顶: 零.自身顶,
      内层顶: 零.内层顶,
      单步: 0,
      累计指针: 0,
      累计鬼影: 0,
      累计比值: 1,
      内层角: 零.内层角,
      内层缩: 零.内层缩,
      容器滚动: 零.容器滚动,
    },
  ]
  for (let i = 1; i <= 步数; i++) {
    const 目标Y = 中心 - 14 - 步长 * i
    await page.mouse.move(x, 目标Y, { steps: 6 })
    const 本 = await 等收敛(page)
    钉同源(本, `第 ${i} 步`)
    const 鬼影步 = 差(i === 1 ? 零.联合顶 : Number(行[i - 1].鬼影顶), 本.联合顶)
    const 指针步 = 差(Number(行[i - 1].指针Y), 本.指针Y)
    expect(
      Math.abs(指针步 - 步长),
      `第 ${i} 步：页内实测指针位移 ${指针步} 偏离名义 ${步长} 1px 以上（派发链路断了）`,
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(鬼影步 - 指针步),
      `第 ${i} 步：鬼影位移 ${鬼影步} 与指针位移 ${指针步} 背离 1px 以上`,
    ).toBeLessThanOrEqual(1)
    行.push({
      步: i,
      指针Y: 本.指针Y,
      鬼影顶: 本.联合顶,
      自身顶: 本.自身顶,
      内层顶: 本.内层顶,
      单步: 鬼影步,
      累计指针: 差(零.指针Y, 本.指针Y),
      累计鬼影: 差(零.联合顶, 本.联合顶),
      累计比值: 比(差(零.联合顶, 本.联合顶), 差(零.指针Y, 本.指针Y)),
      内层角: 本.内层角,
      内层缩: 本.内层缩,
      容器滚动: 本.容器滚动,
      目标Y,
    })
  }
  const 尾 = await 读鬼(page)
  expect(尾.容器滚动, `FP32-0： clean 段里列表自己滚动了（${零.容器滚动} → ${尾.容器滚动}），逐点 1:1 的对照面不干净`).toBe(
    零.容器滚动,
  )
  await page.mouse.up()
  await page.waitForTimeout(900)
  const 累计指针 = 差(零.指针Y, 尾.指针Y)
  const 累计鬼影 = 差(零.联合顶, 尾.联合顶)
  const 比值 = 比(累计鬼影, 累计指针)
  fs.appendFileSync(
    证据文件,
    [
      '### FP32-0 起手读数',
      '```',
      JSON.stringify(零, null, 1),
      '```',
      '',
      表('FP32-0 逐点表（步长 30px × 8，含单步与累计）', 行),
      `### FP32-0 汇总`,
      '```',
      JSON.stringify({ 累计指针, 累计鬼影, 比值, 下限: 比值下限, 上限: 比值上限 }, null, 1),
      '```',
      '',
    ].join('\n'),
    'utf8',
  )
  expect(
    Math.abs(累计指针 - 步长 * 步数),
    `FP32-0：实测指针位移 ${累计指针} 偏离名义 ${步长 * 步数} 1px 以上`,
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(累计鬼影 - 累计指针),
    `FP32-0：鬼影总位移 ${累计鬼影} 与指针总位移 ${累计指针} 背离 1px 以上`,
  ).toBeLessThanOrEqual(1)
  expect(比值, `FP32-0：逐点跟手比值 ${比值}（鬼影 ${累计鬼影}px / 指针 ${累计指针}px）越出 ±3%`).toBeGreaterThanOrEqual(
    比值下限,
  )
  expect(比值, `FP32-0：逐点跟手比值 ${比值} 越出 ±3%`).toBeLessThanOrEqual(比值上限)
  await context.close()
})

test('FP32-1 复刻场景E 参数（真实夹具数据 + 固定 400ms）：正确分母下比值 1.000', async ({ browser }) => {
  test.setTimeout(600000)
  const context = await browser.newContext({ viewport: 视口 })
  const page = await context.newPage()
  await 进战绩页(page, 身份, false)

  const 场地 = await page.evaluate(() => {
    const 列 = document.querySelectorAll<HTMLElement>('.zhanji-liebiao .zhanji-kapian')
    const 容 = document.querySelector('.zhanji-liebiao') as HTMLElement
    const r = 列[1].getBoundingClientRect()
    return {
      卡数: 列.length,
      卡顶: Math.round(r.top * 100) / 100,
      卡高: Math.round(r.height * 100) / 100,
      容器顶: Math.round(容.getBoundingClientRect().top * 100) / 100,
      容器滚动: Math.round(容.scrollTop * 100) / 100,
      容器余量: Math.round((容.scrollHeight - 容.clientHeight) * 100) / 100,
    }
  })
  expect(场地.卡数, `FP32-1 前提：夹具账号真实战绩 ${场地.卡数} 张，不足 2 张`).toBeGreaterThanOrEqual(2)

  const 卡 = page.locator('.zhanji-liebiao .zhanji-kapian').nth(1)
  const 盒 = (await 卡.boundingBox())!
  const x = 整(盒.x + 盒.width / 2)
  const 中心 = 整(盒.y + 盒.height / 2)
  const 探针 = 14
  const 再移 = 130
  await page.mouse.move(x, 中心)
  await page.mouse.down()
  await page.mouse.move(x, 中心 - 探针, { steps: 5 })
  await page.waitForTimeout(400)
  const 甲 = await 读鬼(page)
  expect(甲.有鬼, 'FP32-1 前提：拖拽未激活').toBe(true)
  await page.mouse.move(x, 中心 - 探针 - 再移, { steps: 14 })
  await page.waitForTimeout(400)
  const 乙 = await 读鬼(page)
  await page.mouse.up()
  await page.waitForTimeout(1000)

  const 指针位移 = 差(甲.指针Y, 乙.指针Y)
  const 鬼影位移 = 差(甲.联合顶, 乙.联合顶)
  const 比值 = 比(鬼影位移, 指针位移)
  fs.appendFileSync(
    证据文件,
    [
      '### FP32-1 门禁参数复刻（真实数据）',
      '```',
      JSON.stringify({ 场地, 甲, 乙, 名义再移: 再移, 指针位移, 鬼影位移, 比值 }, null, 1),
      '```',
      '',
    ].join('\n'),
    'utf8',
  )
  // 分母自检：这一条就是 FP-32 的根因钉——名义与实测一旦脱钩，红在取样器而不是产品。
  expect(
    Math.abs(指针位移 - 再移),
    `FP32-1：实测指针位移 ${指针位移} 偏离名义 ${再移} 1px 以上 ⇒ 取样器自己的目标算错了（0.892 = 116/130 即此格）`,
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(鬼影位移 - 指针位移),
    `FP32-1：鬼影位移 ${鬼影位移} 与指针位移 ${指针位移} 背离 1px 以上`,
  ).toBeLessThanOrEqual(1)
  expect(比值, `FP32-1：鬼影 ${鬼影位移}px / 指针 ${指针位移}px = ${比值}，越出 ±3%`).toBeGreaterThanOrEqual(比值下限)
  expect(比值, `FP32-1：鬼影 ${鬼影位移}px / 指针 ${指针位移}px = ${比值}，越出 ±3%`).toBeLessThanOrEqual(比值上限)
  await context.close()
})

test('FP32-2 边界：跨半行 / 贴边 / 列表滚动中途', async ({ browser }) => {
  test.setTimeout(900000)
  const context = await browser.newContext({ viewport: 视口 })
  const page = await context.newPage()
  await 进战绩页(page, 身份, true)
  const 结论: Record<string, unknown>[] = []

  const 间距 = await page.evaluate(() => {
    const 列 = document.querySelectorAll<HTMLElement>('.zhanji-liebiao .zhanji-kapian')
    return Math.round((列[1].getBoundingClientRect().top - 列[0].getBoundingClientRect().top) * 100) / 100
  })
  expect(间距, `FP32-2 前提：卡片纵向间距异常（${间距}px）`).toBeGreaterThan(60)

  /** 一条边界：从序号卡起手，分 步数 段各走 步长，逐段验「鬼影 == 指针」 */
  async function 走一段(
    名: string,
    序号: number,
    步长: number,
    步数: number,
    预滚: number | null,
    余量下限: number,
  ) {
    const { x, 中心, 零 } = await 起手于(page, 序号, 步长 * 步数, 余量下限, 预滚)
    const 样本: Record<string, string | number>[] = []
    for (let i = 1; i <= 步数; i++) {
      await page.mouse.move(x, 中心 - 14 - 步长 * i, { steps: Math.max(2, Math.round(步长 / 8)) })
      const 本 = await 等收敛(page)
      钉同源(本, `${名} 第 ${i} 步`)
      const 指针步 = 差(Number(i === 1 ? 零.指针Y : Number(样本[i - 2].指针Y)), 本.指针Y)
      const 鬼影步 = 差(Number(i === 1 ? 零.联合顶 : Number(样本[i - 2].鬼影顶)), 本.联合顶)
      expect(
        Math.abs(指针步 - 步长),
        `${名} 第 ${i} 步：实测指针 ${指针步} 偏离名义 ${步长} 1px 以上`,
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(鬼影步 - 指针步),
        `${名} 第 ${i} 步：鬼影 ${鬼影步} 与指针 ${指针步} 背离 1px 以上（不跟手）`,
      ).toBeLessThanOrEqual(1)
      样本.push({
        步: i,
        指针Y: 本.指针Y,
        鬼影顶: 本.联合顶,
        鬼影步,
        指针步,
        容器滚动: 本.容器滚动,
        页滚动: 本.页滚动,
        内层缩: 本.内层缩,
      })
    }
    const 尾 = await 读鬼(page)
    await page.mouse.up()
    await page.waitForTimeout(900)
    const 指针 = 差(零.指针Y, 尾.指针Y)
    const 鬼影 = 差(零.联合顶, 尾.联合顶)
    const 项 = {
      名,
      步长,
      步数,
      预滚: 预滚 ?? '不变',
      起点中心: Math.round(中心 * 100) / 100,
      终点指针: Math.round(尾.指针Y * 100) / 100,
      间距,
      指针,
      鬼影,
      比值: 比(鬼影, 指针),
      容器滚动_起: 零.容器滚动,
      容器滚动_止: 尾.容器滚动,
    }
    结论.push(项)
    fs.appendFileSync(
      证据文件,
      表(`FP32-2 ${名} 逐点表`, 样本) + `> 汇总：${JSON.stringify(项)}\n\n`,
      'utf8',
    )
    expect(
      Math.abs(指针 - 步长 * 步数),
      `${名}：实测指针位移 ${指针} 偏离名义 ${步长 * 步数} 1px 以上`,
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(鬼影 - 指针),
      `${名}：鬼影总位移 ${鬼影} 与指针总位移 ${指针} 背离 1px 以上`,
    ).toBeLessThanOrEqual(1)
    expect(项.比值, `${名}：跟手比值 ${项.比值}（鬼影 ${鬼影}px / 指针 ${指针}px）越出 ±3%`).toBeGreaterThanOrEqual(
      比值下限,
    )
    expect(项.比值, `${名}：跟手比值 ${项.比值} 越出 ±3%`).toBeLessThanOrEqual(比值上限)
    return 项
  }

  // ① 跨半行：一步走过半个卡片间距 ⇒ 预览落点每步必然翻一格
  const 半行步长 = 整(间距 / 2)
  expect(半行步长, `FP32-2 跨半行：半步长取整后 ${半行步长} 过小，用例退化`).toBeGreaterThanOrEqual(40)
  await 走一段('跨半行', 卡片数 - 2, 半行步长, 4, null, 10)

  // ② 贴边：先把列表滚到 400（留出自滚动余量），取一张中心距可视顶 ≥400 的卡起手，
  //    步长算到「终点停在列表可视上沿 +20px」（库 scrollSensitivity 默认 50 的带内）——
  //    这一段列表会在指针下方持续上滚，而鬼影必须照旧与指针 1:1。
  const 预滚值 = 400
  const 贴卡 = await 选卡(page, 预滚值, 400)
  expect(贴卡.序, `FP32-2 贴边：滚到 ${预滚值} 后没有中心距可视顶 ≥400px 的卡，起点选不出`).toBeGreaterThanOrEqual(0)
  const 贴步长 = 整((贴卡.中心 - 14 - (贴卡.容顶 + 20)) / 4)
  expect(贴步长, `FP32-2 贴边：算出的步长 ${贴步长} 非正，起点/终点几何不成立`).toBeGreaterThan(4)
  const 贴项 = await 走一段('贴边', 贴卡.序, 贴步长, 4, 预滚值, 6)
  expect(
    整(贴卡.中心) - 14 - 贴步长 * 4 - 整(贴卡.容顶),
    `FP32-2 贴边：终点距容器可视顶超出自动滚动带（>50px），取样前提不成立`,
  ).toBeLessThanOrEqual(50)
  expect(
    贴项.容器滚动_止,
    `FP32-2 贴边：列表没有跟着自动滚动（${贴项.容器滚动_起} → ${贴项.容器滚动_止}），这一格退化成普通段，取样前提不成立`,
  ).not.toBe(贴项.容器滚动_起)

  // ③ 滚动中途：起点不在 0 位（容器已滚过的量不得混进位移，落点推算与鬼影必须同源）
  const 滚卡 = await 选卡(page, 300, 144 + 14 + 10)
  expect(滚卡.序, 'FP32-2 滚动中途：滚到 300 后选不出可上拖 144px 的起点卡').toBeGreaterThanOrEqual(0)
  await 走一段('滚动中途', 滚卡.序, 36, 4, 300, 10)

  fs.appendFileSync(
    证据文件,
    ['### FP32-2 边界三段', '```', JSON.stringify(结论, null, 1), '```', ''].join('\n'),
    'utf8',
  )
  await context.close()
})
