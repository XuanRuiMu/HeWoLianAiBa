import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import 聊天页面 from '@/views/聊天页面.vue'
import TuWenShuRuQu from '@/components/聊天/图文输入区.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { XIAO_XI_KUAI_LEI_XING, shiBiaoQingBaoKuai } from '@/utils/消息内容块'
import { 声明块清单, 解析几何数值, 声明位置 } from './主题令牌真源'
import type { XiaoXiKuaiChuCan, 消息 } from '@/types'
import type { DaiFaKuai } from '@/composables/use待发图文'

/**
 * FP-24a 守门：表情包行的图文混排 + 块渲染的媒体类别分支 + 表情包尺寸令牌实体化。
 *
 * 三条事实前提（PROGRESS_技术问题.md『当前决策』FP-24a 行，主代理已回源码核实）：
 *  ① `views/聊天页面.vue` 的媒体 v-if 链里图片分支带 `!shiXuYaoKuaiXuanRan(xiaoXi)` 前置，
 *    表情包分支不带 ⇒ 「表情包 + 随附文字」（反构/回读都是 2 块，判据为 true）在表情包分支
 *    就命中并短路整条链 ⇒ 块渲染的 `v-else` 根本不执行 ⇒ **丢的是文字**。
 *  ② 补守卫只是把这一行改派给块渲染，而块渲染原先只按 `kuai.lei_xing === 'tupian'` 二分，
 *    贴纸块会按照片画（180×200 + `object-fit: cover`）⇒ 贴纸被裁切。类别判定只准走
 *    `utils/消息内容块.ts` 那一份出口（`shiTuXiangMeiTiLeiBie` 一族），不得建第二份。
 *  ③ `--duomeiti-biaoqingbao-chicun` 全库零定义（R1 幻影令牌），原先靠
 *    `var(..., 120px)` 的兜底字面量取值 ⇒ 本单在 `styles/variables.css` 定义实体值并删兜底。
 */

const MEI_TI_ID = '11111111-1111-4111-8111-111111111111'
const MEI_TI_ID_B = '22222222-2222-4222-8222-222222222222'
const TU_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=2&t=3&s=4'
const BIAO_URL = '/api/媒体/' + 'b'.repeat(64) + '?e=1&u=2&t=3&s=4'

const 源目录 = resolve(__dirname, '..')

function 读源(相对路径: string): string {
  return readFileSync(resolve(源目录, 相对路径), 'utf-8').replace(/\r\n/g, '\n')
}

function 遍历源文件(dir: string, 累加: string[] = []): string[] {
  for (const 项 of readdirSync(dir, { withFileTypes: true })) {
    if (项.name === '__tests__' || 项.name === 'node_modules') continue
    const 完整 = join(dir, 项.name)
    if (项.isDirectory()) 遍历源文件(完整, 累加)
    else if (/\.(ts|vue)$/.test(项.name)) 累加.push(完整)
  }
  return 累加
}

const 全部源文件 = 遍历源文件(源目录)

/** 非嵌套 CSS 的 (选择器串, 声明表) 清单；@media 头因内含 `{` 自然不成块，其内层规则各自成块 */
function 规则清单(源: string) {
  const 净源 = 源.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...净源.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((匹配) => ({
    选择器: 匹配[1].replace(/\s+/g, ' ').trim(),
    声明: new Map<string, string>(
      [...匹配[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((条) => [
        条[1],
        条[2].replace(/\s+/g, ' ').trim(),
      ]),
    ),
  }))
}

function 该选择器的规则(源: string, 选择器: string) {
  return 规则清单(源).filter((块) =>
    块.选择器
      .split(',')
      .map((部) => 部.trim())
      .includes(选择器),
  )
}

function biaoKuai(neiRong: string): XiaoXiKuaiChuCan {
  return {
    lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
    mei_ti_id: MEI_TI_ID_B,
    mei_ti_url: BIAO_URL,
    mei_ti_lei_bie: 'biaoqingshu',
  } as XiaoXiKuaiChuCan
}

function zhaoKuai(): XiaoXiKuaiChuCan {
  return {
    lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
    mei_ti_id: MEI_TI_ID,
    mei_ti_url: TU_URL,
    mei_ti_lei_bie: 'tupian',
  } as XiaoXiKuaiChuCan
}

function wenKuai(neiRong: string): XiaoXiKuaiChuCan {
  return { lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: neiRong } as XiaoXiKuaiChuCan
}

function jiXiaoXi(buFen: Partial<消息>): 消息 {
  return {
    id: 'x-fp24a',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '',
    lei_xing: 'wenben',
    shi_jian_chuo: 1700000000000,
    yi_du: true,
    ...buFen,
  } as 消息
}

const shangChuanMeiTiMock = vi.fn()
const faSongXiaoXiApiMock = vi.fn()

vi.mock('@/api/聊天', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return {
    ...shiJi,
    huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
    faSongXiaoXi: (...canShu: unknown[]) => faSongXiaoXiApiMock(...canShu),
    shangChuanMeiTi: (...canShu: unknown[]) => shangChuanMeiTiMock(...canShu),
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

describe('FP-24a ① 表情包行的图文混排：守卫补齐后文字不再被静默丢弃', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('Audio', JiaAudio as unknown as typeof Audio)
    vi.stubGlobal('ResizeObserver', JiaResizeObserver as unknown as typeof ResizeObserver)
    shangChuanMeiTiMock.mockReset()
    faSongXiaoXiApiMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  async function maoZai(...xiaoXi: 消息[]) {
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
    聊天仓库.xiaoXiLieBiao = xiaoXi
    await flushPromises()
    return wrapper
  }

  it('失败复现（服务端回读 2 块）：表情包 + 随附文字必须把文字画进 DOM', async () => {
    const wrapper = await maoZai(
      jiXiaoXi({
        id: 'biao-wen',
        lei_xing: 'biaoQingBao',
        nei_rong: '贴纸配文',
        mei_ti_id: MEI_TI_ID_B,
        mei_ti_url: BIAO_URL,
        mei_ti_lei_bie: 'biaoqingshu',
        nei_rong_kuai: [biaoKuai(''), wenKuai('贴纸配文')],
      }),
    )
    try {
      expect(wrapper.text()).toContain('贴纸配文')
      // 改派给块渲染后，媒体分支的整行气泡不再出现（:141 短路时它是唯一渲染点）
      expect(wrapper.find('.biaoqingbao-waike').exists()).toBe(false)
      expect(wrapper.findAll('.tuwen-kuai')).toHaveLength(2)
    } finally {
      wrapper.unmount()
    }
  })

  it('失败复现（历史行反构路径）：无 nei_rong_kuai 的表情包 + 文字同样不丢字', async () => {
    const wrapper = await maoZai(
      jiXiaoXi({
        id: 'biao-fangou',
        lei_xing: 'biaoQingBao',
        nei_rong: '反构出来的字',
        mei_ti_id: MEI_TI_ID_B,
        mei_ti_url: BIAO_URL,
        mei_ti_lei_bie: 'biaoqingshu',
      }),
    )
    try {
      expect(wrapper.text()).toContain('反构出来的字')
      expect(wrapper.find('.biaoqingbao-waike').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  /**
   * 【FP-10a 判据反转后的改判】反转前这条钉的是"单表情包行（1 块）继续吃改造前的媒体分支"；
   * 反转后判据只剩「含图片块」⇒ 这类行也走块渲染。改判后的形态仍守住 FP-24a 的本体：
   * **贴纸按贴纸档画**（`.tuwen-kuai-tu--biaoqingbao` = `contain` + 方形令牌），
   * 不被按照片那套 180×200 + `cover` 裁掉。旧的那支媒体分支不删，它退居脏行兜底
   * （可达性见 `__tests__/FP10a判据反转与贴纸待发.test.ts`）。
   */
  it('单表情包行（1 块）在 FP-10a 反转后走块渲染，且仍按贴纸档不被裁切', async () => {
    const wrapper = await maoZai(
      jiXiaoXi({
        id: 'biao-dan',
        lei_xing: 'biaoQingBao',
        nei_rong: '[表情包]',
        mei_ti_id: MEI_TI_ID_B,
        mei_ti_url: BIAO_URL,
        mei_ti_lei_bie: 'biaoqingshu',
      }),
    )
    try {
      const tuKuaiJs = wrapper.findAll('.tuwen-kuai-tu')
      expect(tuKuaiJs).toHaveLength(1)
      expect(tuKuaiJs[0].classes()).toContain('tuwen-kuai-tu--biaoqingbao')
      expect(tuKuaiJs[0].attributes('src')).toBe(BIAO_URL)
      // 载体占位符不再被当成用户打的字画一遍（不变式①：顺序即用户排的顺序）
      expect(wrapper.text()).not.toContain('[表情包]')
    } finally {
      wrapper.unmount()
    }
  })

  it('纯图行（1 个照片块）同样走块渲染，且不被误判成贴纸档', async () => {
    const wrapper = await maoZai(
      jiXiaoXi({
        id: 'tu-dan',
        lei_xing: 'tuPian',
        nei_rong: '[图片]',
        mei_ti_id: MEI_TI_ID,
        mei_ti_url: TU_URL,
        mei_ti_lei_bie: 'tupian',
      }),
    )
    try {
      const tuKuaiJs = wrapper.findAll('.tuwen-kuai-tu')
      expect(tuKuaiJs).toHaveLength(1)
      expect(tuKuaiJs[0].classes()).not.toContain('tuwen-kuai-tu--biaoqingbao')
      expect(tuKuaiJs[0].attributes('src')).toBe(TU_URL)
    } finally {
      wrapper.unmount()
    }
  })

  it('② 块渲染按 mei_ti_lei_bie 分支：贴纸块吃表情包修饰类，照片块仍走 .tuwen-kuai-tu', async () => {
    const wrapper = await maoZai(
      jiXiaoXi({
        id: 'hun-pai',
        lei_xing: 'wenben',
        nei_rong: '贴纸[图片]收尾',
        mei_ti_id: MEI_TI_ID,
        mei_ti_url: TU_URL,
        mei_ti_lei_bie: 'tupian',
        nei_rong_kuai: [biaoKuai(''), wenKuai('贴纸'), zhaoKuai(), wenKuai('收尾')],
      }),
    )
    try {
      const tuKuaiJs = wrapper.findAll('.tuwen-kuai-tu')
      expect(tuKuaiJs).toHaveLength(2)
      expect(tuKuaiJs[0].classes()).toContain('tuwen-kuai-tu--biaoqingbao')
      expect(tuKuaiJs[1].classes()).not.toContain('tuwen-kuai-tu--biaoqingbao')
      // 贴纸与照片都必须是可点击预览的图片块，文字块逐个原样落地
      expect(wrapper.text()).toContain('贴纸')
      expect(wrapper.text()).toContain('收尾')
      expect(wrapper.findAll('.tuwen-kuai')).toHaveLength(4)
    } finally {
      wrapper.unmount()
    }
  })
})

describe('FP-24a ② 类别判定的唯一出口：只准 utils/消息内容块 那一份', () => {
  it('shiBiaoQingBaoMeiTiLeiBie / shiBiaoQingBaoKuai 在前端 src 内各只有一处定义', () => {
    for (const ming of ['shiBiaoQingBaoMeiTiLeiBie', 'shiBiaoQingBaoKuai']) {
      const 定义 = 全部源文件
        .filter((luJing) =>
          new RegExp(`^(export )?function ${ming}\\b`, 'm').test(readFileSync(luJing, 'utf-8')),
        )
        .map((luJing) => luJing.replace(/\\/g, '/').split('/src/')[1])
      expect(定义, `${ming} 出现第二份定义`).toEqual([`utils/消息内容块.ts`])
    }
  })

  it('任何 .vue 里不得再出现 biaoqingshu 字面量（类别判定只能在真源模块内）', () => {
    const 命中 = 全部源文件
      .filter((luJing) => luJing.endsWith('.vue'))
      .filter((luJing) => readFileSync(luJing, 'utf-8').includes('biaoqingshu'))
      .map((luJing) => luJing.replace(/\\/g, '/').split('/src/')[1])
    expect(命中).toEqual([])
  })

  it('两个呈现点一律 import 真源出口，不自建判定', () => {
    for (const 路径 of ['views/聊天页面.vue', 'components/聊天/图文输入区.vue']) {
      const 源 = 读源(路径)
      expect(源, `${路径} 未引用真源出口`).toMatch(
        /import\s*\{[^}]*shiBiaoQingBaoKuai[^}]*\}\s*from\s*'@\/utils\/消息内容块'/,
      )
    }
  })

  it('出口本身的行为口径：只有图片块且类别为贴纸才判真，缺类别不猜成贴纸', () => {
    expect(shiBiaoQingBaoKuai(biaoKuai(''))).toBe(true)
    expect(shiBiaoQingBaoKuai(zhaoKuai())).toBe(false)
    expect(shiBiaoQingBaoKuai(wenKuai('只有字'))).toBe(false)
    expect(shiBiaoQingBaoKuai({ lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: MEI_TI_ID })).toBe(
      false,
    )
    expect(shiBiaoQingBaoKuai(null)).toBe(false)
    // 大小写/空白容忍：媒体类别码是存量小写形态，服务端不会给出 'BiaoQingShu'，但边界不猜错
    expect(
      shiBiaoQingBaoKuai({
        lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
        mei_ti_id: MEI_TI_ID_B,
        mei_ti_lei_bie: ' BiaoQingShu ',
      }),
    ).toBe(true)
  })
})

describe('FP-24a ② --duomeiti-biaoqingbao-chicun 由幻影令牌变为有定义点 + 消费点的真源', () => {
  const 块们 = 声明块清单()

  it('定义点唯一且住在共用 :root 块（量纲与主题档无关），解析值 = 120px', () => {
    const 位置 = 声明位置('--duomeiti-biaoqingbao-chicun', 块们)
    expect(位置).toEqual({ 共用: true, 浅色: false, 深色: false })
    expect(解析几何数值('--duomeiti-biaoqingbao-chicun', 块们)).toBe(120)
  })

  it('全库不存在 var(--duomeiti-biaoqingbao-chicun, 120px) 那类同值兜底', () => {
    const 命中 = 全部源文件
      .map((luJing) => luJing.replace(/\\/g, '/').split('/src/')[1])
      .filter((名) =>
        new RegExp(`var\\(\\s*--duomeiti-biaoqingbao-chicun\\s*,`).test(读源(名)),
      )
    expect(命中).toEqual([])
  })

  it('消费点 ≥1 且两处贴纸呈现都吃它、都是 contain；照片块仍吃 180×200 + cover', () => {
    const 聊天页 = 读源('views/聊天页面.vue')
    const 消费次数 = (聊天页.match(/var\(\s*--duomeiti-biaoqingbao-chicun\s*\)/g) ?? []).length
    expect(消费次数, '令牌必须有消费者').toBeGreaterThanOrEqual(4)

    const 媒体 = 该选择器的规则(聊天页, '.biaoqingbao-tu')
    expect(媒体).toHaveLength(1)
    expect(媒体[0].声明.get('width')).toBe('var(--duomeiti-biaoqingbao-chicun)')
    expect(媒体[0].声明.get('height')).toBe('var(--duomeiti-biaoqingbao-chicun)')
    expect(媒体[0].声明.get('object-fit')).toBe('contain')

    const 贴纸 = 该选择器的规则(聊天页, '.tuwen-kuai-tu--biaoqingbao')
    expect(贴纸).toHaveLength(1)
    expect(贴纸[0].声明.get('object-fit')).toBe('contain')
    for (const xing of ['width', 'height', 'max-width', 'max-height']) {
      expect(贴纸[0].声明.get(xing), `.tuwen-kuai-tu--biaoqingbao 的 ${xing} 未吃令牌`).toBe(
        'var(--duomeiti-biaoqingbao-chicun)',
      )
    }

    const 照片 = 该选择器的规则(聊天页, '.tuwen-kuai-tu')
    expect(照片).toHaveLength(1)
    expect(照片[0].声明.get('max-width')).toBe('var(--tuwen-tu-zuidakuan)')
    expect(照片[0].声明.get('object-fit')).toBe('cover')
    // 修饰类必须排在基础类之后：同特异度 (0,1,0) 时靠源码序压制，写反了就变成按照片画
    expect(聊天页.indexOf('.tuwen-kuai-tu--biaoqingbao')).toBeGreaterThan(
      聊天页.indexOf('.tuwen-kuai-tu {'),
    )
  })
})

describe('FP-24a ② 待发缩略图同样按类别走 contain（cover 会裁贴纸）', () => {
  function faKuai(buFen: Partial<DaiFaKuai>): DaiFaKuai {
    return {
      id: buFen.id ?? 'k',
      lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
      nei_rong: '',
      wen_jian: null,
      mei_ti_id: MEI_TI_ID,
      mei_ti_lei_bie: 'tupian',
      yu_lan_url: TU_URL,
      mi_deng_jian: 'jian',
      ...buFen,
    } as DaiFaKuai
  }

  // FP-10c 契约演进：待发序列组件退役进图文输入区，本用例的挂载对象随之换成那唯一一份实现。
  // 同时丢掉两个已不存在的 prop（huoYueKuaiId / youTuPian）—— 它们服务的是"活动块高亮"，
  // 那个形态（.dai-fa-kuai--huodong）已随真内联作废并由 FP10c① 反向锁定归零，
  // 不是把断言删松：贴纸/照片的类别分支判定一条没少，只是换到真实渲染点上证。
  it('贴纸块带修饰类、照片块不带', () => {
    const wrapper = mount(TuWenShuRuQu, {
      props: {
        kuaiLieBiao: [
          faKuai({ id: 'k1', mei_ti_id: MEI_TI_ID_B, yu_lan_url: BIAO_URL, mei_ti_lei_bie: 'biaoqingshu' }),
          faKuai({ id: 'k2' }),
          faKuai({ id: 'k3', lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: '文字块' }),
        ],
        wenBen: '',
        guangBiao: { kuaiId: '', pianYi: 0 },
        zhanWeiFu: '',
        zuiDaChangDu: 500,
      },
      attachTo: document.body,
    })
    const tu = wrapper.findAll('.dai-fa-kuai-tu')
    expect(tu).toHaveLength(2)
    expect(tu[0].classes()).toContain('dai-fa-kuai-tu--biaoqingbao')
    expect(tu[1].classes()).not.toContain('dai-fa-kuai-tu--biaoqingbao')
    wrapper.unmount()
  })

  it('CSS：缩略图只改 object-fit，几何仍吃 --daifa-kuai-tu-*（不新造第二套尺寸）', () => {
    const 源 = 读源('components/聊天/图文输入区.vue')
    const 规则 = 该选择器的规则(源, '.dai-fa-kuai-tu--biaoqingbao')
    expect(规则).toHaveLength(1)
    expect(规则[0].声明.get('object-fit')).toBe('contain')
    expect([...规则[0].声明.keys()]).toEqual(['object-fit'])
    const 基础 = 该选择器的规则(源, '.dai-fa-kuai-tu')
    expect(基础[0].声明.get('width')).toBe('var(--daifa-kuai-tu-kuan)')
    expect(基础[0].声明.get('object-fit')).toBe('cover')
    expect(源.indexOf('.dai-fa-kuai-tu--biaoqingbao')).toBeGreaterThan(源.indexOf('.dai-fa-kuai-tu {'))
  })
})

describe('FP-24a ① 守卫同构（模板条件层）', () => {
  const 聊天页 = 读源('views/聊天页面.vue')

  function 媒体分支条件(条件指令: 'v-if' | 'v-else-if', 关键字: string): string {
    return (
      [...聊天页.matchAll(new RegExp(`${条件指令}="([^"]*)"`, 'g'))]
        .map((m) => m[1])
        .find((tiao) => tiao.includes(关键字)) ?? ''
    )
  }

  it('图片分支与表情包分支都带 !shiXuYaoKuaiXuanRan(xiaoXi) 前置（同构）', () => {
    const 图片 = 媒体分支条件('v-if', 'tuPian')
    const 表情 = 媒体分支条件('v-else-if', 'biaoQingBao')
    expect(图片).toContain(`xiaoXi.lei_xing === 'tuPian'`)
    expect(图片).toContain('&& !shiXuYaoKuaiXuanRan(xiaoXi)')
    expect(表情).toContain(`xiaoXi.lei_xing === 'biaoQingBao'`)
    expect(表情, '表情包分支又少了块渲染前置 ⇒ 图文同条时文字被静默丢弃').toContain(
      '&& !shiXuYaoKuaiXuanRan(xiaoXi)',
    )
  })

  it('类别分支在模板里只经真源出口，不留字面量比较', () => {
    const 块渲染段 = 聊天页.slice(
      聊天页.indexOf('v-if="shiXuYaoKuaiXuanRan(xiaoXi)"'),
      聊天页.indexOf('v-else>{{ xiaoXi.nei_rong }}'),
    )
    expect(块渲染段).toContain('shiBiaoQingBaoKuai(kuai)')
    expect(块渲染段).not.toMatch(/mei_ti_lei_bie\s*===/)
  })
})
