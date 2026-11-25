import type { PoolClient, QueryResult } from 'pg'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { XiaoXiPeiZhi, huoQuCheHuiShiXianHaoMiao } from '../config/消息配置'
import { 表情书类别, 类别到消息类型, YunXuXiaoXiLeiXing } from '../config/媒体配置'
import { 表情短名最大长 } from '../config/表情包配置'
import { huoQuIo } from '../socket/io'
import { yanZhengUUID } from '../utils/验证'
import { huoQuJiaoSeBianHao } from './公开编号'
import { 解析结局类型, 解析结局文案 } from '../utils/结局'
import { 归一角色性别 } from '../utils/性别'
import { debug日志, jiLuXiaoXiCaoZuo, jiLuSocketShiJian } from '../utils/debug日志'
import { shengChengQianMingURL } from './媒体存储'
import { 按短名查, 短名转UUID } from './表情包库'
import {
  消息块LeiXing,
  diuQiDaoCuoWuJian,
  fanGouKuai,
  jiLuKuaiDiuQi,
  leiXingDaoMeiTiLeiBie,
  paiShengJianRong,
  qingLiLuoKuKuai,
  qingLiTiJiaoKuai,
  yingYongMeiTiPanDing,
  type 兼容剪映,
  type 消息块,
} from './消息内容块'

const 表情消息类型 = 类别到消息类型[表情书类别]

const 表情包短名正则 = /^\s*\[贴纸[:：]\s*([^\]】]+?)\s*\]\s*$/

export interface 消息块ChuCan extends 消息块 {
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
  duan_ming?: string | null
}

interface 块媒体信息 {
  sha256: string
  lei_bie: string
}

export interface 消息信息 {
  id: string
  hui_hua_id: string
  fa_song_zhe_id: string
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong'
  ai_biao_shi: boolean
  nei_rong: string
  lei_xing: string
  nei_rong_kuai?: 消息块ChuCan[]
  bei_yong_xiao_xi_id?: string | null
  shi_jian_chuo: number
  yi_du: boolean
  yi_che_hui?: boolean
  che_hui_shi_jian?: string | null
  neiRongYuanWen?: string | null
  ke_hu_duan_xu_hao?: number | null
  mi_deng_jian?: string | null
  mei_ti_id?: string | null
  mei_ti_url?: string | null
  mei_ti_lei_bie?: string | null
  mei_ti_shi_chang_hao_miao?: number | null
  mei_ti_yuan_shi_wen_jian_ming?: string | null
}

export interface 发消息参数 {
  yong_hu_id: string
  jiao_se_id: string
  nei_rong: string
  ke_hu_duan_xu_hao?: number | null
  mi_deng_jian?: string | null
  lei_xing?: string
  mei_ti_id?: string | null
  nei_rong_kuai?: unknown
  bei_yong_xiao_xi_id?: string | null
}

export interface 取消息参数 {
  yong_hu_id: string
  jiao_se_id: string
  ye_ma?: number
  mei_ye_tiao_shu?: number
  you_biao_xu_hao?: number | null
  you_biao_shi_jian_chuo?: number | null
  you_biao_id?: string | null
}

export interface 撤回消息参数 {
  yong_hu_id: string
  jiao_se_id: string
  xiao_xi_id: string
}

export interface 撤回角色消息参数 {
  yong_hu_id: string
  jiao_se_id: string
}

export interface 重新编辑原文参数 {
  yong_hu_id: string
  jiao_se_id: string
  xiao_xi_id: string
}

function 推送撤回事件(
  yong_hu_id: string,
  jiao_se_id: string,
  xiao_xi_id: string,
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose',
  dui_wai_hui_hua_id: string,
): void {
  const io = huoQuIo()
  if (io) {
    io.to(yong_hu_id).emit('消息撤回', {
      hui_hua_id: dui_wai_hui_hua_id,
      xiao_xi_id,
      fa_song_zhe_lei_xing,
    })
    jiLuSocketShiJian('消息撤回', yong_hu_id, {
      jiao_se_id,
      xiao_xi_id,
      fa_song_zhe_lei_xing,
    })
  }
}

export interface 块上下文 {
  kuaiOf(xiaoXiId: string): 消息块[] | null
  meiTiOf(meiTiId: string): 块媒体信息 | null
  biaoQingShaOf?(duanMing: string): string | null
}

function 取块数组(zhi: unknown): Record<string, unknown>[] {
  if (!Array.isArray(zhi)) return []
  const jieGuo: Record<string, unknown>[] = []
  for (const yuan of zhi) {
    if (typeof yuan !== 'object' || yuan === null || Array.isArray(yuan)) continue
    jieGuo.push(yuan as Record<string, unknown>)
  }
  return jieGuo
}

function 取表情包短名(xiang: Record<string, unknown>): string | null {
  if (xiang.lei_xing !== 消息块LeiXing.tuPian) return null
  const meiTiId = typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : ''
  if (meiTiId !== '') return null
  const duanMing = typeof xiang.duan_ming === 'string' ? xiang.duan_ming.trim() : ''
  if (duanMing === '' || duanMing.length > 表情短名最大长) return null
  return duanMing
}

function 解析表情包短名(zhi: unknown): string | null {
  if (typeof zhi !== 'string') return null
  const piPei = 表情包短名正则.exec(zhi)
  if (!piPei) return null
  const duanMing = piPei[1].trim()
  if (duanMing === '' || duanMing.length > 表情短名最大长) return null
  return duanMing
}

function shouJiBiaoQingDuanMing(row: Record<string, unknown>): Set<string> {
  const jieGuo = new Set<string>()
  for (const xiang of 取块数组(row.内容块)) {
    const duanMing = 取表情包短名(xiang)
    if (duanMing) jieGuo.add(duanMing)
  }
  return jieGuo
}

function 映射表情包块(
  duanMing: string,
  shangXiaWen: 块上下文,
  zhuTi: string,
): 消息块ChuCan {
  const sha256 = shangXiaWen.biaoQingShaOf?.(duanMing) ?? null
  return {
    lei_xing: 消息块LeiXing.tuPian,
    duan_ming: duanMing,
