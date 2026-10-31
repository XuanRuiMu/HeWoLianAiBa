import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 求几何算式 } from './主题令牌真源'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')

const 登录 = 读('views/登录内容.vue')
const 找回 = 读('views/找回密码.vue')
const 布局 = 读('layouts/认证布局.vue')
const 令牌源码 = 读('styles/设计令牌.css')

function 取样式块(源码: string, 名: string): string {
  const 匹配 = /<style[^>]*>([\s\S]*?)<\/style>/.exec(源码)
  expect(匹配, 名 + ' 缺少 style 块').not.toBeNull()
  return (匹配 as RegExpMatchArray)[1]
}

const 登录样式 = 取样式块(登录, '登录内容.vue')
const 找回样式 = 取样式块(找回, '找回密码.vue')
const 布局样式 = 取样式块(布局, '认证布局.vue')

function 取块(块: string, 选择器: string): string {
  const 归一 = 块.replace(/\r\n/g, '\n')
  const 裸 = 归一.indexOf(选择器)
  expect(裸, '缺少规则块 ' + 选择器).toBeGreaterThan(-1)
  const 行首 = 归一.indexOf('\n' + 选择器)
  const 起 = 行首 >= 0 ? 行首 : 裸
  const 余 = 归一.slice(起)
  return 余.slice(0, 余.indexOf('}') + 1)
}

function 取值(块: string, 属性: string): string | null {
  const 匹配 = new RegExp('(?:^|[;{\\s])' + 属性.replace(/-/g, '\\-') + ':\\s*([^;}]+)').exec(块)
  return 匹配 ? 匹配[1].trim().replace(/\s+/g, ' ') : null
}

function 匹配右括号(文本: string, 左: number): number {
  let 深度 = 0
  for (let i = 左; i < 文本.length; i++) {
    if (文本[i] === '{') 深度++
    else if (文本[i] === '}') {
      深度--
      if (深度 === 0) return i
    }
  }
  throw new Error('样式块花括号不配对')
}

function 媒体上下文(文本: string, 头子串: string): string {
  const 出: string[] = []
  const 正 = /@media([^{}]*)\{/g
  let 匹: RegExpExecArray | null
  while ((匹 = 正.exec(文本))) {
    if (!匹[1].includes(头子串)) continue
    const 内 = 匹.index + 匹[0].length
    出.push(文本.slice(内, 匹配右括号(文本, 内 - 1)))
  }
  expect(出.length, '未找到 @media 头含「' + 头子串 + '」的上下文').toBeGreaterThan(0)
  return 出.join('\n')
}

const 令牌根 = 取块(令牌源码, ':root {')
const 布局基础 = 取块(布局样式, '.yemian-buju {')
const 块们 = 声明块清单(令牌源码)
const 窄屏 = 媒体上下文(布局样式, '(max-width: 767px)')

const 内边距 = 求几何算式('var(--renzheng-ka-nei-bian-ju)', 块们)
const 边框 = 求几何算式('var(--renzheng-ka-bian-kuan)', 块们)
const 表单内距 = 求几何算式('var(--renzheng-shuru-you-nei-ju)', 块们)
const 轨道宽 = 求几何算式('var(--renzheng-gundong-huakuai-kuan)', 块们)
const 半轨道 = 轨道宽 / 2
const 装饰宽 = 求几何算式('var(--renzheng-gundong-shou-kuan)', 块们)
const 桌面内距 = 求几何算式('var(--renzheng-ka-nei-ju-heng)', 块们)
const 移动内距 = 求几何算式('var(--jiange-zhong)', 块们)

function 中心距内容右缘(内距: number): number {
  return (内距 - 内边距 - 表单内距) / 2
}

function 距输入框右缘(内距: number): number {
  return 中心距内容右缘(内距) + 表单内距
}

function 距内金线(内距: number): number {
  return 内距 - 内边距 - 中心距内容右缘(内距)
}

describe('滚动条定位跟随卡面横向内距单源令牌', () => {
  it('卡面横向内距只保留一个本地别名，移动端不再另写一份', () => {
    for (const [名, 块] of [
      ['登录', 登录样式],
      ['找回', 找回样式],
    ] as const) {
      const 卡 = 取块(块, '.biaodan-rongqi {')
      expect(取值(卡, '--ka-heng-nei-ju'), 名 + ' 缺本地内距别名').toBe(
        'var(--ka-heng-nei-ju-dangqian, var(--renzheng-ka-nei-ju-heng))',
      )
      expect(取值(卡, 'padding'), 名 + ' 卡面内距未改用别名').toBe(
        'var(--ka-duan-luo) var(--ka-heng-nei-ju)',
      )
    }
    expect(取块(登录样式, '.biaodan-neirong-qu {')).not.toContain('--ka-heng-nei-ju')
    expect(登录样式).not.toContain('--ka-heng-nei-ju: var(--jiange-zhong)')
  })

  it('移动断点只改本地令牌，不再直接覆写卡面或卡内横向内距', () => {
    expect(取值(布局基础, '--ka-heng-nei-ju-dangqian')).toBe('var(--renzheng-ka-nei-ju-heng)')
    expect(取值(取块(窄屏, '.yemian-buju.denglu-moshi,'), '--ka-heng-nei-ju-dangqian')).toBe(
      'var(--jiange-zhong)',
    )
    expect(窄屏).toContain('.yemian-buju.wangji-mima-moshi')
    expect(窄屏).not.toContain(':deep(.biaodan-rongqi)')
    expect(窄屏).not.toMatch(/\.biaodan-rongqi\s*\{[^}]*padding/)
    expect(窄屏).not.toMatch(/\.biaodan-neirong-qu\s*\{[^}]*--ka-heng-nei-ju/)
  })

  it('布局不在令牌文件外重声明全局令牌，响应式只落在本地别名上', () => {
    expect(布局样式).not.toMatch(/^\s*--renzheng-[a-z0-9-]+\s*:/m)
  })

  it('令牌链：内金线内缘由卡面边框、描边偏移与表单右内距共同推导', () => {
    expect(取值(令牌根, '--renzheng-ka-nei-ju-heng')).toBe('var(--renzheng-ka-pian-you-nei-ju)')
    expect(取值(令牌根, '--renzheng-shuru-you-nei-ju')).toBe('var(--jiange-4)')
    expect(取值(令牌根, '--renzheng-ka-bian-kuan')).toBe('1px')
    expect(取值(令牌根, '--renzheng-ka-nei-xian-pian-yi')).toBe('4px')
    expect(取值(令牌根, '--renzheng-ka-nei-bian-ju')).toBe(
      'calc(var(--renzheng-ka-bian-kuan) + var(--renzheng-ka-nei-xian-pian-yi))',
    )
    for (const 卡 of [取块(登录样式, '.biaodan-rongqi {'), 取块(找回样式, '.biaodan-rongqi {')]) {
      expect(取值(卡, 'border')).toBe('var(--renzheng-ka-bian-kuan) solid var(--ka-jin-xian)')
      expect(取值(卡, 'outline')).toBe('var(--renzheng-ka-bian-kuan) solid var(--ka-jin-xian)')
      expect(取值(卡, 'outline-offset')).toBe('calc(var(--renzheng-ka-nei-xian-pian-yi) * -1)')
    }
    const 登录表单 = 取块(登录样式, '.denglu-biaodan,')
    expect(取值(登录表单, 'padding-left')).toBe('var(--renzheng-shuru-you-nei-ju)')
    expect(取值(登录表单, 'padding-right')).toBe('var(--renzheng-shuru-you-nei-ju)')
    expect(取值(取块(登录样式, '.gundong-zhuangshi {'), '--renzheng-gundong-zhong-xin-ju')).toBe(
      'calc( (var(--ka-heng-nei-ju) - var(--renzheng-ka-nei-bian-ju) - var(--renzheng-shuru-you-nei-ju)) / 2 )',
    )
    expect(登录样式.match(/--renzheng-gundong-zhong-xin-ju\s*:/g)?.length).toBe(1)
  })
})

describe('手柄中心落在输入框右缘与内金线内缘中点', () => {
  it('装饰容器左缘贴住轨道左缘，宽度取卡右内距内的可用值，右缘正好停在卡边框内', () => {
    const 装饰 = 取块(登录样式, '.gundong-zhuangshi {')
    expect(取值(装饰, 'width')).toBe('var(--renzheng-gundong-chumo-kuan)')
    expect(取值(装饰, '--renzheng-gundong-chumo-kuan')).toContain('min(')
    expect(取值(装饰, 'right')).toBe(
      'calc( var(--renzheng-gundong-huakuai-kuan) / 2 - var(--renzheng-gundong-zhong-xin-ju) - var(--renzheng-gundong-chumo-kuan) )',
    )
    for (const 内距 of [桌面内距, 移动内距]) {
      const 中心 = 中心距内容右缘(内距)
      const 可用 = 内距 + 边框 - 中心 + 半轨道
      const 触宽 = Math.min(装饰宽, 可用)
      expect(触宽).toBe(内距 === 桌面内距 ? 21 : 15)
      expect(中心 + 触宽 - 半轨道).toBeCloseTo(内距 + 边框, 6)
    }
  })

  it('桌面与移动两种内距下，手柄左右余量严格相等且都包住 3px 轨道', () => {
    for (const 内距 of [桌面内距, 移动内距]) {
      const 左余 = 距输入框右缘(内距)
      const 右余 = 距内金线(内距)
      expect(左余).toBeCloseTo(右余, 6)
      expect(左余 - 半轨道).toBeGreaterThan(0)
      expect(右余 - 半轨道).toBeGreaterThan(0)
    }
    expect(距输入框右缘(桌面内距)).toBeCloseTo(13.5, 6)
    expect(距输入框右缘(移动内距)).toBeCloseTo(7.5, 6)
  })

  it('装饰容器整体留在卡面 border box 内，不越出卡边', () => {
    for (const 内距 of [桌面内距, 移动内距]) {
      const 中心 = 中心距内容右缘(内距)
      const 可用 = 内距 + 边框 - 中心 + 半轨道
      const 触宽 = Math.min(装饰宽, 可用)
      expect(中心 + 触宽 - 半轨道).toBeLessThanOrEqual(内距 + 边框)
      expect(中心 - 半轨道).toBeGreaterThan(-内距)
    }
  })

  it('装饰侧命中区只向右侧扩展，起点贴住 3px 轨道左缘，宽度取可用触宽', () => {
    const 命中 = 取块(登录样式, '.gundong-guidao::before,')
    expect(取值(命中, 'left')).toBe('0')
    expect(取值(命中, 'right')).toBeNull()
    expect(取值(命中, 'width')).toBe('var(--renzheng-gundong-chumo-kuan)')
    expect(取值(取块(登录样式, '.gundong-guidao {'), 'left')).toBe('0')
  })

  it('上下箭头命中盒高 24、宽取可用触宽，左缘贴轨道左缘，视觉箭头由 ::after 绘制', () => {
    const 箭头 = 取块(登录样式, '.gundong-jiantou {')
    expect(取值(箭头, 'left')).toBe('0')
    expect(取值(箭头, 'width')).toBe('var(--renzheng-gundong-chumo-kuan)')
    expect(取值(箭头, 'height')).toBe('var(--renzheng-gundong-shou-kuan)')
    expect(取值(箭头, 'border')).toBe('none')
    expect(登录样式).toContain('.gundong-jiantou::after')
    expect(登录样式).not.toContain('.gundong-jiantou::before')
    expect(登录样式).not.toMatch(/\.gundong-jiantou-(shang|xia)\s*\{[^}]*translateX/)
  })
})

describe('短视口滚动条紧凑模式与找回密码纵向可达', () => {
  it('紧凑模式隐藏箭头并把轨道上下留白压到 2px，手柄与轨道仍可算', () => {
    expect(登录).toContain(':class="{ \'jin-cou\': gundongJinCou }"')
    expect(登录样式).toContain('.gundong-zhuangshi.jin-cou .gundong-jiantou')
    expect(取块(登录样式, '.gundong-zhuangshi.jin-cou .gundong-jiantou {')).toContain(
      'display: none',
    )
    expect(取块(登录样式, '.gundong-zhuangshi.jin-cou .gundong-guidao {')).toContain(
      'top: var(--jiange-2)',
    )
    expect(登录).toContain('const JIN_COU_KE_JIAN_GAO = 96')
    expect(登录).toContain('const JIN_COU_LIU_BAI = 2')
    expect(登录).toContain('const GUI_DAO_ZUI_XIAO_GAO = 4')
    expect(登录).toContain('const HUA_KUAI_JIN_COU_ZUI_XIAO_GAO = 12')
    expect(登录).toContain('gundongJinCou.value = jinCou')
    expect(登录).toContain('const 装饰高 = zhuangShiYuanSu.clientHeight')
    expect(登录).toContain('const 滚动高 = gunDongQuYuanSu.clientHeight')
    expect(登录).toContain('shiYongGao - GUI_DAO_ZUI_XIAO_GAO')
  })

  it('找回密码不再禁止纵向滚动，卡片按内容自然增高由布局滚动兜底', () => {
    expect(取值(取块(布局样式, '.yemian-buju {'), 'overflow-y')).toBe('auto')
    expect(布局样式).not.toMatch(/\.yemian-buju\.wangji-mima-moshi\s*\{[^}]*overflow-y\s*:\s*hidden/)
    expect(取值(取块(找回样式, '.biaodan-rongqi {'), 'max-height')).toBeNull()
  })
})

describe('顶部扇形从 93deg 起算，条纹严格镜像对称', () => {
  const 相位 = (角度: number, 起始角: number) => ((角度 - 起始角) % 12 + 12) % 12
  const 实 = (起始角: number, 角度: number) => 相位(角度, 起始角) < 6

  it('两处卡片都消费扇形起始令牌，令牌为 93deg', () => {
    for (const [名, 块] of [
      ['登录', 登录样式],
      ['找回', 找回样式],
    ] as const) {
      expect(块, 名 + ' 扇形未消费起始令牌').toContain(
        'from var(--renzheng-shan-guang-qi-jiao) at 50% 130%',
      )
    }
    expect(取值(令牌根, '--renzheng-shan-guang-qi-jiao')).toBe('93deg')
  })

  it('镜像相位和为 6：左右对应角度的明暗一致', () => {
    for (const 角度 of [30, 60, 85, 89, 90, 95, 120, 150]) {
      expect(实(93, 角度), 角度 + 'deg 与镜像明暗不一致').toBe(实(93, 180 - 角度))
    }
  })

  it('旧的 90deg 起算确实左右反相，是扇形撕裂的根因', () => {
    expect(实(90, 85)).not.toBe(实(90, 95))
  })

  it('全仓不再有 conic 从 90deg 起算的残留', () => {
    const 收集: string[] = []
    const 遍历 = (目录: string) => {
      for (const 项 of readdirSync(目录, { withFileTypes: true })) {
        const 路径 = join(目录, 项.name)
        if (项.isDirectory()) {
          if (项.name === 'node_modules' || 项.name === 'dist') continue
          遍历(路径)
        } else if (/\.(vue|css)$/.test(项.name)) 收集.push(readFileSync(路径, 'utf8'))
      }
    }
    遍历(源码根)
    const 残留 = 收集.filter((源) => /repeating-conic-gradient\(\s*from\s+90deg/.test(源))
    expect(残留, '仍有扇形从 90deg 起算').toEqual([])
  })
})
