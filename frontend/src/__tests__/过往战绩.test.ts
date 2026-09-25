import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import 过往战绩 from '@/views/过往战绩.vue'
import { huoQuFanYi } from '@/config/translations'
import {
  chuangJianZhanJiFenLei,
  gengMingZhanJiFenLei,
  huoQuDangAnLieBiao,
  huoQuZhanJiFenLeiLieBiao,
  paiXuFenLeiNeiZhanJi,
  piLiangShanChuDangAn,
  shanChuDangAn,
  shanChuZhanJiFenLei,
  yiDongDangAnDaoFenLei,
} from '@/api/聊天'
import type { DangAnXiangQing, ZhanJiFenLei } from '@/types'

vi.mock('vue-draggable-plus', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    VueDraggable: vue.defineComponent({
      name: 'VueDraggable',
      props: { modelValue: { type: Array, default: () => [] }, disabled: Boolean },
      emits: ['update:modelValue', 'start', 'end'],
      setup(_props, { slots }) {
        return () => vue.h('div', { class: 'vue-draggable-stub' }, slots.default?.())
      },
    }),
  }
})

vi.mock('@/api/聊天')

const moRenId = '00000000-0000-4000-8000-000000000001'
const ziDingId = '00000000-0000-4000-8000-000000000002'
const xinFenLeiId = '00000000-0000-4000-8000-000000000003'
const yuanMa = readFileSync(resolve(__dirname, '../views/过往战绩.vue'), 'utf8')

function fenLei(cha: Partial<ZhanJiFenLei> & Pick<ZhanJiFenLei, 'id' | 'name'>): ZhanJiFenLei {
  return { is_default: false, record_count: 0, version: 0, ...cha }
}

function zaoDangAn(
  id: string,
  suoYin: number,
  cha: Partial<DangAnXiangQing> = {},
): DangAnXiangQing {
  return {
    id,
    jiao_se_id: `jiao-se-${id.slice(-1)}`,
    jiao_se_ming_zi: `角色${id.slice(-1)}`,
    shi_fou_zha_xing: false,
    jie_guo_lei_xing: '',
    jie_guo_lei_xing_yuan: 'jinxing_zhong',
    shi_fou_feng_cun: false,
    liao_tian_tian_shu: 1,
    xiao_xi_zong_shu: 1,
    fu_pan_shu_ju: null,
    fu_pan_nei_rong: null,
    chuang_jian_shi_jian: '2026-07-01T00:00:00.000Z',
    zui_hou_xiao_xi_shi_jian: null,
    you_xi_jie_shu_shi_jian: null,
    mbti_lei_xing: 'INFP',
    jun_shi_ji_lu: [],
    category_id: moRenId,
    sort_order: suoYin,
    ...cha,
  }
}

function jiLu(id: string, suoYin: number): DangAnXiangQing {
  return zaoDangAn(id, suoYin, {
    jiao_se_ming_zi: `记录${id.slice(-1)}`,
    jie_guo_lei_xing: '恋爱成功',
    jie_guo_lei_xing_yuan: 'sheng_li_ai_qing',
    you_xi_jie_shu_shi_jian: '2026-07-02T00:00:00.000Z',
  })
}

function moRenJiLu(shuLiang = 3): DangAnXiangQing[] {
  return Array.from({ length: shuLiang }, (_, suoYin) =>
    jiLu(`00000000-0000-4000-8000-00000000010${suoYin}`, suoYin),
  )
}

function ziDingJiLu(): DangAnXiangQing[] {
  return [zaoDangAn('00000000-0000-4000-8000-000000000201', 0, { category_id: ziDingId })]
}

function fenLieLieBiao(chi: Partial<ZhanJiFenLei>[] = []): ZhanJiFenLei[] {
  return [
    fenLei({ id: moRenId, name: '默认分类', is_default: true, record_count: 3, version: 0, ...chi[0] }),
    fenLei({ id: ziDingId, name: '收藏夹', record_count: 1, version: 0, ...chi[1] }),
  ]
}

function anSheFenLei(): void {
  vi.mocked(huoQuZhanJiFenLeiLieBiao).mockResolvedValue({
    moRenFenLeiId: moRenId,
    fenLeiLieBiao: fenLieLieBiao(),
  })
  vi.mocked(huoQuDangAnLieBiao).mockImplementation(async (categoryId?: string) => {
    if (categoryId === ziDingId) return ziDingJiLu()
    if (categoryId === xinFenLeiId) return []
    return moRenJiLu()
  })
  vi.mocked(shanChuDangAn).mockResolvedValue({ cheng_gong: true })
  vi.mocked(piLiangShanChuDangAn).mockResolvedValue({ cheng_gong: true, shan_chu_ids: [] })
}

async function mountView() {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/chat/:jiaoSeId', component: { template: '<div />' } },
    ],
  })
  await luYou.push('/')
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(过往战绩, {
    global: { plugins: [pinia, luYou] },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, luYou }
}

describe('FP-12 过往战绩分类视图', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    vi.stubGlobal('confirm', () => true)
    anSheFenLei()
  })

  it('先显示分类加载态，再显示服务端分类和当前分类完整记录', async () => {
    let jieJue!: (value: unknown) => void
    vi.mocked(huoQuZhanJiFenLeiLieBiao).mockImplementationOnce(
      () => new Promise((resolve) => { jieJue = resolve }),
    )
    const luYou = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    await luYou.push('/')
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(过往战绩, { global: { plugins: [pinia, luYou] } })

    await nextTick()
    expect(wrapper.find('.jiazai-zhuangtai').text()).toContain(huoQuFanYi('zhanJi', 'jiaZaiZhong'))
    jieJue({ moRenFenLeiId: moRenId, fenLeiLieBiao: fenLieLieBiao() })
    await flushPromises()

    expect(huoQuDangAnLieBiao).toHaveBeenCalledWith(moRenId)
    expect(wrapper.findAll('.fenlei-biao-qian')).toHaveLength(2)
    expect(wrapper.findAll('.zhanji-kapian')).toHaveLength(3)
  })

  it('空分类保留原空态语义，失败时展示翻译错误和重试', async () => {
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValueOnce([])
    const { wrapper: emptyWrapper } = await mountView()
    expect(emptyWrapper.find('.kong-zhuangtai').text()).toContain(huoQuFanYi('zhanJi', 'zanWuZhanJi'))
    emptyWrapper.unmount()

    vi.mocked(huoQuDangAnLieBiao).mockRejectedValueOnce(new Error('network'))
    const { wrapper: failedWrapper } = await mountView()
    expect(failedWrapper.find('.qian-tai-cuo-wu-ying-xiang').text()).toBe(
      huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'),
    )
    expect(failedWrapper.find('.qian-tai-cuo-wu-chong-shi').exists()).toBe(true)
  })

  it('切换分类只展示该分类记录，离开再回来重新承接服务端完整顺序', async () => {
    const { wrapper } = await mountView()
    const custom = wrapper.findAll('.fenlei-biao-qian')[1]
    await custom.trigger('click')
    await flushPromises()

    expect(huoQuDangAnLieBiao).toHaveBeenLastCalledWith(ziDingId)
    expect(wrapper.text()).toContain('角色1')
    expect(wrapper.text()).not.toContain('记录0')

    await wrapper.findAll('.fenlei-biao-qian')[0].trigger('click')
    await wrapper.findAll('.fenlei-biao-qian')[1].trigger('click')
    await flushPromises()
    expect(huoQuDangAnLieBiao.mock.calls.map(([id]) => id)).toEqual([moRenId, ziDingId, moRenId, ziDingId])
  })

  it('可创建分类并切换到服务端返回的新分类', async () => {
    vi.mocked(chuangJianZhanJiFenLei).mockResolvedValueOnce(
      fenLei({ id: xinFenLeiId, name: '新分类' }),
    )
    const { wrapper } = await mountView()
    vi.mocked(huoQuZhanJiFenLeiLieBiao).mockResolvedValueOnce({
      moRenFenLeiId: moRenId,
      fenLeiLieBiao: [
        ...fenLieLieBiao(),
        fenLei({ id: xinFenLeiId, name: '新分类' }),
      ],
    })
    await wrapper.find('.chuangJian-fenlei-anniu').trigger('click')
    await wrapper.get('.fenlei-ming-cheng-input').setValue('新分类')
    await wrapper.find('.fenlei-bian-ji').trigger('submit')
    await flushPromises()

    expect(chuangJianZhanJiFenLei).toHaveBeenCalledWith('新分类')
    expect(huoQuDangAnLieBiao).toHaveBeenLastCalledWith(xinFenLeiId)
    expect(wrapper.find('.kong-zhuangtai').text()).toContain(huoQuFanYi('zhanJi', 'zanWuZhanJi'))
  })

  it('自定义分类可重命名并提交当前 version', async () => {
    vi.mocked(gengMingZhanJiFenLei).mockResolvedValueOnce(
      fenLei({ id: ziDingId, name: '重要回忆', record_count: 1, version: 1 }),
    )
    const { wrapper } = await mountView()
    await wrapper.find('.gengMing-fenlei-anniu').trigger('click')
    await wrapper.get('.fenlei-ming-cheng-input').setValue('重要回忆')
    await wrapper.find('.fenlei-bian-ji').trigger('submit')
    await flushPromises()

    expect(gengMingZhanJiFenLei).toHaveBeenCalledWith(ziDingId, '重要回忆', 0)
    expect(wrapper.text()).toContain('重要回忆')
  })

  it('默认分类没有改名删除入口，自定义分类删除确认后回落默认并提示数量', async () => {
    vi.mocked(shanChuZhanJiFenLei).mockResolvedValueOnce({
      deleted_id: ziDingId,
      fallback_category_id: moRenId,
      moved_record_count: 2,
    })
    const { wrapper } = await mountView()
    vi.mocked(huoQuZhanJiFenLeiLieBiao).mockResolvedValueOnce({
      moRenFenLeiId: moRenId,
      fenLeiLieBiao: [fenLei({ id: moRenId, name: '默认分类', is_default: true, record_count: 5, version: 1 })],
    })
    const moRen = wrapper.find(`.fenlei-biao-qian[data-id="${moRenId}"]`)
    expect(moRen.find('.gengMing-fenlei-anniu').exists()).toBe(false)
    expect(moRen.find('.shanChu-fenlei-anniu').exists()).toBe(false)

    vi.mocked(huoQuDangAnLieBiao).mockResolvedValueOnce([...moRenJiLu(), ...ziDingJiLu(), ...ziDingJiLu()])
    await wrapper.find('.shanChu-fenlei-anniu').trigger('click')
    await flushPromises()

    expect(shanChuZhanJiFenLei).toHaveBeenCalledWith(ziDingId, 0)
    expect(wrapper.find('.zhanji-tishi').text()).toContain('2')
    expect(wrapper.find('.zhanji-tishi').text()).toContain('默认分类')
    expect(wrapper.findAll('.fenlei-biao-qian')).toHaveLength(1)
  })

  it('记录可通过触屏友好的原生 select 移档，成功后才从来源移除', async () => {
    const recordId = moRenJiLu()[0]!.id
    vi.mocked(yiDongDangAnDaoFenLei).mockResolvedValueOnce({
      record_id: recordId,
      source_category_id: moRenId,
      category_id: ziDingId,
      sort_order: 1,
      source_version: 1,
      target_version: 1,
    })
    const { wrapper } = await mountView()
    await wrapper.find('.yi-dong-fenlei').setValue(ziDingId)
    await flushPromises()

    expect(yiDongDangAnDaoFenLei).toHaveBeenCalledWith(moRenId, recordId, ziDingId, 0)
    expect(wrapper.findAll('.zhanji-kapian')).toHaveLength(2)
  })

  it('键盘上移下移可用，原生按钮支持触屏与 Enter/Space', async () => {
    const ids = moRenJiLu().map((item) => item.id)
    vi.mocked(paiXuFenLeiNeiZhanJi).mockResolvedValue({
      category_id: moRenId,
      record_ids: [ids[1], ids[0], ids[2]],
      version: 1,
    })
    const { wrapper } = await mountView()
    const down = wrapper.findAll('.xia-yi')[0]!
    expect(down.attributes('aria-label')).toBe(huoQuFanYi('duoMeiTi', 'houYiBiaoQing'))
    await down.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(paiXuFenLeiNeiZhanJi).toHaveBeenCalledWith(moRenId, [ids[1], ids[0], ids[2]], 0)
    expect(wrapper.findAll('.jiaose-mingcheng')[0]!.text()).toBe('记录1')
  })

  it('第二页拖拽仍提交当前分类完整 recordIds，并按服务端返回顺序落位', async () => {
    const records = Array.from({ length: 55 }, (_, suoYin) =>
      jiLu(`00000000-0000-4000-8000-${String(suoYin).padStart(12, '0')}`, suoYin),
    )
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(records)
    const { wrapper } = await mountView()
    const fenYe = wrapper.findAll('.fen-ye-anniu')
    await fenYe[1]!.trigger('click')
    const pageBefore = wrapper.findComponent({ name: 'VueDraggable' })
    const pageIds = wrapper.findAll('.zhanji-kapian').map((item) => item.attributes('data-id'))
    const proposedPage = [pageIds[0], pageIds[2], pageIds[1], pageIds[3], pageIds[4]]
    const full = [...records.slice(0, 50).map((item) => item.id), ...proposedPage]
    vi.mocked(paiXuFenLeiNeiZhanJi).mockResolvedValueOnce({
      category_id: moRenId,
      record_ids: full,
      version: 1,
    })
    pageBefore.vm.$emit('start')
    pageBefore.vm.$emit('update:modelValue', proposedPage.map((id) => records.find((item) => item.id === id)!))
    pageBefore.vm.$emit('end')
    await flushPromises()

    expect(paiXuFenLeiNeiZhanJi).toHaveBeenCalledWith(moRenId, full, 0)
    expect(wrapper.findAll('.jiaose-mingcheng').map((item) => item.text())).toEqual([
      '记录0',
      '记录2',
      '记录1',
      '记录3',
      '记录4',
    ])
  })

  it('重复排序点击只发一次请求，过期 version 自动重拉并给出恢复入口', async () => {
    const ids = moRenJiLu().map((item) => item.id)
    let jieJue!: (value: unknown) => void
    vi.mocked(paiXuFenLeiNeiZhanJi).mockImplementationOnce(
      () => new Promise((resolve) => { jieJue = resolve }),
    )
    const { wrapper } = await mountView()
    const exposed = wrapper.vm as unknown as { yidongJiLu: (id: string, direction: -1 | 1) => Promise<void> }
    const first = exposed.yidongJiLu(ids[2]!, -1)
    await exposed.yidongJiLu(ids[1]!, -1)
    expect(paiXuFenLeiNeiZhanJi).toHaveBeenCalledTimes(1)
    jieJue({ category_id: moRenId, record_ids: [ids[2], ids[0], ids[1]], version: 1 })
    await first
    await flushPromises()

    vi.mocked(paiXuFenLeiNeiZhanJi).mockRejectedValueOnce(
      Object.assign(new Error('分类已发生变化，请刷新后重试'), {
        cuo_wu_ma: 'ZHAN_JI_FEN_LEI_BIAN_GENG',
      }),
    )
    vi.mocked(huoQuZhanJiFenLeiLieBiao).mockResolvedValueOnce({
      moRenFenLeiId: moRenId,
      fenLeiLieBiao: fenLieLieBiao([{ version: 2, record_count: 3 }]),
    })
    const refreshed = [moRenJiLu()[2], moRenJiLu()[1], moRenJiLu()[0]]
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValueOnce(refreshed)
    await exposed.yidongJiLu(ids[0]!, 1)
    await flushPromises()

    expect(wrapper.find('.zhanji-tishi').text()).toContain(huoQuFanYi('tongYong', 'zhanJiWenTiYingXiang'))
    expect(wrapper.find('.zhanji-tishi').text()).not.toContain('分类已发生变化')
    expect(wrapper.find('.qian-tai-cuo-wu-dai-ma').text()).toBe('ZHAN_JI_FEN_LEI_BIAN_GENG')
    expect(wrapper.find('.qian-tai-cuo-wu-chong-shi').exists()).toBe(true)
    expect(wrapper.findAll('.jiaose-mingcheng').map((item) => item.text())).toEqual([
      '记录2',
      '记录1',
      '记录0',
    ])
  })

  it('普通排序失败恢复服务端原顺序并显示可恢复失败状态', async () => {
    const ids = moRenJiLu().map((item) => item.id)
    vi.mocked(paiXuFenLeiNeiZhanJi).mockRejectedValueOnce(new Error('network'))
    const { wrapper } = await mountView()
    const exposed = wrapper.vm as unknown as { yidongJiLu: (id: string, direction: -1 | 1) => Promise<void> }
    await exposed.yidongJiLu(ids[0]!, 1)
    await flushPromises()

    expect(wrapper.findAll('.jiaose-mingcheng').map((item) => item.text())).toEqual([
      '记录0',
      '记录1',
      '记录2',
    ])
    expect(wrapper.find('.qian-tai-cuo-wu-ying-xiang').text()).toBe(
      huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'),
    )
  })

  it('分页、当前页全选、批量删除语义保持不变', async () => {
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(
      Array.from({ length: 55 }, (_, suoYin) =>
        jiLu(`00000000-0000-4000-8000-${String(suoYin).padStart(12, '0')}`, suoYin),
      ),
    )
    vi.mocked(piLiangShanChuDangAn).mockResolvedValueOnce({
      cheng_gong: true,
      shan_chu_ids: [moRenJiLu()[0]!.id],
    })
    const { wrapper } = await mountView()
    expect(wrapper.findAll('.zhanji-kapian')).toHaveLength(50)
    await wrapper.find('.fenlei-quan-xuan-anniu').trigger('click')
    expect(wrapper.find('.xuan-ze-shu-liang').text()).toContain('50')
    await wrapper.find('.piliang-shanchu-anniu').trigger('click')
    await flushPromises()
    expect(piLiangShanChuDangAn).toHaveBeenCalledTimes(1)
  })

  it('单条删除确认后调用原接口并以重拉结果刷新当前分类', async () => {
    const records = moRenJiLu()
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(records)
    vi.mocked(shanChuDangAn).mockResolvedValueOnce({ cheng_gong: true })
    const { wrapper } = await mountView()
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValueOnce(records.slice(1))
    await wrapper.find('.caozuo-anniu.shanchu').trigger('click')
    await flushPromises()

    expect(shanChuDangAn).toHaveBeenCalledWith(records[0]!.id)
    expect(wrapper.findAll('.zhanji-kapian')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('记录0')
  })

  it('挑战玩法仍按进行中与已结束显示继续、复盘、分享和删除', async () => {
    const records = [
      zaoDangAn('00000000-0000-4000-8000-000000000301', 0),
      jiLu('00000000-0000-4000-8000-000000000302', 1),
    ]
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(records)
    const { wrapper, luYou } = await mountView()
    await wrapper.find('.caozuo-anniu.jixu').trigger('click')
    await flushPromises()
    expect(luYou.currentRoute.value.path).toBe('/chat/jiao-se-1')

    await wrapper.find('.caozuo-anniu.fupan').trigger('click')
    await flushPromises()
    expect(luYou.currentRoute.value.query).toMatchObject({ fuPan: '1', dangAnId: records[1]!.id })
    expect(wrapper.find('.caozuo-anniu.fenxiang').exists()).toBe(true)
    expect(wrapper.find('.caozuo-anniu.shanchu').exists()).toBe(true)
  })

  it('源码不保留胜负分类、本地权威顺序或重复 API 入口，并覆盖双主题移动端与 reduced-motion', () => {
    const miaoShu = yuanMa.slice(0, yuanMa.indexOf('<style scoped>'))
    expect(miaoShu).not.toContain('fenLeiJinXingZhong')
    expect(miaoShu).not.toContain('fenLeiShengLi')
    expect(miaoShu).not.toContain('fenLeiShiBai')
    expect(miaoShu).not.toContain('zhanJiPaiXu')
    expect(miaoShu).not.toContain('localStorage')
    expect(miaoShu.match(/<VueDraggable/g)).toHaveLength(1)
    expect(miaoShu).toContain(':force-fallback="true"')
    expect(miaoShu).toContain(':fallback-on-body="true"')
    expect(yuanMa).toContain(":root[data-theme='light']")
    expect(yuanMa).toMatch(/@media\s*\(max-width:\s*640px\)/)
    expect(yuanMa).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })
})
