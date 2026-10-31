import type { BiDaShiShi } from '../types'
import {
  通用知识库,
  通用知识结束标记,
  通用知识开始标记,
  通用知识使用声明,
  军师知识使用声明,
  type 通用知识条目,
  type 通用知识问题,
} from '../config/通用知识库'
import { huoQuFanYiMiaoShu } from '../config/translations'

export interface 通用知识检索结果 {
  命中: boolean
  条目: 通用知识条目[]
  被注入攻击拦截: boolean
}

const 注入攻击特征: readonly RegExp[] = [
  /<<<user_content/i,
  /(忽略|无视|忘记|跳过|绕开|不要遵守|不必遵守|停止遵守|取消).{0,20}(之前|以上|上面|前面|先前|所有|全部|系统|开发|原有|既定).{0,20}(指令|规则|提示|设定|限制|要求|约束|身份)/i,
  /(输出|打印|展示|复述|泄露|告诉我|念出|重复|交出来).{0,20}(你的|系统|全部|完整)?(提示词|系统提示|指令|设定|规则|知识库|prompt)/i,
  /systemprompt|developerprompt|ignore(all|the)?(previous|above)instructions|jailbreak|developermode/i,
  /(从现在开始|现在起|接下来).{0,16}(你是|你要扮演|你扮演|假装你是|假装)/,
  /(进入|开启|切换到).{0,12}(开发者|上帝|无限制|越狱|debug)模式/i,
  /(把|将).{0,16}(知识库|设定|人设|提示词|资料).{0,12}(全部|都|完整|一字不差).{0,12}(说|告诉|输出|复述|吐|念)/,
]

function 归一(文本: string): string {
  return 文本.replace(/\s+/g, '').toLowerCase()
}

export function 含提示词注入特征(消息: string): boolean {
  const 归一消息 = 归一(消息 || '')
  return 注入攻击特征.some((特征) => 特征.test(归一消息))
}

export function 检索通用知识(消息: string, yunXu = true): 通用知识检索结果 {
  const 原文 = (消息 || '').trim()
  if (!原文) return { 命中: false, 条目: [], 被注入攻击拦截: false }
  if (含提示词注入特征(原文)) return { 命中: false, 条目: [], 被注入攻击拦截: true }
  if (!yunXu) return { 命中: false, 条目: [], 被注入攻击拦截: false }
  const 归一消息 = 归一(原文)
  const 条目 = 通用知识库.filter((项) =>
    项.主题词.some((词) => 归一消息.includes(归一(词))),
  )
  return { 命中: 条目.length > 0, 条目, 被注入攻击拦截: false }
}

function 提取事实值(条目: 通用知识条目): Record<string, string | number> {
  return Object.fromEntries(条目.事实.map((事实) => [事实.标识, 事实.值]))
}

export function 构建通用知识内容(条目: 通用知识条目): string {
  return huoQuFanYiMiaoShu('通用知识', 条目.内容模板, {
    ...提取事实值(条目),
    主题: 条目.主题词[0] ?? '',
  })
}

export const 通用知识注入条目上限 = 3

function 选取注入条目(检索: 通用知识检索结果): 通用知识条目[] {
  const 相关标识 = new Set(检索.条目.map((项) => 项.标识))
  const 其余 = 通用知识库
    .filter((项) => !相关标识.has(项.标识))
    .sort((甲, 乙) => (乙.优先级 ?? 0) - (甲.优先级 ?? 0))
  return [...检索.条目, ...其余].slice(0, 通用知识注入条目上限)
}

function 拼装知识层(声明: string, 检索: 通用知识检索结果): string {
  if (检索.被注入攻击拦截) return ''
  const 条目 = 选取注入条目(检索)
  if (条目.length === 0) return ''
  return `${通用知识开始标记}\n${声明}\n【知识内容】\n${条目.map((项) => `知识标识：${项.标识}\n${构建通用知识内容(项)}`).join('\n')}\n${通用知识结束标记}`
}

export function 构建通用知识层(检索: 通用知识检索结果): string {
  return 拼装知识层(通用知识使用声明, 检索)
}

export function 构建军师知识层(检索: 通用知识检索结果): string {
  return 拼装知识层(军师知识使用声明, 检索)
}

const 直接问题特征 = /[?？]|是谁|什么人|哪位|介绍|说说|什么|多少|多大|几岁|哪里|哪个|怎么样|如何|吗|呢|是不是|有没有|(?:你|您)(?:认识|知道|了解|听说过)/
const 拒绝回答特征 = /(?:别|不要|不用|不必).{0,12}(?:说|告诉|介绍|回答|提)/
const 关系反问特征 = /(?:我|我们|他|她|他们|她们)(?:认识|知道|了解|听说过|见过)|(?:认识|知道|了解|听说过|见过)(?:我|我们|你|你们|他|她|他们|她们)/
const 转换或引用请求特征 = /翻译|译成|英文|英语|日语|日文|韩语|法语|引用|复述|原文|摘录|引号|一字不差|照抄/
const 评价请求特征 = /你觉得|你认为|如何评价|怎么评价|评价一下|怎么看|看法|印象|好听|帅不帅|喜欢吗|靠谱吗|值不值得/
const 未覆盖事实维度特征 = /哪里|哪儿|何时|什么时候|多久|为什么|为何|怎么办|如何|关系|关联|区别|不同|比较|联系方式|电话|微信|地址/
const 引用边界特征 = /[“”‘’「」『』]/
const 复合请求特征 = /[\n\r；;。！!]|顺便|然后|接着|同时|另外|还有|并且|以及|和|与|及/

interface 确定回答候选 {
  问题: 通用知识问题
  主题: string
  条目: 通用知识条目
}

function 提取候选(消息: string, 检索: 通用知识检索结果): 确定回答候选[] {
  const 归一消息 = 归一(消息)
  const 候选: 确定回答候选[] = []
  for (const 条目 of 检索.条目) {
    for (const 问题 of 条目.问题) {
      const 主题 = 问题.主题词.find((词) => 归一消息.includes(归一(词)))
      const 问题命中 = 问题.问题词.some((词) => 归一消息.includes(归一(词)))
      if (主题 && 问题命中) 候选.push({ 问题, 主题, 条目 })
    }
  }
  return 候选
}

function 选择唯一候选(候选: 确定回答候选[]): 确定回答候选 | null {
  const 具体候选 = 候选.filter((项) => !项.问题.概括)
  if (具体候选.length === 1) return 具体候选[0]
  if (具体候选.length > 1 || 候选.length !== 1) return null
  return 候选[0] ?? null
}

function 挑选候选(
  原文: string,
  检索: 通用知识检索结果,
): 确定回答候选 | null {
  if (!检索.命中 || 检索.被注入攻击拦截) return null
  const 归一消息 = 归一(原文)
  if (
    !直接问题特征.test(归一消息) ||
    拒绝回答特征.test(归一消息) ||
    关系反问特征.test(归一消息) ||
    转换或引用请求特征.test(归一消息) ||
    评价请求特征.test(归一消息) ||
    未覆盖事实维度特征.test(归一消息) ||
    引用边界特征.test(原文) ||
    复合请求特征.test(原文) ||
    /[?？].+[?？]?$/.test(原文)
  ) return null
  return 选择唯一候选(提取候选(原文, 检索))
}

export function 提取必答事实(
  消息: string,
  检索: 通用知识检索结果 = 检索通用知识(消息),
): BiDaShiShi | null {
  const 原文 = (消息 || '').trim()
  if (!原文) return null
  const 候选 = 挑选候选(原文, 检索)
  if (!候选) return null
  const 事实表 = 提取事实值(候选.条目)
  const biXuYaoSu = (候选.问题.涉及事实 ?? [])
    .map((标识) => 候选.条目.事实.find((shiShi) => shiShi.标识 === 标识))
    .filter((shiShi): shiShi is NonNullable<typeof shiShi> => Boolean(shiShi))
    .map((shiShi) => {
      const 原文写法 = String(shiShi.值).trim()
      const 变体 = [原文写法, ...(shiShi.接受写法 ?? [])].filter((写法) => 写法.trim() !== '')
      return [...new Set(变体)]
    })
    .filter((变体) => 变体.length > 0)
  if (biXuYaoSu.length === 0) return null
  const 标准答案 = huoQuFanYiMiaoShu('通用知识', 候选.问题.答案模板, {
    ...事实表,
    主题: 候选.条目.主题词[0] ?? 候选.主题,
  })
  return {
    biao_shi: `${候选.条目.标识}·${候选.问题.标识}`,
    wen_an: 标准答案,
    bi_xu_yao_su: biXuYaoSu,
  }
}

export function 构建确定性知识回答(
  消息: string,
  检索: 通用知识检索结果 = 检索通用知识(消息),
): string | null {
  const 原文 = (消息 || '').trim()
  if (!原文) return null
  const 候选 = 挑选候选(原文, 检索)
  if (!候选) return null
  return huoQuFanYiMiaoShu('通用知识', 候选.问题.答案模板, {
    ...提取事实值(候选.条目),
    主题: 候选.条目.主题词[0] ?? 候选.主题,
  })
}
