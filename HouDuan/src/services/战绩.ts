import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import {
  CUO_WU_DAI_MA,
  YingYongCuoWu,
  huoQuCuoWuXianRong,
  type ZhanJiFenLeiCuoWuDaiMa,
} from '../config/错误码注册表'
import { ZHAN_JI_PEI_ZHI } from '../config/战绩配置'
import type { PoolClient } from 'pg'
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

export interface ZhanJiZuiHouXiaoXi {
  shi_jian: string
  fa_song_zhe: 'yonghu' | 'jiaose'
  zhai_yao: string
}

export interface DangAnLieBiaoXiang {
  id: string
  yong_hu_id: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  shi_fou_zha_xing?: boolean
  tou_xiang_biao_ji: string
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
  sui_ji_xing_ge?: boolean
  mo_shi?: 'putong' | 'tiaozhan'
  category_id: string
  sort_order: number
  zui_hou_liang_tiao: ZhanJiZuiHouXiaoXi[]
}

export interface DangAnXiangQing extends DangAnLieBiaoXiang {
  fu_pan_shu_ju: FuPanShiJianXianTiaoMu[] | null
  fu_pan_nei_rong?: string | null
  fu_pan_pi_zhu: FuPanPiZhu[] | null
  jun_shi_ji_lu: JunShiJiLuXiang[]
}

export interface ZhanJiFenLei {
  id: string
  name: string
  is_default: boolean
  record_count: number
  version: number
  sort_order: number
}

export interface ZhanJiFenLeiShanChuJieGuo {
  deleted_id: string
  fallback_category_id: string
  moved_record_count: number
}

export interface ZhanJiDangAnYiDongJieGuo {
  record_id: string
  source_category_id: string
  category_id: string
  sort_order: number
  source_version: number
  target_version: number
}

export interface ZhanJiFenLeiPaiXuJieGuo {
  category_id: string
  record_ids: string[]
  version: number
}

export type { ZhanJiFenLeiCuoWuDaiMa } from '../config/错误码注册表'

export class ZhanJiFenLeiCuoWu extends YingYongCuoWu {
  constructor(
    public readonly daiMa: ZhanJiFenLeiCuoWuDaiMa,
    _zhuangTaiMa?: 400 | 404 | 409,
    _fanYiJian?: string,
  ) {
    super(daiMa)
  }

  get zhuangTaiMa(): 400 | 404 | 409 {
    return huoQuCuoWuXianRong(this.daiMa).httpStatus as 400 | 404 | 409
  }
}

function zhengLiFenLeiMingCheng(zhi: unknown): string {
  if (typeof zhi !== 'string') {
    throw new ZhanJiFenLeiCuoWu(
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO,
      400,
      'fenLeiMingChengBuNengWeiKong',
    )
  }
  const jieXi = zhi.trim()
  if (!jieXi) {
    throw new ZhanJiFenLeiCuoWu(
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO,
      400,
      'fenLeiMingChengBuNengWeiKong',
    )
  }
  if ([...jieXi].length > ZHAN_JI_PEI_ZHI.fenLeiMingChengZuiDaChangDu) {
    throw new ZhanJiFenLeiCuoWu(
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHANG,
      400,
      'fenLeiMingChengTaiChang',
    )
  }
  return jieXi
}

async function zaiShiYongLiaoZhongYunXing<T>(
  yong_hu_id: string,
  yun_xing: (jieKou: PoolClient) => Promise<T>,
): Promise<T> {
  const jieKou = await 数据库.connect()
  try {
    await jieKou.query('BEGIN')
    await jieKou.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [yong_hu_id])
    const jieGuo = await yun_xing(jieKou)
    await jieKou.query('COMMIT')
    return jieGuo
  } catch (cuoWu) {
    await jieKou.query('ROLLBACK').catch(() => undefined)
    throw cuoWu
  } finally {
    jieKou.release()
  }
}

async function queBaoMoRenFenLei(jieKou: PoolClient, yong_hu_id: string): Promise<string> {
  await jieKou.query(
    `INSERT INTO "战绩分类" ("用户ID", "名称", "是否默认") VALUES ($1, '', TRUE)
     ON CONFLICT ("用户ID") WHERE "是否默认" = TRUE DO NOTHING`,
    [yong_hu_id],
  )
  const jieGuo = await jieKou.query(
    `SELECT "ID" FROM "战绩分类" WHERE "用户ID" = $1 AND "是否默认" = TRUE LIMIT 1`,
    [yong_hu_id],
  )
  return String(jieGuo.rows[0].ID)
}

function zhuanHuanFenLei(xing: Record<string, unknown>): ZhanJiFenLei {
  const isDefault = Boolean(xing.是否默认)
  const cunChuMingCheng = String(xing.名称 || '')
  return {
    id: String(xing.ID),
    name:
      isDefault && !cunChuMingCheng
        ? huoQuFanYi('zhanJi', 'moRenFenLei')
        : cunChuMingCheng,
    is_default: isDefault,
    record_count: Number(xing.记录数 || 0),
    version: Number(xing.版本 || 0),
    sort_order: Number(xing.排序 ?? 0),
  }
}

export async function huoQuZhanJiFenLeiLieBiao(yong_hu_id: string): Promise<{
  moRenFenLeiId: string
  fenLeiLieBiao: ZhanJiFenLei[]
}> {
  const moRenFenLeiId = await zaiShiYongLiaoZhongYunXing(yong_hu_id, (jieKou) =>
    queBaoMoRenFenLei(jieKou, yong_hu_id),
  )
  const jieGuo = await 数据库.query(
    `SELECT c."ID", c."名称", c."是否默认", c."版本", c."排序",
            COUNT(d."ID") FILTER (
              WHERE NOT (d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = '')
            )::int AS "记录数"
       FROM "战绩分类" c
       LEFT JOIN "游戏档案" d ON d."分类ID" = c."ID"
      WHERE c."用户ID" = $1
      GROUP BY c."ID"
      ORDER BY c."排序", c."ID"`,
    [yong_hu_id],
  )
  return {
    moRenFenLeiId,
    fenLeiLieBiao: jieGuo.rows.map((xing) => zhuanHuanFenLei(xing)),
  }
}

export async function chuangJianZhanJiFenLei(
  yong_hu_id: string,
  ming_cheng: unknown,
): Promise<ZhanJiFenLei> {
  const jingZhengHouDeMingCheng = zhengLiFenLeiMingCheng(ming_cheng)
  try {
    return await zaiShiYongLiaoZhongYunXing(yong_hu_id, async (jieKou) => {
      await queBaoMoRenFenLei(jieKou, yong_hu_id)
      const chongFu = await jieKou.query(
        `SELECT 1 FROM "战绩分类"
          WHERE "用户ID" = $1 AND lower(btrim("名称")) = lower($2) LIMIT 1`,
        [yong_hu_id, jingZhengHouDeMingCheng],
      )
      if (chongFu.rows.length > 0) {
        throw new ZhanJiFenLeiCuoWu(
          CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU,
          409,
          'fenLeiMingChengYiCunZai',
        )
      }
      const jieGuo = await jieKou.query(
        `INSERT INTO "战绩分类" ("用户ID", "名称", "排序")
         VALUES ($1, $2, (SELECT COALESCE(MAX("排序"), -1) + 1 FROM "战绩分类" WHERE "用户ID" = $1))
         RETURNING "ID", "名称", "是否默认", "版本", "排序", 0::int AS "记录数"`,
        [yong_hu_id, jingZhengHouDeMingCheng],
      )
      return zhuanHuanFenLei(jieGuo.rows[0])
    })
  } catch (cuoWu) {
    if ((cuoWu as { code?: string }).code === '23505') {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU,
        409,
        'fenLeiMingChengYiCunZai',
      )
    }
    throw cuoWu
  }
}

export async function gengMingZhanJiFenLei(
  yong_hu_id: string,
  fen_lei_id: string,
  ming_cheng: unknown,
  yu_ben_ban_ben: unknown,
): Promise<ZhanJiFenLei> {
  const jingZhengHouDeMingCheng = zhengLiFenLeiMingCheng(ming_cheng)
  if (!Number.isSafeInteger(yu_ben_ban_ben) || Number(yu_ben_ban_ben) < 0) {
    throw new Error(CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA)
  }
  try {
    return await zaiShiYongLiaoZhongYunXing(yong_hu_id, async (jieKou) => {
      const xianYou = await jieKou.query(
        `SELECT "ID", "是否默认", "版本" FROM "战绩分类"
          WHERE "ID" = $1 AND "用户ID" = $2 FOR UPDATE`,
        [fen_lei_id, yong_hu_id],
      )
      if (xianYou.rows.length === 0) {
        throw new ZhanJiFenLeiCuoWu(
          CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
          404,
          'fenLeiBuCunZai',
        )
      }
      if (Number(xianYou.rows[0].版本) !== Number(yu_ben_ban_ben)) {
        throw new ZhanJiFenLeiCuoWu(
          CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
          409,
          'fenLeiShuJuYiBianHua',
        )
      }
      const chongFu = await jieKou.query(
        `SELECT 1 FROM "战绩分类"
          WHERE "用户ID" = $1 AND "ID" <> $3
            AND lower(btrim("名称")) = lower($2)
          LIMIT 1`,
        [yong_hu_id, jingZhengHouDeMingCheng, fen_lei_id],
      )
      if (chongFu.rows.length > 0) {
        throw new ZhanJiFenLeiCuoWu(
          CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU,
          409,
          'fenLeiMingChengYiCunZai',
        )
      }
      const jieGuo = await jieKou.query(
        `UPDATE "战绩分类"
            SET "名称" = $3, "版本" = "版本" + 1
          WHERE "ID" = $1 AND "用户ID" = $2
          RETURNING "ID", "名称", "是否默认", "版本", "排序",
            (SELECT COUNT(*) FILTER (
               WHERE NOT (d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = '')
             )::int
             FROM "游戏档案" d WHERE d."分类ID" = "战绩分类"."ID") AS "记录数"`,
        [fen_lei_id, yong_hu_id, jingZhengHouDeMingCheng],
      )
      return zhuanHuanFenLei(jieGuo.rows[0])
    })
  } catch (cuoWu) {
    if ((cuoWu as { code?: string }).code === '23505') {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU,
        409,
        'fenLeiMingChengYiCunZai',
      )
    }
    throw cuoWu
  }
}

export async function shanChuZhanJiFenLei(
  yong_hu_id: string,
  fen_lei_id: string,
  yu_ben_ban_ben: unknown,
): Promise<ZhanJiFenLeiShanChuJieGuo> {
  if (!Number.isSafeInteger(yu_ben_ban_ben) || Number(yu_ben_ban_ben) < 0) {
    throw new Error(CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA)
  }
  return zaiShiYongLiaoZhongYunXing(yong_hu_id, async (jieKou) => {
    const fenLei = await jieKou.query(
      `SELECT "ID", "是否默认", "版本" FROM "战绩分类"
        WHERE "ID" = $1 AND "用户ID" = $2 FOR UPDATE`,
      [fen_lei_id, yong_hu_id],
    )
    if (fenLei.rows.length === 0) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
        404,
        'fenLeiBuCunZai',
      )
    }
    if (fenLei.rows[0].是否默认) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_MO_REN_FEN_LEI_BU_NENG_SHAN_CHU,
        409,
        'moRenFenLeiBuNengShanChu',
      )
    }
    if (Number(fenLei.rows[0].版本) !== Number(yu_ben_ban_ben)) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
        409,
        'fenLeiShuJuYiBianHua',
      )
    }
    const moRenFenLeiId = await queBaoMoRenFenLei(jieKou, yong_hu_id)
    const QianYi = await jieKou.query(
      `WITH yuanDianXu AS (
         SELECT COALESCE(MAX("排序"), -1) + 1 AS "下一序"
         FROM "游戏档案"
         WHERE "分类ID" = $2
       ), yuanFenLei AS (
         SELECT "ID", row_number() OVER (ORDER BY "排序", "ID") - 1 AS "相对序"
         FROM "游戏档案"
         WHERE "分类ID" = $1
       )
       UPDATE "游戏档案" d
          SET "分类ID" = $2,
              "排序" = yuanDianXu."下一序" + yuanFenLei."相对序"
         FROM yuanDianXu, yuanFenLei
        WHERE d."ID" = yuanFenLei."ID"`,
      [fen_lei_id, moRenFenLeiId],
    )
    if (Number(QianYi.rowCount || 0) > 0) {
      await jieKou.query(
        `UPDATE "战绩分类" SET "版本" = "版本" + 1 WHERE "ID" = $1 AND "用户ID" = $2`,
        [moRenFenLeiId, yong_hu_id],
      )
    }
    const shanChu = await jieKou.query(
      `DELETE FROM "战绩分类" WHERE "ID" = $1 AND "用户ID" = $2 RETURNING "ID"`,
      [fen_lei_id, yong_hu_id],
    )
    if (shanChu.rows.length !== 1) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
        404,
        'fenLeiBuCunZai',
      )
    }
    return {
      deleted_id: fen_lei_id,
      fallback_category_id: moRenFenLeiId,
      moved_record_count: Number(QianYi.rowCount || 0),
    }
  })
}

export async function sheZhiMoRenZhanJiFenLei(
  yong_hu_id: string,
  fen_lei_id: string,
  yu_ben_ban_ben: unknown,
): Promise<ZhanJiFenLei> {
  if (!Number.isSafeInteger(yu_ben_ban_ben) || Number(yu_ben_ban_ben) < 0) {
    throw new Error(CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA)
  }
  return zaiShiYongLiaoZhongYunXing(yong_hu_id, async (jieKou) => {
    const fenLei = await jieKou.query(
      `SELECT "ID", "版本" FROM "战绩分类"
        WHERE "ID" = $1 AND "用户ID" = $2 FOR UPDATE`,
      [fen_lei_id, yong_hu_id],
    )
    if (fenLei.rows.length === 0) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
        404,
        'fenLeiBuCunZai',
      )
    }
    if (Number(fenLei.rows[0].版本) !== Number(yu_ben_ban_ben)) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
        409,
        'fenLeiShuJuYiBianHua',
      )
    }
    await jieKou.query(
      `UPDATE "战绩分类"
          SET "名称" = $2, "版本" = "版本" + 1
        WHERE "用户ID" = $1 AND "是否默认" = TRUE AND "名称" = ''`,
      [yong_hu_id, huoQuFanYi('zhanJi', 'moRenFenLei')],
    )
    await jieKou.query(
      `UPDATE "战绩分类" SET "是否默认" = FALSE, "版本" = "版本" + 1
        WHERE "用户ID" = $1 AND "是否默认" = TRUE`,
      [yong_hu_id],
    )
    const jieGuo = await jieKou.query(
      `UPDATE "战绩分类"
          SET "是否默认" = TRUE, "版本" = "版本" + 1
        WHERE "ID" = $1 AND "用户ID" = $2
        RETURNING "ID", "名称", "是否默认", "版本", "排序",
          (SELECT COUNT(*) FILTER (
             WHERE NOT (d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = '')
           )::int
           FROM "游戏档案" d WHERE d."分类ID" = "战绩分类"."ID") AS "记录数"`,
      [fen_lei_id, yong_hu_id],
    )
    return zhuanHuanFenLei(jieGuo.rows[0])
  })
}

export async function baoCunFenLeiPaiXu(
  yong_hu_id: string,
  fen_lei_ids: unknown,
): Promise<{ moRenFenLeiId: string; fenLeiLieBiao: ZhanJiFenLei[] }> {
  if (
    !Array.isArray(fen_lei_ids) ||
    fen_lei_ids.length === 0 ||
    !fen_lei_ids.every((id) => typeof id === 'string' && id.length > 0)
  ) {
    throw new ZhanJiFenLeiCuoWu(
      CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA,
      400,
      'paiXuCanShuBuHeFa',
    )
  }
  const bianHaoLieBiao = fen_lei_ids as string[]
  if (new Set(bianHaoLieBiao).size !== bianHaoLieBiao.length) {
    throw new ZhanJiFenLeiCuoWu(
      CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA,
      400,
      'paiXuCanShuBuHeFa',
    )
  }
  return zaiShiYongLiaoZhongYunXing(yong_hu_id, async (jieKou) => {
    const xianYou = await jieKou.query(
      `SELECT "ID" FROM "战绩分类" WHERE "用户ID" = $1 FOR UPDATE`,
      [yong_hu_id],
    )
    const xianYouIds = new Set(xianYou.rows.map((xing) => String(xing.ID)))
    if (xianYouIds.size !== bianHaoLieBiao.length || !bianHaoLieBiao.every((id) => xianYouIds.has(id))) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA,
        400,
        'paiXuCanShuBuHeFa',
      )
    }
    await jieKou.query('SET CONSTRAINTS "战绩分类_用户排序唯一" DEFERRED')
    for (let i = 0; i < bianHaoLieBiao.length; i += 1) {
      await jieKou.query(
        `UPDATE "战绩分类" SET "排序" = $3, "版本" = "版本" + 1
          WHERE "ID" = $1 AND "用户ID" = $2`,
        [bianHaoLieBiao[i], yong_hu_id, i],
      )
    }
    const moRen = await jieKou.query(
      `SELECT "ID" FROM "战绩分类" WHERE "用户ID" = $1 AND "是否默认" = TRUE LIMIT 1`,
      [yong_hu_id],
    )
    const lieBiao = await jieKou.query(
      `SELECT c."ID", c."名称", c."是否默认", c."版本", c."排序",
              COUNT(d."ID") FILTER (
                WHERE NOT (d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = '')
              )::int AS "记录数"
         FROM "战绩分类" c
         LEFT JOIN "游戏档案" d ON d."分类ID" = c."ID"
        WHERE c."用户ID" = $1
        GROUP BY c."ID"
        ORDER BY c."排序", c."ID"`,
      [yong_hu_id],
    )
    return {
      moRenFenLeiId: moRen.rows.length > 0 ? String(moRen.rows[0].ID) : '',
      fenLeiLieBiao: lieBiao.rows.map((xing) => zhuanHuanFenLei(xing)),
    }
  })
}

export async function yiDongDangAnDaoFenLei(
  yong_hu_id: string,
  yuan_fen_lei_id: string,
  dang_an_id: string,
  mubiao_fen_lei_id: string,
  yu_ben_ban_ben: unknown,
): Promise<ZhanJiDangAnYiDongJieGuo> {
  if (!Number.isSafeInteger(yu_ben_ban_ben) || Number(yu_ben_ban_ben) < 0) {
    throw new Error(CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA)
  }
  if (yuan_fen_lei_id === mubiao_fen_lei_id) {
    throw new ZhanJiFenLeiCuoWu(
      CUO_WU_DAI_MA.ZHAN_JI_BU_NENG_YIDONG_DAO_DANG_QIAN_FEN_LEI,
      400,
      'buNengYiDongDaoDangQianFenLei',
    )
  }
  return zaiShiYongLiaoZhongYunXing(yong_hu_id, async (jieKou) => {
    const fenLeiList = await jieKou.query(
      `SELECT "ID", "版本" FROM "战绩分类"
        WHERE "用户ID" = $1 AND "ID" = ANY($2::uuid[])
        ORDER BY "ID" FOR UPDATE`,
      [yong_hu_id, [yuan_fen_lei_id, mubiao_fen_lei_id]],
    )
    if (fenLeiList.rows.length !== 2) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
        404,
        'fenLeiBuCunZai',
      )
    }
    const fenLeiMap = new Map(
      fenLeiList.rows.map((xing) => [String(xing.ID), Number(xing.版本)]),
    )
    const yuanBanBen = fenLeiMap.get(yuan_fen_lei_id) as number
    const mubiaoBanBen = fenLeiMap.get(mubiao_fen_lei_id) as number
    if (yuanBanBen !== Number(yu_ben_ban_ben)) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
        409,
        'fenLeiShuJuYiBianHua',
      )
    }
    const dangAn = await jieKou.query(
      `SELECT "分类ID" FROM "游戏档案"
        WHERE "ID" = $1 AND "用户ID" = $2 FOR UPDATE`,
      [dang_an_id, yong_hu_id],
    )
    if (dangAn.rows.length === 0) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_DANG_AN_BU_CUN_ZAI,
        404,
        'dangAnBuCunZai',
      )
    }
    if (String(dangAn.rows[0].分类ID) !== yuan_fen_lei_id) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_DANG_AN_BU_SHU_YU_FEN_LEI,
        409,
        'dangAnBuShuYuFenLei',
      )
    }
    const xiaXu = await jieKou.query(
      `SELECT COALESCE(MAX("排序"), -1) + 1 AS "下一序"
         FROM "游戏档案" WHERE "分类ID" = $1`,
      [mubiao_fen_lei_id],
    )
    const mubiaoXu = Number(xiaXu.rows[0].下一序)
    await jieKou.query('SET CONSTRAINTS "游戏档案_分类内排序唯一" DEFERRED')
    await jieKou.query(
      `UPDATE "游戏档案" SET "分类ID" = $2, "排序" = $3 WHERE "ID" = $1`,
      [dang_an_id, mubiao_fen_lei_id, mubiaoXu],
    )
    await jieKou.query(
      `WITH xuHou AS (
         SELECT "ID", row_number() OVER (ORDER BY "排序", "ID") - 1 AS "新排序"
         FROM "游戏档案"
         WHERE "分类ID" = $1
       )
       UPDATE "游戏档案" d SET "排序" = x."新排序"
       FROM xuHou x WHERE d."ID" = x."ID"`,
      [yuan_fen_lei_id],
    )
    await jieKou.query(
      `UPDATE "战绩分类" SET "版本" = "版本" + 1
        WHERE "用户ID" = $1 AND "ID" = ANY($2::uuid[])`,
      [yong_hu_id, [yuan_fen_lei_id, mubiao_fen_lei_id]],
    )
    return {
      record_id: dang_an_id,
      source_category_id: yuan_fen_lei_id,
      category_id: mubiao_fen_lei_id,
      sort_order: mubiaoXu,
      source_version: yuanBanBen + 1,
      target_version: mubiaoBanBen + 1,
    }
  })
}

export async function paiXuFenLeiNeiZhanJi(
  yong_hu_id: string,
  fen_lei_id: string,
  dang_an_id_ji: unknown,
  yu_ben_ban_ben: unknown,
): Promise<ZhanJiFenLeiPaiXuJieGuo> {
  if (
    !Array.isArray(dang_an_id_ji) ||
    dang_an_id_ji.some((id) => typeof id !== 'string') ||
    !Number.isSafeInteger(yu_ben_ban_ben) ||
    Number(yu_ben_ban_ben) < 0
  ) {
    throw new Error(CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA)
  }
  const recordIds = (dang_an_id_ji as string[]).map((id) => id.toLowerCase())
  if (new Set(recordIds).size !== recordIds.length) {
    throw new ZhanJiFenLeiCuoWu(
      CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_ID_CHONG_FU,
      400,
      'paiXuIDChongFu',
    )
  }
  return zaiShiYongLiaoZhongYunXing(yong_hu_id, async (jieKou) => {
    const fenLei = await jieKou.query(
      `SELECT "版本" FROM "战绩分类" WHERE "ID" = $1 AND "用户ID" = $2 FOR UPDATE`,
      [fen_lei_id, yong_hu_id],
    )
    if (fenLei.rows.length === 0) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
        404,
        'fenLeiBuCunZai',
      )
    }
    const dangQianBanBen = Number(fenLei.rows[0].版本)
    if (dangQianBanBen !== Number(yu_ben_ban_ben)) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
        409,
        'fenLeiShuJuYiBianHua',
      )
    }
    const xianYou = await jieKou.query(
      `SELECT "ID" FROM "游戏档案"
        WHERE "分类ID" = $1
          AND NOT ("模式" = 'tiaozhan' AND COALESCE("结果类型", '') = '')
        ORDER BY "排序", "ID" FOR UPDATE`,
      [fen_lei_id],
    )
    const xianYouIds = xianYou.rows.map((xing) => String(xing.ID))
    const xianYouJi = new Set(xianYouIds)
    if (
      recordIds.length !== xianYouIds.length ||
      recordIds.some((id) => !xianYouJi.has(id))
    ) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN,
        409,
        'paiXuBiXuBaoHanFenLeiQuanBuKeJianZhanJi',
      )
    }
    if (recordIds.every((id, index) => id === xianYouIds[index])) {
      return { category_id: fen_lei_id, record_ids: recordIds, version: dangQianBanBen }
    }
    await jieKou.query('SET CONSTRAINTS "游戏档案_分类内排序唯一" DEFERRED')
    await jieKou.query(
      `WITH keJian AS (
         SELECT "ID", ordinality - 1 AS "新排序"
         FROM unnest($2::uuid[]) WITH ORDINALITY AS x("ID", ordinality)
       ), yinCang AS (
         SELECT d."ID",
                (SELECT COUNT(*) FROM keJian) + row_number() OVER (ORDER BY d."排序", d."ID") - 1 AS "新排序"
         FROM "游戏档案" d
         WHERE d."分类ID" = $1
           AND d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = ''
       ), quBuXuXu AS (
         SELECT "ID", "新排序" FROM keJian
         UNION ALL
         SELECT "ID", "新排序" FROM yinCang
       )
       UPDATE "游戏档案" d SET "排序" = x."新排序"
         FROM quBuXuXu x WHERE d."ID" = x."ID"`,
      [fen_lei_id, recordIds],
    )
    await jieKou.query(
      `UPDATE "战绩分类" SET "版本" = "版本" + 1 WHERE "ID" = $1 AND "用户ID" = $2`,
      [fen_lei_id, yong_hu_id],
    )
    return {
      category_id: fen_lei_id,
      record_ids: recordIds,
      version: dangQianBanBen + 1,
    }
  })
}

function zhaiYaoZuiHouXiaoXi(hang: Record<string, unknown>): string {
  if (hang.已撤回) {
    return hang.发送者 === 'yonghu'
      ? huoQuFanYi('liaoTian', 'ninCheHuiLeYiTiaoXiaoXi')
      : huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
  }
  const wenBen = typeof hang.内容 === 'string' ? hang.内容.trim() : ''
  if (wenBen) return Array.from(wenBen).slice(0, ZHAN_JI_PEI_ZHI.zhaiYaoZuiDaMaDian).join('')
  const lei = typeof hang.类型 === 'string' ? hang.类型 : ''
  if (lei === 'yuYin') return huoQuFanYi('zhanJi', 'yuYinZhaiYao')
  if (lei === 'tuPian') return huoQuFanYi('zhanJi', 'tuPianZhaiYao')
  if (lei === 'biaoQingBao') return huoQuFanYi('zhanJi', 'biaoQingBaoZhaiYao')
  if (lei === 'wenJian') return huoQuFanYi('zhanJi', 'wenJianZhaiYao')
  return ''
}

function guiYiZuiHouFaSongZhe(faSongZhe: unknown): 'yonghu' | 'jiaose' {
  return faSongZhe === 'yonghu' ? 'yonghu' : 'jiaose'
}

export async function huoQuDangAnLieBiao(
  yong_hu_id: string,
  fen_lei_id?: string,
): Promise<DangAnLieBiaoXiang[]> {
  if (fen_lei_id) {
    const fenLei = await 数据库.query(
      `SELECT 1 FROM "战绩分类" WHERE "ID" = $1 AND "用户ID" = $2 LIMIT 1`,
      [fen_lei_id, yong_hu_id],
    )
    if (fenLei.rows.length === 0) {
      throw new ZhanJiFenLeiCuoWu(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
        404,
        'fenLeiBuCunZai',
      )
    }
  }
  const jieGuo = await 数据库.query(
    `SELECT d."ID", d."用户ID", d."角色ID", d."角色名字", r."微信昵称", d."是否渣型",
            d."结果类型", d."是否封存", d."好感度总分", d."关系阶段",
            d."聊天天数", d."消息总数", d."创建时间", r."MBTI", r."性别", r."结局文案",
            r."随机性格",
            d."最后消息时间", d."模式", d."分类ID", d."排序"
      FROM "游戏档案" d
      LEFT JOIN "角色" r ON r."ID" = d."角色ID"
      LEFT JOIN "战绩分类" c ON c."ID" = d."分类ID"
      WHERE d."用户ID" = $1
      -- 挑战模式进行中的对局不进入过往战绩（结束后进入胜利/失败分组）
        AND NOT (d."模式" = 'tiaozhan' AND COALESCE(d."结果类型", '') = '')
        AND ($2::uuid IS NULL OR d."分类ID" = $2)
      ORDER BY c."排序", c."ID", d."排序", d."ID"`,
    [yong_hu_id, fen_lei_id ?? null],
  )
  const jiaoSeIds = [...new Set(jieGuo.rows.map((shuJuHang) => String(shuJuHang.角色ID)))].filter(
    (id) => id,
  )
  const zuiHouAnJiaoSe = new Map<string, ZhanJiZuiHouXiaoXi[]>()
  if (jiaoSeIds.length > 0) {
    const xiaoXi = await 数据库.query(
      `SELECT "角色ID", "发送者", "内容", "类型", "已撤回", "创建时间", "ID"
         FROM (
           SELECT "角色ID", "发送者", "内容", "类型", "已撤回", "创建时间", "ID",
                  ROW_NUMBER() OVER (PARTITION BY "角色ID" ORDER BY "创建时间" DESC, "ID" DESC) AS hang_hao
             FROM "消息"
            WHERE "用户ID" = $1 AND "角色ID" = ANY($2::uuid[]) AND "发送者" IN ('yonghu', 'jiaose')
         ) fen_zu
        WHERE hang_hao <= $3
        ORDER BY "角色ID", "创建时间" DESC, "ID" DESC`,
      [yong_hu_id, jiaoSeIds, ZHAN_JI_PEI_ZHI.zuiHouXiaoXiMeiJiaoSeTiaoShu],
    )
    for (const hang of xiaoXi.rows as Record<string, unknown>[]) {
      const jiaoSeId = String(hang.角色ID)
      const lieBiao = zuiHouAnJiaoSe.get(jiaoSeId)
      if (lieBiao && lieBiao.length >= ZHAN_JI_PEI_ZHI.zuiHouXiaoXiMeiJiaoSeTiaoShu) continue
      const zhaiYao = zhaiYaoZuiHouXiaoXi(hang)
      if (!zhaiYao) continue
      const tiao: ZhanJiZuiHouXiaoXi = {
        shi_jian: String(hang.创建时间),
        fa_song_zhe: guiYiZuiHouFaSongZhe(hang.发送者),
        zhai_yao: zhaiYao,
      }
      if (lieBiao) lieBiao.unshift(tiao)
      else zuiHouAnJiaoSe.set(jiaoSeId, [tiao])
    }
  }

  return jieGuo.rows.map((shuJuHang) => {
    const jieGuoLeiXingYuan = 解析结局类型(shuJuHang.结果类型, Boolean(shuJuHang.是否封存))
    const chuangJianShiJian = String(shuJuHang.创建时间 || new Date().toISOString())
    const youXiJieShu = jieGuoLeiXingYuan !== 'jinxing_zhong'
    return {
      id: String(shuJuHang.ID),
      yong_hu_id: String(shuJuHang.用户ID),
      jiao_se_id: String(shuJuHang.角色ID),
      jiao_se_ming_zi: String(shuJuHang.微信昵称 || huoQuFanYi('zhanJi', 'weiZhiWeiXin')),
      shi_fou_zha_xing: youXiJieShu ? Boolean(shuJuHang.是否渣型) : undefined,
      tou_xiang_biao_ji:
        youXiJieShu && Boolean(shuJuHang.是否渣型)
          ? 'zha'
          : jieGuoLeiXingYuan === 'sheng_li_ai_qing'
            ? 'ai'
            : 'pu',
      jie_guo_lei_xing: 解析结局文案(
        jieGuoLeiXingYuan,
        归一角色性别(shuJuHang.性别),
        shuJuHang.结局文案 ?? null,
      ),
      jie_guo_lei_xing_yuan: jieGuoLeiXingYuan,
      shi_fou_feng_cun: Boolean(shuJuHang.是否封存),
      hao_gan_du_zong_fen: Number(shuJuHang.好感度总分 || 0),
      guan_xi_jie_duan: String(shuJuHang.关系阶段 || ''),
      liao_tian_tian_shu: Number(shuJuHang.聊天天数 || 0),
      xiao_xi_zong_shu: Number(shuJuHang.消息总数 || 0),
      chuang_jian_shi_jian: chuangJianShiJian,
      zui_hou_xiao_xi_shi_jian: shuJuHang.最后消息时间 ? String(shuJuHang.最后消息时间) : null,
      you_xi_jie_shu_shi_jian: youXiJieShu ? chuangJianShiJian : null,
      mbti_lei_xing:
        Boolean(shuJuHang.随机性格) && !youXiJieShu
          ? undefined
          : shuJuHang.MBTI
            ? String(shuJuHang.MBTI)
            : undefined,
      sui_ji_xing_ge: Boolean(shuJuHang.随机性格),
      mo_shi: shuJuHang.模式 === 'tiaozhan' ? 'tiaozhan' : 'putong',
      category_id: String(shuJuHang.分类ID || ''),
      sort_order: Number(shuJuHang.排序 || 0),
      zui_hou_liang_tiao: zuiHouAnJiaoSe.get(String(shuJuHang.角色ID)) ?? [],
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
            r."随机性格",
            d."复盘内容", d."复盘数据",
            d."最后消息时间", d."分类ID", d."排序"
      FROM "游戏档案" d
      LEFT JOIN "角色" r ON r."ID" = d."角色ID"
      WHERE d."ID" = $1 AND d."用户ID" = $2
      LIMIT 1`,
    [dang_an_id, yong_hu_id],
  )

  if (jieGuo.rows.length === 0) return null

  const shuJuHang = jieGuo.rows[0]
  const jieGuoLeiXingYuan = 解析结局类型(shuJuHang.结果类型, Boolean(shuJuHang.是否封存))
  const chuangJianShiJian = String(shuJuHang.创建时间 || new Date().toISOString())
  const youXiJieShu = jieGuoLeiXingYuan !== 'jinxing_zhong'

  let fuPanShuJu: FuPanShiJianXianTiaoMu[] | null = null
  let fuPanPiZhu: FuPanPiZhu[] | null = null
  if (shuJuHang.复盘数据) {
    try {
      const jieXi = typeof shuJuHang.复盘数据 === 'string' ? JSON.parse(shuJuHang.复盘数据) : shuJuHang.复盘数据
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

  const junShiJiLu = await huoQuJunShiJiLuLieBiao(yong_hu_id, shuJuHang.角色ID)

  return {
    id: String(shuJuHang.ID),
    yong_hu_id: String(shuJuHang.用户ID),
    jiao_se_id: String(shuJuHang.角色ID),
    jiao_se_ming_zi: String(shuJuHang.微信昵称 || huoQuFanYi('zhanJi', 'weiZhiWeiXin')),
    shi_fou_zha_xing: youXiJieShu ? Boolean(shuJuHang.是否渣型) : undefined,
    tou_xiang_biao_ji:
      youXiJieShu && Boolean(shuJuHang.是否渣型)
        ? 'zha'
        : jieGuoLeiXingYuan === 'sheng_li_ai_qing'
          ? 'ai'
          : 'pu',
    jie_guo_lei_xing: 解析结局文案(
      jieGuoLeiXingYuan,
      归一角色性别(shuJuHang.性别),
      shuJuHang.结局文案 ?? null,
    ),
    jie_guo_lei_xing_yuan: jieGuoLeiXingYuan,
    shi_fou_feng_cun: Boolean(shuJuHang.是否封存),
    hao_gan_du_zong_fen: Number(shuJuHang.好感度总分 || 0),
    guan_xi_jie_duan: String(shuJuHang.关系阶段 || ''),
    liao_tian_tian_shu: Number(shuJuHang.聊天天数 || 0),
    xiao_xi_zong_shu: Number(shuJuHang.消息总数 || 0),
    fu_pan_shu_ju: fuPanShuJu,
    fu_pan_nei_rong: shuJuHang.复盘内容 ? String(shuJuHang.复盘内容) : null,
    fu_pan_pi_zhu: fuPanPiZhu,
    chuang_jian_shi_jian: chuangJianShiJian,
    zui_hou_xiao_xi_shi_jian: shuJuHang.最后消息时间 ? String(shuJuHang.最后消息时间) : null,
    you_xi_jie_shu_shi_jian: youXiJieShu ? chuangJianShiJian : null,
    mbti_lei_xing:
      Boolean(shuJuHang.随机性格) && !youXiJieShu
        ? undefined
        : shuJuHang.MBTI
          ? String(shuJuHang.MBTI)
          : undefined,
    sui_ji_xing_ge: Boolean(shuJuHang.随机性格),
    category_id: String(shuJuHang.分类ID || ''),
    sort_order: Number(shuJuHang.排序 || 0),
    zui_hou_liang_tiao: [],
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
  return jieGuo.rows.map((shuJuHang) => String(shuJuHang.ID))
}
