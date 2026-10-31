import type { AIJiaoSeXinXi, HaoGanDuXinXi, DirectorCeLue } from '../types'
import { debug日志 } from '../utils/debug日志'
import { TTS_PEI_ZHI } from '../config/TTS触发配置'

const 基础概率 = TTS_PEI_ZHI.jiChuGaiLv
const 概率上限 = TTS_PEI_ZHI.gaiLvShangXian
const 概率下限 = TTS_PEI_ZHI.gaiLvXiaXian

export const TTS_DOU_DONG_FU_DU = TTS_PEI_ZHI.douDongFuDu

const 关系阶段系数: Record<string, number> = {
  lengDan: 0.3,
  shuYuan: 0.3,
  renShi: 0.6,
  shuXi: 0.6,
  pengYou: 0.9,
  haoYou: 0.9,
  aiMei: 1.2,
  xinDong: 1.2,
  reLian: 1.5,
  shenAi: 1.5,
}

const IE系数: Record<'I' | 'E', number> = {
  I: 0.7,
  E: 1.3,
}

const 高冷关键词 = [
  '寡言', '高冷', '冷淡', '疏离', '淡漠', '清冷', '内向', '安静', '矜持', '沉默',
  '不善言辞', '话少', '冷静', '理智', '克制', '内敛', '深沉', '孤僻', '孤独',
]

const 热情关键词 = [
  '热情', '活泼', '自来熟', '话痨', '元气', '开朗', '健谈', '爱笑', '阳光', '外向',
  '热心', '开朗', '活跃', '外放', '善谈', '幽默', '风趣', '开心', '快乐', '兴奋',
]

function 计算人设系数(角色: AIJiaoSeXinXi): number {
  let 系数 = IE系数[角色.ie_lei_xing] || 1.0

  const 人设文本 = `${角色.xing_ge}${角色.yan_yu_feng_ge}${角色.xing_wei_te_dian}`.toLowerCase()

  const 高冷命中 = 高冷关键词.some(词 => 人设文本.includes(词.toLowerCase()))
  const 热情命中 = 热情关键词.some(词 => 人设文本.includes(词.toLowerCase()))

  if (高冷命中 && !热情命中) {
    系数 *= 0.4
  } else if (热情命中 && !高冷命中) {
    系数 *= 1.4
  }

  return 系数
}

function 计算关系阶段系数(好感度: HaoGanDuXinXi | null): number {
  if (!好感度) return 1.0
  return 关系阶段系数[好感度.guan_xi_jie_duan] || 1.0
}

function 计算场景系数(策略?: DirectorCeLue): { 系数: number; 禁用: boolean } {
  if (!策略) return { 系数: 1.0, 禁用: false }

  const 策略文本 = `${策略.hui_fu_ce_lue}${策略.qing_gan_fen_xi}${策略.yong_hu_yi_tu}`.toLowerCase()

  const 禁用关键词 = TTS_PEI_ZHI.jinYongGuanJianCi

  const 加成关键词 = TTS_PEI_ZHI.jiaChengGuanJianCi

  const 是否禁用 = 禁用关键词.some(词 => 策略文本.includes(词.toLowerCase()))
  if (是否禁用) {
    return { 系数: 0, 禁用: true }
  }

  const 是否加成 = 加成关键词.some(词 => 策略文本.includes(词.toLowerCase()))
  if (是否加成) {
    return { 系数: TTS_PEI_ZHI.jiaChengXiShu, 禁用: false }
  }

  return { 系数: 1.0, 禁用: false }
}

function 生成随机抖动(随机数: number = Math.random()): number {
  return 1 - TTS_PEI_ZHI.douDongFuDu + 随机数 * TTS_PEI_ZHI.douDongFuDu * 2
}

export interface TTS概率计算输入 {
  角色: AIJiaoSeXinXi
  好感度: HaoGanDuXinXi | null
  策略?: DirectorCeLue
  随机数?: number
}

export interface TTS概率计算结果 {
  概率: number
  是否触发: boolean
  详情: {
    基础概率: number
    关系阶段系数: number
    人设系数: number
    场景系数: number
    随机抖动: number
    最终概率: number
    禁用: boolean
  }
}

export function 计算TTS概率(输入: TTS概率计算输入): TTS概率计算结果 {
  const { 角色, 好感度, 策略, 随机数 } = 输入

  const 关系阶段系数值 = 计算关系阶段系数(好感度)
  const 人设系数值 = 计算人设系数(角色)
  const { 系数: 场景系数值, 禁用 } = 计算场景系数(策略)

  if (禁用) {
    return {
      概率: 0,
      是否触发: false,
      详情: {
        基础概率,
        关系阶段系数: 关系阶段系数值,
        人设系数: 人设系数值,
        场景系数: 0,
        随机抖动: 1,
        最终概率: 0,
        禁用: true,
      },
    }
  }

  const 单次随机数 = 随机数 ?? Math.random()
  const 随机抖动值 = 生成随机抖动(单次随机数)
  let 最终概率 = 基础概率 * 关系阶段系数值 * 人设系数值 * 场景系数值 * 随机抖动值
  最终概率 = Math.max(概率下限, Math.min(概率上限, 最终概率))

  const 是否触发 = 单次随机数 < 最终概率

  debug日志.debug('TTS概率计算', '概率计算完成', {
    xiang_qing: {
      roleId: 角色.id,
      好感度阶段: 好感度?.guan_xi_jie_duan || 'unknown',
      IE类型: 角色.ie_lei_xing,
      是否触发,
      ...输入,
    },
  })

  return {
    概率: 最终概率,
    是否触发,
    详情: {
      基础概率,
      关系阶段系数: 关系阶段系数值,
      人设系数: 人设系数值,
      场景系数: 场景系数值,
      随机抖动: 随机抖动值,
      最终概率,
      禁用: false,
    },
  }
}