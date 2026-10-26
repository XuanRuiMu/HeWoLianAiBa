import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { huoQuFanYi } from '@/config/翻译表'
import WaiGuanJiuDiBianJi from '@/components/外观就地编辑器.vue'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 背景源码 = 读('components/聊天背景设置.vue')
const 气泡源码 = 读('components/气泡主题选择器.vue')
const 编辑器源码 = 读('components/外观就地编辑器.vue')
const 翻译表源码 = 读('config/翻译表.ts')

describe('FP-11 外观编辑器统一重构', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('背景编辑面板追加在模式网格之后，不再在网格内插队', () => {
    expect(背景源码).toMatch(/<\/div>\s*\n\s*<div v-if="编辑模式 === 模式\.键" class="bei-jing-bian-ji-wei">/)
    expect(背景源码).not.toMatch(/v-if="编辑键 === 键\(模式\.键, 项\)"/)
  })

  it('编辑器实时预览：输入与选色都发出 yu-lan 事件', async () => {
    const { mount } = await import('@vue/test-utils')
    const kuang = mount(WaiGuanJiuDiBianJi, {
      props: { biaoTi: 't', mingCheng: '晨雾青', wenZiYanSe: '#000000', zuiDaZiFu: 8, leiBie: 'beiJing' },
      attachTo: document.body,
    })
    await kuang.get('input').setValue('新名字')
    const 预览 = kuang.emitted('yu-lan')
    expect(预览).toBeTruthy()
    expect(预览?.at(-1)?.[0]).toEqual({ mingCheng: '新名字', wenZiYanSe: '#000000' })
    kuang.unmount()
  })

  it('背景卡片名称实时映射预览草稿（显示名与样式都吃预览值）', () => {
    expect(背景源码).toContain('function 显示名(模式: \'qian\' | \'shen\', 项: BeiJingXiangMu): string')
    expect(背景源码).toContain('return 预览值.value.mingCheng')
    expect(背景源码).toContain('const yuLanSe = shiYuLanZhong(模式, 项) && 预览值.value ? 预览值.value.wenZiYanSe : \'\'')
    expect(背景源码).toContain('@yu-lan="更新预览"')
  })

  it('气泡名称与颜色同样实时映射', () => {
    expect(气泡源码).toContain('shiXianYuShe')
    expect(气泡源码).toContain('shiXianTiaoMu')
    expect(气泡源码).toContain('gengXinYuSheYuLan')
    expect(气泡源码).toContain('gengXinTiaoMuYuLan')
  })

  it('删除的提示文案在源码与翻译表中都不复存在', () => {
    expect(翻译表源码).not.toContain('waiGuanHuiCheBaoCun')
    expect(翻译表源码).not.toContain('waiGuanShuangJiBianJi')
    expect(翻译表源码).not.toContain('beiJingSheZhiShuoMing')
    expect(翻译表源码).not.toContain('beiJingBianJiTiShi')
    expect(编辑器源码).not.toContain('jiu-di-bian-ji-yan-se-biao-ti')
    expect(huoQuFanYi('sheZhi', 'caiJianBeiJing')).toBe('裁剪背景')
    expect(huoQuFanYi('sheZhi', 'caiJianQiPao')).toBe('裁剪气泡')
  })

  it('名称绝对居中：背景卡按钮不再为控件预留顶部空间', () => {
    expect(背景源码).toContain('padding: var(--jiange-6) var(--jiange-12);')
  })

  it('自定义上传接入统一图片裁剪（背景 3:4、气泡 2:1）', () => {
    expect(背景源码).toContain('TuPianCaiJian')
    expect(背景源码).toContain(':kuan-gao-bi="0.75"')
    expect(气泡源码).toContain('TuPianCaiJian')
    expect(气泡源码).toContain(':kuan-gao-bi="2"')
    const 裁剪工具 = readFileSync(resolve(源码根, 'utils/图片裁剪.ts'), 'utf8')
    expect(裁剪工具).toContain("from 'cropperjs'")
    expect(裁剪工具).toContain('export async function daoChuCaiJianWenJian')
    expect(裁剪工具).not.toContain('jiSuanYuanJu')
  })

  it('头像裁剪链路改用通用图片裁剪组件，旧专用实现已删除', () => {
    const 安全源码 = 读('views/账号与安全.vue')
    expect(安全源码).toContain("@/components/图片裁剪.vue")
    expect(安全源码).not.toContain('头像裁剪.vue')
    expect(() => readFileSync(resolve(源码根, 'components/头像裁剪.vue'), 'utf8')).toThrow()
    expect(() => readFileSync(resolve(源码根, 'utils/头像裁剪.ts'), 'utf8')).toThrow()
  })
})
