import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import 气泡容器 from '@/components/聊天/气泡容器.vue'
import 气泡主题选择器 from '@/components/气泡主题选择器.vue'
import 聊天预览 from '@/components/聊天/聊天预览.vue'
import 图片裁剪 from '@/components/图片裁剪.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuWeiBaChiCun, huoQuWeiBaWeiZhiZhi } from '@/config/外观自定义'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')
const 尾巴源 = 读('components/聊天/气泡尾巴.vue')
const 容器源 = 读('components/聊天/气泡容器.vue')
const 卡片源 = 读('components/气泡主题选择器.vue')
const 裁剪源 = 读('components/图片裁剪.vue')
const 令牌源 = 读('styles/设计令牌.css')

function 列出源码(目录: string): string[] {
  const 出: string[] = []
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    const 全 = join(目录, 项.name)
    if (项.isDirectory()) {
      if (项.name === '__tests__' || 项.name === 'node_modules') continue
      出.push(...列出源码(全))
    } else if (/\.(vue|ts|css|js)$/.test(项.name) && statSync(全).isFile()) {
      出.push(relative(源码根, 全).replace(/\\/g, '/'))
    }
  }
  return 出.sort()
}

function 取令牌像素(mingCheng: string): number {
  const piPei = new RegExp(mingCheng + ':\\s*([0-9.]+)px').exec(令牌源)
  expect(piPei, '令牌 ' + mingCheng + ' 缺少 px 值').toBeTruthy()
  return Number(piPei![1])
}

describe('FP-05B1 气泡尾巴单一实现静态契约', () => {
  it('尾巴三角只在共享组件一处绘制，旧三份伪元素全部删除', () => {
    const 绘制尾巴的文件 = 列出源码(源码根).filter((文件) => 读(文件).includes('qipao-weiba--you'))
    expect(绘制尾巴的文件).toEqual(['components/聊天/气泡尾巴.vue'])
    for (const 文件 of 列出源码(源码根)) {
      const 源 = 读(文件)
      expect(源, 文件 + ' 仍保留旧容器尾巴伪元素').not.toContain('.qipao-neirong::after')
      expect(源, 文件 + ' 仍保留旧卡片尾巴伪元素').not.toContain('.qi-pao-xuan-xiang--ka::after')
      expect(源, 文件 + ' 仍保留旧 border 三角').not.toContain('border-left: var(--qipao-weiba-kuan) solid')
      expect(源, 文件 + ' 仍保留旧 border 三角').not.toContain('border-right: var(--qipao-weiba-kuan) solid')
      expect(源, 文件 + ' 仍引用固定外伸').not.toContain('--qipao-weiba-pian')
      expect(源, 文件 + ' 仍引用平均采样色').not.toContain('--qipao-ziJi-weiBa')
      expect(源, 文件 + ' 仍引用平均采样色').not.toContain('--qipao-duiFang-weiBa')
      expect(源, 文件 + ' 仍调用边缘采样').not.toContain('caiJiBianYuanYanSe')
    }
    expect(existsSync(resolve(源码根, 'utils/外观采样.ts'))).toBe(false)
  })

  it('三处消费同源：容器与卡片直挂共享组件，裁剪预览经真实气泡容器继承', () => {
    expect(容器源).toContain("import QiPaoWeiBa from '@/components/聊天/气泡尾巴.vue'")
    expect(容器源).toContain('<QiPaoWeiBa :ce="shiBenRen ? \'you\' : \'zuo\'" />')
    expect(卡片源).toContain("import QiPaoWeiBa from '@/components/聊天/气泡尾巴.vue'")
    expect(卡片源).toContain('<QiPaoWeiBa :ce="zu.jian === \'ziJi\' ? \'you\' : \'zuo\'" />')
    expect(裁剪源).toContain("import LiaoTianYuLan from '@/components/聊天/聊天预览.vue'")
    expect(裁剪源).toContain('Object.assign(yangShi, cang.qiPaoCSSBianLiang)')
    expect(裁剪源).not.toContain('qipao-weiba--')
    expect(裁剪源).not.toContain('clip-path: polygon(')
  })

  it('尾巴填充与描边消费统一变量：无零消费者令牌路径', () => {
    expect(尾巴源).toContain('background: var(--qipao-weiba-tian-chong, transparent)')
    expect(尾巴源).toContain('background: var(--qipao-weiba-miao-bian, transparent)')
    expect(尾巴源).toContain('display: var(--qipao-weiba-xian-shi, block)')
    expect(容器源).toContain('--qipao-weiba-tian-chong: var(--qipao-nei-rong-bei-jing)')
    expect(容器源).toContain('--qipao-nei-rong-bei-jing: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing))')
    expect(容器源).toContain('--qipao-weiba-shang-bu-ju: var(--qipao-nei-ju-shang)')
    expect(卡片源).toContain('--qipao-weiba-shang-bu-ju: var(--jiange-10)')
    expect(卡片源).toContain('--qipao-weiba-tian-chong: var(--qipao-ziJi-beiJing')
    expect(卡片源).toContain('--qipao-weiba-tian-chong: var(--qipao-duiFang-beiJing')
    expect(裁剪源).toContain('--qipao-weiba-tian-chong: var(--caijian-yulan-fu-gai) !important')
  })
})

describe('FP-05B1 尾巴几何：任何档位零缝隙零压入', () => {
  it('侧向外框按实际尾宽加描边宽计算，填充底边永远落在气泡边缘', () => {
    expect(尾巴源).toContain('right: calc((var(--qipao-weiba-kuan) + var(--qipao-weiba-bian)) * -1)')
    expect(尾巴源).toContain('left: calc((var(--qipao-weiba-kuan) + var(--qipao-weiba-bian)) * -1)')
    expect(尾巴源).toContain('left: var(--qipao-weiba-bian)')
    expect(尾巴源).toContain('width: calc(100% - var(--qipao-weiba-bian))')
    expect(尾巴源).toContain('var(--qipao-weiba-ban) * 2')
    const 气泡宽 = 300
    for (const [kuan, ban] of [
      [取令牌像素('--qipao-weiba-kuan-xiao'), 取令牌像素('--qipao-weiba-ban-xiao')],
      [取令牌像素('--qipao-weiba-kuan-ju-li'), 取令牌像素('--qipao-weiba-ban-ju-li')],
      [取令牌像素('--qipao-weiba-kuan-da'), 取令牌像素('--qipao-weiba-ban-da')],
    ]) {
      const 填充宽 = 气泡宽 + kuan
      const 右侧填充左 = 0
      const 右底边 = 右侧填充左 + 填充宽 - kuan
      const 右尾尖 = 右侧填充左 + 填充宽
      expect(右底边, '尾宽 ' + kuan + ' 右侧存在缝隙或压入').toBe(气泡宽)
      expect(右尾尖 - 右底边, '尾宽 ' + kuan + ' 右侧外伸不等于实际尾宽').toBe(kuan)
      const 左侧填充左 = -kuan
      const 左底边 = 左侧填充左 + kuan
      const 左尾尖 = 左侧填充左
      expect(左底边, '尾宽 ' + kuan + ' 左侧存在缝隙或压入').toBe(0)
      expect(左底边 - 左尾尖, '尾宽 ' + kuan + ' 左侧外伸不等于实际尾宽').toBe(kuan)
      expect(ban * 2, '尾高必须为半高的两倍').toBeGreaterThan(0)
    }
  })

  it('靠上锚点贴合首行中心并随字号行高变化，圆角档位下自动下移避免缺角', () => {
    const 锚点 = huoQuWeiBaWeiZhiZhi('shang')
    expect(锚点).toContain('0.5lh')
    expect(锚点).toContain('var(--qipao-weiba-ban)')
    expect(锚点).toContain('max(var(--qipao-yuanjiao)')
    expect(锚点).toContain('var(--qipao-weiba-shang-bu-ju, var(--qipao-nei-ju-shang))')
    const 字号 = 16
    const 行高 = 1.45
    const 上内衬 = 8
    const 首行中心 = 上内衬 + (字号 * 行高) / 2
    const 大圆角 = 14
    for (const jian of [
      ['xiao', 取令牌像素('--qipao-weiba-ban-xiao')],
      ['moRen', 取令牌像素('--qipao-weiba-ban-ju-li')],
      ['da', 取令牌像素('--qipao-weiba-ban-da')],
    ] as const) {
      const ban = jian[1]
      const 理论顶边 = 首行中心 - ban
      const 生效顶边 = Math.max(大圆角, 理论顶边)
      expect(生效顶边).toBeGreaterThanOrEqual(大圆角)
      const 尾心 = 生效顶边 + ban
      expect(尾心).toBeCloseTo(理论顶边 >= 大圆角 ? 首行中心 : 大圆角 + ban, 6)
    }
  })
})

describe('FP-05B1 组件行为', () => {
  it('左右气泡各自渲染一个同源尾巴，且不进入文本内容', () => {
    const benRen = mount(气泡容器, { props: { shiBenRen: true } })
    expect(benRen.findAll('.qipao-weiba')).toHaveLength(1)
    expect(benRen.find('.qipao-weiba--you').exists()).toBe(true)
    expect(benRen.findAll('.qipao-weiba--zuo')).toHaveLength(0)
    expect(benRen.get('.qipao-weiba').attributes('aria-hidden')).toBe('true')
    expect(benRen.text()).toBe('')
    benRen.unmount()

    const duiFang = mount(气泡容器, { props: { shiBenRen: false } })
    expect(duiFang.find('.qipao-weiba--zuo').exists()).toBe(true)
    expect(duiFang.findAll('.qipao-weiba--you')).toHaveLength(0)
    duiFang.unmount()
  })

  it('单行与多行文本共用同一尾巴，文本内容原样保留', async () => {
    const kuang = mount(气泡容器, {
      props: { shiBenRen: true, wenZiNeiJu: true },
      slots: { default: '第一行\n第二行\n第三行，足够多的文字用于验证多行气泡仍然只有一个尾巴。' },
    })
    await nextTick()
    expect(kuang.findAll('.qipao-weiba')).toHaveLength(1)
    expect(kuang.text()).toContain('第二行')
    kuang.unmount()
  })

  it('预览两枚气泡各带一个尾巴，左右方向与消息侧一致', async () => {
    setActivePinia(createPinia())
    const kuang = mount(聊天预览, { props: { biaoTi: '预览' } })
    await nextTick()
    expect(kuang.findAll('.qipao-weiba')).toHaveLength(2)
    expect(kuang.findAll('.qipao-weiba--zuo')).toHaveLength(1)
    expect(kuang.findAll('.qipao-weiba--you')).toHaveLength(1)
    kuang.unmount()
  })

  it('小/中/大尾与描边：bundle 抵达卡片根节点，每张卡片共享同一尾巴', () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    cang.shiYongQiPaoXingZhuang({ weiBaMoShi: 'da', miaoBianKaiQi: true, miaoBianYanSe: '#123456' })
    const kuang = mount(气泡主题选择器)
    const gen = kuang.element as HTMLElement
    expect(gen.style.getPropertyValue('--qipao-weiba-kuan')).toBe(huoQuWeiBaChiCun('da').kuan)
    expect(gen.style.getPropertyValue('--qipao-weiba-ban')).toBe(huoQuWeiBaChiCun('da').ban)
    expect(gen.style.getPropertyValue('--qipao-weiba-xian-shi')).toBe('block')
    expect(gen.style.getPropertyValue('--qipao-weiba-miao-bian')).toBe('#123456')
    const kaLieBiao = kuang.findAll('.qi-pao-xuan-xiang--ka')
    expect(kaLieBiao.length).toBeGreaterThan(0)
    for (const ka of kaLieBiao) expect(ka.findAll('.qipao-weiba')).toHaveLength(1)
    kuang.unmount()
  })

  it('无尾巴档只隐藏共享组件，不留 0 宽三角描边残影', () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    cang.shiYongQiPaoXingZhuang({ weiBaMoShi: 'wu', miaoBianKaiQi: true })
    const kuang = mount(气泡主题选择器)
    const gen = kuang.element as HTMLElement
    expect(gen.style.getPropertyValue('--qipao-weiba-kuan')).toBe('0px')
    expect(gen.style.getPropertyValue('--qipao-weiba-xian-shi')).toBe('none')
    expect(尾巴源).toContain('display: var(--qipao-weiba-xian-shi, block)')
    kuang.unmount()
  })

  it('裁剪预览继承真实形状档位与同源尾巴，不再另绘三角', async () => {
    const cang = createPinia()
    setActivePinia(cang)
    使用用户设置仓库().shiYongQiPaoXingZhuang({ weiBaMoShi: 'da', weiBaWeiZhi: 'zhong', miaoBianKaiQi: true })
    const kuang = mount(图片裁剪, {
      props: {
        tuYuan: 'data:image/png;base64,x',
        yuanMime: 'image/png',
        biaoTi: '裁剪测试',
        tiShi: '提示',
        kuanGaoBi: 2,
        yuLanLeiXing: 'qiPao',
        yuLanCeZhong: 'ziJi',
      },
      global: { plugins: [cang] },
    })
    await nextTick()
    await nextTick()
    const rongQi = kuang.get('.caijian-rongqi').element as HTMLElement
    expect(rongQi.style.getPropertyValue('--qipao-weiba-kuan')).toBe(huoQuWeiBaChiCun('da').kuan)
    expect(rongQi.style.getPropertyValue('--qipao-weiba-shang')).toBe(huoQuWeiBaWeiZhiZhi('zhong'))
    expect(kuang.findAll('.caijian-yulan .qipao-weiba')).toHaveLength(2)
    kuang.unmount()
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})
