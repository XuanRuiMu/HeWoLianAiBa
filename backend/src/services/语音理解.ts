import { debug日志 } from '../utils/debug日志'
import { huoQuDuoMoTaiPeiZhi, huoQuGuiJiLiuDongMiYao } from '../config/多模态配置'

export interface YuYinKeDuCanShu {
  zhuanXieWenBen?: string | null
  yinPinShiJianMiaoShu?: string | null
  shiChangHaoMiao?: number | null
}

type YinPinMock = ((canShu: { sha256: string; mime: string }) => Promise<string | null>) | null

let yinPinMock: YinPinMock = null

export function sheZhiYuYinLiJieMock(fn: YinPinMock): void {
  yinPinMock = fn
}

function qingXiWenBen(wenBen: string | null | undefined, shangXian: number): string {
  if (typeof wenBen !== 'string') return ''
  return wenBen.trim().slice(0, shangXian)
}

function geShiHuaMiao(miao?: number | null): string {
  if (miao == null || !Number.isFinite(Number(miao))) return ''
  const haoMiao = Number(miao)
  if (haoMiao <= 0) return ''
  return `(${Math.round(haoMiao / 1000)}秒)`
}

export function gouJianYuYinKeDuWenBen(canShu: YuYinKeDuCanShu): string {
  const zhuanXie = qingXiWenBen(canShu.zhuanXieWenBen, 500)
  const shiJian = qingXiWenBen(canShu.yinPinShiJianMiaoShu, 200)
  const shiChang = geShiHuaMiao(canShu.shiChangHaoMiao)
  if (zhuanXie && shiJian) return `[语音转写：${zhuanXie}][音频事件：${shiJian}]${shiChang}`
  if (zhuanXie) return `[语音转写：${zhuanXie}]${shiChang}`
  if (shiJian) return `[语音：${shiJian}]${shiChang}`
  return shiChang ? `[语音]${shiChang}` : '[语音]'
}

export function rongHeYuYinXiaoXiNeiRong(neiRong: string | null | undefined, meiTiMiaoShu: string | null, canShu?: { shiChangHaoMiao?: number | null }): string {
  const zhuanXie = qingXiWenBen(neiRong, 500)
  if (!zhuanXie) return meiTiMiaoShu || '[语音]'
  return gouJianYuYinKeDuWenBen({ zhuanXieWenBen: zhuanXie, yinPinShiJianMiaoShu: null, shiChangHaoMiao: canShu?.shiChangHaoMiao ?? null })
}

const YIN_PIN_SHI_JIAN_BIAO_QIAN: Array<{ moShi: RegExp; mingCheng: string }> = [
  { moShi: /<(music|song|singing)[^>]*>/gi, mingCheng: '音乐' },
  { moShi: /<(dog|bark|汪)[^>]*>|狗叫|犬吠|汪/gi, mingCheng: '狗叫' },
  { moShi: /<(cat|meow|喵)[^>]*>|猫叫|喵/gi, mingCheng: '猫叫' },
  { moShi: /<(applause|cheer|laugh|cry)[^>]*>|掌声|欢呼|笑声|哭声/gi, mingCheng: '环境声' },
  { moShi: /前奏/gi, mingCheng: '前奏' },
  { moShi: /主歌|副歌|间奏|尾奏/gi, mingCheng: '歌曲段落' },
]

export function tiQuYinPinShiJian(zhuanXie: string | null | undefined): string | null {
  if (typeof zhuanXie !== 'string' || !zhuanXie.trim()) return null
  const mingDan: string[] = []
  for (const xiang of YIN_PIN_SHI_JIAN_BIAO_QIAN) {
    xiang.moShi.lastIndex = 0
    if (xiang.moShi.test(zhuanXie) && !mingDan.includes(xiang.mingCheng)) mingDan.push(xiang.mingCheng)
  }
  if (!mingDan.length) return null
  return mingDan.join('、')
}

async function yuShiKouDiaoYong(canShu: { sha256: string; mime: string }, chaoShiHaoMiao: number): Promise<string | null> {
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const miYao = huoQuGuiJiLiuDongMiYao()
  if (!peiZhi.yuYinLiJieQiYong || miYao.trim() === '' || peiZhi.guiJiLiuDongYuYinMoXing.trim() === '') return null
  return null
}

export async function huoQuYinPinShiJianMiaoShu(canShu: { sha256: string; mime: string }): Promise<string | null> {
  if (yinPinMock) {
    try {
      return await yinPinMock(canShu)
    } catch (cuoWu) {
      debug日志.warn('语音理解', '音频事件mock调用失败，已降级', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return null
    }
  }
  if (typeof canShu.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(canShu.sha256)) return null
  if (typeof canShu.mime !== 'string' || !canShu.mime.startsWith('audio/')) return null
  try {
    const peiZhi = huoQuDuoMoTaiPeiZhi()
    return await yuShiKouDiaoYong(canShu, peiZhi.qingQiuChaoShiHaoMiao)
  } catch (cuoWu) {
    debug日志.warn('语音理解', '音频事件理解失败，已降级为本地转写', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return null
  }
}
