import { describe, expect, it } from 'vitest'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { 归一前台错误 } from '@/utils/前台错误'
import { huoQuFanYi } from '@/config/translations'

function chuangJianHTTP_CuoWu(zhuangTai: number, shuJu: unknown, daiMa = 'ERR_BAD_RESPONSE') {
  const peiZhi = { method: 'get', url: '/测试' } as InternalAxiosRequestConfig
  const xiangYing = {
    status: zhuangTai,
    statusText: '',
    data: shuJu,
    headers: {},
    config: peiZhi,
  } as AxiosResponse
  return new AxiosError('HTTP 原文', daiMa, peiZhi, undefined, xiangYing)
}

describe('FP-14 统一前台错误模型', () => {
  it('FP13 服务端包络归一后保留稳定码、追踪编号与重试语义且不把后端原文上屏', () => {
    const cuoWu = 归一前台错误(
      chuangJianHTTP_CuoWu(503, {
        cheng_gong: false,
        shu_ju: null,
        ti_shi: '内部 SQL /api/private 路径',
        cuo_wu_ma: 'SERVICE_UNAVAILABLE',
        code: 'SERVICE_UNAVAILABLE',
        message: '内部 SQL /api/private 路径',
        traceId: 'request-0123456789abcdef',
        retryable: true,
      }),
    )

    expect(cuoWu.code).toBe('SERVICE_UNAVAILABLE')
    expect(cuoWu.traceId).toBe('request-0123456789abcdef')
    expect(cuoWu.retryable).toBe(true)
    expect(cuoWu.houTaiBaoFeng).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: '内部 SQL /api/private 路径',
      traceId: 'request-0123456789abcdef',
      retryable: true,
    })
    expect(cuoWu.yingXiang).toBe(huoQuFanYi('tongYong', 'fuWuWenTiYingXiang'))
    expect(cuoWu.xiaYiBu).toBe(huoQuFanYi('tongYong', 'fuWuWenTiXiaYiBu'))
    expect(cuoWu.yingXiang).not.toContain('SQL')
    expect(cuoWu.xiaYiBu).not.toContain('/api/private')
  })

  it.each([
    [401, QIAN_TAI_DAI_MA.AUTHENTICATION_REQUIRED, 'jianQuanWenTiYingXiang', false],
    [403, QIAN_TAI_DAI_MA.PERMISSION_DENIED, 'quanXianWenTiYingXiang', false],
    [404, QIAN_TAI_DAI_MA.RESOURCE_NOT_FOUND, 'ziYuanWenTiYingXiang', false],
    [409, QIAN_TAI_DAI_MA.RESOURCE_CONFLICT, 'chongTuWenTiYingXiang', false],
    [429, QIAN_TAI_DAI_MA.RATE_LIMITED, 'pinFanWenTiYingXiang', true],
    [500, QIAN_TAI_DAI_MA.INTERNAL_ERROR, 'fuWuWenTiYingXiang', true],
    [502, QIAN_TAI_DAI_MA.UPSTREAM_NETWORK_ERROR, 'fuWuWenTiYingXiang', true],
    [503, QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE, 'fuWuWenTiYingXiang', true],
    [504, QIAN_TAI_DAI_MA.UPSTREAM_TIMEOUT, 'fuWuWenTiYingXiang', true],
  ] as const)(
    'HTTP %i 无包络时归一为白名单稳定码且语义正确（5xx 一律可重试：安全读自动重试、写仅用户手动重试）',
    (zhuangTai, daiMa, yingXiangJian, keChongShi) => {
      const cuoWu = 归一前台错误(chuangJianHTTP_CuoWu(zhuangTai, {}))
      expect(cuoWu.code).toBe(daiMa)
      expect(cuoWu.yingXiang).toBe(huoQuFanYi('tongYong', yingXiangJian))
      expect(cuoWu.retryable).toBe(keChongShi)
      expect(cuoWu.yingXiang).not.toContain('Bad Gateway')
    },
  )

  it('无 response 的网络失败与超时分别使用统一白名单错误码', () => {
    const wangLuo = 归一前台错误(
      new AxiosError('socket /private/path', 'ERR_NETWORK', {
        method: 'get',
        url: '/private',
      } as InternalAxiosRequestConfig),
    )
    const chaoShi = 归一前台错误(
      new AxiosError('timeout of 15000ms', 'ECONNABORTED', {
        method: 'get',
        url: '/private',
      } as InternalAxiosRequestConfig),
    )

    expect(wangLuo.code).toBe(QIAN_TAI_DAI_MA.WANG_LUO)
    expect(wangLuo.retryable).toBe(true)
    expect(wangLuo.yingXiang).toBe(huoQuFanYi('tongYong', 'wangLuoWenTiYingXiang'))
    expect(chaoShi.code).toBe(QIAN_TAI_DAI_MA.CHAO_SHI)
    expect(chaoShi.yingXiang).toBe(huoQuFanYi('tongYong', 'chaoShiWenTiYingXiang'))
    expect(wangLuo.message).not.toContain('/private')
    expect(chaoShi.message).not.toContain('15000')
  })

  it('Abort 与主动取消归一为不可见错误，不进入页面提示', () => {
    const cuoWu = 归一前台错误(
      new AxiosError('canceled', 'ERR_CANCELED', {
        method: 'get',
        url: '/x',
      } as InternalAxiosRequestConfig),
    )

    expect(cuoWu.code).toBe(QIAN_TAI_DAI_MA.QU_XIAO)
    expect(cuoWu.xianShi).toBe(false)
    expect(cuoWu.retryable).toBe(false)
  })

  it('2xx 返回非 JSON 页面只显示协议错误白名单文案', () => {
    const cuoWu = 归一前台错误(chuangJianHTTP_CuoWu(200, '<!DOCTYPE html><html>网关维护页</html>'))
    expect(cuoWu.code).toBe(QIAN_TAI_DAI_MA.XIE_YI)
    expect(cuoWu.yuanLeiXing).toBe('xieYi')
    expect(cuoWu.yingXiang).toBe(huoQuFanYi('tongYong', 'xieYiWenTiYingXiang'))
    expect(cuoWu.message).not.toContain('DOCTYPE')
    expect(cuoWu.message).not.toContain('网关维护页')
  })

  it('5xx 文本响应体按状态归为服务侧错误，原始响应体不上屏', () => {
    const cuoWu = 归一前台错误(chuangJianHTTP_CuoWu(502, '502 Bad Gateway: /api/internal'))
    expect(cuoWu.code).toBe(QIAN_TAI_DAI_MA.UPSTREAM_NETWORK_ERROR)
    expect(cuoWu.leiXing).toBe('fuWu')
    expect(cuoWu.yingXiang).toBe(huoQuFanYi('tongYong', 'fuWuWenTiYingXiang'))
    expect(cuoWu.message).not.toContain('Bad Gateway')
    expect(cuoWu.message).not.toContain('/api/internal')
  })

  it('未知后端 code 不上屏，原始 code 仅保留在内部包络', () => {
    const cuoWu = 归一前台错误(
      chuangJianHTTP_CuoWu(400, {
        cheng_gong: false,
        code: 'SQL_STACK_ENV_SECRET_PATH',
        message: 'SELECT * FROM users at /srv/app/server.js',
        traceId: 'request-unsafe-code',
        retryable: false,
      }),
    )

    expect(cuoWu.code).not.toBe('SQL_STACK_ENV_SECRET_PATH')
    expect(cuoWu.code).toBe(QIAN_TAI_DAI_MA.WEI_ZHI)
    expect(cuoWu.houTaiBaoFeng?.code).toBe('SQL_STACK_ENV_SECRET_PATH')
    expect(cuoWu.houTaiBaoFeng?.message).toContain('SELECT')
    expect(cuoWu.yingXiang).not.toContain('SELECT')
    expect(cuoWu.xiaYiBu).not.toContain('/srv/app')
    expect(cuoWu.retryable).toBe(false)
  })

  it('无任何可判据的未知失败仍允许用户手动重试一次', () => {
    const cuoWu = 归一前台错误(new Error('boom'))
    expect(cuoWu.code).toBe(QIAN_TAI_DAI_MA.WEI_ZHI)
    expect(cuoWu.retryable).toBe(true)
    expect(cuoWu.yingXiang).not.toContain('boom')
  })

  it('后端可重试语义优先于状态码兜底，追踪编号只接受安全格式', () => {
    const cuoWu = 归一前台错误(
      chuangJianHTTP_CuoWu(503, {
        code: QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE,
        message: 'x',
        traceId: '<script>alert(1)</script>',
        retryable: false,
        retryAfterMs: -10,
      }),
    )
    expect(cuoWu.retryable).toBe(false)
    expect(cuoWu.traceId).toBeNull()
    expect(cuoWu.retryAfterMs).toBe(0)
  })
})
