import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
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

import { faSongMa, jianChaShouJiHao, dengLu, huoQuYongHuXinXi } from '@/api/认证'

describe('登录内容组件', () => {
  function chuangJianLuYou() {
    return createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
        { path: '/login', name: 'dengLu', component: 登录内容 },
      ],
    })
  }

  async function mountZuJian(moShi: 'dengLu' | 'zhuCe' = 'dengLu') {
    const luYou = chuangJianLuYou()
    const pinia = createPinia()
    setActivePinia(pinia)
    const biaoDanCangKu = 使用认证表单仓库()
    biaoDanCangKu.moShi = moShi

    const wrapper = mount(登录内容, {
      global: {
        plugins: [pinia, luYou],
      },
      attachTo: document.body,
    })
    await luYou.isReady()
    await flushPromises()
    return { wrapper, luYou }
  }

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.resetAllMocks()
  })

  it('使用翻译文件渲染登录标题', () => {
    const biaoTi = huoQuFanYi('renZheng', 'yingYongMing')
    expect(biaoTi).toBe('和我恋爱吧')
  })

  it('登录按钮在手机号格式错误时应禁用', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const shouJiHaoInput = wrapper.find('#denglu-shoujihao')
    const miMaInput = wrapper.find('#denglu-mima')

    await shouJiHaoInput.setValue('12345')
    await miMaInput.setValue('password')
    await flushPromises()

    const dengLuAnNiu = wrapper.find('form button[type="submit"]')
    expect(dengLuAnNiu.attributes('disabled')).toBeDefined()
  })

  it('登录按钮在合法手机号和密码时不应禁用', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const shouJiHaoInput = wrapper.find('#denglu-shoujihao')
    const miMaInput = wrapper.find('#denglu-mima')

    await shouJiHaoInput.setValue('13800138000')
    await miMaInput.setValue('password123')
    await flushPromises()

    const dengLuAnNiu = wrapper.find('form button[type="submit"]')
    expect(dengLuAnNiu.attributes('disabled')).toBeUndefined()
  })

  it('未勾选用户协议时注册按钮禁用', async () => {
    const { wrapper } = await mountZuJian('zhuCe')

    const shouJiHaoInput = wrapper.find('#zhuce-shoujihao')
    const yanZhengMaInput = wrapper.find('#zhuce-yanzhengma')
    const yongHuMingInput = wrapper.find('#zhuce-yonghuming')
    const miMaInput = wrapper.find('#zhuce-mima')

    expect(shouJiHaoInput.exists()).toBe(true)

    await shouJiHaoInput.setValue('13800138000')
    await yanZhengMaInput.setValue('123456')
    await yongHuMingInput.setValue('测试用户')
    await miMaInput.setValue('password123')
    await flushPromises()

    const zhuCeAnNiu = wrapper.find('form button[type="submit"]')
    expect(zhuCeAnNiu.attributes('disabled')).toBeDefined()
  })

  it('60秒内重复请求验证码：按钮禁用并显示倒计时', async () => {
    vi.useFakeTimers()
    vi.mocked(jianChaShouJiHao).mockResolvedValue({ yi_zhu_ce: false })
    vi.mocked(faSongMa).mockResolvedValue(undefined)

    const { wrapper } = await mountZuJian('zhuCe')

    const shouJiHaoInput = wrapper.find('#zhuce-shoujihao')
    await shouJiHaoInput.setValue('13800138000')

    const faSongAnNiu = wrapper.find('.fasong-anniu')
    await faSongAnNiu.trigger('click')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(faSongAnNiu.attributes('disabled')).toBeDefined()
    vi.useRealTimers()
  })

  it('登录成功后路由跳转到主页路径', async () => {
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
        guan_li_yuan: false,
        huo_yue_ren_she_id: null,
        hai_wang_fen_shu: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
        geng_xin_shi_jian: new Date().toISOString(),
      }

      vi.mocked(dengLu).mockResolvedValue({
        令牌: 'test-token',
        用户: ceShiYongHu,
        新用户: false,
        是否管理员: false,
      })
      vi.mocked(huoQuYongHuXinXi).mockResolvedValue(ceShiYongHu)

      const { wrapper, luYou } = await mountZuJian('dengLu')

      const shouJiHaoInput = wrapper.find('#denglu-shoujihao')
      const miMaInput = wrapper.find('#denglu-mima')
      await shouJiHaoInput.setValue('13800138000')
      await miMaInput.setValue('password123')
      await flushPromises()

      const dengLuAnNiu = wrapper.find('form button[type="submit"]')
      await dengLuAnNiu.trigger('submit')
      await flushPromises()

      expect(luYou.currentRoute.value.path).toBe('/')
    } finally {
      Element.prototype.animate = yuanShiAnimate
    }
  })

  it('登录表单包含记住账号/记住密码/自动登录三个复选框', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const xuanXiang = wrapper.findAll('.ji-zhu-xuan-ze')
    expect(xuanXiang.length).toBe(3)

    const wenBen = xuanXiang.map((item) => item.text())
    expect(wenBen).toContain(huoQuFanYi('renZheng', 'jiZhuZhangHao'))
    expect(wenBen).toContain(huoQuFanYi('renZheng', 'jiZhuMiMa'))
    expect(wenBen).toContain(huoQuFanYi('renZheng', 'ziDongDengLu'))

    const fuXuan = wrapper.findAll('.ji-zhu-fu-xuan')
    expect(fuXuan.length).toBe(3)
  })

  it('自动登录未勾选记住密码时禁用', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const fuXuan = wrapper.findAll('.ji-zhu-fu-xuan')
    expect((fuXuan[2].element as HTMLInputElement).disabled).toBe(true)

    await fuXuan[1].setValue(true)
    await flushPromises()
    expect((fuXuan[2].element as HTMLInputElement).disabled).toBe(false)
  })

  it('级联：勾选自动登录自动勾选记住密码与记住账号', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const fuXuan = wrapper.findAll('.ji-zhu-fu-xuan')

    await fuXuan[1].setValue(true)
    await flushPromises()
    await fuXuan[2].setValue(true)
    await flushPromises()

    expect((fuXuan[0].element as HTMLInputElement).checked).toBe(true)
    expect((fuXuan[1].element as HTMLInputElement).checked).toBe(true)
    expect((fuXuan[2].element as HTMLInputElement).checked).toBe(true)
  })

  it('级联：取消记住账号同时取消记住密码与自动登录', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const fuXuan = wrapper.findAll('.ji-zhu-fu-xuan')

    await fuXuan[1].setValue(true)
    await flushPromises()
    await fuXuan[2].setValue(true)
    await flushPromises()
    await fuXuan[0].setValue(false)
    await flushPromises()

    expect((fuXuan[1].element as HTMLInputElement).checked).toBe(false)
    expect((fuXuan[2].element as HTMLInputElement).checked).toBe(false)
  })

  it('勾选记住密码登录：令牌写入 localStorage 且绝不明文存密码', async () => {
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
        guan_li_yuan: false,
        huo_yue_ren_she_id: null,
        hai_wang_fen_shu: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
        geng_xin_shi_jian: new Date().toISOString(),
      }

      vi.mocked(dengLu).mockResolvedValue({
        令牌: 'test-token',
        用户: ceShiYongHu,
        新用户: false,
        是否管理员: false,
      })
      vi.mocked(huoQuYongHuXinXi).mockResolvedValue(ceShiYongHu)

      const { wrapper } = await mountZuJian('dengLu')

      const shouJiHaoInput = wrapper.find('#denglu-shoujihao')
      const miMaInput = wrapper.find('#denglu-mima')
      await shouJiHaoInput.setValue('13800138000')
      await miMaInput.setValue('password123')
      await flushPromises()

      const xuanZe = wrapper.findAll('.ji-zhu-xuan-ze')
      const fuXuan = xuanZe[1].find('input')
      await fuXuan.setValue(true)
      await flushPromises()

      const dengLuAnNiu = wrapper.find('form button[type="submit"]')
      await dengLuAnNiu.trigger('submit')
      await flushPromises()

      // 记住密码 = 令牌持久化，localStorage 中不得出现明文密码
      expect(localStorage.getItem('hewolianba_baoCunZhangHao')).toBe(JSON.stringify('13800138000'))
      expect(localStorage.getItem('hewolianba_baoCunMiMa')).toBeNull()
      expect(localStorage.getItem('hewolianba_jiZhuZhangHao')).toBe('true')
      expect(localStorage.getItem('hewolianba_jiZhuMiMa')).toBe('true')
      expect(localStorage.getItem('hewolianba_ziDongDengLu')).toBe('false')
      expect(localStorage.getItem('令牌')).toBe('test-token')
      expect(sessionStorage.getItem('令牌')).toBeNull()
    } finally {
      Element.prototype.animate = yuanShiAnimate
    }
  })

  it('未勾选记住密码登录：令牌仅写入 sessionStorage', async () => {
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
        guan_li_yuan: false,
        huo_yue_ren_she_id: null,
        hai_wang_fen_shu: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
        geng_xin_shi_jian: new Date().toISOString(),
      }

      vi.mocked(dengLu).mockResolvedValue({
        令牌: 'test-token',
        用户: ceShiYongHu,
        新用户: false,
        是否管理员: false,
      })
      vi.mocked(huoQuYongHuXinXi).mockResolvedValue(ceShiYongHu)

      const { wrapper } = await mountZuJian('dengLu')

      const shouJiHaoInput = wrapper.find('#denglu-shoujihao')
      const miMaInput = wrapper.find('#denglu-mima')
      await shouJiHaoInput.setValue('13800138000')
      await miMaInput.setValue('password123')
      await flushPromises()

      const dengLuAnNiu = wrapper.find('form button[type="submit"]')
      await dengLuAnNiu.trigger('submit')
      await flushPromises()

      expect(localStorage.getItem('令牌')).toBeNull()
      expect(sessionStorage.getItem('令牌')).toBe('test-token')
      expect(localStorage.getItem('hewolianba_jiZhuMiMa')).toBe('false')
      expect(localStorage.getItem('hewolianba_baoCunMiMa')).toBeNull()
    } finally {
      Element.prototype.animate = yuanShiAnimate
    }
  })

  it('store 在取消记住账号时删除已保存数据', () => {
    localStorage.setItem('hewolianba_baoCunZhangHao', JSON.stringify('13800138000'))
    localStorage.setItem('hewolianba_baoCunMiMa', JSON.stringify('password123'))

    const pinia = createPinia()
    setActivePinia(pinia)
    const biaoDanCangKu = 使用认证表单仓库()
    biaoDanCangKu.sheZhiJiZhuZhangHaoMiMa('13800138000', 'password123', false, false, false)

    expect(localStorage.getItem('hewolianba_baoCunZhangHao')).toBeNull()
    // 历史遗留的明文密码一并清除
    expect(localStorage.getItem('hewolianba_baoCunMiMa')).toBeNull()
    expect(localStorage.getItem('hewolianba_jiZhuZhangHao')).toBe('false')
    expect(localStorage.getItem('hewolianba_jiZhuMiMa')).toBe('false')
    expect(localStorage.getItem('hewolianba_ziDongDengLu')).toBe('false')
  })

  it('登录表单仅含一组账号密码字段（禁多密码启发式警告）', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const form = wrapper.find('form')
    expect(form.exists()).toBe(true)
    expect(form.findAll('input[type="password"]').length).toBe(1)
    expect(wrapper.find('#denglu-shoujihao').attributes('autocomplete')).toBe('username')
    expect(wrapper.find('#denglu-mima').attributes('autocomplete')).toBe('current-password')
  })

  it('组件加载时仅回填记住的账号（密码不再持久化）', async () => {
    localStorage.setItem('hewolianba_baoCunZhangHao', JSON.stringify('13800138000'))
    localStorage.setItem('hewolianba_jiZhuZhangHao', 'true')

    const { wrapper } = await mountZuJian('dengLu')
    const biaoDanCangKu = 使用认证表单仓库()
    biaoDanCangKu.jiaZaiJiZhuSheZhi()
    await flushPromises()

    const shouJiHaoInput = wrapper.find('#denglu-shoujihao')
    const xuanZe = wrapper.findAll('.ji-zhu-xuan-ze')

    expect((shouJiHaoInput.element as HTMLInputElement).value).toBe('13800138000')
    expect((xuanZe[0].find('input').element as HTMLInputElement).checked).toBe(true)
  })

  it('FP-02：空态标签不浮、有值上浮（登录密码）', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const miMaZu = wrapper.find('#denglu-mima').element.closest('.shuru-zu')
    expect(miMaZu?.classList.contains('shangFu')).toBe(false)
    await wrapper.find('#denglu-mima').setValue('mima123')
    await flushPromises()
    expect(miMaZu?.classList.contains('shangFu')).toBe(true)
    await wrapper.find('#denglu-mima').setValue('')
    await flushPromises()
    expect(miMaZu?.classList.contains('shangFu')).toBe(false)
  })

  it('FP-02：聚焦上浮、失焦空态回落（登录密码）', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const miMaInput = wrapper.find('#denglu-mima')
    const miMaZu = miMaInput.element.closest('.shuru-zu')
    await miMaInput.trigger('focus')
    await flushPromises()
    expect(miMaZu?.classList.contains('shangFu')).toBe(true)
    await miMaInput.trigger('blur')
    await flushPromises()
    expect(miMaZu?.classList.contains('shangFu')).toBe(false)
  })

  it('FP-02：自动填充与程序回填均上浮（登录密码）', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const miMaInput = wrapper.find('#denglu-mima')
    const miMaZu = miMaInput.element.closest('.shuru-zu')
    const yuanSu = miMaInput.element as HTMLInputElement
    yuanSu.value = 'ziDongTianChongMiMa'
    await miMaInput.trigger('input')
    await flushPromises()
    expect(miMaZu?.classList.contains('shangFu')).toBe(true)
    const dongHua = new Event('animationstart', { bubbles: true }) as Event & { animationName: string }
    dongHua.animationName = 'ziDongTianChongKaiShi'
    yuanSu.dispatchEvent(dongHua)
    await flushPromises()
    expect(miMaZu?.classList.contains('shangFu')).toBe(true)
  })

  it('FP-02：显隐切换保持上浮且值不丢（登录/注册一致）', async () => {
    const { wrapper: dengLuWrapper } = await mountZuJian('dengLu')
    const dengLuMiMa = dengLuWrapper.find('#denglu-mima')
    await dengLuMiMa.setValue('qieHuanBaoChi123')
    await flushPromises()
    const qieHuan1 = dengLuWrapper.find('.mima-qiehuan')
    expect((dengLuMiMa.element as HTMLInputElement).type).toBe('password')
    await qieHuan1.trigger('click')
    await flushPromises()
    expect((dengLuMiMa.element as HTMLInputElement).type).toBe('text')
    expect((dengLuMiMa.element as HTMLInputElement).value).toBe('qieHuanBaoChi123')
    expect(dengLuMiMa.element.closest('.shuru-zu')?.classList.contains('shangFu')).toBe(true)
    await qieHuan1.trigger('click')
    await flushPromises()
    expect((dengLuMiMa.element as HTMLInputElement).type).toBe('password')
    expect(dengLuMiMa.element.closest('.shuru-zu')?.classList.contains('shangFu')).toBe(true)

    const { wrapper: zhuCeWrapper } = await mountZuJian('zhuCe')
    const zhuCeMiMa = zhuCeWrapper.find('#zhuce-mima')
    expect(zhuCeMiMa.element.closest('.shuru-zu')?.classList.contains('shangFu')).toBe(false)
    await zhuCeMiMa.setValue('zhuCeQieHuan123')
    await flushPromises()
    expect(zhuCeMiMa.element.closest('.shuru-zu')?.classList.contains('shangFu')).toBe(true)
    const qieHuan2 = zhuCeWrapper.find('.mima-qiehuan')
    await qieHuan2.trigger('click')
    await flushPromises()
    expect((zhuCeMiMa.element as HTMLInputElement).type).toBe('text')
    expect(zhuCeMiMa.element.closest('.shuru-zu')?.classList.contains('shangFu')).toBe(true)
  })
})
