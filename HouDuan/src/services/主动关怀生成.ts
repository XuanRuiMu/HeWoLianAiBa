import { 按配置调用 } from '../utils/通用模型调用'
import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { shiQuXianZaiShiJian } from '../config/语言与时区'
import { 构建主动关怀提示, type GuanHuaiTiShiShuRu } from './Prompt构建器'

const MoXingMing = 'XieShou' as const

export const GuanHuaiZuiDaZiShu = 80
export const FuDuXiangSiDuYuZhi = 0.5

const GuanHuaiWenAnQianZhui = 'guan_huai_wen_an:'
const GuanHuaiWenAnBaoLiuTiaoShu = 5
const GuanHuaiWenAnYouXiaoMiao = 30 * 24 * 3600

export async function huoQuZuiJinGuanHuaiWenAn(yongHuId: string, jiaoSeId: string): Promise<string[]> {
  try {
    const jian = `${GuanHuaiWenAnQianZhui}${yongHuId}:${jiaoSeId}`
    const jiLu = await redis.lrange(jian, 0, GuanHuaiWenAnBaoLiuTiaoShu - 1)
    return jiLu.map((wen) => String(wen || '')).filter((wen) => wen !== '')
  } catch (cuoWu) {
    debug日志.warn('主动关怀生成', '读取最近关怀记录失败，本次按无历史处理', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return []
  }
}

export async function baoCunGuanHuaiWenAn(yongHuId: string, jiaoSeId: string, neiRong: string): Promise<void> {
  try {
    const jian = `${GuanHuaiWenAnQianZhui}${yongHuId}:${jiaoSeId}`
    await redis.lpush(jian, neiRong)
    await redis.ltrim(jian, 0, GuanHuaiWenAnBaoLiuTiaoShu - 1)
    await redis.expire(jian, GuanHuaiWenAnYouXiaoMiao)
  } catch (cuoWu) {
    debug日志.warn('主动关怀生成', '保存关怀记录失败，防复读历史可能缺失', {
      xiang_qing: { yong_hu_id: yongHuId, jiao_se_id: jiaoSeId, cuo_wu: String(cuoWu).slice(0, 200) },
    })
  }
}

export function dangQianShiDuanMiaoShu(now: Date, shiQu?: unknown): string {
  const xiaoShi = shiQu === undefined ? now.getHours() : shiQuXianZaiShiJian(shiQu, now).xiaoShi
  if (xiaoShi >= 5 && xiaoShi < 8) return '清早'
  if (xiaoShi >= 8 && xiaoShi < 12) return '上午'
  if (xiaoShi >= 12 && xiaoShi < 14) return '中午'
  if (xiaoShi >= 14 && xiaoShi < 18) return '下午'
  if (xiaoShi >= 18 && xiaoShi < 23) return '晚上'
  return '深夜'
}

function sanYuanZuHe(wenBen: string): Set<string> {
  const ganJing = (wenBen || '').replace(/\s+/g, '')
  const zu = new Set<string>()
  if (ganJing.length === 0) return zu
  if (ganJing.length < 3) {
    zu.add(ganJing)
    return zu
  }
  for (let i = 0; i + 3 <= ganJing.length; i++) zu.add(ganJing.slice(i, i + 3))
  return zu
}

export function guanHuaiXiangSiDu(xinWenBen: string, liShiWenBenLieBiao: string[]): number {
  const xin = sanYuanZuHe(xinWenBen)
  if (xin.size === 0) return 0
  let zuiDa = 0
  for (const liShi of liShiWenBenLieBiao) {
    const jiu = sanYuanZuHe(liShi)
    if (jiu.size === 0) continue
    let jiaoJi = 0
    for (const zu of xin) {
      if (jiu.has(zu)) jiaoJi++
    }
    const bingJi = xin.size + jiu.size - jiaoJi
    if (bingJi <= 0) continue
    const du = jiaoJi / bingJi
    if (du > zuiDa) zuiDa = du
  }
  return zuiDa
}

export async function shengChengGuanHuaiNeiRong(shuRu: GuanHuaiTiShiShuRu): Promise<string | null> {
  try {
    const xiangYing = await 按配置调用(MoXingMing, [
      { jiaoSe: 'system', neiRong: '你在给聊天对象发一条主动的关心消息。只输出要发给对方的那条消息文字。' },
      { jiaoSe: 'user', neiRong: 构建主动关怀提示(shuRu) },
    ])
    const neiRong = (xiangYing.neiRong || '').trim()
    if (neiRong === '') {
      debug日志.warn('主动关怀生成', '模型输出为空，按生成失败处理', {
        xiang_qing: { jiao_se_id: shuRu.jiao_se.id },
      })
      return null
    }
    if (neiRong.length > GuanHuaiZuiDaZiShu) {
      debug日志.warn('主动关怀生成', '生成内容超过80字上限，拒收', {
        xiang_qing: { jiao_se_id: shuRu.jiao_se.id, zi_shu: neiRong.length, shang_xian: GuanHuaiZuiDaZiShu },
      })
      return null
    }
    return neiRong
  } catch (cuoWu) {
    debug日志.warn('主动关怀生成', '关怀内容生成失败', {
      xiang_qing: { jiao_se_id: shuRu.jiao_se.id, cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return null
  }
}
