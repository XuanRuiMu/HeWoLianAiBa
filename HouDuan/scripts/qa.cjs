const { Pool } = require('pg')
require('dotenv').config({ path: '/opt/lianaiba/HouDuan/.env' })
const 公开编号 = process.argv[2]
;(async () => {
  if (!公开编号) { console.error('需要传入角色公开编号'); process.exit(1) }
  const p = new Pool({ connectionString: process.env.DATABASE_URL })
  const r = await p.query('SELECT "ID","封存","可继续聊天","结局状态" FROM "角色" WHERE "公开编号" = $1', [公开编号])
  console.log('角色:', JSON.stringify(r.rows))
  if (r.rows[0]) {
    const h = await p.query('SELECT "总分","关系阶段" FROM "好感度" WHERE "角色ID" = $1', [r.rows[0].ID])
    console.log('好感度:', JSON.stringify(h.rows))
  }
  await p.end()
  process.exit(0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
