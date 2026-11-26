import { 数据库 } from '../src/数据库'

const 旧标记正则 = /[\[【]\s*(?:贴纸|贴图)\s*[:：]\s*([^\]】\n\r]*?)\s*[\]】]/g

const 微信前缀正则 = /[\[【]\s*(?:贴纸|表情包)\s*[:：]\s*wx_([^\]】\n\r]*?)\s*[\]】]/g

function 清理文本(yuanWen: string): string {
  if (typeof yuanWen !== 'string' || yuanWen === '') return yuanWen
  return yuanWen
    .replace(微信前缀正则, (_quan: string, ming: string) => `[${ming.trim()}]`)
    .replace(旧标记正则, (_quan: string, ming: string) => {
      const jianHua = ming.trim()
      return jianHua === '' ? '' : `[表情包:${jianHua}]`
    })
}

async function 主流程(): Promise<void> {
  const 消息结果 = await 数据库.query(
    `SELECT "ID", "内容" FROM "消息" WHERE "内容" ~ '贴纸|贴图|wx_'`,
  )
  let 消息改动 = 0
  for (const 行 of 消息结果.rows) {
    const 原 = String(行.内容 ?? '')
    const 新 = 清理文本(原)
    if (新 === 原) continue
    await 数据库.query(`UPDATE "消息" SET "内容" = $1 WHERE "ID" = $2`, [新, 行.ID])
    消息改动 += 1
  }

  const 块结果 = await 数据库.query(
    `SELECT "ID", "内容块"::text AS kuai FROM "消息" WHERE "内容块"::text ~ '贴纸|贴图|wx_'`,
  )
  let 块改动 = 0
  for (const 行 of 块结果.rows) {
    const 原 = String(行.kuai ?? '')
    let 解析: unknown
    try {
      解析 = JSON.parse(原)
    } catch {
      continue
    }
    if (!Array.isArray(解析)) continue
    let 变过 = false
    for (const 块 of 解析) {
      if (typeof 块 !== 'object' || 块 === null) continue
      const 记 = 块 as Record<string, unknown>
      if (typeof 记.nei_rong !== 'string') continue
      const 新 = 清理文本(记.nei_rong)
      if (新 === 记.nei_rong) continue
      记.nei_rong = 新
      变过 = true
    }
    if (!变过) continue
    await 数据库.query(`UPDATE "消息" SET "内容块" = $1::jsonb WHERE "ID" = $2`, [
      JSON.stringify(解析),
      行.ID,
    ])
    块改动 += 1
  }

  console.log(`消息正文改动 ${消息改动} 条，内容块改动 ${块改动} 条`)
  await 数据库.end()
}

void 主流程().catch(async (cuoWu: unknown) => {
  console.error(String(cuoWu))
  await 数据库.end().catch(() => undefined)
  process.exitCode = 1
})
