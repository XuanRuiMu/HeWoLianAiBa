/**
 * 逐轮打印全部实测输出，按「轮」分组 —— 用于直读「节奏」：
 * 模型是否每轮都在「回应 + 收尾追问」，有无自己的话题、有无废话、有无停顿。
 *
 * 只吐原文，不判定。
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)
const j = JSON.parse(readFileSync(gen('.语料工作区/out_16xing_D_new.json'), 'utf8')) as {
  suoYouLun: Array<{ mbti?: string; xiaoXi?: string[] }>
}

const XING = process.argv[2] || 'ISTJ'
const LUN = Number(process.argv[3] || 24)

const rows = j.suoYouLun.filter((r) => r.mbti === XING)
console.log(`# ${XING} 全 ${rows.length} 轮原文（真实实测输出）\n`)
rows.slice(0, LUN).forEach((r, i) => {
  const xs = r.xiaoXi || []
  console.log(`**R${i + 1}**（${xs.length} 条）`)
  for (const m of xs) console.log(`> ${m}`)
  console.log()
})