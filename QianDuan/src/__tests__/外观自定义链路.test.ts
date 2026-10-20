import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  guiYiWaiGuanChuCan,
  huoQuBeiJingMengCengZhi,
  huoQuQiPaoBeiJingZhi,
  shiKeYongQiPaoWenZiYanSe,
  shiKeYongWenZiYanSe,
  tiQuWaiGuanSha,
  xiaYiGeZiDingYiMing,
  type WaiGuanChuCan,
} from '@/config/外观自定义'
import { huoQuFanYi } from '@/config/翻译表'
import { chuangJianQianTaiCuoWu, tiQuCuoWuWenBen } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { TuPianChiCunCuoWu, yaSuoTuPiang } from '@/utils/图片压缩'
import { baoCunLiaoTianBeiJing, shangChuanWaiGuanTuPian, baoCunWaiGuan } from '@/api/社交'
import { 使用用户设置仓库 } from '@/stores/用户设置'

vi.mock('@/api/社交', async (yuanShi) => {
  const yuan = await (yuanShi as () => Promise<Record<string, unknown>>)()
  return {
    ...yuan,
    baoCunLiaoTianBeiJing: vi.fn(async () => undefined),
    shangChuanWaiGuanTuPian: vi.fn(async () => '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)),
    baoCunWaiGuan: vi.fn(async (shuJu: Record<string, unknown>) => {
      const zhuan = (lie: Array<Record<string, unknown>>) =>
        lie.map((xiang) => ({
          id: xiang.id,
          ming_cheng: xiang.mingCheng,
          tu_di_zhi: xiang.tuDiZhi,
          wen_zi_yan_se: xiang.wenZiYanSe,
        }))
      return {
        bei_jing: zhuan((shuJu.beiJing || []) as Array<Record<string, unknown>>),
        qi_pao: zhuan((shuJu.qiPao || []) as Array<Record<string, unknown>>),
        bei_jing_fu_gai: shuJu.beiJingFuGai || {},
        dang_qian_qi_pao: shuJu.dangQianQiPao || { ziJi: '', ai: '' },
      } as WaiGuanChuCan
    }),
  }
})

const SHA_YANG_LI = 'a'.repeat(64)
const MEI_TI_URL = '/api/媒体/' + SHA_YANG_LI + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)

function zaoTuPian(leiXing = 'image/png'): File {
  return new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'yang-li.png', { type: leiXing })
}

function zhuangTaiKuang(tiaoMu: Array<Record<string, unknown>>): WaiGuanChuCan {
  return {
    bei_jing: tiaoMu.map((xiang) => ({
      id: String(xiang.id),
      ming_cheng: String(xiang.mingCheng),
      tu_di_zhi: String(xiang.tuDiZhi),
      wen_zi_yan_se: String(xiang.wenZiYanSe),
    })),
    qi_pao: [],
    bei_jing_fu_gai: {},
    dang_qian_qi_pao: { ziJi: '', ai: '' },
  }
}

describe('外观自定义命名与蒙层', () => {
  it('自定义背景名从1开始顺延，撞名取第一个空位', () => {
    expect(xiaYiGeZiDingYiMing('beiJing', [])).toBe('自定义背景1')
    expect(xiaYiGeZiDingYiMing('beiJing', ['自定义背景1'])).toBe('自定义背景2')
    expect(xiaYiGeZiDingYiMing('beiJing', ['自定义背景2'])).toBe('自定义背景1')
    expect(xiaYiGeZiDingYiMing('beiJing', ['自定义背景1', '自定义背景3'])).toBe('自定义背景2')
    expect(xiaYiGeZiDingYiMing('qiPao', ['自定义气泡1', '自定义气泡2'])).toBe('自定义气泡3')
  })

  it('白字配深蒙层、黑字配浅蒙层，蒙层令牌带透明度', () => {
    expect(huoQuBeiJingMengCengZhi('#FFFFFF')).toContain('0.72')
    expect(huoQuBeiJingMengCengZhi('#000000')).toContain('0.86')
    expect(huoQuQiPaoBeiJingZhi(MEI_TI_URL, '#FFFFFF')).toContain('0.55')
    expect(huoQuQiPaoBeiJingZhi(MEI_TI_URL, '#000000')).toContain('0.62')
  })

  it('对比度不足的文字色被拒绝，黑白两色可用', () => {
    expect(shiKeYongWenZiYanSe('#FFFFFF')).toBe(true)
    expect(shiKeYongWenZiYanSe('#000000')).toBe(true)
    expect(shiKeYongWenZiYanSe('#777777')).toBe(false)
    expect(shiKeYongQiPaoWenZiYanSe('#8B8B8B')).toBe(false)
  })

  it('出参归一保留媒体签名地址并剔除悬空当前气泡', () => {
    const chu = guiYiWaiGuanChuCan({
      bei_jing: [{ id: '1', ming_cheng: '自定义背景1', tu_di_zhi: MEI_TI_URL, wen_zi_yan_se: '#FFFFFF' }],
      qi_pao: [],
      bei_jing_fu_gai: {},
      dang_qian_qi_pao: { ziJi: 'bu-cun-zai', ai: '' },
    })
    expect(chu.beiJing).toHaveLength(1)
    expect(tiQuWaiGuanSha(chu.beiJing[0].tuDiZhi)).toBe(SHA_YANG_LI)
    expect(chu.dangQianQiPao).toEqual({ ziJi: '', ai: '' })
  })
})

describe('外观自定义报错文案', () => {
  it('后台给出的具体提示优先于通用权限文案', () => {
    const cuoWu = chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.PERMISSION_DENIED,
      retryable: false,
      httpStatus: 403,
      houTaiBaoFeng: { code: 'PERMISSION_DENIED', message: '图片安全审核暂时不可用，请重试当前操作' },
    })
    expect(tiQuCuoWuWenBen(cuoWu, '这次没有保存成功，请再试一次')).toBe('图片安全审核暂时不可用，请重试当前操作')
  })

  it('本地校验的中文提示原样上屏，非中文回退默认文案', () => {
    expect(tiQuCuoWuWenBen(new Error('这个文件不能用'), '密')).toBe('这个文件不能用')
    expect(tiQuCuoWuWenBen(new Error('Network Error'), '这次没有保存成功，请再试一次')).toBe('这次没有保存成功，请再试一次')
    expect(tiQuCuoWuWenBen(undefined, '这次没有保存成功，请再试一次')).toBe('这次没有保存成功，请再试一次')
  })
})

describe('外观图片尺寸前置校验', () => {
  it('超过最大边时抛出尺寸错误', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 12000, height: 400, close: () => undefined })),
    )
    await expect(yaSuoTuPiang(zaoTuPian(), 10000)).rejects.toBeInstanceOf(TuPianChiCunCuoWu)
    vi.unstubAllGlobals()
  })

  it('尺寸合规时照常返回可上传内容', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 480, height: 320, close: () => undefined })),
    )
    const jieGuo = await yaSuoTuPiang(zaoTuPian(), 10000)
    expect(jieGuo).toBeInstanceOf(Blob)
    vi.unstubAllGlobals()
  })
})

describe('外观上传仓库链路', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(shangChuanWaiGuanTuPian).mockClear()
    vi.mocked(baoCunWaiGuan).mockClear()
    vi.mocked(baoCunLiaoTianBeiJing).mockClear()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 480, height: 320, close: () => undefined })),
    )
  })

  it('上传成功后落库并返回自定义背景1', async () => {
    const cang = 使用用户设置仓库()
    const tiaoMu = await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    expect(tiaoMu.mingCheng).toBe('自定义背景1')
    expect(tiaoMu.wenZiYanSe).toBe(WAI_GUAN_MO_REN_WEN_ZI_YAN_SE)
    expect(shangChuanWaiGuanTuPian).toHaveBeenCalledTimes(1)
    expect(baoCunWaiGuan).toHaveBeenCalledTimes(1)
    expect(cang.waiGuan.beiJing.map((xiang) => xiang.mingCheng)).toEqual(['自定义背景1'])
  })

  it('第二张顺延为自定义背景2', async () => {
    const cang = 使用用户设置仓库()
    await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    const diEr = await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    expect(diEr.mingCheng).toBe('自定义背景2')
  })

  it('数量到上限时给出上限提示且不再发上传请求', async () => {
    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: Array.from({ length: 24 }, (_, xuHao) => ({
        id: String(xuHao),
        mingCheng: '自定义背景' + String(xuHao + 1),
        tuDiZhi: MEI_TI_URL,
        wenZiYanSe: '#FFFFFF',
      })),
      qiPao: [],
      beiJingFuGai: {},
      dangQianQiPao: { ziJi: '', ai: '' },
    }
    await expect(cang.shangChuanWaiGuan('beiJing', zaoTuPian())).rejects.toThrow(
      huoQuFanYi('sheZhi', 'waiGuanTiaoMuTaiDuo'),
    )
    expect(shangChuanWaiGuanTuPian).not.toHaveBeenCalled()
  })

  it('非图片文件在本地即被拦下', async () => {
    const cang = 使用用户设置仓库()
    const wenJian = new File([new Uint8Array([1])], 'a.txt', { type: 'text/plain' })
    await expect(cang.shangChuanWaiGuan('beiJing', wenJian)).rejects.toThrow(
      huoQuFanYi('sheZhi', 'waiGuanTuPianFeiFa'),
    )
    expect(shangChuanWaiGuanTuPian).not.toHaveBeenCalled()
  })

  it('还原默认取第一个空位，删除后当前背景回默认', async () => {
    const cang = 使用用户设置仓库()
    const yi = await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    await cang.gengXinWaiGuanTiaoMu('beiJing', yi.id, { mingCheng: '海边', wenZiYanSe: '#FFFFFF' })
    await cang.huanYuanWaiGuan('beiJing', yi.id)
    expect(cang.waiGuan.beiJing.find((xiang) => xiang.id === yi.id)?.mingCheng).toBe('自定义背景1')
    await cang.shanChuWaiGuan('beiJing', yi.id)
    expect(cang.waiGuan.beiJing).toHaveLength(1)
  })

  it('删除正在使用的背景时切回默认背景', async () => {
    const cang = 使用用户设置仓库()
    const yi = await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    cang.liaoTianBeiJingQian = yi.tuDiZhi
    cang.liaoTianBeiJingShen = yi.tuDiZhi
    await cang.shanChuWaiGuan('beiJing', yi.id)
    expect(cang.liaoTianBeiJingQian).toBe('moRen')
    expect(cang.liaoTianBeiJingShen).toBe('moRen')
  })
})
