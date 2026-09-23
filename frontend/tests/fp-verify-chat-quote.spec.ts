import { expect, test, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createConsoleCollector } from './console-error-collector'

// 「循环工程」取证派单（聊天页簇）· 态 2：引用条 / 气泡内引用块 / 提示带。
// 判定点 5（FP-09 引用条 + FP-08d 图片右键引用）/ 6（引用块定位·抖动·高亮·占位）/ 7（FP-07 提示带真机可选中）。
// 只取证不改 src；数据 page.route 桩注入，不需要后端；headless。

test.setTimeout(240000)

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 前端根 = path.resolve(本目录, '..')
const 截图目录 = path.resolve(前端根, '..', '测试截图')
const 结果文件 = path.resolve(前端根, 'test-results', 'fp-verify-chat-取证', `quote-取证结果${process.env.FPVC_SUFFIX ? `-${process.env.FPVC_SUFFIX}` : ''}.json`)
// 复跑必换名（L-10，与 fp-verify-chat-input 同口径）：FPVC_LABEL 换日期段、FPVC_SUFFIX 换结果文件名，默认值不动
const 日期 = process.env.FPVC_LABEL ?? '20260922'

const 素材 = { 照片: { url: '/__fpvc__/zhaopian-360x400.svg', kuan: 360, gao: 400 } }
const 会话ID = 'fpvc-huihua'
const 我的ID = 'fpvc-uid'

function svg素材(kuan: number, gao: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${kuan}" height="${gao}" ` +
    `viewBox="0 0 ${kuan} ${gao}"><rect width="${kuan}" height="${gao}" fill="rgb(0,229,255)"/></svg>`
  )
}

const 测试用户 = {
  id: 我的ID,
  shou_ji_hao: '13800138011',
  yong_hu_ming: 'fpvcq',
  ni_cheng: '取证用户',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
}

const 用户设置 = {
  uid: 我的ID,
  shou_ji_hao: '13800138011',
  tou_xiang: null,
  qian_ming: null,
  qian_ming_ke_jian_xing: 'gong_kai',
  qian_ming_bai_ming_dan: [],
  liao_tian_bei_jing: 'moRen',
  qi_pao_zi_ji: 'yunBai',
  qi_pao_ai: 'yunBai',
  gong_kai_zhang_hao: true,
  gong_kai_shou_ji_hao: false,
  gong_kai_you_xiang: false,
  bang_ding_you_xiang: '',
}

const 原文开头 = '验证原文开头甲'
const 长原文 = 原文开头 + '。这段文字很长，用来验证引用摘要两行截断的渲染表现。'.repeat(9)

function 填字(i: number) {
  return {
    id: `fpvc-f${i}`,
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: `填充句${i}：让消息列表足够长，制造可滚动的视口外区域，用于验证引用定位只向上滚的口径。`.repeat(6),
    lei_xing: 'wenben',
    mei_ti_id: null,
    shi_jian_chuo: 1700000100000 + i * 1000,
    yi_du: true,
  }
}

const 历史消息: Record<string, unknown>[] = [
  {
    id: 'verify-orig',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: 长原文,
    lei_xing: 'wenben',
    mei_ti_id: null,
    shi_jian_chuo: 1700000000000,
    yi_du: true,
  },
  ...Array.from({ length: 14 }, (_v, i) => 填字(i)),
  {
    id: 'verify-chehui-target',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 我的ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '（已撤回的占位显示行）',
    lei_xing: 'wenben',
    mei_ti_id: null,
    yi_che_hui: true,
    shi_jian_chuo: 1700000200000,
    yi_du: true,
  },
  {
    id: 'verify-ref-ok',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 我的ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '带有效引用的行',
    lei_xing: 'wenben',
    mei_ti_id: null,
    bei_yong_xiao_xi_id: 'verify-orig',
    shi_jian_chuo: 1700000201000,
    yi_du: true,
  },
  {
    id: 'verify-ref-chehui',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: '我的',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '引用了已撤回消息的行',
    lei_xing: 'wenben',
    mei_ti_id: null,
    bei_yong_xiao_xi_id: 'verify-chehui-target',
    shi_jian_chuo: 1700000202000,
    yi_du: true,
  },
  {
    id: 'verify-ref-missing',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 我的ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '引用了不存在目标的行',
    lei_xing: 'wenben',
    mei_ti_id: null,
    bei_yong_xiao_xi_id: 'nonexistent-target-0000',
    shi_jian_chuo: 1700000203000,
    yi_du: true,
  },
  {
    id: 'verify-img',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 我的ID,
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '[图片]',
    lei_xing: 'tuPian',
    mei_ti_id: 'fpvc-photo',
    mei_ti_url: 素材.照片.url,
    shi_jian_chuo: 1700000204000,
    yi_du: true,
  },
]

async function 挂载夹具(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('令牌', 'fpvcq-token')
  })
  await page.route('**/socket.io/**', (route) => route.abort())
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort())
  await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }))
  await page.route('**/__fpvc__/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg素材(素材.照片.kuan, 素材.照片.gao) }),
  )
  await page.route('**/api/**', (route) => {
    const 路径 = decodeURIComponent(new URL(route.request().url()).pathname)
    if (!路径.startsWith('/api')) return route.fallback()
    if (路径.endsWith('/api/认证/信息')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 测试用户 }) })
    }
    if (路径 === '/api/用户设置' || 路径.startsWith('/api/用户设置/')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 用户设置 }) })
    }
    if (路径.includes('/api/聊天/会话/') && 路径.endsWith('/消息')) {
      // 服务端契约：lie_biao 为**新→旧降序**（stores/聊天.ts:628 会 reverse 成升序）⇒ 桩必须按降序给，
      // 否则页面呈现为倒序（本 worker 首跑实测踩到，属夹具口径而非产品缺陷）
      const 降序 = [...历史消息].reverse()
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: 降序, zong_shu: 降序.length, hai_you_geng_duo: false } }),
      })
    }
    if (路径.endsWith('/api/聊天/会话列表') || 路径.includes('/api/聊天/会话列表')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [{ id: 会话ID, ming_cheng: '取证会话', jiao_se_id: 会话ID }] } }) })
    }
    if (路径.startsWith('/api/角色/详情/')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { jiao_se: { id: 会话ID, 名字: '取证角色', ming_zi: '取证角色', tou_xiang: null, 头像: null }, dang_an_zhuang_tai: null } }),
      })
    }
    if (路径.endsWith('/api/聊天/多模态配置')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { yuYinLiJieQiYong: false, shiPinLiJieQiYong: false, tuXiangShengChengQiYong: false, shiPinShengChengQiYong: false, meiRiShengChengShangXian: 0 } }) })
    }
    if (路径.startsWith('/api/表情/我的')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], zong_shu: 0 } }) })
    }
    if (路径.startsWith('/api/通知')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], wei_du_shu: 0 } }) })
    }
    if (路径.endsWith('/api/资料/封禁状态')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { bei_feng_jin: false, ji_bie: 'zheng_chang', wei_gui_ci_shu: 0, jie_feng_shi_jian: null, shu_su_zhuang_tai: 'wu' } }) })
    }
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) })
  })
}

async function 进入聊天页(page: Page) {
  await page.goto(`/chat/${会话ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(page.locator('footer.shuru-quyu .shuru-rongqi').first()).toBeVisible({ timeout: 60000 })
  await expect(page.locator('#xiaoxi-verify-ref-ok')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('#xiaoxi-verify-img')).toBeVisible({ timeout: 30000 })
  await page.waitForTimeout(600)
}

/* —— 判定点 6：气泡内引用块 —— */

async function 取证引用块桌面(page: Page, 记: Record<string, unknown>) {
  记.引用块数 = await page.locator('.yinyong-kuai').count()
  const r1 = page.locator('#xiaoxi-verify-ref-ok .yinyong-kuai')
  await expect(r1).toBeVisible({ timeout: 15000 })
  记.有效引用块 = await r1.evaluate((el: HTMLElement) => {
    const bf = getComputedStyle(el, '::before')
    const 摘要 = el.querySelector('.yinyong-kuai-zhaiyao') as HTMLElement
    const cs = getComputedStyle(摘要)
    const rr = 摘要.getBoundingClientRect()
    const 行高 = parseFloat(cs.lineHeight)
    return {
      色条宽: bf.width,
      色条色: bf.backgroundColor,
      行数钳制: (cs as unknown as Record<string, string>).webkitLineClamp ?? cs.getPropertyValue('-webkit-line-clamp'),
      摘要高: +rr.height.toFixed(2),
      行高,
      两行上限: 行高 * 2,
      摘要文本: 摘要.innerText.replace(/\s+/g, ' ').trim().slice(0, 60),
      ariaDisabled: el.getAttribute('aria-disabled'),
    }
  })
  const q = 记.有效引用块 as any
  expect(q.色条宽, '3px 左色条（解析值）').toBe('3px')
  expect(q.行数钳制, 'line-clamp 解析值 = 2').toBe('2')
  expect(q.摘要高, '摘要渲染高 ≤ 2 行').toBeLessThanOrEqual(q.两行上限 + 1)
  expect(q.摘要文本, '含发送者名').toContain('取证角色')
  expect(q.摘要文本, '含被引原文开头').toContain(原文开头)
  expect(q.ariaDisabled, '有效引用可定位（无 aria-disabled）').toBeNull()

  // 定位滚动：滚到底 ⇒ 原消息在视口上方；点击后只向上滚、±1px 抖动、高亮吃 --jing-gao-se
  const 滚动定位 = await page.evaluate(async () => {
    const 容 = document.querySelector('main.xiaoxi-quyu') as HTMLElement
    const 目标 = document.getElementById('xiaoxi-verify-orig') as HTMLElement
    const 块 = document.querySelector('#xiaoxi-verify-ref-ok .yinyong-kuai') as HTMLElement
    const 探针 = document.createElement('span')
    探针.style.color = 'var(--jing-gao-se)'
    document.body.appendChild(探针)
    const 令牌色 = getComputedStyle(探针).color
    探针.remove()
    const 链: any[] = []
    let 元: HTMLElement | null = document.querySelector('.liaotian-yemian')
    while (元) {
      const cs = getComputedStyle(元)
      链.push({ 元: `${元.tagName}.${String(元.className || '').slice(0, 40)}`, 盒高: +元.getBoundingClientRect().height.toFixed(2), css高: cs.height, overflow: cs.overflow })
      元 = 元.parentElement
    }
    const 读 = () => ({ top: 容.scrollTop, gap: +(目标.getBoundingClientRect().top - 容.getBoundingClientRect().top).toFixed(2) })
    容.scrollTop = 0
    await new Promise((r) => setTimeout(r, 120))
    const 行清单 = (Array.from(document.querySelectorAll('.xiaoxi-xiangmu[id]')) as HTMLElement[])
      .map((el) => ({ id: el.id, top: +(el.getBoundingClientRect().top - 容.getBoundingClientRect().top).toFixed(1) }))
      .sort((a, b) => a.top - b.top)
    const 零位 = { 目标gap: +(目标.getBoundingClientRect().top - 容.getBoundingClientRect().top).toFixed(2), 块gap: +(块.parentElement!.getBoundingClientRect().top - 容.getBoundingClientRect().top).toFixed(2), scrollTop: 容.scrollTop, 视觉首三: 行清单.slice(0, 3), 视觉末三: 行清单.slice(-3), 布局: getComputedStyle(容).flexDirection + '/' + getComputedStyle(容).display }
    容.scrollTop = 容.scrollHeight
    await new Promise((r) => setTimeout(r, 120))
    const 底 = 容.scrollTop
    const 在上方 = 目标.getBoundingClientRect().top < 容.getBoundingClientRect().top
    块.click()
    await new Promise((r) => setTimeout(r, 150))
    const s1 = 读()
    let 高亮色: string | null = null
    for (let i = 0; i < 20; i += 1) {
      const sh = getComputedStyle(目标).boxShadow
      if (sh && sh !== 'none') {
        高亮色 = sh
        break
      }
      await new Promise((r) => setTimeout(r, 100))
    }
    const 动画数 = 目标.getAnimations().length
    容.scrollTop = 容.scrollHeight
    await new Promise((r) => setTimeout(r, 100))
    块.click()
    await new Promise((r) => setTimeout(r, 150))
    const s2 = 读()
    return { 祖先链: 链, 零位, 底, 在上方, gap原: +(目标.getBoundingClientRect().top - 容.getBoundingClientRect().top).toFixed(2), 条高: 容.scrollHeight, 口高: 容.clientHeight, s1: s1.top, gap1: s1.gap, s2: s2.top, gap2: s2.gap, 令牌色, 高亮色, 动画数 }
  })
  记.滚动定位 = 滚动定位
  const g = 滚动定位 as any
  expect(g.在上方, '前置条件：原消息在视口上方').toBe(true)
  expect(g.s1, '点击后向上滚（scrollTop 减小）').toBeLessThan(g.底)
  expect(Math.abs(g.gap1), '落点与原消息顶边差 ≤1px（抖动幅）').toBeLessThanOrEqual(1)
  expect(Math.abs(g.s1 - g.s2), '两次点击落点差 ≤1px（±1 抖动）').toBeLessThanOrEqual(1)
  expect(g.动画数, '高亮 Web Animation 在跑').toBeGreaterThan(0)
  expect(g.高亮色, '高亮 box-shadow 出现').not.toBeNull()
  // 动画中途采样时 alpha 被插值（实测 0.267/0.435），比对 RGB 三元组本身 = --jing-gao-se 解析值
  const 三元组 = (g.令牌色 as string).match(/\d+/g)!.slice(0, 3).join(', ')
  expect(g.高亮色, `高亮色 RGB 取 --jing-gao-se（${g.令牌色}）`).toContain(三元组)

  // 撤回/取不到 ⇒ 占位不空白不抛错、不可定位
  const 占位: Record<string, unknown> = {}
  for (const [名, 行] of [
    ['撤回', '#xiaoxi-verify-ref-chehui'],
    ['缺失', '#xiaoxi-verify-ref-missing'],
  ] as const) {
    const 块 = page.locator(`${行} .yinyong-kuai`)
    const 信息 = await 块.evaluate((el: HTMLElement) => ({ 文本: el.innerText.replace(/\s+/g, ' ').trim(), aria: el.getAttribute('aria-disabled') }))
    占位[名] = 信息
    expect(信息.文本, `${名}目标引用块走占位文案非空`).not.toBe('')
    expect(信息.文本).toContain('撤回')
    expect(信息.aria, `${名}目标不可定位（aria-disabled=true）`).toBe('true')
    // FP-10c⑤ 改判（旧→新，判据不更弱）：
    //   旧：断言 aria-disabled 之后再裸 `块.click()`。Playwright 1.63 把 aria-disabled=true 判为
    //   not enabled，actionability 自动等待空转到超时（该轮重试 184 次）；且旧代码在这次 click
    //   之后**没有任何断言** ⇒ 这一行从来不是判据，只是挂点。force/dispatchEvent 都绕过真用户语义，不用。
    //   新：① aria-disabled='true' 门禁原样保留；② 用 page.mouse 坐标真实点击（trusted，不绕过
    //   pointer-events/命中测试，等价于真用户点一只禁用块）；③ 把「不可定位」从隐性升为显式判据：
    //   点击前后 main.xiaoxi-quyu 的 scrollTop 必须严格不变。判定维度只增不减。
    await 块.scrollIntoViewIfNeeded()
    const 块盒 = await 块.boundingBox()
    expect(块盒, `${名}目标占位块取不到几何，「点击无效果」判据无法取样`).toBeTruthy()
    const 滚动前 = await page.locator('main.xiaoxi-quyu').evaluate((元) => 元.scrollTop)
    await page.mouse.click(块盒!.x + 块盒!.width / 2, 块盒!.y + 块盒!.height / 2)
    await page.waitForTimeout(300)
    const 滚动后 = await page.locator('main.xiaoxi-quyu').evaluate((元) => 元.scrollTop)
    expect(滚动后, `${名}目标：真机点击 aria-disabled 占位块后消息区仍滚动了（不可定位契约破）`).toBe(滚动前)
    占位[`${名}点击前后滚动`] = { 滚动前, 滚动后 }
  }
  await page.waitForTimeout(400)
  记.占位 = 占位
}

/* —— 判定点 5：图片右键「引用」→ 引用条 + 键盘可达 —— */

async function 取证引用条(page: Page, 记: Record<string, unknown>) {
  await page.locator('#xiaoxi-verify-img').click({ button: 'right' })
  await expect(page.locator('.chehui-zhezhao')).toBeVisible({ timeout: 5000 })
  const 项清单 = await page.locator('.chehui-caidan .chehui-xiangmu').allInnerTexts()
  记.图片菜单项 = 项清单.map((s) => s.trim())
  const 引用项 = page.locator('.chehui-caidan .chehui-xiangmu', { hasText: /^引用$/ })
  await expect(引用项, 'FP-08d：图片右键菜单出现「引用」').toHaveCount(1)
  await 引用项.click()
  const 条 = page.locator('.shuru-rongqi > .yinyong-tiao')
  await expect(条).toBeVisible({ timeout: 5000 })
  记.引用条 = await page.evaluate(() => {
    const 条el = document.querySelector('.yinyong-tiao') as HTMLElement
    const 外 = document.querySelector('.shuru-kuang-waike') as HTMLElement
    const 摘要 = document.querySelector('.yinyong-tiao-zhaiyao') as HTMLElement
    const cs = getComputedStyle(摘要)
    const rr = 摘要.getBoundingClientRect()
    const 钮 = document.querySelector('.yinyong-tiao-guanbi') as HTMLButtonElement
    const 钮r = 钮.getBoundingClientRect()
    return {
      在输入区上方: 条el.getBoundingClientRect().bottom <= 外.getBoundingClientRect().top + 0.5,
      在输入区容器内: !!条el.closest('.shuru-rongqi'),
      摘要文本: 摘要.innerText.trim(),
      行数钳制: (cs as unknown as Record<string, string>).webkitLineClamp,
      摘要高: +rr.height.toFixed(2),
      行高: parseFloat(cs.lineHeight),
      关闭钮是原生button: 钮.tagName === 'BUTTON' && 钮.type === 'button',
      关闭钮aria: 钮.getAttribute('aria-label'),
      关闭钮盒: { w: +钮r.width.toFixed(2), h: +钮r.height.toFixed(2) },
    }
  })
  const b = 记.引用条 as any
  expect(b.在输入区容器内, '引用条落在 .shuru-rongqi（输入区）').toBe(true)
  expect(b.在输入区上方, '引用条在输入框（编辑器盒）上方').toBe(true)
  expect(b.摘要文本.length, '媒体引用摘要走单源占位非空').toBeGreaterThan(0)
  expect(b.行数钳制, '引用条摘要 ≤2 行钳制').toBe('2')
  expect(b.摘要高, '摘要渲染高 ≤2 行').toBeLessThanOrEqual(b.行高 * 2 + 1)
  expect(b.关闭钮是原生button, '关闭按钮为原生 button（键盘可聚焦）').toBe(true)
  await page.locator('.yinyong-tiao-guanbi').focus()
  const 焦点在钮 = await page.evaluate(() => document.activeElement?.classList.contains('yinyong-tiao-guanbi') === true)
  expect(焦点在钮, 'Tab/焦点可到达关闭钮').toBe(true)
  await page.keyboard.press('Enter')
  await expect(page.locator('.yinyong-tiao')).toHaveCount(0)
  记.键盘取消引用 = { 焦点在钮, Enter后条消失: true }
}

/* —— 判定点 7：提示带（错误触发源 = 贴纸超限，纯产品路径、零 console.error）—— */

async function 触发超限错误(page: Page): Promise<boolean> {
  for (let i = 0; i < 13; i += 1) {
    const 面板开 = await page.locator('.emoji-mianban').isVisible().catch(() => false)
    if (!面板开) {
      await page.locator('.biaoqing-anniu').click()
      await page.waitForTimeout(250)
      const 页签 = await page.locator('.mianban-tab').nth(1).getAttribute('class')
      if (!页签 || !页签.includes('huoyue')) await page.locator('.mianban-tab').nth(1).click()
      await page.waitForTimeout(150)
    }
    const 贴纸 = page.locator('.biaoqingbao-fenqu').nth(1).locator('.biaoqingbao-xiangmu').first()
    await 贴纸.click()
    await page.waitForTimeout(350)
    if (await page.locator('.tishi-dai-cuowu').count()) return true
  }
  return false
}

async function 取证提示带(page: Page, 档位: string, 记: Record<string, unknown>) {
  const 带 = page.locator('.tishi-dai')
  await expect(带).toBeVisible({ timeout: 5000 })
  记.触发超限前 = { 声明槽: await page.locator('.tishi-dai-shengming').count(), 错误槽: await page.locator('.tishi-dai-cuowu').count() }
  const 触发成功 = await 触发超限错误(page)
  记.超限触发 = 触发成功
  expect(触发成功, '待发块超限 ⇒ 错误进提示带右槽（product 路径）').toBe(true)
  记.提示带 = await page.evaluate(() => {
    const 带el = document.querySelector('.tishi-dai') as HTMLElement
    const cs = getComputedStyle(带el)
    const r = 带el.getBoundingClientRect()
    const 声明 = document.querySelector('.tishi-dai-shengming') as HTMLElement
    const 错误 = document.querySelector('.tishi-dai-cuowu') as HTMLElement
    return {
      档位: 'x',
      justify: cs.justifyContent,
      flexWrap: cs.flexWrap,
      userSelect: cs.userSelect,
      pointerEvents: cs.pointerEvents,
      带宽: +r.width.toFixed(2),
      带中心x: +(r.left + r.width / 2).toFixed(2),
      视口中心x: +(window.innerWidth / 2).toFixed(2),
      同行: 声明.getBoundingClientRect().top === 错误.getBoundingClientRect().top || cs.flexWrap === 'wrap',
      声明文本: 声明.innerText.trim(),
      错误文本: 错误.innerText.trim(),
      同带体: 声明.parentElement === 带el && 错误.parentElement === 带el,
    }
  })
  const t = 记.提示带 as any
  t.档位 = 档位
  expect(t.justify, '整体居中（justify-content: center）').toBe('center')
  expect(t.userSelect, '带体可选中（user-select: text）').toBe('text')
  expect(t.pointerEvents, '带体可交互（pointer-events: auto）').toBe('auto')
  expect(Math.abs(t.带中心x - t.视口中心x), '带体水平居中 ≤1px').toBeLessThanOrEqual(1)
  expect(t.同带体, 'AI 声明与错误同一条带').toBe(true)
  expect(t.声明文本).toContain('AI')
  expect(t.错误文本.length).toBeGreaterThan(0)

  // 真机双击选中
  const 错误盒 = await page.locator('.tishi-dai-cuowu').boundingBox()
  expect(错误盒).not.toBeNull()
  await page.mouse.dblclick(Math.round(错误盒!.x + 错误盒!.width / 2), Math.round(错误盒!.y + 错误盒!.height / 2))
  记.双击选中 = await page.evaluate(() => ({ 选区: window.getSelection()?.toString() ?? '' }))
  expect((记.双击选中 as any).选区.length, '双击能选中错误文本（getSelection 非空）').toBeGreaterThan(0)
  await page.evaluate(() => window.getSelection()?.removeAllRanges())

  // 真机拖选整条
  const 带盒 = await page.locator('.tishi-dai').boundingBox()
  await page.mouse.move(带盒!.x + 4, 带盒!.y + 带盒!.height / 2)
  await page.mouse.down()
  await page.mouse.move(带盒!.x + 带盒!.width - 4, 带盒!.y + 带盒!.height / 2, { steps: 12 })
  await page.mouse.up()
  记.拖选 = await page.evaluate(() => {
    const s = window.getSelection()
    const 带el = document.querySelector('.tishi-dai') as HTMLElement
    const 归一 = (x: string) => x.replace(/\s+/g, '')
    const 选文 = s?.toString() ?? ''
    return { 选区长: 选文.length, 选区样例: 选文.slice(0, 40), 选区在带内: 归一(选文).length > 0 && 归一(带el.innerText).includes(归一(选文)) }
  })
  expect((记.拖选 as any).选区长, '整段拖选能选到文本').toBeGreaterThan(3)
  expect((记.拖选 as any).选区在带内, '拖选文本 ⊆ 带体文本（没选到别处）').toBe(true)
  await page.evaluate(() => window.getSelection()?.removeAllRanges())
}

async function 记容器与溢出(page: Page, 记: Record<string, unknown>) {
  const 页 = await page.evaluate(() => ({
    url: location.href,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  记.URL = 页.url
  记.视口自证 = { innerWidth: 页.innerWidth, innerHeight: 页.innerHeight }
  记.横向溢出 = { scrollWidth: 页.scrollWidth, clientWidth: 页.clientWidth, 有: 页.scrollWidth > 页.clientWidth }
  return 页
}

function 收控制台(collector: ReturnType<typeof createConsoleCollector>, 记: Record<string, unknown>, 名: string) {
  const 错误 = collector.getErrors().filter((e) => !/\.(woff2?|ttf|otf)(\?.*)?$/.test(e.location?.url || ''))
  const 警告 = collector.getWarnings()
  记.控制台 = { 错误: 错误.map((e) => e.text), 警告: 警告.map((w) => w.text), 资源失败: (collector.getResourceFailures ? collector.getResourceFailures() : []).map((r) => r.text) }
  if (错误.length > 0) {
    throw new Error(`${名} 控制台 error 非零:\n${错误.map((e) => `${e.text} @ ${e.location?.url ?? ''}`).join('\n')}`)
  }
}

const 结果: Record<string, unknown> = { 端口: process.env.FPVC_PORT ?? 5190, headless: true }

function 落盘(名?: string) {
  fs.mkdirSync(path.dirname(结果文件), { recursive: true })
  let 已存: Record<string, unknown>
  try {
    已存 = JSON.parse(fs.readFileSync(结果文件, 'utf8')) as Record<string, unknown>
  } catch {
    已存 = {}
  }
  const 合并 = { ...已存, ...结果 }
  fs.writeFileSync(结果文件, JSON.stringify(合并, null, 2), 'utf8')
  if (名) {
    fs.writeFileSync(path.resolve(path.dirname(结果文件), `快照-quote-${名.replace(/[^\w一-龥.+-]/g, '_')}.json`), JSON.stringify(合并, null, 2), 'utf8')
  }
}

let 当前用例名 = '初始化'
test.afterEach(() => 落盘(当前用例名.replace(/\s+/g, '')))
test.afterAll(() => 落盘())

test('态2 桌面1440x900 引用块/引用条/提示带', async ({ page }) => {
  当前用例名 = '态2桌面'
  const collector = createConsoleCollector(page)
  const 记: Record<string, unknown> = {}
  结果.态2桌面 = 记
  await 挂载夹具(page)
  await 进入聊天页(page)
  const 页 = await 记容器与溢出(page, 记)
  expect(页.innerWidth, 'viewport 自证').toBe(1440)
  await 取证引用块桌面(page, 记)
  await 取证引用条(page, 记)
  await 取证提示带(page, '1440x900', 记)
  await page.screenshot({ path: path.join(截图目录, `FP-VERIFY-CHAT-态2引用与提示带-桌面1440x900-${日期}.png`), timeout: 60000 })
  收控制台(collector, 记, '态2 桌面')
})

test('态2 移动390x844 引用条键盘可达 + 提示带窄屏', async ({ browser }) => {
  当前用例名 = '态2移动'
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const collector = createConsoleCollector(page)
  const 记: Record<string, unknown> = {}
  结果.态2移动 = 记
  await 挂载夹具(page)
  await 进入聊天页(page)
  const 页 = await 记容器与溢出(page, 记)
  expect(页.innerWidth, 'viewport 自证').toBe(390)
  expect(页.scrollWidth, '窄屏无横向溢出').toBeLessThanOrEqual(页.clientWidth)
  await 取证引用条(page, 记)
  await 取证提示带(page, '390x844', 记)
  const 溢出后 = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }))
  记.提示带后横向溢出 = 溢出后
  expect(溢出后.s, '带体（错误触发后）窄屏仍无横向溢出').toBeLessThanOrEqual(溢出后.c)
  await page.screenshot({ path: path.join(截图目录, `FP-VERIFY-CHAT-态2引用与提示带-移动390x844-${日期}.png`), timeout: 60000 })
  收控制台(collector, 记, '态2 移动')
  await ctx.close()
})
