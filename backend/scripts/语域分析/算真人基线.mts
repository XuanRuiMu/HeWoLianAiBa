import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { tongJi, danTiao, zhengXi } from './语域口径.ts'

const WEN_JIAN = process.argv[2] || '.语料工作区/LCCC/lccc_base_valid.jsonl.gz'
const XIAN_ZHU = process.argv[3] || 'LCCC-base-valid'

const yuanWen = gunzipSync(readFileSync(WEN_JIAN)).toString('utf8')
const hang = yuanWen.split('\n').filter((x) => x.trim().length > 0)
console.error(`读入 ${hang.length} 行`)

const duiHuaDui = []
let faYanShu = 0
for (const x of hang) {
  const duiHuaLie = JSON.parse(x)
  if (!Array.isArray(duiHuaLie)) continue
  const youXiaoLun = duiHuaLie.filter((t) => typeof t === 'string' && t.trim().length > 0)
  if (youXiaoLun.length === 0) continue
  duiHuaDui.push(youXiaoLun)
  faYanShu += youXiaoLun.length
}
console.error(`对话 ${duiHuaDui.length} 段 / 发言 ${faYanShu} 条`)

const juShuFenBu = [0, 0, 0, 0, 0, 0, 0]
let tiaoShuZong = 0
let yuQiCiZong = 0
let emojiZong = 0
const danTiaoLie = []
for (const lun of duiHuaDui) {
  tiaoShuZong += lun.length
  juShuFenBu[Math.min(6, lun.length)] += 1
  for (const t of lun) {
    const wenBen = zhengXi(t.trim())
    const b = danTiao(wenBen)
    danTiaoLie.push(b)
    yuQiCiZong += b.yuQiCi
    emojiZong += b.emoji
  }
}

const lunJunJuShu = tiaoShuZong / duiHuaDui.length
let juShuCV = 0
for (const lun of duiHuaDui) {
  const c = lun.length
  juShuCV += (c - lunJunJuShu) ** 2
}
juShuCV = Math.sqrt(juShuCV / duiHuaDui.length) / lunJunJuShu

const junZhi = tongJi(danTiaoLie.map((b) => b.neiRong))

const juShuFenBuBiao = juShuFenBu
  .map((n, i) => `| ${i}${i === 6 ? '+' : ''} | ${n} | ${((n / duiHuaDui.length) * 100).toFixed(1)}% |`)
  .join('\n')

const baoGao = `# 真人基线实测 · ${XIAN_ZHU}

> 口径实现：\`.语料工作区/语域口径.ts\`（与 AI 实测共用，禁止各自实现）
> 生成时间：${new Date().toISOString()}

## 样本

| 项 | 值 |
| --- | --- |
| 源文件 | \`${WEN_JIAN}\` |
| 对话段数 | ${duiHuaDui.length} |
| 发言条数 | ${faYanShu} |
| 语料来源 | 微博真实互动（LCCC-base） |

## 语域指标（发言级）

| 指标 | 值 |
| --- | --- |
| **平均字数（主口径，已去空白）** | ${junZhi.pingJunZiShu} |
| 平均字数（含原始空白，仅参考） |  |
| **中位字数** | ${junZhi.zhongWeiZiShu} |
| p10 / p90 | ${junZhi.p10} / ${junZhi.p90} |
| **≤10 字占比** | ${(junZhi.shiFenWei * 100).toFixed(1)}% |
| ≤20 字占比 | ${(junZhi.shiFengErShi * 100).toFixed(1)}% |
| 最长 / 最短 | ${junZhi.zuiChangZiShu} / ${junZhi.zuiDuanZiShu} |
| 平均字数（剔标点） | ${junZhi.pingJunZiShuChaiBiao} |
| **单分句占比** | ${(junZhi.danFenJuBiLi * 100).toFixed(1)}% |
| **单分句且无标点占比** | ${(junZhi.danFenJuWuBiaoBiLi * 100).toFixed(1)}% |
| **末尾带标点占比** | ${(junZhi.weiMoBiaoBiLi * 100).toFixed(1)}% |
| 末尾带句号占比 | ${(junZhi.jvHaoBiLi * 100).toFixed(1)}% |
| **语气词密度（剔除"哈"）** | ${junZhi.yuQiCiMiDu} 个/条 |
| emoji 密度 | ${junZhi.emojiMiDu} 个/条 |
| 轮内句长 CV（拼接切句） | ${junZhi.juChangCV} |

## 条数分布（轮级）

平均 ${lunJunJuShu.toFixed(2)} 条/轮，CV ${juShuCV.toFixed(3)}

| 轮内条数 | 段数 | 占比 |
| --- | --- | --- |
${juShuFenBuBiao}

## 附：口径说明

- **字数**：\`Array.from(文本).length\`，含标点与空格（trim 后）
- **末尾带标点**：最后一个字符属于 \`，。！？；：、~～….!?;:\`
- **末尾带句号**：口径更窄，仅 \`。\`/\`.\`
- **单分句**：按 \`，。！？；：、~～…\\n,.!?;:\` 切分后仅得 1 段
- **单分句且无标点**：在「单分句」基础上再要求整条无任何该类标点
- **语气词**：\`嗯啊呢吧噢哦诶唔嘛啦\` 共 10 个，**不含"哈"**（"哈哈哈"是笑声不是语气词）
- **emoji**：\`\\p{Extended_Pictographic}\`（注：符号颜文字 \`⊙▽⊙\`/\`^_^\` **不计入** emoji）
`

writeFileSync('.语料工作区/真人基线_实测.md', baoGao, 'utf8')
console.log(baoGao)
