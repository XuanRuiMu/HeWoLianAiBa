import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * FP-13 红灯复现：角色.性别 → AI 上下文（nan/nv）的性别映射。
 * 缺陷：AI输入准备 用 `=== '女'` 比对实际落库的 `nv`，
 * 导致 10565 个 nv 女性角色全部被喂给大模型成 nan（男性）人设。
 */

const 语句记录: Array<{ 文本: string; 参数: unknown[] }> = []
let 角色行: Record<string, unknown> = {}

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      语句记录.push({ 文本, 参数 })
      if (文本.includes('FROM "角色"')) {
        return { rows: [角色行], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
  },
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  jiLuXiaoXiCaoZuo: vi.fn(),
}))

vi.mock('../消息', () => ({
  shiXiaoXiaoXiZongShuHuanCun: vi.fn(),
}))

import { huoQuAIJiaoSeXinXi } from '../AI输入准备'
import { debug日志 } from '../../utils/debug日志'

function 设性别(值: unknown): void {
  角色行 = {
    ID: 'r1',
    名字: '小美',
    微信昵称: '小美',
    性别: 值,
    年龄: 22,
    MBTI: 'INFP',
    IE类型: 'I',
    热身类型: '慢热',
    外貌: '',
    性格: '',
    背景故事: '',
    爱好: [],
    言语风格: '',
    头像: '',
    喜欢的类型: '',
    家庭背景: '',
    情感经历: '',
    是否渣型: false,
    世界信息: {},
  }
}

beforeEach(() => {
  语句记录.length = 0
  vi.mocked(debug日志.warn).mockClear()
})

describe('AI 人设性别映射', () => {
  it('规范写法 nv（库内 10565 行主体）必须解析为女性人设', async () => {
    设性别('nv')
    const jieGuo = await huoQuAIJiaoSeXinXi('r1')
    expect(jieGuo).not.toBeNull()
    expect(jieGuo!.xing_bie).toBe('nv')
    expect(jieGuo!.ba_da_mo_kuai.ji_ben_xin_xi).toContain('女')
    expect(jieGuo!.ba_da_mo_kuai.ji_ben_xin_xi).not.toContain('男')
  })

  it.each([
    ['nv', 'nv'],
    ['女', 'nv'],
    ['female', 'nv'],
    ['NV', 'nv'],
    [' Female ', 'nv'],
    ['nan', 'nan'],
    ['男', 'nan'],
    ['male', 'nan'],
    ['MALE', 'nan'],
  ])('六种写法一律归一：%s → %s', async (原始, 期望) => {
    设性别(原始)
    const jieGuo = await huoQuAIJiaoSeXinXi('r1')
    expect(jieGuo!.xing_bie).toBe(期望)
  })

  it.each([['nv'], ['女'], ['female']])('脏写法 %s 清洗前后都必须产出女性人设', async (值) => {
    设性别(值)
    const jieGuo = await huoQuAIJiaoSeXinXi('r1')
    expect(jieGuo!.xing_bie).toBe('nv')
  })

  it('无法识别的性别不得静默按男性喂给模型，必须留警告', async () => {
    设性别('xingBieWeiZhi')
    const jieGuo = await huoQuAIJiaoSeXinXi('r1')
    expect(jieGuo).not.toBeNull()
    expect(['nan', 'nv']).toContain(jieGuo!.xing_bie)
    expect(debug日志.warn).toHaveBeenCalled()
  })
})
