import { chromium } from 'playwright'
import * as fs from 'fs'

const QIAN_DUAN = 'http://localhost:5173'
const HOU_DUAN = 'http://localhost:3000'
const SHU_CHU = 'C:/Users/27606/.workbuddy/browser_verify'
fs.mkdirSync(SHU_CHU, { recursive: true })

const SHOU_JI = '13800138001'
const MI_MA = 'test1234'
const YAN_ZHENG_MA = '123456'

function riZhi(...a) {
  console.log('[REQ5]', ...a)
}

async function huoQuLingPai(shouJi, miMa, daiMa) {
  const base = `${HOU_DUAN}/api`
  const jianCha = await fetch(`${base}/认证/检查手机?shouJiHao=${shouJi}`).then((r) => r.json())
  if (jianCha?.shu_ju?.yi_zhu_ce) {
    const dl = await fetch(`${base}/认证/登录`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shouJiHao: shouJi, miMa }),
    }).then((r) => r.json())
    if (!dl?.cheng_gong) throw new Error('登录失败: ' + (dl?.ti_shi || '未知'))
    return dl.shu_ju.令牌
  }
  await fetch(`${base}/认证/发送码`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shouJiHao: shouJi }),
  })
  const zc = await fetch(`${base}/认证/注册`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shouJiHao: shouJi,
      yanZhengMa: daiMa,
      yongHuMing: 'Req5验证用户' + Date.now(),
      miMa,
      tongYiXieYi: true,
    }),
  }).then((r) => r.json())
  if (!zc?.cheng_gong) throw new Error('注册失败: ' + (zc?.ti_shi || '未知'))
  return zc.shu_ju.令牌
}

async function tianXieZiLiao(page) {
  await page.goto(`${QIAN_DUAN}/profile-setup?moshi=putong`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.ziJi-xingBie-kaPian', { timeout: 15000 })
  await page.locator('.ziJi-xingBie-kaPian', { hasText: '男' }).click()
  await page.locator('.anniu-zhuYao').click()
  await page.waitForSelector('.duiXiang-xingBie-kaPian')
  await page.locator('.duiXiang-xingBie-kaPian', { hasText: '女' }).click()
  await page.locator('.anniu-zhuYao').click()
  await page.waitForSelector('.mbti-kaPian')
  await page.locator('.mbti-kaPian', { hasText: 'INFP' }).click()
  const gou = page.locator('.zhaXing-gouxuan')
  if (await gou.isChecked().catch(() => false)) await gou.click()
}

async function zhanJiKaPianShu(page) {
  return await page.locator('.zhanji-kapian').count()
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => {
    const t = m.text()
    if (t.includes('生成角色流程在用户离开加载页后失败')) riZhi('[console.warn]', t)
  })

  try {
    // 通过后端 API 获取令牌（复用项目约定的 123456 开发验证码），再以真实浏览器进入
    riZhi('通过后端 API 获取登录令牌（账号 13800138001）')
    const lingPai = await huoQuLingPai(SHOU_JI, MI_MA, YAN_ZHENG_MA)
    riZhi('令牌获取成功，长度 =', (lingPai || '').length)
    await page.goto(`${QIAN_DUAN}/login`, { waitUntil: 'networkidle' })
    await page.evaluate((t) => localStorage.setItem('令牌', t), lingPai)
    await page.goto(`${QIAN_DUAN}/`, { waitUntil: 'networkidle' })
    riZhi('登录后主页 URL =', page.url())
    if (page.url().includes('/login')) throw new Error('令牌无效，无法进入主页')

    // ============ 路径 1：全程停留在加载页 ============
    riZhi('=== 路径1：全程停留，期待完成后跳转聊天页 ===')
    await tianXieZiLiao(page)
    await page.locator('.kaiShiLiaoTian').click()
    await page.waitForURL('**/tian-jia-wei-xin', { timeout: 15000 })
    await page.waitForSelector('.tianjia-tiShi', { timeout: 10000 })
    const jiaZaiWenAn = await page.locator('.tianjia-tiShi').textContent()
    riZhi('加载页进度文案 =', jiaZaiWenAn)
    await page.screenshot({ path: `${SHU_CHU}/path1-loading.png`, fullPage: false })

    await page.waitForURL('**/chat/**', { timeout: 120000 })
    riZhi('路径1 最终 URL =', page.url())
    await page.waitForSelector('.shuru-kuang', { timeout: 15000 }).catch(() => {})
    await page.screenshot({ path: `${SHU_CHU}/path1-chat.png`, fullPage: false })

    // ============ 路径 2：加载中离开主页，期待不跳转，后台静默完成，进入过往战绩 ============
    riZhi('=== 路径2：加载中离开，期待不跳转、后台完成、进入过往战绩 ===')
    await page.goto(`${QIAN_DUAN}/guo-wang-zhan-ji`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.zhanji-kapian', { timeout: 15000 }).catch(() => {})
    const qianShu = await zhanJiKaPianShu(page)
    riZhi('路径2 开始前过往战绩卡片数 =', qianShu)

    await tianXieZiLiao(page)
    await page.locator('.kaiShiLiaoTian').click()
    await page.waitForURL('**/tian-jia-wei-xin', { timeout: 15000 })
    await page.waitForSelector('.tianjia-tiShi', { timeout: 10000 })
    riZhi('已进入加载页，等待 4 秒后 SPA 离开（不刷新，store 不丢）')
    await page.waitForTimeout(4000)
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    riZhi('离开后 URL =', page.url())
    if (page.url().includes('/chat/')) throw new Error('路径2 异常：离开后仍被跳转到聊天页')

    riZhi('等待后台流程完成（最多 130 秒）…')
    await page.waitForTimeout(130000)

    await page.goto(`${QIAN_DUAN}/guo-wang-zhan-ji`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.zhanji-kapian', { timeout: 20000 }).catch(() => {})
    const houShu = await zhanJiKaPianShu(page)
    riZhi('路径2 结束后过往战绩卡片数 =', houShu)
    const youJinXingZhong = await page
      .locator('.zhanji-fenlei-biaoti', { hasText: '进行中' })
      .count()
    riZhi('是否存在“进行中”分组 =', youJinXingZhong > 0)
    await page.screenshot({ path: `${SHU_CHU}/path2-zhanji.png`, fullPage: false })

    const zengJia = houShu > qianShu
    riZhi(`结果：卡片数 ${qianShu} -> ${houShu}，是否新增会话 = ${zengJia}`)
    riZhi('路径2 验证:', zengJia ? '通过（后台静默完成并进入过往战绩）' : '失败（未见新会话）')
    riZhi('全部验证结束')
  } catch (e) {
    riZhi('验证异常：', e.message)
    await page.screenshot({ path: `${SHU_CHU}/error.png`, fullPage: false }).catch(() => {})
    process.exitCode = 1
  } finally {
    await browser.close()
  }
})()
