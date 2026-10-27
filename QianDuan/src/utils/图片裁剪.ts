import type { CropperSelection } from 'cropperjs'

export const TU_PIAN_SHU_CHU_ZUI_DA_BIAN = 1024

export const CAI_JIAN_BI_LI_XIA_XIAN = 0.2
export const CAI_JIAN_BI_LI_SHANG_XIAN = 5

export interface PingYiBuLiang {
  x: number
  y: number
}

export function shiHeFaBiLi(zhi: unknown): boolean {
  return typeof zhi === 'number' && Number.isFinite(zhi) && zhi >= CAI_JIAN_BI_LI_XIA_XIAN && zhi <= CAI_JIAN_BI_LI_SHANG_XIAN
}

export function jiSuanGunLunPingYi(deltaY: number, xiShu = 0.08): PingYiBuLiang {
  if (!Number.isFinite(deltaY) || deltaY === 0) return { x: 0, y: 0 }
  return { x: 0, y: deltaY * xiShu }
}

export function jiSuanJianPanPingYi(jian: string, jiaSu = false, buChang = 8): PingYiBuLiang {
  const bu = Math.max(0, buChang) * (jiaSu ? 4 : 1)
  switch (String(jian).toLowerCase()) {
    case 'w': return { x: 0, y: -bu }
    case 's': return { x: 0, y: bu }
    case 'a': return { x: -bu, y: 0 }
    case 'd': return { x: bu, y: 0 }
    default: return { x: 0, y: 0 }
  }
}

export function jiXiBiLiWenBen(wenBen: unknown): number | null {
  const qingLi = String(wenBen ?? '').trim().replace(/：/g, ':')
  if (!qingLi) return null
  if (/^-?\d+(?:\.\d+)?$/.test(qingLi)) {
    const zhi = Number(qingLi)
    return shiHeFaBiLi(zhi) ? zhi : null
  }
  const piPei = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec(qingLi)
  if (!piPei) return null
  const gao = Number(piPei[2])
  if (!(gao > 0)) return null
  const zhi = Number(piPei[1]) / gao
  return shiHeFaBiLi(zhi) ? zhi : null
}

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
