import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WaiGuanJiuDiBianJi from '@/components/外观就地编辑器.vue'
import LiaoTianBeiJingSheZhi from '@/components/聊天背景设置.vue'
import QiPaoZhuTiXuanZeQi from '@/components/气泡主题选择器.vue'
import {
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  guiYiWaiGuanChuCan,
  huoQuBeiJingMengCengZhi,
  huoQuQiPaoBeiJingZhi,
  shiKeYongQiPaoWenZiYanSe,
  shiKeYongWenZiYanSe,
  tiQuWaiGuanSha,
  xiaYiGeZiDingYiMing,
  type WaiGuanChuCan,
} from '@/config/外观自定义'
import { huoQuFanYi } from '@/config/翻译表'
import { chuangJianQianTaiCuoWu, tiQuCuoWuWenBen } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { TuPianChiCunCuoWu, yaSuoTuPiang } from '@/utils/图片压缩'
import { baoCunLiaoTianBeiJing, shangChuanWaiGuanTuPian, baoCunWaiGuan } from '@/api/社交'
import { 使用用户设置仓库 } from '@/stores/用户设置'

vi.mock('@/api/社交', async (yuanShi) => {
  const yuan = await (yuanShi as () => Promise<Record<string, unknown>>)()
  return {
    ...yuan,
    baoCunLiaoTianBeiJing: vi.fn(async () => undefined),
    shangChuanWaiGuanTuPian: vi.fn(async () => '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)),
    baoCunWaiGuan: vi.fn(async (shuJu: Record<string, unknown>) => {
      const zhuan = (lie: Array<Record<string, unknown>>) =>
        lie.map((xiang) => ({
          id: xiang.id,
          ming_cheng: xiang.mingCheng,
          tu_di_zhi: xiang.tuDiZhi,
          wen_zi_yan_se: xiang.wenZiYanSe,
        }))
      return {
        bei_jing: zhuan((shuJu.beiJing || []) as Array<Record<string, unknown>>),
        qi_pao: zhuan((shuJu.qiPao || []) as Array<Record<string, unknown>>),
        bei_jing_fu_gai: shuJu.beiJingFuGai || {},
        qi_pao_fu_gai: shuJu.qiPaoFuGai || {},
        dang_qian_qi_pao: shuJu.dangQianQiPao || { ziJi: '', ai: '' },
      } as WaiGuanChuCan
    }),
  }
})

const SHA_YANG_LI = 'a'.repeat(64)
const MEI_TI_URL = '/api/媒体/' + SHA_YANG_LI + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)

function zaoTuPian(leiXing = 'image/png'): File {
  return new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'yang-li.png', { type: leiXing })
}

function zhuangTaiKuang(tiaoMu: Array<Record<string, unknown>>): WaiGuanChuCan {
  return {
    bei_jing: tiaoMu.map((xiang) => ({
      id: String(xiang.id),
      ming_cheng: String(xiang.mingCheng),
      tu_di_zhi: String(xiang.tuDiZhi),
      wen_zi_yan_se: String(xiang.wenZiYanSe),
    })),
    qi_pao: [],
    bei_jing_fu_gai: {},
    qi_pao_fu_gai: {},
    dang_qian_qi_pao: { ziJi: '', ai: '' },
  }
}

describe('外观自定义命名与蒙层', () => {
  it('自定义背景名从1开始顺延，撞名取第一个空位', () => {
    expect(xiaYiGeZiDingYiMing('beiJing', [])).toBe('自定义背景1')
    expect(xiaYiGeZiDingYiMing('beiJing', ['自定义背景1'])).toBe('自定义背景2')
    expect(xiaYiGeZiDingYiMing('beiJing', ['自定义背景2'])).toBe('自定义背景1')
    expect(xiaYiGeZiDingYiMing('beiJing', ['自定义背景1', '自定义背景3'])).toBe('自定义背景2')
    expect(xiaYiGeZiDingYiMing('qiPao', ['自定义气泡1', '自定义气泡2'])).toBe('自定义气泡3')
  })

  it('白字配深蒙层、黑字配浅蒙层，蒙层令牌带透明度', () => {
    expect(huoQuBeiJingMengCengZhi('#FFFFFF')).toContain('0.72')
    expect(huoQuBeiJingMengCengZhi('#000000')).toContain('0.86')
    expect(huoQuQiPaoBeiJingZhi(MEI_TI_URL, '#FFFFFF')).toContain('0.55')
    expect(huoQuQiPaoBeiJingZhi(MEI_TI_URL, '#000000')).toContain('0.62')
  })

  it('对比度不足的文字色被拒绝，黑白两色可用', () => {
    expect(shiKeYongWenZiYanSe('#FFFFFF')).toBe(true)
    expect(shiKeYongWenZiYanSe('#000000')).toBe(true)
    expect(shiKeYongWenZiYanSe('#777777')).toBe(false)
    expect(shiKeYongQiPaoWenZiYanSe('#8B8B8B')).toBe(false)
  })

  it('出参归一保留媒体签名地址并剔除悬空当前气泡', () => {
    const chu = guiYiWaiGuanChuCan({
      bei_jing: [{ id: '1', ming_cheng: '自定义背景1', tu_di_zhi: MEI_TI_URL, wen_zi_yan_se: '#FFFFFF' }],
      qi_pao: [],
      bei_jing_fu_gai: {},
    qi_pao_fu_gai: {},
      dang_qian_qi_pao: { ziJi: 'bu-cun-zai', ai: '' },
    })
    expect(chu.beiJing).toHaveLength(1)
    expect(tiQuWaiGuanSha(chu.beiJing[0].tuDiZhi)).toBe(SHA_YANG_LI)
    expect(chu.dangQianQiPao).toEqual({ ziJi: '', ai: '' })
  })
})

describe('外观自定义报错文案', () => {
  it('后台给出的具体提示优先于通用权限文案', () => {
    const cuoWu = chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.PERMISSION_DENIED,
      retryable: false,
      httpStatus: 403,
      houTaiBaoFeng: { code: 'PERMISSION_DENIED', message: '图片安全审核暂时不可用，请重试当前操作' },
    })
    expect(tiQuCuoWuWenBen(cuoWu, '这次没有保存成功，请再试一次')).toBe('图片安全审核暂时不可用，请重试当前操作')
  })

  it('本地校验的中文提示原样上屏，非中文回退默认文案', () => {
    expect(tiQuCuoWuWenBen(new Error('这个文件不能用'), '密')).toBe('这个文件不能用')
    expect(tiQuCuoWuWenBen(new Error('Network Error'), '这次没有保存成功，请再试一次')).toBe('这次没有保存成功，请再试一次')
    expect(tiQuCuoWuWenBen(undefined, '这次没有保存成功，请再试一次')).toBe('这次没有保存成功，请再试一次')
  })
})

describe('外观图片尺寸前置校验', () => {
  it('超过最大边时抛出尺寸错误', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 12000, height: 400, close: () => undefined })),
    )
    await expect(yaSuoTuPiang(zaoTuPian(), 10000)).rejects.toBeInstanceOf(TuPianChiCunCuoWu)
    vi.unstubAllGlobals()
  })

  it('尺寸合规时照常返回可上传内容', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 480, height: 320, close: () => undefined })),
    )
    const jieGuo = await yaSuoTuPiang(zaoTuPian(), 10000)
    expect(jieGuo).toBeInstanceOf(Blob)
    vi.unstubAllGlobals()
  })
})

describe('外观上传仓库链路', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(shangChuanWaiGuanTuPian).mockClear()
    vi.mocked(baoCunWaiGuan).mockClear()
    vi.mocked(baoCunLiaoTianBeiJing).mockClear()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 480, height: 320, close: () => undefined })),
    )
  })

  it('上传成功后落库并返回自定义背景1', async () => {
    const cang = 使用用户设置仓库()
    const tiaoMu = await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    expect(tiaoMu.mingCheng).toBe('自定义背景1')
    expect(tiaoMu.wenZiYanSe).toBe(WAI_GUAN_MO_REN_WEN_ZI_YAN_SE)
    expect(shangChuanWaiGuanTuPian).toHaveBeenCalledTimes(1)
    expect(baoCunWaiGuan).toHaveBeenCalledTimes(1)
    expect(cang.waiGuan.beiJing.map((xiang) => xiang.mingCheng)).toEqual(['自定义背景1'])
  })

  it('第二张顺延为自定义背景2', async () => {
    const cang = 使用用户设置仓库()
    await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    const diEr = await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    expect(diEr.mingCheng).toBe('自定义背景2')
  })

  it('数量到上限时给出上限提示且不再发上传请求', async () => {
    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: Array.from({ length: 24 }, (_, xuHao) => ({
        id: String(xuHao),
        mingCheng: '自定义背景' + String(xuHao + 1),
        tuDiZhi: MEI_TI_URL,
        wenZiYanSe: '#FFFFFF',
      })),
      qiPao: [],
      beiJingFuGai: {},
      dangQianQiPao: { ziJi: '', ai: '' },
    }
    await expect(cang.shangChuanWaiGuan('beiJing', zaoTuPian())).rejects.toThrow(
      huoQuFanYi('sheZhi', 'waiGuanTiaoMuTaiDuo'),
    )
    expect(shangChuanWaiGuanTuPian).not.toHaveBeenCalled()
  })

  it('非图片文件在本地即被拦下', async () => {
    const cang = 使用用户设置仓库()
    const wenJian = new File([new Uint8Array([1])], 'a.txt', { type: 'text/plain' })
    await expect(cang.shangChuanWaiGuan('beiJing', wenJian)).rejects.toThrow(
      huoQuFanYi('sheZhi', 'waiGuanTuPianFeiFa'),
    )
    expect(shangChuanWaiGuanTuPian).not.toHaveBeenCalled()
  })

  it('还原默认取第一个空位，删除后当前背景回默认', async () => {
    const cang = 使用用户设置仓库()
    const yi = await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    await cang.gengXinWaiGuanTiaoMu('beiJing', yi.id, { mingCheng: '海边', wenZiYanSe: '#FFFFFF' })
    await cang.huanYuanWaiGuan('beiJing', yi.id)
    expect(cang.waiGuan.beiJing.find((xiang) => xiang.id === yi.id)?.mingCheng).toBe('自定义背景1')
    await cang.shanChuWaiGuan('beiJing', yi.id)
    expect(cang.waiGuan.beiJing).toHaveLength(1)
  })

  it('删除正在使用的背景时切回默认背景', async () => {
    const cang = 使用用户设置仓库()
    const yi = await cang.shangChuanWaiGuan('beiJing', zaoTuPian())
    cang.liaoTianBeiJingQian = yi.tuDiZhi
    cang.liaoTianBeiJingShen = yi.tuDiZhi
    await cang.shanChuWaiGuan('beiJing', yi.id)
    expect(cang.liaoTianBeiJingQian).toBe('moRen')
    expect(cang.liaoTianBeiJingShen).toBe('moRen')
  })
})

describe('外观就地编辑：共享圆角输入框与显式提交', () => {
  const 源码根 = resolve(__dirname, '..')
  const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
  const 编辑器源码 = 读('components/外观就地编辑器.vue')
  const 已挂载: Array<ReturnType<typeof mount>> = []

  function 挂载编辑器(覆盖: Record<string, unknown> = {}) {
    const kuang = mount(WaiGuanJiuDiBianJi, {
      attachTo: document.body,
      props: {
        biaoTi: huoQuFanYi('sheZhi', 'waiGuanBianJiBiaoTi'),
        mingCheng: '海边',
        wenZiYanSe: '#FFFFFF',
        zuiDaZiFu: 12,
        leiBie: 'beiJing',
        ...覆盖,
      },
    })
    已挂载.push(kuang)
    return kuang
  }

  const 原始获取动画 = Element.prototype.getAnimations
  const 原始播放动画 = Element.prototype.animate

  beforeEach(() => {
    Element.prototype.getAnimations = () => []
    Element.prototype.animate = () =>
      ({ cancel: () => undefined, finished: Promise.resolve() }) as unknown as Animation
  })

  afterEach(() => {
    while (已挂载.length) 已挂载.pop()?.unmount()
    Element.prototype.getAnimations = 原始获取动画
    Element.prototype.animate = 原始播放动画
  })

  it('名称输入整体复用长方框输入框，旧裸输入与自带错误行已删除', () => {
    expect(编辑器源码).toContain("import ChangFangShuRuKuang from '@/components/表单/长方框输入框.vue'")
    expect(编辑器源码).toContain('<ChangFangShuRuKuang')
    expect(编辑器源码).toContain(':错误提示文字="cuoWuWenAn"')
    expect(编辑器源码).not.toContain('jiu-di-bian-ji-shu-ru')
    expect(编辑器源码).not.toContain('jiu-di-bian-ji-cuo-wu')
    expect(编辑器源码).not.toContain('autocomplete="off"')
  })

  it('渲染共享圆角输入框，字数上限与标题随翻译表下发', async () => {
    const kuang = 挂载编辑器()
    await nextTick()
    expect(kuang.find('.chang-fang-kuang-ke').exists()).toBe(true)
    const 输入 = kuang.get('input.she-zhi-shuru')
    expect(输入.attributes('maxlength')).toBe('12')
    expect(输入.attributes('id')).toBe(kuang.get('label').attributes('for'))
    expect(kuang.get('.jiu-di-bian-ji-biao-ti').text()).toBe('编辑名称')
  })

  it('挂载即聚焦并全选，回车提交、Esc 取消', async () => {
    const kuang = 挂载编辑器()
    await nextTick()
    const 输入 = kuang.get('input').element as HTMLInputElement
    expect(document.activeElement).toBe(输入)
    expect(输入.selectionStart).toBe(0)
    expect(输入.selectionEnd).toBe('海边'.length)

    await kuang.get('input').setValue('新名字')
    await kuang.get('input').trigger('keydown', { key: 'Enter' })
    expect(kuang.emitted('tijiao')?.[0]).toEqual([{ mingCheng: '新名字', wenZiYanSe: '#FFFFFF' }])

    const 第二个 = 挂载编辑器()
    await nextTick()
    await 第二个.get('input').trigger('keydown', { key: 'Escape' })
    expect(第二个.emitted('qu-xiao')).toHaveLength(1)
    expect(第二个.emitted('tijiao')).toBeUndefined()
  })

  it('焦点移出与内部任意点击都不提交，只有显式保存才提交', async () => {
    const kuang = 挂载编辑器()
    await nextTick()
    const 输入 = kuang.get('input').element as HTMLInputElement
    输入.focus()
    输入.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    await nextTick()
    expect(kuang.emitted('tijiao')).toBeUndefined()

    await kuang.get('.jiu-di-bian-ji-tou').trigger('click')
    await kuang.get('.jiu-di-bian-ji-yan-se-biao-ti').trigger('click')
    await kuang.get('.jiu-di-bian-ji-sui-shi').trigger('click')
    await kuang.get('.jiu-di-bian-ji-se-kuai').trigger('click')
    expect(kuang.emitted('tijiao')).toBeUndefined()
    expect(kuang.emitted('qu-xiao')).toBeUndefined()
    expect(编辑器源码).not.toContain('focusout')

    await kuang.get('.jiu-di-bian-ji-an-niu--zhu').trigger('click')
    expect(kuang.emitted('tijiao')).toHaveLength(1)
  })

  it('空名称不提交，错误提示由共享输入框上屏', async () => {
    const kuang = 挂载编辑器()
    await nextTick()
    await kuang.get('input').setValue('   ')
    await kuang.get('.jiu-di-bian-ji-an-niu--zhu').trigger('click')
    expect(kuang.emitted('tijiao')).toBeUndefined()
    expect(kuang.get('.chang-fang-kuang-cuo-wu').text()).toBe(
      huoQuFanYi('sheZhi', 'waiGuanMingChengWeiKong'),
    )
    expect(kuang.get('input').attributes('aria-invalid')).toBe('true')
  })
})

describe('外观编辑与删除按钮：内联 SVG 图标与紧凑尺寸', () => {
  const 源码根 = resolve(__dirname, '..')
  const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
  const 背景源码 = 读('components/聊天背景设置.vue')
  const 气泡源码 = 读('components/气泡主题选择器.vue')

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('背景卡控件只渲染 SVG，不再带文字符号', () => {
    const kuang = mount(LiaoTianBeiJingSheZhi)
    const 控件们 = kuang.findAll('.bei-jing-ka-kong-zhi')
    expect(控件们.length).toBeGreaterThan(0)
    for (const 控件 of 控件们) {
      expect(控件.find('svg').exists()).toBe(true)
      expect(控件.text()).toBe('')
      expect(控件.attributes('aria-label')).toBeTruthy()
    }
    kuang.unmount()
  })

  it('自定义气泡在自己与AI两组各渲染一套纯 SVG 图标控件', () => {
    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: [],
      qiPao: [
        {
          id: 'qi-pao-ce-shi',
          mingCheng: '自定义气泡1',
          tuDiZhi: MEI_TI_URL,
          wenZiYanSe: '#FFFFFF',
        },
      ],
      beiJingFuGai: {},
      qiPaoFuGai: {},
      dangQianQiPao: { ziJi: '', ai: '' },
    }
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const 控件们 = kuang.findAll('.qi-pao-kong-zhi')
    expect(控件们).toHaveLength(4)
    for (const 控件 of 控件们) {
      expect(控件.find('svg').exists()).toBe(true)
      expect(控件.text()).toBe('')
      expect(控件.attributes('aria-label')).toBeTruthy()
    }
    kuang.unmount()
  })

  it('不再用文字符号当图标，编辑为铅笔、删除为垃圾桶', () => {
    for (const 源 of [背景源码, 气泡源码]) {
      expect(源).not.toMatch(/[✎✕×]/)
      expect(源.match(/class="[^"]*-kong-zhi-tu-biao"/g) ?? []).toHaveLength(2)
      expect(源.match(/stroke="currentColor"/g) ?? []).toHaveLength(2)
      expect(源.match(/focusable="false"/g) ?? []).toHaveLength(2)
      expect(源).toContain('M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z')
      expect(源).toContain('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6')
    }
  })

  it('按钮视觉 30px、图标 14px、热区 36px，全部走组件内变量', () => {
    for (const 源 of [背景源码, 气泡源码]) {
      expect(源).toContain('--wai-guan-kong-zhi-chi-cun: 30px;')
      expect(源).toContain('--wai-guan-kong-zhi-re-qu: 36px;')
      expect(源).toContain('--wai-guan-kong-zhi-tu-biao: 14px;')
      expect(源).toContain('width: var(--wai-guan-kong-zhi-chi-cun);')
      expect(源).toContain('height: var(--wai-guan-kong-zhi-chi-cun);')
      expect(源).toContain('width: var(--wai-guan-kong-zhi-re-qu);')
      expect(源).toContain('height: var(--wai-guan-kong-zhi-re-qu);')
      expect(源).toContain('width: var(--wai-guan-kong-zhi-tu-biao);')
      expect(源).toContain('height: var(--wai-guan-kong-zhi-tu-biao);')
      expect(源).not.toContain('width: var(--wai-guan-re-ku);')
    }
  })

  it('标题文案来自翻译表且为编辑名称', () => {
    expect(huoQuFanYi('sheZhi', 'waiGuanBianJiBiaoTi')).toBe('编辑名称')
    expect(背景源码).toContain("huoQuFanYi('sheZhi', 'waiGuanBianJiBiaoTi')")
    expect(气泡源码).toContain("huoQuFanYi('sheZhi', 'waiGuanBianJiBiaoTi')")
    expect(背景源码 + 气泡源码).not.toContain('编辑外观')
  })
})
