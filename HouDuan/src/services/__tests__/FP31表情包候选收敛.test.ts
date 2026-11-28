import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 语义候选Mock = vi.hoisted(() => vi.fn())

const 取全部启用Mock = vi.hoisted(() => vi.fn())

const 数据库QueryMock = vi.hoisted(() => vi.fn())

const 生成向量Mock = vi.hoisted(() => vi.fn())

const 真实现持有 = vi.hoisted(() => ({ 语义候选: null as null | ((canShu: unknown) => Promise<unknown>) }))

vi.mock('../语义表情检索', async () => {
  const 真实现 = await vi.importActual<typeof import('../语义表情检索')>('../语义表情检索')
  真实现持有.语义候选 = 真实现.语义候选 as unknown as (canShu: unknown) => Promise<unknown>
  return {
    ...真实现,
    语义候选: (...canShu: unknown[]) => 语义候选Mock(...canShu),
  }
})

vi.mock('../表情包库', () => ({
  取全部启用: (...canShu: unknown[]) => 取全部启用Mock(...canShu),
  按短名查: vi.fn(async () => null),
  短名转UUID: vi.fn((duanMing: string) => `uuid-${duanMing}`),
  候选系统表情: vi.fn(async () => []),
}))

vi.mock('../../数据库', () => ({
  数据库: {
    query: (...canShu: unknown[]) => 数据库QueryMock(...canShu),
    connect: vi.fn(async () => ({ query: vi.fn(), release: vi.fn() })),
  },
}))

vi.mock('../../嵌入服务', () => ({
  生成向量: (...canShu: unknown[]) => 生成向量Mock(...canShu),
  重置向量缓存: vi.fn(),
}))

import { 候选包装, 组装表情候选块, type XiTongBiaoQingXiang } from '../表情包选取'
import { type 语义候选参数 } from '../语义表情检索'
import { BiaoQingBaoYunXing, BiaoQingHouXuanWenAn, BiaoQingMiDu } from '../../config/表情包配置'
import type { BiaoQingZaiTiJueCe } from '../表情包载体'
import type { 表情包条目 } from '../表情包库'

function zaoXiang(xuHao: number, gengDuo: Partial<XiTongBiaoQingXiang> = {}): XiTongBiaoQingXiang {
  return {
    id: `uuid-${xuHao}`,
    duanMing: `候选${xuHao}`,
    miaoShu: `第${xuHao}张图的画面描述，用来占位的描述文本`,
    qingXuBiaoQian: '好笑',
    shiYongChangJing: '接梗',
    sha256: String(xuHao).padStart(64, 'a'),
    mime: 'image/png',
    ...gengDuo,
  }
}

function zaoKuTiaoMu(xuHao: number, gengDuo: Partial<表情包条目> = {}): 表情包条目 {
  return {
    duanMing: `候选${xuHao}`,
    miaoShu: `第${xuHao}张图的画面描述`,
    qingXuBiaoQian: '好笑',
    shiYongChangJing: '接梗',
    qiYong: true,
    sha256: String(xuHao).padStart(64, 'b'),
    mime: 'image/png',
    ziJieShu: 1024,
    wenJianMing: `候选${xuHao}.png`,
    wenJianLuJing: `/tmp/候选${xuHao}.png`,
    ...gengDuo,
  }
}

function zaoJueCe(gengDuo: Partial<BiaoQingZaiTiJueCe> = {}): BiaoQingZaiTiJueCe {
  return {
    geiHouXuan: true,
    yuanYin: '放行',
    yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
    guanXiJieDuanXuHao: 6,
    nianLingDang: '青年',
    qiWangJianGeLunShu: 20,
    shangCiFaTuLunShu: null,
    quXiang: '正常',
    renSheQiZhi: ['通用'],
    yong_hu_xin_xiao_xi: '今天有点好笑',
    faTuQuanZhong: 0.8,
    gangFaGuoTu: false,
    ...gengDuo,
  }
}

function yiWeiXiangLiang(): number[] {
  const lie = new Array<number>(512).fill(0)
  lie[0] = 1
  return lie
}

beforeEach(() => {
  语义候选Mock.mockReset()
  取全部启用Mock.mockReset()
  取全部启用Mock.mockResolvedValue([])
  数据库QueryMock.mockReset()
  数据库QueryMock.mockResolvedValue({ rows: [] })
  生成向量Mock.mockReset()
  生成向量Mock.mockResolvedValue([yiWeiXiangLiang()])
})

describe('候选条数收敛到 5', () => {
  it('运行配置的候选条数是 5', () => {
    expect(BiaoQingBaoYunXing.houXuanShuLiang).toBe(5)
  })

  it('传入 10 条候选时输出最多 5 行候选', () => {
    const shiTiao = Array.from({ length: 10 }, (_, xuHao) => zaoXiang(xuHao + 1))
    const kuai = 组装表情候选块(shiTiao, 0.8)
    const hangShu = kuai.split('\n').filter((hang) => hang.startsWith('- ')).length
    expect(hangShu).toBeLessThanOrEqual(5)
    expect(hangShu).toBe(5)
  })

  it('语义检索返回 28 条时包装结果被截到 5 条', async () => {
    语义候选Mock.mockResolvedValue(
      Array.from({ length: 28 }, (_, xuHao) => zaoKuTiaoMu(xuHao + 1)),
    )
    const lieBiao = await 候选包装('好笑', 5, zaoJueCe())
    expect(lieBiao.length).toBeLessThanOrEqual(5)
    expect(lieBiao).toHaveLength(5)
    expect(lieBiao.map((xiang) => xiang.duanMing)).toEqual(['候选1', '候选2', '候选3', '候选4', '候选5'])
  })

  it('语义检索返回 28 条但要求 5 条时不会把 28 条全塞进候选块', async () => {
    语义候选Mock.mockResolvedValue(
      Array.from({ length: 28 }, (_, xuHao) => zaoKuTiaoMu(xuHao + 1)),
    )
    const lieBiao = await 候选包装('好笑', BiaoQingBaoYunXing.houXuanShuLiang, zaoJueCe())
    const kuai = 组装表情候选块(lieBiao, 0.8)
    const hangShu = kuai.split('\n').filter((hang) => hang.startsWith('- ')).length
    expect(hangShu).toBeLessThanOrEqual(5)
  })
})

describe('候选行字段精简', () => {
  it('候选行只保留短名与场景，不含描述与情绪', () => {
    const kuai = 组装表情候选块([zaoXiang(1)], 0.8)
    const hang = kuai.split('\n').filter((x) => x.startsWith('- '))
    expect(hang).toHaveLength(1)
    expect(hang[0]).toContain('[表情包:候选1]')
    expect(hang[0]).toContain('场景:接梗')
    expect(hang[0]).not.toContain('描述:')
    expect(hang[0]).not.toContain('情绪:')
    expect(kuai).not.toContain('描述:')
    expect(kuai).not.toContain('情绪:')
  })

  it('场景为空时用通用兜底，且仍不出现描述与情绪字段', () => {
    const kuai = 组装表情候选块([zaoXiang(1, { shiYongChangJing: '', miaoShu: '', qingXuBiaoQian: '' })], 0.8)
    const hang = kuai.split('\n').filter((x) => x.startsWith('- '))
    expect(hang[0]).toContain('场景:通用')
    expect(hang[0]).not.toContain('描述:')
    expect(hang[0]).not.toContain('情绪:')
  })

  it('候选行模板本身只有短名与场景两个占位', () => {
    expect(BiaoQingHouXuanWenAn.hangMoBan).toBe('- {biao_qing_bao_shi_li} 场景:{chang_jing}')
    expect(BiaoQingHouXuanWenAn.hangMoBan).not.toContain('miao_shu')
    expect(BiaoQingHouXuanWenAn.hangMoBan).not.toContain('qing_xu')
  })
})

describe('候选块整体字数收敛', () => {
  it('5 条候选的完整候选块少于 400 字', () => {
    const wuTiao = Array.from({ length: 5 }, (_, xuHao) => zaoXiang(xuHao + 1))
    const kuai = 组装表情候选块(wuTiao, 0.8)
    expect(kuai.length).toBeLessThan(400)
  })

  it('说明只剩一条格式说明，发图规则只剩三条', () => {
    expect(BiaoQingHouXuanWenAn.daiTiShuoMing).toHaveLength(1)
    const kuai = 组装表情候选块([zaoXiang(1), zaoXiang(2)], 0.8)
    expect(kuai).toContain('照抄 `[表情包:短名]`')
    expect(kuai.split('\n').filter((hang) => hang.includes('→')).length).toBeGreaterThanOrEqual(2)
  })
})

describe('刚发过图的惩罚系数', () => {
  it('密度配置里刚发过图的系数是 0.55', () => {
    expect(BiaoQingMiDu.gangFaGuoTuCheng).toBe(0.55)
  })
})

describe('语义检索不再放大候选量', () => {
  it('语义表情检索源码不含 + 20 这类放大写法', () => {
    const yuanMa = readFileSync(resolve(__dirname, '..', '语义表情检索.ts'), 'utf8')
    expect(yuanMa).not.toContain('+ 20')
    expect(yuanMa).not.toContain('+20')
  })

  it('SQL 的 LIMIT 参数就是请求条数，本地路径同样按请求条数截断', async () => {
    const canShu: 语义候选参数 = {
      query: '好笑的事',
      yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
      guanXiJieDuanXuHao: 2,
      renSheQiZhi: ['沙雕搞怪'],
      excludeDuanMing: [],
      shuLiang: 5,
    }
    await 真实现持有.语义候选?.(canShu)
    expect(数据库QueryMock).toHaveBeenCalledTimes(1)
    const [sql, chuanCan] = 数据库QueryMock.mock.calls[0] as [string, unknown[]]
    expect(sql).toContain('LIMIT $3::int')
    expect(chuanCan[2]).toBe(5)
    const yuanMa = readFileSync(resolve(__dirname, '..', '语义表情检索.ts'), 'utf8')
    expect(yuanMa).toContain('.slice(0, params.shuLiang)')
  })

  it('SQL 同时带上关系阶段、人设气质、圈层门槛三个过滤条件', async () => {
    const canShu: 语义候选参数 = {
      query: '好笑的事',
      yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
      guanXiJieDuanXuHao: 2,
      renSheQiZhi: ['沙雕搞怪'],
      excludeDuanMing: [],
      shuLiang: 5,
    }
    await 真实现持有.语义候选?.(canShu)
    const [sql, chuanCan] = 数据库QueryMock.mock.calls[0] as [string, unknown[]]
    const piPei = sql.match(/"检索文本" ~ /g) ?? []
    expect(piPei).toHaveLength(3)
    expect(chuanCan).toHaveLength(6)
    const tiaoJian = chuanCan.slice(3).map((xiang) => String(xiang)).join('\n')
    expect(tiaoJian).toContain('深爱')
    expect(tiaoJian).toContain('可爱萌系')
    expect(tiaoJian).toContain('深度梗')
  })

  it('关系阶段不够且带门槛的条目被本地检索挡掉', async () => {
    数据库QueryMock.mockRejectedValue(new Error('数据库不可用'))
    取全部启用Mock.mockResolvedValue([zaoKuTiaoMu(1, { guanXiJieDuanXiaXian: 9 })])
    生成向量Mock.mockResolvedValue([yiWeiXiangLiang(), yiWeiXiangLiang()])
    const jieGuo = await 真实现持有.语义候选?.({
      query: '好笑的事',
      yunXuFengGe: ['黄脸', '祝福', '日常', '梗图'],
      guanXiJieDuanXuHao: 0,
      renSheQiZhi: ['通用'],
      excludeDuanMing: [],
      shuLiang: 5,
    })
    expect(jieGuo).toEqual([])
  })
})
