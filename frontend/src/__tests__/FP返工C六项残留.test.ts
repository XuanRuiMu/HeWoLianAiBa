import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ZhangHaoAnQuan from '@/views/账号与安全.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用用户仓库 } from '@/stores/用户'
import 出生日期选择器 from '@/components/认证/出生日期选择器.vue'
import { huoQuFanYi } from '@/config/translations'
import { 规则清单 } from './CSS级联真源'

vi.mock('@/api/认证', () => ({
  gengGaiYongHuMing: vi.fn().mockResolvedValue({ yong_hu_ming: 'x' }),
  gengGaiMiMa: vi.fn().mockResolvedValue(undefined),
  gengGaiMoRenXingBie: vi.fn().mockResolvedValue(undefined),
  faSongMa: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/api/社交', () => ({
  huoQuYongHuSheZhi: vi.fn().mockResolvedValue({
    uid: 'u1',
    shou_ji_hao: '13800138000',
    tou_xiang: null,
    qian_ming: null,
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: 'moRen',
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  }),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  shangChuanLiaoTianBeiJing: vi.fn().mockResolvedValue('https://cdn.example.com/beijing/x.jpg'),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
  huoQuHaoYouLieBiao: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/api/资料', async (yuanShi) => {
  const shiJi = (await yuanShi()) as Record<string, unknown>
  return {
    ...shiJi,
    baoCunQianMing: vi.fn().mockResolvedValue(undefined),
    shangChuanTouXiang: vi.fn().mockResolvedValue('/api/媒体/abc'),
    huoQuFengJinZhuangTai: vi.fn().mockResolvedValue({
      bei_feng_jin: false,
      ji_bie: 'zheng_chang',
      wei_gui_ci_shu: 0,
      jie_feng_shi_jian: null,
      shen_su_zhuang_tai: 'wu',
    }),
    tiJiaoShenSu: vi.fn().mockResolvedValue(undefined),
  }
})
vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))
vi.mock('@/utils/图片压缩', () => ({
  yaSuoTuPiang: vi.fn().mockImplementation(async (wenJian: Blob) => wenJian),
}))
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

const 账号源 = readFileSync(resolve(__dirname, '../views/账号与安全.vue'), 'utf8')
const 登录源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
const 出生源 = readFileSync(resolve(__dirname, '../components/认证/出生日期选择器.vue'), 'utf8')

function jianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', name: 'gen', component: { template: '<div />' } }],
  })
}

async function guaZhangHao() {
  setActivePinia(createPinia())
  const wrapper = mount(ZhangHaoAnQuan, {
    global: { plugins: [jianLuYou()] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function sheZhiWenJian(shuRu: unknown, wenJian: File) {
  const yuanSu = shuRu as HTMLInputElement
  Object.defineProperty(yuanSu, 'files', { value: [wenJian], configurable: true })
}

const 挂载中: VueWrapper[] = []

function guaChuSheng(覆盖: Record<string, string> = {}): VueWrapper {
  const wrapper = mount(出生日期选择器, {
    props: {
      modelValue: '',
      idQianZhui: 'zhuce-chushengriqi',
      zuiXiao: '1900-01-01',
      zuiDa: '2099-12-31',
      ...覆盖,
    },
    attachTo: document.body,
  })
  挂载中.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (挂载中.length > 0) 挂载中.pop()?.unmount()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('FP-返工C D1 出生日期单快照（双jinRiSan竞态收口）', () => {
  it('huiDaoJinRi 只取一次今日快照：守卫/刷新/钳位同源', () => {
    const 段 = /function huiDaoJinRi\(\)[\s\S]*?\n}/.exec(出生源)?.[0] ?? ''
    expect(段).toContain('const kuaiZhao = jinRiSan()')
    expect(段.match(/jinRiSan\(\)/g)?.length ?? 0).toBe(1)
    expect(段).toContain('if (!shiFouKeXuan(kuaiZhao)) return')
    expect(段).toContain('jinRi.value = kuaiZhao')
    expect(段).toContain('jiaZhenRuFanWei(kuaiZhao)')
  })

  it('跨午夜回新今天：打开后改系统时间，今天钮导航到新今天且不外发', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1995, 2, 7, 12, 0, 0))
    const wrapper = guaChuSheng({ modelValue: '1995-03-07' })
    await wrapper.find('.rili-da-kai').trigger('click')
    await flushPromises()
    vi.setSystemTime(new Date(1995, 2, 8, 0, 0, 1))
    const 钮 = [...document.querySelectorAll<HTMLButtonElement>('.rili-jiao-bu-anniu')].find(
      (anNiu) => anNiu.textContent?.trim() === huoQuFanYi('ui', 'riQiJinRi'),
    ) as HTMLButtonElement
    钮.click()
    await flushPromises()
    const 光标 = document.querySelector('.rili-ri[data-jiao-dian="true"]')?.getAttribute('aria-label')
    expect(光标).toBe(
      `${huoQuFanYi('ui', 'riQiJinRi')} 1995${huoQuFanYi('ui', 'riQiNian')}3${huoQuFanYi('ui', 'riQiYue')}8${huoQuFanYi('ui', 'riQiRi')}`,
    )
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('FP-返工C D2 跨午夜禁用态stale收口（守卫失败亦刷新+定时刷新二选一）', () => {
  it('禁用态与守卫双新鲜：keYiHuiJinRi 读定时刷新的 jinRi 快照（非 setup 旧值）', () => {
    expect(出生源).toContain('const keYiHuiJinRi = computed(() => shiFouKeXuan(jinRi.value))')
    expect(出生源).toContain('setInterval(shuaXinJinRiKuaiZhao, WU_YE_SHUA_XIN_JIAN_GE)')
    expect(出生源).toContain('jinRi.value = jinRiSan()')
  })

  it('跨午夜禁用态定时刷新：每分钟刷新今日快照，越界后禁用态跟新今天走', async () => {
    expect(出生源).toContain('WU_YE_SHUA_XIN_JIAN_GE = 60000')
    expect(出生源).toContain('setInterval(shuaXinJinRiKuaiZhao, WU_YE_SHUA_XIN_JIAN_GE)')
    expect(出生源).toContain('clearInterval(wuYeDingShiQi)')
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1995, 2, 7, 12, 0, 0))
    const wrapper = guaChuSheng({ modelValue: '1995-03-07', zuiDa: '1995-03-07' })
    await wrapper.find('.rili-da-kai').trigger('click')
    await flushPromises()
    const 钮旧 = [...document.querySelectorAll<HTMLButtonElement>('.rili-jiao-bu-anniu')].find(
      (anNiu) => anNiu.textContent?.trim() === huoQuFanYi('ui', 'riQiJinRi'),
    ) as HTMLButtonElement
    expect(钮旧.disabled).toBe(false)
    vi.setSystemTime(new Date(1995, 2, 8, 0, 0, 1))
    await vi.advanceTimersByTimeAsync(60000)
    await flushPromises()
    await wrapper.vm.$nextTick()
    const 钮新 = [...document.querySelectorAll<HTMLButtonElement>('.rili-jiao-bu-anniu')].find(
      (anNiu) => anNiu.textContent?.trim() === huoQuFanYi('ui', 'riQiJinRi'),
    ) as HTMLButtonElement
    expect((wrapper.vm as unknown as { jinRi: { nian: number; yue: number; ri: number } }).jinRi, '定时器未刷新今日快照').toEqual({
      nian: 1995,
      yue: 3,
      ri: 8,
    })
    expect(钮新.disabled).toBe(true)
    钮新.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('FP-返工C D3 登录 busy active 守色', () => {
  it('active 态仍压暗：busy 下按住不变亮不位移', () => {
    const 样式段 = 登录源.slice(登录源.indexOf('<style'), 登录源.lastIndexOf('</style>'))
    const 命中 = 规则清单(样式段.replace(/\/\*[\s\S]*?\*\//g, '').replace(
      /@keyframes[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g,
      '',
    )).filter((项) => 项.选择器 === ".anniu-zhuyao[aria-busy='true']:active:not(:disabled)")
    expect(命中.length).toBe(1)
    expect(命中[0].声明.get('filter')).toMatch(/brightness\(0\.82\)/)
    expect(命中[0].声明.get('transform')).toBe('none')
  })

  it('hover 态仍压暗：busy 下悬停不变亮（morph 账本外声明）', () => {
    expect(登录源).toContain(".anniu-zhuyao[aria-busy='true']:hover:not(:disabled)")
    expect(登录源).toContain('brightness(0.82)')
  })
})

describe('FP-返工C D4 未知口径分叉收口（一律走解析性别）', () => {
  it('账号页无未知字面特支：解析 null 分支直达未设置', () => {
    expect(账号源).not.toContain("=== '未知'")
    expect(账号源).not.toContain('weiZhiXingBie')
    expect(账号源).toContain("return huoQuFanYi('caidan', 'moRenDuiXiangWeiSheZhi')")
  })

  it('未知与脏写法同显未设置：与向导起始推导同判没设', async () => {
    const wrapper = await guaZhangHao()
    const 用户仓库 = 使用用户仓库()
    for (const 脏 of ['未知', 'unknown', '', null]) {
      用户仓库.dangQianYongHu = {
        id: 'u1',
        shou_ji_hao: '13800138000',
        yong_hu_ming: 'x',
        ni_cheng: 'x',
        mu_biao_xing_bie: 脏 as never,
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
        chuang_jian_shi_jian: new Date().toISOString(),
        geng_xin_shi_jian: new Date().toISOString(),
      } as never
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-zhi="moRenDuiXiang"]').text()).toBe(
        huoQuFanYi('caidan', 'moRenDuiXiangWeiSheZhi'),
      )
    }
    wrapper.unmount()
  })

  it('六种合法写法仍分男女：male/female 与中文同解', async () => {
    const wrapper = await guaZhangHao()
    const 用户仓库 = 使用用户仓库()
    const 期望: Array<[unknown, string]> = [
      ['male', huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')],
      ['female', huoQuFanYi('ziLiaoSheZhi', 'xingBieNv')],
      ['男', huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')],
      ['女', huoQuFanYi('ziLiaoSheZhi', 'xingBieNv')],
    ]
    for (const [写法, 文案] of 期望) {
      用户仓库.dangQianYongHu = {
        id: 'u1',
        shou_ji_hao: '13800138000',
        yong_hu_ming: 'x',
        ni_cheng: 'x',
        mu_biao_xing_bie: 写法 as never,
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
        chuang_jian_shi_jian: new Date().toISOString(),
        geng_xin_shi_jian: new Date().toISOString(),
      } as never
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-zhi="moRenDuiXiang"]').text()).toBe(文案)
    }
    wrapper.unmount()
  })
})

describe('FP-返工C D5 背景别名与URL同存（上传成功不清别名）', () => {
  it('上传成功别名与URL同存：store 落别名且当前背景名回显别名', async () => {
    const wrapper = await guaZhangHao()
    await wrapper.find('#zi-ding-yi-bei-jing-ming-cheng').setValue('我的星空')
    const shuRu = wrapper.find('.zi-ding-yi-bei-jing-qu input[type="file"]')
    sheZhiWenJian(shuRu.element, new File(['tu'], 'b.png', { type: 'image/png' }))
    await shuRu.trigger('change')
    await flushPromises()
    const 仓库 = 使用用户设置仓库()
    expect(仓库.liaoTianBeiJing).toBe('https://cdn.example.com/beijing/x.jpg')
    expect(仓库.ziDingYiBeiJingBieMing).toBe('我的星空')
    expect(wrapper.text()).toContain('我的星空')
    wrapper.unmount()
  })

  it('删除自定义清别名：回默认后当前背景名不再回显旧别名', async () => {
    const wrapper = await guaZhangHao()
    const 仓库 = 使用用户设置仓库()
    await 仓库.baoCunZiDingYiBeiJing('https://cdn.example.com/beijing/x.jpg', '旧别名')
    expect(仓库.ziDingYiBeiJingBieMing).toBe('旧别名')
    await 仓库.qingChuZiDingYiBeiJing()
    expect(仓库.liaoTianBeiJing).toBe('moRen')
    expect(仓库.ziDingYiBeiJingBieMing).toBe('')
    wrapper.unmount()
  })
})

describe('FP-返工C D6 重试改用tongYiShiBai双判', () => {
  it('chongShiDingCeng 走双判：同恋爱码异 code 不合并重试', () => {
    expect(账号源).toContain('if (quanJu && benDi && tongYiShiBai(quanJu, benDi)) {')
    expect(账号源).not.toContain('quanJu.lianAiMa === benDi.lianAiMa) {')
  })
})
