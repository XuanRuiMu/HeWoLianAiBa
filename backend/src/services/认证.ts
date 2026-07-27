import bcrypt from 'bcryptjs'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { shengChengLingPai } from '../utils/jwt'
import { yanZhengMaShiFouZhengQue, shanChuYanZhengMa } from './短信'
import { jiLuShenJiRiZhi } from './审计日志'
import type { YongHuXinXi, DengLuXiangYing } from '../types'

export interface ZhuCeCanShu {
  shou_ji_hao: string
  yan_zheng_ma: string
  yong_hu_ming: string
  mi_ma: string
  tong_yi_xie_yi: boolean
  ip: string
}

export interface DengLuCanShu {
  shou_ji_hao: string
  mi_ma: string
  ip: string
}

export interface GengGaiMiMaCanShu {
  yong_hu_id: string
  shou_ji_hao: string
  jiu_mi_ma: string
  xin_mi_ma: string
  que_ren_xin_mi_ma: string
  yan_zheng_ma: string
  ip: string
}

export interface GengGaiYongHuMingCanShu {
  yong_hu_id: string
  yong_hu_ming: string
  ip: string
}

function yingSheYongHu(row: Record<string, unknown>): YongHuXinXi {
  return {
    id: String(row.ID),
    shou_ji_hao: String(row.手机号),
    yong_hu_ming: row.用户名 ? String(row.用户名) : null,
    ni_cheng: row.昵称 ? String(row.昵称) : null,
    xing_bie: row.性别 ? String(row.性别) : null,
    mu_biao_xing_bie: row.目标性别 ? String(row.目标性别) : null,
    xing_ge_xuan_ze: row.性格选择 ? String(row.性格选择) : null,
    ren_she_biao_qian: row.人设标签 ? String(row.人设标签) : null,
    yun_xu_zha_nan_zha_nv: Boolean(row.渣男渣女变体),
    tou_xiang: row.头像 ? String(row.头像) : null,
    sheng_ri: row.生日 ? String(row.生日) : null,
    qian_ming: row.签名 ? String(row.签名) : null,
    guan_li_yuan: Boolean(row.管理员),
    huo_yue_ren_she_id: row.活跃角色ID ? String(row.活跃角色ID) : null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: row.创建时间 ? String(row.创建时间) : new Date().toISOString(),
    geng_xin_shi_jian: row.更新时间 ? String(row.更新时间) : new Date().toISOString(),
  }
}

function panDuanShiGuanLiYuan(shouJiHao: string): boolean {
  return peiZhi.shenYongYuan.yunXuLieBiao.includes(shouJiHao)
}

export function yanZhengShouJiHaoGeShi(shouJiHao: string): boolean {
  return peiZhi.shouJiHao.zhengZe.test(shouJiHao)
}

export function yanZhengYongHuMingGeShi(yongHuMing: string): {
  he_fa: boolean
  ti_shi: string
} {
  const qingLi = yongHuMing.trim()
  if (
    qingLi.length < peiZhi.yongHuMing.zuiXiao ||
    qingLi.length > peiZhi.yongHuMing.zuiDa
  ) {
    return {
      he_fa: false,
      ti_shi: huoQuFanYi('renZheng', 'yongHuMingChangDuCuoWu'),
    }
  }
  if (peiZhi.yongHuMing.teShuZiFu.test(qingLi)) {
    return {
      he_fa: false,
      ti_shi: huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu'),
    }
  }
  return { he_fa: true, ti_shi: '' }
}

export async function anShouJiHaoChaYongHu(
  shouJiHao: string,
): Promise<YongHuXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "用户" WHERE "手机号" = $1 LIMIT 1`,
    [shouJiHao],
  )
  if (jieGuo.rows.length === 0) return null
  return yingSheYongHu(jieGuo.rows[0])
}

export async function anIdChaYongHu(id: string): Promise<YongHuXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [id],
  )
  if (jieGuo.rows.length === 0) return null
  return yingSheYongHu(jieGuo.rows[0])
}

function huoQuDengLuShiBaiJian(shouJiHao: string): string {
  return `deng_lu_shi_bai:${shouJiHao}`
}

async function jiLuDengLuShiBai(
  shouJiHao: string,
  ip: string,
): Promise<number> {
  const jian = huoQuDengLuShiBaiJian(shouJiHao)
  const dangQian = await redis.incr(jian)
  if (dangQian === 1) {
    await redis.pexpire(jian, peiZhi.xianLiu.dengLu.chuangKou)
  }
  await jiLuShenJiRiZhi({
    ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'dengLuShiBai'),
    xiang_qing: { shou_ji_hao: shouJiHao, ci_shu: dangQian },
    lei_xing: '安全',
  })
  return dangQian
}

async function qingChuDengLuShiBai(shouJiHao: string): Promise<void> {
  await redis.del(huoQuDengLuShiBaiJian(shouJiHao))
}

async function dengLuShiBaiShiFouChaoGuo(
  shouJiHao: string,
): Promise<boolean> {
  const ciShu = await redis.get(huoQuDengLuShiBaiJian(shouJiHao))
  if (!ciShu) return false
  return parseInt(ciShu, 10) >= peiZhi.xianLiu.dengLu.zuiDa
}

export async function zhuCe(
  canShu: ZhuCeCanShu,
): Promise<{ cheng_gong: boolean; shu_ju?: DengLuXiangYing; ti_shi?: string }> {
  if (!yanZhengShouJiHaoGeShi(canShu.shou_ji_hao)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu') }
  }

  const yongHuMingJieGuo = yanZhengYongHuMingGeShi(canShu.yong_hu_ming)
  if (!yongHuMingJieGuo.he_fa) {
    return { cheng_gong: false, ti_shi: yongHuMingJieGuo.ti_shi }
  }

  if (!canShu.mi_ma || canShu.mi_ma.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'miMaKong') }
  }

  if (canShu.tong_yi_xie_yi !== true) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'weiTongYiXieYi') }
  }

  const yiCunZai = await anShouJiHaoChaYongHu(canShu.shou_ji_hao)
  if (yiCunZai) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'shouJiHaoYiZhuCe') }
  }

  const maZhengQue = await yanZhengMaShiFouZhengQue(
    canShu.shou_ji_hao,
    canShu.yan_zheng_ma,
  )
  if (!maZhengQue) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'yanZhengMaCuoWu') }
  }

  const qingLiYongHuMing = canShu.yong_hu_ming.trim()
  const yongHuMingYiCunZai = await 数据库.query(
    `SELECT 1 FROM "用户" WHERE "用户名" = $1 LIMIT 1`,
    [qingLiYongHuMing],
  )
  if (yongHuMingYiCunZai.rows.length > 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'yongHuMingYiCunZai') }
  }

  const miMaHaXi = await bcrypt.hash(canShu.mi_ma, 10)
  const chaRuJieGuo = await 数据库.query(
    `INSERT INTO "用户" ("手机号", "用户名", "密码哈希", "管理员")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      canShu.shou_ji_hao,
      qingLiYongHuMing,
      miMaHaXi,
      panDuanShiGuanLiYuan(canShu.shou_ji_hao),
    ],
  )
  const yongHu = yingSheYongHu(chaRuJieGuo.rows[0])
  await shanChuYanZhengMa(canShu.shou_ji_hao)
  await jiLuShenJiRiZhi({
    yong_hu_id: yongHu.id,
    ip: canShu.ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'zhuCeChengGong'),
    xiang_qing: { shou_ji_hao: canShu.shou_ji_hao },
  })

  const lingPai = shengChengLingPai({
    yongHuId: yongHu.id,
    shouJiHao: yongHu.shou_ji_hao,
  })

  return {
    cheng_gong: true,
    shu_ju: {
      令牌: lingPai,
      用户: yongHu,
      新用户: true,
      是否管理员: yongHu.guan_li_yuan,
    },
  }
}

export async function dengLu(
  canShu: DengLuCanShu,
): Promise<{ cheng_gong: boolean; shu_ju?: DengLuXiangYing; ti_shi?: string; zhuang_tai_ma?: number }> {
  if (!yanZhengShouJiHaoGeShi(canShu.shou_ji_hao)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'), zhuang_tai_ma: 400 }
  }

  if (await dengLuShiBaiShiFouChaoGuo(canShu.shou_ji_hao)) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'dengLuShiBaiPinFan'), zhuang_tai_ma: 429 }
  }

  const yongHu = await anShouJiHaoChaYongHu(canShu.shou_ji_hao)
  if (!yongHu) {
    await jiLuDengLuShiBai(canShu.shou_ji_hao, canShu.ip)
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'shouJiHaoWeiZhuCe'), zhuang_tai_ma: 404 }
  }

  const miMaHaXiJieGuo = await 数据库.query(
    `SELECT "密码哈希" FROM "用户" WHERE "手机号" = $1 LIMIT 1`,
    [canShu.shou_ji_hao],
  )
  const miMaHaXi = miMaHaXiJieGuo.rows[0]?.密码哈希 ? String(miMaHaXiJieGuo.rows[0].密码哈希) : ''
  const miMaZhengQue = await bcrypt.compare(canShu.mi_ma, miMaHaXi)
  if (!miMaZhengQue) {
    const ciShu = await jiLuDengLuShiBai(canShu.shou_ji_hao, canShu.ip)
    const zhuangTaiMa = ciShu >= peiZhi.xianLiu.dengLu.zuiDa ? 429 : 401
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'miMaCuoWu'), zhuang_tai_ma: zhuangTaiMa }
  }

  await qingChuDengLuShiBai(canShu.shou_ji_hao)
  const shiGuanLiYuan = panDuanShiGuanLiYuan(yongHu.shou_ji_hao)
  if (shiGuanLiYuan !== yongHu.guan_li_yuan) {
    await 数据库.query(
      `UPDATE "用户" SET "管理员" = $1 WHERE "ID" = $2`,
      [shiGuanLiYuan, yongHu.id],
    )
    yongHu.guan_li_yuan = shiGuanLiYuan
  }
  await jiLuShenJiRiZhi({
    yong_hu_id: yongHu.id,
    ip: canShu.ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'dengLuChengGong'),
    xiang_qing: { shou_ji_hao: canShu.shou_ji_hao },
  })

  const lingPai = shengChengLingPai({
    yongHuId: yongHu.id,
    shouJiHao: yongHu.shou_ji_hao,
  })

  return {
    cheng_gong: true,
    shu_ju: {
      令牌: lingPai,
      用户: yongHu,
      新用户: false,
      是否管理员: yongHu.guan_li_yuan,
    },
  }
}

export async function gengGaiMiMa(
  canShu: GengGaiMiMaCanShu,
): Promise<{ cheng_gong: boolean; ti_shi?: string }> {
  if (canShu.xin_mi_ma !== canShu.que_ren_xin_mi_ma) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'miMaBuYiZhi') }
  }
  if (!canShu.xin_mi_ma || canShu.xin_mi_ma.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'miMaKong') }
  }

  const maZhengQue = await yanZhengMaShiFouZhengQue(canShu.shou_ji_hao, canShu.yan_zheng_ma)
  if (!maZhengQue) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'yanZhengMaCuoWu') }
  }

  const yongHu = await anIdChaYongHu(canShu.yong_hu_id)
  if (!yongHu) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'dengLuShiBai') }
  }

  const miMaHaXiJieGuo = await 数据库.query(
    `SELECT "密码哈希" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [canShu.yong_hu_id],
  )
  const miMaHaXi = miMaHaXiJieGuo.rows[0]?.密码哈希 ? String(miMaHaXiJieGuo.rows[0].密码哈希) : ''
  const jiuMiMaZhengQue = await bcrypt.compare(canShu.jiu_mi_ma, miMaHaXi)
  if (!jiuMiMaZhengQue) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'miMaCuoWu') }
  }

  const xinMiMaHaXi = await bcrypt.hash(canShu.xin_mi_ma, 10)
  await 数据库.query(
    `UPDATE "用户" SET "密码哈希" = $1, "更新时间" = NOW() WHERE "ID" = $2`,
    [xinMiMaHaXi, canShu.yong_hu_id],
  )
  await shanChuYanZhengMa(canShu.shou_ji_hao)
  await jiLuShenJiRiZhi({
    yong_hu_id: canShu.yong_hu_id,
    ip: canShu.ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'xiuGaiMiMa'),
    xiang_qing: { shou_ji_hao: canShu.shou_ji_hao },
  })

  return { cheng_gong: true, ti_shi: huoQuFanYi('renZheng', 'xiuGaiMiMaChengGong') }
}

export async function gengGaiYongHuMing(
  canShu: GengGaiYongHuMingCanShu,
): Promise<{ cheng_gong: boolean; ti_shi?: string; yong_hu?: YongHuXinXi }> {
  const yongHuMingJieGuo = yanZhengYongHuMingGeShi(canShu.yong_hu_ming)
  if (!yongHuMingJieGuo.he_fa) {
    return { cheng_gong: false, ti_shi: yongHuMingJieGuo.ti_shi }
  }

  const qingLiYongHuMing = canShu.yong_hu_ming.trim()
  const dangQianYongHu = await anIdChaYongHu(canShu.yong_hu_id)
  if (dangQianYongHu && dangQianYongHu.yong_hu_ming === qingLiYongHuMing) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'yongHuMingYiCunZai') }
  }

  const yiCunZai = await 数据库.query(
    `SELECT 1 FROM "用户" WHERE "用户名" = $1 AND "ID" != $2 LIMIT 1`,
    [qingLiYongHuMing, canShu.yong_hu_id],
  )
  if (yiCunZai.rows.length > 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'yongHuMingYiCunZai') }
  }

  const gengXinJieGuo = await 数据库.query(
    `UPDATE "用户" SET "用户名" = $1, "更新时间" = NOW() WHERE "ID" = $2 RETURNING *`,
    [qingLiYongHuMing, canShu.yong_hu_id],
  )
  const yongHu = yingSheYongHu(gengXinJieGuo.rows[0])
  await jiLuShenJiRiZhi({
    yong_hu_id: canShu.yong_hu_id,
    ip: canShu.ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'xiuGaiYongHuMing'),
    xiang_qing: { yong_hu_ming: qingLiYongHuMing },
  })

  return { cheng_gong: true, ti_shi: huoQuFanYi('renZheng', 'xiuGaiYongHuMingChengGong'), yong_hu: yongHu }
}
