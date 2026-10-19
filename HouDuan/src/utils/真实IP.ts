import type { Request } from 'express'
import { peiZhi } from '../config'

const huiHuanMoRenIP = '127.0.0.1'

function shiHeFaIPv4(zhi: string): boolean {
  const buFen = zhi.split('.')
  if (buFen.length !== 4) return false
  return buFen.every((buFenZhi) => /^\d{1,3}$/.test(buFenZhi) && Number(buFenZhi) <= 255)
}

function ipv4ZhuanShuZi(zhi: string): number {
  const buFen = zhi.split('.')
  return (
    ((Number(buFen[0]) << 24) |
      (Number(buFen[1]) << 16) |
      (Number(buFen[2]) << 8) |
      Number(buFen[3])) >>>
    0
  )
}

export function guiYiHuaIP(zhi: string): string {
  if (/^::ffff:/i.test(zhi)) {
    const yingSheBuFen = zhi.slice(7)
    if (shiHeFaIPv4(yingSheBuFen)) {
      return yingSheBuFen
    }
  }
  return zhi
}

interface IPv4WangDuanGuiZe {
  lei_xing: 'ipv4'
  wang_duan_zhi: number
  you_yi_wei_shu: number
}

interface JingQueDiZhiGuiZe {
  lei_xing: 'jing_que'
  di_zhi: string
}

type KeXinWangDuanGuiZe = IPv4WangDuanGuiZe | JingQueDiZhiGuiZe

export function jieXiKeXinWangDuan(lie_biao: string[]): KeXinWangDuanGuiZe[] {
  const gui_ze_lie_biao: KeXinWangDuanGuiZe[] = []
  for (const xiang of lie_biao) {
    const jing = xiang.trim()
    if (!jing) continue
    const [di_zhi, yan_ma_bu_fen] = jing.split('/')
    if (shiHeFaIPv4(di_zhi)) {
      const yan_ma = yan_ma_bu_fen === undefined ? 32 : Number(yan_ma_bu_fen)
      if (!Number.isInteger(yan_ma) || yan_ma < 1 || yan_ma > 32) continue
      gui_ze_lie_biao.push({
        lei_xing: 'ipv4',
        wang_duan_zhi: ipv4ZhuanShuZi(di_zhi),
        you_yi_wei_shu: 32 - yan_ma,
      })
      continue
    }
    if (yan_ma_bu_fen !== undefined) continue
    if (di_zhi.includes(':') && /^[0-9a-f:.]{2,45}$/i.test(di_zhi)) {
      gui_ze_lie_biao.push({ lei_xing: 'jing_que', di_zhi: di_zhi.toLowerCase() })
    }
  }
  return gui_ze_lie_biao
}

// P2-2：回环对端即本机自身进程，信任其不引入伪造面；KE_XIN_DAI_LI_WANG_DUAN 为增量反代网段白名单
const huiHuanChangZhuGuiZe: KeXinWangDuanGuiZe[] = [
  { lei_xing: 'ipv4', wang_duan_zhi: ipv4ZhuanShuZi('127.0.0.1'), you_yi_wei_shu: 0 },
  { lei_xing: 'jing_que', di_zhi: '::1' },
]

// P2-2：可信代理判定收紧为「部署实际反代网段」白名单（KE_XIN_DAI_LI_WANG_DUAN 可配，
// 默认仅 127.0.0.1/::1），内网源不再一律可信，杜绝内网攻击者伪造 X-Real-IP 漂移限流/封禁计数
export function shiDuanKeXinDaiLi(di_zhi: string): boolean {
  const gui_yi = guiYiHuaIP(di_zhi)
  for (const gui_ze of [...huiHuanChangZhuGuiZe, ...jieXiKeXinWangDuan(peiZhi.keXinDaiLiWangDuan)]) {
    if (gui_ze.lei_xing === 'ipv4') {
      if (!shiHeFaIPv4(gui_yi)) continue
      if (
        (ipv4ZhuanShuZi(gui_yi) >>> gui_ze.you_yi_wei_shu) ===
        (gui_ze.wang_duan_zhi >>> gui_ze.you_yi_wei_shu)
      ) {
        return true
      }
    } else if (gui_yi.toLowerCase() === gui_ze.di_zhi) {
      return true
    }
  }
  return false
}

function shiHeFaIPZhiMianLiang(zhi: string): boolean {
  const jing = zhi.trim()
  if (shiHeFaIPv4(jing)) return true
  if (jing.includes(':') && /^[0-9a-f:.]{2,45}$/i.test(jing)) return true
  return false
}

export function huoQuZhenShiIP(qingQiu: Request): string {
  const duiXiangDiZhi = qingQiu.socket?.remoteAddress
  if (!duiXiangDiZhi) {
    return huiHuanMoRenIP
  }
  const duiXiangGuiYi = guiYiHuaIP(duiXiangDiZhi)
  if (!shiDuanKeXinDaiLi(duiXiangDiZhi)) {
    return duiXiangGuiYi
  }
  const touBuZhi = qingQiu.headers['x-real-ip']
  if (typeof touBuZhi === 'string' && shiHeFaIPZhiMianLiang(touBuZhi)) {
    return guiYiHuaIP(touBuZhi.trim())
  }
  return duiXiangGuiYi
}
