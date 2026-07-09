import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/lovewithme',
})

try {
  for (const shouJiHao of ['13800138002', '13800138003']) {
    const userResult = await pool.query(
      `SELECT u."ID" as user_id, u."手机号", u."用户名" FROM "用户" u WHERE u."手机号" = $1`,
      [shouJiHao],
    )
    console.log(`\n用户 ${shouJiHao}:`, JSON.stringify(userResult.rows, null, 2))

    if (userResult.rows.length > 0) {
      const uid = userResult.rows[0].user_id
      const dangAnResult = await pool.query(
        `SELECT d."ID", d."角色ID", d."角色名字", d."是否渣型", d."结果类型", d."是否封存", d."好感度总分", d."创建时间"
         FROM "游戏档案" d WHERE d."用户ID" = $1 ORDER BY d."创建时间" DESC`,
        [uid],
      )
      console.log(`档案 ${shouJiHao}:`, JSON.stringify(dangAnResult.rows, null, 2))
    }
  }
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  await pool.end()
}
