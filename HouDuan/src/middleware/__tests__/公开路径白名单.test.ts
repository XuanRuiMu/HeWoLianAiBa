import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { gongKaiLuJingBaiMingDan } from '../认证'

const 路由源码 = readFileSync(resolve(__dirname, '../../routes/认证.ts'), 'utf8')

describe('公开路径白名单：认证面不得出现「需要登录却没进白名单」的入口', () => {
  it('重置密码（忘记密码）必须在公开白名单里，否则忘了密码的人永远走不到', () => {
    const 条目 = gongKaiLuJingBaiMingDan.find(
      (x) => x.fang_fa === 'POST' && x.lu_jing === '/api/认证/重置密码',
    )
    expect(条目, '重置密码没进公开白名单，前端点了会直接 401').toBeDefined()
  })

  it('白名单里不得出现任何需要登录态的路径（改密码/改用户名/注销等）', () => {
    const 需登录 = ['更改密码', '更改用户名', '设置默认性别', '信息', '注销', '吊销刷新令牌']
    const 混入 = gongKaiLuJingBaiMingDan.filter((x) =>
      需登录.some((p) => x.lu_jing === `/api/认证/${p}`),
    )
    expect(混入.map((x) => x.lu_jing), '登录态接口被误放进公开白名单等于无鉴权').toEqual([])
  })

  it('重置密码路由不得取登录态，免登录前提不能被破坏', () => {
    const 重置段 = /luYou\.post\('\/重置密码',[\s\S]*?\n\}\)/.exec(路由源码)
    expect(重置段, '未找到重置密码路由').not.toBeNull()
    expect(重置段?.[0], '重置密码路由里取了登录态，免登录入口失效').not.toContain('qingQiu.yong_hu')
  })

  it('白名单条目无重复', () => {
    const 键 = gongKaiLuJingBaiMingDan.map((x) => `${x.fang_fa} ${x.lu_jing}`)
    expect(键.length).toBe(new Set(键).size)
  })
})
