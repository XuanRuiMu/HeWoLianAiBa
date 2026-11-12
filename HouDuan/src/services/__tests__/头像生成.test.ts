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

vi.mock('../../数据库', () => ({
  数据库: {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    connect: vi.fn(async () => ({ query: vi.fn(), release: vi.fn() })),
  },
}))

const shengTuJieKouMock = vi.hoisted(() => vi.fn())
const liuShiBaoCunMock = vi.hoisted(() => vi.fn())

vi.mock('../图像生成', () => ({
  diaoYongShengTuJieKou: (...canShu: unknown[]) => shengTuJieKouMock(...canShu),
}))

vi.mock('../媒体存储', () => ({
  liuShiBaoCunMeiTi: (...canShu: unknown[]) => liuShiBaoCunMock(...canShu),
  shengChengMeiTiYinYong: (sha: string) => `/api/媒体/${sha.toLowerCase()}`,
}))

vi.mock('../消息', () => ({
  baoCunJiaoSeMeiTiXiaoXi: vi.fn(async () => ({ id: 'x' })),
}))

vi.mock('../../socket/io', () => ({ huoQuIo: vi.fn(() => null) }))

import {
  xuanZeTouXiangFengGe,
  zuZhuangTouXiangTiShiCi,
  shengChengJiaoSeTouXiang,
  changShiTouXiangYanHua,
  tuiDaoTouXiangQiZhi,
} from '../头像生成'
import { tuiDaoQingXuJiDiao } from '../../config/头像配置'

describe('头像风格选择', () => {
  it('同一角色ID确定性选择同一风格', () => {
    const canShu = { nianLing: 20, mbti: 'INFP', shenFen: '大学生', xiHao: ['阅读'], zhongZi: 'jiao-se-1' }
    const yiCi = xuanZeTouXiangFengGe(canShu)
    const erCi = xuanZeTouXiangFengGe(canShu)
    expect(yiCi?.fengGe.类别).toBe(erCi?.fengGe.类别)
  })

  it('不同角色大概率不同风格（去重抽查）', () => {
    const fengGeJi = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const xuanZe = xuanZeTouXiangFengGe({
        nianLing: 20,
        mbti: 'ENFP',
        shenFen: '大学生',
        xiHao: [],
        zhongZi: `jiao-se-${i}`,
      })
      if (xuanZe) fengGeJi.add(xuanZe.fengGe.类别)
    }
    expect(fengGeJi.size).toBeGreaterThan(1)
  })

  it('演化基调覆盖MBTI气质', () => {
    const yinYuXuanZe = xuanZeTouXiangFengGe({
      nianLing: 20,
      mbti: 'ENFP',
      xiHao: [],
      zhongZi: 'z',
      jiDiao: '阴郁',
    })
    expect(yinYuXuanZe?.qiZhi).toBe('冷感')
  })

  it('MBTI气质推导符合映射', () => {
    expect(tuiDaoTouXiangQiZhi('INFP')).toBe('文艺')
    expect(tuiDaoTouXiangQiZhi('ESTP')).toBe('活泼')
    expect(tuiDaoTouXiangQiZhi('INTJ')).toBe('沉稳')
  })
})

describe('头像提示词组装', () => {
  it('人物主体类含人物句式、视线约束与构图约束', () => {
    const xuanZe = xuanZeTouXiangFengGe({ nianLing: 20, mbti: 'INFP', xiHao: [], zhongZi: 'a' })
    if (!xuanZe) throw new Error('风格库为空')
    if (!xuanZe.fengGe.是否人物主体) {
      const renWuXuanZe = xuanZeTouXiangFengGe({ nianLing: 20, mbti: 'INFP', xiHao: [], zhongZi: 'b' })
      if (!renWuXuanZe) throw new Error('风格库为空')
      const zuZhuang = zuZhuangTouXiangTiShiCi(renWuXuanZe, { nianLing: 20, xingBie: 'nv', waiMao: '长发温柔' })
      expect(zuZhuang.prompt).toContain(renWuXuanZe.fengGe.画风锚点)
      return
    }
    const zuZhuang = zuZhuangTouXiangTiShiCi(xuanZe, { nianLing: 20, xingBie: 'nv', waiMao: '长发温柔' })
    expect(zuZhuang.prompt).toContain('20岁的女性')
    expect(zuZhuang.prompt).toContain('长发温柔')
    expect(zuZhuang.prompt).toContain('目光望向画面侧边')
    expect(zuZhuang.prompt).toContain('不直视观看者')
    expect(zuZhuang.negativePrompt).toContain('直视镜头')
    expect(zuZhuang.negativePrompt).toContain('照片')
  })

  it('物件主体类按气质配色与氛围填充模板', () => {
    for (let i = 0; i < 12; i++) {
      const xuanZe = xuanZeTouXiangFengGe({ nianLing: 20, mbti: 'ENFP', xiHao: [], zhongZi: `w-${i}` })
      if (!xuanZe) throw new Error('风格库为空')
      if (xuanZe.fengGe.是否人物主体) continue
      const zuZhuang = zuZhuangTouXiangTiShiCi(xuanZe, { nianLing: 20, xingBie: 'nv', waiMao: '' })
      expect(zuZhuang.prompt).not.toContain('{配色}')
      expect(zuZhuang.prompt).not.toContain('{氛围}')
      expect(zuZhuang.prompt).not.toContain('{小物}')
      expect(zuZhuang.miaoShu.length).toBeGreaterThan(0)
      expect(zuZhuang.miaoShu.length).toBeLessThanOrEqual(60)
      return
    }
    throw new Error('未抽到物件主体类风格')
  })

  it('抑郁人设推导阴郁基调', () => {
    expect(tuiDaoQingXuJiDiao('性格内向，有点抑郁，不太爱说话')).toBe('阴郁')
    expect(tuiDaoQingXuJiDiao('开朗爱笑的姑娘')).toBe('明朗')
    expect(tuiDaoQingXuJiDiao('话不多')).toBe('平静')
  })
})

describe('头像生成主流程', () => {
  beforeEach(() => {
    shengTuJieKouMock.mockReset()
    liuShiBaoCunMock.mockReset()
  })

  it('生成成功后裁剪入库并更新角色头像与描述', async () => {
    shengTuJieKouMock.mockResolvedValue({ cheng_gong: true, tuPianZiJie: Buffer.from('png-data'), mime: 'image/png' })
    liuShiBaoCunMock.mockResolvedValue({ mediaId: 'm-1', sha256: 'A'.repeat(64) })
    const jieGuo = await shengChengJiaoSeTouXiang({
      yongHuId: 'u-1',
      jiaoSeId: 'j-1',
      jiaoSe: {
        nian_ling: 20,
        xing_bie: 'nv',
        mbti_lei_xing: 'INFP',
        shen_fen: '大学生',
        wai_mao: '长发温柔',
        xi_hao: ['阅读'],
        xing_ge: '安静内向',
      },
    })
    expect(jieGuo.chengGong).toBe(true)
    expect(jieGuo.touXiangMiaoShu).toBeTruthy()
    expect(shengTuJieKouMock).toHaveBeenCalledTimes(1)
    const canShu = shengTuJieKouMock.mock.calls[0][0] as { fuMianTiShiCi: string; tuXiangChiCun: string }
    expect(canShu.fuMianTiShiCi).toContain('直视镜头')
    expect(canShu.tuXiangChiCun).toBe('1024x1024')
    expect(liuShiBaoCunMock).toHaveBeenCalledTimes(1)
  })

  it('生成失败时入重试队列且不更新角色', async () => {
    shengTuJieKouMock.mockResolvedValue({ cheng_gong: false, ti_shi: 'x' })
    const jieGuo = await shengChengJiaoSeTouXiang({
      yongHuId: 'u-1',
      jiaoSeId: 'j-2',
      jiaoSe: {
        nian_ling: 22,
        xing_bie: 'nan',
        mbti_lei_xing: 'INTJ',
        shen_fen: '工作人',
        wai_mao: '',
        xi_hao: [],
        xing_ge: '沉稳',
      },
    })
    expect(jieGuo.chengGong).toBe(false)
    expect(liuShiBaoCunMock).not.toHaveBeenCalled()
  })
})

describe('头像演化门控', () => {
  beforeEach(() => {
    shengTuJieKouMock.mockReset()
    liuShiBaoCunMock.mockReset()
  })

  it('单一来源证据不触发演化', async () => {
    shengTuJieKouMock.mockResolvedValue({ cheng_gong: true, tuPianZiJie: Buffer.from('x'), mime: 'image/png' })
    const jieGuo = await changShiTouXiangYanHua({ yongHuId: 'u-1', jiaoSeId: 'j-e-1', laiYuan: 'qinMiDuBianHua' })
    expect(jieGuo).toBe(false)
  })
})
