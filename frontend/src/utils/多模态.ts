import type { 消息 } from '@/types'

const SHI_PIN_HOU_ZHUI = ['.mp4', '.mov', '.webm', '.m4v']

export function shiShiPinXiaoXi(xiaoXi: Pick<消息, 'lei_xing' | 'mei_ti_yuan_shi_wen_jian_ming'>): boolean {
  if (xiaoXi.lei_xing !== 'wenJian') return false
  const ming = (xiaoXi.mei_ti_yuan_shi_wen_jian_ming || '').toLowerCase()
  return SHI_PIN_HOU_ZHUI.some((hou) => ming.endsWith(hou))
}

export function yanZhengShengChengTiShiCi(tiShiCi: unknown, zuiDaZiFu = 200): { heFa: boolean; qingXiHou: string } {
  if (typeof tiShiCi !== 'string') return { heFa: false, qingXiHou: '' }
  const qingXiHou = tiShiCi.trim().slice(0, zuiDaZiFu)
  return { heFa: qingXiHou.length > 0, qingXiHou }
}

export function gouJianYuYinFaSongNeiRong(zhuanXieWenBen: unknown): string {
  if (typeof zhuanXieWenBen !== 'string') return ''
  return zhuanXieWenBen.trim().slice(0, 500)
}

// FP-05 YH-036：用户手动 /生图 /视频 指令已删除（图片与视频由AI对象在合适时主动发起），以下函数仅保留兼容导出恒返否定
export function jieXiShengTuMingLing(_neiRong: unknown): string | null {
  return null
}

export function shiShengTuMingLing(_neiRong: unknown): boolean {
  return false
}

export function shiShengShiPinMingLing(_neiRong: unknown): boolean {
  return false
}
