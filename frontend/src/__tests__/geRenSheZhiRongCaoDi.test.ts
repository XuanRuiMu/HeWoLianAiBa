import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { 使用主题仓库 } from '@/stores/主题'
import {
  使用用户设置仓库,
  LIAO_TIAN_BEI_JING_XUAN_XIANG,
  shiYuSheBeiJing,
} from '@/stores/用户设置'
import { huoQuQiPaoCSSBianLiang, QI_PAO_YU_SHE_BIAO } from '@/config/气泡主题'

vi.mock('@/api/社交', () => ({
  huoQuYongHuSheZhi: vi.fn(),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  baoCunQiPao: vi.fn().mockResolvedValue(undefined),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
}))

const fuGaiLuJing = resolve(__dirname, '../styles/zhang-hao-an-quan-rong-cao-di.css')
const fuGaiYuanMa = readFileSync(fuGaiLuJing, 'utf8')
const zhangHaoYuanMa = readFileSync(resolve(__dirname, '../views/账号与安全.vue'), 'utf8')
const zhuTiYuanMa = readFileSync(resolve(__dirname, '../stores/主题.ts'), 'utf8')
const zhuYeYuanMa = readFileSync(resolve(__dirname, '../views/主页内容.vue'), 'utf8')
const ruKouYuanMa = readFileSync(resolve(__dirname, '../main.ts'), 'utf8')

function tiQuAlpha(yangShi: string): number[] {
  const jieGuo: number[] = []
  const zhengZe = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/g
  let piPei: RegExpExecArray | null
  while ((piPei = zhengZe.exec(yangShi)) !== null) {
    jieGuo.push(Number(piPei[1]))
  }
  return jieGuo
}

describe('FP-04 个人设置页融草地覆盖层', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.documentElement.removeAttribute('data-theme')
  })

  it('覆盖层根透明去不透明实色', () => {
    expect(fuGaiYuanMa).toContain('.zhang-hao-an-quan')
    expect(fuGaiYuanMa).toMatch(/background-color:\s*transparent\s*!important/)
    expect(fuGaiYuanMa).toMatch(/background-image:\s*none\s*!important/)
    expect(fuGaiYuanMa).not.toContain('#f6f1e7')
    expect(fuGaiYuanMa).not.toContain('#fffdf7')
    expect(fuGaiYuanMa).not.toContain('#1e1b16')
  })

  it('深浅双主题走全局data-theme单源且区分明显', () => {
    expect(fuGaiYuanMa).toContain(':root[data-theme="light"]')
    expect(fuGaiYuanMa).toContain(':root[data-theme="dark"]')
    expect(zhuTiYuanMa).toContain("setAttribute('data-theme'")
    const qianDuan = fuGaiYuanMa.split(':root[data-theme="dark"]')[0]
    const shenDuan = fuGaiYuanMa.split(':root[data-theme="dark"]')[1] || ''
    const qianAlpha = tiQuAlpha(qianDuan)
    const shenAlpha = tiQuAlpha(shenDuan)
    expect(qianAlpha.length).toBeGreaterThan(0)
    expect(shenAlpha.length).toBeGreaterThan(0)
    expect(qianDuan).toContain('245, 248, 252')
    expect(shenDuan).toContain('20, 24, 40')
  })

  it('透明毛玻璃罩染与主页同源', () => {
    expect(fuGaiYuanMa).toContain('backdrop-filter')
    expect(fuGaiYuanMa).toContain('blur(12px)')
    expect(zhuYeYuanMa).toContain('background: transparent')
    expect(fuGaiYuanMa).toMatch(/\.ming-pian/)
    expect(fuGaiYuanMa).toMatch(/\.zhi-wu-ka-pian/)
    expect(fuGaiYuanMa).toMatch(/\.biao-qian-lan/)
  })

  it('入口已接入覆盖层且WIP零触碰', () => {
    expect(ruKouYuanMa).toContain('zhang-hao-an-quan-rong-cao-di.css')
    expect(zhangHaoYuanMa).toContain('--miZhi: #f6f1e7')
    expect(zhangHaoYuanMa).toContain('background-color: var(--miZhi)')
  })

  it('FP-02双形态与FP-03双槽契约不受损', () => {
    expect([...LIAO_TIAN_BEI_JING_XUAN_XIANG]).toEqual([
      'moRen',
      'miWuSenLin',
      'haiYangZhiLan',
      'fenSeMengJing',
      'yeKongXingHe',
      'miSeTianYuan',
    ])
    expect(shiYuSheBeiJing('moRen')).toBe(true)
    const bianLiang = huoQuQiPaoCSSBianLiang('weiXinLv', 'anYe')
    expect(bianLiang['--qipao-ziJi-beiJing']).toBe(QI_PAO_YU_SHE_BIAO.weiXinLv.beiJing)
    expect(bianLiang['--qipao-duiFang-beiJing']).toBe(QI_PAO_YU_SHE_BIAO.anYe.beiJing)
    expect(fuGaiYuanMa).not.toContain('.beijing-moRen')
    expect(fuGaiYuanMa).not.toContain('--qipao-ziJi-beiJing')
  })

  it('主题切换单源联动无控制台错误', () => {
    const cuoWuJianTing = vi.spyOn(console, 'error').mockImplementation(() => {})
    const jingGaoJianTing = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const zhuTi = 使用主题仓库()
    zhuTi.qieHuanZhuti('浅色')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    zhuTi.qieHuanZhuti('暗色')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    const sheZhi = 使用用户设置仓库()
    expect(sheZhi.liaoTianBeiJing).toBe('moRen')
    expect(cuoWuJianTing).not.toHaveBeenCalled()
    expect(jingGaoJianTing).not.toHaveBeenCalled()
    cuoWuJianTing.mockRestore()
    jingGaoJianTing.mockRestore()
  })

  it('覆盖层DOM挂载零错误且选择器可达', () => {
    const cuoWuJianTing = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rongQi = document.createElement('div')
    rongQi.className = 'zhang-hao-an-quan'
    rongQi.innerHTML = '<div class="ming-pian"></div><nav class="biao-qian-lan"></nav><div class="zhi-wu-ka-pian"></div>'
    document.body.appendChild(rongQi)
    expect(rongQi.querySelector('.ming-pian')).not.toBeNull()
    expect(rongQi.querySelector('.biao-qian-lan')).not.toBeNull()
    expect(rongQi.querySelector('.zhi-wu-ka-pian')).not.toBeNull()
    expect(cuoWuJianTing).not.toHaveBeenCalled()
    cuoWuJianTing.mockRestore()
    rongQi.remove()
  })
})
