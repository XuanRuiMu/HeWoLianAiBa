import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'
import { 数据库 } from '../数据库'
import { peiZhi } from '../config'
import type { FanYiJian } from '../config/translations'
import {
  MEI_TI_PEI_ZHI,
  shiHeFaLeiBie,
  shiYunXuMIME,
} from '../config/媒体配置'

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

/**
 * 流式保存媒体文件：边落盘边计算 SHA256 与字节数（禁止整包进内存），
 * 完成后原子改名到 CAS 路径 <根>/<sha256前2位>/<sha256>，同哈希去重复用。
 */
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

  const daXiaoShangXian = MEI_TI_PEI_ZHI.daXiaoShangXianZiJie[leiBie]
  const linShiMuLu = huoQuLinShiMuLu()
  await queBaoMuLu(MEI_TI_PEI_ZHI.cunChuGenMuLu)
  await queBaoMuLu(linShiMuLu)
  const linShiLuJing = path.join(linShiMuLu, `${crypto.randomUUID()}.tmp`)

  let ziJieShu = 0
  let yiChaoXian = false
  const haXi = crypto.createHash('sha256')
  const jiSuanLiu = new Transform({
    transform(kuai: Buffer, _bianMa: BufferEncoding, huiDiao: (cuoWu: Error | null, shuJu?: Buffer) => void) {
      if (yiChaoXian) {
        // 超限后进入丢弃模式：不再落盘/哈希，但继续消费流，
        // 保证 HTTP 分帧完整、客户端能收到 400 响应而非连接被重置
        huiDiao(null)
        return
      }
      ziJieShu += kuai.length
      if (ziJieShu > daXiaoShangXian) {
        yiChaoXian = true
        huiDiao(null)
        return
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

  const sha256 = haXi.digest('hex').toLowerCase()
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
    // 同哈希文件已存在（去重），直接复用，丢弃临时文件
    await qingChuWenJian(linShiLuJing)
  } else {
    try {
      await fs.promises.rename(linShiLuJing, muBiaoLuJing)
    } catch {
      // 并发竞态：另一路写入已抢先落位；若目标仍不存在则重试一次，否则清理临时文件
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
     ON CONFLICT ("SHA256") DO NOTHING
     RETURNING "ID"`,
    [sha256, yuanShiWenJianMing, qingLiMIME, ziJieShu, leiBie, yongHuId],
  )

  let meiTiId: string
  if (chaRuJieGuo.rows.length > 0) {
    meiTiId = String(chaRuJieGuo.rows[0].ID)
  } else {
    const yiYouJieGuo = await 数据库.query(
      `SELECT "ID" FROM "媒体文件" WHERE "SHA256" = $1 LIMIT 1`,
      [sha256],
    )
    meiTiId = String(yiYouJieGuo.rows[0].ID)
  }

  return {
    mediaId: meiTiId,
    sha256,
    mime: qingLiMIME,
    daXiao: ziJieShu,
    leiBie,
    yuanShiWenJianMing,
  }
}

/** 生成带过期时间与 HMAC-SHA256 签名的下载 URL */
export function shengChengQianMingURL(sha256: string, youXiaoMiao?: number): string {
  const youXiaoQi = youXiaoMiao ?? MEI_TI_PEI_ZHI.qianMingYouXiaoMiaoRenZheng
  const guoQiMiao = Math.floor(Date.now() / 1000) + youXiaoQi
  const qianMing = crypto
    .createHmac('sha256', peiZhi.jwtMiYao)
    .update(`${sha256}:${guoQiMiao}`)
    .digest('hex')
  return `/api/媒体/${sha256}?e=${guoQiMiao}&s=${qianMing}`
}

/** 校验签名：过期、签名不符、参数缺失或哈希格式非法均返回 false */
export function yanZhengQianMing(sha256: unknown, e: unknown, s: unknown): boolean {
  if (typeof sha256 !== 'string' || !SHA256_GE_SHI.test(sha256)) return false
  if (typeof e !== 'string' || e === '' || typeof s !== 'string' || s === '') return false
  if (!/^\d{1,12}$/.test(e)) return false
  const guoQiMiao = parseInt(e, 10)
  if (guoQiMiao * 1000 <= Date.now()) return false
  const yuQiQianMing = crypto
    .createHmac('sha256', peiZhi.jwtMiYao)
    .update(`${sha256}:${e}`)
    .digest('hex')
  const a = Buffer.from(yuQiQianMing, 'utf8')
  const b = Buffer.from(s, 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** 由哈希取本地 CAS 路径；哈希格式非法（防路径遍历）返回 null */
export function huoQuBenDiLuJing(sha256: string): string | null {
  if (!SHA256_GE_SHI.test(sha256)) return null
  const di = sha256.toLowerCase()
  return path.join(MEI_TI_PEI_ZHI.cunChuGenMuLu, di.slice(0, 2), di)
}
