import bcrypt from 'bcryptjs'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { shengChengLingPai, xieRuCheXiaoShiJianCuo, shengChengRefreshToken, cunChuRefreshToken, randomUUID, xiaoHaoRefreshToken, jianCeRefreshTokenChongFu, cheXiaoYongHuSuoYouRefreshToken, shanChuRefreshToken } from '../utils/jwt'
import { yanZhengMaShiFouZhengQue, shanChuYanZhengMa } from './短信'
import { jiLuShenJiRiZhi } from './审计日志'
import { yinBiShouJiHao } from '../utils/掩码'
import type { YongHuXinXi, DengLuXiangYing } from '../types'

export interface ZhuCeCanShu {
  shou_ji_hao: string
  yan_zheng_ma: string
  yong_hu_ming: string
  mi_ma: string
  tong_yi_xie_yi: boolean
  chu_sheng_ri_qi: string
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

export function yingSheYongHu(row: Record<string, unknown>): YongHuXinXi {
  return {
    id: String(row.ID),
    shou_ji_hao: yinBiShouJiHao(String(row.手机号)),
    yong_hu_ming: row.用户名 ? String(row.用户名) : null,
    ni_cheng: row.昵称 ? String(row.昵称) : null,
    xing_bie: row.性别 ? String(row.性别) : null,
    mu_biao_xing_bie: row.目标性别 ? String(row.目标性别) : null,
    mo_ren_xing_bie: row.默认性别 ? String(row.默认性别) : null,
    xing_ge_xuan_ze: row.性格选择 ? String(row.性格选择) : null,
    ren_she_biao_qian: row.人设标签 ? String(row.人设标签) : null,
    yun_xu_zha_nan_zha_nv: Boolean(row.渣男渣女变体),
    tou_xiang: row.头像 ? String(row.头像) : null,
    sheng_ri: row.生日 ? String(row.生日) : null,
    qian_ming: row.签名 ? String(row.签名) : null,
    guan_li_yuan: Boolean(row.管理员),
    ce_shi: Boolean(row.测试),
    huo_yue_ren_she_id: row.活跃角色ID ? String(row.活跃角色ID) : null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: row.创建时间 ? String(row.创建时间) : new Date().toISOString(),
    geng_xin_shi_jian: row.更新时间 ? String(row.更新时间) : new Date().toISOString(),
  }
}

export function yanZhengShouJiHaoGeShi(shouJiHao: string): boolean {
  return peiZhi.shouJiHao.zhengZe.test(shouJiHao)
}

/**
 * C5 未成年人保护：按公历日期精确计算周岁年龄。
 * 生日当天即视为满周岁；格式非法（非 YYYY-MM-DD / 不存在的日期）返回 null。
 */
export function jiSuanZhouSuiNianLing(
  chuShengRiQi: string,
  dangQian: Date = new Date(),
): number | null {
  const piPei = /^(\d{4})-(\d{2})-(\d{2})$/.exec(chuShengRiQi.trim())
  if (!piPei) return null
  const nian = Number(piPei[1])
  const yue = Number(piPei[2])
  const ri = Number(piPei[3])
  const shengRiUTC = new Date(Date.UTC(nian, yue - 1, ri))
  if (
    shengRiUTC.getUTCFullYear() !== nian ||
    shengRiUTC.getUTCMonth() !== yue - 1 ||
    shengRiUTC.getUTCDate() !== ri
  ) {
    return null
  }
  let nianLing = dangQian.getFullYear() - nian
  const weiDaoShengRi =
    dangQian.getMonth() + 1 < yue ||
    (dangQian.getMonth() + 1 === yue && dangQian.getDate() < ri)
  if (weiDaoShengRi) nianLing -= 1
  return nianLing
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

  // C5 未成年人保护：出生日期必填且必须年满最低年龄（默认16周岁），硬拦截
  const zhouSui = jiSuanZhouSuiNianLing(canShu.chu_sheng_ri_qi)
  if (zhouSui === null) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'chuShengRiQiGeShiCuoWu') }
  }
  if (zhouSui < peiZhi.zhuCe.zuiXiaoNianLing) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'weiChengNianRenJinZhi') }
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

  const miMaHaXi = await bcrypt.hash(canShu.mi_ma, 12)
  const chaRuJieGuo = await 数据库.query(
    `INSERT INTO "用户" ("手机号", "用户名", "密码哈希", "管理员", "生日")
     VALUES ($1, $2, $3, false, $4)
     RETURNING *`,
    [
      canShu.shou_ji_hao,
      qingLiYongHuMing,
      miMaHaXi,
      canShu.chu_sheng_ri_qi.trim(),
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
    tokenType: 'access',
  })
  const refreshTokenId = randomUUID()
  const refreshToken = shengChengRefreshToken()
  await cunChuRefreshToken(yongHu.id, refreshTokenId, yongHu.shou_ji_hao)

  // C8 协议留痕：记录用户同意协议的版本、时间与 IP
  await 数据库.query(
    `INSERT INTO "协议留痕" ("用户ID", "协议版本", "同意时间戳", "客户端IP")
     VALUES ($1, $2, NOW(), $3)`,
    [yongHu.id, peiZhi.xieYiBanBen, canShu.ip || ''],
  )

  return {
    cheng_gong: true,
    shu_ju: {
      令牌: lingPai,
      刷新令牌: refreshToken,
      刷新令牌ID: refreshTokenId,
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
    // P2-2 防账号枚举：与「密码错误」分支返回同一文案与状态码，并做同量级哈希计算对齐响应时序
    await bcrypt.hash(canShu.mi_ma, 12)
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'zhangHaoHuoMiMaCuoWu'), zhuang_tai_ma: 401 }
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
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'zhangHaoHuoMiMaCuoWu'), zhuang_tai_ma: zhuangTaiMa }
  }

  // C5 bcrypt cost 10→12：登录成功后检测旧哈希 cost，若 < 12 则重哈希并更新数据库
  const costPiPei = /^\$2[aby]\$(\d{2})\$/.exec(miMaHaXi)
  const dangQianCost = costPiPei ? parseInt(costPiPei[1], 10) : 12
  if (dangQianCost < 12) {
    const xinMiMaHaXi = await bcrypt.hash(canShu.mi_ma, 12)
    await 数据库.query(
      `UPDATE "用户" SET "密码哈希" = $1, "更新时间" = NOW() WHERE "手机号" = $2`,
      [xinMiMaHaXi, canShu.shou_ji_hao],
    )
  }

  await qingChuDengLuShiBai(canShu.shou_ji_hao)
  await jiLuShenJiRiZhi({
    yong_hu_id: yongHu.id,
    ip: canShu.ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'dengLuChengGong'),
    xiang_qing: { shou_ji_hao: canShu.shou_ji_hao },
  })

  const lingPai = shengChengLingPai({
    yongHuId: yongHu.id,
    shouJiHao: yongHu.shou_ji_hao,
    tokenType: 'access',
  })
  const refreshTokenId = randomUUID()
  const refreshToken = shengChengRefreshToken()
  await cunChuRefreshToken(yongHu.id, refreshTokenId, yongHu.shou_ji_hao)

  return {
    cheng_gong: true,
    shu_ju: {
      令牌: lingPai,
      刷新令牌: refreshToken,
      刷新令牌ID: refreshTokenId,
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

  const xinMiMaHaXi = await bcrypt.hash(canShu.xin_mi_ma, 12)
  await 数据库.query(
    `UPDATE "用户" SET "密码哈希" = $1, "更新时间" = NOW() WHERE "ID" = $2`,
    [xinMiMaHaXi, canShu.yong_hu_id],
  )
  await xieRuCheXiaoShiJianCuo(canShu.yong_hu_id)
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

/**
 * 设置用户「默认性别」。
 * 该值仅作为普通模式资料向导第一步（用户自身性别）的系统默认预选项，
 * 不覆盖用户已手动选择的结果，也不参与任何角色/对象性别判定。
 * 入参归一化：male/nan/男 → 'male'，female/nv/女 → 'female'。
 */
export async function setMoRenXingBie(
  canShu: { yong_hu_id: string; mo_ren_xing_bie: string },
): Promise<{ cheng_gong: boolean; ti_shi?: string; yong_hu?: YongHuXinXi }> {
  const 原始值 = canShu.mo_ren_xing_bie
  const 归一值: 'male' | 'female' =
    原始值 === 'male' || 原始值 === 'nan' || 原始值 === '男'
      ? 'male'
      : 原始值 === 'female' || 原始值 === 'nv' || 原始值 === '女'
        ? 'female'
        : (null as unknown as 'male' | 'female')

  if (!归一值) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('anQuan', 'shenFenBuHeFa') }
  }

  const gengXinJieGuo = await 数据库.query(
    `UPDATE "用户" SET "默认性别" = $1, "更新时间" = NOW() WHERE "ID" = $2 RETURNING *`,
    [归一值, canShu.yong_hu_id],
  )
  if (gengXinJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai') }
  }
  const yongHu = yingSheYongHu(gengXinJieGuo.rows[0])
  await jiLuShenJiRiZhi({
    yong_hu_id: canShu.yong_hu_id,
    ip: '127.0.0.1',
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'sheZhiMoRenXingBie'),
    xiang_qing: { mo_ren_xing_bie: 归一值 },
  })
  return { cheng_gong: true, ti_shi: huoQuFanYi('tongYong', 'caoZuoChengGong'), yong_hu: yongHu }
}

/**
 * C4：使用 refresh token 刷新 access token
 * - 验证 refresh token 有效性
 * - 复用检测：同一 refresh token 二次使用 → 全家吊销
 * - 成功则生成新 access + 新 refresh，旧 refresh 标记已用
 */
export async function shuaXinLingPai(
  refreshToken: string,
): Promise<{ cheng_gong: boolean; shu_ju?: { 令牌: string; 刷新令牌: string; 刷新令牌ID: string }; ti_shi?: string }> {
  // refresh token 格式：tokenId（我们用的是 tokenId 作为 refresh token 标识）
  // 这里约定：客户端传入的是 refreshTokenId（即 tokenId）
  const tokenId = refreshToken
  if (!tokenId) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'queShaoCanShu') }
  }

  // 从所有用户中查找该 tokenId（为效率，约定 tokenId 包含用户 ID 前缀，或遍历）
  // 这里简化：要求客户端传 userId + tokenId，或从 token 中解析
  // 约定：tokenId 格式为 "userId:uuid"
  const parts = tokenId.split(':')
  if (parts.length !== 2) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'lingPaiWuXiao') }
  }
  const yongHuId = parts[0]
  const tokenIdOnly = parts[1]

  // 复用检测：检查该 token 是否已被消费
  const chongFu = await jianCeRefreshTokenChongFu(tokenIdOnly, yongHuId)
  if (chongFu) {
    // 复用检测触发：全家吊销
    await cheXiaoYongHuSuoYouRefreshToken(yongHuId)
    await xieRuCheXiaoShiJianCuo(yongHuId)
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'lingPaiChongFuBeiDao') }
  }

  // 验证并消费 refresh token
  const xiaoHao = await xiaoHaoRefreshToken(tokenIdOnly, yongHuId)
  if (!xiaoHao.chengGong) {
    return { cheng_gong: false, ti_shi: xiaoHao.cuoWu || huoQuFanYi('renZheng', 'lingPaiWuXiao') }
  }

  // 生成新 access + refresh
  const yongHu = await anIdChaYongHu(yongHuId)
  if (!yongHu) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai') }
  }

  const xinLingPai = shengChengLingPai({
    yongHuId: yongHu.id,
    shouJiHao: yongHu.shou_ji_hao,
    tokenType: 'access',
  })
  const xinRefreshTokenId = randomUUID()
  const xinRefreshToken = shengChengRefreshToken()
  await cunChuRefreshToken(yongHu.id, xinRefreshTokenId, yongHu.shou_ji_hao)

  return {
    cheng_gong: true,
    shu_ju: {
      令牌: xinLingPai,
      刷新令牌: xinRefreshToken,
      刷新令牌ID: `${yongHu.id}:${xinRefreshTokenId}`,
    },
  }
}

/**
 * 吊销 refresh token（登出时调用）
 * - 传 tokenId 吊销单个
 * - 不传则吊销该用户所有
 */
export async function zhuXiaoLingPai(
  yongHuId: string,
  refreshTokenId?: string,
): Promise<{ cheng_gong: boolean; ti_shi?: string }> {
  if (refreshTokenId) {
    const parts = refreshTokenId.split(':')
    const tokenIdOnly = parts.length === 2 ? parts[1] : refreshTokenId
    await shanChuRefreshToken(tokenIdOnly, yongHuId)
  } else {
    await cheXiaoYongHuSuoYouRefreshToken(yongHuId)
  }
  await xieRuCheXiaoShiJianCuo(yongHuId)
  return { cheng_gong: true, ti_shi: huoQuFanYi('tongYong', 'caoZuoChengGong') }
}
