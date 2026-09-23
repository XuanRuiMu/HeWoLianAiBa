import type { Page } from '@playwright/test'

// FP-03 需求 #1「点击输入框准备输入时，输入框一上一下出现两条白色的线」的像素判据实现。
// 全库唯一真源：本文件被 FP-03 取证 spec 与 fp11 总门禁共同 import，判据不允许出现第二份抄写。
//
// 判据不读 computed outline，也不认「下划线元素在不在位」，而是对实际渲染出的像素逐行取色：
//   亮条  = 与卡底（图内像素众数色）最大通道差 ≥24 且相对亮度 ≥ 卡面亮度 + 0.05（比卡面更亮的浅条）
//   近白  = 亮条 ∩ 相对亮度 ≥0.30（champagne 以上，即用户口中的「白色的线」；用于分档标注，不放行任何档）
//   判定带 = 聚焦输入框上/下各 6px，且排除输入框自身的 border 行与 outline 行，分四段：
//             上·框外 [环顶-6, 环顶-1] / 上·内缘 [顶+borderTop, +5]
//             下·内缘 [底-borderBottom-6, -1] / 下·框外 [环底+1, 环底+6]
//           ——焦点环是本 FP 刻意保留的可见反馈、实线边框是既有设计，都不算缺陷；
//             而本缺陷的装饰线画在输入框自身的下内边距区内（bottom:0; height:2px），故判定带必须含内缘行，只测框外会漏判。
//   行合格 = 该行在窗口（输入框左右各内缩 2px）内存在长度 ≥ max(40px, 窗口宽 50%) 的**连续**亮条段
//            ——浮动标签文字（≈15% 窗宽）、眼睛图标、按钮圆角都到不了这个连续度
//   条带  = 连续（容 ≤2 行空隙合并）的合格行；薄条带 = 厚度 ≤4 行（粗于此的是块状填充而不是「线」）
//   环残影 = 『像素取证口径定案』④「焦点环跨行 ±2 行容差」的落地，FP-30 收严为**能量守恒**判定：
//            焦点环在垂直方向最多贡献「自身厚度 px」的覆盖率，跨行分摊只是把这 1px 拆成几段 ⇒
//            豁免对象只能是「相邻环边的 ±2 行窗口内、窗口内实测覆盖率合计 ≤ 环厚度×1.05 + 容差」的连续行集合。
//            孤立一行 t≈1（贴着环画的一条满强度实线）会把窗口合计顶到 2.0 ⇒ 不豁免、必检（FP-27 逐行豁免会放过它）。
//            异色装饰线（香槟金）根本不在内插段上，两版判据都照旧命中。

export type 矩形 = { 左: number; 右: number; 上: number; 下: number }

export type 判定段 = { 名: string; 行: number[] }

export type 输入框几何 = {
  选择器: string
  矩形: 矩形
  outlineStyle: string
  outlineWidthPx: number
  outlineOffsetPx: number
  outlineColor: string
  borderTopPx: number
  borderBottomPx: number
  环占有行: number[]
  环顶占有行: number[]
  环底占有行: number[]
  段: 判定段[]
}

export type 几何 = {
  视口: { 宽: number; 高: number }
  设备像素比: number
  卡矩形: 矩形
  卡底计算色: string
  输入框: 输入框几何[]
}

export type 条带 = {
  起始行: number
  结束行: number
  厚度: number
  中位亮条色: string
  相对亮度: number
  对卡面色差: number
  档: '近白' | '亮条'
  连续段宽: number
  最近边: string
  边偏移: number
}

export type 能量行 = {
  行: number
  是环行: boolean
  覆盖率: number | null
  计入: number
  可豁免: boolean
}

/** FP-30：一个输入框一条环边的能量守恒台账（反证取证要能逐行复算） */
export type 能量台账 = {
  选择器: string
  环边: '顶' | '底'
  窗口起: number
  窗口止: number
  环厚度行: number
  合计覆盖率: number
  预算: number
  豁免: boolean
  行: 能量行[]
}

export type 普查结果 = {
  几何: 几何
  可视卡矩形: 矩形
  合成卡底色: string
  卡面相对亮度: number
  全卡普查: 条带[]
  判定带命中: { 选择器: string; 段: string; 条带: 条带 }[]
  能量台账: 能量台账[]
}

function 色串(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`
}

function 拆色(色: string): [number, number, number] {
  const 数 = 色.match(/[\d.]+/g)
  if (!数 || 数.length < 3) return [0, 0, 0]
  return [Number(数[0]), Number(数[1]), Number(数[2])]
}

function 最大通道差(a: string, b: string): number {
  const x = 拆色(a)
  const y = 拆色(b)
  return Math.max(Math.abs(x[0] - y[0]), Math.abs(x[1] - y[1]), Math.abs(x[2] - y[2]))
}

/**
 * 『像素取证口径定案』④：焦点环跨行按 ±2 行容差 —— FP-30 收严为能量守恒。
 *
 * Chromium 在亚像素布局下把 1px 焦点环按覆盖率摊到相邻两个设备行（FP-27 实测：暗色 / 手机 375x667
 * 聚焦 #denglu-shoujihao，框底 389.2、算式排定的环占有行 [339,389]，而环色 --jujiao-huan-yanse
 * #8eafc5 的 47%/43% 两份分摊分别落在 389 与 390 行，第 390 行实测 rgb(75,93,113)、Δ=67、
 * 连续 241px 落在「下·框外」判定带首行）。只按算式排除环自己那一行，就会把这条残影读成需求 #1 的亮条。
 *
 * FP-27 那版「逐行独立豁免」留了口子：一条**与环同色、贴着环画**的 2px 实线（正是 FP-03 真因线的几何
 * `bottom:0; height:2px`）每行都满足 t≈1 且 距环行≤2 ⇒ 逐行全部豁免 ⇒ 漏检。
 *
 * FP-30 的收严＝加一个「能量」维度，不收紧任何容差：
 *  ① 空间门不变：该行距任一环行 ≤2 行（同 FP-27 条件①，按环边展开成 ±2 行窗口）；
 *  ② 色相门不变：该行色仍须落在「卡底色 → outline 色」内插段上（容差 6/通道，同 FP-27 条件②）；
 *  ③ **新增**：把该环边 ±2 行窗口内所有满足 ①② 的行（含环自己那几行）实测覆盖率 t 求和，
 *     只有 合计 ≤ 环厚度行 × 1.05 + 能量容差 才整窗豁免——1px 环最多贡献 1px 能量，跨行分摊只是把它拆开，
 *     合计 0.91（FP-27 真实场景）仍是残影；贴一条满强度同色线就把合计推到 2.0（孤立 1px）/3.0（2px），必检。
 * ⇒ 香槟金 #e3c98e（Δ=192）那类**异色**装饰线仍不在内插段上，照旧命中；FP-03 的真因检测力不降。
 */
const 环分摊上限 = 1.05

/**
 * 能量容差 0.25：t 与 Δ 单调（FP-27 实测 t=0.435 ↔ Δ=67 ⇒ Δ24 门限对应 t≈0.156），
 * 0.25 ≈ 1.6 倍「刚好可见」强度，覆盖栅格化边缘渗染与内插拟合噪声；一条满强度线（t≈1）是它的 4 倍，
 * 且预算 1×1.05+0.25=1.30 仍远低于「环 1.0 + 线 1.0」的 2.0 ⇒ 不会把满强度实线放过去。
 */
const 能量容差 = 0.25

/** 行色落在「卡底色 → outline 色」内插段上时返回覆盖率 t，否则 null（含环色不比卡面亮的情形） */
function 共线覆盖率(行色: string, 环色: string, 卡底: string): number | null {
  const c = 拆色(行色)
  const o = 拆色(环色)
  const b = 拆色(卡底)
  const 总差 = o[0] - b[0] + (o[1] - b[1]) + (o[2] - b[2])
  if (总差 <= 0) return null
  const t = (c[0] - b[0] + (c[1] - b[1]) + (c[2] - b[2])) / 总差
  if (t <= 0 || t > 环分摊上限) return null
  const 在内插段上 = c.every((值, 序) => Math.abs(值 - (b[序] + t * (o[序] - b[序]))) <= 6)
  return 在内插段上 ? t : null
}

function 相对亮度(色: string): number {
  const [r, g, b] = 拆色(色).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const 页内几何 = (参数: { 卡选择器: string; 输入框选择器: string[] }): 几何 => {
  const 卡 = document.querySelector(参数.卡选择器) as HTMLElement
  const 卡r = 卡.getBoundingClientRect()
  const 输入框清单: 输入框几何[] = []
  for (const 选 of 参数.输入框选择器) {
    const 元 = document.querySelector(选) as HTMLElement | null
    if (!元) continue
    const rr = 元.getBoundingClientRect()
    const cs = getComputedStyle(元)
    const 宽 = parseFloat(cs.outlineWidth) || 0
    const 偏 = parseFloat(cs.outlineOffset) || 0
    const bt = Math.ceil(parseFloat(cs.borderTopWidth) || 0)
    const bb = Math.ceil(parseFloat(cs.borderBottomWidth) || 0)
    const 有环 = cs.outlineStyle !== 'none' && 宽 > 0
    const 环顶 = Math.floor(rr.top - 偏 - 宽)
    const 环底 = Math.ceil(rr.bottom + 偏 + 宽) - 1
    const 环行 = new Set<number>()
    const 顶占有行: number[] = []
    const 底占有行: number[] = []
    if (有环) {
      for (let y = 环顶; y < Math.round(rr.top - 偏); y++) {
        环行.add(y)
        顶占有行.push(y)
      }
      for (let y = Math.floor(rr.bottom + 偏); y <= 环底; y++) {
        环行.add(y)
        底占有行.push(y)
      }
    }
    const 段清单: 判定段[] = []
    const 建段 = (名: string, 从: number, 到: number) => {
      const 行: number[] = []
      for (let y = 从; y <= 到; y++) if (!环行.has(y)) 行.push(y)
      段清单.push({ 名, 行 })
    }
    建段('上·框外', 环顶 - 6, 环顶 - 1)
    // 内缘段再让开 1 行：Chromium 对 1.5px 这类小数边框会跨两个像素行（实测 .she-zhi-shuru
    // 顶边 633.8 + 1px 边框 → 634 行仍是被边框染色的行），不让开就把"输入框自己的边框"误判成条带
    建段('上·内缘', Math.ceil(rr.top + bt) + 1, Math.ceil(rr.top + bt) + 6)
    建段('下·内缘', Math.floor(rr.bottom - bb) - 6, Math.floor(rr.bottom - bb) - 1)
    建段('下·框外', 环底 + 1, 环底 + 6)
    输入框清单.push({
      选择器: 选,
      矩形: { 左: rr.left, 右: rr.right, 上: rr.top, 下: rr.bottom },
      outlineStyle: cs.outlineStyle,
      outlineWidthPx: 宽,
      outlineOffsetPx: 偏,
      outlineColor: cs.outlineColor,
      borderTopPx: bt,
      borderBottomPx: bb,
      环占有行: [...环行],
      环顶占有行: 顶占有行,
      环底占有行: 底占有行,
      段: 段清单,
    })
  }
  return {
    视口: { 宽: window.innerWidth, 高: window.innerHeight },
    设备像素比: window.devicePixelRatio,
    卡矩形: { 左: 卡r.left, 右: 卡r.right, 上: 卡r.top, 下: 卡r.bottom },
    卡底计算色: getComputedStyle(卡).backgroundColor,
    输入框: 输入框清单,
  }
}

const 页内画线元素 = (参数: { y: number; xs: number[] }) => {
  return 参数.xs.map((x) => {
    const 塔 = document.elementsFromPoint(x, 参数.y) as HTMLElement[]
    return {
      x,
      层: 塔.slice(0, 4).map((元) => {
        const cs = getComputedStyle(元)
        const 是下划线 = String(元.className || '').indexOf('dixian') >= 0
        const 伪 = 是下划线 ? getComputedStyle(元, '::after') : null
        const rr = 元.getBoundingClientRect()
        return {
          元: `${元.tagName.toLowerCase()}[${String(元.className || '').split(' ')[0]}]#${元.id || '-'}`,
          矩形: `${rr.top.toFixed(1)}..${rr.bottom.toFixed(1)}`,
          border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
          outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
          boxShadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 60),
          background: `${cs.backgroundColor} | ${cs.backgroundImage.slice(0, 72)}`,
          伪after: 伪
            ? `${伪.width}x${伪.height} ${伪.transform} ${伪.backgroundColor} | ${伪.backgroundImage.slice(0, 72)}`
            : '',
          opacity: cs.opacity,
        }
      }),
    }
  })
}

type 行信息 = { 中位亮条色: string; 最长连续段: number }

function 分组(行号: number[]): number[][] {
  const 组清单: number[][] = []
  for (const y of [...行号].sort((a, b) => a - b)) {
    const 末 = 组清单[组清单.length - 1]
    if (末 && y - 末[末.length - 1] <= 3) 末.push(y)
    else 组清单.push([y])
  }
  return 组清单
}

function 造条带(
  组清单: number[][],
  信息: Map<number, 行信息>,
  卡底: string,
  边窗口: { 选择器: string; 上: number; 下: number }[],
): 条带[] {
  const 出: 条带[] = []
  for (const 组 of 组清单) {
    const 中心 = 组[Math.floor((组.length - 1) / 2)]
    const 记 = 信息.get(中心)
    if (!记) continue
    const L = 相对亮度(记.中位亮条色)
    let 最近边 = '卡内无对应输入框'
    let 最小距 = Number.POSITIVE_INFINITY
    let 偏移 = 0
    for (const 元 of 边窗口) {
      for (const [边名, 边] of [
        ['上边', 元.上],
        ['下边', 元.下],
      ] as const) {
        const 距 = Math.abs(中心 - 边)
        if (距 < 最小距) {
          最小距 = 距
          最近边 = `${元.选择器.replace(/[.#]/g, '')}${边名}`
          偏移 = 中心 - 边
        }
      }
    }
    出.push({
      起始行: 组[0],
      结束行: 组[组.length - 1],
      厚度: 组.length,
      中位亮条色: 记.中位亮条色,
      相对亮度: +L.toFixed(4),
      对卡面色差: 最大通道差(记.中位亮条色, 卡底),
      档: L >= 0.3 ? '近白' : '亮条',
      连续段宽: 记.最长连续段,
      最近边,
      边偏移: Math.round(偏移 * 10) / 10,
    })
  }
  return 出
}

/**
 * 对卡面可视区（卡 ∩ 视口）逐行取色。同一张图既做判据输入、也可直接落盘为取证 png（一次截图两用）。
 */
export async function 卡内白条普查(
  page: Page,
  卡选择器: string,
  输入框选择器: string[],
  存图?: string,
): Promise<普查结果> {
  const 几何 = await page.evaluate(页内几何, { 卡选择器, 输入框选择器 })
  const 可视: 矩形 = {
    左: Math.max(0, Math.ceil(几何.卡矩形.左)),
    右: Math.min(几何.视口.宽, Math.floor(几何.卡矩形.右)),
    上: Math.max(0, Math.ceil(几何.卡矩形.上)),
    下: Math.min(几何.视口.高, Math.floor(几何.卡矩形.下)),
  }
  const 图 = await page.screenshot({
    clip: { x: 可视.左, y: 可视.上, width: 可视.右 - 可视.左, height: 可视.下 - 可视.上 },
    animations: 'disabled',
    caret: 'hide',
    timeout: 60000,
  })
  if (存图) {
    const { mkdirSync, writeFileSync } = await import('node:fs')
    const nodePath = await import('node:path')
    mkdirSync(nodePath.dirname(存图), { recursive: true })
    writeFileSync(存图, 图)
  }
  const { default: sharp } = await import('sharp')
  const { data, info } = await sharp(图).raw().toBuffer({ resolveWithObject: true })
  const 宽 = info.width
  const 高 = info.height
  const 道 = info.channels
  const 取 = (x: number, y: number) => {
    const i = (y * 宽 + x) * 道
    return 色串(data[i], data[i + 1], data[i + 2])
  }

  const 计数 = new Map<string, number>()
  for (let x = 6; x < 宽 - 6; x += 2) {
    for (let y = 6; y < 高 - 6; y += 2) {
      const c = 取(x, y)
      计数.set(c, (计数.get(c) ?? 0) + 1)
    }
  }
  const 合成卡底色 = [...计数.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const 卡面相对亮度 = 相对亮度(合成卡底色)
  const 命中亮条 = (c: string) =>
    最大通道差(c, 合成卡底色) >= 24 && 相对亮度(c) >= 卡面相对亮度 + 0.05

  const 起点 = 6
  const 终点 = Math.max(起点 + 1, 宽 - 6)
  const 全卡门限 = Math.max(80, Math.round((终点 - 起点) * 0.25))
  const 行段表 = new Map<number, [number, number][]>()
  const 全卡信息 = new Map<number, 行信息>()
  const 全卡合格行: number[] = []
  for (let ry = 0; ry < 高; ry++) {
    const 段: [number, number][] = []
    let 起 = -1
    let 最长 = 0
    const 亮条色清单: string[] = []
    for (let rx = 起点; rx < 终点; rx++) {
      const c = 取(rx, ry)
      if (命中亮条(c)) {
        if (起 < 0) 起 = rx
        亮条色清单.push(c)
        const 长 = rx - 起 + 1
        if (长 > 最长) 最长 = 长
      } else if (起 >= 0) {
        段.push([起, rx - 1])
        起 = -1
      }
    }
    if (起 >= 0) 段.push([起, 终点 - 1])
    if (!最长) continue
    const 绝对行 = 可视.上 + ry
    行段表.set(绝对行, 段)
    if (最长 >= 全卡门限) {
      全卡合格行.push(绝对行)
      全卡信息.set(绝对行, {
        中位亮条色: 亮条色清单[Math.floor(亮条色清单.length / 2)] ?? 合成卡底色,
        最长连续段: 最长,
      })
    }
  }

  const 边窗口 = 几何.输入框.map((元) => ({ 选择器: 元.选择器, 上: 元.矩形.上, 下: 元.矩形.下 }))
  const 全卡普查 = 造条带(分组(全卡合格行), 全卡信息, 合成卡底色, 边窗口).filter((条) => 条.厚度 <= 4)

  /** 在给定绝对行、给定横向窗口内取「最长连续亮条段」及其色值；该行无亮像素则 null */
  const 行取样 = (窗左: number, 窗右: number, y: number): 行信息 | null => {
    const 段清单 = 行段表.get(y)
    if (!段清单) return null
    const ry = y - 可视.上
    if (ry < 0 || ry >= 高) return null
    let 最长 = 0
    let 中点列 = -1
    for (const [起, 止] of 段清单) {
      const 重起 = Math.max(起, 窗左)
      const 重止 = Math.min(止, 窗右)
      const 长 = 重止 - 重起 + 1
      if (长 > 最长) {
        最长 = 长
        中点列 = Math.round((重起 + 重止) / 2)
      }
    }
    if (最长 <= 0 || 中点列 < 0) return null
    return { 中位亮条色: 取(中点列, ry), 最长连续段: 最长 }
  }

  /** FP-30 能量守恒豁免：按环边整窗裁决，逐行台账同时留作反证取证 */
  const 环能量豁免 = (元: 输入框几何, 窗左: number, 窗右: number, 门限: number) => {
    const 豁免行 = new Set<number>()
    const 台账清单: 能量台账[] = []
    if (元.outlineStyle === 'none' || 元.outlineWidthPx <= 0) return { 豁免行, 台账清单 }
    const 边清单: ['顶' | '底', number[]][] = [
      ['顶', 元.环顶占有行],
      ['底', 元.环底占有行],
    ]
    for (const [边名, 边行] of 边清单) {
      if (!边行.length) continue
      const 窗口起 = Math.min(...边行) - 2
      const 窗口止 = Math.max(...边行) + 2
      const 行明细: 能量行[] = []
      let 合计 = 0
      for (let y = 窗口起; y <= 窗口止; y++) {
        const 是环行 = 边行.indexOf(y) >= 0
        const 记 = 行取样(窗左, 窗右, y)
        const t = 记 && 记.最长连续段 >= 门限 ? 共线覆盖率(记.中位亮条色, 元.outlineColor, 合成卡底色) : null
        // 环行自己测不到＝能量全在环带上，按满覆盖上界计入；非环行测到 0 贡献＝没有残影可豁免
        const 计入 = t ?? (是环行 ? 1 : 0)
        合计 += 计入
        行明细.push({ 行: y, 是环行, 覆盖率: t, 计入, 可豁免: !是环行 && t !== null })
      }
      const 预算 = 边行.length * 环分摊上限 + 能量容差
      const 通过 = 合计 <= 预算
      if (通过) for (const 项 of 行明细) if (项.可豁免) 豁免行.add(项.行)
      台账清单.push({
        选择器: 元.选择器,
        环边: 边名,
        窗口起,
        窗口止,
        环厚度行: 边行.length,
        合计覆盖率: +合计.toFixed(3),
        预算: +预算.toFixed(3),
        豁免: 通过,
        行: 行明细,
      })
    }
    return { 豁免行, 台账清单 }
  }

  const 命中: { 选择器: string; 段: string; 条带: 条带 }[] = []
  const 能量台账: 能量台账[] = []
  for (const 元 of 几何.输入框) {
    const 窗左 = Math.round(元.矩形.左 - 可视.左) + 2
    const 窗右 = Math.round(元.矩形.右 - 可视.左) - 2
    const 窗宽 = 窗右 - 窗左
    if (窗宽 < 20) continue
    const 门限 = Math.max(40, Math.round(窗宽 * 0.5))
    const { 豁免行, 台账清单 } = 环能量豁免(元, 窗左, 窗右, 门限)
    能量台账.push(...台账清单)
    for (const 段 of 元.段) {
      const 合格: number[] = []
      const 信息 = new Map<number, 行信息>()
      for (const y of 段.行) {
        const 记 = 行取样(窗左, 窗右, y)
        if (!记 || 记.最长连续段 < 门限) continue
        if (豁免行.has(y)) continue
        合格.push(y)
        信息.set(y, 记)
      }
      const 条带清单 = 造条带(分组(合格), 信息, 合成卡底色, []).map((条) => {
        const 中心 = (条.起始行 + 条.结束行) / 2
        const 边 = 段.名.startsWith('上') ? 元.矩形.上 : 元.矩形.下
        return {
          ...条,
          最近边: `${元.选择器.replace(/[.#]/g, '')}${段.名}`,
          边偏移: Math.round((中心 - 边) * 10) / 10,
        }
      })
      for (const 条 of 条带清单) if (条.厚度 <= 4) 命中.push({ 选择器: 元.选择器, 段: 段.名, 条带: 条 })
    }
  }

  return { 几何, 可视卡矩形: 可视, 合成卡底色, 卡面相对亮度, 全卡普查, 判定带命中: 命中, 能量台账 }
}

/** 字段完整落在被取样的可视卡面内，判定带才有意义 */
export function 该字段可扫(普查: 普查结果, 选择器: string): boolean {
  const 元 = 普查.几何.输入框.find((项) => 项.选择器 === 选择器)
  if (!元) return false
  return 元.矩形.上 >= 普查.可视卡矩形.上 && 元.矩形.下 <= 普查.可视卡矩形.下
}

/** 在给定绝对行上逐点取 elementsFromPoint，钉死「到底是哪个元素画的线」 */
export async function 画线元素定位(page: Page, y: number, x清单: number[]) {
  return page.evaluate(页内画线元素, { y, xs: x清单 })
}
