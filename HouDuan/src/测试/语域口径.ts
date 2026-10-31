
export const YU_QI_CI = ['嗯', '啊', '呢', '吧', '噢', '哦', '诶', '唔', '嘛', '啦']
export const SHU_ZHENG = [
  '～', '~', '…', '。', '．', '!', '！', '?', '？', '，', ',', '、', '；', ';',
  '：', ':', '”', '"', '’', "'", '）', ')', '（', '(', '《', '》', '【', '】', '.',
]
export const FEN_JU_FEN_JIE = /[，。！？；：、~～…\n,.!?;:]+/
export const WEI_MO_BIAO = /[，。！？；：、~～…\n,.!?;:]/

export const BO_LANG_HAO = ['~', '～']
export const BO_LANG_HAO_ZHEN_REN_JI_XIAN = 0.041

export const JIAN_XIE_DAN = ['🉑', 'wok', 'xs', 'bur', 'tql', 'u1s1', 'xswl', 'yys', 'hhhh', 'hhh', 'hh', 'jrm', 'nd你', 'bf', 'yysy']
export const JIAN_XIE_LIU_LIAN = 0
export const JIAN_XIE_ZHEN_REN_JI_XIAN = 0.0799


export function chaiBiaoWenBen(buChaiBiao: string): string {
  return buChaiBiao.replace(/[\s]/g, '').split('').filter((c) => !SHU_ZHENG.includes(c)).join('')
}

export function zhengXi(wenBen: string): string {
  return wenBen.replace(/[\s　]+/g, '')
}

export type SheHuoLei = 'wu' | 'duJie' | 'moWei' | 'juZhong'

export function yuQiCiYuSheHaoGongXian(wenBen: string): boolean {
  return wenBen.includes('…') && YU_QI_CI.some((y) => wenBen.includes(y))
}

export function fenLeiSheHao(wenBen: string): SheHuoLei {
  const t = wenBen.trim()
  if (!t.includes('…')) return 'wu'
  if (t.replace(/[\s.…]/g, '') === '') return 'duJie'
  return t.startsWith('…') || t.endsWith('…') ? 'moWei' : 'juZhong'
}

export function zhanChouHouZiFu(ci: string | undefined): string {
  if (!ci) return ''
  const suoYou = Array.from(ci)
  return suoYou[suoYou.length - 1] || ''
}

export function yuQiCiGeShu(wenBen: string): number {
  let shu = 0
  let i = 0
  while (i < wenBen.length) {
    const ci = wenBen[i]
    if (YU_QI_CI.includes(ci)) {
      shu += 1
      i += 1
      continue
    }
    i += 1
  }
  return shu
}

export function shuliFenJu(wenBen: string): string[] {
  return wenBen.split(FEN_JU_FEN_JIE).map((s) => s.trim()).filter((s) => s.length > 0)
}

export interface DanTiaoZhiBiao {
  ziShu: number
  ziShuHanKongGe: number
  ziShuChaiBiao: number
  fenShu: number
  danFenJu: boolean
  danFenJuWuBiao: boolean
  weiMoBiao: boolean
  jvHao: boolean
  yuQiCi: number
  emoji: number
  neiRong: string
}

export function danTiao(wenBen: string): DanTiaoZhiBiao {
  const zhengWen = zhengXi(wenBen)
  const caiBiaoWenBen = chaiBiaoWenBen(zhengWen)
  const fenJu = shuliFenJu(zhengWen)
  const houZiFu = zhanChouHouZiFu(zhengWen.slice(-1))
  return {
    ziShu: Array.from(zhengWen).length,
    ziShuHanKongGe: Array.from(wenBen.trim()).length,
    ziShuChaiBiao: Array.from(caiBiaoWenBen).length,
    fenShu: fenJu.length,
    danFenJu: fenJu.length === 1,
    danFenJuWuBiao: fenJu.length === 1 && !WEI_MO_BIAO.test(zhengWen),
    weiMoBiao: WEI_MO_BIAO.test(houZiFu),
    jvHao: houZiFu === '。' || houZiFu === '.',
    yuQiCi: yuQiCiGeShu(zhengWen),
    emoji: (zhengWen.match(/\p{Extended_Pictographic}/gu) || []).length,
    neiRong: zhengWen,
  }
}

export interface LunZhiBiao {
  tiaoShu: number
  pingJunZiShu: number
  zhongWeiZiShu: number
  pingJunZiShuChaiBiao: number
  zhongWeiZiShuChaiBiao: number
  shiFenWei: number
  shiFengErShi: number
  p10: number
  p90: number
  danFenJuBiLi: number
  danFenJuWuBiaoBiLi: number
  weiMoBiaoBiLi: number
  jvHaoBiLi: number
yuQiCiMiDu: number
  emojiMiDu: number
  sheHaoDuJie: number
  sheHaoMoWei: number
  sheHaoJuZhong: number
  yuQiCiSheHaoGongXian: number
  boLangHaoBiLi: number
  jianXieBiLi: number
  zuiChangZiShu: number
  zuiDuanZiShu: number
  juChangCV: number
}

function fenShi(lieBiao: number[]): number {
  if (lieBiao.length === 0) return 0
  return Number((lieBiao.filter((x) => x <= 10).length / lieBiao.length).toFixed(4))
}

function baiFenWei(lieBiao: number[]): number {
  if (lieBiao.length === 0) return 0
  return Number((lieBiao.filter((x) => x <= 20).length / lieBiao.length).toFixed(4))
}

function fenShuZhi(buJingXu: number[], fenShu: number): number {
  if (buJingXu.length === 0) return 0
  const paiXu = [...buJingXu].sort((a, b) => a - b)
  const weiZhi = fenShu * (paiXu.length - 1)
  const xia = Math.floor(weiZhi)
  const shang = Math.ceil(weiZhi)
  return paiXu[xia] + (paiXu[shang] - paiXu[xia]) * (weiZhi - xia)
}

export function tongJi(xiaoXiLieBiao: string[]): LunZhiBiao {
  const youXiao = xiaoXiLieBiao.map((x) => x.trim()).filter((x) => x.length > 0)
  if (youXiao.length === 0) {
    return {
      tiaoShu: 0, pingJunZiShu: 0, zhongWeiZiShu: 0, pingJunZiShuChaiBiao: 0, zhongWeiZiShuChaiBiao: 0,
      shiFenWei: 0, shiFengErShi: 0, p10: 0, p90: 0, danFenJuBiLi: 0, danFenJuWuBiaoBiLi: 0,
      weiMoBiaoBiLi: 0, jvHaoBiLi: 0, yuQiCiMiDu: 0, emojiMiDu: 0,
      sheHaoDuJie: 0, sheHaoMoWei: 0, sheHaoJuZhong: 0, yuQiCiSheHaoGongXian: 0,
      boLangHaoBiLi: 0, jianXieBiLi: 0,
      zuiChangZiShu: 0, zuiDuanZiShu: 0, juChangCV: 0,
    }
  }
const biao = youXiao.map((x) => danTiao(x))
  const sheHaoLei = youXiao.map((x) => fenLeiSheHao(x))
  const gongXian = youXiao.filter((x) => yuQiCiYuSheHaoGongXian(x)).length
  const sheHaoLv = (lei: SheHuoLei) => Number((sheHaoLei.filter((x) => x === lei).length / youXiao.length).toFixed(4))
  const ziShuLie = biao.map((b) => b.ziShu)
const chaiLie = biao.map((b) => b.ziShuChaiBiao)
  const pingJun = ziShuLie.reduce((a, b) => a + b, 0) / ziShuLie.length

  const pinJieJuShu = shuliFenJu(zhengXi(youXiao.join(' '))).map((j) => Array.from(j).length)
  const juPingJun = pinJieJuShu.reduce((a, b) => a + b, 0) / Math.max(1, pinJieJuShu.length)
  const juFangCha = pinJieJuShu.reduce((a, b) => a + (b - juPingJun) ** 2, 0) / Math.max(1, pinJieJuShu.length)

  return {
    tiaoShu: youXiao.length,
    pingJunZiShu: Number(pingJun.toFixed(2)),
    zhongWeiZiShu: fenShuZhi(ziShuLie, 0.5),
    pingJunZiShuChaiBiao: Number((chaiLie.reduce((a, b) => a + b, 0) / chaiLie.length).toFixed(2)),
    zhongWeiZiShuChaiBiao: fenShuZhi(chaiLie, 0.5),
    shiFenWei: fenShi(ziShuLie),
    shiFengErShi: baiFenWei(ziShuLie),
    p10: fenShuZhi(ziShuLie, 0.1),
    p90: fenShuZhi(ziShuLie, 0.9),
    danFenJuBiLi: Number((biao.filter((b) => b.danFenJu).length / biao.length).toFixed(4)),
    danFenJuWuBiaoBiLi: Number((biao.filter((b) => b.danFenJuWuBiao).length / biao.length).toFixed(4)),
    weiMoBiaoBiLi: Number((biao.filter((b) => b.weiMoBiao).length / biao.length).toFixed(4)),
    jvHaoBiLi: Number((biao.filter((b) => b.jvHao).length / biao.length).toFixed(4)),
    yuQiCiMiDu: Number((biao.reduce((a, b) => a + b.yuQiCi, 0) / biao.length).toFixed(3)),
emojiMiDu: Number((biao.reduce((a, b) => a + b.emoji, 0) / biao.length).toFixed(4)),
    sheHaoDuJie: sheHaoLv('duJie'),
    sheHaoMoWei: sheHaoLv('moWei'),
    sheHaoJuZhong: sheHaoLv('juZhong'),
    yuQiCiSheHaoGongXian: Number((gongXian / youXiao.length).toFixed(4)),
    boLangHaoBiLi: Number((youXiao.filter((x) => x.includes('~') || x.includes('～')).length / youXiao.length).toFixed(4)),
    jianXieBiLi: Number((youXiao.filter((x) => JIAN_XIE_DAN.some((c) => x.includes(c))).length / youXiao.length).toFixed(4)),
    zuiChangZiShu: Math.max(...ziShuLie),
    zuiDuanZiShu: Math.min(...ziShuLie),
    juChangCV: juPingJun > 0 ? Number((Math.sqrt(juFangCha) / juPingJun).toFixed(3)) : 0,
  }
}

export interface DuiBiXing {
  ming: string
  danWei: string
  qiJia: number
  ren: number
  beiLv: number | null
  yiCiXiang: 'gao' | 'di' | 'xiangJin'
}

export function duiBi(qiJia: LunZhiBiao, ren: LunZhiBiao, xuanZe: Array<[string, string]>): DuiBiXing[] {
  return xuanZe.map(([ming, danWei]) => {
const a = (qiJia as unknown as Record<string, number>)[ming] ?? 0
    const b = (ren as unknown as Record<string, number>)[ming] ?? 0
    const beiLv = b === 0 ? null : Number((a / b).toFixed(2))
    const cha = Math.abs(a - b)
    const yiCiXiang = cha <= Math.max(Math.abs(b) * 0.15, 0.02) ? 'xiangJin' : (a > b ? 'gao' : 'di')
    return { ming, danWei, qiJia: a, ren: b, beiLv, yiCiXiang }
  })
}

export function duiBiBiao(duiBiLie: DuiBiXing[]): string {
  const tou = '| 指标 | 单位 | AI 实测 | 真人基线 | 偏离 | 判定 |'
  const fen = '| --- | --- | --- | --- | --- | --- |'
  const xing = duiBiLie
    .map(
      (x) =>
        `| ${x.ming} | ${x.danWei} | ${x.qiJia} | ${x.ren} | ${x.beiLv === null ? 'n/a' : `${x.beiLv}×`} | ${
          x.yiCiXiang === 'xiangJin' ? '接近' : x.yiCiXiang === 'gao' ? '**偏高**' : '**偏低**'
        } |`,
    )
    .join('\n')
  return `${tou}\n${fen}\n${xing}`
}
