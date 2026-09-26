import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { 管理角色清单, 管理能力清单, 角色能力矩阵, type GuanLiNengLi } from '../角色能力'

/**
 * FP-18 跨仓同源守卫：游戏端（和我恋爱吧）与管理端（恋爱吧管理中心）是两套构建产物，
 * 无法共享源码，角色能力矩阵只能各仓一份。本用例直读对端源文件断言两份真源逐字一致，
 * 手法与口径照抄 管理后端/tests/单元/RBAC矩阵.test.ts 的「前端消费点与角色能力矩阵同源」。
 * 改任一仓的角色或能力清单，必须两仓同改，否则此处红灯。
 */
/* 对端仓定位：本地工作区里两个项目是同级文件夹（位于本仓库根的父目录下）；
   GitHub Actions 的 checkout 只能落在工作区内（即本仓库根下）。
   两种布局都认，找不到仍抛错——同源守卫绝不允许因路径布局不同而静默跳过。 */
const 仓库根 = resolve(__dirname, '../../../..')
const 对端仓根 = [resolve(仓库根, '..', '恋爱吧管理中心'), resolve(仓库根, '恋爱吧管理中心')].find(
  (候选) => existsSync(候选),
)
const 对端源文件 = 对端仓根 && resolve(对端仓根, '管理后端/src/中间件/管理员.ts')

function 读对端(): string {
  if (!对端源文件 || !existsSync(对端源文件)) {
    throw new Error(`对端源文件缺失，同源断言无法执行: ${对端源文件 ?? '恋爱吧管理中心 未检出'}`)
  }
  return readFileSync(对端源文件, 'utf8')
}

function 取联合成员(源: string, 类型名: string): string[] {
  const 命中 = new RegExp(String.raw`export type ${类型名} =([^;]+);`).exec(源)
  if (!命中) throw new Error(`对端源里找不到 export type ${类型名} = ...;`)
  return 命中[1]
    .split('|')
    .map((项) => 项.trim().replace(/'/g, ''))
    .filter((项) => 项.length > 0)
    .sort()
}

function 取矩阵(源: string): Record<string, string[]> {
  const 命中 = /const 角色能力矩阵[^=]*= \{([\s\S]*?)\n\}/.exec(源)
  if (!命中) throw new Error('对端源里找不到 角色能力矩阵 的声明')
  const 结果: Record<string, string[]> = {}
  for (const 行 of 命中[1].split('\n')) {
    const 项 = /^\s*(\w+):\s*\[([^\]]*)\],?$/.exec(行)
    if (项) {
      结果[项[1]] = 项[2]
        .split(',')
        .map((能) => 能.trim().replace(/'/g, ''))
        .filter((能) => 能.length > 0)
    }
  }
  if (Object.keys(结果).length === 0) throw new Error('对端 角色能力矩阵 解析结果为空')
  return 结果
}

function 本仓能力位引用(): string[] {
  const 引用 = new Set<string>()
  const 遍历 = (当前: string) => {
    for (const 项 of readdirSync(当前, { withFileTypes: true })) {
      const 完整 = resolve(当前, 项.name)
      if (项.isDirectory()) {
        if (项.name === '__tests__' || 项.name === 'node_modules') continue
        遍历(完整)
      } else if (项.name.endsWith('.ts')) {
        const 源 = readFileSync(完整, 'utf8')
        for (const 匹配 of 源.matchAll(/JuBeiNengLi\([^)]*'(cha_kan|gao_we|[a-z_]+)'\)|menKong\([^)]*'(cha_kan|gao_we|[a-z_]+)'/g)) {
          引用.add(匹配[1])
        }
      }
    }
  }
  遍历(resolve(__dirname, '../..'))
  return [...引用]
}

describe('FP-18 游戏端与管理端角色能力矩阵同源', () => {
  const 对端源 = 读对端()
  const 对端角色 = 取联合成员(对端源, 'GuanLiJiaoSe')
  const 对端能力 = 取联合成员(对端源, 'GuanLiNengLi')
  const 对端矩阵 = 取矩阵(对端源)

  it('角色清单与能力清单逐字等于对端类型联合', () => {
    expect([...管理角色清单].slice().sort()).toEqual(对端角色)
    expect([...管理能力清单].slice().sort()).toEqual(对端能力)
  })

  it('逐角色的能力集合与对端矩阵全等（多一位少一位都算漂移）', () => {
    const 本仓 = Object.fromEntries(
      Object.entries(角色能力矩阵).map(([角色, 能力]) => [角色, [...能力].slice().sort()]),
    )
    const 对端 = Object.fromEntries(Object.entries(对端矩阵).map(([角色, 能力]) => [角色, [...能力].sort()]))
    expect(Object.keys(本仓).sort()).toEqual(对端角色)
    expect(本仓).toEqual(对端)
  })

  it('本仓门禁引用的能力位全都在对端矩阵能力全集内（扩位须两仓同改）', () => {
    const 全集 = new Set(对端能力)
    const 越界 = 本仓能力位引用().filter((能力) => !全集.has(能力))
    expect(越界).toEqual([])
    expect(本仓能力位引用().length).toBeGreaterThanOrEqual(2)
  })

  it('对端仍把本仓门禁依赖的 cha_kan 与 gao_we 两位发给至少一个角色', () => {
    for (const 能力 of ['cha_kan', 'gao_we'] as GuanLiNengLi[]) {
      const 可得 = Object.entries(对端矩阵).filter(([, 能力表]) => 能力表.includes(能力)).map(([角色]) => 角色)
      expect(可得.length, `能力位 ${能力} 在对端矩阵里无人可得`).toBeGreaterThan(0)
    }
  })
})
