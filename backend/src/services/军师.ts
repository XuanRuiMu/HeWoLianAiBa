import { 数据库 } from '../数据库'
import { JUN_SHI_PEI_ZHI, JUN_SHI_PEI_ZHI_MO_REN, JUN_SHI_QIU_ZHU_PEI_ZHI } from '../config/军师配置'
import { huoQuFanYi } from '../config/translations'
import { huoQuWanZhengHaoGanDu } from './好感度'
import { huoQuFuPanTiaoMuLieBiao } from './复盘条目'
import { huoQuXiaoXiLieBiao, huoQuJiaoSeSuoYouZhe } from './消息'
import { shengChengJunShiZhiDao } from './军师求助'
import {
  jiSuanLiaoTianHaXi,
  jianChaJunShiChongFu,
  baoCunJunShiHaXi,
  baoCunJunShiJiLu,
  huoQuJunShiJiLuLieBiao,
  sheZhiJunShiZhiDaoZhuangTai,
  huoQuJunShiZhiDaoZhuangTai,
  shanChuJunShiZhiDaoZhuangTai,
  type JunShiJiLuXiang,
  type JunShiJiLuLiaoTianXiaoXi,
  type JunShiZhiDaoZhuangTaiXinXi,
} from './军师缓存'
import { jiLuJunShiQiuZhu } from '../utils/debug日志'
import type { HaoGanDuXinXi } from '../types'

export interface JunShiLieBiaoXiangYing {
  junShiLieBiao: {
    id: string
    mingCheng: string
    fuBiaoTi: string
    biaoQian: string
    miaoShu: string
    touXiang: string
  }[]
}

export interface JunShiZhiDaoCanShu {
  yong_hu_id: string
  jiao_se_id: string
  jun_shi_id?: string
}

export interface JunShiZhiDaoJieGuo {
  junShi: {
    id: string
    mingCheng: string
    fuBiaoTi: string
    biaoQian: string
    miaoShu: string
    touXiang: string
  }
  zhiDaoNeiRong: string
  shiJian: string
}

export interface JunShiJiLuXiangYing {
  jiLuLieBiao: JunShiJiLuXiang[]
}

interface QianDuanJunShiJiLuXiang {
  jian_yi: string
  shi_jian: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  jun_shi_id: string
  jun_shi_ming_chen: string
  jun_shi_tou_xiang: string
  dui_hua_zhai_yao: string
  liao_tian_ji_lu: {
    jiao_se: string
    nei_rong: string
    shi_jian: string
    yi_che_hui: boolean
    yuan_shi_nei_rong?: string | null
    che_hui_shi_jian?: string | null
  }[]
}

export interface QianDuanJunShiJiLuXiangYing {
  jiLuLieBiao: QianDuanJunShiJiLuXiang[]
}

export async function huoQuJunShiLieBiao(): Promise<JunShiLieBiaoXiangYing> {
  return {
    junShiLieBiao: Object.values(JUN_SHI_PEI_ZHI).map((peiZhi) => ({
      id: peiZhi.id,
      mingCheng: peiZhi.mingCheng,
      fuBiaoTi: peiZhi.fuBiaoTi,
      biaoQian: peiZhi.biaoQian,
      miaoShu: peiZhi.miaoShu,
      touXiang: peiZhi.touXiang,
    })),
  }
}

export async function huoQuJunShiJiLu(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<QianDuanJunShiJiLuXiangYing> {
  const jiLuLieBiao = await huoQuJunShiJiLuLieBiao(yong_hu_id, jiao_se_id)
  const qianDuanLieBiao: QianDuanJunShiJiLuXiang[] = jiLuLieBiao.map((ji_lu) => ({
    jian_yi: ji_lu.jian_yi,
    shi_jian: ji_lu.shi_jian,
    jiao_se_id: ji_lu.jiao_se_id,
    jiao_se_ming_zi: ji_lu.jiao_se_ming_zi,
    jun_shi_id: ji_lu.jun_shi_id,
    jun_shi_ming_chen: ji_lu.jun_shi_ming_chen,
    jun_shi_tou_xiang: ji_lu.jun_shi_tou_xiang,
    dui_hua_zhai_yao: ji_lu.dui_hua_zhai_yao,
    liao_tian_ji_lu: ji_lu.liao_tian_ji_lu,
  }))
  return { jiLuLieBiao: qianDuanLieBiao }
}

export async function qingQiuJunShiZhiDao(
  canShu: JunShiZhiDaoCanShu,
): Promise<{ cheng_gong: boolean; jie_guo?: JunShiZhiDaoJieGuo; cuo_wu_ma?: string; ti_shi?: string; zhuang_tai_ma?: number }> {
  const junShiPeiZhi = JUN_SHI_PEI_ZHI[canShu.jun_shi_id || ''] || JUN_SHI_PEI_ZHI_MO_REN

  const jiaoSeSuoYouZhe = await huoQuJiaoSeSuoYouZhe(canShu.jiao_se_id)
  if (!jiaoSeSuoYouZhe) {
    jiLuJunShiQiuZhu(canShu.yong_hu_id, canShu.jiao_se_id, false, 'JIAO_SE_BU_CUN_ZAI')
    return { cheng_gong: false, cuo_wu_ma: 'JIAO_SE_BU_CUN_ZAI', ti_shi: huoQuFanYi('junShi', 'jiaoSeBuCunZai'), zhuang_tai_ma: 404 }
  }
  if (jiaoSeSuoYouZhe.yong_hu_id !== canShu.yong_hu_id) {
    jiLuJunShiQiuZhu(canShu.yong_hu_id, canShu.jiao_se_id, false, 'WU_QUAN_XIAN')
    return { cheng_gong: false, cuo_wu_ma: 'WU_QUAN_XIAN', ti_shi: huoQuFanYi('junShi', 'wuQuanXian'), zhuang_tai_ma: 403 }
  }

  const xianYouZhuangTai = await huoQuJunShiZhiDaoZhuangTai(canShu.yong_hu_id, canShu.jiao_se_id)
  if (xianYouZhuangTai && xianYouZhuangTai.zhuang_tai === 'zhi_dao_zhong') {
    jiLuJunShiQiuZhu(canShu.yong_hu_id, canShu.jiao_se_id, false, 'JUN_SHI_ZAI_ZHI_DAO_ZHONG')
    return {
      cheng_gong: false,
      cuo_wu_ma: 'JUN_SHI_ZAI_ZHI_DAO_ZHONG',
      ti_shi: huoQuFanYi('junShi', 'zhiDaoZhong'),
      zhuang_tai_ma: 409,
    }
  }

  const jiaoSeXinXi = await huoQuJiaoSeJiBenXinXi(canShu.jiao_se_id)
  if (!jiaoSeXinXi) {
    jiLuJunShiQiuZhu(canShu.yong_hu_id, canShu.jiao_se_id, false, 'JIAO_SE_BU_CUN_ZAI')
    return { cheng_gong: false, cuo_wu_ma: 'JIAO_SE_BU_CUN_ZAI', ti_shi: huoQuFanYi('junShi', 'jiaoSeBuCunZai'), zhuang_tai_ma: 404 }
  }

  const xiaoXiJieGuo = await huoQuXiaoXiLieBiao({
    yong_hu_id: canShu.yong_hu_id,
    jiao_se_id: canShu.jiao_se_id,
    ye_ma: 1,
    mei_ye_tiao_shu: JUN_SHI_QIU_ZHU_PEI_ZHI.liShiXiaoXiShuLiang,
  })

  const youXiaoXiaoXi = xiaoXiJieGuo.lie_biao
    .filter((xiaoXi) => xiaoXi.fa_song_zhe_lei_xing !== 'xitong')
    .reverse()

  if (youXiaoXiaoXi.length === 0) {
    jiLuJunShiQiuZhu(canShu.yong_hu_id, canShu.jiao_se_id, false, 'WU_LIAO_TIAN_JI_LU')
    return {
      cheng_gong: false,
      cuo_wu_ma: 'WU_LIAO_TIAN_JI_LU',
      ti_shi: huoQuFanYi('junShi', 'wuLiaoTianJiLu'),
      zhuang_tai_ma: 400,
    }
  }

  const duiHuaLiShi = zhuanHuanXiaoXiDaoDuiHuaLiShi(youXiaoXiaoXi, jiaoSeXinXi.wei_xin_ming)
  const haXi = jiSuanLiaoTianHaXi(youXiaoXiaoXi)

  const shiChongFu = await jianChaJunShiChongFu(canShu.yong_hu_id, canShu.jiao_se_id, haXi)
  if (shiChongFu) {
    jiLuJunShiQiuZhu(canShu.yong_hu_id, canShu.jiao_se_id, false, 'JUN_SHI_CHONG_FU')
    return { cheng_gong: false, cuo_wu_ma: 'JUN_SHI_CHONG_FU', ti_shi: huoQuFanYi('junShi', 'junShiChongFu'), zhuang_tai_ma: 409 }
  }

  const kaiShiShiJian = new Date().toISOString()
  const chuShiZhuangTai: JunShiZhiDaoZhuangTaiXinXi = {
    zhuang_tai: 'zhi_dao_zhong',
    jun_shi_id: junShiPeiZhi.id,
    kai_shi_shi_jian: kaiShiShiJian,
  }
  await sheZhiJunShiZhiDaoZhuangTai(canShu.yong_hu_id, canShu.jiao_se_id, chuShiZhuangTai)

  try {
    const haoGanDu = await huoQuHaoGanDu(canShu.yong_hu_id, canShu.jiao_se_id)
    const fuPanTiaoMu = await huoQuFuPanTiaoMuLieBiao(
      canShu.yong_hu_id,
      canShu.jiao_se_id,
      JUN_SHI_QIU_ZHU_PEI_ZHI.fuPanTiaoMuShuLiang,
    )

    const fuPanWenBenLieBiao = fuPanTiaoMu.map((tiaoMu) => {
      const bianHua = tiaoMu.hao_gan_du_bian_hua
      return [
        `时间：${tiaoMu.shi_jian}`,
        `用户消息：${tiaoMu.yong_hu_xiao_xi}`,
        `AI回复：${tiaoMu.ai_hui_fu}`,
        `AI内心活动：${tiaoMu.ai_xin_li_huo_dong}`,
        `好感度变化：信任${bianHua.xin_ren_bian_hua} 亲密${bianHua.qin_mi_bian_hua} 趣味${bianHua.qu_wei_bian_hua} 关怀${bianHua.guan_huai_bian_hua} 总分${bianHua.zong_fen_bian_hua}`,
      ].join('\n')
    })

    const zhiDaoJieGuo = await shengChengJunShiZhiDao({
      yong_hu_id: canShu.yong_hu_id,
      jiao_se_id: canShu.jiao_se_id,
      jiao_se_ming: jiaoSeXinXi.wei_xin_ming,
      dui_hua_li_shi: duiHuaLiShi,
      hao_gan_du: haoGanDu,
      fu_pan_tiao_mu: fuPanWenBenLieBiao,
      jun_shi_pei_zhi: {
        id: junShiPeiZhi.id,
        mingCheng: junShiPeiZhi.mingCheng,
        xiTongTiShi: junShiPeiZhi.xiTongTiShi,
      },
    })

    const shiJian = new Date().toISOString()
    const jiLu: JunShiJiLuXiang = {
      jian_yi: zhiDaoJieGuo.zhi_dao_nei_rong,
      shi_jian: shiJian,
      jiao_se_id: canShu.jiao_se_id,
      jiao_se_ming_zi: jiaoSeXinXi.wei_xin_ming,
      jun_shi_id: junShiPeiZhi.id,
      jun_shi_ming_chen: junShiPeiZhi.mingCheng,
      jun_shi_tou_xiang: junShiPeiZhi.touXiang,
      dui_hua_zhai_yao: shengChengDuiHuaZhaiYao(duiHuaLiShi),
      liao_tian_ji_lu: zhuanHuanLiaoTianJiLu(youXiaoXiaoXi, jiaoSeXinXi.wei_xin_ming),
      hou_tai_shu_ju: {
        hao_gan_du: {
          zong_fen: haoGanDu.zong_fen,
          xin_ren_du: haoGanDu.xin_ren_du,
          qin_mi_du: haoGanDu.qin_mi_du,
          qu_wei_du: haoGanDu.qu_wei_du,
          guan_huai_du: haoGanDu.guan_huai_du,
          guan_xi_jie_duan: haoGanDu.guan_xi_jie_duan,
        },
        fu_pan_tiao_mu: fuPanTiaoMu,
      },
    }

    await Promise.all([
      baoCunJunShiHaXi(canShu.yong_hu_id, canShu.jiao_se_id, haXi),
      baoCunJunShiJiLu(canShu.yong_hu_id, canShu.jiao_se_id, jiLu),
    ])

    const jieGuo: JunShiZhiDaoJieGuo = {
      junShi: {
        id: junShiPeiZhi.id,
        mingCheng: junShiPeiZhi.mingCheng,
        fuBiaoTi: junShiPeiZhi.fuBiaoTi,
        biaoQian: junShiPeiZhi.biaoQian,
        miaoShu: junShiPeiZhi.miaoShu,
        touXiang: junShiPeiZhi.touXiang,
      },
      zhiDaoNeiRong: zhiDaoJieGuo.zhi_dao_nei_rong,
      shiJian,
    }

    const wanChengZhuangTai: JunShiZhiDaoZhuangTaiXinXi = {
      zhuang_tai: 'yi_wan_cheng',
      jun_shi_id: junShiPeiZhi.id,
      kai_shi_shi_jian: kaiShiShiJian,
      jie_guo: jieGuo,
    }
    await sheZhiJunShiZhiDaoZhuangTai(canShu.yong_hu_id, canShu.jiao_se_id, wanChengZhuangTai)

    jiLuJunShiQiuZhu(canShu.yong_hu_id, canShu.jiao_se_id, true)

    return { cheng_gong: true, jie_guo: jieGuo }
  } catch (cuoWu) {
    await shanChuJunShiZhiDaoZhuangTai(canShu.yong_hu_id, canShu.jiao_se_id)
    jiLuJunShiQiuZhu(canShu.yong_hu_id, canShu.jiao_se_id, false, 'XI_TONG_YI_CHANG')
    console.error('请求军师指导异常', cuoWu)
    return {
      cheng_gong: false,
      cuo_wu_ma: 'XI_TONG_YI_CHANG',
      ti_shi: huoQuFanYi('junShi', 'shengChengShiBai'),
      zhuang_tai_ma: 500,
    }
  }
}

export async function huoQuJunShiZhiDaoZhuangTaiXinXi(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<{ zhuang_tai: JunShiZhiDaoZhuangTaiXinXi | null }> {
  const zhuangTai = await huoQuJunShiZhiDaoZhuangTai(yong_hu_id, jiao_se_id)
  return { zhuang_tai: zhuangTai }
}

async function huoQuJiaoSeJiBenXinXi(
  jiao_se_id: string,
): Promise<{ wei_xin_ming: string; ming_zi: string } | null> {
  const jieGuo = await 数据库.query(
    `SELECT "微信昵称", "名字" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  return {
    wei_xin_ming: String(jieGuo.rows[0].微信昵称 || ''),
    ming_zi: String(jieGuo.rows[0].名字 || ''),
  }
}

async function huoQuHaoGanDu(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<HaoGanDuXinXi> {
  const wanZhengHaoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
  if (wanZhengHaoGanDu) {
    return {
      xin_ren_du: wanZhengHaoGanDu.xin_ren_du,
      qin_mi_du: wanZhengHaoGanDu.qin_mi_du,
      qu_wei_du: wanZhengHaoGanDu.qu_wei_du,
      guan_huai_du: wanZhengHaoGanDu.guan_huai_du,
      zong_fen: wanZhengHaoGanDu.zong_fen,
      guan_xi_jie_duan: wanZhengHaoGanDu.guan_xi_jie_duan,
    }
  }
  return {
    xin_ren_du: 0,
    qin_mi_du: 0,
    qu_wei_du: 0,
    guan_huai_du: 0,
    zong_fen: 0,
    guan_xi_jie_duan: 'lengDan',
  }
}

function zhuanHuanXiaoXiDaoDuiHuaLiShi(
  xiaoXiLieBiao: {
    fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
    fa_song_zhe_ming?: string
    nei_rong: string
    shi_jian_chuo: number
    yi_che_hui?: boolean
    yuan_shi_nei_rong?: string | null
  }[],
  jiaoSeWeiXinMing: string,
) {
  return xiaoXiLieBiao.map((xiaoXi) => ({
    fa_song_zhe_lei_xing: xiaoXi.fa_song_zhe_lei_xing,
    fa_song_zhe_ming:
      xiaoXi.fa_song_zhe_lei_xing === 'jiaose'
        ? jiaoSeWeiXinMing
        : xiaoXi.fa_song_zhe_ming || '用户',
    nei_rong: xiaoXi.nei_rong,
    shi_jian: geShiHuaShiJian(xiaoXi.shi_jian_chuo),
    yi_che_hui: xiaoXi.yi_che_hui,
    yuan_shi_nei_rong: xiaoXi.yuan_shi_nei_rong,
  }))
}

function zhuanHuanLiaoTianJiLu(
  xiaoXiLieBiao: {
    fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
    nei_rong: string
    shi_jian_chuo: number
    yi_che_hui?: boolean
    che_hui_shi_jian?: string | null
    yuan_shi_nei_rong?: string | null
  }[],
  jiaoSeWeiXinMing: string,
): JunShiJiLuLiaoTianXiaoXi[] {
  return xiaoXiLieBiao.map((xiaoXi) => ({
    jiao_se: xiaoXi.fa_song_zhe_lei_xing === 'jiaose' ? jiaoSeWeiXinMing : '用户',
    nei_rong: xiaoXi.nei_rong,
    shi_jian: geShiHuaShiJian(xiaoXi.shi_jian_chuo),
    yi_che_hui: Boolean(xiaoXi.yi_che_hui),
    yuan_shi_nei_rong: xiaoXi.yuan_shi_nei_rong || null,
    che_hui_shi_jian: xiaoXi.che_hui_shi_jian || null,
  }))
}

function shengChengDuiHuaZhaiYao(
  duiHuaLiShi: { fa_song_zhe_ming: string; nei_rong: string }[],
): string {
  if (duiHuaLiShi.length === 0) return ''
  const zuiJin = duiHuaLiShi.slice(-3)
  return zuiJin.map((xiaoXi) => `${xiaoXi.fa_song_zhe_ming}: ${xiaoXi.nei_rong}`).join(' | ')
}

function geShiHuaShiJian(shi_jian_chuo: number): string {
  const shi_jian = new Date(shi_jian_chuo)
  const xiao_shi = String(shi_jian.getHours()).padStart(2, '0')
  const fen_zhong = String(shi_jian.getMinutes()).padStart(2, '0')
  return `${xiao_shi}:${fen_zhong}`
}
