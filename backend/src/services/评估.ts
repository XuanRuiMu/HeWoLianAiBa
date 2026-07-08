import { 数据库 } from '../数据库'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { huoQuXiaoXiLieBiao } from './消息'
import { huoQuFuPanTiaoMuLieBiao } from './复盘条目'

export interface PingGuWeiDu {
  fen: number
  shuo_ming: string
}

export interface PingGuJieGuo {
  '话题引导': PingGuWeiDu
  '情感共鸣': PingGuWeiDu
  '幽默感': PingGuWeiDu
  '体贴度': PingGuWeiDu
  '节奏把控': PingGuWeiDu
  '总体评价': string
  '改进建议': string[]
}

interface PingGuJSONJieGou {
  '话题引导'?: { 分数?: number; 说明?: string }
  '情感共鸣'?: { 分数?: number; 说明?: string }
  '幽默感'?: { 分数?: number; 说明?: string }
  '体贴度'?: { 分数?: number; 说明?: string }
  '节奏把控'?: { 分数?: number; 说明?: string }
  '总体评价'?: string
  '改进建议'?: string[]
}

const PING_GU_MAX_XIAO_XI = 999
const PING_GU_MAX_FU_PAN_TIAO_MU = 30

function jieXiJSONXiangYing(neiRong: string): PingGuJSONJieGou {
  const qingLiNeiRong = neiRong.trim()
  try {
    return JSON.parse(qingLiNeiRong) as PingGuJSONJieGou
  } catch {
    const piPei = qingLiNeiRong.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        return JSON.parse(piPei[0]) as PingGuJSONJieGou
      } catch {
        return {}
      }
    }
    return {}
  }
}

function gouJianPingGuPrompt(
  jiaoSeMing: string,
  jieJuZhuangTai: string,
  xiaoXiLieBiao: { fa_song_zhe: string; nei_rong: string; shi_jian: string }[],
  fuPanTiaoMu: { yong_hu_xiao_xi: string; ai_hui_fu: string; ai_xin_li_huo_dong: string }[],
): string {
  const xiaoXiWenBen = xiaoXiLieBiao
    .map((xiaoXi) => `[${xiaoXi.shi_jian}] ${xiaoXi.fa_song_zhe}: ${xiaoXi.nei_rong}`)
    .join('\n')

  const fuPanTiaoMuWenBen = fuPanTiaoMu
    .map(
      (tiaoMu) =>
        `用户：${tiaoMu.yong_hu_xiao_xi}\nAI：${tiaoMu.ai_hui_fu}\n内心活动：${tiaoMu.ai_xin_li_huo_dong}`,
    )
    .join('\n---\n')

  return [
    '你是一位专业的恋爱聊天水平评估师。请根据用户与AI角色的完整对话记录和AI复盘条目，从5个维度评估用户的聊天水平。',
    '',
    '要求：',
    '1. 输出必须是合法JSON，包含5个维度：话题引导、情感共鸣、幽默感、体贴度、节奏把控。每个维度包含"分数"（1-10整数）和"说明"（string）。',
    '2. 额外包含"总体评价"（string）和"改进建议"（字符串数组，3-5条）。',
    '3. 不要出现"信任度"、"亲密度"、"趣味度"、"关怀度"、"总分"、"好感度"等内部维度名。',
    '',
    `角色名字：${jiaoSeMing}`,
    `最终结局：${jieJuZhuangTai}`,
    '',
    '完整对话记录：',
    xiaoXiWenBen || '（无对话记录）',
    '',
    'AI复盘条目（后台数据）：',
    fuPanTiaoMuWenBen || '（无复盘条目）',
    '',
    '请只输出合法JSON，不要任何额外说明。',
  ].join('\n')
}

function zhuanHuanWeiDu(weiDu?: PingGuJSONJieGou['话题引导']): PingGuWeiDu {
  const fen = Number(weiDu?.分数)
  return {
    fen: Number.isNaN(fen) || fen < 1 || fen > 10 ? 5 : Math.round(fen),
    shuo_ming: String(weiDu?.说明 || ''),
  }
}

export async function pingGuLiaoTianShuiPing(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<PingGuJieGuo> {
  const [jiaoSeJieGuo, dangAnJieGuo] = await Promise.all([
    数据库.query(`SELECT "名字", "结局状态" FROM "角色" WHERE "ID" = $1 LIMIT 1`, [jiao_se_id]),
    数据库.query(
      `SELECT "结果类型" FROM "游戏档案" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
      [yong_hu_id, jiao_se_id],
    ),
  ])

  const jiaoSeMing = String(jiaoSeJieGuo.rows[0]?.名字 || '')
  const jieJuZhuangTai = String(
    dangAnJieGuo.rows[0]?.结果类型 || jiaoSeJieGuo.rows[0]?.结局状态 || '未知',
  )

  const [xiaoXiJieGuo, fuPanTiaoMu] = await Promise.all([
    huoQuXiaoXiLieBiao({
      yong_hu_id,
      jiao_se_id,
      ye_ma: 1,
      mei_ye_tiao_shu: PING_GU_MAX_XIAO_XI,
    }),
    huoQuFuPanTiaoMuLieBiao(yong_hu_id, jiao_se_id, PING_GU_MAX_FU_PAN_TIAO_MU),
  ])

  const xiaoXiLieBiao = xiaoXiJieGuo.lie_biao
    .filter((xiaoXi) => xiaoXi.fa_song_zhe_lei_xing !== 'xitong')
    .reverse()
    .map((xiaoXi) => ({
      fa_song_zhe: xiaoXi.fa_song_zhe_lei_xing === 'jiaose' ? jiaoSeMing || 'TA' : '你',
      nei_rong: xiaoXi.nei_rong,
      shi_jian: geShiHuaShiJian(xiaoXi.shi_jian_chuo),
    }))

  const prompt = gouJianPingGuPrompt(jiaoSeMing, jieJuZhuangTai, xiaoXiLieBiao, fuPanTiaoMu)

  const xiangYing = await genJuPeiZhiTiaoYong('liaoTianShuiPingPingGu', [
    { jiaoSe: 'system', neiRong: '你是恋爱聊天水平评估师，只输出合法JSON。' },
    { jiaoSe: 'user', neiRong: prompt },
  ])

  const jieGou = jieXiJSONXiangYing(xiangYing.neiRong)

  const jieGuo: PingGuJieGuo = {
    '话题引导': zhuanHuanWeiDu(jieGou['话题引导']),
    '情感共鸣': zhuanHuanWeiDu(jieGou['情感共鸣']),
    '幽默感': zhuanHuanWeiDu(jieGou['幽默感']),
    '体贴度': zhuanHuanWeiDu(jieGou['体贴度']),
    '节奏把控': zhuanHuanWeiDu(jieGou['节奏把控']),
    '总体评价': String(jieGou['总体评价'] || ''),
    '改进建议': Array.isArray(jieGou['改进建议']) ? jieGou['改进建议'].map(String) : [],
  }

  await baoCunPingGu(yong_hu_id, jiao_se_id, jieGuo)

  return jieGuo
}

export async function huoQuPingGuLiShi(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<PingGuJieGuo | null> {
  const jieGuo = await 数据库.query(
    `SELECT "话题引导", "情感共鸣", "幽默感", "体贴度", "节奏把控", "总体评价", "改进建议"
     FROM "评估" WHERE "用户ID" = $1 AND "角色ID" = $2
     ORDER BY "创建时间" DESC LIMIT 1`,
    [yong_hu_id, jiao_se_id],
  )

  if (jieGuo.rows.length === 0) return null

  const row = jieGuo.rows[0]
  return {
    '话题引导': row.话题引导 || { fen: 0, shuo_ming: '' },
    '情感共鸣': row.情感共鸣 || { fen: 0, shuo_ming: '' },
    '幽默感': row.幽默感 || { fen: 0, shuo_ming: '' },
    '体贴度': row.体贴度 || { fen: 0, shuo_ming: '' },
    '节奏把控': row.节奏把控 || { fen: 0, shuo_ming: '' },
    '总体评价': String(row.总体评价 || ''),
    '改进建议': Array.isArray(row.改进建议) ? row.改进建议 : [],
  }
}

async function baoCunPingGu(
  yong_hu_id: string,
  jiao_se_id: string,
  ping_gu: PingGuJieGuo,
): Promise<void> {
  await 数据库.query(
    `INSERT INTO "评估" (
      "用户ID", "角色ID", "话题引导", "情感共鸣", "幽默感", "体贴度", "节奏把控",
      "总体评价", "改进建议"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      yong_hu_id,
      jiao_se_id,
      JSON.stringify(ping_gu['话题引导']),
      JSON.stringify(ping_gu['情感共鸣']),
      JSON.stringify(ping_gu['幽默感']),
      JSON.stringify(ping_gu['体贴度']),
      JSON.stringify(ping_gu['节奏把控']),
      ping_gu['总体评价'],
      JSON.stringify(ping_gu['改进建议']),
    ],
  )
}

function geShiHuaShiJian(shi_jian_chuo: number): string {
  const shi_jian = new Date(shi_jian_chuo)
  const xiao_shi = String(shi_jian.getHours()).padStart(2, '0')
  const fen_zhong = String(shi_jian.getMinutes()).padStart(2, '0')
  return `${xiao_shi}:${fen_zhong}`
}
