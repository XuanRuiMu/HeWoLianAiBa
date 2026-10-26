import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LiaoTianBeiJingSheZhi from '@/components/聊天背景设置.vue'
import QiPaoZhuTiXuanZeQi from '@/components/气泡主题选择器.vue'
import TuPianCaiJian from '@/components/图片裁剪.vue'
import WaiGuanJiuDiBianJi from '@/components/外观就地编辑器.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuFanYi } from '@/config/翻译表'
import { huoQuQiPaoDingYi } from '@/config/气泡主题'
import { zhongPaiWaiGuanTiaoMu, type WaiGuanChuCan, type WaiGuanTiaoMu } from '@/config/外观自定义'
import { baoCunWaiGuan } from '@/api/社交'
import {
  TU_PIAN_SHU_CHU_ZUI_DA_BIAN,
  daoChuCaiJianWenJian,
  jiSuanDaoChuChiCun,
  jueDingShuChuGeShi,
} from '@/utils/图片裁剪'

vi.mock('@/api/社交', async (yuanShi) => {
  const yuan = await (yuanShi as () => Promise<Record<string, unknown>>)()
  return {
    ...yuan,
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

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 背景源码 = 读('components/聊天背景设置.vue')
const 气泡源码 = 读('components/气泡主题选择器.vue')
const 裁剪源码 = 读('components/图片裁剪.vue')
const 裁剪工具源码 = 读('utils/图片裁剪.ts')
const 安全源码 = 读('views/账号与安全.vue')

function zaoTiaoMu(xuHao: number, leiBie: 'beiJing' | 'qiPao'): WaiGuanTiaoMu {
  const qianZhui = leiBie === 'beiJing' ? 'beijing' : 'qipao'
  return {
    id: qianZhui + '-' + xuHao,
    mingCheng: '自定义' + (leiBie === 'beiJing' ? '背景' : '气泡') + xuHao,
    tuDiZhi: MEI_TI_URL,
    wenZiYanSe: '#FFFFFF',
  }
}

describe('FP03 需求8：自定义可上传计数', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('翻译表文案为自定义可上传{n}/{zuiDa}且不含已用字样', () => {
    expect(huoQuFanYi('sheZhi', 'beiJingYiYongJiShu')).toBe('自定义可上传{n}/{zuiDa}')
    expect(huoQuFanYi('sheZhi', 'beiJingYiYongJiShu')).not.toContain('已用')
  })

  it('空账号显示自定义可上传0/24，两条自定义后显示2/24', async () => {
    const kuang = mount(LiaoTianBeiJingSheZhi)
    expect(kuang.get('.bei-jing-ji-shu').text()).toBe('自定义可上传0/24')
    kuang.unmount()

    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: [zaoTiaoMu(1, 'beiJing'), zaoTiaoMu(2, 'beiJing')],
      qiPao: [],
      beiJingFuGai: {},
      qiPaoFuGai: {},
      dangQianQiPao: { ziJi: '', ai: '' },
    }
    const diEr = mount(LiaoTianBeiJingSheZhi)
    expect(diEr.get('.bei-jing-ji-shu').text()).toBe('自定义可上传2/24')
    diEr.unmount()
  })
})

describe('FP03 预设气泡资源不变量', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function guiYiBeiJingZhi(zhi: string): string {
    const linShi = document.createElement('div')
    linShi.style.background = zhi
    return linShi.style.background.toLowerCase()
  }

  it('预设气泡背景恒为固定定义值，改名换色与重进都不漂移', async () => {
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const ka = kuang.get('[data-yu-she="weiXinLv"]')
    const guDingBeiJing = guiYiBeiJingZhi(huoQuQiPaoDingYi('weiXinLv').beiJing)
    expect((ka.element as HTMLElement).style.background.toLowerCase()).toBe(guDingBeiJing)

    await ka.get('.qi-pao-ka-kong-zhi').trigger('click')
    const bianJi = kuang.getComponent(WaiGuanJiuDiBianJi)
    bianJi.vm.$emit('yu-lan', { mingCheng: '全新名字', wenZiYanSe: '#000000' })
    await nextTick()
    expect((ka.element as HTMLElement).style.background.toLowerCase()).toBe(guDingBeiJing)
    expect((ka.element as HTMLElement).style.color).toBe('rgb(0, 0, 0)')

    bianJi.vm.$emit('tijiao', { mingCheng: '全新名字', wenZiYanSe: '#000000' })
    await nextTick()
    await nextTick()
    expect((ka.element as HTMLElement).style.background.toLowerCase()).toBe(guDingBeiJing)
    kuang.unmount()

    const chongJin = mount(QiPaoZhuTiXuanZeQi)
    const chongKa = chongJin.get('[data-yu-she="weiXinLv"]')
    expect((chongKa.element as HTMLElement).style.background.toLowerCase()).toBe(guDingBeiJing)
    expect(chongKa.get('.qi-pao-xuan-xiang-wen').text()).toBe('全新名字')
    chongJin.unmount()
  })
})

describe('FP03 气泡名称几何居中', () => {
  it('名称层绝对铺满卡片并双向对称内边距，勾选与控件不挤占名称', () => {
    expect(气泡源码).toMatch(/\.qi-pao-xuan-xiang-wen\s*\{[^}]*position:\s*absolute/)
    expect(气泡源码).toMatch(/\.qi-pao-xuan-xiang-wen\s*\{[^}]*inset:\s*0/)
    expect(气泡源码).toMatch(/\.qi-pao-gou\s*\{[^}]*position:\s*absolute/)
    expect(气泡源码).not.toContain('calc(var(--jiange-12) + var(--ziti-xiao))')
    expect(气泡源码).toMatch(/\.qi-pao-xuan-xiang-wen\s*\{[^}]*padding:\s*0 var\(--jiange-12\)/)
  })

  it('勾选态与未勾选态名称层结构一致，中心不随勾选符号偏移', async () => {
    setActivePinia(createPinia())
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const ka = kuang.get('[data-yu-she="weiXinLv"]')
    expect(ka.find('.qi-pao-xuan-xiang-wen').exists()).toBe(true)
    await ka.trigger('click')
    await nextTick()
    expect(ka.find('.qi-pao-xuan-xiang-wen').exists()).toBe(true)
    expect(ka.find('.qi-pao-gou').exists()).toBe(true)
    kuang.unmount()
  })
})

describe('FP03 Cropper.js 专业裁剪封装', () => {
  it('工具层接入cropperjs类型并删除全部自研裁剪数学', () => {
    expect(裁剪工具源码).toContain("from 'cropperjs'")
    expect(裁剪工具源码).not.toContain('jiSuanJiChuSuoFang')
    expect(裁剪工具源码).not.toContain('yueShuPianYi')
    expect(裁剪工具源码).not.toContain('jiSuanYuanJu')
    expect(裁剪工具源码).not.toContain('xuanRanJuXing')
  })

  it('导出尺寸长边封顶1024且保持宽高比', () => {
    expect(jiSuanDaoChuChiCun(2048, 1024, TU_PIAN_SHU_CHU_ZUI_DA_BIAN)).toEqual({ kuan: 1024, gao: 512 })
    expect(jiSuanDaoChuChiCun(1024, 2048, TU_PIAN_SHU_CHU_ZUI_DA_BIAN)).toEqual({ kuan: 512, gao: 1024 })
    expect(jiSuanDaoChuChiCun(800, 600, TU_PIAN_SHU_CHU_ZUI_DA_BIAN)).toEqual({ kuan: 800, gao: 600 })
    expect(jiSuanDaoChuChiCun(1000, 1000, TU_PIAN_SHU_CHU_ZUI_DA_BIAN)).toEqual({ kuan: 1024, gao: 1024 })
  })

  it('输出格式PNG保真、其余落JPG', () => {
    expect(jueDingShuChuGeShi('image/png')).toEqual({ mime: 'image/png', houZhui: 'png' })
    expect(jueDingShuChuGeShi('image/jpeg')).toEqual({ mime: 'image/jpeg', houZhui: 'jpg' })
    expect(jueDingShuChuGeShi('image/webp')).toEqual({ mime: 'image/jpeg', houZhui: 'jpg' })
  })

  it('按选区导出文件：大图缩到1024、命名与类型正确', async () => {
    const daoChuChiCun: Array<{ kuan: number; gao: number }> = []
    const huaBuGong = document.createElement('canvas')
    huaBuGong.width = 2048
    huaBuGong.height = 1024
    const quXiaoMoNi = [
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: () => undefined,
      } as unknown as CanvasRenderingContext2D),
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
        this: HTMLCanvasElement,
        huiDiao: BlobCallback,
      ) {
        daoChuChiCun.push({ kuan: this.width, gao: this.height })
        huiDiao(new Blob(['tu'], { type: 'image/jpeg' }))
      }),
    ]
    const wenJian = await daoChuCaiJianWenJian(
      { $toCanvas: async () => huaBuGong } as never,
      jueDingShuChuGeShi('image/jpeg'),
      'touxiang',
    )
    for (const moNi of quXiaoMoNi) moNi.mockRestore()
    expect(wenJian).toBeInstanceOf(File)
    expect(wenJian.name).toBe('touxiang.jpg')
    expect(wenJian.type).toBe('image/jpeg')
    expect(daoChuChiCun.at(-1)).toEqual({ kuan: 1024, gao: 512 })
  })

  it('组件层挂载cropper自定义元素并绑定比例、键盘与触摸', () => {
    expect(裁剪源码).toContain("import 'cropperjs'")
    expect(裁剪源码).toContain('<cropper-canvas')
    expect(裁剪源码).toContain('<cropper-image')
    expect(裁剪源码).toContain('<cropper-selection')
    expect(裁剪源码).toContain(':aspect-ratio="kuanGaoBi"')
    expect(裁剪源码).toContain('keyboard')
    expect(裁剪源码).toContain('<cropper-grid')
    expect(裁剪源码).not.toContain('kaiShiTuo')
    expect(裁剪源码).not.toContain('chuLiGunLun')
    expect(裁剪源码).not.toContain('jiSuanYuanJu')
  })

  it('工具行提供旋转、翻转、复位、缩放且文案全部走翻译表', () => {
    for (const jian of ['caiJianXuanZhuanZuo', 'caiJianXuanZhuanYou', 'caiJianFanZhuanShuiPing', 'caiJianFanZhuanChuiZhi', 'caiJianChongZhi'] as const) {
      expect(huoQuFanYi('sheZhi', jian)).toBeTruthy()
      expect(裁剪源码).toContain(`huoQuFanYi('sheZhi', '` + jian + `')`)
    }
    expect(huoQuFanYi('sheZhi', 'tuPianCaiJianTiShi')).toContain('旋转')
    expect(裁剪源码).toContain('$rotate')
    expect(裁剪源码).toContain('$scale')
    expect(裁剪源码).not.toContain('$zoom(')
    expect(裁剪源码).toContain('$resetTransform')
  })

  it('取消与确认事件契约保持，Esc触发取消', async () => {
    const kuang = mount(TuPianCaiJian, {
      props: { tuYuan: 'data:image/png;base64,x', yuanMime: 'image/png', biaoTi: '裁剪头像', tiShi: '提示' },
      attachTo: document.body,
    })
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(kuang.emitted('qu-xiao')).toHaveLength(1)
    kuang.unmount()
  })
})

describe('FP03 统一裁剪路径与按需加载', () => {
  it('头像、背景、气泡三处统一异步接入同一裁剪组件', () => {
    const 异步接入 = "defineAsyncComponent(() => import('@/components/图片裁剪.vue'))"
    expect(安全源码).toContain(异步接入)
    expect(背景源码).toContain(异步接入)
    expect(气泡源码).toContain(异步接入)
  })
})

describe('FP03 长按拖拽排序', () => {
  it('重排纯函数：合法新顺序生效，集合不一致返回空', () => {
    const lieBiao = [zaoTiaoMu(1, 'beiJing'), zaoTiaoMu(2, 'beiJing'), zaoTiaoMu(3, 'beiJing')]
    const zhongPai = zhongPaiWaiGuanTiaoMu(lieBiao, ['beijing-3', 'beijing-1', 'beijing-2'])
    expect(zhongPai?.map((xiang) => xiang.id)).toEqual(['beijing-3', 'beijing-1', 'beijing-2'])
    expect(zhongPai?.every((xiang) => xiang instanceof Object)).toBe(true)
    expect(zhongPaiWaiGuanTiaoMu(lieBiao, ['beijing-1', 'beijing-2'])).toBeNull()
    expect(zhongPaiWaiGuanTiaoMu(lieBiao, ['beijing-1', 'beijing-1', 'beijing-3'])).toBeNull()
  })

  it('背景与气泡都接入VueDraggable：动画、长按延迟、控件过滤与持久化回滚', () => {
    for (const yuan of [背景源码, 气泡源码]) {
      expect(yuan).toContain("from 'vue-draggable-plus'")
      expect(yuan).toContain('VueDraggable')
      expect(yuan).toContain(':animation=')
      expect(yuan).toContain(':delay=')
      expect(yuan).toContain('delay-on-touch-only')
      expect(yuan).toContain(':filter=')
      expect(yuan).toContain('zhongPaiWaiGuanTiaoMu')
      expect(yuan).toContain('baoCunWaiGuan')
      expect(yuan).toMatch(/sortable-drag/)
    }
  })

  it('拖拽持久化失败时回滚旧顺序', async () => {
    setActivePinia(createPinia())
    vi.mocked(baoCunWaiGuan).mockClear()
    vi.mocked(baoCunWaiGuan).mockRejectedValueOnce(new Error('wangLuo'))
    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: [zaoTiaoMu(1, 'beiJing'), zaoTiaoMu(2, 'beiJing')],
      qiPao: [],
      beiJingFuGai: {},
      qiPaoFuGai: {},
      dangQianQiPao: { ziJi: '', ai: '' },
    }
    const kuang = mount(LiaoTianBeiJingSheZhi)
    const TuoZhuaiGengXin = (kuang.vm as unknown as { tuoZhuaiGengXinBeiJing: (xin: WaiGuanTiaoMu[]) => Promise<void> }).tuoZhuaiGengXinBeiJing
    expect(typeof TuoZhuaiGengXin).toBe('function')
    await TuoZhuaiGengXin([zaoTiaoMu(2, 'beiJing'), zaoTiaoMu(1, 'beiJing')])
    expect(baoCunWaiGuan).toHaveBeenCalledTimes(1)
    expect(cang.waiGuan.beiJing.map((xiang) => xiang.id)).toEqual(['beijing-1', 'beijing-2'])
    kuang.unmount()
  })

  it('拖拽持久化成功时保存新顺序', async () => {
    setActivePinia(createPinia())
    vi.mocked(baoCunWaiGuan).mockClear()
    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: [zaoTiaoMu(1, 'beiJing'), zaoTiaoMu(2, 'beiJing')],
      qiPao: [],
      beiJingFuGai: {},
      qiPaoFuGai: {},
      dangQianQiPao: { ziJi: '', ai: '' },
    }
    const kuang = mount(LiaoTianBeiJingSheZhi)
    const TuoZhuaiGengXin = (kuang.vm as unknown as { tuoZhuaiGengXinBeiJing: (xin: WaiGuanTiaoMu[]) => Promise<void> }).tuoZhuaiGengXinBeiJing
    await TuoZhuaiGengXin([zaoTiaoMu(2, 'beiJing'), zaoTiaoMu(1, 'beiJing')])
    expect(cang.waiGuan.beiJing.map((xiang) => xiang.id)).toEqual(['beijing-2', 'beijing-1'])
    kuang.unmount()
  })
})

describe('FP03 拖拽动画样式', () => {
  it('拖拽态有金色描边阴影与过渡动画，并尊重系统减动效', () => {
    expect(背景源码).toMatch(/sortable-drag[^{]*\{/)
    expect(气泡源码).toMatch(/sortable-drag[^{]*\{/)
    expect(背景源码).toContain('prefers-reduced-motion')
    expect(气泡源码).toContain('prefers-reduced-motion')
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
