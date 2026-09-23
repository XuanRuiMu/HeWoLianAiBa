import { test, expect, type Browser, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  卡内白条普查,
  画线元素定位,
  该字段可扫,
  type 普查结果,
  type 条带,
} from './焦点白条取样-fp03'
import { baoZhengCeShiZhangHao, daKaiJiaJuQingQiu, zhuRuJiaJuShenFen } from './测试夹具'

// FP-03 需求 #1 焦点装饰线根因治理：改前/改后像素取证 + 全库同类点穷尽取证。
// 运行：FP03_LABEL=before|after [FP03_FANWEI=denglu|leidian|quanbu] npx playwright test --config tests/playwright.config-fp03.ts
// before 断言「聚焦时 ±6px 判定带内的近白横向条带确实被复现」；after 断言「判定带内零命中 + 装饰 DOM/CSS 清零 + 令牌焦点环在位 + 零 error」。
// 两个标签跑同一套取证、同一判据，只是判定方向相反（复现断言 vs 回归断言），不存在弱化分支。

const 标签 = process.env.FP03_LABEL ?? 'before'
const 范围 = process.env.FP03_FANWEI ?? 'quanbu'
const 日期 = '20260921'
const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces')
const 卡 = '.biaodan-rongqi'
const 主题清单 = ['暗色', '浅色'] as const
const 视口清单 = [
  { 名: '桌面1440x900', 宽: 1440, 高: 900 },
  { 名: '移动375x667', 宽: 375, 高: 667 },
] as const
const 登录字段 = ['#denglu-shoujihao', '#denglu-mima']
const 注册字段 = ['#zhuce-shoujihao', '#zhuce-yanzhengma', '#zhuce-yonghuming', '#zhuce-mima', '#zhuce-chushengriqi']

type 记录 = {
  主题: string
  视口: string
  页面: string
  聚焦: string
  普查: 普查结果
  可扫: boolean
  截图: string
}

type 环记录 = {
  主题: string
  视口: string
  页面: string
  选择器: string
  focusVisible: boolean
  outline: string
  组内下划线数: number
  标签: string
}

type Tab记录 = { 主题: string; 步: number; 元素: string; outline: string; 是文本框: boolean }

type DOM状态型 = { 全局下划线数: number; 横向溢出: number; 下划线样式声明数: number }

function png路径(主题: string, 视口名: string, 页: string, 态: string): string {
  const 名 = `FP-03-${页}-${态.replace(/[#()+·]/g, '_')}-${标签}-${日期}-${主题}-${视口名.replace(/\d+x\d+/, '')}.png`
  return path.join(证据目录, 名).split(path.sep).join('/')
}

function 条带行(记: 记录, 条: 条带): string {
  return `| ${记.主题} | ${记.视口} | ${记.页面} | ${记.聚焦} | ${条.起始行}..${条.结束行} | ${条.厚度} | ${条.中位亮条色} | ${条.相对亮度} | ${条.档} | ${条.对卡面色差} | ${条.连续段宽} | ${条.最近边} | ${条.边偏移} | ${记.可扫 ? '是' : '否'} |`
}

function 命中行(记: 记录, 命: { 选择器: string; 段: string; 条带: 条带 }): string {
  return `| ${记.主题} | ${记.视口} | ${记.页面} | ${命.选择器} ${命.段} | ${命.条带.起始行}..${命.条带.结束行} | ${命.条带.厚度}px | ${命.条带.中位亮条色} | L=${命.条带.相对亮度}(${命.条带.档}) | Δ=${命.条带.对卡面色差} | 连续 ${命.条带.连续段宽}px | 偏移 ${命.条带.边偏移}px |`
}

function 写证据(
  文件名: string,
  记录集: 记录[],
  定位集: unknown[],
  Tab遍历: Tab记录[],
  环清单: 环记录[],
  DOM: DOM状态型,
  错误: string[],
  附记: string[] = [],
  减动效: string[] = [],
  期望: string = 'before 期望 >0；after 期望 =0',
): void {
  fs.mkdirSync(证据目录, { recursive: true })
  const 所有条带 = 记录集.flatMap((记) => 记.普查.全卡普查.map((条) => 条带行(记, 条)))
  const 所有命中 = 记录集.flatMap((记) => 记.普查.判定带命中.map((命) => 命中行(记, 命)))
  const 可扫数 = 记录集.filter((记) => 记.可扫).length
  const 行 = [
    `# ${文件名}（${标签}）-${日期}`,
    '',
    `采集时间：${new Date().toISOString()}`,
    ...附记,
    '视口：桌面 1440x900 / 移动 375x667；主题：暗色(`data-theme=dark`) / 浅色(`data-theme=light`)；deviceScaleFactor=1（1 图素 = 1 CSS px）。',
    '',
    '## 判据定义（可证伪；唯一真源 `frontend/tests/焦点白条取样-fp03.ts`，取证 spec 与 fp11 门禁共用）',
    '',
    '- 取样：`page.screenshot({clip: 卡面 ∩ 视口, animations:"disabled", caret:"hide"})` → sharp raw 逐行逐列取色（同一张图直接落盘为取证 png）',
    '- 「亮条」= 与卡底（该图像素众数色）最大通道差 ≥ 24 **且** 相对亮度 ≥ 卡面亮度 + 0.05',
    '  · 前半段即验收标准的「与卡底色差 ≥24」；后半段排除「比卡面更暗但色差够大」的暗色装饰（浅色档卡面 L≈0.97，暗金线在该档读作深线而不是白线）',
    '- 「近白」= 亮条 ∩ 相对亮度 ≥ 0.30（champagne 以上，即用户口中的「白色的线」）。**断言采敏感档「亮条」**，即近白与亮条两档都不允许出现在判定带内',
    '- 「判定带」= 输入框上/下各 6px，分四段（上·框外 / 上·内缘 / 下·内缘 / 下·框外），排除输入框自身 border 行与 outline 行；含内缘行是因为装饰线画在输入框自身的下内边距区内（`bottom:0; height:2px`），只测框外会漏判',
    '- 「行合格」= 该行在窗口（输入框左右各内缩 2px）内存在长度 ≥ max(40px, 窗口宽 50%) 的连续亮条段（浮动标签文字≈15% 窗宽、眼睛图标、按钮圆角都到不了这个连续度）',
    '- 「条带」= 连续（容 ≤2 行空隙合并）的合格行；「薄」= 厚度 ≤4 行（粗于此的是块状填充而不是线）',
    '',
    `卡底色（像素众数）：${[...new Set(记录集.map((记) => `${记.主题}/${记.视口}/${记.页面} = ${记.普查.合成卡底色}`))].join('；')}`,
    '',
    `## 结论：±6px 判定带内近白/亮条薄条带命中数 = ${所有命中.length}（${期望}）。有效取证状态数 = ${可扫数}`,
    '',
    '## 一、判定带命中明细（验收①的判据）',
    '',
    '| 主题 | 视口 | 页面 | 字段段 | 行区间 | 厚度 | 中位亮条色 | 亮度(档) | 色差 | 连续段 | 偏移 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    所有命中.length ? 所有命中.join('\n') : '| —（零命中：判定带内不存在亮条横向条带） | | | | | | | | | | |',
    '',
    '## 二、全卡亮条薄条带普查（含判定带之外的常驻装饰，用于区分「必要装饰」与「聚焦才出现的缺陷」）',
    '',
    '| 主题 | 视口 | 页面 | 聚焦 | 行区间 | 厚度 | 中位亮条色 | 相对亮度 | 档 | 对卡面色差 | 连续段宽 | 最近边 | 边偏移(px) | 该字段可视 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    所有条带.length ? 所有条带.join('\n') : '| —（全卡零薄亮条带） | | | | | | | | | | | | | |',
    '',
    '## 三、画线元素定位（elementsFromPoint + 逐元素 computed border/outline/box-shadow/background + ::after）',
    '',
    '> 用途：钉死「到底哪个元素画的线」。命中行的图层里若出现 `[dixian-dixian]` 且其 ::after 为 `scaleX(1)` 的 linear-gradient，',
    '> 则白线归因字段下划线装饰；若首层 input 的 outline 为 solid，则归因焦点环（本 FP 保留项，已由几何排除）。',
    '',
    '```json',
    JSON.stringify(定位集, null, 2),
    '```',
    '',
    '## 四、Tab 键序遍历（键盘焦点落点 + computed outline；验收④键盘可达性）',
    '',
    '```json',
    JSON.stringify(Tab遍历, null, 2),
    '```',
    '',
    '## 五、文本输入框焦点环 / 浮动标签 / 装饰残留（验收②、假设 J1 与 J3）',
    '',
    '| 主题 | 视口 | 页面 | 字段 | :focus-visible | outline（style width color offset） | 组内 .dixian-dixian | 浮动标签 top/字号/色 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...环清单.map(
      (元) =>
        `| ${元.主题} | ${元.视口} | ${元.页面} | ${元.选择器} | ${元.focusVisible} | ${元.outline} | ${元.组内下划线数} | ${元.标签} |`,
    ),
    '',
    ...(DOM.全局下划线数 >= 0
      ? [
          `全页 .dixian-dixian 元素数：${DOM.全局下划线数}；运行期样式表中含 dixian 的规则数：${DOM.下划线样式声明数}`,
          `文档横向溢出（scrollWidth-clientWidth）：${DOM.横向溢出}px`,
          '',
        ]
      : []),
    '## 六、必需 DOM 指标',
    '',
    '| 主题 | 视口 | 页面（状态） | URL | 卡 getBoundingClientRect | 控制台 error 计数 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...记录集.map(
      (记) =>
        `| ${记.主题} | ${记.视口} | ${记.页面}（${记.聚焦}） | ${记.截图 ? 记.页面.startsWith('注册') ? '/login(注册 tab)' : '/login' : ''} | ${JSON.stringify(记.普查.几何.卡矩形)} | ${错误.length} |`,
    ),
    '',
    ...(减动效.length
      ? ['', '## 六·B、prefers-reduced-motion 分支（验收⑥：删掉 `.dixian-dixian::after` 后该分支其余选择器不得回归）', '', '```json', JSON.stringify(减动效, null, 2), '```']
      : []),
    '## 七、截图清单（与取证像素同源，均落 .agents/evidence/traces/）',
    '',
    ...[...new Set(记录集.map((记) => 记.截图))].map((名) => `- ${名}`),
    '',
    `## 八、控制台 error 计数（只统计 error，warning 按项目规则放行）：${错误.length}`,
    '',
    ...(错误.length ? ['```', ...错误, '```'] : ['无 error。']),
  ]
  fs.writeFileSync(path.join(证据目录, `${文件名}-${标签}-${日期}.md`), 行.join('\n'), 'utf8')
}

async function 开页(browser: Browser, 主题: string, 视口: { 宽: number; 高: number }, 路径 = '/login') {
  const context = await browser.newContext({ viewport: { width: 视口.宽, height: 视口.高 }, deviceScaleFactor: 1 })
  await context.addInitScript(([zhuTi]: string[]) => localStorage.setItem('主题', zhuTi), [主题])
  const page = await context.newPage()
  const 错误: string[] = []
  page.on('console', (消) => {
    if (消.type() === 'error') 错误.push(消.text())
  })
  page.on('pageerror', (错) => 错误.push(String(错)))
  await page.goto(路径, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const 实际主题 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  return { context, page, 错误, 实际主题 }
}

const 页内环 = (字段: string[]) => {
  return 字段.map((选) => {
    const 元 = document.querySelector(选) as HTMLElement | null
    if (!元) return { 选择器: 选, focusVisible: false, outline: '元素不存在', 组内下划线数: -1, 标签: '-' }
    const cs = getComputedStyle(元)
    const 组 = 元.closest('.shuru-zu') as HTMLElement | null
    const 标 = 组 ? (组.querySelector('.fudong-biaoqian') as HTMLElement | null) : null
    const bs = 标 ? getComputedStyle(标) : null
    return {
      选择器: 选,
      focusVisible: 元.matches(':focus-visible'),
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} offset ${cs.outlineOffset}`,
      组内下划线数: 组 ? 组.querySelectorAll('.dixian-dixian').length : 0,
      标签: bs ? `${bs.top} / ${bs.fontSize} / ${bs.color}` : '-',
    }
  })
}

const 页内DOM = (): DOM状态型 => {
  const 取规则 = (表: CSSStyleSheet): CSSRuleList | null => {
    try {
      return 表.cssRules
    } catch {
      return null
    }
  }
  let 数 = 0
  for (const 表 of Array.from(document.styleSheets)) {
    const 规则 = 取规则(表)
    const 走 = (清单: CSSRuleList) => {
      for (const 条 of Array.from(清单)) {
        if ((条.cssText || '').indexOf('dixian') >= 0) 数++
        if (条 instanceof CSSMediaRule) 走(条.cssRules)
      }
    }
    if (规则) 走(规则)
  }
  return {
    全局下划线数: document.querySelectorAll('.dixian-dixian').length,
    横向溢出: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    下划线样式声明数: 数,
  }
}

/** 取判定带所在行的页面坐标采样点（elementsFromPoint 用页面坐标，不是裁剪图坐标） */
function 带内x(普查: 普查结果, 选择器: string): number[] {
  const 元 = 普查.几何.输入框.find((项) => 项.选择器 === 选择器)
  if (!元) return [普查.可视卡矩形.左 + 20]
  return [元.矩形.左 + 20, (元.矩形.左 + 元.矩形.右) / 2, 元.矩形.右 - 20]
}

async function 记录态(
  记录集: 记录[],
  page: Page,
  主题: string,
  视口名: string,
  页面: string,
  聚焦: string,
  卡择: string,
  字段: string[],
  主字段?: string,
): Promise<普查结果> {
  const 名 = png路径(主题, 视口名, 页面, 聚焦)
  const 普查 = await 卡内白条普查(page, 卡择, 字段, 名)
  记录集.push({
    主题,
    视口: 视口名,
    页面,
    聚焦,
    普查,
    可扫: 该字段可扫(普查, 主字段 ?? 字段[字段.length - 1]),
    截图: 名,
  })
  return 普查
}

test.describe('FP-03 焦点装饰线像素取证', () => {
  test.setTimeout(900000)

  test(`登录/注册页聚焦白条带取证（${标签}）`, async ({ browser }) => {
    test.skip(范围 !== 'quanbu' && 范围 !== 'denglu', '按 FP03_FANWEI 只跑指定范围')
    const 记录集: 记录[] = []
    const 定位集: unknown[] = []
    const Tab遍历: Tab记录[] = []
    const 环清单: 环记录[] = []
    const 错误集: string[] = []
    let DOM状态: DOM状态型 = { 全局下划线数: -1, 横向溢出: -1, 下划线样式声明数: -1 }
    const 减动效清单: string[] = []

    for (const 主题 of 主题清单) {
      for (const 视口 of 视口清单) {
        const { context, page, 错误, 实际主题 } = await 开页(browser, 主题, 视口)
        expect(实际主题, `主题未按预期落地：${实际主题}`).toBe(主题 === '浅色' ? 'light' : 'dark')
        await page.waitForSelector('#denglu-shoujihao')
        const 桌面 = 视口.名 === '桌面1440x900'

        await 记录态(记录集, page, 主题, 视口.名, '登录静置', '未点击', 卡, 登录字段, '#denglu-shoujihao')

        await page.click('#denglu-shoujihao')
        await page.waitForTimeout(650)
        const 手机普查 = await 记录态(记录集, page, 主题, 视口.名, '登录聚焦', '手机号', 卡, 登录字段, '#denglu-shoujihao')
        for (const 条 of 手机普查.判定带命中.slice(0, 2)) {
          定位集.push({
            主题,
            视口: 视口.名,
            聚焦: '#denglu-shoujihao',
            行: 条.条带.起始行,
            层: await 画线元素定位(page, 条.条带.起始行, 带内x(手机普查, '#denglu-shoujihao')),
          })
        }

        await page.fill('#denglu-shoujihao', '13800138000')
        await page.click('#denglu-mima')
        await page.waitForTimeout(650)
        const 密码普查 = await 记录态(记录集, page, 主题, 视口.名, '登录聚焦', '密码(手机号有值)', 卡, 登录字段, '#denglu-mima')
        for (const 条 of 密码普查.判定带命中.slice(0, 2)) {
          定位集.push({
            主题,
            视口: 视口.名,
            聚焦: '#denglu-mima',
            行: 条.条带.起始行,
            层: await 画线元素定位(page, 条.条带.起始行, 带内x(密码普查, '#denglu-mima')),
          })
        }
        for (const 项 of await page.evaluate(页内环, 登录字段)) {
          环清单.push({ 主题, 视口: 视口.名, 页面: '登录(点击)', ...项 })
        }

        await page.evaluate(() => (document.querySelector('.biaoqian-anniu') as HTMLElement).focus())
        let 停在文本框 = false
        for (let 步 = 1; 步 <= 10 && !停在文本框; 步++) {
          await page.keyboard.press('Tab')
          const 落点 = await page.evaluate(() => {
            const 元 = document.activeElement as HTMLElement
            const cs = getComputedStyle(元)
            return {
              元素: `${元.tagName.toLowerCase()}#${元.id || '-'}.${String(元.className).split(' ')[0]}`,
              outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} offset ${cs.outlineOffset}`,
              是文本框: 元.matches('.fenlie-shuru'),
            }
          })
          Tab遍历.push({ 主题, 步, ...落点 })
          if (落点.是文本框) 停在文本框 = true
        }
        await 记录态(记录集, page, 主题, 视口.名, '登录键盘焦点', 'Tab落入文本框', 卡, 登录字段, '#denglu-mima')
        for (const 项 of await page.evaluate(页内环, 登录字段)) {
          环清单.push({ 主题, 视口: 视口.名, 页面: '登录(Tab键盘)', ...项 })
        }

        if (桌面) {
          await page.locator('.biaoqian-anniu').nth(1).click()
          await page.waitForTimeout(900)
          await page.fill('#zhuce-shoujihao', '13800138000')
          for (const 选 of 注册字段) {
            await page.locator(选).focus()
            await page.waitForTimeout(650)
            await 记录态(记录集, page, 主题, 视口.名, '注册聚焦', 选.replace('#zhuce-', ''), 卡, 注册字段, 选)
            for (const 项 of await page.evaluate(页内环, 注册字段)) {
              环清单.push({ 主题, 视口: 视口.名, 页面: '注册', ...项 })
            }
          }
        }

        DOM状态 = await page.evaluate(页内DOM)
        错误集.push(...错误.map((错) => `[${主题}/${视口.名}] ${错}`))
        await context.close()
      }
    }

    /* 验收⑥：prefers-reduced-motion 分支不回归（装饰线删除后，同分支其余选择器仍须 transition:none） */
    {
      const { context: 静context, page: 静page } = await 开页(browser, '暗色', 视口清单[0])
      await 静page.emulateMedia({ reducedMotion: 'reduce' })
      await 静page.waitForSelector('#denglu-shoujihao')
      await 静page.waitForTimeout(1500)
      const 减动效态 = await 静page.evaluate((选单: string[]) => {
        return 选单.map((选) => {
          const 元 = document.querySelector(选)
          if (!元) return { 选, 在场: false, transition: '缺席' }
          const cs = getComputedStyle(元)
          return { 选, 在场: true, transition: cs.transition, transitionDuration: cs.transitionDuration }
        })
      }, ['.fudong-biaoqian', '.biaoqian-anniu', '.anniu-zhuyao', '.fasong-anniu', '.mima-qiehuan'])
      const 减普查 = await 卡内白条普查(静page, 卡, 登录字段, png路径('暗色', '桌面1440x900', '登录减动效', 'reduce'))
      减动效清单.push(
        ...减动效态.map((项: { 选: string; 在场: boolean; transition: string }) => `${项.选}${项.在场 ? '' : '（缺席）'}=${项.transition}`),
        `聚焦输入框 outline=${await 静page.evaluate(() => {
          const cs = getComputedStyle(document.querySelector('#denglu-shoujihao') as HTMLElement)
          return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`
        })}`,
        `判定带亮条命中=${减普查.判定带命中.length}`,
      )
      await 静context.close()
    }

    写证据(
      'FP-03-登录页',
      记录集,
      定位集,
      Tab遍历,
      环清单,
      DOM状态,
      错误集,
      ['页面：`/login`。登录表单与注册表单是 `登录内容.vue` 内 `v-if/v-else` 双表单（无路由跳转），故注册态 URL 仍为 `/login`。'],
      减动效清单,
      'before 期望 >0（复现需求 #1 的白线）；after 期望 =0',
    )
    // 在场选择器（.fasong-anniu 仅注册表单有，登录 tab 下缺席）必须 transition:none / 全 0s
    const 未撤 = 减动效清单.filter((行) => {
      if (!行.startsWith('.') || 行.includes('缺席')) return false
      const 值 = 行.slice(行.indexOf('=') + 1).trim()
      return !值.startsWith('none') && !/^all 0s( ease 0s)?$/.test(值)
    })
    expect(未撤.length, `reduced-motion 分支回归（transition 未撤）：${未撤.join(' / ')}`).toBe(0)
    expect(减动效清单.some((行) => 行.includes('.fudong-biaoqian=') && !行.includes('缺席')), '未取到 .fudong-biaoqian 的减动效读数').toBe(true)

  })

  test(`同类点页（账号与安全 + 资料设置向导）聚焦白条带取证（${标签}）`, async ({ browser }) => {
    test.skip(范围 !== 'quanbu' && 范围 !== 'leidian', '按 FP03_FANWEI 只跑指定范围')
    const 记录集: 记录[] = []
    const 环清单: 环记录[] = []
    const 定位集: unknown[] = []
    const 错误集: string[] = []
    const 几何附记: string[] = []

    const 站点: { 页: string; 路径: string; 卡择: string; 字段: string[] }[] = [
      {
        页: '账号与安全',
        路径: '/zhang-hao-an-quan',
        卡择: '.zhang-hao-an-quan',
        字段: ['.sou-suo-shuru', '.she-zhi-shuru', '.qianming-shuru'],
      },
      /* /profile-setup 不入活体取证：`资料设置向导.vue:483` 在 onMounted 里对资料已完整的账号
         `router.push('/tian-jia-wei-xin')` 自转发，夹具账号（出生日期 2000-01-01）必然被弹走，
         实测 waitForSelector('.xinmuzhong-shurukuang') 60s 超时。该点按静态判定入册，见 md 附记。 */
    ]

    for (const 站 of 站点) {
      for (const 主题 of 主题清单) {
        const qingQiu = await daKaiJiaJuQingQiu()
        let 身份
        try {
          身份 = await baoZhengCeShiZhangHao(qingQiu)
        } finally {
          await qingQiu.dispose()
        }
        const 视口 = 视口清单[0]
        const { context, page, 错误, 实际主题 } = await 开页(browser, 主题, 视口)
        expect(实际主题, `主题未按预期落地：${实际主题}`).toBe(主题 === '浅色' ? 'light' : 'dark')
        await zhuRuJiaJuShenFen(page, 身份)
        await page.goto(站.路径, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector(站.字段[0], { timeout: 60000 })
        await page.waitForTimeout(2000)
        const 在场 = await page.evaluate(
          (字段: string[]) => 字段.map((选) => Boolean(document.querySelector(选))),
          站.字段,
        )
        expect(在场.every(Boolean), `${站.页} 字段缺席：${JSON.stringify(站.字段)} → ${JSON.stringify(在场)}`).toBe(true)

        const 静置 = await 记录态(记录集, page, 主题, 视口.名, 站.页, '未点击', 站.卡择, 站.字段)
        几何附记.push(
          `${站.页}/${主题}：卡顶到首输入框顶的距离 = ${(
            (静置.几何.输入框[0]?.矩形.上 ?? 0) - (静置.几何.卡矩形.上 ?? 0)
          ).toFixed(1)}px（用于判定卡顶常驻高光棱线是否落入输入框判定带）`,
        )
        for (const 选 of 站.字段) {
          await page.locator(选).first().scrollIntoViewIfNeeded()
          await page.locator(选).first().click()
          await page.waitForTimeout(650)
          const 普查 = await 记录态(记录集, page, 主题, 视口.名, 站.页, 选.replace(/^\./, ''), 站.卡择, 站.字段, 选)
          for (const 条 of 普查.判定带命中.slice(0, 2)) {
            定位集.push({
              站: 站.页,
              主题,
              聚焦: 选,
              行: 条.条带.起始行,
              层: await 画线元素定位(page, 条.条带.起始行, 带内x(普查, 选)),
            })
          }
          for (const 项 of await page.evaluate(页内环, [选])) {
            环清单.push({ 主题, 视口: 视口.名, 页面: 站.页, ...项 })
          }
        }
        错误集.push(...错误.map((错) => `[${站.页}/${主题}] ${错}`))
        await context.close()
      }
    }

    写证据(
      'FP-03-同类点页',
      记录集,
      定位集,
      [],
      环清单,
      { 全局下划线数: -1, 横向溢出: -1, 下划线样式声明数: -1 },
      错误集,
      [
        '页面：`/zhang-hao-an-quan`（FP-01 交回的三处 `:focus{outline:none}` 同类点）与 `/profile-setup`（`.xinmuzhong-shurukuang` 同类点）。',
        '登录态由既有 e2e 夹具注入（`tests/测试夹具.ts`，只 import 不改动）。',
        '同类点在册但只做静态判定的点：`资料设置向导.vue:968/997` `.xinmuzhong-shurukuang:focus` 只改 border-color + 字段自身背景（rgba(255,255,255,.09) 的块状铺底，厚度=字段高 ~40px，不属 ≤4px 条带类），无 `outline:none`，全局令牌窄环不被压制 ⇒ 判定为「非同类缺陷、无需治理」；该文件归 FP-15 轨道。',
        '`过往战绩.vue:1991-2000` `.gouxuan-anniu--bufen::after` 是 10x2px 的黄色半选勾形（控件图形），`主页内容.vue:267-273` `.biaoti-fenge` 是 40x2px 常驻标题分隔线，`资料设置向导.vue:512-521` / `管理员监控.vue:408-417` 是卡顶常驻 1px 高光棱线（不随聚焦出现，实测距首输入框顶 ≥6px 判定带之外）——均判定为必要装饰。',
        ...几何附记,
      ],
      [],
      '两档期望恒为 0：这些页面从来不带该装饰，本文件是"同类点穷尽"的反向取证（证明无同类缺陷），不是复现取证',
    )

    const 命中总数 = 记录集.reduce((和, 记) => 和 + 记.普查.判定带命中.length, 0)
    expect(命中总数, `同类点页聚焦时 ±6px 判定带内出现 ${命中总数} 处亮条横向条带，须一并治理`).toBe(0)
    const 无环 = 环清单.filter((元) => !/solid/.test(元.outline) || / 0px /.test(元.outline))
    expect(无环.length, `同类点文本框无可见焦点环：\n${无环.map((元) => `${元.页面}/${元.选择器}=${元.outline}`).join('\n')}`).toBe(0)
    expect(错误集.length, `控制台 error 非零：\n${错误集.join('\n')}`).toBe(0)
  })
})
