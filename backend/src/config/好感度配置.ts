import type { MBTILeiXing } from './角色配置'
import { haoGanDuJiChuFanWei } from './角色配置'

export interface HaoGanDuJieDuanYingShe {
  jieDuanMing: string
  xinQing: string
  taiDuMiaoShu: string
  xiaXian: number
  shangXian: number
}

export interface LiuCengJiYingShe {
  mingCheng: string
  xiaXian: number
  shangXian: number
}

export const HAO_GAN_DU_PEI_ZHI = {
  quanZhong: {
    xinRenDu: 0.35,
    qinMiDu: 0.25,
    quWeiDu: 0.2,
    guanHuaiDu: 0.2,
  },

  fanWei: {
    zuiDiFen: 0,
    zuiGaoFen: 1000,
  },

  shuaiJian: {
    zuiDiBaoLiu: 0.1,
  },

  jiYi: {
    shengJiZhongYaoDu: 8,
    jiangJiZhongYaoDu: 3,
  },

  miJi: {
    miLing: 'whosyourdaddy',
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

  liuCengJi: {
    moShengRen: { mingCheng: '陌生人', xiaXian: 0, shangXian: 100 },
    renShiDeRen: { mingCheng: '认识的人', xiaXian: 101, shangXian: 300 },
    pengYou: { mingCheng: '朋友', xiaXian: 301, shangXian: 500 },
    haoPengYou: { mingCheng: '好朋友', xiaXian: 501, shangXian: 600 },
    aiMei: { mingCheng: '暧昧', xiaXian: 601, shangXian: 800 },
    lianRen: { mingCheng: '恋人', xiaXian: 801, shangXian: 1000 },
  } as Record<string, LiuCengJiYingShe>,

  jiChuFanWei: haoGanDuJiChuFanWei,

  zhaXing: {
    eWaiJiaFen: { zuiDi: 200, zuiGao: 300 },
  },
} as const

export type HaoGanDuJieDuanJian = keyof typeof HAO_GAN_DU_PEI_ZHI.jieDuan

export function huoQuJiChuHaoGanDuFanWei(mbti: MBTILeiXing): [number, number] {
  return HAO_GAN_DU_PEI_ZHI.jiChuFanWei[mbti]
}
