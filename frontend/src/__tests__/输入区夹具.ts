import type { VueWrapper } from '@vue/test-utils'
import {
  quKongHangShou,
  shiXuanGuaMoWeiHuanXing,
  yingSheHuiDuanPianYi,
} from '@/utils/消息内容块'

/**
 * FP-10c 图文输入区（contenteditable）的**唯一一份**测试夹具。
 *
 * 为什么必须有它：`wrapper.find('.shuru-kuang').setValue(x)` 与 `element.value` 对
 * `<div contenteditable>` 是**静默 no-op**（div 没有 value 属性，VTU 的 setValue 只认
 * input/textarea/select），改判时若不改这里，用例会读到永远为 undefined 的 value 而假绿。
 * 本夹具不做任何兼容 shim（不给 div 造 value 访问器）：它按真实编辑的形态写 DOM，
 * 再派发 input 事件，走的正是组件自己的「DOM → 段序列 → 真源」那条唯一路径。
 *
 * 空白/换行折叠（哨兵摘除、悬空末尾 `<br>` 不算换行）**不在这里另写一份规则**：
 * 一切 import utils/消息内容块.ts 的单一出口，与 图文输入区.vue 实现同一条判定（FP-10c-12）。
 *
 * 关于 attachTo：jsdom 的 Selection.addRange 只认「挂在 document 上的节点」，而 VTU 默认把
 * 组件挂在一个游离容器里 ⇒ 光标恒为 0 ⇒ 一切「插到光标处」都静默退化成插到句首（假绿）。
 * 故夹具在写入的那一小段时间里把宿主子树临时接进 document.body，写完立刻摘回原位：
 * 既不要求每个用例改 mount 选项，也不往 body 里漏节点（漏了会污染 document.body.querySelector 类断言）。
 */

function bianLiWenZiPianDuan(fu: Node): Array<{ jieDian: Text; qiShi: number; changDu: number }> {
  const jieGuo: Array<{ jieDian: Text; qiShi: number; changDu: number }> = []
  let pianYi = 0
  const shou = (jieDian: Node): void => {
    if (jieDian.nodeType === Node.TEXT_NODE) {
      const chang = quKongHangShou(jieDian.textContent ?? '').length
      jieGuo.push({ jieDian: jieDian as Text, qiShi: pianYi, changDu: chang })
      pianYi += chang
      return
    }
    if (jieDian.nodeName === 'BR') {
      if (!shiXuanGuaMoWeiHuanXing(fu, jieDian)) pianYi += 1
      return
    }
    for (const zi of Array.from(jieDian.childNodes)) shou(zi)
  }
  shou(fu)
  return jieGuo
}

function zuiGen(jieDian: Node): Node | null {
  let dangQian: Node | null = jieDian
  while (dangQian && dangQian.parentNode) dangQian = dangQian.parentNode
  return dangQian && dangQian !== document ? dangQian : null
}

/** 在「宿主已接进 document」的窗口内执行 cb；本来就在 document 里（用了 attachTo）则原样执行 */
function zaiXianShiRongQi(cao: HTMLElement, caoZuo: () => void): void {
  const gen = zuiGen(cao)
  if (!gen || document.contains(gen)) {
    caoZuo()
    return
  }
  document.body.appendChild(gen)
  try {
    caoZuo()
  } finally {
    if (gen.parentNode === document.body) document.body.removeChild(gen)
  }
}

function biXuYou(wrapper: VueWrapper<unknown>): HTMLElement {
  const ele = wrapper.find('.shuru-kuang')
  if (!ele.exists()) throw new Error('找不到 .shuru-kuang：图文输入区未渲染（改判点，不是用例失效）')
  return ele.element as HTMLElement
}

/** 把选区放到输入区文字流的第 pianYi 个字符处（<br> 计一个换行、哨兵零贡献），与真机光标同一套偏移口径 */
export function fangZhiGuangBiao(cao: HTMLElement, pianYi: number): void {
  if (typeof document.createRange !== 'function' || typeof window.getSelection !== 'function') {
    throw new Error('环境没有 Range/Selection，光标类用例无法执行（这是环境不成立，不是跳过）')
  }
  const fanWei = document.createRange()
  const mingZhong = bianLiWenZiPianDuan(cao).find(
    (xiang) => pianYi >= xiang.qiShi && pianYi <= xiang.qiShi + xiang.changDu,
  )
  if (mingZhong) {
    fanWei.setStart(
      mingZhong.jieDian,
      yingSheHuiDuanPianYi(
        mingZhong.jieDian.textContent ?? '',
        Math.min(pianYi - mingZhong.qiShi, mingZhong.changDu),
      ),
    )
  } else {
    fanWei.selectNodeContents(cao)
    fanWei.collapse(false)
  }
  fanWei.collapse(true)
  const xuanQu = window.getSelection()
  xuanQu?.removeAllRanges()
  xuanQu?.addRange(fanWei)
  const luoDian = window.getSelection()
  if (!luoDian || luoDian.rangeCount === 0 || !cao.contains(luoDian.anchorNode)) {
    throw new Error('选区落不到输入区内 ⇒ 光标会静默停在 0，本夹具不允许这种假绿发生')
  }
}

/**
 * 把光标锚在**容器本身**的第 xiaBiao 个子节点缝上（anchorNode＝cao、anchorOffset＝下标）：
 * 真机里点原子块左/右缘时 Blink 给的就是这一形态（FP-10c-12 缺陷②的可达路径，
 * 旧的节点内放点夹具构造不出它）。
 */
export function fangZhiRongQiGuangBiao(cao: HTMLElement, xiaBiao: number): void {
  const fanWei = document.createRange()
  fanWei.setStart(cao, xiaBiao)
  fanWei.collapse(true)
  const xuanQu = window.getSelection()
  xuanQu?.removeAllRanges()
  xuanQu?.addRange(fanWei)
  const luoDian = window.getSelection()
  if (!luoDian || luoDian.anchorNode !== cao || luoDian.anchorOffset !== xiaBiao) {
    throw new Error('容器级选区没落位 ⇒ 本夹具不允许边界用例拿着假光标继续跑')
  }
}

/** 写文本（整体替换）并派发 input；光标默认停在文末，与用户「打完一串字」的终态一致 */
export async function xieRuShuRuQu(
  wrapper: VueWrapper<unknown>,
  wenBen: string,
  guangBiaoPianYi?: number,
): Promise<void> {
  const cao = biXuYou(wrapper)
  zaiXianShiRongQi(cao, () => {
    cao.textContent = ''
    if (wenBen === '') cao.appendChild(document.createElement('br'))
    else cao.appendChild(document.createTextNode(wenBen))
    fangZhiGuangBiao(cao, guangBiaoPianYi ?? wenBen.length)
    cao.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

/** 在光标处插入文本（模拟浏览器原生插入后派发 input），用于「粘贴＝纯文本插入」这类判定 */
export async function qianRuShuRuQu(
  wrapper: VueWrapper<unknown>,
  guangBiaoPianYi: number,
  wenBen: string,
): Promise<void> {
  const cao = biXuYou(wrapper)
  zaiXianShiRongQi(cao, () => {
    fangZhiGuangBiao(cao, guangBiaoPianYi)
    const xuanQu = window.getSelection()
    const jieDian = xuanQu && xuanQu.rangeCount > 0 ? xuanQu.anchorNode : null
    if (!jieDian || jieDian.nodeType !== Node.TEXT_NODE) {
      throw new Error('光标没有落在文字节点上，插入前提不成立')
    }
    const pianCha = xuanQu?.anchorOffset ?? 0
    const yuanWen = jieDian.textContent ?? ''
    jieDian.textContent = `${yuanWen.slice(0, pianCha)}${wenBen}${yuanWen.slice(pianCha)}`
    fangZhiGuangBiao(cao, guangBiaoPianYi + wenBen.length)
    cao.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

/** 把光标放到输入区某处并让组件把这一刻上报进真源（与用户点一下编辑器同一条路径） */
export async function dingWeiGuangBiao(
  wrapper: VueWrapper<unknown>,
  pianYi: number,
): Promise<void> {
  const cao = biXuYou(wrapper)
  zaiXianShiRongQi(cao, () => {
    fangZhiGuangBiao(cao, pianYi)
    cao.dispatchEvent(new Event('click', { bubbles: true }))
  })
  await wrapper.vm.$nextTick()
}

/** 读输入区当前呈现的文字（图片块是原子块，不贡献字符；折叠判定走 utils/消息内容块.ts 单一出口） */
export function duQuShuRuQuText(wrapper: VueWrapper<unknown>): string {
  const zhu = biXuYou(wrapper)
  return daYinWenBen(zhu, zhu)
}

function daYinWenBen(jieDian: Node, gen: Node): string {
  if (jieDian.nodeType === Node.TEXT_NODE) return quKongHangShou(jieDian.textContent ?? '')
  if (jieDian.nodeName === 'BR') {
    // 悬空的末尾 <br>＝空态/末行的结构占位，不是用户换行（与 图文输入区.vue::xuLieHua 同一出口）
    return shiXuanGuaMoWeiHuanXing(gen, jieDian) ? '' : '\n'
  }
  // 图片块在文字流里不贡献字符，其删除钮的 × 更不是正文
  if (jieDian.nodeType === Node.ELEMENT_NODE && (jieDian as HTMLElement).classList?.contains('dai-fa-kuai--tu')) {
    return ''
  }
  let jieGuo = ''
  for (const zi of Array.from(jieDian.childNodes)) {
    const bu = daYinWenBen(zi, gen)
    if (bu !== '' && zi.nodeName === 'DIV' && jieGuo !== '') jieGuo = `${jieGuo}\n${bu}`
    else jieGuo += bu
  }
  return jieGuo
}

/** 输入区里块 id 的 DOM 序（图文同一条流的视觉序），文字段与图片块各算一个位置 */
export function kuaiXuLieShuRuQu(
  wrapper: VueWrapper<unknown>,
): Array<{ kuaiId: string; leiXing: string }> {
  const jieGuo: Array<{ kuaiId: string; leiXing: string }> = []
  const shou = (fu: Node): void => {
    for (const zi of Array.from(fu.childNodes)) {
      if (zi.nodeType === Node.TEXT_NODE) {
        if ((zi.textContent ?? '') !== '') jieGuo.push({ kuaiId: '', leiXing: 'wenzi' })
        continue
      }
      if (zi.nodeType !== Node.ELEMENT_NODE) continue
      const ele = zi as HTMLElement
      const kuaiId = ele.getAttribute?.('data-kuai-id') ?? ''
      if (kuaiId !== '') {
        jieGuo.push({ kuaiId, leiXing: ele.classList.contains('dai-fa-kuai--tu') ? 'tupian' : 'wenzi' })
        continue
      }
      shou(zi)
    }
  }
  shou(biXuYou(wrapper))
  return jieGuo
}
