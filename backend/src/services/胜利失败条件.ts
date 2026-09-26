import { 数据库 } from '../数据库'
import { genJuPeiZhiTiaoYong, type DuiHuaKuai } from '../utils/DeepSeek客户端'
import { gengXinHaoGanDu, huoQuWanZhengHaoGanDu } from './好感度'
import { huoQuIo } from '../socket/io'
import { redis } from '../redis'
import { baoCunJiaoSeXiaoXi } from './AI输入准备'
import { SHENG_LI_SHI_BAI_PEI_ZHI, QUE_XIN_DU_YUE_SHU } from '../config/胜利失败配置'
import {
  gouJianDanTiaoTuXiangKuai,
  shiTuXiangLeiBie,
} from './AI视觉辅助'
import {
  fenGeZuiXinYongHuXiaoXi,
  gouJianYinYongChaXun,
  zhanShiLiShiWenBen,
  zhanShiXiaoXiZhengWen,
} from './对话渲染'
import { debug日志, jiLuYouXiJieJu, jiLuSocketShiJian } from '../utils/debug日志'
import { 是否通关结局, 渲染结局文案, 随机结局趣味文案 } from '../utils/结局'
import { 归一角色性别, type 角色性别 } from '../utils/性别'
import { yanZhengUUID } from '../utils/验证'
import { jieSuanTiaoZhanDuiJu } from './挑战积分'
import type {
  AIJiaoSeXinXi,
  BiaoBaiJianCeJieGuo,
  DuiHuaLiShiXiang,
  HuShanJianCeJieGuo,
  ShenJingBingJianCeJieGuo,
  ShiPoJianCeJieGuo,
  YongHuXiaoXiJianCeJieGuo,
  YouXiJieGuoLeiXing,
  YouXiJieShuJieGuo,
} from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'
import { gouJianJiaoSeShangXiaWen } from '../config/AI参数策略'
import { baoZhuangYongHuNeiRong } from './Prompt构建器'

function jieXiJSONXiangYing(neiRong: string): Record<string, unknown> {
  const qingLiNeiRong = neiRong.trim()
  try {
    return JSON.parse(qingLiNeiRong)
  } catch {
    const piPei = qingLiNeiRong.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        return JSON.parse(piPei[0])
      } catch {
        return {}
      }
    }
    return {}
  }
}

/** 检测类 user 输入：最新消息为未撤回图片/表情包时附加 input_image 块（vision 统一） */
function pinJieYongHuNeiRong(wenBen: string, tuXiangKuai?: DuiHuaKuai[]): string | DuiHuaKuai[] {
  return tuXiangKuai && tuXiangKuai.length > 0
    ? [{ type: 'input_text', text: wenBen }, ...tuXiangKuai]
    : wenBen
}

export interface SiLianJianShuChu {
  biao_bai: BiaoBaiJianCeJieGuo
  hu_shan: HuShanJianCeJieGuo
  shi_po: ShiPoJianCeJieGuo
  shen_jing_bing: ShenJingBingJianCeJieGuo
}

function anQuanQueXinDu(zhi: unknown): number {
  const shuZhi = Number(zhi)
  return Number.isNaN(shuZhi) ? 0 : shuZhi
}

const BIAO_BAI_LEI_XING_YING_SHE: Record<string, BiaoBaiJianCeJieGuo['biao_bai_lei_xing']> = {
  直接表白: 'zhi_jie_biao_bai',
  暗示表白: 'an_shi_biao_bai',
  要求确立关系: 'yao_qiu_que_li_guan_xi',
}

/** 结算主事务的最大尝试次数（含首次）：四表任一失败即整条回滚并重试，超过即向调用方抛错 */
const ZHAN_JIE_ZHONG_SHI_CI_SHU = 3

/**
 * M2 调用收敛：表白/互删/识破/神经病四连检合并为一次结构化输出调用。
 * 输入与原先四次独立调用完全一致（消息文本 + 最近历史 + 角色人设 + 可选图像块），
 * 输出聚合四类布尔判定、各自确信度与人设包容标记，语义与合并前保持一致。
 */
export async function jianCeSiLianHeYi(
  xiaoXi: string,
  duiHuaLiShi: DuiHuaLiShiXiang[] = [],
  jiaoSe?: AIJiaoSeXinXi,
  tuPianShouQuan?: boolean,
): Promise<SiLianJianShuChu> {
  const kongShenJingBing: ShenJingBingJianCeJieGuo = {
    shi_fou_shen_jing_bing: false,
    fa_san_si_wei_ren_she: false,
    que_xin_du: 0,
    li_you: '',
  }

  // FP-08 去重：焦点那条只出现在下面「用户消息」里，最近聊天不再重复它；
  // 最新一条用户消息为未撤回图片/表情包 → 统一附 input_image 块；
  // 纯媒体消息文本为空时用载体标记兜底，保证检测 Prompt 不出现空内容
  const { 背景, 焦点: zuiXinYongHu } = fenGeZuiXinYongHuXiaoXi(duiHuaLiShi)
  const shiZuiXinTuPian = Boolean(
    zuiXinYongHu && !zuiXinYongHu.yi_che_hui && shiTuXiangLeiBie(zuiXinYongHu.meiTiLeiBie),
  )
  const tuXiangKuai =
    shiZuiXinTuPian && tuPianShouQuan ? await gouJianDanTiaoTuXiangKuai(zuiXinYongHu!) : []
  const zhanShiWenBen =
    xiaoXi ||
    (zuiXinYongHu ? zhanShiXiaoXiZhengWen(zuiXinYongHu, undefined, gouJianYinYongChaXun(duiHuaLiShi)) : '')

  const liShiWenBen = zhanShiLiShiWenBen(背景, {
    角色名: '角色',
    用户名: '用户',
    最多条数: SHENG_LI_SHI_BAI_PEI_ZHI.jianCeLiShiTiaoShu,
    时间在前: true,
  })

  const renSheDuanLuo = jiaoSe
    ? [
        '【角色完整人设】',
        `MBTI：${jiaoSe.mbti_lei_xing}`,
        `内外向（IE）类型：${jiaoSe.ie_lei_xing}（E=外向型，I=内向型）`,
        `性格：${jiaoSe.xing_ge}`,
        `说话风格：${jiaoSe.yan_yu_feng_ge}`,
        `行为特点：${jiaoSe.xing_wei_te_dian}`,
        `背景故事：${jiaoSe.bei_jing_gu_shi}`,
        `人设核心提示：${jiaoSe.ba_da_mo_kuai.xi_tong_ti_shi}`,
      ]
    : []

  const xiangYing = await genJuPeiZhiTiaoYong('siLianJian', [
    {
      jiaoSe: 'system',
      neiRong:
        '你是恋爱模拟游戏的判定引擎。对用户最新消息一次性完成四类判定：是否表白、是否互删、是否识破对方是渣男/渣女、该角色是否觉得消息莫名其妙（神经病）。只输出 JSON。',
    },
    {
      jiaoSe: 'user',
      neiRong: pinJieYongHuNeiRong(
        [
          '对下面这条用户消息完成四类判定。',
          '',
          ...(jiaoSe
            ? [
                ...renSheDuanLuo,
                '',
                '【神经病判定准则（由你综合权衡，不使用固定阈值）】',
                '- E 型人格通常更宽容，会觉得莫名其妙的话好玩、有趣、能接梗，不轻易判定为"神经病"',
                '- I 型人格可能更容易对跳脱的内容感到摸不着头脑',
                '- 只有真正严重跳脱、与上下文完全无关、让人完全无法理解时才判定为"神经病"',
                '- 轻微跑题、开玩笑、调侃、发散思维、表情包、撒娇等都不应判定为"神经病"',
              ]
            : []),
          '',
          '【最近聊天】',
          liShiWenBen || '（无）',
          '',
          baoZhuangYongHuNeiRong(`用户消息：${zhanShiWenBen}`),
          '',
          '输出 JSON：{',
          '  "是否表白": boolean,',
          '  "表白类型": "直接表白" | "暗示表白" | "要求确立关系" | "非表白",',
          '  "表白确信度": number（0-1）,',
          '  "是否互删": boolean,',
          '  "互删确信度": number（0-1）,',
          '  "是否识破": boolean,',
          '  "识破确信度": number（0-1）,',
          '  "是否神经病": boolean,',
          '  "神经病确信度": number（0-1）,',
          ...(jiaoSe ? ['  "人设能接受": boolean,'] : []),
          '  "理由": "string"',
          '}',
          '只输出 JSON。',
        ].join('\n'),
        tuXiangKuai,
      ),
    },
  ])

  const shuJu = jieXiJSONXiangYing(xiangYing.neiRong)
  const biaoBaiLeiXing = String(shuJu['表白类型'] ?? '非表白')
  const youXiaoLeiXing = BIAO_BAI_LEI_XING_YING_SHE[biaoBaiLeiXing] || 'fei_biao_bai'
  const renSheNengJieShou = Boolean(
    shuJu['人设能接受'] ?? shuJu['ren_she_neng_jie_shou'] ?? shuJu['发散思维人设'] ?? false,
  )

  return {
    biao_bai: {
      shi_fou_biao_bai: Boolean(shuJu['是否表白'] ?? false),
      biao_bai_lei_xing: youXiaoLeiXing,
      que_xin_du: anQuanQueXinDu(shuJu['表白确信度'] ?? shuJu['que_xin_du'] ?? 0),
      li_you: String(shuJu['理由'] ?? ''),
    },
    hu_shan: {
      shi_fou_hu_shan: Boolean(shuJu['是否互删'] ?? false),
      que_xin_du: anQuanQueXinDu(shuJu['互删确信度'] ?? shuJu['que_xin_du'] ?? 0),
      li_you: String(shuJu['理由'] ?? ''),
    },
    shi_po: {
      shi_fou_shi_po: Boolean(shuJu['是否识破'] ?? false),
      que_xin_du: anQuanQueXinDu(shuJu['识破确信度'] ?? shuJu['que_xin_du'] ?? 0),
      li_you: String(shuJu['理由'] ?? ''),
    },
    shen_jing_bing: jiaoSe
      ? {
          shi_fou_shen_jing_bing: Boolean(shuJu['是否神经病'] ?? false),
          fa_san_si_wei_ren_she: renSheNengJieShou,
          que_xin_du: anQuanQueXinDu(
            shuJu['神经病确信度'] ?? shuJu['确信度'] ?? shuJu['que_xin_du'] ?? 0,
          ),
          li_you: String(shuJu['理由'] ?? ''),
        }
      : kongShenJingBing,
  }
}

/** 兼容旧签名的综合检测入口：内部已收敛为单次结构化 LLM 调用 */
export async function jianCeYongHuXiaoXi(
  xiaoXi: string,
  duiHuaLiShi: DuiHuaLiShiXiang[] = [],
  jiaoSe?: AIJiaoSeXinXi,
  _shangXiaWen?: CanShuShangXiaWen,
  tuPianShouQuan?: boolean,
): Promise<SiLianJianShuChu> {
  void _shangXiaWen
  return jianCeSiLianHeYi(xiaoXi, duiHuaLiShi, jiaoSe, tuPianShouQuan)
}

async function huoQuJiaoSeJiBenXinXi(
  jiao_se_id: string,
): Promise<{ yong_hu_id: string | null; shi_fou_zha_xing: boolean } | null> {
  const jieGuo = await 数据库.query(
    `SELECT "用户ID", "是否渣型" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  return {
    yong_hu_id: jieGuo.rows[0].用户ID ? String(jieGuo.rows[0].用户ID) : null,
    shi_fou_zha_xing: Boolean(jieGuo.rows[0].是否渣型),
  }
}

async function yanZhengJiaoSeSuoYouQuan(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<boolean> {
  const jiaoSe = await huoQuJiaoSeJiBenXinXi(jiao_se_id)
  if (!jiaoSe || !jiaoSe.yong_hu_id) return false
  return jiaoSe.yong_hu_id === yong_hu_id
}

async function gengXinJiaoSeJieJuZhuangTai(
  jiao_se_id: string,
  jie_guo_lei_xing: YouXiJieGuoLeiXing,
): Promise<void> {
  const keJiXuLiaoTian = jie_guo_lei_xing === 'sheng_li_ai_qing'
  const fengCun = !keJiXuLiaoTian

  await 数据库.query(
    `UPDATE "角色" SET "封存" = $1, "可继续聊天" = $2, "结局状态" = $3 WHERE "ID" = $4`,
    [fengCun, keJiXuLiaoTian, jie_guo_lei_xing, jiao_se_id],
  )
}

/**
 * 结局趣味文案快照落库（FP-07）。刻意与 `结局状态` 的 UPDATE 分成两条语句：
 * 「同一局刷新一次换一句话」的病根就是文案没有真源，快照必须与结局同时写死，
 * 而 `结局落库.test.ts` 已把那条 UPDATE 的四参数形状钉成用例，故此处另起一条而不改它。
 * 存的是**已代入他/她的成品句**，读取侧不再二次渲染 —— 日后改文案池不影响历史局。
 */
async function xieRuJieGuoWenAnKuaiZhao(
  zhi_xing: (文本: string, 参数?: unknown[]) => Promise<unknown>,
  jiao_se_id: string,
  kuai_zhao: string,
): Promise<void> {
  await zhi_xing(`UPDATE "角色" SET "结局文案" = $1 WHERE "ID" = $2`, [kuai_zhao, jiao_se_id])
}
async function xieRuYouXiJieJu(
  yong_hu_id: string,
  jiao_se_id: string,
  jie_guo_lei_xing: YouXiJieGuoLeiXing,
  zhai_yao?: Record<string, unknown>,
): Promise<boolean> {
  // R2 幂等：并发触发结束时唯一约束兜底，仅首个写入返回 true
  const jieGuo = await 数据库.query(
    `INSERT INTO "游戏结局" ("用户ID", "角色ID", "结果状态", "摘要") VALUES ($1, $2, $3, $4)
     ON CONFLICT ("用户ID", "角色ID") DO NOTHING`,
    [yong_hu_id, jiao_se_id, jie_guo_lei_xing, zhai_yao ? JSON.stringify(zhai_yao) : JSON.stringify({})],
  )
  return (jieGuo.rowCount ?? 0) > 0
}

async function gengXinYouXiDangAn(
  zhi_xing: (文本: string, 参数?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>,
  yong_hu_id: string,
  jiao_se_id: string,
  jie_guo_lei_xing: YouXiJieGuoLeiXing,
): Promise<void> {
  const jiaoSe = await zhi_xing(`SELECT "名字", "是否渣型" FROM "角色" WHERE "ID" = $1 LIMIT 1`, [jiao_se_id])
  const haoGanDu = await zhi_xing(
    `SELECT "总分", "关系阶段" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
    [yong_hu_id, jiao_se_id],
  )
  const xiaoXiShu = await zhi_xing(
    `SELECT COUNT(*) as shu FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [yong_hu_id, jiao_se_id],
  )

  const jiaoSeMing = jiaoSe.rows[0]?.名字 ? String(jiaoSe.rows[0].名字) : ''
  const shiFouZhaXing = Boolean(jiaoSe.rows[0]?.是否渣型)
  const zongFen = haoGanDu.rows[0]?.总分 ? Number(haoGanDu.rows[0].总分) : 0
  const guanXiJieDuan = haoGanDu.rows[0]?.关系阶段 ? String(haoGanDu.rows[0].关系阶段) : ''
  const xiaoXiZongShu = xiaoXiShu.rows[0]?.shu ? Number(xiaoXiShu.rows[0].shu) : 0

  await zhi_xing(
    `INSERT INTO "游戏档案" (
      "用户ID", "角色ID", "角色名字", "是否渣型", "结果类型", "是否封存",
      "好感度总分", "关系阶段", "消息总数"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET
      "结果类型" = EXCLUDED."结果类型",
      "是否封存" = EXCLUDED."是否封存",
      "好感度总分" = EXCLUDED."好感度总分",
      "关系阶段" = EXCLUDED."关系阶段",
      "消息总数" = EXCLUDED."消息总数"`,
    [
      yong_hu_id,
      jiao_se_id,
      jiaoSeMing,
      shiFouZhaXing,
      jie_guo_lei_xing,
      jie_guo_lei_xing !== 'sheng_li_ai_qing',
      zongFen,
      guanXiJieDuan,
      xiaoXiZongShu,
    ],
  )
}

function tuiSongYouXiShiJian(
  yong_hu_id: string,
  jiao_se_id: string,
  jie_guo: YouXiJieShuJieGuo,
): void {
  const io = huoQuIo()
  if (io) {
    io.to(yong_hu_id).emit('游戏事件', {
      角色ID: jiao_se_id,
      lei_xing: jie_guo.jie_guo_lei_xing,
      xiao_xi: jie_guo.zhuang_tai_wen_ben,
      ke_ji_xu_liao_tian: jie_guo.ke_ji_xu_liao_tian,
      // 弹窗正文用趣味句快照，标题/分组用服务端判定的通关/失败 —— 前端不得再自写白名单
      jie_guo_wen_an: jie_guo.jie_guo_wen_an,
      shi_fou_tong_guan: jie_guo.shi_fou_tong_guan,
    })
    jiLuSocketShiJian('游戏事件', yong_hu_id, {
      jiao_se_id,
      jie_guo_lei_xing: jie_guo.jie_guo_lei_xing,
      ke_ji_xu_liao_tian: jie_guo.ke_ji_xu_liao_tian,
      shi_fou_tong_guan: jie_guo.shi_fou_tong_guan,
    })
  }
}

/**
 * P0-1：游戏结束后异步预生成复盘。
 * 动态导入 './复盘' 以规避 静态循环依赖（复盘→好感度→本模块）；
 * 失败仅记录日志，不影响游戏结束主流程（前端仍有懒加载兜底轮询）。
 */
function yiBuChuFaFuPanShengCheng(yong_hu_id: string, jiao_se_id: string): void {
  void (async () => {
    const dangAnJieGuo = await 数据库.query(
      `SELECT "ID" FROM "游戏档案" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
      [yong_hu_id, jiao_se_id],
    )
    const dangAnId = dangAnJieGuo?.rows?.[0]?.ID
    if (!dangAnId) return
    const { shengChengFuPan } = await import('./复盘')
    await shengChengFuPan(yong_hu_id, jiao_se_id, String(dangAnId))
  })().catch((cuo_wu) => {
    debug日志.error('胜负判定', '异步触发复盘生成失败', { xiang_qing: { cuo_wu: String(cuo_wu) } })
  })
}

async function huoQuJiaoSeXingBie(jiao_se_id: string): Promise<角色性别> {
  if (!yanZhengUUID(jiao_se_id)) return '未知'
  try {
    const jieGuo = await 数据库.query(
      `SELECT "性别" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
      [jiao_se_id],
    )
    return 归一角色性别(jieGuo.rows[0]?.性别)
  } catch (cuo_wu) {
    debug日志.warn('胜负判定', '读取角色性别失败，结局文案按未知性别渲染', {
      xiang_qing: { cuo_wu: String(cuo_wu) },
    })
    return '未知'
  }
}

export async function chuLiYouXiJieShu(
  yong_hu_id: string,
  jiao_se_id: string,
  jie_guo_lei_xing: YouXiJieGuoLeiXing,
  zhai_yao?: Record<string, unknown>,
): Promise<YouXiJieShuJieGuo> {
  const keJiXuLiaoTian = jie_guo_lei_xing === 'sheng_li_ai_qing'
  const xingBie = await huoQuJiaoSeXingBie(jiao_se_id)
  // FP-07：趣味文案只在**结算这一刻**随机一次，抽中结果即成快照；此后所有读取侧只看快照。
  const jieGuoWenAn = 随机结局趣味文案(jie_guo_lei_xing, xingBie)

  jiLuYouXiJieJu(yong_hu_id, jiao_se_id, jie_guo_lei_xing)

  // YH-057 结算四表同事务：角色状态（封存/可继续聊天/结局状态）、游戏结局、结局文案快照、
  // 游戏档案四条写必须在同一瞬间一起落定；任何一条失败整条 ROLLBACK，绝不留下
  // 「角色已结束但游戏档案仍进行中」的半套状态。
  // 重试的是**整个事务**（最多 ZHAN_JIE_ZHONG_SHI_CI_SHU 次）而不是单条语句：
  // 每次重试都从 BEGIN 重新走一遍四表，游戏结局的 ON CONFLICT DO NOTHING 保证幂等，
  // 结局文案快照在重试周期之外一次性抽定 ⇒ 重试不会换句子、也不会重复推送。
  // 外部 IO（socket 推送 / 复盘 / 挑战结算）一律在 COMMIT 之后才发生。
  // 兼容mock池：vi.mock后connect非函数或抛错，降级为无事务的逐表并行写。
  type ZhiXing = (文本: string, 参数?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>
  const jieRuZhiXing: ZhiXing = (文本, 参数) => 数据库.query(文本, 参数)
  const zhaiYaoWen = zhai_yao ? JSON.stringify(zhai_yao) : JSON.stringify({})
  let jieJuXieRuChengGong = false
  let zhongShiCiShu = 0
  for (;;) {
    const lianJieHanShu = (数据库 as unknown as { connect?: unknown }).connect
    let keHuDuan: { query: ZhiXing; release: () => void } | undefined
    if (typeof lianJieHanShu === 'function') {
      try {
        // 必须带接收者调用：pg 的 Pool.prototype.connect 内部读 this.ending / this._idle / this.options，
        // 摘出来裸调必抛 TypeError，被下面的 catch 吞掉后连接恒为 undefined ⇒ 结算链退化成逐句自动提交，
        // 「关键链单事务」形同虚设，一句失败就留下半套状态。
        keHuDuan = await (lianJieHanShu as () => Promise<typeof keHuDuan>).call(数据库)
      } catch {
        keHuDuan = undefined
      }
    }
    if (!keHuDuan) {
      const [, jieJuXieRu] = await Promise.all([
        gengXinJiaoSeJieJuZhuangTai(jiao_se_id, jie_guo_lei_xing),
        xieRuYouXiJieJu(yong_hu_id, jiao_se_id, jie_guo_lei_xing, zhai_yao),
        gengXinYouXiDangAn(jieRuZhiXing, yong_hu_id, jiao_se_id, jie_guo_lei_xing),
        xieRuJieGuoWenAnKuaiZhao(jieRuZhiXing, jiao_se_id, jieGuoWenAn),
      ])
      jieJuXieRuChengGong = jieJuXieRu
      break
    }
    const keHuDuanShiWu = keHuDuan
    try {
      await keHuDuanShiWu.query('BEGIN')
      await keHuDuanShiWu.query(
        `UPDATE "角色" SET "封存" = $1, "可继续聊天" = $2, "结局状态" = $3 WHERE "ID" = $4`,
        [!keJiXuLiaoTian, keJiXuLiaoTian, jie_guo_lei_xing, jiao_se_id],
      )
      const jieJuXieRu = await keHuDuanShiWu.query(
        `INSERT INTO "游戏结局" ("用户ID", "角色ID", "结果状态", "摘要") VALUES ($1, $2, $3, $4)
         ON CONFLICT ("用户ID", "角色ID") DO NOTHING`,
        [yong_hu_id, jiao_se_id, jie_guo_lei_xing, zhaiYaoWen],
      )
      await xieRuJieGuoWenAnKuaiZhao(
        (文本, 参数) => keHuDuanShiWu.query(文本, 参数),
        jiao_se_id,
        jieGuoWenAn,
      )
      await gengXinYouXiDangAn(
        (文本, 参数) => keHuDuanShiWu.query(文本, 参数),
        yong_hu_id,
        jiao_se_id,
        jie_guo_lei_xing,
      )
      await keHuDuanShiWu.query('COMMIT')
      jieJuXieRuChengGong = (jieJuXieRu.rowCount ?? 0) > 0
      break
    } catch (cuoWu) {
      await keHuDuanShiWu.query('ROLLBACK').catch(() => undefined)
      zhongShiCiShu += 1
      if (zhongShiCiShu >= ZHAN_JIE_ZHONG_SHI_CI_SHU) throw cuoWu
      await new Promise((jieJue) => setTimeout(jieJue, 100 * zhongShiCiShu))
    } finally {
      keHuDuanShiWu.release()
    }
  }

  const jieGuo: YouXiJieShuJieGuo = {
    jie_guo_lei_xing: jie_guo_lei_xing,
    zhuang_tai_wen_ben: 渲染结局文案(jie_guo_lei_xing, xingBie),
    jie_guo_wen_an: jieGuoWenAn,
    shi_fou_tong_guan: 是否通关结局(jie_guo_lei_xing),
    ke_ji_xu_liao_tian: keJiXuLiaoTian,
  }

  if (jieJuXieRuChengGong) {
    tuiSongYouXiShiJian(yong_hu_id, jiao_se_id, jieGuo)
    void yiBuChuFaFuPanShengCheng(yong_hu_id, jiao_se_id)
    // 挑战模式结算钩子：内部自判角色是否挑战局并幂等结算积分（非挑战局无副作用）
    void jieSuanTiaoZhanDuiJu(yong_hu_id, jiao_se_id, jie_guo_lei_xing)
  }

  return jieGuo
}

export async function chuLiYongHuBiaoBai(
  yong_hu_id: string,
  jiao_se_id: string,
  hao_gan_du_zong_fen: number,
): Promise<YouXiJieShuJieGuo | null> {
  const jiaoSe = await huoQuJiaoSeJiBenXinXi(jiao_se_id)
  if (!jiaoSe || !jiaoSe.yong_hu_id || jiaoSe.yong_hu_id !== yong_hu_id) return null

  if (jiaoSe.shi_fou_zha_xing) {
    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_bei_qi_pian', {
      lei_xing: '用户向渣型表白',
      hao_gan_du: hao_gan_du_zong_fen,
    })
  }

  if (hao_gan_du_zong_fen >= SHENG_LI_SHI_BAI_PEI_ZHI.biaoBaiHaoGanDuYuZhi) {
    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'sheng_li_ai_qing', {
      lei_xing: '用户主动表白成功',
      hao_gan_du: hao_gan_du_zong_fen,
    })
  }

  await kouChuZaoQiBiaoBaiXinRenDu(yong_hu_id, jiao_se_id)
  return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_guo_zao_biao_bai', {
    lei_xing: '过早表白',
    hao_gan_du: hao_gan_du_zong_fen,
  })
}

async function kouChuZaoQiBiaoBaiXinRenDu(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<void> {
  const qianSanJieDuan = ['冷淡', '疏远', '认识']
  const dangQianJieDuanMing = await huoQuDangQianJieDuanMing(yong_hu_id, jiao_se_id)
  if (qianSanJieDuan.includes(dangQianJieDuanMing)) {
    await gengXinHaoGanDu(yong_hu_id, jiao_se_id, {
      xin_ren_du_bian_hua: -50,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
    })
  }
}

async function huoQuDangQianJieDuanMing(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<string> {
  const jieGuo = await 数据库.query(
    `SELECT "关系阶段" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
    [yong_hu_id, jiao_se_id],
  )
  return jieGuo.rows[0]?.关系阶段 ? String(jieGuo.rows[0].关系阶段) : ''
}

export async function chuLiHuShan(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<YouXiJieShuJieGuo | null> {
  const jiaoSe = await huoQuJiaoSeJiBenXinXi(jiao_se_id)
  if (!jiaoSe || !jiaoSe.yong_hu_id || jiaoSe.yong_hu_id !== yong_hu_id) return null

  if (jiaoSe.shi_fou_zha_xing) {
    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'sheng_li_hu_shan_sheng_li', {
      lei_xing: '用户与渣型互删',
    })
  }

  return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_hu_shan_shi_bai', {
    lei_xing: '用户与正常角色互删',
  })
}

export async function chuLiShiPo(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<YouXiJieShuJieGuo | null> {
  const jiaoSe = await huoQuJiaoSeJiBenXinXi(jiao_se_id)
  if (!jiaoSe || !jiaoSe.yong_hu_id || jiaoSe.yong_hu_id !== yong_hu_id) return null

  if (jiaoSe.shi_fou_zha_xing) {
    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'sheng_li_shi_po', {
      lei_xing: '用户识破渣型',
    })
  }

  return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_cuo_wu_shi_po', {
    lei_xing: '用户错误识破正常角色',
  })
}

async function shengChengJingGaoFanYing(jiao_se?: AIJiaoSeXinXi): Promise<string> {
  const renSheDuanLuo = jiao_se
    ? [
        '【角色人设摘要】',
        `MBTI：${jiao_se.mbti_lei_xing}`,
        `性格：${jiao_se.xing_ge}`,
        `说话风格：${jiao_se.yan_yu_feng_ge}`,
      ]
    : []
  const xiangYing = await genJuPeiZhiTiaoYong('jiaoSeJingGaoFanYing', [
    { jiaoSe: 'system', neiRong: '你是恋爱模拟游戏的角色反应生成器。只输出 JSON。' },
    {
      jiaoSe: 'user',
      neiRong: [
        '用户刚发了一条让角色觉得莫名其妙、有点奇怪的消息。',
        ...renSheDuanLuo,
        '',
        '请以该角色的口吻生成一句自然反应，要求：',
        '- 只输出一句话，口语化',
        '- 表达困惑或觉得对方有点奇怪，但不要撕破脸',
        '- 不要动作描写，不要括号',
        '',
        '输出 JSON：{',
        '  "反应消息": "string"',
        '}',
        '只输出 JSON。',
      ].join('\n'),
    },
  ])
  const shuJu = jieXiJSONXiangYing(xiangYing.neiRong)
  return String(shuJu['反应消息'] ?? '').trim()
}

export async function chuLiShenJingBing(
  yong_hu_id: string,
  jiao_se_id: string,
  fa_san_si_wei_ren_she = false,
  jiao_se?: AIJiaoSeXinXi,
): Promise<YouXiJieShuJieGuo | null> {
  const jiaoSe = await huoQuJiaoSeJiBenXinXi(jiao_se_id)
  if (!jiaoSe || !jiaoSe.yong_hu_id || jiaoSe.yong_hu_id !== yong_hu_id) return null

  if (jiaoSe.shi_fou_zha_xing) {
    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'sheng_li_shen_jing_bing', {
      lei_xing: '渣型角色诱导用户被视为神经病',
    })
  }

  if (fa_san_si_wei_ren_she) return null

  const jingGaoPeiZhi = SHENG_LI_SHI_BAI_PEI_ZHI.shenJingBingJingGao
  const jingGaoJian = `${jingGaoPeiZhi.redisJianQianZhui}${yong_hu_id}:${jiao_se_id}`
  let shouCiChuFa = false
  try {
    shouCiChuFa = Boolean(await redis.set(jingGaoJian, '1', 'EX', jingGaoPeiZhi.redisTtlMiao, 'NX'))
  } catch (cuo_wu) {
    debug日志.error('胜负判定', '神经病警告Redis标记失败，按首次触发降级处理', { xiang_qing: { cuo_wu: String(cuo_wu) } })
    shouCiChuFa = true
  }

  if (!shouCiChuFa) {
    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_shen_jing_bing', {
      lei_xing: '正常角色判定用户为神经病',
    })
  }

  debug日志.warn(
    '胜负判定',
    `[神经病警告降级] 正常角色首次触发，跳过失败结局改为警告：用户=${yong_hu_id} 角色=${jiao_se_id}`,
  )

  try {
    const fanYingNeiRong = await shengChengJingGaoFanYing(jiao_se)
    if (!fanYingNeiRong) throw new Error('警告反应消息为空')
    const baoCunJieGuo = await baoCunJiaoSeXiaoXi({
      yong_hu_id,
      jiao_se_id,
      nei_rong: fanYingNeiRong,
    })
    const io = huoQuIo()
    if (io) {
      io.to(yong_hu_id).emit('角色回复', { 角色ID: jiao_se_id, 消息列表: [baoCunJieGuo] })
      jiLuSocketShiJian('角色回复', yong_hu_id, { jiao_se_id, lai_yuan: 'shen_jing_bing_jing_gao' })
    }
  } catch (cuo_wu) {
    debug日志.warn('胜负判定', '神经病警告反应生成失败，跳过角色消息，仅执行好感度扣除', { xiang_qing: { cuo_wu: String(cuo_wu) } })
  }

  await gengXinHaoGanDu(yong_hu_id, jiao_se_id, jingGaoPeiZhi.kouFenFenPei)
  return null
}

export async function chuLiAIHuiFuHouJieShuJianCha(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<YouXiJieShuJieGuo | null> {
  const haoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
  if (!haoGanDu) return null

  if (haoGanDu.zong_fen <= 0) {
    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_hao_gan_du_gui_ling', {
      lei_xing: '好感度归零',
      hao_gan_du: haoGanDu.zong_fen,
    })
  }

  return null
}

export async function chuLiAIJieShouBiaoBai(
  yong_hu_id: string,
  jiao_se_id: string,
  jiao_se: AIJiaoSeXinXi,
): Promise<YouXiJieShuJieGuo | null> {
  if (jiao_se.shi_fou_zha_xing) {
    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_bei_zha_xing_qi_pian', {
      lei_xing: '用户接受渣型表白',
    })
  }

  return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'sheng_li_ai_qing', {
    lei_xing: 'AI主动表白成功',
  })
}

export async function chuLiYongHuJuJueAIHuoJieShou(
  yong_hu_id: string,
  jiao_se_id: string,
  jiao_se: AIJiaoSeXinXi,
  yong_hu_xiao_xi: string,
  shangXiaWen?: CanShuShangXiaWen,
  dui_hua_li_shi?: DuiHuaLiShiXiang[],
): Promise<YouXiJieShuJieGuo | null> {
  const shangXiaWenShiJi = shangXiaWen ?? { jiaoSe: gouJianJiaoSeShangXiaWen(jiao_se) }
  // FP-08 去重：用户这条回复单独呈现，历史里不再重复同一条
  const { 背景 } = fenGeZuiXinYongHuXiaoXi(dui_hua_li_shi ?? [])
  const liShiWenBen = zhanShiLiShiWenBen(背景, {
    角色名: '角色',
    用户名: '用户',
    最多条数: SHENG_LI_SHI_BAI_PEI_ZHI.biaoBaiPanDuanLiShiTiaoShu,
    时间在前: true,
  })
  const xiangYing = await genJuPeiZhiTiaoYong('jieShouBiaoBaiJianCe', [
    { jiaoSe: 'system', neiRong: '判断用户回复是接受表白还是拒绝，只输出 JSON。' },
    {
      jiaoSe: 'user',
      neiRong: [
        '角色刚向用户表白，看看用户这条回复是接受了还是拒绝了。',
        '',
        '【最近聊天】',
        liShiWenBen || '（无）',
        '',
        `用户回复：${yong_hu_xiao_xi}`,
        '',
        '若回复含糊其辞、犹豫、未明确表达接受或拒绝（如"让我想想"），是否模糊回复为 true。',
        '',
        '输出 JSON：{',
        '  "是否接受": boolean,',
        '  "确信度": number（0-1）,',
        '  "是否模糊回复": boolean,',
        '  "理由": "string"',
        '}',
        '只输出 JSON。',
      ].join('\n'),
    },
  ], shangXiaWenShiJi)

  const shuJu = jieXiJSONXiangYing(xiangYing.neiRong)
  const jieShou = Boolean(shuJu['是否接受'] ?? shuJu['shi_fou_jie_shou'] ?? false)
  const queXinDu = anQuanQueXinDu(shuJu['确信度'] ?? shuJu['que_xin_du'] ?? 0)
  const moHuHuiFu = Boolean(shuJu['是否模糊回复'] ?? false)
  const yueShu = SHENG_LI_SHI_BAI_PEI_ZHI.biaoBaiHuiFuQueXinDuYueShu

  if (!moHuHuiFu && jieShou && queXinDu > yueShu) {
    return chuLiAIJieShouBiaoBai(yong_hu_id, jiao_se_id, jiao_se)
  }

  if (!moHuHuiFu && !jieShou && queXinDu > yueShu) {
    if (jiao_se.shi_fou_zha_xing) {
      // 用户拒绝渣型表白，游戏继续，不触发结束
      return null
    }

    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_ju_jue_biao_bai', {
      lei_xing: '用户拒绝正常角色表白',
    })
  }

  return null
}

export async function jianCeYongHuXiaoXiBingChuLi(
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi: string,
  hao_gan_du_zong_fen: number,
  deng_dai_biao_bai_hui_fu: boolean,
  jiao_se?: AIJiaoSeXinXi,
  dui_hua_li_shi?: DuiHuaLiShiXiang[],
  tuPianShouQuan?: boolean,
): Promise<YouXiJieShuJieGuo | null> {
  const shiHeFaYongHu = await yanZhengJiaoSeSuoYouQuan(yong_hu_id, jiao_se_id)
  if (!shiHeFaYongHu) return null

  const jianCeJieGuo = await jianCeYongHuXiaoXi(xiao_xi, dui_hua_li_shi, jiao_se, undefined, tuPianShouQuan)

  if (deng_dai_biao_bai_hui_fu && jiao_se) {
    return chuLiYongHuJuJueAIHuoJieShou(yong_hu_id, jiao_se_id, jiao_se, xiao_xi, undefined, dui_hua_li_shi)
  }

  // YH-056 三处判定阈值统一读配置出处，禁硬编码0.7
  const tongYongYueShu = QUE_XIN_DU_YUE_SHU.tongYongJianCe
  if (jianCeJieGuo.biao_bai.shi_fou_biao_bai && jianCeJieGuo.biao_bai.que_xin_du > tongYongYueShu) {
    return chuLiYongHuBiaoBai(yong_hu_id, jiao_se_id, hao_gan_du_zong_fen)
  }

  if (jianCeJieGuo.hu_shan.shi_fou_hu_shan && jianCeJieGuo.hu_shan.que_xin_du > tongYongYueShu) {
    return chuLiHuShan(yong_hu_id, jiao_se_id)
  }

  if (jianCeJieGuo.shi_po.shi_fou_shi_po && jianCeJieGuo.shi_po.que_xin_du > tongYongYueShu) {
    return chuLiShiPo(yong_hu_id, jiao_se_id)
  }

  if (
    jianCeJieGuo.shen_jing_bing.shi_fou_shen_jing_bing &&
    jianCeJieGuo.shen_jing_bing.que_xin_du > SHENG_LI_SHI_BAI_PEI_ZHI.shenJingBingQueXinDuYueShu
  ) {
    return chuLiShenJingBing(
      yong_hu_id,
      jiao_se_id,
      jianCeJieGuo.shen_jing_bing.fa_san_si_wei_ren_she,
      jiao_se,
    )
  }

  return null
}

