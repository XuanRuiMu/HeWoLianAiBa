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
  表情人设气质标签,
  表情圈层门槛标签,
} from '../config/表情包配置'

export interface 表情包过滤 {
  yunXuFengGe: readonly string[]
  guanXiJieDuanXuHao: number
  renSheQiZhi?: readonly string[]
  wenBen?: string
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
  renSheQiZhi?: string[]
  quanCengMenKian?: string
}

interface 表情包标注 {
  duanMing: string
  miaoShu: string
  qingXuBiaoQian: string
  shiYongChangJing: string
  qiYong: boolean
  fengGe: string
  guanXiJieDuanXiaXian: number
  renSheQiZhi?: string[]
  quanCengMenKian?: string
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
  const rootOverride = (process.env.BIAO_QING_BAO_GEN_MU_LU || '').trim()
  if (rootOverride !== '') return path.join(path.resolve(rootOverride), 表情包目录名)
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
