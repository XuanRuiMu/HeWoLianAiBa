/**
 * M2 基线标定（修正版）。
 *
 * 纠错 #20：上一版用「第 k 条撞前 k−1 条任意一条」的**累积**度量做对数外推，
 * 得出 40 轮 179.6% —— **超过 100%，度量本身错了**。
 * 累积度量随会话长度无界增长，不是可标定的目标。
 *
 * 正确度量：**滑动窗口**「最近 KOU_JING 条内是否撞过」——有界，且与 AI 侧口径一致
 * （AI 的「最近 20 轮窗口」本质就是滑动窗口）。
 *
 * 另附 **i.i.d. 随机模型上界**作为合理性校验：
 * 若真人纯随机选词（不主动回避），P(某条撞最近 19 条) = 1−(1−p)^19；
 * 真人实测必然 ≤ 该上界，若外推值超过上界则外推失效。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { zhengXi } from './语域口径.ts'

const ZI_SHU = 2
const KOU_JING = 20

const hang = gunzipSync(readFileSync(new URL('./LCCC/lccc_base_valid.jsonl.gz', import.meta.url)))
  .toString('utf8').split('\n').filter((x) => x.trim().length > 0)

const duiHua: string[][] = []
for (const x of hang) {
  const d = JSON.parse(x)
  if (!Array.isArray(d)) continue
  const tiao: string[] = []
  for (let i = 0; i < d.length; i += 2) {
    const t = zhengXi(String(d[i] || '').trim())
    if (t.length >= ZI_SHU) tiao.push(t.slice(0, ZI_SHU))
  }
  if (tiao.length > 0) duiHua.push(tiao)
}

/** 滑动窗口撞车率：第 k 条是否撞最近 min(KOU_JING, k−1) 条 */
function huanCheLv(tiao: string[]): { dan: number; quan: number } {
  const huan = new Map<string, number>()
  let dan = 0
  for (let k = 0; k < tiao.length; k++) {
    const key = tiao[k]
    const zai = huan.get(key) || 0
    if (zai > 0) dan += 1
    huan.set(key, zai + 1)
    // 只保留最近 KOU_JING 条
    if (k - KOU_JING >= 0) {
      const guoQi = tiao[k - KOU_JING]
      const xianZai = huan.get(guoQi) || 1
      if (xianZai <= 1) huan.delete(guoQi)
      else huan.set(guoQi, xianZai - 1)
    }
  }
  return { dan, quan: tiao.length }
}

// ── 按会话长度分桶 ──
const fenGe: Array<[string, number, number]> = [['1', 1, 1], ['2', 2, 2], ['3–4', 3, 4], ['5–8', 5, 8], ['9–16', 9, 16]]
const dian: Array<{ biaoQian: string; lu: number; lv: number; n: number }> = []
console.log('| 会话长度 | 线程数 | 消息数 | 滑动窗口撞车率 |')
console.log('| --- | --- | --- | --- |')
for (const [biaoQian, lo, hi] of fenGe) {
  const ge = duiHua.filter((d) => d.length >= lo && d.length <= hi)
  if (ge.length === 0) continue
  let dan = 0
  let quan = 0
  for (const d of ge) {
    const r = huanCheLv(d)
    dan += r.dan
    quan += r.quan
  }
  const lv = (dan / quan) * 100
  dian.push({ biaoQian, lu: ge[0].length, lv, n: ge.length })
  console.log(`| ${biaoQian} | ${ge.length} | ${quan} | ${lv.toFixed(2)}% |`)
}

// ── 对数拟合（滑动窗口度量）→ 外推 ──
const youYong = dian.filter((x) => x.lv > 0 && x.lu >= 2)
const xs = youYong.map((x) => Math.log2(x.lu))
const ys = youYong.map((x) => Math.log(x.lv))
const n2 = xs.length
const mx = xs.reduce((a, b) => a + b, 0) / n2
const my = ys.reduce((a, b) => a + b, 0) / n2
const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)
const jie = my - slope * mx
const waiZhui = (k: number) => Math.exp(jie + slope * Math.log2(k))

// ── i.i.d. 随机模型上界（合理性校验）──
const ciShu = new Map<string, number>()
let zong = 0
for (const d of duiHua) for (const t of d) { ciShu.set(t, (ciShu.get(t) || 0) + 1); zong++ }
const iidShangXian = [...ciShu.values()].reduce((a, n) => {
  const p = n / zong
  return a + p * (1 - Math.pow(1 - p, KOU_JING - 1))
}, 0) * 100

console.log(`\n对数拟合：ln(率) = ${jie.toFixed(3)} + ${slope.toFixed(3)}·log2(k)（n=${n2}）`)
console.log(`  会话长度每翻倍，撞车率 ×${Math.pow(2, slope).toFixed(2)}`)
console.log(`  i.i.d. 随机模型上界（同 KOU_JING=${KOU_JING}）= ${iidShangXian.toFixed(1)}%  ← 外推不得超过此值`)
const canShu = xs.reduce((a, x, i) => a + (ys[i] - (jie + slope * x)) ** 2, 0)
const sd = Math.sqrt(canShu / Math.max(1, n2 - 2))
const kuan = Math.exp(sd * 1.96)

// ⚠️ 长度轴单位（第四轮审查 Sp-5c）：k 是**单侧发言条数**（LCCC 每段说话人 A 平均 1.568 条）。
//    AI 的「轮数」不能直接当 k 用——AI 40 轮 ≈ 单侧 40 条（每轮 1 条），但真人 1.568 条/轮。
//    故下表同时给出「单侧发言条数」与「按 1.568 条/轮折算的轮数」，避免量纲混用。
const ZHEN_REN_ZHOU_YU = 1.568
const waiZhuiBiao = [20, 40, 63, 80, 120, 200].map((k) => ({ k, v: waiZhui(k) }))
console.log('\n| 单侧发言条数 k | 折算轮数(k/1.568) | 外推撞车率 | 95% 带宽 |')
console.log('| --- | --- | --- | --- |')
for (const { k, v } of waiZhuiBiao) {
  // ⚠️ 纠错 #25：v 已是百分数。原式 `(v * kuan) / 100` 又除了一次 100，**上界错 100 倍**。
  const xia = Math.max(0, v / kuan)
  const shang = Math.min(100, v * kuan)
  // ⚠️ 撞车率是比率，>100% 物理不可能。原脚本只对带宽做 min(100)，中心值越界静默输出。
  const vBiao = v > 100 ? '**>100%（外推已越界，不可用）**' : `${v.toFixed(1)}%`
  const vBiaoXi = v > 100 ? '—' : `${xia.toFixed(1)}% ~ ${shang.toFixed(1)}%`
  console.log(`| ${k} | ${(k / ZHEN_REN_ZHOU_YU).toFixed(0)} | ${vBiao} | ${vBiaoXi} |`)
}
const v40 = waiZhui(40)
// ⚠️ 纠错 #21：i.i.d. **不是上界**。实测 9–16 桶 8.59% 已高于 i.i.d. 的 2.2%，
// 说明真人因会话结构相关性（问候轮反复「你好」）比随机重复更多。故外推无法靠 i.i.d. 证伪。
const renChaGuoIid = dian[dian.length - 1].lv > iidShangXian
console.log(`\n⚠️ 纠错 #21：真人 9–16 桶 ${dian[dian.length - 1].lv.toFixed(2)}% ${renChaGuoIid ? '高于' : '低于'} i.i.d. 随机值 ${iidShangXian.toFixed(2)}%`)
console.log(`  → i.i.d. **不是上界**，外推无法被它证伪。40 轮外推 ${v40.toFixed(1)}% 仅为工程参考，置信度低。`)

const baoGao = [
  '# M2 判据基线（可标定版 v2，2026-10-02）',
  '',
  '## 度量选择（纠错 #20）',
  '',
  '第一版用「第 k 条撞前 k−1 条任意一条」的**累积**度量外推，得出 40 轮 179.6%。',
  '**该值超过 100% → 度量本身错了**：累积量随会话长度无界增长，不是可标定的目标。',
  '',
  '本版改用**滑动窗口**：「第 k 条是否撞最近 20 条内」。该度量有上界，且与 AI 侧口径一致。',
  '',
  '## 替代语料源已逐一否决',
  '',
  '| 语料 | 可用性 | 原因 |',
  '| --- | --- | --- |',
  '| NUS-SMS（中文短信 31,465 条） | ❌ | XML **无 `threadid`**，只能按 `srcNumber` 聚合、还原不出对话边界；文本为**繁体粤语**（"老師,媽咪話想買盒月餅比你,你要傳統定冰皮?"），与大陆简体 IM 领域不符 |',
  '| LSICC（豆瓣读书） | ❌ | 书评/讨论片段，无连续对话结构 |',
  '| PchatbotW | ❌ | post/response 配对，无多轮结构 |',
  '| **LCCC** | **✅ 唯一可用** | 有真实多轮结构，但**最长仅 14 条发言**，40 轮处无实测 |',
  '',
  '## 实测：滑动窗口撞车率 vs 会话长度',
  '',
  '| 会话长度（发言数） | 线程数 | 消息数 | 撞车率 |',
  '| --- | --- | --- | --- |',
  ...dian.map((x) => `| ${x.biaoQian} | ${x.n} | — | ${x.lv.toFixed(2)}% |`),
  '',
  '单调上升：0% → 0.7% → 1.6% → 2.6% → 8.6%。',
  '',
  '## 外推（**外推值，非实测**）',
  '',
  `- 对数拟合 \`ln(率) = ${jie.toFixed(3)} + ${slope.toFixed(3)}·log2(k)\`，n=${n2}`,
  `- 会话长度每翻倍，撞车率 ×**${Math.pow(2, slope).toFixed(2)}**`,
  `- 残差 sd(ln)=${sd.toFixed(3)} → 95% 带宽 ±×**${kuan.toFixed(2)}**`,
`- **i.i.d. 随机参考值 = ${iidShangXian.toFixed(1)}%**（纯随机选词时的撞车率；**不是上界**，见纠错 #21）`,
  '',
  '| 单侧发言条数 k | 折算轮数(k/1.568) | 外推撞车率 | 95% 带宽 |',
  '| --- | --- | --- | --- |',
  ...waiZhuiBiao.map(({ k, v }) =>
    `| ${k} | ${(k / ZHEN_REN_ZHOU_YU).toFixed(0)} | ` +
    `${v > 100 ? '**>100%（外推已越界，不可用）**' : `${v.toFixed(1)}%`} | ` +
    `${v > 100 ? '—' : `${Math.max(0, v / kuan).toFixed(1)}% ~ ${Math.min(100, v * kuan).toFixed(1)}%`} |`),
  '',
  '## 🚨 外推的有效范围（第四轮审查 Sp-5b）',
  '',
  `- **撞车率是比率，>100% 物理不可能。**本公式在 k≈${waiZhuiBiao.find((x) => x.v > 100)?.k ?? '—'} 条单侧发言后越界。`,
  '  即：**所有 >100% 的行都不可用**，不得引用。',
  `- 但实测计划是 3 场景 × 120 轮（AI 侧每轮 1 条首条发言 ≈ 单侧 120 条），**落在越界区内**。`,
  '  → **外推无法覆盖实测规模**。M2 在该规模上的判据缺少可辩护基线，必须改用',
  '    「与 AI 无约束基线（73.65%）的相对改善」+「护栏（G1/G3/G5/G6 不恶化）」双条件判定。',
  '',
  '## 判据结论',
  '',
  `- **M2 = ≤25%**（**工程目标，非实测基线**）。依据三部分：实测趋势（至 16 条发言）+ 对数外推（k=40 时 ${waiZhui(40).toFixed(1)}%，⚠️ 该轴单位是**单侧发言条数**，不是轮数）+ i.i.d. 随机参考 ${iidShangXian.toFixed(1)}%。`,
  '- 置信度：**低**。趋势由 4 个实测桶单调支撑，但 9–16 桶仅 **15 个线程**，',
  `  且长会话处**完全无实测数据**，95% 带宽 ${(waiZhui(40) / kuan).toFixed(1)}%–${Math.min(100, waiZhui(40) * kuan).toFixed(1)}% 很宽。`,
  `- ⚠️ **纠错 #25：95% 带宽曾错 100 倍**（v 已是百分数，公式又除了一次 100），且外推 >100% 曾被静默输出。已修。`,
  `- ⚠️ **纠错 #21：i.i.d. 不是上界**。真人 9–16 桶 ${dian[dian.length - 1].lv.toFixed(2)}% **高于** i.i.d. 随机值 ${iidShangXian.toFixed(1)}%，`,
  '  说明真人因会话结构相关性比随机重复更多（问候轮反复「你好」）。外推无法被 i.i.d. 证伪。',
  '- **禁止把外推值当实测值引用。**',
  '- 所有 A/B **必须同时报告实测的会话长度分布**，否则不同臂的 M2 不可比。',
  '',
].join('\n')

writeFileSync(new URL('./M2基线标定.md', import.meta.url), baoGao, 'utf8')
console.log('\n已写入 .语料工作区/M2基线标定.md')