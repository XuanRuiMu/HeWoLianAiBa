import { 按配置调用 } from '../utils/通用模型调用'
import { duJieBaoKaiGuanMoRenKai } from '../config/开场采样配置'
import { GuiFanGuanXiJieDuanMing } from '../config/好感度配置'
import { gouJianFengGeShiLiCeng } from './Prompt构建器'
import type { AIJiaoSeXinXi, HaoGanDuXinXi, DuiHuaLiShiXiang } from '../types'

const MoXingMing = 'QingGanFenXi' as const

export interface ZuiJiaPanDuan {
  youShiMeDongXi: boolean
  shuoDeShi?: string
  cuoWu?: string
}

export interface ZuiJiaPanDuanShuRu {
  jiao_se: AIJiaoSeXinXi
  hao_gan_du?: HaoGanDuXinXi | null
  dui_hua_li_shi: DuiHuaLiShiXiang[]
  liangJiaGeHaoMiao: number
  riChengTiShi?: string
  dangQianKeNengXing?: 'mang' | 'banMang' | 'xian'
  shiShuiMianShiDuan?: boolean
}

function gouJianRiChengTiShiHang(shuRu: ZuiJiaPanDuanShuRu): string[] {
  const hang: string[] = []
  if (shuRu.riChengTiShi) {
    hang.push(`你此刻的日程：${shuRu.riChengTiShi}`)
    if (shuRu.dangQianKeNengXing === 'mang') {
      hang.push('你正在忙手头这件事。想主动开口的意愿降低：这会儿先不打扰，除非确实有必要；确实要发，也必须是在忙形态——间隙里顺手发出的一句话，很短，不展开新话题。')
    }
  }
  if (shuRu.shiShuiMianShiDuan) {
    hang.push('现在是你的睡觉时间。想主动开口的意愿大幅降低——你不想深夜打扰对方，这会儿基本不发。')
  }
  return hang
}

export function 构建追加消息判定提示(shuRu: ZuiJiaPanDuanShuRu): string {
  return gouJianTiShi(shuRu)
}

function gouJianTiShi(shuRu: ZuiJiaPanDuanShuRu): string {
  const fenZhong = Math.round(shuRu.liangJiaGeHaoMiao / 60000)
  const renShe = shuRu.jiao_se
  const haoGanDu = shuRu.hao_gan_du
  const guanXiDuan = haoGanDu?.guan_xi_jie_duan
  const guanXiXing = haoGanDu?.zong_fen !== undefined ? `${guanXiDuan}（${haoGanDu.zong_fen} 分）` : '不明'
  return [
    gouJianFengGeShiLiCeng(shuRu.jiao_se),
    '',
    `你叫${renShe.wei_xin_ming}。${renShe.xing_ge || ''}`,
    `你说话的样子：${renShe.yan_yu_feng_ge || '自然'}`,
    `你和 TA 现在是：${guanXiXing}。你对 TA 的感觉：${guanXiGanJue(haoGanDu?.guan_xi_jie_duan)}`,
    '',
    `${fenZhong} 分钟前，你给 TA 发过消息。TA 没回。`,
    '现在你看着手机。',
    ...gouJianRiChengTiShiHang(shuRu),
    '',
    '你此刻想不想跟 TA 说句话？',
    '',
    '想发的话，`shuo_de_shi` 写你要直接发给 TA 的那句话，像平时聊天那样直接说。',
    '也可以是很小的事：一张图、一个链接、一句吐槽、今天吃了什么。',
    '不要把 TA 沉默了多久报给 TA —— 那是质问，不是聊天。',
    '',
    '只输出 JSON：{"you_dong_xi": true, "shuo_de_shi": "一句话"} 或 {"you_dong_xi": false}',
  ]
    .filter(Boolean)
    .join('\n')
}

function guanXiGanJue(guan_xi_jie_duan?: string): string {
  const 中文阶段 = GuiFanGuanXiJieDuanMing(guan_xi_jie_duan)
  const xianDuan: Record<string, string> = {
    冷淡: '刚认识，没什么特别的感觉',
    疏远: '还在互相试探，说不上想不想',
    认识: '觉得这人还行，偶尔会想起',
    熟悉: '算是熟人，会想到对方最近怎么样',
    朋友: '把对方当朋友，会主动找对方',
    好友: '开始在意对方怎么看自己',
    暧昧: '有点想对方，又怕自己想多了',
    心动: '明确知道自己喜欢对方了',
    热恋: '很想对方',
    深爱: '对方已经是生活的一部分',
  }
  return xianDuan[中文阶段] || '还不太清楚'
}

function jieXi(neiRong: string): ZuiJiaPanDuan {
  const tai = neiRong.match(/"you_dong_xi"\s*:\s*(true|false)/i)
  if (!tai) return { youShiMeDongXi: false, cuoWu: 'JIE_XI_SHI_BAI' }
  if (tai[1].toLowerCase() !== 'true') return { youShiMeDongXi: false }
  const wen = neiRong.match(/"shuo_de_shi"\s*:\s*"([^"]*)"/i)?.[1]?.trim() || ''
  if (wen.length < 2) return { youShiMeDongXi: false, cuoWu: 'WEN_KONG' }
  return { youShiMeDongXi: true, shuoDeShi: wen }
}

export async function panDuanZuiJia(shuRu: ZuiJiaPanDuanShuRu): Promise<ZuiJiaPanDuan> {
  if (!duJieBaoKaiGuanMoRenKai('ZUI_JIA_QI_YONG')) return { youShiMeDongXi: false }
  if (process.env.VITEST === 'true') return { youShiMeDongXi: false }
  try {
    const xiangYing = await 按配置调用(MoXingMing, [
      { jiaoSe: 'system', neiRong: '你在判断自己此刻想不想跟一个人说句话。只输出 JSON。' },
      { jiaoSe: 'user', neiRong: gouJianTiShi(shuRu) },
    ])
    return jieXi(xiangYing.neiRong)
  } catch {
    return { youShiMeDongXi: false, cuoWu: 'DIAO_YONG_SHI_BAI' }
  }
}
