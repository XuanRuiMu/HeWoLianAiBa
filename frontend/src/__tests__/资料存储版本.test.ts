import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { 使用认证表单仓库 } from '@/stores/认证表单'

const ZI_LIAO_JIAN = 'hewolianba_ziLiaoShuJu'

function duQuXinFeng(): { banBen?: unknown; shuJu?: Record<string, unknown> } | null {
  const yuan = localStorage.getItem(ZI_LIAO_JIAN)
  return yuan === null ? null : JSON.parse(yuan)
}

function xieRuXinFeng(neiRong: unknown) {
  localStorage.setItem(ZI_LIAO_JIAN, JSON.stringify(neiRong))
}

describe('P1-11 资料持久化 schema 版本', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('保存资料时写入带 banBen 版本号的持久化信封', () => {
    setActivePinia(createPinia())
    const cangKu = 使用认证表单仓库()
    cangKu.ziLiaoShuJu.niCheng = '小星'
    cangKu.baoCunZiLiaoZhuangTai()

    const xinFeng = duQuXinFeng()
    expect(xinFeng).not.toBeNull()
    expect(xinFeng?.banBen).toBe(2)
    expect(xinFeng?.shuJu?.niCheng).toBe('小星')
  })

  it('当前版本信封加载后完整恢复字段与嵌套表单', () => {
    xieRuXinFeng({
      banBen: 2,
      shuJu: {
        niCheng: '阿月',
        xingBie: 'female',
        muBiaoXingBie: 'male',
        xingGeXuanZe: 'INFP',
        renSheBiaoQian: 'neiLianXueBa',
        yunXuZhaNanZhaNv: true,
        xinMuZhongDeTa: {
          weiXinMing: '月亮',
          zhenShiMing: '',
          nianLing: '22',
          tongYongTiShiCi: '温柔爱笑',
        },
      },
    })
    setActivePinia(createPinia())
    const cangKu = 使用认证表单仓库()

    expect(cangKu.ziLiaoShuJu.niCheng).toBe('阿月')
    expect(cangKu.ziLiaoShuJu.xingBie).toBe('female')
    expect(cangKu.ziLiaoShuJu.xingGeXuanZe).toBe('INFP')
    expect(cangKu.ziLiaoShuJu.yunXuZhaNanZhaNv).toBe(true)
    expect(cangKu.ziLiaoShuJu.xinMuZhongDeTa.weiXinMing).toBe('月亮')
  })

  it('无版本号的旧格式数据被安全丢弃并重建默认值', () => {
    xieRuXinFeng({ niCheng: '旧格式数据', yunXuZhaNanZhaNv: true })
    setActivePinia(createPinia())
    const cangKu = 使用认证表单仓库()

    expect(cangKu.ziLiaoShuJu.niCheng).toBe('')
    expect(cangKu.ziLiaoShuJu.yunXuZhaNanZhaNv).toBe(false)
    expect(cangKu.ziLiaoShuJu.xinMuZhongDeTa.weiXinMing).toBe('')
  })

  it('低版本与未来版本数据同样丢弃重建，不抛错不脏读', () => {
    xieRuXinFeng({ banBen: 0, shuJu: { niCheng: '低版本' } })
    setActivePinia(createPinia())
    let cangKu = 使用认证表单仓库()
    expect(cangKu.ziLiaoShuJu.niCheng).toBe('')

    setActivePinia(createPinia())
    xieRuXinFeng({ banBen: 99, shuJu: { niCheng: '未来版本' } })
    cangKu = 使用认证表单仓库()
    expect(cangKu.ziLiaoShuJu.niCheng).toBe('')
  })

  it('损坏数据（非对象/非法JSON）不致崩溃并保持默认值', () => {
    localStorage.setItem(ZI_LIAO_JIAN, '{非法json')
    setActivePinia(createPinia())
    let cangKu = 使用认证表单仓库()
    expect(cangKu.ziLiaoShuJu.niCheng).toBe('')

    setActivePinia(createPinia())
    xieRuXinFeng('纯字符串')
    cangKu = 使用认证表单仓库()
    expect(cangKu.ziLiaoShuJu.niCheng).toBe('')
  })

  it('信封缺 shuJu 字段时丢弃重建默认值', () => {
    xieRuXinFeng({ banBen: 2 })
    setActivePinia(createPinia())
    const cangKu = 使用认证表单仓库()

    expect(cangKu.ziLiaoShuJu.niCheng).toBe('')
    expect(cangKu.ziLiaoShuJu.xingBie).toBeNull()
  })

  it('旧版本v1信封丢弃重建，不抛错不脏读', () => {
    xieRuXinFeng({
      banBen: 1,
      shuJu: {
        niCheng: '旧版数据',
        xinMuZhongDeTa: {
          weiXinMing: '旧版',
          zhenShiMing: '',
          nianLing: '22',
          shenFen: '大学生',
          zhiYe: '临床医学',
          chengShi: '杭州',
          jiaXiang: '成都',
        },
      },
    })
    setActivePinia(createPinia())
    const cangKu = 使用认证表单仓库()

    expect(cangKu.ziLiaoShuJu.niCheng).toBe('')
    expect(cangKu.ziLiaoShuJu.xinMuZhongDeTa.weiXinMing).toBe('')
    expect(cangKu.ziLiaoShuJu.xinMuZhongDeTa.tongYongTiShiCi).toBe('')
  })
})
