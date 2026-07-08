import type { Server } from 'socket.io'

let io: Server | null = null

export function sheZhiIo(serverIo: Server): void {
  io = serverIo
}

export function huoQuIo(): Server | null {
  return io
}
