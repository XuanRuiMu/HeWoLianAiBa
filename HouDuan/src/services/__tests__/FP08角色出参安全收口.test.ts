import { describe, expect, it, vi } from 'vitest'

const cunChu = vi.hoisted(() => new Map<string, string>())
const sheZhiCanXu = vi.hoisted(() => [] as unknown[][])

vi.mock('../../redis', () => ({
  redis: {
    set: vi.fn(async (...canShu: unknown[]) => {
      const jian = String(canShu[0])
      const zhi = String(canShu[1])
      cunChu.set(jian, zhi)
      sheZhiCanXu.push(canShu)
      return 'OK'
    }),
    get: vi.fn(async (jian: string) => cunChu.get(jian) ?? null),
    del: vi.fn(async (jian: string) => {
      cunChu.delete(jian)
      return 1
    }),
  },
}))

import {
  JIAO_SE_YIN_SI_ZI_DUAN,
  daiQueRenJiaoSeJian,
  duQuDaiQueRenJiaoSe,
  huanCunDaiQueRenJiaoSe,
  touYingGuanLiJiaoSe,
  touYingWanJiaKeJianJiaoSe,
  type ShengChengJiaoSeJieGuo,
} from '../角色生成'

const DUO_SHOU_JIAO_SE: ShengChengJiaoSeJieGuo = {
  id: '6ef2a94a-67be-4e9b-9c93-f0a2c9df6f21',
  ming_zi: '林知夏',
  xing_bie: 'nv',
  nian_ling: 20,
  shen_fen: '大学生',
  wai_mao: '校服飘逸',
  xing_ge: '安静内敛',
  bei_jing_gu_shi: '林知夏来自江南水乡，现居杭州。',
  xi_hao: ['散文'],
  yan_yu_feng_ge: '轻声慢语',
  xing_wei_te_dian: '爱低头',
  tou_xiang: '👩',
  biao_qian: ['INTP', '智慧型', '女生'],
  xi_huan_de_lei_xing: '文静的',
  jia_ting_bei_jing: '书香门第',
  qing_gan_jing_li: '一段初恋',
  shi_fou_zha_xing: false,
  yu_she_lei_xing: 'INTP',
  mbti_lei_xing: 'INTP',
  ie_lei_xing: 'I',
  sui_ji_xing_ge: false,
  re_shen_lei_xing: '慢热',
  hui_fu_yan_chi_hao_miao: 3000,
  wei_xin_ming: '夏目小樱',
  zhen_shi_ming: '林知夏',
  shi_jie_xin_xi: { cheng_shi: '杭州', zhi_ye: '汉语言文学' },
  xi_tong_ti_shi: '你是林知夏……',
  ba_da_mo_kuai: {
    ji_ben_xin_xi: '姓名：林知夏',
    wai_mao: '',
    xing_ge: '',
    bei_jing: '',
    yan_yu: '',
    xing_wei: '',
    guan_xi: '',
    xi_tong_ti_shi: '',
  },
  hao_gan_du_zong_fen: 520,
  voice_id: 'nv-yin-se-x-xiao_he',
}

function shengChengZhaXingJiaoSe(): ShengChengJiaoSeJieGuo {
  return {
    ...DUO_SHOU_JIAO_SE,
    shi_fou_zha_xing: true,
    zha_fa_miao_shu: '表面贴贴，背后操控',
    hua_shu: ['你不懂我'],
    bao_lu_fang_shi: '聊天记录',
    shi_po_xian_suo: ['称呼不一致'],
  }
}

const SUI_CANG_GONG_KAI: (keyof ShengChengJiaoSeJieGuo)[] = [
  'wei_xin_ming',
  'xing_bie',
  'nian_ling',
  'wai_mao',
  'xing_ge',
  'tou_xiang',
  'mbti_lei_xing',
  'yu_she_lei_xing',
  'id',
]

describe('FP08 角色出参敏感字段脱敏（玩家透出层）', () => {
  it('玩家透出层剥离内部名/真名/世界信息/系统提示/八大模块', () => {
    const touYing = touYingWanJiaKeJianJiaoSe(DUO_SHOU_JIAO_SE) as unknown as Record<string, unknown>
    for (const jian of JIAO_SE_YIN_SI_ZI_DUAN) {
      expect(jian in touYing).toBe(false)
    }
    expect('hao_gan_du_zong_fen' in touYing).toBe(false)
    expect('shi_fou_zha_xing' in touYing).toBe(false)
    for (const jian of SUI_CANG_GONG_KAI) {
      expect(jian in touYing).toBe(true)
    }
  })

  it('序列化响应中不残留任何敏感值', () => {
    const xuLie = JSON.stringify(touYingWanJiaKeJianJiaoSe(DUO_SHOU_JIAO_SE))
    expect(xuLie).not.toContain('林知夏')
    expect(xuLie).toContain('夏目小樱')
    const zhaXing = JSON.stringify(touYingWanJiaKeJianJiaoSe(shengChengZhaXingJiaoSe()))
    expect(zhaXing).not.toContain('林知夏')
    expect(zhaXing).not.toContain('表面贴贴')
    expect(zhaXing).not.toContain('520')
  })

  it('透出层不改写源对象（服务端内部仍可用完整字段）', () => {
    const yuanShi = shengChengZhaXingJiaoSe()
    touYingWanJiaKeJianJiaoSe(yuanShi)
    expect((yuanShi as unknown as Record<string, unknown>).ming_zi).toBe('林知夏')
    expect((yuanShi as unknown as Record<string, unknown>).zhen_shi_ming).toBe('林知夏')
    expect((yuanShi as unknown as Record<string, unknown>).shi_jie_xin_xi).toEqual(
      DUO_SHOU_JIAO_SE.shi_jie_xin_xi,
    )
  })

  it('运营/管理投影保留隐私字段但剥离渣型与总分', () => {
    const jiaoSe = shengChengZhaXingJiaoSe()
    const guanLi = touYingGuanLiJiaoSe(jiaoSe) as unknown as Record<string, unknown>
    expect(guanLi.ming_zi).toBe('林知夏')
    expect(guanLi.zhen_shi_ming).toBe('林知夏')
    expect('shi_jie_xin_xi' in guanLi).toBe(true)
    expect(guanLi.bei_jing_gu_shi).toBe('林知夏来自江南水乡，现居杭州。')
    expect('shi_fou_zha_xing' in guanLi).toBe(false)
    expect('zha_fa_miao_shu' in guanLi).toBe(false)
    expect('hua_shu' in guanLi).toBe(false)
    expect('hao_gan_du_zong_fen' in guanLi).toBe(false)
  })

  it('隐私字段名单与内部属性调用点一致', () => {
    expect(new Set(JIAO_SE_YIN_SI_ZI_DUAN)).toEqual(
      new Set([
        'ming_zi',
        'zhen_shi_ming',
        'bei_jing_gu_shi',
        'shi_jie_xin_xi',
        'xi_tong_ti_shi',
        'ba_da_mo_kuai',
      ]),
    )
  })
})

describe('FP08 待确认角色缓存（头端持久化回归兜底）', () => {
  it('生成结果能缓存并原样读回', async () => {
    await huanCunDaiQueRenJiaoSe(DUO_SHOU_JIAO_SE.id, DUO_SHOU_JIAO_SE)
    const jian = daiQueRenJiaoSeJian(DUO_SHOU_JIAO_SE.id)
    expect(cunChu.has(jian)).toBe(true)
    const duQu = await duQuDaiQueRenJiaoSe(DUO_SHOU_JIAO_SE.id)
    expect(duQu).toEqual(DUO_SHOU_JIAO_SE)
  })

  it('缓存写入带过期时间且键按用户隔离', async () => {
    await huanCunDaiQueRenJiaoSe(DUO_SHOU_JIAO_SE.id, DUO_SHOU_JIAO_SE)
    expect(sheZhiCanXu[0]?.[2]).toBe('EX')
    expect(sheZhiCanXu[0]?.[3]).toBe(1800)
    expect(daiQueRenJiaoSeJian(DUO_SHOU_JIAO_SE.id)).toMatch(/^dai_que_ren_jiao_se:/)
  })

  it('键缺失或载荷损坏时按无缓存处理', async () => {
    cunChu.set(
      daiQueRenJiaoSeJian('e5d4a95a-67be-4e9b-9c93-f0a2c9df6f22'),
      '{不是合法JSON',
    )
    expect(await duQuDaiQueRenJiaoSe('e5d4a95a-67be-4e9b-9c93-f0a2c9df6f22')).toBeNull()
    expect(await duQuDaiQueRenJiaoSe('f7e4a95a-67be-4e9b-9c93-f0a2c9df6f33')).toBeNull()
  })

  it('非角色形状的载荷拒绝读取', async () => {
    cunChu.set(
      daiQueRenJiaoSeJian('a1b4a95a-67be-4e9b-9c93-f0a2c9df6f44'),
      JSON.stringify({ wei_xin_ming: 'xiaomu' }),
    )
    expect(await duQuDaiQueRenJiaoSe('a1b4a95a-67be-4e9b-9c93-f0a2c9df6f44')).toBeNull()
  })
})
