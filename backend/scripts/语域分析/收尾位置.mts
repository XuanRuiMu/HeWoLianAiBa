/**
 * 按「收尾位置」与「是否提问」统计 —— 只为验证一个怀疑：
 * 「AI 的多条输出**总在最后一条收尾提问**」是不是结构性的。
 *
 * ⚠️ 判据不是数字大小，而是**分布形态**：
 *    如果真人问句散在各位置、AI 集中在末尾，
 *    那就说明 AI 的多条输出是「一次生成再切分」，
 *    而真人是「一条一条发」，收尾感来自生成方式而非语言习惯。
 *
 * 用法：node --experimental-strip-types backend/scripts/语域分析/收尾位置.mts
 */
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const gen = (wen: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', wen)

const shiWen = (t: string) => /[？?]|吗|呢|吧$|怎么|为什么|啥/.test(t)
const duiHua = (t: string) => /？|\?/.test(t)

interface Lun { xiaoXi?: string[] }

function tongJi(lun: Lun[], ming: string, pan: (t: string) => boolean) {
  let youWenDeLun = 0
  let weiShouWen = 0
  let zhongWen = 0
  for (const r of lun) {
    const xs = r.xiaoXi || []
    if (xs.length < 2) continue // 只看多条轮，单条无法判断「收尾」
    const weiZhi = xs.findIndex(pan)
    if (weiZhi < 0) continue
    youWenDeLun++
    zhongWen += weiZhi + 1
    if (weiZhi === xs.length - 1) weiShouWen++
  }
  console.log(
    `${ming}：多条轮里含问句 ${youWenDeLun} 轮，其中问句落在**最后一条** ${weiShouWen} 轮 ` +
      `(${(weiShouWen / youWenDeLun * 100).toFixed(1)}%)，问句平均位置 ${(zhongWen / youWenDeLun).toFixed(2)} / 轮末`,
  )
  return { youWenDeLun, weiShouWen }
}

const ai = (JSON.parse(readFileSync(gen('.语料工作区/out_16xing_D_new.json'), 'utf8')) as { suoYouLun: Lun[] })
  .suoYouLun.filter((r) => (r.xiaoXi || []).length > 0)

const raw = gunzipSync(readFileSync(gen('.语料工作区/lccc_base_valid.jsonl.gz'))).toString('utf8')
const zhenRen: Lun[] = []
for (const line of raw.split(/\r?\n/).filter(Boolean)) {
  let a: unknown
  try { a = JSON.parse(line) } catch { continue }
  if (!Array.isArray(a)) continue
  const xiaoXi = (a as unknown[])
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.replace(/\s+/g, ''))
    .filter((s) => s.trim().length > 0)
  if (xiaoXi.length) zhenRen.push({ xiaoXi })
}

console.log('【硬问号（？/?）—— 只认句尾成句的疑问，最硬的信号】\n')
tongJi(zhenRen, '真人', duiHua)
tongJi(ai, 'AI  ', duiHua)

console.log('\n【宽口径（含「怎么/为什么/吗/呢」）—— 更接近真人说话习惯】\n')
tongJi(zhenRen, '真人', shiWen)
tongJi(ai, 'AI  ', shiWen)

console.log('\n【读法】')
console.log('若 AI 的「落在最后一条」比例远高于真人，说明多条输出是**一次生成、切分成条**的，')
console.log('于是模型必然把疑问放在末尾收尾 —— 真人不会这样，因为真人是发一条算一条。')