import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'
import { jiLuSocketShiJian } from '../utils/debug日志'

export function chuShiHuaTongZhiSocket(io: Server): void {
  io.on('connection', (socket: RenZhengSocket) => {
    const 用户ID = socket.yong_hu?.用户ID
    if (!用户ID) {
      socket.disconnect(true)
      return
    }

    jiLuSocketShiJian('Socket连接', 用户ID, { socket_id: socket.id, shi_jian: 'tong_zhi' })
    socket.join(用户ID)

    socket.on('disconnect', () => {
      jiLuSocketShiJian('Socket断开', 用户ID, { socket_id: socket.id, shi_jian: 'tong_zhi' })
    })
  })
}
