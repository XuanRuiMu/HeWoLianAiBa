import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  sheZhiMockTiaoYong,
  chongZhiDeepSeekKeHuDuan,
  type TiaoYongCanShu,
  type TiaoYongJieGuo,
} from '../utils/DeepSeek客户端'
import { 数据库 } from '../数据库'
import { huoQuIo } from '../socket/io'
import {
  jianCeBiaoBai,
  jianCeHuShan,
  jianCeShiPo,
  jianCeShenJingBing,
  jianCeYongHuXiaoXi,
  jianCeYongHuXiaoXiBingChuLi,
  chuLiYongHuBiaoBai,
  chuLiHuShan,
  chuLiShiPo,
  chuLiShenJingBing,
  chuLiAIHuiFuHouJieShuJianCha,
  chuLiAIJieShouBiaoBai,
  chuLiYongHuJuJueAIHuoJieShou,
  huoQuJieGuoWenBen,
} from '../services/胜利失败条件'
import type { AIJiaoSeXinXi } from '../types'

vi.mock('../数据库')
vi.mock('../socket/io')

function chuangJianMockTiaoYong(xiangYingNeiRong: string) {
  sheZhiMockTiaoYong(async () => ({
    neiRong: xiangYingNeiRong,
    xinXi: { role: 'assistant', content: xiangYingNeiRong },
    yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
  }))
}

function chuangJianCeShiJiaoSe(shiFouZhaXing = false): AIJiaoSeXinXi {
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
    wai_mao: '清秀，长发',
    xing_ge: '温柔敏感',
    bei_jing_gu_shi: '来自江南小城',
    xi_hao: ['画画'],
    yan_yu_feng_ge: '轻柔含蓄',
    xing_wei_te_dian: '害羞但真诚',
    tou_xiang: 'artist',
    xi_huan_de_lei_xing: '温柔体贴',
    jia_ting_bei_jing: '普通家庭',
    qing_gan_jing_li: '有过一段青涩暗恋',
    shi_fou_zha_xing: shiFouZhaXing,
    shi_jie_xin_xi: {},
    ba_da_mo_kuai: {
      ji_ben_xin_xi: '小雨，女，20岁',
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

function sheZhiShuJuKuMoNi(rows: unknown[] = []): void {
  vi.mocked(数据库.query).mockResolvedValue({ rows, command: 'SELECT', rowCount: rows.length } as never)
}

function sheZhiShuJuKuMoNiLianXu(jieGuoLieBiao: unknown[][]): void {
  let dangQian = 0
  vi.mocked(数据库.query).mockImplementation(async () => {
    const rows = jieGuoLieBiao[dangQian] || []
    dangQian++
    return { rows, command: 'SELECT', rowCount: rows.length } as never
  })
}

function huoQuFaSongShiJian(): ReturnType<typeof vi.fn> {
  const emit = vi.fn()
  vi.mocked(huoQuIo).mockReturnValue({
    to: vi.fn().mockReturnValue({ emit }),
  } as never)
  return emit
}

describe('FP-11 胜利失败条件', () => {
  beforeEach(() => {
    chongZhiDeepSeekKeHuDuan()
    vi.clearAllMocks()
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
  })

  describe('表白检测', () => {
    it('直接表白 → 返回表白类型与确信度', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否表白: true,
          表白类型: '直接表白',
          确信度: 0.95,
          理由: '明确表达爱意',
        }),
      )

      const jieGuo = await jianCeBiaoBai('我喜欢你，做我女朋友吧')

      expect(jieGuo.shi_fou_biao_bai).toBe(true)
      expect(jieGuo.biao_bai_lei_xing).toBe('zhi_jie_biao_bai')
      expect(jieGuo.que_xin_du).toBe(0.95)
    })

    it('非表白 → 返回false与低确信度', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否表白: false,
          表白类型: '非表白',
          确信度: 0.1,
          理由: '普通问候',
        }),
      )

      const jieGuo = await jianCeBiaoBai('今天天气不错')

      expect(jieGuo.shi_fou_biao_bai).toBe(false)
      expect(jieGuo.biao_bai_lei_xing).toBe('fei_biao_bai')
      expect(jieGuo.que_xin_du).toBe(0.1)
    })
  })

  describe('互删检测', () => {
    it('明确互删 → 返回true', async () => {
      chuangJianMockTiaoYong(JSON.stringify({ 是否互删: true, 确信度: 0.9, 理由: '删除好友' }))

      const jieGuo = await jianCeHuShan('互删吧，以后别联系了')

      expect(jieGuo.shi_fou_hu_shan).toBe(true)
      expect(jieGuo.que_xin_du).toBe(0.9)
    })
  })

  describe('识破检测', () => {
    it('识破渣男 → 返回true', async () => {
      chuangJianMockTiaoYong(JSON.stringify({ 是否识破: true, 确信度: 0.85, 理由: '发现渣男证据' }))

      const jieGuo = await jianCeShiPo('你就是个渣男')

      expect(jieGuo.shi_fou_shi_po).toBe(true)
      expect(jieGuo.que_xin_du).toBe(0.85)
    })
  })

  describe('综合用户消息检测', () => {
    it('同时检测四种意图并聚合结果', async () => {
      let ciShu = 0
      sheZhiMockTiaoYong(async (canShu: TiaoYongCanShu) => {
        ciShu++
        const leiXing = canShu.xiaoXi[1]?.neiRong || ''
        let neiRong = '{}'
        if (leiXing.includes('表白')) {
          neiRong = JSON.stringify({ 是否表白: true, 表白类型: '直接表白', 确信度: 0.9, 理由: '' })
        } else if (leiXing.includes('互删')) {
          neiRong = JSON.stringify({ 是否互删: false, 确信度: 0.2, 理由: '' })
        } else if (leiXing.includes('识破')) {
          neiRong = JSON.stringify({ 是否识破: false, 确信度: 0.2, 理由: '' })
        } else if (leiXing.includes('神经病') || canShu.xiaoXi[0]?.neiRong.includes('人设适配')) {
          neiRong = JSON.stringify({ 是否神经病: false, 发散思维人设: false, 确信度: 0.1, 理由: '' })
        }
        return {
          neiRong,
          xinXi: { role: 'assistant', content: neiRong },
          yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
        }
      })

      const jiaoSe = chuangJianCeShiJiaoSe(false)
      const jieGuo = await jianCeYongHuXiaoXi('我喜欢你', [], jiaoSe)

      expect(jieGuo.biao_bai.shi_fou_biao_bai).toBe(true)
      expect(jieGuo.hu_shan.shi_fou_hu_shan).toBe(false)
      expect(jieGuo.shi_po.shi_fou_shi_po).toBe(false)
      expect(jieGuo.shen_jing_bing.shi_fou_shen_jing_bing).toBe(false)
      expect(ciShu).toBe(4)
    })
  })

  describe('用户主动表白处理', () => {
    it('非渣型且好感度≥800 → 爱情胜利，可继续聊天', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      const emit = huoQuFaSongShiJian()

      const jieGuo = await chuLiYongHuBiaoBai('yong-hu-id', 'jiao-se-id', 850)

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_ai_qing')
      expect(jieGuo!.ke_ji_xu_liao_tian).toBe(true)
      expect(emit).toHaveBeenCalledWith(
        '游戏事件',
        expect.objectContaining({
          角色ID: 'jiao-se-id',
          lei_xing: 'sheng_li_ai_qing',
          xiao_xi: '在一起了 💕',
          ke_ji_xu_liao_tian: true,
        }),
      )
    })

    it('非渣型且好感度<800 → 过早表白失败，扣除信任度', async () => {
      sheZhiShuJuKuMoNiLianXu([
        [{ 用户ID: 'yong-hu-id', 是否渣型: false }],
        [{ 关系阶段: '认识' }],
        [{ 信任度: 100, 亲密度: 100, 趣味度: 50, 关怀度: 50, 总分: 300, 关系阶段: '认识' }],
        [],
        [],
        [{ 名字: '小雨', 是否渣型: false }],
        [{ 总分: 300, 关系阶段: '认识' }],
        [{ shu: 10 }],
        [],
      ])
      const emit = huoQuFaSongShiJian()

      const jieGuo = await chuLiYongHuBiaoBai('yong-hu-id', 'jiao-se-id', 300)

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_guo_zao_biao_bai')
      expect(jieGuo!.ke_ji_xu_liao_tian).toBe(false)
      const tiaoYong = vi.mocked(数据库.query).mock.calls
      const youGengXinHaoGanDu = tiaoYong.some((call) =>
        typeof call[0] === 'string' && call[0].includes('UPDATE "好感度"'),
      )
      expect(youGengXinHaoGanDu).toBe(true)
      expect(emit).toHaveBeenCalled()
    })

    it('渣型角色 → 被欺骗失败', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: true }])
      const emit = huoQuFaSongShiJian()

      const jieGuo = await chuLiYongHuBiaoBai('yong-hu-id', 'jiao-se-id', 850)

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_bei_qi_pian')
      expect(emit).toHaveBeenCalled()
    })
  })

  describe('互删处理', () => {
    it('渣型角色 → 互删胜利', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: true }])

      const jieGuo = await chuLiHuShan('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_hu_shan_sheng_li')
    })

    it('正常角色 → 互删失败', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])

      const jieGuo = await chuLiHuShan('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_hu_shan_shi_bai')
    })
  })

  describe('识破处理', () => {
    it('渣型角色 → 识破胜利，解锁成就', async () => {
      sheZhiShuJuKuMoNiLianXu([
        [{ 用户ID: 'yong-hu-id', 是否渣型: true }],
        [{ 名字: '小雨' }],
      ])

      const jieGuo = await chuLiShiPo('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_shi_po')
      expect(jieGuo!.cheng_jiu).toBe('火眼金睛')
    })

    it('正常角色 → 错误识破失败', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])

      const jieGuo = await chuLiShiPo('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_cuo_wu_shi_po')
    })
  })

  describe('神经病检测', () => {
    it('正常消息 → 不判定为神经病', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: false,
          发散思维人设: false,
          确信度: 0.1,
          理由: '正常聊天',
        }),
      )

      const jieGuo = await jianCeShenJingBing('今天过得怎么样', [], chuangJianCeShiJiaoSe(false))

      expect(jieGuo.shi_fou_shen_jing_bing).toBe(false)
      expect(jieGuo.que_xin_du).toBe(0.1)
    })

    it('明显无厘头消息 → 判定为神经病', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          发散思维人设: false,
          确信度: 0.9,
          理由: '与上下文完全无关',
        }),
      )

      const jieGuo = await jianCeShenJingBing('土豆会梦见电子羊吗', [], chuangJianCeShiJiaoSe(false))

      expect(jieGuo.shi_fou_shen_jing_bing).toBe(true)
      expect(jieGuo.fa_san_si_wei_ren_she).toBe(false)
      expect(jieGuo.que_xin_du).toBe(0.9)
    })

    it('发散思维人设 → 不触发神经病判定', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          发散思维人设: true,
          确信度: 0.8,
          理由: '虽然无厘头但角色能接受',
        }),
      )

      const jiaoSe = chuangJianCeShiJiaoSe(false)
      jiaoSe.ba_da_mo_kuai.xi_tong_ti_shi = '发散思维，能接受无厘头'
      const jieGuo = await jianCeShenJingBing('彩虹在冰箱里唱歌', [], jiaoSe)

      expect(jieGuo.shi_fou_shen_jing_bing).toBe(true)
      expect(jieGuo.fa_san_si_wei_ren_she).toBe(true)
    })

    it('FP-08 E型人格 + AI自判人设能接受 → fa_san_si_wei_ren_she=true', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: true,
          确信度: 0.85,
          理由: 'E型人格觉得莫名其妙的话好玩，能接梗',
        }),
      )

      const jiaoSe = chuangJianCeShiJiaoSe(false)
      jiaoSe.mbti_lei_xing = 'ESFP'
      jiaoSe.ie_lei_xing = 'E'
      const jieGuo = await jianCeShenJingBing('土豆会梦见电子羊吗', [], jiaoSe)

      expect(jieGuo.shi_fou_shen_jing_bing).toBe(true)
      expect(jieGuo.fa_san_si_wei_ren_she).toBe(true)
      expect(jieGuo.li_you).toContain('E型人格')
    })

    it('FP-08 AI自判阈值 → 不再依赖 que_xin_du>0.7 硬编码阈值', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: false,
          确信度: 0.4,
          理由: 'I型人格觉得莫名其妙',
        }),
      )

      const jiaoSe = chuangJianCeShiJiaoSe(false)
      jiaoSe.mbti_lei_xing = 'INTJ'
      jiaoSe.ie_lei_xing = 'I'
      const jieGuo = await jianCeShenJingBing('完全无关的内容', [], jiaoSe)

      expect(jieGuo.shi_fou_shen_jing_bing).toBe(true)
      expect(jieGuo.fa_san_si_wei_ren_she).toBe(false)
      expect(jieGuo.que_xin_du).toBe(0.4)
    })
  })

  describe('神经病处理', () => {
    it('渣型角色 → 神经病胜利', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: true }])
      const emit = huoQuFaSongShiJian()

      const jieGuo = await chuLiShenJingBing('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_shen_jing_bing')
      expect(jieGuo!.ke_ji_xu_liao_tian).toBe(false)
      expect(emit).toHaveBeenCalledWith(
        '游戏事件',
        expect.objectContaining({
          角色ID: 'jiao-se-id',
          lei_xing: 'sheng_li_shen_jing_bing',
          xiao_xi: '对方被你搞懵了',
          ke_ji_xu_liao_tian: false,
        }),
      )
    })

    it('正常角色 → 神经病失败', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      const emit = huoQuFaSongShiJian()

      const jieGuo = await chuLiShenJingBing('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_shen_jing_bing')
      expect(jieGuo!.ke_ji_xu_liao_tian).toBe(false)
      expect(emit).toHaveBeenCalled()
    })
  })

  describe('综合用户消息处理（神经病）', () => {
    it('明显无厘头 + 非发散思维 → 触发失败结局', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          发散思维人设: false,
          确信度: 0.85,
          理由: '完全无关',
        }),
      )

      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '蚂蚁在月球上跳芭蕾',
        500,
        false,
        chuangJianCeShiJiaoSe(false),
        [],
      )

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_shen_jing_bing')
    })

    it('明显无厘头 + 发散思维人设 → 不触发结局', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          发散思维人设: true,
          确信度: 0.85,
          理由: '角色能接受',
        }),
      )

      const jiaoSe = chuangJianCeShiJiaoSe(false)
      jiaoSe.ba_da_mo_kuai.xi_tong_ti_shi = '发散思维，能接受无厘头'
      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '蚂蚁在月球上跳芭蕾',
        500,
        false,
        jiaoSe,
        [],
      )

      expect(jieGuo).toBeNull()
    })

    it('轻微跑题 → 不触发结局', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: false,
          发散思维人设: false,
          确信度: 0.3,
          理由: '只是轻微跑题',
        }),
      )

      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '说到电影，你最近看啥',
        500,
        false,
        chuangJianCeShiJiaoSe(false),
        [],
      )

      expect(jieGuo).toBeNull()
    })

    it('FP-08 E型人格 + AI自判人设能接受 → 不触发结局（E人宽容）', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: true,
          确信度: 0.85,
          理由: 'E型人格觉得莫名其妙的话好玩，能接梗',
        }),
      )

      const jiaoSe = chuangJianCeShiJiaoSe(false)
      jiaoSe.mbti_lei_xing = 'ENFP'
      jiaoSe.ie_lei_xing = 'E'
      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '蚂蚁在月球上跳芭蕾',
        500,
        false,
        jiaoSe,
        [],
      )

      expect(jieGuo).toBeNull()
    })

    it('FP-08 AI自判低确信度也能触发游戏结束（阈值已移除）', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: false,
          确信度: 0.4,
          理由: 'I型人格觉得莫名其妙',
        }),
      )

      const jiaoSe = chuangJianCeShiJiaoSe(false)
      jiaoSe.mbti_lei_xing = 'INTJ'
      jiaoSe.ie_lei_xing = 'I'
      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '完全无关的内容',
        500,
        false,
        jiaoSe,
        [],
      )

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_shen_jing_bing')
    })
  })

  describe('AI回复后结束检查', () => {
    it('好感度>0 → 不触发结束', async () => {
      vi.mocked(数据库.query).mockResolvedValue({
        rows: [{ 总分: 10, 关系阶段: 'shuXi' }],
        command: 'SELECT',
        rowCount: 1,
      } as never)

      const jieGuo = await chuLiAIHuiFuHouJieShuJianCha('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).toBeNull()
    })

    it('好感度<=0 → 好感度归零失败', async () => {
      vi.mocked(数据库.query).mockResolvedValue({
        rows: [{ 总分: 0, 关系阶段: 'lengDan' }],
        command: 'SELECT',
        rowCount: 1,
      } as never)
      const emit = huoQuFaSongShiJian()

      const jieGuo = await chuLiAIHuiFuHouJieShuJianCha('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_hao_gan_du_gui_ling')
      expect(emit).toHaveBeenCalled()
    })
  })

  describe('AI主动表白处理', () => {
    it('非渣型 → 爱情胜利', async () => {
      const jieGuo = await chuLiAIJieShouBiaoBai('yong-hu-id', 'jiao-se-id', chuangJianCeShiJiaoSe(false))

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_ai_qing')
      expect(jieGuo!.ke_ji_xu_liao_tian).toBe(true)
    })

    it('渣型 → 被诈型欺骗失败', async () => {
      const jieGuo = await chuLiAIJieShouBiaoBai('yong-hu-id', 'jiao-se-id', chuangJianCeShiJiaoSe(true))

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_bei_zha_xing_qi_pian')
      expect(jieGuo!.ke_ji_xu_liao_tian).toBe(false)
    })
  })

  describe('用户回复AI表白处理', () => {
    it('用户接受非渣型表白 → 爱情胜利', async () => {
      chuangJianMockTiaoYong(JSON.stringify({ 是否接受: true, 确信度: 0.95, 理由: '接受' }))
      const jieGuo = await chuLiYongHuJuJueAIHuoJieShou(
        'yong-hu-id',
        'jiao-se-id',
        chuangJianCeShiJiaoSe(false),
        '好啊，我们在一起吧',
      )

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_ai_qing')
    })

    it('用户拒绝非渣型表白 → 拒绝表白失败', async () => {
      chuangJianMockTiaoYong(JSON.stringify({ 是否接受: false, 确信度: 0.9, 理由: '拒绝' }))
      const jieGuo = await chuLiYongHuJuJueAIHuoJieShou(
        'yong-hu-id',
        'jiao-se-id',
        chuangJianCeShiJiaoSe(false),
        '我们还是做朋友吧',
      )

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_ju_jue_biao_bai')
    })

    it('用户拒绝渣型表白 → 游戏继续', async () => {
      chuangJianMockTiaoYong(JSON.stringify({ 是否接受: false, 确信度: 0.9, 理由: '拒绝' }))
      const jieGuo = await chuLiYongHuJuJueAIHuoJieShou(
        'yong-hu-id',
        'jiao-se-id',
        chuangJianCeShiJiaoSe(true),
        '我不喜欢你',
      )

      expect(jieGuo).toBeNull()
    })
  })

  describe('结果文本映射', () => {
    it('全部结局类型均有中文文本', () => {
      const leiXingLieBiao = [
        'sheng_li_ai_qing',
        'sheng_li_hu_shan_sheng_li',
        'sheng_li_shi_po',
        'sheng_li_shen_jing_bing',
        'shi_bai_guo_zao_biao_bai',
        'shi_bai_hu_shan_shi_bai',
        'shi_bai_cuo_wu_shi_po',
        'shi_bai_hao_gan_du_gui_ling',
        'shi_bai_ju_jue_biao_bai',
        'shi_bai_bei_qi_pian',
        'shi_bai_bei_zha_xing_qi_pian',
        'shi_bai_shen_jing_bing',
      ] as const

      leiXingLieBiao.forEach((leiXing) => {
        expect(huoQuJieGuoWenBen(leiXing)).toBeTruthy()
      })
    })
  })
})
