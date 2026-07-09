import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'
import { AI回复调度器 } from '../services/AI回复调度器'
import { huoQuJiaoSeIELeiXing } from '../services/AI输入准备'
import { jiaoSeShiFouBeiDuoShe } from '../services/夺舍'
import { zhuanFaYongHuXiaoXiGeiGuanLiYuan } from './夺舍'
import { 数据库 } from '../数据库'
import { jiLuSocketShiJian, jiLuXiaoXiCaoZuo } from '../utils/debug日志'

interface TiaoDuQiJiLu {
  角色ID: string
  调度器: AI回复调度器
}

const socketTiaoDuQiMap = new Map<string, TiaoDuQiJiLu>()
const jiaoSeTiaoDuQiMap = new Map<string, TiaoDuQiJiLu>()

function shengChengJiaoSeTiaoDuQiJian(yong_hu_id: string, jiao_se_id: string): string {
  return `${yong_hu_id}:${jiao_se_id}`
}

async function huoQuZuiJinYongHuXiaoXi(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<Record<string, unknown> | null> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "消息"
     WHERE "用户ID" = $1 AND "角色ID" = $2 AND "发送者" = 'yonghu'
     ORDER BY "创建时间" DESC LIMIT 1`,
    [yong_hu_id, jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  const row = jieGuo.rows[0]
  return {
    id: String(row.ID),
    hui_hua_id: String(row.角色ID),
    fa_song_zhe_id: String(row.用户ID),
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: String(row.内容),
    lei_xing: String(row.类型 || 'wenben'),
    shi_jian: row.创建时间 ? String(row.创建时间) : new Date().toISOString(),
    yi_du: Boolean(row.已读),
    yi_che_hui: Boolean(row.已撤回),
  }
}

export function huoQuJiaoSeTiaoDuQi(
  yong_hu_id: string,
  jiao_se_id: string,
): AI回复调度器 | null {
  return jiaoSeTiaoDuQiMap.get(shengChengJiaoSeTiaoDuQiJian(yong_hu_id, jiao_se_id))?.调度器 || null
}

export function chongZhiJiaoSeTiaoDuQi(yong_hu_id: string, jiao_se_id: string): void {
  const jiLu = jiaoSeTiaoDuQiMap.get(shengChengJiaoSeTiaoDuQiJian(yong_hu_id, jiao_se_id))
  if (jiLu) {
    jiLu.调度器.处理用户消息()
  }
}

export function zhongDuanJiaoSeTiaoDuQi(yong_hu_id: string, jiao_se_id: string): void {
  const jiLu = jiaoSeTiaoDuQiMap.get(shengChengJiaoSeTiaoDuQiJian(yong_hu_id, jiao_se_id))
  if (jiLu) {
    jiLu.调度器.重置()
  }
}

export function 初始化聊天Socket(io: Server): void {
  io.on('connection', (socket: RenZhengSocket) => {
    const 用户ID = socket.yong_hu?.yongHuId
    if (!用户ID) {
      socket.disconnect(true)
      return
    }

    jiLuSocketShiJian('Socket连接', 用户ID, { socket_id: socket.id, shi_jian: 'liao_tian' })

    socket.on('加入聊天', async (角色ID: unknown) => {
      const 角色ID字符串 = typeof 角色ID === 'string' ? 角色ID : ''
      if (!角色ID字符串) {
        socket.emit('错误', '缺少角色ID')
        return
      }

      const ie类型 = await huoQuJiaoSeIELeiXing(角色ID字符串)
      if (!ie类型) {
        socket.emit('错误', '角色不存在')
        return
      }

      socket.join(用户ID)

      const jiuJiLu = socketTiaoDuQiMap.get(socket.id)
      if (jiuJiLu) {
        jiuJiLu.调度器.重置()
        jiaoSeTiaoDuQiMap.delete(shengChengJiaoSeTiaoDuQiJian(用户ID, jiuJiLu.角色ID))
      }

      const 调度器 = new AI回复调度器(角色ID字符串, 用户ID, ie类型, io)
      const xinJiLu = { 角色ID: 角色ID字符串, 调度器 }
      socketTiaoDuQiMap.set(socket.id, xinJiLu)
      jiaoSeTiaoDuQiMap.set(shengChengJiaoSeTiaoDuQiJian(用户ID, 角色ID字符串), xinJiLu)
      jiLuSocketShiJian('加入聊天', 用户ID, { jiao_se_id: 角色ID字符串, socket_id: socket.id })
    })

    socket.on('发送消息', async () => {
      const jiLu = socketTiaoDuQiMap.get(socket.id)
      if (!jiLu) return

      jiLuXiaoXiCaoZuo('用户发送消息触发AI处理', 用户ID, jiLu.角色ID, 'yonghu', { socket_id: socket.id })

      const beiDuoShe = await jiaoSeShiFouBeiDuoShe(jiLu.角色ID)
      if (beiDuoShe) {
        const zuiJinXiaoXi = await huoQuZuiJinYongHuXiaoXi(用户ID, jiLu.角色ID)
        if (zuiJinXiaoXi) {
          await zhuanFaYongHuXiaoXiGeiGuanLiYuan(io, jiLu.角色ID, 用户ID, zuiJinXiaoXi)
        }
        return
      }

      jiLu.调度器.处理用户消息()
    })

    socket.on('disconnect', () => {
      const jiLu = socketTiaoDuQiMap.get(socket.id)
      if (jiLu) {
        jiLu.调度器.重置()
        jiaoSeTiaoDuQiMap.delete(shengChengJiaoSeTiaoDuQiJian(用户ID, jiLu.角色ID))
        socketTiaoDuQiMap.delete(socket.id)
      }
      jiLuSocketShiJian('Socket断开', 用户ID, { socket_id: socket.id })
    })
  })
}
