/* eslint-disable no-console -- CLI脚本console为唯一输出通道 */
import { resolve } from 'path'
import { 数据库 } from '../src/数据库'
import { 迁移器, 运行迁移, 台账比对条目 } from './迁移器'

function 取目录(参数: string[]): string {
  const 位置参数 = 参数.find(项 => !项.startsWith('--'))
  return 位置参数 ? resolve(位置参数) : resolve(__dirname, '../database/migrations')
}

function 打印台账差异(条目: 台账比对条目[]): void {
  const 变动 = 条目.filter(项 => 项.差异 !== '一致')
  if (变动.length === 0) {
    console.log(`台账与文件逐条一致（${条目.length} 个版本），无需 re-baseline`)
    return
  }
  console.log(`存在 ${变动.length} 个不一致版本（共 ${条目.length} 个）：`)
  for (const 项 of 变动) {
    console.log(`  [${项.差异}] ${项.版本} ${项.文件名}`)
    console.log(`      台账: ${项.台账校验和 ?? '(未登记)'}`)
    console.log(`      文件: ${项.当前校验和}`)
  }
  const 未登记 = 变动.filter(项 => 项.差异 === '未登记')
  if (未登记.length > 0) {
    console.log(`注意：${未登记.map(项 => 项.版本).join(', ')} 未在台账中，re-baseline 不会登记它们——必须由迁移真跑一遍。`)
  }
}

async function main() {
  const 参数 = process.argv.slice(2)
  const 迁移目录 = 取目录(参数)

  console.log(`迁移目录: ${迁移目录}`)

  try {
    if (参数.includes('--rebaseline')) {
      const 应用 = 参数.includes('--apply')
      console.log(应用 ? 're-baseline（写入台账）...' : 're-baseline 预演（dry-run，不写库）...')
      const { 条目, 已更新 } = await new 迁移器(迁移目录).重新登记校验和(应用)
      打印台账差异(条目)
      console.log(应用 ? `re-baseline 完成: 已重新登记 ${已更新} 个版本的校验和` : '未写库。确认 diff 无误后加 --apply 才会更新台账')
    } else {
      console.log('开始执行数据库迁移...')
      const 结果 = await 运行迁移(迁移目录)
      console.log(`迁移完成: 已执行 ${结果.已执行} 个, 已跳过 ${结果.已跳过} 个`)
    }
    process.exitCode = 0
  } catch (错误) {
    console.error('迁移失败:', 错误 instanceof Error ? 错误.message : String(错误))
    process.exitCode = 1
  } finally {
    // 关掉连接池让进程自然退出：process.exit() 在管道下会截断未 flush 的 diff 输出
    await 数据库.end().catch(() => undefined)
  }
}

main()
