import { afterEach, describe, expect, it } from 'vitest'
import { SHEN_HE_MO_SHI_BEN_DI, quShenHeMoShi } from '../../config/媒体配置'
import { shenHeTuPianAnQuan } from '../DeepSeek视觉审核'

const YuanShiMoShi = process.env.MEI_TI_SHEN_HE_MO_SHI

afterEach(() => {
  if (YuanShiMoShi === undefined) delete process.env.MEI_TI_SHEN_HE_MO_SHI
  else process.env.MEI_TI_SHEN_HE_MO_SHI = YuanShiMoShi
})

describe('视觉审核模式解析', () => {
  it('未配置时默认走外部审核', () => {
    delete process.env.MEI_TI_SHEN_HE_MO_SHI
    expect(quShenHeMoShi()).toBe('ai')
  })

  it('配置 local 或 本地 时只做本地校验', () => {
    process.env.MEI_TI_SHEN_HE_MO_SHI = 'local'
    expect(quShenHeMoShi()).toBe(SHEN_HE_MO_SHI_BEN_DI)
    process.env.MEI_TI_SHEN_HE_MO_SHI = '本地'
    expect(quShenHeMoShi()).toBe(SHEN_HE_MO_SHI_BEN_DI)
  })

  it('其它取值一律回落外部审核，非法值不放宽', () => {
    process.env.MEI_TI_SHEN_HE_MO_SHI = 'none'
    expect(quShenHeMoShi()).toBe('ai')
  })
})

describe('视觉审核模式行为', () => {
  it('本地模式不读文件不外呼直接放行', async () => {
    process.env.MEI_TI_SHEN_HE_MO_SHI = 'local'
    const jieGuo = await shenHeTuPianAnQuan('绝对不存在的路径/图片.png')
    expect(jieGuo.wei_gui).toBe(false)
    expect(jieGuo.lei_xing).toBe('')
  })

  it('外部模式对读不到的图片仍然安全拦截', async () => {
    process.env.MEI_TI_SHEN_HE_MO_SHI = 'ai'
    const jieGuo = await shenHeTuPianAnQuan('绝对不存在的路径/图片.png')
    expect(jieGuo.wei_gui).toBe(true)
  })
})
