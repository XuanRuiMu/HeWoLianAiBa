import { readFileSync } from 'fs'
import { resolve } from 'path'
import { 数据库 } from '../src/数据库'

async function main() {
  const wenJian = process.argv[2]
  if (!wenJian) {
    console.error('用法: npx ts-node scripts/run_migration.ts <迁移文件>')
    process.exit(1)
  }

  const luJing = resolve(wenJian)
  const sql = readFileSync(luJing, 'utf-8')
  await 数据库.query(sql)
  console.log('迁移完成:', luJing)
  await 数据库.end()
}

main().catch((cuoWu) => {
  console.error('迁移失败', cuoWu)
  process.exit(1)
})
