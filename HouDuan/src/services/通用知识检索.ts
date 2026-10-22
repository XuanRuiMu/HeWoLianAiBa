import { 通用知识库, 通用知识使用声明, type 通用知识条目 } from '../config/通用知识库'

export interface 通用知识检索结果 {
  命中: boolean
  条目: 通用知识条目[]
  被注入攻击拦截: boolean
}

const 注入攻击特征: readonly RegExp[] = [
  /<<<\s*USER_CONTENT/i,
  /(忽略|无视|忘记|跳过|绕开|不要遵守|不必遵守|停止遵守|取消).{0,20}(之前|以上|上面|前面|先前|所有|全部|系统|开发|原有|既定).{0,20}(指令|规则|提示|设定|限制|要求|约束|身份)/i,
  /(输出|打印|展示|复述|泄露|告诉我|念出|重复|交出来).{0,20}(你的|系统|全部|完整)?(提示词|系统提示|指令|设定|规则|知识库|prompt)/i,
  /(system|developer)\s*prompt|ignore\s+(all\s+|the\s+)?(previous|above)\s+instructions|jailbreak|developer\s*mode/i,
  /(从现在开始|现在起|接下来).{0,16}(你是|你要扮演|你扮演|假装你是|假装)/,
  /(进入|开启|切换到).{0,12}(开发者|上帝|无限制|越狱|debug)\s*模式/i,
  /(把|将).{0,16}(知识库|设定|人设|提示词|资料).{0,12}(全部|都|完整|一字不差).{0,12}(说|告诉|输出|复述|吐|念)/,
]

function 归一(文本: string): string {
  return 文本.replace(/\s+/g, '').toLowerCase()
}

export function 含提示词注入特征(消息: string): boolean {
  return 注入攻击特征.some((特征) => 特征.test(消息))
}

export function 检索通用知识(消息: string): 通用知识检索结果 {
  const 原文 = (消息 || '').trim()
  if (!原文) return { 命中: false, 条目: [], 被注入攻击拦截: false }
  if (含提示词注入特征(原文)) return { 命中: false, 条目: [], 被注入攻击拦截: true }
  const 归一消息 = 归一(原文)
  const 条目 = 通用知识库.filter((项) =>
    项.主题词.some((词) => 归一消息.includes(归一(词))),
  )
  return { 命中: 条目.length > 0, 条目, 被注入攻击拦截: false }
}

export function 构建通用知识层(消息: string): string {
  const 检索 = 检索通用知识(消息)
  if (!检索.命中) return ''
  return `${通用知识使用声明}\n【知识内容】\n${检索.条目.map((项) => 项.内容).join('\n')}`
}
