import { nextTick, ref } from 'vue'
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest'
import { EMOJI_MIANBAN_PEI_ZHI } from '@/config/消息配置'
import { use表情面板 } from '@/composables/use表情面板'

const YUAN_SHI_RESIZE_OBSERVER = globalThis.ResizeObserver

interface JiaGuanChaQi {
  回调: () => void
  观测: ReturnType<typeof vi.fn>
  断开: ReturnType<typeof vi.fn>
}

interface XiaoXiQuJia {
  元素: HTMLElement
  设尺寸: (scrollHeight: number, clientHeight: number) => void
  真实底部: () => number
}

function zaoXiaoXiQu(sh: number, ch: number): XiaoXiQuJia {
  const 元素 = document.createElement('div')
  let scrollHeight = sh
  let clientHeight = ch
  let scrollTop = 0
  Object.defineProperty(元素, 'scrollHeight', { get: () => scrollHeight, configurable: true })
  Object.defineProperty(元素, 'clientHeight', { get: () => clientHeight, configurable: true })
  // 真实浏览器语义：写入超出 [0, scrollHeight-clientHeight] 的值会被静默钳制，
  // 旧实现「累加高度增量并记账基线」正是被这条钳制吞掉超出量后才丢底的
  Object.defineProperty(元素, 'scrollTop', {
    get: () => scrollTop,
    set: (zhi: number) => {
      const 上限 = Math.max(0, scrollHeight - clientHeight)
      scrollTop = Math.max(0, Math.min(上限, Math.trunc(zhi)))
    },
    configurable: true,
  })
  return {
    元素,
    设尺寸: (新SH, 新CH) => {
      scrollHeight = 新SH
      clientHeight = 新CH
    },
    真实底部: () => Math.max(0, scrollHeight - clientHeight),
  }
}

function zaoMianBan(): HTMLElement {
  const 面板 = document.createElement('div')
  面板.className = 'emoji-mianban'
  const 子项 = document.createElement('button')
  子项.className = 'emoji-xiangmu'
  面板.appendChild(子项)
  document.body.appendChild(面板)
  return 面板
}

function 装载观察器替身(): JiaGuanChaQi & { 实例数: () => number } {
  const 记录: JiaGuanChaQi[] = []
  class JiaGuanChaQiLei {
    回调: () => void
    观测 = vi.fn()
    断开 = vi.fn()
    constructor(回: () => void) {
      this.回调 = 回
      记录.push({ 回调: 回, 观测: this.观测, 断开: this.断开 })
    }
    observe(元: HTMLElement) {
      this.观测(元)
    }
    unobserve() {}
    disconnect() {
      this.断开()
    }
  }
  vi.stubGlobal('ResizeObserver', JiaGuanChaQiLei)
  return {
    get 回调() {
      return 记录[记录.length - 1].回调
    },
    get 观测() {
      return 记录[记录.length - 1].观测
    },
    get 断开() {
      return 记录[记录.length - 1].断开
    },
    实例数: () => 记录.length,
  }
}

function zaoYiLai(消息区?: XiaoXiQuJia, 钉底 = true) {
  return {
    shuRuNeiRong: ref(''),
    xiaoxiQuYuRef: ref<HTMLElement | null>(消息区 ? 消息区.元素 : null),
    dingZaiDiBu: ref(钉底),
  }
}

function 派发过渡结束(面板: HTMLElement, 目标: EventTarget) {
  const 事件 = new Event('transitionend', { bubbles: true }) as Event & { target: EventTarget }
  Object.defineProperty(事件, 'target', { value: 目标, configurable: true })
  面板.dispatchEvent(事件)
}

describe('use表情面板', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.stubGlobal('ResizeObserver', YUAN_SHI_RESIZE_OBSERVER)
    vi.useRealTimers()
  })

  it('点击 emoji 追加到输入内容', () => {
    const yiLai = zaoYiLai()
    const { chaRuEmoji } = use表情面板(yiLai)
    expect(yiLai.shuRuNeiRong.value).toBe('')
    chaRuEmoji('A')
    chaRuEmoji('B')
    expect(yiLai.shuRuNeiRong.value).toBe('AB')
  })

  it('面板展开状态与标签页可切换', () => {
    const { emojiMianBanZhanKai, qieHuanEmojiMianBan, emojiTab, qieHuanEmojiTab } =
      use表情面板(zaoYiLai())
    expect(emojiMianBanZhanKai.value).toBe(false)
    qieHuanEmojiMianBan()
    expect(emojiMianBanZhanKai.value).toBe(true)
    qieHuanEmojiMianBan()
    expect(emojiMianBanZhanKai.value).toBe(false)
    expect(emojiTab.value).toBe('emoji')
    qieHuanEmojiTab('biaoqingbao')
    expect(emojiTab.value).toBe('biaoqingbao')
    qieHuanEmojiTab('emoji')
    expect(emojiTab.value).toBe('emoji')
  })

  it('常用表情库完整且无重复', () => {
    const { changYongEmoji } = use表情面板(zaoYiLai())
    expect(changYongEmoji.length).toBe(168)
    expect(new Set(changYongEmoji).size).toBe(changYongEmoji.length)
  })

  it('清理资源与字形预载在未初始化观察器时安全执行', () => {
    const 观察器 = 装载观察器替身()
    const { emojiMianBanRef, yuZaiEmojiZiXing, qingLiEmojiZiYuan } = use表情面板(zaoYiLai())
    expect(() => {
      qingLiEmojiZiYuan()
      yuZaiEmojiZiXing()
      qingLiEmojiZiYuan()
    }).not.toThrow()
    expect(emojiMianBanRef.value).toBeNull()
    expect(观察器.实例数()).toBe(0)
  })

  it('面板几何变化的每一帧都写此刻的真实底部，展开后 scrollTop 误差 0', async () => {
    const 观察器 = 装载观察器替身()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const yiLai = zaoYiLai(消息区)
    const { emojiMianBanRef, qieHuanEmojiMianBan } = use表情面板(yiLai)
    消息区.元素.scrollTop = 消息区.真实底部()
    emojiMianBanRef.value = 面板
    await nextTick()
    expect(观察器.观测).toHaveBeenCalledWith(面板)

    qieHuanEmojiMianBan()
    await nextTick()
    // 面板在 footer 文档流里「顶起」消息区：clientHeight 变矮，真实底部随之变大
    消息区.设尺寸(1000, 250)
    观察器.回调()
    expect(消息区.元素.scrollTop).toBe(750)
    expect(消息区.元素.scrollTop).toBe(消息区.真实底部())
  })

  it('面板开→关后 scrollTop 精确等于 scrollHeight-clientHeight（误差 0）', async () => {
    const 观察器 = 装载观察器替身()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const yiLai = zaoYiLai(消息区)
    const { emojiMianBanRef, qieHuanEmojiMianBan } = use表情面板(yiLai)
    消息区.元素.scrollTop = 消息区.真实底部()
    emojiMianBanRef.value = 面板
    await nextTick()

    qieHuanEmojiMianBan()
    await nextTick()
    消息区.设尺寸(1000, 250)
    观察器.回调()
    派发过渡结束(面板, 面板)
    expect(消息区.元素.scrollTop).toBe(750)

    qieHuanEmojiMianBan()
    await nextTick()
    消息区.设尺寸(1000, 400)
    观察器.回调()
    派发过渡结束(面板, 面板)

    expect(消息区.元素.scrollTop).toBe(1000 - 400)
    expect(消息区.元素.scrollTop).toBe(消息区.真实底部())
    expect(yiLai.dingZaiDiBu.value).toBe(true)
  })

  it('末帧未被 ResizeObserver 观察时，transitionend 收尾写仍把 scrollTop 落到真实底部', async () => {
    装载观察器替身()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const yiLai = zaoYiLai(消息区)
    const { emojiMianBanRef, qieHuanEmojiMianBan } = use表情面板(yiLai)
    消息区.元素.scrollTop = 消息区.真实底部()
    emojiMianBanRef.value = 面板
    await nextTick()

    qieHuanEmojiMianBan()
    await nextTick()
    消息区.设尺寸(1000, 250)
    派发过渡结束(面板, 面板)
    expect(消息区.元素.scrollTop).toBe(750)

    qieHuanEmojiMianBan()
    await nextTick()
    消息区.设尺寸(1000, 400)
    派发过渡结束(面板, 面板)
    expect(消息区.元素.scrollTop).toBe(消息区.真实底部())
    expect(消息区.元素.scrollTop).toBe(600)
  })

  it('用户未钉底时面板开合既不改动滚动位置也不把钉底标志改真', async () => {
    const 观察器 = 装载观察器替身()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const yiLai = zaoYiLai(消息区, false)
    const { emojiMianBanRef, qieHuanEmojiMianBan } = use表情面板(yiLai)
    消息区.元素.scrollTop = 200
    emojiMianBanRef.value = 面板
    await nextTick()

    qieHuanEmojiMianBan()
    await nextTick()
    消息区.设尺寸(1000, 250)
    观察器.回调()
    派发过渡结束(面板, 面板)

    qieHuanEmojiMianBan()
    await nextTick()
    消息区.设尺寸(1000, 400)
    观察器.回调()
    派发过渡结束(面板, 面板)

    expect(消息区.元素.scrollTop).toBe(200)
    expect(yiLai.dingZaiDiBu.value).toBe(false)
  })

  it('只观测模板 ref 的那一个实例：子元素冒泡的 transitionend 不得提前收尾', async () => {
    const 观察器 = 装载观察器替身()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const 子项 = 面板.querySelector('.emoji-xiangmu') as HTMLElement
    const yiLai = zaoYiLai(消息区)
    const { emojiMianBanRef, qieHuanEmojiMianBan } = use表情面板(yiLai)
    消息区.元素.scrollTop = 消息区.真实底部()
    emojiMianBanRef.value = 面板
    await nextTick()
    expect(观察器.观测).toHaveBeenCalledWith(面板)

    qieHuanEmojiMianBan()
    await nextTick()
    派发过渡结束(面板, 子项)
    消息区.设尺寸(1000, 250)
    观察器.回调()
    // 子项（hover 过渡）的事件被按实例过滤掉，过渡仍在进行 ⇒ 仍在补偿
    expect(消息区.元素.scrollTop).toBe(750)

    派发过渡结束(面板, 面板)
    消息区.设尺寸(1000, 400)
    观察器.回调()
    // 收尾后过渡已结束，后续几何变化不再改动滚动位置
    expect(消息区.元素.scrollTop).toBe(750)
  })

  it('过渡被中断（transitionend 不到达）时超时兜底仍写到真实底部', async () => {
    装载观察器替身()
    vi.useFakeTimers()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const yiLai = zaoYiLai(消息区)
    const { emojiMianBanRef, qieHuanEmojiMianBan } = use表情面板(yiLai)
    消息区.元素.scrollTop = 消息区.真实底部()
    emojiMianBanRef.value = 面板
    await nextTick()

    qieHuanEmojiMianBan()
    await nextTick()
    消息区.设尺寸(1000, 250)
    vi.advanceTimersByTime(EMOJI_MIANBAN_PEI_ZHI.guoDuShouWeiHaoMiao)
    expect(消息区.元素.scrollTop).toBe(750)

    qieHuanEmojiMianBan()
    await nextTick()
    消息区.设尺寸(1000, 400)
    vi.advanceTimersByTime(EMOJI_MIANBAN_PEI_ZHI.guoDuShouWeiHaoMiao)
    expect(消息区.元素.scrollTop).toBe(600)
    expect(消息区.元素.scrollTop).toBe(消息区.真实底部())
  })

  it('面板元素卸载时解绑 transitionend 并断开观察器', async () => {
    const 观察器 = 装载观察器替身()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const 解绑 = vi.spyOn(面板, 'removeEventListener')
    const { emojiMianBanRef } = use表情面板(zaoYiLai(消息区))
    emojiMianBanRef.value = 面板
    await nextTick()
    emojiMianBanRef.value = null
    await nextTick()
    expect(解绑).toHaveBeenCalledWith('transitionend', expect.any(Function))
    expect(观察器.断开).toHaveBeenCalled()
  })

  it('观测面必须同时包含面板与消息区（只盯面板会在末帧写错终点）', async () => {
    const 观察器 = 装载观察器替身()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const { emojiMianBanRef } = use表情面板(zaoYiLai(消息区))
    emojiMianBanRef.value = 面板
    await nextTick()
    expect(观察器.观测).toHaveBeenCalledWith(面板)
    expect(观察器.观测).toHaveBeenCalledWith(消息区.元素)
  })

  it('页面侧在补偿窗口内把钉底改判为 false 时，补偿不得停摆（真机 #13 残留形态）', async () => {
    // 真实浏览器里：钉底写入本身会派生一个 scroll 事件，而页面侧的「是否在底部」判定读到的
    // 往往是过渡中途的旧几何（还差几十像素），于是把 dingZaiDiBu 改成 false。旧实现在每次
    // 补偿前都回读该标志 ⇒ 窗口刚开就被自己的写入关掉，实测展开后恒距底 128px。
    const 观察器 = 装载观察器替身()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const yiLai = zaoYiLai(消息区, true)
    const { emojiMianBanRef, qieHuanEmojiMianBan } = use表情面板(yiLai)
    消息区.元素.scrollTop = 消息区.真实底部()
    emojiMianBanRef.value = 面板
    await nextTick()

    qieHuanEmojiMianBan()
    await nextTick()
    yiLai.dingZaiDiBu.value = false // 模拟页面侧在过渡中途误判「已离开底部」
    消息区.设尺寸(1000, 250)
    观察器.回调()
    expect(消息区.元素.scrollTop).toBe(750)
    expect(消息区.元素.scrollTop).toBe(消息区.真实底部())
  })

  it('补偿窗口内用户自己滚走即停手：不得把用户拽回底部', async () => {
    const 观察器 = 装载观察器替身()
    const 消息区 = zaoXiaoXiQu(1000, 400)
    const 面板 = zaoMianBan()
    const yiLai = zaoYiLai(消息区, true)
    const { emojiMianBanRef, qieHuanEmojiMianBan } = use表情面板(yiLai)
    消息区.元素.scrollTop = 消息区.真实底部()
    emojiMianBanRef.value = 面板
    await nextTick()

    qieHuanEmojiMianBan()
    await nextTick()
    消息区.设尺寸(1000, 250)
    观察器.回调()
    expect(消息区.元素.scrollTop).toBe(750)
    // 用户在窗口内向上翻页：scrollTop 变了并派生 scroll 事件
    消息区.元素.scrollTop = 300
    消息区.元素.dispatchEvent(new Event('scroll'))
    观察器.回调()
    expect(消息区.元素.scrollTop).toBe(300)
  })
})
