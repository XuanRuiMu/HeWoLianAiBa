/**
 * 语域口径唯一实现。真人基线与 AI 实测必须共用本文件，否则口径错位会反转结论。
 */

export const YU_QI_CI = ['嗯', '啊', '呢', '吧', '噢', '哦', '诶', '唔', '嘛', '啦']
export const SHU_ZHENG = [
  '～', '~', '…', '。', '．', '!', '！', '?', '？', '，', ',', '、', '；', ';',
  '：', ':', '”', '"', '’', "'", '）', ')', '（', '(', '《', '》', '【', '】', '.',
]
export const FEN_JU_FEN_JIE = /[，。！？；：、~～…\n,.!?;:]+/
export const WEI_MO_BIAO = /[，。！？；：、~～…\n,.!?;:]/

/**
 * 波浪号（`~` / `～`）消息级占比 —— 第二十二轮新增。
 *
 * 为什么必须放在本文件：`Prompt构建器.ts` 第一层新加了「句尾偶尔拖个 ~ 软化语气」
 * 的约束，并在该文件里立了验收判据「实测 >15% 必须收窄」。但 `tongJi` 此前**没有任何
 * ~ 计数**，导致那条判据在项目现有仪器下**无法执行**（独立审查 BlindSpot P0-2）。
 * 本文件是语域口径唯一实现，故计数必须落在这里，AI 臂与真人臂才能同口径对照。
 *
 * 真人基线（lccc_test 10,000 段 / 29,008 条，实测）：1,189 条 = **0.0410**。
 * ⚠️ 该基线来自微博**评论树**（公开、多观众、跨话题），本项目是微信**一对一私聊**；
 *    `.agents/evidence/validations/FP13_语料全集_2026-10-07.md:87` 已把 LCCC 适用域
 *    限定为「真人朋友/陌生人网友、无亲密关系」。故 0.0410 能否直接当作私聊目标值
 *    **未经校准**——项目对 LCCC 的语域污染已有既存对策（`开场候选约束.ts` 内的
 *    「微博评论区身份词」黑名单），但标点层面**尚无**对应校准。此为已知未验证项。
 */
export const BO_LANG_HAO = ['~', '～']
export const BO_LANG_HAO_ZHEN_REN_JI_XIAN = 0.041

/**
 * 微信口语简写消息级占比 —— 第二十三轮新增。
 *
 * 为什么必须放在本文件（同 `boLangHaoBiLi` 的理由，见上）：第一层新增了「真人打字会用
 * 简写和语气词」的许可型约束，而 LLM 对**许可型措辞存在系统性过度使用倾向**（第二十二轮
 * `~` 实测：首版 26.67% = 基线 6.5 倍，收窄后仍 10.7%）。若没有同口径的测量手段，
 * 这条约束的验收只能靠人读，无法判断它是「自然地用」还是「又变成一个要用的花样」。
 *
 * 真人基线（`.语料工作区/wechat_private_1k.jsonl`，真实微信私聊，Apache-2.0，
 * 逐条 grep 实测）：命中 **51** 条 / 我方消息 **638** 条 = **0.0799**。
 * ⚠️ 口径警告：该基线**只统计下列词表**，而真实简写远不止这些（`u1s1` `tql` `xswl`
 *   `yys` `班味` `cmys` 等数百种网络写法无法穷举）。所以 0.0799 是**下界**，
 *   不是「简写总量」。用它做前后对照是有效的（同一口径），但**不能**用来判断
 *   「整体简写率是否偏高」。
 */
export const JIAN_XIE_DAN = ['🉑', 'wok', 'xs', 'bur', 'tql', 'u1s1', 'xswl', 'yys', 'hhhh', 'hhh', 'hh', 'jrm', 'nd你', 'bf', 'yysy']
/** 同一句里出现 ≥2 个简写即视为「简写刷屏」，真人语料里罕见 */
export const JIAN_XIE_LIU_LIAN = 0
export const JIAN_XIE_ZHEN_REN_JI_XIAN = 0.0799


export function chaiBiaoWenBen(buChaiBiao: string): string {
  return buChaiBiao.replace(/[\s]/g, '').split('').filter((c) => !SHU_ZHENG.includes(c)).join('')
}

/**
 * 入口归一：去掉所有空白。
 * LCCC 等语料已 jieba 分词（词间带空格），不归一会把空格计进字数，
 * 使中位字数虚高一倍、≤10字占比虚低一半。AI 自然文本无空格，本函数对其为恒等变换，
 * 故两侧共用本函数即完成口径对齐。
 */
export function zhengXi(wenBen: string): string {
  return wenBen.replace(/[\s　]+/g, '')
}

export type SheHuoLei = 'wu' | 'duJie' | 'moWei' | 'juZhong'

/**
 * 省略号位置分类（**消息级**，不是句级 —— 一条消息整体判断，不切句）。
 *
 * ⚠️ 口径边界，勿误用：
 * ·本函数按「整条消息」判断省略号在首/尾还是中部，**不切句**。
 *  所以 `我舍友那只也是……一到晚上就往我腿上趴` 判为 `juZhong`（中部），
 *  尽管语义上它是「停顿后继续说」。**不能据此断言它是「口头禅」或与「停顿」
 *  是两种不同病因** —— 那个结论需要句级定位 + 语义判据，当前未建立。
 * · 只认全角 `…`。半角 `...`、纯中文句号整条（`。。。`）一律判 `wu`，
 *   不计入本分类。`B阶段AB.mts` 的 `chunBiaoBiLi` 用的是另一套（含 `。！？，；：`），
 *   两者数值相同属巧合，勿互相引用。
 */
/**
 * 「语气词 + 省略号」共现计数。
 *
 * ⚠️ 为什么必须独立于 `fenLeiSheHao`（第十轮审查后新增）：
 *   第十轮曾据「ISTJ 中部式 0.00%」判定「语气词假说被证伪」，
 *   但 ISTJ 实际输出了 `「嗯…」` —— 因它以 `…` 结尾被 `fenLeiSheHao` 判为
 *   **moWei（首/尾式）**，不计入 `sheHaoJuZhong`。**证伪的不是假说，是指标没测到它。**
 *
 *   本指标直接计「同一条消息里既有 `YU_QI_CI` 语气词、又有省略号」的条数，
 *   **不关心省略号在什么位置**，因此不会被三形态的切分口径漏掉。
 *   人设文案点名语气词时，若这条计数同步升高，即为传导链成立的直接证据
 *   （第十轮实测 G1 语气词密度已是 G4 的 1.61×）。
 */
export function yuQiCiYuSheHaoGongXian(wenBen: string): boolean {
  return wenBen.includes('…') && YU_QI_CI.some((y) => wenBen.includes(y))
}

export function fenLeiSheHao(wenBen: string): SheHuoLei {
  const t = wenBen.trim()
  if (!t.includes('…')) return 'wu'
  if (t.replace(/[\s.…]/g, '') === '') return 'duJie'
  return t.startsWith('…') || t.endsWith('…') ? 'moWei' : 'juZhong'
}

export function zhanChouHouZiFu(ci: string | undefined): string {
  if (!ci) return ''
  const suoYou = Array.from(ci)
  return suoYou[suoYou.length - 1] || ''
}

export function yuQiCiGeShu(wenBen: string): number {
  let shu = 0
  let i = 0
  while (i < wenBen.length) {
    const ci = wenBen[i]
    if (YU_QI_CI.includes(ci)) {
      shu += 1
      i += 1
      continue
    }
    i += 1
  }
  return shu
}

export function shuliFenJu(wenBen: string): string[] {
  return wenBen.split(FEN_JU_FEN_JIE).map((s) => s.trim()).filter((s) => s.length > 0)
}

export interface DanTiaoZhiBiao {
  ziShu: number
  ziShuHanKongGe: number
  ziShuChaiBiao: number
  fenShu: number
  danFenJu: boolean
  danFenJuWuBiao: boolean
  weiMoBiao: boolean
  jvHao: boolean
  yuQiCi: number
  emoji: number
  neiRong: string
}

export function danTiao(wenBen: string): DanTiaoZhiBiao {
  const zhengWen = zhengXi(wenBen)
  const caiBiaoWenBen = chaiBiaoWenBen(zhengWen)
  const fenJu = shuliFenJu(zhengWen)
  const houZiFu = zhanChouHouZiFu(zhengWen.slice(-1))
  return {
    ziShu: Array.from(zhengWen).length,
    ziShuHanKongGe: Array.from(wenBen.trim()).length,
    ziShuChaiBiao: Array.from(caiBiaoWenBen).length,
    fenShu: fenJu.length,
    danFenJu: fenJu.length === 1,
    danFenJuWuBiao: fenJu.length === 1 && !WEI_MO_BIAO.test(zhengWen),
    weiMoBiao: WEI_MO_BIAO.test(houZiFu),
    jvHao: houZiFu === '。' || houZiFu === '.',
    yuQiCi: yuQiCiGeShu(zhengWen),
    emoji: (zhengWen.match(/\p{Extended_Pictographic}/gu) || []).length,
    neiRong: zhengWen,
  }
}

export interface LunZhiBiao {
  tiaoShu: number
  pingJunZiShu: number
  zhongWeiZiShu: number
  pingJunZiShuChaiBiao: number
  zhongWeiZiShuChaiBiao: number
  shiFenWei: number
  shiFengErShi: number
  p10: number
  p90: number
  danFenJuBiLi: number
  danFenJuWuBiaoBiLi: number
  weiMoBiaoBiLi: number
  jvHaoBiLi: number
yuQiCiMiDu: number
  emojiMiDu: number
  sheHaoDuJie: number
  sheHaoMoWei: number
  sheHaoJuZhong: number
  /** 语气词与省略号同现率：不受三形态切分口径影响（第十轮审查新增） */
  yuQiCiSheHaoGongXian: number
  /** 波浪号（`~`/`～`）消息级占比：第二十二轮新增，用于验收第一层的 ~ 软化约束 */
  boLangHaoBiLi: number
  /** 微信口语简写消息级占比：第二十三轮新增，用于验收第一层的简写许可约束 */
  jianXieBiLi: number
  zuiChangZiShu: number
  zuiDuanZiShu: number
  juChangCV: number
}

// ⚠️ fenShu 参数是死参数：函数体从未使用它，调用点也只传 1 个实参。
//    该文件此前位于被 gitignore 的目录、不在 tsc 项目内，故从未被发现。已删。
function fenShi(lieBiao: number[]): number {
  if (lieBiao.length === 0) return 0
  return Number((lieBiao.filter((x) => x <= 10).length / lieBiao.length).toFixed(4))
}

function baiFenWei(lieBiao: number[]): number {
  if (lieBiao.length === 0) return 0
  return Number((lieBiao.filter((x) => x <= 20).length / lieBiao.length).toFixed(4))
}

function fenShuZhi(buJingXu: number[], fenShu: number): number {
  if (buJingXu.length === 0) return 0
  const paiXu = [...buJingXu].sort((a, b) => a - b)
  const weiZhi = fenShu * (paiXu.length - 1)
  const xia = Math.floor(weiZhi)
  const shang = Math.ceil(weiZhi)
  return paiXu[xia] + (paiXu[shang] - paiXu[xia]) * (weiZhi - xia)
}

export function tongJi(xiaoXiLieBiao: string[]): LunZhiBiao {
  const youXiao = xiaoXiLieBiao.map((x) => x.trim()).filter((x) => x.length > 0)
  if (youXiao.length === 0) {
    return {
      tiaoShu: 0, pingJunZiShu: 0, zhongWeiZiShu: 0, pingJunZiShuChaiBiao: 0, zhongWeiZiShuChaiBiao: 0,
      shiFenWei: 0, shiFengErShi: 0, p10: 0, p90: 0, danFenJuBiLi: 0, danFenJuWuBiaoBiLi: 0,
      weiMoBiaoBiLi: 0, jvHaoBiLi: 0, yuQiCiMiDu: 0, emojiMiDu: 0,
      sheHaoDuJie: 0, sheHaoMoWei: 0, sheHaoJuZhong: 0, yuQiCiSheHaoGongXian: 0,
      boLangHaoBiLi: 0, jianXieBiLi: 0,
      zuiChangZiShu: 0, zuiDuanZiShu: 0, juChangCV: 0,
    }
  }
const biao = youXiao.map((x) => danTiao(x))
  const sheHaoLei = youXiao.map((x) => fenLeiSheHao(x))
  const gongXian = youXiao.filter((x) => yuQiCiYuSheHaoGongXian(x)).length
  const sheHaoLv = (lei: SheHuoLei) => Number((sheHaoLei.filter((x) => x === lei).length / youXiao.length).toFixed(4))
  const ziShuLie = biao.map((b) => b.ziShu)
const chaiLie = biao.map((b) => b.ziShuChaiBiao)
  const pingJun = ziShuLie.reduce((a, b) => a + b, 0) / ziShuLie.length

  // 轮内句长 CV：把本轮全部消息归一后拼接切句（与真人基线同口径）
  const pinJieJuShu = shuliFenJu(zhengXi(youXiao.join(' '))).map((j) => Array.from(j).length)
  const juPingJun = pinJieJuShu.reduce((a, b) => a + b, 0) / Math.max(1, pinJieJuShu.length)
  const juFangCha = pinJieJuShu.reduce((a, b) => a + (b - juPingJun) ** 2, 0) / Math.max(1, pinJieJuShu.length)

  return {
    tiaoShu: youXiao.length,
    pingJunZiShu: Number(pingJun.toFixed(2)),
    zhongWeiZiShu: fenShuZhi(ziShuLie, 0.5),
    pingJunZiShuChaiBiao: Number((chaiLie.reduce((a, b) => a + b, 0) / chaiLie.length).toFixed(2)),
    zhongWeiZiShuChaiBiao: fenShuZhi(chaiLie, 0.5),
    shiFenWei: fenShi(ziShuLie),
    shiFengErShi: baiFenWei(ziShuLie),
    p10: fenShuZhi(ziShuLie, 0.1),
    p90: fenShuZhi(ziShuLie, 0.9),
    danFenJuBiLi: Number((biao.filter((b) => b.danFenJu).length / biao.length).toFixed(4)),
    danFenJuWuBiaoBiLi: Number((biao.filter((b) => b.danFenJuWuBiao).length / biao.length).toFixed(4)),
    weiMoBiaoBiLi: Number((biao.filter((b) => b.weiMoBiao).length / biao.length).toFixed(4)),
    jvHaoBiLi: Number((biao.filter((b) => b.jvHao).length / biao.length).toFixed(4)),
    yuQiCiMiDu: Number((biao.reduce((a, b) => a + b.yuQiCi, 0) / biao.length).toFixed(3)),
emojiMiDu: Number((biao.reduce((a, b) => a + b.emoji, 0) / biao.length).toFixed(4)),
    sheHaoDuJie: sheHaoLv('duJie'),
    sheHaoMoWei: sheHaoLv('moWei'),
    sheHaoJuZhong: sheHaoLv('juZhong'),
    yuQiCiSheHaoGongXian: Number((gongXian / youXiao.length).toFixed(4)),
    boLangHaoBiLi: Number((youXiao.filter((x) => x.includes('~') || x.includes('～')).length / youXiao.length).toFixed(4)),
    jianXieBiLi: Number((youXiao.filter((x) => JIAN_XIE_DAN.some((c) => x.includes(c))).length / youXiao.length).toFixed(4)),
    zuiChangZiShu: Math.max(...ziShuLie),
    zuiDuanZiShu: Math.min(...ziShuLie),
    juChangCV: juPingJun > 0 ? Number((Math.sqrt(juFangCha) / juPingJun).toFixed(3)) : 0,
  }
}

export interface DuiBiXing {
  ming: string
  danWei: string
  qiJia: number
  ren: number
  beiLv: number | null
  yiCiXiang: 'gao' | 'di' | 'xiangJin'
}

export function duiBi(qiJia: LunZhiBiao, ren: LunZhiBiao, xuanZe: Array<[string, string]>): DuiBiXing[] {
  return xuanZe.map(([ming, danWei]) => {
const a = (qiJia as unknown as Record<string, number>)[ming] ?? 0
    const b = (ren as unknown as Record<string, number>)[ming] ?? 0
    const beiLv = b === 0 ? null : Number((a / b).toFixed(2))
    const cha = Math.abs(a - b)
    const yiCiXiang = cha <= Math.max(Math.abs(b) * 0.15, 0.02) ? 'xiangJin' : (a > b ? 'gao' : 'di')
    return { ming, danWei, qiJia: a, ren: b, beiLv, yiCiXiang }
  })
}

export function duiBiBiao(duiBiLie: DuiBiXing[]): string {
  const tou = '| 指标 | 单位 | AI 实测 | 真人基线 | 偏离 | 判定 |'
  const fen = '| --- | --- | --- | --- | --- | --- |'
  const xing = duiBiLie
    .map(
      (x) =>
        `| ${x.ming} | ${x.danWei} | ${x.qiJia} | ${x.ren} | ${x.beiLv === null ? 'n/a' : `${x.beiLv}×`} | ${
          x.yiCiXiang === 'xiangJin' ? '接近' : x.yiCiXiang === 'gao' ? '**偏高**' : '**偏低**'
        } |`,
    )
    .join('\n')
  return `${tou}\n${fen}\n${xing}`
}
