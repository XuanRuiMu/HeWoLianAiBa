import { describe, it, expect } from 'vitest'
import { jianCeWeiJiXinHao } from '../安全审核'
import { huoQuFanYi } from '../../config/translations'

describe('危机干预根因', () => {
  it('危机关键词命中转人工援助热线', () => {
    const 结果 = jianCeWeiJiXinHao('我最近总想自杀，很难受')
    expect(结果).not.toBeNull()
    expect(结果?.wei_ji).toBe(true)
    expect(结果?.yuan_zhu_re_xian).toBeTruthy()
    expect(结果?.ti_shi).toBe(huoQuFanYi('anQuan', 'weiJiGanYuTiShi'))
  })

  it('普通消息不命中', () => {
    expect(jianCeWeiJiXinHao('今天天气真好')).toBeNull()
    expect(jianCeWeiJiXinHao('')).toBeNull()
  })

  it('超时提醒文案走翻译文件', () => {
    expect(huoQuFanYi('anQuan', 'weiJiChaoShiTiXing')).toBeTruthy()
  })
})
