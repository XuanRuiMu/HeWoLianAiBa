import { Router } from 'express'
import type { Response } from 'express'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { liaoTianXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import {
  huoQuGongKaiHaoGanDuXinXi,
  huoQuWanZhengHaoGanDu,
  gengXinHaoGanDu,
  sheZhiMiJiHaoGanDu,
} from '../services/好感度'

const luYou = Router()

async function panDuanShiGuanLiYuan(yong_hu_id: string): Promise<boolean> {
  const jieGuo = await 数据库.query(`SELECT "管理员" FROM "用户" WHERE "ID" = $1 LIMIT 1`, [yong_hu_id])
  if (jieGuo.rows.length === 0) return false
  return Boolean(jieGuo.rows[0].管理员)
}

function jieXiZiFuChuan(body: Record<string, unknown>, jian: string, tianChongJian?: string): string {
  const zhi = body[jian]
  if (typeof zhi === 'string') return zhi
  if (tianChongJian && typeof body[tianChongJian] === 'string') return String(body[tianChongJian])
  return ''
}

luYou.get(
  '/:jiaoSeId',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jieGuo = await huoQuGongKaiHaoGanDuXinXi(yongHu.yongHuId, jiaoSeId)
      if (!jieGuo) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      console.error('获取好感度失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.get(
  '/:jiaoSeId/详情',
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const shiGuanLiYuan = await panDuanShiGuanLiYuan(yongHu.yongHuId)
      if (!shiGuanLiYuan) {
        return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('tongYong', 'weiShouQuan'))
      }

      const jieGuo = await huoQuWanZhengHaoGanDu(yongHu.yongHuId, jiaoSeId)
      if (!jieGuo) {
        return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
      }
      return chengGongXiangYing(xiangYing, jieGuo)
    } catch (cuoWu) {
      console.error('获取好感度详情失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/:jiaoSeId/更新',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
    const body = qingQiu.body as Record<string, unknown>

    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    const bianHua = {
      xin_ren_du_bian_hua: Number(body['信任度变化'] ?? body['xin_ren_du_bian_hua'] ?? 0),
      qin_mi_du_bian_hua: Number(body['亲密度变化'] ?? body['qin_mi_du_bian_hua'] ?? 0),
      qu_wei_du_bian_hua: Number(body['趣味度变化'] ?? body['qu_wei_du_bian_hua'] ?? 0),
      guan_huai_du_bian_hua: Number(body['关怀度变化'] ?? body['guan_huai_du_bian_hua'] ?? 0),
    }

    const buHeFaWeiDu = Object.values(bianHua).find(
      (value) => !Number.isInteger(value) || value < -3 || value > 3,
    )
    if (buHeFaWeiDu !== undefined) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }

    try {
      const jieGuo = await gengXinHaoGanDu(yongHu.yongHuId, jiaoSeId, bianHua)
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
      return chengGongXiangYing(xiangYing, jieGuo.hao_gan_du)
    } catch (cuoWu) {
      console.error('更新好感度失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

luYou.post(
  '/:jiaoSeId/秘籍',
  liaoTianXianLiu,
  async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
    const yongHu = qingQiu.yong_hu
    if (!yongHu) {
      return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    }

    const jiaoSeId = String(qingQiu.params.jiaoSeId || '')
    const body = qingQiu.body as Record<string, unknown>
    const miLing = jieXiZiFuChuan(body, '秘籍', 'mi_ji')

    if (!jiaoSeId) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'))
    }

    try {
      const jieGuo = await sheZhiMiJiHaoGanDu(yongHu.yongHuId, jiaoSeId, miLing)
      if (!jieGuo.cheng_gong) {
        return shiBaiXiangYing(xiangYing, jieGuo.zhuang_tai_ma || 400, jieGuo.ti_shi || huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
      return chengGongXiangYing(xiangYing, jieGuo.hao_gan_du)
    } catch (cuoWu) {
      console.error('秘籍设置好感度失败', cuoWu)
      return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
    }
  },
)

export default luYou
