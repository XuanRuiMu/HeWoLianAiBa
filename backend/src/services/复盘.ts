import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { huoQuXiaoXiLieBiao } from './消息'
import { gengXinFuPanNeiRong } from './战绩'
import type { FuPanPiZhu, FuPanShiJianXianTiaoMu } from './战绩'

export interface FuPanShengChengJieGuo {
  fu_pan_nei_rong: string
  fu_pan_shi_jian_xian: FuPanShiJianXianTiaoMu[]
  fu_pan_pi_zhu: FuPanPiZhu[]
}

interface FuPanJSONJieGou {
  pi_zhu?: Array<{ xu_hao?: unknown; ping_lun?: unknown }>
  zong_jie?: unknown
}

const FU_PAN_MAX_XIAO_XI = 999
const FU_PAN_MAX_PI_ZHU = 15

function jieXiJSONXiangYing(neiRong: string): FuPanJSONJieGou {
  const qingLiNeiRong = neiRong.trim()
  try {
    return JSON.parse(qingLiNeiRong) as FuPanJSONJieGou
  } catch {
    const piPei = qingLiNeiRong.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        return JSON.parse(piPei[0]) as FuPanJSONJieGou
      } catch {
        return {}
      }
    }
    return {}
  }
}

function gouJianFuPanPrompt(
  xiaoXiLieBiao: { fa_song_zhe: string; nei_rong: string; shi_jian: string; yi_che_hui?: boolean; yuan_shi_nei_rong?: string | null }[],
): string {
  const xiaoXiWenBen = xiaoXiLieBiao
    .map(
      (xiaoXi, xuHao) =>
        `${xuHao + 1}. [${xiaoXi.shi_jian}] ${xiaoXi.fa_song_zhe}: ${xiaoXi.nei_rong}${
          xiaoXi.yi_che_hui ? `（已撤回，原始内容：${xiaoXi.yuan_shi_nei_rong || ''}）` : ''
        }`,
    )
    .join('\n')

  return [
    '你刚陪朋友聊完一段恋爱模拟聊天，现在帮他回头看看这场聊天。',
    '只看聊天记录本身，不要假设你知道对方的人设、性格、MBTI、好感度变化或任何后台数据，只能从聊天内容、语气、回应节奏来判断。',
    '像朋友之间复盘吐槽一样自然，别写得太正式。',
    '',
    '输出格式（JSON）：',
    '{',
    '  "pi_zhu": [',
    '    {"xu_hao": 1, "ping_lun": "对这条消息的点评"},',
    '    {"xu_hao": 3, "ping_lun": "对这条消息的点评"}',
    '  ],',
    '  "zong_jie": "整体复盘点评，自然口语"',
    '}',
    '',
    'pi_zhu 要求：',
    `1. 从聊天记录里挑 ${FU_PAN_MAX_PI_ZHU} 条以内的关键消息做点评（不必每条都点评）。`,
    '2. xu_hao 是消息序号（对应下面聊天记录的序号，从1开始）。必须准确对应，不要编造不存在的序号。',
    '3. ping_lun 是对该条消息的点评，自然口语，像朋友吐槽。',
    '4. 不要出现"信任度"、"亲密度"、"趣味度"、"关怀度"、"总分"、"阶段"、"好感度"、"MBTI"等后台词，也不要出现具体分数。',
    '5. 不要在点评里提到对方的真实姓名、人设、背景故事等你看不到的信息，只能基于聊天内容判断。',
    '',
    'zong_jie 要求：',
    '1. 整体复盘点评，自然口语，像朋友吐槽一样。',
    '2. 不要出现后台词（信任度/亲密度/趣味度/关怀度/总分/阶段/好感度/MBTI）或具体分数。',
    '3. 不要提到对方真实姓名或人设信息。',
    '',
    '完整聊天记录（序号. [时间] 发送者: 内容）：',
    xiaoXiWenBen || '（无对话记录）',
    '',
    '只输出 JSON，别加额外说明。',
  ].join('\n')
}

function zhuanHuanWeiWenBen(zhi: unknown): string {
  if (zhi === null || zhi === undefined) return ''
  if (typeof zhi === 'string') return zhi
  if (typeof zhi === 'number' || typeof zhi === 'boolean') return String(zhi)
  if (Array.isArray(zhi)) return zhi.map(zhuanHuanWeiWenBen).join('\n')
  if (typeof zhi === 'object') {
    try {
      return JSON.stringify(zhi, null, 2)
    } catch {
      return String(zhi)
    }
  }
  return String(zhi)
}

function shengChengFuPanZongJie(jieGou: FuPanJSONJieGou): string {
  return zhuanHuanWeiWenBen(jieGou.zong_jie).trim()
}

function zhuanHuanPiZhu(jieGou: FuPanJSONJieGou): FuPanPiZhu[] {
  if (!Array.isArray(jieGou.pi_zhu)) return []
  const jieGuo: FuPanPiZhu[] = []
  for (const xiang of jieGou.pi_zhu) {
    if (!xiang || typeof xiang !== 'object') continue
    const xuHao = Number(xiang.xu_hao)
    const pingLun = zhuanHuanWeiWenBen(xiang.ping_lun).trim()
    if (!Number.isFinite(xuHao) || xuHao < 1 || !pingLun) continue
    jieGuo.push({ xu_hao: Math.floor(xuHao), ping_lun: pingLun })
    if (jieGuo.length >= FU_PAN_MAX_PI_ZHU) break
  }
  return jieGuo
}

export async function shengChengFuPan(
  yong_hu_id: string,
  jiao_se_id: string,
  dang_an_id: string,
): Promise<FuPanShengChengJieGuo> {
  const xiaoXiJieGuo = await huoQuXiaoXiLieBiao({
    yong_hu_id,
    jiao_se_id,
    ye_ma: 1,
    mei_ye_tiao_shu: FU_PAN_MAX_XIAO_XI,
  })

  const xiaoXiLieBiao = xiaoXiJieGuo.lie_biao
    .filter((xiaoXi) => xiaoXi.fa_song_zhe_lei_xing !== 'xitong')
    .reverse()
    .map((xiaoXi) => ({
      fa_song_zhe: xiaoXi.fa_song_zhe_lei_xing === 'jiaose' ? '对方' : '你',
      nei_rong: xiaoXi.nei_rong,
      shi_jian: geShiHuaShiJian(xiaoXi.shi_jian_chuo),
      yi_che_hui: xiaoXi.yi_che_hui,
      yuan_shi_nei_rong: xiaoXi.yuan_shi_nei_rong,
    }))

  const prompt = gouJianFuPanPrompt(xiaoXiLieBiao)

  const xiangYing = await genJuPeiZhiTiaoYong('fuPanShengCheng', [
    { jiaoSe: 'system', neiRong: '帮朋友复盘一段恋爱模拟聊天，只输出 JSON。' },
    { jiaoSe: 'user', neiRong: prompt },
  ])

  const jieGou = jieXiJSONXiangYing(xiangYing.neiRong)
  const zongJie = shengChengFuPanZongJie(jieGou) || xiangYing.neiRong.trim()
  const piZhu = zhuanHuanPiZhu(jieGou)

  const jieGuo: FuPanShengChengJieGuo = {
    fu_pan_nei_rong: zongJie,
    fu_pan_shi_jian_xian: [],
    fu_pan_pi_zhu: piZhu,
  }

  await gengXinFuPanNeiRong(dang_an_id, jieGuo.fu_pan_nei_rong, jieGuo.fu_pan_pi_zhu)

  return jieGuo
}

function geShiHuaShiJian(shi_jian_chuo: number): string {
  if (shi_jian_chuo === null || shi_jian_chuo === undefined) return ''
  const shuZhi = Number(shi_jian_chuo)
  if (!Number.isFinite(shuZhi) || shuZhi <= 0) return ''
  const shi_jian = new Date(shuZhi)
  if (Number.isNaN(shi_jian.getTime())) return ''
  const xiao_shi = String(shi_jian.getHours()).padStart(2, '0')
  const fen_zhong = String(shi_jian.getMinutes()).padStart(2, '0')
  return `${xiao_shi}:${fen_zhong}`
}
