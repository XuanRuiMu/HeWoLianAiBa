import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import type { FanYiJian } from '../config/translations'
import {
  MEI_TI_PEI_ZHI,
  huoQuWenJianDaXiaoShangXianZiJie,
  shiHeFaLeiBie,
  shiYunXuMIME,
} from '../config/媒体配置'
import { shenHeTuPianAnQuan } from './DeepSeek视觉审核'

export interface MeiTiBaoCunJieGuo {
  mediaId: string
  sha256: string
  mime: string
  daXiao: number
  leiBie: string
  yuanShiWenJianMing: string
}

export class MeiTiCunChuCuoWu extends Error {
  readonly fanYiJian: FanYiJian<'liaoTian'>

  constructor(fanYiJian: FanYiJian<'liaoTian'>) {
    super(fanYiJian)
    this.name = 'MeiTiCunChuCuoWu'
    this.fanYiJian = fanYiJian
  }
}

const SHA256_GE_SHI = /^[0-9a-f]{64}$/
const UUID_GE_SHI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const YUN_XU_QIAN_MING_SUAN_FA = new Set(['sha256'])
let meiTiQianMingMiYaoHuanCun: string | null = null

function yanZhengMiYaoShang(miYao: string): void {
  if (!miYao || miYao.trim().length < 32) {
    throw new Error('媒体签名密钥熵不足：长度至少32字节')
  }
}

export function huoQuMeiTiQianMingMiYao(): string {
  if (meiTiQianMingMiYaoHuanCun) return meiTiQianMingMiYaoHuanCun

  const xianShiPeiZhi = peiZhi.meiTiQianMingMiYao
  if (xianShiPeiZhi && xianShiPeiZhi.trim() !== '') {
    yanZhengMiYaoShang(xianShiPeiZhi.trim())
    meiTiQianMingMiYaoHuanCun = xianShiPeiZhi
    return meiTiQianMingMiYaoHuanCun
  }

  yanZhengMiYaoShang(peiZhi.jwtMiYao)
  const paiShengZhi = crypto.hkdfSync(
    'sha256',
    peiZhi.jwtMiYao,
    'mei-ti-qian-ming-mi-yao-v1',
    'hewolianba-media-signing',
    32,
  )
  meiTiQianMingMiYaoHuanCun = Buffer.from(paiShengZhi).toString('hex')
  return meiTiQianMingMiYaoHuanCun
}

export function chongZhiMeiTiQianMingMiYao(): void {
  if (meiTiQianMingMiYaoHuanCun) {
    meiTiQianMingMiYaoHuanCun = null
  }
  meiTiQianMingMiYaoHuanCun = null
}

void YUN_XU_QIAN_MING_SUAN_FA

async function queBaoMuLu(cunZai: string): Promise<void> {
  await fs.promises.mkdir(cunZai, { recursive: true })
}

function huoQuLinShiMuLu(): string {
  return path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, 'tmp')
}

async function qingChuWenJian(luJing: string): Promise<void> {
  try {
    await fs.promises.unlink(luJing)
  } catch {
    // 文件不存在或已被并发清理，忽略
  }
}

export async function zhiXingBingDuSaoMiao(linShiLuJing: string): Promise<void> {
  const qiYong = peiZhi.bingDuSaoMiaoShengChanMoRen
  const saoMiao = { ...peiZhi.bingDuSaoMiao, qiYong }
  if (!saoMiao.qiYong || saoMiao.fuWuUrl.trim() === '') return
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), saoMiao.chaoShiHaoMiao)
  try {
    const wenJianLiu = fs.createReadStream(linShiLuJing)
    const biaoDan = new FormData()
    biaoDan.append('file', new Blob([new Uint8Array(await streamToBuffer(wenJianLiu))]))
    const xiangYing = await fetch(`${saoMiao.fuWuUrl.replace(/\/$/, '')}/scan`, {
      method: 'POST',
      body: biaoDan,
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) throw new MeiTiCunChuCuoWu('bingDuSaoMiaoShiBai')
    const jieGuo = (await xiangYing.json()) as Record<string, unknown>
    if (jieGuo['infected'] === true || jieGuo['gan_ran'] === true) {
      throw new MeiTiCunChuCuoWu('bingDuSaoMiaoShiBai')
    }
  } catch (cuoWu) {
    if (cuoWu instanceof MeiTiCunChuCuoWu) throw cuoWu
    throw new MeiTiCunChuCuoWu('bingDuSaoMiaoShiBai')
  } finally {
    clearTimeout(dingShi)
  }
}

async function streamToBuffer(liu: fs.ReadStream): Promise<Buffer> {
  const kuaiLieBiao: Buffer[] = []
  for await (const kuai of liu) kuaiLieBiao.push(Buffer.from(kuai))
  return Buffer.concat(kuaiLieBiao)
}

export async function liuShiBaoCunMeiTi(
  keDuLiu: Readable,
  yuanShiWenJianMing: string,
  mime: string,
  leiBie: string,
  yongHuId: string,
): Promise<MeiTiBaoCunJieGuo> {
  if (!shiHeFaLeiBie(leiBie)) {
    throw new MeiTiCunChuCuoWu('meiTiLeiXingFeiFa')
  }
  const qingLiMIME = String(mime || '').split(';')[0].trim().toLowerCase()
  if (!qingLiMIME || !shiYunXuMIME(leiBie, qingLiMIME)) {
    throw new MeiTiCunChuCuoWu('meiTiMIMEBuZhiChi')
  }

  const daXiaoShangXian =
    leiBie === 'wenjian'
      ? huoQuWenJianDaXiaoShangXianZiJie(yuanShiWenJianMing, qingLiMIME)
      : MEI_TI_PEI_ZHI.daXiaoShangXianZiJie[leiBie as keyof typeof MEI_TI_PEI_ZHI.daXiaoShangXianZiJie]
  const linShiMuLu = huoQuLinShiMuLu()
  await queBaoMuLu(MEI_TI_PEI_ZHI.cunChuGenMuLu)
  await queBaoMuLu(linShiMuLu)
  const linShiLuJing = path.join(linShiMuLu, `${crypto.randomUUID()}.tmp`)

  const shiTuPiangLei = qingLiMIME.startsWith('image/')
  let touBuHuanChong: Buffer | null = null

  let ziJieShu = 0
  let yiChaoXian = false
  const haXi = crypto.createHash('sha256')
  const jiSuanLiu = new Transform({
    transform(kuai: Buffer, _bianMa: BufferEncoding, huiDiao: (cuoWu: Error | null, shuJu?: Buffer) => void) {
      if (yiChaoXian) {
        huiDiao(null)
        return
      }
      ziJieShu += kuai.length
      if (ziJieShu > daXiaoShangXian) {
        yiChaoXian = true
        huiDiao(null)
        return
      }
      if (shiTuPiangLei && touBuHuanChong === null) {
        touBuHuanChong = Buffer.from(kuai.subarray(0, 64))
      } else if (shiTuPiangLei && touBuHuanChong !== null && touBuHuanChong.length < 64) {
        touBuHuanChong = Buffer.concat([touBuHuanChong, kuai.subarray(0, 64 - touBuHuanChong.length)])
      }
      haXi.update(kuai)
      huiDiao(null, kuai)
    },
  })

  try {
    await pipeline(keDuLiu, jiSuanLiu, fs.createWriteStream(linShiLuJing))
  } catch (cuoWu) {
    await qingChuWenJian(linShiLuJing)
    throw cuoWu
  }

  if (yiChaoXian) {
    await qingChuWenJian(linShiLuJing)
    throw new MeiTiCunChuCuoWu('meiTiGuoDa')
  }

  if (shiTuPiangLei) {
    const touBu = touBuHuanChong || Buffer.alloc(0)
    let moShuPiPei = false
    if (qingLiMIME === 'image/png') {
      moShuPiPei =
        touBu.length >= 8 &&
        touBu[0] === 0x89 && touBu[1] === 0x50 && touBu[2] === 0x4e && touBu[3] === 0x47
      if (moShuPiPei && touBu.length >= 24) {
        const kuan = touBu.readUInt32BE(16)
        const gao = touBu.readUInt32BE(20)
        if (kuan > 10000 || gao > 10000) {
          await qingChuWenJian(linShiLuJing)
          throw new MeiTiCunChuCuoWu('meiTiMIMEBuZhiChi')
        }
      }
    } else if (qingLiMIME === 'image/jpeg') {
      moShuPiPei = touBu.length >= 3 && touBu[0] === 0xff && touBu[1] === 0xd8 && touBu[2] === 0xff
    } else if (qingLiMIME === 'image/gif') {
      moShuPiPei = touBu.length >= 6 && touBu.subarray(0, 6).toString('ascii').startsWith('GIF8')
    } else if (qingLiMIME === 'image/webp') {
      moShuPiPei =
        touBu.length >= 12 &&
        touBu.subarray(0, 4).toString('ascii') === 'RIFF' &&
        touBu.subarray(8, 12).toString('ascii') === 'WEBP'
    }
    if (!moShuPiPei) {
      await qingChuWenJian(linShiLuJing)
      throw new MeiTiCunChuCuoWu('meiTiNeiRongYuMIMEBuFu')
    }
  }

  try {
    await zhiXingBingDuSaoMiao(linShiLuJing)
  } catch (cuoWu) {
    await qingChuWenJian(linShiLuJing)
    throw cuoWu
  }

const sha256 = haXi.digest('hex').toLowerCase()

  const shiTuPianLeiBie = leiBie === 'tupian' || leiBie === 'biaoqingshu'
  if (shiTuPianLeiBie) {
    const shenHeJieGuo = await shenHeTuPianAnQuan(linShiLuJing)
    if (shenHeJieGuo.wei_gui) {
      await qingChuWenJian(linShiLuJing)
      throw new MeiTiCunChuCuoWu(shenHeJieGuo.lei_xing as FanYiJian<'liaoTian'>)
    }
  }

  const muBiaoMuLu = path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, sha256.slice(0, 2))
  const muBiaoLuJing = path.join(muBiaoMuLu, sha256)
  await queBaoMuLu(muBiaoMuLu)

  let muBiaoYiCunZai = false
  try {
    await fs.promises.access(muBiaoLuJing)
    muBiaoYiCunZai = true
  } catch {
    muBiaoYiCunZai = false
  }

  if (muBiaoYiCunZai) {
    await qingChuWenJian(linShiLuJing)
  } else {
    try {
      await fs.promises.rename(linShiLuJing, muBiaoLuJing)
    } catch {
      let jingZhengDuiShouYiLuoWei = false
      try {
        await fs.promises.access(muBiaoLuJing)
        jingZhengDuiShouYiLuoWei = true
      } catch {
        jingZhengDuiShouYiLuoWei = false
      }
      if (jingZhengDuiShouYiLuoWei) {
        await qingChuWenJian(linShiLuJing)
      } else {
        try {
          await fs.promises.rename(linShiLuJing, muBiaoLuJing)
        } catch (chongShiCuoWu) {
          await qingChuWenJian(linShiLuJing)
          throw chongShiCuoWu
        }
      }
    }
  }

  const chaRuJieGuo = await 数据库.query(
    `INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING "ID"`,
    [sha256, yuanShiWenJianMing, qingLiMIME, ziJieShu, leiBie, yongHuId],
  )

  const meiTiId = String(chaRuJieGuo.rows[0].ID)

  return {
    mediaId: meiTiId,
    sha256,
    mime: qingLiMIME,
    daXiao: ziJieShu,
    leiBie,
    yuanShiWenJianMing,
  }
}

export function shengChengQianMingURL(sha256: string, yongHuId: string, youXiaoMiao?: number): string
export function shengChengQianMingURL(sha256: string, youXiaoMiao?: number): string
export function shengChengQianMingURL(
  sha256: string,
  yongHuIdHuoMiao?: string | number,
  youXiaoMiao?: number,
): string {
  if (typeof yongHuIdHuoMiao === 'number' || yongHuIdHuoMiao === undefined) {
    const youXiaoQi = (yongHuIdHuoMiao as number | undefined) ?? MEI_TI_PEI_ZHI.qianMingYouXiaoMiaoRenZheng
    const guoQiMiao = Math.floor(Date.now() / 1000) + youXiaoQi
    const qianMing = crypto
      .createHmac('sha256', huoQuMeiTiQianMingMiYao())
      .update(`${sha256}:${guoQiMiao}`)
      .digest('hex')
    return `/api/媒体/${sha256}?e=${guoQiMiao}&s=${qianMing}`
  }
  const yongHuId = yongHuIdHuoMiao
  const youXiaoQi = youXiaoMiao ?? MEI_TI_PEI_ZHI.qianMingYouXiaoMiaoRenZheng
  const guoQiMiao = Math.floor(Date.now() / 1000) + youXiaoQi
  const qianFaHaoMiao = Date.now()
  const qianMing = crypto
    .createHmac('sha256', huoQuMeiTiQianMingMiYao())
    .update(`${sha256}:${guoQiMiao}:${yongHuId}:${qianFaHaoMiao}`)
    .digest('hex')
  return `/api/媒体/${sha256}?e=${guoQiMiao}&u=${yongHuId}&t=${qianFaHaoMiao}&s=${qianMing}`
}

export function shengChengMeiTiYinYong(sha256: string): string {
  return `/api/媒体/${sha256.toLowerCase()}`
}

const MEI_TI_YIN_YONG_GE_SHI = /^\/api\/媒体\/([0-9a-f]{64})(\?.*)?$/i

export function tiQuMeiTiSha(cunChuZhi: unknown): string | null {
  if (typeof cunChuZhi !== 'string') return null
  const piPei = MEI_TI_YIN_YONG_GE_SHI.exec(cunChuZhi.trim())
  if (!piPei) return null
  return piPei[1].toLowerCase()
}

export function zhongXinQianMingMeiTiURL(
  cunChuZhi: string | null | undefined,
  yongHuId: string,
  youXiaoMiao?: number,
): string | null {
  if (!cunChuZhi) return null
  const sha256 = tiQuMeiTiSha(cunChuZhi)
  if (!sha256) return cunChuZhi
  return shengChengQianMingURL(sha256, yongHuId, youXiaoMiao ?? MEI_TI_PEI_ZHI.zhanShiYouXiaoMiao)
}

function huoQuMeiTiCheXiaoJian(yongHuId: string): string {
  return `mei_ti_qian_ming_che_xiao:${yongHuId}`
}

export async function cheXiaoYongHuMeiTiQianMing(yongHuId: string): Promise<void> {
  await redis.set(huoQuMeiTiCheXiaoJian(yongHuId), String(Date.now()), 'EX', 30 * 24 * 60 * 60)
}

export const MEI_TI_KE_DU_YU_JU = `
SELECT 1
  FROM "媒体文件" mf
 WHERE mf."SHA256" = $1
   AND (
        mf."上传者ID" = $2
     OR EXISTS (
          SELECT 1
            FROM "好友消息" hm
            JOIN "好友申请" ha
              ON ha."状态" = 'accepted'
             AND ((ha."申请者ID" = hm."发送者ID" AND ha."接收者ID" = hm."接收者ID")
               OR (ha."申请者ID" = hm."接收者ID" AND ha."接收者ID" = hm."发送者ID"))
           WHERE hm."媒体ID" = mf."ID"
             AND hm."撤回" = FALSE
             AND $2 IN (hm."发送者ID", hm."接收者ID")
        )
   )
 LIMIT 1`

export async function yanZhengMeiTiKeDu(meiTiSha: string, yongHuId: string): Promise<boolean> {
  const jieGuo = await 数据库.query(MEI_TI_KE_DU_YU_JU, [meiTiSha, yongHuId])
  return jieGuo.rows.length > 0
}

export async function yanZhengQianMing(
  sha256: unknown,
  e: unknown,
  u: unknown,
  s: unknown,
  t?: unknown,
): Promise<boolean> {
  if (typeof sha256 !== 'string' || !SHA256_GE_SHI.test(sha256)) return false
  if (typeof e !== 'string' || e === '' || typeof s !== 'string' || s === '') return false
  if (!/^\d{1,12}$/.test(e)) return false
  const guoQiMiao = parseInt(e, 10)
  if (guoQiMiao * 1000 <= Date.now()) return false
  if (typeof u === 'string' && u !== '' && typeof t === 'string' && t !== '') {
    if (!UUID_GE_SHI.test(u) || !/^\d{1,15}$/.test(t)) return false
    const yuQiQianMing = crypto
      .createHmac('sha256', huoQuMeiTiQianMingMiYao())
      .update(`${sha256}:${e}:${u}:${t}`)
      .digest('hex')
    const a = Buffer.from(yuQiQianMing, 'utf8')
    const b = Buffer.from(s, 'utf8')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
    try {
      const cheXiaoShiJian = await redis.get(huoQuMeiTiCheXiaoJian(u))
      if (cheXiaoShiJian !== null && Number(t) <= Number(cheXiaoShiJian)) return false
      const guiShu = await yanZhengMeiTiKeDu(sha256.toLowerCase(), u)
      return guiShu
    } catch {
      return false
    }
  }
  const yuQiQianMing = crypto
    .createHmac('sha256', huoQuMeiTiQianMingMiYao())
    .update(`${sha256}:${e}`)
    .digest('hex')
  const a = Buffer.from(yuQiQianMing, 'utf8')
  const b = Buffer.from(s, 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function huoQuBenDiLuJing(sha256: string): string | null {
  if (!SHA256_GE_SHI.test(sha256)) return null
  const di = sha256.toLowerCase()
  return path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, di.slice(0, 2), di)
}

export async function shanChuMeiTiWenJian(sha256: string): Promise<void> {
  const luJing = huoQuBenDiLuJing(sha256)
  if (!luJing) return
  await qingChuWenJian(luJing)
}
