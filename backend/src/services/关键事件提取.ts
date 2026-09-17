import { debug日志 } from '../utils/debug日志'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianGuanJianShiJianPrompt } from './Prompt构建器'
import { 数据库 } from '../数据库'
import type { GongJianShiJianJieGuo } from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'

export async function tiQuGuanJianShiJian(
  duiHuaWenBen: string,
  jiaoSeMing: string,
  shangXiaWen?: CanShuShangXiaWen,
  waiBuXinHao?: AbortSignal,
): Promise<GongJianShiJianJieGuo[]> {
  try {
    if (waiBuXinHao?.aborted) {
      return []
    }
    const xiangYing = await genJuPeiZhiTiaoYong('guanJianShiJian', [
      { jiaoSe: 'system', neiRong: '从聊天记录里挑出关键事件，只输出 JSON 数组。' },
      { jiaoSe: 'user', neiRong: gouJianGuanJianShiJianPrompt(duiHuaWenBen, jiaoSeMing) },
    ], shangXiaWen, waiBuXinHao)

    return jieXiShiJianShuZu(xiangYing.neiRong)
  } catch (cuoWu) {
    debug日志.error('关键事件提取', '关键事件提取失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return []
  }
}

// YH-051 关键事件进上下文：抽取结果落“关键事件”表并经记忆检索注入上下文
// 根因：有抽取不用白白忘记大事；落表走幂等去重，禁重复落库污染记忆
export async function tiQuBingLuoKuGuanJianShiJian(
  yongHuId: string,
  jiaoSeId: string,
  duiHuaWenBen: string,
  jiaoSeMing: string,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<GongJianShiJianJieGuo[]> {
  const shiJianLieBiao = await tiQuGuanJianShiJian(duiHuaWenBen, jiaoSeMing, shangXiaWen)
  if (shiJianLieBiao.length === 0) {
    return []
  }
  try {
    for (const shiJian of shiJianLieBiao.slice(0, 10)) {
      const miaoShu = String(shiJian.miao_shu || '').trim().slice(0, 500)
      if (!miaoShu) {
        continue
      }
      const yiCunZai = await 数据库.query(
        `SELECT 1 FROM "关键事件" WHERE "用户ID" = $1 AND "角色ID" = $2 AND "描述" = $3 LIMIT 1`,
        [yongHuId, jiaoSeId, miaoShu],
      )
      if ((yiCunZai.rowCount ?? 0) > 0) {
        continue
      }
      await 数据库.query(
        `INSERT INTO "关键事件" ("用户ID", "角色ID", "事件类型", "描述") VALUES ($1, $2, $3, $4)`,
        [yongHuId, jiaoSeId, String(shiJian.shi_jian_lei_xing || '其他').slice(0, 50), miaoShu],
      )
    }
  } catch (cuoWu) {
    debug日志.error('关键事件提取', '关键事件落表失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
  return shiJianLieBiao
}

// YH-051 记忆检索注入：读最近关键事件拼成上下文段，供Prompt注入
export async function duQuGuanJianShiJianZhuRu(
  yongHuId: string,
  jiaoSeId: string,
  zuiDaTiaoShu = 10,
): Promise<string> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT "事件类型", "描述" FROM "关键事件" WHERE "用户ID" = $1 AND "角色ID" = $2 ORDER BY "创建时间" DESC LIMIT $3`,
      [yongHuId, jiaoSeId, zuiDaTiaoShu],
    )
    if (jieGuo.rows.length === 0) {
      return ''
    }
    const hangLieBiao = jieGuo.rows.reverse().map((hang) => `- ${String(hang.事件类型 || '其他')}：${String(hang.描述 || '').slice(0, 200)}`)
    return `【关键事件】\n${hangLieBiao.join('\n')}`
  } catch (cuoWu) {
    debug日志.error('关键事件提取', '关键事件检索注入失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return ''
  }
}

function jieXiShiJianShuZu(neiRong: string): GongJianShiJianJieGuo[] {
  const qingLi = neiRong.trim()
  if (!qingLi) return []

  let shuJu: unknown[] = []
  try {
    shuJu = JSON.parse(qingLi) as unknown[]
  } catch {
    const piPei = qingLi.match(/\[[\s\S]*\]/)
    if (piPei) {
      try {
        shuJu = JSON.parse(piPei[0]) as unknown[]
      } catch {
        return []
      }
    } else {
      return []
    }
  }

  if (!Array.isArray(shuJu)) return []

  return shuJu
    .filter((xiang) => typeof xiang === 'object' && xiang !== null)
    .map((xiang) => {
      const shiJian = xiang as Record<string, unknown>
      const queXinDu = Number(shiJian['确信度'] ?? shiJian['que_xin_du'] ?? 0)
      return {
        shi_jian_lei_xing: String(shiJian['事件类型'] ?? shiJian['shi_jian_lei_xing'] ?? '其他'),
        miao_shu: String(shiJian['描述'] ?? shiJian['miao_shu'] ?? ''),
        que_xin_du: Number.isNaN(queXinDu) ? 0 : Math.max(0, Math.min(1, queXinDu)),
      }
    })
}
