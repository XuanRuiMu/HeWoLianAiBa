import { AI_PEI_ZHI } from '../config/AI配置'
import { huoQuFanYi } from '../config/translations'
import { gouJianDanTiaoTuXiangKuai, meiTiZhanShiWenBen, shiTuXiangLeiBie } from './AI视觉辅助'
import { gouJianYuYinKeDuWenBen, tiQuYinPinShiJian } from './语音理解'
import { gouJianShiPinKeDuWenBen } from './视频多模态'
import type { DuiHuaKuai } from '../utils/DeepSeek客户端'
import type { DuiHuaLiShiXiang } from '../types'

/**
 * FP-08 对话上下文唯一渲染入口。
 *
 * 根因（用户问题 #15「AI 臆造用户又发了狗头表情包」）：同一条用户消息在同一轮 prompt 里
 * 被写两遍（历史块 + 「对方刚发给你的消息」），历史图片又每轮全量重投成 base64 图块，
 * 于是用户发 1 张表情包，模型单轮看到 3 次、跨轮继续累积 → 「第三个狗头」自洽。
 *
 * 本文件把「一条消息 → prompt 文本」「历史 → 历史块」「历史 → 图片块」收敛为唯一出口，
 * 并保证同一轮内历史块与焦点消息块互斥（焦点那一条只出现在「刚发给你的消息」处）。
 */

/** 载体占位符语义：只描述载体，不复写方括号标记本身，避免与历史里的真标记撞计数 */
export const ZAI_TI_BIAO_JI_SHUO_MING =
  '内容里的方括号只是系统标的发送载体标记：图片=对方发了张图片，表情包=对方发了个表情包，语音(N秒)=对方发了条语音，视频、文件 同理，已撤回=那条被对方撤回。它们只在对方真的发来对应载体时才会出现在那一行里；对方发的是普通文字就只会是文字。这些标记不是对方说的话、不是对方的口头禅也不是昵称，不许自己数它们出现了几次，不许把没发来过的载体说成对方发过，更不许拿它们当梗反复引用。'

export interface ZhuangZaiBuFen {
  视频画面描述?: string | null
  视频转写文本?: string | null
}

function shiShiPinWenjian(xiaoXi: DuiHuaLiShiXiang): boolean {
  const ming = xiaoXi.yuanShiWenJianMing || ''
  const xiaoMIME = (xiaoXi.meiTiMIME || '').toLowerCase()
  return (
    xiaoMIME.startsWith('video/') ||
    ming.toLowerCase().match(/\.(mp4|mov|webm|m4v)$/) !== null
  )
}

/**
 * FP-08c（缺陷5）引用段在模型文本里的**唯一形态**：`引用[发送者]: 原文`，独占一行、排在本条正文之前。
 * 例：`引用[小美]: 我明天有空\n那你来找我`。可解析性判据＝行首 `引用[` 到该行行尾是引用段，
 * 其后到本条结束是正文；正文本身逐字不变（不改 内容 投影的既有语义）。
 * 原文一律按 `beiYongXiaoXiId` 在整会话列表里现取（引用摘要不落库，见 services/消息.ts），
 * 目标已撤回 ⇒ 只出撤回占位（既有翻译键，撤回的语义＝原文不再进模型），
 * 目标不在列表（窗口外/已被 FK SET NULL）⇒ 整段不渲染且不抛异常。
 * 引用只展开一层：被引用的那条自己带的引用不再递归渲染，避免模型看到无界嵌套。
 * 注入面：引用原文与消息正文同为用户可控文本，此处只加机器可判定的行前缀，不加任何指令语、
 * 不改写内容，也不新增长度口径（截断与清洗沿正文既有面，见 FP-12 的提取阈值单点定义）。
 */
export const YIN_YONG_ZHAN_SHI_QIAN_ZHUI = '引用'

/** 按行 ID 现取被引用消息的回口：唯一由整会话列表构造，禁止第二份查表实现 */
export type YinYongChaXun = (xiaoXiId: string) => DuiHuaLiShiXiang | null

export function gouJianYinYongChaXun(liShi: DuiHuaLiShiXiang[]): YinYongChaXun {
  const suo = new Map<string, DuiHuaLiShiXiang>()
  for (const xiang of liShi) {
    if (xiang.id && !suo.has(xiang.id)) suo.set(xiang.id, xiang)
  }
  return (xiaoXiId: string) => suo.get(xiaoXiId) ?? null
}

/** 引用段一行；无引用槽 / 自引用 / 目标取不到 ⇒ 空串（调用方据此不加分隔换行） */
function zhanShiYinYongHang(xiaoXi: DuiHuaLiShiXiang, chaXun: YinYongChaXun): string {
  const beiYongId = xiaoXi.beiYongXiaoXiId
  if (!beiYongId || beiYongId === xiaoXi.id) return ''
  const muBiao = chaXun(beiYongId)
  if (!muBiao) return ''
  const neiRong = muBiao.yi_che_hui
    ? huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
    : zhanShiZaiTiZhengWen(muBiao)
  return `${YIN_YONG_ZHAN_SHI_QIAN_ZHUI}[${muBiao.fa_song_zhe_ming}]: ${neiRong}`
}

/** 唯一「一条消息 → prompt 正文」入口：语音/视频给可读文本，其余载体给占位符，撤回走撤回口径 */
export function zhanShiXiaoXiZhengWen(
  xiaoXi: DuiHuaLiShiXiang,
  buFen?: ZhuangZaiBuFen,
  chaXun?: YinYongChaXun,
): string {
  const zhengWen = zhanShiZaiTiZhengWen(xiaoXi, buFen)
  if (!chaXun) return zhengWen
  const yinYong = zhanShiYinYongHang(xiaoXi, chaXun)
  return yinYong ? `${yinYong}\n${zhengWen}` : zhengWen
}

/**
 * FP-12：文件正文进模型的**唯一**边界围栏。文件正文是不可信数据，因此形态必须机器可判定且
 * 用户无法伪造边界：先中和正文里出现的成对围栏字面量与 `<|` `|>` 分隔符，再整体包进围栏；
 * 围栏之后的声明行走翻译键（`liaoTian.wenJianZhengWenShengMing`），截断标注只在真截断时追加。
 * 本函数不查库、不读盘、不解析文档：正文一律由 services/文档文本提取 预先挂在 `wenJianTiQu` 上。
 */
export const WEN_JIAN_KUAI_KAI = '<WEN_JIAN_ZHENG_WEN>'
export const WEN_JIAN_KUAI_BI = '</WEN_JIAN_ZHENG_WEN>'

function zhongHeFengLanNeiBiaoJi(wenBen: string): string {
  return wenBen
    .split(WEN_JIAN_KUAI_BI)
    .join('⟨/WEN_JIAN_ZHENG_WEN⟩')
    .split(WEN_JIAN_KUAI_KAI)
    .join('⟨WEN_JIAN_ZHENG_WEN⟩')
    .replace(/<\|/g, '⟨|')
    .replace(/\|>/g, '|⟩')
}

/** 文档正文块：只给「未撤回 + 阈值内提取成功」的文件行产生，其余返回空串（沿用 `[文件:名]` 占位） */
function zhanShiWenJianNeiRongKuai(xiaoXi: DuiHuaLiShiXiang): string {
  const tiQu = xiaoXi.wenJianTiQu
  if (xiaoXi.yi_che_hui || !tiQu || tiQu.wenBen.trim() === '') return ''
  const shengMing = [huoQuFanYi('liaoTian', 'wenJianZhengWenShengMing')]
  if (tiQu.beiCaiDuan) shengMing.push(huoQuFanYi('liaoTian', 'wenJianZhengWenBeiCaiDuan'))
  return `${WEN_JIAN_KUAI_KAI}\n${zhongHeFengLanNeiBiaoJi(tiQu.wenBen)}\n${WEN_JIAN_KUAI_BI}\n${shengMing.join('')}`
}

function zhanShiZaiTiZhengWen(xiaoXi: DuiHuaLiShiXiang, buFen?: ZhuangZaiBuFen): string {
  if (xiaoXi.meiTiLeiBie === 'yuyin' && !xiaoXi.yi_che_hui) {
    const zhuanXie = (xiaoXi.nei_rong || '').trim()
    if (zhuanXie) {
      return gouJianYuYinKeDuWenBen({
        zhuanXieWenBen: zhuanXie,
        yinPinShiJianMiaoShu: tiQuYinPinShiJian(zhuanXie),
        shiChangHaoMiao: xiaoXi.meiTiShiChangHaoMiao ?? null,
      })
    }
  }
  if (xiaoXi.meiTiLeiBie === 'wenjian' && !xiaoXi.yi_che_hui && shiShiPinWenjian(xiaoXi)) {
    const zhuanXie = (xiaoXi.nei_rong || '').trim()
    return gouJianShiPinKeDuWenBen({
      wenJianMing: xiaoXi.yuanShiWenJianMing || '视频',
      mime: xiaoXi.meiTiMIME,
      shiChangHaoMiao: xiaoXi.meiTiShiChangHaoMiao ?? null,
      zhuanXieWenBen: (buFen?.视频转写文本 || '').trim() || zhuanXie || null,
      huaMianMiaoShu: buFen?.视频画面描述 ?? null,
    })
  }
  // FP-10：图文混排行的正文本身已按块顺序内联了载体占位符，绝不能再被「单占位符覆盖正文」
  // 吃掉半条消息；撤回行不适用此豁免（撤回口径保持既有占位符形态，不外泄原顺序里的正文）
  if (!(xiaoXi.tuWenHunPai && !xiaoXi.yi_che_hui)) {
    const meiTiMiaoShu = meiTiZhanShiWenBen(xiaoXi.meiTiLeiBie, {
      yiCheHui: xiaoXi.yi_che_hui,
      shiChangHaoMiao: xiaoXi.meiTiShiChangHaoMiao,
      yuanShiWenJianMing: xiaoXi.yuanShiWenJianMing,
      mime: xiaoXi.meiTiMIME,
    })
    if (meiTiMiaoShu) {
      // FP-12：阈值内的文档正文紧跟载体占位符同处一行段落下；拿不到正文就是原来的占位形态，
      // 不是「空正文」也不是报错 —— 超阈值/不支持/解析失败三类都收敛成这一条出口
      const wenJianKuai = zhanShiWenJianNeiRongKuai(xiaoXi)
      return wenJianKuai ? `${meiTiMiaoShu}\n${wenJianKuai}` : meiTiMiaoShu
    }
  }
  // FP-26（撤回语义＝原文不再进模型）：撤回行一律只出撤回占位，且**不得回落 `nei_rong`**——
  // 撤回写口（services/消息.ts、services/账号封禁.ts）只把 `原始内容 = 内容` 另存一份，
  // `内容` 列本身没清空，而 `AI输入准备` 的历史正文正是读 `内容` 列，
  // 所以「删掉旧 `[已撤回，原始内容：X]` 分支」等于把原文换个字段继续喂模型。
  // 旧形态 `[已撤回，原始内容：X]` → 新形态 `对方撤回了一条消息`（既有翻译键，未新造文案）；
  // 带媒体的撤回行仍走上面的媒体撤回占位（如 `[用户撤回了一张图片]`），载体可辨识性不退。
  if (xiaoXi.yi_che_hui) return huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
  return xiaoXi.nei_rong
}

/** 历史里最后一条用户消息（与「对方刚发给你的消息」同源，扫描规则唯一） */
export function quZuiXinYongHuXiaoXiXiang(
  liShi: DuiHuaLiShiXiang[],
): DuiHuaLiShiXiang | null {
  for (let i = liShi.length - 1; i >= 0; i--) {
    if (liShi[i].fa_song_zhe_lei_xing === 'yonghu') return liShi[i]
  }
  return null
}

/**
 * FP-09 本轮焦点消息：优先「触发本轮的那一条」（按消息 ID 精确命中），
 * 命中不到才回落到「历史末条用户消息」的旧口径。
 *
 * 根因：只按末条用户消息取焦点时，一旦那条用户消息因序号撞号被吞（F16），
 * 焦点就退回上一条旧消息 ⇒ 上下文没变 ⇒ 重跑出同一条回复（缺陷8「连发两条一样」）。
 * 焦点判定仍只有本文件这一个入口，禁第二份扫描规则。
 */
export function quBenLunJiaoDianXiaoXiXiang(
  liShi: DuiHuaLiShiXiang[],
  quDongXiaoXiId?: string | null,
): DuiHuaLiShiXiang | null {
  if (quDongXiaoXiId) {
    for (let i = liShi.length - 1; i >= 0; i--) {
      if (liShi[i].id === quDongXiaoXiId && liShi[i].fa_song_zhe_lei_xing === 'yonghu') return liShi[i]
    }
  }
  return quZuiXinYongHuXiaoXiXiang(liShi)
}

export interface LiShiFenQu {
  /** 历史块要渲染的消息：已剔除焦点那一条，保证同一轮不重复呈现 */
  背景: DuiHuaLiShiXiang[]
  /** 渲染到「对方刚发给你的消息」处的那一条；没有用户消息时为 null */
  焦点: DuiHuaLiShiXiang | null
}

/** 把历史切成「背景历史」+「本轮焦点消息」，两者互斥且并集等于原历史 */
export function fenGeZuiXinYongHuXiaoXi(liShi: DuiHuaLiShiXiang[]): LiShiFenQu {
  for (let i = liShi.length - 1; i >= 0; i--) {
    if (liShi[i].fa_song_zhe_lei_xing === 'yonghu') {
      return { 背景: liShi.slice(0, i), 焦点: liShi[i] }
    }
  }
  return { 背景: liShi, 焦点: null }
}

export interface LiShiXuanXiang {
  角色名: string
  用户名: string
  最多条数?: number
  时间在前?: boolean
}

/** 唯一「消息序列 → 历史文本块」入口；空历史返回空串，由调用方决定兜底文案 */
export function zhanShiLiShiWenBen(
  liShi: DuiHuaLiShiXiang[],
  xuanXiang: LiShiXuanXiang,
): string {
  const zuiDa = xuanXiang.最多条数 ?? AI_PEI_ZHI.prompt.liShiXiaoXiShuLiang
  const buZhang = Math.max(1, AI_PEI_ZHI.prompt.liShiCaiDuanBuZhang)
  // 淘汰边界要按「会话内绝对位置」量化：取数窗口每轮整体滑动一条，只按数组长度对齐会每轮换掉
  // 历史段首行，官方前缀缓存随即整段失效（超长历史实测命中率仅 1.9%）。总条数缺失时退回按长度对齐。
  // 保留条数天然 ≤ zuiDa + buZhang：起点 = floor((T - zuiDa)/buZhang)*buZhang ≥ T - zuiDa - buZhang + 1。
  const zongShu = liShi[0]?.duiHuaZongTiaoShu
  const youZongShu = typeof zongShu === 'number' && zongShu >= liShi.length
    && liShi.every((x) => x.duiHuaZongTiaoShu === zongShu)
  const liQi = youZongShu
    ? Math.max(0, Math.min(liShi.length, Math.floor(Math.max(0, zongShu - zuiDa) / buZhang) * buZhang - (zongShu - liShi.length)))
    : Math.floor(Math.max(0, liShi.length - zuiDa) / buZhang) * buZhang
  const zuiJin = liShi.slice(liQi)
  if (zuiJin.length === 0) return ''
  // 引用回口按**取到的整份列表**建索引（含窗口头部被淘汰的那一段）：被引用那条往往就在紧邻的
  // 旧消息里，只按渲染切片建索引会让刚发出的引用读不到原文
  const chaXun = gouJianYinYongChaXun(liShi)

  return zuiJin
    .map((xiaoXi) => {
      const faSongZhe =
        xiaoXi.fa_song_zhe_lei_xing === 'jiaose' ? xuanXiang.角色名 : xuanXiang.用户名
      return xuanXiang.时间在前
        ? `[${xiaoXi.shi_jian}] ${faSongZhe}: ${zhanShiXiaoXiZhengWen(xiaoXi, undefined, chaXun)}`
        : `${faSongZhe}(${xiaoXi.shi_jian}): ${zhanShiXiaoXiZhengWen(xiaoXi, undefined, chaXun)}`
    })
    .join('\n')
}

/**
 * 本轮尚未被模型看过的用户消息：末尾连续的用户消息段（回扫到最近一条角色/系统消息为止）。
 * 已读不回时该段会跨轮保留——模型上一轮确实没回，这条还得再给一次，属预期行为。
 */
export function quBenLunDengDaiHuiFuXiang(liShi: DuiHuaLiShiXiang[]): DuiHuaLiShiXiang[] {
  let qi = liShi.length
  while (qi > 0 && liShi[qi - 1].fa_song_zhe_lei_xing === 'yonghu') qi--
  return liShi.slice(qi)
}

/**
 * FP-08 图片注入策略：只投「本轮新增」的用户图片，不再每轮把全部历史图重投一遍。
 *
 * 理由：AI 调用是无状态的，历史文本每轮重发，旧图若也每轮重发，模型会在同一轮里
 * 把同一张表情包看到 N 次（文本占位符 + 图块），再跨轮累积，就成了「对方又发了狗头」
 * 「第三个了」这类臆造；同时每张 base64 图按 384 token 计费，200 条全图历史的开销不可接受。
 * 代价：模型无法跨轮重新查看旧图像素，旧图只剩文本占位符可用；
 * 上限只作内存兜底（连发一大串图时不至于一次读入全部 base64）。
 */
export async function zhuRuBenLunTuXiangKuai(
  liShi: DuiHuaLiShiXiang[],
): Promise<DuiHuaKuai[]> {
  const shangXian = AI_PEI_ZHI.prompt.benLunTuXiangZuiDuoZhuRuShu
  const houXuan = quBenLunDengDaiHuiFuXiang(liShi).filter(
    (xiang) => !xiang.yi_che_hui && shiTuXiangLeiBie(xiang.meiTiLeiBie),
  )
  const jieGuo: DuiHuaKuai[] = []
  for (const xiang of houXuan.slice(-shangXian)) {
    jieGuo.push(...(await gouJianDanTiaoTuXiangKuai(xiang)))
  }
  return jieGuo
}
