import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import request from 'supertest'
import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

const 超管编号 = '11111111-1111-4111-8111-111111111111'
const 运营编号 = '22222222-2222-4222-8222-222222222222'
const 审核编号 = '33333333-3333-4333-8333-333333333333'
const 平民编号 = '44444444-4444-4444-8444-444444444444'
const 角色编号 = '55555555-5555-4555-8555-555555555555'

type 旗标组 = { 管理员: boolean; 运营: boolean; 审核员: boolean }

const 角色旗标: Record<string, 旗标组> = {
  chao_guan: { 管理员: true, 运营: false, 审核员: false },
  yun_ying: { 管理员: false, 运营: true, 审核员: false },
  shen_he_yuan: { 管理员: false, 运营: false, 审核员: true },
  wu: { 管理员: false, 运营: false, 审核员: false },
}

const 编号到角色: Record<string, keyof typeof 角色旗标> = {
  [超管编号]: 'chao_guan',
  [运营编号]: 'yun_ying',
  [审核编号]: 'shen_he_yuan',
  [平民编号]: 'wu',
}

const 语句日志: Array<{ 文本: string; 参数: unknown[] }> = []
let 角色查询抛错 = false

function 当前旗标(用户编号: string): 旗标组 {
  return 角色旗标[编号到角色[用户编号] ?? 'wu']
}

function 用户行(用户编号: string): Record<string, unknown> {
  const 旗标 = 当前旗标(用户编号)
  return {
    ID: 用户编号,
    手机号: `1380000${用户编号.slice(0, 4).replace(/\D/g, '') || '0000'}`.slice(0, 11),
    用户名: `yonghu_${用户编号.slice(0, 8)}`,
    昵称: null,
    目标性别: null,
    默认性别: null,
    性格选择: null,
    人设标签: null,
    渣男渣女变体: false,
    头像: null,
    生日: '2000-01-01',
    签名: null,
    管理员: 旗标.管理员,
    运营: 旗标.运营,
    审核员: 旗标.审核员,
    测试: false,
    活跃角色ID: null,
    创建时间: '2026-01-01T00:00:00.000Z',
    更新时间: '2026-01-01T00:00:00.000Z',
  }
}

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      语句日志.push({ 文本, 参数 })
      const 用户编号 = typeof 参数[0] === 'string' ? 参数[0] : ''
      if (文本.includes('SELECT "管理员", "运营", "审核员" FROM "用户"')) {
        if (角色查询抛错) throw new Error('SHU_JU_KU_CUO_WU connection refused')
        return { rows: [当前旗标(用户编号)], rowCount: 1 }
      }
      if (文本.includes('FROM "用户" WHERE "ID" = $1')) {
        return { rows: [用户行(用户编号)], rowCount: 1 }
      }
      if (文本.includes('COUNT(*)')) {
        return { rows: [{ count: 0 }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
  },
}))

const 发布记录: Array<{ 频道: string; 消息: string }> = []

vi.mock('../../redis', () => ({
  redis: {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    incr: async () => 1,
    pexpire: async () => true,
    dbsize: async () => 0,
    publish: async (频道: string, 消息: string) => {
      发布记录.push({ 频道, 消息 })
      return 1
    },
    duplicate: () => ({
      subscribe: async () => undefined,
      on: () => undefined,
    }),
  },
}))

vi.mock('../../middleware/限流', () => ({
  guanLiCaoZuoXianLiu: (_q: unknown, _x: unknown, 下: () => void) => 下(),
  liaoTianXianLiu: (_q: unknown, _x: unknown, 下: () => void) => 下(),
  dengLuXianLiu: (_q: unknown, _x: unknown, 下: () => void) => 下(),
  dengLuIPLianLiu: (_q: unknown, _x: unknown, 下: () => void) => 下(),
  faSongMaXianLiu: (_q: unknown, _x: unknown, 下: () => void) => 下(),
  zhuCeXianLiu: (_q: unknown, _x: unknown, 下: () => void) => 下(),
  jianChaShouJiXianLiu: (_q: unknown, _x: unknown, 下: () => void) => 下(),
  duanXinRiPeiEZhuJi: (_q: unknown, _x: unknown, 下: () => void) => 下(),
}))

vi.mock('../../middleware/输入验证', () => ({
  手机号验证中间件: (_q: unknown, _x: unknown, 下: () => void) => 下(),
  用户名验证中间件: (_q: unknown, _x: unknown, 下: () => void) => 下(),
}))

vi.mock('../../services/审计日志', () => ({
  jiLuShenJiRiZhi: vi.fn(async () => undefined),
}))

vi.mock('../../services/管理员', () => ({
  huoQuYongHuLieBiao: vi.fn(async () => [
    { id: 平民编号, shou_ji_hao: '13800000000', yong_hu_ming: 'a', jiao_se: null, ce_shi: false, jiao_se_shu: 0, xiao_xi_shu: 0, chuang_jian_shi_jian: '' },
    { id: 超管编号, shou_ji_hao: '13800000001', yong_hu_ming: 'b', jiao_se: 'chao_guan', ce_shi: false, jiao_se_shu: 0, xiao_xi_shu: 0, chuang_jian_shi_jian: '' },
  ]),
  huoQuDuiHuaLieBiao: vi.fn(async () => []),
  huoQuDuiHuaXiangQing: vi.fn(async () => ({ jiao_se: {}, yong_hu: null, xiao_xi_lie_biao: [], hao_gan_du: null })),
  huoQuJiaoSeXinXi: vi.fn(async () => ({ jiao_se: {}, duo_she_zhuang_tai: false })),
  chuangJianCeShiYongHu: vi.fn(async () => ({ cheng_gong: true, yong_hu: {}, chu_shi_mi_ma: 'x' })),
  dengLuCeShiYongHu: vi.fn(async () => ({ cheng_gong: true, ling_pai: 'x', yong_hu: {} })),
  shanChuYongHu: vi.fn(async () => ({ cheng_gong: true })),
  huoQuXiTongZhuangTai: vi.fn(async () => ({ yong_hu_shu: 0, jiao_se_shu: 0, xiao_xi_shu: 0, jin_ri_xin_zeng: { yong_hu: 0, jiao_se: 0, xiao_xi: 0 }, redis_jian_shu: 0, shen_ji_ri_zhi: [] })),
  sheZhiGuanLiYuanZhuangTai: vi.fn(async () => ({ cheng_gong: true, yi_bian_geng: true, jiao_se: 'yun_ying' })),
}))

vi.mock('../../services/夺舍', () => ({
  sheZhiDuoSheZhuangTai: vi.fn(async () => ({ qiang_zhan: false })),
  jieShuDuoShe: vi.fn(async () => true),
  huoQuJiaoSeYongHuId: vi.fn(async () => 平民编号),
  duoSheXinTiao: vi.fn(async () => true),
  huoQuDuoSheGuanLiYuan: vi.fn(async () => null),
  jiaoSeShiFouBeiDuoShe: vi.fn(async () => false),
  shiFangGuanLiYuanQuanBuDuoShe: vi.fn(async () => []),
}))

vi.mock('../../services/账号封禁', () => ({
  lieChuFengJinShenSu: vi.fn(async () => []),
  jieChuZhangHaoFengJin: vi.fn(async () => undefined),
  shenHeShenSu: vi.fn(async () => undefined),
  chaXunZhangHaoFengJin: vi.fn(async () => ({ beiFengJin: false })),
  jiLuZhangHaoWeiGui: vi.fn(async () => undefined),
}))

vi.mock('../../socket/聊天', () => ({
  zhongDuanJiaoSeTiaoDuQi: vi.fn(),
  luoKuChuFaJiaoSeTiaoDuQi: vi.fn(async () => undefined),
}))

vi.mock('../../services/好感度缓存', () => ({
  huoQuZengLiangQuXian: vi.fn(async () => []),
  jiSuanMuBiaoQuXian: vi.fn(async () => ({})),
}))

vi.mock('../../services/好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 42, jie_duan_ming: '热恋' })),
  huoQuGongKaiHaoGanDuXinXi: vi.fn(async () => ({ zong_fen: 42 })),
  huoQuJieDuanMing: vi.fn(() => '热恋'),
  gengXinHaoGanDu: vi.fn(async () => ({ cheng_gong: true, hao_gan_du: {} })),
  sheZhiMiJiHaoGanDu: vi.fn(async () => ({ cheng_gong: true })),
}))

vi.mock('../../services/用量统计', () => ({
  huoQuJinRiHuiZong: vi.fn(async () => ({})),
}))

vi.mock('../../services/重试队列', () => ({
  duQuZhongShiDuiLieChangDu: vi.fn(async () => 0),
}))

vi.mock('../../services/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn(async () => ({ lie_biao: [], wei_du_shu: 0 })),
  biaoJiTongZhiYiDu: vi.fn(async () => ({ cheng_gong: true })),
  biaoJiSuoYouTongZhiYiDu: vi.fn(async () => undefined),
  guanLiYuanFaSongTongZhi: vi.fn(async () => ({ cheng_gong: true, fa_song_shu: 1 })),
}))

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })) })),
}))

import {
  anYongHuIdQuJiaoSe,
  anYongHuIdJuBeiNengLi,
  guanLiZhiDuMenKong,
  guanLiGaoWeiMenKong,
  qingChuJiaoSeHuanCun,
  解析失效载荷,
} from '../../middleware/管理员'
import { yingSheYongHu } from '../../services/认证'
import { huoQuFanYi } from '../../config/translations'
import { 取管理角色, 取角色能力, 角色具备能力, 管理角色清单, 管理能力清单, 角色能力矩阵, type GuanLiJiaoSe, type GuanLiNengLi } from '../../utils/角色能力'
import guanLiLuYou from '../../routes/管理员'
import haoGanDuLuYou from '../../routes/好感度'
import tongZhiLuYou from '../../routes/通知'

function 建应用(用户编号: string | null): Express {
  const 应用 = express()
  应用.use(express.json())
  应用.use((qingQiu, _xiangYing, 下) => {
    qingQiu.url = decodeURI(qingQiu.url)
    下()
  })
  应用.use((qingQiu, _xiangYing, 下) => {
    if (用户编号) {
      (qingQiu as unknown as { yong_hu?: { yongHuId: string } }).yong_hu = { yongHuId: 用户编号 }
    }
    下()
  })
  应用.use('/api/管理', guanLiLuYou)
  应用.use('/api/好感度', haoGanDuLuYou)
  应用.use('/api/通知', tongZhiLuYou)
  return 应用
}

const 只读端点 = ['/api/管理/用户', '/api/管理/对话', '/api/管理/系统状态', '/api/管理/账号封禁', `/api/好感度/${角色编号}/详情`]
/**
 * FP-17 五位口径的写路由逐条挂位清单（与 恋爱吧管理中心 同源）：
 * gao_we 只留给夺舍/归还/测试账号/授权回收/删号/群发通知；封禁写归 feng_jin、申诉审核归 feng_jin_shen_he。
 * 本表同时被「写路由逐条挂位」静态守卫与逐角色状态码矩阵消费，二者不一致即红灯。
 */
const 写端点清单: Array<{
  方法: 'post' | 'delete'
  路径: string
  注册名: string
  源文件: 'routes/管理员.ts' | 'routes/通知.ts'
  能力位: GuanLiNengLi
  正文?: Record<string, unknown>
}> = [
  { 方法: 'post', 路径: '/api/管理/夺舍/x', 注册名: 'luYou.post(/夺舍/:jiaoSeId', 源文件: 'routes/管理员.ts', 能力位: 'gao_we', 正文: {} },
  { 方法: 'post', 路径: '/api/管理/夺舍/x/心跳', 注册名: 'luYou.post(/夺舍/:jiaoSeId/心跳', 源文件: 'routes/管理员.ts', 能力位: 'gao_we', 正文: {} },
  { 方法: 'post', 路径: '/api/管理/归还/x', 注册名: 'luYou.post(/归还/:jiaoSeId', 源文件: 'routes/管理员.ts', 能力位: 'gao_we', 正文: {} },
  { 方法: 'post', 路径: '/api/管理/测试用户', 注册名: 'luYou.post(/测试用户', 源文件: 'routes/管理员.ts', 能力位: 'gao_we', 正文: {} },
  { 方法: 'post', 路径: '/api/管理/测试用户登录', 注册名: 'luYou.post(/测试用户登录', 源文件: 'routes/管理员.ts', 能力位: 'gao_we', 正文: {} },
  { 方法: 'post', 路径: '/api/管理/授权', 注册名: 'luYou.post(/授权', 源文件: 'routes/管理员.ts', 能力位: 'gao_we', 正文: { yong_hu_id: 平民编号 } },
  { 方法: 'post', 路径: '/api/管理/回收', 注册名: 'luYou.post(/回收', 源文件: 'routes/管理员.ts', 能力位: 'gao_we', 正文: { yong_hu_id: 平民编号 } },
  { 方法: 'delete', 路径: `/api/管理/用户/${平民编号}`, 注册名: 'luYou.delete(/用户/:yongHuId', 源文件: 'routes/管理员.ts', 能力位: 'gao_we' },
  { 方法: 'post', 路径: '/api/管理/账号封禁/解封', 注册名: 'luYou.post(/账号封禁/解封', 源文件: 'routes/管理员.ts', 能力位: 'feng_jin', 正文: { yong_hu_id: 平民编号 } },
  { 方法: 'post', 路径: '/api/管理/申诉/审核', 注册名: 'luYou.post(/申诉/审核', 源文件: 'routes/管理员.ts', 能力位: 'feng_jin_shen_he', 正文: { yong_hu_id: 平民编号, tong_guo: true } },
  { 方法: 'post', 路径: '/api/通知/发送', 注册名: 'luYou.post(/发送', 源文件: 'routes/通知.ts', 能力位: 'gao_we', 正文: { 目标: 'all', 标题: 't', 内容: 'c' } },
]

/** 门禁常量 ↔ 能力位，与 routes/管理员.ts 及 routes/通知.ts 的注册处一一对应 */
const 门禁常量表: Record<GuanLiNengLi, string> = {
  cha_kan: 'guanLiZhiDuMenKong',
  feng_jin: 'guanLiFengJinMenKong',
  feng_jin_shen_he: 'guanLiFengJinShenHeMenKong',
  tong_ji_xie: 'guanLiTongJiMenKong',
  gao_we: 'guanLiGaoWeiMenKong',
}

const 编号到角色名: Record<string, GuanLiJiaoSe | null> = {
  [超管编号]: 'chao_guan',
  [运营编号]: 'yun_ying',
  [审核编号]: 'shen_he_yuan',
  [平民编号]: null,
}

beforeEach(() => {
  语句日志.length = 0
  发布记录.length = 0
  角色查询抛错 = false
  qingChuJiaoSeHuanCun()
})

describe('FP-18 游戏端角色推导（服务端为唯一权威）', () => {
  it.each([
    ['管理员', { 管理员: true, 运营: false, 审核员: false }, 'chao_guan'],
    ['运营', { 管理员: false, 运营: true, 审核员: false }, 'yun_ying'],
    ['审核员', { 管理员: false, 运营: false, 审核员: true }, 'shen_he_yuan'],
    ['全伪', { 管理员: false, 运营: false, 审核员: false }, null],
  ] as Array<[string, 旗标组, string | null]>)('%s 旗标推导为 %s', (_名, 旗标, 期望) => {
    expect(取管理角色(旗标)).toBe(期望)
  })

  it('超管优先于运营/审核员，多旗标账号只出一个角色', () => {
    expect(取管理角色({ 管理员: true, 运营: true, 审核员: true })).toBe('chao_guan')
    expect(取管理角色({ 管理员: false, 运营: true, 审核员: true })).toBe('yun_ying')
  })

  it('非 true 的旗标值（null/字符串 1/缺列）一律不产生角色，fail-closed', () => {
    expect(取管理角色({ 管理员: null, 运营: '1', 审核员: undefined })).toBeNull()
    expect(取管理角色({})).toBeNull()
    expect(取管理角色({ 管理员: 'true' })).toBeNull()
  })

  it('身份映射只回传推导角色与能力，不再有 guan_li_yuan 二值', () => {
    const 结 = yingSheYongHu(用户行(运营编号))
    // FP-17 五位口径：运营 = cha_kan + feng_jin + tong_ji_xie（旧二位模型的 ['cha_kan'] 会静默剥夺封禁/统计位）
    expect(结.jiao_se).toBe('yun_ying')
    expect(结.neng_li).toEqual(['cha_kan', 'feng_jin', 'tong_ji_xie'])
    expect('guan_li_yuan' in 结).toBe(false)
    const 平 = yingSheYongHu(用户行(平民编号))
    expect(平.jiao_se).toBeNull()
    expect(平.neng_li).toEqual([])
  })

  it('身份回传的 neng_li 是角色能力矩阵的逐位投影：三角色各自全量下发，一位不增不减', () => {
    const 旗标组: Record<GuanLiJiaoSe, 旗标组> = {
      chao_guan: { 管理员: true, 运营: false, 审核员: false },
      yun_ying: { 管理员: false, 运营: true, 审核员: false },
      shen_he_yuan: { 管理员: false, 运营: false, 审核员: true },
    }
    for (const 角色 of 管理角色清单) {
      const 结 = yingSheYongHu({ ...用户行(平民编号), ...旗标组[角色] })
      expect(结.jiao_se, 角色).toBe(角色)
      expect(结.neng_li, `角色 ${角色} 的能力下发与矩阵不一致`).toEqual([...角色能力矩阵[角色]])
    }
    expect(yingSheYongHu(用户行(审核编号)).neng_li).toEqual(['cha_kan', 'feng_jin_shen_he'])
  })

  it('行里混入客户端申报的 jiao_se/neng_li 也不参与推导', () => {
    const 结 = yingSheYongHu({ ...用户行(平民编号), jiao_se: 'chao_guan', neng_li: ['cha_kan', 'gao_we'] })
    expect(结.jiao_se).toBeNull()
    expect(结.neng_li).toEqual([])
  })

  it('角色查询只读三旗标列，不读令牌载荷也不读客户端申报', async () => {
    expect(await anYongHuIdQuJiaoSe(审核编号)).toBe('shen_he_yuan')
    const 角色查询 = 语句日志.filter((项) => 项.文本.includes('SELECT "管理员", "运营", "审核员"'))
    expect(角色查询.length).toBe(1)
    expect(角色查询[0].文本).toContain('FROM "用户"')
    expect(角色查询[0].参数).toEqual([审核编号])
  })

  it('同用户二次判定命中缓存不再查库，失效后回查库', async () => {
    expect(await anYongHuIdQuJiaoSe(运营编号)).toBe('yun_ying')
    expect(await anYongHuIdQuJiaoSe(运营编号)).toBe('yun_ying')
    expect(语句日志.filter((项) => 项.文本.includes('SELECT "管理员", "运营", "审核员"')).length).toBe(1)
    qingChuJiaoSeHuanCun(运营编号)
    expect(await anYongHuIdQuJiaoSe(运营编号)).toBe('yun_ying')
    expect(语句日志.filter((项) => 项.文本.includes('SELECT "管理员", "运营", "审核员"')).length).toBe(2)
  })

  it('失效载荷两种键名都能定位目标账号，定位不出即判为全量失效', () => {
    expect(解析失效载荷(JSON.stringify({ yongHuId: 运营编号 }))).toBe(运营编号)
    expect(解析失效载荷(JSON.stringify({ 用户编号: 审核编号 }))).toBe(审核编号)
    expect(解析失效载荷(JSON.stringify({ yongHuId: null, 用户编号: null }))).toBeNull()
    expect(解析失效载荷(JSON.stringify({ other: 1 }))).toBeNull()
    expect(解析失效载荷('fei-JSON')).toBeNull()
    expect(解析失效载荷('')).toBeNull()
  })

  it('按目标账号失效只清该条缓存，全量失效清掉全部（脏缓存不得存活）', async () => {
    const 查询数 = () => 语句日志.filter((项) => 项.文本.includes('SELECT "管理员", "运营", "审核员"')).length
    expect(await anYongHuIdQuJiaoSe(运营编号)).toBe('yun_ying')
    expect(await anYongHuIdQuJiaoSe(审核编号)).toBe('shen_he_yuan')
    expect(查询数()).toBe(2)

    qingChuJiaoSeHuanCun(运营编号)
    expect(await anYongHuIdQuJiaoSe(运营编号)).toBe('yun_ying')
    expect(await anYongHuIdQuJiaoSe(审核编号)).toBe('shen_he_yuan')
    expect(查询数()).toBe(3)

    qingChuJiaoSeHuanCun()
    expect(await anYongHuIdQuJiaoSe(运营编号)).toBe('yun_ying')
    expect(await anYongHuIdQuJiaoSe(审核编号)).toBe('shen_he_yuan')
    expect(查询数()).toBe(5)
  })

  it('失效本地缓存同时向共用频道广播，载荷能被对端解析', async () => {
    qingChuJiaoSeHuanCun(运营编号)
    await new Promise((解) => setTimeout(解, 0))
    const 最近 = 发布记录.at(-1)
    expect(最近?.频道).toBe('guan_li_shi_xiao')
    expect(解析失效载荷(String(最近?.消息))).toBe(运营编号)
    qingChuJiaoSeHuanCun()
    await new Promise((解) => setTimeout(解, 0))
    expect(解析失效载荷(String(发布记录.at(-1)?.消息))).toBeNull()
  })
})

describe('FP-18 能力矩阵与门禁语义', () => {
  it('矩阵角色/能力清单与清单常量逐项一致，无角色无能力', () => {
    expect(Object.keys(角色能力矩阵)).toEqual([...管理角色清单])
    expect([...管理能力清单].slice().sort()).toEqual(
      [...new Set(管理角色清单.flatMap((角色) => [...角色能力矩阵[角色]]))].slice().sort(),
    )
    expect(取角色能力(null)).toEqual([])
    expect(角色具备能力(null, 'cha_kan')).toBe(false)
    expect(角色具备能力('yun_ying', 'gao_we')).toBe(false)
    expect(角色具备能力('chao_guan', 'gao_we')).toBe(true)
  })

  it('未认证访问管理只读与写路由一律 401 且不查库', async () => {
    const 应用 = 建应用(null)
    for (const 路径 of 只读端点) {
      const 响应 = await request(应用).get(路径)
      expect(`${路径}:${响应.status}`).toBe(`${路径}:401`)
    }
    for (const 项 of 写端点清单) {
      const 响应 = await request(应用)[项.方法](项.路径).send(项.正文 ?? {})
      expect(`${项.路径}:${响应.status}`, `未认证写 ${项.路径}`).toBe(`${项.路径}:401`)
    }
    expect(语句日志.some((项) => 项.文本.includes('SELECT "管理员", "运营", "审核员"'))).toBe(false)
  })

  it('无管理身份访问只读与写路由一律 403，错误走翻译文件且不泄漏内部', async () => {
    const 应用 = 建应用(平民编号)
    for (const 路径 of 只读端点) {
      const 响应 = await request(应用).get(路径)
      expect(`${路径}:${响应.status}`, `平民 GET ${路径}`).toBe(`${路径}:403`)
      expect(响应.body.cuo_wu_ma).toBe('WU_GUAN_LI_QUAN_XIAN')
      expect(响应.body.ti_shi).toBe(huoQuFanYi('guanLiYuan', 'wuGuanLiQuanXian'))
      expect(JSON.stringify(响应.body)).not.toMatch(/SELECT|SHU_JU_KU|SQLSTATE|Error:|\bat .*\.ts/)
    }
    for (const 项 of 写端点清单) {
      const 响应 = 项.方法 === 'post'
        ? await request(应用).post(项.路径).send(项.正文 ?? {})
        : await request(应用).delete(项.路径)
      expect(`${项.路径}:${响应.status}`, `平民 POST ${项.路径}`).toBe(`${项.路径}:403`)
      expect(响应.body.cuo_wu_ma).toBe('WU_GUAN_LI_QUAN_XIAN')
      expect(响应.body.ti_shi).toBe(huoQuFanYi('guanLiYuan', 'wuGuanLiQuanXian'))
      expect(JSON.stringify(响应.body)).not.toMatch(/SELECT|SHU_JU_KU|SQLSTATE|Error:|at .*\.ts/ )
    }
  })

  it('逐角色逐写路由的放行/拦下与五位矩阵全等（位不互溢：运营不得审申诉、审核员不得解封）', async () => {
    for (const 编号 of [运营编号, 审核编号]) {
      const 角色 = 编号到角色名[编号] as GuanLiJiaoSe
      const 应用 = 建应用(编号)
      for (const 路径 of 只读端点) {
        const 响应 = await request(应用).get(路径)
        expect(`${路径}:${响应.status}`, `${角色} 读 ${路径}`).toBe(`${路径}:200`)
      }
      for (const 项 of 写端点清单) {
        const 响应 = 项.方法 === 'post'
          ? await request(应用).post(项.路径).send(项.正文 ?? {})
          : await request(应用).delete(项.路径)
        const 应有权限 = 角色具备能力(角色, 项.能力位)
        if (应有权限) {
          expect(`${项.路径}:${响应.status}`, `${角色} 持 ${项.能力位} 却写 ${项.路径} 失败`).not.toBe(`${项.路径}:403`)
        } else {
          expect(`${项.路径}:${响应.status}`, `${角色} 无 ${项.能力位} 却写通了 ${项.路径}`).toBe(`${项.路径}:403`)
          expect(响应.body.cuo_wu_ma).toBe('WU_GUAN_LI_QUAN_XIAN')
        }
      }
    }
    // 矩阵本身的位不互溢，独立于 HTTP 断言再钉一次
    expect(角色具备能力('yun_ying', 'feng_jin')).toBe(true)
    expect(角色具备能力('yun_ying', 'feng_jin_shen_he')).toBe(false)
    expect(角色具备能力('shen_he_yuan', 'feng_jin_shen_he')).toBe(true)
    expect(角色具备能力('shen_he_yuan', 'feng_jin')).toBe(false)
    expect(角色具备能力('shen_he_yuan', 'tong_ji_xie')).toBe(false)
    expect(角色具备能力('yun_ying', 'gao_we')).toBe(false)
  })

  it('超管：只读与全部写路由都不被门禁拦下（缺参由校验层给出非 403）', async () => {
    const 应用 = 建应用(超管编号)
    for (const 路径 of 只读端点) {
      expect((await request(应用).get(路径)).status).toBe(200)
    }
    for (const 项 of 写端点清单) {
      const 响应 = 项.方法 === 'post'
        ? await request(应用).post(项.路径).send(项.正文 ?? {})
        : await request(应用).delete(项.路径)
      expect(`${项.路径}:${响应.status}`, `超管写 ${项.路径}`).not.toBe(`${项.路径}:403`)
    }
  })

  it('令牌载荷伪造超管与请求体申报角色都不生效，授权只看查库结果', async () => {
    const 应用 = 建应用(平民编号)
    const 响应 = await request(应用)
      .get('/api/管理/用户')
      .set('Authorization', 'Bearer fake')
      .send({ jiao_se: 'chao_guan', guan_li_yuan: true, neng_li: ['cha_kan', 'gao_we'] })
    expect(响应.status).toBe(403)
    expect(响应.body.cuo_wu_ma).toBe('WU_GUAN_LI_QUAN_XIAN')
    expect(语句日志.filter((项) => 项.文本.includes('SELECT "管理员", "运营", "审核员"')).length).toBe(1)
  })

  it('门禁不读请求体里的角色申报：同一请求体在超管下放行、平民下拦下', async () => {
    const 正文 = { yong_hu_id: 平民编号, jiao_se: 'chao_guan' }
    expect((await request(建应用(平民编号)).post('/api/管理/授权').send(正文)).status).toBe(403)
    expect((await request(建应用(超管编号)).post('/api/管理/授权').send(正文)).status).not.toBe(403)
  })

  it('查库异常时 500 且只回通用文案，SQLSTATE 与错误文本不外泄', async () => {
    角色查询抛错 = true
    const 应用 = 建应用(超管编号)
    const 响应 = await request(应用).get('/api/管理/用户')
    expect(响应.status).toBe(500)
    expect(响应.body.ti_shi).toBe(huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    expect(JSON.stringify(响应.body)).not.toMatch(/connection refused|SHU_JU_KU_CUO_WU|SELECT/)
  })

  it('能力位判定与门禁同源：只读位对三角色为真、高危位仅超管为真', async () => {
    expect(await anYongHuIdJuBeiNengLi(运营编号, 'cha_kan')).toBe(true)
    expect(await anYongHuIdJuBeiNengLi(运营编号, 'gao_we')).toBe(false)
    expect(await anYongHuIdJuBeiNengLi(超管编号, 'gao_we')).toBe(true)
    expect(await anYongHuIdJuBeiNengLi(平民编号, 'cha_kan')).toBe(false)
  })

  it('门禁中间件把查库角色挂到请求上，供下游复用而不二次推导', async () => {
    let 观察到的角色: unknown = '未执行'
    const 应用 = express()
    应用.use((qingQiu, _x, 下) => {
      (qingQiu as unknown as { yong_hu?: { yongHuId: string } }).yong_hu = { yongHuId: 运营编号 }
      下()
    })
    应用.get('/t', guanLiZhiDuMenKong, (qingQiu, xiangYing) => {
      观察到的角色 = (qingQiu as unknown as { guan_li_jiao_se?: string }).guan_li_jiao_se
      xiangYing.json({ ok: true })
    })
    应用.get('/g', guanLiGaoWeiMenKong, (_qingQiu, xiangYing) => xiangYing.json({ ok: true }))
    expect((await request(应用).get('/t')).status).toBe(200)
    expect(观察到的角色).toBe('yun_ying')
    expect((await request(应用).get('/g')).status).toBe(403)
  })
})

describe('FP-18 同类点穷尽（静态守卫）', () => {
  function 读(相对路径: string): string {
    return readFileSync(resolve(__dirname, '../..', 相对路径), 'utf8')
  }

  function 源文件清单(目录: string): string[] {
    const 结果: string[] = []
    const 遍历 = (当前: string) => {
      for (const 项 of readdirSync(当前, { withFileTypes: true })) {
        const 完整 = resolve(当前, 项.name)
        if (项.isDirectory()) {
          if (项.name === '__tests__' || 项.name === 'node_modules') continue
          遍历(完整)
        } else if (项.name.endsWith('.ts')) {
          结果.push(完整)
        }
      }
    }
    遍历(resolve(__dirname, '../..', 目录))
    return 结果
  }

  it('后端不再出现「管理员列 → 布尔」的二值权限判定与 guan_li_yuan 出参', () => {
    const 命中: string[] = []
    for (const 文件 of 源文件清单('.')) {
      const 源 = readFileSync(文件, 'utf8')
      const 规则: Array<[RegExp, string]> = [
        [/Boolean\([^)]*管理员/, 'Boolean(管理员) 型二值判定'],
        [/guan_li_yuan\s*[?:]/, 'guan_li_yuan 出参/字段'],
        [/是否管理员\s*[?:]/, '是否管理员 出参/字段'],
        [/SELECT\s+"管理员"\s+FROM\s+"用户"/, '只读单列管理员的身份查询'],
        [/\bshiFouGuanLiYuan\b/, '前端式二值管理员变量'],
      ]
      for (const [正则, 说明] of 规则) {
        if (正则.test(源)) 命中.push(`${文件}:${说明}`)
      }
    }
    expect(命中).toEqual([])
  })

  it('管理面每条写路由注册处逐条挂到指定能力门禁，新增未登记写路由即红灯', () => {
    function 解析写路由注册(源: string): Array<{ 注册名: string; 门禁: string | null }> {
      const 结果: Array<{ 注册名: string; 门禁: string | null }> = []
      for (const 前缀 of ['luYou.post(', 'luYou.put(', 'luYou.delete(', 'luYou.patch(']) {
        for (const 块 of 源.split(前缀).slice(1)) {
          const 头部 = 块.slice(0, 200)
          const 路径段 = /^\s*['`]([^'`]+)/.exec(头部)?.[1] ?? ''
          结果.push({
            注册名: `${前缀.slice(0, -1)}(${路径段}`,
            门禁: /['`][^'`]*['`]\s*,\s*(guanLi\w*MenKong)\s*,/.exec(头部)?.[1] ?? null,
          })
        }
      }
      return 结果
    }

    // ① 管理面路由文件的写注册集合必须与登记表完全一致（少一条/多一条都算漂移）
    const 管理面源 = 读('routes/管理员.ts')
    const 管理面注册 = 解析写路由注册(管理面源)
    const 登记 = 写端点清单.filter((项) => 项.源文件 === 'routes/管理员.ts')
    expect(管理面注册.map((项) => 项.注册名).sort()).toEqual(登记.map((项) => 项.注册名).sort())
    expect(管理面注册.length).toBeGreaterThanOrEqual(10)
    // ② 逐条断言挂的是哪一位门禁（不是「挂了任意门禁」，更不是 toContain 型弱化）
    for (const 项 of 登记) {
      const 实际 = 管理面注册.find((注) => 注.注册名 === 项.注册名)
      expect(实际?.门禁, `写路由 ${项.注册名} 未挂能力门禁`).toBe(门禁常量表[项.能力位])
    }
    // ③ 路由级只读门恒在（写门禁叠在它之上）
    expect(管理面源).toContain('luYou.use(guanLiZhiDuMenKong)')
    // ④ 其余管理面文件的写注册点也逐条钉住（该文件内其它写路由为用户自范围操作，不属管理面）
    for (const 项 of 写端点清单.filter((写) => 写.源文件 !== 'routes/管理员.ts')) {
      const 命中 = 解析写路由注册(读(项.源文件)).find((注) => 注.注册名 === 项.注册名)
      expect(命中?.门禁, `写路由 ${项.源文件} ${项.注册名} 未挂 ${门禁常量表[项.能力位]}`).toBe(
        门禁常量表[项.能力位],
      )
    }
    // ⑤ 门禁常量 ↔ 能力位 的绑定由唯一工厂声明，改常量指向的位即红灯
    const 门禁源 = 读('middleware/管理员.ts')
    for (const [能力, 常量] of Object.entries(门禁常量表)) {
      expect(门禁源, `${常量} 未由 创建能力门禁('${能力}') 声明`).toContain(
        `export const ${常量} = 创建能力门禁('${能力}')`,
      )
    }
    expect(Object.keys(门禁常量表).sort()).toEqual([...管理能力清单].sort())
  })

  it('运行时日志流与夺舍族按 gao_we，运营只读数据按 cha_kan', () => {
    expect(读('socket/日志推送.ts')).toContain("anYongHuIdJuBeiNengLi(yongHuId, 'gao_we')")
    expect(读('socket/夺舍.ts')).toContain("anYongHuIdJuBeiNengLi(yongHuId, 'gao_we')")
    expect(读('routes/通知.ts')).toContain('guanLiGaoWeiMenKong')
    expect(读('routes/消息.ts')).toContain('guanLiGaoWeiMenKong')
    expect(读('routes/好感度.ts')).toContain('guanLiZhiDuMenKong')
  })

  it('令牌签发载荷不含角色声明，前端无从按载荷派生授权', () => {
    const 源 = 读('utils/jwt.ts')
    expect(源).not.toMatch(/jiaoSe|guanLi|guan_li_yuan|nengLi/)
  })
})
