import { huoQuFanYi } from '@/config/翻译表'

export const YA_SUO_CHANG_BIAN_SHANG_XIAN = 1280
export const YA_SUO_ZHI_LIANG = 0.8

export interface WeiTuYuan {
  width: number
  height: number
  huiZhi: (huaBuShangXiaWen: CanvasRenderingContext2D, kuan: number, gao: number) => void
  shiFang: () => void
}

function jiaZaiBitmap(wenJian: Blob): Promise<WeiTuYuan> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(wenJian).then((bitmap) => ({
      width: bitmap.width,
      height: bitmap.height,
      huiZhi: (huaBuShangXiaWen, kuan, gao) =>
        huaBuShangXiaWen.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, kuan, gao),
      shiFang: () => {
        if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
      },
    }))
  }
  return new Promise((jieJue, juJue) => {
    const diZhi = URL.createObjectURL(wenJian)
    const tu = new Image()
    tu.onload = () => {
      jieJue({
        width: tu.naturalWidth || tu.width,
        height: tu.naturalHeight || tu.height,
        huiZhi: (huaBuShangXiaWen, kuan, gao) => huaBuShangXiaWen.drawImage(tu, 0, 0, kuan, gao),
        shiFang: () => URL.revokeObjectURL(diZhi),
      })
    }
    tu.onerror = () => {
      URL.revokeObjectURL(diZhi)
      juJue(new Error(huoQuFanYi('duoMeiTi', 'yaSuoShiBai')))
    }
    tu.src = diZhi
  })
}

function zhuanBlob(huaBu: HTMLCanvasElement, leiXing: string, zhiLiang?: number): Promise<Blob> {
  return new Promise((jieJue, juJue) => {
    huaBu.toBlob(
      (blob) => {
        if (blob) jieJue(blob)
        else juJue(new Error(huoQuFanYi('duoMeiTi', 'yaSuoShiBai')))
      },
      leiXing,
      zhiLiang,
    )
  })
}

export class TuPianChiCunCuoWu extends Error {
  constructor() {
    super('tupian-chicun-chaochu-shangxian')
    this.name = 'TuPianChiCunCuoWu'
  }
}

export async function yaSuoTuPiang(file: File | Blob, zuiDaChiCun?: number): Promise<Blob> {
  const mime = (file.type || '').toLowerCase()
  if (mime.includes('gif')) {
    if (zuiDaChiCun === undefined) return file
    const dongTai = await jiaZaiBitmap(file).catch(() => null)
    if (!dongTai) throw new Error(huoQuFanYi('duoMeiTi', 'yaSuoShiBai'))
    try {
      if (dongTai.width > zuiDaChiCun || dongTai.height > zuiDaChiCun) throw new TuPianChiCunCuoWu()
    } finally {
      dongTai.shiFang()
    }
    return file
  }

  let weiTu: WeiTuYuan
  try {
    weiTu = await jiaZaiBitmap(file)
  } catch {
    // 浏览器解码失败的原文是驱动层英文（DOMException/EncodingError），禁止上屏，统一走翻译文案
    throw new Error(huoQuFanYi('duoMeiTi', 'yaSuoShiBai'))
  }

  try {
    if (zuiDaChiCun !== undefined && (weiTu.width > zuiDaChiCun || weiTu.height > zuiDaChiCun)) {
      throw new TuPianChiCunCuoWu()
    }
    const changBian = Math.max(weiTu.width, weiTu.height)
    const suoFangBiLi =
      changBian > YA_SUO_CHANG_BIAN_SHANG_XIAN ? YA_SUO_CHANG_BIAN_SHANG_XIAN / changBian : 1

    const huaBu = document.createElement('canvas')
    huaBu.width = Math.max(1, Math.round(weiTu.width * suoFangBiLi))
    huaBu.height = Math.max(1, Math.round(weiTu.height * suoFangBiLi))
    const huaBuShangXiaWen = huaBu.getContext('2d')
    if (!huaBuShangXiaWen) return file
    weiTu.huiZhi(huaBuShangXiaWen, huaBu.width, huaBu.height)
    return await zhuanBlob(huaBu, 'image/jpeg', YA_SUO_ZHI_LIANG)
  } finally {
    weiTu.shiFang()
  }
}
