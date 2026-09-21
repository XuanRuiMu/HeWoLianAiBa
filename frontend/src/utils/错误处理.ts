import axios from 'axios'
import { huoQuFanYi } from '@/config/translations'

export type CuoWuFenLei = 'jianQuan' | 'wangLuo' | 'fuWuQi' | 'yeWu' | 'shuRu' | 'weiZhi'

interface YeWuShuJu {
  cuo_wu_ma?: string
  ti_shi?: string
  cheng_gong?: boolean
}

function shiYeWuShuJu(数据: unknown): 数据 is YeWuShuJu {
  return (
    typeof 数据 === 'object' &&
    数据 !== null &&
    'cuo_wu_ma' in 数据 &&
    typeof (数据 as YeWuShuJu).cuo_wu_ma === 'string'
  )
}

export function fenLeiCuoWu(错误: unknown): CuoWuFenLei {
  if (axios.isAxiosError(错误)) {
    if (!错误.response) {
      return 'wangLuo'
    }
    const { status, data } = 错误.response
    if (status === 401 || status === 403) {
      return 'jianQuan'
    }
    if (shiYeWuShuJu(data)) {
      return 'yeWu'
    }
    if (status >= 500) {
      return 'fuWuQi'
    }
    if (status === 400 || status === 404 || status === 422) {
      return 'shuRu'
    }
    return 'weiZhi'
  }

  if (错误 instanceof Error && 'cuo_wu_ma' in 错误) {
    return 'yeWu'
  }

  return 'weiZhi'
}

export function huoQuCuoWuTiShi(错误: unknown): string {
  const fenLei = fenLeiCuoWu(错误)

  switch (fenLei) {
    case 'wangLuo':
      if (axios.isAxiosError(错误) && 错误.code === 'ECONNABORTED') {
        return huoQuFanYi('tongYong', 'qingQiuChaoShi')
      }
      return huoQuFanYi('tongYong', 'wangLuoCuoWu')
    case 'jianQuan':
      return huoQuFanYi('tongYong', 'dengLuGuoQi')
    case 'fuWuQi':
      return huoQuFanYi('tongYong', 'fuWuQiCuoWu')
    case 'shuRu':
      return huoQuFanYi('tongYong', 'shuRuCuoWu')
    case 'yeWu':
      if (错误 instanceof Error && 错误.message) {
        return 错误.message
      }
      return huoQuFanYi('tongYong', 'caoZuoShiBai')
    case 'weiZhi':
    default:
      if (错误 instanceof Error && 错误.message) {
        return 错误.message
      }
      return huoQuFanYi('tongYong', 'weiZhiCuoWu')
  }
}
