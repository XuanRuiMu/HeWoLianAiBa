import type { MBTI类型 } from './角色配置'
import { haoGanDuJiChuFanWei } from './角色配置'

function huoQuMiJiKouLing(): string {
  const huanJingKouLing = (process.env.MI_JI_KOU_LING ?? '').trim()
  if (huanJingKouLing.length === 0) {
    return ''
  }
  return huanJingKouLing.length > 64 ? huanJingKouLing.slice(0, 64) : huanJingKouLing
}

export interface HaoGanDuJieDuanYingShe {
  jieDuanMing: string
  xinQing: string
  taiDuMiaoShu: string
  xiaXian: number
  shangXian: number
}

export const HaoGanDuPeiZhi = {
  quanZhong: {
    xinRenDu: 0.35,
    qinMiDu: 0.25,
    quWeiDu: 0.2,
    guanHuaiDu: 0.2,
  },

  fanWei: {
    zuiDiFen: 5,
    zuiGaoFen: 1000,
  },

  siWeiShangXian: 1000,

  moShiBeiLv: {
    putong: 2,
    tiaozhan: 1,
  },

  jiangDangQueRenLunShu: 2,

  queRenJieDuanYouXiaoMiao: 60 * 60 * 24 * 90,

  ceLiangXiShuShangXian: 1.5,

  ceLiangXiShuXiaXian: 1,

 junHengDuanWen: {
  liShiTiaoShu: 6,
  neiRongZuiDaChang: 60,
 },

  jiYi: {
    shengJiZhongYaoDu: 8,
    jiangJiZhongYaoDu: 3,
  },

  miJi: {
    miLing: huoQuMiJiKouLing(),
    muBiaoFen: 1000,
  },

  jieDuan: {
    lengDan: { jieDuanMing: '冷淡', xinQing: '平淡', taiDuMiaoShu: '极其冷淡、几乎不回复、使用敬语', xiaXian: 0, shangXian: 100 },
    shuYuan: { jieDuanMing: '疏远', xinQing: '平淡', taiDuMiaoShu: '礼貌但疏远', xiaXian: 101, shangXian: 200 },
    renShi: { jieDuanMing: '认识', xinQing: '好奇', taiDuMiaoShu: '偶尔关心、试探性交流', xiaXian: 201, shangXian: 300 },
    shuXi: { jieDuanMing: '熟悉', xinQing: '好奇', taiDuMiaoShu: '偶尔开玩笑、分享日常', xiaXian: 301, shangXian: 400 },
    pengYou: { jieDuanMing: '朋友', xinQing: '愉悦', taiDuMiaoShu: '友好、主动分享', xiaXian: 401, shangXian: 500 },
    haoYou: { jieDuanMing: '好友', xinQing: '愉悦', taiDuMiaoShu: '亲密、偶尔暧昧', xiaXian: 501, shangXian: 600 },
    aiMei: { jieDuanMing: '暧昧', xinQing: '期待', taiDuMiaoShu: '暗示、吃醋', xiaXian: 601, shangXian: 700 },
    xinDong: { jieDuanMing: '心动', xinQing: '期待', taiDuMiaoShu: '明显心动、期待见面', xiaXian: 701, shangXian: 800 },
    reLian: { jieDuanMing: '热恋', xinQing: '心动', taiDuMiaoShu: '甜蜜、撒娇', xiaXian: 801, shangXian: 900 },
    shenAi: { jieDuanMing: '深爱', xinQing: '甜蜜', taiDuMiaoShu: '深情、依赖', xiaXian: 901, shangXian: 1000 },
  } as Record<string, HaoGanDuJieDuanYingShe>,

  jiChuFanWei: haoGanDuJiChuFanWei,

  zhaXing: {
    eWaiJiaFen: {
      I: { zuiDi: 150, zuiGao: 250, shangXian: 370 },
      E: { zuiDi: 200, zuiGao: 300, shangXian: 550 },
    },
  },

  pingPanBaoDi: {
    chuFaLunShu: 5,
    leiJiTiShengXian: 10,
    xiShu: 1.3,
    guoQiHaoMiao: 2 * 60 * 60 * 1000,
  },
} as const

export type HaoGanDuJieDuanJian = keyof typeof HaoGanDuPeiZhi.jieDuan

export const GuanXiJieDuanMingYingSh: Record<string, string> = Object.fromEntries(
  Object.entries(HaoGanDuPeiZhi.jieDuan).map(([jian, xiang]) => [jian, xiang.jieDuanMing]),
)

export function GuiFanGuanXiJieDuanMing(zhi: unknown): string {
  if (typeof zhi === 'number' || (typeof zhi === 'string' && /^\d+$/.test(zhi.trim()))) {
    const fen = Number(zhi)
    if (Number.isFinite(fen)) {
      const jieDuan = Object.values(HaoGanDuPeiZhi.jieDuan).find((xiang) => fen >= xiang.xiaXian && fen <= xiang.shangXian)
      return jieDuan?.jieDuanMing ?? '冷淡'
    }
  }
  if (typeof zhi !== 'string') return '冷淡'
  const wen = zhi.trim()
  if (!wen) return '冷淡'
  if (Object.values(HaoGanDuPeiZhi.jieDuan).some((xiang) => xiang.jieDuanMing === wen)) return wen
  const jian = wen as HaoGanDuJieDuanJian
  return HaoGanDuPeiZhi.jieDuan[jian]?.jieDuanMing ?? '冷淡'
}

export function huoQuJiChuHaoGanDuFanWei(mbti: MBTI类型): [number, number] {
  return HaoGanDuPeiZhi.jiChuFanWei[mbti]
}
