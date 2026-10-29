import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { huoQuFanYi } from '@/config/翻译表'

export type 进入聊天场景 = 'puTong' | 'paiWei' | 'huiYi'

export interface 进入聊天执行上下文 {
  上报进度: (zhi: number) => void
}

export interface 进入聊天加载配置 {
  场景: () => 进入聊天场景
  趣味语列表: () => readonly string[]
  错误文案: () => string
  执行: (上下文: 进入聊天执行上下文) => Promise<void>
  完成: () => void | Promise<unknown>
  覆盖趣味语?: () => string
  最短展示毫秒?: number
  换词毫秒?: number
  可重试?: boolean
}

export const ZUI_DUAN_ZHAN_SHI_HAO_MIAO = 1000
export const HUAN_CI_ZHOU_QI_HAO_MIAO = 3000

export function 使用进入聊天加载(配置: 进入聊天加载配置) {
  const 场景 = computed(配置.场景)
  const 进度 = ref(0)
  const 错误 = ref('')
  const 进行中 = ref(false)
  const 已进入 = ref(false)
  const 趣味语序 = ref(0)
  const 可重试 = computed(() => 配置.可重试 !== false)

  const 趣味语列表 = computed(() => {
    const 原列表 = 配置.趣味语列表()
    return 原列表.length > 0 ? 原列表 : ['']
  })
  const 当前趣味语 = computed(() => {
    const 覆盖 = 配置.覆盖趣味语?.().trim()
    if (覆盖) return 覆盖
    return 趣味语列表.value[趣味语序.value % 趣味语列表.value.length] ?? ''
  })

  let 换词定时器: ReturnType<typeof setInterval> | null = null
  let 结束最短等待: (() => void) | null = null
  let 已取消 = false

  function 停换词() {
    if (换词定时器 !== null) {
      clearInterval(换词定时器)
      换词定时器 = null
    }
  }

  function 启动换词() {
    停换词()
    const 条数 = 趣味语列表.value.length
    趣味语序.value = Math.floor(Math.random() * 条数)
    换词定时器 = setInterval(() => {
      趣味语序.value += 1
    }, 配置.换词毫秒 ?? HUAN_CI_ZHOU_QI_HAO_MIAO)
  }

  function 上报进度(值: number) {
    if (!Number.isFinite(值)) return
    const 归一值 = Math.min(100, Math.max(0, Math.round(值)))
    if (归一值 > 进度.value) 进度.value = 归一值
  }

  function 等待最短时长(毫秒: number): Promise<void> {
    return new Promise((结束) => {
      const 定时器 = setTimeout(() => {
        结束最短等待 = null
        结束()
      }, 毫秒)
      结束最短等待 = () => {
        clearTimeout(定时器)
        结束最短等待 = null
        结束()
      }
    })
  }

  async function 执行一轮() {
    if (进行中.value || 已进入.value) return
    进行中.value = true
    错误.value = ''
    进度.value = 0
    const 起始时间 = Date.now()
    启动换词()
    try {
      await 配置.执行({ 上报进度 })
      if (已取消) return
      const 剩余毫秒 = Math.max(
        0,
        (配置.最短展示毫秒 ?? ZUI_DUAN_ZHAN_SHI_HAO_MIAO) - (Date.now() - 起始时间),
      )
      if (剩余毫秒 > 0) await 等待最短时长(剩余毫秒)
      if (已取消) return
      上报进度(100)
      已进入.value = true
      await 配置.完成()
    } catch {
      if (已取消) return
      已进入.value = false
      进度.value = 0
      错误.value = 配置.错误文案() || huoQuFanYi('tongYong', 'caoZuoShiBai')
    } finally {
      停换词()
      进行中.value = false
    }
  }

  function 开始() {
    if (进行中.value || 已进入.value || 已取消) return
    void 执行一轮()
  }

  function 重试() {
    if (进行中.value || 已进入.value) return
    开始()
  }

  function 取消() {
    已取消 = true
    停换词()
    结束最短等待?.()
    结束最短等待 = null
  }

  if (getCurrentInstance()) onBeforeUnmount(取消)

  return {
    场景,
    进度,
    当前趣味语,
    错误,
    进行中,
    已进入,
    可重试,
    开始,
    重试,
    取消,
  }
}
