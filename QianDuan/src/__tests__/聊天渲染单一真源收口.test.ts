import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')

const 聊天页源 = 读('views/聊天页面.vue')
const 好友页源 = 读('views/好友聊天.vue')
const 行源 = 读('components/聊天/消息行.vue')
const 面板源 = 读('components/聊天/聊天面板.vue')
const 图片气泡源 = 读('components/聊天/图片气泡.vue')
const 图文块源 = 读('components/聊天/图文块.vue')
const 骨架源 = 读('components/聊天/消息骨架.vue')
const 工具栏源 = 读('components/聊天/输入工具栏.vue')
const 面板更多源 = 读('components/聊天/更多面板.vue')

const 两页 = [
  { 名: 'AI聊天页', 源: 聊天页源 },
  { 名: '好友页', 源: 好友页源 },
]

function 列出Vue(目录 = 源码根): string[] {
  const 出: string[] = []
  for (const 项 of readdirSync(目录)) {
    const 全 = join(目录, 项)
    if (statSync(全).isDirectory()) {
      if (项 === 'node_modules' || 项 === '__tests__') continue
      出.push(...列出Vue(全))
    } else if (项.endsWith('.vue')) {
      出.push(relative(源码根, 全).replace(/\\/g, '/'))
    }
  }
  return 出.sort()
}

function 持有皮肤(特征: RegExp): string[] {
  return 列出Vue().filter((文件) => 特征.test(读(文件)))
}

function 取规则(源: string, 选择器: string): string {
  const 命中 = new RegExp(
    `${选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*\\}`,
  ).exec(源)
  return 命中 ? 命中[0] : ''
}

describe('聊天渲染单一真源收口：图片/骨架/撤回/输入区/面板底留白', () => {
  it('图片消息外壳只剩 图片气泡.vue 一份，两页零份且等比不裁', () => {
    expect(持有皮肤(/^\.tupian-xianshi\s*\{/m)).toEqual(['components/聊天/图片气泡.vue'])
    expect(持有皮肤(/^\.tupian-gujia\s*\{/m)).toEqual(['components/聊天/图片气泡.vue'])
    expect(持有皮肤(/^\.biaoqingbao-tu\s*\{/m)).toEqual(['components/聊天/图片气泡.vue'])
    const 图 = 取规则(图片气泡源, '.tupian-xianshi')
    expect(图).toContain('max-width: var(--tuwen-tu-zuidakuan)')
    expect(图).toContain('max-height: var(--tuwen-tu-zuida-gao)')
    expect(图).not.toContain('object-fit: cover')
    expect(取规则(图片气泡源, '.tupian-qipao')).toContain('cursor: zoom-in')
    for (const { 源 } of 两页) {
      expect(源).toContain('<TuPianQiPao')
      expect(源).not.toContain('class="tupian-qipao"')
      expect(源).not.toContain('.tupian-xianshi {')
      expect(源).not.toContain('.tupian-gujia {')
    }
  })

  it('图文混排块只剩 图文块.vue 一份，两页零份', () => {
    expect(持有皮肤(/^\.tuwen-kuai-tu\s*\{/m)).toEqual(['components/聊天/图文块.vue'])
    expect(持有皮肤(/^\.tuwen-kuai--tu\s*\{/m)).toEqual(['components/聊天/图文块.vue'])
    expect(持有皮肤(/^\.tuwen-kuai-tu--biaoqingbao\s*\{/m)).toEqual(['components/聊天/图文块.vue'])
    expect(取规则(图文块源, '.tuwen-kuai-tu')).toContain('cursor: zoom-in')
    for (const { 源 } of 两页) {
      expect(源).toContain('<TuWenKuai')
      expect(源).not.toContain('.tuwen-kuai-tu {')
      expect(源).not.toContain('.tuwen-kuai--tu')
    }
  })

  it('加载骨架只剩 消息骨架.vue 一份皮肤，两页只接线', () => {
    expect(持有皮肤(/^\.gujia-qipao\s*\{/m)).toEqual(['components/聊天/消息骨架.vue'])
    expect(持有皮肤(/^\.gujia-wei\s*\{/m)).toEqual(['components/聊天/消息骨架.vue'])
    expect(取规则(骨架源, '.gujia-qipao')).toContain('height: 40px')
    expect(取规则(骨架源, '.gujia-qipao')).toContain('border-radius: var(--qipao-yuanjiao)')
    expect(取规则(骨架源, '.gujia-qipao')).toContain('background: var(--shijian-biaoqian-beijing)')
    for (const { 源 } of 两页) {
      expect(源).toContain('<XiaoXiGuJia')
      expect(源).not.toContain('.gujia-qipao')
      expect(源).not.toContain('.gujia-qiPao')
      expect(源).not.toContain('.gujia-wei')
      expect(源).not.toContain('.gujia-gengzao')
      expect(源).not.toContain('.gujia-touxiang')
    }
  })

  it('撤回提示只剩 消息行.vue 一份，两页改走 che-hui-wen-ben 属性', () => {
    expect(持有皮肤(/^\.chehui-tishi\s*\{/m)).toEqual(['components/聊天/消息行.vue'])
    expect(行源).toContain('cheHuiWenBen')
    expect(行源).toContain('class="chehui-tishi"')
    for (const { 源 } of 两页) {
      expect(源).toContain(':che-hui-wen-ben=')
      expect(源).not.toContain('class="chehui-tishi"')
      expect(源).not.toContain('.chehui-tishi {')
    }
  })

  it('输入区与更多面板只剩组件一份，两页删除自造皮肤', () => {
    expect(持有皮肤(/^\.shuru-rongqi\s*\{/m)).toEqual(['components/聊天/输入工具栏.vue'])
    expect(持有皮肤(/^\.yuyin-anniu\s*,/m)).toEqual(['components/聊天/输入工具栏.vue'])
    expect(持有皮肤(/^\.gengduo-mianban\s*\{/m)).toEqual(['components/聊天/更多面板.vue'])
    expect(持有皮肤(/^\.gengduo-rukou\s*\{/m)).toEqual(['components/聊天/更多面板.vue'])
    for (const { 源 } of 两页) {
      expect(源).toContain('<ShuRuGongJuLan')
      expect(源).toContain('<GengDuoMianBan')
      expect(源).not.toContain('.shuru-rongqi {')
      expect(源).not.toContain('.yuyin-anniu')
      expect(源).not.toContain('.meiti-rukou')
      expect(源).not.toContain('.gengduo-mianban {')
      expect(源).not.toContain('.gengduo-rukou')
      expect(源).not.toContain('.fasong-anniu {')
    }
  })

  it('消息区底部留白由聊天面板 gun-dong 一档定义，页面不再压 padding-bottom', () => {
    expect(面板源).toContain('.liao-tian-mian-ban.gun-dong')
    expect(面板源).toContain('padding-bottom: 0')
    for (const { 源 } of 两页) {
      expect(源).toContain(':shi-gun-dong="true"')
      expect(取规则(源, '.xiaoxi-quyu')).not.toContain('padding-bottom: 0')
    }
  })
})
