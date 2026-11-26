import { 数据库 } from '../src/数据库'
import { 微信表情名单 } from '../src/services/表情码表'

const 微信前缀正则 = /^wx_(.+)$/

async function 主流程(): Promise<void> {
  const 结果 = await 数据库.query(
    `SELECT "ID", "内容", "内容块"::text AS kuai FROM "消息" WHERE "内容块"::text LIKE '%wx_%'`,
  )
  let 改动 = 0
  for (const 行 of 结果.rows) {
    let 解析: unknown
    try {
      解析 = JSON.parse(String(行.kuai ?? ''))
    } catch {
      continue
    }
    if (!Array.isArray(解析)) continue
    const 新块: Array<Record<string, unknown>> = []
    let 变过 = false
    for (const 块 of 解析) {
      if (typeof 块 !== 'object' || 块 === null) {
        新块.push(块 as Record<string, unknown>)
        continue
      }
      const 记 = 块 as Record<string, unknown>
      const 短名 = typeof 记.duan_ming === 'string' ? 记.duan_ming : ''
      const 匹配 = 短名.match(微信前缀正则)
      if (!匹配 || !微信表情名单.has(匹配[1])) {
        新块.push(记)
        continue
      }
      const 已有文字 = 新块.find((xiang) => xiang.lei_xing === 'wenzi')
      if (已有文字) {
        已有文字.nei_rong = `${String(已有文字.nei_rong ?? '')}[${匹配[1]}]`
      } else {
        新块.push({ lei_xing: 'wenzi', nei_rong: `[${匹配[1]}]` })
      }
      变过 = true
    }
    if (!变过) continue
    await 数据库.query(`UPDATE "消息" SET "内容块" = $1::jsonb WHERE "ID" = $2`, [
      JSON.stringify(新块),
      行.ID,
    ])
    改动 += 1
  }
  console.log(`微信表情误存为图片块的消息改动 ${改动} 条`)
  await 数据库.end()
}

void 主流程().catch(async (cuoWu: unknown) => {
  console.error(String(cuoWu))
  await 数据库.end().catch(() => undefined)
  process.exitCode = 1
})
