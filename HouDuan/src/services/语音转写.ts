import fs from 'fs'
import { debug日志 } from '../utils/debug日志'
import { huoQuFFmpegLuJing, tiQuYinPinWeiWav } from '../utils/音频转码'
import { shiBieYuYin } from './DeepSeek官方工具'
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
      return qingXi(jieGuo)
    } catch (cuoWu) {
      debug日志.warn('语音转写', '转写mock调用失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return null
    }
  }
  const meiTiId = (canShu.meiTiId || '').trim()
  if (!meiTiId) return null
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
  let wavZiJie: Buffer | null = null
  if (mime === 'audio/wav' || mime === 'audio/x-wav') {
    wavZiJie = await fs.promises.readFile(benDiLuJing).catch(() => null)
  }
  if (!wavZiJie || !wavZiJie.length) {
    const ffmpegLuJing = await huoQuFFmpegLuJing()
    if (!ffmpegLuJing) return null
    wavZiJie = await tiQuYinPinWeiWav(benDiLuJing)
  }
  if (!wavZiJie || !wavZiJie.length) return null
  let jieGuo: Awaited<ReturnType<typeof shiBieYuYin>>
  try {
    jieGuo = await shiBieYuYin({ wavZiJie })
  } catch {
    return null
  }
  if (!jieGuo.cheng_gong) {
    debug日志.warn('语音转写', '官方ASR转写失败，已降级', { xiang_qing: { ti_shi: jieGuo.ti_shi || '' } })
    return null
  }
  return (jieGuo.wenBen || '').trim().slice(0, 500)
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

