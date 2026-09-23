import { expect, type Page } from '@playwright/test'
import * as zlib from 'node:zlib'

/**
 * FP-10c「图文真内联」输入区（contenteditable）在 Playwright 侧的**唯一**取样/操作入口。
 *
 * 为什么必须有这一份（而不是各 spec 各抄一遍）：
 * 改造前的载体是 `<textarea>`，用例里散着一整套 textarea 专属读法 ——
 * `page.inputValue()`、`HTMLTextAreaElement.value`、`.selectionStart/.selectionEnd`、
 * `.style.maxHeight`（那是已删除的 use输入框.ts JS 量高链写上去的内联样式）。
 * 换载体后这些读法逐条失效或变成恒空，其中 `inputValue()` 在 1.63 的判定是
 * 「非 input/textarea ⇒ 直接抛」（`Node is not an <input>`），不是返回空串。
 * 于是读侧一律走 `page.evaluate` 遍历真 DOM，口径与
 * `src/components/聊天/图文输入区.vue::xuLieHua` 逐字对齐：
 * 文字段取 textContent、`<br>` 计一个换行、图片块是原子节点且不计入文字。
 *
 * 写侧只准用**真实用户手势**（点选、键盘、文件选择），不直接改 DOM：
 * 组件的渲染口径是「签名比对 → 必要时重建 → 光标按（块 id, 偏移）恢复」，
 * 绕过事件链直接改 innerHTML 会得到一份「DOM 有、真源没有」的假状态，测不到真东西。
 */

/** 编辑器本体（AI 聊天页与好友页共用同一个组件，类名契约一致） */
export const 编辑器 = '.shuru-kuang'
/** 编辑器外壳（FP-05 等高判定的那一只盒） */
export const 外壳 = '.shuru-kuang-waike'
/** 图片/贴纸块（原子节点，contenteditable=false） */
export const 图片块 = '.shuru-kuang .dai-fa-kuai--tu'
/** 文字段宿主（纯文本态下一条都没有 ⇒ 这本身就是一条判据，见 反证·纯文本态不物化块） */
export const 文字段 = '.shuru-kuang .dai-fa-kuai--wen'
/** 相册那个隐藏文件输入框（两页同一个类名与 accept，块一律插在真源光标处） */
export const 相册输入 = 'input.yincang-wenjian-shuru[type="file"][accept="image/*"]'

export type 块条目 = {
  序: number
  类型: '文字' | '图片'
  id: string
  文本: string
  类: string
  src: string
  原子: string
  可拖: string
}

export type 光标形态 = {
  有选区: boolean
  锚点节点名: string
  锚点是编辑器: boolean
  锚点在编辑器内: boolean
  锚点偏移: number
  编辑器已聚焦: boolean
  激活元素类: string
}

type 结构 = { 块序: 块条目[]; 全文: string; 占位: string; 占位计算值: string; 空态: boolean }

/** 与组件内 xuLieHua 同口径的一次遍历（读侧唯一实现，各 spec 不得再抄第二份） */
async function 读结构原始(页: Page): Promise<结构> {
  return 页.evaluate((选择器) => {
    const 编辑 = document.querySelector(选择器) as HTMLElement | null
    if (!编辑) return { 块序: [], 全文: '', 占位: '', 占位计算值: '', 空态: false }
    const 块序: 块条目[] = []
    let 全文 = ''
    // 与组件 xuLieHua 同一条前置判定：空编辑器只剩一个供光标落脚的 <br> 是结构节点，
    // 不是用户打的一个换行。读侧漏掉这一条，「清空后」就会量出 '\n'（组件真源里却是 ''），
    // 于是 读文本 与 .wei-kong 自相矛盾 —— 载体契约用例里把这两者的等价关系钉住了。
    if (编辑.childNodes.length === 1 && 编辑.firstChild?.nodeName === 'BR') {
      const 空样式 = getComputedStyle(编辑, '::before')
      return {
        块序,
        全文: '',
        占位: 编辑.getAttribute('data-zhan-wei') ?? '',
        占位计算值: 空样式.content ?? '',
        空态: 编辑.classList.contains('wei-kong'),
      }
    }

    const 元素文字 = (节: Element): string => {
      let 文 = ''
      for (const 子 of Array.from(节.childNodes)) {
        if (子.nodeType === Node.TEXT_NODE) 文 += 子.textContent ?? ''
        else if (子.nodeName === 'BR') 文 += '\n'
        else if (子.nodeType === Node.ELEMENT_NODE) 文 += 元素文字(子 as Element)
      }
      return 文
    }
    const 走 = (父: Node): void => {
      for (const 子 of Array.from(父.childNodes)) {
        if (子.nodeType === Node.TEXT_NODE) {
          全文 += 子.textContent ?? ''
          continue
        }
        if (子.nodeName === 'BR') {
          全文 += '\n'
          continue
        }
        if (子.nodeType !== Node.ELEMENT_NODE) continue
        const 元 = 子 as HTMLElement
        if (元.classList.contains('dai-fa-kuai--tu')) {
          const 图 = 元.querySelector('img')
          块序[块序.length] = {
            序: 块序.length,
            类型: '图片',
            id: 元.getAttribute('data-kuai-id') ?? '',
            文本: '',
            类: 图 ? String(图.className) : 元.className,
            src: 图 ? 图.getAttribute('src') ?? '' : '',
            原子: 元.getAttribute('contenteditable') ?? '',
            可拖: 元.getAttribute('draggable') ?? '',
          }
          continue
        }
        const 归属 = 元.getAttribute('data-kuai-id') ?? ''
        if (元.classList.contains('dai-fa-kuai--wen') && 归属 !== '') {
          const 文 = 元素文字(元)
          全文 += 文
          块序[块序.length] = {
            序: 块序.length,
            类型: '文字',
            id: 归属,
            文本: 文,
            类: 元.className,
            src: '',
            原子: 元.getAttribute('contenteditable') ?? '',
            可拖: 元.getAttribute('draggable') ?? '',
          }
          continue
        }
        走(元)
      }
    }
    走(编辑)
    const 样式 = getComputedStyle(编辑, '::before')
    return {
      块序,
      全文,
      占位: 编辑.getAttribute('data-zhan-wei') ?? '',
      占位计算值: 样式.content ?? '',
      空态: 编辑.classList.contains('wei-kong'),
    }
  }, 编辑器)
}

/** 整条流的纯文字投影（图片块不计入），口径 = 组件的 touYingWenBen */
export async function 读文本(页: Page): Promise<string> {
  return (await 读结构原始(页)).全文
}

/** DOM 里图文混排的先后序（含每段文字与每个图片块的 id） */
export async function 读块序(页: Page): Promise<块条目[]> {
  return (await 读结构原始(页)).块序
}

/** 图片块 id 序列（按 DOM 序） */
export async function 读图片块id(页: Page): Promise<string[]> {
  return (await 读块序(页)).filter((项) => 项.类型 === '图片').map((项) => 项.id)
}

export async function 读图片块数(页: Page): Promise<number> {
  return 页.locator(图片块).count()
}

/** 占位符三件套：翻译真源(data-zhan-wei) + 是否空态 + ::before 是否真的把它画出来了 */
export async function 读占位(页: Page): Promise<{ 文本: string; 计算值: string; 空态: boolean }> {
  const 结 = await 读结构原始(页)
  return { 文本: 结.占位, 计算值: 结.占位计算值, 空态: 结.空态 }
}

/** 此刻浏览器选区的锚点形态：`锚点是编辑器 && 锚点偏移＝子节点下标` 正是 jsdom 造不出的那一条 */
export async function 读光标形态(页: Page): Promise<光标形态> {
  return 页.evaluate(
    (选择器) => {
      const 编辑 = document.querySelector(选择器) as HTMLElement | null
      const 选 = typeof window.getSelection === 'function' ? window.getSelection() : null
      const 锚 = 选 && 选.rangeCount > 0 ? 选.anchorNode : null
      return {
        有选区: !!选 && 选.rangeCount > 0,
        锚点节点名: 锚 ? 锚.nodeName : '(无)',
        锚点是编辑器: !!锚 && !!编辑 && 锚 === 编辑,
        锚点在编辑器内: !!锚 && !!编辑 && (锚 === 编辑 || 编辑.contains(锚)),
        锚点偏移: 选 && 选.rangeCount > 0 ? 选.anchorOffset : -1,
        编辑器已聚焦: !!编辑 && document.activeElement === 编辑,
        激活元素类: document.activeElement ? String(document.activeElement.className || document.activeElement.tagName) : '(无)',
      }
    },
    编辑器,
  )
}

/* ───────────────────────────── 写侧：真实用户手势 ───────────────────────────── */

/** 用真实键鼠把编辑器清空（全选 + Delete），不碰 DOM */
export async function 清空文本(页: Page): Promise<void> {
  await 页.locator(编辑器).click()
  await 页.keyboard.press('Control+A')
  await 页.keyboard.press('Delete')
  await expect
    .poll(async () => 读文本(页), { timeout: 15000, message: '全选删除后文字流未清空' })
    .toBe('')
}

/** 逐键输入一段文字（真实 input 事件链，走组件自己的 chuLiBianJi） */
export async function 输入文本(页: Page, 文本: string): Promise<void> {
  await 页.locator(编辑器).click()
  await 页.keyboard.type(文本, { delay: 8 })
  await expect
    .poll(async () => 读文本(页), { timeout: 15000, message: `逐键输入后文字流不等于输入值：${文本}` })
    .toBe(文本)
}

/**
 * 多行一次性灌进去（Playwright 的 fill 在 contenteditable 上走 selectText + execCommand('insertText')，
 * 换行由浏览器整批落成 <br>，之后组件按 xuLieHua 读回）。
 * 注意：不要用它的通过与否去判「逐行敲 Shift+Enter」那条链 —— fill 绕开了
 * 「换行后重建 → 光标按 (块 id, 偏移) 恢复 → 接着打字」这一整段（fp10c ⑦ 才是那一段的判据）。
 */
const 换行 = String.fromCharCode(10)

export async function 写入多行(页: Page, 行清单: string[]): Promise<void> {
  await 页.locator(编辑器).fill(行清单.join(换行))
  await expect
    .poll(async () => 读文本(页), { timeout: 15000, message: '多行写入后文字流不等于各行拼接' })
    .toBe(行清单.join(换行))
}

/** 替换式输入（与旧 page.fill 同语义：先全选删干净，再逐键敲） */
export async function 替换文本(页: Page, 文本: string): Promise<void> {
  await 页.locator(编辑器).click()
  await 页.keyboard.press('Control+A')
  await 页.keyboard.press('Delete')
  await 页.keyboard.type(文本, { delay: 8 })
  await expect
    .poll(async () => 读文本(页), { timeout: 15000, message: `替换输入后文字流不等于输入值：${文本}` })
    .toBe(文本)
}

/** 逐行敲键（真实 Shift+Enter 换行链）：每一步都回读文字流，换行被吞时能定位到具体第几行 */
export type 敲入步 = { 步: string; 文本: string }

export async function 逐行敲入(页: Page, 行清单: string[]): Promise<敲入步[]> {
  await 页.locator(编辑器).click()
  const 逐步: 敲入步[] = []
  for (let 序 = 0; 序 < 行清单.length; 序 += 1) {
    if (序 > 0) {
      await 页.keyboard.press('Shift+Enter')
      await 页.waitForTimeout(200)
      逐步.push({ 步: `第${序 + 1}行换行后`, 文本: await 读文本(页) })
    }
    await 页.keyboard.type(行清单[序], { delay: 12 })
    await 页.waitForTimeout(200)
    逐步.push({ 步: `第${序 + 1}行敲完`, 文本: await 读文本(页) })
  }
  return 逐步
}

/** 第 n 个字符（整条文字流内绝对偏移）的 caret 像素坐标：Range 量出来的，不是猜的 */
async function 文字光标坐标(页: Page, 偏移: number): Promise<{ x: number; y: number }> {
  return 页.evaluate(
    ([选择器, pian]) => {
      const 编辑 = document.querySelector(选择器) as HTMLElement | null
      if (!编辑) throw new Error('找不到编辑器盒')
      const 树 = document.createTreeWalker(编辑, NodeFilter.SHOW_TEXT)
      let 已数 = 0
      let 节 = 树.nextNode() as Text | null
      while (节) {
        const 长 = (节.textContent ?? '').length
        if (已数 + 长 >= pian) {
          const 范 = document.createRange()
          范.setStart(节, Math.max(0, Math.min(长, pian - 已数)))
          范.setEnd(节, Math.max(0, Math.min(长, pian - 已数)))
          const 矩 = 范.getBoundingClientRect()
          const 父矩 = (节.parentElement ?? 编辑).getBoundingClientRect()
          const x = 矩.width > 0 || 矩.left !== 0 ? 矩.left : 父矩.left
          const y = 矩.height > 0 ? 矩.top + 矩.height / 2 : 父矩.top + 父矩.height / 2
          return { x: x + 0.5, y }
        }
        已数 += 长
        节 = 树.nextNode() as Text | null
      }
      const 末矩 = 编辑.getBoundingClientRect()
      return { x: 末矩.right - 4, y: 末矩.top + 末矩.height / 2 }
    },
    [编辑器, 偏移] as const,
  )
}

/** 真实点选：把光标放到整条文字流的第 n 个字符处（n=0 即文字最前，n=长度 即文字最后） */
export async function 点击文字偏移(页: Page, 偏移: number): Promise<void> {
  const 点 = await 文字光标坐标(页, 偏移)
  await 页.mouse.click(点.x, 点.y)
  await 页.waitForTimeout(120)
}

/**
 * 块盒与编辑器可视区**交集**上的取点（左/右侧各外扩 外扩 px）。
 * 为什么不能直接用块自己的竖直中心：折叠态编辑器 max-height 只有 35px，而块缩略图 64px，
 * 块盒中心已经落到编辑器可视区之外，点下去打在 footer 背景上（锚点跑到页面别处），
 * 测的就不是「真机点在块左/右侧」这件事了。
 */
async function 块侧取点(页: Page, id: string, 侧: '左' | '右', 外扩: number): Promise<{ x: number; y: number }> {
  return 页.evaluate(
    ([编, 图, 块id, 方, 外]) => {
      const 编辑 = document.querySelector(编) as HTMLElement | null
      const 块 = document.querySelector(`${图}[data-kuai-id="${块id}"]`) as HTMLElement | null
      if (!编辑 || !块) throw new Error(`取不到块盒或编辑器盒：${块id}`)
      const 块矩 = 块.getBoundingClientRect()
      const 编矩 = 编辑.getBoundingClientRect()
      const 上 = Math.max(块矩.top, 编矩.top)
      const 下 = Math.min(块矩.bottom, 编矩.bottom)
      if (下 - 上 < 1) {
        throw new Error(
          `块与编辑器可视区无交集（块被整体裁掉）：块 ${块矩.top.toFixed(2)}~${块矩.bottom.toFixed(2)} 编辑器 ${编矩.top.toFixed(2)}~${编矩.bottom.toFixed(2)}`,
        )
      }
      return { x: 方 === '左' ? 块矩.left - 外 : 块矩.right + 外, y: (上 + 下) / 2 }
    },
    [编辑器, 图片块, id, 侧, 外扩] as const,
  )
}

/**
 * 真机点在图片块**左侧**：块是编辑器首子节点时落点排在编辑器自身的 padding 上，
 * 浏览器给出的锚点形态正是 `anchorNode===编辑器 && anchorOffset===子节点下标`
 * （jsdom 结构上造不出这一支 ⇒ vitest 侧永远测不到）。
 */
export async function 点击块左(页: Page, id: string, 外扩 = 2): Promise<void> {
  const 点 = await 块侧取点(页, id, '左', 外扩)
  await 页.mouse.click(点.x, 点.y)
  await 页.waitForTimeout(120)
}

/** 真机点在图片块**右侧** */
export async function 点击块右(页: Page, id: string, 外扩 = 2): Promise<void> {
  const 点 = await 块侧取点(页, id, '右', 外扩)
  await 页.mouse.click(点.x, 点.y)
  await 页.waitForTimeout(120)
}

/** 折叠态里一块图片究竟露出多少（64px 缩略图会不会被 35px 的盒裁掉） */
export async function 读块可视率(页: Page, id: string): Promise<{
  块高: number
  可视高: number
  可视比: number
  编辑器clientHeight: number
  编辑器scrollHeight: number
}> {
  return 页.evaluate(
    ([编, 图, 块id]) => {
      const 编辑 = document.querySelector(编) as HTMLElement
      const 块 = document.querySelector(`${图}[data-kuai-id="${块id}"]`) as HTMLElement
      const 编矩 = 编辑.getBoundingClientRect()
      const 块矩 = 块.getBoundingClientRect()
      const 可视 = Math.max(0, Math.min(块矩.bottom, 编矩.bottom) - Math.max(块矩.top, 编矩.top))
      return {
        块高: +块矩.height.toFixed(2),
        可视高: +可视.toFixed(2),
        可视比: 块矩.height > 0 ? +(可视 / 块矩.height).toFixed(3) : 0,
        编辑器clientHeight: 编辑.clientHeight,
        编辑器scrollHeight: 编辑.scrollHeight,
      }
    },
    [编辑器, 图片块, id] as const,
  )
}

export type 落点 = '编辑器' | { 文字偏移: number } | { 块左: string } | { 块右: string }

/** 把光标放到指定落点（全程真实手势），并回读这一刻的选区锚点形态 */
export async function 聚焦到(页: Page, 落点: 落点): Promise<光标形态> {
  if (落点 === '编辑器') await 页.locator(编辑器).click()
  else if ('文字偏移' in 落点) await 点击文字偏移(页, 落点.文字偏移)
  else if ('块左' in 落点) await 点击块左(页, 落点.块左)
  else await 点击块右(页, 落点.块右)
  return 读光标形态(页)
}

/** 生成一张纯色 PNG（不依赖仓库素材，也不走 SVG 的 canvas 污染路径） */
export function 纯色PNG(宽 = 20, 高 = 20, RGB: [number, number, number] = [255, 0, 0]): Buffer {
  const crc表: number[] = []
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc表[n] = c >>> 0
  }
  const crc = (字节: Buffer): number => {
    let c = 0xffffffff
    for (const b of 字节) c = crc表[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const 装块 = (类名: string, 数据段: Buffer): Buffer => {
    const 长 = Buffer.alloc(4)
    长.writeUInt32BE(数据段.length)
    const 负载 = Buffer.concat([Buffer.from(类名, 'ascii'), 数据段])
    const 校 = Buffer.alloc(4)
    校.writeUInt32BE(crc(负载))
    return Buffer.concat([长, 负载, 校])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(宽, 0)
  ihdr.writeUInt32BE(高, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const 像素 = Buffer.alloc(宽 * 高 * 3)
  for (let i = 0; i < 宽 * 高; i += 1) {
    像素[i * 3] = RGB[0]
    像素[i * 3 + 1] = RGB[1]
    像素[i * 3 + 2] = RGB[2]
  }
  const 条带 = Buffer.alloc(高 * (宽 * 3 + 1))
  for (let y = 0; y < 高; y += 1) {
    条带[y * (宽 * 3 + 1)] = 0
    像素.copy(条带, y * (宽 * 3 + 1) + 1, y * 宽 * 3, (y + 1) * 宽 * 3)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    装块('IHDR', ihdr),
    装块('IDAT', zlib.deflateSync(条带)),
    装块('IEND', Buffer.alloc(0)),
  ])
}

/**
 * 在指定落点插一张相册图：块必须落在光标处，这是 FP-10c 的立身判据。
 * 返回「新增的那个块」的 id（按插入前后 id 集合做差得到，不猜顺序）。
 */
export async function 聚焦并插块(页: Page, 落点: 落点, 文件?: { 名: string; RGB?: [number, number, number] }): Promise<{ 新块id: string; 光标: 光标形态 }> {
  const 前 = await 读图片块id(页)
  const 光标 = await 聚焦到(页, 落点)
  const 缓冲 = 纯色PNG(20, 20, 文件?.RGB ?? [255, 0, 0])
  await 页.locator(相册输入).first().setInputFiles({
    name: 文件?.名 ?? 'fp10c-kuai.png',
    mimeType: 'image/png',
    buffer: 缓冲,
  })
  await expect
    .poll(async () => (await 读图片块id(页)).length, { timeout: 20000, message: '相册图未进待发块序列' })
    .toBe(前.length + 1)
  const 后 = await 读图片块id(页)
  const 新块 = 后.find((id) => !前.includes(id)) ?? ''
  return { 新块id: 新块, 光标 }
}

/** 点块上的 × 单块删除（类名契约自 FP-10b 逐字沿用） */
export async function 删除块(页: Page, id: string): Promise<void> {
  const 钮 = 页.locator(`${图片块}[data-kuai-id="${id}"] .dai-fa-kuai-shanchu`)
  await expect(钮, `块 ${id} 上没有删除钮`).toHaveCount(1)
  await 钮.click()
  await expect
    .poll(async () => (await 读图片块id(页)).includes(id), { timeout: 15000, message: `点 × 后块 ${id} 仍在序列里` })
    .toBe(false)
}

/* ───────────────────────────── 几何 / 过渡 ───────────────────────────── */

/**
 * 折叠态输入区与图标盒的同源几何。
 * 改造前折叠高由 use输入框.ts 写成内联 maxHeight（于是 FP-20⑦ 量到与图标盒 0.61px 的差）；
 * FP-10c 起折叠/展开是纯 CSS 的 min-/max-height，两档都吃 variables.css 的令牌 ⇒ 差值应当恰为 0。
 */
export async function 读输入区几何(页: Page): Promise<{
  编辑器高: number
  外壳高: number
  图标: Record<string, number>
  令牌: { danxing: string; tubiao: string; zhanKai: string }
  计算: { minHeight: string; maxHeight: string; 展开类: boolean }
}> {
  return 页.evaluate(
    ([编辑选择器, 外壳选择器, 图标选择器]) => {
      const 根样式 = getComputedStyle(document.documentElement)
      const 编辑 = document.querySelector(编辑选择器) as HTMLElement
      const 外壳元 = document.querySelector(外壳选择器) as HTMLElement
      const 图标: Record<string, number> = {}
      for (const 项 of 图标选择器 as Array<[string, string]>) {
        const 元 = document.querySelector(项[1]) as HTMLElement | null
        图标[项[0]] = 元 ? 元.getBoundingClientRect().height : Number.NaN
      }
      const 算 = getComputedStyle(编辑)
      return {
        编辑器高: 编辑.getBoundingClientRect().height,
        外壳高: 外壳元 ? 外壳元.getBoundingClientRect().height : Number.NaN,
        图标,
        令牌: {
          danxing: 根样式.getPropertyValue('--shuru-danxing-gao-du').trim(),
          tubiao: 根样式.getPropertyValue('--shuru-tubiao-chicun').trim(),
          zhanKai: 根样式.getPropertyValue('--shuru-zhan-kai-gao-du').trim(),
        },
        计算: { minHeight: 算.minHeight, maxHeight: 算.maxHeight, 展开类: 编辑.classList.contains('zhan-kai') },
      }
    },
    [编辑器, 外壳, [['表情', '.biaoqing-anniu'], ['加号', '.gengduo-plus-anniu'], ['语音', '.yuyin-anniu'], ['展开', '.zhan-kai-anniu'], ['发送', '.fasong-anniu']] as const] as const,
  )
}

/** 滚动条几何（折叠态溢出用）：contenteditable 上 scrollTop 依然可用，失配的只有 .value 一族 */
export async function 读滚动(页: Page): Promise<{ scrollHeight: number; clientHeight: number; scrollTop: number; 生效条宽: number; scrollbarWidth属: string }> {
  return 页.evaluate((选择器) => {
    const 元 = document.querySelector(选择器) as HTMLElement
    const 算 = getComputedStyle(元)
    const 矩 = 元.getBoundingClientRect()
    const 边 = parseFloat(算.borderLeftWidth) || 0
    return {
      scrollHeight: 元.scrollHeight,
      clientHeight: 元.clientHeight,
      scrollTop: 元.scrollTop,
      生效条宽: Math.max(0, Math.round((矩.width - 元.clientWidth - 边 * 2) * 100) / 100),
      scrollbarWidth属: 算.scrollbarWidth,
    }
  }, 编辑器)
}

export async function 滚动归零(页: Page): Promise<void> {
  await 页.evaluate((选择器) => {
    ;(document.querySelector(选择器) as HTMLElement).scrollTop = 0
  }, 编辑器)
}

/** 选区长度（旧 textarea 用 selectionEnd-selectionStart，真内联下只能读 Selection） */
export async function 读选区长度(页: Page): Promise<number> {
  return 页.evaluate(() => {
    const 选 = window.getSelection()
    if (!选 || 选.rangeCount === 0) return 0
    return 选.toString().length
  })
}

/**
 * 等淡出层消失（FP-02 的 .biaodan-qiehuan-leave-active）：
 * 那一只 leave-active 在过渡期间还挂在 DOM 上并吃 pointer-events，
 * 不等它就点下一只按钮 ⇒ 点击落进正在淡出的层（假失败，且和输入区改不改都无关）。
 */
export async function 等淡出层消失(页: Page, 类名 = 'biaodan-qiehuan-leave-active'): Promise<void> {
  await 页.waitForFunction(
    (名) => document.querySelector(`.${名}`) === null,
    类名,
    { timeout: 15000 },
  )
}

/* ───────────────────── 面板开合的「终态」等待（取样基建，不动判据） ───────────────────── */

/** 面板此刻的占位高（不存在 / 收起 ⇒ 0） */
async function 面板高(页: Page, 选择器: string): Promise<number> {
  return 页.evaluate((名) => (document.querySelector(名) as HTMLElement | null)?.offsetHeight ?? 0, 选择器)
}

/**
 * 等面板真的收合（offsetHeight 归零）。
 * 为什么要挂在事件上而不是「稳定窗轮询」：面板的展开是 CSS max-height 过渡，主线程被 3D 背景压到
 * 亚帧率时动画是**步进**的 ⇒ 连续两次量到同一个 y 完全可能是「这一帧还没画」，于是把还在生长的
 * 中间帧当成终态（本轮 fp-verify-chat-input 桌面 表情关 实测面板仍 200px/外顶 y 655 就是这么来的）。
 * 等不到不静默放过：返回现场，由调用方的判据定罪。
 */
export async function 等面板收合(页: Page, 选择器 = '.emoji-mianban', 毫秒 = 15000): Promise<{ 收合: boolean; 高: number }> {
  const 终 = Date.now() + 毫秒
  for (;;) {
    const 高 = await 面板高(页, 选择器)
    if (高 === 0) return { 收合: true, 高: 0 }
    if (Date.now() > 终) return { 收合: false, 高 }
    await 页.waitForTimeout(150)
  }
}

/** 等面板展开到不再变化（连续三次同值 ⇒ 过渡真的停了，而不是被饿帧的中间值） */
export async function 等面板展开(页: Page, 选择器 = '.emoji-mianban', 毫秒 = 15000): Promise<{ 展开: boolean; 高: number }> {
  const 终 = Date.now() + 毫秒
  let 连同 = 0
  let 前 = -1
  for (;;) {
    const 现 = await 面板高(页, 选择器)
    if (现 > 0 && 现 === 前) 连同 += 1
    else 连同 = 0
    if (连同 >= 2) return { 展开: true, 高: 现 }
    前 = 现
    if (Date.now() > 终) return { 展开: false, 高: 现 }
    await 页.waitForTimeout(150)
  }
}

/* ───────────────── 待发块删除靶的可命中性（320px 档的归因取样） ───────────────── */

/**
 * × 删除钮的盒 / 编辑器的可视盒 / 两者是否相交 / 该点上的命中者是谁。
 * 只为把「点不到」写成可归因的数值（本轮 ⑤ 移动 320 的 timeout 就是这么烧掉的），不改任何判据。
 */
export async function 读删除钮命中(页: Page, id: string): Promise<{
  钮: { x: number; y: number; 宽: number; 高: number } | null
  编辑器: { 上: number; 下: number; 左: number; 右: number }
  相交: boolean
  命中者: string
}> {
  return 页.evaluate(
    ([编, 图, 块id]) => {
      const 编辑 = document.querySelector(编) as HTMLElement | null
      const 钮 = document.querySelector(`${图}[data-kuai-id="${块id}"] .dai-fa-kuai-shanchu`) as HTMLElement | null
      if (!编辑) throw new Error('取不到编辑器盒')
      const 编矩 = 编辑.getBoundingClientRect()
      const 出 = {
        钮: null as { x: number; y: number; 宽: number; 高: number } | null,
        编辑器: { 上: +编矩.top.toFixed(2), 下: +编矩.bottom.toFixed(2), 左: +编矩.left.toFixed(2), 右: +编矩.right.toFixed(2) },
        相交: false,
        命中者: '(无钮)',
      }
      if (!钮) return 出
      const 矩 = 钮.getBoundingClientRect()
      出.钮 = { x: +矩.left.toFixed(2), y: +矩.top.toFixed(2), 宽: +矩.width.toFixed(2), 高: +矩.height.toFixed(2) }
      出.相交 = 矩.bottom > 编矩.top + 0.5 && 矩.top < 编矩.bottom - 0.5 && 矩.right > 编矩.left + 0.5 && 矩.left < 编矩.right - 0.5
      const 点 = document.elementFromPoint(矩.left + 矩.width / 2, 矩.top + 矩.height / 2)
      出.命中者 = 点 ? `${点.tagName}.${String(点.className || '').slice(0, 60)}` : '(视口外)'
      return 出
    },
    [编辑器, 图片块, id] as const,
  )
}

/** 后台压缩替换预览 blob 落定：块序（含 src）连续两次一致才继续取证 */
export async function 等块落定(页: Page, 期望块数?: number): Promise<void> {
  if (期望块数 !== undefined) {
    await expect
      .poll(async () => 页.locator(图片块).count(), { timeout: 20000, message: `待发图片块数不等于期望值 ${期望块数}` })
      .toBe(期望块数)
  }
  let 前 = ''
  for (let i = 0; i < 12; i += 1) {
    const 现 = JSON.stringify(await 读块序(页))
    if (现 === 前) return
    前 = 现
    await 页.waitForTimeout(250)
  }
}

/** 页面横向溢出（移动端档位用） */
export async function 读横向溢出(页: Page): Promise<{ scrollWidth: number; clientWidth: number; 溢出: boolean; 编辑器溢出: boolean; 编辑器scrollWidth: number; 编辑器clientWidth: number }> {
  return 页.evaluate((选择器) => {
    const 编 = document.querySelector(选择器) as HTMLElement | null
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      溢出: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      编辑器溢出: !!编 && 编.scrollWidth > 编.clientWidth + 1,
      编辑器scrollWidth: 编 ? 编.scrollWidth : -1,
      编辑器clientWidth: 编 ? 编.clientWidth : -1,
    }
  }, 编辑器)
}
