import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { XIAO_XI_PEI_ZHI } from '../config/消息配置'
import { YUN_XU_XIAO_XI_LEI_XING } from '../config/媒体配置'
import { huoQuIo } from '../socket/io'
import { yanZhengUUID } from '../utils/验证'
import { 解析结局类型, 解析结局文案 } from '../utils/结局'
import { 归一角色性别 } from '../utils/性别'
import { debug日志, jiLuXiaoXiCaoZuo, jiLuSocketShiJian } from '../utils/debug日志'
import { shengChengQianMingURL } from './媒体存储'
import {
  diuQiDaoCuoWuJian,
  fanGouKuai,
  jiLuKuaiDiuQi,
  leiXingDaoMeiTiLeiBie,
  paiShengJianRong,
  qingLiLuoKuKuai,
  qingLiTiJiaoKuai,
  yingYongMeiTiPanDing,
  type JianRongJianYing,
  type XiaoXiKuai,
} from './消息内容块'

/** 内容块出参的图片块附渲染所需的签名地址（与消息级 mei_ti_url 同一算法、同一签名主体） */
export interface XiaoXiKuaiChuCan extends XiaoXiKuai {
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
}

/** 块级媒体元信息（批量取数结果）；消息级已有的字段不复用此表，避免两条真源 */
interface KuaiMeiTiXinXi {
  sha256: string
  lei_bie: string
}

export interface XiaoXiXinXi {
  id: string
  hui_hua_id: string
  fa_song_zhe_id: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  /** C1 GB 45438-2025 隐式元数据标识：jiaose 消息恒为 true（机器可读，前端不得展示或移除） */
  ai_biao_shi: boolean
  nei_rong: string
  lei_xing: string
  /**
   * FP-10（缺陷9）顺序化内容块：出参恒非空——库里落了就用自己的，历史行/旧客户端按
   * 内容 + 媒体ID + 类型 反构等价块数组。`nei_rong` 仍是它的兼容投影且逐字不变，
   * 所以老读取方零改动即继续正确工作（向后兼容不变量，FP10 真库测钉住）。
   */
  nei_rong_kuai?: XiaoXiKuaiChuCan[]
  /**
   * FP-08a（缺陷5）引用槽：本条消息引用的**同会话另一条消息** ID，null = 未引用。
   * 只下发身份、不下发摘要副本（摘要一旦落第二处存就必然与原文漂移）；
   * 列表接口本就返回整会话消息，消费方按 ID 在自身列表内解析即可。
   */
  bei_yong_xiao_xi_id?: string | null
  shi_jian_chuo: number
  yi_du: boolean
  yi_che_hui?: boolean
  che_hui_shi_jian?: string | null
  yuan_shi_nei_rong?: string | null
  ke_hu_duan_xu_hao?: number | null
  /** FP-09：客户端为待发用户消息生成的稳定 UUID（幂等判据）；服务端自产消息为 null */
  mi_deng_jian?: string | null
  mei_ti_id?: string | null
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
  mei_ti_shi_chang_hao_miao?: number | null
  mei_ti_yuan_shi_wen_jian_ming?: string | null
}

export interface FaSongXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  nei_rong: string
  /**
   * FP-09 兼容字段：旧客户端仍会上报自增序号。序号已改由服务端事务内权威分配，
   * 此值只被容忍（不再 500）而不再参与取号与幂等判据。
   */
  ke_hu_duan_xu_hao?: number | null
  /** FP-09 幂等判据：非 UUID 或空值按「无幂等键」处理，绝不因此丢消息 */
  mi_deng_jian?: string | null
  lei_xing?: string
  mei_ti_id?: string | null
  /**
   * FP-10（缺陷9）图文混排：客户端提交的有序块数组（也容忍 JSON 字符串形态）。
   * 一旦携带且清洗后仍有块，`nei_rong`/`lei_xing`/`mei_ti_id` 一律由服务端从块派生，
   * 客户端同时上报的那三个字段被忽略（块是唯一真源，不给第二套值留活口）。
   */
  nei_rong_kuai?: unknown
  /**
   * FP-08a（缺陷5）引用槽：被引用的同会话消息 ID。
   * 一律服务端裁定合法性（存在性 / 同会话 / 同用户 / 未撤回 / 非自引用），
   * 非法值直接 4xx —— 脏引用绝不能像 幂等键 那样「降级为无值后继续落库」：
   * 幂等键脏了只影响去重，引用脏了会把别人的消息内容当作本会话内容渲染出来（越权读取面）。
   */
  bei_yong_xiao_xi_id?: string | null
}

export interface HuoQuXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  ye_ma?: number
  mei_ye_tiao_shu?: number
  /** M6 keyset 游标：上一页最后一条消息的客户端序号（可为 null） */
  you_biao_xu_hao?: number | null
  /** M6 keyset 游标：上一页最后一条消息的创建时间毫秒时间戳 */
  you_biao_shi_jian_chuo?: number | null
  /** M6 keyset 游标：上一页最后一条消息 ID（同序号同时间的确定性平局裁决） */
  you_biao_id?: string | null
}

export interface CheHuiXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  xiao_xi_id: string
}

export interface CheHuiJiaoSeXiaoXiCanShu {
  yong_hu_id: string
  jiao_se_id: string
}

function tuiSongCheHuiShiJian(
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi_id: string,
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose',
): void {
  const io = huoQuIo()
  if (io) {
    io.to(yong_hu_id).emit('消息撤回', {
      hui_hua_id: jiao_se_id,
      xiao_xi_id,
      fa_song_zhe_lei_xing,
    })
    jiLuSocketShiJian('消息撤回', yong_hu_id, {
      jiao_se_id,
      xiao_xi_id,
      fa_song_zhe_lei_xing,
    })
  }
}

/** 块读取侧的按行上下文（`gouKuaiShangXiaWen` 的产物）；导出是为了让读取口能把同一份上下文交给好友链路 */
export interface KuaiShangXiaWen {
  /** 该行已备好的块数组；null = 未预取（单行读取口），由调用侧现算 */
  kuaiOf(xiaoXiId: string): XiaoXiKuai[] | null
  meiTiOf(meiTiId: string): KuaiMeiTiXinXi | null
}

/**
 * 内容块**读取投影**的表面向。`消息`（AI 链路）与 `好友消息`（FP-21 迁移 036）两张表上，
 * 块的投影算式只准有一条（本文件的 `yingSheKuaiChuCan`）；两表真实存在的差异只有三处，
 * 全部收在这里当参数交出，不允许为此复制第二份投影：
 *  ① 撤回标记列名：`消息.已撤回` ↔ `好友消息.撤回`；
 *  ② 本行 JOIN 到的媒体列名：AI 侧 SELECT 里起了别名（媒体SHA256 / 媒体类别），
 *     好友侧的 好友媒体 取数语句直取 媒体文件 的原列名（SHA256 / 类别）；
 *  ③ 签名主体：AI 侧的读者就是这行的 用户ID；好友侧的一行有两个用户，
 *     签名必须绑**当前读者**（读者编号进 HMAC，URL 换不了人、也不可枚举）。
 */
export interface KuaiTouYingMianXiang {
  cheHuiLie: string
  sha256Lie: string
  leiBieLie: string
  qianMingZhuTi(hang: Record<string, unknown>): string
}

const AI_KUAI_TOU_YING: KuaiTouYingMianXiang = {
  cheHuiLie: '已撤回',
  sha256Lie: '媒体SHA256',
  leiBieLie: '媒体类别',
  qianMingZhuTi: (hang) => String(hang.用户ID),
}

/** 好友消息读取面向（FP-21）：三个差异点之外，投影算式与 AI 侧同一份 */
export function haoYouKuaiTouYing(duZheId: string): KuaiTouYingMianXiang {
  return {
    cheHuiLie: '撤回',
    sha256Lie: 'SHA256',
    leiBieLie: '类别',
    qianMingZhuTi: () => duZheId,
  }
}

const WU_KUAI_SHANG_XIA_WEN: KuaiShangXiaWen = {
  kuaiOf: () => null,
  meiTiOf: () => null,
}

/**
 * 块引用的媒体逐条判「存在 + 归属 + 类别」（服务端强制，前端只允许提交媒体 ID）。
 * 归属比对与老单媒体口径同式：取回 上传者ID 在 JS 侧比字符串，不给非法 UUID 触发 22P02 的机会。
 */
async function chaKuaiMeiTiGuiShu(
  meiTiIds: string[],
  yongHuId: string,
): Promise<Map<string, { lei_bie: string; suo_shu: boolean }>> {
  const jieGuo = new Map<string, { lei_bie: string; suo_shu: boolean }>()
  if (meiTiIds.length === 0) return jieGuo
  const chaXun = await 数据库.query(
    `SELECT "ID", "类别", "上传者ID" FROM "媒体文件" WHERE "ID" = ANY($1::uuid[])`,
    [meiTiIds],
  )
  for (const hang of chaXun.rows as Record<string, unknown>[]) {
    jieGuo.set(String(hang.ID), {
      lei_bie: String(hang.类别 ?? ''),
      suo_shu: String(hang.上传者ID) === yongHuId,
    })
  }
  return jieGuo
}

/** `qingLiXiaoXiKuaiXieRu` 的产物：清洗后的落库块 + 由它派生的兼容投影三字段 */
export interface KuaiXieRuJieGuo {
  /** false = 本次提交不可采纳（长度超限 / 带了块却一块没留下），调用方按 zhuang_tai_ma 回 4xx */
  cheng_gong: boolean
  /** null = 本次提交未携带可用块数组，调用方走既有的「单段文本 / 单媒体」老口径 */
  kuai: XiaoXiKuai[] | null
  /** kuai 非 null 时的兼容投影（内容 / 类型 / 媒体ID）；老口径下为 null，由调用方沿用上报值 */
  jianYing: JianRongJianYing | null
  ti_shi?: string
  zhuang_tai_ma?: number
}

/**
 * FP-21：**图文混排写入侧的唯一入口**（AI 的 `消息` 与好友的 `好友消息` 同一条清洗序列）。
 * 完整序列 = 结构清洗 → 长度策略 → 块内媒体逐块判定（存在 + 归属 + 图像类别）→ 丢弃留痕 → 兼容投影。
 * 五步一步不许少，也不许在别处再来一遍：
 *  - 少「媒体判定」⇒ 块里能引用别人的媒体（越权读取面）；
 *  - 少「兼容投影」⇒ `内容` 与块顺序漂移，老读取方看到半条消息；
 *  - 第二份实现 ⇒ 两条链路必然漂移（本仓根因 R5 的原形态）。
 * `services/消息.ts::chuangJianYongHuXiaoXi` 与 `routes/好友.ts` 的 发送好友消息 都只调本函数。
 */
export async function qingLiXiaoXiKuaiXieRu(
  zhi: unknown,
  yongHuId: string,
  changDing: string,
): Promise<KuaiXieRuJieGuo> {
  const tiJiao = qingLiTiJiaoKuai(zhi, changDing)
  if (tiJiao.chaoXian) {
    jiLuKuaiDiuQi(tiJiao.diuQi, `${changDing}·长度超限`, yongHuId)
    return {
      cheng_gong: false,
      kuai: null,
      jianYing: null,
      ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'),
      zhuang_tai_ma: 400,
    }
  }
  if (tiJiao.kuai === null) {
    jiLuKuaiDiuQi(tiJiao.diuQi, changDing, yongHuId)
    return { cheng_gong: true, kuai: null, jianYing: null }
  }
  const meiTiXinXi = await chaKuaiMeiTiGuiShu(tiJiao.daiPanDingMeiTiId, yongHuId)
  const panDing = yingYongMeiTiPanDing(tiJiao.kuai, meiTiXinXi)
  const quanBuDiuQi = [...tiJiao.diuQi, ...panDing.diuQi]
  jiLuKuaiDiuQi(quanBuDiuQi, changDing, yongHuId)
  // 带了块却一块都没留下 = 这条消息没内容可发，按既有的 400 口径回；
  // 绝不退回去发客户端顺手带上来的那段旧文本（那才是静默改语义）
  if (panDing.baoLiu.length === 0) {
    return {
      cheng_gong: false,
      kuai: null,
      jianYing: null,
      ti_shi: huoQuFanYi('liaoTian', diuQiDaoCuoWuJian(quanBuDiuQi)),
      zhuang_tai_ma: 400,
    }
  }
  return {
    cheng_gong: true,
    kuai: panDing.baoLiu,
    jianYing: paiShengJianRong(panDing.baoLiu, meiTiXinXi),
  }
}

/** 单行的块数组：库内块能解析就采信，否则按 内容 + 媒体ID + 类型 反构（读取侧唯一算式） */
function anHangKuai(row: Record<string, unknown>): XiaoXiKuai[] {
  return (
    qingLiLuoKuKuai(row.内容块, String(row.ID ?? '')) ??
    fanGouKuai({
      nei_rong: String(row.内容 ?? ''),
      lei_xing: String(row.类型 || 'wenben'),
      mei_ti_id: row.媒体ID ? String(row.媒体ID) : null,
    })
  )
}

/**
 * FP-10 读取侧一次性备齐「每行的块」与「块引用的媒体」：
 * 块里的图片引用要出签名地址，就必须拿到每个媒体 ID 的 SHA256 与类别；
 * 消息行的 JOIN 只带得上 媒体ID 那一列，其余块按页批量补查（禁逐条 N+1）。
 * FP-21：同一份取数同时服务 `消息` 与 `好友消息` —— 两表差异（撤回列名）由 面向 参数交出。
 */
export async function gouKuaiShangXiaWen(
  rows: Record<string, unknown>[],
  mianXiang: KuaiTouYingMianXiang = AI_KUAI_TOU_YING,
): Promise<KuaiShangXiaWen> {
  const kuaiAnId = new Map<string, XiaoXiKuai[]>()
  const meiTiIds = new Set<string>()
  for (const row of rows) {
    const xiaoXiId = String(row.ID ?? '')
    if (row[mianXiang.cheHuiLie]) continue
    const kuai = anHangKuai(row)
    kuaiAnId.set(xiaoXiId, kuai)
    for (const xiang of kuai) {
      if (xiang.lei_xing === 'tupian' && xiang.mei_ti_id) meiTiIds.add(xiang.mei_ti_id)
    }
  }
  const meiTiAnId = new Map<string, KuaiMeiTiXinXi>()
  if (meiTiIds.size > 0) {
    const jieGuo = await 数据库.query(
      `SELECT "ID", "SHA256", "类别" FROM "媒体文件" WHERE "ID" = ANY($1::uuid[])`,
      [[...meiTiIds]],
    )
    for (const xing of jieGuo.rows as Record<string, unknown>[]) {
      const sha = xing.SHA256 ? String(xing.SHA256) : ''
      if (!sha) continue
      meiTiAnId.set(String(xing.ID), {
        sha256: sha.toLowerCase(),
        lei_bie: String(xing.类别 ?? ''),
      })
    }
  }
  return {
    kuaiOf: (xiaoXiId) => kuaiAnId.get(xiaoXiId) ?? null,
    meiTiOf: (meiTiId) => meiTiAnId.get(meiTiId) ?? null,
  }
}

/**
 * 出参块数组（**两张表共用这唯一一条算式**，FP-21 起 好友消息 也走它）：
 *  - 撤回行**不给原块**，只给一条与 `nei_rong` 逐字相同的撤回文案文字块
 *    （图文顺序里含着被撤回的正文与图片，不能随撤回行外泄；同时守住 nei_rong === 块拼接 的不变式）；
 *  - 其余按「库里有块就采信、没有就反构」，图片块补签名地址与类别（媒体行已被删时只丢地址、留块，
 *    这样投影 内容 里的 [图片] 与块数量恒对得上）。
 * 两表的列名/签名主体差异一律由 `KuaiTouYingMianXiang` 交出，本函数体内不得出现第二份算式。
 */
export function yingSheKuaiChuCan(
  row: Record<string, unknown>,
  shangXiaWen: KuaiShangXiaWen,
  cheHuiWenAn: string,
  mianXiang: KuaiTouYingMianXiang = AI_KUAI_TOU_YING,
): XiaoXiKuaiChuCan[] {
  if (row[mianXiang.cheHuiLie]) {
    return [{ lei_xing: 'wenzi', nei_rong: cheHuiWenAn }]
  }
  const xiaoXiId = String(row.ID ?? '')
  const kuai: XiaoXiKuai[] = shangXiaWen.kuaiOf(xiaoXiId) ?? anHangKuai(row)
  const beiYongLeiBie = leiXingDaoMeiTiLeiBie(String(row.类型 || 'wenben'))
  // 单媒体行（含所有历史行）优先吃本行已 JOIN 到的媒体：出参块里的地址与消息级 mei_ti_url 逐字相等，
  // 不因为改了读取路径就让老图片消息的地址发生变化
  const benHangMeiTi = (meiTiId: string): KuaiMeiTiXinXi | null => {
    const caiDao = shangXiaWen.meiTiOf(meiTiId)
    if (caiDao) return caiDao
    const benHangSha = row[mianXiang.sha256Lie]
    if (!row.媒体ID || String(row.媒体ID) !== meiTiId || !benHangSha) return null
    return {
      sha256: String(benHangSha).toLowerCase(),
      lei_bie: String(row[mianXiang.leiBieLie] ?? '') || beiYongLeiBie || '',
    }
  }
  return kuai.map((xiang) => {
    if (xiang.lei_xing !== 'tupian') return { ...xiang }
    const meiTiId = xiang.mei_ti_id ?? ''
    const meiTi = benHangMeiTi(meiTiId)
    if (!meiTi) return { ...xiang, mei_ti_url: null, mei_ti_lei_bie: beiYongLeiBie }
    return {
      ...xiang,
      mei_ti_url: shengChengQianMingURL(meiTi.sha256, mianXiang.qianMingZhuTi(row)),
      mei_ti_lei_bie: meiTi.lei_bie || beiYongLeiBie,
    }
  })
}

function yingSheXiaoXi(
  row: Record<string, unknown>,
  shangXiaWen: KuaiShangXiaWen = WU_KUAI_SHANG_XIA_WEN,
): XiaoXiXinXi {
  const faSongZheLeiXing =
    row.发送者 === 'yonghu' ? 'yonghu' : row.发送者 === 'jiaose' ? 'jiaose' : 'xitong'
  const faSongZheId =
    faSongZheLeiXing === 'yonghu'
      ? String(row.用户ID)
      : faSongZheLeiXing === 'jiaose'
        ? String(row.角色ID)
        : ''
  const yiCheHui = Boolean(row.已撤回)
  const cheHuiWenAn = huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
  const meiTiId = row.媒体ID ? String(row.媒体ID) : null
  const neiRong = yiCheHui ? cheHuiWenAn : String(row.内容)

  return {
    id: String(row.ID),
    hui_hua_id: String(row.角色ID),
    fa_song_zhe_id: faSongZheId,
    fa_song_zhe_lei_xing: faSongZheLeiXing,
    ai_biao_shi: faSongZheLeiXing === 'jiaose',
    nei_rong: neiRong,
    lei_xing: String(row.类型 || 'wenben'),
    nei_rong_kuai: yingSheKuaiChuCan(row, shangXiaWen, cheHuiWenAn),
    bei_yong_xiao_xi_id: row.被引用消息ID ? String(row.被引用消息ID) : null,
    shi_jian_chuo: new Date(String(row.创建时间)).getTime(),
    yi_du: Boolean(row.已读),
    yi_che_hui: yiCheHui,
    che_hui_shi_jian: row.撤回时间 ? String(row.撤回时间) : null,
    // FP-26 边界：撤回原文只随「运营读取能力（cha_kan）」下发，剥离点唯一在
    // services/消息出参收口（routes/消息 逐站点调用）；模型装配面（对话渲染 / AI输入准备 /
    // 复盘 / 军师）自 FP-26 起不再读取本键。库里 `原始内容` 列保留，理由见 docs/API文档.md 撤回口径节。
    yuan_shi_nei_rong: row.已撤回 && row.原始内容 ? String(row.原始内容) : null,
    ke_hu_duan_xu_hao: row.客户端序号 != null ? Number(row.客户端序号) : null,
    mi_deng_jian: row.幂等键 ? String(row.幂等键) : null,
    mei_ti_id: meiTiId,
    mei_ti_url: row.媒体SHA256
      ? shengChengQianMingURL(String(row.媒体SHA256).toLowerCase(), String(row.用户ID))
      : null,
    mei_ti_lei_bie: row.媒体类别 ? String(row.媒体类别) : null,
    mei_ti_shi_chang_hao_miao: row.媒体时长毫秒 != null ? Number(row.媒体时长毫秒) : null,
    mei_ti_yuan_shi_wen_jian_ming: row.媒体原始文件名 ? String(row.媒体原始文件名) : null,
  }
}

export interface JiaoSeSuoYouZheXinXi {
  yong_hu_id: string | null
  shi_fou_feng_cun: boolean
  ke_ji_xu_liao_tian: boolean
  jie_ju_zhuang_tai: string
  shi_fou_zha_xing: boolean
}

export async function huoQuJiaoSeSuoYouZhe(
  jiao_se_id: string,
): Promise<JiaoSeSuoYouZheXinXi | null> {
  if (!yanZhengUUID(jiao_se_id)) {
    return null
  }

  const jieGuo = await 数据库.query(
    `SELECT "用户ID", "封存", "可继续聊天", "结局状态", "是否渣型", "性别", "结局文案" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  return {
    yong_hu_id: jieGuo.rows[0].用户ID ? String(jieGuo.rows[0].用户ID) : null,
    shi_fou_feng_cun: Boolean(jieGuo.rows[0].封存),
    ke_ji_xu_liao_tian: Boolean(jieGuo.rows[0].可继续聊天),
    jie_ju_zhuang_tai: 解析结局文案(
      解析结局类型(jieGuo.rows[0].结局状态, Boolean(jieGuo.rows[0].封存)),
      归一角色性别(jieGuo.rows[0].性别),
      jieGuo.rows[0].结局文案 ?? null,
    ),
    shi_fou_zha_xing: Boolean(jieGuo.rows[0].是否渣型),
  }
}

export async function anIdChaXiaoXi(xiao_xi_id: string): Promise<XiaoXiXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT m.*, mf."SHA256" AS "媒体SHA256"
     FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
     WHERE m."ID" = $1 LIMIT 1`,
    [xiao_xi_id],
  )
  if (jieGuo.rows.length === 0) return null
  const shangXiaWen = await gouKuaiShangXiaWen(jieGuo.rows as Record<string, unknown>[])
  return yingSheXiaoXi(jieGuo.rows[0], shangXiaWen)
}

// M6：会话消息总数 Redis 缓存（60 秒 TTL），替代每页一次精确 COUNT(*)；
// 任何消息写入后立即失效，保证可见一致性
function huoQuZongShuHuanCunJian(yong_hu_id: string, jiao_se_id: string): string {
  return `xiao_xi_zong_shu:${yong_hu_id}:${jiao_se_id}`
}

/**
 * FP-09 会话级 advisory 锁键：用户消息与角色消息（见 AI输入准备.baoCunJiaoSeXiaoXi）
 * 必须取同一把锁，否则两条写入路径各自 MAX+1 仍会撞号。唯一真源，禁第二份算式。
 */
export function huiHuaXiaoXiSuoJian(yong_hu_id: string, jiao_se_id: string): number {
  return (
    Math.abs(
      [...`${yong_hu_id}:${jiao_se_id}`].reduce((lei, zi) => (lei * 31 + zi.charCodeAt(0)) | 0, 7),
    ) % 2147483647
  )
}

/** 幂等键清洗：非 UUID 一律降级为「无幂等键」，绝不因脏数据丢消息或 500 */
function qingLiMiDengJian(zhi: unknown, yong_hu_id: string): string | null {
  if (zhi == null || zhi === '') return null
  if (typeof zhi !== 'string' || !yanZhengUUID(zhi)) {
    debug日志.warn('消息服务', '幂等键非法，按无幂等键处理', {
      xiang_qing: { yong_hu_id, chang_du: String(zhi).slice(0, 8) },
    })
    return null
  }
  return zhi
}

const ZONG_SHU_HUAN_CUN_MIAO = 60

export interface BeiYinYongJianYan {
  cheng_gong: boolean
  id?: string | null
  ti_shi?: string
  zhuang_tai_ma?: number
}

/**
 * 引用裁定的**表面向**：`消息`（AI 会话）与 `好友消息`（FP-21 迁移 036）两张表上，
 * 「这条引用合不合法」的判定只准有一份（下面的 `yanZhengBeiYinYong`）。两表真实存在的差异只有
 * 「取哪几个列」与「怎么比对」这两件事，全部收在这里当参数交出：
 *  - `yuJu` 是唯一取数口，一律 `$1` 参数化、不接受任何拼串；
 *  - 三个判据函数**只回报真/假，不带状态码也不带文案** —— 状态码与翻译键是判定的一部分，
 *    写进面向就等于把判定分支复制了第二份（本仓根因 R5 的病灶形态）。
 */
export interface BeiYinYongMianXiang {
  yuJu: string
  /** 被引用那一行是否属于请求者本人（不成立 = 403，越权读取面） */
  shuYuBenRen(hang: Record<string, unknown>, benRenId: string, duiXiangId: string): boolean
  /** 被引用那一行是否与本次请求处在同一个对话（AI = 同会话；好友 = 同一好友对，无向） */
  shiZaiTongYiDuiHua(hang: Record<string, unknown>, benRenId: string, duiXiangId: string): boolean
  /** 被引用那一行是否已被撤回（撤回是置标记而非删行，外键挡不住） */
  quYiCheHui(hang: Record<string, unknown>): boolean
}

export const AI_BEI_YIN_YONG_MIAN_XIANG: BeiYinYongMianXiang = {
  yuJu: `SELECT "用户ID", "角色ID", "已撤回" FROM "消息" WHERE "ID" = $1 LIMIT 1`,
  shuYuBenRen: (hang, benRenId) => String(hang.用户ID) === String(benRenId),
  shiZaiTongYiDuiHua: (hang, _benRenId, duiXiangId) => String(hang.角色ID) === String(duiXiangId),
  quYiCheHui: (hang) => Boolean(hang.已撤回),
}

/**
 * 好友消息的引用面向（FP-21）。与 AI 面的两处结构差异，都是**事实差异**而不是口味差异：
 *  - 一行好友消息有两个用户，「属于本人」= 本人在 发送者/接收者 任一侧；
 *  - 「同一个对话」= 同一好友对，而好友关系本身是无向的 ⇒ 两侧顺序都算同一对。
 */
export const HAO_YOU_BEI_YIN_YONG_MIAN_XIANG: BeiYinYongMianXiang = {
  yuJu: `SELECT "发送者ID", "接收者ID", "撤回" FROM "好友消息" WHERE "ID" = $1 LIMIT 1`,
  shuYuBenRen: (hang, benRenId) =>
    String(hang.发送者ID) === String(benRenId) || String(hang.接收者ID) === String(benRenId),
  shiZaiTongYiDuiHua: (hang, benRenId, duiXiangId) => {
    const fa = String(hang.发送者ID)
    const jie = String(hang.接收者ID)
    return (fa === benRenId && jie === duiXiangId) || (fa === duiXiangId && jie === benRenId)
  },
  quYiCheHui: (hang) => Boolean(hang.撤回),
}

/**
 * 自引用判据（六种非法形态里的第六种）。**全库只此一份**：AI 侧的幂等重放分支、好友侧的
 * 结构性兜底（迁移 035 / 036 的 CHECK ("ID" <> "被引用消息ID")）都以它为准；
 * 任一侧改语义，两条链路一起变。
 */
export function shiZiYinYong(
  benXingId: string | null | undefined,
  beiYongId: string | null | undefined,
): boolean {
  if (!benXingId || !beiYongId) return false
  return String(benXingId) === String(beiYongId)
}

/**
 * FP-08a（缺陷5）+ FP-21：引用槽的唯一写前裁定，AI 与好友**共用这一条**。
 * 六种非法形态一律 4xx，绝不落到 SQL 层报错：
 *  ①非 UUID 字符串 —— 直进 UUID 列会 `22P02 invalid input syntax`，被 catch 后 throw ⇒ 用户看到 500；
 *  ②不存在的 UUID —— 有外键挡着，撞 `23503` 同样 500；没外键则静默落一个悬空引用；
 *  ③跨用户（别人对话里的消息）—— 外键**挡不住**（行确实存在），会静默把他人消息 ID 落进本对话，
 *    消费侧据此渲染即为越权读取；故必须 403；
 *  ④跨对话（本人另一个会话 / 另一对好友的消息）—— 同上，外键也挡不住，400；
 *  ⑤指向已撤回消息 —— `撤回` 是置标记而非删行，外键同样满足，400；
 *  ⑥自引用 —— 本行还没落库就引用自己。新行 ID 由服务端 gen_random_uuid() 现生成，构造不出来，
 *    唯一可达形态是 AI 侧同幂等键重放时把已落库的那条当引用对象（调用点用 `shiZiYinYong` 判），
 *    数据库另有 035/036 的 CHECK 作结构性兜底。
 * 入参已是 UUID 才查库（白名单在前），SQL 全参数化且只有一条（`mianXiang.yuJu`）；
 * 出参只给翻译文件文案，不外泄表名/列名/SQL。
 */
export async function yanZhengBeiYinYong(
  zhi: unknown,
  yong_hu_id: string,
  dui_xiang_id: string,
  mianXiang: BeiYinYongMianXiang = AI_BEI_YIN_YONG_MIAN_XIANG,
): Promise<BeiYinYongJianYan> {
  if (zhi == null || zhi === '') return { cheng_gong: true, id: null }
  if (typeof zhi !== 'string' || !yanZhengUUID(zhi)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiFeiFa'), zhuang_tai_ma: 400 }
  }
  const jieGuo = await 数据库.query(mianXiang.yuJu, [zhi])
  if (jieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiBuCunZai'), zhuang_tai_ma: 400 }
  }
  const xing = jieGuo.rows[0] as Record<string, unknown>
  if (!mianXiang.shuYuBenRen(xing, yong_hu_id, dui_xiang_id)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiWuQuanXian'), zhuang_tai_ma: 403 }
  }
  if (!mianXiang.shiZaiTongYiDuiHua(xing, yong_hu_id, dui_xiang_id)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiHuiHuaBuFu'), zhuang_tai_ma: 400 }
  }
  if (mianXiang.quYiCheHui(xing)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiYiCheHui'), zhuang_tai_ma: 400 }
  }
  return { cheng_gong: true, id: zhi }
}

export async function shiXiaoXiaoXiZongShuHuanCun(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<void> {
  try {
    const { redis } = await import('../redis')
    await redis.del(huoQuZongShuHuanCunJian(yong_hu_id, jiao_se_id))
  } catch (cuoWu) {
    debug日志.error('消息服务', '消息总数缓存失效失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
}

async function huoQuZongShu(yong_hu_id: string, jiao_se_id: string): Promise<number> {
  const huanCunJian = huoQuZongShuHuanCunJian(yong_hu_id, jiao_se_id)
  try {
    const { redis } = await import('../redis')
    const huanCun = await redis.get(huanCunJian)
    if (huanCun !== null) return parseInt(huanCun, 10)
  } catch {
    // 缓存读取失败退回直查
  }
  const zongShuJieGuo = await 数据库.query(
    `SELECT COUNT(*) as zong_shu FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [yong_hu_id, jiao_se_id],
  )
  const zongShu = parseInt(String(zongShuJieGuo.rows[0].zong_shu), 10)
  try {
    const { redis } = await import('../redis')
    await redis.setex(huanCunJian, ZONG_SHU_HUAN_CUN_MIAO, String(zongShu))
  } catch {
    // 缓存写入失败不影响主流程
  }
  return zongShu
}

export async function huoQuXiaoXiLieBiao(
  canShu: HuoQuXiaoXiCanShu,
): Promise<{ lie_biao: XiaoXiXinXi[]; zong_shu: number; hai_you_geng_duo?: boolean }> {
  const yeMa = Math.max(1, canShu.ye_ma || 1)
  const meiYeTiaoShu = Math.min(999, Math.max(1, canShu.mei_ye_tiao_shu || 50))

  // M6 keyset 分支：提供游标时按 (客户端序号 DESC NULLS LAST, 创建时间 DESC, ID DESC) 取「严格排在游标之后」的一页，
  // 多取一条判断有无更多，彻底消除深分页 OFFSET 与逐页精确 COUNT
  const shiYongYouBiao =
    canShu.you_biao_shi_jian_chuo != null && !!canShu.you_biao_id

  let rows: Record<string, unknown>[]
  if (shiYongYouBiao) {
    const youBiaoShiJian = new Date(canShu.you_biao_shi_jian_chuo as number)
    const jieGuo = await 数据库.query(
      `SELECT m.*, mf."SHA256" AS "媒体SHA256", mf."类别" AS "媒体类别",
              mf."时长毫秒" AS "媒体时长毫秒", mf."原始文件名" AS "媒体原始文件名"
       FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
       WHERE m."用户ID" = $1 AND m."角色ID" = $2 AND (
         ($3::bigint IS NOT NULL AND m."客户端序号" IS NULL)
         OR ($3::bigint IS NOT NULL AND m."客户端序号" IS NOT NULL AND (
               m."客户端序号" < $3::bigint
               OR (m."客户端序号" = $3::bigint AND (
                     m."创建时间" < $4::timestamptz
                     OR (m."创建时间" = $4::timestamptz AND m."ID"::text < $5::text)))))
         OR ($3::bigint IS NULL AND m."客户端序号" IS NULL AND (
               m."创建时间" < $4::timestamptz
               OR (m."创建时间" = $4::timestamptz AND m."ID"::text < $5::text)))
       )
       ORDER BY m."客户端序号" DESC NULLS LAST, m."创建时间" DESC, m."ID" DESC
       LIMIT $6`,
      [
        canShu.yong_hu_id,
        canShu.jiao_se_id,
        canShu.you_biao_xu_hao ?? null,
        youBiaoShiJian,
        canShu.you_biao_id,
        meiYeTiaoShu + 1,
      ],
    )
    rows = jieGuo.rows as Record<string, unknown>[]
  } else {
    const pianYi = (yeMa - 1) * meiYeTiaoShu
    const jieGuo = await 数据库.query(
      `SELECT m.*, mf."SHA256" AS "媒体SHA256", mf."类别" AS "媒体类别",
              mf."时长毫秒" AS "媒体时长毫秒", mf."原始文件名" AS "媒体原始文件名"
       FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
       WHERE m."用户ID" = $1 AND m."角色ID" = $2
       ORDER BY m."客户端序号" DESC NULLS LAST, m."创建时间" DESC, m."ID" DESC
       LIMIT $3 OFFSET $4`,
      [canShu.yong_hu_id, canShu.jiao_se_id, meiYeTiaoShu + 1, pianYi],
    )
    rows = jieGuo.rows as Record<string, unknown>[]
  }

  const haiYouGengDuo = rows.length > meiYeTiaoShu
  const buQuKuai = await gouKuaiShangXiaWen(rows)
  const lieBiao = (haiYouGengDuo ? rows.slice(0, meiYeTiaoShu) : rows).map((hang) =>
    yingSheXiaoXi(hang, buQuKuai),
  )

  if (shiYongYouBiao) {
    // keyset 分支无需总数；返回已缓存值（缺失时懒计算一次供旧版前端兼容）
    const zongShu = await huoQuZongShu(canShu.yong_hu_id, canShu.jiao_se_id)
    return { lie_biao: lieBiao, zong_shu: zongShu, hai_you_geng_duo: haiYouGengDuo }
  }

  const zongShu = await huoQuZongShu(canShu.yong_hu_id, canShu.jiao_se_id)
  return { lie_biao: lieBiao, zong_shu: zongShu, hai_you_geng_duo: haiYouGengDuo }
}

export async function chuangJianYongHuXiaoXi(
  canShu: FaSongXiaoXiCanShu,
): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  // FP-10（缺陷9）：带有序内容块的提交以「块」为唯一真源，
  // 投影三字段（内容/类型/媒体ID）一律服务端派生，客户端同时上报的那三个字段被忽略。
  // FP-21：清洗序列抽成唯一入口 qingLiXiaoXiKuaiXieRu，好友链路调的就是同一个函数。
  // 这里保留原调用点语义：块是唯一真源，投影三字段一律服务端派生，客户端同时上报的
  // 内容/类型/媒体ID 被忽略（不给第二套值留活口）。
  const kuaiXieRu = await qingLiXiaoXiKuaiXieRu(
    canShu.nei_rong_kuai,
    canShu.yong_hu_id,
    '用户消息发送',
  )
  if (!kuaiXieRu.cheng_gong) {
    return { cheng_gong: false, ti_shi: kuaiXieRu.ti_shi, zhuang_tai_ma: kuaiXieRu.zhuang_tai_ma ?? 400 }
  }
  const luoKuKuai = kuaiXieRu.kuai
  const jianYing = kuaiXieRu.jianYing

  const leiXing = jianYing ? jianYing.lei_xing : canShu.lei_xing ?? 'wenben'
  if (!YUN_XU_XIAO_XI_LEI_XING.includes(leiXing)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiLeiXingFeiFa'), zhuang_tai_ma: 400 }
  }
  const shiMeiTi = leiXing !== 'wenben'
  const meiTiId = jianYing ? jianYing.mei_ti_id : canShu.mei_ti_id ?? null

  if (shiMeiTi && !meiTiId) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu'), zhuang_tai_ma: 400 }
  }

  const yuanMeiTiWenBen = shiMeiTi && typeof canShu.nei_rong === 'string' ? canShu.nei_rong.trim().slice(0, 500) : ''
  const qingLiNeiRong = jianYing
    ? jianYing.nei_rong
    : shiMeiTi
      ? yuanMeiTiWenBen
      : canShu.nei_rong.trim()
  if (!shiMeiTi && !qingLiNeiRong) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong'), zhuang_tai_ma: 400 }
  }
  // 块消息的字数上限已由 qingLiTiJiaoKuai 按「用户自己的文字」判过（投影里的 [图片] 是系统载体标记，
  // 不占用户的字数预算），这里只守老口径的单段文本
  if (!shiMeiTi && !jianYing && qingLiNeiRong.length > 500) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'), zhuang_tai_ma: 400 }
  }

  const jiaoSe = await huoQuJiaoSeSuoYouZhe(canShu.jiao_se_id)
  if (!jiaoSe) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'jiaoSeBuCunZai'), zhuang_tai_ma: 404 }
  }
  if (jiaoSe.yong_hu_id !== canShu.yong_hu_id) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'wuQuanXian'), zhuang_tai_ma: 403 }
  }

  if (jiaoSe.shi_fou_feng_cun && !jiaoSe.ke_ji_xu_liao_tian) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'youXiYiJieShu'), zhuang_tai_ma: 400 }
  }

  if (shiMeiTi) {
    const meiTiChaXun = await 数据库.query(
      `SELECT "上传者ID" FROM "媒体文件" WHERE "ID" = $1 LIMIT 1`,
      [meiTiId],
    )
    if (meiTiChaXun.rows.length === 0) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiBuCunZai'), zhuang_tai_ma: 400 }
    }
    if (String(meiTiChaXun.rows[0].上传者ID) !== canShu.yong_hu_id) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'meiTiWuQuanXian'), zhuang_tai_ma: 400 }
    }
  }

  // FP-08a（缺陷5）：引用槽的写前裁定（五种非法形态一律 4xx，理由见 yanZhengBeiYinYong）
  const beiYong = await yanZhengBeiYinYong(
    canShu.bei_yong_xiao_xi_id,
    canShu.yong_hu_id,
    canShu.jiao_se_id,
  )
  if (!beiYong.cheng_gong) {
    return { cheng_gong: false, ti_shi: beiYong.ti_shi, zhuang_tai_ma: beiYong.zhuang_tai_ma }
  }
  const beiYongXiaoXiId = beiYong.id ?? null

  // FP-09 缺陷8「吞消息」根因收敛：
  //  ① 序号由服务端在同一事务内、持会话 advisory 锁时 MAX+1 权威分配（旧客户端上报的序号被容忍但不采信），
  //     用户侧与角色侧共用一把锁 ⇒ 不可能再撞号；
  //  ② 幂等判据换成客户端稳定 UUID（幂等键），冲突回查一律按 发送者='yonghu' 过滤，
  //     绝不把别人的角色消息当成"这条用户消息已存在"返回给用户；
  //  ③ 任何幂等/冲突分支都留痕，不再静默返回。
  const miDengJian = qingLiMiDengJian(canShu.mi_deng_jian, canShu.yong_hu_id)
  const ZUI_DA_CHONG_SHI_CI_SHU = 10
  let luo_ku_id: string | null = null
  let cuoWu: unknown = null

  for (let ciShu = 0; ciShu <= ZUI_DA_CHONG_SHI_CI_SHU; ciShu++) {
    const keHuDuan = await 数据库.connect()
    try {
      await keHuDuan.query('BEGIN')
      await keHuDuan.query('SELECT pg_advisory_xact_lock($1)', [
        huiHuaXiaoXiSuoJian(canShu.yong_hu_id, canShu.jiao_se_id),
      ])
      const xuHaoJieGuo = await keHuDuan.query(
        `SELECT COALESCE(MAX("客户端序号"), 0) as zui_da FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [canShu.yong_hu_id, canShu.jiao_se_id],
      )
      const benTiaoXuHao = Number(xuHaoJieGuo.rows[0]?.zui_da ?? 0) + 1
      const chaRu = await keHuDuan.query(
        `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号", "媒体ID", "幂等键", "内容块", "被引用消息ID")
         VALUES ($1, $2, $3, 'yonghu', $4, true, $5, $6, $7, $8::jsonb, $9)
         ON CONFLICT ("用户ID", "角色ID", "幂等键") DO NOTHING
         RETURNING "ID"`,
        [
          canShu.yong_hu_id,
          canShu.jiao_se_id,
          qingLiNeiRong,
          leiXing,
          benTiaoXuHao,
          meiTiId,
          miDengJian,
          luoKuKuai ? JSON.stringify(luoKuKuai) : null,
          beiYongXiaoXiId,
        ],
      )
      if (chaRu.rows.length === 0) {
        // 同幂等键重放：回查必须锁定「本人那条用户消息」，不得命中同键 NULL 的服务端消息
        const yiCunZai = await keHuDuan.query(
          `SELECT "ID" FROM "消息"
           WHERE "用户ID" = $1 AND "角色ID" = $2 AND "幂等键" = $3 AND "发送者" = 'yonghu' LIMIT 1`,
          [canShu.yong_hu_id, canShu.jiao_se_id, miDengJian],
        )
        await keHuDuan.query('COMMIT')
        keHuDuan.release()
        const mingZhong = yiCunZai.rows[0]
        if (!mingZhong) {
          debug日志.warn('消息服务', '幂等冲突但回查无用户消息行', {
            xiang_qing: { yong_hu_id: canShu.yong_hu_id, jiao_se_id: canShu.jiao_se_id },
          })
          return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'faSongShiBai'), zhuang_tai_ma: 500 }
        }
        debug日志.warn('消息服务', '用户消息重复提交，按幂等键返回原行', {
          xiang_qing: { yong_hu_id: canShu.yong_hu_id, jiao_se_id: canShu.jiao_se_id, xiao_xi_id: String(mingZhong.ID) },
        })
        // FP-08a 自引用裁定：新行 ID 由服务端 gen_random_uuid() 生成，首次插入构造不出「引用自己」，
        // 唯一可达形态是同幂等键重放时把已落库的那条自己当成引用对象。
        // 这里不拒就会静默返回原行（非法引用被无声吞掉，属 R4 契约缺口的原形态），故按 400 明说；
        // DB 侧另有 035 的 CHECK ("ID" <> "被引用消息ID") 作结构性兜底。
        if (beiYongXiaoXiId && shiZiYinYong(mingZhong.ID, beiYongXiaoXiId)) {
          return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'yinYongXiaoXiFeiFa'), zhuang_tai_ma: 400 }
        }
        luo_ku_id = String(mingZhong.ID)
        break
      }
      await keHuDuan.query('COMMIT')
      keHuDuan.release()
      luo_ku_id = String(chaRu.rows[0].ID)
      break
    } catch (yiChang) {
      cuoWu = yiChang
      try {
        await keHuDuan.query('ROLLBACK')
      } catch {
        // 忽略回滚失败
      }
      keHuDuan.release()
      const pgCuoWu = yiChang as { code?: string; constraint?: string }
      // 序号唯一约束仍由 通话.ts 的非加锁写入共享：真撞号时按锁外竞争重试，绝不把已成功的请求写成 500
      if (
        pgCuoWu.code === '23505' &&
        pgCuoWu.constraint?.includes('客户端序号') &&
        ciShu < ZUI_DA_CHONG_SHI_CI_SHU
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, ciShu)))
        continue
      }
      break
    }
  }

  if (luo_ku_id === null) {
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing(
      'xiao_xi_luo_ku_shi_bai',
      '消息落库失败告警',
      `用户消息落库失败：${String(cuoWu).slice(0, 300)}`,
    ).catch(() => undefined)
    if (cuoWu) throw cuoWu
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'faSongShiBai'), zhuang_tai_ma: 500 }
  }

  const jieGuo = await 数据库.query(
    `SELECT m.*, mf."SHA256" AS "媒体SHA256"
     FROM "消息" m LEFT JOIN "媒体文件" mf ON m."媒体ID" = mf."ID"
     WHERE m."ID" = $1 LIMIT 1`,
    [luo_ku_id],
  )
  if (jieGuo.rows.length === 0) {
    debug日志.error('消息服务', '用户消息已落库但回查为空', {
      xiang_qing: { yong_hu_id: canShu.yong_hu_id, jiao_se_id: canShu.jiao_se_id, xiao_xi_id: luo_ku_id },
    })
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'faSongShiBai'), zhuang_tai_ma: 500 }
  }

  const xiaoXi = yingSheXiaoXi(
    jieGuo.rows[0],
    await gouKuaiShangXiaWen(jieGuo.rows as Record<string, unknown>[]),
  )
  await shiXiaoXiaoXiZongShuHuanCun(canShu.yong_hu_id, canShu.jiao_se_id)
  jiLuXiaoXiCaoZuo('用户消息发送', canShu.yong_hu_id, canShu.jiao_se_id, 'yonghu', { xiao_xi_id: xiaoXi.id })
  return { cheng_gong: true, xiao_xi: xiaoXi }
}

function jiLuCheHuiCaoZuo(
  caoZuo: string,
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi_id: string,
): void {
  jiLuXiaoXiCaoZuo(caoZuo, yong_hu_id, jiao_se_id, 'yonghu', { xiao_xi_id })
}

export async function cheHuiYongHuXiaoXi(
  canShu: CheHuiXiaoXiCanShu,
): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  const jiaoSe = await huoQuJiaoSeSuoYouZhe(canShu.jiao_se_id)
  if (!jiaoSe) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'jiaoSeBuCunZai'), zhuang_tai_ma: 404 }
  }
  if (jiaoSe.yong_hu_id !== canShu.yong_hu_id) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'wuQuanXian'), zhuang_tai_ma: 403 }
  }

  const xiaoXiJieGuo = await 数据库.query(
    `SELECT * FROM "消息" WHERE "ID" = $1 AND "用户ID" = $2 AND "角色ID" = $3 AND "发送者" = 'yonghu' LIMIT 1`,
    [canShu.xiao_xi_id, canShu.yong_hu_id, canShu.jiao_se_id],
  )
  if (xiaoXiJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
  }

  const xiaoXi = xiaoXiJieGuo.rows[0]
  const chuangJianShiJian = new Date(String(xiaoXi.创建时间)).getTime()
  if (Date.now() - chuangJianShiJian > XIAO_XI_PEI_ZHI.cheHuiShiXian) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai'), zhuang_tai_ma: 400 }
  }
  if (xiaoXi.已撤回) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai'), zhuang_tai_ma: 400 }
  }

  // 撤回写口口径（FP-26 钉住）：`原始内容 = 内容` 是**留档**，`内容` 列本身不清空；
  // 因此「撤回后不再可见」由读取侧承担 —— 模型语料只出撤回占位（services/对话渲染），
  // HTTP 出参只随 cha_kan 运营读取能力下发（services/消息出参收口）。改这里先看那两处。
  const gengXinJieGuo = await 数据库.query(
    `WITH upd AS (
       UPDATE "消息" SET "已撤回" = true, "撤回时间" = NOW(), "原始内容" = "内容"
       WHERE "ID" = $1
       RETURNING *
     )
     SELECT upd.*, mf."SHA256" AS "媒体SHA256"
     FROM upd LEFT JOIN "媒体文件" mf ON upd."媒体ID" = mf."ID"`,
    [canShu.xiao_xi_id],
  )

  tuiSongCheHuiShiJian(canShu.yong_hu_id, canShu.jiao_se_id, canShu.xiao_xi_id, 'yonghu')
  jiLuCheHuiCaoZuo('用户消息撤回', canShu.yong_hu_id, canShu.jiao_se_id, canShu.xiao_xi_id)

  return { cheng_gong: true, xiao_xi: yingSheXiaoXi(gengXinJieGuo.rows[0]) }
}

export async function cheHuiJiaoSeXiaoXi(
  canShu: CheHuiJiaoSeXiaoXiCanShu,
): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  const xiaoXiJieGuo = await 数据库.query(
    `SELECT * FROM "消息"
     WHERE "用户ID" = $1 AND "角色ID" = $2 AND "发送者" = 'jiaose' AND "已撤回" = false
     ORDER BY "客户端序号" DESC NULLS LAST, "创建时间" DESC
     LIMIT 1`,
    [canShu.yong_hu_id, canShu.jiao_se_id],
  )
  if (xiaoXiJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai') }
  }

  const xiaoXi = xiaoXiJieGuo.rows[0]
  const chuangJianShiJian = new Date(String(xiaoXi.创建时间)).getTime()
  if (Date.now() - chuangJianShiJian > XIAO_XI_PEI_ZHI.cheHuiShiXian) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('liaoTian', 'cheHuiShiBai') }
  }

  const gengXinJieGuo = await 数据库.query(
    `WITH upd AS (
       UPDATE "消息" SET "已撤回" = true, "撤回时间" = NOW(), "原始内容" = "内容"
       WHERE "ID" = $1
       RETURNING *
     )
     SELECT upd.*, mf."SHA256" AS "媒体SHA256"
     FROM upd LEFT JOIN "媒体文件" mf ON upd."媒体ID" = mf."ID"`,
    [xiaoXi.ID],
  )

  const cheHuiXiaoXi = yingSheXiaoXi(gengXinJieGuo.rows[0])
  tuiSongCheHuiShiJian(canShu.yong_hu_id, canShu.jiao_se_id, cheHuiXiaoXi.id, 'jiaose')
  jiLuXiaoXiCaoZuo('角色消息撤回', canShu.yong_hu_id, canShu.jiao_se_id, 'jiaose', { xiao_xi_id: cheHuiXiaoXi.id })

  return { cheng_gong: true, xiao_xi: cheHuiXiaoXi }
}

export async function biaoJiSuoYouWeiDu(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<void> {
  await 数据库.query(
    `UPDATE "消息" SET "已读" = true WHERE "用户ID" = $1 AND "角色ID" = $2 AND "已读" = false`,
    [yong_hu_id, jiao_se_id],
  )
}

export interface BaoCunJiaoSeMeiTiCanShu {
  yong_hu_id: string
  jiao_se_id: string
  nei_rong: string
  lei_xing: string
  mei_ti_id: string
}

export async function baoCunJiaoSeMeiTiXiaoXi(
  canShu: BaoCunJiaoSeMeiTiCanShu,
): Promise<XiaoXiXinXi> {
  const qingLiNeiRong = (canShu.nei_rong || '').trim().slice(0, 500)
  // YH-059 角色多媒体消息统一ON CONFLICT幂等：禁裸INSERT双落库
  let jieGuo
  try {
    jieGuo = await 数据库.query(
      `WITH xin AS (
         INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "媒体ID")
         VALUES ($1, $2, $3, 'jiaose', $4, true, $5)
         ON CONFLICT DO NOTHING
         RETURNING *
       )
       SELECT xin.*, mf."SHA256" AS "媒体SHA256"
       FROM xin LEFT JOIN "媒体文件" mf ON xin."媒体ID" = mf."ID"`,
      [canShu.yong_hu_id, canShu.jiao_se_id, qingLiNeiRong, canShu.lei_xing, canShu.mei_ti_id],
    )
  } catch (cuoWu) {
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing('xiao_xi_luo_ku_shi_bai', '消息落库失败告警', `角色多媒体消息落库失败：${String(cuoWu).slice(0, 300)}`).catch(() => undefined)
    throw cuoWu
  }
  if (jieGuo.rows.length === 0) {
    // 无唯一约束兜底时冲突走异常已抛；空行视为未知失败，告警后抛错禁静默
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing('xiao_xi_luo_ku_shi_bai', '消息落库失败告警', '角色多媒体消息落库返回空行').catch(() => undefined)
    throw new Error('角色多媒体消息落库返回空行')
  }
  const xiaoXi = yingSheXiaoXi(jieGuo.rows[0])
  await shiXiaoXiaoXiZongShuHuanCun(canShu.yong_hu_id, canShu.jiao_se_id)
  jiLuXiaoXiCaoZuo('角色多媒体消息发送', canShu.yong_hu_id, canShu.jiao_se_id, 'jiaose', { xiao_xi_id: xiaoXi.id })
  return xiaoXi
}

