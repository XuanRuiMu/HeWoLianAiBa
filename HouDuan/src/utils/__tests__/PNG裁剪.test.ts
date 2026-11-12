import { describe, expect, it } from 'vitest'
import { deflateSync } from 'zlib'
import { caiDiaoPNGDiBu } from '../PNG裁剪'

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
  const crcZhi = Buffer.alloc(4)
  crcZhi.writeUInt32BE(crc32(Buffer.concat([leiXingHuan, shuJu])), 0)
  return Buffer.concat([changDu, leiXingHuan, shuJu, crcZhi])
}

function shengChengCeShiPNG(kuan: number, gao: number): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(kuan, 0)
  ihdr.writeUInt32BE(gao, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const meiXing = 1 + kuan * 4
  const xing: Buffer[] = []
  for (let hang = 0; hang < gao; hang++) {
    const xingHuan = Buffer.alloc(meiXing)
    xingHuan[0] = 0
    for (let lie = 0; lie < kuan; lie++) {
      xingHuan[1 + lie * 4] = hang & 0xff
      xingHuan[2 + lie * 4] = 0
      xingHuan[3 + lie * 4] = 0
      xingHuan[4 + lie * 4] = 255
    }
    xing.push(xingHuan)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    xieKuai('IHDR', ihdr),
    xieKuai('IDAT', deflateSync(Buffer.concat(xing))),
    xieKuai('IEND', Buffer.alloc(0)),
  ])
}

describe('PNG底部裁剪', () => {
  it('按比例裁掉底部且保留顶部像素行', () => {
    const yuan = shengChengCeShiPNG(4, 100)
    const jieGuo = caiDiaoPNGDiBu(yuan, 0.06)
    const xinKuan = jieGuo.readUInt32BE(16)
    const xinGao = jieGuo.readUInt32BE(20)
    expect(xinKuan).toBe(4)
    expect(xinGao).toBe(94)
  })

  it('非PNG与极端比例原样返回', () => {
    const feiPNG = Buffer.from('bushi png')
    expect(caiDiaoPNGDiBu(feiPNG, 0.06)).toBe(feiPNG)
    const yuan = shengChengCeShiPNG(4, 100)
    expect(caiDiaoPNGDiBu(yuan, 0.6)).toBe(yuan)
    expect(caiDiaoPNGDiBu(yuan, 0)).toBe(yuan)
  })

  it('裁剪结果可被再次读取（IEND存在）', () => {
    const yuan = shengChengCeShiPNG(2, 50)
    const jieGuo = caiDiaoPNGDiBu(yuan, 0.06)
    const weiZhi = jieGuo.indexOf(Buffer.from('IEND', 'ascii'))
    expect(weiZhi).toBeGreaterThan(0)
  })
})
