const ZhanWeiShiQu = 'Asia/Shanghai'

const ShiQuYuYan: Record<string, string> = {
  'Asia/Shanghai': 'zh',
  'Asia/Chongqing': 'zh',
  'Asia/Hong_Kong': 'zh',
  'Asia/Macau': 'zh',
  'Asia/Taipei': 'zh',
  'Asia/Tokyo': 'ja',
  'Asia/Seoul': 'ko',
  'Asia/Singapore': 'en',
  'Asia/Bangkok': 'th',
  'Asia/Dubai': 'ar',
  'Europe/London': 'en',
  'Europe/Paris': 'fr',
  'Europe/Berlin': 'de',
  'Europe/Rome': 'it',
  'Europe/Madrid': 'es',
  'Europe/Moscow': 'ru',
  'Australia/Sydney': 'en',
  'Australia/Melbourne': 'en',
  'America/New_York': 'en',
  'America/Chicago': 'en',
  'America/Denver': 'en',
  'America/Los_Angeles': 'en',
  'America/Toronto': 'en',
  'America/Vancouver': 'en',
  'America/Sao_Paulo': 'pt',
  'America/Mexico_City': 'es',
}

const YuYanMing: Record<string, string> = {
  zh: '中文',
  en: '英文',
  ja: '日文',
  ko: '韩文',
  fr: '法文',
  de: '德文',
  it: '意大利文',
  es: '西班牙文',
  pt: '葡萄牙文',
  ru: '俄文',
  th: '泰文',
  ar: '阿拉伯文',
}

function guiFanShiQu(zhi: unknown): string {
  const yuan = String(zhi ?? '').trim()
  if (yuan === '') return ZhanWeiShiQu
  if (!/^[A-Za-z_]+\/[A-Za-z_+\-/]+$/.test(yuan)) return ZhanWeiShiQu
  return yuan
}

export function shiQuYouXiao(zhi: unknown): boolean {
  const yuan = String(zhi ?? '').trim()
  return /^[A-Za-z_]+\/[A-Za-z_+\-/]+$/.test(yuan)
}

export function huoQuShiQu(zhi: unknown): string {
  return guiFanShiQu(zhi)
}

export function shiQuDaoYuYan(shiQu: unknown): string {
  const zheng = guiFanShiQu(shiQu)
  if (zheng in ShiQuYuYan) return ShiQuYuYan[zheng]
  const qian = zheng.split('/')[0]
  if (qian === 'Asia') return 'zh'
  if (qian === 'Europe') return 'en'
  if (qian === 'America') return 'en'
  if (qian === 'Australia') return 'en'
  if (qian === 'Africa') return 'en'
  if (qian === 'Pacific') return 'en'
  return 'zh'
}

export function yuYanMingCheng(yuYan: unknown): string {
  const zheng = String(yuYan ?? '').trim()
  if (zheng === '') return ''
  return YuYanMing[zheng] || ''
}

export function yuYanYouXiao(zhi: unknown): boolean {
  const zheng = String(zhi ?? '').trim()
  return zheng !== '' && zheng in YuYanMing
}

function quShiQuBuJian(shiQu: string, dangQian: Date): { nian: string; yue: string; ri: string; shi: string; fen: string; zhou: string } | null {
  try {
    const 格式 = new Intl.DateTimeFormat('en-US', {
      timeZone: shiQu,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    })
    const 部分 = 格式.formatToParts(dangQian)
    const 取 = (类型: string): string => 部分.find((项) => 项.type === 类型)?.value ?? ''
    const 年 = 取('year')
    const 月 = 取('month')
    const 日 = 取('day')
    const 时 = 取('hour')
    const 分 = 取('minute')
    const 周 = 取('weekday')
    if (年 === '' || 月 === '' || 日 === '' || 时 === '' || 分 === '') return null
    return { nian: 年, yue: 月, ri: 日, shi: 时, fen: 分, zhou: 周 }
  } catch {
    return null
  }
}

const YingYuZhouDaoHao: Record<string, number> = {
  Sun: 7,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export function shiQuXianZaiShiJian(shiQu: unknown, dangQian: Date = new Date()): {
  xiaoShi: number
  fenZhong: number
  xingQi: number
  riQi: string
  shiQu: string
} {
  const zheng = guiFanShiQu(shiQu)
  const buJian = quShiQuBuJian(zheng, dangQian)
  if (!buJian) {
    const beiFen = new Date(dangQian.getTime() + 8 * 60 * 60 * 1000)
    return {
      xiaoShi: beiFen.getUTCHours(),
      fenZhong: beiFen.getUTCMinutes(),
      xingQi: beiFen.getUTCDay() === 0 ? 7 : beiFen.getUTCDay(),
      riQi: beiFen.toISOString().slice(0, 10),
      shiQu: ZhanWeiShiQu,
    }
  }
  const shi = Number(buJian.shi) % 24
  return {
    xiaoShi: shi,
    fenZhong: Number(buJian.fen),
    xingQi: YingYuZhouDaoHao[buJian.zhou] ?? 1,
    riQi: `${buJian.nian}-${buJian.yue}-${buJian.ri}`,
    shiQu: zheng,
  }
}

export function shiQuMiaoShu(shiQu: unknown, dangQian: Date = new Date()): string {
  const { xiaoShi, xingQi, shiQu: zheng } = shiQuXianZaiShiJian(shiQu, dangQian)
  const xingQiMing = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'][xingQi] || ''
  const duan = xiaoShi < 6 ? '凌晨' : xiaoShi < 9 ? '清早' : xiaoShi < 12 ? '上午' : xiaoShi < 14 ? '中午' : xiaoShi < 18 ? '下午' : xiaoShi < 22 ? '晚上' : '深夜'
  return `${zheng} 现在是${xingQiMing}${duan}${xiaoShi}点`
}