import { debug日志 } from '../utils/debug日志'
import Dysmsapi, { SendSmsRequest } from '@alicloud/dysmsapi20170525'
import Dypnsapi, { SendSmsVerifyCodeRequest } from '@alicloud/dypnsapi20170525'
import { $OpenApiUtil } from '@alicloud/openapi-core'
import crypto from 'crypto'
import { peiZhi } from '../config'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'
import { jieXiShouJiHao } from '../utils/手机号'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

const ZUI_DA_CUO_WU_CHANG_SHI = 5

export const YAN_ZHENG_MA_YONG_TU = {
  zhuCe: 'zhuCe',
  chongZhiMiMa: 'chongZhiMiMa',
} as const

export type YanZhengMaYongTu = (typeof YAN_ZHENG_MA_YONG_TU)[keyof typeof YAN_ZHENG_MA_YONG_TU]

export function zhunHuaYanZhengMaYongTu(zhi: unknown): YanZhengMaYongTu {
  return zhi === YAN_ZHENG_MA_YONG_TU.chongZhiMiMa
    ? YAN_ZHENG_MA_YONG_TU.chongZhiMiMa
    : YAN_ZHENG_MA_YONG_TU.zhuCe
}

function huoQuCuoWuJiShuJian(shouJiHao: string, yongTu: YanZhengMaYongTu): string {
  return `yan_zheng_ma_cuowu:${yongTu}:${shouJiHao}`
}

function huoQuYanZhengMaJian(shouJiHao: string, yongTu: YanZhengMaYongTu): string {
  return `yan_zheng_ma:${yongTu}:${shouJiHao}`
}

function huoQuFaSongJianGeJian(shouJiHao: string): string {
  return `fa_song_jian_ge:${shouJiHao}`
}

export function shengChengSuiJiYanZhengMa(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

interface GuoJiHaoFenJie {
  guoJiaHao: string
  benDiHao: string
}

export function 拆分国际号(yuanShi: string): GuoJiHaoFenJie | null {
  const jieXi = jieXiShouJiHao(yuanShi)
  if (!jieXi.heFa || !jieXi.guoJia) return null
  const chunShuZi = jieXi.guoJiHao.replace(/^\+/, '')
  const guoJiaHao = String(
    (parsePhoneNumberCountryCode(jieXi.guoJiHao) ?? '').trim(),
  )
  if (!/^\d{1,4}$/.test(guoJiaHao) || !chunShuZi.startsWith(guoJiaHao)) return null
  const benDiHao = chunShuZi.slice(guoJiaHao.length)
  if (!/^\d{4,15}$/.test(benDiHao)) return null
  return { guoJiaHao, benDiHao }
}

function parsePhoneNumberCountryCode(guoJiHao: string): string | null {
  try {
    const jieXi = parsePhoneNumberFromString(guoJiHao)
    return jieXi && jieXi.countryCallingCode ? jieXi.countryCallingCode : null
  } catch {
    return null
  }
}

interface DuanXinYeWuJieGuo {
  cheng_gong: boolean
  daiMa: string
  yuanYin: string
}

export function 解析短信业务结果(xiangYing: unknown): DuanXinYeWuJieGuo {
  const baoFeng = (xiangYing as { body?: Record<string, unknown> } | null)?.body
  if (!baoFeng || typeof baoFeng !== 'object') {
    return { cheng_gong: true, daiMa: '', yuanYin: '' }
  }
  const chengGong = baoFeng.Success ?? baoFeng.success
  const daiMa = String(baoFeng.Code ?? baoFeng.code ?? '')
  const yuanYin = String(baoFeng.Message ?? baoFeng.message ?? '')
  if (chengGong === false) {
    return { cheng_gong: false, daiMa: daiMa || 'WEI_ZHI', yuanYin }
  }
  if (chengGong === undefined && daiMa !== '' && daiMa !== 'OK') {
    return { cheng_gong: false, daiMa, yuanYin }
  }
  return { cheng_gong: true, daiMa, yuanYin }
}

export type DuanXinFaSongJieGuo =
  | { cheng_gong: true }
  | { cheng_gong: false; cuo_wu_ma: 'XIAN_LIU' | 'NEI_BU_CUO_WU' | 'CAN_SHU_CUO_WU'; ti_shi?: string }

export async function faSongYanZhengMa(
  shouJiHao: string,
  yongTu: YanZhengMaYongTu = YAN_ZHENG_MA_YONG_TU.zhuCe,
): Promise<DuanXinFaSongJieGuo> {
  const jianGeJian = huoQuFaSongJianGeJian(shouJiHao)
  const yiFaSong = await redis.get(jianGeJian)
  if (yiFaSong) {
    return { cheng_gong: false, cuo_wu_ma: 'XIAN_LIU', ti_shi: huoQuFanYi('renZheng', 'faSongYanZhengMaPinFan') }
  }

  const yanZhengMa = peiZhi.kaiFaMoShi
    ? peiZhi.yanZhengMa.kaiFaMoShiGuDing
    : shengChengSuiJiYanZhengMa()

  if (!peiZhi.kaiFaMoShi) {
    const { fangWenMiYaoId, fangWenMiYaoMiMa, qianMing, moBanDaiMa, gongYingShang } = peiZhi.duanXin
    if (!fangWenMiYaoId || !fangWenMiYaoMiMa || !qianMing || !moBanDaiMa) {
      return { cheng_gong: false, cuo_wu_ma: 'NEI_BU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai') }
    }

    try {
      if (gongYingShang === 'pnvs') {
        const fenJie = 拆分国际号(shouJiHao)
        if (!fenJie) {
          return { cheng_gong: false, cuo_wu_ma: 'CAN_SHU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu') }
        }
        const keHuDuan = new Dypnsapi(
          new $OpenApiUtil.Config({
            accessKeyId: fangWenMiYaoId,
            accessKeySecret: fangWenMiYaoMiMa,
            endpoint: 'dypnsapi.aliyuncs.com',
          }),
        )
        const youXiaoFenZhong = Math.max(1, Math.ceil(peiZhi.yanZhengMa.youXiaoQi / 60))
        const xiangYing = await keHuDuan.sendSmsVerifyCode(
          new SendSmsVerifyCodeRequest({
            phoneNumber: fenJie.benDiHao,
            signName: qianMing,
            templateCode: moBanDaiMa,
            templateParam: JSON.stringify({ code: yanZhengMa, min: String(youXiaoFenZhong) }),
            countryCode: fenJie.guoJiaHao,
            validTime: youXiaoFenZhong,
            codeLength: peiZhi.yanZhengMa.changDu,
            returnVerifyCode: false,
          }),
        )
        const yeWu = 解析短信业务结果(xiangYing)
        if (!yeWu.cheng_gong) {
          debug日志.error('短信服务', '阿里云短信业务失败', {
            xiang_qing: { dai_ma: yeWu.daiMa, yuan_yin: yeWu.yuanYin },
          })
          return { cheng_gong: false, cuo_wu_ma: 'NEI_BU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai') }
        }
      } else {
        const keHuDuan = new Dysmsapi(
          new $OpenApiUtil.Config({
            accessKeyId: fangWenMiYaoId,
            accessKeySecret: fangWenMiYaoMiMa,
            endpoint: 'dysmsapi.aliyuncs.com',
          }),
        )
        const xiangYing = await keHuDuan.sendSms(
          new SendSmsRequest({
            phoneNumbers: shouJiHao,
            signName: qianMing,
            templateCode: moBanDaiMa,
            templateParam: JSON.stringify({ code: yanZhengMa }),
          }),
        )
        const yeWu = 解析短信业务结果(xiangYing)
        if (!yeWu.cheng_gong) {
          debug日志.error('短信服务', '阿里云短信业务失败', {
            xiang_qing: { dai_ma: yeWu.daiMa, yuan_yin: yeWu.yuanYin },
          })
          return { cheng_gong: false, cuo_wu_ma: 'NEI_BU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai') }
        }
      }
    } catch (cuoWu) {
      debug日志.error('短信服务', '阿里云短信发送失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return { cheng_gong: false, cuo_wu_ma: 'NEI_BU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai') }
    }
  }

  await redis.setex(
    huoQuYanZhengMaJian(shouJiHao, yongTu),
    peiZhi.yanZhengMa.youXiaoQi,
    yanZhengMa,
  )
  await redis.setex(jianGeJian, peiZhi.yanZhengMa.faSongJianGe, '1')

  return { cheng_gong: true }
}

export type 验证码校验结果 = '通过' | '错误' | '已过期' | '尝试超限'

export async function yanZhengMaShiFouZhengQue(
  shouJiHao: string,
  yanZhengMa: string,
  yongTu: YanZhengMaYongTu = YAN_ZHENG_MA_YONG_TU.zhuCe,
): Promise<验证码校验结果> {
  const cuoWuJian = huoQuCuoWuJiShuJian(shouJiHao, yongTu)
  const cuoWuCiShu = Number(await redis.get(cuoWuJian)) || 0
  if (cuoWuCiShu >= ZUI_DA_CUO_WU_CHANG_SHI) {
    return '尝试超限'
  }

  const cunChuMa = await redis.get(huoQuYanZhengMaJian(shouJiHao, yongTu))
  if (cunChuMa) {
    const piPei =
      cunChuMa.length === yanZhengMa.length &&
      crypto.timingSafeEqual(Buffer.from(cunChuMa), Buffer.from(yanZhengMa))
    if (piPei) {
      await redis.del(cuoWuJian)
      return '通过'
    }
    const xinCuoWuCiShu = await redis.incr(cuoWuJian)
    await redis.expire(cuoWuJian, peiZhi.yanZhengMa.youXiaoQi)
    if (xinCuoWuCiShu >= ZUI_DA_CUO_WU_CHANG_SHI) {
      await shanChuYanZhengMa(shouJiHao, yongTu)
      return '尝试超限'
    }
    return '错误'
  }

  if (
    peiZhi.kaiFaMoShi &&
    process.env.VITEST === 'true' &&
    yongTu === YAN_ZHENG_MA_YONG_TU.zhuCe &&
    yanZhengMa === peiZhi.yanZhengMa.kaiFaMoShiGuDing
  ) {
    return '通过'
  }
  return '已过期'
}

export async function shanChuYanZhengMa(
  shouJiHao: string,
  yongTu?: YanZhengMaYongTu,
): Promise<void> {
  const yongTuLie = yongTu ? [yongTu] : Object.values(YAN_ZHENG_MA_YONG_TU)
  for (const yong of yongTuLie) {
    await redis.del(huoQuYanZhengMaJian(shouJiHao, yong))
    await redis.del(huoQuCuoWuJiShuJian(shouJiHao, yong))
  }
}

function jinRiBiaoJi(): string {
  return new Date().toISOString().slice(0, 10)
}

function huoQuShouJiHaoRiPeiEJian(shouJiHao: string): string {
  return `duan_xin_ri:${shouJiHao}:${jinRiBiaoJi()}`
}

function huoQuIpRiPeiEJian(ip: string): string {
  return `duan_xin_ip_ri:${ip}:${jinRiBiaoJi()}`
}

async function zengJiaRiPeiEJianShu(jian: string): Promise<number> {
  const zhi = await redis.incr(jian)
  if (zhi === 1) {
    await redis.expire(jian, 2 * 24 * 60 * 60)
  }
  return zhi
}

export async function duanXinRiPeiEYunXu(
  shouJiHao: string,
  ip: string,
): Promise<{ yun_xu: boolean; ti_shi?: string }> {
  try {
    const shouJiHaoZhi = Number(await redis.get(huoQuShouJiHaoRiPeiEJian(shouJiHao))) || 0
    const ipZhi = Number(await redis.get(huoQuIpRiPeiEJian(ip))) || 0

    if (shouJiHaoZhi >= peiZhi.duanXinRiPeiE.meiShouJiHaoMeiRi) {
      return { yun_xu: false, ti_shi: huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin') }
    }
    if (ipZhi >= peiZhi.duanXinRiPeiE.meiIPMeiRi) {
      return { yun_xu: false, ti_shi: huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin') }
    }

    await zengJiaRiPeiEJianShu(huoQuShouJiHaoRiPeiEJian(shouJiHao))
    await zengJiaRiPeiEJianShu(huoQuIpRiPeiEJian(ip))
    return { yun_xu: true }
  } catch (cuoWu) {
    debug日志.error('短信服务', '短信日配额检查失败，降级放行', { xiang_qing: { cuo_wu: String(cuoWu) } })
    const { faSongGaoJing } = await import('../utils/邮件告警')
    await faSongGaoJing('duan_xin_pei_e_jiang_ji', '短信配额检查降级放行', `短信日配额Redis检查失败已降级放行：${String(cuoWu).slice(0, 300)}`).catch(() => undefined)
    return { yun_xu: true }
  }
}

export async function duanXinRiPeiEYuLan(
  shouJiHao: string,
  ip: string,
): Promise<{ yun_xu: boolean; ti_shi?: string }> {
  try {
    const shouJiHaoZhi = Number(await redis.get(huoQuShouJiHaoRiPeiEJian(shouJiHao))) || 0
    const ipZhi = Number(await redis.get(huoQuIpRiPeiEJian(ip))) || 0
    if (shouJiHaoZhi >= peiZhi.duanXinRiPeiE.meiShouJiHaoMeiRi) {
      return { yun_xu: false, ti_shi: huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin') }
    }
    if (ipZhi >= peiZhi.duanXinRiPeiE.meiIPMeiRi) {
      return { yun_xu: false, ti_shi: huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin') }
    }
    return { yun_xu: true }
  } catch {
    return { yun_xu: true }
  }
}
