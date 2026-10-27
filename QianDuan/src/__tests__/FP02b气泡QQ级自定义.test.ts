import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import QiPaoZhuTiXuanZeQi from '@/components/气泡主题选择器.vue'
import { huoQuFanYi } from '@/config/翻译表'
import {
  QI_PAO_WEI_BA_MO_SHI_LIE_BIAO,
  QI_PAO_WEI_BA_WEI_ZHI_LIE_BIAO,
  QI_PAO_YUAN_JIAO_DANG_WEI_LIE_BIAO,
  huoQuMiaoBianYangShi,
  huoQuWeiBaChiCun,
  huoQuWeiBaWeiZhiZhi,
  huoQuYuanJiaoDangZhi,
  jieXiMengCengZhi,
  type WaiGuanTiaoMu,
} from '@/config/外观自定义'
import { heChengWeiBaYanSe, jiSuanQuYuPingJun } from '@/utils/外观采样'
import { 使用用户设置仓库 } from '@/stores/用户设置'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')
const 容器源 = 读('components/聊天/气泡容器.vue')
const 卡片源 = 读('components/气泡主题选择器.vue')
const 裁剪源 = 读('components/图片裁剪.vue')
const 皮肤源 = 读('composables/use聊天皮肤.ts')

const MEI_TI_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)

function zaoTiaoMu(xuHao: number): WaiGuanTiaoMu {
  return {
    id: 'qipao-' + xuHao,
    mingCheng: '自定义气泡' + xuHao,
    tuDiZhi: MEI_TI_URL,
    wenZiYanSe: '#FFFFFF',
  }
}

describe('FP-02b 气泡形状档位映射', () => {
  it('尾巴档位映射几何令牌：默认/大/小/无', () => {
    expect(huoQuWeiBaChiCun('moRen')).toEqual({ kuan: 'var(--qipao-weiba-kuan-ju-li)', ban: 'var(--qipao-weiba-ban-ju-li)' })
    expect(huoQuWeiBaChiCun('da')).toEqual({ kuan: 'var(--qipao-weiba-kuan-da)', ban: 'var(--qipao-weiba-ban-da)' })
    expect(huoQuWeiBaChiCun('xiao')).toEqual({ kuan: 'var(--qipao-weiba-kuan-xiao)', ban: 'var(--qipao-weiba-ban-xiao)' })
    expect(huoQuWeiBaChiCun('wu')).toEqual({ kuan: '0px', ban: '0px' })
    expect([...QI_PAO_WEI_BA_MO_SHI_LIE_BIAO]).toEqual(['moRen', 'da', 'xiao', 'wu'])
  })

  it('尾巴位置档位映射 top 语义：靠上/居中/靠下，公式引用档位变量自身不循环', () => {
    expect(huoQuWeiBaWeiZhiZhi('shang')).toBe('var(--qipao-weiba-ju-li)')
    expect(huoQuWeiBaWeiZhiZhi('zhong')).toBe('calc(50% - var(--qipao-weiba-ban))')
    expect(huoQuWeiBaWeiZhiZhi('xia')).toBe('calc(100% - var(--qipao-weiba-ju-li) - var(--qipao-weiba-ban) * 2)')
    for (const zhi of QI_PAO_WEI_BA_WEI_ZHI_LIE_BIAO) {
      expect(huoQuWeiBaWeiZhiZhi(zhi)).not.toContain('var(--qipao-weiba-shang)')
    }
  })

  it('圆角档位映射：小/中/中为默认值/大', () => {
    expect(huoQuYuanJiaoDangZhi('xiao')).toBe('var(--qipao-yuanjiao-dang-xiao)')
    expect(huoQuYuanJiaoDangZhi('zhong')).toBe('var(--qipao-yuanjiao-ju-li)')
    expect(huoQuYuanJiaoDangZhi('da')).toBe('var(--qipao-yuanjiao-dang-da)')
    expect([...QI_PAO_YUAN_JIAO_DANG_WEI_LIE_BIAO]).toEqual(['xiao', 'zhong', 'da'])
  })

  it('描边样式：关=none，开=零偏移实色圈，非法色回退 none', () => {
    expect(huoQuMiaoBianYangShi(false, '#333333')).toBe('none')
    expect(huoQuMiaoBianYangShi(true, '#333333')).toBe('0 0 0 1.5px #333333')
    expect(huoQuMiaoBianYangShi(true, 'red')).toBe('none')
    expect(huoQuMiaoBianYangShi(true, '')).toBe('none')
  })

  it('设计令牌保留档位子令牌且默认值不变：6px 圆角、6/5 尾巴、13px 顶部基准', () => {
    const lingPai = 读('styles/设计令牌.css')
    expect(lingPai).toContain('--qipao-yuanjiao-ju-li: 6px;')
    expect(lingPai).toContain('--qipao-yuanjiao: var(--qipao-yuanjiao-ju-li);')
    expect(lingPai).toContain('--qipao-weiba-kuan-ju-li: 6px;')
    expect(lingPai).toContain('--qipao-weiba-ban-ju-li: 5px;')
    expect(lingPai).toContain('--qipao-weiba-kuan: var(--qipao-weiba-kuan-ju-li);')
    expect(lingPai).toContain('--qipao-weiba-ju-li: 13px;')
    expect(lingPai).toContain('--qipao-weiba-shang: var(--qipao-weiba-ju-li);')
  })
})

describe('FP-02b 形状档位存储与变量注入', () => {
  it('默认档保持现状视觉，持久化后非法值回退', () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    expect(cang.qiPaoWeiBaMoShi).toBe('moRen')
    expect(cang.qiPaoWeiBaWeiZhi).toBe('shang')
    expect(cang.qiPaoYuanJiaoDangWei).toBe('zhong')
    expect(cang.qiPaoMiaoBianKaiQi).toBe(false)
    cang.shiYongQiPaoXingZhuang({ weiBaMoShi: 'da', weiBaWeiZhi: 'xia', yuanJiaoDangWei: 'da', miaoBianKaiQi: true, miaoBianYanSe: '#FF0000' })
    expect(localStorage.getItem('hewolianba_qiPaoWeiBaMoShi')).toBe(JSON.stringify('da'))
    expect(localStorage.getItem('hewolianba_qiPaoWeiBaWeiZhi')).toBe(JSON.stringify('xia'))
    expect(localStorage.getItem('hewolianba_qiPaoYuanJiaoDangWei')).toBe(JSON.stringify('da'))
    expect(localStorage.getItem('hewolianba_qiPaoMiaoBianKaiQi')).toBe('true')
    expect(localStorage.getItem('hewolianba_qiPaoMiaoBianYanSe')).toBe(JSON.stringify('#FF0000'))
    cang.shiYongQiPaoXingZhuang({ weiBaMoShi: 'buCunZai' as never, miaoBianYanSe: 'red' })
    expect(cang.qiPaoWeiBaMoShi).toBe('da')
    expect(cang.qiPaoMiaoBianYanSe).toBe('#FF0000')
  })

  it('形状变量五键随档位联动，描边关闭时为 none', async () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    const moRen = cang.qiPaoXingZhuangBianLiang
    expect(moRen['--qipao-yuanjiao']).toBe('var(--qipao-yuanjiao-ju-li)')
    expect(moRen['--qipao-weiba-shang']).toBe('var(--qipao-weiba-ju-li)')
    expect(moRen['--qipao-weiba-kuan']).toBe('var(--qipao-weiba-kuan-ju-li)')
    expect(moRen['--qipao-weiba-ban']).toBe('var(--qipao-weiba-ban-ju-li)')
    expect(moRen['--qipao-miaoBian-yangShi']).toBe('none')
    cang.shiYongQiPaoXingZhuang({ weiBaMoShi: 'wu', weiBaWeiZhi: 'zhong', yuanJiaoDangWei: 'xiao', miaoBianKaiQi: true, miaoBianYanSe: '#000000' })
    const gai = cang.qiPaoXingZhuangBianLiang
    expect(gai['--qipao-yuanjiao']).toBe('var(--qipao-yuanjiao-dang-xiao)')
    expect(gai['--qipao-weiba-shang']).toBe('calc(50% - var(--qipao-weiba-ban))')
    expect(gai['--qipao-weiba-kuan']).toBe('0px')
    expect(gai['--qipao-miaoBian-yangShi']).toBe('0 0 0 1.5px #000000')
  })

  it('选择器根节点注入形状变量，卡片与真实聊天同源消费', () => {
    setActivePinia(createPinia())
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const gen = kuang.element as HTMLElement
    expect(gen.style.getPropertyValue('--qipao-yuanjiao')).toBe('var(--qipao-yuanjiao-ju-li)')
    expect(gen.style.getPropertyValue('--qipao-weiba-kuan')).toBe('var(--qipao-weiba-kuan-ju-li)')
    expect(容器源).toContain('border-radius: var(--qipao-yuanjiao)')
    expect(容器源).toContain('top: var(--qipao-weiba-shang)')
    kuang.unmount()
  })

  it('真实聊天面板经 use聊天皮肤 注入同一份形状变量', () => {
    expect(皮肤源).toContain('qiPaoYangShi')
    expect(皮肤源).toContain('watchEffect')
    expect(皮肤源).toContain('queRenQiPaoWeiBaYanSe')
  })
})

describe('FP-02b 图片态尾巴不再退化', () => {
  it('尾巴颜色引用链以尾巴专用变量打头，复合背景串永远到不了 border-color', () => {
    expect(容器源).toContain('border-left: var(--qipao-weiba-kuan) solid')
    expect(容器源).toContain('var(--qipao-ziJi-weiBa, var(--qipao-ziJi-beiJing')
    expect(容器源).toContain('var(--qipao-duiFang-weiBa, var(--qipao-duiFang-beiJing')
    expect(卡片源).toContain('var(--qipao-ziJi-weiBa, var(--qipao-ziJi-beiJing')
    expect(卡片源).toContain('var(--qipao-duiFang-weiBa, var(--qipao-duiFang-beiJing')
  })

  it('图片态气泡变量注入尾巴专用色：未采样时为占位色而非复合串', () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: [],
      qiPao: [zaoTiaoMu(1)],
      beiJingFuGai: {},
      qiPaoFuGai: {},
      dangQianQiPao: { ziJi: 'qipao-1', ai: '' },
    }
    const bianLiang = cang.ziJiQiPaoCSSBianLiang
    expect(bianLiang['--qipao-ziJi-beiJing']).toContain('url(')
    expect(bianLiang['--qipao-ziJi-weiBa']).toBeDefined()
    expect(bianLiang['--qipao-ziJi-weiBa']).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('采样落库后变量跟随采样色', async () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: [],
      qiPao: [zaoTiaoMu(1)],
      beiJingFuGai: {},
      qiPaoFuGai: {},
      dangQianQiPao: { ziJi: '', ai: 'qipao-1' },
    }
    cang.qiPaoWeiBaYanSeLu['ai-qipao-1'] = '#AABBCC'
    expect(cang.ziJiQiPaoCSSBianLiang['--qipao-duiFang-weiBa']).toBe('#AABBCC')
    expect(cang.ziJiQiPaoCSSBianLiang['--qipao-duiFang-beiJing']).toContain('url(')
  })
})

describe('FP-02b 预览单侧覆盖与真实应用一致', () => {
  it('裁剪预览只覆盖上传侧气泡：自己侧覆盖benren，AI侧覆盖jiaose', () => {
    expect(裁剪源).toContain('.caijian-yulan--ce-ziJi :deep(.qipao-neirong--benren)')
    expect(裁剪源).toContain('.caijian-yulan--ce-ai :deep(.qipao-neirong--jiaose)')
    expect(裁剪源).not.toContain('.caijian-yulan--qiPao :deep(.qipao-neirong)')
  })

  it('选择器把上传侧别传给裁剪组件，预览尾巴色独立采样注入', () => {
    expect(卡片源).toContain(':yu-lan-ce-zhong="shangChuanFang"')
    expect(裁剪源).toContain("yuLanCeZhong?: 'ziJi' | 'ai'")
    expect(裁剪源).toContain("'--caijian-yulan-wei-ba'")
    expect(裁剪源).toContain('caiJiBianYuanYanSe')
    expect(裁剪源).toContain("'caijian-yulan--ce-' + props.yuLanCeZhong")
  })

  it('预览尾巴色优先采样值，回退真实管道尾巴变量', () => {
    expect(裁剪源).toContain('border-left-color: var(--caijian-yulan-wei-ba, var(--qipao-ziJi-weiBa')
    expect(裁剪源).toContain('border-right-color: var(--caijian-yulan-wei-ba, var(--qipao-duiFang-weiBa')
  })
})

describe('FP-02b 尾巴采样纯函数', () => {
  it('像素区域平均：按四通道步进取均值，长度不合法返回 null', () => {
    const siXiang = [255, 0, 0, 255, 0, 255, 0, 255]
    const jun = jiSuanQuYuPingJun(siXiang)
    expect(jun).toEqual({ r: 128, g: 128, b: 0 })
    expect(jiSuanQuYuPingJun([255, 0, 0])).toBeNull()
    expect(jiSuanQuYuPingJun([1, 2, 3, 4, 5])).toBeNull()
  })

  it('尾巴色=边缘平均与气泡蒙层合成，蒙层串非法返回 null', () => {
    expect(jieXiMengCengZhi('rgba(255, 255, 255, 0.62)')).toEqual({ r: 255, g: 255, b: 255, a: 0.62 })
    expect(jieXiMengCengZhi('rgba(0, 0, 0, 0.55)')).toEqual({ r: 0, g: 0, b: 0, a: 0.55 })
    expect(jieXiMengCengZhi('rgba(999, 0, 0, 0.5)')).toBeNull()
    expect(jieXiMengCengZhi('linear-gradient')).toBeNull()
    const se = heChengWeiBaYanSe({ r: 100, g: 150, b: 200 }, 'rgba(255, 255, 255, 0.62)')
    expect(se).not.toBeNull()
    const mengCeng = jieXiMengCengZhi('rgba(255, 255, 255, 0.62)')!
    const qiWang = [100, 150, 200].map((tongDao, i) =>
      Math.round(mengCeng[i === 0 ? 'r' : i === 1 ? 'g' : 'b'] * mengCeng.a + tongDao * (1 - mengCeng.a)),
    )
    expect(se).toBe(
      '#' + qiWang.map((zhi) => zhi.toString(16).padStart(2, '0')).join(''),
    )
    expect(heChengWeiBaYanSe({ r: 0, g: 0, b: 0 }, '不是蒙层串')).toBeNull()
  })
})

describe('FP-02b 形状设置 UI 与翻译', () => {
  it('形状区块档位 chips 与 store 联动', async () => {
    setActivePinia(createPinia())
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const cang = 使用用户设置仓库()
    const dangKa = kuang.findAll('.qi-pao-dang-wei-ka')
    expect(dangKa.length).toBe(4 + 3 + 3 + 2)
    await dangKa[1].trigger('click')
    expect(cang.qiPaoWeiBaMoShi).toBe('da')
    await dangKa[11].trigger('click')
    expect(cang.qiPaoMiaoBianKaiQi).toBe(true)
    await kuang.get('.qi-pao-miao-bian-se-kuai').trigger('click')
    expect(cang.qiPaoMiaoBianYanSe).toBe('#FFFFFF')
    kuang.unmount()
  })

  it('档位与描边文案全部来自 qiPao 翻译区块且为中文', () => {
    expect(huoQuFanYi('qiPao', 'xingZhuangBiaoTi')).toBe('气泡形状')
    expect(huoQuFanYi('qiPao', 'weiBaDaXiao')).toBe('尾巴大小')
    expect(huoQuFanYi('qiPao', 'weiBaMoRen')).toBe('默认')
    expect(huoQuFanYi('qiPao', 'weiBaDa')).toBe('大尾巴')
    expect(huoQuFanYi('qiPao', 'weiBaXiao')).toBe('小尾巴')
    expect(huoQuFanYi('qiPao', 'weiBaWu')).toBe('无尾巴')
    expect(huoQuFanYi('qiPao', 'weiBaWeiZhi')).toBe('尾巴位置')
    expect(huoQuFanYi('qiPao', 'weiBaShang')).toBe('靠上')
    expect(huoQuFanYi('qiPao', 'weiBaZhong')).toBe('居中')
    expect(huoQuFanYi('qiPao', 'weiBaXia')).toBe('靠下')
    expect(huoQuFanYi('qiPao', 'yuanJiaoDangWei')).toBe('气泡圆角')
    expect(huoQuFanYi('qiPao', 'yuanJiaoXiao')).toBe('小圆角')
    expect(huoQuFanYi('qiPao', 'yuanJiaoZhong')).toBe('中圆角')
    expect(huoQuFanYi('qiPao', 'yuanJiaoDa')).toBe('大圆角')
    expect(huoQuFanYi('qiPao', 'miaoBianBiaoTi')).toBe('气泡描边')
    expect(huoQuFanYi('qiPao', 'miaoBianKai')).toBe('开启描边')
    expect(huoQuFanYi('qiPao', 'miaoBianGuan')).toBe('关闭描边')
    expect(huoQuFanYi('qiPao', 'miaoBianYanSe')).toBe('描边颜色')
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})
