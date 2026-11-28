import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 根目录 = resolve(__dirname, '..', '..', '..', '..')

describe('测试环境数据库连接策略', () => {
  it('默认不把测试连接串覆盖成假数据库', () => {
    const 源码 = readFileSync(resolve(根目录, 'test-setup.ts'), 'utf8')
    expect(源码).toContain("JIN_YONG_ZHEN_SHI_KU === 'true'")
    expect(源码).not.toContain("peiZhi.shuJuKuLianJie = 测试数据库 || 'postgresql://test@127.0.0.1:1/test'")
  })
})
