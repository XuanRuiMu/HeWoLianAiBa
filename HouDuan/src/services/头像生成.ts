import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Readable } from 'stream'
import { redis } from '../redis'
import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import { caiDiaoPNGDiBu } from '../utils/PNG裁剪'
import { 内部转展示 } from '../utils/性别'
import { diaoYongShengTuJieKou } from './图像生成'
import { liuShiBaoCunMeiTi, shengChengMeiTiYinYong } from './媒体存储'
import { paiRuZhongShiDuiLie } from './重试队列'
import {
  TOU_XIANG_PEI_ZHI,
  MBTI_QI_ZHI,
  JI_DIAO_QI_ZHI,
  tuiDaoQingXuJiDiao,
  qianJinJiDiao,
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

const FENG_GE_KU = jieXiJSON<{ 通用: { 构图约束: string; 通用负面词: string }; 风格: TouXiangFengGe[] }>(
  duQuJSON('头像风格库.json'),
  { 通用: { 构图约束: '', 通用负面词: '' }, 风格: [] },
)

const PI_PEI_GUI_ZE = jieXiJSON<TouXiangPiPeiGuiZe>(duQuJSON('头像匹配规则.json'), {
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
  for (const dang of PI_PEI_GUI_ZE.年龄档) {
    if (nianLing >= dang.最小年龄 && nianLing <= dang.最大年龄) return dang.档名
  }
  return '青年'
}

export function tuiDaoTouXiangQiZhi(mbti: string, xingGeWenBen?: string): TouXiangQiZhi {
  const congXingGe = xingGeWenBen ? tuiDaoQingXuJiDiao(xingGeWenBen) : null
  const congMbti = MBTI_QI_ZHI[mbti]
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

export function xuanZeTouXiangFengGe(canShu: {
  nianLing: number
  mbti: string
  xingGeWenBen?: string
  shenFen?: string
  xiHao?: string[]
  zhongZi: string
  yiYongFengGe?: string[]
  jiDiao?: QingXuJiDiao
}): TouXiangFengGeXuanZe | null {
  if (FENG_GE_KU.风格.length === 0) return null
  const nianLingDang = tuiDaoNianLingDang(canShu.nianLing)
  const qiZhi = canShu.jiDiao ? JI_DIAO_QI_ZHI[canShu.jiDiao] : tuiDaoTouXiangQiZhi(canShu.mbti, canShu.xingGeWenBen)
  const shenFen = canShu.shenFen ?? ''
  const xiHao = canShu.xiHao ?? []
  const yiYong = new Set(canShu.yiYongFengGe ?? [])

  const deFen = FENG_GE_KU.风格.map((fengGe) => {
    let zongFen = 0
    const nianLingJia = PI_PEI_GUI_ZE.年龄档.find((dang) => dang.档名 === nianLingDang)?.风格加分[fengGe.类别] ?? 0
    zongFen += nianLingJia
    zongFen += PI_PEI_GUI_ZE.气质加分[qiZhi]?.[fengGe.类别] ?? 0
    zongFen += PI_PEI_GUI_ZE.身份加分[shenFen]?.[fengGe.类别] ?? 0
    if (xiHao.some((hao) => fengGe.爱好线索.some((suo) => hao.includes(suo) || suo.includes(hao)))) {
      zongFen += PI_PEI_GUI_ZE.爱好命中加分
    }
    if (yiYong.has(fengGe.类别)) zongFen -= PI_PEI_GUI_ZE.避免重复.同批已用风格扣分
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

export function zuZhuangTouXiangTiShiCi(
  xuanZe: TouXiangFengGeXuanZe,
  canShu: { nianLing: number; xingBie: string; waiMao: string; xiHao?: string[] },
): TouXiangTiShiCiZuZhuang {
  const { fengGe, qiZhi, nianLingDang } = xuanZe
  const zhuanYi = PI_PEI_GUI_ZE.人物转译
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
  bufen.push(FENG_GE_KU.通用.构图约束)
  const prompt = bufen.filter((bu) => bu.trim() !== '').join('，')
  const negativePrompt = [FENG_GE_KU.通用.通用负面词, fengGe.专用负面词]
    .filter((bu) => bu.trim() !== '')
    .join(',')

  const miaoShu = `${fengGe.类别}风格头像，${zhuTi}`
  return { prompt, negativePrompt, miaoShu: miaoShu.slice(0, 60) }
}

async function dengDaiShengChengDuiLie(): Promise<void> {
  const jian = 'tou_xiang_sheng_cheng_dui_lie'
  for (let ciShu = 0; ciShu < TOU_XIANG_PEI_ZHI.zhengPianZuiDaChangShiCiShu + 3; ciShu++) {
    const deDao = await redis.set(jian, '1', 'PX', TOU_XIANG_PEI_ZHI.paiDuiJianGeHaoMiao, 'NX')
    if (deDao === 'OK' || deDao === 1 || deDao === true) return
    await new Promise((jieJue) => setTimeout(jieJue, Math.min(TOU_XIANG_PEI_ZHI.paiDuiJianGeHaoMiao, 2000)))
  }
}

export interface JiaoSeTouXiangJieGuo {
  chengGong: boolean
  touXiangMiaoShu?: string
  meiTiId?: string
  yinYong?: string
}

export async function shengChengJiaoSeTouXiang(canShu: {
  yongHuId: string
  jiaoSeId: string
  jiaoSe: Pick<ShengChengJiaoSeJieGuo, 'nian_ling' | 'xing_bie' | 'mbti_lei_xing' | 'shen_fen' | 'wai_mao' | 'xi_hao' | 'xing_ge'>
  jiDiao?: QingXuJiDiao
}): Promise<JiaoSeTouXiangJieGuo> {
  const xuanZe = xuanZeTouXiangFengGe({
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
  const zuZhuang = zuZhuangTouXiangTiShiCi(xuanZe, {
    nianLing: canShu.jiaoSe.nian_ling,
    xingBie: canShu.jiaoSe.xing_bie,
    waiMao: canShu.jiaoSe.wai_mao,
    xiHao: canShu.jiaoSe.xi_hao,
  })

  await dengDaiShengChengDuiLie()
  for (let ciShu = 0; ciShu < TOU_XIANG_PEI_ZHI.zhengPianZuiDaChangShiCiShu; ciShu++) {
    const jieGuo = await diaoYongShengTuJieKou({
      tiShiCi: zuZhuang.prompt,
      fuMianTiShiCi: zuZhuang.negativePrompt,
      tuXiangChiCun: TOU_XIANG_PEI_ZHI.tuXiangChiCun,
    })
    if (!jieGuo.cheng_gong || !jieGuo.tuPianZiJie) {
      debug日志.warn('头像生成', `正片第${ciShu + 1}次生成失败`, {
        xiang_qing: { jiao_se_id: canShu.jiaoSeId, ti_shi: jieGuo.ti_shi ?? '' },
      })
      continue
    }
    const caiJian = caiDiaoPNGDiBu(jieGuo.tuPianZiJie, TOU_XIANG_PEI_ZHI.caiDiBuBiLi)
    const cunChu = await liuShiBaoCunMeiTi(
      Readable.from(caiJian),
      `touxiang-${canShu.jiaoSeId}-${Date.now()}.png`,
      'image/png',
      'tupian',
      canShu.yongHuId,
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

const YAN_HUA_ZHENG_JU_QIAN_ZHUI = 'tou_xiang_yan_hua_zheng_ju:'

function yanHuaZhengJuJian(jiaoSeId: string): string {
  return `${YAN_HUA_ZHENG_JU_QIAN_ZHUI}${jiaoSeId}`
}

export async function jiLuTouXiangYanHuaZhengJu(
  jiaoSeId: string,
  laiYuan: string,
): Promise<boolean> {
  try {
    const jian = yanHuaZhengJuJian(jiaoSeId)
    const yiYou = await redis.lrange(jian, 0, -1)
    if (yiYou.includes(laiYuan)) return false
    await redis.lpush(jian, laiYuan)
    await redis.ltrim(jian, 0, 9)
    await redis.expire(jian, TOU_XIANG_PEI_ZHI.yanHuaZhengJuTtlMiao)
    const quChong = await redis.lrange(jian, 0, -1)
    return quChong.length >= TOU_XIANG_PEI_ZHI.yanHuaZhengJuMenDian
  } catch {
    return false
  }
}

function suiJiShu(): number {
  return Math.random()
}

export async function changShiTouXiangYanHua(canShu: {
  yongHuId: string
  jiaoSeId: string
  laiYuan: string
}): Promise<boolean> {
  const yingGaiChuFa = await jiLuTouXiangYanHuaZhengJu(canShu.jiaoSeId, canShu.laiYuan)
  if (!yingGaiChuFa) return false
  if (suiJiShu() >= TOU_XIANG_PEI_ZHI.yanHuaChuFaGaiLv) return false

  const jiaoSeHang = await 数据库.query(
    `SELECT "用户ID", "年龄", "性别", "MBTI", "性格", "身份", "外貌", "爱好", "头像描述", "情绪基调" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [canShu.jiaoSeId],
  )
  const hang = jiaoSeHang.rows[0] as Record<string, unknown> | undefined
  if (!hang) return false

  const dangQianJiDiao = (typeof hang['情绪基调'] === 'string' && hang['情绪基调'] !== ''
    ? (hang['情绪基调'] as QingXuJiDiao)
    : tuiDaoQingXuJiDiao(String(hang['性格'] || '')))
  const xinJiDiao = qianJinJiDiao(dangQianJiDiao)
  if (xinJiDiao === dangQianJiDiao) {
    await redis.del(yanHuaZhengJuJian(canShu.jiaoSeId))
    return false
  }

  const xiHao = Array.isArray(hang['爱好']) ? (hang['爱好'] as string[]) : []
  const xuanZe = xuanZeTouXiangFengGe({
    nianLing: Number(hang['年龄']) || 20,
    mbti: String(hang['MBTI'] || ''),
    shenFen: String(hang['身份'] || ''),
    xiHao,
    zhongZi: `${canShu.jiaoSeId}-${xinJiDiao}`,
    jiDiao: xinJiDiao,
  })
  if (!xuanZe) return false

  const zuZhuang = zuZhuangTouXiangTiShiCi(xuanZe, {
    nianLing: Number(hang['年龄']) || 20,
    xingBie: String(hang['性别'] || 'nv'),
    waiMao: String(hang['外貌'] || ''),
    xiHao,
  })

  await dengDaiShengChengDuiLie()
  const jieGuo = await diaoYongShengTuJieKou({
    tiShiCi: zuZhuang.prompt,
    fuMianTiShiCi: zuZhuang.negativePrompt,
    tuXiangChiCun: TOU_XIANG_PEI_ZHI.tuXiangChiCun,
  })
  if (!jieGuo.cheng_gong || !jieGuo.tuPianZiJie) return false

  const caiJian = caiDiaoPNGDiBu(jieGuo.tuPianZiJie, TOU_XIANG_PEI_ZHI.caiDiBuBiLi)
  const cunChu = await liuShiBaoCunMeiTi(
    Readable.from(caiJian),
    `touxiang-yanhua-${canShu.jiaoSeId}-${Date.now()}.png`,
    'image/png',
    'tupian',
    canShu.yongHuId,
  )
  const yinYong = shengChengMeiTiYinYong(cunChu.sha256)
  await 数据库.query(`UPDATE "角色" SET "头像" = $1, "头像描述" = $2, "情绪基调" = $3 WHERE "ID" = $4`, [
    yinYong,
    zuZhuang.miaoShu,
    xinJiDiao,
    canShu.jiaoSeId,
  ])
  await redis.del(yanHuaZhengJuJian(canShu.jiaoSeId))
  debug日志.info('头像生成', '头像已演化', {
    xiang_qing: { jiao_se_id: canShu.jiaoSeId, xin_ji_diao: xinJiDiao, lai_yuan: canShu.laiYuan },
  })
  return true
}
