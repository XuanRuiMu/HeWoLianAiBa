import type { Server } from 'socket.io'
import { chuShiHuaRiZhiTuiSongSocket } from './日志推送'

let io: Server | null = null

export function sheZhiIo(serverIo: Server): void {
  io = serverIo
  chuShiHuaRiZhiTuiSongSocket(serverIo)
}

export function huoQuIo(): Server | null {
  return io
}
