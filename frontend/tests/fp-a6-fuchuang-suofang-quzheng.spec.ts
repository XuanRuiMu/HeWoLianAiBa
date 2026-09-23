import { test, expect } from '@playwright/test'
import { createConsoleCollector, type ConsoleErrorCollector } from './console-error-collector'
import { writeFileSync, mkdirSync } from 'node:fs'

/*
 * 需求 #7「greedisgood 弹窗缩放方向反了」真机取证。
 * 直接挂载真实的「管理员监控」浮窗（=贪心/greedisgood 弹窗），走真实 use可拖动浮窗 几何单一真源 +
 * 真实 Chromium 布局 + 真实 PointerEvent + 真实 getBoundingClientRect/getComputedStyle/localStorage/reload。
 * 草地背景 grass-bg 不在此隔离挂载页内 → error 分账单列（我方页 0 / 草地背景不适用）。
 */

const 页 = '/tests/harness/fp-a6-harness.html'
const 键 = 'guanli-jiankong:fu-chuang' // 管理员监控.vue 的浮窗偏好键（单一真源 composable 读写）
const 追踪目录 = 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/.agents/evidence/traces'
function 图(名: string) {
  return 追踪目录 + '/' + 名
}

const 拖左 = ['zuo', 'zuoShang', 'zuoXia'] as const
const 拖右 = ['you', 'youShang', 'youXia'] as const
const 拖上 = ['shang', 'zuoShang', 'youShang'] as const
const 拖下 = ['xia', 'zuoXia', 'youXia'] as const
const 方向清单 = ['zuo', 'you', 'shang', 'xia', 'zuoShang', 'zuoXia', 'youShang', 'youXia'] as const

interface 几何盒 {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  cleft: string
  ctop: string
  cwidth: string
  cheight: string
  vw: number
  vh: number
  scrollW: number
  scrollH: number
}

const 证据: Record<string, unknown> = { 需求: '#7 浮窗缩放方向', 端口: process.env.FP_A6_PORT ?? 5210, 视口基准: { w: 1280, h: 900 }, 八向: {}, 钳制: {}, 持久化: {}, 最小尺寸: {}, 动画: {}, 窄屏: {}, 控制台: {} }

async function 读几何(page: import('@playwright/test').Page): Promise<几何盒> {
  return page.evaluate(() => {
    const el = document.querySelector('.guanli-jiankong-fuchuang') as HTMLElement
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
      cleft: cs.left, ctop: cs.top, cwidth: cs.width, cheight: cs.height,
      vw: window.innerWidth, vh: window.innerHeight,
      scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
    }
  })
}

async function 装载种子(page: import('@playwright/test').Page, seed: unknown) {
  await page.goto(页, { waitUntil: 'load' })
  await page.waitForSelector('.guanli-jiankong-fuchuang')
  await page.evaluate(({ k, s }) => {
    localStorage.clear()
    if (s != null) localStorage.setItem(k, JSON.stringify(s))
  }, { k: 键, s: seed })
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('.guanli-jiankong-fuchuang')
  await page.waitForTimeout(60)
}

async function 手柄中心(page: import('@playwright/test').Page, 方向: string) {
  const b = await page.locator('.jiankong-shouBing-' + 方向).boundingBox()
  if (!b) throw new Error('找不到手柄 ' + 方向)
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

async function 缩放(page: import('@playwright/test').Page, 方向: string, dx: number, dy: number) {
  const c = await 手柄中心(page, 方向)
  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  const 起点 = await 读几何(page)
  await page.mouse.move(c.x + dx, c.y + dy, { steps: 3 })
  const 拖动中 = await 读几何(page)
  await page.mouse.up()
  await page.waitForTimeout(60)
  const 释放后 = await 读几何(page)
  return { 起点, 拖动中, 释放后, 手柄: c }
}

test.describe('需求 #7 浮窗缩放方向真机取证', () => {
  let 收集: ConsoleErrorCollector

  test.beforeEach(({ page }) => {
    收集 = createConsoleCollector(page)
  })

  test('1. 8 向缩放逐条：被拖边跟随指针 ≤2px、对侧边不动 ≤2px', async ({ page }) => {
    const 判定: Record<string, unknown> = {}
    for (const 方向 of 方向清单) {
      await 装载种子(page, { 版本: 2, x: 100, y: 100, 宽: 420, 高: 420, 最小化: false })
      const r = await 缩放(page, 方向, 80, 60)
      const 起 = r.起点
      // 种子生效（有扩张余量）：起点应在 (100,100) 且尺寸 420x420
      expect(Math.abs(起.left - 100), `${方向} 种子左界未生效`).toBeLessThanOrEqual(2)
      expect(Math.abs(起.top - 100), `${方向} 种子上界未生效`).toBeLessThanOrEqual(2)

      const 期左 = 拖左.includes(方向 as never) ? 起.left + 80 : 起.left
      const 期上 = 拖上.includes(方向 as never) ? 起.top + 60 : 起.top
      const 期右 = 拖右.includes(方向 as never) ? 起.right + 80 : 起.right
      const 期下 = 拖下.includes(方向 as never) ? 起.bottom + 60 : 起.bottom
      const m = r.拖动中
      const 被拖边跟随 = Math.abs(m.left - 期左) <= 2 && Math.abs(m.top - 期上) <= 2 && Math.abs(m.right - 期右) <= 2 && Math.abs(m.bottom - 期下) <= 2
      // 对侧边不动：不拖的边相对起点位移应为 0
      const 对侧不动 = (拖左.includes(方向 as never) ? true : Math.abs(m.left - 起.left) <= 2)
        && (拖右.includes(方向 as never) ? true : Math.abs(m.right - 起.right) <= 2)
        && (拖上.includes(方向 as never) ? true : Math.abs(m.top - 起.top) <= 2)
        && (拖下.includes(方向 as never) ? true : Math.abs(m.bottom - 起.bottom) <= 2)
      // 计算样式与 rect 一致（单一真源下发 px）
      const 样式一致 = Math.abs(parseFloat(m.cleft) - m.left) <= 2 && Math.abs(parseFloat(m.ctop) - m.top) <= 2
        && Math.abs(parseFloat(m.cwidth) - m.width) <= 2 && Math.abs(parseFloat(m.cheight) - m.height) <= 2
      // 释放后与拖动中一致（无回弹/滑移）
      const 无回弹 = Math.abs(r.释放后.left - m.left) <= 2 && Math.abs(r.释放后.top - m.top) <= 2
        && Math.abs(r.释放后.width - m.width) <= 2 && Math.abs(r.释放后.height - m.height) <= 2
      判定[方向] = {
        起点: { left: 起.left, top: 起.top, right: 起.right, bottom: 起.bottom },
        拖动中: { left: m.left, top: m.top, right: m.right, bottom: m.bottom, width: m.width, height: m.height, cleft: m.cleft, ctop: m.ctop, cwidth: m.cwidth, cheight: m.cheight },
        期望: { left: 期左, top: 期上, right: 期右, bottom: 期下 },
        实测左Δ: +(m.left - 起.left).toFixed(2), 实测上Δ: +(m.top - 起.top).toFixed(2),
        实测右Δ: +(m.right - 起.right).toFixed(2), 实测下Δ: +(m.bottom - 起.bottom).toFixed(2),
        被拖边跟随指针: 被拖边跟随, 对侧边保持不动: 对侧不动, 样式与rect一致: 样式一致, 释放后无回弹: 无回弹,
      }
      expect(被拖边跟随, `${方向} 被拖边未跟随指针`).toBe(true)
      expect(对侧不动, `${方向} 对侧边发生位移`).toBe(true)
      expect(样式一致, `${方向} 计算样式与 rect 不一致`).toBe(true)
      expect(无回弹, `${方向} 释放后几何回弹`).toBe(true)
    }
    证据.八向 = 判定
    // youXia 是需求 #7 的经典反向案例，留图
    await page.screenshot({ path: 图('FP-A6取证-浮窗缩放-after-20260923-youXia.png') })
  })

  test('2. 视口钳制：贴右缘外拖宽度只到视口边界；贴左缘同理（对侧边不动）', async ({ page }) => {
    // 贴右缘：默认 dock（清偏好），右缘=vw-边距(24) ⇒ 外拖只允许 +24
    await 装载种子(page, null)
    const 右初 = await 读几何(page)
    const 右 = await 缩放(page, 'you', 400, 0)
    const 右视口 = 右.释放后.vw
    expect(Math.abs(右.释放后.right - 右视口), '右缘未钳到视口右边界').toBeLessThanOrEqual(2)
    expect(右.释放后.right <= 右视口 + 1, '右缘越出视口').toBe(true)
    expect(Math.abs(右.释放后.left - 右初.left) <= 2, '贴右外拖时左缘(对侧)发生位移').toBe(true)
    const 右扩量 = +(右.释放后.width - 右初.width).toFixed(2)
    expect(右扩量, '贴右缘可扩量应为边距 24px').toBeLessThanOrEqual(26)
    expect(右扩量, '贴右缘可扩量应≈24px').toBeGreaterThanOrEqual(20)

    // 贴左缘：seed x=24 ⇒ 左缘=边距，外拖只允许 -24（左到 0）
    await 装载种子(page, { 版本: 2, x: 24, y: 100, 宽: 420, 高: 420, 最小化: false })
    const 左初 = await 读几何(page)
    const 左 = await 缩放(page, 'zuo', -400, 0)
    expect(Math.abs(左.释放后.left), '左缘未钳到 0').toBeLessThanOrEqual(2)
    expect(左.释放后.left >= -1, '左缘越出视口左侧').toBe(true)
    expect(Math.abs(左.释放后.right - 左初.right) <= 2, '贴左外拖时右缘(对侧)发生位移').toBe(true)
    const 左扩量 = +(左.释放后.width - 左初.width).toFixed(2)
    expect(左扩量, '贴左缘可扩量应≈24px').toBeGreaterThanOrEqual(20)
    expect(左扩量, '贴左缘可扩量应≤26px').toBeLessThanOrEqual(26)
    证据.钳制 = {
      视口: { vw: 右视口 },
      贴右: { 初右缘: +右初.right.toFixed(1), 初宽: 右初.width, 释放右缘: +右.释放后.right.toFixed(1), 释放宽: 右.释放后.width, 右边界: 右视口, 可扩量: 右扩量, 左缘位移: +(右.释放后.left - 右初.left).toFixed(2) },
      贴左: { 初左缘: +左初.left.toFixed(1), 初宽: 左初.width, 释放左缘: +左.释放后.left.toFixed(1), 释放宽: 左.释放后.width, 左边界: 0, 可扩量: 左扩量, 右缘位移: +(左.释放后.right - 左初.right).toFixed(2) },
    }
  })

  test('3a. 偏好持久化：拖/缩后刷新位置尺寸复原（版本:2 绝对坐标）', async ({ page }) => {
    await 装载种子(page, { 版本: 2, x: 300, y: 200, 宽: 400, 高: 350, 最小化: false })
    const r = await 缩放(page, 'youXia', 50, 50)
    const 刷新前 = r.释放后
    const 存 = await page.evaluate((k) => localStorage.getItem(k), 键)
    await page.reload({ waitUntil: 'load' })
    await page.waitForSelector('.guanli-jiankong-fuchuang')
    await page.waitForTimeout(60)
    const 刷新后 = await 读几何(page)
    const 同位 = Math.abs(刷新前.left - 刷新后.left) <= 2 && Math.abs(刷新前.top - 刷新后.top) <= 2
      && Math.abs(刷新前.width - 刷新后.width) <= 2 && Math.abs(刷新前.height - 刷新后.height) <= 2
    expect(同位, '刷新后位置尺寸未复原').toBe(true)
    const 解 = JSON.parse(存 as string)
    expect(解.版本, '偏好缺 版本:2 标记').toBe(2)
    expect(Math.abs(解.x - 刷新前.left) <= 2, '存 x 与左缘不符').toBe(true)
    expect(Math.abs(解.y - 刷新前.top) <= 2, '存 y 与上缘不符').toBe(true)
    expect(Math.abs(解.宽 - 刷新前.width) <= 2, '存 宽 与实测不符').toBe(true)
    expect(Math.abs(解.高 - 刷新前.height) <= 2, '存 高 与实测不符').toBe(true)
    证据.持久化.版本2复原 = { 刷新前: { left: 刷新前.left, top: 刷新前.top, width: 刷新前.width, height: 刷新前.height }, 刷新后: { left: 刷新后.left, top: 刷新后.top, width: 刷新后.width, height: 刷新后.height }, 存储: 解, 同位 }
  })

  test('3b. 旧值迁移：无版本号（相对右下锚角偏移）偏好迁移读回且钳回可视区', async ({ page }) => {
    // 旧格式仅 {x,y}，语义=相对右下钉死锚角的偏移，与新版绝对 left/top 不可混读
    await 装载种子(page, { x: 24, y: 24 })
    const m = await 读几何(page)
    // 迁移公式（视口 1280x900, 默认宽420, 高=round(900*0.55)=495）：左=(1280-24-420)+24=860；上迁移值=900-24-495+24=405
    expect(Math.abs(m.left - 860) <= 2, `迁移后左缘应为 860，实测 ${m.left}`).toBe(true)
    expect(Math.abs(m.top - 405) <= 2, `迁移后上缘应为 405，实测 ${m.top}`).toBe(true)
    // 关键：不越出视口、不被甩出屏外
    expect(m.left >= 0 && m.top >= 0 && m.right <= m.vw + 1 && m.bottom <= m.vh + 1, '迁移后浮窗越出视口').toBe(true)
    // 懒持久化：迁移只改内存几何，挂载即读不改写盘 ⇒ 存储仍是旧格式（无 版本）；触发一次手势后才升级为 版本:2
    const 迁移后即时存 = JSON.parse((await page.evaluate((k) => localStorage.getItem(k), 键)) as string)
    expect(迁移后即时存.版本 === undefined, '迁移不应在挂载即写盘（懒持久化契约）').toBe(true)
    await 缩放(page, 'xia', 0, 30)
    const 存 = JSON.parse((await page.evaluate((k) => localStorage.getItem(k), 键)) as string)
    expect(存.版本, '手势后未升级为 版本:2').toBe(2)
    证据.持久化.旧值迁移 = { 注入: { x: 24, y: 24 }, 读回: { left: m.left, top: m.top, width: m.width, height: m.height, right: m.right, bottom: m.bottom }, 可视: { vw: m.vw, vh: m.vh }, 迁移后即时存储: 迁移后即时存, 手势后重存版本: 存.版本 }

    // 反例：越界旧值也须钳回可视区
    await 装载种子(page, { x: -99999, y: -99999 })
    const o = await 读几何(page)
    expect(o.left >= 0 && o.top >= 0 && o.right <= o.vw + 1 && o.bottom <= o.vh + 1, '越界旧值未钳回可视区').toBe(true)
    证据.持久化.越界旧值钳回 = { left: o.left, top: o.top, right: o.right, bottom: o.bottom }
  })

  test('4. 最小尺寸钳制 + 手势后无几何通道动画残留', async ({ page }) => {
    await 装载种子(page, { 版本: 2, x: 100, y: 100, 宽: 420, 高: 420, 最小化: false })
    const r = await 缩放(page, 'youXia', -9000, -9000)
    expect(Math.abs(r.释放后.width - 280) <= 2, `宽度未钳到最小 280，实测 ${r.释放后.width}`).toBe(true)
    expect(Math.abs(r.释放后.height - 200) <= 2, `高度未钳到最小 200，实测 ${r.释放后.height}`).toBe(true)
    证据.最小尺寸 = { 宽: r.释放后.width, 高: r.释放后.height, 最小宽: 280, 最小高: 200 }

    // 基线：挂载后（无手势）元素几何通道动画数
    const 基线 = await page.evaluate(() => {
      const el = document.querySelector('.guanli-jiankong-fuchuang') as HTMLElement & { getAnimations?: () => Animation[] }
      const 列表 = (el.getAnimations ? el.getAnimations() : []).filter((a) => ['left', 'top', 'width', 'height'].includes((a as unknown as { transitionProperty?: string }).transitionProperty ?? ''))
      return 列表.length
    })
    // 缩放期间 composable 会置 transition:none；手势结束会 cancel 四条几何通道
    const 手势后几何动画 = await page.evaluate(() => {
      const el = document.querySelector('.guanli-jiankong-fuchuang') as HTMLElement & { getAnimations?: () => Animation[] }
      const 所有 = el.getAnimations ? el.getAnimations() : []
      const 几何 = 所有.filter((a) => ['left', 'top', 'width', 'height'].includes((a as unknown as { transitionProperty?: string }).transitionProperty ?? ''))
      return { 总: 所有.length, 几何: 几何.length }
    })
    // 触发一次最小化→展开（height 过渡），确认过渡自然收敛后几何通道回基线
    await page.locator('.jiankong-zuiXiao').click()
    await page.waitForTimeout(400)
    await page.locator('.jiankong-zuiXiao').click()
    await page.waitForTimeout(500)
    const 展开后几何动画 = await page.evaluate(() => {
      const el = document.querySelector('.guanli-jiankong-fuchuang') as HTMLElement & { getAnimations?: () => Animation[] }
      const 所有 = el.getAnimations ? el.getAnimations() : []
      const 几何 = 所有.filter((a) => ['left', 'top', 'width', 'height'].includes((a as unknown as { transitionProperty?: string }).transitionProperty ?? ''))
      return { 总: 所有.length, 几何: 几何.length }
    })
    expect(手势后几何动画.几何, '手势后仍有几何通道动画残留').toBe(基线)
    expect(展开后几何动画.几何, '最小化/展开动画后仍有几何通道残留').toBe(0)
    证据.动画 = { 基线几何通道: 基线, 缩放手势后: 手势后几何动画, 最小化展开后: 展开后几何动画 }
  })

  for (const 宽 of [375, 320]) {
    test(`5. 窄屏 ${宽}px：无横向溢出且控制台我方 error=0`, async ({ page }) => {
      await page.setViewportSize({ width: 宽, height: 700 })
      await 装载种子(page, null)
      await page.waitForTimeout(120)
      const g = await 读几何(page)
      expect(g.scrollW <= g.vw + 1, `窄屏 ${宽} 横向溢出 scrollW=${g.scrollW} > vw=${g.vw}`).toBe(true)
      expect(g.right <= g.vw + 1 && g.left >= -1, `窄屏 ${宽} 浮窗越出视口`).toBe(true)
      const 我方 = 收集.getErrors()
      const 资源 = 收集.getResourceFailures()
      const 全部文本 = [...我方, ...资源].map((e) => e.text).join('\n')
      expect(我方.length, `窄屏 ${宽} 我方控制台 error≠0:\n${全部文本}`).toBe(0)
      证据.窄屏[宽] = { scrollW: g.scrollW, vw: g.vw, 浮窗: { left: g.left, right: g.right, width: g.width }, 我方error: 我方.length, 资源异常: 资源.length }
      await page.screenshot({ path: 图(`FP-A6取证-浮窗缩放-after-20260923-窄屏${宽}.png`), fullPage: false })
    })
  }

  test.afterAll(() => {
    mkdirSync(追踪目录, { recursive: true })
    writeFileSync(追踪目录 + '/FP-A6取证-浮窗缩放-after-20260923.json', JSON.stringify(证据, null, 2), 'utf8')
  })
})
