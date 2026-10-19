/**
 * 人设文案守卫：检出「持续性动作」型描述。
 *
 * ⚠️ **为什么需要它**（第二十轮真实缺陷的复盘）：
 *   `角色配置.ts` 自己写着三条铁律（禁形容词 / 禁字面台词 / 禁行为机制），
 *   但没有任何机制保证新写的人设句不违反它们。实测踩坑过程：
 *     INFP「喜欢先描述你看到的东西」⇒ 每轮首句必写景物。
 *       LCCC 1 万段实测：真人末条含景物/环境元素 **0.8%**，AI 接近 100%。
 *     INFJ「喜欢用比喻而不是直接说」⇒ 每轮造比喻（同型）。
 *     ISFP「很容易先共鸣，然后才讲自己的事」⇒ 每轮先共情再讲自己（同型）。
 *     ISFJ「习惯先照顾对方感受」⇒ 每轮先处理对方感受（同型）。
 *     ENTP「喜欢反问和挑战」⇒ 每轮强行玩梗（同型）。
 *     ENTJ「说话像在下决定」⇒ 句句命令口吻（同型）。
 *     INTP「爱追问原因」⇒ 把情绪陈述当提问处理，连抛两问（同型）。
 *     ENFP「很容易跟人熟起来」「用力逗他」⇒ 每轮强行热络（同型）。
 *   7 处全部已改并实测通过，但**下一个新增人设的人会重犯**——
 *   所以把这条检查做成可执行脚本，而不是靠人记得。
 *
 * 用法：npx ts-node scripts/检查人设文案.ts
 * 退出码 0 = 通过；1 = 有命中。
 *
 * ⚠️ 这是**诊断工具不是断言**：命中的句子未必是病（例如「你敢怼回去」是性格不是动作），
 *   所以脚本只打印、不阻断。要判断是否真违规，看下面注释里的三类判据。
 */
import { yanYuFengGe } from '../src/config/角色配置'
import type { MBTILeiXing } from '../src/config/角色配置'

/**
 * 持续性动作的三种形态：
 *   ① 持续性动词 + **聊天动作**：「喜欢用比喻」「喜欢反问」「爱追问原因」「总是主动照顾」
 *      —— 只匹配「动词 + 说/写/用/问/带/跟/照顾…」这类**会在消息里做出来的动作**。
 *      「喜欢把事情定下来再动手」「喜欢定计划和目标」这类**非聊天动作**不报（那是性格）。
 *   ② 顺序机制：「先 A 再 B」「先 A 然后才 B」——这是 INFP 原句被判死的直接原因
 *   ③ 表面形式指令：「说话像在下决定」「更像是在讲自己观察到的」
 *
 * ⚠️ 正则刻意收紧，避免把**性格化写法**误判成动作：
 *   ESTP「你**敢**怼回报」/ ISTP「你**懒得**解释」——「敢」「懒得」是性格，不是每轮动作，**不报**。
 */
const XU_SHI_XING_DONG_ZI =
  /(喜欢(用|说|写|问|带|跟|反问|玩梗|抽象|绕)|爱(追问|怼|起哄|玩梗|拐)|习惯先|总是|很容易(先|就|跟|把|用)|三句就|一下就)/
const XU_XU_JI_ZHI = /(先[^，。；、]{1,8}[，,]?再|然后才|先[^，。；、]{1,8}，[^，。；、]{1,8}才)/
const BIAO_MIAN_XING_SHI = /(说话像|更像是在|说话有点抽象|语气和感叹号)/

interface WenBenDuan {
  biaoMing: string
  leiXing: string
  wenBen: string
}

const DUAN: WenBenDuan[] = [
  ...(Object.entries(yanYuFengGe) as Array<[MBTILeiXing, string]>).map(([k, v]) => ({ biaoMing: k, leiXing: 'yanYuFengGe（说话风格）', wenBen: v })),
  // ⚠️ xiTongTiShi 进的是「八达模板块」，不是 Writer 的第二层；本脚本只查**真的会进 Writer prompt** 的表。
  // ⚠️ xingWeiTeDian **当前完全不进 Prompt**：`AI输入准备.ts:105` 把 `xing_wei_te_dian` 硬编码成 `''`，
  //   数据库 `角色` 表也没有这一列（只有生成时算出来放进 ba_da_mo_kuai，之后没落库）。
  //   所以本脚本**不查它**——查一个不生效的表会给出虚假的安全感。
  //   若将来把行为习惯接进 prompt，把下面的注释放开即可（`yanYuFengGe` 的检查逻辑直接复用）。
]

let mingZhongShu = 0
for (const duan of DUAN) {
  const leiXing: string[] = []
  if (XU_SHI_XING_DONG_ZI.test(duan.wenBen)) leiXing.push('持续性动作')
  if (XU_XU_JI_ZHI.test(duan.wenBen)) leiXing.push('顺序机制')
  if (BIAO_MIAN_XING_SHI.test(duan.wenBen)) leiXing.push('表面形式指令')
  if (leiXing.length === 0) continue
  mingZhongShu++
  process.stdout.write(`⚠️  ${duan.leiXing} ${duan.biaoMing}：${leiXing.join(' / ')}\n    ${duan.wenBen}\n`)
}

process.stdout.write(`\n检查 ${DUAN.length} 条人设文案，命中 ${mingZhongShu} 条。\n`)
process.stdout.write('命中不等于违规：「你敢怼回去」这类性格化写法不会被检出；仍需人工判读是否真会变成每轮动作。\n')
process.exit(mingZhongShu > 0 ? 1 : 0)
