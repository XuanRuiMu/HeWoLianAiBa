import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { parse } from '@vue/compiler-sfc'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import { use待发图文, type BianJiQiDuan, type DaiFaGuangBiao } from '@/composables/use待发图文'
import { XIAO_XI_KUAI_LEI_XING } from '@/utils/消息内容块'
import { huoQuFanYi } from '@/config/translations'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { 层叠胜出, 令牌名, 规则清单, type 探针, type 规则 } from './CSS级联真源'
import { 解析几何数值, 声明位置 } from './主题令牌真源'
import { duQuShuRuQuText, fangZhiGuangBiao, kuaiXuLieShuRuQu, xieRuShuRuQu } from './输入区夹具'

/**
 * FP-10c（用户需求 #6 终态）图文真内联输入区的守门。判定一律走行为 / 层叠解析值 / DOM，
 * 不接受「源码里含有某串」充当结论（B10 病理）。
 *
 *  ①一份两页共用：两页都不再内联输入区，textarea 与 use输入框.ts 的 JS 量高链在链路上命中 0；
 *  ②块与文字同一条流：块插在**光标处**（句首/句中/句尾）、DOM 序 == 块数组序、整块一次退格删除、
 *    块可拖拽改序与单块删除，且状态真源仍是 use待发图文（组件内零第二份块状态）；
 *  ③行为齐：IME 组合期不回写 DOM、粘贴文本＝纯文本插入、Enter 发送 / Shift+Enter 换行、
 *    placeholder 走既有翻译键、超限沿用既有口径；
 *  ④折叠态盒高**严格等于** --shuru-danxing-gao-du（收 FP-20⑦ 的 0.61px）；类名契约自 FP-10b 的
 *    待发序列组件逐字沿用（FP-24a 的 contain 与 64px 缩略图判定语义不变）。
 */

const 源目录 = resolve(__dirname, '..')
const 组件路径 = 'components/聊天/图文输入区.vue'

function 读源(相对路径: string): string {
  return readFileSync(join(源目录, 相对路径), 'utf-8')
}

function 样式规则(相对路径: string): 规则[] {
  const { descriptor, errors } = parse(读源(相对路径), { filename: 相对路径 })
  if (errors.length > 0) throw new Error(`${相对路径} 解析失败：${errors[0].message}`)
  if (descriptor.styles.length === 0) throw new Error(`${相对路径} 没有 style 段`)
  // FP-10c-12：命令式节点（JS createElement 的待发块）的样式搬进了非 scoped 段——
  // 一个组件允许「scoped（模板节点）+ 普通（命令式节点）」两段；层叠判定吃全部段的拼接，
  // 判定本体（谁命中、谁压住谁、令牌解析）一字不改。
  return 规则清单(descriptor.styles.map((段) => 段.content).join('\n'))
}

function 遍历(目录: string): string[] {
  const 结果: string[] = []
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    if (项.name === '__tests__' || 项.name === 'node_modules') continue
    const 完整 = join(目录, 项.name)
    if (项.isDirectory()) 结果.push(...遍历(完整))
    else if (/\.(ts|vue|css)$/.test(项.name)) 结果.push(完整)
  }
  return 结果
}

function 含串的文件(串: RegExp): string[] {
  return 遍历(源目录)
    .filter((路) => 串.test(readFileSync(路, 'utf-8')))
    .map((路) => 路.replace(/\\/g, '/').split('/src/')[1])
    .sort()
}

interface 挂台 {
  wrapper: ReturnType<typeof mount>
  bianJi: ReturnType<typeof use待发图文>
  kuai: () => Array<{ id: string; lei_xing: string; nei_rong: string; yu_lan_url: string | null }>
  读投影: () => string
  写投影: (zhi: string) => void
  回收: string[]
  发送: () => number
  编辑器: () => HTMLElement
}

/** 与两页逐字同构的挂载台：真源＝use待发图文，组件只经 props/emits 接线（测试不另造一套语义） */
function guaZai(选项: { zhanWeiFu?: string; zuiDaChangDu?: number } = {}): 挂台 {
  const shuRuNeiRong = ref('')
  const 回收: string[] = []
  let 发送次数 = 0
  let 序号 = 0
  const bianJi = use待发图文({
    shuRuNeiRong,
    chuangJianYuLan: () => {
      序号 += 1
      return `blob:yu-lan-${序号}`
    },
    huiShouYuLan: (diZhi) => {
      if (diZhi) 回收.push(diZhi)
    },
  })
  const zhuJi = defineComponent({
    setup: () => () =>
      h(TuWenShuRuQu, {
        kuaiLieBiao: bianJi.kuaiLieBiao.value,
        wenBen: shuRuNeiRong.value,
        guangBiao: bianJi.guangBiao.value,
        zhanWeiFu: 选项.zhanWeiFu ?? huoQuFanYi('liaoTian', 'shuRuXiaoXi'),
        zuiDaChangDu: 选项.zuiDaChangDu ?? XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
        onGengXinGuangBiao: (weiZhi: DaiFaGuangBiao) => bianJi.gengXinGuangBiao(weiZhi),
        onBianJi: (duan: BianJiQiDuan[], xianShiXuanRanIds: string[]) =>
          bianJi.tongBuCongBianJiQi(duan, xianShiXuanRanIds),
        onChaRuWenBen: (wenBen: string, weiZhi: DaiFaGuangBiao) => bianJi.chaRuWenZi(wenBen, weiZhi),
        onFaSong: () => {
          发送次数 += 1
        },
        onShanChu: (kuaiId: string) => bianJi.shanChuKuai(kuaiId),
        onYiDong: (congId: string, daoXiaBiao: number) => bianJi.yiDongKuai(congId, daoXiaBiao),
      }),
  })
  // attachTo 是硬要求：不挂进 document 时 jsdom 会静默忽略 addRange ⇒ 光标恒为 0 ⇒ 插块类用例全假绿
  const wrapper = mount(zhuJi, { attachTo: document.body })
  return {
    wrapper,
    bianJi,
    kuai: () =>
      bianJi.kuaiLieBiao.value.map((xiang) => ({
        id: xiang.id,
        lei_xing: xiang.lei_xing,
        nei_rong: xiang.nei_rong,
        yu_lan_url: xiang.yu_lan_url,
      })),
    读投影: () => shuRuNeiRong.value,
    写投影: (zhi: string) => {
      shuRuNeiRong.value = zhi
    },
    回收,
    发送: () => 发送次数,
    编辑器: () => wrapper.find('.shuru-kuang').element as HTMLElement,
  }
}

function 图片(): Blob {
  return new Blob(['tu'], { type: 'image/png' })
}

/** 用户在编辑器里点/键到某处 ⇒ 组件把光标上报进真源；测试走同一条路径，不直接写内部状态 */
async function 上报光标(台: 挂台, pianYi: number): Promise<void> {
  fangZhiGuangBiao(台.编辑器(), pianYi)
  台.编辑器().dispatchEvent(new Event('click', { bubbles: true }))
  await nextTick()
}

async function 落块(台: 挂台): Promise<void> {
  await nextTick()
  await nextTick()
}

/* ---------------- ① 一份两页共用 ---------------- */

describe('FP-10c ① 输入区只有一份实现', () => {
  it('两页都只接唯一组件：页面内不再内联输入区，也没有第二份 .shuru-kuang 度量', () => {
    for (const 页 of ['views/聊天页面.vue', 'views/好友聊天.vue']) {
      const 源 = 读源(页)
      expect(源, `${页} 未接图文输入区唯一实现`).toMatch(
        /import TuWenShuRuQu from '@\/components\/聊天\/图文输入区\.vue'/,
      )
      expect(源, `${页} 未使用组件标签`).toMatch(/<TuWenShuRuQu\b/)
      expect(源, `${页} 仍内联多行文本域`).not.toMatch(/<textarea/)
      expect(源, `${页} 仍自带 .shuru-kuang 规则（第二份度量）`).not.toMatch(/\.shuru-kuang[^-\w]*\s*\{/)
    }
    expect(含串的文件(/class="shuru-kuang[\s"]/), '出现第二处 .shuru-kuang 宿主').toEqual([组件路径])
  })

  it('use输入框.ts 的 JS 量高链彻底删除：文件不在，符号也不许复活', () => {
    expect(existsSync(join(源目录, 'composables/use输入框.ts')), 'JS 量高 composable 又回来了').toBe(false)
    for (const 符号 of [
      'jiSuanDanXingGaoDu',
      'ceLiangShuRuKuang',
      'shiKouGaoDu',
      'shuRuKuangYangShi',
      'zhanKaiAnNiuKeYong',
      'chongSuanShuRuKuangGaoDu',
      'shuRuKuangKeZhanKai',
    ]) {
      expect(含串的文件(new RegExp(`\\b${符号}\\b`)), `${符号} 复活 = 第二套量高真源`).toEqual([])
    }
  })

  it('textarea 在聊天输入区链路命中 0；全库其余命中点恰为已核对的非聊天载体', () => {
    for (const 链路 of [
      'views/聊天页面.vue',
      'views/好友聊天.vue',
      'composables/use待发图文.ts',
      'components/聊天/图文输入区.vue',
    ]) {
      expect(读源(链路), `${链路} 残留 textarea`).not.toMatch(/textarea/i)
    }
    // 已穷尽核对：两处正文/签名编辑域（账号与安全、资料设置向导）+ 两处剪贴板复制回退，与聊天输入区不同源
    expect(含串的文件(/<textarea|HTMLTextAreaElement|'textarea'/)).toEqual([
      'components/军师指导分段.vue',
      'composables/use长按菜单.ts',
      'views/账号与安全.vue',
      'views/资料设置向导.vue',
    ])
  })

  it('待发序列组件随真内联退役；被弃用的类名不留死钩子', () => {
    expect(existsSync(join(源目录, 'components/聊天/待发图文块序列.vue'))).toBe(false)
    for (const 类名 of [
      'dai-fa-kuai-lie',
      'dai-fa-kuai--huodong',
      'dai-fa-kuai-anniu',
      'dai-fa-kuai-xu',
      'dai-fa-kuai-wen',
    ]) {
      expect(含串的文件(new RegExp(类名)), `${类名} 已是孤立类，留着就是第二份契约`).toEqual([])
    }
  })

  it('组件不建第二份块状态：块数组的增删改序手段在组件源码里命中 0', () => {
    const 源 = 读源(组件路径)
    expect(源, '组件不得自己 splice/push/sort 块数组').not.toMatch(/\.(splice|push|sort)\(/)
    expect(源, '组件不得再声明一份块列表').not.toMatch(/ref<\s*DaiFaKuai\s*\[\s*\]/)
    expect(源).toMatch(/kuaiLieBiao\.length\s*===\s*0/)
  })
})

/* ---------------- ② 块与文字同一条流 ---------------- */

describe('FP-10c ② 图文同一条流', () => {
  it('句中落位：文字段被劈成两段、图片排中间，DOM 序 == 块数组序 == 用户看到的顺序', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '先打的一句')
    expect(台.kuai(), '没插过图片 ⇒ 块序列必须仍是空数组（兼容性铁律）').toEqual([])
    await 上报光标(台, 3)
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    expect(台.kuai().map((xiang) => xiang.lei_xing)).toEqual(['wenzi', 'tupian', 'wenzi'])
    expect(台.kuai().map((xiang) => xiang.nei_rong)).toEqual(['先打的', '', '一句'])
    expect(kuaiXuLieShuRuQu(台.wrapper).map((xiang) => xiang.leiXing)).toEqual([
      'wenzi',
      'tupian',
      'wenzi',
    ])
    expect(duQuShuRuQuText(台.wrapper)).toBe('先打的一句')
    expect(台.读投影()).toBe('先打的一句')
    // 幂等键是好友链路逐条发送的地基：插进文字流也不能丢
    expect(台.bianJi.daiFaKuaiLieBiao()[1].mi_deng_jian).toMatch(/^[0-9a-f-]{20,}$/i)
    台.wrapper.unmount()
  })

  it('句尾与句首落位：该有文字的一段就有、该空的那段空，不凭空造字', async () => {
    const 尾 = guaZai()
    await xieRuShuRuQu(尾.wrapper, '尾字')
    尾.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(尾)
    expect(尾.kuai().map((xiang) => [xiang.lei_xing, xiang.nei_rong])).toEqual([
      ['wenzi', '尾字'],
      ['tupian', ''],
      ['wenzi', ''],
    ])
    尾.wrapper.unmount()

    const 头 = guaZai()
    await xieRuShuRuQu(头.wrapper, '头字')
    await 上报光标(头, 0)
    头.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(头)
    // 插入点之后那个可打字段恒存在（光标要落它上面）；插入点之前没有文字就不造空块——
    // 句首插块的结果因此是「图 / 头字」两段，而不是三段子。
    expect(头.kuai().map((xiang) => [xiang.lei_xing, xiang.nei_rong])).toEqual([
      ['tupian', ''],
      ['wenzi', '头字'],
    ])
    expect(duQuShuRuQuText(头.wrapper)).toBe('头字')
    头.wrapper.unmount()
  })

  it('整块一次退格删除：块节点被摘掉后真源少一块、预览地址回收、序列退化回纯文本态', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '一句话')
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    expect(台.kuai()).toHaveLength(3)
    const 图 = 台.kuai()[1]
    expect(台.wrapper.find('.dai-fa-kuai--tu').exists()).toBe(true)
    台.wrapper.find('.dai-fa-kuai--tu').element.remove()
    台.编辑器().dispatchEvent(new Event('input', { bubbles: true }))
    await 落块(台)
    expect(台.kuai(), '块还在真源里 ⇒ 会把一张用户已删的图发出去').toEqual([])
    expect(台.读投影()).toBe('一句话')
    expect(台.回收).toEqual([图.yu_lan_url])
    台.wrapper.unmount()
  })

  it('单块删除：.dai-fa-kuai-shanchu 只摘它自己那一块，另一块与全部文字留下', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, 'ab')
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    expect(台.kuai().filter((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian)).toHaveLength(2)
    const 第一块 = 台.kuai().filter((xiang) => xiang.lei_xing === 'tupian')[0].id
    await 台.wrapper.findAll('.dai-fa-kuai-shanchu')[0].trigger('click')
    await 落块(台)
    const 剩下 = 台.kuai()
    expect(剩下.find((xiang) => xiang.id === 第一块), '点删的那块没被摘掉').toBeUndefined()
    expect(剩下.filter((xiang) => xiang.lei_xing === 'tupian')).toHaveLength(1)
    expect(台.读投影()).toBe('ab')
    expect(台.回收).toHaveLength(1)
    台.wrapper.unmount()
  })

  it('拖拽改序：把块拖到前一个文字段上 ⇒ 真源按那一位改序，文字一字不变', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '先打的一句')
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    const 原先 = 台.kuai().map((xiang) => xiang.id)
    const 卡片 = 台.wrapper.findAll('.dai-fa-kuai--tu')
    expect(卡片).toHaveLength(1)
    await 卡片[0].trigger('dragstart')
    await 台.wrapper.find('.dai-fa-kuai--wen').trigger('drop')
    await 落块(台)
    expect(台.kuai().map((xiang) => xiang.id)).not.toEqual(原先)
    expect(台.kuai()[0].lei_xing).toBe('tupian')
    expect(台.读投影()).toBe('先打的一句')
    台.wrapper.unmount()
  })

  it('外部追加（表情面板/草稿）不抹平图文顺序：后缀增量并进最后一个文字块，块仍夹在中间', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '甲')
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    const 块序 = 台.kuai().map((xiang) => xiang.id)
    const 数组引用 = 台.bianJi.kuaiLieBiao.value
    台.写投影(`${台.读投影()}😀`)
    await 落块(台)
    const 之后 = 台.kuai()
    expect(之后.map((xiang) => xiang.id)).toEqual(块序)
    expect(之后[1].lei_xing).toBe('tupian')
    expect(之后[2].nei_rong).toBe('😀')
    expect(台.读投影()).toBe('甲😀')
    expect(台.bianJi.kuaiLieBiao.value, '块数组被整体换成新对象 ⇒ 呈现层 prop 会读到旧引用').toBe(数组引用)
    台.wrapper.unmount()
  })
})

/* ---------------- ③ 输入行为 ---------------- */

describe('FP-10c ③ 输入行为', () => {
  it('IME 组合期不回写 DOM：组合中的插块不进 DOM，组合结束后补渲染且块不丢', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '拼音')
    const cao = 台.编辑器()
    const 原节点 = cao.firstChild
    cao.dispatchEvent(new Event('compositionstart', { bubbles: true }))
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await nextTick()
    await nextTick()
    expect(cao.querySelector('.dai-fa-kuai--tu'), '组合期重建了 DOM ⇒ 候选字会被吞').toBeNull()
    expect(cao.firstChild, '组合期改写了 DOM 节点').toBe(原节点)
    cao.dispatchEvent(new Event('compositionend', { bubbles: true }))
    await 落块(台)
    expect(cao.querySelector('.dai-fa-kuai--tu'), '组合结束后块没补出来').not.toBeNull()
    expect(台.kuai().filter((xiang) => xiang.lei_xing === 'tupian')).toHaveLength(1)
    台.wrapper.unmount()
  })

  it('粘贴文本＝纯文本插入：富文本载荷不落进 DOM，文字落在光标处', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '前后')
    await 上报光标(台, 2)
    const cao = 台.编辑器()
    const shiJian = new Event('paste', { bubbles: true, cancelable: true }) as Event & {
      clipboardData: { getData: (leiXing: string) => string }
    }
    shiJian.clipboardData = {
      getData: (leiXing: string) => (leiXing === 'text/plain' ? '粘的' : '<b>粘的</b><img src="x">'),
    }
    cao.dispatchEvent(shiJian)
    await 落块(台)
    expect(cao.querySelector('b'), '富文本被塞进输入区').toBeNull()
    expect(cao.querySelector('img'), '粘贴的 HTML 图被塞进输入区').toBeNull()
    expect(shiJian.defaultPrevented, '纯文本粘贴没被拦截 ⇒ 浏览器会按富文本插入').toBe(true)
    expect(台.读投影()).toBe('前后粘的')
    台.wrapper.unmount()
  })

  it('Enter 发送；Shift+Enter 是换行不是发送', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '一句')
    const cao = 台.编辑器()
    const huiChe = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    cao.dispatchEvent(huiChe)
    await nextTick()
    expect(台.发送()).toBe(1)
    expect(huiChe.defaultPrevented).toBe(true)
    const zuHe = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    cao.dispatchEvent(zuHe)
    await 落块(台)
    expect(台.发送(), 'Shift+Enter 不该触发发送').toBe(1)
    expect(zuHe.defaultPrevented).toBe(true)
    expect(台.读投影()).toBe('一句\n')
    台.wrapper.unmount()
  })

  it('占位文本走既有翻译键，且只在真空态显示（有块就不显示）', async () => {
    const 台 = guaZai()
    const cao = 台.编辑器()
    expect(cao.getAttribute('data-zhan-wei')).toBe(huoQuFanYi('liaoTian', 'shuRuXiaoXi'))
    expect(cao.getAttribute('aria-label')).toBe(huoQuFanYi('liaoTian', 'shuRuXiaoXi'))
    expect(cao.classList.contains('wei-kong')).toBe(true)
    await xieRuShuRuQu(台.wrapper, 'x')
    expect(台.编辑器().classList.contains('wei-kong')).toBe(false)
    台.wrapper.unmount()

    const 块台 = guaZai()
    块台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(块台)
    expect(块台.编辑器().classList.contains('wei-kong'), '有块了还显示占位文本').toBe(false)
    块台.wrapper.unmount()
  })

  it('超限沿用既有口径：只拦「再插就超」的纯文本插入，组合输入不拦', () => {
    const 台 = guaZai({ zuiDaChangDu: 10 })
    const cao = 台.编辑器()
    const chaoChang = new Event('beforeinput', { bubbles: true, cancelable: true }) as Event & {
      inputType: string
      data: string
    }
    chaoChang.inputType = 'insertText'
    chaoChang.data = 'x'.repeat(11)
    cao.dispatchEvent(chaoChang)
    expect(chaoChang.defaultPrevented, '超限的纯文本插入没被拦').toBe(true)
    const buChao = new Event('beforeinput', { bubbles: true, cancelable: true }) as Event & {
      inputType: string
      data: string
    }
    buChao.inputType = 'insertText'
    buChao.data = 'abc'
    cao.dispatchEvent(buChao)
    expect(buChao.defaultPrevented, '未超限的插入被误拦').toBe(false)
    const zuHe = new Event('beforeinput', { bubbles: true, cancelable: true }) as Event & {
      inputType: string
      data: string
    }
    zuHe.inputType = 'insertCompositionText'
    zuHe.data = 'x'.repeat(11)
    cao.dispatchEvent(zuHe)
    expect(zuHe.defaultPrevented, '组合输入被拦 ⇒ 拼音候选字会被吞').toBe(false)
    台.wrapper.unmount()
  })
})

/* ---------------- ④ 几何与类名契约 ---------------- */

describe('FP-10c ④ 折叠态盒高与类名契约', () => {
  const 组件规则们 = 样式规则(组件路径)
  const 编辑器: 探针 = { 标签: 'div', 类: ['shuru-kuang'] }
  const 单行高 = 解析几何数值('--shuru-danxing-gao-du')

  it('折叠态 min-height 与 max-height 双双吃 --shuru-danxing-gao-du ⇒ 盒高严格等于解析值', () => {
    expect(单行高).toBe(35)
    for (const 属性 of ['min-height', 'max-height']) {
      const 声明 = 层叠胜出(组件规则们, 编辑器, 属性)
      expect(声明?.值, `折叠态 .shuru-kuang 缺 ${属性}`).toBeDefined()
      expect(令牌名(声明?.值 as string, 属性)).toBe('--shuru-danxing-gao-du')
      expect(解析几何数值(令牌名(声明?.值 as string, 属性))).toBe(单行高)
    }
    // 与图标盒严格同值（FP-20⑦ 那 0.61px 差就是这条不成立）
    expect(解析几何数值('--shuru-tubiao-chicun')).toBe(单行高)
    expect(
      解析几何数值('--shuru-kuang-hangxing-gao') + 解析几何数值('--shuru-kuang-shang-xia-neidian') * 2,
      '内容行高超过折叠档 ⇒ 折叠态必然裁字',
    ).toBeLessThanOrEqual(单行高)
  })

  it('展开档只放开 max-height 且吃新令牌；组件样式体内零像素/零色值字面量', () => {
    const 展开 = 层叠胜出(组件规则们, { 标签: 'div', 类: ['shuru-kuang', 'zhan-kai'] }, 'max-height')
    expect(令牌名(展开?.值 as string, 'max-height')).toBe('--shuru-zhan-kai-gao-du')
    expect(声明位置('--shuru-zhan-kai-gao-du')).toEqual({ 共用: true, 浅色: false, 深色: false })
    const 源 = 读源(组件路径)
    const 样式段 = 源.slice(源.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')
    expect(样式段).not.toMatch(/:\s*[^;]*?\d+(px|vh|rem)\b/)
    expect(样式段).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(样式段).not.toMatch(/rgba?\(/)
  })

  it('溢出滚动仍只有 global.css 一处真源：新组件不引入第二套滚动条规则', () => {
    expect(层叠胜出(组件规则们, 编辑器, 'overflow-y')?.值).toBe('auto')
    // 组件里既不许出现 ::-webkit-scrollbar 伪元素，也不许出现标准 scrollbar-*（global.css 是唯一真源）
    expect(读源(组件路径)).not.toMatch(/-webkit-scrollbar|scrollbar-width|scrollbar-color/)
    const 样式段 = 读源(组件路径).slice(读源(组件路径).indexOf('<style'))
    expect(样式段).not.toMatch(/scrollbar/)
  })

  it('待发块类名逐字沿用：64px 缩略图与贴纸 contain 的层叠结果不变（FP-24a/FP-10a）', () => {
    const 缩略图: 探针 = { 标签: 'img', 类: ['dai-fa-kuai-tu'] }
    const 贴纸: 探针 = { 标签: 'img', 类: ['dai-fa-kuai-tu', 'dai-fa-kuai-tu--biaoqingbao'] }
    expect(令牌名(层叠胜出(组件规则们, 缩略图, 'width')?.值 as string, 'width')).toBe(
      '--daifa-kuai-tu-kuan',
    )
    expect(令牌名(层叠胜出(组件规则们, 缩略图, 'height')?.值 as string, 'height')).toBe(
      '--daifa-kuai-tu-gao',
    )
    expect(解析几何数值('--daifa-kuai-tu-kuan')).toBe(64)
    expect(解析几何数值('--daifa-kuai-tu-gao')).toBe(64)
    expect(层叠胜出(组件规则们, 缩略图, 'object-fit')?.值).toBe('cover')
    expect(层叠胜出(组件规则们, 贴纸, 'object-fit')?.值, '贴纸被 cover 裁切').toBe('contain')
    expect(含串的文件(/dai-fa-kuai/), '出现第二处 dai-fa-kuai 实现').toEqual([组件路径])
  })

  it('真机渲染：原子块的 contenteditable/draggable/alt/aria 与类名都在文字流里', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '一句话')
    台.bianJi.chaRuTuPian(图片(), XIAO_XI_KUAI_LEI_XING.tuPian)
    await 落块(台)
    const 卡 = 台.wrapper.find('.dai-fa-kuai--tu')
    expect(卡.exists()).toBe(true)
    expect(卡.attributes('contenteditable')).toBe('false')
    expect(卡.attributes('draggable')).toBe('true')
    const 图 = 台.wrapper.find('img.dai-fa-kuai-tu')
    expect(图.attributes('alt')).toBe(huoQuFanYi('duoMeiTi', 'tuPianYuLan'))
    expect(台.wrapper.find('.dai-fa-kuai-shanchu').attributes('aria-label')).toBe(
      huoQuFanYi('duoMeiTi', 'kuaiShanChu'),
    )
    台.wrapper.unmount()
  })
})

/* ---------------- 反证：三条守卫真的会咬人（不是空断言） ---------------- */

describe('FP-10c 反证', () => {
  it('反证一：折叠档换成 JS 量高留下的像素字面量（FP-20⑦ 的成因）⇒ 令牌判定当场抛错', () => {
    const 组件规则们 = 样式规则(组件路径)
    const 折叠 = 层叠胜出(组件规则们, { 标签: 'div', 类: ['shuru-kuang'] }, 'min-height')
    expect(() => 令牌名(折叠?.值 as string, 'min-height')).not.toThrow()
    expect(() => 令牌名('34.39px', 'min-height')).toThrow(/不是单一 var\(\) 令牌/)
    expect(解析几何数值('--shuru-danxing-gao-du')).not.toBeCloseTo(34.39, 10)
  })

  it('反证二：插块时不认上报进来的光标（＝改造前「只追加到末尾」）⇒ 块序列就不再是「先打的 / 图 / 一句」', () => {
    const 变异 = use待发图文({ shuRuNeiRong: ref('先打的一句') as never })
    变异.gengXinGuangBiao({ kuaiId: '', pianYi: 3 })
    // 变异点：把光标硬换成「投影末尾」，等价于旧实现里 huoQuGuangBiao 恒返回 null 的好友页
    变异.chaRuTuPian(new Blob(['t'], { type: 'image/png' }), 'tupian', { kuaiId: '', pianYi: 5 })
    expect(变异.kuaiLieBiao.value.map((xiang) => xiang.nei_rong)).toEqual(['先打的一句', '', ''])

    const 正解 = use待发图文({ shuRuNeiRong: ref('先打的一句') as never })
    正解.gengXinGuangBiao({ kuaiId: '', pianYi: 3 })
    正解.chaRuTuPian(new Blob(['t'], { type: 'image/png' }), 'tupian')
    expect(正解.kuaiLieBiao.value.map((xiang) => xiang.nei_rong)).toEqual(['先打的', '', '一句'])
  })

  it('反证三：组件里再建一份本地块状态 ⇒ 「零第二份」的源码判定当场翻红', () => {
    const 源 = 读源(组件路径)
    const 判定 = (hou: string) => /ref<\s*DaiFaKuai\s*\[\s*\]/.test(hou)
    expect(判定(源), '原样就该判定不成立 ⇒ 判定本身是空的').toBe(false)
    expect(判定(`${源}\nconst 第二份 = ref<DaiFaKuai[]>([])`), '变异后仍不成立 ⇒ 抓不住退化').toBe(true)
  })
})
