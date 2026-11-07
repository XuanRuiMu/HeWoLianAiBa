import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import 消息操作菜单 from '@/components/聊天/消息操作菜单.vue'
import { use长按菜单 } from '@/composables/use长按菜单'
import { LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI } from '@/config/消息配置'

const 组件源 = readFileSync(resolve(__dirname, '../components/聊天/消息操作菜单.vue'), 'utf8')
const 样式源 = readFileSync(resolve(__dirname, '../styles/消息操作菜单.css'), 'utf8')
const 聊天页源 = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
const 好友页源 = readFileSync(resolve(__dirname, '../views/好友聊天.vue'), 'utf8')

let 挂载: VueWrapper | null = null

function 外部元素(): HTMLButtonElement {
  const 按钮 = document.createElement('button')
  按钮.type = 'button'
  document.body.appendChild(按钮)
  return 按钮
}

async function 挂菜单(): Promise<VueWrapper> {
  挂载 = mount(消息操作菜单, {
    attachTo: document.body,
    props: { kaiQi: true, jiDian: { x: 30, y: 40 }, caiDanXiang: ['fuZhi'] },
  })
  await nextTick()
  await nextTick()
  return 挂载
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  挂载?.unmount()
  挂载 = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('消息菜单连续打开的事件命中', () => {
  it('全屏遮罩不接收指针，只有菜单实体接收指针', () => {
    const 遮罩规则 = 样式源.match(/\.xiaoxi-caidan-zhezhao\s*\{[^}]*\}/)?.[0] ?? ''
    const 菜单规则 = 样式源.match(/\.xiaoxi-caidan\s*\{[^}]*\}/)?.[0] ?? ''
    expect(遮罩规则).toContain('pointer-events: none')
    expect(菜单规则).toContain('pointer-events: auto')
    expect(组件源).not.toContain('@click="emit(\'guan-bi\')"')
    expect(组件源).toContain("document.addEventListener('pointerdown'")
    expect(组件源).toContain("document.removeEventListener('pointerdown'")
  })

  it('外部 pointerdown 关闭旧菜单但不拦截同一手势', async () => {
    await 挂菜单()
    const 按钮 = 外部元素()
    const 点击 = vi.fn()
    按钮.addEventListener('click', 点击)
    const 事件 = new Event('pointerdown', { bubbles: true, cancelable: true })
    const 未阻止 = 按钮.dispatchEvent(事件)
    await nextTick()
    expect(未阻止).toBe(true)
    expect(事件.defaultPrevented).toBe(false)
    expect(挂载?.emitted('guan-bi')).toHaveLength(1)
    按钮.click()
    expect(点击).toHaveBeenCalledTimes(1)
  })

  it('菜单内部 pointerdown 不关闭，右键不会冒出浏览器默认菜单', async () => {
    await 挂菜单()
    const 菜单 = document.querySelector<HTMLElement>('.xiaoxi-caidan')
    expect(菜单).not.toBeNull()
    const 内部指针 = new Event('pointerdown', { bubbles: true, cancelable: true })
    菜单?.dispatchEvent(内部指针)
    await nextTick()
    expect(挂载?.emitted('guan-bi')).toBeUndefined()
    const 右键 = new Event('contextmenu', { bubbles: true, cancelable: true })
    const 未阻止 = 菜单?.dispatchEvent(右键)
    expect(未阻止).toBe(false)
    expect(右键.defaultPrevented).toBe(true)
  })

  it('已有菜单再次打开时先完整关闭再写入新消息和新位置', () => {
    const 菜单 = use长按菜单({
      dangQianShiJian: { value: Date.now() } as never,
      cheHuiXiaoXi: async () => undefined,
    })
    const 第一条 = {
      id: 'm-1',
      nei_rong: '第一条',
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      fa_song_zhe_lei_xing: 'yonghu',
    }
    const 第二条 = { ...第一条, id: 'm-2', nei_rong: '第二条' }
    菜单.daKaiCaiDan(第一条 as never, new MouseEvent('contextmenu', { clientX: 10, clientY: 20 }))
    expect(菜单.dangQianXiaoXi.value?.id).toBe('m-1')
    expect(菜单.dangQianJiDian.value).toEqual({ x: 10, y: 20 })
    菜单.daKaiCaiDan(第二条 as never, new MouseEvent('contextmenu', { clientX: 120, clientY: 220 }))
    expect(菜单.caiDanZhengDaKai.value).toBe(true)
    expect(菜单.dangQianXiaoXi.value?.id).toBe('m-2')
    expect(菜单.dangQianJiDian.value).toEqual({ x: 120, y: 220 })
  })

  it('触摸被系统取消时撤掉长按计时，不残留延迟菜单', () => {
    vi.useFakeTimers()
    try {
      const 菜单 = use长按菜单({
        dangQianShiJian: { value: Date.now() } as never,
        cheHuiXiaoXi: async () => undefined,
      })
      const 消息 = {
        id: 'm-touch',
        nei_rong: '触摸',
        lei_xing: 'wenben',
        shi_jian_chuo: Date.now(),
        fa_song_zhe_lei_xing: 'yonghu',
      }
      const 触摸 = new TouchEvent('touchstart', {
        touches: [{ clientX: 5, clientY: 6 } as Touch],
      })
      菜单.chuMoKaiShi(消息 as never, 触摸)
      菜单.chuMoJieShu()
      vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 50)
      expect(菜单.caiDanZhengDaKai.value).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('正式聊天与好友聊天都监听 touchcancel，移动端中断后可清理计时', () => {
    expect(聊天页源).toContain('@touchcancel="chuMoJieShu"')
    expect(好友页源).toContain('@touchcancel="chuLiChuMoJieShu"')
  })
})
