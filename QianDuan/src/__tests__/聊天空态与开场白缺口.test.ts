import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { huoQuFanYi } from '@/config/翻译表'

const 页源 = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')

describe('没有开场白时的聊天页空态', () => {
  it('零消息时渲染共享空态组件，而不是纯白板', () => {
    expect(页源).toContain('<KongTai')
    expect(页源).toMatch(/xiaoXiZongShu === 0/)
  })

  it('空态只在加载完成且加载成功后出现，不抢加载骨架和失败页的位', () => {
    const kongTai = 页源.slice(页源.indexOf('<KongTai'), 页源.indexOf('<KongTai') + 400)
    expect(kongTai).toContain('!聊天仓库.shouPingJiaZaiZhong')
    expect(kongTai).toContain('!聊天仓库.jiaZaiShiBai')
  })

  it('空态复用共享组件，不是另写一套', () => {
    expect(页源).toContain("import KongTai from '@/components/空态.vue'")
  })

  it('文案走翻译表，标题里带角色名字占位', () => {
    expect(页源).toContain("huoQuFanYi('liaoTian', 'haiMeiKaiKou')")
    expect(页源).toContain("huoQuFanYi('liaoTian', 'haiMeiKaiKouTiShi')")
    expect(huoQuFanYi('liaoTian', 'haiMeiKaiKou')).toContain('{mingZi}')
    expect(huoQuFanYi('liaoTian', 'haiMeiKaiKouTiShi').trim().length).toBeGreaterThan(0)
  })

  it('角色名取不到时退回通用称呼，不显示 undefined', () => {
    expect(页源).toContain("huoQuFanYi('liaoTian', 'duiFang')")
  })
})
