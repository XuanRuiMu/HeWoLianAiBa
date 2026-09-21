import type { Server } from 'socket.io'
import { chuShiHuaRiZhiTuiSongSocket } from './日志推送'

/**
 * FP-04：socket 实例由 server.ts 创建后交还本模块持有，路由等旁路消费者不再各自持有引用，
 * 避免出现「一个进程两份 io 视图」导致调度器向未挂载的实例推送。
 */
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
