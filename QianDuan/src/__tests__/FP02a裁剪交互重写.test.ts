import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import QueRenDuiHuaKuang from '@/components/确认对话框.vue'
import TuPianCaiJian from '@/components/图片裁剪.vue'
import { huoQuBeiJingNeiLianYangShi, 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuFanYi } from '@/config/翻译表'
import {
  huoQuLaShenChiCunZhi,
  huoQuQiPaoBeiJingZhi,
  type WaiGuanLaShenMoShi,
  type WaiGuanTiaoMu,
} from '@/config/外观自定义'
import {
  CaiJianBiLiShangXian,
  CaiJianBiLiXiaXian,
  guiYiGunLunZengLiang,
  jiSuanDaoChuKuan,
  jiSuanGunLunPingYi,
  jiSuanJianPanPingYi,
  jiXiBiLiWenBen,
  shiHeFaBiLi,
} from '@/utils/图片裁剪'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')
const 裁剪源码 = 读('components/图片裁剪.vue')
const 浮层源码 = 读('components/浮层对话框.vue')
const 上传说明源码 = 读('components/上传说明层.vue')
const 外观源码 = 读('config/外观自定义.ts')
const 裁剪工具源码 = 读('utils/图片裁剪.ts')

const MeiTiUrl = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)

function zaoTiaoMu(xuHao: number): WaiGuanTiaoMu {
  return {
    id: 'qipao-' + xuHao,
    mingCheng: '自定义气泡' + xuHao,
    tuDiZhi: MeiTiUrl,
    wenZiYanSe: '#FFFFFF',
  }
}

function zaiRu(xuanXiang: { kuanGaoBi?: number; yuLanLeiXing?: 'beiJing' | 'qiPao' } = {}) {
  const cang = createPinia()
  setActivePinia(cang)
  const { kuanGaoBi = 1, yuLanLeiXing } = xuanXiang
  return mount(TuPianCaiJian, {
    props: {
      tuYuan: 'data:image/png;base64,x',
      yuanMime: 'image/png',
      biaoTi: '裁剪测试',
      tiShi: '提示',
      kuanGaoBi,
      ...(yuLanLeiXing ? { yuLanLeiXing } : {}),
    },
    global: { plugins: [cang] },
  })
}

async function dengDaiJiuXu(): Promise<void> {
  await nextTick()
  await new Promise<void>((jieJue) => requestAnimationFrame(() => jieJue()))
  await nextTick()
}

function moNiBuJu(kuang: VueWrapper, kuan = 200, gao = 200, yuanKuan = 400, yuanGao = 400): void {
  const huaBu = kuang.get('.caijian-huabu').element as HTMLElement
  vi.spyOn(huaBu, 'getBoundingClientRect').mockReturnValue({
    width: kuan,
    height: gao,
    top: 0,
    left: 0,
    right: kuan,
    bottom: gao,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
  const tuXiang = kuang.get('cropper-image').element as unknown as { $image: HTMLImageElement }
  Object.defineProperty(tuXiang.$image, 'naturalWidth', { value: yuanKuan, configurable: true })
  Object.defineProperty(tuXiang.$image, 'naturalHeight', { value: yuanGao, configurable: true })
}

function faSongZhiZhen(yuanSu: Element, leiXing: string, x: number, y: number, zhiZhenHao = 1): void {
  yuanSu.dispatchEvent(
    new PointerEvent(leiXing, {
      pointerId: zhiZhenHao,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    }),
  )
}

describe('FP-02a 固定裁剪框：拖动挪图，框不可拖不可缩放', () => {
  it('选区不再可拖可缩放，无手柄，图片cover铺满且达100%时不许露边', () => {
    const xuanQuKai = /<cropper-selection\b[^>]*>/.exec(裁剪源码)
    expect(xuanQuKai).toBeTruthy()
    const biaoQian = xuanQuKai![0]
    expect(biaoQian).not.toMatch(/\bmovable\b/)
    expect(biaoQian).not.toMatch(/\bresizable\b/)
    expect(biaoQian).not.toMatch(/\bkeyboard\b/)
    expect(裁剪源码).not.toMatch(/<cropper-handle\b/)
    expect(裁剪源码).not.toContain('action="move"')
    expect(裁剪源码).not.toContain('max-inset="0"')
    expect(裁剪源码).toContain('function juZhengJuZhen')
    expect(裁剪源码).toContain('function pingYi')
    expect(裁剪源码).toContain('initial-fit="cover"')
    expect(裁剪源码).toMatch(/<cropper-image\b[^>]*translatable/)
  })

  it('选区恒等于画布目标帧，比例变化后同步且不改变图片位置来源', async () => {
    const kuang = zaiRu({ kuanGaoBi: 0.75 })
    moNiBuJu(kuang, 195, 260)
    await dengDaiJiuXu()
    const xuanQu = kuang.get('cropper-selection').element as unknown as {
      x: number
      y: number
      width: number
      height: number
    }
    expect(xuanQu.x).toBe(0)
    expect(xuanQu.y).toBe(0)
    expect(xuanQu.width).toBe(195)
    expect(xuanQu.height).toBe(260)
    expect((kuang.get('cropper-selection').element as HTMLElement).getAttribute('aspect-ratio')).toBe('0.75')
    const tuXiang = kuang.get('cropper-image').element as unknown as { $getTransform: () => number[] }
    const juZhen = tuXiang.$getTransform()
    expect(juZhen[0]).toBeCloseTo(260 / 400, 6)
    expect(juZhen[3]).toBeCloseTo(260 / 400, 6)
    kuang.unmount()
  })

  it('在画布拖动只移动图片，裁剪框几何不变，松手不回中', async () => {
    const kuang = zaiRu()
    moNiBuJu(kuang)
    await dengDaiJiuXu()
    const huaBu = kuang.get('cropper-canvas').element
    const xuanQu = kuang.get('cropper-selection').element as unknown as {
      x: number
      y: number
      width: number
      height: number
      $center: () => void
    }
    const tuXiang = kuang.get('cropper-image').element as unknown as {
      $move: (x: number, y: number) => number
      $getTransform: () => number[]
    }
    const yiDongQian = [...tuXiang.$getTransform()]
    const centerJianShi = vi.spyOn(xuanQu, '$center')
    faSongZhiZhen(huaBu, 'pointerdown', 60, 60)
    faSongZhiZhen(huaBu, 'pointermove', 90, 80)
    faSongZhiZhen(huaBu, 'pointerup', 90, 80)
    await nextTick()
    const yiDongHou = tuXiang.$getTransform()
    expect(yiDongHou[4]).toBeGreaterThan(yiDongQian[4])
    expect(yiDongHou[5]).toBeGreaterThan(yiDongQian[5])
    expect(xuanQu.x).toBe(0)
    expect(xuanQu.y).toBe(0)
    expect(xuanQu.width).toBe(200)
    expect(xuanQu.height).toBe(200)
    expect(centerJianShi).not.toHaveBeenCalled()
    expect(裁剪源码).not.toContain('$center')
    kuang.unmount()
  })

  it('双指手势开始时停止单指拖图，避免与缩放抢手势', async () => {
    const kuang = zaiRu()
    moNiBuJu(kuang)
    await dengDaiJiuXu()
    const huaBu = kuang.get('cropper-canvas').element
    const tuXiang = kuang.get('cropper-image').element as unknown as {
      $move: (x: number, y: number) => number
      $getTransform: () => number[]
    }
    const jianShi = vi.spyOn(tuXiang, '$move')
    faSongZhiZhen(huaBu, 'pointerdown', 40, 40)
    faSongZhiZhen(huaBu, 'pointerdown', 120, 120, 2)
    jianShi.mockClear()
    faSongZhiZhen(huaBu, 'pointermove', 130, 130)
    expect(jianShi).not.toHaveBeenCalled()
    kuang.unmount()
  })
})

describe('FP-02a Ctrl+滚轮与WASD平移图片', () => {
  it('滚轮deltaY=125对应8像素比例平移，向上滚为上移并限制单次步长', () => {
    expect(jiSuanGunLunPingYi(-125)).toEqual({ x: 0, y: -10 })
    expect(jiSuanGunLunPingYi(125)).toEqual({ x: 0, y: 10 })
    expect(jiSuanGunLunPingYi(0)).toEqual({ x: 0, y: 0 })
    expect(jiSuanGunLunPingYi(Number.NaN)).toEqual({ x: 0, y: 0 })
    expect(jiSuanGunLunPingYi(10000)).toEqual({ x: 0, y: 80 })
    expect(guiYiGunLunZengLiang(3, 1)).toBe(48)
    expect(guiYiGunLunZengLiang(2, 2)).toBe(200)
    expect(guiYiGunLunZengLiang(12, 0)).toBe(12)
  })

  it('WASD方向语义正确，Shift四倍加速，Ctrl不劫持', () => {
    expect(jiSuanJianPanPingYi('w')).toEqual({ x: 0, y: -8 })
    expect(jiSuanJianPanPingYi('A')).toEqual({ x: -8, y: 0 })
    expect(jiSuanJianPanPingYi('S')).toEqual({ x: 0, y: 8 })
    expect(jiSuanJianPanPingYi('D')).toEqual({ x: 8, y: 0 })
    expect(jiSuanJianPanPingYi('W', true)).toEqual({ x: 0, y: -32 })
    expect(jiSuanJianPanPingYi('d', true)).toEqual({ x: 32, y: 0 })
    expect(jiSuanJianPanPingYi('x')).toEqual({ x: 0, y: 0 })
  })

  it('WASD按下即平移图片且被吞掉，输入框聚焦时跳过', async () => {
    const kuang = zaiRu()
    await nextTick()
    const tu = kuang.find('cropper-image').element as unknown as { $move: (x: number, y: number) => number }
    const jianShi = vi.spyOn(tu, '$move')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'W', bubbles: true, shiftKey: true }))
    expect(jianShi).toHaveBeenCalledTimes(2)
    expect(jianShi).toHaveBeenNthCalledWith(1, 8, 0)
    expect(jianShi).toHaveBeenNthCalledWith(2, 0, -32)

    jianShi.mockClear()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true, ctrlKey: true }))
    expect(jianShi).not.toHaveBeenCalled()

    const shuRu = document.createElement('input')
    document.body.appendChild(shuRu)
    shuRu.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }))
    expect(jianShi).not.toHaveBeenCalled()
    shuRu.blur()
    shuRu.remove()
    kuang.unmount()
  })

  it('Ctrl+滚轮在cropper的wheel处理前截获并平移图片', async () => {
    const kuang = zaiRu()
    await nextTick()
    const tu = kuang.find('cropper-image').element as unknown as { $move: (x: number, y: number) => number }
    const jianShi = vi.spyOn(tu, '$move')
    const shiJian = new WheelEvent('wheel', { ctrlKey: true, deltaY: -125, bubbles: true, cancelable: true })
    document.dispatchEvent(shiJian)
    await nextTick()
    expect(jianShi).toHaveBeenCalledWith(0, -10)
    kuang.unmount()
  })

  it('普通滚轮改为可控缩放并吞掉页面滚动，不触发平移', async () => {
    const kuang = zaiRu()
    await nextTick()
    const huaBu = kuang.get('.caijian-huabu').element
    const tu = kuang.find('cropper-image').element as unknown as { $move: (x: number, y: number) => number }
    const yiDong = vi.spyOn(tu, '$move')
    const shiJian = new WheelEvent('wheel', { deltaY: -125, bubbles: true, cancelable: true })
    huaBu.dispatchEvent(shiJian)
    await nextTick()
    expect(shiJian.defaultPrevented).toBe(true)
    expect(yiDong).not.toHaveBeenCalled()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('110%')
    kuang.unmount()
  })

  it('平移不改变缩放读数：纯位移 transform 放行，越界缩放被回绝', async () => {
    const kuang = zaiRu()
    moNiBuJu(kuang)
    await dengDaiJiuXu()
    const tu = kuang.find('cropper-image').element as HTMLElement
    const shiJian = (juZhen: number[]): CustomEvent =>
      new CustomEvent('transform', {
        detail: { matrix: juZhen, oldMatrix: [1, 0, 0, 1, 0, 0] },
        cancelable: true,
        bubbles: true,
      })
    const weiYi = shiJian([0.5, 0, 0, 0.5, 20, -10])
    tu.dispatchEvent(weiYi)
    expect(weiYi.defaultPrevented).toBe(false)
    const yueJie = shiJian([9, 0, 0, 9, 40, -25])
    tu.dispatchEvent(yueJie)
    expect(yueJie.defaultPrevented).toBe(true)
    const suoXiaoYueJie = shiJian([0.001, 0, 0, 0.001, 0, 0])
    tu.dispatchEvent(suoXiaoYueJie)
    expect(suoXiaoYueJie.defaultPrevented).toBe(true)
    const xiaXianFangXing = shiJian([0.005, 0, 0, 0.005, 0, 0])
    tu.dispatchEvent(xiaXianFangXing)
    expect(xiaXianFangXing.defaultPrevented).toBe(false)
    kuang.unmount()
  })
})

describe('FP-02a 比例与缩放自定义输入', () => {
  it('比例文本解析：冒号斜杠全角均可，纯数为宽高比，越界非法', () => {
    expect(jiXiBiLiWenBen('3:4')).toBe(0.75)
    expect(jiXiBiLiWenBen('3：4')).toBe(0.75)
    expect(jiXiBiLiWenBen('3 / 4')).toBe(0.75)
    expect(jiXiBiLiWenBen('0.75')).toBe(0.75)
    expect(jiXiBiLiWenBen('2:1')).toBe(2)
    expect(jiXiBiLiWenBen(' 4 ')).toBe(4)
    expect(jiXiBiLiWenBen('3')).toBe(3)
    expect(jiXiBiLiWenBen('3:4:5')).toBeNull()
    expect(jiXiBiLiWenBen('8:1')).toBeNu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      