import { 构建原生表情条目 } from './原生表情库'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { debug日志 } from '../utils/debug日志'
import {
  表情包标注Json后缀,
  表情包目录环境变量,
  表情包目录名,
  表情包目录上层层数,
  表情待打标,
  表情短名最大长,
  表情风格标签,
  表情关系阶段顺序,
  表情描述最大长,
  表情Mime映射,
  表情默认风格,
  表情默认Mime,
  表情适用场景最大长,
  表情图片后缀,
  表情运行标签,
  表情载体配置,
  表情最大文件字节,
} from '../config/表情包配置'

export interface 表情包过滤 {
  yunXuFengGe: readonly string[]
  guanXiJieDuanXuHao: number
}

export interface 表情包条目 {
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

interface 表情包标注 {
  duanMing: string
  miaoShu: string
  qingXuBiaoQian: string
  shiYongChangJing: string
  qiYong: boolean
  fengGe: string
  guanXiJieDuanXiaXian: number
}

interface 库快照 {
  zhiWen: string
  tuPianWenJianMing: string[]
}

interface 带入条目 {
  wenJianMing: string
  tiaoMu: 表情包条目
}

const 日志类型 = '表情包库'

export const 表情包最短比对间隔环境变量 =
  'BIAO_QING_BAO_KU_ZUI_DUAN_BI_DUI_JIAN_GE_HAO_MIAO'

export const 表情包最短比对间隔默认毫秒 = 2000

export const 表情包最短比对间隔最小毫秒 = 0

export const 表情包最短比对间隔最大毫秒 = 60000

export const 表情包短名禁制字符: readonly string[] = ['[', ']', '【', '】', ':', '：']

export const 表情包控制字符正则 = /[\u0000-\u001f\u007f]/

export const 表情包连续空白正则 = /\s+/gu

export const 表情包探测缓存环境变量 = 'BIAO_QING_BAO_TAN_CE_HUAN_CUN_HAO_MIAO'

export const 表情包探测缓存默认毫秒 = 30000

export const 表情包探测缓存最小毫秒 = 0

export const 表情包探测缓存最大毫秒 = 600000

export function 取探测缓存毫秒(): number {
  const 原值 = (process.env[表情包探测缓存环境变量] || '').trim()
  if (原值 === '') return 表情包探测缓存默认毫秒
  const 数值 = Number(原值)
  if (!Number.isFinite(数值)) return 表情包探测缓存默认毫秒
  const 取整 = Math.trunc(数值)
  if (取整 < 表情包探测缓存最小毫秒) {
    return 表情包探测缓存最小毫秒
  }
  if (取整 > 表情包探测缓存最大毫秒) {
    return 表情包探测缓存最大毫秒
  }
  return 取整
}

let 短名索引 = new Map<string, 表情包条目>()

let 哈希索引 = new Map<string, 表情包条目>()

let 上次目录 = ''

let shangCiZhiWen: string | null = null

let shangCiBiDuiShiJian = 0

let yiSaoMiaoGuo = false

let paiDuiZhong: Promise<number> | null = null

let tanCeHuanCun: { luJing: string; shiJian: number } | null = null

let shiQiDongQiBaoBiaoQingKu = false

function sheZhiShiQiDongQiBaoBiaoQingKu(): void {
  shiQiDongQiBaoBiaoQingKu = true
}

export function 重置探测缓存(): void {
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
  const huanJingLuJing = (process.env[表情包目录环境变量] || '').trim()
  if (huanJingLuJing !== '') return [path.resolve(huanJingLuJing)]
  const luJingLieBiao: string[] = []
  for (const qiDian of [process.cwd(), __dirname]) {
    let dangQian = path.resolve(qiDian)
    for (let ceng = 0; ceng <= 表情包目录上层层数; ceng += 1) {
      luJingLieBiao.push(path.join(dangQian, 表情包目录名))
      const shangJi = path.dirname(dangQian)
      if (shangJi === dangQian) break
      dangQian = shangJi
    }
  }
  return luJingLieBiao
}

function tanCeMuLu(): string {
  const huanJingLuJing = (process.env[表情包目录环境变量] || '').trim()
  if (huanJingLuJing !== '') return path.resolve(huanJingLuJing)
  const huanCunHaoMiao = 取探测缓存毫秒()
  const xianZai = Date.now()
  if (tanCeHuanCun !== null && xianZai - tanCeHuanCun.shiJian < huanCunHaoMiao) {
    return tanCeHuanCun.luJing
  }
  for (const qiDian of [process.cwd(), __dirname]) {
    let dangQian = path.resolve(qiDian)
    for (let ceng = 0; ceng <= 表情包目录上层层数; ceng += 1) {
      const houXuan = path.join(dangQian, 表情包目录名)
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
  if (muLu === '') return 表情包目录名
  const mingCheng = path.basename(muLu)
  return mingCheng === '' ? 表情包目录名 : mingCheng
}

export function 取最短比对间隔毫秒(): number {
  const 原值 = (process.env[表情包最短比对间隔环境变量] || '').trim()
  if (原值 === '') return 表情包最短比对间隔默认毫秒
  const 数值 = Number(原值)
  if (!Number.isFinite(数值)) return 表情包最短比对间隔默认毫秒
  const 取整 = Math.trunc(数值)
  if (取整 < 表情包最短比对间隔最小毫秒) {
    return 表情包最短比对间隔最小毫秒
  }
  if (取整 > 表情包最短比对间隔最大毫秒) {
    return 表情包最短比对间隔最大毫秒
  }
  return 取整
}

export function 合法短名(duanMing: string): boolean {
  if (typeof duanMing !== 'string') return false
  const jianHua = duanMing.trim()
  if (jianHua === '') return false
  if (jianHua.length > 表情短名最大长) return false
  if (表情包控制字符正则.test(jianHua)) return false
  return !表情包短名禁制字符.some((ziFu) => jianHua.includes(ziFu))
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
  if (!表情图片后缀.includes(houZhui)) return null
  return houZhui
}

function shiFouXuYaoJiWen(wenJianMing: string): boolean {
  if (quTuPianHouZhui(wenJianMing) !== null) return true
  return wenJianMing.toLowerCase().endsWith(表情包标注Json后缀)
}

function biJiaoWenJianMing(jia: string, yi: string): number {
  if (jia < yi) return -1
  if (jia > yi) return 1
  return 0
}

async function duQuKuaiZhao(muLu: string): Promise<库快照 | null> {
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
    debug日志.debug(日志类型, '表情包目录比对失败，本轮无法判断新鲜度', {
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
  const 原值 = duiXiang[ziDuan]
  if (原值 === undefined || 原值 === null) return ''
  if (typeof 原值 !== 'string') {
    debug日志.warn(日志类型, '标注字段类型非法，已按空值兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing, zi_duan: ziDuan },
    })
    return ''
  }
  return 原值
}

function jieDuanWenBen(
  wenBen: string,
  ziDuan: string,
  zuiDaChang: number,
  wenJianMing: string,
): string {
  if (wenBen.length > zuiDaChang) {
    debug日志.warn(日志类型, '标注字段超长，已截断', {
      xiang_qing: { wen_jian_ming: wenJianMing, zi_duan: ziDuan, yuan_chang: wenBen.length, shang_xian: zuiDaChang },
    })
    return wenBen.slice(0, zuiDaChang)
  }
  return wenBen
}

function yaPingKongBai(wenBen: string): string {
  return wenBen.replace(表情包连续空白正则, ' ').trim()
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
  const 原值 = duiXiang['短名']
  if (原值 === undefined || 原值 === null) {
    debug日志.warn(日志类型, '短名缺失，该条目不入索引', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return null
  }
  if (typeof 原值 !== 'string') {
    debug日志.warn(日志类型, '短名类型非法，该条目不入索引', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return null
  }
  const jianHua = 原值.trim()
  if (jianHua === '') {
    debug日志.warn(日志类型, '短名为空，该条目不入索引', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return null
  }
  const caiJian = jieDuanWenBen(jianHua, '短名', 表情短名最大长, wenJianMing)
  if (!合法短名(caiJian)) {
    debug日志.warn(日志类型, '短名含非法字符，该条目不入索引', {
      xiang_qing: { wen_jian_ming: wenJianMing, duan_ming_chang_du: caiJian.length },
    })
    return null
  }
  return caiJian
}

function jieDuanYuanDaoXuHao(原值: string, wenJianMing: string): number {
  const jianHua = 原值.trim()
  if (jianHua === '') return 0
  const xuHao = 表情关系阶段顺序.indexOf(jianHua)
  if (xuHao >= 0) return xuHao
  debug日志.warn(日志类型, '关系阶段下限不在白名单，按最严阶段处理', {
    xiang_qing: { wen_jian_ming: wenJianMing },
  })
  return 表情关系阶段顺序.length - 1
}

function moRenBiaoZhu(moRenDuanMing: string): 表情包标注 {
  return {
    duanMing: moRenDuanMing,
    miaoShu: '',
    qingXuBiaoQian: 表情待打标,
    shiYongChangJing: '',
    qiYong: true,
    fengGe: 表情默认风格,
    guanXiJieDuanXiaXian: 0,
  }
}

function yongWenJianMingBiaoZhu(
  moRenDuanMing: string,
  wenJianMing: string,
): 表情包标注 | null {
  const jianHua = moRenDuanMing.trim()
  const caiJian = jieDuanWenBen(jianHua, '短名', 表情短名最大长, wenJianMing)
  if (!合法短名(caiJian)) {
    debug日志.warn(日志类型, '缺标注且文件名也不能当短名，该条目不入索引', {
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
): Promise<表情包标注 | null> {
  const jsonLuJing = path.join(muLu, `${quZhuMing(wenJianMing)}${表情包标注Json后缀}`)
  if (!fs.existsSync(jsonLuJing)) {
    debug日志.warn(日志类型, '缺少同名标注文件，用文件名兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return yongWenJianMingBiaoZhu(moRenDuanMing, wenJianMing)
  }
  let yuanWenBen = ''
  try {
    yuanWenBen = await fs.promises.readFile(jsonLuJing, 'utf8')
  } catch (cuoWu) {
    debug日志.warn(日志类型, '标注文件读取失败，用文件名兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing, cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return yongWenJianMingBiaoZhu(moRenDuanMing, wenJianMing)
  }
  let jieXi: unknown
  try {
    jieXi = JSON.parse(yuanWenBen)
  } catch {
    debug日志.warn(日志类型, '标注文件不是合法 JSON，用文件名兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return yongWenJianMingBiaoZhu(moRenDuanMing, wenJianMing)
  }
  if (jieXi === null || typeof jieXi !== 'object' || Array.isArray(jieXi)) {
    debug日志.warn(日志类型, '标注文件顶层不是对象，用文件名兜底', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
    return yongWenJianMingBiaoZhu(moRenDuanMing, wenJianMing)
  }
  const duiXiang = jieXi as Record<string, unknown>
  const duanMing = quLaiYuanDuanMing(duiXiang, wenJianMing)
  if (duanMing === null) return null
  const qingXuYuan = quZiDuanWenBen(duiXiang, '情绪标签', 表情短名最大长, wenJianMing)
  const qingXuHeFa = 表情运行标签.includes(qingXuYuan)
  if (!qingXuHeFa && qingXuYuan !== '') {
    debug日志.warn(日志类型, '情绪标签不在白名单，归为待打标', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
  }
  const qiYongYuan = duiXiang['启用']
  let qiYong = true
  if (qiYongYuan !== undefined && qiYongYuan !== null) {
    if (typeof qiYongYuan === 'boolean') {
      qiYong = qiYongYuan
    } else {
      debug日志.warn(日志类型, '启用字段非布尔，按默认启用处理', {
        xiang_qing: { wen_jian_ming: wenJianMing },
      })
    }
  }
  const fengGeYuan = quZiDuanWenBen(duiXiang, '风格', 表情载体配置.fengGeZuiDaChang, wenJianMing).trim()
  const fengGeHeFa = 表情风格标签.includes(fengGeYuan)
  if (!fengGeHeFa && fengGeYuan !== '') {
    debug日志.warn(日志类型, '风格不在白名单，按默认风格处理', {
      xiang_qing: { wen_jian_ming: wenJianMing },
    })
  }
  const jieDuanYuan = quZiDuanWenBen(
    duiXiang,
    '关系阶段下限',
    表情载体配置.jieDuanZuiDaChang,
    wenJianMing,
  )
  return {
    duanMing,
    miaoShu: quYaPingZiDuanWenBen(duiXiang, '描述', 表情描述最大长, wenJianMing),
    qingXuBiaoQian: qingXuHeFa ? qingXuYuan : 表情待打标,
    shiYongChangJing: quYaPingZiDuanWenBen(
      duiXiang,
      '适用场景',
      表情适用场景最大长,
      wenJianMing,
    ),
    qiYong,
    fengGe: fengGeHeFa ? fengGeYuan : 表情默认风格,
    guanXiJieDuanXiaXian: jieDuanYuanDaoXuHao(jieDuanYuan, wenJianMing),
  }
}

async function suoYinDanWenJian(
  muLu: string,
  wenJianMing: string,
  houZhui: string,
): Promise<表情包条目 | null> {
  const wenJianLuJing = path.join(muLu, wenJianMing)
  const zhuangTai = await fs.promises.stat(wenJianLuJing)
  if (zhuangTai.size <= 0 || zhuangTai.size > 表情最大文件字节) {
    debug日志.warn(日志类型, '文件为空或超出大小上限，已跳过', {
      xiang_qing: {
        wen_jian_ming: wenJianMing,
        zi_jie_shu: zhuangTai.size,
        shang_xian: 表情最大文件字节,
      },
    })
    return null
  }
  const neiRong = await fs.promises.readFile(wenJianLuJing)
  if (neiRong.length <= 0 || neiRong.length > 表情最大文件字节) {
    debug日志.warn(日志类型, '文件读取结果为空或超出大小上限，已跳过', {
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
    mime: 表情Mime映射[houZhui] || 表情默认Mime,
    ziJieShu: neiRong.length,
    wenJianMing,
    wenJianLuJing,
  }
}

function guiDangAnduanMing(
  houXuanLieBiao: 带入条目[],
): { 短名索引: Map<string, 表情包条目>; 哈希索引: Map<string, 表情包条目> } {
  const anDuanMingFenZu = new Map<string, 带入条目[]>()
  for (const houXuan of houXuanLieBiao) {
    const yiYou = anDuanMingFenZu.get(houXuan.tiaoMu.duanMing)
    if (yiYou) {
      yiYou.push(houXuan)
    } else {
      anDuanMingFenZu.set(houXuan.tiaoMu.duanMing, [houXuan])
    }
  }
  const xinDuanMing = new Map<string, 表情包条目>()
  const xinSha = new Map<string, 表情包条目>()
  for (const [duanMing, lieBiao] of anDuanMingFenZu) {
    if (lieBiao.length > 1) {
      debug日志.warn(日志类型, '短名重复，该短名的全部条目都不入索引', {
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
  return { 短名索引: xinDuanMing, 哈希索引: xinSha }
}

async function zhiXingSaoMiao(muLu: string, kuaiZhao: 库快照 | null): Promise<number> {
  const houXuanLieBiao: 带入条目[] = []
  if (muLu === '') {
    const tanCeLieBiao = tanCeMuLuLuJingLieBiao()
    if (shiQiDongQiBaoBiaoQingKu) {
      debug日志.error(日志类型, '启动时未找到表情包目录，表情包库为空', {
        xiang_qing: {
          huan_jing_bian_liang: 表情包目录环境变量,
          mu_lu_ming: 表情包目录名,
          tan_ce_lu_jing: tanCeLieBiao,
          shi_qi_dong: true,
        },
      })
    } else {
      debug日志.warn(日志类型, '未找到表情包目录，索引为空', {
        xiang_qing: {
          huan_jing_bian_liang: 表情包目录环境变量,
          mu_lu_ming: 表情包目录名,
          tan_ce_lu_jing: tanCeLieBiao,
        },
      })
    }
  } else if (kuaiZhao === null) {
    debug日志.warn(日志类型, '表情包目录读取失败，索引为空', {
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
        debug日志.warn(日志类型, '单文件索引失败，已跳过', {
          xiang_qing: { wen_jian_ming: wenJianMing, cuo_wu: String(cuoWu).slice(0, 200) },
        })
      }
    }
  }
  const guiDang = guiDangAnduanMing(houXuanLieBiao)
  短名索引 = guiDang.短名索引
  哈希索引 = guiDang.哈希索引
  上次目录 = muLu
  shangCiZhiWen = kuaiZhao === null ? null : kuaiZhao.zhiWen
  shangCiBiDuiShiJian = Date.now()
  yiSaoMiaoGuo = true
  debug日志.info(日志类型, '表情包索引扫描完成', {
    xiang_qing: {
      mu_lu_ming: quMuLuMing(muLu),
      ming_zhong: 短名索引.size > 0,
      tiao_mu_shu: 短名索引.size,
    },
  })
  return 短名索引.size
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

export function 当前目录路径(): string {
  return tanCeMuLu()
}

export async function 重新扫描(): Promise<number> {
  return yunXingPaiDui(async () => {
    const muLu = tanCeMuLu()
    const kuaiZhao = await duQuKuaiZhao(muLu)
    return zhiXingSaoMiao(muLu, kuaiZhao)
  })
}

export async function 初始化表情包库(): Promise<number> {
  sheZhiShiQiDongQiBaoBiaoQingKu()
  return 重新扫描()
}

export async function 确保最新(): Promise<number> {
  return yunXingPaiDui(async () => {
    const muLu = tanCeMuLu()
    const jianGe = 取最短比对间隔毫秒()
    if (yiSaoMiaoGuo && muLu === 上次目录 && jianGe > 0 && Date.now() - shangCiBiDuiShiJian < jianGe) {
      return 短名索引.size
    }
    const kuaiZhao = await duQuKuaiZhao(muLu)
    const zhiWen = kuaiZhao === null ? null : kuaiZhao.zhiWen
    if (yiSaoMiaoGuo && muLu === 上次目录 && zhiWen === shangCiZhiWen) {
      shangCiBiDuiShiJian = Date.now()
      return 短名索引.size
    }
    debug日志.debug(日志类型, '表情包目录指纹变化，重新扫描', {
      xiang_qing: {
        mu_lu_ming: quMuLuMing(muLu),
        shou_ci: !yiSaoMiaoGuo,
        huan_mu_lu: muLu !== 上次目录,
      },
    })
    return zhiXingSaoMiao(muLu, kuaiZhao)
  })
}

function queZhengShu(shuLiang: number): number {
  if (typeof shuLiang !== 'number' || !Number.isFinite(shuLiang)) return 0
  const 取整 = Math.trunc(shuLiang)
  return 取整 > 0 ? 取整 : 0
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

export async function 候选系统表情(
  qingXuBiaoQian: string | null | undefined,
  shuLiang: number,
  guoLv?: 表情包过滤,
  paiChuDuanMing?: string[],
): Promise<表情包条目[]> {
  await 确保最新()
  const yiBiaoQian = typeof qingXuBiaoQian === 'string' ? qingXuBiaoQian.trim() : ''
  const tiShu = queZhengShu(shuLiang)
  if (tiShu === 0) return []
  const qiYongLieBiao = [...短名索引.values()].filter((tiaoMu) => tiaoMu.qiYong)
  const fuHeZaiTi = guoLv
    ? qiYongLieBiao.filter(
        (tiaoMu) =>
          guoLv.yunXuFengGe.includes(tiaoMu.fengGe ?? 表情默认风格) &&
          (tiaoMu.guanXiJieDuanXiaXian ?? 0) <= guoLv.guanXiJieDuanXuHao,
      )
    : qiYongLieBiao
  const mingZhong =
    yiBiaoQian === ''
      ? fuHeZaiTi
      : fuHeZaiTi.filter(
          (tiaoMu) => tiaoMu.qingXuBiaoQian === yiBiaoQian || tiaoMu.shiYongChangJing.includes(yiBiaoQian),
        )
  const excludeList = Array.isArray(paiChuDuanMing) ? paiChuDuanMing : []
  const filtered = excludeList.length > 0 ? mingZhong.filter((t) => !excludeList.includes(t.duanMing)) : mingZhong
  const finalPool = filtered.length > 0 ? filtered : mingZhong
  const daLuanHou = daLuan(finalPool)
  const jieGuo = daLuanHou.slice(0, Math.min(tiShu, daLuanHou.length))
  return jieGuo
}
export function 短名转UUID(duanMing: string): string {
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

export async function 按短名查(duanMing: string): Promise<表情包条目 | null> {
  if (duanMing.startsWith('wx_')) return 构建原生表情条目(duanMing.slice(3))
  if (typeof duanMing !== 'string') return null
  const jianHua = duanMing.trim()
  if (jianHua === '') return null
  await 确保最新()
  return 短名索引.get(jianHua) || null
}

export async function 按哈希查(sha256: string): Promise<表情包条目 | null> {
  if (typeof sha256 !== 'string') return null
  const jianHua = sha256.trim().toLowerCase()
  if (jianHua === '') return null
  await 确保最新()
  return 哈希索引.get(jianHua) || null
}

export async function 取全部启用(): Promise<表情包条目[]> {
  await 确保最新()
  return [...短名索引.values()].filter((tiaoMu) => tiaoMu.qiYong)
}
