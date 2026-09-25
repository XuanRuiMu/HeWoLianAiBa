import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import {
  shengChengJiaoSe,
  baoCunJiaoSe,
  qingXiRenSheDuiXiang,
  qingXiRenSheWenBen,
  type ShengChengJiaoSeJieGuo,
  type XinMuZhongDeTaZiDing,
} from '../services/角色生成'
import type { MBTILeiXing } from '../config/角色配置'
import { mbtiLieBiao } from '../config/角色配置'
import type { RenZhengQingQiu } from '../middleware/认证'
import { 性别验证中间件 } from '../middleware/输入验证'
import { 解析性别 } from '../utils/性别'
import {
  CUO_WU_DAI_MA,
  JiaoSeShengChengCuoWu,
} from '../config/错误码注册表'

const luYou = Router()

function chuLiJiaoSeCuoWu(
  xiangYing: Response,
  cuoWu: unknown,
  houTuiDaiMa: typeof CUO_WU_DAI_MA.ROLE_GENERATION_INITIALIZATION_FAILED | typeof CUO_WU_DAI_MA.ROLE_GENERATION_PERSISTENCE_FAILED,
): void {
  const daiMa = cuoWu instanceof JiaoSeShengChengCuoWu ? cuoWu.code : houTuiDaiMa
  debug日志.error('角色接口', '角色生成失败', { xiang_qing: { cuo_wu_ma: daiMa } })
  shiBaiXiangYing(xiangYing, 500, '', daiMa)
}

function jieXiZiFuChuan(
  body: Record<string, unknown>,
  jian: string,
  tianChongJian?: string,
): string | undefined {
  const zhi = body[jian]
  if (typeof zhi === 'string') return zhi
  if (tianChongJian && typeof body[tianChongJian] === 'string') return String(body[tianChongJian])
  return undefined
}

function jieXiBuErZhi(body: Record<string, unknown>, jian: string, tianChongJian?: string): boolean {
  const zhi = body[jian]
  if (typeof zhi === 'boolean') return zhi
  if (tianChongJian && typeof body[tianChongJian] === 'boolean') return Boolean(body[tianChongJian])
  if (typeof zhi === 'string') return zhi === 'true'
  return false
}

function yanZhengMbti(zhi: string): zhi is MBTILeiXing {
  return mbtiLieBiao.includes(zhi as MBTILeiXing)
}

/** 「心目中的TA」文本字段清洗与长度上限（三框+通用提示词，旧职业城市家乡身份字段已删） */
const XIN_MU_ZHONG_DE_TA_WEN_BEN_XIAN_ZHI: Record<string, number> = {
  wei_xin_ming: 30,
  zhen_shi_ming: 20,
}

const TONG_YONG_TI_SHI_CI_ZUI_DA_CHANG_DU = 500
const NIAN_LING_ZUI_XIAO_ZHI = 0
const NIAN_LING_ZUI_DA_ZHI = 100

function jieXiXinMuZhongDeTa(
  zhi: unknown,
): { cheng_gong: true; shu_ju: XinMuZhongDeTaZiDing | null } | { cheng_gong: false; cuo_wu: string } {
  if (zhi === undefined || zhi === null) return { cheng_gong: true, shu_ju: null }
  if (typeof zhi !== 'object' || Array.isArray(zhi)) {
    return { cheng_gong: false, cuo_wu: huoQuFanYi('tongYong', 'queShaoCanShu') }
  }

  const yuan = zhi as Record<string, unknown>
  const jieGuo: XinMuZhongDeTaZiDing = {}

  for (const [jian, xianZhi] of Object.entries(XIN_MU_ZHONG_DE_TA_WEN_BEN_XIAN_ZHI)) {
    const zhi = yuan[jian]
    if (zhi === undefined || zhi === null || zhi === '') continue
    if (typeof zhi !== 'string') {
      return { cheng_gong: false, cuo_wu: huoQuFanYi('tongYong', 'queShaoCanShu') }
    }
    const qingXiHou = qingXiRenSheWenBen(zhi.trim())
    if (!qingXiHou) continue
    if (qingXiHou.length > xianZhi) {
      return { cheng_gong: false, cuo_wu: huoQuFanYi('tongYong', 'queShaoCanShu') }
    }
    ;(jieGuo as Record<string, string>)[jian] = qingXiHou
  }

  if (yuan.nian_ling !== undefined && yuan.nian_ling !== null && yuan.nian_ling !== '') {
    const shu = Number(String(yuan.nian_ling).trim())
    if (Number.isFinite(shu)) {
      jieGuo.nian_ling = Math.max(NIAN_LING_ZUI_XIAO_ZHI, Math.min(NIAN_LING_ZUI_DA_ZHI, Math.round(shu)))
    }
  }

  if (yuan.tong_yong_ti_shi_ci !== undefined && yuan.tong_yong_ti_shi_ci !== null && yuan.tong_yong_ti_shi_ci !== '') {
    if (typeof yuan.tong_yong_ti_shi_ci !== 'string') {
      return { cheng_gong: false, cuo_wu: huoQuFanYi('tongYong', 'queShaoCanShu') }
    }
    const yuanWenBen = yuan.tong_yong_ti_shi_ci.trim()
    if (yuanWenBen.length > TONG_YONG_TI_SHI_CI_ZUI_DA_CHANG_DU) {
      return { cheng_gong: false, cuo_wu: huoQuFanYi('tongYong', 'queShaoCanShu') }
    }
    const qingXiHou = qingXiRenSheWenBen(yuanWenBen)
    if (qingXiHou) {
      jieGuo.tong_yong_ti_shi_ci = qingXiHou
    }
  }

  return { cheng_gong: true, shu_ju: jieGuo }
}

luYou.post('/MBTI生成', 性别验证中间件, (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED)
  }

  const body = qingQiu.body as Record<string, unknown>
  const xingBie = jieXiZiFuChuan(body, '性别', 'xing_bie')
  const muBiaoXingBie = jieXiZiFuChuan(body, '目标性别', 'mu_biao_xing_bie')
  const mbtiLeiXing = jieXiZiFuChuan(body, 'mbti类型', 'mbti_lei_xing')
  const shiFouZhaXing = jieXiBuErZhi(body, '渣男渣女变体', 'shi_fou_zha_xing')
  const suiJiXingGe = jieXiBuErZhi(body, '随机性格', 'sui_ji_xing_ge')

  // FP-13：入参性别经唯一解析入口归一为内部规范形态，六种写法全收
  const zhengLiXingBie = 解析性别(xingBie)
  if (!zhengLiXingBie) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.ROLE_GENERATION_INPUT_INVALID)
  }

  const zhengLiMuBiaoXingBie = 解析性别(muBiaoXingBie) ?? undefined

  const xinMuZhongDeTaJieXi = jieXiXinMuZhongDeTa(body.xinMuZhongDeTa)
  if (!xinMuZhongDeTaJieXi.cheng_gong) {
    return shiBaiXiangYing(xiangYing, 400, xinMuZhongDeTaJieXi.cuo_wu, CUO_WU_DAI_MA.ROLE_GENERATION_INPUT_INVALID)
  }

  try {
    const jiaoSe = shengChengJiaoSe({
      yong_hu_id: yongHu.yongHuId,
      xing_bie: zhengLiXingBie,
      mu_biao_xing_bie: zhengLiMuBiaoXingBie || null,
      mbti_lei_xing: mbtiLeiXing && yanZhengMbti(mbtiLeiXing) ? mbtiLeiXing : null,
      shi_fou_zha_xing: shiFouZhaXing,
      sui_ji_xing_ge: suiJiXingGe,
      xin_mu_zhong_de_ta: xinMuZhongDeTaJieXi.shu_ju,
    })
    return chengGongXiangYing(xiangYing, jiaoSe)
  } catch (cuoWu) {
    chuLiJiaoSeCuoWu(xiangYing, cuoWu, CUO_WU_DAI_MA.ROLE_GENERATION_INITIALIZATION_FAILED)
    return
  }
})

luYou.post('/确认', async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED)
  }

  const body = qingQiu.body as Record<string, unknown>
  const xuanZhongJiaoSe = body.xuanZhongJiaoSe as ShengChengJiaoSeJieGuo | undefined

  if (!xuanZhongJiaoSe || typeof xuanZhongJiaoSe !== 'object') {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CUO_WU_DAI_MA.ROLE_GENERATION_INPUT_INVALID)
  }

  try {
    // R3 提示注入防护：客户端提交的角色对象在入库前按白名单重建并清洗文本字段
    const xiZhengHouJiaoSe = qingXiRenSheDuiXiang(
      xuanZhongJiaoSe as unknown as Record<string, unknown>,
    ) as unknown as ShengChengJiaoSeJieGuo
    const baoCunHou = await baoCunJiaoSe(yongHu.yongHuId, xiZhengHouJiaoSe)
    return chengGongXiangYing(xiangYing, baoCunHou)
  } catch (cuoWu) {
    chuLiJiaoSeCuoWu(xiangYing, cuoWu, CUO_WU_DAI_MA.ROLE_GENERATION_PERSISTENCE_FAILED)
    return
  }
})

export default luYou
