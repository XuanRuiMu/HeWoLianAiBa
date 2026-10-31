import type { Server } from 'socket.io'
import { chuShiHuaRiZhiTuiSongSocket } from './日志推送'

export type ChuanBoIo = Server & {
  chuangJianJiaoSeTiaoDuQiSuo?: (yongHuId: string, jiaoSeId: string) => Promise<unknown>
}

let io: ChuanBoIo | null = null

export function sheZhiIo(serverIo: ChuanBoIo): void {
  io = serverIo
  chuShiHuaRiZhiTuiSongSocket(serverIo)
}

export function huoQuIo(): ChuanBoIo | null {
  return io
}
