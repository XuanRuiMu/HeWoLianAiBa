import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import 语音气泡 from '@/components/聊天/语音气泡.vue'
import { huoQuFanYi } from '@/config/翻译表'
import {
  ceLiangYuYinShiChang,
  geShiHuaYuYinShiChang,
  jiXuDangQianYuYin,
  shiDangQianYuYinBoFangZhong,
  tingZhiDangQianYuYin,
  use语音播放,
  yuYinKuanDuPx,
  yuYinShiChangMiao,
  zanTingDangQianYuYin,
} from '@/composables/use语音播放'
import type { 消息 } from '@/types/类型定义'

const QI_PAO_YUAN = readFileSync(resolve(__dirname, '../components/聊天/语音气泡.vue'), 'utf8')
const SHU_RU_YUAN = readFileSync(resolve(__dirname, '../components/聊天/图文输入区.vue'), 'utf8')

function zaoShiJianChi() {
  const chi = new Map<string, Set<() => void>>()
  return {
    add(leiXing: string, fn: () => void) {
      if (!chi.has(leiXing)) chi.set(leiXing, new Set())
      chi.get(leiXing)?.add(fn)
    },
    remove(leiXing: string, fn: () => void) {
      chi.get(leiXing)?.delete(fn)
    },
    fa(leiXing: string) {
      for (const fn of chi.get(leiXing) ?? []) fn()
    },
  }
}

function zaoBoFangYinPin(shiChangMiao = 10) {
  const shiJian = zaoShiJianChi()
  const yinPin = {
    duration: shiChangMiao,
    currentTime: 0,
    muted: false,
    volume: 1,
    preload: '',
    src: '',
    boFangCiShu: 0,
    addEventListener(leiXing: string, fn: () => void) {
      shiJian.add(leiXing, fn)
    },
    removeEventListener(leiXing: string, fn: () => void) {
      shiJian.remove(leiXing, fn)
    },
    fa(leiXing: string) {
      shiJian.fa(leiXing)
    },
    play() {
      yinPin.boFangCiShu += 1
      return Promise.resolve()
    },
    pause() {
      return undefined
    },
    load() {
      return undefined
    },
    removeAttribute() {
      yinPin.src = ''
    },
  }
  return yinPin
}

function zaoCeLiangYinPin() {
  const shiJian = zaoShiJianChi()
  let dangQianMiao = 0
  const yinPin = {
    duration: Infinity as number,
    preload: '',
    src: '',
    beiQiuZhi: 0,
    addEventListener(leiXing: string, fn: () => void) {
      shiJian.add(leiXing, fn)
    },
    removeEventListener(leiXing: string, fn: () => void) {
      shiJian.remove(leiXing, fn)
    },
    pause() {
      return undefined
    },
    load() {
      return undefined
    },
    removeAttribute() {
      yinPin.src = ''
    },
  }
  let dangQianDiZhi = ''
  Object.defineProperty(yinPin, 'src', {
    get: () => dangQianDiZhi,
    set: (zhi: string) => {
      dangQianDiZhi = zhi
      if (zhi === '') return
      queueMicrotask(() => shiJian.fa('loadedmetadata'))
    },
  })
  Object.defineProperty(yinPin, 'currentTime', {
    get: () => dangQianMiao,
    set: (zhi: number) => {
      yinPin.beiQiuZhi = zhi
      dangQianMiao = zhi >= 1e100 ? 10 : zhi
      if (dangQianMiao !== 10) return
      yinPin.duration = 10
      queueMicrotask(() => shiJian.fa('durationchange'))
    },
  })
  return yinPin
}

function zaoXiaoXi(buChong: Partial<消息> = {}): 消息 {
  return {
    id: 'xiao-xi-1',
    ke_hu_duan_id: 'ke-hu-duan-1',
    hui_hua_id: 'hui-hua-1',
    fa_song_zhe_id: 'yong-hu-1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '',
    lei_xing: 'yuYin',
    shi_jian_chuo: Date.now(),
    yi_du: false,
    ...buChong,
  } as 消息
}

afterEach(() => {
  tingZhiDangQianYuYin()
  vi.unstubAllGlobals()
})

describe('需求19：语音时长只有一处口径，且与真实播放一致', () => {
  it('毫秒→整秒只由 yuYinShiChangMiao 换算，宽度与文案同源', () => {
    const xiaoXi = { mei_ti_shi_chang_hao_miao: 10000 }
    expect(yuYinShiChangMiao(xiaoXi)).toBe(10)
    expect(geShiHuaYuYinShiChang(xiaoXi)).toBe('10″')
    expect(yuYinKuanDuPx(xiaoXi)).toBe(120)
  })

  it('缺时长字段时按音频真实 duration 兜底（WebM/Opus 的 Infinity 用 seek 逼出真实值）', async () => {
    const jiaYinPin = zaoCeLiangYinPin()
    vi.stubGlobal('Audio', function () {
      return jiaYinPin
    })
    const xiaoXi = { mei_ti_url: 'blob:ce-liang-wu-qiong' }
    expect(geShiHuaYuYinShiChang(xiaoXi)).toBe('…″')
    ceLiangYuYinShiChang(xiaoXi)
    await vi.waitFor(() => expect(geShiHuaYuYinShiChang(xiaoXi)).toBe('10″'))
    expect(jiaYinPin.beiQiuZhi).toBeGreaterThan(1e100)
    expect(yuYinKuanDuPx(xiaoXi)).toBe(120)
  })

  it('同一地址只测一次；测不出时不写脏值也不会反复打网络', async () => {
    let ciShu = 0
    vi.stubGlobal('Audio', function () {
      ciShu += 1
      return zaoCeLiangYinPin()
    })
    const xiaoXi = { mei_ti_url: 'blob:ce-liang-mi-deng' }
    ceLiangYuYinShiChang(xiaoXi)
    ceLiangYuYinShiChang(xiaoXi)
    await vi.waitFor(() => expect(geShiHuaYuYinShiChang(xiaoXi)).toBe('10″'))
    ceLiangYuYinShiChang(xiaoXi)
    expect(ciShu).toBe(1)
  })

  it('本地实测时长在服务端回包缺字段时保留（气泡不会掉回 1 秒）', () => {
    expect(readFileSync(resolve(__dirname, '../stores/聊天.ts'), 'utf8')).toContain(
      'mei_ti_shi_chang_hao_miao: buQiShiChangHaoMiao',
    )
  })
})

describe('需求18：暂停/停止按钮与空格键', () => {
  it('气泡内两个新增控件都是内联 SVG、读屏文案走翻译表，视觉 28px 且 ::before 外扩到 36px 热区', () => {
    const wenBen = huoQuFanYi('duoMeiTi', 'zanTingYuYin')
    expect(wenBen).toBe('暂停语音')
    expect(huoQuFanYi('duoMeiTi', 'jiXuYuYin')).toBe('继续播放语音')
    expect(huoQuFanYi('duoMeiTi', 'tingZhiYuYin')).toBe('停止语音并回到开头')
    expect((QI_PAO_YUAN.match(/class="yuyin-kongzhi"/g) ?? []).length).toBe(2)
    expect(QI_PAO_YUAN).toContain('class="yuyin-kongzhi-zu"')
    expect(QI_PAO_YUAN).toContain('width: var(--yuyin-kongzhi-chicun)')
    expect(QI_PAO_YUAN).toContain('height: var(--yuyin-kongzhi-chicun)')
    expect(QI_PAO_YUAN).toContain(
      'inset: calc((var(--yuyin-kongzhi-chicun) - var(--yuyin-kongzhi-re-ku)) / 2)',
    )
    expect(QI_PAO_YUAN).toContain('gap: var(--yuyin-kongzhi-jian-ju)')
    expect(QI_PAO_YUAN).not.toMatch(/[⏸⏹▶⏯⏪]/u)
  })

  it('组件挂载后按播放态切换暂停/继续与停止的读屏口径，且不再重复渲染第二份总时长', () => {
    const wrapper = mount(语音气泡, {
      props: {
        xiaoXi: { mei_ti_shi_chang_hao_miao: 10000 },
        boFangZhong: true,
        xuanZhong: true,
        jinDuMiao: 3,
        zongMiao: 10,
      },
    })
    const anniu = wrapper.findAll('.yuyin-kongzhi')
    expect(anniu).toHaveLength(2)
    expect(anniu[0].attributes('aria-label')).toBe('暂停语音')
    expect(anniu[1].attributes('aria-label')).toBe('停止语音并回到开头')
    expect(anniu[0].find('svg').exists()).toBe(true)
    expect(anniu[1].find('svg').exists()).toBe(true)
    expect(wrapper.find('.yuyin-shichang').text()).toBe('10″')
    expect(wrapper.find('.yuyin-jindu-wenben').exists()).toBe(false)
    wrapper.unmount()
  })

  it('暂停 → 继续 → 停止：停止立即中断并把进度归零，控制权从全局注册表摘除', () => {
    const jiaYinPin = zaoBoFangYinPin()
    vi.stubGlobal('Audio', function () {
      return jiaYinPin
    })
    const boFang = use语音播放({ huoQuDiZhi: () => 'blob:bo-fang' })
    const xiaoXi = zaoXiaoXi()
    boFang.qieHuanYuYinBoFang(xiaoXi)
    expect(shiDangQianYuYinBoFangZhong()).toBe(true)
    expect(zanTingDangQianYuYin()).toBe(true)
    expect(shiDangQianYuYinBoFangZhong()).toBe(false)
    expect(boFang.shiYuYinXuanZhong(xiaoXi)).toBe(true)
    expect(jiXuDangQianYuYin()).toBe(true)
    expect(shiDangQianYuYinBoFangZhong()).toBe(true)
    boFang.boFangJinDuMiao.value = 6
    expect(tingZhiDangQianYuYin()).toBe(true)
    expect(boFang.shiYuYinXuanZhong(xiaoXi)).toBe(false)
    expect(boFang.boFangJinDuMiao.value).toBe(0)
    expect(shiDangQianYuYinBoFangZhong()).toBe(false)
    expect(tingZhiDangQianYuYin()).toBe(false)
  })

  it('空格键暂停/继续；焦点在输入框或按钮上时不抢键', () => {
    const jiaYinPin = zaoBoFangYinPin()
    vi.stubGlobal('Audio', function () {
      return jiaYinPin
    })
    const boFang = use语音播放({ huoQuDiZhi: () => 'blob:kong-ge' })
    const xiaoXi = zaoXiaoXi({ ke_hu_duan_id: 'ke-hu-duan-2' })
    boFang.qieHuanYuYinBoFang(xiaoXi)
    expect(shiDangQianYuYinBoFangZhong()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }))
    expect(shiDangQianYuYinBoFangZhong()).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }))
    expect(shiDangQianYuYinBoFangZhong()).toBe(true)

    const shuRu = document.createElement('div')
    shuRu.setAttribute('contenteditable', 'true')
    document.body.appendChild(shuRu)
    shuRu.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))
    expect(shiDangQianYuYinBoFangZhong()).toBe(true)
    shuRu.remove()

    const anNiu = document.createElement('button')
    document.body.appendChild(anNiu)
    anNiu.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))
    expect(shiDangQianYuYinBoFangZhong()).toBe(true)
    anNiu.remove()
  })
})

describe('需求20：聊天输入框划词必须可见', () => {
  it('不再用 user-select:none 关掉选区，选中底色走主题令牌且深浅两档同一枚', () => {
    expect(SHU_RU_YUAN).not.toMatch(/user-select:\s*none/)
    expect(SHU_RU_YUAN).toMatch(
      /\.shuru-kuang::selection,\s*\.shuru-kuang \*::selection\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--jujiao-huan-yanse\) 32%, transparent\)/,
    )
  })

  it('选中态不再被「透明背景」压掉，文字色跟随继承色', () => {
    const qiDian = SHU_RU_YUAN.indexOf('::selection')
    const guiZe = SHU_RU_YUAN.slice(qiDian, SHU_RU_YUAN.indexOf('}', qiDian) + 1)
    expect(guiZe).not.toContain('background: transparent')
    expect(guiZe).toContain('color: inherit')
  })
})
