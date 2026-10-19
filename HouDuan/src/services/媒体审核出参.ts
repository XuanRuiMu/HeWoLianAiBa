import {
  SHEN_HE_FU_WU_BU_KE_YONG_JIAN,
  SHEN_HE_WEI_GUI_LEI_BIE,
  SHEN_HE_XI_TONG_CUO_WU_JIAN,
} from '../config/媒体配置'
import { fanYi, huoQuFanYi, huoQuFanYiMiaoShu, type FanYiJian } from '../config/translations'
import { debug日志 } from '../utils/debug日志'

/** 媒体上传失败时回给玩家的出参三件套 */
export interface MeiTiShenHeChuCan {
  zhuangTaiMa: 400 | 403
  tiShi: string
  xuYaoJiWeiGui: boolean
}

const TU_PIAN_SHEN_HE_SHI_BAI = huoQuFanYi('liaoTian', 'tuPianShenHeShiBai')

/** 存储层遗留的「违规但类别未知」键：不在审核类别里，故单独占一档，仍按违规处理 */
const TU_PIAN_WEI_GUI_JIAN = 'tuPianWeiGui'

/**
 * MeiTiCunChuCuoWu.fanYiJian → 出参的唯一出口（五个上传站点共用，路由侧不得再自判类别）。
 *
 * fanYiJian 的取值集合由 services/媒体存储 决定：媒体校验键（liaoTian 段）∪ 视觉审核结论
 * （六大类别 + 审核服务不可用 + 系统错误）∪ 空串。任何落在集合外的值都按未知键兜底，
 * 既不外泄 undefined，也不把内部键名当文案回给玩家。
 */
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
  // 审核服务自身不可用不是用户的错：拦下文件（403）但不记违规
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
  // 图片读取失败（审核拿不到字节）：与审核服务不可用同口径 —— 不记违规，回通用审核失败文案
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
