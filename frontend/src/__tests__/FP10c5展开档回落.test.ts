import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import 聊天页面 from '@/views/聊天页面.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { duQuShuRuQuText, xieRuShuRuQu, fangZhiGuangBiao } from './输入区夹具'
import { huoQuFanYi } from '@/config/translations'

/**
 * FP-10c 第⑤刀真机暴露缺陷 #1 的 jsdom 双钉之一（另一钉由浏览器现场取证）。
 *
 * 现场（FP-10c5 浏览器取证）：
 * 点 .zhan-kai-anniu 把输入区撑开后，再把内容换成短内容，`.zhan-kai` 类不移除（暗/浅两档、两视口全复现）
 * ⇒ 展开态不退回收。根因：FP-10c 把 use输入框.ts 的 JS 量高链删成纯 CSS 两档时，
 * 连带删掉了「内容变化 ⇒ 重新判定还需要不需要展开档」这一条**复位触发源**，
 * 于是布尔量只剩点击这一条置位路径 + 发送/清面板两条复位路径，用户删内容不再回落。
 *
 * 修法口径（本文件把这条口径钉成契约，改回别的方向当场红）：
 *  ① 复位判定**只准住在** composables/use输入区展开档.ts 一处（页面零写布尔量）；
 *  ② 判定量是**内容结构**（硬换行 + 图文块），不是像素高度：
 *     禁止把 JS 测高（scrollHeight/clientHeight → 内联 maxHeight）搬回来，
 *     那正是 FP10c真内联输入区.test.ts:164 钉死的「第二套量高真源」复活路径；
 *  ③ FP-05「折叠态溢出不得擅自自动展开」不放松：**文字**多行溢出仍不自动置位；
 *     FP-10c-⑥ 起「待发图文块出现」是唯一的自动置位例外（块 64px 会被 35px 折叠裁掉），
 *     删块且内容回单行档自动回落。好友页接真源 prop（无手动按钮）。
 */

const 源目录 = resolve(__dirname, '..')
const 展开档真源 = join(源目录, 'composables/use输入区展开档.ts')

const SHANG_CHUAN_MEI_TI_ID = '33333333-3333-4333-8333-333333333333'
const xuanRanMock = vi.fn()
const faSongXiaoXiApiMock = vi.fn()

vi.mock('@/api/聊天', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return {
    ...shiJi,
    huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
    faSongXiaoXi: (...canShu: unknown[]) => faSongXiaoXiApiMock(...canShu),
    cheHuiXiaoXi: vi.fn(),
    biaoJiYiDu: vi.fn(),
    huoQuJiaoSeXiangQing: vi.fn().mockResolvedValue({
      jiao_se: {
        id: 'j1',
        ming_zi: '测试角色',
        wei_xin_ming: '小甜心',
        tou_xiang: '',
        xing_bie: 'nv',
        nian_ling: 22,
        wai_mao: '',
        xing_ge: '',
        bei_jing_gu_shi: '',
        xi_hao: [],
        yan_yu_feng_ge: '',
        biao_qian: [],
        re_du: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
      },
      dang_an_zhuang_tai: null,
    }),
    huoQuFuPan: vi.fn().mockResolvedValue({
      fu_pan_nei_rong: null,
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: null,
      jun_shi_zhi_dao_ji_lu: [],
      guan_jian_shi_jian: [],
      jia_zai_zhong: false,
    }),
  }
})

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('@/api/表情', () => ({
  huoQuWoDeBiaoQing: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  tianJiaBiaoQing: vi.fn(),
  shanChuBiaoQing: vi.fn(),
  baoCunBiaoQingPaiXu: vi.fn(),
}))

// 贴纸的 canvas 渲染本体由 __tests__/多媒体聊天.test.ts 把守；这里只要「贴纸进待发块序列」这个结果
vi.mock('@/utils/表情包库', async () => {
  const shiJi = await vi.importActual<typeof import('@/utils/表情包库')>('@/utils/表情包库')
  return {
    ...shiJi,
    xuanRanBiaoQingBao: (...canShu: unknown[]) => xuanRanMock(...canShu),
  }
})

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

class JiaAudio {
  src = ''
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  play() {
    return Promise.resolve()
  }
  pause() {}
}

class JiaResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function maoZai() {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 }],
  })
  await luYou.push('/chat/h1')
  const pinia = createPinia()
  setActivePinia(pinia)
  const 用户仓库 = 使用用户仓库()
  用户仓库.dangQianYongHu = {
    id: 'u1',
    shou_ji_hao: '13800138000',
    yong_hu_ming: '测试用户',
    ni_cheng: '测试昵称',
    xing_bie: 'male',
    mu_biao_xing_bie: 'female',
    xing_ge_xuan_ze: 'INTJ',
    ren_she_biao_qian: 'neiLianXueBa',
    yun_xu_zha_nan_zha_nv: false,
    tou_xiang: null,
    sheng_ri: null,
    qian_ming: null,
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    geng_xin_shi_jian: new Date().toISOString(),
  }
  用户仓库.令牌 = 'test-token'
  const 聊天仓库 = 使用聊天仓库()
  聊天仓库.dangQianHuiHuaId = 'h1'
  聊天仓库.jiaoSeXinXi = {
    id: 'j1',
    ming_zi: '测试角色',
    wei_xin_ming: '小甜心',
    tou_xiang: '',
    xing_bie: 'nv',
    nian_ling: 22,
    wai_mao: '',
    xing_ge: '',
    bei_jing_gu_shi: '',
    xi_hao: [],
    yan_yu_feng_ge: '',
    biao_qian: [],
    re_du: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
  }
  const wrapper = mount(聊天页面, {
    global: { plugins: [pinia, luYou] },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, 聊天仓库 }
}

function 展开档(wrapper: Awaited<ReturnType<typeof maoZai>>['wrapper']): boolean {
  return wrapper.find('.shuru-kuang').classes().includes('zhan-kai')
}

/** 表情面板 → 「表情包」页签 → 内置贴纸第一格（与 FP10a 同一手势路径，不抄样式） */
async function 插一张待发贴纸(wrapper: Awaited<ReturnType<typeof maoZai>>['wrapper']): Promise<void> {
  await wrapper.find('.emoji-anniu').trigger('click')
  await flushPromises()
  await wrapper.findAll('.mianban-tab')[1].trigger('click')
  await flushPromises()
  await wrapper.findAll('.biaoqingbao-fenqu')[1].findAll('.biaoqingbao-xiangmu')[0].trigger('click')
  await flushPromises()
  await flushPromises()
}

/** 只换文字、保留流里的图文块：xieRuShuRuQu 的 textContent='' 是整体替换，会把待发块一起清掉（用户删字不会删块） */
async function 只改文字保留块(wrapper: Awaited<ReturnType<typeof maoZai>>['wrapper'], wenBen: string): Promise<void> {
  const ele = wrapper.find('.shuru-kuang')
  if (!ele.exists()) throw new Error('找不到 .shuru-kuang')
  const cao = ele.element as HTMLElement
  const 块们 = Array.from(cao.querySelectorAll('.dai-fa-kuai--tu'))
  cao.textContent = ''
  if (wenBen !== '') cao.appendChild(document.createTextNode(wenBen))
  for (const 块 of 块们) cao.appendChild(块)
  fangZhiGuangBiao(cao, wenBen.length)
  cao.dispatchEvent(new Event('input', { bubbles: true }))
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

/** 点击待发块上的删除按钮，模拟用户删掉整张待发图（与插一张相反的路径） */
async function 页删待发块(wrapper: Awaited<ReturnType<typeof maoZai>>['wrapper']): Promise<void> {
  const shan = wrapper.find('.shuru-kuang .dai-fa-kuai-shanchu')
  if (shan.exists()) {
    await shan.trigger('click')
    await flushPromises()
    return
  }
  throw new Error('找不到待发块删除按钮 .dai-fa-kuai-shanchu')
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('Audio', JiaAudio as unknown as typeof Audio)
  vi.stubGlobal('ResizeObserver', JiaResizeObserver as unknown as typeof ResizeObserver)
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:fp10c5-yulan'),
    revokeObjectURL: vi.fn(),
  } as unknown as typeof URL)
  faSongXiaoXiApiMock.mockReset()
  faSongXiaoXiApiMock.mockResolvedValue({
    xiaoXi: {
      id: 'fu-wu-duan',
      hui_hua_id: 'h1',
      fa_song_zhe_id: 'u1',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: '测试消息',
      lei_xing: 'wenben',
      shi_jian_chuo: 1700000000000,
      yi_du: true,
    },
  })
  xuanRanMock.mockReset()
  xuanRanMock.mockResolvedValue(new Blob(['tie-zhi-bytes'], { type: 'image/png' }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('FP-10c⑤ 缺陷1 · 展开档回落：内容回到单行档必须退回收（真机 fp05:547 的 jsdom 同一条）', () => {
  it('多行撑开后换成短内容 ⇒ .zhan-kai 摘掉、按钮文案回到「展开」', async () => {
    const { wrapper } = await maoZai()
    await xieRuShuRuQu(wrapper, '第一行短\n第二行短\n第三行短')
    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()
    expect(展开档(wrapper), '前置：点展开按钮没进展开档').toBe(true)

    await xieRuShuRuQu(wrapper, '短内容')
    await flushPromises()

    expect(展开档(wrapper), '内容已回到单行档，展开态却不退回收（真机 fp05:547 同一条红）').toBe(false)
    expect(wrapper.find('.zhan-kai-anniu').attributes('aria-label')).toBe(
      huoQuFanYi('liaoTian', 'zhanKai'),
    )
    expect(duQuShuRuQuText(wrapper)).toBe('短内容')
  })

  it('多行撑开后清空内容 ⇒ 回落（与「发送后清空并折叠」同一条判定，不再各写一份）', async () => {
    const { wrapper } = await maoZai()
    await xieRuShuRuQu(wrapper, '第一行\n第二行')
    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()
    expect(展开档(wrapper), '前置：没进展开档').toBe(true)

    await xieRuShuRuQu(wrapper, '')
    await flushPromises()

    expect(展开档(wrapper), '清空后展开档不回落').toBe(false)
  })

  it('展开档里逐字删到只剩一行（仍是硬换行的多行）⇒ 不回落：复位判定看的是内容结构，不是「内容一变就摘」', async () => {
    const { wrapper } = await maoZai()
    await xieRuShuRuQu(wrapper, '甲甲甲甲\n乙乙乙乙')
    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()
    expect(展开档(wrapper), '前置：没进展开档').toBe(true)

    await xieRuShuRuQu(wrapper, '甲\n乙')
    await flushPromises()

    expect(展开档(wrapper), '内容仍是多行硬换行 ⇒ 展开档必须留着（回落判据若是「内容一变就摘」，这条当场红）').toBe(
      true,
    )
  })

  it('展开档里只剩图文块（文字删成单行）⇒ 不回落：块比一行高，摘掉就把待发图裁回 35px', async () => {
    const { wrapper } = await maoZai()
    await xieRuShuRuQu(wrapper, '甲乙\n丙丁')
    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()
    expect(展开档(wrapper), '前置：没进展开档').toBe(true)

    await 插一张待发贴纸(wrapper)
    await 只改文字保留块(wrapper, '甲乙')
    await flushPromises()

    expect(duQuShuRuQuText(wrapper), '前置：文字已回到单行').toBe('甲乙')
    expect(wrapper.findAll('.shuru-kuang .dai-fa-kuai--tu').length, '前置：待发图片块没进文字流').toBeGreaterThan(0)
    expect(展开档(wrapper), '图片块还在 ⇒ 展开档不许回落').toBe(true)
  })

  it('置位仍只由用户点击决定：文字多行溢出不会自己撑开（FP-05 不放松）；唯一的自动置位是待发图文块（FP-10c-⑥）', async () => {
    const { wrapper } = await maoZai()
    await xieRuShuRuQu(wrapper, '短内容')
    await flushPromises()
    expect(展开档(wrapper)).toBe(false)

    await xieRuShuRuQu(wrapper, '第一行\n第二行\n第三行\n第四行\n第五行')
    await flushPromises()

    expect(展开档(wrapper), '文字多行溢出就擅自展开 = 违反 FP-05').toBe(false)
    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()
    expect(展开档(wrapper), '点击必须置位（回落修好后点击链不能一起废掉）').toBe(true)

    await xieRuShuRuQu(wrapper, '')
    await flushPromises()
    expect(展开档(wrapper), '清空后应回落，为块触发置位做前置').toBe(false)

    await 插一张待发贴纸(wrapper)
    await flushPromises()
    expect(展开档(wrapper), 'FP-10c-⑥：待发图文块出现必须自动进展开档（否则 64px 块被 35px 裁掉）').toBe(
      true,
    )
    await 页删待发块(wrapper)
    await flushPromises()
    expect(展开档(wrapper), 'FP-10c-⑥：删块且内容回单行档 ⇒ 自动回落').toBe(false)
  })

  it('发送这条路径不回归：发完清空并折叠', async () => {
    const { wrapper } = await maoZai()
    await xieRuShuRuQu(wrapper, '测试消息\n第二行')
    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()
    expect(展开档(wrapper), '前置：没进展开档').toBe(true)

    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()

    expect(duQuShuRuQuText(wrapper)).toBe('')
    expect(展开档(wrapper), '发送后没折叠').toBe(false)
  })
})

describe('FP-10c⑤ 缺陷1 · 同类点穷尽：.zhan-kai 只有一处判定真源', () => {
  const 两页 = ['views/聊天页面.vue', 'views/好友聊天.vue']

  it('展开档真源文件在，且是全库唯一写这个布尔量的地方', () => {
    expect(existsSync(展开档真源), 'composables/use输入区展开档.ts 不在 ⇒ 复位条件没有真源').toBe(true)
    const 真源 = readFileSync(展开档真源, 'utf8')
    expect(真源, '真源里没有回落判定（单行档谓词）').toMatch(/danHangDang/)
    expect(真源, '真源里又出现内联量高 = 把删掉的 JS 测高链搬回来').not.toMatch(/scrollHeight|clientHeight|maxHeight/)
    expect(真源, '真源不得复活 use输入框.ts 那套符号').not.toMatch(
      /\b(shuRuKuangKeZhanKai|zhanKaiAnNiuKeYong|jiSuanDanXingGaoDu|ceLiangShuRuKuang)\b/,
    )
  })

  /** 页面里「自己写这个布尔量」的三种形态：置位/复位/自持 ref。检测器与判定串一起钉，不靠运行时反射 */
  const 页面自持展开档 = /shuRuKuangZhanKai\.value\s*[-!?]?=|const\s+shuRuKuangZhanKai\s*=\s*ref/

  it('两页零写布尔量：置位/复位一律走真源出口（页面各抄一份就是这次漂移的成因）', () => {
    for (const 页 of 两页) {
      const 源 = readFileSync(join(源目录, 页), 'utf8')
      if (页面自持展开档.test(源)) throw new Error(`${页} 又自己持有/改写展开档布尔量（第二真源）`)
    }
    const 聊天页 = readFileSync(join(源目录, 'views/聊天页面.vue'), 'utf8')
    expect(聊天页, '聊天页未 import 展开档唯一真源').toMatch(/from '@\/composables\/use输入区展开档'/)
    expect(聊天页, '聊天页必须把真源的布尔量喂给唯一实现的展开档 prop').toMatch(/:zhan-kai="shuRuKuangZhanKai"/)
    expect(聊天页, '聊天页的展开按钮必须吃同一个布尔量').toMatch(
      /:class="\{\s*'zhan-kai':\s*shuRuKuangZhanKai\s*\}"/,
    )
    // 好友页无手动展开按钮（无 .zhan-kai-anniu 的 class= 绑定），但 FP-10c-⑥ 起接真源 prop 自动置位/回落；
    // 第二真源仍由上面「零自持」判出来，且不得出现第二份 :class 字符串类绑定
    const 好友页 = readFileSync(join(源目录, 'views/好友聊天.vue'), 'utf8')
    expect(好友页, '好友页出现第二份 .zhan-kai 类绑定 = 第二真源').not.toMatch(/'zhan-kai'/)
    expect(好友页, '好友页未接展开档真源（FP-10c-⑥ 自动置位失效）').toMatch(
      /from '@\/composables\/use输入区展开档'/,
    )
    expect(好友页, '好友页必须把真源布尔量喂给唯一实现的展开档 prop').toMatch(/:zhan-kai="shuRuKuangZhanKai"/)
    const 好友页模板 = 好友页.slice(0, 好友页.indexOf('</template>'))
    expect(好友页模板, '好友页模板不得长出手动展开按钮（保持无第二份类绑定契约）').not.toMatch(
      /class="[^"]*zhan-kai-anniu/,
    )
  })

  it('反证：上面那两条检出不恒真 —— 抄回页面的源串必须被判红，合规写法必须放过', () => {
    const 违规置位 = "const shuRuKuangZhanKai = ref(false)\nshuRuKuangZhanKai.value = false\n"
    const 违规复位 = 'shuRuKuangZhanKai.value = !shuRuKuangZhanKai.value'
    expect(页面自持展开档.test(违规置位), '检测器恒假：自持 ref + 直接赋值没被抓到').toBe(true)
    expect(页面自持展开档.test(违规复位), '检测器恒假：页面自己翻转布尔量没被抓到').toBe(true)
    const 合规 = 'const { shuRuKuangZhanKai, qieHuanShuRuKuangZhanKai, shouQiShuRuKuangZhanKai } = use输入区展开档({...})\nqieHuanShuRuKuangZhanKai()\nshouQiShuRuKuangZhanKai()'
    expect(页面自持展开档.test(合规), '检测器误伤：走真源出口的写法被判成第二真源').toBe(false)
    expect(/'zhan-kai'/.test(`<div :class="{ 'zhan-kai': true }" />`), '好友页那条检出恒假（第二份类绑定抓不到）').toBe(
      true,
    )
  })
})
