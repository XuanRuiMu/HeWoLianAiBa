import { Readable } from 'stream'
import { debug日志 } from '../utils/debug日志'
import { huoQuFanYi } from '../config/translations'
import { huoQuDuoMoTaiPeiZhi } from '../config/多模态配置'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuWanZhengHaoGanDu } from './好感度'
import { shengChengTuXiang } from './图像生成'
import { liuShiBaoCunMeiTi } from './媒体存储'
import { baoCunJiaoSeMeiTiXiaoXi } from './消息'
import { huoQuIo } from '../socket/io'

export interface ZhuDongShengTuPanDing {
  zongFen: number
  waiMao: string
  fengCun: boolean
  suiJiShu: number
  gaiLv: number
  zuiDiFen: number
}

export function panDuanKeFouZhuDongShengTu(panDing: ZhuDongShengTuPanDing): boolean {
  if (panDing.fengCun) return false
  if (!panDing.waiMao || panDing.waiMao.trim() === '') return false
  if (panDing.zongFen < panDing.zuiDiFen) return false
  return panDing.suiJiShu < panDing.gaiLv
}

function huoQuRiQi(): string {
  return new Date().toISOString().slice(0, 10)
}

async function zhuDongShengTuJinRiYiYong(yongHuId: string): Promise<number> {
  const zhi = Number(await redis.get(`zhu_dong_sheng_tu:${yongHuId}:${huoQuRiQi()}`)) || 0
  return zhi
}

async function jiShuZhuDongShengTu(yongHuId: string): Promise<void> {
  const jian = `zhu_dong_sheng_tu:${yongHuId}:${huoQuRiQi()}`
  const zhi = await redis.incr(jian)
  if (zhi === 1) await redis.expire(jian, 2 * 24 * 60 * 60)
}

export async function huoQuZhuDongShengTuZiGe(
  yongHuId: string,
  jiaoSeId: string,
): Promise<{ keYi: boolean; zongFen: number; waiMao: string; fengCun: boolean }> {
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  const haoGanDu = await huoQuWanZhengHaoGanDu(yongHuId, jiaoSeId)
  if (!haoGanDu) return { keYi: false, zongFen: 0, waiMao: '', fengCun: true }
  const jiaoSe = await 数据库.query(`SELECT "外貌", "封存" FROM "角色" WHERE "ID" = $1 AND "用户ID" = $2 LIMIT 1`, [
    jiaoSeId,
    yongHuId,
  ])
  if (jiaoSe.rows.length === 0) return { keYi: false, zongFen: 0, waiMao: '', fengCun: true }
  const waiMao = String(jiaoSe.rows[0].外貌 || '')
  const fengCun = Boolean(jiaoSe.rows[0].封存)
  const keYi = panDuanKeFouZhuDongShengTu({
    zongFen: haoGanDu.zong_fen,
    waiMao,
    fengCun,
    suiJiShu: 0,
    gaiLv: 1,
    zuiDiFen: peiZhi.zhuDongShengTuZuiDiZongFen,
  })
  return { keYi, zongFen: haoGanDu.zong_fen, waiMao, fengCun }
}

export async function changShiZhuDongShengTu(canShu: {
  yongHuId: string
  jiaoSeId: string
  huiFuWenBen: string
  suiJiShu?: number
}): Promise<boolean> {
  const peiZhi = huoQuDuoMoTaiPeiZhi()
  if (!peiZhi.tuXiangShengChengQiYong) return false
  let ziGe: { keYi: boolean; zongFen: number; waiMao: string; fengCun: boolean }
  try {
    ziGe = await huoQuZhuDongShengTuZiGe(canShu.yongHuId, canShu.jiaoSeId)
  } catch (cuoWu) {
    debug日志.warn('主动多模态', '主动生图资格查询失败，本轮跳过', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return false
  }
  const suiJiShu = canShu.suiJiShu ?? Math.random()
  if (
    !panDuanKeFouZhuDongShengTu({
      zongFen: ziGe.zongFen,
      waiMao: ziGe.waiMao,
      fengCun: ziGe.fengCun,
      suiJiShu,
      gaiLv: peiZhi.zhuDongShengTuGaiLv,
      zuiDiFen: peiZhi.zhuDongShengTuZuiDiZongFen,
    })
  ) {
    return false
  }
  try {
    if ((await zhuDongShengTuJinRiYiYong(canShu.yongHuId)) >= peiZhi.zhuDongShengTuRiShangXian) return false
    const tiShiCi = `${ziGe.waiMao}，${canShu.huiFuWenBen}`.trim().slice(0, 200)
    const jieGuo = await shengChengTuXiang({ tiShiCi, yongHuId: canShu.yongHuId })
    if (!jieGuo.cheng_gong || !jieGuo.tuPianZiJie) return false
    const cunChu = await liuShiBaoCunMeiTi(
      Readable.from(jieGuo.tuPianZiJie),
      `zhudong-${Date.now()}.png`,
      jieGuo.mime || 'image/png',
      'tupian',
      canShu.yongHuId,
    )
    const xiaoXi = await baoCunJiaoSeMeiTiXiaoXi({
      yong_hu_id: canShu.yongHuId,
      jiao_se_id: canShu.jiaoSeId,
      nei_rong: huoQuFanYi('liaoTian', 'zhuDongFenXiangTuPian'),
      lei_xing: 'tuPian',
      mei_ti_id: cunChu.mediaId,
    })
    await jiShuZhuDongShengTu(canShu.yongHuId)
    const io = huoQuIo()
    if (io) io.to(canShu.yongHuId).emit('角色回复', { 角色ID: canShu.jiaoSeId, 消息列表: [xiaoXi] })
    return true
  } catch (cuoWu) {
    debug日志.warn('主动多模态', '主动生图失败，本轮跳过', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return false
  }
}
