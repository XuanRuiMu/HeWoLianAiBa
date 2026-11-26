import { 表情包标记 } from '../config/表情包配置'
import { debug日志 } from '../utils/debug日志'

export type 消息段类型 = 'wenzi' | 'biaoqingbao'

export interface 消息段 {
  leiXing: 消息段类型
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

const ZuoKuoHaoZu = ziFuZu(表情包标记.zuoKuoHao)

const YouKuoHaoZu = ziFuZu(表情包标记.youKuoHao)

const MaoHaoZu = ziFuZu(表情包标记.maoHao)

const BiaoQingBaoShuJu = `[${ZuoKuoHaoZu}]${KongBai}*${表情包标记.qianZhui}${KongBai}*[${MaoHaoZu}]${KongBai}*([^${YouKuoHaoZu}\\n\\r]*?)${KongBai}*[${YouKuoHaoZu}]`

const QingXiZuoKuoHaoZu = ziFuZu(表情包标记.qingXiKuoHao.map((kuoHao) => kuoHao.zuo))

const QingXiYouKuoHaoZu = ziFuZu(表情包标记.qingXiKuoHao.map((kuoHao) => kuoHao.you))

const QingXiGuanJianZiZu = 表情包标记.qingXiGuanJianCi.map(zhuanYiZhengZe).join('|')

const QingXiShuJu = `[${QingXiZuoKuoHaoZu}]${KongBai}*(?:${QingXiGuanJianZiZu})${KongBai}*(?:[${MaoHaoZu}]|${KongBai})[^${QingXiYouKuoHaoZu}\\n\\r]*(?:[${QingXiYouKuoHaoZu}]|$)`

function shiHeFaDuanMing(duanMing: string): boolean {
  const changDu = duanMing.length
  if (changDu < 表情包标记.duanMingZuiXiaoChangDu) return false
  if (changDu > 表情包标记.duanMingZuiDaChangDu) return false
  if (/[\n\r]/.test(duanMing)) return false
  return !new RegExp(`[${ZuoKuoHaoZu}]`).test(duanMing)
}

function tianJiaWenZi(jieGuo: 消息段[], yuanWen: string): void {
  const jianHua = yuanWen.trim()
  if (jianHua === '') return
  jieGuo.push({ leiXing: 'wenzi', neiRong: jianHua })
}

export function qieFenBiaoQingBao(wenBen: string): 消息段[] {
  if (typeof wenBen !== 'string' || wenBen === '') return []
  const jieGuo: 消息段[] = []
  const zhengZe = new RegExp(BiaoQingBaoShuJu, 'g')
  let shangCiJieShu = 0
  let piPei = zhengZe.exec(wenBen)
  while (piPei !== null) {
    const duanMing = piPei[1].trim()
    if (shiHeFaDuanMing(duanMing)) {
      tianJiaWenZi(jieGuo, wenBen.slice(shangCiJieShu, piPei.index))
      jieGuo.push({ leiXing: 'biaoqingbao', neiRong: duanMing })
      shangCiJieShu = piPei.index + piPei[0].length
    }
    piPei = zhengZe.exec(wenBen)
  }
  tianJiaWenZi(jieGuo, wenBen.slice(shangCiJieShu))
  return jieGuo
}

export function tiQuBiaoQingBaoDuanMing(wenBen: string): string[] {
  const jieGuo: string[] = []
  for (const pianDuan of qieFenBiaoQingBao(wenBen)) {
    if (pianDuan.leiXing !== 'biaoqingbao') continue
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

function tongJiHeFaBiaoQingBaoShu(wenBen: string): number {
  let shu = 0
  for (const pianDuan of qieFenBiaoQingBao(wenBen)) {
    if (pianDuan.leiXing === 'biaoqingbao') shu += 1
  }
  return shu
}

function jiLuQingXiYiChang(yuanWen: string, shanChuShu: number): void {
  if (shanChuShu <= 0) return
  const heFaShu = tongJiHeFaBiaoQingBaoShu(yuanWen)
  if (shanChuShu <= heFaShu) return
  debug日志.warn('表情包标记', '清洗到非标准形态的表情包标记，已按残片剥除', {
    xiang_qing: {
      shan_chu_shu: shanChuShu,
      he_fa_shu: heFaShu,
      yuan_wen: yuanWen.slice(0, 表情包标记.qingXiYuanWenZuiDaChang),
    },
  })
}

export function qingXiBiaoQingBaoCanPian(wenBen: string): string {
  if (typeof wenBen !== 'string' || wenBen === '') return ''
  let shanChuShu = 0
  const quDiao = wenBen.replace(new RegExp(QingXiShuJu, 'gm'), () => {
    shanChuShu += 1
    return ''
  })
  jiLuQingXiYiChang(wenBen, shanChuShu)
  return qingLiKongBai(quDiao)
}

export function shiDanChunBiaoQingBao(wenBen: string): boolean {
  const pianDuan = qieFenBiaoQingBao(wenBen)
  return pianDuan.length === 1 && pianDuan[0].leiXing === 'biaoqingbao'
}
