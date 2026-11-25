import { debug日志 } from '../utils/debug日志'
import { souSuoWangYe, zhuaQuWangYe, type WangYeSouSuoTiaoMu } from './DeepSeek官方工具'

const RiZhiLeiXing = '联网搜索'

const HuanCunQianZhui = 'lian_wang_sou_suo:'
const HuanCunYouXiaoMiao = 30 * 60 * 1000
const neiCunHuanCun = new Map<string, string>()

const XuYaoLianWangTeZheng: RegExp[] = [
  /最近|最新|今天|昨天|刚刚|这几天|目前|现在|今年|最近几年|上个月|这个月/,
  /新闻|热搜|热点|比分|赛事|战绩|排名|榜单|股价|汇率|天气|气温|降水/,
  /发布|上线|版本|更新|公告|活动|机票|火车票|日程|赛程|上映/,
  /谁赢了|结果如何|最新消息|发生了什么|有什么新|官方说|官网|一手/,
]

const BuXuYaoLianWangTeZheng: RegExp[] = [
  /你觉得|你认为|你感觉|你喜欢|你讨厌|你的心情|你陪我|哄哄我|抱抱我|亲亲我/,
  /我是谁|你是谁|我们聊过|你记得吗|刚才|上一句|你刚说|我说过/,
  /角色扮演|人设|剧本|设定|梦到|想象/,
]

export function panDuanXuYaoLianWang(xiaoXi: string): boolean {
  const wenBen = String(xiaoXi || '').trim()
  if (wenBen.length < 4) return false
  if (wenBen.length > 500) return false
  if (BuXuYaoLianWangTeZheng.some((m) => m.test(wenBen))) return false
  return XuYaoLianWangTeZheng.some((m) => m.test(wenBen))
}

function huanCunJian(xiaoXi: string): string {
  const qingXi = xiaoXi.replace(/\s+/g, ' ').trim().toLowerCase()
  return `${HuanCunQianZhui}${qingXi}`
}

async function duHuanCun(xiaoXi: string): Promise<string | null> {
  const jian = huanCunJian(xiaoXi)
  const neiCun = neiCunHuanCun.get(jian)
  if (neiCun !== undefined) return neiCun
  try {
    const { redis } = await import('../redis')
    const zhi = await redis.get(jian)
    if (zhi) {
      neiCunHuanCun.set(jian, zhi)
      return zhi
    }
  } catch {
    /* 缓存失败不阻断 */
  }
  return null
}

async function xieHuanCun(xiaoXi: string, zhuRu: string): Promise<void> {
  const jian = huanCunJian(xiaoXi)
  neiCunHuanCun.set(jian, zhuRu)
  try {
    const { redis } = await import('../redis')
    await redis.setex(jian, Math.round(HuanCunYouXiaoMiao / 1000), zhuRu)
  } catch {
    /* 缓存失败不阻断 */
  }
}

function yaSuoTiaoMu(tiaoMu: WangYeSouSuoTiaoMu[]): string {
  return tiaoMu
    .slice(0, 5)
    .map((xiang, i) => {
      const b = [`${i + 1}. ${xiang.title}`]
      if (xiang.date) b.push(`日期：${xiang.date.slice(0, 10)}`)
      b.push(`来源：${xiang.site_name || xiang.url}`)
      if (xiang.summary) b.push(`摘要：${xiang.summary.slice(0, 220)}`)
      return b.join('\n')
    })
    .join('\n\n')
}

function pinZhuRu(wenBen: string): string {
  return [
    '【实时联网信息】',
    '以下是刚从网上搜索到的资料，可能包含最新事实。回答时可参考，但要用自己的口气说出来；',
    '不确定的部分不要编。如果资料与问题无关，就当没看到，按正常聊天回。',
    wenBen,
  ].join('\n')
}

export async function huoQuLianWangSouSuoZhuRu(
  yongHuXiaoXi: string,
  shiFouDiYiLun: boolean,
): Promise<string> {
  if (process.env.VITEST === 'true') return ''
  const qiYong = (process.env['LIAN_WANG_SOU_SUO_QI_YONG'] || 'true').trim().toLowerCase() !== 'false'
  if (!qiYong) return ''
  if (shiFouDiYiLun) return ''
  const xiaoXi = String(yongHuXiaoXi || '').trim()
  if (!panDuanXuYaoLianWang(xiaoXi)) return ''
  const huanCun = await duHuanCun(xiaoXi)
  if (huanCun) return huanCun
  const jieGuo = await souSuoWangYe({ query: xiaoXi.slice(0, 128), tiaoShu: 5, yuanShiWenTi: xiaoXi })
  if (!jieGuo.cheng_gong || jieGuo.tiaoMu.length === 0) {
    debug日志.warn(RiZhiLeiXing, '搜索无结果或失败，本轮不注入', { xiang_qing: { ti_shi: jieGuo.ti_shi || '' } })
    return ''
  }
  const zhuRu = pinZhuRu(yaSuoTiaoMu(jieGuo.tiaoMu))
  await xieHuanCun(xiaoXi, zhuRu)
  debug日志.info(RiZhiLeiXing, '联网搜索注入完成', {
    xiang_qing: { tiao_shu: jieGuo.tiaoMu.length, shou_tiao: jieGuo.tiaoMu[0]?.title || '' },
  })
  return zhuRu
}

export async function zhuaQuWangYeNeiRong(url: string): Promise<{ cheng_gong: boolean; title: string; neiRong: string }> {
  return await zhuaQuWangYe(url)
}
