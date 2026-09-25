import { describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/debug日志', () => ({ debug日志: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

import { diuQiDaoCuoWuJian, fanGouKuai, jiLuKuaiDiuQi, kuaiShenHeWenBen, leiXingDaoMeiTiLeiBie, paiShengJianRong, qingLiLuoKuKuai, qingLiTiJiaoKuai, shunXuKeDuWenBen, shiTuWenHunPaiKuai, xiaoXiKuaiPeiZhi, yingYongMeiTiPanDing } from '../消息内容块'

const ID = '550e8400-e29b-41d4-a716-446655440000'
const 图 = { lei_xing: 'tupian' as const, mei_ti_id: ID }
const 文 = { lei_xing: 'wenzi' as const, nei_rong: '文字' }

describe('消息内容块业务分支', () => {
  it('提交清洗覆盖数组、JSON、坏形状、长度和图片上限', () => {
    expect(xiaoXiKuaiPeiZhi()).toEqual(expect.objectContaining({ zuiDaKuaiShu: expect.any(Number) }))
    expect(qingLiTiJiaoKuai(null).kuai).toBeNull()
    expect(qingLiTiJiaoKuai('坏JSON').kuai).toBeNull()
    expect(qingLiTiJiaoKuai('{"a":1}').kuai).toBeNull()
    expect(qingLiTiJiaoKuai([]).kuai).toBeNull()
    expect(qingLiTiJiaoKuai([null, { lei_xing: '陌生' }, 文, 图]).diuQi).toContain('kuai_fei_dui_xiang')
    expect(qingLiTiJiaoKuai([图, 图]).daiPanDingMeiTiId).toEqual([ID])
    expect(qingLiTiJiaoKuai([{ lei_xing: 'wenzi', nei_rong: 'x'.repeat(1000) }]).chaoXian).toBe(true)
  })

  it('媒体归属、顺序渲染、兼容投影和历史反构覆盖全部分类', () => {
    const map = new Map([[ID, { lei_bie: 'tupian', suo_shu: true }]])
    expect(yingYongMeiTiPanDing([图], map)).toEqual({ baoLiu: [图], diuQi: [] })
    expect(yingYongMeiTiPanDing([图], new Map()).diuQi).toEqual(['mei_ti_bu_cun_zai'])
    expect(yingYongMeiTiPanDing([图], new Map([[ID, { lei_bie: 'tupian', suo_shu: false }]])).diuQi).toEqual(['mei_ti_wu_quan_xian'])
    expect(yingYongMeiTiPanDing([图], new Map([[ID, { lei_bie: 'wenjian', suo_shu: true }]])).diuQi).toEqual(['mei_ti_lei_bie_bu_fu'])
    expect(shunXuKeDuWenBen([文, 图], { leiBieLeiXing: () => 'tupian' })).toBe('文字[图片]')
    expect(paiShengJianRong([图], map)).toEqual({ nei_rong: '', lei_xing: 'tuPian', mei_ti_id: ID })
    expect(paiShengJianRong([文, 图], map)).toMatchObject({ lei_xing: 'wenben', mei_ti_id: ID })
    expect(leiXingDaoMeiTiLeiBie('tuPian')).toBe('tupian')
    expect(leiXingDaoMeiTiLeiBie('未知')).toBeNull()
    expect(fanGouKuai({ nei_rong: '文字', lei_xing: 'wenben', mei_ti_id: null })).toEqual([{ lei_xing: 'wenzi', nei_rong: '文字' }])
    expect(fanGouKuai({ nei_rong: '', lei_xing: 'tuPian', mei_ti_id: ID })).toEqual([图])
    expect(fanGouKuai({ nei_rong: '', lei_xing: '未知', mei_ti_id: null })).toEqual([{ lei_xing: 'wenzi', nei_rong: '' }])
  })

  it('库侧清洗、审核文本、混排判定和错误映射覆盖坏数据', () => {
    expect(qingLiLuoKuKuai(undefined, '消息')).toBeNull()
    expect(qingLiLuoKuKuai({}, '消息')).toBeNull()
    expect(qingLiLuoKuKuai([null, { lei_xing: '陌生' }], '消息')).toBeNull()
    expect(qingLiLuoKuKuai([图, 文], '消息')).toEqual([图, 文])
    expect(kuaiShenHeWenBen([文, 图])).toBe('文字')
    expect(shiTuWenHunPaiKuai(null)).toBe(false)
    expect(shiTuWenHunPaiKuai([文, 图])).toBe(true)
    expect(diuQiDaoCuoWuJian(['mei_ti_wu_quan_xian'])).toBe('meiTiWuQuanXian')
    expect(diuQiDaoCuoWuJian(['mei_ti_bu_cun_zai'])).toBe('meiTiBuCunZai')
    expect(diuQiDaoCuoWuJian(['lei_xing_wu_ren'])).toBe('xiaoXiNeiRongWeiKong')
    expect(() => jiLuKuaiDiuQi([], '场景')).not.toThrow()
    expect(() => jiLuKuaiDiuQi(['lei_xing_wu_ren'], '场景', '用户')).not.toThrow()
  })
})
