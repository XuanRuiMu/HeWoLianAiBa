import { 生成向量 } from './嵌入服务'
import { 取全部启用, type 表情包条目 } from './表情包库'
import {
  表情运行标签,
  表情关系阶段顺序,
  表情人设气质标签,
  表情通用气质,
  表情圈层门槛标签,
  表情圈层门槛阶段,
  表情圈层仅大众气质,
  YuYiJianSuoPeiZhi,
} from '../config/表情包配置'
import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import path from 'node:path'

export interface 语义候选参数 {
  query: string
  yunXuFengGe: readonly string[]
  guanXiJieDuanXuHao: number
  renSheQiZhi: readonly string[]
  excludeDuanMing: readonly string[]
  shuLiang: number
}

const 全部风格: readonly string[] = ['黄脸', '祝福', '日常', '梗图']
const 语义距离上限 = YuYiJianSuoPeiZhi.juLiShangXian
const 本地召回上限 = YuYiJianSuoPeiZhi.benDiZhaoHuiShangXian
const 本地向量缓存上限 = YuYiJianSuoPeiZhi.benDiHuanCunShangXian
const 本地向量缓存 = new Map<string, number[]>()

function 生成风格条件(允许风格: readonly string[], 参数起始位: number): { sql: string; 参数: string[] } {
  const 允许 = 全部风格.filter((f) => 允许风格.includes(f))
  if (允许.length === 0 || 允许.length === 全部风格.length) return { sql: '', 参数: [] }
  const 排除 = 全部风格.filter((f) => !允许.includes(f))
  if (排除.length === 0) return { sql: '', 参数: [] }
  const 占位 = 排除.map((_, i) => `$${参数起始位 + i}`)
  return {
    sql: ` AND NOT (${占位.map((p) => `"检索文本" LIKE '%' || ${p} || '%'`).join(' OR ')})`,
    参数: [...排除],
  }
}

function 生成阶段条件(截止序号: number, 参数起始位: number): { sql: string; 参数: string[] } {
  if (!Number.isFinite(截止序号) || 截止序号 < 0) return { sql: '', 参数: [] }
  const 禁止 = 表情关系阶段顺序.slice(Math.trunc(截止序号) + 1)
  if (禁止.length === 0) return { sql: '', 参数: [] }
  return {
    sql: ` AND NOT ("检索文本" ~ $${参数起始位}::text)`,
    参数: [`(^| )(${禁止.join('|')})$`],
  }
}

function 生成气质条件(允许气质: readonly string[], 参数起始位: number): { sql: string; 参数: string[] } {
  const 可选 = 表情人设气质标签.filter((qiZhi) => qiZhi !== 表情通用气质)
  const 允许 = 可选.filter((qiZhi) => 允许气质.includes(qiZhi))
  if (允许.length === 0 || 允许气质.includes(表情通用气质) || 允许.length === 可选.length) {
    return { sql: '', 参数: [] }
  }
  const 禁止 = 可选.filter((qiZhi) => !允许.includes(qiZhi))
  if (禁止.length === 0) return { sql: '', 参数: [] }
  return {
    sql: ` AND NOT ("检索文本" ~ $${参数起始位}::text)`,
    参数: [`(^| )(${禁止.join('|')})( |$)`],
  }
}

function 生成圈层条件(
  截止序号: number,
  允许气质: readonly string[],
  参数起始位: number,
): { sql: string; 参数: string[] } {
  const 仅大众 = 允许气质.length === 1 && 允许气质[0] === 表情圈层仅大众气质
  const 允许 = 仅大众
    ? [表情圈层门槛标签[0]]
    : 表情圈层门槛标签.filter((men) => {
        const xuHao = 表情关系阶段顺序.indexOf(表情圈层门槛阶段[men] ?? '')
        return xuHao >= 0 && 截止序号 >= xuHao
      })
  const 禁止 = 表情圈层门槛标签.filter((men) => !允许.includes(men))
  if (禁止.length === 0 || 禁止.length === 表情圈层门槛标签.length) {
    return 禁止.length === 表情圈层门槛标签.length
      ? { sql: ' AND false', 参数: [] }
      : { sql: '', 参数: [] }
  }
  return {
    sql: ` AND NOT ("检索文本" ~ $${参数起始位}::text)`,
    参数: [`(^| )(${禁止.join('|')})( |$)`],
  }
}

function 归一文本(wenBen: string): string {
  return wenBen.replace(/\s+/gu, ' ').trim()
}

function 组本地检索文本(tiaoMu: 表情包条目): string {
  return 归一文本([
    tiaoMu.duanMing,
    tiaoMu.miaoShu,
    tiaoMu.qingXuBiaoQian,
    tiaoMu.shiYongChangJing,
    Array.isArray(tiaoMu.renSheQiZhi) ? tiaoMu.renSheQiZhi.join(' ') : '',
    tiaoMu.fengGe ?? '',
    tiaoMu.quanCengMenKian ?? '',
    typeof tiaoMu.guanXiJieDuanXiaXian === 'number' ? String(tiaoMu.guanXiJieDuanXiaXian) : '',
  ].filter((x) => x !== '').join(' '))
}

function 取向量键(tiaoMu: 表情包条目): string {
  return `${tiaoMu.duanMing}|${tiaoMu.sha256}`
}

function 取意图标签(query: string): string[] {
  return 表情运行标签.filter((biaoQian) => query.includes(biaoQian))
}

function 文本得分(tiaoMu: 表情包条目, jianSuoWenBen: string, query: string, yiTu: string[]): number {
  let fen = 0
  if (yiTu.includes(tiaoMu.qingXuBiaoQian)) fen += YuYiJianSuoPeiZhi.yiTuJiaFen
  const ciDuan = query.split(/\s+/u).map((x) => x.trim()).filter((x) => x.length >= 2)
  for (const ci of ciDuan) {
    if (jianSuoWenBen.includes(ci)) fen += YuYiJianSuoPeiZhi.ciDuanJiaFen
  }
  return fen
}

function 风格式否允许(jianSuoWenBen: string, yunXuFengGe: readonly string[]): boolean {
  const 允许 = 全部风格.filter((fengGe) => yunXuFengGe.includes(fengGe))
  if (允许.length === 0 || 允许.length === 全部风格.length) return true
  const 排除 = 全部风格.filter((fengGe) => !允许.includes(fengGe))
  return !排除.some((fengGe) => jianSuoWenBen.includes(fengGe))
}

function 门槛式否允许(tiaoMu: 表情包条目, params: 语义候选参数): boolean {
  const xiaXian = typeof tiaoMu.guanXiJieDuanXiaXian === 'number' ? tiaoMu.guanXiJieDuanXiaXian : 0
  if (xiaXian > params.guanXiJieDuanXuHao) return false
  const tiaoMuQiZhi = Array.isArray(tiaoMu.renSheQiZhi) && tiaoMu.renSheQiZhi.length > 0 ? tiaoMu.renSheQiZhi : [表情通用气质]
  if (tiaoMuQiZhi.includes(表情通用气质)) return true
  if (params.renSheQiZhi.includes(表情通用气质)) return true
  if (!tiaoMuQiZhi.some((qiZhi) => params.renSheQiZhi.includes(qiZhi))) return false
  const men = tiaoMu.quanCengMenKian ?? 表情圈层门槛标签[0]
  if (men === 表情圈层门槛标签[0]) return true
  if (params.renSheQiZhi.length === 1 && params.renSheQiZhi[0] === 表情圈层仅大众气质) return false
  const menXuHao = 表情关系阶段顺序.indexOf(表情圈层门槛阶段[men] ?? '')
  return menXuHao >= 0 && params.guanXiJieDuanXuHao >= menXuHao
}


function 余弦距离(jia: readonly number[], yi: readonly number[]): number {
  if (jia.length === 0 || jia.length !== yi.length) return Number.POSITIVE_INFINITY
  let dianJi = 0
  let jiaChang = 0
  let yiChang = 0
  for (let i = 0; i < jia.length; i += 1) {
    dianJi += jia[i] * yi[i]
    jiaChang += jia[i] * jia[i]
    yiChang += yi[i] * yi[i]
  }
  if (jiaChang <= 0 || yiChang <= 0) return Number.POSITIVE_INFINITY
  return 1 - dianJi / (Math.sqrt(jiaChang) * Math.sqrt(yiChang))
}

function 登记向量(jian: string, xiangLiang: number[]): void {
  本地向量缓存.set(jian, xiangLiang)
  if (本地向量缓存.size <= 本地向量缓存上限) return
  const guoQi = 本地向量缓存.keys().next().value
  if (typeof guoQi === 'string') 本地向量缓存.delete(guoQi)
}

async function 本地语义候选(params: 语义候选参数, chaXunXiangLiang: number[]): Promise<表情包条目[]> {
  const quanBu = await 取全部启用()
  const paiChu = new Set(params.excludeDuanMing)
  const yiTu = 取意图标签(params.query)
  const houXuan = quanBu
    .filter((tiaoMu) => !paiChu.has(tiaoMu.duanMing))
    .map((tiaoMu) => ({ tiaoMu, jianSuo: 组本地检索文本(tiaoMu) }))
    .filter((xiang) => 风格式否允许(xiang.jianSuo, params.yunXuFengGe))
    .filter((xiang) => 门槛式否允许(xiang.tiaoMu, params))
    .map((xiang) => ({ ...xiang, fen: 文本得分(xiang.tiaoMu, xiang.jianSuo, params.query, yiTu) }))
    .sort((jia, yi) => yi.fen - jia.fen)
    .slice(0, 本地召回上限)
  if (houXuan.length === 0) return []
  const daiShengCheng: Array<{ tiaoMu: 表情包条目; jianSuo: string }> = []
  const yiHuanCun = new Map<string, number[]>()
  for (const xiang of houXuan) {
    const jian = 取向量键(xiang.tiaoMu)
    const huanCun = 本地向量缓存.get(jian)
    if (huanCun) yiHuanCun.set(jian, huanCun)
    else daiShengCheng.push({ tiaoMu: xiang.tiaoMu, jianSuo: xiang.jianSuo })
  }
  if (daiShengCheng.length > 0) {
    const shengChengJieGuo = await 生成向量([params.query, ...daiShengCheng.map((xiang) => xiang.jianSuo)])
    for (let i = 0; i < daiShengCheng.length; i += 1) {
      const xiangLiang = shengChengJieGuo[i + 1]
      if (!Array.isArray(xiangLiang) || xiangLiang.length === 0) continue
      const jian = 取向量键(daiShengCheng[i].tiaoMu)
      yiHuanCun.set(jian, xiangLiang)
      登记向量(jian, xiangLiang)
    }
  }
  const youXiangLiang = houXuan
    .map((xiang) => {
      const xiangLiang = yiHuanCun.get(取向量键(xiang.tiaoMu))
      if (!xiangLiang) return null
      const juLi = 余弦距离(chaXunXiangLiang, xiangLiang)
      if (!Number.isFinite(juLi) || juLi >= 语义距离上限) return null
      return { tiaoMu: xiang.tiaoMu, juLi, fen: xiang.fen }
    })
    .filter((xiang): xiang is { tiaoMu: 表情包条目; juLi: number; fen: number } => xiang !== null)
    .sort((jia, yi) => jia.juLi - yi.juLi || yi.fen - jia.fen)
    .slice(0, params.shuLiang)
  return youXiangLiang.map((xiang) => xiang.tiaoMu)
}

export async function 语义候选(params: 语义候选参数): Promise<表情包条目[]> {
  let 向量: number[] | undefined
  try {
    向量 = (await 生成向量([params.query]))[0]
  } catch (cuoWu) {
    debug日志.error('语义表情检索', '本地向量生成失败，本轮不选表情包（无兜底）', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
    return []
  }
  if (!Array.isArray(向量) || 向量.length === 0) return []
  const 向量文本 = JSON.stringify(向量)
  const 排除列表 = params.excludeDuanMing.length > 0 ? params.excludeDuanMing : ['__none__']
  const 风格条件 = 生成风格条件(params.yunXuFengGe, 4)
  const 阶段条件 = 生成阶段条件(params.guanXiJieDuanXuHao, 4 + 风格条件.参数.length)
  const 气质条件 = 生成气质条件(params.renSheQiZhi, 4 + 风格条件.参数.length + 阶段条件.参数.length)
  const 圈层条件 = 生成圈层条件(
    params.guanXiJieDuanXuHao,
    params.renSheQiZhi,
    4 + 风格条件.参数.length + 阶段条件.参数.length + 气质条件.参数.length,
  )
  const 参数: unknown[] = [
    排除列表,
    向量文本,
    params.shuLiang,
    ...风格条件.参数,
    ...阶段条件.参数,
    ...气质条件.参数,
    ...圈层条件.参数,
  ]
  const yuJu = `
    SELECT "短名", "描述", "情绪标签", "适用场景", "SHA256", "MIME"
      FROM "系统表情"
     WHERE "启用" = true
       AND "向量" IS NOT NULL
       AND "短名" <> ALL($1::text[])
       AND ("向量" <=> $2::vector) < ${语义距离上限}${风格条件.sql}${阶段条件.sql}${气质条件.sql}${圈层条件.sql}
     ORDER BY "向量" <=> $2::vector
     LIMIT $3::int
  `
  try {
    const r = await 数据库.query(yuJu, 参数)
    if (r.rows.length > 0) {
      return r.rows.map((row) => ({
        duanMing: String(row['短名']),
        miaoShu: String(row['描述'] ?? ''),
        qingXuBiaoQian: String(row['情绪标签'] ?? '待打标'),
        shiYongChangJing: String(row['适用场景'] ?? ''),
        qiYong: true,
        sha256: String(row['SHA256']),
        mime: String(row['MIME']),
        ziJieShu: 0,
        wenJianMing: String(row['短名']),
        wenJianLuJing: path.join(process.env.BIAO_QING_BAO_MU_LU || path.resolve(process.cwd(), '..', '表情包'), String(row['短名'])),
      })) as unknown as 表情包条目[]
    }
  } catch (cuoWu) {
    debug日志.warn('语义表情检索', '数据库语义检索不可用，改用本地库向量检索', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
  }
  try {
    return await 本地语义候选(params, 向量)
  } catch (cuoWu) {
    debug日志.warn('语义表情检索', '本地语义检索失败，本轮不给表情包', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return []
  }
}
