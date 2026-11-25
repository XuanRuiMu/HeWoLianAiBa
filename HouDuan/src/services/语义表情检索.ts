import { 生成向量 } from './嵌入服务'
import type { 表情包条目 } from './表情包库'
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

export async function 语义候选(params: 语义候选参数): Promise<表情包条目[]> {
  let 向量: number[] | undefined
  try {
    向量 = (await 生成向量([params.query]))[0]
  } catch (cuoWu) {
    debug日志.warn('语义表情检索', '本地向量生成失败，降级为关键词候选', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
    return []
  }
  if (!Array.isArray(向量) || 向量.length === 0) return []
  const 向量文本 = JSON.stringify(向量)
  const 排除列表 = params.excludeDuanMing.length > 0 ? params.excludeDuanMing : ['__none__']
  const sql = `
    SELECT "短名", "描述", "情绪标签", "适用场景", "SHA256", "MIME"
      FROM "系统表情"
     WHERE "启用" = true
       AND "向量" IS NOT NULL
       AND "短名" <> ALL($1::text[])
       AND ("向量" <=> $2::vector) < 0.62
     ORDER BY "向量" <=> $2::vector
     LIMIT $3::int
  `
  const r = await 数据库.query(sql, [排除列表, 向量文本, params.shuLiang + 20])
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
