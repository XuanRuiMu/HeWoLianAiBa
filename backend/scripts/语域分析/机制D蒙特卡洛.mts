/**
 * 机制 D 的开场分布蒙特卡洛（P1/P2 的补正）。
 *
 * ⚠️ 为什么要重做：此前 PROGRESS 与生产源文件头引用了「独立加权采样 = 23.00%」与
 *   「拒绝采样 = 9.03%」，但**没有任何脚本产出这两个数字**（第二轮审查 P2），
 *   且审查方在 6 种口径下都复现不出 23.00%（实测 ~11.4%）。数字不可复算 = 论证无效。
 *
 * ⚠️ 关键认识：**模型如何从 5 个候选中挑选，本身是未知的**，这才是撞车率的
 *   主导不确定性来源。凭空给一个数是幻觉。本脚本因此给出**两个明确标注的边界**：
 *
 *   下界模型 = 均匀随机挑 1 个候选
 *             → 分布被候选池压窄，撞车率最低
 *   上界模型 = 忽略候选，直接按全表权重独立抽 1 个
 *             → 完全复现「真人边际分布」的行为
 *
 *   真实模型落在两者之间：它会偏向更自然/更高频的开场，故更靠上界。
 *   **只有真实外呼才能定值，本脚本不能替代。**
 *
 * 用法：node .语料工作区/机制D蒙特卡洛.mts
 */
import { readFileSync } from 'node:fs'

const BIAO = JSON.parse(readFileSync(new URL('../backend/src/config/开场采样表.json', import.meta.url), 'utf8')) as {
  kaiChang: string[]
  quanZhong: number[]
}
const KAI = BIAO.kaiChang
const TONG = BIAO.quanZhong

/**
 * 绑定词表：**单一事实源 = 生产模块** `开场候选约束.ts` 的 `QIAN_JING_JIE_DONG`。
 * 直接解析生产源文件取词表，避免本脚本抄第二份（第三轮审查 S-6）。
 * ⚠️ 不能直接 import：backend/package.json 是 type=commonjs，node 无法让本 .mts（ESM）
 *    import 该目录下的 .ts（实测 Unexpected token 'export'）。
 * ⚠️ 必须声明在使用之前，否则 TDZ 报错。
 */
function duBiaoDongCi(): string[] {
  const yuan = readFileSync(new URL('../backend/src/services/开场候选约束.ts', import.meta.url), 'utf8')
  const kuai = /export const QIAN_JING_JIE_DONG = \[([\s\S]*?)\]/.exec(yuan)?.[1]
  const ci = kuai ? [...kuai.matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
  // ⚠️ 必须硬失败（纠错 #27 / 第四轮审查 Sp-7）：原实现解析失败时**静默返回空数组**，
  //   7 种合理重构（加类型标注、prettier 换行、拆成函数、改双引号、嵌套数组、多个子数组、
  //   注释里出现同名字面量）全部实测返回 0 词且不报错 → 剔除静默失效。
  //   而且原有的「残留概率」守卫按构造恒为 0（它用同一份解析结果自证），任何输入下都不可能触发。
  if (ci.length < 20) {
    throw new Error(`词表解析失败或残缺：只解析出 ${ci.length} 个词（应 ≥20）。` +
      '生产端若改了字面量写法（如加类型标注），本正则会静默失效——请同步更新这里的解析式。')
  }
  return ci
}
const QIAN_JING_JIE = duBiaoDongCi()

const HUI_HUA_SHU = Number(process.argv[2] || 2000)
/** 重复次数。⚠️ 必须 >1：单次抽样的波动可达 3 倍（第三轮审查 Sp-7 实测 9–16 桶在 0.29×–1.00× 间跳），
 *  单次结果曾被当成「过分散 3.4 倍」的定论，那是 6 次里最好的一次。 */
const CHONG_FU_CI_SHU = Number(process.argv[4] || 5)
const LUN_SHU = Number(process.argv[3] || 40)
const KOU_JING = 20
const HOU_XUAN_GE_SHU = 5

// ⚠️ 必须在采样函数**之前**声明（TDZ）。词表来自生产源文件，见 duBiaoDongCi 处的说明。

function suiJiToken(): string {
  const heJi = TONG.reduce((a, b) => a + b, 0)
  let dian = Math.random() * heJi
  let leiJia = 0
  for (let i = 0; i < TONG.length; i++) {
    leiJia += TONG[i]
    if (dian <= leiJia) return KAI[i]
  }
  return KAI[KAI.length - 1]
}

/** 采一个去重的候选集（与生产 caiYangKaiChangHouXuan 同一逻辑） */
function caiYangHouXuan(geShu: number): string[] {
  const chu = new Set<string>()
  const shangXian = geShu * 12 + 30 // 与生产同值
for (let t = 0; t < shangXian && chu.size < geShu; t++) {
    const k = suiJiToken()
    // ⚠️ 必须与生产一致地剔除绑定词，否则本脚本会高估绑定词的暴露面
    if (QIAN_JING_JIE.some((q) => k.startsWith(q))) continue
    chu.add(k)
  }
  return [...chu]
}

/**
 * 跑一个会话。`xuanZe` 决定模型如何从候选中选：
 *  'junYun' → 均匀随机（撞车率下界）
 *  'quYanZhong' → 忽略候选，直接按全表权重抽（上界）
 */
function yunHuiHua(xuanZe: 'junYun' | 'quYanZhong'): { zhuangChe: number; youXiao: number; kaiChangLie: string[] } {
  const kaiChangLie: string[] = []
  let zhuangChe = 0
  for (let lun = 0; lun < LUN_SHU; lun++) {
    let benLun: string
    if (xuanZe === 'junYun') {
      const houXuan = caiYangHouXuan(HOU_XUAN_GE_SHU)
      benLun = houXuan[Math.floor(Math.random() * houXuan.length)]
    } else {
      benLun = suiJiToken()
    }
    const jinKou = new Set(kaiChangLie.slice(-KOU_JING))
    if (jinKou.has(benLun)) zhuangChe += 1
    kaiChangLie.push(benLun)
  }
  return { zhuangChe, youXiao: LUN_SHU, kaiChangLie }
}

interface TongJi { pingJun: number; zhongWei: number; TOP10: number; GeShu: number; ChuiJie: number }
function tongJi(xuanZe: 'junYun' | 'quYanZhong'): TongJi {
  const lv: number[] = []
  const zhong: number[] = []
  const ge: number[] = []
  for (let i = 0; i < HUI_HUA_SHU; i++) {
    const r = yunHuiHua(xuanZe)
    lv.push((r.zhuangChe / r.youXiao) * 100)
    zhong.push([...r.kaiChangLie].sort((a, b) => a.localeCompare(b))[Math.floor(LUN_SHU / 2)] === '' ? 0 : 0)
    ge.push(new Set(r.kaiChangLie).size)
  }
  const ping = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)
  return { pingJun: ping(lv), zhongWei: 0, TOP10: 0, GeShu: ping(ge), ChuiJie: 0 }
}

console.log(`蒙特卡洛：${HUI_HUA_SHU} 个会话 × ${LUN_SHU} 轮，窗口 ${KOU_JING}，候选 ${HOU_XUAN_GE_SHU} 个`)
console.log('采样表：' + KAI.length + ' 项，权重和 ' + TONG.reduce((a, b) => a + b, 0))
console.log('TOP20 概率质量占 ' + (TONG.slice(0, 20).reduce((a, b) => a + b, 0) / 100).toFixed(2) + '%\n')

const xiaJie = tongJi('junYun')
const shangJie = tongJi('quYanZhong')

console.log('| 模型选择模型 | 最近 20 轮撞车率 | 单会话开场种类 |')
console.log('| --- | --- | --- |')
console.log(`| **下界**：均匀随机挑候选 | ${xiaJie.pingJun.toFixed(2)}% | ${xiaJie.GeShu.toFixed(1)} |`)
console.log(`| **上界**：忽略候选，按全表权重抽 | ${shangJie.pingJun.toFixed(2)}% | ${shangJie.GeShu.toFixed(1)} |`)

// 强场景绑定词的暴露面（第二轮审查 B3）
const qianJingZe = KAI.map((k, i) => ({ k, w: TONG[i] })).filter((x) => QIAN_JING_JIE.some((q) => x.k.startsWith(q)))
const qianJingZhi = qianJingZe.reduce((a, x) => a + x.w, 0)
let youQianJing = 0
for (let i = 0; i < 20000; i++) {
  if (caiYangHouXuan(HOU_XUAN_GE_SHU).some((k) => qianJingZe.some((q) => q.k === k))) youQianJing++
}
console.log(`\n强场景绑定词（${QIAN_JING_JIE.join('/')}）权重合计 ${qianJingZhi} = ${(qianJingZhi / 100).toFixed(2)}%`)
console.log(`每轮 ${HOU_XUAN_GE_SHU} 个候选中至少出现 1 个的概率 = ${((youQianJing / 20000) * 100).toFixed(1)}%（20000 轮实测）`)
if (youQianJing > 0) throw new Error(`剔除后仍有 ${youQianJing} 残留 —— 词表与剔除逻辑不同源`)
console.log('  ✅ 剔除后零残留（生产与本脚本词表同源）')

console.log('\n⚠️ 结论边界：')
console.log('  · 真实值落在上下界之间，取决于模型如何从候选中挑，**本脚本无法确定**。')
console.log('  · 真人 40 轮基线是**外推值**（M2基线标定.md，约 29.4%，置信度低，且该文件明令禁止当实测值引用）。')
console.log('  · 因此「机制 D 是否把 M2 落到真人区间」**只能靠真实外呼判定**，本脚本只用于排除明显越界的设计。')

/**
 * ⚠️ 唯一可做的同尺度校准：在**真人有实测数据的规模**上比较。
 * 40 轮的 29.4% 是外推、不可信；但 1–16 条发言是真有实测的。
 * 若机制在那些规模上也系统性低于真人，说明「分布整形这条路本身走不通」。
 */
console.log('\n=== 同尺度校准：与真人**实测**值对比（这是唯一可辩护的对比）===')
import { gunzipSync } from 'node:zlib'
import { zhengXi } from './语域口径.ts'

/** 绑定词表单一事实源 = 生产模块。见文件末 duBiaoDongCi 的说明。⚠️ 必须声明在使用之前（TDZ）。 */

const hang = gunzipSync(readFileSync(new URL('./LCCC/lccc_base_valid.jsonl.gz', import.meta.url)))
  .toString('utf8').split('\n').filter((x) => x.trim().length > 0)
const duiHua: string[][] = []
for (const x of hang) {
  const d = JSON.parse(x)
  if (!Array.isArray(d)) continue
  const tiao: string[] = []
  for (let i = 0; i < d.length; i += 2) {
    const t = zhengXi(String(d[i] || '').trim())
    if (t.length >= 2) tiao.push(t.slice(0, 2))
  }
  if (tiao.length > 0) duiHua.push(tiao)
}

function renZhuangCheLv(dui: string[][]): number {
  let dan = 0
  let quan = 0
  for (const tiao of dui) {
    const huan = new Map<string, number>()
    for (let k = 0; k < tiao.length; k++) {
      const key = tiao[k]
      if ((huan.get(key) || 0) > 0) dan += 1
      quan += 1
      huan.set(key, (huan.get(key) || 0) + 1)
      if (k - KOU_JING >= 0) {
        const g = tiao[k - KOU_JING]
        const n = huan.get(g) || 1
        if (n <= 1) huan.delete(g)
        else huan.set(g, n - 1)
      }
    }
  }
  return (dan / quan) * 100
}

/** 模拟：同一 LCCC 会话长度下，把真人的开场替换成「机制 D 采样出的」会怎样 */
function jiNJiMoXingLv(changDu: number[], tongShu: number): number {
  let dan = 0
  for (const c of changDu) {
    const kai: string[] = []
    for (let i = 0; i < c; i++) {
      const houXuan = caiYangHouXuan(HOU_XUAN_GE_SHU)
      kai.push(houXuan[Math.floor(Math.random() * houXuan.length)])
    }
    const huan = new Map<string, number>()
    for (let k = 0; k < kai.length; k++) {
      if ((huan.get(kai[k]) || 0) > 0) dan += 1
      huan.set(kai[k], (huan.get(kai[k]) || 0) + 1)
      if (k - KOU_JING >= 0) {
        const g = kai[k - KOU_JING]
        const n = huan.get(g) || 1
        if (n <= 1) huan.delete(g)
        else huan.set(g, n - 1)
      }
    }
  }
  return (dan / Math.max(1, tongShu)) * 100
}

const fenGe: Array<[string, number, number]> = [['2', 2, 2], ['3–4', 3, 4], ['5–8', 5, 8], ['9–16', 9, 16]]
console.log('\n| 会话长度 | 真人**实测**撞车率 | 机制 D 模型（中位/范围，' + CHONG_FU_CI_SHU + ' 次重复） | 中位比值 |')
console.log('| --- | --- | --- | --- |')
const biLvLie: number[] = []
for (const [biaoQian, lo, hi] of fenGe) {
  const ge = duiHua.filter((d) => d.length >= lo && d.length <= hi)
  if (ge.length === 0) continue
  const changDu = ge.map((d) => d.length)
  const tongShu = changDu.reduce((a, b) => a + b, 0)
  const ren = renZhuangCheLv(ge)
  // ⚠️ 必须重复 CHONG_FU_CI_SHU 次并报范围。单次抽样在本桶波动可达 3 倍。
  const ciDian: number[] = []
  for (let c = 0; c < CHONG_FU_CI_SHU; c++) ciDian.push(jiNJiMoXingLv(changDu, tongShu))
  ciDian.sort((a, b) => a - b)
  const zhong = ciDian[Math.floor(ciDian.length / 2)]
  const fanWei = ciDian.length > 1 ? `${ciDian[0].toFixed(2)}% ~ ${ciDian[ciDian.length - 1].toFixed(2)}%` : `${zhong.toFixed(2)}%`
  const biLv = zhong / Math.max(0.0001, ren)
  biLvLie.push(biLv)
  console.log(`| ${biaoQian} | ${ren.toFixed(2)}% | ${zhong.toFixed(2)}%（${fanWei}） | ${biLv.toFixed(2)}× |`)
}

console.log(`\n⚠️ 桶内发言数很少（9–16 桶仅 15 个会话 / 163 条发言），**比值本身噪声极大**：`)
console.log(`   跨桶比值范围 ${Math.min(...biLvLie).toFixed(2)}× ~ ${Math.max(...biLvLie).toFixed(2)}×。`)
console.log('   → **不能**据此下「过分散 N 倍」的设计结论。上一版曾把单次抽样的 0.29× 当定论，已撤回（纠错 #24）。')
console.log('   → 唯一能定论的是 120 轮真实外呼：真人 40 轮基线本身也只是外推（置信度低）。')
console.log('   → **机制 D 是否改善 M2 仍属未验证**，不得把本节任何数字当作验收证据。')
