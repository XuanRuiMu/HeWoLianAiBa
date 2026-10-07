/**
 * 收尾复读归因：判定「同一话题反复跑，AI 收尾复读」是**示例表缺分布**还是别的。
 *
 * 现象（第十四轮亲密度阶梯实测，固定输入「今天降温了你多穿点」）：
 *   `别光顾着说我` ESFP 10 档 7 次 / ENFJ 10 档 8 次，逐字相同。
 *
 * 两个候选根因：
 *   H1 示例表缺「同话题不同收尾」的分布 —— 模型只能从 40 条不同话题里学一个固定收尾
 *   H2 关系阶段文案里塞了「你自己呢」类的具体措辞 —— 被逐字执行
 *
 * 判据：把关系阶段文案里**所有**可能的收尾措辞 grep 出来。
 *   若 `别光顾着` 这类短语根本不在人设/阶段文案里 ⇒ 是 H1（示例分布问题）
 *   若在 ⇒ 是 H2（文案复读，与示例无关）
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)

/** 实测里高频复读的短语 */
const CHONG = ['别光顾着', '别光说', '你自己呢', '你那边呢', '你那边冷不冷', '你自己穿']

/**
 * ⚠️ **必须剥掉注释再扫**（第一版归因脚本的 bug）：
 *   第一版把 `Prompt构建器.ts` 里**我写的注释**（「更糟的是同一条里埋着复读源：
 *   ESFP 的 `别光顾着说我` 在 10 档里 6 次逐字重复」）当成了生产文案，
 *   于是误判成 H2。注释里的词模型根本看不到。
 */
function tuComment(wen: string): string {
  return wen.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const wenJian = [
  { ming: '角色配置.ts', wen: tuComment(readFileSync(gen('backend/src/config/角色配置.ts'), 'utf8')) },
  { ming: 'Prompt构建器.ts', wen: tuComment(readFileSync(gen('backend/src/services/Prompt构建器.ts'), 'utf8')) },
]

console.log('=== 复读短语在生产文案/示例中的出处 ===\n')
let youChongFa = false
for (const { ming, wen } of wenJian) {
  for (const ci of CHONG) {
    const ge = wen.split(ci).length - 1
    if (ge > 0) {
      console.log(`  ${ming}：「${ci}」× ${ge}`)
      youChongFa = true
    }
  }
}

console.log(`\n判定：${youChongFa ? 'H2 —— 短语就在生产文案里 ⇒ 是文案复读' : 'H1 —— 短语不在任何文案里 ⇒ 是示例表缺分布，模型自己收敛的'}`)

if (!youChongFa) {
  const biao = JSON.parse(readFileSync(gen('backend/src/config/风格示例表.json'), 'utf8')) as {
    shiLi: Array<{ yuQi: string; tiao: string[] }>
  }
  console.log(`\n=== 示例表的收尾形态分布（每片段最后一条）===\n`)
  const shouWei = biao.shiLi.map((xs) => xs.tiao[xs.tiao.length - 1])
  const moShi: Record<string, number> = {}
  for (const s of shouWei) {
    let lei: string
    if (/[？?]$/.test(s)) lei = '以问号结尾'
    else if (/[。！!…]$/.test(s)) lei = '以句号/叹号/省略号结尾'
    else if (s.length <= 4) lei = '≤4字短收尾'
    else lei = '其他（无标点）'
    moShi[lei] = (moShi[lei] || 0) + 1
  }
  for (const [k, v] of Object.entries(moShi)) console.log(`  ${k}：${v}`)
  console.log('\n  若「以问号结尾」占绝大多数 ⇒ 模型学到的就是「每条都以问句收尾」，')
  console.log('  而单话题反复跑时它没有别的收尾可选 ⇒ 收敛成同一句。')
  console.log('\n=== 收尾实样 ===')
  for (const s of shouWei.slice(0, 14)) console.log(`  | ${s}`)
}