import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { createConsoleCollector, type ConsoleErrorCollector } from './console-error-collector'

const MEI_TI_URL = `/api/媒体/${'c'.repeat(64)}?e=9999999999&s=${'d'.repeat(64)}`
const ZI_DING_YI_URL = MEI_TI_URL
const JIE_TU_MU_LU = path.resolve(process.cwd(), '../测试截图')
const TOU_MING_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

let sheZhiBeiJing = 'moRen'
let sheZhiZiJi = 'weiXinLv'
let sheZhiAi = 'yunBai'

interface PuJiLu {
  url: string
  ti: unknown
}

const puJiLu: PuJiLu[] = []

function shiFouKeHuLue(wenBen: string, diZhi: string): boolean {
  const heBing = `${wenBen} ${diZhi}`
  if (/favicon\.ico/i.test(heBing)) return true
  if (/\.(woff2?|ttf|otf|eot)(\?|#|$)/i.test(heBing)) return true
  if (/font/i.test(heBing)) return true
  if (/GPU|SwiftShader|ANGLE|Direct3D|D3D\d*/i.test(heBing)) return true
  return false
}

function sheZhiXiangYing(): unknown {
  return {
    cheng_gong: true,
    shu_ju: {
      uid: 'fp-c-uid',
      shou_ji_hao: '13800138000',
      tou_xiang: null,
      qian_ming: '植物园见',
      qian_ming_ke_jian_xing: 'gong_kai',
      qian_ming_bai_ming_dan: [],
      liao_tian_bei_jing: sheZhiBeiJing,
      qi_pao_zi_ji: sheZhiZiJi,
      qi_pao_ai: sheZhiAi,
      gong_kai_zhang_hao: true,
      gong_kai_shou_ji_hao: false,
      gong_kai_you_xiang: false,
      bang_ding_you_xiang: '',
    },
  }
}

function jiaoSeXiangYing(): unknown {
  return {
    cheng_gong: true,
    shu_ju: {
      jiao_se: {
        id: 'h1',
        ming_zi: '吴昊阳',
        wei_xin_ming: '吴昊阳',
        tou_xiang: 'https://example.com/avatar.png',
        xing_bie: 'nv',
        nian_ling: 22,
        wai_mao: '',
        xing_ge: '',
        bei_jing_gu_shi: '',
        xi_hao: [],
        yan_yu_feng_ge: '',
        biao_qian: [],
        re_du: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
      },
      dang_an_zhuang_tai: null,
    },
  }
}

function xiaoXiXiangYing(): unknown {
  const shiJian = Date.now()
  return {
    cheng_gong: true,
    shu_ju: {
      lie_biao: [
        {
          id: 'fp-c-x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '周末去植物园走走吗',
          lei_xing: 'wenben',
          shi_jian_chuo: shiJian,
          yi_du: true,
        },
        {
          id: 'fp-c-x2',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'h1',
          fa_song_zhe_lei_xing: 'jiaose',
          nei_rong: '好啊，带上新长出来的叶子',
          lei_xing: 'wenben',
          shi_jian_chuo: shiJian,
          yi_du: true,
        },
      ],
      zong_shu: 2,
    },
  }
}

interface KongZhiTaiShouJi {
  cuoWu: string[]
  jingGao: string[]
  qingQiuShiBai: string[]
}

async function zhuangPeiYeMian(yeMian: Page): Promise<KongZhiTaiShouJi> {
  const shouJi: KongZhiTaiShouJi = { cuoWu: [], jingGao: [], qingQiuShiBai: [] }
  yeMian.on('console', (xiaoXi: ConsoleMessage) => {
    const leiXing = xiaoXi.type()
    const wenBen = xiaoXi.text()
    const diZhi = xiaoXi.location().url || ''
    if (leiXing === 'error') {
      if (!shiFouKeHuLue(wenBen, diZhi)) shouJi.cuoWu.push(wenBen)
    }
    if (leiXing === 'warning') {
      if (!shiFouKeHuLue(wenBen, diZhi)) shouJi.jingGao.push(wenBen)
    }
  })
  yeMian.on('pageerror', (cuoWu: Error) => {
    shouJi.cuoWu.push(cuoWu.message)
  })
  yeMian.on('requestfailed', (qingQiu: Request) => {
    const diZhi = qingQiu.url()
    if (!shiFouKeHuLue('', diZhi)) shouJi.qingQiuShiBai.push(diZhi)
  })
  await yeMian.context().addInitScript(() => {
    // 令牌真源是 sessionStorage（utils/令牌存储.ts 的 huiHuaCunChu），写进 localStorage 应用读不到
    window.sessionStorage.setItem('令牌', 'fp-c-token')
  })
  await yeMian.route('**/favicon.ico', async (luYou) => {
    await luYou.fulfill({ status: 200, contentType: 'image/x-icon', body: '' })
  })
  await yeMian.route('https://example.com/avatar.png', async (luYou) => {
    await luYou.fulfill({ status: 200, contentType: 'image/png', body: TOU_MING_PNG })
  })
  await yeMian.route(
    (diZhi) => {
      try {
        return new URL(diZhi.toString()).pathname.startsWith('/api/')
      } catch {
        return false
      }
    },
    async (luYou) => {
    const qingQiu = luYou.request()
    const yuanDiZhi = qingQiu.url()
    let diZhi: string
    try {
      diZhi = decodeURIComponent(yuanDiZhi)
    } catch {
      diZhi = yuanDiZhi
    }
    const fangFa = qingQiu.method()
    if (fangFa === 'PUT' && diZhi.includes('/用户设置/气泡')) {
      puJiLu.push({ url: diZhi, ti: qingQiu.postDataJSON() })
      await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) })
      return
    }
    if (fangFa === 'PUT' && diZhi.includes('/用户设置/聊天背景')) {
      await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) })
      return
    }
    if (fangFa === 'POST' && diZhi.includes('/用户设置/聊天背景/上传')) {
      await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cheng_gong: true, shu_ju: { bei_jing: ZI_DING_YI_URL } }) })
      return
    }
    if (diZhi.includes('/用户设置') && !diZhi.includes('/用户设置/')) {
      await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sheZhiXiangYing()) })
      return
    }
    if (new URL(yuanDiZhi).pathname.startsWith('/api/媒体/')) {
      await luYou.fulfill({ status: 200, contentType: 'image/png', body: TOU_MING_PNG })
      return
    }
    if (diZhi.includes('/好友/列表')) {
      await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [] } }) })
      return
    }
    if (diZhi.includes('/资料/封禁状态')) {
      await luYou.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { bei_feng_jin: false, ji_bie: 'zheng_chang', wei_gui_ci_shu: 0, jie_feng_shi_jian: null, shen_su_zhuang_tai: 'wu' },
        }),
      })
      return
    }
    if (diZhi.includes('/通知')) {
      await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], wei_du_shu: 0 } }) })
      return
    }
    if (diZhi.includes('/角色/详情/')) {
      await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(jiaoSeXiangYing()) })
      return
    }
    if (/\/聊天\/会话\/[^/]+\/消息/.test(diZhi)) {
      await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(xiaoXiXiangYing()) })
      return
    }
    if (diZhi.includes('/聊天/军师/列表')) {
      await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cheng_gong: true, shu_ju: { junShiLieBiao: [] } }) })
      return
    }
    await luYou.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) })
  })
  return shouJi
}

function duanYanKongZhiTai(shouJi: KongZhiTaiShouJi) {
  expect(shouJi.cuoWu, `控制台错误:${JSON.stringify(shouJi.cuoWu.slice(0, 5))}`).toEqual([])
  expect(shouJi.jingGao, `控制台警告:${JSON.stringify(shouJi.jingGao.slice(0, 5))}`).toEqual([])
  expect(shouJi.qingQiuShiBai, `请求失败:${JSON.stringify(shouJi.qingQiuShiBai.slice(0, 5))}`).toEqual([])
}

async function jinRuWaiGuanFenZu(yeMian: Page) {
  await yeMian.goto('/zhang-hao-an-quan')
  await yeMian.locator('#biao-qian-waiGuan').click()
  await expect(yeMian.locator('#liao-tian-bei-jing')).toBeVisible({ timeout: 20000 })
  await expect(yeMian.locator('#qi-pao-xuan-ze')).toBeVisible({ timeout: 20000 })
}

test.describe('FP-C 账号外观桌面', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('外观分组存在上传入口与双槽选择器且切换气泡真实PUT', async ({ page }) => {
    puJiLu.length = 0
    sheZhiBeiJing = 'moRen'
    sheZhiZiJi = 'weiXinLv'
    sheZhiAi = 'yunBai'
    const shouJi = await zhuangPeiYeMian(page)
    await jinRuWaiGuanFenZu(page)
    await expect(page.locator('.zi-ding-yi-shang-chuan')).toBeVisible()
    await expect(page.locator('#qi-pao-xuan-ze [role="radiogroup"]')).toHaveCount(2)
    await page.locator('#qi-pao-xuan-ze [role="radio"]').nth(1).click()
    // 断言取「本用例的 mock 亲自收到的那次 PUT」，不取 Playwright 的 response 事件：
    // 该响应本就是下面 route.fulfill 造出来的，事件是否派发不属产品行为；而「PUT 到达 + 载荷正确」
    // 才是「切换气泡真的落库」的证据（产品侧真机 + 真后端已另证 PUT 200 且 aria-checked 同步）。
    await expect.poll(() => puJiLu.length, { timeout: 20000 }).toBeGreaterThan(0)
    expect(puJiLu[puJiLu.length - 1].url).toContain('/用户设置/气泡')
    expect(puJiLu[puJiLu.length - 1].ti).toEqual({ ziJi: 'tianKongLan' })
    await page.screenshot({ path: path.join(JIE_TU_MU_LU, 'FP-C-桌面-账号外观.png'), fullPage: true })
    duanYanKongZhiTai(shouJi)
  })
})

test.describe('FP-C 账号外观移动', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('移动端外观分组正常渲染', async ({ page }) => {
    sheZhiBeiJing = 'moRen'
    sheZhiZiJi = 'weiXinLv'
    sheZhiAi = 'yunBai'
    const shouJi = await zhuangPeiYeMian(page)
    await jinRuWaiGuanFenZu(page)
    await expect(page.locator('.zi-ding-yi-shang-chuan')).toBeVisible()
    await expect(page.locator('#qi-pao-xuan-ze [role="radiogroup"]')).toHaveCount(2)
    await page.screenshot({ path: path.join(JIE_TU_MU_LU, 'FP-C-移动-账号外观.png'), fullPage: true })
    duanYanKongZhiTai(shouJi)
  })
})

test.describe('FP-C 聊天页切换气泡后桌面', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('自定义背景与新气泡在聊天页真实生效', async ({ page }) => {
    sheZhiBeiJing = ZI_DING_YI_URL
    sheZhiZiJi = 'tianKongLan'
    sheZhiAi = 'yingFen'
    const shouJi = await zhuangPeiYeMian(page)
    await page.goto('/chat/h1')
    const quYu = page.locator('.xiaoxi-quyu')
    await expect(quYu).toBeVisible({ timeout: 20000 })
    await expect.poll(async () => quYu.getAttribute('style'), { timeout: 20000 }).toContain(ZI_DING_YI_URL)
    await expect.poll(async () => quYu.getAttribute('style'), { timeout: 20000 }).toContain('#7FB8F0')
    await expect.poll(async () => quYu.getAttribute('style'), { timeout: 20000 }).toContain('#F4A9C4')
    await expect(page.locator('.yonghu-xiaoxi').first()).toBeVisible({ timeout: 20000 })
    await page.screenshot({ path: path.join(JIE_TU_MU_LU, 'FP-C-桌面-聊天换气泡.png'), fullPage: true })
    duanYanKongZhiTai(shouJi)
  })
})

test.describe('FP-C 聊天页切换气泡后移动', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('移动端聊天页同样生效', async ({ page }) => {
    sheZhiBeiJing = ZI_DING_YI_URL
    sheZhiZiJi = 'tianKongLan'
    sheZhiAi = 'yingFen'
    const shouJi = await zhuangPeiYeMian(page)
    await page.goto('/chat/h1')
    const quYu = page.locator('.xiaoxi-quyu')
    await expect(quYu).toBeVisible({ timeout: 20000 })
    await expect.poll(async () => quYu.getAttribute('style'), { timeout: 20000 }).toContain(ZI_DING_YI_URL)
    await page.screenshot({ path: path.join(JIE_TU_MU_LU, 'FP-C-移动-聊天换气泡.png'), fullPage: true })
    duanYanKongZhiTai(shouJi)
  })
})
