import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { AI_PEI_ZHI } from '../config/AI配置'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianJiYiZhaiYaoPrompt, JI_YI_ZHU_RU_YUE_SHU } from './Prompt构建器'
import { huoQuFanYi } from '../config/translations'

export interface DuiHuaZhaiYaoJiLu {
  zhaiYaoNeiRong: string
  gaiKuoXiaoXiShu: number
  gengXinShiJian: string | null
  /** 已概括素材的最后一条消息创建时间；增量取材锚点，空＝从头开始 */
  suCaiMaoDian?: string | null
}

// YH-033/YH-038 统一口径：摘要字数上限与触发阈值走 AI_PEI_ZHI 唯一出处，禁硬编码
function huoQuZhaiYaoPeiZhi(): { zuiDaZiFu: number; chuFaXiaoXiShu: number; yuanLiaoXiaoXiShu: number; suoTtlMiao: number } {
  const zhaiYao = AI_PEI_ZHI.zhaiYao
  return {
    zuiDaZiFu: zhaiYao.zuiDaZiFu,
    chuFaXiaoXiShu: zhaiYao.chuFaXiaoXiShu,
    yuanLiaoXiaoXiShu: zhaiYao.yuanLiaoXiaoXiShu,
    suoTtlMiao: zhaiYao.suoTtlMiao,
  }
}
const ZHAI_YAO_REDIS_JIAN_QIAN_ZHUI = 'dui_hua_zhai_yao_sheng_cheng_zhong:'

/**
 * 记忆是「一行一个字段」的事实卡，超上限时按整行丢：从中间腰斩会留下「承诺：下周末带你去」
 * 这种被模型当既成事实复读的残行，比少记一个字段严重得多。
 */
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

export async function duQuDuiHuaZhaiYao(yongHuId: string, jiaoSeId: string): Promise<DuiHuaZhaiYaoJiLu | null> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT "摘要内容", "概括消息数", "更新时间", "素材锚点时间" FROM "对话摘要" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
      [yongHuId, jiaoSeId],
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
  // FP-08：摘要正文是 LLM 自由文本，不带约束前缀就会被当本轮事实复读（「你又发狗头」类臆造的第三源）
  return `【此前的记忆摘要】\n${JI_YI_ZHU_RU_YUE_SHU}\n${zhaiYao.zhaiYaoNeiRong}`
}

const TONG_BU_HUAN_CUN = new Map<string, string>()
const TONG_BU_HUAN_CUN_ZUI_DA = 500

function huoQuTongBuJian(yongHuId: string, jiaoSeId: string): string {
  return `${yongHuId}:${jiaoSeId}`
}

export function huanCunTongBuZhaiYao(yongHuId: string, jiaoSeId: string, zhuRuWenBen: string): void {
  const jian = huoQuTongBuJian(yongHuId, jiaoSeId)
  if (!zhuRuWenBen) {
    TONG_BU_HUAN_CUN.delete(jian)
    return
  }
  if (!TONG_BU_HUAN_CUN.has(jian) && TONG_BU_HUAN_CUN.size >= TONG_BU_HUAN_CUN_ZUI_DA) {
    const shouJian = TONG_BU_HUAN_CUN.keys().next().value
    if (shouJian !== undefined) TONG_BU_HUAN_CUN.delete(shouJian)
  }
  TONG_BU_HUAN_CUN.set(jian, zhuRuWenBen)
}

export function duQuTongBuZhaiYao(yongHuId: string, jiaoSeId: string): string {
  return TONG_BU_HUAN_CUN.get(huoQuTongBuJian(yongHuId, jiaoSeId)) ?? ''
}

async function huoQuXiaoXiZongShu(yongHuId: string, jiaoSeId: string, maoDian?: string | null): Promise<number> {
  const jieGuo = await 数据库.query(
    `SELECT COUNT(*) AS zong_shu FROM "消息"
     WHERE "用户ID" = $1 AND "角色ID" = $2
       AND ($3::timestamptz IS NULL OR "创建时间" > $3::timestamptz)`,
    [yongHuId, jiaoSeId, maoDian ?? null],
  )
  return Number(jieGuo.rows[0]?.zong_shu || 0)
}

/**
 * 增量取材：只取「素材锚点之后」的 yuanLiaoXiaoXiShu 条。
 * 旧实现是 ORDER BY 创建时间 ASC LIMIT 60 且无游标 ⇒ 无论聊多久，素材永远停在开场 60 条，
 * 摘要不前进还每 40 条白花一次调用。锚点为空（首次）时等价于从最早开始。
 */
async function huoQuZhaiYaoYuanLiao(
  yongHuId: string,
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
    [yongHuId, jiaoSeId, maoDian ?? null, yuanLiaoShu],
  )
  const wenBen = jieGuo.rows
    .map((hang, xuHao) => `${xuHao + 1}. [${hang.发送者 === 'yonghu' ? '用户' : '角色'}] ${String(hang.内容 || '').slice(0, 200)}`)
    .join('\n')
  const weiYi = jieGuo.rows[jieGuo.rows.length - 1]?.创建时间
  return { wenBen, xinMaoDian: weiYi ? new Date(weiYi).toISOString() : null }
}

export async function shengChengBingLuoKuZhaiYao(yongHuId: string, jiaoSeId: string, jiaoSeMing: string): Promise<boolean> {
  const peiZhi = huoQuZhaiYaoPeiZhi()
  const suoJian = `${ZHAI_YAO_REDIS_JIAN_QIAN_ZHUI}${yongHuId}:${jiaoSeId}`
  try {
    const qiangZhan = await redis.set(suoJian, '1', 'EX', peiZhi.suoTtlMiao, 'NX')
    if (qiangZhan !== 'OK') return false
  } catch {
    return false
  }
  try {
    const zongShu = await huoQuXiaoXiZongShu(yongHuId, jiaoSeId)
    if (zongShu < peiZhi.chuFaXiaoXiShu) return true
    const xianYou = await duQuDuiHuaZhaiYao(yongHuId, jiaoSeId)
    // 触发口径改为「锚点之后还有多少条没被概括」：总条数会因 30 天清理而倒退，
    // 用旧的 zongShu - 概括消息数 判断会让摘要在清理后彻底不再刷新。
    const maoDian = xianYou?.suCaiMaoDian ?? null
    const daiGaiShu = await huoQuXiaoXiZongShu(yongHuId, jiaoSeId, maoDian)
    if (daiGaiShu < peiZhi.chuFaXiaoXiShu) return true
    const { wenBen: yuanLiao, xinMaoDian } = await huoQuZhaiYaoYuanLiao(yongHuId, jiaoSeId, maoDian)
    if (!yuanLiao.trim()) return true
    const xiangYing = await genJuPeiZhiTiaoYong('jiYiZhaiYao', [
      { jiaoSe: 'system', neiRong: '把聊天记录里值得记住的东西串成几句话，只输出摘要正文。' },
      { jiaoSe: 'user', neiRong: gouJianJiYiZhaiYaoPrompt(yuanLiao, jiaoSeMing, xianYou?.zhaiYaoNeiRong || '') },
    ])
    const zhaiYao = qieDuanZhaiYao(xiangYing.neiRong)
    if (!zhaiYao) return true
    await 数据库.query(
      `INSERT INTO "对话摘要" ("用户ID", "角色ID", "摘要内容", "概括消息数", "素材锚点时间", "更新时间")
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET
         "摘要内容" = EXCLUDED."摘要内容",
         "概括消息数" = EXCLUDED."概括消息数",
         "素材锚点时间" = EXCLUDED."素材锚点时间",
         "更新时间" = NOW()`,
      [yongHuId, jiaoSeId, zhaiYao, zongShu, xinMaoDian],
    )
    return true
  } catch (cuoWu) {
    debug日志.error('对话摘要', huoQuFanYi('AI', 'JiYiZhaiYaoShiBai'), { xiang_qing: { cuo_wu: String(cuoWu) } })
    return false
  }
}
