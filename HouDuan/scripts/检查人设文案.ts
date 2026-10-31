import { yanYuFengGe } from '../src/config/角色配置'
import type { MBTILeiXing } from '../src/config/角色配置'

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
