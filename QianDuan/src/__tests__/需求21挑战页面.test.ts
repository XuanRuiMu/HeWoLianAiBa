import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { huoQuFanYi } from '@/config/翻译表'
import type { PaiHangXiangMu, ZuBieGaiKuang } from '@/api/挑战'

const { 路由推 } = vi.hoisted(() => ({ 路由推: vi.fn() }))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: 路由推 }) }))
vi.mock('@/stores/用户', () => ({ 使用用户仓库: () => ({ dangQianYongHu: null }) }))
vi.mock('@/api/挑战', () => ({
  huoQuDangQianDuiJu: vi.fn(),
  huoQuWoDeGaiKuang: vi.fn(),
  huoQuPaiHangBang: vi.fn(),
  huoQuTiaoZhanPeiZhi: vi.fn(),
  fangQiDuiJu: vi.fn(),
}))

import 挑战主页 from '@/views/挑战主页.vue'
import 挑战积分榜 from '@/views/挑战积分榜.vue'
import 挑战渣型提示 from '@/components/挑战渣型提示.vue'
import {
  fangQiDuiJu,
  huoQuDangQianDuiJu,
  huoQuPaiHangBang,
  huoQuTiaoZhanPeiZhi,
  huoQuWoDeGaiKuang,
} from '@/api/挑战'

const 本目录 = dirname(fileURLToPath(import.meta.url))
const 读源 = (...路径段: string[]) => readFileSync(resolve(本目录, '..', ...路径段), 'utf8')

const 概况: ZuBieGaiKuang[] = [
  {
    zu_bie: 'nan_nv',
    ji_fen: 1420,
    duan_wei: '荣耀王者',
    sheng_chang: 12,
    fu_chang: 3,
    qi_quan_chang: 1,
    lian_sheng: 4,
    pai_ming: 3,
  },
  {
    zu_bie: 'nv_nan',
    ji_fen: 880,
    duan_wei: '星耀',
    sheng_chang: 7,
    fu_chang: 6,
    qi_quan_chang: 0,
    lian_sheng: 2,
    pai_ming: 18,
  },
  {
    zu_bie: 'nv_nv',
    ji_fen: 300,
    duan_wei: '铂金',
    sheng_chang: 2,
    fu_chang: 1,
    qi_quan_chang: 3,
    lian_sheng: 1,
    pai_ming: 42,
  },
]

const 榜单: PaiHangXiangMu[] = [
  {
    pai_ming: 1,
    yong_hu_ming: '江晚吟',
    ji_fen: 3120,
    duan_wei: '最强王者',
    sheng_chang: 40,
    fu_chang: 2,
    qi_quan_chang: 0,
    zui_gao_lian_sheng: 12,
  },
  {
    pai_ming: 2,
    yong_hu_ming: '把所有温柔都留给夏天',
    ji_fen: 2880,
    duan_wei: '荣耀王者',
    sheng_chang: 31,
    fu_chang: 5,
    qi_quan_chang: 1,
    zui_gao_lian_sheng: 8,
  },
  {
    pai_ming: 3,
    yong_hu_ming: '沈知遥',
    ji_fen: 2605,
    duan_wei: '荣耀王者',
    sheng_chang: 28,
    fu_chang: 7,
    qi_quan_chang: 2,
    zui_gao_lian_sheng: 6,
  },
]

const 当前对局 = {
  id: 'dui-1',
  jiao_se_id: '11111111-1111-1111-1111-111111111111',
  wan_jia_xing_bie: '男' as const,
  dui_xiang_xing_bie: '女' as const,
  wei_xin_ming: '林小满',
  tou_xiang: '',
  chuang_jian_shi_jian: '2026-10-20T10:00:00.000Z',
}

async function 挂主页(当前: typeof 当前对局 | null = null) {
  vi.mocked(huoQuDangQianDuiJu).mockResolvedValue(当前)
  const 包 = mount(挑战主页, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return 包
}

async function 挂榜单() {
  const 包 = mount(挑战积分榜)
  await flushPromises()
  return 包
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.mocked(huoQuDangQianDuiJu).mockResolvedValue(null)
  vi.mocked(huoQuWoDeGaiKuang).mockResolvedValue(概况)
  vi.mocked(huoQuPaiHangBang).mockResolvedValue(榜单)
  vi.mocked(huoQuTiaoZhanPeiZhi).mockResolvedValue({ zha_xing_gai_lv: 0.35 })
  vi.mocked(fangQiDuiJu).mockResolvedValue({
    jie_guo: { jie_guo_lei_xing: 'fang_qi', zhuang_tai_wen_ben: '', ke_ji_xu_liao_tian: true },
  })
})

describe('挑战主页信息结构', () => {
  it('四个组别恒定成行，缺失组别落未参赛，统计只算已参赛', async () => {
    const 包 = await 挂主页()
    expect(包.findAll('.zubie-hang')).toHaveLength(4)
    expect(包.findAll('.zubie-kong')).toHaveLength(1)
    expect(包.find('.zubie-kong').text()).toBe(huoQuFanYi('tiaoZhan', 'weiCanJia'))
    const 统计 = 包.findAll('.tongji-xiang dd').map((项) => 项.text())
    expect(统计[0]).toContain('3')
    expect(统计[0]).toContain('4')
    expect(统计[1]).toBe('1420')
    包.unmount()
  })

  it('排行摘要展示前三名与本组名次，并随首个已参赛组别加载', async () => {
    const 包 = await 挂主页()
    expect(包.findAll('.zhaiyao-hang')).toHaveLength(3)
    expect(包.find('.zhaiyao-wo').text()).toContain('3')
    expect(huoQuPaiHangBang).toHaveBeenCalledWith('nan_nv')
    包.unmount()
  })

  it('对局进行中时禁用开新局，放弃需二次确认且可取消', async () => {
    const 包 = await 挂主页(当前对局)
    expect(包.find('.duiju-qu').exists()).toBe(true)
    expect(包.find('.duiju-ming').text()).toBe('林小满')
    expect(包.find('.anniu-kaiShi').attributes('disabled')).toBeDefined()
    expect(包.find('.rukou-tishi').text()).toBe(huoQuFanYi('tiaoZhan', 'yiYouDuiJuTishi'))
    await 包.find('.duiju-cao .anniu--wei').trigger('click')
    expect(包.findAll('.duiju-cao .anniu')).toHaveLength(3)
    expect(包.find('.duiju-cao .anniu--wei').text()).toBe(huoQuFanYi('tiaoZhan', 'queRenFangQi'))
    await 包.find('.duiju-cao .anniu--mo').trigger('click')
    expect(包.findAll('.duiju-cao .anniu')).toHaveLength(2)
    包.unmount()
  })
})

describe('性别选择弹层', () => {
  it('先选自己才解锁对象，选中即带性别配色且不再带外发光', async () => {
    const 包 = await 挂主页()
    await 包.find('.anniu-kaiShi').trigger('click')
    await flushPromises()
    const 组 = 包.findAll('.xingbie-zu')
    expect(组).toHaveLength(2)
    const 自己组 = 组[0]
    const 对象组 = 组[1]
    if (!自己组 || !对象组) throw new Error('缺少性别分组')
    expect(对象组.findAll('.xingbie-ka-pian').every((片) => 片.attributes('disabled') !== undefined)).toBe(
      true,
    )
    expect(包.find('.xingbie-tishi').text()).toBe(huoQuFanYi('tiaoZhan', 'xianXuanZiJi'))
    await 自己组.findAll('.xingbie-ka-pian')[0]?.trigger('click')
    expect(对象组.findAll('.xingbie-ka-pian').some((片) => 片.attributes('disabled') !== undefined)).toBe(
      false,
    )
    const 选中 = 包.find('.xingbie-ka-pian[aria-checked="true"]')
    expect(选中.exists()).toBe(true)
    expect(选中.attributes('style')).toContain('background-color')
    expect(选中.attributes('style')).not.toContain('box-shadow')
    包.unmount()
  })

  it('选择对象后携带临时资料进入添加微信，Esc 可关闭弹层', async () => {
    const 包 = await 挂主页()
    await 包.find('.anniu-kaiShi').trigger('click')
    await flushPromises()
    await 包.findAll('.xingbie-zu')[0]?.findAll('.xingbie-ka-pian')[0]?.trigger('click')
    await 包.findAll('.xingbie-zu')[1]?.findAll('.xingbie-ka-pian')[0]?.trigger('click')
    await flushPromises()
    expect(路由推).toHaveBeenCalledWith('/tian-jia-wei-xin')
    const 临时 = sessionStorage.getItem('ziLiaoSheZhiLinShi')
    expect(临时).toBeTruthy()
    expect(JSON.parse(临时 ?? '{}')).toMatchObject({ moshi: 'tiaozhan', woDeXingBie: '男' })
    包.unmount()
  })

  it('Escape 关闭弹层并归还页面滚动', async () => {
    const 包 = await 挂主页()
    await 包.find('.anniu-kaiShi').trigger('click')
    await flushPromises()
    expect(包.find('.xingbie-tanchuang').exists()).toBe(true)
    await 包.find('.xingbie-zhezhao').trigger('keydown', { key: 'Escape' })
    expect(包.find('.xingbie-tanchuang').exists()).toBe(false)
    包.unmount()
  })
})

describe('挑战渣型提示', () => {
  it('概率换算成百分比并走翻译表，零概率不渲染', async () => {
    const 包 = mount(挑战渣型提示, { props: { zhaXingGaiLv: 0.35 } })
    expect(包.text()).toBe('本模式有35%的对局会遇到渣型角色，请谨慎选择')
    expect(包.find('.zha-xing-ti-shi').exists()).toBe(true)
    await 包.setProps({ zhaXingGaiLv: 0 })
    expect(包.find('.zha-xing-ti-shi').exists()).toBe(false)
  })
})

describe('挑战积分榜', () => {
  it('按组别渲染真实列表，前三名带金色标记', async () => {
    const 包 = await 挂榜单()
    const 行 = 包.findAll('.bangdan-hang')
    expect(行).toHaveLength(3)
    expect(行[0]?.text()).toContain('江晚吟')
    expect(行[0]?.text()).toContain('3120')
    expect(行[0]?.classes()).toContain('bangdan-hang--qian')
    expect(行[2]?.classes()).toContain('bangdan-hang--qian')
    expect(包.findAll('.tou-tongji dd')[0]?.text()).toContain('3')
    包.unmount()
  })

  it('切换组别重新请求并从第一组开始渲染', async () => {
    const 第二条 = 榜单[1]
    if (!第二条) throw new Error('缺少第二条榜单')
    vi.mocked(huoQuPaiHangBang).mockResolvedValue([第二条])
    const 包 = await 挂榜单()
    await 包.findAll('.zubie-anNiu')[1]?.trigger('click')
    await flushPromises()
    expect(huoQuPaiHangBang).toHaveBeenLastCalledWith('nv_nan')
    expect(包.find('.bangdan-hang').text()).toContain('把所有温柔都留给夏天')
    包.unmount()
  })

  it('空榜进入空态而不是空表格，且表头一并收起', async () => {
    vi.mocked(huoQuPaiHangBang).mockResolvedValue([])
    const 包 = await 挂榜单()
    expect(包.find('.bangdan-kong').exists()).toBe(true)
    expect(包.findAll('.bangdan-hang')).toHaveLength(0)
    expect(包.find('.bangdan-tou').exists()).toBe(false)
    expect(包.find('.bangdan-kong').text()).toContain(huoQuFanYi('tiaoZhan', 'zanWuPaiHang'))
    expect(包.find('.bangdan-kong').text()).toContain(huoQuFanYi('tiaoZhan', 'bangDanKongFu'))
    expect(包.find('.kong-anniu').exists()).toBe(true)
    await 包.find('.kong-anniu').trigger('click')
    expect(路由推).toHaveBeenCalledWith('/tiao-zhan')
    包.unmount()
  })
})

describe('挑战页空态', () => {
  it('四个组别全无成绩时给出空态提示，而不是只摆四行未参赛', async () => {
    vi.mocked(huoQuWoDeGaiKuang).mockResolvedValue([])
    const 包 = await 挂主页()
    expect(包.find('.zubie-kong-ti').exists()).toBe(true)
    expect(包.find('.zubie-kong-ti').text()).toBe(huoQuFanYi('tiaoZhan', 'zubieKongTiShi'))
    expect(包.findAll('.zubie-hang')).toHaveLength(4)
    expect(包.find('.anniu-kaiShi').exists()).toBe(true)
    包.unmount()
  })

  it('有成绩时不出现空态提示', async () => {
    const 包 = await 挂主页()
    expect(包.find('.zubie-kong-ti').exists()).toBe(false)
    包.unmount()
  })
})

describe('挑战文案账本', () => {
  it('页面引用的每个 tiaoZhan 键都能取到实际文案', () => {
    const 源 = [
      读源('views', '挑战主页.vue'),
      读源('views', '挑战积分榜.vue'),
      读源('components', '挑战渣型提示.vue'),
    ].join('\n')
    const 键集 = new Set(
      [...源.matchAll(/huoQuFanYi\('tiaoZhan', '([^']+)'\)/g)].map((项) => 项[1] as string),
    )
    expect(键集.size).toBeGreaterThan(30)
    for (const 键 of 键集) {
      expect(huoQuFanYi('tiaoZhan', 键), 键).not.toBe(键)
    }
  })
})
