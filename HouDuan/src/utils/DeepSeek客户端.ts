import OpenAI from 'openai'
import { AI_PEI_ZHI } from '../config/AI配置'
import { 通用知识结束标记, 通用知识开始标记, 用户内容结束标记, 用户内容开始标记 } from '../config/通用知识库'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { jiSuanAIChanShu, type CanShuShangXiaWen } from '../config/AI参数策略'
import { jiLuAIJiLu, debug日志 } from './debug日志'

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
  xinXi: { role: string; neiRong: string }
  shiYongLiang?: { shuRuToken: number; shuChuToken: number; zongToken: number; mingZhongToken: number }
}

export type CuoWuFenLei = 'keZhongShi' | 'buKeZhongShi'

export interface FenLeiCuoWu extends Error {
  fenLei: CuoWuFenLei
  zhuangTaiMa?: number
}

const KE_ZHONG_SHI_ZUI_DA_CI_SHU = AI_PEI_ZHI.zhongShi.keZhongShiZuiDaCiShu
const KONG_XIANG_YING_ZUI_DA_CI_SHU = AI_PEI_ZHI.kongXiangYing.zuiDaCiShu
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

export function GouJianQingQiuShuRu<T extends { jiaoSe: string; neiRong: unknown }>(
  xiaoXi: readonly T[],
): Array<{ role: string; content: unknown }> {
  return xiaoXi.map((x) => ({ role: x.jiaoSe, content: x.neiRong }))
}

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

const MEI_ZI_TOKEN_SHU_LV = 0.6
const TU_PIAN_GU_DING_TOKEN = 1024

function guJiToken(neiRong: string | DuiHuaKuai[]): number {
  if (typeof neiRong === 'string') return Math.ceil(neiRong.length * MEI_ZI_TOKEN_SHU_LV)
  return neiRong.reduce((zong, kuai) => {
    if (kuai.type === 'input_text') return zong + Math.ceil(kuai.text.length * MEI_ZI_TOKEN_SHU_LV)
    return zong + TU_PIAN_GU_DING_TOKEN
  }, 0)
}

interface BaoHuQuJian {
  kaiShi: number
  jieShu: number
  wenBen: string
}

function tiQuBaoHuQuJian(
  wenBen: string,
  kaiShiBiaoJi: string,
  jieShuBiaoJi: string,
  zuiHou = false,
): BaoHuQuJian | null {
  const kaiShi = zuiHou ? wenBen.lastIndexOf(kaiShiBiaoJi) : wenBen.indexOf(kaiShiBiaoJi)
  if (kaiShi < 0) return null
  const jieShuWeiZhi = wenBen.indexOf(jieShuBiaoJi, kaiShi + kaiShiBiaoJi.length)
  if (jieShuWeiZhi < 0) return null
  const jieShu = jieShuWeiZhi + jieShuBiaoJi.length
  return { kaiShi, jieShu, wenBen: wenBen.slice(kaiShi, jieShu) }
}

function yiChuQuJian(wenBen: string, quJian: BaoHuQuJian | null): string {
  return quJian ? wenBen.replace(quJian.wenBen, '') : wenBen
}

function jieQuZhiYuSuan(wenBen: string, yuSuan: number, congWei = false): string {
  if (yuSuan <= 0 || wenBen === '') return ''
  let di = 0
  let gao = wenBen.length
  while (di < gao) {
    const zhong = Math.ceil((di + gao) / 2)
    const houXuan = congWei ? wenBen.slice(-zhong) : wenBen.slice(0, zhong)
    if (guJiToken(houXuan) <= yuSuan) di = zhong
    else gao = zhong - 1
  }
  return congWei ? wenBen.slice(-di) : wenBen.slice(0, di)
}

function hanYouZhiShi(neiRong: string | DuiHuaKuai[]): boolean {
  return typeof neiRong === 'string'
    ? neiRong.includes(通用知识开始标记)
    : neiRong.some((kuai) => kuai.type === 'input_text' && kuai.text.includes(通用知识开始标记))
}

function yaSuoZhiShiWenBen(wenBen: string, yuSuan: number): string {
  if (guJiToken(wenBen) <= yuSuan) return wenBen
  const zhiShi = tiQuBaoHuQuJian(wenBen, 通用知识开始标记, 通用知识结束标记)
  if (!zhiShi) return wenBen
  const yongHu = tiQuBaoHuQuJian(wenBen, 用户内容开始标记, 用户内容结束标记, true)
  const guDing = [zhiShi.wenBen, yongHu?.wenBen || ''].filter(Boolean).join('\n')
  const shengYu = Math.max(0, yuSuan - guJiToken(guDing) - 4)
  const qiTa = yiChuQuJian(yiChuQuJian(wenBen, zhiShi), yongHu)
  const qianZhui = jieQuZhiYuSuan(qiTa, Math.floor(shengYu / 2))
  const houZhui = jieQuZhiYuSuan(qiTa, shengYu - guJiToken(qianZhui), true)
  return [qianZhui, zhiShi.wenBen, houZhui, yongHu?.wenBen || ''].filter(Boolean).join('\n')
}

function yaSuoZhiShiNeiRong(neiRong: string | DuiHuaKuai[], yuSuan: number): string | DuiHuaKuai[] {
  if (guJiToken(neiRong) <= yuSuan) return neiRong
  if (typeof neiRong === 'string') return yaSuoZhiShiWenBen(neiRong, yuSuan)
  const zhiShiSuoYin = neiRong.findIndex(
    (kuai) => kuai.type === 'input_text' && kuai.text.includes(通用知识开始标记),
  )
  if (zhiShiSuoYin < 0) return neiRong
  const zhiShiKuai = neiRong[zhiShiSuoYin]
  if (zhiShiKuai.type !== 'input_text') return neiRong
  const zuiXiaoZhiShi: DuiHuaKuai = { type: 'input_text', text: yaSuoZhiShiWenBen(zhiShiKuai.text, 0) }
  let qiTa = neiRong.filter((_, suoYin) => suoYin !== zhiShiSuoYin)
  const zuiXiaoToken = () => guJiToken([zuiXiaoZhiShi, ...qiTa])
  while (zuiXiaoToken() > yuSuan && qiTa.some((kuai) => kuai.type === 'input_image')) {
    const suoYin = qiTa.findIndex((kuai) => kuai.type === 'input_image')
    qiTa = qiTa.filter((_, index) => index !== suoYin)
  }
  while (zuiXiaoToken() > yuSuan && qiTa.length > 0) {
    qiTa = qiTa.slice(1)
  }
  const qiTaToken = guJiToken(qiTa)
  const yaSuoHou: DuiHuaKuai = {
    type: 'input_text',
    text: yaSuoZhiShiWenBen(zhiShiKuai.text, Math.max(0, yuSuan - qiTaToken)),
  }
  return [yaSuoHou, ...qiTa]
}

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
  const zuiHouSuoYin = qiTa.length - 1
  if (zuiHouSuoYin >= 0 && jiSuan() > yuSuanZhi && hanYouZhiShi(qiTa[zuiHouSuoYin].neiRong)) {
    const qiTaToken = xiTongJi + qiTa.reduce(
      (zong, xiang, suoYin) => zong + (suoYin === zuiHouSuoYin ? 0 : guJiToken(xiang.neiRong)),
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

function tiQuXiangYing(xiangYing: unknown): { neiRong: string; siKaoNeiRong: string } {
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

  const shiJiXiaoXi = yuSuanBaoHu(canShu.xiaoXi)

  const shuRuXiang = GouJianQingQiuShuRu(shiJiXiaoXi)

  const body: Record<string, unknown> = {
    model: moXing,
    input: shuRuXiang,
  }
  if (xiangYingGeShi.type === 'json_object') {
    body.text = { format: { type: 'json_object' } }
  }
  const qingQiuXuanXiang: Record<string, unknown> = {}
  if (waiBuXinHao) {
    qingQiuXuanXiang.signal = waiBuXinHao
  }
  if (canShu.siKaoMoShi === 'enabled') {
    body.reasoning = { effort: canShu.reasoningEffort || 'max' }
  } else if (canShu.siKaoMoShi === 'disabled') {
    body.reasoning = { effort: 'none' }
  }
  if (canShu.zuiDaTokens) body.max_output_tokens = canShu.zuiDaTokens
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
  for (let changCi = 0; changCi <= KE_ZHONG_SHI_ZUI_DA_CI_SHU; changCi++) {
    jianChaQuXiao()
    if (rongDuanShiFouKaiQi()) {
      if (长测自主恢复 && Date.now() - 自主恢复起点 < 自主恢复上限毫秒) {
        await dengDai(Math.min(RONG_DUAN_LENG_QUE_HAO_MIAO, 20_000))
        changCi -= 1
        continue
      }
      const rongDuanCuoWu = new Error(huoQuFanYi('AI', 'aiDiaoYongShiBai')) as FenLeiCuoWu
      rongDuanCuoWu.fenLei = 'buKeZhongShi'
      throw rongDuanCuoWu
    }
    try {
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

      let zhongXinXiangYing = xiangYing
      while (tiQuXiangYing(zhongXinXiangYing).neiRong.trim() === '' && kongXiangYingCiShu < KONG_XIANG_YING_ZUI_DA_CI_SHU) {
        kongXiangYingCiShu += 1
        debug日志.warn('DeepSeek客户端', '[AI调用] 响应为空，退避后重试', {
          xiang_qing: { moXingLeiXing, moXing, ciShu: kongXiangYingCiShu },
        })
        const deng = Math.min(AI_PEI_ZHI.kongXiangYing.tuiBiJiChuHaoMiao * kongXiangYingCiShu, AI_PEI_ZHI.kongXiangYing.tuiBiZuiDaHaoMiao)
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

      const { neiRong, siKaoNeiRong } = tiQuXiangYing(zhongXinXiangYing)
      const shiYongLiang = tiQuShiYongLiang(zhongXinXiangYing)

      if (peiZhi.kaiFaMoShi && siKaoNeiRong) {
        debug日志.debug('DeepSeek客户端', '[AI思考过程]', {
          xiang_qing: { si_kao_zi_shu: siKaoNeiRong.length },
        })
      }
      if ((zhongXinXiangYing as { status?: string }).status === 'incomplete') {
        debug日志.warn(
          'DeepSeek客户端',
          '[AI调用] 响应被截断（达到 max_output_tokens），思考强度可能过高或上限偏低',
        )
      }

      const haoShi = Date.now() - kaiShiShiJian
      jiLuAIJiLu(moXingLeiXing, moXing, haoShi, true)
      jiLuChengGongRongDuan()

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
        jiLuAIJiLu(moXingLeiXing, moXing, haoShi, false, cuoWuXinXi)
        jiLuShiBaiRongDuan()
        void import('./邮件告警').then(({ jiLuAIShiBai }) => jiLuAIShiBai(cuoWuXinXi)).catch(() => {})
        throw cuoWu
      }
      if (changCi >= KE_ZHONG_SHI_ZUI_DA_CI_SHU) {
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
  jiLuAIJiLu(moXingLeiXing, moXing, haoShi, false, cuoWuXinXi)
  jiLuShiBaiRongDuan()
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
