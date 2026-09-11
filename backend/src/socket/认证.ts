import type { Socket } from 'socket.io'
import {
  yanZhengLingPai,
  lingPaiShiFouYiCheXiao,
  huoQuCheXiaoJian,
  type LingPaiZaiHe,
} from '../utils/jwt'
import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'

export interface RenZhengSocket extends Socket {
  yong_hu?: LingPaiZaiHe
}

interface CheXiaoHuanCunXiang {
  zhi: number | null
  daoQiHaoMiao: number
}

const cheXiaoShiJianCuoHuanCun = new Map<string, CheXiaoHuanCunXiang>()
const huanCunYouXiaoHaoMiao = 30000

async function huoQuCheXiaoShiJianCuoDaiHuanCun(yongHuId: string): Promise<number | null> {
  const xianZai = Date.now()
  const huanCun = cheXiaoShiJianCuoHuanCun.get(yongHuId)
  if (huanCun && huanCun.daoQiHaoMiao > xianZai) return huanCun.zhi
  const zhi = await redis.get(huoQuCheXiaoJian(yongHuId))
  const jieXiZhi = zhi === null ? null : Number(zhi)
  cheXiaoShiJianCuoHuanCun.set(yongHuId, { zhi: jieXiZhi, daoQiHaoMiao: xianZai + huanCunYouXiaoHaoMiao })
  return jieXiZhi
}

export function qingLiCheXiaoHuanCun(): void {
  cheXiaoShiJianCuoHuanCun.clear()
}

export function guaZaiCheXiaoShouWei(socket: RenZhengSocket): void {
  const yongHuId = socket.yong_hu?.yongHuId
  if (!yongHuId) return
  const qianFaHaoMiao =
    typeof socket.yong_hu?.qianFaHaoMiao === 'number'
      ? socket.yong_hu.qianFaHaoMiao
      : (socket.yong_hu?.iat ?? 0) * 1000
  socket.use((_bao, shouWeiXiaYiBu) => {
    void (async () => {
      try {
        const cheXiaoShiJianCuo = await huoQuCheXiaoShiJianCuoDaiHuanCun(yongHuId)
        if (cheXiaoShiJianCuo !== null && qianFaHaoMiao <= cheXiaoShiJianCuo) {
          debug日志.warn('Socket认证', '令牌已吊销，断开存量连接', {
            xiang_qing: { socket_id: socket.id },
          })
          socket.disconnect(true)
          return
        }
        shouWeiXiaYiBu()
      } catch {
        shouWeiXiaYiBu()
      }
    })()
  })
}

export async function renZhengSocketZhongJianJian(
  socket: RenZhengSocket,
  xiaYiBu: (err?: Error) => void,
): Promise<void> {
  try {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) {
      debug日志.warn('Socket认证', '连接缺少令牌', { xiang_qing: { socket_id: socket.id } })
      return xiaYiBu(new Error('未授权'))
    }
    const zaiHe = yanZhengLingPai(token)
    if (await lingPaiShiFouYiCheXiao(zaiHe.yongHuId, zaiHe.iat, zaiHe.qianFaHaoMiao)) {
      debug日志.warn('Socket认证', '令牌已被吊销，拒绝握手', { xiang_qing: { socket_id: socket.id } })
      return xiaYiBu(new Error('令牌无效'))
    }
    socket.yong_hu = zaiHe
    guaZaiCheXiaoShouWei(socket)
    xiaYiBu()
  } catch {
    debug日志.warn('Socket认证', '令牌验证失败', { xiang_qing: { socket_id: socket.id } })
    xiaYiBu(new Error('令牌无效'))
  }
}
