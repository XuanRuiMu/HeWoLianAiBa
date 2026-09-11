import { ref } from 'vue'
import { LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI } from '@/config/消息配置'
import type { 消息 } from '@/types'

export interface YuYinShiBieQi {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult:
    | ((shiJian: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void)
    | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface YuYinZhuanWenZiYiLai {
  huoQuYuYinDiZhi: (xiaoXi: 消息) => string | undefined
  sheZhiCuoWu?: (xinXi: string) => void
  shiBieQiGongChang?: () => YuYinShiBieQi | null
  zhuanXieQingQiu?: (xiaoXi: 消息) => Promise<string | null>
}

function xiaoXiJian(xiaoXi: 消息): string {
  return xiaoXi.ke_hu_duan_id || xiaoXi.id
}

function huoQuYiCunZhuanXie(xiaoXi: 消息): string | null {
  const neiRong = (xiaoXi.nei_rong || '').trim()
  if (neiRong.length > 0) return neiRong.slice(0, 500)
  return null
}

function moRenShiBieQiGongChang(): YuYinShiBieQi | null {
  if (typeof window === 'undefined') return null
  const chuangKou = window as unknown as Record<string, unknown>
  const GouZao = (chuangKou['SpeechRecognition'] ?? chuangKou['webkitSpeechRecognition']) as
    | (new () => YuYinShiBieQi)
    | undefined
  if (!GouZao) return null
  const shiBieQi = new GouZao()
  shiBieQi.lang = 'zh-CN'
  shiBieQi.interimResults = false
  shiBieQi.maxAlternatives = 1
  return shiBieQi
}

function shiBieBoFang(diZhi: string, shiBieQi: YuYinShiBieQi): Promise<string> {
  return new Promise((jieJue, juJue) => {
    if (typeof Audio === 'undefined') {
      juJue(new Error('audio'))
      return
    }
    const yinPin = new Audio(diZhi)
    const duanLuo: string[] = []
    let yiJieShu = false
    let yiQiDong = false
    const chaoShi = setTimeout(() => {
      qingLi()
      juJue(new Error('timeout'))
    }, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yuYinZhuanXieChaoShiHaoMiao)
    function qingLi() {
      if (yiJieShu) return
      yiJieShu = true
      clearTimeout(chaoShi)
      yinPin.pause()
      yinPin.src = ''
      shiBieQi.onresult = null
      shiBieQi.onerror = null
      shiBieQi.onend = null
    }
    shiBieQi.onresult = (shiJian) => {
      for (let i = 0; i < shiJian.results.length; i++) {
        const jieGuo = shiJian.results[i]
        if (jieGuo && jieGuo.isFinal && jieGuo[0] && jieGuo[0].transcript) {
          duanLuo.push(jieGuo[0].transcript)
        }
      }
    }
    shiBieQi.onerror = () => {
      qingLi()
      juJue(new Error('recognize'))
    }
    shiBieQi.onend = () => {
      qingLi()
      jieJue(duanLuo.join('').trim())
    }
    yinPin.onended = () => {
      if (!yiQiDong) {
        qingLi()
        jieJue(duanLuo.join('').trim())
        return
      }
      try {
        shiBieQi.stop()
      } catch {
        qingLi()
        jieJue(duanLuo.join('').trim())
      }
    }
    yinPin.onerror = () => {
      qingLi()
      juJue(new Error('audio'))
    }
    try {
      shiBieQi.start()
      yiQiDong = true
    } catch {
      qingLi()
      juJue(new Error('recognize'))
      return
    }
    Promise.resolve(yinPin.play()).catch(() => {
      qingLi()
      juJue(new Error('audio'))
    })
  })
}

export function use语音转文字(yiLai: YuYinZhuanWenZiYiLai) {
  const zhuanWenZiJiLu = ref(new Map<string, string>())
  const zhuanXieZhongJiHe = ref(new Set<string>())
  const yiZhanKaiJiHe = ref(new Set<string>())
  const zhuanWenZiShiBaiJiHe = ref(new Set<string>())

  function huoQuZhuanWenZi(xiaoXi: 消息): string | undefined {
    return zhuanWenZiJiLu.value.get(xiaoXiJian(xiaoXi))
  }

  function shiYuYinZhuanXieZhong(xiaoXi: 消息): boolean {
    return zhuanXieZhongJiHe.value.has(xiaoXiJian(xiaoXi))
  }

  function shiZhuanWenZiZhanKai(xiaoXi: 消息): boolean {
    return yiZhanKaiJiHe.value.has(xiaoXiJian(xiaoXi))
  }

  function shiZhuanWenZiShiBai(xiaoXi: 消息): boolean {
    return zhuanWenZiShiBaiJiHe.value.has(xiaoXiJian(xiaoXi))
  }

  function jiLuChengGong(jian: string, wenBen: string): string {
    const qingLi = wenBen.trim().slice(0, 500)
    zhuanWenZiJiLu.value.set(jian, qingLi)
    zhuanWenZiShiBaiJiHe.value.delete(jian)
    return qingLi
  }

  function jiLuShiBai(jian: string): null {
    zhuanWenZiShiBaiJiHe.value.add(jian)
    return null
  }

  async function zhuanWenZi(xiaoXi: 消息): Promise<string | null> {
    const jian = xiaoXiJian(xiaoXi)
    const yiCun = zhuanWenZiJiLu.value.get(jian)
    if (yiCun) {
      zhuanWenZiShiBaiJiHe.value.delete(jian)
      return yiCun
    }
    if (zhuanXieZhongJiHe.value.has(jian)) return null
    zhuanWenZiShiBaiJiHe.value.delete(jian)
    const suiDai = huoQuYiCunZhuanXie(xiaoXi)
    if (suiDai) {
      return jiLuChengGong(jian, suiDai)
    }
    if (yiLai.zhuanXieQingQiu) {
      zhuanXieZhongJiHe.value.add(jian)
      try {
        const yuanCheng = await yiLai.zhuanXieQingQiu(xiaoXi)
        if (yuanCheng && yuanCheng.trim()) {
          return jiLuChengGong(jian, yuanCheng)
        }
      } catch {
        /* 远端免费转写失败则降级为本地识别 */
      } finally {
        zhuanXieZhongJiHe.value.delete(jian)
      }
    }
    const diZhi = yiLai.huoQuYuYinDiZhi(xiaoXi)
    const gongChang = yiLai.shiBieQiGongChang ?? moRenShiBieQiGongChang
    const shiBieQi = gongChang()
    if (!shiBieQi) {
      return jiLuShiBai(jian)
    }
    if (!diZhi) {
      return jiLuShiBai(jian)
    }
    zhuanXieZhongJiHe.value.add(jian)
    try {
      const wenBen = await shiBieBoFang(diZhi, shiBieQi)
      if (!wenBen) {
        return jiLuShiBai(jian)
      }
      return jiLuChengGong(jian, wenBen)
    } catch {
      return jiLuShiBai(jian)
    } finally {
      zhuanXieZhongJiHe.value.delete(jian)
    }
  }

  async function qieHuanZhuanWenZiXianShi(xiaoXi: 消息): Promise<void> {
    const jian = xiaoXiJian(xiaoXi)
    if (yiZhanKaiJiHe.value.has(jian)) {
      yiZhanKaiJiHe.value.delete(jian)
      return
    }
    zhuanWenZiShiBaiJiHe.value.delete(jian)
    const wenBen = await zhuanWenZi(xiaoXi)
    if (wenBen) yiZhanKaiJiHe.value.add(jian)
  }

  return {
    huoQuZhuanWenZi,
    shiYuYinZhuanXieZhong,
    shiZhuanWenZiZhanKai,
    shiZhuanWenZiShiBai,
    zhuanWenZi,
    qieHuanZhuanWenZiXianShi,
  }
}
