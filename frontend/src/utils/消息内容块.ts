import { XIAO_XI_KUAI_PEI_ZHI, TU_PIAN_XIAO_XI_LEI_XING, XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import type { XiaoXiKuai, XiaoXiKuaiChuCan, XiaoXiKuaiLeiXing, 消息 } from '@/types'

/**
 * FP-10b（缺陷9「QQ 式图文混排」）前端侧的**唯一**消息内容块真源模块，
 * 契约与 backend/src/services/消息内容块.ts 同源（块值域、顺序、兼容投影口径）。
 *
 * 三条前端不变式（全部由 __tests__/FP10b图文混排.test.ts 钉住）：
 *  ①顺序即用户排的顺序：编辑区产出的块数组原序提交，渲染按服务端回读的原序出参画，
 *    中途不做任何排序/分组/去重（去重会让「同一张图连发两次」变成一条）。
 *  ②反构等价：`nei_rong_kuai` 缺失（旧服务端/旧客户端）时按 内容 + 媒体ID + 类型反构等价块数组。
 *    块渲染的门槛是**含图片块**（需求 #6 的终态判据，FP-10a 反转，见 `shiXuYaoKuaiXuanRan`
 *    上方注释）：纯图 / 纯贴纸行也按块画；反构不出图片块的行（语音 / 文件 / 媒体 ID 丢失的脏行）
 *    判 false，继续吃改造前的媒体分支，那种行的渲染结果与改造前逐字一致。
 *  ③脏数据不崩：形状怪异的块逐块丢弃，非数组/坏 JSON 按「没有块」处理并回退反构，
 *    绝不因单个脏块抛错（服务端同样只降级不 500）。
 *
 * 拼写债收口：块值域只有 `wenzi` / `tupian` 两个权威值（`XIAO_XI_KUAI_LEI_XING` 单源），
 * 消息类型的图片权威值是 `tuPian`（`MEI_TI_XIAO_XI_LEI_XING` 单源）。历史上写进消息值域的
 * `'tupian'` 已在 types 里删除，读取边界由 `guiYiXiaoXiLeiXing` 归一；**不改动任何已落库行**。
 */

export const XIAO_XI_KUAI_LEI_XING = { wenZi: 'wenzi', tuPian: 'tupian' } as const

/** 媒体类别里「能进图片块」的两类；与后端 AI视觉辅助::shiTuXiangLeiBie 同集合，不建第二份对应表 */
const TU_XIANG_MEI_TI_LEI_BIE = new Set<string>(['tupian', 'biaoqingshu'])

/**
 * 贴纸类媒体类别的唯一字面量（媒体文件.类别 的存量码）。它同时是**判定**的输入与**生产**的取值：
 *  - 判定：本模块的 `shiBiaoQingBaoMeiTiLeiBie` / `shiBiaoQingBaoKuai`；
 *  - 生产：表情面板选中的贴纸进待发块序列时，页面经本出口写进块的 `mei_ti_lei_bie`
 *    （`views/聊天页面.vue::jiaRuDaiFaTieZhi`，FP-10a）。
 * 呈现侧要知道这件事：贴纸按照片那套 `object-fit: cover` + 180×200 画就会被裁，
 * 必须走 `contain` + 方形尺寸。除本模块与 `stores/聊天.ts` 的上传类别入参外，
 * 任何 .vue 里再出现 `biaoqingshu` 字面量即由 __tests__/FP24a表情包块渲染.test.ts 拦红。
 */
export const BIAO_QING_BAO_MEI_TI_LEI_BIE = 'biaoqingshu'

/**
 * 图片块在兼容投影里的载体占位符集合。历史行的 `nei_rong` 若恰好等于其中之一，
 * 那串字符**就是这张图本身的投影**（后端 paiShengJianRong 的产物），不是用户另打的字；
 * 反构时再把它当成一个文字块，一条旧的纯图片行就会画出「图 + 一串方括号占位符」，
 * 与本模块不变式①（顺序即用户排的顺序：用户没打过那串字）直接矛盾。
 */
const ZAI_TI_ZHAN_WEI = new Set<string>([
  XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei,
  XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei,
])

const UUID_GE_SHI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function shiUUID(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && UUID_GE_SHI.test(zhi.trim().toLowerCase())
}

/**
 * 块类型边界归一：只认块命名空间的两个权威值（大小写不敏感，容忍 `'tuPian'` 形态的误写），
 * 并额外把消息类型的 `wenben` 归到 `wenzi` —— 两者是不同值域，这里的宽进只发生在读取边界，
 * 提交侧一律经 `keTiJiaoKuai` 归回权威值。认不出的返回 null 交由调用方丢弃该块。
 */
export function guiYiKuaiLeiXing(zhi: unknown): XiaoXiKuaiLeiXing | null {
  if (typeof zhi !== 'string') return null
  const xiaoXie = zhi.trim().toLowerCase()
  if (xiaoXie === XIAO_XI_KUAI_LEI_XING.wenZi || xiaoXie === 'wenben') return XIAO_XI_KUAI_LEI_XING.wenZi
  if (xiaoXie === XIAO_XI_KUAI_LEI_XING.tuPian) return XIAO_XI_KUAI_LEI_XING.tuPian
  return null
}

/** 消息类型图片码的边界归一：把误写的 `'tupian'` 收回到权威值 `'tuPian'`，其余原样返回 */
export function guiYiXiaoXiLeiXing(leiXing: unknown): string {
  if (typeof leiXing !== 'string') return 'wenben'
  const xiaoXie = leiXing.trim().toLowerCase()
  if (xiaoXie === 'tupian') return 'tuPian'
  if (xiaoXie === 'biaoqingbao') return 'biaoQingBao'
  if (xiaoXie === 'yuyin') return 'yuYin'
  if (xiaoXie === 'wenjian') return 'wenJian'
  return leiXing
}

export function shiTuXiangMeiTiLeiBie(leiBie: unknown): boolean {
  return typeof leiBie === 'string' && TU_XIANG_MEI_TI_LEI_BIE.has(leiBie)
}

/** 图像类媒体里「贴纸/表情包」那一类的判定（与 shiTuXiangMeiTiLeiBie 同族、同文件、同一份值域） */
export function shiBiaoQingBaoMeiTiLeiBie(leiBie: unknown): boolean {
  return (
    typeof leiBie === 'string' && leiBie.trim().toLowerCase() === BIAO_QING_BAO_MEI_TI_LEI_BIE
  )
}

/**
 * 块级类别判定：是图片块 **且** 媒体类别是贴纸 ⇒ 按表情包呈现（方形 + `contain`），
 * 不沿用照片那套 180×200 + `cover`（那会把贴纸的透明边缘裁掉）。
 * 认不出类别（缺字段/脏值）一律按照片画：出参侧后端 `services/消息.ts` 的
 * `yingSheKuaiChuCan` 对每个图片块都保证给出 `mei_ti_lei_bie`（缺则按消息类型兜底），
 * 因此"缺类别"只剩脏数据一种可能，此时不做二次猜测。
 */
export function shiBiaoQingBaoKuai(
  kuai: { lei_xing?: unknown; mei_ti_lei_bie?: unknown } | null | undefined,
): boolean {
  if (!kuai) return false
  return (
    guiYiKuaiLeiXing(kuai.lei_xing) === XIAO_XI_KUAI_LEI_XING.tuPian &&
    shiBiaoQingBaoMeiTiLeiBie(kuai.mei_ti_lei_bie)
  )
}

/** 图片块的展示地址：只采信服务端签发的块级地址，前端不自行拼签名 URL */
function nianKuaiMeiTiUrl(xiang: Record<string, unknown>): string | null {
  const zhi = xiang.mei_ti_url
  return typeof zhi === 'string' && zhi !== '' ? zhi : null
}

/**
 * 出参块数组归一（读取边界）。非数组 / 坏 JSON 字符串 / 全是不认识的块 ⇒ null，
 * 由调用方回退 `fanGouKuaiCongXiaoXi`；图片块只保留合法 UUID，文字块保留原文（不 trim，
 * 服务端已清洗过，前端再改字形就会和投影 `nei_rong` 逐字对不上）。
 */
export function guiYiKuaiLieBiao(zhi: unknown): XiaoXiKuaiChuCan[] | null {
  let shuZu: unknown = zhi
  if (typeof shuZu === 'string') {
    const miao = shuZu.trim()
    if (miao === '') return null
    try {
      shuZu = JSON.parse(miao)
    } catch {
      return null
    }
  }
  if (!Array.isArray(shuZu)) return null
  const jieGuo: XiaoXiKuaiChuCan[] = []
  for (const yuan of shuZu) {
    if (typeof yuan !== 'object' || yuan === null || Array.isArray(yuan)) continue
    const xiang = yuan as Record<string, unknown>
    const leiXing = guiYiKuaiLeiXing(xiang.lei_xing)
    if (!leiXing) continue
    if (leiXing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      if (!shiUUID(xiang.mei_ti_id)) continue
      const kuai: XiaoXiKuaiChuCan = {
        lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
        mei_ti_id: typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : '',
      }
      const url = nianKuaiMeiTiUrl(xiang)
      if (url) kuai.mei_ti_url = url
      if (typeof xiang.mei_ti_lei_bie === 'string') kuai.mei_ti_lei_bie = xiang.mei_ti_lei_bie
      jieGuo.push(kuai)
      continue
    }
    jieGuo.push({
      lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi,
      nei_rong: typeof xiang.nei_rong === 'string' ? xiang.nei_rong : '',
    })
  }
  return jieGuo.length > 0 ? jieGuo : null
}

/**
 * 历史行反构（前端侧的等价实现，口径与后端 fanGouKuai 一致）：
 * 媒体行 = 载体块在前、随附文字在后；非图像类（语音/文件）不造图片块，只留文字块。
 * 图像类消息（tuPian / biaoQingBao）但 `mei_ti_id` 为空的脏行造不出图片块 ⇒ 判 false，
 * 由页面侧的图片/表情包媒体分支按消息级地址兜底画。
 */
export function fanGouKuaiCongXiaoXi(
  xiaoXi: Pick<消息, 'nei_rong' | 'lei_xing' | 'mei_ti_id' | 'mei_ti_url' | 'mei_ti_lei_bie'>,
): XiaoXiKuaiChuCan[] {
  const jieGuo: XiaoXiKuaiChuCan[] = []
  const leiXing = guiYiXiaoXiLeiXing(xiaoXi.lei_xing)
  const shiTuXiang =
    (TU_PIAN_XIAO_XI_LEI_XING as readonly string[]).includes(leiXing) ||
    shiTuXiangMeiTiLeiBie(xiaoXi.mei_ti_lei_bie)
  const meiTiId = typeof xiaoXi.mei_ti_id === 'string' && xiaoXi.mei_ti_id ? xiaoXi.mei_ti_id : ''
  const youTuXiangKuai = shiTuXiang && meiTiId !== ''
  if (youTuXiangKuai) {
    jieGuo.push({
      lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
      mei_ti_id: meiTiId,
      ...(xiaoXi.mei_ti_url ? { mei_ti_url: xiaoXi.mei_ti_url } : {}),
      ...(xiaoXi.mei_ti_lei_bie ? { mei_ti_lei_bie: xiaoXi.mei_ti_lei_bie } : {}),
    } as XiaoXiKuaiChuCan)
  }
  const neiRong = typeof xiaoXi.nei_rong === 'string' ? xiaoXi.nei_rong : ''
  if (neiRong !== '' && !(youTuXiangKuai && ZAI_TI_ZHAN_WEI.has(neiRong))) {
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: neiRong })
  }
  if (jieGuo.length === 0) jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: '' })
  return jieGuo
}

/** 渲染用块数组：服务端给了就采信，没给（旧服务端/旧客户端）就本地反构 */
export function huoQuXianShiKuai(xiaoXi: 消息): XiaoXiKuaiChuCan[] {
  return guiYiKuaiLieBiao(xiaoXi.nei_rong_kuai) ?? fanGouKuaiCongXiaoXi(xiaoXi)
}

function youTuPianKuai(kuai: XiaoXiKuai[]): boolean {
  return kuai.some((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian)
}

/**
 * 是否改走「按块顺序渲染」。判据 = **含图片块**（FP-10a 按需求 #6 反转后的终态；
 * 反转前的过渡口径曾是「含图片块且块数 ≥ 2」，它把纯图 / 纯贴纸行留在媒体分支里，
 * 使图文同区对这类行不成立）。纯文本、以及反构不出图片块的行（语音 / 文件 /
 * 块里的媒体 ID 非法或缺失）⇒ false。
 *
 * 【反转后 `views/聊天页面.vue` 图片 / 表情包两条媒体分支的可达性 —— 都留着，别当死代码删】
 *  正常行（服务端回读 `nei_rong_kuai`，或历史行能反构出图片块）改走块渲染，那两支不再命中；
 *  它们仍是兜底：`nei_rong_kuai` 缺失/全脏（旧服务端、旧客户端）且 `mei_ti_id` 为空或非法时，
 *  反构只剩文字块 ⇒ 判 false ⇒ 那两支按消息级 `mei_ti_url` 把图/贴纸画出来，不至于空气泡。
 *  守门见 `__tests__/FP24a表情包块渲染.test.ts` 的「守卫同构」组。
 */
export function shiXuYaoKuaiXuanRan(xiaoXi: 消息): boolean {
  return youTuPianKuai(huoQuXianShiKuai(xiaoXi))
}

/** 兼容投影（镜像后端 shunXuKeDuWenBen）：图片块以内联占位符表示，顺序保真 */
export function kuaiDaoZhengWen(
  kuai: XiaoXiKuai[],
  xuanXiang?: { leiBieOf?: (meiTiId?: string | null) => string | undefined },
): string {
  let jieGuo = ''
  for (const xiang of kuai) {
    if (xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi) {
      jieGuo += xiang.nei_rong ?? ''
      continue
    }
    const leiBie = xuanXiang?.leiBieOf?.(xiang.mei_ti_id)
    jieGuo += shiBiaoQingBaoMeiTiLeiBie(leiBie)
      ? XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei
      : XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei
  }
  return jieGuo
}

/** 派生兼容投影的消息类型（镜像后端 paiShengJianRong）：纯图 ⇒ 图片码，含文字 ⇒ wenben */
export function kuaiDaoXiaoXiLeiXing(
  kuai: Array<{ lei_xing: unknown; nei_rong?: string; mei_ti_id?: string | null; mei_ti_lei_bie?: string | null }>,
): string {
  const youWenZi = kuai.some(
    (xiang) => guiYiKuaiLeiXing(xiang.lei_xing) === XIAO_XI_KUAI_LEI_XING.wenZi && (xiang.nei_rong ?? '') !== '',
  )
  const shouTuPian = kuai.find((xiang) => guiYiKuaiLeiXing(xiang.lei_xing) === XIAO_XI_KUAI_LEI_XING.tuPian)
  if (!youWenZi && shouTuPian) {
    return shiBiaoQingBaoMeiTiLeiBie(shouTuPian.mei_ti_lei_bie) ? 'biaoQingBao' : 'tuPian'
  }
  return 'wenben'
}

/** 提交形态：剥掉块级地址/类别（服务端签发），丢弃空文字块，值域归回权威块类型 */
export function keTiJiaoKuai(
  kuai: Array<{ lei_xing: unknown; nei_rong?: string; mei_ti_id?: string | null; mei_ti_lei_bie?: string | null }>,
): XiaoXiKuai[] {
  const jieGuo: XiaoXiKuai[] = []
  for (const xiang of kuai) {
    const leiXing = guiYiKuaiLeiXing(xiang.lei_xing)
    if (!leiXing) continue
    if (leiXing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      if (!shiUUID(xiang.mei_ti_id)) continue
      const tuKuai: XiaoXiKuai = {
        lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
        mei_ti_id: typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : '',
      }
      if (xiang.mei_ti_lei_bie) (tuKuai as { mei_ti_lei_bie?: string }).mei_ti_lei_bie = xiang.mei_ti_lei_bie
      jieGuo.push(tuKuai)
      continue
    }
    const wenZi = (xiang.nei_rong ?? '').trim()
    if (wenZi === '') continue
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: wenZi })
  }
  return jieGuo
}

export interface KuaiChaoXianQingKuang {
  chaoXian: boolean
  yuanYin: 'kuaishu' | 'tupianshu' | 'zishu' | ''
}

/**
 * 编辑期预检（上限全部来自 XIAO_XI_KUAI_PEI_ZHI / XIAO_XI_PEI_ZHI，禁止数值硬编码）。
 * 只负责「发之前先给个明确提示」，最终裁定仍在服务端：服务端会逐块丢弃脏块并 400。
 */
export function panDingKuaiChaoXian(kuai: XiaoXiKuai[]): KuaiChaoXianQingKuang {
  const tupianShu = kuai.filter((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian).length
  if (kuai.length > XIAO_XI_KUAI_PEI_ZHI.zuiDaKuaiShu) return { chaoXian: true, yuanYin: 'kuaishu' }
  if (tupianShu > XIAO_XI_KUAI_PEI_ZHI.zuiDaTuPianShu) return { chaoXian: true, yuanYin: 'tupianshu' }
  const ziShu = kuai
    .filter((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi)
    .reduce((he, xiang) => he + (xiang.nei_rong ?? '').trim().length, 0)
  if (ziShu > XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu) return { chaoXian: true, yuanYin: 'zishu' }
  return { chaoXian: false, yuanYin: '' }
}

/** 发送后需要清空的本地预览地址（objectURL 不回收就是内存泄漏） */
export function kuaiYuLanDiZhi(kuai: Array<{ mei_ti_url?: string | null }>): string[] {
  return kuai
    .map((xiang) => xiang.mei_ti_url ?? '')
    .filter((diZhi) => typeof diZhi === 'string' && diZhi.startsWith('blob:'))
}

/* ============ FP-10c-12 输入区「空白/换行」折叠判定的单一出口 ============
 * 实现（components/聊天/图文输入区.vue 的 DOM⇄真源两条链）与测试（__tests__/输入区夹具.ts）
 * 共用下面这一组出口，任何一方不得再写第二份折叠规则；判据只有一条主线：
 *  DOM 里「看得见的结构」与「真源里的语义」必须逐字符可逆，浏览器（Blink）在重绘后
 *  自己补的悬空换行不算语义（真机取证：Shift+Enter 后打字得到 `第一行短第二行短\n`）。 */

/**
 * 光标哨兵（零宽空格）：渲染层在「末尾换行之后」与「空文字块之内」补这一枚不可见字符，
 * 给 Blink 一个可归一化的插入点（真机实测：尾段为空 `<span>` 宽 0、图后打的字不进文字流；
 * 末尾裸 `<br>` 后打字会被归一化回 `<br>` 之前 ⇒ 换行被并回上一行）。
 * 读回真源时一律经 `quKongHangShou` 摘除——真源里永不出现该字符。
 */
export const SHU_RU_KONG_HANG_SHOU = '\u200B'

/** 摘除文本里的全部光标哨兵（DOM 文本 → 真源文本的逐节点出口） */
export function quKongHangShou(wenBen: string): string {
  return wenBen.includes(SHU_RU_KONG_HANG_SHOU)
    ? wenBen.split(SHU_RU_KONG_HANG_SHOU).join('')
    : wenBen
}

/** 节点内 DOM 偏移 → 真源偏移：哨兵占 1 个 DOM 字符、不贡献真源字符 */
export function yingSheChuDuanPianYi(jieDianWen: string, duanPianCha: number): number {
  const youXiao = Math.max(0, Math.min(duanPianCha, jieDianWen.length))
  return quKongHangShou(jieDianWen.slice(0, youXiao)).length
}

/** 真源偏移 → 节点内 DOM 偏移（`yingSheChuDuanPianYi` 的逆映射；落在正文末尾时停在整节点末尾） */
export function yingSheHuiDuanPianYi(jieDianWen: string, zhengWenPianYi: number): number {
  const zhengWen = quKongHangShou(jieDianWen)
  const mubiao = Math.max(0, Math.min(zhengWenPianYi, zhengWen.length))
  if (mubiao === zhengWen.length) return jieDianWen.length
  let jiShu = 0
  for (let xia = 0; xia < jieDianWen.length; xia++) {
    if (jieDianWen[xia] === SHU_RU_KONG_HANG_SHOU) continue
    jiShu += 1
    if (jiShu > mubiao) return xia
  }
  return jieDianWen.length
}

/**
 * 「悬空的末尾换行」判定：整个输入区（cao）里 `<br>` 之后不再有任何有内容的节点 ⇒ 它是
 * 空态/末行的光标占位结构，不是用户打的一个换行。渲染层的真换行末尾必带哨兵锚点
 * （`SHU_RU_KONG_HANG_SHOU` 文本节点），因此锚点存在即判「非悬空」。
 * 这一条取代改造前「空态＝编辑器只有单 `<br>`」的特判：Blink 打字后留下的 `[文字, br]`
 * 尾缀、以及任何嵌套容器里的尾 br，都走同一个判定，不再各写一份。
 */
export function shiXuanGuaMoWeiHuanXing(cao: Node, huan: Node): boolean {
  if (huan.nodeName !== 'BR') return false
  let dangQian: Node | null = huan
  while (dangQian && dangQian !== cao) {
    let dong = dangQian.nextSibling
    while (dong) {
      if (dong.nodeType === Node.TEXT_NODE) {
        if ((dong.textContent ?? '') !== '') return false
      } else if (dong.nodeType === Node.ELEMENT_NODE || dong.nodeName === 'BR') {
        return false
      }
      dong = dong.nextSibling
    }
    dangQian = dangQian.parentNode
  }
  return true
}

/**
 * 「这条气泡还没进库」的唯一判定（全仓只此一份，`stores/聊天.ts` 与 `composables/use长按菜单.ts` 都 import 它）。
 *
 * 判据是本地乐观行的结构指纹，不是猜前缀：store 造临时行时把**同一个串**同时写进 `id` 与 `ke_hu_duan_id`
 * （`faSongXiaoXi` / `faSongMeiTiXiaoXi` / `faSongTuWenXiaoXi`），服务端确认后只把 `id` 换成落库主键、
 * `ke_hu_duan_id` 仍是那把临时串（`jiaRuXiaoXi` 正是按它做原位替换）⇒ 两者相等 = 还没确认。
 *
 * 为什么需要它：服务端把被引用消息的 id 当主键用（`backend/src/services/消息.ts` 对非 UUID 直接 400
 * `yinYongXiaoXiFeiFa`），所以「引用一条自己刚发出去、还在途的气泡」带出去的 id 在服务端从不成立。
 * 本地已确认行、历史行、以及任何没有 `ke_hu_duan_id` 的行一律返回 false（判定不越权裁定服务端数据）。
 */
export function shiBenDiLinShiXiaoXi(
  xiaoXi: { id?: unknown; ke_hu_duan_id?: unknown } | null | undefined,
): boolean {
  if (!xiaoXi) return false
  const id = xiaoXi.id
  return typeof id === 'string' && id !== '' && xiaoXi.ke_hu_duan_id === id
}
