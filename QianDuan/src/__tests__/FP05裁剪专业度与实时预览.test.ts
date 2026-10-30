import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import TuPianCaiJian from '@/components/图片裁剪.vue'
import * as CaiJianGongJu from '@/utils/图片裁剪'
import { huoQuFanYi } from '@/config/翻译表'
import {
  huoQuQiPaoBeiJingZhi,
  type WaiGuanTiaoMu,
} from '@/config/外观自定义'
import { 使用用户设置仓库 } from '@/stores/用户设置'

const { jiSuanJuZhenSuoFang } = CaiJianGongJu

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')
const 裁剪源码 = 读('components/图片裁剪.vue')
const 背景源码 = 读('components/聊天背景设置.vue')
const 气泡源码 = 读('components/气泡主题选择器.vue')
const 填充选择源码 = 读('components/外观填充选择器.vue')

const MEI_TI_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)

function zaoTiaoMu(wenZiYanSe: string): WaiGuanTiaoMu {
  return {
    id: 'qipao-1',
    mingCheng: '自定义气泡1',
    tuDiZhi: MEI_TI_URL,
    wenZiYanSe,
  }
}

interface GuaZaiXuanXiang {
  kuanGaoBi?: number
  yuLanLeiXing?: 'beiJing' | 'qiPao'
  yuLanCeZhong?: 'ziJi' | 'ai'
}

function zaiRu(xuanXiang: GuaZaiXuanXiang = {}) {
  const { kuanGaoBi = 1, yuLanLeiXing, yuLanCeZhong } = xuanXiang
  const cang = createPinia()
  setActivePinia(cang)
  return mount(TuPianCaiJian, {
    props: {
      tuYuan: 'data:image/png;base64,x',
      yuanMime: 'image/png',
      biaoTi: '裁剪测试',
      tiShi: '提示',
      kuanGaoBi,
      ...(yuLanLeiXing ? { yuLanLeiXing } : {}),
      ...(yuLanCeZhong ? { yuLanCeZhong } : {}),
    },
    global: { plugins: [cang] },
  })
}

function faSong(kuang: ReturnType<typeof mount>, xuanZeQi: string, leiXing: string, xiJie: Record<string, number>): boolean {
  const yuanSu = kuang.find(xuanZeQi).element as HTMLElement
  const shiJian = new CustomEvent(leiXing, { detail: xiJie, cancelable: true, bubbles: true })
  yuanSu.dispatchEvent(shiJian)
  return shiJian.defaultPrevented
}

async function dengDaiJiuXu(): Promise<void> {
  await nextTick()
  await new Promise<void>((jieJue) => requestAnimationFrame(() => jieJue()))
  await nextTick()
}

function moNiBuJu(kuang: ReturnType<typeof mount>, kuan = 200, gao = 200, yuanKuan = 400, yuanGao = 400): void {
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

describe('FP-05 缩放反向放大根因修复', () => {
  it('矩阵缩放读数取主模长：旋转翻转后读数不塌缩', () => {
    expect(jiSuanJuZhenSuoFang([1, 0, 0, 1, 0, 0])).toBe(1)
    expect(jiSuanJuZhenSuoFang([0, 2, -2, 0, 10, 5])).toBe(2)
    expect(jiSuanJuZhenSuoFang([-1.5, 0, 0, 1.5, 0, 0])).toBe(1.5)
    expect(jiSuanJuZhenSuoFang([Math.SQRT1_2, Math.SQRT1_2, -Math.SQRT1_2, Math.SQRT1_2, 0, 0])).toBeCloseTo(1, 6)
    expect(jiSuanJuZhenSuoFang([0, 0, 0, 0, 0, 0])).toBe(0.01)
  })

  it('滑条向缩小方向拖动按目标比例精确缩小，不再反向放大', async () => {
    const kuang = zaiRu({ kuanGaoBi: 2 })
    await nextTick()
    const huaTiao = kuang.get('.suofang-huatiao')
    await huaTiao.setValue('200')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('200%')
    await huaTiao.setValue('150')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('150%')
    await huaTiao.setValue('60')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('60%')
    await huaTiao.setValue('200')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('200%')
    kuang.unmount()
  })

  it('缩放上下限1%到400%：滑条可缩到1%，越界被夹回边界', async () => {
    const kuang = zaiRu({ kuanGaoBi: 1 })
    await nextTick()
    const huaTiao = kuang.get('.suofang-huatiao')
    await huaTiao.setValue('15')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('15%')
    await huaTiao.setValue('1')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('1%')
    await huaTiao.setValue('0.4')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('1%')
    await huaTiao.setValue('999')
    await nextTick()
    expect(kuang.get('.suofang-bai-fen').text()).toBe('400%')
    kuang.unmount()
  })

  it('滚轮与双指手势的transform事件越界被回绝，界内放行', async () => {
    const kuang = zaiRu({ kuanGaoBi: 1 })
    moNiBuJu(kuang)
    await dengDaiJiuXu()
    expect(faSong(kuang, 'cropper-image', 'transform', { matrix: [99, 0, 0, 99, 0, 0], oldMatrix: [1, 0, 0, 1, 0, 0] })).toBe(true)
    expect(faSong(kuang, 'cropper-image', 'transform', { matrix: [0.001, 0, 0, 0.001, 0, 0], oldMatrix: [1, 0, 0, 1, 0, 0] })).toBe(true)
    expect(faSong(kuang, 'cropper-image', 'transform', { matrix: [0.005, 0, 0, 0.005, 0, 0], oldMatrix: [1, 0, 0, 1, 0, 0] })).toBe(false)
    expect(faSong(kuang, 'cropper-image', 'transform', { matrix: [1, 0, 0, 1, 0, 0], oldMatrix: [1, 0, 0, 1, 0, 0] })).toBe(false)
    expect(faSong(kuang, 'cropper-image', 'transform', { matrix: [2, 0, 0, 2, 0, 0], oldMatrix: [1, 0, 0, 1, 0, 0] })).toBe(false)
    kuang.unmount()
  })
})

describe('FP-05 固定帧不依赖选区尺寸', () => {
  it('固定帧不依赖选区尺寸', () => {
    expect(裁剪源码).not.toContain('XUAN_QU_ZUI_XIAO_BIAN')
    expect(裁剪源码).not.toContain('caiJianXuanQuTaiXiao')
    expect(裁剪源码).not.toContain('xuanQu.width <')
    expect(裁剪源码).not.toContain('xuanQu.height <')
    expect(裁剪源码).toContain('huaBu.$toCanvas')
    expect(裁剪源码).toContain('daoChuCaiJianWenJian(huaBu')
  })

  it('窄屏缩放行不横向溢出：滑条可收缩且读数值不被裁切', () => {
    expect(裁剪源码).toMatch(/\.suofang-huatiao\s*\{[^}]*min-width:\s*0/)
    expect(裁剪源码).toMatch(/\.suofang-huatiao\s*\{[^}]*flex:\s*1/)
    expect(裁剪源码).toContain('.suofang-bai-fen')
  })
})

describe('FP-05 比例锁定切换', () => {
  it('默认锁定场景比例，四个chips，自定义比例可切换且不存在自由档', async () => {
    const kuang = zaiRu({ kuanGaoBi: 2 })
    await nextTick()
    const xuanQu = kuang.get('cropper-selection').element as HTMLElement
    expect(xuanQu.getAttribute('aspect-ratio')).toBe('2')
    const kaLieBiao = kuang.findAll('.bili-ka')
    expect(kaLieBiao).toHaveLength(4)
    expect(裁剪源码).not.toContain('caiJianBiLiZiYou')
    expect(kaLieBiao.filter((ka) => ka.classes().includes('bili-ka--xuan'))).toHaveLength(1)
    expect(kaLieBiao.filter((ka) => ka.classes().includes('bili-ka--xuan'))[0].text()).toBe('2:1')
    await kaLieBiao[0].trigger('click')
    await nextTick()
    expect(xuanQu.getAttribute('aspect-ratio')).toBe('1')
    await kaLieBiao[1].trigger('click')
    await nextTick()
    expect(xuanQu.getAttribute('aspect-ratio')).toBe('0.75')
    kuang.unmount()
  })

  it('背景场景默认锁定3:4', async () => {
    const kuang = zaiRu({ kuanGaoBi: 0.75 })
    await nextTick()
    const kaLieBiao = kuang.findAll('.bili-ka')
    expect(kaLieBiao.filter((ka) => ka.classes().includes('bili-ka--xuan'))[0].text()).toBe('3:4')
    kuang.unmount()
  })
})

describe('FP-05 裁剪底部实时聊天预览', () => {
  it('背景裁剪渲染聊天同源预览面板，头像裁剪不渲染', async () => {
    const beiJingKuang = zaiRu({ kuanGaoBi: 0.75, yuLanLeiXing: 'beiJing' })
    await nextTick()
    await nextTick()
    expect(beiJingKuang.find('.caijian-yulan--beiJing').exists()).toBe(true)
    expect(beiJingKuang.find('.liao-tian-mian-ban').exists()).toBe(true)
    expect(beiJingKuang.find('.qipao-neirong').exists()).toBe(true)
    expect(beiJingKuang.get('.caijian-yulan .yu-lan-biao-ti').text()).toBe(huoQuFanYi('sheZhi', 'caiJianYuLanBeiJing'))
    beiJingKuang.unmount()

    const touXiangKuang = zaiRu({ kuanGaoBi: 1 })
    await nextTick()
    await nextTick()
    expect(touXiangKuang.find('.caijian-yulan').exists()).toBe(false)
    touXiangKuang.unmount()
  })

  it('气泡裁剪渲染气泡效果预览且样式覆盖指向气泡容器', async () => {
    const qiPaoKuang = zaiRu({ kuanGaoBi: 2, yuLanLeiXing: 'qiPao' })
    await nextTick()
    await nextTick()
    expect(qiPaoKuang.find('.caijian-yulan--qiPao').exists()).toBe(true)
    expect(qiPaoKuang.get('.caijian-yulan .yu-lan-biao-ti').text()).toBe(huoQuFanYi('sheZhi', 'caiJianYuLanQiPao'))
    qiPaoKuang.unmount()
  })

  it('气泡预览蒙层与尾巴同用裁剪结果背景：不采样、不异步补色', async () => {
    const kuang = zaiRu({ kuanGaoBi: 2, yuLanLeiXing: 'qiPao', yuLanCeZhong: 'ziJi' })
    await nextTick()
    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: [],
      qiPao: [zaoTiaoMu('#FF0000')],
      beiJingFuGai: {},
      qiPaoFuGai: {},
      dangQianQiPao: { ziJi: 'qipao-1', ai: '' },
    }
    await nextTick()
    const huaBu = kuang.find('cropper-canvas').element as unknown as {
      $toCanvas: () => Promise<HTMLCanvasElement>
    }
    vi.spyOn(huaBu, '$toCanvas').mockResolvedValue({
      toDataURL: () => 'data:image/png;base64,AA',
    } as HTMLCanvasElement)
    const tuXiang = kuang.find('cropper-image').element as HTMLElement
    tuXiang.dispatchEvent(
      new CustomEvent('transform', {
        detail: { matrix: [0.5, 0, 0, 0.5, 0, 0], oldMatrix: [0.5, 0, 0, 0.5, 0, 0] },
        cancelable: true,
        bubbles: true,
      }),
    )
    await vi.waitFor(() => {
      const yuLan = kuang.get('.caijian-yulan').element as HTMLElement
      expect(yuLan.style.getPropertyValue('--caijian-yulan-fu-gai')).toBe(
        huoQuQiPaoBeiJingZhi('data:image/png;base64,AA', '#FF0000', cang.qiPaoLaShenMoShi),
      )
    })
    const yuLan = kuang.get('.caijian-yulan').element as HTMLElement
    expect(yuLan.style.getPropertyValue('--caijian-yulan-wei-ba')).toBe('')
    expect(裁剪源码).toContain('--qipao-weiba-tian-chong: var(--caijian-yulan-fu-gai) !important')
    expect(裁剪源码).not.toContain('caiJiBianYuanYanSe')
    kuang.unmount()
  })

  it('容器契约：背景传beiJing、气泡传qiPao，组件声明yuLanLeiXing', () => {
    expect(背景源码).toContain('yu-lan-lei-xing="beiJing"')
    expect(气泡源码).toContain('yu-lan-lei-xing="qiPao"')
    expect(裁剪源码).toContain("yuLanLeiXing?: 'beiJing' | 'qiPao'")
    expect(裁剪源码).toContain("import LiaoTianYuLan from '@/components/聊天/聊天预览.vue'")
    expect(裁剪源码).toContain('<LiaoTianYuLan')
  })
})

describe('FP-05 专业控件文案走翻译表', () => {
  it('比例与预览键全部存在且为中文文案', () => {
    expect(huoQuFanYi('sheZhi', 'caiJianBiLiZu')).toBe('裁剪比例')
    expect(huoQuFanYi('sheZhi', 'caiJianBiLiZiYou')).toBe('自由')
    expect(huoQuFanYi('sheZhi', 'caiJianBiLiYiBiYi')).toBe('1:1')
    expect(huoQuFanYi('sheZhi', 'caiJianBiLiSanBiSi')).toBe('3:4')
    expect(huoQuFanYi('sheZhi', 'caiJianBiLiErBiYi')).toBe('2:1')
    expect(huoQuFanYi('sheZhi', 'caiJianBiLiShiLiuBiJiu')).toBe('16:9')
    expect(huoQuFanYi('sheZhi', 'caiJianXuanQuTaiXiao')).toContain('裁剪区域太小')
    expect(huoQuFanYi('sheZhi', 'caiJianYuLanBeiJing')).toBe('背景效果预览')
    expect(huoQuFanYi('sheZhi', 'caiJianYuLanQiPao')).toBe('气泡效果预览')
    expect(裁剪源码).toContain("huoQuFanYi('sheZhi', 'caiJianBiLiZu')")
    expect(裁剪源码).not.toMatch(/>\s*(自由|1:1|3:4|2:1|16:9)\s*</)
  })

  it('选区合法时确认真实导出并上抛文件，生成中按钮禁用', async () => {
    const kuang = zaiRu({ kuanGaoBi: 1 })
    await nextTick()
    const daoChuWenJian = new File([new Blob(['x'])], 'tupian.png', { type: 'image/png' })
    const jianShi = vi.spyOn(CaiJianGongJu, 'daoChuCaiJianWenJian').mockResolvedValue(daoChuWenJian)
    await kuang.get('.anniu-que-ren').trigger('click')
    await nextTick()
    expect(jianShi).toHaveBeenCalledTimes(1)
    expect(jianShi.mock.calls[0][3]).toBeGreaterThan(0)
    expect(kuang.emitted('que-ren')![0][0]).toBe(daoChuWenJian)
    expect(kuang.find('.caijian-jiazai-cuowu').exists()).toBe(false)
    kuang.unmount()
  })

  it('生成进行中重复点击被拦截且按钮禁用', async () => {
    const kuang = zaiRu({ kuanGaoBi: 1 })
    await nextTick()
    let fangXing: (() => void) | null = null
    const zha = new Promise<File>((jieJue) => {
      fangXing = () => jieJue(new File([new Blob(['x'])], 'tupian.png', { type: 'image/png' }))
    })
    vi.spyOn(CaiJianGongJu, 'daoChuCaiJianWenJian').mockReturnValue(zha)
    const dianJi = kuang.get('.anniu-que-ren').trigger('click')
    await nextTick()
    expect((kuang.get('.anniu-que-ren').element as HTMLButtonElement).disabled).toBe(true)
    await kuang.get('.anniu-que-ren').trigger('click')
    fangXing!()
    await dianJi
    expect(kuang.emitted('que-ren')).toHaveLength(1)
    kuang.unmount()
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})
