import { ref, type Ref } from 'vue'
import { huoQuHaoYouXiaoXi, type HaoYouXiang, type HaoYouXiaoXi } from '@/api/社交'
import { huoQuFanYi } from '@/config/翻译表'

export type 好友活跃态 = 'zaiXian' | 'jinRi' | 'zuiJin' | 'liXian' | 'weiZhi'

export interface 好友最近动态 {
  zhaiYao: string
  shiJianChuo: number
  shiWoFaChu: boolean
}

export interface Use好友概览返回值 {
  zuiJinDongTai: Ref<Record<string, 好友最近动态>>
  jiaZaiZhong: Ref<boolean>
  jiaZai: (haoYouLieBiao: HaoYouXiang[]) => Promise<void>
  huoQuZuiJin: (haoYouId: string) => 好友最近动态 | null
  huoQuHuoYueTai: (haoYouId: string) => 好友活跃态
  huoQuHuoYueWenZi: (haoYouId: string) => string
  qingKong: () => void
}

const ZAI_XIAN_HAO_MIAO = 5 * 60 * 1000
const JIN_RI_HAO_MIAO = 24 * 60 * 60 * 1000
const ZUI_JIN_HAO_MIAO = 7 * 24 * 60 * 60 * 1000
const ZUI_DA_YU_QU_SHU = 24
const BING_FA_SHU = 4
const YI_TIAN_HAO_MIAO = 24 * 60 * 60 * 1000
const ZHAI_YAO_ZI_SHOU = 40

function zhaiYaoWenBen(xiaoXi: HaoYouXiaoXi): string {
  if (xiaoXi.yi_che_hui) return huoQuFanYi('haoYou', 'xiaoXiYiCheHui')
  const leiBie = xiaoXi.mei_ti_lei_bie || xiaoXi.lei_xing
  if (leiBie === 'tupian') return huoQuFanYi('haoYou', 'xiaoXiTuPian')
  if (leiBie === 'yuyin') return huoQuFanYi('haoYou', 'xiaoXiYuYin')
  if (leiBie === 'wenjian') return huoQuFanYi('haoYou', 'xiaoXiWenJian')
  if (leiBie === 'biaoqingshu') return huoQuFanYi('haoYou', 'xiaoXiBiaoQing')
  const chunWen = (xiaoXi.nei_rong || '').replace(/\s+/g, ' ').trim()
  if (!chunWen) return huoQuFanYi('haoYou', 'xiaoXiWuNeiRong')
  return chunWen.length > ZHAI_YAO_ZI_SHOU ? `${chunWen.slice(0, ZHAI_YAO_ZI_SHOU)}……` : chunWen
}

function xingQiWenBen(xingQi: number): string {
  const jian: Array<'xingQiRi' | 'xingQiYi' | 'xingQiEr' | 'xingQiSan' | 'xingQiSi' | 'xingQiWu' | 'xingQiLiu'> = [
    'xingQiRi',
    'xingQiYi',
    'xingQiEr',
    'xingQiSan',
    'xingQiSi',
    'xingQiWu',
    'xingQiLiu',
  ]
  return huoQuFanYi('shiJian', jian[xingQi] ?? 'xingQiRi')
}

function dangRiLingDian(shiJianChuo: number): number {
  const riQi = new Date(shiJianChuo)
  riQi.setHours(0, 0, 0, 0)
  return riQi.getTime()
}

export function geShiHuaHaoYouShiJian(shiJianChuo: number, xianZai: number = Date.now()): string {
  const muBiaoLingDian = dangRiLingDian(shiJianChuo)
  const jinTianLingDian = dangRiLingDian(xianZai)
  const riQi = new Date(shiJianChuo)
  const shi = String(riQi.getHours()).padStart(2, '0')
  const fen = String(riQi.getMinutes()).padStart(2, '0')
  const shiFen = `${shi}:${fen}`
  if (muBiaoLingDian === jinTianLingDian) return shiFen
  if (muBiaoLingDian === jinTianLingDian - YI_TIAN_HAO_MIAO) {
    return `${huoQuFanYi('shiJian', 'zuoTian')} ${shiFen}`
  }
  if (muBiaoLingDian > jinTianLingDian - 7 * YI_TIAN_HAO_MIAO) return xingQiWenBen(riQi.getDay())
  const yue = String(riQi.getMonth() + 1).padStart(2, '0')
  const ri = String(riQi.getDate()).padStart(2, '0')
  if (riQi.getFullYear() === new Date(xianZai).getFullYear()) return `${yue}-${ri}`
  return `${riQi.getFullYear()}-${yue}-${ri}`
}

export function use好友概览(): Use好友概览返回值 {
  const zuiJinDongTai = ref<Record<string, 好友最近动态>>({})
  const jiaZaiZhong = ref(false)
  let lingPai = 0

  async function yuQuYiGe(haoYouId: string, dangQianLingPai: number): Promise<void> {
    try {
      const { lieBiao } = await huoQuHaoYouXiaoXi(haoYouId, 1)
      if (dangQianLingPai !== lingPai) return
      const zuiHou = lieBiao.length ? lieBiao[lieBiao.length - 1] : null
      if (!zuiHou) return
      zuiJinDongTai.value = {
        ...zuiJinDongTai.value,
        [haoYouId]: {
          zhaiYao: zhaiYaoWenBen(zuiHou),
          shiJianChuo: zuiHou.shi_jian_chuo,
          shiWoFaChu: zuiHou.fa_song_zhe_id !== haoYouId,
        },
      }
    } catch {
      return
    }
  }

  async function jiaZai(haoYouLieBiao: HaoYouXiang[]): Promise<void> {
    lingPai += 1
    const dangQianLingPai = lingPai
    const duiLie = haoYouLieBiao.slice(0, ZUI_DA_YU_QU_SHU).map((haoYou) => haoYou.id)
    if (!duiLie.length) {
      zuiJinDongTai.value = {}
      jiaZaiZhong.value = false
      return
    }
    jiaZaiZhong.value = true
    const gongZuo = async (): Promise<void> => {
      for (;;) {
        const haoYouId = duiLie.shift()
        if (!haoYouId || dangQianLingPai !== lingPai) return
        await yuQuYiGe(haoYouId, dangQianLingPai)
      }
    }
    await Promise.all(Array.from({ length: BING_FA_SHU }, gongZuo))
    if (dangQianLingPai === lingPai) jiaZaiZhong.value = false
  }

  function huoQuZuiJin(haoYouId: string): 好友最近动态 | null {
    return zuiJinDongTai.value[haoYouId] ?? null
  }

  function huoQuHuoYueTai(haoYouId: string): 好友活跃态 {
    const dongTai = huoQuZuiJin(haoYouId)
    if (!dongTai) return 'weiZhi'
    const cha = Date.now() - dongTai.shiJianChuo
    if (cha <= ZAI_XIAN_HAO_MIAO) return 'zaiXian'
    if (cha <= JIN_RI_HAO_MIAO) return 'jinRi'
    if (cha <= ZUI_JIN_HAO_MIAO) return 'zuiJin'
    return 'liXian'
  }

  function huoQuHuoYueWenZi(haoYouId: string): string {
    const tai = huoQuHuoYueTai(haoYouId)
    if (tai === 'zaiXian') return huoQuFanYi('haoYou', 'zaiXian')
    if (tai === 'jinRi') return huoQuFanYi('haoYou', 'jinRiHuoYue')
    if (tai === 'zuiJin') return huoQuFanYi('haoYou', 'zuiJinHuoYue')
    if (tai === 'liXian') return huoQuFanYi('haoYou', 'liXian')
    return huoQuFanYi('haoYou', 'huoYueWeiZhi')
  }

  function qingKong(): void {
    lingPai += 1
    zuiJinDongTai.value = {}
    jiaZaiZhong.value = false
  }

  return {
    zuiJinDongTai,
    jiaZaiZhong,
    jiaZai,
    huoQuZuiJin,
    huoQuHuoYueTai,
    huoQuHuoYueWenZi,
    qingKong,
  }
}
