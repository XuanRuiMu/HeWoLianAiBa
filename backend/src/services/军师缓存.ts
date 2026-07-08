import { createHash } from 'crypto'
import { redis } from '../redis'
import type { XiaoXiXinXi } from './消息'

const JUN_SHI_HA_XI_KEY = '军师哈希'
const JUN_SHI_JI_LU_KEY = '军师记录'
const JI_LU_ZUI_DA_SHU_LIANG = 20
const TTL_MIAO = 30 * 24 * 60 * 60

export interface JunShiJiLuLiaoTianXiaoXi {
  jiao_se: string
  nei_rong: string
  shi_jian: string
  yi_che_hui: boolean
  yuan_shi_nei_rong?: string | null
  che_hui_shi_jian?: string | null
}

export interface JunShiJiLuHouTaiShuJu {
  hao_gan_du: {
    zong_fen: number
    xin_ren_du: number
    qin_mi_du: number
    qu_wei_du: number
    guan_huai_du: number
    guan_xi_jie_duan: string
  }
  fu_pan_tiao_mu: {
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
  }[]
}

export interface JunShiJiLuXiang {
  jian_yi: string
  shi_jian: string
  jiao_se_id: string
  jiao_se_ming_zi: string
  jun_shi_id: string
  jun_shi_ming_chen: string
  dui_hua_zhai_yao: string
  liao_tian_ji_lu: JunShiJiLuLiaoTianXiaoXi[]
  hou_tai_shu_ju: JunShiJiLuHouTaiShuJu
}

function geShiHuaShiJian(shi_jian_chuo: number): string {
  const shi_jian = new Date(shi_jian_chuo)
  const xiao_shi = String(shi_jian.getHours()).padStart(2, '0')
  const fen_zhong = String(shi_jian.getMinutes()).padStart(2, '0')
  return `${xiao_shi}:${fen_zhong}`
}

export function jiSuanLiaoTianHaXi(xiao_xi_lie_biao: XiaoXiXinXi[]): string {
  const you_xiao_xiao_xi = xiao_xi_lie_biao.filter(
    (xiao_xi) => !xiao_xi.yi_che_hui && xiao_xi.fa_song_zhe_lei_xing !== 'xitong',
  )

  const wen_ben = you_xiao_xiao_xi
    .map(
      (xiao_xi) =>
        `[${geShiHuaShiJian(xiao_xi.shi_jian_chuo)}] ${xiao_xi.fa_song_zhe_lei_xing}: ${xiao_xi.nei_rong}`,
    )
    .join('\n')

  return createHash('sha256').update(wen_ben).digest('hex')
}

export async function jianChaJunShiChongFu(
  yong_hu_id: string,
  jiao_se_id: string,
  ha_xi: string,
): Promise<boolean> {
  try {
    const lie_biao = await redis.lrange(`${JUN_SHI_HA_XI_KEY}:${yong_hu_id}:${jiao_se_id}`, 0, -1)
    return lie_biao.includes(ha_xi)
  } catch (cuo_wu) {
    console.error('检查军师重复失败', cuo_wu)
    return false
  }
}

export async function baoCunJunShiHaXi(
  yong_hu_id: string,
  jiao_se_id: string,
  ha_xi: string,
): Promise<void> {
  try {
    const key = `${JUN_SHI_HA_XI_KEY}:${yong_hu_id}:${jiao_se_id}`
    await redis.lpush(key, ha_xi)
    await redis.expire(key, TTL_MIAO)
  } catch (cuo_wu) {
    console.error('保存军师哈希失败', cuo_wu)
  }
}

export async function baoCunJunShiJiLu(
  yong_hu_id: string,
  jiao_se_id: string,
  ji_lu: JunShiJiLuXiang,
): Promise<void> {
  try {
    const key = `${JUN_SHI_JI_LU_KEY}:${yong_hu_id}:${jiao_se_id}`
    await redis.lpush(key, JSON.stringify(ji_lu))
    await redis.ltrim(key, 0, JI_LU_ZUI_DA_SHU_LIANG - 1)
    await redis.expire(key, TTL_MIAO)
  } catch (cuo_wu) {
    console.error('保存军师记录失败', cuo_wu)
  }
}

export async function huoQuJunShiJiLuLieBiao(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<JunShiJiLuXiang[]> {
  try {
    const key = `${JUN_SHI_JI_LU_KEY}:${yong_hu_id}:${jiao_se_id}`
    const lie_biao = await redis.lrange(key, 0, -1)
    return lie_biao.map((xiang) => JSON.parse(xiang) as JunShiJiLuXiang)
  } catch (cuo_wu) {
    console.error('读取军师记录失败', cuo_wu)
    return []
  }
}
