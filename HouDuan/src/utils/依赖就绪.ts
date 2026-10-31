import { debug日志, qingLiNeiBuCuoWu } from './debug日志'

export type 依赖名称 = 'postgres' | 'redis'

export type 就绪组件 = 依赖名称 | '词库'

export interface 就绪快照 {
  postgres: boolean
  redis: boolean
  词库: boolean
}

type 变化监听 = (kuaiZhao: 就绪快照) => void

const zhuangTai: 就绪快照 = { postgres: false, redis: false, 词库: false }
const jianTingZhe = new Set<变化监听>()

function kuaiZhaoDangQian(): 就绪快照 {
  return { postgres: zhuangTai.postgres, redis: zhuangTai.redis, 词库: zhuangTai.词库 }
}

function zhaiYaoCuoWu(cuoWu: unknown): string {
  if (cuoWu instanceof Error) return qingLiNeiBuCuoWu(cuoWu).cuo_wu
  return String(cuoWu).slice(0, 300)
}

function tongZhiBianHua(): void {
  const kuaiZhao = kuaiZhaoDangQian()
  for (const jianTing of jianTingZhe) {
    try {
      jianTing(kuaiZhao)
    } catch (cuoWu) {
      debug日志.error('依赖状态', '就绪状态变化监听执行失败', { xiang_qing: { cuo_wu: zhaiYaoCuoWu(cuoWu) } })
    }
  }
}

function zhiWei(ming: 就绪组件, jiuZhi: boolean): void {
  if (zhuangTai[ming] === jiuZhi) return
  zhuangTai[ming] = jiuZhi
  tongZhiBianHua()
}

export function biaoJiYiJiuXu(ming: 就绪组件): void {
  zhiWei(ming, true)
}

export function biaoJiWeiJiuXu(ming: 就绪组件, _cuoWu?: unknown): void {
  zhiWei(ming, false)
}

export function shiFouJiuXu(ming: 就绪组件): boolean {
  return zhuangTai[ming]
}

export function huoQuJiuXuKuaiZhao(): 就绪快照 {
  return kuaiZhaoDangQian()
}

export function quanBuJiuXu(): boolean {
  return zhuangTai.postgres && zhuangTai.redis && zhuangTai.词库
}

export function huoQuWeiJiuXuQingDan(): 就绪组件[] {
  const jieGuo: 就绪组件[] = []
  if (!zhuangTai.postgres) jieGuo.push('postgres')
  if (!zhuangTai.redis) jieGuo.push('redis')
  if (!zhuangTai.词库) jieGuo.push('词库')
  return jieGuo
}

export function zhuCeJiuXuBianHuaJianTing(jianTing: 变化监听): () => void {
  jianTingZhe.add(jianTing)
  return () => {
    jianTingZhe.delete(jianTing)
  }
}

export function 重置就绪状态(): void {
  zhuangTai.postgres = false
  zhuangTai.redis = false
  zhuangTai.词库 = false
  jianTingZhe.clear()
}
