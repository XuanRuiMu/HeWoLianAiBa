import type { Server } from 'socket.io'
import { 数据库 } from '../数据库'
import { huoQuIo } from '../socket/io'
import { huoQuFanYi } from '../config/translations'
import { jiLuShenJiRiZhi } from './审计日志'
import type { TongZhi } from '../types'

export interface TongZhiLieBiaoJieGuo {
  lie_biao: TongZhi[]
  wei_du_shu: number
}

export interface ChuangJianTongZhiCanShu {
  fa_song_zhe_id?: string | null
  jie_shou_zhe_id: string
  biao_ti: string
  nei_rong: string
}

export interface GuanLiYuanFaSongTongZhiCanShu {
  guan_li_yuan_id: string
  mu_biao: string
  jie_shou_zhe_ids?: string[]
  biao_ti: string
  nei_rong: string
  ip: string
  io?: Server | null
}

export interface GuanLiYuanFaSongTongZhiJieGuo {
  cheng_gong: boolean
  fa_song_shu?: number
  zhuang_tai_ma?: number
  ti_shi?: string
}

function yingSheTongZhi(hang: Record<string, unknown>): TongZhi {
  return {
    id: String(hang.ID),
    fa_song_zhe_id: hang.发送者ID ? String(hang.发送者ID) : null,
    jie_shou_zhe_id: String(hang.接收者ID),
    biao_ti: String(hang.标题),
    nei_rong: String(hang.内容),
    yi_du: Boolean(hang.已读),
    chuang_jian_shi_jian: hang.创建时间 ? String(hang.创建时间) : new Date().toISOString(),
    yi_du_shi_jian: hang.已读时间 ? String(hang.已读时间) : null,
  }
}

export async function huoQuTongZhiLieBiao(
  yong_hu_id: string,
  xian_shi_shu: number = 100,
): Promise<TongZhiLieBiaoJieGuo> {
  const shangXian = Math.min(Math.max(1, xian_shi_shu), 100)
  const lieBiaoJieGuo = await 数据库.query(
    `SELECT * FROM "通知" WHERE "接收者ID" = $1 ORDER BY "创建时间" DESC LIMIT $2`,
    [yong_hu_id, shangXian],
  )
  const weiDuJieGuo = await 数据库.query(
    `SELECT COUNT(*) FROM "通知" WHERE "接收者ID" = $1 AND "已读" = false`,
    [yong_hu_id],
  )
  return {
    lie_biao: lieBiaoJieGuo.rows.map(yingSheTongZhi),
    wei_du_shu: parseInt(weiDuJieGuo.rows[0].count as string, 10),
  }
}

export async function biaoJiTongZhiYiDu(
  yong_hu_id: string,
  tong_zhi_id: string,
): Promise<TongZhi | null> {
  const jieGuo = await 数据库.query(
    `UPDATE "通知" SET "已读" = true, "已读时间" = NOW()
     WHERE "ID" = $1 AND "接收者ID" = $2 AND "已读" = false
     RETURNING *`,
    [tong_zhi_id, yong_hu_id],
  )
  if (jieGuo.rows.length === 0) return null
  return yingSheTongZhi(jieGuo.rows[0])
}

export async function biaoJiSuoYouTongZhiYiDu(yong_hu_id: string): Promise<void> {
  await 数据库.query(
    `UPDATE "通知" SET "已读" = true, "已读时间" = NOW()
     WHERE "接收者ID" = $1 AND "已读" = false`,
    [yong_hu_id],
  )
}

export async function chuangJianTongZhi(
  canShu: ChuangJianTongZhiCanShu,
  io?: Server | null,
): Promise<TongZhi> {
  const jieGuo = await 数据库.query(
    `INSERT INTO "通知" ("发送者ID", "接收者ID", "标题", "内容")
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [canShu.fa_song_zhe_id || null, canShu.jie_shou_zhe_id, canShu.biao_ti, canShu.nei_rong],
  )
  const tongZhi = yingSheTongZhi(jieGuo.rows[0])
  const socketIo = io || huoQuIo()
  if (socketIo) {
    socketIo.to(canShu.jie_shou_zhe_id).emit('通知新', tongZhi)
  }
  return tongZhi
}

export async function guanLiYuanFaSongTongZhi(
  canShu: GuanLiYuanFaSongTongZhiCanShu,
): Promise<GuanLiYuanFaSongTongZhiJieGuo> {
  if (canShu.biao_ti.length > 100) {
    return {
      cheng_gong: false,
      zhuang_tai_ma: 400,
      ti_shi: huoQuFanYi('tongZhi', 'biaoTiGuoChang'),
    }
  }
  if (canShu.nei_rong.length > 2000) {
    return {
      cheng_gong: false,
      zhuang_tai_ma: 400,
      ti_shi: huoQuFanYi('tongZhi', 'zhengWenGuoChang'),
    }
  }

  let jieShouZheIds: string[] = []
  if (canShu.mu_biao === '全员') {
    const suoYouYongHu = await 数据库.query(`SELECT "ID" FROM "用户"`)
    jieShouZheIds = suoYouYongHu.rows.map((hang) => String(hang.ID))
  } else if (canShu.mu_biao === '指定') {
    jieShouZheIds = (canShu.jie_shou_zhe_ids || []).filter(
      (id) => typeof id === 'string' && id.length > 0,
    )
  } else {
    return {
      cheng_gong: false,
      zhuang_tai_ma: 400,
      ti_shi: huoQuFanYi('tongZhi', 'muBiaoBuHeFa'),
    }
  }

  if (jieShouZheIds.length === 0) {
    return {
      cheng_gong: false,
      zhuang_tai_ma: 400,
      ti_shi: huoQuFanYi('tongZhi', 'meiYouJieShouZhe'),
    }
  }

  const io = canShu.io || huoQuIo()
  let faSongShu = 0
  for (const jieShouZheId of jieShouZheIds) {
    try {
      await chuangJianTongZhi(
        {
          fa_song_zhe_id: canShu.guan_li_yuan_id,
          jie_shou_zhe_id: jieShouZheId,
          biao_ti: canShu.biao_ti,
          nei_rong: canShu.nei_rong,
        },
        io,
      )
      faSongShu++
    } catch (cuoWu) {
      const pgCuoWu = cuoWu as { code?: string }
      if (pgCuoWu.code !== '23503') {
        throw cuoWu
      }
    }
  }

  await jiLuShenJiRiZhi({
    yong_hu_id: canShu.guan_li_yuan_id,
    ip: canShu.ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'faSongTongZhi'),
    xiang_qing: {
      mu_biao: canShu.mu_biao,
      jie_shou_ren_shu: faSongShu,
      biao_ti: canShu.biao_ti,
    },
    lei_xing: '管理',
  })

  return {
    cheng_gong: true,
    fa_song_shu: faSongShu,
  }
}
