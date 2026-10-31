import type { Socket } from 'socket.io'
import { anYongHuIdJuBeiNengLi } from '../middleware/管理员'
import { debug日志 } from '../utils/debug日志'

const GUAN_LI_FANG_JIAN_QIAN_ZHUI = 'guan-li:'

export function 管理监控房间名(用户ID: string): string {
  return `${GUAN_LI_FANG_JIAN_QIAN_ZHUI}${用户ID}`
}

export async function 按身份同步管理房间(socket: Socket, 用户ID: string): Promise<void> {
  const 房间 = 管理监控房间名(用户ID)
  let 有运营读取权 = false
  try {
    有运营读取权 = await anYongHuIdJuBeiNengLi(用户ID, 'cha_kan')
  } catch (错误) {
    debug日志.error('管理通道', '管理房间身份校验失败，按无权限处理', {
      xiang_qing: { socket_id: socket.id, cuo_wu: String(错误) },
    })
  }
  if (有运营读取权) {
    socket.join(房间)
  } else {
    socket.leave(房间)
  }
}
