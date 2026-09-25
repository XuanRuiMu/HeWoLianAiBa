import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import request from 'supertest'

const 假 = vi.hoisted(() => ({
  anShouJiHao: vi.fn(),
  anId: vi.fn(),
  faSong: vi.fn(),
  zhuCe: vi.fn(),
  dengLu: vi.fn(),
  gengGaiMiMa: vi.fn(),
  gengGaiYongHuMing: vi.fn(),
  setMoRenXingBie: vi.fn(),
  shuaXinLingPai: vi.fn(),
  zhuXiaoYongHu: vi.fn(),
  faSongYanZhengMa: vi.fn(),
  duanXinRiPeiEYuLan: vi.fn(),
  xingWeiXuYao: vi.fn(),
  xingWeiXiaoHao: vi.fn(),
  shanChuToken: vi.fn(),
  cheXiao全部: vi.fn(),
}))

vi.mock('../../services/认证', () => ({
  anShouJiHaoChaYongHu: 假.anShouJiHao,
  anIdChaYongHu: 假.anId,
  yanZhengShouJiHaoGeShi: (v: string) => /^1[3-9]\d{9}$/.test(v),
  zhuCe: 假.zhuCe,
  dengLu: 假.dengLu,
  gengGaiMiMa: 假.gengGaiMiMa,
  gengGaiYongHuMing: 假.gengGaiYongHuMing,
  setMoRenXingBie: 假.setMoRenXingBie,
  shuaXinLingPai: 假.shuaXinLingPai,
  zhuXiaoLingPai: vi.fn(),
}))

vi.mock('../../services/短信', () => ({
  faSongYanZhengMa: 假.faSong,
  duanXinRiPeiEYuLan: 假.duanXinRiPeiEYuLan,
}))

vi.mock('../../services/行为验证', () => ({
  xingWeiYanZhengXuYao: 假.xingWeiXuYao,
  xingWeiYanZhengXiaoHao: 假.xingWeiXiaoHao,
  jiLuZhuCeShiBai: vi.fn(async () => undefined),
}))

vi.mock('../../services/账号注销', () => ({ zhuXiaoYongHu: 假.zhuXiaoYongHu }))
vi.mock('../../utils/jwt', () => ({ shanChuRefreshToken: 假.shanChuToken, cheXiaoYongHuSuoYouRefreshToken: 假.cheXiao全部 }))
vi.mock('../../utils/真实IP', () => ({ huoQuZhenShiIP: () => '127.0.0.1' }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

vi.mock('../../middleware/限流', () => {
  const 放行 = (_q: unknown, _r: unknown, 下一步: () => void) => 下一步()
  return {
    dengLuXianLiu: 放行,
    dengLuIPLianLiu: 放行,
    faSongMaXianLiu: 放行,
    zhuCeXianLiu: 放行,
    jianChaShouJiXianLiu: 放行,
    duanXinRiPeiEZhuJi: 放行,
  }
})

vi.mock('../../middleware/输入验证', () => {
  const 放行 = (_q: unknown, _r: unknown, 下一步: () => void) => 下一步()
  return { 手机号验证中间件: 放行, 用户名验证中间件: 放行 }
})

import 路由 from '../认证'

const 用户ID = '11111111-1111-4111-8111-111111111111'
const 角色ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function 建应用(登录: string | null): Express {
  const 应用 = express()
  应用.use(express.json())
  应用.use((请求, _响应, 下一步) => {
    请求.url = decodeURI(请求.url)
    下一步()
  })
  应用.use((请求, _响应, 下一步) => {
    if (登录) (请求 as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 登录 }
    下一步()
  })
  应用.use('/api/认证', 路由)
  return 应用
}

function 调用(方法: 'get' | 'post' | 'put' | 'delete', 路径: string, 登录: string | null = 用户ID, 数据?: unknown) {
  const 实例 = request(建应用(登录))
  return (实例[方法] as (路径: string) => ReturnType<typeof request>)(encodeURI(路径)).send(数据 as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.FP02_YAN_ZHENG_JI_LU
  假.anShouJiHao.mockResolvedValue({ id: 用户ID })
  假.anId.mockResolvedValue({ id: 用户ID, yong_hu_ming: 'test' })
  假.faSong.mockResolvedValue({ cheng_gong: true })
  假.duanXinRiPeiEYuLan.mockResolvedValue({ yun_xu: true })
  假.xingWeiXuYao.mockResolvedValue(false)
  假.xingWeiXiaoHao.mockResolvedValue(true)
  假.zhuCe.mockResolvedValue({ cheng_gong: true, shu_ju: { id: 用户ID } })
  假.dengLu.mockResolvedValue({ cheng_gong: true, shu_ju: { id: 用户ID } })
  假.gengGaiMiMa.mockResolvedValue({ cheng_gong: true, ti_shi: '已修改' })
  假.gengGaiYongHuMing.mockResolvedValue({ cheng_gong: true, yong_hu: { yong_hu_ming: 'new' } })
  假.setMoRenXingBie.mockResolvedValue({ cheng_gong: true, yong_hu: { mo_ren_xing_bie: 'female' } })
  假.shuaXinLingPai.mockResolvedValue({ cheng_gong: true, shu_ju: { 令牌: 'a', 刷新令牌: 'r' } })
  假.zhuXiaoYongHu.mockResolvedValue({ cheng_gong: true, ti_shi: '已注销' })
})

describe('认证路由输入、错误码和成功出口', () => {
  it('检查手机号与发送验证码覆盖参数错误、限流、未知错误和成功', async () => {
    await 调用('get', '/api/认证/检查手机?q=bad', 用户ID).expect(400)
    await 调用('get', '/api/认证/检查手机?shouJiHao=13800138000', 用户ID).expect(200)
    await 调用('post', '/api/认证/发送码', 用户ID, { shouJiHao: 'bad' }).expect(400)
    假.faSong.mockResolvedValueOnce({ cheng_gong: false, cuo_wu_ma: 'XIAN_LIU', ti_shi: '频繁' })
    await 调用('post', '/api/认证/发送码', 用户ID, { shouJiHao: '13800138000' }).expect(429)
    假.faSong.mockResolvedValueOnce({ cheng_gong: false, cuo_wu_ma: 'OTHER', ti_shi: '' })
    await 调用('post', '/api/认证/发送码', 用户ID, { shouJiHao: '13800138000' }).expect(503)
    await 调用('post', '/api/认证/发送码', 用户ID, { shou_ji_hao: '13800138000' }).expect(200)
  })

  it('注册覆盖缺参、配额、行为验证码、服务错误码和成功', async () => {
    const 完整 = {
      shouJiHao: '13800138000',
      yanZhengMa: '123456',
      yongHuMing: 'new_user',
      miMa: 'Strong123!',
      tongYiXieYi: true,
      chuShengRiQi: '2000-01-01',
    }
    await 调用('post', '/api/认证/注册', 用户ID, {}).expect(400)
    假.duanXinRiPeiEYuLan.mockResolvedValueOnce({ yun_xu: false, ti_shi: '额度用尽' })
    await 调用('post', '/api/认证/注册', 用户ID, 完整).expect(429)
    process.env.FP02_YAN_ZHENG_JI_LU = 'true'
    假.xingWeiXuYao.mockResolvedValueOnce(true)
    假.xingWeiXiaoHao.mockResolvedValueOnce(false)
    await 调用('post', '/api/认证/注册', 用户ID, 完整).expect(403)
    假.xingWeiXuYao.mockResolvedValueOnce(true)
    假.xingWeiXiaoHao.mockResolvedValueOnce(true)
    假.zhuCe.mockResolvedValueOnce({ cheng_gong: false, cuo_wu_ma: 'CHONG_TU', ti_shi: '重复' })
    await 调用('post', '/api/认证/注册', 用户ID, 完整).expect(409)
    假.zhuCe.mockResolvedValueOnce({ cheng_gong: false, cuo_wu_ma: 'XIAN_LIU', ti_shi: '' })
    await 调用('post', '/api/认证/注册', 用户ID, 完整).expect(429)
    假.zhuCe.mockResolvedValueOnce({ cheng_gong: false, cuo_wu_ma: 'NEI_BU_CUO_WU', ti_shi: '' })
    await 调用('post', '/api/认证/注册', 用户ID, 完整).expect(503)
    假.zhuCe.mockResolvedValueOnce({ cheng_gong: false, cuo_wu_ma: 'UNKNOWN', ti_shi: '' })
    await 调用('post', '/api/认证/注册', 用户ID, 完整).expect(400)
    await 调用('post', '/api/认证/注册', 用户ID, { ...完整, shou_ji_hao: '13800138000', yan_zheng_ma: '123456', yong_hu_ming: 'new_user', mi_ma: 'Strong123!', tong_yi_xie_yi: true, chu_sheng_ri_qi: '2000-01-01' }).expect(200)
  })

  it('登录和刷新覆盖缺参、业务失败、别名输入与成功', async () => {
    await 调用('post', '/api/认证/登录', 用户ID, {}).expect(400)
    假.dengLu.mockResolvedValueOnce({ cheng_gong: false, zhuang_tai_ma: 401, ti_shi: '账号或密码错误' })
    await 调用('post', '/api/认证/登录', 用户ID, { shouJiHao: '13800138000', miMa: 'x' }).expect(401)
    await 调用('post', '/api/认证/登录', 用户ID, { shou_ji_hao: '13800138000', mi_ma: 'x' }).expect(200)
    await 调用('post', '/api/认证/刷新', 用户ID, {}).expect(400)
    假.shuaXinLingPai.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '过期' })
    await 调用('post', '/api/认证/刷新', 用户ID, { refreshTokenId: 'x' }).expect(401)
    await 调用('post', '/api/认证/刷新', 用户ID, { refresh_token_id: 'x' }).expect(200)
  })

  it('吊销、改密码、改用户名和默认性别覆盖未认证、缺参、失败与成功', async () => {
    await 调用('post', '/api/认证/吊销刷新令牌', null, {}).expect(401)
    await 调用('post', '/api/认证/吊销刷新令牌', 用户ID, { refreshTokenId: 'x' }).expect(200)
    expect(假.shanChuToken).toHaveBeenCalledWith('x', 用户ID)
    await 调用('post', '/api/认证/吊销刷新令牌', 用户ID, {}).expect(200)
    expect(假.cheXiao全部).toHaveBeenCalledWith(用户ID)
    await 调用('post', '/api/认证/更改密码', null, {}).expect(401)
    await 调用('post', '/api/认证/更改密码', 用户ID, {}).expect(400)
    假.gengGaiMiMa.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '旧密码错误' })
    await 调用('post', '/api/认证/更改密码', 用户ID, { jiuMiMa: 'old', xinMiMa: 'New123!', queRenXinMiMa: 'New123!', yanZhengMa: '123456' }).expect(400)
    await 调用('post', '/api/认证/更改密码', 用户ID, { jiu_mi_ma: 'old', xin_mi_ma: 'New123!', que_ren_xin_mi_ma: 'New123!', yan_zheng_ma: '123456' }).expect(200)
    await 调用('post', '/api/认证/更改用户名', null, {}).expect(401)
    await 调用('post', '/api/认证/更改用户名', 用户ID, {}).expect(400)
    假.gengGaiYongHuMing.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '重复' })
    await 调用('post', '/api/认证/更改用户名', 用户ID, { yongHuMing: 'old' }).expect(409)
    await 调用('post', '/api/认证/更改用户名', 用户ID, { yong_hu_ming: 'new' }).expect(200)
    await 调用('post', '/api/认证/设置默认性别', null, {}).expect(401)
    await 调用('post', '/api/认证/设置默认性别', 用户ID, {}).expect(400)
    假.setMoRenXingBie.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '非法' })
    await 调用('post', '/api/认证/设置默认性别', 用户ID, { moRenXingBie: 'x' }).expect(400)
    await 调用('post', '/api/认证/设置默认性别', 用户ID, { mo_ren_xing_bie: 'female' }).expect(200)
  })

  it('信息与注销覆盖未认证、资源不存在、业务失败、异常和成功', async () => {
    await 调用('get', '/api/认证/信息', null).expect(401)
    假.anId.mockResolvedValueOnce(null)
    await 调用('get', '/api/认证/信息', 用户ID).expect(404)
    await 调用('get', '/api/认证/信息', 用户ID).expect(200)
    await 调用('delete', '/api/认证/注销', null).expect(401)
    假.zhuXiaoYongHu.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败' })
    await 调用('delete', '/api/认证/注销', 用户ID).expect(500)
    假.zhuXiaoYongHu.mockRejectedValueOnce(new Error('db down'))
    await 调用('delete', '/api/认证/注销', 用户ID).expect(500)
    await 调用('delete', '/api/认证/注销', 用户ID).expect(200)
  })
})
