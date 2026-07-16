import { 数据库 } from '../数据库'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gengXinHaoGanDu, huoQuWanZhengHaoGanDu } from './好感度'
import { huoQuIo } from '../socket/io'
import { shengChengFuPan } from './复盘'
import { jiLuYouXiJieJu, jiLuSocketShiJian } from '../utils/debug日志'
import { huoQuFanYi } from '../config/translations'
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

export async function jianCeBiaoBai(xiaoXi: string): Promise<BiaoBaiJianCeJieGuo> {
  const xiangYing = await genJuPeiZhiTiaoYong('biaoBaiJianCe', [
    { jiaoSe: 'system', neiRong: '判断用户消息有没有表白或想确立关系的意思，只输出 JSON。' },
    {
      jiaoSe: 'user',
      neiRong: [
        '看看下面这条消息，是不是在表白、暗示表白，或者想确定恋爱关系。',
        `消息内容：${xiaoXi}`,
        '',
        '输出 JSON：{',
        '  "是否表白": boolean,',
        '  "表白类型": "直接表白" | "暗示表白" | "要求确立关系" | "非表白",',
        '  "确信度": number（0-1）,',
        '  "理由": "string"',
        '}',
        '只输出 JSON。',
      ].join('\n'),
    },
  ])

  const shuJu = jieXiJSONXiangYing(xiangYing.neiRong)
  const queXinDu = Number(shuJu['确信度'] ?? shuJu['que_xin_du'] ?? 0)
  const leiXing = String(shuJu['表白类型'] ?? shuJu['biao_bai_lei_xing'] ?? '非表白')
  const shiFouBiaoBai = Boolean(shuJu['是否表白'] ?? shuJu['shi_fou_biao_bai'] ?? false)

  const leiXingYingShe: Record<string, BiaoBaiJianCeJieGuo['biao_bai_lei_xing']> = {
    直接表白: 'zhi_jie_biao_bai',
    暗示表白: 'an_shi_biao_bai',
    要求确立关系: 'yao_qiu_que_li_guan_xi',
  }
  const youXiaoLeiXing: BiaoBaiJianCeJieGuo['biao_bai_lei_xing'] = leiXingYingShe[leiXing] || 'fei_biao_bai'

  return {
    shi_fou_biao_bai: shiFouBiaoBai,
    biao_bai_lei_xing: youXiaoLeiXing,
    que_xin_du: Number.isNaN(queXinDu) ? 0 : queXinDu,
    li_you: String(shuJu['理由'] ?? shuJu['li_you'] ?? ''),
  }
}

export async function jianCeHuShan(xiaoXi: string): Promise<HuShanJianCeJieGuo> {
  const xiangYing = await genJuPeiZhiTiaoYong('huShanJianCe', [
    { jiaoSe: 'system', neiRong: '判断用户消息有没有互删、拒绝交往或想断绝关系的意思，只输出 JSON。' },
    {
      jiaoSe: 'user',
      neiRong: [
        '看看下面这条消息，是不是在明确说互删、不想处了或断绝关系。',
        `消息内容：${xiaoXi}`,
        '',
        '输出 JSON：{',
        '  "是否互删": boolean,',
        '  "确信度": number（0-1）,',
        '  "理由": "string"',
        '}',
        '只输出 JSON。',
      ].join('\n'),
    },
  ])

  const shuJu = jieXiJSONXiangYing(xiangYing.neiRong)
  const queXinDu = Number(shuJu['确信度'] ?? shuJu['que_xin_du'] ?? 0)

  return {
    shi_fou_hu_shan: Boolean(shuJu['是否互删'] ?? shuJu['shi_fou_hu_shan'] ?? false),
    que_xin_du: Number.isNaN(queXinDu) ? 0 : queXinDu,
    li_you: String(shuJu['理由'] ?? shuJu['li_you'] ?? ''),
  }
}

export async function jianCeShiPo(xiaoXi: string): Promise<ShiPoJianCeJieGuo> {
  const xiangYing = await genJuPeiZhiTiaoYong('shiPoJianCe', [
    { jiaoSe: 'system', neiRong: '判断用户消息有没有识破对方是渣男/渣女的意思，只输出 JSON。' },
    {
      jiaoSe: 'user',
      neiRong: [
        '看看下面这条消息，是不是在质疑、拆穿或识破对方是渣男/渣女。',
        `消息内容：${xiaoXi}`,
        '',
        '输出 JSON：{',
        '  "是否识破": boolean,',
        '  "确信度": number（0-1）,',
        '  "理由": "string"',
        '}',
        '只输出 JSON。',
      ].join('\n'),
    },
  ])

  const shuJu = jieXiJSONXiangYing(xiangYing.neiRong)
  const queXinDu = Number(shuJu['确信度'] ?? shuJu['que_xin_du'] ?? 0)

  return {
    shi_fou_shi_po: Boolean(shuJu['是否识破'] ?? shuJu['shi_fou_shi_po'] ?? false),
    que_xin_du: Number.isNaN(queXinDu) ? 0 : queXinDu,
    li_you: String(shuJu['理由'] ?? shuJu['li_you'] ?? ''),
  }
}

export async function jianCeShenJingBing(
  xiaoXi: string,
  duiHuaLiShi: DuiHuaLiShiXiang[],
  jiaoSe: AIJiaoSeXinXi,
): Promise<ShenJingBingJianCeJieGuo> {
  const liShiWenBen = duiHuaLiShi
    .slice(-10)
    .map(
      (xiaoXi) =>
        `[${xiaoXi.shi_jian}] ${xiaoXi.fa_song_zhe_lei_xing === 'yonghu' ? '用户' : '角色'}: ${xiaoXi.nei_rong}`,
    )
    .join('\n')
  const xiangYing = await genJuPeiZhiTiaoYong('shenJingBingJianCe', [
    { jiaoSe: 'system', neiRong: '结合上下文和人设，判断用户消息是不是莫名其妙、无厘头，只输出 JSON。' },
    {
      jiaoSe: 'user',
      neiRong: [
        '看看下面这条消息，放在当前聊天里是不是特别跳脱、让人摸不着头脑。',
        '',
        '角色人设：',
        `MBTI：${jiaoSe.mbti_lei_xing}`,
        `性格：${jiaoSe.xing_ge}`,
        `说话风格：${jiaoSe.yan_yu_feng_ge}`,
        `背景故事：${jiaoSe.bei_jing_gu_shi}`,
        `这人设能不能接受无厘头/发散思维：${jiaoSe.ba_da_mo_kuai.xi_tong_ti_shi.includes('发散思维') || jiaoSe.xing_ge.includes('发散思维') || jiaoSe.yan_yu_feng_ge.includes('发散思维') ? '能' : '不能'}`,
        '',
        '最近聊天：',
        liShiWenBen || '（无）',
        '',
        `用户消息：${xiaoXi}`,
        '',
        '输出 JSON：{',
        '  "是否神经病": boolean,',
        '  "发散思维人设": boolean,',
        '  "确信度": number（0-1）,',
        '  "理由": "string"',
        '}',
        '只输出 JSON。',
      ].join('\n'),
    },
  ])

  const shuJu = jieXiJSONXiangYing(xiangYing.neiRong)
  const queXinDu = Number(shuJu['确信度'] ?? shuJu['que_xin_du'] ?? 0)
  const jiaoSeFaSanSiWei =
    jiaoSe.ba_da_mo_kuai.xi_tong_ti_shi.includes('发散思维') ||
    jiaoSe.xing_ge.includes('发散思维') ||
    jiaoSe.yan_yu_feng_ge.includes('发散思维')

  return {
    shi_fou_shen_jing_bing: Boolean(shuJu['是否神经病'] ?? shuJu['shi_fou_shen_jing_bing'] ?? false),
    fa_san_si_wei_ren_she: Boolean(
      shuJu['发散思维人设'] ?? shuJu['fa_san_si_wei_ren_she'] ?? false,
    ) || jiaoSeFaSanSiWei,
    que_xin_du: Number.isNaN(queXinDu) ? 0 : queXinDu,
    li_you: String(shuJu['理由'] ?? shuJu['li_you'] ?? ''),
  }
}

export async function jianCeYongHuXiaoXi(
  xiaoXi: string,
  duiHuaLiShi: DuiHuaLiShiXiang[] = [],
  jiaoSe?: AIJiaoSeXinXi,
): Promise<YongHuXiaoXiJianCeJieGuo> {
  const [biaoBai, huShan, shiPo, shenJingBing] = await Promise.all([
    jianCeBiaoBai(xiaoXi),
    jianCeHuShan(xiaoXi),
    jianCeShiPo(xiaoXi),
    jiaoSe ? jianCeShenJingBing(xiaoXi, duiHuaLiShi, jiaoSe) : Promise.resolve({
      shi_fou_shen_jing_bing: false,
      fa_san_si_wei_ren_she: false,
      que_xin_du: 0,
      li_you: '',
    } as ShenJingBingJianCeJieGuo),
  ])

  return { biao_bai: biaoBai, hu_shan: huShan, shi_po: shiPo, shen_jing_bing: shenJingBing }
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
  const zhuangTaiWenBen = huoQuJieGuoWenBen(jie_guo_lei_xing)

  await 数据库.query(
    `UPDATE "角色" SET "封存" = $1, "可继续聊天" = $2, "结局状态" = $3 WHERE "ID" = $4`,
    [fengCun, keJiXuLiaoTian, zhuangTaiWenBen, jiao_se_id],
  )
}

async function xieRuYouXiJieJu(
  yong_hu_id: string,
  jiao_se_id: string,
  jie_guo_lei_xing: YouXiJieGuoLeiXing,
  zhai_yao?: Record<string, unknown>,
): Promise<void> {
  await 数据库.query(
    `INSERT INTO "游戏结局" ("用户ID", "角色ID", "结果状态", "摘要") VALUES ($1, $2, $3, $4)`,
    [yong_hu_id, jiao_se_id, huoQuJieGuoWenBen(jie_guo_lei_xing), zhai_yao ? JSON.stringify(zhai_yao) : JSON.stringify({})],
  )
}

async function gengXinYouXiDangAn(
  yong_hu_id: string,
  jiao_se_id: string,
  jie_guo_lei_xing: YouXiJieGuoLeiXing,
): Promise<void> {
  const jiaoSe = await 数据库.query(`SELECT "名字", "是否渣型" FROM "角色" WHERE "ID" = $1 LIMIT 1`, [jiao_se_id])
  const haoGanDu = await 数据库.query(
    `SELECT "总分", "关系阶段" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
    [yong_hu_id, jiao_se_id],
  )
  const xiaoXiShu = await 数据库.query(
    `SELECT COUNT(*) as shu FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [yong_hu_id, jiao_se_id],
  )

  const jiaoSeMing = jiaoSe.rows[0]?.名字 ? String(jiaoSe.rows[0].名字) : ''
  const shiFouZhaXing = Boolean(jiaoSe.rows[0]?.是否渣型)
  const zongFen = haoGanDu.rows[0]?.总分 ? Number(haoGanDu.rows[0].总分) : 0
  const guanXiJieDuan = haoGanDu.rows[0]?.关系阶段 ? String(haoGanDu.rows[0].关系阶段) : ''
  const xiaoXiZongShu = xiaoXiShu.rows[0]?.shu ? Number(xiaoXiShu.rows[0].shu) : 0

  await 数据库.query(
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
      huoQuJieGuoWenBen(jie_guo_lei_xing),
      jie_guo_lei_xing !== 'sheng_li_ai_qing',
      zongFen,
      guanXiJieDuan,
      xiaoXiZongShu,
    ],
  )
}

async function xieRuChengJiu(
  yong_hu_id: string,
  cheng_jiu_lei_xing: string,
  jiao_se_ming?: string,
): Promise<void> {
  await 数据库.query(
    `INSERT INTO "成就" ("用户ID", "成就类型", "角色名字") VALUES ($1, $2, $3)`,
    [yong_hu_id, cheng_jiu_lei_xing, jiao_se_ming || ''],
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
    })
    jiLuSocketShiJian('游戏事件', yong_hu_id, {
      jiao_se_id,
      jie_guo_lei_xing: jie_guo.jie_guo_lei_xing,
      ke_ji_xu_liao_tian: jie_guo.ke_ji_xu_liao_tian,
    })
  }
}

async function yiBuChuFaFuPanShengCheng(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<void> {
  try {
    const dangAnJieGuo = await 数据库.query(
      `SELECT "ID" FROM "游戏档案" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
      [yong_hu_id, jiao_se_id],
    )
    const dangAnId = dangAnJieGuo.rows[0]?.ID
    if (dangAnId) {
      void shengChengFuPan(yong_hu_id, jiao_se_id, String(dangAnId))
    }
  } catch (cuo_wu) {
    console.error('异步触发复盘生成失败', cuo_wu)
  }
}

export function huoQuJieGuoWenBen(jie_guo_lei_xing: YouXiJieGuoLeiXing): string {
  return huoQuFanYi('jieJu', jie_guo_lei_xing)
}

export async function chuLiYouXiJieShu(
  yong_hu_id: string,
  jiao_se_id: string,
  jie_guo_lei_xing: YouXiJieGuoLeiXing,
  zhai_yao?: Record<string, unknown>,
): Promise<YouXiJieShuJieGuo> {
  const keJiXuLiaoTian = jie_guo_lei_xing === 'sheng_li_ai_qing'
  const chengJiu = jie_guo_lei_xing === 'sheng_li_shi_po' ? '火眼金睛' : undefined

  jiLuYouXiJieJu(yong_hu_id, jiao_se_id, huoQuJieGuoWenBen(jie_guo_lei_xing))

  await Promise.all([
    gengXinJiaoSeJieJuZhuangTai(jiao_se_id, jie_guo_lei_xing),
    xieRuYouXiJieJu(yong_hu_id, jiao_se_id, jie_guo_lei_xing, zhai_yao),
    gengXinYouXiDangAn(yong_hu_id, jiao_se_id, jie_guo_lei_xing),
  ])

  if (chengJiu) {
    const jiaoSe = await 数据库.query(`SELECT "名字" FROM "角色" WHERE "ID" = $1 LIMIT 1`, [jiao_se_id])
    await xieRuChengJiu(yong_hu_id, chengJiu, jiaoSe.rows[0]?.名字 ? String(jiaoSe.rows[0].名字) : '')
  }

  const jieGuo: YouXiJieShuJieGuo = {
    jie_guo_lei_xing: jie_guo_lei_xing,
    zhuang_tai_wen_ben: huoQuJieGuoWenBen(jie_guo_lei_xing),
    ke_ji_xu_liao_tian: keJiXuLiaoTian,
    cheng_jiu: chengJiu,
  }

  tuiSongYouXiShiJian(yong_hu_id, jiao_se_id, jieGuo)
  void yiBuChuFaFuPanShengCheng(yong_hu_id, jiao_se_id)

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

  if (hao_gan_du_zong_fen >= 800) {
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

export async function chuLiShenJingBing(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<YouXiJieShuJieGuo | null> {
  const jiaoSe = await huoQuJiaoSeJiBenXinXi(jiao_se_id)
  if (!jiaoSe || !jiaoSe.yong_hu_id || jiaoSe.yong_hu_id !== yong_hu_id) return null

  if (jiaoSe.shi_fou_zha_xing) {
    return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'sheng_li_shen_jing_bing', {
      lei_xing: '渣型角色诱导用户被视为神经病',
    })
  }

  return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_shen_jing_bing', {
    lei_xing: '正常角色判定用户为神经病',
  })
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
): Promise<YouXiJieShuJieGuo | null> {
  const xiangYing = await genJuPeiZhiTiaoYong('jieShouBiaoBaiJianCe', [
    { jiaoSe: 'system', neiRong: '判断用户回复是接受表白还是拒绝，只输出 JSON。' },
    {
      jiaoSe: 'user',
      neiRong: [
        '角色刚向用户表白，看看用户这条回复是接受了还是拒绝了。',
        `用户回复：${yong_hu_xiao_xi}`,
        '',
        '输出 JSON：{',
        '  "是否接受": boolean,',
        '  "确信度": number（0-1）,',
        '  "理由": "string"',
        '}',
        '只输出 JSON。',
      ].join('\n'),
    },
  ])

  const shuJu = jieXiJSONXiangYing(xiangYing.neiRong)
  const jieShou = Boolean(shuJu['是否接受'] ?? shuJu['shi_fou_jie_shou'] ?? false)

  if (jieShou) {
    return chuLiAIJieShouBiaoBai(yong_hu_id, jiao_se_id, jiao_se)
  }

  if (jiao_se.shi_fou_zha_xing) {
    // 用户拒绝渣型表白，游戏继续，不触发结束
    return null
  }

  return chuLiYouXiJieShu(yong_hu_id, jiao_se_id, 'shi_bai_ju_jue_biao_bai', {
    lei_xing: '用户拒绝正常角色表白',
  })
}

export async function jianCeYongHuXiaoXiBingChuLi(
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi: string,
  hao_gan_du_zong_fen: number,
  deng_dai_biao_bai_hui_fu: boolean,
  jiao_se?: AIJiaoSeXinXi,
  dui_hua_li_shi?: DuiHuaLiShiXiang[],
): Promise<YouXiJieShuJieGuo | null> {
  const shiHeFaYongHu = await yanZhengJiaoSeSuoYouQuan(yong_hu_id, jiao_se_id)
  if (!shiHeFaYongHu) return null

  const jianCeJieGuo = await jianCeYongHuXiaoXi(xiao_xi, dui_hua_li_shi, jiao_se)

  if (deng_dai_biao_bai_hui_fu && jiao_se) {
    return chuLiYongHuJuJueAIHuoJieShou(yong_hu_id, jiao_se_id, jiao_se, xiao_xi)
  }

  if (jianCeJieGuo.biao_bai.shi_fou_biao_bai && jianCeJieGuo.biao_bai.que_xin_du > 0.7) {
    return chuLiYongHuBiaoBai(yong_hu_id, jiao_se_id, hao_gan_du_zong_fen)
  }

  if (jianCeJieGuo.hu_shan.shi_fou_hu_shan && jianCeJieGuo.hu_shan.que_xin_du > 0.7) {
    return chuLiHuShan(yong_hu_id, jiao_se_id)
  }

  if (jianCeJieGuo.shi_po.shi_fou_shi_po && jianCeJieGuo.shi_po.que_xin_du > 0.7) {
    return chuLiShiPo(yong_hu_id, jiao_se_id)
  }

  if (
    jianCeJieGuo.shen_jing_bing.shi_fou_shen_jing_bing &&
    !jianCeJieGuo.shen_jing_bing.fa_san_si_wei_ren_she &&
    jianCeJieGuo.shen_jing_bing.que_xin_du > 0.7
  ) {
    return chuLiShenJingBing(yong_hu_id, jiao_se_id)
  }

  return null
}
