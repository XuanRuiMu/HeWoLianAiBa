import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import QiPaoZhuTiXuanZeQi from '@/components/气泡主题选择器.vue'
import QiPaoSheZhi from '@/views/气泡设置.vue'
import LiaoTianMianBan from '@/components/聊天/聊天面板.vue'
import { huoQuQiPaoDingYi } from '@/config/气泡主题'
import { huoQuFanYi } from '@/config/翻译表'
import {
  QI_PAO_WEI_BA_MO_SHI_LIE_BIAO,
  QI_PAO_WEI_BA_WEI_ZHI_LIE_BIAO,
  QI_PAO_YUAN_JIAO_DANG_WEI_LIE_BIAO,
  huoQuMiaoBianYangShi,
  huoQuQiPaoWeiBaBianLiang,
  huoQuQiPaoXingZhuangBianLiang,
  huoQuWeiBaChiCun,
  huoQuWeiBaMiaoBianYanSe,
  huoQuWeiBaWeiZhiZhi,
  huoQuYuanJiaoDangZhi,
  type WaiGuanTiaoMu,
} from '@/config/外观自定义'
import { 使用用户设置仓库 } from '@/stores/用户设置'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')
const 容器源 = 读('components/聊天/气泡容器.vue')
const 卡片源 = 读('components/气泡主题选择器.vue')
const 裁剪源 = 读('components/图片裁剪.vue')
const 尾巴源 = 读('components/聊天/气泡尾巴.vue')

const MEI_TI_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)

function zaoTiaoMu(xuHao: number): WaiGuanTiaoMu {
  return {
    id: 'qipao-' + xuHao,
    mingCheng: '自定义气泡' + xuHao,
    tuDiZhi: MEI_TI_URL,
    wenZiYanSe: '#FFFFFF',
  }
}

function 列出源码(目录: string, 后缀: RegExp): string[] {
  const 出: string[] = []
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    const 全 = join(目录, 项.name)
    if (项.isDirectory()) {
      if (项.name === '__tests__' || 项.name === 'node_modules') continue
      出.push(...列出源码(全, 后缀))
    } else if (后缀.test(项.name)) {
      出.push(relative(源码根, 全).replace(/\\/g, '/'))
    }
  }
  return 出.sort()
}

function 持有形状赋值的文件(): string[] {
  const teZheng = /'--qipao-(?:yuanjiao|weiba-shang|weiba-kuan|weiba-ban|weiba-xian-shi|weiba-miao-bian|miaoBian-yangShi)'\s*:/
  return 列出源码(源码根, /\.(vue|ts|css|js|html)$/).filter((文件) => teZheng.test(读(文件)))
}

describe('FP-02b 气泡形状档位映射', () => {
  it('尾巴档位映射几何令牌：默认/大/小/无', () => {
    expect(huoQuWeiBaChiCun('moRen')).toEqual({ kuan: 'var(--qipao-weiba-kuan-ju-li)', ban: 'var(--qipao-weiba-ban-ju-li)' })
    expect(huoQuWeiBaChiCun('da')).toEqual({ kuan: 'var(--qipao-weiba-kuan-da)', ban: 'var(--qipao-weiba-ban-da)' })
    expect(huoQuWeiBaChiCun('xiao')).toEqual({ kuan: 'var(--qipao-weiba-kuan-xiao)', ban: 'var(--qipao-weiba-ban-xiao)' })
    expect(huoQuWeiBaChiCun('wu')).toEqual({ kuan: '0px', ban: '0px' })
    expect([...QI_PAO_WEI_BA_MO_SHI_LIE_BIAO]).toEqual(['moRen', 'da', 'xiao', 'wu'])
  })

  it('尾巴位置档位映射：靠上贴合首行中心并避开圆角，居中/靠下随档位高计算', () => {
    expect(huoQuWeiBaWeiZhiZhi('shang')).toBe(
      'max(var(--qipao-yuanjiao), calc(var(--qipao-weiba-shang-bu-ju, var(--qipao-nei-ju-shang)) + 0.5lh - var(--qipao-weiba-ban)))',
    )
    expect(huoQuWeiBaWeiZhiZhi('zhong')).toBe('calc(50% - var(--qipao-weiba-ban))')
    expect(huoQuWeiBaWeiZhiZhi('xia')).toBe(
      'calc(100% - max(var(--qipao-weiba-ju-li), var(--qipao-yuanjiao)) - var(--qipao-weiba-ban) * 2)',
    )
    for (const zhi of QI_PAO_WEI_BA_WEI_ZHI_LIE_BIAO) {
      expect(huoQuWeiBaWeiZhiZhi(zhi)).not.toContain('var(--qipao-weiba-shang)')
      expect(huoQuWeiBaWeiZhiZhi(zhi)).not.toContain('--qipao-weiba-pian')
    }
    for (const zhi of QI_PAO_WEI_BA_MO_SHI_LIE_BIAO) {
      const bianLiang = huoQuQiPaoWeiBaBianLiang(zhi, 'shang', false, '')
      expect(bianLiang['--qipao-weiba-kuan']).toBe(huoQuWeiBaChiCun(zhi).kuan)
      expect(bianLiang['--qipao-weiba-ban']).toBe(huoQuWeiBaChiCun(zhi).ban)
      expect(bianLiang['--qipao-weiba-xian-shi']).toBe(zhi === 'wu' ? 'none' : 'block')
    }
  })

  it('描边颜色分流：开且合法为实色，关或非法为 transparent', () => {
    expect(huoQuWeiBaMiaoBianYanSe(true, '#333333')).toBe('#333333')
    expect(huoQuWeiBaMiaoBianYanSe(true, ' #aabbcc ')).toBe('#aabbcc')
    expect(huoQuWeiBaMiaoBianYanSe(true, 'red')).toBe('transparent')
    expect(huoQuWeiBaMiaoBianYanSe(false, '#333333')).toBe('transparent')
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

  it('设计令牌保留档位子令牌且默认值不变，旧固定外伸令牌已删除', () => {
    const lingPai = 读('styles/设计令牌.css')
    expect(lingPai).toContain('--qipao-yuanjiao-ju-li: 6px;')
    expect(lingPai).toContain('--qipao-yuanjiao: var(--qipao-yuanjiao-ju-li);')
    expect(lingPai).toContain('--qipao-weiba-kuan-ju-li: 6px;')
    expect(lingPai).toContain('--qipao-weiba-ban-ju-li: 5px;')
    expect(lingPai).toContain('--qipao-weiba-kuan: var(--qipao-weiba-kuan-ju-li);')
    expect(lingPai).toContain('--qipao-weiba-ju-li: 13px;')
    expect(lingPai).toContain('--qipao-weiba-shang: var(--qipao-weiba-ju-li);')
    expect(lingPai).toContain('--qipao-weiba-miao-bian-kuan: 1.5px;')
    expect(lingPai).not.toContain('--qipao-weiba-pian')
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

  it('唯一 bundle 同时携带颜色键与形状键并随档位联动，描边关闭时为 transparent/none', () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    const moRen = cang.qiPaoCSSBianLiang
    expect(moRen['--qipao-ziJi-beiJing']).toBe(huoQuQiPaoDingYi(cang.qiPaoZiJi).beiJing)
    expect(moRen['--qipao-duiFang-wenBen']).toBe(huoQuQiPaoDingYi(cang.qiPaoAI).wenBen)
    expect(moRen['--qipao-yuanjiao']).toBe('var(--qipao-yuanjiao-ju-li)')
    expect(moRen['--qipao-weiba-kuan']).toBe('var(--qipao-weiba-kuan-ju-li)')
    expect(moRen['--qipao-weiba-ban']).toBe('var(--qipao-weiba-ban-ju-li)')
    expect(moRen['--qipao-weiba-shang']).toBe(huoQuWeiBaWeiZhiZhi('shang'))
    expect(moRen['--qipao-weiba-xian-shi']).toBe('block')
    expect(moRen['--qipao-weiba-miao-bian']).toBe('transparent')
    expect(moRen['--qipao-miaoBian-yangShi']).toBe('none')
    cang.shiYongQiPaoXingZhuang({ weiBaMoShi: 'wu', weiBaWeiZhi: 'zhong', yuanJiaoDangWei: 'xiao', miaoBianKaiQi: true, miaoBianYanSe: '#000000' })
    const gai = cang.qiPaoCSSBianLiang
    expect(gai['--qipao-yuanjiao']).toBe('var(--qipao-yuanjiao-dang-xiao)')
    expect(gai['--qipao-weiba-shang']).toBe('calc(50% - var(--qipao-weiba-ban))')
    expect(gai['--qipao-weiba-kuan']).toBe('0px')
    expect(gai['--qipao-weiba-xian-shi']).toBe('none')
    expect(gai['--qipao-weiba-miao-bian']).toBe('#000000')
    expect(gai['--qipao-miaoBian-yangShi']).toBe('0 0 0 1.5px #000000')
    expect(gai['--qipao-ziJi-beiJing']).toBe(huoQuQiPaoDingYi(cang.qiPaoZiJi).beiJing)
    expect(huoQuQiPaoXingZhuangBianLiang({
      weiBaMoShi: 'wu',
      weiBaWeiZhi: 'zhong',
      yuanJiaoDangWei: 'xiao',
      miaoBianKaiQi: true,
      miaoBianYanSe: '#000000',
    })['--qipao-weiba-xian-shi']).toBe('none')
  })

  it('真实聊天面板经 use聊天皮肤 消费同一份 bundle：非默认档位抵达渲染节点', async () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    cang.shiYongQiPaoXingZhuang({ yuanJiaoDangWei: 'da', weiBaMoShi: 'da', miaoBianKaiQi: true, miaoBianYanSe: '#FF0000' })
    const kuang = mount(LiaoTianMianBan, { attachTo: document.body })
    const mianBan = kuang.element as HTMLElement
    expect(mianBan.style.getPropertyValue('--qipao-yuanjiao')).toBe(huoQuYuanJiaoDangZhi('da'))
    expect(mianBan.style.getPropertyValue('--qipao-weiba-kuan')).toBe(huoQuWeiBaChiCun('da').kuan)
    expect(mianBan.style.getPropertyValue('--qipao-weiba-miao-bian')).toBe('#FF0000')
    expect(mianBan.style.getPropertyValue('--qipao-miaoBian-yangShi')).toBe(huoQuMiaoBianYangShi(true, '#FF0000'))
    expect(mianBan.style.getPropertyValue('--qipao-ziJi-beiJing')).toBe(huoQuQiPaoDingYi(cang.qiPaoZiJi).beiJing)
    kuang.unmount()
  })

  it('描边关闭时真实聊天面板注入 none 与 transparent 而非缺失', async () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    cang.shiYongQiPaoXingZhuang({ miaoBianKaiQi: false })
    const kuang = mount(LiaoTianMianBan, { attachTo: document.body })
    expect((kuang.element as HTMLElement).style.getPropertyValue('--qipao-miaoBian-yangShi')).toBe('none')
    expect((kuang.element as HTMLElement).style.getPropertyValue('--qipao-weiba-miao-bian')).toBe('transparent')
    kuang.unmount()
  })

  it('气泡设置页预览与真实聊天同源：形状档位抵达预览面板节点', async () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    cang.shiYongQiPaoXingZhuang({ yuanJiaoDangWei: 'da', weiBaMoShi: 'da', miaoBianKaiQi: true, miaoBianYanSe: '#FF0000' })
    const kuang = mount(QiPaoSheZhi, { attachTo: document.body })
    const mianBan = kuang.get('.liao-tian-mian-ban').element as HTMLElement
    expect(mianBan.style.getPropertyValue('--qipao-yuanjiao')).toBe(huoQuYuanJiaoDangZhi('da'))
    expect(mianBan.style.getPropertyValue('--qipao-weiba-kuan')).toBe(huoQuWeiBaChiCun('da').kuan)
    expect(mianBan.style.getPropertyValue('--qipao-miaoBian-yangShi')).toBe(huoQuMiaoBianYangShi(true, '#FF0000'))
    kuang.unmount()
  })

  it('形状变量赋值收敛于唯一配置源：config/外观自定义.ts', () => {
    expect(持有形状赋值的文件()).toEqual(['config/外观自定义.ts'])
  })

  it('选择器根节点注入同一份 bundle，卡片与真实聊天同源消费', () => {
    setActivePinia(createPinia())
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const gen = kuang.element as HTMLElement
    expect(gen.style.getPropertyValue('--qipao-yuanjiao')).toBe('var(--qipao-yuanjiao-ju-li)')
    expect(gen.style.getPropertyValue('--qipao-weiba-kuan')).toBe('var(--qipao-weiba-kuan-ju-li)')
    expect(gen.style.getPropertyValue('--qipao-miaoBian-yangShi')).toBe('none')
    expect(gen.style.getPropertyValue('--qipao-ziJi-beiJing')).toBe(huoQuQiPaoDingYi('weiXinLv').beiJing)
    expect(容器源).toContain('border-radius: var(--qipao-yuanjiao)')
    expect(容器源).toContain('<QiPaoWeiBa')
    kuang.unmount()
  })
})

describe('FP-02b 图片态尾巴与气泡背景同源', () => {
  it('尾巴实现只有共享组件一处，三处消费不再各自绘制三角', () => {
    expect(尾巴源).toContain('clip-path: polygon(')
    expect(尾巴源).toContain('--qipao-weiba-tian-chong')
    expect(尾巴源).toContain('--qipao-weiba-miao-bian')
    expect(容器源).toContain("import QiPaoWeiBa from '@/components/聊天/气泡尾巴.vue'")
    expect(容器源).toContain('<QiPaoWeiBa :ce="shiBenRen ? \'you\' : \'zuo\'" />')
    expect(卡片源).toContain("import QiPaoWeiBa from '@/components/聊天/气泡尾巴.vue'")
    expect(卡片源).toContain('<QiPaoWeiBa :ce="zu.jian === \'ziJi\' ? \'you\' : \'zuo\'" />')
    for (const 源 of [容器源, 卡片源, 裁剪源]) {
      expect(源).not.toContain('border-left: var(--qipao-weiba-kuan) solid')
      expect(源).not.toContain('border-right: var(--qipao-weiba-kuan) solid')
      expect(源).not.toContain('--qipao-weiba-pian')
    }
    expect(容器源).not.toContain('.qipao-neirong::after')
    expect(卡片源).not.toContain('.qi-pao-xuan-xiang--ka::after')
    expect(裁剪源).not.toContain('.qipao-neirong--benren::after')
  })

  it('图片态尾巴与气泡共用同一背景变量，不再存在独立采样色', async () => {
    setActivePinia(createPinia())
    const cang = 使用用户设置仓库()
    cang.waiGuan = {
      beiJing: [],
      qiPao: [zaoTiaoMu(1)],
      beiJingFuGai: {},
      qiPaoFuGai: {},
      dangQianQiPao: { ziJi: 'qipao-1', ai: '' },
    }
    const kuang = mount(QiPaoZhuTiXuanZeQi, { attachTo: document.body })
    const gen = kuang.element as HTMLElement
    expect(gen.style.getPropertyValue('--qipao-ziJi-beiJing')).toContain('url(')
    expect(gen.style.getPropertyValue('--qipao-ziJi-weiBa')).toBe('')
    expect(gen.style.getPropertyValue('--qipao-duiFang-weiBa')).toBe('')
    expect(卡片源).toContain('--qipao-weiba-tian-chong: var(--qipao-ziJi-beiJing')
    expect(容器源).toContain('--qipao-weiba-tian-chong: var(--qipao-nei-rong-bei-jing)')
    expect('qiPaoWeiBaYanSeLu' in cang).toBe(false)
    kuang.unmount()
  })

  it('AI 侧与本人侧同理，真实聊天不存在采样缓存与异步补色', () => {
    expect(容器源).not.toContain('caiJiBianYuanYanSe')
    expect(裁剪源).not.toContain('caiJiBianYuanYanSe')
    expect(卡片源).not.toContain('caiJiBianYuanYanSe')
    expect(读('stores/用户设置.ts')).not.toContain('caiJiBianYuanYanSe')
    expect(读('composables/use聊天皮肤.ts')).not.toContain('queRenQiPaoWeiBaYanSe')
  })
})

describe('FP-02b 预览单侧覆盖与真实应用一致', () => {
  it('裁剪预览只覆盖上传侧气泡：自己侧覆盖benren，AI侧覆盖jiaose', () => {
    expect(裁剪源).toContain('.caijian-yulan--ce-ziJi :deep(.qipao-neirong--benren)')
    expect(裁剪源).toContain('.caijian-yulan--ce-ai :deep(.qipao-neirong--jiaose)')
    expect(裁剪源).not.toContain('.caijian-yulan--qiPao :deep(.qipao-neirong)')
  })

  it('选择器把上传侧别传给裁剪组件，预览尾巴与气泡填充同一变量', () => {
    expect(卡片源).toContain(':yu-lan-ce-zhong="shangChuanFang"')
    expect(裁剪源).toContain("yuLanCeZhong?: 'ziJi' | 'ai'")
    expect(裁剪源).toContain('--qipao-weiba-tian-chong: var(--caijian-yulan-fu-gai) !important')
    expect(裁剪源).toContain('Object.assign(yangShi, cang.qiPaoCSSBianLiang)')
    expect(裁剪源).not.toContain('--caijian-yulan-wei-ba')
    expect(裁剪源).toContain("'caijian-yulan--ce-' + props.yuLanCeZhong")
  })

  it('预览不再保留旧边框色覆盖链', () => {
    expect(裁剪源).not.toContain('caijian-yulan-wei-ba')
    expect(裁剪源).not.toContain('border-left-color:')
    expect(裁剪源).not.toContain('border-right-color:')
  })
})

describe('FP-02b 形状设置 UI 与翻译', () => {
  it('形状区块档位 chips 点击后 store 与选择器根节点注入同步变化', async () => {
    setActivePinia(createPinia())
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const cang = 使用用户设置仓库()
    const gen = kuang.element as HTMLElement
    const dangKa = kuang.findAll('.qi-pao-dang-wei-ka')
    expect(dangKa.length).toBe(4 + 3 + 3 + 2)
    await dangKa[1].trigger('click')
    expect(cang.qiPaoWeiBaMoShi).toBe('da')
    expect(gen.style.getPropertyValue('--qipao-weiba-kuan')).toBe(huoQuWeiBaChiCun('da').kuan)
    await dangKa[11].trigger('click')
    expect(cang.qiPaoMiaoBianKaiQi).toBe(true)
    expect(gen.style.getPropertyValue('--qipao-miaoBian-yangShi')).toBe(huoQuMiaoBianYangShi(true, cang.qiPaoMiaoBianYanSe))
    expect(gen.style.getPropertyValue('--qipao-weiba-miao-bian')).toBe(cang.qiPaoMiaoBianYanSe)
    await kuang.get('.qi-pao-miao-bian-se-kuai').trigger('click')
    expect(cang.qiPaoMiaoBianYanSe).toBe('#FFFFFF')
    expect(gen.style.getPropertyValue('--qipao-miaoBian-yangShi')).toBe(huoQuMiaoBianYangShi(true, '#FFFFFF'))
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
