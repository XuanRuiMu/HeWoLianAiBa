import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { parse } from '@vue/compiler-sfc'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import { use待发图文, type BianJiQiDuan, type DaiFaGuangBiao } from '@/composables/use待发图文'
import {
  quKongHangShou,
  shiXuanGuaMoWeiHuanXing,
  SHU_RU_KONG_HANG_SHOU,
  yingSheChuDuanPianYi,
  yingSheHuiDuanPianYi,
} from '@/utils/消息内容块'
import { huoQuFanYi } from '@/config/translations'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import {
  duQuShuRuQuText,
  fangZhiGuangBiao,
  fangZhiRongQiGuangBiao,
  kuaiXuLieShuRuQu,
  xieRuShuRuQu,
} from './输入区夹具'

/**
 * FP-10c-12：需求 #6「图文同区」真浏览器取证暴露的四条缺陷的守卫。
 * jsdom 结构上看不见这四条（scoped 只命中模板节点、Blink 的容器级光标形态与插入点归一化），
 * 所以每条守卫都按「真机取证里观察到的 DOM 形态」在 jsdom 里重建触发面；
 * 真机成对证据住在 `.agents/evidence/traces/FP-10c修复-修前/修后-*`（夹具＝__tests__/FP10c真机夹具.*）。
 *
 *  ① 待发块样式必须住在命令式节点拿得到的样式层（scoped 依赖 data-v-*，JS 节点没有）；
 *  ② 块边界（anchorNode＝容器 + 子节点下标）的光标解析成「文字块端点 / 贴块锚点」，
 *    插块落点击的左/右侧，不再退到末尾；
 *  ③ Shift+Enter 的换行是真源里的持久形态：渲染层在末尾换行后补光标哨兵，
 *    哨兵之后的打字落进下一行，且「真源里只存哨兵之前的正文」；
 *  ④ 图后的打字进尾块（空尾块带哨兵可选点）；空态/换行折叠判定只有 utils/消息内容块.ts
 *    一个出口，本文件的空态判据是独立三件（占位符可见 + 字数 + 待发块数），
 *    不拿折叠函数自己当判据。
 */

const 源目录 = resolve(__dirname, '..')
const 组件路径 = 'components/聊天/图文输入区.vue'

function 读源(相对路径: string): string {
  return readFileSync(join(源目录, 相对路径), 'utf-8')
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
  kuai: () => Array<{ id: string; lei_xing: string; nei_rong: string }>
  读投影: () => string
  编辑器: () => HTMLElement
}

/** 与两页逐字同构的挂载台（真源＝use待发图文；组件只接线），同 FP10c真内联输入区.test.ts */
function guaZai(): 挂台 {
  const shuRuNeiRong = ref('')
  let 序号 = 0
  const bianJi = use待发图文({
    shuRuNeiRong,
    chuangJianYuLan: () => {
      序号 += 1
      return `blob:yu-lan-${序号}`
    },
  })
  const zhuJi = defineComponent({
    setup: () => () =>
      h(TuWenShuRuQu, {
        kuaiLieBiao: bianJi.kuaiLieBiao.value,
        wenBen: shuRuNeiRong.value,
        guangBiao: bianJi.guangBiao.value,
        zhanWeiFu: huoQuFanYi('liaoTian', 'shuRuXiaoXi'),
        zuiDaChangDu: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
        onGengXinGuangBiao: (weiZhi: DaiFaGuangBiao) => bianJi.gengXinGuangBiao(weiZhi),
        onBianJi: (duan: BianJiQiDuan[], ids: string[]) => bianJi.tongBuCongBianJiQi(duan, ids),
        onChaRuWenBen: (wenBen: string, weiZhi: DaiFaGuangBiao) => bianJi.chaRuWenZi(wenBen, weiZhi),
        onFaSong: () => {},
        onShanChu: (id: string) => bianJi.shanChuKuai(id),
        onYiDong: (congId: string, daoXiaBiao: number) => bianJi.yiDongKuai(congId, daoXiaBiao),
      }),
  })
  const wrapper = mount(zhuJi, { attachTo: document.body })
  return {
    wrapper,
    bianJi,
    kuai: () =>
      bianJi.kuaiLieBiao.value.map((xiang) => ({ id: xiang.id, lei_xing: xiang.lei_xing, nei_rong: xiang.nei_rong })),
    读投影: () => shuRuNeiRong.value,
    编辑器: () => wrapper.find('.shuru-kuang').element as HTMLElement,
  }
}

function 图片(): Blob {
  return new Blob(['tu'], { type: 'image/png' })
}

/** 用户在编辑器里键到某处 ⇒ 组件把光标上报进真源（与真机同一出口） */
async function 上报光标(台: 挂台, pianYi: number): Promise<void> {
  fangZhiGuangBiao(台.编辑器(), pianYi)
  台.编辑器().dispatchEvent(new Event('click', { bubbles: true }))
  await nextTick()
}

async function 落块(台: 挂台): Promise<void> {
  await nextTick()
  await nextTick()
}

/** 容器级光标（真机点块缘的形态）→ 让组件沿 @click 路径上报进真源 */
async function 上报容器光标(台: 挂台, xiaBiao: number): Promise<void> {
  const cao = 台.编辑器()
  fangZhiRongQiGuangBiao(cao, xiaBiao)
  cao.dispatchEvent(new Event('click', { bubbles: true }))
  await nextTick()
}

/** 模拟 Blink 在「当前选区落点」原生插入文本：只改节点 + 派发 input，不碰真源 */
async function 原生插入(台: 挂台, jieDian: Text, pianCha: number, wenBen: string): Promise<void> {
  const xuanQu = window.getSelection()
  const fanWei = document.createRange()
  fanWei.setStart(jieDian, pianCha)
  fanWei.collapse(true)
  xuanQu?.removeAllRanges()
  xuanQu?.addRange(fanWei)
  jieDian.textContent = `${jieDian.textContent?.slice(0, pianCha) ?? ''}${wenBen}${jieDian.textContent?.slice(pianCha) ?? ''}`
  台.编辑器().dispatchEvent(new Event('input', { bubbles: true }))
  await 落块(台)
}

/* ---------------- ① 命令式节点的样式层 ---------------- */

describe('FP-10c-12 ① 待发块样式住在命令式节点拿得到的样式层', () => {
  const { descriptor } = parse(读源(组件路径), { filename: 组件路径 })

  it('dai-fa-kuai 家族规则全部住在非 scoped 段，且是裸类名选择器（不依赖 data-v-*/:deep 宿主）', () => {
    expect(descriptor.styles.length, '组件应有「scoped（模板节点）+ 非 scoped（命令式节点）」两段').toBeGreaterThanOrEqual(2)
    const 带块规则的段 = descriptor.styles.filter((段) => /\.dai-fa-kuai/.test(段.content))
    expect(带块规则的段.length, '一条 .dai-fa-kuai 规则都没了（64px/cover 会整族失效）').toBeGreaterThan(0)
    for (const 段 of 带块规则的段) {
      expect(段.scoped === true, 'dai-fa-kuai 规则又回到 scoped 段：document.createElement 的节点拿不到 data-v-*，真机必失效').toBe(false)
      for (const 行 of 段.content.split('\n')) {
        const 选择器 = 行.replace(/\/\*[\s\S]*?\*\//g, '').trim()
        if (/\.dai-fa-kuai[^-]/.test(选择器) && 选择器.endsWith('{')) {
          expect(选择器, '命令式节点的规则不该再依赖宿主链').not.toMatch(/data-v-|:deep/)
        }
      }
    }
  })

  it('几何判定仍成立：缩略图 64×64 + cover、贴纸 contain（数值一个字没动，FP-24a/FP-22b 语义）', () => {
    const 源 = 读源(组件路径)
    expect(源).toMatch(/\.dai-fa-kuai-tu\s*\{[^}]*width:\s*var\(--daifa-kuai-tu-kuan\)/)
    expect(源).toMatch(/\.dai-fa-kuai-tu\s*\{[^}]*height:\s*var\(--daifa-kuai-tu-gao\)/)
    expect(源).toMatch(/\.dai-fa-kuai-tu\s*\{[^}]*object-fit:\s*cover/)
    expect(源).toMatch(/\.dai-fa-kuai-tu--biaoqingbao\s*\{[^}]*object-fit:\s*contain/)
    expect(含串的文件(/dai-fa-kuai/), 'dai-fa-kuai 出现第二处宿主 = 非 scoped 外溢面失控').toEqual([组件路径])
  })

  it('反证一：把待发块规则搬回 scoped 段（真机缺陷①的原点）⇒ 判定当场翻红', () => {
    const 判定 = (源文本: string): boolean => {
      const { descriptor: d } = parse(源文本, { filename: '变异.vue' })
      const 带块规则 = d.styles.filter((段) => /\.dai-fa-kuai/.test(段.content))
      return 带块规则.length > 0 && 带块规则.every((段) => !段.scoped)
    }
    expect(判定(读源(组件路径)), '现组件就该判定通过 ⇒ 判定本身是空的').toBe(true)
    const 变异源 = 读源(组件路径)
      .replace('<style>\n/* 待发块样式【非 scoped · FP-10c-12 根因修】', '<style scoped>\n/* 待发块样式【被搬回 scoped】')
      .replace('/* 待发块样式【非 scoped · FP-10c-12 根因修】', '/* 待发块样式【被搬回 scoped】')
    const { descriptor: 原 } = parse(读源(组件路径), { filename: '原.vue' })
    const 原非scoped段数 = 原.styles.filter((段) => !段.scoped).length
    expect(原非scoped段数, '变异构造失败：没抓到那个非 scoped 段').toBe(1)
    expect(判定(变异源), '搬回 scoped 段后仍判绿 ⇒ 守卫咬不住 FP-10c-12 缺陷①').toBe(false)
  })
})

/* ---------------- ② 块边界插块 ---------------- */

describe('FP-10c-12 ② 块边界（容器级光标）插块落在点击的那一侧', () => {
  it('点图块左侧插第二张 ⇒ 新块在旧块左边（旧行为：退到末尾）', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '甲乙')
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    const 旧图id = 台.kuai()[1].id
    const cao = 台.编辑器()
    expect(Array.from(cao.children).map((zi) => zi.className)).toEqual([
      'dai-fa-kuai dai-fa-kuai--wen',
      'dai-fa-kuai dai-fa-kuai--tu',
      'dai-fa-kuai dai-fa-kuai--wen',
    ])
    // 图块的子节点下标＝1 ⇒ anchorNode=编辑器、anchorOffset=1（真机点图左缘的形态）
    await 上报容器光标(台, 1)
    expect(台.bianJi.guangBiao.value).toEqual({ kuaiId: 台.kuai()[0].id, pianYi: 2 })
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    // 期望块序：[文甲乙, 图新, 文'', 图旧, 文尾] —— 新图严格排在旧图的左边
    expect(台.kuai().map((xiang) => xiang.lei_xing)).toEqual(['wenzi', 'tupian', 'wenzi', 'tupian', 'wenzi'])
    expect(台.kuai()[3].id, '点左侧插的第二张没有落在旧图左边').toBe(旧图id)
    expect(kuaiXuLieShuRuQu(台.wrapper).filter((xiang) => xiang.leiXing === 'tupian')[1].kuaiId).toBe(旧图id)
    台.wrapper.unmount()
  })

  it('点图块右侧插第二张 ⇒ 新块在旧块右边；两图相邻无文字时也落对侧', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '甲乙')
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    const 旧图id = 台.kuai()[1].id
    // 图块右缘＝下标 2（图与尾块之间；尾块为空时真机就是这一锚点）
    await 上报容器光标(台, 2)
    expect(台.bianJi.guangBiao.value).toEqual({ kuaiId: 台.kuai()[2].id, pianYi: 0 })
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    const 图id序 = 台.kuai().filter((xiang) => xiang.lei_xing === 'tupian').map((xiang) => xiang.id)
    expect(图id序[0], '点右侧插的第二张没有排在旧图之后').toBe(旧图id)
    台.wrapper.unmount()

    // 两图之间没有文字：贴块锚点 {图id, 1} ⇒ 新图插在该图之后、下一图之前
    const 间 = guaZai()
    await xieRuShuRuQu(间.wrapper, '甲')
    间.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(间)
    间.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(间)
    const 前图id = 间.kuai().filter((xiang) => xiang.lei_xing === 'tupian')[0].id
    间.bianJi.chaRuTuPian(图片(), 'tupian', { kuaiId: 前图id, pianYi: 1 })
    await 落块(间)
    expect(间.kuai().findIndex((xiang) => xiang.id === 前图id), '被点的图被挤位').toBe(1)
    expect(间.kuai()[2].lei_xing, '贴块右侧锚点的新块没有紧跟在被点的图后面').toBe('tupian')
    间.wrapper.unmount()
  })

  it('反证二：真正失效的块 id（用户删过 DOM）仍走「追加末尾」兜底，守卫没把 fallback 一起废掉', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '甲乙')
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    台.bianJi.chaRuTuPian(图片(), 'tupian', { kuaiId: '已不存在的块', pianYi: 0 })
    await 落块(台)
    const 尾两块 = 台.kuai().slice(-2).map((xiang) => xiang.lei_xing)
    expect(尾两块).toEqual(['tupian', 'wenzi'])
    台.wrapper.unmount()
  })
})

/* ---------------- ③ Shift+Enter 换行持久 ---------------- */

describe('FP-10c-12 ③ Shift+Enter 后继续打字，换行留在原位', () => {
  it('回车后 DOM 末位是光标哨兵（末尾换行的持久锚点），哨兵后打的字落进第二行且不带哨兵残渣', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '第一行短')
    const cao = 台.编辑器()
    const huiChe = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })
    cao.dispatchEvent(huiChe)
    await 落块(台)
    expect(台.读投影()).toBe('第一行短\n')
    const 子 = Array.from(cao.childNodes)
    expect(子.map((zi) => zi.nodeName)).toEqual(['#text', 'BR', '#text'])
    const 哨兵 = 子[2] as Text
    expect(哨兵.textContent).toBe(SHU_RU_KONG_HANG_SHOU)
    // Blink 的真实落点：锚在哨兵文本末尾（容器级 <br> 之后的缝会被归一化回 <br> 之前——缺陷③本体）
    await 原生插入(台, 哨兵, 1, '第二行短')
    expect(台.读投影()).toBe('第一行短\n第二行短')
    expect(duQuShuRuQuText(台.wrapper)).toBe('第一行短\n第二行短')
    expect(台.读投影()).not.toContain(SHU_RU_KONG_HANG_SHOU)
    台.wrapper.unmount()
  })

  it('反证三：Blink 重绘留下的 `[文字, 裸br]` 尾缀是真机常态（缺陷③取证形态）——折叠出口必须判掉它', () => {
    const cao = document.createElement('div')
    cao.appendChild(document.createTextNode('一句'))
    const br = document.createElement('br')
    cao.appendChild(br)
    expect(shiXuanGuaMoWeiHuanXing(cao, br), '末尾无任何后续节点的 br 就该判悬空（结构占位，不是换行）').toBe(true)
    const 锚定 = document.createElement('div')
    锚定.appendChild(document.createTextNode('一句'))
    const 真换行 = document.createElement('br')
    锚定.appendChild(真换行)
    锚定.appendChild(document.createTextNode(SHU_RU_KONG_HANG_SHOU))
    expect(shiXuanGuaMoWeiHuanXing(锚定, 真换行), '带哨兵锚点的末尾换行是真源里的持久换行，不许判掉').toBe(false)
    // 嵌套容器里的尾 br 同样悬空（Blink 用 <div> 包行时的形态）
    const 套 = document.createElement('div')
    const 内层 = document.createElement('div')
    内层.appendChild(document.createTextNode('二句'))
    const 内br = document.createElement('br')
    内层.appendChild(内br)
    套.appendChild(内层)
    expect(shiXuanGuaMoWeiHuanXing(套, 内br)).toBe(true)
  })

  it('Blink 把打字归一化回裸 <br> 之前时，读出的是纯文字（无假换行）——真源不被 DOM 尾缀污染', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '一句')
    const cao = 台.编辑器()
    // 重建取证缺陷③的原始形态：[text '一句', BR]（Blink 在裸 br 之前打字后的 DOM）
    cao.textContent = ''
    const wen = document.createTextNode('一句第二行')
    cao.appendChild(wen)
    cao.appendChild(document.createElement('br'))
    fangZhiGuangBiao(cao, 9)
    cao.dispatchEvent(new Event('input', { bubbles: true }))
    await 落块(台)
    expect(台.读投影()).toBe('一句第二行')
    expect(台.编辑器().classList.contains('wei-kong')).toBe(false)
    台.wrapper.unmount()
  })
})

/* ---------------- ④ 图后打字进尾块 + 空态单一出口 ---------------- */

describe('FP-10c-12 ④ 图后打字与空态折叠', () => {
  it('空尾块带哨兵可选点：图后打的字进尾块（旧真机形态：尾段宽 0、字不进文字流）', async () => {
    const 台 = guaZai()
    await xieRuShuRuQu(台.wrapper, '甲乙')
    await 上报光标(台, 2)
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    const 尾块 = 台.wrapper.findAll('.dai-fa-kuai--wen')[1]
    expect(尾块.element.textContent, '空尾块必须带哨兵锚点，否则 Blink 无处插入（宽 0）').toBe(SHU_RU_KONG_HANG_SHOU)
    const 哨兵 = 尾块.element.firstChild as Text
    await 原生插入(台, 哨兵, 1, '丙丁')
    expect(台.kuai().map((xiang) => [xiang.lei_xing, xiang.nei_rong])).toEqual([
      ['wenzi', '甲乙'],
      ['tupian', ''],
      ['wenzi', '丙丁'],
    ])
    expect(台.读投影()).toBe('甲乙丙丁')
    expect(台.读投影()).not.toContain(SHU_RU_KONG_HANG_SHOU)
    台.wrapper.unmount()
  })

  it('空态判定三件独立判据（占位符可见 + 字数 + 待发块数），删光最后一个字后占位符必须回来', async () => {
    const 台 = guaZai()
    const 判空 = () => ({
      占位符可见: 台.编辑器().classList.contains('wei-kong'),
      字数: 台.读投影().length,
      块数: 台.kuai().length,
    })
    expect(判空()).toEqual({ 占位符可见: true, 字数: 0, 块数: 0 })
    await xieRuShuRuQu(台.wrapper, '只剩一个字')
    expect(判空()).toEqual({ 占位符可见: false, 字数: 5, 块数: 0 })
    // 用户删光：Blink 在纯文本态会把 DOM 留成 [br] 或 [text '', …] 的残形——全部走同一条折叠出口
    const cao = 台.编辑器()
    cao.textContent = ''
    cao.appendChild(document.createElement('br'))
    cao.dispatchEvent(new Event('input', { bubbles: true }))
    await 落块(台)
    expect(判空(), '结构占位 <br> 被读成了一个换行 ⇒ 占位符再也不回来、字数常驻 1/500').toEqual({
      占位符可见: true,
      字数: 0,
      块数: 0,
    })
    // 图后删空（物化态退化）同样回空态
    台.bianJi.chaRuTuPian(图片(), 'tupian')
    await 落块(台)
    expect(判空().块数).toBe(2)
    台.wrapper.find('.dai-fa-kuai--tu').element.remove()
    台.编辑器().dispatchEvent(new Event('input', { bubbles: true }))
    await 落块(台)
    台.bianJi.qingKong()
    await 落块(台)
    expect(判空()).toEqual({ 占位符可见: true, 字数: 0, 块数: 0 })
    台.wrapper.unmount()
  })

  it('折叠判定只有一处实现：实现与夹具 import 同一出口，组件/夹具里不得再写哨兵或悬空 br 的第二份规则', () => {
    expect(含串的文件(/function shiXuanGuaMoWeiHuanXing\(|const SHU_RU_KONG_HANG_SHOU/)).toEqual([
      'utils/消息内容块.ts',
    ])
    const 组件源 = 读源(组件路径)
    expect(组件源).toMatch(/import\s*\{[^}]*shiXuanGuaMoWeiHuanXing[^}]*\}\s*from\s*'@\/utils\/消息内容块'/)
    expect(组件源, '组件又自己数零宽字符 = 第二份折叠规则').not.toMatch(/\\u200[Bb]/)
    const 夹具源 = readFileSync(join(源目录, '__tests__', '输入区夹具.ts'), 'utf-8')
    expect(夹具源).toMatch(/import\s*\{[^}]*shiXuanGuaMoWeiHuanXing[^}]*\}\s*from\s*'@\/utils\/消息内容块'/)
    expect(夹具源, '夹具又自己写悬空 br 判定').not.toMatch(/function shiXuanGua/)
  })

  it('反证四：哨兵⇄偏移互逆在「打字落在哨兵前/后」两种 Blink 形态下都成立', () => {
    const 后插 = `${SHU_RU_KONG_HANG_SHOU}丙丁`
    expect(quKongHangShou(后插)).toBe('丙丁')
    expect(yingSheChuDuanPianYi(后插, 后插.length)).toBe(2)
    expect(yingSheHuiDuanPianYi(后插, 0)).toBe(1)
    const 前插 = `丙丁${SHU_RU_KONG_HANG_SHOU}`
    expect(quKongHangShou(前插)).toBe('丙丁')
    expect(yingSheHuiDuanPianYi(前插, 2)).toBe(3)
    // 反证：若读回侧忘记摘哨兵，进真源的串就会带零宽残渣——DOM 文本 ≠ 真源文本 这一前提本身成立
    expect(前插).not.toBe('丙丁')
  })
})
