import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { 数据库 } from '../../数据库'
import { MEI_TI_PEI_ZHI } from '../../config/媒体配置'
import { qingLiGuoQiYuYinWenJian } from '../数据保存期限'

const 手机号 = '19900000099'
const 哈希 = crypto.randomBytes(32).toString('hex')
let 用户ID = ''
let 文件路径 = ''

let 数据库可达 = true
try {
  await 数据库.query('SELECT 1')
} catch {
  数据库可达 = false
}

describe.skipIf(!数据库可达)('语音文件保存期限', () => {
  beforeAll(async () => {
    await 数据库.query('DELETE FROM "用户" WHERE "手机号" = $1', [手机号])
    const yongHu = await 数据库.query(
      `INSERT INTO "用户" ("手机号", "用户名", "密码哈希", "创建时间", "更新时间")
     VALUES ($1, $2, 'x', NOW(), NOW()) RETURNING "ID"`,
      [手机号, '语音清理测试'],
    )
    用户ID = String(yongHu.rows[0].ID)
    文件路径 = path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, 哈希.slice(0, 2), 哈希)
    await fs.promises.mkdir(path.dirname(文件路径), { recursive: true })
    await fs.promises.writeFile(文件路径, 'voice')
    await 数据库.query(
      `INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID", "创建时间")
     VALUES ($1, 'a.amr', 'audio/amr', 5, 'yuyin', $2, NOW() - INTERVAL '10 days')`,
      [哈希, 用户ID],
    )
  })

  afterAll(async () => {
    await 数据库.query('DELETE FROM "用户" WHERE "手机号" = $1', [手机号]).catch(() => undefined)
    await fs.promises.rm(文件路径, { force: true }).catch(() => undefined)
    await 数据库.end().catch(() => undefined)
  })

  it('超过7天无任何记录引用的语音会连同物理文件一起删除', async () => {
    const 删除数 = await qingLiGuoQiYuYinWenJian()
    expect(删除数).toBeGreaterThanOrEqual(1)
    const 记录 = await 数据库.query('SELECT 1 FROM "媒体文件" WHERE "SHA256" = $1', [哈希])
    expect(记录.rowCount).toBe(0)
    expect(fs.existsSync(文件路径)).toBe(false)
  })
})
