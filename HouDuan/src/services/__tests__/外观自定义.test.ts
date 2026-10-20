import { describe, expect, it } from 'vitest'
import {
  WAI_GUAN_MEI_LEI_ZUI_DA_TIAO_SHU,
  WaiGuanCuoWu,
  guiYiCunChuShuJu,
  guiYiShangChuanShuJu,
  heChengMengCeng,
  jiSuanDuiBiDu,
  jieXiYanSe,
  shengChengChuCan,
  shiKeYongWenZiYanSe,
  tiQuShuJuNeiSha,
  xuanZeMengCeng,
} from '../外观自定义'

const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const BIAO_SHI = '11111111-1111-4111-8111-111111111111'

function qingDan(tiaoMu: Record<string, unknown>[]): Record<string, unknown> {
  return { beiJing: tiaoMu, qiPao: [], beiJingFuGai: {}, dangQianQiPao: { ziJi: '', ai: '' } }
}

describe('外观自定义对比度', () => {
  it('黑白对比度为21比1', () => {
    const hei = jieXiYanSe('#000000')
    const bai = jieXiYanSe('#FFFFFF')
    expect(hei && bai).toBeTruthy()
    expect(jiSuanDuiBiDu(bai!, hei!)).toBeCloseTo(21, 5)
  })

  it('白字与黑字都可用，中灰与低对比色不可用', () => {
    expect(shiKeYongWenZiYanSe('#FFFFFF')).toBe(true)
    expect(shiKeYongWenZiYanSe('#000000')).toBe(true)
    expect(shiKeYongWenZiYanSe('#777777')).toBe(false)
    expect(shiKeYongWenZiYanSe('#999999')).toBe(false)
  })

  it('非法颜色格式不可用', () => {
    expect(shiKeYongWenZiYanSe('#FFF')).toBe(false)
    expect(shiKeYongWenZiYanSe('white')).toBe(false)
    expect(shiKeYongWenZiYanSe('#GGGGGG')).toBe(false)
  })

  it('深色文字配浅蒙层，浅色文字配深蒙层', () => {
    expect(xuanZeMengCeng(jieXiYanSe('#FFFFFF')!)).toBe('an')
    expect(xuanZeMengCeng(jieXiYanSe('#000000')!)).toBe('liang')
  })

  it('蒙层合成结果落在前景与底色之间', () => {
    const heiSe = { r: 0, g: 0, b: 0, a: 0.72 }
    const baiSe = { r: 255, g: 255, b: 255, a: 0.86 }
    expect(heChengMengCeng(heiSe, 255)).toEqual({ r: 71, g: 71, b: 71 })
    expect(heChengMengCeng(baiSe, 0)).toEqual({ r: 219, g: 219, b: 219 })
  })
})

describe('外观自定义上传校验', () => {
  it('合法条目归一为无参媒体引用', () => {
    const shuJu = guiYiShangChuanShuJu(
      qingDan([
        {
          id: BIAO_SHI,
          mingCheng: '夜景',
          tuDiZhi: `/api/媒体/${SHA_A}?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=abc`,
          wenZiYanSe: '#ffffff',
        },
      ]),
    )
    expect(shuJu.beiJing).toHaveLength(1)
    expect(shuJu.beiJing[0].meiTiYinYong).toBe(`/api/媒体/${SHA_A}`)
    expect(shuJu.beiJing[0].wenZiYanSe).toBe('#FFFFFF')
  })

  it('未给文字颜色时回落到白色', () => {
    const shuJu = guiYiShangChuanShuJu(
      qingDan([{ id: BIAO_SHI, mingCheng: '夜景', tuDiZhi: `/api/媒体/${SHA_A}` }]),
    )
    expect(shuJu.beiJing[0].wenZiYanSe).toBe('#FFFFFF')
  })

  it('非媒体地址被拒绝', () => {
    expect(() =>
      guiYiShangChuanShuJu(
        qingDan([{ id: BIAO_SHI, mingCheng: '夜景', tuDiZhi: 'https://example.com/a.png' }]),
      ),
    ).toThrow(WaiGuanCuoWu)
  })

  it('空名称与超长名称被拒绝', () => {
    expect(() =>
      guiYiShangChuanShuJu(qingDan([{ id: BIAO_SHI, mingCheng: '   ', tuDiZhi: `/api/媒体/${SHA_A}` }])),
    ).toThrow(WaiGuanCuoWu)
    expect(() =>
      guiYiShangChuanShuJu(
        qingDan([
          { id: BIAO_SHI, mingCheng: '一'.repeat(21), tuDiZhi: `/api/媒体/${SHA_A}` },
        ]),
      ),
    ).toThrow(WaiGuanCuoWu)
  })

  it('非法标识与非法颜色被拒绝', () => {
    expect(() =>
      guiYiShangChuanShuJu(
        qingDan([{ id: 'abc', mingCheng: '夜景', tuDiZhi: `/api/媒体/${SHA_A}` }]),
      ),
    ).toThrow(WaiGuanCuoWu)
    expect(() =>
      guiYiShangChuanShuJu(
        qingDan([
          { id: BIAO_SHI, mingCheng: '夜景', tuDiZhi: `/api/媒体/${SHA_A}`, wenZiYanSe: '白色' },
        ]),
      ),
    ).toThrow(WaiGuanCuoWu)
  })

  it('对比度不足的文字颜色被拒绝', () => {
    expect(() =>
      guiYiShangChuanShuJu(
        qingDan([
          {
            id: BIAO_SHI,
            mingCheng: '夜景',
            tuDiZhi: `/api/媒体/${SHA_A}`,
            wenZiYanSe: '#777777',
          },
        ]),
      ),
    ).toThrow(WaiGuanCuoWu)
  })

  it('条目数量超上限被拒绝', () => {
    const tiaoMu = Array.from({ length: WAI_GUAN_MEI_LEI_ZUI_DA_TIAO_SHU + 1 }, (_, xuHao) => ({
      id: `${String(xuHao).padStart(8, '0')}-1111-4111-8111-111111111111`,
      mingCheng: `背景${xuHao}`,
      tuDiZhi: `/api/媒体/${SHA_A}`,
    }))
    expect(() => guiYiShangChuanShuJu(qingDan(tiaoMu))).toThrow(WaiGuanCuoWu)
  })

  it('重复标识被拒绝', () => {
    const tiaoMu = [
      { id: BIAO_SHI, mingCheng: '一', tuDiZhi: `/api/媒体/${SHA_A}` },
      { id: BIAO_SHI, mingCheng: '二', tuDiZhi: `/api/媒体/${SHA_B}` },
    ]
    expect(() => guiYiShangChuanShuJu(qingDan(tiaoMu))).toThrow(WaiGuanCuoWu)
  })

  it('预设名称覆盖只接受已知预设键', () => {
    expect(() =>
      guiYiShangChuanShuJu({
        beiJing: [],
        qiPao: [],
        beiJingFuGai: { buCunZai: { mingCheng: '别名', wenZiYanSe: '' } },
        dangQianQiPao: { ziJi: '', ai: '' },
      }),
    ).toThrow(WaiGuanCuoWu)
    const shuJu = guiYiShangChuanShuJu({
      beiJing: [],
      qiPao: [],
      beiJingFuGai: { chenWuQing: { mingCheng: '晨雾', wenZiYanSe: '#FFFFFF' } },
      dangQianQiPao: { ziJi: '', ai: '' },
    })
    expect(shuJu.beiJingFuGai.chenWuQing).toEqual({ mingCheng: '晨雾', wenZiYanSe: '#FFFFFF' })
  })
})

describe('外观自定义存储解码', () => {
  it('宽松模式丢弃非法条目而不是整体失败', () => {
    const shuJu = guiYiCunChuShuJu({
      beiJing: [
        { id: BIAO_SHI, mingCheng: '夜景', tuDiZhi: `/api/媒体/${SHA_A}` },
        { id: 'bad', mingCheng: '坏', tuDiZhi: `/api/媒体/${SHA_B}` },
        { id: BIAO_SHI, mingCheng: '重复', tuDiZhi: `/api/媒体/${SHA_B}` },
      ],
      qiPao: [{ id: BIAO_SHI, mingCheng: '气泡', tuDiZhi: `/api/媒体/${SHA_B}` }],
      beiJingFuGai: { chenWuQing: { mingCheng: '晨雾', wenZiYanSe: '#FFFFFF' }, weiZhi: { mingCheng: 'x' } },
      dangQianQiPao: { ziJi: BIAO_SHI, ai: '99999999-9999-4999-8999-999999999999' },
    })
    expect(shuJu.beiJing).toHaveLength(1)
    expect(shuJu.qiPao).toHaveLength(1)
    expect(shuJu.beiJingFuGai.chenWuQing.mingCheng).toBe('晨雾')
    expect(shuJu.beiJingFuGai.weiZhi).toBeUndefined()
    expect(shuJu.dangQianQiPao).toEqual({ ziJi: BIAO_SHI, ai: '' })
  })

  it('空值解码为空外观', () => {
    expect(guiYiCunChuShuJu(null)).toEqual({
      beiJing: [],
      qiPao: [],
      beiJingFuGai: {},
      dangQianQiPao: { ziJi: '', ai: '' },
    })
    expect(guiYiCunChuShuJu('不是对象').beiJing).toEqual([])
  })
})

describe('外观自定义出参与媒体校验', () => {
  it('按用户重签图片地址并保留无参引用入库', () => {
    const shuJu = guiYiShangChuanShuJu(
      qingDan([
        { id: BIAO_SHI, mingCheng: '夜景', tuDiZhi: `/api/媒体/${SHA_A}` },
        { id: '22222222-2222-4222-8222-222222222222', mingCheng: '夜景二', tuDiZhi: `/api/媒体/${SHA_B}` },
      ]),
    )
    const chuCan = shengChengChuCan(shuJu, '11111111-1111-4111-8111-111111111111')
    expect(chuCan.bei_jing[0].tu_di_zhi).toContain(`/api/媒体/${SHA_A}?e=`)
    expect(chuCan.bei_jing[0].tu_di_zhi).toContain('&s=')
    expect(chuCan.bei_jing[1].ming_cheng).toBe('夜景二')
    expect([...tiQuShuJuNeiSha(shuJu)].sort()).toEqual([SHA_A, SHA_B].sort())
  })

  it('出参字段为下划线命名且空外观为零条目', () => {
    const kong = shengChengChuCan(guiYiCunChuShuJu({}), BIAO_SHI)
    expect(Object.keys(kong).sort()).toEqual(['bei_jing', 'bei_jing_fu_gai', 'dang_qian_qi_pao', 'qi_pao'])
    expect(kong.bei_jing).toEqual([])
    expect(kong.qi_pao).toEqual([])
  })
})
