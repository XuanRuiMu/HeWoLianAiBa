import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readdirSync } from 'node:fs'
import {
  管理角色清单,
  管理能力清单,
  归一管理角色,
  归一管理能力列表,
} from '@/utils/角色能力'

/**
 * FP-18 前后端角色口径同源守卫（手法照抄 backend/src/utils/__tests__/角色能力同源.test.ts 与
 * frontend/src/__tests__/性别口径.test.ts：直读对端源文件，改任一侧必须两仓同改）。
 *
 * 前端不放 角色能力矩阵（避免第二份推导真源），但 **能力位词表必须与后端同集合**：
 * 词表窄于后端时，归一管理能力列表 会把服务端已下发的合法能力静默丢弃，
 * 视图门在「该角色其实有该位」时仍判为无能力——这属 fail-closed 的安全方向，
 * 但会让未来按 feng_jin/tong_ji_xie 设的视图门永远不亮且无任何红灯，故必须把守。
 */
const 后端源文件 = resolve(__dirname, '../../../backend/src/utils/角色能力.ts')
const 本仓源目录 = resolve(__dirname, '../')

function 读后端(): string {
  if (!existsSync(后端源文件)) throw new Error(`后端源文件缺失，同源断言无法执行: ${后端源文件}`)
  return readFileSync(后端源文件, 'utf8')
}

function 取联合成员(源: string, 类型名: string): string[] {
  const 命中 = new RegExp(String.raw`export type ${类型名} =([^;\n]+)`).exec(源)
  if (!命中) throw new Error(`后端源里找不到 export type ${类型名} = ...`)
  return 命中[1]
    .split('|')
    .map((项) => 项.trim().replace(/'/g, ''))
    .filter((项) => 项.length > 0)
    .sort()
}

function 取数组常量(源: string, 名: string): string[] {
  const 命中 = new RegExp(String.raw`export const ${名}[^=]*= \[([^\]]*)\]`).exec(源)
  if (!命中) throw new Error(`后端源里找不到 export const ${名} = [...]`)
  return 命中[1]
    .split(',')
    .map((项) => 项.trim().replace(/'/g, ''))
    .filter((项) => 项.length > 0)
    .sort()
}

function 取矩阵(源: string): Record<string, string[]> {
  const 命中 = /export const 角色能力矩阵[^=]*= \{([\s\S]*?)\n\}/.exec(源)
  if (!命中) throw new Error('后端源里找不到 角色能力矩阵 的声明')
  const 结果: Record<string, string[]> = {}
  for (const 行 of 命中[1].split('\n')) {
    const 项 = /^\s*(\w+):\s*\[([^\]]*)\],?$/.exec(行)
    if (项) {
      结果[项[1]] = 项[2]
        .split(',')
        .map((能) => 能.trim().replace(/'/g, ''))
        .filter((能) => 能.length > 0)
        .sort()
    }
  }
  if (Object.keys(结果).length === 0) throw new Error('后端 角色能力矩阵 解析结果为空')
  return 结果
}

describe('FP-18 前端身份视图门与后端角色口径同源', () => {
  const 后端源 = 读后端()

  it('角色清单与能力清单逐字等于后端类型联合与清单常量', () => {
    expect([...管理角色清单].slice().sort()).toEqual(取联合成员(后端源, 'GuanLiJiaoSe'))
    expect([...管理能力清单].slice().sort()).toEqual(取联合成员(后端源, 'GuanLiNengLi'))
    expect([...管理角色清单].slice().sort()).toEqual(取数组常量(后端源, '管理角色清单'))
    expect([...管理能力清单].slice().sort()).toEqual(取数组常量(后端源, '管理能力清单'))
  })

  it('能力清单覆盖后端矩阵用到的每一位（前端词表窄一位即静默丢能力，此处红灯）', () => {
    const 矩阵 = 取矩阵(后端源)
    expect(Object.keys(矩阵).sort()).toEqual([...管理角色清单].sort())
    const 全集 = new Set(Object.values(矩阵).flat())
    expect([...全集].sort()).toEqual([...管理能力清单].sort())
  })

  it('归一函数只认后端白名单：未知/非数组/客户端伪造一律 fail-closed 成无身份', () => {
    for (const 角色 of 管理角色清单) {
      expect(归一管理角色(角色)).toBe(角色)
    }
    expect(归一管理角色('chao_guan ')).toBeNull()
    expect(归一管理角色('superadmin')).toBeNull()
    expect(归一管理角色(true)).toBeNull()
    expect(归一管理角色(undefined)).toBeNull()
    expect(归一管理角色(null)).toBeNull()
    expect(归一管理能力列表(undefined)).toEqual([])
    expect(归一管理能力列表('cha_kan')).toEqual([])
    expect(归一管理能力列表({ 0: 'cha_kan' })).toEqual([])
    expect(归一管理能力列表(['cha_kan', 'suan_shen_fen', null, 1])).toEqual(['cha_kan'])
    expect(归一管理能力列表([...管理能力清单])).toEqual([...管理能力清单])
  })

  it('前端不存在第二份角色推导真源：不自带 角色能力矩阵，门禁点只读服务端下发能力位', () => {
    const 命中矩阵定义: string[] = []
    const 命中自行推导: string[] = []
    const 遍历 = (当前: string) => {
      for (const 项 of readdirSync(当前, { withFileTypes: true })) {
        const 完整 = resolve(当前, 项.name)
        if (项.isDirectory()) {
          if (项.name === '__tests__' || 项.name === 'node_modules') continue
          遍历(完整)
        } else if (项.name.endsWith('.ts') || 项.name.endsWith('.vue')) {
          const 源 = readFileSync(完整, 'utf8')
          if (/const 角色能力矩阵/.test(源)) 命中矩阵定义.push(完整)
          if (/\.管理员\s*===\s*true|Boolean\([^)]*管理员/.test(源)) 命中自行推导.push(完整)
        }
      }
    }
    遍历(本仓源目录)
    expect(命中矩阵定义).toEqual([])
    expect(命中自行推导).toEqual([])
  })

  it('能力位状态只有一个写入口：nengLieBiao 恒由 归一管理能力列表 赋值，无旁路写入', () => {
    const 用户仓库源 = readFileSync(resolve(本仓源目录, 'stores/用户.ts'), 'utf8')
    expect((用户仓库源.match(/nengLieBiao\.value\s*=/g) ?? []).length).toBe(1)
    expect(用户仓库源).toMatch(/nengLieBiao\.value = shenFen \? 归一管理能力列表\(shenFen\.neng_li\) : \[\]/)
    expect(用户仓库源).not.toMatch(/nengLieBiao\.value\s*=\s*\[/)
  })
})
