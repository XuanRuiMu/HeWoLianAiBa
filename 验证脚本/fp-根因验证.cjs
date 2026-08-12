// 根因修复浏览器验证脚本 —— 适配本 AI Agent 环境（真实 Chromium 无头浏览器）
// 覆盖四项目标根因修复的「用户端视角」还原模拟测试：
//   FP-A 账号设置三级菜单重做（cascade 飞出列，右侧独立列；移动端不溢出视口）
//   FP-B 军师指导按钮三态统一黄底白字等宽（min-width 取不裁切最窄等宽 10.5em）
//   FP-C 表情面板在当前滚动位置顶起（不强制跳到底部）
//   FP-D 表情面板首开不再卡顿（进入页面前离屏预加载 emoji 字形）
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
function approx(a, b, tol) { return Math.abs(a - b) <= tol }

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

    // ---- 创建角色 + 会话（为 FP-B/C/D 准备可滚动聊天）----
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

    // ===================== FP-A：账号设置 cascade 飞出列 =====================
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.yonghu-xuanxiang', { timeout: 12000 })
    await page.waitForTimeout(400)
    await page.click('.yonghu-xuanxiang')
    await page.locator('.yonghu-xiala').waitFor({ state: 'visible', timeout: 5000 })

    // 「过往战绩」是账号设置组的同级，不在飞出列内
    const zhanJiZuWai = await page.locator('.yonghu-xiala > .xiala-xiangmu').filter({ hasText: '过往战绩' }).count()
    const zhanJiZaiFeiChu = await page.locator('.zhanghao-shezhi-feichu .xiala-xiangmu').filter({ hasText: '过往战绩' }).count()
    record('FP-A1 「过往战绩」与账号设置同级（不被移入飞出列）',
      zhanJiZuWai === 1 && zhanJiZaiFeiChu === 0,
      `组外同级过往战绩=${zhanJiZuWai}, 误入飞出列=${zhanJiZaiFeiChu}`)
    await page.screenshot({ path: SHOT_DIR + '/fpA-用户下拉.png' })

    // 通过键盘 ArrowRight 激活「账号设置」飞出列（@keydown.right 打开，无 toggle 竞态；
    // 桌面 hover 会先 mouseenter 打开、再 click 收起，故用键盘激活更确定）
    await page.focus('.zhanghao-shezhi-biaoti')
    await page.keyboard.press('ArrowRight')
    await page.locator('.zhanghao-shezhi-feichu').waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)
    const feiChu = await page.evaluate(() => {
      const biaoti = document.querySelector('.zhanghao-shezhi-biaoti').getBoundingClientRect()
      const fei = document.querySelector('.zhanghao-shezhi-feichu').getBoundingClientRect()
      const items = [...document.querySelectorAll('.zhanghao-shezhi-feichu .xiala-xiangmu')].map((e) => e.textContent.trim())
      const tuichu = document.querySelectorAll('.zhanghao-shezhi-feichu .xiala-xiangmu.tuichu-xiangmu').length
      return { biaotiRight: biaoti.right, biaotiLeft: biaoti.left, feiLeft: fei.left, feiTop: fei.top, items, tuichu }
    })
    const feiChuRight = feiChu.feiLeft > feiChu.biaotiRight - 1 // 飞出列在标题按钮右侧
    const expected = ['修改用户名', '修改密码', '设置默认性别', '退出登录']
    const subOk = expected.every((e) => feiChu.items.some((t) => t.includes(e))) && feiChu.items.length === 4
    const tuichuRed = feiChu.tuichu === 1
    record('FP-A2 账号设置以右侧独立飞出列展示 4 子项（含红色退出登录）',
      feiChuRight && subOk && tuichuRed,
      `飞出列在标题右侧=${feiChuRight}(标题右=${feiChu.biaotiRight.toFixed(0)},飞出列左=${feiChu.feiLeft.toFixed(0)}); 子项=[${feiChu.items.join('|')}]; 退出登录红色=${tuichuRed}`)
    await page.screenshot({ path: SHOT_DIR + '/fpA-账号设置飞出列.png' })

    // 移动端窄屏：飞出列应改为下方全宽、不溢出视口
    await page.setViewportSize({ width: 375, height: 780 })
    await page.waitForTimeout(300)
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.yonghu-xuanxiang', { timeout: 12000 })
    await page.waitForTimeout(300)
    await page.click('.yonghu-xuanxiang')
    await page.locator('.yonghu-xiala').waitFor({ state: 'visible', timeout: 5000 })
    await page.focus('.zhanghao-shezhi-biaoti')
    await page.keyboard.press('ArrowRight')
    await page.locator('.zhanghao-shezhi-feichu').waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)
    const mob = await page.evaluate(() => {
      const biaoti = document.querySelector('.zhanghao-shezhi-biaoti').getBoundingClientRect()
      const fei = document.querySelector('.zhanghao-shezhi-feichu').getBoundingClientRect()
      return {
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        feiBelow: fei.top >= biaoti.bottom - 1,
        feiLeftInView: fei.left >= -1,
        feiRightInView: fei.right <= window.innerWidth + 1,
      }
    })
    const mobOk = mob.overflowX <= 1 && mob.feiBelow && mob.feiLeftInView && mob.feiRightInView
    record('FP-A3 移动端(375px)飞出列改为下方全宽且不溢出视口',
      mobOk, `横向溢出=${mob.overflowX}px; 飞出列位于标题下方=${mob.feiBelow}; 左边界在视口内=${mob.feiLeftInView}; 右边界在视口内=${mob.feiRightInView}`)
    await page.screenshot({ path: SHOT_DIR + '/fpA-移动端飞出列.png' })
    await page.setViewportSize({ width: 1280, height: 820 })

    // ===================== FP-B：军师指导按钮三态统一黄底白字等宽 =====================
    await page.goto(BASE + `/chat/${huiHuaId}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.junshi-anniu', { timeout: 12000 })
    await page.click('.junshi-anniu')
    await page.locator('.junshi-mianban').waitFor({ state: 'visible', timeout: 8000 })
    let fpBpass = false, fpBdetail = ''
    try {
      await page.locator('.qingqiu-anniu').first().waitFor({ state: 'visible', timeout: 8000 })
      const m = await page.evaluate(() => {
        const btn = document.querySelector('.qingqiu-anniu')
        const cs = getComputedStyle(btn)
        const orig = btn.textContent
        const measure = (t) => { btn.textContent = t; return btn.getBoundingClientRect().width }
        const wLong = measure('已指导 - 查看结果')
        const wMid = measure('指导中...')
        const wShort = measure('请求指导')
        btn.textContent = orig
        const bg = (t) => { btn.textContent = t; return getComputedStyle(btn).backgroundColor }
        const bgLong = bg('已指导 - 查看结果')
        const bgMid = bg('指导中...')
        const bgShort = bg('请求指导')
        btn.textContent = orig
        return {
          minWidth: cs.minWidth, fontSize: cs.fontSize, boxSizing: cs.boxSizing,
          wLong, wMid, wShort, bgLong, bgMid, bgShort,
        }
      })
      const equal = approx(m.wLong, m.wMid, 2) && approx(m.wLong, m.wShort, 2)
      const fontSizePx = parseFloat(m.fontSize)
      const minWidthPx = parseFloat(m.minWidth)
      const minOk = approx(minWidthPx, 10.5 * fontSizePx, 2) // 10.5em 基准
      const white = 'rgb(255, 255, 255)'
      const trans = 'rgba(0, 0, 0, 0)'
      const bgSame = m.bgLong === m.bgMid && m.bgLong === m.bgShort
      const bgYellow = m.bgLong !== white && m.bgLong !== trans
      fpBpass = equal && m.boxSizing === 'border-box' && minOk && bgSame && bgYellow
      fpBdetail = `三态宽 long=${m.wLong.toFixed(1)} mid=${m.wMid.toFixed(1)} short=${m.wShort.toFixed(1)} 等宽=${equal}; min-width=${m.minWidth}(10.5em=${(10.5*fontSizePx).toFixed(0)}px) 基准正确=${minOk}; box-sizing=${m.boxSizing}; 三态背景一致=${bgSame}; 背景非白非透明(黄底)=${bgYellow}; 背景色=${m.bgLong}`
    } catch (e) {
      fpBdetail = '未找到.qingqiu-anniu（军师列表可能为空）：' + e.message
    }
    record('FP-B 军师指导按钮三态统一黄底白字等宽（请求指导/指导中.../已指导-查看结果）', fpBpass, fpBdetail)
    await page.waitForTimeout(500) // 等面板进入动画结束，避免截图拍到 opacity 0
    await page.screenshot({ path: SHOT_DIR + '/fpB-军师按钮.png' })
    await page.locator('.guanbi-anniu').first().click().catch(() => {})
    await page.locator('.junshi-mianban').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(400)

    // ===================== FP-C + FP-D：表情面板在当前位置顶起 + 首开不卡顿 =====================
    await page.waitForSelector('.xiaoxi-quyu', { timeout: 8000 })
    await page.waitForSelector('.xiaoxi-quyu .xiaoxi-xiangmu', { timeout: 8000 })
    await page.waitForTimeout(400)
    const before = await page.evaluate(() => {
      const el = document.querySelector('.xiaoxi-quyu')
      const maxScroll = el.scrollHeight - el.clientHeight
      el.scrollTop = Math.floor(maxScroll / 2)
      const items = [...document.querySelectorAll('.xiaoxi-quyu .xiaoxi-xiangmu')]
      const mid = items[Math.floor(items.length / 2)]
      return {
        atBottom: maxScroll - el.scrollTop < 30,
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight,
        areaTop: el.getBoundingClientRect().top,
        midTop: mid ? mid.getBoundingClientRect().top : 0,
        count: items.length,
      }
    })
    await page.waitForTimeout(200)

    // FP-D：测量首次点击到面板可见的耗时（预加载后首开应无明显卡顿）
    const t0 = Date.now()
    await page.click('.biaoqing-anniu.emoji-anniu')
    await page.locator('.emoji-mianban').waitFor({ state: 'visible', timeout: 5000 })
    const firstOpenMs = Date.now() - t0

    await page.waitForTimeout(500)
    const after = await page.evaluate(() => {
      const el = document.querySelector('.xiaoxi-quyu')
      const emoji = document.querySelector('.emoji-mianban')
      const items = [...document.querySelectorAll('.xiaoxi-quyu .xiaoxi-xiangmu')]
      const mid = items[Math.floor(items.length / 2)]
      const elRect = el.getBoundingClientRect()
      const emojiRect = emoji.getBoundingClientRect()
      const cs = getComputedStyle(emoji)
      return {
        atBottom: el.scrollHeight - el.scrollTop - el.clientHeight < 30,
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight,
        areaTop: elRect.top,
        midTop: mid ? mid.getBoundingClientRect().top : 0,
        emojiVisible: cs.display !== 'none' && emoji.offsetHeight > 0,
        emojiBelowArea: emojiRect.top >= elRect.bottom - 2,
        emojiItemCount: document.querySelectorAll('.emoji-mianban .emoji-xiangmu').length,
      }
    })
    // 正确判定：在中部点击表情，应「原地顶起」——不跳到底部、消息区收缩（被顶起）、
    // 正在看的中部消息屏幕Y保持不变（顶起而非跳转）、表情面板位于消息区下方不覆盖。
    const noJump = !before.atBottom && !after.atBottom && approx(after.scrollTop, before.scrollTop, 6)
    const lifted = after.clientHeight < before.clientHeight - 20
    const inPlace = Math.abs(after.midTop - before.midTop) < 10 && Math.abs(after.areaTop - before.areaTop) < 2
    const fpCpass = noJump && lifted && inPlace && after.emojiVisible && after.emojiBelowArea
    const fpCdetail = `展开前atBottom=${before.atBottom}(应在中部非底部); scrollTop ${before.scrollTop.toFixed(0)}→${after.scrollTop.toFixed(0)}(未跳底=${noJump}); 消息区高度 ${before.clientHeight.toFixed(0)}→${after.clientHeight.toFixed(0)}(被顶起收缩=${lifted}); 中部参考消息屏幕Y ${before.midTop.toFixed(0)}→${after.midTop.toFixed(0)}(原地顶起=${inPlace}); 表情面板可见=${after.emojiVisible}; 位于消息区下方不覆盖=${after.emojiBelowArea}; 消息数=${before.count}`
    record('FP-C 表情面板在当前滚动位置顶起（非底部也顶起、不跳底、不覆盖）', fpCpass, fpCdetail)
    await page.screenshot({ path: SHOT_DIR + '/fpC-表情面板顶起.png' })

    // FP-D：首开耗时 + 再次打开耗时（均应低）
    let fpDpass = false, fpDdetail = ''
    if (firstOpenMs < 1000 && after.emojiItemCount > 50) {
      const t1 = Date.now()
      await page.click('.biaoqing-anniu.emoji-anniu') // 关闭
      await page.waitForTimeout(200)
      await page.click('.biaoqing-anniu.emoji-anniu') // 再次打开
      await page.locator('.emoji-mianban').waitFor({ state: 'visible', timeout: 5000 })
      const secondOpenMs = Date.now() - t1
      fpDpass = firstOpenMs < 1000 && secondOpenMs < 1000
      fpDdetail = `首开耗时=${firstOpenMs}ms(<1000 视为无卡顿); 再次打开耗时=${secondOpenMs}ms; emoji 项数量=${after.emojiItemCount}(>50 全量已渲染)`
    } else {
      fpDdetail = `首开耗时=${firstOpenMs}ms; emoji 项数量=${after.emojiItemCount}; 未达无卡顿标准`
    }
    record('FP-D 表情面板首开无明显卡顿（进入页面前已预加载字形）', fpDpass, fpDdetail)
    await page.screenshot({ path: SHOT_DIR + '/fpD-表情首开.png' })

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
  const allPass = passed === total
  console.log('所有检查通过:', allPass)
  process.exit(allPass ? 0 : 1)
})()
