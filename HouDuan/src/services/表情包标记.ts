import { readFileSync } from 'fs'
import { resolve } from 'path'
import { BiaoQingBiaoJi } from '../config/表情包配置'
import { debug日志 } from '../utils/debug日志'

export type BiaoQingPianDuanLeiXing = 'wenzi' | 'tupian'

export interface BiaoQingPianDuan {
  leiXing: BiaoQingPianDuanLeiXing
  neiRong: string
}

const KongBai = '[ \\t\\u3000]'

const HanZiYuBiaoDian = '\\u3000-\\u303f\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uffef'

function zhuanYiZhengZe(zhi: string): string {
  return zhi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ziFuZu(lieBiao: readonly string[]): string {
  return lieBiao.map((xiang) => zhuanYiZhengZe(xiang)).join('')
}

const ZuoKuoHaoZu = ziFuZu(BiaoQingBiaoJi.zuoKuoHao)

const YouKuoHaoZu = ziFuZu(BiaoQingBiaoJi.youKuoHao)

const MaoHaoZu = ziFuZu(BiaoQingBiaoJi.maoHao)

const BiaoQingShuJu = `[${ZuoKuoHaoZu}]${KongBai}*${BiaoQingBiaoJi.qianZhui}${KongBai}*[${MaoHaoZu}]${KongBai}*([^${YouKuoHaoZu}\\n\\r]*?)${KongBai}*[${YouKuoHaoZu}]`

const QingXiZuoKuoHaoZu = ziFuZu(BiaoQingBiaoJi.qingXiKuoHao.map((kuoHao) => kuoHao.zuo))

const QingXiYouKuoHaoZu = ziFuZu(BiaoQingBiaoJi.qingXiKuoHao.map((kuoHao) => kuoHao.you))

const QingXiGuanJianZiZu = BiaoQingBiaoJi.qingXiGuanJianCi.map(zhuanYiZhengZe).join('|')

const QingXiShuJu = `[${QingXiZuoKuoHaoZu}]${KongBai}*(?:${QingXiGuanJianZiZu})${KongBai}*(?:[${MaoHaoZu}]|${KongBai})[^${QingXiYouKuoHaoZu}\\n\\r]*(?:[${QingXiYouKuoHaoZu}]|$)`

function shiHeFaDuanMing(duanMing: string): boolean {
  const changDu = duanMing.length
  if (changDu < BiaoQingBiaoJi.duanMingZuiXiaoChangDu) return false
  if (changDu > BiaoQingBiaoJi.duanMingZuiDaChangDu) return false
  if (/[\n\r]/.test(duanMing)) return false
  return !new RegExp(`[${ZuoKuoHaoZu}]`).test(duanMing)
}

function tianJiaWenZi(jieGuo: BiaoQingPianDuan[], yuanWen: string): void {
  const jianHua = yuanWen.trim()
  if (jianHua === '') return
  jieGuo.push({ leiXing: 'wenzi', neiRong: jianHua })
}

export function qieFenBiaoQing(wenBen: string): BiaoQingPianDuan[] {
  if (typeof wenBen !== 'string' || wenBen === '') return []
  const jieGuo: BiaoQingPianDuan[] = []
  const zhengZe = new RegExp(BiaoQingShuJu, 'g')
  let shangCiJieShu = 0
  let piPei = zhengZe.exec(wenBen)
  while (piPei !== null) {
    const duanMing = piPei[1].trim()
    if (shiHeFaDuanMing(duanMing)) {
      tianJiaWenZi(jieGuo, wenBen.slice(shangCiJieShu, piPei.index))
      jieGuo.push({ leiXing: 'tupian', neiRong: duanMing })
      shangCiJieShu = piPei.index + piPei[0].length
    }
    piPei = zhengZe.exec(wenBen)
  }
  tianJiaWenZi(jieGuo, wenBen.slice(shangCiJieShu))
  return jieGuo
}

export function tiQuBiaoQingDuanMing(wenBen: string): string[] {
  const jieGuo: string[] = []
  for (const pianDuan of qieFenBiaoQing(wenBen)) {
    if (pianDuan.leiXing !== 'tupian') continue
    if (jieGuo.includes(pianDuan.neiRong)) continue
    jieGuo.push(pianDuan.neiRong)
  }
  return jieGuo
}

function qingLiKongBai(wenBen: string): string {
  const heBing = wenBen.replace(/[ \t\u3000]+/g, ' ')
  const tieJin = heBing.replace(new RegExp(`([${HanZiYuBiaoDian}]) (?=[${HanZiYuBiaoDian}])`, 'g'), '$1')
  return tieJin
    .split('\n')
    .map((hang) => hang.replace(/^[ \t\u3000]+|[ \t\u3000]+$/g, ''))
    .join('\n')
    .trim()
}

function tongJiHeFaBiaoQingShu(wenBen: string): number {
  let shu = 0
  for (const pianDuan of qieFenBiaoQing(wenBen)) {
    if (pianDuan.leiXing === 'tupian') shu += 1
  }
  return shu
}

function jiLuQingXiYiChang(yuanWen: string, shanChuShu: number): void {
  if (shanChuShu <= 0) return
  const heFaShu = tongJiHeFaBiaoQingShu(yuanWen)
  if (shanChuShu <= heFaShu) return
  debug日志.warn('表情包标记', '清洗到非标准形态的表情包标记，已按残片剥除', {
    xiang_qing: {
      shan_chu_shu: shanChuShu,
      he_fa_shu: heFaShu,
      yuan_wen: yuanWen.slice(0, BiaoQingBiaoJi.qingXiYuanWenZuiDaChang),
    },
  })
}

const yuanshengBiaoQingMing = new Set<string>(
  (JSON.parse(readFileSync(resolve(__dirname, '../config/微信原生表情码表.json'), 'utf-8')) as Array<{ name: string }>).map((x) => x.name)
)

export function zhuanHuanYuanShengBiaoQing(wenBen: string): string {
  if (typeof wenBen !== 'string' || wenBen === '') return wenBen
  return wenBen.replace(/\[([^\[\]]{1,8})\]/g, (quan: string, ming: string) => {
    const mingCheng = ming.trim()
    if (yuanshengBiaoQingMing.has(mingCheng)) return `[表情包:wx_${mingCheng}]`
    return quan
  })
}

export function guiYiLiShiBiaoQingBiaoJi(wenBen: string): string {
  if (typeof wenBen !== 'string' || wenBen === '') return wenBen
  return wenBen.replace(/\[贴纸([:：])/g, '[表情包$1')
}
export function qingXiBiaoQingCanPian(wenBen: string): string {
  if (typeof wenBen !== 'string' || wenBen === '') return ''
  let shanChuShu = 0
  const quDiao = wenBen.replace(new RegExp(QingXiShuJu, 'gm'), () => {
    shanChuShu += 1
    return ''
  })
  jiLuQingXiYiChang(wenBen, shanChuShu)
  return qingLiKongBai(quDiao)
}

export function shiDanChunBiaoQing(wenBen: string): boolean {
  const pianDuan = qieFenBiaoQing(wenBen)
  return pianDuan.length === 1 && pianDuan[0].leiXing === 'tupian'
}
