import { peiZhi } from './config'
import { CUO_WU_DAI_MA } from './config/错误码注册表'
import { debug日志 } from './utils/debug日志'
import { 数据库, tanCeShuJuKuJiuXu } from './数据库'
import {
  redis,
  dengDaiRedisJiuXu,
  tanCeRedisJiuXu,
  biaoJiRedisYiTanCeShiBai,
  gouJianRedisLianJiePeiZhi,
} from './redis'
import { biaoJiWeiJiuXu, biaoJiYiJiuXu } from './utils/依赖就绪'

export interface 启动判定 {
  keQiDong: boolean
  cuoWuMa: string
  shuoMing: string
}

export function 校验redissTLS(peiZhiShiJi: { tls?: unknown }, lianJie: string): 启动判定 {
  const yaoQiuTLS = /^rediss:\/\//i.test(lianJie.trim())
  if (yaoQiuTLS && peiZhiShiJi.tls === undefined) {
    return {
      keQiDong: false,
      cuoWuMa: CUO_WU_DAI_MA.DOCKER_STARTUP_REDIS_TLS_INVALID,
      shuoMing: 'rediss连接未启用TLS，拒绝明文降级启动',
    }
  }
  return { keQiDong: true, cuoWuMa: '', shuoMing: '' }
}

export async function 加载审核词库(): Promise<void> {
  try {
    const { jiaZaiZuiXinCiKu, huoQuCiKuMuLu } = await import('./services/审核词库')
    const ciKu = await jiaZaiZuiXinCiKu(true)
    biaoJiYiJiuXu('词库')
    debug日志.info('启动校验', '审核词库已加载', { xiang_qing: { ban_ben: ciKu.banBen, lu_jing: huoQuCiKuMuLu() } })
  } catch (cuoWu) {
    biaoJiWeiJiuXu('词库', cuoWu)
    debug日志.error('启动校验', '审核词库不可加载，已降级启动（审核入口按违规拦截，/readyz 返回 503）', {
      xiang_qing: {
        cuo_wu_ma: CUO_WU_DAI_MA.DOCKER_STARTUP_MODERATION_RESOURCE_UNAVAILABLE,
        cuo_wu: String(cuoWu),
        zhan: cuoWu instanceof Error ? cuoWu.stack : undefined,
      },
    })
  }
}

export async function 启动前强校验(): Promise<void> {
  const lianJie = String(peiZhi.redisLianJie || '')
  const redissPanDing = 校验redissTLS(gouJianRedisLianJiePeiZhi(lianJie, process.env.REDIS_PASSWORD), lianJie)
  if (!redissPanDing.keQiDong) {
    debug日志.error('启动校验', redissPanDing.shuoMing, {
      xiang_qing: { cuo_wu_ma: redissPanDing.cuoWuMa, lian_jie_qian_zhui: 'rediss://***' },
    })
    process.exit(1)
  }
  if (/^rediss:\/\//i.test(lianJie.trim())) {
    debug日志.info('启动校验', 'rediss加密传输已启用')
  }

  const redisJiuXu = await tanCeRedisJiuXu()
  if (redisJiuXu) {
    debug日志.info('启动校验', 'Redis 连接正常')
  } else {
    biaoJiRedisYiTanCeShiBai()
    debug日志.error('启动校验', 'Redis 暂不可用，已降级启动（端口继续监听，/readyz 返回 503）', {
      xiang_qing: { cuo_wu_ma: CUO_WU_DAI_MA.DOCKER_STARTUP_REDIS_UNAVAILABLE },
    })
  }

  const shuJuKuJiuXu = await tanCeShuJuKuJiuXu()
  if (shuJuKuJiuXu) {
    debug日志.info('启动校验', 'PostgreSQL 连接正常')
  } else {
    debug日志.error('启动校验', 'PostgreSQL 暂不可用，已降级启动（端口继续监听，/readyz 返回 503）', {
      xiang_qing: { cuo_wu_ma: CUO_WU_DAI_MA.DOCKER_STARTUP_POSTGRES_UNAVAILABLE },
    })
  }

  await 加载审核词库()
}

export { 数据库, redis, dengDaiRedisJiuXu }
