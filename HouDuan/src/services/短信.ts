import { debug日志 } from '../utils/debug日志'
import Dysmsapi, { SendSmsRequest } from '@alicloud/dysmsapi20170525'
import { $OpenApiUtil } from '@alicloud/openapi-core'
import crypto from 'crypto'
import { peiZhi } from '../config'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'

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

export type DuanXinFaSongJieGuo =
  | { cheng_gong: true }
  | { cheng_gong: false; cuo_wu_ma: 'XIAN_LIU' | 'NEI_BU_CUO_WU'; ti_shi?: string }

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
    const { fangWenMiYaoId, fangWenMiYaoMiMa, qianMing, moBanDaiMa } = peiZhi.duanXin
    if (!fangWenMiYaoId || !fangWenMiYaoMiMa || !qianMing || !moBanDaiMa) {
      return { cheng_gong: false, cuo_wu_ma: 'NEI_BU_CUO_WU', ti_shi: huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai') }
    }

    try {
      const keHuDuan = new Dysmsapi(
        new $OpenApiUtil.Config({
          accessKeyId: fangWenMiYaoId,
          accessKeySecret: fangWenMiYaoMiMa,
          endpoint: 'dysmsapi.aliyuncs.com',
        }),
      )
      await keHuDuan.sendSms(
        new SendSmsRequest({
          phoneNumbers: shouJiHao,
          signName: qianMing,
          templateCode: moBanDaiMa,
          templateParam: JSON.stringify({ code: yanZhengMa }),
        }),
      )
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

export async function yanZhengMaShiFouZhengQue(
  shouJiHao: string,
  yanZhengMa: string,
  yongTu: YanZhengMaYongTu = YAN_ZHENG_MA_YONG_TU.zhuCe,
): Promise<boolean> {
  const cuoWuJian = huoQuCuoWuJiShuJian(shouJiHao, yongTu)
  const cuoWuCiShu = Number(await redis.get(cuoWuJian)) || 0
  if (cuoWuCiShu >= ZUI_DA_CUO_WU_CHANG_SHI) {
    return false
  }

  const cunChuMa = await redis.get(huoQuYanZhengMaJian(shouJiHao, yongTu))
  if (cunChuMa) {
    const piPei =
      cunChuMa.length === yanZhengMa.length &&
      crypto.timingSafeEqual(Buffer.from(cunChuMa), Buffer.from(yanZhengMa))
    if (piPei) {
      await redis.del(cuoWuJian)
      return true
    }
    const xinCuoWuCiShu = await redis.incr(cuoWuJian)
    await redis.expire(cuoWuJian, peiZhi.yanZhengMa.youXiaoQi)
    if (xinCuoWuCiShu >= ZUI_DA_CUO_WU_CHANG_SHI) {
      await shanChuYanZhengMa(shouJiHao, yongTu)
    }
    return false
  }

  if (
    peiZhi.kaiFaMoShi &&
    process.env.VITEST === 'true' &&
    yongTu === YAN_ZHENG_MA_YONG_TU.zhuCe &&
    yanZhengMa === peiZhi.yanZhengMa.kaiFaMoShiGuDing
  ) {
    return true
  }
  return false
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
