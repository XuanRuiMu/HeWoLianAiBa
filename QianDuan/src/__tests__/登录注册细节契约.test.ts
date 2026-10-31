import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 令牌表 = 读('styles/设计令牌.css')

function 取样式块(源码: string): string {
  const 匹配 = /<style[^>]*>([\s\S]*?)<\/style>/.exec(源码)
  expect(匹配, '登录内容.vue 缺少 style 块').not.toBeNull()
  return (匹配 as RegExpExecArray)[1].replace(/\r\n/g, '\n')
}

function 取块(块: string, 选择器: string): string {
  const 行首 = 块.indexOf('\n' + 选择器)
  const 裸 = 块.indexOf(选择器)
  expect(裸, '缺少规则块 ' + 选择器).toBeGreaterThan(-1)
  const 起 = 行首 >= 0 ? 行首 : 裸
  const 余 = 块.slice(起)
  return 余.slice(0, 余.indexOf('}') + 1)
}

function 取值(块: string, 属性: string): string | null {
  const 匹配 = new RegExp('(?:^|[;{\\s])' + 属性.replace(/-/g, '\\-') + ':\\s*([^;}]+)').exec(块)
  return 匹配 ? 匹配[1].trim() : null
}

function 取令牌像素(令牌表: string, 名: string): number {
  const 匹配 = new RegExp('--' + 名 + ':\\s*(\\d+(?:\\.\\d+)?)px').exec(令牌表)
  expect(匹配, '设计令牌缺 --' + 名).not.toBeNull()
  return Number((匹配 as RegExpExecArray)[1])
}

describe('登录/注册细节契约', () => {
  const 登录 = 读('views/登录内容.vue')
  const 登录样式 = 取样式块(登录)

  it('自动登录可直接点击，勾选时经store同事务勾选记住账号与记住密码', () => {
    expect(登录).not.toContain(':disabled="!可自动登录"')
    expect(登录).not.toContain('weiJiHuo')
    expect(登录).not.toContain('const 可自动登录')
    expect(登录).toContain('bd.gengXinZiDongDengLu(')
    expect(登录).toContain('bd.gengXinJiZhuMiMa(')
    expect(登录).toContain('bd.gengXinJiZhuZhangHao(')
  })

  it('自动登录复选框不再使用虚线，和记住密码同一套实线外观', () => {
    expect(登录).not.toContain('border-style: dashed')
  })

  it('用户协议与隐私政策整行居中', () => {
    const 协议块 = 登录.slice(登录.indexOf('.xieyi-gouxuan'), 登录.indexOf('.xieyi-fuxuan'))
    expect(协议块).toContain('justify-content: center')
    expect(协议块).toContain('align-items: center')
    expect(登录).toContain('text-align: center;')
  })

  it('出生日期三段宽度按字段字号派生，不再使用会被裁切的旧基准', () => {
    const 令牌 = 读('styles/设计令牌.css')
    expect(令牌).toContain('--rili-nian-kuan: calc(var(--shuru-kuang-zihao) * 2.6)')
    expect(令牌).toContain('--rili-erwei-kuan: calc(var(--shuru-kuang-zihao) * 2.2)')
    expect(令牌).not.toContain('--rili-nian-kuan: calc(var(--ziti-da) * 2')
    expect(令牌).not.toContain('--rili-erwei-kuan: calc(var(--ziti-da) +')
  })
})

describe('认证副标题删除契约', () => {
  const 登录 = 读('views/登录内容.vue')

  it('登录注册卡不再渲染应用副标题DOM与样式', () => {
    expect(登录).not.toContain('biaodan-fu-biaoti')
    expect(登录).not.toContain("'renZheng', 'yingYongFuBiaoTi'")
  })

  it('主标题引用翻译表真实存在的应用名键，运行时不渲染空标题', () => {
    const 翻译表 = 读('config/翻译表.ts')
    expect(登录).toContain("huoQuFanYi('renZheng', 'yingYongMing')")
    expect(登录).not.toContain('yingYingMing')
    expect(翻译表).toContain("yingYongMing: '和我恋爱吧'")
  })

  it('副标题翻译键仍保留给战报海报使用，不得误删', () => {
    const 翻译表 = 读('config/翻译表.ts')
    const 战报海报 = 读('utils/战报海报.ts')
    expect(翻译表).toContain('yingYongFuBiaoTi')
    expect(战报海报).toContain("huoQuFanYi('renZheng', 'yingYongFuBiaoTi')")
  })
})

describe('认证选项三段均分排版契约', () => {
  const 登录 = 读('views/登录内容.vue')
  const 样式 = 取样式块(登录)

  it('两行选项都切成三等分段，首项中心落在1/3、次项中心落在2/3', () => {
    const 行块 = 取块(样式, '.ji-zhu-hang-1,\n.ji-zhu-hang-2 {')
    expect(取值(行块, 'display')).toBe('grid')
    expect(取值(行块, 'grid-template-columns')).toBe('repeat(3, minmax(0, 1fr))')
    expect(取值(行块, 'justify-items')).toBe('center')
    const 首项块 = 取块(样式, '.ji-zhu-hang-1 > :first-child,')
    expect(取值(首项块, 'grid-column')).toBe('1 / 3')
    const 次项块 = 取块(样式, '.ji-zhu-hang-1 > :last-child,')
    expect(取值(次项块, 'grid-column')).toBe('2 / 4')
  })

  it('第二行与第一行共用同一栅格落位，自动登录对齐记住账号、忘记密码对齐记住密码', () => {
    const 首项块 = 取块(样式, '.ji-zhu-hang-1 > :first-child,')
    const 次项块 = 取块(样式, '.ji-zhu-hang-1 > :last-child,')
    expect(首项块).toContain('.ji-zhu-hang-2 > :first-child')
    expect(次项块).toContain('.ji-zhu-hang-2 > :last-child')
  })

  it('选项组不设水平内边距，栅格即表单内容宽', () => {
    const 组块 = 取块(样式, '.ji-zhu-xuan-xiang {')
    expect(组块).not.toContain('padding')
    const 组间距 = 取值(组块, 'gap')
    expect(组间距 === null || 组间距 === '0').toBe(true)
  })

  it('纵向间距按令牌精确减半为当前的一半', () => {
    const 热区 = 取令牌像素(令牌表, 'shuru-anniu-re-ku')
    const 勾选 = 取令牌像素(令牌表, 'gou-xuan-chi-cun')
    const 行距 = 取令牌像素(令牌表, 'jiange-2')
    const 原视觉间距 = 热区 - 勾选 + 行距
    const 行二 = 取块(样式, '.ji-zhu-hang-2 {')
    const 边距表达式 = 取值(行二, 'margin-top')
    expect(边距表达式).not.toBeNull()
    expect(
      /calc\(\(var\(--jiange-2\) - var\(--shuru-anniu-re-ku\) \+ var\(--gou-xuan-chi-cun\)\) \/ 2\)/.test(
        边距表达式 as string,
      ),
      'margin-top 必须由令牌计算得出',
    ).toBe(true)
    const 新视觉间距 = 热区 - 勾选 + (行距 - (热区 - 勾选)) / 2
    expect(新视觉间距).toBeCloseTo(原视觉间距 / 2, 6)
  })
})
