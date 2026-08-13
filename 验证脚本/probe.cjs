/**
 * 回归探针：FP-1~FP-5 真实浏览器双视口验证
 * 运行：node 验证脚本/probe.cjs
 * 依赖：frontend/node_modules/playwright（绝对路径 require）
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require(path.resolve(__dirname, '..', 'frontend', 'node_modules', 'playwright'))

const BASE = 'http://localhost' // nginx :80，/api 反代到后端
const PHONE = '13800138001'
const PWD = 'test1234'
const SHOT_DIR = path.resolve(__dirname, 'shots')
fs.mkdirSync(SHOT_DIR, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

async function login(page) {
  const res = await page.evaluate(
    async ({ phone, pwd }) => {
      const r = await fetch('/api/认证/登录', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shouJiHao: phone, miMa: pwd }),
      })
      return r.json()
    },
    { phone: PHONE, pwd: PWD },
  )
  const tk = res?.shu_ju?.令牌
  if (!tk) throw new Error('登录失败: ' + JSON.stringify(res))
  await page.evaluate((t) => localStorage.setItem('令牌', t), tk)
  return tk
}

async function getConversation(page) {
  // 优先复用已有会话，避免依赖 LLM 生成角色
  const lieBiao = await page.evaluate(async () => {
    const tk = localStorage.getItem('令牌')
    const r = await fetch('/api/聊天/会话', {
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
    })
    if (!r.ok) return null
    return r.json()
  })
  const you = lieBiao?.shu_ju
  if (Array.isArray(you) && you.length > 0 && you[0]?.id) {
    return you[0].id
  }
  // 退回：生成并确认角色 → 建会话
  const gen = await page.evaluate(async () => {
    const tk = localStorage.getItem('令牌')
    const r = await fetch('/api/生成角色/MBTI生成', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
      body: JSON.stringify({ 性别: 'nv', mbti类型: 'INFP', 渣男渣女变体: false, 随机性格: false, 用户性别: 'nan' }),
    })
    return r.json()
  })
  const jiaoSe = gen?.shu_ju
  if (!jiaoSe) throw new Error('生成角色失败: ' + JSON.stringify(gen))
  const conf = await page.evaluate(async (xz) => {
    const tk = localStorage.getItem('令牌')
    const r = await fetch('/api/生成角色/确认', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
      body: JSON.stringify({ xuanZhongJiaoSe: xz }),
    })
    return r.json()
  }, jiaoSe)
  const jiaoSeId = conf?.shu_ju?.jiao_se_id || conf?.shu_ju?.id || jiaoSe.jiao_se_id || jiaoSe.id
  const huiHua = await page.evaluate(async (id) => {
    const tk = localStorage.getItem('令牌')
    const r = await fetch('/api/聊天/会话', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
      body: JSON.stringify({ jiaoSeId: id }),
    })
    return r.json()
  }, jiaoSeId)
  const hid = huiHua?.shu_ju?.id
  if (!hid) throw new Error('创建会话失败: ' + JSON.stringify(huiHua))
  return hid
}

async function openEmojiAndMeasure(page) {
  const btn = await page.$('.biaoqing-anniu.emoji-anniu')
  if (!btn) return { ok: false, reason: '未找到表情开关按钮' }
  // 首开耗时（点击 → 面板可见）
  const firstOpenMs = await page.evaluate(async () => {
    const b = document.querySelector('.biaoqing-anniu.emoji-anniu')
    const t0 = performance.now()
    b.click()
    await new Promise((res) => {
      const check = () => {
        const el = document.querySelector('.emoji-mianban')
        if (el && el.offsetParent !== null && el.offsetHeight > 0) return res(null)
        requestAnimationFrame(check)
      }
      check()
    })
    return performance.now() - t0
  })
  await page.waitForSelector('.emoji-mianban', { state: 'visible' })
  const itemCount = await page.locator('.emoji-xiangmu').count()
  // 二次开合耗时（对照）
  await page.click('.biaoqing-anniu.emoji-anniu') // 收起
  await page.waitForSelector('.emoji-mianban', { state: 'hidden' })
  const secondOpenMs = await page.evaluate(async () => {
    const b = document.querySelector('.biaoqing-anniu.emoji-anniu')
    const t0 = performance.now()
    b.click()
    await new Promise((res) => {
      const check = () => {
        const el = document.querySelector('.emoji-mianban')
        if (el && el.offsetParent !== null && el.offsetHeight > 0) return res(null)
        requestAnimationFrame(check)
      }
      check()
    })
    return performance.now() - t0
  })
  await page.waitForSelector('.emoji-mianban', { state: 'visible' })
  return { ok: true, firstOpenMs, secondOpenMs, itemCount }
}

async function measureLift(page) {
  // 表情面板已在展开态（FP-4 已打开）
  const data = await page.evaluate(() => {
    const msg = document.querySelector('.xiaoxi-quyu')
    const panel = document.querySelector('.emoji-mianban')
    if (!msg || !panel) return { ok: false, reason: '缺少 .xiaoxi-quyu 或 .emoji-mianban' }
    const cs = getComputedStyle(panel)
    const m = msg.getBoundingClientRect()
    const p = panel.getBoundingClientRect()
    // 重叠高度（顶起时面板在消息区下方，不应重叠）
    const overlapTop = Math.max(m.top, p.top)
    const overlapBottom = Math.min(m.bottom, p.bottom)
    const overlapH = Math.max(0, overlapBottom - overlapTop)
    return {
      ok: true,
      msgAreaH: msg.clientHeight,
      panelPosition: cs.position,
      panelDisplay: cs.display,
      panelH: Math.round(p.height),
      overlapH: Math.round(overlapH),
      panelBottom: Math.round(p.bottom),
      viewportH: window.innerHeight,
    }
  })
  return data
}

async function measureJunShiButton(page) {
  const btn = await page.$('.junshi-anniu')
  if (!btn) return { ok: false, reason: '未找到全局军师按钮 .junshi-anniu' }
  await btn.click()
  try {
    await page.waitForSelector('.qingqiu-anniu', { state: 'visible', timeout: 5000 })
  } catch (e) {
    return { ok: false, reason: '点击军师按钮后未出现 .qingqiu-anniu' }
  }
  const m = await page.evaluate(() => {
    const el = document.querySelector('.qingqiu-anniu')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      bg: cs.backgroundColor,
      widthStyle: cs.width,
      color: cs.color,
      text: (el.textContent || '').trim().slice(0, 40),
    }
  })
  return { ok: true, ...m }
}

async function checkFuPan(page, huiHuaId) {
  const url = `${BASE}/chat/${huiHuaId}?fuPan=1&dangAnId=test-archive`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.liaotian-yemian', { timeout: 10000 })
  const data = await page.evaluate(() => {
    const junShiBtn = document.querySelector('.junshi-anniu')
    const btnVisible = !!junShiBtn && junShiBtn.offsetParent !== null
    // 派发展开事件（正常模式会开面板；复盘模式应被守卫拦截）
    window.dispatchEvent(new CustomEvent('junshi-zhankai'))
    const panelAfter = document.querySelector('.qingqiu-anniu')
    const panelVisible = !!panelAfter && panelAfter.offsetParent !== null
    const fuPanBanner = !!document.querySelector('.fupan-dibu-lan')
    return {
      junShiBtnExists: !!junShiBtn,
      junShiBtnVisible: btnVisible,
      panelVisibleAfterDispatch: panelVisible,
      fuPanBannerPresent: fuPanBanner,
    }
  })
  return data
}

async function runViewport(browser, vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error(`[${vp.name}] pageerror:`, e.message))
  const out = { viewport: vp.name, steps: {} }
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    await login(page)
    const huiHuaId = await getConversation(page)
    out.huiHuaId = huiHuaId
    await page.goto(`${BASE}/chat/${huiHuaId}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.liaotian-yemian', { timeout: 10000 })

    // FP-3 顶起 vs 覆盖：先量表情未展开时的消息区高度
    const msgBefore = await page.evaluate(() => {
      const el = document.querySelector('.xiaoxi-quyu')
      return el ? el.clientHeight : null
    })

    // FP-4 表情首开卡顿
    out.steps.fp4 = await openEmojiAndMeasure(page)
    await page.screenshot({ path: path.join(SHOT_DIR, `fp4-${vp.name}.png`), fullPage: false })

    // FP-3 顶起 vs 覆盖（面板已展开）
    out.steps.fp3 = await measureLift(page)
    out.steps.fp3.msgAreaHBefore = msgBefore
    await page.screenshot({ path: path.join(SHOT_DIR, `fp3-${vp.name}.png`), fullPage: false })

    // 收起表情，准备 FP-2
    await page.click('.biaoqing-anniu.emoji-anniu')
    await page.waitForSelector('.emoji-mianban', { state: 'hidden' })

    // FP-2 军师指导按钮
    out.steps.fp2 = await measureJunShiButton(page)
    if (out.steps.fp2.ok) {
      await page.screenshot({ path: path.join(SHOT_DIR, `fp2-${vp.name}.png`), fullPage: false })
    }

    // FP-5 复盘隐藏军师
    out.steps.fp5 = await checkFuPan(page, huiHuaId)
    await page.screenshot({ path: path.join(SHOT_DIR, `fp5-${vp.name}.png`), fullPage: false })
  } catch (e) {
    out.error = e.message
  } finally {
    await ctx.close()
  }
  return out
}

async function main() {
  console.log('launching chromium...')
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: chromium.executablePath(),
  })
  const results = []
  try {
    for (const vp of VIEWPORTS) {
      console.log('start viewport', vp.name)
      results.push(await runViewport(browser, vp))
      console.log('done viewport', vp.name)
    }
  } finally {
    console.log('closing browser...')
    await browser.close().catch((e) => console.error('close error', e.message))
  }
  const report = { generatedAt: new Date().toISOString(), base: BASE, results }
  fs.writeFileSync(path.join(SHOT_DIR, 'report.json'), JSON.stringify(report, null, 2))
  console.log('===REPORT===')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error('FATAL', e && e.stack ? e.stack : e)
  process.exit(1)
})
