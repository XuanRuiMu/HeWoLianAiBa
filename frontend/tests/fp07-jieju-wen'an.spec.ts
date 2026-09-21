import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { daKaiJiaJuQingQiu, baoZhengCeShiZhangHao, zhuRuJiaJuShenFen, type JiaJuShenFen } from './测试夹具'

/**
 * FP-07（缺陷4）结局趣味文案 —— 浏览器取证（收尾审计轮 FP-07b）。
 *
 * 全程真实链路，不注入任何假事件、不 mock 任何接口：
 *   夹具账号 → POST /api/挑战/开始（服务端本地随机建角色，不调 AI）→ 真开 /chat/:id 建 socket →
 *   通关档：在聊天输入框里真发「秘籍口令」→ 后端 sheZhiMiJiHaoGanDu → chuLiYouXiJieShu('sheng_li_ai_qing')
 *   失败档：POST /api/挑战/放弃 → chuLiYouXiJieShu('shi_bai_fang_qi_tiao_zhan')
 *   → 服务端抽一句趣味文案 + 写 角色.结局文案 快照 + socket 推 '游戏事件' → 页面 .youxi-tanchuang 弹出。
 *
 * 钉的是缺陷4 的四件事：
 *   ① 弹窗正文是**趣味句**，不是改版前的确定性标签（`jieJu` 里那句短标签）；
 *   ② 正文逐字等于后端翻译里**该结局键**池内的某一句（池真源直读 backend/src/config/translations.ts，
 *      {TA} 按角色性别代入）；
 *   ③ 通关/失败分组吃服务端 `shi_fou_tong_guan`：通关局弹 `shengli` 档（旧白名单漏 `sheng_li_shen_jing_bing`
 *      那类「胜利却弹成失败」的病灶在此可见地不复现）；
 *   ④ 刷新后从 /api/战绩/列表 读回的分享句与结算那一刻**同一句**（快照生效，不随机漂移）。
 * 深浅两档 × 桌面 1440×900 / 手机 375×667 共四组，每组一局独立真实结算；控制台 error 与 warning 一并采集。
 *
 * 行尾（F25）：本仓库 core.autocrlf=true，Windows 检出为 CRLF，所有源码正则一律用 `\r?\n` 容差。
 */

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 截图目录 = path.resolve(本目录, '../../测试截图')
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces')
const 后端翻译路径 = path.resolve(本目录, '../../backend/src/config/translations.ts')
const 日期 = '20260921'
const 前缀 = 'fp07b'
/** 后端 `config/好感度配置.ts::HAO_GAN_DU_PEI_ZHI.miJi.miLing`，走 `sheng_li_ai_qing` 通关分支 */
const 秘籍口令 = 'whosyourdaddy'
const 通关结局键 = 'sheng_li_ai_qing'
const 失败结局键 = 'shi_bai_fang_qi_tiao_zhan'
/** 改版前弹窗里就是这两句短标签（`translations.jieJu`），趣味文案上线后不得再出现在弹窗正文 */
const 旧标签集 = new Set(['在一起了 💕', '放弃了本局挑战'])
/** index.html 的 wuhaoyang-3d.png preload 失败是 FP-03/FP-05 已登记的既有项，不属本 FP */
const 既有告警关键字 = ['wuhaoyang-3d']

interface 趣味池表 {
  通关: Record<string, string[]>
  失败: Record<string, string[]>
}

/** 段起于 `名: {`，止于首个同缩进收尾 `\r?\n  },`；键行固定 4 空格缩进，句子是单引号字面量 */
function 取段(后端翻译: string, 段名: string): string {
  const 段起 = 后端翻译.indexOf(`${段名}: {`)
  if (段起 < 0) throw new Error(`后端翻译缺类目 ${段名}`)
  const 余下 = 后端翻译.slice(段起)
  const 收尾 = 余下.search(/\r?\n {2}\},/)
  if (收尾 < 0) throw new Error(`${段名} 段收尾异常`)
  return 余下.slice(0, 收尾)
}

function 取池(后端翻译: string, 段名: string, 键: string): string[] {
  const 段 = 取段(后端翻译, 段名)
  const 键起 = 段.search(new RegExp(`\\r?\\n {4}${键}: \\[`))
  if (键起 < 0) throw new Error(`${段名} 段里没有 ${键}`)
  const 键段 = 段.slice(键起, 段.indexOf(']', 键起))
  const 句子 = [...键段.matchAll(/'([^']*)'/g)].map((项) => 项[1])
  if (句子.length < 3) throw new Error(`${键} 池少于 3 句：${句子.length}`)
  return 句子
}

function 读趣味池(): 趣味池表 {
  const 后端翻译 = fs.readFileSync(后端翻译路径, 'utf-8')
  const 表: 趣味池表 = { 通关: {}, 失败: {} }
  for (const 匹配 of 取段(后端翻译, 'jieGuoTongGuanChi').matchAll(/^\r?\n {4}(\w+): \[/gm)) {
    表.通关[匹配[1]] = 取池(后端翻译, 'jieGuoTongGuanChi', 匹配[1])
  }
  for (const 匹配 of 取段(后端翻译, 'jieGuoShiBaiChi').matchAll(/^\r?\n {4}(\w+): \[/gm)) {
    表.失败[匹配[1]] = 取池(后端翻译, 'jieGuoShiBaiChi', 匹配[1])
  }
  return 表
}

/** {TA} → 他/她，与后端 `xingBieBianTi['daiCi.ta.男|女']` 同口径；未知性别回落中性 TA */
function 代入性别(句子: string, 性别: string): string {
  const 代词 = 性别 === 'nan' ? '他' : 性别 === 'nv' ? '她' : 'TA'
  return 句子.replaceAll('{TA}', 代词)
}

function 池子(表: 趣味池表, 组: '通关' | '失败', 键: string, 性别: string): string[] {
  return (组 === '通关' ? 表.通关[键] : 表.失败[键]).map((句) => 代入性别(句, 性别))
}

const 趣味池 = 读趣味池()

interface 场景 {
  主题: '浅色' | '暗色'
  视口: string
  宽: number
  高: number
  组: '通关' | '失败'
}

const 场景清单: 场景[] = [
  { 主题: '浅色', 视口: '1440x900', 宽: 1440, 高: 900, 组: '通关' },
  { 主题: '暗色', 视口: '1440x900', 宽: 1440, 高: 900, 组: '失败' },
  { 主题: '暗色', 视口: '375x667', 宽: 375, 高: 667, 组: '通关' },
  { 主题: '浅色', 视口: '375x667', 宽: 375, 高: 667, 组: '失败' },
]

interface 取证行 extends 场景 {
  角色ID: string
  性别: string
  结局键: string
  弹层类名: string
  图标: string
  标题: string
  正文: string
  命中池: boolean
  服务端下发句: string
  刷新读回句: string
  读回等正文: boolean
  socket已建连: boolean
  控制台错误: string[]
  控制台警告: string[]
  页面异常: string[]
  截图: string[]
  实际主题: string
}

const 行集: 取证行[] = []

function 令牌头(身份: JiaJuShenFen): Record<string, string> {
  // 后端 `middleware/认证.ts` 只认 `Authorization: Bearer`，不读 cookie —— 缺这行整条链 401
  return { authorization: `Bearer ${身份.lingPai}` }
}

async function 新角色(请求: APIRequestContext, 头: Record<string, string>) {
  const 开始 = await 请求.post('/api/挑战/开始', {
    headers: 头,
    data: { woDeXingBie: 'nan', duiXiangXingBie: 'nv' },
  })
  expect([200, 409], `开始挑战异常：HTTP ${开始.status()}`).toContain(开始.status())
  const 开始体 = await 开始.json().catch(() => null)
  let 角色ID = String(开始体?.shu_ju?.id ?? '')
  let 性别 = String(开始体?.shu_ju?.xing_bie ?? 'nv')
  if (开始.status() === 409 || !角色ID) {
    const 当前 = await (await 请求.get('/api/挑战/当前', { headers: 头 })).json().catch(() => null)
    角色ID = String(当前?.shu_ju?.dui_ju?.jiao_se_id ?? 角色ID)
    性别 = String(当前?.shu_ju?.dui_ju?.dui_xiang_xing_bie ?? 性别)
  }
  expect(角色ID, '未取得进行中的挑战对局角色').toBeTruthy()
  return { 角色ID, 性别 }
}

async function 读回分享句(请求: APIRequestContext, 头: Record<string, string>, 角色ID: string) {
  const 列表 = await (await 请求.get('/api/战绩/列表', { headers: 头 })).json().catch(() => null)
  const 条目 = (列表?.shu_ju?.dangAnLieBiao ?? []).find(
    (项: { jiao_se_id?: string }) => String(项.jiao_se_id) === 角色ID,
  )
  return String(条目?.jie_guo_lei_xing ?? '')
}

async function 跑一局(浏览器: Browser, 请求: APIRequestContext, 身份: JiaJuShenFen, 场景: 场景): Promise<取证行> {
  const 头 = 令牌头(身份)
  const { 角色ID, 性别 } = await 新角色(请求, 头)

  const context = await 浏览器.newContext({ viewport: { width: 场景.宽, height: 场景.高 } })
  await context.addInitScript(([主]: string[]) => localStorage.setItem('主题', 主), [场景.主题])
  const 页面 = await context.newPage()

  const 错误: string[] = []
  const 警告: string[] = []
  const 页面异常: string[] = []
  页面.on('console', (志) => {
    if (志.type() === 'error') 错误.push(志.text())
    else if (志.type() === 'warning') 警告.push(志.text())
  })
  页面.on('pageerror', (异) => 页面异常.push(String(异)))

  const 等待连接 = 页面
    .waitForEvent('websocket', (ws) => ws.url().includes('/socket.io'), { timeout: 30000 })
    .catch(() => null)

  await zhuRuJiaJuShenFen(页面, 身份)
  await 页面.goto(`/chat/${角色ID}`, { waitUntil: 'domcontentloaded' })
  await expect(页面.locator('.shuru-kuang'), `聊天输入区未渲染：${场景.主题}/${场景.视口}`).toBeVisible({
    timeout: 40000,
  })
  const socket = await 等待连接
  await 页面.waitForTimeout(2500)

  let 服务端下发句 = ''
  if (场景.组 === '通关') {
    // 真实用户动作：在输入框里打出口令并回车，走 POST /api/消息 的秘籍分支（该分支不驱动 AI）。
    // 先等这条 POST 落定再判弹窗，否则「回车后弹窗没出现」分不清是没发出去还是没收到推送。
    const 回执 = Promise.all([
      页面.waitForResponse(
        // 真实发送口：POST /api/聊天/会话/:角色ID/消息（routes/消息.ts::聊天内容验证中间件 那条）
        (响) => /\/api\/聊天\/会话\/[^/]+\/消息/.test(响.url()) && 响.request().method() === 'POST',
        { timeout: 30000 },
      ),
      页面.fill('.shuru-kuang', 秘籍口令).then(() => 页面.press('.shuru-kuang', 'Enter')),
    ])
    const [回执响应] = await 回执
    expect(回执响应.status(), `秘籍口令发送异常：HTTP ${回执响应.status()}`).toBe(200)
    const 回执体 = await 回执响应.json().catch(() => null)
    expect(
      回执体?.shu_ju?.shi_mi_ji,
      `服务端未走秘籍分支：${JSON.stringify(回执体).slice(0, 200)}`,
    ).toBe(true)
  } else {
    const 放弃 = await 请求.post('/api/挑战/放弃', { headers: 头 })
    expect(放弃.status(), '放弃结算接口异常').toBe(200)
    const 放弃体 = await 放弃.json().catch(() => null)
    const 结算 = 放弃体?.shu_ju?.jie_guo ?? {}
    expect(String(结算.jie_guo_lei_xing ?? ''), '结算结局键不对').toBe(失败结局键)
    expect(结算.shi_fou_tong_guan, '放弃必判失败，服务端却下发通关').toBe(false)
    服务端下发句 = String(结算.jie_guo_wen_an ?? '')
  }

  const 弹层 = 页面.locator('.youxi-tanchuang')
  await 弹层.waitFor({ state: 'visible', timeout: 60000 })
  const 正文 = (await 页面.locator('.youxi-miaoshu').innerText()).trim()
  const 标题 = (await 页面.locator('.youxi-biaoti').innerText()).trim()
  const 图标 = (await 页面.locator('.youxi-tubiao').innerText()).trim()
  const 类名 = (await 弹层.getAttribute('class')) ?? ''
  const 实际主题 = (await 页面.evaluate(() => document.documentElement.getAttribute('data-theme'))) ?? ''
  const 结局键 = 场景.组 === '通关' ? 通关结局键 : 失败结局键

  const 截图集: string[] = []
  await fs.promises.mkdir(截图目录, { recursive: true })
  const 名 = `${前缀}-${场景.主题 === '浅色' ? 'light' : 'dark'}-${场景.视口}-${场景.组 === '通关' ? 'tongguan' : 'shibai'}`
  await 弹层.screenshot({ path: path.join(截图目录, `${名}-tanchuang.png`), timeout: 60000 })
  截图集.push(`测试截图/${名}-tanchuang.png`)
  await 页面.screenshot({ path: path.join(截图目录, `${名}-yemian.png`), timeout: 120000 })
  截图集.push(`测试截图/${名}-yemian.png`)

  await 页面.reload({ waitUntil: 'domcontentloaded' })
  const 刷新读回句 = await 读回分享句(请求, 头, 角色ID)
  await context.close()

  return {
    ...场景,
    角色ID,
    性别,
    结局键,
    弹层类名: 类名,
    图标,
    标题,
    正文,
    命中池: 池子(趣味池, 场景.组, 结局键, 性别).includes(正文),
    服务端下发句,
    刷新读回句,
    读回等正文: 刷新读回句 === 正文,
    socket已建连: !!socket,
    控制台错误: 错误.filter((条) => !既有告警关键字.some((词) => 条.includes(词))),
    控制台警告: 警告,
    页面异常,
    截图: 截图集,
    实际主题,
  }
}

function 写证据() {
  const 行 = [
    '# FP-07b 结局趣味文案 浏览器取证（' + 日期 + '）',
    '',
    '触发链路（真实，无注入、无 mock）：夹具账号 → POST /api/挑战/开始 → 打开 /chat/:id 建立 socket →',
    `通关档在输入框真发秘籍口令（服务端 sheng_li_ai_qing）/ 失败档 POST /api/挑战/放弃（服务端 ${失败结局键}）→`,
    '服务端抽句 → 写 `角色.结局文案` 快照 → socket 推 `游戏事件` → 页面 `.youxi-tanchuang` 弹出 →',
    '刷新后 GET /api/战绩/列表 读回分享句。',
    '',
    '四组 = 深浅两档 × 桌面 1440×900 / 手机 375×667，每组一局独立真实结算。',
    '',
    '| 主题 | 视口 | data-theme | 档位 | 角色ID | 性别 | 弹窗类名 | 图标 | 标题 | 弹窗正文 | 命中后端趣味池 | 是改版前短标签 | 刷新读回===弹窗正文 | socket |',
    '| ---- | ---- | ---------- | ---- | ------ | ---- | -------- | ---- | ---- | -------- | -------------- | ---------------- | -------------------- | ---- |',
    ...行集.map((项) =>
      `| ${项.主题} | ${项.视口} | ${项.实际主题} | ${项.组} | ${项.角色ID} | ${项.性别} | ${项.弹层类名} | ${项.图标} | ${项.标题} | ${项.正文} | ${项.命中池 ? '是' : '否'} | ${旧标签集.has(项.正文) ? '是（未修）' : '否'} | ${项.读回等正文 ? '是' : '否'}（读回：${项.刷新读回句}） | ${项.socket已建连 ? '已连' : '未连'} |`,
    ),
    '',
    '## 结算那一刻服务端下发与刷新读回',
    '',
    ...行集.map(
      (项) =>
        `- ${项.主题}/${项.视口}/${项.组}：服务端下发句=${项.服务端下发句 || '（通关档走 socket，无 HTTP 响应体）'}；弹窗=${项.正文}；读回=${项.刷新读回句}`,
    ),
    '',
    `通关池（${通关结局键}）：${池子(趣味池, '通关', 通关结局键, 'nv').join(' / ')}`,
    '',
    `失败池（${失败结局键}）：${池子(趣味池, '失败', 失败结局键, 'nv').join(' / ')}`,
    '',
    `死组件 frontend/src/components/聊天/结算弹窗.vue 是否存在：${fs.existsSync(path.resolve(本目录, '../src/components/聊天/结算弹窗.vue')) ? '是（未清理）' : '否（已删除）'}`,
    '',
    '## 控制台',
    '',
    ...行集.map((项) => {
      const 错 = 项.控制台错误.length ? 项.控制台错误.map((条) => 条.slice(0, 220)).join(' | ') : '0 条'
      const 警 = 项.控制台警告.length
        ? [...new Set(项.控制台警告)].map((条) => 条.slice(0, 220)).join(' | ')
        : '0 条'
      const 异 = 项.页面异常.length ? 项.页面异常.join(' | ') : '0 条'
      return `- ${项.主题}/${项.视口}/${项.组}：error ${项.控制台错误.length} 条：${错}\n  - warning ${项.控制台警告.length} 条（去重列出）：${警}\n  - pageerror ${项.页面异常.length} 条：${异}`
    }),
    '',
    `已排除的既有登记项（非本 FP，FP-03/FP-05 已记录）：${既有告警关键字.join('、')} 资源 preload 失败。`,
    '',
    '截图：',
    ...行集.flatMap((项) => 项.截图.map((路) => `- ${路}`)),
  ]
  fs.mkdirSync(证据目录, { recursive: true })
  fs.writeFileSync(path.join(证据目录, `FP-07b-结局趣味文案浏览器取证-${日期}.md`), 行.join('\n'), 'utf8')
}

test.afterAll(() => {
  写证据()
})

test.describe('FP-07b 结算弹窗趣味文案与通关分类浏览器取证', () => {
  test('深浅两档 × 桌面/手机 各真实结算一局：弹窗显示趣味文案、分类吃服务端下发、刷新不漂移', async ({
    browser: 浏览器,
  }) => {
    test.setTimeout(900000)
    const 引导 = await daKaiJiaJuQingQiu()
    let 请求: APIRequestContext | null = null
    try {
      const 身份 = await baoZhengCeShiZhangHao(引导)
      请求 = await daKaiJiaJuQingQiu()
      for (const 场景 of 场景清单) {
        // 逐组即时入表：任何一组炸掉，证据文件仍完整记录已跑过的组
        行集.push(await 跑一局(浏览器, 请求, 身份, 场景))
        写证据()
      }
    } finally {
      if (请求) await 请求.dispose()
      await 引导.dispose()
      写证据()
    }

    expect(行集).toHaveLength(4)
    const 主题组 = new Set(行集.map((项) => `${项.主题}|${项.视口}`))
    expect(主题组.size).toBe(4)
    for (const 项 of 行集) {
      expect(项.socket已建连, `${项.主题}/${项.视口} socket 未建连`).toBe(true)
      expect(['light', 'dark']).toContain(项.实际主题)
      expect(项.正文, '弹窗正文为空').toBeTruthy()
      expect(旧标签集.has(项.正文), `弹窗仍是改版前短标签：${项.正文}`).toBe(false)
      expect(项.正文).not.toContain('{TA}')
      expect(项.命中池, `弹窗正文不在后端趣味池里：${项.正文}`).toBe(true)
      expect(项.弹层类名).toContain(项.组 === '通关' ? 'shengli' : 'shibai')
      expect(项.读回等正文, `刷新后读回与结算那一刻不一致：${项.刷新读回句}`).toBe(true)
      expect(项.截图).toHaveLength(2)
      for (const 路 of 项.截图) {
        expect(fs.existsSync(path.resolve(截图目录, path.basename(路))), `截图缺失：${路}`).toBe(true)
      }
      expect(项.页面异常, `页面异常：${项.页面异常.join(' | ')}`).toHaveLength(0)
      expect(项.控制台错误, `控制台 error：${项.控制台错误.join(' | ')}`).toHaveLength(0)
    }
    // 通关档与失败档必须各两组，且标题不同 —— 分类真的来自服务端
    expect(行集.filter((项) => 项.组 === '通关')).toHaveLength(2)
    expect(行集.filter((项) => 项.组 === '失败')).toHaveLength(2)
    const 通关标题 = new Set(行集.filter((项) => 项.组 === '通关').map((项) => 项.标题))
    const 失败标题 = new Set(行集.filter((项) => 项.组 === '失败').map((项) => 项.标题))
    expect(通关标题.size).toBe(1)
    expect(失败标题.size).toBe(1)
    expect([...通关标题][0]).not.toBe([...失败标题][0])
  })
})
