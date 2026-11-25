import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 记住密码键, 自动登录键 } from '@/constants/认证键'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 本地产 = (件: string) => `hewolianba_${件}`

describe('认证选项联动：同事务勾选与级联取消', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('勾选自动登录时，记住账号与记住密码同事务变true', () => {
    const 仓库 = 使用认证表单仓库()
    仓库.gengXinZiDongDengLu(true)
    expect(仓库.ziDongDengLu).toBe(true)
    expect(仓库.jiZhuZhangHao).toBe(true)
    expect(仓库.jiZhuMiMa).toBe(true)
  })

  it('取消自动登录不强制取消记住账号与记住密码', () => {
    const 仓库 = 使用认证表单仓库()
    仓库.gengXinZiDongDengLu(true)
    仓库.gengXinZiDongDengLu(false)
    expect(仓库.ziDongDengLu).toBe(false)
    expect(仓库.jiZhuZhangHao).toBe(true)
    expect(仓库.jiZhuMiMa).toBe(true)
  })

  it('勾选记住密码时自动勾选记住账号，取消记住密码级联取消自动登录', () => {
    const 仓库 = 使用认证表单仓库()
    仓库.gengXinJiZhuMiMa(true)
    expect(仓库.jiZhuZhangHao).toBe(true)
    expect(仓库.jiZhuMiMa).toBe(true)
    仓库.gengXinZiDongDengLu(true)
    仓库.gengXinJiZhuMiMa(false)
    expect(仓库.jiZhuMiMa).toBe(false)
    expect(仓库.ziDongDengLu).toBe(false)
    expect(仓库.jiZhuZhangHao).toBe(true)
  })

  it('取消记住账号时级联取消记住密码与自动登录', () => {
    const 仓库 = 使用认证表单仓库()
    仓库.gengXinZiDongDengLu(true)
    仓库.gengXinJiZhuZhangHao(false)
    expect(仓库.jiZhuZhangHao).toBe(false)
    expect(仓库.jiZhuMiMa).toBe(false)
    expect(仓库.ziDongDengLu).toBe(false)
  })

  it('旧存储存在不一致组合时归一加载，自动登录仍可直接勾选', () => {
    localStorage.setItem(本地产(记住密码键), 'true')
    localStorage.setItem(本地产(自动登录键), 'true')
    setActivePinia(createPinia())
    const 仓库 = 使用认证表单仓库()
    expect(仓库.jiZhuZhangHao).toBe(false)
    expect(仓库.jiZhuMiMa).toBe(false)
    expect(仓库.ziDongDengLu).toBe(false)
    仓库.gengXinZiDongDengLu(true)
    expect(仓库.ziDongDengLu).toBe(true)
    expect(仓库.jiZhuZhangHao).toBe(true)
    expect(仓库.jiZhuMiMa).toBe(true)
  })
})

describe('认证选项区布局契约', () => {
  const 登录 = 读('views/登录内容.vue')

  it('四个选项分两行三段均分落位，行内间距由等分栅格决定', () => {
    const 行块 = 登录.slice(登录.indexOf('.ji-zhu-hang-1,'), 登录.indexOf('.ji-zhu-hang-1 .ji-zhu-xuan-ze'))
    expect(行块).toContain('display: grid')
    expect(行块).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))')
    expect(行块).toContain('justify-items: center')
    expect(行块).not.toContain('space-between')
    expect(行块).not.toContain('gap: var(--jiange-zhong)')
    const 组块 = 登录.slice(登录.indexOf('.ji-zhu-xuan-xiang {'), 登录.indexOf('.ji-zhu-hang-1,'))
    expect(组块).not.toContain('gap: var(--jiange-2)')
    expect(组块).not.toContain('align-items')
    expect(登录).not.toContain('.ji-zhu-hang-1::before')
    expect(登录).not.toContain('.ji-zhu-hang-2::after')
  })

  it('自动登录复选框无禁用态，可直接点击', () => {
    expect(登录).not.toContain(':disabled="!可自动登录"')
    expect(登录).not.toContain('weiJiHuo')
    const 选项块 = 登录.slice(登录.indexOf('.ji-zhu-xuan-ze {'), 登录.indexOf('.ji-zhu-fu-xuan'))
    expect(选项块).not.toContain('not-allowed')
  })
})

describe('退出登录离场溢出修复', () => {
  it('认证布局竖向滚动容器显式禁止横向滚动', () => {
    const 布局 = 读('layouts/认证布局.vue')
    const 容器块 = 布局.slice(布局.indexOf('.yemian-buju {'), 布局.indexOf('.yemian-buju.denglu-moshi'))
    expect(容器块).toContain('overflow-y: auto')
    expect(容器块).toContain('overflow-x: hidden')
    expect(容器块).toContain('overflow-x: clip')
  })

  it('退出动画的右滑位移保留在主页，由布局容器裁剪不产生横向滚动条', () => {
    const 主页 = 读('views/主页内容.vue')
    expect(主页).toContain("transform: 'translateX(60px)'")
  })
})

describe('登录卡闭合动画无透明白条', () => {
  const 登录 = 读('views/登录内容.vue')

  it('卷轴杆DOM、样式与定格动画全部移除', () => {
    expect(登录).not.toContain('juanzhou-gan')
    expect(登录).not.toContain('juan-zhou-dingge-gan')
  })

  it('收拢与飞行动画保留，闭合仍呈现胶囊收束', () => {
    expect(登录).toContain('juan-zhou-dingge-shousuo')
    expect(登录).toContain('定格飞向用户位')
    expect(登录).toContain('记动画')
  })
})
