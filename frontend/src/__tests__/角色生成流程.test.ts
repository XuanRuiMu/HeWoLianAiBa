import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 添加微信 from '@/views/添加微信.vue'
import { 使用角色生成仓库 } from '@/stores/角色生成'
import type { 生成流程资料, ShengChengJiaoSeJieGuo } from '@/stores/角色生成'
import { huoQuFanYi } from '@/config/translations'
import router from '@/router'

// 模拟生成流程相关后端接口
vi.mock('@/api/聊天', () => ({
  shengChengJiaoSe: vi.fn(),
  queRenJiaoSe: vi.fn(),
  chuangJianHuiHua: vi.fn(),
}))
import { shengChengJiaoSe, queRenJiaoSe, chuangJianHuiHua } from '@/api/聊天'

// store 内的完成回调通过单例 router 导航到「过往战绩」，此处 mock 以断言导航目标
vi.mock('@/router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/router')
  return {
    ...actual,
    default: { push: vi.fn().mockResolvedValue(true), replace: vi.fn().mockResolvedValue(true) },
  }
})

function 创建路由() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/tian-jia-wei-xin', name: 'tianJiaWeiXin', component: 添加微信 },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: { template: '<div>聊天</div>' } },
      { path: '/profile-setup', name: 'ziLiaoSheZhi', component: { template: '<div>资料</div>' } },
    ],
  })
}

function 示例角色(覆盖: Partial<ShengChengJiaoSeJieGuo> = {}): ShengChengJiaoSeJieGuo {
  return {
    id: '',
    wei_xin_ming: '小甜心',
    ming_zi: '测试角色',
    tou_xiang: 'https://example.com/avatar.png',
    xing_bie: 'nv',
    nian_ling: 22,
    wai_mao: '',
    xing_ge: '',
    bei_jing_gu_shi: '',
    xi_hao: [],
    yan_yu_feng_ge: '',
    biao_qian: [],
    re_du: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    ...覆盖,
  }
}

function 示例资料(): 生成流程资料 {
  return {
    xingBie: 'male',
    muBiaoXingBie: 'female',
    xingGeXuanZe: 'INFP',
    yunXuZhaNanZhaNv: false,
    随机性格标记: false,
  }
}

// 受控 Promise：便于手动推进生成流程阶段（确定性，避免假定时器下 flushPromises 的不确定性）
function 受控生成() {
  let resolveJiaoSe: (zhi: unknown) => void = () => {}
  let resolveQueRen: (zhi: unknown) => void = () => {}
  vi.mocked(shengChengJiaoSe).mockReturnValue(
    new Promise((resolve) => {
      resolveJiaoSe = resolve
    }),
  )
  vi.mocked(queRenJiaoSe).mockReturnValue(
    new Promise((resolve) => {
      resolveQueRen = resolve
    }),
  )
  vi.mocked(chuangJianHuiHua).mockResolvedValue({
    id: 'h1',
    jiao_se_id: 'j1',
    yong_hu_id: 'u1',
    kai_shi_shi_jian: Date.now(),
    zui_hou_xiao_xi_shi_jian: Date.now(),
    wei_du_xiao_xi_shu: 0,
  })
  return { resolveJiaoSe, resolveQueRen }
}

// 清空微任务与定时器，确保异步流程推进到位（比 flushPromises 在假定时器下更确定）
async function 排空() {
  await vi.advanceTimersByTimeAsync(0)
  await flushPromises()
  await vi.advanceTimersByTimeAsync(0)
}

describe('角色生成 store（流程生命周期与页面解耦）', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('进度文案随阶段推进且全部来自翻译文件', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 仓库 = 使用角色生成仓库()
    const { resolveJiaoSe, resolveQueRen } = 受控生成()

    仓库.kaiShiLiuCheng(示例资料())

    expect(仓库.dangQianWenAnJian).toBe('zhengZaiDaKaiShouJi')
    expect(仓库.jinDu).toBe(20)
    expect(仓库.dangQianWenAn).toBe(huoQuFanYi('tianJiaWeiXin', 'zhengZaiDaKaiShouJi'))

    await vi.advanceTimersByTimeAsync(800)
    expect(仓库.dangQianWenAnJian).toBe('zhengZaiTaoLunShuiSaoShui')
    expect(仓库.jinDu).toBe(40)

    await vi.advanceTimersByTimeAsync(800)
    expect(仓库.dangQianWenAnJian).toBe('zhengZaiKuoQuan')
    expect(仓库.jinDu).toBe(60)

    resolveJiaoSe(示例角色())
    await 排空()
    expect(仓库.dangQianWenAnJian).toBe('zhengZaiShengChengRenShe')
    expect(仓库.jinDu).toBe(80)

    resolveQueRen({ ...示例角色(), id: 'j1' })
    await 排空()
    expect(仓库.dangQianWenAnJian).toBe('zhengZaiShengChengKaiChangBai')
    expect(仓库.jinDu).toBe(100)

    await 排空()
    expect(仓库.zhuangTai).toBe('yi_wan_cheng')
    expect(仓库.huiHuaId).toBe('h1')
  })

  it('用户离开加载页后后台流程仍静默跑完', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 仓库 = 使用角色生成仓库()
    const { resolveJiaoSe, resolveQueRen } = 受控生成()

    仓库.kaiShiLiuCheng(示例资料())
    仓库.xiaoZhuJiaZaiYe() // 模拟用户离开加载页

    resolveJiaoSe(示例角色())
    resolveQueRen({ ...示例角色(), id: 'j1' })
    await 排空()

    expect(仓库.zhuangTai).toBe('yi_wan_cheng')
    expect(仓库.huiHuaId).toBe('h1')
    expect(仓库.zaiJiaZaiYe).toBe(false)
    // 离开后不应残留错误提示
    expect(仓库.cuoWuXinXi).toBe('')
  })

  it('失败时若用户已离开则静默记录 console.warn，不展示错误 UI', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const pinia = createPinia()
    setActivePinia(pinia)
    const 仓库 = 使用角色生成仓库()

    // 先于发起流程设置失败接口，确保生成时即失败
    vi.mocked(shengChengJiaoSe).mockRejectedValue(new Error('网络错误'))
    vi.mocked(queRenJiaoSe).mockResolvedValue({ ...示例角色(), id: 'j1' })
    vi.mocked(chuangJianHuiHua).mockResolvedValue({
      id: 'h1',
      jiao_se_id: 'j1',
      yong_hu_id: 'u1',
      kai_shi_shi_jian: Date.now(),
      zui_hou_xiao_xi_shi_jian: Date.now(),
      wei_du_xiao_xi_shu: 0,
    })
    仓库.kaiShiLiuCheng(示例资料())
    仓库.xiaoZhuJiaZaiYe() // 离开

    await 排空()

    expect(仓库.zhuangTai).toBe('shi_bai')
    expect(仓库.cuoWuXinXi).toBe('')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('失败时若用户仍在加载页则设置错误文案供组件展示', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 仓库 = 使用角色生成仓库()

    vi.mocked(shengChengJiaoSe).mockRejectedValue(new Error('网络错误'))
    vi.mocked(queRenJiaoSe).mockResolvedValue({ ...示例角色(), id: 'j1' })
    vi.mocked(chuangJianHuiHua).mockResolvedValue({
      id: 'h1',
      jiao_se_id: 'j1',
      yong_hu_id: 'u1',
      kai_shi_shi_jian: Date.now(),
      zui_hou_xiao_xi_shi_jian: Date.now(),
      wei_du_xiao_xi_shu: 0,
    })
    仓库.kaiShiLiuCheng(示例资料()) // 默认已在加载页
    await 排空()

    expect(仓库.zhuangTai).toBe('shi_bai')
    expect(仓库.cuoWuXinXi).toBe(huoQuFanYi('tianJiaWeiXin', 'shengChengShiBai'))
  })

  it('防重入：重复发起不重复调用生成接口', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 仓库 = 使用角色生成仓库()
    受控生成()

    仓库.kaiShiLiuCheng(示例资料())
    仓库.kaiShiLiuCheng(示例资料()) // 二次发起（已有进行中流程）
    仓库.kaiShiLiuCheng(示例资料()) // 三次发起

    expect(shengChengJiaoSe).toHaveBeenCalledTimes(1)
    expect(仓库.zhuangTai).toBe('jin_xing_zhong')
  })
})

describe('添加微信组件与 store 协作', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  async function 挂载并透传资料(
    pinia: ReturnType<typeof createPinia>,
    luYou: ReturnType<typeof createRouter>,
  ) {
    sessionStorage.setItem('ziLiaoSheZhiLinShi', JSON.stringify(示例资料()))
    await luYou.push('/tian-jia-wei-xin')
    const wrapper = mount(添加微信, {
      global: { plugins: [pinia, luYou] },
      attachTo: document.body,
    })
    await 排空()
    return wrapper
  }

  it('全程停留在加载页：流程完成后自动跳转聊天页', async () => {
    const luYou = 创建路由()
    const pinia = createPinia()
    setActivePinia(pinia)
    const { resolveJiaoSe, resolveQueRen } = 受控生成()

    await 挂载并透传资料(pinia, luYou)
    expect(luYou.currentRoute.value.path).toBe('/tian-jia-wei-xin')

    resolveJiaoSe(示例角色())
    resolveQueRen({ ...示例角色(), id: 'j1' })
    await 排空()

    // 仍停留在加载页：照旧跳转聊天页（由组件 watch 依据 zaiJiaZaiYe 裁决）
    expect(luYou.currentRoute.value.path).toBe('/chat/h1')
    // store 内部不自行导航，避免与组件裁决冲突
    expect(router.push).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'guoWangZhanJi' }))
    expect(router.replace).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'guoWangZhanJi' }),
    )
  })

  it('加载中离开主页：不跳转，流程静默完成后会话进入进行中', async () => {
    const luYou = 创建路由()
    const pinia = createPinia()
    setActivePinia(pinia)
    const { resolveJiaoSe, resolveQueRen } = 受控生成()

    const wrapper = await 挂载并透传资料(pinia, luYou)

    // 模拟用户点击“返回主页”离开加载页（组件卸载 → 注销加载页标记）
    wrapper.unmount()
    await luYou.push('/')
    await 排空()
    expect(luYou.currentRoute.value.path).toBe('/')

    // 此时用户在主页，流程在后台继续
    resolveJiaoSe(示例角色())
    resolveQueRen({ ...示例角色(), id: 'j1' })
    await 排空()

    const 仓库 = 使用角色生成仓库()
    expect(仓库.zhuangTai).toBe('yi_wan_cheng')
    expect(仓库.huiHuaId).toBe('h1')
    // 关键断言：离开后绝不跳转到聊天页
    expect(luYou.currentRoute.value.path).not.toBe('/chat/h1')
    expect(luYou.currentRoute.value.path).toBe('/')
  })

  it('防重入：重复进入加载页展示进行中进度而非重新发起', async () => {
    const luYou = 创建路由()
    const pinia = createPinia()
    setActivePinia(pinia)
    受控生成() // 生成接口挂起，流程持续进行中

    // 第一次进入（带资料）
    const wrapper1 = await 挂载并透传资料(pinia, luYou)
    expect(使用角色生成仓库().zhuangTai).toBe('jin_xing_zhong')

    // 离开加载页（组件卸载 → 注销加载页标记）
    wrapper1.unmount()
    await 排空()
    // 重进加载页：sessionStorage 已被首次进入消费，走“进度接管”分支
    await 挂载并透传资料(pinia, luYou)
    expect(使用角色生成仓库().zhuangTai).toBe('jin_xing_zhong')
    expect(shengChengJiaoSe).toHaveBeenCalledTimes(1)
  })
})
