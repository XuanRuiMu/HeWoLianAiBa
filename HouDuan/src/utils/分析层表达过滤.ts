import { debug日志 } from './debug日志'

// 只有后台才知道的身份词与读心断言：允许影响判断方向，但不允许进入面向玩家的表达。
// 注意这里针对的是「维度词/身份词」本身，不带「度」的日常词（如「挺亲密的」）不受影响。
const XieLuJuXing: RegExp[] = [
  // 「对象类型：渣型」是前端依赖的字段标签，不能抹；只挡甩后台身份的句式。
  /对象类型(?:是|为)/i,
  /(?:TA|对方|他|她|这人|对象)(?:是|就是|属于)渣/,
  /渣男|渣女|MBTI/i,
  /信任度|亲密度|趣味度|关怀度|好感度|总分值?|分值|关系阶段/,
  /你在讨好|讨好(?:对方|TA|她|他)|(?:TA|对方|他|她)?在试探你|试探你的态度/,
]

const JuWeiBiaoDian = '。！？!?；;'

function qieJu(wenBen: string): string[] {
  const juLie: string[] = []
  let dangQian = ''
  for (const zi of wenBen) {
    dangQian += zi
    if (JuWeiBiaoDian.includes(zi)) {
      juLie.push(dangQian)
      dangQian = ''
    }
  }
  if (dangQian) juLie.push(dangQian)
  return juLie
}

function hanYouXieLu(ju: string): boolean {
  return XieLuJuXing.some((xing) => xing.test(ju))
}

/**
 * 抹去 AI 分析结果里「只有后台才知道」的身份词与读心断言。
 * 只用于军师/复盘出参，不能用于玩家可见的原始聊天内容。
 * 逐句整句丢弃，避免把半句话留在玩家面前。
 */
export function guoLvFenXiBiaoDa(wenBen: string, changJing = '分析'): string {
  if (!wenBen) return ''
  const yuanHang = wenBen.split('\n')
  const baoLiuHang: string[] = []
  let shuaiDiao = 0
  for (const yuan of yuanHang) {
    const juLie = qieJu(yuan)
    const baoLiuJu = juLie.filter((ju) => {
      if (!ju.trim()) return false
      if (hanYouXieLu(ju)) {
        shuaiDiao++
        return false
      }
      return true
    })
    if (baoLiuJu.length > 0) baoLiuHang.push(baoLiuJu.join('').trim())
  }
  if (shuaiDiao > 0) {
    debug日志.debug('分析表达过滤', `${changJing}抹去后台身份/读心表述`, {
      xiang_qing: { changJing, juShu: shuaiDiao },
    })
  }
  return baoLiuHang.join('\n').trim()
}
