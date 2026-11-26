import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AI配置 } from '../../config/AI配置'

const { 查询, 调用模型, redisSet, redisDel, 日志info } = vi.hoisted(() => ({
  查询: vi.fn(),
  调用模型: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(async () => 1),
  日志info: vi.fn(),
}))

vi.mock('../../数据库', () => ({ 数据库: { query: 查询 } }))
vi.mock('../../redis', () => ({
  redis: {
    set: redisSet,
    del: redisDel,
  },
}))
vi.mock('../../utils/通用模型调用', () => ({ 按配置调用: 调用模型 }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: {
    info: 日志info,
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  duQuDuiHuaZhaiYao,
  duQuTongBuZhaiYao,
  gouJianJiYiZhaiYaoPrompt,
  gouJianZhaiYaoZhuRuWenBen,
  huanCunTongBuZhaiYao,
  qingLiTongBuZhaiYao,
  qieDuanZhaiYao,
  shengChengBingLuoKuZhaiYao,
  ZhaiYaoLuoKuYuJu,
  ZhaiYaoYuanLiaoGuoLvYuJu,
  type DuiHuaZhaiYaoJiLu,
} from '../对话摘要'
import { debug日志 } from '../../utils/debug日志'
import type { Mock } from 'vitest'

const 日志Mock = vi.mocked(debug日志, true) as { info: Mock; warn: Mock; error: Mock; debug: Mock }
const 日志信息Mock = vi.mocked(debug日志.info) as Mock

const YongHu = '11111111-1111-4111-8111-111111111111'
const JiaoSe = '22222222-2222-4222-8222-222222222222'
const MaoDian = '2026-10-01T08:00:00.000Z'

function zhaiJian(yongHu: string, jiaoSe: string): string {
  return `dui_hua_zhai_yao_sheng_cheng_zhong:${yongHu}:${jiaoSe}`
}

function duHui(hang?: Record<string, unknown>) {
  return 查询.mockImplementationOnce(async () => ({ rows: hang ? [hang] : [] }))
}

function zhaiYaoHang(neiRong: string, maoDian: unknown, xiaoXiId?: string | null, gaiKuo = 1): Record<string, unknown> {
  return { 摘要内容: neiRong, 概括消息数: gaiKuo, 素材锚点时间: maoDian, 素材锚点消息ID: xiaoXiId }
}

function shuHui(shu: number) {
  return 查询.mockImplementationOnce(async () => ({ rows: [{ dai_shu: shu }] }))
}

function ziFuHui(ziFu: number) {
  return 查询.mockImplementationOnce(async () => ({ rows: [{ zi_fu_shu: ziFu }] }))
}

function bianHao(xuHao: number): string {
  return `00000000-0000-4000-8000-${String(xuHao).padStart(12, '0')}`
}

function liaoHui(lieBiao: Array<{ ID?: string; 内容: string; 发送者: string; 创建时间: Date | string }>) {
  return 查询.mockImplementationOnce(async () => ({
    rows: lieBiao.map((hang, xuHao) => ({ ...hang, ID: hang.ID ?? bianHao(xuHao + 1) })).reverse(),
  }))
}

function zhaiYao(neiRong = '旧记忆', maoDian: string | null = null): DuiHuaZhaiYaoJiLu {
  return { zhaiYaoNeiRong: neiRong, gaiKuoXiaoXiShu: 10, gengXinShiJian: MaoDian, suCaiMaoDian: maoDian, xiaoXiId: null }
}

beforeEach(() => {
  查询.mockReset()
  调用模型.mockReset()
  redisSet.mockReset()
  redisDel.mockReset()
  日志Mock.info.mockReset()
  redisDel.mockImplementation(async () => 1)
  redisSet.mockImplementation(async () => 'OK')
  qingLiTongBuZhaiYao()
  vi.clearAllMocks()
})

describe('读取持久摘要', () => {
  it('返回摘要内容、累计消息数、更新时间与素材锚点', async () => {
    duHui({
      摘要内容: ' 他下周三要去出差 ',
      概括消息数: '42',
      更新时间: new Date('2026-11-02T01:00:00.000Z'),
      素材锚点时间: new Date(MaoDian),
    })

    const jieGuo = await duQuDuiHuaZhaiYao(YongHu, JiaoSe)

    expect(jieGuo).toEqual({
      zhaiYaoNeiRong: '他下周三要去出差',
      gaiKuoXiaoXiShu: 42,
      gengXinShiJian: '2026-11-02T01:00:00.000Z',
      suCaiMaoDian: MaoDian,
      xiaoXiId: null,
    })
    expect(查询.mock.calls[0][1]).toEqual([YongHu, JiaoSe])
    expect(String(查询.mock.calls[0][0])).not.toMatch(/DISTINCT|GROUP BY/)
    expect(String(查询.mock.calls[0][0])).toContain('"素材锚点消息ID"')
  })

  it('带新ID列的锚点返回复合游标，旧纯时间或无ID JSON仍返回纯时间', async () => {
    const m1 = bianHao(1)
    duHui(zhaiYaoHang('带ID的旧摘要', MaoDian, m1))
    const jieGuo = await duQuDuiHuaZhaiYao(YongHu, JiaoSe)
    expect(jieGuo?.suCaiMaoDian).toBe(MaoDian)
    expect(jieGuo?.xiaoXiId).toBe(m1)

    duHui(zhaiYaoHang('旧ISO摘要', MaoDian, null))
    expect(await duQuDuiHuaZhaiYao(YongHu, JiaoSe)).toMatchObject({ suCaiMaoDian: MaoDian, xiaoXiId: null })
    duHui(zhaiYaoHang('坏锚点摘要', '不是时间', null))
    expect(await duQuDuiHuaZhaiYao(YongHu, JiaoSe)).toMatchObject({ suCaiMaoDian: null, xiaoXiId: null })
    duHui(zhaiYaoHang('无ID对象摘要', JSON.stringify({ shiJian: MaoDian }), null))
    expect(await duQuDuiHuaZhaiYao(YongHu, JiaoSe)).toMatchObject({ suCaiMaoDian: MaoDian, xiaoXiId: null })
  })

  it('没有行、空正文或空参数都降级为 null', async () => {
    duHui()
    expect(await duQuDuiHuaZhaiYao(YongHu, JiaoSe)).toBeNull()
    duHui({ 摘要内容: '   ' })
    expect(await duQuDuiHuaZhaiYao(YongHu, JiaoSe)).toBeNull()
    expect(await duQuDuiHuaZhaiYao('', JiaoSe)).toBeNull()
    expect(查询).toHaveBeenCalledTimes(2)
  })

  it('空锚点保持 null，计数与时间异常不抛错', async () => {
    duHui({ 摘要内容: '记得他不吃香菜', 概括消息数: -5, 更新时间: '坏日期', 素材锚点时间: null })

    expect(await duQuDuiHuaZhaiYao(YongHu, JiaoSe)).toEqual({
      zhaiYaoNeiRong: '记得他不吃香菜',
      gaiKuoXiaoXiShu: 0,
      gengXinShiJian: null,
      suCaiMaoDian: null,
      xiaoXiId: null,
    })
  })
})

describe('注入文本与截断', () => {
  it('有摘要时才含防错用声明与正文', () => {
    const wenBen = gouJianZhaiYaoZhuRuWenBen(zhaiYao(' 记得我怕打雷 '))

    expect(wenBen).toContain('记得我怕打雷')
    expect(wenBen).toContain('【此前记住的】')
    expect(wenBen).toContain('数据')
    expect(wenBen).not.toContain('zhaiYaoNeiRong')
    expect(wenBen.trim().endsWith('记得我怕打雷')).toBe(true)
  })

  it('注入内容为 null 或空白都不建立伪记忆', () => {
    expect(gouJianZhaiYaoZhuRuWenBen(null)).toBe('')
    expect(gouJianZhaiYaoZhuRuWenBen({ ...zhaiYao(), zhaiYaoNeiRong: '  ' })).toBe('')
  })
})

describe('摘要正文长度', () => {
  it('超长按完整行裁剪，单行超长才按字符截断且不切代理对', () => {
    const zuiDa = AI配置.zhaiYao.zuiDaZiFu

    expect(qieDuanZhaiYao('不止'.repeat(Math.floor(zuiDa / 2)))).toBe('不止'.repeat(Math.floor(zuiDa / 2)))
    const zheng = qieDuanZhaiYao(`${'前'.repeat(zuiDa - 2)}\n${'后'.repeat(20)}`)
    expect(zheng.length).toBeLessThanOrEqual(zuiDa)
    expect(zheng).toBe('前'.repeat(zuiDa - 2))
    const danHang = qieDuanZhaiYao('😀'.repeat(zuiDa + 1))
    expect(Array.from(danHang)).toHaveLength(zuiDa)
    expect(danHang.endsWith('😀')).toBe(true)
    expect(qieDuanZhaiYao(' \n ')).toBe('')
  })

  it('读取异常记逻辑日志且降级为 null，不打印聊天内容、SQL与凭据', async () => {
    查询.mockRejectedValueOnce(new Error('relation 对话摘要 missing; secret-user-chat'))

    expect(await duQuDuiHuaZhaiYao(YongHu, JiaoSe)).toBeNull()
    const riZhi = JSON.stringify(vi.mocked(debug日志.warn).mock.calls)
    expect(vi.mocked(debug日志.warn)).toHaveBeenCalled()
    expect(riZhi).not.toContain('secret-user-chat')
    expect(riZhi).not.toContain('SELECT')
    expect(riZhi).not.toContain('lianaiba')
  })
})

describe('生成摘要触发门槛', () => {
  it('锚点后的新纯文字 token 不足阈值时不调模型不写库', async () => {
    duHui()
    shuHui(40)
    ziFuHui(Math.floor((AI配置.zhaiYao.yaSuoTokenYuZhi - 1) / 0.6))

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)

    expect(调用模型).not.toHaveBeenCalled()
    expect(查询).toHaveBeenCalledTimes(3)
    expect(String(查询.mock.calls[1][0])).toContain('COUNT(*)')
    expect(查询.mock.calls[1][1]).toEqual([YongHu, JiaoSe, null, ['neiXinHuoDong'], null])
    expect(String(查询.mock.calls[2][0])).toContain('SUM(CHAR_LENGTH')
    expect(查询.mock.calls[2][1]).toEqual([YongHu, JiaoSe, null, ['neiXinHuoDong'], null])
    expect(String(查询.mock.calls[1][0])).toContain('已撤回')
    expect(String(查询.mock.calls[1][0])).toContain("'wenben'")
    expect(String(查询.mock.calls[1][0])).toContain("'wenBen'")
    expect(String(查询.mock.calls[1][0])).toContain('ALL($4::varchar[])')
    expect(String(查询.mock.calls[1][0])).not.toMatch(/MIN\(|OFFSET\s/)
    expect(redisSet).toHaveBeenCalledWith(zhaiJian(YongHu, JiaoSe), '1', 'EX', AI配置.zhaiYao.suoTtlMiao, 'NX')
  })

  it('估算 token 恰好达到压缩阈值时触发生成', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      duHui()
      shuHui(2)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([
        { 内容: '早期素材'.repeat(400), 发送者: 'yonghu', 创建时间: new Date(Date.UTC(2026, 9, 2, 10, 0)) },
        { 内容: '累积到阈值的原文', 发送者: 'yonghu', 创建时间: new Date(Date.UTC(2026, 9, 2, 10, 1)) },
      ])
      调用模型.mockResolvedValueOnce({ neiRong: '阈值记忆' })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
      expect(调用模型).toHaveBeenCalledTimes(1)
      expect(String(查询.mock.calls[2][0])).toContain('SUM(CHAR_LENGTH')
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('没有新素材时直接跳过，不再查询 token 估算', async () => {
    duHui()
    shuHui(0)

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)

    expect(调用模型).not.toHaveBeenCalled()
    expect(查询).toHaveBeenCalledTimes(2)
    expect(String(查询.mock.calls[1][0])).toContain('COUNT(*)')
  })

  it('已有旧摘要时只取锚点后增量，模型入参带旧记忆且按原文顺序', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      duHui(zhaiYaoHang('旧记忆', MaoDian, null, 20))
      shuHui(2)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([
        { ID: bianHao(1), 内容: '原来那天你记得', 发送者: 'yonghu', 创建时间: '2026-10-02T10:00:00.000Z' },
        { ID: bianHao(2), 内容: '记得，我没忘', 发送者: 'jiaose', 创建时间: new Date('2026-10-02T10:01:00.000Z') },
      ])
      调用模型.mockResolvedValueOnce({ neiRong: '他记得上次的约定' })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)

      expect(查询.mock.calls[3][1].slice(0, 5)).toEqual([YongHu, JiaoSe, MaoDian, ['neiXinHuoDong'], null])
      expect(查询.mock.calls[4][1]).toEqual([YongHu, JiaoSe, '他记得上次的约定', 22, '2026-10-02T10:01:00.000Z', bianHao(2)])
      expect(String(查询.mock.calls[3][0])).toContain('ORDER BY "创建时间" DESC, "ID"::text DESC')
      const [moXing, duiHua] = 调用模型.mock.calls[0]
      expect(moXing).toBe('JiYiZhaiYao')
      expect((duiHua as Array<{ jiaoSe: string; neiRong: string }>).map((xiao) => xiao.jiaoSe)).toEqual(['system', 'user'])
      expect(String((duiHua as Array<{ neiRong: string }>)[1].neiRong)).toContain('旧记忆')
      expect(String((duiHua as Array<{ neiRong: string }>)[1].neiRong)).toContain('1. [对方] 原来那天你记得\n2. [自己] 记得，我没忘')
      expect(查询.mock.calls[4][0]).toBe(ZhaiYaoLuoKuYuJu)
      expect(查询.mock.calls[4][1]).toEqual([YongHu, JiaoSe, '他记得上次的约定', 22, '2026-10-02T10:01:00.000Z', bianHao(2)])
      expect(duQuTongBuZhaiYao(YongHu, JiaoSe)).toContain('他记得上次的约定')
      expect(redisDel).toHaveBeenCalledWith(zhaiJian(YongHu, JiaoSe))
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('模型结果为空时保留旧摘要，不推进素材锚点', async () => {
    duHui(zhaiYaoHang('别让他等太久', MaoDian))
    shuHui(40)
    ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
    liaoHui(Array.from({ length: 40 }, (_, i) => ({
      内容: i < 38 ? '早期素材'.repeat(40000) : `新消息${i + 1}`,
      发送者: 'yonghu',
      创建时间: new Date(Date.UTC(2026, 9, 2, 10, i)),
    })))
    调用模型.mockResolvedValueOnce({ neiRong: '   ' })

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(false)

    expect(查询.mock.calls).toHaveLength(4)
    expect(查询.mock.calls.some(([yuJu]) => String(yuJu).includes('INSERT'))).toBe(false)
    expect(duQuTongBuZhaiYao(YongHu, JiaoSe)).toBe('')
    expect(vi.mocked(debug日志.warn).mock.calls.some(([, xiaoXi]) => String(xiaoXi).includes('没记住'))).toBe(true)
  })

  it('已有摘要的计数保持原累计值，不重复增加', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      duHui(zhaiYaoHang('旧记忆', MaoDian, null, 20))
      shuHui(1)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([{ ID: bianHao(2), 内容: '原文', 发送者: 'yonghu', 创建时间: new Date('2026-10-02T10:01:00.000Z') }])
      调用模型.mockResolvedValueOnce({ neiRong: '新记忆' })
      查询.mockResolvedValueOnce({ rows: [] })
      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
      expect(查询.mock.calls[4][1][3]).toBe(21)
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('同一用户角色锁已被占用时跳过整个生成过程并返回 false', async () => {
    redisSet.mockResolvedValueOnce(null)

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(false)

    expect(查询).not.toHaveBeenCalled()
    expect(调用模型).not.toHaveBeenCalled()
    expect(redisDel).not.toHaveBeenCalled()
    expect(redisSet).toHaveBeenCalledTimes(1)
  })

  it('首轮达到门槛但摘要读取失败时继续无锚点生成', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      查询.mockImplementationOnce(async () => { throw new Error('missing table') })
      shuHui(40)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([
        { 内容: '他说了今天不加班', 发送者: 'yonghu', 创建时间: new Date('2026-10-02T08:00:00.000Z') },
        { 内容: '那正好一起吃晚饭', 发送者: 'jiaose', 创建时间: new Date('2026-10-02T08:01:00.000Z') },
      ])
      调用模型.mockResolvedValueOnce({ neiRong: '大家准备今晚吃饭' })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
      expect(查询.mock.calls[1][1][2]).toBeNull()
      expect(查询.mock.calls[2][1][2]).toBeNull()
      expect(查询.mock.calls[3][1][2]).toBeNull()
      expect(查询.mock.calls[4][1][2]).toBe('大家准备今晚吃饭')
      expect(查询.mock.calls[4][1][3]).toBe(2)
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('锁释放后下一次投入可以正常生成，空参数仅安全跳过', async () => {
    duHui()
    shuHui(40)
    ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
    liaoHui([
      { 内容: '早期素材'.repeat(40000), 发送者: 'yonghu', 创建时间: new Date(Date.UTC(2026, 9, 2, 9, 59)) },
      { 内容: '中间素材'.repeat(40000), 发送者: 'jiaose', 创建时间: new Date(Date.UTC(2026, 9, 2, 10, 0)) },
      { 内容: '消息', 发送者: 'yonghu', 创建时间: new Date() },
    ])
    调用模型.mockResolvedValueOnce({ neiRong: '新的记忆' })
    查询.mockResolvedValueOnce({ rows: [] })

    expect(await shengChengBingLuoKuZhaiYao('', JiaoSe, '糖糖')).toBe(false)
    expect(redisSet).not.toHaveBeenCalled()
    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
    expect(调用模型).toHaveBeenCalledTimes(1)
  })

  it('Redis不可用时用本地互斥完成生成，重复并发不重复调用模型', async () => {
    redisSet.mockRejectedValue(new Error('connect ECONNREFUSED'))
    duHui()
    shuHui(40)
    ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
    liaoHui([
      { 内容: '早期素材'.repeat(40000), 发送者: 'yonghu', 创建时间: new Date(Date.UTC(2026, 9, 2, 9, 59)) },
      { 内容: '中间素材'.repeat(40000), 发送者: 'jiaose', 创建时间: new Date(Date.UTC(2026, 9, 2, 10, 0)) },
      { 内容: '新素材', 发送者: 'yonghu', 创建时间: new Date() },
    ])
    let kaiShi: () => void = () => undefined
    const daiJieShu = new Promise<void>((jieShu) => { kaiShi = jieShu })
    调用模型.mockImplementation(async () => {
      await daiJieShu
      return { neiRong: '本地锁生成的记忆' }
    })
    查询.mockResolvedValueOnce({ rows: [] })

    const diYi = shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')
    await vi.waitFor(() => expect(调用模型).toHaveBeenCalledTimes(1))
    const diEr = shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')
    kaiShi()

    expect(await diYi).toBe(true)
    expect(await diEr).toBe(false)
    expect(调用模型).toHaveBeenCalledTimes(1)
    expect(vi.mocked(debug日志.warn).mock.calls.some(([, xiaoXi]) => String(xiaoXi).includes('本地互斥'))).toBe(true)
    expect(vi.mocked(debug日志.warn).mock.calls.some(([_, __, xuan]) => JSON.stringify(xuan).includes('ECONNREFUSED'))).toBe(true)
  })
})

describe('本轮线程内记忆槽', () => {
  it('读写、更新、空值清理都隔离在用户角色自己的键下', () => {
    huanCunTongBuZhaiYao(YongHu, JiaoSe, '甲')
    expect(duQuTongBuZhaiYao(YongHu, JiaoSe)).toBe('甲')
    expect(duQuTongBuZhaiYao(JiaoSe, YongHu)).toBe('')
    huanCunTongBuZhaiYao(YongHu, JiaoSe, '乙')
    expect(duQuTongBuZhaiYao(YongHu, JiaoSe)).toBe('乙')
    huanCunTongBuZhaiYao(YongHu, JiaoSe, '  ')
    expect(duQuTongBuZhaiYao(YongHu, JiaoSe)).toBe('')
  })

  it('内存槽最多500个角色对，最久未写入的被淘汰，最新活动键保留', () => {
    const zuiDa = 500
    huanCunTongBuZhaiYao('最早', JiaoSe, '最早写入')
    for (let i = 1; i < zuiDa; i += 1) {
      huanCunTongBuZhaiYao(`U${i}`, JiaoSe, `记忆${i}`)
    }

    huanCunTongBuZhaiYao(`U${zuiDa}`, JiaoSe, '触发淘汰')

    expect(duQuTongBuZhaiYao('最早', JiaoSe)).toBe('')
    expect(duQuTongBuZhaiYao('U1', JiaoSe)).toBe('记忆1')
    expect(duQuTongBuZhaiYao(`U${zuiDa}`, JiaoSe)).toBe('触发淘汰')
    expect(duQuTongBuZhaiYao(`U${zuiDa - 1}`, JiaoSe)).toBe(`记忆${zuiDa - 1}`)
  })

  it('重复写入已有键不占新名额，整体长度仍封顶', () => {
    for (let i = 0; i < 500; i += 1) huanCunTongBuZhaiYao(`K${i}`, JiaoSe, `M${i}`)
    for (let i = 0; i < 500; i += 1) huanCunTongBuZhaiYao(`K${i}`, JiaoSe, `N${i}`)

    for (let i = 0; i < 500; i += 1) expect(duQuTongBuZhaiYao(`K${i}`, JiaoSe)).toBe(`N${i}`)
    qingLiTongBuZhaiYao('K10', JiaoSe)
    expect(duQuTongBuZhaiYao('K10', JiaoSe)).toBe('')
    expect(duQuTongBuZhaiYao('K11', JiaoSe)).toBe('N11')
  })

  it('内存槽淘汰最久未写入者，键刷新后不再被误淘汰', () => {
    huanCunTongBuZhaiYao('A', JiaoSe, 'A旧')
    for (let i = 1; i < 500; i += 1) huanCunTongBuZhaiYao(`B${i}`, JiaoSe, `B${i}`)
    huanCunTongBuZhaiYao('A', JiaoSe, 'A新')
    huanCunTongBuZhaiYao('新者', JiaoSe, '新记忆')
    expect(duQuTongBuZhaiYao('A', JiaoSe)).toBe('A新')
    expect(duQuTongBuZhaiYao('B1', JiaoSe)).toBe('')
    qingLiTongBuZhaiYao()
    expect(duQuTongBuZhaiYao('新者', JiaoSe)).toBe('')
  })
})

describe('素材过滤与增量锚点', () => {
  it('只取未撤回的人与角色纯文字，排除运营字段，按创建时间正序限量', () => {
    expect(ZhaiYaoYuanLiaoGuoLvYuJu).toContain('COALESCE("已撤回", false) = false')
    expect(ZhaiYaoYuanLiaoGuoLvYuJu).toContain('"发送者" IN (\'yonghu\', \'jiaose\')')
    expect(ZhaiYaoYuanLiaoGuoLvYuJu).toContain('COALESCE("类型", \'wenBen\') IN (\'wenben\', \'wenBen\')')
    expect(ZhaiYaoYuanLiaoGuoLvYuJu).toContain('COALESCE("类型", \'wenBen\') <> ALL($4::varchar[])')
    expect(ZhaiYaoYuanLiaoGuoLvYuJu).toContain('BTRIM("内容") <> \'\'')
    expect(ZhaiYaoYuanLiaoGuoLvYuJu).toContain('"创建时间" >= $3::timestamptz')
    expect(ZhaiYaoYuanLiaoGuoLvYuJu).toContain('$5::text IS NULL')
    expect(ZhaiYaoYuanLiaoGuoLvYuJu).not.toContain('ORDER BY')
  })

  it('token 估算在阈值处精确触发，不是超过阈值才触发', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      duHui()
      shuHui(40)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([
        { 内容: '恰好达到阈值', 发送者: 'yonghu', 创建时间: new Date() },
      ])
      调用模型.mockResolvedValueOnce({ neiRong: '新摘要' })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
      expect(调用模型).toHaveBeenCalledTimes(1)
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('token 估算低于阈值时不进入素材查询', async () => {
    duHui()
    shuHui(40)
    ziFuHui(Math.floor((AI配置.zhaiYao.yaSuoTokenYuZhi - 1) / 0.6))

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
    expect(调用模型).not.toHaveBeenCalled()
    expect(查询).toHaveBeenCalledTimes(3)
    expect(查询.mock.calls[2][1]).toEqual([YongHu, JiaoSe, null, ['neiXinHuoDong'], null])
  })

  it('写库使用真实唯一键ON CONFLICT的异步覆盖语句', () => {
    expect(ZhaiYaoLuoKuYuJu).toContain('ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET')
    expect(ZhaiYaoLuoKuYuJu).toContain('"素材锚点时间" = EXCLUDED."素材锚点时间"')
    expect(ZhaiYaoLuoKuYuJu).toContain('"摘要内容" = EXCLUDED."摘要内容"')
    expect(ZhaiYaoLuoKuYuJu).toContain('"概括消息数" = EXCLUDED."概括消息数"')
    expect(ZhaiYaoLuoKuYuJu).not.toContain('"摘要"')
  })

  it('素材按token窗口取数，模型文本不会截断成第一条或整表旧素材', async () => {
    const zuiDa = AI配置.zhaiYao.zuiDaZiFu
    const chang = '长'.repeat(zuiDa)
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      duHui()
      shuHui(200)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([
        { 内容: '老消息', 发送者: 'yonghu', 创建时间: '2026-10-03T01:00:00.000Z' },
        { 内容: '中消息', 发送者: 'jiaose', 创建时间: '2026-10-03T02:00:00.000Z' },
      ])
      调用模型.mockResolvedValueOnce({ neiRong: `${chang}不应保留下一行\n丢弃行` })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)

      expect(查询.mock.calls[3][1].length).toBe(8)
      const xia = 调用模型.mock.calls[0][1][1].neiRong
      expect(xia.indexOf('1. [对方] 老消息')).toBeLessThan(xia.indexOf('2. [自己] 中消息'))
      expect(查询.mock.calls[4][1][2]).toBe(chang)
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('生成异常返回false且锁释放，保存含正文、密钥的报错也不会写到日志', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      duHui()
      shuHui(40)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      const neiRong = '用户今晚私密聊天里的秘密'
      liaoHui([{ 内容: neiRong, 发送者: 'yonghu', 创建时间: new Date() }])
      调用模型.mockRejectedValueOnce(new Error('sk-private-token=abc，数据库口令=xyz，' + neiRong))

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(false)

      expect(redisSet).toHaveBeenCalledTimes(1)
      expect(redisDel).toHaveBeenCalledWith(zhaiJian(YongHu, JiaoSe))
      expect(vi.mocked(debug日志.error)).toHaveBeenCalled()
      const riZhi = JSON.stringify({
        jingGao: vi.mocked(debug日志.warn).mock.calls,
        cuoWu: vi.mocked(debug日志.error).mock.calls,
        xinXi: 日志信息Mock.mock.calls,
      })
      for (const minGan of [neiRong, 'sk-private-token', 'abc', 'xyz', 'SECRET', 'SELECT']) {
        expect(riZhi).not.toContain(minGan)
      }
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('写库异常不替换近期记忆，下轮可以再尝试', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      duHui()
      shuHui(40)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([{ 内容: '待落库原文', 发送者: 'yonghu', 创建时间: new Date() }])
      调用模型.mockResolvedValueOnce({ neiRong: '写入失败的记忆' })
      查询.mockRejectedValueOnce(Object.assign(new Error('42P01关系不存在'), { code: '42P01' }))

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(false)
      expect(redisDel).toHaveBeenCalled()
      expect(duQuTongBuZhaiYao(YongHu, JiaoSe)).toBe('')
      expect(vi.mocked(debug日志.error).mock.calls.some(([_, __, xuan]) => JSON.stringify(xuan).includes('42P01'))).toBe(true)

      duHui({})
      shuHui(1)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([{ 内容: '再来一条', 发送者: 'yonghu', 创建时间: new Date() }])
      调用模型.mockResolvedValueOnce({ neiRong: '重试后的记忆' })
      查询.mockResolvedValueOnce({ rows: [] })
      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('旧记忆为空则构造prompt不带空占位，正文写入对应角色也给上下文留边界', () => {
    const prompt = gouJianJiYiZhaiYaoPrompt('1. [对方] 新的约定', '糖糖', '  ')
    expect(prompt).toContain('糖糖')
    expect(prompt).toContain('1. [对方] 新的约定')
    expect(prompt).not.toContain('undefined')
    expect(prompt).not.toContain('null')
    expect(prompt).toContain('<<<USER_CONTENT_START>>>')
    expect(prompt).toContain('<<<USER_CONTENT_END>>>')
  })

  it('没有素材行时不会触发空摘要覆盖，读取异常仍在阈值前安全降级', async () => {
    duHui(zhaiYaoHang('旧记忆', null))
    查询.mockRejectedValueOnce(new Error('42P01'))

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(false)
    expect(查询).toHaveBeenCalledTimes(2)
    expect(调用模型).not.toHaveBeenCalled()

    查询.mockReset()
    duHui({})
    查询.mockImplementationOnce(async () => ({ rows: [{ dai_shu: 40 }] }))
    liaoHui([])

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
    expect(调用模型).not.toHaveBeenCalled()
    expect(查询.mock.calls.some(([yuJu]) => String(yuJu).includes('INSERT'))).toBe(false)
  })

  it('素材达到阈值但 token 估算异常时按失败处理，不推进摘要', async () => {
    duHui()
    shuHui(40)
    查询.mockRejectedValueOnce(new Error('OCTET_LENGTH missing'))

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(false)
    expect(调用模型).not.toHaveBeenCalled()
    expect(查询.mock.calls.some(([yuJu]) => String(yuJu).includes('INSERT'))).toBe(false)
    expect(vi.mocked(debug日志.error).mock.calls.some(([_, __, xuan]) => JSON.stringify(xuan).includes('OCTET_LENGTH'))).toBe(true)
  })
})

describe('复合锚点与分批素材窗口', () => {
  function caiLiaoChaXun(hangLieBiao: Array<Record<string, unknown>>) {
    return async (yuJu: string, canShu: unknown[]) => {
      const [yongHu, jiaoSe, maoDian, , xiaoXiId, shangXianShiJian, shangXianId, piLiang] = canShu as [string, string, string | null, string[], string | null, string | null, string | null, number]
      const zaiMaoDianHou = (hang: Record<string, unknown>) => {
        const shiJian = Date.parse(String(hang['创建时间']))
        if (maoDian === null) return true
        if (xiaoXiId === null) return shiJian > Date.parse(maoDian)
        return shiJian > Date.parse(maoDian) || (shiJian === Date.parse(maoDian) && String(hang['ID']) > xiaoXiId)
      }
      const zaiShangXianQian = (hang: Record<string, unknown>) => shangXianShiJian === null || shangXianShiJian === '' || Date.parse(String(hang['创建时间'])) < Date.parse(shangXianShiJian) || (Date.parse(String(hang['创建时间'])) === Date.parse(shangXianShiJian) && String(hang['ID']) < String(shangXianId))
      return {
        rows: hangLieBiao
          .filter((hang) => hang['用户ID'] === yongHu && hang['角色ID'] === jiaoSe && zaiMaoDianHou(hang) && zaiShangXianQian(hang))
          .sort((jia, yi) => Date.parse(String(yi['创建时间'])) - Date.parse(String(jia['创建时间'])) || String(yi['ID']).localeCompare(String(jia['ID'])))
          .slice(0, piLiang),
      }
    }
  }

  it('首次锚点带有消息ID，第二次生成仍能取到同创建时间的下一条', async () => {
    const m1 = bianHao(101)
    const m2 = bianHao(102)
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      duHui()
      shuHui(1)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([{ ID: m1, 内容: '第一条同时刻消息', 发送者: 'yonghu', 创建时间: MaoDian }])
      调用模型.mockResolvedValueOnce({ neiRong: '记住第一条' })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
      const diYiCiXieKu = 查询.mock.calls[4][1]
      expect(diYiCiXieKu).toEqual([YongHu, JiaoSe, '记住第一条', 1, MaoDian, m1])
      duHui({ 摘要内容: '记住第一条', 概括消息数: 1, 素材锚点时间: MaoDian, 素材锚点消息ID: m1 })
      const duQu = await duQuDuiHuaZhaiYao(YongHu, JiaoSe)
      expect(duQu?.xiaoXiId).toBe(m1)
      expect(duQu?.suCaiMaoDian).toBe(MaoDian)
      查询.mockReset()
      查询.mockImplementationOnce(async () => ({ rows: [{ 摘要内容: '记住第一条', 概括消息数: 1, 素材锚点时间: MaoDian, 素材锚点消息ID: m1 }] }))
      shuHui(1)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      查询.mockImplementationOnce(caiLiaoChaXun([{ ID: m1, 用户ID: YongHu, 角色ID: JiaoSe, 内容: '第一条同时刻消息', 发送者: 'yonghu', 创建时间: MaoDian }, { ID: m2, 用户ID: YongHu, 角色ID: JiaoSe, 内容: '第二条同时刻消息', 发送者: 'yonghu', 创建时间: MaoDian }]))
      调用模型.mockResolvedValueOnce({ neiRong: '接着记住第二条' })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
      expect(查询.mock.calls[1][1]).toEqual([YongHu, JiaoSe, MaoDian, ['neiXinHuoDong'], m1])
      expect(查询.mock.calls[3][1]).toEqual([YongHu, JiaoSe, MaoDian, ['neiXinHuoDong'], m1, null, null, AI配置.zhaiYao.piLiangTiaoShu])
      expect(String(查询.mock.calls[3][0])).toContain('("创建时间", "ID"::text) > ($3::timestamptz, $5::text)')
      const tiShi = String(调用模型.mock.calls[1][1][1].neiRong)
      expect(tiShi).toContain('第二条同时刻消息')
      expect(tiShi).not.toContain('1. [对方] 第一条同时刻消息')
      expect(查询.mock.calls[4][1]).toEqual([YongHu, JiaoSe, '接着记住第二条', 2, MaoDian, m2])
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('每批两条时取齐最近窗口且只摘窗口外内容，游标推进不重复计数', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    const yuanPiLiang = AI配置.zhaiYao.piLiangTiaoShu
    const yuanPiCi = AI配置.zhaiYao.zuiDaPiCi
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number; piLiangTiaoShu: number; zuiDaPiCi: number }).zuiJinYuanWenToken = 0
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number; piLiangTiaoShu: number; zuiDaPiCi: number }).piLiangTiaoShu = 2
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number; piLiangTiaoShu: number; zuiDaPiCi: number }).zuiDaPiCi = 3
    const hang = (id: number, neiRong: string) => ({ ID: bianHao(id), 用户ID: YongHu, 角色ID: JiaoSe, 内容: neiRong, 发送者: 'yonghu', 创建时间: new Date(Date.UTC(2026, 9, 1, 0, 0, id)) })
    const yuanXing = [hang(1, '较早内容'.repeat(5)), hang(2, '次早内容'.repeat(5)), hang(3, '保留甲'), hang(4, '保留乙')]
    try {
      duHui()
      shuHui(4)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      查询.mockImplementationOnce(caiLiaoChaXun(yuanXing))
      查询.mockImplementationOnce(caiLiaoChaXun(yuanXing))
      调用模型.mockResolvedValueOnce({ neiRong: '只摘更早的两条' })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
      const caiLiao = 查询.mock.calls.filter(([yuJu]) => String(yuJu).includes('SELECT "内容"'))
      expect(caiLiao).toHaveLength(2)
      expect(caiLiao[0][1].slice(5, 8)).toEqual([null, null, 2])
      expect(caiLiao[1][1].slice(5, 8)).toEqual([yuanXing[2].创建时间.toISOString(), yuanXing[2].ID, 2])
      const tiShi = String(调用模型.mock.calls[0][1][1].neiRong)
      expect(tiShi).toContain('较早内容')
      expect(tiShi).toContain('次早内容')
      expect(查询.mock.calls[5][1]).toEqual([YongHu, JiaoSe, '只摘更早的两条', 4, yuanXing[3].创建时间.toISOString(), yuanXing[3].ID])
      expect(日志信息Mock.mock.calls.some(([, , xuan]) => JSON.stringify(xuan).includes('"zhai_yao_tiao_shu":4'))).toBe(true)
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number; piLiangTiaoShu: number; zuiDaPiCi: number }).zuiJinYuanWenToken = yuanZhi
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number; piLiangTiaoShu: number; zuiDaPiCi: number }).piLiangTiaoShu = yuanPiLiang
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number; piLiangTiaoShu: number; zuiDaPiCi: number }).zuiDaPiCi = yuanPiCi
    }
  })

  it('旧纯时间和旧无ID JSON锚点仍按原时间增量读取，不误用空复合游标', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    const xin = { ID: bianHao(333), 用户ID: YongHu, 角色ID: JiaoSe, 内容: '旧锚点之后的新素材', 发送者: 'yonghu', 创建时间: '2026-10-01T09:00:00.000Z' }
    try {
      for (const jiuMaoDian of [MaoDian, JSON.stringify({ shiJian: MaoDian })]) {
        查询.mockReset()
        调用模型.mockClear()
        查询.mockImplementationOnce(async () => ({ rows: [{ 摘要内容: '旧记忆', 概括消息数: 1, 素材锚点时间: jiuMaoDian }] }))
        shuHui(1)
        ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
        查询.mockImplementationOnce(caiLiaoChaXun([{ ...xin, 创建时间: MaoDian }, xin]))
        调用模型.mockResolvedValueOnce({ neiRong: '兼容旧记忆' })
        查询.mockResolvedValueOnce({ rows: [] })

        expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
        expect(查询.mock.calls[1][1]).toEqual([YongHu, JiaoSe, MaoDian, ['neiXinHuoDong'], null])
        expect(查询.mock.calls[3][1].slice(0, 5)).toEqual([YongHu, JiaoSe, MaoDian, ['neiXinHuoDong'], null])
        const tiShi = String(调用模型.mock.calls[0][1][1].neiRong)
        expect(tiShi).toContain('旧锚点之后的新素材')
        expect(查询.mock.calls[4][1]).toEqual([YongHu, JiaoSe, '兼容旧记忆', 2, xin.创建时间, xin.ID])
      }
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })
})

describe('最近原文窗口', () => {
  function chuangJianChaoGuoZhi(ziJie: number, xuHao: number, faSongZhe = 'yonghu') {
    return {
      内容: '字'.repeat(ziJie),
      发送者: faSongZhe,
      创建时间: new Date(Date.UTC(2026, 9, 2, 10, xuHao)),
    }
  }

  it('候选超阈值且窗口外有内容时，只摘要窗口前部分，最近窗口保留', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 2600
    try {
      duHui()
      shuHui(13)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([
        chuangJianChaoGuoZhi(250, 1),
        chuangJianChaoGuoZhi(250, 2, 'jiaose'),
        chuangJianChaoGuoZhi(300, 3),
        chuangJianChaoGuoZhi(400, 4, 'jiaose'),
        chuangJianChaoGuoZhi(300, 5),
        chuangJianChaoGuoZhi(300, 6, 'jiaose'),
        chuangJianChaoGuoZhi(6000, 7),
        chuangJianChaoGuoZhi(9000, 8, 'jiaose'),
      ])
      调用模型.mockResolvedValueOnce({ neiRong: '只记住更早的约定' })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)

      const ziLiaoDiaoYong = (调用模型 as Mock).mock.calls[0]
      const tiShi = String((ziLiaoDiaoYong[1] as Array<{ neiRong: string }>)[1].neiRong)
      expect(tiShi).toContain('1. [对方] ' + '字'.repeat(250))
      expect(tiShi).toContain('2. [自己] ' + '字'.repeat(250))
      expect(tiShi).toContain('7. [对方] ' + '字'.repeat(6000))
      expect(tiShi).not.toContain('8. [自己] ' + '字'.repeat(9000))
      expect(查询.mock.calls[4][0]).toBe(ZhaiYaoLuoKuYuJu)
      expect(查询.mock.calls[4][1]).toEqual([YongHu, JiaoSe, '只记住更早的约定', 7, new Date(Date.UTC(2026, 9, 2, 10, 7)).toISOString(), bianHao(7)])
      expect(日志信息Mock.mock.calls.some(([, xiaoXi, xuan]) =>
        String(xiaoXi).includes('增量摘要') && JSON.stringify(xuan).includes('"bao_liu_tiao_shu":1'))).toBe(true)
      expect(日志信息Mock.mock.calls.some(([, , xuan]) => JSON.stringify(xuan).includes('"zhai_yao_tiao_shu":7'))).toBe(true)
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('候选超阈值但窗口起点落在首条时，不摘要任何内容，保留全部候选', async () => {
    duHui({ 摘要内容: '旧记忆', 概括消息数: 5, 素材锚点时间: MaoDian })
    shuHui(2)
    ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
    liaoHui([
      chuangJianChaoGuoZhi(6000, 1),
      chuangJianChaoGuoZhi(6000, 2, 'jiaose'),
    ])

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)

    expect(调用模型).not.toHaveBeenCalled()
    expect(查询.mock.calls.some(([yuJu]) => String(yuJu).includes('INSERT'))).toBe(false)
    expect(duQuTongBuZhaiYao(YongHu, JiaoSe)).toBe('')
  })

  it('候选全部落在最近窗口内时不调模型、不写库、不推进锚点', async () => {
    duHui(zhaiYaoHang('旧记忆', MaoDian))
    shuHui(3)
    ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
    liaoHui([
      chuangJianChaoGuoZhi(4000, 1),
      chuangJianChaoGuoZhi(4000, 2, 'jiaose'),
      chuangJianChaoGuoZhi(3000, 3),
    ])

    expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)

    expect(调用模型).not.toHaveBeenCalled()
    expect(查询).toHaveBeenCalledTimes(4)
    expect(查询.mock.calls.some(([yuJu]) => String(yuJu).includes('INSERT'))).toBe(false)
    expect(duQuTongBuZhaiYao(YongHu, JiaoSe)).toBe('')
  })

  it('窗口配置为0时退化为旧的全量压缩行为', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      duHui()
      shuHui(2)
      ziFuHui(Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6))
      liaoHui([
        chuangJianChaoGuoZhi(3000, 1),
        chuangJianChaoGuoZhi(3000, 2, 'jiaose'),
      ])
      调用模型.mockResolvedValueOnce({ neiRong: '全量记忆' })
      查询.mockResolvedValueOnce({ rows: [] })

      expect(await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')).toBe(true)
      expect(调用模型).toHaveBeenCalledTimes(1)
      const tiShi = String((调用模型 as Mock).mock.calls[0][1][1].neiRong)
      expect(tiShi).toContain('2. [自己] ' + '字'.repeat(3000))
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })
})
