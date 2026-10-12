/**
 * 出话约束守卫：检出「许可型约束被写成要用的花样」这类会引发过度使用的写法。
 *
 * ⚠️ **为什么需要它**（第二十二轮 `~` 实测事故的复盘）：
 *   我给第一层加了一条「句尾偶尔拖个 ~ 软化语气」，配了两个例句。
 *   实测 boLangHaoBiLi 从真人语料的 4.10% 飙到 **26.67%**（基线 6.5 倍）。
 *   根因不是 `~` 本身，而是**写法**：
 *     - 「偶尔」「不用每句」这类**程度副词对 LLM 几乎无效**，它只看到「可以用」；
 *     - **举例即模板**：给了例句，模型学会的是那个花样；
 *     - 许可型（「你可以用 X」）与禁令型（「别用 X」）在 LLM 里**权重不对称**——
 *       许可会被当成待执行的指令，禁令只是背景。
 *
 * ⚠️⚠️ **本版修复的沉默失效**（交接文档第 117 行的坑，本轮又被踩了一次）：
 *   上一版 `SHI_LI` 正则**漏了 `g` 标志**，非全局 `match` 只返回首个匹配，
 *   `.length` 恒为 1 ⇒ 「例句过多(≥3)」「许可型+例句(≥2)」从写下那天起就是死代码；
 *   且只认半角引号，`“有没有资源”` 这类**全角例句完全检不出**。
 *   ⇒ 实测：一条含 4 处全角例句 + 许可型句式的约束，旧守卫报「命中 0」。
 *
 * **一个只会漏报、永远不会误报的守卫，比没有守卫更危险。**
 *   所以本文件带 `--自测`：每条判据都有一条**指名道姓**的样例，自测不过就是守卫坏了。
 *
 * 用法：
 *   node -r ts-node/register/transpile-only scripts/检查出话约束.ts [--自测]
 * 退出码 0 = 通过；1 = 有命中（或自测未通过）。
 *
 * ⚠️ 这是**诊断工具不是断言**：命中需要人工判断严重度，脚本只打印、不替你改文案。
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * ⚠️ 必须带 `g`：不带 g 的 String.match 只返回首个匹配 + 1 个捕获组，长度恒为 1，
 *    所有「≥2 / ≥3」的阈值判断全部失效（沉默失效过两次）。
 * ⚠️ 必须同时认半角 "…"、全角 “…” 与裸 「…」，且**下限取 1 字**——
 *    本项目病灶域恰恰是极短答（「嗯」「哈」「啊」「行」）。
 */
const SHI_LI =
  /(?:像「|比如「|例如「|就像「|"[^"]{1,20}"|“[^”]{1,20}”|「[^」]{1,20}」|比如[（(][^）)]{1,8}[）)])/g

/**
 * 无引号列例。⚠️ 踩过的坑：原来写 `\b比如`，而 JS 的 `\b` 基于 `\w`、**CJK 不是 \w**，
 * 所以 `\b比如` 永远匹配不上——加 `\b` 等于加保险丝。门槛取 3。
 */
const WU_YINHAO_LIE_JU = /(?:比如|例如|比方说|像是|就像)\s*[「“"']?[^「」“”"'，。！？、\s][^「」“”"'，。！？、\s]{0,5}/g

/** 程度副词：对 LLM 无效的「稀疏度声明」 */
const CHENG_DU = /(偶尔|有时|一般|通常|大多|不少|可能会|适当时机|看情况|有时候)/
/** 动作动词：与程度副词组合 = 裸授权 */
const DONG_ZUO = /(拖|带|加|写|用|发|垫|甩)/
/** 「不要过度使用」类声明 */
const JIN_ZHI = /(别每条|不要每条|不用每句|别每句|别都|别一条里|别连着|别每轮|别硬凑)/
/**
 * 许可型信号。
 * ⚠️ 第一版只认带「可以/允许」的显性许可，第二十八轮三轴审查抓出**沉默失效**：
 *   「…同感就回一句同感的，不然就接着问他那件事别的」这类**无「可以」的许可型**
 *   （就回 / 就接着问 / 照实答 / 就说 / 就该）完全检不出，而它们同样是待执行指令。
 *   ⇒ 补「就 + 动词」分支。判据自测里加了指名样例，防止再次静默失效。
 */
const XU_KI = /(可以用|想用就用|允许|可以写|就用|也正常|都可以|就(回|接着问|问|照实答)|照实答|你是知道的)/
/** 禁令型信号 */
const JIN_LING = /(别用|不要用|不许|禁止|别把|别拿)/

/**
 * 已评估例外：**命中但不计入失败**。
 *
 * ⚠️ 为什么要这个表：守卫是**诊断工具不是文案指挥棒**——不能为了让它归零去改 prompt 语义。
 *   「你想接就接；不想接就换一句，也正常」这条就是典型：它确实是许可型、确实没有禁止声明，
 *   但它授权的是「不接话 / 换话题」，而行为基线里真人本来就是这样（常岔开、常收住）。
 *   它是第二十轮实测成果，改掉它等于把「每句话都得有用」这个 AI 味重新放回来。
 *   ⇒ 登记为例外、打印出来给人看，而不是把它改成禁令或删掉。
 */
const LI_WAI: Array<{ guanJianZi: string; liYou: string }> = [
  { guanJianZi: '也正常', liYou: '第二十轮成果：授权「不接话/换话题」，真人本就如此（行为基线：常岔开常收住），必要保留' },
]


/** 唯一一份判据实现：正式路径与自测**共用**，不准抄第二份 */
function duQuWenJian(wen: string): string[] {
  const shiLi = (wen.match(SHI_LI) || []).length
  const chengDu = CHENG_DU.test(wen)
  const xuKi = XU_KI.test(wen)
  const jinZhi = JIN_ZHI.test(wen)
  const jinLing = JIN_LING.test(wen)
  const wuYinHao = (wen.match(WU_YINHAO_LIE_JU) || []).length
  const wenti: string[] = []
  if (xuKi && shiLi >= 2) wenti.push('许可型+例句')
  else if (xuKi && chengDu) wenti.push('许可型+程度副词')
  else if (shiLi >= 3) wenti.push('例句过多')
  if (wuYinHao >= 3) wenti.push('无引号列例')
  if (chengDu && DONG_ZUO.test(wen) && !jinLing) wenti.push('裸授权')
  // ⚠️ 第二十八轮改：原条件要求文本里出现「用|带|拖|加|写」，那是为 `~` 事故那条
  //   （「可以用波浪号来软化语气」）量身定的，覆盖不到「就回一句同感的」这类
  //   不含动作字的隐性许可。改为：**有许可型信号 且 完全没有任何禁令声明**。
  if (xuKi && !jinZhi && !jinLing) wenti.push('有许可无禁止')
  if (jinLing && shiLi >= 1) wenti.push('禁令型+示范例句')
  return wenti
}

/** 判据自测：每条样例必须**按名字**命中，否则说明判据已经沉默失效 */
const ZI_CE: Array<{ ming: string; wen: string; yao: string[] }> = [
  { ming: '全角引号例句≥3（本轮第一层真实存在的形态）',
    wen: '对方问你什么，就答什么——“有没有资源”答“有”，问冷不冷答“冷死了”，问位置答位置，答完了再问回去也正常。',
    yao: ['许可型+例句'] },
  { ming: '1 字引号例句（本项目病灶域全是极短答）',
    wen: '用一句话接住就行，"嗯"、"哈"、"啊"、"行"都行。', yao: ['例句过多'] },
  { ming: '无引号列例≥3', wen: '接住就行，比如嗯，比如哈哈，比如好啊。', yao: ['无引号列例'] },
  { ming: '许可型+程度副词', wen: '可以用波浪号，偶尔拿来软化语气。', yao: ['许可型+程度副词'] },
  { ming: '裸授权：程度副词+动作、无许可词也无禁令词',
    wen: '句尾偶尔拖个 ~ 软化语气。', yao: ['裸授权'] },
  { ming: '有许可无禁止', wen: '可以用波浪号来软化语气。', yao: ['有许可无禁止'] },
  { ming: '禁令型+示范例句', wen: '别用「嗯」「哈哈」这种口水话当回复。', yao: ['禁令型+示范例句'] },
  // ⚠️ 第二十八轮补：无「可以」的许可型（「就…问」）曾让守卫沉默失效
  { ming: '隐性许可型：就+动词（第二十八轮被漏报的那条）',
    wen: '同感就回一句同感的，不然就接着问他那件事别的。', yao: ['有许可无禁止'] },
  { ming: '隐性许可型：照实答',
    wen: '聊到你生活里真有的东西，你是知道的，照实答。', yao: ['有许可无禁止'] },
]

if (process.argv.includes('--自测')) {
  let si = 0
  for (const { ming, wen, yao } of ZI_CE) {
    const mingZhong = duQuWenJian(wen)
    const que = yao.filter((y) => !mingZhong.includes(y))
    if (que.length) {
      si += 1
      process.stdout.write(`  ✗ ${ming}\n      期望：${yao.join(' / ')}｜实得：${mingZhong.length ? mingZhong.join(' / ') : '（无）'}\n`)
    } else {
      process.stdout.write(`  ✓ ${ming} → ${mingZhong.join(' / ')}\n`)
    }
  }
  process.stdout.write(`\n判据自测：${ZI_CE.length} 条样例，${si} 条未按预期触发。\n`)
  if (si > 0) {
    process.stdout.write('⚠️ 有判据已经**沉默失效**（或换了判据名）。先修守卫，再谈它报的结论。\n')
    process.exit(1)
  }
  process.stdout.write('⚠️ 本自测只验证「判据活着且叫对名字」，不验证「判据写得对不对」；两者都要人看。\n')
  process.exit(0)
}

function loadDiYiCeng(): string[] {
  const p = resolve(__dirname, '../src/services/Prompt构建器.ts')
  const yuan = readFileSync(p, 'utf8')
  const kaiShi = yuan.indexOf('function gouJianDiYiCeng')
  if (kaiShi < 0) throw new Error('未找到 gouJianDiYiCeng，Prompt构建器.ts 结构可能已变')
  const fanHui = yuan.indexOf('return [', kaiShi)
  const jieHe = yuan.indexOf('].join(', fanHui)
  if (fanHui < 0 || jieHe < 0) throw new Error('未能定位 gouJianDiYiCeng 的 return 数组边界')
  const ti = yuan.slice(fanHui + 'return ['.length, jieHe)
  const xian: string[] = []
  const re = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)\s*,?\s*$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(ti)) !== null) xian.push(m[1] ?? m[2] ?? m[3] ?? '')
  if (xian.length === 0) throw new Error('第一层切片出 0 条：切片正则没吃到任何字面量（引号形态变了？）')
  return xian
}

const duan = loadDiYiCeng()
let zongShu = 0
const xian: string[] = []
const zhuTiJi = new Map<string, string[]>()
const liWaiJi = new Map<string, { guanJianZi: string; liYou: string }>()

duan.forEach((s, i) => {
  const wen = s.replace(/\\n/g, ' ').replace(/\\'/g, "'")
  // ⚠️ 正式路径必须调 duQuWenJian，与自测同一份实现
  const wenti = duQuWenJian(wen).map((t) =>
    t === '许可型+例句' ? `${t}(${(wen.match(SHI_LI) || []).length}处)`
    : t === '例句过多' ? `${t}(${(wen.match(SHI_LI) || []).length}处)`
    : t === '无引号列例' ? `${t}(${(wen.match(WU_YINHAO_LIE_JU) || []).length}处：「比如X」连着列＝当模板)`
    : t === '许可型+程度副词' ? `${t}（「偶尔」对模型无效，只会读到「可以用」）`
    : t === '裸授权' ? '程度副词+动作动词（裸授权句式：没写「可以」但意思是可以用）'
    : t === '有许可无禁止' ? '有许可无禁止（只说了可以用，没说别滥用）'
    : t === '禁令型+示范例句' ? `${t}(${(wen.match(SHI_LI) || []).length}处)`
    : t,
  )
  const xuKi = XU_KI.test(wen)
  if (xuKi) {
    for (const zhuTi of ['方括号', '波浪号|~', '简写', 'emoji|表情']) {
      if (new RegExp(zhuTi).test(wen)) {
        const k = zhuTi.split('|')[0]
        zhuTiJi.set(k, [...(zhuTiJi.get(k) || []), `#${i + 1}`])
      }
    }
  }
  const chuLi = wenti.filter((t) => {
    const liWai = LI_WAI.find((x) => wen.includes(x.guanJianZi))
    if (!liWai) return true
    liWaiJi.set(`#${i + 1}`, liWai)
    return !t.startsWith('有许可无禁止')
  })
  if (chuLi.length === 0) return
  zongShu++
  xian.push(`    #${i + 1} ${chuLi.join(' / ')}\n      ${wen.slice(0, 110)}`)
})

process.stdout.write(`\n检查 第一层出话约束（会直接进 Writer prompt）：${duan.length} 条约束，命中 ${xian.length} 条\n`)
if (xian.length) process.stdout.write(xian.join('\n') + '\n')
for (const [k, v] of zhuTiJi) {
  if (v.length >= 2) {
    zongShu++
    process.stdout.write(`    ⚠️ 同一主题「${k}」被 ${v.length} 条约束授权：${v.join(' ')}\n       两条许可叠加会放大输出（第二十二轮 ~ 事故第二阶段）。\n`)
  }
}
// 例外必须**显眼地**打出来：静默豁免等于没有豁免
for (const [hao, x] of liWaiJi) {
  process.stdout.write(`    ℹ️ ${hao} 命中但已登记例外（关键词「${x.guanJianZi}」）：${x.liYou}\n`)
}

// ── 回归集：钉**语义关键词**，不钉整句措辞（交接文档第 124 行）───────────────
// 作用是自动抓「约束被误删」——本轮实测：第一层从 25 条变成 15 条，
// 追问压制与编造压制整条消失，靠人眼 diff 是抓不稳的。
const 回归集路径 = resolve(__dirname, '../../语料实验室/回归集.json')
let 回归缺失 = 0
let 回归残留 = 0
try {
  const ji = JSON.parse(readFileSync(回归集路径, 'utf8')) as {
    出话层必须存在: Array<{ 关键词: string; 管什么: string }>
    出话层必须不存在: Array<{ 关键词: string; 为什么: string }>
  }
  const quanWen = duan.join('\n')
  process.stdout.write('\n回归集检查（语料实验室/回归集.json）：\n')
  for (const x of ji.出话层必须存在) {
    if (!quanWen.includes(x.关键词)) {
      回归缺失 += 1
      process.stdout.write(`  ✗ 缺失「${x.关键词}」——管：${x.管什么}\n`)
    } else {
      process.stdout.write(`  ✓ 在位「${x.关键词}」\n`)
    }
  }
  for (const x of ji.出话层必须不存在) {
    if (quanWen.includes(x.关键词)) {
      回归残留 += 1
      process.stdout.write(`  ✗ 残留「${x.关键词}」——为什么不该有：${x.为什么}\n`)
    } else {
      process.stdout.write(`  ✓ 已无「${x.关键词}」\n`)
    }
  }
  if (回归缺失 || 回归残留) {
    process.stdout.write(`\n⚠️ 回归集：缺失 ${回归缺失} 条、残留 ${回归残留} 条。\n`)
  }
} catch (e) {
  process.stdout.write(`\n⚠️ 回归集未加载（${String(e)}），跳过该项。\n`)
}

process.stdout.write(`\n合计命中 ${zongShu} 条（写法）；回归集缺失 ${回归缺失} 条、残留 ${回归残留} 条。\n`)
process.stdout.write('⚠️ 命中不等于违规，但「许可型 + 例句 + 程度副词」这个组合已被 `~` 实测证明会引发 6 倍过度使用。\n')
process.exit(zongShu > 0 || 回归缺失 > 0 || 回归残留 > 0 ? 1 : 0)
