import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'
import { jiLuSocketShiJian } from '../utils/debug日志'

export function chuShiHuaTongZhiSocket(io: Server): void {
  io.on('connection', (socket: RenZhengSocket) => {
    const yongHuId = socket.yong_hu?.yongHuId
    if (!yongHuId) {
      socket.disconnect(true)
      return
    }

    jiLuSocketShiJian('Socket连接', yongHuId, { socket_id: socket.id, shi_jian: 'tong_zhi' })
    socket.join(yongHuId)

    socket.on('disconnect', () => {
      jiLuSocketShiJian('Socket断开', yongHuId, { socket_id: socket.id, shi_jian: 'tong_zhi' })
    })
  })
}
