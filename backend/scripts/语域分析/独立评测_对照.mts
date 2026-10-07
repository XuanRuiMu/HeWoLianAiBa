/**
 * 独立评测 · 第 2 步：AI 输出 vs 真人语料，逐项对照
 *
 * 判据来源（不是拍脑袋）：
 *   真人分布 = 独立评测_真人基线.mts 从 LCCC 20,000 段实算
 *   AI  分布 = 直读实验.mts 的真实外呼输出
 *
 * ⚠️ 这些数字只用于**定位可疑点**，不是验收标准（用户定稿）。
 *   定位到可疑点后，必须由人/AI 直接读原文判断，不能靠数字定案。
 */
import { readFileSync } from 'node:fs'

const LUO_PAN = process.env.PAN_WEN || 'D:/xuanr/Desktop/燃烧之陨我的世界服务端/和我恋爱吧/.语料工作区/独立评测_输出.json'
const shuJu = JSON.parse(readFileSync(LUO_PAN, 'utf8')) as {
  suoYouLun: { mbti: string; lun: number; yongHu: string; xiaoXi: string[]; directorHuiFu?: boolean }[]
}

const BEI_CHANNEL = ['嗯', '哦', '噢', '喔', '啊', '唉', '呃', '唔', '欸', '诶', '咯', '哈', '呵', '嘿']
const QING_MAO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
const WEIBO_BIAO_QING = /[\[\(（【][^\]\)）】]{1,6}[\]\)）】]/
const YU_QI_CI = /(啊|呀|吧|呢|哦|嘛|咯|啦|嘞|哈|呵|嘿|呜|嗷|嗯)/g

/** 真人基线（由 独立评测_真人基线.mts 实算，禁止改动） */
const ZHEN_REN = {
  tiaoShuPingJun: 2.8, tiaoShuZhongWei: 2,
  ziShuPingJun: 11.9, ziShuZhongWei: 9, ziShuSD: 10.5, ziShuP90: 23, ziShuP10: 4,
  wenTiLv: 0.101, yiYuZhenLv: 0.076,
  backchannelLv: 0.008,
  qingMaoLv: 0.001,
  woLv: 0.272, niLv: 0.247,
  yuQiCiMiDu: 3.90,
  shengHanLv: 0.106, shengMoLv: 0.034,
}

type TongJi = { n: number; pingJun: number; zhongWei: number; sd: number; p10: number; p90: number; zhi: (f: number) => number }
function tongJi(v: number[]): TongJi {
  const s = [...v].sort((a, b) => a - b); const n = s.length
  const pingJun = s.reduce((a, b) => a + b, 0) / n
  return {
    n, pingJun, zhongWei: s[Math.floor(n / 2)], sd: Math.sqrt(s.reduce((a, b) => a + (b - pingJun) ** 2, 0) / n),
    p10: s[Math.floor(0.1 * n)], p90: s[Math.floor(0.9 * n)],
    zhi: (f) => s[Math.min(n - 1, Math.floor(f * n))],
  }
}

// 汇总 AI 输出
const lunTiaoShu: number[] = []
const tiaoWen: string[] = []
const geXingLun: Record<string, number[]> = {}
for (const l of shuJu.suoYouLun) {
  lunTiaoShu.push(l.xiaoXi.length)
  geXingLun[l.mbti] = geXingLun[l.mbti] || []
  geXingLun[l.mbti].push(l.xiaoXi.length)
  for (const x of l.xiaoXi) tiaoWen.push(x.trim())
}

const N = tiaoWen.length
const ziShu = tongJi(tiaoWen.map((w) => w.length))
const tiaoShu = tongJi(lunTiaoShu)
const wenTi = tiaoWen.filter((w) => /[?？]/.test(w)).length / N
const yiYuZhen = tiaoWen.filter((w) => /[?？]\s*$/.test(w)).length / N
const back = tiaoWen.filter((w) => w.length <= 4 && BEI_CHANNEL.some((b) => w.startsWith(b))).length / N
const qingMao = (tiaoWen.filter((w) => QING_MAO.test(w)).length + tiaoWen.filter((w) => WEIBO_BIAO_QING.test(w)).length) / N
const wo = tiaoWen.filter((w) => w.includes('我')).length / N
const ni = tiaoWen.filter((w) => w.includes('你')).length / N
const zongZi = tiaoWen.reduce((a, w) => a + w.length, 0)
let yuQi = 0
for (const w of tiaoWen) yuQi += (w.match(YU_QI_CI) || []).length
const yuQiMiDu = (yuQi / zongZi) * 100
const sheng = tiaoWen.filter((w) => /[!！]/.test(w)).length / N
const shengMo = tiaoWen.filter((w) => /\.\.\.|…/.test(w)).length / N

function baiFen(x: number): string { return `${(x * 100).toFixed(1)}%` }

console.log('='.repeat(78))
console.log(`AI 输出样本：${shuJu.suoYouLun.length} 轮 / ${N} 条消息 / 3 型`)
console.log('='.repeat(78))
console.log('\n【逐项对照】 真人 = LCCC 20,000 段实测；AI = 本次真实外呼')
console.log('─'.repeat(78))

const hang: string[] = []
function duiBi(name: string, zr: string, ai: string, cha: number, shuoMing: string): void {
  const zhi = Math.abs(cha) > 0.5 ? '◆ 需查' : '  ok'
  console.log(`${zhi} ${name.padEnd(12)} 真人 ${zr.padEnd(14)} AI ${ai.padEnd(14)} 差 ${cha >= 0 ? '+' : ''}${cha}  ${shuoMing}`)
  if (zhi.startsWith('◆')) hang.push(`${name}（真人 ${zr} → AI ${ai}）`)
}

duiBi('每轮条数', ZHEN_REN.tiaoShuPingJun.toFixed(1), tiaoShu.pingJun.toFixed(1), tiaoShu.pingJun - ZHEN_REN.tiaoShuPingJun, `中位 ${tiaoShu.zhongWei} vs ${ZHEN_REN.tiaoShuZhongWei}`)
duiBi('单条字数', ZHEN_REN.ziShuPingJun.toFixed(1), ziShu.pingJun.toFixed(1), ziShu.pingJun - ZHEN_REN.ziShuPingJun, `中位 ${ziShu.zhongWei} vs ${ZHEN_REN.ziShuZhongWei}；SD ${ziShu.sd.toFixed(1)} vs ${ZHEN_REN.ziShuSD}`)
duiBi('长文占比', `P90=${ZHEN_REN.ziShuP90}`, `P90=${ziShu.p90}`, ziShu.p90 - ZHEN_REN.ziShuP90, '上限差异')
duiBi('短消息占比', `P10=${ZHEN_REN.ziShuP10}`, `P10=${ziShu.p10}`, ziShu.p10 - ZHEN_REN.ziShuP10, '下限差异')
duiBi('提问率', baiFen(ZHEN_REN.wenTiLv), baiFen(wenTi), wenTi - ZHEN_REN.wenTiLv, 'Mayor2025：过度提问是最稳健的机器痕迹')
duiBi('以?结尾', baiFen(ZHEN_REN.yiYuZhenLv), baiFen(yiYuZhen), yiYuZhen - ZHEN_REN.yiYuZhenLv, '追问倾向')
duiBi('backchannel', baiFen(ZHEN_REN.backchannelLv), baiFen(back), back - ZHEN_REN.backchannelLv, '嗯/哦类协调信号')
duiBi('表情符号', baiFen(ZHEN_REN.qingMaoLv), baiFen(qingMao), qingMao - ZHEN_REN.qingMaoLv, '注：LCCC 为2019年语料，时代偏低')
duiBi('含「我」', baiFen(ZHEN_REN.woLv), baiFen(wo), wo - ZHEN_REN.woLv, '自我聚焦')
duiBi('含「你」', baiFen(ZHEN_REN.niLv), baiFen(ni), ni - ZHEN_REN.niLv, '指向对方')
duiBi('语气词/百字', ZHEN_REN.yuQiCiMiDu.toFixed(2), yuQiMiDu.toFixed(2), yuQiMiDu - ZHEN_REN.yuQiCiMiDu, '口语颗粒度')
duiBi('感叹号', baiFen(ZHEN_REN.shengHanLv), baiFen(sheng), sheng - ZHEN_REN.shengHanLv, '情绪强度')
duiBi('省略号', baiFen(ZHEN_REN.shengMoLv), baiFen(shengMo), shengMo - ZHEN_REN.shengMoLv, '迟疑感')

console.log('\n' + '─'.repeat(78))
console.log('【分性格 每轮条数 / 单条字数】')
for (const [k, v] of Object.entries(geXingLun)) {
  const t = tongJi(v)
  console.log(`  ${k}  轮长均值 ${t.pingJun.toFixed(1)} 分布 [${t.zhi(0).toFixed(0)},${t.zhi(1).toFixed(0)}]`)
}
const fenGeZiShu = Object.entries(geXingLun).map(([k]) => {
  const s = shuJu.suoYouLun.filter((l) => l.mbti === k).flatMap((l) => l.xiaoXi)
  return tongJi(s.map((w) => w.length)).pingJun
})
console.log(`  三型单条字数均值: ${fenGeZiShu.map((x) => x.toFixed(1)).join(' / ')}  极差 ${(Math.max(...fenGeZiShu) - Math.min(...fenGeZiShu)).toFixed(1)}`)
console.log('  ⚠️ 真人语料的「性格内差异」无标注，无法给出该维度的真人对照值。')

console.log('\n' + '─'.repeat(78))
console.log('【多轮退化检查】（Lu2025：LLM 跨轮质量下降，真人上升）')
for (const k of Object.keys(geXingLun)) {
  const lun = shuJu.suoYouLun.filter((l) => l.mbti === k)
  const qianQi = lun.slice(0, 4).flatMap((l) => l.xiaoXi.map((w) => w.length))
  const houQi = lun.slice(4).flatMap((l) => l.xiaoXi.map((w) => w.length))
  const a = tongJi(qianQi).pingJun
  const b = tongJi(houQi).pingJun
  const tiaoShuQian = tongJi(lun.slice(0, 4).map((l) => l.xiaoXi.length)).pingJun
  const tiaoShuHou = tongJi(lun.slice(4).map((l) => l.xiaoXi.length)).pingJun
  console.log(`  ${k}  字数 前4轮 ${a.toFixed(1)} → 后4轮 ${b.toFixed(1)} (${b - a >= 0 ? '+' : ''}${(b - a).toFixed(1)})   条数 ${tiaoShuQian.toFixed(1)} → ${tiaoShuHou.toFixed(1)}`)
}
console.log('  ⚠️ 这是**长度**代理，不是质量。质量退化需读原文判断。')

console.log('\n' + '─'.repeat(78))
console.log('【回复率】')
const bu = shuJu.suoYouLun.filter((l) => l.directorHuiFu === false).length
console.log(`  24 轮中「已读不回」= ${bu} 次 (${((bu / shuJu.suoYouLun.length) * 100).toFixed(0)}%)`)
console.log('  ⚠️ 真人在恋爱聊天中不会 100% 秒回。但本场景是「刚加好友+用户主动发起」，')
console.log('     真人基线无对应条件，**不能据此判定为缺陷**。仅登记。')

console.log('\n' + '='.repeat(78))
console.log(`需查项 ${hang.length} 个：`)
for (const h of hang) console.log('  ◆ ' + h)
console.log('='.repeat(78))