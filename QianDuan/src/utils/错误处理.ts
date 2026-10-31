import { 归一前台错误 } from '@/utils/前台错误'

export type CuoWuFenLei = 'jianQuan' | 'wangLuo' | 'fuWuQi' | 'yeWu' | 'shuRu' | 'weiZhi'

function daiMaCunZai(leiXing: ReturnType<typeof 归一前台错误>): boolean {
  return Boolean(leiXing.houTaiBaoFeng?.code || leiXing.jiuDaiMa)
}

export function fenLeiCuoWu(错误: unknown): CuoWuFenLei {
  const zhengChangHua = 归一前台错误(错误)
  if (zhengChangHua.httpStatus === 401 || zhengChangHua.httpStatus === 403) return 'jianQuan'
  if (daiMaCunZai(zhengChangHua)) return 'yeWu'
  const leiXing = zhengChangHua.leiXing
  if (leiXing === 'wangLuo' || leiXing === 'chaoShi') return 'wangLuo'
  if (leiXing === 'fuWu' || leiXing === 'jiaoSe') return 'fuWuQi'
  if (leiXing === 'zhanJi') return 'yeWu'
  if (leiXing === 'qingQiu' || leiXing === 'ziYuan' || leiXing === 'chongTu') return 'shuRu'
  return 'weiZhi'
}

export function huoQuCuoWuTiShi(错误: unknown): string {
  return 归一前台错误(错误).yingXiang
}
