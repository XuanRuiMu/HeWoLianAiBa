import { describe, it, expect, vi } from 'vitest'

vi.mock('../媒体存储', () => ({
  huoQuBenDiLuJing: (sha: string) => `mock://${sha}`,
}))
vi.mock('../../数据库', () => ({
  数据库: {
    query: async () => ({ rows: [], rowCount: 0 }),
    connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => undefined }),
  },
}))
vi.mock('../../redis', () => ({ redis: { set: vi.fn(), get: vi.fn(), del: vi.fn(), incr: vi.fn(), expire: vi.fn() } }))
vi.mock('../../socket/io', () => ({ huoQuIo: () => null }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
}))
vi.mock('../../config/AI参数策略', () => ({ gouJianJiaoSeShangXiaWen: vi.fn() }))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: vi.fn() }))

import { AI_PEI_ZHI } from '../../config/AI配置'
import { gouJianDirectorPrompt, gouJianGongXiangQianZhui, gouJianWriterPrompt } from '../Prompt构建器'
import { zhanShiLiShiWenBen } from '../对话渲染'
import type { AIJiaoSeXinXi, AIYinQingShuRu, DuiHuaLiShiXiang, HaoGanDuXinXi } from '../../types'

const 角色: AIJiaoSeXinXi = {
  ming_zi: '小美',
  wei_xin_ming: '小美',
  xing_bie: 'nv',
  mbti_lei_xing: 'INFP',
  ie_lei_xing: 'I',
  re_shen_lei_xing: '慢热',
  nian_ling: 20,
  shen_fen: '',
  wai_mao: '长发，个子不高',
  xing_ge: '安静',
  bei_jing_gu_shi: '在校生',
  xi_hao: [],
  yan_yu_feng_ge: '口语',
  xing_wei_te_dian: '爱熬夜',
  tou_xiang: '',
  xi_huan_de_lei_xing: '真诚的人',
  jia_ting_bei_jing: '普通家庭',
  qing_gan_jing_li: '谈过一次',
  shi_fou_zha_xing: false,
  shi_jie_xin_xi: {},
  ba_da_mo_kuai: {
    ji_ben_xin_xi: '',
    wai_mao: '',
    xing_ge: '',
    bei_jing: '',
    yan_yu: '',
    xing_wei: '',
    guan_xi: '',
    xi_tong_ti_shi: '',
  },
}

function 好感度(总分: number, 阶段: string): HaoGanDuXinXi {
  return {
    xin_ren_du: 总分,
    qin_mi_du: 20,
    qu_wei_du: 15,
    guan_huai_du: 10,
    zong_fen: 总分,
    guan_xi_jie_duan: 阶段,
  }
}

function 历史条(序号: number): DuiHuaLiShiXiang {
  return {
    fa_song_zhe_lei_xing: 序号 % 2 === 0 ? 'jiaose' : 'yonghu',
    fa_song_zhe_ming: 序号 % 2 === 0 ? '小美' : '对方',
    nei_rong: `第${序号}条消息内容`,
    shi_jian: '10:00',
  }
}

function 构输入(历史: DuiHuaLiShiXiang[], 最新: string, 总分 = 75, 阶段 = 'renShi'): AIYinQingShuRu {
  return {
    yong_hu_id: 'yong-hu-1',
    jiao_se_id: 'jiao-se-1',
    jiao_se: 角色,
    hao_gan_du: 好感度(总分, 阶段),
    dui_hua_li_shi: 历史,
    yong_hu_xin_xiao_xi: 最新,
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: true,
  }
}

/** 两段文本的公共前缀长度＝官方硬盘缓存能命中的部分（缓存只匹配最长公共前缀） */
function 公共前缀长度(a: string, b: string): number {
  const 上限 = Math.min(a.length, b.length)
  let i = 0
  while (i < 上限 && a[i] === b[i]) i++
  return i
}

const 历史 = [历史条(1), 历史条(2), 历史条(3)]

describe('FP-14 每轮易变字段不得排在历史之前（否则整段历史 cache miss）', () => {
  it('Writer：只变好感度与焦点消息时，公共前缀覆盖整段背景历史', () => {
    const 上轮 = gouJianWriterPrompt(构输入(历史, '在吗', 75, 'renShi'))
    const 本轮 = gouJianWriterPrompt(构输入(历史, '今天好累', 76, 'shuXi'))
    const 公共 = 公共前缀长度(上轮, 本轮)
    const 历史末条位置 = 上轮.indexOf('第2条消息内容')
    expect(历史末条位置).toBeGreaterThan(-1)
    expect(公共).toBeGreaterThan(历史末条位置 + '第2条消息内容'.length)
    expect(上轮.slice(0, 公共)).not.toContain('当前好感数值')
    expect(上轮.slice(0, 公共)).not.toContain('对方刚发给你的消息')
  })

  it('Director：同上，状态段排在【刚才聊了什么】之后', () => {
    const 上轮 = gouJianDirectorPrompt(构输入(历史, '在吗', 75, 'renShi'))
    const 本轮 = gouJianDirectorPrompt(构输入(历史, '今天好累', 90, 'aiMei'))
    const 公共 = 公共前缀长度(上轮, 本轮)
    expect(公共).toBeGreaterThan(上轮.indexOf('第2条消息内容'))
    expect(上轮.indexOf('【刚才聊了什么】')).toBeLessThan(上轮.indexOf('当前好感数值'))
  })

  it('人设与历史完全不变时，两轮 prompt 前缀一致到历史段末尾', () => {
    const a = gouJianWriterPrompt(构输入(历史, '在吗', 75))
    const b = gouJianWriterPrompt(构输入(历史, '在吗', 75))
    expect(a).toBe(b)
  })

  it('Writer 与 Director 共用同一段前缀（导演建的缓存同轮内 Writer 可复用）', () => {
    const 输入 = 构输入(历史, '在吗', 75)
    const 前缀 = gouJianGongXiangQianZhui(输入)
    expect(前缀.length).toBeGreaterThan(0)
    expect(gouJianWriterPrompt(输入).startsWith(前缀)).toBe(true)
    expect(gouJianDirectorPrompt(输入).startsWith(前缀)).toBe(true)
    // 共用段里不得混进任何一侧的专属指令，否则两侧互相打穿缓存
    expect(前缀).not.toContain('不要 JSON')
    expect(前缀).not.toContain('只输出 JSON')
    expect(前缀).not.toContain('对方刚发给你的消息')
    expect(前缀).not.toContain('当前好感数值')
  })
})

describe('FP-14 历史窗口按步长批量淘汰，保证多轮之间前缀稳定', () => {
  const 选项 = { 角色名: '小美', 用户名: '对方', 最多条数: 200 }
  const 渲染首条序号 = (条数: number) => {
    const 文本 = zhanShiLiShiWenBen(
      Array.from({ length: 条数 }, (_, i) => 历史条(i + 1)),
      选项,
    )
    return Number(/第(\d+)条消息内容/.exec(文本)?.[1])
  }

  it('未超上限时全量保留', () => {
    expect(渲染首条序号(180)).toBe(1)
    expect(渲染首条序号(200)).toBe(1)
  })

  it('刚超上限时不逐条丢，攒满一个步长才整体前移', () => {
    const 步长 = AI_PEI_ZHI.prompt.liShiCaiDuanBuZhang
    expect(步长).toBeGreaterThan(1)
    for (const 条数 of [201, 220, 200 + 步长 - 1]) {
      expect(渲染首条序号(条数), `条数 ${条数}`).toBe(1)
    }
    expect(渲染首条序号(200 + 步长)).toBe(步长 + 1)
  })

  it('窗口长度始终不超过上限+步长', () => {
    const 上限 = AI_PEI_ZHI.prompt.liShiXiaoXiShuLiang
    const 文本 = zhanShiLiShiWenBen(
      Array.from({ length: 上限 + 999 }, (_, i) => 历史条(i + 1)),
      { 角色名: '小美', 用户名: '对方', 最多条数: 上限 },
    )
    expect(文本.split('\n').length).toBeLessThanOrEqual(上限 + AI_PEI_ZHI.prompt.liShiCaiDuanBuZhang)
  })

  it('空历史仍返回空串', () => {
    expect(zhanShiLiShiWenBen([], 选项)).toBe('')
  })
})

describe('FP-14 取数窗口每轮滑动时，历史前缀仍按批稳定（真实链路形状）', () => {
  const 上限 = AI_PEI_ZHI.prompt.liShiXiaoXiShuLiang
  const 步长 = AI_PEI_ZHI.prompt.liShiCaiDuanBuZhang
  const 全部 = (条数: number): DuiHuaLiShiXiang[] =>
    Array.from({ length: 条数 }, (_, i) => ({
      fa_song_zhe_lei_xing: i % 2 === 0 ? 'yonghu' : 'jiaose',
      fa_song_zhe_ming: i % 2 === 0 ? '对方' : '小美',
      nei_rong: `第${i + 1}条`,
      shi_jian: '10:00',
      duiHuaZongTiaoShu: 条数,
    }))
  /** 复刻 huoQuZuiJinDuiHuaLiShi：只取最后「上限+步长」条，窗口每轮整体滑动一条 */
  const 取数后渲染 = (条数: number) =>
    zhanShiLiShiWenBen(全部(条数).slice(-(上限 + 步长)), { 角色名: '小美', 用户名: '对方', 最多条数: 上限 })

  it('连续步长轮之间历史文本严格追加（前缀不变，缓存可命中）', () => {
    // T ∈ [上限+步长, 上限+2×步长-1] 属同一批，起点绝对索引恒为 步长
    const 首轮 = 取数后渲染(上限 + 步长)
    for (let 条数 = 上限 + 步长 + 1; 条数 < 上限 + 步长 * 2; 条数++) {
      const 本轮 = 取数后渲染(条数)
      expect(本轮.startsWith(首轮), `第 ${条数} 条轮次的前缀被打断了`).toBe(true)
      expect(本轮).toContain(`第${条数}条`)
    }
  })

  it('攒满一个步长才一次性前移，而不是每轮丢一条', () => {
    const 前 = 取数后渲染(上限 + 步长 * 2 - 1)
    const 后 = 取数后渲染(上限 + 步长 * 2)
    expect(前).toContain(`第${步长 + 1}条`)
    expect(后).not.toContain(`第${步长 + 1}条`)
    expect(后).toContain(`第${步长 * 2 + 1}条`)
    expect(后.match(/第\d+条/g)!.length).toBeLessThanOrEqual(上限 + 步长)
  })

  it('缺少总条数时退回按长度对齐（内存构造的历史/旧数据路径不报错）', () => {
    const 无总条数 = 全部(上限 + 步长 + 5).map((项) => ({ ...项, duiHuaZongTiaoShu: undefined }))
    const 文本 = zhanShiLiShiWenBen(无总条数, { 角色名: '小美', 用户名: '对方', 最多条数: 上限 })
    expect(文本.match(/第\d+条/g)!.length).toBeLessThanOrEqual(上限 + 步长)
    expect(文本).toContain(`第${步长 + 1}条`)
    expect(文本).not.toContain('第1条')
  })
})
