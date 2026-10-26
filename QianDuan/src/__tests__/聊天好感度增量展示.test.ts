import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import 提示带 from '@/components/提示带.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import { faSongXiaoXi as faSongXiaoXiApi, huoQuJiaoSeXiangQing, huoQuXiaoXi } from '@/api/聊天'

vi.mock('@/api/聊天')

const 本目录 = dirname(fileURLToPath(import.meta.url))
const 读源 = (...路径段: string[]) => readFileSync(resolve(本目录, '..', ...路径段), 'utf8')
const 聊天仓库源码 = 读源('stores/聊天.ts')
const 聊天页面源码 = 读源('views/聊天页面.vue')
const 提示带源码 = 读源('components/提示带.vue')

const WEI_DU = fanYi.zhanJi.haoGanDuWeiDu

function zengLiangShiJian(shiJianId: string, fuGai: Record<string, number | string> = {}) {
  return {
    shi_jian_id: shiJianId,
    jiao_se_id: 'j-1',
    xin_ren_du_bian_hua: (fuGai.xin_ren_du_bian_hua as number) ?? 0,
    qin_mi_du_bian_hua: (fuGai.qin_mi_du_bian_hua as number) ?? 0,
    qu_wei_du_bian_hua: (fuGai.qu_wei_du_bian_hua as number) ?? 0,
    guan_huai_du_bian_hua: (fuGai.guan_huai_du_bian_hua as number) ?? 0,
    zong_fen_bian_hua: (fuGai.zong_fen_bian_hua as number) ?? 0,
    ...(fuGai.jiao_se_id ? { jiao_se_id: fuGai.jiao_se_id } : {}),
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(huoQuXiaoXi).mockResolvedValue({ lie_biao: [], zong_shu: 0 } as never)
  vi.mocked(huoQuJiaoSeXiangQing).mockResolvedValue({ jiao_se: null, dang_an_zhuang_tai: null } as never)
})

describe('聊天好感度增量只读接收', () => {
  it('合法事件按四维与总分生成带符号标签，名称复用既有翻译键', async () => {
    const 仓库 = 使用聊天仓库()
    await 仓库.jiaZaiXiaoXi('j-1')
    仓库.jieShouHaoGanDuZengLiang(
      zengLiangShiJian('e-1', { qin_mi_du_bian_hua: 2, zong_fen_bian_hua: 3 }),
    )
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([
      { mingCheng: WEI_DU.qinMiBianHua, shuZhi: 2 },
      { mingCheng: WEI_DU.zongFenBianHua, shuZhi: 3 },
    ])
  })

  it('同一事件ID重复投递不重复累加展示', async () => {
    const 仓库 = 使用聊天仓库()
    await 仓库.jiaZaiXiaoXi('j-1')
    const shiJian = zengLiangShiJian('e-tong', { qin_mi_du_bian_hua: 2, zong_fen_bian_hua: 2 })
    仓库.jieShouHaoGanDuZengLiang(shiJian)
    仓库.jieShouHaoGanDuZengLiang(shiJian)
    仓库.jieShouHaoGanDuZengLiang({ ...shiJian })
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([
      { mingCheng: WEI_DU.qinMiBianHua, shuZhi: 2 },
      { mingCheng: WEI_DU.zongFenBianHua, shuZhi: 2 },
    ])
  })

  it('连续delta只显示净变化', async () => {
    const 仓库 = 使用聊天仓库()
    await 仓库.jiaZaiXiaoXi('j-1')
    仓库.jieShouHaoGanDuZengLiang(
      zengLiangShiJian('e-a', { xin_ren_du_bian_hua: 2, qin_mi_du_bian_hua: 3, zong_fen_bian_hua: 5 }),
    )
    仓库.jieShouHaoGanDuZengLiang(
      zengLiangShiJian('e-b', { xin_ren_du_bian_hua: -1, qin_mi_du_bian_hua: -1, zong_fen_bian_hua: -2 }),
    )
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([
      { mingCheng: WEI_DU.xinRenBianHua, shuZhi: 1 },
      { mingCheng: WEI_DU.qinMiBianHua, shuZhi: 2 },
      { mingCheng: WEI_DU.zongFenBianHua, shuZhi: 3 },
    ])
  })

  it('非当前会话、畸形或越权负载一律忽略', async () => {
    const 仓库 = 使用聊天仓库()
    await 仓库.jiaZaiXiaoXi('j-1')
    仓库.jieShouHaoGanDuZengLiang(zengLiangShiJian('e-ta', { zong_fen_bian_hua: 9, jiao_se_id: 'j-2' } as never))
    仓库.jieShouHaoGanDuZengLiang(null)
    仓库.jieShouHaoGanDuZengLiang('x')
    仓库.jieShouHaoGanDuZengLiang({ jiao_se_id: 'j-1', zong_fen_bian_hua: 5 })
    仓库.jieShouHaoGanDuZengLiang({ ...zengLiangShiJian('e-xiao', { zong_fen_bian_hua: 1.5 }) })
    仓库.jieShouHaoGanDuZengLiang({
      ...zengLiangShiJian('e-lei', { zong_fen_bian_hua: 1 }),
      zong_fen: 800,
      shi_fou_zha_xing: true,
      li_you: '内部理由',
      hu_dong_ci_shu: 66,
    })
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([])
  })

  it('全零事件可被接收且幂等，但不产生标签', async () => {
    const 仓库 = 使用聊天仓库()
    await 仓库.jiaZaiXiaoXi('j-1')
    仓库.jieShouHaoGanDuZengLiang(zengLiangShiJian('e-ling'))
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([])
    仓库.jieShouHaoGanDuZengLiang(zengLiangShiJian('e-ling'))
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([])
    仓库.jieShouHaoGanDuZengLiang(zengLiangShiJian('e-hou', { qin_mi_du_bian_hua: 1 }))
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([
      { mingCheng: WEI_DU.qinMiBianHua, shuZhi: 1 },
    ])
  })

  it('发送新消息开启新一轮，本轮增量标签复位', async () => {
    vi.mocked(faSongXiaoXiApi).mockResolvedValue({
      xiaoXi: { id: 's-1', hui_hua_id: 'j-1', lei_xing: 'wenben', nei_rong: 'hi' },
    } as never)
    const 仓库 = 使用聊天仓库()
    await 仓库.jiaZaiXiaoXi('j-1')
    仓库.jieShouHaoGanDuZengLiang(zengLiangShiJian('e-1', { zong_fen_bian_hua: 2 }))
    await 仓库.faSongXiaoXi('新一轮')
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([])
  })

  it('切换会话与清空状态都会复位增量展示', async () => {
    const 仓库 = 使用聊天仓库()
    await 仓库.jiaZaiXiaoXi('j-1')
    仓库.jieShouHaoGanDuZengLiang(zengLiangShiJian('e-1', { zong_fen_bian_hua: 2 }))
    await 仓库.jiaZaiXiaoXi('j-2')
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([])
    仓库.jieShouHaoGanDuZengLiang(zengLiangShiJian('e-2', { zong_fen_bian_hua: 1 }))
    仓库.qingKongZhuangTai()
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([])
  })

  it('socket订阅好感度增量事件且客户端提交路径不存在', () => {
    expect(聊天仓库源码).toContain("xieYiLianJie.on('好感度增量'")
    expect(聊天仓库源码).toContain('jieShouHaoGanDuZengLiang')
    expect(聊天仓库源码).not.toContain('faBuHaoGanDu')
  })
})

describe('AI声明行增量标签展示', () => {
  function guaZai(zengLiang?: { mingCheng: string; shuZhi: number }[]) {
    return mount(提示带, { props: { zengLiang } })
  }

  it('增量标签与AI声明同一行内展示且正负分色', () => {
    const 包 = guaZai([
      { mingCheng: WEI_DU.qinMiBianHua, shuZhi: 2 },
      { mingCheng: WEI_DU.guanHuaiBianHua, shuZhi: -1 },
    ])
    const rongQi = 包.find('.tishi-dai')
    expect(rongQi.exists()).toBe(true)
    const shengMing = 包.find('.tishi-dai-shengming')
    const zengLiangQu = 包.find('.tishi-dai-zengliang')
    expect(shengMing.exists()).toBe(true)
    expect(zengLiangQu.exists()).toBe(true)
    expect(shengMing.element.parentElement).toBe(rongQi.element)
    expect(zengLiangQu.element.parentElement).toBe(rongQi.element)
    expect(shengMing.text()).toContain(huoQuFanYi('tongYong', 'aiTiShiTiao'))
    const xiangMu = 包.findAll('.tishi-dai-zengliang-xiang')
    expect(xiangMu).toHaveLength(2)
    expect(xiangMu[0].text()).toBe(`${WEI_DU.qinMiBianHua} +2`)
    expect(xiangMu[1].text()).toBe(`${WEI_DU.guanHuaiBianHua} -1`)
    expect(xiangMu[0].classes()).toContain('zheng')
    expect(xiangMu[1].classes()).toContain('fu')
    包.unmount()
  })

  it('无增量时不渲染标签区域，不破坏既有军师页面用法', () => {
    const 包 = guaZai()
    expect(包.find('.tishi-dai-zengliang').exists()).toBe(false)
    expect(包.find('.tishi-dai-shengming').text()).toContain(huoQuFanYi('tongYong', 'aiTiShiTiao'))
    包.unmount()
  })

  it('标签不换行断行、动画克制并尊重reduced-motion', () => {
    expect(提示带源码).toContain('white-space: nowrap')
    expect(提示带源码).toContain('@media (prefers-reduced-motion: reduce)')
    expect(提示带源码).toMatch(/animation:[^;]*;/)
  })

  it('聊天页面把仓库净变化标签传入提示带', () => {
    expect(聊天页面源码).toContain(':zeng-liang=')
  })
})

describe('好感度增量监听注册', () => {
  function zhuCeMocks(keGuanLiZhiDu: boolean) {
    const jianTing = new Map<string, (shuJu: unknown) => void>()
    vi.resetModules()
    vi.doMock('socket.io-client', () => ({
      io: vi.fn(() => ({
        on: vi.fn((shiJian: string, huiDiao: (shuJu: unknown) => void) => {
          jianTing.set(shiJian, huiDiao)
        }),
        connected: false,
        emit: vi.fn(),
        disconnect: vi.fn(),
        removeAllListeners: vi.fn(),
      })),
    }))
    vi.doMock('@/stores/用户', () => ({
      使用用户仓库: () => ({ keGuanLiZhiDu, nengLieBiao: [] }),
    }))
    return jianTing
  }

  it('普通玩家（非管理员）建立socket后监听已注册且能收到增量', async () => {
    const jianTing = zhuCeMocks(false)
    const { 使用聊天仓库: cangKu } = await import('@/stores/聊天')
    setActivePinia(createPinia())
    const 仓库 = cangKu()
    仓库.lianJieSocket('j-9')
    expect(jianTing.has('好感度增量')).toBe(true)
    await 仓库.jiaZaiXiaoXi('j-9')
    jianTing.get('好感度增量')!(zengLiangShiJian('e-wan', { zong_fen_bian_hua: 2, jiao_se_id: 'j-9' }))
    expect(仓库.haoGanDuZengLiangBiaoQian).toEqual([
      { mingCheng: WEI_DU.zongFenBianHua, shuZhi: 2 },
    ])
  })

  it('管理员监控订阅保持门槛：非管理员不注册管理员事件', async () => {
    const jianTing = zhuCeMocks(false)
    const { 使用聊天仓库: cangKu } = await import('@/stores/聊天')
    setActivePinia(createPinia())
    const 仓库 = cangKu()
    仓库.lianJieSocket('j-9')
    expect(jianTing.has('管理员_构建过程')).toBe(false)
    expect(jianTing.has('好感度增量')).toBe(true)
  })
})
