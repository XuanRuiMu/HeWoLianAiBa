import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/翻译表'
import type { 消息 } from '@/types/类型定义'

export interface ShiJianZaiTi {
  shi_jian_chuo: number
}

export interface XiaoXiFenZuXiang<X extends ShiJianZaiTi = 消息> {
  shiJian: string
  shiJianChuo: number
  xiaoXiLieBiao: X[]
}

const YI_TIAN_HAO_MIAO = 24 * 60 * 60 * 1000
const ZUI_DUO_XING_QI_TIAN_SHU = 6

type ShiDuanJian = 'lingChen' | 'zaoShang' | 'shangWu' | 'zhongWu' | 'xiaWu' | 'wanShang'
type XingQiJian =
  | 'xingQiRi'
  | 'xingQiYi'
  | 'xingQiEr'
  | 'xingQiSan'
  | 'xingQiSi'
  | 'xingQiWu'
  | 'xingQiLiu'

const SHI_DUAN_QI_SHI_XIAN: ReadonlyArray<readonly [number, ShiDuanJian]> = [
  [0, 'lingChen'],
  [6, 'zaoShang'],
  [9, 'shangWu'],
  [12, 'zhongWu'],
  [14, 'xiaWu'],
  [18, 'wanShang'],
]

const XING_QI_JIAN: readonly XingQiJian[] = [
  'xingQiRi',
  'xingQiYi',
  'xingQiEr',
  'xingQiSan',
  'xingQiSi',
  'xingQiWu',
  'xingQiLiu',
]

function zhuanBeiJing(shiJianChuo: number): Date {
  const riQi = new Date(shiJianChuo)
  const utc = riQi.getTime() + riQi.getTimezoneOffset() * 60000
  return new Date(utc + 8 * 3600000)
}

function luoQuShiDuanJian(shi: number): ShiDuanJian {
  let jieGuo: ShiDuanJian = SHI_DUAN_QI_SHI_XIAN[0][1]
  for (const [qiShi, jian] of SHI_DUAN_QI_SHI_XIAN) {
    if (shi >= qiShi) jieGuo = jian
  }
  return jieGuo
}

function zhuanShiDuanXiaoShi(shi: number): number {
  return shi > 12 ? shi - 12 : shi
}

function geShiHuaShiDuanShiJian(beiJing: Date): string {
  const shi = beiJing.getHours()
  const fen = String(beiJing.getMinutes()).padStart(2, '0')
  return `${huoQuFanYi('shiJian', luoQuShiDuanJian(shi))}${zhuanShiDuanXiaoShi(shi)}:${fen}`
}

function benRiLingDian(riQi: Date): number {
  return new Date(riQi.getFullYear(), riQi.getMonth(), riQi.getDate()).getTime()
}

function tianShuCha(beiJing: Date, xianZai: Date): number {
  return Math.round((benRiLingDian(xianZai) - benRiLingDian(beiJing)) / YI_TIAN_HAO_MIAO)
}

function luoQuRiQiQianZhui(beiJing: Date, xianZai: Date): string {
  const cha = tianShuCha(beiJing, xianZai)
  if (cha <= 0) return ''
  if (cha === 1) return huoQuFanYi('shiJian', 'zuoTian')
  if (cha <= ZUI_DUO_XING_QI_TIAN_SHU) return huoQuFanYi('shiJian', XING_QI_JIAN[beiJing.getDay()])

  const yue = String(beiJing.getMonth() + 1)
  const ri = String(beiJing.getDate())
  if (beiJing.getFullYear() === xianZai.getFullYear()) {
    return huoQuFanYi('shiJian', 'yueRiGeShi')
      .replace('{yue}', yue)
      .replace('{ri}', ri)
  }

  return huoQuFanYi('shiJian', 'nianYueRiGeShi')
    .replace('{nian}', String(beiJing.getFullYear()))
    .replace('{yue}', yue)
    .replace('{ri}', ri)
}

export function geShiHuaXiaoXiShiJian(beiJing: Date, xianZai: Date): string {
  const shiJianBuFen = geShiHuaShiDuanShiJian(beiJing)
  const riQiQianZhui = luoQuRiQiQianZhui(beiJing, xianZai)
  return riQiQianZhui ? `${riQiQianZhui} ${shiJianBuFen}` : shiJianBuFen
}

function shiKuaTian(qianChuo: number, houChuo: number): boolean {
  return benRiLingDian(zhuanBeiJing(qianChuo)) !== benRiLingDian(zhuanBeiJing(houChuo))
}

function xuYaoXinShiJianTiao<X extends ShiJianZaiTi>(qianChuo: number | null, xiaoXi: X): boolean {
  if (qianChuo === null) return true
  const shiJianChuo = xiaoXi.shi_jian_chuo
  if (!Number.isFinite(shiJianChuo) || !Number.isFinite(qianChuo)) return true
  if (shiJianChuo < qianChuo) return true
  const jianGe = shiJianChuo - qianChuo
  if (jianGe > XIAO_XI_PEI_ZHI.heBingShiJianYuZhi) return true
  return shiKuaTian(qianChuo, shiJianChuo)
}

export function fenZuXiaoXiAnShiJian<X extends ShiJianZaiTi>(
  lieBiao: X[],
): XiaoXiFenZuXiang<X>[] {
  if (!Array.isArray(lieBiao)) return []
  const jieGuo: XiaoXiFenZuXiang<X>[] = []
  let shangYiGeShiJianChuo: number | null = null

  for (const xiaoXi of lieBiao) {
    if (xuYaoXinShiJianTiao(shangYiGeShiJianChuo, xiaoXi)) {
      jieGuo.push({
        shiJian: geShiHuaXiaoXiShiJian(zhuanBeiJing(xiaoXi.shi_jian_chuo), zhuanBeiJing(Date.now())),
        shiJianChuo: xiaoXi.shi_jian_chuo,
        xiaoXiLieBiao: [xiaoXi],
      })
      shangYiGeShiJianChuo = xiaoXi.shi_jian_chuo
    } else {
      jieGuo[jieGuo.length - 1].xiaoXiLieBiao.push(xiaoXi)
    }
  }

  return jieGuo
}
