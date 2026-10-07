/**
 * 直读真人在**各种话题**下的原文，跨话题看他们的共性。
 *
 * 目的：从原文里找出**跨话题仍然成立**的风格特征，
 *      而不是给某个话题写反应规则（用户定稿否证）。
 *
 * 只吐原文，不判定。
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
  const xs = (a as unknown[])
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.replace(/\s+/g, ''))
    .filter((s) => s.trim().length > 0)
  if (xs.length >= 2) duan.push(xs)
}

let suan = Number(process.argv[3] || 777)
const suiJi = () => ((suan = (suan * 1664525 + 1013904223) >>> 0) / 4294967296)
const GE = Number(process.argv[2] || 24)

console.log(`# 真人原文 ${GE} 段（跨话题，用于直读共性）\n`)
for (let i = 0; i < GE; i++) {
  const xs = duan.splice(Math.floor(suiJi() * duan.length), 1)[0]
  console.log(`**${i + 1}**`)
  for (const m of xs) console.log(`> ${m}`)
  console.log()
}