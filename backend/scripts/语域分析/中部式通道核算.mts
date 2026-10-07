/**
 * 中部式省略号通道核算 —— 零外呼，只读已落盘实测数据。
 *
 * 为什么要有这个脚本（第九轮审查 S4）：
 *   「省略号前字符分布 / 剥除 `嗯…` 后形态变化 / 各臂 sd / MDE」这四组量
 *   在第八、九两轮都是手推的。手推无法复现、无法交叉验证，且两次给出了
 *   **互相矛盾**的根因（第八轮归因 `:85` 许可，第九轮用消融臂证伪为夹具污染）。
 *   落盘成脚本后，任何人重跑都能得到同一组数。
 *
 * 用法：
 *   node --experimental-strip-types .语料工作区/中部式通道核算.mts
 */
import { readFileSync } from 'node:fs'
import { fenLeiSheHao } from './语域口径.ts'

const YU_QI = ['嗯', '啊', '呢', '吧', '噢', '哦', '诶', '唔', '嘛', '啦']

interface Lun { xiaoXi?: string[] }

function duan(luJing: string) {
  const l = (JSON.parse(readFileSync(luJing, 'utf8')) as { suoYouLun: Lun[] }).suoYouLun
  const tiao: string[] = []
  for (const r of l) for (const t of r.xiaoXi || []) { const s = (t || '').trim(); if (s) tiao.push(s) }
  return tiao
}

interface TongJi {
  tiaoShu: number
  pingJunZiShu: number
  yuQiCiMiDu: number
  hanHan: number
  moWei: number
  juZhong: number
  enTou: number
  qianZiFuYuQi: number
  boDiaoHou: { wu: number; moWei: number; duJie: number }
}

function tongJi(tiao: string[]): TongJi {
  const n = tiao.length || 1
  let zi = 0, yuQi = 0, han = 0, mo = 0, ju = 0, enTou = 0, qian = 0
  const boDiaoHou = { wu: 0, moWei: 0, duJie: 0 }
  for (const s of tiao) {
    zi += Array.from(s).length
    for (const y of YU_QI) yuQi += s.split(y).length - 1
    if (!s.includes('…')) continue
    han++
    const lei = fenLeiSheHao(s)
    if (lei === 'moWei') mo++
    else if (lei === 'duJie') { /* 独条已归 duJie */ }
    else if (lei === 'juZhong') {
      ju++
      if (/^嗯[…]+/.test(s)) {
        enTou++
        boDiaoHou[fenLeiSheHao(s.replace(/^嗯[…]+/, '')) as 'wu' | 'moWei' | 'duJie']++
      }
    }
    // 省略号前一个字符是否为语气词（只看第一个省略号）
    const i = s.indexOf('…')
    if (i > 0 && YU_QI.includes(s[i - 1])) qian++
  }
  const P = (x: number) => +((100 * x) / n).toFixed(2)
  return {
    tiaoShu: tiao.length, pingJunZiShu: +(zi / n).toFixed(2), yuQiCiMiDu: +(yuQi / n).toFixed(3),
    hanHan: P(han), moWei: P(mo), juZhong: P(ju), enTou, qianZiFuYuQi: qian,
    boDiaoHou,
  }
}

const ZHEN_REN = { hanHan: 2.7268, moWei: 1.7095, juZhong: 1.0067, yuQiCiMiDu: 0.262, pingJunZiShu: 11.85 }

const ZHAN = [
  ['A 臂 out_C1_噪声底_*（4 处字面在场·夹具）', [0, 1, 2].map((i) => `.语料工作区/out_C1_噪声底_${i}.json`)],
  ['B 臂 out_B_删字面_*（4 处字面已删·夹具）', [0, 1, 2].map((i) => `.语料工作区/out_B_删字面_${i}.json`)],
  ['消融 out_消融（生产人设·夹具开关开）', ['.语料工作区/out_消融.json']],
] as const

console.log('=== 中部式省略号通道核算（零外呼，只读落盘数据）===\n')
for (const [ming, wenJian] of ZHAN) {
  let tiao: string[] = []
  try {
    for (const f of wenJian) tiao = tiao.concat(duan(f))
  } catch {
    console.log(`— ${ming}：落盘缺失，跳过`)
    continue
  }
  const r = tongJi(tiao)
  console.log(`— ${ming}`)
  console.log(`   条数 ${r.tiaoShu}｜语气词密度 ${r.yuQiCiMiDu}｜平均字数 ${r.pingJunZiShu}`)
  console.log(`   含「…」 ${r.hanHan}%｜首/尾 ${r.moWei}%｜中部 ${r.juZhong}%`)
  console.log(`   「嗯…」条数 ${r.enTou}｜省略号前字符是语气词 ${r.qianZiFuYuQi}`)
  if (r.enTou > 0) {
    const b = r.boDiaoHou
    console.log(`   剥掉「嗯…」后：消失 ${b.wu} / 转首尾 ${b.moWei} / 转独条 ${b.duJie}`)
  }
  console.log('')
}

console.log('=== 真人基线（backend/src/测试/真人基线常量.ts）===')
console.log(`   含「…」 ${ZHEN_REN.hanHan}%｜首/尾 ${ZHEN_REN.moWei}%｜中部 ${ZHEN_REN.juZhong}%`)
console.log(`   语气词密度 ${ZHEN_REN.yuQiCiMiDu}｜平均字数 ${ZHEN_REN.pingJunZiShu}`)
console.log('\n⚠️ 「嗯…」条数是最强信号：若某臂为 0，说明该臂的「嗯…」不是 prompt 许可驱动的，而是人设文本驱动的。')
void readFileSync