import { redis } from '../redis'
import { debug日志 } from '../utils/debug日志'

export type ZhongShiLeiXing = 'DaoYan' | 'HaoGanDuPingPan' | 'quAiWeiChouJian' | 'touXiangShengCheng'

export interface ZhongShiXiang {
  leiXing: ZhongShiLeiXing
  yuanYin: string
  shiJianCuo: number
}

const DuiLieJianQianZhui = 'ai_zhong_shi_dui_lie:'
const DuiLieZuiDaChangDu = 200
const DuiLieTtlHaoMiao = 24 * 60 * 60 * 1000

function huoQuDuiLieJian(): string {
  return `${DuiLieJianQianZhui}${new Date().toISOString().slice(0, 10)}`
}

export async function paiRuZhongShiDuiLie(xiang: Omit<ZhongShiXiang, 'shiJianCuo'>): Promise<void> {
  const wanZheng: ZhongShiXiang = { ...xiang, shiJianCuo: Date.now() }
  try {
    const jian = huoQuDuiLieJian()
    await redis.lpush(jian, JSON.stringify(wanZheng))
    await redis.ltrim(jian, 0, DuiLieZuiDaChangDu - 1)
    await redis.pexpire(jian, DuiLieTtlHaoMiao)
  } catch (cuoWu) {
    debug日志.error('重试队列', 'AI重试队列入队失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
  }
}

export async function duQuZhongShiDuiLieChangDu(riQi?: string): Promise<number> {
  const riQiShiJi = riQi ?? new Date().toISOString().slice(0, 10)
  try {
    return await redis.llen(`${DuiLieJianQianZhui}${riQiShiJi}`)
  } catch {
    return 0
  }
}
