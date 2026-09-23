import { test, expect, type Browser } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { 卡内白条普查, 画线元素定位, type 普查结果 } from './焦点白条取样-fp03'

// FP-27 需求 #1「聚焦时输入框 ±6px 带内亮条」的来源取证 + 环残影容差的反证。
// 判据不在此重写，一律复用 tests/焦点白条取样-fp03.ts 的唯一真源。
// 运行（端口 5183，与 5173 的并行 agent 隔离）：
//   定点取证 8 态（约 3 分钟，复跑前必换 FP27_LABEL 以免覆盖旧证据，L-10）：
//     FP27_QUZHENG=1 FP27_LABEL=before|after [FP27_HEADED=1] npx playwright test --config playwright.config-fp27.ts
//   反证（无环境开关，随全量 e2e 一起跑）：npx playwright test tests/fp27-liangtiao-quzheng.spec.ts
// 原始逐态几何/命中/elementsFromPoint 落 .agents/evidence/traces/FP-27-取证-<模式>-<label>.json

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 截图目录 = path.resolve(本目录, '../../测试截图')
// Playwright 每次跑都会清空 outputDir，原始取证数据必须落证据目录而不是 test-results
const 输出目录 = path.resolve(本目录, '../../.agents/evidence/traces')
const 标签 = process.env.FP27_LABEL ?? 'probe'
const 模式 = process.env.FP27_HEADED === '1' ? 'headed' : 'headless'

async function 开页(浏览器: Browser, 主题: string, 视口: { 宽: number; 高: number }) {
  const context = await 浏览器.newContext({ viewport: { width: 视口.宽, height: 视口.高 } })
  await context.addInitScript(([主]: string[]) => localStorage.setItem('主题', 主), [主题])
  const page = await context.newPage()
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#denglu-shoujihao')).toBeVisible({ timeout: 90000 })
  await page.waitForTimeout(2500)
  return { context, page }
}

function 转储(普查: 普查结果) {
  return {
    卡底色: 普查.合成卡底色,
    卡面相对亮度: 普查.卡面相对亮度,
    可视卡矩形: 普查.可视卡矩形,
    输入框: 普查.几何.输入框.map((元) => ({
      选择器: 元.选择器,
      矩形: {
        左: +元.矩形.左.toFixed(2),
        右: +元.矩形.右.toFixed(2),
        上: +元.矩形.上.toFixed(2),
        下: +元.矩形.下.toFixed(2),
      },
      outline: `${元.outlineStyle} ${元.outlineWidthPx} ${元.outlineColor} offset ${元.outlineOffsetPx}`,
      borderTopPx: 元.borderTopPx,
      borderBottomPx: 元.borderBottomPx,
      环占有行: 元.环占有行,
      段: 元.段.map((段) => `${段.名}[${段.行[0]}..${段.行[段.行.length - 1]}]`),
    })),
    判定带命中: 普查.判定带命中.map((命) => ({
      选择器: 命.选择器,
      段: 命.段,
      起始行: 命.条带.起始行,
      结束行: 命.条带.结束行,
      厚度: 命.条带.厚度,
      中位亮条色: 命.条带.中位亮条色,
      相对亮度: 命.条带.相对亮度,
      对卡面色差: 命.条带.对卡面色差,
      档: 命.条带.档,
      连续段宽: 命.条带.连续段宽,
    })),
    全卡普查: 普查.全卡普查.map((条) => ({
      行: `${条.起始行}..${条.结束行}`,
      厚度: 条.厚度,
      色: 条.中位亮条色,
      Δ: 条.对卡面色差,
      档: 条.档,
      最近边: 条.最近边,
      边偏移: 条.边偏移,
      连续宽: 条.连续段宽,
    })),
  }
}

test('FP-27 亮条来源取证（8 态定点）', async ({ browser }) => {
  test.skip(process.env.FP27_QUZHENG !== '1', '取证档需显式 FP27_QUZHENG=1，避免每次全量 e2e 都跑 8 态 3 分钟')
  test.setTimeout(900000)
  const 视口清单 = [
    { 名: '桌面1440x900', 宽: 1440, 高: 900 },
    { 名: '手机375x667', 宽: 375, 高: 667 },
  ]
  const 出: unknown[] = []
  for (const 主题 of ['暗色', '浅色'] as const) {
    for (const 视口 of 视口清单) {
      const { context, page } = await 开页(browser, 主题, 视口)
      for (const 聚焦 of ['#denglu-shoujihao', '#denglu-mima']) {
        await page.click(聚焦)
        await page.waitForTimeout(650)
        const 普查 = await 卡内白条普查(
          page,
          '.biaodan-rongqi',
          ['#denglu-shoujihao', '#denglu-mima'],
          path.join(截图目录, `FP-27-${模式}-${标签}-${主题}-${视口.名}-${聚焦.slice(1)}.png`),
        )
        const 定位 = 普查.判定带命中.slice(0, 3).map((命) => ({
          行: 命.条带.起始行,
          段: `${命.选择器}${命.段}`,
          层: 命.条带.起始行,
        }))
        const 元清单 = await Promise.all(
          定位.map(async (项) => ({
            段: 项.段,
            行: 项.行,
            层: await 画线元素定位(page, 项.行, [
              Math.round(普查.可视卡矩形.左 + 20),
              Math.round((普查.可视卡矩形.左 + 普查.可视卡矩形.右) / 2),
              Math.round(普查.可视卡矩形.右 - 20),
            ]),
          })),
        )
        出.push({ 主题, 视口: 视口.名, 模式, 聚焦, ...转储(普查), 画线元素: 元清单 })
      }
      await context.close()
    }
  }
  fs.mkdirSync(输出目录, { recursive: true })
  fs.writeFileSync(path.join(输出目录, `FP-27-取证-${模式}-${标签}.json`), JSON.stringify(出, null, 2))
  console.log(`FP27_PROBE 写入 ${模式}/${标签}，命中合计`, 出.map((项) => (项 as { 判定带命中: unknown[] }).判定带命中.length))
})

/**
 * 反证（FP-27）：环残影豁免只吃「同色低覆盖率」，异色装饰线必须照样落网。
 * 在聚焦输入框下边框外 1px（正是被豁免的那一行）贴一条 1px 香槟金 #e3c98e 线——
 * 它就是 FP-03 真因那条线的色值与位置。命中数必须 ≥1，否则说明容差把检测力一起删了。
 */
test('FP-27 反证 异色装饰线不被环容差豁免', async ({ browser }) => {
  test.setTimeout(600000)
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 1 })
  await context.addInitScript(() => localStorage.setItem('主题', '暗色'))
  const page = await context.newPage()
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#denglu-shoujihao')).toBeVisible({ timeout: 90000 })
  await page.waitForTimeout(2500)
  await page.click('#denglu-shoujihao')
  await page.waitForTimeout(650)
  const 静 = await 卡内白条普查(page, '.biaodan-rongqi', ['#denglu-shoujihao', '#denglu-mima'])
  expect(静.判定带命中.length, '反证前提不成立：未聚焦态本就没有命中，贴线也无从对照').toBe(0)
  const 金线 = await page.evaluate(() => {
    const 元 = document.querySelector('#denglu-shoujihao') as HTMLElement
    const rr = 元.getBoundingClientRect()
    const 线 = document.createElement('div')
    线.style.cssText = `position:fixed;left:${rr.left + 2}px;top:${Math.floor(rr.bottom) + 1}px;width:${
      rr.width - 4
    }px;height:1px;background:#e3c98e;z-index:99999;pointer-events:none`
    document.body.appendChild(线)
    return { 行: Math.floor(rr.bottom) + 1, 宽: rr.width }
  })
  await page.waitForTimeout(200)
  const 贴线 = await 卡内白条普查(
    page,
    '.biaodan-rongqi',
    ['#denglu-shoujihao', '#denglu-mima'],
    path.join(截图目录, `FP-27-${模式}-fanzheng-金线-${标签}.png`),
  )
  console.log('FP27_反证 金线行', 金线.行, '命中', 贴线.判定带命中.length, 贴线.判定带命中.map((命) => `${命.段} ${命.条带.起始行} ${命.条带.中位亮条色} Δ=${命.条带.对卡面色差}`).join(' / '))
  await context.close()
  expect(贴线.判定带命中.length, `FP-27 反证失败：#e3c98e 香槟金装饰线被环容差吞掉（环残影豁免误伤异色线）`).toBeGreaterThan(0)
})
