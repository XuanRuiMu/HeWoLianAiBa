import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'
import { AI回复调度器 } from '../services/AI回复调度器'
import { huoQuJiaoSeIELeiXing, huoQuJiaoSeHuiFuYanChiHaoMiao } from '../services/AI输入准备'
import { jiaoSeShiFouBeiDuoShe, huoQuJiaoSeYongHuId } from '../services/夺舍'
import { zhuanFaYongHuXiaoXiGeiGuanLiYuan } from './夺舍'
import type { XiaoXiXinXi } from '../services/消息'
import { jiLuSocketShiJian, jiLuXiaoXiCaoZuo, debug日志 } from '../utils/debug日志'
import { huoQuFanYi } from '../config/translations'
import { yanZhengUUID } from '../utils/验证'
import { redis } from '../redis'
import { huoQuIo } from './io'
import { 按身份同步管理房间 } from './管理通道'

interface TiaoDuQiJiLu {
  角色ID: string
  调度器: AI回复调度器
  归属Socket: Set<string>
  续期定时器?: NodeJS.Timeout
}

const socketTiaoDuQiMap = new Map<string, TiaoDuQiJiLu>()
const jiaoSeTiaoDuQiMap = new Map<string, TiaoDuQiJiLu>()

const TIAO_DU_QI_SUO_QIAN_ZHUI = 'tiao_du_qi_suo:'
const TIAO_DU_QI_SUO_MIAO = 30000
const TIAO_DU_QI_XU_QI_MIAO = Math.floor(TIAO_DU_QI_SUO_MIAO / 3)
const BEN_CHENG_PROCESSE_ID = `${process.pid}-${Math.random().toString(36).slice(2, 10)}`

async function changShiRenLingTiaoDuQi(yongHuId: string, jiaoSeId: string, lingZhuBiaoShi: string): Promise<boolean> {
  const suoJian = `${TIAO_DU_QI_SUO_QIAN_ZHUI}${yongHuId}:${jiaoSeId}`
  try {
    const jieGuo = await redis.set(suoJian, lingZhuBiaoShi, 'PX', TIAO_DU_QI_SUO_MIAO, 'NX')
    return jieGuo === 'OK'
  } catch {
    return true
  }
}

function kaiShiXuQiTiaoDuQiSuo(jian: string, jiLu: TiaoDuQiJiLu, yongHuId: string, jiaoSeId: string): void {
  jiLu.续期定时器 = setInterval(() => {
    void (async () => {
      const suoJian = `${TIAO_DU_QI_SUO_QIAN_ZHUI}${yongHuId}:${jiaoSeId}`
      let chiYou: string | null = null
      try {
        chiYou = await redis.get(suoJian)
      } catch {
        return
      }
      if (chiYou === BEN_CHENG_PROCESSE_ID) {
        await redis.pexpire(suoJian, TIAO_DU_QI_SUO_MIAO).catch(() => undefined)
        return
      }
      debug日志.warn('聊天Socket', '调度器认领锁易主，本进程作废轮次并放弃记录', {
        xiang_qing: { jiao_se_id: jiaoSeId, chi_you: chiYou === null ? 'yi_shi_xiao' : 'ta_ren' },
      })
      jiLu.调度器.重置()
      tingZhiXuQiTiaoDuQiSuo(jiLu)
      if (jiaoSeTiaoDuQiMap.get(jian) === jiLu) jiaoSeTiaoDuQiMap.delete(jian)
      for (const [socketId, zaiJi] of [...socketTiaoDuQiMap.entries()]) {
        if (zaiJi === jiLu) socketTiaoDuQiMap.delete(socketId)
      }
    })()
  }, TIAO_DU_QI_XU_QI_MIAO)
  jiLu.续期定时器.unref?.()
}

function tingZhiXuQiTiaoDuQiSuo(jiLu: TiaoDuQiJiLu): void {
  if (jiLu.续期定时器) {
    clearInterval(jiLu.续期定时器)
    jiLu.续期定时器 = undefined
  }
}

async function shiFangTiaoDuQiSuo(yongHuId: string, jiaoSeId: string, lingZhuBiaoShi: string): Promise<void> {
  const suoJian = `${TIAO_DU_QI_SUO_QIAN_ZHUI}${yongHuId}:${jiaoSeId}`
  try {
    const chiYou = await redis.get(suoJian)
    if (chiYou === lingZhuBiaoShi) {
      await redis.del(suoJian)
    }
  } catch {
    // 锁释放失败不阻断
  }
}

async function guangBoTiaoDuQiBianGeng(yongHuId: string, jiaoSeId: string, dongZuo: string): Promise<void> {
  try {
    await redis.publish(`tiao_du_qi_guang_bo:${yongHuId}`, JSON.stringify({ jiao_se_id: jiaoSeId, dong_zuo: dongZuo, shi_jian: Date.now() }))
  } catch {
    // 广播失败不阻断
  }
}

function shengChengJiaoSeTiaoDuQiJian(yong_hu_id: string, jiao_se_id: string): string {
  return `${yong_hu_id}:${jiao_se_id}`
}

export function 清理调度器映射(): void {
  const 待重置 = new Set<TiaoDuQiJiLu>([...socketTiaoDuQiMap.values(), ...jiaoSeTiaoDuQiMap.values()])
  for (const jiLu of 待重置) {
    tingZhiXuQiTiaoDuQiSuo(jiLu)
    jiLu.调度器.重置()
  }
  socketTiaoDuQiMap.clear()
  jiaoSeTiaoDuQiMap.clear()
}

async function queBaoJiaoSeTiaoDuQi(
  yong_hu_id: string,
  jiao_se_id: string,
  io: Server,
): Promise<TiaoDuQiJiLu | null> {
  const jian = shengChengJiaoSeTiaoDuQiJian(yong_hu_id, jiao_se_id)
  const jiuJiLu = jiaoSeTiaoDuQiMap.get(jian)
  if (jiuJiLu) return jiuJiLu

  if (!(await changShiRenLingTiaoDuQi(yong_hu_id, jiao_se_id, BEN_CHENG_PROCESSE_ID))) {
    debug日志.warn('聊天Socket', '调度器已被他处认领，本进程禁建禁覆盖', {
      xiang_qing: { jiao_se_id, user_id: yong_hu_id },
    })
    return null
  }

  const [ie类型, huiFuYanChiHaoMiao] = await Promise.all([
    huoQuJiaoSeIELeiXing(jiao_se_id),
    huoQuJiaoSeHuiFuYanChiHaoMiao(jiao_se_id),
  ])
  if (!ie类型) {
    await shiFangTiaoDuQiSuo(yong_hu_id, jiao_se_id, BEN_CHENG_PROCESSE_ID)
    return null
  }

  const jiLu: TiaoDuQiJiLu = {
    角色ID: jiao_se_id,
    调度器: new AI回复调度器(jiao_se_id, yong_hu_id, ie类型, io, huiFuYanChiHaoMiao),
    归属Socket: new Set<string>(),
  }
  jiaoSeTiaoDuQiMap.set(jian, jiLu)
  kaiShiXuQiTiaoDuQiSuo(jian, jiLu, yong_hu_id, jiao_se_id)
  await guangBoTiaoDuQiBianGeng(yong_hu_id, jiao_se_id, 'ren_ling')
  return jiLu
}

function shanChuJiaoSeJiLuRuGuo(jiLu: TiaoDuQiJiLu, jian: string): void {
  tingZhiXuQiTiaoDuQiSuo(jiLu)
  jiLu.调度器.重置()
  if (jiaoSeTiaoDuQiMap.get(jian) === jiLu) {
    jiaoSeTiaoDuQiMap.delete(jian)
  }
}

export function huoQuJiaoSeTiaoDuQi(
  yong_hu_id: string,
  jiao_se_id: string,
): AI回复调度器 | null {
  return jiaoSeTiaoDuQiMap.get(shengChengJiaoSeTiaoDuQiJian(yong_hu_id, jiao_se_id))?.调度器 || null
}

export function chongZhiJiaoSeTiaoDuQi(yong_hu_id: string, jiao_se_id: string): void {
  const jiLu = jiaoSeTiaoDuQiMap.get(shengChengJiaoSeTiaoDuQiJian(yong_hu_id, jiao_se_id))
  if (jiLu) {
    jiLu.调度器.处理用户消息()
  }
}

export function zhongDuanJiaoSeTiaoDuQi(yong_hu_id: string, jiao_se_id: string): void {
  const jiLu = jiaoSeTiaoDuQiMap.get(shengChengJiaoSeTiaoDuQiJian(yong_hu_id, jiao_se_id))
  if (jiLu) {
    jiLu.调度器.重置()
  }
}

export async function luoKuChuFaJiaoSeTiaoDuQi(
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi: XiaoXiXinXi,
): Promise<void> {
  try {
    if (!yong_hu_id || !yanZhengUUID(jiao_se_id) || !xiao_xi?.id) return
    const io = huoQuIo()
    if (!io) return

    if (await jiaoSeShiFouBeiDuoShe(jiao_se_id)) {
      await zhuanFaYongHuXiaoXiGeiGuanLiYuan(io, jiao_se_id, yong_hu_id, xiao_xi)
      return
    }

    const jiLu = await queBaoJiaoSeTiaoDuQi(yong_hu_id, jiao_se_id, io)
    if (!jiLu) {
      debug日志.warn('聊天Socket', '落库触发AI被跳过：调度器在他处认领', {
        xiang_qing: { jiao_se_id, user_id: yong_hu_id, xiao_xi_id: xiao_xi.id },
      })
      jiLuXiaoXiCaoZuo('用户消息落库但AI触发被跳过', yong_hu_id, jiao_se_id, 'yonghu', {
        xiao_xi_id: xiao_xi.id,
        chu_fa: 'tiao_du_qi_ren_ling_shi_bai',
      })
      return
    }

    jiLu.调度器.处理用户消息(xiao_xi.id)
    jiLuXiaoXiCaoZuo('用户发送消息触发AI处理', yong_hu_id, jiao_se_id, 'yonghu', {
      xiao_xi_id: xiao_xi.id,
      chu_fa: 'luo-ku',
    })
  } catch (cuoWu) {
    debug日志.error('聊天Socket', '落库触发AI处理失败', {
      xiang_qing: { jiao_se_id, cuo_wu: String(cuoWu) },
    })
  }
}

const SOCKET_XIAN_LIU_PREFIX = 'socket_xian_liu:'
const SOCKET_XIAN_LIU_MAX = 10
const SOCKET_XIAN_LIU_WINDOW = 10 * 1000

async function jianCeSocketXianLiu(yongHuId: string): Promise<boolean> {
  const jianMing = `${SOCKET_XIAN_LIU_PREFIX}${yongHuId}`
  const dangQian = await redis.incr(jianMing)
  if (dangQian === 1) {
    await redis.pexpire(jianMing, SOCKET_XIAN_LIU_WINDOW)
  }
  return dangQian <= SOCKET_XIAN_LIU_MAX
}

export function 初始化聊天Socket(io: Server): void {
  io.on('connection', (socket: RenZhengSocket) => {
    const 用户ID = socket.yong_hu?.yongHuId
    if (!用户ID) {
      socket.disconnect(true)
      return
    }

    jiLuSocketShiJian('Socket连接', 用户ID, { socket_id: socket.id, shi_jian: 'liao_tian' })

    socket.on('加入聊天', async (角色ID: unknown) => {
      try {
        const keXing = await jianCeSocketXianLiu(用户ID)
        if (!keXing) {
          socket.emit('错误', huoQuFanYi('tongYong', 'caoZuoPinFan'))
          debug日志.warn('聊天Socket', 'Socket超限丢弃不踢人', { xiang_qing: { socket_id: socket.id } })
          return
        }
        const 角色ID字符串 = typeof 角色ID === 'string' ? 角色ID : ''
        if (!角色ID字符串 || !yanZhengUUID(角色ID字符串)) {
          socket.emit('错误', huoQuFanYi('tongYong', 'queShaoCanShu'))
          return
        }

        const jiaoSeYongHuId = await huoQuJiaoSeYongHuId(角色ID字符串)
        if (jiaoSeYongHuId === null) {
          socket.emit('错误', huoQuFanYi('liaoTian', 'jiaoSeBuCunZai'))
          return
        }
        if (jiaoSeYongHuId !== 用户ID) {
          socket.emit('错误', huoQuFanYi('tongYong', 'weiShouQuan'))
          return
        }

        socket.join(用户ID)
        await 按身份同步管理房间(socket, 用户ID)

        const jiuJiLu = socketTiaoDuQiMap.get(socket.id)
        if (jiuJiLu && jiuJiLu.角色ID !== 角色ID字符串) {
          const jiuJian = shengChengJiaoSeTiaoDuQiJian(用户ID, jiuJiLu.角色ID)
          jiuJiLu.归属Socket.delete(socket.id)
          if (jiuJiLu.归属Socket.size === 0) {
            shanChuJiaoSeJiLuRuGuo(jiuJiLu, jiuJian)
            void shiFangTiaoDuQiSuo(用户ID, jiuJiLu.角色ID, BEN_CHENG_PROCESSE_ID)
          }
        }

        const jiLu = await queBaoJiaoSeTiaoDuQi(用户ID, 角色ID字符串, io)
        if (!jiLu) {
          socketTiaoDuQiMap.delete(socket.id)
          return
        }
        jiLu.归属Socket.add(socket.id)
        socketTiaoDuQiMap.set(socket.id, jiLu)
        jiLuSocketShiJian('加入聊天', 用户ID, { jiao_se_id: 角色ID字符串, socket_id: socket.id })
      } catch (cuoWu) {
        debug日志.error('聊天Socket', '加入聊天处理失败', {
          xiang_qing: { socket_id: socket.id, cuo_wu: String(cuoWu) },
        })
        socket.emit('错误', huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
    })


    socket.on('disconnect', () => {
      const jiLu = socketTiaoDuQiMap.get(socket.id)
      socketTiaoDuQiMap.delete(socket.id)
      if (jiLu) {
        jiLu.归属Socket.delete(socket.id)
        const jian = shengChengJiaoSeTiaoDuQiJian(用户ID, jiLu.角色ID)
        if (jiLu.归属Socket.size === 0 && jiaoSeTiaoDuQiMap.get(jian) === jiLu) {
          shanChuJiaoSeJiLuRuGuo(jiLu, jian)
          void shiFangTiaoDuQiSuo(用户ID, jiLu.角色ID, BEN_CHENG_PROCESSE_ID)
          void guangBoTiaoDuQiBianGeng(用户ID, jiLu.角色ID, 'shi_fang')
        }
      }
      jiLuSocketShiJian('Socket断开', 用户ID, { socket_id: socket.id })
    })
  })
}
