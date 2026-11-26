import { 表情标记 } from '../config/表情包配置'
import { debug日志 } from '../utils/debug日志'
import { 微信表情名单, Emoji名称表, Emoji字符 } from './表情码表'

const 表情片段正则 = /[\[【]\s*表情\s*[:：]\s*([^\]】\n\r]{1,40}?)\s*[\]】]/g

const 来源前缀 = ['微信', 'emoji', 'Emoji', 'EMOJI', 'wx', 'WX']

export interface 表情解析结果 {
  laiYuan: '微信' | 'emoji' | null
  mingCheng: string
  tiHuan: string
}

function 去来源前缀(yuanWen: string): { laiYuan: '微信' | 'emoji' | null; mingCheng: string } {
  const jianHua = yuanWen.trim()
  for (const qianZhui of 来源前缀) {
    if (!jianHua.startsWith(qianZhui)) continue
    const shengYu = jianHua.slice(qianZhui.length).replace(/^[\s:：]+/, '').trim()
    if (shengYu === '') return { laiYuan: null, mingCheng: '' }
    return { laiYuan: qianZhui.toLowerCase() === 'wx' ? '微信' : (qianZhui === '微信' ? '微信' : 'emoji'), mingCheng: shengYu }
  }
  return { laiYuan: null, mingCheng: jianHua }
}

export function 解析表情(neiRong: string): 表情解析结果 | null {
  const { laiYuan, mingCheng } = 去来源前缀(neiRong)
  if (mingCheng === '') return null
  if (laiYuan === '微信') {
    if (!微信表情名单.has(mingCheng)) return null
    return { laiYuan: '微信', mingCheng, tiHuan: `[${mingCheng}]` }
  }
  if (laiYuan === 'emoji') {
    const ziFu = Emoji字符(mingCheng)
    if (!ziFu) return null
    return { laiYuan: 'emoji', mingCheng, tiHuan: ziFu }
  }
  if (微信表情名单.has(mingCheng)) return { laiYuan: '微信', mingCheng, tiHuan: `[${mingCheng}]` }
  if (Emoji名称表[mingCheng]) return { laiYuan: 'emoji', mingCheng, tiHuan: Emoji名称表[mingCheng] }
  const ziFu = Emoji字符(mingCheng)
  if (ziFu) return { laiYuan: 'emoji', mingCheng, tiHuan: ziFu }
  return null
}

export function 转义表情标记(wenBen: string): string {
  if (typeof wenBen !== 'string' || wenBen === '') return wenBen
  return wenBen.replace(表情片段正则, (quan: string, neiRong: string) => {
    const jieGuo = 解析表情(neiRong)
    if (!jieGuo) {
      debug日志.warn('表情标记', '无法识别的表情标记，按原样保留', {
        xiang_qing: { yuan_wen: quan.slice(0, 表情标记.yuanWenZuiDaChang), nei_rong: neiRong.slice(0, 表情标记.yuanWenZuiDaChang) },
      })
      return quan
    }
    return jieGuo.tiHuan
  })
}

export function 含表情标记(wenBen: string): boolean {
  if (typeof wenBen !== 'string' || wenBen === '') return false
  return 表情片段正则.test(wenBen)
}

export function 提取表情标记(wenBen: string): Array<{ laiYuan: '微信' | 'emoji'; mingCheng: string }> {
  if (typeof wenBen !== 'string' || wenBen === '') return []
  const jieGuo: Array<{ laiYuan: '微信' | 'emoji'; mingCheng: string }> = []
  for (const piPei of wenBen.matchAll(表情片段正则)) {
    const jieXi = 解析表情(piPei[1])
    if (!jieXi || !jieXi.laiYuan) continue
    jieGuo.push({ laiYuan: jieXi.laiYuan, mingCheng: jieXi.mingCheng })
  }
  return jieGuo
}

export function 清掉表情标记(wenBen: string): string {
  if (typeof wenBen !== 'string' || wenBen === '') return ''
  return wenBen.replace(表情片段正则, '')
}
