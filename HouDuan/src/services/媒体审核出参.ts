import {
  ShenHeFuWuBuKeYongJian,
  ShenHeWeiGuiLeiBie,
  ShenHeXiTongCuoWuJian,
} from '../config/媒体配置'
import { fanYi, huoQuFanYi, huoQuFanYiMiaoShu, type FanYiJian } from '../config/translations'
import { debug日志 } from '../utils/debug日志'

export interface MeiTiShenHeChuCan {
  zhuangTaiMa: 400 | 403
  tiShi: string
  xuYaoJiWeiGui: boolean
}

const TuPianShenHeShiBai = huoQuFanYi('liaoTian', 'tuPianShenHeShiBai')

const TuPianWeiGuiJian = 'tuPianWeiGui'

export function panDingMeiTiShenHeChuCan(fanYiJian: string): MeiTiShenHeChuCan {
  if (ShenHeWeiGuiLeiBie.includes(fanYiJian)) {
    return {
      zhuangTaiMa: 403,
      tiShi: huoQuFanYiMiaoShu('liaoTian', 'tuPianWeiGui', {
        leiBie: huoQuFanYi('shenHeLeiBie', fanYiJian as FanYiJian<'shenHeLeiBie'>),
      }),
      xuYaoJiWeiGui: true,
    }
  }
  if (fanYiJian === ShenHeFuWuBuKeYongJian) {
    return {
      zhuangTaiMa: 403,
      tiShi: huoQuFanYi('shenHeLeiBie', ShenHeFuWuBuKeYongJian as FanYiJian<'shenHeLeiBie'>),
      xuYaoJiWeiGui: false,
    }
  }
  if (fanYiJian === TuPianWeiGuiJian) {
    return {
      zhuangTaiMa: 403,
      tiShi: huoQuFanYi('liaoTian', 'tuPianWeiGuiTongYong'),
      xuYaoJiWeiGui: true,
    }
  }
  if (fanYiJian === ShenHeXiTongCuoWuJian) {
    return { zhuangTaiMa: 400, tiShi: TuPianShenHeShiBai, xuYaoJiWeiGui: false }
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
  return { zhuangTaiMa: 400, tiShi: TuPianShenHeShiBai, xuYaoJiWeiGui: false }
}
