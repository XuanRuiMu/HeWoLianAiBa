import { zhuCeZiDingYiLuYou } from '../utils/DeepSeek客户端'

export interface MoXingLuYou {
  mingCheng: string
  piPei: RegExp
  miYao: string
  jiChu: string
  moXing: string
}

let yiZhuCe = false

export function chuShiHuaMoXingLuYou(): void {
  if (yiZhuCe) return
  yiZhuCe = true
  const jiChu = (process.env.DEEPSEEK_FALLBACK_BASE_URL || '').trim()
  const miYao = (process.env.DEEPSEEK_FALLBACK_API_KEY || '').trim()
  const moXing = (process.env.DEEPSEEK_FALLBACK_MODEL || '').trim()
  if (jiChu !== '' && miYao !== '' && moXing !== '') {
    zhuCeZiDingYiLuYou(/responses$/, { miYao, jiChu, moXing })
  }
}