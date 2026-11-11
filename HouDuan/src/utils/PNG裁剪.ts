import { inflateSync, deflateSync } from 'zlib'
import { debug日志 } from './debug日志'

const PNG_QIAN_MING = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CRC_BIAO: number[] = (() => {
  const biao: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    biao[n] = c >>> 0
  }
  return biao
})()

function crc32(huan: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < huan.length; i++) {
    c = CRC_BIAO[(c ^ huan[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function xieKuai(leiXing: string, shuJu: Buffer): Buffer {
  const changDu = Buffer.alloc(4)
  changDu.writeUInt32BE(shuJu.length, 0)
  const leiXingHuan = Buffer.from(leiXing, 'ascii')
  const crcHuan = Buffer.concat([leiXingHuan, shuJu])
  const crcZhi = Buffer.alloc(4)
  crcZhi.writeUInt32BE(crc32(crcHuan), 0)
  return Buffer.concat([changDu, leiXingHuan, shuJu, crcZhi])
}

interface IhdrXinXi {
  kuan: number
  gao: number
  weiShen: number
  yanSeLeiXing: number
  geXingBiaoZhi: number
}

function duIhdr(huan: Buffer): IhdrXinXi | null {
  if (huan.length < 33 || !huan.subarray(0, 8).equals(PNG_QIAN_MING)) return null
  if (huan.readUInt32BE(8) !== 13) return null
  if (huan.readUInt32BE(12) !== 0x49484452) return null
  return {
    kuan: huan.readUInt32BE(16),
    gao: huan.readUInt32BE(20),
    weiShen: huan[24],
    yanSeLeiXing: huan[25],
    geXingBiaoZhi: huan[28],
  }
}

function meiXiangZiJieShu(yanSeLeiXing: number): number {
  if (yanSeLeiXing === 6) return 4
  if (yanSeLeiXing === 2) return 3
  if (yanSeLeiXing === 0) return 1
  return 0
}

function duSuoYouIdat(huan: Buffer): Buffer | null {
  const kuai: Buffer[] = []
  let weiZhi = 8
  while (weiZhi + 8 <= huan.length) {
    const changDu = huan.readUInt32BE(weiZhi)
    const leiXing = huan.readUInt32BE(weiZhi + 4)
    const shuJu = huan.subarray(weiZhi + 8, weiZhi + 8 + changDu)
    if (leiXing === 0x49444154) kuai.push(shuJu)
    if (leiXing === 0x49454e44) break
    weiZhi += 12 + changDu
  }
  if (kuai.length === 0) return null
  try {
    return inflateSync(Buffer.concat(kuai))
  } catch {
    return null
  }
}

function quLuBo(xing: Buffer, shangXing: Buffer | null, meiXingZiJie: number): void {
  const leiXing = xing[0]
  const neiRong = xing.subarray(1)
  const kuanZiJie = neiRong.length
  for (let i = 0; i < kuanZiJie; i++) {
    const zuo = i >= meiXingZiJie ? neiRong[i - meiXingZiJie] : 0
    const shang = shangXing ? shangXing[1 + i] : 0
    const zuoShang = shangXing && i >= meiXingZiJie ? shangXing[1 + i - meiXingZiJie] : 0
    let zhi = neiRong[i]
    if (leiXing === 1) zhi = (zhi + zuo) & 0xff
    else if (leiXing === 2) zhi = (zhi + shang) & 0xff
    else if (leiXing === 3) zhi = (zhi + ((zuo + shang) >> 1)) & 0xff
    else if (leiXing === 4) {
      const p = zuo + shang - zuoShang
      const pa = Math.abs(p - zuo)
      const pb = Math.abs(p - shang)
      const pc = Math.abs(p - zuoShang)
      const yuCe = pa <= pb && pa <= pc ? zuo : pb <= pc ? shang : zuoShang
      zhi = (zhi + yuCe) & 0xff
    }
    neiRong[i] = zhi
  }
  xing[0] = 0
}

export function caiDiaoPNGDiBu(tuPian: Buffer, diBuBiLi: number): Buffer {
  try {
    const ihdr = duIhdr(tuPian)
    if (!ihdr) return tuPian
    if (ihdr.weiShen !== 8 || ihdr.geXingBiaoZhi !== 0) return tuPian
    const meiXingZiJie = meiXiangZiJieShu(ihdr.yanSeLeiXing)
    if (meiXingZiJie === 0) return tuPian
    if (diBuBiLi <= 0 || diBuBiLi >= 0.5) return tuPian

    const yuanShi = duSuoYouIdat(tuPian)
    if (!yuanShi) return tuPian
    const meiXingZongZiJie = 1 + ihdr.kuan * meiXingZiJie
    if (yuanShi.length < ihdr.gao * meiXingZongZiJie) return tuPian

    const xinGao = Math.max(1, Math.floor(ihdr.gao * (1 - diBuBiLi)))
    const xinXing: Buffer[] = []
    let shangXing: Buffer | null = null
    for (let hang = 0; hang < xinGao; hang++) {
      const xing = Buffer.from(yuanShi.subarray(hang * meiXingZongZiJie, (hang + 1) * meiXingZongZiJie))
      quLuBo(xing, shangXing, meiXingZiJie)
      xinXing.push(xing)
      shangXing = xing
    }
    const xinShuJu = deflateSync(Buffer.concat(xinXing), { level: 6 })

    const xinIhdr = Buffer.alloc(13)
    xinIhdr.writeUInt32BE(ihdr.kuan, 0)
    xinIhdr.writeUInt32BE(xinGao, 4)
    xinIhdr[8] = ihdr.weiShen
    xinIhdr[9] = ihdr.yanSeLeiXing
    xinIhdr[10] = 0
    xinIhdr[11] = 0
    xinIhdr[12] = 0

    return Buffer.concat([
      PNG_QIAN_MING,
      xieKuai('IHDR', xinIhdr),
      xieKuai('IDAT', xinShuJu),
      xieKuai('IEND', Buffer.alloc(0)),
    ])
  } catch (cuoWu) {
    debug日志.warn('PNG裁剪', '底部裁剪失败，返回原图', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return tuPian
  }
}
