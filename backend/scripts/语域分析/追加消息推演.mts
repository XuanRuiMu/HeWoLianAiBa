/**
 * 现实推演：真人「发了消息对方没回」之后会怎么做。
 *
 * 目的：**不靠猜**，从真人语料里找「同一个人连发、中间对方没接」的形态，
 * 看真实的人在这种处境下：
 *   · 会发第二条吗？
 *   · 第二条的内容是什么（追消息 / 还是别的事）？
 *   · 间隔多久？
 *
 * 语料局限（必须说清）：LCCC 每段是**扁平数组、下标奇偶分说话人**，
 *   没有时间戳、没有「谁回复谁」标注，所以能观察的只有**形态**，不能测间隔。
 *   间隔只能靠现实常识 + 项目已有的`回复延迟毫秒`量级来定。
 */
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)
const raw = gunzipSync(readFileSync(gen('.语料工作区/lccc_base_valid.jsonl.gz'))).toString('utf8')

const duan: string[][] = []
for (const line of raw.split(/\r?\n/).filter(Boolean)) {
  let a: unknown
  try { a = JSON.parse(line) } catch { continue }
  if (!Array.isArray(a)) continue
  const xs = (a as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.replace(/\s+/g, '')).filter((s) => s.trim())
  if (xs.length >= 3) duan.push(xs)
}

/** 形态分类：连续两条是否在「追同一件事」 */
function shiZhuiTongYiJian(shang: string, xia: string): boolean {
  const ji = (s: string) => {
    const z = s.replace(/[\s　]/g, '')
    const out = new Set<string>()
    for (let i = 0; i < z.length - 1; i++) out.add(z.slice(i, i + 2))
    return out
  }
  const a = ji(shang)
  const b = ji(xia)
  if (a.size === 0 || b.size === 0) return false
  let jiao = 0
  for (const x of a) if (b.has(x)) jiao++
  return jiao / (a.size + b.size - jiao) >= 0.25
}

console.log('=== 形态 A：同一个人连发两条、第二条在「追同一件事」（= 催/追问）===\n')
let zhui = 0
for (const xs of duan) {
  // 奇数下标是同一个人（说话人 A），偶数是 B
  for (let i = 1; i + 1 < xs.length; i += 2) {
    const shang = xs[i - 1]
    const xia = xs[i]
    if (i + 2 < xs.length && xs[i + 1] !== undefined && shiZhuiTongYiJian(shang, xia)) {
      zhui++
      if (zhui <= 10) console.log(`  A: 「${shang}」\n     ↓紧接着\n     B:「${xia}」`)
      break
    }
  }
}
console.log(`\n  共 ${zhui} 段出现「追同一件事」\n`)

console.log('=== 形态 B：同一个人连发两条、第二条是「别的事」（= 顺便说）===\n')
let bieDe = 0
for (const xs of duan) {
  for (let i = 1; i + 1 < xs.length; i += 2) {
    const shang = xs[i - 1]
    const xia = xs[i]
    if (!shiZhuiTongYiJian(shang, xia)) {
      bieDe++
      if (bieDe <= 12) console.log(`  A: 「${shang}」\n     ↓紧接着\n     B:「${xia}」`)
      break
    }
  }
}
console.log(`\n  共 ${bieDe} 段出现「顺便说别的事」`)
console.log(`\n=== 读法 ===`)
console.log(`  若形态 B 远多于形态 A ⇒ 真人连发第二条时，大概率**不是催消息，而是有别的事想说**。`)
console.log(`  那么触发条件就不该是「用户没回我就催」，而该是「角色自己有别的事想说」。`)