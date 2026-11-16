import { debug日志 } from '../utils/debug日志'
import { 按配置调用 } from '../utils/DeepSeek客户端'
import type { 参数上下文 } from '../config/AI参数策略'
import { RiChengDuan, RiChengZhuangTai, zhengZeRiQi, xieRuRiCheng, duQuRiCheng } from './角色日程'

const RiZhiLeiXing = '日程生成'

const ZhouMing: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
}

export interface RiChengJiaoSe {
  ming_zi?: string
  shen_fen?: string
  zhi_ye?: string
  nian_ling?: number
  xi_hao?: string[]
  cheng_shi?: string
}

export function gouJianRiChengPrompt(jiaoSe: RiChengJiaoSe, xingQi: number): string {
  const zhou = ZhouMing[xingQi] || '周一'
  const shiMoZhou = xingQi === 6 || xingQi === 7
  const hao = (jiaoSe.xi_hao || []).filter((x) => x.trim() !== '').slice(0, 4)
  const hang = [
    `${jiaoSe.ming_zi || '她'}是${jiaoSe.shen_fen || '大学生'}，${jiaoSe.nian_ling || 20}岁${jiaoSe.cheng_shi ? `，在${jiaoSe.cheng_shi}` : ''}`,
    jiaoSe.zhi_ye ? `工作/专业：${jiaoSe.zhi_ye}` : '',
    hao.length > 0 ? `爱好：${hao.join('、')}` : '',
  ].filter((行) => 行 !== '')

  return [
    '给这个角色排一张今天的日程表。',
    hang.join('。'),
    `今天是${zhou}${shiMoZhou ? '（周末，跟工作日不一样）' : '（工作日）'}。`,
    '要求：',
    '· 排 8 到 12 段，覆盖早上起床到晚上睡觉，不要空出大段白天没说干嘛。',
    '· 每段是「几点几分 在干什么」，不要写成日程规划、不要写解释。',
    '· 具体、日常一点。上课就写「上课」或「在上XX课」，吃饭就写「吃饭」，别写「享受生活」「提升自我」这种空话。',
    '· 上课、开会、工作、睡觉这些时段，手机是不方便回的。',
    '· 中间要有空隙：课间、吃饭、通勤路上、睡前躺床上刷手机。',
    '· 排的内容必须是这个人设真的会做的事，不要排跟她无关的活动。',
    '· 不要排「和你聊天」「回复你消息」「等你消息」这种。',
    '',
    '输出格式：只输出 JSON 数组，每项形如 {"shi_jian":"07:30","huo_dong":"起床洗漱"}。',
  ].join('\n')
}

export function jieXiRiChengShuZu(yuanWen: string): RiChengDuan[] {
  const qingLi = yuanWen
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  try {
    const zhi = JSON.parse(qingLi) as unknown
    const yuan = zhi as Record<string, unknown>
    let lieBiao: unknown[] = []
    if (Array.isArray(zhi)) lieBiao = zhi
    else if (Array.isArray(yuan?.schedule)) lieBiao = yuan.schedule as unknown[]
    else if (Array.isArray(yuan?.riCheng)) lieBiao = yuan.riCheng as unknown[]
    else if (typeof yuan?.shi_jian === 'string' || typeof yuan?.time === 'string') lieBiao = [yuan]
    const jieGuo: RiChengDuan[] = []
    for (const xiang of lieBiao) {
      if (typeof xiang !== 'object' || xiang === null) continue
      const kuai = xiang as Record<string, unknown>
      const shiJian = String(kuai.shi_jian ?? kuai.time ?? '').trim()
      const huoDong = String(kuai.huo_dong ?? kuai.activity ?? '').trim()
      if (!/^\d{1,2}:\d{2}$/.test(shiJian)) continue
      if (huoDong === '') continue
      jieGuo.push({ shiJian, huoDong })
    }
    return jieGuo
  } catch (错误) {
    debug日志.warn(RiZhiLeiXing, '日程 JSON 解析失败', { xiang_qing: { cuo_wu: String(错误) } })
    return []
  }
}

export async function shengChengBingLuoKuRiCheng(
  jiaoSeId: string,
  jiaoSe: RiChengJiaoSe,
  shiQu: string,
  shangXiaWen?: 参数上下文,
): Promise<boolean> {
  const riQi = zhengZeRiQi(new Date(), shiQu)
  if (riQi.riQi === '') return false

  try {
    const xiangYing = await 按配置调用('QingGanFenXi', [
      { jiaoSe: 'system', neiRong: '你给角色排日程，只输出 JSON 数组。' },
      { jiaoSe: 'user', neiRong: gouJianRiChengPrompt(jiaoSe, riQi.xingQi) },
    ], shangXiaWen)

    const duanLu = jieXiRiChengShuZu(xiangYing.neiRong)
    if (duanLu.length === 0) {
      debug日志.warn(RiZhiLeiXing, '日程为空', { xiang_qing: { jiao_se_id: jiaoSeId } })
      return false
    }
    return xieRuRiCheng(jiaoSeId, riQi.riQi, riQi.xingQi, duanLu)
  } catch (错误) {
    debug日志.error(RiZhiLeiXing, '日程生成失败', {
      xiang_qing: { jiao_se_id: jiaoSeId, cuo_wu: String(错误) },
    })
    return false
  }
}

export async function huoQuJinRiRiCheng(
  jiaoSeId: string,
  jiaoSe: RiChengJiaoSe,
  shiQu: string,
  shangXiaWen?: 参数上下文,
): Promise<RiChengZhuangTai | null> {
  const riQi = zhengZeRiQi(new Date(), shiQu)
  if (riQi.riQi === '') return null
  const yiYou = await duQuRiCheng(jiaoSeId, riQi.riQi, riQi.xingQi)
  if (yiYou) return yiYou
  await shengChengBingLuoKuRiCheng(jiaoSeId, jiaoSe, shiQu, shangXiaWen)
  return duQuRiCheng(jiaoSeId, riQi.riQi, riQi.xingQi)
}