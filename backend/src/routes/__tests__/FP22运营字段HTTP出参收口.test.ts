import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import request from 'supertest'
import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { huoQuFanYi } from '../../config/translations'
import { YUN_XU_XIAO_XI_LEI_XING } from '../../config/媒体配置'
import { YUN_YING_ZI_DUAN_XIAO_XI_LEI_XING } from '../../config/消息配置'
import { huoQuXiaoXiLieBiao } from '../../services/消息'
import {
  shouKouXiaoXiYunYingZiDuan,
  shouKouXiaoXiLieBiaoYunYingZiDuan,
} from '../../services/消息出参收口'
import { zhanShiXiaoXiZhengWen } from '../../services/对话渲染'
import { qingChuJiaoSeHuanCun } from '../../middleware/管理员'
import luYou from '../消息'

/**
 * FP-22（消解 L-39）运营侧数据的 HTTP 面同族绕过收口，与 FP-19（socket 面 `管理员_*` 改投管理
 * 专用房间）同族的另一半：HTTP 读接口曾把撤回前原文（`yuan_shi_nei_rong`，含 AI 自撤回的
 * 「隐藏的内心修正」）与存量「AI 隐藏内心活动」整行（`lei_xing === 'neiXinHuoDong'`）
 * 下发给当事人自己的浏览器。
 *
 * 断言口径：普通用户侧这些键**必须根本不在响应对象里**（结构守卫，不是「值为空」），
 * 其余业务字段逐键全等，以证伪「收口顺手改了别的字段」；管理侧三身份逐位仍全量下发。
 * 能力判定用真 `middleware/管理员` + 真 `utils/角色能力`，只 mock 到数据库/缓存层。
 */

const 超管ID = '11111111-1111-4111-8111-111111111111'
const 运营ID = '22222222-2222-4222-8222-222222222222'
const 审核ID = '33333333-3333-4333-8333-333333333333'
const 平民ID = '44444444-4444-4444-8444-444444444444'
const 角色ID = '55555555-5555-4555-8555-555555555555'

const 用户撤回消息ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const AI撤回消息ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const 内心行消息ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const 正常消息ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

const 用户撤回原文 = '我自己撤回前写的那句话'
const AI隐藏原文 = 'AI 隐藏起来的内心修正原文'
const 内心行内容 = 'AI 内心活动 我并不想继续这个话题'
const 正常内容 = '今天过得怎么样'

const 会话创建时间 = '2026-09-19T08:00:00.000Z'
const 会话创建时间戳 = new Date(会话创建时间).getTime()
const 撤回创建时间 = new Date().toISOString()

type 旗标组 = { 管理员: boolean; 运营: boolean; 审核员: boolean }
const 旗标表: Record<string, 旗标组> = {
  [超管ID]: { 管理员: true, 运营: false, 审核员: false },
  [运营ID]: { 管理员: false, 运营: true, 审核员: false },
  [审核ID]: { 管理员: false, 运营: false, 审核员: true },
  [平民ID]: { 管理员: false, 运营: false, 审核员: false },
}

let 能力查询抛错 = false

function 消息行(
  id: string,
  发送者: 'yonghu' | 'jiaose',
  类型: string,
  内容: string,
  客户端序号: number,
  已撤回: boolean,
  原始内容: string | null,
  创建时间 = 会话创建时间,
): Record<string, unknown> {
  return {
    ID: id,
    用户ID: 平民ID,
    角色ID,
    内容,
    发送者,
    类型,
    已读: true,
    客户端序号,
    创建时间,
    已撤回,
    撤回时间: 已撤回 ? 创建时间 : null,
    原始内容,
    媒体ID: null,
    媒体SHA256: null,
    媒体类别: null,
    媒体时长毫秒: null,
    媒体原始文件名: null,
  }
}

function 会话消息行(): Record<string, unknown>[] {
  return [
    消息行(正常消息ID, 'jiaose', 'wenben', 正常内容, 4, false, null),
    消息行(内心行消息ID, 'jiaose', 'neiXinHuoDong', 内心行内容, 3, false, null),
    消息行(AI撤回消息ID, 'jiaose', 'wenben', '对方撤回了一条消息', 2, true, AI隐藏原文),
    消息行(用户撤回消息ID, 'yonghu', 'wenben', '对方撤回了一条消息', 1, true, 用户撤回原文),
  ]
}

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => 顶层查询(文本, 参数),
    // FP-09：用户消息落库改走「事务 + 会话 advisory 锁 + 服务端权威取号」，
    // 假库必须同样提供 connect()，否则该路径在此文件里根本没被走到。
    connect: async () => ({
      query: async (文本: string, 参数: unknown[] = []) => 事务查询(文本, 参数),
      release: () => undefined,
    }),
  },
}))

const 发送落库ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

async function 顶层查询(文本: string, 参数: unknown[] = []): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    if (文本.includes('SELECT "管理员", "运营", "审核员" FROM "用户"')) {
      if (能力查询抛错) throw new Error('SHU_JU_KU_CUO_WU connection refused')
      const 旗标 = 旗标表[String(参数[0])] ?? { 管理员: false, 运营: false, 审核员: false }
      return { rows: [旗标], rowCount: 1 }
    }
    if (文本.includes('FROM "消息" m LEFT JOIN "媒体文件"') && 文本.includes('m."ID" = $1')) {
      return {
        rows: [消息行(发送落库ID, 'yonghu', 'wenben', '我刚发的那句', 5, false, null, 撤回创建时间)],
        rowCount: 1,
      }
    }
    if (文本.includes('FROM "消息" m LEFT JOIN "媒体文件"')) {
      return { rows: 会话消息行(), rowCount: 4 }
    }
    if (文本.includes('COUNT(*) as zong_shu')) {
      return { rows: [{ zong_shu: 4 }], rowCount: 1 }
    }
    if (文本.includes('FROM "角色" WHERE "ID" = $1 LIMIT 1')) {
      return {
        rows: [
          { 用户ID: 平民ID, 封存: false, 可继续聊天: true, 结局状态: '', 是否渣型: false, 性别: 'nv' },
        ],
        rowCount: 1,
      }
    }
    if (文本.includes('UPDATE "消息" SET')) {
      return {
        rows: [
          消息行(
            用户撤回消息ID,
            'yonghu',
            'wenben',
            '对方撤回了一条消息',
            5,
            true,
            用户撤回原文,
            撤回创建时间,
          ),
        ],
        rowCount: 1,
      }
    }
    if (文本.includes('FROM "消息" WHERE "ID" = $1')) {
      return {
        rows: [消息行(用户撤回消息ID, 'yonghu', 'wenben', 用户撤回原文, 5, false, null, 撤回创建时间)],
        rowCount: 1,
      }
    }
    return { rows: [], rowCount: 0 }
}

async function 事务查询(文本: string, 参数: unknown[] = []): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*$/i.test(文本) || 文本.includes('pg_advisory_xact_lock')) {
    return { rows: [], rowCount: 0 }
  }
  if (文本.includes('COALESCE(MAX("客户端序号")')) {
    return { rows: [{ zui_da: 4 }], rowCount: 1 }
  }
  if (文本.includes('INSERT INTO "消息"')) {
    return { rows: [{ ID: 发送落库ID }], rowCount: 1 }
  }
  return 顶层查询(文本, 参数)
}

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

vi.mock('../../socket/聊天', () => ({
  luoKuChuFaJiaoSeTiaoDuQi: vi.fn(async () => undefined),
  chongZhiJiaoSeTiaoDuQi: vi.fn(),
  zhongDuanJiaoSeTiaoDuQi: vi.fn(),
}))

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })) })),
}))

vi.mock('../../middleware/限流', () => ({
  liaoTianXianLiu: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  aiQingQiuXianLiu: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  changGuiXianLiu: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  guanLiCaoZuoXianLiu: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
}))

vi.mock('../../middleware/输入验证', () => ({
  聊天内容验证中间件: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  手机号验证中间件: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
  用户名验证中间件: (_req: unknown, _res: unknown, 下一项: () => void) => 下一项(),
}))

vi.mock('../../services/安全审核', () => ({
  jianCeWeiJiXinHao: vi.fn(() => null),
  shenHeNeiRongAnQuan: vi.fn(async () => ({ wei_gui: false })),
}))

vi.mock('../../services/账号封禁', () => ({
  chaXunZhangHaoFengJin: vi.fn(async () => ({ beiFengJin: false })),
  jiLuZhangHaoWeiGui: vi.fn(async () => undefined),
}))

vi.mock('../../services/IP封禁', () => ({
  获取IP: () => '127.0.0.1',
  记录违规: vi.fn(() => ({ 已封禁: false })),
}))

vi.mock('../../services/审计日志', () => ({
  jiLuShenJiRiZhi: vi.fn(async () => undefined),
}))

vi.mock('../../services/军师', () => ({
  huoQuJunShiLieBiao: vi.fn(async () => ({ junShiLieBiao: [] })),
  qingQiuJunShiZhiDao: vi.fn(),
  huoQuJunShiJiLu: vi.fn(async () => ({ jiLuLieBiao: [] })),
  huoQuJunShiZhiDaoZhuangTaiXinXi: vi.fn(async () => null),
}))

vi.mock('../../services/军师缓存', () => ({
  shanChuJunShiZhiDaoZhuangTai: vi.fn(async () => undefined),
}))

vi.mock('../../services/好感度', () => ({
  sheZhiMiJiHaoGanDu: vi.fn(async () => ({ cheng_gong: true })),
}))

vi.mock('../../services/AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: vi.fn(async () => ({ id: '900', lei_xing: 'wenben' })),
}))

vi.mock('../../services/思考记录', () => ({
  jiLuSiKao: vi.fn(async () => undefined),
}))

vi.mock('../../services/媒体存储', () => ({
  liuShiBaoCunMeiTi: vi.fn(),
  MeiTiCunChuCuoWu: class extends Error {},
  shengChengQianMingURL: (sha256: string) => `/api/媒体/${sha256}?e=1&s=sign`,
}))

function 建应用(用户ID: string | null): Express {
  const 应用 = express()
  应用.use(express.json())
  应用.use((qingQiu, _xiangYing, xiaYiBu) => {
    qingQiu.url = decodeURI(qingQiu.url)
    xiaYiBu()
  })
  应用.use((请求, _响应, 下一项) => {
    if (用户ID) {
      (请求 as unknown as { yong_hu?: { yongHuId: string } }).yong_hu = { yongHuId: 用户ID }
    }
    下一项()
  })
  应用.use('/api/聊天', luYou)
  return 应用
}

function huoQuLieBiao(用户ID: string | null) {
  return request(建应用(用户ID)).get(encodeURI(`/api/聊天/会话/${角色ID}/消息`))
}

const 运营侧键 = 'yuan_shi_nei_rong'
const 撤回占位文案 = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')

beforeEach(() => {
  vi.clearAllMocks()
  能力查询抛错 = false
  // 角色缓存是 30s TTL 的进程内 Map，用例之间必须显式失效，否则「查库抛错」用例会被上一条缓存喂绿
  qingChuJiaoSeHuanCun()
})

describe('FP-22 普通用户读取自己会话：运营侧字段整键不下发', () => {
  it('列表里每一条都不含 yuan_shi_nei_rong 键（结构守卫，不是置空）', async () => {
    const 响应 = await huoQuLieBiao(平民ID)

    expect(响应.status).toBe(200)
    const 列表 = 响应.body.shu_ju.lie_biao as Array<Record<string, unknown>>
    expect(列表.length).toBeGreaterThan(0)
    for (const 项 of 列表) {
      expect(项).not.toHaveProperty(运营侧键)
      expect(运营侧键 in 项).toBe(false)
    }
    expect(响应.text).not.toContain(AI隐藏原文)
    expect(响应.text).not.toContain(用户撤回原文)
  })

  it('存量 AI 内心活动整行（lei_xing neiXinHuoDong）不下发', async () => {
    const 响应 = await huoQuLieBiao(平民ID)
    const 列表 = 响应.body.shu_ju.lie_biao as Array<Record<string, unknown>>

    expect(列表.map((项) => 项.id)).not.toContain(内心行消息ID)
    expect(列表.map((项) => 项.lei_xing)).not.toContain('neiXinHuoDong')
    expect(响应.text).not.toContain(内心行内容)
  })

  it('撤回气泡与业务字段逐键不变（收口没有顺手改别的）', async () => {
    const 响应 = await huoQuLieBiao(平民ID)
    const 列表 = 响应.body.shu_ju.lie_biao as Array<Record<string, unknown>>
    const 撤回行 = 列表.find((项) => 项.id === 用户撤回消息ID)
    const 正常行 = 列表.find((项) => 项.id === 正常消息ID)

    expect(撤回行).toEqual({
      id: 用户撤回消息ID,
      hui_hua_id: 角色ID,
      fa_song_zhe_id: 平民ID,
      fa_song_zhe_lei_xing: 'yonghu',
      ai_biao_shi: false,
      nei_rong: 撤回占位文案,
      // FP-10 唯一新增键：撤回行只给「与 nei_rong 逐字相同」的一个文字块，
      // 库里的原块（含图片顺序与被撤回正文）绝不随撤回行下发
      nei_rong_kuai: [{ lei_xing: 'wenzi', nei_rong: 撤回占位文案 }],
      lei_xing: 'wenben',
      shi_jian_chuo: 会话创建时间戳,
      yi_du: true,
      yi_che_hui: true,
      che_hui_shi_jian: 会话创建时间,
      ke_hu_duan_xu_hao: 1,
      mi_deng_jian: null,
      mei_ti_id: null,
      mei_ti_url: null,
      mei_ti_lei_bie: null,
      mei_ti_shi_chang_hao_miao: null,
      mei_ti_yuan_shi_wen_jian_ming: null,
    })
    expect(正常行).toMatchObject({ id: 正常消息ID, nei_rong: 正常内容, ai_biao_shi: true })
    expect(响应.body.shu_ju.zong_shu).toBe(4)
  })

  it('发送与撤回两条回显出口同样不含运营字段', async () => {
    const 发送 = await request(建应用(平民ID))
      .post(encodeURI(`/api/聊天/会话/${角色ID}/消息`))
      .send({ neiRong: '我刚发的那句', 客户端序号: 5 })

    expect(发送.status).toBe(200)
    expect(发送.body.shu_ju).not.toHaveProperty(运营侧键)

    const 撤回 = await request(建应用(平民ID)).put(
      encodeURI(`/api/聊天/会话/${角色ID}/消息/${用户撤回消息ID}/撤回`),
    )

    expect(撤回.status).toBe(200)
    expect(撤回.body.shu_ju).not.toHaveProperty(运营侧键)
    expect(撤回.text).not.toContain(用户撤回原文)
  })
})

describe('FP-22 具备运营读取能力的调用者照旧全量下发（不得砍掉管理侧数据）', () => {
  it.each([
    ['超管', 超管ID],
    ['运营', 运营ID],
    ['审核员', 审核ID],
  ])('%s 读取会话时仍含撤回原文与内心活动行', async (_名, 用户ID) => {
    const 响应 = await huoQuLieBiao(用户ID)

    expect(响应.status).toBe(200)
    const 列表 = 响应.body.shu_ju.lie_biao as Array<Record<string, unknown>>
    expect(列表).toHaveLength(4)
    expect(列表.map((项) => 项.id)).toContain(内心行消息ID)
    expect(列表.find((项) => 项.id === AI撤回消息ID)?.[运营侧键]).toBe(AI隐藏原文)
    expect(列表.find((项) => 项.id === 用户撤回消息ID)?.[运营侧键]).toBe(用户撤回原文)
  })
})

describe('FP-22 收口只作用于出参，取数口与 AI 上下文一律不变', () => {
  it('取数口仍原样产出撤回原文与内心活动行', async () => {
    const 取数 = await huoQuXiaoXiLieBiao({ yong_hu_id: 平民ID, jiao_se_id: 角色ID })

    const AI撤回 = 取数.lie_biao.find((项) => 项.id === AI撤回消息ID)
    expect(AI撤回?.yuan_shi_nei_rong).toBe(AI隐藏原文)
    expect(取数.lie_biao.map((项) => 项.lei_xing)).toContain('neiXinHuoDong')
  })

  it('对话渲染入口仍把撤回原文喂给模型（没有被出参收口削弱）', () => {
    expect(
      zhanShiXiaoXiZhengWen({
        fa_song_zhe_lei_xing: 'jiaose',
        fa_song_zhe_ming: '小甜心',
        nei_rong: 撤回占位文案,
        shi_jian: 会话创建时间,
        yi_che_hui: true,
        yuan_shi_nei_rong: AI隐藏原文,
      }),
    ).toBe(`[已撤回，原始内容：${AI隐藏原文}]`)
  })
})

describe('FP-22 能力未知与伪申报一律 fail-closed', () => {
  it('查库抛错时按无权限处理：仍 200、运营字段与内心行都不下发、内部错误不外泄', async () => {
    能力查询抛错 = true

    const 响应 = await huoQuLieBiao(超管ID)

    expect(响应.status).toBe(200)
    const 列表 = 响应.body.shu_ju.lie_biao as Array<Record<string, unknown>>
    expect(列表.map((项) => 项.id)).not.toContain(内心行消息ID)
    for (const 项 of 列表) {
      expect(项).not.toHaveProperty(运营侧键)
    }
    expect(响应.text).not.toContain('connection refused')
    expect(响应.text).not.toContain('SHU_JU_KU_CUO_WU')
  })

  it('库里无旗标者拿不到运营字段，请求侧申报角色/管理员对结果零影响', async () => {
    const 干净 = await huoQuLieBiao(平民ID)
    const 伪申报 = await request(建应用(平民ID)).get(
      encodeURI(`/api/聊天/会话/${角色ID}/消息?jiao_se=chao_guan&guan_li_yuan=true`),
    )

    expect(伪申报.status).toBe(200)
    expect(伪申报.body.shu_ju).toEqual(干净.body.shu_ju)
    expect(伪申报.text).not.toContain(AI隐藏原文)
  })

  it('未注入身份 → 401 且零运营字段；空读方编号 → 收口入口自身按无权限处理', async () => {
    const 响应 = await huoQuLieBiao(null)

    expect(响应.status).toBe(401)
    expect(响应.text).not.toContain(AI隐藏原文)

    const 取数 = await huoQuXiaoXiLieBiao({ yong_hu_id: 平民ID, jiao_se_id: 角色ID })
    const 空编号列表 = await shouKouXiaoXiLieBiaoYunYingZiDuan(取数.lie_biao, '')
    const 空编号单条 = await shouKouXiaoXiYunYingZiDuan(取数.lie_biao[2]!, '')

    expect(空编号列表.map((项) => 项.lei_xing)).not.toContain('neiXinHuoDong')
    expect(空编号列表.every((项) => !(运营侧键 in 项))).toBe(true)
    expect(空编号单条).not.toHaveProperty(运营侧键)
    expect(await shouKouXiaoXiYunYingZiDuan(undefined, '')).toBeUndefined()
  })
})

describe('FP-22 收口点唯一性与同类面逐条判定', () => {
  const 源文件 = (相对路径: string) => readFileSync(resolve(__dirname, '../..', 相对路径), 'utf8')

  it('消息 HTTP 出参站点全部经唯一收口入口，且不存在裸回显', () => {
    const 路由源 = 源文件('routes/消息.ts')
    const 单条站点 = 路由源.match(/shouKouXiaoXiYunYingZiDuan\(/g) ?? []
    const 列表站点 = 路由源.match(/shouKouXiaoXiLieBiaoYunYingZiDuan\(/g) ?? []

    expect(单条站点).toHaveLength(4)
    expect(列表站点).toHaveLength(1)
    expect(路由源).not.toMatch(/chengGongXiangYing\(\s*xiangYing,\s*jieGuo\.xiao_xi\s*\)/)
    expect(路由源).not.toMatch(/lie_biao:\s*jieGuo\.lie_biao\s*,/)
  })

  it('判定唯一走 FP-18/FP-19 同源入口，收口与取数口都不自写第二套', () => {
    const 收口源 = 源文件('services/消息出参收口.ts')
    const 服务源 = 源文件('services/消息.ts')
    const 管理源 = 源文件('middleware/管理员.ts')

    expect(收口源).toContain('anYongHuIdJuBeiNengLi(')
    expect(收口源).toContain("'cha_kan'")
    expect(管理源).toContain('export async function anYongHuIdJuBeiNengLi')
    for (const 源 of [收口源, 服务源]) {
      expect(源).not.toMatch(/SELECT "管理员", "运营", "审核员"/)
      expect(源).not.toMatch(/guan_li_yuan|shiFouGuanLiYuan|是管理员/)
      expect(源).not.toMatch(/lingPai|RenZhengQingQiu|jwt/i)
    }
  })

  it('运营侧消息类型不可能由用户发送口写回（与发送白名单互斥）', () => {
    expect(YUN_YING_ZI_DUAN_XIAO_XI_LEI_XING).toEqual(['neiXinHuoDong'])
    for (const 类型 of YUN_YING_ZI_DUAN_XIAO_XI_LEI_XING) {
      expect(YUN_XU_XIAO_XI_LEI_XING).not.toContain(类型)
    }
  })

  it('管理面自有序列化器保留撤回原文，且整条管理路由挂只读运营门禁', () => {
    const 管理序列化源 = 源文件('services/管理员.ts')
    const 管理路由源 = 源文件('routes/管理员.ts')

    expect(管理序列化源).toContain('yuan_shi_nei_rong: row.原始内容')
    expect(管理路由源).toContain('luYou.use(guanLiZhiDuMenKong)')
  })

  it('好感度普通读口只出阶段与心情，四维持分与内部理由挂在运营门禁后', () => {
    const 好感度服务源 = 源文件('services/好感度.ts')
    const 好感度路由源 = 源文件('routes/好感度.ts')
    const 起点 = 好感度服务源.indexOf('export async function huoQuGongKaiHaoGanDuXinXi')
    const 公开出口 = 好感度服务源.slice(起点, 好感度服务源.indexOf('export async function gengXinHaoGanDu'))

    expect(起点).toBeGreaterThan(-1)
    const 返回体 = /return\s*\{([\s\S]*?)\}/.exec(公开出口)?.[1] ?? ''

    expect(返回体.replace(/\s/g, '')).toBe('jie_duan:jieDuanXinXi.jieDuanMing,xin_qing:jieDuanXinXi.xinQing,')
    for (const 内部字段 of ['zong_fen', 'xin_ren_du', 'li_you', 'yuan_shi_nei_rong']) {
      expect(返回体).not.toContain(内部字段)
    }
    expect(好感度路由源).toMatch(/\/:jiaoSeId\/详情',\s*\n?\s*guanLiZhiDuMenKong/)
  })

  it('战绩面按白名单投影出参，撤回原文与军师聊天快照字段都不外泄', () => {
    const 战绩路由源 = 源文件('routes/战绩.ts')
    const 起点 = 战绩路由源.indexOf('function guoLvMinGanZiDuanXiangQing')
    const 投影段 = 战绩路由源.slice(起点, 战绩路由源.indexOf('luYou.get('))

    expect(起点).toBeGreaterThan(-1)
    for (const 运营字段 of ['yuan_shi_nei_rong', 'liao_tian_ji_lu', 'li_you', 'xin_ren_du']) {
      expect(投影段).not.toContain(运营字段)
    }
    expect(投影段).toContain('jun_shi_zhi_dao_ji_lu: junShiJiLu.map(zhuanHuanJunShiJiLu)')
  })

  it('思考记录表没有任何面向用户的读口（只有写入与注销清理）', () => {
    const 读取面 = ['routes', 'socket'].flatMap((目录) =>
      readdirSync(resolve(__dirname, '../..', 目录))
        .filter((文件) => 文件.endsWith('.ts'))
        .filter((文件) => {
          const 内容 = readFileSync(resolve(__dirname, '../..', 目录, 文件), 'utf8')
          return /FROM "思考记录"|UPDATE "思考记录"/.test(内容)
        })
        .map((文件) => `${目录}/${文件}`),
    )
    const 写入源 = 源文件('services/思考记录.ts')

    expect(读取面).toEqual([])
    expect(写入源).toContain('INSERT INTO "思考记录"')
    expect(写入源).not.toMatch(/SELECT .*FROM "思考记录"/)
  })

  it('运营侧事件恒投管理房间、业务帧不得夹带撤回原文', () => {
    const 调度器源 = 源文件('services/AI回复调度器.ts')
    const 管理房间站点 = 调度器源.match(/io\.to\(管理监控房间名\(/g) ?? []

    expect(管理房间站点).toHaveLength(7)
    expect(调度器源).not.toMatch(/io\.to\(this\.用户ID\)\.emit\('管理员_/)
    expect(调度器源).not.toMatch(/emit\('角色回复'[\s\S]{0,260}yuan_shi_nei_rong/)
  })

  it('好友消息面按显式字段序列化，本就不含撤回原文与内心行（FP-21 面，只判定不改）', () => {
    const 好友路由源 = 源文件('routes/好友.ts')

    expect(好友路由源).not.toContain('yuan_shi_nei_rong')
    expect(好友路由源).not.toContain('neiXinHuoDong')
    expect(好友路由源).toContain('yi_che_hui:')
  })

  it('角色详情面出的是人设白名单（无运营列），渣型答案字段的泄露裁决另见 L-45', () => {
    const 角色生成源 = 源文件('services/角色生成.ts')
    const 详情段 = 角色生成源.slice(
      角色生成源.indexOf('export async function anIdChaJiaoSeXiangQing'),
      角色生成源.indexOf('export async function', 角色生成源.indexOf('anIdChaJiaoSeXiangQing') + 10),
    )

    for (const 运营字段 of ['yuan_shi_nei_rong', 'nei_xin', 'li_you', '原始内容']) {
      expect(详情段).not.toContain(运营字段)
    }
    // 已知残留：渣型「答案」字段（话术/暴露方式/识破线索）仍随人设下发，前端零消费点，属 L-45 裁决面
    for (const 答案字段 of ['zha_fa_miao_shu', 'hua_shu', 'bao_lu_fang_shi', 'shi_po_xian_suo']) {
      expect(详情段).toContain(答案字段)
    }
  })

  it('运营侧内部数据经 LLM 转述的间接出口（军师/复盘）有 prompt 侧禁令，属 L-45 记录面', () => {
    const 军师配置源 = 源文件('config/军师配置.ts')
    const 军师服务源 = 源文件('services/军师.ts')

    expect(军师配置源).toContain('绝对禁止向用户透露具体分数')
    expect(军师服务源).toContain('huoQuWanZhengHaoGanDu')
  })

  it('军师记录面仍带撤回原文且前端有可见依赖：本面未收口，属 L-45 待用户裁决', () => {
    const 军师源 = 源文件('services/军师.ts')
    const 前端源 = readFileSync(
      resolve(__dirname, '../../../../frontend/src/views/军师记录详情.vue'),
      'utf8',
    )

    expect(军师源).toContain('yuan_shi_nei_rong: xiaoXi.yuan_shi_nei_rong')
    expect(前端源).toContain('xiaoXi.yuan_shi_nei_rong')
    expect(前端源).toContain('junShi')
  })
})
