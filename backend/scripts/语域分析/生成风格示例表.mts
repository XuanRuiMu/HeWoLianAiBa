/**
 * 生成「风格示例表」：从真人语料抽**跨话题**的完整聊天片段。
 *
 * 依据（arXiv 2402.09954，真实中文人机对话数据集上的 ICL 研究）：
 *   1. **随机检索的示例效果最好**；反直觉地，检索「与当前上下文最相似」的示例**最差**
 *      （同样的 context 重复出现 ⇒ 唯一 token 最少 ⇒ 有效信息最少）。
 *   2. **即使破坏示例的多轮关联与单轮语义**，只要示例**数量够多**，效果仍显著提升
 *      ⇒ LLM 主要在学 **token 分布 / 说话方式**，不是在学内容。
 *   3. 风格可由**少量示例**迁移，**不需要定义风格属性**（不必写「活泼」「理性」这类词）。
 *
 * 用户定稿（2026-10-03）：「聊考研聊吃饭等，你要提取他们的风格特征，
 * 让ai在聊到相关桥段时，能和真人一样的反应」⇒ 示例必须**跨话题**，
 * 这样模型学到的是风格；同话题示例会退化成内容模板（那是被否证的剧本）。
 *
 * 落盘：backend/src/config/风格示例表.json（进版本库，运行时零 IO、零外呼）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const gen = (w: string) => resolve(dirname(fileURLToPath(import.meta.url)), '../../../', w)

/** 表总条数。论文：few-shot 需 ≥7 才追平纯 prompt，且越多越好（many-shot 报告称可达数百） */
const ZONG_TIAO_SHU = Number(process.env.FENG_GE_SHI_LI_BIAO_TIAO || '40')
/** 片段最少要有几条才入选 —— 单条片段信息量太低 */
const ZUI_SHAO_TIAO = 2
const ZUI_DUO_TIAO = 6
const SUIAN_ZI = 20261003

let suan = SUIAN_ZI >>> 0
const suiJi = () => ((suan = (suan * 1664525 + 1013904223) >>> 0) / 4294967296)

const raw = gunzipSync(readFileSync(gen('.语料工作区/lccc_base_valid.jsonl.gz'))).toString('utf8')

/** 语料是分词格式（`啊 我 好 爱`），必须还原；每行顶层是数组 */
const duan: string[][] = []
for (const line of raw.split(/\r?\n/).filter(Boolean)) {
  let a: unknown
  try { a = JSON.parse(line) } catch { continue }
  if (!Array.isArray(a)) continue
  const xs = (a as unknown[])
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.replace(/\s+/g, ''))
    .filter((s) => s.trim().length > 0)
  if (xs.length >= ZUI_SHAO_TIAO && xs.length <= ZUI_DUO_TIAO) duan.push(xs)
}

/**
 * 剔除**不适合当风格示例**的片段。
 *
 * 理由：示例是给模型学说话方式的，下列内容会把「不完整 / 生活化」教歪：
 * · 纯链接/纯表情 —— 学不到句法，只会让模型也发链接
 * · 含邮箱/手机号 —— 无关且脏
 * · 含 @ 提及 —— 微博语料特有，IM 场景不会出现
 */
/**
 * 语料里混进的**乱码字符**（第十九轮，审查抓出）。
 *
 * 实测 110 条示例里有 1 条含 U+00F3（拉丁-1 字母 `ó`）：
 *   > 「看了更不想xó习了…」   ← 「学」被 UTF-8 双重编码破坏
 *
 * 它会**直接进运行时共用缓存前缀**（`gouJianFengGeShiLiCeng`）⇒ 等于教模型
 * 吐这个乱码字符，而 `Prompt构建器` 自己写明脏文本会「落库上屏」。
 * 原有 `shiFouKeYong` 只滤链接/邮箱/@/纯表情，不拦编码损坏。
 *
 * ⇒ 白名单：只允许 CJK、中文标点（含 U+2026…/U+2014—）、emoji、ASCII 可见字符。
 */
function youMoJiMaKe(t: string): boolean {
  for (const c of t) {
    const o = c.codePointAt(0) as number
    const heFa =
      (o >= 0x4e00 && o <= 0x9fff) || (o >= 0x3400 && o <= 0x4dbf) || // CJK
      (o >= 0x3000 && o <= 0x303f) || (o >= 0xff00 && o <= 0xffef) || // 中文标点/全角
      o === 0x2026 || o === 0x2014 || o === 0x2018 || o === 0x2019 || o === 0x201c || o === 0x201d || // … — '' ""
      (o >= 0x1f300 && o <= 0x1faff) || (o >= 0x2600 && o <= 0x27bf) || // emoji
      (o >= 0x20 && o <= 0x7e) // ASCII 可见
    if (!heFa) return false
  }
  return true
}

function shiFouKeYong(xs: string[]): boolean {
  const zheng = xs.join('')
  if (/@[\w一-龥]{2,}/.test(zheng)) return false
  if (/https?:\/\/|www\./i.test(zheng)) return false
  if (/1[3-9]\d{9}/.test(zheng)) return false
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(zheng)) return false
  // 全是表情/符号，没有可学的句法
  if (xs.every((t) => !/[\p{Script=Han}]{2}/u.test(t))) return false
  // 任一条含乱码字符就整段弃用（见 youMoJiMaKe 的说明）
  if (!xs.every((t) => youMoJiMaKe(t))) return false
  return true
}

/**
 * 风格一致性筛选 —— **这是本脚本最关键的一道闸**。
 *
 * 第一版抽样暴露的问题：表里混进了
 *   「近战不红，大概就是反座子不讨喜的缘故。只有值得尊重的对手，才能激发…」 （65 字书面长句）
 * 与「请毛蹄…」「求解」这类缩略口语。
 * 模型会学成「有时缩略有时长句」，而不是**稳定**的说话方式 —— 那是混杂，不是风格。
 *
 * 论文说 few-shot 要「多样」，但**多样 ≠ 混杂**：
 * 多样指**话题**多样（跨话题才学得到风格），风格本身必须一致。
 *
 * 因此只保留满足以下全部条件的片段 —— 这些特征**跨话题都成立**：
 * · 平均每条 ≤ 50 字：第一版设 30 字太紧，把「正常长度的口语」也误伤了
 *   （真人消息均值 11.8 字，但分布有长尾；只留极短的会把 AI 教成电报体）
 * · 含至少一个「不完整 / 生活化」标记：省略号、语气词、缩略、网络词、单字成句
 * · 不含书面连接词：因此/从而/综上/不仅…而且（「所以」允许，它是口语）
 */
const SHU_ZHEN_LIAN_JIE = /因此|从而|综上|不仅|而且|然而|故而|换言之|与此同时|进而/
/** 「不完整 / 生活化」标记：省略号、句末语气词、语气词开头、网络词、连续数字 */
const BU_WAN_ZHENG = /…|\.{3}|[嗯呢吧嘛哦噢咯啦哈喂唔诶]|^[哈嘿哎唉嗯唔哦]|[a-zA-Z]{3,}|[0-9]{2,}/

function shiFouKouYu(xs: string[]): boolean {
  const pingJun = xs.join('').length / xs.length
  if (pingJun > 50) return false
  const zheng = xs.join('')
  if (SHU_ZHEN_LIAN_JIE.test(zheng)) return false
  // 至少一条带「不完整/生活化」标记
  return xs.some((t) => BU_WAN_ZHENG.test(t))
}

/** 明显的微博/饭圈/追剧专有词，与 IM 恋爱聊天无关，排除 */
const ZHUAN_YOU = /偶像|追星|粉丝|应援|超话|爱豆|站姐|打投|反座子|安利|出题|楼|沙发|主播|上热搜/

/**
 * 「话题跳跃」检测 —— **本脚本第二轮新增的核心筛选项**。
 *
 * 动机（第十四轮实测）：跑完 I型4 型 16 轮，**没有一轮出现「说自己的事而不接对方话题」**。
 * 而真人语料里到处是：
 *   > 天气转阴了
 *   > 我们这儿阳光明媚      ← 根本没在回应第一句
 *   > 渴望阳光
 *
 * 根因：LCCC 每个片段本身就是「一问一答」链，只学这些 ⇒ 模型学到「每条都在接上一条」。
 * 所以必须**专门挑含话题跳跃的片段**，直接教「可以说自己的事」。
 *
 * 判据（可计算、可复现）：相邻两条消息的**字级 Jaccard 相似度**低于阈值即视为跳跃。
 * 中文没有空格分词，字级 bigram 重合度足够稳健。
 */
function ziJiDaBiaoShiCi(a: string, b: string): number {
  const ge = (s: string) => {
    const zheng = s.replace(/[\s　]/g, '')
    const out = new Set<string>()
    for (let i = 0; i < zheng.length - 1; i++) out.add(zheng.slice(i, i + 2))
    return out
  }
  const ga = ge(a)
  const gb = ge(b)
  if (ga.size === 0 || gb.size === 0) return 1
  let jiao = 0
  for (const x of ga) if (gb.has(x)) jiao++
  return jiao / (ga.size + gb.size - jiao)
}

/** 片段里至少要有一次跳跃（相似度低），且不能每两句都跳（那就成噪声了） */
function youHuaTiYueYue(xs: string[]): boolean {
  if (xs.length < 3) return false
  let yue = 0
  for (let i = 1; i < xs.length; i++) {
    if (ziJiDaBiaoShiCi(xs[i - 1], xs[i]) < 0.12) yue++
  }
  return yue >= 1 && yue <= xs.length - 2
}

/**
 * **单句特征配额**（第十四轮实测驱动的第三轮筛选修正）。
 *
 * 现象：加入跳跃片段后，INFJ 连续三轮输出「我在说啥呢」。
 * 人设里确实写了「马上补一句『我在说啥呢』收回来」，但**真人不会每轮都说** ——
 * 模型在**逐字模仿示例**，不是自然表达。
 *
 * 根因：跳跃片段池只有 451 个，含「我在说啥呢」「我在说啥呢」这类**自我打断句式**的片段
 * 在这个池子里密度很高，抽 20 条就会重复出现多次。
 *
 * 修法：抽样时做**配额** —— 任何特征词在整张表里最多出现 `XIAN_ZHENG_PE_E` 次。
 * 强制多样性，模型就学到「这类句式偶尔出现」而不是「每次都用」。
 */
const XIAN_ZHENG_PE_E = [
  // 自我打断 / 收尾追问的固定句式
  '我在说啥呢', '我问你哦', '你说呢', '对吧', '是吧',
  // 高频自我披露引导
  '我也是', '我也是这样', '我上次', '我上次也',
]

/** 该片段里带了几个「配额特征词」 */
function teZhengGeShu(xs: string[]): number[] {
  const zheng = xs.join('')
  return XIAN_ZHENG_PE_E.map((c, i) => (zheng.includes(c) ? i : -1)).filter((i) => i >= 0)
}

/** 按配额抽：同类特征累计超过配额就跳过该片段 */
function anPeiEChouQu(chi: string[][], yao: number, yongPeE: Map<number, number>): string[][] {
  const qu = [...chi]
  const xuanChu: string[][] = []
  for (let i = 0; i < yao && qu.length; i++) {
    const sui = Math.floor(suiJi() * qu.length)
    const te = teZhengGeShu(qu[sui])
    const chao = te.filter((j) => (yongPeE.get(j) || 0) >= XIAN_ZHENG_PE_E_ME_XIANG)
    if (chao.length > 0 && qu.length > 1) continue // 超配额，换一个
    for (const j of te) yongPeE.set(j, (yongPeE.get(j) || 0) + 1)
    xuanChu.push(qu.splice(sui, 1)[0])
  }
  return xuanChu
}

/** 任一特征词最多出现几次 */
const XIAN_ZHENG_PE_E_ME_XIANG = 2

const keYong = duan.filter((xs) => shiFouKeYong(xs) && shiFouKouYu(xs) && !ZHUAN_YOU.test(xs.join('')))
console.log(`风格可用片段 ${keYong.length} / 候选 ${duan.length}（共 ${raw.split(/\r?\n/).filter(Boolean).length} 段）`)

/**
 * 分两池抽样，**跳跃片段优先占一半**。
 *
 * 第十四轮实测：只有跳跃片段会教出「说自己的事」；只有应答片段会教出「每条都接话」。
 * 两类都必须有 —— 全是跳跃会学成自说自话、全是应答会学成客服。
 */
const yueYueDuan = keYong.filter(youHuaTiYueYue)
const yingDaDuan = keYong.filter((xs) => !youHuaTiYueYue(xs))
console.log(`  其中含话题跳跃 ${yueYueDuan.length} / 纯应答 ${yingDaDuan.length}`)

const yaoYue = Math.ceil(ZONG_TIAO_SHU / 2)
const xuanChu: string[][] = []
/** 配额表两池共用 —— 保证整张表里任一特征词都不超次数 */
const yongPeE = new Map<number, number>()

/**
 * 🔴 **按真人轮长分布分层抽样**（第十九轮实测修正）。
 *
 * 第一版均匀抽样，实测输出 3.7 条/轮（真人 2.8、中位 2）。原因不是「截断成 3 条」，
 * 截断只是表象 —— **候选池本身就偏长**：`keYong`（8,864 段）里长片段通过
 * 「至少一条口语标记」的概率更高（内容多 ⇒ 命中标记的机会多），
 * 均匀抽样等于按「偏长的池子」再加权一次。
 *
 * 真人轮长分布（LCCC valid 20,000 段实算，只取 2–6 桶后归一）：
 *   2 条 59.2%   3 条 23.9%   4 条 10.6%   5 条 4.1%   6 条 2.2%
 *
 * ⇒ 每个轮长桶按配额抽，**2 条桶必须占约六成**。这是数据侧修法，不是给模型加死规则。
 *
 * ⚠️ 话题跳跃片段天然至少 3 条（`youHuaTiYueYue` 对 <3 条直接返回 false），
 *   所以 2 条桶只能来自应答池；这不影响总体的跳跃占比（跳跃样本占满 3–6 桶 ≈ 42%）。
 */
const ZHEN_REN_TIAO_SHU: Record<number, number> = { 2: 0.592, 3: 0.239, 4: 0.106, 5: 0.041, 6: 0.022 }

/** 真人「≤4字消息」占比（LCCC 实算）—— 短消息配额的目标值 */
const ZHEN_REN_DUAN_HUA_LV = 0.17
function duanHuaLv(xs: string[][]): number {
  const g = xs.flat()
  if (g.length === 0) return 0
  return g.filter((t) => t.length <= 4).length / g.length
}

/**
 * 🔴 **短消息配额修正**（第十九轮，两次踩坑后才对）。
 *
 * 踩坑记录（必须留着，否则会重犯）：
 *   ① 第一版「优先抽含 ≤4 字消息的片段」⇒ 实测 ≤4字 占比从 10.0% 冲到 **30.0%**（真人 17.0%），
 *      均值被压到 10.0（真人 11.9）。一刀切偏好会偏向**全短**片段。
 *   ② 第二版「按运行比例动态收敛」⇒ 看似合理，实测回到 10.9%，**等于没改**。
 *      根因：`anPeiEChouQu` 是**按随机下标**抽样（`suiJi() * qu.length`），
 *      **与数组顺序无关** ⇒ 我只是重排了数组，偏好完全没生效。
 *      两次结果的差异纯粹是 RNG 状态不同造成的**噪声**，被我误读成「效果」。
 *
 * ⇒ 正确做法：**显式配额 + 同轮长替换**。不足就从同轮长的池子里换入含短消息的片段，
 *    不改变轮长分布（那才是 P0）。
 */
function tiaoZhengDuanHuaPeE(xuanChu: string[][], yingDa: string[][]): string[][] {
  let xuan = xuanChu
  let quCanYong = new Set(yingDa)
  // 上限用总条数而非字面量：改 FENG_GE_SHI_LI_BIAO_TIAO 时循环上限必须跟着变
  for (let i = 0; i < ZONG_TIAO_SHU && duanHuaLv(xuan) < ZHEN_REN_DUAN_HUA_LV; i++) {
    // 找一个「已选且不含短消息」的轮长，换成同轮长、含短消息且未使用的片段
    let gaiLe = false
    for (let k = 0; k < xuan.length && !gaiLe; k++) {
      const miao = xuan[k]
      if (miao.some((t) => t.length <= 4)) continue
      const houXuan = [...quCanYong].filter((xs) => xs.length === miao.length && xs.some((t) => t.length <= 4))
      if (houXuan.length === 0) continue
      const tihuan = houXuan[Math.floor(suiJi() * houXuan.length)]
      quCanYong.delete(tihuan)
      xuan = [...xuan]
      xuan[k] = tihuan
      gaiLe = true
    }
    if (!gaiLe) break // 没有可换的了
  }
  return xuan
}
let xuanChuDuanHua = xuanChu

for (let tiao = ZUI_SHAO_TIAO; tiao <= ZUI_DUO_TIAO; tiao++) {
  const xiang = Math.round(ZONG_TIAO_SHU * (ZHEN_REN_TIAO_SHU[tiao] || 0))
  if (xiang === 0) continue
  const congYueYue = anPeiEChouQu(yueYueDuan.filter((xs) => xs.length === tiao), xiang, yongPeE)
  xuanChu.push(...congYueYue)
  let buZu = xiang - congYueYue.length
  if (buZu > 0) xuanChu.push(...anPeiEChouQu(yingDaDuan.filter((xs) => xs.length === tiao), buZu, yongPeE))
}
xuanChuDuanHua = tiaoZhengDuanHuaPeE(xuanChu, yingDaDuan)
xuanChu.length = 0
xuanChu.push(...xuanChuDuanHua)
console.log(`  配额上限 ${XIAN_ZHENG_PE_E_ME_XIANG} 次/特征，实际分布：`)
for (let j = 0; j < XIAN_ZHENG_PE_E.length; j++) {
  const c = yongPeE.get(j) || 0
  if (c > 0) console.log(`    ${XIAN_ZHENG_PE_E[j]}：${c}`)
}

/**
 * ⚠️⚠️ **不再统一截断成 3 条**（第十九轮，实测推翻）。
 *
 * 第一版（及第二/三版）都写死 `slice(0, 3)`，理由是「3 条是论文说的 multi-turn 最小可用形态」
 * （arXiv 2402.09954）。**那句话说的是 ICL 需要多少上下文，不是轮长分布** ——
 * 把它当轮长依据，是把「上下文长度需求」误当成「说话轮数规律」。
 *
 * 实测代价（真人基线 vs 系统输出，见 独立评测_真人基线.mts / 独立评测_对照.mts）：
 *
 *   轮长分布     风格示例表        真人(LCCC 20,000 段)
 *   2 条         32.5%             **57.5%**
 *   3 条         **67.5%**         23.2%
 *   4 条及以上   **0%**            **19.4%**
 *
 *   ⇒ 模型学到的「一轮 = 3 条」比现实高 2.9 倍，于是输出 **3.7 条/轮**（真人 2.8、中位 2），
 *     且长度方差被压掉一半（**SD 6.0 vs 真人 10.5**）。
 *
 * 这正是 Sandler 2024（arXiv:2401.16587）在 118 项语言指标上报告的
 * 「LLM 输出方差系统性低于真人」—— 分布被削窄，而不是均值偏一点。
 *
 * ⇒ 修法：**不截断**，保留片段的自然轮长（2–6，由 ZUI_DUO_TIAO 兜住上限）。
 *   模型学的是示例的**分布**，那就该给真分布，不该给一个被拍平的数字。
 */
const shiLi = xuanChu.map((xs) => xs.slice(0, ZUI_DUO_TIAO))
const pingJunZi = Math.round((shiLi.flat().join('').length / shiLi.flat().length) * 10) / 10
const pingJunTiao = Math.round((shiLi.flat().length / shiLi.length) * 10) / 10
/** 长度方差 —— 与 Sandler 2024 报告的「LLM 方差系统性偏低」直接对照，必须记录 */
const ziShuLie = shiLi.flat().map((t) => t.length)
const pingJunZiShu = ziShuLie.reduce((a, b) => a + b, 0) / ziShuLie.length
const biaoZhunChaZiShu =
  Math.round(Math.sqrt(ziShuLie.reduce((a, b) => a + (b - pingJunZiShu) ** 2, 0) / ziShuLie.length) * 10) / 10
/** 轮长分布 —— 必须与真人语料一致，否则模型会学歪（第十九轮实测） */
const tiaoShuFenBu: Record<number, number> = {}
for (const xs of shiLi) tiaoShuFenBu[xs.length] = (tiaoShuFenBu[xs.length] || 0) + 1

const biao = {
  _shouYong: shiLi.length,
  _tiaoShuFanWei: `${Math.min(...shiLi.map((x) => x.length))}-${Math.max(...shiLi.map((x) => x.length))}`,
  _tiaoShuFenBu: Object.fromEntries(Object.entries(tiaoShuFenBu).sort((a, b) => +a[0] - +b[0])),
  // ⚠️ 分母写清，避免同名不同义被误引：
  //   这里的比例是**全量 20,000 段**口径；抽样用的 ZHEN_REN_TIAO_SHU 是**2–6 桶内归一**口径（59.2%）。
  //   '4 及以上' 是 '4' 的**超集**（含 4），不是并列的另一个桶。
  _zhenRenTiaoShuFenBu: { '2': '57.5%', '3': '23.2%', '4': '10.3%', '4及以上': '19.4%' },
  _zhenRenFenMu: '全量 20,000 段口径（抽样用的 ZHEN_REN_TIAO_SHU 是 2-6 桶内归一口径，两者不同）',
  _pingJunZiShu: pingJunZi,
  _biaoZhunChaZiShu: biaoZhunChaZiShu,
  _zhenRenZiShuSD: 10.5,
  _pingJunTiaoShu: pingJunTiao,
  _zhenRenPingJunTiaoShu: 2.8,
  _youYuan: 'LCCC（thu-coai/CDial-GPT）真实微博互动，人称已统一为「对方」，原文其余部分逐字未改',
  shiLi,
}

const lu = gen('backend/src/config/风格示例表.json')
writeFileSync(lu, `${JSON.stringify(biao, null, 2)}\n`, 'utf8')

console.log(`已写入 ${lu}`)
console.log(`  条数 ${biao._shouYong}  轮长 ${biao._tiaoShuFanWei}（自然长度，不再截断）  平均 ${pingJunZi} 字/条  平均 ${pingJunTiao} 条/示例`)
console.log(`  轮长分布 ${JSON.stringify(biao._tiaoShuFenBu)}`)
console.log(`  真人对照  ${JSON.stringify(biao._zhenRenTiaoShuFenBu)}`)
console.log(`  字数 SD ${biao._biaoZhunChaZiShu}（真人 ${biao._zhenRenZiShuSD}）`)
const cha = biao._biaoZhunChaZiShu - biao._zhenRenZiShuSD
if (cha < -2) {
  console.warn(`  ⚠️ 字数方差比真人低 ${Math.abs(cha).toFixed(1)}，模型会学到偏窄的分布（Sandler 2024 的机器味特征之一）`)
}
console.log('\n=== 抽样确认（跨话题）===')
for (const xs of shiLi.slice(0, 8)) {
  for (const t of xs) console.log(`  > ${t}`)
  console.log()
}