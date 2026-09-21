import OpenAI from 'openai'
import { AI_PEI_ZHI } from '../config/AI配置'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { jiSuanAIChanShu, type CanShuShangXiaWen } from '../config/AI参数策略'
import { jiLuAIJiLu, debug日志 } from './debug日志'

/** Responses API 内容块：文本或内联图像（仅 user 消息允许图像块，官方限制）。
 *  注意：Responses API 中 image_url 为字符串（data URL / http URL），
 *  与 Chat Completions 的 {url} 对象形状不同（官方 vision 文档口径）。 */
export type DuiHuaKuai =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail?: 'low' | 'high' | 'auto' }

export interface DuiHuaXiaoXi {
  jiaoSe: 'system' | 'user' | 'assistant'
  neiRong: string | DuiHuaKuai[]
}

export interface TiaoYongCanShu {
  moXing?: string
  wenDu?: number
  top_p?: number
  zuiDaTokens?: number
  xiangYingGeShi?: { type: 'json_object' | 'text' }
  siKaoMoShi?: 'enabled' | 'disabled'
  reasoningEffort?: string
  xiaoXi: DuiHuaXiaoXi[]
}

export interface TiaoYongJieGuo {
  neiRong: string
  siKaoNeiRong?: string
  yuanShuJu: unknown
  xinXi: { role: string; content: string }
  shiYongLiang?: { shuRuToken: number; shuChuToken: number; zongToken: number; mingZhongToken: number }
}

export type CuoWuFenLei = 'keZhongShi' | 'buKeZhongShi'

export interface FenLeiCuoWu extends Error {
  fenLei: CuoWuFenLei
  zhuangTaiMa?: number
}

const KE_ZHONG_SHI_ZUI_DA_CI_SHU = AI_PEI_ZHI.zhongShi.keZhongShiZuiDaCiShu
const RONG_DUAN_LIAN_XU_SHI_BAI_YU_ZHI = AI_PEI_ZHI.zhongShi.rongDuanLianXuShiBaiYuZhi
const RONG_DUAN_LENG_QUE_HAO_MIAO = AI_PEI_ZHI.zhongShi.rongDuanLengQueHaoMiao

let rongDuanKaiQiShiJian = 0
let lianXuShiBaiCiShu = 0

export function chongZhiRongDuan(): void {
  rongDuanKaiQiShiJian = 0
  lianXuShiBaiCiShu = 0
}

function rongDuanShiFouKaiQi(): boolean {
  if (!rongDuanKaiQiShiJian) return false
  if (Date.now() - rongDuanKaiQiShiJian > RONG_DUAN_LENG_QUE_HAO_MIAO) {
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
  if (lianXuShiBaiCiShu >= RONG_DUAN_LIAN_XU_SHI_BAI_YU_ZHI) {
    rongDuanKaiQiShiJian = Date.now()
  }
}

function fenLeiDiaoYongCuoWu(cuoWu: unknown): FenLeiCuoWu {
  const yuanXinXi = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
  const zhuangTaiMa = tiQuZhuangTaiMa(cuoWu)
  const keZhongShi = zhuangTaiMa === null ? true : zhuangTaiMa === 429 || zhuangTaiMa >= 500
  const fenLeiCuoWu = new Error(yuanXinXi) as FenLeiCuoWu
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
  return Math.min(AI_PEI_ZHI.zhongShi.tuiBiJiChuHaoMiao * 2 ** changCi, AI_PEI_ZHI.zhongShi.tuiBiZuiDaHaoMiao)
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
  // 上下文硬盘缓存命中量（Responses: input_tokens_details.cached_tokens；Chat Completions: prompt_cache_hit_tokens）
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

let mockTiaoYong: ((canShu: TiaoYongCanShu) => Promise<TiaoYongJieGuo>) | null = null

export function sheZhiMockTiaoYong(
  mock: ((canShu: TiaoYongCanShu) => Promise<TiaoYongJieGuo>) | null,
): void {
  mockTiaoYong = mock
}

export function huoQuMockTiaoYong(): ((canShu: TiaoYongCanShu) => Promise<TiaoYongJieGuo>) | null {
  return mockTiaoYong
}

let shiLi: OpenAI | null = null

export function huoQuDeepSeekKeHuDuan(): OpenAI {
  if (shiLi) return shiLi
  const apiMiYao = peiZhi.deepSeek.apiMiYao || AI_PEI_ZHI.deepSeek.apiMiYao
  const jiChuUrl = peiZhi.deepSeek.jiChuUrl || AI_PEI_ZHI.deepSeek.jiChuUrl

  shiLi = new OpenAI({
    apiKey: apiMiYao,
    baseURL: jiChuUrl,
    timeout: 120 * 1000,
  })
  return shiLi
}

export function chongZhiDeepSeekKeHuDuan(): void {
  shiLi = null
}

/**
 * 启动期自检：配置的模型名是否仍在官方 GET /v1/models 列表内。
 * 根因：DeepSeek 的内测临时名（形如 `*-expires-on-MMDD`）随时可能从路由里摘掉，一旦摘掉，
 * 每次 AI 调用都会直接 400（"The supported API model names are ..."），表现为全站 AI 挂掉。
 * 只告警不阻塞启动：列表拉不到（网络/限速/代理）不等于模型名失效，故失败一律放行。
 */
export async function ziJianMoXingMingKeYong(): Promise<boolean> {
  const jiChu = (peiZhi.deepSeek.jiChuUrl || AI_PEI_ZHI.deepSeek.jiChuUrl).replace(/\/$/, '')
  const miYao = (peiZhi.deepSeek.apiMiYao || AI_PEI_ZHI.deepSeek.apiMiYao).trim()
  const qiYongMoXing = (peiZhi.deepSeek.moXing || AI_PEI_ZHI.deepSeek.moXing).trim()
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

/**
 * 保守 token 估算：官方口径 1 个中文字符 ≈ 0.6 token、1 个英文字符 ≈ 0.3 token
 * （https://api-docs.deepseek.com/zh-cn/quick_start/token_usage）。
 * 统一按「字符数 × 0.6」计：中文与官方口径一致，英文侧高估一倍，整体落在防低估的安全侧。
 * 内容块数组：input_text 按字符数 × 0.6，input_image 每张按官方单图上限 1024 计。
 */
const MEI_ZI_TOKEN_SHU_LV = 0.6
const TU_PIAN_GU_DING_TOKEN = 1024

function guJiToken(neiRong: string | DuiHuaKuai[]): number {
  if (typeof neiRong === 'string') return Math.ceil(neiRong.length * MEI_ZI_TOKEN_SHU_LV)
  return neiRong.reduce((zong, kuai) => {
    if (kuai.type === 'input_text') return zong + Math.ceil(kuai.text.length * MEI_ZI_TOKEN_SHU_LV)
    return zong + TU_PIAN_GU_DING_TOKEN
  }, 0)
}

/**
 * Responses API 不支持服务端截断：输入超过上下文窗口会直接返回 400 错误。
 * 这里在客户端侧做预算保护：超过预算时，从最旧的非 system 消息往前剔除，
 * 保住系统指令与最新上下文。
 *
 * 局限（必须在读代码时知道）：只能整条丢弃非 system 消息。Writer/Director 把整段历史渲染进
 * 单条 user 消息，因此本函数对聊天主链路裁不动，触顶时只能告警。真正防 400 的是
 * 「历史条数上限 × 单条消息 500 字符落库上限」对 1M 窗口的余量（见 AI配置.prompt 注释）。
 */
export function yuSuanBaoHu(xiaoXi: DuiHuaXiaoXi[], yuSuan?: number): DuiHuaXiaoXi[] {
  const yuSuanZhi = yuSuan ?? AI_PEI_ZHI.prompt.shangXiaWenTokenYuSuan
  if (!yuSuanZhi || yuSuanZhi <= 0) return xiaoXi
  const xiTong = xiaoXi.filter((x) => x.jiaoSe === 'system')
  let qiTa = xiaoXi.filter((x) => x.jiaoSe !== 'system')
  const xiTongJi = xiTong.reduce((s, x) => s + guJiToken(x.neiRong), 0)
  const jiSuan = () => xiTongJi + qiTa.reduce((s, x) => s + guJiToken(x.neiRong), 0)
  while (qiTa.length > 1 && jiSuan() > yuSuanZhi) {
    qiTa = qiTa.slice(1)
  }
  if (jiSuan() > yuSuanZhi) {
    debug日志.warn(
      'DeepSeek客户端',
      `[AI调用] 上下文估算 ${jiSuan()} token 已超预算 ${yuSuanZhi}，且单条消息无法再裁；请核对历史条数与消息长度上限`,
    )
  }
  return [...xiTong, ...qiTa]
}

/** 从 Responses API 响应中提取可见文本与思维链文本。 */
function tiQuXiangYing(xiangYing: unknown): { neiRong: string; siKaoNeiRong: string } {
  const resp = xiangYing as { output?: Array<Record<string, unknown>>; status?: string }
  let neiRong = ''
  let siKaoNeiRong = ''
  for (const item of resp.output || []) {
    const type = item.type
    const content = (Array.isArray(item.content) ? item.content : []) as Array<Record<string, unknown>>
    if (type === 'message') {
      for (const part of content) {
        if (part.type === 'output_text') neiRong += (part.text as string) || ''
      }
    } else if (type === 'reasoning') {
      for (const part of content) {
        if (part.type === 'reasoning_text') siKaoNeiRong += (part.text as string) || ''
      }
    }
  }
  return { neiRong: neiRong.trim(), siKaoNeiRong: siKaoNeiRong.trim() }
}

function shiFouJinZhiCeShiWaiHu(): boolean {
  return process.env.VITEST === 'true' && process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true'
}

export async function tiaoYongDeepSeek(
  canShu: TiaoYongCanShu,
  moXingLeiXing: string = 'DeepSeek',
  waiBuXinHao?: AbortSignal,
): Promise<TiaoYongJieGuo> {
  if (mockTiaoYong) {
    return mockTiaoYong(canShu)
  }
  if (shiFouJinZhiCeShiWaiHu()) {
    throw new Error(
      `[DeepSeek客户端] VITEST 测试环境禁止真实外呼（moXingLeiXing=${moXingLeiXing}）：请用 sheZhiMockTiaoYong 注入 mock，或显式设置 XU_KE_ZHEN_SHI_WAI_HU=true 允许联调`,
    )
  }

  const kaiShiShiJian = Date.now()
  const keHuDuan = huoQuDeepSeekKeHuDuan()
  const moXing = canShu.moXing || AI_PEI_ZHI.deepSeek.moXing
  const xiangYingGeShi = canShu.xiangYingGeShi || { type: 'text' as const }

  if (peiZhi.kaiFaMoShi) {
    debug日志.debug('DeepSeek客户端', '[AI参数] 最终生效参数', {
      xiang_qing: {
        moXingLeiXing,
        moXing,
        wenDu: canShu.wenDu,
        top_p: canShu.top_p,
        zuiDaTokens: canShu.zuiDaTokens,
        siKaoMoShi: canShu.siKaoMoShi,
        reasoningEffort: canShu.reasoningEffort,
      },
    })
  }

  // 客户端侧 token 预算保护（Responses API 无服务端截断，超窗口直接 400）
  const shiJiXiaoXi = yuSuanBaoHu(canShu.xiaoXi)

  const shuRuXiang = shiJiXiaoXi.map((x) => ({ role: x.jiaoSe, content: x.neiRong }))

  const body: Record<string, unknown> = {
    model: moXing,
    input: shuRuXiang,
  }
  if (xiangYingGeShi.type === 'json_object') {
    body.text = { format: { type: 'json_object' } }
  }
  // YH-049 OpenAI SDK透传外部signal：在途fetch可被取消，不再照烧token
  const qingQiuXuanXiang: Record<string, unknown> = {}
  if (waiBuXinHao) {
    qingQiuXuanXiang.signal = waiBuXinHao
  }
  // 官方规范（Responses API）：思考模式用 reasoning.effort 控制，不再使用 thinking/reasoning_effort。
  // effort 取值 none/minimal/low/medium/high/xhigh/max；max = 最高思考强度。
  if (canShu.siKaoMoShi === 'enabled') {
    body.reasoning = { effort: canShu.reasoningEffort || 'max' }
  }
  if (canShu.zuiDaTokens) body.max_output_tokens = canShu.zuiDaTokens
  if (typeof canShu.wenDu === 'number') body.temperature = canShu.wenDu
  if (typeof canShu.top_p === 'number') body.top_p = canShu.top_p

  let zuiHouCuoWu: unknown = null
  // YH-049 取消透传到底层：外部signal已中止直接短路，不再发起新的LLM外呼烧token
  if (waiBuXinHao?.aborted) {
    throw new Error('[DeepSeek客户端] 调用已取消，不再发起外呼')
  }
  const jianChaQuXiao = (): void => {
    if (waiBuXinHao?.aborted) {
      throw new Error('[DeepSeek客户端] 调用已取消，中止重试等待')
    }
  }
  for (let changCi = 0; changCi <= KE_ZHONG_SHI_ZUI_DA_CI_SHU; changCi++) {
    jianChaQuXiao()
    if (rongDuanShiFouKaiQi()) {
      const rongDuanCuoWu = new Error(huoQuFanYi('AI', 'aiDiaoYongShiBai')) as FenLeiCuoWu
      rongDuanCuoWu.fenLei = 'buKeZhongShi'
      throw rongDuanCuoWu
    }
    try {
      // YH-049 分级超时：轻量判定类短超时，沉浸生成类长超时；外部取消优先于超时
      const benCiChaoShi = moXingLeiXing === 'writer' ? 120 * 1000 : 60 * 1000
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

      const { neiRong, siKaoNeiRong } = tiQuXiangYing(xiangYing)
      const shiYongLiang = tiQuShiYongLiang(xiangYing)

      if (peiZhi.kaiFaMoShi && siKaoNeiRong) {
        debug日志.debug('DeepSeek客户端', '[AI思考过程]', {
          xiang_qing: { nei_rong: siKaoNeiRong.slice(0, 500) },
        })
      }
      if ((xiangYing as { status?: string }).status === 'incomplete') {
        debug日志.warn(
          'DeepSeek客户端',
          '[AI调用] 响应被截断（达到 max_output_tokens），思考强度可能过高或上限偏低',
        )
      }

      const haoShi = Date.now() - kaiShiShiJian
      jiLuAIJiLu(moXingLeiXing, moXing, haoShi, true)
      jiLuChengGongRongDuan()

      // A12：AI 调用成功，重置连续失败告警计数
      const { jiLuAIChengGong } = await import('./邮件告警')
      jiLuAIChengGong()

      if (shiYongLiang) {
        void import('../services/用量统计').then(({ jiLuShiYongLiang }) => jiLuShiYongLiang({
          moXingLeiXing,
          moXing,
          shuRuToken: shiYongLiang.shuRuToken,
          shuChuToken: shiYongLiang.shuChuToken,
          zongToken: shiYongLiang.zongToken,
          mingZhongToken: shiYongLiang.mingZhongToken,
        })).catch(() => {})
      }

      return {
        neiRong,
        siKaoNeiRong,
        yuanShuJu: xiangYing,
        xinXi: { role: 'assistant', content: neiRong },
        shiYongLiang,
      }
    } catch (cuoWu) {
      // YH-049 取消即停：外部取消不再分类重试，直接向上传播，禁在途照烧
      if (waiBuXinHao?.aborted) {
        throw cuoWu
      }
      const fenLeiCuoWu = fenLeiDiaoYongCuoWu(cuoWu)
      zuiHouCuoWu = cuoWu
      if (fenLeiCuoWu.fenLei === 'buKeZhongShi') {
        const haoShi = Date.now() - kaiShiShiJian
        const cuoWuXinXi = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
        jiLuAIJiLu(moXingLeiXing, moXing, haoShi, false, cuoWuXinXi)
        jiLuShiBaiRongDuan()
        void import('./邮件告警').then(({ jiLuAIShiBai }) => jiLuAIShiBai(cuoWuXinXi)).catch(() => {})
        throw cuoWu
      }
      if (changCi >= KE_ZHONG_SHI_ZUI_DA_CI_SHU) break
      // YH-049 退避等待可取消：等待期被取消直接停，不再发起下一轮外呼
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
  jiLuAIJiLu(moXingLeiXing, moXing, haoShi, false, cuoWuXinXi)
  jiLuShiBaiRongDuan()
  // A12：连续 AI 失败达到阈值时触发邮件/日志告警（异步不阻塞错误传播）
  void import('./邮件告警').then(({ jiLuAIShiBai }) => jiLuAIShiBai(cuoWuXinXi)).catch(() => {})
  throw fenLeiDiaoYongCuoWu(zuiHouCuoWu)
}

export function genJuPeiZhiTiaoYong(
  moXingLeiXing: keyof typeof AI_PEI_ZHI.moXing,
  xiaoXi: DuiHuaXiaoXi[],
  shangXiaWen?: CanShuShangXiaWen,
  waiBuXinHao?: AbortSignal,
): Promise<TiaoYongJieGuo> {
  const moXingCanShu = jiSuanAIChanShu(moXingLeiXing, shangXiaWen)
  return tiaoYongDeepSeek(
    {
      moXing: moXingCanShu.moXing,
      wenDu: moXingCanShu.wenDu,
      top_p: moXingCanShu.top_p,
      zuiDaTokens: moXingCanShu.zuiDaTokens,
      xiangYingGeShi: moXingCanShu.xiangYingGeShi,
      siKaoMoShi: moXingCanShu.siKaoMoShi,
      reasoningEffort: moXingCanShu.reasoningEffort,
      xiaoXi,
    },
    moXingLeiXing,
    waiBuXinHao,
  )
}
