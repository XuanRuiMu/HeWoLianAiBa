/**
 * PROGRESS 定稿自检：把文档里的关键数字与落盘原始数据逐项对齐。
 * 目的：防止我在文档里写错任何数字（11 次纠错里多次是数字/口径错）。
 */
import { readFileSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { zhengXi, YU_QI_CI, danTiao } from './语域口径.ts'

let tongGuo = 0
let shiBai = 0
// ⚠️ 口径文件双副本同步校验：backend/src/测试/*.ts 是权威（可入库），
//    .语料工作区/*.ts 是给 node --experimental-strip-types 用的逐字副本
//    （backend/package.json 是 type=commonjs，ESM 的 .mts 无法 import 该目录下的 .ts）。
//    副本漂移 = 所有实测数字失效，必须硬失败。
for (const ming of ['语域口径', '真人基线常量']) {
  const zheng = readFileSync(new URL('../backend/src/测试/' + ming + '.ts', import.meta.url), 'utf8')
  const fuBen = readFileSync(new URL('./' + ming + '.ts', import.meta.url), 'utf8')
  const marker = '// ===== 权威源副本开始（勿改本行以下）====='
  const zhongFuBen = fuBen.slice(fuBen.indexOf(marker) + marker.length)
  JianCha('口径副本与权威源同步：' + ming, zhongFuBen.trim() === zheng.trim())
}
const wen = readFileSync(new URL('../PROGRESS-模拟真人聊天.md', import.meta.url), 'utf8')

function duiCha(ming: string, wenBen: string, shiJi: number, piRong = 0.01): void {
  const zhaoDao = wen.includes(wenBen)
  const tong = Math.abs(shiJi - Number(wenBen.replace(/[^\d.]/g, ''))) <= piRong
  if (zhaoDao && tong) { tongGuo += 1; console.log('  OK   ' + ming + ' = ' + shiJi) }
  else { shiBai += 1; console.log('  FAIL ' + ming + ' 文档写「' + (zhaoDao ? wenBen : '未找到') + '」 实算 ' + shiJi) }
}

console.log('=== 1. 真人基线（从 LCCC 原文重算）===')
const hang = gunzipSync(readFileSync(new URL('./LCCC/lccc_base_valid.jsonl.gz', import.meta.url)))
  .toString('utf8').split('\n').filter((x) => x.trim().length > 0)
const faYan: string[] = []
let duiHuaDui = 0
for (const x of hang) {
  const d = JSON.parse(x)
  if (!Array.isArray(d)) continue
  const tiao = d.filter((t) => typeof t === 'string' && t.trim())
  if (tiao.length === 0) continue
  duiHuaDui += 1
  for (const t of tiao) faYan.push(zhengXi(t.trim()))
}
duiCha('发言条数', '56,917 条', faYan.length)
duiCha('对话段数', '20,000 段', duiHuaDui)

const biao = faYan.map((t) => danTiao(t))
const pingJun = faYan.reduce((a, t) => a + Array.from(t).length, 0) / faYan.length
duiCha('平均字数', '11.85 字', pingJun, 0.02)
const paiXu = [...biao.map((b) => b.ziShu)].sort((a, b) => a - b)
duiCha('中位字数', '| 中位字数 | 9 |', paiXu[Math.floor(paiXu.length / 2)])
duiCha('≤10 字占比', '58.6%', (biao.filter((b) => b.ziShu <= 10).length / biao.length) * 100, 0.1)
duiCha('单分句且无标点', '50.7%', (biao.filter((b) => b.danFenJuWuBiao).length / biao.length) * 100, 0.1)
duiCha('末尾带标点率', '27.89%', (biao.filter((b) => b.weiMoBiao).length / biao.length) * 100, 0.02)
duiCha('末尾带句号率', '7.10%', (biao.filter((b) => b.jvHao).length / biao.length) * 100, 0.02)
duiCha('语气词密度', '| 语气词密度（剔「哈」） | 0.262 |', biao.reduce((a, b) => a + b.yuQiCi, 0) / biao.length, 0.002)
duiCha('问号率', '10.14%', (faYan.filter((t) => t.includes('?') || t.includes('？')).length / faYan.length) * 100, 0.02)
duiCha('疑问词率', '30.07%', (faYan.filter((t) => /[吗呢吧啊呀嘛么]/.test(t)).length / faYan.length) * 100, 0.02)

const chunBiao = faYan.filter((t) => /^[…\.\s，,。！？!?～~；;：:]+$/.test(t))
duiCha('纯标点整条', '0.0246%', (chunBiao.length / faYan.length) * 100, 0.001)
const yiDian = faYan.filter((t) => t.startsWith('…'))
duiCha('以「…」开头', '0.1212%', (yiDian.length / faYan.length) * 100, 0.001)
const hanHan = faYan.filter((t) => t.includes('…'))
duiCha('含「…」任意位置', '2.73%', (hanHan.length / faYan.length) * 100, 0.02)
duiCha('≤2 字占比', '4.40%', (biao.filter((b) => b.ziShu <= 2).length / biao.length) * 100, 0.02)
duiCha('≤3 字占比', '9.83%', (biao.filter((b) => b.ziShu <= 3).length / biao.length) * 100, 0.02)
{
  const shiJi = new Set(faYan.map((t) => t.slice(0, 2)).filter((k) => k.length === 2)).size
  const zhaoDao = wen.includes('（混池） | 15,772 | 142 |')
  if (zhaoDao && shiJi === 15772) { tongGuo += 1; console.log('  OK   不同前2字 token 数 = ' + shiJi) }
  else { shiBai += 1; console.log('  FAIL 不同前2字 token 数 ' + (zhaoDao ? '串内多数字，duiCha 不适用' : '未找到') + ' 实算 ' + shiJi) }
}
duiCha('每轮条数', '2.85', faYan.length / duiHuaDui, 0.01)

console.log('\n=== 2. AI 实测（从落盘 JSON 重算）===')
for (const [luJing, biaoQian] of [['./out_语域基线.json', '臂A'], ['./out_消融.json', '臂B']] as const) {
  const j = JSON.parse(readFileSync(new URL(luJing, import.meta.url), 'utf8'))
  const tiao = j.suoYouLun.filter((r: any) => r.xiaoXi.length > 0).flatMap((r: any) => r.xiaoXi).map((t: string) => zhengXi(t.trim()))
  const b = tiao.map((t) => danTiao(t))
  const m = new Map<string, number>()
  for (const t of tiao) { const k = t.slice(0, 2); if (k.length < 2) continue; m.set(k, (m.get(k) || 0) + 1) }
  const p = [...m.entries()].sort((a, b2) => b2[1] - a[1])
  const top10 = (p.slice(0, 10).reduce((a, [, c]) => a + c, 0) / tiao.length) * 100
  const kaiTouCiShu = new Set<string>()
  let lunShu = 0
  for (const r of j.suoYouLun.filter((r: any) => r.xiaoXi.length > 0)) {
    kaiTouCiShu.add(zhengXi(r.xiaoXi[0]).slice(0, 2))
    lunShu += 1
  }
  console.log('  [' + biaoQian + '] ' + tiao.length + ' 条 / ' + lunShu + ' 轮 | 平均 ' + (tiao.reduce((a, t) => a + Array.from(t).length, 0) / tiao.length).toFixed(2) + ' 字 | TOP10 ' + top10.toFixed(2) + '% | token 数 ' + m.size + ' | 含「…」 ' + ((tiao.filter((t) => t.includes('…')).length / tiao.length) * 100).toFixed(2) + '% | 轮首开场种类 ' + kaiTouCiShu.size)
}

console.log('\n=== 3. 文档里出现的关键实测数字是否都在文档里 ===')
const BING_XU_ZAI = [
  '95.8%', '0.0%', '+2 token', '1024', '1.63', '2.85', '274×', '9.0×', '34.97%',
  '3.30×', '95.8%（23/24）', '852–1267ms', '94–261ms', '48.72%', '| \*\*前 2 字不同 token 数\*\* | 78 | \*\*105\*\* |', '**16**（58 轮）', '**36**（60 轮）',
  '8 / 9 / 1', '13 / 10 / 19', '1224', '196', '0.0246%', '0.1212%', '73.65%', '106.9×', '12.9×', '0.92×', '131', '2.70', '14.334', '27.52%', 'z=−7.04', 'z=0.13', '13.88', '0.10%',
]
for (const s of BING_XU_ZAI) {
  if (wen.includes(s)) tongGuo += 1
  else { shiBai += 1; console.log('  FAIL 文档缺「' + s + '」') }
}

console.log('\n=== 4. 落盘文件完整性 ===')
const BING_YOU_WEN_JIAN = [
  '语域口径.ts', '算真人基线.ts', '真人基线常量.ts', '真人基线_实测.md',
  'AI语域实测报告.md', '真人开场集中度.md', 'AI开场集中度.md',
  'n匹配修正.md', '消融实验报告.md', '退化开场复核.md',
  'out_语域基线.json', 'out_消融.json',
  'E0探测报告.md', 'E0扩展验证报告.md', 'E0回显验证报告.md', 'E0语义压力测试报告.md',
  'E0兼容性报告.md', 'E0Responses兼容性报告.md', 'E0三合一与缓存报告.md',
  'E0流式修复报告.md', 'E0可靠性量化报告.md',
]
const gen = new URL('./', import.meta.url)
for (const f of BING_YOU_WEN_JIAN) {
  if (existsSync(new URL(f, gen))) tongGuo += 1
  else { shiBai += 1; console.log('  FAIL 缺文件 ' + f) }
}

console.log('\n=== 5. 文档内部一致性（禁止自相矛盾）===')
function JianCha(ming: string, ti: boolean): void {
  if (ti) { tongGuo += 1; console.log('  OK   ' + ming) }
  else { shiBai += 1; console.log('  FAIL ' + ming) }
}
JianCha('已撤回「6.0×」并给出修正值 3.30×', wen.includes('3.30×') && wen.includes('真实偏离是 3.30× 而非 6.0×'))
JianCha('已撤回「改 16 条 MBTI 是主路径」', wen.includes('零效果'))
JianCha('已标注 prefix 不回显 + 必须拼接', wen.includes('必须拼接'))
JianCha('已标注端点配错是静默失败', wen.includes('静默忽略'))
JianCha('已加 G6 条数护栏', wen.includes('G6') && wen.includes('1.63'))
JianCha('已加 G7 接续率护栏', wen.includes('G7') && wen.includes('接续率'))
JianCha('E0 外呼次数标注一致（71）', (wen.match(/71 次/g) || []).length >= 3)
JianCha('未残留「5 秒探测」的过期表述', !wen.includes('把**唯一有治根可能但有硬阻塞**的动作放在阻塞可被 5 秒探测消除之后'))
JianCha('未残留「48 次外呼验证」', !wen.includes('48 次外呼验证'))
JianCha('判据编号已无 M7 重复（G7→M7 重排完成）', !wen.includes('| **G7** |'))
JianCha('未残留「6 份报告」', !wen.includes('6 份报告'))
JianCha('判据已改为拼接后判定', wen.includes('首条消息以 opener 开头且长度大于 opener'))
JianCha('纠错记录已到 27 条', wen.includes('共 27 次'))
JianCha('已加 C1 噪声底基线节', wen.includes('3.5 阶段 C1'))
JianCha('诊断已改为「复用率」而非「词汇贫乏」', wen.includes('不是词汇池贫乏，是复用率'))
JianCha('已列「已从判据中移除的指标」', wen.includes('已从判据中移除的指标'))
JianCha('已标注 bootstrap 对多样性指标的向下偏倚', wen.includes('系统性向下偏倚'))
JianCha('M2 判据已按对话长度重标定为 ≤25%', wen.includes('≤25%') && wen.includes('M2 判据必须重标定'))
  JianCha('已记录 LCCC 对话长度缺口（9-16 桶仅 15 段，40 轮无基线）', wen.includes('9–16 桶仅 **15 个线程**'))
  JianCha('已记录 prefix 2 字语义崩坏结论', wen.includes('语义崩坏 6/8'))
  JianCha('已记录机制 D 胜出且不含拒绝采样', wen.includes('候选开场 + 独立加权采样') && !wen.includes('机制 D（候选开场 + 硬重试）'))
  JianCha('已标注 6 轮样本无法验证 M2', wen.includes('机制 D 在 120 轮量级完全未测'))
  JianCha('已记录 NUS-SMS 等替代语料源的否决理由', wen.includes('繁体粤语'))
  JianCha('蒙特卡洛数字已换成脚本可复算的真值', wen.includes('机制D蒙特卡洛.mts') && wen.includes('11.53%') && wen.includes('11.89%') && !wen.includes('0.29×（过分散'))
  JianCha('已撤回「过分散 3.4 倍」的单次抽样定论', wen.includes('已撤回') && wen.includes('0.64×–0.97×'))
  JianCha('§8.1 已标注被实测推翻', wen.includes('已被 §10.1 实测部分推翻'))
JianCha('已加 §3.6 阶段 B A/B 结果', wen.includes('3.6 阶段 B · A/B 实测结果'))
JianCha('阶段 B 标记为已完成', wen.includes('已完成（3.6）'))
JianCha('已记录军师链路 2 处漏项', wen.includes('军师配置.ts:52') && wen.includes('Prompt构建器.ts:455'))
JianCha('已记录日预算 600 轮硬约束', wen.includes('每日实测预算 600 轮'))
JianCha('G1 破栏已转为 D+E1 验收条件', wen.includes('护栏 G1 的破栏转为 D+E1 的验收条件'))
JianCha('未残留「n=120 中位 111」旧判据', !wen.includes('n=120 中位 111'))
JianCha('E0 记录已到 9 轮', wen.includes('E0 第九轮') || wen.includes('第九轮'))
JianCha('已声明未改动 src/', !wen.includes('已实现 P2'))

console.log('\n============================')
console.log('通过 ' + tongGuo + ' / 失败 ' + shiBai)
if (shiBai > 0) { console.log('\n❌ 有 ' + shiBai + ' 项不一致，必须修完再交付'); process.exitCode = 1 }
else console.log('✅ 全部一致')
