import { request, type APIRequestContext, type Page } from '@playwright/test'

/**
 * e2e 账号夹具的唯一真源。
 *
 * 消掉的两处结构性问题（不是补症状）：
 * - 后端地址 `http://localhost:3000` 曾各自抄在用例文件里，与 `playwright.config.ts` 的 dev server
 *   代理目标（`VITE_API_PROXY_TARGET`）是两条独立配置，改一处即静默失联。现在一律走被测应用自己的源
 *   上的 `/api`，与浏览器内真实请求同一条路径，不再有旁路端口。
 * - 「库里必须预先存在某个手工建好的账号」是隐含前提（换库/换机器即全红，且报错只表现为登录失败），
 *   曾有用例用疑似真实用户的手机号 + 弱口令当夹具。现在缺失即按真实注册链自建。
 */
const JI_CHU = {
  qianDuanJiChu: process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_FRONTEND_URL || 'http://localhost:5173',
  shouJiHao: process.env.E2E_SHOU_JI_HAO || '13900001111',
  miMa: process.env.E2E_MI_MA || 'Shijue123',
  yongHuMing: process.env.E2E_YONG_HU_MING || 'E2E视觉夹具',
  /** 与 backend `config/index.ts::yanZhengMa.kaiFaMoShiGuDing` 同值；仅开发态注册链可用 */
  kaiFaMa: process.env.E2E_DEV_CODE || '123456',
  chuShengRiQi: '2000-01-01',
}

export interface JiaJuShenFen {
  lingPai: string
  shuaXinLingPai?: string
  shuaXinLingPaiId?: string
}

export function daKaiJiaJuQingQiu(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: JI_CHU.qianDuanJiChu })
}

async function faSongZhuCeMa(qingQiu: APIRequestContext): Promise<void> {
  const xiangYing = await qingQiu.post('/api/认证/发送码', { data: { shouJiHao: JI_CHU.shouJiHao } })
  const shuJu = await xiangYing.json().catch(() => null)
  if (!xiangYing.ok() || shuJu?.cheng_gong !== true) {
    throw new Error(`e2e 夹具验证码发送失败（HTTP ${xiangYing.status()}）：${shuJu?.ti_shi || '后端不可达或非开发态'}`)
  }
}

async function zhuCeJiaJuZhangHao(qingQiu: APIRequestContext): Promise<JiaJuShenFen> {
  await faSongZhuCeMa(qingQiu)
  const xiangYing = await qingQiu.post('/api/认证/注册', {
    data: {
      shouJiHao: JI_CHU.shouJiHao,
      yanZhengMa: JI_CHU.kaiFaMa,
      yongHuMing: JI_CHU.yongHuMing,
      miMa: JI_CHU.miMa,
      tongYiXieYi: true,
      chuShengRiQi: JI_CHU.chuShengRiQi,
    },
  })
  const shuJu = await xiangYing.json().catch(() => null)
  const lingPai = shuJu?.shu_ju?.令牌
  if (!shuJu?.cheng_gong || !lingPai) {
    throw new Error(
      `e2e 夹具账号自建失败（HTTP ${xiangYing.status()}）：${shuJu?.ti_shi || '无令牌'}；` +
        '夹具账号需要后端处于开发态（固定验证码）才能自动注册',
    )
  }
  return huoQuShenFen(lingPai, shuJu.shu_ju)
}

function huoQuShenFen(lingPai: string, shuJu: Record<string, unknown>): JiaJuShenFen {
  return {
    lingPai,
    shuaXinLingPai: typeof shuJu['刷新令牌'] === 'string' ? shuJu['刷新令牌'] : undefined,
    shuaXinLingPaiId: typeof shuJu['刷新令牌ID'] === 'string' ? shuJu['刷新令牌ID'] : undefined,
  }
}

/** 夹具账号登录；不存在则注册后再登录，返回可直接注入页面的令牌组 */
export async function baoZhengCeShiZhangHao(qingQiu: APIRequestContext): Promise<JiaJuShenFen> {
  // 每个用例文件各登一次会把后端的「登录失败计数」限流打出来（一次跑红全串 429），
  // 所以整套只取一次身份：globalSetup 取好后经环境变量传给各 worker。
  const YuQu = process.env.E2E_JIA_JU_SHEN_FEN
  if (YuQu) {
    try {
      const jieXi = JSON.parse(YuQu) as JiaJuShenFen
      if (jieXi && typeof jieXi.lingPai === 'string' && jieXi.lingPai) return jieXi
    } catch {
      /* 环境变量被截断/非 JSON：退回真实登录，不静默用坏身份 */
    }
  }
  const xiangYing = await qingQiu.post('/api/认证/登录', {
    data: { shouJiHao: JI_CHU.shouJiHao, miMa: JI_CHU.miMa },
  })
  const shuJu = await xiangYing.json().catch(() => null)
  const lingPai = shuJu?.shu_ju?.令牌
  if (shuJu?.cheng_gong && lingPai) return huoQuShenFen(lingPai, shuJu.shu_ju)
  if (xiangYing.status() !== 400 && xiangYing.status() !== 401 && xiangYing.status() !== 404) {
    throw new Error(`e2e 夹具登录接口异常（HTTP ${xiangYing.status()}）：${shuJu?.ti_shi || '未知'}`)
  }
  return zhuCeJiaJuZhangHao(qingQiu)
}

/**
 * 令牌注入页面前必须先落到 `sessionStorage`：真源是 `utils/令牌存储.ts::huiHuaCunChu`，
 * 写进 localStorage 路由守卫读不到 ⇒ 判未登录跳回登录页（旧夹具正栽在这里）。
 */
export async function zhuRuJiaJuShenFen(yeMian: Page, shenFen: JiaJuShenFen): Promise<void> {
  await yeMian.goto('/login', { waitUntil: 'domcontentloaded' })
  await yeMian.evaluate((ju: Record<string, string>) => {
    for (const [jian, zhi] of Object.entries(ju)) window.sessionStorage.setItem(jian, zhi)
  }, { 令牌: shenFen.lingPai, ...(shenFen.shuaXinLingPai ? { 刷新令牌: shenFen.shuaXinLingPai } : {}), ...(shenFen.shuaXinLingPaiId ? { 刷新令牌ID: shenFen.shuaXinLingPaiId } : {}) })
}

/**
 * 迁移 034（自测提权）把「用户」表三旗标全置真 ⇒ 夹具账号在服务端拿到 `chao_guan` + 五位能力。
 * 「无权限账号」这一档因此在真实数据里不复存在，但缺陷11 的无权限反馈链必须继续被覆盖。
 *
 * 做法：只把 `/api/认证/信息` 响应体里的 `jiao_se` / `neng_li` 钉成「无身份」，其余一律透传。
 * HTTP 请求、序列化形状、`huoQuYongHuXinXi → jiaZaiYongHu → 归一管理能力列表 → keGuanLiZhiDu`
 * 整条真链路照常跑，被钉住的只是**服务端下发的那一位权限真值**；不去改判定代码、也不去
 * 动共享库里的旗标（后者会污染并行 worker 里其它场景）。
 *
 * 必须**在导航到受控页面之前**挂载：身份解析发生在聊天页首个文档的启动阶段。
 */
export async function dingZhuWuQuanXianShenFen(yeMian: Page): Promise<void> {
  await yeMian.route((url) => {
    try {
      return decodeURIComponent(url.pathname) === '/api/认证/信息'
    } catch {
      return false
    }
  }, async (luYou) => {
    const xiangYing = await luYou.fetch()
    const ti = await xiangYing.json().catch(() => null)
    if (!ti || typeof ti !== 'object' || !ti.shu_ju || typeof ti.shu_ju !== 'object') {
      await luYou.fulfill({ response: xiangYing })
      return
    }
    const shenFenTi = { ...(ti as Record<string, unknown>), shu_ju: { ...(ti.shu_ju as Record<string, unknown>), jiao_se: null, neng_li: [] } }
    const tou: Record<string, string> = {}
    for (const [jian, zhi] of Object.entries(xiangYing.headers())) {
      if (['content-length', 'content-encoding', 'transfer-encoding', 'connection'].includes(jian.toLowerCase())) continue
      tou[jian] = zhi
    }
    await luYou.fulfill({ status: xiangYing.status(), headers: tou, body: JSON.stringify(shenFenTi) })
  })
}
