import { Router } from 'express'
import type { Request, Response } from 'express'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { huoQuIo } from '../socket/io'
import type { RenZhengQingQiu } from '../middleware/认证'
import {
  huoQuTongZhiLieBiao,
  biaoJiTongZhiYiDu,
  biaoJiSuoYouTongZhiYiDu,
  guanLiYuanFaSongTongZhi,
} from '../services/通知'

const luYou = Router()

function huoQuIp(qingQiu: Request): string {
  const xForwardedFor = qingQiu.headers['x-forwarded-for']
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim()
  }
  return qingQiu.ip || '127.0.0.1'
}

function jieXiZiFuChuan(
  body: Record<string, unknown>,
  jian: string,
  tianChongJian?: string,
): string {
  const zhi = body[jian]
  if (typeof zhi === 'string') return zhi
  if (tianChongJian && typeof body[tianChongJian] === 'string') return String(body[tianChongJian])
  return ''
}

function jieXiZiFuChuanShuZu(body: Record<string, unknown>, jian: string): string[] {
  const zhi = body[jian]
  if (Array.isArray(zhi)) {
    return zhi.filter((xiang) => typeof xiang === 'string') as string[]
  }
  return []
}

function huoQuShuZi(zhi: unknown, moRen: number): number {
  if (typeof zhi === 'number') return zhi
  if (typeof zhi === 'string') {
    const jieXi = parseInt(zhi, 10)
    return Number.isNaN(jieXi) ? moRen : jieXi
  }
  return moRen
}

async function panDuanShiGuanLiYuan(yong_hu_id: string): Promise<boolean> {
  const jieGuo = await 数据库.query(
    `SELECT "管理员" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [yong_hu_id],
  )
  if (jieGuo.rows.length === 0) return false
  return Boolean(jieGuo.rows[0].管理员)
}

luYou.get(
  '/',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const xianShiShu = huoQuShuZi(qingQiu.query.xian_shi_shu, 100)

    try {
      const jieGuo = await huoQuTongZhiLieBiao(yongHu.yongHuId, xianShiShu)
      return chengGongXiangYing(xiangYing, {
        lie_biao: jieGuo.lie_biao,
        wei_du_shu: jieGuo.wei_du_shu,
      })
    } catch (cuoWu) {
      console.error('获取通知列表失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.put(
  '/:tongZhiId/已读',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const tongZhiId = String(qingQiu.params.tongZhiId || '')
    if (!tongZhiId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jieGuo = await biaoJiTongZhiYiDu(yongHu.yongHuId, tongZhiId)
      if (!jieGuo) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      console.error('标记通知已读失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.put(
  '/全部已读',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    try {
      await biaoJiSuoYouTongZhiYiDu(yongHu.yongHuId)
      return chengGongXiangYing(xiangYing, null)
    } catch (cuoWu) {
      console.error('标记全部已读失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/发送',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const shiGuanLiYuan = await panDuanShiGuanLiYuan(yongHu.yongHuId)
    if (!shiGuanLiYuan) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const body = qingQiu.body as Record<string, unknown>
    const muBiao = jieXiZiFuChuan(body, '目标', 'mu_biao')
    const biaoTi = jieXiZiFuChuan(body, '标题', 'biao_ti')
    const neiRong = jieXiZiFuChuan(body, '内容', 'nei_rong')
    const jieShouZheIds = jieXiZiFuChuanShuZu(body, '接收者ID列表')

    if (!muBiao || !biaoTi || !neiRong) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jieGuo = await guanLiYuanFaSongTongZhi({
        guan_li_yuan_id: yongHu.yongHuId,
        mu_biao: muBiao,
        jie_shou_zhe_ids: jieShouZheIds,
        biao_ti: biaoTi,
        nei_rong: neiRong,
        ip: huoQuIp(qingQiu),
        io: huoQuIo(),
      })
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(
          xiangYing,
          jieGuo.zhuang_tai_ma || 400,
          jieGuo.ti_shi || huoQuFanYi('tongZhi', 'faSongShiBai'),
        )
      }
      return chengGongXiangYing(xiangYing, { fa_song_shu: jieGuo.fa_song_shu })
    } catch (cuoWu) {
      console.error('管理员发送通知失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
