import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { 使用角色生成仓库 } from '@/stores/角色生成'
import { fanYi, huoQuFanYi } from '@/config/翻译表'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 生成仓库源码 = 读('stores/角色生成.ts')
const 聊天仓库源码 = 读('stores/聊天.ts')
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
    expect(生成仓库源码).toContain('setInterval(() => {\n      dengDaiYuXuHao.value += 1\n    }, DENG_DAI_ZHOU_QI_HAO_MIAO)')
    expect(生成仓库源码).not.toContain('步骤文案键')
    expect(生成仓库源码).not.toContain("huoQuFanYi('tianJiaWeiXin', dangQianWenAnJian")
  })

  it('确有开场白（首条为对象消息）时顶部显示「对方正在偷人...」，用户开口后消失', () => {
    const touRen = huoQuFanYi('tianJiaWeiXin', 'dengDaiTouRen')
    expect(touRen).toBe('对方正在偷人...')
    expect(聊天仓库源码).toContain("shouTiaoShiAI.value = xiaoXiLieBiao.value[0]?.fa_song_zhe_lei_xing === 'jiaose'")
    expect(菜单源码).toContain("huoQuFanYi('tianJiaWeiXin', 'dengDaiTouRen')")
  })

  it('无开场白的对象不再无条件显示「对方正在输入」（旧逻辑已根除）', () => {
    expect(菜单源码).toMatch(
      /聊天仓库\.shouTiaoShiAI \? shouCiJinRuWeiDu\.value : 聊天仓库\.zhengZaiShuRu/,
    )
  })
})
