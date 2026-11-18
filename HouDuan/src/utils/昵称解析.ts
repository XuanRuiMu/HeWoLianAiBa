import fs from 'fs'
import path from 'path'

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

function wenJianLuJingLieBiao(): string[] {
  const luJingLieBiao: string[] = []
  const huanJingLuJing = (process.env['NI_CHENG_KU_LU_JING'] || '').trim()
  if (huanJingLuJing !== '') return [path.resolve(huanJingLuJing)]
  for (const qiDian of [__dirname, process.cwd()]) {
    let dangQian = path.resolve(qiDian)
    for (let ceng = 0; ceng <= 8; ceng += 1) {
      luJingLieBiao.push(path.join(dangQian, '微信昵称', '昵称大全.md'))
      const shangJi = path.dirname(dangQian)
      if (shangJi === dangQian) break
      dangQian = shangJi
    }
  }
  return luJieLieBiaoQuChong(luJingLieBiao)
}

function luJieLieBiaoQuChong(lieBiao: string[]): string[] {
  const jian = new Set<string>()
  const jieGuo: string[] = []
  for (const luJing of lieBiao) {
    if (jian.has(luJing)) continue
    jian.add(luJing)
    jieGuo.push(luJing)
  }
  return jieGuo
}

function zhaoWenJian(): string | null {
  for (const luJing of wenJianLuJingLieBiao()) {
    try {
      if (fs.existsSync(luJing) && fs.statSync(luJing).isFile()) return luJing
    } catch {
      continue
    }
  }
  return null
}

export function jieXiNiChengKu(): NiChengKu {
  const luJing = zhaoWenJian()
  if (!luJing) {
    return { nan: [], nv: [] }
  }

  const neiRong = fs.readFileSync(luJing, 'utf-8')
  const hangLieBiao = neiRong.split('\n').map(qingLiHang)

  const jieGuo: NiChengKu = { nan: [], nv: [] }
  let dangQianLeiXing: 'nan' | 'nv' | null = null

  for (const hang of hangLieBiao) {
    if (!hang) continue
    if (hang === '男：' || hang === '# 男') {
      dangQianLeiXing = 'nan'
      continue
    }
    if (hang === '女：' || hang === '# 女') {
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
