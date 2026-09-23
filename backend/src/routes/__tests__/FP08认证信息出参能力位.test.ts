import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import request from 'supertest'
import { 角色能力矩阵 } from '../../utils/角色能力'
import luYou from '../认证'

/**
 * FP-08（缺陷11）的**服务端真源**断言：`/api/认证/信息` 必须把 `neng_li`（与 `jiao_se`）
 * 原样带出，否则游戏端的 cha_kan 视图门（stores/用户.ts::keGuanLiZhiDu → 聊天页 greedisgood
 * 分支）会被白名单过滤成恒假，表现就是「秘籍完全失效」且零反馈。
 *
 * 此前后端只测过 `services/认证.ts::yingSheYongHu` 的纯函数出参，HTTP 面（routes/认证.ts
 * 的 `/信息` → `chengGongXiangYing` 序列化）从未被断言，所以「把人人可开改成三旗标可开」
 * 这次回归没有任何红灯。本文件钉的是**线上响应体**，含空数组也必须成键。
 *
 * 【FP-28c 改判（2026-09-23，迁移 038 真删 `用户.性别`）】`用户行()` 里 FP-28b 故意保留的
 *  `性别: 'male'` 已从**忠实夹具**中移除 —— 该列被 DROP 后 `SELECT * FROM "用户"` 不可能再返回它，
 *  继续留着就是一个不存在的库形态（且会与 database/000_baseline.sql 的列清单分叉）。
 *  它承担的契约**没有一起删**：搬到 `FP-28c 对抗面` 那条用例上，以显式标注的对抗注入形式继续钉
 *  「行里带 性别 也不得下发 xing_bie」，并加钉「键数恒为 19，不随行内多余列漂移」。
 *  注：本文件的 用户 行来自 `vi.mock('../../数据库')`，全程不连真库 ⇒ 这里的 42703 风险为零，
 *  改夹具的动机是**夹具保真**（别让下一位读者以为库里还有这一列），不是修一个会炸的用例。
 */

const 平民ID = '44444444-4444-4444-8444-444444444444'
const 超管ID = '11111111-1111-4111-8111-111111111111'
const 运营ID = '22222222-2222-4222-8222-222222222222'
const 审核ID = '33333333-3333-4333-8333-333333333333'
const 脏旗标ID = '66666666-6666-4666-8666-666666666666'
const 伪造ID = '77777777-7777-4777-8777-777777777777'
// FP-28c：专门用来扮演「行里凭空多出一个已删列」的对抗夹具（见下面同名用例），不是库的真实形态
const 脏历史列ID = '88888888-8888-4888-8888-888888888888'

type 旗标组 = { 管理员: unknown; 运营: unknown; 审核员: unknown }

const 旗标表: Record<string, 旗标组> = {
  [平民ID]: { 管理员: false, 运营: false, 审核员: false },
  [超管ID]: { 管理员: true, 运营: false, 审核员: false },
  [运营ID]: { 管理员: false, 运营: true, 审核员: false },
  [审核ID]: { 管理员: false, 运营: false, 审核员: true },
  [脏旗标ID]: { 管理员: 'true', 运营: 1, 审核员: null },
  [伪造ID]: { 管理员: false, 运营: false, 审核员: false },
  [脏历史列ID]: { 管理员: false, 运营: false, 审核员: false },
}

function 用户行(用户ID: string): Record<string, unknown> {
  const 旗标 = 旗标表[用户ID] ?? { 管理员: false, 运营: false, 审核员: false }
  return {
    ID: 用户ID,
    手机号: '13800138000',
    用户名: '测试用户',
    昵称: '测试昵称',
    // FP-28c（旧 → 新）：这里原有 `性别: 'male'`，是 FP-28b 故意留的「行里有值也不下发」夹具。
    //   迁移 038 已把 `用户.性别` 从库里 DROP，`SELECT * FROM "用户"` 从此**不可能**返回该键
    //   ⇒ 继续把它写在"忠实还原真库行"的夹具里就是假前提（FP22f 的 baseline 列清单也会与它分叉）。
    //   契约没有缩水：同一个反向断言搬到 脏历史列ID 那条用例上，用**显式标注为对抗注入**的方式继续钉，
    //   并额外钉「映射器是白名单不是透传」这一条更强的形式（见下面 FP-28c 用例）。
    目标性别: 'female',
    默认性别: null,
    性格选择: 'INTJ',
    人设标签: 'neiLianXueBa',
    渣男渣女变体: false,
    头像: null,
    生日: null,
    签名: null,
    测试: false,
    活跃角色ID: null,
    创建时间: '2026-09-01T00:00:00.000Z',
    更新时间: '2026-09-01T00:00:00.000Z',
    ...旗标,
    ...(用户ID === 伪造ID
      ? { jiao_se: 'chao_guan', neng_li: ['cha_kan', 'gao_we'], guan_li_yuan: true }
      : {}),
    ...(用户ID === 脏历史列ID ? { 性别: 'male' } : {}),
  }
}

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      if (文本.includes('SELECT * FROM "用户" WHERE "ID" = $1 LIMIT 1')) {
        return { rows: [用户行(String(参数[0]))], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
    connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => undefined }),
  },
}))

vi.mock('../../redis', () => ({
  redis: {
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 1,
    incr: async () => 1,
    pexpire: async () => true,
    publish: async () => 1,
    duplicate: () => ({ subscribe: async () => undefined, on: () => undefined }),
  },
}))

vi.mock('../../middleware/限流', () => {
  const 放行 = (_req: unknown, _res: unknown, 下一项: () => void) => 下一项()
  return {
    dengLuXianLiu: 放行,
    dengLuIPLianLiu: 放行,
    faSongMaXianLiu: 放行,
    zhuCeXianLiu: 放行,
    jianChaShouJiXianLiu: 放行,
    duanXinRiPeiEZhuJi: 放行,
    shengChengXianLiuJian: () => 'k',
  }
})

vi.mock('../../services/短信', () => ({
  faSongYanZhengMa: vi.fn(async () => ({ cheng_gong: true })),
  yanZhengMaShiFouZhengQue: vi.fn(async () => true),
  shanChuYanZhengMa: vi.fn(async () => undefined),
}))

vi.mock('../../services/账号注销', () => ({ zhuXiaoYongHu: vi.fn(async () => undefined) }))

vi.mock('../../services/审计日志', () => ({ jiLuShenJiRiZhi: vi.fn(async () => undefined) }))

vi.mock('../../services/媒体存储', () => ({
  zhongXinQianMingMeiTiURL: (url: string) => url,
  huoQuBenDiLuJing: (url: string) => url,
  cheXiaoYongHuMeiTiQianMing: vi.fn(async () => undefined),
  shengChengQianMingURL: (sha256: string) => `/api/媒体/${sha256}`,
  liuShiBaoCunMeiTi: vi.fn(),
  MeiTiCunChuCuoWu: class extends Error {},
}))

function 建应用(用户ID: string | null): Express {
  const 应用 = express()
  应用.use(express.json())
  应用.use((qingQiu, _xiangYing, xiaYiBu) => {
    // 路由段本身是中文：supertest 发出的是百分号编码路径，与 server.ts 一样需先解码再匹配
    qingQiu.url = decodeURI(qingQiu.url)
    xiaYiBu()
  })
  应用.use((请求, _响应, 下一项) => {
    if (用户ID) {
      (请求 as unknown as { yong_hu?: { yongHuId: string } }).yong_hu = { yongHuId: 用户ID }
    }
    下一项()
  })
  应用.use('/api/认证', luYou)
  return 应用
}

function huoQu信息(用户ID: string | null) {
  return request(建应用(用户ID)).get(encodeURI('/api/认证/信息'))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FP-08 /api/认证/信息 出参必须携带能力位（游戏端 greedisgood 视图门的唯一真源）', () => {
  it('出参对象含 neng_li 与 jiao_se 两个键：三旗标全伪也得下发空数组，不得整键缺失', async () => {
    const 响应 = await huoQu信息(平民ID)

    expect(响应.status).toBe(200)
    expect(响应.body.cheng_gong).toBe(true)
    const 数据 = 响应.body.shu_ju as Record<string, unknown>
    expect(数据).toHaveProperty('neng_li')
    expect('neng_li' in 数据).toBe(true)
    expect(Array.isArray(数据.neng_li)).toBe(true)
    expect(数据.neng_li).toEqual([])
    expect(数据).toHaveProperty('jiao_se')
    expect(数据.jiao_se).toBeNull()
    // 空数组必须在 JSON 线上真实成键（序列化器丢空键 = 前端白名单过滤后恒无权限）
    expect(响应.text).toContain('"neng_li":[]')
  })

  it('出参键集合逐键钉死为 19 键且不含 xing_bie（FP-28b 契约演进：用户.性别 死列出参收口）', async () => {
    const 响应 = await huoQu信息(平民ID)

    expect(响应.status).toBe(200)
    const 数据 = 响应.body.shu_ju as Record<string, unknown>
    // 显式列出期望键全集（不从 yingSheYongHu 反推）：多一少一、改名，都在这里红。
    // 【契约演进·改判理由】旧期望 = 本列表 + `xing_bie` 共 20 键；FP-28b 把 `xing_bie` 随
    //   用户.性别 死列一起摘除（本仓已无写入者，存量行剩下的只是无人维护的历史值），键数 20 → 19。
    //   这是**键集收紧**不是判据放宽：「行里有 性别 值也不得下发」那条反向断言在
    //   FP-28c 之后由下面的「对抗面」用例专门承接（本用例的夹具按真实行形态已不带该键）。
    expect(Object.keys(数据).sort()).toEqual(
      [
        'ce_shi',
        'chuang_jian_shi_jian',
        'geng_xin_shi_jian',
        'hai_wang_fen_shu',
        'huo_yue_ren_she_id',
        'id',
        'jiao_se',
        'mo_ren_xing_bie',
        'mu_biao_xing_bie',
        'neng_li',
        'ni_cheng',
        'qian_ming',
        'ren_she_biao_qian',
        'sheng_ri',
        'shou_ji_hao',
        'tou_xiang',
        'xing_ge_xuan_ze',
        'yong_hu_ming',
        'yun_xu_zha_nan_zha_nv',
      ],
    )
    // 反证面：`xing_bie` 键不得在线上任何形态出现（夹具按 FP-28c 后的真实行形态已不含 性别，
    // 「行里有值也不下发」的对抗面搬到下面那条专门用例，两边都得红才算守住）。
    // 必须带引号+冒号整串判定 —— `mu_biao_xing_bie` / `mo_ren_xing_bie` 都含子串 `xing_bie`。
    expect(数据).not.toHaveProperty('xing_bie')
    expect('xing_bie' in 数据).toBe(false)
    expect(响应.text).not.toContain('"xing_bie":')
    // 行内任何来源都不得把 'male' 当成字段值送出去（'female' 含子串 male ⇒ 必须按整串引号判定）
    expect(响应.text).not.toContain('"male"')
    // 用户侧性别的唯一出参口径仍在：mo_ren_xing_bie（用户.默认性别）与 mu_biao_xing_bie（目标性别）
    expect(数据.mo_ren_xing_bie).toBeNull()
    expect(数据.mu_biao_xing_bie).toBe('female')
  })

  it('FP-28c 对抗面：行里凭空带一个已删列 性别 时，出参仍不得出现 xing_bie（映射是白名单不是透传）', async () => {
    // 迁移 038 DROP 之后，真库的 `SELECT * FROM "用户"` 不会再返回 `性别` 键 ⇒ 上面那条忠实夹具
    // 已经**构造不出**"行里有值"的场景。为了让「白名单映射」这条契约不退化成空判，这里显式对抗注入：
    // 假定某天行里带着一个没人维护的 性别（列被人工加回、手工造的脏行、或另一份 SELECT 结果），
    // 出参也一个字节都不许漏出去 —— 这才是 FP-28b 那条 'male' 夹具原本承担的职责，换了承载方式而非删掉。
    const 行 = 用户行(脏历史列ID)
    expect(行.性别, '对抗夹具没注入 ⇒ 本用例是空判').toBe('male')
    const 响应 = await huoQu信息(脏历史列ID)
    expect(响应.status).toBe(200)
    const 数据 = 响应.body.shu_ju as Record<string, unknown>
    expect(数据).not.toHaveProperty('xing_bie')
    expect(数据).not.toHaveProperty('性别')
    expect(响应.text).not.toContain('"xing_bie":')
    // 'female' 含子串 male ⇒ 值面必须按整串引号判定，不能只 grep 'male'
    expect(响应.text).not.toContain('"male"')
    // 键数不随行内多出的列而漂移：仍是 FP-28b 钉死的 19 键白名单
    expect(Object.keys(数据)).toHaveLength(19)
  })

  it('三身份逐位下发 = 角色能力矩阵投影，且每一位都含 cha_kan（面板可开的充分条件）', async () => {
    const 用例: Array<[string, 'chao_guan' | 'yun_ying' | 'shen_he_yuan']> = [
      [超管ID, 'chao_guan'],
      [运营ID, 'yun_ying'],
      [审核ID, 'shen_he_yuan'],
    ]
    for (const [用户ID, 角色] of 用例) {
      const 响应 = await huoQu信息(用户ID)
      const 数据 = 响应.body.shu_ju as Record<string, unknown>

      expect(数据.jiao_se, 用户ID).toBe(角色)
      expect(数据.neng_li, 用户ID).toEqual([...角色能力矩阵[角色]])
      expect((数据.neng_li as string[]), 用户ID).toContain('cha_kan')
    }
  })

  it('用户表非布尔旗标不被当成管理员（fail-closed：脏值 → 无角色 + 空能力位）', async () => {
    const 响应 = await huoQu信息(脏旗标ID)
    const 数据 = 响应.body.shu_ju as Record<string, unknown>

    expect(数据.jiao_se).toBeNull()
    expect(数据.neng_li).toEqual([])
  })

  it('行内混入客户端申报的 jiao_se/neng_li/guan_li_yuan 一律不参与推导，也不下发', async () => {
    const 响应 = await huoQu信息(伪造ID)
    const 数据 = 响应.body.shu_ju as Record<string, unknown>

    expect(数据.jiao_se).toBeNull()
    expect(数据.neng_li).toEqual([])
    expect(数据).not.toHaveProperty('guan_li_yuan')
    expect(响应.text).not.toContain('guan_li_yuan')
    expect(响应.text).not.toContain('gao_we')
  })

  it('未授权访问不返回身份对象', async () => {
    const 响应 = await huoQu信息(null)

    expect(响应.status).toBe(401)
    expect(响应.body.shu_ju ?? null).toBeNull()
  })
})
