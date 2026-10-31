import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { touYingWanJiaKeJianJiaoSe } from '../角色生成'

const 服务源 = readFileSync(resolve(__dirname, '../角色生成.ts'), 'utf8').replace(/\r\n/g, '\n')

function 取函数体(源码: string, 起始标记: string): string {
  const 起 = 源码.indexOf(起始标记)
  expect(起, `缺少 ${起始标记}`).toBeGreaterThan(-1)
  const 结束 = 源码.indexOf('\n}\n', 起)
  expect(结束, `缺少 ${起始标记} 结束`).toBeGreaterThan(起)
  return 源码.slice(起, 结束)
}

describe('FP-05 开场白开口标志', () => {
  it('玩家投影保留 yao_kai_kou，不被隐私剥离', () => {
    const 投影 = touYingWanJiaKeJianJiaoSe({
      id: 'j-1',
      ming_zi: '内部名',
      zhen_shi_ming: '真名',
      wei_xin_ming: '微信名',
      tou_xiang: 'https://example.test/a.png',
      yao_kai_kou: true,
    } as never) as Record<string, unknown>
    expect(投影.yao_kai_kou).toBe(true)
    expect(投影.wei_xin_ming).toBe('微信名')
    expect(投影).not.toHaveProperty('ming_zi')
    expect(投影).not.toHaveProperty('zhen_shi_ming')
  })

  it('标志只在开场白消息真正落库后置真，失败或未开口保持假', () => {
    const 体 = 取函数体(服务源, 'export async function baoCunJiaoSe(')
    const 保存调用 = 体.indexOf('await baoCunJiaoSeXiaoXi({')
    const 置真 = 体.indexOf('yiBaoCunKaiChang = true')
    const 赋值 = 体.indexOf('jiaoSe.yao_kai_kou = yiBaoCunKaiChang')
    expect(保存调用).toBeGreaterThan(-1)
    expect(置真).toBeGreaterThan(保存调用)
    expect(赋值).toBeGreaterThan(置真)
    expect(体.slice(0, 保存调用)).toContain('let yiBaoCunKaiChang = false')
  })

  it('开场白生成异常路径不会把标志置真', () => {
    const 体 = 取函数体(服务源, 'export async function baoCunJiaoSe(')
    const 赋值 = 体.indexOf('jiaoSe.yao_kai_kou = yiBaoCunKaiChang')
    const 捕获 = 体.lastIndexOf('} catch {', 赋值)
    expect(捕获).toBeGreaterThan(-1)
    expect(赋值).toBeGreaterThan(捕获)
    const 捕获段 = 体.slice(捕获, 赋值)
    expect(捕获段).not.toContain('yiBaoCunKaiChang = true')
  })
})
