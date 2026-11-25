import bcrypt from 'bcryptjs'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import {CuoWuDaiMa} from '../config/错误码注册表'
import { shengChengLingPai, xieRuCheXiaoShiJianCuo, cunChuRefreshToken, randomUUID, xiaoHaoRefreshToken, jianCeRefreshTokenChongFu, cheXiaoYongHuSuoYouRefreshToken, shanChuRefreshToken } from '../utils/jwt'
import { yanZhengMaShiFouZhengQue, shanChuYanZhengMa, YanZhengMaYongTu, type 验证码校验结果 } from './短信'
import { zhongXinQianMingMeiTiURL } from './媒体存储'
import { jiLuShenJiRiZhi } from './审计日志'
import { yinBiShouJiHao } from '../utils/掩码'
import { guiYiWeiGuoJiHao, jieXiShouJiHao, shiFouDaLuHao } from '../utils/手机号'
import { shiQuYouXiao } from '../config/语言与时区'
import { 内部转展示, 内部转用户形态, 解析性别 } from '../utils/性别'
import { 取管理角色, 取角色能力, type 管理角色, type 管理能力 } from '../utils/角色能力'
import { 包装依赖调用 } from '../utils/依赖错误'
import type { 登录失败原因 } from './登录失败'
import type { YongHuXinXi, DengLuXiangYing } from '../types'

export interface 注册参数 {
  shou_ji_hao: string
  yan_zheng_ma: string
  yong_hu_ming: string
  mi_ma: string
  tong_yi_xie_yi: boolean
  chu_sheng_ri_qi: string
  ip: string
  jing_wai?: boolean
  shi_qu?: string
}

export interface 登录参数 {
  shou_ji_hao: string
  mi_ma: string
  ip: string
}

export interface 改密参数 {
  yong_hu_id: string
  shou_ji_hao?: string
  jiu_mi_ma: string
  xin_mi_ma: string
  que_ren_xin_mi_ma: string
  yan_zheng_ma: string
  ip: string
}

export interface 改用户名参数 {
  yong_hu_id: string
  yong_hu_ming: string
  ip: string
}

export function 映射用户(row: Record<string, unknown>): YongHuXinXi {
  const 用户ID = String(row.ID)
  const jiaoSe: 管理角色 | null = 取管理角色(row)
  const nengLi: 管理能力[] = [...取角色能力(jiaoSe)]
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
    tou_xiang: row.头像 ? zhongXinQianMingMeiTiURL(String(row.头像), 用户ID) : null,
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

export function 校验手机号格式(shouJiHao: string): boolean {
  const guoJiHao = guiYiWeiGuoJiHao(shouJiHao)
  if (!peiZhi.shouJiHao.zhengZe.test(guoJiHao)) return false
  return jieXiShouJiHao(guoJiHao).heFa
}

export function 计算周岁年龄(
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

export function 校验用户名格式(yongHuMing: string): {
  he_fa: boolean
  ti_shi: string
} {
  const qingLi = yongHuMing.trim()
  if (!peiZhi.yongHuMing.白名单.test(qingLi)) {
    return {
      he_fa: false,
      ti_shi: huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu'),
    }
  }
  return { he_fa: true, ti_shi: '' }
}

export function 校验密码复杂度(miMa: string): {
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

export async function 按手机号查用户(
  shouJiHao: string,
): Promise<YongHuXinXi | null> {
  const guoJiHao = guiYiWeiGuoJiHao(shouJiHao)
  const jieGuo = await 数据库.query(
    `SELECT * FROM "用户" WHERE "手机号" IN ($1, $2) LIMIT 1`,
    [guoJiHao, shouJiHao],
  )
  if (jieGuo.rows.length === 0) return null
  return 映射用户(jieGuo.rows[0])
}

export async function 按ID查用户(id: string): Promise<YongHuXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [id],
  )
  if (jieGuo.rows.length === 0) return null
  return 映射用户(jieGuo.rows[0])
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

export function 注册失败错误码(cuoWuMa: 注册错误码, yuanYin?: 错误原因): CuoWuDaiMa {
  if (cuoWuMa === 'YONG_HU_MING_CHONG_FU') return CuoWuDaiMa.AUTH_USERNAME_TAKEN
  if (cuoWuMa === 'CHONG_TU') return CuoWuDaiMa.AUTH_ACCOUNT_ALREADY_EXISTS
  if (cuoWuMa === 'XIAN_LIU') return CuoWuDaiMa.AUTH_REGISTRATION_CLOSED
  if (cuoWuMa === 'NEI_BU_CUO_WU') return CuoWuDaiMa.AUTH_REGISTRATION_FAILED
  if (yuanYin === 'YONG_HU_MING_BU_HE_FA') return CuoWuDaiMa.AUTH_USERNAME_INVALID
  if (yuanYin === 'YAN_ZHENG_MA_CUO_WU') return CuoWuDaiMa.AUTH_VERIFICATION_CODE_INVALID
  if (yuanYin === 'YAN_ZHENG_MA_GUO_QI') return CuoWuDaiMa.AUTH_VERIFICATION_CODE_EXPIRED
  if (yuanYin === 'YAN_ZHENG_MA_CHANG_SHI_GUO_DUO') return CuoWuDaiMa.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED
  if (yuanYin === 'SHOU_JI_HAO_DI_QU_BU_FU') return CuoWuDaiMa.AUTH_PHONE_NOT_ACCEPTED
  if (yuanYin === 'MI_MA_FU_ZA_DU_BU_ZU') return CuoWuDaiMa.AUTH_PASSWORD_WEAK
  if (yuanYin === 'CHU_SHENG_RI_QI_BU_HE_FA') return CuoWuDaiMa.AUTH_BIRTH_DATE_INVALID
  if (yuanYin === 'WEI_TONG_YI_XIE_YI') return CuoWuDaiMa.AUTH_AGREEMENT_REQUIRED
  return CuoWuDaiMa.REQUEST_PARAMETER_INVALID
}

export function 验证码失败结果(
  结果: Exclude<验证码校验结果, '通过'>,
): { cheng_gong: false; cuo_wu_ma: 注册错误码; ti_shi: string; juTiYuanYin: 错误原因 } {
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

export type 错误原因 =
  | 'SHOU_JI_HAO_DI_QU_BU_FU'
  | 'YONG_HU_MING_BU_HE_FA'
  | 'MI_MA_FU_ZA_DU_BU_ZU'
  | 'WEI_TONG_YI_XIE_YI'
  | 'CHU_SHENG_RI_QI_BU_HE_FA'
  | 'YAN_ZHENG_MA_CUO_WU'
  | 'YAN_ZHENG_MA_GUO_QI'
  | 'YAN_ZHENG_MA_CHANG_SHI_GUO_DUO'

export type 注册错误码 =
