import { 数据库 } from '../数据库'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { huoQuXiaoXiLieBiao } from './消息'
import { huoQuFuPanTiaoMuLieBiao } from './复盘条目'
import { huoQuJunShiJiLuLieBiao } from './军师缓存'
import { gengXinFuPanNeiRong } from './战绩'
import type { FuPanTiaoMuXinXi } from './复盘条目'
import type { FuPanShiJianXianTiaoMu } from './战绩'

export interface FuPanShengChengJieGuo {
  fu_pan_nei_rong: string
  fu_pan_shi_jian_xian: FuPanShiJianXianTiaoMu[]
}

interface FuPanJSONJieGou {
  逐句分析?: string
  聊对了什么?: string
  聊错了什么?: string
  撤回分析?: string
  军师建议效果?: string
  关键事件时间线?: string[]
  总结评价?: string
}

const FU_PAN_MAX_XIAO_XI = 999
const FU_PAN_MAX_TIAO_MU = 50
const FU_PAN_MAX_JUN_SHI_JI_LU = 20

function jieXiJSONXiangYing(neiRong: string): FuPanJSONJieGou {
  const qingLiNeiRong = neiRong.trim()
  try {
    return JSON.parse(qingLiNeiRong) as FuPanJSONJieGou
  } catch {
    const piPei = qingLiNeiRong.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        return JSON.parse(piPei[0]) as FuPanJSONJieGou
      } catch {
        return {}
      }
    }
    return {}
  }
}

function gouJianFuPanPrompt(
  jiaoSeMing: string,
  jieJuZhuangTai: string,
  xiaoXiLieBiao: { fa_song_zhe: string; nei_rong: string; shi_jian: string; yi_che_hui?: boolean; yuan_shi_nei_rong?: string | null }[],
  fuPanTiaoMu: FuPanTiaoMuXinXi[],
  junShiJiLu: { shi_jian: string; jian_yi: string }[],
  haoGanDuZongFen: number,
): string {
  const xiaoXiWenBen = xiaoXiLieBiao
    .map(
      (xiaoXi) =>
        `[${xiaoXi.shi_jian}] ${xiaoXi.fa_song_zhe}: ${xiaoXi.nei_rong}${
          xiaoXi.yi_che_hui ? `（已撤回，原始内容：${xiaoXi.yuan_shi_nei_rong || ''}）` : ''
        }`,
    )
    .join('\n')

  const fuPanTiaoMuWenBen = fuPanTiaoMu
    .map(
      (tiaoMu) =>
        `[${tiaoMu.shi_jian}] 用户：${tiaoMu.yong_hu_xiao_xi}\nAI：${tiaoMu.ai_hui_fu}\n内心活动：${tiaoMu.ai_xin_li_huo_dong}`,
    )
    .join('\n---\n')

  const junShiJiLuWenBen = junShiJiLu.map((jiLu) => `[${jiLu.shi_jian}] ${jiLu.jian_yi}`).join('\n---\n')

  return [
    '你是一位专业的恋爱聊天复盘分析师。请根据以下完整对话记录、AI复盘条目、军师指导记录和最终结局，生成一份结构化的复盘报告。',
    '',
    '要求：',
    '1. 输出必须是合法JSON，包含以下7个字段：逐句分析、聊对了什么、聊错了什么、撤回分析、军师建议效果、关键事件时间线、总结评价。',
    '2. "关键事件时间线"必须是字符串数组，每条格式严格为"HH:MM - 事件描述"，列出5-10个关键转折点。',
    '3. 总结评价中不得出现数字评分，不得出现"信任度"、"亲密度"、"趣味度"、"关怀度"、"总分"、"阶段"、"好感度"等维度名或分数相关字样。',
    '4. 复盘中不得出现具体分数、维度名、阶段名或"好感度"字样。',
    '5. 军师建议效果分析需要评价军师给出的建议对用户聊天策略的实际帮助。',
    '',
    `角色名字：${jiaoSeMing}`,
    `最终结局：${jieJuZhuangTai}`,
    `最终关系总分（仅后台参考，不得暴露）：${haoGanDuZongFen}`,
    '',
    '完整对话记录：',
    xiaoXiWenBen || '（无对话记录）',
    '',
    'AI复盘条目（后台数据，含内心活动与变化）：',
    fuPanTiaoMuWenBen || '（无复盘条目）',
    '',
    '军师指导记录：',
    junShiJiLuWenBen || '（无军师指导记录）',
    '',
    '请只输出合法JSON，不要任何额外说明。',
  ].join('\n')
}

function zhuanHuanShiJianXian(
  shiJianXianWenBen: string[] | undefined,
  xiaoXiLieBiao: { fa_song_zhe: string; nei_rong: string; shi_jian: string }[],
  fuPanTiaoMu: FuPanTiaoMuXinXi[],
): FuPanShiJianXianTiaoMu[] {
  const jieGuo: FuPanShiJianXianTiaoMu[] = []
  const youXiaoTiaoMu = Array.isArray(shiJianXianWenBen) ? shiJianXianWenBen : []

  for (const tiaoMu of youXiaoTiaoMu.slice(0, 10)) {
    const piPei = tiaoMu.match(/^(\d{2}:\d{2})\s*-\s*(.+)$/)
    if (!piPei) continue

    const shiJian = piPei[1]
    const miaoShu = piPei[2].trim()

    const duiYingXiaoXi = xiaoXiLieBiao.find((xiaoXi) => xiaoXi.shi_jian === shiJian)
    const duiYingFuPan = fuPanTiaoMu.find((t) => {
      const tShiJian = t.shi_jian.match(/\d{2}:\d{2}/)
      return tShiJian && tShiJian[0] === shiJian
    })

    jieGuo.push({
      shi_jian: shiJian,
      shi_jian_miao_shu: miaoShu,
      yong_hu_xiao_xi: duiYingFuPan?.yong_hu_xiao_xi || duiYingXiaoXi?.nei_rong || '',
      ai_hui_fu: duiYingFuPan?.ai_hui_fu || '',
      ai_xin_li_huo_dong: duiYingFuPan?.ai_xin_li_huo_dong || '',
      hao_gan_du_bian_hua: duiYingFuPan?.hao_gan_du_bian_hua
        ? {
            xin_ren_bian_hua: duiYingFuPan.hao_gan_du_bian_hua.xin_ren_bian_hua,
            qin_mi_bian_hua: duiYingFuPan.hao_gan_du_bian_hua.qin_mi_bian_hua,
            qu_wei_bian_hua: duiYingFuPan.hao_gan_du_bian_hua.qu_wei_bian_hua,
            guan_huai_bian_hua: duiYingFuPan.hao_gan_du_bian_hua.guan_huai_bian_hua,
            zong_fen_bian_hua: duiYingFuPan.hao_gan_du_bian_hua.zong_fen_bian_hua,
          }
        : undefined,
    })
  }

  return jieGuo
}

function shengChengFuPanNeiRong(jieGou: FuPanJSONJieGou): string {
  const shiJianXian = Array.isArray(jieGou.关键事件时间线)
    ? jieGou.关键事件时间线
        .filter((tiaoMu) => typeof tiaoMu === 'string' && tiaoMu.trim().length > 0)
        .map((tiaoMu) => `- ${tiaoMu}`)
        .join('\n')
    : ''

  const buFen = [
    jieGou.逐句分析 ? `## 逐句分析\n${jieGou.逐句分析}` : '',
    jieGou.聊对了什么 ? `## 聊对了什么\n${jieGou.聊对了什么}` : '',
    jieGou.聊错了什么 ? `## 聊错了什么\n${jieGou.聊错了什么}` : '',
    jieGou.撤回分析 ? `## 撤回分析\n${jieGou.撤回分析}` : '',
    jieGou.军师建议效果 ? `## 军师建议效果\n${jieGou.军师建议效果}` : '',
    shiJianXian ? `## 关键事件时间线\n${shiJianXian}` : '',
    jieGou.总结评价 ? `## 总结评价\n${jieGou.总结评价}` : '',
  ]
  return buFen.filter(Boolean).join('\n\n')
}

export async function shengChengFuPan(
  yong_hu_id: string,
  jiao_se_id: string,
  dang_an_id: string,
): Promise<FuPanShengChengJieGuo> {
  const [jiaoSeJieGuo, dangAnJieGuo] = await Promise.all([
    数据库.query(`SELECT "名字", "结局状态" FROM "角色" WHERE "ID" = $1 LIMIT 1`, [jiao_se_id]),
    数据库.query(
      `SELECT "好感度总分", "结果类型" FROM "游戏档案" WHERE "ID" = $1 AND "用户ID" = $2 LIMIT 1`,
      [dang_an_id, yong_hu_id],
    ),
  ])

  const jiaoSeMing = String(jiaoSeJieGuo.rows[0]?.名字 || '')
  const jieJuZhuangTai = String(
    dangAnJieGuo.rows[0]?.结果类型 || jiaoSeJieGuo.rows[0]?.结局状态 || '未知',
  )
  const haoGanDuZongFen = Number(dangAnJieGuo.rows[0]?.好感度总分 || 0)

  const [xiaoXiJieGuo, fuPanTiaoMu, junShiJiLu] = await Promise.all([
    huoQuXiaoXiLieBiao({
      yong_hu_id,
      jiao_se_id,
      ye_ma: 1,
      mei_ye_tiao_shu: FU_PAN_MAX_XIAO_XI,
    }),
    huoQuFuPanTiaoMuLieBiao(yong_hu_id, jiao_se_id, FU_PAN_MAX_TIAO_MU),
    huoQuJunShiJiLuLieBiao(yong_hu_id, jiao_se_id).then((lieBiao) =>
      lieBiao.slice(0, FU_PAN_MAX_JUN_SHI_JI_LU).map((jiLu) => ({
        shi_jian: jiLu.shi_jian,
        jian_yi: jiLu.jian_yi,
      })),
    ),
  ])

  const xiaoXiLieBiao = xiaoXiJieGuo.lie_biao
    .filter((xiaoXi) => xiaoXi.fa_song_zhe_lei_xing !== 'xitong')
    .reverse()
    .map((xiaoXi) => ({
      fa_song_zhe: xiaoXi.fa_song_zhe_lei_xing === 'jiaose' ? jiaoSeMing || 'TA' : '你',
      nei_rong: xiaoXi.nei_rong,
      shi_jian: geShiHuaShiJian(xiaoXi.shi_jian_chuo),
      yi_che_hui: xiaoXi.yi_che_hui,
      yuan_shi_nei_rong: xiaoXi.yuan_shi_nei_rong,
    }))

  const prompt = gouJianFuPanPrompt(
    jiaoSeMing,
    jieJuZhuangTai,
    xiaoXiLieBiao,
    fuPanTiaoMu,
    junShiJiLu,
    haoGanDuZongFen,
  )

  const xiangYing = await genJuPeiZhiTiaoYong('fuPanShengCheng', [
    { jiaoSe: 'system', neiRong: '你是恋爱聊天复盘分析师，只输出合法JSON。' },
    { jiaoSe: 'user', neiRong: prompt },
  ])

  const jieGou = jieXiJSONXiangYing(xiangYing.neiRong)
  const fuPanNeiRong = shengChengFuPanNeiRong(jieGou)
  const fuPanShiJianXian = zhuanHuanShiJianXian(jieGou.关键事件时间线, xiaoXiLieBiao, fuPanTiaoMu)

  const jieGuo: FuPanShengChengJieGuo = {
    fu_pan_nei_rong: fuPanNeiRong || xiangYing.neiRong,
    fu_pan_shi_jian_xian: fuPanShiJianXian,
  }

  await gengXinFuPanNeiRong(dang_an_id, jieGuo.fu_pan_nei_rong, jieGuo.fu_pan_shi_jian_xian)

  return jieGuo
}

function geShiHuaShiJian(shi_jian_chuo: number): string {
  const shi_jian = new Date(shi_jian_chuo)
  const xiao_shi = String(shi_jian.getHours()).padStart(2, '0')
  const fen_zhong = String(shi_jian.getMinutes()).padStart(2, '0')
  return `${xiao_shi}:${fen_zhong}`
}
