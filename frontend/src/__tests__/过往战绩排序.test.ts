import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 过往战绩 from '@/views/过往战绩.vue'
import { huoQuFanYi } from '@/config/translations'
import { huoQuDangAnLieBiao, huoQuZhanJiFenLeiLieBiao, paiXuFenLeiNeiZhanJi } from '@/api/聊天'
import type { DangAnXiangQing } from '@/types'

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

const categoryId = '00000000-0000-4000-8000-000000000001'

function record(index: number): DangAnXiangQing {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
  return {
    id,
    jiao_se_id: `jiao-se-${index}`,
    jiao_se_ming_zi: `记录${index}`,
    shi_fou_zha_xing: false,
    jie_guo_lei_xing: '',
    jie_guo_lei_xing_yuan: 'jinxing_zhong',
    shi_fou_feng_cun: false,
    liao_tian_tian_shu: 1,
    xiao_xi_zong_shu: 1,
    fu_pan_shu_ju: null,
    fu_pan_nei_rong: null,
    chuang_jian_shi_jian: `2026-07-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
    zui_hou_xiao_xi_shi_jian: null,
    you_xi_jie_shu_shi_jian: null,
    mbti_lei_xing: 'INFP',
    jun_shi_ji_lu: [],
    category_id: categoryId,
    sort_order: index,
  }
}

async function mountView(records = [record(0), record(1), record(2), record(3)]) {
  vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(records)
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await router.push('/')
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(过往战绩, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
}

describe('FP-12 过往战绩服务端排序', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    vi.mocked(huoQuZhanJiFenLeiLieBiao).mockResolvedValue({
      moRenFenLeiId: categoryId,
      fenLeiLieBiao: [
        {
          id: categoryId,
          name: '默认分类',
          is_default: true,
          record_count: 4,
          version: 0,
        },
      ],
    })
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValue([record(0), record(1), record(2), record(3)])
  })

  it('首屏只采用接口完整顺序，不读取任何客户端顺序', async () => {
    localStorage.setItem('zhanJiPaiXu', JSON.stringify([3, 2, 1, 0]))
    const wrapper = await mountView()

    expect(wrapper.findAll('.jiaose-mingcheng').map((item) => item.text())).toEqual([
      '记录0',
      '记录1',
      '记录2',
      '记录3',
    ])
  })

  it('键盘排序提交完整 ID，成功后采用服务端返回顺序', async () => {
    const records = [record(0), record(1), record(2), record(3)]
    const proposed = [records[1]!.id, records[0]!.id, records[2]!.id, records[3]!.id]
    vi.mocked(paiXuFenLeiNeiZhanJi).mockResolvedValueOnce({
      category_id: categoryId,
      record_ids: proposed,
      version: 1,
    })
    const wrapper = await mountView(records)
    const exposed = wrapper.vm as unknown as { yidongJiLu: (id: string, direction: -1 | 1) => Promise<void> }
    await exposed.yidongJiLu(records[1]!.id, -1)
    await flushPromises()

    expect(paiXuFenLeiNeiZhanJi).toHaveBeenCalledWith(categoryId, proposed, 0)
    expect(wrapper.findAll('.jiaose-mingcheng').map((item) => item.text())).toEqual([
      '记录1',
      '记录0',
      '记录2',
      '记录3',
    ])
  })

  it('拖拽当前页时保留其它页并提交完整 recordIds', async () => {
    const records = Array.from({ length: 55 }, (_, index) => record(index))
    const wrapper = await mountView(records)
    await wrapper.findAll('.fen-ye-anniu')[1]!.trigger('click')
    const draggable = wrapper.findComponent({ name: 'VueDraggable' })
    const pageBefore = wrapper.findAll('.zhanji-kapian')
    const pageIds = pageBefore.map((item) => item.attributes('data-id')!)
    const pageAfter = [pageIds[0], pageIds[2], pageIds[1], pageIds[3], pageIds[4]]
    const complete = [...records.slice(0, 50).map((item) => item.id), ...pageAfter]
    vi.mocked(paiXuFenLeiNeiZhanJi).mockResolvedValueOnce({
      category_id: categoryId,
      record_ids: complete,
      version: 1,
    })

    draggable.vm.$emit('start')
    draggable.vm.$emit(
      'update:modelValue',
      pageAfter.map((id) => records.find((item) => item.id === id)!),
    )
    draggable.vm.$emit('end')
    await flushPromises()

    expect(paiXuFenLeiNeiZhanJi).toHaveBeenCalledWith(categoryId, complete, 0)
  })

  it('过期 version 重新拉取分类与记录，旧提交不覆盖新顺序', async () => {
    const records = [record(0), record(1), record(2), record(3)]
    const wrapper = await mountView(records)
    vi.mocked(paiXuFenLeiNeiZhanJi).mockRejectedValueOnce(
      Object.assign(new Error('分类已发生变化，请刷新后重试'), {
        cuo_wu_ma: 'ZHAN_JI_FEN_LEI_BIAN_GENG',
      }),
    )
    const refreshed = [records[3]!, records[2]!, records[1]!, records[0]!]
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValueOnce(refreshed)
    const exposed = wrapper.vm as unknown as { yidongJiLu: (id: string, direction: -1 | 1) => Promise<void> }
    await exposed.yidongJiLu(records[0]!.id, 1)
    await flushPromises()

    expect(wrapper.findAll('.jiaose-mingcheng').map((item) => item.text())).toEqual([
      '记录3',
      '记录2',
      '记录1',
      '记录0',
    ])
    expect(wrapper.find('.qian-tai-cuo-wu-ying-xiang').text()).toBe(
      huoQuFanYi('tongYong', 'zhanJiWenTiYingXiang'),
    )
    expect(wrapper.find('.qian-tai-cuo-wu-dai-ma').text()).toBe('ZHAN_JI_FEN_LEI_BIAN_GENG')
  })

  it('自动排序只改变展示，不写排序 API；切回手动恢复服务端顺序', async () => {
    const records = [record(0), record(1), record(2), record(3)]
    const wrapper = await mountView(records)
    const exposed = wrapper.vm as unknown as {
      paiXuWeiDu: string
      qieHuanPaiXuWeiDu: (value: 'shouDong' | 'chuangJianShiJian') => void
    }

    exposed.qieHuanPaiXuWeiDu('chuangJianShiJian')
    await flushPromises()
    expect(wrapper.findAll('.jiaose-mingcheng').map((item) => item.text())).toEqual([
      '记录3',
      '记录2',
      '记录1',
      '记录0',
    ])
    expect(paiXuFenLeiNeiZhanJi).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)

    exposed.qieHuanPaiXuWeiDu('shouDong')
    await flushPromises()
    expect(wrapper.findAll('.jiaose-mingcheng').map((item) => item.text())).toEqual([
      '记录0',
      '记录1',
      '记录2',
      '记录3',
    ])
    expect(wrapper.find('.paixu-fangxiang-anniu').text()).toBe(huoQuFanYi('zhanJi', 'paiXuJiangXu'))
  })
})
