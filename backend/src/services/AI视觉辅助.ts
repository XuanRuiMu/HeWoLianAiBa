import fs from 'fs'
import { huoQuBenDiLuJing } from './媒体存储'
import type { DuiHuaKuai } from '../utils/DeepSeek客户端'
import type { DuiHuaLiShiXiang } from '../types'

const TU_XIANG_LEI_BIE = new Set(['tupian', 'biaoqingshu'])

const SHI_PIN_MIME_JI_HE = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

export function shiShiPinNeiRong(mime?: string | null, wenJianMing?: string | null): boolean {
  if (typeof mime === 'string' && SHI_PIN_MIME_JI_HE.has(mime.toLowerCase())) return true
  if (typeof wenJianMing === 'string') {
    const xiao = wenJianMing.toLowerCase()
    return xiao.endsWith('.mp4') || xiao.endsWith('.mov') || xiao.endsWith('.webm') || xiao.endsWith('.m4v')
  }
  return false
}

export function shiTuXiangLeiBie(leiBie: string | null | undefined): boolean {
  return typeof leiBie === 'string' && TU_XIANG_LEI_BIE.has(leiBie)
}

/** 非文本消息的统一文本化描述：[图片]/[表情包]/[语音(N秒)]/[视频]/[文件:名]，撤回语义与 Writer 链路一致 */
export function meiTiZhanShiWenBen(
  leiBie: string | null | undefined,
  xuanXiang?: {
    yiCheHui?: boolean
    shiChangHaoMiao?: number | null
    yuanShiWenJianMing?: string | null
    mime?: string | null
  },
): string | null {
  if (!leiBie) return null
  const yiCheHui = Boolean(xuanXiang?.yiCheHui)
  switch (leiBie) {
    case 'tupian':
      return yiCheHui ? '[用户撤回了一张图片]' : '[图片]'
    case 'biaoqingshu':
      return yiCheHui ? '[用户撤回了一个表情包]' : '[表情包]'
    case 'yuyin': {
      if (yiCheHui) return '[用户撤回了一条语音]'
      const haoMiao = xuanXiang?.shiChangHaoMiao
      if (haoMiao == null || !Number.isFinite(Number(haoMiao))) return '[语音]'
      return `[语音(${Math.round(Number(haoMiao) / 1000)}秒)]`
    }
    case 'wenjian': {
      if (yiCheHui) {
        return shiShiPinNeiRong(xuanXiang?.mime, xuanXiang?.yuanShiWenJianMing)
          ? '[用户撤回了一个视频]'
          : '[用户撤回了一个文件]'
      }
      if (shiShiPinNeiRong(xuanXiang?.mime, xuanXiang?.yuanShiWenJianMing)) {
        const haoMiao = xuanXiang?.shiChangHaoMiao
        if (haoMiao != null && Number.isFinite(Number(haoMiao)) && Number(haoMiao) > 0) {
          return `[视频(${Math.round(Number(haoMiao) / 1000)}秒)]`
        }
        return '[视频]'
      }
      return `[文件:${xuanXiang?.yuanShiWenJianMing || ''}]`
    }
    default:
      return null
  }
}

/**
 * 单条用户媒体消息 → 内容块。仅 tupian/biaoqingshu 且未撤回且磁盘可读时产生
 * input_image 块对；已撤回或读取失败（文件丢失）返回空数组，由 Prompt 第五层的
 * 文本化描述（[用户撤回了一张图片]/[图片]）承担语义，绝不抛错中断对话、不产生重复块。
 */
export async function gouJianDanTiaoTuXiangKuai(xiang: DuiHuaLiShiXiang): Promise<DuiHuaKuai[]> {
  const leiBie = xiang.meiTiLeiBie
  if (!shiTuXiangLeiBie(leiBie)) return []
  if (xiang.yi_che_hui) return []
  // FP-08 图块标题显式声明「与上面那条载体标记是同一条消息」：
  // 否则文本占位符 + 图块各算一次，模型仍会把 1 张图数成 2 个表情包
  const biaoQian =
    leiBie === 'biaoqingshu'
      ? '上面那条表情包标记的本体（同一条消息，不是对方另外又发的）'
      : '上面那条图片标记的本体（同一条消息，不是对方另外又发的）'
  const sha = xiang.meiTiSha256
  const mime = (xiang.meiTiMIME || '').toLowerCase()
  if (!sha || !mime) return []
  const luJing = huoQuBenDiLuJing(sha)
  if (!luJing) return []
  try {
    const huanChong = await fs.promises.readFile(luJing)
    return [
      { type: 'input_text', text: biaoQian },
      {
        type: 'input_image',
        image_url: `data:${mime};base64,${huanChong.toString('base64')}`,
        detail: 'low',
      },
    ]
  } catch {
    return []
  }
}
