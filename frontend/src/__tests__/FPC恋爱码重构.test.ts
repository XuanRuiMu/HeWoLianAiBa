import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { QIAN_TAI_DAI_MA, LIAN_AI_DAI_MA, huoQuLianAiMa, type QianTaiDaiMa } from '@/config/前台错误码'
import { fanYi, huoQuFanYi } from '@/config/translations'
import { chuangJianQianTaiCuoWu } from '@/utils/前台错误'
import 请求错误 from '@/components/请求错误.vue'
import 过往战绩 from '@/views/过往战绩.vue'
import { huoQuZhanJiFenLeiLieBiao, huoQuDangAnLieBiao } from '@/api/聊天'
import { 使用战绩仓库 } from '@/stores/战绩'

vi.mock('@/api/聊天')

vi.mock('vue-draggable-plus', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    VueDraggable: vue.defineComponent({
      name: 'VueDraggable',
      props: { modelValue: { type: Array, default: () => [] }, disabled: Boolean },
      emits: ['update:modelValue', 'start', 'end'],
      setup(_props, { slots }) {
        return () => vue.h('div', { class: 'vue-draggable-stub' }, slots.default?.())
      },
    }),
  }
})

const JI_SHU_HE_XIN = /base64|DeepSeek|axios|DOMException|EncodingError|ECONNRESET|ECONNREFUSED|getaddrinfo|127\.0\.0\.1|localhost|\/srv\/|\/app\/|SELECT\s|INSERT\s|UPDATE\s|DELETE\s|stack:|SQLSTATE|postgres|mysql|password|api[_-]?key|bearer\s|jwt/i
const JI_SHU_HEI_HUA = /数据库|服务器|错误码|追踪编号|诊断信息|SQL|API|接口|协议|堆栈|路径|令牌/
const ZHUANG_KAI_A = /啦|呀|哦|呢~|吧~|~|！{2,}/
const FU_YAN = /出错了|未知错误|请稍后重试|稍后再试|开小差/
const ZHAN_WEI = /\{\{|\}\}|undefined|null|NaN|\[object /

function suoYouJiShuMa(): QianTaiDaiMa[] {
  return Object.values(QIAN_TAI_DAI_MA)
}

describe('FP-C 恋爱码一对一映射', () => {
  it('每个技术码都有唯一LianAi_xxx映射，LianAi_001起连续编号，无遗漏无重复', () => {
    const jiShuMa = suoYouJiShuMa()
    expect(jiShuMa.length).toBe(67)
    const lianAiMa = jiShuMa.map((daiMa) => huoQuLianAiMa(daiMa))
    expect(new Set(lianAiMa).size).toBe(jiShuMa.length)
    const paiXu = [...lianAiMa].sort()
    const qiWang = jiShuMa.map((_, suoYin) => `LianAi_${String(suoYin + 1).padStart(3, '0')}`)
    expect(paiXu).toEqual(qiWang)
    for (const daiMa of jiShuMa) {
      expect(LIAN_AI_DAI_MA[daiMa]).toMatch(/^LianAi_\d{3}$/)
    }
    expect(Object.keys(LIAN_AI_DAI_MA).length).toBe(jiShuMa.length)
  })
})

describe('FP-C 恋爱码沉浸文案', () => {
  it('每个恋爱码在translations有沉浸文案，无技术黑话，无装可爱敷衍，无脏值', () => {
    const jiShuMa = suoYouJiShuMa()
    for (const daiMa of jiShuMa) {
      const lianAi = huoQuLianAiMa(daiMa)
      const wenAn = huoQuFanYi('lianAi', lianAi as never)
      expect(wenAn.trim().length).toBeGreaterThan(0)
      expect(wenAn).not.toMatch(JI_SHU_HE_XIN)
      expect(wenAn).not.toMatch(JI_SHU_HEI_HUA)
      expect(wenAn).not.toMatch(ZHUANG_KAI_A)
      expect(wenAn).not.toMatch(FU_YAN)
      expect(wenAn).not.toMatch(ZHAN_WEI)
      expect(wenAn).not.toContain('您')
      expect(wenAn).not.toContain('...')
      expect(wenAn).not.toMatch(/(?<!…)…(?!…)/)
    }
    expect(fanYi.lianAi['LianAi_021']).toContain('老玄')
  })

  it('浅深两档共用同一文案键，仅颜色不同', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../components/请求错误.vue'), 'utf8')
    expect(yuanMa).toContain('var(--')
    expect(yuanMa).not.toMatch(/LianAi.*light|LianAi.*dark|light.*LianAi|dark.*LianAi/i)
    const yangShi = yuanMa.slice(yuanMa.indexOf('<style'))
    expect(yangShi).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
  })
})

describe('FP-C 报错码文档与代码一致', () => {
  it('docs每码有具体错误触发场景用户下一步，文档与代码映射一致', () => {
    const wenDang = readFileSync(resolve(__dirname, '../../../docs/报错码对照.md'), 'utf8')
    const jiShuMa = suoYouJiShuMa()
    for (const daiMa of jiShuMa) {
      const lianAi = huoQuLianAiMa(daiMa)
      expect(wenDang).toContain(daiMa)
      expect(wenDang).toContain(lianAi)
      const wenAn = huoQuFanYi('lianAi', lianAi as never)
      expect(wenDang).toContain(wenAn.slice(0, 6))
    }
    const lianAiZaiWenDang = [...wenDang.matchAll(/LianAi_\d{3}/g)].map((m) => m[0])
    expect(new Set(lianAiZaiWenDang).size).toBe(jiShuMa.length)
  })
})

describe('FP-C 请求错误只显示沉浸文案与可复制恋爱码', () => {
  it('显示沉浸文案与恋爱码，可复制，不再显示影响下一步诊断错误码追踪编号', async () => {
    const cuoWu = chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.DATABASE_ERROR, retryable: true })
    expect(cuoWu.lianAiMa).toBe(huoQuLianAiMa(QIAN_TAI_DAI_MA.DATABASE_ERROR))
    expect(cuoWu.lianAiWenAn).toBe(huoQuFanYi('lianAi', cuoWu.lianAiMa as never))
    const wrapper = mount(请求错误, { props: { cuoWu } })
    expect(wrapper.find('.qian-tai-cuo-wu-wen-an').text()).toBe(cuoWu.lianAiWenAn)
    expect(wrapper.find('.qian-tai-cuo-wu-lian-ai-ma').text()).toBe(cuoWu.lianAiMa)
    expect(wrapper.find('.qian-tai-cuo-wu-fu-zhi').exists()).toBe(true)
    const wenBen = wrapper.text()
    expect(wenBen).not.toContain('影响')
    expect(wenBen).not.toContain('下一步')
    expect(wenBen).not.toContain('诊断信息')
    expect(wenBen).not.toContain('错误码')
    expect(wenBen).not.toContain('追踪编号')
    expect(wenBen).not.toContain('DATABASE_ERROR')
    expect(wenBen).not.toContain('FRONTEND_')
    const yuanMa = readFileSync(resolve(__dirname, '../components/请求错误.vue'), 'utf8')
    const moBan = yuanMa.slice(yuanMa.indexOf('<template'), yuanMa.indexOf('</template>'))
    expect(moBan).not.toContain('qian-tai-cuo-wu-ying-xiang')
    expect(moBan).not.toContain('qian-tai-cuo-wu-xia-yi-bu')
    expect(moBan).not.toContain('qian-tai-cuo-wu-zhen-cha')
    expect(moBan).not.toContain('qian-tai-cuo-wu-dai-ma')
    expect(moBan).not.toContain('qian-tai-cuo-wu-zhen-zong-bian-hao')
    expect(moBan).not.toContain('cuoWu.yingXiang')
    expect(moBan).not.toContain('cuoWu.xiaYiBu')
    expect(moBan).not.toContain('cuoWu.code')
    expect(moBan).not.toContain('cuoWu.traceId')
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await wrapper.get('.qian-tai-cuo-wu-fu-zhi').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.get('.qian-tai-cuo-wu-fu-zhi-zhuang-tai').text()).toBe(
        huoQuFanYi('tongYong', 'qianTaiCuoWuFuZhiChengGong'),
      ),
    )
    expect(writeText).toHaveBeenCalledWith(cuoWu.lianAiMa)
    vi.unstubAllGlobals()
  })
})

describe('FP-C 战绩分类三态', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  async function mountShiTu(fenLeiJuBen: () => Promise<never> | Promise<unknown>, dangAnJuBen: () => Promise<never> | Promise<unknown>) {
    vi.mocked(huoQuZhanJiFenLeiLieBiao).mockImplementation(fenLeiJuBen as never)
    vi.mocked(huoQuDangAnLieBiao).mockImplementation(dangAnJuBen as never)
    const luYou = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    await luYou.push('/')
    const pinia = createPinia()
    setActivePinia(pinia)
    const cangKu = 使用战绩仓库()
    await cangKu.jiaZai()
    const wrapper = mount(过往战绩, { global: { plugins: [pinia, luYou] } })
    await flushPromises()
    return { cangKu, wrapper }
  }

  it('分类加载失败时整个分类栏含加号隐藏并走报错态', async () => {
    const { cangKu, wrapper } = await mountShiTu(
      async () => {
        throw new Error('fen-lei-boom')
      },
      async () => [],
    )
    expect(cangKu.fenLeiZhuangTai).toBe('shiBai')
    expect(cangKu.fenLeiKeYong).toBe(false)
    expect(cangKu.qianTaiCuoWu).not.toBeNull()
    expect(wrapper.find('.fenlei-guan-li-lan').exists()).toBe(false)
    expect(wrapper.find('.chuangJian-fenlei-anniu').exists()).toBe(false)
    expect(wrapper.find('.qian-tai-cuo-wu-wen-an').exists()).toBe(true)
    expect(wrapper.find('.qian-tai-cuo-wu-lian-ai-ma').exists()).toBe(true)
    wrapper.unmount()
  })

  it('分类加载成功但零记录时走正常空态并显示分类栏与加号', async () => {
    const moRenId = '00000000-0000-4000-8000-000000000001'
    const { cangKu, wrapper } = await mountShiTu(
      async () => ({
        moRenFenLeiId: moRenId,
        fenLeiLieBiao: [{ id: moRenId, name: '默认分类', is_default: true, record_count: 0, version: 0, sort_order: 0 }],
      }),
      async () => [],
    )
    expect(cangKu.fenLeiZhuangTai).toBe('chengGong')
    expect(cangKu.fenLeiKeYong).toBe(true)
    expect(cangKu.qianTaiCuoWu).toBeNull()
    expect(wrapper.find('.fenlei-guan-li-lan').exists()).toBe(true)
    expect(wrapper.find('.chuangJian-fenlei-anniu').exists()).toBe(true)
    expect(wrapper.find('.kong-zhuangtai').exists()).toBe(true)
    expect(wrapper.find('.qian-tai-cuo-wu-wen-an').exists()).toBe(false)
    wrapper.unmount()
  })

  it('加载失败与空记录由store不同状态区分', async () => {
    vi.mocked(huoQuZhanJiFenLeiLieBiao).mockRejectedValueOnce(new Error('boom'))
    vi.mocked(huoQuDangAnLieBiao).mockResolvedValue([])
    const pinia = createPinia()
    setActivePinia(pinia)
    const cangKu = 使用战绩仓库()
    await cangKu.jiaZai()
    expect(cangKu.fenLeiZhuangTai).toBe('shiBai')
    expect(cangKu.qianTaiCuoWu).not.toBeNull()
    cangKu.qingKong()
    expect(cangKu.fenLeiZhuangTai).toBe('weiKaiShi')
  })
})
