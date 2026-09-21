import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  baoZhengCeShiZhangHao,
  daKaiJiaJuQingQiu,
  zhuRuJiaJuShenFen,
  type JiaJuShenFen,
} from './测试夹具'

// FP-03 资料设置向导取证（缺陷3）：
//   ① 选项框（性别卡 / MBTI 卡 / 随机卡）底色填充在 hover → pointerdown → pointerup 选中切换 → focus
//      全过程的无损双通道采样（rAF 逐绘制帧 + transitionrun 事件捕获），断言
//      backgroundColor / backgroundImage 零变化且底色属性零补间；
//      并以 beiXuanZhong 类是否真的挂上作为「交互已落地」的反空证条件。
//   ② 主按钮（下一步 / 开始聊天）与进度圆点在 未选 / 男 / 女 三档下的实际解析配色。
// 运行：FP03_LABEL=before|after npx playwright test tests/fp03-xuanxiang-shanse.spec.ts
// before 只记录不断言（钉住现状用于证伪根因推断）；after 断言底色零变化 + 配色按 --xingbie-* 令牌正确。

const 标签 = process.env.FP03_LABEL ?? 'after'
const 日期 = '20260921'
const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 截图目录 = path.resolve(本目录, '../../测试截图')
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces')

type 帧 = {
  t: number
  backgroundColor: string
  backgroundImage: string
  transitionProperty: string
  选中: boolean
  丢失: boolean
}

type 过渡事件 = {
  t: number
  类型: string
  属性: string
  目标: string
  命中: boolean
}

type 阶段取样 = {
  元素: string
  帧: 帧[]
  标记: string
  空帧: number
  选中落地: boolean
  全帧数: number
  窗口终点: number
  选中时刻: number
  事件: 过渡事件[]
  失败?: string
}

type 配色取样 = {
  主题: string
  视口: string
  档位: string
  属性: string
  按钮: string
  文字: string
  圆点: string
  截图: string
}

const 视口清单: Array<[string, { width: number; height: number }, boolean]> = [
  ['桌面1440x900', { width: 1440, height: 900 }, false],
  ['手机375x667', { width: 375, height: 667 }, true],
]
const 主题清单 = ['暗色', '浅色'] as const

const 令牌解析值 = {
  中性一档: 'rgb(142, 142, 147)',
  中性二档: 'rgb(99, 99, 102)',
  男一档: 'rgb(74, 144, 217)',
  男二档: 'rgb(58, 123, 200)',
  女一档: 'rgb(230, 169, 190)',
  女二档: 'rgb(199, 123, 152)',
} as const

/**
 * 页面内双通道采样器。
 * ① 帧通道：rAF 每个真实绘制帧读一次计算样式，给出「底色取值集合是否只有一个值」。
 *    实测本环境主线程被背景 3D 场景占住，rAF 只能跑到 ≈1s/帧（桌面 1054~1584ms、手机 283~338ms），
 *    与 before 档的 Node 侧 50ms 轮询同量级 —— 单靠帧通道存在漏采补间中间值的理论风险。
 * ② 事件通道（无损）：`transitionrun` 会冒泡，capture 挂 document 上，凡是本元素身上启动的
 *    任何一条 CSS 过渡都会被记下来，与帧率无关、不会漏采。断言「底色属性零补间」以本通道为权威证据，
 *    帧通道作为取值恒定的直接观测量；同时要求本通道至少抓到 border-color 一条，防止空列表假绿。
 */
function 装采样器(page: Page) {
  return page.evaluate(() => {
    const 窗 = window as unknown as Record<string, unknown>
    if (typeof 窗.__fp03启动 === 'function') return
    const 状 = {
      目标: '',
      序号: 0,
      帧: [] as 帧[],
      事件: [] as 过渡事件[],
      丢失: 0,
      开: false,
      起点: 0,
    }
    const 本元素 = () => document.querySelectorAll(状.目标)[状.序号] as Element | undefined
    窗.__fp03启动 = (CSS选择器: string, 序号: number) => {
      状.目标 = CSS选择器
      状.序号 = 序号
      状.帧 = []
      状.事件 = []
      状.丢失 = 0
      状.起点 = performance.now()
      状.开 = true
    }
    窗.__fp03取回 = () => ({ 帧: 状.帧, 事件: 状.事件, 丢失: 状.丢失 })
    窗.__fp03停止 = () => {
      状.开 = false
    }
    const 记 = (类: string) => (e: Event) => {
      if (!状.开) return
      const 元 = e.target as Element | null
      if (!元 || 元.nodeType !== 1) return
      状.事件.push({
        t: Math.round(performance.now() - 状.起点),
        类型: 类,
        属性: (e as TransitionEvent).propertyName,
        目标: (元.getAttribute('class') || 元.tagName).slice(0, 60),
        命中: !!元 && 元 === 本元素(),
      })
    }
    document.addEventListener('transitionrun', 记('run'), true)
    document.addEventListener('transitionstart', 记('start'), true)
    const 走 = () => {
      if (状.开) {
        const 元 = 本元素() as HTMLElement | undefined
        if (元) {
          const s = getComputedStyle(元)
          状.帧.push({
            t: Math.round(performance.now() - 状.起点),
            backgroundColor: s.backgroundColor,
            backgroundImage: s.backgroundImage,
            transitionProperty: s.transitionProperty,
            选中: 元.classList.contains('beiXuanZhong'),
            丢失: false,
          })
        } else {
          状.丢失 += 1
        }
      }
      requestAnimationFrame(走)
    }
    requestAnimationFrame(走)
  })
}

function 采样取回(page: Page) {
  return page.evaluate(() => {
    const 窗 = window as unknown as Record<
      string,
      (() => { 帧: 帧[]; 事件: 过渡事件[]; 丢失: number }) | undefined
    >
    return 窗.__fp03取回 ? 窗.__fp03取回!() : { 帧: [], 事件: [], 丢失: -1 }
  })
}

/** 对单个选项框做「移入 → 按下 → 抬起（选中切换）→ 聚焦」全流程逐帧取证 */
async function 闪色取样(
  page: Page,
  元素名: string,
  CSS选择器: string,
  序号: number,
  触屏: boolean,
): Promise<阶段取样> {
  const 空结果 = (标记: string, 失败?: string): 阶段取样 => ({
    元素: 元素名,
    帧: [],
    标记,
    空帧: 0,
    选中落地: false,
    全帧数: 0,
    窗口终点: 0,
    选中时刻: -1,
    事件: [],
    失败,
  })
  const 定位 = page.locator(CSS选择器).nth(序号)
  await 定位.waitFor({ state: 'visible', timeout: 90000 })
  await 定位.scrollIntoViewIfNeeded()
  const 框 = await 定位.boundingBox()
  if (!框) return 空结果('', '无包围盒')
  const 中心 = { x: 框.x + 框.width / 2, y: 框.y + 框.height / 2 }

  await page.evaluate(
    (参: { CSS选择器: string; 序号: number }) => {
      const 窗 = window as unknown as Record<string, ((a: string, b: number) => void) | undefined>
      窗.__fp03启动!(参.CSS选择器, 参.序号)
    },
    { CSS选择器, 序号 },
  )
  const 起点 = Date.now()
  const 标记: string[] = []
  const 动作: Array<['hover' | 'tap' | 'down' | 'up' | 'focus', number]> = 触屏
    ? [
        ['tap', 150],
        ['focus', 900],
      ]
    : [
        ['hover', 150],
        ['down', 350],
        ['up', 480],
        ['focus', 900],
      ]
  for (const [dong, 时刻] of 动作) {
    const 还差 = 起点 + 时刻 - Date.now()
    if (还差 > 0) await page.waitForTimeout(还差)
    if (dong === 'hover') await page.mouse.move(中心.x, 中心.y)
    else if (dong === 'tap') await page.touchscreen.tap(中心.x, 中心.y)
    else if (dong === 'down') await page.mouse.down()
    else if (dong === 'up') await page.mouse.up()
    else
      await page.evaluate(
        (参: { CSS选择器: string; 序号: number }) => {
          const 元 = document.querySelectorAll(参.CSS选择器)[参.序号] as HTMLElement | undefined
          元?.focus({ preventScroll: true })
        },
        { CSS选择器, 序号 },
      )
    标记.push(
      `${dong === 'down' ? 'pointerdown' : dong === 'up' ? 'pointerup+click' : dong}@${Date.now() - 起点}`,
    )
  }

  // 采样窗口必须覆盖到「最后一个动作落地后再 500ms」与「选中类挂上后再 500ms」的较大者；
  // 主线程被 3D 场景拖住时动作与选中都会晚于计划时刻（实测桌面档 hover 就会漂到 1s 之后）
  let 帧集: 帧[] = []
  let 事件集: 过渡事件[] = []
  let 丢失 = 0
  let 选中时刻 = -1
  const 动作完成 = 标记.length ? Number(标记[标记.length - 1].split('@')[1]) : 0
  let 窗口终点 = 0
  for (let 轮 = 0; 轮 < 24; 轮++) {
    await page.waitForTimeout(250)
    const 快照 = await 采样取回(page)
    帧集 = 快照.帧
    事件集 = 快照.事件
    丢失 = 快照.丢失
    选中时刻 = 帧集.find((x) => x.选中)?.t ?? -1
    const 末帧 = 帧集.length > 0 ? 帧集[帧集.length - 1].t : -1
    窗口终点 = 末帧
    const 后帧 = 帧集.filter((x) => x.t > 选中时刻).length
    if (选中时刻 >= 0 && 末帧 >= Math.max(选中时刻, 动作完成) + 500 && 后帧 >= 2) break
    if (丢失 > 0 && 帧集.length === 0) break
  }
  await page.evaluate(() => {
    const 窗 = window as unknown as Record<string, (() => void) | undefined>
    窗.__fp03停止?.()
  })
  await page.mouse.move(5, 5)

  const 全帧数 = 帧集.length
  return {
    元素: 元素名,
    帧: 帧集,
    标记: `${标记.join(',')}｜选中@${选中时刻}ms`,
    空帧: 丢失,
    选中落地: 选中时刻 >= 0,
    全帧数,
    窗口终点,
    选中时刻,
    事件: 事件集.filter((x) => x.命中),
    失败: 全帧数 === 0 ? '一个绘制帧都没采到' : undefined,
  }
}

function 有效帧(取样: 阶段取样): 帧[] {
  return 取样.帧.filter((f) => !f.丢失)
}

function 底色取值(取样: 阶段取样): string[] {
  return [...new Set(有效帧(取样).map((f) => `${f.backgroundColor} ‖ ${f.backgroundImage}`))]
}

function 补间属性(取样: 阶段取样): string {
  return [...new Set(有效帧(取样).map((f) => f.transitionProperty))].join(' / ')
}

function 平均帧距(取样: 阶段取样): number {
  const 有 = 有效帧(取样)
  if (有.length < 2) return 0
  return Math.round((有[有.length - 1].t - 有[0].t) / (有.length - 1))
}

/** 权威通道：本元素身上真实启动过的 CSS 过渡里，涉及底色填充的那几条 */
function 底色补间(取样: 阶段取样): 过渡事件[] {
  return 取样.事件.filter((x) => /^background(-color|-image)?$/.test(x.属性))
}

function 补间属性集(取样: 阶段取样): string {
  return [...new Set(取样.事件.map((x) => `${x.属性}(${x.类型})`))].join(' ')
}

function 选中后帧数(取样: 阶段取样): number {
  return 取样.帧.filter((f) => f.t > 取样.选中时刻).length
}

async function 打开向导(page: Page, 身份: JiaJuShenFen, 主题: string): Promise<void> {
  await page.addInitScript(([zhuTi]) => {
    localStorage.setItem('主题', zhuTi)
    localStorage.removeItem('hewolianba_ziLiaoShuJu')
    localStorage.removeItem('hewolianba_ziLiaoDangQianBuZhou')
    localStorage.removeItem('hewolianba_ziLiaoSheZhiYiWanCheng')
    localStorage.removeItem('hewolianba_yonghu')
  }, [主题])
  // 账号默认性别会驱动第一步预选，钉成 null 让「未选 → 中性」档可复现
  await page.route('**/api/认证/信息', async (luYou) => {
    const 响应 = await luYou.fetch()
    let 体: unknown
    try {
      体 = await 响应.json()
    } catch {
      await luYou.fallback()
      return
    }
    const 数据 = (体 as { shu_ju?: Record<string, unknown> } | null)?.shu_ju
    if (数据 && 'mo_ren_xing_bie' in 数据) 数据.mo_ren_xing_bie = null
    await luYou.fulfill({ status: 响应.status(), headers: 响应.headers(), body: JSON.stringify(体) })
  })
  await zhuRuJiaJuShenFen(page, 身份)
  await page.goto('/profile-setup?moshi=putong', { waitUntil: 'domcontentloaded' })
  const 卡 = page.locator('.ziJi-xingBie-kaPian').first()
  try {
    await 卡.waitFor({ state: 'visible', timeout: 45000 })
  } catch {
    // dev server 在并行批次里可能正在重优化依赖，首帧偶尔什么都不渲染 —— 重载一次再等
    await page.reload({ waitUntil: 'domcontentloaded' })
    await 卡.waitFor({ state: 'visible', timeout: 90000 })
  }
  // 背景 3D 场景首帧会长时间占住主线程，饿死输入派发；先静置再取样，取样窗口才覆盖得到点击
  await page.waitForTimeout(6000)
  await 装采样器(page)
}

/** 点主按钮推进到下一步，并等目标步骤的首个选项框真正可交互（过渡 0.35s + Vue 重渲染） */
async function 点下一步(page: Page, 到达选择器: string): Promise<void> {
  const 主按钮 = page.locator('.anniu-zhuYao').first()
  await expect(主按钮, `推进前主按钮不可用：${到达选择器}`).toBeEnabled({ timeout: 20000 })
  await 主按钮.click()
  await page
    .locator(到达选择器)
    .first()
    .waitFor({ state: 'visible', timeout: 60000 })
  await page.waitForTimeout(1500)
}

async function 配色取样(
  page: Page,
  主题: string,
  视口名: string,
  档位: string,
  后缀: string,
  截图集: string[],
): Promise<配色取样> {
  const 数据 = await page.evaluate(() => {
    const an = getComputedStyle(document.querySelector('.anniu-zhuYao') as HTMLElement)
    const dian = getComputedStyle(document.querySelector('.jindu-dian.dangQian') as HTMLElement)
    return {
      属性: document.querySelector('.ziliao-kapian')?.getAttribute('data-xingbie') ?? '(无)',
      按钮: `${an.backgroundImage} ‖ ${an.backgroundColor} ‖ shadow ${an.boxShadow.slice(0, 90)}`,
      文字: an.color,
      圆点: `${dian.backgroundColor} ‖ shadow ${dian.boxShadow.slice(0, 90)}`,
    }
  })
  const 名 = `fp03-${标签}-${主题}-${视口名}-${后缀}.png`
  await page.locator('.ziliao-kapian').screenshot({ path: path.join(截图目录, 名) })
  截图集.push(`测试截图/${名}`)
  return { 主题, 视口: `${主题}/${视口名}`, 档位, ...数据, 截图: 名 }
}

function 写证据(记录: {
  闪色: 阶段取样[]
  配色: 配色取样[]
  控制台错误: string[]
  截图: string[]
}): void {
  fs.mkdirSync(证据目录, { recursive: true })
  const 行 = [
    `# FP-03 向导选项闪色与性别配色取证（${标签}）-${日期}`,
    '',
    `采集时间：${new Date().toISOString()}`,
    '取样窗口：双通道。帧通道 = 页面内 rAF 逐绘制帧读计算样式；事件通道 = document capture 挂 transitionrun/transitionstart（会冒泡，与帧率无关、无损）。采样数组即窗口全量：末帧时刻 ≥ max(选中类挂上, 最后一个动作落地) + 500ms，且选中后至少 2 帧。阶段 hover→pointerdown→pointerup→focus（触屏档 tap→focus）',
    '',
    '## 选项框底色逐帧采样（帧通道：底色‖背景图 去重集合，取值数应为 1；事件通道：该元素真实启动过的 CSS 过渡属性，底色类应为 0 条；选中落地应为 true 以排除空采）',
    '',
    '| 元素 | 帧数 | 选中时刻(ms) | 选中后帧数 | 末帧时刻(ms) | 平均帧距(ms) | 丢失帧 | 底色取值数 | 选中落地 | transition-property | 命中过渡属性 | 底色补间条数 | 阶段标记 | 取值 |',
    '| ---- | ---- | ------------ | ---------- | ------------ | ------------ | ------ | ---------- | -------- | ------------------- | ------------ | ------------ | -------- | ---- |',
    ...记录.闪色.map((x) => {
      const 集 = 底色取值(x)
      return `| ${x.元素} | ${x.帧.length} | ${x.选中时刻} | ${选中后帧数(x)} | ${x.窗口终点} | ${平均帧距(x)} | ${x.空帧} | ${集.length} | ${x.选中落地} | ${补间属性(x)} | ${补间属性集(x)} | ${底色补间(x).length} | ${x.标记} | ${集.join(' 〈分段〉 ')}${x.失败 ? ` （失败：${x.失败}）` : ''} |`
    }),
    '',
    '## 命中元素的 CSS 过渡事件全量（无损通道，与帧率无关）',
    '',
    ...记录.闪色.map((x) => `- ${x.元素}：${x.事件.length ? x.事件.map((e) => `${e.属性}@${e.t}ms/${e.类型}`).join('、') : '（无）'}`),
    '',
    '## 主按钮 / 进度圆点 实际解析配色',
    '',
    '| 主题 | 视口 | 性别档 | data-xingbie | .anniu-zhuYao background-image‖background-color | color | .jindu-dian.dangQian background-color |',
    '| ---- | ---- | ------ | ------------ | ------------------------------------------------ | ----- | --------------------------------------------- |',
    ...记录.配色.map((x) => `| ${x.主题} | ${x.视口} | ${x.档位} | ${x.属性} | ${x.按钮} | ${x.文字} | ${x.圆点} |`),
    '',
    '## 控制台 error',
    '',
    记录.控制台错误.length ? 记录.控制台错误.map((e) => `- ${e}`).join('\n') : '- 无',
    '',
    '## 截图',
    '',
    ...记录.截图.map((p) => `- ${p}`),
    '',
  ]
  fs.writeFileSync(
    path.join(证据目录, `FP-03-向导闪色与配色-${标签}-${日期}.md`),
    行.join('\n'),
    'utf8',
  )
}

test.describe('FP-03 向导选项闪色与性别配色', () => {
  // 背景 3D 场景把主线程压到 ≈1s/回合，四组组合 × 四次取样实测需 30 分钟以上；上限给到 80 分钟
  test.setTimeout(4800000)

  const 闪色记录: 阶段取样[] = []
  const 配色记录: 配色取样[] = []
  const 截图记录: string[] = []
  const 错误记录: string[] = []

  test('选项框底色零变化 + 三档性别配色取证', async ({ browser }) => {
    fs.mkdirSync(截图目录, { recursive: true })
    const 只跑一组 = process.env.FP03_SOLO === '1'
    const 主题集 = 只跑一组 ? 主题清单.slice(0, 1) : 主题清单
    const 视口集 = 只跑一组 ? 视口清单.slice(0, 1) : 视口清单
    const 起点总 = Date.now()
    const 记 = (明: string) =>
      console.log(`[fp03 ${Math.round((Date.now() - 起点总) / 1000)}s] ${明}`)
    const 请求 = await daKaiJiaJuQingQiu()
    const 身份 = await baoZhengCeShiZhangHao(请求)
    await 请求.dispose()

    for (const 主题 of 主题集) {
      for (const [视口名, 视口, 触屏] of 视口集) {
        const context = await browser.newContext({ viewport: 视口, hasTouch: 触屏 })
        const page = await context.newPage()
        page.on('console', (x) => {
          if (x.type() === 'error') 错误记录.push(`[${主题}/${视口名}] ${x.text()}`)
        })
        page.on('pageerror', (e) => 错误记录.push(`[${主题}/${视口名}] pageerror ${e.message}`))
        await 打开向导(page, 身份, 主题)
        记(`${主题}/${视口名} 向导就绪`)

        配色记录.push(await 配色取样(page, 主题, 视口名, '未选(中性)', 'weixuan', 截图记录))
        闪色记录.push(
          await 闪色取样(page, `${主题}/${视口名} 自身男卡`, '.ziJi-xingBie-kaPian', 0, 触屏),
        )
        记('自身男卡取样完')
        配色记录.push(await 配色取样(page, 主题, 视口名, '男', 'nan', 截图记录))

        await page.locator('.ziJi-xingBie-kaPian').nth(1).click()
        await expect(page.locator('.ziJi-xingBie-kaPian').nth(1)).toHaveClass(/beiXuanZhong/, {
          timeout: 15000,
        })
        配色记录.push(await 配色取样(page, 主题, 视口名, '女', 'nv', 截图记录))

        await 点下一步(page, '.duiXiang-xingBie-kaPian')
        闪色记录.push(
          await 闪色取样(page, `${主题}/${视口名} 对象女卡`, '.duiXiang-xingBie-kaPian', 1, 触屏),
        )

        await page.locator('.duiXiang-xingBie-kaPian').nth(1).click()
        await expect(page.locator('.duiXiang-xingBie-kaPian').nth(1)).toHaveClass(
          /beiXuanZhong/,
          { timeout: 15000 },
        )
        await 点下一步(page, '.mbti-kaPian')
        闪色记录.push(await 闪色取样(page, `${主题}/${视口名} MBTI卡`, '.mbti-kaPian', 0, 触屏))
        闪色记录.push(await 闪色取样(page, `${主题}/${视口名} 随机卡`, '.suiJi-kaPian', 0, 触屏))
        配色记录.push(
          await 配色取样(page, 主题, 视口名, '女·开始聊天', 'nv-kaiishi', 截图记录),
        )

        await context.close()
        记(`${主题}/${视口名} 组合完成（证据增量落盘）`)
        写证据({ 闪色: 闪色记录, 配色: 配色记录, 控制台错误: 错误记录, 截图: 截图记录 })
      }
    }

    写证据({ 闪色: 闪色记录, 配色: 配色记录, 控制台错误: 错误记录, 截图: 截图记录 })

    if (标签 !== 'after') return

    const 禁词 = ['all', 'background', 'background-color', 'background-image']
    for (const 项 of 闪色记录) {
      expect(项.失败, `${项.元素}：采样失败`).toBeUndefined()
      expect(项.选中落地, `${项.元素}：beiXuanZhong 从未挂上，取样为空采`).toBe(true)
      expect(项.空帧, `${项.元素}：采样期间元素脱离文档`).toBe(0)
      expect(项.帧.length, `${项.元素}：采样帧数过少，窗口没覆盖住交互`).toBeGreaterThanOrEqual(4)
      expect(项.窗口终点, `${项.元素}：窗口没覆盖到动作后 500ms`).toBeGreaterThanOrEqual(500)
      expect(
        选中后帧数(项),
        `${项.元素}：选中类挂上后只采到 ${选中后帧数(项)} 帧，稳态没被观测`,
      ).toBeGreaterThanOrEqual(2)
      // 无损通道：底色属性一旦起过补间，transitionrun 必然记账，与帧率无关。
      // 帧距不设上限——本环境主线程被背景 3D 场景压到 0.03~2.3 帧/秒，帧距阈值只会误报采样失效；
      // 通道活性改由「同一元素确实抓到多条其它属性的过渡事件」直接证明（空列表假绿才是真风险）
      expect(
        底色补间(项),
        `${项.元素}：底色属性启动了 CSS 过渡 → ${底色补间(项).map((e) => `${e.属性}@${e.t}ms`).join('、')}`,
      ).toHaveLength(0)
      expect(
        项.事件.length,
        `${项.元素}：只抓到 ${项.事件.length} 条过渡事件，事件通道空转（底色 0 条会假绿）`,
      ).toBeGreaterThanOrEqual(4)
      const 集 = 底色取值(项)
      expect(集.length, `${项.元素}：底色取值 ${集.length} 种 → ${集.join(' ‖ ')}`).toBe(1)
      const cp = 补间属性(项)
      expect(cp, `${项.元素}：transition-property 读不到值`).not.toBe('')
      for (const ci of 禁词) {
        expect(
          cp.split(/,\s*/).some((个) => 个.trim() === ci),
          `${项.元素}：transition-property 含 ${ci} → ${cp}`,
        ).toBe(false)
      }
    }

    for (const 主题 of 主题集) {
      for (const [视口名] of 视口集) {
        const 键 = `${主题}/${视口名}`
        const 取 = (dang: string) => 配色记录.find((x) => x.视口 === 键 && x.档位 === dang)
        expect(取('未选(中性)')?.属性).toBe('zhongxing')
        expect(取('男')?.属性).toBe('nan')
        expect(取('女')?.属性).toBe('nv')
        expect(取('未选(中性)')?.按钮).toContain(令牌解析值.中性一档)
        expect(取('未选(中性)')?.圆点).toContain(令牌解析值.中性二档)
        expect(取('男')?.按钮).toContain(令牌解析值.男一档)
        expect(取('男')?.圆点).toContain(令牌解析值.男二档)
        expect(取('女')?.按钮).toContain(令牌解析值.女一档)
        expect(取('女')?.圆点).toContain(令牌解析值.女二档)
        expect(取('女·开始聊天')?.按钮).toContain(令牌解析值.女一档)
        expect(取('男')?.文字).toBe('rgb(255, 255, 255)')
      }
    }
    expect(错误记录, `控制台 error：${错误记录.join(' / ')}`).toHaveLength(0)
  })
})
