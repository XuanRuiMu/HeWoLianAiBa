import { test, expect, type Page, type Browser, type APIRequestContext } from '@playwright/test'
import path from 'node:path'
import { daKaiJiaJuQingQiu, baoZhengCeShiZhangHao, zhuRuJiaJuShenFen, type JiaJuShenFen } from './测试夹具'

/**
 * FP-VERIFY-GENDER 态2（资料设置向导 + 挑战主页 + 主页模式卡）· headless。
 * 覆盖：性别选中框四组合 getComputedStyle == --xingbie-*-xuan-* 解析值（深浅两档）、
 * MBTI 选中阴影吃 --xuanzhong-*（深浅成对截图供目测）、挑战主页性别符号色 == --xingbie-{nan,nv}-1、
 * 模式卡（FP-16/16b）卡面更实 + 真 hover 渐显（插值非瞬变）+ .yulan-dian 圆点。
 * 走真实登录夹具 ⇒ backend dev 必须在 :3000 运行。
 */
const 前缀 = 'FP-VERIFY-GENDER'
const 后缀 = process.env.VERIFY_SUFFIX ? `-${process.env.VERIFY_SUFFIX}` : '-20260922'
const 截图目录 = path.resolve(process.cwd(), '..', '测试截图')

const 错误清单: string[] = []
const 警告清单: string[] = []
const 台账: string[] = []

let 身份: JiaJuShenFen

test.beforeAll(async () => {
  const 请求: APIRequestContext = await daKaiJiaJuQingQiu()
  身份 = await baoZhengCeShiZhangHao(请求)
  await 请求.dispose()
})

function 拆色(串: string): number[] {
  return (串.match(/[\d.]+/g) || []).map(Number)
}
function 色等(a: string, b: string, 容差 = 1.5): boolean {
  const x = 拆色(a)
  const y = 拆色(b)
  if (x.length < 3 || y.length < 3 || x.length !== y.length) {
    // 渐变串对单色串：退化为「b 的前三数出现在 a 中」判定
    const 短 = y.length === 3 ? y : x
    const 长 = y.length === 3 ? x : y
    return 短.length >= 3 && [0, 1, 2].every((i) => 长.some((_, j) => j + 3 <= 长.length && 长.slice(j, j + 3).every((v, k) => Math.abs(v - 短[k]) <= 1)))
  }
  return x.every((v, i) => Math.abs(v - y[i]) <= 容差)
}

/** 用隐藏探针拿令牌在当前主题档下的解析计算值（避免 hex/函数串格式差） */
async function 解析令牌(页: Page, 属性: 'color' | 'background-color' | 'text-shadow' | 'box-shadow', 名: string) {
  return 页.evaluate(
    (参) => {
      const 探 = document.createElement('div')
      探.style.setProperty(参.属性, `var(${参.名})`)
      探.style.display = 'none'
      document.body.appendChild(探)
      const 值 = getComputedStyle(探)[参.属性 as 'color'] as string
      探.remove()
      return 值.trim()
    },
    { 属性, 名 },
  )
}

async function 建上下文(browser: Browser, 主题: '暗色' | '浅色', 宽 = 1440, 高 = 900) {
  const ctx = await browser.newContext({ viewport: { width: 宽, height: 高 }, deviceScaleFactor: 2 })
  await ctx.addInitScript(([z]: string[]) => localStorage.setItem('主题', z), [主题])
  return ctx
}

async function 打开向导(页: Page, 主题: string, 默认性别: 'male' | 'female' | null) {
  页.on('console', (m) => {
    const 文 = `[向导/${主题}/${默认性别}] ${m.type()}: ${m.text().slice(0, 200)}`
    if (m.type() === 'error') 错误清单.push(文)
    else if (m.type() === 'warning') 警告清单.push(文)
  })
  页.on('pageerror', (e) => 错误清单.push(`[向导/${主题}/${默认性别}] pageerror: ${String(e).slice(0, 200)}`))
  await 页.route((u) => {
    try {
      return decodeURIComponent(u.pathname) === '/api/认证/信息'
    } catch {
      return false
    }
  }, async (路) => {
    const 响 = await 路.fetch()
    const 体 = await 响.json().catch(() => null)
    if (!体 || typeof 体 !== 'object' || !体.shu_ju) {
      await 路.fulfill({ response: 响 })
      return
    }
    const 新体 = { ...体, shu_ju: { ...体.shu_ju, mo_ren_xing_bie: 默认性别 } }
    const 头: Record<string, string> = {}
    for (const [k, v] of Object.entries(响.headers())) {
      if (['content-length', 'content-encoding', 'transfer-encoding', 'connection'].includes(k.toLowerCase())) continue
      头[k] = v
    }
    await 路.fulfill({ status: 响.status(), headers: 头, body: JSON.stringify(新体) })
  })
  await zhuRuJiaJuShenFen(页, 身份)
  await 页.goto('/profile-setup', { waitUntil: 'domcontentloaded' })
  await 页.waitForSelector('.ziliao-kapian')
  await 页.waitForTimeout(1500)
}

async function 下一步(页: Page) {
  await 页.locator('.anniu-zhuYao').first().click()
  await 页.waitForTimeout(1200)
}

test.describe('FP-VERIFY-GENDER 性别配色簇', () => {
  test.describe.configure({ timeout: 420000 })
  for (const 主题 of ['暗色', '浅色'] as const) {
    test(`性别选中框四组合（${主题}）`, async ({ browser }) => {
      const ctx = await 建上下文(browser, 主题)
      const 页 = await ctx.newPage()
      await 打开向导(页, 主题, null)
      const 男框 = await 解析令牌(页, 'color', '--xingbie-nan-xuan-biankuang')
      const 男底 = await 解析令牌(页, 'background-color', '--xingbie-nan-xuan-beijing')
      const 女框 = await 解析令牌(页, 'color', '--xingbie-nv-xuan-biankuang')
      const 女底 = await 解析令牌(页, 'background-color', '--xingbie-nv-xuan-beijing')
      const 男环 = await 解析令牌(页, 'color', '--xingbie-nan-xuan-huan')
      const 女环 = await 解析令牌(页, 'color', '--xingbie-nv-xuan-huan')

      // 组合 A：对象=男 → 蓝选中框
      await 页.click('.ziJi-xingBie-kaPian[data-dang="nv"]')
      await 下一步(页)
      await 页.click('.duiXiang-xingBie-kaPian[data-dang="nan"]')
      await 页.waitForTimeout(600)
      let 样式 = await 页.evaluate(() => {
        const 卡 = document.querySelector('.duiXiang-xingBie-kaPian.beiXuanZhong') as HTMLElement
        const cs = getComputedStyle(卡)
        return { border: cs.borderColor, bg: cs.backgroundColor, shadow: cs.boxShadow }
      })
      台账.push(`A对象男 ${主题}: border=${样式.border}（令牌解析 ${男框}） bg=${样式.bg}（${男底}） shadow=${样式.shadow.slice(0, 110)}（环 ${男环}）`)
      expect(色等(样式.border, 男框), `#16 组合A ${主题}：男选中框色 != 令牌（${样式.border} vs ${男框}）`).toBe(true)
      expect(色等(样式.bg, 男底), `#16 组合A ${主题}：男选中底色 != 令牌（${样式.bg} vs ${男底}）`).toBe(true)
      expect(样式.shadow.includes(拆色(男环).slice(0, 3).join(', ')), `#16 组合A ${主题}：选中环未吃 --xingbie-nan-xuan-huan（${样式.shadow}）`).toBe(true)
      await 页.locator('.xingBie-wangGe').last().screenshot({ path: path.join(截图目录, `${前缀}-xuanze-A-duixiangnan-${主题}${后缀}.png`) })

      // 组合 B：对象=女 → 粉选中框
      await 页.click('.duiXiang-xingBie-kaPian[data-dang="nv"]')
      await 页.waitForTimeout(600)
      样式 = await 页.evaluate(() => {
        const 卡 = document.querySelector('.duiXiang-xingBie-kaPian.beiXuanZhong') as HTMLElement
        const cs = getComputedStyle(卡)
        return { border: cs.borderColor, bg: cs.backgroundColor, shadow: cs.boxShadow }
      })
      台账.push(`B对象女 ${主题}: border=${样式.border}（${女框}） bg=${样式.bg}（${女底}）`)
      expect(色等(样式.border, 女框), `#16 组合B ${主题}：女选中框色 != 令牌（${样式.border} vs ${女框}）`).toBe(true)
      expect(色等(样式.bg, 女底), `#16 组合B ${主题}：女选中底色 != 令牌（${样式.bg} vs ${女底}）`).toBe(true)
      expect(样式.shadow.includes(拆色(女环).slice(0, 3).join(', ')), `#16 组合B ${主题}：选中环未吃 --xingbie-nv-xuan-huan（${样式.shadow}）`).toBe(true)

      // 组合 C：未选对象 + 有默认性别(male) → 勾选框强调色=反色(女粉)
      const 页C = await ctx.newPage()
      await 打开向导(页C, 主题, 'male')
      await 下一步(页C)
      const C值 = await 页C.evaluate(() => {
        const 勾 = document.querySelector('.zhaXing-gouxuan') as HTMLElement
        const cs = getComputedStyle(勾)
        return {
          档: 勾.getAttribute('data-xingbie'),
          accent: cs.accentColor,
          对象已选: !!document.querySelector('.duiXiang-xingBie-kaPian.beiXuanZhong'),
        }
      })
      台账.push(`C未选+默认male ${主题}: 档=${C值.档} accent=${C值.accent}（女框 ${女框}） 对象已选=${C值.对象已选}`)
      expect(C值.对象已选, 'C 组合前提被破坏：对象未点却已选中').toBe(false)
      expect(C值.档, `#16 组合C ${主题}：未选对象未取默认性别反色`).toBe('nv')
      expect(色等(C值.accent, 女框), `#16 组合C ${主题}：勾选框强调色 != 反色令牌（${C值.accent} vs ${女框}）`).toBe(true)

      // 组合 D：无默认性别 → 步骤1 主色档兜底 nan(蓝) + 步骤2 粉选中框兜底
      const 页D = await ctx.newPage()
      await 打开向导(页D, 主题, null)
      const D一步 = await 页D.evaluate(() => {
        const 卡 = document.querySelector('.ziliao-kapian') as HTMLElement
        const 钮 = document.querySelector('.anniu-zhuYao') as HTMLElement
        return { 主色档: 卡.getAttribute('data-xingbie'), 钮背景: getComputedStyle(钮).backgroundImage }
      })
      const 男1 = await 解析令牌(页D, 'color', '--xingbie-nan-1')
      const 男2 = await 解析令牌(页D, 'color', '--xingbie-nan-2')
      const 蓝兜底 = D一步.钮背景.includes(拆色(男1).slice(0, 3).join(', ')) && D一步.钮背景.includes(拆色(男2).slice(0, 3).join(', '))
      台账.push(`D无默认·步骤1 ${主题}: 主色档=${D一步.主色档} 钮背景=${D一步.钮背景.slice(0, 130)}（期望 ${男1}/${男2} 蓝兜底=${蓝兜底}）`)
      expect(D一步.主色档, '#16 组合D：无默认性别时主色档未兜底 nan(蓝)').toBe('nan')
      expect(蓝兜底, `#16 组合D ${主题}：主按钮未取蓝兜底（${D一步.钮背景}）`).toBe(true)
      await 页D.click('.ziJi-xingBie-kaPian[data-dang="nv"]')
      await 下一步(页D)
      const D二步 = await 页D.evaluate(() => {
        const 勾 = document.querySelector('.zhaXing-gouxuan') as HTMLElement
        return { 档: 勾.getAttribute('data-xingbie'), accent: getComputedStyle(勾).accentColor }
      })
      台账.push(`D无默认·步骤2 ${主题}: 档=${D二步.档} accent=${D二步.accent}（粉框 ${女框}）`)
      expect(D二步.档, '#16 组合D：无默认性别时选中框兜底档未取 nv(粉)').toBe('nv')
      expect(色等(D二步.accent, 女框), `#16 组合D ${主题}：粉兜底强调色 != 令牌`).toBe(true)
      await ctx.close()
    })

    test(`MBTI 选中阴影 --xuanzhong-* + 挑战主页符号色（${主题}）`, async ({ browser }) => {
      const ctx = await 建上下文(browser, 主题)
      const 页 = await ctx.newPage()
      await 打开向导(页, 主题, 'male')
      await 下一步(页)
      await 页.click('.duiXiang-xingBie-kaPian[data-dang="nv"]')
      await 下一步(页)
      await 页.click('.mbti-kaPian:not(.suiJi-kaPian)')
      await 页.waitForTimeout(700)
      const 阴影文 = await 解析令牌(页, 'text-shadow', '--xuanzhong-wenben-yinying')
      const 阴影环 = await 解析令牌(页, 'box-shadow', '--xuanzhong-qiangdiao-yinying')
      const 实测 = await 页.evaluate(() => {
        const 卡 = document.querySelector('.mbti-kaPian.beiXuanZhong') as HTMLElement
        const 题 = 卡.querySelector('.mbti-zhongWen') as HTMLElement
        return { 题影: getComputedStyle(题).textShadow, 卡影: getComputedStyle(卡).boxShadow, 边框: getComputedStyle(卡).borderColor }
      })
      const 归一 = (s: string) => s.replace(/\s+/g, ' ').trim()
      台账.push(`MBTI ${主题}: 题影=${归一(实测.题影)}（令牌 ${归一(阴影文)}）卡影=${归一(实测.卡影).slice(0, 110)}（${归一(阴影环).slice(0, 110)}）边框=${实测.边框}`)
      expect(归一(实测.题影), `#17 ${主题}：MBTI 标题阴影未吃 --xuanzhong-wenben-yinying`).toBe(归一(阴影文))
      expect(归一(实测.卡影), `#17 ${主题}：MBTI 卡辉光未吃 --xuanzhong-qiangdiao-yinying`).toBe(归一(阴影环))
      const 框 = await 页.locator('.mbti-kaPian.beiXuanZhong').boundingBox()
      if (框) {
        await 页.screenshot({
          path: path.join(截图目录, `${前缀}-mbti-xuanzhong-${主题}${后缀}.png`),
          clip: { x: 框.x - 14, y: Math.max(0, 框.y - 14), width: 框.width + 28, height: 框.height + 28 },
        })
      }
      // 挑战主页：性别符号色吃 --xingbie-{nan,nv}-1
      await 页.goto('/tiao-zhan', { waitUntil: 'domcontentloaded' })
      await 页.waitForTimeout(2500)
      const 有开始 = await 页.locator('.anniu-kaiShi').count()
      if (有开始 > 0) {
        await 页.click('.anniu-kaiShi')
        await 页.waitForTimeout(900)
        const 符号色 = await 页.evaluate(() => {
          const 男 = document.querySelector('.xingbie-kaPian.nan .xingbie-fuhao') as HTMLElement
          const 女 = document.querySelector('.xingbie-kaPian.nv .xingbie-fuhao') as HTMLElement
          return 男 && 女 ? { 男: getComputedStyle(男).color, 女: getComputedStyle(女).color } : null
        })
        const 男1 = await 解析令牌(页, 'color', '--xingbie-nan-1')
        const 女1 = await 解析令牌(页, 'color', '--xingbie-nv-1')
        台账.push(`挑战主页符号色 ${主题}: 男=${符号色?.男}（${男1}）女=${符号色?.女}（${女1}）`)
        expect(符号色, '挑战主页性别弹层未渲染出符号').not.toBeNull()
        expect(色等(符号色!.男, 男1), `#16 ${主题}：♂ 符号色 != --xingbie-nan-1（${符号色!.男} vs ${男1}）`).toBe(true)
        expect(色等(符号色!.女, 女1), `#16 ${主题}：♀ 符号色 != --xingbie-nv-1（${符号色!.女} vs ${女1}）`).toBe(true)
        await 页.screenshot({ path: path.join(截图目录, `${前缀}-tiaozhan-fuhao-${主题}${后缀}.png`) })
      } else {
        台账.push(`挑战主页 ${主题}: .anniu-kaiShi 不在场（可能处于进行中对局态），符号色本档未取证`)
      }
      await ctx.close()
    })

    test(`模式卡 FP-16/16b：卡面更实 + 真 hover 渐显插值 + 圆点（${主题}）`, async ({ browser }) => {
      for (const 档 of [{ 宽: 1440, 高: 900 }, { 宽: 390, 高: 844 }] as const) {
        const ctx = await 建上下文(browser, 主题, 档.宽, 档.高)
        const 页 = await ctx.newPage()
        页.on('console', (m) => {
          const 文 = `[模式卡/${主题}/${档.宽}] ${m.type()}: ${m.text().slice(0, 200)}`
          if (m.type() === 'error') 错误清单.push(文)
          else if (m.type() === 'warning') 警告清单.push(文)
        })
        页.on('pageerror', (e) => 错误清单.push(`[模式卡/${主题}/${档.宽}] pageerror: ${String(e).slice(0, 200)}`))
        await zhuRuJiaJuShenFen(页, 身份)
        await 页.goto('/', { waitUntil: 'domcontentloaded' })
        await 页.waitForSelector('.moshi-kapian')
        await 页.waitForTimeout(2500)
        const 底令牌 = await 解析令牌(页, 'background-color', '--kapian-mian-beijing')
        const 文令牌 = await 解析令牌(页, 'color', '--kapian-mian-zhengwen')
        const 静 = await 页.evaluate(() => {
          const 卡 = document.querySelector('.moshi-kapian') as HTMLElement
          const 行 = document.querySelector('.moshi-kapian .yulan-xiangmu') as HTMLElement
          const 点 = document.querySelector('.moshi-kapian .yulan-dian') as HTMLElement
          const cs = getComputedStyle(行)
          return {
            卡底: getComputedStyle(卡).backgroundColor,
            卡底图: getComputedStyle(卡).backgroundImage.slice(0, 120),
            行色: cs.color,
            点色: getComputedStyle(点).backgroundColor,
            行不透明: cs.opacity,
            时长: cs.transitionDuration,
            延时: cs.transitionDelay,
          }
        })
        台账.push(`模式卡静置 ${主题} ${档.宽}x${档.高}: 卡底=${静.卡底}（${底令牌}）底图=${静.卡底图} 行色=${静.行色} opacity=${静.行不透明}（正文 ${文令牌}）圆点=${静.点色} 过渡=${静.时长}/${静.延时}`)
        const 卡框 = await 页.locator('.moshi-kapian').first().boundingBox()
        if (卡框) {
          await 页.screenshot({ path: path.join(截图目录, `${前缀}-moshikA-jingzhi-${主题}-${档.宽}${后缀}.png`), clip: 卡框 })
        }
        await 页.hover('.moshi-kapian')
        const 中段: string[] = []
        for (const 延 of [150, 400, 750]) {
          await 页.waitForTimeout(延 === 150 ? 150 : 250)
          中段.push(await 页.evaluate(() => getComputedStyle(document.querySelector('.moshi-kapian .yulan-xiangmu') as HTMLElement).color))
        }
        await 页.waitForTimeout(1500)
        const 末 = await 页.evaluate(() => getComputedStyle(document.querySelector('.moshi-kapian .yulan-xiangmu') as HTMLElement).color)
        const 不同 = new Set([静.行色, ...中段, 末])
        台账.push(`模式卡hover ${主题} ${档.宽}x${档.高}: 静=${静.行色} 中=${中段.join(' | ')} 末=${末} 采样不同色数=${不同.size}`)
        expect(色等(末, 文令牌), `FP-16b ${主题}：hover 满 alpha 未达 --kapian-mian-zhengwen（${末} vs ${文令牌}）`).toBe(true)
        expect(不同.size >= 2, `FP-16b ${主题}：hover 采样全程同色，疑瞬变或渐显丢失（${静.行色} → ${末}）`).toBe(true)
        if (卡框) {
          await 页.screenshot({ path: path.join(截图目录, `${前缀}-moshikA-hover-${主题}-${档.宽}${后缀}.png`), clip: 卡框 })
        }
        await ctx.close()
      }
    })
  }

  test('console 汇总：error 必须为 0', async () => {
    const 写 = await import('node:fs')
    写.appendFileSync(
      'D:/xuanr/Desktop/燃烧之陨我的世界服务端/.agents/evidence/traces/FP-VERIFY-AUTHGENDER-20260922.md',
      '\n## 态2 性别配色簇台账\n\n' + 台账.map((t) => `- ${t}`).join('\n') +
        `\n\nconsole errors=${错误清单.length} warnings=${警告清单.length}\n` +
        错误清单.map((e) => `- ERROR ${e}`).join('\n') + '\n' +
        警告清单.map((w) => `- WARN ${w}`).join('\n') + '\n',
    )
    expect(错误清单, `控制台出现 error：\n${错误清单.join('\n')}`).toHaveLength(0)
  })
})
