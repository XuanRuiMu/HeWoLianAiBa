import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { 使用通用性别框体配色 } from '@/composables/use性别框体配色'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import 资料设置向导 from '@/views/资料设置向导.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')

function 建仓库(): { pinia: Pinia; 仓库: ReturnType<typeof 使用认证表单仓库> } {
  const pinia = createPinia()
  setActivePinia(pinia)
  return { pinia, 仓库: 使用认证表单仓库() }
}

function 挂载向导(pinia: Pinia): VueWrapper {
  return mount(资料设置向导, { global: { plugins: [pinia] } })
}

function 取样式(卡: { attributes: (名: string) => string | undefined }): string {
  return 卡.attributes('style') ?? ''
}

beforeEach(() => {
  localStorage.clear()
})

describe('通用性别框体配色：自身色填充、对象色描边、自身色文字', () => {
  it('男自身 + 女对象', () => {
    const 配色 = 使用通用性别框体配色({ 自身性别: 'male', 对象性别: 'female' })
    expect(配色.自身色档.value).toBe('nan')
    expect(配色.对象色档.value).toBe('nv')
    expect(配色.样式.value).toEqual({
      backgroundColor: 'var(--xingbie-nan-tan-beijing)',
      borderColor: 'var(--xingbie-nv-shen-biankuang)',
      color: 'var(--xingbie-nan-tan-wenben)',
      boxShadow: '0 0 0 3px var(--xingbie-nan-xuan-huan)',
    })
  })

  it('女自身 + 男对象', () => {
    const 配色 = 使用通用性别框体配色({ 自身性别: 'female', 对象性别: 'male' })
    expect(配色.自身色档.value).toBe('nv')
    expect(配色.对象色档.value).toBe('nan')
    expect(配色.样式.value.backgroundColor).toBe('var(--xingbie-nv-tan-beijing)')
    expect(配色.样式.value.borderColor).toBe('var(--xingbie-nan-shen-biankuang)')
    expect(配色.样式.value.color).toBe('var(--xingbie-nv-tan-wenben)')
    expect(配色.样式.value.boxShadow).toBe('0 0 0 3px var(--xingbie-nv-xuan-huan)')
  })

  it('自身未选按男性兜底，对象未选按女性兜底', () => {
    const 配色 = 使用通用性别框体配色({ 自身性别: null, 对象性别: null })
    expect(配色.自身色档.value).toBe('nan')
    expect(配色.对象色档.value).toBe('nv')
    expect(配色.样式.value.backgroundColor).toBe('var(--xingbie-nan-tan-beijing)')
    expect(配色.样式.value.borderColor).toBe('var(--xingbie-nv-shen-biankuang)')

    const 女自身 = 使用通用性别框体配色({ 自身性别: 'female' })
    expect(女自身.样式.value.backgroundColor).toBe('var(--xingbie-nv-tan-beijing)')
    expect(女自身.样式.value.borderColor).toBe('var(--xingbie-nv-shen-biankuang)')
  })

  it('无法识别的写法与空值同样落到男女兜底', () => {
    const 配色 = 使用通用性别框体配色({ 自身性别: '未知', 对象性别: '' })
    expect(配色.自身色档.value).toBe('nan')
    expect(配色.对象色档.value).toBe('nv')
  })

  it('选择变化时填充、边框、文字与选环同步更新', async () => {
    const 自身 = ref<unknown>(null)
    const 对象 = ref<unknown>(null)
    const 配色 = 使用通用性别框体配色({ 自身性别: 自身, 对象性别: 对象 })
    expect(配色.样式.value.backgroundColor).toBe('var(--xingbie-nan-tan-beijing)')

    自身.value = 'female'
    await nextTick()
    expect(配色.样式.value.backgroundColor).toBe('var(--xingbie-nv-tan-beijing)')
    expect(配色.样式.value.color).toBe('var(--xingbie-nv-tan-wenben)')

    对象.value = 'male'
    await nextTick()
    expect(配色.样式.value.borderColor).toBe('var(--xingbie-nan-shen-biankuang)')
  })
})

describe('向导不预选、不跳步，两步共用通用配色', () => {
  it('首次进入停在第一步，两张卡均未选中，下一步禁用', () => {
    const { pinia, 仓库 } = 建仓库()
    const 包 = 挂载向导(pinia)
    expect(仓库.ziLiaoDangQianBuZhou).toBe(1)
    const 卡 = 包.findAll('.xingBie-kaPian')
    expect(卡).toHaveLength(2)
    expect(包.findAll('.xingBie-kaPian.beiXuanZhong')).toHaveLength(0)
    expect(卡.map((单卡) => 单卡.attributes('style'))).toEqual([undefined, undefined])
    expect(包.find('.anniu-zhuYao').attributes('disabled')).toBeDefined()
  })

  it('必须点选自身性别才能进入第二步', async () => {
    const { pinia, 仓库 } = 建仓库()
    const 包 = 挂载向导(pinia)
    const [男卡] = 包.findAll('.xingBie-kaPian')
    await 男卡.trigger('click')

    expect(仓库.ziLiaoShuJu.xingBie).toBe('male')
    expect(男卡.classes()).toContain('beiXuanZhong')
    expect(男卡.attributes('aria-pressed')).toBe('true')
    expect(取样式(男卡)).toContain('background-color: var(--xingbie-nan-tan-beijing)')
    expect(取样式(男卡)).toContain('border-color: var(--xingbie-nv-shen-biankuang)')
    expect(取样式(男卡)).toContain('color: var(--xingbie-nan-tan-wenben)')

    const 下一步 = 包.find('.anniu-zhuYao')
    expect(下一步.attributes('disabled')).toBeUndefined()
    await 下一步.trigger('click')
    expect(仓库.ziLiaoDangQianBuZhou).toBe(2)
    expect(包.findAll('.xingBie-kaPian.beiXuanZhong')).toHaveLength(0)
  })

  it('第二步未点选对象性别时下一步仍禁用，选中后才放行', async () => {
    const { pinia, 仓库 } = 建仓库()
    仓库.ziLiaoShuJu.xingBie = 'female'
    仓库.ziLiaoDangQianBuZhou = 2
    const 包 = 挂载向导(pinia)
    const 卡 = 包.findAll('.xingBie-kaPian')
    expect(包.find('.anniu-zhuYao').attributes('disabled')).toBeDefined()

    await 卡[0].trigger('click')
    expect(仓库.ziLiaoShuJu.muBiaoXingBie).toBe('male')
    expect(取样式(卡[0])).toContain('background-color: var(--xingbie-nv-tan-beijing)')
    expect(取样式(卡[0])).toContain('border-color: var(--xingbie-nan-shen-biankuang)')
    expect(取样式(卡[0])).toContain('color: var(--xingbie-nv-tan-wenben)')
    expect(包.find('.anniu-zhuYao').attributes('disabled')).toBeUndefined()
  })

  it('回到第一步改选自身性别时，边框仍取已选对象性别', async () => {
    const { pinia, 仓库 } = 建仓库()
    仓库.ziLiaoShuJu.muBiaoXingBie = 'female'
    const 包 = 挂载向导(pinia)
    const 卡 = 包.findAll('.xingBie-kaPian')
    await 卡[0].trigger('click')
    expect(取样式(卡[0])).toContain('background-color: var(--xingbie-nan-tan-beijing)')
    expect(取样式(卡[0])).toContain('border-color: var(--xingbie-nv-shen-biankuang)')
  })

  it('持久化步骤越过已选条件时回退到第一个未完成步骤', () => {
    const { pinia, 仓库 } = 建仓库()
    仓库.ziLiaoShuJu.xingBie = null
    仓库.ziLiaoShuJu.muBiaoXingBie = null
    仓库.ziLiaoDangQianBuZhou = 3
    const 包 = 挂载向导(pinia)
    expect(仓库.ziLiaoDangQianBuZhou).toBe(1)
    expect(包.findAll('.xingBie-kaPian.beiXuanZhong')).toHaveLength(0)

    const 第二个 = 建仓库()
    第二个.仓库.ziLiaoShuJu.xingBie = 'male'
    第二个.仓库.ziLiaoShuJu.muBiaoXingBie = null
    第二个.仓库.ziLiaoDangQianBuZhou = 3
    挂载向导(第二个.pinia)
    expect(第二个.仓库.ziLiaoDangQianBuZhou).toBe(2)
  })

  it('前两步已完成时允许续接第三步，不强制重选', () => {
    const { pinia, 仓库 } = 建仓库()
    仓库.ziLiaoShuJu.xingBie = 'male'
    仓库.ziLiaoShuJu.muBiaoXingBie = 'female'
    仓库.ziLiaoDangQianBuZhou = 3
    const 包 = 挂载向导(pinia)
    expect(仓库.ziLiaoDangQianBuZhou).toBe(3)
    expect(包.find('.mbti-wangGe').exists()).toBe(true)
  })
})

describe('向导不再读取账号默认性别，个人资料规则保持独立', () => {
  const 向导 = 读('views/资料设置向导.vue')

  it('挂载时不再回填默认值，也不再自动设置步骤', () => {
    expect(向导).not.toContain('mo_ren_xing_bie')
    expect(向导).not.toContain('mu_biao_xing_bie')
    expect(向导).not.toContain('onMounted')
    expect(向导).not.toContain('queBaoShenFenJiuXu')
    expect(向导).not.toContain('当前步骤.value = 2')
    expect(向导).not.toContain('当前步骤.value = 3')
  })

  it('普通模式入口不再携带无人消费的 moshi 查询参数', () => {
    const 主页 = 读('views/主页内容.vue')
    expect(主页).toContain("router.push('/profile-setup')")
    expect(主页).not.toContain('moshi=putong')
  })

  it('个人资料仍保留选中即自身色填充与同色深框的专属规则', () => {
    const 账号页 = 读('views/账号与安全.vue')
    expect(账号页).toContain(".xingbie-kapian.beiXuanZhong[data-xuan-xing-bie='nan']")
    expect(账号页).toContain(".xingbie-kapian.beiXuanZhong[data-xuan-xing-bie='nv']")
    expect(账号页).toContain('border-color: var(--xingbie-nan-shen-biankuang)')
    expect(账号页).toContain('border-color: var(--xingbie-nv-shen-biankuang)')
  })
})
