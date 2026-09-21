import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  使用用户设置仓库,
  LIAO_TIAN_BEI_JING_XUAN_XIANG,
  shiYuSheBeiJing,
  shiZiDingYiBeiJingURL,
  huoQuBeiJingNeiLianYangShi,
} from '@/stores/用户设置'
import type { YongHuSheZhi } from '@/api/社交'

vi.mock('@/api/社交', () => ({
  huoQuYongHuSheZhi: vi.fn(),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
}))

const ZI_DING_YI_HTTPS = 'https://cdn.example.com/beijing/xinghe.jpg'
const ZI_DING_YI_QIAN_MING = `/api/媒体/${'c'.repeat(64)}?e=9999999999&s=${'d'.repeat(64)}`

function moNiSheZhi(beiJing: string): YongHuSheZhi {
  return {
    uid: 'uid-1',
    shou_ji_hao: '',
    tou_xiang: null,
    qian_ming: null,
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: beiJing,
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  }
}

describe('聊天背景单源解析', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('预设六项保持不变', () => {
    expect([...LIAO_TIAN_BEI_JING_XUAN_XIANG]).toEqual([
      'moRen',
      'miWuSenLin',
      'haiYangZhiLan',
      'fenSeMengJing',
      'yeKongXingHe',
      'miSeTianYuan',
    ])
  })

  it('预设判定与自定义URL判定互斥', () => {
    for (const yuShe of LIAO_TIAN_BEI_JING_XUAN_XIANG) {
      expect(shiYuSheBeiJing(yuShe)).toBe(true)
      expect(shiZiDingYiBeiJingURL(yuShe)).toBe(false)
    }
    for (const ziDingYi of [ZI_DING_YI_HTTPS, ZI_DING_YI_QIAN_MING]) {
      expect(shiZiDingYiBeiJingURL(ziDingYi)).toBe(true)
      expect(shiYuSheBeiJing(ziDingYi)).toBe(false)
    }
  })

  it('非法背景一律拒绝', () => {
    expect(shiZiDingYiBeiJingURL('')).toBe(false)
    expect(shiZiDingYiBeiJingURL('http://mingwen.example.com/a.jpg')).toBe(false)
    expect(shiZiDingYiBeiJingURL('buCunZai')).toBe(false)
    expect(shiZiDingYiBeiJingURL(`https://cdn.example.com/${'a'.repeat(2000)}`)).toBe(false)
    expect(shiZiDingYiBeiJingURL('/api/媒体/duan')).toBe(false)
    expect(shiZiDingYiBeiJingURL(null)).toBe(false)
  })

  it('内联样式仅自定义URL生效', () => {
    const yangShi = huoQuBeiJingNeiLianYangShi(ZI_DING_YI_HTTPS)
    expect(yangShi.backgroundImage).toContain(ZI_DING_YI_HTTPS)
    expect(yangShi.backgroundSize).toBe('cover')
    expect(huoQuBeiJingNeiLianYangShi('moRen')).toEqual({})
    expect(huoQuBeiJingNeiLianYangShi('http://mingwen.example.com/a.jpg')).toEqual({})
  })

  it('内联样式过滤引号防注入', () => {
    const yangShi = huoQuBeiJingNeiLianYangShi(`${ZI_DING_YI_HTTPS}?x="><`)
    const neiQian = String(yangShi.backgroundImage).replace(/^url\("/, '').replace(/"\)$/, '')
    expect(neiQian).not.toContain('"')
    expect(neiQian).toContain(ZI_DING_YI_HTTPS)
  })

  it('加载云端自定义URL后双页同源', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuYongHuSheZhi).mockResolvedValue(moNiSheZhi(ZI_DING_YI_QIAN_MING))
    const 仓库 = 使用用户设置仓库()
    await 仓库.jiaZai()
    expect(仓库.liaoTianBeiJing).toBe(ZI_DING_YI_QIAN_MING)
    expect(仓库.shiZiDingYi).toBe(true)
    expect(仓库.shiYuShe).toBe(false)
    expect(仓库.beiJingNeiLianYangShi.backgroundImage).toContain('/api/媒体/')
  })

  it('保存非法自定义URL直接抛错不落库', async () => {
    const sheJiao = await import('@/api/社交')
    const 仓库 = 使用用户设置仓库()
    await expect(仓库.baoCunZiDingYiBeiJing('http://mingwen.example.com/a.jpg')).rejects.toThrow()
    expect(vi.mocked(sheJiao.baoCunLiaoTianBeiJing)).not.toHaveBeenCalled()
  })

  it('删除自定义恢复默认并同步云端', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuYongHuSheZhi).mockResolvedValue(moNiSheZhi(ZI_DING_YI_HTTPS))
    const 仓库 = 使用用户设置仓库()
    await 仓库.jiaZai()
    await 仓库.qingChuZiDingYiBeiJing()
    expect(仓库.liaoTianBeiJing).toBe('moRen')
    expect(vi.mocked(sheJiao.baoCunLiaoTianBeiJing)).toHaveBeenCalledWith('moRen')
  })
})
