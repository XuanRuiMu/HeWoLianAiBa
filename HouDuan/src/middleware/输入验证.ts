import type { Request, Response, NextFunction } from 'express'
import { peiZhi } from '../config'
import { huoQuFanYi, type FanYiJian } from '../config/translations'
import { CuoWuDaiMa } from '../config/错误码注册表'
import { shiBaiXiangYing } from '../utils/xiangying'
import { 是可识别性别 } from '../utils/性别'
import { guiYiWeiGuoJiHao } from '../utils/手机号'
import { qingLiTiJiaoKuai } from '../services/消息内容块'
import { yanZhengUUID, maDianChangDu } from '../utils/验证'

export function 验证手机号(值: unknown): 值 is string {
  return typeof 值 === 'string' && peiZhi.shouJiHao.zhengZe.test(guiYiWeiGuoJiHao(值))
}

export function 验证用户名(值: unknown): 值 is string {
  if (typeof 值 !== 'string') return false
  if (!peiZhi.yongHuMing.白名单.test(值.trim())) return false
  return !peiZhi.yongHuMing.teShuZiFu.test(值.trim())
}

export function 验证性别(值: unknown): 值 is string {
  return typeof 值 === 'string' && 是可识别性别(值)
}

export function 验证聊天内容(值: unknown): 值 is string {
  return typeof 值 === 'string' && 值.length <= 500
}

export const 反馈聊天页面集合: readonly string[] = ['liaoTian', 'haoYouLiaoTian']

export const 反馈聊天分类集合: readonly string[] = ['aiLiaoTian', 'biaoQingBao', 'yuYin', 'qiTa']

export const 反馈通用分类集合: readonly string[] = ['gongNengYiChang', 'jieMianXianShi', 'tiYanJianYi', 'qiTa']

export const 反馈全部分类集合: readonly string[] = [...反馈聊天分类集合, ...反馈通用分类集合]

export const 反馈状态集合: readonly string[] = ['xinJian', 'chuLiZhong', 'yiJieJue', 'yiJuJue']

export const 反馈消息类型集合: readonly string[] = ['wenben', 'xitong', 'neiXinHuoDong', 'tuPian', 'biaoQingBao', 'yuYin', 'wenJian']

export const 反馈发送者类型集合: readonly string[] = ['yonghu', 'jiaose', 'xitong']

export const 反馈标签按分类: Readonly<Record<string, readonly string[]>> = {
  aiLiaoTian: ['回复质量差', '人设不符', '记忆错乱', '态度不当', '重复敷衍'],
  biaoQingBao: ['表情不合时宜', '表情显示异常', '想要新表情', '发送失败'],
  yuYin: ['语音质量差', '转写不准', '频率不当', '时长不当'],
}

export function 反馈页面允许分类(页面标识: string): readonly string[] {
  return 反馈聊天页面集合.includes(页面标识) ? 反馈聊天分类集合 : 反馈通用分类集合
}

export interface FanKuiTiJiaoNeiRong {
  ye_mian_biao_shi: string
  fen_lei: string
  man_yi_du?: number
  zheng_wen: string
  biao_qian: string[]
  xiao_xi_yin_yong: unknown[]
  biao_qing_bao_yin_yong: unknown[]
}

export function 反馈读取字符串(体: Record<string, unknown>, 键: string, 备用键?: string): string {
  const 值 = 体[键]
  if (typeof 值 === 'string') return 值
  if (备用键 && typeof 体[备用键] === 'string') return String(体[备用键])
  return ''
}

export function 反馈读取数组(体: Record<string, unknown>, 键: string, 备用键?: string): unknown[] {
  const 值 = 体[键] ?? (备用键 !== undefined ? 体[备用键] : undefined)
  return Array.isArray(值) ? 值 : []
}

function 反馈校验消息引用(引用列表: unknown[]): boolean {
  if (引用列表.length > 10) return false
  return 引用列表.every((项) => {
    if (!项 || typeof 项 !== 'object' || Array.isArray(项)) return false
    const 快照 = 项 as Record<string, unknown>
    if (!yanZhengUUID(快照['xiao_xi_id'])) return false
    if (typeof 快照['lei_xing'] !== 'string' || !反馈消息类型集合.includes(快照['lei_xing'])) return false
    const 摘要 = 快照['zhai_yao']
    if (typeof 摘要 !== 'string' || maDianChangDu(摘要) > 200) return false
    if (typeof 快照['fa_song_zhe_lei_xing'] !== 'string' || !反馈发送者类型集合.includes(快照['fa_song_zhe_lei_xing'])) return false
    if (typeof 快照['shi_jian_chuo'] !== 'number' || !Number.isFinite(快照['shi_jian_chuo'])) return false
    if (快照['mei_ti_url'] !== undefined && (typeof 快照['mei_ti_url'] !== 'string' || maDianChangDu(快照['mei_ti_url']) > 500)) return false
    if (
      快照['mei_ti_shi_chang_hao_miao'] !== undefined &&
      (typeof 快照['mei_ti_shi_chang_hao_miao'] !== 'number' || !Number.isInteger(快照['mei_ti_shi_chang_hao_miao']) || 快照['mei_ti_shi_chang_hao_miao'] < 0)
    ) {
      return false
    }
    return true
  })
}

function 反馈校验表情包引用(引用列表: unknown[]): boolean {
  if (引用列表.length > 5) return false
  return 引用列表.every((项) => {
    if (!项 || typeof 项 !== 'object' || Array.isArray(项)) return false
    const 快照 = 项 as Record<string, unknown>
    if (!yanZhengUUID(快照['mei_ti_id'])) return false
    if (typeof 快照['mei_ti_url'] !== 'string' || maDianChangDu(快照['mei_ti_url']) > 500) return false
    if (快照['lai_yuan'] !== undefined && 快照['lai_yuan'] !== 'biaoQingKu') return false
    return true
  })
}

export function 验证反馈提交内容(内容: FanKuiTiJiaoNeiRong): string | null {
  if (typeof 内容.ye_mian_biao_shi !== 'string' || !内容.ye_mian_biao_shi || maDianChangDu(内容.ye_mian_biao_shi) > 64) {
    return 'fanKuiYeMianBuHeFa'
  }
  if (typeof 内容.fen_lei !== 'string' || !反馈页面允许分类(内容.ye_mian_biao_shi).includes(内容.fen_lei)) {
    return 'fanKuiFenLeiWuXiao'
  }
  if (typeof 内容.zheng_wen !== 'string' || maDianChangDu(内容.zheng_wen) < 1) {
    return 'fanKuiZhengWenBiXu'
  }
  if (maDianChangDu(内容.zheng_wen) > 1000) {
    return 'fanKuiNeiRongChaoXian'
  }
  if (内容.man_yi_du !== undefined && (typeof 内容.man_yi_du !== 'number' || !Number.isInteger(内容.man_yi_du) || 内容.man_yi_du < 1 || 内容.man_yi_du > 5)) {
    return 'fanKuiManYiDuBuHeFa'
  }
  const 允许标签 = 反馈标签按分类[内容.fen_lei]
  if (内容.biao_qian.length > 5) return 'fanKuiBiaoQianBuHeFa'
  if (!内容.biao_qian.every((项) => typeof 项 === 'string' && maDianChangDu(项) <= 20)) return 'fanKuiBiaoQianBuHeFa'
  if (!允许标签) {
    if (内容.biao_qian.length > 0) return 'fanKuiBiaoQianBuHeFa'
  } else if (!内容.biao_qian.every((项) => 允许标签.includes(项))) {
    return 'fanKuiBiaoQianBuHeFa'
  }
  if (!反馈校验消息引用(内容.xiao_xi_yin_yong)) return 'fanKuiYinYongBuHeFa'
  if (!反馈校验表情包引用(内容.biao_qing_bao_yin_yong)) return 'fanKuiBiaoQingBaoBuHeFa'
  return null
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
    shiBaiXiangYing(响应, 400, '', CuoWuDaiMa.AUTH_PHONE_NOT_ACCEPTED)
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
    shiBaiXiangYing(响应, 400, '', CuoWuDaiMa.AUTH_USERNAME_INVALID)
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
    shiBaiXiangYing(响应, 400, huoQuFanYi('anQuan', 'shenFenBuHeFa'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    return
  }
  下一步()
}

export function 聊天内容验证中间件(
  请求: Request,
  响应: Response,
  下一步: NextFunction,
): void {
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
  const tiJiaoKuai =
    消息体['nei_rong_kuai'] ?? 消息体['neiRongKuai'] ?? 消息体['内容块']
  const kuaiQingLi = qingLiTiJiaoKuai(tiJiaoKuai, '聊天内容验证')
  if (kuaiQingLi.kuai !== null) {
    if (kuaiQingLi.chaoXian) {
      shiBaiXiangYing(响应, 400, huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
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

export function 反馈提交验证中间件(
  请求: Request,
  响应: Response,
  下一步: NextFunction,
): void {
  const 反馈体 = 请求.body as Record<string, unknown>
  const 满意度原始 = 反馈体['man_yi_du'] ?? 反馈体['manYiDu']
  const 内容: FanKuiTiJiaoNeiRong = {
    ye_mian_biao_shi: 反馈读取字符串(反馈体, 'ye_mian_biao_shi', 'yeMianBiaoShi'),
    fen_lei: 反馈读取字符串(反馈体, 'fen_lei', 'fenLei'),
    man_yi_du: typeof 满意度原始 === 'number' ? 满意度原始 : undefined,
    zheng_wen: 反馈读取字符串(反馈体, 'zheng_wen', 'zhengWen'),
    biao_qian: 反馈读取数组(反馈体, 'biao_qian', 'biaoQian').filter((项): 项 is string => typeof 项 === 'string'),
    xiao_xi_yin_yong: 反馈读取数组(反馈体, 'xiao_xi_yin_yong', 'xiaoXiYinYong'),
    biao_qing_bao_yin_yong: 反馈读取数组(反馈体, 'biao_qing_bao_yin_yong', 'biaoQingBaoYinYong'),
  }
  const 错误键 = 验证反馈提交内容(内容)
  if (错误键) {
    shiBaiXiangYing(响应, 400, huoQuFanYi('fanKui', 错误键 as FanYiJian<'fanKui'>), CuoWuDaiMa.REQUEST_PARAMETER_INVALID)
    return
  }
  下一步()
}
