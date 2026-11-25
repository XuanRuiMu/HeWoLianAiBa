import { 数据库 } from '../数据库'
import { huoQuFanYi, type FanYiJian } from '../config/translations'
import { yinBiShouJiHao } from '../utils/掩码'
import { maDianChangDu } from '../utils/验证'
import {
  验证反馈提交内容,
  反馈状态集合,
  反馈全部分类集合,
  type FanKuiTiJiaoNeiRong,
} from '../middleware/输入验证'

export interface FanKuiXinXi {
  id: string
  yong_hu_id: string
  ye_mian_biao_shi: string
  fen_lei: string
  man_yi_du: number | null
  zheng_wen: string
  biao_qian: string[]
  xiao_xi_yin_yong: unknown[]
  biao_qing_bao_yin_yong: unknown[]
  she_bei_xin_xi: Record<string, unknown>
  zhuang_tai: string
  guan_li_bei_zhu: string | null
  chuang_jian_shi_jian: string
  geng_xin_shi_jian: string
}

export interface FanKuiWoDeXiang {
  id: string
  fen_lei: string
  zhuang_tai: string
  zheng_wen_zhai_yao: string
  guan_li_bei_zhu: string | null
  chuang_jian_shi_jian: string
}

export interface FanKuiGuanLiXiang {
  id: string
  yong_hu_ni_cheng: string | null
  yong_hu_shou_ji_hao_yan_ma: string
  ye_mian_biao_shi: string
  fen_lei: string
  man_yi_du: number | null
  zheng_wen: string
  biao_qian: string[]
  xiao_xi_yin_yong: unknown[]
  biao_qing_bao_yin_yong: unknown[]
  she_bei_xin_xi: Record<string, unknown>
  zhuang_tai: string
  guan_li_bei_zhu: string | null
  chuang_jian_shi_jian: string
  geng_xin_shi_jian: string
}

export interface FanKuiTiJiaoRuCan {
  yong_hu_id: string
  ye_mian_biao_shi: string
  fen_lei: string
  man_yi_du?: number
  zheng_wen: string
  biao_qian: string[]
  xiao_xi_yin_yong: unknown[]
  biao_qing_bao_yin_yong: unknown[]
  she_bei_xin_xi: Record<string, unknown>
}

export interface FanKuiTiJiaoJieGuo {
  cheng_gong: boolean
  fan_kui?: FanKuiXinXi
  ti_shi?: string
  zhuang_tai_ma?: number
}

export interface FanKuiWoDeLieBiaoJieGuo {
  lie_biao: FanKuiWoDeXiang[]
  zong_shu: number
  hai_you_geng_duo: boolean
  ye_ma: number
  mei_ye_tiao_shu: number
}

export interface FanKuiGuanLiChaXun {
  zhuang_tai?: string
  fen_lei?: string
  ye_mian?: string
  ye_ma?: number
  mei_ye_tiao_shu?: number
}

export interface FanKuiGuanLiLieBiaoJieGuo {
  lie_biao: FanKuiGuanLiXiang[]
  zong_shu: number
  hai_you_geng_duo: boolean
  ye_ma: number
  mei_ye_tiao_shu: number
}

export interface FanKuiTongJi {
  zong_shu: number
  jin_7_tian_shu: number
  zhuang_tai_shu: Record<string, number>
  fen_lei_shu: Record<string, number>
}

export interface GengXinFanKuiZhuangTaiRuCan {
  fan_kui_id: string
  xin_zhuang_tai: string
  guan_li_bei_zhu?: string
}

export interface GengXinFanKuiZhuangTaiJieGuo {
  cheng_gong: boolean
  fan_kui?: FanKuiXinXi
  ti_shi?: string
  zhuang_tai_ma?: number
}

const fanKuiZhuangTaiLiuZhuan: Readonly<Record<string, readonly string[]>> = {
  xinJian: ['chuLiZhong'],
  chuLiZhong: ['yiJieJue', 'yiJuJue'],
}

const fanKuiMoRenMeiYeTiaoShu = 20
const fanKuiZuiDaMeiYeTiaoShu = 100
const fanKuiWoDeZhengWenZhaiYaoChangDu = 60

function quFanKuiZhengWenZhaiYao(zhengWen: string): string {
  return Array.from(zhengWen).slice(0, fanKuiWoDeZhengWenZhaiYaoChangDu).join('')
}

function 映射反馈(row: Record<string, unknown>): FanKuiXinXi {
  return {
    id: String(row.ID),
    yong_hu_id: row.用户ID ? String(row.用户ID) : '',
    ye_mian_biao_shi: String(row.页面标识 || ''),
    fen_lei: String(row.分类 || ''),
    man_yi_du: row.满意度 === null || row.满意度 === undefined ? null : Number(row.满意度),
    zheng_wen: String(row.正文 || ''),
    biao_qian: Array.isArray(row.标签) ? (row.标签 as unknown[]).filter((项): 项 is string => typeof 项 === 'string') : [],
    xiao_xi_yin_yong: Array.isArray(row.消息引用) ? row.消息引用 as unknown[] : [],
    biao_qing_bao_yin_yong: Array.isArray(row.表情包引用) ? row.表情包引用 as unknown[] : [],
    she_bei_xin_xi:
      row.设备信息 && typeof row.设备信息 === 'object' && !Array.isArray(row.设备信息)
        ? row.设备信息 as Record<string, unknown>
        : {},
    zhuang_tai: String(row.状态 || 'xinJian'),
    guan_li_bei_zhu: row.管理备注 === null || row.管理备注 === undefined ? null : String(row.管理备注),
    chuang_jian_shi_jian: row.创建时间 ? String(row.创建时间) : new Date().toISOString(),
    geng_xin_shi_jian: row.更新时间 ? String(row.更新时间) : new Date().toISOString(),
  }
}

function fanKuiTiShi(jian: string): string {
  return huoQuFanYi('fanKui', jian as FanYiJian<'fanKui'>)
}

function guiYiFanKuiFenYe(yeMa: number | undefined, meiYeTiaoShu: number | undefined): { yeMa: number; meiYeTiaoShu: number } {
  const guiYiYeMa = Number.isInteger(yeMa) && (yeMa as number) > 0 ? (yeMa as number) : 1
  const guiYiMeiYe = Number.isInteger(meiYeTiaoShu) && (meiYeTiaoShu as number) > 0
    ? Math.min(meiYeTiaoShu as number, fanKuiZuiDaMeiYeTiaoShu)
    : fanKuiMoRenMeiYeTiaoShu
  return { yeMa: guiYiYeMa, meiYeTiaoShu: guiYiMeiYe }
}

export async function tiJiaoFanKui(ruCan: FanKuiTiJiaoRuCan): Promise<FanKuiTiJiaoJieGuo> {
  const jiaoYanNeiRong: FanKuiTiJiaoNeiRong = {
    ye_mian_biao_shi: ruCan.ye_mian_biao_shi,
    fen_lei: ruCan.fen_lei,
    man_yi_du: ruCan.man_yi_du,
    zheng_wen: ruCan.zheng_wen,
    biao_qian: ruCan.biao_qian,
    xiao_xi_yin_yong: ruCan.xiao_xi_yin_yong,
    biao_qing_bao_yin_yong: ruCan.biao_qing_bao_yin_yong,
  }
  const cuoWuJian = 验证反馈提交内容(jiaoYanNeiRong)
  if (cuoWuJian) {
    return { cheng_gong: false, ti_shi: fanKuiTiShi(cuoWuJian), zhuang_tai_ma: 400 }
  }

  const chaRuJieGuo = await 数据库.query(
    `INSERT INTO "意见反馈" ("用户ID", "页面标识", "分类", "满意度", "正文", "标签", "消息引用", "表情包引用", "设备信息")
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
     RETURNING *`,
    [
      ruCan.yong_hu_id,
      ruCan.ye_mian_biao_shi,
      ruCan.fen_lei,
      ruCan.man_yi_du === undefined ? null : ruCan.man_yi_du,
      ruCan.zheng_wen,
      JSON.stringify(ruCan.biao_qian),
      JSON.stringify(ruCan.xiao_xi_yin_yong),
      JSON.stringify(ruCan.biao_qing_bao_yin_yong),
      JSON.stringify(ruCan.she_bei_xin_xi),
    ],
  )

  return { cheng_gong: true, fan_kui: 映射反馈(chaRuJieGuo.rows[0]) }
}

export async function huoQuWoDeFanKuiLieBiao(
  yong_hu_id: string,
  yeMa?: number,
  meiYeTiaoShu?: number,
): Promise<FanKuiWoDeLieBiaoJieGuo> {
  const fenYe = guiYiFanKuiFenYe(yeMa, meiYeTiaoShu)
  const pianYi = (fenYe.yeMa - 1) * fenYe.meiYeTiaoShu

  const zongShuJieGuo = await 数据库.query(
    `SELECT COUNT(*) AS zong_shu FROM "意见反馈" WHERE "用户ID" = $1`,
    [yong_hu_id],
  )
  const zongShu = Number(zongShuJieGuo.rows[0]?.zong_shu || 0)

  const lieBiaoJieGuo = await 数据库.query(
    `SELECT * FROM "意见反馈" WHERE "用户ID" = $1 ORDER BY "创建时间" DESC LIMIT $2 OFFSET $3`,
    [yong_hu_id, fenYe.meiYeTiaoShu, pianYi],
  )

  return {
    lie_biao: lieBiaoJieGuo.rows.map((row: Record<string, unknown>): FanKuiWoDeXiang => {
      const fanKui = 映射反馈(row)
      return {
        id: fanKui.id,
        fen_lei: fanKui.fen_lei,
        zhuang_tai: fanKui.zhuang_tai,
        zheng_wen_zhai_yao: quFanKuiZhengWenZhaiYao(fanKui.zheng_wen),
        guan_li_bei_zhu: fanKui.guan_li_bei_zhu,
        chuang_jian_shi_jian: fanKui.chuang_jian_shi_jian,
      }
    }),
    zong_shu: zongShu,
    hai_you_geng_duo: pianYi + fenYe.meiYeTiaoShu < zongShu,
    ye_ma: fenYe.yeMa,
    mei_ye_tiao_shu: fenYe.meiYeTiaoShu,
  }
}

export async function huoQuFanKuiLieBiao(chaXun: FanKuiGuanLiChaXun): Promise<FanKuiGuanLiLieBiaoJieGuo> {
  const fenYe = guiYiFanKuiFenYe(chaXun.ye_ma, chaXun.mei_ye_tiao_shu)
  const pianYi = (fenYe.yeMa - 1) * fenYe.meiYeTiaoShu

  const tiaoJian: string[] = []
  const canShu: unknown[] = []
  if (chaXun.zhuang_tai !== undefined && 反馈状态集合.includes(chaXun.zhuang_tai)) {
    canShu.push(chaXun.zhuang_tai)
    tiaoJian.push(`f."状态" = $${canShu.length}`)
  }
  if (chaXun.fen_lei !== undefined && 反馈全部分类集合.includes(chaXun.fen_lei)) {
    canShu.push(chaXun.fen_lei)
    tiaoJian.push(`f."分类" = $${canShu.length}`)
  }
  if (chaXun.ye_mian !== undefined && chaXun.ye_mian !== '') {
    canShu.push(chaXun.ye_mian)
    tiaoJian.push(`f."页面标识" = $${canShu.length}`)
  }
  const tiaoJianZiChuan = tiaoJian.length > 0 ? `WHERE ${tiaoJian.join(' AND ')}` : ''

  const zongShuJieGuo = await 数据库.query(
    `SELECT COUNT(*) AS zong_shu FROM "意见反馈" f ${tiaoJianZiChuan}`,
    canShu,
  )
  const zongShu = Number(zongShuJieGuo.rows[0]?.zong_shu || 0)

  canShu.push(fenYe.meiYeTiaoShu)
  const limitZhanWei = `$${canShu.length}`
  canShu.push(pianYi)
  const offsetZhanWei = `$${canShu.length}`

  const lieBiaoJieGuo = await 数据库.query(
    `SELECT f.*, u."用户名" AS yong_hu_ming, u."手机号" AS yong_hu_shou_ji_hao
     FROM "意见反馈" f
     JOIN "用户" u ON u."ID" = f."用户ID"
     ${tiaoJianZiChuan}
     ORDER BY f."创建时间" DESC
     LIMIT ${limitZhanWei} OFFSET ${offsetZhanWei}`,
    canShu,
  )

  return {
    lie_biao: lieBiaoJieGuo.rows.map((row: Record<string, unknown>): FanKuiGuanLiXiang => {
      const fanKui = 映射反馈(row)
      return {
        ...fanKui,
        yong_hu_ni_cheng: row.yong_hu_ming ? String(row.yong_hu_ming) : null,
        yong_hu_shou_ji_hao_yan_ma: row.yong_hu_shou_ji_hao ? yinBiShouJiHao(String(row.yong_hu_shou_ji_hao)) : '',
      }
    }),
    zong_shu: zongShu,
    hai_you_geng_duo: pianYi + fenYe.meiYeTiaoShu < zongShu,
    ye_ma: fenYe.yeMa,
    mei_ye_tiao_shu: fenYe.meiYeTiaoShu,
  }
}

export async function huoQuFanKuiTongJi(): Promise<FanKuiTongJi> {
  const [anZhuangTaiJieGuo, anFenLeiJieGuo, jin7TianJieGuo, zongShuJieGuo] = await Promise.all([
    数据库.query(`SELECT "状态", COUNT(*) AS ci_shu FROM "意见反馈" GROUP BY "状态"`),
    数据库.query(`SELECT "分类", COUNT(*) AS ci_shu FROM "意见反馈" GROUP BY "分类"`),
    数据库.query(`SELECT COUNT(*) AS ci_shu FROM "意见反馈" WHERE "创建时间" >= NOW() - INTERVAL '7 days'`),
    数据库.query(`SELECT COUNT(*) AS ci_shu FROM "意见反馈"`),
  ])

  const zhuangTaiShu: Record<string, number> = {}
  for (const hang of anZhuangTaiJieGuo.rows) {
    zhuangTaiShu[String(hang.状态)] = Number(hang.ci_shu || 0)
  }
  const fenLeiShu: Record<string, number> = {}
  for (const hang of anFenLeiJieGuo.rows) {
    fenLeiShu[String(hang.分类)] = Number(hang.ci_shu || 0)
  }

  return {
    zong_shu: Number(zongShuJieGuo.rows[0]?.ci_shu || 0),
    jin_7_tian_shu: Number(jin7TianJieGuo.rows[0]?.ci_shu || 0),
    zhuang_tai_shu: zhuangTaiShu,
    fen_lei_shu: fenLeiShu,
  }
}

export async function gengXinFanKuiZhuangTai(ruCan: GengXinFanKuiZhuangTaiRuCan): Promise<GengXinFanKuiZhuangTaiJieGuo> {
  if (typeof ruCan.xin_zhuang_tai !== 'string' || !反馈状态集合.includes(ruCan.xin_zhuang_tai)) {
    return { cheng_gong: false, ti_shi: fanKuiTiShi('fanKuiZhuangTaiBuHeFa'), zhuang_tai_ma: 400 }
  }
  if (ruCan.guan_li_bei_zhu !== undefined && maDianChangDu(ruCan.guan_li_bei_zhu) > 500) {
    return { cheng_gong: false, ti_shi: fanKuiTiShi('fanKuiBeiZhuChaoXian'), zhuang_tai_ma: 400 }
  }

  const chaXunJieGuo = await 数据库.query(
    `SELECT * FROM "意见反馈" WHERE "ID" = $1 LIMIT 1`,
    [ruCan.fan_kui_id],
  )
  if (chaXunJieGuo.rows.length === 0) {
    return {
      cheng_gong: false,
      ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'),
      zhuang_tai_ma: 404,
    }
  }

  const dangQianHang = chaXunJieGuo.rows[0] as Record<string, unknown>
  const dangQianZhuangTai = String(dangQianHang.状态 || 'xinJian')
  const yunXuMingDan = fanKuiZhuangTaiLiuZhuan[dangQianZhuangTai]
  if (!yunXuMingDan || !yunXuMingDan.includes(ruCan.xin_zhuang_tai)) {
    return { cheng_gong: false, ti_shi: fanKuiTiShi('fanKuiZhuangTaiLiuZhuanBuHeFa'), zhuang_tai_ma: 400 }
  }

  const gengXinJieGuo =
    ruCan.guan_li_bei_zhu === undefined
      ? await 数据库.query(
          `UPDATE "意见反馈"
           SET "状态" = $1,
               "更新时间" = NOW()
           WHERE "ID" = $2
           RETURNING *`,
          [ruCan.xin_zhuang_tai, ruCan.fan_kui_id],
        )
      : await 数据库.query(
          `UPDATE "意见反馈"
           SET "状态" = $1,
               "管理备注" = $2,
               "更新时间" = NOW()
           WHERE "ID" = $3
           RETURNING *`,
          [ruCan.xin_zhuang_tai, ruCan.guan_li_bei_zhu, ruCan.fan_kui_id],
        )

  return { cheng_gong: true, fan_kui: 映射反馈(gengXinJieGuo.rows[0]) }
}
