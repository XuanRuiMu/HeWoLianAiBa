/**
 * 开场多样化约束（P2 机制 D）。
 *
 * ⚠️ 选型与「为什么不用拒绝采样」的依据全部来自实测，不是推测：
 *
 *  | 机制                | 机械接续 | 语义质量（人工） | 复读 |
 *  |  | A 无约束           | —        | 6/6 可读        | 0/6 |
 *  |  | B prefix 强制 2 字  | 8/8 100% | **2/8 崩坏**   | 0/6 |
 *  |  | C prefix 强制整句  | 8/8 100% | 7/8             | 1/8 |
 *  |  | **D 候选开场（本模块）** | —   | **6/6 全通顺**  | **0/6** |
 *
 * B 的死因：prefix 在词法中间截断，**模型的生成计划被截断**，只能做局部补全
 * → `我刚我也刚洗完`、`你怎怎么突然说这个`。
 * D 让模型**从第一字就参与规划**，候选来自真人高频开场短句的边际分布。
 *
 * 🚨 **为什么不做「排除撞最近 N 轮的」拒绝采样**（第二轮三轴审查复核；
 *    ⚠️ 下表的 0.00% 行**当前脚本已无对应分支**，`.语料工作区/机制D蒙特卡洛.mts`
 *    只剩 `junYun` / `quYanZhong` 两个分支 —— 该数字来自当时的运行，属历史记录，
 *    **不可声称「脚本可复算」**。原始口径：2000 会话 × 40 轮）：
 *
 *  | 模型选择方式                          | 最近 20 轮撞车率 | 单会话开场种类 |
 *  |  | 拒绝采样（对满窗口做硬排除）        | 0.00%（历史记录）| —             |
 *  |  | 本模块：均匀随机挑候选              | **11.53%**       | 34.2           |
 *  |  | 忽略候选，按全表权重独立抽          | **11.89%**       | 34.1           |
 *
 *  **关键发现：后两者几乎相同 ⇒ 候选机制在统计上等价于直接从全表采样，
 *  它无法通过「分布整形」把撞车率推向任何特定值。** 拒绝采样则把它压到 0，
 *  两者都落在真人区间之下 → 单纯靠采样整形降低 M2 这条路**走不通**。
 *
 * 📌 **第十二轮实测补充（400 轮真实外呼，同 id 有效对照）**：
 *  · 「哈哈」在候选池权重 488/10000（4.88%），真人 LCCC 边际 **2.68%**（第 1 名，1,525/56,917）
 *    → 权重是「TOP200 内占比」，已比边际放大 1.8×。
 *  · AI 实际产出「哈哈」开头 **14.1%** → 模型对池内最高权重项的**选择放大系数 8.55×**
 *    （出现 114 次被选 56 次 = 49.1%，均匀基线 5.7%）。
 *  · 因此**任何按「等权选 1」做的蒙特卡洛都会把 M2 低估约 2.1 倍**。
 *  · M2 实测：机制 D 关 **14.07%**（= 真人 25 轮值 16.1% 的 **0.87×，落在真人区间内**）
 *    / 开 23.68%（1.47×）。**故机制 D 默认保持关闭**，勿开启。
 *
* ⚠️ 与真人**实测**值的同尺度校准（`.语料工作区/机制D蒙特卡洛.mts`，**每格重复 5 次取中位并报范围**）：
 *
 *  | 会话长度 | 真人实测 | 本模块模型（中位，范围） | 中位比值 |
 *  |  | 2       | 0.67%    | 0.44%（0.40~0.48%）     | 0.66× |
 *  |  | 3–4     | 1.57%    | 0.81%（0.75~1.13%）     | 0.52× |
 *  |  | 5–8     | 2.63%    | 2.23%（2.08~2.31%）     | 0.85× |
 *  |  | **9–16**| **8.59%**| **4.29%（1.84~7.98%）** | **0.50×** |
 *
 *  → 各桶中位比值 0.50×–0.85×，即本机制**略偏分散但远未到「过分散 3.4 倍」**。
 *  → ⚠️ **不得据此下设计定论**：9–16 桶仅 15 个会话 / 163 条发言，
 *    单桶范围 1.84%–7.98%（跨度 4.3 倍），噪声远大于信号。
 *    此前曾把单次抽样的 0.29× 当成定论并据此推出「必须建模会话结构」，已撤回（纠错 #24）。
 *  → 真人比 i.i.d. 随机重复**更多**（会话结构相关性，如问候轮反复「你好」），这一点是稳健的。
 *  → **本模块是否真的改善 M2 属于未验证**，必须靠 120 轮真实外呼判定。
 *    本文件头的数字只用于「排除明显越界的设计」，**不是验收证据**。
 *
 * 候选池见 `开场采样表.json`（LCCC 真人高频开场短句，边际分布对领域不敏感）。
 */
import { KAI_CHANG_PEI_ZHI, huoQuKaiChangBiao } from '../config/开场采样配置'
import { debug日志 } from '../utils/debug日志'
import type { DuiHuaKuai } from '../utils/DeepSeek客户端'

const ZI_SHU = 2

/**
 * 切分 AI 回复为消息条（去序号前缀 + 去渲染格式残留）。
 *
 * ⚠️ **为什么要代码侧清洗而不是靠 prompt 禁止**（第十二轮子代理审查 P0-①实测）：
 *   `Prompt构建器.ts:156` 早就明写「不要带时间戳」，模型仍然在
 *   `ESTP/L3` 输出了 `^\_^(20:42): 湿头发别往手机上滴啊…` —— 把历史消息的渲染格式
 *   `发送者(HH:MM): 内容` 原样抄了回来。400 轮里出现 2 次，**100% 会落库并显示在聊天气泡里**，
 *   而所有语域指标都测不到它（它不是 emoji、不影响字数）。
 *
 *   对**格式泄漏**的 prompt 禁令可靠性接近零，必须在代码侧拦。
 */
export function qingLiXiaoXi(neiRong: string): string[] {
  if (!neiRong) return []
  return neiRong
    .split('\n')
    .map((hang) => hang.trim())
    .filter((hang) => hang.length > 0)
    .map((hang) => qingLiGeShiXianLieShi(hang))
    .filter((hang) => hang.length > 0)
}

/**
 * 剥掉一行开头的**渲染格式残留**。
 *
 * 覆盖实测到的两类（顺序有意义，先剥颜文字再剥时间戳，因为颜文字里常内嵌时间戳）：
 * · 颜文字：`^\_^` / `^_^` / `_^` / `OTZ` / `orz`，可带后缀时间戳
 * · 时间戳：`(20:42):` / `[20:42]` / `（20:42）`
 * · 序号前缀：`1.` / `1、`（历史行为，保留）
 *
 * ⚠️ 只处理**行首**。句中的「哈哈 (20:42)」是正常内容，不动。
 */
export function qingLiGeShiXianLieShi(hang: string): string {
  return hang
    .replace(/^\d+[\.、]\s*/, '')
    // 颜文字 + 可选时间戳。实测泄漏原话是 `^\_^(20:42): `（含反斜杠转义），
    // 故字符类必须允许 `\_^` / `^_^` / `^^` / `_^` 四种组合 + 可选反斜杠。
    .replace(/^(?:\^\\?[\^_]{1,2}|_\\?\^|OTZ|orz)\s*(?:\(\d{1,2}:\d{2}\)\s*[:：]?\s*)?/i, '')
    // 裸时间戳前缀，如 `(20:42): ` / `（20:42）` / `[20:42] `
    .replace(/^(?:\(\d{1,2}:\d{2}\)|（\d{1,2}：\d{2}）|\[\d{1,2}:\d{2}\])\s*[:：]?\s*/, '')
    // 再剥一次：剥掉颜文字后可能只剩光秃秃的时间戳（如 `^\_^(20:42): ` 无正文）
    .replace(/^(?:\(\d{1,2}:\d{2}\)|（\d{1,2}：\d{2}）|\[\d{1,2}:\d{2}\])\s*[:：]?\s*/, '')
    .trim()
// ⚠️ 顺序很重要：先剥格式，最后才处理计数（剥离后的内容才参与计数判定）
    .replace(renZhiShouZiCountZhi(), (m) => (baiMianShuoYiCi.test(m) ? m : m.replace(/[一二三四五六七八九十两0-9]{1,3}\s*(次|遍)/, '好几$1')))
    .trim()
}

/**
 * 「说一次/说一句/提一句」是**正常口语**（不是频率断言），必须豁免。
 * 实测 `ENTJ/L23`「那我再说一次，先把头发吹干」曾被误伤成「说好几次」。
 */
export const baiMianShuoYiCi = /(说|提|聊|问|念|喊)(一)(次|句|下)/

/**
 * 判据：这段文本**是否仍带自编的频率断言**。
 * 与 `qingLiGeShiXianLieShi` 同源（同一份正则 + 同一份豁免），供测试直接复用 ——
 * 测试另抄一份会与实现漂移，把合法的「我再说一次」误判成「中和失败」。
 */
export function haiYouZiShouZiCountZhi(wenBen: string): boolean {
  const re = renZhiShouZiCountZhi()
  const piao = wenBen.match(re)
  return piao !== null && !piao.every((m) => baiMianShuoYiCi.test(m))
}

/**
 * 中和**模型自编的频率断言**（第十二轮实测 P1-③）。
 *
 * 现象：模型从自己注入的历史里数「我提过几次」，且**数得不准**：
 *   `ESFP/L5`  「那杯奶茶我都提第三次了哦……」   —— 实际第 1–2 次
 *   `ESFP/L14` 「我奶茶提了三次烤肉提了两次」   —— 实际是 7 轮与 6 轮
 *
 * 调研结论（imprint-memory / Replica / nocturne_memory 三家共识）：
 *   **不要让模型维护记忆账本** —— 计数、衰减、召回优先级必须由系统维护，
 *   模型只负责消费。让模型自己数，它就会编。
 *
 * ⚠️ 为什么在**输出侧**处理而不是加 prompt 禁令：
 *   本项目已实测反复证明，往 prompt 里加约束会让 AI 味更重（PROGRESS §3.6 / §7.2）；
 *   而 P0-① 的时间戳泄漏已证明「对格式/事实泄漏的 prompt 禁令可靠性接近零」，
 *   代码侧拦截是同型且已验证有效的做法。
 *
 * 处置：把**自指**的计数断言替换成不含数字的等价说法 ——
 * 保留语气（这是它的记忆锚点），只去掉编造的**事实**。
 * 不动对「用户」的计数（「我等你三次了」是真事），也不动无关数字（「三点睡」）。
 */
export function renZhiShouZiCountZhi(): RegExp {
  // 只匹配：**主语是「我」+ 重复动词 + 数字 + 次/遍**
  // 用惰性匹配并允许重复动词出现两次，以覆盖实测的三种形态：
  //   「我奶茶提了三次」（动词前后都有内容）
  //   「我奶茶提三次」（无「了」）
  //   「那杯奶茶我都提第三次了」（动词 + 「第」+ 数词，量词在后）
  // 「我提了这个问题但你不信」必须**不**匹配 —— 故排除「但|可|不|没」等转折词紧随其后。
  return /我(都|又|已经|好像|老是)*[^，。！？\n]{0,6}?(提|说|聊|问|念|喊)(了|过)?\s*(?:已经|第)?\s*[一二三四五六七八九十两0-9]{1,3}\s*(次|遍)(?:了)?/g
}

/** 取可作开场的 token（去空白后前 N 字） */
export function quChuKaiChangToken(wenBen: string, ziShu: number = ZI_SHU): string | null {
  const zheng = wenBen.replace(/[\s　]+/g, '')
  if (zheng.length < ziShu) return null
  return zheng.slice(0, ziShu)
}

/**
 * 强场景 / 时序 / 关系绑定词——**必须排除**。**唯一事实源，测试与蒙特卡洛脚本都从这里取。**
 *
 * 为什么必须排除：这些词一旦被注入给模型，它很可能直接采用——因为在 5 个候选里
 * 它们常常是「最自然」的那个。非生日场景第一句被引导用「生日」开头，直接破人设。
 * 该风险靠 prompt 兜不住，只能在候选生成阶段剔除。
 *
 * ⚠️ 判据必须**同类同标**（第三轮审查 B-1）：早先只剔了「早安/晚安」却留了
 * 「早上/晚上/昨晚/今晚」，剔除「亲爱/抱抱」却留了「爱你/表哥/姐姐」，
 * 实测残留暴露率高达 时序 14.9% / 关系 12.2%。
 */
export const QIAN_JING_JIE_DONG = [
  // 时序与时段绑定
  '加油', '生日', '新年', '过年', '恭喜', '早安', '晚安', '早上', '晚上', '昨晚', '今晚',
  '周末', '昨天', '明天', '每天', '天天',
  // 关系与表白绑定
  '亲爱', '亲亲', '抱抱', '爱你', '表白', '祝你', '哥哥', '姐姐', '羡慕', '宝贝',
  // 微博评论区身份词（非 IM 恋爱对象会用）
  '大哥', '老师', '土豪',
]

/** 是否属于必须排除的绑定词 */
export function shiQianJingJieDong(kaiChang: string): boolean {
  return QIAN_JING_JIE_DONG.some((d) => kaiChang.startsWith(d))
}

/**
 * 按真人经验分布**独立**采 `geShu` 个候选开场（不做撞车拒绝）。
 * 用去重集合 + 权重累加定位，而非固定切片——固定切片每轮返回同几项，随机性归零。
 * 强场景/时序/关系绑定词一律剔除（见 `shiQianJingJieDong`）。
 */
export function caiYangKaiChangHouXuan(
  geShu: number,
  suiJi: () => number = Math.random,
): string[] {
  const biao = huoQuKaiChangBiao()
  const heJi = biao.quanZhong.reduce((a, b) => a + b, 0)
  const chuQu = new Set<string>()
  // 上限放大：剔除绑定词后命中率下降，需要更多次采样才能凑够 geShu 个
  const shangXian = geShu * 12 + 30
  for (let t = 0; t < shangXian && chuQu.size < geShu; t++) {
    const dian = suiJi() * heJi
    let leiJia = 0
    let beiLi = biao.kaiChang.length - 1
    for (let i = 0; i < biao.quanZhong.length; i++) {
      leiJia += biao.quanZhong[i]
      if (dian <= leiJia) { beiLi = i; break }
    }
    const k = biao.kaiChang[beiLi]
    if (!k) continue
    if (shiQianJingJieDong(k)) continue
    chuQu.add(k)
  }
  return [...chuQu].slice(0, geShu)
}

/**
 * 生成开场约束文本 + **本轮实际采到的候选**。
 * ⚠️ 必须把候选一起返回：联调要据此统计 M7/M8。若由调用方另行采样，
 *    测的是另一次独立抽样，与模型是否真的服从无关（PROGRESS §10.1.4）。
 */
export function daiShuKaiChangYuanYu(): { wenBen: string; houXuan: string[] } {
  if (!KAI_CHANG_PEI_ZHI.kaiGuan) return { wenBen: '', houXuan: [] }
  const houXuan = caiYangKaiChangHouXuan(KAI_CHANG_PEI_ZHI.houXuanGeShu)
  if (houXuan.length === 0) {
    debug日志.warn('开场候选约束', '候选为空，本轮不加约束', { xiang_qing: { houXuanGeShu: KAI_CHANG_PEI_ZHI.houXuanGeShu } })
    return { wenBen: '', houXuan: [] }
  }
  if (KAI_CHANG_PEI_ZHI.kaiFaMoShi) {
    debug日志.debug('开场候选约束', '已注入开场候选', { xiang_qing: { houXuan } })
  }
  return {
    // ⚠️ 措辞修正（第十一轮实测驱动）：原措辞「不用照抄整句」假设候选是**句子**，
    //    但 200 个候选全是 2 字**词片**（`哈哈 / 我也 / 你是`），没有「整句」可照抄，
    //    该指令因此**完全没有覆盖真实的失败模式**。
    //    实测 394 轮里 M8 逐字复制 2 条（ISTJ「你最」、INTP「那个」）—— 模型把 2 字候选
    //    单独发成一条消息。真人 LCCC 56,917 条里 2 字整条 **0 条**、≤2 字仅 1 条（0.002%），
    //    即该行为不是真人行为，必须禁止。
    //    另一压力源：基座层「短句为主」（`Prompt构建器.ts:85`）让「只发两字」也满足「短句」。
    //    故指令必须**直接点名失败形态**（只发这两个字），并与「短句」显式区分。
    //
    // ⚠️ 格式契约：`：` 与 `；` 之间是候选区，解析方（Writer 回归测试 / 联调 mock）按此切分。
    //    改文案时必须保持该分隔结构，否则「文本内候选 == 回传候选」的一致性断言会失效，
    //    而联调的 M7/M8 依赖这个一致性。
    wenBen: `\n\n（开头两个字请从这几个里挑一个：${houXuan.join(' / ')}；挑完就顺着往下写，后面必须接上真实内容，不能只把挑中的这两个字单独发成一条）`,
    houXuan,
  }
}

/**
 * 把约束文本附加到 user 消息，**保持原类型**：
 * string → 字符串拼接；DuiHuaKuai[] → 追加一个 input_text 内容块。
 * ⚠️ 绝不能把内容块数组当字符串处理：会被 String() 化成 "[object Object]"，
 *    人设卡/聊天记录/策略全毁，且 HTTP 200 无任何异常（审查实测确认）。
 */
export function fuJiaKaiChangYuanYu(
  neiRong: string | DuiHuaKuai[],
  kaiChangYu: string,
): string | DuiHuaKuai[] {
  if (kaiChangYu === '') return neiRong
  if (typeof neiRong === 'string') return neiRong + kaiChangYu
  return [...neiRong, { type: 'input_text', text: kaiChangYu }]
}

/**
 * 校验模型是否服从了约束（仅供联调统计 M7 遵守率，不参与生产决策）。
 * 返回 null 表示首条无法判定。
 */
export function jianChaFuCong(yuanWen: string, houXuan: string[]): boolean | null {
  const shouTiao = qingLiXiaoXi(yuanWen)[0]
  if (!shouTiao) return null
  const token = quChuKaiChangToken(shouTiao)
  if (!token) return null
  return houXuan.some((x) => quChuKaiChangToken(x) === token)
}