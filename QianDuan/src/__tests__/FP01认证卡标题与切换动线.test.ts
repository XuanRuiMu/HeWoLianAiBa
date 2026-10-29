import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')

const 登录 = 读('views/登录内容.vue').replace(/\r\n/g, '\n')
const 翻译表 = 读('config/翻译表.ts')
const 卡片样式 = 读('styles/认证卡片.css').replace(/\r\n/g, '\n')
const 令牌样式 = 读('styles/设计令牌.css')

const 登录样式 = (() => {
  const 匹配 = /<style[^>]*>([\s\S]*?)<\/style>/.exec(登录)
  expect(匹配, '登录内容.vue 缺少 style 块').not.toBeNull()
  return (匹配 as RegExpExecArray)[1].replace(/\r\n/g, '\n')
})()

function 取块(块: string, 选择器: string): string {
  const 起 = 块.indexOf(选择器)
  expect(起, '缺少规则块 ' + 选择器).toBeGreaterThan(-1)
  return 块.slice(起, 块.indexOf('}', 起) + 1)
}

function 取值(块: string, 属性: string): string | null {
  const 匹配 = new RegExp('(?:^|[;{\\s])' + 属性.replace(/-/g, '\\-') + ':\\s*([^;}]+)').exec(块)
  return 匹配 ? 匹配[1].trim() : null
}

function 亮度(色: string): number {
  const 数值 = parseInt(色.slice(1), 16)
  const 通道 = [(数值 >> 16) & 255, (数值 >> 8) & 255, 数值 & 255].map((值) => {
    const 比例 = 值 / 255
    return 比例 <= 0.03928 ? 比例 / 12.92 : ((比例 + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * 通道[0] + 0.7152 * 通道[1] + 0.0722 * 通道[2]
}

function 对比(甲: string, 乙: string): number {
  const 一 = 亮度(甲)
  const 二 = 亮度(乙)
  return (Math.max(一, 二) + 0.05) / (Math.min(一, 二) + 0.05)
}

const 认证面 = [...令牌样式.matchAll(/--renzheng-mian-se:\s*(#[0-9a-f]{6})/gi)].map((m) =>
  m[1].toLowerCase(),
)
const 深卡面 = 认证面.reduce((甲, 乙) => (亮度(甲) <= 亮度(乙) ? 甲 : 乙))
const 浅卡面 = 认证面.reduce((甲, 乙) => (亮度(甲) >= 亮度(乙) ? 甲 : 乙))

describe('FP-01 切换动画全程浮动标签不裁切', () => {
  it('浮动标签的上浮余量改由表单永久 padding-top 提供，动画全程在剪裁盒内部', () => {
    const 表单块 = 取块(登录样式, '.denglu-biaodan,\n.zhuce-biaodan {')
    expect(取值(表单块, 'padding-top')).toBe('calc(var(--biaoqian-qin-ru) + var(--jiange-2))')
    expect(取值(表单块, 'padding-left')).toBe('var(--renzheng-shuru-you-nei-ju)')
    expect(取值(表单块, 'padding-right')).toBe('var(--renzheng-shuru-you-nei-ju)')
    expect(取值(表单块, 'overflow')).toBe('hidden')
  })

  it('滚动容器不再自带头部余量，只在自身顶部保留原视觉对位负外距', () => {
    const 容器块 = 取块(登录样式, '.biaodan-gundong {')
    expect(取值(容器块, 'padding-top')).toBeNull()
    expect(取值(容器块, 'margin-top')).toBe('calc(var(--biaoqian-qin-ru) * -1 + var(--jiange-2) * -1)')
  })

  it('浮起标签的上浮量仍是 --biaoqian-qin-ru，严格落在表单余量之内', () => {
    const 浮起块 = 取块(卡片样式, '.shuru-zu.shangFu .fudong-biaoqian,')
    expect(取值(浮起块, 'top')).toBe('calc(var(--biaoqian-qin-ru) * -1)')
    expect(取值(浮起块, 'font-size')).toBe('11px')
  })

  it('动画结束后的 overflow 恢复机制整体删除，剪裁无阶段差异', () => {
    expect(登录).not.toContain('qiehuan-wanding')
    expect(登录).not.toContain('qieHuanWanDing')
    expect(登录样式).not.toContain('qiehuan-wanding')
  })
})

describe('FP-01 切到注册不再带出登录手机号', () => {
  it('登录与注册手机号之间的复制预填链路删除', () => {
    expect(登录).not.toContain('zhuCeShouJiHao.value = dengLuShouJiHao.value')
    expect(登录).not.toContain('dengLuShouJiHao.value = zhuCeShouJiHao.value')
  })

  it('记住账号体验保留：仍由认证表单仓库回填登录框', () => {
    expect(登录).toContain('bd.jiaZaiJiZhuSheZhi()')
    expect(登录).toContain('dengLuShouJiHao.value = bd.dengLuShouJiHao')
  })
})

describe('FP-01 大标题楷体与两行副标题', () => {
  it('大标题改用楷体族并保留项目衬线回退', () => {
    const 标题块 = 取块(登录样式, '.biaodan-biaoti {')
    expect(取值(标题块, 'font-family')).toBe(
      "'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', 'Noto Serif SC', 'Source Han Serif SC', 'STSong', SimSun, serif",
    )
    expect(取值(标题块, 'font-size')).toBe('var(--zihao-biaoti)')
  })

  it('副标题拆两行且整体水平居中', () => {
    expect(取值(取块(登录样式, '.fu-biao-hang {'), 'display')).toBe('block')
    expect(取值(取块(登录样式, '.biaodan-fu-biao-ti {'), 'text-align')).toBe('center')
    expect(登录).toContain(
      "<span class=\"fu-biao-hang\">{{ huoQuFanYi('renZheng', 'dengLuFuBiaoTiHouBan') }}</span>",
    )
  })

  it('第一行四词按浅到深对应 fu-biao-ci-1 到 fu-biao-ci-4，颜色全走卡内语义令牌', () => {
    for (const xuHao of [1, 2, 3, 4]) {
      expect(取值(取块(登录样式, `.fu-biao-ci-${xuHao} {`), 'color')).toBe(`var(--ka-hong-${xuHao})`)
      expect(取值(取块(登录样式, '.biaodan-rongqi {'), `--ka-hong-${xuHao}`)).not.toBeNull()
      expect(
        取值(取块(登录样式, ":root[data-theme='light'] .biaodan-rongqi {"), `--ka-hong-${xuHao}`),
      ).not.toBeNull()
    }
  })

  it('深浅两档四枚红令牌互不相同、各自过卡面 4.5:1 且档内由浅到深', () => {
    const 深档 = 取块(登录样式, '.biaodan-rongqi {')
    const 浅档 = 取块(登录样式, ":root[data-theme='light'] .biaodan-rongqi {")
    for (const xuHao of [1, 2, 3, 4]) {
      const 深 = (取值(深档, `--ka-hong-${xuHao}`) as string).toLowerCase()
      const 浅 = (取值(浅档, `--ka-hong-${xuHao}`) as string).toLowerCase()
      expect(深).not.toBe(浅)
      expect(对比(深, 深卡面), `--ka-hong-${xuHao} 深档对比`).toBeGreaterThanOrEqual(4.5)
      expect(对比(浅, 浅卡面), `--ka-hong-${xuHao} 浅档对比`).toBeGreaterThanOrEqual(4.5)
      if (xuHao > 1) {
        const 上 = (取值(深档, `--ka-hong-${xuHao - 1}`) as string).toLowerCase()
        const 下 = (取值(深档, `--ka-hong-${xuHao}`) as string).toLowerCase()
        expect(亮度(上), '深档未由浅到深').toBeGreaterThanOrEqual(亮度(下))
        const 浅上 = (取值(浅档, `--ka-hong-${xuHao - 1}`) as string).toLowerCase()
        const 浅下 = (取值(浅档, `--ka-hong-${xuHao}`) as string).toLowerCase()
        expect(亮度(浅上), '浅档未由浅到深').toBeGreaterThanOrEqual(亮度(浅下))
      }
    }
  })

  it('四词与两行文案全部经翻译表下发，单行旧键删除干净', () => {
    expect(翻译表).toContain("dengLuFuBiaoTiQianBan: '谈一场{ci1}，{ci2}，{ci3}，{ci4}'")
    expect(翻译表).toContain("dengLuFuBiaoTiHouBan: '我们爱的恋爱'")
    for (const 键 of ['dengLuFuBiaoTiCi1', 'dengLuFuBiaoTiCi2', 'dengLuFuBiaoTiCi3', 'dengLuFuBiaoTiCi4']) {
      expect(登录).toContain("'" + 键 + "'")
    }
    expect(翻译表).not.toContain('dengLuFuBiaoTi:')
    expect(登录).not.toContain("'renZheng', 'dengLuFuBiaoTi'")
  })
})
