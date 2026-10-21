import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 根 = resolve(__dirname, '..')

function 取样式(文件名: string): string {
  const 文本 = readFileSync(resolve(根, 'views', 文件名), 'utf8')
  const 起 = 文本.indexOf('<style scoped>')
  expect(起).toBeGreaterThan(-1)
  return 文本.slice(起)
}

const 挑战主页 = 取样式('挑战主页.vue')
const 挑战积分榜 = 取样式('挑战积分榜.vue')

function 取声明(样式: string, 属性: string): string[] {
  const 结果: string[] = []
  const 正则 = new RegExp(`(?:^|[\\s{;])${属性}:\\s*([^;{}]+);`, 'g')
  for (const 匹配 of 样式.matchAll(正则)) {
    结果.push(匹配[1].trim().split(/\s+/)[0])
  }
  return 结果
}

const 允许的字号 = [
  'var(--tz-zi-xiao)',
  'var(--tz-zi-zheng)',
  'var(--tz-zi-zhong)',
  'var(--tz-zi-da)',
]

describe('挑战页字号阶梯', () => {
  it.each([
    ['挑战主页', 挑战主页],
    ['挑战积分榜', 挑战积分榜],
  ])('%s 只用四级字号阶梯', (_名称, 样式) => {
    const 字号集 = [...new Set(取声明(样式, 'font-size'))].sort()
    for (const 字号 of 字号集) {
      expect(允许的字号, `出现了未登记的字号 ${字号}`).toContain(字号)
    }
    expect(字号集.sort()).toEqual([...允许的字号].sort())
  })

  it('四级阶梯相邻比值不小于 1.25', () => {
    const 阶梯 = [12, 16, 20, 32]
    for (let i = 1; i < 阶梯.length; i++) {
      expect(阶梯[i] / 阶梯[i - 1]).toBeGreaterThanOrEqual(1.25)
    }
  })
})

describe('挑战页字重与文字颜色', () => {
  it.each([
    ['挑战主页', 挑战主页],
    ['挑战积分榜', 挑战积分榜],
  ])('%s 只用 400/600 两级字重', (_名称, 样式) => {
    const 字重集 = [...new Set(取声明(样式, 'font-weight'))].sort()
    expect(字重集).toEqual(['400', '600'])
  })

  it.each([
    ['挑战主页', 挑战主页],
    ['挑战积分榜', 挑战积分榜],
  ])('%s 文字颜色只走登记过的文字色变量', (_名称, 样式) => {
    const 颜色集 = [...new Set(取声明(样式, 'color'))].filter((值) => 值 !== 'currentColor')
    const 允许的 = [
      'var(--tz-wen)',
      'var(--tz-wen-ci)',
      'var(--tz-jin)',
      'var(--tz-wen-wei)',
      'var(--tz-fan-zi)',
    ]
    for (const 颜色 of 颜色集) {
      expect(允许的, `出现了未登记的文字颜色 ${颜色}`).toContain(颜色)
    }
  })
})

describe('挑战页圆角与投影', () => {
  it.each([
    ['挑战主页', 挑战主页],
    ['挑战积分榜', 挑战积分榜],
  ])('%s 圆角只有两级令牌加正圆', (_名称, 样式) => {
    const 圆角集 = [...new Set(取声明(样式, 'border-radius'))].sort()
    const 允许的 = ['50%', 'var(--yuanjiao-xiao)', 'var(--yuanjiao-zhong)']
    for (const 圆角 of 圆角集) {
      expect(允许的, `出现了未登记的圆角 ${圆角}`).toContain(圆角)
    }
  })

  it('投影只走令牌，唯一的字面投影留在性别弹层', () => {
    const 投影 = [...(挑战主页 + 挑战积分榜).matchAll(/box-shadow:\s*([^;{}]+);/g)].map((m) => m[1].trim())
    const 字面投影 = 投影.filter((值) => !值.includes('var('))
    expect(字面投影).toEqual(['0 24px 48px -24px rgba(0, 0, 0, 0.45)'])
  })
})

describe('挑战页可点击热区', () => {
  it.each([
    [
      '挑战主页',
      挑战主页,
      [
        '.anniu',
        '.anniu-kaiShi',
        '.anniu-paihang',
        '.zu-anniu',
        '.zhaiyao-quanbu',
        '.zhaiyao-chongshi',
        '.xingbie-ka-pian',
        '.tanchuang-guanbi',
      ],
    ],
    ['挑战积分榜', 挑战积分榜, ['.zubie-anNiu', '.kong-anniu', '.fanhui-lianjie']],
  ])('%s 交互控件命中高度落到 44px 令牌', (_名称, 样式, 选择器组) => {
    expect(样式).toContain('--tz-re-ku: 44px')
    for (const 选择器 of 选择器组) {
      const 位置 = 样式.indexOf(`${选择器} {`)
      expect(位置, `缺少样式规则 ${选择器}`).toBeGreaterThan(-1)
      const 块尾 = 样式.indexOf('}', 位置)
      const 块 = 样式.slice(位置, 块尾)
      expect(块, `${选择器} 未使用 44px 热区令牌`).toMatch(
        /min-height: var\(--tz-re-ku\)|height: var\(--tz-re-ku\)|min-height: calc\(var\(--tz-re-ku\)/,
      )
    }
  })

  it('积分榜返回链接同时挂了全局 44 像素热区类', () => {
    const 原文 = readFileSync(resolve(根, 'views', '挑战积分榜.vue'), 'utf8')
    expect(原文).toContain('class="fanhui-lianjie dian-ji-qu-44"')
  })
})

describe('挑战页可访问性与降级', () => {
  it.each([
    ['挑战主页', 挑战主页],
    ['挑战积分榜', 挑战积分榜],
  ])('%s 声明了 prefers-reduced-motion 降级', (_名称, 样式) => {
    expect(样式).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it.each([
    ['挑战主页', 挑战主页],
    ['挑战积分榜', 挑战积分榜],
  ])('%s 不再用字距装饰中文', (_名称, 样式) => {
    expect(样式).not.toContain('letter-spacing')
  })

  it.each([
    ['挑战主页', 挑战主页],
    ['挑战积分榜', 挑战积分榜],
  ])('%s 页面底色不再透出背景渐变', (_名称, 样式) => {
    const 主页块 = 样式.indexOf('.tiaozhan-yemian {')
    const 榜单块 = 样式.indexOf('.paihang-yemian {')
    const 根块起 = 主页块 >= 0 ? 主页块 : 榜单块
    const 根块尾 = 样式.indexOf('}', 根块起)
    const 根块 = 样式.slice(根块起, 根块尾)
    expect(根块).toContain('background: var(--tz-di)')
    expect(根块).toContain('border-radius: var(--yuanjiao-zhong)')
  })
})

describe('挑战页空态文案', () => {
  it('两个页面都使用了登记过的空态文案', () => {
    const 原文 =
      readFileSync(resolve(根, 'views', '挑战主页.vue'), 'utf8') +
      readFileSync(resolve(根, 'views', '挑战积分榜.vue'), 'utf8')
    const 键组 = ['zanWuPaiHang', 'bangDanKongFu', 'quTiaoZhan', 'jiaZaiZhong', 'zanWu']
    for (const 键 of 键组) {
      expect(原文, `缺少空态文案键 ${键}`).toContain(`'${键}'`)
    }
  })
})

describe('挑战页共享滑动指示器', () => {
  it.each([
    ['挑战主页', 挑战主页, '.zu-zhishi', '.zu-anniu'],
    ['挑战积分榜', 挑战积分榜, '.zubie-zhishi', '.zubie-anNiu'],
  ])('%s 页签下方只有一条共用的滑动指示器', (_名称, 样式, 指示器, 页签) => {
    const 位置 = 样式.indexOf(`${指示器} {`)
    expect(位置, `缺少样式规则 ${指示器}`).toBeGreaterThan(-1)
    const 块 = 样式.slice(位置, 样式.indexOf('}', 位置))
    expect(块).toContain('transform: translateX(0)')
    expect(块).toContain('transform var(--tz-zhi-shi-dong) var(--quxian-biao-zhun)')
    expect(块).toContain('width var(--tz-zhi-shi-dong) var(--quxian-biao-zhun)')
    expect(块).toContain('pointer-events: none')
    expect(样式).toContain('--tz-zhi-shi-dong: 260ms')
    expect(样式).not.toContain(`${页签}::after`)
  })

  it('两个页面都把指示器挂进分段容器，容器是定位基准', () => {
    const 主页原文 = readFileSync(resolve(根, 'views', '挑战主页.vue'), 'utf8')
    const 榜单原文 = readFileSync(resolve(根, 'views', '挑战积分榜.vue'), 'utf8')
    expect(主页原文).toContain('class="zu-zhishi"')
    expect(榜单原文).toContain('class="zubie-zhishi"')
    expect(主页原文).toContain(":style=\"zuZhishiWeiZhi\"")
    expect(榜单原文).toContain(":style=\"zuZhishiWeiZhi\"")
    expect(挑战主页).toContain('position: relative')
    expect(挑战积分榜).toContain('position: relative')
  })
})

describe('挑战页内容切换不重建', () => {
  it('挑战主页的加载/错误/空态/榜单四块常驻，只切 v-show', () => {
    const 原文 = readFileSync(resolve(根, 'views', '挑战主页.vue'), 'utf8')
    expect(原文).toContain('v-show="bangDanShouCiJiaZai"')
    expect(原文).toContain('v-show="bangDanCuoWu"')
    expect(原文).toContain('v-show="bangDanKong"')
    expect(原文).toContain('v-show="bangDanYouHang"')
    expect(原文).not.toContain('v-if="bangDanZaiZai"')
    expect(原文).not.toContain('v-else-if="bangDanLieBiao.length === 0"')
  })

  it('挑战积分榜的加载/空态/榜单三块常驻，只切 v-show', () => {
    const 原文 = readFileSync(resolve(根, 'views', '挑战积分榜.vue'), 'utf8')
    expect(原文).toContain('v-show="shouCiJiaZai"')
    expect(原文).toContain('v-show="bangDanKong"')
    expect(原文).toContain('v-show="youHang"')
    expect(原文).not.toContain('v-else-if="paiHangLieBiao.length > 0"')
  })

  it.each([
    ['挑战主页', 挑战主页, '.zhaiyao-nei-rong'],
    ['挑战积分榜', 挑战积分榜, '.bangdan-nei-rong'],
  ])('%s 内容区用 180ms 淡入淡出加 4px 位移', (_名称, 样式, 容器) => {
    const 位置 = 样式.indexOf(`${容器} {`)
    expect(位置).toBeGreaterThan(-1)
    const 块 = 样式.slice(位置, 样式.indexOf('}', 位置))
    expect(块).toContain('display: grid')
    expect(样式).toContain(`${容器} > * {`)
    expect(样式).toContain('grid-area: 1 / 1')
    expect(样式).toContain('--tz-dan-ru-dong: 180ms')
    expect(样式).toMatch(/opacity var\(--tz-dan-ru-dong\) ease-out/)
    expect(样式).toContain('transform: translateY(4px)')
  })
})

describe('挑战页性别卡规则', () => {
  it('选中态取淡填充与深边框令牌，不再用饱和填充', () => {
    const 原文 = readFileSync(resolve(根, 'views', '挑战主页.vue'), 'utf8')
    expect(原文).toContain('使用默认性别卡配色')
    expect(原文).toContain("nan: 'var(--xingbie-nan-shen-biankuang)'")
    expect(原文).toContain("nv: 'var(--xingbie-nv-shen-biankuang)'")
    expect(原文).toContain(':data-dui="对象配色档"')
    expect(原文).not.toContain('xuan-beijing')
    expect(原文).not.toContain('使用性别框体配色')
  })

  it('选中环与悬停投影都走令牌，卡片过渡落在 200ms ease-out', () => {
    expect(挑战主页).toContain(
      ".xingbie-zu[data-dui='nan'] .xingbie-ka-pian[aria-checked='true'] {\n  box-shadow: 0 0 0 1px var(--xingbie-nan-shen-biankuang);",
    )
    expect(挑战主页).toContain(
      ".xingbie-zu[data-dui='nv'] .xingbie-ka-pian[aria-checked='true'] {\n  box-shadow: 0 0 0 1px var(--xingbie-nv-shen-biankuang);",
    )
    expect(挑战主页).toContain('border-width: 2px')
    expect(挑战主页).toContain('--tz-ka-dong: 200ms')
    expect(挑战主页).toMatch(/box-shadow var\(--tz-ka-dong\) ease-out/)
    expect(挑战主页).toMatch(/transform var\(--tz-ka-dong\) ease-out/)
  })

  it('性别弹层开启有动效，且不靠延迟移除来演离开', () => {
    expect(挑战主页).toContain('animation: xingbie-zhe-zhao-ru var(--tz-dan-ru-dong) ease-out both')
    expect(挑战主页).toContain('animation: xingbie-tan-chuang-ru 220ms var(--quxian-tan-chu) both')
    expect(挑战主页).toContain('@keyframes xingbie-tan-chuang-ru')
    const 原文 = readFileSync(resolve(根, 'views', '挑战主页.vue'), 'utf8')
    expect(原文).toContain('v-if="xingBieXuanZeKeJian"')
  })
})

describe('挑战页降级覆盖新增动效', () => {
  it.each([
    ['挑战主页', 挑战主页, ['.zu-zhishi', '.zhaiyao-nei-rong', '.xingbie-zhezhao', '.xingbie-tanchuang']],
    ['挑战积分榜', 挑战积分榜, ['.zubie-zhishi', '.bangdan-nei-rong']],
  ])('%s 的 reduced-motion 块包含新增动效类', (_名称, 样式, 类名组) => {
    const 位置 = 样式.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(位置).toBeGreaterThan(-1)
    const 块 = 样式.slice(位置)
    for (const 类名 of 类名组) {
      expect(块, `缺少 ${类名}`).toContain(类名)
    }
    expect(块).toContain('animation: none')
  })
})
