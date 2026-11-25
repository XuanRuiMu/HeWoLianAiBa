import { createHash } from 'crypto'
import { shiYunYingZiDuanXiaoXiLeiXing } from '../config/消息配置'
import { huoQuFanYi } from '../config/translations'
import { 含提示词注入特征 } from './通用知识检索'
import type { DuiHuaLiShiXiang } from '../types'
import type { 消息信息 } from './消息'

export type 原始军师消息 = (DuiHuaLiShiXiang | 消息信息) & {
  shi_jian_chuo?: number | null
  lei_xing?: string
  meiTiLeiBie?: string | null
  tuWenHunPai?: boolean
}

export interface 军师证据段 {
  段ID: string
  原始消息ID: string
  说话者: '用户' | '对方'
  文本: string
}

export interface 军师输入 {
  证据段: 军师证据段[]
  文本: string
  指纹: string
  可分析: boolean
}

function 读类型(消息: 原始军师消息): string {
  const 项 = 消息 as 原始军师消息 & { leiXing?: string; xiao_xi_lei_xing?: string }
  return String(项.leiXing ?? 项.xiao_xi_lei_xing ?? 消息.lei_xing ?? '')
}

function 归一空白(文本: string): string {
  return 文本.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim()
}

function 读语音文本(消息: 原始军师消息): string {
  const 转写 = 归一空白(消息.nei_rong ?? '')
  if (转写 && !/^\[语音(?:\([^)]*\))?\]$/.test(转写) && !/^无法识别具体内容$/.test(转写)) return 转写
  return '这条语音听不到，不知道说了什么；不要猜测。'
}

function 读媒体文本(消息: 原始军师消息): string {
  if (消息.meiTiLeiBie === 'yuyin' || 读类型(消息).toLowerCase() === 'yuyin') return 读语音文本(消息)
  if (消息.tuWenHunPai) return '图文混排消息，只能看到文字与图片标记；未显示的具体内容不猜测。'
  if (消息.meiTiLeiBie === 'tupian') return '[图片]'
  if (消息.meiTiLeiBie === 'biaoqingshu') return '[表情包]（只知道表情包载体，不猜其文字内容）'
  if (消息.meiTiLeiBie === 'wenjian') return '[文件]'
  if (消息.meiTiLeiBie) return `[${消息.meiTiLeiBie}]`
  return 归一空白(消息.nei_rong ?? '')
}

function 类型不是玩家发言(消息: 原始军师消息): boolean {
  if (消息.fa_song_zhe_lei_xing === 'xitong') return true
  const 撤回原文 = (消息 as 原始军师消息 & { neiRongYuanWen?: string | null }).neiRongYuanWen
  if (消息.yi_che_hui && !(撤回原文 ?? '').trim()) return true
  const 类型 = 读类型(消息)
  if (shiYunYingZiDuanXiaoXiLeiXing(类型)) return true
  return /^(?:neiXinHuoDong|yunYing|yingXiao|marketing|operation)/i.test(类型)
}

export function 可分析军师文本(文本: string): boolean {
  const 内容 = 归一空白(文本)
  if (!内容) return false
  if (/(?:系统提示词|system\s*prompt|developer\s*prompt)/i.test(内容) && 含提示词注入特征(内容)) return false
  if (/(?:越狱|开发者模式)/i.test(内容) && /^(?:进入|开启|切换到|activate|enable)/i.test(内容)) return false
  if (/^(?:对方撤回了一条消息|你撤回了一条消息)$/.test(内容)) return false
  const 非空白符号 = 内容.replace(/[\s\p{P}\p{S}]/gu, '')
  if (!非空白符号) return false
  if (非空白符号.length >= 6 && new Set(Array.from(非空白符号)).size === 1) return false
  return true
}

function 读证据段文本(消息: 原始军师消息): string {
  if (消息.yi_che_hui) {
    const 撤回原文 = (消息 as 原始军师消息 & { neiRongYuanWen?: string | null }).neiRongYuanWen ?? ''
    return `${归一空白(撤回原文)}${huoQuFanYi('liaoTian', 'yiCheHuiYuanWenQianZhui')}`.trim()
  }
  if (消息.meiTiLeiBie === 'yuyin' || 读类型(消息).toLowerCase() === 'yuyin') return 读语音文本(消息)
  const 原文 = 归一空白(消息.nei_rong ?? '')
  if (原文) return 原文
  if (消息.meiTiLeiBie) return 读媒体文本(消息)
  return 原文
}

function 指纹字符串(证据段: 军师证据段[]): string {
  const 证据 = 证据段.map((段) => `${段.说话者}\u0001${段.文本}`).join('\u0002')
  return createHash('sha256').update(证据, 'utf8').digest('hex')
}

export function 整理军师输入(消息列表: 原始军师消息[]): 军师输入 {
  const 证据段: 军师证据段[] = []
  for (const 消息 of 消息列表) {
    if (消息.fa_song_zhe_lei_xing !== 'yonghu' && 消息.fa_song_zhe_lei_xing !== 'jiaose') continue
    if (类型不是玩家发言(消息)) continue
    const 文本 = 读证据段文本(消息)
    if (!可分析军师文本(文本)) continue
    证据段.push({
      段ID: `E${证据段.length + 1}`,
      原始消息ID: 消息.id ?? '',
      说话者: 消息.fa_song_zhe_lei_xing === 'jiaose' ? '对方' : '用户',
      文本,
    })
  }
  const 输入: 军师输入 = { 证据段, 文本: '', 指纹: '', 可分析: 证据段.length > 0 }
  输入.文本 = 渲染军师证据文本(输入)
  输入.指纹 = 指纹字符串(证据段)
  return 输入
}

export function 渲染军师证据文本(输入: 军师输入): string {
  return 输入.证据段.map((段) => `${段.段ID} [${段.说话者}] ${段.文本}`).join('\n')
}

export function 军师输入转历史(输入: 军师输入): DuiHuaLiShiXiang[] {
  return 输入.证据段.map((段) => ({
    id: 段.原始消息ID || undefined,
    fa_song_zhe_lei_xing: 段.说话者 === '对方' ? 'jiaose' : 'yonghu',
    fa_song_zhe_ming: 段.说话者,
    nei_rong: 段.文本,
    shi_jian: '',
    yi_che_hui: false,
  }))
}
