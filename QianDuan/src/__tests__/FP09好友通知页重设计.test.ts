import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'

const 挂载状态 = vi.hoisted(() => ({
  refs: null as null | { zhuangTai: { value: string }; cuoWu: { value: unknown } },
  仓库: null as null | Record<string, any>,
  yunXing: (zhiXing: () => unknown) => zhiXing(),
  chongShi: () => {},
}))

vi.mock('@/stores/通知', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  挂载状态.仓库 = vue.reactive({
    tongZhiLieBiao: [] as Array<Record<string, unknown>>,
    weiDuShu: 0,
    jiaZaiTongZhi: () => Promise.resolve(),
    biaoJiYiDu: () => Promise.resolve(),
    biaoJiQuanBuYiDu: () => Promise.resolve(),
    lianJieSocket: () => {},
  })
  return {
    使用通知仓库: () => 挂载状态.仓库,
  }
})

vi.mock('@/composables/use前台错误', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    use前台错误: () => {
      if (!挂载状态.refs) {
        挂载状态.refs = { zhuangTai: vue.ref('idle'), cuoWu: vue.ref(null) }
      }
      return {
        cuoWu: 挂载状态.refs.cuoWu,
        zhuangTai: 挂载状态.refs.zhuangTai,
        yunXing: 挂载状态.yunXing,
        chongShi: 挂载状态.chongShi,
      }
    },
  }
})

import 通知页面 from '@/views/通知页面.vue'
import { huoQuFanYi } from '@/config/翻译表'

挂载状态.refs = { zhuangTai: ref('idle'), cuoWu: ref(null) }

const 本目录 = dirname(fileURLToPath(import.meta.url))
const 源码根 = resolve(本目录, '..')
const 好友源码 = readFileSync(resolve(源码根, 'views', '好友列表.vue'), 'utf8')
const 通知源码 = readFileSync(resolve(源码根, 'views', '通知页面.vue'), 'utf8')

const 样例通知 = [
  {
    id: 'tong-1',
    fa_song_zhe_id: 'u-1',
    jie_shou_zhe_id: 'me',
    biao_ti: '好友申请已通过',
    nei_rong: '你们现在是好友了，去打个招呼吧',
    yi_du: false,
    chuang_jian_shi_jian: '2026-10-25T10:00:00.000Z',
    yi_du_shi_jian: null,
  },
  {
    id: 'tong-2',
    fa_song_zhe_id: 'u-2',
    jie_shou_zhe_id: 'me',
    biao_ti: '系统通知',
    nei_rong: '版本已更新',
    yi_du: true,
    chuang_jian_shi_jian: '2026-10-24T10:00:00.000Z',
    yi_du_shi_jian: '2026-10-24T11:00:00.000Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  if (挂载状态.refs) {
    挂载状态.refs.zhuangTai.value = 'idle'
    挂载状态.refs.cuoWu.value = null
  } else {
    挂载状态.refs = { zhuangTai: ref('idle'), cuoWu: ref(null) }
  }
  if (!挂载状态.仓库) throw new Error('通知仓库未初始化')
  挂载状态.仓库.tongZhiLieBiao = 样例通知.map((项) => ({ ...项 }))
  挂载状态.仓库.weiDuShu = 1
  挂载状态.仓库.jiaZaiTongZhi = vi.fn(async () => undefined)
  挂载状态.仓库.biaoJiYiDu = vi.fn(async () => undefined)
  挂载状态.仓库.biaoJiQuanBuYiDu = vi.fn(async () => undefined)
  挂载状态.仓库.lianJieSocket = vi.fn()
  挂载状态.yunXing = vi.fn(async (zhiXing: () => unknown) => zhiXing())
  挂载状态.chongShi = vi.fn()
})

describe('FP09 好友页头部与副文案', () => {
  it('副文案精确为需求指定文本', () => {
    expect(huoQuFanYi('haoYou', 'zanWuHaoYouTiShi')).toBe(
      '搜索手机号或用户名，发出好友申请。对方通过后开聊！',
    )
  })

  it('头部直角深色背景板已删除：静止无缝、滚动才遮挡、无边线、死令牌清零', () => {
    expect(好友源码).toContain('background: var(--hao-you-ye-mian)')
    expect(好友源码).not.toContain('hao-you-ding-bu-mian')
    const 头部块 = /\.hao-you-ding-bu \{[\s\S]*?\n\}/.exec(好友源码)?.[0] ?? ''
    expect(头部块).not.toContain('border-bottom')
    expect(头部块).not.toContain('background')
    expect(头部块).not.toContain('backdrop-filter')
    const 遮挡块 = /\.hao-you-ding-bu\.ding-bu-fu-gai \{[\s\S]*?\n\}/.exec(好友源码)?.[0] ?? ''
    expect(遮挡块).toContain('background: var(--hao-you-ye-mian)')
    expect(遮挡块).toContain('backdrop-filter: blur(12px)')
    expect(好友源码).toContain('@scroll.passive="gengXinDingBuFuGai"')
    expect(好友源码).toContain(":class=\"{ 'ding-bu-fu-gai': dingBuFuGai }\"")
    expect(好友源码).toMatch(/dingBuFuGai\.value = \(shiJian\.target as HTMLElement\)\.scrollTop > 4/)
  })
})

describe('FP09 新的朋友面板转场', () => {
  it('面板三分支包裹out-in过渡且方向动画与降级齐备', () => {
    expect(好友源码).toContain('<Transition name="hao-you-mian-ban" mode="out-in">')
    expect(好友源码).toMatch(/\.hao-you-mian-ban-enter-from \{[\s\S]*?translateY\(10px\)/)
    expect(好友源码).toMatch(/\.hao-you-mian-ban-leave-to \{[\s\S]*?translateY\(-6px\)/)
    const 降级块 = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(好友源码)?.[0] ?? ''
    expect(降级块).toContain('.hao-you-mian-ban-enter-active')
  })
})

describe('FP09 通知页语义与层级', () => {
  it('未读数徽标显示条数且封顶99+', async () => {
    const 包 = mount(通知页面)
    expect(包.find('.weidu-jiaochi').text()).toContain('1')
    expect(包.find('.weidu-jiaochi').text()).toContain('未读')
    挂载状态.仓库.weiDuShu = 120
    await nextTick()
    expect(包.find('.weidu-jiaochi').text()).toContain('99+')
    包.unmount()
  })

  it('未读项带圆点与标为已读按钮，按钮点击触发标记且不重复出现在已读项', async () => {
    const 包 = mount(通知页面)
    const 未读项 = 包.find('[data-testid="tongzhi-xiang-tong-1"]')
    const 已读项 = 包.find('[data-testid="tongzhi-xiang-tong-2"]')
    expect(未读项.find('.weidu-yuandian').exists()).toBe(true)
    expect(已读项.find('.weidu-yuandian').exists()).toBe(false)
    const 按钮 = 未读项.find('.yidu-anniu')
    expect(按钮.exists()).toBe(true)
    expect(按钮.attributes('aria-label')).toContain('好友申请已通过')
    expect(已读项.find('.yidu-anniu').exists()).toBe(false)
    await 按钮.trigger('click')
    expect(挂载状态.仓库.biaoJiYiDu).toHaveBeenCalledWith('tong-1')
    expect(挂载状态.仓库.biaoJiYiDu).toHaveBeenCalledTimes(1)
    包.unmount()
  })

  it('全部已读按钮仅在存在未读时出现', async () => {
    const 包 = mount(通知页面)
    expect(包.find('.quanbu-anniu').exists()).toBe(true)
    挂载状态.仓库.weiDuShu = 0
    await nextTick()
    expect(包.find('.quanbu-anniu').exists()).toBe(false)
    包.unmount()
  })

  it('空态使用矢量图标而非emoji，加载态为骨架屏', () => {
    挂载状态.仓库.tongZhiLieBiao = []
    挂载状态.仓库.weiDuShu = 0
    const 空包 = mount(通知页面)
    expect(空包.find('.kong-tubiao svg').exists()).toBe(true)
    expect(空包.text()).not.toContain('🔔')
    空包.unmount()

    挂载状态.refs.zhuangTai.value = 'loading'
    const 载包 = mount(通知页面)
    expect(载包.findAll('.gujia-xiang').length).toBe(5)
    expect(载包.find('.tongzhi-gujia[role="status"]').exists()).toBe(true)
    载包.unmount()
  })

  it('跨年时间带年份，同年仅月日，当天仅时分', () => {
    vi.useFakeTimers({ now: new Date('2026-10-25T12:00:00') })
    const 包 = mount(通知页面)
    const qi = new Date('2026-10-24T10:00:00.000Z')
    const 期望 = `${qi.getMonth() + 1}/${qi.getDate()} ${String(qi.getHours()).padStart(2, '0')}:${String(qi.getMinutes()).padStart(2, '0')}`
    expect(包.find('[data-testid="tongzhi-xiang-tong-2"]').find('.tongzhi-shijian').text()).toBe(
      期望,
    )
    包.unmount()
    vi.useRealTimers()
  })
})

describe('FP09 已读操作局部更新', () => {
  it('单条与全部已读不把页面置入loading，骨架屏只属首次加载', async () => {
    const 包 = mount(通知页面)
    await 包.find('.yidu-anniu').trigger('click')
    const danTiao = 挂载状态.yunXing.mock.calls.find(([, x]) => x && 'xianShiJiaZai' in (x as object))?.[1] as
      | { xianShiJiaZai: boolean }
      | undefined
    expect(danTiao?.xianShiJiaZai).toBe(false)
    expect(挂载状态.refs.zhuangTai.value).toBe('idle')
    await 包.find('.quanbu-anniu').trigger('click')
    const xuanXiangMen = 挂载状态.yunXing.mock.calls.map(([, x]) => x as { xianShiJiaZai?: boolean } | undefined)
    expect(xuanXiangMen.filter((x) => x?.xianShiJiaZai === false)).toHaveLength(2)
    expect(挂载状态.refs.zhuangTai.value).toBe('idle')
    包.unmount()
  })

  it('未读卡具备键盘可达性，已读卡不承担按钮语义', async () => {
    const 包 = mount(通知页面)
    const 未读项 = 包.find('[data-testid="tongzhi-xiang-tong-1"]')
    const 已读项 = 包.find('[data-testid="tongzhi-xiang-tong-2"]')
    expect(未读项.attributes('role')).toBe('button')
    expect(未读项.attributes('tabindex')).toBe('0')
    await 未读项.trigger('keydown.enter')
    expect(挂载状态.仓库.biaoJiYiDu).toHaveBeenCalledWith('tong-1')
    expect(已读项.attributes('role')).toBeUndefined()
    expect(已读项.attributes('tabindex')).toBeUndefined()
    包.unmount()
  })

  it('全仓未读封顶统一走未读封顶工具', () => {
    expect(通知源码).not.toMatch(/>\s*99\s*\?\s*'99\+'/)
    expect(通知源码).toContain("from '@/utils/未读封顶'")
  })
})
