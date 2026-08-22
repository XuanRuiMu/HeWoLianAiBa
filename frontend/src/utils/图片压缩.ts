import { huoQuFanYi } from '@/config/translations'

export const YA_SUO_CHANG_BIAN_SHANG_XIAN = 1280
export const YA_SUO_ZHI_LIANG = 0.8

export interface WeiTuYuan {
  width: number
  height: number
  huiZhi: (ctx: CanvasRenderingContext2D, kuan: number, gao: number) => void
  shiFang: () => void
}

function jiaZaiBitmap(wenJian: Blob): Promise<WeiTuYuan> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(wenJian).then((bitmap) => ({
      width: bitmap.width,
      height: bitmap.height,
      huiZhi: (ctx, kuan, gao) =>
        ctx.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, kuan, gao),
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
        huiZhi: (ctx, kuan, gao) => ctx.drawImage(tu, 0, 0, kuan, gao),
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

function zhuanBlob(canvas: HTMLCanvasElement, leiXing: string, zhiLiang?: number): Promise<Blob> {
  return new Promise((jieJue, juJue) => {
    canvas.toBlob(
      (blob) => {
        if (blob) jieJue(blob)
        else juJue(new Error(huoQuFanYi('duoMeiTi', 'yaSuoShiBai')))
      },
      leiXing,
      zhiLiang,
    )
  })
}

export async function yaSuoTuPiang(file: File | Blob): Promise<Blob> {
  const mime = (file.type || '').toLowerCase()
  if (mime.includes('gif')) return file

  let weiTu: WeiTuYuan
  try {
    weiTu = await jiaZaiBitmap(file)
  } catch (cuoWu) {
    throw cuoWu instanceof Error ? cuoWu : new Error(huoQuFanYi('duoMeiTi', 'yaSuoShiBai'))
  }

  try {
    const changBian = Math.max(weiTu.width, weiTu.height)
    const suoFangBiLi =
      changBian > YA_SUO_CHANG_BIAN_SHANG_XIAN ? YA_SUO_CHANG_BIAN_SHANG_XIAN / changBian : 1

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(weiTu.width * suoFangBiLi))
    canvas.height = Math.max(1, Math.round(weiTu.height * suoFangBiLi))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    weiTu.huiZhi(ctx, canvas.width, canvas.height)
    return await zhuanBlob(canvas, 'image/jpeg', YA_SUO_ZHI_LIANG)
  } finally {
    weiTu.shiFang()
  }
}
