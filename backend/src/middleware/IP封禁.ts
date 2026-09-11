import type { Request, Response, NextFunction } from 'express'
import { 获取IP, IP是否被封禁, 记录违规 } from '../services/IP封禁'
import { qingQiuHanYouSQLZhuRu } from './安全'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'

export async function IP封禁中间件(
  请求: Request,
  响应: Response,
  下一步: NextFunction,
): Promise<void> {
  let ip: string
  try {
    ip = 获取IP(请求)
    const 结果 = await IP是否被封禁(ip)
    if (结果.已封禁) {
      if (qingQiuHanYouSQLZhuRu(请求)) {
        await 记录违规(ip, 'SQL注入', '严重')
      }
      shiBaiXiangYing(响应, 403, huoQuFanYi('anQuan', 'ipYiBeiFengJin'))
      return
    }
    下一步()
  } catch (错误) {
    // 低危顺手项：Redis 故障时降级放行并告警，避免封禁检查 fail-closed 导致全站 500
    // eslint-disable-next-line no-console -- 安全与合规.test 断言此输出含「已降级」(行为契约)
    console.error('[告警] IP封禁检查失败，已降级放行', 错误)
    下一步()
  }
}
