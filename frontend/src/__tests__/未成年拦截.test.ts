import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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
    const shengRiInput = wrapper.find('#zhuce-chushengriqi')
    expect(shengRiInput.exists()).toBe(true)
    expect(shengRiInput.attributes('max')).toBe(benDiRiQi(new Date()))
  })

  it('未填写出生日期时注册按钮禁用', async () => {
    const { wrapper } = await mountZhuCe()
    const zhuCeAnNiu = wrapper.find('form button[type="submit"]')
    expect(zhuCeAnNiu.attributes('disabled')).toBeDefined()
  })

  it('未满18周岁时注册按钮禁用', async () => {
    const { wrapper } = await mountZhuCe()
    await wrapper.find('#zhuce-chushengriqi').setValue(chengNianShengRi(10))
    const fuXuan = wrapper.find('.xieyi-fuxuan input[type="checkbox"]')
    await fuXuan.setValue(true)
    await flushPromises()
    const zhuCeAnNiu = wrapper.find('form button[type="submit"]')
    expect(zhuCeAnNiu.attributes('disabled')).toBeDefined()
  })

  it('年满18周岁（生日当天）且勾选协议后注册按钮可用', async () => {
    const { wrapper } = await mountZhuCe()
    await wrapper.find('#zhuce-chushengriqi').setValue(chengNianShengRi(18))
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
      await wrapper.find('#zhuce-chushengriqi').setValue(shengRi)

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
