import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'
import { peiZhi } from '../config'
import { riZhiTuiSongPeiZhi } from '../config/日志推送配置'
import { dingYueRiZhi } from '../utils/日志订阅'
import type { RiZhiTiaoMu } from '../utils/debug日志'

export const SHI_JIAN_DING_YUE_RI_ZHI = '日志_订阅'
export const SHI_JIAN_QU_XIAO_RI_ZHI = '日志_取消订阅'
export const SHI_JIAN_RI_ZHI_PI_LIANG = '日志_批量'

export interface RiZhiPiLiangZaiHe {
  tiao_mu_lie_biao: RiZhiTiaoMu[]
  diu_qi_shu: number
}

const dingYueSocketJiHe = new Set<string>()

let dangQianIo: Server | null = null
let quXiaoDingYue: (() => void) | null = null
let dingShiQi: ReturnType<typeof setInterval> | null = null
let huanChongQu: RiZhiTiaoMu[] = []
let diuQiShu = 0
let chuangKouQiShiShiJian = 0
let chuangKouYiTuiSong = 0

function panDuanShiGuanLiYuan(shouJiHao: string): boolean {
  return peiZhi.shenYongYuan.yunXuLieBiao.includes(shouJiHao)
}

function shouJiRiZhi(tiaoMu: RiZhiTiaoMu): void {
  const xianZai = Date.now()
  if (xianZai - chuangKouQiShiShiJian >= 1000) {
    chuangKouQiShiShiJian = xianZai
    chuangKouYiTuiSong = 0
  }
  if (chuangKouYiTuiSong >= riZhiTuiSongPeiZhi.meiMiaoZuiDaTiaoShu) {
    diuQiShu += 1
    return
  }
  chuangKouYiTuiSong += 1

  if (huanChongQu.length >= riZhiTuiSongPeiZhi.huanChongZuiDaTiaoShu) {
    huanChongQu.shift()
    diuQiShu += 1
  }
  huanChongQu.push(tiaoMu)
}

function chongShuaHuanChong(): void {
  if (!dangQianIo) return
  if (huanChongQu.length === 0 && diuQiShu === 0) return
  const piCi = huanChongQu.splice(0, riZhiTuiSongPeiZhi.piCiZuiDaTiaoShu)
  const zaiHe: RiZhiPiLiangZaiHe = { tiao_mu_lie_biao: piCi, diu_qi_shu: diuQiShu }
  diuQiShu = 0
  dangQianIo.to(riZhiTuiSongPeiZhi.fangJianMing).emit(SHI_JIAN_RI_ZHI_PI_LIANG, zaiHe)
}

function qiDongGuanDao(): void {
  if (quXiaoDingYue) return
  quXiaoDingYue = dingYueRiZhi(shouJiRiZhi)
  dingShiQi = setInterval(chongShuaHuanChong, riZhiTuiSongPeiZhi.heBingJianGeHaoMiao)
  dingShiQi.unref()
}

function tingZhiGuanDao(): void {
  if (dingShiQi) {
    clearInterval(dingShiQi)
    dingShiQi = null
  }
  if (quXiaoDingYue) {
    quXiaoDingYue()
    quXiaoDingYue = null
  }
  huanChongQu = []
  diuQiShu = 0
  chuangKouQiShiShiJian = 0
  chuangKouYiTuiSong = 0
}

function yiChuDingYue(socketId: string): void {
  if (!dingYueSocketJiHe.delete(socketId)) return
  if (dingYueSocketJiHe.size === 0) tingZhiGuanDao()
}

export function chuShiHuaRiZhiTuiSongSocket(io: Server): void {
  if (!riZhiTuiSongPeiZhi.qiYong) return
  dangQianIo = io

  io.on('connection', (socket: RenZhengSocket) => {
    const yongHu = socket.yong_hu
    // 安全红线：非管理员连接不注册任何日志事件监听，也无法加入日志房间
    if (!yongHu || !panDuanShiGuanLiYuan(yongHu.shouJiHao)) return

    socket.on(SHI_JIAN_DING_YUE_RI_ZHI, (huiDiao?: (jieGuo: unknown) => void) => {
      socket.join(riZhiTuiSongPeiZhi.fangJianMing)
      dingYueSocketJiHe.add(socket.id)
      qiDongGuanDao()
      if (typeof huiDiao === 'function') huiDiao({ cheng_gong: true })
    })

    socket.on(SHI_JIAN_QU_XIAO_RI_ZHI, (huiDiao?: (jieGuo: unknown) => void) => {
      socket.leave(riZhiTuiSongPeiZhi.fangJianMing)
      yiChuDingYue(socket.id)
      if (typeof huiDiao === 'function') huiDiao({ cheng_gong: true })
    })

    socket.on('disconnect', () => {
      yiChuDingYue(socket.id)
    })
  })
}

export function tingZhiRiZhiTuiSong(): void {
  dingYueSocketJiHe.clear()
  tingZhiGuanDao()
  dangQianIo = null
}
