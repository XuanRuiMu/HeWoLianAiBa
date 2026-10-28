import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { 使用角色生成仓库 } from '@/stores/角色生成'
import { fanYi, huoQuFanYi } from '@/config/翻译表'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 生成仓库源码 = 读('stores/角色生成.ts')
const 菜单源码 = 读('components/全局菜单.vue')

function 等待语列表(): string[] {
  const zhi = (fanYi as Record<string, unknown>).tianJiaWeiXin
  const lieBiao = (zhi as Record<string, unknown>).dengDaiYuLieBiao
  return Array.isArray(lieBiao) ? (lieBiao as string[]) : []
}

describe('FP-19 对象加载等待语与偷人提示', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('等待语按用户要求恰好 50 条，全部以「...」结尾', () => {
    const lieBiao = 等待语列表()
    expect(lieBiao).toHaveLength(50)
    for (const tiao of lieBiao) {
      expect(tiao.endsWith('...')).toBe(true)
      expect(tiao).not.toContain('……')
    }
  })

  it('给定四条原文原样在列，玄锐暮帅照梗在列', () => {
    const lieBiao = 等待语列表()
    expect(lieBiao).toContain('正在打开手机...')
    expect(lieBiao).toContain('手机卡了，等它缓会...')
    expect(lieBiao).toContain('个人名片错给成收款码了...')
    expect(lieBiao).toContain('正在查看玄锐暮的帅照...')
  })

  it('等待语按固定 5 秒循环，不再绑定步骤进度', () => {
    expect(生成仓库源码).toContain('DENG_DAI_ZHOU_QI_HAO_MIAO = 5000')
    expect(生成仓库源码).toMatch(
      /setInterval\(\(\) => \{\s*dengDaiYuXuHao\.value \+= 1\s*\}, DENG_DAI_ZHOU_QI_HAO_MIAO\)/,
    )
  })

  it('偷人提示只存在于创建对象的载入页词条，聊天页输入提示恒为「对方正在输入...」', () => {
    const touRen = huoQuFanYi('tianJiaWeiXin', 'dengDaiTouRen')
    expect(touRen).toBe('对方正在偷人...')
    expect(huoQuFanYi('liaoTian', 'duiFangZhengZaiShuRu')).toBe('对方正在输入...')
    expect(菜单源码).not.toContain("huoQuFanYi('tianJiaWeiXin', 'dengDaiTouRen')")
    expect(菜单源码).toContain('聊天仓库.zhengZaiShuRu')
  })

  it('聊天页输入提示只由 zhengZaiShuRu 驱动，不再有首条对象消息分支', () => {
    expect(菜单源码).toMatch(
      /shiLiaoTianYe\.value\s*&&\s*!!聊天仓库\.jiaoSeXinXi\s*&&\s*聊天仓库\.zhengZaiShuRu/,
    )
  })
})
