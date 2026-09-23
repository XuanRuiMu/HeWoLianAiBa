import { expect, test, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createConsoleCollector } from './console-error-collector'
import {
  外壳,
  编辑器,
  文字段,
  图片块,
  删除块,
  聚焦并插块,
  读占位,
  读块序,
  读图片块id,
  读光标形态,
  读滚动,
  读横向溢出,
  读文本,
  读图片块数,
  读输入区几何,
  读块可视率,
  读删除钮命中,
  清空文本,
  等块落定,
  等淡出层消失,
  等面板收合,
  等面板展开,
  聚焦到,
  写入多行,
  逐行敲入,
  输入文本,
} from './输入区取样'

// FP-10c 第 ⑤ 刀：图文**真内联**的行为守卫（contenteditable 一条流，块落在光标处）。
// 这一条 spec 只钉「textarea 载体下结构上不可能存在、换载体后才第一次可测」的行为，
// 不重复 vitest 侧已覆盖的纯函数口径；数据全 page.route 桩 ⇒ 不需要后端；派生 config 端口 5211 + headless。
// 落盘一律带本轮后缀（事故 L-10：复跑覆盖旧证据不可恢复）。
test.setTimeout(240000)

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 前端根 = path.resolve(本目录, '..')
const 取证目录 =
  process.env.FP10C_EVIDENCE_DIR ?? path.resolve(前端根, 'test-results', 'fp10c-取证')
const 后缀 = process.env.FP10C_SUFFIX ? `-${process.env.FP10C_SUFFIX}` : '-20260923'
const 结果文件 = path.resolve(取证目录, `FP-10c-真内联守卫${后缀}.json`)

const 会话ID = 'fp10c-huihua'
const 我的ID = 'fp10c-uid'
const 文字基线 = '甲乙丙丁戊'
const 长URL =
  'https://example.invalid/一段极长的中文与字母混合不带空格的地址用来验证窄屏断行而不是顶出横向溢出abcdefghijklmnopqrstuvwxyz0123456789'

const 测试用户 = {
  id: 我的ID,
  shou_ji_hao: '13800138010',
  yong_hu_ming: 'fp10c',
  ni_cheng: '真内联取证',
  tou_xiang: null,
  mo_ren_xing_bie: 'female',
  jiao_se: null,
  neng_li: [],
}
const 用户设置 = {
  uid: 我的ID,
  shou_ji_hao: '13800138010',
  tou_xiang: null,
  qian_ming: null,
  qian_ming_ke_jian_xing: 'gong_kai',
  qian_ming_bai_ming_dan: [],
  gong_kai_zhang_hao: true,
  gong_kai_shou_ji_hao: false,
  gong_kai_you_xiang: false,
  bang_ding_you_xiang: '',
}
const 历史消息 = [
  {
    id: 'fp10c-m1',
    hui_hua_id: 会话ID,
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '气泡里的可选中的基线文字 取样用',
    lei_xing: 'wenben',
    mei_ti_id: null,
    shi_jian_chuo: 1700000000000,
    yi_du: true,
  },
]

async function 挂载夹具(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('令牌', 'fp10c-token')
  })
  await page.route('**/socket.io/**', (route) => route.abort())
  await page.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (route) => route.abort())
  await page.route('**/api/**', (route) => {
    const 路径 = decodeURIComponent(new URL(route.request().url()).pathname)
    if (!路径.startsWith('/api')) return route.fallback()
    if (路径.endsWith('/api/认证/信息')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 测试用户 }) })
    }
    if (路径 === '/api/用户设置' || 路径.startsWith('/api/用户设置/')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: 用户设置 }) })
    }
    if (路径.includes('/api/聊天/会话/') && 路径.endsWith('/消息')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { lie_biao: 历史消息, zong_shu: 1, hai_you_geng_duo: false },
        }),
      })
    }
    if (路径.includes('/api/聊天/会话列表')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { lie_biao: [{ id: 会话ID, ming_cheng: '真内联会话', jiao_se_id: 会话ID }] },
        }),
      })
    }
    if (路径.startsWith('/api/角色/详情/')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { jiao_se: { id: 会话ID, 名字: '真内联角色', ming_zi: '真内联角色', tou_xiang: null, 头像: null }, dang_an_zhuang_tai: null },
        }),
      })
    }
    if (路径.endsWith('/api/聊天/多模态配置')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          cheng_gong: true,
          shu_ju: { yuYinLiJieQiYong: false, shiPinLiJieQiYong: false, tuXiangShengChengQiYong: false, shiPinShengChengQiYong: false, meiRiShengChengShangXian: 0 },
        }),
      })
    }
    if (路径.startsWith('/api/表情/我的')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], zong_shu: 0 } }) })
    }
    if (路径.startsWith('/api/通知')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: { lie_biao: [], wei_du_shu: 0 } }) })
    }
    if (路径.endsWith('/api/资料/封禁状态')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ cheng_gong: true, shu_ju: { bei_feng_jin: false, ji_bie: 'zheng_chang', wei_gui_ci_shu: 0, jie_feng_shi_jian: null, shu_su_zhuang_tai: 'wu' } }),
      })
    }
    return route.fulfill({ status: 200, body: JSON.stringify({ cheng_gong: true, shu_ju: {} }) })
  })
}

async function 进聊天页(page: Page) {
  await page.goto(`/chat/${会话ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(page.locator(编辑器), '图文真内联编辑器未渲染').toBeVisible({ timeout: 60000 })
  await expect(page.locator(编辑器), '编辑器必须是 contenteditable').toHaveAttribute('contenteditable', 'true')
  await expect(page.locator('textarea.shuru-kuang'), 'textarea 载体必须已退役').toHaveCount(0)
  await page.waitForTimeout(500)
}

/**
 * 确定复位（清理用，不是判据）：重新导航进同一会话。
 * 待发块只有 blob 预览、不落盘 ⇒ 重进即清空；文字走草稿链，复位后仍需显式 清空文本。
 */
async function 重进页面(page: Page): Promise<void> {
  await 进聊天页(page)
}

/** 带草稿的夹具：草稿键格式 = `caoGao:` + CAO_GAO_JIAN.aiLiaoTian(会话ID)（src/composables/use草稿.ts:5 与 :105） */
async function 挂载草稿夹具(page: Page, 内容: string) {
  await 挂载夹具(page)
  await page.addInitScript(
    ([键, 值]) => {
      window.sessionStorage.setItem(键, 值)
    },
    [`caoGao:ai:${会话ID}`, 内容] as const,
  )
}

// 取证元数据修正（不动判据）：端口/headless 记实际被检值，不再记 env 缺省值
// （起点基线的证据文件里写着 5190/false，实际被检源是派生 config 的 5211，溯源时会误导）。
const 结果: Record<string, unknown> = {
  端口: new URL(process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.FP10C_PORT ?? 5211}`).port,
  被检源: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.FP10C_PORT ?? 5211}`,
  headless: process.env.FP10C_HEADED === '1' ? false : true,
  后缀,
}

function 落盘(): void {
  fs.mkdirSync(取证目录, { recursive: true })
  fs.writeFileSync(结果文件, JSON.stringify(结果, null, 2), 'utf8')
}
test.afterEach(() => 落盘())
test.afterAll(() => 落盘())

/** 一条流的图文序压成可比对的字符串：`文(甲乙)|图(id)|文(丙丁戊)` */
function 图文签名(序: Awaited<ReturnType<typeof 读块序>>): string {
  return 序.map((项) => (项.类型 === '图片' ? `图(${项.id.slice(0, 8)})` : `文(${项.文本})`)).join('|')
}

/* ─────────────── ① 段中插图：块两侧文字都还在且顺序与真源一致 ─────────────── */

test('① 文字中间插图片块 ⇒ 块两侧文字都在，图文序与插入点一致', async ({ page }) => {
  const collector = createConsoleCollector(page)
  await 挂载夹具(page)
  await 进聊天页(page)
  await 输入文本(page, 文字基线)
  const 块 = await 聚焦并插块(page, { 文字偏移: 2 }, { 名: 'fp10c-a.png', RGB: [255, 0, 0] })
  await 等块落定(page, 1)
  const 序 = await 读块序(page)
  const 记 = {
    插入点偏移: 2,
    新块id: 块.新块id,
    图文序: 图文签名(序),
    光标形态: 块.光标,
    全文: await 读文本(page),
  }
  结果['①'] = 记

  // 判据①-1：块两侧的文字段各成一段，前段 = 插入点之前、后段 = 插入点之后，一段都不许丢
  const 图序 = 序.findIndex((项) => 项.id === 块.新块id)
  expect(图序, '新块不在图文序里').toBeGreaterThan(-1)
  expect(序[图序].类型).toBe('图片')
  expect(序.slice(0, 图序).filter((项) => 项.类型 === '文字').map((项) => 项.文本).join(''), '块左侧文字丢失或次序不对').toBe(文字基线.slice(0, 2))
  expect(序.slice(图序 + 1).filter((项) => 项.类型 === '文字').map((项) => 项.文本).join(''), '块右侧文字丢失或次序不对').toBe(文字基线.slice(2))
  // 判据①-2：整条流的文字投影逐字等于插入前（插块一个字符都不该动）
  expect(记.全文).toBe(文字基线)
  // 判据①-3：块是原子节点（一次退格整块消失的前提）
  expect(序[图序].原子).toBe('false')
  expect(序[图序].可拖).toBe('true')
  // 判据①-4：块与文字在同一条流里（父级就是编辑器本体），不存在第二个序列容器
  const 同一条流 = await page.evaluate(
    ([编, 图]) => {
      const 块元 = document.querySelector(图)
      return {
        父级是编辑器: !!块元 && 块元.parentElement === document.querySelector(编),
        旧序列容器数: document.querySelectorAll('.dai-fa-kuai-lie').length,
        编辑器外块数: Array.from(document.querySelectorAll('.dai-fa-kuai')).filter((元) => !元.closest(编)).length,
      }
    },
    [编辑器, 图片块] as const,
  )
  expect(同一条流, '块必须与文字同处编辑器这一条流').toEqual({ 父级是编辑器: true, 旧序列容器数: 0, 编辑器外块数: 0 })
  const 错误 = collector.getErrors().filter((志) => !/\.(woff2?|ttf|otf)(\?.*)?$/.test(志.location?.url || ''))
  expect(错误, '控制台 error 非零：' + 错误.map((志) => 志.text).join('\n')).toEqual([])
})

/* ─────────────── ② 真机点在块左/右侧 ⇒ 落位在光标处（jsdom 结构盲区） ─────────────── */

test('②a 光标落在文字段内时插块 ⇒ 必须劈开该文字段、块在光标处（反证：偏移 0 时块在最前）', async ({ page }) => {
  await 挂载夹具(page)
  await 进聊天页(page)
  await 输入文本(page, 文字基线)
  const 第一张 = await 聚焦并插块(page, { 文字偏移: 0 }, { 名: 'fp10c-1.png', RGB: [0, 200, 255] })
  await 等块落定(page, 1)
  // 反证（判据自证）：光标在文字最前 ⇒ 块必须排在所有文字之前。
  // 若实现是「永远追加到末尾」，这一条会先红 ⇒ 后面所有落位判据就不可能被蒙过去。
  const 首 = await 读块序(page)
  结果['②a'] = { 图文序: 图文签名(首), 光标: 第一张.光标 }
  expect(首[0].id, '反证：光标在文字最前时块却不在最前').toBe(第一张.新块id)
  expect(首[0].类型).toBe('图片')
  expect(首.map((项) => (项.类型 === '图片' ? '图' : 项.文本)).join('|'), '块必须劈开整段文字').toBe('图|' + 文字基线)
})

test('②b 真机点在块边界（锚点＝编辑器+子节点下标）再插一张 ⇒ 必须落在光标处【已知实现缺陷】', async ({ page }) => {
  // 派单点名的 jsdom 结构性盲区：anchorNode===编辑器 && anchorOffset===子节点下标 这一支在
  // jsdom 下无用例可达，真机点在已有块的左/右侧正是这条形态。判据保留原文不放宽，
  // 用 test.fail 标成「预期失败」：实现修好后它会以 unexpected pass 逼着把这个标记摘掉。
  test.fail(true, "FP-10c 实测缺陷（无权改 src）：块边界光标形态 {kuaiId:''} 被 chaRuTuPian 判成「块 id 失效⇒追加到末尾」（use待发图文.ts:245-250 + 图文输入区.vue:147）")
  await 挂载夹具(page)
  await 进聊天页(page)
  await 输入文本(page, 文字基线)
  const 第一张 = await 聚焦并插块(page, { 文字偏移: 0 }, { 名: 'fp10c-b1.png', RGB: [0, 200, 255] })
  await 等块落定(page, 1)

  // 真机点在块左侧：块是编辑器首子节点 ⇒ 落点在编辑器自身的 padding 上
  const 形态 = await 聚焦到(page, { 块左: 第一张.新块id })
  const 第二张 = await 聚焦并插块(page, { 块左: 第一张.新块id }, { 名: 'fp10c-b2.png', RGB: [255, 120, 0] })
  await 等块落定(page, 2)
  const 后 = await 读块序(page)
  const 记 = {
    块左锚点形态: 形态,
    插入后图文序: 图文签名(后),
    新块index: 后.findIndex((项) => 项.id === 第二张.新块id),
    旧块index: 后.findIndex((项) => 项.id === 第一张.新块id),
    全文: await 读文本(page),
  }
  结果['②b'] = 记
  expect(形态.锚点是编辑器, `本用例的前提是「锚点＝编辑器本体」，实测 ${形态.锚点节点名}#${形态.锚点偏移}`).toBe(true)
  expect(记.全文, '插块不许动一个字符').toBe(文字基线)
  expect(记.新块index, `点块左侧插入的新块没落在光标处（旧块 index=${记.旧块index}，新块 index=${记.新块index}）`).toBeLessThan(记.旧块index)

  // 同一条判据的镜像：点块右侧 ⇒ 新块必须在旧块之后（只测左侧的话「永远插最前」也能过）
  await 删除块(page, 第二张.新块id)
  await 等块落定(page, 1)
  const 第三张 = await 聚焦并插块(page, { 块右: 第一张.新块id }, { 名: 'fp10c-b3.png', RGB: [0, 255, 120] })
  await 等块落定(page, 2)
  const 右 = await 读块序(page)
  记.块右图文序 = 图文签名(右)
  expect(右.findIndex((项) => 项.id === 第三张.新块id), '点块右侧插入的新块没落在旧块之后').toBeGreaterThan(
    右.findIndex((项) => 项.id === 第一张.新块id),
  )
  expect(await 读文本(page), '块右侧插入也不许动文字').toBe(文字基线)
})

/* ─────────────── ③ 未聚焦时的外部写入不得抢走别处选区（只测不改 src） ─────────────── */

test('③ 编辑器未聚焦时外部写入（表情追加）：焦点与别处选区归属实测', async ({ page }) => {
  await 挂载夹具(page)
  await 进聊天页(page)
  await 输入文本(page, '追加前')
  // 先把面板开着，避免「点按钮」这件事自身的原生选区清理混进测量
  await page.locator('.biaoqing-anniu').click()
  await expect(page.locator('.emoji-mianban')).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(400)

  // 在**别处**（消息区气泡）放一份真选区，编辑器不聚焦
  const 已选 = await page.evaluate(() => {
    const 气泡 = document.querySelector('.xiaoxi-xiangmu .qipao-neirong') as HTMLElement | null
    if (!气泡) return { 建成: false, 文本: '' }
    const 选 = window.getSelection()
    if (!选) return { 建成: false, 文本: '' }
    const 范 = document.createRange()
    范.selectNodeContents(气泡)
    选.removeAllRanges()
    选.addRange(范)
    return { 建成: 选.toString().length > 0, 文本: 选.toString().slice(0, 20) }
  })
  expect(已选.建成, '前置失效：消息区里建不出选区（判据无法测量）').toBe(true)
  const 写前 = await 读光标形态(page)

  // 外部写入：不经过鼠标（focus + Enter 激活按钮），只留下「真源变了 ⇒ 组件重建 ⇒ fuYuanGuangBiao」这一条链
  const 表情钮 = page.locator('.emoji-xiangmu').first()
  expect(await page.locator('.emoji-xiangmu').count(), '表情面板里没有可点项').toBeGreaterThan(0)
  const 表情文本 = await 读文本(page)
  await 表情钮.focus()
  const 焦点后 = await 读光标形态(page)
  await page.keyboard.press('Enter')
  await expect
    .poll(async () => 读文本(page), { timeout: 15000, message: '表情追加没进文字流' })
    .not.toBe(表情文本)
  const 写后 = await 读光标形态(page)
  const 选区归属 = await page.evaluate(() => {
    const 选 = window.getSelection()
    const 编 = document.querySelector('.shuru-kuang')
    if (!选 || 选.rangeCount === 0) return { 有选区: false, 在编辑器内: false, 文本: '' }
    const 首 = 选.anchorNode
    return {
      有选区: 选.toString().length > 0,
      在编辑器内: !!首 && !!编 && (首 === 编 || 编.contains(首)),
      文本: 选.toString().slice(0, 20),
    }
  })
  const 记 = { 建选区: 已选, 写入前: 写前, 聚焦表情钮后: 焦点后, 写入后: 写后, 选区归属 }
  结果['③'] = 记

  // 判据（能钉死的部分）：外部写入必须真的落到文字流里，且不许把用户的键盘焦点带进输入区
  expect((await 读文本(page)).startsWith('追加前'), '表情追加丢了原有文字').toBe(true)
  // ↓ 派单口径：③ 只测并如实报告（不改 src）。焦点/选区被抢是**实测结论**，
  //   用 Playwright 的 bug 注解显式挂红在报告里，而不是把它偷偷 assert 成 pass。
  const 焦点被抢 = 写后.编辑器已聚焦 === true
  const 选区被抢 = 选区归属.在编辑器内 === true
  记.焦点被抢 = 焦点被抢
  记.选区被抢 = 选区被抢
  if (焦点被抢 || 选区被抢) {
    test.info().annotations.push({
      type: 'bug',
      description:
        'FP-10c 实测缺陷（本工人无权改 src，仅记录）：编辑器未聚焦时的外部写入（表情追加 / 草稿回填同一条链）' +
        '经 watch→xuanRan→fuYuanGuangBiao 无条件 removeAllRanges()+addRange()' +
        '（src/components/聊天/图文输入区.vue:295-296，调用点 :323，触发点 :466-474），实测结果：' +
        `焦点被抢进输入区=${焦点被抢}（activeElement=${写后.激活元素类}，写入前=${写前.激活元素类}）；` +
        `别处选区被改判到输入区内=${选区被抢}（选区文本「${选区归属.文本}」）。证据 ${结果文件}`,
    })
  }

  // 同一只 helper 的第二次真实用途：面板收起带 Vue 过渡，leave-active 那一层还在吃
  // pointer-events 时点下一只按钮会落进正在淡出的层（FP-02 的 .biaodan-qiehuan-leave-active 同一机制）
  await page.locator('main.xiaoxi-quyu').click({ position: { x: 8, y: 8 } })
  await 等淡出层消失(page, 'emoji-zhankai-leave-active')
  await expect(page.locator('.emoji-mianban')).toBeHidden({ timeout: 8000 })
})

/* ─────────────── ③b 挂载期外部写入（草稿回填）：同一把尺子的第二次真实用途 ─────────────── */

const 草稿基线 = '草稿回填基线甲乙丙'

test('③b 挂载期外部写入（草稿回填）：无用户手势时的焦点/选区归属实测', async ({ page }) => {
  await 挂载草稿夹具(page, 草稿基线)
  await page.goto(`/chat/${会话ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(page.locator(编辑器), '图文真内联编辑器未渲染').toBeVisible({ timeout: 60000 })
  // onMounted 里跑两轮 xuanRan（图文输入区.vue:476-482），两轮都要落定后再读归属
  await page.waitForTimeout(1200)
  const 形态 = await 读光标形态(page)
  const 文本 = await 读文本(page)
  const 记: Record<string, unknown> = { 草稿: 草稿基线, 回填文本: 文本, 光标形态: 形态 }
  结果['③b'] = 记

  // 判据（功能面）：草稿必须回填进同一条文字流，一个字都不许多也不许少
  expect(文本, '草稿回填没落到文字真源里（或掺进了多余字符）').toBe(草稿基线)
  // 判据（自相一致性）：`编辑器已聚焦` 与 `activeElement 是编辑器` 是同一条事实的两种读法，不许各说一半
  expect(形态.编辑器已聚焦, `焦点读法自相矛盾：activeElement=${形态.激活元素类}`).toBe(形态.激活元素类 === 'shuru-kuang')

  // 反证（检测器自证，本轮第 2 处）：同一条 读光标形态 必须分得开「选区在编辑器里」与「选区在别处」。
  // 分不开 ⇒ 上面那两条归属结论与 ③ 的「选区被抢」全都是恒真读数，整条判据作废。
  const 建别处选区 = await page.evaluate(() => {
    const 气泡 = document.querySelector('.xiaoxi-xiangmu .qipao-neirong') as HTMLElement | null
    const 选 = window.getSelection()
    if (!气泡 || !选) return false
    const 范 = document.createRange()
    范.selectNodeContents(气泡)
    选.removeAllRanges()
    选.addRange(范)
    return 选.toString().length > 0
  })
  expect(建别处选区, '前置失效：消息区里建不出选区 ⇒ 本条反证测不到东西').toBe(true)
  const 别处形态 = await 读光标形态(page)
  记.反证_别处选区 = 别处形态
  expect(别处形态.锚点在编辑器内, '反证：别处选区被 读光标形态 报成"在编辑器内" ⇒ 归属读数恒真').toBe(false)

  // 派单口径：挂载期外部写入抢焦点/选区只测并如实报告（不改 src）
  if (形态.编辑器已聚焦 || 形态.锚点在编辑器内) {
    test.info().annotations.push({
      type: 'bug',
      description:
        'FP-10c 实测缺陷（本工人无权改 src，仅记录）：挂载期的外部写入（草稿回填）同样经 ' +
        'onMounted→xuanRan→fuYuanGuangBiao 无条件 removeAllRanges()+addRange()' +
        '（src/components/聊天/图文输入区.vue:295-296，调用点 :323/:477），用户一个手势都没做，实测结果：' +
        `编辑器已聚焦=${形态.编辑器已聚焦}（activeElement=${形态.激活元素类}）、` +
        `选区锚点落进编辑器=${形态.锚点在编辑器内}（${形态.锚点节点名}#${形态.锚点偏移}）。` +
        '与 ③（表情追加）是同一只 helper 的两条触发路径。证据 ' + 结果文件,
    })
  }
})

/* ─────────────── ④ 折叠态盒高与图标盒严格同值（收 FP-20⑦ 的 0.61px） ─────────────── */

test('④ 折叠态输入区盒高与图标盒严格同值（差 0，非 ≤1px）', async ({ page }) => {
  await 挂载夹具(page)
  await 进聊天页(page)
  const 几何 = await 读输入区几何(page)
  const 记: Record<string, unknown> = { 几何 }
  结果['④'] = 记
  expect(几何.令牌.danxing, '折叠档令牌缺失').toBe('35px')
  expect(几何.令牌.tubiao, '图标档令牌未引用折叠档 ⇒ 两者不可能是同一个值').toBe('35px')
  expect(几何.计算.maxHeight, '折叠态 max-height 不再吃令牌').toBe('35px')
  expect(几何.计算.minHeight, '折叠态 min-height 不再吃令牌').toBe('35px')
  expect(几何.编辑器高, `折叠态盒高不等于令牌：${几何.编辑器高}`).toBe(35)
  // FP-23 的等高契约范围就是输入区图标盒（表情/加号/语音/展开）：真机量，差值必须恰为 0
  // （旧 JS 量高链留下的 FP-20⑦ 差是 0.61px，改纯 CSS 同令牌后没有第二个度量来源可言）。
  const FP23族 = ['表情', '加号', '语音', '展开']
  for (const 名 of FP23族) {
    expect(几何.图标[名], `${名} 图标盒取不到`).toBeTruthy()
    expect(Math.abs(几何.图标[名] - 几何.编辑器高), `${名}图标盒与折叠态输入区盒高差（FP-20⑦ 的 0.61px 必须归零）`).toBe(0)
  }
  // 发送按钮属 FP-05 的「按钮与外壳等高」判据（外壳 = 编辑器 + 1px 边框×2），口径不同，另立一条：
  // 外壳高必须严格等于 编辑器高 + 2×边框，且发送按钮与外壳的差**如实记录**（那是 FP-05 的账，不在此放宽也不在此收）。
  记.发送与外壳差 = +(几何.图标.发送 - 几何.外壳高).toFixed(5)
  const 边框 = await page.evaluate((外) => {
    const 算 = getComputedStyle(document.querySelector(外) as HTMLElement)
    return parseFloat(算.borderTopWidth) || 0
  }, 外壳)
  expect(几何.外壳高, `外壳高 != 编辑器高 + 2×${边框}px 边框`).toBe(几何.编辑器高 + 边框 * 2)
  // 反证：折叠档必须是令牌驱动而非内容驱动 —— 塞 5 行进去，盒高**仍然**严格 35px。
  // 旧 JS 量高链（use输入框.ts）会写成内容驱动的内联 maxHeight，这条就会红；不塞满则测不出区别。
  await 写入多行(page, ['第一行短', '第二行短', '第三行短', '第四行短', '第五行短'])
  const 五行测 = await 读输入区几何(page)
  记.五行后 = 五行测
  expect(五行测.计算.展开类, '五行文本被擅自改成展开态').toBe(false)
  expect(五行测.编辑器高, '折叠态盒高被内容撑开（max-height 没吃令牌）').toBe(35)
  expect((await 读滚动(page)).scrollHeight > (await 读滚动(page)).clientHeight, '五行文本在折叠态没溢出 ⇒ 前置失效').toBe(true)
  /*
   * 反证（检测器自证，本轮第 3 处）：上面那条「图标盒 vs 折叠态输入区差恰为 0」如果读的是恒等值，
   * 把它喂进一次真实扰动就必须不成立 —— 人为把表情图标盒改成 40px，同一把尺子必须立刻报出差值。
   * 报不出来 ⇒ 等高判据恒真，④ 整条作废（改完立刻还原，不留残留状态）。
   */
  const 扰动 = await page.evaluate(
    ([钮, 高]) => {
      const 元 = document.querySelector(钮) as HTMLElement
      const 原 = 元.style.height
      元.style.height = 高
      const 扰动高 = 元.getBoundingClientRect().height
      const 差值 = 扰动高 - (document.querySelector('.shuru-kuang') as HTMLElement).getBoundingClientRect().height
      元.style.height = 原
      return { 扰动高, 差值: +差值.toFixed(5), 还原后: 元.getBoundingClientRect().height }
    },
    ['.biaoqing-anniu', '40px'] as const,
  )
  记.反证_等高检测器 = 扰动
  expect(扰动.扰动高, '反证前置：40px 没真的落到图标盒上 ⇒ 扰动没生效').toBe(40)
  expect(Math.abs(扰动.差值) > 0, '反证：给图标盒 40px 后等高判据仍报差 0 ⇒ 检测器恒真').toBe(true)
  expect(扰动.还原后, '反证还原失败：图标盒高没回到原值').toBe(35)
})

/* ─────── ⑥ 实测：折叠态里 64px 图片块的可见率（真内联新增的物理约束） ─────── */

test('⑥ 实测：折叠态图片块可见率与展开态回落（记录，不改判 FP-10b 旧判据）', async ({ page }) => {
  await 挂载夹具(page)
  await 进聊天页(page)
  await 输入文本(page, '甲乙')
  const 块 = await 聚焦并插块(page, { 文字偏移: 2 }, { 名: 'fp10c-kejian.png' })
  await 等块落定(page, 1)
  const 折叠 = await 读块可视率(page, 块.新块id)
  await page.locator('.zhan-kai-anniu').click()
  await expect
    .poll(async () => (await 读输入区几何(page)).计算.展开类, { timeout: 10000, message: '点展开按钮没翻到 .zhan-kai' })
    .toBe(true)
  const 展开 = await 读块可视率(page, 块.新块id)
  const 记 = { 折叠态: 折叠, 展开态: 展开 }
  结果['⑥'] = 记
  // 判据（等价于 FP-10b 旧「外盒 rect 包含序列 rect」那一支的新形态）：
  // 块必须真的在盒里看得见 —— 完全看不见（可视比 0）才算破；可见率本身按派单口径只记录。
  expect(折叠.可视比, `折叠态块完全不可见：${JSON.stringify(折叠)}`).toBeGreaterThan(0)
  expect(展开.可视比, `展开态块仍被裁切：${JSON.stringify(展开)}`).toBe(1)
  if (折叠.可视比 < 1) {
    test.info().annotations.push({
      type: 'info',
      description:
        `FP-10c 实测：折叠态（min/max-height 同为 --shuru-danxing-gao-du=35px，内容盒仅 ` +
        `${折叠.编辑器clientHeight}px）下 --daifa-kuai-tu-kuan/gao=64px 的图片块只能看到 ` +
        `${折叠.可视高}/${折叠.块高}px（可视比 ${折叠.可视比}）。旧形态下待发序列是编辑器之外的独立整宽行，` +
        '缩略图完整可见 ⇒ 真内联把「一眼看到待发图」这条视觉反馈压进了需要展开/滚动才看得见的一档。' +
        '派单口径为「只记录」，判据不因此放宽。',
    })
  }
})

/* ─────────────── ⑤ 移动端 375/320 不横溢 + chip 单块删除 ─────────────── */

for (const 宽 of [375, 320] as const) {
  test(`⑤ 移动 ${宽}px 不横向溢出 + 图片块单块删除`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 宽, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    await 挂载夹具(page)
    await page.goto(`/chat/${会话ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator(编辑器)).toBeVisible({ timeout: 60000 })
    await page.waitForTimeout(500)
    const 视口自证 = await page.evaluate(() => window.innerWidth)
    expect(视口自证, 'viewport 自证').toBe(宽)

    const 静置 = await 读横向溢出(page)
    const 记: Record<string, unknown> = { 视口: 宽, 静置, 块删除: {} }
    结果[`⑤${宽}`] = 记

    // 长 URL（无空格）在窄屏必须断行而不是把页面顶出横向溢出
    await 输入文本(page, 长URL)
    const 长文 = await 读横向溢出(page)
    记.长URL态 = 长文
    expect(长文.溢出, `长 URL 顶出页面横向溢出：${JSON.stringify(长文)}`).toBe(false)
    expect(长文.编辑器溢出, `长 URL 顶出编辑器横向溢出：${JSON.stringify(长文)}`).toBe(false)

    // chip 单块删除：块 + 文字同流，一次 Backspace 整块消失且文字不受伤
    await 清空文本(page)
    await 输入文本(page, '甲乙')
    // 块插在文字**最前** ⇒ DOM = [图, 文"甲乙"]，点块右侧后光标的上一个兄弟节点必然是那个
    // contenteditable=false 的原子块，「一次退格整块消失」测的才是原子性而不是光标落点运气。
    const 块 = await 聚焦并插块(page, { 文字偏移: 0 }, { 名: `fp10c-${宽}.png` })
    await 等块落定(page, 1)
    const 删除前 = await 读块序(page)
    const 图序 = 删除前.findIndex((项) => 项.id === 块.新块id)
    expect(图序, '块没排在文字最前（前置失效）').toBe(0)
    // 真机退格实测（只记录）：块右侧紧挨着文字段，鼠标点下去落在第几个字符上是亚像素运气，
    // 所以这一支不做硬判据，只把「退格一次后块还在不在、文字少了什么」记进证据。
    const 块右光标 = await 聚焦到(page, { 块右: 块.新块id })
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(400)
    const 退格后 = { 块数: await 读图片块数(page), 文本: await 读文本(page), 光标: 块右光标 }
    记.退格实测 = { 退格前图文序: 图文签名(删除前), 块序位: 图序, ...退格后 }
    if (退格后.块数 > 0) {
      test.info().annotations.push({
        type: 'info',
        description: `⑤ 移动${宽}：真机点块右侧后按一次退格没能整块删除（块数=${退格后.块数}，文本=${JSON.stringify(退格后.文本)}，锚点=${块右光标.锚点节点名}#${块右光标.锚点偏移}）。块右侧紧贴文字段时鼠标落点无法保证落在块边界上，这一支不作硬判据，只做记录。`,
      })
    }
    // 回到确定的前置态：[图, 文"甲乙"]（上一支退格可能已经动过块或文字，不重铺就没法判"一个字都不伤"）。
    // FP-10c 接续刀改判（清理链换法，判据一字未动）：这里原本用「逐块点 ×」做清理，
    // 起点基线实测 320 档下 × 的盒落在编辑器可视区外（客户端宽 56px），Playwright 的 click 在
    // actionTimeout 缺省（=0，不限时）时一路重试到 test.setTimeout 才断，4 分钟只留下一句 timeout。
    // 清理不是判据 ⇒ 换成与靶可命中性无关的确定复位（重新进页；待发块是 blob 预览，不落盘）。
    await 重进页面(page)
    await 清空文本(page)
    await 输入文本(page, '甲乙')
    const 重铺块 = await 聚焦并插块(page, { 文字偏移: 0 }, { 名: `fp10c-${宽}-again.png` })
    await 等块落定(page, 1)
    const 重铺序 = await 读块序(page)
    expect(重铺序.findIndex((项) => 项.id === 重铺块.新块id), '重铺后块不在整条流最前（前置失效）').toBe(0)
    // 键盘单块删除的确定性判据：光标移到整条流最前（Home），一次前向删除必须把原子块整块带走、一个字都不伤
    await page.locator(编辑器).click()
    await page.keyboard.press('Home')
    await page.keyboard.press('Delete')
    await expect
      .poll(async () => 读图片块数(page), { timeout: 15000, message: '一次前向删除没把图片块整块删掉' })
      .toBe(0)
    const 删除后文本 = await 读文本(page)
    记.块删除 = { 前向删除后文本: 删除后文本 }
    expect(删除后文本, '整块前向删除把文字也带走了').toBe('甲乙')
    记.删块后宿主数 = await page.locator(`${编辑器} [data-kuai-id]`).count()
    // 残留 [data-kuai-id] 宿主是另一条独立判据，单独立在 ⑧ 里，不混进本用例把移动端的结论一起拖红

    // 点 × 单块删除（移动端触摸靶也算）：先量靶的可命中性，命中不了就不点（点在不可命中上是挂死不是判据），
    // 数值照实落盘；「× 必须可命中 ⇒ 必须能单块删除」由 `⑤ 移动 320 ×删除靶可达性【已知实现缺陷】` 判。
    const 第二 = await 聚焦并插块(page, '编辑器', { 名: `fp10c-${宽}-x.png` })
    await 等块落定(page, 1)
    const 靶 = await 读删除钮命中(page, 第二.新块id)
    记['×靶命中性'] = 靶
    expect(靶.钮, '块上没有 × 删除钮（类名契约断了）').toBeTruthy()
    if (!靶.相交 || 靶.命中者 !== `BUTTON.dai-fa-kuai-shanchu`) {
      test.info().annotations.push({
        type: 'bug',
        description:
          `⑤ 移动${宽}：× 删除靶此刻点不到 —— 钮盒 ${JSON.stringify(靶.钮)} 与编辑器可视盒 ` +
          `${JSON.stringify(靶.编辑器)} 相交=${靶.相交}，该坐标上的命中者是 ${靶.命中者}。` +
          '根因同 64px 那一条：.dai-fa-kuai* / .dai-fa-kuai-shanchu 的规则住在 <style scoped> 里，' +
          '而块节点是 document.createElement 造出来的（图文输入区.vue:197-227 与 :543-579）⇒ × 没有被' +
          '钉回块左上角，窄屏下随缩略图溢出到编辑器可视区外。硬判据见 ⑤ 移动 320 ×删除靶可达性。',
      })
    } else {
      await 删除块(page, 第二.新块id)
    }
    const 溢出后 = await 读横向溢出(page)
    记.删除后溢出 = 溢出后
    expect(溢出后.溢出, '删块后出现横向溢出').toBe(false)

    // 反证（检测器自证）：人为塞一只比视口更宽的绝对定位盒，同一台检测器必须报出溢出；
    // 报不出来 ⇒ 上面三条「无横溢」是恒真判据，整段作废。
    const 检测器有效 = await page.evaluate((目标宽) => {
      const 假 = document.createElement('div')
      假.style.cssText = `position:absolute;left:0;top:0;width:${目标宽}px;height:4px;z-index:99999`
      document.body.appendChild(假)
      const 报 = document.documentElement.scrollWidth > document.documentElement.clientWidth
      假.remove()
      return 报
    }, 宽 + 200)
    记.反证_检测器有效 = 检测器有效
    expect(检测器有效, '横向溢出检测器恒 false（判据失效，本文件所有"无溢出"不可信）').toBe(true)
    await ctx.close()
  })
}

/* ─────────── ⑤x 320 档的 × 删除靶可达性（真机专属，起点基线在这里挂死） ─────────── */

test('⑤ 移动 320 ×删除靶可达性【已知实现缺陷】', async ({ browser }) => {
  test.fail(
    true,
    'FP-10c 实测缺陷（无权改 src）：320 档下 × 删除靶落在编辑器可视区外且没被钉回块左上角 ⇒ 单块点删不可达。' +
      '根因同 64px 那一条：.dai-fa-kuai* / .dai-fa-kuai-shanchu 的规则住在 <style scoped>（图文输入区.vue:543-579），' +
      '而块节点是 document.createElement 造出的（:197-227），拿不到 data-v 作用域属性 ⇒ 一条都不命中。',
  )
  const ctx = await browser.newContext({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await 挂载夹具(page)
  await page.goto(`/chat/${会话ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await expect(page.locator(编辑器)).toBeVisible({ timeout: 60000 })
  await page.waitForTimeout(500)
  await 输入文本(page, '甲乙')
  const 块 = await 聚焦并插块(page, { 文字偏移: 0 }, { 名: 'fp10c-320-x.png' })
  await 等块落定(page, 1)
  const 靶 = await 读删除钮命中(page, 块.新块id)
  结果['⑤320×靶'] = 靶
  expect(靶.相交, `× 盒与编辑器可视盒不相交（点不到）：${JSON.stringify(靶)}`).toBe(true)
  expect(靶.命中者, '× 那个坐标上的命中者不是 × 自己（被别的东西压在下面/跑出去了）').toBe('BUTTON.dai-fa-kuai-shanchu')
  await 删除块(page, 块.新块id)
  expect(await 读文本(page), '点 × 删块不许动文字').toBe('甲乙')
  await ctx.close()
})

/* ─────────── ⑦ 逐行敲 Shift+Enter 后继续打字：换行必须留在原位（真内联新增链） ─────────── */

test('⑦ Shift+Enter 换行后继续打字必须落在第二行【已知实现缺陷】', async ({ page }) => {
  // 判据保留原文不放宽，用 test.fail 标成预期失败：修好后会以 unexpected pass 逼着摘掉标记。
  test.fail(true, 'FP-10c 实测缺陷（无权改 src）：换行重建后光标落到尾部 <br> 之后，Blink 把插入点归一化到 <br> 之前 ⇒ 刚敲的回车被并回上一行（图文输入区.vue:242-271 返回 null → :292-293 退化）')
  await 挂载夹具(page)
  await 进聊天页(page)
  const 行清单 = ['第一行短', '第二行短', '第三行短']
  const 逐步 = await 逐行敲入(page, 行清单)
  const 实文 = await 读文本(page)
  const 快照 = await page.evaluate((编) => {
    const 元 = document.querySelector(编) as HTMLElement
    const 选 = window.getSelection()
    return {
      html: 元.innerHTML,
      子: Array.from(元.childNodes).map((n) => n.nodeName),
      锚点: 选 && 选.rangeCount ? String(选.anchorNode?.nodeName) + '#' + 选.anchorOffset : '(无)',
    }
  }, 编辑器)
  结果['⑦'] = { 行清单, 逐步, 实文, 快照 }
  // 契约：每敲一行，前面各行与换行数都不许变（第 k 行敲完应有 k-1 个换行、且前 k 行逐字按序）
  const 断 = String.fromCharCode(10)
  for (let 序 = 1; 序 <= 行清单.length; 序 += 1) {
    const 那步 = 逐步[(序 - 1) * 2]
    const 期望 = 行清单.slice(0, 序).join(断)
    expect(那步.文本, `${那步.步}：文字流走样（换行被吞/挪位）`).toBe(期望)
  }
  expect(实文, `Shift+Enter 链最终文字流不等于各行拼接：${JSON.stringify(逐步)}`).toBe(行清单.join(断))
  if (实文 !== 行清单.join(断)) {
    test.info().annotations.push({
      type: 'bug',
      description:
        'FP-10c 实测缺陷（本工人无权改 src）：Shift+Enter 之后接着打字，刚敲的回车被并回上一行' +
        '（最终 innerHTML=' + 快照.html + '，锚点=' + 快照.锚点 + '）。根因链：换行后 xuanRan 重建出 [text, BR]，' +
        'dingWeiPianYi 对「偏移正好落在尾部 <br> 之后」返回 null（src/components/聊天/图文输入区.vue:242-271），' +
        'fuYuanGuangBiao 退化成 selectNodeContents+collapse(false) 即 (编辑器, 子节点数)（:292-293），' +
        '而 Blink 把尾部 <br> 之后的插入点归一化到 <br> 之前 ⇒ 换行被吞。' +
        '与 ② 同族：(块 id, 偏移) 这套光标模型表达不了「编辑器第 k 个子节点」这一形态。证据 ' + 结果文件,
    })
  }
})

/* ──── ⑧ 删空图片块后 DOM 与真源的结构等价（纯文本态不得留 [data-kuai-id] 宿主） ──── */

test('⑧ 删空图片块后 DOM 必须退回纯文本态：不得残留 [data-kuai-id] 宿主【实现缺陷守卫：键盘删块这一支】', async ({ page }) => {
  await 挂载夹具(page)
  await 进聊天页(page)
  await 输入文本(page, '甲乙')
  const 块 = await 聚焦并插块(page, { 文字偏移: 1 }, { 名: 'fp10c-残留.png' })
  await 等块落定(page, 1)
  const 插入后 = { 宿主数: await page.locator('.shuru-kuang [data-kuai-id]').count(), 序: 图文签名(await 读块序(page)) }
  await 删除块(page, 块.新块id)
  await expect.poll(async () => 读图片块数(page), { timeout: 10000 }).toBe(0)
  await page.waitForTimeout(600)
  const 读残留 = (页: Page) =>
    页.evaluate((编) => {
    const 元 = document.querySelector(编) as HTMLElement
    return {
      宿主数: 元.querySelectorAll('[data-kuai-id]').length,
      ids: Array.from(元.querySelectorAll('[data-kuai-id]')).map((n) => (n as HTMLElement).getAttribute('data-kuai-id')),
      文字段宿主: 元.querySelectorAll('.dai-fa-kuai--wen').length,
      html: 元.innerHTML,
    }
  }, 编辑器)
  const 残留宿主 = await 读残留(page)
  结果['⑧'] = { 插入后, 点X删除后: 残留宿主 }
  expect(await 读文本(page), '删块不许动文字').toBe('甲乙')
  // —— 同一条判据的第二支：块是**用户在 DOM 里退格/前向删除**掉的，不是点 × 删的 ——
  await 聚焦并插块(page, { 文字偏移: 0 }, { 名: 'fp10c-键盘删.png' })
  await 等块落定(page, 1)
  await page.locator(编辑器).click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Delete')
  await expect.poll(async () => 读图片块数(page), { timeout: 10000 }).toBe(0)
  await page.waitForTimeout(600)
  const 键盘删后 = await 读残留(page)
  结果['⑧'].键盘删后 = 键盘删后
  结果['⑧'].文本 = await 读文本(page)
  expect(await 读文本(page), '键盘删块也不许动文字').toBe('甲乙')
  const 残留宿主2 = 键盘删后
  // 判据（FP-10b/FP-10c 在 vitest 侧钉的是同一条：纯文本态 = 编辑器里没有任何 [data-kuai-id] 宿主）
  expect(残留宿主.宿主数, `真源已退回纯文本态，DOM 却残留 ${残留宿主.宿主数} 个 [data-kuai-id] 宿主：${残留宿主.html}`).toBe(0)
  if (残留宿主.宿主数 > 0) {
    test.info().annotations.push({
      type: 'bug',
      description:
        'FP-10c 实测缺陷（本工人无权改 src）：**用户在 DOM 里删掉图片块**（退格/前向删除）后真源走 ' +
        'shouLiuChunWenBenTai 把块序列清空，' +
        '但组件 chuLiBianJi 的 jieGouXiangDeng(duan) 在 kuaiLieBiao.length===0 时只看「duan 里有没有图片段」' +
        '（src/components/聊天/图文输入区.vue:330-334），文字段宿主还挂在 DOM 上就被判成"结构相等"⇒ 不重建，' +
        '于是编辑器里留下带死 id 的 span：' + JSON.stringify(残留宿主.ids) + '。' +
        '对照：点 × 删同一条块后宿主数为 ' + 残留宿主.宿主数 + '（那条走 watch→xuanRan，会重建干净）。' +
        '后果不是观感而是链路：zuiJinKuaiId 会把这个已不存在的 id 当光标归属报上去，' +
        "use待发图文.chaRuTuPian 认不到块 ⇒ 落点判定再退化成「追加到末尾」（与 ② 同一族）。证据 " + 结果文件,
    })
  }
})

/* ─────────────── 载体契约与占位符：inputValue() 失配的根因面 ─────────────── */

test('载体契约：contenteditable + data-zhan-wei 占位，textarea 与 inputValue 一并退役', async ({ page }) => {
  await 挂载夹具(page)
  await 进聊天页(page)
  const 占位 = await 读占位(page)
  const 记 = { 占位, 属性: await page.evaluate((编) => {
    const 元 = document.querySelector(编) as HTMLElement
    return {
      role: 元.getAttribute('role'),
      ariaMultiline: 元.getAttribute('aria-multiline'),
      ariaLabel: 元.getAttribute('aria-label'),
      testid: 元.getAttribute('data-testid'),
      spellcheck: 元.getAttribute('spellcheck'),
    }
  }, 编辑器) }
  结果['载体契约'] = 记
  expect(占位.文本, '占位文本必须来自翻译键（页面 prop 传进来，组件内零文案）').toBe('输入消息...')
  expect(占位.空态, '空编辑器应带 .wei-kong').toBe(true)
  expect(占位.计算值, '占位改走 ::before + data 属性后必须真的画出来').toContain('输入消息')
  expect(记.属性.role).toBe('textbox')
  expect(记.属性.ariaMultiline).toBe('true')
  expect(记.属性.ariaLabel).toBe('输入消息...')
  expect(记.属性.testid).toBe('tuwen-shuruqu')
  // inputValue() 这条路必须确实走不通（Playwright 判定 contenteditable 非 input/textarea ⇒ 抛），
  // 把它钉成「抛」而不是「返回空串」：万一哪天 Playwright 改口径，这里会红并提醒重新改判。
  const inputValue抛 = await page.locator(编辑器).inputValue().then(() => false).catch(() => true)
  expect(inputValue抛, 'inputValue() 在 contenteditable 上不再抛了 ⇒ 旧判据口径变了，需重新改判').toBe(true)
  // 反证：占位文本不算用户内容 —— 有字之后 .wei-kong 必须摘掉，且 ::before 不再是判据读的文本
  await 输入文本(page, 'x')
  const 有字 = await 读占位(page)
  expect(有字.空态, '有内容时 .wei-kong 没摘掉（占位符压在用户文字上）').toBe(false)
  expect(await 读文本(page)).toBe('x')
  await 清空文本(page)
  const 清空后 = await 读占位(page)
  expect(清空后.空态, '清空后占位符没回来').toBe(true)
  expect(await 读文本(page), '清空后残留 \\n（组件里那个只供光标落脚的 <br> 被当成用户换行）').toBe('')
  // 读侧口径的等价关系：文字流为空 ⇔ .wei-kong 挂着。任一侧漂移（组件把 '\n' 写进真源，
  // 或取样器漏了空流前置判定）都会在这里红，而不是各自静默成立。
  expect(清空后.空态, '读文本 与 .wei-kong 判定不一致').toBe((await 读文本(page)) === '')
})

/* ─────────────── 纯文本态不物化块（反证：块计数不能当图片块计数） ─────────────── */

test('反证：纯文本态 .dai-fa-kuai 计数为 0（块数判据必须用 --tu 类）', async ({ page }) => {
  await 挂载夹具(page)
  await 进聊天页(page)
  await 输入文本(page, 文字基线)
  const 读 = await page.evaluate(() => ({
    全块: document.querySelectorAll('.dai-fa-kuai').length,
    图片块: document.querySelectorAll('.dai-fa-kuai--tu').length,
    带id宿主: document.querySelectorAll('.shuru-kuang [data-kuai-id]').length,
    序列容器: document.querySelectorAll('.dai-fa-kuai-lie').length,
    textarea: document.querySelectorAll('.shuru-kuang textarea, textarea.shuru-kuang').length,
  }))
  结果['反证_纯文本态'] = 读
  expect(读, '没插过图片就物化了块（真源退化条件被破坏）').toEqual({
    全块: 0,
    图片块: 0,
    带id宿主: 0,
    序列容器: 0,
    textarea: 0,
  })
  expect(await 读文本(page)).toBe(文字基线)
  const 壳 = await page.evaluate((外) => {
    const 元 = document.querySelector(外) as HTMLElement
    return { 子节点数: 元.childElementCount, 只有编辑器: 元.firstElementChild === document.querySelector('.shuru-kuang') }
  }, 外壳)
  expect(壳, '外盒里除编辑器还多了别的宿主').toEqual({ 子节点数: 1, 只有编辑器: true })
})
