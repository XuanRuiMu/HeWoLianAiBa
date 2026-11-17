import OpenAI from 'openai'
import { AI配置 } from '../config/AI配置'
import { 通用知识结束标记, 通用知识开始标记, 用户内容结束标记, 用户内容开始标记 } from '../config/通用知识库'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { jiSuanAIChanShu, type 参数上下文 } from '../config/AI参数策略'
import { jiLuAIJiLu, debug日志 } from './debug日志'
import { chuangJianRiZhiYinQing } from './日志引擎'

export type 对话块 =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail?: 'low' | 'high' | 'auto' }

export interface 对话消息 {
  jiaoSe: 'system' | 'user' | 'assistant'
  neiRong: string | 对话块[]
}

export interface 调用参数 {
  模型?: string
  wenDu?: number
  top_p?: number
  最大Tokens?: number
  响应格式?: { type: 'json_object' | 'text' }
  思考模式?: 'enabled' | 'disabled'
  思考强度?: string
  xiaoXi: 对话消息[]
}

export interface 调用结果 {
  neiRong: string
  siKaoNeiRong?: string
  yuanShuJu: unknown
  xinXi: { role: string; neiRong: string }
  shiYongLiang?: { shuRuToken: number; shuChuToken: number; zongToken: number; mingZhongToken: number }
}

export type 错误分类 = 'keZhongShi' | 'buKeZhongShi'

export interface 分类错误 extends Error {
  fenLei: 错误分类
  zhuangTaiMa?: number
}

const 可重试最大次数 = AI配置.zhongShi.keZhongShiZuiDaCiShu
const KongXiangYingZuiDaCiShu = AI配置.kongXiangYing.zuiDaCiShu
const RongDuanLianXuShiBaiYuZhi = AI配置.zhongShi.rongDuanLianXuShiBaiYuZhi
const RongDuanLengQueHaoMiao = AI配置.zhongShi.rongDuanLengQueHaoMiao

let rongDuanKaiQiShiJian = 0
let lianXuShiBaiCiShu = 0

export function chongZhiRongDuan(): void {
  rongDuanKaiQiShiJian = 0
  lianXuShiBaiCiShu = 0
}

function rongDuanShiFouKaiQi(): boolean {
  if (!rongDuanKaiQiShiJian) return false
  if (Date.now() - rongDuanKaiQiShiJian > RongDuanLengQueHaoMiao) {
    rongDuanKaiQiShiJian = 0
    lianXuShiBaiCiShu = 0
    return false
  }
  return true
}

function jiLuChengGongRongDuan(): void {
  lianXuShiBaiCiShu = 0
}

function jiLuShiBaiRongDuan(): void {
  lianXuShiBaiCiShu += 1
  if (lianXuShiBaiCiShu >= RongDuanLianXuShiBaiYuZhi) {
    rongDuanKaiQiShiJian = Date.now()
  }
}

function fenLeiDiaoYongCuoWu(cuoWu: unknown): 分类错误 {
  const yuanXinXi = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
  const zhuangTaiMa = tiQuZhuangTaiMa(cuoWu)
  const keZhongShi = zhuangTaiMa === null ? true : zhuangTaiMa === 429 || zhuangTaiMa >= 500
  const fenLeiCuoWu = new Error(yuanXinXi) as 分类错误
  fenLeiCuoWu.fenLei = keZhongShi ? 'keZhongShi' : 'buKeZhongShi'
  if (zhuangTaiMa !== null) fenLeiCuoWu.zhuangTaiMa = zhuangTaiMa
  return fenLeiCuoWu
}

function tiQuZhuangTaiMa(cuoWu: unknown): number | null {
  const houXuan: unknown[] = [cuoWu]
  if (cuoWu instanceof Error) {
    const mingMing = cuoWu as Error & { status?: unknown; statusCode?: unknown; code?: unknown; cause?: unknown }
    houXuan.push(mingMing.status, mingMing.statusCode, mingMing.code, mingMing.cause)
  } else if (typeof cuoWu === 'object' && cuoWu !== null) {
    const duiXiang = cuoWu as Record<string, unknown>
    houXuan.push(duiXiang['status'], duiXiang['statusCode'], duiXiang['code'])
  }
  for (const xiang of houXuan) {
    const jieGuo = jieXiZhuangTaiMa(xiang)
    if (jieGuo !== null) return jieGuo
  }
  const wenBen = cuoWu instanceof Error ? `${cuoWu.name} ${cuoWu.message}` : String(cuoWu)
  const piPei = wenBen.match(/(?:status|状态码)[^\d]{0,5}(\d{3})|(\d{3})/)
  if (piPei) {
    const shuZhi = Number(piPei[1] ?? piPei[2])
    if (Number.isInteger(shuZhi) && shuZhi >= 400 && shuZhi < 600) return shuZhi
  }
  return null
}

function jieXiZhuangTaiMa(zhi: unknown): number | null {
  if (typeof zhi === 'number' && Number.isInteger(zhi) && zhi >= 400 && zhi < 600) return zhi
  if (typeof zhi === 'string') {
    const piPei = zhi.match(/(\d{3})/)
    if (piPei) {
      const shuZhi = Number(piPei[1])
      if (shuZhi >= 400 && shuZhi < 600) return shuZhi
    }
  }
  return null
}

function jiSuanTuiBiHaoMiao(changCi: number): number {
  return Math.min(AI配置.zhongShi.tuiBiJiChuHaoMiao * 2 ** changCi, AI配置.zhongShi.tuiBiZuiDaHaoMiao)
}

function dengDai(haoMiao: number): Promise<void> {
  return new Promise((jieJue) => setTimeout(jieJue, haoMiao))
}

function tiQuShiYongLiang(
  xiangYing: unknown,
): { shuRuToken: number; shuChuToken: number; zongToken: number; mingZhongToken: number } | undefined {
  const yuan = xiangYing as {
    usage?: {
      input_tokens?: unknown
      output_tokens?: unknown
      total_tokens?: unknown
      prompt_tokens?: unknown
      completion_tokens?: unknown
      input_tokens_details?: { cached_tokens?: unknown } | null
      prompt_cache_hit_tokens?: unknown
    } | null
  }
  const yongLiang = yuan?.usage
  if (!yongLiang || typeof yongLiang !== 'object') return undefined
  const shuRu = Number(yongLiang.input_tokens ?? yongLiang.prompt_tokens ?? NaN)
  const shuChu = Number(yongLiang.output_tokens ?? yongLiang.completion_tokens ?? NaN)
  const zong = Number(yongLiang.total_tokens ?? NaN)
  if (!Number.isFinite(shuRu) && !Number.isFinite(shuChu) && !Number.isFinite(zong)) return undefined
  const shuRuZheng = Number.isFinite(shuRu) ? Math.max(0, Math.floor(shuRu)) : 0
  const shuChuZheng = Number.isFinite(shuChu) ? Math.max(0, Math.floor(shuChu)) : 0
  const mingZhong = Number(yongLiang.input_tokens_details?.cached_tokens ?? yongLiang.prompt_cache_hit_tokens ?? 0)
  return {
    shuRuToken: shuRuZheng,
    shuChuToken: shuChuZheng,
    zongToken: Number.isFinite(zong) ? Math.max(0, Math.floor(zong)) : shuRuZheng + shuChuZheng,
    mingZhongToken: Number.isFinite(mingZhong)
      ? Math.min(shuRuZheng, Math.max(0, Math.floor(mingZhong)))
      : 0,
  }
}

let mockTiaoYong: ((canShu: 调用参数) => Promise<调用结果>) | null = null

export function sheZhiMockTiaoYong(
  mock: ((canShu: 调用参数) => Promise<调用结果>) | null,
): void {
  mockTiaoYong = mock
}

export function huoQuMockTiaoYong(): ((canShu: 调用参数) => Promise<调用结果>) | null {
  return mockTiaoYong
}

let 实例: OpenAI | null = null

export function 构建请求输入<T extends { jiaoSe: string; neiRong: unknown }>(
  xiaoXi: readonly T[],
): Array<{ role: string; content: unknown }> {
  return xiaoXi.map((x) => ({ role: x.jiaoSe, content: x.neiRong }))
}

const 自定义路由: Array<{ piPei: RegExp; miYao: string; jiChu: string; moXing: string }> = []

function piPeiLuYouUrl(url: string): { miYao: string; jiChu: string; moXing: string } | null {
  for (const xiang of 自定义路由) {
    if (xiang.piPei.test(url)) return { miYao: xiang.miYao, jiChu: xiang.jiChu, moXing: xiang.moXing }
  }
  return null
}

export function zhuCeZiDingYiLuYou(piPei: RegExp, peiZhiXiang: { miYao: string; jiChu: string; moXing: string }): void {
  自定义路由.push({ piPei, ...peiZhiXiang, jiChu: peiZhiXiang.jiChu.replace(/\/$/, '') })
}

export function qingKongZiDingYiLuYou(): void {
  自定义路由.length = 0
}

async function daiLiMoXingZhiHuan(shuRu: Parameters<typeof fetch>[0], chuShiCanShu?: RequestInit): Promise<Response> {
  const url = String(shuRu)
  const luYou = piPeiLuYouUrl(url)
  if (!luYou) return fetch(shuRu, chuShiCanShu)
  const chuShi = (chuShiCanShu || {}) as RequestInit & { body?: string }
  const yuanBody = JSON.parse(String(chuShi.body || '{}')) as Record<string, unknown>
  const xinBody = zhuanHuanResponsesWeiChat({ ...yuanBody, model: luYou.moXing })
  const xiangYing = await fetch(`${luYou.jiChu}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${luYou.miYao}` },
    body: JSON.stringify(xinBody),
    signal: chuShi.signal,
  })
  const shuJu = (await xiangYing.json().catch(() => ({}))) as ChatCompletionShimResponse
  if (!xiangYing.ok || shuJu.error) {
    const xinCuo = new Error(shuJu.error?.message || `HTTP ${xiangYing.status}`) as Error & { status?: number }
    xinCuo.status = xiangYing.status
    throw xinCuo
  }
  return chuangJianChatXiangYing(shuJu)
}

const yiDingZhiFetch = async (shuRu: Parameters<typeof fetch>[0], chuShiCanShu?: Parameters<typeof fetch>[1]): Promise<Response> => {
  const url = String(shuRu)
  if (piPeiLuYouUrl(url) !== null) return daiLiMoXingZhiHuan(shuRu, chuShiCanShu)
  return fetch(shuRu, chuShiCanShu)
}
export function 获取DeepSeek客户端(): OpenAI {
  if (实例) return 实例
  const api密钥 = peiZhi.deepSeek.api密钥 || AI配置.deepSeek.api密钥
  const 原始地址 = peiZhi.deepSeek.基础地址 || AI配置.deepSeek.基础地址
  const 规范地址 = /\/v1\/?$/.test(原始地址.replace(/\/$/, '')) ? 原始地址.replace(/\/$/, '') : `${原始地址.replace(/\/$/, '')}/v1`

  实例 = new OpenAI({
    apiKey: api密钥,
    baseURL: 规范地址,
    timeout: 120 * 1000,
    fetch: yiDingZhiFetch,
  })
  return 实例
}

type ChatCompletionShimResponse = {
  choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>
  usage?: Record<string, unknown>
  error?: { message?: string }
}

function zhuanHuanResponsesWeiChat(yuanBody: Record<string, unknown>): Record<string, unknown> {
  const shuRu = yuanBody.input as Array<{ role?: string; content?: unknown }> | undefined
  const messages = Array.isArray(shuRu)
    ? shuRu.map((x) => ({
        role: x.role,
        content: Array.isArray(x.content)
          ? (x.content as Array<{ type: string; text?: string; image_url?: { url: string } }>).map((kuai) =>
              kuai.type === 'input_text'
                ? { type: 'text', text: kuai.text }
                : kuai.type === 'input_image'
                  ? { type: 'image_url', image_url: kuai.image_url }
                  : kuai,
            )
          : x.content,
      }))
    : []
  const xinBody: Record<string, unknown> = { model: yuanBody.model, messages }
  const jsonFormat = (yuanBody.text as { format?: { type?: string } } | undefined)?.format?.type === 'json_object'
  if (jsonFormat) xinBody.response_format = { type: 'json_object' }
  if (typeof yuanBody.temperature === 'number') xinBody.temperature = yuanBody.temperature
  if (typeof yuanBody.top_p === 'number') xinBody.top_p = yuanBody.top_p
  if (yuanBody.max_output_tokens) xinBody.max_tokens = yuanBody.max_output_tokens
  const effort = (yuanBody.reasoning as { effort?: string } | undefined)?.effort
  if (effort && effort !== 'none') xinBody.reasoning_effort = effort === 'max' ? 'high' : effort
  return xinBody
}

function chuangJianChatXiangYing(shuJu: ChatCompletionShimResponse): Response {
  const neiRong = shuJu.choices?.[0]?.message?.content ?? ''
  const yongLiang = shuJu.usage
  const xinTi = {
    id: 'chat-shim',
    object: 'response',
    created_at: Math.floor(Date.now() / 1000),
    status: 'completed',
    output: [
      { type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: neiRong }] },
    ],
    usage: yongLiang
      ? {
          input_tokens: Number(yongLiang.prompt_tokens ?? 0) || 0,
          output_tokens: Number(yongLiang.completion_tokens ?? 0) || 0,
          total_tokens: Number(yongLiang.total_tokens ?? 0) || 0,
          input_tokens_details: { cached_tokens: Number(yongLiang.prompt_cache_hit_tokens ?? 0) || 0 },
        }
      : undefined,
  }
  return new Response(JSON.stringify(xinTi), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
export function 重置DeepSeek客户端(): void {
  实例 = null
}

export async function 自检模型名可用(): Promise<boolean> {
  const jiChu = String(process.env.DEEPSEEK_BASE_URL || peiZhi.deepSeek.基础地址 || AI配置.deepSeek.基础地址).replace(/\/$/, '')
  const qiYongMoXing = String(process.env.DEEPSEEK_MODEL || peiZhi.deepSeek.模型 || AI配置.deepSeek.模型).trim()
  const shiGuanFangDuanDian = /api\.deepseek\.com/.test(jiChu)
  const shiGuanFangMingMing = /^deepseek-/i.test(qiYongMoXing)
  if (!shiGuanFangDuanDian || !shiGuanFangMingMing) {
    return true
  }
  const miYao = String(peiZhi.deepSeek.api密钥 || AI配置.deepSeek.api密钥 || '').trim()
  if (!miYao || !jiChu) return true
  try {
    const xiangYing = await fetch(`${jiChu}/v1/models`, {
      headers: { Authorization: `Bearer ${miYao}` },
      signal: AbortSignal.timeout(15 * 1000),
    })
    if (!xiangYing.ok) {
      debug日志.warn('DeepSeek客户端', `模型名自检跳过：/v1/models 返回 ${xiangYing.status}`)
      return true
    }
    const shuJu = (await xiangYing.json()) as { data?: Array<{ id?: unknown }> }
    const keYong = (shuJu.data ?? []).map((m) => String(m.id ?? '')).filter(Boolean)
    if (keYong.length === 0 || keYong.includes(qiYongMoXing)) return true
    const neiRong = `当前 DEEPSEEK_MODEL=${qiYongMoXing} 不在官方可用模型列表 [${keYong.join(', ')}] 中，AI 调用将返回 400。请改为官方在册模型名。`
    debug日志.error('DeepSeek客户端', '模型名自检失败：配置的模型名不在官方可用列表', { xiang_qing: { nei_rong: neiRong } })
    const { faSongGaoJing } = await import('./邮件告警')
    void faSongGaoJing('ai_mo_xing_ming_shi_xiao', 'AI 模型名已失效', neiRong).catch(() => undefined)
    return false
  } catch (cuoWu) {
    debug日志.warn('DeepSeek客户端', '模型名自检跳过：拉取 /v1/models 异常', {
      xiang_qing: { cuo_wu: String(cuoWu) },
    })
    return true
  }
}

const 每字Token速率 = 0.6
const 图片固定Token = 1024

function 估算Token(neiRong: string | 对话块[]): number {
  if (typeof neiRong === 'string') return Math.ceil(neiRong.length * 每字Token速率)
  return neiRong.reduce((zong, kuai) => {
    if (kuai.type === 'input_text') return zong + Math.ceil(kuai.text.length * 每字Token速率)
    return zong + 图片固定Token
  }, 0)
}

interface 保护区间 {
  kaiShi: number
  jieShu: number
  wenBen: string
}

function tiQu保护区间(
  wenBen: string,
  kaiShiBiaoJi: string,
  jieShuBiaoJi: string,
  zuiHou = false,
): 保护区间 | null {
  const kaiShi = zuiHou ? wenBen.lastIndexOf(kaiShiBiaoJi) : wenBen.indexOf(kaiShiBiaoJi)
  if (kaiShi < 0) return null
  const jieShuWeiZhi = wenBen.indexOf(jieShuBiaoJi, kaiShi + kaiShiBiaoJi.length)
  if (jieShuWeiZhi < 0) return null
  const jieShu = jieShuWeiZhi + jieShuBiaoJi.length
  return { kaiShi, jieShu, wenBen: wenBen.slice(kaiShi, jieShu) }
}

function yiChuQuJian(wenBen: string, quJian: 保护区间 | null): string {
  return quJian ? wenBen.replace(quJian.wenBen, '') : wenBen
}

function jieQuZhiYuSuan(wenBen: string, yuSuan: number, congWei = false): string {
  if (yuSuan <= 0 || wenBen === '') return ''
  let di = 0
  let gao = wenBen.length
  while (di < gao) {
    const zhong = Math.ceil((di + gao) / 2)
    const houXuan = congWei ? wenBen.slice(-zhong) : wenBen.slice(0, zhong)
    if (估算Token(houXuan) <= yuSuan) di = zhong
    else gao = zhong - 1
  }
  return congWei ? wenBen.slice(-di) : wenBen.slice(0, di)
}

function hanYouZhiShi(neiRong: string | 对话块[]): boolean {
  return typeof neiRong === 'string'
    ? neiRong.includes(通用知识开始标记)
    : neiRong.some((kuai) => kuai.type === 'input_text' && kuai.text.includes(通用知识开始标记))
}

function yaSuoZhiShiWenBen(wenBen: string, yuSuan: number): string {
  if (估算Token(wenBen) <= yuSuan) return wenBen
  const zhiShi = tiQu保护区间(wenBen, 通用知识开始标记, 通用知识结束标记)
  if (!zhiShi) return wenBen
  const yongHu = tiQu保护区间(wenBen, 用户内容开始标记, 用户内容结束标记, true)
  const guDing = [zhiShi.wenBen, yongHu?.wenBen || ''].filter(Boolean).join('\n')
  const shengYu = Math.max(0, yuSuan - 估算Token(guDing) - 4)
  const qiTa = yiChuQuJian(yiChuQuJian(wenBen, zhiShi), yongHu)
  const qianZhui = jieQuZhiYuSuan(qiTa, Math.floor(shengYu / 2))
  const houZhui = jieQuZhiYuSuan(qiTa, shengYu - 估算Token(qianZhui), true)
  return [qianZhui, zhiShi.wenBen, houZhui, yongHu?.wenBen || ''].filter(Boolean).join('\n')
}

function yaSuoZhiShiNeiRong(neiRong: string | 对话块[], yuSuan: number): string | 对话块[] {
  if (估算Token(neiRong) <= yuSuan) return neiRong
  if (typeof neiRong === 'string') return yaSuoZhiShiWenBen(neiRong, yuSuan)
  const zhiShiSuoYin = neiRong.findIndex(
    (kuai) => kuai.type === 'input_text' && kuai.text.includes(通用知识开始标记),
  )
  if (zhiShiSuoYin < 0) return neiRong
  const zhiShiKuai = neiRong[zhiShiSuoYin]
  if (zhiShiKuai.type !== 'input_text') return neiRong
  const zuiXiaoZhiShi: 对话块 = { type: 'input_text', text: yaSuoZhiShiWenBen(zhiShiKuai.text, 0) }
  let qiTa = neiRong.filter((_, suoYin) => suoYin !== zhiShiSuoYin)
  const zuiXiaoToken = () => 估算Token([zuiXiaoZhiShi, ...qiTa])
  while (zuiXiaoToken() > yuSuan && qiTa.some((kuai) => kuai.type === 'input_image')) {
    const suoYin = qiTa.findIndex((kuai) => kuai.type === 'input_image')
    qiTa = qiTa.filter((_, index) => index !== suoYin)
  }
  while (zuiXiaoToken() > yuSuan && qiTa.length > 0) {
    qiTa = qiTa.slice(1)
  }
  const qiTaToken = 估算Token(qiTa)
  const yaSuoHou: 对话块 = {
    type: 'input_text',
    text: yaSuoZhiShiWenBen(zhiShiKuai.text, Math.max(0, yuSuan - qiTaToken)),
  }
  return [yaSuoHou, ...qiTa]
}

export function 预算保护(xiaoXi: 对话消息[], yuSuan?: number): 对话消息[] {
  const yuSuanZhi = yuSuan ?? AI配置.prompt.shangXiaWenTokenYuSuan
  if (!yuSuanZhi || yuSuanZhi <= 0) return xiaoXi
  const xiTong = xiaoXi.filter((x) => x.jiaoSe === 'system')
  let qiTa = xiaoXi.filter((x) => x.jiaoSe !== 'system')
  const xiTongJi = xiTong.reduce((s, x) => s + 估算Token(x.neiRong), 0)
  const jiSuan = () => xiTongJi + qiTa.reduce((s, x) => s + 估算Token(x.neiRong), 0)
  while (qiTa.length > 1 && jiSuan() > yuSuanZhi) {
    qiTa = qiTa.slice(1)
  }
  const zuiHouSuoYin = qiTa.length - 1
  if (zuiHouSuoYin >= 0 && jiSuan() > yuSuanZhi && hanYouZhiShi(qiTa[zuiHouSuoYin].neiRong)) {
    const qiTaToken = xiTongJi + qiTa.reduce(
      (zong, xiang, suoYin) => zong + (suoYin === zuiHouSuoYin ? 0 : 估算Token(xiang.neiRong)),
      0,
    )
    qiTa[zuiHouSuoYin] = {
      ...qiTa[zuiHouSuoYin],
      neiRong: yaSuoZhiShiNeiRong(qiTa[zuiHouSuoYin].neiRong, Math.max(0, yuSuanZhi - qiTaToken)),
    }
  }
  if (jiSuan() > yuSuanZhi) {
    debug日志.warn(
      'DeepSeek客户端',
      `[AI调用] 上下文估算 ${jiSuan()} token 已超预算 ${yuSuanZhi}，且单条消息无法再裁；请核对历史条数与消息长度上限`,
    )
  }
  return [...xiTong, ...qiTa]
}

function 提取响应(xiangYing: unknown): { neiRong: string; siKaoNeiRong: string } {
  const xiangYingZhi = xiangYing as { output?: Array<Record<string, unknown>>; status?: string }
  let neiRong = ''
  let siKaoNeiRong = ''
  for (const xiangMu of xiangYingZhi.output || []) {
    const type = xiangMu.type
    const fenPianLieBiao = (Array.isArray(xiangMu.content) ? xiangMu.content : []) as Array<Record<string, unknown>>
    if (type === 'message') {
      for (const fenPian of fenPianLieBiao) {
        if (fenPian.type === 'output_text') neiRong += (fenPian.text as string) || ''
      }
    } else if (type === 'reasoning') {
      for (const fenPian of fenPianLieBiao) {
        if (fenPian.type === 'reasoning_text') siKaoNeiRong += (fenPian.text as string) || ''
      }
    }
  }
  return { neiRong: neiRong.trim(), siKaoNeiRong: siKaoNeiRong.trim() }
}

function shiFouJinZhiCeShiWaiHu(): boolean {
  return process.env.VITEST === 'true' && process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true'
}

export async function tiaoYongDeepSeek(
  canShu: 调用参数,
  模型LeiXing: string = 'DeepSeek',
  waiBuXinHao?: AbortSignal,
): Promise<调用结果> {
  if (mockTiaoYong) {
    return mockTiaoYong(canShu)
  }
  if (shiFouJinZhiCeShiWaiHu()) {
    throw new Error(
      `[DeepSeek客户端] VITEST 测试环境禁止真实外呼（模型LeiXing=${模型LeiXing}）：请用 sheZhiMockTiaoYong 注入 mock，或显式设置 XU_KE_ZHEN_SHI_WAI_HU=true 允许联调`,
    )
  }

  const kaiShiShiJian = Date.now()
  const keHuDuan = 获取DeepSeek客户端()
  const 模型 = canShu.模型 || AI配置.deepSeek.模型
  const 响应格式 = canShu.响应格式 || { type: 'text' as const }

  if (peiZhi.kaiFaMoShi) {
    debug日志.debug('DeepSeek客户端', '[AI参数] 最终生效参数', {
      xiang_qing: {
        模型LeiXing,
        模型,
        wenDu: canShu.wenDu,
        top_p: canShu.top_p,
        最大Tokens: canShu.最大Tokens,
        思考模式: canShu.思考模式,
        思考强度: canShu.思考强度,
      },
    })
  }

  const shiJiXiaoXi = 预算保护(canShu.xiaoXi)

  const shuRuXiang = 构建请求输入(shiJiXiaoXi)

  if (chuangJianRiZhiYinQing().isLevelEnabled('debug')) {
    const 输入文本 = shuRuXiang.map((xiaoXi) => {
      if (typeof xiaoXi.content === 'string') return `${xiaoXi.role}: ${xiaoXi.content}`
      if (Array.isArray(xiaoXi.content)) {
        return `${xiaoXi.role}: ${xiaoXi.content.map((kuai) => {
          if (typeof kuai !== 'object' || kuai === null) return ''
          const kuaiObj = kuai as Record<string, unknown>
          if (typeof kuaiObj.text === 'string') return kuaiObj.text
          return '[媒体]'
        }).join('')}`
      }
      return `${xiaoXi.role}: [空内容]`
    }).join('\n')
    debug日志.debug('DeepSeek客户端', '[AI输入] 完整模型提示词', {
      xiang_qing: { 模型LeiXing, 内容: 输入文本 },
    })
  }

  const body: Record<string, unknown> = {
    model: 模型,
    input: shuRuXiang,
  }
  if (响应格式.type === 'json_object') {
    body.text = { format: { type: 'json_object' } }
  }
  const qingQiuXuanXiang: Record<string, unknown> = {}
  if (waiBuXinHao) {
    qingQiuXuanXiang.signal = waiBuXinHao
  }
  if (canShu.思考模式 === 'enabled') {
    body.reasoning = { effort: canShu.思考强度 || 'max' }
  } else if (canShu.思考模式 === 'disabled') {
    body.reasoning = { effort: 'none' }
  }
  if (canShu.最大Tokens) body.max_output_tokens = canShu.最大Tokens
  if (typeof canShu.wenDu === 'number') body.temperature = canShu.wenDu
  if (typeof canShu.top_p === 'number') body.top_p = canShu.top_p

  let zuiHouCuoWu: unknown = null
  let kongXiangYingCiShu = 0
  const 长测自主恢复 = (process.env['AI_CHANG_CE_ZI_ZHU_HUI_FU'] || '').trim().toLowerCase() === 'true'
  const 自主恢复上限毫秒 = Math.max(60_000, Number(process.env['AI_CHANG_CE_HUI_FU_SHANG_XIAN_HAO_MIAO'] || '900000') || 900000)
  const 自主恢复起点 = Date.now()
  if (waiBuXinHao?.aborted) {
    throw new Error('[DeepSeek客户端] 调用已取消，不再发起外呼')
  }
  const jianChaQuXiao = (): void => {
    if (waiBuXinHao?.aborted) {
      throw new Error('[DeepSeek客户端] 调用已取消，中止重试等待')
    }
  }
  for (let changCi = 0; changCi <= 可重试最大次数; changCi++) {
    jianChaQuXiao()
    if (rongDuanShiFouKaiQi()) {
      if (长测自主恢复 && Date.now() - 自主恢复起点 < 自主恢复上限毫秒) {
        await dengDai(Math.min(RongDuanLengQueHaoMiao, 20_000))
        changCi -= 1
        continue
      }
      const rongDuanCuoWu = new Error(huoQuFanYi('AI', 'aiDiaoYongShiBai')) as 分类错误
      rongDuanCuoWu.fenLei = 'buKeZhongShi'
      throw rongDuanCuoWu
    }
    try {
      const benCiChaoShi = 模型LeiXing === 'XieShou' ? 120 * 1000 : 60 * 1000
      const chaoShiKongZhi = new AbortController()
      const chaoShiDingShi = setTimeout(() => chaoShiKongZhi.abort(), benCiChaoShi)
      const youXiaoXinHao = waiBuXinHao ?? chaoShiKongZhi.signal
      if (waiBuXinHao) {
        clearTimeout(chaoShiDingShi)
      }
      const xiangYing = await keHuDuan.responses.create(
        body as unknown as OpenAI.Responses.ResponseCreateParamsNonStreaming,
        { signal: youXiaoXinHao } as unknown as Record<string, unknown>,
      )
      if (!waiBuXinHao) {
        clearTimeout(chaoShiDingShi)
      }

      let zhongXinXiangYing = xiangYing
      while (提取响应(zhongXinXiangYing).neiRong.trim() === '' && kongXiangYingCiShu < KongXiangYingZuiDaCiShu) {
        kongXiangYingCiShu += 1
        debug日志.warn('DeepSeek客户端', '[AI调用] 响应为空，退避后重试', {
          xiang_qing: { 模型LeiXing, 模型, ciShu: kongXiangYingCiShu },
        })
        const deng = Math.min(AI配置.kongXiangYing.tuiBiJiChuHaoMiao * kongXiangYingCiShu, AI配置.kongXiangYing.tuiBiZuiDaHaoMiao)
        if (waiBuXinHao) {
          await Promise.race([
            dengDai(deng),
            new Promise((_, juJue) => waiBuXinHao.addEventListener('abort', () => juJue(new Error('[DeepSeek客户端] 调用已取消，中止重试等待')), { once: true })),
          ])
        } else {
          await dengDai(deng)
        }
        const chongShiChaoShiKongZhi = new AbortController()
        const chongShiDingShi = setTimeout(() => chongShiChaoShiKongZhi.abort(), benCiChaoShi)
        try {
          zhongXinXiangYing = await keHuDuan.responses.create(
            body as unknown as OpenAI.Responses.ResponseCreateParamsNonStreaming,
            { signal: waiBuXinHao ?? chongShiChaoShiKongZhi.signal } as unknown as Record<string, unknown>,
          )
        } finally {
          clearTimeout(chongShiDingShi)
        }
      }

      const { neiRong, siKaoNeiRong } = 提取响应(zhongXinXiangYing)
      const shiYongLiang = tiQuShiYongLiang(zhongXinXiangYing)

      debug日志.debug('DeepSeek客户端', '[AI输出] 模型完整回复', {
        xiang_qing: { 模型LeiXing, 内容: neiRong },
      })

      if (peiZhi.kaiFaMoShi && siKaoNeiRong) {
        debug日志.debug('DeepSeek客户端', '[AI思考过程]', {
          xiang_qing: { si_kao_zi_shu: siKaoNeiRong.length, 内容: siKaoNeiRong },
        })
      }
      if ((zhongXinXiangYing as { status?: string }).status === 'incomplete') {
        debug日志.warn(
          'DeepSeek客户端',
          '[AI调用] 响应被截断（达到 max_output_tokens），思考强度可能过高或上限偏低',
        )
      }

      const haoShi = Date.now() - kaiShiShiJian
      jiLuAIJiLu(模型LeiXing, 模型, haoShi, true)
      jiLuChengGongRongDuan()

      const { jiLuAIChengGong } = await import('./邮件告警')
      jiLuAIChengGong()

      if (shiYongLiang) {
        void import('../services/用量统计').then(({ jiLuShiYongLiang }) => jiLuShiYongLiang({
          模型类型: 模型LeiXing,
          模型,
          shuRuToken: shiYongLiang.shuRuToken,
          shuChuToken: shiYongLiang.shuChuToken,
          zongToken: shiYongLiang.zongToken,
          mingZhongToken: shiYongLiang.mingZhongToken,
        })).catch(() => {})
      }

      return {
        neiRong,
        siKaoNeiRong,
        yuanShuJu: zhongXinXiangYing,
        xinXi: { role: 'assistant', neiRong: neiRong },
        shiYongLiang,
      }
    } catch (cuoWu) {
      if (waiBuXinHao?.aborted) {
        throw cuoWu
      }
      const fenLeiCuoWu = fenLeiDiaoYongCuoWu(cuoWu)
      zuiHouCuoWu = cuoWu
      if (fenLeiCuoWu.fenLei === 'buKeZhongShi') {
        const haoShi = Date.now() - kaiShiShiJian
        const cuoWuXinXi = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
        jiLuAIJiLu(模型LeiXing, 模型, haoShi, false, cuoWuXinXi)
        jiLuShiBaiRongDuan()
        void import('./邮件告警').then(({ jiLuAIShiBai }) => jiLuAIShiBai(cuoWuXinXi)).catch(() => {})
        throw cuoWu
      }
      if (changCi >= 可重试最大次数) {
        if (长测自主恢复 && Date.now() - 自主恢复起点 < 自主恢复上限毫秒) {
          changCi -= 1
          await dengDai(20_000)
          continue
        }
        break
      }
      const tuiBiHaoMiao = jiSuanTuiBiHaoMiao(changCi)
      if (waiBuXinHao) {
        await Promise.race([
          dengDai(tuiBiHaoMiao),
          new Promise((_, juJue) => waiBuXinHao.addEventListener('abort', () => juJue(new Error('[DeepSeek客户端] 调用已取消，中止重试等待')), { once: true })),
        ])
      } else {
        await dengDai(tuiBiHaoMiao)
      }
    }
  }
  const haoShi = Date.now() - kaiShiShiJian
  const cuoWuXinXi = zuiHouCuoWu instanceof Error ? zuiHouCuoWu.message : String(zuiHouCuoWu)
  jiLuAIJiLu(模型LeiXing, 模型, haoShi, false, cuoWuXinXi)
  jiLuShiBaiRongDuan()
  void import('./邮件告警').then(({ jiLuAIShiBai }) => jiLuAIShiBai(cuoWuXinXi)).catch(() => {})
  throw fenLeiDiaoYongCuoWu(zuiHouCuoWu)
}

export function 按配置调用(
  模型LeiXing: keyof typeof AI配置.模型,
  xiaoXi: 对话消息[],
  shangXiaWen?: 参数上下文,
  waiBuXinHao?: AbortSignal,
): Promise<调用结果> {
  const 模型CanShu = jiSuanAIChanShu(模型LeiXing, shangXiaWen)
  return tiaoYongDeepSeek(
    {
      模型: 模型CanShu.模型,
      wenDu: 模型CanShu.wenDu,
      top_p: 模型CanShu.top_p,
      最大Tokens: 模型CanShu.最大Tokens,
      响应格式: 模型CanShu.响应格式,
      思考模式: 模型CanShu.思考模式,
      思考强度: 模型CanShu.思考强度,
      xiaoXi,
    },
    模型LeiXing,
    waiBuXinHao,
  )
}
