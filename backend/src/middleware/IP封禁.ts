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
  try {
    const ip = 获取IP(请求)
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
    console.error('IP封禁检查失败', 错误)
    shiBaiXiangYing(响应, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
}
