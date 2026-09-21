import { huoQuFanYi } from '@/config/translations'
import { ZHAN_TIE_TU_PIAN_PEI_ZHI } from '@/config/消息配置'

interface Use粘贴图片依赖 {
  faSongTuPian: (wenJian: File) => unknown
  sheZhiCuoWu: (xinXi: string) => void
}

type ZhanTiePanDing =
  | { jieGuo: 'fei-tu-pian' }
  | { jieGuo: 'bu-ke-du' }
  | { jieGuo: 'ju-jue'; yuanYin: 'leiXing' | 'guoDa' | 'weiKong' }
  | { jieGuo: 'yun-xu'; wenJian: File }

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

function panDingWenJian(wenJian: File): ZhanTiePanDing {
  const juJue = panDingTuPianJuJue(wenJian, ZHAN_TIE_TU_PIAN_PEI_ZHI)
  if (juJue) return { jieGuo: 'ju-jue', yuanYin: juJue }
  return { jieGuo: 'yun-xu', wenJian }
}

/**
 * QQ 口径：一次粘贴只认第一张 image/* 内容（含文本与图片时按图片处理并丢弃文本），
 * 完全没有图片项时不判定，交回浏览器原生文本粘贴。
 * items 无图片项时退化到 files：部分 Android WebView / 旧版 Safari 只填 files。
 */
function panDingZhanTie(shuJu: DataTransfer | null): ZhanTiePanDing {
  if (!shuJu) return { jieGuo: 'fei-tu-pian' }
  const xiangLieBiao = shuJu.items
  if (xiangLieBiao) {
    for (let xiaBiao = 0; xiaBiao < xiangLieBiao.length; xiaBiao++) {
      const wenJian = quXiangWenJian(xiangLieBiao[xiaBiao])
      if (wenJian) return panDingWenJian(wenJian)
      if (shiTuPianLeiXing(xiangLieBiao[xiaBiao]?.type || '')) return { jieGuo: 'bu-ke-du' }
    }
  }
  const wenJianLieBiao = shuJu.files
  if (wenJianLieBiao) {
    for (let xiaBiao = 0; xiaBiao < wenJianLieBiao.length; xiaBiao++) {
      const wenJian = wenJianLieBiao[xiaBiao]
      if (shiTuPianWenJian(wenJian)) return panDingWenJian(wenJian)
    }
  }
  return { jieGuo: 'fei-tu-pian' }
}

export function use粘贴图片(yiLai: Use粘贴图片依赖) {
  function chuLiZhanTie(shiJian: ClipboardEvent): void {
    let panDing: ZhanTiePanDing
    try {
      panDing = panDingZhanTie(shiJian.clipboardData)
    } catch {
      panDing = { jieGuo: 'bu-ke-du' }
    }
    if (panDing.jieGuo === 'fei-tu-pian') return
    // 命中图片即拦截：否则 Firefox/Edge 会把文件名或 HTML 片段粘进输入框
    shiJian.preventDefault()
    if (panDing.jieGuo === 'yun-xu') {
      try {
        const jieGuo = yiLai.faSongTuPian(panDing.wenJian)
        if (jieGuo && typeof (jieGuo as PromiseLike<unknown>).then === 'function') {
          ;(jieGuo as PromiseLike<unknown>).then(undefined, () =>
            yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'faSongShiBai')),
          )
        }
      } catch {
        yiLai.sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'faSongShiBai'))
      }
      return
    }
    yiLai.sheZhiCuoWu(
      huoQuFanYi(
        'duoMeiTi',
        panDing.jieGuo === 'bu-ke-du' ? 'zhanTieShuJuBuKeYong' : JU_JUE_FAN_YI_JIAN[panDing.yuanYin],
      ),
    )
  }

  return { chuLiZhanTie }
}
