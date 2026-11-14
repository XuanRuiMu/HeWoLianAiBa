import { huoQuFanYi, type FanYiZiJian } from './翻译表'

export const XiaoXiPeiZhi = {
  cheHuiShiXian: 2 * 60 * 1000,
  zuiDaXiaoXiChangDu: 500,
  ziFuTongJiXianShiYuZhi: 400,
  heBingShiJianYuZhi: 5 * 60 * 1000,
  diBuYuZhiXiangSu: 40,
  dingBuYuZhiXiangSu: 60,
  haoYouXiaoXiZuiDaTiaoShu: 50,
  haoYouLunXunJianGeHaoMiao: 30 * 1000,
}

export const DuoMeiTiPeiZhi = {
  yuYinZuiDaMiao: 60,
  yuYinZuiDuanMiao: 1,
  tuPianQiPaoZuiDaKuanPx: 180,
  biaoQingBaoChiCunPx: 120,
  yuYinMeiMiaoKuanPx: 16,
  yuYinJiChuKuanPx: 60,
  yuYinZuiChangKuanPx: 260,
  yuYinPaoNeidianPx: 12,
  yuYinJinDuBuZhouMiao: 0.1,
  yuYinShiJianXiaoShuWei: 1,
  yuYinJinDuXianGaoPx: 2,
  yuYinShiChangCeLiangChaoShiHaoMiao: 8000,
  yuYinFaSongCeLiangChaoShiHaoMiao: 400,
  yuYinCeLiangBingFaShangXian: 2,
  yuYinCeLiangKeShiQuYuZaiXianChengPx: 240,
  yuYinShiChangChiJiuShangXian: 400,
  yuYinShiChangChiJiuZuiDaHaoMiao: 10 * 60 * 1000,
  yuYinShiChangChiJiuShiXiaoHaoMiao: 30 * 24 * 60 * 60 * 1000,
  yuYinShiChangXieRuYanChiHaoMiao: 320,
  wenJianMingZuiDaXianShiZiFu: 24,
} as const

export const ShengYinBaiFenBi = {
  zuiXiao: 0,
  zuiDa: 100,
  moRen: 50,
} as const

export const ShengYinTongDaoXuanXiang = [
  'zong',
  'yinYue',
  'yongHuYuYin',
  'duiXiangYuYin',
  'shiPin',
] as const

export type ShengYinTongDao = (typeof ShengYinTongDaoXuanXiang)[number]

export type ShengYinPeiZhi = Record<ShengYinTongDao, number | null>

export const ShengYinTongDaoMoRen: ShengYinPeiZhi = {
  zong: null,
  yinYue: null,
  yongHuYuYin: null,
  duiXiangYuYin: null,
  shiPin: null,
}

const ShengYinCunChuJian = 'lian-ai-ba-sheng-yin-tong-dao'

export const ShengYinTongDaoJiuJian = 'lian-ai-ba-sheng-yin'

const JiuDangBaiFenBi: Record<string, number | null> = {
  genSuiXiTong: null,
  jingYin: 0,
  xiao: 25,
  zhong: 50,
  da: 75,
  zuiDa: 100,
}

export function shiHeFaShengYinTongDao(zhi: unknown): zhi is ShengYinTongDao {
  return (
    typeof zhi === 'string' && (ShengYinTongDaoXuanXiang as readonly string[]).includes(zhi)
  )
}

export function guiYiHuaShengYin(zhi: unknown): number | null {
  if (typeof zhi === 'number') {
    if (!Number.isFinite(zhi)) return null
    return Math.min(
      ShengYinBaiFenBi.zuiDa,
      Math.max(ShengYinBaiFenBi.zuiXiao, Math.round(zhi)),
    )
  }
  if (typeof zhi === 'string') {
    const baiFenBi = JiuDangBaiFenBi[zhi]
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
  const moRen: ShengYinPeiZhi = { ...ShengYinTongDaoMoRen }
  const xinPeiZhi = anQuanDuQuShengYin(ShengYinCunChuJian)
  const jiuDang = anQuanDuQuShengYin(ShengYinTongDaoJiuJian)
  if (typeof xinPeiZhi === 'string' && xinPeiZhi) {
    try {
      const jieXi = JSON.parse(xinPeiZhi) as Record<string, unknown>
      for (const tongDao of ShengYinTongDaoXuanXiang) {
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
    for (const tongDao of ShengYinTongDaoXuanXiang) {
      moRen[tongDao] = qianRong
    }
  }
  return moRen
}

export function baoCunShengYinTongDao(peiZhi: ShengYinPeiZhi): void {
  localStorage.setItem(ShengYinCunChuJian, JSON.stringify(peiZhi))
}

export function qingChuJiuShengYinJian(): void {
  try {
    localStorage.removeItem(ShengYinTongDaoJiuJian)
  } catch {
    return
  }
}

function danDaoBaiFenBi(peiZhi: Partial<ShengYinPeiZhi>, tongDao: ShengYinTongDao): number | null {
  return tongDao in peiZhi ? guiYiHuaShengYin((peiZhi as Record<string, unknown>)[tongDao]) : null
}

export function heChengDanTongDaoYinLiang(
  peiZhi: Partial<ShengYinPeiZhi> & Record<'zong', number | null>,
  tongDao: ShengYinTongDao,
): number | null {
  const zong = danDaoBaiFenBi(peiZhi, 'zong')
  const danDao = danDaoBaiFenBi(peiZhi, tongDao)
  if (zong === 0 || danDao === 0) return 0
  const shangXian = zong === null ? danDao : danDao === null ? zong : Math.min(zong, danDao)
  return shangXian === null ? null : shangXian / ShengYinBaiFenBi.zuiDa
}

export function xuanZeYuYinTongDao(faSongZheLeiXing: unknown): ShengYinTongDao {
  return faSongZheLeiXing === 'yonghu' ? 'yongHuYuYin' : 'duiXiangYuYin'
}

export const LuYinPeiZhi = {
  dianPingTiaoShu: 12,
} as const

export const XiaoXiKuaiPeiZhi = {
  zuiDaKuaiShu: 20,
  zuiDaTuPianShu: 9,
  tuPianZhanWei: '[图片]',
  biaoQingBaoZhanWei: '[表情包]',
} as const

export const ZhanTieTuPianPeiZhi = {
  zuiDaZiJieZiJie: 20 * 1024 * 1024,
  yunXuMIME: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as readonly string[],
} as const

export const MeiTiXiaoXiLeiXing = ['tuPian', 'biaoQingBao', 'yuYin', 'wenJian'] as const

const MeiTiXiaoXiJiHe = new Set<string>(MeiTiXiaoXiLeiXing)

export function huoQuFaSongZhuangTaiWenAn(canShu: {
  leiXing: string
  faSongZhong: boolean
  faSongShiBai: boolean
}): string {
  if (!canShu.faSongZhong && canShu.faSongShiBai) {
    return huoQuFanYi('liaoTian', 'chongXinFaSong')
  }
  if (MeiTiXiaoXiJiHe.has(canShu.leiXing)) {
    return huoQuFanYi('duoMeiTi', 'shangChuanZhong')
  }
  return huoQuFanYi('liaoTian', 'faSongZhong')
}

export const TuPianXiaoXiLeiXing = ['tuPian', 'biaoQingBao'] as const

export type MeiTiXiaoXiLeiXing = (typeof MeiTiXiaoXiLeiXing)[number]

export const WenJianShuruJieShouKuoZhan = [
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

export const EmojiMianbanPeiZhi = {
  guoDuShouWeiHaoMiao: 600,
} as const

export const LiaoTianYouJianCaiDanPeiZhi = {
  cheHuiCaiDanXiang: ['cheHui'],
  yuYinCaiDanXiang: ['yuYinZhuanWenZi', 'yinYong', 'cheHui'],
  wenBenCaiDanXiang: ['fuZhi', 'fanYi', 'yinYong', 'cheHui'],
  tuPianCaiDanXiang: ['tianJiaDaoBiaoQing', 'baoCunTuPian', 'yinYong', 'cheHui'],
  biaoQingBaoCaiDanXiang: ['tianJiaDaoBiaoQing', 'baoCunTuPian', 'yinYong', 'cheHui'],
  weiXianCaiDanXiang: ['cheHui'],
  changAnChuFaHaoMiao: 500,
  yinYongZhaiYaoZuiDaZiFu: 30,
  yuYinZhuanXieChaoShiHaoMiao: 70000,
  caiDanBianJu: 16,
  caiDanJianGe: 12,
  caiDanZuiXiaoKuanDu: 176,
  caiDanZuiDaKuanDu: 268,
  caiDanZuiDaGaoDu: 320,
  youJianQuChongHaoMiao: 700,
  chuMoPianYiXianZhi: 10,
} as const

const CaiDanXiangAnLeiXing = {
  cheHui: LiaoTianYouJianCaiDanPeiZhi.cheHuiCaiDanXiang,
  yuYin: LiaoTianYouJianCaiDanPeiZhi.yuYinCaiDanXiang,
  wenBen: LiaoTianYouJianCaiDanPeiZhi.wenBenCaiDanXiang,
  tuPian: LiaoTianYouJianCaiDanPeiZhi.tuPianCaiDanXiang,
  biaoQingBao: LiaoTianYouJianCaiDanPeiZhi.biaoQingBaoCaiDanXiang,
} as const satisfies Record<string, readonly string[]>

export type XiaoXiCaiDanLeiXing = keyof typeof CaiDanXiangAnLeiXing

export const CaiDanLeiXingMoRen: XiaoXiCaiDanLeiXing = 'cheHui'

export const CaiDanLeiXingBiaoQingBao: XiaoXiCaiDanLeiXing = 'biaoQingBao'

const CaiDanLeiXingAnXiaoXiLeiXing = {
  yuYin: 'yuYin',
  wenben: 'wenBen',
  tuPian: 'tuPian',
  biaoQingBao: CaiDanLeiXingBiaoQingBao,
} as const satisfies Partial<Record<string, XiaoXiCaiDanLeiXing>>

export function huoQuCaiDanLeiXing(xiaoXiLeiXing: string): XiaoXiCaiDanLeiXing {
  const piPei = (
    CaiDanLeiXingAnXiaoXiLeiXing as Partial<Record<string, XiaoXiCaiDanLeiXing>>
  )[xiaoXiLeiXing]
  return piPei ?? CaiDanLeiXingMoRen
}

const WeiXianCaiDanJiHe: ReadonlySet<string> = new Set<string>(
  LiaoTianYouJianCaiDanPeiZhi.weiXianCaiDanXiang,
)

export type XiaoXiCaiDanXiang =
  | YuYinCaiDanXiang
  | WenBenCaiDanXiang
  | TuPianCaiDanXiang
  | BiaoQingBaoCaiDanXiang

export function huoQuYuanShiCaiDanXiang(
  leiXing: XiaoXiCaiDanLeiXing,
): readonly XiaoXiCaiDanXiang[] {
  return CaiDanXiangAnLeiXing[leiXing]
}

export function shiWeiXianCaiDanXiang(xiang: string): boolean {
  return WeiXianCaiDanJiHe.has(xiang)
}

const YinYongMeiTiZhanWeiJian = {
  tuPian: 'yinYongTuPianZhanWei',
  biaoQingBao: 'yinYongBiaoQingBaoZhanWei',
  wenJian: 'yinYongWenJianZhanWei',
} as const satisfies Partial<
  Record<(typeof MeiTiXiaoXiLeiXing)[number], FanYiZiJian<'liaoTian'>>
>

export function huoQuMeiTiYinYongZhanWei(leiXing: string): string | null {
  const jian = (YinYongMeiTiZhanWeiJian as Partial<Record<string, FanYiZiJian<'liaoTian'>>>)[
    leiXing
  ]
  return jian ? huoQuFanYi('liaoTian', jian) : null
}

export const YinYongDingWeiPeiZhi = {
  domQianZhui: 'xiaoxi-',
  douDongXianShi: 1,
  guangYunMoHu: 10,
  liangGuangHaoMiao: 1000,
  liangGuangCiShu: 3,
  liangGuangLingPai: '--jing-gao-se',
} as const

export type YuYinCaiDanXiang =
  (typeof LiaoTianYouJianCaiDanPeiZhi)['yuYinCaiDanXiang'][number]

export type WenBenCaiDanXiang =
  (typeof LiaoTianYouJianCaiDanPeiZhi)['wenBenCaiDanXiang'][number]

export type TuPianCaiDanXiang =
  (typeof LiaoTianYouJianCaiDanPeiZhi)['tuPianCaiDanXiang'][number]

export type BiaoQingBaoCaiDanXiang =
  (typeof LiaoTianYouJianCaiDanPeiZhi)['biaoQingBaoCaiDanXiang'][number]
