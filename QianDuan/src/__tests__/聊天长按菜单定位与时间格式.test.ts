import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { use长按菜单 } from '@/composables/use长按菜单'
import XiaoXiCaoZuoCaiDan from '@/components/聊天/消息操作菜单.vue'
import { huoQuFanYi } from '@/config/翻译表'
import {
  LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI,
  CAI_DAN_LEI_XING_MO_REN,
  huoQuCaiDanLeiXing,
  huoQuYuanShiCaiDanXiang,
  shiWeiXianCaiDanXiang,
} from '@/config/消息配置'
import { fenZuXiaoXiAnShiJian, geShiHuaXiaoXiShiJian } from '@/utils/消息时间分组'

const 组件路径 = resolve(__dirname, '../components/聊天/消息操作菜单.vue')
const 菜单样式路径 = resolve(__dirname, '../styles/消息操作菜单.css')
const 气泡样式路径 = resolve(__dirname, '../styles/liao-tian-qi-pao.css')
const 视图目录 = resolve(__dirname, '../views')
const 读视图 = (文件: string): string => readFileSync(join(视图目录, 文件), 'utf8')

function 造触屏(x: number, y: number) {
  return { touches: [{ clientX: x, clientY: y }], changedTouches: [] } as unknown as TouchEvent
}

function 造右键(x: number, y: number) {
  return { clientX: x, clientY: y } as MouseEvent
}

function 造文本消息(id: string, neiRong: string, 附加: Record<string, unknown> = {}) {
  return {
    id,
    nei_rong: neiRong,
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    fa_song_zhe_lei_xing: 'yonghu',
    ...附加,
  }
}

function 造消息(leiXing: string, id: string) {
  return 造文本消息(id, '', { lei_xing: leiXing })
}

function 挂长按菜单(附加依赖: Record<string, unknown> = {}) {
  return use长按菜单({
    dangQianShiJian: ref(Date.now()),
    cheHuiXiaoXi: async () => undefined,
    ...附加依赖,
  } as never)
}

interface 假矩形 {
  width: number
  height: number
  top: number
  left: number
  right: number
  bottom: number
  x: number
  y: number
  toJSON: () => Record<string, never>
}

function 作矩形(zuo: number, ding: number, kuan: number, gao: number): 假矩形 {
  return {
    width: kuan,
    height: gao,
    top: ding,
    left: zuo,
    right: zuo + kuan,
    bottom: ding + gao,
    x: zuo,
    y: ding,
    toJSON: () => ({}),
  }
}

const 基线几何 = {
  dianX: 200,
  dianY: 100,
  ziRanKuan: 148,
  ziRanGao: 159,
  shiKuan: 390,
  shiGao: 844,
}

const 假几何 = { ...基线几何 }

let 原矩形: Element['getBoundingClientRect']
let 原滚动高: PropertyDescriptor | undefined
let 挂起的包装: ReturnType<typeof mount>[] = []

function 清浮层(): void {
  挂起的包装.forEach((zhuang) => zhuang.unmount())
  挂起的包装 = []
  document.body.innerHTML = ''
}

beforeEach(() => {
  Object.assign(假几何, 基线几何)
  原矩形 = Element.prototype.getBoundingClientRect
  原滚动高 = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')
  Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
    configurable: true,
    writable: true,
    value: function (this: Element): 假矩形 {
      const lei = this.getAttribute('class') ?? ''
      if (lei.includes('xiaoxi-caidan-dingdian')) return 作矩形(假几何.dianX, 假几何.dianY, 0, 0)
      if (lei === 'xiaoxi-caidan') return 作矩形(0, 0, 假几何.ziRanKuan, 假几何.ziRanGao)
      return 作矩形(0, 0, 0, 0)
    },
  })
  Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get(this: Element) {
      return (this.getAttribute('class') ?? '') === 'xiaoxi-caidan' ? 假几何.ziRanGao : 0
    },
  })
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    get: () => 假几何.shiKuan,
  })
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    get: () => 假几何.shiGao,
  })
})

afterEach(() => {
  清浮层()
  Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
    configurable: true,
    writable: true,
    value: 原矩形,
  })
  if (原滚动高) Object.defineProperty(Element.prototype, 'scrollHeight', 原滚动高)
  vi.useRealTimers()
})

function 取函数体(源: string, 函数名: string): string {
  const 起 = 源.indexOf(`function ${函数名}(`)
  if (起 < 0) throw new Error(`${函数名} 未定义`)
  const 尾 = 源.indexOf('\n}\n', 起)
  return 尾 < 0 ? 源.slice(起) : 源.slice(起, 尾 + 3)
}

function 取钩子体(源: string, 钩子名: string): string {
  const 起 = 源.indexOf(`${钩子名}(() => {`)
  if (起 < 0) throw new Error(`${钩子名} 未注册`)
  const 尾 = 源.indexOf('\n})', 起)
  return 尾 < 0 ? 源.slice(起) : 源.slice(起, 尾 + 4)
}

function 挂菜单(项: readonly string[] = [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.wenBenCaiDanXiang]) {
  const zhuang = mount(XiaoXiCaoZuoCaiDan, {
    props: { kaiQi: true, jiDian: { x: 假几何.dianX, y: 假几何.dianY }, caiDanXiang: 项 },
  })
  挂起的包装.push(zhuang)
  return zhuang
}

function 浮层(): HTMLElement {
  const yuan = document.querySelector<HTMLElement>('.xiaoxi-caidan')
  if (!yuan) throw new Error('消息操作菜单浮层未渲染')
  return yuan
}

function 遮罩(): HTMLElement {
  const yuan = document.querySelector<HTMLElement>('.xiaoxi-caidan-zhezhao')
  if (!yuan) throw new Error('消息操作菜单遮罩未渲染')
  return yuan
}

function 按钮组(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('.xiaoxi-caidan-xiangmu')]
}

function 按键(键: string): void {
  遮罩().dispatchEvent(new KeyboardEvent('keydown', { key: 键, bubbles: true }))
}

async function 等浮层定稿(): Promise<void> {
  await flushPromises()
}

describe('消息操作菜单浮层定位', () => {
  it('下方空间够时浮层落在触点下方并保留一个间距', async () => {
    挂菜单()
    await 等浮层定稿()
    const pan = 浮层()
    expect(pan.dataset.fangXiang).toBe('xia')
    expect(pan.style.top).toBe(`${100 + LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanJianGe}px`)
    expect(pan.style.maxHeight).toBe('159px')
  })

  it('顶部放不下时翻转到触点上方并贴到上边距', async () => {
    假几何.shiGao = 300
    假几何.dianY = 180
    挂菜单()
    await 等浮层定稿()
    const pan = 浮层()
    expect(pan.dataset.fangXiang).toBe('shang')
    expect(pan.style.top).toBe(`${LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu}px`)
    expect(pan.style.maxHeight).toBe('152px')
  })

  it('角落触点夹回视口内且左右都不贴边', async () => {
    假几何.shiKuan = 320
    假几何.shiGao = 480
    假几何.dianX = 319
    假几何.dianY = 479
    挂菜单()
    await 等浮层定稿()
    const pan = 浮层()
    const kuan = parseFloat(pan.style.width)
    const zuo = parseFloat(pan.style.left)
    const ding = parseFloat(pan.style.top)
    expect(pan.dataset.fangXiang).toBe('shang')
    expect(zuo).toBeGreaterThanOrEqual(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu)
    expect(zuo + kuan).toBeLessThanOrEqual(320 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu)
    expect(ding).toBeGreaterThanOrEqual(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu)
    expect(ding + parseFloat(pan.style.maxHeight)).toBeLessThanOrEqual(480)
  })

  it('宽度收在配置的最小宽与最大宽之间', async () => {
    假几何.shiKuan = 900
    假几何.ziRanKuan = 40
    挂菜单()
    await 等浮层定稿()
    expect(浮层().style.width).toBe(`${LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanZuiXiaoKuanDu}px`)
    清浮层()
    假几何.ziRanKuan = 400
    挂菜单()
    await 等浮层定稿()
    expect(浮层().style.width).toBe(`${LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanZuiDaKuanDu}px`)
  })

  it('两阶段：实测定稿前浮层不可见，定稿后才可见', async () => {
    挂菜单()
    expect(浮层().dataset.dingGao).toBe('0')
    await 等浮层定稿()
    expect(浮层().dataset.dingGao).toBe('1')
  })

  it('短视口放不下时压到可用高度并把溢出交给列表滚动', async () => {
    假几何.shiKuan = 844
    假几何.shiGao = 390
    假几何.ziRanGao = 288
    假几何.dianX = 100
    假几何.dianY = 195
    挂菜单(['fuZhi', 'fanYi', 'yinYong', 'cheHui', 'tianJiaDaoBiaoQing', 'baoCunTuPian'])
    await 等浮层定稿()
    const pan = 浮层()
    const panDing = parseFloat(pan.style.top)
    const keYongGao = parseFloat(pan.style.maxHeight)
    expect(keYongGao).toBeLessThan(288)
    expect(keYongGao + panDing).toBeLessThanOrEqual(
      390 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu,
    )
    const 样式源 = readFileSync(菜单样式路径, 'utf8')
    expect(样式源).toMatch(/\.xiaoxi-caidan\s*\{[^}]*overflow:\s*hidden/)
    expect(样式源).toMatch(/\.xiaoxi-caidan-lie\s*\{[^}]*overflow-y:\s*auto/)
  })

  it('危险项按配置标记且文案来自翻译表', async () => {
    挂菜单(['fuZhi', 'cheHui'])
    await 等浮层定稿()
    const xiang = 按钮组()
    expect(xiang).toHaveLength(2)
    expect(xiang[0].className).not.toContain('xiaoxi-caidan-xiangmu--weixian')
    expect(xiang[1].className).toContain('xiaoxi-caidan-xiangmu--weixian')
    expect(xiang[0].textContent?.trim()).toBe(huoQuFanYi('liaoTian', 'fuZhi'))
    expect(xiang[1].textContent?.trim()).toBe(huoQuFanYi('liaoTian', 'cheHui'))
  })

  it('表情包落到的默认菜单只渲染改造前那一项：单个危险项撤回', async () => {
    挂菜单([...huoQuYuanShiCaiDanXiang(CAI_DAN_LEI_XING_MO_REN)])
    await 等浮层定稿()
    const xiang = 按钮组()
    expect(xiang).toHaveLength(1)
    expect(xiang[0].className).toContain('xiaoxi-caidan-xiangmu--weixian')
    expect(xiang[0].textContent?.trim()).toBe(huoQuFanYi('liaoTian', 'cheHui'))
  })

  it('点击菜单项把项键上抛给视图且不点穿遮罩', async () => {
    const zhuang = 挂菜单(['fuZhi', 'cheHui'])
    await 等浮层定稿()
    按钮组()[1].click()
    expect(zhuang.emitted()['xuan-zhong']?.[0]).toEqual(['cheHui'])
    expect(zhuang.emitted()['guan-bi']).toBeUndefined()
  })

  it('方向键在菜单项间移动焦点，Escape 与 Tab 关闭', async () => {
    const zhuang = 挂菜单(['fuZhi', 'fanYi', 'yinYong', 'cheHui'])
    await 等浮层定稿()
    expect(document.activeElement?.classList.contains('xiaoxi-caidan-lie')).toBe(true)
    按键('ArrowDown')
    expect(document.activeElement).toBe(按钮组()[0])
    按键('ArrowDown')
    expect(document.activeElement).toBe(按钮组()[1])
    按键('End')
    expect(document.activeElement).toBe(按钮组()[3])
    按键('Home')
    expect(document.activeElement).toBe(按钮组()[0])
    按键('ArrowUp')
    expect(document.activeElement).toBe(按钮组()[3])
    按键('Escape')
    expect(zhuang.emitted()['guan-bi']).toHaveLength(1)
    按键('Tab')
    expect(zhuang.emitted()['guan-bi']).toHaveLength(2)
  })

  it('点遮罩关闭，浮层本体不吃到关闭', async () => {
    const zhuang = 挂菜单(['fuZhi'])
    await 等浮层定稿()
    浮层().click()
    expect(zhuang.emitted()['guan-bi']).toBeUndefined()
    遮罩().click()
    expect(zhuang.emitted()['guan-bi']).toHaveLength(1)
  })

  it('触点变化后重新实测并保持定稿', async () => {
    const zhuang = 挂菜单(['fuZhi', 'cheHui'])
    await 等浮层定稿()
    假几何.dianX = 40
    假几何.dianY = 300
    await zhuang.setProps({ jiDian: { x: 40, y: 300 } })
    await 等浮层定稿()
    const pan = 浮层()
    expect(pan.dataset.dingGao).toBe('1')
    expect(pan.style.top).toBe(`${300 + LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanJianGe}px`)
    expect(parseFloat(pan.style.left)).toBeGreaterThanOrEqual(
      LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu,
    )
  })
})

describe('消息操作菜单打开关闭生命周期', () => {
  function 装监听探针() {
    const 添加 = vi.spyOn(window, 'addEventListener')
    const 移除 = vi.spyOn(window, 'removeEventListener')
    const 现存 = (类型: string): number => {
      const jiaRu = 添加.mock.calls.filter(([名称]) => 名称 === 类型).length
      const zhuChu = 移除.mock.calls.filter(([名称]) => 名称 === 类型).length
      return jiaRu - zhuChu
    }
    const 还原 = (): void => {
      添加.mockRestore()
      移除.mockRestore()
    }
    return { 现存, 还原 }
  }

  function 挂收起菜单() {
    const zhuang = mount(XiaoXiCaoZuoCaiDan, {
      props: { kaiQi: false, jiDian: null, caiDanXiang: [] },
    })
    挂起的包装.push(zhuang)
    return zhuang
  }

  async function 展开(zhuang: ReturnType<typeof mount>): Promise<void> {
    await zhuang.setProps({
      kaiQi: true,
      jiDian: { x: 假几何.dianX, y: 假几何.dianY },
      caiDanXiang: ['fuZhi', 'cheHui'],
    })
    await 等浮层定稿()
  }

  async function 收起(zhuang: ReturnType<typeof mount>): Promise<void> {
    await zhuang.setProps({ kaiQi: false, jiDian: null })
    await 等浮层定稿()
  }

  it('收起状态下不注册任何窗口跟踪监听', async () => {
    const 探针 = 装监听探针()
    try {
      挂收起菜单()
      await 等浮层定稿()
      expect(探针.现存('scroll')).toBe(0)
      expect(探针.现存('resize')).toBe(0)
    } finally {
      探针.还原()
    }
  })

  it('打开时成对注册滚动与尺寸监听，关闭后成对摘除', async () => {
    const 探针 = 装监听探针()
    try {
      const zhuang = 挂收起菜单()
      await 等浮层定稿()
      expect(探针.现存('scroll')).toBe(0)
      expect(探针.现存('resize')).toBe(0)
      await 展开(zhuang)
      expect(浮层()).toBeTruthy()
      expect(探针.现存('scroll')).toBe(1)
      expect(探针.现存('resize')).toBe(1)
      await 收起(zhuang)
      expect(探针.现存('scroll')).toBe(0)
      expect(探针.现存('resize')).toBe(0)
    } finally {
      探针.还原()
    }
  })

  it('反复开关与重复展开都不让跟踪监听累积', async () => {
    const 探针 = 装监听探针()
    try {
      const zhuang = 挂收起菜单()
      await 展开(zhuang)
      await 展开(zhuang)
      expect(探针.现存('scroll')).toBe(1)
      expect(探针.现存('resize')).toBe(1)
      await 收起(zhuang)
      await 收起(zhuang)
      expect(探针.现存('scroll')).toBe(0)
      expect(探针.现存('resize')).toBe(0)
      await 展开(zhuang)
      expect(探针.现存('scroll')).toBe(1)
      await 收起(zhuang)
      expect(探针.现存('scroll')).toBe(0)
      expect(探针.现存('resize')).toBe(0)
    } finally {
      探针.还原()
    }
  })

  it('卸载时同样摘除跟踪监听', async () => {
    const 探针 = 装监听探针()
    try {
      const zhuang = 挂菜单(['fuZhi', 'cheHui'])
      await 等浮层定稿()
      expect(探针.现存('scroll')).toBe(1)
      expect(探针.现存('resize')).toBe(1)
      zhuang.unmount()
      expect(探针.现存('scroll')).toBe(0)
      expect(探针.现存('resize')).toBe(0)
    } finally {
      探针.还原()
    }
  })

  it('关闭后焦点还给本次打开时所在的元素', async () => {
    const shuRuKuang = document.createElement('input')
    document.body.appendChild(shuRuKuang)
    shuRuKuang.focus()
    const zhuang = 挂收起菜单()
    await 展开(zhuang)
    expect(document.activeElement?.classList.contains('xiaoxi-caidan-lie')).toBe(true)
    await 收起(zhuang)
    expect(document.activeElement).toBe(shuRuKuang)
  })

  it('再次打开时重新采集当前焦点，关闭后还给第二次所在的元素', async () => {
    const yi = document.createElement('input')
    const er = document.createElement('input')
    document.body.append(yi, er)
    yi.focus()
    const zhuang = 挂收起菜单()
    await 展开(zhuang)
    await 收起(zhuang)
    expect(document.activeElement).toBe(yi)
    er.focus()
    await 展开(zhuang)
    expect(document.activeElement?.classList.contains('xiaoxi-caidan-lie')).toBe(true)
    await 收起(zhuang)
    expect(document.activeElement).toBe(er)
  })

  it('归还目标已离开文档时安全跳过且不抛错', async () => {
    const 探针 = 装监听探针()
    try {
      const linShi = document.createElement('input')
      document.body.appendChild(linShi)
      linShi.focus()
      const zhuang = 挂收起菜单()
      await 展开(zhuang)
      linShi.remove()
      await 收起(zhuang)
      expect(document.activeElement).not.toBe(linShi)
      expect(探针.现存('scroll')).toBe(0)
      expect(探针.现存('resize')).toBe(0)
    } finally {
      探针.还原()
    }
  })

  it('点菜单项执行后关闭同样归还焦点', async () => {
    const maoBiao = document.createElement('input')
    document.body.appendChild(maoBiao)
    maoBiao.focus()
    const zhuang = 挂收起菜单()
    await 展开(zhuang)
    按钮组()[0].click()
    await 收起(zhuang)
    expect(zhuang.emitted()['xuan-zhong']?.[0]).toEqual(['fuZhi'])
    expect(document.activeElement).toBe(maoBiao)
  })
})

describe('长按菜单状态机与通道去重', () => {
  beforeEach(() => vi.useFakeTimers())

  it('语音/文本/图片/其它消息各自分派到对应菜单类型', () => {
    const quan = 挂长按菜单()
    quan.daKaiCaiDan(造文本消息('a', '在吗') as never, 造右键(200, 100))
    expect(quan.dangQianCaiDanLeiXing.value).toBe('wenBen')
    quan.guanBiCaiDan()
    quan.daKaiCaiDan(造消息('yuYin', 'b') as never, 造右键(200, 100))
    expect(quan.dangQianCaiDanLeiXing.value).toBe('yuYin')
    quan.guanBiCaiDan()
    quan.daKaiCaiDan(造消息('tuPian', 'c') as never, 造右键(200, 100))
    expect(quan.dangQianCaiDanLeiXing.value).toBe('tuPian')
    quan.guanBiCaiDan()
    quan.daKaiCaiDan(造消息('wenJian', 'd') as never, 造右键(200, 100))
    expect(quan.dangQianCaiDanLeiXing.value).toBe('cheHui')
  })

  it('表情包菜单项回到改造前：只有撤回一项且不并入图片菜单', () => {
    const quan = 挂长按菜单({ zhiChiTuPianYinYong: true })
    quan.daKaiCaiDan(造消息('biaoQingBao', 'e') as never, 造右键(200, 100))
    expect(quan.dangQianCaiDanLeiXing.value).toBe(CAI_DAN_LEI_XING_MO_REN)
    expect([...quan.dangQianCaiDanXiang.value]).toEqual(['cheHui'])
    expect([...quan.dangQianCaiDanXiang.value]).toEqual([...huoQuYuanShiCaiDanXiang('cheHui')])
    expect([...quan.dangQianCaiDanXiang.value]).not.toContain('tianJiaDaoBiaoQing')
    expect([...quan.dangQianCaiDanXiang.value]).not.toContain('baoCunTuPian')
    expect([...quan.dangQianCaiDanXiang.value]).not.toContain('yinYong')
  })

  it('图片菜单仍保持改造前那四项，表情包与图片不再共用', () => {
    const quan = 挂长按菜单({ zhiChiTuPianYinYong: true })
    quan.daKaiCaiDan(造消息('tuPian', 'e2') as never, 造右键(200, 100))
    expect(quan.dangQianCaiDanLeiXing.value).toBe('tuPian')
    const tuXiang = [...quan.dangQianCaiDanXiang.value]
    expect(tuXiang).toEqual([...huoQuYuanShiCaiDanXiang('tuPian')])
    quan.guanBiCaiDan()
    quan.daKaiCaiDan(造消息('biaoQingBao', 'e3') as never, 造右键(200, 100))
    const biaoXiang = [...quan.dangQianCaiDanXiang.value]
    expect(biaoXiang).toEqual(['cheHui'])
    expect(biaoXiang).not.toEqual(tuXiang)
  })

  it('类型到菜单类型是显式配置映射，未列出的类型统一落到默认菜单', () => {
    expect(huoQuCaiDanLeiXing('tuPian')).toBe('tuPian')
    expect(huoQuCaiDanLeiXing('wenben')).toBe('wenBen')
    expect(huoQuCaiDanLeiXing('yuYin')).toBe('yuYin')
    expect(huoQuCaiDanLeiXing('biaoQingBao')).toBe(CAI_DAN_LEI_XING_MO_REN)
    expect(huoQuCaiDanLeiXing('wenJian')).toBe(CAI_DAN_LEI_XING_MO_REN)
    expect(huoQuCaiDanLeiXing('未登记类型')).toBe(CAI_DAN_LEI_XING_MO_REN)
  })

  it('菜单项集合顺序与危险标记全部来自消息配置真源', () => {
    const quan = 挂长按菜单()
    quan.daKaiCaiDan(造文本消息('f', '在吗') as never, 造右键(200, 100))
    expect([...quan.dangQianCaiDanXiang.value]).toEqual(['fuZhi', 'fanYi', 'yinYong', 'cheHui'])
    expect([...huoQuYuanShiCaiDanXiang('wenBen')]).toEqual([
      ...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.wenBenCaiDanXiang,
    ])
    expect(shiWeiXianCaiDanXiang('cheHui')).toBe(true)
    expect(shiWeiXianCaiDanXiang('fuZhi')).toBe(false)
    expect(shiWeiXianCaiDanXiang('yinYong')).toBe(false)
    quan.guanBiCaiDan()
    quan.daKaiCaiDan(造消息('yuYin', 'g') as never, 造右键(200, 100))
    expect([...quan.dangQianCaiDanXiang.value]).toEqual(['yuYinZhuanWenZi', 'yinYong', 'cheHui'])
    quan.guanBiCaiDan()
    quan.daKaiCaiDan(造消息('wenJian', 'h') as never, 造右键(200, 100))
    expect([...quan.dangQianCaiDanXiang.value]).toEqual(['cheHui'])
  })

  it('撤回时限外与非本人消息都不出现撤回项', () => {
    const quan = 挂长按菜单()
    quan.daKaiCaiDan(造文本消息('i', '在吗') as never, 造右键(200, 100))
    expect([...quan.dangQianCaiDanXiang.value]).toContain('cheHui')
    quan.guanBiCaiDan()
    quan.daKaiCaiDan(
      造文本消息('j', '在吗', { shi_jian_chuo: Date.now() - 10_000_000 }) as never,
      造右键(200, 100),
    )
    expect(quan.dangQianCaiDanLeiXing.value).toBe('wenBen')
    expect([...quan.dangQianCaiDanXiang.value]).not.toContain('cheHui')
    quan.guanBiCaiDan()
    quan.daKaiCaiDan(
      造文本消息('k', '在吗', { fa_song_zhe_lei_xing: 'jiaose' }) as never,
      造右键(200, 100),
    )
    expect([...quan.dangQianCaiDanXiang.value]).not.toContain('cheHui')
  })

  it('已撤回与系统消息都不打开菜单', () => {
    const quan = 挂长按菜单()
    quan.daKaiCaiDan(造文本消息('l', '在吗', { yi_che_hui: true }) as never, 造右键(200, 100))
    expect(quan.caiDanZhengDaKai.value).toBe(false)
    quan.daKaiCaiDan(
      造文本消息('m', '在吗', { fa_song_zhe_lei_xing: 'xitong' }) as never,
      造右键(200, 100),
    )
    expect(quan.caiDanZhengDaKai.value).toBe(false)
  })

  it('本地临时消息没有引用项，其余项保持', () => {
    const quan = 挂长按菜单()
    quan.daKaiCaiDan(造文本消息('n', '在吗', { ke_hu_duan_id: 'n' }) as never, 造右键(200, 100))
    expect([...quan.dangQianCaiDanXiang.value]).toEqual(['fuZhi', 'fanYi', 'cheHui'])
  })

  it('图片引用能力关闭时图片菜单不含引用项', () => {
    const quan = 挂长按菜单({ zhiChiTuPianYinYong: false })
    quan.daKaiCaiDan(造消息('tuPian', 'o') as never, 造右键(200, 100))
    expect([...quan.dangQianCaiDanXiang.value]).toEqual([
      'tianJiaDaoBiaoQing',
      'baoCunTuPian',
      'cheHui',
    ])
  })

  it('关闭后菜单项集合与触点一并复位', () => {
    const quan = 挂长按菜单()
    quan.daKaiCaiDan(造文本消息('p', '在吗') as never, 造右键(200, 100))
    expect(quan.caiDanZhengDaKai.value).toBe(true)
    expect(quan.dangQianJiDian.value).toEqual({ x: 200, y: 100 })
    quan.guanBiCaiDan()
    expect(quan.caiDanZhengDaKai.value).toBe(false)
    expect([...quan.dangQianCaiDanXiang.value]).toEqual([])
    expect(quan.dangQianJiDian.value).toBeNull()
  })

  it('Android 双通道：长按打开后窗口期内 contextmenu 不再重复打开', () => {
    const quan = 挂长按菜单()
    quan.chuMoKaiShi(造文本消息('q', '在吗') as never, 造触屏(50, 60))
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 20)
    expect(quan.caiDanZhengDaKai.value).toBe(true)
    expect(quan.dangQianJiDian.value).toEqual({ x: 50, y: 60 })
    quan.daKaiCaiDan(造文本消息('q', '在吗') as never, 造右键(300, 300))
    expect(quan.dangQianJiDian.value).toEqual({ x: 50, y: 60 })
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.youJianQuChongHaoMiao + 20)
    quan.daKaiCaiDan(造文本消息('q', '在吗') as never, 造右键(300, 300))
    expect(quan.dangQianJiDian.value).toEqual({ x: 300, y: 300 })
  })

  it('touchmove 位移超过阈值才取消长按计时', () => {
    const quan = 挂长按菜单()
    const xiaoXi = 造文本消息('r', '在吗') as never
    quan.chuMoKaiShi(xiaoXi, 造触屏(100, 100))
    quan.chuMoYiDongQuXiao(造触屏(105, 105))
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 20)
    expect(quan.caiDanZhengDaKai.value).toBe(true)
    quan.guanBiCaiDan()
    quan.chuMoKaiShi(xiaoXi, 造触屏(100, 100))
    quan.chuMoYiDongQuXiao(造触屏(111, 100))
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 20)
    expect(quan.caiDanZhengDaKai.value).toBe(false)
  })

  it('长按未到时长不打开，touchend 撤掉计时器', () => {
    const quan = 挂长按菜单()
    quan.chuMoKaiShi(造文本消息('s', '在吗') as never, 造触屏(100, 100))
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao - 20)
    quan.chuMoJieShu()
    vi.advanceTimersByTime(1000)
    expect(quan.caiDanZhengDaKai.value).toBe(false)
  })

  it('打开期间窗口尺寸变化直接关闭菜单', () => {
    const quan = 挂长按菜单()
    quan.daKaiCaiDan(造文本消息('t', '在吗') as never, 造右键(200, 400))
    expect(quan.caiDanZhengDaKai.value).toBe(true)
    window.dispatchEvent(new Event('resize'))
    expect(quan.caiDanZhengDaKai.value).toBe(false)
  })

  it('执行菜单项先关闭菜单再落到对应依赖', async () => {
    const shiJi: string[] = []
    const quan = 挂长按菜单({
      cheHuiXiaoXi: async (id: string) => {
        shiJi.push(`cheHui:${id}`)
      },
      baoCunMeiTi: async (xiaoXi: { id: string }) => {
        shiJi.push(`baoCun:${xiaoXi.id}`)
      },
      zhiChiTuPianYinYong: true,
    })
    quan.daKaiCaiDan(造消息('tuPian', 'u') as never, 造右键(200, 100))
    await quan.zhiXingCaiDanXiang('baoCunTuPian')
    expect(shiJi).toEqual(['baoCun:u'])
    expect(quan.caiDanZhengDaKai.value).toBe(false)
    quan.daKaiCaiDan(造文本消息('v', '在吗') as never, 造右键(200, 100))
    await quan.zhiXingCaiDanXiang('cheHui')
    expect(shiJi).toEqual(['baoCun:u', 'cheHui:v'])
  })

  it('未知菜单项与不属于当前菜单的项都不执行任何业务动作', async () => {
    const shiJi: string[] = []
    const quan = 挂长按菜单({
      cheHuiXiaoXi: async (id: string) => {
        shiJi.push(`cheHui:${id}`)
      },
      baoCunMeiTi: async () => {
        shiJi.push('baoCun')
      },
      tianJiaDaoBiaoQing: async () => {
        shiJi.push('biaoQing')
      },
      qieHuanYuYinZhuanWenZi: async () => {
        shiJi.push('zhuanWenZi')
      },
      fuZhiWenBen: async () => {
        shiJi.push('fuZhi')
        return true
      },
      fanYiQingQiu: async () => {
        shiJi.push('fanYi')
        return 'ok'
      },
      zhiChiTuPianYinYong: true,
    })
    quan.daKaiCaiDan(造文本消息('x1', '在吗') as never, 造右键(200, 100))
    await quan.zhiXingCaiDanXiang('weiZhiXiang' as never)
    await quan.zhiXingCaiDanXiang('baoCunTuPian')
    await quan.zhiXingCaiDanXiang('tianJiaDaoBiaoQing')
    expect(shiJi).toEqual([])
    expect(quan.caiDanZhengDaKai.value).toBe(false)
    quan.daKaiCaiDan(造消息('yuYin', 'x2') as never, 造右键(200, 100))
    await quan.zhiXingCaiDanXiang('tianJiaDaoBiaoQing')
    await quan.zhiXingCaiDanXiang('fuZhi')
    expect(shiJi).toEqual([])
    quan.daKaiCaiDan(造消息('wenJian', 'x3') as never, 造右键(200, 100))
    await quan.zhiXingCaiDanXiang('yuYinZhuanWenZi')
    expect(shiJi).toEqual([])
    quan.daKaiCaiDan(造文本消息('x4', '在吗') as never, 造右键(200, 100))
    await quan.zhiXingCaiDanXiang('cheHui')
    expect(shiJi).toEqual(['cheHui:x4'])
  })

  it('引用项写入引用目标且可撤销', async () => {
    const quan = 挂长按菜单()
    quan.daKaiCaiDan(造文本消息('w', '在吗') as never, 造右键(200, 100))
    await quan.zhiXingCaiDanXiang('yinYong')
    expect(quan.yinYongXiaoXi.value?.id).toBe('w')
    expect(quan.caiDanZhengDaKai.value).toBe(false)
    quan.quXiaoYinYong()
    expect(quan.yinYongXiaoXi.value).toBeNull()
  })
})

describe('消息操作菜单单一真源与皮肤隔离契约', () => {
  const 组件源 = readFileSync(组件路径, 'utf8')
  const 样式源 = readFileSync(菜单样式路径, 'utf8')
  const 气泡样式源 = readFileSync(气泡样式路径, 'utf8')
  const 逻辑源 = readFileSync(resolve(__dirname, '../composables/use长按菜单.ts'), 'utf8')

  it('菜单只有一份组件，两页各引用一次且不写内联菜单结构', () => {
    const 聊天组件 = readdirSync(resolve(__dirname, '../components/聊天')).filter((名) =>
      名.endsWith('.vue'),
    )
    expect(聊天组件.filter((名) => 名.includes('菜单'))).toEqual(['消息操作菜单.vue'])
    for (const 文件 of ['聊天页面.vue', '好友聊天.vue']) {
      const 源 = 读视图(文件)
      expect(源.match(/<XiaoXiCaoZuoCaiDan/g)).toHaveLength(1)
      expect(源).toContain("import XiaoXiCaoZuoCaiDan from '@/components/聊天/消息操作菜单.vue'")
      expect(源).not.toContain('chehui-zhezhao')
      expect(源).not.toContain('chehui-caidan')
      expect(源).not.toContain('chehui-weiba')
      expect(源).not.toContain('chehui-xiangmu')
      expect(源).not.toContain('xiaoxi-caidan-xiangmu')
      expect(源).not.toContain('clip-path')
      expect(源).not.toContain('qipao-weiba--')
    }
  })

  it('两页传给菜单的数据与事件契约完全一致', () => {
    const 契约 = [
      ':kai-qi="caiDanZhengDaKai"',
      ':ji-dian="dangQianJiDian"',
      ':cai-dan-xiang="dangQianCaiDanXiang"',
      '@guan-bi="guanBiCaiDan"',
      '@xuan-zhong="zhiXingCaiDanXiang"',
    ]
    for (const 文件 of ['聊天页面.vue', '好友聊天.vue']) {
      const 源 = 读视图(文件)
      契约.forEach((行) => expect(源).toContain(行))
    }
  })

  it('菜单外观脱离气泡皮肤：组件与菜单样式都不读皮肤变量，也不挂尾巴', () => {
    expect(组件源).not.toMatch(/--qipao/)
    expect(样式源).not.toMatch(/--qipao/)
    expect(样式源).not.toMatch(/--chehui-caidan/)
    expect(组件源).not.toContain('QiPaoWeiBa')
    expect(组件源).not.toContain('气泡尾巴')
    for (const 文件 of ['聊天页面.vue', '好友聊天.vue']) {
      const 源 = 读视图(文件)
      expect(源).not.toContain('QiPaoWeiBa')
      expect(源).not.toContain("'--qipao-caidan-weiba-x'")
      expect(源).not.toContain("'--qipao-nei-rong-bei-jing'")
      expect(源).not.toContain("'--qipao-nei-rong-wen-ben'")
      expect(源).not.toContain("'--qipao-weiba-tian-chong'")
    }
  })

  it('菜单规则已从气泡样式表迁出且输入辅助规则保持不动', () => {
    expect(气泡样式源).not.toContain('chehui')
    expect(气泡样式源).not.toContain('ceng-caidan')
    expect(气泡样式源).toContain('.shuru-fu-zhu {')
    expect(气泡样式源).toContain('.biaoqing-tishi {')
  })

  it('深浅色各自成组的独立令牌，危险项与焦点态都有专属色', () => {
    expect(样式源).toMatch(
      /:root,\s*:root\[data-theme="dark"\]\s*\{[^}]*--xiaoxi-caidan-beijing:\s*rgba\(24,/,
    )
    expect(样式源).toMatch(
      /:root\[data-theme="light"\]\s*\{[^}]*--xiaoxi-caidan-beijing:\s*rgba\(255,/,
    )
    expect(样式源).toContain('--xiaoxi-caidan-weixian: #ff453a;')
    expect(样式源).toContain('--xiaoxi-caidan-weixian: #d70015;')
    expect(样式源).toContain('.xiaoxi-caidan-xiangmu--weixian')
    expect(样式源).toContain('outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse)')
    expect(样式源).toContain('z-index: var(--ceng-caidan)')
  })

  it('触控热区不小于 44px 且由令牌下发', () => {
    expect(样式源).toContain('--xiaoxi-caidan-xiang-gao: 44px;')
    expect(样式源).toContain('min-height: var(--xiaoxi-caidan-xiang-gao)')
  })

  it('浮层有最大高度保护，菜单项文案全部走翻译表', () => {
    expect(组件源).toContain('maxHeight')
    expect(组件源).toContain("huoQuFanYi('liaoTian', jian)")
    expect(组件源).not.toMatch(/class="[^"]*">\s*[\u4e00-\u9fa5]/)
  })

  it('生命周期结构证据：跟踪只在展开时注册、只在收起时摘除，挂载钩子不碰跟踪', () => {
    expect(取函数体(组件源, 'dingWei')).toContain('kaiShiGenZong()')
    expect(取函数体(组件源, 'shouQiCaiDan')).toContain('jieShuGenZong()')
    expect(取函数体(组件源, 'tongBuZhuangTai')).toContain('zhanKaiCaiDan()')
    expect(取函数体(组件源, 'tongBuZhuangTai')).toContain('shouQiCaiDan()')
    expect(取函数体(组件源, 'zhanKaiCaiDan')).toContain('document.activeElement')
    expect(取函数体(组件源, 'shouQiCaiDan')).toContain('huiFuYuanSu')
    expect(组件源).toMatch(/watch\(\s*\(\)\s*=>\s*\[[^\]]*\][^\n]*,\s*tongBuZhuangTai,\s*\)/)
    expect(取钩子体(组件源, 'onMounted')).not.toContain('kaiShiGenZong')
    expect(取钩子体(组件源, 'onMounted')).not.toContain('jieShuGenZong')
    expect(取钩子体(组件源, 'onBeforeUnmount')).not.toContain('kaiShiGenZong')
  })

  it('定稿可见后才自动聚焦：focus 排在 data-ding-gao 写回的下一拍', () => {
    expect(组件源).toMatch(/dingGao\.value = true\s*void nextTick\(\(\) => \{[\s\S]*?focus\(/)
  })

  it('定位实现只有一套：菜单复用通用浮层定位，长按逻辑不再自算几何', () => {
    expect(组件源).toContain("import { 使用浮层定位 } from '@/components/通用菜单.vue'")
    expect(逻辑源).not.toContain('getBoundingClientRect')
    expect(逻辑源).not.toContain('window.innerWidth')
    expect(逻辑源).not.toContain('weiBaX')
    expect(逻辑源).not.toContain('requestAnimationFrame')
    expect(逻辑源).not.toContain('dingGaoCaiDanWeiZhi')
  })

  it('几何常量都在消息配置真源，旧的尾巴常量已删除', () => {
    const 配置源 = readFileSync(resolve(__dirname, '../config/消息配置.ts'), 'utf8')
    expect(配置源).toContain('caiDanZuiDaGaoDu: 320')
    expect(配置源).toContain('caiDanZuiXiaoKuanDu: 176')
    expect(配置源).toContain('caiDanZuiDaKuanDu: 268')
    expect(配置源).toContain('caiDanBianJu: 16')
    expect(配置源).not.toContain('caiDanWeiBaJianGe')
    expect(配置源).not.toContain('caiDanWeiBaNeiSuo')
    expect(配置源).not.toContain('caiDanYuGuKuan')
    expect(配置源).not.toContain('caiDanYuGuGao')
    expect(配置源).not.toContain('caiDanXiaFangPianYi')
  })

  it('iOS 长按目标禁系统预览：消息行组件内声明 touch-callout 与 user-select', () => {
    const 行源 = readFileSync(resolve(__dirname, '../components/聊天/消息行.vue'), 'utf8')
    expect(行源).toContain('-webkit-touch-callout: none')
    expect(行源).toContain('user-select: none')
  })
})

describe('聊天时间条按微信十二小时制显示', () => {
  const 造 = (y: number, mo: number, d: number, h: number, mi: number): Date =>
    new Date(y, mo - 1, d, h, mi, 0, 0)

  it.each([
    [0, 0, '凌晨0:00'],
    [5, 59, '凌晨5:59'],
    [6, 0, '早上6:00'],
    [8, 59, '早上8:59'],
    [9, 0, '上午9:00'],
    [11, 5, '上午11:05'],
    [11, 59, '上午11:59'],
    [12, 0, '中午12:00'],
    [12, 30, '中午12:30'],
    [13, 59, '中午1:59'],
    [14, 0, '下午2:00'],
    [17, 30, '下午5:30'],
    [18, 0, '晚上6:00'],
    [20, 24, '晚上8:24'],
    [23, 59, '晚上11:59'],
  ] satisfies Array<[number, number, string]>)(
    '同一天 %02d:%02d 只显示时段与时间，输出 %s',
    (shi, fen, 期望) => {
      expect(geShiHuaXiaoXiShiJian(造(2026, 10, 23, shi, fen), 造(2026, 10, 23, 23, 0))).toBe(期望)
    },
  )

  it('昨天 23:59 在次日 00:00 之后查看显示「昨天 晚上11:59」', () => {
    expect(geShiHuaXiaoXiShiJian(造(2026, 10, 22, 23, 59), 造(2026, 10, 23, 0, 0))).toBe(
      '昨天 晚上11:59',
    )
  })

  it('元旦查看前一年最后一天仍优先显示昨天', () => {
    expect(geShiHuaXiaoXiShiJian(造(2025, 12, 31, 8, 10), 造(2026, 1, 1, 9, 0))).toBe(
      '昨天 早上8:10',
    )
  })

  it('往前数七天内的前天到六天前显示星期', () => {
    const 现在 = 造(2026, 10, 25, 12, 0)
    const 期望表: Array<[number, string]> = [
      [21, '星期三'],
      [20, '星期二'],
      [19, '星期一'],
    ]
    for (const [ri, qianZhui] of 期望表) {
      expect(geShiHuaXiaoXiShiJian(造(2026, 10, ri, 12, 0), 现在)).toBe(`${qianZhui} 中午12:00`)
    }
  })

  it('上周但仍在七天内的消息显示星期而不退化成日期', () => {
    const 现在 = 造(2026, 10, 21, 9, 0)
    const 目标 = 造(2026, 10, 19, 9, 0)
    expect(geShiHuaXiaoXiShiJian(目标, 现在)).toBe('星期一 上午9:00')
  })

  it('第七天起改用月日格式且月日不带前导零', () => {
    expect(geShiHuaXiaoXiShiJian(造(2026, 10, 18, 9, 0), 造(2026, 10, 25, 9, 0))).toBe(
      '10月18日 上午9:00',
    )
    expect(geShiHuaXiaoXiShiJian(造(2026, 1, 5, 9, 0), 造(2026, 10, 23, 9, 0))).toBe(
      '1月5日 上午9:00',
    )
  })

  it('今年内更早的消息显示「M月D日 时段时间」', () => {
    expect(geShiHuaXiaoXiShiJian(造(2026, 10, 10, 9, 5), 造(2026, 10, 23, 20, 0))).toBe(
      '10月10日 上午9:05',
    )
  })

  it('跨年消息显示「YYYY年M月D日 时段时间」', () => {
    expect(geShiHuaXiaoXiShiJian(造(2025, 3, 5, 14, 30), 造(2026, 10, 23, 20, 0))).toBe(
      '2025年3月5日 下午2:30',
    )
    expect(geShiHuaXiaoXiShiJian(造(2025, 10, 23, 20, 0), 造(2026, 10, 23, 20, 0))).toBe(
      '2025年10月23日 晚上8:00',
    )
  })

  it('时间戳晚于现在时只输出时段与时间', () => {
    expect(geShiHuaXiaoXiShiJian(造(2026, 10, 24, 7, 0), 造(2026, 10, 23, 20, 0))).toBe(
      '早上7:00',
    )
  })
})

describe('时间条文本由翻译表下发，工具函数零中文硬编码', () => {
  const 源 = readFileSync(resolve(__dirname, '../utils/消息时间分组.ts'), 'utf8')
    .split('\n')
    .filter((行) => !/^\s*import\b/.test(行))
    .join('\n')

  it('消息时间分组.ts 的字符串字面量里没有中文字符', () => {
    const 中文字面量 = [...源.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g)]
      .map((匹配) => 匹配[1] ?? 匹配[2] ?? 匹配[3] ?? '')
      .filter((值) => /[一-鿿]/.test(值))
    expect(中文字面量).toEqual([])
  })

  it('时段前缀全部来自翻译表 shiJian 分组', () => {
    for (const [jian, 文本] of [
      ['lingChen', '凌晨'],
      ['zaoShang', '早上'],
      ['shangWu', '上午'],
      ['zhongWu', '中午'],
      ['xiaWu', '下午'],
      ['wanShang', '晚上'],
    ] as const) {
      expect(huoQuFanYi('shiJian', jian)).toBe(文本)
    }
  })
})

describe('聊天时间条按微信五分钟规则插入', () => {
  const 基准 = Date.UTC(2026, 9, 23, 4, 0, 0)
  const 造 = (pianYiHaoMiao: number) => ({ shi_jian_chuo: 基准 + pianYiHaoMiao })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 23, 12, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('不足五分钟且同一天不重复插入时间条', () => {
    const 组 = fenZuXiaoXiAnShiJian([造(0), 造(4 * 60 * 1000 + 59 * 1000)])
    expect(组).toHaveLength(1)
    expect(组[0].xiaoXiLieBiao).toHaveLength(2)
  })

  it('恰好五分钟仍在同一组，超过五分钟另起一组', () => {
    expect(fenZuXiaoXiAnShiJian([造(0), 造(5 * 60 * 1000)])).toHaveLength(1)
    const 组 = fenZuXiaoXiAnShiJian([造(0), 造(5 * 60 * 1000 + 1000)])
    expect(组).toHaveLength(2)
    expect(组[0].shiJian).toBe('中午12:00')
    expect(组[1].shiJian).toBe('中午12:05')
  })

  it('时间条文本按东八区墙上时间渲染', () => {
    const 组 = fenZuXiaoXiAnShiJian([{ shi_jian_chuo: Date.UTC(2026, 9, 23, 12, 0, 0) }])
    expect(组[0].shiJian).toBe('晚上8:00')
  })

  it('跨天即使不足五分钟也另起一组', () => {
    const 昨夜 = Date.UTC(2026, 9, 22, 15, 58, 0)
    const 今晨 = Date.UTC(2026, 9, 22, 16, 2, 0)
    const 组 = fenZuXiaoXiAnShiJian([
      { shi_jian_chuo: 昨夜 },
      { shi_jian_chuo: 今晨 },
      { shi_jian_chuo: 今晨 + 4 * 60 * 1000 },
    ])
    expect(组).toHaveLength(2)
    expect(组[0].shiJian).toBe('昨天 晚上11:58')
    expect(组[0].xiaoXiLieBiao).toHaveLength(1)
    expect(组[1].shiJian).toBe('凌晨0:02')
    expect(组[1].xiaoXiLieBiao).toHaveLength(2)
  })

  it('时间戳倒序时另起一组，不并入上一组', () => {
    expect(fenZuXiaoXiAnShiJian([造(10 * 60 * 1000), 造(0)])).toHaveLength(2)
  })

  it('同一时间戳的多条消息合并到同一组', () => {
    expect(fenZuXiaoXiAnShiJian([造(0), 造(0)])).toHaveLength(1)
  })
})
