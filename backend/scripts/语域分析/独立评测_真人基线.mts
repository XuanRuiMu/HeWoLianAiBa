/**
 * 独立评测 · 第 1 步：建立**中文真人基线**（外部裁判）
 *
 * 本脚本不调用任何模型，只从 LCCC 原始语料算出真人的对话形态分布。
 * 后续 AI 输出的对照基准全部来自这里 —— 不是从 AI 输出反推标准。
 *
 * ⚠️ LCCC 是 **jieba 分词**后带空格的文本（"我 好 爱 虾"），算字数必须先去空格，
 *    否则每个字之间都算一个"词"，分布会被严重压扁。
 */
import { gunzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)
const ZHE = dirname(fileURLToPath(import.meta.url))
/**
 * ⚠️ 语料走**仓库根**的权威副本，与 `生成风格示例表.mts` 等全部既有脚本同源（`gen()`）。
 *
 * 踩坑记录（第十九轮）：本脚本原先读 `join(ZHE, 'LCCC', ...)`（脚本目录内的副本），
 * 而同目录其它脚本读 `gen('.语料工作区/...')`（仓库根）。仓库里有**两个** `.语料工作区`：
 *   · `和我恋爱吧/.语料工作区/`       ← 权威，10,699 个文件、6 套语料
 *   · `backend/.语料工作区/`          ← 空目录（看错这个会误判「语料丢失」）
 * 两套路径并存 ⇒ 换语料时会**静默读到不同版本**。现统一到 `gen()`，脚本目录不再留副本。
 */
const GZ = gen('.语料工作区/lccc_base_valid.jsonl.gz')
void join

/** 去 jieba 分词空格，保留原始标点 */
function quFenCi(wen: string): string {
  return wen.replace(/\s+/g, '')
}

/** backchannel：中文里对应英文 uh-huh / okay 的「协调信号」 */
const BEI_CHANNEL = ['嗯', '哦', '噢', '喔', '啊', '唉', '呃', '唔', '欸', '诶', '咯', '哈', '呵', '嘿', '唔']
/** 颜文字 / 表情 */
const QING_MAO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
/** 微博表情 [微笑] */
const WEIBO_BIAO_QING = /[\[\(（【][^\]\)）】]{1,6}[\]\)）】]/
/** 语气词（句中/句尾） */
const YU_QI_CI = /(啊|呀|吧|呢|哦|嘛|咯|啦|嘞|哈|呵|嘿|呜|嗷|嗯)/g

type TongJi = { n: number; zhi: number[]; pingJun: number; zhongWeiShu: number; biaoZhunCha: number; p10: number; p25: number; p50: number; p75: number; p90: number }

function tongJi(duanDian: number[]): TongJi {
  const s = [...duanDian].sort((a, b) => a - b)
  const n = s.length
  const zhi = (fenShu: number) => s[Math.min(n - 1, Math.floor(fenShu * n))]
  const pingJun = s.reduce((a, b) => a + b, 0) / n
  const zhongWeiShu = s[Math.floor(n / 2)]
  return {
    n,
    zhi,
    pingJun,
    zhongWeiShu,
    biaoZhunCha: Math.sqrt(s.reduce((a, b) => a + (b - pingJun) ** 2, 0) / n),
    p10: zhi(0.1),
    p25: zhi(0.25),
    p50: zhi(0.5),
    p75: zhi(0.75),
    p90: zhi(0.9),
  }
}

function xianShu(t: TongJi): string {
  return `n=${t.n}  均值=${t.pingJun.toFixed(1)}  SD=${t.biaoZhunCha.toFixed(1)}  P10/25/50/75/90=${t.p10}/${t.p25}/${t.p50}/${t.p75}/${t.p90}  中位=${t.zhongWeiShu}`
}

const raw = gunzipSync(readFileSync(GZ)).toString('utf8')
const duan = raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as string[])

console.log('='.repeat(78))
console.log(`LCCC valid：${duan.length} 段`)
console.log('='.repeat(78))

// ── 1. 每段消息条数（轮长）────────────────────────────────────────
const tiaoShuLie = duan.map((d) => d.length)
const tiaoShuTongJi = tongJi(tiaoShuLie)
console.log('\n【1】每段消息条数（真人轮长）')
console.log('  ' + xianShu(tiaoShuTongJi))
const tiaoShuFenBu: Record<string, number> = {}
for (const t of tiaoShuLie) tiaoShuFenBu[t] = (tiaoShuFenBu[t] || 0) + 1
console.log('  分布(条:段数): ' + Object.entries(tiaoShuFenBu).sort((a, b) => +a[0] - +b[0]).slice(0, 12).map(([k, v]) => `${k}:${v}(${((v / duan.length) * 100).toFixed(1)}%)`).join('  '))

// ── 2. 单条消息字数 ─────────────────────────────────────────────
const tiaoWen: string[] = []
for (const d of duan) for (const xiaoXi of d) tiaoWen.push(quFenCi(xiaoXi))
const ziShuTongJi = tongJi(tiaoWen.map((w) => w.length))
console.log('\n【2】单条消息字数（已去 jieba 空格）')
console.log('  ' + xianShu(ziShuTongJi))
console.log(`  ≤4字占比 = ${((tiaoWen.filter((w) => w.length <= 4).length / tiaoWen.length) * 100).toFixed(1)}%   ≥30字占比 = ${((tiaoWen.filter((w) => w.length >= 30).length / tiaoWen.length) * 100).toFixed(1)}%`)

// ── 3. 提问率 ───────────────────────────────────────────────────
const wenHaoTiao = tiaoWen.filter((w) => /[?？]/.test(w)).length
console.log('\n【3】提问率（含 ?/？ 的消息占比）')
console.log(`  ${wenHaoTiao} / ${tiaoWen.length} = ${((wenHaoTiao / tiaoWen.length) * 100).toFixed(1)}%`)
console.log(`  以 ?/？ 结尾的消息 = ${((tiaoWen.filter((w) => /[?？]\s*$/.test(w)).length / tiaoWen.length) * 100).toFixed(1)}%`)

// ── 4. backchannel（协调信号）─────────────────────────────────────
const duanBack = tiaoWen.filter((w) => {
  const j = quFenCi(w)
  return j.length <= 4 && BEI_CHANNEL.some((b) => j.startsWith(b))
}).length
console.log('\n【4】backchannel 率（≤4字、以语气/应答词开头）')
console.log(`  ${duanBack} / ${tiaoWen.length} = ${((duanBack / tiaoWen.length) * 100).toFixed(1)}%`)

// ── 5. 表情 / 颜文字 ────────────────────────────────────────────
const qingMao = tiaoWen.filter((w) => QING_MAO.test(w)).length
const weiboBiao = tiaoWen.filter((w) => WEIBO_BIAO_QING.test(w)).length
console.log('\n【5】表情符号率')
console.log(`  Unicode 表情/颜文字 = ${((qingMao / tiaoWen.length) * 100).toFixed(2)}%`)
console.log(`  微博表情 [xxx]      = ${((weiboBiao / tiaoWen.length) * 100).toFixed(2)}%`)
console.log(`  两者合计            = ${(((qingMao + weiboBiao) / tiaoWen.length) * 100).toFixed(2)}%`)

// ── 6. 人称 ─────────────────────────────────────────────────────
const wo = tiaoWen.filter((w) => w.includes('我')).length
const ni = tiaoWen.filter((w) => w.includes('你')).length
const ta = tiaoWen.filter((w) => w.includes('他') || w.includes('她')).length
console.log('\n【6】人称出现率')
console.log(`  含「我」= ${((wo / tiaoWen.length) * 100).toFixed(1)}%   含「你」= ${((ni / tiaoWen.length) * 100).toFixed(1)}%   含「他/她」= ${((ta / tiaoWen.length) * 100).toFixed(1)}%`)

// ── 7. 语气词密度（每百字）───────────────────────────────────────
const zongZi = tiaoWen.reduce((a, w) => a + w.length, 0)
let yuQiCiShu = 0
for (const w of tiaoWen) yuQiCiShu += (w.match(YU_QI_CI) || []).length
console.log('\n【7】语气词密度')
console.log(`  每百字 = ${((yuQiCiShu / zongZi) * 100).toFixed(2)} 个`)

// ── 8. 感叹号 / 省略号 ──────────────────────────────────────────
const sheng = tiaoWen.filter((w) => /[!！]/.test(w)).length
const shengMo = tiaoWen.filter((w) => /\.\.\.|…/.test(w)).length
console.log('\n【8】标点情绪强度')
console.log(`  含 !/！ = ${((sheng / tiaoWen.length) * 100).toFixed(1)}%   含 .../… = ${((shengMo / tiaoWen.length) * 100).toFixed(1)}%`)

console.log('\n' + '='.repeat(78))
// ⚠️ 原第 9 项「角色交替率」已删（第十九轮，审查抓出）：
//   谓词 `new Set(d.map((_, i) => i % 2)).size === 2` 在 `length >= 2` 时**恒为 true**，
//   于是分子＝全部 ≥4 条段、分母＝全部 ≥6 条段 —— 分子分母是**包含关系**，
//   必然 >100%（实测 390.8%）。而它紧跟在「以上全部是真人实测分布，作为对照基准」后面，
//   会被当真值引用。
//   ⇒ 直接删而非修：它测的是 LCCC 数组的构造约定（说话人按数组顺序排），
//     不是真人的对话行为，对「像不像真人」零信息量。
console.log('以上全部为真人实测分布，作为 AI 输出的对照基准。')
console.log('='.repeat(78))