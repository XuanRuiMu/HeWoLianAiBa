import { redis } from '../redis'

export interface FuPanTiaoMuXinXi {
  shi_jian: string
  yong_hu_xiao_xi: string
  ai_hui_fu: string
  ai_xin_li_huo_dong: string
  hao_gan_du_bian_hua: {
    xin_ren_bian_hua: number
    qin_mi_bian_hua: number
    qu_wei_bian_hua: number
    guan_huai_bian_hua: number
    zong_fen_bian_hua: number
  }
}

function huoQuFuPanKey(yong_hu_id: string, jiao_se_id: string): string {
  return `复盘条目:${yong_hu_id}:${jiao_se_id}`
}

export async function huoQuFuPanTiaoMuLieBiao(
  yong_hu_id: string,
  jiao_se_id: string,
  xian_zhi: number = 10,
): Promise<FuPanTiaoMuXinXi[]> {
  try {
    const lieBiao = await redis.lrange(huoQuFuPanKey(yong_hu_id, jiao_se_id), 0, xian_zhi - 1)
    return lieBiao.map((xiang) => JSON.parse(xiang) as FuPanTiaoMuXinXi)
  } catch (cuoWu) {
    console.error('读取复盘条目失败', cuoWu)
    return []
  }
}

export async function xieRuFuPanTiaoMu(
  yong_hu_id: string,
  jiao_se_id: string,
  tiao_mu: FuPanTiaoMuXinXi,
): Promise<void> {
  try {
    const key = huoQuFuPanKey(yong_hu_id, jiao_se_id)
    await redis.lpush(key, JSON.stringify(tiao_mu))
    await redis.expire(key, 30 * 24 * 60 * 60)
  } catch (cuoWu) {
    console.error('写入复盘条目失败', cuoWu)
  }
}
