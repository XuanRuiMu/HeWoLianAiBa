import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { changGuiXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import {
  huoQuDangAnLieBiao,
  huoQuDangAnXiangQing,
  shanChuDangAn,
  piLiangShanChuDangAn,
  type DangAnLieBiaoXiang,
  type DangAnXiangQing,
  type FuPanPiZhu,
  type FuPanShiJianXianTiaoMu,
} from '../services/战绩'
import { shengChengFuPan } from '../services/复盘'
import { huoQuJunShiJiLuLieBiao, type JunShiJiLuXiang } from '../services/军师缓存'

const luYou = Router()

interface QianDuanJunShiZhiDaoJiLu {
  shi_jian: string
  jiao_se_ming_zi: string
  jun_shi_ming_chen: string
  jian_yi: string
  dui_hua_zhai_yao: string
}

function zhuanHuanJunShiJiLu(ji_lu: JunShiJiLuXiang): QianDuanJunShiZhiDaoJiLu {
  return {
    shi_jian: ji_lu.shi_jian,
    jiao_se_ming_zi: ji_lu.jiao_se_ming_zi,
    jun_shi_ming_chen: ji_lu.jun_shi_ming_chen,
    jian_yi: ji_lu.jian_yi,
    dui_hua_zhai_yao: ji_lu.dui_hua_zhai_yao,
  }
}

interface QianDuanDangAnLieBiaoXiang {
  id: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  shi_fou_zha_xing: boolean
  jie_guo_lei_xing: string
  jie_guo_lei_xing_yuan: string
  shi_fou_feng_cun: boolean
  liao_tian_tian_shu: number
  xiao_xi_zong_shu: number
  chuang_jian_shi_jian: string
  zui_hou_xiao_xi_shi_jian: string | null
  you_xi_jie_shu_shi_jian: string | null
  mbti_lei_xing?: string
}

function guoLvMinGanZiDuanLieBiao(
  lie_biao: DangAnLieBiaoXiang[],
): QianDuanDangAnLieBiaoXiang[] {
  return lie_biao.map((dang_an) => ({
    id: dang_an.id,
    jiao_se_id: dang_an.jiao_se_id,
    jiao_se_ming_zi: dang_an.jiao_se_ming_zi,
    shi_fou_zha_xing: dang_an.shi_fou_zha_xing,
    jie_guo_lei_xing: dang_an.jie_guo_lei_xing,
    jie_guo_lei_xing_yuan: dang_an.jie_guo_lei_xing_yuan,
    shi_fou_feng_cun: dang_an.shi_fou_feng_cun,
    liao_tian_tian_shu: dang_an.liao_tian_tian_shu,
    xiao_xi_zong_shu: dang_an.xiao_xi_zong_shu,
    chuang_jian_shi_jian: dang_an.chuang_jian_shi_jian,
    zui_hou_xiao_xi_shi_jian: dang_an.zui_hou_xiao_xi_shi_jian,
    you_xi_jie_shu_shi_jian: dang_an.you_xi_jie_shu_shi_jian,
    mbti_lei_xing: dang_an.mbti_lei_xing,
  }))
}

interface QianDuanFuPanShiJianXianTiaoMu {
  shi_jian: string
  shi_jian_miao_shu: string
  yong_hu_xiao_xi?: string
  ai_hui_fu?: string
  ai_xin_li_huo_dong?: string
}

interface QianDuanFuPanPiZhu {
  xu_hao: number
  ping_lun: string
}

interface QianDuanDangAnXiangQing extends QianDuanDangAnLieBiaoXiang {
  fu_pan_shu_ju: QianDuanFuPanShiJianXianTiaoMu[] | null
  fu_pan_nei_rong?: string | null
  fu_pan_pi_zhu: QianDuanFuPanPiZhu[] | null
}

function guoLvFuPanShiJianXian(
  fu_pan_shu_ju: FuPanShiJianXianTiaoMu[] | null,
): QianDuanFuPanShiJianXianTiaoMu[] | null {
  if (!fu_pan_shu_ju) return null
  return fu_pan_shu_ju.map((tiao_mu) => ({
    shi_jian: tiao_mu.shi_jian,
    shi_jian_miao_shu: tiao_mu.shi_jian_miao_shu,
    yong_hu_xiao_xi: tiao_mu.yong_hu_xiao_xi,
    ai_hui_fu: tiao_mu.ai_hui_fu,
    ai_xin_li_huo_dong: tiao_mu.ai_xin_li_huo_dong,
  }))
}

function guoLvFuPanPiZhu(pi_zhu: FuPanPiZhu[] | null): QianDuanFuPanPiZhu[] | null {
  if (!pi_zhu) return null
  return pi_zhu.map((xiang) => ({ xu_hao: xiang.xu_hao, ping_lun: xiang.ping_lun }))
}

function guoLvMinGanZiDuanXiangQing(
  dang_an: DangAnXiangQing,
): QianDuanDangAnXiangQing {
  return {
    id: dang_an.id,
    jiao_se_id: dang_an.jiao_se_id,
    jiao_se_ming_zi: dang_an.jiao_se_ming_zi,
    shi_fou_zha_xing: dang_an.shi_fou_zha_xing,
    jie_guo_lei_xing: dang_an.jie_guo_lei_xing,
    jie_guo_lei_xing_yuan: dang_an.jie_guo_lei_xing_yuan,
    shi_fou_feng_cun: dang_an.shi_fou_feng_cun,
    liao_tian_tian_shu: dang_an.liao_tian_tian_shu,
    xiao_xi_zong_shu: dang_an.xiao_xi_zong_shu,
    chuang_jian_shi_jian: dang_an.chuang_jian_shi_jian,
    zui_hou_xiao_xi_shi_jian: dang_an.zui_hou_xiao_xi_shi_jian,
    you_xi_jie_shu_shi_jian: dang_an.you_xi_jie_shu_shi_jian,
    mbti_lei_xing: dang_an.mbti_lei_xing,
    fu_pan_shu_ju: guoLvFuPanShiJianXian(dang_an.fu_pan_shu_ju),
    fu_pan_nei_rong: dang_an.fu_pan_nei_rong,
    fu_pan_pi_zhu: guoLvFuPanPiZhu(dang_an.fu_pan_pi_zhu),
  }
}

luYou.get(
  '/列表',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    try {
      const lieBiao = await huoQuDangAnLieBiao(yongHu.yongHuId)
      return chengGongXiangYing(xiangYing, { dangAnLieBiao: guoLvMinGanZiDuanLieBiao(lieBiao) })
    } catch (cuoWu) {
      console.error('获取战绩列表失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/详情/:dangAnId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const dangAnId = String(qingQiu.params.dangAnId || '')
    if (!dangAnId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const dangAn = await huoQuDangAnXiangQing(yongHu.yongHuId, dangAnId)
      if (!dangAn) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }
      return chengGongXiangYing(xiangYing, guoLvMinGanZiDuanXiangQing(dangAn))
    } catch (cuoWu) {
      console.error('获取战绩详情失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.delete(
  '/:dangAnId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const dangAnId = String(qingQiu.params.dangAnId || '')
    if (!dangAnId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const chengGong = await shanChuDangAn(yongHu.yongHuId, dangAnId)
      if (!chengGong) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }
      return chengGongXiangYing(xiangYing, { cheng_gong: true })
    } catch (cuoWu) {
      console.error('删除战绩失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/批量删除',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const ids = qingQiu.body?.dangAnIds
    if (!Array.isArray(ids) || ids.length === 0) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }
    const youXiaoIds = ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (youXiaoIds.length === 0) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const shanChuIds = await piLiangShanChuDangAn(yongHu.yongHuId, youXiaoIds)
      return chengGongXiangYing(xiangYing, { cheng_gong: true, shan_chu_ids: shanChuIds })
    } catch (cuoWu) {
      console.error('批量删除战绩失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/复盘/:dangAnId',
  changGuiXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const dangAnId = String(qingQiu.params.dangAnId || '')
    if (!dangAnId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const dangAn = await huoQuDangAnXiangQing(yongHu.yongHuId, dangAnId)
      if (!dangAn) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }

      const qianDuanDangAn = guoLvMinGanZiDuanXiangQing(dangAn)
      const junShiJiLu = await huoQuJunShiJiLuLieBiao(yongHu.yongHuId, dangAn.jiao_se_id)
      const qianDuanJunShiJiLu = junShiJiLu.map(zhuanHuanJunShiJiLu)

      if (!dangAn.fu_pan_nei_rong) {
        void shengChengFuPan(yongHu.yongHuId, dangAn.jiao_se_id, dangAnId).catch((cuoWu) =>
          console.error('异步生成复盘失败', cuoWu),
        )
        return chengGongXiangYing(xiangYing, {
          fu_pan_nei_rong: null,
          fu_pan_shi_jian_xian: [],
          fu_pan_pi_zhu: null,
          jun_shi_zhi_dao_ji_lu: qianDuanJunShiJiLu,
          jia_zai_zhong: true,
        })
      }

      return chengGongXiangYing(xiangYing, {
        fu_pan_nei_rong: qianDuanDangAn.fu_pan_nei_rong,
        fu_pan_shi_jian_xian: qianDuanDangAn.fu_pan_shu_ju,
        fu_pan_pi_zhu: qianDuanDangAn.fu_pan_pi_zhu,
        jun_shi_zhi_dao_ji_lu: qianDuanJunShiJiLu,
        jia_zai_zhong: false,
      })
    } catch (cuoWu) {
      console.error('获取复盘失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
