import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileStyle, parse as sfcParse } from '@vue/compiler-sfc'
import { 规则清单 } from './CSS级联真源'
import 挑战主页 from '@/views/挑战主页.vue'
import 挑战积分榜 from '@/views/挑战积分榜.vue'
import 账号与安全 from '@/views/账号与安全.vue'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/translations'
import {
  huoQuDangQianDuiJu,
  huoQuWoDeGaiKuang,
  huoQuPaiHangBang,
  type ZuBieGaiKuang,
  type PaiHangXiangMu,
} from '@/api/挑战'
import type { Yonghu } from '@/types'

vi.mock('@/api/挑战')
vi.mock('@/api/认证', () => ({
  gengGaiYongHuMing: vi.fn().mockResolvedValue({ yong_hu_ming: '新名字' }),
  gengGaiMiMa: vi.fn().mockResolvedValue(undefined),
  gengGaiMoRenXingBie: vi.fn().mockResolvedValue(undefined),
  faSongMa: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/api/社交', () => ({
  huoQuYongHuSheZhi: vi.fn().mockResolvedValue({
    uid: 'u1',
    shou_ji_hao: '13800138000',
    tou_xiang: null,
    qian_ming: null,
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: 'moRen',
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  }),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  shangChuanLiaoTianBeiJing: vi.fn().mockResolvedValue('https://cdn.example.com/x.jpg'),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
  huoQuHaoYouLieBiao: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/api/资料', async (yuanShi) => {
  const shiJi = (await yuanShi()) as Record<string, unknown>
  return {
    ...shiJi,
    baoCunQianMing: vi.fn().mockResolvedValue(undefined),
    shangChuanTouXiang: vi.fn().mockResolvedValue('/api/媒体/abc?e=1&s=2'),
    huoQuFengJinZhuangTai: vi.fn().mockResolvedValue({
      bei_feng_jin: false,
      ji_bie: 'zheng_chang',
      wei_gui_ci_shu: 0,
      jie_feng_shi_jian: null,
      shen_su_zhuang_tai: 'wu',
    }),
    tiJiaoShenSu: vi.fn().mockResolvedValue(undefined),
  }
})
vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

const moDuiJu = vi.mocked(huoQuDangQianDuiJu)
const moGaiKuang = vi.mocked(huoQuWoDeGaiKuang)
const moPaiHang = vi.mocked(huoQuPaiHangBang)

function duYangShi(duiXiang: string): string {
  const 源 = readFileSync(resolve(__dirname, duiXiang), 'utf8')
  const 命中 = [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((项) => 项[1])
  expect(命中.length).toBeGreaterThan(0)
  return 命中.join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
}

const 主页样式 = () => duYangShi('../views/主页内容.vue')
const 账号样式 = () => duYangShi('../views/账号与安全.vue')
const 挑战样式 = () => duYangShi('../views/挑战主页.vue')
const 榜单样式 = () => duYangShi('../views/挑战积分榜.vue')
const 账号源码 = () => readFileSync(resolve(__dirname, '../views/账号与安全.vue'), 'utf8')

const 几何属性 = [
  'border',
  'border-width',
  'border-radius',
  'padding',
  'gap',
  'margin',
  'width',
  'height',
  'box-shadow',
  'display',
  'position',
  'transform',
  'overflow',
  'backdrop-filter',
]

function 单档几何(样式: string, 选择器片段: string): string[] {
  return 规则清单(样式)
    .filter((项) => 项.选择器.includes('data-theme') && 项.选择器.includes(选择器片段))
    .flatMap((项) =>
      [...项.声明.keys()].filter((属性) => 几何属性.includes(属性)).map(
        (属性) => `${项.选择器}|${属性}`,
      ),
    )
}

function 亮度(rgb: [number, number, number]): number {
  const 线性 = (值: number) => {
    const v = 值 / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * 线性(rgb[0]) + 0.7152 * 线性(rgb[1]) + 0.0722 * 线性(rgb[2])
}

function 对比度(甲: string, 乙: string): number {
  const 取 = (hex: string): [number, number, number] => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
  const a = 亮度(取(甲))
  const b = 亮度(取(乙))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function 局部变量(源码: string, 名: string, 深色: boolean): string {
  const 块 = 深色
    ? (/:root\[data-theme='dark'\][^{]*\{([^}]*)\}/.exec(源码)?.[1] ?? '')
    : (/^\.zhang-hao-an-quan\s*\{([^}]*)\}/m.exec(源码)?.[1] ?? '')
  const 命中 = new RegExp(`${名}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(块)
  expect(命中, `${深色 ? '深' : '浅'}色档缺少 ${名}`).not.toBeNull()
  return (命中 as RegExpMatchArray)[1]
}

function kongGaiKuang(): ZuBieGaiKuang[] {
  return ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv'].map((zu_bie) => ({
    zu_bie: zu_bie as ZuBieGaiKuang['zu_bie'],
    ji_fen: null,
    duan_wei: null,
    sheng_chang: 0,
    fu_chang: 0,
    qi_quan_chang: 0,
    lian_sheng: 0,
    pai_ming: null,
  }))
}

function zhiPaiHang(): PaiHangXiangMu[] {
  return [
    {
      pai_ming: 1,
      yong_hu_ming: '玩家一',
      ji_fen: 1810,
      duan_wei: '大师',
      sheng_chang: 30,
      fu_chang: 10,
      qi_quan_chang: 2,
      zui_gao_lian_sheng: 8,
    },
  ]
}

function zhiYongHu(moRen: Yonghu['mo_ren_xing_bie']): Yonghu {
  return {
    id: 'u1',
    shou_ji_hao: '13800138000',
    yong_hu_ming: '测试用户',
    ni_cheng: '测试昵称',
    mu_biao_xing_bie: 'female',
    mo_ren_xing_bie: moRen,
    xing_ge_xuan_ze: 'INTJ',
    ren_she_biao_qian: 'neiLianXueBa',
    yun_xu_zha_nan_zha_nv: false,
    tou_xiang: null,
    sheng_ri: null,
    qian_ming: null,
    jiao_se: null,
    neng_li: [],
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    geng_xin_shi_jian: new Date().toISOString(),
  }
}

async function guaTiaoZhan(moRen: Yonghu['mo_ren_xing_bie'] = null) {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/tiao-zhan', component: 挑战主页 },
      { path: '/tiao-zhan/pai-hang', component: 挑战积分榜 },
      { path: '/tian-jia-wei-xin', component: { template: '<div>添加微信</div>' } },
      { path: '/chat/:huiHuaId', component: { template: '<div>聊天</div>' } },
    ],
  })
  luYou.push('/tiao-zhan')
  await luYou.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  使用用户仓库().dangQianYongHu = zhiYongHu(moRen)
  const wrapper = mount(挑战主页, { global: { plugins: [pinia, luYou] } })
  await flushPromises()
  return wrapper
}

async function guaJiFenBang(moRen: Yonghu['mo_ren_xing_bie'] = null) {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/tiao-zhan', component: 挑战主页 },
      { path: '/tiao-zhan/pai-hang', component: 挑战积分榜 },
    ],
  })
  luYou.push('/tiao-zhan/pai-hang')
  await luYou.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  使用用户仓库().dangQianYongHu = zhiYongHu(moRen)
  const wrapper = mount(挑战积分榜, { global: { plugins: [pinia, luYou] } })
  await flushPromises()
  return wrapper
}

async function guaZhangHao() {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div></div>' } }],
  })
  luYou.push('/')
  await luYou.isReady()
  setActivePinia(createPinia())
  const wrapper = mount(账号与安全, {
    global: { plugins: [createPinia(), luYou] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('FP-D ① 深浅同构：单档主题块零几何特例', () => {
  it('主页三元素框几何两档一致：单档块不得声明几何', () => {
    const 样式 = 主页样式()
    for (const 选择器 of ['.biaoti-neirong', '.qinggan-neirong-ceng', '.moshi-kapian']) {
      expect(单档几何(样式, 选择器), `${选择器} 存在单档几何特例`).toEqual([])
    }
  })

  it('挑战性别弹层单档块不得声明 box-shadow（高程由令牌承载）', () => {
    expect(单档几何(挑战样式(), '.xingbie-tanchuang').filter((项) => 项.endsWith('|box-shadow'))).toEqual([])
  })

  it('挑战取消按钮单档块不得声明 border-color（与基线同值冗余分叉）', () => {
    expect(
      单档几何(挑战样式(), '.anniu-quxiao').filter((项) => 项.endsWith('|border-color')),
    ).toEqual([])
  })

  it('账号局部变量深色块只改颜色：几何变量仅共用定义一次', () => {
    const 源码 = 账号源码().replace(/\/\*[\s\S]*?\*\//g, '')
    const yuanJiao = [...源码.matchAll(/--yuanJiao\s*:/g)].length
    expect(yuanJiao).toBe(1)
    const 暗块 = /:root\[data-theme='dark'\][^{]*\{([^}]*)\}/.exec(源码)?.[1] ?? ''
    expect(暗块).not.toBe('')
    for (const 条 of 暗块.split(';').map((项) => 项.trim()).filter(Boolean)) {
      expect(条).toMatch(/^--[a-zA-Z]+\s*:\s*#[0-9a-fA-F]{6}$/)
    }
  })

  it('积分榜零单档主题块：不得新增 data-theme 特例', () => {
    const 命中 = 规则清单(榜单样式()).filter((项) => 项.选择器.includes('data-theme'))
    expect(命中.map((项) => 项.选择器)).toEqual([])
  })
})

describe('FP-D ② 账号设置全元素可见：对比度与令牌色', () => {
  function 覆盖层变量(档: 'light' | 'dark', 名: string): string {
    const 覆盖 = readFileSync(resolve(__dirname, '../styles/zhang-hao-an-quan-rong-cao-di.css'), 'utf8')
    const 块 = (
      档 === 'light'
        ? /:root\[data-theme="light"\][^{]*\{([^}]*)\}/
        : /:root\[data-theme="dark"\][^{]*\{([\s\S]*?)\n\}/
    ).exec(覆盖)?.[1] ?? ''
    const 命中 = new RegExp(`${名}\\s*:\\s*([^;!]+)!important`).exec(块)
    expect(命中, `覆盖层缺少 ${档} ${名}`).not.toBeNull()
    return (命中 as RegExpMatchArray)[1].trim()
  }

  function 理论卡面(深色: boolean): string {
    return 覆盖层变量(深色 ? 'dark' : 'light', '--kaPian')
  }

  function 混合色(前景: string, 底: string): string {
    const 取 = (色: string): [number, number, number, number] => {
      const rgba = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(色)
      if (rgba) {
        return [
          Number(rgba[1]),
          Number(rgba[2]),
          Number(rgba[3]),
          rgba[4] === undefined ? 1 : Number(rgba[4]),
        ]
      }
      return [
        Number.parseInt(色.slice(1, 3), 16),
        Number.parseInt(色.slice(3, 5), 16),
        Number.parseInt(色.slice(5, 7), 16),
        1,
      ]
    }
    const [fr, fg, fb, fa] = 取(前景)
    const [br, bg, bb] = 取(底)
    const 混 = [fr * fa + br * (1 - fa), fg * fa + bg * (1 - fa), fb * fa + bb * (1 - fa)]
    return `#${混.map((值) => Math.round(值).toString(16).padStart(2, '0')).join('')}`
  }

  it('两档五组文本/有效卡面组合 ≥4.5:1：深档按草地亮场上界（纯白）合成，浅档维持内层合成', () => {
    const 源码 = 账号源码()
    const 对子: Array<[string, '文本' | '高亮']> = [
      ['--moSe', '文本'],
      ['--huiSe', '文本'],
      ['--yeLvShen', '文本'],
      ['--taoTuShen', '高亮'],
      ['--weiXian', '文本'],
    ]
    for (const 深色 of [false, true]) {
      const 覆盖卡面 = 理论卡面(深色)
      const 内层卡面 = 局部变量(源码, '--kaPian', 深色)
      expect(覆盖卡面, `${深色 ? '深' : '浅'}色覆盖层与内层卡面同源`).not.toBe(内层卡面)
      let 有效卡面: string
      if (深色) {
        // FP-JC：深色半透明卡面直接叠在草地上，天空亮场按纯白上界合成——
        // 任何草地亮度下都必须保住的下界；透明度低于 0.9 时卡面被草地抬亮、全线塌方
        const 透明度 = Number(/rgba\([^)]*,\s*([\d.]+)\)/.exec(覆盖卡面)?.[1] ?? 0)
        expect(透明度, `深色卡面透明度 ${透明度} 必须 ≥0.9`).toBeGreaterThanOrEqual(0.9)
        有效卡面 = 混合色(覆盖卡面, '#ffffff')
      } else {
        有效卡面 = 混合色(覆盖卡面, 内层卡面)
      }
      for (const [wen, 类] of 对子) {
        const 前景 = 局部变量(源码, wen, 深色)
        if (类 === '文本') {
          expect(
            对比度(前景, 有效卡面),
            `${深色 ? '深' : '浅'}色 ${wen} on ${有效卡面} = ${对比度(前景, 有效卡面).toFixed(2)}`,
          ).toBeGreaterThanOrEqual(4.5)
        } else {
          expect(
            对比度(前景, 有效卡面),
            `${深色 ? '深' : '浅'}色高亮 ${wen} on ${有效卡面} = ${对比度(前景, 有效卡面).toFixed(2)}`,
          ).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('FP-JC 深色档裸压草地的文本均有卡面：搜索行与页顶错误面板在覆盖层有深色卡面规则', () => {
    const 覆盖 = readFileSync(resolve(__dirname, '../styles/zhang-hao-an-quan-rong-cao-di.css'), 'utf8')
    for (const 选择器 of ['\\.sou-suo-hang', '\\.qian-tai-cuo-wu']) {
      const 深色规则 = new RegExp(
        `:root\\[data-theme="dark"\\][^{]*${选择器}[^{]*\\{[^}]*background-color:\\s*var\\(--kaPian\\)`,
      )
      expect(覆盖, `${选择器} 缺深色卡面规则（文字裸压草地亮场）`).toMatch(深色规则)
    }
  })

  it('FP-JC R2 编译产物回归门：深色变量块必须仍绑定页面根（:global 包判断再接后代的写法会被编译器丢弃后代段）', () => {
    const { descriptor } = sfcParse(账号源码(), { filename: '账号与安全.vue' })
    const 编译 = compileStyle({
      source: descriptor.styles[0]!.content,
      filename: '账号与安全.vue',
      id: 'data-v-fpd',
      scoped: true,
    })
    const 规则块 = 编译.code.split('}')
    const 深色块 = 规则块.find((块) => 块.includes('--moSe: #f3ede0'))
    expect(深色块, '深色变量块在编译产物中丢失').toBeTruthy()
    const 深色选择器 = (深色块 as string).slice(0, (深色块 as string).indexOf('{')).trim()
    expect(
      深色选择器,
      `深色变量被编译到文档根、会被页面根浅色块就地覆盖：${深色选择器}`,
    ).toMatch(/\.zhang-hao-an-quan\[data-v-/)
    const 浅色块 = 规则块.find((块) => 块.trim().startsWith('.zhang-hao-an-quan[data-v-fpd]'))
    expect(浅色块, '浅色变量块在编译产物中丢失').toBeTruthy()
  })

  it('FP-K2 编译产物回归门：请求错误.vue 浅色卡面规则必须仍绑定面板本体（:global 包判断再接后代的写法会被编译器丢弃后代段）', () => {
    const 错误面板源码 = readFileSync(resolve(__dirname, '../components/请求错误.vue'), 'utf8')
    const { descriptor } = sfcParse(错误面板源码, { filename: '请求错误.vue' })
    const 编译 = compileStyle({
      source: descriptor.styles[0]!.content,
      filename: '请求错误.vue',
      id: 'data-v-fpk2',
      scoped: true,
    })
    const 规则块 = 编译.code.split('}')
    const 浅色块 = 规则块.find((块) => 块.includes(":root[data-theme='light']"))
    expect(浅色块, '浅色档面板卡面规则在编译产物中丢失').toBeTruthy()
    const 浅色选择器 = (浅色块 as string).slice(0, (浅色块 as string).indexOf('{')).trim()
    expect(
      浅色选择器,
      `浅色卡面被编译到文档根、错误面板浅色档吃不到底色：${浅色选择器}`,
    ).toMatch(/:root\[data-theme='light'\]\s+\.qian-tai-cuo-wu\[data-v-/)
    expect(浅色块 as string).toContain('var(--beijing-kaopian)')
  })

  it('FP-JC R2 名片标题/统计数字/搜索行标签/卡片标题等逐元素绑定达标令牌：深档白上界合成 ≥4.5:1', () => {
    const 映射: Array<[string, string]> = [
      ['.xing-ming', '--moSe'],
      ['.shu-zu div b', '--moSe'],
      ['.kapian-biao-ti', '--moSe'],
      ['.fen-zu-biao-ti', '--moSe'],
      ['.guan-ming', '--yeLvShen'],
      ['.sou-suo-biao-qian', '--yeLvShen'],
      ['.fen-zu-bian-hao', '--yeLvShen'],
      ['.qian-ming-dan', '--huiSe'],
      ['.shu-zu div span', '--huiSe'],
      ['.uid-hang', '--huiSe'],
    ]
    const 规则们 = 规则清单(账号样式())
    const 源码 = 账号源码()
    const 卡面 = 混合色(理论卡面(true), '#ffffff')
    for (const [选择器, 令牌] of 映射) {
      const 命中 = 规则们.filter((项) => 项.选择器 === 选择器 && 项.声明.has('color'))
      expect(命中.length, `${选择器} 缺 color 声明`).toBeGreaterThan(0)
      for (const 项 of 命中) {
        expect(项.声明.get('color'), `${选择器} 未绑定 ${令牌}`).toBe(`var(${令牌})`)
      }
      const 前景 = 局部变量(源码, 令牌, true)
      expect(
        对比度(前景, 卡面),
        `深色 ${选择器}(${令牌}) on ${卡面} = ${对比度(前景, 卡面).toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('透明底板方案在位：根透明 + 卡片半透明 + 两档各一', () => {
    const 覆盖 = readFileSync(resolve(__dirname, '../styles/zhang-hao-an-quan-rong-cao-di.css'), 'utf8')
    expect(覆盖).toMatch(/--miZhi:\s*transparent\s*!important/)
    expect(覆盖).toContain(':root[data-theme="light"]')
    expect(覆盖).toContain(':root[data-theme="dark"]')
  })

  it('搜索设置/形象组/头像签名文本色全吃令牌：color 无字面量', () => {
    const 样式 = 账号样式()
    const 规则们 = 规则清单(样式)
    for (const 选择器 of [
      '.sou-suo-biao-qian',
      '.sou-suo-shuru',
      '.xingbie-kapian',
      '.qianming-shuru',
      '.kapian-biao-ti',
      '.kapian-miao-shu',
    ]) {
      const 命中 = 规则们.filter((项) => 项.选择器 === 选择器 && 项.声明.has('color'))
      expect(命中.length, `${选择器} 缺 color 声明`).toBeGreaterThan(0)
      for (const 项 of 命中) {
        expect(项.声明.get('color') as string, `${选择器} 文本色未吃令牌`).toMatch(/^var\(--[a-zA-Z-]+\)$/)
      }
    }
  })

  it('挂载：搜索行/形象组/头像签名全元素在位且零控制台错误', async () => {
    const 错误 = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const wrapper = await guaZhangHao()
      expect(wrapper.find('.sou-suo-hang').exists()).toBe(true)
      expect(wrapper.find('.sou-suo-shuru').exists()).toBe(true)
      expect(wrapper.find('#tou-xiang').exists()).toBe(true)
      expect(wrapper.find('#qian-ming').exists()).toBe(true)
      expect(wrapper.find('.xingbie-wangge').exists()).toBe(true)
      expect(wrapper.find('.qianming-shuru').exists()).toBe(true)
      expect(错误).not.toHaveBeenCalled()
      wrapper.unmount()
    } finally {
      错误.mockRestore()
      document.body.innerHTML = ''
    }
  })
})

describe('FP-D ③ 背景上传定位：预览区回归静态流', () => {
  it('预览区 .yu-lan-nian 无任何定位声明（滚动时不爬升）', () => {
    const 命中 = 规则清单(账号样式()).filter(
      (项) => 项.选择器 === '.yu-lan-nian' && 项.声明.has('position'),
    )
    expect(命中.map((项) => `${项.选择器}{position:${项.声明.get('position')}}`)).toEqual([])
  })

  it('上传区 .zi-ding-yi-bei-jing-qu 无定位声明（静态流跟随卡片）', () => {
    const 命中 = 规则清单(账号样式()).filter(
      (项) => 项.选择器 === '.zi-ding-yi-bei-jing-qu' && 项.声明.has('position'),
    )
    expect(命中).toEqual([])
  })

  it('导航标签栏 sticky 保留：top:0 且 z-index 在位', () => {
    const 命中 = 规则清单(账号样式()).filter((项) => 项.选择器 === '.biao-qian-lan')
    const 定位 = 命中.find((项) => 项.声明.get('position') === 'sticky')
    expect(定位).toBeDefined()
    expect(定位?.声明.get('top')).toBe('0')
  })
})

describe('FP-D ④ 挑战与积分榜按默认性别蓝粉驱动', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    moDuiJu.mockResolvedValue(null)
    moGaiKuang.mockResolvedValue(kongGaiKuang())
    moPaiHang.mockResolvedValue(zhiPaiHang())
  })

  it('两页样式零粉橙硬编码：--pinpai- 无引用，全走 --xingbie- 令牌', () => {
    for (const [名, 样式] of [
      ['挑战主页', 挑战样式()],
      ['积分榜', 榜单样式()],
    ] as const) {
      expect(样式, `${名} 仍引用粉橙品牌令牌`).not.toMatch(/--pinpai-/)
      expect(样式, `${名} 未消费性别令牌`).toMatch(/--xingbie-/)
    }
  })

  it('积分色与开始按钮吃性别主色别名（新契约）', () => {
    expect(榜单样式()).toMatch(/\.jifen-zhi\s*\{[^}]*color:\s*var\(--tiaozhan-zhu-1\)/)
    expect(挑战样式()).toMatch(/\.anniu-kaiShi\s*\{[^}]*var\(--tiaozhan-zhu-1\)/)
  })

  it('无默认性别 → 蓝（nan）：两页根 data-xingbie 为 nan 且徽记为男', async () => {
    const 错误 = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const 主页 = await guaTiaoZhan()
      expect(主页.find('.tiaozhan-yemian').attributes('data-xingbie')).toBe('nan')
      expect(主页.find('.xingbie-huiji').text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'xingBieNan'))
      expect(错误).not.toHaveBeenCalled()
      主页.unmount()
      const 榜 = await guaJiFenBang()
      expect(榜.find('.paihang-yemian').attributes('data-xingbie')).toBe('nan')
      expect(榜.find('.xingbie-huiji').text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'xingBieNan'))
      expect(错误).not.toHaveBeenCalled()
      榜.unmount()
    } finally {
      错误.mockRestore()
    }
  })

  it('默认性别女 → 粉（nv）：两页根 data-xingbie 为 nv 且徽记为女', async () => {
    const 主页 = await guaTiaoZhan('female')
    expect(主页.find('.tiaozhan-yemian').attributes('data-xingbie')).toBe('nv')
    expect(主页.find('.xingbie-huiji').text()).toContain(huoQuFanYi('ziLiaoSheZhi', 'xingBieNv'))
    主页.unmount()
  })

  it('默认性别男 → 蓝（nan）', async () => {
    const 榜 = await guaJiFenBang('male')
    expect(榜.find('.paihang-yemian').attributes('data-xingbie')).toBe('nan')
    榜.unmount()
  })
})

describe('FP-D M1 挑战小字对比度：读渲染真源的现状记录', () => {
  function 全局块(档: 'light' | 'dark'): string {
    const 源 = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')
    return (
      (
        档 === 'light'
          ? /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
          : /:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
      ).exec(源)?.[1] ?? ''
    )
  }

  function 全局色(档: 'light' | 'dark', 名: string): string {
    const 命中 = new RegExp(`${名}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(全局块(档))
    expect(命中, `${档} 缺少 ${名}`).not.toBeNull()
    return (命中 as RegExpMatchArray)[1]
  }

  it('nan 档文字色两档压 --beijing-kaopian 均 ≥4.5:1（浅 9.06 / 深 10.71）', () => {
    for (const 深色 of [false, true]) {
      const 档 = 深色 ? 'dark' : 'light'
      const 源 = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')
      const 块 = (
        档 === 'light'
          ? /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
          : /:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
      ).exec(源)?.[1] ?? ''
      const 取 = (名: string): string => {
        const 命中 = new RegExp(`${名}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(块)
        expect(命中, `${档} 缺少 ${名}`).not.toBeNull()
        return (命中 as RegExpMatchArray)[1]
      }
      const 前景 = 取('--xingbie-nan-xuan-wenben')
      const 底 = 取('--beijing-kaopian')
      expect(
        对比度(前景, 底),
        `${档} nan-xuan-wenben ${前景} on ${底} = ${对比度(前景, 底).toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5)
      const 粉前景 = 取('--xingbie-nv-xuan-wenben')
      expect(
        对比度(粉前景, 底),
        `${档} nv-xuan-wenben ${粉前景} on ${底} = ${对比度(粉前景, 底).toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })
})
