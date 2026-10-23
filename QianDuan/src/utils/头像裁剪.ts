
export const TOU_XIANG_SHU_CHU_CHI_CUN = 1024
export const TOU_XIANG_ZUI_DA_YUAN_TU = 4096

export interface YuanQu {
  x: number
  y: number
  bianChang: number
}

export function jiSuanJiChuSuoFang(yuanKuan: number, yuanGao: number, quYuBianChang: number): number {
  const youXiaoKuan = Math.max(1, yuanKuan)
  const youXiaoGao = Math.max(1, yuanGao)
  return Math.max(quYuBianChang / youXiaoKuan, quYuBianChang / youXiaoGao)
}

export function yueShuPianYi(
  pianYiX: number,
  pianYiY: number,
  xuanRanKuan: number,
  xuanRanGao: number,
  quYuBianChang: number,
): { x: number; y: number } {
  const zuiXiaoX = Math.min(0, quYuBianChang - xuanRanKuan)
  const zuiXiaoY = Math.min(0, quYuBianChang - xuanRanGao)
  return {
    x: Math.max(zuiXiaoX, Math.min(0, pianYiX)),
    y: Math.max(zuiXiaoY, Math.min(0, pianYiY)),
  }
}

export function jiSuanYuanQu(canShu: {
  yuanKuan: number
  yuanGao: number
  suoFang: number
  pianYiX: number
  pianYiY: number
  quYuBianChang: number
}): YuanQu {
  const { yuanKuan, yuanGao, suoFang, pianYiX, pianYiY, quYuBianChang } = canShu
  const anQuanSuoFang = suoFang > 0 ? suoFang : jiSuanJiChuSuoFang(yuanKuan, yuanGao, quYuBianChang)
  const bianChang = quYuBianChang / anQuanSuoFang
  const x = Math.min(Math.max(0, -pianYiX / anQuanSuoFang), Math.max(0, yuanKuan - bianChang))
  const y = Math.min(Math.max(0, -pianYiY / anQuanSuoFang), Math.max(0, yuanGao - bianChang))
  const heFaBianChang = Math.max(1, Math.min(bianChang, yuanKuan - x, yuanGao - y))
  return { x: Math.round(x), y: Math.round(y), bianChang: Math.round(heFaBianChang) }
}

export function jueDingShuChuGeShi(yuanMIME: string): { mime: string; houZhui: string } {
  if (yuanMIME === 'image/png') return { mime: 'image/png', houZhui: 'png' }
  return { mime: 'image/jpeg', houZhui: 'jpg' }
}

export function xuanRanTouXiang(
  tu: CanvasImageSource,
  yuanQu: YuanQu,
  mime: string,
): Promise<Blob> {
  return new Promise((jieJue, juJue) => {
    const huaBu = document.createElement('canvas')
    huaBu.width = TOU_XIANG_SHU_CHU_CHI_CUN
    huaBu.height = TOU_XIANG_SHU_CHU_CHI_CUN
    const shangXiaWen = huaBu.getContext('2d')
    if (!shangXiaWen) {
      juJue(new Error('canvasBuKeYong'))
      return
    }
    shangXiaWen.imageSmoothingQuality = 'high'
    shangXiaWen.drawImage(
      tu,
      yuanQu.x,
      yuanQu.y,
      yuanQu.bianChang,
      yuanQu.bianChang,
      0,
      0,
      TOU_XIANG_SHU_CHU_CHI_CUN,
      TOU_XIANG_SHU_CHU_CHI_CUN,
    )
    huaBu.toBlob(
      (shengCheng) => {
        if (shengCheng) jieJue(shengCheng)
        else juJue(new Error('canvasDaoChuShiBai'))
      },
      mime,
      0.92,
    )
  })
}
