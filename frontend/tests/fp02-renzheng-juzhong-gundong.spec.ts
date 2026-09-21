import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

// FP-02 认证布局 / 登录注册表单取证：
// 卡片居中偏差、表单项垂直间距（含深浅两档一致性）、滚动条可见性与可拖性、输入框焦点白线与组件自有焦点指示。
// 运行方式：FP02_LABEL=before|after npx playwright test tests/fp02-renzheng-juzhong-gundong.spec.ts
// before 只记录不断言；after 断言全部验收项。

const 标签 = process.env.FP02_LABEL ?? 'after'
// FP02_SOLO='桌面1440x900/暗色/zhuCe' 只跑一个组合、证据另存 -solo，用于定点复现；正式取证不带该变量
const 只跑 = process.env.FP02_SOLO ?? ''
const 日期 = '20260921'
const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 截图目录 = path.resolve(本目录, '../../测试截图')
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces')

// 必须 headed：Playwright 无头模式无条件给 Chromium 传 --hide-scrollbars，滚动条既不占位也不绘制，
// 任何「滚动条是否可见 / 是否拖得动」的度量都会得到 0 的假阴性。双保险：有头 + 解除该开关。
// 登录页常驻草地 WebGL 背景，主线程被抢占时动作与过渡都会拖慢一个量级，故放宽动作超时。
test.use({
  headless: false,
  launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
  actionTimeout: 90000,
})

type 视口规格 = { 名称: string; width: number; height: number }
const 视口清单: 视口规格[] = [
  { 名称: '桌面1440x900', width: 1440, height: 900 },
  { 名称: '移动375x667', width: 375, height: 667 },
]
// 用户原话「分辨率不正常的网页（比如手机网页），他们的滚动条应该都会有」——登录表单在正常
// 视口不溢出，只有异常小视口才必然溢出，用它证明登录页同样具备可见可拖滚动条。
const 异常小视口: 视口规格 = { 名称: '异常380x420', width: 380, height: 420 }

type 矩形 = {
  left: number
  top: number
  width: number
  height: number
  bottom: number
  right: number
  cx: number
  cy: number
}

type 项度量 = {
  字段: string
  组: 矩形
  下划线: 矩形 | null
  输入框: 矩形 | null
  标签: 矩形 | null
  标签计算top: string
  标签字号: string
  标签颜色: string
  与下一项间隙: number | null
  上一项下划线底到本标签顶: number | null
  标签底到输入文字顶: number | null
}

type 快照 = {
  阶段: string
  视口: string
  主题: string
  模式: string
  实际主题属性: string | null
  视口信息: { innerWidth: number; innerHeight: number; clientWidth: number; clientHeight: number }
  导航栏: 矩形 | null
  滚动容器: {
    rect: 矩形
    clientWidth: number
    offsetWidth: number
    clientHeight: number
    scrollHeight: number
    滚动条宽: number
    scrollTop: number
    paddingTop: string
  }
  内层滚动区: (矩形 & { clientWidth: number; offsetWidth: number; scrollHeight: number; clientHeight: number; 滚动条宽: number; 计算overflowY: string; 计算maxHeight: string }) | null
  卡片: 矩形 & { 内联样式: Record<string, string> }
  内容盒: { rect: 矩形; 计算paddingBottom: string }
  居中: {
    dx_视口: number
    dy_视口: number
    dx_滚动口: number
    dy_滚动口: number
    滚动口中心X: number
    滚动口中心Y: number
    视口中心X: number
    视口中心Y: number
    溢出: boolean
    溢出量: number
  }
  表单项: 项度量[]
  令牌: {
    huakuai: string
    huakuaiHover: string
    guidao: string
    kuanDu: string
    间距令牌: string
    字号令牌: string
    头部实margin: string
    标签行实margin: string
  }
  焦点?: {
    活动元素: string
    过渡: string
    outlineStyle: string
    outlineWidth: string
    outlineColor: string
    下划线伪元素transform: string
    标签颜色: string
    组含focusWithin: boolean
  } | null
  勾选框焦点?: {
    元素: string
    outlineStyle: string
    outlineWidth: string
    outlineColor: string
  } | null
  滚动条像素?: { 采样点: number; 不同颜色数: number; 极差: number; 取样宽: number } | null
  滚动条拖拽?: {
    选择器: string
    条宽: number
    可滚量: number
    滚动口: { 左: number; 顶: number; 右: number; 高: number }
    自身标识: string
    thumb带: { 起: number; 止: number; thumb均色: string; track均色: string } | null
    attempts: {
      按下点: string
      落点元素: string
      起点scrollTop: number
      拖后scrollTop: number
      位移: number
      选区长度: number
    }[]
  } | null
  控制台?: { error: string[]; warning: string[] }
}

const 页内采集 = (): Omit<快照, '阶段' | '视口' | '主题' | '模式'> | null => {
  const ju = (el: Element | null): 矩形 | null => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      left: +r.left.toFixed(2),
      top: +r.top.toFixed(2),
      width: +r.width.toFixed(2),
      height: +r.height.toFixed(2),
      bottom: +(r.top + r.height).toFixed(2),
      right: +(r.left + r.width).toFixed(2),
      cx: +(r.left + r.width / 2).toFixed(2),
      cy: +(r.top + r.height / 2).toFixed(2),
    }
  }
  const gen = document.querySelector('.yemian-buju') as HTMLElement | null
  const nei = document.querySelector('.biaodan-gundong') as HTMLElement | null
  const ka = document.querySelector('.biaodan-rongqi') as HTMLElement | null
  const neiRong = document.querySelector('.denglu-neirong') as HTMLElement | null
  const nav = document.querySelector('.quanju-caidan') as HTMLElement | null
  if (!gen || !ka || !neiRong) return null

  const 组清单 = Array.from(
    document.querySelectorAll('.biaodan-neirong-qu form > .shuru-zu'),
  ) as HTMLElement[]
  const 下划线于 = (z: HTMLElement) => z.querySelector('.dixian-dixian') as HTMLElement | null
  const 表单项: 项度量[] = 组清单.map((z, i) => {
    const biao = z.querySelector('.fudong-biaoqian') as HTMLElement | null
    const xia = 下划线于(z)
    const shu = z.querySelector('.fenlie-shuru') as HTMLElement | null
    const 组 = ju(z) as 矩形
    const 下划线 = ju(xia)
    const 输入框 = ju(shu)
    const 标签 = ju(biao)
    const cs = biao ? getComputedStyle(biao) : null
    let 输入文字顶: number | null = null
    if (shu && 输入框) 输入文字顶 = 输入框.top + parseFloat(getComputedStyle(shu).paddingTop)
    const 下一 = 组清单[i + 1] ?? null
    const 前下划线 = i > 0 ? ju(下划线于(组清单[i - 1])) : null
    return {
      字段: shu?.id ?? `#${i}`,
      组,
      下划线,
      输入框,
      标签,
      标签计算top: cs?.top ?? '',
      标签字号: cs?.fontSize ?? '',
      标签颜色: cs?.color ?? '',
      与下一项间隙: 下一 && 组 ? +(下一.getBoundingClientRect().top - 组.bottom).toFixed(2) : null,
      上一项下划线底到本标签顶:
        前下划线 && 标签 ? +(标签.top - 前下划线.bottom).toFixed(2) : null,
      标签底到输入文字顶: 标签 && 输入文字顶 !== null ? +(输入文字顶 - 标签.bottom).toFixed(2) : null,
    }
  })

  const 卡 = ju(ka) as 矩形
  const 内联: Record<string, string> = {}
  for (const k of ['height', 'overflow', 'transition', 'opacity', 'transform', 'max-height', 'width']) {
    内联[k] = ka.style.getPropertyValue(k)
  }
  const genR = ju(gen) as 矩形
  const navR = ju(nav)
  const 溢出 = gen.scrollHeight > gen.clientHeight + 1
  const 滚动口中心X = genR.left + gen.clientWidth / 2
  const 滚动口中心Y = genR.top + gen.clientHeight / 2
  const root = getComputedStyle(document.documentElement)

  return {
    实际主题属性: document.documentElement.getAttribute('data-theme'),
    视口信息: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
    },
    导航栏: navR,
    滚动容器: {
      rect: genR,
      clientWidth: gen.clientWidth,
      offsetWidth: gen.offsetWidth,
      clientHeight: gen.clientHeight,
      scrollHeight: gen.scrollHeight,
      滚动条宽: gen.offsetWidth - gen.clientWidth,
      scrollTop: gen.scrollTop,
      paddingTop: getComputedStyle(gen).paddingTop,
    },
    内层滚动区: nei
      ? {
          ...(ju(nei) as 矩形),
          clientWidth: nei.clientWidth,
          offsetWidth: nei.offsetWidth,
          scrollHeight: nei.scrollHeight,
          clientHeight: nei.clientHeight,
          滚动条宽: nei.offsetWidth - nei.clientWidth,
          计算overflowY: getComputedStyle(nei).overflowY,
          计算maxHeight: getComputedStyle(nei).maxHeight,
        }
      : null,
    卡片: { ...卡, 内联样式: 内联 },
    内容盒: { rect: ju(neiRong) as 矩形, 计算paddingBottom: getComputedStyle(neiRong).paddingBottom },
    居中: {
      dx_视口: +(卡.cx - window.innerWidth / 2).toFixed(2),
      dy_视口: +(卡.cy - window.innerHeight / 2).toFixed(2),
      dx_滚动口: +(卡.cx - 滚动口中心X).toFixed(2),
      dy_滚动口: +(卡.cy - 滚动口中心Y).toFixed(2),
      滚动口中心X: +滚动口中心X.toFixed(2),
      滚动口中心Y: +滚动口中心Y.toFixed(2),
      视口中心X: +(window.innerWidth / 2).toFixed(2),
      视口中心Y: +(window.innerHeight / 2).toFixed(2),
      溢出,
      溢出量: gen.scrollHeight - gen.clientHeight,
    },
    表单项,
    令牌: {
      huakuai: root.getPropertyValue('--gundong-tiao-huakuai').trim(),
      huakuaiHover: root.getPropertyValue('--gundong-tiao-huakuai-hover').trim(),
      guidao: root.getPropertyValue('--gundong-tiao-guidao').trim(),
      kuanDu: root.getPropertyValue('--gundong-tiao-kuan-du').trim(),
      间距令牌: root.getPropertyValue('--jiange-zhong').trim() || 'UNDEFINED',
      字号令牌: root.getPropertyValue('--ziti-xiao').trim() || 'UNDEFINED',
      头部实margin: getComputedStyle(document.querySelector('.biaodan-tou') as HTMLElement).marginBottom,
      标签行实margin: getComputedStyle(
        document.querySelector('.biaoqian-qiehuan') as HTMLElement,
      ).marginBottom,
    },
  }
}

const 页内焦点 = (输入框ID: string) => {
  const shu = document.getElementById(输入框ID) as HTMLElement | null
  if (!shu) return null
  const zzu = shu.closest('.shuru-zu') as HTMLElement | null
  const xia = zzu?.querySelector('.dixian-dixian') as HTMLElement | null
  const biao = zzu?.querySelector('.fudong-biaoqian') as HTMLElement | null
  const s = getComputedStyle(shu)
  return {
    活动元素: document.activeElement?.id || document.activeElement?.tagName || '',
    过渡: xia ? getComputedStyle(xia, '::after').transition : '',
    outlineStyle: s.outlineStyle,
    outlineWidth: s.outlineWidth,
    outlineColor: s.outlineColor,
    下划线伪元素transform: xia ? getComputedStyle(xia, '::after').transform : '',
    标签颜色: biao ? getComputedStyle(biao).color : '',
    组含focusWithin: !!zzu && zzu.matches(':focus-within'),
  }
}

const 页内勾选框焦点 = () => {
  const el = document.activeElement as HTMLElement | null
  if (!el || !el.classList.contains('ji-zhu-fu-xuan')) return null
  const wen = el.nextElementSibling as HTMLElement | null
  if (!wen) return null
  const s = getComputedStyle(wen, '::before')
  return {
    元素: el.className,
    outlineStyle: s.outlineStyle,
    outlineWidth: s.outlineWidth,
    outlineColor: s.outlineColor,
  }
}

const 页内像素 = async (URL: string) => {
  const 图 = new Image()
  图.src = URL
  await 图.decode()
  const 画 = document.createElement('canvas')
  画.width = 图.width
  画.height = 图.height
  const 上 = 画.getContext('2d')
  if (!上) return null
  上.drawImage(图, 0, 0)
  const 像 = 上.getImageData(0, 0, 画.width, 画.height).data
  const 集合 = new Set<string>()
  let 最亮 = 255
  let 最暗 = 0
  for (let i = 0; i < 像.length; i += 4) {
    集合.add(`${像[i]},${像[i + 1]},${像[i + 2]}`)
    const 度 = (像[i] + 像[i + 1] + 像[i + 2]) / 3
    if (度 < 最亮) 最亮 = 度
    if (度 > 最暗) 最暗 = 度
  }
  return { 采样点: 像.length / 4, 不同颜色数: 集合.size, 极差: +(最暗 - 最亮).toFixed(2) }
}

// 真鼠标拖滚动条 thumb：先用"滚到顶/滚到底"两帧竖带差分定出 thumb 实际绘制在哪几行（不靠几何猜、不靠亮度猜），
// 再在 thumb 带内按下并向下推 60px，scrollTop 必须变化；按下若跑到内容上会拉出选区，
// 用选区长度反证落点确实在滚动条上（同 FP-05 取证手法）。
async function 拖滚动条(page: import('@playwright/test').Page, 选择器: string) {
  const 轨 = await page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement | null
    if (!el) return null
    const r = el.getBoundingClientRect()
    const 条宽 = el.offsetWidth - el.clientWidth
    return {
      左: r.left,
      顶: r.top,
      右: r.right,
      高: r.height,
      条宽,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop,
      视口高: window.innerHeight,
      可滚量: el.scrollHeight - el.clientHeight,
      thumb高: Math.max(20, (el.clientHeight * el.clientHeight) / Math.max(el.scrollHeight, 1)),
      自身: `${el.tagName}.${el.className || el.id}`.slice(0, 60),
    }
  }, 选择器)
  if (!轨 || 轨.条宽 <= 0 || 轨.可滚量 <= 0) return null
  // 聚焦输入框会把滚动口滚到底（登录页在异常小视口必然如此），带位与位移都必须以归零后为基准
  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (el) el.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    window.getSelection()?.removeAllRanges()
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  }, 选择器)
  await page.waitForTimeout(250)

  // thumb 定位不靠猜亮度：分别抓 scrollTop=0 与滚到底两张滚动条竖带，
  // 两帧之间发生变化的行就是 thumb 走过的地方；从条顶起的连续变化段长度 = thumb 高度。
  // 这样浅色/深色、任何底色下都成立（亮度差只用来区分"变没变"，不用来区分谁亮）。
  const 条x = Math.max(0, Math.round(轨.右 - 轨.条宽))
  const 条顶 = Math.max(0, Math.round(轨.顶))
  const 条高 = Math.max(4, Math.min(Math.round(轨.高), 轨.视口高 - 条顶))
  const 等两帧 = () =>
    page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    )
  const 抓条 = async (滚动到位: number) => {
    await page.evaluate(
      ([sel, v]) => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (el) el.scrollTo({ top: v, behavior: 'instant' as ScrollBehavior })
      },
      [选择器, 滚动到位] as [string, number],
    )
    for (let i = 0; i < 8; i++) {
      const 到位 = await page.evaluate(
        ([sel, v]) => {
          const el = document.querySelector(sel) as HTMLElement | null
          return !!el && Math.abs(el.scrollTop - v) < 1.5
        },
        [选择器, 滚动到位] as [string, number],
      )
      if (到位) break
      await page.waitForTimeout(100)
    }
    await 等两帧()
    const 图 = await page.screenshot({
      clip: { x: 条x, y: 条顶, width: 轨.条宽, height: 条高 },
      type: 'png',
    })
    return page.evaluate(
      async ([b64, 宽, 高]: [string, number, number]) => {
        const tu = new Image()
        tu.src = `data:image/png;base64,${b64}`
        await tu.decode()
        const hua = document.createElement('canvas')
        hua.width = 宽
        hua.height = 高
        const shang = hua.getContext('2d')
        if (!shang) return null
        shang.drawImage(tu, 0, 0)
        const xiang = shang.getImageData(0, 0, 宽, 高).data
        const hang: { 亮度: number; 色: string }[] = []
        for (let y = 0; y < 高; y++) {
          let r = 0
          let g = 0
          let b = 0
          for (let x = 0; x < 宽; x++) {
            const i = (y * 宽 + x) * 4
            r += xiang[i]
            g += xiang[i + 1]
            b += xiang[i + 2]
          }
          r = Math.round(r / 宽)
          g = Math.round(g / 宽)
          b = Math.round(b / 宽)
          hang.push({ 亮度: Math.round((r + g + b) / 3), 色: `rgb(${r}, ${g}, ${b})` })
        }
        return hang
      },
      [图.toString('base64'), 轨.条宽, 条高] as [string, number, number],
    )
  }
  let 带: { 起: number; 止: number; thumb均色: string; track均色: string } | null = null
  for (let 轮 = 0; 轮 < 2 && !带; 轮++) {
    const 条首帧 = await 抓条(0)
    const 条末帧 = await 抓条(Math.ceil(轨.可滚量))
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null
      if (el) el.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }, 选择器)
    if (!条首帧 || !条末帧 || 条首帧.length !== 条末帧.length || 条首帧.length <= 4) continue
    // 允许条顶有最多 3 行静态边界像素，再从第一个变化行起算连续段
    let 起行 = 0
    while (起行 < Math.min(3, 条首帧.length) && Math.abs(条首帧[起行].亮度 - 条末帧[起行].亮度) <= 12) 起行 += 1
    let 段长 = 0
    while (起行 + 段长 < 条首帧.length && Math.abs(条首帧[起行 + 段长].亮度 - 条末帧[起行 + 段长].亮度) > 12) 段长 += 1
    if (段长 >= 3) {
      const 中 = 起行 + Math.floor(段长 / 2)
      带 = {
        起: 条顶 + 起行,
        止: 条顶 + 起行 + 段长 - 1,
        thumb均色: 条首帧[中].色,
        track均色: 条末帧[中].色,
      }
    }
  }

  const 几何起点 = Math.round(轨.顶 + 轨.thumb高 * 0.4)
  const 中带x = Math.round(轨.右 - 轨.条宽 / 2)
  const 靠边x = Math.round(轨.右 - 1)
  // 主锚点取几何 thumb 带：scrollTop=0 时 Blink 把 thumb 画在 [条顶, 条顶+thumb高]，
  // 与底色亮度无关；两帧差分带只在识别出来时作补充锚点
  const 几何带 = [
    Math.round(轨.顶 + 轨.thumb高 * 0.5),
    Math.round(轨.顶 + 15),
    Math.round(轨.顶 + 轨.thumb高 * 0.25),
  ]
  const 差分带 = 带 ? [Math.round((带.起 + 带.止) / 2), 带.起 + 10] : []
  const 去重 = (列表: number[]) => [...new Set(列表)]
  const 候选: { x: number; y: number }[] = [
    ...去重(几何带).map((y) => ({ x: 中带x, y })),
    ...去重(差分带).map((y) => ({ x: 中带x, y })),
    { x: 靠边x, y: 几何带[0] },
  ]
  const attempts: {
    按下点: string
    落点元素: string
    起点scrollTop: number
    拖后scrollTop: number
    位移: number
    选区长度: number
  }[] = []
  for (const 点 of 候选) {
    await page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement | null
      if (el) el.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      window.getSelection()?.removeAllRanges()
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    }, 选择器)
    await page.waitForTimeout(150)
    const 本起点 = await page.evaluate(
      (sel) => (document.querySelector(sel) as HTMLElement | null)?.scrollTop ?? -1,
      选择器,
    )
    const 落点 = await page.evaluate(
      ([px, py]) => {
        const el = document.elementFromPoint(px, py) as HTMLElement | null
        return el ? `${el.tagName}.${el.className || el.id}`.slice(0, 60) : 'null'
      },
      [点.x, 点.y],
    )
    await page.mouse.move(点.x, 点.y)
    await page.mouse.down()
    await page.mouse.move(点.x, 点.y + 30, { steps: 6 })
    await page.mouse.move(点.x, 点.y + 60, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    const 后 = await page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement | null
      return {
        scrollTop: el?.scrollTop ?? -1,
        选中长度: window.getSelection()?.toString().length ?? 0,
      }
    }, 选择器)
    attempts.push({
      按下点: `${点.x},${点.y}`,
      落点元素: 落点,
      起点scrollTop: 本起点,
      拖后scrollTop: 后.scrollTop,
      位移: +(后.scrollTop - 本起点).toFixed(2),
      选区长度: 后.选中长度,
    })
    if (后.scrollTop > 0) break
  }
  await page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement | null
    if (el) el.scrollTop = 0
  }, 选择器)
  return {
    选择器,
    条宽: 轨.条宽,
    可滚量: 轨.可滚量,
    滚动口: { 左: 轨.左, 顶: 轨.顶, 右: 轨.右, 高: 轨.高 },
    自身标识: 轨.自身,
    thumb带: 带,
    attempts,
  }
}

function 写证据(记录: 快照[], 截图: string[]) {
  fs.mkdirSync(证据目录, { recursive: true })
  const 行: string[] = [
    `# FP-02 认证布局与登录注册表单取证（${标签}）-${日期}`,
    '',
    `采集时间：${new Date().toISOString()}；运行环境：headed Chromium + ignoreDefaultArgs:['--hide-scrollbars']（无头会被 Playwright 无条件传该开关，滚动条不绘制也不占位）`,
    `基准判据：卡片中心相对 **.yemian-buju 滚动口中心**（= 导航栏之下、滚动条槽之外的真实可见区）；` +
      `dx_视口/dy_视口 为相对整屏 innerWidth/innerHeight 中心的原始差值，仅用于定位偏置来源。`,
    '',
    '> 配对说明：同名 before 取证采于原始代码（改动前），那一轮尚未解除 `--hide-scrollbars`，',
    '> 其「外/内滚动条宽」列全为 0 属度量环境假阴性，',
    '> 改前的滚动条几何以源码值（认证布局 4px + rgba(255,255,255,0.3)、注册内层 3px 金）',
    '> 与 before 截图为准。',
    '',
    '## 居中与滚动条',
    '',
    '| 视口 | 主题 | 模式 | 阶段 | 卡片中心 dx_滚动口 | dy_滚动口 | dx_视口 | dy_视口 | 外溢出 | 外滚动条宽 | 内滚动条宽 | 内 scrollH/clientH | 卡片内联height | 卡片内联overflow | .denglu-neirong padding-bottom |',
    '| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |',
    ...记录.map(
      (s) =>
        `| ${s.视口} | ${s.实际主题属性} | ${s.模式} | ${s.阶段} | ${s.居中.dx_滚动口} | ${s.居中.dy_滚动口} | ${s.居中.dx_视口} | ${s.居中.dy_视口} | ${s.居中.溢出}(${s.居中.溢出量}) | ${s.滚动容器.滚动条宽} | ${s.内层滚动区?.滚动条宽 ?? '-'} | ${s.内层滚动区 ? s.内层滚动区.scrollHeight + '/' + s.内层滚动区.clientHeight : '-'} | ${s.卡片.内联样式.height || '-'} | ${s.卡片.内联样式.overflow || '-'} | ${s.内容盒.计算paddingBottom} |`,
    ),
    '',
    '## 表单项垂直间距',
    '',
    '| 视口 | 主题 | 模式 | 阶段 | 项 | 组高 | 与下一项间隙px | 标签计算top | 标签字号 | 上一项下划线底→本标签顶 | 标签底→输入文字顶 |',
    '| ---- | ---- | ---- | ---- | -- | ---- | ---- | ---- | ---- | ---- | ---- |',
    ...记录.flatMap((s) =>
      s.表单项.map(
        (f) =>
          `| ${s.视口} | ${s.实际主题属性} | ${s.模式} | ${s.阶段} | ${f.字段} | ${f.组.height} | ${f.与下一项间隙 ?? '-'} | ${f.标签计算top} | ${f.标签字号} | ${f.上一项下划线底到本标签顶 ?? '-'} | ${f.标签底到输入文字顶 ?? '-'} |`,
      ),
    ),
    '',
    '## 输入框焦点（点击手机号后）',
    '',
    '| 视口 | 主题 | 模式 | activeElement | outline-style | outline-width | outline-color | 下划线::after transform | ::after transition | 标签颜色 | :focus-within | 勾选框::before outline |',
    '| ---- | ---- | ---- | ------------- | ------------- | ------------- | ------------- | ----------------------- | ---------------- | -------- | ----------- | -------------------- |',
    ...记录
      .filter((s) => s.焦点)
      .map(
        (s) =>
          `| ${s.视口} | ${s.实际主题属性} | ${s.模式} | ${s.焦点?.活动元素} | ${s.焦点?.outlineStyle} | ${s.焦点?.outlineWidth} | ${s.焦点?.outlineColor} | ${s.焦点?.下划线伪元素transform} | ${s.焦点?.过渡} | ${s.焦点?.标签颜色} | ${s.焦点?.组含focusWithin} | ${s.勾选框焦点 ? `${s.勾选框焦点.outlineStyle}/${s.勾选框焦点.outlineWidth}/${s.勾选框焦点.outlineColor}` : '-'} |`,
      ),
    '',
    '## 滚动条令牌与像素（滚动条条带截图取样，纯色 = 不可见）',
    '',
    '| 视口 | 主题 | 模式 | 阶段 | --gundong-tiao-huakuai | guidao | kuan-du | 取样宽 | 采样点 | 不同颜色数 | 明度极差 |',
    '| ---- | ---- | ---- | ---- | ---------------------- | ------ | ------- | ------ | ------ | ---------- | -------- |',
    ...记录.map(
      (s) =>
        `| ${s.视口} | ${s.实际主题属性} | ${s.模式} | ${s.阶段} | ${s.令牌.huakuai} | ${s.令牌.guidao} | ${s.令牌.kuanDu} | ${s.滚动条像素?.取样宽 ?? '-'} | ${s.滚动条像素?.采样点 ?? '-'} | ${s.滚动条像素?.不同颜色数 ?? '-'} | ${s.滚动条像素?.极差 ?? '-'} |`,
    ),
    '',
    '## 滚动条可拖（几何 thumb 带为主锚点 + 两帧竖带差分校验 → 真鼠标 down/move/up 使 scrollTop 变化）',
    '',
    '| 视口 | 主题 | 模式 | 阶段 | 滚动口 | 条宽 | 可滚量 | thumb 命中带(y 起→止) | thumb色 | track色 | 按下点 | 落点元素 | scrollTop 起→拖后 | 位移 | 选区长度 |',
    '| ---- | ---- | ---- | ---- | ------ | ---- | ------ | ---------------- | ------- | ------- | ------ | -------- | ----------------- | ---- | --------- |',
    ...记录.flatMap((s) =>
      (s.滚动条拖拽?.attempts.length ? s.滚动条拖拽.attempts : [null]).map((a) => {
        const d = s.滚动条拖拽
        return `| ${s.视口} | ${s.实际主题属性} | ${s.模式} | ${s.阶段} | ${d?.选择器 ?? '无可滚口'} | ${d?.条宽 ?? '-'} | ${d?.可滚量 ?? '-'} | ${d?.thumb带 ? `${d.thumb带.起}→${d.thumb带.止}` : d ? '未识别（底色≈thumb 亮度，改用几何带）' : '-'} | ${d?.thumb带?.thumb均色 ?? '-'} | ${d?.thumb带?.track均色 ?? '-'} | ${a?.按下点 ?? '-'} | ${a?.落点元素 ?? '-'} | ${a ? `${a.起点scrollTop}→${a.拖后scrollTop}` : '-'} | ${a?.位移 ?? '-'} | ${a?.选区长度 ?? '-'} |`
      }),
    ),
    '',
    '## 主题令牌可用性（variables.css 契约，非本功能点修改范围，仅记录）',
    '',
    '| 视口 | 主题 | 模式 | --jiange-zhong | --ziti-xiao | .biaodan-tou margin-bottom | .biaoqian-qiehuan margin-bottom |',
    '| ---- | ---- | ---- | -------------- | ----------- | -------------------------- | ------------------------------- |',
    ...记录
      .filter((s) => s.阶段 === '静止')
      .map(
        (s) =>
          `| ${s.视口} | ${s.实际主题属性} | ${s.模式} | ${s.令牌.间距令牌} | ${s.令牌.字号令牌} | ${s.令牌.头部实margin} | ${s.令牌.标签行实margin} |`,
      ),
    '',
    '## 控制台',
    '',
    `- error ${记录.reduce((a, s) => a + (s.控制台?.error.length ?? 0), 0)} 条`,
    ...[...new Set(记录.flatMap((s) => s.控制台?.error ?? []))].map((e) => `  - ${e}`),
    `- warning ${记录.reduce((a, s) => a + (s.控制台?.warning.length ?? 0), 0)} 条`,
    ...[...new Set(记录.flatMap((s) => s.控制台?.warning ?? []))].map((e) => `  - ${e}`),
    '',
    '截图：',
    ...截图.map((p) => `- ${p}`),
    '',
    `完整数值见同名 .json`,
  ]
  const 基名 = `FP-02-认证表单-${标签}-${日期}${只跑 ? '-solo' : ''}`
  fs.writeFileSync(path.join(证据目录, `${基名}.md`), 行.join('\n'), 'utf8')
  fs.writeFileSync(path.join(证据目录, `${基名}.json`), JSON.stringify({ 标签, 记录, 截图 }, null, 2), 'utf8')
}

// 记录提到模块级 + afterAll 落盘：断言失败时证据照样写出去，不留"跑完却没数据"的黑箱
const 记录: 快照[] = []
const 截图集: string[] = []

test.afterAll(() => {
  写证据(记录, 截图集)
})

// 至少一次真鼠标落在滚动口自身的滚动条列上把 scrollTop 拖起来（位移>0、落点元素=滚动口自身、没拉出选区）
function 断言可拖(s: 快照, 标: string): void {
  const d = s.滚动条拖拽
  expect(d, `${标} 未采到滚动条拖拽（无可滚口或条宽为 0）`).not.toBeNull()
  const 成 =
    d!.attempts.find((a) => a.位移 > 0 && a.落点元素 === d!.自身标识) ?? null
  expect(成, `${标} 滚动条拖不动：${JSON.stringify(d!.attempts)}`).not.toBeNull()
  expect(成!.选区长度, `${标} 按下点落到内容上（拉出选区）：${JSON.stringify(成)}`).toBe(0)
}

test.describe('FP-02 认证布局与登录注册表单取证', () => {
  test('居中/间距/滚动条/焦点 全组合量测', async ({ browser }) => {
    test.setTimeout(600000)
    fs.mkdirSync(截图目录, { recursive: true })

    const 组合: Array<{ 视口: 视口规格; 主题: string; 模式: 'dengLu' | 'zhuCe' }> = []
    for (const 视口 of 视口清单)
      for (const 主题 of ['暗色', '浅色'])
        for (const 模式 of ['dengLu', 'zhuCe'] as const) 组合.push({ 视口, 主题, 模式 })
    for (const 主题 of ['暗色', '浅色'])
      组合.push({ 视口: 异常小视口, 主题, 模式: 'dengLu' })

    for (const { 视口, 主题, 模式 } of 组合.filter(
      (c) => !只跑 || `${c.视口.名称}/${c.主题}/${c.模式}` === 只跑,
    )) {
      const context = await browser.newContext({
        viewport: { width: 视口.width, height: 视口.height },
      })
      await context.addInitScript(([z]: string[]) => localStorage.setItem('主题', z), [主题])
      const page = await context.newPage()
      const 页错误: string[] = []
      const 页警告: string[] = []
      page.on('console', (m) => {
        if (m.type() === 'error') 页错误.push(`[${视口.名称}/${主题}/${模式}] ${m.text()}`)
        else if (m.type() === 'warning') 页警告.push(`[${视口.名称}/${主题}/${模式}] ${m.text()}`)
      })
      page.on('pageerror', (e) => 页错误.push(`[${视口.名称}/${主题}/${模式}] pageerror: ${e.message}`))

      await page.goto('/login')
      await page.waitForSelector('#denglu-shoujihao')
      if (模式 === 'zhuCe') {
        await page.locator('.biaoqian-anniu').nth(1).click()
        await page.waitForSelector('#zhuce-shoujihao')
        await page.waitForTimeout(1600)
      }
      const 输入框ID = 模式 === 'dengLu' ? 'denglu-shoujihao' : 'zhuce-shoujihao'

      const 静止底 = await page.evaluate(页内采集)
      expect(静止底, `${视口.名称}/${主题}/${模式} 未取到布局节点`).not.toBeNull()
      const 静止: 快照 = {
        ...(静止底 as NonNullable<typeof 静止底>),
        阶段: '静止',
        视口: 视口.名称,
        主题,
        模式,
        焦点: null,
        滚动条像素: null,
        滚动条拖拽: null,
      }

      if (模式 === 'dengLu') {
        await page.fill('#denglu-shoujihao', '13800138000')
        await page.fill('#denglu-mima', 'mima12345')
      } else {
        await page.fill('#zhuce-shoujihao', '13800138000')
        await page.fill('#zhuce-yanzhengma', '123456')
        await page.fill('#zhuce-yonghuming', '取证用户')
        await page.fill('#zhuce-mima', 'mima12345')
      }
      await page.click('.biaodan-biaoti')
      // 关掉 Chrome 可能弹出的原生自动填充下拉，避免它吞掉后续点击
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
      const 上浮底 = await page.evaluate(页内采集)
      const 上浮: 快照 = {
        ...(上浮底 as NonNullable<typeof 上浮底>),
        阶段: '上浮',
        视口: 视口.名称,
        主题,
        模式,
        焦点: null,
        滚动条像素: null,
        滚动条拖拽: null,
      }

      await page.click(`#${输入框ID}`)
      // 草地 WebGL 背景把主线程压到过渡实测要 0.4~1.8s 才走完，固定给足 2.5s 再取终值；
      // 取到的原始 transform 一律写进证据，不靠轮询猜时机
      await page.waitForTimeout(2500)
      上浮.焦点 = await page.evaluate(页内焦点, 输入框ID)

      // 键盘 Tab 走到自绘勾选框上，验证焦点环真的画得出来（原生框被压成 0×0）
      上浮.勾选框焦点 = null
      if (模式 === 'dengLu') {
        await page.keyboard.press('Escape')
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press('Tab')
          const j = await page.evaluate(页内勾选框焦点)
          if (j) {
            上浮.勾选框焦点 = j
            break
          }
        }
      }

      const 名 = `fp02-${标签}-${视口.名称}-${上浮.实际主题属性}-${模式}`
      await page.screenshot({ path: path.join(截图目录, `${名}.png`) })
      截图集.push(`测试截图/${名}.png`)

      const 用内层 =
        !!上浮.内层滚动区 && 上浮.内层滚动区.scrollHeight > 上浮.内层滚动区.clientHeight
      const 目标 = 用内层
        ? {
            rect: 上浮.内层滚动区!,
            滚动条宽: 上浮.内层滚动区!.滚动条宽,
            clientHeight: 上浮.内层滚动区!.clientHeight,
            选择器: '.biaodan-gundong.xuyao-gundong',
          }
        : {
            rect: 上浮.滚动容器.rect,
            滚动条宽: 上浮.滚动容器.滚动条宽,
            clientHeight: 上浮.滚动容器.clientHeight,
            选择器: '.yemian-buju',
          }
      if (目标.滚动条宽 > 0) {
        const clip = {
          x: Math.max(0, Math.round(目标.rect.right - 目标.滚动条宽)),
          y: Math.round(目标.rect.top + 2),
          width: Math.round(目标.滚动条宽),
          height: Math.max(4, Math.round(Math.min(目标.rect.height - 4, 目标.clientHeight - 4))),
        }
        const buf = await page.screenshot({ clip, type: 'png' })
        const 像 = await page.evaluate(页内像素, `data:image/png;base64,${buf.toString('base64')}`)
        上浮.滚动条像素 = 像 ? { ...像, 取样宽: 目标.滚动条宽 } : null
        静止.滚动条像素 = 上浮.滚动条像素
      }
      const 拖 = await 拖滚动条(page, 目标.选择器)
      上浮.滚动条拖拽 = 拖
      静止.滚动条拖拽 = 拖

      for (const s of [静止, 上浮]) s.控制台 = { error: 页错误, warning: 页警告 }
      记录.push(静止, 上浮)
      await context.close()
    }

    if (标签 === 'after') {
      const 集 = new Map<string, 快照>()
      for (const s of 记录) 集.set(`${s.视口}|${s.主题}|${s.模式}|${s.阶段}`, s)

      for (const s of 记录) {
        const 标 = `${s.视口}/${s.主题}/${s.模式}/${s.阶段}`
        // qieHuanMoShi 泄漏的内联高度锁必须归零（注册内容被裁切的根因）
        expect(s.卡片.内联样式.height, `${标} 卡片残留内联 height`).toBe('')
        expect(s.卡片.内联样式.overflow, `${标} 卡片残留内联 overflow`).toBe('')
        if (!s.居中.溢出) {
          expect(Math.abs(s.居中.dx_滚动口), `${标} 水平未居中 ${s.居中.dx_滚动口}px`).toBeLessThanOrEqual(2)
          expect(Math.abs(s.居中.dy_滚动口), `${标} 垂直未居中 ${s.居中.dy_滚动口}px`).toBeLessThanOrEqual(2)
        } else {
          // 溢出时不要求居中，但滚回顶部后卡片顶边必须落在滚动口内（顶部可达）
          const 零滚动顶 = s.卡片.top + s.滚动容器.scrollTop
          expect(
            零滚动顶,
            `${标} 溢出时卡片顶部不可达（零滚动顶 ${零滚动顶} vs 口顶 ${s.滚动容器.rect.top}）`,
          ).toBeGreaterThanOrEqual(s.滚动容器.rect.top - 1)
        }
        if (s.模式 === 'zhuCe') {
          const 内 = s.内层滚动区
          const 内滚动 = !!内 && 内.scrollHeight > 内.clientHeight
          const 外滚动 = s.滚动容器.scrollHeight > s.滚动容器.clientHeight
          expect(内滚动 || 外滚动, `${标} 注册页无滚动了的滚动口`).toBe(true)
          const 宽 = 内滚动 ? 内!.滚动条宽 : s.滚动容器.滚动条宽
          expect(宽, `${标} 滚动条占位宽度 <6px：${宽}`).toBeGreaterThanOrEqual(6)
          expect(s.滚动条像素, `${标} 未采到滚动条像素`).not.toBeNull()
          expect(s.滚动条像素!.不同颜色数, `${标} 滚动条条带是纯色（不可见）`).toBeGreaterThan(2)
          expect(s.滚动条像素!.极差, `${标} 滚动条条带明度无层次（不可见）`).toBeGreaterThan(8)
          断言可拖(s, 标)
        }
        if (s.视口 === 异常小视口.名称) {
          expect(s.居中.溢出, `${标} 异常小视口登录页未溢出`).toBe(true)
          expect(
            s.滚动容器.滚动条宽,
            `${标} 登录页异常小视口无可见滚动条：${s.滚动容器.滚动条宽}`,
          ).toBeGreaterThanOrEqual(6)
          expect(s.滚动条像素!.不同颜色数, `${标} 登录页滚动条条带是纯色`).toBeGreaterThan(2)
          断言可拖(s, 标)
        }
        // 焦点：白线消失 + 组件自有焦点指示确实出现（可访问性未被削弱）
        if (s.焦点) {
          const f = s.焦点
          expect(
            f.活动元素,
            `${标} 点击后焦点未落在输入框（activeElement=${f.活动元素}）`,
          ).toBe(s.模式 === 'dengLu' ? 'denglu-shoujihao' : 'zhuce-shoujihao')
          expect(
            f.outlineStyle === 'none' || f.outlineWidth === '0px',
            `${标} 输入框仍绘制 outline：${f.outlineStyle}/${f.outlineWidth}/${f.outlineColor}`,
          ).toBe(true)
          expect(f.组含focusWithin, `${标} :focus-within 未命中`).toBe(true)
          const 展开 = /matrix\(([-\d.e]+)/.exec(f.下划线伪元素transform)
          expect(
            !!展开 && Math.abs(parseFloat(展开[1])) >= 0.99,
            `${标} 金色下划线未展开：transform=${f.下划线伪元素transform} transition=${f.过渡}`,
          ).toBe(true)
          const 静止标签 = 集.get(`${s.视口}|${s.主题}|${s.模式}|静止`)?.表单项[0]?.标签颜色 ?? ''
          expect(f.标签颜色, `${标} 聚焦标签未变色（静止=${静止标签}）`).not.toBe(静止标签)
          if (s.勾选框焦点) {
            expect(
              s.勾选框焦点.outlineStyle !== 'none' && s.勾选框焦点.outlineWidth !== '0px',
              `${标} 键盘聚焦自绘勾选框无可见焦点环：${JSON.stringify(s.勾选框焦点)}`,
            ).toBe(true)
          }
        }
        if (s.模式 === 'dengLu') expect(s.勾选框焦点, `${标} 未 Tab 到自绘勾选框`).not.toBeNull()
      }

      // 表单项垂直间距：相邻项间隙 ≥16px、上浮标签与上一项下划线间距 ≥12px
      for (const s of 记录.filter((x) => x.阶段 === '上浮')) {
        for (const f of s.表单项) {
          const 标 = `${s.视口}/${s.主题}/${s.模式}`
          if (f.与下一项间隙 !== null)
            expect(f.与下一项间隙, `${标} ${f.字段} 相邻项间隙 ${f.与下一项间隙}px`).toBeGreaterThanOrEqual(16)
          if (f.上一项下划线底到本标签顶 !== null)
            expect(
              f.上一项下划线底到本标签顶,
              `${标} ${f.字段} 上浮标签压上一项下划线（${f.上一项下划线底到本标签顶}px）`,
            ).toBeGreaterThanOrEqual(12)
          if (f.标签底到输入文字顶 !== null)
            expect(
              f.标签底到输入文字顶,
              `${标} ${f.字段} 上浮标签与输入文字太挤（${f.标签底到输入文字顶}px）`,
            ).toBeGreaterThanOrEqual(7)
          if (f.下划线 && f.标签)
            expect(
              f.下划线.top - f.标签.bottom,
              `${标} ${f.字段} 下划线与上浮标签相交`,
            ).toBeGreaterThanOrEqual(0)
        }
      }
      // 深浅两档的垂直节奏必须逐值相等：--jiange-* / --ziti-* 历史上只在 light 档声明，
      // 深色档裸引用会塌陷为 0（间距）/继承值（字号），正是「手机号密码这几个字太挤」的另一半
      for (const 暗 of 记录.filter((s) => s.主题 === '暗色' && s.阶段 === '静止')) {
        const 浅 = 集.get(`${暗.视口}|浅色|${暗.模式}|静止`)
        if (!浅) continue
        const 标 = `${暗.视口}/${暗.模式}`
        expect(暗.令牌.头部实margin, `${标} 深色档表单头部留白与浅色不一致（浅=${浅.令牌.头部实margin}）`).toBe(
          浅.令牌.头部实margin,
        )
        expect(
          暗.令牌.标签行实margin,
          `${标} 深色档标签行留白与浅色不一致（浅=${浅.令牌.标签行实margin}）`,
        ).toBe(浅.令牌.标签行实margin)
        expect(
          暗.表单项.map((f) => [f.组.height, f.与下一项间隙, f.标签字号]),
          `${标} 深浅两档字段间距/字号节奏不一致`,
        ).toEqual(浅.表单项.map((f) => [f.组.height, f.与下一项间隙, f.标签字号]))
      }

      const 错误 = [...new Set(记录.flatMap((s) => s.控制台?.error ?? []))]
      expect(错误, `控制台 error：${错误.join(' | ')}`).toHaveLength(0)
    }

  })
})
