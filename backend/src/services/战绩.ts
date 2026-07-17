import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import type { YouXiJieGuoLeiXing } from '../types'

export interface FuPanShiJianXianTiaoMu {
  shi_jian: string
  shi_jian_miao_shu: string
  yong_hu_xiao_xi?: string
  ai_hui_fu?: string
  ai_xin_li_huo_dong?: string
  hao_gan_du_bian_hua?: {
    xin_ren_bian_hua: number
    qin_mi_bian_hua: number
    qu_wei_bian_hua: number
    guan_huai_bian_hua: number
    zong_fen_bian_hua: number
    guan_xi_jie_duan?: string
  }
}

export interface FuPanPiZhu {
  xu_hao: number
  ping_lun: string
}

export interface DangAnLieBiaoXiang {
  id: string
  yong_hu_id: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  shi_fou_zha_xing: boolean
  jie_guo_lei_xing: string
  jie_guo_lei_xing_yuan: YouXiJieGuoLeiXing | 'jinxing_zhong'
  shi_fou_feng_cun: boolean
  hao_gan_du_zong_fen: number
  guan_xi_jie_duan: string
  liao_tian_tian_shu: number
  xiao_xi_zong_shu: number
  chuang_jian_shi_jian: string
  zui_hou_xiao_xi_shi_jian: string | null
  you_xi_jie_shu_shi_jian: string | null
  mbti_lei_xing?: string
}

export interface DangAnXiangQing extends DangAnLieBiaoXiang {
  fu_pan_shu_ju: FuPanShiJianXianTiaoMu[] | null
  fu_pan_nei_rong?: string | null
  fu_pan_pi_zhu: FuPanPiZhu[] | null
}

const 结局文本映射: Record<string, YouXiJieGuoLeiXing | 'jinxing_zhong'> = {
  '胜利-爱情': 'sheng_li_ai_qing',
  '胜利-互删胜利': 'sheng_li_hu_shan_sheng_li',
  '胜利-识破': 'sheng_li_shi_po',
  '胜利-神经病': 'sheng_li_shen_jing_bing',
  '失败-过早表白': 'shi_bai_guo_zao_biao_bai',
  '失败-被欺骗': 'shi_bai_bei_qi_pian',
  '失败-被诈型欺骗': 'shi_bai_bei_zha_xing_qi_pian',
  '失败-互删失败': 'shi_bai_hu_shan_shi_bai',
  '失败-好感度归零': 'shi_bai_hao_gan_du_gui_ling',
  '失败-错误识破': 'shi_bai_cuo_wu_shi_po',
  '失败-拒绝表白': 'shi_bai_ju_jue_biao_bai',
  '失败-神经病': 'shi_bai_shen_jing_bing',
}

function yingSheJieGuoLeiXing(
  zhuangTaiWenBen: string,
  shiFouFengCun: boolean,
): YouXiJieGuoLeiXing | 'jinxing_zhong' {
  if (结局文本映射[zhuangTaiWenBen]) {
    return 结局文本映射[zhuangTaiWenBen]
  }
  if (!shiFouFengCun) {
    return 'jinxing_zhong'
  }
  return 'shi_bai_hao_gan_du_gui_ling'
}

export async function huoQuDangAnLieBiao(yong_hu_id: string): Promise<DangAnLieBiaoXiang[]> {
  const jieGuo = await 数据库.query(
    `SELECT d."ID", d."用户ID", d."角色ID", d."角色名字", r."微信昵称", d."是否渣型",
            d."结果类型", d."是否封存", d."好感度总分", d."关系阶段",
            d."聊天天数", d."消息总数", d."创建时间", r."MBTI",
            (SELECT MAX("创建时间") FROM "消息" m
             WHERE m."用户ID" = d."用户ID" AND m."角色ID" = d."角色ID") AS "最后消息时间"
     FROM "游戏档案" d
     LEFT JOIN "角色" r ON r."ID" = d."角色ID"
     WHERE d."用户ID" = $1
     ORDER BY d."创建时间" DESC`,
    [yong_hu_id],
  )

  return jieGuo.rows.map((row) => {
    const jieGuoLeiXingYuan = yingSheJieGuoLeiXing(
      String(row.结果类型 || ''),
      Boolean(row.是否封存),
    )
    const chuangJianShiJian = String(row.创建时间 || new Date().toISOString())
    const youXiJieShu = jieGuoLeiXingYuan !== 'jinxing_zhong'
    return {
      id: String(row.ID),
      yong_hu_id: String(row.用户ID),
      jiao_se_id: String(row.角色ID),
      jiao_se_ming_zi: String(row.微信昵称 || huoQuFanYi('zhanJi', 'weiZhiWeiXin')),
      shi_fou_zha_xing: Boolean(row.是否渣型),
      jie_guo_lei_xing: String(row.结果类型 || '进行中'),
      jie_guo_lei_xing_yuan: jieGuoLeiXingYuan,
      shi_fou_feng_cun: Boolean(row.是否封存),
      hao_gan_du_zong_fen: Number(row.好感度总分 || 0),
      guan_xi_jie_duan: String(row.关系阶段 || ''),
      liao_tian_tian_shu: Number(row.聊天天数 || 0),
      xiao_xi_zong_shu: Number(row.消息总数 || 0),
      chuang_jian_shi_jian: chuangJianShiJian,
      zui_hou_xiao_xi_shi_jian: row.最后消息时间 ? String(row.最后消息时间) : null,
      you_xi_jie_shu_shi_jian: youXiJieShu ? chuangJianShiJian : null,
      mbti_lei_xing: row.MBTI ? String(row.MBTI) : undefined,
    }
  })
}

export async function huoQuDangAnXiangQing(
  yong_hu_id: string,
  dang_an_id: string,
): Promise<DangAnXiangQing | null> {
  const jieGuo = await 数据库.query(
    `SELECT d."ID", d."用户ID", d."角色ID", d."角色名字", r."微信昵称", d."是否渣型",
            d."结果类型", d."是否封存", d."好感度总分", d."关系阶段",
            d."聊天天数", d."消息总数", d."复盘数据", d."复盘内容", d."创建时间",
            r."MBTI",
            (SELECT MAX("创建时间") FROM "消息" m
             WHERE m."用户ID" = d."用户ID" AND m."角色ID" = d."角色ID") AS "最后消息时间"
     FROM "游戏档案" d
     LEFT JOIN "角色" r ON r."ID" = d."角色ID"
     WHERE d."ID" = $1 AND d."用户ID" = $2
     LIMIT 1`,
    [dang_an_id, yong_hu_id],
  )

  if (jieGuo.rows.length === 0) return null

  const row = jieGuo.rows[0]
  const jieGuoLeiXingYuan = yingSheJieGuoLeiXing(
    String(row.结果类型 || ''),
    Boolean(row.是否封存),
  )
  const chuangJianShiJian = String(row.创建时间 || new Date().toISOString())
  const youXiJieShu = jieGuoLeiXingYuan !== 'jinxing_zhong'

  let fuPanShuJu: FuPanShiJianXianTiaoMu[] | null = null
  let fuPanPiZhu: FuPanPiZhu[] | null = null
  if (row.复盘数据) {
    try {
      const jieXi = typeof row.复盘数据 === 'string' ? JSON.parse(row.复盘数据) : row.复盘数据
      if (Array.isArray(jieXi)) {
        fuPanShuJu = jieXi
      } else if (jieXi && typeof jieXi === 'object' && Array.isArray(jieXi.pi_zhu)) {
        fuPanPiZhu = jieXi.pi_zhu
          .filter(
            (item: unknown): item is FuPanPiZhu =>
              item !== null &&
              typeof item === 'object' &&
              typeof (item as { xu_hao?: unknown }).xu_hao === 'number' &&
              Number.isFinite((item as { xu_hao: number }).xu_hao) &&
              (item as { xu_hao: number }).xu_hao > 0 &&
              typeof (item as { ping_lun?: unknown }).ping_lun === 'string' &&
              (item as { ping_lun: string }).ping_lun.trim().length > 0,
          )
          .map((item) => ({
            xu_hao: Math.floor((item as { xu_hao: number }).xu_hao),
            ping_lun: (item as { ping_lun: string }).ping_lun,
          }))
      }
    } catch {
      fuPanShuJu = null
      fuPanPiZhu = null
    }
  }

  return {
    id: String(row.ID),
    yong_hu_id: String(row.用户ID),
    jiao_se_id: String(row.角色ID),
    jiao_se_ming_zi: String(row.微信昵称 || huoQuFanYi('zhanJi', 'weiZhiWeiXin')),
    shi_fou_zha_xing: Boolean(row.是否渣型),
    jie_guo_lei_xing: String(row.结果类型 || '进行中'),
    jie_guo_lei_xing_yuan: jieGuoLeiXingYuan,
    shi_fou_feng_cun: Boolean(row.是否封存),
    hao_gan_du_zong_fen: Number(row.好感度总分 || 0),
    guan_xi_jie_duan: String(row.关系阶段 || ''),
    liao_tian_tian_shu: Number(row.聊天天数 || 0),
    xiao_xi_zong_shu: Number(row.消息总数 || 0),
    fu_pan_shu_ju: fuPanShuJu,
    fu_pan_nei_rong: row.复盘内容 ? String(row.复盘内容) : null,
    fu_pan_pi_zhu: fuPanPiZhu,
    chuang_jian_shi_jian: chuangJianShiJian,
    zui_hou_xiao_xi_shi_jian: row.最后消息时间 ? String(row.最后消息时间) : null,
    you_xi_jie_shu_shi_jian: youXiJieShu ? chuangJianShiJian : null,
    mbti_lei_xing: row.MBTI ? String(row.MBTI) : undefined,
  }
}

export async function gengXinFuPanNeiRong(
  dang_an_id: string,
  fu_pan_nei_rong: string,
  fu_pan_pi_zhu: FuPanPiZhu[],
): Promise<void> {
  await 数据库.query(
    `UPDATE "游戏档案" SET "复盘内容" = $1, "复盘数据" = $2 WHERE "ID" = $3`,
    [fu_pan_nei_rong, JSON.stringify({ pi_zhu: fu_pan_pi_zhu }), dang_an_id],
  )
}

export async function shanChuDangAn(yong_hu_id: string, dang_an_id: string): Promise<boolean> {
  const jieGuo = await 数据库.query(
    `DELETE FROM "游戏档案" WHERE "ID" = $1 AND "用户ID" = $2 RETURNING "ID"`,
    [dang_an_id, yong_hu_id],
  )
  return jieGuo.rows.length > 0
}

export async function piLiangShanChuDangAn(
  yong_hu_id: string,
  dang_an_ids: string[],
): Promise<string[]> {
  if (dang_an_ids.length === 0) return []
  const canShuLieBiao = dang_an_ids.map((_, index) => `$${index + 2}`).join(', ')
  const jieGuo = await 数据库.query(
    `DELETE FROM "游戏档案" WHERE "ID" IN (${canShuLieBiao}) AND "用户ID" = $1 RETURNING "ID"`,
    [yong_hu_id, ...dang_an_ids],
  )
  return jieGuo.rows.map((row) => String(row.ID))
}
