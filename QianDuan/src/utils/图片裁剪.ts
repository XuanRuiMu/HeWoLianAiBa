import type { CropperSelection } from 'cropperjs'

export const TU_PIAN_SHU_CHU_ZUI_DA_BIAN = 1024

export function jiSuanJuZhenSuoFang(juZhen: number[]): number {
  const a = Number(juZhen[0]) || 0
  const b = Number(juZhen[1]) || 0
  const suoFang = Math.hypot(a, b)
  return suoFang > 1e-4 ? suoFang : 0.01
}

export function jiSuanDaoChuChiCun(yuanKuan: number, yuanGao: number, zuiDaBian: number): { kuan: number; gao: number } {
  const kuan = Math.max(1, Math.round(yuanKuan))
  const gao = Math.max(1, Math.round(yuanGao))
  const biLi = kuan / gao
  const guiYiXiaXian = zuiDaBian * 0.95
  if (kuan <= zuiDaBian && gao <= zuiDaBian && Math.max(kuan, gao) < guiYiXiaXian) {
    return { kuan, gao }
  }
  if (biLi >= 1) return { kuan: zuiDaBian, gao: Math.max(1, Math.round(zuiDaBian / biLi)) }
  return { kuan: Math.max(1, Math.round(zuiDaBian * biLi)), gao: zuiDaBian }
}

export function jueDingShuChuGeShi(yuanMIME: string): { mime: string; houZhui: string } {
  if (yuanMIME === 'image/png') return { mime: 'image/png', houZhui: 'png' }
  return { mime: 'image/jpeg', houZhui: 'jpg' }
}

function huaBuZhuanBlob(huaBu: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((jieJue, juJue) => {
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

export async function daoChuCaiJianWenJian(
  xuanQu: CropperSelection,
  geShi: { mime: string; houZhui: string },
  wenJianMing: string,
): Promise<File> {
  const yuanHuaBu = await xuanQu.$toCanvas()
  const chiCun = jiSuanDaoChuChiCun(yuanHuaBu.width, yuanHuaBu.height, TU_PIAN_SHU_CHU_ZUI_DA_BIAN)
  let muBiaoHuaBu = yuanHuaBu
  if (chiCun.kuan !== yuanHuaBu.width || chiCun.gao !== yuanHuaBu.height) {
    const suoFangHuaBu = document.createElement('canvas')
    suoFangHuaBu.width = chiCun.kuan
    suoFangHuaBu.height = chiCun.gao
    const shangXiaWen = suoFangHuaBu.getContext('2d')
    if (shangXiaWen) {
      shangXiaWen.imageSmoothingQuality = 'high'
      shangXiaWen.drawImage(yuanHuaBu, 0, 0, chiCun.kuan, chiCun.gao)
      muBiaoHuaBu = suoFangHuaBu
    }
  }
  const blob = await huaBuZhuanBlob(muBiaoHuaBu, geShi.mime)
  return new File([blob], `${wenJianMing}.${geShi.houZhui}`, { type: geShi.mime })
}
