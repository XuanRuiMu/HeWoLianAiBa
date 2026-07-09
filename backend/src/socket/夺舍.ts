import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'
import { 数据库 } from '../数据库'
import { baoCunJiaoSeXiaoXi } from '../services/AI输入准备'
import {
  sheZhiDuoSheZhuangTai,
  shanChuDuoSheZhuangTai,
  huoQuDuoSheGuanLiYuan,
  huoQuJiaoSeYongHuId,
} from '../services/夺舍'
import { peiZhi } from '../config'
import { jiLuSocketShiJian, jiLuXiaoXiCaoZuo } from '../utils/debug日志'

function panDuanShiGuanLiYuan(shouJiHao: string): boolean {
  return peiZhi.shenYongYuan.yunXuLieBiao.includes(shouJiHao)
}

function shengChengDuoSheFangJian(jiao_se_id: string): string {
  return `duo_she:${jiao_se_id}`
}

export function chuShiHuaDuoSheSocket(io: Server): void {
  io.on('connection', (socket: RenZhengSocket) => {
    const yongHu = socket.yong_hu
    if (!yongHu) return

    const shiGuanLiYuan = panDuanShiGuanLiYuan(yongHu.shouJiHao)
    jiLuSocketShiJian('Socket连接', yongHu.yongHuId, { socket_id: socket.id, shi_jian: 'duo_she', shi_guan_li_yuan: shiGuanLiYuan })

    socket.on('夺舍', async (jiao_se_id: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      if (!shiGuanLiYuan) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: '无权操作' })
        return
      }
      const jiaoSeId = typeof jiao_se_id === 'string' ? jiao_se_id : ''
      if (!jiaoSeId) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: '缺少角色ID' })
        return
      }

      await sheZhiDuoSheZhuangTai(jiaoSeId, yongHu.yongHuId)
      await 数据库.query(
        `INSERT INTO "夺舍日志" ("管理员ID", "角色ID") VALUES ($1, $2)`,
        [yongHu.yongHuId, jiaoSeId],
      )
      socket.join(shengChengDuoSheFangJian(jiaoSeId))
      jiLuSocketShiJian('夺舍', yongHu.yongHuId, { jiao_se_id: jiaoSeId, socket_id: socket.id })
      if (huiDiao) huiDiao({ cheng_gong: true, jiao_se_id: jiaoSeId })
    })

    socket.on('归还', async (jiao_se_id: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      if (!shiGuanLiYuan) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: '无权操作' })
        return
      }
      const jiaoSeId = typeof jiao_se_id === 'string' ? jiao_se_id : ''
      if (!jiaoSeId) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: '缺少角色ID' })
        return
      }

      const dangQianGuanLiYuan = await huoQuDuoSheGuanLiYuan(jiaoSeId)
      if (dangQianGuanLiYuan !== yongHu.yongHuId) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: '不是当前夺舍者' })
        return
      }

      await shanChuDuoSheZhuangTai(jiaoSeId)
      await 数据库.query(
        `UPDATE "夺舍日志" SET "结束时间" = NOW()
         WHERE "管理员ID" = $1 AND "角色ID" = $2 AND "结束时间" IS NULL`,
        [yongHu.yongHuId, jiaoSeId],
      )
      socket.leave(shengChengDuoSheFangJian(jiaoSeId))
      jiLuSocketShiJian('归还', yongHu.yongHuId, { jiao_se_id: jiaoSeId, socket_id: socket.id })
      if (huiDiao) huiDiao({ cheng_gong: true, jiao_se_id: jiaoSeId })
    })

    socket.on('开始输入', async (shuJu: unknown) => {
      if (!shiGuanLiYuan) return
      const canShu = shuJu as { jiao_se_id?: string }
      const jiaoSeId = canShu?.jiao_se_id
      if (!jiaoSeId) return

      const yongHuId = await huoQuJiaoSeYongHuId(jiaoSeId)
      if (!yongHuId) return

      jiLuSocketShiJian('开始输入', yongHu.yongHuId, { jiao_se_id: jiaoSeId, mu_biao_yong_hu_id: yongHuId, socket_id: socket.id })
      io.to(yongHuId).emit('对方正在输入', jiaoSeId)
    })

    socket.on('夺舍回复', async (shuJu: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      if (!shiGuanLiYuan) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: '无权操作' })
        return
      }
      const canShu = shuJu as { jiao_se_id?: string; nei_rong?: string; yong_hu_id?: string }
      const jiaoSeId = canShu?.jiao_se_id
      const neiRong = canShu?.nei_rong
      const yongHuId = canShu?.yong_hu_id
      if (!jiaoSeId || !neiRong || !yongHuId) {
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: '缺少参数' })
        return
      }

      try {
        const xiaoXi = await baoCunJiaoSeXiaoXi({ yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, nei_rong: neiRong })
        io.to(yongHuId).emit('角色回复', { 角色ID: jiaoSeId, 消息列表: [xiaoXi] })
        jiLuXiaoXiCaoZuo('夺舍回复发送', yongHuId, jiaoSeId, 'jiaose', { socket_id: socket.id, guan_li_yuan_id: yongHu.yongHuId })
        if (huiDiao) huiDiao({ cheng_gong: true, xiao_xi: xiaoXi })
      } catch (cuoWu) {
        console.error('夺舍回复保存失败', cuoWu)
        if (huiDiao) huiDiao({ cheng_gong: false, ti_shi: '保存失败' })
      }
    })

    socket.on('disconnect', () => {
      jiLuSocketShiJian('Socket断开', yongHu.yongHuId, { socket_id: socket.id, shi_jian: 'duo_she' })
    })
  })
}

export async function zhuanFaYongHuXiaoXiGeiGuanLiYuan(
  io: Server,
  jiao_se_id: string,
  yong_hu_id: string,
  xiao_xi: unknown,
): Promise<void> {
  io.to(shengChengDuoSheFangJian(jiao_se_id)).emit('夺舍消息', {
    jiao_se_id,
    yong_hu_id,
    xiao_xi,
  })
}
