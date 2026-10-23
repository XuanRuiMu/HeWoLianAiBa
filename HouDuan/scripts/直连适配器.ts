
import { AI_PEI_ZHI } from '../src/config/AI配置'
import { jiSuanAIChanShu } from '../src/config/AI参数策略'
import { gouJianWriterPrompt } from '../src/services/Prompt构建器'
import { gouJianJiaoSeShangXiaWen } from '../src/config/AI参数策略'
import type { AIYinQingShuRu, DirectorCeLue } from '../src/types'
import type { CanShuShangXiaWen } from '../src/config/AI参数策略'

const 网关地址 = (process.env.DEEPSEEK_BASE_URL || 'https://token.sensenova.cn/v1').replace(/\/+$/, '')
const 网关令牌 = process.env.DEEPSEEK_API_KEY || ''
const 日志 = (s: string) => process.stdout.write(s + '\n')

interface 直连结果 {
  正文: string
  思维链: string
  用量: { 入: number; 出: number; 总: number; 命中: number }
}

let 上次请求 = 0
async function 睡(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

function 是限流(状态: number, 文: string): boolean {
  return 状态 === 429 || /rpm|tpm|rate|limit/i.test(文)
}

export async function 直连外呼(
  档位: keyof typeof AI_PEI_ZHI.moXing,
  消息: Array<{ jiaoSe: string; neiRong: string }>,
  上限毫秒 = 1_800_000,
  上下文?: CanShuShangXiaWen,
): Promise<直连结果> {
  const 参 = jiSuanAIChanShu(档位, 上下文)
  const 体: Record<string, unknown> = {
    model: 参.moXing,
    messages: 消息.map((x) => ({ role: x.jiaoSe, content: x.neiRong })),
    stream: false,
  }
  if (参.zuiDaTokens) 体.max_tokens = 参.zuiDaTokens
  if (参.siKaoMoShi === 'disabled') 体.reasoning = { effort: 'none' }
  else if (参.siKaoMoShi === 'enabled') 体.reasoning = { effort: 参.reasoningEffort || 'max' }
  if (typeof 参.wenDu === 'number') 体.temperature = 参.wenDu
  if (参.xiangYingGeShi?.type === 'json_object') 体.response_format = { type: 'json_object' }

  const 起点 = Date.now()
  for (let 次 = 0; ; 次++) {
    const 间 = Date.now() - 上次请求
    const 最小间隔 = Number(process.env.ZS_JIAN_GE || '300')
    if (间 < 最小间隔) await 睡(最小间隔 - 间)
    上次请求 = Date.now()
    let 应: Response
    let 文 = ''
    try {
      应 = await fetch(网关地址 + '/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + 网关令牌, 'Content-Type': 'application/json' },
        body: JSON.stringify(体),
      })
      文 = await 应.text()
    } catch (e) {
      if (Date.now() - 起点 > 上限毫秒) throw e
      await 睡(8000)
      continue
    }
    if (应.ok) {
      const 解 = JSON.parse(文) as {
        choices: Array<{ message: { content?: string | null; reasoning_content?: string | null } }>
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } }
      }
      const 信 = 解.choices?.[0]?.message || {}
      const 正文 = String(信.content ?? '')
      const 思维 = String(信.reasoning_content ?? '')
      if (正文.trim() === '' && Date.now() - 起点 < 上限毫秒) {
        await 睡(5000)
        continue
      }
      return {
        正文,
        思维,
        用量: {
          入: 解.usage?.prompt_tokens || 0,
          出: 解.usage?.completion_tokens || 0,
          总: 解.usage?.total_tokens || 0,
          命中: 解.usage?.prompt_tokens_details?.cached_tokens || 0,
        },
      }
    }
    if (!是限流(应.status, 文) || Date.now() - 起点 > 上限毫秒) {
      throw new Error('HTTP ' + 应.status + ' ' + 文.slice(0, 200))
    }
    const 等 = Number(process.env.ZS_TUI_BIE_HOU || '0') || (Math.min(6000 + 次 * 4000, 45000) + Math.floor(Math.random() * 4000))
    if (次 % 10 === 0) 日志('    [限流] 第 ' + (次 + 1) + ' 次 429，等待 ' + (等 / 1000).toFixed(1) + 's')
    await 睡(等)
  }
}

export async function 生成导演策略(
  shuRu: AIYinQingShuRu,
  prompt: string,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<{ 成败: boolean; 策略: DirectorCeLue; 原文: string }> {
  const 系统 = '你负责判断角色这次是否回复、当下情绪、是否撤回和是否主动表白，只输出 JSON。情感分析字段写对方这条消息的语气和情绪。'
  const 回 = await 直连外呼('director', [
    { jiaoSe: 'system', neiRong: 系统 },
    { jiaoSe: 'user', neiRong: prompt },
  ], undefined, shangXiaWen)
  const 解 = 解析导演(回.正文)
  return { 成败: 解.成败, 策略: 解.策略, 原文: 回.正文 }
}

function 解析导演(文: string): { 成败: boolean; 策略: DirectorCeLue } {
  const 缺省: DirectorCeLue = {
    yong_hu_yi_tu: 'unknown', qing_gan_fen_xi: 'unknown', hui_fu_ce_lue: 'unknown',
    shi_fou_hui_fu: true, hui_fu_tiao_shu: 1, shi_jian_qing_xu: 'unknown',
    shi_fou_che_hui: false, shi_fou_zhu_dong_biao_bai: false,
  }
  let 数: Record<string, unknown> | null = null
  try {
    数 = JSON.parse(文.trim())
  } catch {
    const 配 = 文.match(/\{[\s\S]*\}/)
    if (配) {
      try {
        数 = JSON.parse(配[0])
      } catch {
        return { 成败: false, 策略: 缺省 }
      }
    } else return { 成败: false, 策略: 缺省 }
  }
  if (!数 || typeof 数 !== 'object') return { 成败: false, 策略: 缺省 }
  const 条数 = Number(数['回复条数'] || 1)
  return {
    成败: true,
    策略: {
      yong_hu_yi_tu: String(数['用户意图'] || 'unknown'),
      qing_gan_fen_xi: String(数['情感分析'] || 'unknown'),
      hui_fu_ce_lue: String(数['回复策略'] || 'unknown'),
      shi_fou_hui_fu: Boolean(数['是否回复'] ?? true),
      hui_fu_tiao_shu: Number.isNaN(条数) ? 1 : Math.max(0, Math.min(5, 条数)),
      shi_jian_qing_xu: String(数['时间情绪'] || 'unknown'),
      shi_fou_che_hui: Boolean(数['是否撤回'] ?? false),
      shi_fou_zhu_dong_biao_bai: Boolean(数['是否主动表白'] ?? false),
    },
  }
}

export async function 生成写手回复(
  shuRu: AIYinQingShuRu,
  ceLue: DirectorCeLue | undefined,
  prompt: string,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<string[]> {
  const 名 = (shuRu.jiao_se.wei_xin_ming || '').trim()
  const 系统 = 名
    ? '完全代入下面这个角色（' + 名 + '），只输出你要发的消息。像平时微信里真实的两个人在聊天，自然口语化，允许短句、留白和真实停顿。'
    : '完全代入下面这个角色，只输出你要发的消息。像平时微信里真实的两个人在聊天，自然口语化，允许短句、留白和真实停顿。'
  const ceLueKuai = ceLue
    ? ['【你这会儿的感觉】', ceLue.shi_fou_hui_fu === false ? '这次先不回（已读不回）' : '这次要回', '情绪：' + (ceLue.shi_jian_qing_xu || '正常')].join('\n')
    : ''
  const 全量 = ceLueKuai ? prompt + '\n\n' + ceLueKuai : prompt
  const 回 = await 直连外呼('writer', [
    { jiaoSe: 'system', neiRong: 系统 },
    { jiaoSe: 'user', neiRong: 全量 },
  ], undefined, shangXiaWen)
  return 清洗回复(回.正文)
}

export function 清洗回复(文: string): string[] {
  return 文
    .split('\n')
    .map((s) => s.replace(/^\s*(?:\d+[.、)]|[-*•])\s*/, '').replace(/^\[?\d{1,2}:\d{2}\]?\s*/, '').trim())
    .filter((s) => s !== '')
    .slice(0, 5)
}

export { gouJianWriterPrompt, gouJianJiaoSeShangXiaWen }