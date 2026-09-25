import { describe, it, expect } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { fenLeiCuoWu, huoQuCuoWuTiShi } from '@/utils/错误处理'
import { huoQuFanYi } from '@/config/translations'

function chuangJianAxiosCuoWu(选项: {
  status?: number
  data?: unknown
  code?: string
  url?: string
}): AxiosError {
  const config = { url: 选项.url } as InternalAxiosRequestConfig
  if (选项.status === undefined) {
    return new AxiosError('请求失败', 选项.code, config, undefined, undefined)
  }
  const response = {
    status: 选项.status,
    statusText: '',
    data: 选项.data,
    headers: {},
    config,
  } as AxiosResponse
  return new AxiosError('请求失败', 选项.code, config, undefined, response)
}

describe('FP-11 前端错误处理统一', () => {
  describe('fenLeiCuoWu 错误分类', () => {
    it('401 状态码归为鉴权错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 401, data: { ti_shi: '未授权' } })
      expect(fenLeiCuoWu(cuoWu)).toBe('jianQuan')
    })

    it('403 状态码归为鉴权错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 403, data: { ti_shi: '禁止访问' } })
      expect(fenLeiCuoWu(cuoWu)).toBe('jianQuan')
    })

    it('401 带 cuo_wu_ma 仍归为鉴权错误（鉴权优先于业务）', () => {
      const cuoWu = chuangJianAxiosCuoWu({
        status: 401,
        data: { cheng_gong: false, ti_shi: '未授权', cuo_wu_ma: 'WEI_SHOU_QUAN' },
      })
      expect(fenLeiCuoWu(cuoWu)).toBe('jianQuan')
    })

    it('500 状态码无业务错误码归为服务器错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 500, data: 'Internal Server Error' })
      expect(fenLeiCuoWu(cuoWu)).toBe('fuWuQi')
    })

    it('502 状态码归为服务器错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 502, data: 'Bad Gateway' })
      expect(fenLeiCuoWu(cuoWu)).toBe('fuWuQi')
    })

    it('500 带 cuo_wu_ma 归为业务错误（业务优先于服务器）', () => {
      const cuoWu = chuangJianAxiosCuoWu({
        status: 500,
        data: {
          cheng_gong: false,
          ti_shi: '服务器内部错误',
          cuo_wu_ma: 'FU_WU_QI_NEI_BU_CUO_WU',
        },
      })
      expect(fenLeiCuoWu(cuoWu)).toBe('yeWu')
    })

    it('409 带 cuo_wu_ma 归为业务错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({
        status: 409,
        data: { cheng_gong: false, ti_shi: '军师重复', cuo_wu_ma: 'JUN_SHI_CHONG_FU' },
      })
      expect(fenLeiCuoWu(cuoWu)).toBe('yeWu')
    })

    it('400 状态码归为输入错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 400, data: 'Bad Request' })
      expect(fenLeiCuoWu(cuoWu)).toBe('shuRu')
    })

    it('404 状态码归为输入错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 404, data: 'Not Found' })
      expect(fenLeiCuoWu(cuoWu)).toBe('shuRu')
    })

    it('422 状态码归为输入错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 422, data: 'Validation Error' })
      expect(fenLeiCuoWu(cuoWu)).toBe('shuRu')
    })

    it('无 response 的 axios 错误归为网络错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({ code: 'ERR_NETWORK' })
      expect(fenLeiCuoWu(cuoWu)).toBe('wangLuo')
    })

    it('ECONNABORTED 超时错误归为网络错误', () => {
      const cuoWu = chuangJianAxiosCuoWu({ code: 'ECONNABORTED' })
      expect(fenLeiCuoWu(cuoWu)).toBe('wangLuo')
    })

    it('带 cuo_wu_ma 的普通 Error 归为业务错误', () => {
      const cuoWu = new Error('业务失败') as Error & { cuo_wu_ma?: string }
      cuoWu.cuo_wu_ma = 'YE_WU_CUO_WU'
      expect(fenLeiCuoWu(cuoWu)).toBe('yeWu')
    })

    it('普通 Error 归为未知错误', () => {
      expect(fenLeiCuoWu(new Error('随便什么'))).toBe('weiZhi')
    })

    it('null 归为未知错误', () => {
      expect(fenLeiCuoWu(null)).toBe('weiZhi')
    })

    it('undefined 归为未知错误', () => {
      expect(fenLeiCuoWu(undefined)).toBe('weiZhi')
    })

    it('字符串归为未知错误', () => {
      expect(fenLeiCuoWu('错误字符串')).toBe('weiZhi')
    })
  })

  describe('huoQuCuoWuTiShi 错误提示（FP-14：只出安全影响文案，绝不回显后端原文）', () => {
    it('网络错误返回 wangLuoWenTiYingXiang 翻译', () => {
      const cuoWu = chuangJianAxiosCuoWu({ code: 'ERR_NETWORK' })
      expect(huoQuCuoWuTiShi(cuoWu)).toBe(huoQuFanYi('tongYong', 'wangLuoWenTiYingXiang'))
    })

    it('ECONNABORTED 超时返回 chaoShiWenTiYingXiang 翻译', () => {
      const cuoWu = chuangJianAxiosCuoWu({ code: 'ECONNABORTED' })
      expect(huoQuCuoWuTiShi(cuoWu)).toBe(huoQuFanYi('tongYong', 'chaoShiWenTiYingXiang'))
    })

    it('鉴权错误返回 jianQuanWenTiYingXiang 翻译', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 401, data: { ti_shi: '未授权' } })
      expect(huoQuCuoWuTiShi(cuoWu)).toBe(huoQuFanYi('tongYong', 'jianQuanWenTiYingXiang'))
    })

    it('服务器错误返回 fuWuWenTiYingXiang 翻译', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 500, data: 'Internal Server Error' })
      expect(huoQuCuoWuTiShi(cuoWu)).toBe(huoQuFanYi('tongYong', 'fuWuWenTiYingXiang'))
    })

    it('输入错误返回 qingQiuWenTiYingXiang 翻译', () => {
      const cuoWu = chuangJianAxiosCuoWu({ status: 400, data: 'Bad Request' })
      expect(huoQuCuoWuTiShi(cuoWu)).toBe(huoQuFanYi('tongYong', 'qingQiuWenTiYingXiang'))
    })

    it('业务错误不回显后端 message，只出分类安全文案', () => {
      const cuoWu = new Error('手机号已注册') as Error & { cuo_wu_ma?: string }
      cuoWu.cuo_wu_ma = 'SHOU_JI_HAO_YI_ZHU_CE'
      const wenBen = huoQuCuoWuTiShi(cuoWu)
      expect(wenBen).toBe(huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'))
      expect(wenBen).not.toContain('手机号已注册')
    })

    it('后端 ti_shi 永不上屏（500 包络原文）', () => {
      const cuoWu = chuangJianAxiosCuoWu({
        status: 500,
        data: { cheng_gong: false, ti_shi: '数据库 password 泄露', code: 'INTERNAL_ERROR' },
      })
      expect(huoQuCuoWuTiShi(cuoWu)).not.toContain('password')
    })

    it('未知错误有 message 时也不回显 message', () => {
      const wenBen = huoQuCuoWuTiShi(new Error('随便什么'))
      expect(wenBen).toBe(huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'))
      expect(wenBen).not.toContain('随便什么')
    })

    it('未知错误为 null 时返回 tongYongWenTiYingXiang 翻译', () => {
      expect(huoQuCuoWuTiShi(null)).toBe(huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'))
    })

    it('未知错误为 undefined 时返回 tongYongWenTiYingXiang 翻译', () => {
      expect(huoQuCuoWuTiShi(undefined)).toBe(huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'))
    })
  })
})
