import { test, expect, type Page, type Browser } from '@playwright/test'
import path from 'node:path'
import { 卡内白条普查, 该字段可扫 } from './焦点白条取样-fp03'

/**
 * FP-VERIFY-AUTH 态1（登录/注册页）· headless 档。
 * 判据全部走取样真源 tests/焦点白条取样-fp03.ts（FP-30 能量守恒豁免），本文件不写第二份白条判据。
 * 覆盖：白条命中=0（深浅×1440x900/390x844，登录2字段+注册5字段）、.dixian-dixian 元素与规则=0、
 * 静置发丝线 Δ（对照 FP-03c 记的 22.5/23.2 与门限 24）、环缺口 4x 成对截图、字段间距（FP-04b）、
 * 320x480 注册卡顶部可达、console 记账。
 */
const 前缀 = 'FP-VERIFY-AUTH'
const 后缀 = process.env.VERIFY_SUFFIX ? `-${process.env.VERIFY_SUFFIX}` : '-20260922'
const 截图目录 = path.resolve(process.cwd(), '..', '测试截图')

const 登录字段 = ['#denglu-shoujihao', '#denglu-mima']
const 注册字段 = [
  '#zhuce-shoujihao',
  '#zhuce-yanzhengma',
  '#zhuce-yonghuming',
  '#zhuce-mima',
  '#zhuce-chushengriqi',
]

type 组合 = { 名: string; 主题: '暗色' | '浅色'; 宽: number; 高: number }
const 四组合: 组合[] = [
  { 名: 'dark-1440x900', 主题: '暗色', 宽: 1440, 高: 900 },
  { 名: 'light-1440x900', 主题: '浅色', 宽: 1440, 高: 900 },
  { 名: 'dark-390x844', 主题: '暗色', 宽: 390, 高: 844 },
  { 名: 'light-390x844', 主题: '浅色', 宽: 390, 高: 844 },
]

const 错误清单: string[] = []
const 警告清单: string[] = []
const 台账: string[] = []

function 挂console(页: Page, 标签: string) {
  页.on('console', (m) => {
    const 文 = `[${标签}] ${m.type()}: ${m.text().slice(0, 200)}`
    if (m.type() === 'error') 错误清单.push(文)
    else if (m.type() === 'warning') 警告清单.push(文)
  })
  页.on('pageerror', (e) => 错误清单.push(`[${标签}] pageerror: ${String(e).slice(0, 200)}`))
}

async function 建上下文(browser: Browser, 组: { 主题: string; 宽: number; 高: number }, dsf = 1) {
  const ctx = await browser.newContext({
    viewport: { width: 组.宽, height: 组.高 },
    deviceScaleFactor: dsf,
  })
  await ctx.addInitScript(([z]: string[]) => localStorage.setItem('主题', z), [组.主题])
  return ctx
}

async function 打开登录(页: Page, 标签: string) {
  挂console(页, 标签)
  await 页.goto('/login', { waitUntil: 'domcontentloaded' })
  await 页.waitForSelector('#denglu-shoujihao')
  await 页.waitForTimeout(1200)
}

async function 切到注册(页: Page) {
  await 页.locator('.biaoqian-anniu').filter({ hasText: '注册' }).first().click()
  await 页.waitForSelector('#zhuce-shoujihao')
  await 页.waitForTimeout(1200)
}

/** 聚焦一个字段并把字段完整滚进可视卡面，然后跑取样真源普查 */
async function 聚焦普查(页: Page, 选择器: string, 全部字段: string[], 存图?: string) {
  await 页.evaluate((选) => {
    const el = document.querySelector(选) as HTMLElement | null
    el?.scrollIntoView({ block: 'center' })
  }, 选择器)
  await 页.waitForTimeout(200)
  await 页.evaluate((选) => (document.querySelector(选) as HTMLElement).focus(), 选择器)
  await 页.waitForTimeout(400)
  return 卡内白条普查(页, '.biaodan-rongqi', 全部字段, 存图)
}

test.describe('FP-VERIFY-AUTH 白条/静置/间距（headless）', () => {
  test.describe.configure({ timeout: 420000 })
  for (const 组 of 四组合) {
    test(`聚焦白条+dixian（${组.名}）`, async ({ browser }) => {
      const ctx = await 建上下文(browser, 组)
      const 页 = await ctx.newPage()
      await 打开登录(页, `登录/${组.名}`)
      for (const [序, 选] of 登录字段.entries()) {
        const 普查 = await 聚焦普查(页, 选, [选], 序 === 0 ? path.join(截图目录, `${前缀}-baitiao-${组.名}-denglu-${选.slice(1)}${后缀}.png`) : undefined)
        const 可扫 = 该字段可扫(普查, 选)
        台账.push(`白条 ${组.名} 登录 ${选} 可扫=${可扫} 判定带命中=${可扫 ? 普查.判定带命中.length : 'n/a'} 明细=${JSON.stringify(普查.判定带命中.map((h) => `${h.段}:${h.条带.中位亮条色} Δ${h.条带.对卡面色差}`))}`)
        if (可扫) expect(普查.判定带命中, `需求#1 白条回归 ${组.名} ${选}`).toHaveLength(0)
      }
      await 切到注册(页)
      for (const [序, 选] of 注册字段.entries()) {
        const 普查 = await 聚焦普查(页, 选, [选], 序 === 0 ? path.join(截图目录, `${前缀}-baitiao-${组.名}-zhuce-${选.slice(1)}${后缀}.png`) : undefined)
        const 可扫 = 该字段可扫(普查, 选)
        台账.push(`白条 ${组.名} 注册 ${选} 可扫=${可扫} 判定带命中=${可扫 ? 普查.判定带命中.length : 'n/a'} 明细=${JSON.stringify(普查.判定带命中.map((h) => `${h.段}:${h.条带.中位亮条色} Δ${h.条带.对卡面色差}`))}`)
        if (可扫) expect(普查.判定带命中, `需求#1 白条回归 ${组.名} ${选}`).toHaveLength(0)
      }
      const 装饰线 = await 页.evaluate(() => {
        const 元素数 = document.querySelectorAll('.dixian-dixian').length
        let 规则数 = 0
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const r of Array.from(sheet.cssRules || [])) {
              if ((r as CSSStyleRule).selectorText && (r as CSSStyleRule).selectorText.includes('dixian')) 规则数++
            }
          } catch {
            /* 跨源样式表读不了：跳过（本仓样式全部同源内联/vite 注入） */
          }
        }
        return { 元素数, 规则数 }
      })
      台账.push(`dixian ${组.名}: 元素=${装饰线.元素数} 规则=${装饰线.规则数}`)
      expect(装饰线.元素数, `.dixian-dixian 元素残留 ${组.名}`).toBe(0)
      expect(装饰线.规则数, `.dixian-dixian CSS 规则残留 ${组.名}`).toBe(0)
      await ctx.close()
    })
  }

  test('静置：发丝线可见不成条带（实测Δ）+ 全卡普查 + 环缺口4x成对 + 标签衬底令牌', async ({ browser }) => {
    for (const 主题 of ['暗色', '浅色'] as const) {
      const ctx = await 建上下文(browser, { 主题, 宽: 1440, 高: 900 })
      const 页 = await ctx.newPage()
      const 标 = `静置/${主题}`
      await 打开登录(页, 标)
      await 页.locator('.biaodan-tou, h2, .biaoqian-qiehuan').first().click().catch(() => {})
      await 页.waitForTimeout(400)
      const 普查 = await 卡内白条普查(
        页,
        '.biaodan-rongqi',
        登录字段,
        path.join(截图目录, `${前缀}-jingzhi-${主题}-1440x900${后缀}.png`),
      )
      // 直接对 border-bottom 行取色：发丝线应可见（Δ 明显 >0）但低于条带门限 24
      const 线Δ = await 页.evaluate(async (参) => {
        const 元 = document.querySelector('#denglu-shoujihao') as HTMLElement
        const r = 元.getBoundingClientRect()
        return { top: Math.floor(r.bottom) - 1, bottom: Math.ceil(r.bottom) + 1, left: r.left + 4, width: r.width - 8 }
      })
      const 图 = await 页.screenshot({
        clip: { x: 线Δ.left, y: 线Δ.top, width: 线Δ.width, height: 线Δ.bottom - 线Δ.top },
        animations: 'disabled',
      })
      const { default: sharp } = await import('sharp')
      const { data, info } = await sharp(图).raw().toBuffer({ resolveWithObject: true })
      const 拆 = (c: string) => c.match(/[\d.]+/g)!.map(Number)
      const 底 = 拆(普查.合成卡底色)
      let 最大Δ = 0
      let 最大色 = ''
      for (let x = 0; x < info.width; x++) {
        for (let y = 0; y < info.height; y++) {
          const i = (y * info.width + x) * info.channels
          const c = [data[i], data[i + 1], data[i + 2]]
          const d = Math.max(Math.abs(c[0] - 底[0]), Math.abs(c[1] - 底[1]), Math.abs(c[2] - 底[2]))
          if (d > 最大Δ) { 最大Δ = d; 最大色 = `rgb(${c.join(',')})` }
        }
      }
      const 静置命中 = 普查.判定带命中.length
      台账.push(`静置 ${主题}: 卡底=${普查.合成卡底色} 发丝线最大Δ=${最大Δ}(${最大色}) 判定带命中=${静置命中} 全卡条带=${普查.全卡普查.length} 全卡明细=${JSON.stringify(普查.全卡普查.map((条) => `行${条.起始行}-${条.结束行} ${条.中位亮条色} Δ${条.对卡面色差} 宽${条.连续段宽} ${条.最近边}@${条.边偏移}`))}`)
      expect(最大Δ, `FP-03c 回归：${主题} 静置发丝线不可见（Δ=${最大Δ}）`).toBeGreaterThanOrEqual(2)
      expect(最大Δ, `FP-03c 回归：${主题} 静置线成条带（Δ=${最大Δ} ≥24）`).toBeLessThan(24)
      expect(静置命中, `${主题} 静置判定带出现条带`).toBe(0)

      // 标签衬底吃卡面令牌（Material notched-outline 同构缺口的前提）
      const 标底 = await 页.evaluate(() => {
        const 标 = document.querySelector('.fudong-biaoqian') as HTMLElement
        const 根 = getComputedStyle(document.documentElement)
        return {
          标签背景: getComputedStyle(标).backgroundColor,
          令牌: 根.getPropertyValue('--renzheng-mian-se').trim(),
          线色令牌: 根.getPropertyValue('--renzheng-shuru-xian-se').trim(),
          线色实测: getComputedStyle(document.querySelector('#denglu-shoujihao') as HTMLElement).borderBottomColor,
        }
      })
      台账.push(`令牌 ${主题}: 标签背景=${标底.标签背景} --renzheng-mian-se=${标底.令牌} 边框线色实测=${标底.线色实测} 令牌=${标底.线色令牌}`)

      // 环缺口 4x 成对截图（静置 vs 聚焦：环上边线是否穿浮动标签字脚）
      const ctx4 = await 建上下文(browser, { 主题, 宽: 1440, 高: 900 }, 4)
      const 页4 = await ctx4.newPage()
      await 打开登录(页4, `4x/${主题}`)
      const 取样区 = await 页4.evaluate(() => {
        const 元 = document.querySelector('#denglu-shoujihao') as HTMLElement
        const 标 = document.querySelector('.fudong-biaoqian') as HTMLElement
        const r = 元.getBoundingClientRect()
        const b = 标.getBoundingClientRect()
        return { x: r.left - 6, y: Math.min(r.top, b.top) - 12, width: r.width + 12, height: Math.max(34, r.top - Math.min(r.top, b.top) + 26) }
      })
      await 页4.screenshot({ path: path.join(截图目录, `${前缀}-huan-quekou-${主题}-4x-jingzhi${后缀}.png`), clip: 取样区 })
      await 页4.click('#denglu-shoujihao')
      await 页4.waitForTimeout(500)
      await 页4.screenshot({ path: path.join(截图目录, `${前缀}-huan-quekou-${主题}-4x-jujiao${后缀}.png`), clip: 取样区 })
      台账.push(`4x 成对截图已落：${主题} jingzhi/jujiao`)
      await ctx4.close()
      await ctx.close()
    }
  })

  test('FP-04b 字段间距实测（对照预测 32/27/16/10）+ 320x480 注册卡顶部可达', async ({ browser }) => {
    const 采间隙 = async (页: Page, 模式名: string) => {
      const 值 = await 页.evaluate(() => {
        const 组清单 = Array.from(document.querySelectorAll('.biaodan-neirong-qu form > .shuru-zu, .biaodan-neirong-qu .shuru-zu')) as HTMLElement[]
        const 可见 = 组清单.filter((元) => 元.getBoundingClientRect().height > 0 && 元.offsetParent !== null)
        const 间隙: number[] = []
        for (let i = 1; i < 可见.length; i++) {
          间隙.push(Math.round((可见[i].getBoundingClientRect().top - 可见[i - 1].getBoundingClientRect().bottom) * 100) / 100)
        }
        const 总高 = 可见.length
          ? Math.round((可见[可见.length - 1].getBoundingClientRect().bottom - 可见[0].getBoundingClientRect().top) * 100) / 100
          : 0
        const 内缘 = 可见.map((组) => {
          const 标 = 组.querySelector('.fudong-biaoqian') as HTMLElement | null
          const 列 = Array.from(组.querySelectorAll('input')) as HTMLElement[]
          const 列间隙 =
            列.length > 1
              ? Math.round((列[1].getBoundingClientRect().left - 列[0].getBoundingClientRect().right) * 100) / 100
              : null
          return {
            标底到输入顶: 标 && 列[0] ? Math.round((列[0].getBoundingClientRect().top - 标.getBoundingClientRect().bottom) * 100) / 100 : null,
            列间隙,
          }
        })
        const 卡 = document.querySelector('.biaodan-rongqi') as HTMLElement
        return { 组数: 可见.length, 间隙, 内缘, 字段区总高: 总高, 卡高: Math.round(卡.getBoundingClientRect().height) }
      })
      台账.push(`间距 ${模式名}: 组数=${值.组数} 逐对间隙=${JSON.stringify(值.间隙)} 内缘=${JSON.stringify(值.内缘)} 字段区总高=${值.字段区总高} 卡高=${值.卡高}`)
      for (const 间 of 值.间隙) expect(间, `FP-04b：${模式名} 出现 <8px 间隙 ${间}`).toBeGreaterThanOrEqual(8)
      for (const 间 of 值.间隙) expect(间, `FP-04b：${模式名} 间隙异常大（>60）`).toBeLessThanOrEqual(60)
      return 值
    }
    for (const 主题 of ['暗色', '浅色'] as const) {
      const ctx = await 建上下文(browser, { 主题, 宽: 1440, 高: 900 })
      const 页 = await ctx.newPage()
      await 打开登录(页, `间距/${主题}`)
      await 采间隙(页, `登录 1440 ${主题}`)
      await 切到注册(页)
      await 采间隙(页, `注册 1440 ${主题}`)
      await ctx.close()
    }
    // 320x480 注册卡：溢出后顶部可达（滚回顶后第一字段完整可见）
    const ctx = await 建上下文(browser, { 主题: '暗色', 宽: 320, 高: 480 })
    const 页 = await ctx.newPage()
    await 打开登录(页, '间距/320注册')
    await 切到注册(页)
    await 页.click('#zhuce-chushengriqi')
    await 页.waitForTimeout(400)
    const 可达 = await 页.evaluate(() => {
      const 口 = document.querySelector('.biaodan-gundong') as HTMLElement
      口.scrollTop = 0
      const 首 = document.querySelector('.biaodan-neirong-qu .shuru-zu') as HTMLElement
      const 口r = 口.getBoundingClientRect()
      const 首r = 首.getBoundingClientRect()
      return {
        scrollH: 口.scrollHeight,
        clientH: 口.clientHeight,
        溢出: 口.scrollHeight > 口.clientHeight,
        首字段顶: Math.round(首r.top * 100) / 100,
        口顶: Math.round(口r.top * 100) / 100,
        顶部可达: 首r.top >= 口r.top - 1,
      }
    })
    await 页.screenshot({ path: path.join(截图目录, `${前缀}-320x480-zhuce-dingbu${后缀}.png`) })
    台账.push(`320x480 注册: scrollH/clientH=${可达.scrollH}/${可达.clientH} 溢出=${可达.溢出} 首字段顶=${可达.首字段顶} 口顶=${可达.口顶} 顶部可达=${可达.顶部可达}`)
    expect(可达.顶部可达, 'FP-04b：320x480 注册态滚回顶后首字段被裁掉').toBe(true)
    await ctx.close()
  })

  test('console 汇总：error 必须为 0', async () => {
    const 写 = await import('node:fs')
    写.appendFileSync(
      'D:/xuanr/Desktop/燃烧之陨我的世界服务端/.agents/evidence/traces/FP-VERIFY-AUTHGENDER-20260922.md',
      '\n## 态1 headless 台账\n\n' + 台账.map((t) => `- ${t}`).join('\n') +
        `\n\nconsole errors=${错误清单.length} warnings=${警告清单.length}\n` +
        错误清单.map((e) => `- ERROR ${e}`).join('\n') + '\n' +
        警告清单.map((w) => `- WARN ${w}`).join('\n') + '\n',
    )
    expect(错误清单, `控制台出现 error：\n${错误清单.join('\n')}`).toHaveLength(0)
  })
})
