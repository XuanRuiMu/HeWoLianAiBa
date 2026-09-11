import { readFileSync, readdirSync } from 'fs'
import { resolve, extname } from 'path'
import { createHash } from 'crypto'
import { 数据库 } from '../src/数据库'

export interface 迁移结果 {
  已执行: number
  已跳过: number
  错误?: string
}

export class 迁移器 {
  private 迁移目录: string

  constructor(迁移目录: string) {
    this.迁移目录 = 迁移目录
  }

  private 计算校验和(sql: string): string {
    return createHash('sha256').update(sql.trim()).digest('hex')
  }

  private 获取迁移文件列表(): string[] {
    const 文件列表 = readdirSync(this.迁移目录)
      .filter(文件 => extname(文件) === '.sql')
      .sort()
    return 文件列表
  }

  private async 确保版本表存在(): Promise<void> {
    await 数据库.query(`
      CREATE TABLE IF NOT EXISTS "schema_migrations" (
        version VARCHAR PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        checksum VARCHAR NOT NULL
      )
    `)
  }

  private async 获取已执行版本(): Promise<Map<string, string>> {
    const 结果 = await 数据库.query(`SELECT version, checksum FROM "schema_migrations"`)
    const 已执行 = new Map<string, string>()
    for (const 行 of 结果.rows) {
      已执行.set(行.version, 行.checksum)
    }
    return 已执行
  }

  async 执行(): Promise<迁移结果> {
    await this.确保版本表存在()

    const 文件列表 = this.获取迁移文件列表()
    const 已执行版本 = await this.获取已执行版本()

    let 已执行计数 = 0
    let 已跳过计数 = 0

    for (const 文件名 of 文件列表) {
      const 版本 = 文件名.split('_')[0]
      const 文件路径 = resolve(this.迁移目录, 文件名)
      const sql = readFileSync(文件路径, 'utf-8')
      const 校验和 = this.计算校验和(sql)

      const 已存在校验和 = 已执行版本.get(版本)

      if (已存在校验和) {
        if (已存在校验和 !== 校验和) {
          throw new Error(`迁移 ${版本} 校验和不匹配：数据库记录 ${已存在校验和}，文件当前 ${校验和}`)
        }
        已跳过计数++
        continue
      }

      const 客户端 = await 数据库.connect()
      try {
        await 客户端.query('BEGIN')
        await 客户端.query(sql)
        await 客户端.query(
          `INSERT INTO "schema_migrations" (version, checksum) VALUES ($1, $2)`,
          [版本, 校验和]
        )
        await 客户端.query('COMMIT')
        已执行计数++
      } catch (错误) {
        await 客户端.query('ROLLBACK')
        throw new Error(`迁移 ${版本} 执行失败: ${错误 instanceof Error ? 错误.message : String(错误)}`)
      } finally {
        客户端.release()
      }
    }

    return { 已执行: 已执行计数, 已跳过: 已跳过计数 }
  }
}

export async function 运行迁移(迁移目录?: string): Promise<迁移结果> {
  const 目录 = 迁移目录 || resolve(__dirname, '../database/migrations')
  const 迁移器实例 = new 迁移器(目录)
  return 迁移器实例.执行()
}