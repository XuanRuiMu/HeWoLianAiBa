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
  CAI_JIAN_BI_LI_SHANG_XIAN,
  CAI_JIAN_BI_LI_XIA_XIAN,
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

const MEI_TI_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)

function zaoTiaoMu(xuHao: number): WaiGuanTiaoMu {
  return {
    id: 'qipao-' + xuHao,
    mingCheng: '自定义气泡' + xuHao,
    tuDiZhi: MEI_TI_URL,
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
  it('选区不再可拖可缩放，无手柄，图片cover铺满且禁止露边', () => {
    const xuanQuKai = /<cropper-selection\b[^>]*>/.exec(裁剪源码)
    expect(xuanQuKai).toBeTruthy()
    const biaoQian = xuanQuKai![0]
    expect(biaoQian).not.toMatch(/\bmovable\b/)
    expect(biaoQian).not.toMatch(/\bresizable\b/)
    expect(biaoQian).not.toMatch(/\bkeyboard\b/)
    expect(裁剪源码).not.toMatch(/<cropper-handle\b/)
    expect(裁剪源码).not.toContain('action="move"')
    expect(裁剪源码).toContain('max-inset="0"')
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
    const suoXiaoYueJie = shiJian([0.1, 0, 0, 0.1, 0, 0])
    tu.dispatchEvent(suoXiaoYueJie)
    expect(suoXiaoYueJie.defaultPrevented).toBe(true)
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
    expect(jiXiBiLiWenBen('8:1')).toBeNull()
    expect(jiXiBiLiWenBen('1:8')).toBeNull()
    expect(jiXiBiLiWenBen('宽高')).toBeNull()
    expect(jiXiBiLiWenBen('')).toBeNull()
    expect(jiXiBiLiWenBen('0:4')).toBeNull()
    expect(jiXiBiLiWenBen('-3:4')).toBeNull()
    ;[0.1, 5.01, Infinity, NaN].forEach((zhi) => expect(shiHeFaBiLi(zhi)).toBe(false))
    ;[CAI_JIAN_BI_LI_XIA_XIAN, CAI_JIAN_BI_LI_SHANG_XIAN].forEach((zhi) => expect(shiHeFaBiLi(zhi)).toBe(true))
  })

  it('比例输入应用后选区与画布比例跟随，非法输入留在框内并报翻译错误', async () => {
    const kuang = zaiRu()
    await nextTick()
    const shuRu = kuang.get('.bili-shu-ru')
    await shuRu.setValue('2:1')
    await kuang.get('input.bili-shu-ru').trigger('change')
    await nextTick()
    expect((kuang.get('cropper-selection').element as HTMLElement).getAttribute('aspect-ratio')).toBe('2')
    expect((kuang.get('.caijian-huabu').element as HTMLElement).style.aspectRatio).toMatch(/^2(\s*\/\s*1)?$/)
    await shuRu.setValue('宽')
    await kuang.get('input.bili-shu-ru').trigger('change')
    expect(kuang.get('.caijian-jiazai-cuowu').text()).toBe(huoQuFanYi('sheZhi', 'caiJianBiLiWuXiao'))
    await shuRu.setValue('0.1')
    await kuang.get('input.bili-shu-ru').trigger('change')
    expect(kuang.get('.caijian-jiazai-cuowu').text()).toBe(huoQuFanYi('sheZhi', 'caiJianBiLiWuXiao'))
    kuang.unmount()
  })

  it('选中预设chip会清空自定义输入与错误，自由比例入口已删除', async () => {
    const kuang = zaiRu()
    await nextTick()
    expect(kuang.findAll('.bili-ka')).toHaveLength(4)
    const shuRu = kuang.get('.bili-shu-ru')
    await shuRu.setValue('3:4')
    await kuang.get('input.bili-shu-ru').trigger('change')
    expect((kuang.get('cropper-selection').element as HTMLElement).getAttribute('aspect-ratio')).toBe('0.75')
    await kuang.findAll('.bili-ka')[0].trigger('click')
    await nextTick()
    expect(kuang.get('.bili-shu-ru').element.value).toBe('')
    expect(kuang.find('.caijian-jiazai-cuowu').exists()).toBe(false)
    kuang.unmount()
  })

  it('缩放数值输入按100%到400%边界夹取，不放大透明边，输入中途不覆写', async () => {
    const kuang = zaiRu()
    await nextTick()
    const shuRu = kuang.get('input.suofang-shu-ru')
    await shuRu.setValue('999')
    await shuRu.trigger('change')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('400%')
    expect(shuRu.element.value).toBe('400')
    await shuRu.setValue('9')
    await shuRu.trigger('change')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('100%')
    expect(shuRu.element.value).toBe('100')
    await shuRu.setValue('175.5')
    await shuRu.trigger('change')
    await nextTick()
    expect(shuRu.element.value).toBe('175.5')
    expect(kuang.get('.suofang-bai-fen').text()).toBe('175.5%')
    shuRu.element.value = '188'
    await shuRu.trigger('input')
    await nextTick()
    expect(shuRu.element.value).toBe('188')
    expect(kuang.get('.suofang-bai-fen').text()).toBe('175.5%')
    await shuRu.trigger('change')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('188%')
    await shuRu.setValue('88')
    await shuRu.trigger('change')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('100%')
    kuang.unmount()
  })

  it('导出宽度按原图像素密度换算并封顶2048，不按屏幕选区像素导出', () => {
    expect(jiSuanDaoChuKuan(200, 0.5, 0.75, 2048)).toBe(400)
    expect(jiSuanDaoChuKuan(300, 0.1, 0.75, 2048)).toBe(1536)
    expect(jiSuanDaoChuKuan(320, 1, 1, 640)).toBe(320)
    expect(jiSuanDaoChuKuan(0, 0, 0, 2048)).toBe(1)
  })
})

describe('FP-02a 拉伸填充四模式与预览应用同源', () => {
  it('四模式映射background-size语义：等比/横向/纵向/全部', () => {
    const wangGe: Array<[WaiGuanLaShenMoShi, string]> = [
      ['dengBi', 'cover'],
      ['henXiang', '100% auto'],
      ['zongXiang', 'auto 100%'],
      ['quanBu', '100% 100%'],
    ]
    for (const [moShi, zhi] of wangGe) expect(huoQuLaShenChiCunZhi(moShi)).toBe(zhi)
  })

  it('背景内联样式与气泡值按模式产出，同函数消费', () => {
    expect(huoQuBeiJingNeiLianYangShi('https://example.com/t.png', 'henXiang').backgroundSize).toBe('100% auto')
    expect(huoQuBeiJingNeiLianYangShi('https://example.com/t.png', 'quanBu').backgroundSize).toBe('100% 100%')
    expect(huoQuQiPaoBeiJingZhi('https://example.com/t.png', '#FFFFFF', 'dengBi')).toContain('center / cover')
    expect(huoQuQiPaoBeiJingZhi('https://example.com/t.png', '#FFFFFF', 'zongXiang')).toContain('center / auto 100%')
  })

  it('真实聊天侧内联样式跟随 store 填充档位产出同参 background-size', () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    cang.shiYongLaShenMoShi('beiJing', 'henXiang')
    cang.liaoTianBeiJingQian = 'https://example.com/t.png'
    cang.liaoTianBeiJingShen = 'https://example.com/t.png'
    expect(cang.beiJingNeiLianYangShi.backgroundSize).toBe('100% auto')
    cang.shiYongLaShenMoShi('qiPao', 'quanBu')
    cang.waiGuan = {
      beiJing: [],
      qiPao: [zaoTiaoMu(1)],
      beiJingFuGai: {},
      qiPaoFuGai: {},
      dangQianQiPao: { ziJi: 'qipao-1', ai: '' },
    }
    expect(cang.qiPaoCSSBianLiang['--qipao-ziJi-beiJing']).toContain('center / 100% 100%')
  })

  it('默认档为等比铺满并持久化到本地，非法档被回退', async () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    expect(cang.beiJingLaShenMoShi).toBe('dengBi')
    expect(cang.qiPaoLaShenMoShi).toBe('dengBi')
    cang.shiYongLaShenMoShi('beiJing', 'zongXiang')
    cang.shiYongLaShenMoShi('qiPao', 'quanBu')
    expect(cang.beiJingLaShenMoShi).toBe('zongXiang')
    expect(cang.qiPaoLaShenMoShi).toBe('quanBu')
    expect(localStorage.getItem('hewolianba_beiJingLaShenMoShi')).toBe(JSON.stringify('zongXiang'))
    cang.shiYongLaShenMoShi('beiJing', 'buCunZai' as WaiGuanLaShenMoShi)
    expect(cang.beiJingLaShenMoShi).toBe('zongXiang')
  })

  it('画布宽高由场景比例统一约束：宽被压缩时高度等比跟随，不再锁死高度', () => {
    const kuang = zaiRu({ kuanGaoBi: 2 })
    const huaBu = kuang.get('.caijian-huabu').element as HTMLElement
    const duQuBiLi = (yuanSu: HTMLElement): number => Number(yuanSu.style.aspectRatio.split('/')[0].trim())
    expect(huaBu.style.width).toBe('520px')
    expect(huaBu.style.height).toBe('auto')
    expect(duQuBiLi(huaBu)).toBe(2)
    expect(huaBu.style.maxWidth).toBe('100%')
    expect(Number.parseInt(huaBu.style.width, 10) / duQuBiLi(huaBu)).toBe(260)
    kuang.unmount()

    const shuKuang = zaiRu({ kuanGaoBi: 0.75 })
    const shuHuaBu = shuKuang.get('.caijian-huabu').element as HTMLElement
    expect(shuHuaBu.style.width).toBe('195px')
    expect(duQuBiLi(shuHuaBu)).toBe(0.75)
    expect(Number.parseInt(shuHuaBu.style.width, 10) / duQuBiLi(shuHuaBu)).toBeCloseTo(260, 6)
    shuKuang.unmount()
  })

  it('裁剪预览渲染四个填充档并联动store，背景预览帧跟随裁剪比例', async () => {
    const kuang = zaiRu({ yuLanLeiXing: 'beiJing', kuanGaoBi: 0.75 })
    await nextTick()
    const cang = 使用用户设置仓库()
    const kaLieBiao = kuang.findAll('.tian-chong-ka')
    expect(kaLieBiao).toHaveLength(4)
    expect(kaLieBiao.filter((ka) => ka.classes().includes('tian-chong-ka--xuan'))[0].text()).toBe(
      huoQuFanYi('sheZhi', 'caiJianYuLanTianChongDengBi'),
    )
    await kaLieBiao[2].trigger('click')
    await nextTick()
    expect(cang.beiJingLaShenMoShi).toBe('zongXiang')
    expect(kaLieBiao[2].classes().includes('tian-chong-ka--xuan')).toBe(true)
    expect((kuang.get('.caijian-rongqi').element as HTMLElement).style.getPropertyValue('--caijian-yulan-bi-li')).toBe('0.75')
    expect(裁剪源码).toContain('aspect-ratio: var(--caijian-yulan-bi-li')
    expect(裁剪源码).toMatch(/\.caijian-rongqi\s*\{[^}]*--caijian-yulan-bi-li:\s*3\s*\/\s*4/)
    expect(裁剪源码).not.toMatch(/\.caijian-yulan\s*\{[^}]*--caijian-yulan-bi-li/)
    kuang.unmount()
  })
})

describe('FP-02a 删除"裁剪结果：实时"与确认页顶部起点', () => {
  it('两处预览头部文案键已删净且渲染链不再下传当前项拼接', () => {
    const quanBu = [裁剪源码, 外观源码].join('\n')
    expect(quanBu).not.toContain('caiJianYuLanJieGuo')
    expect(quanBu).not.toContain('caiJianYuLanShiShi')
    expect(裁剪源码).not.toContain('dang-qian-ti')
    expect(裁剪源码).not.toContain('dang-qian-ming')
    expect(huoQuFanYi('sheZhi', 'caiJianYuLanBeiJing')).toBe('背景效果预览')
  })

  it('打开确认页聚焦容器本体且preventScroll，数据入口不再data-shou-xuan', async () => {
    expect(浮层源码).toContain('kuang.value?.focus({ preventScroll: true })')
    expect(浮层源码).not.toContain('data-shou-xuan')
    expect(上传说明源码).not.toContain('data-shou-xuan')
    const cang = createPinia()
    setActivePinia(cang)
    const kuang = mount(QueRenDuiHuaKuang, {
      props: { xianShi: true, biaoTi: '确认', miaoShu: '说明', queRenWenAn: '继续', quXiaoWenAn: '暂不' },
      global: { plugins: [cang] },
      attachTo: document.body,
    })
    await nextTick()
    const kuaiZi = document.querySelector('.fu-ceng-kuang')
    expect(kuaiZi).toBeTruthy()
    expect(document.activeElement).toBe(kuaiZi)
    expect((kuaiZi as HTMLElement).scrollTop).toBe(0)
    kuang.unmount()
  })

  it('裁剪页打开即滚到顶部并聚焦弹层，不自动看向底部', async () => {
    const cang = createPinia()
    setActivePinia(cang)
    const kuang = mount(TuPianCaiJian, {
      props: { tuYuan: 'data:image/png;base64,x', yuanMime: 'image/png', biaoTi: '裁剪', tiShi: '提示' },
      global: { plugins: [cang] },
      attachTo: document.body,
    })
    await nextTick()
    await nextTick()
    const rongQi = document.querySelector('.caijian-rongqi') as HTMLElement
    expect(rongQi).toBeTruthy()
    expect(rongQi.scrollTop).toBe(0)
    expect(document.activeElement).toBe(rongQi)
    kuang.unmount()
  })
  it('图片加载失败时预览重试立即停摆且导出错误只记一次', () => {
    expect(裁剪源码).toMatch(/function anPaiYuLanChongShi\(\): void \{\n {2}if \([^\n]*tuPianJiaZaiShiBai\.value\) return/)
    expect(裁剪源码).toMatch(/function qiangZhiShuaXinYuLan\(\): void \{\n {2}if \([^\n]*tuPianJiaZaiShiBai\.value\) return/)
    expect(裁剪源码).toMatch(/async function shuaXinYuLan\(\): Promise<void> \{\n {2}if \([^\n]*tuPianJiaZaiShiBai\.value\) return/)
    expect(裁剪源码).toContain('!tuPianJiaZaiShiBai.value && !yuLanCuoWuYiJi')
    expect(裁剪源码.match(/console\.error\('裁剪预览导出失败'/g)).toHaveLength(1)
    expect(裁剪源码).toMatch(/function tuPianNeiBuJiaZai\(\): void \{\n {2}tuPianJiaZaiShiBai\.value = false\n {2}yuLanCuoWuYiJi = false/)
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  localStorage.clear()
  vi.restoreAllMocks()
})
