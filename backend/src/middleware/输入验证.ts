import type { Request, Response, NextFunction } from 'express'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'

export function 验证手机号(值: unknown): 值 is string {
  return typeof 值 === 'string' && peiZhi.shouJiHao.zhengZe.test(值)
}

export function 验证用户名(值: unknown): 值 is string {
  if (typeof 值 !== 'string') return false
  const 清理 = 值.trim()
  if (清理.length < peiZhi.yongHuMing.zuiXiao || 清理.length > peiZhi.yongHuMing.zuiDa) {
    return false
  }
  return !peiZhi.yongHuMing.teShuZiFu.test(清理)
}

export function 验证性别(值: unknown): 值 is string {
  return typeof 值 === 'string' && (值 === '男' || 值 === '女' || 值 === 'nan' || 值 === 'nv')
}

export function 验证聊天内容(值: unknown): 值 is string {
  return typeof 值 === 'string' && 值.length <= 500
}

export function 获取请求字符串(
  请求: Request,
  键: string,
  备用键?: string,
): string | undefined {
  const 目标 = 请求.body as Record<string, unknown>
  const 查询 = 请求.query as Record<string, unknown>
  if (typeof 目标[键] === 'string') return 目标[键]
  if (备用键 && typeof 目标[备用键] === 'string') return 目标[备用键]
  if (typeof 查询[键] === 'string') return 查询[键]
  if (备用键 && typeof 查询[备用键] === 'string') return 查询[备用键]
  return undefined
}

export function 手机号验证中间件(
  请求: Request,
  响应: Response,
  下一步: NextFunction,
): void {
  const 手机号 = 获取请求字符串(请求, 'shouJiHao', 'shou_ji_hao')
  if (!手机号 || !验证手机号(手机号)) {
    shiBaiXiangYing(响应, 400, huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'))
    return
  }
  下一步()
}

export function 用户名验证中间件(
  请求: Request,
  响应: Response,
  下一步: NextFunction,
): void {
  const 用户名 = 获取请求字符串(请求, 'yongHuMing', 'yong_hu_ming')
  if (!用户名 || !验证用户名(用户名)) {
    shiBaiXiangYing(响应, 400, huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu'))
    return
  }
  下一步()
}

export function 性别验证中间件(
  请求: Request,
  响应: Response,
  下一步: NextFunction,
): void {
  const 性别 = 获取请求字符串(请求, '性别', 'xing_bie')
  if (!性别 || !验证性别(性别)) {
    shiBaiXiangYing(响应, 400, huoQuFanYi('anQuan', 'shenFenBuHeFa'))
    return
  }
  下一步()
}

export function 聊天内容验证中间件(
  请求: Request,
  响应: Response,
  下一步: NextFunction,
): void {
  // 非文本消息（媒体消息）无文本内容要求，由后续媒体校验处理
  const 消息体 = 请求.body as Record<string, unknown>
  const 消息类型 = typeof 消息体['leiXing'] === 'string'
    ? 消息体['leiXing']
    : typeof 消息体['lei_xing'] === 'string'
      ? 消息体['lei_xing']
      : 'wenben'
  if (消息类型 !== 'wenben') {
    下一步()
    return
  }
  const 内容 = 获取请求字符串(请求, 'neiRong', 'nei_rong')
  if (!内容 || !验证聊天内容(内容)) {
    shiBaiXiangYing(响应, 400, huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
    return
  }
  下一步()
}
