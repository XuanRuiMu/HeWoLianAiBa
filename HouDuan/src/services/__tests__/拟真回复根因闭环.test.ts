import { describe, expect, it, vi, beforeEach } from 'vitest'
import { yunXingAIYinQing } from '../AI引擎'
import { sheZhiMockTiaoYong } from '../../utils/通用模型调用'
import type { AIYinQingShuRu } from '../../types'

vi.mock('../Writer', () => ({ shengChengWriterHuiFu: vi.fn() }))

function 造输入(liShi: string[] = [], xiaoXi = '哈哈'): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: {
      id: 'j-1',
      ming_zi: '罗一帆',
      wei_xin_ming: '南风',
      xing_bie: 'nan',
      mbti_lei_xing: 'ENFP',
      ie_lei_xing: 'E',
      re_shen_lei_xing: '快热',
      nian_ling: 18,
      shen_fen: '大学生',
      wai_mao: '眼睛有光',
      xing_ge: '热情',
      bei_jing_gu_shi: '',
      xi_hao: ['拍照'],
      yan_yu_feng_ge: '跳跃',
      xing_wei_te_dian: '',
      tou_xiang: '',
      xi_huan_de_lei_xing: '',
      jia_ting_bei_jing: '',
      qing_gan_jing_li: '',
      shi_fou_zha_xing: false,
      shi_jie_xin_xi: {},
    },
    hao_gan_du: {
      xin_ren_du: 160,
      qin_mi_du: 112,
      qu_wei_du: 88,
      guan_huai_du: 92,
      zong_fen: 463,
      guan_xi_jie_duan: '朋友',
    },
    dui_hua_li_shi: liShi.map((neiRong, xuHao) => ({
      id: `j-${xuHao}`,
      fa_song_zhe_lei_xing: 'jiaose',
      fa_song_zhe_ming: '南风',
      nei_rong: neiRong,
      shi_jian: '12:00',
      yi_che_hui: false,
      beiYongXiaoXiId: null,
    })),
    yong_hu_xin_xiao_xi: xiaoXi,
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: true,
    yong_hu_xing_bie: 'nan',
  } as unknown as AIYinQingShuRu
}

describe('重复回复由生成层消化，不改写用户可见文本', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sheZhiMockTiaoYong(null)
  })

  it('开头命中近期角色消息时重生成一次，并通过专用纠正层注入提示', async () => {
    const { shengChengWriterHuiFu } = await import('../Writer')
    const 调用内容: string[] = []
    const 重试纠正列表: (string | undefined)[] = []
    vi.mocked(shengChengWriterHuiFu).mockImplementation(async (shuRu, ceLue) => {
      const tiShiCi = await (await import('../Prompt构建器')).gouJianWriterPrompt(shuRu, ceLue)
      调用内容.push(tiShiCi)
      重试纠正列表.push(shuRu.shengChengJiuCuo)
      const shiChongFu = Boolean(shuRu.shengChengJiuCuo?.includes('相似开头'))
      return {
        xiao_xi_lie_biao: [shiChongFu ? '今天我也在忙，你先说。' : '被你看穿了，我刚躺下。'],
        yuan_wen: shiChongFu ? '今天我也在忙，你先说。' : '被你看穿了，我刚躺下。',
      }
    })

    const jieGuo = await yunXingAIYinQing(造输入([
      '被你看穿了，我刚躺下。',
      '被你看穿了，你也早点睡。',
      '被你看穿了，我给你讲个笑话。',
    ]))

    expect(调用内容).toHaveLength(2)
    expect(重试纠正列表[1]).toContain('相似开头')
    expect(调用内容[1]).toContain('【生成纠正】')
    expect(调用内容[1]).toContain('换个角度')
    expect(jieGuo.xiao_xi_lie_biao).toEqual(['今天我也在忙，你先说。'])
  })

  it('重试仍有重复开头也保留新结果，并为必答问题加入强调和重复修正', async () => {
    const { shengChengWriterHuiFu } = await import('../Writer')
    const 输入列表: AIYinQingShuRu[] = []
    vi.mocked(shengChengWriterHuiFu).mockImplementation(async (shuRu) => {
      输入列表.push(shuRu)
      return {
        xiao_xi_lie_biao: ['被你看穿了，认识，玄锐暮是一位22岁的AI程序员。'],
        yuan_wen: '被你看穿了，认识，玄锐暮是一位22岁的AI程序员。',
      }
    })

    const jieGuo = await yunXingAIYinQing(造输入(['被你看穿了，我刚躺下'], '你认识玄锐暮吗'))

    expect(shengChengWriterHuiFu).toHaveBeenCalledTimes(2)
    expect(输入列表[1]?.shengChengJiuCuo).toContain('相似开头')
    expect(输入列表[1]?.bi_da_shi_shi?.zhong_shi).toBe(true)
    expect(jieGuo.xiao_xi_lie_biao.join('')).toContain('玄锐暮')
  })

  it('必答事实也正常走事实重试，二次未答仍回退原文', async () => {
    const { shengChengWriterHuiFu } = await import('../Writer')
    vi.mocked(shengChengWriterHuiFu).mockResolvedValue({
      xiao_xi_lie_biao: ['我也不太确定'],
      yuan_wen: '我也不太确定',
    })

    const jieGuo = await yunXingAIYinQing(造输入([
      '被你看穿了，我刚躺下。',
    ], '你认识玄锐暮吗'))

    expect(shengChengWriterHuiFu).toHaveBeenCalledTimes(2)
    expect(jieGuo.xiao_xi_lie_biao.join('')).toContain('玄锐暮')
  })

  it('全部命中过滤词时保留必答事实，不产生空回复', async () => {
    const { shengChengWriterHuiFu } = await import('../Writer')
    vi.mocked(shengChengWriterHuiFu).mockResolvedValue({
      xiao_xi_lie_biao: ['作为 AI 我不回答这个问题'],
      yuan_wen: '作为 AI 我不回答这个问题',
    })

    const jieGuo = await yunXingAIYinQing(造输入([], '你认识玄锐暮吗'))
    expect(jieGuo.xiao_xi_lie_biao).toHaveLength(1)
    expect(jieGuo.shi_fou_hui_fu).toBe(true)
  })

  it('模型调用失败时返回故障信息，而不是静默已读不回', async () => {
    const { shengChengWriterHuiFu } = await import('../Writer')
    vi.mocked(shengChengWriterHuiFu).mockRejectedValue(new Error('模型连接中断'))

    const jieGuo = await yunXingAIYinQing(造输入([], '在吗'))
    expect(jieGuo.xiao_xi_lie_biao).toEqual([])
    expect(jieGuo.cuo_wu_xin_xi).toBe('消息没发出去，稍等再试')
  })
})
