import fs from 'fs'
import { huoQuBenDiLuJing } from './媒体存储'
import type { DuiHuaKuai } from '../utils/DeepSeek客户端'
import type { DuiHuaLiShiXiang } from '../types'
import { AI_PEI_ZHI } from '../config/AI配置'

const TU_XIANG_LEI_BIE = new Set(['tupian', 'biaoqingshu'])

export function shiTuXiangLeiBie(leiBie: string | null | undefined): boolean {
  return typeof leiBie === 'string' && TU_XIANG_LEI_BIE.has(leiBie)
}

/** 非文本消息的统一文本化描述：[图片]/[表情包]/[语音(N秒)]/[文件:名]，撤回语义与 Writer 链路一致 */
export function meiTiZhanShiWenBen(
  leiBie: string | null | undefined,
  xuanXiang?: {
    yiCheHui?: boolean
    shiChangHaoMiao?: number | null
    yuanShiWenJianMing?: string | null
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
    case 'wenjian':
      if (yiCheHui) return '[用户撤回了一个文件]'
      return `[文件:${xuanXiang?.yuanShiWenJianMing || ''}]`
    default:
      return null
  }
}

/** 历史中最新一条用户消息（与调度器「获取最新用户消息」同一扫描规则） */
export function huoQuZuiXinYongHuMeiTiXiang(liShi: DuiHuaLiShiXiang[]): DuiHuaLiShiXiang | null {
  for (let i = liShi.length - 1; i >= 0; i--) {
    if (liShi[i].fa_song_zhe_lei_xing === 'yonghu') return liShi[i]
  }
  return null
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
  const biaoQian = leiBie === 'biaoqingshu' ? '[用户发来一个表情包]' : '[用户发来一张图片]'
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

/**
 * 历史 → 图像块序列（仅用户侧消息；角色/系统消息按官方限制永不带图）。
 * 注入数量上限为预算保护兜底：极端场景（如 200 条历史全图）避免一次性把全部
 * base64 读进内存，只保留最近的 N 张，更旧的由 yuSuanBaoHu 按消息粒度继续裁剪。
 */
export async function gouJianYongHuTuXiangKuai(liShi: DuiHuaLiShiXiang[]): Promise<DuiHuaKuai[]> {
  const shangXian = AI_PEI_ZHI.prompt.liShiTuXiangZuiDuoZhuRuShu
  const houXuan: DuiHuaLiShiXiang[] = []
  for (let i = liShi.length - 1; i >= 0 && houXuan.length < shangXian; i--) {
    if (liShi[i].fa_song_zhe_lei_xing === 'yonghu' && shiTuXiangLeiBie(liShi[i].meiTiLeiBie)) {
      houXuan.push(liShi[i])
    }
  }
  const jieGuo: DuiHuaKuai[] = []
  for (const xiang of houXuan.reverse()) {
    jieGuo.push(...(await gouJianDanTiaoTuXiangKuai(xiang)))
  }
  return jieGuo
}
