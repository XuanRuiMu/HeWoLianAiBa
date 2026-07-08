import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'

export function chuShiHuaTongZhiSocket(io: Server): void {
  io.on('connection', (socket: RenZhengSocket) => {
    const yongHuId = socket.yong_hu?.yongHuId
    if (!yongHuId) {
      socket.disconnect(true)
      return
    }

    socket.join(yongHuId)
  })
}
