import { chaZhaoWeiXinXiaoBiaoQing } from '@/config/微信原生表情'

export interface WenBenPianDuan {
  leiXing: 'wenZi' | 'weiXinBiaoQing'
  neiRong: string
}

/**
 * 把文本里的 [表情名] 切成 文字 / 微信小表情 片段。
 * 只认微信原生小表情码表里的名字；方括号里的其他内容（如 [贴纸:xxx]）原样保留为文字。
 */
export function qieFenWenBenWeiXinBiaoQing(neiRong: string): WenBenPianDuan[] {
  const jieGuo: WenBenPianDuan[] = []
  if (typeof neiRong !== 'string' || neiRong === '') return jieGuo
  const zhengZe = /\[([^\[\]]{1,12})\]/g
  let shangCiJieShu = 0
  let piPei = zhengZe.exec(neiRong)
  while (piPei !== null) {
    const mingCheng = piPei[1].trim()
    if (chaZhaoWeiXinXiaoBiaoQing(mingCheng) !== null) {
      if (piPei.index > shangCiJieShu) {
        jieGuo.push({ leiXing: 'wenZi', neiRong: neiRong.slice(shangCiJieShu, piPei.index) })
      }
      jieGuo.push({ leiXing: 'weiXinBiaoQing', neiRong: mingCheng })
      shangCiJieShu = piPei.index + piPei[0].length
    }
    piPei = zhengZe.exec(neiRong)
  }
  if (shangCiJieShu < neiRong.length) {
    jieGuo.push({ leiXing: 'wenZi', neiRong: neiRong.slice(shangCiJieShu) })
  }
  return jieGuo
}

export function hanWeiXinXiaoBiaoQing(neiRong: string): boolean {
  return qieFenWenBenWeiXinBiaoQing(neiRong).some((x) => x.leiXing === 'weiXinBiaoQing')
}
