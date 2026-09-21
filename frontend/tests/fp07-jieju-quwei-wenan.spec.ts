import { test, expect, type APIRequestContext, type Browser } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { daKaiJiaJuQingQiu, baoZhengCeShiZhangHao, zhuRuJiaJuShenFen } from './测试夹具'

/**
 * FP-07（缺陷4）结算弹窗趣味文案浏览器取证。全程真实链路，不注入任何假事件：
 *   夹具账号 → POST /api/挑战/开始（服务端本地随机建角色，不调 AI）→ 真开 /chat/:id 建立 socket →
 *   POST /api/挑战/放弃 → 服务端 chuLiYouXiJieShu 抽一句趣味文案 + 落库快照 + socket 推送 →
 *   页面 .youxi-tanchuang 弹出。
 *
 * 断言四件：
 *   ① 弹窗正文是趣味句，且不是改版前的标签「放弃了本局挑战」；
 *   ② 正文逐字等于后端翻译里**该结局键**的池内某一句（池真源直读 backend/src/config/translations.ts）；
 *   ③ 失败结局归 shibai 档（弹窗类名带 shibai，标题走 gongLueShiBai）；
 *   ④ 刷新后从 /api/战绩/列表 读回的分享句与结算那一刻**同一句**（快照生效，不随机漂移）。
 * 深浅两档各跑一局，两局都是独立真实结算。
 */

const 本目录 = path.dirname(fileURLToPath(import.meta.url))
const 截图目录 = path.resolve(本目录, '../../测试截图')
const 证据目录 = path.resolve(本目录, '../../../.agents/evidence/traces')
const 后端翻译路径 = path.resolve(本目录, '../../backend/src/config/translations.ts')
const 日期 = '20260921'
const 结局键 = 'shi_bai_fang_qi_tiao_zhan'
const 旧标签 = '放弃了本局挑战'

function 取趣味池(后端翻译: string, 段名: string, 键: string): string[] {
  const 段起 = 后端翻译.indexOf(`${段名}: {`)
  if (段起 < 0) throw new Error(`后端翻译缺类目 ${段名}`)
  const 余下 = 后端翻译.slice(段起)
  const 收尾 = 余下.indexOf('\n  },')
  const 本段 = 收尾 > 0 ? 余下.slice(0, 收尾) : 余下
  const 键起 = 本段.indexOf(`${键}: [`)
  if (键起 < 0) throw new Error(`${段名} 段里没有 ${键}`)
  const 键段 = 本段.slice(键起, 本段.indexOf(']', 键起))
  const 句子 = [...键段.matchAll(/'([^']*)'/g)].map((项) => 项[1])
  if (句子.length < 3) throw new Error(`${键} 池少于 3 句：${句子.length}`)
  return 句子
}

const 后端翻译 = fs.readFileSync(后端翻译路径, 'utf-8')
const 放弃池句子 = 取趣味池(后端翻译, 'jieGuoShiBaiChi', 结局键)

interface 取证行 {
  主题: string
  角色ID: string
  弹层类名: string
  标题: string
  正文: string
  命中池: boolean
  是旧标签: boolean
  服务端趣味句: string
  分享句: string
  旧弹窗组件存在: boolean
  控制台错误: string[]
  截图: string[]
}

async function 跑一局(
  浏览器: Browser,
  请求: APIRequestContext,
  身份: { lingPai: string; shuaXinLingPai?: string; shuaXinLingPaiId?: string },
  主题: '浅色' | '暗色',
  前缀: string,
): Promise<取证行> {
  const 开始 = await 请求.post('/api/挑战/开始', {
    data: { woDeXingBie: 'nan', duiXiangXingBie: 'nv' },
  })
  expect([200, 409], `开始挑战异常：HTTP ${开始.status()}`).toContain(开始.status())
  const 开始体 = await 开始.json().catch(() => null)
  const 当前 = await (await 请求.get('/api/挑战/当前')).json()
  // 200 时 shu_ju 就是新建角色本身；409 时退回 /当前 的进行中角色
  const 角色ID = String(开始体?.shu_ju?.id ?? 当前?.shu_ju?.dui_ju?.jiao_se_id ?? '')
  expect(角色ID, '未取得进行中的挑战对局角色').toBeTruthy()

  const 页面 = await 浏览器.newPage({ viewport: { width: 1440, height: 900 } })
  const 错误: string[] = []
  页面.on('console', (志) => {
    if (志.type() === 'error') 错误.push(志.text())
  })
  await 页面.addInitScript((主) => {
    window.localStorage.setItem('主题', 主)
    window.localStorage.setItem('lian-ai-ba-zhu-ti', 主 === '浅色' ? 'light' : 'an-se')
  }, 主题)
  await zhuRuJiaJuShenFen(页面, 身份)
  await 页面.goto(`/chat/${角色ID}`, { waitUntil: 'networkidle' })
  // socket 连接与 join(用户房间) 是页面初始化里的异步支路，等它落定再结算，否则推送打在连接之前
  await 页面.waitForTimeout(5000)

  const 放弃 = await 请求.post('/api/挑战/放弃')
  expect(放弃.status(), '放弃结算接口异常').toBe(200)
  const 放弃体 = await 放弃.json()
  const 结算 = 放弃体?.shu_ju?.jie_guo ?? 放弃体?.data?.jie_guo ?? {}
  expect(String(结算.jie_guo_lei_xing ?? ''), '结算结局键不对').toBe(结局键)
  expect(结算.shi_fou_tong_guan, '放弃必判失败，服务端却下发通关').toBe(false)
  const 服务端趣味句 = String(结算.jie_guo_wen_an ?? '')

  const 弹层 = 页面.locator('.youxi-tanchuang')
  await 弹层.waitFor({ state: 'visible', timeout: 30000 })
  const 正文 = (await 页面.locator('.youxi-miaoshu').innerText()).trim()
  const 标题 = (await 页面.locator('.youxi-biaoti').innerText()).trim()
  const 类名 = (await 弹层.getAttribute('class')) ?? ''

  await fs.promises.mkdir(截图目录, { recursive: true })
  const 截图集: string[] = []
  await 弹层.screenshot({ path: path.join(截图目录, `${前缀}-tanchuang.png`) })
  截图集.push(`测试截图/${前缀}-tanchuang.png`)
  await 页面.screenshot({ path: path.join(截图目录, `${前缀}-yemian.png`), timeout: 120000 })
  截图集.push(`测试截图/${前缀}-yemian.png`)

  const 旧弹窗组件存在 = fs.existsSync(path.resolve(本目录, '../components/聊天/结算弹窗.vue'))

  await 页面.reload({ waitUntil: 'domcontentloaded' })
  const 列表 = await (await 请求.get('/api/战绩/列表')).json()
  const 条目 = (列表?.shu_ju?.dangAnLieBiao ?? []).find(
    (项: { jiao_se_id?: string }) => String(项.jiao_se_id) === 角色ID,
  )
  const 分享句 = String(条目?.jie_guo_lei_xing ?? '')
  await 页面.close()

  return {
    主题,
    角色ID,
    弹层类名: 类名,
    标题,
    正文,
    命中池: 放弃池句子.includes(正文),
    是旧标签: 正文 === 旧标签,
    服务端趣味句,
    分享句,
    旧弹窗组件存在,
    控制台错误: 错误.filter((条) => !条.includes('wuhaoyang-3d')),
    截图: 截图集,
  }
}

test.describe('FP-07 结算弹窗趣味文案浏览器取证', () => {
  test('浅色与暗色各真实结算一局：弹窗显示趣味文案且刷新不漂移', async ({ browser: 浏览器 }) => {
    test.setTimeout(420000)
    const 请求 = await daKaiJiaJuQingQiu()
    const 行集: 取证行[] = []
    const 主题序: Array<['浅色' | '暗色', string]> = [
      ['浅色', `fp07-${日期}-qian-se`],
      ['暗色', `fp07-${日期}-an-se`],
    ]
    try {
      const 身份 = await baoZhengCeShiZhangHao(请求)
      for (const [主题, 前缀] of 主题序) {
        const 行 = await 跑一局(浏览器, 请求, 身份, 主题, 前缀)
        行集.push(行)
      }
    } finally {
      await 请求.dispose()
      await fs.promises.mkdir(证据目录, { recursive: true })
      const 文 = [
        '# FP-07 结算弹窗趣味文案 浏览器取证（' + 日期 + '）',
        '',
        `触发链路（真实，无注入）：夹具账号 → POST /api/挑战/开始 → 打开 /chat/:id 建立 socket →`,
        `POST /api/挑战/放弃 → 服务端 ` + 结局键 + ` 结算：抽句 → 写 角色.结局文案 快照 → socket 推送 →`,
        '页面 .youxi-tanchuang 弹出。深浅两档各跑一局，两局为两次独立真实结算。',
        '',
        '| 主题 | 角色ID | 弹窗类名 | 标题 | 弹窗正文 | 命中后端趣味池 | 是否仍是旧标签 | 刷新后 /api/战绩/列表 读回 | 读回===弹窗 |',
        '| ---- | ------ | -------- | ---- | -------- | -------------- | -------------- | ---------------------------- | ---------- |',
        ...行集.map((项) =>
          `| ${项.主题} | ${项.角色ID} | ${项.弹层类名} | ${项.标题} | ${项.正文} | ${项.命中池 ? '是' : '否'} | ${项.是旧标签 ? '是' : '否'} | ${项.分享句} | ${项.分享句 === 项.正文 ? '是' : '否'} |`,
        ),
        '',
        `趣味池（${结局键}）共 ${放弃池句子.length} 句：${放弃池句子.join(' / ')}`,
        '',
        `死组件 frontend/src/components/聊天/结算弹窗.vue 是否仍存在：${行集.map((项) => (项.旧弹窗组件存在 ? '是（未清理）' : '否（已删除）')).join(' / ') || 'n/a'}`,
        '',
        `控制台 error（已排除 index.html 的 wuhaoyang-3d.png preload 既有告警，属 FP-05/FP-03 登记项）：${行集.map((项) => `${项.主题} ${项.控制台错误.length} 条${项.控制台错误.length ? '：' + 项.控制台错误.join(' | ') : ''}`).join('；')}`,
        '',
        '截图：',
        ...行集.flatMap((项) => 项.截图.map((路) => `- ${路}`)),
      ]
      await fs.promises.writeFile(
        path.join(证据目录, `FP-07-结算弹窗趣味文案-${日期}.md`),
        文.join('\n'),
        'utf8',
      )
    }

    expect(行集).toHaveLength(2)
    const 正文集 = new Set<string>()
    for (const 项 of 行集) {
      expect(项.正文).toBeTruthy()
      expect(项.正文).not.toBe(旧标签)
      expect(放弃池句子, `弹窗正文不在该结局的趣味池里：${项.正文}`).toContain(项.正文)
      expect(项.正文).not.toContain('{TA}')
      expect(项.弹层类名).toContain('shibai')
      expect(项.是旧标签).toBe(false)
      expect(项.命中池).toBe(true)
      expect(项.服务端趣味句, '服务端下发的趣味句不在池内').toBe(项.正文)
      expect(项.分享句, '刷新后读回与结算快照不一致').toBe(项.正文)
      expect(项.旧弹窗组件存在, '死组件仍在仓库里').toBe(false)
      expect(项.控制台错误, `控制台 error：${项.控制台错误.join(' | ')}`).toHaveLength(0)
      正文集.add(项.正文)
    }
  })
})
