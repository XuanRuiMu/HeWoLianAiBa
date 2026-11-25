import type { Request, Response, NextFunction } from 'express'
import { 获取IP, IP是否被封禁, 记录违规 } from '../services/IP封禁'
import { qingQiuHanYouSQLZhuRu } from './安全'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { debug日志 } from '../utils/debug日志'

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
    debug日志.error('IP封禁', '检查失败，已降级放行', { xiang_qing: { cuo_wu: String(错误) } })
    try {
      const { faSongGaoJing } = await import('../utils/邮件告警')
      await faSongGaoJing('ip_feng_jin_jiang_ji', 'IP封禁检查降级放行', `IP封禁Redis检查失败已降级放行：${String(错误).slice(0, 300)}`)
    } catch {
      return 下一步()
    }
    下一步()
  }
}
