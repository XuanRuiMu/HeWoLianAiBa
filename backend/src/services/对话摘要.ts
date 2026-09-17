import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { AI_PEI_ZHI } from '../config/AI配置'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianJiYiZhaiYaoPrompt } from './Prompt构建器'
import { huoQuFanYi } from '../config/translations'

export interface DuiHuaZhaiYaoJiLu {
  zhaiYaoNeiRong: string
  gaiKuoXiaoXiShu: number
  gengXinShiJian: string | null
}

// YH-033/YH-038 统一口径：摘要 200 字截断与触发阈值走 AI_PEI_ZHI 唯一出处，禁硬编码
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

export function qieDuanZhaiYao(neiRong: string): string {
  const qingLi = (neiRong || '').trim()
  const zuiDaZiFu = huoQuZhaiYaoPeiZhi().zuiDaZiFu
  if (qingLi.length <= zuiDaZiFu) return qingLi
  return qingLi.slice(0, zuiDaZiFu)
}

export async function duQuDuiHuaZhaiYao(yongHuId: string, jiaoSeId: string): Promise<DuiHuaZhaiYaoJiLu | null> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT "摘要内容", "概括消息数", "更新时间" FROM "对话摘要" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
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
    }
  } catch (cuoWu) {
    debug日志.error('对话摘要', '读取对话摘要失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return null
  }
}

export function gouJianZhaiYaoZhuRuWenBen(zhaiYao: DuiHuaZhaiYaoJiLu | null): string {
  if (!zhaiYao || !zhaiYao.zhaiYaoNeiRong) return ''
  return `【此前的记忆摘要】${zhaiYao.zhaiYaoNeiRong}`
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

async function huoQuXiaoXiZongShu(yongHuId: string, jiaoSeId: string): Promise<number> {
  const jieGuo = await 数据库.query(
    `SELECT COUNT(*) AS zong_shu FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [yongHuId, jiaoSeId],
  )
  return Number(jieGuo.rows[0]?.zong_shu || 0)
}

async function huoQuZhaiYaoYuanLiao(yongHuId: string, jiaoSeId: string): Promise<string> {
  const yuanLiaoShu = huoQuZhaiYaoPeiZhi().yuanLiaoXiaoXiShu
  const jieGuo = await 数据库.query(
    `SELECT "内容", "发送者", "创建时间" FROM "消息"
     WHERE "用户ID" = $1 AND "角色ID" = $2
     ORDER BY "创建时间" ASC
     LIMIT $3`,
    [yongHuId, jiaoSeId, yuanLiaoShu],
  )
  return jieGuo.rows
    .map((hang, xuHao) => `${xuHao + 1}. [${hang.发送者 === 'yonghu' ? '用户' : '角色'}] ${String(hang.内容 || '').slice(0, 200)}`)
    .join('\n')
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
    if (xianYou && zongShu - xianYou.gaiKuoXiaoXiShu < peiZhi.chuFaXiaoXiShu) return true
    const yuanLiao = await huoQuZhaiYaoYuanLiao(yongHuId, jiaoSeId)
    if (!yuanLiao.trim()) return true
    const xiangYing = await genJuPeiZhiTiaoYong('jiYiZhaiYao', [
      { jiaoSe: 'system', neiRong: '把聊天记录里值得记住的东西串成几句话，只输出摘要正文。' },
      { jiaoSe: 'user', neiRong: gouJianJiYiZhaiYaoPrompt(yuanLiao, jiaoSeMing) },
    ])
    const zhaiYao = qieDuanZhaiYao(xiangYing.neiRong)
    if (!zhaiYao) return true
    await 数据库.query(
      `INSERT INTO "对话摘要" ("用户ID", "角色ID", "摘要内容", "概括消息数", "更新时间")
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET
         "摘要内容" = EXCLUDED."摘要内容",
         "概括消息数" = EXCLUDED."概括消息数",
         "更新时间" = NOW()`,
      [yongHuId, jiaoSeId, zhaiYao, zongShu],
    )
    return true
  } catch (cuoWu) {
    debug日志.error('对话摘要', huoQuFanYi('AI', 'JiYiZhaiYaoShiBai'), { xiang_qing: { cuo_wu: String(cuoWu) } })
    return false
  }
}
