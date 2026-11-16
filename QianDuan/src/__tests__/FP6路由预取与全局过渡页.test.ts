import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import {
  GuoDuChaoShiHaoMiao,
  GuoDuRuChangHaoMiao,
  JingSuHaoMiao,
  anJingHua,
  cunYuQuJiaoJie,
  guoDuZhuangTai,
  jieShuGuoDu,
  jieXiGuoDuWenAn,
  kaiShiLuYouYuQu,
  quYuQuJiaoJie,
  tuiJinLuYouPiCi,
  zhongZhiYuQu,
  type YuJiaZaiPeiZhi,
} from '@/router/预取'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { chuFaCuoWuShangBao } = vi.hoisted(() => ({ chuFaCuoWuShangBao: vi.fn() }))
vi.mock('@/utils/错误上报', () => ({ chuFaCuoWuShangBao }))

const 源码根 = resolve(__dirname, '..')
const 读源 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')

function 假路由(名字: unknown): RouteLocationNormalized {
  return { name: 名字 } as unknown as RouteLocationNormalized
}

function 挂起<T>(): { chengNuo: Promise<T>; duiXian: (zhi: T) => void } {
  let duiXian!: (zhi: T) => void
  const chengNuo = new Promise<T>((jieJue) => {
    duiXian = jieJue
  })
  return { chengNuo, duiXian }
}

function 启动慢预取(wenAn = 'guoWangZhanJi'): {
  renWu: ReturnType<typeof 挂起<string>>
  yunXing: Promise<void>
} {
  const renWu = 挂起<string>()
  const peiZhi: YuJiaZaiPeiZhi = { wenAn, renWu: [() => renWu.chengNuo] }
  const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由(wenAn))
  return { renWu, yunXing }
}

beforeEach(() => {
  vi.useFakeTimers()
  chuFaCuoWuShangBao.mockClear()
  zhongZhiYuQu()
})

afterEach(() => {
  zhongZhiYuQu()
  vi.useRealTimers()
})

describe('FP-6 路由预取竞速与「加载完成驱动」过渡状态机', () => {
  it('导出常量：竞速窗口 60ms、兜底超时 8000ms、入场时长 2000ms', () => {
    expect(JingSuHaoMiao).toBe(60)
    expect(GuoDuChaoShiHaoMiao).toBe(8000)
    expect(GuoDuRuChangHaoMiao).toBe(2000)
  })

  it('幂等命中：任务在竞速窗口内全部完成，状态保持 guanBi 且文案为空', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => Promise.resolve('a'), () => Promise.resolve('b')],
    }
    await kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
    expect(guoDuZhuangTai.value.wenAn).toBe('')
    expect(guoDuZhuangTai.value.ruChangQiDian).toBe(0)
    expect(chuFaCuoWuShangBao).not.toHaveBeenCalled()
  })

  it('竞速临界：任务恰好在窗口内完成也不显示过渡', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [
        () => new Promise((jieJue) => setTimeout(() => jieJue('man'), JingSuHaoMiao - 10)),
      ],
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
  })

  it('竞速超时 → ruChang：banBen 递增、文案走翻译表、起点为当前时间、退场字段归零', async () => {
    const qianBanBen = guoDuZhuangTai.value.banBen
    const { renWu, yunXing } = 启动慢预取()
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    expect(guoDuZhuangTai.value.jieDuan).toBe('ruChang')
    expect(guoDuZhuangTai.value.banBen).toBe(qianBanBen + 1)
    expect(guoDuZhuangTai.value.wenAn).toBe(huoQuFanYi('guoDuZaiRu', 'guoWangZhanJi'))
    expect(guoDuZhuangTai.value.ruChangQiDian).toBe(Date.now())
    expect(guoDuZhuangTai.value.tuiChangQiDian).toBe(0)
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(0)
    expect(guoDuZhuangTai.value.dongJieJinDu).toBe(0)

    renWu.duiXian('wan')
    await yunXing
  })

  it('加载完成 → tuiChang：退场时长=入场已播放时长、冻结进度=时长/入场时长、banBen/文案/起点不变', async () => {
    const { renWu, yunXing } = 启动慢预取()
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    const ruChang = { ...guoDuZhuangTai.value }
    expect(ruChang.jieDuan).toBe('ruChang')

    await vi.advanceTimersByTimeAsync(1000)
    expect(guoDuZhuangTai.value.jieDuan).toBe('ruChang')

    renWu.duiXian('wan')
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('tuiChang')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(1000)
    expect(guoDuZhuangTai.value.dongJieJinDu).toBe(1000 / GuoDuRuChangHaoMiao)
    expect(guoDuZhuangTai.value.banBen).toBe(ruChang.banBen)
    expect(guoDuZhuangTai.value.wenAn).toBe(ruChang.wenAn)
    expect(guoDuZhuangTai.value.ruChangQiDian).toBe(ruChang.ruChangQiDian)
    expect(guoDuZhuangTai.value.tuiChangQiDian).toBe(Date.now())
  })

  it('kaiShiLuYouYuQu 设置完 tuiChang 后立即返回，不等待退场动画播完', async () => {
    const { renWu, yunXing } = 启动慢预取()
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    await vi.advanceTimersByTimeAsync(500)
    renWu.duiXian('wan')
    // 全程不推进时间：若函数要等退场动画（退场时长 + 240），此处会挂起直至超时
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('tuiChang')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(500)
  })

  it('提前完成：竞速窗口后仅 0.3 秒加载完成 → 退场时长 300、冻结进度 0.15', async () => {
    const { renWu, yunXing } = 启动慢预取()
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    await vi.advanceTimersByTimeAsync(300)
    renWu.duiXian('wan')
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('tuiChang')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(300)
    expect(guoDuZhuangTai.value.dongJieJinDu).toBe(300 / GuoDuRuChangHaoMiao)
  })

  it('入场播满 2 秒仍未完成 → 一直保持 ruChang，完成后退场时长封顶 2000、进度封顶 1', async () => {
    const { renWu, yunXing } = 启动慢预取('tongZhi')
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    expect(guoDuZhuangTai.value.jieDuan).toBe('ruChang')
    await vi.advanceTimersByTimeAsync(GuoDuRuChangHaoMiao + 1000)
    expect(guoDuZhuangTai.value.jieDuan).toBe('ruChang')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(0)
    expect(guoDuZhuangTai.value.dongJieJinDu).toBe(0)
    renWu.duiXian('wan')
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('tuiChang')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(GuoDuRuChangHaoMiao)
    expect(guoDuZhuangTai.value.dongJieJinDu).toBe(1)
  })

  it('八秒兜底超时强制放行 → tuiChang 且退场时长封顶 2000，任务未失败故不上报', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => new Promise(() => undefined)],
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    expect(guoDuZhuangTai.value.jieDuan).toBe('ruChang')
    await vi.advanceTimersByTimeAsync(GuoDuChaoShiHaoMiao)
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('tuiChang')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(GuoDuRuChangHaoMiao)
    expect(guoDuZhuangTai.value.dongJieJinDu).toBe(1)
    expect(chuFaCuoWuShangBao).not.toHaveBeenCalled()
  })

  it('zuJian 与任务一起并发等待，窗口结束即完成 → 退场时长 0、进度 0', async () => {
    const zuJian = 挂起<unknown>()
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => Promise.resolve('shuJu')],
      zuJian: () => zuJian.chengNuo,
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    expect(guoDuZhuangTai.value.jieDuan).toBe('ruChang')
    zuJian.duiXian(undefined)
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('tuiChang')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(0)
    expect(guoDuZhuangTai.value.dongJieJinDu).toBe(0)
  })

  it('任一任务失败不拦截导航，只上报错误并保持 guanBi', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => Promise.reject(new Error('wangLuoDuanKai')), () => Promise.resolve('hao')],
    }
    await expect(kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))).resolves.toBeUndefined()
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
    expect(chuFaCuoWuShangBao).toHaveBeenCalledTimes(1)
    expect(chuFaCuoWuShangBao.mock.calls[0][0]).toMatchObject({
      leiBie: 'chengNuo',
      fuJia: { laiYuan: 'luYouYuQu' },
    })
  })

  it('等待期间批次推进后，旧过渡的 finally 不再写回退场态、不残留', async () => {
    const { renWu, yunXing } = 启动慢预取()
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    expect(guoDuZhuangTai.value.jieDuan).toBe('ruChang')

    tuiJinLuYouPiCi()
    const xin = kaiShiLuYouYuQu(
      { wenAn: 'tongZhi', renWu: [() => Promise.resolve('kuai')] },
      假路由('tongZhi'),
    )
    await xin
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')

    renWu.duiXian('wan')
    await vi.advanceTimersByTimeAsync(GuoDuChaoShiHaoMiao)
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(0)
  })

  it('zhongZhiYuQu 立即把过渡收敛到 guanBi 并推进批次，旧任务后续完成也不再写回', async () => {
    const { renWu, yunXing } = 启动慢预取()
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    expect(guoDuZhuangTai.value.jieDuan).toBe('ruChang')
    zhongZhiYuQu()
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
    expect(guoDuZhuangTai.value.wenAn).toBe('')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(0)
    renWu.duiXian('wan')
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
  })

  it('jieShuGuoDu 仅按 banBen 精确关闭，错误版本号不会误关', async () => {
    const { renWu, yunXing } = 启动慢预取()
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    const banBen = guoDuZhuangTai.value.banBen
    jieShuGuoDu(banBen + 1)
    expect(guoDuZhuangTai.value.jieDuan).toBe('ruChang')
    jieShuGuoDu(banBen)
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
    expect(guoDuZhuangTai.value.wenAn).toBe('')
    tuiJinLuYouPiCi()
    renWu.duiXian('wan')
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
  })

  it('退场后兜底定时器按 tuiChangShiChang + 240 毫秒关闭过渡，快进后回到 guanBi', async () => {
    const { renWu, yunXing } = 启动慢预取('tongZhi')
    await vi.advanceTimersByTimeAsync(JingSuHaoMiao)
    await vi.advanceTimersByTimeAsync(300)
    renWu.duiXian('wan')
    await yunXing
    expect(guoDuZhuangTai.value.jieDuan).toBe('tuiChang')
    const shiChang = guoDuZhuangTai.value.tuiChangShiChang
    expect(shiChang).toBe(300)

    await vi.advanceTimersByTimeAsync(shiChang + 239)
    expect(guoDuZhuangTai.value.jieDuan).toBe('tuiChang')
    await vi.advanceTimersByTimeAsync(1)
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
    expect(guoDuZhuangTai.value.wenAn).toBe('')
  })
})

describe('FP-6 过渡文案与交接存取', () => {
  it('wenAn 解析：登记键出整句，未登记与非字符串回退默认语', () => {
    expect(jieXiGuoDuWenAn('guoWangZhanJi')).toBe(fanYi.guoDuZaiRu.guoWangZhanJi)
    expect(jieXiGuoDuWenAn('buCunZaiDeJian')).toBe(fanYi.guoDuZaiRu.moRen)
    expect(jieXiGuoDuWenAn(undefined)).toBe(fanYi.guoDuZaiRu.moRen)
    expect(jieXiGuoDuWenAn(42)).toBe(fanYi.guoDuZaiRu.moRen)
    expect(fanYi.guoDuZaiRu.moRen.endsWith('……')).toBe(true)
  })

  it('交接一次写入一次读取，二次读取为空', () => {
    tuiJinLuYouPiCi()
    cunYuQuJiaoJie('guoWangZhanJi', Promise.resolve([1, 2]))
    const yi = quYuQuJiaoJie<Promise<number[]>>('guoWangZhanJi')
    expect(yi).not.toBeNull()
    expect(quYuQuJiaoJie('guoWangZhanJi')).toBeNull()
  })

  it('批次推进后旧交接作废，页面自行兜底取数', async () => {
    tuiJinLuYouPiCi()
    cunYuQuJiaoJie('guoWangZhanJi', Promise.resolve('jiu'))
    tuiJinLuYouPiCi()
    expect(quYuQuJiaoJie('guoWangZhanJi')).toBeNull()
  })

  it('非法键名不写入也不读出', () => {
    tuiJinLuYouPiCi()
    cunYuQuJiaoJie(undefined, Promise.resolve('x'))
    cunYuQuJiaoJie('', Promise.resolve('x'))
    expect(quYuQuJiaoJie(undefined)).toBeNull()
    expect(quYuQuJiaoJie('')).toBeNull()
  })

  it('anJingHua 原样返回承诺且为拒绝挂上静默分支', async () => {
    const yuan = Promise.reject(new Error('yuQuShiBai'))
    const bao = anJingHua(yuan)
    expect(bao).toBe(yuan)
    await expect(bao).rejects.toThrow('yuQuShiBai')
  })

  it('zhongZhiYuQu 清空交接缓存并把过渡状态收敛到关闭态', () => {
    tuiJinLuYouPiCi()
    cunYuQuJiaoJie('guoWangZhanJi', Promise.resolve('x'))
    guoDuZhuangTai.value = { ...guoDuZhuangTai.value, jieDuan: 'ruChang' as const, wenAn: 'x' }
    zhongZhiYuQu()
    expect(quYuQuJiaoJie('guoWangZhanJi')).toBeNull()
    expect(guoDuZhuangTai.value.jieDuan).toBe('guanBi')
    expect(guoDuZhuangTai.value.wenAn).toBe('')
    expect(guoDuZhuangTai.value.tuiChangShiChang).toBe(0)
  })
})

describe('FP-6 过渡组件接入（源码级·不锁死结构）', () => {
  it('组件存在并消费预取状态机的新字段，过渡由运行时状态驱动', () => {
    const 源 = 读源('components/页面过渡载入.vue')
    expect(源.length).toBeGreaterThan(0)
    expect(源).toContain("from '@/router/预取'")
    for (const ziDuan of ['jieDuan', 'ruChangQiDian', 'tuiChangShiChang', 'dongJieJinDu']) {
      expect(源, `组件未消费状态机字段 ${ziDuan}`).toContain(ziDuan)
    }
  })

  it('组件不再引用离线手绘资产、也不把过渡时长写死为裸毫秒值', () => {
    const 源 = 读源('components/页面过渡载入.vue')
    expect(源).not.toMatch(/from '@\/assets\//)
    expect(源).not.toMatch(/\b[1-9]\d{2,3}ms\b/)
  })
})

describe('FP-6 路由接入契约', () => {
  it('七个目标路由声明 yuJiaZai，wenAn 均为登记键，zuJian 与组件共用同一惰性导入', () => {
    const yuan = 读源('router/路由表.ts')
    const duiZhao: Array<[string, string]> = [
      ['guoWangZhanJi', 'jiaZaiGuoWangZhanJi'],
      ['tiaoZhanPaiHangBang', 'jiaZaiTiaoZhanPaiHangBang'],
      ['haoYouLieBiao', 'jiaZaiHaoYouLieBiao'],
      ['tongZhi', 'jiaZaiTongZhiYe'],
      ['zhangHaoAnQuan', 'jiaZaiZhangHaoAnQuan'],
      ['junShiJiLuXiangQing', 'jiaZaiJunShiJiLu'],
      ['tiaoZhanZhuYe', 'jiaZaiTiaoZhanZhuYe'],
    ]
    for (const [ming, zuJianMing] of duiZhao) {
      expect(yuan).toContain(`name: '${ming}'`)
      expect(yuan).toContain(`wenAn: '${ming}'`)
      expect(yuan).toContain(`component: ${zuJianMing}`)
      expect(yuan).toContain(`zuJian: ${zuJianMing}`)
      expect(ming in fanYi.guoDuZaiRu).toBe(true)
    }
  })

  it('交接消费页的 LuYouMing 与路由名一一对应', () => {
    const duiZhao: Array<[string, string]> = [
      ['views/账号与安全.vue', 'zhangHaoAnQuan'],
      ['views/军师记录详情.vue', 'junShiJiLuXiangQing'],
      ['views/挑战主页.vue', 'tiaoZhanZhuYe'],
    ]
    for (const [wen, ming] of duiZhao) {
      expect(读源(wen)).toContain(`const LuYouMing = '${ming}'`)
    }
  })

  it('挑战两页榜单都走共享预加载缓存，路由预取一次登记全部组别', () => {
    const yuan = 读源('router/路由表.ts')
    const zhu = yuan.split("name: 'tiaoZhanZhuYe'")[1]?.split("path: '")[0] ?? ''
    const bang = yuan.split("name: 'tiaoZhanPaiHangBang'")[1]?.split("path: '")[0] ?? ''
    expect(zhu).toContain('use挑战榜单().yuQuQuanBu()')
    expect(bang).toContain('use挑战榜单().yuQuQuanBu()')
    expect(bang).not.toContain("huoQuPaiHangBang('nan_nv')")
    expect(bang).toContain("wenAn: 'tiaoZhanPaiHangBang'")
    expect(bang).toContain('zuJian: jiaZaiTiaoZhanPaiHangBang')
    const 榜单源 = 读源('views/挑战积分榜.vue')
    expect(榜单源).toContain("from '@/composables/use挑战榜单'")
    expect(榜单源).toContain('bangDanHuanCun.value.get(')
    expect(榜单源).not.toContain('huoQuPaiHangBang')
    expect(榜单源).not.toContain('quYuQuJiaoJie')
    const 主页源 = 读源('views/挑战主页.vue')
    expect(主页源).toContain('bangDanHuanCun.value.get(')
    expect(主页源).not.toContain('huoQuPaiHangBang')
  })

  it('守卫在令牌校验通过后才执行预取，无令牌只重定向不预取，冷启动首跳不预取', () => {
    const yuan = 读源('router/路由表.ts')
    expect(yuan).toMatch(/tuiJinLuYouPiCi\(\)/)
    expect(yuan).toMatch(/if \(to\.meta\.xuYaoDengLu && !youLingPai\)[\s\S]*?return \{ name: 'dengLu', replace: true \}/)
    expect(yuan).toMatch(/if \(yuJiaZai && youLingPai && _from\.matched\.length > 0\)[\s\S]*?await kaiShiLuYouYuQu\(yuJiaZai, to\)/)
  })

  it('路由表不静态导入任何 api 或 store，避免 api/请求 与 路由表 成环', () => {
    const yuan = 读源('router/路由表.ts')
    expect(yuan).not.toMatch(/from '@\/api\//)
    expect(yuan).not.toMatch(/from '@\/stores\//)
    expect(yuan).not.toMatch(/from '@\/composables\//)
  })

  it('趣味载入页、载入聊天、添加微信与好友聊天路由不在预取名单', () => {
    const yuan = 读源('router/路由表.ts')
    for (const ming of ['zaiRuLiaoTian', 'liaoTian', 'tianJiaWeiXin', 'haoYouLiaoTian', 'dengLu', 'wangJiMiMa', 'ziLiaoSheZhi', 'qiPaoSheZhi', 'shengYin', 'zhuJieMian']) {
      const duan = yuan.split(`name: '${ming}'`)[1]?.split("name: '")[0] ?? ''
      expect(duan).not.toContain('yuJiaZai')
    }
  })
})
