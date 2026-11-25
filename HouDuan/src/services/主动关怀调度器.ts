import { redis } from '../redis'
import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import { huoQuYongHuHuoDongFenBu, caiYangHuoDongShiKe } from './主动关怀时段'
import { huoQuChongTuZhuangTai } from './冲突弧'
import type { ChongTuZhuangTaiMing } from '../types'

const SuoQianZhui = 'zhu_dong_guan_huai_suo:'
const YiFaQianZhui = 'zhu_dong_guan_huai_yifa:'

export interface GuanHuaiXinXi {
  yaoFa: boolean
  neiRong: string
  leiXing: 'dangTian' | 'geTian' | 'liangTian'
}

function moRenNeiRong(leixing: GuanHuaiXinXi['leiXing']): string {
  if (leixing === 'dangTian') return '今天过得怎么样？'
  if (leixing === 'geTian') return '今天有没有好好吃饭呀？'
  return '这两天都在忙什么呀，我这边今天碰到件挺有意思的事，改天讲给你听。'
}

export async function anPaiGuanHuai(
  yongHuId: string,
  jiaoSeId: string,
  ioFaSong: (neiRong: string) => Promise<void>,
): Promise<void> {
  try {
    const suoJian = `${SuoQianZhui}${yongHuId}:${jiaoSeId}`
    const yiFa = await redis.get(`${YiFaQianZhui}${yongHuId}:${jiaoSeId}`)
    if (yiFa) return

    const zuiJin = await 数据库.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - MAX("创建时间"))) AS miao
       FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
      [yongHuId, jiaoSeId],
    )
    const jingMoMiao = Number(zuiJin.rows[0]?.miao || 0)
    if (jingMoMiao < 20 * 3600) return

    const fenBu = await huoQuYongHuHuoDongFenBu(yongHuId, jiaoSeId)
    const shiKe = caiYangHuoDongShiKe(fenBu, new Date())
    if (!shiKe) return

    const dengDaiHaoMiao = shiKe.getTime() - Date.now()
    if (dengDaiHaoMiao <= 0) return

    await redis.set(suoJian, '1', 'PX', dengDaiHaoMiao, 'NX')
    debug日志.info('主动关怀', '已安排 48 小时窗口内的主动关怀', {
      xiang_qing: { jiao_se_id: jiaoSeId, jing_mo_xiao_shi: Math.round(jingMoMiao / 3600), fa_song_shi_ke: shiKe.toISOString() },
    })

    setTimeout(async () => {
      try {
        const zaiFa = await redis.set(`${YiFaQianZhui}${yongHuId}:${jiaoSeId}`, '1', 'EX', 172800, 'NX')
        if (!zaiFa) return
        let chongTuZhuangTai: ChongTuZhuangTaiMing | null = null
        try {
          chongTuZhuangTai = await huoQuChongTuZhuangTai(yongHuId, jiaoSeId)
        } catch (chaXunCuoWu) {
          debug日志.warn('主动关怀', '发送时刻冲突档读取失败，按无冲突放行', {
            xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(chaXunCuoWu).slice(0, 200) },
          })
        }
        if (chongTuZhuangTai === 'yiDuBuHui') {
          debug日志.debug('主动关怀', '发送时刻冲突已到已读不回，放弃本次关怀', {
            xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId },
          })
          return
        }
        const leiXing: GuanHuaiXinXi['leiXing'] = jingMoMiao < 30 * 3600 ? 'dangTian' : jingMoMiao < 40 * 3600 ? 'geTian' : 'liangTian'
        const neiRong = moRenNeiRong(leiXing)
        await ioFaSong(neiRong)
        await jiLuGuanHuaiFaSong(yongHuId, jiaoSeId, neiRong)
        debug日志.info('主动关怀', '主动关怀消息已发送', { xiang_qing: { jiao_se_id: jiaoSeId, lei_xing: leiXing } })
      } catch (cuoWu) {
        debug日志.warn('主动关怀', '主动关怀发送失败', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
      }
    }, dengDaiHaoMiao)
  } catch (cuoWu) {
    debug日志.warn('主动关怀', '主动关怀安排失败', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
  }
}

export async function jiLuGuanHuaiFaSong(yongHuId: string, jiaoSeId: string, neiRong: string): Promise<void> {
  try {
    await 数据库.query(
      `INSERT INTO "通知" ("接收者ID", "标题", "内容", "已读") VALUES ($1, $2, $3, FALSE)`,
      [yongHuId, '来自 AI 的关心', neiRong],
    )
  } catch (cuoWu) {
    debug日志.warn('主动关怀', '关怀记录落库失败', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
  }
}

