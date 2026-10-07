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

import {
  gouJianGongXiangQianZhui,
  gouJianWriterPrompt,
  jieDuanDaoBeta,
  tongJiYongHuJinQiFengGe,
} from '../Prompt构建器'
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
  wai_mao: '长发',
  xing_ge: '安静',
  bei_jing_gu_shi: '在校生',
  xi_hao: [],
  yan_yu_feng_ge: '口语',
  xing_wei_te_dian: '爱熬夜',
  tou_xiang: '',
  xi_huan_de_lei_xing: '真诚',
  jia_ting_bei_jing: '普通',
  qing_gan_jing_li: '一次',
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

function 好感度(阶段: string): HaoGanDuXinXi {
  return { xin_ren_du: 50, qin_mi_du: 50, qu_wei_du: 50, guan_huai_du: 50, zong_fen: 500, guan_xi_jie_duan: 阶段 }
}

function 构输入(历史: DuiHuaLiShiXiang[], 阶段 = 'shuXi'): AIYinQingShuRu {
  return {
    yong_hu_id: 'u1',
    jiao_se_id: 'j1',
    jiao_se: 角色,
    hao_gan_du: 好感度(阶段),
    dui_hua_li_shi: 历史,
    yong_hu_xin_xiao_xi: '在吗',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: false,
  }
}

describe('FP12 LSM镜像β：风格统计', () => {
  it('纯文本无emoji时emoji占比为0，长度取均值', () => {
    const 历史: DuiHuaLiShiXiang[] = [
      { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '今天好开心', shi_jian: '1' },
      { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '小美', nei_rong: '是吗', shi_jian: '1' },
      { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '哈哈哈真的好开心呀', shi_jian: '1' },
    ]
    const fengGe = tongJiYongHuJinQiFengGe(历史)
    expect(fengGe).not.toBeNull()
    expect(fengGe!.pingJunChangDu).toBe(Math.round(('今天好开心'.length + '哈哈哈真的好开心呀'.length) / 2))
    expect(fengGe!.emojiZhanBi).toBe(0)
    expect(fengGe!.changYongGanTanHao).toBe(false)
    expect(fengGe!.changYongYuQiCi).toContain('哈哈')
  })

  it('emoji占比与常用感叹号判定', () => {
    const 历史: DuiHuaLiShiXiang[] = [
      { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '好耶😍', shi_jian: '1' },
      { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '太好了！', shi_jian: '1' },
    ]
    const fengGe = tongJiYongHuJinQiFengGe(历史)
    expect(fengGe!.emojiZhanBi).toBeGreaterThan(0)
    expect(fengGe!.changYongGanTanHao).toBe(true)
  })

  it('只取最近N条用户消息；无用户消息返回null', () => {
    const 历史: DuiHuaLiShiXiang[] = [
      { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '旧消息一条很长的旧消息', shi_jian: '1' },
      ...Array.from({ length: 12 }, () => ({
        fa_song_zhe_lei_xing: 'yonghu' as const,
        fa_song_zhe_ming: '对方',
        nei_rong: '短',
        shi_jian: '1',
      })),
    ]
    const fengGe = tongJiYongHuJinQiFengGe(历史, 10)
    expect(fengGe!.pingJunChangDu).toBe(1)
    expect(tongJiYongHuJinQiFengGe([])).toBeNull()
  })
})

describe('FP12 LSM镜像β：β档', () => {
  it('热恋/冷淡/中间档', () => {
    expect(jieDuanDaoBeta('reLian')).toBe(0.6)
    expect(jieDuanDaoBeta('shenAi')).toBe(0.6)
    expect(jieDuanDaoBeta('lengDan')).toBe(0.3)
    expect(jieDuanDaoBeta('shuYuan')).toBe(0.3)
    expect(jieDuanDaoBeta('shuXi')).toBe(0.45)
    expect(jieDuanDaoBeta('aiMei')).toBe(0.45)
  })
})

describe('FP12 LSM镜像β：prompt注入', () => {
  const 历史: DuiHuaLiShiXiang[] = [
    { fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '哈哈哈在干嘛', shi_jian: '20:31' },
    { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '小美', nei_rong: '躺着', shi_jian: '20:31' },
  ]

  it('注入行出现且位于关键事件层之后、第三层之前', () => {
    const prompt = gouJianWriterPrompt(构输入(历史))
    expect(prompt).toContain('【对方近期说话特点】')
    const 位置 = prompt.indexOf('【对方近期说话特点】')
    expect(位置).toBeGreaterThan(prompt.indexOf('【刚才聊了什么】'))
    expect(位置).toBeLessThan(prompt.indexOf('【现在的你和这段关系】'))
  })

  it('不进共用前缀（KV缓存不被动）', () => {
    const 输入 = 构输入(历史)
    expect(gouJianGongXiangQianZhui(输入)).not.toContain('【对方近期说话特点】')
    expect(gouJianWriterPrompt(输入).startsWith(gouJianGongXiangQianZhui(输入))).toBe(true)
  })

  it('热恋期贴合强度强于冷淡期', () => {
    const 热恋 = gouJianWriterPrompt(构输入(历史, 'reLian'))
    const 冷淡 = gouJianWriterPrompt(构输入(历史, 'lengDan'))
    expect(热恋).toContain('较明显贴合')
    expect(冷淡).toContain('轻微贴合')
  })

  it('无用户消息时不注入', () => {
    const 全空: DuiHuaLiShiXiang[] = [
      { fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_ming: '小美', nei_rong: '在吗', shi_jian: '1' },
    ]
    expect(gouJianWriterPrompt(构输入(全空))).not.toContain('【对方近期说话特点】')
  })
})
