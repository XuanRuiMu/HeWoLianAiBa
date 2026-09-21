function duQuQueXinDu(ming: string, moRen: number): number {
  const yuan = Number(process.env[ming])
  if (!Number.isFinite(yuan)) return moRen
  return Math.max(0, Math.min(1, yuan))
}

// YH-056 阈值进配置热重载：0.7禁硬编码，环境变量可配；三处判定统一读此出处
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

export const SHENG_LI_SHI_BAI_PEI_ZHI = {
  get shenJingBingQueXinDuYueShu(): number {
    return QUE_XIN_DU_YUE_SHU.shenJingBing
  },
  get biaoBaiHuiFuQueXinDuYueShu(): number {
    return QUE_XIN_DU_YUE_SHU.biaoBaiHuiFu
  },
  biaoBaiPanDuanLiShiTiaoShu: 10,
  // FP-08 四联判定（表白/互删/识破/神经病）带的历史条数，与上面的条数口径分开，禁在调用点硬编码
  jianCeLiShiTiaoShu: 10,
  // YH-039：表白数值阈值统一出处（用户表白 800 / AI 主动表白 800 同源，禁各处硬编码 800）
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
