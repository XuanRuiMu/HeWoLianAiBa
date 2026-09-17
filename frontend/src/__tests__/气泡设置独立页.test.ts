import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import XuanZeQi from '@/components/气泡主题选择器.vue'
import QiPaoSheZhiYe from '@/views/气泡设置.vue'
import {
  QI_PAO_YU_SHE_XUAN_XIANG,
  huoQuQiPaoCSSBianLiang,
} from '@/config/气泡主题'
import { QI_PAO_MING_CHENG_WEN_AN, QI_PAO_WEN_AN } from '@/config/气泡主题文案'
import { 使用用户设置仓库 } from '@/stores/用户设置'

vi.mock('@/api/社交', () => ({
  huoQuYongHuSheZhi: vi.fn(),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  baoCunQiPao: vi.fn().mockResolvedValue(undefined),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
}))

describe('FP-03气泡独立页双槽DOM', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('文案单源与主题预设同源且无硬编码残留', () => {
    expect(Object.keys(QI_PAO_MING_CHENG_WEN_AN)).toHaveLength(QI_PAO_YU_SHE_XUAN_XIANG.length)
    for (const yuShe of QI_PAO_YU_SHE_XUAN_XIANG) {
      expect(QI_PAO_MING_CHENG_WEN_AN[yuShe].length).toBeGreaterThan(0)
    }
    expect(QI_PAO_WEN_AN.biaoTi.length).toBeGreaterThan(0)
    expect(QI_PAO_WEN_AN.ziJiBiaoTi.length).toBeGreaterThan(0)
    expect(QI_PAO_WEN_AN.aiBiaoTi.length).toBeGreaterThan(0)
  })

  it('选择器双分组各渲染全量预设且角色正确', () => {
    const wrapper = mount(XuanZeQi)
    const zu = wrapper.findAll('[role="radiogroup"]')
    expect(zu).toHaveLength(2)
    const anNiu = wrapper.findAll('[role="radio"]')
    expect(anNiu).toHaveLength(QI_PAO_YU_SHE_XUAN_XIANG.length * 2)
    expect(wrapper.text()).toContain(QI_PAO_WEN_AN.ziJiBiaoTi)
    expect(wrapper.text()).toContain(QI_PAO_WEN_AN.aiBiaoTi)
  })

  it('点击分别切换自己与AI槽并落云端', async () => {
    const sheJiao = await import('@/api/社交')
    const wrapper = mount(XuanZeQi)
    const 仓库 = 使用用户设置仓库()
    const anNiu = wrapper.findAll('[role="radio"]')
    await anNiu[1].trigger('click')
    expect(仓库.qiPaoZiJi).toBe(QI_PAO_YU_SHE_XUAN_XIANG[1])
    expect(vi.mocked(sheJiao.baoCunQiPao)).toHaveBeenCalledWith({ ziJi: QI_PAO_YU_SHE_XUAN_XIANG[1] })
    await anNiu[QI_PAO_YU_SHE_XUAN_XIANG.length + 2].trigger('click')
    expect(仓库.qiPaoAI).toBe(QI_PAO_YU_SHE_XUAN_XIANG[2])
    expect(vi.mocked(sheJiao.baoCunQiPao)).toHaveBeenCalledWith({ ai: QI_PAO_YU_SHE_XUAN_XIANG[2] })
  })

  it('独立页预览双侧绑定CSS变量单源', () => {
    const wrapper = mount(QiPaoSheZhiYe)
    const 仓库 = 使用用户设置仓库()
    const qiWang = huoQuQiPaoCSSBianLiang(仓库.qiPaoZiJi, 仓库.qiPaoAI)
    const gen = wrapper.find('.qipao-she-zhi-ye')
    expect(gen.exists()).toBe(true)
    const style = gen.attributes('style') || ''
    expect(style).toContain('--qipao-ziJi-beiJing')
    expect(style).toContain('--qipao-duiFang-beiJing')
    expect(qiWang['--qipao-ziJi-beiJing']).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(qiWang['--qipao-duiFang-beiJing']).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(wrapper.text()).toContain(QI_PAO_WEN_AN.yuLanLai)
    expect(wrapper.text()).toContain(QI_PAO_WEN_AN.yuLanQu)
  })

  it('好友侧对方偏好回退自身AI气泡不崩', async () => {
    const 仓库 = 使用用户设置仓库()
    const { guiYiHuaQiPao } = await import('@/config/气泡主题')
    const { QI_PAO_AI_MO_REN } = await import('@/config/气泡主题')
    expect(guiYiHuaQiPao(null, 仓库.qiPaoAI)).toBe(仓库.qiPaoAI)
    expect(guiYiHuaQiPao('buCunZai', QI_PAO_AI_MO_REN)).toBe(QI_PAO_AI_MO_REN)
  })
})
