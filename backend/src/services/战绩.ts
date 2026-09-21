import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import type { YouXiJieGuoLeiXing } from '../types'
import { 解析结局类型, 解析结局文案 } from '../utils/结局'
import { 归一角色性别 } from '../utils/性别'
import { huoQuJunShiJiLuLieBiao, type JunShiJiLuXiang } from './军师缓存'

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
  qing_gan?: string
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
  mo_shi?: 'putong' | 'tiaozhan'
}

export interface DangAnXiangQing extends DangAnLieBiaoXiang {
  fu_pan_shu_ju: FuPanShiJianXianTiaoMu[] | null
  fu_pan_nei_rong?: string | null
  fu_pan_pi_zhu: FuPanPiZhu[] | null
  jun_shi_ji_lu: JunShiJiLuXiang[]
}

export async function huoQuDangAnLieBiao(yong_hu_id: string): Promise<DangAnLieBiaoXiang[]> {
  const jieGuo = await 数据库.query(
    `SELECT d."ID", d."用户ID", d."角色ID", d."角色名字", r."微信昵称", d."是否渣型",
            d."结果类型", d."是否封存", d."好感度总分", d."关系阶段",
            d."聊天天数", d."消息总数", d."创建时间", r."MBTI", r."性别", r."结局文案",
            d."最后消息时间", d."模式"
      FROM "游戏档案" d
      LEFT JOIN "角色" r ON r."ID" = d."角色ID"
      WHERE d."用户ID" = $1
      -- 挑战模式进行中的对局不进入过往战绩（结束后进入胜利/失败分组）
        AND NOT (d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = '')
      ORDER BY d."创建时间" DESC`,
    [yong_hu_id],
  )

  return jieGuo.rows.map((row) => {
    const jieGuoLeiXingYuan = 解析结局类型(row.结果类型, Boolean(row.是否封存))
    const chuangJianShiJian = String(row.创建时间 || new Date().toISOString())
    const youXiJieShu = jieGuoLeiXingYuan !== 'jinxing_zhong'
    return {
      id: String(row.ID),
      yong_hu_id: String(row.用户ID),
      jiao_se_id: String(row.角色ID),
      jiao_se_ming_zi: String(row.微信昵称 || huoQuFanYi('zhanJi', 'weiZhiWeiXin')),
      shi_fou_zha_xing: Boolean(row.是否渣型),
      jie_guo_lei_xing: 解析结局文案(
        jieGuoLeiXingYuan,
        归一角色性别(row.性别),
        row.结局文案 ?? null,
      ),
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
      mo_shi: row.模式 === 'tiaozhan' ? 'tiaozhan' : 'putong',
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
            d."聊天天数", d."消息总数", d."创建时间",
            r."MBTI", r."性别", r."结局文案",
            d."复盘内容", d."复盘数据",
            d."最后消息时间"
      FROM "游戏档案" d
      LEFT JOIN "角色" r ON r."ID" = d."角色ID"
      WHERE d."ID" = $1 AND d."用户ID" = $2
      LIMIT 1`,
    [dang_an_id, yong_hu_id],
  )

  if (jieGuo.rows.length === 0) return null

  const row = jieGuo.rows[0]
  const jieGuoLeiXingYuan = 解析结局类型(row.结果类型, Boolean(row.是否封存))
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
          .map((item: FuPanPiZhu) => {
            const tiaoMu: FuPanPiZhu = {
              xu_hao: Math.floor(item.xu_hao),
              ping_lun: item.ping_lun,
            }
            if (typeof item.qing_gan === 'string' && item.qing_gan.trim()) {
              tiaoMu.qing_gan = item.qing_gan.trim()
            }
            return tiaoMu
          })
      }
    } catch {
      fuPanShuJu = null
      fuPanPiZhu = null
    }
  }

  const junShiJiLu = await huoQuJunShiJiLuLieBiao(yong_hu_id, row.角色ID)

  return {
    id: String(row.ID),
    yong_hu_id: String(row.用户ID),
    jiao_se_id: String(row.角色ID),
    jiao_se_ming_zi: String(row.微信昵称 || huoQuFanYi('zhanJi', 'weiZhiWeiXin')),
    shi_fou_zha_xing: Boolean(row.是否渣型),
    jie_guo_lei_xing: 解析结局文案(
      jieGuoLeiXingYuan,
      归一角色性别(row.性别),
      row.结局文案 ?? null,
    ),
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
    jun_shi_ji_lu: junShiJiLu,
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
