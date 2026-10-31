import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { duJieBaoKaiGuan } from '../config/开场采样配置'
import { gouJianFengGeShiLiCeng } from './Prompt构建器'
import type { AIJiaoSeXinXi, HaoGanDuXinXi, DuiHuaLiShiXiang } from '../types'

const MO_XING_MING = 'qingGanFenXi' as const

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
  const xianDuan: Record<string, string> = {
    lengDan: '刚认识，没什么特别的感觉',
    shuYuan: '还在互相试探，说不上想不想',
    renShi: '觉得这人还行，偶尔会想起',
    shuXi: '算是熟人，会想到对方最近怎么样',
    pengYou: '把对方当朋友，会主动找对方',
    haoYou: '开始在意对方怎么看自己',
    aiMei: '有点想对方，又怕自己想多了',
    xinDong: '明确知道自己喜欢对方了',
    reLian: '很想对方',
    shenAi: '对方已经是生活的一部分',
  }
  return xianDuan[guan_xi_jie_duan || ''] || '还不太清楚'
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
  if (!duJieBaoKaiGuan('ZUI_JIA_QI_YONG')) return { youShiMeDongXi: false }
  if (process.env.VITEST === 'true') return { youShiMeDongXi: false }
  try {
    const xiangYing = await genJuPeiZhiTiaoYong(MO_XING_MING, [
      { jiaoSe: 'system', neiRong: '你在判断自己此刻想不想跟一个人说句话。只输出 JSON。' },
      { jiaoSe: 'user', neiRong: gouJianTiShi(shuRu) },
    ])
    return jieXi(xiangYing.neiRong)
  } catch {
    return { youShiMeDongXi: false, cuoWu: 'DIAO_YONG_SHI_BAI' }
  }
}
