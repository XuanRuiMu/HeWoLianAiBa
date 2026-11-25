import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import { AI配置 } from '../config/AI配置'

export interface HuiXiangDuanLuo {
  发送者: 'yonghu' | 'jiaose'
  创建时间: string
  顺序: number
  内容: string
  已撤回: boolean
}

export interface HuiXiangJieGuo {
  zhaoDao: boolean
  yuanWen: string[]
  buZu: boolean
  shuangFang: boolean
  duanLuo?: HuiXiangDuanLuo[]
}

const ZuiDaDuanLuo = AI配置.huiXiang.zuiDaDuanLuo
const MeiDuanZuiDaZiShu = AI配置.huiXiang.meiDuanZuiDaZiShu
const ZuiDaCiShu = AI配置.huiXiang.zuiDaCiShu

// 常见无实义的回溯触发词，单独成词对检索没有帮助
const ChuFaCiHeiMingDan = new Set([
  '之前', '以前', '上次', '刚才', '刚刚', '那天', '那次', '当时', '记得',
  '说过', '说的', '说过', '约好', '说好', '忘了', '忘记', '提过', '聊过',
  '想起来', '想起', '我们', '你们', '咱们', '那个', '这个',
])

function chaiFenCiZu(chaXun: string): string[] {
  const qingLi = String(chaXun ?? '')
    .replace(/[，。！？、：；「」『』（）()【】\[\]{}"'`~～\s]/g, ' ')
    .trim()
  if (qingLi === '') return []
  const ciZu = new Set<string>()
  const push = (ci: string): void => {
    if (ciZu.size >= ZuiDaCiShu) return
    if (ci.length < 2) return
    if (ChuFaCiHeiMingDan.has(ci)) return
    ciZu.add(ci)
  }
  for (const ciFu of qingLi.split(' ')) {
    const zhengLi = ciFu.trim()
    if (zhengLi.length < 2) continue
    const zi = Array.from(zhengLi)
    if (zi.length <= 6) push(zhengLi)
    for (let qi = 0; qi < zi.length - 1; qi += 1) {
      const erZi = `${zi[qi]}${zi[qi + 1]}`
      if (erZi.trim().length < 2) continue
      push(erZi)
      if (ciZu.size >= ZuiDaCiShu) break
    }
    if (ciZu.size >= ZuiDaCiShu) break
  }
  return [...ciZu]
}

export interface HuiXiangChaXunYuJu {
  yuJu: string
  canShu: unknown[]
}

export function gouZaoHuiXiangChaXun(
  yongHuId: string,
  jiaoSeId: string,
  ciZu: string[],
): HuiXiangChaXunYuJu {
  const ci = [...new Set(ciZu.map((ci) => String(ci ?? '').trim()).filter((ci) => ci.length >= 2))].slice(0, ZuiDaCiShu)
  const canShu: unknown[] = [yongHuId, jiaoSeId]
  const tiaoJian: string[] = []
  for (const [xuHao, ciWei] of ci.entries()) {
    const zhanWei = xuHao + 3
    canShu.push(`%${ciWei}%`)
    tiaoJian.push(`COALESCE("内容", '') ILIKE $${zhanWei} OR COALESCE("原始内容", '') ILIKE $${zhanWei}`)
  }
  const paiHangZhanWei = ci.length + 3
  const zuiZhongZhanWei = ci.length + 4
  canShu.push(AI配置.huiXiang.shuangFangMeiCeTiaoShu, ZuiDaDuanLuo)
  const guoLv = tiaoJian.length === 0 ? '' : ` AND (${tiaoJian.join(' OR ')})`
  const pingFen = tiaoJian.length === 0
    ? '0'
    : tiaoJian.map((_, xuHao) => `CASE WHEN COALESCE("内容", '') ILIKE $${xuHao + 3} OR COALESCE("原始内容", '') ILIKE $${xuHao + 3} THEN 1 ELSE 0 END`).join(' + ')

  const yuJu = `WITH "评分" AS (
    SELECT "ID", "发送者", "创建时间", "已撤回", "客户端序号",
      COALESCE(NULLIF(BTRIM("原始内容"), ''), "内容") AS "回想文本",
      (${pingFen}) AS "匹配分"
    FROM "消息"
    WHERE "用户ID" = $1 AND "角色ID" = $2
      AND "发送者" IN ('yonghu', 'jiaose')
      AND COALESCE("类型", 'wenBen') IN ('wenben', 'wenBen')
      AND (COALESCE(BTRIM("内容"), '') <> '' OR COALESCE(BTRIM("原始内容"), '') <> '')${guoLv}
  ), "双方命中" AS (
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY "发送者"
      ORDER BY "匹配分" DESC, "创建时间" DESC, "客户端序号" DESC NULLS LAST, "ID" DESC
    ) AS "位次"
    FROM "评分"
    WHERE "匹配分" > 0
  )
  SELECT "ID", "发送者", "创建时间", "已撤回", "客户端序号", "回想文本", "匹配分", "位次"
  FROM "双方命中"
  WHERE "位次" <= $${paiHangZhanWei}
  ORDER BY "匹配分" DESC, "创建时间" DESC, "客户端序号" DESC NULLS LAST, "ID" DESC
  LIMIT $${zuiZhongZhanWei}`

  return { yuJu, canShu }
}

export async function huiXiangLiShiYuanWen(
  yongHuId: string,
  jiaoSeId: string,
  chaXun: string,
): Promise<HuiXiangJieGuo> {
  const ciZu = chaiFenCiZu(chaXun)
  if (!yongHuId || !jiaoSeId || ciZu.length === 0) {
    return { zhaoDao: false, yuanWen: [], buZu: true, shuangFang: false, duanLuo: [] }
  }

  try {
    const { yuJu, canShu } = gouZaoHuiXiangChaXun(yongHuId, jiaoSeId, ciZu)
    const jieGuo = await 数据库.query(yuJu, canShu)
    const duanLuo: HuiXiangDuanLuo[] = []
    const yiJian = new Set<string>()

    for (const hang of jieGuo.rows) {
      const faSongZhe = String(hang['发送者'] ?? '')
      if (faSongZhe !== 'yonghu' && faSongZhe !== 'jiaose') continue
      const neiRong = String(hang['回想文本'] ?? '').trim()
      if (neiRong === '') continue
      const zhengShi = new Date(String(hang['创建时间'] ?? ''))
      if (!Number.isFinite(zhengShi.getTime())) continue
      const xuHao = Number(hang['客户端序号'] ?? 0)
      const quChongJian = `${faSongZhe}|${neiRong}`
      if (yiJian.has(quChongJian)) continue
      yiJian.add(quChongJian)
      duanLuo.push({
        发送者: faSongZhe,
        创建时间: zhengShi.toISOString(),
        顺序: Number.isFinite(xuHao) ? xuHao : 0,
        内容: neiRong.length > MeiDuanZuiDaZiShu ? `${neiRong.slice(0, MeiDuanZuiDaZiShu)}…` : neiRong,
        已撤回: hang['已撤回'] === true || hang['已撤回'] === 'true',
      })
      if (duanLuo.length >= ZuiDaDuanLuo) break
    }

    duanLuo.sort((jia, yi) => jia.创建时间.localeCompare(yi.创建时间) || jia.顺序 - yi.顺序)
    const yuanWen = duanLuo.map((hang) =>
      `${hang.发送者 === 'yonghu' ? 'TA' : '你'}${hang.已撤回 ? '（已撤回）' : ''}: ${hang.内容}`,
    )
    const youYongHu = duanLuo.some((hang) => hang.发送者 === 'yonghu')
    const youJiaoSe = duanLuo.some((hang) => hang.发送者 === 'jiaose')
    return {
      zhaoDao: yuanWen.length > 0,
      yuanWen,
      buZu: yuanWen.length === 0,
      shuangFang: youYongHu && youJiaoSe,
      duanLuo,
    }
  } catch (cuoWu) {
    debug日志.warn('历史回想', '检索历史消息失败，按查无处理', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
    return { zhaoDao: false, yuanWen: [], buZu: true, shuangFang: false, duanLuo: [] }
  }
}
