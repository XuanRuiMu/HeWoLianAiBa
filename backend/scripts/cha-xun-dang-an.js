const { 数据库 } = require('../src/数据库')

async function main() {
  const shouJiHao = '13800138002'
  const user = await 数据库.query('SELECT "ID" FROM "用户" WHERE "手机号" = $1', [shouJiHao])
  if (user.rows.length === 0) {
    console.log('用户不存在')
    return
  }
  const yongHuId = user.rows[0].ID
  console.log('用户ID:', yongHuId)
  const dangAn = await 数据库.query('SELECT * FROM "游戏档案" WHERE "用户ID" = $1', [yongHuId])
  console.log('游戏档案:', JSON.stringify(dangAn.rows, null, 2))
  const jiaoSe = await 数据库.query('SELECT "ID", "名字", "结局状态", "封存", "可继续聊天" FROM "角色" WHERE "用户ID" = $1', [yongHuId])
  console.log('角色:', JSON.stringify(jiaoSe.rows, null, 2))
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
