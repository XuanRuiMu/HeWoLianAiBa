import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  QI_PAO_YU_SHE_XUAN_XIANG,
  QI_PAO_YU_SHE_BIAO,
  QI_PAO_ZI_JI_MO_REN,
  QI_PAO_AI_MO_REN,
  guiYiHuaQiPao,
  huoQuQiPaoCSSBianLiang,
  huoQuQiPaoDingYi,
  shiHeFaQiPao,
} from '@/config/气泡主题'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import type { YongHuSheZhi } from '@/api/社交'

vi.mock('@/api/社交', () => ({
  huoQuYongHuSheZhi: vi.fn(),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  baoCunQiPao: vi.fn().mockResolvedValue(undefined),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
}))

function moNiSheZhi(ziJi?: string, ai?: string): YongHuSheZhi {
  return {
    uid: 'uid-1',
    shou_ji_hao: '',
    tou_xiang: null,
    qian_ming: null,
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: 'moRen',
    qi_pao_zi_ji: ziJi,
    qi_pao_ai: ai,
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  }
}

describe('气泡主题单源', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('预设至少5套且含微信绿天空蓝樱粉暗夜柠檬黄', () => {
    expect(QI_PAO_YU_SHE_XUAN_XIANG.length).toBeGreaterThanOrEqual(5)
    for (const biXu of ['weiXinLv', 'tianKongLan', 'yingFen', 'anYe', 'ningMengHuang']) {
      expect(QI_PAO_YU_SHE_XUAN_XIANG).toContain(biXu)
    }
  })

  it('每套预设均有背景色与文本色且为合法HEX', () => {
    for (const yuShe of QI_PAO_YU_SHE_XUAN_XIANG) {
      const dingYi = huoQuQiPaoDingYi(yuShe)
      expect(dingYi.beiJing).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(dingYi.wenBen).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
    expect(Object.keys(QI_PAO_YU_SHE_BIAO)).toHaveLength(QI_PAO_YU_SHE_XUAN_XIANG.length)
  })

  it('非法预设一律拒绝', () => {
    expect(shiHeFaQiPao('buCunZai')).toBe(false)
    expect(shiHeFaQiPao('')).toBe(false)
    expect(shiHeFaQiPao(null)).toBe(false)
    expect(shiHeFaQiPao(undefined)).toBe(false)
    expect(shiHeFaQiPao('#95EC69')).toBe(false)
  })

  it('归一化非法值回退默认', () => {
    expect(guiYiHuaQiPao('tianKongLan', QI_PAO_ZI_JI_MO_REN)).toBe('tianKongLan')
    expect(guiYiHuaQiPao('buCunZai', QI_PAO_ZI_JI_MO_REN)).toBe(QI_PAO_ZI_JI_MO_REN)
    expect(guiYiHuaQiPao(undefined, QI_PAO_AI_MO_REN)).toBe(QI_PAO_AI_MO_REN)
  })

  it('CSS变量单源输出自己与对方四键', () => {
    const bianLiang = huoQuQiPaoCSSBianLiang('tianKongLan', 'anYe')
    expect(bianLiang['--qipao-ziJi-beiJing']).toBe(QI_PAO_YU_SHE_BIAO.tianKongLan.beiJing)
    expect(bianLiang['--qipao-ziJi-wenBen']).toBe(QI_PAO_YU_SHE_BIAO.tianKongLan.wenBen)
    expect(bianLiang['--qipao-duiFang-beiJing']).toBe(QI_PAO_YU_SHE_BIAO.anYe.beiJing)
    expect(bianLiang['--qipao-duiFang-wenBen']).toBe(QI_PAO_YU_SHE_BIAO.anYe.wenBen)
  })

  it('加载云端偏好后双槽同源', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuYongHuSheZhi).mockResolvedValue(moNiSheZhi('yingFen', 'ningMengHuang'))
    const 仓库 = 使用用户设置仓库()
    await 仓库.jiaZai()
    expect(仓库.qiPaoZiJi).toBe('yingFen')
    expect(仓库.qiPaoAI).toBe('ningMengHuang')
    expect(仓库.ziJiQiPaoCSSBianLiang['--qipao-ziJi-beiJing']).toBe(QI_PAO_YU_SHE_BIAO.yingFen.beiJing)
    expect(仓库.ziJiQiPaoCSSBianLiang['--qipao-duiFang-beiJing']).toBe(QI_PAO_YU_SHE_BIAO.ningMengHuang.beiJing)
  })

  it('老云端无气泡字段时回退默认不崩', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuYongHuSheZhi).mockResolvedValue(moNiSheZhi(undefined, undefined))
    const 仓库 = 使用用户设置仓库()
    await 仓库.jiaZai()
    expect(仓库.qiPaoZiJi).toBe(QI_PAO_ZI_JI_MO_REN)
    expect(仓库.qiPaoAI).toBe(QI_PAO_AI_MO_REN)
  })

  it('非法云端值回退默认', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuYongHuSheZhi).mockResolvedValue(moNiSheZhi('buCunZai', 'buCunZai'))
    const 仓库 = 使用用户设置仓库()
    await 仓库.jiaZai()
    expect(仓库.qiPaoZiJi).toBe(QI_PAO_ZI_JI_MO_REN)
    expect(仓库.qiPaoAI).toBe(QI_PAO_AI_MO_REN)
  })

  it('切换自己与AI气泡分别落云端', async () => {
    const sheJiao = await import('@/api/社交')
    const 仓库 = 使用用户设置仓库()
    await 仓库.qieHuanQiPao('ziJi', 'tianKongLan')
    expect(仓库.qiPaoZiJi).toBe('tianKongLan')
    expect(仓库.qiPaoAI).toBe(QI_PAO_AI_MO_REN)
    expect(vi.mocked(sheJiao.baoCunQiPao)).toHaveBeenCalledWith({ ziJi: 'tianKongLan' })
    await 仓库.qieHuanQiPao('ai', 'anYe')
    expect(仓库.qiPaoAI).toBe('anYe')
    expect(vi.mocked(sheJiao.baoCunQiPao)).toHaveBeenCalledWith({ ai: 'anYe' })
  })

  it('切换非法预设直接抛错不落库', async () => {
    const sheJiao = await import('@/api/社交')
    const 仓库 = 使用用户设置仓库()
    await expect(仓库.qieHuanQiPao('ziJi', 'buCunZai' as never)).rejects.toThrow()
    expect(vi.mocked(sheJiao.baoCunQiPao)).not.toHaveBeenCalled()
  })
})
