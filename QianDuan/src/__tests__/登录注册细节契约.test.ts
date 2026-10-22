import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')

describe('登录/注册细节契约', () => {
  const 登录 = 读('views/登录内容.vue')

  it('自动登录与记住账号/密码联动，未勾选时自动取消并禁用', () => {
    expect(登录).toContain('const 可自动登录 = computed(() => jiZhuZhangHao.value && jiZhuMiMa.value)')
    expect(登录).toContain(':disabled="!可自动登录"')
    expect(登录).toContain('watch(可自动登录, (keYong) => {')
    expect(登录).toContain('if (!keYong) ziDongDengLu.value = false')
  })

  it('自动登录复选框不再使用虚线，和记住密码同一套实线外观', () => {
    expect(登录).not.toContain('border-style: dashed')
  })

  it('用户协议与隐私政策整行居中', () => {
    const 协议块 = 登录.slice(登录.indexOf('.xieyi-gouxuan'), 登录.indexOf('.xieyi-fuxuan'))
    expect(协议块).toContain('justify-content: center')
    expect(协议块).toContain('align-items: center')
    expect(登录).toContain('text-align: center;')
  })

  it('出生日期三段宽度按字段字号派生，不再使用会被裁切的旧基准', () => {
    const 令牌 = 读('styles/设计令牌.css')
    expect(令牌).toContain('--rili-nian-kuan: calc(var(--shuru-kuang-zihao) * 2.6)')
    expect(令牌).toContain('--rili-erwei-kuan: calc(var(--shuru-kuang-zihao) * 2.2)')
    expect(令牌).not.toContain('--rili-nian-kuan: calc(var(--ziti-da) * 2')
    expect(令牌).not.toContain('--rili-erwei-kuan: calc(var(--ziti-da) +')
  })
})
