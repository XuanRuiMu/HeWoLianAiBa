import { createHmac, timingSafeEqual } from 'node:crypto'
import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Request, Response } from 'express'
import fs from 'fs'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { 数据库 } from '../数据库'
import { yanZhengUUID } from '../utils/验证'
import { huoQuBenDiLuJing, huoQuMeiTiQianMingMiYao, yanZhengQianMing } from '../services/媒体存储'
import { chaAnDuanMing, chaAnSha256, type BiaoQingKuTiaoMu } from '../services/表情包库'
import { tiQuTieZhiDuanMing } from '../services/贴纸标记'

const luYou = Router()

const Sha256GeShi = /^[0-9a-f]{64}$/

const GuoQiGeShi = /^\d{1,12}$/

const QianFaShiJianGeShi = /^\d{1,15}$/

const EtagTou = '"'

const HuanCunKongZhi = 'private, max-age=31536000, immutable'

const TieZhiHuoQingLieBiao = 300

function quTiaoMuDuanMing(tiaoMu: BiaoQingKuTiaoMu): string {
  return typeof tiaoMu.duanMing === 'string' ? tiaoMu.duanMing : ''
}

function yanZhengBiaoQingQianMing(
  sha256: unknown,
  eCanShu: unknown,
  uCanShu: unknown,
  sCanShu: unknown,
  tCanShu: unknown,
): boolean {
  if (typeof sha256 !== 'string' || !Sha256GeShi.test(sha256)) return false
  if (typeof eCanShu !== 'string' || typeof sCanShu !== 'string') return false
  if (typeof uCanShu !== 'string' || !yanZhengUUID(uCanShu)) return false
  if (typeof tCanShu !== 'string' || !QianFaShiJianGeShi.test(tCanShu)) return false
  if (!GuoQiGeShi.test(eCanShu)) return false
  if (parseInt(eCanShu, 10) * 1000 <= Date.now()) return false
  const yuQiQianMing = createHmac('sha256', huoQuMeiTiQianMingMiYao())
    .update(`${sha256}:${eCanShu}:${uCanShu}:${tCanShu}`)
    .digest('hex')
  const qiDai = Buffer.from(yuQiQianMing, 'utf8')
  const shiJi = Buffer.from(sCanShu, 'utf8')
  return qiDai.length === shiJi.length && timingSafeEqual(qiDai, shiJi)
}

function faChuBiaoQingTuPian(
  tiaoMu: BiaoQingKuTiaoMu,
  sha256: string,
  xiangYing: Response,
): void {
  xiangYing.setHeader('ETag', `${EtagTou}${sha256}${EtagTou}`)
  xiangYing.setHeader('Cache-Control', HuanCunKongZhi)
  xiangYing.type(tiaoMu.mime)
  xiangYing.sendFile(
    tiaoMu.wenJianLuJing,
    { etag: false, cacheControl: false, lastModified: false, dotfiles: 'deny' },
    (cuoWu) => {
      if (cuoWu && !xiangYing.headersSent) {
        shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
        return
      }
      if (cuoWu) {
        xiangYing.end()
      }
    },
  )
}

async function shiFouBiaoQingBaoMeiTi(sha256: string): Promise<boolean> {
  try {
    const xiaoXiZhuangTai = await 数据库.query(
      `SELECT 1
         FROM "消息" m
         JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
        WHERE mf."SHA256" = $1 AND m."类型" = 'biaoQingBao'
        LIMIT 1`,
      [sha256],
    )
    if (xiaoXiZhuangTai.rows.length > 0) return true
  } catch {
    return false
  }
  try {
    const haoYouZhuangTai = await 数据库.query(
      `SELECT 1
         FROM "好友消息" hm
         JOIN "媒体文件" mf ON hm."媒体ID" = mf."ID"
        WHERE mf."SHA256" = $1 AND hm."类型" = 'biaoQingBao'
        LIMIT 1`,
      [sha256],
    )
    return haoYouZhuangTai.rows.length > 0
  } catch {
    return false
  }
}

async function huiTuiBiaoQingKu(
  sha256: string,
  xiangYing: Response,
): Promise<boolean> {
  const tiaoMu = await chaAnSha256(sha256)
  if (tiaoMu) {
    debug日志.info('媒体下载', '媒体行或本地文件缺失，已回退表情包库', {
      xiang_qing: { xiang_qing_lei: 'sha256', duan_ming: quTiaoMuDuanMing(tiaoMu), mime: tiaoMu.mime },
    })
    faChuBiaoQingTuPian(tiaoMu, sha256, xiangYing)
    return true
  }
  const anDuanMingTiaoMu = await huiTuiAnDuanMing(sha256, xiangYing)
  if (anDuanMingTiaoMu) return true
  return false
}

async function huiTuiAnDuanMing(
  sha256: string,
  xiangYing: Response,
): Promise<boolean> {
  const duanMingLieBiao = await quDuanMingLieBiao(sha256)
  for (const duanMing of duanMingLieBiao) {
    const tiaoMu = await chaAnDuanMing(duanMing)
    if (!tiaoMu) continue
    if (tiaoMu.sha256 === sha256) continue
    debug日志.info('媒体下载', '按短名二次回退命中表情包库', {
      xiang_qing: { xiang_qing_lei: 'duan_ming', duan_ming: duanMing, mime: tiaoMu.mime },
    })
    faChuBiaoQingTuPian(tiaoMu, tiaoMu.sha256, xiangYing)
    return true
  }
  return false
}

async function quDuanMingLieBiao(sha256: string): Promise<string[]> {
  let meiTiIdLieBiao: string[] = []
  try {
    const meiTiChaXun = await 数据库.query(
      `SELECT "ID" FROM "媒体文件" WHERE "SHA256" = $1 LIMIT 1`,
      [sha256],
    )
    meiTiIdLieBiao = meiTiChaXun.rows
      .map((hang) => (hang as Record<string, unknown>).ID)
      .filter((zhi): zhi is string => typeof zhi === 'string' && zhi !== '')
  } catch (cuoWu) {
    debug日志.warn('媒体下载', '按短名回退时查媒体ID失败', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return []
  }
  if (meiTiIdLieBiao.length === 0) return []
  const neiRongLieBiao = await quTieZhiNeiRong(meiTiIdLieBiao)
  const duanMingLieBiao: string[] = []
  for (const neiRong of neiRongLieBiao) {
    for (const duanMing of tiQuTieZhiDuanMing(neiRong)) {
      if (duanMingLieBiao.includes(duanMing)) continue
      duanMingLieBiao.push(duanMing)
    }
  }
  return duanMingLieBiao
}

async function quTieZhiNeiRong(meiTiIdLieBiao: string[]): Promise<string[]> {
  const neiRongLieBiao: string[] = []
  const meiTiLieBiao = meiTiIdLieBiao.slice(0, TieZhiHuoQingLieBiao)
  for (const meiTiId of meiTiLieBiao) {
    try {
      const xiaoXiChaXun = await 数据库.query(
        `SELECT "内容" FROM "消息" WHERE "媒体ID" = $1 AND "类型" = 'biaoQingBao' LIMIT 1`,
        [meiTiId],
      )
      for (const hang of xiaoXiChaXun.rows) {
        const neiRong = (hang as Record<string, unknown>).内容
        if (typeof neiRong === 'string' && neiRong !== '') neiRongLieBiao.push(neiRong)
      }
    } catch {
      continue
    }
  }
  return neiRongLieBiao
}

async function meiTiShiXiaoXiangYing(
  sha256: string,
  xiangYing: Response,
): Promise<boolean> {
  if (!(await shiFouBiaoQingBaoMeiTi(sha256))) return false
  shiBaiXiangYing(xiangYing, 410, huoQuFanYi('liaoTian', 'meiTiYiShiXiao'))
  return true
}

luYou.get('/:sha256', async (qingQiu: Request, xiangYing: Response) => {
  const sha256 = String(qingQiu.params.sha256 || '')
  const eCanShu = qingQiu.query.e
  const uCanShu = qingQiu.query.u
  const sCanShu = qingQiu.query.s
  const tCanShu = qingQiu.query.t

  try {
    const yiQianMing = await yanZhengQianMing(sha256, eCanShu, uCanShu, sCanShu, tCanShu)
    if (!yiQianMing) {
      const qianMingHeFa = yanZhengBiaoQingQianMing(
        sha256,
        eCanShu,
        uCanShu,
        sCanShu,
        tCanShu,
      )
      if (!qianMingHeFa || !(await huiTuiBiaoQingKu(sha256, xiangYing))) {
        return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'qianMingWuXiao'))
      }
      return
    }

    const di = sha256.toLowerCase()
    const luJing = huoQuBenDiLuJing(di)
    if (!luJing) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('liaoTian', 'qianMingWuXiao'))
    }

    const chaXun = await 数据库.query(
      `SELECT "MIME", "原始文件名", "类别" FROM "媒体文件" WHERE "SHA256" = $1 LIMIT 1`,
      [di],
    )
    if (chaXun.rows.length === 0) {
      if (await huiTuiBiaoQingKu(di, xiangYing)) return
      if (await meiTiShiXiaoXiangYing(di, xiangYing)) return
      return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
    }

    let wenJianCunZai = false
    try {
      wenJianCunZai = (await fs.promises.stat(luJing)).isFile()
    } catch {
      wenJianCunZai = false
    }
    if (!wenJianCunZai) {
      if (await huiTuiBiaoQingKu(di, xiangYing)) return
      if (await meiTiShiXiaoXiangYing(di, xiangYing)) return
      return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
    }

    if (String(chaXun.rows[0].类别 || '') === 'wenjian') {
      const anQuanWenJianMing = String(chaXun.rows[0].原始文件名 || 'download')
        .replace(/[\r\n"\\]/g, '_')
      xiangYing.setHeader('Content-Disposition', `attachment; filename="${anQuanWenJianMing}"`)
      xiangYing.setHeader('X-Content-Type-Options', 'nosniff')
    }

    xiangYing.setHeader('ETag', `${EtagTou}${di}${EtagTou}`)
    xiangYing.setHeader('Cache-Control', HuanCunKongZhi)
    xiangYing.type(String(chaXun.rows[0].MIME))
    return xiangYing.sendFile(luJing, {
      etag: false,
      cacheControl: false,
      lastModified: false,
      dotfiles: 'deny',
    }, (cuoWu) => {
      if (cuoWu && !xiangYing.headersSent) {
        shiBaiXiangYing(xiangYing, 404, huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
        return
      }
      if (cuoWu) {
        xiangYing.end()
      }
    })
  } catch (cuoWu) {
    debug日志.error('媒体下载', '媒体下载失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
