import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import 翻译结果框 from '@/components/聊天/翻译结果框.vue'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { fuZhiWenBen, use长按菜单 } from '@/composables/use长按菜单'
import { huoQuFanYi } from '@/config/translations'
import { 按档解析全部 } from './主题令牌真源'

const 源码根 = resolve(__dirname, '..')
const 已挂载组件: Array<{ unmount: () => void }> = []

afterEach(() => {
  for (const wrapper of 已挂载组件.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

function 读源(相对路径: string): string {
  return readFileSync(join(源码根, 相对路径), 'utf8')
}

function 遍历源码(目录 = 源码根, 结果: string[] = []): string[] {
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    if (项.name === '__tests__' || 项.name === 'node_modules') continue
    const 路径 = join(目录, 项.name)
    if (项.isDirectory()) 遍历源码(路径, 结果)
    else if (/\.(vue|ts)$/.test(项.name)) 结果.push(路径)
  }
  return 结果
}

function 造组件(属性: Record<string, unknown> = {}) {
  const wrapper = mount(翻译结果框, {
    props: {
      zhuangTai: 'success',
      jieGuo: '译文',
      yuanYu: 'auto',
      muBiaoYu: 'zh',
      fuZhiWenBen: vi.fn().mockResolvedValue(true),
      ...属性,
    },
    attachTo: document.body,
  })
  已挂载组件.push(wrapper)
  return wrapper
}

function 造菜单(请求: (wenBen: string) => Promise<string>) {
  return use长按菜单({
    dangQianShiJian: ref(Date.now()),
    cheHuiXiaoXi: vi.fn().mockResolvedValue(undefined),
    fanYiQingQiu: vi.fn((wenBen: string) => 请求(wenBen)),
    sheZhiCuoWu: vi.fn(),
  })
}

describe('FP-10 翻译结果框', () => {
  it('长中文、英文和代码片段按原文换行可读且不裁切', () => {
    const wenBen = `${'长中文内容'.repeat(40)}\n${'English translation paragraph. '.repeat(12)}\nconst value = "中文与 English";\n结束`
    const wrapper = 造组件({ jieGuo: wenBen })
    const neiRong = wrapper.find('.fanyi-jieguo-neirong')
    expect(neiRong.text()).toBe(wenBen)
    expect(neiRong.attributes('tabindex')).toBe('0')
    const yuanMa = 读源('components/聊天/翻译结果框.vue')
    expect(yuanMa).toContain('white-space: pre-wrap')
    expect(yuanMa).toContain('overflow-wrap: anywhere')
    expect(yuanMa).toContain('max-width: 100%')
    expect(yuanMa).toContain('min-width: 0')
    expect(yuanMa).not.toMatch(/position\s*:\s*(absolute|fixed)/)
  })

  it('双主题结果框使用的每个令牌在浅色和深色档都可解析', () => {
    const yuanMa = 读源('components/聊天/翻译结果框.vue')
    const 浅色 = 按档解析全部('light')
    const 深色 = 按档解析全部('dark')
    const 令牌 = new Set(
      [...yuanMa.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((匹配) => 匹配[1]),
    )
    expect(令牌.size).toBeGreaterThan(0)
    for (const 名称 of 令牌) {
      expect(浅色.has(名称), `${名称} 浅色主题缺失`).toBe(true)
      expect(深色.has(名称), `${名称} 深色主题缺失`).toBe(true)
    }
  })

  it('复制成功与失败都使用翻译文件反馈', async () => {
    const chengGong = 造组件({ fuZhiWenBen: vi.fn().mockResolvedValue(true) })
    await chengGong.find('.fanyi-fuzhi-anniu').trigger('click')
    await flushPromises()
    expect(chengGong.find('.fanyi-fuzhi-tishi').text()).toBe(huoQuFanYi('liaoTian', 'yiFuZhi'))

    const shiBai = 造组件({ fuZhiWenBen: vi.fn().mockResolvedValue(false) })
    await shiBai.find('.fanyi-fuzhi-anniu').trigger('click')
    await flushPromises()
    expect(shiBai.find('.fanyi-fuzhi-tishi').text()).toBe(
      huoQuFanYi('liaoTian', 'fuZhiShiBai'),
    )

    const exception = 造组件({
      fuZhiWenBen: vi.fn().mockRejectedValue(new Error('internal clipboard detail')),
    })
    await exception.find('.fanyi-fuzhi-anniu').trigger('click')
    await flushPromises()
    expect(exception.find('.fanyi-fuzhi-tishi').text()).toBe(
      huoQuFanYi('liaoTian', 'fuZhiShiBai'),
    )
    expect(exception.text()).not.toContain('internal clipboard detail')
  })

  it('复制按钮在无回调、空结果和非成功态禁用', () => {
    const wu = 造组件({ fuZhiWenBen: undefined })
    expect((wu.find('.fanyi-fuzhi-anniu').element as HTMLButtonElement).disabled).toBe(true)
    const kong = 造组件({ zhuangTai: 'empty', jieGuo: '' })
    expect((kong.find('.fanyi-fuzhi-anniu').element as HTMLButtonElement).disabled).toBe(true)
    const jiaZai = 造组件({ zhuangTai: 'loading' })
    expect((jiaZai.find('.fanyi-fuzhi-anniu').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('复制按钮保持原生键盘语义，结果区可聚焦并可被读屏命名', async () => {
    const wrapper = 造组件()
    const anniu = wrapper.find('.fanyi-fuzhi-anniu')
    expect(anniu.attributes('type')).toBe('button')
    expect(anniu.attributes('aria-label')).toBe(huoQuFanYi('liaoTian', 'fuZhi'))
    const zhengWen = wrapper.find('.fanyi-jieguo-neirong')
    ;(zhengWen.element as HTMLElement).focus()
    expect(document.activeElement).toBe(zhengWen.element)
    expect(wrapper.find('.fanyi-jieguo-kuang').attributes('aria-labelledby')).toBeTruthy()
    await wrapper.find('.fanyi-yuyan-xiala').setValue('en')
    expect(wrapper.emitted('gengXinYuanYu')?.[0]).toEqual(['en'])
  })

  it('剪贴板降级路径复制后恢复原焦点', async () => {
    const clipboard描述 = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    const execCommand描述 = Object.getOwnPropertyDescriptor(document, 'execCommand')
    const button = document.createElement('button')
    document.body.appendChild(button)
    button.focus()
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockRejectedValue(new Error('clipboard denied')) },
      })
      Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: vi.fn().mockReturnValue(true),
      })
      expect(await fuZhiWenBen('可复制的译文')).toBe(true)
      expect(document.activeElement).toBe(button)
    } finally {
      button.remove()
      if (clipboard描述) Object.defineProperty(navigator, 'clipboard', clipboard描述)
      else delete (navigator as Navigator & { clipboard?: Clipboard }).clipboard
      if (execCommand描述) Object.defineProperty(document, 'execCommand', execCommand描述)
      else delete (document as Document & { execCommand?: () => boolean }).execCommand
    }
  })

  it('加载、空、错误状态有明确语义且不泄露内部错误', () => {
    const jiaZai = 造组件({ zhuangTai: 'loading', jieGuo: '' })
    expect(jiaZai.find('.fanyi-jieguo-kuang').attributes('aria-busy')).toBe('true')
    expect(jiaZai.find('.fanyi-jieguo-zhuangtai').attributes('role')).toBe('status')
    expect(jiaZai.text()).toContain(huoQuFanYi('liaoTian', 'fanYiZhong'))

    const kong = 造组件({ zhuangTai: 'empty', jieGuo: '' })
    expect(kong.find('.fanyi-jieguo-zhuangtai').attributes('role')).toBe('status')
    expect(kong.text()).toContain(huoQuFanYi('liaoTian', 'fanYiKong'))

    const cuoWu = 造组件({ zhuangTai: 'error', jieGuo: '' })
    expect(cuoWu.find('.fanyi-jieguo-zhuangtai').attributes('role')).toBe('alert')
    expect(cuoWu.find('.qian-tai-cuo-wu-dai-ma').text()).toBe(QIAN_TAI_DAI_MA.XIE_YI)
    expect(cuoWu.find('.qian-tai-cuo-wu-ying-xiang').text()).toBe(
      huoQuFanYi('liaoTian', 'fanYiShiBai'),
    )
    expect(cuoWu.find('.qian-tai-cuo-wu-xia-yi-bu').text()).toBe(
      huoQuFanYi('tongYong', 'xieYiWenTiXiaYiBu'),
    )
    expect(cuoWu.text()).not.toContain('internal stack')
  })

  it('移动断点和 reduced-motion 规则存在', () => {
    const yuanMa = 读源('components/聊天/翻译结果框.vue')
    expect(yuanMa).toMatch(/@media\s*\(max-width:\s*480px\)/)
    expect(yuanMa).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    expect(yuanMa).toMatch(/transition:\s*none/)
  })
})

describe('FP-10 翻译出口机械清单与状态', () => {
  it('翻译结果出口只有两个页面且各恰好一个统一组件', () => {
    const 出口 = ['views/聊天页面.vue', 'views/好友聊天.vue']
    const 扫描出口 = 遍历源码()
      .filter((路径) => /<FanYiJieGuo(?:\s|>)/.test(readFileSync(路径, 'utf8')))
      .map((路径) => 路径.slice(源码根.length + 1).replace(/\\/g, '/'))
      .sort()
    expect(扫描出口).toEqual([...出口].sort())
    for (const 文件 of 出口) {
      const 源 = 读源(文件)
      expect((源.match(/<FanYiJieGuo(?:\s|>)/g) ?? []).length, `${文件} 统一组件出口不唯一`).toBe(1)
      expect(源).toContain('data-chat-scope="true"')
      expect(源).not.toContain('class="fanyi-yuyan-hang"')
      expect(源).not.toMatch(/\{\{\s*huoQuFanYiJieGuo\(xiaoXi\)\s*\}\}/)
    }
    const 请求出口 = [
      ['api/聊天.ts', 'fanYiWenBen'],
      ['views/聊天页面.vue', 'fanYiWenBen'],
      ['views/好友聊天.vue', 'fanYiWenBen'],
      ['composables/use长按菜单.ts', 'fanYiQingQiu'],
    ] as const
    for (const [文件, 标识] of 请求出口) expect(读源(文件)).toContain(标识)
  })

  it('翻译失败与空结果进入可恢复状态，成功后清除失败态', async () => {
    let 结果 = ''
    const 菜单 = 造菜单(async () => 结果)
    const 消息 = {
      id: 'm1',
      nei_rong: '你好',
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      fa_song_zhe_lei_xing: 'yonghu' as const,
    }
    结果 = '   '
    await 菜单.qingQiuWenBenFanYi(消息)
    expect(菜单.shiFanYiKong(消息)).toBe(true)
    expect(菜单.shiFanYiChuCuo(消息)).toBe(false)

    结果 = 'hello'
    await 菜单.qiangZhiFanYi(消息)
    expect(菜单.shiFanYiKong(消息)).toBe(false)
    expect(菜单.shiFanYiChuCuo(消息)).toBe(false)
    expect(菜单.shiFanYiZhanKai(消息)).toBe(true)

    const 坏消息 = { ...消息, id: 'm3', nei_rong: null as unknown as string }
    await expect(菜单.qingQiuWenBenFanYi(坏消息)).resolves.toBeNull()
    expect(菜单.shiFanYiChuCuo(坏消息)).toBe(true)
  })

  it('翻译异常只向玩家显示通用失败文案', async () => {
    const 菜单 = 造菜单(async () => {
      throw new Error('internal request detail')
    })
    const 消息 = {
      id: 'm2',
      nei_rong: '你好',
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      fa_song_zhe_lei_xing: 'jiaose' as const,
    }
    await 菜单.qingQiuWenBenFanYi(消息)
    expect(菜单.shiFanYiChuCuo(消息)).toBe(true)
    expect(菜单.shiFanYiZhong(消息)).toBe(false)
  })
})
