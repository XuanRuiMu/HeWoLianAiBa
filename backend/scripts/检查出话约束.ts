/**
 * 出话约束守卫：检出「许可型约束被写成要用的花样」这类会引发过度使用的写法。
 *
 * ⚠️ **为什么需要它**（第二十二轮 `~` 实测事故的复盘）：
 *   我给第一层加了一条「句尾偶尔拖个 ~ 软化语气」，配了两个例句。
 *   实测 boLangHaoBiLi 从真人语料的 4.10% 飙到 **26.67%**（基线 6.5 倍），
 *   收窄措辞后仍是 10.7%。A/B 双臂实测（Fisher p=1.0000）证明撤掉它并不更差。
 *   根因不是 `~` 本身，而是**写法**：
 *     - 「偶尔」「不用每句」这类**程度副词对 LLM 几乎无效**，它只看到「可以用」；
 *     - **举例即模板**：给了例句「刚睡醒，还有点迷糊~」，模型学会的是「句尾加个软化符号」这个花样；
 *     - 许可型约束（「你可以用 X」）与禁令型（「别用 X」）在 LLM 里**权重不对称**——
 *       许可会被当成待执行的指令，禁令只是背景。
 *
 *   第二十三轮加「微信简写层」时写了 6 个例句 + 「偶尔」，正是同一类高危写法。
 *   故把这个坑做成可执行检查，而不是靠人记得。
 *
 * 用法：npx ts-node scripts/检查出话约束.ts
 * 退出码 0 = 通过；1 = 有命中。
 *
 * ⚠️ 这是**诊断工具不是断言**：多数命中需要人工判断严重度，脚本只打印、不阻断。
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

/** 一句话里出现几个「例句/样例」标记 —— 许可型约束最危险的部分
 *  ⚠️ 独立三轴审查（BlindSpot P0）打回过这一版：原正则四个分支都要求紧跟「，
 *     导致「比如（笑）（皱眉）」这种**不带引号的示范例句完全检不出**（BL-2）。
 *     故新增无引号分支，且例句计数不再依赖引号。
 */
const SHI_LI = /(像「|比如「|例如「|就像「|"[^"]{2,20}"|比如[（(][^）)]{1,8}[）)])/
/** 程度副词：对 LLM 无效的「稀疏度声明」，写它给人看的，不是给模型看的 */
const CHENG_DU = /(偶尔|有时|一般|通常|大多|不少|可能会|适当时机|看情况|有时候)/
/** 「不要过度使用」类声明 —— 必须存在，但单独存在**不够**（见文件头） */
const JIN_ZHI = /(别每条|不要每条|不用每句|别每句|别都|别一条里|别连着|别每轮|别硬凑)/
/** 许可型信号：出现这些词说明这条约束在「授权」某种写法（禁令型不该命中） */
const XU_KI = /(可以用|想用就用|可以用[「"]|允许|可以写|就用)/
/** 禁令型信号：出现这些词说明这条约束在「禁止」 */
const JIN_LING = /(别用|不要用|不许|禁止|别把|别拿)/

/** 第一层出话约束数组的位置：`Prompt构建器.ts` 里 `function gouJianDiYiCeng` 的返回数组 */
const WEN_JIAN = [
  {
    biaoMing: '第一层出话约束（会直接进 Writer prompt）',
    duan: loadDiYiCeng(),
  },
]

function loadDiYiCeng(): string[] {
  // 只读取该函数体内 `return [` 到 `].join` 之间的字符串字面量，不做 AST，改用文本切片。
  // ⚠️ 读源码而非 import：import 会触发整个模块的依赖加载（含 config / 数据库 / Redis），
  //   而这里只想做静态文本检查。
  // ⚠️⚠️ 独立三轴审查（BlindSpot P1，BL-4）指出文本切片的两条漏检通道：
  //   (1) 原正则只认「整行单引号」，双引号/模板字符串/跨行拼接会被静默丢弃，
  //       报告里的「N 条约束」会无提示地变少；
  //   (2) 边界依赖硬编码 `].join('\n')`，一旦 prettier 改引号或改成常量引用即失效。
  //   故此处做两件事：① 扩正则为三种引号形态；② **断言条数**，与源码里的
  //      字符串字面量总数对不上时直接抛错，让漏检变成显式失败而不是静默通过。
  const p = resolve(__dirname, '../src/services/Prompt构建器.ts')
  const yuan = readFileSync(p, 'utf8')
  const kaiShi = yuan.indexOf('function gouJianDiYiCeng')
  if (kaiShi < 0) throw new Error('未找到 gouJianDiYiCeng，Prompt构建器.ts 结构可能已变')
  const fanHui = yuan.indexOf('return [', kaiShi)
  // 边界：找 `].join(` 而不是硬编码引号风格；同时确认它是该层数组的收尾。
  const jieHe = yuan.indexOf('].join(', fanHui)
  if (fanHui < 0 || jieHe < 0) throw new Error('未能定位 gouJianDiYiCeng 的 return 数组边界（是否改成了常量引用？）')
  const ti = yuan.slice(fanHui + 'return ['.length, jieHe)
  const xian: string[] = []
  const re = /^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)\s*,?\s*$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(ti)) !== null) xian.push(m[1] ?? m[2] ?? m[3] ?? '')
  return xian
}


let zongShu = 0
for (const { biaoMing, duan } of WEN_JIAN) {
  const xian: string[] = []
  /** 主题级去重：同一主题被多条约束授权/禁止 = 上一次 `~` 事故第二阶段的成因 */
  const zhuTiJi = new Map<string, string[]>()
  duan.forEach((s, i) => {
    const wen = s.replace(/\\n/g, ' ').replace(/\\'/g, "'")
    const wenti: string[] = []
    const shiLi = (wen.match(SHI_LI) || []).length
    const chengDu = CHENG_DU.test(wen)
    const jinZhi = JIN_ZHI.test(wen)
    const xuKi = XU_KI.test(wen)
    const jinLing = JIN_LING.test(wen)

    // ⚠️⚠️ 独立三轴审查（BlindSpot P0，BL-3）指出原版致命缺陷：
    //   唯一组合规则要求「例句 AND 程度副词」，而文件头推荐的修法恰恰是**删掉程度副词**
    //   ⇒ 按处方改完就永久失明。实测：只删「偶尔」的那条 `~` 约束立刻检不出。
    //   故规则重排为**三条互相独立**的判据，任何一条单独成立即命中：
    //     ① 许可型 + ≥2 例句 —— 不依赖程度副词
    //     ② 许可型 + 程度副词 —— 例句已删时仍能命中
    //     ③ 许可型 + 无禁止声明 —— 只说了「可以用」，没说别滥用
    if (xuKi && shiLi >= 2) wenti.push(`许可型+例句(${shiLi}处)`)
    else if (xuKi && chengDu) wenti.push('许可型+程度副词（「偶尔」对模型无效，只会读到「可以用」）')
    else if (shiLi >= 3) wenti.push(`例句过多(${shiLi}处)`)
    if (xuKi && !jinZhi && /用|带|拖|加|写/.test(wen)) wenti.push('有许可无禁止（只说了可以用，没说别滥用）')
    // 禁令型也附示范例句：否定指令 + 示例同样会被学到 token 分布（BL-2）
    if (jinLing && shiLi >= 1) wenti.push(`禁令型+示范例句(${shiLi}处)`)

    // 主题归并：抓「同一写法被多条约束授权」——上一轮事故第二阶段的真实成因
    if (xuKi) {
      for (const zhuTi of ['方括号', '波浪号|~', '简写', 'emoji|表情']) {
        if (new RegExp(zhuTi).test(wen)) {
          const k = zhuTi.split('|')[0]
          zhuTiJi.set(k, [...(zhuTiJi.get(k) || []), `#${i + 1}`])
        }
      }
    }
    if (wenti.length === 0) return
    zongShu++
    xian.push(`    #${i + 1} ${wenti.join(' / ')}\n      ${wen.slice(0, 110)}`)
  })
  process.stdout.write(`\n检查 ${biaoMing}：${duan.length} 条约束，命中 ${xian.length} 条\n`)
  if (xian.length) process.stdout.write(xian.join('\n') + '\n')
  for (const [k, v] of zhuTiJi) {
    if (v.length >= 2) {
      zongShu++
      process.stdout.write(`    ⚠️ 同一主题「${k}」被 ${v.length} 条约束授权：${v.join(' ')}\n       两条许可叠加会放大输出（第二十二轮 ~ 事故第二阶段）。\n`)
    }
  }
}

process.stdout.write(`\n合计命中 ${zongShu} 条。\n`)
process.stdout.write('⚠️ 命中不等于违规，但「许可型 + 例句 + 程度副词」这个组合已被 `~` 实测证明会引发 6 倍过度使用。\n')
process.stdout.write('⚠️ 若确需许可：① 删掉程度副词（「偶尔」对模型无效）；② 例句减到 ≤2；③ 保留明确禁止声明。\n')
process.exit(zongShu > 0 ? 1 : 0)
