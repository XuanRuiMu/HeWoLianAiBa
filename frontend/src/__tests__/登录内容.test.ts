import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import 登录内容 from '@/views/登录内容.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { huoQuFanYi } from '@/config/translations'
import { 声明块清单, 按档解析全部, 声明位置 } from './主题令牌真源'
import { 拆分选择器组, 规则清单, 读取全局基线 } from './CSS级联真源'

const 登录内容源码 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
const 认证布局源码 = readFileSync(resolve(__dirname, '../layouts/认证布局.vue'), 'utf8')

/** 只取 <style> 段并剥掉注释：断言针对真实声明，不被解释性注释文字误伤 */
function 样式源码(源码: string): string {
  const 块 = /<style[^>]*>([\s\S]*?)<\/style>/.exec(源码)
  expect(块, '未找到 <style> 段').not.toBeNull()
  return (块 as RegExpMatchArray)[1].replace(/\/\*[\s\S]*?\*\//g, '')
}

const 登录内容样式 = 样式源码(登录内容源码)
const 认证布局样式 = 样式源码(认证布局源码)
const 全局基线样式 = 读取全局基线()

function 样式块(源码: string, 选择器: string): string {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const 匹配 = new RegExp(`${转义}\\s*\\{([^}]*)\\}`).exec(源码)
  expect(匹配, `未找到样式块 ${选择器}`).not.toBeNull()
  return (匹配 as RegExpMatchArray)[1]
}

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
        huo_yue_ren_she_id: null,
        hai_wang_fen_shu: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
        geng_xin_shi_jian: new Date().toISOString(),
      }

      vi.mocked(dengLu).mockResolvedValue({
        令牌: 'test-token',
        用户: ceShiYongHu,
        新用户: false,
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

  it('勾选记住密码登录：令牌写入会话存储且绝不明文存密码', async () => {
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

      vi.mocked(dengLu).mockResolvedValue({
        令牌: 'test-token',
        用户: ceShiYongHu,
        新用户: false,
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

      // 记住密码仅决定账号回填，令牌一律会话存储，localStorage 中不得出现明文密码与令牌
      expect(localStorage.getItem('hewolianba_baoCunZhangHao')).toBe(JSON.stringify('13800138000'))
      expect(localStorage.getItem('hewolianba_baoCunMiMa')).toBeNull()
      expect(localStorage.getItem('hewolianba_jiZhuZhangHao')).toBe('true')
      expect(localStorage.getItem('hewolianba_jiZhuMiMa')).toBe('true')
      expect(localStorage.getItem('hewolianba_ziDongDengLu')).toBe('false')
      expect(localStorage.getItem('令牌')).toBeNull()
      expect(sessionStorage.getItem('令牌')).toBe('test-token')
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
        huo_yue_ren_she_id: null,
        hai_wang_fen_shu: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
        geng_xin_shi_jian: new Date().toISOString(),
      }

      vi.mocked(dengLu).mockResolvedValue({
        令牌: 'test-token',
        用户: ceShiYongHu,
        新用户: false,
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
    const dongHua = new Event('animationstart', { bubbles: true }) as Event & {
      animationName: string
    }
    dongHua.animationName = 'ziDongTianChongKaiShi'
    yuanSu.dispatchEvent(dongHua)
    await flushPromises()
    expect(miMaZu?.classList.contains('shangFu')).toBe(true)
  })

  it('FP-01：DOM晚填且无input/change/animationstart时，认证容器focusin同步登录按钮状态', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const shouJiHao = wrapper.find('#denglu-shoujihao').element as HTMLInputElement
    const miMa = wrapper.find('#denglu-mima').element as HTMLInputElement
    shouJiHao.value = '13800138000'
    miMa.value = 'password123'

    const dengLuAnNiu = wrapper.find('form button[type="submit"]')
    expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(true)

    wrapper.find('.biaodan-rongqi').element.dispatchEvent(new Event('focusin', { bubbles: true }))
    await flushPromises()

    expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(false)
    wrapper.unmount()
  })

  it('FP-01：DOM清空且无input/change/animationstart时同步清空登录按钮状态', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const shouJiHao = wrapper.find('#denglu-shoujihao')
    const miMa = wrapper.find('#denglu-mima')
    await shouJiHao.setValue('13800138000')
    await miMa.setValue('password123')
    await flushPromises()

    const dengLuAnNiu = wrapper.find('form button[type="submit"]')
    const miMaZu = miMa.element.closest('.shuru-zu')
    expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(false)
    expect(miMaZu?.classList.contains('shangFu')).toBe(true)

    const shouJiHaoYuanSu = shouJiHao.element as HTMLInputElement
    const miMaYuanSu = miMa.element as HTMLInputElement
    shouJiHaoYuanSu.value = ''
    miMaYuanSu.value = ''
    wrapper.find('.biaodan-rongqi').element.dispatchEvent(new Event('focusin', { bubbles: true }))
    await flushPromises()

    expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(true)
    expect(miMaZu?.classList.contains('shangFu')).toBe(false)
    wrapper.unmount()
  })

  it('FP-01：已聚焦后无事件晚填在pointerdown或键盘提交前同步登录按钮', async () => {
    const 验证 = async (事件: 'pointerdown' | 'keydown') => {
      const { wrapper } = await mountZuJian('dengLu')
      try {
        const shouJiHao = wrapper.find('#denglu-shoujihao')
        const miMa = wrapper.find('#denglu-mima')
        const shouJiHaoYuanSu = shouJiHao.element as HTMLInputElement
        const miMaYuanSu = miMa.element as HTMLInputElement
        shouJiHaoYuanSu.focus()
        await flushPromises()
        expect(document.activeElement).toBe(shouJiHaoYuanSu)
        shouJiHaoYuanSu.value = '13800138000'
        miMaYuanSu.value = 'password123'

        const dengLuAnNiu = wrapper.find('form button[type="submit"]')
        expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(true)

        if (事件 === 'pointerdown') {
          dengLuAnNiu.element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
        } else {
          shouJiHao.element.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
          )
        }
        await flushPromises()

        expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(false)
      } finally {
        wrapper.unmount()
      }
    }

    await 验证('pointerdown')
    await 验证('keydown')
  })

  it('FP-01：首帧同步会捕获挂载后无事件填入的值', async () => {
    const yuanShiRequestAnimationFrame = window.requestAnimationFrame
    const huDong: FrameRequestCallback[] = []
    window.requestAnimationFrame = ((huoDiao: FrameRequestCallback) => {
      huDong.push(huoDiao)
      return huDong.length
    }) as typeof window.requestAnimationFrame
    try {
      const { wrapper } = await mountZuJian('dengLu')
      const shouJiHao = wrapper.find('#denglu-shoujihao').element as HTMLInputElement
      const miMa = wrapper.find('#denglu-mima').element as HTMLInputElement
      shouJiHao.value = '13800138000'
      miMa.value = 'password123'

      for (const huoDiao of huDong) huoDiao(0)
      await flushPromises()

      const dengLuAnNiu = wrapper.find('form button[type="submit"]')
      expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(false)
      wrapper.unmount()
    } finally {
      window.requestAnimationFrame = yuanShiRequestAnimationFrame
    }
  })

  it('FP-01：无事件延迟回填在轮询后同步登录按钮（强制刷新 autofill 竞态根治）', async () => {
    vi.useFakeTimers()
    try {
      const { wrapper } = await mountZuJian('dengLu')
      const shouJiHao = wrapper.find('#denglu-shoujihao').element as HTMLInputElement
      const miMa = wrapper.find('#denglu-mima').element as HTMLInputElement
      const dengLuAnNiu = wrapper.find('form button[type="submit"]')
      expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(true)
      shouJiHao.value = '13800138000'
      miMa.value = 'password123'
      await vi.advanceTimersByTimeAsync(600)
      await flushPromises()
      expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(false)
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('FP-01：取消自动填充清空回填标志后登录按钮回到禁用', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const miMaInput = wrapper.find('#denglu-mima')
    const yuanSu = miMaInput.element as HTMLInputElement
    yuanSu.value = 'password123'
    const kaiShi = new Event('animationstart', { bubbles: true }) as Event & {
      animationName: string
    }
    kaiShi.animationName = 'ziDongTianChongKaiShi'
    yuanSu.dispatchEvent(kaiShi)
    await flushPromises()
    yuanSu.value = ''
    yuanSu.dispatchEvent(kaiShi)
    await flushPromises()
    const shouJiHao = wrapper.find('#denglu-shoujihao').element as HTMLInputElement
    shouJiHao.value = '13800138000'
    wrapper.find('.biaodan-rongqi').element.dispatchEvent(new Event('focusin', { bubbles: true }))
    await flushPromises()
    const dengLuAnNiu = wrapper.find('form button[type="submit"]')
    expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(true)
    wrapper.unmount()
  })

  it('FP-01：页面恢复事件会重新同步无事件晚填值', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const shouJiHao = wrapper.find('#denglu-shoujihao').element as HTMLInputElement
    const miMa = wrapper.find('#denglu-mima').element as HTMLInputElement
    shouJiHao.value = '13800138000'
    miMa.value = 'password123'

    const dengLuAnNiu = wrapper.find('form button[type="submit"]')
    window.dispatchEvent(new Event('pageshow'))
    await flushPromises()

    expect((dengLuAnNiu.element as HTMLButtonElement).disabled).toBe(false)
    wrapper.unmount()
  })

  it('FP-01：认证输入不绘制蓝色焦点环，非认证全局焦点规则保持不变', () => {
    expect(登录内容样式).toMatch(
      /\.denglu-neirong :deep\(\.fenlie-shuru\):focus-visible,\s*\.denglu-neirong :deep\(\.duan-shuru\):focus-visible\s*\{[^}]*outline:\s*none/,
    )
    expect(全局基线样式).toMatch(/\.fenlie-shuru\s*\)\s*:focus-visible\s*\{[^}]*outline:/)
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

  it('FP-02：切换登录/注册不再给表单容器留下内联高度锁（注册内容被裁切根因）', async () => {
    const { wrapper } = await mountZuJian('dengLu')
    const rongqi = wrapper.find('.biaodan-rongqi').element as HTMLElement
    expect(rongqi.style.height).toBe('')
    await wrapper.findAll('.biaoqian-anniu')[1].trigger('click')
    await flushPromises()
    expect(wrapper.find('#zhuce-shoujihao').exists()).toBe(true)
    expect(rongqi.style.height, '切换模式后 .biaodan-rongqi 残留内联 height').toBe('')
    expect(rongqi.style.overflow, '切换模式后 .biaodan-rongqi 残留内联 overflow').toBe('')
    expect(rongqi.style.transition).toBe('')
    await wrapper.findAll('.biaoqian-anniu')[0].trigger('click')
    await flushPromises()
    expect(wrapper.find('#denglu-shoujihao').exists()).toBe(true)
    expect(rongqi.style.height).toBe('')
    expect(rongqi.style.overflow).toBe('')
    const gundong = wrapper.find('.biaodan-gundong').element as HTMLElement
    expect(gundong.style.maxHeight, '内层滚动区残留内联 max-height').toBe('')
    expect(gundong.style.overflow, '内层滚动区残留内联 overflow').toBe('')
  })

  it('FP-02：根节点不再用 margin:0auto 抢认证布局的纵向自动外边距', () => {
    const ku = 样式块(登录内容样式, '.denglu-neirong')
    expect(ku).toMatch(/margin:\s*auto/)
    expect(ku).not.toMatch(/margin:\s*0\s+auto/)
    expect(登录内容源码).not.toMatch(/zhuce-gundong-qiangzhi/)
  })

  it('FP-02→FP-04a：认证滚动口使用 auto，认证专属滚动条规则只作用域自身', () => {
    const 视图滚动条规则 = 规则清单(登录内容样式)
      .flatMap((规则) => 拆分选择器组(规则.选择器))
      .filter((串) => 串.includes('::-webkit-scrollbar'))
    expect(视图滚动条规则.length).toBeGreaterThan(0)
    expect(视图滚动条规则.every((串) => 串.trim().startsWith('.biaodan-gundong'))).toBe(true)
    expect(视图滚动条规则.some((串) => 串.includes(':hover'))).toBe(true)
    expect(视图滚动条规则.some((串) => 串.includes(':focus-within'))).toBe(true)
    expect(登录内容样式).not.toMatch(/::-webkit-scrollbar[a-z-]*\s*\{[^}]*rgba\(/)
    expect(
      登录内容源码.slice(0, 登录内容源码.indexOf('<script')),
      'FP-04a 回归：模板里又挂回了 JS 条件滚动类',
    ).not.toMatch(/xuyao-gundong/)
    expect(登录内容样式, 'FP-04a 回归：样式里又长回了 JS 条件滚动类的规则').not.toMatch(
      /xuyao-gundong/,
    )
    expect(
      规则清单(全局基线样式)
        .flatMap((规则) => 拆分选择器组(规则.选择器))
        .filter((串) => 串.trim() === '::-webkit-scrollbar').length,
      'global.css 的滚动条单一真源不在了',
    ).toBe(1)
    expect(样式块(登录内容样式, '.biaodan-gundong')).toMatch(/overflow-y:\s*auto/)
    expect(样式块(登录内容样式, '.biaodan-gundong')).toMatch(/overflow-x:\s*hidden/)
  })

  it('FP-04a：认证滚动口空闲隐藏，hover 与 focus-within 恢复全局滚动条令牌', () => {
    expect(登录内容样式).toMatch(
      /\.biaodan-gundong\s*\{[^}]*overflow-y:\s*auto[^}]*scrollbar-color:\s*transparent\s+transparent/,
    )
    expect(登录内容样式).toMatch(
      /\.biaodan-gundong::\-webkit-scrollbar-track\s*\{[^}]*background:\s*transparent/,
    )
    expect(登录内容样式).toMatch(
      /\.biaodan-gundong::\-webkit-scrollbar-thumb\s*\{[^}]*background:\s*transparent/,
    )
    expect(登录内容样式).toMatch(
      /\.biaodan-gundong:hover,\s*\.biaodan-gundong:focus-within\s*\{[^}]*scrollbar-color:\s*var\(--gundong-tiao-huakuai\)\s+var\(--gundong-tiao-guidao\)/,
    )
    expect(登录内容样式).toMatch(
      /\.biaodan-gundong:hover::\-webkit-scrollbar-track,\s*\.biaodan-gundong:focus-within::\-webkit-scrollbar-track\s*\{[^}]*background:\s*var\(--gundong-tiao-guidao\)/,
    )
    expect(登录内容样式).toMatch(
      /\.biaodan-gundong:hover::\-webkit-scrollbar-thumb,\s*\.biaodan-gundong:focus-within::\-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--gundong-tiao-huakuai\)/,
    )
  })

  it('FP-02→FP-04b：表单项垂直节奏——字段间距走派生令牌、上浮标签留出间距', () => {
    // 旧契约（FP-02）钉 `margin-bottom: var(--jiange-da)` = 24px。FP-04b 按需求 #2「标签太挤」把间距
    // 在 8px 节奏上抬一档：.shuru-zu 声明局部量纲令牌 --ziduan-jian-ju = calc(--jiange-da + --jiange-xiao)
    // = 32px，margin-bottom 吃它 ⇒ 净空（间距 − 上浮标签侵入 5 − 发丝线+下内边距 11）8 → 16px。
    // 判据维度一字未放宽（仍是「间距走令牌 + 标签几何」），只是取值演进；裸 px 仍为 0。逐对实测见
    // FP04b字段纵向间距.test.ts。
    const 组块 = 样式块(登录内容样式, '.shuru-zu')
    expect(组块).toMatch(
      /--ziduan-jian-ju:\s*calc\(var\(--jiange-da\)\s*\+\s*var\(--jiange-xiao\)\)/,
    )
    expect(组块).toMatch(/margin-bottom:\s*var\(--ziduan-jian-ju\)(?!,)/)
    expect(样式块(登录内容样式, '.fenlie-shuru')).toMatch(/padding:\s*18px 0 10px/)
    expect(样式块(登录内容样式, '.fudong-biaoqian')).toMatch(/top:\s*18px/)
    const 上浮 = new RegExp(
      '\\.shuru-zu\\.shangFu \\.fudong-biaoqian,[\\s\\S]*?\\{([^}]*)\\}',
    ).exec(登录内容样式)
    expect(上浮, '未找到上浮标签规则').not.toBeNull()
    expect((上浮 as RegExpMatchArray)[1]).toMatch(/top:\s*-5px/)
  })

  it('FP-17b：浮标上浮越出字段盒时不被滚动口上沿裁切，且输入高度与字段坐标不变', () => {
    const 滚动口 = 样式块(登录内容样式, '.biaodan-gundong')
    const 上补 = Number(滚动口.match(/padding-top:\s*(-?[\d.]+)px/)?.[1])
    const 上移 = Number(滚动口.match(/margin-top:\s*(-?[\d.]+)px/)?.[1])
    expect(上补).toBe(5)
    expect(上移).toBe(-5)
    expect(上补 + 上移, '滚动口补偿不闭合会让整张表单跳动').toBe(0)
    expect(滚动口).toMatch(/overflow-y:\s*auto/)

    for (const 选择器 of ['.shuru-zu', '.mima-zu']) {
      expect(样式块(登录内容样式, 选择器)).toMatch(/overflow:\s*visible/)
    }

    const 浮标规则 = 规则清单(登录内容样式).filter(
      (项) => 项.选择器.includes('fudong-biaoqian') && 项.声明.has('top'),
    )
    expect([...new Set(浮标规则.map((项) => 项.声明.get('top')))].sort()).toEqual(['-5px', '18px'])
    const 上浮 = 浮标规则.find((项) => 项.选择器.includes(':focus-within'))
    expect(上浮?.选择器).toContain('.shuru-zu.shangFu')
    expect(上浮?.选择器).toContain(':has(.fenlie-shuru:-webkit-autofill)')
    expect(
      浮标规则.some((项) => /cuoWu|error|aria-invalid/i.test(项.选择器)),
      '错误态不得另写一份会裁切标签的几何',
    ).toBe(false)

    expect(样式块(登录内容样式, '.fenlie-shuru')).toMatch(/padding:\s*18px 0 10px/)
    expect(样式块(登录内容样式, '.shuru-zu')).not.toMatch(/padding-top:|padding-bottom:/)
  })

  it('FP-12：间距/字号真源上收到共用 :root 块——授权文件零兜底补丁，深浅两档解析逐值相等', () => {
    const 块们 = 声明块清单()
    const 浅色 = 按档解析全部('light', 块们)
    const 深色 = 按档解析全部('dark', 块们)
    const 被引用: string[] = []
    const 带兜底: string[] = []
    for (const [文件, 样式] of [
      ['登录内容.vue', 登录内容样式],
      ['认证布局.vue', 认证布局样式],
    ] as const) {
      for (const 匹配 of 样式.matchAll(/var\(\s*(--(?:jiange|ziti)-[a-z-]+)\s*(,([^)]*))?\)/g)) {
        const [, 令牌, 兜底] = 匹配
        被引用.push(令牌)
        const 位置 = 声明位置(令牌, 块们)
        expect(位置, `${文件} 用了 variables.css 不存在的令牌 ${令牌}`).toEqual({
          共用: true,
          浅色: false,
          深色: false,
        })
        if (兜底) 带兜底.push(`${文件}: var(${令牌}, ${兜底.trim()})`)
      }
    }
    expect([...new Set(被引用)].sort(), '两文件应仍在用 --jiange-*/--ziti-* 真源').toEqual([
      '--jiange-da',
      '--jiange-xiao',
      '--jiange-zhong',
      '--ziti-xiao',
      '--ziti-zhong',
    ])
    expect(带兜底, 'FP-02 遗留的绕真源同值兜底未删净：\n' + 带兜底.join('\n')).toEqual([])
    for (const 令牌 of new Set(被引用)) {
      expect(深色.get(令牌), `${令牌} 深色档未定义（F23 塌陷复发）`).toBeDefined()
      expect(`${令牌}:${深色.get(令牌)}`, `${令牌} 深浅两档取值不等`).toBe(
        `${令牌}:${浅色.get(令牌)}`,
      )
    }
  })

  it('FP-02：0×0 原生勾选框的键盘焦点环转移到自绘方框并走焦点环令牌', () => {
    const 选择器 = '.ji-zhu-fu-xuan:focus-visible + .ji-zhu-wen-ben::before'
    const ku = 样式块(登录内容样式, 选择器)
    expect(ku).toMatch(
      /outline:\s*var\(--jujiao-huan-kuan-du\)\s+solid\s+var\(--jujiao-huan-yanse\)/,
    )
    expect(ku).toMatch(/outline-offset:\s*var\(--jujiao-huan-pian-yi\)/)
  })

  it('FP-02：认证布局滚动口高度锁定可用区，零私有滚动条定义点且 global 同令牌供给', () => {
    expect(认证布局样式).not.toMatch(/min-height:\s*calc\(100vh/)
    const rongqi = 样式块(认证布局样式, '.yemian-rongqi')
    expect(rongqi).toMatch(/height:\s*100%/)
    expect(rongqi).toMatch(/min-height:\s*0/)
    expect(样式块(认证布局样式, '.yemian-buju')).toMatch(/min-height:\s*0/)
    // FP-20：认证布局私有 ::-webkit-scrollbar 四条已删（与 global 同令牌纯重复），全库宽度/令牌由 global 单一真源供给
    const 私有滚动条选择器 = 规则清单(认证布局样式)
      .flatMap((规则) => 拆分选择器组(规则.选择器))
      .filter((选择器) => 选择器.includes('::-webkit-scrollbar'))
    expect(私有滚动条选择器, '认证布局不得再有私有滚动条定义点').toEqual([])
    const global滚动条规则 = 规则清单(全局基线样式).find((规则) =>
      拆分选择器组(规则.选择器).includes('::-webkit-scrollbar'),
    )
    expect(global滚动条规则?.声明.get('width')).toBe('var(--gundong-tiao-kuan-du)')
    expect(认证布局样式).not.toMatch(/rgba\(255,\s*255,\s*255,\s*0\.3\)/)
    expect(认证布局样式).not.toMatch(/::-webkit-scrollbar\s*\{\s*width:\s*4px/)
    expect(认证布局源码).toMatch(/\.yemian-buju\.quanping-moshi\s*\{[\s\S]*?overflow-y:\s*auto/)
  })
})
