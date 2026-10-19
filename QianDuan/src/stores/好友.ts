import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  souSuoHaoYou,
  huoQuShouDaoShenQing,
  huoQuFaChuShenQing,
  huoQuHaoYouLieBiao,
  type HaoYouSouSuoXiang,
  type HaoYouShenQingXiang,
  type HaoYouXiang,
} from '@/api/社交'

export interface HaoYouFenZuXiang {
  shouZiMu: string
  lieBiao: HaoYouXiang[]
}

const HAN_YU_PIN_YIN_ANCHORS = [
  '啊', '芭', '擦', '搭', '鹅', '发', '噶', '哈', '击', '喀', '垃', '妈', '拿', '哦', '啪', '期',
  '然', '撒', '塌', '挖', '昔', '压', '匝',
] as const
const HAN_YU_PIN_YIN_SHOU_ZI_MU = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q',
  'R', 'S', 'T', 'W', 'X', 'Y', 'Z',
] as const
const PIN_YIN_COLLATOR = new Intl.Collator('zh')

function hanYuPinYinShouZiMu(danZi: string): string | null {
  for (let i = HAN_YU_PIN_YIN_ANCHORS.length - 1; i >= 0; i -= 1) {
    if (PIN_YIN_COLLATOR.compare(danZi, HAN_YU_PIN_YIN_ANCHORS[i] as string) >= 0) {
      return HAN_YU_PIN_YIN_SHOU_ZI_MU[i] as string
    }
  }
  return null
}

function duQuBenDiBeiZhu(haoYouId: string): string {
  try {
    return localStorage.getItem(`haoYouBeiZhu:${haoYouId}`) || ''
  } catch {
    return ''
  }
}

export const 使用好友仓库 = defineStore('好友', () => {
  const shouDaoLieBiao = ref<HaoYouShenQingXiang[]>([])
  const faChuLieBiao = ref<HaoYouShenQingXiang[]>([])
  const haoYouLieBiao = ref<HaoYouXiang[]>([])
  const shenQingCuoWu = ref<string>('')
  const haoYouCuoWu = ref<string>('')
  const chuShiJiaZaiZhong = ref(false)
  const yiChuShiHua = ref(false)
  const beiZhuBanBen = ref(0)

  function huoQuXianShiMing(haoYou: HaoYouXiang | HaoYouSouSuoXiang): string {
    const beiZhu = duQuBenDiBeiZhu(haoYou.id)
    if (beiZhu.trim()) return beiZhu
    return haoYou.ni_cheng || haoYou.yong_hu_ming || ''
  }

  function baoCunBeiZhu(haoYouId: string, beiZhu: string): void {
    const qingLi = beiZhu.trim().slice(0, 30)
    try {
      if (qingLi) localStorage.setItem(`haoYouBeiZhu:${haoYouId}`, qingLi)
      else localStorage.removeItem(`haoYouBeiZhu:${haoYouId}`)
    } catch {
      return
    }
    beiZhuBanBen.value += 1
  }

  function huoQuBeiZhu(haoYouId: string): string {
    void beiZhuBanBen.value
    return duQuBenDiBeiZhu(haoYouId)
  }

  function huoQuShouZiMu(haoYou: HaoYouXiang): string {
    void beiZhuBanBen.value
    const ming = huoQuXianShiMing(haoYou).trim()
    if (!ming) return '#'
    const shouZi = Array.from(ming)[0] as string
    if (/[a-zA-Z]/.test(shouZi)) return shouZi.toUpperCase()
    if (/[0-9]/.test(shouZi)) return '#'
    return hanYuPinYinShouZiMu(shouZi) ?? '#'
  }

  const haoYouFenQu = computed<HaoYouFenZuXiang[]>(() => {
    const fenZu = new Map<string, HaoYouXiang[]>()
    for (const haoYou of haoYouLieBiao.value) {
      const shouZiMu = huoQuShouZiMu(haoYou)
      const yiCun = fenZu.get(shouZiMu)
      if (yiCun) yiCun.push(haoYou)
      else fenZu.set(shouZiMu, [haoYou])
    }
    return [...fenZu.entries()]
      .sort((a, b) => {
        if (a[0] === '#') return 1
        if (b[0] === '#') return -1
        return a[0].localeCompare(b[0])
      })
      .map(([shouZiMu, lieBiao]) => ({
        shouZiMu,
        lieBiao: [...lieBiao].sort((a, b) =>
          huoQuXianShiMing(a).localeCompare(huoQuXianShiMing(b), 'zh'),
        ),
      }))
  })

  const suoYinLieBiao = computed(() => haoYouFenQu.value.map((fenQu) => fenQu.shouZiMu))

  async function chuShiHua(): Promise<void> {
    if (chuShiJiaZaiZhong.value) return
    chuShiJiaZaiZhong.value = true
    shenQingCuoWu.value = ''
    haoYouCuoWu.value = ''
    const [shenQingJieGuo, haoYouJieGuo] = await Promise.allSettled([
      (async () => {
        const [shouDao, faChu] = await Promise.all([huoQuShouDaoShenQing(), huoQuFaChuShenQing()])
        return { shouDao, faChu }
      })(),
      huoQuHaoYouLieBiao(),
    ])
    if (shenQingJieGuo.status === 'fulfilled') {
      shouDaoLieBiao.value = shenQingJieGuo.value.shouDao
      faChuLieBiao.value = shenQingJieGuo.value.faChu
    } else {
      shenQingCuoWu.value = 'shenQingJiaZaiShiBai'
    }
    if (haoYouJieGuo.status === 'fulfilled') {
      haoYouLieBiao.value = haoYouJieGuo.value
    } else {
      haoYouCuoWu.value = 'haoYouJiaZaiShiBai'
    }
    yiChuShiHua.value = true
    chuShiJiaZaiZhong.value = false
  }

  async function shuaXinShenQing(): Promise<void> {
    try {
      const [shouDao, faChu] = await Promise.all([huoQuShouDaoShenQing(), huoQuFaChuShenQing()])
      shouDaoLieBiao.value = shouDao
      faChuLieBiao.value = faChu
      shenQingCuoWu.value = ''
    } catch {
      shenQingCuoWu.value = 'shenQingJiaZaiShiBai'
    }
  }

  async function shuaXinHaoYou(): Promise<void> {
    try {
      haoYouLieBiao.value = await huoQuHaoYouLieBiao()
      haoYouCuoWu.value = ''
    } catch {
      haoYouCuoWu.value = 'haoYouJiaZaiShiBai'
    }
  }

  async function souSuo(wenBen: string): Promise<HaoYouSouSuoXiang[]> {
    return souSuoHaoYou(wenBen.trim())
  }

  function qingKong(): void {
    shouDaoLieBiao.value = []
    faChuLieBiao.value = []
    haoYouLieBiao.value = []
    shenQingCuoWu.value = ''
    haoYouCuoWu.value = ''
    yiChuShiHua.value = false
  }

  return {
    shouDaoLieBiao,
    faChuLieBiao,
    haoYouLieBiao,
    shenQingCuoWu,
    haoYouCuoWu,
    chuShiJiaZaiZhong,
    yiChuShiHua,
    haoYouFenQu,
    suoYinLieBiao,
    chuShiHua,
    shuaXinShenQing,
    shuaXinHaoYou,
    souSuo,
    huoQuXianShiMing,
    huoQuShouZiMu,
    huoQuBeiZhu,
    baoCunBeiZhu,
    qingKong,
  }
})
