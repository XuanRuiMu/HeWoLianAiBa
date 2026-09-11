import type { AIJiaoSeXinXi, HaoGanDuXinXi, DirectorCeLue } from '../types'
import { debug日志 } from '../utils/debug日志'

const 基础概率 = 0.1
const 概率上限 = 0.95
const 概率下限 = 0
const 抖动范围 = 0.2

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

  const 禁用关键词 = [
    '代码', '编程', '技术', '逻辑分析', '算法', '数据结构', '架构', '框架',
    'api', '接口', '数据库', 'sql', '函数', '变量', '类', '对象', '继承',
    '多态', '封装', '设计模式', '重构', '调试', '报错', '异常', '堆栈',
    '部署', '运维', '服务器', '容器', '微服务', '分布式', '并发', '锁',
    '事务', '索引', '查询优化', '缓存', '消息队列', '负载均衡',
  ]

  const 加成关键词 = [
    '表白', '告白', '喜欢', '爱', '道歉', '对不起', '抱歉', '晚安', '睡觉',
    '想你', '想念', '拥抱', '亲吻', '牵手', '陪伴', '守护', '珍惜', '心动',
    '感动', '温柔', '深情', '真心', '真诚', '承诺', '永远', '一辈子',
  ]

  const 是否禁用 = 禁用关键词.some(词 => 策略文本.includes(词.toLowerCase()))
  if (是否禁用) {
    return { 系数: 0, 禁用: true }
  }

  const 是否加成 = 加成关键词.some(词 => 策略文本.includes(词.toLowerCase()))
  if (是否加成) {
    return { 系数: 2.0, 禁用: false }
  }

  return { 系数: 1.0, 禁用: false }
}

function 生成随机抖动(): number {
  return 1 - 抖动范围 + Math.random() * 抖动范围 * 2
}

export interface TTS概率计算输入 {
  角色: AIJiaoSeXinXi
  好感度: HaoGanDuXinXi | null
  策略?: DirectorCeLue
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
  const { 角色, 好感度, 策略 } = 输入

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

  const 随机抖动值 = 生成随机抖动()
  let 最终概率 = 基础概率 * 关系阶段系数值 * 人设系数值 * 场景系数值 * 随机抖动值
  最终概率 = Math.max(概率下限, Math.min(概率上限, 最终概率))

  const 是否触发 = Math.random() < 最终概率

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