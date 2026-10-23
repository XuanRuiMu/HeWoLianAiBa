#!/usr/bin/env ts-node

import { Pool } from 'pg'
import { peiZhi } from '../src/config'
import { 结局枚举列表, 解析落库枚举 } from '../src/utils/结局'

export interface 归一逐项 {
  存储值: string
  行数: number
  目标枚举键: string | null
}

export interface 归一计数 {
  扫描行数: number
  改写行数: number
  跳过行数: number
  逐项: 归一逐项[]
}

interface 最小客户端 {
  query(语句: string, 参数?: unknown[]): Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>
}

const 枚举集合: ReadonlySet<string> = new Set<string>(结局枚举列表)

export async function 归一游戏结局结果状态(客户端: 最小客户端): Promise<归一计数> {
  await 客户端.query('BEGIN')
  await 客户端.query('SELECT pg_advisory_xact_lock(987654321)')
  try {
    const 分布 = await 客户端.query(
      `SELECT "结果状态" AS 存储值, count(*)::int AS 行数
         FROM "游戏结局" GROUP BY 1 ORDER BY 1`,
    )

    let 扫描行数 = 0
    let 改写行数 = 0
    let 跳过行数 = 0
    const 逐项: 归一逐项[] = []

    for (const 行 of 分布.rows) {
      const 存储值 = String(行.存储值 ?? '')
      const 行数 = Number(行.行数)
      扫描行数 += 行数

      if (枚举集合.has(存储值)) {
        跳过行数 += 行数
        逐项.push({ 存储值, 行数, 目标枚举键: 存储值 })
        continue
      }

      const 枚举键 = 解析落库枚举(存储值)
      if (枚举键 === null) {
        逐项.push({ 存储值, 行数, 目标枚举键: null })
        continue
      }

      const 改写 = await 客户端.query(
        `UPDATE "游戏结局" SET "结果状态" = $1 WHERE "结果状态" = $2`,
        [枚举键, 存储值],
      )
      改写行数 += 改写.rowCount ?? 0
      逐项.push({ 存储值, 行数, 目标枚举键: 枚举键 })
    }

    await 客户端.query('COMMIT')
    return { 扫描行数, 改写行数, 跳过行数, 逐项 }
  } catch (错误) {
    await 客户端.query('ROLLBACK').catch(() => undefined)
    throw 错误
  }
}

function 取可连通连接串(): string {
  const 运行值 = String(peiZhi.shuJuKuLianJie ?? '')
  return 运行值.includes('@postgres:') ? 运行值.replace('@postgres:', '@127.0.0.1:') : 运行值
}

async function main(): Promise<void> {
  console.log('=== 游戏结局.结果状态 存量归一 ===')
  const 池 = new Pool({ connectionString: 取可连通连接串(), connectionTimeoutMillis: 5000 })
  try {
    const 客户端 = await 池.connect()
    let 计数: 归一计数
    try {
      计数 = await 归一游戏结局结果状态(客户端)
    } finally {
      客户端.release()
    }

    for (const 项 of 计数.逐项) {
      const 归属 = 项.目标枚举键 ?? '(无法识别，保持原值)'
      console.log(`  扫描 ${String(项.行数).padStart(5)} 行  ${项.存储值}  ->  ${归属}`)
    }
    console.log(
      `合计：扫描 ${计数.扫描行数} 行 / 改写 ${计数.改写行数} 行 / 跳过(已是枚举键) ${计数.跳过行数} 行`,
    )

    const 无法识别 = 计数.逐项.filter((项) => 项.目标枚举键 === null)
    if (无法识别.length > 0) {
      console.error(
        `存在 ${无法识别.length} 种无法识别的存储值（共 ${无法识别.reduce((总, 项) => 总 + 项.行数, 0)} 行）：` +
          `${无法识别.map((项) => JSON.stringify(项.存储值)).join(', ')}。` +
          `本脚本不猜测结局，迁移 030 的 CHECK 将因此建不上；请补 utils/结局 的历史文案映射后重跑。`,
      )
      process.exitCode = 1
      return
    }
    console.log('归一完成：库内 结果状态 已全部为枚举键，可执行迁移 030')
  } finally {
    await 池.end().catch(() => undefined)
  }
}

if (require.main === module) {
  main().catch((错误: unknown) => {
    console.error('存量归一失败:', 错误 instanceof Error ? 错误.message : String(错误))
    process.exitCode = 1
  })
}
