import { huoQuFanYi } from '@/config/翻译表'
import { ZHAN_TIE_TU_PIAN_PEI_ZHI } from '@/config/消息配置'

interface Use粘贴图片依赖 {
  fanJiaTuPian: (wenJian: File) => unknown
  fanJiaWenZi?: (wenBen: string) => void
  sheZhiCuoWu: (xinXi: string) => void
}

const JU_JUE_FAN_YI_JIAN = {
  leiXing: 'zhanTieMIMEBuZhiChi',
  guoDa: 'zhanTieTuPianGuoDa',
  weiKong: 'zhanTieTuPianWeiKong',
} as const

export type TuPianJuJueYuanYin = 'leiXing' | 'guoDa' | 'weiKong'

export interface TuPianWenJianYueShu {
  zuiDaZiJieZiJie: number
  yunXuMIME: readonly string[]
}

export function panDingTuPianJuJue(
  wenJian: File,
  yueShu: TuPianWenJianYueShu,
): TuPianJuJueYuanYin | null {
  const mime = (wenJian.type || '').toLowerCase()
  if (!yueShu.yunXuMIME.includes(mime)) return 'leiXing'
  if (wenJian.size <= 0) return 'weiKong'
  if (wenJian.size > yueShu.zuiDaZiJieZiJie) return 'guoDa'
  return null
}

function shiTuPianLeiXing(mime: string): boolean {
  return mime.toLowerCase().startsWith('image/')
}

function quXiangWenJian(xiang: DataTransferItem | undefined): File | null {
  if (!xiang || xiang.kind !== 'file' || !shiTuPianLeiXing(xiang.type || '')) return null
  try {
    return xiang.getAsFile ? xiang.getAsFile() : null
  } catch {
    return null
  }
}

function shiTuPianWenJian(wenJian: File | null | undefined): wenJian is File {
  return !!wenJian && shiTuPianLeiXing(wenJian.type || '')
}

interface ZhanTieJieXi {
  tuPianLieBiao: File[]
  juJueYuanYin: TuPianJuJueYuanYin | null
  buKeDu: boolean
  wenBen: string
}

function panDingZhanTie(shuJu: DataTransfer | null): ZhanTieJieXi {
  const kong: ZhanTieJieXi = { tuPianLieBiao: [], juJueYuanYin: null, buKeDu: false, wenBen: '' }
  if (!shuJu) return kong
  const tuPianLieBiao: File[] = []
  let juJueYuanYin: TuPianJuJueYuanYin | null = null
  let buKeDu = false
  let youTuXiangXiang = false
  const xiangLieBiao = shuJu.items
  if (xiangLieBiao) {
    for (let xiaBiao = 0; xiaBiao < xiangLieBiao.length; xiaBiao++) {
      const xiang = xiangLieBiao[xiaBiao]
      if (!shiTuPianLeiXing(xiang?.type || '')) continue
      youTuXiangXiang = true
      if (xiang.kind !== 'file') {
        buKeDu = true
        continue
      }
      const wenJian = quXiangWenJian(xiang)
      if (!wenJian) {
        buKeDu = true
        continue
      }
      const juJue = panDingTuPianJuJue(wenJian, ZHAN_TIE_TU_PIAN_PEI_ZHI)
      if (juJue) {
        if (!juJueYuanYin) juJueYuanYin = juJue
        continue
      }
      tuPianLieBiao.push(wenJian)
    }
  }
  const wenJianLieBiao = shuJu.files
  if (tuPianLieBiao.length === 0 && !youTuXiangXiang && wenJianLieBiao) {
    for (let xiaBiao = 0; xiaBiao < wenJianLieBiao.length; xiaBiao++) {
      const wenJian = wenJianLieBiao[xiaBiao]
      if (!shiTuPianWenJian(wenJian)) continue
      youTuXiangXiang = true
      const juJue = panDingTuPianJuJue(wenJian, ZHAN_TIE_TU_PIAN_PEI_ZHI)
      if (juJue) {
        if (!juJueYuanYin) juJueYuanYin = juJue
        continue
      }
      tuPianLieBiao.push(wenJian)
    }
  }
  if (!youTuXiangXiang && tuPianLieBiao.length === 0) return kong
  let wenBen: string
  try {
    wenBen = typeof shuJu.getData === 'function' ? shuJu.getData('text/plain') || '' : ''
  } catch {
    wenBen = ''
  }
  return { tuPianLieBiao, juJueYuanYin, buKeDu, wenBen }
}

export function use粘贴图片(yiLai: Use粘贴图片依赖) {
  function chuLiZhanTie(shiJian: ClipboardEvent | DragEvent): void {
    let jieXi: ZhanTieJieXi
    try {
      const shuJu =
        (shiJian as ClipboardEvent).clipboardData ?? (shiJian as DragEvent).dataTransfer ?? null
      jieXi = panDingZhanTie(shuJu)
    } catch {
      jieXi = { tuPianLieBiao: [], juJueYuanYin: null, buKeDu: true, wenBen: '' }
    }
    const youDongXi =
      jieXi.tuPianLieBiao.length > 0 || jieXi.buKeDu || jieXi.juJueYuanYin !== null
    if (!youDongXi) return
    shiJian.preventDefault()
    if (jieXi.wenBen.trim() !== '' && yiLai.fanJiaWenZi) yiLai.fanJiaWenZi(jieXi.wenBen)
    for (const wenJian of jieXi.tuPianLieBiao) jiaOuDaiFaTu(yiLai, wenJian)
    if (jieXi.juJueYuanYin) {
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', JU_JUE_FAN_YI_JIAN[jieXi.juJueYuanYin]))
      return
    }
    if (jieXi.buKeDu && jieXi.tuPianLieBiao.length === 0) {
      yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'zhanTieShuJuBuKeYong'))
    }
  }

  function chuLiTuoLuo(shiJian: DragEvent): void {
    chuLiZhanTie(shiJian)
  }

  return { chuLiZhanTie, chuLiTuoLuo }
}

function jiaOuDaiFaTu(yiLai: Use粘贴图片依赖, wenJian: File): void {
  try {
    const jieGuo = yiLai.fanJiaTuPian(wenJian)
    if (jieGuo && typeof (jieGuo as PromiseLike<unknown>).then === 'function') {
      ;(jieGuo as PromiseLike<unknown>).then(undefined, () =>
        yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'faSongShiBai')),
      )
    }
  } catch {
    yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'faSongShiBai'))
  }
}
