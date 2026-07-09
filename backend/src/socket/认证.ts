import type { Socket } from 'socket.io'
import { yanZhengLingPai, type LingPaiZaiHe } from '../utils/jwt'
import { debug日志 } from '../utils/debug日志'

export interface RenZhengSocket extends Socket {
  yong_hu?: LingPaiZaiHe
}

export function renZhengSocketZhongJianJian(
  socket: RenZhengSocket,
  xiaYiBu: (err?: Error) => void,
): void {
  try {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) {
      debug日志.warn('Socket认证', '连接缺少令牌', { xiang_qing: { socket_id: socket.id } })
      return xiaYiBu(new Error('未授权'))
    }
    const zaiHe = yanZhengLingPai(token)
    socket.yong_hu = zaiHe
    xiaYiBu()
  } catch {
    debug日志.warn('Socket认证', '令牌验证失败', { xiang_qing: { socket_id: socket.id } })
    xiaYiBu(new Error('令牌无效'))
  }
}
