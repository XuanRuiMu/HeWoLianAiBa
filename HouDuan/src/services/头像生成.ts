import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Readable } from 'stream'
import { redis } from '../redis'
import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import { 裁掉PNG底部 } from '../utils/PNG裁剪'
import { 内部转展示 } from '../utils/性别'
import { diaoYongShengTuJieKou } from './图像生成'
import { liuShiBaoCunMeiTi, shengChengMeiTiYinYong } from './媒体存储'
import { paiRuZhongShiDuiLie } from './重试队列'
import {
  TouXiangPeiZhi,
  MbtiQiZhi,
  JiDiaoQiZhi,
  推导情绪基调,
  type TouXiangQiZhi,
  type QingXuJiDiao,
} from '../config/头像配置'
import type { ShengChengJiaoSeJieGuo } from './角色生成'

interface TouXiangFengGe {
  类别: string
  画风锚点: string
  主体模板: string
  专用负面词: string
  适用气质: string[]
  适用年龄档: string[]
  适用身份: string[]
  爱好线索: string[]
  是否人物主体: boolean
  视线约束?: string
}

interface TouXiangPiPeiGuiZe {
  年龄档: Array<{ 档名: string; 最小年龄: number; 最大年龄: number; 风格加分: Record<string, number> }>
  气质加分: Record<string, Record<string, number>>
  身份加分: Record<string, Record<string, number>>
  爱好命中加分: number
  避免重复: { 同批已用风格扣分: number }
  人物转译: {
    年龄感: Record<string, string>
    气质配色: Record<string, string>
    气质氛围: Record<string, string>
    爱好小物: Record<string, string>
    默认小物: string
    人物句式: string
  }
}

function duQuJSON(wenJianMing: string): string {
  return readFileSync(resolve(__dirname, '../config', wenJianMing), 'utf-8')
}

function jieXiJSON<T>(wenBen: string, moRen: T): T {
  try {
    return JSON.parse(wenBen) as T
  } catch (cuoWu) {
    debug日志.error('头像生成', '配置JSON解析失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return moRen
  }
}

const FengGeKu = jieXiJSON<{ 通用: { 构图约束: string; 通用负面词: string }; 风格: TouXiangFengGe[] }>(
  duQuJSON('头像风格库.json'),
  { 通用: { 构图约束: '', 通用负面词: '' }, 风格: [] },
)

const PiPeiGuiZe = jieXiJSON<TouXiangPiPeiGuiZe>(duQuJSON('头像匹配规则.json'), {
  年龄档: [],
  气质加分: {},
  身份加分: {},
  爱好命中加分: 2,
  避免重复: { 同批已用风格扣分: 8 },
  人物转译: {
    年龄感: {},
    气质配色: {},
    气质氛围: {},
    爱好小物: {},
    默认小物: '',
    人物句式: '',
  },
})

export interface TouXiangFengGeXuanZe {
  fengGe: TouXiangFengGe
  qiZhi: TouXiangQiZhi
  nianLingDang: string
}

function tuiDaoNianLingDang(nianLing: number): string {
  for (const dang of PiPeiGuiZe.年龄档) {
    if (nianLing >= dang.最小年龄 && nianLing <= dang.最大年龄) return dang.档名
  }
  return '青年'
}

export function 推导头像气质(mbti: string, xingGeWenBen?: string): TouXiangQiZhi {
  const congXingGe = xingGeWenBen ? 推导情绪基调(xingGeWenBen) : null
  const congMbti = MbtiQiZhi[mbti]
  if (congXingGe === '阴郁') return '冷感'
  if (congMbti) return congMbti
  if (congXingGe === '明朗') return '活泼'
  return '沉稳'
}

function ziFuChuanHash(zhongZi: string): number {
  let haXi = 5381
  for (let i = 0; i < zhongZi.length; i++) {
    haXi = ((haXi << 5) + haXi + zhongZi.charCodeAt(i)) >>> 0
  }
  return haXi
}

export function 选择头像风格(canShu: {
  nianLing: number
  mbti: string
  xingGeWenBen?: string
  shenFen?: string
  xiHao?: string[]
  zhongZi: string
  yiYongFengGe?: string[]
  jiDiao?: QingXuJiDiao
}): TouXiangFengGeXuanZe | null {
  if (FengGeKu.风格.length === 0) return null
  const nianLingDang = tuiDaoNianLingDang(canShu.nianLing)
  const qiZhi = canShu.jiDiao ? JiDiaoQiZhi[canShu.jiDiao] : 推导头像气质(canShu.mbti, canShu.xingGeWenBen)
  const shenFen = canShu.shenFen ?? ''
  const xiHao = canShu.xiHao ?? []
  const yiYong = new Set(canShu.yiYongFengGe ?? [])

  const deFen = FengGeKu.风格.map((fengGe) => {
    let zongFen = 0
    const nianLingJia = PiPeiGuiZe.年龄档.find((dang) => dang.档名 === nianLingDang)?.风格加分[fengGe.类别] ?? 0
    zongFen += nianLingJia
    zongFen += PiPeiGuiZe.气质加分[qiZhi]?.[fengGe.类别] ?? 0
    zongFen += PiPeiGuiZe.身份加分[shenFen]?.[fengGe.类别] ?? 0
    if (xiHao.some((hao) => fengGe.爱好线索.some((suo) => hao.includes(suo) || suo.includes(hao)))) {
      zongFen += PiPeiGuiZe.爱好命中加分
    }
    if (yiYong.has(fengGe.类别)) zongFen -= PiPeiGuiZe.避免重复.同批已用风格扣分
    return { fengGe, zongFen }
  }).sort((qian, hou) => hou.zongFen - qian.zongFen)

  const houXuanShu = Math.min(3, deFen.length)
  const suoYin = ziFuChuanHash(canShu.zhongZi) % houXuanShu
  return { fengGe: deFen[suoYin].fengGe, qiZhi, nianLingDang }
}

export interface TouXiangTiShiCiZuZhuang {
  prompt: string
  negativePrompt: string
  miaoShu: string
}

export function 组装头像提示词(
  xuanZe: TouXiangFengGeXuanZe,
  canShu: { nianLing: number; xingBie: string; waiMao: string; xiHao?: string[] },
): TouXiangTiShiCiZuZhuang {
  const { fengGe, qiZhi, nianLingDang } = xuanZe
  const zhuanYi = PiPeiGuiZe.人物转译
  const peiSe = zhuanYi.气质配色[qiZhi] ?? ''
  const fenWei = zhuanYi.气质氛围[qiZhi] ?? ''
  const nianLingGan = zhuanYi.年龄感[nianLingDang] ?? ''
  const xiaoWu =
    (canShu.xiHao ?? []).map((hao) => zhuanYi.爱好小物[hao]).find((zhi) => Boolean(zhi)) ??
    zhuanYi.默认小物

  let zhuTi: string
  if (fengGe.是否人物主体) {
    const xingBieZhanShi = 内部转展示(canShu.xingBie === 'nan' || canShu.xingBie === 'nv' ? canShu.xingBie : 'nv')
    const waiMao = canShu.waiMao.trim() || '眉眼柔和'
    zhuTi = zhuanYi.人物句式
      .replaceAll('{年龄}', String(canShu.nianLing))
      .replaceAll('{性别}', xingBieZhanShi)
      .replaceAll('{年龄感}', nianLingGan)
      .replaceAll('{外貌}', waiMao)
  } else {
    zhuTi = fengGe.主体模板
      .replaceAll('{配色}', peiSe)
      .replaceAll('{氛围}', fenWei)
      .replaceAll('{小物}', xiaoWu)
  }

  const bufen = [fengGe.画风锚点, zhuTi]
  if (fengGe.视线约束) bufen.push(fengGe.视线约束)
  bufen.push(FengGeKu.通用.构图约束)
  const prompt = bufen.filter((bu) => bu.trim() !== '').join('，')
  const negativePrompt = [FengGeKu.通用.通用负面词, fengGe.专用负面词]
    .filter((bu) => bu.trim() !== '')
    .join(',')

  const miaoShu = `${fengGe.类别}风格头像，${zhuTi}`
  return { prompt, negativePrompt, miaoShu: miaoShu.slice(0, 60) }
}

async function 等待生成队列(): Promise<void> {
  const jian = 'tou_xiang_sheng_cheng_dui_lie'
  for (let ciShu = 0; ciShu < TouXiangPeiZhi.zhengPianZuiDaChangShiCiShu + 3; ciShu++) {
    const deDao = await redis.set(jian, '1', 'PX', TouXiangPeiZhi.paiDuiJianGeHaoMiao, 'NX')
    if (deDao === 'OK' || deDao === 1 || deDao === true) return
    await new Promise((jieJue) => setTimeout(jieJue, Math.min(TouXiangPeiZhi.paiDuiJianGeHaoMiao, 2000)))
  }
}

export interface JiaoSeTouXiangJieGuo {
  chengGong: boolean
  touXiangMiaoShu?: string
  meiTiId?: string
  yinYong?: string
}

export async function 生成角色头像(canShu: {
  用户ID: string
  jiaoSeId: string
  jiaoSe: Pick<ShengChengJiaoSeJieGuo, 'nian_ling' | 'xing_bie' | 'mbti_lei_xing' | 'shen_fen' | 'wai_mao' | 'xi_hao' | 'xing_ge'>
  jiDiao?: QingXuJiDiao
}): Promise<JiaoSeTouXiangJieGuo> {
  const xuanZe = 选择头像风格({
    nianLing: canShu.jiaoSe.nian_ling,
    mbti: canShu.jiaoSe.mbti_lei_xing,
    xingGeWenBen: canShu.jiaoSe.xing_ge,
    shenFen: canShu.jiaoSe.shen_fen,
    xiHao: canShu.jiaoSe.xi_hao,
    zhongZi: canShu.jiaoSeId,
  })
  if (!xuanZe) {
    debug日志.warn('头像生成', '风格库为空，跳过头像生成', { xiang_qing: { jiao_se_id: canShu.jiaoSeId } })
    return { chengGong: false }
  }
  const zuZhuang = 组装头像提示词(xuanZe, {
    nianLing: canShu.jiaoSe.nian_ling,
    xingBie: canShu.jiaoSe.xing_bie,
    waiMao: canShu.jiaoSe.wai_mao,
    xiHao: canShu.jiaoSe.xi_hao,
  })

  await 等待生成队列()
  for (let ciShu = 0; ciShu < TouXiangPeiZhi.zhengPianZuiDaChangShiCiShu; ciShu++) {
    const jieGuo = await diaoYongShengTuJieKou({
      tiShiCi: zuZhuang.prompt,
      fuMianTiShiCi: zuZhuang.negativePrompt,
      tuXiangChiCun: TouXiangPeiZhi.tuXiangChiCun,
    })
    if (!jieGuo.cheng_gong || !jieGuo.tuPianZiJie) {
      debug日志.warn('头像生成', `正片第${ciShu + 1}次生成失败`, {
        xiang_qing: { jiao_se_id: canShu.jiaoSeId, ti_shi: jieGuo.ti_shi ?? '' },
      })
      continue
    }
    const caiJian = 裁掉PNG底部(jieGuo.tuPianZiJie, TouXiangPeiZhi.caiDiBuBiLi)
    const cunChu = await liuShiBaoCunMeiTi(
      Readable.from(caiJian),
      `touxiang-${canShu.jiaoSeId}-${Date.now()}.png`,
      'image/png',
      'tupian',
      canShu.用户ID,
    )
    const yinYong = shengChengMeiTiYinYong(cunChu.sha256)
    await 数据库.query(`UPDATE "角色" SET "头像" = $1, "头像描述" = $2 WHERE "ID" = $3`, [
      yinYong,
      zuZhuang.miaoShu,
      canShu.jiaoSeId,
    ])
    return { chengGong: true, touXiangMiaoShu: zuZhuang.miaoShu, meiTiId: cunChu.mediaId, yinYong }
  }

  debug日志.warn('头像生成', '正片生成最终失败，入重试队列等待后台补生成', {
    xiang_qing: { jiao_se_id: canShu.jiaoSeId },
  })
  await paiRuZhongShiDuiLie({ leiXing: 'touXiangShengCheng', yuanYin: canShu.jiaoSeId })
  return { chengGong: false }
}

const YanHuaZhengJuQianZhui = 'tou_xiang_yan_hua_zheng_ju:'

function 演化证据键(jiaoSeId: string): string {
  return `${YanHuaZhengJuQianZhui}${jiaoSeId}`
}

export async function 记录头像演化证据(
  jiaoSeId: string,
  laiYuan: string,
): Promise<boolean> {
  try {
    const jian = 演化证据键(jiaoSeId)
    const yiYou = await redis.lrange(jian, 0, -1)
    if (yiYou.includes(laiYuan)) return false
    await redis.lpush(jian, laiYuan)
    await redis.ltrim(jian, 0, 9)
    await redis.expire(jian, TouXiangPeiZhi.yanHuaZhengJuTtlMiao)
    const quChong = await redis.lrange(jian, 0, -1)
    return quChong.length >= TouXiangPeiZhi.yanHuaZhengJuMenDian
  } catch {
    return false
  }
}

export async function 尝试头像演化(canShu: {
  用户ID: string
  jiaoSeId: string
  laiYuan: string
  guanXiYueQian?: boolean
}): Promise<boolean> {
  const yanHuaShangXian = 2
  const yiYouVersion = await 数据库.query(`SELECT COALESCE("头像版本", 0) AS v FROM "角色" WHERE "ID" = $1 LIMIT 1`, [canShu.jiaoSeId])
  if (Number(yiYouVersion.rows[0]?.v || 0) >= yanHuaShangXian) {
    debug日志.info('头像生成', '头像演化已达硬上限，跳过', { xiang_qing: { jiao_se_id: canShu.jiaoSeId, yan_hua_shang_xian: yanHuaShangXian } })
    return false
  }
  const jiaoSeHang = await 数据库.query(
    `SELECT "用户ID", "年龄", "性别", "MBTI", "性格", "预设类型", "外貌", "爱好", "头像描述", "情绪基调", "当前心情", "心情强度", "头像版本" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [canShu.jiaoSeId],
  )
  const hang = jiaoSeHang.rows[0] as Record<string, unknown> | undefined
  if (!hang) return false

  const xinQing = String(hang['当前心情'] || '')
  const qiangDu = Number(hang['心情强度']) || 0
  const chuFa = 判断演化出发(xinQing, qiangDu, canShu.laiYuan, canShu.guanXiYueQian === true)
  if (!chuFa) return false

  const dangQianJiDiao = (typeof hang['情绪基调'] === 'string' && hang['情绪基调'] !== ''
    ? (hang['情绪基调'] as QingXuJiDiao)
    : 推导情绪基调(String(hang['性格'] || '')))
  const muBiaoJiDiao = 心情到基调(xinQing, dangQianJiDiao)
  if (muBiaoJiDiao === dangQianJiDiao) return false

  const xiHao = Array.isArray(hang['爱好']) ? (hang['爱好'] as string[]) : []
  const xuanZe = 选择头像风格({
    nianLing: Number(hang['年龄']) || 20,
    mbti: String(hang['MBTI'] || ''),
    shenFen: String(hang['预设类型'] || ''),
    xiHao,
    zhongZi: `${canShu.jiaoSeId}-${muBiaoJiDiao}`,
    jiDiao: muBiaoJiDiao,
  })
  if (!xuanZe) return false

  const zuZhuang = 组装头像提示词(xuanZe, {
    nianLing: Number(hang['年龄']) || 20,
    xingBie: String(hang['性别'] || 'nv'),
    waiMao: String(hang['外貌'] || ''),
    xiHao,
  })

  await 等待生成队列()
  const jieGuo = await diaoYongShengTuJieKou({
    tiShiCi: zuZhuang.prompt,
    fuMianTiShiCi: zuZhuang.negativePrompt,
    tuXiangChiCun: TouXiangPeiZhi.tuXiangChiCun,
  })
  if (!jieGuo.cheng_gong || !jieGuo.tuPianZiJie) return false

  const caiJian = 裁掉PNG底部(jieGuo.tuPianZiJie, TouXiangPeiZhi.caiDiBuBiLi)
  const cunChu = await liuShiBaoCunMeiTi(
    Readable.from(caiJian),
    `touxiang-yanhua-${canShu.jiaoSeId}-${Date.now()}.png`,
    'image/png',
    'tupian',
    canShu.用户ID,
  )
  const yinYong = shengChengMeiTiYinYong(cunChu.sha256)
  await 数据库.query(`UPDATE "角色" SET "头像" = $1, "头像描述" = $2, "情绪基调" = $3, "头像版本" = COALESCE("头像版本", 0) + 1, "头像变更时间" = NOW() WHERE "ID" = $4`, [
    yinYong,
    zuZhuang.miaoShu,
    muBiaoJiDiao,
    canShu.jiaoSeId,
  ])
  debug日志.info('头像生成', '头像已随心情演化', {
    xiang_qing: { jiao_se_id: canShu.jiaoSeId, xin_ji_diao: muBiaoJiDiao, xin_qing: xinQing, qiang_du: qiangDu, lai_yuan: canShu.laiYuan },
  })
  return true
}

const XinQingJiDiaoYingShe: Record<string, QingXuJiDiao> = {
  开心: '明朗',
  甜蜜: '明朗',
  愉悦: '明朗',
  期待: '明朗',
  心动: '明朗',
  平静: '平静',
  好奇: '平静',
  疲惫: '平静',
  烦躁: '阴郁',
  难过: '阴郁',
  委屈: '阴郁',
  生气: '阴郁',
  冷淡: '阴郁',
  焦虑: '阴郁',
}

export function 判断演化出发(xinQing: string, qiangDu: number, 来源: string, 关系跃迁 = false): boolean {
  if (关系跃迁) return true
  if (xinQing === '') return false
  if (qiangDu < 60) return false
  return true
}

export function 心情到基调(xinQing: string, dangQian: QingXuJiDiao): QingXuJiDiao {
  const muBiao = XinQingJiDiaoYingShe[xinQing]
  if (!muBiao) return dangQian
  return muBiao
}
