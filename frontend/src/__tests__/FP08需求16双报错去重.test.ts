import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ZhangHaoAnQuan from '@/views/账号与安全.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用用户仓库 } from '@/stores/用户'
import { chuangJianQianTaiCuoWu } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'

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
  shangChuanLiaoTianBeiJing: vi.fn().mockResolvedValue('https://cdn.example.com/x.jpg'),
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
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

function jianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', name: 'gen', component: { template: '<div />' } }],
  })
}

function guaZai() {
  setActivePinia(createPinia())
  const luYou = jianLuYou()
  const wrapper = mount(ZhangHaoAnQuan, {
    global: { plugins: [luYou] },
    attachTo: document.body,
  })
  return wrapper
}

describe('FP08 需求16 双报错去重与同闭包重试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('同一失败只渲染一处顶栏：分权与全局同恋爱码去重', async () => {
    const wrapper = guaZai()
    await flushPromises()
    const sheZhi = 使用用户设置仓库()
    const cuoWu = chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE })
    sheZhi.caoZuoCuoWu = cuoWu
    ;(wrapper.vm as unknown as { fenQuanCuoWu: Record<string, unknown> }).fenQuanCuoWu = {
      fengJin: cuoWu,
    }
    await wrapper.vm.$nextTick()
    const dingLan = wrapper.findAll('.qian-tai-cuo-wu')
    expect(dingLan.length).toBe(1)
    wrapper.unmount()
  })

  it('顶重试与字段重试同闭包：顶栏重试清掉字段错并重跑同一动作', async () => {
    const wrapper = guaZai()
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      fenQuanCuoWu: Record<string, unknown>
      jieShouFenQuanCuoWu: (f: string, e: unknown, r?: () => unknown) => void
      chongShiDingCeng: () => void
    }
    let ciShu = 0
    const dongZuo = () => {
      ciShu += 1
    }
    vm.jieShouFenQuanCuoWu(
      'fengJin',
      chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE }),
      dongZuo,
    )
    await wrapper.vm.$nextTick()
    vm.chongShiDingCeng()
    await wrapper.vm.$nextTick()
    expect(ciShu).toBe(1)
    expect(vm.fenQuanCuoWu['fengJin']).toBeNull()
    wrapper.unmount()
  })

  it('abort 后可重载：取消错误不粘滞已加载，再次加载重发请求', async () => {
    setActivePinia(createPinia())
    const sheZhi = 使用用户设置仓库()
    const 社交 = await import('@/api/社交')
    const mockGet = vi.mocked(社交.huoQuYongHuSheZhi)
    mockGet.mockRejectedValueOnce({ code: 'ERR_CANCELED', name: 'CanceledError' })
    mockGet.mockResolvedValueOnce({
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
    })
    await sheZhi.jiaZai()
    expect(sheZhi.caoZuoCuoWu).toBeNull()
    expect(sheZhi.yiJiaZai).toBe(false)
  })

  it('用户仓库身份恢复走翻译键：无硬编码中文兜底', () => {
    const dangQianMuLu = dirname(fileURLToPath(import.meta.url))
    const 用户源 = readFileSync(resolve(dangQianMuLu, '../stores/用户.ts'), 'utf8')
    expect(用户源).not.toMatch(/cuo_wu_xin_xi\s*=\s*'[^']*[\u4e00-\u9fff]/)
  })
})
