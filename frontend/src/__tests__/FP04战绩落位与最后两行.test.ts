import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import 过往战绩 from '@/views/过往战绩.vue'
import { huoQuFanYi } from '@/config/translations'
import {
  huoQuDangAnLieBiao,
  huoQuZhanJiFenLeiLieBiao,
  paiXuFenLeiNeiZhanJi,
} from '@/api/聊天'
import type { DangAnXiangQing, ZhanJiZuiHouXiaoXi } from '@/types'

vi.mock('vue-draggable-plus', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    VueDraggable: vue.defineComponent({
      name: 'VueDraggable',
      props: { modelValue: { type: Array, default: () => [] }, disabled: Boolean },
      emits: ['update:modelValue', 'start', 'end'],
      setup(_props, { slots, attrs }) {
        return () => vue.h('div', { class: ['vue-draggable-stub', attrs.class] }, slots.default?.())
      },
    }),
  }
})

vi.mock('@/api/聊天')

const 分类 = '00000000-0000-4000-8000-000000000001'
const 视图源 = readFileSync(resolve(__dirname, '../views/过往战绩.vue'), 'utf8')

function 两行(id: string): DangAnXiangQing {
  const 行: ZhanJiZuiHouXiaoXi[] = [
    { shi_jian: '2026-07-02T10:00:00.000Z', fa_song_zhe: 'yonghu', zhai_yao: '在吗' },
    { shi_jian: '2026-07-02T10:01:00.000Z', fa_song_zhe: 'jiaose', zhai_yao: '在的' },
  ]
  return {
    id,
    jiao_se_id: `jiao-se-${id.slice(-1)}`,
    jiao_se_ming_zi: `记录${id.slice(-1)}`,
    shi_fou_zha_xing: false,
    jie_guo_lei_xing: '',
    jie_guo_lei_xing_yuan: 'jinxing_zhong',
    shi_fou_feng_cun: false,
    liao_tian_tian_shu: 1,
    xiao_xi_zong_shu: 2,
    fu_pan_shu_ju: null,
    fu_pan_nei_rong: null,
    zui_hou_liang_tiao: 行,
    chuang_jian_shi_jian: '2026-07-01T00:00:00.000Z',
    zui_hou_xiao_xi_shi_jian: '2026-07-02T10:01:00.000Z',
    you_xi_jie_shu_shi_jian: null,
    mbti_lei_xing: 'INFP',
    jun_shi_ji_lu: [],
    category_id: 分类,
    sort_order: 0,
  }
}

function 三行(): DangAnXiangQing[] {
  return [
    两行('00000000-0000-4000-8000-000000000101'),
    两行('00000000-0000-4000-8000-000000000102'),
    两行('00000000-0000-4000-8000-000000000103'),
  ]
}

async function 挂载(行: DangAnXiangQing[] = 三行()) {
  vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(行)
  const 路由 = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await 路由.push('/')
  const pinia = createPinia()
  setActivePinia(pinia)
  const 包 = mount(过往战绩, { global: { plugins: [pinia, 路由] }, attachTo: document.body })
  await flushPromises()
  return 包
}

describe('FP-04 需求7落位动画', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    vi.mocked(huoQuZhanJiFenLeiLieBiao).mockResolvedValue({
      moRenFenLeiId: 分类,
      fenLeiLieBiao: [
        { id: 分类, name: '默认分类', is_default: true, record_count: 3, version: 0, sort_order: 0 },
      ],
    })
  })

  it('排序切换走落位次首帧：先读位置再写顺序，且减动效档跳过动画', async () => {
    const 包 = await 挂载()
    const 暴露 = 包.vm as unknown as {
      qieHuanPaiXuWeiDu: (值: 'shouDong' | 'chuangJianShiJian') => void
      boFangLuoWeiDongHua: (前: Map<string, number>) => Promise<void>
      duQuKaPianWeiZhi: () => Map<string, number>
    }
    expect(typeof 暴露.boFangLuoWeiDongHua).toBe('function')
    expect(typeof 暴露.duQuKaPianWeiZhi).toBe('function')
    const 源 = 视图源.slice(0, 视图源.indexOf('<style'))
    expect(源).toContain('duQuKaPianWeiZhi()')
    expect(源).toContain('boFangLuoWeiDongHua(qianWeiZhi)')
    expect(源).toContain('nextTick()')
    expect(源).toContain('.animate(')
    expect(源).toContain('prefers-reduced-motion')
    暴露.qieHuanPaiXuWeiDu('chuangJianShiJian')
    await flushPromises()
    expect(paiXuFenLeiNeiZhanJi).not.toHaveBeenCalled()
    包.unmount()
  })

  it('乐观排序提交后同样补落位，且版本锁与可见集校验一字未动', async () => {
    const 行 = 三行()
    const 包 = await 挂载(行)
    const 暴露 = 包.vm as unknown as { yidongJiLu: (id: string, dir: -1 | 1) => Promise<void> }
    const 提 = [行[1]!.id, 行[0]!.id, 行[2]!.id]
    vi.mocked(paiXuFenLeiNeiZhanJi).mockResolvedValueOnce({
      category_id: 分类,
      record_ids: 提,
      version: 1,
    })
    await 暴露.yidongJiLu(行[1]!.id, -1)
    await flushPromises()
    expect(paiXuFenLeiNeiZhanJi).toHaveBeenCalledWith(分类, 提, 0)
    const 仓库源 = readFileSync(resolve(__dirname, '../stores/战绩.ts'), 'utf8')
    expect(仓库源).toContain('category.version')
    expect(仓库源).toContain('paiXuZiDuanDengYu')
    包.unmount()
  })

  it('时长曲线单源：JS 吃设计令牌单源且死令牌无残留', async () => {
    expect(视图源).toContain('ZHAN_JI_LUO_WEI')
    expect(视图源).toContain('quXian.huanYing')
    expect(视图源).not.toMatch(/duration:\s*320/)
    expect(视图源).not.toMatch(/easing:\s*'cubic-bezier/)
    expect(视图源).not.toMatch(/:animation="320"/)
    expect(视图源).not.toMatch(/--kapian-liu-wei/)
    const 令牌源 = readFileSync(resolve(__dirname, '../config/设计令牌.ts'), 'utf8')
    expect(令牌源).toContain('ZHAN_JI_LUO_WEI')
    expect(令牌源).toContain('shiChangHaoMiao: 320')
    expect(令牌源).toContain('tuoZhuaiHaoMiao: 320')
  })
})

describe('FP-04 需求8最后两行', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    vi.mocked(huoQuZhanJiFenLeiLieBiao).mockResolvedValue({
      moRenFenLeiId: 分类,
      fenLeiLieBiao: [
        { id: 分类, name: '默认分类', is_default: true, record_count: 3, version: 0, sort_order: 0 },
      ],
    })
  })

  it('列表语境按真实无复盘形造数据：复盘恒空，两行走轻字段', async () => {
    const 包 = await 挂载()
    const 条 = 包.findAll('.zuihou-xiao-xi-tiao')
    expect(条.length).toBe(6)
    const 首卡 = 包.findAll('.zhanji-kapian')[0]!.text()
    expect(首卡).toContain(`${huoQuFanYi('zhanJi', 'ni')}：在吗`)
    expect(首卡).toContain(`${huoQuFanYi('zhanJi', 'ta')}：在的`)
    const 脚本 = 视图源.slice(0, 视图源.indexOf('<style'))
    expect(脚本).toContain('dangAn.zui_hou_liang_tiao')
    expect(脚本).not.toContain('dangAn.fu_pan_shu_ju')
    包.unmount()
  })

  it('轻字段缺失回落时间戳：空数组时仍显示时间行', async () => {
    const 行 = 三行().map((项) => ({ ...项, zui_hou_liang_tiao: [] }))
    const 包 = await 挂载(行)
    expect(包.findAll('.zuihou-xiao-xi-tiao').length).toBe(0)
    expect(包.findAll('.zuihou-xiao-xi-shi-jian').length).toBe(3)
    包.unmount()
  })

  it('脏行不崩：空摘要被过滤，超长摘要后端已截断', async () => {
    const 脏 = 两行('00000000-0000-4000-8000-000000000101')
    脏.zui_hou_liang_tiao = [
      { shi_jian: '2026-07-02T10:00:00.000Z', fa_song_zhe: 'yonghu', zhai_yao: '   ' },
      { shi_jian: '2026-07-02T10:01:00.000Z', fa_song_zhe: 'jiaose', zhai_yao: '在的' },
    ]
    const 包 = await 挂载([脏])
    expect(包.findAll('.zuihou-xiao-xi-tiao').length).toBe(1)
    expect(包.find('.zuihou-xiao-xi-tiao')!.text()).toContain('在的')
    包.unmount()
  })
})
