import { test, expect, type Page, type Browser } from '@playwright/test'
import path from 'node:path'
import { scanScrollStrip } from './滚动条像素取样'

/**
 * FP-VERIFY-AUTH 态1 · headed 档（滚动条取证必须 headed，headless 会抹掉自绘条）。
 * 覆盖：登录/注册两态 × 960x500/1024x600/375x667/320x480 四档 ——
 * 条宽 ≥7px 恒可见（DOM offsetWidth-clientWidth + 像素扫描双口径）、卡片中心偏差 ≤4px、
 * 无横向溢出、恒定 overflow-y:scroll、零额外 JS 状态类；
 * 并按『FP-04a 口径裁定』实测报告登录态在各档是否真的溢出（scrollHeight/clientHeight 逐档落账）。
 */
const 前缀 = 'FP-VERIFY-AUTH'
const 后缀 = process.env.VERIFY_SUFFIX ? `-${process.env.VERIFY_SUFFIX}` : '-gundong-20260922'
const 截图目录 = path.resolve(process.cwd(), '..', '测试截图')

const 四档 = [
  { 名: '960x500', 宽: 960, 高: 500 },
  { 名: '1024x600', 宽: 1024, 高: 600 },
  { 名: '375x667', 宽: 375, 高: 667 },
  { 名: '320x480', 宽: 320, 高: 480 },
]

const 错误清单: string[] = []
const 警告清单: string[] = []
const 台账: string[] = []

async function 打开登录态(browser: Browser, 主题: string, 档: { 名: string; 宽: number; 高: number }, 标签: string) {
  const ctx = await browser.newContext({ viewport: { width: 档.宽, height: 档.高 }, deviceScaleFactor: 1 })
  await ctx.addInitScript(([z]: string[]) => localStorage.setItem('主题', z), [主题])
  const 页: Page = await ctx.newPage()
  页.on('console', (m) => {
    const 文 = `[${标签}] ${m.type()}: ${m.text().slice(0, 200)}`
    if (m.type() === 'error') 错误清单.push(文)
    else if (m.type() === 'warning') 警告清单.push(文)
  })
  页.on('pageerror', (e) => 错误清单.push(`[${标签}] pageerror: ${String(e).slice(0, 200)}`))
  await 页.goto('/login', { waitUntil: 'domcontentloaded' })
  await 页.waitForSelector('#denglu-shoujihao')
  await 页.waitForTimeout(1500)
  return { ctx, 页 }
}

async function 采集(页: Page, 组合名: string) {
  return 页.evaluate(() => {
    const 口 = document.querySelector('.biaodan-gundong') as HTMLElement
    const 卡 = document.querySelector('.biaodan-rongqi') as HTMLElement
    const 口r = 口.getBoundingClientRect()
    const 卡r = 卡.getBoundingClientRect()
    const 中心X = 口r.left + 口.clientWidth / 2
    const 中心Y = 口r.top + 口.clientHeight / 2
    const cs = getComputedStyle(口)
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      dpr: window.devicePixelRatio,
      overflowY: cs.overflowY,
      额外类: [...口.classList].filter((名) => 名 !== 'biaodan-gundong').join(' '),
      scrollH: 口.scrollHeight,
      clientH: 口.clientHeight,
      溢出: 口.scrollHeight > 口.clientHeight,
      生效条宽: Math.round((口.offsetWidth - 口.clientWidth) * 100) / 100,
      dx: Math.round((卡r.left + 卡r.width / 2 - 中心X) * 100) / 100,
      dy: Math.round((卡r.top + 卡r.height / 2 - 中心Y) * 100) / 100,
      横向溢出: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      口横向溢出: 口.scrollWidth - 口.clientWidth,
    }
  })
}

test.describe('FP-VERIFY-AUTH 居中与恒定滚动口（headed）', () => {
  test.describe.configure({ timeout: 420000 })
  test('两态×四档：条宽恒可见 + 中心偏差 + 登录态溢出实测', async ({ browser }) => {
    for (const 档 of 四档) {
      for (const 模式 of ['登录', '注册'] as const) {
        const 标签 = `${模式}/${档.名}`
        const { ctx, 页 } = await 打开登录态(browser, '暗色', 档, 标签)
        if (模式 === '注册') {
          await 页.locator('.biaoqian-anniu').filter({ hasText: '注册' }).first().click()
          await 页.waitForSelector('#zhuce-shoujihao')
          await 页.waitForTimeout(1500)
        }
        const 值 = await 采集(页, 标签)
        expect([值.innerWidth, 值.innerHeight], `派生 config viewport 自证失败 ${标签}（实读 ${值.innerWidth}x${值.innerHeight}）`).toEqual([档.宽, 档.高])
        let 像素条宽 = -1
        try {
          const 扫 = await scanScrollStrip(页, '.biaodan-gundong', Math.max(8, 值.生效条宽))
          像素条宽 = 扫.条宽
        } catch (e) {
          台账.push(`像素扫描失败 ${标签}: ${String(e).slice(0, 120)}`)
        }
        await 页.screenshot({ path: path.join(截图目录, `${前缀}-gundong-${模式}-${档.名}${后缀}.png`) })
        台账.push(
          `${标签}: scrollH/clientH=${值.scrollH}/${值.clientH} 溢出=${值.溢出} DOM条宽=${值.生效条宽} 像素条宽=${像素条宽} ` +
            `dx=${值.dx} dy=${值.dy} overflowY=${值.overflowY} 额外类='${值.额外类}' 横向溢出=${值.横向溢出}/${值.口横向溢出} dpr=${值.dpr}`,
        )
        expect(值.overflowY, `FP-04a 回归：${标签} 滚动口不是恒定 overflow-y:scroll`).toBe('scroll')
        expect(值.额外类, `FP-04a 回归：${标签} 滚动口宿主长出 JS 状态类`).toBe('')
        expect(值.生效条宽, `FP-04a 回归：${标签} DOM 条宽 <7px（headless 陷阱自证：本档必须 headed）`).toBeGreaterThanOrEqual(7)
        if (像素条宽 >= 0) {
          expect(像素条宽, `FP-04a 回归：${标签} 像素层滚动条 <7px 恒可见（自绘条没画出来）`).toBeGreaterThanOrEqual(7)
        }
        expect(Math.abs(值.dx), `缺陷2 回归：${标签} 卡片水平中心偏差 >4px（${值.dx}）`).toBeLessThanOrEqual(4)
        if (!值.溢出) {
          expect(Math.abs(值.dy), `缺陷2 回归：${标签} 未溢出时垂直中心偏差 >4px（${值.dy}）`).toBeLessThanOrEqual(4)
        }
        expect(值.横向溢出, `回归：${标签} 文档横向溢出 ${值.横向溢出}px`).toBeLessThanOrEqual(0)
        expect(值.口横向溢出, `回归：${标签} 滚动口横向溢出 ${值.口横向溢出}px`).toBeLessThanOrEqual(0)
        if (值.溢出) {
          const 拖 = await 页.evaluate(() => {
            const 口 = document.querySelector('.biaodan-gundong') as HTMLElement
            口.scrollTop = 0
            const 前 = 口.scrollTop
            口.scrollTop = 60
            const 后 = 口.scrollTop
            口.scrollTop = 0
            return { 前, 后 }
          })
          台账.push(`${标签} 溢出可滚验证: scrollTop 0→60 实得 ${拖.后}`)
          expect(拖.后, `FP-04a：${标签} scrollHeight>clientHeight 却滚不动`).toBeGreaterThan(0)
        }
        await ctx.close()
      }
    }
  })

  test('console 汇总：error 必须为 0', async () => {
    const 写 = await import('node:fs')
    写.appendFileSync(
      'D:/xuanr/Desktop/燃烧之陨我的世界服务端/.agents/evidence/traces/FP-VERIFY-AUTHGENDER-20260922.md',
      '\n## 态1 headed 滚动口台账\n\n' + 台账.map((t) => `- ${t}`).join('\n') +
        `\n\nconsole errors=${错误清单.length} warnings=${警告清单.length}\n` +
        错误清单.map((e) => `- ERROR ${e}`).join('\n') + '\n' +
        警告清单.map((w) => `- WARN ${w}`).join('\n') + '\n',
    )
    expect(错误清单, `控制台出现 error：\n${错误清单.join('\n')}`).toHaveLength(0)
  })
})
