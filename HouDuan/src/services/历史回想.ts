import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'

export interface HuiXiangJieGuo {
  zhaoDao: boolean
  yuanWen: string[]
  buZu: boolean
}

const ZuiDaDuanLuo = 12
const MeiDuanZuiDaZiShu = 120

function chaiFenCiZu(chaXun: string): string[] {
  const qingLi = chaXun.replace(/[，。！？、：；「」『』（）()【】\[\]{}"'`~～\s]/g, ' ')
  return qingLi
    .split(' ')
    .map((ci) => ci.trim())
    .filter((ci) => ci.length >= 2)
    .slice(0, 8)
}

export async function huiXiangLiShiYuanWen(
  yongHuId: string,
  jiaoSeId: string,
  chaXun: string,
): Promise<HuiXiangJieGuo> {
  const ciZu = chaiFenCiZu(chaXun)
  if (ciZu.length === 0) {
    return { zhaoDao: false, yuanWen: [], buZu: true }
  }

  try {
    const tiaoJian = ciZu.map((_, xuHao) => `("内容" ILIKE $${xuHao + 3} OR "内容" ILIKE $${xuHao + 3})`).join(' OR ')
    const canShu: unknown[] = [yongHuId, jiaoSeId, false]
    for (const ci of ciZu) canShu.push(`%${ci}%`)

    const jieGuo = await 数据库.query(
      `SELECT "内容", "创建时间" FROM "消息"
       WHERE "用户ID" = $1 AND "角色ID" = $2 AND "已撤回" = $3 AND (${tiaoJian})
       ORDER BY "创建时间" DESC
       LIMIT 40`,
      canShu,
    )

    const yuanWen = jieGuo.rows
      .map((hang) => String(hang['内容'] || '').trim())
      .filter((wen) => wen !== '')
      .slice(0, ZuiDaDuanLuo)
      .map((wen) => (wen.length > MeiDuanZuiDaZiShu ? `${wen.slice(0, MeiDuanZuiDaZiShu)}…` : wen))

    const quChong = [...new Set(yuanWen)]
    return { zhaoDao: quChong.length > 0, yuanWen: quChong, buZu: quChong.length === 0 }
  } catch (cuoWu) {
    debug日志.warn('历史回想', '检索历史消息失败，按查无处理', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
    return { zhaoDao: false, yuanWen: [], buZu: true }
  }
}
