import { describe, it, expect } from 'vitest'
import {
  解析结局类型,
  渲染结局文案,
  渲染性别变体文案,
  结局枚举列表,
  结局翻译键一致,
} from '../结局'
import { fanYi } from '../../config/translations'
import type { YouXiJieGuoLeiXing } from '../../types'

describe('结局枚举与翻译键一一对应', () => {
  it('jieJu 段与 YouXiJieGuoLeiXing 双向一致', () => {
    expect(结局翻译键一致).toBe(true)
  })

  it('枚举列表由翻译派生，覆盖全部 14 个结局含免打扰', () => {
    expect(结局枚举列表).toHaveLength(14)
    expect(结局枚举列表).toContain('shi_bai_mian_da_rao')
    expect(结局枚举列表).toContain('shi_bai_bei_qi_pian')
  })

  it('枚举键长度不超落库列 VARCHAR(50)', () => {
    for (const 结局 of 结局枚举列表) {
      expect(结局.length).toBeLessThanOrEqual(50)
    }
  })

  it('未知结局键不会命中枚举集合', () => {
    expect(解析结局类型('sheng_li_ai_qing2', true)).toBe('shi_bai_hao_gan_du_gui_ling')
  })
})

describe('枚举渲染为展示文案', () => {
  const 含性别变体的结局: YouXiJieGuoLeiXing[] = [
    'shi_bai_bei_qi_pian',
    'shi_bai_bei_zha_xing_qi_pian',
    'sheng_li_shi_po',
    'shi_bai_cuo_wu_shi_po',
  ]

  it('渣型语义结局按性别产出渣男/渣女变体', () => {
    expect(渲染结局文案('shi_bai_bei_qi_pian', '男')).toBe('被渣男骗了')
    expect(渲染结局文案('shi_bai_bei_qi_pian', '女')).toBe('被渣女骗了')
    expect(渲染结局文案('shi_bai_bei_zha_xing_qi_pian', '男')).toBe('被渣男套路了')
    expect(渲染结局文案('shi_bai_bei_zha_xing_qi_pian', '女')).toBe('被渣女套路了')
    expect(渲染结局文案('sheng_li_shi_po', '男')).toBe('识破渣男')
    expect(渲染结局文案('sheng_li_shi_po', '女')).toBe('识破渣女')
    expect(渲染结局文案('shi_bai_cuo_wu_shi_po', '男')).toBe('误会了，TA不是渣男')
    expect(渲染结局文案('shi_bai_cuo_wu_shi_po', '女')).toBe('误会了，TA不是渣女')
  })

  it('性别缺失时回落中性文案且不含未替换占位', () => {
    for (const 结局 of 含性别变体的结局) {
      const 中性 = fanYi.jieJu[结局]
      expect(渲染结局文案(结局, '未知')).toBe(中性)
      expect(中性).not.toContain('/')
    }
  })

  it('每个性别变体的三种取值互不相同且非空', () => {
    for (const 结局 of 含性别变体的结局) {
      const 三态 = [渲染结局文案(结局, '男'), 渲染结局文案(结局, '女'), 渲染结局文案(结局, '未知')]
      for (const 文本 of 三态) expect(文本.length).toBeGreaterThan(0)
      expect(new Set(三态).size).toBe(3)
    }
  })

  it('不含渣型语义的结局不受性别影响', () => {
    for (const 结局 of 结局枚举列表) {
      if (含性别变体的结局.includes(结局)) continue
      expect(渲染结局文案(结局, '男')).toBe(渲染结局文案(结局, '女'))
      expect(渲染结局文案(结局, '未知')).toBe(渲染结局文案(结局, '男'))
    }
  })

  it('已知性别时任何结局都不再吐出内部术语渣型', () => {
    for (const 结局 of 结局枚举列表) {
      expect(渲染结局文案(结局, '男')).not.toContain('渣型')
      expect(渲染结局文案(结局, '女')).not.toContain('渣型')
    }
  })

  it('进行中结局无文案', () => {
    expect(渲染结局文案('jinxing_zhong', '女')).toBe('')
  })

  it('复盘渣型警示按性别出变体', () => {
    expect(渲染性别变体文案('fuPan', 'zhaXingJingShiDaoYu', '男')).toBe(
      '本局对象为渣男，请警惕其常见套路：',
    )
    expect(渲染性别变体文案('fuPan', 'zhaXingJingShiDaoYu', '女')).toBe(
      '本局对象为渣女，请警惕其常见套路：',
    )
    expect(渲染性别变体文案('fuPan', 'zhaXingJingShiFallback', '男')).toContain('渣男')
    expect(渲染性别变体文案('fuPan', 'zhaXingJingShiFallback', '女')).toContain('渣女')
  })

  it('复盘警示块已知性别时不残留斜杠占位或内部术语', () => {
    for (const 键 of ['zhaXingJingShiDaoYu', 'zhaXingJingShiFallback'] as const) {
      for (const 性别 of ['男', '女'] as const) {
        const 文本 = 渲染性别变体文案('fuPan', 键, 性别)
        expect(文本).not.toContain('渣型')
        expect(文本).not.toContain('/')
      }
      expect(渲染性别变体文案('fuPan', 键, '未知')).toBe(fanYi.fuPan[键])
    }
  })

  it('未登记性别变体的键直接返回中性文案', () => {
    expect(渲染性别变体文案('zhanJi', 'weiZhiWeiXin', '男')).toBe(fanYi.zhanJi.weiZhiWeiXin)
  })
})

describe('落库值解析为枚举', () => {
  it('新数据：值本身就是枚举键时优先直接命中', () => {
    expect(解析结局类型('shi_bai_bei_qi_pian', true)).toBe('shi_bai_bei_qi_pian')
    expect(解析结局类型('sheng_li_ai_qing', false)).toBe('sheng_li_ai_qing')
    expect(解析结局类型('shi_bai_mian_da_rao', true)).toBe('shi_bai_mian_da_rao')
  })

  it('旧数据：中性文案行仍可解析', () => {
    expect(解析结局类型('被渣型骗了', true)).toBe('shi_bai_bei_qi_pian')
    expect(解析结局类型('在一起了 💕', false)).toBe('sheng_li_ai_qing')
    expect(解析结局类型('好感度归零', true)).toBe('shi_bai_hao_gan_du_gui_ling')
  })

  it('旧数据：文案改版前的胜利-/失败- 行仍可解析', () => {
    expect(解析结局类型('失败-被欺骗', true)).toBe('shi_bai_bei_qi_pian')
    expect(解析结局类型('失败-被诈型欺骗', true)).toBe('shi_bai_bei_zha_xing_qi_pian')
    expect(解析结局类型('胜利-识破', false)).toBe('sheng_li_shi_po')
  })

  it('性别化文案行（万一落库）也能反查，不会错分', () => {
    expect(解析结局类型('被渣男骗了', true)).toBe('shi_bai_bei_qi_pian')
    expect(解析结局类型('被渣女套路了', true)).toBe('shi_bai_bei_zha_xing_qi_pian')
    expect(解析结局类型('识破渣男', true)).toBe('sheng_li_shi_po')
  })

  it('空值未封存判进行中，非法值按封存状态兜底', () => {
    expect(解析结局类型('', false)).toBe('jinxing_zhong')
    expect(解析结局类型(null, false)).toBe('jinxing_zhong')
    expect(解析结局类型(undefined, true)).toBe('shi_bai_hao_gan_du_gui_ling')
    expect(解析结局类型('乱写的', true)).toBe('shi_bai_hao_gan_du_gui_ling')
  })

  it('前后空格不影响解析', () => {
    expect(解析结局类型(' shi_bai_bei_qi_pian ', true)).toBe('shi_bai_bei_qi_pian')
    expect(解析结局类型(' 被渣型骗了 ', true)).toBe('shi_bai_bei_qi_pian')
  })
})

describe('胜负分组不因文案改版而错判', () => {
  it('全部枚举解析后分组与翻译键前缀一致', () => {
    for (const 结局 of 结局枚举列表) {
      const 中性 = fanYi.jieJu[结局]
      expect(解析结局类型(结局, true)).toBe(结局)
      expect(解析结局类型(中性, true)).toBe(结局)
      const 是胜利 = 结局.startsWith('sheng_li_')
      expect(解析结局类型(中性, true).startsWith('sheng_li')).toBe(是胜利)
    }
  })

  it('渣型骗了改性别文案后仍归入失败组', () => {
    const 解析 = 解析结局类型('被渣男骗了', true)
    expect(解析.startsWith('sheng_li')).toBe(false)
    expect(解析.startsWith('shi_bai')).toBe(true)
  })

  it('胜利-识破 的性别化文案仍归入胜利组', () => {
    const 解析 = 解析结局类型('识破渣女', false)
    expect(解析).toBe('sheng_li_shi_po')
    expect(解析.startsWith('sheng_li')).toBe(true)
  })

  it('历史进行中文案行未被封存时仍算进行中', () => {
    expect(解析结局类型('进行中', false)).toBe('jinxing_zhong')
  })
})
