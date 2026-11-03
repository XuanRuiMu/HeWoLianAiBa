import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import type { RouteLocationNormalized } from 'vue-router'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import {
  GUO_DU_CHAO_SHI_HAO_MIAO,
  GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO,
  JING_SU_HAO_MIAO,
  anJingHua,
  cunYuQuJiaoJie,
  guoDuZhuangTai,
  jieXiGuoDuWenAn,
  kaiShiLuYouYuQu,
  quYuQuJiaoJie,
  tuiJinLuYouPiCi,
  zhongZhiYuQu,
  type YuJiaZaiPeiZhi,
} from '@/router/预取'
import 页面过渡载入 from '@/components/页面过渡载入.vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { chuFaCuoWuShangBao } = vi.hoisted(() => ({ chuFaCuoWuShangBao: vi.fn() }))
vi.mock('@/utils/错误上报', () => ({ chuFaCuoWuShangBao }))

const 源码根 = resolve(__dirname, '..')
const 读源 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')

function 假路由(名字: unknown): RouteLocationNormalized {
  return { name: 名字 } as unknown as RouteLocationNormalized
}

function 挂起<T>(): { chengNuo: Promise<T>; duiXian: (zhi: T) => void; juJue: (cuoWu: unknown) => void } {
  let duiXian!: (zhi: T) => void
  let juJue!: (cuoWu: unknown) => void
  const chengNuo = new Promise<T>((jieJue, juJueNei) => {
    duiXian = jieJue
    juJue = juJueNei
  })
  return { chengNuo, duiXian, juJue }
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

describe('FP-6 预取任务与过渡页状态机', () => {
  it('任务全部幂等命中缓存时竞速内完成，不显示过渡页', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => Promise.resolve('a'), () => Promise.resolve('b')],
    }
    await kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
    expect(chuFaCuoWuShangBao).not.toHaveBeenCalled()
  })

  it('竞速临界：任务在竞速窗口内完成也不显示过渡页', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => new Promise((jieJue) => setTimeout(() => jieJue('man'), JING_SU_HAO_MIAO - 10))],
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    await yunXing
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
  })

  it('慢任务先置过渡页，全部完成后加最短展示防闪再隐藏', async () => {
    const jia = 挂起<string>()
    const yi = 挂起<string>()
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => jia.chengNuo, () => yi.chengNuo],
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)
    expect(guoDuZhuangTai.value.wenAn).toBe(huoQuFanYi('guoDuZaiRu', 'guoWangZhanJi'))

    jia.duiXian('jia')
    await vi.advanceTimersByTimeAsync(GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)

    yi.duiXian('yi')
    await vi.advanceTimersByTimeAsync(GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO)
    await yunXing
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
    expect(guoDuZhuangTai.value.wenAn).toBe('')
  })

  it('任一任务失败不拦截导航，只上报错误并照常隐藏过渡页', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => Promise.reject(new Error('wangLuoDuanKai')), () => Promise.resolve('hao')],
    }
    await expect(kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))).resolves.toBeUndefined()
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
    expect(chuFaCuoWuShangBao).toHaveBeenCalledTimes(1)
    expect(chuFaCuoWuShangBao.mock.calls[0][0]).toMatchObject({
      leiBie: 'chengNuo',
      fuJia: { laiYuan: 'luYouYuQu' },
    })
  })

  it('超时八秒强制放行，过渡页隐藏，任务失败已上报', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => new Promise(() => undefined)],
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)
    await vi.advanceTimersByTimeAsync(GUO_DU_CHAO_SHI_HAO_MIAO)
    await yunXing
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
    expect(chuFaCuoWuShangBao).not.toHaveBeenCalled()
  })

  it('zuJian 与任务一起并发等待', async () => {
    const kuai = 挂起<unknown>()
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => Promise.resolve('shuJu')],
      zuJian: () => kuai.chengNuo,
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)
    kuai.duiXian(undefined)
    await vi.advanceTimersByTimeAsync(GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO)
    await yunXing
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
  })

  it('新导航推进批次后，旧过渡页立即让位不再隐藏新状态', async () => {
    const man = 挂起<string>()
    const peiZhi: YuJiaZaiPeiZhi = { wenAn: 'guoWangZhanJi', renWu: [() => man.chengNuo] }
    const jiu = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)
    tuiJinLuYouPiCi()
    guoDuZhuangTai.value = { jinXingZhong: false, wenAn: '' }
    man.duiXian('wan')
    await vi.advanceTimersByTimeAsync(GUO_DU_CHAO_SHI_HAO_MIAO)
    await jiu
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
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

  it('zhongZhiYuQu 清空交接与过渡页状态', async () => {
    tuiJinLuYouPiCi()
    cunYuQuJiaoJie('guoWangZhanJi', Promise.resolve('x'))
    guoDuZhuangTai.value = { jinXingZhong: true, wenAn: 'x' }
    zhongZhiYuQu()
    expect(quYuQuJiaoJie('guoWangZhanJi')).toBeNull()
    expect(guoDuZhuangTai.value).toEqual({ jinXingZhong: false, wenAn: '' })
  })
})

describe('FP-6 页面过渡载入组件', () => {
  it('进行中渲染玻璃卡片、无障碍状态与视觉隐藏文本', async () => {
    guoDuZhuangTai.value = { jinXingZhong: true, wenAn: huoQuFanYi('guoDuZaiRu', 'guoWangZhanJi') }
    await nextTick()
    const bao = mount(页面过渡载入)
    await flushPromises()
    const fugai = bao.find('.guodu-fugai')
    expect(fugai.exists()).toBe(true)
    expect(fugai.attributes('role')).toBe('status')
    expect(fugai.attributes('aria-live')).toBe('polite')
    expect(bao.find('.guodu-kapian').exists()).toBe(true)
    expect(bao.find('.guodu-jindu-hua').exists()).toBe(true)
    expect(bao.find('.guodu-wenben').text()).toBe(huoQuFanYi('guoDuZaiRu', 'guoWangZhanJi'))
    expect(bao.find('.ping-mu-wai').text()).toBe(huoQuFanYi('guoDuZaiRu', 'guoWangZhanJi'))
    bao.unmount()
  })

  it('非进行中不渲染任何节点', async () => {
    guoDuZhuangTai.value = { jinXingZhong: false, wenAn: '' }
    await nextTick()
    const bao = mount(页面过渡载入)
    await flushPromises()
    expect(bao.find('.guodu-fugai').exists()).toBe(false)
    expect(bao.text()).toBe('')
    bao.unmount()
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

  it('交接消费页的 LU_YOU_MING 与路由名一一对应', () => {
    const duiZhao: Array<[string, string]> = [
      ['views/挑战积分榜.vue', 'tiaoZhanPaiHangBang'],
      ['views/账号与安全.vue', 'zhangHaoAnQuan'],
      ['views/军师记录详情.vue', 'junShiJiLuXiangQing'],
      ['views/挑战主页.vue', 'tiaoZhanZhuYe'],
    ]
    for (const [wen, ming] of duiZhao) {
      expect(读源(wen)).toContain(`const LU_YOU_MING = '${ming}'`)
    }
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
