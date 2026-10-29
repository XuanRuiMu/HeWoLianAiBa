import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import QiPaoZhuTiXuanZeQi from '@/components/气泡主题选择器.vue'
import { huoQuQiPaoDingYi } from '@/config/气泡主题'
import { QI_PAO_WEN_AN } from '@/config/气泡主题文案'
import { huoQuQiPaoBeiJingZhi, type WaiGuanTiaoMu } from '@/config/外观自定义'
import { 使用用户设置仓库 } from '@/stores/用户设置'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')
const 卡片源 = 读('components/气泡主题选择器.vue')
const 容器源 = 读('components/聊天/气泡容器.vue')

const MEI_TI_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=11111111-1111-4111-8111-111111111111&t=1&s=' + 'b'.repeat(64)

function zaoTiaoMu(xuHao: number): WaiGuanTiaoMu {
  return {
    id: 'qipao-' + xuHao,
    mingCheng: '自定义气泡' + xuHao,
    tuDiZhi: MEI_TI_URL,
    wenZiYanSe: '#FFFFFF',
  }
}

function 取规则(源: string, 选择器: string): string {
  const qi = 源.indexOf(选择器 + ' {')
  if (qi < 0) return ''
  const hua = 源.indexOf('{', qi)
  const zhong = 源.indexOf('}', hua)
  return 源.slice(hua + 1, zhong)
}

describe('FP06 气泡主题卡片真实气泡形状', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('两个大功能框换位：AI气泡在前（桌面左列），我的气泡在后（桌面右列）', () => {
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const biaoTiMen = kuang.findAll('.qi-pao-ce-ti').map((jie) => jie.text())
    expect(biaoTiMen).toEqual([QI_PAO_WEN_AN.aiBiaoTi, QI_PAO_WEN_AN.ziJiBiaoTi])
    const ce = kuang.findAll('.qi-pao-ce')
    expect(ce[0].text()).toContain(QI_PAO_WEN_AN.aiBiaoTi)
    expect(ce[1].text()).toContain(QI_PAO_WEN_AN.ziJiBiaoTi)
    kuang.unmount()
  })

  it('双栏网格契约保持：auto-fit 260px 两列，窄屏单列时 AI 组落在上方', () => {
    expect(取规则(卡片源, '.qi-pao-liang-lan')).toContain('grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))')
  })

  it('卡片尾巴几何与真实气泡容器消费同一共享实现', () => {
    expect(卡片源).toContain("import QiPaoWeiBa from '@/components/聊天/气泡尾巴.vue'")
    expect(容器源).toContain("import QiPaoWeiBa from '@/components/聊天/气泡尾巴.vue'")
    expect(卡片源).toContain('<QiPaoWeiBa :ce="zu.jian === \'ziJi\' ? \'you\' : \'zuo\'" />')
    expect(容器源).toContain('<QiPaoWeiBa :ce="shiBenRen ? \'you\' : \'zuo\'" />')
    const 尾巴源 = 读('components/聊天/气泡尾巴.vue')
    for (const shengMing of [
      'var(--qipao-weiba-shang)',
      'var(--qipao-weiba-ban)',
      'var(--qipao-weiba-kuan)',
      'var(--qipao-weiba-tian-chong',
      'var(--qipao-weiba-miao-bian',
    ]) {
      expect(尾巴源, '共享尾巴缺 ' + shengMing).toContain(shengMing)
    }
    expect(卡片源).toContain('--qipao-weiba-tian-chong: var(--qipao-ziJi-beiJing')
    expect(卡片源).toContain('--qipao-weiba-tian-chong: var(--qipao-duiFang-beiJing')
    expect(容器源).toContain('--qipao-weiba-tian-chong: var(--qipao-nei-rong-bei-jing)')
    for (const 源 of [卡片源, 容器源]) {
      expect(源).not.toContain('--qipao-ziJi-weiBa')
      expect(源).not.toContain('--qipao-duiFang-weiBa')
    }
  })

  it('卡片主体形状与真实气泡同源：同圆角令牌、无边框、同字号行高令牌', () => {
    const kaKuai = 取规则(卡片源, '.qi-pao-xuan-xiang--ka')
    expect(kaKuai).toContain('border: none')
    expect(kaKuai).toContain('border-radius: var(--qipao-yuanjiao)')
    expect(kaKuai).toContain('font-size: var(--qipao-zihao)')
    expect(kaKuai).toContain('line-height: var(--qipao-hangao)')
    const rongQiKuai = 取规则(容器源, '.qipao-neirong')
    expect(rongQiKuai).toContain('border: none')
    expect(rongQiKuai).toContain('border-radius: var(--qipao-yuanjiao)')
    expect(rongQiKuai).toContain('font-size: var(--qipao-zihao)')
    expect(rongQiKuai).toContain('line-height: var(--qipao-hangao)')
  })

  it('名称文字左对齐，与真实气泡 text-align 同向', () => {
    expect(取规则(卡片源, '.qi-pao-xuan-xiang-wen')).toContain('justify-content: flex-start')
    expect(取规则(容器源, '.qipao-neirong')).toContain('text-align: left')
  })

  it('卡片宽度由名称文本撑开（真实气泡同款收缩包裹），量宽伪元素与可见名称同源', async () => {
    const chiKuai = 取规则(卡片源, '.qi-pao-xuan-xiang--ka::before')
    expect(chiKuai).toContain('content: attr(data-ming-cheng)')
    expect(chiKuai).toContain('height: 0')
    expect(chiKuai).toContain('visibility: hidden')
    expect(chiKuai).toContain('white-space: nowrap')
    expect(卡片源).toContain(':data-ming-cheng="shiXianYuShe(zu.jian, yuShe)"')
    expect(卡片源).toContain(':data-ming-cheng="shiXianTiaoMu(zu.jian, tiaoMu)"')
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const ka = kuang.get('[data-yu-she="weiXinLv"]')
    expect(ka.attributes('data-ming-cheng')).toBe(ka.find('.qi-pao-xuan-xiang-wen-nei').text())
    kuang.unmount()
  })

  it('预设卡片内联注入真实聊天同名背景变量，尾巴颜色即气泡颜色', () => {
    const kuang = mount(QiPaoZhuTiXuanZeQi)
    const ce = kuang.findAll('.qi-pao-ce')
    const aiCe = ce.find((qu) => qu.text().includes(QI_PAO_WEN_AN.aiBiaoTi))
    const ziJiCe = ce.find((qu) => qu.text().includes(QI_PAO_WEN_AN.ziJiBiaoTi))
    expect(aiCe).toBeTruthy()
    expect(ziJiCe).toBeTruthy()
    const aiKa = aiCe!.get('[data-yu-she="weiXinLv"]').element as HTMLElement
    const ziJiKa = ziJiCe!.get('[data-yu-she="weiXinLv"]').element as HTMLElement
    const lv = huoQuQiPaoDingYi('weiXinLv').beiJing
    expect(ziJiKa.style.getPropertyValue('--qipao-ziJi-beiJing')).toBe(lv)
    expect(aiKa.style.getPropertyValue('--qipao-duiFang-beiJing')).toBe(lv)
    kuang.unmount()
  })

  it('自定义气泡卡片同样注入同名变量，值与真实聊天的图片气泡背景同函数产出', () => {
    const zhi = huoQuQiPaoBeiJingZhi(zaoTiaoMu(1).tuDiZhi, zaoTiaoMu(1).wenZiYanSe)
    expect(zhi).toContain('linear-gradient')
    expect(zhi).toContain('url(')
    const zhuRu: string[] = []
    const jianShi = vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty').mockImplementation(function (
      this: CSSStyleDeclaration,
      mingCheng: string,
      zhi: string,
    ) {
      if (mingCheng.startsWith('--')) zhuRu.push(mingCheng + '=' + zhi)
    })
    try {
      const cang = 使用用户设置仓库()
      cang.waiGuan = {
        beiJing: [],
        qiPao: [zaoTiaoMu(1)],
        beiJingFuGai: {},
        qiPaoFuGai: {},
        dangQianQiPao: { ziJi: '', ai: '' },
      }
      const kuang = mount(QiPaoZhuTiXuanZeQi)
      expect(zhuRu).toContain('--qipao-ziJi-beiJing=' + zhi)
      kuang.unmount()
    } finally {
      jianShi.mockRestore()
    }
  })
})
