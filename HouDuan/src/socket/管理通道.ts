import type { Socket } from 'socket.io'
import { anYongHuIdJuBeiNengLi } from '../middleware/管理员'
import { debug日志 } from '../utils/debug日志'

/**
 * FP-19 运营侧数据面收口：管理员监控（构建过程/深度思考/好感度变化/隐藏信息）这类
 * 运营侧事件不再进入玩家本人房间 io.to(用户ID)，只进入本模块定义的管理专用房间。
 * 房间成员资格唯一由服务端查库鉴权决定（FP-18 同源角色入口 anYongHuIdJuBeiNengLi，
 * 判据 = 能力位 cha_kan「查看运营数据」，带 30s 缓存与跨实例失效广播），
 * 客户端不存在任何自行 join/申报的入口；校验失败一律拒入。
 */
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
