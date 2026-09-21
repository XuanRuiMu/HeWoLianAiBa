import { ref } from 'vue'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'

const LU_YIN_SHANG_HUA_QU_XIAO_JU_LI = 80

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

  async function wanChengLuYin(faSong: boolean) {
    const luYinQi = meiTiLuYinQi
    if (!luYinQi) {
      qingLiLuYinZiYuan()
      return
    }
    const yongShiHaoMiao = Date.now() - luYinKaiShiHaoMiao
    await new Promise<void>((jieJue) => {
      luYinQi.addEventListener(
        'stop',
        () => {
          jieJue()
        },
        { once: true },
      )
      if (luYinQi.state !== 'inactive') luYinQi.stop()
      else jieJue()
    })
    const kuaiLieBiao = luYinKuaiLieBiao
    const mime = meiTiLuYinQi?.mimeType || luYinQi.mimeType || 'audio/webm'
    qingLiLuYinZiYuan()

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
