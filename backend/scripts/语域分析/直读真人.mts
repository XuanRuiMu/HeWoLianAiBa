/**
 * 直读样本：真人 vs AI，同话题对照，只吐原文。
 *
 * ⚠️ 不输出任何指标。判据只有一个（用户定稿）：
 *    **这条回复由这个性格的真人发出去，是否可能？**
 */
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)

const raw = gunzipSync(readFileSync(gen('.语料工作区/lccc_base_valid.jsonl.gz'))).toString('utf8')
const zhenRen: string[][] = []
for (const line of raw.split(/\r?\n/).filter(Boolean)) {
  let a: unknown
  try { a = JSON.parse(line) } catch { continue }
  if (!Array.isArray(a)) continue
  const xs = (a as unknown[])
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.replace(/\s+/g, ''))
    .filter((s) => s.trim().length > 0)
  if (xs.length >= 2) zhenRen.push(xs)
}

let suan = 20261003
const suiJi = () => ((suan = (suan * 1664525 + 1013904223) >>> 0) / 4294967296)

console.log('# 真人聊天原文（随机 12 段，供直读）\n')
for (let i = 0; i < 12; i++) {
  const xs = zhenRen.splice(Math.floor(suiJi() * zhenRen.length), 1)[0]
  console.log(`**${i + 1}**`)
  for (const m of xs) console.log(`> ${m}`)
  console.log()
}