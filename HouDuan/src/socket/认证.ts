import type { Socket } from 'socket.io'
import {
  yanZhengLingPai,
  lingPaiShiFouYiCheXiao,
  huoQuCheXiaoJian,
  type LingPaiZaiHe,
} from '../utils/jwt'
import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { huoQuFanYi } from '../config/translations'

export interface RenZhengSocket extends Socket {
  yong_hu?: LingPaiZaiHe
}

interface CheXiaoHuanCunXiang {
  zhi: number | null
  daoQiHaoMiao: number
}

const cheXiaoShiJianCuoHuanCun = new Map<string, CheXiaoHuanCunXiang>()
const huanCunYouXiaoHaoMiao = 30000
const huanCunRongLiangShangXian = 5000

function xieRuHuanCun(用户ID: string, xiang: CheXiaoHuanCunXiang): void {
  if (!cheXiaoShiJianCuoHuanCun.has(用户ID) && cheXiaoShiJianCuoHuanCun.size >= huanCunRongLiangShangXian) {
    qingLiGuoQiHuanCun()
  }
  cheXiaoShiJianCuoHuanCun.set(用户ID, xiang)
}

function qingLiGuoQiHuanCun(): void {
  const xianZai = Date.now()
  for (const [用户ID, huanCun] of cheXiaoShiJianCuoHuanCun.entries()) {
    if (huanCun.daoQiHaoMiao <= xianZai) cheXiaoShiJianCuoHuanCun.delete(用户ID)
  }
  if (cheXiaoShiJianCuoHuanCun.size >= huanCunRongLiangShangXian) {
    const shouJian = cheXiaoShiJianCuoHuanCun.keys().next().value
    if (shouJian !== undefined) cheXiaoShiJianCuoHuanCun.delete(shouJian)
  }
}

async function huoQuCheXiaoShiJianCuoDaiHuanCun(用户ID: string): Promise<number | null> {
  const xianZai = Date.now()
  const huanCun = cheXiaoShiJianCuoHuanCun.get(用户ID)
  if (huanCun && huanCun.daoQiHaoMiao > xianZai) return huanCun.zhi
  const zhi = await redis.get(huoQuCheXiaoJian(用户ID))
  const jieXiZhi = zhi === null ? null : Number(zhi)
  xieRuHuanCun(用户ID, { zhi: jieXiZhi, daoQiHaoMiao: xianZai + huanCunYouXiaoHaoMiao })
  return jieXiZhi
}

export function qingLiCheXiaoHuanCun(): void {
  cheXiaoShiJianCuoHuanCun.clear()
}

export function guaZaiCheXiaoShouWei(socket: RenZhengSocket): void {
  const 用户ID = socket.yong_hu?.用户ID
  if (!用户ID) return
  const qianFaHaoMiao =
    typeof socket.yong_hu?.qianFaHaoMiao === 'number'
      ? socket.yong_hu.qianFaHaoMiao
      : (socket.yong_hu?.iat ?? 0) * 1000
  socket.use((_bao, shouWeiXiaYiBu) => {
    void (async () => {
      try {
        const cheXiaoShiJianCuo = await huoQuCheXiaoShiJianCuoDaiHuanCun(用户ID)
        if (cheXiaoShiJianCuo !== null && qianFaHaoMiao <= cheXiaoShiJianCuo) {
          debug日志.warn('Socket认证', '令牌已吊销，断开存量连接', {
            xiang_qing: { socket_id: socket.id },
          })
          socket.disconnect(true)
          return
        }
        shouWeiXiaYiBu()
      } catch (cuoWu) {
        debug日志.warn('Socket认证', '吊销时间读取失败，按未吊销放行', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
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
      return xiaYiBu(new Error(huoQuFanYi('tongYong', 'weiShouQuan')))
    }
    const zaiHe = yanZhengLingPai(token)
    if (await lingPaiShiFouYiCheXiao(zaiHe.用户ID, zaiHe.iat, zaiHe.qianFaHaoMiao)) {
      debug日志.warn('Socket认证', '令牌已被吊销，拒绝握手', { xiang_qing: { socket_id: socket.id } })
      return xiaYiBu(new Error(huoQuFanYi('renZheng', 'lingPaiWuXiao')))
    }
    socket.yong_hu = zaiHe
    guaZaiCheXiaoShouWei(socket)
    xiaYiBu()
  } catch {
    debug日志.warn('Socket认证', '令牌验证失败', { xiang_qing: { socket_id: socket.id } })
    xiaYiBu(new Error(huoQuFanYi('renZheng', 'lingPaiWuXiao')))
  }
}
