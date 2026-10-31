import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 全局 = 读('styles/全局.css')

const 自带边框类 = [
  '.anniu-fu-zhu',
  '.anniu-zhuyao',
  '.anniu-que-ren',
  '.xingbie-kapian',
  '.mbti-kaPian',
  '.qi-pao-xuan-xiang',
  '.bei-jing-ka--shang-chuan',
  '.bei-jing-ci-yao',
  '.jiu-di-bian-ji-sui-shi',
  '.jiu-di-bian-ji-se-kuai',
  '.jiu-di-bian-ji-an-niu',
  '.jiu-di-bian-ji-zi-ding-yi-se',
  '.qi-pao-shang-chuan',
  '.suofang-anniu',
]

describe('FP-05 自带边框元素焦点态同位替换', () => {
  const 规则头 = 全局.slice(全局.indexOf(':where(\n  .anniu-fu-zhu,'))
  const 规则体 = 规则头.slice(规则头.indexOf('{') + 1, 规则头.indexOf('}', 规则头.indexOf('{')))

  it('所有自带边框可聚焦类都在同位替换清单里', () => {
    for (const 类 of 自带边框类) {
      expect(规则头, 类).toContain(类.slice(1))
    }
  })

  it('替换语义：撤 outline、边框色与外圈阴影都用焦点令牌', () => {
    expect(规则体).toContain('outline: none;')
    expect(规则体).toContain('border-color: var(--jujiao-huan-yanse) !important;')
    expect(规则体).toContain('box-shadow: 0 0 0 var(--jujiao-huan-kuan-du) var(--jujiao-huan-yanse);')
  })

  it('全局默认焦点环保留给其余元素（输入框/菜单等不变）', () => {
    expect(全局).toContain(':where(:focus-visible) {')
    expect(全局).toContain('outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);')
  })

  it('账号页组件内不再有与全局重复的同类焦点规则', () => {
    const 账号页 = 读('views/账号与安全.vue')
    expect(账号页).not.toContain('.anniu-fu-zhu:focus-visible')
    expect(账号页).not.toContain('.xingbie-kapian:focus-visible')
  })
})
