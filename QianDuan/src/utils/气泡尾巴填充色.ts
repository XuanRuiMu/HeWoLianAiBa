export interface TuPianBeiJingCeng {
  url: string
  daXiao: string
  fuGai: { r: number; g: number; b: number; a: number } | null
}

export interface TuPianHuiZhi {
  kuan: number
  gao: number
  x: number
  y: number
}

const huanCunYanSe = new Map<string, string>()
const huanCunTuPian = new Map<string, Promise<HTMLImageElement>>()

export function qingKongWeiBaCaiJiHuanCun(): void {
  huanCunYanSe.clear()
  huanCunTuPian.clear()
}

function fenJieCeng(zhi: string): string[] {
  const chu: string[] = []
  let shen = 0
  let dangQian = ''
  for (const zi of zhi) {
    if (zi === '(') shen += 1
    if (zi === ')') shen -= 1
    if (zi === ',' && shen === 0) {
      chu.push(dangQian.trim())
      dangQian = ''
      continue
    }
    dangQian += zi
  }
  if (dangQian.trim()) chu.push(dangQian.trim())
  return chu
}

export function jieXiTuPianBeiJing(beiJingTu: string, beiJingDaXiao: string): TuPianBeiJingCeng | null {
  if (!beiJingTu || !beiJingTu.includes('url(')) return null
  const cengLie = fenJieCeng(beiJingTu)
  const tuCengXu = cengLie.findIndex((ceng) => ceng.includes('url('))
  if (tuCengXu < 0) return null
  const urlPiPei = /url\("?([^")]+)"?\)/.exec(cengLie[tuCengXu])
  if (!urlPiPei) return null
  const daXiaoLie = fenJieCeng(beiJingDaXiao || '')
  const daXiao = (daXiaoLie[tuCengXu] || daXiaoLie[daXiaoLie.length - 1] || 'cover').toLowerCase()
  let fuGai: TuPianBeiJingCeng['fuGai'] = null
  for (let i = 0; i < tuCengXu; i += 1) {
    const yanSePiPei = /rgba?\(([^)]+)\)/.exec(cengLie[i])
    if (!yanSePiPei) continue
    const buFen = yanSePiPei[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    if (buFen.length < 3 || buFen.some((zhi) => Number.isNaN(zhi))) continue
    fuGai = { r: buFen[0], g: buFen[1], b: buFen[2], a: buFen.length > 3 ? buFen[3] : 1 }
    break
  }
  return { url: urlPiPei[1], daXiao, fuGai }
}

export function jiSuanTuPianHuiZhi(
  ziRanKuan: number,
  ziRanGao: number,
  kuangKuan: number,
  kuangGao: number,
  daXiao: string,
): TuPianHuiZhi | null {
  if (!(ziRanKuan > 0 && ziRanGao > 0 && kuangKuan > 0 && kuangGao > 0)) return null
  let kuan: number
  let gao: number
  if (daXiao === 'contain') {
    const bi = Math.min(kuangKuan / ziRanKuan, kuangGao / ziRanGao)
    kuan = ziRanKuan * bi
    gao = ziRanGao * bi
  } else if (daXiao === '100% auto') {
    kuan = kuangKuan
    gao = (ziRanGao * kuangKuan) / ziRanKuan
  } else if (daXiao === 'auto 100%') {
    gao = kuangGao
    kuan = (ziRanKuan * kuangGao) / ziRanGao
  } else if (daXiao === '100% 100%') {
    kuan = kuangKuan
    gao = kuangGao
  } else {
    const bi = Math.max(kuangKuan / ziRanKuan, kuangGao / ziRanGao)
    kuan = ziRanKuan * bi
    gao = ziRanGao * bi
  }
  return { kuan, gao, x: (kuangKuan - kuan) / 2, y: (kuangGao - gao) / 2 }
}

export function quZhongWeiZhi(lie: number[]): number {
  if (!lie.length) return 0
  const pai = [...lie].sort((a, b) => a - b)
  return pai[Math.floor(pai.length / 2)]
}

export function qiuBianYuanZhongXinY(jianBian: string, gao: number): number {
  if (!jianBian || !jianBian.startsWith('polygon') || !(gao > 0)) return gao / 2
  const dian = jianBian.slice(jianBian.indexOf('(') + 1, jianBian.lastIndexOf(')')).split(',')
  if (dian.length < 3) return gao / 2
  const zhongDian = dian[1].trim()
  const yZhi = zhongDian.slice(zhongDian.indexOf(' ') + 1).trim()
  const baiFen = /^([\d.]+)%$/.exec(yZhi)
  if (baiFen) return (Number(baiFen[1]) * gao) / 100
  const xiangSu = /^(-?[\d.]+)px$/.exec(yZhi)
  if (xiangSu) return Number(xiangSu[1])
  const jiaJian = /^calc\(\s*([\d.]+)%\s*([+-])\s*([\d.]+)px\s*\)$/.exec(yZhi)
  if (jiaJian) {
    const ji = (Number(jiaJian[1]) * gao) / 100
    const pian = Number(jiaJian[3])
    return jiaJian[2] === '-' ? ji - pian : ji + pian
  }
  return gao / 2
}

function jiaZaiTuPian(url: string): Promise<HTMLImageElement> {
  const yiYou = huanCunTuPian.get(url)
  if (yiYou) return yiYou
  const renWu = new Promise<HTMLImageElement>((jue, ju) => {
    const tu = new Image()
    tu.decoding = 'async'
    tu.onload = () => jue(tu)
    tu.onerror = () => ju(new Error('气泡皮肤图片加载失败'))
    tu.src = url
  })
  huanCunTuPian.set(url, renWu)
  renWu.catch(() => huanCunTuPian.delete(url))
  return renWu
}

export async function caiJiQiPaoBianYuanTianChong(canShu: {
  beiJingTu: string
  beiJingDaXiao: string
  kuangKuan: number
  kuangGao: number
  bianYuanX: number
  zhongXinY: number
  shuiPingPianYi: number
  weiBaKuan: number
}): Promise<string | null> {
  const ceng = jieXiTuPianBeiJing(canShu.beiJingTu, canShu.beiJingDaXiao)
  if (!ceng) return null
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null
  const hua = document.createElement('canvas')
  let huaBi: CanvasRenderingContext2D | null
  try {
    huaBi = hua.getContext('2d')
  } catch {
    return null
  }
  if (!huaBi) return null
  const kuangKuan = Math.max(1, Math.round(canShu.kuangKuan * 2) / 2)
  const kuangGao = Math.max(1, Math.round(canShu.kuangGao * 2) / 2)
  const y = Math.min(kuangGao - 1, Math.max(1, Math.round(canShu.zhongXinY * 2) / 2))
  const x = Math.min(kuangKuan - 1, Math.max(1, Math.round(canShu.bianYuanX * 2) / 2))
  const jian = [ceng.url, ceng.daXiao, kuangKuan, kuangGao, x, y, canShu.shuiPingPianYi, canShu.weiBaKuan, ceng.fuGai ? ceng.fuGai.r + ',' + ceng.fuGai.g + ',' + ceng.fuGai.b + ',' + ceng.fuGai.a : ''].join('|')
  const yiYou = huanCunYanSe.get(jian)
  if (yiYou) return yiYou
  let tu: HTMLImageElement
  try {
    tu = await jiaZaiTuPian(ceng.url)
  } catch {
    return null
  }
  const huiZhi = jiSuanTuPianHuiZhi(tu.naturalWidth, tu.naturalHeight, kuangKuan, kuangGao, ceng.daXiao)
  if (!huiZhi) return null
  hua.width = Math.ceil(kuangKuan)
  hua.height = Math.ceil(kuangGao)
  try {
    huaBi.imageSmoothingEnabled = true
    huaBi.imageSmoothingQuality = 'high'
    huaBi.drawImage(tu, huiZhi.x, huiZhi.y, huiZhi.kuan, huiZhi.gao)
    if (ceng.fuGai && ceng.fuGai.a > 0) {
      huaBi.globalAlpha = Math.min(1, ceng.fuGai.a)
      huaBi.fillStyle = 'rgb(' + ceng.fuGai.r + ' ' + ceng.fuGai.g + ' ' + ceng.fuGai.b + ')'
      huaBi.fillRect(0, 0, hua.width, hua.height)
      huaBi.globalAlpha = 1
    }
    const kaiShiX = Math.max(0, Math.min(hua.width - 1, Math.floor(x)))
    const kaiShiY = Math.max(0, Math.min(hua.height - 1, Math.round(y) - 4))
    const hangShu = Math.max(1, Math.min(hua.height - kaiShiY, 9))
    const shuJu = huaBi.getImageData(kaiShiX, kaiShiY, 1, hangShu).data
    const hong: number[] = []
    const lv: number[] = []
    const lan: number[] = []
    for (let i = 0; i < shuJu.length; i += 4) {
      hong.push(shuJu[i])
      lv.push(shuJu[i + 1])
      lan.push(shuJu[i + 2])
    }
    if (!hong.length) return null
    const yanSe = 'rgb(' + quZhongWeiZhi(hong) + ' ' + quZhongWeiZhi(lv) + ' ' + quZhongWeiZhi(lan) + ')'
    const anQuanURL = ceng.url.replace(/["\\\n\r]/g, '')
    const yuan = (zhi: number) => Math.round(zhi * 100) / 100
    const tuPianCeng =
      'url("' +
      anQuanURL +
      '") ' +
      yuan(huiZhi.x + canShu.shuiPingPianYi) +
      'px ' +
      yuan(huiZhi.y) +
      'px / ' +
      yuan(huiZhi.kuan) +
      'px ' +
      yuan(huiZhi.gao) +
      'px no-repeat'
    const tianChong = tuPianCeng + ' ' + yanSe
    huanCunYanSe.set(jian, tianChong)
    return tianChong
  } catch {
    return null
  }
}