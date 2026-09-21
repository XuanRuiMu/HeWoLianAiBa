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
 */

const 平民ID = '44444444-4444-4444-8444-444444444444'
const 超管ID = '11111111-1111-4111-8111-111111111111'
const 运营ID = '22222222-2222-4222-8222-222222222222'
const 审核ID = '33333333-3333-4333-8333-333333333333'
const 脏旗标ID = '66666666-6666-4666-8666-666666666666'
const 伪造ID = '77777777-7777-4777-8777-777777777777'

type 旗标组 = { 管理员: unknown; 运营: unknown; 审核员: unknown }

const 旗标表: Record<string, 旗标组> = {
  [平民ID]: { 管理员: false, 运营: false, 审核员: false },
  [超管ID]: { 管理员: true, 运营: false, 审核员: false },
  [运营ID]: { 管理员: false, 运营: true, 审核员: false },
  [审核ID]: { 管理员: false, 运营: false, 审核员: true },
  [脏旗标ID]: { 管理员: 'true', 运营: 1, 审核员: null },
  [伪造ID]: { 管理员: false, 运营: false, 审核员: false },
}

function 用户行(用户ID: string): Record<string, unknown> {
  const 旗标 = 旗标表[用户ID] ?? { 管理员: false, 运营: false, 审核员: false }
  return {
    ID: 用户ID,
    手机号: '13800138000',
    用户名: '测试用户',
    昵称: '测试昵称',
    性别: 'male',
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
