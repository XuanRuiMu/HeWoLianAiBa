import bcrypt from 'bcryptjs'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { CUO_WU_DAI_MA, type CuoWuDaiMa } from '../config/错误码注册表'
import { shengChengLingPai, xieRuCheXiaoShiJianCuo, cunChuRefreshToken, randomUUID, xiaoHaoRefreshToken, jianCeRefreshTokenChongFu, cheXiaoYongHuSuoYouRefreshToken, shanChuRefreshToken } from '../utils/jwt'
import { yanZhengMaShiFouZhengQue, shanChuYanZhengMa, YAN_ZHENG_MA_YONG_TU, type 验证码校验结果 } from './短信'
import { zhongXinQianMingMeiTiURL } from './媒体存储'
import { jiLuShenJiRiZhi } from './审计日志'
import { yinBiShouJiHao } from '../utils/掩码'
import { guiYiWeiGuoJiHao, jieXiShouJiHao, shiFouDaLuHao } from '../utils/手机号'
import { 内部转展示, 内部转用户形态, 解析性别 } from '../utils/性别'
import { 取管理角色, 取角色能力, type GuanLiJiaoSe, type GuanLiNengLi } from '../utils/角色能力'
import { 包装依赖调用 } from '../utils/依赖错误'
import type { 登录失败原因 } from './登录失败'
import type { YongHuXinXi, DengLuXiangYing } from '../types'

export interface ZhuCeCanShu {
  shou_ji_hao: string
  yan_zheng_ma: string
  yong_hu_ming: string
  mi_ma: string
  tong_yi_xie_yi: boolean
  chu_sheng_ri_qi: string
  ip: string
  jing_wai?: boolean
}

export interface DengLuCanShu {
  shou_ji_hao: string
  mi_ma: string
  ip: string
}

export interface GengGaiMiMaCanShu {
  yong_hu_id: string
  shou_ji_hao?: string
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
  const yongHuId = String(row.ID)
  const jiaoSe: GuanLiJiaoSe | null = 取管理角色(row)
  const nengLi: GuanLiNengLi[] = [...取角色能力(jiaoSe)]
  return {
    id: String(row.ID),
    shou_ji_hao: yinBiShouJiHao(String(row.手机号)),
    yong_hu_ming: row.用户名 ? String(row.用户名) : null,
    ni_cheng: row.昵称 ? String(row.昵称) : null,
    mu_biao_xing_bie: row.目标性别 ? String(row.目标性别) : null,
    mo_ren_xing_bie: row.默认性别 ? String(row.默认性别) : null,
    xing_ge_xuan_ze: row.性格选择 ? String(row.性格选择) : null,
    ren_she_biao_qian: row.人设标签 ? String(row.人设标签) : null,
    yun_xu_zha_nan_zha_nv: Boolean(row.渣男渣女变体),
    tou_xiang: row.头像 ? zhongXinQianMingMeiTiURL(String(row.头像), yongHuId) : null,
    sheng_ri: row.生日 ? String(row.生日) : null,
    qian_ming: row.签名 ? String(row.签名) : null,
    jiao_se: jiaoSe,
    neng_li: nengLi,
    ce_shi: Boolean(row.测试),
    huo_yue_ren_she_id: row.活跃角色ID ? String(row.活跃角色ID) : null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: row.创建时间 ? String(row.创建时间) : new Date().toISOString(),
    geng_xin_shi_jian: row.更新时间 ? String(row.更新时间) : new Date().toISOString(),
  }
}

export function yanZhengShouJiHaoGeShi(shouJiHao: string): boolean {
  if (!peiZhi.shouJiHao.zhengZe.test(shouJiHao)) return false
  return jieXiShouJiHao(shouJiHao).heFa
}

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
  if (!peiZhi.yongHuMing.baiMingDan.test(qingLi)) {
    return {
      he_fa: false,
      ti_shi: huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu'),
    }
  }
  return { he_fa: true, ti_shi: '' }
}

export function yanZhengMiMaFuZaDu(miMa: string): {
  he_fa: boolean
  ti_shi: string
} {
  if (!miMa || miMa.length < peiZhi.miMa.zuiXiaoChangDu) {
    return { he_fa: false, ti_shi: huoQuFanYi('renZheng', 'miMaFuZaDuBuZu') }
  }
  const RuoKouLingHeiMingDan = new Set(['12345678', 'password', 'qwertyui', '11111111', '00000000', 'admin123', '123123123', 'abc12345'])
  if (RuoKouLingHeiMingDan.has(miMa.toLowerCase())) {
    return { he_fa: false, ti_shi: huoQuFanYi('renZheng', 'miMaFuZaDuBuZu') }
  }
  if (/^(.)\1+$/.test(miMa) || /^[0-9]+$/.test(miMa) || /^[A-Za-z]+$/.test(miMa)) {
    return { he_fa: false, ti_shi: huoQuFanYi('renZheng', 'miMaFuZaDuBuZu') }
  }
  if (peiZhi.miMa.biXuHanZiMuHeShuZi) {
    const hanZiMu = /[A-Za-z]/.test(miMa)
    const hanShuZi = /[0-9]/.test(miMa)
    if (!hanZiMu || !hanShuZi) {
      return { he_fa: false, ti_shi: huoQuFanYi('renZheng', 'miMaFuZaDuBuZu') }
    }
  }
  return { he_fa: true, ti_shi: '' }
}

export async function anShouJiHaoChaYongHu(
  shouJiHao: string,
): Promise<YongHuXinXi | null> {
  const guoJiHao = guiYiWeiGuoJiHao(shouJiHao)
  const jieGuo = await 数据库.query(
    `SELECT * FROM "用户" WHERE "手机号" IN ($1, $2) LIMIT 1`,
    [guoJiHao, shouJiHao],
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
  const dangQian = await 包装依赖调用('redis', () => redis.incr(jian))
  if (dangQian === 1) {
    await 包装依赖调用('redis', () => redis.pexpire(jian, peiZhi.xianLiu.dengLu.chuangKou))
  }
  await 包装依赖调用('postgres', () =>
    jiLuShenJiRiZhi({
      ip,
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'dengLuShiBai'),
      xiang_qing: { shou_ji_hao: yinBiShouJiHao(shouJiHao), ci_shu: dangQian },
      lei_xing: '安全',
    }),
  )
  return dangQian
}

async function qingChuDengLuShiBai(shouJiHao: string): Promise<void> {
  await 包装依赖调用('redis', () => redis.del(huoQuDengLuShiBaiJian(shouJiHao)))
}

async function dengLuShiBaiShiFouChaoGuo(
  shouJiHao: string,
): Promise<boolean> {
  const ciShu = await 包装依赖调用('redis', () => redis.get(huoQuDengLuShiBaiJian(shouJiHao)))
  if (!ciShu) return false
  return parseInt(ciShu, 10) >= peiZhi.xianLiu.dengLu.zuiDa
}

export function 注册失败错误码(cuoWuMa: ZhuCeCuoWuMa, yuanYin?: CuoWuYuanYin): CuoWuDaiMa {
  if (cuoWuMa === 'YONG_HU_MING_CHONG_FU') return CUO_WU_DAI_MA.AUTH_USERNAME_TAKEN
  if (cuoWuMa === 'CHONG_TU') return CUO_WU_DAI_MA.AUTH_ACCOUNT_ALREADY_EXISTS
  if (cuoWuMa === 'XIAN_LIU') return CUO_WU_DAI_MA.AUTH_REGISTRATION_CLOSED
  if (cuoWuMa === 'NEI_BU_CUO_WU') return CUO_WU_DAI_MA.AUTH_REGISTRATION_FAILED
  if (yuanYin === 'YONG_HU_MING_BU_HE_FA') return CUO_WU_DAI_MA.AUTH_USERNAME_INVALID
  if (yuanYin === 'YAN_ZHENG_MA_CUO_WU') return CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_INVALID
  if (yuanYin === 'YAN_ZHENG_MA_GUO_QI') return CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_EXPIRED
  if (yuanYin === 'YAN_ZHENG_MA_CHANG_SHI_GUO_DUO') return CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED
  if (yuanYin === 'SHOU_JI_HAO_DI_QU_BU_FU') return CUO_WU_DAI_MA.AUTH_PHONE_NOT_ACCEPTED
  if (yuanYin === 'MI_MA_FU_ZA_DU_BU_ZU') return CUO_WU_DAI_MA.AUTH_PASSWORD_WEAK
  if (yuanYin === 'CHU_SHENG_RI_QI_BU_HE_FA') return CUO_WU_DAI_MA.AUTH_BIRTH_DATE_INVALID
  if (yuanYin === 'WEI_TONG_YI_XIE_YI') return CUO_WU_DAI_MA.AUTH_AGREEMENT_REQUIRED
  return CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID
}

export function yanZhengMaShiBaiJieGuo(
  结果: Exclude<验证码校验结果, '通过'>,
): { cheng_gong: false; cuo_wu_ma: ZhuCeCuoWuMa; ti_shi: string; juTiYuanYin: CuoWuYuanYin } {
  if (结果 === '尝试超限') {
    return {
      cheng_gong: false,
      cuo_wu_ma: 'CAN_SHU_CUO_WU',
      ti_shi: huoQuFanYi('renZheng', 'yanZhengMaChangShiGuoDuo'),
      juTiYuanYin: 'YAN_ZHENG_MA_CHANG_SHI_GUO_DUO',
    }
  }
  if (结果 === '已过期') {
    return {
      cheng_gong: false,
      cuo_wu_ma: 'CAN_SHU_CUO_WU',
      ti_shi: huoQuFanYi('renZheng', 'yanZhengMaGuoQi'),
      juTiYuanYin: 'YAN_ZHENG_MA_GUO_QI',
    }
  }
  return {
    cheng_gong: false,
    cuo_wu_ma: 'CAN_SHU_CUO_WU',
    ti_shi: huoQuFanYi('renZheng', 'yanZhengMaCuoWu'),
    juTiYuanYin: 'YAN_ZHENG_MA_CUO_WU',
  }
}

export type CuoWuYuanYin =
  | 'SHOU_JI_HAO_DI_QU_BU_FU'
  | 'YONG_HU_MING_BU_HE_FA'
  | 'MI_MA_FU_ZA_DU_BU_ZU'
  | 'WEI_TONG_YI_XIE_YI'
  | 'CHU_SHENG_RI_QI_BU_HE_FA'
  | 'YAN_ZHENG_MA_CUO_WU'
  | 'YAN_ZHENG_MA_GUO_QI'
  | 'YAN_ZHENG_MA_CHANG_SHI_GUO_DUO'

export type ZhuCeCuoWuMa =
  | 'CAN_SHU_CUO_WU'
  | 'CHONG_TU'
  | 'YONG_HU_MING_CHONG_FU'
  | 'XIAN_LIU'
  | 'NEI_BU_CUO_WU'

type ZhuCeJieGuo =
  | { cheng_gong: true; shu_ju: DengLuXiangYing }
  | { cheng_gong: false; cuo_wu_ma: ZhuCeCuoWuMa; ti_shi: string; juTiYuanYin?: CuoWuYuanYin }

export async function zhuCe(canShu: ZhuCeCanShu): Promise<ZhuCeJieGuo> {
  if (!yanZhengShouJiHaoGeShi(canShu.shou_ji_hao)) {
    return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'), juTiYuanYin: 'SHOU_JI_HAO_DI_QU_BU_FU' }
  }

  const yongHuMingJieGuo = yanZhengYongHuMingGeShi(canShu.yong_hu_ming)
  if (!yongHuMingJieGuo.he_fa) {
    return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: yongHuMingJieGuo.ti_shi, juTiYuanYin: 'YONG_HU_MING_BU_HE_FA' }
  }

  if (!canShu.mi_ma || canShu.mi_ma.length === 0) {
    return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'miMaKong'), juTiYuanYin: 'MI_MA_FU_ZA_DU_BU_ZU' }
  }

  const miMaFuZaDu = yanZhengMiMaFuZaDu(canShu.mi_ma)
  if (!miMaFuZaDu.he_fa) {
    return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: miMaFuZaDu.ti_shi, juTiYuanYin: 'MI_MA_FU_ZA_DU_BU_ZU' }
  }

  if (canShu.tong_yi_xie_yi !== true) {
    return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'weiTongYiXieYi'), juTiYuanYin: 'WEI_TONG_YI_XIE_YI' }
  }

  const zhouSui = jiSuanZhouSuiNianLing(canShu.chu_sheng_ri_qi)
  if (zhouSui === null) {
    return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'chuShengRiQiGeShiCuoWu'), juTiYuanYin: 'CHU_SHENG_RI_QI_BU_HE_FA' }
  }
  if (zhouSui < 14 || zhouSui < peiZhi.zhuCe.zuiXiaoNianLing) {
    return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'weiChengNianRenJinZhi'), juTiYuanYin: 'CHU_SHENG_RI_QI_BU_HE_FA' }
  }

  const zongShuJieGuo = await 数据库.query(`SELECT COUNT(*) AS "总数" FROM "用户"`)
  if (Number(zongShuJieGuo.rows[0]?.总数 || 0) >= peiZhi.tiYanBan.zuiDaYongHuShu) {
    return { cheng_gong: false, cuo_wu_ma: 'XIAN_LIU', ti_shi: huoQuFanYi('renZheng', 'tiYanBanManYuan') }
  }

  const guoJiHao = guiYiWeiGuoJiHao(canShu.shou_ji_hao)
  const yiCunZai = await anShouJiHaoChaYongHu(guoJiHao)
  if (yiCunZai) {
    return { cheng_gong: false, cuo_wu_ma: 'CHONG_TU', ti_shi: huoQuFanYi('renZheng', 'shouJiHaoYiZhuCe') }
  }

  if (canShu.jing_wai === true) {
    if (shiFouDaLuHao(guoJiHao)) {
      return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'feiDaLuZhuCeBuShouDaLuHao'), juTiYuanYin: 'SHOU_JI_HAO_DI_QU_BU_FU' }
    }
  } else {
    if (!shiFouDaLuHao(guoJiHao)) {
      return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'zhiJieShouDaLuHao'), juTiYuanYin: 'SHOU_JI_HAO_DI_QU_BU_FU' }
    }
    const maJiaoYan = await yanZhengMaShiFouZhengQue(
      guoJiHao,
      canShu.yan_zheng_ma,
    )
    if (maJiaoYan !== '通过') {
      return yanZhengMaShiBaiJieGuo(maJiaoYan)
    }
  }

  const qingLiYongHuMing = canShu.yong_hu_ming.trim()
  const yongHuMingYiCunZai = await 数据库.query(
    `SELECT 1 FROM "用户" WHERE "用户名" = $1 LIMIT 1`,
    [qingLiYongHuMing],
  )
  if (yongHuMingYiCunZai.rows.length > 0) {
    return { cheng_gong: false, cuo_wu_ma: 'YONG_HU_MING_CHONG_FU', ti_shi: huoQuFanYi('renZheng', 'yongHuMingYiCunZai') }
  }

  const miMaHaXi = await bcrypt.hash(canShu.mi_ma, 12)
  let chaRuJieGuo
  try {
    chaRuJieGuo = await 数据库.query(
      `INSERT INTO "用户" ("手机号", "用户名", "密码哈希", "管理员", "生日")
       VALUES ($1, $2, $3, false, $4)
       RETURNING *`,
      [
        guoJiHao,
        qingLiYongHuMing,
        miMaHaXi,
        canShu.chu_sheng_ri_qi.trim(),
      ],
    )
  } catch (cuoWu) {
    const pgCuoWu = cuoWu as { code?: string; constraint?: string; detail?: string }
    if (pgCuoWu.code === '23505') {
      const mingCheng = `${pgCuoWu.constraint ?? ''} ${pgCuoWu.detail ?? ''}`
      if (mingCheng.includes('用户名')) {
        return { cheng_gong: false, cuo_wu_ma: 'YONG_HU_MING_CHONG_FU', ti_shi: huoQuFanYi('renZheng', 'yongHuMingYiCunZai') }
      }
      return { cheng_gong: false, cuo_wu_ma: 'CHONG_TU', ti_shi: huoQuFanYi('renZheng', 'shouJiHaoYiZhuCe') }
    }
    throw cuoWu
  }
  const yongHu = yingSheYongHu(chaRuJieGuo.rows[0])
  await shanChuYanZhengMa(guoJiHao)
  await jiLuShenJiRiZhi({
    yong_hu_id: yongHu.id,
    ip: canShu.ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'zhuCeChengGong'),
    xiang_qing: { shou_ji_hao: yinBiShouJiHao(guoJiHao) },
  })

  const lingPai = shengChengLingPai({
    yongHuId: yongHu.id,
    tokenType: 'access',
  })
  const refreshTokenId = randomUUID()
  await cunChuRefreshToken(yongHu.id, refreshTokenId)
  const fuHeShuaXinLingPai = `${yongHu.id}:${refreshTokenId}`

  try {
    await 数据库.query(
      `INSERT INTO "协议留痕" ("用户ID", "协议版本", "同意时间戳", "客户端IP")
       VALUES ($1, $2, NOW(), $3)`,
      [yongHu.id, peiZhi.xieYiBanBen, canShu.ip || ''],
    )
  } catch (cuoWu) {
    const { debug日志: riZhi } = await import('../utils/debug日志')
    riZhi.error('认证服务', '协议留痕落库失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }

  return {
    cheng_gong: true,
    shu_ju: {
      令牌: lingPai,
      刷新令牌: fuHeShuaXinLingPai,
      刷新令牌ID: fuHeShuaXinLingPai,
      用户: yongHu,
      新用户: true,
    },
  }
}

export async function dengLu(
  canShu: DengLuCanShu,
): Promise<
  | { cheng_gong: true; shu_ju: DengLuXiangYing }
  | { cheng_gong: false; cuo_wu_ma: 登录失败原因; ti_shi: string }
> {
  if (!yanZhengShouJiHaoGeShi(canShu.shou_ji_hao)) {
    return { cheng_gong: false, cuo_wu_ma: '参数错误', ti_shi: huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu') }
  }

  const guoJiHao = guiYiWeiGuoJiHao(canShu.shou_ji_hao)
  if (await dengLuShiBaiShiFouChaoGuo(guoJiHao)) {
    return { cheng_gong: false, cuo_wu_ma: '尝试过频', ti_shi: huoQuFanYi('renZheng', 'dengLuShiBaiPinFan') }
  }

  const yongHu = await 包装依赖调用('postgres', () => anShouJiHaoChaYongHu(guoJiHao))
  if (!yongHu) {
    await jiLuDengLuShiBai(guoJiHao, canShu.ip)
    await bcrypt.hash(canShu.mi_ma, 12)
    return { cheng_gong: false, cuo_wu_ma: '凭据错误', ti_shi: huoQuFanYi('renZheng', 'zhangHaoHuoMiMaCuoWu') }
  }

  const miMaHaXiJieGuo = await 包装依赖调用('postgres', () =>
    数据库.query(`SELECT "密码哈希" FROM "用户" WHERE "手机号" IN ($1, $2) LIMIT 1`, [
      guoJiHao,
      canShu.shou_ji_hao,
    ]),
  )
  const miMaHaXi = miMaHaXiJieGuo.rows[0]?.密码哈希 ? String(miMaHaXiJieGuo.rows[0].密码哈希) : ''
  const miMaZhengQue = await bcrypt.compare(canShu.mi_ma, miMaHaXi)
  if (!miMaZhengQue) {
    const ciShu = await jiLuDengLuShiBai(guoJiHao, canShu.ip)
    if (ciShu >= peiZhi.xianLiu.dengLu.zuiDa) {
      return { cheng_gong: false, cuo_wu_ma: '尝试过频', ti_shi: huoQuFanYi('renZheng', 'dengLuShiBaiPinFan') }
    }
    return { cheng_gong: false, cuo_wu_ma: '凭据错误', ti_shi: huoQuFanYi('renZheng', 'zhangHaoHuoMiMaCuoWu') }
  }

  const costPiPei = /^\$2[aby]\$(\d{2})\$/.exec(miMaHaXi)
  const dangQianCost = costPiPei ? parseInt(costPiPei[1], 10) : 12
  if (dangQianCost < 12) {
    const xinMiMaHaXi = await bcrypt.hash(canShu.mi_ma, 12)
    await 包装依赖调用('postgres', () =>
      数据库.query(`UPDATE "用户" SET "密码哈希" = $1, "更新时间" = NOW() WHERE "手机号" = $2`, [
        xinMiMaHaXi,
        guoJiHao,
      ]),
    )
  }

  await 包装依赖调用('redis', () => qingChuDengLuShiBai(guoJiHao))
  await 包装依赖调用('postgres', () =>
    jiLuShenJiRiZhi({
      yong_hu_id: yongHu.id,
      ip: canShu.ip,
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'dengLuChengGong'),
      xiang_qing: { shou_ji_hao: yinBiShouJiHao(guoJiHao) },
    }),
  )

  const lingPai = shengChengLingPai({
    yongHuId: yongHu.id,
    tokenType: 'access',
  })
  const refreshTokenId = randomUUID()
  await 包装依赖调用('redis', () => cunChuRefreshToken(yongHu.id, refreshTokenId))
  const fuHeShuaXinLingPai = `${yongHu.id}:${refreshTokenId}`

  return {
    cheng_gong: true,
    shu_ju: {
      令牌: lingPai,
      刷新令牌: fuHeShuaXinLingPai,
      刷新令牌ID: fuHeShuaXinLingPai,
      用户: yongHu,
      新用户: false,
    },
  }
}

export interface ChongZhiMiMaCanShu {
  shou_ji_hao: string
  yan_zheng_ma: string
  xin_mi_ma: string
  que_ren_xin_mi_ma: string
  ip: string
}


export async function chongZhiMiMa(
  canShu: ChongZhiMiMaCanShu,
): Promise<{ cheng_gong: boolean; ti_shi?: string; tongYiHuiFu?: boolean }> {
  const tongYiTiShi = huoQuFanYi('renZheng', 'chongZhiMiMaTongYiTiShi')

  if (!canShu.xin_mi_ma || canShu.xin_mi_ma.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'miMaKong') }
  }
  if (canShu.xin_mi_ma !== canShu.que_ren_xin_mi_ma) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'miMaBuYiZhi') }
  }
  const fuZaDu = yanZhengMiMaFuZaDu(canShu.xin_mi_ma)
  if (!fuZaDu.he_fa) {
    return { cheng_gong: false, ti_shi: fuZaDu.ti_shi }
  }

  const guoJiHao = guiYiWeiGuoJiHao(canShu.shou_ji_hao)
  const yongHu = await anShouJiHaoChaYongHu(guoJiHao)
  const maJiaoYan = await yanZhengMaShiFouZhengQue(
    guoJiHao,
    canShu.yan_zheng_ma,
    YAN_ZHENG_MA_YONG_TU.chongZhiMiMa,
  )
  if (!yongHu) {
    return { cheng_gong: false, ti_shi: tongYiTiShi }
  }
  if (maJiaoYan !== '通过') {
    return { cheng_gong: false, ti_shi: yanZhengMaShiBaiJieGuo(maJiaoYan).ti_shi }
  }

  const xinMiMaHaXi = await bcrypt.hash(canShu.xin_mi_ma, 12)
  await 数据库.query(
    `UPDATE "用户" SET "密码哈希" = $1, "更新时间" = NOW() WHERE "手机号" IN ($2, $3)`,
    [xinMiMaHaXi, guoJiHao, canShu.shou_ji_hao],
  )
  await cheXiaoYongHuSuoYouRefreshToken(yongHu.id)
  await xieRuCheXiaoShiJianCuo(yongHu.id)
  await shanChuYanZhengMa(guoJiHao, YAN_ZHENG_MA_YONG_TU.chongZhiMiMa)
  await jiLuShenJiRiZhi({
    yong_hu_id: yongHu.id,
    ip: canShu.ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'chongZhiMiMa'),
    xiang_qing: { shou_ji_hao: yinBiShouJiHao(guoJiHao) },
  })

  return { cheng_gong: true, ti_shi: huoQuFanYi('renZheng', 'chongZhiMiMaChengGong') }
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
  const xinMiMaFuZaDu = yanZhengMiMaFuZaDu(canShu.xin_mi_ma)
  if (!xinMiMaFuZaDu.he_fa) {
    return { cheng_gong: false, ti_shi: xinMiMaFuZaDu.ti_shi }
  }

  const yongHuHang = await 数据库.query(
    `SELECT "手机号" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [canShu.yong_hu_id],
  )
  if (yongHuHang.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'dengLuShiBai') }
  }
  const shiJiShouJiHao = String(yongHuHang.rows[0].手机号)

  const maJiaoYan = await yanZhengMaShiFouZhengQue(
    shiJiShouJiHao,
    canShu.yan_zheng_ma,
    YAN_ZHENG_MA_YONG_TU.chongZhiMiMa,
  )
  if (maJiaoYan !== '通过') {
    return { cheng_gong: false, ti_shi: yanZhengMaShiBaiJieGuo(maJiaoYan).ti_shi }
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
  await cheXiaoYongHuSuoYouRefreshToken(canShu.yong_hu_id)
  await xieRuCheXiaoShiJianCuo(canShu.yong_hu_id)
  await shanChuYanZhengMa(shiJiShouJiHao)
  await jiLuShenJiRiZhi({
    yong_hu_id: canShu.yong_hu_id,
    ip: canShu.ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'xiuGaiMiMa'),
    xiang_qing: { shou_ji_hao: yinBiShouJiHao(shiJiShouJiHao) },
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

export async function setMoRenXingBie(
  canShu: { yong_hu_id: string; mo_ren_xing_bie: string },
): Promise<{ cheng_gong: boolean; ti_shi?: string; yong_hu?: YongHuXinXi }> {
  const 归一值 = 内部转用户形态(解析性别(canShu.mo_ren_xing_bie))

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

export async function setMoRenDuiXiangXingBie(
  canShu: { yong_hu_id: string; mo_ren_dui_xiang_xing_bie: string },
): Promise<{ cheng_gong: boolean; ti_shi?: string; yong_hu?: YongHuXinXi }> {
  const 内部 = 解析性别(canShu.mo_ren_dui_xiang_xing_bie)
  if (!内部) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('anQuan', 'shenFenBuHeFa') }
  }
  const gengXinJieGuo = await 数据库.query(
    `UPDATE "用户" SET "目标性别" = $1, "更新时间" = NOW() WHERE "ID" = $2 RETURNING *`,
    [内部转展示(内部), canShu.yong_hu_id],
  )
  if (gengXinJieGuo.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai') }
  }
  const yongHu = yingSheYongHu(gengXinJieGuo.rows[0])
  await jiLuShenJiRiZhi({
    yong_hu_id: canShu.yong_hu_id,
    ip: '127.0.0.1',
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'sheZhiMoRenXingBie'),
    xiang_qing: { mu_biao_xing_bie: 内部 },
  })
  return { cheng_gong: true, ti_shi: huoQuFanYi('tongYong', 'caoZuoChengGong'), yong_hu: yongHu }
}

export async function shuaXinLingPai(
  refreshToken: string,
): Promise<{ cheng_gong: boolean; shu_ju?: { 令牌: string; 刷新令牌: string; 刷新令牌ID: string }; ti_shi?: string }> {
  const tokenId = refreshToken
  if (!tokenId) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'queShaoCanShu') }
  }

  const parts = tokenId.split(':')
  if (parts.length !== 2) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'lingPaiWuXiao') }
  }
  const yongHuId = parts[0]
  const tokenIdOnly = parts[1]

  const feiXingJian = `shuaxin_feixing:${yongHuId}:${tokenIdOnly}`
  const qiangZhan = await redis.set(feiXingJian, '1', 'EX', 15, 'NX')
  if (!qiangZhan) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'dengLuShiBaiPinFan') }
  }
  try {
    const chongFu = await jianCeRefreshTokenChongFu(tokenIdOnly, yongHuId)
    if (chongFu) {
      await cheXiaoYongHuSuoYouRefreshToken(yongHuId)
      await xieRuCheXiaoShiJianCuo(yongHuId)
      return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'lingPaiChongFuBeiDao') }
    }

    const xiaoHao = await xiaoHaoRefreshToken(tokenIdOnly, yongHuId)
    if (!xiaoHao.chengGong) {
      return { cheng_gong: false, ti_shi: xiaoHao.cuoWu || huoQuFanYi('renZheng', 'lingPaiWuXiao') }
    }

    const yongHu = await anIdChaYongHu(yongHuId)
    if (!yongHu) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai') }
    }

    const xinLingPai = shengChengLingPai({
      yongHuId: yongHu.id,
      tokenType: 'access',
    })
    const xinRefreshTokenId = randomUUID()
    await cunChuRefreshToken(yongHu.id, xinRefreshTokenId)
    const xinFuHeShuaXinLingPai = `${yongHu.id}:${xinRefreshTokenId}`

    return {
      cheng_gong: true,
      shu_ju: {
        令牌: xinLingPai,
        刷新令牌: xinFuHeShuaXinLingPai,
        刷新令牌ID: xinFuHeShuaXinLingPai,
      },
    }
  } finally {
    await redis.del(`shuaxin_feixing:${yongHuId}:${tokenIdOnly}`).catch(() => undefined)
  }
}

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
