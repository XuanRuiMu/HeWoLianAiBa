import fs from 'fs'
import { debug日志 } from '../utils/debug日志'
import { huoQuDuoMoTaiPeiZhi, huoQuGuiJiLiuDongMiYao } from '../config/多模态配置'
import { 数据库 } from '../数据库'
import { huoQuBenDiLuJing } from './媒体存储'

type ZhuanXieMock = ((canShu: { meiTiId: string }) => Promise<string | null>) | null

let zhuanXieMock: ZhuanXieMock = null

export function sheZhiYuYinZhuanXieMock(fn: ZhuanXieMock): void {
  zhuanXieMock = fn
}

function qingXi(wenBen: string | null | undefined): string {
  if (typeof wenBen !== 'string') return ''
  return wenBen.trim().slice(0, 500)
}

export async function mianFeiZhuanXieYuYin(canShu: { meiTiId: string }): Promise<string | null> {
  if (zhuanXieMock) {
    try {
      const jieGuo = await zhuanXieMock(canShu)
      return qingXi(jieGuo) || null
    } catch (cuoWu) {
      debug日志.warn('语音转写', '转写mock调用失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return null
    }
  }
  const meiTiId = (canShu.meiTiId || '').trim()
  if (!meiTiId) return null
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const miYao = huoQuGuiJiLiuDongMiYao()
  if (miYao.trim() === '') return null
  const moXing = peiZhi.guiJiLiuDongYuYinMoXing.trim()
  if (moXing === '') return null
  let sha256 = ''
  let mime = 'audio/webm'
  try {
    const chaXun = await 数据库.query(`SELECT "SHA256", "MIME" FROM "媒体文件" WHERE "ID" = $1 LIMIT 1`, [meiTiId])
    if (chaXun.rows.length === 0) return null
    sha256 = String(chaXun.rows[0].SHA256 || '').toLowerCase()
    if (chaXun.rows[0].MIME) mime = String(chaXun.rows[0].MIME)
  } catch {
    return null
  }
  const benDiLuJing = huoQuBenDiLuJing(sha256)
  if (!benDiLuJing) return null
  let yinPin: Buffer
  try {
    yinPin = await fs.promises.readFile(benDiLuJing)
  } catch {
    return null
  }
  if (!yinPin.length) return null
  const jiChu = peiZhi.guiJiLiuDongJiChuUrl.replace(/\/$/, '')
  const kongZhi = new AbortController()
  const dingShi = setTimeout(() => kongZhi.abort(), Math.max(peiZhi.qingQiuChaoShiHaoMiao, 120000))
  const houZhui = mime.includes('wav') ? '.wav' : mime.includes('mp3') || mime.includes('mpeg') ? '.mp3' : mime.includes('mp4') ? '.m4a' : mime.includes('ogg') ? '.ogg' : '.webm'
  try {
    const biaoDan = new FormData()
    biaoDan.append('model', moXing)
    biaoDan.append('file', new Blob([new Uint8Array(yinPin)], { type: mime }), `yuyin-${meiTiId}${houZhui}`)
    const xiangYing = await fetch(`${jiChu}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${miYao}` },
      body: biaoDan,
      signal: kongZhi.signal,
    })
    if (!xiangYing.ok) return null
    const shuJu = (await xiangYing.json()) as Record<string, unknown>
    const wenBen =
      typeof shuJu['wen_ben'] === 'string'
        ? String(shuJu['wen_ben'])
        : typeof shuJu['text'] === 'string'
          ? String(shuJu['text'])
          : ''
    return qingXi(wenBen) || null
  } catch (cuoWu) {
    debug日志.warn('语音转写', '免费转写失败，已降级', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return null
  } finally {
    clearTimeout(dingShi)
  }
}

export async function buQiYuYinZhuanXie<
  T extends { lei_xing: string; nei_rong: string; mei_ti_id?: string | null },
>(xiaoXi: T): Promise<T> {
  if (xiaoXi.lei_xing !== 'yuYin') return xiaoXi
  if ((xiaoXi.nei_rong || '').trim().length > 0) return xiaoXi
  const meiTiId = (xiaoXi.mei_ti_id || '').trim()
  if (!meiTiId) return xiaoXi
  let wenBen: string | null = null
  try {
    wenBen = await mianFeiZhuanXieYuYin({ meiTiId })
  } catch (cuoWu) {
    debug日志.warn('消息接口', '语音消息触发AI前同步转写失败', {
      xiang_qing: { cuo_wu: String(cuoWu) },
    })
    return xiaoXi
  }
  const zhengLi = (wenBen || '').trim()
  if (!zhengLi) return xiaoXi
  try {
    await 数据库.query(
      `UPDATE "消息" SET "内容" = $2 WHERE "媒体ID" = $1 AND "类型" = 'yuYin' AND "已撤回" = false AND COALESCE(BTRIM("内容"), '') = ''`,
      [meiTiId, zhengLi],
    )
  } catch (cuoWu) {
    debug日志.warn('消息接口', '语音转写回写失败（已带转写文本继续驱动AI）', {
      xiang_qing: { cuo_wu: String(cuoWu) },
    })
  }
  return { ...xiaoXi, nei_rong: zhengLi }
}

