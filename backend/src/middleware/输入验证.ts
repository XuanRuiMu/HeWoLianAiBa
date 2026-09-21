import type { Request, Response, NextFunction } from 'express'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { 是可识别性别 } from '../utils/性别'
import { qingLiTiJiaoKuai } from '../services/消息内容块'

export function 验证手机号(值: unknown): 值 is string {
  return typeof 值 === 'string' && peiZhi.shouJiHao.zhengZe.test(值)
}

export function 验证用户名(值: unknown): 值 is string {
  if (typeof 值 !== 'string') return false
  // YH-021 白名单优先：仅中文/字母/数字/下划线/中划线，黑名单正则同步保留作纵深
  if (!peiZhi.yongHuMing.baiMingDan.test(值.trim())) return false
  return !peiZhi.yongHuMing.teShuZiFu.test(值.trim())
}

export function 验证性别(值: unknown): 值 is string {
  return typeof 值 === 'string' && 是可识别性别(值)
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
  // FP-10（缺陷9）图文混排：正文由有序内容块派生，「单段文本 ≤ 上限」的老口径不适用
  // （块里还有系统标的 [图片] 占位符，不该占用户的字数预算）。长度只在块维度判一次，
  // 清洗算式唯一来自 services/消息内容块，最终裁定仍在消息服务，绝不在这里另写一套。
  const tiJiaoKuai =
    消息体['nei_rong_kuai'] ?? 消息体['neiRongKuai'] ?? 消息体['内容块']
  const kuaiQingLi = qingLiTiJiaoKuai(tiJiaoKuai, '聊天内容验证')
  if (kuaiQingLi.kuai !== null) {
    if (kuaiQingLi.chaoXian) {
      shiBaiXiangYing(响应, 400, huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
      return
    }
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
