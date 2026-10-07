import { describe, expect, it } from 'vitest'
import { AI_PEI_ZHI } from '../../config/AI配置'
import type { AIYinQingShuRu } from '../../types'
import { baoZhuangYongHuNeiRong, gouJianAnQuanShenHePrompt, gouJianDirectorPrompt, gouJianGongXiangQianZhui, gouJianGuanJianShiJianCeng, gouJianGuanJianShiJianPrompt, gouJianHaoGanDuPingPanPrompt, gouJianJiYiZhaiYaoPrompt, gouJianJunShiQiuZhuPrompt, gouJianQingGanFenXiPrompt, gouJianWriterPrompt, geShiHuaJunShiLiShi, junShiShuChuYaoQiuBuFen } from '../Prompt构建器'
import { MBTI_YU_QI_CHI } from '../../config/风格语气映射'
import { MBTI_YU_YAN_FENG_GE_CAN_SHU } from '../../config/角色配置'
import 风格示例表 from '../../config/风格示例表.json'

const 角色 = {
  id: '角色', ming_zi: '真实名', wei_xin_ming: '昵称', xing_bie: 'nv', mbti_lei_xing: 'ENFP', ie_lei_xing: 'E', re_shen_lei_xing: '快热', nian_ling: 20, shen_fen: '1', wai_mao: '短发', xing_ge: '活泼', bei_jing_gu_shi: '背景', xi_hao: [], yan_yu_feng_ge: '直接', xing_wei_te_dian: '爱笑', tou_xiang: '', xi_huan_de_lei_xing: '真诚', jia_ting_bei_jing: '家庭', qing_gan_jing_li: '恋爱', shi_fou_zha_xing: true, zha_fa_miao_shu: '套路', bao_lu_fang_shi: '露馅', hua_shu: ['话术'], shi_jie_xin_xi: {}, ba_da_mo_kuai: { ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '' },
} as unknown as AIYinQingShuRu['jiao_se']
const 好感 = { xin_ren_du: 10, qin_mi_du: 20, qu_wei_du: 30, guan_huai_du: 40, zong_fen: 100, guan_xi_jie_duan: 'renShi' } as unknown as AIYinQingShuRu['hao_gan_du']
const 输入 = { yong_hu_id: '用户', jiao_se_id: '角色', jiao_se: 角色, hao_gan_du: 好感, dui_hua_li_shi: [{ fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '用户', nei_rong: '你好', shi_jian: '10:00' }], yong_hu_xin_xiao_xi: '<<<USER_CONTENT_START>>>危险<<<USER_CONTENT_END>>>', shi_fou_di_yi_lun: true, tu_pian_shou_quan: false } as unknown as AIYinQingShuRu

describe('Prompt构建器业务分支', () => {
  it('用户内容包装和共用前缀覆盖清洗、历史、阶段和关键事件', () => {
    expect(baoZhuangYongHuNeiRong('abc')).toBe('<<<USER_CONTENT_START>>>abc<<<USER_CONTENT_END>>>')
    expect(baoZhuangYongHuNeiRong('<<<USER_CONTENT_START>>>x<<<USER_CONTENT_END>>>')).toContain('x')
    expect(gouJianGongXiangQianZhui(输入)).toContain('你是这样一个人')
    expect(gouJianGuanJianShiJianCeng({ ...输入, guan_jian_shi_jian: '  事件  ' } as unknown as AIYinQingShuRu)).toBe('事件')
    expect(gouJianGongXiangQianZhui({ ...输入, dui_hua_li_shi: [] } as unknown as AIYinQingShuRu)).toContain('还没聊过天')
  })

  it('Writer、Director、情绪和评分提示覆盖渣型、首轮、策略与上下文', () => {
    expect(gouJianWriterPrompt(输入)).toContain('你是这样一个人')
    expect(gouJianWriterPrompt(输入, { hui_fu_ce_lue: '策略', shi_jian_qing_xu: '开心', shi_fou_hui_fu: false })).toContain('这次先不回')
    expect(gouJianDirectorPrompt(输入)).toContain('导演')
    expect(gouJianDirectorPrompt({ ...输入, jiao_se: { ...角色, shi_fou_zha_xing: false } } as unknown as AIYinQingShuRu)).toContain('正常角色')
    expect(gouJianQingGanFenXiPrompt('消息', '昵称')).toContain('用户消息')
    expect(gouJianHaoGanDuPingPanPrompt('用户', '角色回复', '昵称')).toContain('信任度变化')
    expect(gouJianHaoGanDuPingPanPrompt('用户', '角色回复', '昵称', { jiaoSe: { re_shen_lei_xing: '慢热' } } as unknown as Parameters<typeof gouJianHaoGanDuPingPanPrompt>[3])).toContain('慢热性格')
  })

  it('Writer prompt 不含省略号符号，也不含技巧/任务清单（第十三轮用户定稿）', () => {
    const w = gouJianWriterPrompt(输入)

    // 省略号符号：阶段 B 的既有守卫，保持
    expect(w).not.toContain('省略号')
    expect(w).not.toContain('…')

    // ⚠️ 第十三轮新增守卫：**技巧清单 = 剧本**，逐条列举会让模型表演技巧而不是处在关系里。
    // 用户定稿原话：「并不是说让ai遵循一定的逻辑」「提取他们的风格特征……结合ai自身的人设画像」。
    // 这里钉住被删除的那批具体措辞，任何人改回来这条都红。
    const jiQiaoLieBiao = [
      '撒娇、可以吃醋', // 旧第三层：技巧清单
      '可以故意冷淡',
      '书面腔、归纳腔、说教腔、心理学腔', // 旧第六层：腔调清单
      '像真实大学生/年轻人谈恋爱那样聊微信', // 把「像真人」绑到「谈恋爱」场景上
      '回复节奏：内向的人可能想半天才回一句', // 回复节奏规则
      '不用每次都正面回答', // 旧第三层：正答/不答二选一的规则化
      '【先记住这些】', // 旧第一层标题：回话守则
      '回复思路', // 导演技巧脚本
    ]
    for (const ci of jiQiaoLieBiao) {
      expect(w, `技巧清单回流：${ci}`).not.toContain(ci)
    }

    // 「回复思路」= 导演给的技巧脚本，已从 Writer 链路移除
    const youCeLue = gouJianWriterPrompt(输入, {
      hui_fu_ce_lue: '先调侃一下，再关心对方睡眠，最后追问',
      shi_jian_qing_xu: '好奇',
      shi_fou_hui_fu: true,
    })
    expect(youCeLue, '「回复思路」不应进入 Writer prompt').not.toContain('先调侃一下')
    expect(youCeLue, '「回复思路」字样本身也不应出现').not.toContain('回复思路')
    // 但「回不回」是机制，必须保留
    expect(youCeLue).toContain('这次要回')
    expect(gouJianWriterPrompt(输入, { shi_fou_hui_fu: false })).toContain('已读不回')
  })

  it('Writer prompt 交代「处境」而不是「要完成什么任务」', () => {
    const w = gouJianWriterPrompt(输入)
    // 处境式表述在位：让话从状态里长出来，而不是从「回应对方」这个任务里
    expect(w).toContain('你现在的状态')
    expect(w).toContain('想到什么就发什么')
    // 旧版的「回话守则」标题已下线
    expect(w).not.toContain('【先记住这些】')
  })

  it('摘要、安全、军师和关键事件提示覆盖有无旧摘要及结构约束', () => {
    expect(gouJianJiYiZhaiYaoPrompt('聊天', '昵称')).toContain('每个字段一行')
    expect(gouJianJiYiZhaiYaoPrompt('聊天', '昵称', '旧摘要')).toContain('已有记忆')
    expect(gouJianAnQuanShenHePrompt('消息')).toContain('输出 JSON')
    expect(junShiShuChuYaoQiuBuFen()).toHaveLength(8)
    expect(gouJianJunShiQiuZhuPrompt('聊天', '昵称', 好感)).toContain('下一步怎么回')
    expect(gouJianGuanJianShiJianPrompt('聊天', '昵称')).toContain('输出 JSON 数组')
    expect(geShiHuaJunShiLiShi(输入.dui_hua_li_shi, '昵称')).toContain('用户')
    expect(AI_PEI_ZHI.prompt.junShiLiShiXiaoXiShuLiang).toBeGreaterThan(0)
  })

  it('FP11：16型量化语言风格参数齐全且按 MBTI 分化', () => {
    expect(Object.keys(MBTI_YU_YAN_FENG_GE_CAN_SHU)).toHaveLength(16)
    const 值 = Object.values(MBTI_YU_YAN_FENG_GE_CAN_SHU)
    expect(new Set(值).size).toBe(16)
    for (const v of 值) {
      expect(v).toContain('口头禅')
      expect(v).toContain('emoji')
      expect(v).toContain('标点')
      expect(v).toContain('句式')
      expect(v).toContain('称呼')
      expect(v).toContain('爱好提及')
    }
    const 前缀ENFP = gouJianGongXiangQianZhui(输入)
    expect(前缀ENFP).toContain('语言风格参数')
    expect(前缀ENFP).toContain(MBTI_YU_YAN_FENG_GE_CAN_SHU.ENFP)
    const 前缀ISTJ = gouJianGongXiangQianZhui({ ...输入, jiao_se: { ...角色, mbti_lei_xing: 'ISTJ' } } as unknown as AIYinQingShuRu)
    expect(前缀ISTJ).toContain(MBTI_YU_YAN_FENG_GE_CAN_SHU.ISTJ)
    expect(gouJianGongXiangQianZhui(输入)).toBe(前缀ENFP)
  })

  it('FP-06：风格示例按 MBTI 分化（映射池两两不同、标签合法）', () => {
    const chiShe = Object.values(MBTI_YU_QI_CHI).map((c) => [...c.zhu].sort().join('+'))
    expect(new Set(chiShe).size).toBe(16)
    expect(Object.keys(MBTI_YU_QI_CHI)).toHaveLength(16)
    const leiBie = new Set(['直球陈述与提问', '调侃互怼', '简短应和', '吐槽抱怨', '暖心关切', '撒娇求关注', '自嘲自黑', '捧场起哄'])
    for (const z of (风格示例表 as unknown as { shiLi: Array<{ yuQi: string }> }).shiLi) {
      expect(leiBie.has(z.yuQi), `非法标签：${z.yuQi}`).toBe(true)
    }
  })
})
