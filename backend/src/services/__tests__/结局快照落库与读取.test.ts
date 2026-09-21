import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * FP-07（缺陷4）结算→落库→读取 的端到端口径。用一个内存库把三段串起来，
 * 因为「随机」与「稳定」这对矛盾只能跨这三段才验得出来：
 *   结算抽一次 → 快照进库 → 读取侧（战绩列表/详情、角色归属）只认快照。
 * 手法照抄 结局落库.test.ts / 结局读取.test.ts 的 vi.mock('../../数据库') 形态。
 */

const 用户ID = '11111111-1111-4111-8111-111111111111'

interface 角色行 {
  ID: string
  性别: string
  微信昵称: string
  MBTI: string
  是否渣型: boolean
  封存: boolean
  可继续聊天: boolean
  结局状态: string
  结局文案: string | null
}

const 角色库 = new Map<string, 角色行>()
const 档案库 = new Map<string, Record<string, unknown>>()
const 已写结局 = new Set<string>()
const 语句记录: string[] = []
const 推送列表: Array<{ 名: string; 体: Record<string, unknown> }> = []

let 提供事务连接 = false

function 归一(文本: string): string {
  return 文本.replace(/\s+/g, ' ').trim()
}

/** 合法 UUID 形态：`huoQuJiaoSeXingBie` 会先做 yanZhengUUID 校验，不合法就直接按未知性别渲染。 */
function 造角色ID(序: number): string {
  return `77777777-7777-4777-8777-${String(序).padStart(12, '0')}`
}

function 造档ID(角色ID: string): string {
  return `d-${角色ID}`
}

function 建角色(ID: string, 性别 = '女'): 角色行 {
  const 行: 角色行 = {
    ID,
    性别,
    微信昵称: '小美',
    MBTI: 'ENFP',
    是否渣型: true,
    封存: false,
    可继续聊天: true,
    结局状态: '',
    结局文案: null,
  }
  角色库.set(ID, 行)
  档案库.set(ID, {
    ID: 造档ID(ID),
    用户ID,
    角色ID: ID,
    角色名字: '小美',
    是否渣型: true,
    结果类型: '',
    是否封存: false,
    好感度总分: 12,
    关系阶段: '认识',
    聊天天数: 2,
    消息总数: 9,
    创建时间: '2026-09-01T00:00:00.000Z',
    最后消息时间: null,
    模式: 'putong',
    复盘数据: null,
    复盘内容: null,
  })
  return 行
}

function 战绩行(角色ID: string): Record<string, unknown> {
  const 档 = 档案库.get(角色ID) ?? {}
  const 角 = 角色库.get(角色ID)
  return {
    ...档,
    性别: 角?.性别 ?? null,
    微信昵称: 角?.微信昵称 ?? null,
    MBTI: 角?.MBTI ?? null,
    结局文案: 角?.结局文案 ?? null,
  }
}

async function 处理(文本: string, 参数: unknown[] = []): Promise<{ rows: unknown[]; rowCount: number }> {
  const 文 = 归一(文本)
  if (!文.startsWith('SELECT "性别"')) 语句记录.push(文)

  if (文.includes('SELECT "性别" FROM "角色"')) {
    const 角 = 角色库.get(String(参数[0]))
    return { rows: 角 ? [{ 性别: 角.性别 }] : [], rowCount: 角 ? 1 : 0 }
  }
  if (文.startsWith('UPDATE "角色" SET "封存"')) {
    const 角 = 角色库.get(String(参数[3]))
    if (角) {
      角.封存 = Boolean(参数[0])
      角.可继续聊天 = Boolean(参数[1])
      角.结局状态 = String(参数[2])
    }
    return { rows: [], rowCount: 1 }
  }
  if (文.includes('SET "结局文案"')) {
    const 角 = 角色库.get(String(参数[1]))
    if (角) 角.结局文案 = String(参数[0])
    return { rows: [], rowCount: 1 }
  }
  if (文.includes('INSERT INTO "游戏结局"')) {
    const 键 = `${String(参数[0])}|${String(参数[1])}`
    if (已写结局.has(键)) return { rows: [], rowCount: 0 } // ON CONFLICT DO NOTHING
    已写结局.add(键)
    return { rows: [], rowCount: 1 }
  }
  if (文.includes('INSERT INTO "游戏档案"')) {
    const 档 = 档案库.get(String(参数[1]))
    if (档) {
      档.结果类型 = 参数[4]
      档.是否封存 = 参数[5]
      档.好感度总分 = 参数[6]
      档.关系阶段 = 参数[7]
      档.消息总数 = 参数[8]
    }
    return { rows: [], rowCount: 1 }
  }
  if (文.includes('SELECT "ID" FROM "游戏档案"')) return { rows: [], rowCount: 0 }
  if (文.includes('SELECT "名字"')) {
    const 角 = 角色库.get(String(参数[0]))
    return { rows: 角 ? [{ 名字: 角.微信昵称, 是否渣型: 角.是否渣型 }] : [], rowCount: 角 ? 1 : 0 }
  }
  if (文.includes('SELECT "总分"')) return { rows: [{ 总分: 12, 关系阶段: '认识' }], rowCount: 1 }
  if (文.includes('COUNT(*)')) return { rows: [{ shu: 9 }], rowCount: 1 }
  if (文.includes('FROM "游戏档案" d')) {
    if (文.includes('d."ID" = $1')) {
      const 档 = [...档案库.values()].find((项) => String(项.ID) === String(参数[0]))
      return { rows: 档 ? [战绩行(String(档.角色ID))] : [], rowCount: 档 ? 1 : 0 }
    }
    const 行 = [...档案库.values()]
      .filter((项) => String(项.用户ID) === String(参数[0]))
      .map((项) => 战绩行(String(项.角色ID)))
    return { rows: 行, rowCount: 行.length }
  }
  if (文.startsWith('SELECT "用户ID", "封存"')) {
    const 角 = 角色库.get(String(参数[0]))
    if (!角) return { rows: [], rowCount: 0 }
    return {
      rows: [
        {
          用户ID: 用户ID,
          封存: 角.封存,
          可继续聊天: 角.可继续聊天,
          结局状态: 角.结局状态,
          是否渣型: 角.是否渣型,
          性别: 角.性别,
          结局文案: 角.结局文案,
        },
      ],
      rowCount: 1,
    }
  }
  return { rows: [], rowCount: 0 }
}

vi.mock('../../数据库', () => ({
  数据库: {
    query: (文本: string, 参数?: unknown[]) => 处理(文本, 参数),
    get connect() {
      if (!提供事务连接) return undefined
      return async () => ({
        query: (文本: string, 参数?: unknown[]) => 处理(文本, 参数),
        release: () => undefined,
      })
    },
  },
}))

vi.mock('../../redis', () => ({ redis: { set: vi.fn(), del: vi.fn() } }))
vi.mock('../../socket/io', () => ({
  huoQuIo: () => ({
    to: () => ({ emit: (名: string, 体: Record<string, unknown>) => 推送列表.push({ 名, 体 }) }),
  }),
}))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: vi.fn() }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))
vi.mock('../../config/AI参数策略', () => ({ gouJianJiaoSeShangXiaWen: vi.fn() }))
vi.mock('../AI视觉辅助', () => ({
  gouJianDanTiaoTuXiangKuai: vi.fn(),
  meiTiZhanShiWenBen: vi.fn(),
  shiTuXiangLeiBie: vi.fn(),
}))
vi.mock('../AI输入准备', () => ({ baoCunJiaoSeXiaoXi: vi.fn() }))
vi.mock('../好感度', () => ({ gengXinHaoGanDu: vi.fn(), huoQuWanZhengHaoGanDu: vi.fn() }))
vi.mock('../挑战积分', () => ({ jieSuanTiaoZhanDuiJu: vi.fn() }))
vi.mock('../Prompt构建器', () => ({ baoZhuangYongHuNeiRong: (值: string) => 值 }))
vi.mock('../复盘', () => ({ shengChengFuPan: vi.fn() }))
vi.mock('../军师缓存', () => ({ huoQuJunShiJiLuLieBiao: async () => [] }))
vi.mock('../媒体存储', () => ({ shengChengQianMingURL: () => null }))

import { chuLiYouXiJieShu } from '../胜利失败条件'
import { huoQuDangAnLieBiao, huoQuDangAnXiangQing } from '../战绩'
import { huoQuJiaoSeSuoYouZhe } from '../消息'
import { 结局枚举列表, 结局趣味文案池 } from '../../utils/结局'
import type { YouXiJieGuoLeiXing } from '../../types'

const 快照写入语句 = 'UPDATE "角色" SET "结局文案" = $1 WHERE "ID" = $2'

function 最近推送(): Record<string, unknown> {
  const 条 = 推送列表[推送列表.length - 1]
  if (!条) throw new Error('结算未推送任何 socket 事件')
  return 条.体
}

function 快照已写入(角色ID: string): string | null {
  return 角色库.get(角色ID)?.结局文案 ?? null
}

beforeEach(() => {
  角色库.clear()
  档案库.clear()
  已写结局.clear()
  语句记录.length = 0
  推送列表.length = 0
  提供事务连接 = false
})

describe('结算抽取的趣味文案落库为快照', () => {
  it('抽中句同时进 socket 与 角色.结局文案，且必属本结局的池子', async () => {
    const ID = 造角色ID(1)
    建角色(ID, '女')
    const 结果 = await chuLiYouXiJieShu(用户ID, ID, 'shi_bai_bei_qi_pian')

    expect(结局趣味文案池('shi_bai_bei_qi_pian', '女')).toContain(结果.jie_guo_wen_an)
    expect(结果.jie_guo_wen_an).not.toContain('{TA}')
    expect(角色库.get(ID)?.结局文案).toBe(结果.jie_guo_wen_an)
    expect(最近推送().jie_guo_wen_an).toBe(结果.jie_guo_wen_an)
    expect(语句记录.filter((项) => 项 === 快照写入语句)).toHaveLength(1)
    // 既有契约一字未改：标签文案仍是确定性性别变体
    expect(结果.zhuang_tai_wen_ben).toBe('被渣女骗了')
    expect(最近推送().xiao_xi).toBe('被渣女骗了')
  })

  it('事务分支同样写入快照，且结局状态与快照成对落库', async () => {
    提供事务连接 = true
    const ID = 造角色ID(2)
    建角色(ID, '男')
    const 结果 = await chuLiYouXiJieShu(用户ID, ID, 'shi_bai_bei_qi_pian')
    expect(角色库.get(ID)?.结局文案).toBe(结果.jie_guo_wen_an)
    expect(角色库.get(ID)?.结局状态).toBe('shi_bai_bei_qi_pian')
    expect(语句记录.filter((项) => 项 === 快照写入语句)).toHaveLength(1)
  })

  it('同一角色二次结算时快照随最新结局一起改写', async () => {
    const ID = 造角色ID(21)
    建角色(ID, '女')
    await chuLiYouXiJieShu(用户ID, ID, 'sheng_li_ai_qing')
    const 第二次 = await chuLiYouXiJieShu(用户ID, ID, 'shi_bai_hao_gan_du_gui_ling')
    expect(角色库.get(ID)?.结局状态).toBe('shi_bai_hao_gan_du_gui_ling')
    expect(角色库.get(ID)?.结局文案).toBe(第二次.jie_guo_wen_an)
    expect(结局趣味文案池('shi_bai_hao_gan_du_gui_ling', '女')).toContain(第二次.jie_guo_wen_an)
  })
})

describe('同一局重复读取文案恒定不变（快照生效）', () => {
  it('列表/详情/角色归属三处读 10 次全部等于抽中的那一句', async () => {
    const ID = 造角色ID(4)
    建角色(ID, '女')
    const 结算 = await chuLiYouXiJieShu(用户ID, ID, 'shi_bai_bei_qi_pian')
    const 快照 = 结算.jie_guo_wen_an

    for (let 次 = 0; 次 < 10; 次 += 1) {
      const [列表项] = await huoQuDangAnLieBiao(用户ID)
      expect(列表项?.jie_guo_lei_xing).toBe(快照)
      expect(列表项?.jie_guo_lei_xing_yuan).toBe('shi_bai_bei_qi_pian')
      const 详情 = await huoQuDangAnXiangQing(用户ID, 造档ID(ID))
      expect(详情?.jie_guo_lei_xing).toBe(快照)
      const 归属 = await huoQuJiaoSeSuoYouZhe(ID)
      expect(归属?.jie_ju_zhuang_tai).toBe(快照)
    }
  })
})

describe('多局文案分布确实随机', () => {
  it('同一结局结算 20 局，抽中句 ≥3 种且每局各自入库', async () => {
    const 集 = new Set<string>()
    for (let 序 = 0; 序 < 20; 序 += 1) {
      const ID = 造角色ID(100 + 序)
      建角色(ID, '女')
      const 结算 = await chuLiYouXiJieShu(用户ID, ID, 'shi_bai_bei_qi_pian')
      集.add(结算.jie_guo_wen_an)
      expect(快照已写入(ID)).toBe(结算.jie_guo_wen_an)
    }
    expect(集.size).toBeGreaterThanOrEqual(3)
    for (const 句 of 集) expect(结局趣味文案池('shi_bai_bei_qi_pian', '女')).toContain(句)
  })
})

describe('快照缺失的历史记录回退确定性渲染', () => {
  it('无快照旧行连读 10 次恒定等于标签文案，不随机', async () => {
    const ID = 造角色ID(5)
    建角色(ID, '女')
    // 趣味文案上线前的旧数据：结局状态有值、结局文案为 NULL，且从未走过结算
    const 角 = 建角色后写入(ID)
    expect(角.结局文案).toBeNull()

    for (let 次 = 0; 次 < 10; 次 += 1) {
      const [列表项] = await huoQuDangAnLieBiao(用户ID)
      expect(列表项?.jie_guo_lei_xing).toBe('被渣女骗了')
      const 详情 = await huoQuDangAnXiangQing(用户ID, 造档ID(ID))
      expect(详情?.jie_guo_lei_xing).toBe('被渣女骗了')
      const 归属 = await huoQuJiaoSeSuoYouZhe(ID)
      expect(归属?.jie_ju_zhuang_tai).toBe('被渣女骗了')
    }
  })
})

describe('通关/失败分类由服务端单一下发', () => {
  it('sheng_li_shen_jing_bing 结算为通关而非失败', async () => {
    const ID = 造角色ID(6)
    建角色(ID, '女')
    const 结算 = await chuLiYouXiJieShu(用户ID, ID, 'sheng_li_shen_jing_bing')
    expect(结算.shi_fou_tong_guan).toBe(true)
    expect(最近推送().shi_fou_tong_guan).toBe(true)
    expect(结局趣味文案池('sheng_li_shen_jing_bing', '女')).toContain(结算.jie_guo_wen_an)
  })

  it('14 个结局键全部有池、分类逐键与池子分组一致', async () => {
    const 通关键: YouXiJieGuoLeiXing[] = []
    const 失败键: YouXiJieGuoLeiXing[] = []
    let 序 = 500
    for (const 枚举 of 结局枚举列表) {
      const ID = 造角色ID(序)
      序 += 1
      建角色(ID, '女')
      const 结算 = await chuLiYouXiJieShu(用户ID, ID, 枚举)
      if (结算.shi_fou_tong_guan) 通关键.push(枚举)
      else 失败键.push(枚举)
      expect(结算.jie_guo_wen_an.length, `${枚举} 抽到了空句`).toBeGreaterThan(0)
      expect(结局趣味文案池(枚举, '女').length, `${枚举} 无池`).toBeGreaterThanOrEqual(3)
      expect(最近推送().shi_fou_tong_guan).toBe(结算.shi_fou_tong_guan)
    }
    expect([...通关键].sort()).toEqual(
      ['sheng_li_ai_qing', 'sheng_li_hu_shan_sheng_li', 'sheng_li_shen_jing_bing', 'sheng_li_shi_po'].sort(),
    )
    expect(失败键).toHaveLength(10)
    expect(失败键.some((键) => 键.startsWith('sheng_li'))).toBe(false)
  })
})

/** 造一条「结局状态有值但结局文案为 NULL」的旧数据行（不经结算路径）。 */
function 建角色后写入(ID: string): 角色行 {
  const 行 = 建角色(ID, '女')
  行.结局状态 = 'shi_bai_bei_qi_pian'
  行.结局文案 = null
  行.封存 = true
  行.可继续聊天 = false
  const 档 = 档案库.get(ID)
  if (档) {
    档.结果类型 = 'shi_bai_bei_qi_pian'
    档.是否封存 = true
  }
  return 行
}
