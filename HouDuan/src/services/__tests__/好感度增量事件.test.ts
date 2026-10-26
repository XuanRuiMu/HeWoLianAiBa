import { beforeEach, describe, expect, it, vi } from 'vitest'

const JIU_HANG = {
  信任度: 140,
  亲密度: 100,
  趣味度: 80,
  关怀度: 80,
  总分: 400,
  关系阶段: '熟悉',
  互动次数: 4,
}

const XIN_ZONG_FEN = 406

vi.mock('../../数据库', () => {
  return {
    数据库: {
      query: vi.fn(async (wen: string) => {
        if (wen.includes('SELECT * FROM "好感度"')) {
          return { rows: [{ ...JIU_HANG }], rowCount: 1 }
        }
        if (wen.includes('RETURNING "总分", "互动次数"')) {
          return { rows: [{ 总分: XIN_ZONG_FEN, 互动次数: 5 }], rowCount: 1 }
        }
        return { rows: [], rowCount: 1 }
      }),
    },
  }
})

vi.mock('../../redis', () => ({
  redis: {
    lpush: vi.fn(async () => 1),
    ltrim: vi.fn(async () => 'OK'),
    pexpire: vi.fn(async () => 1),
    lrange: vi.fn(async () => []),
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    incr: vi.fn(async () => 1),
  },
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuHaoGanDuBianHua: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))

vi.mock('../好感度评判', () => ({
  pingPanHaoGanDuPiLiangNei: vi.fn(async () => ({
    jieGuo: {
      xin_ren_du_bian_hua: 2,
      qin_mi_du_bian_hua: 2,
      qu_wei_du_bian_hua: 1,
      guan_huai_du_bian_hua: 1,
      li_you: '聊天投缘',
    },
    xiShu: 1,
    muBiaoQuXian: 3,
    lianXuWeiDaBiao: 0,
  })),
}))

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => null),
  sheZhiIo: vi.fn(),
}))

vi.mock('../好感度', async (daoRuYuan) => {
  const shiJi = await daoRuYuan<typeof import('../好感度')>()
  return {
    ...shiJi,
    gengXinHaoGanDu: vi.fn(
      (...canShu: Parameters<typeof shiJi.gengXinHaoGanDu>) => shiJi.gengXinHaoGanDu(...canShu),
    ),
    huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 400 })),
  }
})

import { gengXinHaoGanDu, type HaoGanDuZengLiangShiJian } from '../好感度'
import { AI回复调度器 } from '../AI回复调度器'
import { 数据库 } from '../../数据库'
import type { Server } from 'socket.io'

const BAI_MING_DAN = [
  'guan_huai_du_bian_hua',
  'jiao_se_id',
  'qin_mi_du_bian_hua',
  'qu_wei_du_bian_hua',
  'shi_jian_id',
  'xin_ren_du_bian_hua',
  'zong_fen_bian_hua',
]

function qiWangZengLiang(shiJianId: string): HaoGanDuZengLiangShiJian {
  return {
    shi_jian_id: shiJianId,
    jiao_se_id: 'j-1',
    xin_ren_du_bian_hua: 2,
    qin_mi_du_bian_hua: 2,
    qu_wei_du_bian_hua: 1,
    guan_huai_du_bian_hua: 1,
    zong_fen_bian_hua: 6,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('好感度增量事件安全契约', () => {
  it('权威提交成功后返回仅含白名单字段的事件负载且数值为旧值到新值的有符号差', async () => {
    const jieGuo = await gengXinHaoGanDu('u-1', 'j-1', {
      xin_ren_du_bian_hua: 2,
      qin_mi_du_bian_hua: 2,
      qu_wei_du_bian_hua: 1,
      guan_huai_du_bian_hua: 1,
    })

    expect(jieGuo.cheng_gong).toBe(true)
    const shiJian = jieGuo.zeng_liang_shi_jian
    expect(shiJian).toBeDefined()
    expect(Object.keys(shiJian as object).sort()).toEqual(BAI_MING_DAN)
    expect(shiJian).toEqual(qiWangZengLiang((shiJian as HaoGanDuZengLiangShiJian).shi_jian_id))
    expect((shiJian as HaoGanDuZengLiangShiJian).shi_jian_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('事件负载不含累计值、初始值、渣型、原始增量、系数、理由、互动次数等禁发信息', async () => {
    const jieGuo = await gengXinHaoGanDu('u-1', 'j-1', {
      xin_ren_du_bian_hua: 1,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
    })
    const wenBen = JSON.stringify(jieGuo.zeng_liang_shi_jian)
    for (const jinCi of [
      'zong_fen"',
      'xin_ren_du"',
      'shi_fou_zha',
      'yuan_shi',
      'xi_shu',
      'li_you',
      'hu_dong',
      'chu_shi',
      'jie_duan',
      'lun_xu',
    ]) {
      expect(wenBen).not.toContain(jinCi)
    }
  })

  it('好感度记录不存在时不产生事件', async () => {
    vi.mocked(数据库.query).mockImplementationOnce(async () => ({ rows: [], rowCount: 0 }))
    const jieGuo = await gengXinHaoGanDu('u-1', 'j-1', {
      xin_ren_du_bian_hua: 1,
      qin_mi_du_bian_hua: 1,
      qu_wei_du_bian_hua: 1,
      guan_huai_du_bian_hua: 1,
    })
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.zeng_liang_shi_jian).toBeUndefined()
  })

  it('数据库异常导致提交失败时不产生事件', async () => {
    vi.mocked(数据库.query).mockImplementationOnce(async () => {
      throw new Error('数据库不可用')
    })
    const jieGuo = await gengXinHaoGanDu('u-1', 'j-1', {
      xin_ren_du_bian_hua: 1,
      qin_mi_du_bian_hua: 1,
      qu_wei_du_bian_hua: 1,
      guan_huai_du_bian_hua: 1,
    })
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.zeng_liang_shi_jian).toBeUndefined()
  })

  it('并发提交产生互相独立且事件ID不重复的事件', async () => {
    const [jia, yi] = await Promise.all([
      gengXinHaoGanDu('u-1', 'j-1', {
        xin_ren_du_bian_hua: 1,
        qin_mi_du_bian_hua: 0,
        qu_wei_du_bian_hua: 0,
        guan_huai_du_bian_hua: 0,
      }),
      gengXinHaoGanDu('u-1', 'j-1', {
        xin_ren_du_bian_hua: 0,
        qin_mi_du_bian_hua: 2,
        qu_wei_du_bian_hua: 0,
        guan_huai_du_bian_hua: 0,
      }),
    ])
    const jiaShiJian = jia.zeng_liang_shi_jian as HaoGanDuZengLiangShiJian
    const yiShiJian = yi.zeng_liang_shi_jian as HaoGanDuZengLiangShiJian
    expect(jiaShiJian.shi_jian_id).not.toBe(yiShiJian.shi_jian_id)
    expect(jiaShiJian).not.toBe(yiShiJian)
  })
})

describe('AI调度器好感度增量投递', () => {
  function xinTiaoDuQi() {
    const emit = vi.fn()
    const fangJian = vi.fn(() => ({ emit }))
    const io = { to: fangJian } as unknown as Server
    const tiaoDuQi = new AI回复调度器('j-1', 'u-1', 'I', io, 0)
    return { tiaoDuQi, fangJian, emit }
  }

  it('提交成功后仅向本人房间下发白名单事件负载', async () => {
    const { tiaoDuQi, fangJian, emit } = xinTiaoDuQi()
    const gengXinMock = vi.mocked(gengXinHaoGanDu)
    gengXinMock.mockResolvedValueOnce({
      cheng_gong: true,
      zeng_liang_shi_jian: qiWangZengLiang('e1e1e1e1-1111-4111-8111-111111111111'),
    })
    const shiJianBuKeYong = tiaoDuQi as unknown as {
      更新好感度: (a: string, b: string[]) => Promise<unknown>
    }
    await shiJianBuKeYong.更新好感度('在吗', ['在的'])

    expect(fangJian).toHaveBeenCalledWith('u-1')
    expect(emit).toHaveBeenCalledTimes(1)
    const [ming, fuZai] = emit.mock.calls[0]
    expect(ming).toBe('好感度增量')
    expect(Object.keys(fuZai as object).sort()).toEqual(BAI_MING_DAN)
  })

  it('提交失败时不下发成功事件', async () => {
    const { tiaoDuQi, emit } = xinTiaoDuQi()
    vi.mocked(gengXinHaoGanDu).mockResolvedValueOnce({ cheng_gong: false, zhuang_tai_ma: 500 })
    const shiJianBuKeYong = tiaoDuQi as unknown as {
      更新好感度: (a: string, b: string[]) => Promise<unknown>
    }
    await shiJianBuKeYong.更新好感度('在吗', ['在的'])
    expect(emit).not.toHaveBeenCalled()
  })

  it('评判未确定时不触发好感度更新也不下发事件', async () => {
    const { pingPanHaoGanDuPiLiangNei } = await import('../好感度评判')
    vi.mocked(pingPanHaoGanDuPiLiangNei).mockResolvedValueOnce({
      jieGuo: {
        xin_ren_du_bian_hua: 0,
        qin_mi_du_bian_hua: 0,
        qu_wei_du_bian_hua: 0,
        guan_huai_du_bian_hua: 0,
        li_you: 'unknown',
      },
    } as never)
    const { tiaoDuQi, emit } = xinTiaoDuQi()
    const shiJianBuKeYong = tiaoDuQi as unknown as {
      更新好感度: (a: string, b: string[]) => Promise<unknown>
    }
    const jieGuo = await shiJianBuKeYong.更新好感度('在吗', ['在的'])
    expect(jieGuo).toBeNull()
    expect(vi.mocked(gengXinHaoGanDu)).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })
})
