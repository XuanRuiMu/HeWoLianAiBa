import { huoQuFanYi } from '@/config/translations'
import { ZHAN_TIE_TU_PIAN_PEI_ZHI } from '@/config/消息配置'

interface Use粘贴图片依赖 {
  /**
   * FP-10b（缺陷9）：粘贴到的图片按**出现顺序逐张**交给待发块序列，不再直发。
   * 一次粘贴多图 / 图文同存都走这里（旧口径「只认第一张并且立即发出」正是用户投诉的点）。
   */
  fanJiaTuPian: (wenJian: File) => unknown
  /** 与图片同存的文字：交回输入区（同一句话里图文可混排），不随图片粘贴被丢弃 */
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

/**
 * 图片文件的可发送判定（类型白名单 → 非空 → 大小上限），判定顺序即口径。
 * 唯一实现：粘贴入口与 FP-06b「从本地添加表情」共用，禁止第二份判定。
 * 返回 null 表示放行；拒绝原因由调用方自己映射到对应文案（粘贴与添加表情的提示语不同）。
 */
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

/**
 * QQ 口径（FP-10b 收口）：**含图片的粘贴一律拦截原生行为**，把这一次粘贴里的
 * 全部图片按出现顺序连同文字一起交给待发块序列 —— 不再「只认第一张 + 直接发送」。
 * items 无图片项时退化到 files：部分 Android WebView / 旧版 Safari 只填 files。
 * 完全没有图片项时返回空列表，交回浏览器原生文本粘贴（纯文字粘贴行为不变）。
 */
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

/**
 * 粘贴入口：判定 + 交出，**不建预览地址、不直发**（blob URL 生命周期归调用方的
 * dengJiYuLanURL 台账独占，异步失败的提示口径也在这里统一）。
 *
 * FP-10c：拖入与粘贴共用同一条判定链（DragEvent 与 ClipboardEvent 都带 dataTransfer/clipboardData，
 * 全库只有这一处读法）。旧形态是输入区只有粘贴口，用户从桌面拖图进来会被浏览器当成导航。
 */
export function use粘贴图片(yiLai: Use粘贴图片依赖) {
  function chuLiZhanTie(shiJian: ClipboardEvent | DragEvent): void {
    let jieXi: ZhanTieJieXi
    try {
      // 粘贴带 clipboardData、拖入带 dataTransfer，两者都是 DataTransfer：判定链只此一条读法
      const shuJu =
        (shiJian as ClipboardEvent).clipboardData ?? (shiJian as DragEvent).dataTransfer ?? null
      jieXi = panDingZhanTie(shuJu)
    } catch {
      jieXi = { tuPianLieBiao: [], juJueYuanYin: null, buKeDu: true, wenBen: '' }
    }
    const youDongXi =
      jieXi.tuPianLieBiao.length > 0 || jieXi.buKeDu || jieXi.juJueYuanYin !== null
    if (!youDongXi) return
    // 命中图片即拦截：否则 Firefox/Edge 会把文件名或 HTML 片段粘进输入框，拖入会直接导航走
    shiJian.preventDefault()
    // 文字先落输入区，图片再按出现顺序插到光标处 ⇒ 同一条消息里的顺序就是用户看到的顺序
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
