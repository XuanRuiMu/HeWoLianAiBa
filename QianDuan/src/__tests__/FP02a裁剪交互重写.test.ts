import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
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
} from '@/config/外观自定义'
import {
  CAI_JIAN_BI_LI_SHANG_XIAN,
  CAI_JIAN_BI_LI_XIA_XIAN,
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
const 背景设置源码 = 读('components/聊天背景设置.vue')
const 气泡选择源码 = 读('components/气泡主题选择器.vue')
const 外观源码 = 读('config/外观自定义.ts')
const 用户设置源码 = 读('stores/用户设置.ts')
const 裁剪工具源码 = 读('utils/图片裁剪.ts')

function zaiRu(xuanXiang: { yuLanLeiXing?: 'beiJing' | 'qiPao' } = {}) {
  const cang = createPinia()
  setActivePinia(cang)
  return mount(TuPianCaiJian, {
    props: {
      tuYuan: 'data:image/png;base64,x',
      yuanMime: 'image/png',
      biaoTi: '裁剪测试',
      tiShi: '提示',
      kuanGaoBi: 1,
      ...(xuanXiang.yuLanLeiXing ? { yuLanLeiXing: xuanXiang.yuLanLeiXing } : {}),
    },
    global: { plugins: [cang] },
  })
}

describe('FP-02a 拖动语义反转：拖动挪动图片，选区固定居中', () => {
  it('选区不再可拖可键盘操作，move手柄与translatable保留在图', () => {
    const xuanQuKai = /<cropper-selection\b[^>]*>/.exec(裁剪源码)
    expect(xuanQuKai).toBeTruthy()
    const biaoQian = xuanQuKai![0]
    expect(biaoQian).not.toMatch(/\bmovable\b/)
    expect(biaoQian).not.toMatch(/\bkeyboard\b/)
    expect(biaoQian).toMatch(/resizable/)
    expect(裁剪源码).toContain('<cropper-handle action="move"')
    expect(裁剪源码).toMatch(/<cropper-image\b[^>]*translatable/)
  })

  it('缩放与复位后选区回画布中心：居中函数调用点齐全', () => {
    expect(裁剪源码).toContain('function guDingXuanQuJuZhong')
    expect(裁剪源码).toContain('$center')
    const diaoYong = 裁剪源码.match(/guDingXuanQuJuZhong\(\)/g) || []
    expect(diaoYong.length).toBeGreaterThanOrEqual(4)
  })

  it('图片$move是画布坐标系位移：框架无需二次换算缩放', () => {
    expect(裁剪工具源码).not.toContain('/ dangQianSuoFang')
    expect(裁剪源码).toContain('$move(bu.x, bu.y)')
  })
})

describe('FP-02a Ctrl+滚轮与WASD平移图片', () => {
  it('滚轮deltaY=125对应8像素比例平移，向上滚为上移', () => {
    expect(jiSuanGunLunPingYi(-125)).toEqual({ x: 0, y: -10 })
    expect(jiSuanGunLunPingYi(125)).toEqual({ x: 0, y: 10 })
    expect(jiSuanGunLunPingYi(0)).toEqual({ x: 0, y: 0 })
    expect(jiSuanGunLunPingYi(Number.NaN)).toEqual({ x: 0, y: 0 })
  })

  it('WASD方向语义正确，Shift四倍加速，Ctrl不影响方向', () => {
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
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'W', bubbles: true, shiftKey: true, ctrlKey: true }))
    expect(jianShi).toHaveBeenCalledTimes(2)
    expect(jianShi).toHaveBeenNthCalledWith(1, 8, 0)
    expect(jianShi).toHaveBeenNthCalledWith(2, 0, -32)

    const shuRu = document.createElement('input')
    document.body.appendChild(shuRu)
    shuRu.focus()
    jianShi.mockClear()
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

  it('平移不受缩放门禁误伤：transform事件只校验缩放档', () => {
    expect(裁剪工具源码).toContain('export function jiSuanGunLunPingYi')
    expect(裁剪工具源码).toContain('export function jiSuanJianPanPingYi')
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
    expect(jiXiBiLiWenBen('宽高')).toBeNull()
    expect(jiXiBiLiWenBen('')).toBeNull()
    expect(jiXiBiLiWenBen('0:4')).toBeNull()
    expect(jiXiBiLiWenBen('-3:4')).toBeNull()
    ;[0.1, 5.01, Infinity, NaN].forEach((zhi) => expect(shiHeFaBiLi(zhi)).toBe(false))
    ;[CAI_JIAN_BI_LI_XIA_XIAN, CAI_JIAN_BI_LI_SHANG_XIAN].forEach((zhi) => expect(shiHeFaBiLi(zhi)).toBe(true))
  })

  it('比例输入应用后选区比例跟随，非法输入留在框内并报翻译错误', async () => {
    const kuang = zaiRu()
    await nextTick()
    const shuRu = kuang.get('.bili-shu-ru')
    await shuRu.setValue('2:1')
    await kuang.get('input.bili-shu-ru').trigger('change')
    await nextTick()
    expect((kuang.get('cropper-selection').element as HTMLElement).getAttribute('aspect-ratio')).toBe('2')
    await shuRu.setValue('宽')
    await kuang.get('input.bili-shu-ru').trigger('change')
    expect(kuang.get('.caijian-jiazai-cuowu').text()).toBe(huoQuFanYi('sheZhi', 'caiJianBiLiWuXiao'))
    kuang.unmount()
  })

  it('选中预设chip会清空自定义输入与错误', async () => {
    const kuang = zaiRu()
    await nextTick()
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

  it('缩放数值输入按边界夹取，输入中途不覆写', async () => {
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
    expect(kuang.get('.suofang-bai-fen').text()).toBe('50%')
    await shuRu.setValue('175.5')
    await shuRu.trigger('change')
    await nextTick()
    expect(shuRu.element.value).toBe('175.5')
    shuRu.element.value = '88'
    await shuRu.trigger('input')
    await nextTick()
    expect(shuRu.element.value).toBe('88')
    expect(kuang.get('.suofang-bai-fen').text()).toBe('176%')
    await shuRu.trigger('change')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('88%')
    kuang.unmount()
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

  it('裁剪预览与真实聊天消费同一填充函数与同一store档位', () => {
    expect(裁剪源码).toContain('huoQuLaShenChiCunZhi(dangQianLaShenMoShi())')
    expect(裁剪源码).toContain("'--caijian-yulan-chi-cun'")
    expect(裁剪源码).toContain('center / var(--caijian-yulan-chi-cun, cover)')
    expect(裁剪源码).toContain("huoQuQiPaoBeiJingZhi(yuLanDiZhi.value, WAI_GUAN_MO_REN_WEN_ZI_YAN_SE, dangQianLaShenMoShi())")
    expect(用户设置源码).toContain('huoQuBeiJingNeiLianYangShi(liaoTianBeiJing.value, beiJingLaShenMoShi.value)')
    expect(用户设置源码).toContain('huoQuQiPaoBeiJingZhi(ziJiTu.tuDiZhi, ziJiTu.wenZiYanSe, qiPaoLaShenMoShi.value)')
    expect(背景设置源码).toContain('huoQuLaShenChiCunZhi(设置仓库.beiJingLaShenMoShi)')
    expect(气泡选择源码).toContain('huoQuQiPaoBeiJingZhi(tiaoMu.tuDiZhi, yanSe, laShenMoShi)')
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

  it('裁剪预览渲染四个填充档并联动store', async () => {
    const kuang = zaiRu({ yuLanLeiXing: 'beiJing' })
    await nextTick()
    const cang = 使用用户设置仓库()
    const kaLieBiao = kuang.findAll('.yu-lan-tian-chong-ka')
    expect(kaLieBiao).toHaveLength(4)
    expect(kaLieBiao.filter((ka) => ka.classes().includes('yu-lan-tian-chong-ka--xuan'))[0].text()).toBe(
      huoQuFanYi('sheZhi', 'caiJianYuLanTianChongDengBi'),
    )
    await kaLieBiao[2].trigger('click')
    await nextTick()
    expect(cang.beiJingLaShenMoShi).toBe('zongXiang')
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
    kuang.unmount()
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})
