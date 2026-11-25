import { 沉默配置, type 回应必要性等级 } from '../config/沉默配置'

const 问词语 = /吗|呢|什么|怎么|为什么|哪|谁|几|多少|是不是|有没有|能不能|要不要|行不行/

const 情绪词 = /想你|难受|累|烦|不开心|生气|难过|委屈|焦虑|害怕|担心|喜欢|爱|讨厌|哭|痛|孤独|寂寞|压力|崩溃|撑不住|emo|气死/

const 求助词 = /帮|救命|怎么办|求|拜托|请教|想问|咨询|求助/

const 约后词 = /有空|一起|约|见面|出来|吃饭|看电影|几点|在哪|什么时候|明天|今天|晚上|周末/

function 清理文本(文本: string): string {
  return (文本 || '').replace(/\s+/g, '').trim()
}

const 纯应答词表 = [
  '嗯',
  '嗯嗯',
  '哦',
  '噢',
  '好',
  '好的',
  '行',
  '可以',
  '收到',
  '知道了',
  '明白',
  '了解',
  '确实',
  '有道理',
  '是的',
  '对啊',
  '没错',
  '晚安',
  '早安',
  '午安',
  '拜拜',
  '再见',
  '哈哈',
  '哈哈哈',
  '嘿',
  '嘻',
  '在',
  '不在',
  '没事了',
  '算了',
  '随便',
  '都行',
]

export function 是纯应答词(文本: string): boolean {
  const 清洗 = 清理文本(文本).replace(/[。！!~～,，、]/g, '')
  if (清洗 === '') return false
  return (纯应答词表 as readonly string[]).includes(清洗)
}

export function 是问句(文本: string): boolean {
  return 问词语.test(清理文本(文本))
}

export function 是情绪句(文本: string): boolean {
  return 情绪词.test(清理文本(文本))
}

export function 是求助句(文本: string): boolean {
  return 求助词.test(清理文本(文本))
}

export function 是约后句(文本: string): boolean {
  return 约后词.test(清理文本(文本))
}

export interface 回应参数 {
  用户消息: string
  上条角色消息存在: boolean
  上条用户消息: string
  上条用户等级: 回应必要性等级 | null
  本轮连发条数: number
  必答事实中继: boolean
  当前时分睡前: boolean
}

export function 算回应必要性等级(参数: 回应参数): 回应必要性等级 {
  const 文本 = 清理文本(参数.用户消息)

  if (参数.必答事实中继) return 3

  if (!参数.上条角色消息存在) return 3

  if (参数.本轮连发条数 >= 沉默配置.连发最大条数) return 3

  const 有问 = 是问句(文本)
  const 有情绪 = 是情绪句(文本)
  const 有求助 = 是求助句(文本)
  const 有约后 = 是约后句(文本)

  if (有情绪) return 3
  if (有求助) return 2
  if (有问) return 2
  if (有约后) return 2

  if (文本.length <= 沉默配置.纯应答最大长度 && 是纯应答词(文本)) return 0

  if (文本.length <= 沉默配置.可沉默最大长度) return 1

  return 2
}

export function 升级等级(
  等级: 回应必要性等级,
  上轮已不回: boolean,
  有追问: boolean,
  当前时分睡前: boolean,
  连续沉默次数 = 0,
): 回应必要性等级 {
  let 结果 = 等级
  if (上轮已不回 && 结果 < 1) 结果 = 1
  if (有追问 && 结果 < 2) 结果 = 2
  if (连续沉默次数 >= 沉默配置.连续沉默最多次数 && 结果 < 2) 结果 = 2
  if (!有追问 && 当前时分睡前 && 结果 > 1) {
    结果 = 1
  }
  return 结果
}

export function 可不回(等级: 回应必要性等级): boolean {
  return 等级 <= 1
}

const 时光秒数: Record<string, number> = {
  纯应答: 1.5,
  状态差: 3.5,
  关系深: 2,
  关系浅: 1,
}

export function 算时光秒(等级: 回应必要性等级, 状态差: boolean, 关系深: boolean): number {
  let 秒 = 时光秒数.纯应答
  if (等级 === 0) 秒 = 时光秒数.纯应答
  else if (等级 >= 2) 秒 = 时光秒数.状态差
  else 秒 = 关系深 ? 时光秒数.关系深 : 时光秒数.关系浅
