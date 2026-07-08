import type { Socket } from 'socket.io'
import { yanZhengLingPai, type LingPaiZaiHe } from '../utils/jwt'

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
      return xiaYiBu(new Error('未授权'))
    }
    const zaiHe = yanZhengLingPai(token)
    socket.yong_hu = zaiHe
    xiaYiBu()
  } catch {
    xiaYiBu(new Error('令牌无效'))
  }
}
