import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../数据库', () => ({
  数据库: {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    connect: vi.fn(async () => ({ query: vi.fn(), release: vi.fn() })),
  },
}))
vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    hincrby: vi.fn(async () => 1),
    hgetall: vi.fn(async () => ({})),
  },
}))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuHTTPQingQiu: vi.fn(),
  jiLuAIJiLu: vi.fn(),
}))
vi.mock('../开场白生成', () => ({
  shengChengKaiChangBai: vi.fn(async () => ({
    zhu_dong_kai_kou_gai_lv: 0,
    zhu_dong_dang_wei: 'di',
    xiao_xi_lie_biao: [],
  })),
}))
vi.mock('../AI输入准备', async (yuanShi) => {
  const zhenShi = await yuanShi<typeof import('../AI输入准备')>()
  return {
    ...zhenShi,
    保存角色XiaoXi: vi.fn(async () => ({
      id: 'x',
      hui_hua_id: 'j',
      fa_song_zhe_id: 'j',
      fa_song_zhe_lei_xing: 'jiaose',
      ai_biao_shi: true,
      nei_rong: '',
      lei_xing: 'wenben',
      shi_jian_chuo: 0,
      yi_du: true,
      yi_che_hui: false,
      che_hui_shi_jian: null,
      ke_hu_duan_xu_hao: 1,
      mi_deng_jian: null,
      mei_ti_id: null,
      mei_ti_url: null,
    })),
  }
})

import {
  mbtiLieBiao,
  shenFenLieBiao,
  shenFenPeiZhi,
  xingGeMiaoShu,
  xingWeiTeDian,
  yanYuFengGe,
  zhiYeAiHaoBaiMing,
  shiXueShengShenFen,
} from '../../config/角色配置'
import { shengChengJiaoSe } from '../角色生成'

const 服务目录 = join(process.cwd(), 'src', 'services')

function 取四字词组(wenBen: string): Set<string> {
  const jiHe = new Set<string>()
  for (let qiShi = 0; qiShi + 4 <= wenBen.length; qiShi += 1) {
    jiHe.add(wenBen.slice(qiShi, qiShi + 4))
  }
  return jiHe
}

function 共同四字词组(jia: string, yi: string): string[] {
  const yiJiHe = 取四字词组(yi)
  return [...取四字词组(jia)].filter((ci) => yiJiHe.has(ci))
}

function 取五字词组(wenBen: string): Set<string> {
  const jiHe = new Set<string>()
  for (let qiShi = 0; qiShi + 5 <= wenBen.length; qiShi += 1) {
    jiHe.add(wenBen.slice(qiShi, qiShi + 5))
  }
  return jiHe
}

function 共同五字词组(jia: string, yi: string): string[] {
  const yiJiHe = 取五字词组(yi)
  return [...取五字词组(jia)].filter((ci) => yiJiHe.has(ci))
}

describe('FP32 十六型性格描述差异化', () => {
  it('十六条两两不完全相同，且每条长度不小于 35 字', () => {
    const quanBu = mbtiLieBiao.map((mbti) => xingGeMiaoShu[mbti])
    expect(quanBu).toHaveLength(16)
    expect(new Set(quanBu).size).toBe(16)
    for (const mbti of mbtiLieBiao) {
      expect(xingGeMiaoShu[mbti].length, `${mbti} 长度不足`).toBeGreaterThanOrEqual(35)
    }
  })

  it('再也没有整片套用「，但」模板', () => {
    const ciShu = mbtiLieBiao.reduce(
      (leiJi, mbti) => leiJi + (xingGeMiaoShu[mbti].match(/，但/g) ?? []).length,
      0,
    )
    expect(ciShu).toBeLessThanOrEqual(8)
  })

  it('三对易混型彼此不相等，且没有共同四字词组', () => {
    const duiLie: Array<[keyof typeof xingGeMiaoShu, keyof typeof xingGeMiaoShu]> = [
      ['ISTJ', 'ESTJ'],
      ['ISFJ', 'ESFJ'],
      ['INFJ', 'INFP'],
    ]
    for (const [jia, yi] of duiLie) {
      const jiaWenBen = xingGeMiaoShu[jia]
      const yiWenBen = xingGeMiaoShu[yi]
      expect(jiaWenBen).not.toBe(yiWenBen)
      expect(共同四字词组(jiaWenBen, yiWenBen), `${jia} 与 ${yi} 撞词`).toEqual([])
    }
  })

  it('十六型行为特点两两不完全相同', () => {
    const quanBu = mbtiLieBiao.map((mbti) => xingWeiTeDian[mbti])
    expect(quanBu).toHaveLength(16)
    expect(new Set(quanBu).size).toBe(16)
    for (const mbti of mbtiLieBiao) {
      expect(xingWeiTeDian[mbti].length, `${mbti} 行为特点过短`).toBeGreaterThanOrEqual(20)
    }
  })

  it('言语风格里「记得」这个卖点最多出现两次', () => {
    const mingZhong = mbtiLieBiao.filter((mbti) => yanYuFengGe[mbti].includes('记得'))
    expect(mingZhong.length).toBeLessThanOrEqual(2)
  })

  it('言语风格十六条两两不完全相同', () => {
    const quanBu = mbtiLieBiao.map((mbti) => yanYuFengGe[mbti])
    expect(new Set(quanBu).size).toBe(16)
  })

  it('三张表任意两型都没有共同五字词组', () => {
    const biaoLie: Array<[string, Record<string, string>]> = [
      ['性格描述', xingGeMiaoShu],
      ['行为特点', xingWeiTeDian],
      ['言语风格', yanYuFengGe],
    ]
    for (const [biaoMing, biao] of biaoLie) {
      for (let jia = 0; jia < mbtiLieBiao.length; jia += 1) {
        for (let yi = jia + 1; yi < mbtiLieBiao.length; yi += 1) {
          const jiaMing = mbtiLieBiao[jia]
          const yiMing = mbtiLieBiao[yi]
          const gongTong = 共同五字词组(biao[jiaMing], biao[yiMing])
          expect(gongTong, `${biaoMing} ${jiaMing} 与 ${yiMing} 撞词`).toEqual([])
        }
      }
    }
  })
})

describe('FP32 生产链路回填行为特点', () => {
  it('AI 输入准备不再把行为特点写死成空串', () => {
    const yuanMa = readFileSync(join(服务目录, 'AI输入准备.ts'), 'utf8')
    expect(yuanMa).not.toContain("xing_wei_te_dian: '',")
    expect(yuanMa).toContain('xing_wei_te_dian:')
    expect(yuanMa).toContain('xingWeiTeDian')
  })

  it('角色详情读取也不再把人设行为特点丢掉', () => {
    const yuanMa = readFileSync(join(服务目录, '角色生成.ts'), 'utf8')
    expect(yuanMa).not.toContain("xing_wei_te_dian: '',")
    expect(yuanMa).toContain('quXingWeiTeDian')
  })

  it('按 MBTI 查得到文案，查不到时回落到空串', async () => {
    const { quXingWeiTeDian } = await import('../AI输入准备')
    expect(quXingWeiTeDian('ISTJ')).toBe(xingWeiTeDian.ISTJ)
    expect(quXingWeiTeDian('ESFP')).toBe(xingWeiTeDian.ESFP)
    expect(quXingWeiTeDian('XXXX')).toBe('')
    expect(quXingWeiTeDian('')).toBe('')
  })
})

describe('FP32 职业与爱好白名单', () => {
  it('白名单覆盖全部身份类型，每个身份至少三个爱好', () => {
    for (const shenFen of shenFenLieBiao) {
      const chi = zhiYeAiHaoBaiMing[shenFen]
      expect(chi, `${shenFen} 缺白名单`).toBeTruthy()
      expect(chi.length, `${shenFen} 爱好池不足`).toBeGreaterThanOrEqual(3)
      expect(new Set(chi).size).toBe(chi.length)
    }
    expect(Object.keys(zhiYeAiHaoBaiMing).sort()).toEqual(
      shenFenPeiZhi.map((peiZhi) => peiZhi.leiXing).sort(),
    )
  })

  it('身份之间爱好池不串味', () => {
    const mingCheng = Object.keys(zhiYeAiHaoBaiMing) as Array<keyof typeof zhiYeAiHaoBaiMing>
    for (let jia = 0; jia < mingCheng.length; jia += 1) {
      for (let yi = jia + 1; yi < mingCheng.length; yi += 1) {
        const jiaoJi = zhiYeAiHaoBaiMing[mingCheng[jia]].filter((aiHao) =>
          zhiYeAiHaoBaiMing[mingCheng[yi]].includes(aiHao),
        )
        expect(jiaoJi, `${mingCheng[jia]} 与 ${mingCheng[yi]} 撞爱好`).toEqual([])
      }
    }
  })

  it('生成出来的角色爱好都落在自己身份的池子里', () => {
    for (const mbti of mbtiLieBiao) {
      for (let ciShu = 0; ciShu < 3; ciShu += 1) {
        const jiaoSe = shengChengJiaoSe({
          yong_hu_id: 'u-fp32',
          xing_bie: 'nv',
          mbti_lei_xing: mbti,
        })
        const chi = zhiYeAiHaoBaiMing[jiaoSe.shen_fen as keyof typeof zhiYeAiHaoBaiMing]
        expect(chi, `${mbti} 身份 ${jiaoSe.shen_fen} 无池`).toBeTruthy()
        expect(jiaoSe.xi_hao).toHaveLength(3)
        expect(new Set(jiaoSe.xi_hao).size).toBe(3)
        for (const aiHao of jiaoSe.xi_hao) {
          expect(chi.includes(aiHao), `${jiaoSe.shen_fen} 抽到池外爱好 ${aiHao}`).toBe(true)
        }
      }
    }
  })

  it('非学生身份不带学校字段，学生身份带', () => {
    for (const mbti of mbtiLieBiao) {
      const jiaoSe = shengChengJiaoSe({
        yong_hu_id: 'u-fp32',
        xing_bie: 'nan',
        mbti_lei_xing: mbti,
      })
      const xueXiao = jiaoSe.shi_jie_xin_xi.xue_xiao
      const nianJi = jiaoSe.shi_jie_xin_xi.nian_ji
      if (shiXueShengShenFen(jiaoSe.shen_fen)) {
        expect(typeof xueXiao).toBe('string')
        expect(String(xueXiao).length).toBeGreaterThan(0)
        expect(typeof nianJi).toBe('string')
      } else {
        expect(xueXiao, `${jiaoSe.shen_fen} 不该有学校`).toBeNull()
        expect(nianJi, `${jiaoSe.shen_fen} 不该有年级`).toBeNull()
      }
    }
  })
})
