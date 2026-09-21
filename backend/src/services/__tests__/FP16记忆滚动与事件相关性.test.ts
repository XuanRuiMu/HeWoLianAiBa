import { describe, it, expect, vi, beforeEach } from 'vitest'

const SQL记录: Array<{ 文本: string; 参数: unknown[] }> = []
let 摘要行: Record<string, unknown> | null = null
let 事件行: Array<Record<string, unknown>> = []

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      SQL记录.push({ 文本, 参数 })
      if (文本.includes('COUNT(*)')) return { rows: [{ zong_shu: 500 }], rowCount: 1 }
      if (文本.includes('FROM "消息"')) return { rows: 事件行.map((hang) => ({ 内容: hang.内容, 发送者: hang.发送者, 创建时间: hang.创建时间 })), rowCount: 事件行.length }
      if (文本.includes('FROM "对话摘要"')) return { rows: 摘要行 ? [摘要行] : [], rowCount: 摘要行 ? 1 : 0 }
      if (文本.includes('FROM "关键事件"')) return { rows: 事件行, rowCount: 事件行.length }
      return { rows: [], rowCount: 0 }
    },
  },
}))
vi.mock('../../redis', () => ({ redis: { set: vi.fn(async () => 'OK'), get: vi.fn(), del: vi.fn() } }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuAIJiLu: vi.fn(),
}))
vi.mock('../../utils/DeepSeek客户端', () => ({
  genJuPeiZhiTiaoYong: vi.fn(async () => ({ neiRong: '合并后的摘要正文', siKaoNeiRong: '', yuanShuJu: {}, xinXi: { role: 'assistant', content: '' } })),
}))

import { gouJianDirectorPrompt, gouJianGongXiangQianZhui, gouJianJiYiZhaiYaoPrompt, gouJianWriterPrompt, JI_YI_KA_ZI_DUAN } from '../Prompt构建器'
import { qieDuanZhaiYao, shengChengBingLuoKuZhaiYao } from '../对话摘要'
import { duQuGuanJianShiJianZhuRu, mingZhongPaiXu } from '../关键事件提取'
import { AI_PEI_ZHI } from '../../config/AI配置'
import type { AIJiaoSeXinXi, AIYinQingShuRu, HaoGanDuXinXi } from '../../types'

beforeEach(() => {
  SQL记录.length = 0
  摘要行 = null
  事件行 = []
})

const 角色: AIJiaoSeXinXi = {
  id: 'j1', ming_zi: '小美', wei_xin_ming: '小美', xing_bie: 'nv', mbti_lei_xing: 'INFP',
  ie_lei_xing: 'I', re_shen_lei_xing: '慢热', nian_ling: 20, shen_fen: '', wai_mao: '普通',
  xing_ge: '安静', bei_jing_gu_shi: '在校生', xi_hao: [], yan_yu_feng_ge: '口语', xing_wei_te_dian: '',
  tou_xiang: '', xi_huan_de_lei_xing: '真诚', jia_ting_bei_jing: '普通', qing_gan_jing_li: '一次',
  shi_fou_zha_xing: false, shi_jie_xin_xi: {},
  ba_da_mo_kuai: { ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '' },
}

const 好感: HaoGanDuXinXi = { xin_ren_du: 1, qin_mi_du: 1, qu_wei_du: 1, guan_huai_du: 1, zong_fen: 4, guan_xi_jie_duan: 'renShi' }

function 输入(补充: Partial<AIYinQingShuRu> = {}): AIYinQingShuRu {
  return {
    yong_hu_id: 'u1', jiao_se_id: 'j1', jiao_se: 角色, hao_gan_du: 好感,
    dui_hua_li_shi: [], yong_hu_xin_xiao_xi: '在吗', shi_fou_di_yi_lun: false, tu_pian_shou_quan: true,
    ...补充,
  }
}

describe('FP-16 记忆摘要滚动取材（旧实现永远只摘最早 60 条）', () => {
  it('无锚点时从最早开始取，并把素材最后一条时间写回锚点', async () => {
    事件行 = [
      { 内容: '第一条', 发送者: 'yonghu', 创建时间: new Date('2026-09-01T10:00:00Z') },
      { 内容: '第二条', 发送者: 'jiaose', 创建时间: new Date('2026-09-01T10:01:00Z') },
    ]
    await expect(shengChengBingLuoKuZhaiYao('u1', 'j1', '小美')).resolves.toBe(true)
    const 取材 = SQL记录.find((项) => 项.文本.includes('FROM "消息"') && 项.文本.includes('"内容"'))
    const 落库 = SQL记录.find((项) => 项.文本.includes('INSERT INTO "对话摘要"'))
    expect(取材!.参数[2]).toBe(null)
    expect(落库!.参数[4]).toBe(new Date('2026-09-01T10:01:00Z').toISOString())
  })

  it('已有锚点时只摘锚点之后的新消息，且触发口径看「待概括条数」而不是总条数差', async () => {
    摘要行 = {
      摘要内容: '他加班很多', 概括消息数: 480, 更新时间: new Date(),
      素材锚点时间: new Date('2026-09-10T00:00:00Z'),
    }
    事件行 = [{ 内容: '锚点后的消息', 发送者: 'yonghu', 创建时间: new Date('2026-09-11T10:00:00Z') }]
    await shengChengBingLuoKuZhaiYao('u1', 'j1', '小美')
    const 取材 = SQL记录.find((项) => 项.文本.includes('FROM "消息"') && 项.文本.includes('"内容"'))
    const 计数 = SQL记录.filter((项) => 项.文本.includes('COUNT(*)'))
    expect(取材!.参数[2]).toBe(new Date('2026-09-10T00:00:00Z').toISOString())
    expect(计数[1].参数[2]).toBe(new Date('2026-09-10T00:00:00Z').toISOString())
  })

  it('合并式摘要：prompt 带上已有记忆并要求推翻旧说法时改写', () => {
    const 提示 = gouJianJiYiZhaiYaoPrompt('1. [用户] 我生日改了', '小美', '用户生日是 3 月 5 日')
    expect(提示).toContain('已有记忆')
    expect(提示).toContain('用户生日是 3 月 5 日')
    expect(提示).toMatch(/推翻|改写/)
    expect(gouJianJiYiZhaiYaoPrompt('1. [用户] 早', '小美')).not.toContain('已有记忆')
  })

  it('事实卡：字段清单逐项进 prompt，没依据的字段必须写「未提及」', () => {
    const 提示 = gouJianJiYiZhaiYaoPrompt('1. [用户] 早', '小美')
    for (const 字段 of JI_YI_KA_ZI_DUAN) {
      expect(提示).toContain(`${字段.ming}：${字段.shuoMing}`)
    }
    expect(提示).toContain('未提及')
    expect(提示).toContain('绝对不许编')
  })

  it('事实卡：合并时字段不许丢（防逐轮重写把细节磨掉的漂移）', () => {
    const 提示 = gouJianJiYiZhaiYaoPrompt('1. [用户] 早', '小美', '称呼：老大')
    expect(提示).toMatch(/不许凭空删掉/)
    expect(提示).toMatch(/字段行一个都不许少/)
    expect(提示).toMatch(/照抄原话/)
  })

  it('字数上限与 AI_PEI_ZHI 同源，提示里不残留旧的写死值', () => {
    const 上限 = AI_PEI_ZHI.zhaiYao.zuiDaZiFu
    const 提示 = gouJianJiYiZhaiYaoPrompt('1. [用户] 早', '小美')
    expect(提示).toContain(`控制在 ${上限} 字以内`)
    expect(提示).not.toContain('控制在 200 字以内')
    const 全部字段 = JI_YI_KA_ZI_DUAN.reduce((和, 字段) => 和 + 字段.ming.length + 25 + 2, 0) + (JI_YI_KA_ZI_DUAN.length - 1)
    expect(上限).toBeGreaterThan(全部字段)
  })

  it('截断按整行丢：不留下「承诺：下周末带你」这种会被当既成事实的残行', () => {
    const 单行 = (n: number) => `第${n}行：`.padEnd(80, '字')
    const 结果 = qieDuanZhaiYao([1, 2, 3, 4, 5].map(单行).join('\n'))
    const 行 = 结果.split('\n')
    expect(行.length).toBe(3)
    expect(结果.startsWith('第1行：')).toBe(true)
    expect(结果).toContain('第3行：')
    expect(结果).not.toContain('第4行：')
    for (const 一项 of 行) expect(一项.length).toBe(80)
    expect(qieDuanZhaiYao('一整行'.repeat(200)).length).toBe(AI_PEI_ZHI.zhaiYao.zuiDaZiFu)
  })
})

describe('FP-16 关键事件按本轮相关性挑选，且不进共用前缀', () => {
  function 事件(描述: string, 天: number): Record<string, unknown> {
    return { 事件类型: '其他', 描述, 创建时间: new Date(`2026-09-0${天}T10:00:00Z`) }
  }

  it('相关事件挤掉更近期但无关的事件', async () => {
    事件行 = [事件('用户换了新工作', 9), 事件('用户说自己怕冷', 8)]
    const 注入 = await duQuGuanJianShiJianZhuRu('u1', 'j1', 1, '我怕冷了，想喝热的')
    expect(注入).toContain('怕冷')
    expect(注入).not.toContain('换了新工作')
  })

  it('无本轮文本时退回近期优先（不改变既有行为基线）', async () => {
    事件行 = [事件('很怕冷', 9), 事件('新工作', 8), 事件('看球', 7)]
    const 注入 = await duQuGuanJianShiJianZhuRu('u1', 'j1', 2)
    expect(注入).toContain('很怕冷')
    expect(注入).toContain('新工作')
    expect(注入).not.toContain('看球')
  })

  it('零散词表：纯载体标记不产生打分词，退回近期优先', () => {
    const 行 = () => [
      { wenBen: 'a', chuangJian: 1 },
      { wenBen: 'b', chuangJian: 2 },
    ]
    const 甲 = 行()
    mingZhongPaiXu(甲, '[表情包]')
    expect(甲.map((项) => 项.wenBen)).toEqual(['b', 'a'])
    const 乙 = 行()
    mingZhongPaiXu(乙, '')
    expect(乙.map((项) => 项.wenBen)).toEqual(['b', 'a'])
  })

  it('关键事件注入落在历史之后，绝不进 Writer/Director 共用前缀', () => {
    const 注入 = '【关键事件】\n- 其他：用户很怕冷'
    const 提示 = 输入({ guan_jian_shi_jian: 注入 })
    const 两份: Array<[string, string]> = [
      ['Writer', gouJianWriterPrompt(提示)],
      ['Director', gouJianDirectorPrompt(提示)],
    ]
    for (const [名称, 文本] of 两份) {
      expect(文本.indexOf('【刚才聊了什么】'), 名称).toBeGreaterThan(-1)
      expect(文本.indexOf('用户很怕冷'), 名称).toBeGreaterThan(文本.indexOf('【刚才聊了什么】'))
    }
    expect(gouJianGongXiangQianZhui(提示)).not.toContain('用户很怕冷')
  })
})
