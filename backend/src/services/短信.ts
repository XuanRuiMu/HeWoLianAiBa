import { peiZhi } from '../config'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'

function huoQuYanZhengMaJian(shouJiHao: string): string {
  return `yan_zheng_ma:${shouJiHao}`
}

function huoQuFaSongJianGeJian(shouJiHao: string): string {
  return `fa_song_jian_ge:${shouJiHao}`
}

function shengChengSuiJiYanZhengMa(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
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
      const client = new Client({
        accessKeyId: fangWenMiYaoId,
        accessKeySecret: fangWenMiYaoMiMa,
        endpoint: 'dysmsapi.aliyuncs.com',
      } as any)
      await client.sendSms(
        new SendSmsRequest({
          phoneNumbers: shouJiHao,
          signName: qianMing,
          templateCode: moBanDaiMa,
          templateParam: JSON.stringify({ code: yanZhengMa }),
        } as any),
      )
    } catch (cuoWu) {
      console.error('阿里云短信发送失败', cuoWu)
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
  const cunChuMa = await redis.get(huoQuYanZhengMaJian(shouJiHao))
  if (cunChuMa) return cunChuMa === yanZhengMa
  if (peiZhi.kaiFaMoShi && yanZhengMa === peiZhi.yanZhengMa.kaiFaMoShiGuDing) return true
  return false
}

export async function shanChuYanZhengMa(shouJiHao: string): Promise<void> {
  await redis.del(huoQuYanZhengMaJian(shouJiHao))
}
