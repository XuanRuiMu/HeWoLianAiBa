import { debug日志 } from '../utils/debug日志'
import type { Response, NextFunction } from 'express'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import type { RenZhengQingQiu } from './认证'

const huanCunYouXiaoQiHaoMiao = 30 * 1000
const huanCunRongLiangShangXian = 5000
const guanLiYuanHuanCun = new Map<string, { zhi: boolean; daoQiHaoMiao: number }>()

export function qingChuGuanLiYuanHuanCun(yongHuId?: string): void {
  if (yongHuId) {
    guanLiYuanHuanCun.delete(yongHuId)
    return
  }
  guanLiYuanHuanCun.clear()
}

function xieRuHuanCun(yongHuId: string, zhi: boolean, daoQiHaoMiao: number): void {
  if (guanLiYuanHuanCun.size >= huanCunRongLiangShangXian) {
    const xianZaiHaoMiao = Date.now()
    for (const [jian, xiang] of guanLiYuanHuanCun) {
      if (xiang.daoQiHaoMiao <= xianZaiHaoMiao) {
        guanLiYuanHuanCun.delete(jian)
      }
    }
    if (guanLiYuanHuanCun.size >= huanCunRongLiangShangXian) {
      guanLiYuanHuanCun.clear()
    }
  }
  guanLiYuanHuanCun.set(yongHuId, { zhi, daoQiHaoMiao })
}

export async function anYongHuIdPanDuanGuanLiYuan(yongHuId: string): Promise<boolean> {
  const xianZaiHaoMiao = Date.now()
  const huanCun = guanLiYuanHuanCun.get(yongHuId)
  if (huanCun && huanCun.daoQiHaoMiao > xianZaiHaoMiao) {
    return huanCun.zhi
  }
  const jieGuo = await 数据库.query(
    `SELECT "管理员" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [yongHuId],
  )
  if (jieGuo.rows.length === 0) {
    return false
  }
  const shiGuanLiYuan = Boolean(jieGuo.rows[0].管理员)
  xieRuHuanCun(yongHuId, shiGuanLiYuan, xianZaiHaoMiao + huanCunYouXiaoQiHaoMiao)
  return shiGuanLiYuan
}

export async function yanZhengGuanLiYuan(
  qingQiu: RenZhengQingQiu,
  xiangYing: Response,
  xiaYiBu: NextFunction,
): Promise<void> {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    return
  }

  try {
    if (!(await anYongHuIdPanDuanGuanLiYuan(yongHu.yongHuId))) {
      shiBaiXiangYing(xiangYing, 403, huoQuFanYi('tongYong', 'weiShouQuan'))
      return
    }

    xiaYiBu()
  } catch (cuoWu) {
    debug日志.error('管理员认证', '管理员身份校验失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
}
