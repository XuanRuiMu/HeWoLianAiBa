/* eslint-disable no-console -- CLI脚本console为唯一输出通道 */
import { resolve } from 'path'
import { 运行迁移 } from './迁移器'

async function main() {
  const 迁移目录 = process.argv[2] ? resolve(process.argv[2]) : resolve(__dirname, '../database/migrations')

  console.log('开始执行数据库迁移...')
  console.log(`迁移目录: ${迁移目录}`)

  try {
    const 结果 = await 运行迁移(迁移目录)
    console.log(`迁移完成: 已执行 ${结果.已执行} 个, 已跳过 ${结果.已跳过} 个`)
    process.exit(0)
  } catch (错误) {
    console.error('迁移失败:', 错误 instanceof Error ? 错误.message : String(错误))
    process.exit(1)
  }
}

main()