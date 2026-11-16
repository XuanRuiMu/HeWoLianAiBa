import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { changGuiXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import type { JunShiZhiDaoFenDuan } from '../types'
import {
  huoQuDangAnLieBiao,
  huoQu档案详情,
  shanChuDangAn,
  piLiangShanChuDangAn,
  chuangJianZhanJiFenLei,
  gengMingZhanJiFenLei,
  shanChuZhanJiFenLei,
  yiDongDangAnDaoFenLei,
  paiXuFenLeiNeiZhanJi,
  huoQuZhanJiFenLeiLieBiao,
  sheZhiMoRenZhanJiFenLei,
  baoCunFenLeiPaiXu,
  ZhanJiFenLeiCuoWu,
  type 档案列表项,
  type 档案详情,
  type 复盘批注,
  type 复盘时间线条目,
  type 战绩最后消息,
} from '../services/战绩'
import { huoQuFuPanYouXiaoXiaoXiShu, shengChengFuPan, 复盘状态 } from '../services/复盘'
import { huoQuJunShiJiLuLieBiao, type 军师记录项 } from '../services/军师缓存'
import { 执行落库后副作用 } from '../utils/落库后副作用'
import { yanZhengUUID } from '../utils/验证'
import { CuoWuDaiMa, shiCuoWuDaiMa } from '../config/错误码注册表'
import { ZhanJiPeiZhi } from '../config/战绩配置'
import { xiaoChuShuZhiXieLu } from '../utils/数值泄露过滤'
import { jiaoSeBianHaoBiao } from '../services/公开编号'

const luYou = Router()

const ZhanJiPiLiangShanChuZuiDa = 50

function chuLiZhanJiCuoWu(xiangYing: Response, caoZuo: string, cuoWu: unknown): void {
  if (cuoWu instanceof ZhanJiFenLeiCuoWu) {
    shiBaiXiangYing(xiangYing, cuoWu.zhuangTaiMa, '', cuoWu.code)
    return
  }
  if (cuoWu instanceof Error && shiCuoWuDaiMa(cuoWu.message)) {
    shiBaiXiangYing(xiangYing, 400, '', cuoWu.message)
    return
  }
  const shuJuKuDaiMa = (cuoWu as { code?: string }).code
  if (shuJuKuDaiMa && ['23503', '23505', '23514', '40001', '40P01'].includes(shuJuKuDaiMa)) {
    shiBaiXiangYing(
      xiangYing,
      409,
      huoQuFanYi('zhanJi', 'fenLeiShuJuYiBianHua'),
      CuoWuDaiMa.ZHAN_JI_SHU_JU_BIAN_HUA,
    )
    return
  }
  debug日志.error('战绩接口', caoZuo, { xiang_qing: { cuo_wu: String(cuoWu) } })
  shiBaiXiangYing(xiangYing, 503, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'), CuoWuDaiMa.DATABASE_ERROR)
}

interface QianDuanJunShiZhiDaoJiLu {
  shi_jian: string
  jiao_se_ming_zi: string
  jun_shi_ming_chen: string
  jian_yi: string
  jian_yi_fen_duan: JunShiZhiDaoFenDuan | null
  dui_hua_zhai_yao: string
}

function zhuanHuanJunShiJiLu(ji_lu: 军师记录项): QianDuanJunShiZhiDaoJiLu {
  return {
    shi_jian: ji_lu.shi_jian,
    jiao_se_ming_zi: ji_lu.jiao_se_ming_zi,
    jun_shi_ming_chen: ji_lu.jun_shi_ming_chen,
    jian_yi: ji_lu.jian_yi,
    jian_yi_fen_duan: ji_lu.jian_yi_fen_duan ?? null,
    dui_hua_zhai_yao: ji_lu.dui_hua_zhai_yao,
  }
}

interface QianDuan档案列表项 {
  id: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  shi_fou_zha_xing?: boolean
  tou_xiang_biao_ji: string
  jie_guo_lei_xing: string
  jie_guo_lei_xing_yuan: string
  shi_fou_feng_cun: boolean
  liao_tian_tian_shu: number
  xiao_xi_zong_shu: number
  chuang_jian_shi_jian: string
  zui_hou_xiao_xi_shi_jian: string | null
  you_xi_jie_shu_shi_jian: string | null
  mbti_lei_xing?: string
  sui_ji_xing_ge?: boolean
  category_id: string
  sort_order: number
  zui_hou_liang_tiao: 战绩最后消息[]
}

function guoLvZuiHouLiangTiao(
  lie_biao: 战绩最后消息[] | null | undefined,
): 战绩最后消息[] {
  if (!Array.isArray(lie_biao)) return []
  return lie_biao
    .filter(
      (tiao) =>
        tiao !== null &&
        typeof tiao === 'object' &&
        typeof (tiao as { shi_jian?: unknown }).shi_jian === 'string' &&
        typeof (tiao as { zhai_yao?: unknown }).zhai_yao === 'string',
    )
    .slice(-2)
    .map((tiao) => ({
      shi_jian: tiao.shi_jian,
      fa_song_zhe: tiao.fa_song_zhe === 'yonghu' ? 'yonghu' : 'jiaose',
      zhai_yao: Array.from(tiao.zhai_yao).slice(0, ZhanJiPeiZhi.zhaiYaoZuiDaMaDian).join(''),
    }))
}

function guoLvMinGanZiDuanLieBiao(
  lie_biao: 档案列表项[],
  bianHaoBiao?: Map<string, string>,
): QianDuan档案列表项[] {
  return lie_biao.map((dang_an) => ({
    id: dang_an.id,
    jiao_se_id: bianHaoBiao?.get(dang_an.jiao_se_id) ?? dang_an.jiao_se_id,
    jiao_se_ming_zi: dang_an.jiao_se_ming_zi,
    shi_fou_zha_xing: dang_an.shi_fou_zha_xing,
    tou_xiang_biao_ji: dang_an.tou_xiang_biao_ji,
    jie_guo_lei_xing: dang_an.jie_guo_lei_xing,
    jie_guo_lei_xing_yuan: dang_an.jie_guo_lei_xing_yuan,
    shi_fou_feng_cun: dang_an.shi_fou_feng_cun,
    liao_tian_tian_shu: dang_an.liao_tian_tian_shu,
    xiao_xi_zong_shu: dang_an.xiao_xi_zong_shu,
    chuang_jian_shi_jian: dang_an.chuang_jian_shi_jian,
    zui_hou_xiao_xi_shi_jian: dang_an.zui_hou_xiao_xi_shi_jian,
    you_xi_jie_shu_shi_jian: dang_an.you_xi_jie_shu_shi_jian,
    mbti_lei_xing: dang_an.mbti_lei_xing,
    sui_ji_xing_ge: dang_an.sui_ji_xing_ge,
    category_id: dang_an.category_id,
    sort_order: dang_an.sort_order,
    zui_hou_liang_tiao: guoLvZuiHouLiangTiao(dang_an.zui_hou_liang_tiao),
  }))
}

interface QianDuan复盘时间线条目 {
  shi_jian: string
  shi_jian_miao_shu: string
  yong_hu_xiao_xi?: string
  ai_hui_fu?: string
  ai_xin_li_huo_dong?: string
}

interface QianDuan复盘批注 {
  xu_hao: number
  ping_lun: string
  qing_gan?: string
}

interface QianDuan档案详情 extends QianDuan档案列表项 {
  fu_pan_shu_ju: QianDuan复盘时间线条目[] | null
  fu_pan_nei_rong?: string | null
  fu_pan_pi_zhu: QianDuan复盘批注[] | null
  jun_shi_zhi_dao_ji_lu: QianDuanJunShiZhiDaoJiLu[]
}

function guoLvFuPanShiJianXian(
  fu_pan_shu_ju: 复盘时间线条目[] | null,
): QianDuan复盘时间线条目[] | null {
  if (!fu_pan_shu_ju) return null
  return fu_pan_shu_ju.map((tiao_mu) => ({
    shi_jian: tiao_mu.shi_jian,
    shi_jian_miao_shu: tiao_mu.shi_jian_miao_shu,
    yong_hu_xiao_xi: tiao_mu.yong_hu_xiao_xi,
    ai_hui_fu: tiao_mu.ai_hui_fu,
    ai_xin_li_huo_dong: tiao_mu.ai_xin_li_huo_dong,
  }))
}

function guoLv复盘批注(pi_zhu: 复盘批注[] | null): QianDuan复盘批注[] | null {
  if (!pi_zhu) return null
  return pi_zhu.map((xiang) => {
    const tiaoMu: QianDuan复盘批注 = {
      xu_hao: xiang.xu_hao,
      ping_lun: xiaoChuShuZhiXieLu(xiang.ping_lun),
    }
    const qingGan = xiang.qing_gan ? xiaoChuShuZhiXieLu(xiang.qing_gan) : ''
    if (qingGan) {
      tiaoMu.qing_gan = qingGan
    }
    return tiaoMu
  })
}

export function guoLvMinGanZiDuanXiangQing(
  dang_an: 档案详情,
  bianHaoBiao?: Map<string, string>,
): QianDuan档案详情 {
  const junShiJiLu = dang_an.jun_shi_ji_lu || []
  return {
    id: dang_an.id,
    jiao_se_id: bianHaoBiao?.get(dang_an.jiao_se_id) ?? dang_an.jiao_se_id,
    jiao_se_ming_zi: dang_an.jiao_se_ming_zi,
    shi_fou_zha_xing: dang_an.shi_fou_zha_xing,
    tou_xiang_biao_ji: dang_an.tou_xiang_biao_ji,
    jie_guo_lei_xing: dang_an.jie_guo_lei_xing,
    jie_guo_lei_xing_yuan: dang_an.jie_guo_lei_xing_yuan,
    shi_fou_feng_cun: dang_an.shi_fou_feng_cun,
    liao_tian_tian_shu: dang_an.liao_tian_tian_shu,
    xiao_xi_zong_shu: dang_an.xiao_xi_zong_shu,
    chuang_jian_shi_jian: dang_an.chuang_jian_shi_jian,
    zui_hou_xiao_xi_shi_jian: dang_an.zui_hou_xiao_xi_shi_jian,
    you_xi_jie_shu_shi_jian: dang_an.you_xi_jie_shu_shi_jian,
    mbti_lei_xing: dang_an.mbti_lei_xing,
    sui_ji_xing_ge: dang_an.sui_ji_xing_ge,
    category_id: dang_an.category_id,
    sort_order: dang_an.sort_order,
    zui_hou_liang_tiao: guoLvZuiHouLiangTiao(dang_an.zui_hou_liang_tiao),
    fu_pan_shu_ju: guoLvFuPanShiJianXian(dang_an.fu_pan_shu_ju),
    fu_pan_nei_rong: dang_an.fu_pan_nei_rong ? xiaoChuShuZhiXieLu(dang_an.fu_pan_nei_rong) : dang_an.fu_pan_nei_rong ?? null,
    fu_pan_pi_zhu: guoLv复盘批注(dang_an.fu_pan_pi_zhu),
    jun_shi_zhi_dao_ji_lu: junShiJiLu.map(zhuanHuanJunShiJiLu),
  }
}

luYou.get(
  '/分类',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }
    try {
      const lieBiao = await huoQuZhanJiFenLeiLieBiao(yongHu.用户ID)
      return chengGongXiangYing(xiangYing, lieBiao)
    } catch (cuoWu) {
      return chuLiZhanJiCuoWu(xiangYing, '查询战绩分类失败', cuoWu)
    }
  },
)

luYou.put(
  '/分类/排序',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }
    const categoryIds = qingQiu.body?.categoryIds
    if (
      !Array.isArray(categoryIds) ||
      !categoryIds.every((id) => typeof id === 'string' && yanZhengUUID(id))
    ) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }
    try {
      const jieGuo = await baoCunFenLeiPaiXu(yongHu.用户ID, categoryIds)
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      return chuLiZhanJiCuoWu(xiangYing, '保存战绩分类排序失败', cuoWu)
    }
  },
)

luYou.put(
  '/分类/:fenLeiId/默认',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }
    const fenLeiId = String(qingQiu.params.fenLeiId || '')
    const expectedVersion = qingQiu.body?.expectedVersion
    if (!yanZhengUUID(fenLeiId) || !Number.isSafeInteger(expectedVersion) || Number(expectedVersion) < 0) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }
    try {
      const fenLei = await sheZhiMoRenZhanJiFenLei(yongHu.用户ID, fenLeiId, expectedVersion)
      return chengGongXiangYing(xiangYing, fenLei)
    } catch (cuoWu) {
      return chuLiZhanJiCuoWu(xiangYing, '设置默认战绩分类失败', cuoWu)
    }
  },
)

luYou.post(
  '/分类',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }
    try {
      const fenLei = await chuangJianZhanJiFenLei(yongHu.用户ID, qingQiu.body?.mingCheng)
      return chengGongXiangYing(xiangYing, fenLei)
    } catch (cuoWu) {
      return chuLiZhanJiCuoWu(xiangYing, '创建战绩分类失败', cuoWu)
    }
  },
)

luYou.put(
  '/分类/:fenLeiId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }
    const fenLeiId = String(qingQiu.params.fenLeiId || '')
    const expectedVersion = qingQiu.body?.expectedVersion
    if (!yanZhengUUID(fenLeiId) || !Number.isSafeInteger(expectedVersion) || Number(expectedVersion) < 0) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }
    try {
      const fenLei = await gengMingZhanJiFenLei(
        yongHu.用户ID,
        fenLeiId,
        qingQiu.body?.mingCheng,
        expectedVersion,
      )
      return chengGongXiangYing(xiangYing, fenLei)
    } catch (cuoWu) {
      return chuLiZhanJiCuoWu(xiangYing, '修改战绩分类失败', cuoWu)
    }
  },
)

luYou.get(
  '/列表',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }

    const fenLeiCanShu = qingQiu.query?.categoryId
    if (fenLeiCanShu !== undefined && !yanZhengUUID(fenLeiCanShu)) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }

    try {
      const lieBiao = await huoQuDangAnLieBiao(
        yongHu.用户ID,
        typeof fenLeiCanShu === 'string' ? fenLeiCanShu : undefined,
      )
      return chengGongXiangYing(xiangYing, {
        dangAnLieBiao: guoLvMinGanZiDuanLieBiao(lieBiao, await jiaoSeBianHaoBiao(yongHu.用户ID)),
      })
    } catch (cuoWu) {
      return chuLiZhanJiCuoWu(xiangYing, '获取战绩列表失败', cuoWu)
    }
  },
)

luYou.get(
  '/详情/:dangAnId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }

    const dangAnId = String(qingQiu.params.dangAnId || '')
    if (!dangAnId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CuoWuDaiMa.REQUEST_MISSING_PARAMETER)
    }

    try {
      const dangAn = await huoQu档案详情(yongHu.用户ID, dangAnId)
      if (!dangAn) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'), CuoWuDaiMa.RESOURCE_NOT_FOUND)
      }
      return chengGongXiangYing(
        xiangYing,
        guoLvMinGanZiDuanXiangQing(dangAn, await jiaoSeBianHaoBiao(yongHu.用户ID)),
      )
    } catch (cuoWu) {
      debug日志.error('战绩接口', '获取战绩详情失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 503, '', CuoWuDaiMa.DATABASE_ERROR)
    }
  },
)

luYou.put(
  '/分类/:fenLeiId/排序',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }
    const fenLeiId = String(qingQiu.params.fenLeiId || '')
    const recordIds = qingQiu.body?.recordIds
    const expectedVersion = qingQiu.body?.expectedVersion
    if (
      !yanZhengUUID(fenLeiId) ||
      !Array.isArray(recordIds) ||
      !recordIds.every((id) => yanZhengUUID(id)) ||
      !Number.isSafeInteger(expectedVersion) ||
      Number(expectedVersion) < 0
    ) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }
    try {
      const jieGuo = await paiXuFenLeiNeiZhanJi(
        yongHu.用户ID,
        fenLeiId,
        recordIds,
        expectedVersion,
      )
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      return chuLiZhanJiCuoWu(xiangYing, '保存战绩分类排序失败', cuoWu)
    }
  },
)

luYou.put(
  '/分类/:fenLeiId/记录/:dangAnId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }
    const fenLeiId = String(qingQiu.params.fenLeiId || '')
    const dangAnId = String(qingQiu.params.dangAnId || '')
    const mubiaoFenLeiId = String(qingQiu.body?.targetCategoryId || '')
    const expectedVersion = qingQiu.body?.expectedVersion
    if (
      !yanZhengUUID(fenLeiId) ||
      !yanZhengUUID(dangAnId) ||
      !yanZhengUUID(mubiaoFenLeiId) ||
      !Number.isSafeInteger(expectedVersion) ||
      Number(expectedVersion) < 0
    ) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }
    try {
      const jieGuo = await yiDongDangAnDaoFenLei(
        yongHu.用户ID,
        fenLeiId,
        dangAnId,
        mubiaoFenLeiId,
        expectedVersion,
      )
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      return chuLiZhanJiCuoWu(xiangYing, '移动战绩分类失败', cuoWu)
    }
  },
)

luYou.delete(
  '/分类/:fenLeiId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }
    const fenLeiId = String(qingQiu.params.fenLeiId || '')
    const banBenCanShu = qingQiu.query?.expectedVersion
    const yuBenBanBen =
      typeof banBenCanShu === 'string' && /^\d+$/.test(banBenCanShu)
        ? Number(banBenCanShu)
        : Number.NaN
    if (!yanZhengUUID(fenLeiId) || !Number.isSafeInteger(yuBenBanBen) || yuBenBanBen < 0) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }
    try {
      const jieGuo = await shanChuZhanJiFenLei(yongHu.用户ID, fenLeiId, yuBenBanBen)
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      return chuLiZhanJiCuoWu(xiangYing, '删除战绩分类失败', cuoWu)
    }
  },
)

luYou.delete(
  '/:dangAnId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }

    const dangAnId = String(qingQiu.params.dangAnId || '')
    if (!dangAnId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CuoWuDaiMa.REQUEST_MISSING_PARAMETER)
    }

    try {
      const chengGong = await shanChuDangAn(yongHu.用户ID, dangAnId)
      if (!chengGong) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'), CuoWuDaiMa.RESOURCE_NOT_FOUND)
      }
      return chengGongXiangYing(xiangYing, { cheng_gong: true })
    } catch (cuoWu) {
      debug日志.error('战绩接口', '删除战绩失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 503, '', CuoWuDaiMa.DATABASE_ERROR)
    }
  },
)

luYou.post(
  '/批量删除',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }

    const bianHaoLieBiao = qingQiu.body?.dangAnIds
    if (!Array.isArray(bianHaoLieBiao) || bianHaoLieBiao.length === 0) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CuoWuDaiMa.REQUEST_MISSING_PARAMETER)
    }
    if (bianHaoLieBiao.length > ZhanJiPiLiangShanChuZuiDa) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }
    const youXiaoIds = bianHaoLieBiao.filter((id): id is string => yanZhengUUID(id))
    if (youXiaoIds.length !== bianHaoLieBiao.length) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    }

    try {
      const shanChuIds = await piLiangShanChuDangAn(yongHu.用户ID, youXiaoIds)
      return chengGongXiangYing(xiangYing, { cheng_gong: true, shan_chu_ids: shanChuIds })
    } catch (cuoWu) {
      debug日志.error('战绩接口', '批量删除战绩失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 503, '', CuoWuDaiMa.DATABASE_ERROR)
    }
  },
)

luYou.get(
  '/复盘/:dangAnId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), CuoWuDaiMa.AUTHENTICATION_REQUIRED)
    }

    const dangAnId = String(qingQiu.params.dangAnId || '')
    if (!dangAnId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), CuoWuDaiMa.REQUEST_MISSING_PARAMETER)
    }

    try {
      const dangAn = await huoQu档案详情(yongHu.用户ID, dangAnId)
      if (!dangAn) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'), CuoWuDaiMa.RESOURCE_NOT_FOUND)
      }

      const youXiaoXiaoXiShu = await huoQuFuPanYouXiaoXiaoXiShu(yongHu.用户ID, dangAn.jiao_se_id)
      const youHuanCunFuPan = Boolean(dangAn.fu_pan_nei_rong)
      const liShiCunZaiLiaoTian = dangAn.xiao_xi_zong_shu > 0
      if (youXiaoXiaoXiShu === 0 && !(youHuanCunFuPan && liShiCunZaiLiaoTian)) {
        return chengGongXiangYing(xiangYing, {
          fu_pan_nei_rong: null,
          fu_pan_shi_jian_xian: [],
          fu_pan_pi_zhu: null,
          jun_shi_zhi_dao_ji_lu: [],
          jia_zai_zhong: false,
          fu_pan_zhuang_tai: 复盘状态.无聊天记录,
        })
      }

      const qianDuanDangAn = guoLvMinGanZiDuanXiangQing(dangAn, await jiaoSeBianHaoBiao(yongHu.用户ID))
      const junShiJiLu = await huoQuJunShiJiLuLieBiao(yongHu.用户ID, dangAn.jiao_se_id)
      const qianDuanJunShiJiLu = junShiJiLu.map(zhuanHuanJunShiJiLu)

      if (!dangAn.fu_pan_nei_rong) {
        执行落库后副作用(
          '异步生成复盘',
          () => shengChengFuPan(yongHu.用户ID, dangAn.jiao_se_id, dangAnId),
          { yong_hu_id: yongHu.用户ID, jiao_se_id: dangAn.jiao_se_id },
        )
        return chengGongXiangYing(xiangYing, {
          fu_pan_nei_rong: null,
          fu_pan_shi_jian_xian: [],
          fu_pan_pi_zhu: null,
          jun_shi_zhi_dao_ji_lu: qianDuanJunShiJiLu,
          jia_zai_zhong: true,
          fu_pan_zhuang_tai: 复盘状态.生成中,
        })
      }

      return chengGongXiangYing(xiangYing, {
        fu_pan_nei_rong: qianDuanDangAn.fu_pan_nei_rong,
        fu_pan_shi_jian_xian: qianDuanDangAn.fu_pan_shu_ju,
        fu_pan_pi_zhu: qianDuanDangAn.fu_pan_pi_zhu,
        jun_shi_zhi_dao_ji_lu: qianDuanJunShiJiLu,
        jia_zai_zhong: false,
        fu_pan_zhuang_tai: 复盘状态.已完成,
      })
    } catch (cuoWu) {
      debug日志.error('战绩接口', '获取复盘失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return shiBaiXiangYing(xiangYing, 503, '', CuoWuDaiMa.DATABASE_ERROR)
    }
  },
)

export default luYou