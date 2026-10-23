import { debug日志 } from '../utils/debug日志'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianGuanJianShiJianPrompt, JI_YI_ZHU_RU_YUE_SHU } from './Prompt构建器'
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

export async function duQuGuanJianShiJianZhuRu(
  yongHuId: string,
  jiaoSeId: string,
  zuiDaTiaoShu = 10,
  benLunXiaoXi = '',
): Promise<string> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT "事件类型", "描述", "创建时间" FROM "关键事件" WHERE "用户ID" = $1 AND "角色ID" = $2 ORDER BY "创建时间" DESC LIMIT $3`,
      [yongHuId, jiaoSeId, Math.max(zuiDaTiaoShu, zuiDaTiaoShu * 3)],
    )
    if (jieGuo.rows.length === 0) {
      return ''
    }
    const quanBu = jieGuo.rows.map((hang) => ({
      wenBen: `- ${String(hang.事件类型 || '其他')}：${String(hang.描述 || '').slice(0, 200)}`,
      chuangJian: Number(hang.创建时间?.getTime?.() ?? 0),
    }))
    mingZhongPaiXu(quanBu, benLunXiaoXi)
    const hangLieBiao = quanBu.slice(0, zuiDaTiaoShu).map((hang) => hang.wenBen)
    return `【关键事件】\n${JI_YI_ZHU_RU_YUE_SHU}\n${hangLieBiao.join('\n')}`
  } catch (cuoWu) {
    debug日志.error('关键事件提取', '关键事件检索注入失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return ''
  }
}

export function mingZhongPaiXu(
  hang: Array<{ wenBen: string; chuangJian: number }>,
  benLunXiaoXi: string,
): void {
  const ji = jiXiBenLunCi(benLunXiaoXi)
  const fen = (wenBen: string) => (ji.length === 0 ? 0 : ji.filter((ci) => wenBen.includes(ci)).length)
  hang.sort((a, b) => fen(b.wenBen) - fen(a.wenBen) || b.chuangJian - a.chuangJian)
}

function jiXiBenLunCi(wenBen: string): string[] {
  const qingLi = (wenBen || '').replace(/\[[^\]]*\]/g, '').trim().slice(0, 300)
  if (!qingLi) return []
  const ci = new Set<string>()
  for (const pi of qingLi.match(/[A-Za-z0-9]{2,}/g) ?? []) ci.add(pi.toLowerCase())
  const hanZi = qingLi.match(/[一-龥]/g) ?? []
  for (let i = 0; i + 1 < hanZi.length; i++) ci.add(hanZi[i] + hanZi[i + 1])
  return [...ci].slice(0, 200)
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
