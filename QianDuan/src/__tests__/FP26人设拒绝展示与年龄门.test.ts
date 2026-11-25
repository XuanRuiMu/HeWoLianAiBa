import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const shengChengJiaoSeMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/聊天', () => ({
  shengChengJiaoSe: (...canShu: unknown[]) => shengChengJiaoSeMock(...canShu),
  queRenJiaoSe: vi.fn(),
  chuangJianHuiHua: vi.fn(),
}))

vi.mock('@/composables/use聊天预加载', () => ({
  预加载聊天页: vi.fn(async () => true),
}))

import { 使用角色生成仓库 } from '@/stores/角色生成'
import { 使用进入聊天加载 } from '@/composables/use进入聊天加载'
import type { 生成流程资料 } from '@/stores/角色生成'

const ZiLiao: 生成流程资料 = {
  xingBie: 'male',
  muBiaoXingBie: 'female',
  xingGeXuanZe: 'INFP',
  yunXuZhaNanZhaNv: false,
  随机性格标记: false,
  xinMuZhongDeTa: {
    weiXinMing: '',
    zhenShiMing: '',
    nianLing: '20',
    tongYongTiShiCi: '喜欢睡觉的女孩子',
  },
  moshi: 'putong',
  woDeXingBie: 'male',
}

describe('FP-26 人设拒绝展示', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    shengChengJiaoSeMock.mockReset()
  })

  it('审核拒绝时仓库存服务端文案并标记为拒绝', async () => {
    const 仓库 = 使用角色生成仓库()
    shengChengJiaoSeMock.mockRejectedValue({
      response: {
        data: {
          cheng_gong: false,
          ti_shi: '真实姓名需要是「姓氏+名」的形式，比如王小明、钱多多',
          cuo_wu_ma: 'ROLE_GENERATION_PERSONA_REJECTED',
        },
      },
    })
    仓库.kaiShiLiuCheng(ZiLiao)
    await 仓库.等待完成()
    expect(仓库.zhuangTai).toBe('shi_bai')
    expect(仓库.shiFouShenHeJuJue).toBe(true)
    expect(仓库.cuoWuXinXi).toContain('姓氏')
  })

  it('非拒绝失败不标记拒绝且用通用文案', async () => {
    const 仓库 = 使用角色生成仓库()
    shengChengJiaoSeMock.mockRejectedValue(new Error('network down'))
    仓库.kaiShiLiuCheng(ZiLiao)
    await 仓库.等待完成()
    expect(仓库.zhuangTai).toBe('shi_bai')
    expect(仓库.shiFouShenHeJuJue).toBe(false)
    expect(仓库.cuoWuXinXi).not.toContain('姓氏')
  })

  it('重新开始流程时清除拒绝标记', async () => {
    const 仓库 = 使用角色生成仓库()
    shengChengJiaoSeMock.mockRejectedValue({
      response: { data: { ti_shi: '年龄需要是10到99之间的整数', cuo_wu_ma: 'ROLE_GENERATION_PERSONA_REJECTED' } },
    })
    仓库.kaiShiLiuCheng(ZiLiao)
    await 仓库.等待完成()
    expect(仓库.shiFouShenHeJuJue).toBe(true)
    shengChengJiaoSeMock.mockResolvedValue({
      id: '6ef2a94a-67be-4e9b-9c93-f0a2c9df6f21',
      wei_xin_ming: '小懒猫',
      xing_bie: 'nv',
      yao_kai_kou: false,
    })
    仓库.kaiShiLiuCheng(ZiLiao)
    expect(仓库.shiFouShenHeJuJue).toBe(false)
  })
})

describe('FP-26 加载页可重试支持函数形式', () => {
  it('可重试为函数时按函数结果判定', () => {
    const juJue = ref(true)
    const jiaZai = 使用进入聊天加载({
      场景: () => 'puTong',
      趣味语列表: () => ['a'],
      错误文案: () => 'e',
      执行: async () => {},
      完成: () => {},
      可重试: () => !juJue.value,
    })
    expect(jiaZai.可重试.value).toBe(false)
    juJue.value = false
    expect(jiaZai.可重试.value).toBe(true)
  })

  it('缺省时可重试为真', () => {
    const jiaZai = 使用进入聊天加载({
      场景: () => 'puTong',
      趣味语列表: () => ['a'],
      错误文案: () => 'e',
      执行: async () => {},
      完成: () => {},
    })
    expect(jiaZai.可重试.value).toBe(true)
  })
})

describe('FP-26 心目中的TA年龄门（纯逻辑）', () => {
  it('年龄输入 10~99 之外的值在失焦时被夹回界内', () => {
    const jiaZai = (wenBen: string): string => {
      if (!wenBen) return ''
      const shu = Number(wenBen)
      if (!Number.isFinite(shu)) return ''
      return String(Math.max(10, Math.min(99, Math.round(shu))))
    }
    expect(jiaZai('8')).toBe('10')
    expect(jiaZai('120')).toBe('99')
    expect(jiaZai('25')).toBe('25')
    expect(jiaZai('')).toBe('')
    expect(jiaZai('abc')).toBe('')
  })
})
