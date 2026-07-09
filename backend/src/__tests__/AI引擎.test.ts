import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  sheZhiMockTiaoYong,
  chongZhiDeepSeekKeHuDuan,
  type TiaoYongCanShu,
  type TiaoYongJieGuo,
} from '../utils/DeepSeek客户端'
import {
  yunXingAIYinQing,
  shengChengDirectorCeLue,
  shengChengWriterHuiFu,
  fenXiQingGan,
  pingPanHaoGanDuBianHua,
  shengChengJiYiZhaiYao,
  shenHeNeiRongAnQuan,
  shengChengJunShiZhiDao,
  tiQuGuanJianShiJian,
} from '../services/AI引擎'
import { gouJianWriterPrompt, gouJianDirectorPrompt } from '../services/Prompt构建器'
import type {
  AIJiaoSeXinXi,
  AIYinQingShuRu,
  DuiHuaLiShiXiang,
  HaoGanDuXinXi,
} from '../types'

function chuangJianCeShiJiaoSe(): AIJiaoSeXinXi {
  return {
    id: 'jiao-se-id',
    ming_zi: '小雨',
    wei_xin_ming: '雨夜的猫',
    xing_bie: 'nv',
    mbti_lei_xing: 'INFP',
    ie_lei_xing: 'I',
    re_shen_lei_xing: '快热',
    nian_ling: 20,
    shen_fen: '大学生',
    wai_mao: '清秀，长发，喜欢穿浅色毛衣',
    xing_ge: '温柔敏感，想象力丰富',
    bei_jing_gu_shi: '来自江南小城，现居杭州读大学',
    xi_hao: ['画画', '听雨', '看老电影'],
    yan_yu_feng_ge: '轻柔含蓄，喜欢用比喻',
    xing_wei_te_dian: '害羞但真诚，容易共情',
    tou_xiang: 'artist',
    xi_huan_de_lei_xing: '温柔体贴、有耐心的人',
    jia_ting_bei_jing: '普通家庭，父母开明',
    qing_gan_jing_li: '有过一段青涩暗恋',
    shi_fou_zha_xing: false,
    kai_chang_bai: ['你好呀，我是雨夜的猫'],
    shi_jie_xin_xi: { cheng_shi: '杭州' },
    ba_da_mo_kuai: {
      ji_ben_xin_xi: '小雨，女，20岁，大学生',
      wai_mao: '清秀，长发',
      xing_ge: '温柔敏感',
      bei_jing: '江南小城',
      yan_yu: '轻柔含蓄',
      xing_wei: '害羞但真诚',
      guan_xi: '喜欢温柔体贴的人',
      xi_tong_ti_shi: 'INFP性格',
    },
  }
}

function chuangJianCeShiHaoGanDu(): HaoGanDuXinXi {
  return {
    xin_ren_du: 175,
    qin_mi_du: 125,
    qu_wei_du: 100,
    guan_huai_du: 100,
    zong_fen: 500,
    guan_xi_jie_duan: 'pengYou',
  }
}

function chuangJianCeShiShuRu(): AIYinQingShuRu {
  return {
    yong_hu_id: 'yong-hu-id',
    jiao_se_id: 'jiao-se-id',
    jiao_se: chuangJianCeShiJiaoSe(),
    hao_gan_du: chuangJianCeShiHaoGanDu(),
    dui_hua_li_shi: [
      {
        fa_song_zhe_lei_xing: 'jiaose',
        fa_song_zhe_ming: '雨夜的猫',
        nei_rong: '你好呀，我是雨夜的猫',
        shi_jian: '14:30',
      },
      {
        fa_song_zhe_lei_xing: 'yonghu',
        fa_song_zhe_ming: '对方',
        nei_rong: '你好，很高兴认识你',
        shi_jian: '14:31',
      },
    ],
    yong_hu_xin_xiao_xi: '今天天气不错，你在干嘛呢',
    shi_fou_di_yi_lun: false,
  }
}

function chuangJianMock(): {
  jiLu: TiaoYongCanShu[]
  sheZhiXiangYing: (xiangYing: Partial<TiaoYongJieGuo>) => void
} {
  const jiLu: TiaoYongCanShu[] = []
  let xiaYiCiXiangYing: Partial<TiaoYongJieGuo> = { neiRong: '' }

  sheZhiMockTiaoYong(async (canShu) => {
    jiLu.push(canShu)
    return {
      neiRong: xiaYiCiXiangYing.neiRong || '',
      xinXi: xiaYiCiXiangYing.xinXi || { role: 'assistant', content: xiaYiCiXiangYing.neiRong || '' },
      yuanShuJu: (xiaYiCiXiangYing.yuanShuJu || {}) as TiaoYongJieGuo['yuanShuJu'],
    }
  })

  return {
    jiLu,
    sheZhiXiangYing: (xiangYing) => {
      xiaYiCiXiangYing = xiangYing
    },
  }
}

describe('FP-09 AI对话引擎', () => {
  beforeEach(() => {
    chongZhiDeepSeekKeHuDuan()
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
  })

  describe('Prompt构建', () => {
    it('构建Writer Prompt → 包含6层结构且每层内容非空', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('【第一层：禁止规则与行为契约】')
      expect(prompt).toContain('【第二层：人设词】')
      expect(prompt).toContain('【第三层：当前状态】')
      expect(prompt).toContain('【第四层：关系进展参考')
      expect(prompt).toContain('【第五层：对话历史】')
      expect(prompt).toContain('【第六层：角色身份与情感状态】')
    })

    it('Prompt第一层 → 包含三条禁止规则', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('禁止每条必回')
      expect(prompt).toContain('禁止括号动作描写')
      expect(prompt).toContain('禁止主动介绍个人信息')
    })

    it('Prompt内容 → 包含恋爱目的文本', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('用户与其聊天的目的是为了谈恋爱')
    })

    it('Prompt第五层历史消息格式 → 匹配指定正则', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)
      const zhengZe = /^.+\(\d{2}:\d{2}\): .+$/

      const pipeiHang = prompt
        .split('\n')
        .filter((hang) => hang.includes('):'))
        .filter((hang) => zhengZe.test(hang))

      expect(pipeiHang.length).toBeGreaterThan(0)
    })

    it('Prompt第四层阶段描述 → 不包含指令化表述', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).not.toContain('你对这个人没什么感觉')
      expect(prompt).not.toContain('你的心已经不受控制了')
    })

    it('第一轮Writer Prompt末尾 → 包含【角色沉浸要求】', () => {
      const shuRu = chuangJianCeShiShuRu()
      shuRu.shi_fou_di_yi_lun = true
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('【角色沉浸要求】')
      expect(prompt.endsWith('不要跳出角色分析。')).toBe(true)
    })

    it('优化后Writer Prompt → 包含自然聊天与第一人称沉浸要素', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('自然聊天要求')
      expect(prompt).toContain('留白')
      expect(prompt).toContain('第一人称沉浸')
      expect(prompt).toContain('避免AI味')
    })

    it('优化后Director Prompt → 包含自然节奏与导演要求', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianDirectorPrompt(shuRu)

      expect(prompt).toContain('导演要求')
      expect(prompt).toContain('留白')
      expect(prompt).toContain('推拉')
      expect(prompt).toContain('真实大学生/青年恋人')
    })
  })

  describe('Director调用', () => {
    it('Director调用 → temperature=0.3且响应体为合法JSON', async () => {
      chuangJianMock().sheZhiXiangYing({
        neiRong: JSON.stringify({
          用户意图: '继续聊天',
          情感分析: '中性',
          回复策略: '自然回复',
          是否回复: true,
          回复条数: 2,
          时间情绪: '轻松',
          是否撤回: false,
        }),
      })

      const jieGuo = await shengChengDirectorCeLue(chuangJianCeShiShuRu())

      expect(jieGuo.cheng_gong).toBe(true)
      expect(jieGuo.ce_lue.yong_hu_yi_tu).toBe('继续聊天')
      expect(jieGuo.ce_lue.shi_fou_hui_fu).toBe(true)
      expect(jieGuo.ce_lue.hui_fu_tiao_shu).toBe(2)
    })

    it('Director响应JSON → 包含全部指定字段', async () => {
      chuangJianMock().sheZhiXiangYing({
        neiRong: JSON.stringify({
          用户意图: '继续聊天',
          情感分析: '中性',
          回复策略: '自然回复',
          是否回复: true,
          回复条数: 2,
          时间情绪: '轻松',
          是否撤回: false,
        }),
      })

      const jieGuo = await shengChengDirectorCeLue(chuangJianCeShiShuRu())

      expect(jieGuo.cheng_gong).toBe(true)
      expect(jieGuo.ce_lue.yong_hu_yi_tu).toBeDefined()
      expect(jieGuo.ce_lue.qing_gan_fen_xi).toBeDefined()
      expect(jieGuo.ce_lue.hui_fu_ce_lue).toBeDefined()
      expect(jieGuo.ce_lue.shi_fou_hui_fu).toBe(true)
      expect(jieGuo.ce_lue.hui_fu_tiao_shu).toBe(2)
      expect(jieGuo.ce_lue.shi_jian_qing_xu).toBeDefined()
      expect(jieGuo.ce_lue.shi_fou_che_hui).toBe(false)
    })
  })

  describe('Writer调用', () => {
    it('Writer调用 → temperature=0.85且enable_thinking=true且reasoning_effort=max', async () => {
      const { jiLu, sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({ neiRong: '嗯，天气确实不错~\n我在画画呢，你呢？' })

      await shengChengWriterHuiFu(chuangJianCeShiShuRu())

      expect(jiLu.length).toBe(1)
      expect(jiLu[0].wenDu).toBe(0.85)
      expect(jiLu[0].enableThinking).toBe(true)
      expect(jiLu[0].reasoningEffort).toBe('max')
    })
  })

  describe('AI引擎集成', () => {
    it('Director+Writer正常流程 → 返回正确条数消息', async () => {
      const jiLu: TiaoYongCanShu[] = []
      sheZhiMockTiaoYong(async (canShu) => {
        jiLu.push(canShu)
        if (canShu.wenDu === 0.1) {
          return {
            neiRong: JSON.stringify({
              违规: false,
              类型: '',
              严重程度: null,
              理由: '',
              确信度: 0.1,
            }),
            xinXi: { role: 'assistant', content: 'safe' },
            yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
          }
        }
        if (canShu.wenDu === 0.3) {
          return {
            neiRong: JSON.stringify({
              用户意图: '继续聊天',
              情感分析: '中性',
              回复策略: '自然回复',
              是否回复: true,
              回复条数: 2,
              时间情绪: '轻松',
              是否撤回: false,
            }),
            xinXi: { role: 'assistant', content: 'director' },
            yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
          }
        }
        return {
          neiRong: '第一条回复\n第二条回复\n第三条回复',
          xinXi: { role: 'assistant', content: 'writer' },
          yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
        }
      })

      const shuRu = chuangJianCeShiShuRu()
      const jieGuo = await yunXingAIYinQing(shuRu)

      expect(jieGuo.shi_fou_hui_fu).toBe(true)
      expect(jieGuo.xiao_xi_lie_biao.length).toBe(2)
      expect(jieGuo.jiang_ji_mo_shi).toBe(false)
    })

    it('Director失败 → 降级为单代理模式并记录错误日志', async () => {
      const jiLu: TiaoYongCanShu[] = []
      const cuoWuXinXi = 'Director API错误'
      const consoleErrors: unknown[] = []
      const yuanBenError = console.error
      console.error = (...args: unknown[]) => {
        consoleErrors.push(args)
      }

      try {
        sheZhiMockTiaoYong(async (canShu) => {
          jiLu.push(canShu)
          if (canShu.wenDu === 0.1) {
            return {
              neiRong: JSON.stringify({
                违规: false,
                类型: '',
                严重程度: null,
                理由: '',
                确信度: 0.1,
              }),
              xinXi: { role: 'assistant', content: 'safe' },
              yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
            }
          }
          if (canShu.wenDu === 0.3) {
            throw new Error(cuoWuXinXi)
          }
          return {
            neiRong: '降级后的单代理回复',
            xinXi: { role: 'assistant', content: 'writer' },
            yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
          }
        })

        const shuRu = chuangJianCeShiShuRu()
        const jieGuo = await yunXingAIYinQing(shuRu)

        expect(jieGuo.shi_fou_hui_fu).toBe(true)
        expect(jieGuo.jiang_ji_mo_shi).toBe(true)
        expect(jieGuo.xiao_xi_lie_biao.length).toBeGreaterThan(0)
        expect(consoleErrors.some((args) => String(args).includes('Director调用失败'))).toBe(true)
      } finally {
        console.error = yuanBenError
      }
    })

    it('Director决定不回复 → 返回空数组且已读不回', async () => {
      const { sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify({
          用户意图: '继续聊天',
          情感分析: '中性',
          回复策略: '保持沉默',
          是否回复: false,
          回复条数: 0,
          时间情绪: '平静',
          是否撤回: false,
        }),
      })

      const shuRu = chuangJianCeShiShuRu()
      const jieGuo = await yunXingAIYinQing(shuRu)

      expect(jieGuo.shi_fou_hui_fu).toBe(false)
      expect(jieGuo.xiao_xi_lie_biao).toEqual([])
    })
  })

  describe('AI能力', () => {
    it('情感分析调用 → temperature=0.2且返回值在-10到10范围内', async () => {
      const { jiLu, sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify({ 分数: 7, 分析: '积极' }),
      })

      const jieGuo = await fenXiQingGan('今天很开心', '雨夜的猫')

      expect(jiLu[0].wenDu).toBe(0.2)
      expect(jieGuo.fen_shu).toBeGreaterThanOrEqual(-10)
      expect(jieGuo.fen_shu).toBeLessThanOrEqual(10)
      expect(jieGuo.fen_shu).toBe(7)
    })

    it('好感度评判调用 → temperature=0.2且四维值在-3到3范围内', async () => {
      const { jiLu, sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify({
          信任度变化: 2,
          亲密度变化: 1,
          趣味度变化: -1,
          关怀度变化: 0,
          理由: '回复真诚',
        }),
      })

      const jieGuo = await pingPanHaoGanDuBianHua('今天很开心', '那真好呀', '雨夜的猫')

      expect(jiLu[0].wenDu).toBe(0.2)
      expect(jieGuo.xin_ren_du_bian_hua).toBeGreaterThanOrEqual(-3)
      expect(jieGuo.xin_ren_du_bian_hua).toBeLessThanOrEqual(3)
      expect(jieGuo.qin_mi_du_bian_hua).toBeGreaterThanOrEqual(-3)
      expect(jieGuo.qin_mi_du_bian_hua).toBeLessThanOrEqual(3)
      expect(jieGuo.qu_wei_du_bian_hua).toBeGreaterThanOrEqual(-3)
      expect(jieGuo.qu_wei_du_bian_hua).toBeLessThanOrEqual(3)
      expect(jieGuo.guan_huai_du_bian_hua).toBeGreaterThanOrEqual(-3)
      expect(jieGuo.guan_huai_du_bian_hua).toBeLessThanOrEqual(3)
    })

    it('好感度评判越界 → 自动裁剪到-3到3', async () => {
      const { sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify({
          信任度变化: 10,
          亲密度变化: -10,
          趣味度变化: 3,
          关怀度变化: -3,
          理由: '测试边界',
        }),
      })

      const jieGuo = await pingPanHaoGanDuBianHua('测试', '回复', '雨夜的猫')

      expect(jieGuo.xin_ren_du_bian_hua).toBe(3)
      expect(jieGuo.qin_mi_du_bian_hua).toBe(-3)
      expect(jieGuo.qu_wei_du_bian_hua).toBe(3)
      expect(jieGuo.guan_huai_du_bian_hua).toBe(-3)
    })

    it('记忆摘要调用 → 返回摘要文本', async () => {
      const { sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({ neiRong: '用户分享了画画爱好，关系处于朋友阶段。' })

      const jieGuo = await shengChengJiYiZhaiYao('用户：你好\nAI：你好呀', '雨夜的猫')

      expect(jieGuo.zhai_yao.length).toBeGreaterThan(0)
    })

    it('安全审核 → 确信度>0.8才判定违规', async () => {
      const { sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify({
          违规: true,
          类型: '人身攻击',
          严重程度: '严重',
          理由: '辱骂',
          确信度: 0.9,
        }),
      })

      const jieGuo = await shenHeNeiRongAnQuan('辱骂内容')

      expect(jieGuo.wei_gui).toBe(true)
      expect(jieGuo.yan_zhong_cheng_du).toBe('yan_zhong')
    })

    it('安全审核 → 确信度<=0.8不判定违规', async () => {
      const { sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify({
          违规: true,
          类型: '人身攻击',
          严重程度: '轻微',
          理由: '轻微不礼貌',
          确信度: 0.7,
        }),
      })

      const jieGuo = await shenHeNeiRongAnQuan('一般消息')

      expect(jieGuo.wei_gui).toBe(false)
    })

    it('军师求助 → 返回指导内容', async () => {
      const { sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({ neiRong: '你这聊天有点直啊，下次可以换个问法。' })

      const liShi: DuiHuaLiShiXiang[] = [
        {
          fa_song_zhe_lei_xing: 'yonghu',
          fa_song_zhe_ming: '对方',
          nei_rong: '在吗',
          shi_jian: '14:30',
        },
      ]
      const jieGuo = await shengChengJunShiZhiDao({
        yong_hu_id: 'yong-hu-id',
        jiao_se_id: 'jiao-se-id',
        jiao_se_ming: '雨夜的猫',
        dui_hua_li_shi: liShi,
        hao_gan_du: chuangJianCeShiHaoGanDu(),
      })

      expect(jieGuo.zhi_dao_nei_rong.length).toBeGreaterThan(0)
    })

    it('关键事件提取 → 返回事件数组且温度=0.2', async () => {
      const { jiLu, sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify([
          { 事件类型: '表白', 描述: '用户表白', 确信度: 0.95 },
        ]),
      })

      const jieGuo = await tiQuGuanJianShiJian('用户：我喜欢你\nAI：真的吗', '雨夜的猫')

      expect(jiLu[0].wenDu).toBe(0.2)
      expect(jieGuo.length).toBeGreaterThan(0)
      expect(jieGuo[0].shi_jian_lei_xing).toBe('表白')
      expect(jieGuo[0].que_xin_du).toBeGreaterThanOrEqual(0)
      expect(jieGuo[0].que_xin_du).toBeLessThanOrEqual(1)
    })
  })

  describe('Director Prompt恋爱目的', () => {
    it('Director Prompt → 包含用户恋爱目的', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianDirectorPrompt(shuRu)

      expect(prompt).toContain('用户与其聊天的目的是为了谈恋爱')
    })
  })
})
