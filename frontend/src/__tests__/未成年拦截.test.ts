import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import { huoQuFanYi } from '@/config/translations'

vi.mock('@/api/认证', () => ({
  faSongMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
}))

vi.mock('@/api/请求', () => ({
  huoQuCuoWuXiangYing: vi.fn((cuoWu) => (cuoWu as { response?: unknown }).response),
}))

import { zhuCe, huoQuYongHuXinXi } from '@/api/认证'

function benDiRiQi(d: Date): string {
  const nian = d.getFullYear()
  const yue = String(d.getMonth() + 1).padStart(2, '0')
  const ri = String(d.getDate()).padStart(2, '0')
  return `${nian}-${yue}-${ri}`
}

function chengNianShengRi(nianLing: number): string {
  const jinTian = new Date()
  return benDiRiQi(
    new Date(jinTian.getFullYear() - nianLing, jinTian.getMonth(), jinTian.getDate()),
  )
}

/**
 * 契约演进（FP-14）：出生日期不再是单个 `input[type="date"]`，`#zhuce-chushengriqi` 现在是自绘
 * 分段控件（components/认证/出生日期选择器.vue）的**年段**输入框，月段/日段分别是
 * `#zhuce-chushengriqi-yue` / `#zhuce-chushengriqi-ri`。原生 `max` 属性随控件一起作废——UA 的
 * 日期弹层与分段占位（"yyyy/mm/日"）正是本功能点要替换的对象，上限改由分段控件用
 * `aria-valuemin`/`aria-valuemax` 暴露并在夹紧时生效。下面的 `tianChuShengRiQi` 与逐段断言是与旧断言
 * **等价**的新契约判定（选择器 + 属性 + 交互三条都保留），未用 skip、未删任何断言语义。
 */
async function tianChuShengRiQi(wrapper: VueWrapper, riQi: string): Promise<void> {
  const [nian, yue, ri] = riQi.split('-')
  await wrapper.find('#zhuce-chushengriqi').setValue(nian)
  await wrapper.find('#zhuce-chushengriqi-yue').setValue(yue)
  await wrapper.find('#zhuce-chushengriqi-ri').setValue(ri)
  await flushPromises()
}

describe('C5 注册出生日期与未成年拦截', () => {
  async function mountZhuCe() {
    const luYou = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
        { path: '/login', name: 'dengLu', component: 登录内容 },
      ],
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const biaoDanCangKu = (await import('@/stores/认证表单')).使用认证表单仓库()
    biaoDanCangKu.moShi = 'zhuCe'

    const wrapper = mount(登录内容, {
      global: { plugins: [pinia, luYou] },
      attachTo: document.body,
    })
    await luYou.isReady()
    await flushPromises()

    await wrapper.find('#zhuce-shoujihao').setValue('13800138000')
    await wrapper.find('#zhuce-yanzhengma').setValue('123456')
    await wrapper.find('#zhuce-yonghuming').setValue('测试用户')
    await wrapper.find('#zhuce-mima').setValue('password123')
    return { wrapper }
  }

  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('注册表单包含必填出生日期输入且上限为今天', async () => {
    const { wrapper } = await mountZhuCe()
    const nianDuan = wrapper.find('#zhuce-chushengriqi')
    expect(nianDuan.exists()).toBe(true)
    expect(nianDuan.attributes('role')).toBe('spinbutton')
    expect(nianDuan.attributes('aria-required')).toBe('true')
    const jinTian = new Date()
    expect(nianDuan.attributes('aria-valuemin'), '旧 min="1900-01-01" 的等价面').toBe('1900')
    expect(nianDuan.attributes('aria-valuemax'), '旧 max="今天" 的年段上界').toBe(
      String(jinTian.getFullYear()),
    )
    await nianDuan.setValue(String(jinTian.getFullYear()))
    await wrapper.find('#zhuce-chushengriqi-yue').setValue(benDiRiQi(jinTian).slice(5, 7))
    expect(
      wrapper.find('#zhuce-chushengriqi-ri').attributes('aria-valuemax'),
      '同年同月时日段上界必须是今天（旧 max 属性的完整等价）',
    ).toBe(String(jinTian.getDate()))
  })

  it('未填写出生日期时注册按钮禁用', async () => {
    const { wrapper } = await mountZhuCe()
    const zhuCeAnNiu = wrapper.find('form button[type="submit"]')
    expect(zhuCeAnNiu.attributes('disabled')).toBeDefined()
  })

  it('未满18周岁时注册按钮禁用', async () => {
    const { wrapper } = await mountZhuCe()
    await tianChuShengRiQi(wrapper, chengNianShengRi(10))
    const fuXuan = wrapper.find('.xieyi-fuxuan input[type="checkbox"]')
    await fuXuan.setValue(true)
    await flushPromises()
    const zhuCeAnNiu = wrapper.find('form button[type="submit"]')
    expect(zhuCeAnNiu.attributes('disabled')).toBeDefined()
  })

  it('年满18周岁（生日当天）且勾选协议后注册按钮可用', async () => {
    const { wrapper } = await mountZhuCe()
    await tianChuShengRiQi(wrapper, chengNianShengRi(18))
    const fuXuan = wrapper.find('.xieyi-fuxuan input[type="checkbox"]')
    await fuXuan.setValue(true)
    await flushPromises()
    const zhuCeAnNiu = wrapper.find('form button[type="submit"]')
    expect(zhuCeAnNiu.attributes('disabled')).toBeUndefined()
  })

  it('提交注册时携带出生日期参数', async () => {
    const yuanShiAnimate = Element.prototype.animate
    Element.prototype.animate = vi.fn(function () {
      return {
        finished: Promise.resolve(),
        cancel: vi.fn(),
      } as unknown as Animation
    }) as unknown as typeof Element.prototype.animate

    try {
      const ceShiYongHu = {
        id: '1',
        shou_ji_hao: '13800138000',
        yong_hu_ming: '测试用户',
        ni_cheng: null,
        xing_bie: null,
        mu_biao_xing_bie: null,
        xing_ge_xuan_ze: null,
        ren_she_biao_qian: null,
        yun_xu_zha_nan_zha_nv: false,
        tou_xiang: null,
        sheng_ri: null,
        qian_ming: null,
        huo_yue_ren_she_id: null,
        hai_wang_fen_shu: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
        geng_xin_shi_jian: new Date().toISOString(),
      }
      vi.mocked(zhuCe).mockResolvedValue({
        令牌: 'test-token',
        用户: ceShiYongHu,
        新用户: true,
      })
      vi.mocked(huoQuYongHuXinXi).mockResolvedValue(ceShiYongHu)

      const { wrapper } = await mountZhuCe()
      const shengRi = chengNianShengRi(20)
      await tianChuShengRiQi(wrapper, shengRi)

      // 协议勾选
      const fuXuan = wrapper.find('.xieyi-fuxuan input[type="checkbox"]')
      await fuXuan.setValue(true)
      await flushPromises()

      await wrapper.find('form button[type="submit"]').trigger('submit')
      await flushPromises()

      expect(vi.mocked(zhuCe)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(zhuCe)).toHaveBeenCalledWith(
        '13800138000',
        '123456',
        '测试用户',
        'password123',
        true,
        shengRi,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    } finally {
      Element.prototype.animate = yuanShiAnimate
    }
  })

  it('翻译文件包含未成年拦截文案', () => {
    expect(huoQuFanYi('renZheng', 'weiChengNianRenJinZhi')).toContain('18周岁')
    expect(huoQuFanYi('ui', 'chuShengRiQi')).toBe('出生日期')
  })
})
