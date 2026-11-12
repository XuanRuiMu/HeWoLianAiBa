import { createHash } from 'crypto'
import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import { huoQuBenDiLuJing } from './媒体存储'
import { baoCunJiaoSeMeiTiXiaoXi, type XiaoXiXinXi } from './消息'
import { BIAO_QING_BAO_YUN_XING } from '../config/表情包配置'

export interface XiTongBiaoQingXiang {
  id: string
  duanMing: string
  miaoShu: string
  qingXuBiaoQian: string
  shiYongChangJing: string
  sha256: string
  mime: string
}

interface BiaoQingHang {
  ID: unknown
  短名: unknown
  描述: unknown
  情绪标签: unknown
  适用场景: unknown
  SHA256: unknown
  MIME: unknown
}

function zhuangXiang(hang: BiaoQingHang): XiTongBiaoQingXiang {
  return {
    id: String(hang.ID),
    duanMing: String(hang.短名 || ''),
    miaoShu: String(hang.描述 || ''),
    qingXuBiaoQian: String(hang.情绪标签 || ''),
    shiYongChangJing: String(hang.适用场景 || ''),
    sha256: String(hang.SHA256 || '').toLowerCase(),
    mime: String(hang.MIME || 'image/png'),
  }
}

export async function houXuanXiTongBiaoQing(yiTu: string | null | undefined, shuLiang: number): Promise<XiTongBiaoQingXiang[]> {
  const youXiaoYiTu = typeof yiTu === 'string' && yiTu.trim() !== '' ? yiTu.trim() : null
  const canShu: unknown[] = []
  let tiaoJian = ''
  if (youXiaoYiTu) {
    canShu.push(`%${youXiaoYiTu}%`)
    tiaoJian = `AND ("情绪标签" LIKE $1 OR "适用场景" LIKE $1)`
  }
  canShu.push(shuLiang)
  const jieGuo = await 数据库.query(
    `SELECT "ID", "短名", "描述", "情绪标签", "适用场景", "SHA256", "MIME"
       FROM "系统表情"
      WHERE "启用" = TRUE ${tiaoJian}
      ORDER BY random()
      LIMIT $${canShu.length}`,
    canShu,
  )
  return jieGuo.rows.map((hang) => zhuangXiang(hang as BiaoQingHang))
}

export async function houXuanYongHuBiaoQing(yongHuId: string, shuLiang: number): Promise<Array<{ duanMing: string; miaoShu: string; meiTiId: string }>> {
  const jieGuo = await 数据库.query(
    `SELECT b."ID", b."短名", m."ID" AS "媒体ID"
       FROM "用户表情" b
       JOIN "媒体文件" m ON m."ID" = b."媒体ID"
      WHERE b."用户ID" = $1
      ORDER BY random()
      LIMIT $2`,
    [yongHuId, shuLiang],
  )
  return jieGuo.rows.map((hang: Record<string, unknown>) => ({
    duanMing: String(hang.短名 || ''),
    miaoShu: '用户收藏的表情包',
    meiTiId: String(hang.媒体ID || ''),
  })).filter((xiang) => xiang.duanMing !== '' && xiang.meiTiId !== '')
}

export function zuZhuangBiaoQingHouXuanKuai(
  xiTong: XiTongBiaoQingXiang[],
  yongHu: Array<{ duanMing: string; miaoShu: string; meiTiId: string }>,
): string {
  if (xiTong.length === 0 && yongHu.length === 0) return ''
  const hang: string[] = []
  for (const xiang of xiTong) {
    hang.push(
      `- [贴纸:${xiang.duanMing}] 描述:${xiang.miaoShu || '无'} | 情绪:${xiang.qingXuBiaoQian} | 场景:${xiang.shiYongChangJing || '通用'}`,
    )
  }
  for (const xiang of yongHu) {
    hang.push(`- [贴纸:${xiang.duanMing}] 描述:${xiang.miaoShu} | 对方收藏过的表情包`)
  }
  return [
    '【表情包候选】',
    '只有当你真的想发表情包时，才单独一行输出其中一条指令，格式必须完全一致；一条回复最多一张；不想发就不输出。',
    ...hang,
  ].join('\n')
}

export function jieXiBiaoQingZhiLing(neiRong: string): string | null {
  const piPei = /^\s*\[贴纸[:：]\s*([^\]】]{1,30})\]\s*$/.exec(neiRong.trim())
  if (!piPei) return null
  const duanMing = piPei[1].trim()
  return duanMing === '' ? null : duanMing
}

export async function chaZhaoBiaoQingAnDuanMing(
  yongHuId: string,
  duanMing: string,
): Promise<{ sha256: string; mime: string; meiTiId: string | null } | null> {
  const xiTong = await 数据库.query(
    `SELECT "SHA256", "MIME" FROM "系统表情" WHERE "短名" = $1 AND "启用" = TRUE LIMIT 1`,
    [duanMing],
  )
  if (xiTong.rows.length > 0) {
    return {
      sha256: String(xiTong.rows[0].SHA256).toLowerCase(),
      mime: String(xiTong.rows[0].MIME || 'image/png'),
      meiTiId: null,
    }
  }
  const yongHu = await 数据库.query(
    `SELECT m."ID", m."SHA256", m."MIME"
       FROM "用户表情" b
       JOIN "媒体文件" m ON m."ID" = b."媒体ID"
      WHERE b."用户ID" = $1 AND b."短名" = $2
      LIMIT 1`,
    [yongHuId, duanMing],
  )
  if (yongHu.rows.length > 0) {
    return {
      sha256: String(yongHu.rows[0].SHA256).toLowerCase(),
      mime: String(yongHu.rows[0].MIME || 'image/png'),
      meiTiId: String(yongHu.rows[0].ID),
    }
  }
  return null
}

async function queBaoYongHuMeiTiHang(
  yongHuId: string,
  sha256: string,
  mime: string,
): Promise<string | null> {
  const yiYou = await 数据库.query(
    `SELECT "ID" FROM "媒体文件" WHERE "上传者ID" = $1 AND "SHA256" = $2 LIMIT 1`,
    [yongHuId, sha256],
  )
  if (yiYou.rows.length > 0) return String(yiYou.rows[0].ID)
  const luJing = huoQuBenDiLuJing(sha256)
  if (!luJing) return null
  const fs = await import('fs')
  let daXiao = 0
  try {
    daXiao = (await fs.promises.stat(luJing)).size
  } catch {
    return null
  }
  const chaRu = await 数据库.query(
    `INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID")
     VALUES ($1, $2, $3, $4, 'biaoqingshu', $5)
     RETURNING "ID"`,
    [sha256, `biaoqing-${sha256.slice(0, 12)}`, mime, daXiao, yongHuId],
  )
  if (chaRu.rows.length === 0) return null
  return String(chaRu.rows[0].ID)
}

export async function faSongBiaoQingBaoXiaoXi(
  yongHuId: string,
  jiaoSeId: string,
  duanMing: string,
): Promise<XiaoXiXinXi | null> {
  const biaoQing = await chaZhaoBiaoQingAnDuanMing(yongHuId, duanMing)
  if (!biaoQing) {
    debug日志.warn('系统表情', '贴纸指令未命中表情库', {
      xiang_qing: { jiao_se_id: jiaoSeId, duan_ming: duanMing },
    })
    return null
  }
  let meiTiId = biaoQing.meiTiId
  if (!meiTiId) {
    meiTiId = await queBaoYongHuMeiTiHang(yongHuId, biaoQing.sha256, biaoQing.mime)
  }
  if (!meiTiId) return null
  return await baoCunJiaoSeMeiTiXiaoXi({
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    nei_rong: `[贴纸:${duanMing}]`,
    lei_xing: 'biaoQingBao',
    mei_ti_id: meiTiId,
  })
}

export function jiSuanBiaoQingSha256(huanChong: Buffer): string {
  return createHash('sha256').update(huanChong).digest('hex')
}

export async function shengChengBiaoQingHouXuanWenBen(
  yiTu: string | null | undefined,
  yongHuId: string,
): Promise<string> {
  if (!BIAO_QING_BAO_YUN_XING.daKai) return ''
  if (!yiTu) return ''
  try {
    const [xiTong, yongHu] = await Promise.all([
      houXuanXiTongBiaoQing(yiTu, BIAO_QING_BAO_YUN_XING.houXuanShuLiang),
      houXuanYongHuBiaoQing(yongHuId, BIAO_QING_BAO_YUN_XING.yongHuBiaoQingHouXuanShu),
    ])
    return zuZhuangBiaoQingHouXuanKuai(xiTong, yongHu)
  } catch (cuoWu) {
    debug日志.warn('系统表情', '候选生成失败，本轮不发表情包', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return ''
  }
}
