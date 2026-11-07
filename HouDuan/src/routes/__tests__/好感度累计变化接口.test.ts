import { beforeEach, describe, expect, it, vi } from 'vitest'

const { 查询累计, 归一角色 } = vi.hoisted(() => ({
  查询累计: vi.fn(),
  归一角色: vi.fn(async (值: string) => (值 === '不存在' ? null : 值)),
}))

vi.mock('../../services/好感度历史', () => ({
  huoQuHaoGanDuLeiJiBianHua: 查询累计,
}))

vi.mock('../../services/公开编号', () => ({
  guiYiHuaJiaoSeBiaoShi: 归一角色,
}))

import 好感度路由 from '../好感度'

type 请求体 = {
  yong_hu?: { yongHuId: string }
  params: Record<string, string>
  body: Record<string, unknown>
}
type 响应体 = {
  statusCode: number
  body: Record<string, unknown>
  locals: Record<string, unknown>
  status: (码: number) => 响应体
  json: (值: Record<string, unknown>) => 响应体
  setHeader: () => void
}
type 处理器 = (请求: 请求体, 响应: 响应体) => Promise<void> | void

function 取处理器(路径: string): 处理器 {
  const 路由层 = (
    好感度路由 as unknown as {
      stack: Array<{
        route?: { path: string; stack: Array<{ handle: 处理器 }> }
      }>
    }
  ).stack.find((层) => 层.route?.path === 路径)
  if (!路由层?.route) throw new Error('未注册目标路由：' + 路径)
  return 路由层.route.stack[0].handle
}

function 造响应(): 响应体 {
  const 响应: 响应体 = {
    statusCode: 200,
    body: {},
    locals: {},
    status(码) {
      响应.statusCode = 码
      return 响应
    },
    json(值) {
      响应.body = 值
      return 响应
    },
    setHeader() {},
  }
  return 响应
}

async function 调用累计接口(选项: { 登录?: boolean; 角色?: string } = {}) {
  const 处理器 = 取处理器('/:jiaoSeId/累计变化')
  const 请求: 请求体 = {
    params: { jiaoSeId: 选项.角色 ?? 'j-1' },
    body: {},
  }
  if (选项.登录 !== false) 请求.yong_hu = { yongHuId: 'u-1' }
  const 响应 = 造响应()
  await 处理器(请求, 响应)
  return 响应
}

beforeEach(() => {
  查询累计.mockReset()
  归一角色.mockClear()
})

describe('好感度累计变化接口', () => {
  it('登录用户按自己的编号读取五维累计值与发生次数', async () => {
    查询累计.mockResolvedValueOnce({
      lun_ci_shu: 9,
      xin_ren_du_bian_hua: 12,
      qin_mi_du_bian_hua: 8,
      qu_wei_du_bian_hua: 6,
      guan_huai_du_bian_hua: 4,
      zong_fen_bian_hua: 30,
    })
    const 响应 = await 调用累计接口()
    expect(响应.statusCode).toBe(200)
    expect(响应.body).toEqual({
      cheng_gong: true,
      shu_ju: {
        lun_ci_shu: 9,
        xin_ren_du_bian_hua: 12,
        qin_mi_du_bian_hua: 8,
        qu_wei_du_bian_hua: 6,
        guan_huai_du_bian_hua: 4,
        zong_fen_bian_hua: 30,
      },
      ti_shi: undefined,
    })
    expect(查询累计).toHaveBeenCalledWith('u-1', 'j-1')
  })

  it('未登录拒绝访问且不触达数据库', async () => {
    const 响应 = await 调用累计接口({ 登录: false })
    expect(响应.statusCode).toBe(401)
    expect(响应.body.cheng_gong).toBe(false)
    expect(查询累计).not.toHaveBeenCalled()
  })

  it('无法归一化的角色编号返回参数错误', async () => {
    const 响应 = await 调用累计接口({ 角色: '不存在' })
    expect(响应.statusCode).toBe(400)
    expect(查询累计).not.toHaveBeenCalled()
  })

  it('累计读取异常返回统一服务器错误，不泄露技术细节', async () => {
    查询累计.mockRejectedValueOnce(new Error('数据库密码或其他内部细节'))
    const 响应 = await 调用累计接口()
    expect(响应.statusCode).toBe(500)
    expect(JSON.stringify(响应.body)).not.toContain('数据库密码')
    expect(响应.body.cheng_gong).toBe(false)
  })
})
