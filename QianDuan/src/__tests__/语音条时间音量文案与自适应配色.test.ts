import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import 语音气泡 from '@/components/聊天/语音气泡.vue'
import { geShiHuaYuYinBoFangShiJian, geShiHuaYuYinShiChang } from '@/composables/use语音播放'
import { sheZhiYuYinYinLiang, 语音音量表 } from '@/utils/语音音量存储'
import { DUO_MEI_TI_PEI_ZHI } from '@/config/消息配置'

const 组件源 = readFileSync(resolve(__dirname, '../components/聊天/语音气泡.vue'), 'utf8')
const 令牌源 = readFileSync(resolve(__dirname, '../styles/设计令牌.css'), 'utf8')

function 挂语音(覆盖: Record<string, unknown> = {}) {
  return mount(语音气泡, {
    props: {
      xiaoXi: { id: 'y-1', mei_ti_shi_chang_hao_miao: 4800 },
      boFangZhong: false,
      xuanZhong: true,
      jinDuMiao: 3.1,
      zongMiao: 4.8,
      ...覆盖,
    },
  })
}

beforeEach(() => {
  localStorage.clear()
  语音音量表.clear()
})

describe('语音条播放时间与音量文案', () => {
  it('当前时间与总时间使用同一套一位小数格式，越界值夹紧且非数值归零', () => {
    expect(DUO_MEI_TI_PEI_ZHI.yuYinShiJianXiaoShuWei).toBe(1)
    expect(geShiHuaYuYinBoFangShiJian(3.1, 4.8)).toBe('3.1/4.8')
    expect(geShiHuaYuYinBoFangShiJian(0, 10)).toBe('0.0/10.0')
    expect(geShiHuaYuYinBoFangShiJian(9, 4.8)).toBe('4.8/4.8')
    expect(geShiHuaYuYinBoFangShiJian(-2, -3)).toBe('0.0/0.0')
    expect(geShiHuaYuYinBoFangShiJian(Number.NaN, Number.POSITIVE_INFINITY)).toBe('0.0/0.0')
    expect(geShiHuaYuYinShiChang({ mei_ti_shi_chang_hao_miao: 4800 })).toBe('5″')
  })

  it('选中语音时第一行显示当前/总时间，第二行显示本条语音音量百分比', () => {
    const 包 = 挂语音()
    expect(包.find('.yuyin-shijian-wenben').text()).toBe('3.1/4.8')
    expect(包.find('.yuyin-yinliang-wenben').text()).toBe('100%')
    expect(包.get('input[type="range"]').attributes('aria-valuetext')).toBe('3.1/4.8')
    expect(包.find('.yuyin-yinliang-wenben').attributes('aria-hidden')).toBe('true')
    包.unmount()
  })

  it('音量文案随每条语音独立音量变化，顶端为两倍基准，不再写死魔法数', () => {
    sheZhiYuYinYinLiang({ id: 'y-1' }, 1)
    const 包 = 挂语音()
    expect(包.find('.yuyin-yinliang-wenben').text()).toBe('200%')
    包.unmount()
  })

  it('未选中时只保留气泡内时长，不渲染两行控制文案', () => {
    const 包 = 挂语音({ xuanZhong: false })
    expect(包.find('.yuyin-shijian-wenben').exists()).toBe(false)
    expect(包.find('.yuyin-yinliang-wenben').exists()).toBe(false)
    expect(包.find('.yuyin-shichang').text()).toBe('5″')
    包.unmount()
  })
})

describe('语音条数值颜色跟随气泡主色并保证页面可读', () => {
  it('双方气泡各自读取自己的背景变量，与页面文字色混合且保留兜底色', () => {
    expect(组件源).toMatch(
      /\.yuyin-shuzhi\s*\{[^}]*color:\s*var\(--wenben-zhuse\);[^}]*color:\s*color-mix\(\s*in srgb,[^}]*var\(--qipao-duiFang-beiJing,\s*var\(--xiaoxi-jiaose-beijing\)\)/s,
    )
    expect(组件源).toMatch(
      /\.yuyin-kongzhi-qu--benren\s+\.yuyin-shuzhi\s*\{[^}]*color:\s*var\(--wenben-zhuse\);[^}]*color:\s*color-mix\(\s*in srgb,[^}]*var\(--qipao-ziJi-beiJing,\s*var\(--xiaoxi-yonghu-beijing\)\)/s,
    )
    expect(组件源).not.toMatch(/color:\s*(#2e7d32|#4caf50|green)/)
    expect(令牌源).toContain('--yuyin-shuzhi-zihao: 11px;')
    expect(令牌源).not.toContain('--yuyin-fenge-xian')
    expect(组件源).not.toContain('border-inline')
    expect(令牌源).not.toContain('--yuyin-shuzhi-shijian-kuan')
    expect(令牌源).not.toContain('--yuyin-shuzhi-yinliang-kuan')
  })

  it('数字使用等宽字形，两行共享同一网格数值轨道，播放时文本不抖动', () => {
    const 数值规则 = 组件源.match(/\.yuyin-shuzhi\s*\{[^}]*\}/)?.[0] ?? ''
    expect(数值规则).toContain('font-variant-numeric: tabular-nums')
    expect(数值规则).toContain('white-space: nowrap')
    expect(组件源).not.toMatch(/var\(\s*--yuyin-shuzhi-shijian-kuan/)
    expect(组件源).not.toMatch(/var\(\s*--yuyin-shuzhi-yinliang-kuan/)
    expect(组件源).toMatch(/\.yuyin-shijian-wenben\s*\{[^}]*grid-area: shijian/)
    expect(组件源).toMatch(/\.yuyin-yinliang-wenben\s*\{[^}]*grid-area: baifenbi/)
    const 时间规则 = 组件源.match(/\.yuyin-shijian-wenben\s*\{[^}]*\}/)?.[0] ?? ''
    const 音量规则 = 组件源.match(/\.yuyin-yinliang-wenben\s*\{[^}]*\}/)?.[0] ?? ''
    expect(时间规则).toContain('min-width: var(--yuyin-shijian-wenben-zui-xiao-kuan)')
    expect(音量规则).toContain('min-width: var(--yuyin-yinliang-wenben-zui-xiao-kuan)')
    expect(时间规则).toContain('justify-self: stretch')
    expect(时间规则).toContain('text-align: center')
    expect(音量规则).toContain('justify-self: stretch')
    expect(音量规则).toContain('text-align: center')
    expect(令牌源).toContain('--yuyin-shijian-wenben-zui-xiao-kuan: 9ch;')
    expect(令牌源).toContain('--yuyin-yinliang-wenben-zui-xiao-kuan: 4ch;')
    const 网格规则 = 组件源.match(/\.yuyin-kongzhi-qu\s*\{[^}]*\}/)?.[0] ?? ''
    expect(网格规则).toContain('display: grid')
    expect(网格规则).toContain('justify-items: center')
    expect(网格规则).toContain('align-items: center')
    expect(网格规则).toContain('minmax(var(--yuyin-jindu-zui-xiao-kuan), 1fr)')
  })

  it('横条格用显式修饰类直配网格槽位，不依赖 :has() 做布局路由', () => {
    expect(组件源).toContain('class="yuyin-hengtiao-ge yuyin-hengtiao-ge--jindu"')
    expect(组件源).toContain('class="yuyin-hengtiao-ge yuyin-hengtiao-ge--yinliang"')
    expect(组件源).toMatch(/\.yuyin-hengtiao-ge--jindu\s*\{[^}]*grid-area: jindu/)
    expect(组件源).toMatch(/\.yuyin-hengtiao-ge--yinliang\s*\{[^}]*grid-area: yinliang/)
    expect(组件源).not.toContain(':has(')
  })

  it('本人态用同一网格镜像列序为图标|条|数值，无行级order补丁', () => {
    expect(组件源).toContain('.yuyin-kongzhi-qu--benren')
    expect(组件源).toContain("'tubiao jindu shijian'")
    expect(组件源).toContain("'laba yinliang baifenbi'")
    expect(组件源).not.toContain('nth-child')
    expect(组件源).not.toContain('yuyin-jindu-qu')
    expect(组件源).not.toContain('yuyin-yinliang-qu')
    expect(组件源.match(/row-reverse/g)).toHaveLength(1)
    expect(组件源).toContain('.yuyin-neirong--benren {\n  flex-direction: row-reverse;')
    expect(组件源).not.toMatch(/(?:^|[\s{;])order:/)
    const 镜像规则 = 组件源.match(/\.yuyin-kongzhi-qu--benren\s*\{[^}]*\}/)?.[0] ?? ''
    expect(镜像规则).toContain('grid-template-areas')
    expect(镜像规则).toContain('padding-inline: var(--jiange-13) 0')
    expect(镜像规则).toContain('margin-top: 0')
  })
})
