import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { AI配置 } from '../config/AI配置'
import { 按配置调用 } from '../utils/DeepSeek客户端'
import { gouJianJiYiZhaiYaoPrompt, JiYiZhuRuYueShu } from './Prompt构建器'
import { huoQuFanYi } from '../config/translations'

export interface DuiHuaZhaiYaoJiLu {
  zhaiYaoNeiRong: string
  gaiKuoXiaoXiShu: number
  gengXinShiJian: string | null
  suCaiMaoDian?: string | null
}

function huoQuZhaiYaoPeiZhi(): { zuiDaZiFu: number; chuFaXiaoXiShu: number; yuanLiaoXiaoXiShu: number; suoTtlMiao: number } {
  const zhaiYao = AI配置.zhaiYao
  return {
    zuiDaZiFu: zhaiYao.zuiDaZiFu,
    chuFaXiaoXiShu: zhaiYao.chuFaXiaoXiShu,
    yuanLiaoXiaoXiShu: zhaiYao.yuanLiaoXiaoXiShu,
    suoTtlMiao: zhaiYao.suoTtlMiao,
  }
}
const ZhaiYaoRedisJianQianZhui = 'dui_hua_zhai_yao_sheng_cheng_zhong:'

export function qieDuanZhaiYao(neiRong: string): string {
  const qingLi = (neiRong || '').trim()
  const zuiDaZiFu = huoQuZhaiYaoPeiZhi().zuiDaZiFu
  if (qingLi.length <= zuiDaZiFu) return qingLi
  let jieGuo = ''
  for (const hang of qingLi.split('\n')) {
    const xia = jieGuo ? `${jieGuo}\n${hang}` : hang
    if (xia.length > zuiDaZiFu) break
    jieGuo = xia
  }
  return jieGuo || qingLi.slice(0, zuiDaZiFu)
}

export async function duQuDuiHuaZhaiYao(用户ID: string, jiaoSeId: string): Promise<DuiHuaZhaiYaoJiLu | null> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT "摘要内容", "概括消息数", "更新时间", "素材锚点时间" FROM "对话摘要" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
      [用户ID, jiaoSeId],
    )
    if (jieGuo.rows.length === 0) return null
    const hang = jieGuo.rows[0]
    const neiRong = String(hang.摘要内容 || '').trim()
    if (!neiRong) return null
    return {
      zhaiYaoNeiRong: neiRong,
      gaiKuoXiaoXiShu: Number(hang.概括消息数 || 0),
      gengXinShiJian: hang.更新时间 ? String(hang.更新时间) : null,
      suCaiMaoDian: hang.素材锚点时间 ? new Date(hang.素材锚点时间).toISOString() : null,
    }
  } catch (cuoWu) {
    debug日志.error('对话摘要', '读取对话摘要失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return null
  }
}

export function gouJianZhaiYaoZhuRuWenBen(zhaiYao: DuiHuaZhaiYaoJiLu | null): string {
  if (!zhaiYao || !zhaiYao.zhaiYaoNeiRong) return ''
  return `【此前的记忆摘要】\n${JiYiZhuRuYueShu}\n${zhaiYao.zhaiYaoNeiRong}`
}

const TongBuHuanCun = new Map<string, string>()
const TongBuHuanCunZuiDa = 500

function huoQuTongBuJian(用户ID: string, jiaoSeId: string): string {
  return `${用户ID}:${jiaoSeId}`
}

export function huanCunTongBuZhaiYao(用户ID: string, jiaoSeId: string, zhuRuWenBen: string): void {
  const jian = huoQuTongBuJian(用户ID, jiaoSeId)
  if (!zhuRuWenBen) {
    TongBuHuanCun.delete(jian)
    return
  }
  if (!TongBuHuanCun.has(jian) && TongBuHuanCun.size >= TongBuHuanCunZuiDa) {
    const shouJian = TongBuHuanCun.keys().next().value
    if (shouJian !== undefined) TongBuHuanCun.delete(shouJian)
  }
  TongBuHuanCun.set(jian, zhuRuWenBen)
}

export function duQuTongBuZhaiYao(用户ID: string, jiaoSeId: string): string {
  return TongBuHuanCun.get(huoQuTongBuJian(用户ID, jiaoSeId)) ?? ''
}

async function huoQuXiaoXiZongShu(用户ID: string, jiaoSeId: string, maoDian?: string | null): Promise<number> {
  const jieGuo = await 数据库.query(
    `SELECT COUNT(*) AS zong_shu FROM "消息"
     WHERE "用户ID" = $1 AND "角色ID" = $2
       AND ($3::timestamptz IS NULL OR "创建时间" > $3::timestamptz)`,
    [用户ID, jiaoSeId, maoDian ?? null],
  )
  return Number(jieGuo.rows[0]?.zong_shu || 0)
}

async function huoQuZhaiYaoYuanLiao(
  用户ID: string,
  jiaoSeId: string,
  maoDian?: string | null,
): Promise<{ wenBen: string; xinMaoDian: string | null }> {
  const yuanLiaoShu = huoQuZhaiYaoPeiZhi().yuanLiaoXiaoXiShu
  const jieGuo = await 数据库.query(
    `SELECT "内容", "发送者", "创建时间" FROM "消息"
     WHERE "用户ID" = $1 AND "角色ID" = $2
       AND ($3::timestamptz IS NULL OR "创建时间" > $3::timestamptz)
     ORDER BY "创建时间" ASC
     LIMIT $4`,
    [用户ID, jiaoSeId, maoDian ?? null, yuanLiaoShu],
  )
  const wenBen = jieGuo.rows
    .map((hang, xuHao) => `${xuHao + 1}. [${hang.发送者 === 'yonghu' ? '用户' : '角色'}] ${String(hang.内容 || '').slice(0, 200)}`)
    .join('\n')
  const weiYi = jieGuo.rows[jieGuo.rows.length - 1]?.创建时间
  return { wenBen, xinMaoDian: weiYi ? new Date(weiYi).toISOString() : null }
}

export async function shengChengBingLuoKuZhaiYao(用户ID: string, jiaoSeId: string, jiaoSeMing: string): Promise<boolean> {
  const peiZhi = huoQuZhaiYaoPeiZhi()
  const suoJian = `${ZhaiYaoRedisJianQianZhui}${用户ID}:${jiaoSeId}`
  try {
    const qiangZhan = await redis.set(suoJian, '1', 'EX', peiZhi.suoTtlMiao, 'NX')
    if (qiangZhan !== 'OK') return false
  } catch {
    return false
  }
  try {
    const zongShu = await huoQuXiaoXiZongShu(用户ID, jiaoSeId)
    if (zongShu < peiZhi.chuFaXiaoXiShu) return true
    const xianYou = await duQuDuiHuaZhaiYao(用户ID, jiaoSeId)
    const maoDian = xianYou?.suCaiMaoDian ?? null
    const daiGaiShu = await huoQuXiaoXiZongShu(用户ID, jiaoSeId, maoDian)
    if (daiGaiShu < peiZhi.chuFaXiaoXiShu) return true
    const { wenBen: yuanLiao, xinMaoDian } = await huoQuZhaiYaoYuanLiao(用户ID, jiaoSeId, maoDian)
    if (!yuanLiao.trim()) return true
    const xiangYing = await 按配置调用('JiYiZhaiYao', [
      { jiaoSe: 'system', neiRong: '把聊天记录里值得记住的东西串成几句话，只输出摘要正文。' },
      { jiaoSe: 'user', neiRong: gouJianJiYiZhaiYaoPrompt(yuanLiao, jiaoSeMing, xianYou?.zhaiYaoNeiRong || '') },
    ])
    const zhaiYao = qieDuanZhaiYao(xiangYing.neiRong)
    if (zhaiYao === '' && xianYou?.zhaiYaoNeiRong) return true
    if (!zhaiYao) return true
    await 数据库.query(
      `INSERT INTO "对话摘要" ("用户ID", "角色ID", "摘要内容", "概括消息数", "素材锚点时间", "更新时间")
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET
         "摘要内容" = EXCLUDED."摘要内容",
         "概括消息数" = EXCLUDED."概括消息数",
         "素材锚点时间" = EXCLUDED."素材锚点时间",
         "更新时间" = NOW()`,
      [用户ID, jiaoSeId, zhaiYao, zongShu, xinMaoDian],
    )
    return true
  } catch (cuoWu) {
    debug日志.error('对话摘要', huoQuFanYi('AI', 'JiYiZhaiYaoShiBai'), { xiang_qing: { cuo_wu: String(cuoWu) } })
    return false
  }
}
