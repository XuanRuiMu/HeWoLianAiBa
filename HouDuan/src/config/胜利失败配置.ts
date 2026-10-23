function duQuQueXinDu(ming: string, moRen: number): number {
  const yuan = Number(process.env[ming])
  if (!Number.isFinite(yuan)) return moRen
  return Math.max(0, Math.min(1, yuan))
}

export const QUE_XIN_DU_YUE_SHU = {
  get shenJingBing(): number {
    return duQuQueXinDu('SHEN_JING_BING_QUE_XIN_DU_YUE_SHU', 0.7)
  },
  get biaoBaiHuiFu(): number {
    return duQuQueXinDu('BIAO_BAI_HUI_FU_QUE_XIN_DU_YUE_SHU', 0.7)
  },
  get tongYongJianCe(): number {
    return duQuQueXinDu('TONG_YONG_JIAN_CE_QUE_XIN_DU_YUE_SHU', 0.7)
  },
}

export const BEI_CHA_QU_PEI_ZHI = {
  get queXinDuYueShu(): number {
    return duQuQueXinDu('BEI_CHA_QU_QUE_XIN_DU_YUE_SHU', 0.65)
  },
  zhiJingTiShiMiao: 86400,
  redisJianQianZhui: 'bei_sha_qu_jing_gao:',
  zhiJingKouFenFenPei: {
    xin_ren_du_bian_hua: -14,
    qin_mi_du_bian_hua: -12,
    qu_wei_du_bian_hua: -8,
    guan_huai_du_bian_hua: -6,
  },
  zhiRuZhuRuYuanYin: '提示词注入',
  yuanYinHeXin: ['像渣男渣女', '提示词注入', '不像真人说话', '不符合我的条件', '情商太低'],
}

export const SHENG_LI_SHI_BAI_PEI_ZHI = {
  get shenJingBingQueXinDuYueShu(): number {
    return QUE_XIN_DU_YUE_SHU.shenJingBing
  },
  get biaoBaiHuiFuQueXinDuYueShu(): number {
    return QUE_XIN_DU_YUE_SHU.biaoBaiHuiFu
  },
  biaoBaiPanDuanLiShiTiaoShu: 10,
  jianCeLiShiTiaoShu: 10,
  biaoBaiHaoGanDuYuZhi: 800,
  shenJingBingJingGao: {
    haoGanDuKouFenZong: 30,
    kouFenFenPei: {
      xin_ren_du_bian_hua: -9,
      qin_mi_du_bian_hua: -8,
      qu_wei_du_bian_hua: -7,
      guan_huai_du_bian_hua: -6,
    },
    redisTtlMiao: 86400,
    redisJianQianZhui: 'shen_jing_bing_jing_gao:',
  },
}
