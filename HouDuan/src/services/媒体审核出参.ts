import {
  SHEN_HE_FU_WU_BU_KE_YONG_JIAN,
  SHEN_HE_WEI_GUI_LEI_BIE,
  SHEN_HE_XI_TONG_CUO_WU_JIAN,
} from '../config/媒体配置'
import { fanYi, huoQuFanYi, huoQuFanYiMiaoShu, type FanYiJian } from '../config/translations'
import { debug日志 } from '../utils/debug日志'

export interface MeiTiShenHeChuCan {
  zhuangTaiMa: 400 | 403
  tiShi: string
  xuYaoJiWeiGui: boolean
}

const TU_PIAN_SHEN_HE_SHI_BAI = huoQuFanYi('liaoTian', 'tuPianShenHeShiBai')

const TU_PIAN_WEI_GUI_JIAN = 'tuPianWeiGui'

export function panDingMeiTiShenHeChuCan(fanYiJian: string): MeiTiShenHeChuCan {
  if (SHEN_HE_WEI_GUI_LEI_BIE.includes(fanYiJian)) {
    return {
      zhuangTaiMa: 403,
      tiShi: huoQuFanYiMiaoShu('liaoTian', 'tuPianWeiGui', {
        leiBie: huoQuFanYi('shenHeLeiBie', fanYiJian as FanYiJian<'shenHeLeiBie'>),
      }),
      xuYaoJiWeiGui: true,
    }
  }
  if (fanYiJian === SHEN_HE_FU_WU_BU_KE_YONG_JIAN) {
    return {
      zhuangTaiMa: 403,
      tiShi: huoQuFanYi('shenHeLeiBie', SHEN_HE_FU_WU_BU_KE_YONG_JIAN as FanYiJian<'shenHeLeiBie'>),
      xuYaoJiWeiGui: false,
    }
  }
  if (fanYiJian === TU_PIAN_WEI_GUI_JIAN) {
    return {
      zhuangTaiMa: 403,
      tiShi: huoQuFanYi('liaoTian', 'tuPianWeiGuiTongYong'),
      xuYaoJiWeiGui: true,
    }
  }
  if (fanYiJian === SHEN_HE_XI_TONG_CUO_WU_JIAN) {
    return { zhuangTaiMa: 400, tiShi: TU_PIAN_SHEN_HE_SHI_BAI, xuYaoJiWeiGui: false }
  }
  if (Object.prototype.hasOwnProperty.call(fanYi.liaoTian, fanYiJian)) {
    return {
      zhuangTaiMa: 400,
      tiShi: (fanYi.liaoTian as Record<string, string>)[fanYiJian],
      xuYaoJiWeiGui: false,
    }
  }
  debug日志.warn('媒体审核出参', '收到未知审核错误键，回退通用审核失败文案', {
    xiang_qing: { fan_yi_jian: fanYiJian },
  })
  return { zhuangTaiMa: 400, tiShi: TU_PIAN_SHEN_HE_SHI_BAI, xuYaoJiWeiGui: false }
}
