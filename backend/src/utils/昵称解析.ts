import fs from 'fs'
import path from 'path'

const WEN_JIAN_LU_JING = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '微信昵称',
  '昵称大全.txt',
)

export interface NiChengKu {
  nan: string[]
  nv: string[]
}

function qingLiHang(wenBen: string): string {
  return wenBen
    .replace(/^\s+|\s+$/g, '')
    .replace(/\u200b/g, '')
    .replace(/\ufeff/g, '')
}

export function jieXiNiChengKu(): NiChengKu {
  if (!fs.existsSync(WEN_JIAN_LU_JING)) {
    return { nan: [], nv: [] }
  }

  const neiRong = fs.readFileSync(WEN_JIAN_LU_JING, 'utf-8')
  const hangLieBiao = neiRong.split('\n').map(qingLiHang)

  const jieGuo: NiChengKu = { nan: [], nv: [] }
  let dangQianLeiXing: 'nan' | 'nv' | null = null

  for (const hang of hangLieBiao) {
    if (!hang) continue
    if (hang === '男：') {
      dangQianLeiXing = 'nan'
      continue
    }
    if (hang === '女：') {
      dangQianLeiXing = 'nv'
      continue
    }
    if (dangQianLeiXing) {
      jieGuo[dangQianLeiXing].push(hang)
    }
  }

  return jieGuo
}

let huanCun: NiChengKu | null = null

export function huoQuNiChengKu(): NiChengKu {
  if (!huanCun) {
    huanCun = jieXiNiChengKu()
  }
  return huanCun
}
