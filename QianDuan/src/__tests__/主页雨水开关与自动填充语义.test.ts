import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import 横条输入框 from '@/components/表单/横条输入框.vue'
import 长方框输入框 from '@/components/表单/长方框输入框.vue'
import { ZHU_YE_BEI_JING_YU_SHUI_JIAN, 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuFanYi } from '@/config/翻译表'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 本地产 = (件: string) => `hewolianba_${件}`

describe('主页背景雨水开关：默认开启、可关可开、状态唯一', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('未保存过时默认开启，关闭后写入本地存储', () => {
    const 仓库 = 使用用户设置仓库()
    expect(仓库.zhuYeBeiJingYuShui).toBe(true)
    仓库.qieHuanZhuYeBeiJingYuShui(false)
    expect(仓库.zhuYeBeiJingYuShui).toBe(false)
    expect(JSON.parse(localStorage.getItem(本地产(ZHU_YE_BEI_JING_YU_SHUI_JIAN)) as string)).toBe(false)
  })

  it('刷新后沿用上次选择，再次开启即恢复', () => {
    localStorage.setItem(本地产(ZHU_YE_BEI_JING_YU_SHUI_JIAN), 'false')
    setActivePinia(createPinia())
    const 仓库 = 使用用户设置仓库()
    expect(仓库.zhuYeBeiJingYuShui).toBe(false)
    仓库.qieHuanZhuYeBeiJingYuShui(true)
    expect(仓库.zhuYeBeiJingYuShui).toBe(true)
    expect(JSON.parse(localStorage.getItem(本地产(ZHU_YE_BEI_JING_YU_SHUI_JIAN)) as string)).toBe(true)
  })

  it('菜单开关是可切换的菜单项，文案取自翻译表', () => {
    const 菜单 = 读('components/全局菜单.vue')
    expect(huoQuFanYi('caidan', 'zhuYeBeiJingYuShui')).toBe('主页背景雨水')
    expect(菜单).toContain('role="menuitemcheckbox"')
    expect(菜单).toContain(':aria-checked="设置仓库.zhuYeBeiJingYuShui"')
    expect(菜单).toContain('@click="qieHuanZhuYeYuShui"')
    expect(菜单).toContain("huoQuFanYi('caidan', 'zhuYeBeiJingYuShui')")
    expect(菜单).toContain('设置仓库.qieHuanZhuYeBeiJingYuShui(!设置仓库.zhuYeBeiJingYuShui)')
  })

  it('开关热区不小于 44px，几何与配色全部走设计令牌', () => {
    const 菜单 = 读('components/全局菜单.vue')
    expect(菜单).toContain('.qita-caidan-xiangmu--kaiguan {\n  min-height: 44px;')
    expect(菜单).toContain('--qita-kaiguan-kuan: 44px')
    expect(菜单).toContain('background: var(--daohanglan-zhongbeijing)')
    expect(菜单).toContain('background: var(--zhuse)')
    expect(菜单).toContain('background: var(--wenben-zhuse)')
    expect(菜单).toContain('border-radius: var(--yuanjiao-zhong)')
    expect(菜单).toContain('var(--kaiguan-dong-hua-shi-chang)')
    expect(读('styles/设计令牌.css')).toContain('--kaiguan-dong-hua-shi-chang: 200ms;')
  })

  it('键盘焦点把开关与普通菜单项放在同一序列里', () => {
    const 菜单 = 读('components/全局菜单.vue')
    const 选择器 = 菜单.match(/querySelectorAll<HTMLElement>\('\[role="menuitem"\], \[role="menuitemcheckbox"\]'\)/g) ?? []
    expect(选择器).toHaveLength(2)
  })

  it('雨水由背景三维内部渲染，主页面只驱动开关不参与绘制', () => {
    const 根 = 读('根组件.vue')
    expect(根).toContain('设置仓库.zhuYeBeiJingYuShui')
    expect(根).toContain('getWeatherController')
    expect(根).toContain('rainParticles')
    expect(根).toContain('dayRainWeight')
    expect(根).toContain('nightRainWeight')
    expect(根).toContain('setIntensity')
    expect(根).toContain("transitionTo?.('clear')")
    expect(根).not.toContain('背景实验室')
    expect(读('components/全局菜单.vue')).not.toContain('__experience')
  })
})

describe('全站禁止浏览器自动填充：共享输入框默认关闭', () => {
  const 横条 = (属性: Record<string, unknown>) =>
    mount(横条输入框, { props: { 模型值: '', 标识: 'ce-shi', 标签: '测试', ...属性 } })
  const 长方框 = (属性: Record<string, unknown>) =>
    mount(长方框输入框, { props: { 模型值: '', 标识: 'ce-shi', ...属性 } })

  it('横条输入框默认 autocomplete=off', () => {
    expect(横条({}).get('input').attributes('autocomplete')).toBe('off')
    expect(横条({ 类型: 'text' }).get('input').attributes('autocomplete')).toBe('off')
  })

  it('横条输入框密码默认 new-password，显式凭据语义不被覆盖', () => {
    expect(横条({ 类型: 'password' }).get('input').attributes('autocomplete')).toBe('new-password')
    expect(横条({ 自动完成: 'username' }).get('input').attributes('autocomplete')).toBe('username')
    expect(横条({ 类型: 'password', 自动完成: 'current-password' }).get('input').attributes('autocomplete')).toBe(
      'current-password',
    )
  })

  it('长方框输入框默认 off，多行同样关闭，密码默认 new-password', () => {
    expect(长方框({}).get('input').attributes('autocomplete')).toBe('off')
    expect(长方框({ 多行: true }).get('textarea').attributes('autocomplete')).toBe('off')
    expect(长方框({ 类型: 'password' }).get('input').attributes('autocomplete')).toBe('new-password')
    expect(长方框({ 自动完成: 'one-time-code' }).get('input').attributes('autocomplete')).toBe('one-time-code')
  })

  it('搜索类输入框一律关闭自动填充', () => {
    const 好友 = 读('views/好友列表.vue')
    const 搜框 = 好友.match(/<input[\s\S]*?data-testid="hao-you-sou-suo"[\s\S]*?\/>/)
    expect(搜框).not.toBeNull()
    expect(搜框?.[0]).toContain('autocomplete="off"')
    expect(读('views/账号与安全.vue')).toContain(':占位文字="huoQuFanYi(\'sheZhi\', \'souSuoZhanWei\')"')
    expect(读('components/实时日志.vue')).toContain('<ChangFangShuRuKuang')
  })

  it('登录/注册/找回密码保留正确的账号密码语义', () => {
    const 登录 = 读('views/登录内容.vue')
    expect(登录).toContain('标识="denglu-shoujihao"')
    expect(登录).toContain('自动完成="username"')
    expect(登录).toContain('自动完成="current-password"')
    expect(登录).toContain('自动完成="new-password"')
    const 找回 = 读('views/找回密码.vue')
    expect(找回).toContain('自动完成="tel"')
    expect(找回).toContain('自动完成="one-time-code"')
    expect(找回).toContain('自动完成="new-password"')
  })

  it('改密页旧密码/新密码/验证码语义正确，搜索框不再被当成账号', () => {
    const 安全 = 读('views/账号与安全.vue')
    expect(安全).toContain('自动完成="current-password"')
    expect(安全.match(/自动完成="new-password"/g)).toHaveLength(2)
    expect(安全).toContain('自动完成="one-time-code"')
    expect(安全).toContain('标识="she-zhi-sou-suo"')
  })
})

describe('全站输入框自动填充语义静态门禁', () => {
  const 免填类型 = /^(checkbox|radio|file|range|color|button|submit|reset|hidden|image)$/

  function 全部Vue文件(目录: string): string[] {
    return readdirSync(目录, { withFileTypes: true }).flatMap((项) => {
      const 路径 = resolve(目录, 项.name)
      if (项.isDirectory()) return 项.name === '__tests__' ? [] : 全部Vue文件(路径)
      return 项.name.endsWith('.vue') ? [路径] : []
    })
  }

  it('所有文本类裸写 input 都带自动填充语义', () => {
    const 违规: string[] = []
    for (const 路径 of 全部Vue文件(源码根)) {
      const 源 = readFileSync(路径, 'utf8')
      for (const 匹配 of 源.matchAll(/<input\b[\s\S]*?\/>/g)) {
        const 标签 = 匹配[0]
        const 类型 = /\stype="([^"]+)"/.exec(标签)?.[1] ?? 'text'
        if (免填类型.test(类型)) continue
        if (!标签.includes('autocomplete')) 违规.push(`${路径.replace(源码根, '')}：${标签.slice(0, 80)}`)
      }
    }
    expect(违规).toEqual([])
  })
})
