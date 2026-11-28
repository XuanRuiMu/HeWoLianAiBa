import { describe, expect, it, vi } from 'vitest'

const 历史 = vi.hoisted(() => ({ 值: [] as Array<{ fa_song_zhe_lei_xing: string; nei_rong: string }> }))

vi.mock('../AI输入准备', () => ({
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => 历史.值),
}))

vi.mock('../../utils/通用模型调用', () => ({
  按配置调用: vi.fn(async () => ({ neiRong: JSON.stringify({ 行为: '有效交流', 信任度变化: 5, 亲密度变化: 3, 趣味度变化: 2, 关怀度变化: 2, 理由: 'ok' }) })),
}))

vi.mock('../冲突弧', () => ({ huoQuChongTuXinXi: vi.fn(async () => null), ChongTuZhuangTaiZhongWen: {}, ChongTuWanFaPeiZhi: {} }))
vi.mock('../好感度', () => ({ huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 300, 互动次数: 6 })) }))
vi.mock('../好感度缓存', () => ({ jiSuanXiShu: vi.fn(async () => ({ xiShu: 1, muBiaoQuXian: 0, lianXuWeiDaBiao: 0, pingJunShuaiJianHou: 0 })), yingYongHuiHuaBaoDi: vi.fn(async (_j: string, g: unknown) => g) }))
vi.mock('../重试队列', () => ({ paiRuZhongShiDuiLie: vi.fn(async () => undefined) }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }, jiLuHaoGanDuBianHua: vi.fn(), jiLuSocketShiJian: vi.fn(), jiLuXiaoXiCaoZuo: vi.fn() }))

import { 按配置调用 } from '../../utils/通用模型调用'
import { pingPanHaoGanDuBianHuaNei } from '../好感度评判'

function 取提示词(): string {
  const 调用 = vi.mocked(按配置调用).mock.calls[0]
  const 消息 = 调用[1] as Array<{ jiaoSe: string; neiRong: string }>
  return 消息.find((m) => m.jiaoSe === 'user')?.neiRong ?? ''
}

const 当前消息 = '看你资料挺酷的，平时周末一般都干嘛呢'
const 当前回复 = '嗯…跟同学打球，要么就去打零工'

describe('评判历史不含当前轮（假复读误判回归）', () => {
  it('历史块剔除当前用户消息和当前角色回复，只保留更早对话', async () => {
    历史.值 = [
      { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '兄弟你好啊，刚刷到这个应用' },
      { fa_song_zhe_lei_xing: 'jiaose', nei_rong: '嗯…哈喽' },
      { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '先说好，我不太会聊天' },
      { fa_song_zhe_lei_xing: 'jiaose', nei_rong: '嗯…不会啦' },
      { fa_song_zhe_lei_xing: 'yonghu', nei_rong: 当前消息 },
      { fa_song_zhe_lei_xing: 'jiaose', nei_rong: 当前回复 },
    ]
    await pingPanHaoGanDuBianHuaNei(当前消息, 当前回复, '对方', undefined, undefined, 'u', 'j')
    const 提示词 = 取提示词()
    const 历史块 = 提示词.split('【本轮之前的聊天')[1]?.split('重要：')[0] ?? ''
    expect(历史块).toContain('兄弟你好啊')
    expect(历史块).not.toContain(当前消息)
    expect(历史块).not.toContain(当前回复)
  })

  it('角色回复拆成文字+表情包多条时，当前轮整段都被剔除', async () => {
    历史.值 = [
      { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '更早的消息' },
      { fa_song_zhe_lei_xing: 'jiaose', nei_rong: '更早的回复' },
      { fa_song_zhe_lei_xing: 'yonghu', nei_rong: 当前消息 },
      { fa_song_zhe_lei_xing: 'jiaose', nei_rong: 当前回复 },
      { fa_song_zhe_lei_xing: 'jiaose', nei_rong: '[表情包:小人快来呀]' },
    ]
    await pingPanHaoGanDuBianHuaNei(当前消息, 当前回复, '对方', undefined, undefined, 'u', 'j')
    const 提示词 = 取提示词()
    const 历史块 = 提示词.split('【本轮之前的聊天')[1]?.split('重要：')[0] ?? ''
    expect(历史块).toContain('更早的消息')
    expect(历史块).not.toContain(当前消息)
    expect(历史块).not.toContain(当前回复)
    expect(历史块).not.toContain('表情包')
  })

  it('历史块标题不再引导复读检测', async () => {
    历史.值 = [
      { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '更早的消息' },
      { fa_song_zhe_lei_xing: 'yonghu', nei_rong: 当前消息 },
      { fa_song_zhe_lei_xing: 'jiaose', nei_rong: 当前回复 },
    ]
    await pingPanHaoGanDuBianHuaNei(当前消息, 当前回复, '对方', undefined, undefined, 'u', 'j')
    const 提示词 = 取提示词()
    expect(提示词).toContain('不包含你正在评判的这条消息')
    expect(提示词).not.toContain('用来判断这条消息是否在复读/刷屏/答非所问')
  })

  it('免责声明明确禁止用角色冷淡反推用户', async () => {
    历史.值 = [{ fa_song_zhe_lei_xing: 'yonghu', nei_rong: 当前消息 }, { fa_song_zhe_lei_xing: 'jiaose', nei_rong: 当前回复 }]
    await pingPanHaoGanDuBianHuaNei(当前消息, 当前回复, '对方', undefined, undefined, 'u', 'j')
    expect(取提示词()).toContain('不要根据角色回复的情绪或冷淡程度反推用户')
  })
})
