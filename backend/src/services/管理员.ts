import { 数据库 } from '../数据库'
import { redis } from '../redis'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { peiZhi } from '../config'
import { debug日志 } from '../utils/debug日志'
import { shengChengLingPai } from '../utils/jwt'
import { huoQuFanYi } from '../config/translations'
import { yinBiShouJiHao } from '../utils/掩码'
import { huoQuJieDuanMing } from './好感度'
import { huoQuAIJiaoSeXinXi } from './AI输入准备'
import { jiaoSeShiFouBeiDuoShe } from './夺舍'
import { yingSheYongHu } from './认证'
import { qingChuJiaoSeHuanCun } from '../middleware/管理员'
import { 取管理角色, type GuanLiJiaoSe } from '../utils/角色能力'
import type { YongHuXinXi } from '../types'

export interface YongHuLieBiaoXiang {
  id: string
  shou_ji_hao: string
  yong_hu_ming: string | null
  jiao_se: GuanLiJiaoSe | null
  ce_shi: boolean
  jiao_se_shu: number
  xiao_xi_shu: number
  chuang_jian_shi_jian: string
}

export interface DuiHuaLieBiaoXiang {
  jiao_se_id: string
  yong_hu_id: string
  yong_hu_ming: string | null
  jiao_se_ming: string
  jie_duan: string
  zong_fen: number
  duo_she_zhuang_tai: boolean
  chuang_jian_shi_jian: string
}

export interface DuiHuaXiangQing {
  jiao_se: Awaited<ReturnType<typeof huoQuAIJiaoSeXinXi>>
  yong_hu: YongHuXinXi | null
  xiao_xi_lie_biao: unknown[]
  hao_gan_du: {
    jie_duan: string
    zong_fen: number
    xin_ren_du: number
    qin_mi_du: number
    qu_wei_du: number
    guan_huai_du: number
  } | null
}

export interface JiaoSeXinXiXiangYing {
  jiao_se: Awaited<ReturnType<typeof huoQuAIJiaoSeXinXi>>
  duo_she_zhuang_tai: boolean
}

export interface XiTongZhuangTai {
  yong_hu_shu: number
  jiao_se_shu: number
  xiao_xi_shu: number
  jin_ri_xin_zeng: {
    yong_hu: number
    jiao_se: number
    xiao_xi: number
  }
  redis_jian_shu: number
  shen_ji_ri_zhi: unknown[]
}

function yingSheXiaoXi(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(row.ID),
    hui_hua_id: String(row.角色ID),
    fa_song_zhe_id: row.发送者 === 'yonghu' ? String(row.用户ID) : String(row.角色ID),
    fa_song_zhe_lei_xing: row.发送者,
    nei_rong: String(row.内容),
    lei_xing: String(row.类型 || 'wenben'),
    shi_jian: row.创建时间 ? String(row.创建时间) : new Date().toISOString(),
    yi_du: Boolean(row.已读),
    yi_che_hui: Boolean(row.已撤回),
    yuan_shi_nei_rong: row.原始内容 ? String(row.原始内容) : null,
  }
}

function yingSheShenJiRiZhi(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(row.ID),
    yong_hu_id: row.用户ID ? String(row.用户ID) : null,
    ip: String(row.IP),
    shi_jian_lei_xing: String(row.事件类型),
    xiang_qing: row.详情 || null,
    lei_xing: String(row.类型 || '普通'),
    chuang_jian_shi_jian: row.创建时间 ? String(row.创建时间) : new Date().toISOString(),
  }
}

export async function huoQuYongHuLieBiao(): Promise<YongHuLieBiaoXiang[]> {
  const jieGuo = await 数据库.query(
    `SELECT
       u."ID", u."手机号", u."用户名", u."管理员", u."运营", u."审核员", u."测试", u."创建时间",
       (SELECT COUNT(*) FROM "角色" r WHERE r."用户ID" = u."ID") AS jiao_se_shu,
       (SELECT COUNT(*) FROM "消息" m WHERE m."用户ID" = u."ID") AS xiao_xi_shu
     FROM "用户" u
     ORDER BY u."创建时间" DESC`,
  )

  return jieGuo.rows.map((row): YongHuLieBiaoXiang => ({
    id: String(row.ID),
    shou_ji_hao: yinBiShouJiHao(String(row.手机号)),
    yong_hu_ming: row.用户名 ? String(row.用户名) : null,
    jiao_se: 取管理角色(row),
    ce_shi: Boolean(row.测试),
    jiao_se_shu: Number(row.jiao_se_shu || 0),
    xiao_xi_shu: Number(row.xiao_xi_shu || 0),
    chuang_jian_shi_jian: row.创建时间 ? String(row.创建时间) : new Date().toISOString(),
  }))
}

export async function huoQuDuiHuaLieBiao(): Promise<DuiHuaLieBiaoXiang[]> {
  const jieGuo = await 数据库.query(
    `SELECT
       r."ID" AS jiao_se_id,
       r."用户ID" AS yong_hu_id,
       r."名字" AS jiao_se_ming,
       r."创建时间",
       u."用户名" AS yong_hu_ming,
       h."总分" AS zong_fen
     FROM "角色" r
     JOIN "用户" u ON u."ID" = r."用户ID"
     LEFT JOIN "好感度" h ON h."用户ID" = r."用户ID" AND h."角色ID" = r."ID"
     ORDER BY r."创建时间" DESC`,
  )

  const lieBiao: DuiHuaLieBiaoXiang[] = []
  for (const row of jieGuo.rows) {
    const jiaoSeId = String(row.jiao_se_id)
    const zongFen = Number(row.zong_fen || 0)
    lieBiao.push({
      jiao_se_id: jiaoSeId,
      yong_hu_id: String(row.yong_hu_id),
      yong_hu_ming: row.yong_hu_ming ? String(row.yong_hu_ming) : null,
      jiao_se_ming: String(row.jiao_se_ming),
      jie_duan: huoQuJieDuanMing(zongFen),
      zong_fen: zongFen,
      duo_she_zhuang_tai: await jiaoSeShiFouBeiDuoShe(jiaoSeId),
      chuang_jian_shi_jian: row.创建时间 ? String(row.创建时间) : new Date().toISOString(),
    })
  }
  return lieBiao
}

export async function huoQuDuiHuaXiangQing(jiao_se_id: string): Promise<DuiHuaXiangQing | null> {
  const jiaoSe = await huoQuAIJiaoSeXinXi(jiao_se_id)
  if (!jiaoSe) return null

  const jieGuo = await 数据库.query(
    `SELECT r."用户ID", u.* FROM "角色" r JOIN "用户" u ON u."ID" = r."用户ID" WHERE r."ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  const yongHu = jieGuo.rows.length > 0 ? yingSheYongHu(jieGuo.rows[0]) : null

  const xiaoXiJieGuo = await 数据库.query(
    `SELECT * FROM "消息" WHERE "角色ID" = $1 ORDER BY "创建时间" DESC LIMIT 200`,
    [jiao_se_id],
  )

  const haoGanDuJieGuo = await 数据库.query(
    `SELECT * FROM "好感度" WHERE "角色ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  const haoGanDuHang = haoGanDuJieGuo.rows[0]
  const haoGanDu = haoGanDuHang
    ? {
        jie_duan: huoQuJieDuanMing(Number(haoGanDuHang.总分 || 0)),
        zong_fen: Number(haoGanDuHang.总分 || 0),
        xin_ren_du: Number(haoGanDuHang.信任度 || 0),
        qin_mi_du: Number(haoGanDuHang.亲密度 || 0),
        qu_wei_du: Number(haoGanDuHang.趣味度 || 0),
        guan_huai_du: Number(haoGanDuHang.关怀度 || 0),
      }
    : null

  return {
    jiao_se: jiaoSe,
    yong_hu: yongHu,
    xiao_xi_lie_biao: xiaoXiJieGuo.rows.reverse().map(yingSheXiaoXi),
    hao_gan_du: haoGanDu,
  }
}

export async function huoQuJiaoSeXinXi(jiao_se_id: string): Promise<JiaoSeXinXiXiangYing | null> {
  const jiaoSe = await huoQuAIJiaoSeXinXi(jiao_se_id)
  if (!jiaoSe) return null

  return {
    jiao_se: jiaoSe,
    duo_she_zhuang_tai: await jiaoSeShiFouBeiDuoShe(jiao_se_id),
  }
}

export interface ChuangJianCeShiYongHuJieGuo {
  cheng_gong: boolean
  yong_hu?: YongHuXinXi
  chu_shi_mi_ma?: string
  ti_shi?: string
  zhuang_tai_ma?: number
}

export async function chuangJianCeShiYongHu(
  shou_ji_hao: string,
  yong_hu_ming: string,
): Promise<ChuangJianCeShiYongHuJieGuo> {
  const yiCunZai = await 数据库.query(
    `SELECT 1 FROM "用户" WHERE "手机号" = $1 LIMIT 1`,
    [shou_ji_hao],
  )
  if (yiCunZai.rows.length > 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'shouJiHaoYiZhuCe'), zhuang_tai_ma: 409 }
  }

  // P2-2：随机强密码，仅在本次创建响应中一次性返回明文，之后任何接口不可再查询
  const chuShiMiMa = crypto.randomBytes(18).toString('base64url')
  const miMaHaXi = await bcrypt.hash(chuShiMiMa, 12)
  const chaRuJieGuo = await 数据库.query(
    `INSERT INTO "用户" ("手机号", "用户名", "密码哈希", "管理员", "测试")
     VALUES ($1, $2, $3, false, true)
     RETURNING *`,
    [shou_ji_hao, yong_hu_ming, miMaHaXi],
  )

  return {
    cheng_gong: true,
    yong_hu: yingSheYongHu(chaRuJieGuo.rows[0]),
    chu_shi_mi_ma: chuShiMiMa,
  }
}

export async function dengLuCeShiYongHu(
  shou_ji_hao: string,
): Promise<{ cheng_gong: boolean; ling_pai?: string; yong_hu?: YongHuXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "用户" WHERE "手机号" = $1 AND "测试" = true LIMIT 1`,
    [shou_ji_hao],
  )
  if (jieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'shouJiHaoWeiZhuCe'), zhuang_tai_ma: 404 }
  }

  const yongHu = yingSheYongHu(jieGuo.rows[0])
  const lingPai = shengChengLingPai({ yongHuId: yongHu.id })
  return { cheng_gong: true, ling_pai: lingPai, yong_hu: yongHu }
}

export async function shanChuYongHu(
  cao_zuo_zhe_id: string,
  mu_biao_yong_hu_id: string,
): Promise<{ cheng_gong: boolean; ti_shi?: string; zhuang_tai_ma?: number }> {
  if (cao_zuo_zhe_id === mu_biao_yong_hu_id) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('guanLiYuan', 'buNengShanChuZiJi'), zhuang_tai_ma: 400 }
  }

  const jieGuo = await 数据库.query(
    `DELETE FROM "用户" WHERE "ID" = $1 RETURNING *`,
    [mu_biao_yong_hu_id],
  )
  if (jieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'), zhuang_tai_ma: 404 }
  }

  return { cheng_gong: true }
}

export async function huoQuXiTongZhuangTai(): Promise<XiTongZhuangTai> {
  const [yongHuJieGuo, jiaoSeJieGuo, xiaoXiJieGuo, jinRiYongHu, jinRiJiaoSe, jinRiXiaoXi] = await Promise.all([
    数据库.query(`SELECT COUNT(*) FROM "用户"`),
    数据库.query(`SELECT COUNT(*) FROM "角色"`),
    数据库.query(`SELECT COUNT(*) FROM "消息"`),
    数据库.query(`SELECT COUNT(*) FROM "用户" WHERE "创建时间" >= NOW() - INTERVAL '1 day'`),
    数据库.query(`SELECT COUNT(*) FROM "角色" WHERE "创建时间" >= NOW() - INTERVAL '1 day'`),
    数据库.query(`SELECT COUNT(*) FROM "消息" WHERE "创建时间" >= NOW() - INTERVAL '1 day'`),
  ])

  const redisJianShu = await redis.dbsize()

  const shenJiJieGuo = await 数据库.query(
    `SELECT * FROM "审计日志"
     WHERE "事件类型" NOT LIKE '%积分%'
     ORDER BY "创建时间" DESC LIMIT 20`,
  )

  return {
    yong_hu_shu: Number(yongHuJieGuo.rows[0].count || 0),
    jiao_se_shu: Number(jiaoSeJieGuo.rows[0].count || 0),
    xiao_xi_shu: Number(xiaoXiJieGuo.rows[0].count || 0),
    jin_ri_xin_zeng: {
      yong_hu: Number(jinRiYongHu.rows[0].count || 0),
      jiao_se: Number(jinRiJiaoSe.rows[0].count || 0),
      xiao_xi: Number(jinRiXiaoXi.rows[0].count || 0),
    },
    redis_jian_shu: redisJianShu,
    shen_ji_ri_zhi: shenJiJieGuo.rows.map(yingSheShenJiRiZhi),
  }
}

export interface SheZhiGuanLiYuanJieGuo {
  cheng_gong: boolean
  yi_bian_geng: boolean
  jiao_se: GuanLiJiaoSe | null
  ti_shi?: string
  zhuang_tai_ma?: number
}

export async function sheZhiGuanLiYuanZhuangTai(
  mu_biao_yong_hu_id: string,
  mu_biao_zhuang_tai: boolean,
): Promise<SheZhiGuanLiYuanJieGuo> {
  const chaXun = await 数据库.query(
    `SELECT "管理员", "运营", "审核员" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [mu_biao_yong_hu_id],
  )
  if (chaXun.rows.length === 0) {
    return {
      cheng_gong: false,
      yi_bian_geng: false,
      jiao_se: null,
      ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai'),
      zhuang_tai_ma: 404,
    }
  }

  const dangQianHang = chaXun.rows[0] as Record<string, unknown>
  // FP-18 回传写后角色（三旗标推导），不再回传 guan_li_yuan 二值：
  // 同时持有 运营/审核员 的账号被回收超管后仍是管理身份，二值旗标会把「降级」读成「已无权限」。
  // 幂等比较用 取管理角色 同一口径（=== true），不做 Boolean 兜底
  const xieHouJiaoSe = 取管理角色({ ...dangQianHang, 管理员: mu_biao_zhuang_tai })
  if ((dangQianHang.管理员 === true) === mu_biao_zhuang_tai) {
    qingChuJiaoSeHuanCun(mu_biao_yong_hu_id)
    return { cheng_gong: true, yi_bian_geng: false, jiao_se: xieHouJiaoSe }
  }

  await 数据库.query(
    `UPDATE "用户" SET "管理员" = $1, "更新时间" = NOW() WHERE "ID" = $2`,
    [mu_biao_zhuang_tai, mu_biao_yong_hu_id],
  )
  qingChuJiaoSeHuanCun(mu_biao_yong_hu_id)
  return { cheng_gong: true, yi_bian_geng: true, jiao_se: xieHouJiaoSe }
}

export async function zhiXingGuanLiYuanZhongZi(): Promise<number> {
  const baiMingDan = peiZhi.shenYongYuan.yunXuLieBiao
  if (baiMingDan.length === 0) {
    debug日志.info('管理员种子引导', '[管理员种子引导] ADMIN_PHONES 为空，跳过')
    return 0
  }

  let tiShengShu = 0
  for (const shouJiHao of baiMingDan) {
    const jieGuo = await 数据库.query(
      `UPDATE "用户" SET "管理员" = TRUE, "更新时间" = NOW()
       WHERE "手机号" = $1 AND "管理员" = FALSE
       RETURNING "ID"`,
      [shouJiHao],
    )
    if (jieGuo.rows.length > 0) {
      qingChuJiaoSeHuanCun(String(jieGuo.rows[0].ID))
      tiShengShu += jieGuo.rows.length
    }
  }
  debug日志.info(
    '管理员种子引导',
    `[管理员种子引导] 白名单共 ${baiMingDan.length} 个手机号，本次提升 ${tiShengShu} 个账号为管理员`,
  )
  return tiShengShu
}

if (peiZhi.shenYongYuan.zhongZiYinDaoKaiGuan && !process.env.VITEST) {
  void zhiXingGuanLiYuanZhongZi().catch((cuoWu) => {
    debug日志.error('管理员种子引导', '[管理员种子引导] 执行失败，请检查数据库后手动处理', {
      xiang_qing: { cuo_wu: String(cuoWu) },
    })
  })
}
