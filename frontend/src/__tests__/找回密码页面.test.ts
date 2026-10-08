import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'

import 找回密码 from '@/views/找回密码.vue'
import { faSongMa, chongZhiMiMa } from '@/api/认证'
import { huoQuFanYi } from '@/config/translations'

const 假 = vi.hoisted(() => ({
  faSongMa: vi.fn(),
  chongZhiMiMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
}))

vi.mock('@/api/认证', () => ({
  faSongMa: 假.faSongMa,
  chongZhiMiMa: 假.chongZhiMiMa,
  jianChaShouJiHao: 假.jianChaShouJiHao,
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
  YAN_ZHENG_MA_YONG_TU: { zhuCe: 'zhuCe', chongZhiMiMa: 'chongZhiMiMa' },
}))

vi.mock('@/api/请求', () => ({
  huoQuCuoWuXiangYing: vi.fn((cuoWu: unknown) => (cuoWu as { response?: unknown }).response),
}))

async function 挂载(查询 = '') {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: { template: '<div>登录</div>' } },
      {
        path: '/forgot-password',
        name: 'wangJiMiMa',
        component: 找回密码,
      },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  await luYou.push('/forgot-password' + 查询)
  const wrapper = mount(找回密码, { global: { plugins: [pinia, luYou] }, attachTo: document.body })
  await luYou.isReady()
  await flushPromises()
  return { wrapper, luYou }
}

async function 填满(wrapper: ReturnType<typeof mount>, miMa = 'XinMiMa123') {
  await wrapper.find('#wangjimima-shoujihao').setValue('16622370059')
  await wrapper.find('#wangjimima-yanzhengma').setValue('123456')
  await wrapper.find('#wangjimima-mima').setValue(miMa)
  await wrapper.find('#wangjimima-querenmima').setValue(miMa)
  await flushPromises()
}

describe('找回密码独立页面', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.resetAllMocks()
  })

  it('是独立路由，不带登录/注册切换标签', async () => {
    const { wrapper, luYou } = await 挂载()
    expect(luYou.currentRoute.value.name).toBe('wangJiMiMa')
    expect(wrapper.find('.wangjimima-biaodan').exists()).toBe(true)
    expect(wrapper.find('.biaoqian-qiehuan').exists(), '找回密码页不该有登录/注册切换').toBe(false)
    wrapper.unmount()
  })

  it('只收手机号/验证码/两次新密码，不含用户名与出生日期', async () => {
    const { wrapper } = await 挂载()
    expect(wrapper.find('#wangjimima-shoujihao').exists()).toBe(true)
    expect(wrapper.find('#wangjimima-yanzhengma').exists()).toBe(true)
    expect(wrapper.find('#wangjimima-mima').exists()).toBe(true)
    expect(wrapper.find('#wangjimima-querenmima').exists()).toBe(true)
    expect(wrapper.find('#zhuce-yonghuming').exists(), '重置不需要用户名').toBe(false)
    expect(wrapper.find('#zhuce-chushengriqi').exists(), '重置不需要出生日期').toBe(false)
    wrapper.unmount()
  })

  it('从登录页带过来的号码会预填（登录页刚输完就发现忘了）', async () => {
    const { wrapper } = await 挂载('?shouJiHao=16622370059')
    expect(wrapper.find('#wangjimima-shoujihao').element.value).toBe('16622370059')
    wrapper.unmount()
  })

  it('带进来的号码不合法时不预填（不把脏值塞进输入框）', async () => {
    const { wrapper } = await 挂载('?shouJiHao=abc<script>')
    expect(wrapper.find('#wangjimima-shoujihao').element.value).toBe('')
    wrapper.unmount()
  })

  it('发码走「重置密码」用途，绝不复用注册用途', async () => {
    假.faSongMa.mockResolvedValue(undefined as never)
    const { wrapper } = await 挂载()
    await wrapper.find('#wangjimima-shoujihao').setValue('16622370059')
    await flushPromises()

    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()

    expect(假.faSongMa).toHaveBeenCalledTimes(1)
    expect(假.faSongMa.mock.calls[0]?.[1]).toBe('chongZhiMiMa')
    wrapper.unmount()
  })

  it('发码不预检号码是否存在（预检等于把账号探测摆到明面）', async () => {
    假.faSongMa.mockResolvedValue(undefined as never)
    const { wrapper } = await 挂载()
    await wrapper.find('#wangjimima-shoujihao').setValue('16622370059')
    await flushPromises()

    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()

    expect(假.jianChaShouJiHao).not.toHaveBeenCalled()
    expect(假.faSongMa).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('本地校验拦下弱密码与两次不一致，且不打扰服务端', async () => {
    const { wrapper } = await 挂载()
    await 填满(wrapper, '12345678')
    await flushPromises()

    const 按钮 = wrapper.find('button.anniu-zhuyao')
    expect((按钮.element as HTMLButtonElement).disabled, '弱密码时按钮应禁用').toBe(true)
    await wrapper.find('.wangjimima-biaodan').trigger('submit')
    await flushPromises()
    expect(假.chongZhiMiMa).not.toHaveBeenCalled()

    await wrapper.find('#wangjimima-mima').setValue('XinMiMa123')
    await flushPromises()
    await wrapper.find('.wangjimima-biaodan').trigger('submit')
    await flushPromises()
    expect(假.chongZhiMiMa).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('校验通过才真的调重置接口，并把两次密码分别传给后端', async () => {
    假.chongZhiMiMa.mockResolvedValue(undefined as never)
    const { wrapper } = await 挂载()
    await 填满(wrapper)

    await wrapper.find('.wangjimima-biaodan').trigger('submit')
    await flushPromises()

    expect(假.chongZhiMiMa).toHaveBeenCalledTimes(1)
    expect(假.chongZhiMiMa.mock.calls[0]?.slice(0, 4)).toEqual([
      '16622370059',
      '123456',
      'XinMiMa123',
      'XinMiMa123',
    ])
    wrapper.unmount()
  })

  it('重置成功后把号码留给登录页、且不落任何密码', async () => {
    假.chongZhiMiMa.mockResolvedValue(undefined as never)
    const { wrapper } = await 挂载()
    await 填满(wrapper)

    await wrapper.find('.wangjimima-biaodan').trigger('submit')
    await flushPromises()
    await flushPromises()

    const { 使用认证表单仓库 } = await import('@/stores/认证表单')
    const bd = 使用认证表单仓库()
    expect(bd.dengLuShouJiHao, '号码应留给登录页直接登录').toBe('16622370059')
    expect(bd.dengLuMiMa, '新密码绝不能落到登录表单').toBe('')
    wrapper.unmount()
  })

  it('重置失败属免码报错：不展示恋爱码行', async () => {
    const { xianShiLianAiMa } = await import('@/config/前台错误码')
    expect(xianShiLianAiMa('AUTH_PASSWORD_RESET_FAILED' as never)).toBe(false)
  })

  it('「返回登录」是一条真链接，指向登录页', async () => {
    const { wrapper } = await 挂载()
    const 链接 = wrapper.find('.wangjimima-fanhui')
    expect(链接.exists()).toBe(true)
    expect(链接.attributes('href')).toBe('/login')
    wrapper.unmount()
  })

  it('文案全部走翻译文件，无硬编码', () => {
    expect(huoQuFanYi('renZheng', 'wangJiMiMaBiaoTi')).toBe('找回密码')
    expect(huoQuFanYi('renZheng', 'wangJiMiMa')).toBe('忘记密码？')
  })
})
