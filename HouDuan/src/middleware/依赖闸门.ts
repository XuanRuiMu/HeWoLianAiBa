import type { Request, Response, NextFunction } from 'express'
import { debug日志 } from '../utils/debug日志'
import { shiBaiXiangYing } from '../utils/xiangying'
import { CUO_WU_DAI_MA, type CuoWuDaiMa } from '../config/错误码注册表'
import { huoQuJiuXuKuaiZhao, type 就绪快照 } from '../utils/依赖就绪'

const RI_ZHI_JIE_LIU_HAO_MIAO = 30000

let shangCiRiZhiShiJian = 0
let shangCiRiZhiDaiMa = ''

export function 选址依赖错误码(kuaiZhao: 就绪快照): CuoWuDaiMa | null {
  if (kuaiZhao.postgres && kuaiZhao.redis) return null
  if (!kuaiZhao.postgres && !kuaiZhao.redis) return CUO_WU_DAI_MA.DEPENDENCIES_UNAVAILABLE
  return kuaiZhao.postgres
    ? CUO_WU_DAI_MA.DEPENDENCY_REDIS_UNAVAILABLE
    : CUO_WU_DAI_MA.DEPENDENCY_POSTGRES_UNAVAILABLE
}

function jiLuJiangJi(cuoWuMa: CuoWuDaiMa, kuaiZhao: 就绪快照): void {
  const xianZai = Date.now()
  if (cuoWuMa === shangCiRiZhiDaiMa && xianZai - shangCiRiZhiShiJian < RI_ZHI_JIE_LIU_HAO_MIAO) return
  shangCiRiZhiShiJian = xianZai
  shangCiRiZhiDaiMa = cuoWuMa
  debug日志.error('依赖闸门', '依赖未就绪，业务请求已拒绝并返回结构化 503', {
    xiang_qing: {
      cuo_wu_ma: cuoWuMa,
      postgres_jiu_xu: kuaiZhao.postgres ? '是' : '否',
      redis_jiu_xu: kuaiZhao.redis ? '是' : '否',
      ci_ku_jiu_xu: kuaiZhao.词库 ? '是' : '否',
    },
  })
}

export function 依赖闸门中间件(_qingQiu: Request, xiangYing: Response, xiaYiBu: NextFunction): void {
  const kuaiZhao = huoQuJiuXuKuaiZhao()
  const cuoWuMa = 选址依赖错误码(kuaiZhao)
  if (cuoWuMa === null) {
    shangCiRiZhiDaiMa = ''
    xiaYiBu()
    return
  }
  jiLuJiangJi(cuoWuMa, kuaiZhao)
  shiBaiXiangYing(xiangYing, 503, '', cuoWuMa)
}

export function 重置闸门节流(): void {
  shangCiRiZhiShiJian = 0
  shangCiRiZhiDaiMa = ''
}