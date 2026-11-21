import { 生成向量 } from './嵌入服务'
import type { 表情包条目 } from './表情包库'
import { 数据库 } from '../数据库'

export interface 语义候选参数 {
  query: string
  yunXuFengGe: readonly string[]
  guanXiJieDuanXuHao: number
  renSheQiZhi: readonly string[]
  excludeDuanMing: readonly string[]
  shuLiang: number
}

export async function 语义候选(params: 语义候选参数): Promise<表情包条目[]> {
  const [向量] = await 生成向量([params.query])
  const 向量文本 = JSON.stringify(向量)
  const 排除列表 = params.excludeDuanMing.length > 0 ? params.excludeDuanMing : ['__none__']
  const sql = `
    SELECT "短名", "描述", "情绪标签", "适用场景", "SHA256", "MIME"
      FROM "系统表情"
     WHERE "启用" = true
       AND "向量" IS NOT NULL
       AND "短名" <> ALL($4::text[])
       AND ("向量" <=> $2::text::vector) < 0.62
     ORDER BY "向量" <=> $2::text::vector
     LIMIT $3::int
  `
  const r = await 数据库.query(sql, [params.query, 向量文本, params.shuLiang + 20, 排除列表])
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
    wenJianLuJing: '',
  })) as unknown as 表情包条目[]
}
