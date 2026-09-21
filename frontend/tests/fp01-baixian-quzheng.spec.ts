import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

// FP-01 焦点白线取证：登录页点击文本输入框前/后的 outline 计算样式 + 深浅主题截图。
// 运行方式：FP01_LABEL=before|after npx playwright test tests/fp01-baixian-quzheng.spec.ts
// before 仅记录不断言；after 断言输入框 outline 已消除、非文本控件焦点环走 --jujiao-huan-* 令牌。

const 标签 = process.env.FP01_LABEL ?? 'after'
const 日期 = '20260921'
const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 截图目录 = path.resolve(本目录, '../../测试截图')
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces')
const 主题清单 = ['暗色', '浅色'] as const

type 取样 = {
  主题: string
  输入框ID: string
  outlineStyle: string
  outlineWidth: string
  outlineColor: string
  outlineOffset: string
  按钮outlineStyle?: string
  按钮outlineWidth?: string
  按钮outlineColor?: string
  焦点环令牌值?: string
}

function 写证据(记录: { 标签: string; 取样: 取样[]; 截图: string[] }): void {
  fs.mkdirSync(证据目录, { recursive: true })
  const 行 = [
    `# FP-01 焦点白线取证（${记录.标签}）-${日期}`,
    '',
    `采集时间：${new Date().toISOString()}`,
    '',
    '| 主题 | 元素 | outline-style | outline-width | outline-color | outline-offset |',
    '| ---- | ---- | ------------- | ------------- | ------------- | -------------- |',
    ...记录.取样.map(
      (s) =>
        `| ${s.主题} | #${s.输入框ID} | ${s.outlineStyle} | ${s.outlineWidth} | ${s.outlineColor} | ${s.outlineOffset} |`,
    ),
    '',
    '| 主题 | 键盘首个非文本控件 outline-style | width | color | --jujiao-huan-yanse 解析值 |',
    '| ---- | -------------------------- | ----- | ----- | -------------------------- |',
    ...记录.取样.filter((s) => s.按钮outlineStyle).map(
      (s) =>
        `| ${s.主题} | ${s.按钮outlineStyle} | ${s.按钮outlineWidth} | ${s.按钮outlineColor} | ${s.焦点环令牌值 ?? ''} |`,
    ),
    '',
    '截图：',
    ...记录.截图.map((p) => `- ${p}`),
  ]
  fs.writeFileSync(path.join(证据目录, `FP-01-焦点白线-${记录.标签}-${日期}.md`), 行.join('\n'), 'utf8')
}

test('登录页输入框焦点 outline 取证', async ({ browser }) => {
  test.setTimeout(120000)
  fs.mkdirSync(截图目录, { recursive: true })
  const 取样集: 取样[] = []
  const 截图集: string[] = []

  for (const 主题 of 主题清单) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await context.addInitScript(([zhuTi]: string[]) => {
      localStorage.setItem('主题', zhuTi)
    }, [主题])
    const page = await context.newPage()
    await page.goto('/login')
    await page.waitForSelector('#denglu-shoujihao')
    const shiJiZhuTi = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    expect(['light', 'dark']).toContain(shiJiZhuTi)

    const shouJi = page.locator('#denglu-shoujihao')
    const ming = `fp01-${标签}-${shiJiZhuTi}-biaodan.png`
    const mingDian = `fp01-${标签}-${shiJiZhuTi}-dianji-shurukuang.png`
    await shouJi.screenshot({ path: path.join(截图目录, ming) })
    截图集.push(`测试截图/${ming}`)

    await shouJi.click()
    await page.waitForTimeout(500)
    await page.locator('.biaodan-rongqi').screenshot({ path: path.join(截图目录, mingDian) })
    截图集.push(`测试截图/${mingDian}`)

    const yang = await shouJi.evaluate((el) => {
      const s = getComputedStyle(el)
      return {
        outlineStyle: s.outlineStyle,
        outlineWidth: s.outlineWidth,
        outlineColor: s.outlineColor,
        outlineOffset: s.outlineOffset,
      }
    })

    // 键盘 Tab 逐个前进，直到落在非文本控件（按钮/链接/勾选框）上，验证焦点环仍在
    let an: {
      元素: string
      outlineStyle: string
      outlineWidth: string
      outlineColor: string
    } | null = null
    let huanCunZai = false
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      const ting = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        const leiXing = (el.getAttribute('type') || '').toLowerCase()
        const wenBenLei =
          el.tagName === 'INPUT' &&
          !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image', 'range', 'color'].includes(
            leiXing,
          ) &&
          ['text', 'tel', 'password', 'email', 'number', 'search', 'url', ''].includes(leiXing)
        if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || wenBenLei) return null
        const s = getComputedStyle(el)
        return {
          元素: `${el.tagName.toLowerCase()}[${leiXing}]`,
          outlineStyle: s.outlineStyle,
          outlineWidth: s.outlineWidth,
          outlineColor: s.outlineColor,
        }
      })
      if (!ting) continue
      if (ting.outlineStyle !== 'none' && ting.outlineWidth !== '0px') huanCunZai = true
      if (!an) an = ting
    }
    const lingPaiZhi = await page.evaluate(
      () =>
        getComputedStyle(document.documentElement).getPropertyValue('--jujiao-huan-yanse').trim(),
    )

    取样集.push({
      主题: `${主题}(${shiJiZhuTi})`,
      输入框ID: 'denglu-shoujihao',
      ...yang,
      按钮outlineStyle: an?.outlineStyle,
      按钮outlineWidth: an?.outlineWidth,
      按钮outlineColor: an?.outlineColor,
      焦点环令牌值: lingPaiZhi,
    })

    if (标签 === 'after') {
      // 根因断言 1：文本输入控件点击后不再绘制 outline（白线彻底消失，非登录页局部补丁）
      expect(
        yang.outlineStyle === 'none' || yang.outlineWidth === '0px',
        `输入框仍绘制 outline：${JSON.stringify(yang)}`,
      ).toBe(true)
      // 根因断言 2：非文本控件键盘聚焦仍有可见焦点环（组件自有环或新令牌全局环）
      expect(huanCunZai, '非文本控件键盘聚焦无任何可见焦点环').toBe(true)
      // 根因断言 3：焦点环令牌按主题解析为品牌暖灰蓝档
      expect(['#5a7a94', '#8eafc5'], `焦点环令牌未按主题解析：${lingPaiZhi}`).toContain(
        lingPaiZhi.toLowerCase(),
      )
    }
    await context.close()
  }

  写证据({ 标签, 取样: 取样集, 截图: 截图集 })
})
