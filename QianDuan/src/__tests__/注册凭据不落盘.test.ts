import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { nextTick } from 'vue'
import 登录内容 from '@/views/登录内容.vue'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/翻译表'

const 源码根 = resolve(__dirname, '..')

function 收集源文件(): string[] {
  const 清单: string[] = []
  const 走 = (目录: string): void => {
    for (const 项 of readdirSync(目录, { withFileTypes: true })) {
      const 全路径 = resolve(目录, 项.name)
      if (项.isDirectory()) {
        if (项.name === '__tests__') continue
        走(全路径)
      } else if (/\.(vue|ts|tsx)$/.test(项.name) && !项.name.endsWith('.d.ts')) {
        清单.push(全路径)
      }
    }
  }
  走(源码根)
  return 清单
}

describe('密码永不落盘（全仓不变量）', () => {
  it('src 全仓不存在把密码标识符写进 localStorage/sessionStorage 的路径', () => {
    const 违规: string[] = []
    for (const 文件 of 收集源文件()) {
      const 行们 = readFileSync(文件, 'utf8').split('\n')
      for (let 序 = 0; 序 < 行们.length; 序++) {
        if (!/(localStorage|sessionStorage)\.setItem\(/.test(行们[序])) continue
        const 语句 = 行们.slice(序, 序 + 3).join('\n')
        if (/miMa|mi_ma|password|passwd/i.test(语句)) 违规.push(`${resolve(文件)}:${序 + 1}`)
      }
    }
    expect(违规, '密码标识符不得出现在存储写入语句中').toEqual([])
  })

  it('注册临时凭据的旧存储键已彻底移除', () => {
    const 登录源码 = readFileSync(resolve(源码根, 'views/登录内容.vue'), 'utf8')
    expect(登录源码).not.toContain('zhuCeDengLuLinShi')
    expect(登录源码).not.toContain('localStorage.setItem')
  })
})

describe('注册成功后凭据只在内存流转', () => {
  const 手机号 = '16600001234'
  const 密码 = 'CeShiMiMa12345'
  const 验证码 = '123456'
  let 包: VueWrapper | null = null

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    包?.unmount()
    包 = null
  })

  async function 挂载并走到注册成功(): Promise<void> {
    const 路由: Router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/login', name: 'dengLu', component: { template: '<div />' } },
        { path: '/forgot-password', name: 'wangJiMiMa', component: { template: '<div />' } },
      ],
    })
    await 路由.push('/login')
    await 路由.isReady()
    const pinia = createPinia()
    setActivePinia(pinia)
    const 用户仓库 = 使用用户仓库()
    const 注册间谍 = vi.spyOn(用户仓库, 'zhiXingZhuCe').mockResolvedValue(undefined)
    包 = mount(登录内容, { global: { plugins: [pinia, 路由] } })
    const 页签们 = (包 as VueWrapper).findAll('button')
    const 切注册 = 页签们.find((钮) => 钮.text() === huoQuFanYi('renZheng', 'zhuCe'))
    expect(切注册, '找不到切到注册的页签按钮').toBeTruthy()
    await (切注册 as DOMWrapper<Element>).trigger('click')
    await nextTick()
    await (包 as VueWrapper).get('#zhuce-shoujihao').setValue(手机号)
    await (包 as VueWrapper).get('#zhuce-yanzhengma').setValue(验证码)
    await (包 as VueWrapper).get('#zhuce-yonghuming').setValue('测试玩家')
    await (包 as VueWrapper).get('#zhuce-mima').setValue(密码)
    await (包 as VueWrapper).get('#zhuce-chushengriqi').setValue('2000')
    await (包 as VueWrapper).get('#zhuce-chushengriqi-yue').setValue('01')
    await (包 as VueWrapper).get('#zhuce-chushengriqi-ri').setValue('01')
    const 表单 = (包 as VueWrapper)
      .findAll('form')
      .find((单) => 单.find('#zhuce-shoujihao').exists())
    expect(表单, '注册表单未渲染').toBeTruthy()
    const 注册表单 = 表单 as DOMWrapper<Element>
    await 注册表单.find('input[type="checkbox"]').setValue(true)
    const 提交钮 = 注册表单.find('button[type="submit"]')
    expect(提交钮.attributes('disabled'), '全部字段合法后注册按钮应可点击').toBeUndefined()
    await 注册表单.trigger('submit')
    await flushPromises()
    await nextTick()
    expect(注册间谍).toHaveBeenCalledTimes(1)
    expect(注册间谍).toHaveBeenCalledWith('+86' + 手机号, 验证码, '测试玩家', 密码, true, '2000-01-01')
  }

  it('注册成功后两个存储区均为空，不出现任何密码字段', async () => {
    await 挂载并走到注册成功()
    expect(localStorage.getItem('zhuCeDengLuLinShi')).toBeNull()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    for (const 存储区 of [localStorage, sessionStorage]) {
      for (let 序 = 0; 序 < 存储区.length; 序++) {
        const 键 = 存储区.key(序) as string
        expect(键).not.toMatch(/miMa|password/i)
        expect(String(存储区.getItem(键))).not.toContain(密码)
      }
    }
  })

  it('注册成功回到登录框只回填手机号，密码留空由用户重输', async () => {
    await 挂载并走到注册成功()
    await nextTick()
    expect((包 as VueWrapper).get('#denglu-shoujihao').element.value).toBe(手机号)
    expect((包 as VueWrapper).get('#denglu-mima').element.value).toBe('')
  })
})
