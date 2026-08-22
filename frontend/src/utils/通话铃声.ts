// Web Audio API 合成振铃音：440/480Hz 两音交替，各 400ms 循环，gain 包络防爆音。
// AudioContext 必须在用户手势调用链中创建（浏览器自动播放策略），
// 本模块仅由通话仓库的用户点击动作触发；无外部音频文件。
// 接通/取消/结束必须调用 tingZhiZhenLing 停铃并关闭 AudioContext 防泄漏。

const YIN_TIAO_PIN_LV_JIA = 440
const YIN_TIAO_PIN_LV_YI = 480
const DAN_YIN_SHI_CHANG_HAO_MIAO = 400
const ZUI_DA_YIN_LIANG = 0.12

let yinPinShangXiaWen: AudioContext | null = null
let jiaoTiJiShuQi: ReturnType<typeof setInterval> | null = null
let zuoYeZhenDangQi: OscillatorNode | null = null
let zuoYeZengYiQi: GainNode | null = null
let xiaYiGeYongJia = true

interface YinPinWenBenQuGouZaoQi {
  new (): AudioContext
}

function huoQuGouZaoQi(): YinPinWenBenQuGouZaoQi | null {
  const quanJu = globalThis as unknown as {
    AudioContext?: YinPinWenBenQuGouZaoQi
    webkitAudioContext?: YinPinWenBenQuGouZaoQi
  }
  return quanJu.AudioContext ?? quanJu.webkitAudioContext ?? null
}

function tingZhiZuoYeYinYuan() {
  if (zuoYeZhenDangQi) {
    try {
      zuoYeZhenDangQi.stop()
    } catch {
      // 已停止的振荡器重复 stop 会抛错，忽略即可
    }
    zuoYeZhenDangQi.onended = null
    try {
      zuoYeZhenDangQi.disconnect()
    } catch {
      // 已断开的节点重复 disconnect 会抛错，忽略即可
    }
    zuoYeZhenDangQi = null
  }
  if (zuoYeZengYiQi) {
    try {
      zuoYeZengYiQi.disconnect()
    } catch {
      // 同上
    }
    zuoYeZengYiQi = null
  }
}

function boFangDanYin() {
  if (!yinPinShangXiaWen || yinPinShangXiaWen.state === 'closed') return
  tingZhiZuoYeYinYuan()
  const zhenDangQi = yinPinShangXiaWen.createOscillator()
  const zengYiQi = yinPinShangXiaWen.createGain()
  zhenDangQi.type = 'sine'
  zhenDangQi.frequency.value = xiaYiGeYongJia ? YIN_TIAO_PIN_LV_JIA : YIN_TIAO_PIN_LV_YI
  xiaYiGeYongJia = !xiaYiGeYongJia

  const qiDian = yinPinShangXiaWen.currentTime
  const chiXuMiao = DAN_YIN_SHI_CHANG_HAO_MIAO / 1000
  // gain 包络：极短淡入 + 淡出，避免方波启停产生的爆音
  zengYiQi.gain.setValueAtTime(0.0001, qiDian)
  zengYiQi.gain.exponentialRampToValueAtTime(ZUI_DA_YIN_LIANG, qiDian + 0.02)
  zengYiQi.gain.exponentialRampToValueAtTime(0.0001, qiDian + chiXuMiao)

  zhenDangQi.connect(zengYiQi)
  zengYiQi.connect(yinPinShangXiaWen.destination)
  zhenDangQi.start(qiDian)
  zhenDangQi.stop(qiDian + chiXuMiao)
  zhenDangQi.onended = () => {
    if (zuoYeZhenDangQi === zhenDangQi) {
      zuoYeZhenDangQi = null
      zuoYeZengYiQi = null
    }
    try {
      zhenDangQi.disconnect()
      zengYiQi.disconnect()
    } catch {
      // 忽略重复断开
    }
  }

  zuoYeZhenDangQi = zhenDangQi
  zuoYeZengYiQi = zengYiQi
}

export function qiDongZhenLing(): boolean {
  tingZhiZhenLing()
  const gouZaoQi = huoQuGouZaoQi()
  if (!gouZaoQi) return false
  try {
    yinPinShangXiaWen = new gouZaoQi()
  } catch {
    yinPinShangXiaWen = null
    return false
  }
  // 用户手势链路内 resume，规避自动播放策略挂起状态
  void yinPinShangXiaWen.resume().catch(() => {})
  xiaYiGeYongJia = true
  boFangDanYin()
  jiaoTiJiShuQi = setInterval(boFangDanYin, DAN_YIN_SHI_CHANG_HAO_MIAO)
  return true
}

export function tingZhiZhenLing(): void {
  if (jiaoTiJiShuQi !== null) {
    clearInterval(jiaoTiJiShuQi)
    jiaoTiJiShuQi = null
  }
  tingZhiZuoYeYinYuan()
  if (yinPinShangXiaWen && yinPinShangXiaWen.state !== 'closed') {
    void yinPinShangXiaWen.close().catch(() => {})
  }
  yinPinShangXiaWen = null
}
