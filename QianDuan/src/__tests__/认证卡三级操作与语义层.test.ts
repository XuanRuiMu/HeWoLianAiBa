import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')

const 登录 = 读('views/登录内容.vue')
const 找回 = 读('views/找回密码.vue')
const 令牌 = 读('styles/设计令牌.css')

function 取样式块(源码: string, 名: string): string {
  const 匹配 = /<style[^>]*>([\s\S]*?)<\/style>/.exec(源码)
  expect(匹配, 名 + ' 缺少 style 块').not.toBeNull()
  return (匹配 as RegExpMatchArray)[1]
}

const 登录块 = 取样式块(登录, '登录内容.vue')
const 找回块 = 取样式块(找回, '找回密码.vue')

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
  return 匹配 ? 匹配[1].trim() : null
}

function 取十六进制(块: string, 属性: string): string {
  const 值 = 取值(块, 属性)
  expect(值, '缺少 ' + 属性).not.toBeNull()
  expect(/^#[0-9a-f]{6}$/i.test(值 as string), 属性 + ' 非十六进制：' + 值).toBe(true)
  return (值 as string).toLowerCase()
}

function 亮度(色: string): number {
  const 匹配 = /^#([0-9a-f]{6})$/i.exec(色.trim())
  expect(匹配, '非十六进制色值：' + 色).not.toBeNull()
  const 数值 = parseInt((匹配 as RegExpMatchArray)[1], 16)
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

const 语义名 = [
  '--ka-zhu-wen',
  '--ka-ci-wen',
  '--ka-san-wen',
  '--ka-jin',
  '--ka-jin-shen',
  '--ka-jin-liang',
  '--ka-jin-xian',
  '--ka-jin-mian',
  '--ka-guang-wen',
  '--ka-cuo',
  '--ka-cuo-mian',
  '--ka-cuo-bian',
]

const 深档 = 取块(登录块, '.biaodan-rongqi {')
const 浅档 = 取块(登录块, ":root[data-theme='light'] .biaodan-rongqi {")
const 找回深档 = 取块(找回块, '.biaodan-rongqi {')
const 找回浅档 = 取块(找回块, ":root[data-theme='light'] .biaodan-rongqi {")

const 认证面 = [...令牌.matchAll(/--renzheng-mian-se:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1].toLowerCase())
const 深卡面 = 认证面.reduce((甲, 乙) => (亮度(甲) <= 亮度(乙) ? 甲 : 乙))
const 浅卡面 = 认证面.reduce((甲, 乙) => (亮度(甲) >= 亮度(乙) ? 甲 : 乙))

describe('认证卡语义层：一色一名，深浅两档各自成套', () => {
  it('登录页与找回密码页声明同一套十二枚语义名', () => {
    for (const 名 of 语义名) {
      expect(取值(深档, 名), '登录深档缺 ' + 名).not.toBeNull()
      expect(取值(浅档, 名), '登录浅档缺 ' + 名).not.toBeNull()
      expect(取值(找回深档, 名), '找回深档缺 ' + 名).not.toBeNull()
      expect(取值(找回浅档, 名), '找回浅档缺 ' + 名).not.toBeNull()
    }
  })

  it('浅档每一枚都与深档不同值，不是照抄', () => {
    for (const 名 of 语义名) {
      expect(取值(浅档, 名), 名 + ' 浅档与深档同值，等于没做浅档').not.toBe(取值(深档, 名))
      expect(取值(找回浅档, 名)).not.toBe(取值(找回深档, 名))
    }
  })

  it('两页的同一枚语义名取值完全一致', () => {
    for (const 名 of 语义名) {
      expect(取值(深档, 名), 名 + ' 两页深档不一致').toBe(取值(找回深档, 名))
      expect(取值(浅档, 名), 名 + ' 两页浅档不一致').toBe(取值(找回浅档, 名))
    }
  })

  it('卡内不再出现手挑字色，字色只能来自语义名', () => {
    for (const 块 of [登录块, 找回块]) {
      const 字色 = [...块.matchAll(/(?:^|[;{\s])color:\s*([^;}]+)/g)].map((m) => m[1].trim())
      expect(字色.length).toBeGreaterThan(0)
      const 手挑 = 字色.filter((值) => /^#[0-9a-f]{3,8}$/i.test(值) || /^rgba?\(/i.test(值))
      expect(手挑, '卡内仍有手挑字色').toEqual([])
    }
  })
})

describe('文字色三档之内，且深浅两档都过 4.5:1', () => {
  it('正常字级三档在深色卡面上不低于 4.5:1', () => {
    for (const 名 of ['--ka-zhu-wen', '--ka-ci-wen', '--ka-san-wen', '--ka-cuo']) {
      const 比值 = 对比(取十六进制(深档, 名), 深卡面)
      expect(比值, 名 + ' 深档对比 ' + 比值.toFixed(2)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('正常字级三档在浅色卡面上不低于 4.5:1', () => {
    for (const 名 of ['--ka-zhu-wen', '--ka-ci-wen', '--ka-san-wen', '--ka-cuo']) {
      const 比值 = 对比(取十六进制(浅档, 名), 浅卡面)
      expect(比值, 名 + ' 浅档对比 ' + 比值.toFixed(2)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('金线作为非文本构件对卡面不低于 3:1', () => {
    expect(对比(取十六进制(深档, '--ka-jin'), 深卡面)).toBeGreaterThanOrEqual(3)
    expect(对比(取十六进制(浅档, '--ka-jin'), 浅卡面)).toBeGreaterThanOrEqual(3)
  })

  it('主按钮墨字压在金面上不低于 4.5:1，且墨色两档通用', () => {
    const 墨 = 取十六进制(深档, '--ka-mo')
    expect(取值(浅档, '--ka-mo'), '墨色不该在浅档重复声明').toBeNull()
    for (const [档, 名] of [
      [深档, '深档'],
      [浅档, '浅档'],
    ] as Array<[string, string]>) {
      expect(对比(墨, 取十六进制(档, '--ka-jin')), 名 + ' 墨压金').toBeGreaterThanOrEqual(4.5)
      expect(对比(墨, 取十六进制(档, '--ka-jin-liang')), 名 + ' 墨压亮金').toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('字号只走令牌，字重只有两档', () => {
  it('两页不含字号字面量', () => {
    expect(登录块).not.toMatch(/font-size:\s*\d/)
    expect(找回块).not.toMatch(/font-size:\s*\d/)
  })

  it('字号值只能是令牌引用', () => {
    for (const 块 of [登录块, 找回块]) {
      const 字号 = [...块.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1].trim())
      expect(字号.length).toBeGreaterThan(0)
      expect(字号.filter((值) => !值.startsWith('var(--'))).toEqual([])
    }
  })

  it('字重只保留 400 与 700 两档', () => {
    for (const 块 of [登录块, 找回块]) {
      const 字重 = [...new Set([...块.matchAll(/font-weight:\s*(\d+)/g)].map((m) => m[1]))].sort()
      expect(字重).toEqual(['400', '700'])
    }
  })

  it('标题落在 24 档并登记为局部令牌', () => {
    expect(取值(深档, '--zihao-biaoti')).toBe('24px')
    expect(取值(取块(登录块, '.biaodan-biaoti {'), 'font-size')).toBe('var(--zihao-biaoti)')
  })
})

describe('主次弱三级操作', () => {
  it('主操作：实心渐变 + 墨字 + 8px 圆角，扫光伪元素已删除', () => {
    for (const 块 of [登录块, 找回块]) {
      const 主 = 取块(块, '.anniu-zhuyao {')
      expect(取值(主, 'background')).toBe('linear-gradient(180deg, var(--ka-jin-liang), var(--ka-jin))')
      expect(取值(主, 'color')).toBe('var(--ka-mo)')
      expect(取值(主, 'border-radius')).toBe('var(--yuanjiao-xiao)')
      expect(取值(主, 'letter-spacing')).toBe('0.08em')
      expect(取值(取块(块, '.anniu-zhuyao::before {'), 'content')).toBe('none')
    }
  })

  it('次操作：透明底 + 1px 金边（发送码、上一步）', () => {
    for (const 块 of [登录块, 找回块]) {
      const 次 = 取块(块, '.fasong-anniu {')
      expect(取值(次, 'background')).toBe('transparent')
      expect(取值(次, 'border')).toBe('1px solid var(--ka-jin)')
    }
    const 上一步 = 取块(找回块, '.zhaohui-shang-yi-bu {')
    expect(取值(上一步, 'background')).toBe('transparent')
    expect(取值(上一步, 'border')).toBe('1px solid var(--ka-jin)')
  })

  it('弱操作：下划线链接，不加边框与底色', () => {
    const 忘记 = 取块(登录块, '.wangji-mima-lianjie {')
    expect(取值(忘记, 'background')).toBe('none')
    expect(取值(忘记, 'border')).toBe('none')
    expect(取值(忘记, 'text-decoration')).toBe('underline')
    const 返回 = 取块(找回块, '.zhaohui-fan-hui {')
    expect(取值(返回, 'text-decoration')).toBe('underline')
  })

  it('提交中改按次级呈现，不再用中性灰压白字', () => {
    const 忙 = 取块(登录块, ".anniu-zhuyao[aria-busy='true'] {")
    expect(取值(忙, 'background')).toBe('transparent')
    expect(取值(忙, 'color')).toBe('var(--ka-zhu-wen)')
    expect(登录块).not.toMatch(/--quxiao-zi/)
    expect(找回块).not.toMatch(/--quxiao-zi/)
  })
})

describe('触控热区与键盘可达', () => {
  it('每个可点元素都撑到 44px 或有 44px 外扩热区', () => {
    expect(取值(取块(登录块, '.biaoqian-anniu {'), 'min-height')).toBe('var(--shuru-anniu-re-ku)')
    for (const 块 of [登录块, 找回块]) {
      expect(取值(取块(块, '.fasong-anniu {'), 'min-height')).toBe('var(--shuru-anniu-re-ku)')
      expect(取值(取块(块, '.anniu-zhuyao {'), 'min-height')).toBe('var(--shuru-anniu-re-ku)')
    }
    expect(取值(取块(登录块, '.wangji-mima-lianjie {'), 'min-height')).toBe('var(--shuru-anniu-re-ku)')
    expect(取值(取块(登录块, '.ji-zhu-xuan-ze {'), 'min-height')).toBe('var(--shuru-anniu-re-ku)')
    const 显隐热区 = 取块(登录块, '.mima-qiehuan::before {')
    expect(取值(显隐热区, 'width')).toBe('var(--shuru-anniu-re-ku)')
    expect(取值(显隐热区, 'height')).toBe('var(--shuru-anniu-re-ku)')
    const 协议热区 = 取块(登录块, '.xieyi-fuxuan::before {')
    expect(取值(协议热区, 'width')).toBe('var(--shuru-anniu-re-ku)')
    expect(取值(协议热区, 'height')).toBe('var(--shuru-anniu-re-ku)')
  })

  it('每个可点元素都有 focus-visible 焦点环', () => {
    const 登录选择器 = [
      '.biaoqian-anniu',
      '.wangji-mima-lianjie',
      '.anniu-zhuyao',
      '.fasong-anniu',
      '.mima-qiehuan',
      '.xieyi-lianjie',
      '.ji-zhu-fu-xuan',
    ]
    for (const 选择器 of 登录选择器) {
      expect(登录块, 选择器 + ' 缺 focus-visible').toContain(选择器 + ':focus-visible')
    }
    for (const 选择器 of ['.zhaohui-shang-yi-bu', '.zhaohui-fan-hui', '.anniu-zhuyao', '.fasong-anniu', '.mima-qiehuan']) {
      expect(找回块, 选择器 + ' 缺 focus-visible').toContain(选择器 + ':focus-visible')
    }
    expect(登录块).toContain('.ji-zhu-fu-xuan:focus-visible + .ji-zhu-wen-ben::before')
  })
})

describe('登录注册切换是一组可读的标签页', () => {
  it('容器声明 tablist，两枚按钮各自声明 tab 与选中态', () => {
    expect(登录).toContain('<div class="biaoqian-qiehuan" role="tablist">')
    expect((登录.match(/role="tab"/g) || []).length).toBe(2)
    expect(登录).toContain(":aria-selected=\"moShi === 'dengLu' ? 'true' : 'false'\"")
    expect(登录).toContain(":aria-selected=\"moShi === 'zhuCe' ? 'true' : 'false'\"")
  })

  it('活动标签用 class 与文字双重表达，不只靠下划线颜色', () => {
    expect(取值(取块(登录块, '.biaoqian-anniu.huoyue {'), 'font-weight')).toBe('700')
    expect(取值(取块(登录块, '.biaoqian-anniu {'), 'font-weight')).toBe('400')
  })
})

describe('间距节奏：段落 32、字段 24、组内 8，且外大内小', () => {
  it('段落令牌等于 24+8，卡面上下内距取它', () => {
    expect(取值(深档, '--ka-duan-luo')).toBe('calc(var(--jiange-da) + var(--jiange-xiao))')
    for (const 块 of [登录块, 找回块]) {
      const 卡 = 取块(块, '.biaodan-rongqi {')
      expect(取值(卡, 'padding')).toBe('var(--ka-duan-luo) var(--renzheng-ka-pian-you-nei-ju)')
    }
  })

  it('标题下 24 小于卡面上内距 32', () => {
    for (const 块 of [登录块, 找回块]) {
      expect(取值(取块(块, '.biaodan-tou {'), 'margin-bottom')).toBe('var(--jiange-da)')
    }
  })

  it('字段之间 24，字段内 2，勾选组行距由减半公式提供', () => {
    expect(取值(取块(登录块, '.shuru-zu {'), 'margin-bottom')).toBe('var(--ziduan-jian-ju)')
    expect(取值(取块(登录块, '.shuru-zu {'), '--ziduan-jian-ju')).toBe('var(--jiange-da)')
    expect(取值(取块(登录块, '.ji-zhu-xuan-xiang {'), 'gap')).toBeNull()
    expect(取值(取块(登录块, '.ji-zhu-hang-2 {'), 'margin-top')).toBe(
      'calc((var(--jiange-2) - var(--shuru-anniu-re-ku) + var(--gou-xuan-chi-cun)) / 2)',
    )
    expect(取值(取块(找回块, '.zhaohui-zi-duan {'), 'gap')).toBe('var(--jiange-2)')
    expect(取值(取块(找回块, '.zhaohui-biao-dan {'), 'gap')).toBe('var(--jiange-da)')
  })

  it('容器不再叠加 gap，避免与子项 margin 双计', () => {
    for (const 块 of [登录块, 找回块]) {
      expect(取值(取块(块, '.biaodan-neirong-qu {'), 'gap')).toBe('0')
    }
  })

  it('记住行按三段均分落位，首项中心1/3、次项中心2/3，不再两端摊开', () => {
    for (const 块 of [登录块]) {
      expect(块).not.toContain('space-evenly')
      const 行 = 取块(块, '.ji-zhu-hang-1,')
      expect(取值(行, 'display')).toBe('grid')
      expect(取值(行, 'grid-template-columns')).toBe('repeat(3, minmax(0, 1fr))')
      expect(取值(行, 'justify-items')).toBe('center')
      expect(行).not.toContain('space-between')
      expect(块).toContain('.ji-zhu-hang-1 > :first-child,')
      expect(块).toContain('.ji-zhu-hang-1 > :last-child,')
    }
  })
})

describe('错误态：只靠语义名，且不只靠颜色', () => {
  it('请求错误框的四枚面边文字全部重映射到卡内语义名', () => {
    const 框 = 取块(登录块, '.biaodan-neirong-qu > .qian-tai-cuo-wu {')
    expect(取值(框, '--cuo-wu-mian')).toBe('var(--ka-cuo-mian)')
    expect(取值(框, '--cuo-wu-bian')).toBe('var(--ka-cuo-bian)')
    expect(取值(框, '--cuo-wu-biaoti')).toBe('var(--ka-cuo)')
    expect(取值(框, '--cuo-wu-zhengwen')).toBe('var(--ka-zhu-wen)')
    expect(取值(框, 'border-radius')).toBe('var(--yuanjiao-xiao)')
  })

  it('行内报错用危险语义名，不再用浅档不达标的 --cuowu-wenben', () => {
    const 提示 = 取块(找回块, '.zhaohui-zi-duan-ti-shi {')
    expect(取值(提示, 'color')).toBe('var(--ka-cuo)')
    expect(找回块).not.toContain('var(--cuowu-wenben)')
    expect(登录块).not.toContain('var(--cuowu-wenben)')
  })
})

describe('字段浮标与输入值的浅档修复', () => {
  it('子组件内部元素一律经 :deep 落地', () => {
    expect(登录块).not.toContain(':root[data-theme=\'light\'] .fenlie-shuru')
    expect(登录块).not.toContain(':root[data-theme=\'light\'] .fudong-biaoqian')
    for (const 块 of [登录块, 找回块]) {
      expect(取值(取块(块, ':deep(.fenlie-shuru) {'), 'color')).toBe('var(--ka-zhu-wen)')
      expect(取值(取块(块, ':deep(.fenlie-shuru) {'), 'font-size')).toBe('var(--shuru-kuang-zihao)')
      expect(取值(取块(块, ':deep(.fudong-biaoqian) {'), 'color')).toBe('var(--ka-ci-wen)')
    }
  })

  it('浮标浮起态回到 12 档，不再用 11px 离档值', () => {
    const 浮起 = 取块(登录块, ':deep(.shuru-zu.shangFu .fudong-biaoqian),')
    expect(取值(浮起, 'font-size')).toBe('var(--ziti-xiao)')
  })

  it('自动填充与光标也用语义名', () => {
    expect(登录块).toContain('-webkit-text-fill-color: var(--ka-zhu-wen) !important')
    expect(登录块).toContain('caret-color: var(--ka-ci-wen) !important')
  })
})

describe('动效只做状态确认', () => {
  it('顶部图标已整体移除，浮动动画与发光随之消失', () => {
    expect(登录).not.toContain('app-tubiao')
    expect(登录块).not.toContain('--zihao-tubiao')
    for (const 块 of [登录块, 找回块]) expect(块).not.toContain('tubiao-fudong')
  })

  it('降级块覆盖新增的动效属性', () => {
    for (const 块 of [登录块, 找回块]) {
      const 降级起 = 块.indexOf('@media (prefers-reduced-motion: reduce)')
      expect(降级起).toBeGreaterThan(-1)
      const 降级 = 块.slice(降级起)
      expect(降级).toContain('transition: none !important')
      expect(降级).toContain('.anniu-zhuyao')
    }
    expect(登录块).toContain(':deep(.fudong-biaoqian),')
    expect(登录块).toContain('.ji-zhu-wen-ben::after')
  })
})
