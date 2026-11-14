import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { debug日志 } from '../utils/debug日志'
import {
  BiaoQingAnPeiJsonHouZhui,
  BiaoQingBaoMuLuHuanJingBianLiang,
  BiaoQingBaoMuLuMing,
  BiaoQingBaoMuLuShangXunCengShu,
  BiaoQingDaiDaBiao,
  BiaoQingDuanMingZuiDaChang,
  BiaoQingFengGeBiaoQian,
  BiaoQingGuanXiJieDuanShunXu,
  BiaoQingMiaoShuZuiDaChang,
  BiaoQingMiDu,
  BiaoQingMimeYingShe,
  BiaoQingMoRenFengGe,
  BiaoQingMoRenMime,
  BiaoQingShiYongChangJingZuiDaChang,
  BiaoQingTuPianHouZhui,
  BiaoQingYunXingBiaoQian,
  BiaoQingZaiTiPeiZhi,
  BiaoQingZuiDaWenJianZiJie,
} from '../config/表情包配置'

export interface BiaoQingGuoLv {
  yunXuFengGe: readonly string[]
  guanXiJieDuanXuHao: number
}

export interface BiaoQingKuTiaoMu {
  duanMing: string
  miaoShu: string
  qingXuBiaoQian: string
  shiYongChangJing: string
  qiYong: boolean
  fengGe?: string
  guanXiJieDuanXiaXian?: number
  sha256: string
  mime: string
  ziJieShu: number
  wenJianMing: string
  wenJianLuJing: string
}

interface BiaoQingBiaoZhu {
  duanMing: string
  miaoShu: string
  qingXuBiaoQian: string
  shiYongChangJing: string
  qiYong: boolean
  fengGe: string
  guanXiJieDuanXiaXian: number
}

interface KuKuaiZhao {
  zhiWen: string
  tuPianWenJianMing: string[]
}

interface DaiRuTiaoMu {
  wenJianMing: string
  tiaoMu: BiaoQingKuTiaoMu
}

const RiZhiLeiXing = '表情包库'

export const BiaoQingKuZuiDuanBiDuiJianGeHuanJingBianLiang =
  'BIAO_QING_BAO_KU_ZUI_DUAN_BI_DUI_JIAN_GE_HAO_MIAO'

export const BiaoQingKuZuiDuanBiDuiJianGeMoRenHaoMiao = 2000

export const BiaoQingKuZuiDuanBiDuiJianGeZuiXiaoHaoMiao = 0

export const BiaoQingKuZuiDuanBiDuiJianGeZuiDaHaoMiao = 60000

export const BiaoQingKuDuanMingJinZhiZiFu: readonly string[] = ['[', ']', '【', '】', ':', '：']

export const BiaoQingKuKongZhiZiFuZhengZe = /[\u0000-\u001f\u007f]/

export const BiaoQingKuLianXuKongBaiZhengZe = /\s+/gu

export const BiaoQingKuTanCeHuanCunHuanJingBianLiang = 'BIAO_QING_BAO_TAN_CE_HUAN_CUN_HAO_MIAO'

export const BiaoQingKuTanCeHuanCunMoRenHaoMiao = 30000

export const BiaoQingKuTanCeHuanCunZuiXiaoHaoMiao = 0

export const BiaoQingKuTanCeHuanCunZuiDaHaoMiao = 600000

export function quTanCeHuanCunHaoMiao(): number {
  const yuanZhi = (process.env[BiaoQingKuTanCeHuanCunHuanJingBianLiang] || '').trim()
  if (yuanZhi === '') return BiaoQingKuTanCeHuanCunMoRenHaoMiao
  const shuZhi = Number(yuanZhi)
  if (!Number.isFinite(shuZhi)) return BiaoQingKuTanCeHuanCunMoRenHaoMiao
  const quZheng = Math.trunc(shuZhi)
  if (quZheng < BiaoQingKuTanCeHuanCunZuiXiaoHaoMiao) {
    return BiaoQingKuTanCeHuanCunZuiXiaoHaoMiao
  }
  if (quZheng > BiaoQingKuTanCeHuanCunZuiDaHaoMiao) {
    return BiaoQingKuTanCeHuanCunZuiDaHaoMiao
  }
  return quZheng
}

let duanMingSuoYin = new Map<string, BiaoQingKuTiaoMu>()

let sha256SuoYin = new Map<string, BiaoQingKuTiaoMu>()

let shangCiMuLu = ''

let shangCiZhiWen: string | null = null

let shangCiBiDuiShiJian = 0

let yiSaoMiaoGuo = false

let paiDuiZhong: Promise<number> | null = null

let tanCeHuanCun: { luJing: string; shiJian: number } | null = null

let shiQiDongQiBaoBiaoQingKu = false

function sheZhiShiQiDongQiBaoBiaoQingKu(): void {
  shiQiDongQiBaoBiaoQingKu = true
}

export function chongZhiTanCeHuanCun(): void {
  tanCeHuanCun = null
}

function shiFouWeiMuLu(luJing: string): boolean {
  try {
    return fs.statSync(luJing).isDirectory()
  } catch {
    return false
  }
}

function tanCeMuLuLuJingLieBiao(): string[] {
  const huanJingLuJing = (process.env[BiaoQingBaoMuLuHuanJingBianLiang] || '').trim()
  if (huanJingLuJing !== '') return [path.resolve(huanJingLuJing)]
  const luJingLieBiao: string[] = []
  for (const qiDian of [process.cwd(), __dirname]) {
    let dangQian = path.resolve(qiDian)
    for (let ceng = 0; ceng <= BiaoQingBaoMuLuShangXunCengShu; ceng += 1) {
      luJingLieBiao.push(path.join(dangQian, BiaoQingBaoMuLuMing))
      const shangJi = path.dirname(dangQian)
      if (shangJi === dangQian) break
      dangQian = shangJi
    }
  }
  return luJingLieBiao
}

function tanCeMuLu(): string {
  const huanJingLuJing = (process.env[BiaoQingBaoMuLuHuanJingBianLiang] || '').trim()
  if (huanJingLuJing !== '') return path.resolve(huanJingLuJing)
  const huanCunHaoMiao = quTanCeHuanCunHaoMiao()
  const xianZai = Date.now()
  if (tanCeHuanCun !== null && xianZai - tanCeHuanCun.shiJian < huanCunHaoMiao) {
    return tanCeHuanCun.luJing
  }
  for (const qiDian of [process.cwd(), __dirname]) {
    let dangQian = path.resolve(qiDian)
    for (let ceng = 0; ceng <= BiaoQingBaoMuLuShangXunCengShu; ceng += 1) {
      const houXuan = path.join(dangQian, BiaoQingBaoMuLuMing)
      if (shiFouWeiMuLu(houXuan)) {
        tanCeHuanCun = { luJing: houXuan, shiJian: xianZai }
        return houXuan
      }
      const shangJi = path.dirname(dangQian)
      if (shangJi === dangQian) break
      dangQian = shangJi
    }
  }
  return ''
}

function quMuLuMing(muLu: string): string {
  if (muLu === '') return BiaoQingBaoMuLuMing
  const mingCheng = path.basename(muLu)
  return mingCheng === '' ? BiaoQingBaoMuLuMing : mingCheng
}

export function quZuiDuanBiDuiJianGeHaoMiao(): number {
  const yuanZhi = (process.env[BiaoQingKuZuiDuanBiDuiJianGeHuanJingBianLiang] || '').trim()
  if (yuanZhi === '') return BiaoQingKuZuiDuanBiDuiJianGeMoRenHaoMiao
  const shuZhi = Number(yuanZhi)
  if (!Number.isFinite(shuZhi)) return BiaoQingKuZuiDuanBiDuiJianGeMoRenHaoMiao
  const quZheng = Math.trunc(shuZhi)
  if (quZheng < BiaoQingKuZuiDuanBiDuiJianGeZuiXiaoHaoMiao) {
    return BiaoQingKuZuiDuanBiDuiJianGeZuiXiaoHaoMiao
  }
  if (quZheng > BiaoQingKuZuiDuanBiDuiJianGeZuiDaHaoMiao) {
    return BiaoQingKuZuiDuanBiDuiJianGeZuiDaHaoMiao
  }
  return quZheng
}

export function heFaDuanMing(duanMing: string): boolean {
  if (typeof duanMing !== 'string') return false
  const jianHua = duanMing.trim()
  if (jianHua === '') return false
  if (jianHua.length > BiaoQingDuanMingZuiDaChang) return false
  if (BiaoQingKuKongZhiZiFuZhengZe.test(jianHua)) return false
  return !BiaoQingKuDuanMingJinZhiZiFu.some((ziFu) => jianHua.includes(ziFu))
}

function quZhuMing(wenJianMing: string): string {
  const dian = wenJianMing.lastIndexOf('.')
  if (dian <= 0) return wenJianMing
  return wenJianMing.slice(0, dian)
}

function quTuPianHouZhui(wenJianMing: string): string | null {
  const dian = wenJianMing.lastIndexOf('.')
  if (dian <= 0) return null
  const houZhui = wenJianMing.slice(dian).toLowerCase()
  if (!BiaoQingTuPianHouZhui.includes(houZhui)) return null
  return houZhui
}

function shiFouXuYaoJiWen(wenJianMing: string): boolean {
  if (quTuPianHouZhui(wenJianMing) !== null) return true
  return wenJianMing.toLowerCase().endsWith(BiaoQingAnPeiJsonHouZhui)
}

function biJiaoWenJianMing(jia: string, yi: string): number {
  if (jia < yi) return -1
  if (jia > yi) return 1
  return 0
}

async function duQuKuaiZhao(muLu: string): Promise<KuKuaiZhao | null> {
  if (muLu === '') return null
  try {
    const muLuZhuangTai = await fs.promises.stat(muLu)
    if (!muLuZhuangTai.isDirectory()) return null
    const xiangMuLieBiao = await fs.promises.readdir(muLu, { withFileTypes: true })
    const wenJianMingLieBiao = xiangMuLieBiao
      .filter((xiang) => xiang.isFile())
      .map((xiang) => xiang.name)
      .sort(biJiaoWenJianMing)
    const zhiWenBuFenLieBiao: string[] = [String(muLuZhuangTai.mtimeMs)]
    for (const wenJianMing of wenJianMingLieBiao) {
      if (!shiFouXuYaoJiWen(wenJianMing)) continue
      try {
        const zhuangTai = await fs.promises.stat(path.join(muLu, wenJianMing))
        zhiWenBuFenLieBiao.push(JSON.stringify([wenJianMing, zhuangTai.size, zhuangTai.mtimeMs]))
      } catch {
        zhiWenBuFenLieBiao.push(JSON.stringify([wenJianMing, null, null]))
      }
    }
    return {
      zhiWen: zhiWenBuFenLieBiao.join('\n'),
      tuPianWenJianMing: wenJianMingLieBiao.filter((ming) => quTuPianHouZhui(ming) !== null),
    }
  } catch (cuoWu) {
    debug日志.debug(RiZhiLeiXing, '表情包目录比对失败，本轮无法判断新鲜度', {
      xiang_qing: { mu_lu_ming: quMuLuMing(muLu), cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return null
  }
}

function quZiDuanYuanWen(
  duiXiang: Record<string, unknown>,
  ziDuan: string,
  wenJianMing: string,
): string {
  const yuanZhi = duiXiang[ziDuan]
  if (yuanZhi === undefined || yuanZhi === null) return ''
  if (typeof yuanZhi !== 'string') {
    debug日志.warn(RiZhiLeiXing, '标注字段类型非法，已按空值兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing, zi_duan: ziDuan },
    })
    return ''
  }
  return yuanZhi
}

function jieDuanWenBen(
  wenBen: string,
  ziDuan: string,
  zuiDaChang: number,
  wenJianMing: string,
): string {
  if (wenBen.length > zuiDaChang) {
    debug日志.warn(RiZhiLeiXing, '标注字段超长，已截断', {
      xiang_qing: { wen_jian_ming: wenJianMing, zi_duan: ziDuan, yuan_chang: wenBen.length, shang_xian: zuiDaChang },
    })
    return wenBen.slice(0, zuiDaChang)
  }
  return wenBen
}

function yaPingKongBai(wenBen: string): string {
  return wenBen.replace(BiaoQingKuLianXuKongBaiZhengZe, ' ').trim()
}

function quZiDuanWenBen(
  duiXiang: Record<string, unknown>,
  ziDuan: string,
  zuiDaChang: number,
  wenJianMing: string,
): string {
  const yuanWen = quZiDuanYuanWen(duiXiang, ziDuan, wenJianMing)
  return jieDuanWenBen(yuanWen.trim(), ziDuan, zuiDaChang, wenJianMing)
}

function quYaPingZiDuanWenBen(
  duiXiang: Record<string, unknown>,
  ziDuan: string,
  zuiDaChang: number,
  wenJianMing: string,
): string {
  const yuanWen = quZiDuanYuanWen(duiXiang, ziDuan, wenJianMing)
  return jieDuanWenBen(yaPingKongBai(yuanWen), ziDuan, zuiDaChang, wenJianMing)
}

function quLaiYuanDuanMing(
  duiXiang: Record<string, unknown>,
  wenJianMing: string,
): string | null {
  const yuanZhi = duiXiang['短名']
  if (yuanZhi === undefined || yuanZhi === null) {
    debug日志.warn(RiZhiLeiXing, '短名缺失，该条目不入索引', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return null
  }
  if (typeof yuanZhi !== 'string') {
    debug日志.warn(RiZhiLeiXing, '短名类型非法，该条目不入索引', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return null
  }
  const jianHua = yuanZhi.trim()
  if (jianHua === '') {
    debug日志.warn(RiZhiLeiXing, '短名为空，该条目不入索引', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return null
  }
  const caiJian = jieDuanWenBen(jianHua, '短名', BiaoQingDuanMingZuiDaChang, wenJianMing)
  if (!heFaDuanMing(caiJian)) {
    debug日志.warn(RiZhiLeiXing, '短名含非法字符，该条目不入索引', {
      xiang_qing: { wen_jian_ming: wenJianMing, duan_ming_chang_du: caiJian.length },
    })
    return null
  }
  return caiJian
}

function jieDuanYuanDaoXuHao(yuanZhi: string, wenJianMing: string): number {
  const jianHua = yuanZhi.trim()
  if (jianHua === '') return 0
  const zhongWenMing = BiaoQingMiDu.guanXiJieDuanZhongWenMing as Record<string, string>
  const jian = zhongWenMing[jianHua] ?? jianHua
  const xuHao = BiaoQingGuanXiJieDuanShunXu.indexOf(jian)
  if (xuHao >= 0) return xuHao
  debug日志.warn(RiZhiLeiXing, '关系阶段下限不在白名单，按最严阶段处理', {
    xiang_qing: { wen_jian_ming: wenJianMing },
  })
  return BiaoQingGuanXiJieDuanShunXu.length - 1
}

function moRenBiaoZhu(moRenDuanMing: string): BiaoQingBiaoZhu {
  return {
    duanMing: moRenDuanMing,
    miaoShu: '',
    qingXuBiaoQian: BiaoQingDaiDaBiao,
    shiYongChangJing: '',
    qiYong: true,
    fengGe: BiaoQingMoRenFengGe,
    guanXiJieDuanXiaXian: 0,
  }
}

function yongWenJianMingBiaoZhu(
  moRenDuanMing: string,
  wenJianMing: string,
): BiaoQingBiaoZhu | null {
  const jianHua = moRenDuanMing.trim()
  const caiJian = jieDuanWenBen(jianHua, '短名', BiaoQingDuanMingZuiDaChang, wenJianMing)
  if (!heFaDuanMing(caiJian)) {
    debug日志.warn(RiZhiLeiXing, '缺标注且文件名也不能当短名，该条目不入索引', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return null
  }
  return moRenBiaoZhu(caiJian)
}

async function duQuBiaoZhu(
  muLu: string,
  wenJianMing: string,
  moRenDuanMing: string,
): Promise<BiaoQingBiaoZhu | null> {
  const jsonLuJing = path.join(muLu, `${quZhuMing(wenJianMing)}${BiaoQingAnPeiJsonHouZhui}`)
  if (!fs.existsSync(jsonLuJing)) {
    debug日志.warn(RiZhiLeiXing, '缺少同名标注文件，用文件名兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return yongWenJianMingBiaoZhu(moRenDuanMing, wenJianMing)
  }
  let yuanWenBen = ''
  try {
    yuanWenBen = await fs.promises.readFile(jsonLuJing, 'utf8')
  } catch (cuoWu) {
    debug日志.warn(RiZhiLeiXing, '标注文件读取失败，用文件名兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing, cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return yongWenJianMingBiaoZhu(moRenDuanMing, wenJianMing)
  }
  let jieXi: unknown
  try {
    jieXi = JSON.parse(yuanWenBen)
  } catch {
    debug日志.warn(RiZhiLeiXing, '标注文件不是合法 JSON，用文件名兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return yongWenJianMingBiaoZhu(moRenDuanMing, wenJianMing)
  }
  if (jieXi === null || typeof jieXi !== 'object' || Array.isArray(jieXi)) {
    debug日志.warn(RiZhiLeiXing, '标注文件顶层不是对象，用文件名兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return yongWenJianMingBiaoZhu(moRenDuanMing, wenJianMing)
  }
  const duiXiang = jieXi as Record<string, unknown>
  const duanMing = quLaiYuanDuanMing(duiXiang, wenJianMing)
  if (duanMing === null) return null
  const qingXuYuan = quZiDuanWenBen(duiXiang, '情绪标签', BiaoQingDuanMingZuiDaChang, wenJianMing)
  const qingXuHeFa = BiaoQingYunXingBiaoQian.includes(qingXuYuan)
  if (!qingXuHeFa && qingXuYuan !== '') {
    debug日志.warn(RiZhiLeiXing, '情绪标签不在白名单，归为待打标', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
  }
  const qiYongYuan = duiXiang['启用']
  let qiYong = true
  if (qiYongYuan !== undefined && qiYongYuan !== null) {
    if (typeof qiYongYuan === 'boolean') {
      qiYong = qiYongYuan
    } else {
      debug日志.warn(RiZhiLeiXing, '启用字段非布尔，按默认启用处理', {
        xiang_qing: { wen_jian_ming: wenJianMing },
      })
    }
  }
  const fengGeYuan = quZiDuanWenBen(duiXiang, '风格', BiaoQingZaiTiPeiZhi.fengGeZuiDaChang, wenJianMing).trim()
  const fengGeHeFa = BiaoQingFengGeBiaoQian.includes(fengGeYuan)
  if (!fengGeHeFa && fengGeYuan !== '') {
    debug日志.warn(RiZhiLeiXing, '风格不在白名单，按默认风格处理', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
  }
  const jieDuanYuan = quZiDuanWenBen(
    duiXiang,
    '关系阶段下限',
    BiaoQingZaiTiPeiZhi.jieDuanZuiDaChang,
    wenJianMing,
  )
  return {
    duanMing,
    miaoShu: quYaPingZiDuanWenBen(duiXiang, '描述', BiaoQingMiaoShuZuiDaChang, wenJianMing),
    qingXuBiaoQian: qingXuHeFa ? qingXuYuan : BiaoQingDaiDaBiao,
    shiYongChangJing: quYaPingZiDuanWenBen(
      duiXiang,
      '适用场景',
      BiaoQingShiYongChangJingZuiDaChang,
      wenJianMing,
    ),
    qiYong,
    fengGe: fengGeHeFa ? fengGeYuan : BiaoQingMoRenFengGe,
    guanXiJieDuanXiaXian: jieDuanYuanDaoXuHao(jieDuanYuan, wenJianMing),
  }
}

async function suoYinDanWenJian(
  muLu: string,
  wenJianMing: string,
  houZhui: string,
): Promise<BiaoQingKuTiaoMu | null> {
  const wenJianLuJing = path.join(muLu, wenJianMing)
  const zhuangTai = await fs.promises.stat(wenJianLuJing)
  if (zhuangTai.size <= 0 || zhuangTai.size > BiaoQingZuiDaWenJianZiJie) {
    debug日志.warn(RiZhiLeiXing, '文件为空或超出大小上限，已跳过', {
      xiang_qing: {
        wen_jian_ming: wenJianMing,
        zi_jie_shu: zhuangTai.size,
        shang_xian: BiaoQingZuiDaWenJianZiJie,
      },
    })
    return null
  }
  const neiRong = await fs.promises.readFile(wenJianLuJing)
  if (neiRong.length <= 0 || neiRong.length > BiaoQingZuiDaWenJianZiJie) {
    debug日志.warn(RiZhiLeiXing, '文件读取结果为空或超出大小上限，已跳过', {
      xiang_qing: { wen_jian_ming: wenJianMing, zi_jie_shu: neiRong.length },
    })
    return null
  }
  const biaoZhu = await duQuBiaoZhu(muLu, wenJianMing, quZhuMing(wenJianMing))
  if (biaoZhu === null) return null
  return {
    duanMing: biaoZhu.duanMing,
    miaoShu: biaoZhu.miaoShu,
    qingXuBiaoQian: biaoZhu.qingXuBiaoQian,
    shiYongChangJing: biaoZhu.shiYongChangJing,
    qiYong: biaoZhu.qiYong,
    fengGe: biaoZhu.fengGe,
    guanXiJieDuanXiaXian: biaoZhu.guanXiJieDuanXiaXian,
    sha256: createHash('sha256').update(neiRong).digest('hex'),
    mime: BiaoQingMimeYingShe[houZhui] || BiaoQingMoRenMime,
    ziJieShu: neiRong.length,
    wenJianMing,
    wenJianLuJing,
  }
}

function guiDangAnduanMing(
  houXuanLieBiao: DaiRuTiaoMu[],
): { duanMingSuoYin: Map<string, BiaoQingKuTiaoMu>; sha256SuoYin: Map<string, BiaoQingKuTiaoMu> } {
  const anDuanMingFenZu = new Map<string, DaiRuTiaoMu[]>()
  for (const houXuan of houXuanLieBiao) {
    const yiYou = anDuanMingFenZu.get(houXuan.tiaoMu.duanMing)
    if (yiYou) {
      yiYou.push(houXuan)
    } else {
      anDuanMingFenZu.set(houXuan.tiaoMu.duanMing, [houXuan])
    }
  }
  const xinDuanMing = new Map<string, BiaoQingKuTiaoMu>()
  const xinSha = new Map<string, BiaoQingKuTiaoMu>()
  for (const [duanMing, lieBiao] of anDuanMingFenZu) {
    if (lieBiao.length > 1) {
      debug日志.warn(RiZhiLeiXing, '短名重复，该短名的全部条目都不入索引', {
        xiang_qing: {
          duan_ming: duanMing,
          chong_tu_shu: lieBiao.length,
          wen_jian_ming_lie_biao: lieBiao.map((xiang) => xiang.wenJianMing),
        },
      })
      continue
    }
    const danTiao = lieBiao[0].tiaoMu
    xinDuanMing.set(duanMing, danTiao)
    if (!xinSha.has(danTiao.sha256)) xinSha.set(danTiao.sha256, danTiao)
  }
  return { duanMingSuoYin: xinDuanMing, sha256SuoYin: xinSha }
}

async function zhiXingSaoMiao(muLu: string, kuaiZhao: KuKuaiZhao | null): Promise<number> {
  const houXuanLieBiao: DaiRuTiaoMu[] = []
  if (muLu === '') {
    const tanCeLieBiao = tanCeMuLuLuJingLieBiao()
    if (shiQiDongQiBaoBiaoQingKu) {
      debug日志.error(RiZhiLeiXing, '启动时未找到表情包目录，表情包库为空', {
        xiang_qing: {
          huan_jing_bian_liang: BiaoQingBaoMuLuHuanJingBianLiang,
          mu_lu_ming: BiaoQingBaoMuLuMing,
          tan_ce_lu_jing: tanCeLieBiao,
          shi_qi_dong: true,
        },
      })
    } else {
      debug日志.warn(RiZhiLeiXing, '未找到表情包目录，索引为空', {
        xiang_qing: {
          huan_jing_bian_liang: BiaoQingBaoMuLuHuanJingBianLiang,
          mu_lu_ming: BiaoQingBaoMuLuMing,
          tan_ce_lu_jing: tanCeLieBiao,
        },
      })
    }
  } else if (kuaiZhao === null) {
    debug日志.warn(RiZhiLeiXing, '表情包目录读取失败，索引为空', {
      xiang_qing: { mu_lu_ming: quMuLuMing(muLu) },
    })
  } else {
    for (const wenJianMing of kuaiZhao.tuPianWenJianMing) {
      const houZhui = quTuPianHouZhui(wenJianMing)
      if (houZhui === null) continue
      try {
        const tiaoMu = await suoYinDanWenJian(muLu, wenJianMing, houZhui)
        if (tiaoMu !== null) houXuanLieBiao.push({ wenJianMing, tiaoMu })
      } catch (cuoWu) {
        debug日志.warn(RiZhiLeiXing, '单文件索引失败，已跳过', {
          xiang_qing: { wen_jian_ming: wenJianMing, cuo_wu: String(cuoWu).slice(0, 200) },
        })
      }
    }
  }
  const guiDang = guiDangAnduanMing(houXuanLieBiao)
  duanMingSuoYin = guiDang.duanMingSuoYin
  sha256SuoYin = guiDang.sha256SuoYin
  shangCiMuLu = muLu
  shangCiZhiWen = kuaiZhao === null ? null : kuaiZhao.zhiWen
  shangCiBiDuiShiJian = Date.now()
  yiSaoMiaoGuo = true
  debug日志.info(RiZhiLeiXing, '表情包索引扫描完成', {
    xiang_qing: {
      mu_lu_ming: quMuLuMing(muLu),
      ming_zhong: duanMingSuoYin.size > 0,
      tiao_mu_shu: duanMingSuoYin.size,
    },
  })
  return duanMingSuoYin.size
}

function yunXingPaiDui(zhiXing: () => Promise<number>): Promise<number> {
  if (paiDuiZhong) return paiDuiZhong
  const renWu = zhiXing()
  paiDuiZhong = renWu
  renWu.then(
    () => {
      if (paiDuiZhong === renWu) paiDuiZhong = null
    },
    () => {
      if (paiDuiZhong === renWu) paiDuiZhong = null
    },
  )
  return renWu
}

export function dangQianMuLuLuJing(): string {
  return tanCeMuLu()
}

export async function zhongXinSaoMiao(): Promise<number> {
  return yunXingPaiDui(async () => {
    const muLu = tanCeMuLu()
    const kuaiZhao = await duQuKuaiZhao(muLu)
    return zhiXingSaoMiao(muLu, kuaiZhao)
  })
}

export async function chuShiHuaBiaoQingKu(): Promise<number> {
  sheZhiShiQiDongQiBaoBiaoQingKu()
  return zhongXinSaoMiao()
}

export async function queBaoZuiXin(): Promise<number> {
  return yunXingPaiDui(async () => {
    const muLu = tanCeMuLu()
    const jianGe = quZuiDuanBiDuiJianGeHaoMiao()
    if (yiSaoMiaoGuo && muLu === shangCiMuLu && jianGe > 0 && Date.now() - shangCiBiDuiShiJian < jianGe) {
      return duanMingSuoYin.size
    }
    const kuaiZhao = await duQuKuaiZhao(muLu)
    const zhiWen = kuaiZhao === null ? null : kuaiZhao.zhiWen
    if (yiSaoMiaoGuo && muLu === shangCiMuLu && zhiWen === shangCiZhiWen) {
      shangCiBiDuiShiJian = Date.now()
      return duanMingSuoYin.size
    }
    debug日志.debug(RiZhiLeiXing, '表情包目录指纹变化，重新扫描', {
      xiang_qing: {
        mu_lu_ming: quMuLuMing(muLu),
        shou_ci: !yiSaoMiaoGuo,
        huan_mu_lu: muLu !== shangCiMuLu,
      },
    })
    return zhiXingSaoMiao(muLu, kuaiZhao)
  })
}

function queZhengShu(shuLiang: number): number {
  if (typeof shuLiang !== 'number' || !Number.isFinite(shuLiang)) return 0
  const quZheng = Math.trunc(shuLiang)
  return quZheng > 0 ? quZheng : 0
}

function daLuan<T>(lieBiao: readonly T[]): T[] {
  const fuBen = [...lieBiao]
  for (let weiZhi = fuBen.length - 1; weiZhi > 0; weiZhi -= 1) {
    const jiaoHuanWei = Math.floor(Math.random() * (weiZhi + 1))
    const linShi = fuBen[weiZhi]
    fuBen[weiZhi] = fuBen[jiaoHuanWei]
    fuBen[jiaoHuanWei] = linShi
  }
  return fuBen
}

export async function quHouXuan(
  qingXuBiaoQian: string | null | undefined,
  shuLiang: number,
  guoLv?: BiaoQingGuoLv,
): Promise<BiaoQingKuTiaoMu[]> {
  await queBaoZuiXin()
  const yiBiaoQian = typeof qingXuBiaoQian === 'string' ? qingXuBiaoQian.trim() : ''
  const tiShu = queZhengShu(shuLiang)
  if (tiShu === 0) return []
  const qiYongLieBiao = [...duanMingSuoYin.values()].filter((tiaoMu) => tiaoMu.qiYong)
  const fuHeZaiTi = guoLv
    ? qiYongLieBiao.filter(
        (tiaoMu) =>
          guoLv.yunXuFengGe.includes(tiaoMu.fengGe ?? BiaoQingMoRenFengGe) &&
          (tiaoMu.guanXiJieDuanXiaXian ?? 0) <= guoLv.guanXiJieDuanXuHao,
      )
    : qiYongLieBiao
  const mingZhong =
    yiBiaoQian === ''
      ? fuHeZaiTi
      : fuHeZaiTi.filter(
          (tiaoMu) => tiaoMu.qingXuBiaoQian === yiBiaoQian || tiaoMu.shiYongChangJing.includes(yiBiaoQian),
        )
  if (guoLv) {
    debug日志.debug(RiZhiLeiXing, '候选已按人设与关系阶段筛选', {
      xiang_qing: {
        yuan_shu: qiYongLieBiao.length,
        fu_he_zai_ti: fuHeZaiTi.length,
        zui_zhong: mingZhong.length,
        yun_xu_feng_ge_shu: guoLv.yunXuFengGe.length,
        jie_duan_xu_hao: guoLv.guanXiJieDuanXuHao,
      },
    })
  }
  const daLuanHou = daLuan(mingZhong)
  return daLuanHou.slice(0, Math.min(tiShu, daLuanHou.length))
}

export function duanMingDaoUUID(duanMing: string): string {
  const yiJianHua = typeof duanMing === 'string' ? duanMing.trim() : ''
  const zhaiYao = createHash('sha256').update(yiJianHua, 'utf8').digest()
  const ziJie = Buffer.from(zhaiYao.subarray(0, 16))
  ziJie[6] = (ziJie[6] & 0x0f) | 0x40
  ziJie[8] = (ziJie[8] & 0x3f) | 0x80
  const shiLiuJinZhi = ziJie.toString('hex')
  return [
    shiLiuJinZhi.slice(0, 8),
    shiLiuJinZhi.slice(8, 12),
    shiLiuJinZhi.slice(12, 16),
    shiLiuJinZhi.slice(16, 20),
    shiLiuJinZhi.slice(20, 32),
  ].join('-')
}

export async function chaAnDuanMing(duanMing: string): Promise<BiaoQingKuTiaoMu | null> {
  if (typeof duanMing !== 'string') return null
  const jianHua = duanMing.trim()
  if (jianHua === '') return null
  await queBaoZuiXin()
  return duanMingSuoYin.get(jianHua) || null
}

export async function chaAnSha256(sha256: string): Promise<BiaoQingKuTiaoMu | null> {
  if (typeof sha256 !== 'string') return null
  const jianHua = sha256.trim().toLowerCase()
  if (jianHua === '') return null
  await queBaoZuiXin()
  return sha256SuoYin.get(jianHua) || null
}

export async function quQuanBuQiYong(): Promise<BiaoQingKuTiaoMu[]> {
  await queBaoZuiXin()
  return [...duanMingSuoYin.values()].filter((tiaoMu) => tiaoMu.qiYong)
}
