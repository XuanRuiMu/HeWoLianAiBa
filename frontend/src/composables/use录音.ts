import { ref } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'

const LU_YIN_SHANG_HUA_QU_XIAO_JU_LI = 80
// FP-17：等待 MediaRecorder 停止事件的兜底上限。某些机型 stop 事件可能丢失或 stop() 抛错，
// 没有兜底就会把「录音中」和「结算中」两把锁永久留在置位态，整页再也录不了音。
const LU_YIN_TING_ZHI_DENG_DAI_HAO_MIAO = 2000

interface Use录音依赖 {
  sheZhiCuoWu: (xinXi: string) => void
  faSongYuYin: (
    blob: Blob,
    fuJia: { shiChangHaoMiao: number; wenJianMing: string },
  ) => Promise<unknown>
  gunDongDaoDiBu: () => void
}

export function use录音(yiLai: Use录音依赖) {
  const luYinMoShi = ref(false)
  const luYinZhong = ref(false)
  const luYinMiao = ref(0)
  const luYinShangHuaQuXiao = ref(false)
  let meiTiLuYinQi: MediaRecorder | null = null
  let luYinLiuPian: MediaStream | null = null
  let luYinKuaiLieBiao: Blob[] = []
  let luYinJiShiQi: ReturnType<typeof setInterval> | null = null
  let luYinKaiShiHaoMiao = 0
  let luYinQiDianY: number | null = null
  let luYinQiBuChuLiZhong = false
  // FP-17 结算去重：真机上 pointerup 与 touchend 会先后触发 songKaiLuYin（错误回调/切后台也走结算），
  // 两条结算链会各取同一段录音 blob 各发一次 ⇒ 重复语音条。同一次录音只允许结算一次；
  // 结算链离开等待段（无论停止事件到没到、stop() 抛不抛错）即资源与闸门一起复位，
  // 放在 finally 里保证异常也不把页面锁死。
  let benCiJieSuanZhong = false

  function qieHuanLuYinMoShi() {
    if (luYinZhong.value) return
    luYinMoShi.value = !luYinMoShi.value
  }

  function guanBiLuYinMoShi() {
    if (luYinZhong.value) return
    luYinMoShi.value = false
  }

  function qingLiLuYinZiYuan() {
    if (luYinJiShiQi) {
      clearInterval(luYinJiShiQi)
      luYinJiShiQi = null
    }
    meiTiLuYinQi = null
    if (luYinLiuPian) {
      luYinLiuPian.getTracks().forEach((guiDao) => guiDao.stop())
      luYinLiuPian = null
    }
    luYinZhong.value = false
    luYinShangHuaQuXiao.value = false
    luYinQiDianY = null
  }

  /**
   * FP-17：等待录制器停止的兜底口。stop 事件可能丢失、stop() 可能抛状态竞态错误，
   * 两者都必须收敛成「已停止」而不是把结算链挂在 await 上。
   */
  function dengDaiLuYinTingZhi(luYinQi: MediaRecorder): Promise<void> {
    return new Promise<void>((jieJue) => {
      const dingShi = setTimeout(jieJue, LU_YIN_TING_ZHI_DENG_DAI_HAO_MIAO)
      luYinQi.addEventListener(
        'stop',
        () => {
          clearTimeout(dingShi)
          jieJue()
        },
        { once: true },
      )
      try {
        if (luYinQi.state !== 'inactive') luYinQi.stop()
        else {
          clearTimeout(dingShi)
          jieJue()
        }
      } catch {
        clearTimeout(dingShi)
        jieJue()
      }
    })
  }

  async function wanChengLuYin(faSong: boolean) {
    if (benCiJieSuanZhong) return
    const luYinQi = meiTiLuYinQi
    if (!luYinQi) {
      qingLiLuYinZiYuan()
      return
    }
    benCiJieSuanZhong = true
    const yongShiHaoMiao = Date.now() - luYinKaiShiHaoMiao
    try {
      await dengDaiLuYinTingZhi(luYinQi)
    } finally {
      // 无论停止事件是否到达、stop() 是否抛错，都必须释放录制资源与结算闸门；否则页面永久锁死
      qingLiLuYinZiYuan()
      benCiJieSuanZhong = false
    }
    const kuaiLieBiao = luYinKuaiLieBiao
    const mime = luYinQi.mimeType || 'audio/webm'

    if (!faSong) return
    if (!luYinMoShi.value) luYinMoShi.value = true

    if (yongShiHaoMiao < DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanMiao * 1000) {
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'shuoHuaTaiDuan'))
      luYinMoShi.value = false
      return
    }
    luYinMoShi.value = false
    if (kuaiLieBiao.length === 0) return
    const blob = new Blob(kuaiLieBiao, { type: mime })
    // V6 顺手项：按真实 mimeType 映射扩展名（iOS Safari 产出 audio/mp4，不再误标 .webm）
    const kuoZhanMing = mime.includes('mp4')
      ? 'm4a'
      : mime.includes('ogg')
        ? 'ogg'
        : mime.includes('mpeg') || mime.includes('mp3')
          ? 'mp3'
          : mime.includes('wav')
            ? 'wav'
            : mime.includes('aac')
              ? 'aac'
              : 'webm'
    await yiLai.faSongYuYin(blob, {
      shiChangHaoMiao: Math.round(yongShiHaoMiao),
      wenJianMing: `yuyin-${Date.now()}.${kuoZhanMing}`,
    })
    yiLai.gunDongDaoDiBu()
  }

  async function kaiShiLuYin() {
    if (luYinZhong.value || luYinQiBuChuLiZhong) return
    luYinQiBuChuLiZhong = true
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'luYinShiBai'))
      luYinQiBuChuLiZhong = false
      return
    }
    let liuPian: MediaStream
    try {
      liuPian = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'luYinShiBai'))
      luYinQiBuChuLiZhong = false
      return
    }

    const houXuanMime = ['audio/webm;codecs=opus', 'audio/webm']
    const zhiChiMime =
      houXuanMime.find((mime) => {
        try {
          return MediaRecorder.isTypeSupported(mime)
        } catch {
          return false
        }
      }) || ''

    let luYinQi: MediaRecorder
    try {
      luYinQi = zhiChiMime
        ? new MediaRecorder(liuPian, { mimeType: zhiChiMime })
        : new MediaRecorder(liuPian)
    } catch {
      liuPian.getTracks().forEach((guiDao) => guiDao.stop())
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'luYinShiBai'))
      luYinQiBuChuLiZhong = false
      return
    }
    luYinQiBuChuLiZhong = false

    luYinLiuPian = liuPian
    meiTiLuYinQi = luYinQi
    luYinKuaiLieBiao = []
    luYinQi.ondataavailable = (shiJian) => {
      if (shiJian.data && shiJian.data.size > 0) luYinKuaiLieBiao.push(shiJian.data)
    }
    luYinQi.onerror = () => {
      void wanChengLuYin(false).then(() => {
        luYinMoShi.value = false
        yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'luYinShiBai'))
      })
    }

    luYinKaiShiHaoMiao = Date.now()
    luYinMiao.value = 0
    luYinZhong.value = true
    luYinShangHuaQuXiao.value = false
    luYinQi.start()

    luYinJiShiQi = setInterval(() => {
      luYinMiao.value = Math.floor((Date.now() - luYinKaiShiHaoMiao) / 1000)
      if (luYinMiao.value >= DUO_MEI_TI_PEI_ZHI.yuYinZuiDaMiao) {
        songKaiLuYin()
      }
    }, 1000)
  }

  function songKaiLuYin() {
    if (!luYinZhong.value) return
    void wanChengLuYin(!luYinShangHuaQuXiao.value)
  }

  function quXiaoLuYin() {
    if (!luYinZhong.value) return
    void wanChengLuYin(false)
  }

  function chuLiLuYinYiDong(event: PointerEvent) {
    if (!luYinZhong.value) return
    if (luYinQiDianY === null) {
      luYinQiDianY = event.clientY
      return
    }
    luYinShangHuaQuXiao.value = luYinQiDianY - event.clientY > LU_YIN_SHANG_HUA_QU_XIAO_JU_LI
  }

  return {
    luYinMoShi,
    luYinZhong,
    luYinMiao,
    luYinShangHuaQuXiao,
    qieHuanLuYinMoShi,
    guanBiLuYinMoShi,
    qingLiLuYinZiYuan,
    wanChengLuYin,
    kaiShiLuYin,
    songKaiLuYin,
    quXiaoLuYin,
    chuLiLuYinYiDong,
  }
}
