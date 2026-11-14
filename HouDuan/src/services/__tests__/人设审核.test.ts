import { describe, expect, it, vi, afterEach } from 'vitest'

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
  },
}))

import {
  caiJueRenShe,
  guiYiRenSheZiDuan,
  shiFouHeFaNianLingShuRu,
  sheZhiRenSheShenHeMock,
  qingChuRenSheShenHeMock,
} from '../人设审核'
import type { XinMuZhongDeTaZiDing } from '../角色生成'
import { RenSheJiaJu, ZhuRuYangLi, type RenSheJiaJuZu } from './人设示例夹具'
import { shiFouXingShi } from '../../config/姓氏表'

const JuJueShouHu = async (): Promise<never> => {
  throw new Error('审核AI不应被调用：该组应由硬规则层裁决')
}

function zuZhuanZiDuan(zu: RenSheJiaJuZu): XinMuZhongDeTaZiDing {
  const ziDuan: XinMuZhongDeTaZiDing = {}
  if (zu.weiXinMing) ziDuan.wei_xin_ming = zu.weiXinMing
  if (zu.zhenShiMing) ziDuan.zhen_shi_ming = zu.zhenShiMing
  if (typeof zu.nianLing === 'number') ziDuan.nian_ling = zu.nianLing
  if (zu.miaoShu) ziDuan.tong_yong_ti_shi_ci = zu.miaoShu
  return ziDuan
}

describe('50组人设示例判定（对象人设示例.txt 2026-11-11 修订版）', () => {
  afterEach(() => {
    qingChuRenSheShenHeMock()
  })

  it('夹具应覆盖50组且通过数与拒绝数与裁定口径一致', () => {
    expect(RenSheJiaJu).toHaveLength(50)
    const tongGuo = RenSheJiaJu.filter((zu) => zu.qiWang.jieLun === 'tongGuo')
    const juJue = RenSheJiaJu.filter((zu) => zu.qiWang.jieLun === 'juJue')
    expect(tongGuo).toHaveLength(33)
    expect(juJue).toHaveLength(17)
  })

  for (const zu of RenSheJiaJu) {
    it(`组${zu.zuHao} ${zu.zuMing} → ${zu.qiWang.jieLun}${zu.qiWang.yuanYinMa ? '/' + zu.qiWang.yuanYinMa : ''}`, async () => {
      if (zu.moNiShenHe) {
        const moNi = zu.moNiShenHe
        sheZhiRenSheShenHeMock(async () => ({
          heFa: true,
          zongPanDing: moNi.zong_pan_ding,
          biaoJi: moNi.biao_ji ?? [],
          ziDuanPanDing: moNi.zi_duan_pan_ding ?? {},
        }))
      } else {
        sheZhiRenSheShenHeMock(JuJueShouHu)
      }

      if (zu.luYouCengNianLing !== undefined) {
        expect(shiFouHeFaNianLingShuRu(zu.luYouCengNianLing)).toBe(false)
      }

      if (zu.luYouCengNianLing !== undefined && zu.zuHao === 41) {
        expect(await caiJueRenShe(zuZhuanZiDuan(zu))).toMatchObject({
          jieLun: 'juJue',
          yuanYinMa: 'wuYouXiaoCanShu',
        })
        return
      }

      const jieGuo = await caiJueRenShe(zuZhuanZiDuan(zu))
      expect(jieGuo.jieLun).toBe(zu.qiWang.jieLun)
      if (zu.qiWang.jieLun === 'juJue') {
        expect(jieGuo.yuanYinMa).toBe(zu.qiWang.yuanYinMa)
      }
    })
  }
})

describe('路由层年龄输入校验', () => {
  it('合法整数 10~99 通过', () => {
    for (const zhi of ['10', '19', '99', 10, 99]) {
      expect(shiFouHeFaNianLingShuRu(zhi)).toBe(true)
    }
  })

  it('未填视为合法（由必填最低要求另行裁决）', () => {
    for (const zhi of ['', null, undefined]) {
      expect(shiFouHeFaNianLingShuRu(zhi)).toBe(true)
    }
  })

  it('非数字/小数/负数/超界拒绝', () => {
    for (const zhi of ['text', '未知', '不详', '88.5', '-5', '100', '9', '7', '8', '2026', 88.5, -5, 100, 9]) {
      expect(shiFouHeFaNianLingShuRu(zhi)).toBe(false)
    }
  })
})

describe('注入与越狱拦截', () => {
  afterEach(() => {
    qingChuRenSheShenHeMock()
  })

  for (const yang of ZhuRuYangLi) {
    it(`拦截：${yang.mingCheng}`, async () => {
      sheZhiRenSheShenHeMock(JuJueShouHu)
      const jieGuo = await caiJueRenShe({
        nian_ling: 20,
        tong_yong_ti_shi_ci: yang.neiRong,
      })
      expect(jieGuo.jieLun).toBe('juJue')
      expect(jieGuo.yuanYinMa).toBe('zhuRuGongJi')
    })
  }

  it('正常第三方家庭描述不得误判为注入', async () => {
    sheZhiRenSheShenHeMock(async () => ({ heFa: true, zongPanDing: 'tongGuo', biaoJi: [], ziDuanPanDing: {} }))
    const jieGuo = await caiJueRenShe({
      nian_ling: 29,
      tong_yong_ti_shi_ci: '我有个双胞胎哥哥，他比我早出生十分钟。',
    })
    expect(jieGuo.jieLun).toBe('tongGuo')
  })
})

describe('姓氏表', () => {
  it('常见姓、复姓与公安部补充姓均命中', () => {
    for (const xing of ['王', '李', '赵', '钱', '肖', '覃', '欧阳', '司马', '上官', '万俟', '皇甫']) {
      expect(shiFouXingShi(xing)).toBe(true)
    }
  })

  it('纯数字、纯符号、无意义词不命中', () => {
    for (const xing of ['1', '66', 'A', '不详', '**', '未知']) {
      expect(shiFouXingShi(xing)).toBe(false)
    }
  })
})

describe('前置归一化', () => {
  it('字母数字与汉字间空格被移除（汉字与汉字间的空格不处理）', () => {
    const jieGuo = guiYiRenSheZiDuan({ wei_xin_ming: '深夜 emo', tong_yong_ti_shi_ci: '喜欢emo 深夜 聊天' })
    expect(jieGuo.wei_xin_ming).toBe('深夜emo')
    expect(jieGuo.tong_yong_ti_shi_ci).toBe('喜欢emo深夜 聊天')
  })

  it('选填占位与空白视为未填', () => {
    const jieGuo = guiYiRenSheZiDuan({
      wei_xin_ming: '选填',
      zhen_shi_ming: '  ',
      tong_yong_ti_shi_ci: '（选填）',
    })
    expect(jieGuo.wei_xin_ming).toBeUndefined()
    expect(jieGuo.zhen_shi_ming).toBeUndefined()
    expect(jieGuo.tong_yong_ti_shi_ci).toBeUndefined()
  })
})

describe('微信名宽松尺度', () => {
  afterEach(() => {
    qingChuRenSheShenHeMock()
  })

  it('emoji、纯符号、纯数字微信名放行', async () => {
    sheZhiRenSheShenHeMock(async () => ({ heFa: true, zongPanDing: 'tongGuo', biaoJi: [], ziDuanPanDing: {} }))
    for (const ming of ['🌙🌙', '***', '152']) {
      const jieGuo = await caiJueRenShe({ wei_xin_ming: ming, nian_ling: 20 })
      expect(jieGuo.jieLun).toBe('tongGuo')
    }
  })

  it('污言秽语微信名拒绝（词库扫描）', async () => {
    sheZhiRenSheShenHeMock(JuJueShouHu)
    const jieGuo = await caiJueRenShe({ wei_xin_ming: '草拟吗', nian_ling: 19 })
    expect(jieGuo.jieLun).toBe('juJue')
    expect(jieGuo.yuanYinMa).toBe('zangHua')
  })
})

describe('fail-closed 与部分采纳', () => {
  afterEach(() => {
    qingChuRenSheShenHeMock()
  })

  it('审核服务异常时拒绝且原因为审核不可用', async () => {
    sheZhiRenSheShenHeMock(async () => ({ heFa: false }))
    const jieGuo = await caiJueRenShe({ wei_xin_ming: '阳光', nian_ling: 20 })
    expect(jieGuo).toMatchObject({ jieLun: 'juJue', yuanYinMa: 'shenHeBuKeYong' })
  })

  it('部分采纳保留有效片段', async () => {
    sheZhiRenSheShenHeMock(async () => ({
      heFa: true,
      zongPanDing: 'buFen',
      biaoJi: [],
      ziDuanPanDing: {
        tong_yong_ti_shi_ci: { pan_ding: 'buFen', bao_liu_pian_duan: ['性格开朗的小伙子。'] },
      },
    }))
    const jieGuo = await caiJueRenShe({
      wei_xin_ming: '阳光小子',
      nian_ling: 11,
      tong_yong_ti_shi_ci: '性格开朗的小伙子。1113',
    })
    expect(jieGuo.jieLun).toBe('buFenCaiNa')
    expect(jieGuo.baoLiuPianDuan).toEqual(['性格开朗的小伙子。'])
  })

  it('部分采纳但无有效片段时拒绝', async () => {
    sheZhiRenSheShenHeMock(async () => ({
      heFa: true,
      zongPanDing: 'buFen',
      biaoJi: [],
      ziDuanPanDing: { tong_yong_ti_shi_ci: { pan_ding: 'buFen', bao_liu_pian_duan: [] } },
    }))
    const jieGuo = await caiJueRenShe({ nian_ling: 20, tong_yong_ti_shi_ci: '天地四季昼夜' })
    expect(jieGuo).toMatchObject({ jieLun: 'juJue', yuanYinMa: 'feiRenWuMiaoShu' })
  })
})
