import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { 数据库 } from './src/数据库'
import { shenChengLingPai } from './src/utils/jwt'
import { redis } from './src/redis'

async function main() {
  const shouJi = '13800138001'
  const miMa = 'Test1234!'
  const hash = await bcrypt.hash(miMa, 10)
  const yongHuId = randomUUID()
  await 数据库.query(
    `INSERT INTO "用户" ("ID","用户名","手机号","密码","性别","对象性别","出生年份","生日")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT ("手机号") DO UPDATE SET "用户名"=EXCLUDED."用户名" RETURNING "ID"`,
    [yongHuId, '测试员', shouJi, hash, '男', '女', 2000, '2000-01-01'],
  )
  const row = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号"=$1`, [shouJi])
  const uid = String(row.rows[0].ID)
  const token = await shenChengLingPai(uid, 'fang_wen', { yong_hu_ming: '测试员', shou_ji_hao: shouJi })
  const jiaoSe = await 数据库.query(`SELECT "ID","名字" FROM "角色" WHERE "用户ID"=$1 LIMIT 1`, [uid])
  process.stdout.write(JSON.stringify({ uid, token, role: jiaoSe.rows[0] || null }))
  await redis.quit()
  await (数据库 as any).end?.()
}
main().catch(e => { console.error(e); process.exit(1) })