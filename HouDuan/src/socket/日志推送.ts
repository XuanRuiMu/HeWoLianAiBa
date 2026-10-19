import type { Server } from 'socket.io'
import type { RenZhengSocket } from './认证'
import { anYongHuIdJuBeiNengLi } from '../middleware/管理员'
import { riZhiTuiSongPeiZhi } from '../config/日志推送配置'
import { dingYueRiZhi } from '../utils/日志订阅'
import { debug日志, type RiZhiTiaoMu } from '../utils/debug日志'

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

// FP-18 运行时日志流承载服务端内部实现细节（模块名/异常文本/标识符），
// 与业务运营数据不同级，一律按高危能力位 gao_we 授权（判定口径与前端视图门同源）
async function panDuanKeGaoWei(yongHuId: string): Promise<boolean> {
  try {
    return await anYongHuIdJuBeiNengLi(yongHuId, 'gao_we')
  } catch (cuoWu) {
    debug日志.error('日志推送Socket', '管理身份校验失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return false
  }
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
    if (!yongHu) return

    // 安全红线：非管理员的订阅/取消订阅一律忽略，无法加入日志房间，也不会触发日志管道启动
    socket.on(SHI_JIAN_DING_YUE_RI_ZHI, async (huiDiao?: (jieGuo: unknown) => void) => {
      if (!(await panDuanKeGaoWei(yongHu.yongHuId))) return
      socket.join(riZhiTuiSongPeiZhi.fangJianMing)
      dingYueSocketJiHe.add(socket.id)
      qiDongGuanDao()
      if (typeof huiDiao === 'function') huiDiao({ cheng_gong: true })
    })

    socket.on(SHI_JIAN_QU_XIAO_RI_ZHI, async (huiDiao?: (jieGuo: unknown) => void) => {
      if (!(await panDuanKeGaoWei(yongHu.yongHuId))) return
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
