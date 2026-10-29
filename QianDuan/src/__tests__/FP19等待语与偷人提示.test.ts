import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fanYi, huoQuFanYi } from '@/config/翻译表'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 生成仓库源码 = 读('stores/角色生成.ts')
const 控制器源码 = 读('composables/use进入聊天加载.ts')
const 菜单源码 = 读('components/全局菜单.vue')

function 等待语列表(场景: 'puTong' | 'paiWei' | 'huiYi'): string[] {
  const 分类 = (fanYi as Record<string, unknown>).zaiRuLiaoTian as Record<string, unknown>
  const 分组 = 分类.quWeiYu as Record<string, unknown>
  const 列表 = 分组[场景]
  return Array.isArray(列表) ? (列表 as string[]) : []
}

function 收集源文件(目录: string): string[] {
  const 结果: string[] = []
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    const 路径 = resolve(目录, 项.name)
    if (项.isDirectory()) 结果.push(...收集源文件(路径))
    else if (/\.(vue|ts)$/.test(项.name)) 结果.push(路径)
  }
  return 结果
}

describe('FP-19 对象加载等待语与偷人提示', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('普通等待语按用户要求恰好 50 条，全部以「...」结尾', () => {
    const 列表 = 等待语列表('puTong')
    expect(列表).toHaveLength(50)
    for (const 条 of 列表) {
      expect(条.endsWith('...')).toBe(true)
      expect(条).not.toContain('……')
    }
  })

  it('给定四条原文原样在列，玄锐暮帅照梗在列', () => {
    const 列表 = 等待语列表('puTong')
    expect(列表).toContain('正在打开手机...')
    expect(列表).toContain('手机卡了，等它缓会...')
    expect(列表).toContain('个人名片错给成收款码了...')
    expect(列表).toContain('正在查看玄锐暮的帅照...')
  })

  it('等待语由统一控制器按 3 秒循环，最短展示 1 秒，生成仓库不再持有定时器', () => {
    expect(控制器源码).toContain('HUAN_CI_ZHOU_QI_HAO_MIAO = 3000')
    expect(控制器源码).toContain('ZUI_DUAN_ZHAN_SHI_HAO_MIAO = 1000')
    expect(控制器源码).toMatch(
      /setInterval\(\(\) => \{\s*趣味语序\.value \+= 1\s*\}, 配置\.换词毫秒 \?\? HUAN_CI_ZHOU_QI_HAO_MIAO\)/,
    )
    expect(生成仓库源码).not.toContain('setInterval')
    expect(生成仓库源码).not.toContain('dengDaiYuLieBiao')
    expect(生成仓库源码).not.toContain('dangQianWenAn')
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

describe('FP-19 旧加载文案与旧键清理', () => {
  it('旧的添加微信加载文案已删除', () => {
    const 分类 = (fanYi as Record<string, unknown>).tianJiaWeiXin as Record<string, unknown>
    for (const 旧键 of [
      'dengDaiYuLieBiao',
      'jinDuBiaoQian',
      'fanHui',
      'zhengZaiSouSuo',
      'zhengZaiFaSongHaoYouQingQiu',
      'dengDaiDuiFangYanZheng',
      'yanZhengTongGuo',
      'kaiShiLiaoTian',
    ]) {
      expect(分类).not.toHaveProperty(旧键)
    }
    expect(分类).toHaveProperty('dengDaiTouRen')
    expect(分类).toHaveProperty('shengChengShiBai')
  })

  it('源码不再引用旧加载键', () => {
    const 文件 = [
      ...收集源文件(resolve(源码根, 'components')),
      ...收集源文件(resolve(源码根, 'views')),
      ...收集源文件(resolve(源码根, 'stores')),
      ...收集源文件(resolve(源码根, 'composables')),
    ]
    const 违规 = 文件
      .map((路径) => ({ 路径, 源: readFileSync(路径, 'utf8') }))
      .filter(({ 源 }) => /dengDaiYuLieBiao|dengDaiYuXuHao/.test(源))
      .map(({ 路径 }) => 路径)
    expect(违规).toEqual([])
  })
})
