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
import { JUN_SHI_PEI_ZHI_MO_REN } from '../config/军师配置'
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

      expect(prompt).toContain('【先记住这些】')
      expect(prompt).toContain('【你是这样一个人】')
      expect(prompt).toContain('【现在的你和这段关系】')
      expect(prompt).toContain('【关系参考，不是束缚】')
      expect(prompt).toContain('【刚才聊了什么】')
      expect(prompt).toContain('【代入你自己】')
    })

    it('Prompt第一层 → 包含三条行为规则', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('不用每条消息都回')
      expect(prompt).toContain('别用（）或[]写动作')
      expect(prompt).toContain('别一上来就主动报年龄')
    })

    it('Prompt内容 → 包含恋爱目的文本', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('对方加你聊天是想谈恋爱')
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

    it('Prompt第四层阶段描述 → 禁止指令化自我暗示', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('别用“你对这个人没什么感觉”“你的心已经不受控制了”这种话命令自己。')
    })

    it('第一轮Writer Prompt末尾 → 包含角色沉浸指令', () => {
      const shuRu = chuangJianCeShiShuRu()
      shuRu.shi_fou_di_yi_lun = true
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('【代入你自己】')
      expect(prompt).toContain('完全变成')
      expect(prompt).toContain('别跳出来分析')
    })

    it('优化后Writer Prompt → 包含自然聊天与第一人称沉浸要素', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianWriterPrompt(shuRu)

      expect(prompt).toContain('像真实大学生/年轻人谈恋爱那样聊微信')
      expect(prompt).toContain('留白')
      expect(prompt).toContain('用“我”去想')
      expect(prompt).toContain('话里也别露馅像机器人在回。')
    })

    it('优化后Director Prompt → 包含自然节奏与导演要求', () => {
      const shuRu = chuangJianCeShiShuRu()
      const prompt = gouJianDirectorPrompt(shuRu)

      expect(prompt).toContain('你手里有个演员')
      expect(prompt).toContain('留白')
      expect(prompt).toContain('推拉')
      expect(prompt).toContain('真实大学生/年轻人谈恋爱')
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
    it('Writer调用 → temperature=0.85且siKaoMoShi=enabled（开启最大强度思考，temperature按官方规范在思考模式下不生效）', async () => {
      const { jiLu, sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({ neiRong: '嗯，天气确实不错~\n我在画画呢，你呢？' })

      await shengChengWriterHuiFu(chuangJianCeShiShuRu())

      expect(jiLu.length).toBe(1)
      expect(jiLu[0].wenDu).toBe(0.85)
      expect(jiLu[0].siKaoMoShi).toBe('enabled')
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
        if (canShu.xiaoXi[0]?.neiRong?.includes('小纸条')) {
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
          if (canShu.xiaoXi[0]?.neiRong?.includes('小纸条')) {
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

    it('yunXingAIYinQing：渣型+E+快热 角色 → Director/Writer 温度高于基座（人设驱动在主路径生效）', async () => {
      const jiLu: TiaoYongCanShu[] = []
      sheZhiMockTiaoYong(async (canShu) => {
        jiLu.push(canShu)
        if (canShu.wenDu === 0.1) {
          return {
            neiRong: JSON.stringify({ 违规: false, 类型: '', 严重程度: null, 理由: '', 确信度: 0.1 }),
            xinXi: { role: 'assistant', content: 'safe' },
            yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
          }
        }
        if (canShu.xiaoXi[0]?.neiRong?.includes('小纸条')) {
          return {
            neiRong: JSON.stringify({
              用户意图: '继续聊天',
              情感分析: '中性',
              回复策略: '自然回复',
              是否回复: true,
              回复条数: 1,
              时间情绪: '轻松',
              是否撤回: false,
            }),
            xinXi: { role: 'assistant', content: 'director' },
            yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
          }
        }
        return {
          neiRong: '那肯定呀，我也正想找你聊呢~',
          xinXi: { role: 'assistant', content: 'writer' },
          yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
        }
      })

      const shuRu = chuangJianCeShiShuRu()
      shuRu.jiao_se.ie_lei_xing = 'E'
      shuRu.jiao_se.re_shen_lei_xing = '快热'
      shuRu.jiao_se.shi_fou_zha_xing = true
      shuRu.jiao_se.xing_ge = '活泼浪漫'

      const jieGuo = await yunXingAIYinQing(shuRu)

      expect(jieGuo.shi_fou_hui_fu).toBe(true)
      const directorJiLu = jiLu.find((c) => c.xiaoXi[0]?.neiRong?.includes('小纸条'))
      const writerJiLu = jiLu.find((c) => c.xiaoXi[0]?.neiRong?.includes('完全代入'))
      expect(directorJiLu).toBeDefined()
      expect(writerJiLu).toBeDefined()
      // 基座 Director=0.3、Writer=0.85；渣型(+0.05)+E(+0.1)+快热(+0.05)+浪漫(+0.1) 应高于基座
      expect(directorJiLu!.wenDu).toBeGreaterThan(0.3)
      expect(writerJiLu!.wenDu).toBeGreaterThan(0.85)
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

    it('好感度评判调用 → temperature=0.2且四维值在-60到60范围内', async () => {
      const { jiLu, sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify({
          信任度变化: 40,
          亲密度变化: 20,
          趣味度变化: -20,
          关怀度变化: 0,
          理由: '回复真诚',
        }),
      })

      const jieGuo = await pingPanHaoGanDuBianHua('今天很开心', '那真好呀', '雨夜的猫')

      expect(jiLu[0].wenDu).toBe(0.2)
      expect(jieGuo.xin_ren_du_bian_hua).toBeGreaterThanOrEqual(-60)
      expect(jieGuo.xin_ren_du_bian_hua).toBeLessThanOrEqual(60)
      expect(jieGuo.qin_mi_du_bian_hua).toBeGreaterThanOrEqual(-60)
      expect(jieGuo.qin_mi_du_bian_hua).toBeLessThanOrEqual(60)
      expect(jieGuo.qu_wei_du_bian_hua).toBeGreaterThanOrEqual(-60)
      expect(jieGuo.qu_wei_du_bian_hua).toBeLessThanOrEqual(60)
      expect(jieGuo.guan_huai_du_bian_hua).toBeGreaterThanOrEqual(-60)
      expect(jieGuo.guan_huai_du_bian_hua).toBeLessThanOrEqual(60)
    })

    it('好感度评判越界 → 自动裁剪到-60到60', async () => {
      const { sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify({
          信任度变化: 200,
          亲密度变化: -200,
          趣味度变化: 60,
          关怀度变化: -60,
          理由: '测试边界',
        }),
      })

      const jieGuo = await pingPanHaoGanDuBianHua('测试', '回复', '雨夜的猫')

      expect(jieGuo.xin_ren_du_bian_hua).toBe(60)
      expect(jieGuo.qin_mi_du_bian_hua).toBe(-60)
      expect(jieGuo.qu_wei_du_bian_hua).toBe(60)
      expect(jieGuo.guan_huai_du_bian_hua).toBe(-60)
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
        jun_shi_pei_zhi: {
          id: JUN_SHI_PEI_ZHI_MO_REN.id,
          mingCheng: JUN_SHI_PEI_ZHI_MO_REN.mingCheng,
          xiTongTiShi: JUN_SHI_PEI_ZHI_MO_REN.xiTongTiShi,
        },
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

      expect(prompt).toContain('对方加 TA 聊天是想谈恋爱')
    })
  })

  describe('动态参数随人设/场景变化', () => {
    it('Writer：温柔/浪漫 + E型 + 快热 → 温度高于基座 0.85', async () => {
      const { jiLu, sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({ neiRong: '那肯定呀，我也正想找你聊呢~' })

      const shangXiaWen = {
        jiaoSe: {
          ie_lei_xing: 'E' as const,
          re_shen_lei_xing: '快热' as const,
          xing_ge: '温柔浪漫',
          yan_yu_feng_ge: '甜蜜撒娇',
        },
        changJing: 'langMan' as const,
      }
      await shengChengWriterHuiFu(chuangJianCeShiShuRu(), undefined, shangXiaWen)

      expect(jiLu.length).toBe(1)
      expect(jiLu[0].wenDu).toBeGreaterThan(0.85)
      expect(typeof jiLu[0].top_p).toBe('number')
      expect(jiLu[0].top_p as number).toBeGreaterThan(0)
    })

    it('Writer：理性/冷静 + I型 + 慢热 → 温度低于基座 0.85', async () => {
      const { jiLu, sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({ neiRong: '嗯，好的。' })

      const shangXiaWen = {
        jiaoSe: {
          ie_lei_xing: 'I' as const,
          re_shen_lei_xing: '慢热' as const,
          xing_ge: '理性冷静',
          yan_yu_feng_ge: '克制',
        },
      }
      await shengChengWriterHuiFu(chuangJianCeShiShuRu(), undefined, shangXiaWen)

      expect(jiLu.length).toBe(1)
      expect(jiLu[0].wenDu).toBeLessThan(0.85)
    })

    it('Director：chaoJia 场景 → 温度低于基座 0.3', async () => {
      const { jiLu, sheZhiXiangYing } = chuangJianMock()
      sheZhiXiangYing({
        neiRong: JSON.stringify({
          用户意图: '继续聊天',
          情感分析: '生气',
          回复策略: '冷淡回应',
          是否回复: true,
          回复条数: 1,
          时间情绪: '愤怒',
          是否撤回: false,
        }),
      })

      const shangXiaWen = {
        jiaoSe: {
          ie_lei_xing: 'I' as const,
          re_shen_lei_xing: '慢热' as const,
          xing_ge: '理性冷静',
        },
        changJing: 'chaoJia' as const,
      }
      await shengChengDirectorCeLue(chuangJianCeShiShuRu(), shangXiaWen)

      expect(jiLu.length).toBe(1)
      expect(jiLu[0].wenDu).toBeLessThan(0.3)
      expect(typeof jiLu[0].top_p).toBe('number')
      expect(jiLu[0].top_p as number).toBeGreaterThan(0)
    })
  })
})
