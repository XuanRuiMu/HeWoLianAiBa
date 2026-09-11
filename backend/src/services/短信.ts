import { debug日志 } from '../utils/debug日志'
import crypto from 'crypto'
import { peiZhi } from '../config'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'

// A7 顺手项：每码最多错 5 次即作废，防止 6 位数字码在有效期内被猜解
const ZUI_DA_CUO_WU_CHANG_SHI = 5

function huoQuCuoWuJiShuJian(shouJiHao: string): string {
  return `yan_zheng_ma_cuowu:${shouJiHao}`
}

function huoQuYanZhengMaJian(shouJiHao: string): string {
  return `yan_zheng_ma:${shouJiHao}`
}

function huoQuFaSongJianGeJian(shouJiHao: string): string {
  return `fa_song_jian_ge:${shouJiHao}`
}

export function shengChengSuiJiYanZhengMa(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

export async function faSongYanZhengMa(
  shouJiHao: string,
): Promise<{ cheng_gong: boolean; ti_shi?: string }> {
  const jianGeJian = huoQuFaSongJianGeJian(shouJiHao)
  const yiFaSong = await redis.get(jianGeJian)
  if (yiFaSong) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'faSongYanZhengMaPinFan') }
  }

  const yanZhengMa = peiZhi.kaiFaMoShi
    ? peiZhi.yanZhengMa.kaiFaMoShiGuDing
    : shengChengSuiJiYanZhengMa()

  if (!peiZhi.kaiFaMoShi) {
    const { fangWenMiYaoId, fangWenMiYaoMiMa, qianMing, moBanDaiMa } = peiZhi.duanXin
    if (!fangWenMiYaoId || !fangWenMiYaoMiMa || !qianMing || !moBanDaiMa) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai') }
    }

    const moKuai = await import('@alicloud/dysmsapi20170525').catch(() => null)
    if (!moKuai || !moKuai.default) {
      return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai') }
    }

    try {
      const Client = moKuai.default
      const SendSmsRequest = moKuai.SendSmsRequest
      const openApiHeXin = await import('@alicloud/openapi-core').catch(() => null)
      if (!openApiHeXin) {
        return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai') }
      }
      const client = new Client(
        new openApiHeXin.$OpenApiUtil.Config({
          accessKeyId: fangWenMiYaoId,
          accessKeySecret: fangWenMiYaoMiMa,
          endpoint: 'dysmsapi.aliyuncs.com',
        }),
      )
      await client.sendSms(
        new SendSmsRequest({
          phoneNumbers: shouJiHao,
          signName: qianMing,
          templateCode: moBanDaiMa,
          templateParam: JSON.stringify({ code: yanZhengMa }),
        }),
      )
    } catch (cuoWu) {
      debug日志.error('短信服务', '阿里云短信发送失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      return { cheng_gong: false, ti_shi: huoQuFanYi('renZheng', 'yanZhengMaFaSongShiBai') }
    }
  }

  await redis.setex(
    huoQuYanZhengMaJian(shouJiHao),
    peiZhi.yanZhengMa.youXiaoQi,
    yanZhengMa,
  )
  await redis.setex(jianGeJian, peiZhi.yanZhengMa.faSongJianGe, '1')

  return { cheng_gong: true }
}

export async function yanZhengMaShiFouZhengQue(
  shouJiHao: string,
  yanZhengMa: string,
): Promise<boolean> {
  const cuoWuJian = huoQuCuoWuJiShuJian(shouJiHao)
  const cuoWuCiShu = Number(await redis.get(cuoWuJian)) || 0
  if (cuoWuCiShu >= ZUI_DA_CUO_WU_CHANG_SHI) {
    // 错误次数达上限：验证码作废，需重新发送
    return false
  }

  const cunChuMa = await redis.get(huoQuYanZhengMaJian(shouJiHao))
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
      // 达到上限直接作废该码
      await shanChuYanZhengMa(shouJiHao)
    }
    return false
  }

  // A1 后门防护：固定码回退仅在 VITEST 显式测试环境生效，
  // 本地开发终端也必须走真实下发码入 Redis 后比对
  if (
    peiZhi.kaiFaMoShi &&
    process.env.VITEST === 'true' &&
    yanZhengMa === peiZhi.yanZhengMa.kaiFaMoShiGuDing
  ) {
    return true
  }
  return false
}

export async function shanChuYanZhengMa(shouJiHao: string): Promise<void> {
  await redis.del(huoQuYanZhengMaJian(shouJiHao))
  await redis.del(huoQuCuoWuJiShuJian(shouJiHao))
}

// A7 短信费用攻击防护：每手机号/每IP 每日发送上限（Redis 日期键计数，阈值走配置）。
// 计数键按天滚动，48 小时过期兜底清理。
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

/**
 * A7：检查并占用今日短信发送配额（先查后占，超限不消耗任何一侧配额以外的资源）。
 * Redis 故障时降级放行，避免配额检查拖垮发码主链路（与 IP 封禁降级策略一致）。
 */
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

    // 先检查后占用；并发下可能轻微超发 1-2 条，对费用攻击防护而言可接受（保守方向）
    await zengJiaRiPeiEJianShu(huoQuShouJiHaoRiPeiEJian(shouJiHao))
    await zengJiaRiPeiEJianShu(huoQuIpRiPeiEJian(ip))
    return { yun_xu: true }
  } catch (cuoWu) {
    debug日志.error('短信服务', '短信日配额检查失败，降级放行', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return { yun_xu: true }
  }
}
