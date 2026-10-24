import { huoQuFanYi, type FanYiZiJian } from './翻译表'

export const XIAO_XI_PEI_ZHI = {
  cheHuiShiXian: 2 * 60 * 1000,
  zuiDaXiaoXiChangDu: 500,
  ziFuTongJiXianShiYuZhi: 400,
  heBingShiJianYuZhi: 5 * 60 * 1000,
  diBuYuZhiXiangSu: 40,
  dingBuYuZhiXiangSu: 60,
  haoYouXiaoXiZuiDaTiaoShu: 50,
  haoYouLunXunJianGeHaoMiao: 30 * 1000,
}

export const DUO_MEI_TI_PEI_ZHI = {
  yuYinZuiDaMiao: 60,
  yuYinZuiDuanMiao: 1,
  tuPianQiPaoZuiDaKuanPx: 180,
  biaoQingBaoChiCunPx: 120,
  yuYinMeiMiaoKuanPx: 10,
  yuYinJiChuKuanPx: 20,
  yuYinZuiDuanKuanPx: 60,
  yuYinZuiChangKuanPx: 300,
  yuYinPaoNeidianPx: 12,
  yuYinJinDuBuZhouMiao: 0.1,
  yuYinJinDuXianGaoPx: 2,
  yuYinShiChangCeLiangChaoShiHaoMiao: 8000,
  wenJianMingZuiDaXianShiZiFu: 24,
} as const

export const SHENG_YIN_BAI_FEN_BI = {
  zuiXiao: 0,
  zuiDa: 100,
  moRen: 50,
} as const

export const SHENG_YIN_TONG_DAO_XUAN_XIANG = ['zong', 'yinYue', 'yongHuYuYin', 'duiXiangYuYin', 'shiPin'] as const

export type ShengYinTongDao = (typeof SHENG_YIN_TONG_DAO_XUAN_XIANG)[number]

export type ShengYinPeiZhi = Record<ShengYinTongDao, number | null>

export const SHENG_YIN_TONG_DAO_MO_REN: ShengYinPeiZhi = {
  zong: null,
  yinYue: null,
  yongHuYuYin: null,
  duiXiangYuYin: null,
  shiPin: null,
}

const SHENG_YIN_CUN_CHU_JIAN = 'lian-ai-ba-sheng-yin-tong-dao'

export const SHENG_YIN_TONG_DAO_JIU_JIAN = 'lian-ai-ba-sheng-yin'

const JIU_DANG_BAI_FEN_BI: Record<string, number | null> = {
  genSuiXiTong: null,
  jingYin: 0,
  xiao: 25,
  zhong: 50,
  da: 75,
  zuiDa: 100,
}

export function shiHeFaShengYinTongDao(zhi: unknown): zhi is ShengYinTongDao {
  return typeof zhi === 'string' && (SHENG_YIN_TONG_DAO_XUAN_XIANG as readonly string[]).includes(zhi)
}

export function guiYiHuaShengYin(zhi: unknown): number | null {
  if (typeof zhi === 'number') {
    if (!Number.isFinite(zhi)) return null
    return Math.min(SHENG_YIN_BAI_FEN_BI.zuiDa, Math.max(SHENG_YIN_BAI_FEN_BI.zuiXiao, Math.round(zhi)))
  }
  if (typeof zhi === 'string') {
    const baiFenBi = JIU_DANG_BAI_FEN_BI[zhi]
    return baiFenBi === undefined ? null : baiFenBi
  }
  return null
}

function anQuanDuQuShengYin(jian: string): string | null {
  try {
    return localStorage.getItem(jian)
  } catch {
    return null
  }
}

export function duQuShengYinTongDao(): ShengYinPeiZhi {
  const moRen: ShengYinPeiZhi = { ...SHENG_YIN_TONG_DAO_MO_REN }
  const xinPeiZhi = anQuanDuQuShengYin(SHENG_YIN_CUN_CHU_JIAN)
  const jiuDang = anQuanDuQuShengYin(SHENG_YIN_TONG_DAO_JIU_JIAN)
  if (typeof xinPeiZhi === 'string' && xinPeiZhi) {
    try {
      const jieXi = JSON.parse(xinPeiZhi) as Record<string, unknown>
      for (const tongDao of SHENG_YIN_TONG_DAO_XUAN_XIANG) {
        if (tongDao in jieXi) moRen[tongDao] = guiYiHuaShengYin(jieXi[tongDao])
      }
      if (!('yongHuYuYin' in jieXi) && !('duiXiangYuYin' in jieXi) && 'yuYin' in jieXi) {
        const qianRong = guiYiHuaShengYin(jieXi['yuYin'])
        moRen.yongHuYuYin = qianRong
        moRen.duiXiangYuYin = qianRong
      }
      return moRen
    } catch {
      return moRen
    }
  }
  if (typeof jiuDang === 'string' && jiuDang) {
    const qianRong = guiYiHuaShengYin(jiuDang)
    for (const tongDao of SHENG_YIN_TONG_DAO_XUAN_XIANG) {
      moRen[tongDao] = qianRong
    }
  }
  return moRen
}

export function baoCunShengYinTongDao(peiZhi: ShengYinPeiZhi): void {
  localStorage.setItem(SHENG_YIN_CUN_CHU_JIAN, JSON.stringify(peiZhi))
}

export function qingChuJiuShengYinJian(): void {
  try {
    localStorage.removeItem(SHENG_YIN_TONG_DAO_JIU_JIAN)
  } catch {
    return
  }
}

function danDaoBaiFenBi(peiZhi: Partial<ShengYinPeiZhi>, tongDao: ShengYinTongDao): number | null {
  return tongDao in peiZhi ? guiYiHuaShengYin((peiZhi as Record<string, unknown>)[tongDao]) : null
}

export function heChengShengYinYinLiang(peiZhi: Partial<ShengYinPeiZhi> & Record<'zong', number | null>): number | null {
  const ge = SHENG_YIN_TONG_DAO_XUAN_XIANG.map((tongDao) => danDaoBaiFenBi(peiZhi, tongDao))
  for (const baiFenBi of ge) {
    if (baiFenBi === 0) return 0
  }
  const xianShi = ge.filter((baiFenBi): baiFenBi is number => baiFenBi !== null)
  if (!xianShi.length) return null
  return Math.min(...xianShi) / SHENG_YIN_BAI_FEN_BI.zuiDa
}

export function heChengDanTongDaoYinLiang(
  peiZhi: Partial<ShengYinPeiZhi> & Record<'zong', number | null>,
  tongDao: ShengYinTongDao,
): number | null {
  const zong = danDaoBaiFenBi(peiZhi, 'zong')
  const danDao = danDaoBaiFenBi(peiZhi, tongDao)
  if (zong === 0 || danDao === 0) return 0
  const shangXian = zong === null ? danDao : danDao === null ? zong : Math.min(zong, danDao)
  return shangXian === null ? null : shangXian / SHENG_YIN_BAI_FEN_BI.zuiDa
}

export function duQuHeChengYinLiang(): number | null {
  try {
    return heChengShengYinYinLiang(duQuShengYinTongDao())
  } catch {
    return null
  }
}

export const LU_YIN_PEI_ZHI = {
  dianPingTiaoShu: 12,
} as const

export const XIAO_XI_KUAI_PEI_ZHI = {
  zuiDaKuaiShu: 20,
  zuiDaTuPianShu: 9,
  tuPianZhanWei: '[图片]',
  biaoQingBaoZhanWei: '[表情包]',
} as const

export const ZHAN_TIE_TU_PIAN_PEI_ZHI = {
  zuiDaZiJieZiJie: 20 * 1024 * 1024,
  yunXuMIME: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as readonly string[],
} as const

export const MEI_TI_XIAO_XI_LEI_XING = ['tuPian', 'biaoQingBao', 'yuYin', 'wenJian'] as const

export const TU_PIAN_XIAO_XI_LEI_XING = ['tuPian', 'biaoQingBao'] as const

export type MeiTiXiaoXiLeiXing = (typeof MEI_TI_XIAO_XI_LEI_XING)[number]

export const WEN_JIAN_SHURU_JIE_SHOU_KUO_ZHAN = [
  '.pdf',
  '.txt',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
  '.rar',
  '.7z',
  '.mp4',
  '.mov',
  '.md',
  '.csv',
  '.json',
  '.html',
].join(',')

export const EMOJI_MIANBAN_PEI_ZHI = {
  guoDuShouWeiHaoMiao: 600,
} as const

export const LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI = {
  yuYinCaiDanXiang: ['yuYinZhuanWenZi', 'yinYong', 'cheHui'],
  wenBenCaiDanXiang: ['fuZhi', 'fanYi', 'yinYong', 'cheHui'],
  tuPianCaiDanXiang: ['tianJiaDaoBiaoQing', 'baoCunTuPian', 'yinYong', 'cheHui'],
  changAnChuFaHaoMiao: 500,
  yinYongZhaiYaoZuiDaZiFu: 30,
  yuYinZhuanXieChaoShiHaoMiao: 70000,
  caiDanYuGuKuan: 148,
  caiDanYuGuGao: 168,
  caiDanBianJu: 8,
  caiDanXiaFangPianYi: 20,
} as const

const YIN_YONG_MEI_TI_ZHAN_WEI_JIAN = {
  tuPian: 'yinYongTuPianZhanWei',
  biaoQingBao: 'yinYongBiaoQingBaoZhanWei',
  wenJian: 'yinYongWenJianZhanWei',
} as const satisfies Partial<Record<(typeof MEI_TI_XIAO_XI_LEI_XING)[number], FanYiZiJian<'liaoTian'>>>

export function huoQuMeiTiYinYongZhanWei(leiXing: string): string | null {
  const jian = (YIN_YONG_MEI_TI_ZHAN_WEI_JIAN as Partial<Record<string, FanYiZiJian<'liaoTian'>>>)[
    leiXing
  ]
  return jian ? huoQuFanYi('liaoTian', jian) : null
}

export const YIN_YONG_DING_WEI_PEI_ZHI = {
  domQianZhui: 'xiaoxi-',
  douDongXianShi: 1,
  guangYunMoHu: 10,
  liangGuangHaoMiao: 1000,
  liangGuangCiShu: 3,
  liangGuangLingPai: '--jing-gao-se',
} as const

export type YuYinCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['yuYinCaiDanXiang'][number]

export type WenBenCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['wenBenCaiDanXiang'][number]

export type TuPianCaiDanXiang =
  (typeof LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI)['tuPianCaiDanXiang'][number]
