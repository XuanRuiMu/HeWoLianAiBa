import { describe, expect, it } from 'vitest'
import { AI_PEI_ZHI } from '../../config/AI配置'
import { baoZhuangYongHuNeiRong, gouJianAnQuanShenHePrompt, gouJianDirectorPrompt, gouJianGongXiangQianZhui, gouJianGuanJianShiJianCeng, gouJianGuanJianShiJianPrompt, gouJianHaoGanDuPingPanPrompt, gouJianJiYiZhaiYaoPrompt, gouJianJunShiQiuZhuPrompt, gouJianQingGanFenXiPrompt, gouJianWriterPrompt, geShiHuaJunShiLiShi, junShiShuChuYaoQiuBuFen } from '../Prompt构建器'

const 角色 = {
  id: '角色', ming_zi: '真实名', wei_xin_ming: '昵称', xing_bie: 'nv', mbti_lei_xing: 'ENFP', ie_lei_xing: 'E', re_shen_lei_xing: '快热', nian_ling: 20, shen_fen: '1', wai_mao: '短发', xing_ge: '活泼', bei_jing_gu_shi: '背景', xi_hao: [], yan_yu_feng_ge: '直接', xing_wei_te_dian: '爱笑', tou_xiang: '', xi_huan_de_lei_xing: '真诚', jia_ting_bei_jing: '家庭', qing_gan_jing_li: '恋爱', shi_fou_zha_xing: true, zha_fa_miao_shu: '套路', bao_lu_fang_shi: '露馅', hua_shu: ['话术'], shi_jie_xin_xi: {}, ba_da_mo_kuai: { ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '' },
} as never
const 好感 = { xin_ren_du: 10, qin_mi_du: 20, qu_wei_du: 30, guan_huai_du: 40, zong_fen: 100, guan_xi_jie_duan: 'renShi' } as never
const 输入 = { yong_hu_id: '用户', jiao_se_id: '角色', jiao_se: 角色, hao_gan_du: 好感, dui_hua_li_shi: [{ fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '用户', nei_rong: '你好', shi_jian: '10:00' }], yong_hu_xin_xiao_xi: '<<<USER_CONTENT_START>>>危险<<<USER_CONTENT_END>>>', shi_fou_di_yi_lun: true, tu_pian_shou_quan: false } as never

describe('Prompt构建器业务分支', () => {
  it('用户内容包装和共用前缀覆盖清洗、历史、阶段和关键事件', () => {
    expect(baoZhuangYongHuNeiRong('abc')).toBe('<<<USER_CONTENT_START>>>abc<<<USER_CONTENT_END>>>')
    expect(baoZhuangYongHuNeiRong('<<<USER_CONTENT_START>>>x<<<USER_CONTENT_END>>>')).toContain('x')
    expect(gouJianGongXiangQianZhui(输入)).toContain('你是这样一个人')
    expect(gouJianGuanJianShiJianCeng({ ...输入, guan_jian_shi_jian: '  事件  ' } as never)).toBe('事件')
    expect(gouJianGongXiangQianZhui({ ...输入, dui_hua_li_shi: [] } as never)).toContain('还没聊过天')
  })

  it('Writer、Director、情绪和评分提示覆盖渣型、首轮、策略与上下文', () => {
    expect(gouJianWriterPrompt(输入)).toContain('你是这样一个人')
    expect(gouJianWriterPrompt(输入, { hui_fu_ce_lue: '策略', shi_jian_qing_xu: '开心', shi_fou_hui_fu: false })).toContain('这次先不回')
    expect(gouJianDirectorPrompt(输入)).toContain('导演')
    expect(gouJianDirectorPrompt({ ...输入, jiao_se: { ...角色, shi_fou_zha_xing: false } } as never)).toContain('正常角色')
    expect(gouJianQingGanFenXiPrompt('消息', '昵称')).toContain('用户消息')
    expect(gouJianHaoGanDuPingPanPrompt('用户', '角色回复', '昵称')).toContain('信任度变化')
    expect(gouJianHaoGanDuPingPanPrompt('用户', '角色回复', '昵称', { jiaoSe: { re_shen_lei_xing: '慢热' } } as never)).toContain('慢热性格')
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
})
