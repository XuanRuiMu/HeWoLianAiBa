/** 用权威口径 fenLeiSheHao 算真人（LCCC-base-valid）的省略号三形态基线。零外呼。 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { fenLeiSheHao } from './语域口径.ts'

const WEN_JIAN = process.argv[2] || '.语料工作区/lccc_base_valid.jsonl.gz'
const yuanWen = gunzipSync(readFileSync(WEN_JIAN)).toString('utf8')
const hang = yuanWen.split(/\r?\n/).filter(Boolean)

let tiaoShu = 0
let duJie = 0
let moWei = 0
let juZhong = 0

for (const x of hang) {
  let dui: string[]
  try {
    const j = JSON.parse(x)
    if (!Array.isArray(j)) continue
    dui = j
  } catch {
    continue
  }
  for (const yu of dui) {
    const t = typeof yu === 'string' ? yu.trim() : ''
    if (!t) continue
    tiaoShu += 1
    const lei = fenLeiSheHao(t)
    if (lei === 'duJie') duJie += 1
    else if (lei === 'moWei') moWei += 1
    else if (lei === 'juZhong') juZhong += 1
  }
}

const y = tiaoShu || 1
const lv = (n: number) => Number(((100 * n) / y).toFixed(4))
const heHan = duJie + moWei + juZhong
const biao = {
  xianZhu: 'LCCC-base-valid',
  duanShu: hang.length,
  tiaoShu,
  sheHaoDuJie: lv(duJie),
  sheHaoMoWei: lv(moWei),
  sheHaoJuZhong: lv(juZhong),
  sheHaoHeJi: lv(heHan),
  sheHaoZhongBuZhanBi: heHan ? Number(((100 * juZhong) / heHan).toFixed(4)) : 0,
}

console.log(`LCCC-base-valid：${biao.duanShu} 段 / ${biao.tiaoShu} 条`)
console.log(`  含「…」合计   ${biao.sheHaoHeJi}%（${heHan} 条）`)
console.log(`  ├ 独条        ${biao.sheHaoDuJie}%（${duJie} 条）`)
console.log(`  ├ 在首/尾     ${biao.sheHaoMoWei}%（${moWei} 条）`)
console.log(`  └ 在中部      ${biao.sheHaoJuZhong}%（${juZhong} 条）`)
console.log(`  中部占省略号总量 ${biao.sheHaoZhongBuZhanBi}%`)

const duiBi = (qi: number, ren: number) => {
  const b = ren === 0 ? null : Number((qi / ren).toFixed(2))
  return `${qi}% vs 真人 ${ren}% = ${b === null ? 'n/a' : b + '×'}`
}
console.log('\n--- 与阶段 B 的 B 臂对照（AI 14.69% 中部）---')
console.log('  中部式  ' + duiBi(14.69, biao.sheHaoJuZhong))
console.log('  首/尾式  ' + duiBi(12.79, biao.sheHaoMoWei))

writeFileSync('.语料工作区/真人省略号基线.json', JSON.stringify(biao, null, 2), 'utf8')
console.log('\n已写出 .语料工作区/真人省略号基线.json')
void writeFileSync