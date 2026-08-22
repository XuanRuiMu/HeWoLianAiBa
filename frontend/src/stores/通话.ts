import { defineStore } from 'pinia'
import { ref, onScopeDispose } from 'vue'
import type { Socket } from 'socket.io-client'
import { 使用聊天仓库 } from './聊天'
import { huoQuFanYi } from '@/config/translations'
import { qiDongZhenLing, tingZhiZhenLing } from '@/utils/通话铃声'

export type TongHuaLeiXing = 'yuYin' | 'shiPin'
export type TongHuaYunXingZhuangTai = 'kongXian' | 'zhenLing' | 'yiJieTong' | 'yiJieShu'
export type TongHuaZhongTai = 'yiJieTong' | 'yiQuXiao' | 'yiJuJie' | 'yiChaoShi'

interface TongHuaQueRenZaiHe {
  chengGong?: boolean
  tongHuaId?: string
  tiShi?: string
  shiChangMiao?: number
}

// 终态后 UI 停留时长，随后自动归位 kongXian 并清理界面
const ZHONG_TAI_TING_LIU_HAO_MIAO = 3000

// 信令所需的最小 socket 能力面（Pinia 解包后的实例与官方类存在结构差异，避免整类依赖）
type XinLingSocket = Pick<Socket, 'on' | 'emit'>

export const 使用通话仓库 = defineStore('通话', () => {
  const 聊天仓库 = 使用聊天仓库()

  const zhuangTai = ref<TongHuaYunXingZhuangTai>('kongXian')
  const leiXing = ref<TongHuaLeiXing>('yuYin')
  const tongHuaId = ref<string | null>(null)
  const duiFangNiCheng = ref('')
  const duiFangTouXiang = ref('')
  const jiShiMiao = ref(0)
  const maiKeFengKaiQi = ref(true)
  const sheXiangTouKaiQi = ref(true)
  const benDiLiu = ref<MediaStream | null>(null)
  // 最近一次终态原因（yiQuXiao 时 UI 显示"通话已取消"）
  const zuiHouZhongTai = ref<TongHuaZhongTai | null>(null)

  let miaoBiaoDingShiQi: ReturnType<typeof setInterval> | null = null
  let guiWeiDingShiQi: ReturnType<typeof setTimeout> | null = null
  // 已注册信令监听的 socket 实例：同一实例只注册一次，防止重复回调
  let yiZhuCeSocket: XinLingSocket | null = null

  function qingLiMiaoBiao() {
    if (miaoBiaoDingShiQi !== null) {
      clearInterval(miaoBiaoDingShiQi)
      miaoBiaoDingShiQi = null
    }
  }

  function qingLiGuiWei() {
    if (guiWeiDingShiQi !== null) {
      clearTimeout(guiWeiDingShiQi)
      guiWeiDingShiQi = null
    }
  }

  function tingZhiBenDiGuiDao() {
    if (!benDiLiu.value) return
    for (const guiDao of benDiLiu.value.getTracks()) {
      try {
        guiDao.stop()
      } catch {
        // 轨道已停止时重复 stop 会抛错，忽略即可
      }
    }
    benDiLiu.value = null
  }

  function guiWeiDaoKongXian() {
    qingLiMiaoBiao()
    qingLiGuiWei()
    tingZhiZhenLing()
    tingZhiBenDiGuiDao()
    zhuangTai.value = 'kongXian'
    tongHuaId.value = null
    jiShiMiao.value = 0
    maiKeFengKaiQi.value = true
    sheXiangTouKaiQi.value = true
    zuiHouZhongTai.value = null
  }

  // 进入终态：停表、停铃、停本地轨道，停留数秒后自动归位清理 UI
  function jinRuZhongTai() {
    if (zhuangTai.value === 'kongXian') return
    qingLiMiaoBiao()
    tingZhiZhenLing()
    tingZhiBenDiGuiDao()
    zhuangTai.value = 'yiJieShu'
    qingLiGuiWei()
    guiWeiDingShiQi = setTimeout(guiWeiDaoKongXian, ZHONG_TAI_TING_LIU_HAO_MIAO)
  }

  function chuLiTongHuaJieShou(zaiHe: { tongHuaId?: string; jieTongShiJian?: number } | undefined) {
    if (!tongHuaId.value || zaiHe?.tongHuaId !== tongHuaId.value) return
    if (zhuangTai.value !== 'zhenLing') return
    tingZhiZhenLing()
    zhuangTai.value = 'yiJieTong'
    jiShiMiao.value = 0
    const jieTongShiJianHaoMiao =
      typeof zaiHe.jieTongShiJian === 'number' && zaiHe.jieTongShiJian > 0
        ? zaiHe.jieTongShiJian
        : Date.now()
    miaoBiaoDingShiQi = setInterval(() => {
      jiShiMiao.value = Math.max(0, Math.floor((Date.now() - jieTongShiJianHaoMiao) / 1000))
    }, 1000)
  }

  function chuLiTongHuaJieShu(zaiHe: { tongHuaId?: string; zhuangTai?: TongHuaZhongTai }) {
    if (!tongHuaId.value || zaiHe?.tongHuaId !== tongHuaId.value) return
    if (zaiHe.zhuangTai) zuiHouZhongTai.value = zaiHe.zhuangTai
    jinRuZhongTai()
  }

  function chuLiTongHuaChaoShi(zaiHe: { tongHuaId?: string }) {
    chuLiTongHuaJieShu(zaiHe)
  }

  function queBaoXinLingJianTing(socket: XinLingSocket) {
    if (yiZhuCeSocket === socket) return
    yiZhuCeSocket = socket
    socket.on('通话接受', chuLiTongHuaJieShou)
    socket.on('通话结束', chuLiTongHuaJieShu)
    socket.on('通话超时', chuLiTongHuaChaoShi)
  }

  async function faQiTongHua(
    mubiaoJiaoSeId: string,
    faQiLeiXing: TongHuaLeiXing,
  ): Promise<boolean> {
    // 防抖：非空闲态忽略重复快速点击的邀请
    if (zhuangTai.value !== 'kongXian') return false

    const socket = 聊天仓库.socketLianJie
    if (!socket) {
      聊天仓库.sheZhiCuoWu(huoQuFanYi('tongHua', 'weiLianJieWangLuo'))
      return false
    }
    if (faQiLeiXing === 'shiPin' && !navigator.mediaDevices?.getUserMedia) {
      聊天仓库.sheZhiCuoWu(huoQuFanYi('tongHua', 'kaiQiSheXiangTouShiBai'))
      return false
    }

    const jiaoSe = 聊天仓库.jiaoSeXinXi
    duiFangNiCheng.value = jiaoSe?.wei_xin_ming || jiaoSe?.ming_zi || ''
    duiFangTouXiang.value = jiaoSe?.tou_xiang || ''

    // 视频形态先申请本地媒体权限；被拒则报翻译错误并终止（不进入振铃）
    if (faQiLeiXing === 'shiPin') {
      try {
        benDiLiu.value = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch {
        benDiLiu.value = null
        聊天仓库.sheZhiCuoWu(huoQuFanYi('tongHua', 'kaiQiSheXiangTouShiBai'))
        return false
      }
      maiKeFengKaiQi.value = true
      sheXiangTouKaiQi.value = true
    }

    leiXing.value = faQiLeiXing
    queBaoXinLingJianTing(socket)

    return await new Promise<boolean>((jieJue) => {
      socket.emit(
        '通话邀请',
        { jiaoSeId: mubiaoJiaoSeId, leiXing: faQiLeiXing },
        (queRen?: TongHuaQueRenZaiHe) => {
          if (queRen?.chengGong && queRen.tongHuaId) {
            tongHuaId.value = queRen.tongHuaId
            jiShiMiao.value = 0
            zhuangTai.value = 'zhenLing'
            qiDongZhenLing()
            jieJue(true)
            return
          }
          tingZhiBenDiGuiDao()
          聊天仓库.sheZhiCuoWu(queRen?.tiShi || huoQuFanYi('tongHua', 'faQiShiBai'))
          jieJue(false)
        },
      )
    })
  }

  function quXiaoTongHua(): void {
    const id = tongHuaId.value
    const socket = 聊天仓库.socketLianJie
    if (!id || !socket || zhuangTai.value !== 'zhenLing') return
    socket.emit('通话取消', { tongHuaId: id }, (queRen?: TongHuaQueRenZaiHe) => {
      if (queRen && queRen.chengGong === false) {
        // 服务端拒绝（如已超时结束）：以服务端为准，兜底归位防 UI 卡死
        jinRuZhongTai()
        if (queRen.tiShi) 聊天仓库.sheZhiCuoWu(queRen.tiShi)
      }
      // 成功场景等待服务端 通话结束(yiQuXiao) 事件驱动终态，保证系统消息先行到达
    })
  }

  function guaDuanTongHua(): void {
    const id = tongHuaId.value
    const socket = 聊天仓库.socketLianJie
    if (!id || !socket) return
    if (zhuangTai.value !== 'zhenLing' && zhuangTai.value !== 'yiJieTong') return
    socket.emit('通话挂断', { tongHuaId: id }, (queRen?: TongHuaQueRenZaiHe) => {
      if (queRen && queRen.chengGong === false) {
        jinRuZhongTai()
        if (queRen.tiShi) 聊天仓库.sheZhiCuoWu(queRen.tiShi)
      }
      // 成功场景等待服务端 通话结束(yiJieTong) 事件驱动终态
    })
  }

  function qieHuanMaiKeFeng(): void {
    maiKeFengKaiQi.value = !maiKeFengKaiQi.value
    for (const guiDao of benDiLiu.value?.getAudioTracks() ?? []) {
      guiDao.enabled = maiKeFengKaiQi.value
    }
  }

  function qieHuanSheXiangTou(): void {
    sheXiangTouKaiQi.value = !sheXiangTouKaiQi.value
    for (const guiDao of benDiLiu.value?.getVideoTracks() ?? []) {
      guiDao.enabled = sheXiangTouKaiQi.value
    }
  }

  // 组件卸载兜底：清理铃声/定时器/本地轨道；通话仍在进行时直接归位（服务端按超时收尾）
  function xieZaiQingLi(): void {
    if (zhuangTai.value === 'kongXian') {
      qingLiMiaoBiao()
      qingLiGuiWei()
      tingZhiZhenLing()
      tingZhiBenDiGuiDao()
      return
    }
    qingLiGuiWei()
    jinRuZhongTai()
    guiWeiDaoKongXian()
  }

  onScopeDispose(() => {
    xieZaiQingLi()
  })

  return {
    zhuangTai,
    leiXing,
    tongHuaId,
    duiFangNiCheng,
    duiFangTouXiang,
    jiShiMiao,
    maiKeFengKaiQi,
    sheXiangTouKaiQi,
    benDiLiu,
    zuiHouZhongTai,
    faQiTongHua,
    quXiaoTongHua,
    guaDuanTongHua,
    qieHuanMaiKeFeng,
    qieHuanSheXiangTou,
    xieZaiQingLi,
  }
})
