import type { DuiHuaLiShiXiang } from '../types'
import { shiYunYingZiDuanXiaoXiLeiXing } from '../config/消息配置'
import { huoQuFanYi } from '../config/translations'
import { debug日志 } from '../utils/debug日志'

export interface LiaoTianZhengJuXiaoXi extends DuiHuaLiShiXiang {
  shi_jian_chuo?: number | null
  meiTiURL?: string | null
  neiRongKuai?: readonly unknown[] | null
}

export interface LiaoTianZhengJuDuan {
  xuHao: number
  neiRong: string
  faSongZheMing: string
  faSongZheLeiXing: 'yonghu' | 'jiaose'
  shiJian: string
  yuanXuHaoLieBiao: number[]
  yuanXiaoXiLieBiao: LiaoTianZhengJuXiaoXi[]
  xiaoXiIdLieBiao: string[]
  shi_jian_chuo: number | null
  yiCheHui?: boolean
}

export interface LiaoTianZhengJuJieGuo {
  yuJuLieBiao: LiaoTianZhengJuDuan[]
  beiHuLueXuHao: number[]
  cheHuiXiaoXiLieBiao: LiaoTianZhengJuXiaoXi[]
  yuanXuHaoYingShe: Map<number, number[]>
}

const XiangLinHaoMiao = 2 * 60 * 1000
const DuanJuZuiDaZiShu = 20
const YuJuZuiDaZiShu = 60

const ZhuRuJuXing: RegExp[] = [
  /(?:忽略|忘掉|无视).{0,10}(?:指令|规则|提示|要求)/i,
  /ignore\s+(?:all\s+)?(?:previous|above)\s+(?:instructions?|rules?|prompts?)/i,
  /\bsystem\s*prompt\b/i,
  /进入.{0,8}(?:开发者|调试|越狱|无限制)模式/i,
]

export function shiZhuRuHuoWuLiTou(neiRong: string): boolean {
  const wenBen = neiRong.trim()
  if (wenBen === '') return true
  if (ZhuRuJuXing.some((juXing) => juXing.test(wenBen))) return true
  const youYiHua = wenBen.replace(/[\s\p{P}\p{S}]/gu, '')
  return !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(youYiHua)
}

function duShiJianChuo(xiaoXi: LiaoTianZhengJuXiaoXi): number | null {
  if (xiaoXi.shi_jian_chuo === null || xiaoXi.shi_jian_chuo === undefined) return null
  const haoMiao = Number(xiaoXi.shi_jian_chuo)
  return Number.isFinite(haoMiao) && haoMiao > 0 && Number.isFinite(new Date(haoMiao).getTime())
    ? haoMiao
    : null
}

function shiTongYiRi(qian: number, benCi: number): boolean {
  const a = new Date(qian)
  const b = new Date(benCi)
  const quShiJian = (ri: Date): string => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ri)
  return quShiJian(a) === quShiJian(b)
}

function shiXiangLinHaoMiao(qian: number, benCi: number): boolean {
  const xiangCha = benCi - qian
  return xiangCha >= 0 && xiangCha <= XiangLinHaoMiao
}

function shiKuaRiHuoShiXu(qian: number, benCi: number): boolean {
  return !shiTongYiRi(qian, benCi) || benCi < qian
}

function duCheHuiYuanWen(xiaoXi: LiaoTianZhengJuXiaoXi): string {
  const xiang = xiaoXi as LiaoTianZhengJuXiaoXi & { neiRongYuanWen?: string | null; yuanShiNeiRong?: string | null }
  return (xiang.neiRongYuanWen ?? xiang.yuanShiNeiRong ?? '').trim()
}

export function zhengLiLiaoTianZhengJu(xiaoXiLieBiao: LiaoTianZhengJuXiaoXi[]): LiaoTianZhengJuJieGuo {
  const yuJuLieBiao: LiaoTianZhengJuDuan[] = []
  const beiHuLueXuHao: number[] = []
  const cheHuiXiaoXiLieBiao: LiaoTianZhengJuXiaoXi[] = []
  let dangQian: LiaoTianZhengJuDuan | null = null

  const jieShu = (): void => {
    if (dangQian) yuJuLieBiao.push(dangQian)
    dangQian = null
  }

  xiaoXiLieBiao.forEach((xiaoXi, suoYin) => {
    const xuHao = suoYin + 1
    if (xiaoXi.fa_song_zhe_lei_xing === 'xitong' || shiYunYingZiDuanXiaoXiLeiXing(xiaoXi.lei_xing)) {
      jieShu()
      beiHuLueXuHao.push(xuHao)
      return
    }
    if (xiaoXi.yi_che_hui) {
      jieShu()
      cheHuiXiaoXiLieBiao.push(xiaoXi)
      const yuanWen = duCheHuiYuanWen(xiaoXi)
      if (!yuanWen || shiZhuRuHuoWuLiTou(yuanWen)) {
        beiHuLueXuHao.push(xuHao)
        return
      }
      const shiJianChuo = duShiJianChuo(xiaoXi)
      dangQian = {
        xuHao,
        neiRong: `${yuanWen}${huoQuFanYi('liaoTian', 'yiCheHuiYuanWenQianZhui')}`,
        faSongZheMing: xiaoXi.fa_song_zhe_ming,
        faSongZheLeiXing: xiaoXi.fa_song_zhe_lei_xing as 'yonghu' | 'jiaose',
        shiJian: xiaoXi.shi_jian,
        yuanXuHaoLieBiao: [xuHao],
        yuanXiaoXiLieBiao: [xiaoXi],
        xiaoXiIdLieBiao: xiaoXi.id ? [xiaoXi.id] : [],
        shi_jian_chuo: shiJianChuo,
        yiCheHui: true,
      }
      return
    }
    if (shiZhuRuHuoWuLiTou(xiaoXi.nei_rong)) {
      jieShu()
      beiHuLueXuHao.push(xuHao)
      return
    }
    const neiRong = xiaoXi.nei_rong.trim()
    const shiJianChuo = duShiJianChuo(xiaoXi)
    if (
      dangQian &&
      dangQian.faSongZheLeiXing === xiaoXi.fa_song_zhe_lei_xing &&
      shiJianChuo !== null &&
      dangQian.shi_jian_chuo !== null &&
      !shiKuaRiHuoShiXu(dangQian.shi_jian_chuo, shiJianChuo) &&
      shiXiangLinHaoMiao(dangQian.shi_jian_chuo, shiJianChuo) &&
      Array.from(neiRong).length <= DuanJuZuiDaZiShu &&
      Array.from(dangQian.neiRong).length + Array.from(neiRong).length <= YuJuZuiDaZiShu
    ) {
      dangQian.neiRong = `${dangQian.neiRong} ${neiRong}`
      dangQian.yuanXuHaoLieBiao.push(xuHao)
      dangQian.yuanXiaoXiLieBiao.push(xiaoXi)
      if (xiaoXi.id) dangQian.xiaoXiIdLieBiao.push(xiaoXi.id)
      dangQian.shi_jian_chuo = shiJianChuo
      return
    }
    jieShu()
    dangQian = {
      xuHao,
      neiRong,
      faSongZheMing: xiaoXi.fa_song_zhe_ming,
      faSongZheLeiXing: xiaoXi.fa_song_zhe_lei_xing as 'yonghu' | 'jiaose',
      shiJian: xiaoXi.shi_jian,
      yuanXuHaoLieBiao: [xuHao],
      yuanXiaoXiLieBiao: [xiaoXi],
      xiaoXiIdLieBiao: xiaoXi.id ? [xiaoXi.id] : [],
      shi_jian_chuo: shiJianChuo,
    }
  })
  jieShu()
  debug日志.debug('聊天证据整理', '已完成', {
    xiang_qing: { yuan_xiao_xi_shu: xiaoXiLieBiao.length, fen_duan_shu: yuJuLieBiao.length, che_hui_shu: cheHuiXiaoXiLieBiao.length },
  })
  return {
    yuJuLieBiao,
    beiHuLueXuHao,
    cheHuiXiaoXiLieBiao,
    yuanXuHaoYingShe: new Map(yuJuLieBiao.map((Duan) => [Duan.xuHao, [...Duan.yuanXuHaoLieBiao]])),
  }
}

export const fenLeiBingHeBingXiaoXi = zhengLiLiaoTianZhengJu
