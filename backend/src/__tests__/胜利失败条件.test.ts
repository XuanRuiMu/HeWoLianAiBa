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
  jianCeSiLianHeYi,
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
import type { AIJiaoSeXinXi, DuiHuaLiShiXiang } from '../types'

const mockWaiBu = vi.hoisted(() => ({
  gengXinHaoGanDu: vi.fn(async () => ({ cheng_gong: true })),
  redisSet: vi.fn(async () => 'OK' as string | null),
  baoCunJiaoSeXiaoXi: vi.fn(async () => ({})),
}))

vi.mock('../数据库')
vi.mock('../socket/io')

vi.mock('../services/好感度', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/好感度')>()),
  gengXinHaoGanDu: mockWaiBu.gengXinHaoGanDu,
}))

vi.mock('../redis', () => ({
  redis: {
    set: mockWaiBu.redisSet,
  },
}))

vi.mock('../services/AI输入准备', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/AI输入准备')>()),
  baoCunJiaoSeXiaoXi: mockWaiBu.baoCunJiaoSeXiaoXi,
}))

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
    mockWaiBu.redisSet.mockResolvedValue('OK')
    mockWaiBu.baoCunJiaoSeXiaoXi.mockResolvedValue({})
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
  })

  describe('四连检合并调用（M2）', () => {
    it('表白判定：直接表白 → 表白类型与确信度', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否表白: true,
          表白类型: '直接表白',
          表白确信度: 0.95,
          是否互删: false,
          是否识破: false,
          是否神经病: false,
          理由: '明确表达爱意',
        }),
      )

      const jieGuo = await jianCeSiLianHeYi('我喜欢你，做我女朋友吧')

      expect(jieGuo.biao_bai.shi_fou_biao_bai).toBe(true)
      expect(jieGuo.biao_bai.biao_bai_lei_xing).toBe('zhi_jie_biao_bai')
      expect(jieGuo.biao_bai.que_xin_du).toBe(0.95)
      expect(jieGuo.hu_shan.shi_fou_hu_shan).toBe(false)
    })

    it('非表白 → 低确信度', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否表白: false,
          表白类型: '非表白',
          表白确信度: 0.1,
          理由: '普通问候',
        }),
      )

      const jieGuo = await jianCeSiLianHeYi('今天天气不错')

      expect(jieGuo.biao_bai.shi_fou_biao_bai).toBe(false)
      expect(jieGuo.biao_bai.biao_bai_lei_xing).toBe('fei_biao_bai')
      expect(jieGuo.biao_bai.que_xin_du).toBe(0.1)
    })

    it('互删判定：明确互删 → true', async () => {
      chuangJianMockTiaoYong(JSON.stringify({ 是否互删: true, 互删确信度: 0.9, 理由: '删除好友' }))

      const jieGuo = await jianCeSiLianHeYi('互删吧，以后别联系了')

      expect(jieGuo.hu_shan.shi_fou_hu_shan).toBe(true)
      expect(jieGuo.hu_shan.que_xin_du).toBe(0.9)
    })

    it('识破判定：识破渣男 → true', async () => {
      chuangJianMockTiaoYong(JSON.stringify({ 是否识破: true, 识破确信度: 0.85, 理由: '发现渣男证据' }))

      const jieGuo = await jianCeSiLianHeYi('你就是个渣男')

      expect(jieGuo.shi_po.shi_fou_shi_po).toBe(true)
      expect(jieGuo.shi_po.que_xin_du).toBe(0.85)
    })

    it('同时检测四种意图并聚合结果，且只消耗一次LLM调用', async () => {
      let ciShu = 0
      sheZhiMockTiaoYong(async () => {
        ciShu++
        const neiRong = JSON.stringify({
          是否表白: true,
          表白类型: '直接表白',
          表白确信度: 0.9,
          是否互删: false,
          互删确信度: 0.2,
          是否识破: false,
          识破确信度: 0.2,
          是否神经病: false,
          人设能接受: true,
          理由: '',
        })
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
      // M2 核心断言：原先4次并行调用收敛为1次
      expect(ciShu).toBe(1)
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
        [],
        [{ ID: 1 }],
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
      expect(mockWaiBu.gengXinHaoGanDu).toHaveBeenCalledWith(
        'yong-hu-id',
        'jiao-se-id',
        expect.objectContaining({ xin_ren_du_bian_hua: -50 }),
      )
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
    it('渣型角色 → 识破胜利', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: true }])

      const jieGuo = await chuLiShiPo('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_shi_po')
    })

    it('正常角色 → 错误识破失败', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])

      const jieGuo = await chuLiShiPo('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_cuo_wu_shi_po')
    })
  })

  describe('神经病检测（合并调用）', () => {
    it('正常消息 → 不判定为神经病', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: false,
          人设能接受: true,
          确信度: 0.1,
          理由: '正常聊天',
        }),
      )

      const jieGuo = await jianCeSiLianHeYi('今天过得怎么样', [], chuangJianCeShiJiaoSe(false))

      expect(jieGuo.shen_jing_bing.shi_fou_shen_jing_bing).toBe(false)
      expect(jieGuo.shen_jing_bing.que_xin_du).toBe(0.1)
    })

    it('明显无厘头消息 → 判定为神经病', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: false,
          确信度: 0.9,
          理由: '与上下文完全无关',
        }),
      )

      const jieGuo = await jianCeSiLianHeYi('土豆会梦见电子羊吗', [], chuangJianCeShiJiaoSe(false))

      expect(jieGuo.shen_jing_bing.shi_fou_shen_jing_bing).toBe(true)
      expect(jieGuo.shen_jing_bing.fa_san_si_wei_ren_she).toBe(false)
      expect(jieGuo.shen_jing_bing.que_xin_du).toBe(0.9)
    })

    it('发散思维人设 → 不触发神经病判定', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: true,
          确信度: 0.8,
          理由: '虽然无厘头但角色能接受',
        }),
      )

      const jiaoSe = chuangJianCeShiJiaoSe(false)
      jiaoSe.ba_da_mo_kuai.xi_tong_ti_shi = '发散思维，能接受无厘头'
      const jieGuo = await jianCeSiLianHeYi('彩虹在冰箱里唱歌', [], jiaoSe)

      expect(jieGuo.shen_jing_bing.shi_fou_shen_jing_bing).toBe(true)
      expect(jieGuo.shen_jing_bing.fa_san_si_wei_ren_she).toBe(true)
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
      const jieGuo = await jianCeSiLianHeYi('土豆会梦见电子羊吗', [], jiaoSe)

      expect(jieGuo.shen_jing_bing.shi_fou_shen_jing_bing).toBe(true)
      expect(jieGuo.shen_jing_bing.fa_san_si_wei_ren_she).toBe(true)
      expect(jieGuo.shen_jing_bing.li_you).toContain('E型人格')
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
      const jieGuo = await jianCeSiLianHeYi('完全无关的内容', [], jiaoSe)

      expect(jieGuo.shen_jing_bing.shi_fou_shen_jing_bing).toBe(true)
      expect(jieGuo.shen_jing_bing.fa_san_si_wei_ren_she).toBe(false)
      expect(jieGuo.shen_jing_bing.que_xin_du).toBe(0.4)
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

    it('正常角色首次触发 → 警告降级：不发结局、Redis置位、发角色消息、扣好感度合计-30', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      chuangJianMockTiaoYong(JSON.stringify({ 反应消息: '你今天说话好奇怪哦…发生什么了？' }))
      const emit = huoQuFaSongShiJian()

      const jieGuo = await chuLiShenJingBing('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).toBeNull()
      expect(mockWaiBu.redisSet).toHaveBeenCalledWith(
        'shen_jing_bing_jing_gao:yong-hu-id:jiao-se-id',
        '1',
        'EX',
        86400,
        'NX',
      )
      expect(mockWaiBu.baoCunJiaoSeXiaoXi).toHaveBeenCalledTimes(1)
      expect(mockWaiBu.baoCunJiaoSeXiaoXi).toHaveBeenCalledWith({
        yong_hu_id: 'yong-hu-id',
        jiao_se_id: 'jiao-se-id',
        nei_rong: '你今天说话好奇怪哦…发生什么了？',
      })
      expect(emit).toHaveBeenCalledWith(
        '角色回复',
        expect.objectContaining({ 角色ID: 'jiao-se-id' }),
      )
      expect(mockWaiBu.gengXinHaoGanDu).toHaveBeenCalledTimes(1)
      const [, , bianHua] = mockWaiBu.gengXinHaoGanDu.mock.calls[0] as unknown as [
        string,
        string,
        Record<string, number>,
      ]
      const heJi = Object.values(bianHua).reduce((zong, zhi) => zong + zhi, 0)
      expect(heJi).toBe(-30)
    })

    it('正常角色已警告过（Redis键已存在）→ 神经病失败结局', async () => {
      mockWaiBu.redisSet.mockResolvedValue(null)
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      const emit = huoQuFaSongShiJian()

      const jieGuo = await chuLiShenJingBing('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_shen_jing_bing')
      expect(jieGuo!.ke_ji_xu_liao_tian).toBe(false)
      expect(mockWaiBu.gengXinHaoGanDu).not.toHaveBeenCalled()
      expect(mockWaiBu.baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
      expect(emit).toHaveBeenCalled()
    })

    it('警告反应生成失败 → 不阻塞流程：跳过角色消息、仍扣好感度并返回null', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      sheZhiMockTiaoYong(async () => {
        throw new Error('LLM超时')
      })
      const emit = huoQuFaSongShiJian()

      const jieGuo = await chuLiShenJingBing('yong-hu-id', 'jiao-se-id')

      expect(jieGuo).toBeNull()
      expect(mockWaiBu.baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
      expect(mockWaiBu.redisSet).toHaveBeenCalledTimes(1)
      expect(mockWaiBu.gengXinHaoGanDu).toHaveBeenCalledTimes(1)
      expect(emit).not.toHaveBeenCalled()
    })
  })

  describe('综合用户消息处理（神经病）', () => {
    it('明显无厘头高确信 + 非发散思维 + 已警告过 → 触发失败结局', async () => {
      mockWaiBu.redisSet.mockResolvedValue(null)
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: false,
          神经病确信度: 0.85,
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

    it('正常角色首次触发(0.8) → 警告降级：返回null、扣好感度、发角色消息、Redis置位', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      sheZhiMockTiaoYong(async (canShu) => {
        const wenBen = canShu.xiaoXi
          .map((m) => (typeof m.neiRong === 'string' ? m.neiRong : ''))
          .join('\n')
        const neiRong = wenBen.includes('四类判定')
          ? JSON.stringify({ 是否神经病: true, 人设能接受: false, 神经病确信度: 0.8, 理由: '' })
          : JSON.stringify({ 反应消息: '呃…你是在说什么呀？' })
        return {
          neiRong,
          xinXi: { role: 'assistant', content: neiRong },
          yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
        }
      })
      const emit = huoQuFaSongShiJian()

      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '蚂蚁在月球上跳芭蕾',
        500,
        false,
        chuangJianCeShiJiaoSe(false),
        [],
      )

      expect(jieGuo).toBeNull()
      expect(mockWaiBu.redisSet).toHaveBeenCalledWith(
        'shen_jing_bing_jing_gao:yong-hu-id:jiao-se-id',
        '1',
        'EX',
        86400,
        'NX',
      )
      expect(mockWaiBu.baoCunJiaoSeXiaoXi).toHaveBeenCalledWith({
        yong_hu_id: 'yong-hu-id',
        jiao_se_id: 'jiao-se-id',
        nei_rong: '呃…你是在说什么呀？',
      })
      expect(emit).toHaveBeenCalledWith(
        '角色回复',
        expect.objectContaining({ 角色ID: 'jiao-se-id' }),
      )
      expect(mockWaiBu.gengXinHaoGanDu).toHaveBeenCalledTimes(1)
      const [, , bianHua] = mockWaiBu.gengXinHaoGanDu.mock.calls[0] as unknown as [
        string,
        string,
        Record<string, number>,
      ]
      const heJi = Object.values(bianHua).reduce((zong, zhi) => zong + zhi, 0)
      expect(heJi).toBe(-30)
    })

    it('神经病确信度低于阈值(0.6) → 不触发任何结局', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: false,
          神经病确信度: 0.6,
          理由: '有点奇怪但不确定',
        }),
      )

      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '完全无关的内容',
        500,
        false,
        chuangJianCeShiJiaoSe(false),
        [],
      )

      expect(jieGuo).toBeNull()
      expect(mockWaiBu.redisSet).not.toHaveBeenCalled()
      expect(mockWaiBu.gengXinHaoGanDu).not.toHaveBeenCalled()
      expect(mockWaiBu.baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
    })

    it('渣型 + 无厘头高确信(0.8) → 一次触发即胜', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: true }])
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: false,
          神经病确信度: 0.8,
          理由: '渣型被搞懵也赢',
        }),
      )
      const emit = huoQuFaSongShiJian()

      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '蚂蚁在月球上跳芭蕾',
        500,
        false,
        chuangJianCeShiJiaoSe(true),
        [],
      )

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_shen_jing_bing')
      expect(mockWaiBu.redisSet).not.toHaveBeenCalled()
      expect(mockWaiBu.baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
      expect(emit).toHaveBeenCalled()
    })

    it('明显无厘头 + 发散思维人设 → 不触发结局', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
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

    it('渣型 + 无厘头 + 发散思维人设 → 仍触发胜利结局', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: true }])
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          发散思维人设: true,
          确信度: 0.85,
          理由: '渣型被搞懵也赢',
        }),
      )

      const jiaoSe = chuangJianCeShiJiaoSe(true)
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

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_shen_jing_bing')
    })

    it('轻微跑题 → 不触发结局', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
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

  describe('AI表白等待期三分支（P0-5）', () => {
    function sheZhiLiangJieDuanMock(jieShouBiaoBaiJianCeJieGuo: Record<string, unknown>): void {
      sheZhiMockTiaoYong(async (canShu) => {
        const wenBen = canShu.xiaoXi
          .map((m) => (typeof m.neiRong === 'string' ? m.neiRong : ''))
          .join('\n')
        const neiRong = wenBen.includes('四类判定')
          ? JSON.stringify({ 是否神经病: false, 人设能接受: true, 神经病确信度: 0.1, 理由: '' })
          : JSON.stringify(jieShouBiaoBaiJianCeJieGuo)
        return {
          neiRong,
          xinXi: { role: 'assistant', content: neiRong },
          yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
        }
      })
    }

    it('用户回复「让我想想」（模糊回复true）→ 返回null不结束游戏', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      sheZhiLiangJieDuanMock({ 是否接受: false, 确信度: 0.9, 是否模糊回复: true, 理由: '犹豫未定' })

      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '让我想想',
        500,
        true,
        chuangJianCeShiJiaoSe(false),
        [],
      )

      expect(jieGuo).toBeNull()
    })

    it('「我愿意」高确信接受 → 正常角色爱情胜利', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      sheZhiLiangJieDuanMock({ 是否接受: true, 确信度: 0.95, 是否模糊回复: false, 理由: '明确接受' })
      const emit = huoQuFaSongShiJian()

      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '我愿意',
        500,
        true,
        chuangJianCeShiJiaoSe(false),
        [],
      )

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('sheng_li_ai_qing')
      expect(emit).toHaveBeenCalled()
    })

    it('「我们不合适」高确信拒绝 → 正常角色拒绝表白失败', async () => {
      sheZhiShuJuKuMoNi([{ 用户ID: 'yong-hu-id', 是否渣型: false }])
      sheZhiLiangJieDuanMock({ 是否接受: false, 确信度: 0.9, 是否模糊回复: false, 理由: '明确拒绝' })
      const emit = huoQuFaSongShiJian()

      const jieGuo = await jianCeYongHuXiaoXiBingChuLi(
        'yong-hu-id',
        'jiao-se-id',
        '我们不合适',
        500,
        true,
        chuangJianCeShiJiaoSe(false),
        [],
      )

      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.jie_guo_lei_xing).toBe('shi_bai_ju_jue_biao_bai')
      expect(emit).toHaveBeenCalled()
    })

    it('确信度0.5的明确拒绝 → 按模糊处理返回null', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({ 是否接受: false, 确信度: 0.5, 是否模糊回复: false, 理由: '不太确定' }),
      )

      const jieGuo = await chuLiYongHuJuJueAIHuoJieShou(
        'yong-hu-id',
        'jiao-se-id',
        chuangJianCeShiJiaoSe(false),
        '我们还是做朋友吧',
      )

      expect(jieGuo).toBeNull()
    })

    it('确信度0.5的明确接受 → 也返回null', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({ 是否接受: true, 确信度: 0.5, 是否模糊回复: false, 理由: '不太确定' }),
      )

      const jieGuo = await chuLiYongHuJuJueAIHuoJieShou(
        'yong-hu-id',
        'jiao-se-id',
        chuangJianCeShiJiaoSe(false),
        '好呀',
      )

      expect(jieGuo).toBeNull()
    })

    it('判定Prompt契约：注入最近对话历史、声明是否模糊回复字段、历史截取最近10条', async () => {
      let buoHuo: TiaoYongCanShu | undefined
      sheZhiMockTiaoYong(async (canShu) => {
        buoHuo = canShu
        const neiRong = JSON.stringify({
          是否接受: true,
          确信度: 0.95,
          是否模糊回复: false,
          理由: '',
        })
        return {
          neiRong,
          xinXi: { role: 'assistant', content: neiRong },
          yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
        }
      })

      const liShi = Array.from({ length: 12 }, (_, i) => ({
        fa_song_zhe_lei_xing: (i % 2 === 0 ? 'yonghu' : 'jiaose') as 'yonghu' | 'jiaose',
        fa_song_zhe_ming: '对方',
        nei_rong: `历史消息${i}`,
        shi_jian: `10:${String(i).padStart(2, '0')}`,
      }))
      await chuLiYongHuJuJueAIHuoJieShou(
        'yong-hu-id',
        'jiao-se-id',
        chuangJianCeShiJiaoSe(false),
        '我愿意',
        undefined,
        liShi,
      )

      expect(buoHuo).toBeDefined()
      const yongHuXiaoXi = buoHuo!.xiaoXi.find((m) => m.jiaoSe === 'user')!.neiRong as string
      expect(yongHuXiaoXi).toContain('【最近聊天】')
      expect(yongHuXiaoXi).toContain('[10:02] 用户: 历史消息2')
      expect(yongHuXiaoXi).toContain('[10:11] 角色: 历史消息11')
      expect(yongHuXiaoXi).not.toContain('历史消息0')
      expect(yongHuXiaoXi).toContain('"是否模糊回复"')
      expect(yongHuXiaoXi).toContain('用户回复：我愿意')
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

  describe('四连检 Prompt 契约（P1-13）', () => {
    async function buoHuoSiLianPrompt(
      canShu: { xiaoXi?: string; liShi?: DuiHuaLiShiXiang[]; jiaoSe?: AIJiaoSeXinXi } = {},
    ): Promise<TiaoYongCanShu> {
      let buoHuo: TiaoYongCanShu | undefined
      sheZhiMockTiaoYong(async (tiaoYongCanShu) => {
        buoHuo = tiaoYongCanShu
        const neiRong = JSON.stringify({
          是否表白: false,
          表白类型: '非表白',
          表白确信度: 0.1,
          是否互删: false,
          是否识破: false,
          是否神经病: false,
          神经病确信度: 0.1,
          人设能接受: true,
          理由: '',
        })
        return {
          neiRong,
          xinXi: { role: 'assistant', content: neiRong },
          yuanShuJu: {} as TiaoYongJieGuo['yuanShuJu'],
        }
      })

      await jianCeSiLianHeYi(canShu.xiaoXi ?? '今天天气不错', canShu.liShi ?? [], canShu.jiaoSe)
      expect(buoHuo).toBeDefined()
      return buoHuo!
    }

    function huoQuUserWenBen(canShu: TiaoYongCanShu): string {
      const userXiaoXi = canShu.xiaoXi.find((m) => m.jiaoSe === 'user')
      return typeof userXiaoXi?.neiRong === 'string' ? userXiaoXi.neiRong : ''
    }

    it('输出字段声明完整：表白/互删/识破/神经病四类布尔+确信度+人设能接受+理由（含 P0-5 新增神经病确信度）', async () => {
      const buoHuo = await buoHuoSiLianPrompt({ jiaoSe: chuangJianCeShiJiaoSe(false) })
      const wenBen = huoQuUserWenBen(buoHuo)

      for (const ziDuan of [
        '"是否表白"',
        '"表白类型"',
        '"表白确信度"',
        '"是否互删"',
        '"互删确信度"',
        '"是否识破"',
        '"识破确信度"',
        '"是否神经病"',
        '"神经病确信度"',
        '"人设能接受"',
        '"理由"',
      ]) {
        expect(wenBen).toContain(ziDuan)
      }
    })

    it('system 消息声明四类判定职责（两阶段 mock 依赖的路由锚点）', async () => {
      const buoHuo = await buoHuoSiLianPrompt({ jiaoSe: chuangJianCeShiJiaoSe(false) })
      const systemXiaoXi = buoHuo.xiaoXi.find((m) => m.jiaoSe === 'system')
      const wenBen = typeof systemXiaoXi?.neiRong === 'string' ? systemXiaoXi.neiRong : ''
      expect(wenBen).toContain('四类判定')
    })

    it('无角色人设 → 不声明"人设能接受"字段且神经病判定输出空结果', async () => {
      const buoHuo = await buoHuoSiLianPrompt({})
      expect(huoQuUserWenBen(buoHuo)).not.toContain('"人设能接受"')

      chuangJianMockTiaoYong(JSON.stringify({ 是否神经病: true, 确信度: 0.9, 理由: '' }))
      const jieGuo = await jianCeSiLianHeYi('随便说说')
      expect(jieGuo.shen_jing_bing).toEqual({
        shi_fou_shen_jing_bing: false,
        fa_san_si_wei_ren_she: false,
        que_xin_du: 0,
        li_you: '',
      })
    })

    it('解析兜底：LLM 只返回「确信度」时 神经病确信度 正确取兜底值', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({ 是否神经病: true, 人设能接受: false, 确信度: 0.75, 理由: '旧格式响应' }),
      )

      const jieGuo = await jianCeSiLianHeYi('蚂蚁在月球上跳芭蕾', [], chuangJianCeShiJiaoSe(false))

      expect(jieGuo.shen_jing_bing.shi_fou_shen_jing_bing).toBe(true)
      expect(jieGuo.shen_jing_bing.que_xin_du).toBe(0.75)
    })

    it('解析优先级：专用「神经病确信度」存在时压过兜底「确信度」', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({
          是否神经病: true,
          人设能接受: false,
          神经病确信度: 0.85,
          确信度: 0.2,
          理由: '',
        }),
      )

      const jieGuo = await jianCeSiLianHeYi('蚂蚁在月球上跳芭蕾', [], chuangJianCeShiJiaoSe(false))

      expect(jieGuo.shen_jing_bing.que_xin_du).toBe(0.85)
    })

    it('解析兜底：拼音 que_xin_du 键可作表白确信度兜底', async () => {
      chuangJianMockTiaoYong(
        JSON.stringify({ 是否表白: true, 表白类型: '直接表白', que_xin_du: 0.8, 理由: '' }),
      )

      const jieGuo = await jianCeSiLianHeYi('我喜欢你，做我女朋友吧')

      expect(jieGuo.biao_bai.que_xin_du).toBe(0.8)
    })

    it('历史消息拼接格式 [时间] 用户/角色: 内容 且只取最近10条', async () => {
      const liShi: DuiHuaLiShiXiang[] = Array.from({ length: 12 }, (_, i) => ({
        fa_song_zhe_lei_xing: (i % 2 === 0 ? 'yonghu' : 'jiaose') as 'yonghu' | 'jiaose',
        fa_song_zhe_ming: i % 2 === 0 ? '对方' : '小雨',
        nei_rong: `历史消息${i}`,
        shi_jian: `10:${String(i).padStart(2, '0')}`,
      }))

      const buoHuo = await buoHuoSiLianPrompt({
        xiaoXi: '最新一条消息',
        liShi,
        jiaoSe: chuangJianCeShiJiaoSe(false),
      })
      const wenBen = huoQuUserWenBen(buoHuo)

      expect(wenBen).toContain('【最近聊天】')
      expect(wenBen).toContain('[10:02] 用户: 历史消息2')
      expect(wenBen).toContain('[10:03] 角色: 历史消息3')
      expect(wenBen).toContain('[10:11] 角色: 历史消息11')
      expect(wenBen).not.toContain('[10:00] 用户: 历史消息0')
      expect(wenBen).not.toContain('[10:01] 用户: 历史消息1')
    })
  })
})
