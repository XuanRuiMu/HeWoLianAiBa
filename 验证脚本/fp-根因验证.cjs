// 根因修复浏览器验证脚本 —— 适配本 AI Agent 环境（真实 Chromium 无头浏览器）
// 覆盖 FP-01 / FP-02 / FP-03 三项根因修复的「用户端视角」还原模拟测试。
// 用法：node fp-根因验证.cjs   （需先 docker 启动项目，前端 :80 后端 :3001 已就绪）
const { chromium } = require('D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/frontend/node_modules/playwright')
const fs = require('fs')

const BASE = 'http://localhost:80'
const API = BASE + '/api'
const TOKEN_KEY = '令牌'
const PHONE = '13800138001'
const PASSWORD = 'test1234'
const SHOT_DIR = 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/验证脚本/截图'
fs.mkdirSync(SHOT_DIR, { recursive: true })

const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'} ${name} — ${detail}`)
}
async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, ok: res.ok, data }
}

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [browser console error]', m.text()) })
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message))

  try {
    // ---- 登录（复用后端 API，与 e2e 认证.ts 同口径）----
    const login = await api('POST', '/认证/登录', { shouJiHao: PHONE, miMa: PASSWORD })
    if (!login.ok || !login.data?.cheng_gong) throw new Error('登录失败: ' + JSON.stringify(login.data))
    const token = login.data.shu_ju.令牌
    console.log('登录成功，令牌长度', token.length)

    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
    await page.evaluate((t) => localStorage.setItem('令牌', t), token)
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.yonghu-xuanxiang', { timeout: 12000 })
    await page.waitForTimeout(600)

    // ---- 创建角色 + 会话（为 FP-02/FP-03 准备可滚动聊天）----
    const gen = await api('POST', '/生成角色/MBTI生成', { 性别: 'nv', mbti类型: 'INTJ', 渣男渣女变体: false, 随机性格: false }, token)
    let jiaoSeId
    if (gen.ok && gen.data?.cheng_gong) {
      const confirm = await api('POST', '/生成角色/确认', { xuanZhongJiaoSe: gen.data.shu_ju }, token)
      jiaoSeId = confirm.data?.shu_ju?.jiao_se_id || confirm.data?.shu_ju?.id
    }
    if (!jiaoSeId) throw new Error('创建角色失败: ' + JSON.stringify(gen.data))
    console.log('创建角色成功 jiaoSeId=', jiaoSeId)
    const huiHua = await api('POST', '/聊天/会话', { jiaoSeId }, token)
    const huiHuaId = huiHua.data?.shu_ju?.id
    if (!huiHuaId) throw new Error('创建会话失败: ' + JSON.stringify(huiHua.data))
    console.log('创建会话成功 huiHuaId=', huiHuaId)

    let ok = 0
    for (let i = 1; i <= 20; i++) {
      const r = await api('POST', `/聊天/会话/${huiHuaId}/消息`, { neiRong: `验证消息${i}：这是一段用于测试滚动与表情面板顶起效果的较长文本内容，确保聊天区域出现纵向滚动条。`, 客户端序号: i }, token)
      if (r.ok && r.data?.cheng_gong) ok++
      else console.log('  发送消息失败', i, JSON.stringify(r.data))
    }
    console.log('已发送消息', ok, '/20')
    const msgs = await api('GET', `/聊天/会话/${huiHuaId}/消息?ye_ma=1&mei_ye_tiao_shu=50`, null, token)
    console.log('会话消息总数', msgs.data?.shu_ju?.zong_shu)

    // ===================== FP-01 =====================
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.yonghu-xuanxiang', { timeout: 12000 })
    await page.waitForTimeout(400)
    await page.click('.yonghu-xuanxiang')
    await page.locator('.yonghu-xiala').waitFor({ state: 'visible', timeout: 5000 })
    const yonghuText = await page.locator('.yonghu-xiala').innerText()
    const hasZhangHao = yonghuText.includes('账号设置')
    const hasZhanJi = yonghuText.includes('过往战绩')
    const zhanJiInErji = await page.locator('.er-ji-caidan .xiala-xiangmu').filter({ hasText: '过往战绩' }).count()
    record('FP-01a 用户下拉含「账号设置」且「过往战绩」同级（不在二级菜单）',
      hasZhangHao && hasZhanJi && zhanJiInErji === 0,
      `账号设置=${hasZhangHao}, 过往战绩=${hasZhanJi}, 过往战绩误入二级菜单=${zhanJiInErji}`)
    await page.screenshot({ path: SHOT_DIR + '/fp01-用户下拉.png' })

    await page.click('.zhanghao-shezhi-biaoti')
    await page.locator('.er-ji-caidan').waitFor({ state: 'visible', timeout: 5000 })
    const subItems = await page.locator('.er-ji-caidan .xiala-xiangmu').allInnerTexts()
    const expected = ['修改用户名', '修改密码', '设置默认性别', '退出登录']
    const subOk = expected.every((e) => subItems.some((t) => t.includes(e))) && subItems.length === 4
    const tuichuRed = (await page.locator('.er-ji-caidan .xiala-xiangmu.tuichu-xiangmu').count()) === 1
    record('FP-01b 「账号设置」展开含 4 子项（含红色退出登录）',
      subOk && tuichuRed, `子项=[${subItems.join('|')}], 退出登录红色=${tuichuRed}`)
    await page.screenshot({ path: SHOT_DIR + '/fp01-账号设置展开.png' })

    await page.mouse.click(5, 5)
    await page.waitForTimeout(300)
    await page.click('.qita-xuanxiang')
    await page.locator('.qita-xiala').waitFor({ state: 'visible', timeout: 5000 })
    const moreItems = await page.locator('.qita-xiala .xiala-xiangmu').allInnerTexts()
    const moreOk = moreItems.length === 2 &&
      moreItems.every((t) => t.includes('用户协议') || t.includes('隐私政策')) &&
      !moreItems.some((t) => t.includes('过往战绩'))
    record('FP-01c 「更多」菜单仅含 用户协议/隐私政策（无过往战绩）',
      moreOk, `更多项=[${moreItems.join('|')}]`)
    await page.screenshot({ path: SHOT_DIR + '/fp01-更多菜单.png' })
    await page.mouse.click(5, 5)
    await page.waitForTimeout(300)

    // ===================== FP-02 =====================
    await page.goto(BASE + `/chat/${huiHuaId}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.junshi-anniu', { timeout: 12000 })
    await page.click('.junshi-anniu')
    await page.locator('.junshi-mianban').waitFor({ state: 'visible', timeout: 8000 })
    let fp02pass = false, fp02detail = ''
    try {
      await page.locator('.qingqiu-anniu').first().waitFor({ state: 'visible', timeout: 8000 })
      const m = await page.evaluate(() => {
        const btn = document.querySelector('.qingqiu-anniu')
        const cs = getComputedStyle(btn)
        const orig = btn.textContent
        btn.textContent = '已指导 - 查看结果'
        const wLong = btn.getBoundingClientRect().width
        btn.textContent = '指导中...'
        const wMid = btn.getBoundingClientRect().width
        btn.textContent = '请求指导'
        const wShort = btn.getBoundingClientRect().width
        btn.textContent = orig
        return { minWidth: cs.minWidth, fontSize: cs.fontSize, boxSizing: cs.boxSizing, wLong, wMid, wShort }
      })
      const equal = Math.abs(m.wLong - m.wMid) < 0.5 && Math.abs(m.wLong - m.wShort) < 0.5
      const fontSizePx = parseFloat(m.fontSize)
      const minWidthPx = parseFloat(m.minWidth)
      const minOk = Math.abs(minWidthPx - 12 * fontSizePx) < 1 // 12em 基准（跨字号仍等宽）
      fp02pass = equal && m.boxSizing === 'border-box' && minOk
      fp02detail = `三态宽 long=${m.wLong.toFixed(1)} mid=${m.wMid.toFixed(1)} short=${m.wShort.toFixed(1)}; min-width=${m.minWidth}(12em=${ (12*fontSizePx).toFixed(0) }px); box-sizing=${m.boxSizing}; 等宽=${equal}; 基准正确=${minOk}`
    } catch (e) {
      const empty = await page.locator('.kong-zhuangtai').count()
      fp02detail = '未找到.qingqiu-anniu（军师列表可能为空），kong态数=' + empty
    }
    record('FP-02 军师指导按钮三态等宽（请求指导/指导中.../已指导-查看结果）', fp02pass, fp02detail)
    await page.screenshot({ path: SHOT_DIR + '/fp02-军师按钮.png' })
    // 关闭军师抽屉（无 Escape 处理器，点击关闭按钮）
    await page.locator('.guanbi-anniu').first().click()
    await page.locator('.junshi-mianban').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(400)

    // ===================== FP-03 =====================
    await page.waitForSelector('.xiaoxi-quyu', { timeout: 8000 })
    await page.waitForSelector('.xiaoxi-quyu .xiaoxi-xiangmu', { timeout: 8000 })
    await page.waitForTimeout(400)
    const before = await page.evaluate(() => {
      const el = document.querySelector('.xiaoxi-quyu')
      const maxScroll = el.scrollHeight - el.clientHeight
      el.scrollTop = Math.floor(maxScroll / 2)
      return { atBottom: maxScroll - el.scrollTop < 30, count: document.querySelectorAll('.xiaoxi-quyu .xiaoxi-xiangmu').length }
    })
    await page.waitForTimeout(200)
    await page.click('.biaoqing-anniu.emoji-anniu')
    await page.locator('.emoji-mianban').waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(800) // 等待 ResizeObserver 触发 + 滚动补偿完成
    const after = await page.evaluate(() => {
      const el = document.querySelector('.xiaoxi-quyu')
      const emoji = document.querySelector('.emoji-mianban')
      const items = document.querySelectorAll('.xiaoxi-quyu .xiaoxi-xiangmu')
      const last = items[items.length - 1]
      const lastRect = last.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const emojiRect = emoji.getBoundingClientRect()
      const cs = getComputedStyle(emoji)
      return {
        atBottom: el.scrollHeight - el.scrollTop - el.clientHeight < 30,
        lastBottom: lastRect.bottom,
        elBottom: elRect.bottom,
        emojiTop: emojiRect.top,
        lastVisibleInArea: lastRect.bottom <= elRect.bottom + 1 && lastRect.top >= elRect.top - 1,
        emojiVisible: cs.display !== 'none' && emoji.offsetHeight > 0,
        emojiBelowArea: emojiRect.top >= elRect.bottom - 2,
      }
    })
    const fp03pass = after.atBottom && after.lastVisibleInArea && after.emojiVisible && after.emojiBelowArea && !before.atBottom
    const fp03detail = `展开前atBottom=${before.atBottom}(应在中部非底部); 展开后atBottom=${after.atBottom}; 末条完整在消息区内=${after.lastVisibleInArea}; 表情面板可见=${after.emojiVisible}; 表情面板位于消息区下方(不覆盖)=${after.emojiBelowArea}; 消息数=${before.count}`
    record('FP-03 表情面板展开把聊天内容顶起（非底部也顶起、不覆盖）', fp03pass, fp03detail)
    await page.screenshot({ path: SHOT_DIR + '/fp03-表情面板顶起.png' })

    const passed = results.filter((r) => r.pass).length
    const total = results.length
    console.log('\n===== 验证汇总 =====\n通过 ' + passed + '/' + total)
    fs.writeFileSync(SHOT_DIR + '/../验证报告.md',
      '# 根因修复浏览器验证报告\n\n' +
      results.map((r) => `- ${r.pass ? '✅' : '❌'} **${r.name}**: ${r.detail}`).join('\n') +
      `\n\n通过 ${passed}/${total}\n`, 'utf-8')
  } catch (e) {
    console.log('❌ 脚本异常:', e.message)
    record('脚本执行', false, e.message)
  } finally {
    await browser.close()
  }
  process.exit(results.every((r) => r.pass) ? 0 : 1)
})()
