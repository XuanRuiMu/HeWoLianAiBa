import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    lpush: vi.fn(async () => 1),
    ltrim: vi.fn(async () => 'OK'),
    lrange: vi.fn(async () => []),
  },
}))

const chaXunMock = vi.hoisted(() => vi.fn())
vi.mock('../../数据库', () => ({
  数据库: { query: (...c: unknown[]) => chaXunMock(...c) },
}))

import { gouJianWriterPrompt, gouJianDiYiCeng, gouJianBenLunXiaoXiKuai } from '../Prompt构建器'
import type { AIYinQingShuRu } from '../../types'
import { jianChaTaoHua, panDuanTaoHuaCaiYang, TaoHuaPeiZhi } from '../../config/去AI味配置'
import { chuLiQueXiKouJian, QueXiChuFaXiaoShi } from '../亲密度缺席扣减'
import { yanZhengRenSheKa } from '../人设自述卡'

function zuZhuangShuRu(gengDuo: Partial<AIYinQingShuRu> = {}): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: {
      id: 'j-1',
      ming_zi: '陈雨桐',
      wei_xin_ming: '小懒猫',
      xing_bie: 'nv',
      mbti_lei_xing: 'INFP',
      ie_lei_xing: 'I',
      re_shen_lei_xing: '慢热',
      nian_ling: 20,
      shen_fen: '大学生',
      wai_mao: '长发温柔',
      xing_ge: '安静内向',
      bei_jing_gu_shi: '来自杭州的大学生',
      xi_hao: ['阅读'],
      yan_yu_feng_ge: '轻声细语',
      xing_wei_te_dian: '',
      tou_xiang: '🌙',
      xi_huan_de_lei_xing: '温柔的人',
      jia_ting_bei_jing: '独生女',
      qing_gan_jing_li: '没谈过恋爱',
      shi_fou_zha_xing: false,
      shi_jie_xin_xi: { cheng_shi: '杭州' },
      ba_da_mo_kuai: {
        ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '',
      },
    },
    hao_gan_du: { xin_ren_du: 100, qin_mi_du: 100, qu_wei_du: 100, guan_huai_du: 100, zong_fen: 400, guan_xi_jie_duan: 'renShi' },
    dui_hua_li_shi: [
      { id: 'm-1', fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '今天好累啊', shi_jian: '12:00', yi_che_hui: false },
    ],
    yong_hu_xin_xiao_xi: '今天好累啊',
    shi_fou_di_yi_lun: false,
    ...gengDuo,
  } as AIYinQingShuRu
}

describe('说话方式不按年龄套统一模板', () => {
  function daiNianLing(nianLing: number): AIYinQingShuRu {
    const jiChu = zuZhuangShuRu()
    return { ...jiChu, jiao_se: { ...jiChu.jiao_se, nian_ling: nianLing } }
  }

  it('各年龄人设都保留各自的说话方式，不出现统一习惯文案', () => {
    for (const nianLing of [22, 45, 65, 90]) {
      const tiShi = gouJianWriterPrompt(daiNianLing(nianLing))
      expect(tiShi).toContain('说话方式：轻声细语')
      expect(tiShi).not.toContain('不斗图')
      expect(tiShi).not.toContain('🌹')
    }
  })

  it('人设里已有的说话方式原样保留，不被改写', () => {
    const jiChu = zuZhuangShuRu()
    const tiShi = gouJianWriterPrompt({
      ...jiChu,
      jiao_se: { ...jiChu.jiao_se, nian_ling: 70, yan_yu_feng_ge: '爱开玩笑，常用网络梗' },
    })
    expect(tiShi).toContain('说话方式：爱开玩笑，常用网络梗')
    expect(tiShi).not.toContain('不斗图')
  })
})

describe('FP-29 Writer提示词契约（缓存层序与去游戏化）', () => {
  it('层序：稳定块在历史之前，历史在动态块之前，本轮消息在最后', () => {
    const tiShiCi = gouJianWriterPrompt(zuZhuangShuRu(), {
      hui_fu_ce_lue: '轻轻接住',
      shi_jian_qing_xu: '平静',
      shi_fou_hui_fu: true,
      yao_jie_zhu_de_dian: '累',
    })
    const xu = (guanJian: string): number => tiShiCi.indexOf(guanJian)
    const cengXu = [
      xu('【你是这样一个人】'),
      xu('【你现在的状态】'),
      xu('【你自己】'),
      xu('【刚才聊了什么】'),
      xu('【现在的你和这段关系】'),
      xu('对方刚发给你的消息'),
    ]
    expect(cengXu.every((zhi) => zhi >= 0)).toBe(true)
    expect([...cengXu].sort((a, b) => a - b)).toEqual(cengXu)
  })

  it('Writer提示词不暴露游戏机制词汇与好感度数值', () => {
    const tiShiCi = gouJianWriterPrompt(zuZhuangShuRu())
    expect(tiShiCi).not.toContain('好感度')
    expect(tiShiCi).not.toContain('表白')
    expect(tiShiCi).not.toContain('信任')
    expect(tiShiCi).not.toContain('总分')
  })

  it('出话层存在正面条款与真人锚（风格示例层默认开启）', () => {
    const diYiCeng = gouJianDiYiCeng()
    expect(diYiCeng).toContain('你可以不同意对方')
    expect(diYiCeng).toContain('不用急着让TA好起来')
    const tiShiCi = gouJianWriterPrompt(zuZhuangShuRu())
    expect(tiShiCi).toContain('【别人聊天就是这样聊的】')
  })

  it('人设有自述卡时以自述呈现，无自述卡回退字段清单', () => {
    const daiKa = zuZhuangShuRu({ jiao_se: { ...zuZhuangShuRu().jiao_se, ren_she_ka: '我叫陈雨桐，20岁，在杭州读大二。话不多，但认定的朋友会掏心。周末喜欢窝在宿舍画画的间隙听歌，说到猫会停不下来。' } as never })
    const kaTiShi = gouJianWriterPrompt(daiKa)
    expect(kaTiShi).toContain('完全按它的身份、性格、习惯来说话')
    const wuKa = gouJianWriterPrompt(zuZhuangShuRu())
    expect(wuKa).toContain('性格底色')
  })

  it('本轮用户消息进定界符且位于末尾', () => {
    const kuai = gouJianBenLunXiaoXiKuai(zuZhuangShuRu())
    expect(kuai).toContain('对方刚发给你的消息')
    expect(kuai).toContain('今天好累啊')
  })
})

describe('FP-29 温暖套话采样', () => {
  it('套话词表命中与放行', () => {
    expect(jianChaTaoHua('抱抱你，一切都会好起来的').mingZhong.length).toBeGreaterThan(0)
    expect(jianChaTaoHua('今晚吃了一碗很辣的粉').tongGuo).toBe(true)
  })

  it('采样比例可复现', () => {
    expect(panDuanTaoHuaCaiYang(0)).toBe(true)
    expect(panDuanTaoHuaCaiYang(1)).toBe(false)
    expect(TaoHuaPeiZhi.ciBiao.length).toBeGreaterThan(5)
  })
})

describe('FP-29 缺席单次扣减', () => {
  beforeEach(() => {
    chaXunMock.mockReset()
  })

  it('缺席超阈值且未扣过时扣减一次并标记（12小时扣1分）', async () => {
    chaXunMock.mockImplementation((yuJu: string) => {
      if (yuJu.includes('FROM "消息"')) {
        return Promise.resolve({ rows: [{ 创建时间: new Date(Date.now() - 13 * 3600_000).toISOString() }] })
      }
      return Promise.resolve({ rows: [{ 总分: 399 }] })
    })
    const jieGuo = await chuLiQueXiKouJian('u-1', 'j-1')
    expect(jieGuo).toBe(true)
    const gengXin = chaXunMock.mock.calls.find((c) => String(c[0]).includes('UPDATE "好感度"'))
    expect(gengXin).toBeTruthy()
    const canShu = gengXin![1] as number[]
    expect(canShu[0]).toBe(1)
  })

  it('缺席不足阈值不扣减', async () => {
    chaXunMock.mockImplementation((yuJu: string) => {
      if (yuJu.includes('FROM "消息"')) {
        return Promise.resolve({ rows: [{ 创建时间: new Date(Date.now() - 11 * 3600_000).toISOString() }] })
      }
      return Promise.resolve({ rows: [] })
    })
    expect(await chuLiQueXiKouJian('u-1', 'j-1')).toBe(false)
    expect(chaXunMock.mock.calls.some((c) => String(c[0]).includes('UPDATE "好感度"'))).toBe(false)
  })

  it('阈值常量为正整数', () => {
    expect(QueXiChuFaXiaoShi).toBeGreaterThanOrEqual(1)
  })
})

describe('FP-29 自述卡校验', () => {
  it('长度越界与AI话术不合规', () => {
    expect(yanZhengRenSheKa('太短')).toBeNull()
    expect(yanZhengRenSheKa('我是一个AI助手，很高兴为你服务。'.repeat(4))).toBeNull()
    expect(yanZhengRenSheKa('我叫陈雨桐，20岁，在杭州读大二。话不多，但认定的朋友会掏心。周末喜欢窝在宿舍画画的间隙听歌。')).toBeTruthy()
  })
})
