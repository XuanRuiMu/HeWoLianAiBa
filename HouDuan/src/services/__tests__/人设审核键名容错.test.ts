import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../数据库', () => ({
  数据库: {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    connect: vi.fn(async () => ({ query: vi.fn(), release: vi.fn() })),
  },
}))

vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
  },
}))

vi.mock('../../utils/通用模型调用', () => ({
  按配置调用: vi.fn(),
}))

import { caiJueRenShe, guiYiShenHeJianMing } from '../人设审核'
import { 按配置调用, type 调用结果 } from '../../utils/通用模型调用'

const HeFaZiDuan = {
  wei_xin_ming: '阳光小子',
  nian_ling: 20,
  tong_yong_ti_shi_ci: '性格开朗，喜欢和朋友聊天。',
}

function moNiHuiDa(json: string): void {
  vi.mocked(按配置调用).mockResolvedValueOnce({ neiRong: json } as unknown as 调用结果)
}

function zhengQueJSON(): string {
  return JSON.stringify({
    zong_pan_ding: 'tongGuo',
    biao_ji: [],
    zi_duan_pan_ding: {
      wei_xin_ming: { pan_ding: 'tongGuo', yuan_yin_ma: null },
      zhen_shi_ming: { pan_ding: 'tongGuo', yuan_yin_ma: null },
      tong_yong_ti_shi_ci: { pan_ding: 'tongGuo', yuan_yin_ma: null, bao_liu_pian_duan: [] },
    },
  })
}

describe('归一化只作用于键名', () => {
  it('ding 系拼错键递归归一，正确键保持', () => {
    const yuan = {
      zong_pan_duing: 'tongGuo',
      zi_duan_pan_duing: {
        wei_xin_ming: { pan_duing: 'tongGuo', yuan_yin_ma: null },
      },
      bao_liu_pian_duan: ['保留片段'],
      biao_ji: [],
    }
    expect(guiYiShenHeJianMing(yuan)).toEqual({
      zong_pan_ding: 'tongGuo',
      zi_duan_pan_ding: {
        wei_xin_ming: { pan_ding: 'tongGuo', yuan_yin_ma: null },
      },
      bao_liu_pian_duan: ['保留片段'],
      biao_ji: [],
    })
  })

  it('值里的 duing 文本与 duan 系键名不被误伤', () => {
    const yuan = {
      zong_pan_ding: 'tongGuo',
      bao_liu_pian_duan: ['保留 duing 原文'],
      nei_rong: '这里 duing 是值不是键',
    }
    expect(guiYiShenHeJianMing(yuan)).toEqual(yuan)
  })

  it('数组内对象的键逐项递归归一，标量原样返回', () => {
    expect(guiYiShenHeJianMing([{ pan_duing: 'tongGuo' }, 3, null, 'duing'])).toEqual([
      { pan_ding: 'tongGuo' },
      3,
      null,
      'duing',
    ])
    expect(guiYiShenHeJianMing('duing')).toBe('duing')
    expect(guiYiShenHeJianMing(null)).toBe(null)
  })

  it('完全正确的键名对象与原对象深度相等', () => {
    const yuan = {
      zong_pan_ding: 'tongGuo',
      biao_ji: [],
      zi_duan_pan_ding: { wei_xin_ming: { pan_ding: 'tongGuo', yuan_yin_ma: null } },
    }
    expect(guiYiShenHeJianMing(yuan)).toEqual(yuan)
  })
})

describe('审核解析链键名容错（FP-07）', () => {
  beforeEach(() => {
    vi.mocked(按配置调用).mockReset()
  })

  it('顶层 zong_pan_duing 拼错时归一并通过', async () => {
    moNiHuiDa(
      JSON.stringify({
        zong_pan_duing: 'tongGuo',
        biao_ji: [],
        zi_duan_pan_ding: {
          wei_xin_ming: { pan_ding: 'tongGuo', yuan_yin_ma: null },
        },
      }),
    )
    expect((await caiJueRenShe(HeFaZiDuan)).jieLun).toBe('tongGuo')
  })

  it('嵌套 zi_duan_pan_ding 子键 pan_duing 拼错时归一并通过', async () => {
    moNiHuiDa(
      JSON.stringify({
        zong_pan_ding: 'tongGuo',
        biao_ji: [],
        zi_duan_pan_ding: {
          wei_xin_ming: { pan_duing: 'tongGuo', yuan_yin_ma: null },
          zhen_shi_ming: { pan_duing: 'tongGuo', yuan_yin_ma: null },
          tong_yong_ti_shi_ci: { pan_duing: 'tongGuo', yuan_yin_ma: null, bao_liu_pian_duan: [] },
        },
      }),
    )
    expect((await caiJueRenShe(HeFaZiDuan)).jieLun).toBe('tongGuo')
  })

  it('zi_duan_pan_ding 键名拼错时归一并通过', async () => {
    moNiHuiDa(
      JSON.stringify({
        zong_pan_ding: 'tongGuo',
        biao_ji: [],
        zi_duan_pan_duing: {
          wei_xin_ming: { pan_ding: 'tongGuo', yuan_yin_ma: null },
        },
      }),
    )
    expect((await caiJueRenShe(HeFaZiDuan)).jieLun).toBe('tongGuo')
  })

  it('正确键名不受影响仍通过', async () => {
    moNiHuiDa(zhengQueJSON())
    expect((await caiJueRenShe(HeFaZiDuan)).jieLun).toBe('tongGuo')
  })

  it('归一半的结果（顶层与嵌套各错一处）经校验后通过', async () => {
    moNiHuiDa(
      JSON.stringify({
        zong_pan_duing: 'tongGuo',
        biao_ji: [],
        zi_duan_pan_ding: {
          wei_xin_ming: { pan_duing: 'tongGuo', yuan_yin_ma: null },
          zhen_shi_ming: { pan_ding: 'tongGuo', yuan_yin_ma: null },
          tong_yong_ti_shi_ci: { pan_ding: 'tongGuo', yuan_yin_ma: null, bao_liu_pian_duan: [] },
        },
      }),
    )
    expect((await caiJueRenShe(HeFaZiDuan)).jieLun).toBe('tongGuo')
  })

  it('buFen 场景归一后片段保留逻辑仍生效', async () => {
    moNiHuiDa(
      JSON.stringify({
        zong_pan_duing: 'buFen',
        biao_ji: [],
        zi_duan_pan_ding: {
          tong_yong_ti_shi_ci: {
            pan_duing: 'buFen',
            yuan_yin_ma: null,
            bao_liu_pian_duan: ['性格开朗的小伙子。'],
          },
        },
      }),
    )
    const jieGuo = await caiJueRenShe(HeFaZiDuan)
    expect(jieGuo.jieLun).toBe('buFenCaiNa')
    expect(jieGuo.baoLiuPianDuan).toEqual(['性格开朗的小伙子。'])
  })
})
