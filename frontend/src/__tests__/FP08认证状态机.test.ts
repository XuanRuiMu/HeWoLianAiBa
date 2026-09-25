import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import 认证布局 from '@/layouts/认证布局.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用用户仓库 } from '@/stores/用户'
import { 令牌键 } from '@/constants/auth'
import { huoQuFanYi } from '@/config/translations'
import { dengLu, faSongMa, huoQuYongHuXinXi, jianChaShouJiHao, zhuCe, zhuXiaoZhangHao } from '@/api/认证'

const 登录源码 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')

vi.mock('@/api/认证', () => ({
  dengLu: vi.fn(),
  faSongMa: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  zhuCe: vi.fn(),
  zhuXiaoZhangHao: vi.fn(),
}))

vi.mock('@/api/请求', () => ({
  huoQuCuoWuXiangYing: vi.fn((cuoWu: unknown) => (cuoWu as { response?: unknown }).response),
}))

const yongHu = (id: string) => ({
  id,
  shou_ji_hao: '13800138000',
  yong_hu_ming: '测试用户',
  ni_cheng: null,
  mu_biao_xing_bie: null,
  mo_ren_xing_bie: null,
  xing_ge_xuan_ze: null,
  ren_she_biao_qian: null,
  yun_xu_zha_nan_zha_nv: false,
  tou_xiang: null,
  sheng_ri: null,
  qian_ming: null,
  jiao_se: null,
  neng_li: [],
  huo_yue_ren_she_id: null,
  hai_wang_fen_shu: 0,
  chuang_jian_shi_jian: '2026-01-01T00:00:00.000Z',
  geng_xin_shi_jian: '2026-01-01T00:00:00.000Z',
})

function 延后<T>() {
  let jieShou!: (zhi: T) => void
  let pai!: (yuanYin?: unknown) => void
  const promise = new Promise<T>((jie, paiHan) => {
    jieShou = jie
    pai = paiHan
  })
  return { promise, jieShou, pai }
}

function 登录响应(token: string, user = yongHu('u1')) {
  return { 令牌: token, 用户: user, 新用户: false }
}

function 清空环境() {
  localStorage.clear()
  sessionStorage.clear()
  document.body.innerHTML = ''
  vi.resetAllMocks()
  vi.useRealTimers()
  setActivePinia(createPinia())
}

async function 挂载登录(
  moShi: 'dengLu' | 'zhuCe' = 'dengLu',
  准备?: (form: ReturnType<typeof 使用认证表单仓库>) => void,
): Promise<{
  wrapper: VueWrapper
  router: Router
}> {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: 登录内容 },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  const form = 使用认证表单仓库()
  form.moShi = moShi
  准备?.(form)
  await router.push('/login')
  const wrapper = mount(登录内容, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  })
  await router.isReady()
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  清空环境()
})

afterEach(() => {
  清空环境()
})

describe('FP-08 认证状态机', () => {
  it('刷新先进入恢复中，服务端身份确认后才进入已认证', async () => {
    sessionStorage.setItem(令牌键, 'session-token')
    const huanFu = 延后<ReturnType<typeof yongHu>>()
    vi.mocked(huoQuYongHuXinXi).mockReturnValueOnce(huanFu.promise)
    const store = 使用用户仓库()

    const task = store.queBaoShenFenJiuXu()
    expect(store.认证状态).toBe('恢复中')
    expect(store.shenFenYiJiuXu).toBe(false)

    huanFu.jieShou(yongHu('u1'))
    await task

    expect(store.认证状态).toBe('已认证')
    expect(store.shenFenYiJiuXu).toBe(true)
    expect(store.dangQianYongHu?.id).toBe('u1')
  })

  it('恢复期间不渲染受保护页面且不提前显示错误', async () => {
    sessionStorage.setItem(令牌键, 'session-token')
    const huanFu = 延后<ReturnType<typeof yongHu>>()
    vi.mocked(huoQuYongHuXinXi).mockReturnValueOnce(huanFu.promise)
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/',
          name: 'zhuJieMian',
          component: { template: '<div class="protected-page">受保护页面</div>' },
          meta: { xuYaoDengLu: true },
        },
      ],
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = 使用用户仓库()
    await router.push('/')
    const wrapper = mount(认证布局, { attachTo: document.body, global: { plugins: [pinia, router] } })
    const task = store.queBaoShenFenJiuXu()
    await flushPromises()

    expect(wrapper.find('.protected-page').exists()).toBe(false)
    expect(wrapper.find('.renzheng-huifu-zhuangtai').text()).toContain('加载中')
    expect(wrapper.find('.renzheng-huifu-zhuangtai').text()).not.toContain('网络异常')
    huanFu.jieShou(yongHu('u1'))
    await task
    await flushPromises()
    expect(wrapper.find('.protected-page').exists()).toBe(true)
    wrapper.unmount()
  })

  it('服务端 401 清会话，网络失败保留会话并进入可重试状态', async () => {
    sessionStorage.setItem(令牌键, 'session-token')
    vi.mocked(huoQuYongHuXinXi).mockRejectedValueOnce({ response: { status: 401 } })
    const store = 使用用户仓库()

    await store.queBaoShenFenJiuXu()

    expect(store.认证状态).toBe('匿名')
    expect(store.令牌).toBeNull()
    expect(sessionStorage.getItem(令牌键)).toBeNull()

    sessionStorage.setItem(令牌键, 'still-valid')
    store.sheZhiLingPai('still-valid')
    vi.mocked(huoQuYongHuXinXi).mockRejectedValueOnce(new Error('network'))
    await store.queBaoShenFenJiuXu(true)

    expect(store.认证状态).toBe('恢复失败可重试')
    expect(store.令牌).toBe('still-valid')
    expect(sessionStorage.getItem(令牌键)).toBe('still-valid')
    expect(store.zhuangTai.cuo_wu_xin_xi).toBeNull()
  })

  it('恢复失败可重试，第二次成功后才结束恢复', async () => {
    sessionStorage.setItem(令牌键, 'session-token')
    vi.mocked(huoQuYongHuXinXi)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(yongHu('u2'))
    const store = 使用用户仓库()

    await store.queBaoShenFenJiuXu()
    expect(store.认证状态).toBe('恢复失败可重试')
    await store.queBaoShenFenJiuXu(true)

    expect(store.认证状态).toBe('已认证')
    expect(store.dangQianYongHu?.id).toBe('u2')
    expect(huoQuYongHuXinXi).toHaveBeenCalledTimes(2)
  })

  it('取消恢复会中止请求并忽略晚到身份', async () => {
    sessionStorage.setItem(令牌键, 'session-token')
    const huanFu = 延后<ReturnType<typeof yongHu>>()
    let signal: AbortSignal | undefined
    vi.mocked(huoQuYongHuXinXi).mockImplementationOnce((config) => {
      signal = config?.signal
      return huanFu.promise
    })
    const store = 使用用户仓库()
    const task = store.queBaoShenFenJiuXu()
    store.取消待处理认证()
    expect(signal?.aborted).toBe(true)
    huanFu.jieShou(yongHu('late-user'))
    await task

    expect(store.认证状态).not.toBe('已认证')
    expect(store.dangQianYongHu).toBeNull()
    expect(sessionStorage.getItem(令牌键)).toBe('session-token')
  })

  it('登录响应后等待身份确认期间不提前标记已认证', async () => {
    const huanFu = 延后<ReturnType<typeof yongHu>>()
    vi.mocked(dengLu).mockResolvedValueOnce(登录响应('new-token', yongHu('new-user')))
    vi.mocked(huoQuYongHuXinXi).mockReturnValueOnce(huanFu.promise)
    const store = 使用用户仓库()

    const task = store.zhiXingDengLu('13800138000', 'password123')
    await flushPromises()
    expect(store.认证状态).toBe('恢复中')
    expect(store.shenFenYiJiuXu).toBe(false)

    huanFu.jieShou(yongHu('new-user'))
    await task
    expect(store.认证状态).toBe('已认证')
  })

  it('登录身份确认发现会话已变更时不返回成功', async () => {
    const huanFu = 延后<ReturnType<typeof yongHu>>()
    vi.mocked(dengLu).mockResolvedValueOnce(登录响应('login-token', yongHu('new-user')))
    vi.mocked(huoQuYongHuXinXi).mockReturnValueOnce(huanFu.promise)
    const store = 使用用户仓库()

    const task = store.zhiXingDengLu('13800138000', 'password123')
    await flushPromises()
    sessionStorage.setItem(令牌键, 'other-token')
    huanFu.jieShou(yongHu('new-user'))

    await expect(task).rejects.toBeDefined()
    expect(store.认证状态).toBe('恢复失败可重试')
    expect(store.令牌).toBe('other-token')
  })

  it('登录响应后的身份确认 401 不会继续导航', async () => {
    vi.mocked(dengLu).mockResolvedValueOnce(登录响应('new-token', yongHu('new-user')))
    vi.mocked(huoQuYongHuXinXi).mockRejectedValueOnce({ response: { status: 401 } })
    const store = 使用用户仓库()

    await expect(store.zhiXingDengLu('13800138000', 'password123')).rejects.toBeDefined()
    expect(store.认证状态).toBe('匿名')
    expect(store.令牌).toBeNull()
    expect(sessionStorage.getItem(令牌键)).toBeNull()
  })

  it('401 清理前令牌已从存储移除时仍能清理同一内存会话', () => {
    sessionStorage.setItem(令牌键, 'session-token')
    const store = 使用用户仓库()
    store.sheZhiLingPai('session-token')
    sessionStorage.removeItem(令牌键)

    expect(store.清空用户状态('session-token')).toBe(true)
    expect(store.认证状态).toBe('匿名')
    expect(store.令牌).toBeNull()
  })

  it('跨标签页令牌变更不会被旧恢复结果写回', async () => {
    sessionStorage.setItem(令牌键, 'old-token')
    const huanFu = 延后<ReturnType<typeof yongHu>>()
    vi.mocked(huoQuYongHuXinXi).mockReturnValueOnce(huanFu.promise)
    const store = 使用用户仓库()

    const task = store.queBaoShenFenJiuXu()
    sessionStorage.setItem(令牌键, 'new-token')
    huanFu.jieShou(yongHu('old-user'))
    await task

    expect(store.认证状态).toBe('恢复失败可重试')
    expect(store.令牌).toBe('new-token')
    expect(store.dangQianYongHu).toBeNull()
    expect(sessionStorage.getItem(令牌键)).toBe('new-token')
  })

  it('慢恢复晚到不能覆盖快速登录结果', async () => {
    sessionStorage.setItem(令牌键, 'old-token')
    const huanFu = 延后<ReturnType<typeof yongHu>>()
    vi.mocked(huoQuYongHuXinXi)
      .mockReturnValueOnce(huanFu.promise)
      .mockResolvedValueOnce(yongHu('new-user'))
    vi.mocked(dengLu).mockResolvedValueOnce(登录响应('new-token', yongHu('new-user')))
    const store = 使用用户仓库()

    const huanFuTask = store.queBaoShenFenJiuXu()
    await store.zhiXingDengLu('13800138000', 'password123')
    huanFu.jieShou(yongHu('old-user'))
    await huanFuTask

    expect(store.令牌).toBe('new-token')
    expect(sessionStorage.getItem(令牌键)).toBe('new-token')
    expect(store.dangQianYongHu?.id).toBe('new-user')
    expect(store.认证状态).toBe('已认证')
  })

  it('注销旧会话的晚到清理不能清掉新登录', async () => {
    sessionStorage.setItem(令牌键, 'old-token')
    const shanChu = 延后<void>()
    vi.mocked(zhuXiaoZhangHao).mockReturnValueOnce(shanChu.promise)
    vi.mocked(dengLu).mockResolvedValueOnce(登录响应('new-token', yongHu('new-user')))
    vi.mocked(huoQuYongHuXinXi).mockResolvedValueOnce(yongHu('new-user'))
    const store = 使用用户仓库()

    const shanChuTask = store.zhiXingZhuXiao()
    await store.zhiXingDengLu('13800138000', 'password123')
    shanChu.jieShou()
    await shanChuTask

    expect(store.令牌).toBe('new-token')
    expect(sessionStorage.getItem(令牌键)).toBe('new-token')
    expect(store.dangQianYongHu?.id).toBe('new-user')
  })

  it('不再用 localStorage 身份缓存预置当前用户', async () => {
    localStorage.setItem('hewolianba_yonghu', JSON.stringify(yongHu('stale-user')))
    sessionStorage.setItem(令牌键, 'session-token')
    vi.mocked(huoQuYongHuXinXi).mockResolvedValueOnce(yongHu('server-user'))
    const store = 使用用户仓库()

    expect(store.dangQianYongHu).toBeNull()
    await store.queBaoShenFenJiuXu()

    expect(store.dangQianYongHu?.id).toBe('server-user')
    expect(localStorage.getItem('hewolianba_yonghu')).toBeNull()
  })
})

describe('FP-08 认证控件契约与异步竞态', () => {
  it('受控值在页面恢复同步时不被空 DOM 覆盖', async () => {
    const { wrapper } = await 挂载登录('dengLu', (form) => {
      form.dengLuMiMa = 'retained-password'
    })
    const form = 使用认证表单仓库()
    const input = wrapper.find('#denglu-mima')
    const element = input.element as HTMLInputElement
    element.value = ''
    window.dispatchEvent(new Event('pageshow'))
    await flushPromises()

    expect(form.dengLuMiMa).toBe('retained-password')
    expect(element.value).toBe('retained-password')
    wrapper.unmount()
  })

  it('认证按钮的 type、disabled、aria-busy 与光标语义一致', async () => {
    const { wrapper } = await 挂载登录()
    const tabs = wrapper.findAll('.biaoqian-anniu')
    const passwordToggle = wrapper.find('.mima-qiehuan')
    const submit = wrapper.find('form[data-form-mode="dengLu"] button[type="submit"]')

    expect(tabs.every((item) => item.attributes('type') === 'button')).toBe(true)
    expect(tabs.every((item) => item.attributes('aria-busy') === 'false')).toBe(true)
    expect(passwordToggle.attributes('type')).toBe('button')
    expect(passwordToggle.attributes('aria-busy')).toBe('false')
    expect(submit.attributes('type')).toBe('submit')
    expect(submit.attributes('aria-busy')).toBe('false')
    expect(登录源码).toMatch(/\.mima-qiehuan[\s\S]*?cursor:\s*pointer/)

    await wrapper.find('#denglu-shoujihao').setValue('13800138000')
    await wrapper.find('#denglu-mima').setValue('password123')
    const codeForm = await 挂载登录('zhuCe')
    const codeButton = codeForm.wrapper.find('.fasong-anniu')
    expect(codeButton.attributes('type')).toBe('button')
    expect(codeButton.attributes('aria-busy')).toBe('false')
    expect(登录源码).toMatch(/\.fasong-anniu:not\(:disabled\)[\s\S]*?cursor:\s*pointer/)
    codeForm.wrapper.unmount()
    wrapper.unmount()
  })

  it('重复提交和重复验证码点击只发一次请求并暴露 busy 状态', async () => {
    const { wrapper } = await 挂载登录()
    const login = 延后<ReturnType<typeof 登录响应>>()
    vi.mocked(dengLu).mockReturnValueOnce(login.promise)
    vi.mocked(huoQuYongHuXinXi).mockResolvedValueOnce(yongHu('u1'))
    await wrapper.find('#denglu-shoujihao').setValue('13800138000')
    await wrapper.find('#denglu-mima').setValue('password123')
    const form = wrapper.find('form[data-form-mode="dengLu"]')
    const submit = form.find('button[type="submit"]')
    await form.trigger('submit')
    await form.trigger('submit')

    expect(dengLu).toHaveBeenCalledTimes(1)
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)
    expect(submit.attributes('aria-busy')).toBe('true')
    login.jieShou(登录响应('token', yongHu('u1')))
    await flushPromises()
    expect(submit.attributes('aria-busy')).toBe('false')
    wrapper.unmount()

    const code = 延后<void>()
    vi.mocked(jianChaShouJiHao).mockResolvedValueOnce({ yi_zhu_ce: false })
    vi.mocked(faSongMa).mockReturnValueOnce(code.promise)
    const codeForm = await 挂载登录('zhuCe')
    await codeForm.wrapper.find('#zhuce-shoujihao').setValue('13800138000')
    const codeButton = codeForm.wrapper.find('.fasong-anniu')
    await codeButton.trigger('click')
    await codeButton.trigger('click')
    expect(faSongMa).toHaveBeenCalledTimes(1)
    expect((codeButton.element as HTMLButtonElement).disabled).toBe(true)
    expect(codeButton.attributes('aria-busy')).toBe('true')
    code.jieShou()
    await flushPromises()
    expect(codeButton.attributes('aria-busy')).toBe('false')
    codeForm.wrapper.unmount()
  })

  it('注册提交同样具备重复点击门禁与 busy 语义', async () => {
    const register = 延后<ReturnType<typeof 登录响应>>()
    vi.mocked(zhuCe).mockReturnValueOnce(register.promise)
    vi.mocked(huoQuYongHuXinXi).mockResolvedValueOnce(yongHu('u1'))
    const { wrapper } = await 挂载登录('zhuCe', (form) => {
      form.zhuCeShouJiHao = '13800138000'
      form.zhuCeYanZhengMa = '123456'
      form.zhuCeYongHuMing = '测试用户'
      form.zhuCeMiMa = 'password123'
      form.zhuCeChuShengRiQi = '2000-01-01'
      form.tongYiXieYi = true
    })
    const form = wrapper.find('form[data-form-mode="zhuCe"]')
    const submit = form.find('button[type="submit"]')
    await form.trigger('submit')
    await form.trigger('submit')
    expect(zhuCe).toHaveBeenCalledTimes(1)
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)
    expect(submit.attributes('aria-busy')).toBe('true')
    register.jieShou(登录响应('register-token', yongHu('u1')))
    await flushPromises()
    expect(submit.attributes('aria-busy')).toBe('false')
    wrapper.unmount()
  })

  it('键盘和触屏提交入口共享同一表单契约', async () => {
    const { wrapper } = await 挂载登录()
    await wrapper.find('#denglu-shoujihao').setValue('13800138000')
    await wrapper.find('#denglu-mima').setValue('password123')
    const form = wrapper.find('form[data-form-mode="dengLu"]')
    const submit = form.find('button[type="submit"]')
    await submit.trigger('pointerdown')
    await submit.trigger('click')
    await form.trigger('keydown', { key: 'Enter' })
    expect(form.attributes('data-form-mode')).toBe('dengLu')
    expect(submit.attributes('type')).toBe('submit')
    wrapper.unmount()
  })

  it('组件卸载后旧登录结果不能导航或提交新会话', async () => {
    const { wrapper, router } = await 挂载登录()
    const push = vi.spyOn(router, 'push')
    const login = 延后<ReturnType<typeof 登录响应>>()
    vi.mocked(dengLu).mockReturnValueOnce(login.promise)
    vi.mocked(huoQuYongHuXinXi).mockResolvedValueOnce(yongHu('u1'))
    await wrapper.find('#denglu-shoujihao').setValue('13800138000')
    await wrapper.find('#denglu-mima').setValue('password123')
    const form = wrapper.find('form[data-form-mode="dengLu"]')
    await form.trigger('submit')
    expect(dengLu).toHaveBeenCalledTimes(1)
    expect((form.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true)
    wrapper.unmount()
    login.jieShou(登录响应('late-token', yongHu('late-user')))
    await flushPromises()

    expect(push).not.toHaveBeenCalledWith('/')
    expect(sessionStorage.getItem(令牌键)).toBeNull()
  })

  it('切换模式后旧认证结果不会把新模式带回登录成功页', async () => {
    const { wrapper, router } = await 挂载登录()
    const login = 延后<ReturnType<typeof 登录响应>>()
    vi.mocked(dengLu).mockReturnValueOnce(login.promise)
    vi.mocked(huoQuYongHuXinXi).mockResolvedValueOnce(yongHu('u1'))
    await wrapper.find('#denglu-shoujihao').setValue('13800138000')
    await wrapper.find('#denglu-mima').setValue('password123')
    await wrapper.find('form[data-form-mode="dengLu"]').trigger('submit')
    await wrapper.findAll('.biaoqian-anniu')[1].trigger('click')
    login.jieShou(登录响应('late-token', yongHu('late-user')))
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('dengLu')
    expect(wrapper.find('form[data-form-mode="zhuCe"]').exists()).toBe(true)
    expect(sessionStorage.getItem(令牌键)).toBeNull()
  })

  it('认证失败文案来自现有翻译文件', () => {
    // 钉的是「文案取自翻译键」这一契约（FP-16 审查把 wangLuoCuoWu 的值从「网络异常，请检查网络后重试」
    // 改成含影响+下一步的「网络没有接通，这次操作没有生效」后，字面量随之更新，断言强度不变）
    expect(huoQuFanYi('renZheng', 'dengLuShiBai')).toBe('登录失败')
    expect(huoQuFanYi('tongYong', 'wangLuoCuoWu')).toBe('网络没有接通，这次操作没有生效')
  })
})
