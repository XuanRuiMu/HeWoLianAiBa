import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const api = vi.hoisted(() => ({
  huoQuZhanJiFenLeiLieBiao: vi.fn(),
  chuangJianZhanJiFenLei: vi.fn(),
  gengMingZhanJiFenLei: vi.fn(),
  shanChuZhanJiFenLei: vi.fn(),
  huoQuDangAnLieBiao: vi.fn(),
  yiDongDangAnDaoFenLei: vi.fn(),
  paiXuFenLeiNeiZhanJi: vi.fn(),
}))

vi.mock('@/api/聊天', () => api)

import { 使用战绩仓库 } from '@/stores/战绩'
import { huoQuFanYi } from '@/config/translations'
import type { DangAnXiangQing, ZhanJiFenLei } from '@/types'

const moRenId = '00000000-0000-4000-8000-000000000001'
const ziDingId = '00000000-0000-4000-8000-000000000002'
const qiDongId = '00000000-0000-4000-8000-000000000003'

function fenLei(cha: Partial<ZhanJiFenLei> & Pick<ZhanJiFenLei, 'id' | 'name'>): ZhanJiFenLei {
  return {
    is_default: false,
    record_count: 0,
    version: 0,
    ...cha,
  }
}

function dangAn(id: string, categoryId: string, suoYin: number): DangAnXiangQing {
  return {
    id,
    jiao_se_id: `jiao-se-${id}`,
    jiao_se_ming_zi: `记录${id.slice(-1)}`,
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
    jun_shi_ji_lu: [],
    category_id: categoryId,
    sort_order: suoYin,
  }
}

function fenLieBiao(version = 0, recordCount = 4) {
  return {
    moRenFenLeiId: moRenId,
    fenLeiLieBiao: [
      fenLei({ id: moRenId, name: '默认分类', is_default: true, record_count: recordCount, version }),
      fenLei({ id: ziDingId, name: '收藏夹', record_count: 0, version: 0 }),
    ],
  }
}

async function chuangJianCangKu() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const cangKu = 使用战绩仓库()
  api.huoQuZhanJiFenLeiLieBiao.mockResolvedValue(fenLieBiao())
  api.huoQuDangAnLieBiao.mockResolvedValue([
    dangAn('00000000-0000-4000-8000-000000000101', moRenId, 0),
    dangAn('00000000-0000-4000-8000-000000000102', moRenId, 1),
    dangAn('00000000-0000-4000-8000-000000000103', moRenId, 2),
    dangAn('00000000-0000-4000-8000-000000000104', moRenId, 3),
  ])
  await cangKu.jiaZai()
  return cangKu
}

describe('战绩分类 store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('先读分类再读默认分类完整列表，不使用无胜负分组', async () => {
    const cangKu = await chuangJianCangKu()

    expect(api.huoQuZhanJiFenLeiLieBiao).toHaveBeenCalledTimes(1)
    expect(api.huoQuDangAnLieBiao).toHaveBeenCalledWith(moRenId)
    expect(cangKu.dangQianFenLeiId).toBe(moRenId)
    expect(cangKu.dangAnLieBiao.map((item) => item.id)).toEqual([
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000103',
      '00000000-0000-4000-8000-000000000104',
    ])
    expect(cangKu.dangAnLieBiao.some((item) => 'shengli' in item || 'shibai' in item)).toBe(false)
  })

  it('切换分类重新读取该分类服务端完整顺序，离开再回来仍承接服务端顺序', async () => {
    const cangKu = await chuangJianCangKu()
    api.huoQuDangAnLieBiao.mockImplementation(async (categoryId: string) => {
      if (categoryId === ziDingId) {
        return [
          dangAn('00000000-0000-4000-8000-000000000202', ziDingId, 0),
          dangAn('00000000-0000-4000-8000-000000000201', ziDingId, 1),
        ]
      }
      return [
        dangAn('00000000-0000-4000-8000-000000000104', moRenId, 0),
        dangAn('00000000-0000-4000-8000-000000000103', moRenId, 1),
        dangAn('00000000-0000-4000-8000-000000000102', moRenId, 2),
        dangAn('00000000-0000-4000-8000-000000000101', moRenId, 3),
      ]
    })

    await cangKu.qieHuanFenLei(ziDingId)
    expect(cangKu.dangAnLieBiao.map((item) => item.id.slice(-3))).toEqual(['202', '201'])
    await cangKu.qieHuanFenLei(moRenId)
    expect(cangKu.dangAnLieBiao.map((item) => item.id.slice(-3))).toEqual(['104', '103', '102', '101'])
    expect(api.huoQuDangAnLieBiao.mock.calls.map(([id]) => id)).toEqual([
      moRenId,
      ziDingId,
      moRenId,
    ])
  })

  it('排序提交完整 ID，并以服务端返回顺序和版本覆盖本地状态', async () => {
    const cangKu = await chuangJianCangKu()
    api.paiXuFenLeiNeiZhanJi.mockResolvedValue({
      category_id: moRenId,
      record_ids: [
        '00000000-0000-4000-8000-000000000103',
        '00000000-0000-4000-8000-000000000101',
        '00000000-0000-4000-8000-000000000104',
        '00000000-0000-4000-8000-000000000102',
      ],
      version: 1,
    })
    const tijiaoLiaoLie = [
      '00000000-0000-4000-8000-000000000104',
      '00000000-0000-4000-8000-000000000103',
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000101',
    ]

    const jieGuo = await cangKu.baoCunPaiXu(tijiaoLiaoLie)

    expect(jieGuo.kind).toBe('success')
    expect(api.paiXuFenLeiNeiZhanJi).toHaveBeenCalledWith(moRenId, tijiaoLiaoLie, 0)
    expect(cangKu.dangAnLieBiao.map((item) => item.id.slice(-3))).toEqual(['103', '101', '104', '102'])
    expect(cangKu.dangQianFenLei?.version).toBe(1)
    expect(localStorage.length).toBe(0)
  })

  it('重复点击排序只发一次请求，过期 version 冲突后重拉且不乐观覆盖', async () => {
    const cangKu = await chuangJianCangKu()
    let jieJue!: (value: unknown) => void
    api.paiXuFenLeiNeiZhanJi.mockImplementationOnce(
      () => new Promise((resolve) => { jieJue = resolve }),
    )
    const tijiao = [
      '00000000-0000-4000-8000-000000000104',
      '00000000-0000-4000-8000-000000000103',
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000101',
    ]

    const first = cangKu.baoCunPaiXu(tijiao)
    const second = await cangKu.baoCunPaiXu(tijiao)
    expect(second.kind).toBe('busy')
    expect(api.paiXuFenLeiNeiZhanJi).toHaveBeenCalledTimes(1)
    jieJue({
      category_id: moRenId,
      record_ids: tijiao,
      version: 1,
    })
    await first

    api.paiXuFenLeiNeiZhanJi.mockRejectedValueOnce(
      Object.assign(new Error('分类已发生变化，请刷新后重试'), {
        cuo_wu_ma: 'ZHAN_JI_FEN_LEI_BIAN_GENG',
      }),
    )
    api.huoQuZhanJiFenLeiLieBiao.mockResolvedValueOnce(fenLieBiao(2, 4))
    api.huoQuDangAnLieBiao.mockResolvedValueOnce([
      dangAn('00000000-0000-4000-8000-000000000102', moRenId, 0),
      dangAn('00000000-0000-4000-8000-000000000101', moRenId, 1),
      dangAn('00000000-0000-4000-8000-000000000103', moRenId, 2),
      dangAn('00000000-0000-4000-8000-000000000104', moRenId, 3),
    ])

    const jieGuo = await cangKu.baoCunPaiXu([
      '00000000-0000-4000-8000-000000000103',
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000104',
      '00000000-0000-4000-8000-000000000102',
    ])

    expect(jieGuo.kind).toBe('conflict')
    expect(cangKu.dangAnLieBiao.map((item) => item.id.slice(-3))).toEqual(['102', '101', '103', '104'])
    expect(cangKu.dangQianFenLei?.version).toBe(2)
    expect(cangKu.cuoWuXinXi).toBe(huoQuFanYi('tongYong', 'zhanJiWenTiYingXiang'))
    expect(cangKu.cuoWuXinXi).not.toContain('分类已发生变化')
    expect(cangKu.qianTaiCuoWu?.code).toBe('ZHAN_JI_FEN_LEI_BIAN_GENG')
  })

  it('普通排序失败保留服务端原顺序并给出可恢复失败状态', async () => {
    const cangKu = await chuangJianCangKu()
    const yuanShunXu = cangKu.dangAnLieBiao.map((item) => item.id)
    api.paiXuFenLeiNeiZhanJi.mockRejectedValueOnce(new Error('network'))

    const jieGuo = await cangKu.baoCunPaiXu([...yuanShunXu].reverse())

    expect(jieGuo.kind).toBe('failed')
    expect(cangKu.dangAnLieBiao.map((item) => item.id)).toEqual(yuanShunXu)
    expect(cangKu.cuoWuXinXi).not.toBe('')
  })

  it('创建分类拒绝空名称，成功后重拉分类并切换到新分类', async () => {
    const cangKu = await chuangJianCangKu()
    await expect(cangKu.chuangJian('   ')).resolves.toMatchObject({ kind: 'invalid' })
    expect(api.chuangJianZhanJiFenLei).not.toHaveBeenCalled()

    const xinFenLei = fenLei({ id: qiDongId, name: '新分类' })
    api.chuangJianZhanJiFenLei.mockResolvedValueOnce(xinFenLei)
    api.huoQuZhanJiFenLeiLieBiao.mockResolvedValueOnce({
      moRenFenLeiId: moRenId,
      fenLeiLieBiao: [...fenLieBiao().fenLeiLieBiao, xinFenLei],
    })
    api.huoQuDangAnLieBiao.mockResolvedValueOnce([])

    await expect(cangKu.chuangJian('  新分类  ')).resolves.toMatchObject({ kind: 'success' })
    expect(api.chuangJianZhanJiFenLei).toHaveBeenCalledWith('新分类')
    expect(cangKu.dangQianFenLeiId).toBe(qiDongId)
    expect(cangKu.dangAnLieBiao).toEqual([])
  })

  it('自定义分类重命名以服务端返回对象和版本替换本地分类', async () => {
    const cangKu = await chuangJianCangKu()
    const gengMingJieGuo = fenLei({ id: ziDingId, name: '重要回忆', record_count: 2, version: 4 })
    api.gengMingZhanJiFenLei.mockResolvedValueOnce(gengMingJieGuo)

    await expect(cangKu.gengMing(ziDingId, ' 重要回忆 ')).resolves.toMatchObject({ kind: 'success' })

    expect(api.gengMingZhanJiFenLei).toHaveBeenCalledWith(ziDingId, '重要回忆', 0)
    expect(cangKu.fenLeiLieBiao.find((item) => item.id === ziDingId)).toEqual(gengMingJieGuo)
  })

  it('重复 ID、缺失 ID 或移动到当前分类均不会调用写接口', async () => {
    const cangKu = await chuangJianCangKu()
    const ids = cangKu.dangAnLieBiao.map((item) => item.id)

    await expect(cangKu.baoCunPaiXu([ids[0]!, ids[0]!, ...ids.slice(2)])).resolves.toMatchObject({
      kind: 'invalid',
    })
    await expect(cangKu.baoCunPaiXu(ids.slice(1))).resolves.toMatchObject({ kind: 'invalid' })
    await expect(cangKu.yiDongDangAn(ids[0]!, moRenId)).resolves.toMatchObject({ kind: 'invalid' })
    expect(api.paiXuFenLeiNeiZhanJi).not.toHaveBeenCalled()
    expect(api.yiDongDangAnDaoFenLei).not.toHaveBeenCalled()
  })

  it('默认分类在 store 层拒绝改名和删除', async () => {
    const cangKu = await chuangJianCangKu()

    await expect(cangKu.gengMing(moRenId, '新名称')).resolves.toMatchObject({
      ok: false,
      kind: 'default-protected',
    })
    await expect(cangKu.shanChu(moRenId)).resolves.toMatchObject({
      ok: false,
      kind: 'default-protected',
    })
    expect(api.gengMingZhanJiFenLei).not.toHaveBeenCalled()
    expect(api.shanChuZhanJiFenLei).not.toHaveBeenCalled()
  })

  it('删除自定义分类后切到默认分类并明确返回回落记录数', async () => {
    const cangKu = await chuangJianCangKu()
    await cangKu.qieHuanFenLei(ziDingId)
    api.shanChuZhanJiFenLei.mockResolvedValueOnce({
      deleted_id: ziDingId,
      fallback_category_id: moRenId,
      moved_record_count: 2,
    })
    api.huoQuZhanJiFenLeiLieBiao.mockResolvedValueOnce({
      moRenFenLeiId: moRenId,
      fenLeiLieBiao: [
        fenLei({ id: moRenId, name: '默认分类', is_default: true, record_count: 6, version: 1 }),
      ],
    })
    api.huoQuDangAnLieBiao.mockResolvedValueOnce([
      dangAn('00000000-0000-4000-8000-000000000101', moRenId, 0),
      dangAn('00000000-0000-4000-8000-000000000102', moRenId, 1),
      dangAn('00000000-0000-4000-8000-000000000201', moRenId, 2),
      dangAn('00000000-0000-4000-8000-000000000202', moRenId, 3),
    ])

    const jieGuo = await cangKu.shanChu(ziDingId)

    expect(api.shanChuZhanJiFenLei).toHaveBeenCalledWith(ziDingId, 0)
    expect(jieGuo).toMatchObject({
      ok: true,
      kind: 'success',
      movedRecordCount: 2,
      fallbackCategoryId: moRenId,
    })
    expect(cangKu.dangQianFenLeiId).toBe(moRenId)
    expect(cangKu.dangAnLieBiao.map((item) => item.id.slice(-3))).toEqual(['101', '102', '201', '202'])
  })

  it('记录移档成功后才更新来源列表与双方版本', async () => {
    const cangKu = await chuangJianCangKu()
    api.yiDongDangAnDaoFenLei.mockResolvedValueOnce({
      record_id: '00000000-0000-4000-8000-000000000101',
      source_category_id: moRenId,
      category_id: ziDingId,
      sort_order: 0,
      source_version: 1,
      target_version: 1,
    })

    const jieGuo = await cangKu.yiDongDangAn('00000000-0000-4000-8000-000000000101', ziDingId)

    expect(jieGuo.kind).toBe('success')
    expect(api.yiDongDangAnDaoFenLei).toHaveBeenCalledWith(
      moRenId,
      '00000000-0000-4000-8000-000000000101',
      ziDingId,
      0,
    )
    expect(cangKu.dangAnLieBiao.map((item) => item.id.slice(-3))).toEqual(['102', '103', '104'])
    expect(cangKu.fenLeiLieBiao.find((item) => item.id === moRenId)).toMatchObject({
      version: 1,
      record_count: 3,
    })
    expect(cangKu.fenLeiLieBiao.find((item) => item.id === ziDingId)).toMatchObject({
      version: 1,
      record_count: 1,
    })
  })

  it('快速切换分类只采纳最后一次请求结果', async () => {
    const cangKu = await chuangJianCangKu()
    let jieJueZiDing!: (value: unknown) => void
    api.huoQuDangAnLieBiao.mockImplementationOnce(
      () => new Promise((resolve) => { jieJueZiDing = resolve }),
    )
    const dengDaiZiDing = cangKu.qieHuanFenLei(ziDingId)
    api.huoQuDangAnLieBiao.mockResolvedValueOnce([
      dangAn('00000000-0000-4000-8000-000000000104', moRenId, 0),
    ])
    const dengDaiMoRen = cangKu.qieHuanFenLei(moRenId)
    await dengDaiMoRen
    jieJueZiDing([
      dangAn('00000000-0000-4000-8000-000000000201', ziDingId, 0),
    ])
    await dengDaiZiDing

    expect(cangKu.dangQianFenLeiId).toBe(moRenId)
    expect(cangKu.dangAnLieBiao.map((item) => item.id.slice(-3))).toEqual(['104'])
  })

  it('移档和排序进行中禁止重复提交', async () => {
    const cangKu = await chuangJianCangKu()
    let jieJuePaiXu!: (value: unknown) => void
    api.paiXuFenLeiNeiZhanJi.mockImplementationOnce(
      () => new Promise((resolve) => { jieJuePaiXu = resolve }),
    )
    const ids = cangKu.dangAnLieBiao.map((item) => item.id)
    const paiXu = cangKu.baoCunPaiXu([...ids].reverse())
    await expect(cangKu.yiDongDangAn(ids[0], ziDingId)).resolves.toMatchObject({ kind: 'busy' })
    jieJuePaiXu({ category_id: moRenId, record_ids: [...ids].reverse(), version: 1 })
    await paiXu
  })
})
