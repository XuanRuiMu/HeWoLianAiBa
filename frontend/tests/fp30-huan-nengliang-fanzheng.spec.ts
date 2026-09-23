import { test, expect, type Browser, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { 卡内白条普查, type 普查结果, type 能量台账 } from './焦点白条取样-fp03'

// FP-30 环残影「能量守恒」判据的反证夹具。判据不在此重写，一律复用唯一真源 tests/焦点白条取样-fp03.ts。
// 反证三件（PROGRESS『待处理功能点』FP-30 行）：
//   (a)  FP-27 的真实跨行场景改前改后都不报；
//   (a2) FP-27 实测的两行分摊 t=0.475 与 0.435（合计 ≈0.91 ≈ 1px 环）按实测色回放，仍必须豁免；
//   (b)  环下方 0-2px 画一条**与环同色**的满强度实线（2px 与孤立 1px 两档）⇒ 新判据必红；
//   (c)  原异色香槟金 #e3c98e 线必红 ⇒ 常驻在 tests/fp27-liangtiao-quzheng.spec.ts，本单复跑它。
// 运行（端口 5187；5173 归并行 agent，本任务一律 5180+）：
//   npx playwright test --config playwright.config-fp30.ts
//   [FP30_HEADED=1] 复采 headed 档；FP30_LABEL 换档以免覆盖上一轮证据（L-10）
// 逐行台账 / 命中落 .agents/evidence/traces/FP-30-反证-<模式>-<label>.json，像素图落 测试截图/FP-30-<模式>-<label>-*.png

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 截图目录 = path.resolve(本目录, '../../测试截图')
const 输出目录 = path.resolve(本目录, '../../.agents/evidence/traces')
const 模式 = process.env.FP30_HEADED === '1' ? 'headed' : 'headless'
const 标签 = process.env.FP30_LABEL ?? 'final'
const 手机号 = '#denglu-shoujihao'
const 密码 = '#denglu-mima'
const 登录字段 = [手机号, 密码]

type 反证档 = { 档: string; 说明: string; 普查: 普查结果; 贴线?: { 起始行: number; 高度: number; 颜色: string } }

async function 开页(浏览器: Browser, 视口: { 宽: number; 高: number }, 聚焦: string) {
  const context = await 浏览器.newContext({
    viewport: { width: 视口.宽, height: 视口.高 },
    deviceScaleFactor: 1,
  })
  await context.addInitScript(() => localStorage.setItem('主题', '暗色'))
  const page = await context.newPage()
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator(手机号)).toBeVisible({ timeout: 90000 })
  await page.waitForTimeout(2500)
  await page.click(聚焦)
  await page.waitForTimeout(650)
  return { context, page }
}

/** 环底行＝算式排定的焦点环占有行的最大者（改前/改后同字段，对照才可比） */
function 环底行(普查: 普查结果, 选择器: string): number {
  const 元 = 普查.几何.输入框.find((项) => 项.选择器 === 选择器)
  expect(元, `取样几何里找不到 ${选择器}`).toBeTruthy()
  const 环行 = 元!.环占有行
  expect(环行.length, `${选择器} 聚焦后没有焦点环占有行，反证前提不成立`).toBeGreaterThan(0)
  return Math.max(...环行)
}

function 拆(值: string): number[] {
  const 数 = 值.match(/[\d.]+/g)
  return 数 && 数.length >= 3 ? [Number(数[0]), Number(数[1]), Number(数[2])] : [0, 0, 0]
}

/** 卡底 → 环色 内插：按 FP-27 实测的覆盖率比复算出「同色低覆盖率」那条线的真实像素色 */
function 内插色(卡底: string, 环色: string, t: number): string {
  const b = 拆(卡底)
  const o = 拆(环色)
  return `rgb(${Math.round(b[0] + t * (o[0] - b[0]))}, ${Math.round(b[1] + t * (o[1] - b[1]))}, ${Math.round(
    b[2] + t * (o[2] - b[2]),
  )})`
}

async function 贴线(
  page: Page,
  参数: { 标识: string; 起始行: number; 高度: number; 颜色: string; 左: number; 宽: number },
) {
  await page.evaluate((参) => {
    document.getElementById(参.标识)?.remove()
    const 线 = document.createElement('div')
    线.id = 参.标识
    线.style.cssText = `position:fixed;left:${参.左}px;top:${参.起始行}px;width:${参.宽}px;height:${参.高度}px;`
    线.style.background = 参.颜色
    线.style.zIndex = '99999'
    线.style.pointerEvents = 'none'
    document.body.appendChild(线)
  }, 参数)
  await page.waitForTimeout(250)
}

/** 改前（FP-27 逐行豁免）没有能量台账；反证档要在两种判据下都能跑，故此处按可缺字段读 */
function 读台账(普查: 普查结果): 能量台账[] {
  const 台 = (普查 as { 能量台账?: 能量台账[] }).能量台账
  return 台 ?? []
}

function 台账文本(普查: 普查结果): string {
  const 台 = 读台账(普查)
  if (!台.length) return '（本轮判据无能量台账＝FP-27 逐行豁免档）'
  return 台.map(
    (项) =>
      `${项.选择器}/${项.环边} 窗[${项.窗口起}..${项.窗口止}] 环厚${项.环厚度行}px 合计t=${项.合计覆盖率}` +
      ` 预算=${项.预算} 豁免=${项.豁免} ｜ ${项.行
        .map((行) => `${行.行}${行.是环行 ? '(环)' : ''}=${行.覆盖率 === null ? '—' : 行.覆盖率.toFixed(3)}`)
        .join(' ')}`,
  ).join('\n    ')
}

function 命中文本(普查: 普查结果): string {
  if (!普查.判定带命中.length) return '无'
  return 普查.判定带命中
    .map((命) => `${命.选择器}${命.段} 行${命.条带.起始行}..${命.条带.结束行} ${命.条带.中位亮条色} Δ=${命.条带.对卡面色差}`)
    .join(' / ')
}

const 档清单: 反证档[] = []

function 收档(档: string, 说明: string, 普查: 普查结果, 贴线信息?: { 起始行: number; 高度: number; 颜色: string }) {
  console.log(
    `FP30 ${档}：命中=${普查.判定带命中.length} [${命中文本(普查)}]\n    台账: ${台账文本(普查)}`.replace(/\n/g, '\n  '),
  )
  档清单.push({ 档, 说明, 普查, 贴线: 贴线信息 })
}

function 落盘() {
  fs.mkdirSync(输出目录, { recursive: true })
  const 出 = 档清单.map((项) => ({
    档: 项.档,
    说明: 项.说明,
    模式,
    贴线: 项.贴线,
    卡底色: 项.普查.合成卡底色,
    命中数: 项.普查.判定带命中.length,
    命中: 项.普查.判定带命中.map((命) => ({
      选择器: 命.选择器,
      段: 命.段,
      起始行: 命.条带.起始行,
      结束行: 命.条带.结束行,
      厚度: 命.条带.厚度,
      色: 命.条带.中位亮条色,
      对卡面色差: 命.条带.对卡面色差,
      连续段宽: 命.条带.连续段宽,
    })),
    能量台账: 读台账(项.普查),
  }))
  fs.writeFileSync(
    path.join(输出目录, `FP-30-反证-${模式}-${标签}.json`),
    JSON.stringify(出, null, 2),
    'utf8',
  )
}

test.afterAll(() => {
  落盘()
})

test('FP-30 (a) FP-27 真实跨行场景：登录页四态判定带零命中', async ({ browser }) => {
  test.setTimeout(600000)
  for (const 视口 of [
    { 宽: 375, 高: 667 },
    { 宽: 1440, 高: 900 },
  ]) {
    for (const 聚焦 of [手机号, 密码]) {
      const { context, page } = await 开页(browser, 视口, 聚焦)
      const 普查 = await 卡内白条普查(
        page,
        '.biaodan-rongqi',
        登录字段,
        path.join(截图目录, `FP-30-${模式}-${标签}-a-${视口.宽}x${视口.高}-${聚焦.slice(1)}.png`),
      )
      expect(普查.几何.视口, `${聚焦} 取样视口与派生 config 钉的不一致`).toEqual({ 宽: 视口.宽, 高: 视口.高 })
      expect(普查.几何.设备像素比, '反证必须钉 DPR=1').toBe(1)
      收档(
        `a-${视口.宽}x${视口.高}-${聚焦.slice(1)}`,
        '真实布局（未贴线）：跨行残影只贡献 ≤1px 能量 ⇒ 不得报',
        普查,
      )
      expect(普查.判定带命中.length, `FP-30(a) 真跨行被判成假红：${命中文本(普查)}`).toBe(0)
      await context.close()
    }
  }
})

test('FP-30 (a2) FP-27 实测分摊 0.475+0.435 回放：合计 0.91 仍豁免', async ({ browser }) => {
  test.setTimeout(600000)
  const { context, page } = await 开页(browser, { 宽: 375, 高: 667 }, 手机号)
  const 静 = await 卡内白条普查(page, '.biaodan-rongqi', 登录字段)
  expect(静.判定带命中.length, `静态前提不成立：未贴线已有命中 ${命中文本(静)}`).toBe(0)
  const 元 = 静.几何.输入框.find((项) => 项.选择器 === 手机号)!
  const 环底 = 环底行(静, 手机号)
  const 色A = 内插色(静.合成卡底色, 元.outlineColor, 0.475)
  const 色B = 内插色(静.合成卡底色, 元.outlineColor, 0.435)
  const 左 = Math.round(元.矩形.左) + 2
  const 宽 = Math.round(元.矩形.右) - 2 - 左
  // 逐字回放 FP-27 的实测像素序列：环行 t=0.475、下一行 t=0.435（合计 ≈0.91 ≈ 1px 环的全部能量）
  await 贴线(page, { 标识: 'fp30-a2-a', 起始行: 环底, 高度: 1, 颜色: 色A, 左, 宽 })
  await 贴线(page, { 标识: 'fp30-a2-b', 起始行: 环底 + 1, 高度: 1, 颜色: 色B, 左, 宽 })
  const 回放 = await 卡内白条普查(
    page,
    '.biaodan-rongqi',
    登录字段,
    path.join(截图目录, `FP-30-${模式}-${标签}-a2-huifang.png`),
  )
  收档('a2-分摊回放', `环行 ${环底}=${色A}(t0.475) 与 ${环底 + 1}=${色B}(t0.435) 回放 FP-27 实测分摊`, 回放, {
    起始行: 环底,
    高度: 2,
    颜色: `${色A} + ${色B}`,
  })
  expect(回放.判定带命中.length, `FP-30(a2) 真跨行分摊被误判为亮条：${命中文本(回放)}`).toBe(0)
  const 台 = 读台账(回放).find((项) => 项.选择器 === 手机号 && 项.环边 === '底')
  if (台) {
    const 分摊 = 台.行.filter((项) => 项.覆盖率 !== null)
    expect(台.豁免, `FP-30(a2) 台账未豁免：合计${台.合计覆盖率} vs 预算${台.预算}`).toBe(true)
    expect(台.合计覆盖率, `FP-30(a2) 合计应≈0.91（FP-27 两行分摊）：${JSON.stringify(分摊)}`).toBeGreaterThanOrEqual(0.8)
    expect(台.合计覆盖率).toBeLessThanOrEqual(台.预算)
  }
  await context.close()
})

test('FP-30 (b) 环下 0-2px 同色 2px 满强度实线必红', async ({ browser }) => {
  test.setTimeout(600000)
  const { context, page } = await 开页(browser, { 宽: 375, 高: 667 }, 手机号)
  const 静 = await 卡内白条普查(page, '.biaodan-rongqi', 登录字段)
  expect(静.判定带命中.length, `静态前提不成立：未贴线已有命中 ${命中文本(静)}`).toBe(0)
  const 元 = 静.几何.输入框.find((项) => 项.选择器 === 手机号)!
  const 环底 = 环底行(静, 手机号)
  const 左 = Math.round(元.矩形.左) + 2
  const 宽 = Math.round(元.矩形.右) - 2 - 左
  // FP-03 真因线的几何（bottom:0; height:2px）＋ FP-27 豁免色的最坏组合：与环同色、贴着环画
  await 贴线(page, { 标识: 'fp30-b', 起始行: 环底 + 1, 高度: 2, 颜色: 元.outlineColor, 左, 宽 })
  const 贴线普查 = await 卡内白条普查(
    page,
    '.biaodan-rongqi',
    登录字段,
    path.join(截图目录, `FP-30-${模式}-${标签}-b-tongse-2px.png`),
  )
  收档('b-同色2px线', `环底 ${环底} +1/+2 行贴 2px ${元.outlineColor} 实线`, 贴线普查, {
    起始行: 环底 + 1,
    高度: 2,
    颜色: 元.outlineColor,
  })
  expect(
    贴线普查.判定带命中.length,
    `FP-30(b) 漏检：与环同色的 2px 实线被逐行豁免（合计能量已是环厚的 3 倍）：${命中文本(贴线普查)}｜台账 ${台账文本(贴线普查)}`,
  ).toBeGreaterThan(0)
  await context.close()
})

test('FP-30 (b2) 环下 1px 孤立同色满强度实线必红', async ({ browser }) => {
  test.setTimeout(600000)
  const { context, page } = await 开页(browser, { 宽: 375, 高: 667 }, 手机号)
  const 静 = await 卡内白条普查(page, '.biaodan-rongqi', 登录字段)
  expect(静.判定带命中.length, `静态前提不成立：未贴线已有命中 ${命中文本(静)}`).toBe(0)
  const 元 = 静.几何.输入框.find((项) => 项.选择器 === 手机号)!
  const 环底 = 环底行(静, 手机号)
  const 左 = Math.round(元.矩形.左) + 2
  const 宽 = Math.round(元.矩形.右) - 2 - 左
  await 贴线(page, { 标识: 'fp30-b2', 起始行: 环底 + 1, 高度: 1, 颜色: 元.outlineColor, 左, 宽 })
  const 贴线普查 = await 卡内白条普查(
    page,
    '.biaodan-rongqi',
    登录字段,
    path.join(截图目录, `FP-30-${模式}-${标签}-b2-tongse-1px.png`),
  )
  收档('b2-同色1px线', `环底 ${环底} +1 行贴 1px ${元.outlineColor} 孤立满强度实线`, 贴线普查, {
    起始行: 环底 + 1,
    高度: 1,
    颜色: 元.outlineColor,
  })
  expect(
    贴线普查.判定带命中.length,
    `FP-30(b2) 漏检：孤立一行 t≈1 的满强度实线被当作环残影豁免：${命中文本(贴线普查)}｜台账 ${台账文本(贴线普查)}`,
  ).toBeGreaterThan(0)
  await context.close()
})
