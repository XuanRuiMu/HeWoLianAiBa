import { 数据库 } from '../../src/数据库'

async function main(): Promise<void> {
  const r = await 数据库.query('SELECT count("向量")::int AS vec, count(*)::int AS total FROM "系统表情"')
  console.log(JSON.stringify(r.rows))
  process.exit(0)
}
void main()
