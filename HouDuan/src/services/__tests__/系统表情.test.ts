import { describe, expect, it, vi, beforeEach } from 'vitest'

const chaXunMock = vi.hoisted(() => vi.fn())

vi.mock('../../数据库', () => ({
  数据库: {
    query: (...canShu: unknown[]) => chaXunMock(...canShu),
    connect: vi.fn(async () => ({ query: vi.fn(), release: vi.fn() })),
  },
}))

const baoCunMeiTiXiaoXiMock = vi.hoisted(() => vi.fn())

vi.mock('../消息', () => ({
  baoCunJiaoSeMeiTiXiaoXi: (...canShu: unknown[]) => baoCunMeiTiXiaoXiMock(...canShu),
}))

import {
  jieXiBiaoQingZhiLing,
  zuZhuangBiaoQingHouXuanKuai,
  houXuanXiTongBiaoQing,
  faSongBiaoQingBaoXiaoXi,
  shengChengBiaoQingHouXuanWenBen,
  chaZhaoBiaoQingAnDuanMing,
} from '../系统表情'
import { jieXiDirectorXiangYing } from '../Director'
import { BIAO_QING_BAO_YUN_XING } from '../../config/表情包配置'

function hang(zhi: Partial<Record<string, unknown>>): Record<string, unknown> {
  return {
    ID: 'id-1', 短名: '笑哭', 描述: '眯眼大笑', 情绪标签: '好笑', 适用场景: '接住好笑的事',
    SHA256: 'A'.repeat(64), MIME: 'image/png', ...zhi,
  }
}

describe('贴纸指令解析', () => {
  it('整行指令按短名解析（中英文冒号都行）', () => {
    expect(jieXiBiaoQingZhiLing('[贴纸:笑哭]')).toBe('笑哭')
    expect(jieXiBiaoQingZhiLing('[贴纸：狗头]')).toBe('狗头')
    expect(jieXiBiaoQingZhiLing('  [贴纸: 求求了]  ')).toBe('求求了')
  })

  it('行内混排、空名、普通文本都不解析', () => {
    expect(jieXiBiaoQingZhiLing('看这个[贴纸:笑哭]好笑')).toBeNull()
    expect(jieXiBiaoQingZhiLing('[贴纸:]')).toBeNull()
    expect(jieXiBiaoQingZhiLing('今天好累啊')).toBeNull()
    expect(jieXiBiaoQingZhiLing('[贴图:笑哭]')).toBeNull()
  })
})

describe('候选块组装', () => {
  it('系统与用户候选都带短名与描述', () => {
    const kuai = zuZhuangBiaoQingHouXuanKuai(
      [{ id: '1', duanMing: '笑哭', miaoShu: '眯眼大笑', qingXuBiaoQian: '好笑', shiYongChangJing: '接住好笑的事', sha256: 'a', mime: 'image/png' }],
      [{ duanMing: '我家猫', miaoShu: '用户收藏的表情包', meiTiId: 'm-1' }],
    )
    expect(kuai).toContain('[贴纸:笑哭]')
    expect(kuai).toContain('情绪:好笑')
    expect(kuai).toContain('[贴纸:我家猫]')
    expect(kuai).toContain('最多一张')
  })

  it('候选为空时返回空串', () => {
    expect(zuZhuangBiaoQingHouXuanKuai([], [])).toBe('')
  })
})

describe('候选查询', () => {
  beforeEach(() => {
    chaXunMock.mockReset()
  })

  it('带意图时按标签过滤并限量', async () => {
    chaXunMock.mockResolvedValue({ rows: [hang({})] })
    const jieGuo = await houXuanXiTongBiaoQing('好笑', 8)
    expect(jieGuo).toHaveLength(1)
    const [yuJu, canShu] = chaXunMock.mock.calls[0] as [string, unknown[]]
    expect(yuJu).toContain('LIKE')
    expect(canShu).toEqual(['%好笑%', 8])
  })

  it('无意图时不过滤', async () => {
    chaXunMock.mockResolvedValue({ rows: [] })
    await houXuanXiTongBiaoQing(null, 8)
    const [yuJu, canShu] = chaXunMock.mock.calls[0] as [string, unknown[]]
    expect(yuJu).not.toContain('LIKE')
    expect(canShu).toEqual([8])
  })
})

describe('表情包消息发送', () => {
  beforeEach(() => {
    chaXunMock.mockReset()
    baoCunMeiTiXiaoXiMock.mockReset()
  })

  it('命中系统表情并复用已有媒体行', async () => {
    chaXunMock.mockImplementation((yuJu: string) => {
      if (yuJu.includes('FROM "系统表情"')) return Promise.resolve({ rows: [hang({})] })
      if (yuJu.includes('FROM "媒体文件"')) return Promise.resolve({ rows: [{ ID: 'm-9' }] })
      return Promise.resolve({ rows: [] })
    })
    baoCunMeiTiXiaoXiMock.mockResolvedValue({ id: 'x-1', lei_xing: 'biaoQingBao' })
    const jieGuo = await faSongBiaoQingBaoXiaoXi('u-1', 'j-1', '笑哭')
    expect(jieGuo?.id).toBe('x-1')
    const canShu = baoCunMeiTiXiaoXiMock.mock.calls[0][0] as Record<string, unknown>
    expect(canShu.lei_xing).toBe('biaoQingBao')
    expect(canShu.mei_ti_id).toBe('m-9')
  })

  it('未命中表情库返回空且不落库', async () => {
    chaXunMock.mockResolvedValue({ rows: [] })
    const jieGuo = await faSongBiaoQingBaoXiaoXi('u-1', 'j-1', '不存在的')
    expect(jieGuo).toBeNull()
    expect(baoCunMeiTiXiaoXiMock).not.toHaveBeenCalled()
  })
})

describe('候选文本总开关', () => {
  it('意图为空时直接返回空串', async () => {
    expect(await shengChengBiaoQingHouXuanWenBen(null, 'u-1')).toBe('')
  })

  it('库关闭时返回空串', async () => {
    const yuan = BIAO_QING_BAO_YUN_XING.daKai
    ;(BIAO_QING_BAO_YUN_XING as { daKai: boolean }).daKai = false
    try {
      expect(await shengChengBiaoQingHouXuanWenBen('好笑', 'u-1')).toBe('')
    } finally {
      ;(BIAO_QING_BAO_YUN_XING as { daKai: boolean }).daKai = yuan
    }
  })
})

describe('Director 表情包意图解析', () => {
  it('白名单内的意图保留', () => {
    const { ceLue } = jieXiDirectorXiangYing('{"用户意图":"x","情感分析":"y","回复策略":"z","是否回复":true,"回复条数":1,"时间情绪":"t","是否撤回":false,"是否主动表白":false,"biao_qing_yi_tu":"好笑"}')
    expect(ceLue.biao_qing_yi_tu).toBe('好笑')
  })

  it('白名单外的意图归为 null', () => {
    const { ceLue } = jieXiDirectorXiangYing('{"biao_qing_yi_tu":"乱写的"}')
    expect(ceLue.biao_qing_yi_tu).toBeNull()
    const kong = jieXiDirectorXiangYing('{"biao_qing_yi_tu":null}')
    expect(kong.ceLue.biao_qing_yi_tu).toBeNull()
    const queSheng = jieXiDirectorXiangYing('{}')
    expect(queSheng.ceLue.biao_qing_yi_tu).toBeNull()
  })
})

describe('贴纸短名跨库查找', () => {
  beforeEach(() => {
    chaXunMock.mockReset()
  })

  it('先查系统库再查用户库', async () => {
    chaXunMock.mockImplementation((yuJu: string) => {
      if (yuJu.includes('FROM "系统表情"')) return Promise.resolve({ rows: [] })
      if (yuJu.includes('FROM "用户表情"')) {
        return Promise.resolve({ rows: [{ ID: 'm-5', SHA256: 'B'.repeat(64), MIME: 'image/gif' }] })
      }
      return Promise.resolve({ rows: [] })
    })
    const jieGuo = await chaZhaoBiaoQingAnDuanMing('u-1', '我家猫')
    expect(jieGuo).toMatchObject({ meiTiId: 'm-5', mime: 'image/gif' })
  })
})
