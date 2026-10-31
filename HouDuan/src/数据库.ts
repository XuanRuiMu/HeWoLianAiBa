import { debug日志 } from './utils/debug日志'
import { Pool } from 'pg'
import { peiZhi } from './config'
import { biaoJiWeiJiuXu, biaoJiYiJiuXu } from './utils/依赖就绪'

const chi = new Pool({
  connectionString: peiZhi.shuJuKuLianJie,
  max: peiZhi.shuJuKuLianChi.zuiDa,
  connectionTimeoutMillis: peiZhi.shuJuKuLianChi.lianJieChaoShiHaoMiao,
  idleTimeoutMillis: peiZhi.shuJuKuLianChi.kongXianChaoShiHaoMiao,
  statement_timeout: peiZhi.shuJuKuLianChi.yuJuChaoShiHaoMiao,
})

chi.on('error', (cuoWu) => {
  biaoJiWeiJiuXu('postgres', cuoWu)
  debug日志.error('数据库连接池', '数据库连接池错误', { xiang_qing: { cuo_wu: String(cuoWu) } })
})

function zhaiYaoCuoWu(cuoWu: unknown): string {
  return String(cuoWu instanceof Error ? cuoWu.message : cuoWu).slice(0, 300)
}

async function jiLuJieGuo<T>(caoZuo: () => Promise<T>): Promise<T> {
  try {
    const jieGuo = await caoZuo()
    biaoJiYiJiuXu('postgres')
    return jieGuo
  } catch (cuoWu) {
    biaoJiWeiJiuXu('postgres', cuoWu)
    debug日志.error('数据库连接池', '数据库访问失败，已标记为未就绪', {
      xiang_qing: { cuo_wu: zhaiYaoCuoWu(cuoWu) },
    })
    throw cuoWu
  }
}

export const 数据库: Pool = new Proxy(chi, {
  get(muBiao, jian, jieShouZhe) {
    if (jian === 'query') {
      return (...canShu: unknown[]) =>
        jiLuJieGuo(() =>
          (muBiao.query as (...neiCan: unknown[]) => Promise<unknown>).apply(muBiao, canShu),
        )
    }
    if (jian === 'connect') {
      return () => jiLuJieGuo(() => muBiao.connect())
    }
    const zhi = Reflect.get(muBiao, jian, jieShouZhe) as unknown
    return typeof zhi === 'function' ? (zhi as (...canShu: unknown[]) => unknown).bind(muBiao) : zhi
  },
})

export async function tanCeShuJuKuJiuXu(): Promise<boolean> {
  try {
    await chi.query('SELECT 1')
    biaoJiYiJiuXu('postgres')
    return true
  } catch (cuoWu) {
    biaoJiWeiJiuXu('postgres', cuoWu)
    debug日志.warn('数据库连接池', 'PostgreSQL 探测未通过', { xiang_qing: { cuo_wu: zhaiYaoCuoWu(cuoWu) } })
    return false
  }
}
