import { KAI_CHANG_PEI_ZHI, huoQuKaiChangBiao } from '../config/开场采样配置'
import { debug日志 } from '../utils/debug日志'
import type { DuiHuaKuai } from '../utils/DeepSeek客户端'

const ZI_SHU = 2

export function qingLiXiaoXi(neiRong: string): string[] {
  if (!neiRong) return []
  return neiRong
    .split('\n')
    .map((hang) => hang.trim())
    .filter((hang) => hang.length > 0)
    .map((hang) => qingLiGeShiXianLieShi(hang))
    .filter((hang) => hang.length > 0)
}

export function qingLiGeShiXianLieShi(hang: string): string {
  return hang
    .replace(/^\d+[\.、]\s*/, '')
    // 颜文字 + 可选时间戳。实测泄漏原话是 `^\_^(20:42): `（含反斜杠转义），
    // 故字符类必须允许 `\_^` / `^_^` / `^^` / `_^` 四种组合 + 可选反斜杠。
    .replace(/^(?:\^\\?[\^_]{1,2}|_\\?\^|OTZ|orz)\s*(?:\(\d{1,2}:\d{2}\)\s*[:：]?\s*)?/i, '')
    // 裸时间戳前缀，如 `(20:42): ` / `（20:42）` / `[20:42] `
    .replace(/^(?:\(\d{1,2}:\d{2}\)|（\d{1,2}：\d{2}）|\[\d{1,2}:\d{2}\])\s*[:：]?\s*/, '')
    // 再剥一次：剥掉颜文字后可能只剩光秃秃的时间戳（如 `^\_^(20:42): ` 无正文）
    .replace(/^(?:\(\d{1,2}:\d{2}\)|（\d{1,2}：\d{2}）|\[\d{1,2}:\d{2}\])\s*[:：]?\s*/, '')
    .trim()
// ⚠️ 顺序很重要：先剥格式，最后才处理计数（剥离后的内容才参与计数判定）
    .replace(renZhiShouZiCountZhi(), (m) => (baiMianShuoYiCi.test(m) ? m : m.replace(/[一二三四五六七八九十两0-9]{1,3}\s*(次|遍)/, '好几$1')))
    .trim()
}

export const baiMianShuoYiCi = /(说|提|聊|问|念|喊)(一)(次|句|下)/

export function haiYouZiShouZiCountZhi(wenBen: string): boolean {
  const re = renZhiShouZiCountZhi()
  const piao = wenBen.match(re)
  return piao !== null && !piao.every((m) => baiMianShuoYiCi.test(m))
}

export function renZhiShouZiCountZhi(): RegExp {
  return /我(都|又|已经|好像|老是)*[^，。！？\n]{0,6}?(提|说|聊|问|念|喊)(了|过)?\s*(?:已经|第)?\s*[一二三四五六七八九十两0-9]{1,3}\s*(次|遍)(?:了)?/g
}

export function quChuKaiChangToken(wenBen: string, ziShu: number = ZI_SHU): string | null {
  const zheng = wenBen.replace(/[\s　]+/g, '')
  if (zheng.length < ziShu) return null
  return zheng.slice(0, ziShu)
}

export const QIAN_JING_JIE_DONG = [
  '加油', '生日', '新年', '过年', '恭喜', '早安', '晚安', '早上', '晚上', '昨晚', '今晚',
  '周末', '昨天', '明天', '每天', '天天',
  '亲爱', '亲亲', '抱抱', '爱你', '表白', '祝你', '哥哥', '姐姐', '羡慕', '宝贝',
  '大哥', '老师', '土豪',
]

export function shiQianJingJieDong(kaiChang: string): boolean {
  return QIAN_JING_JIE_DONG.some((d) => kaiChang.startsWith(d))
}

export function caiYangKaiChangHouXuan(
  geShu: number,
  suiJi: () => number = Math.random,
): string[] {
  const biao = huoQuKaiChangBiao()
  const heJi = biao.quanZhong.reduce((a, b) => a + b, 0)
  const chuQu = new Set<string>()
  const shangXian = geShu * 12 + 30
  for (let t = 0; t < shangXian && chuQu.size < geShu; t++) {
    const dian = suiJi() * heJi
    let leiJia = 0
    let beiLi = biao.kaiChang.length - 1
    for (let i = 0; i < biao.quanZhong.length; i++) {
      leiJia += biao.quanZhong[i]
      if (dian <= leiJia) { beiLi = i; break }
    }
    const k = biao.kaiChang[beiLi]
    if (!k) continue
    if (shiQianJingJieDong(k)) continue
    chuQu.add(k)
  }
  return [...chuQu].slice(0, geShu)
}

export function daiShuKaiChangYuanYu(): { wenBen: string; houXuan: string[] } {
  if (!KAI_CHANG_PEI_ZHI.kaiGuan) return { wenBen: '', houXuan: [] }
  const houXuan = caiYangKaiChangHouXuan(KAI_CHANG_PEI_ZHI.houXuanGeShu)
  if (houXuan.length === 0) {
    debug日志.warn('开场候选约束', '候选为空，本轮不加约束', { xiang_qing: { houXuanGeShu: KAI_CHANG_PEI_ZHI.houXuanGeShu } })
    return { wenBen: '', houXuan: [] }
  }
  if (KAI_CHANG_PEI_ZHI.kaiFaMoShi) {
    debug日志.debug('开场候选约束', '已注入开场候选', { xiang_qing: { houXuan } })
  }
  return {
    wenBen: `\n\n（开头两个字请从这几个里挑一个：${houXuan.join(' / ')}；挑完就顺着往下写，后面必须接上真实内容，不能只把挑中的这两个字单独发成一条）`,
    houXuan,
  }
}

export function fuJiaKaiChangYuanYu(
  neiRong: string | DuiHuaKuai[],
  kaiChangYu: string,
): string | DuiHuaKuai[] {
  if (kaiChangYu === '') return neiRong
  if (typeof neiRong === 'string') return neiRong + kaiChangYu
  return [...neiRong, { type: 'input_text', text: kaiChangYu }]
}

export function jianChaFuCong(yuanWen: string, houXuan: string[]): boolean | null {
  const shouTiao = qingLiXiaoXi(yuanWen)[0]
  if (!shouTiao) return null
  const biaoJi = quChuKaiChangToken(shouTiao)
  if (!biaoJi) return null
  return houXuan.some((x) => quChuKaiChangToken(x) === biaoJi)
}