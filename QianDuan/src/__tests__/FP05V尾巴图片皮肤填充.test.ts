import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  caiJiQiPaoBianYuanTianChong,
  jiSuanTuPianHuiZhi,
  jieXiTuPianBeiJing,
  qiuBianYuanZhongXinY,
  quZhongWeiZhi,
  qingKongWeiBaCaiJiHuanCun,
} from '@/utils/气泡尾巴填充色'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')

const 生产值 = 'linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.55)), url("/api/媒体/' + 'a'.repeat(64) + '?e=1&s=b") center / cover no-repeat'

describe('FP-05V 图片皮肤尾巴：几何与取样口径', () => {
  it('解析生产背景值：叠加层、图片地址与拉伸模式', () => {
    const ceng = jieXiTuPianBeiJing(生产值, 'auto, cover')
    expect(ceng).not.toBeNull()
    expect(ceng!.url).toContain('/api/媒体/')
    expect(ceng!.daXiao).toBe('cover')
    expect(ceng!.fuGai).toEqual({ r: 0, g: 0, b: 0, a: 0.55 })
  })

  it('纯色皮肤不产生图片层，不进入取样分支', () => {
    expect(jieXiTuPianBeiJing('none', 'auto')).toBeNull()
    expect(jieXiTuPianBeiJing('', '')).toBeNull()
    expect(jieXiTuPianBeiJing('linear-gradient(135deg, #ff2d55, #0a84ff)', 'auto')).toBeNull()
  })

  it('叠加层为空或透明时仍能解析，多图层按图片所在层取尺寸', () => {
    const ceng = jieXiTuPianBeiJing('linear-gradient(red, red), url("x.svg")', 'auto, 100% 100%')
    expect(ceng).toEqual({ url: 'x.svg', daXiao: '100% 100%', fuGai: null })
  })

  it('cover 与四种拉伸模式的计算结果和浏览器一致', () => {
    expect(jiSuanTuPianHuiZhi(600, 300, 300, 40, 'cover')).toEqual({ kuan: 300, gao: 150, x: 0, y: -55 })
    expect(jiSuanTuPianHuiZhi(600, 300, 300, 40, '100% auto')).toEqual({ kuan: 300, gao: 150, x: 0, y: -55 })
    expect(jiSuanTuPianHuiZhi(600, 300, 300, 40, 'auto 100%')).toEqual({ kuan: 80, gao: 40, x: 110, y: 0 })
    expect(jiSuanTuPianHuiZhi(600, 300, 300, 40, '100% 100%')).toEqual({ kuan: 300, gao: 40, x: 0, y: 0 })
    expect(jiSuanTuPianHuiZhi(0, 300, 300, 40, 'cover')).toBeNull()
    expect(jiSuanTuPianHuiZhi(600, 300, 0, 40, 'cover')).toBeNull()
  })

  it('把尾巴画的三角形中心换算成气泡内坐标：像素、百分比与 calc 三种形态', () => {
    expect(qiuBianYuanZhongXinY('polygon(calc(100% - 11.5px) 19.5938px, 100% 22px, calc(100% - 11.5px) 31.5px)', 41.1875)).toBe(22)
    expect(qiuBianYuanZhongXinY('polygon(calc(100% - 11.5px) calc(50% - 9.5px), 100% 50%, calc(100% - 11.5px) calc(50% + 9.5px))', 40)).toBe(20)
    expect(qiuBianYuanZhongXinY('polygon(calc(100% - 11.5px) calc(100% - 30.5px), 100% calc(100% - 21px), calc(100% - 11.5px) calc(100% - 11.5px))', 41.1875)).toBeCloseTo(20.19, 2)
    expect(qiuBianYuanZhongXinY('', 40)).toBe(20)
    expect(qiuBianYuanZhongXinY('none', 40)).toBe(20)
  })

  it('边缘取样用中位数，避免纹理尖峰把尾巴染成错误颜色', () => {
    expect(quZhongWeiZhi([0, 0, 240, 240, 240])).toBe(240)
    expect(quZhongWeiZhi([9])).toBe(9)
    expect(quZhongWeiZhi([])).toBe(0)
  })

  it('无画布环境返回空值而不是抛错', async () => {
    qingKongWeiBaCaiJiHuanCun()
    const yuanQuHuaBi = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = () => null
    const jieGuo = await caiJiQiPaoBianYuanTianChong({
      beiJingTu: 生产值,
      beiJingDaXiao: 'auto, cover',
      kuangKuan: 300,
      kuangGao: 40,
      bianYuanX: 298.5,
      zhongXinY: 20,
      shuiPingPianYi: 0,
      weiBaKuan: 10,
    })
    HTMLCanvasElement.prototype.getContext = yuanQuHuaBi
    expect(jieGuo === null || typeof jieGuo === 'string').toBe(true)
  })
})

describe('FP-05V 图片皮肤尾巴：组件只改填充，不改几何', () => {
  it('尾巴组件在图片皮肤下写入同源填充变量，纯色皮肤下清除覆盖', () => {
    const 尾巴源 = 读('components/聊天/气泡尾巴.vue')
    expect(尾巴源).toContain(":style=\"tianChong ? { '--qipao-weiba-tian-chong': tianChong } : undefined\"")
    expect(尾巴源).toContain('backgroundImage.includes')
    expect(尾巴源).toContain("if (!fuYangShi.backgroundImage.includes('url('))")
    expect(尾巴源).toContain('tianChong.value = \'\'')
    expect(尾巴源).toContain('clipPath')
    expect(尾巴源).not.toContain('--qipao-weiba-kuan:')
    expect(尾巴源).not.toContain('--qipao-weiba-ban:')
    expect(尾巴源).not.toContain('--qipao-weiba-shang:')
    expect(尾巴源).not.toContain('background-size:')
  })

  it('采样偏移按左右侧取实际气泡边缘，左侧补尾宽保证纹理原点对齐', () => {
    const 尾巴源 = 读('components/聊天/气泡尾巴.vue')
    expect(尾巴源).toContain("const bianYuanX = props.ce === 'you' ? kuangKuan - 1.5 : 1.5")
    expect(尾巴源).toContain("shuiPingPianYi: props.ce === 'zuo' ? weiBaKuan : 0")
    const 工具源 = 读('utils/气泡尾巴填充色.ts')
    expect(工具源).toContain('yuan(huiZhi.x + canShu.shuiPingPianYi)')
    expect(工具源).toContain('no-repeat')
    expect(工具源).not.toContain('caiJiBianYuanYanSe')
  })

  it('无 Tailwind 式重复实现：全仓库仍只有气泡尾巴.vue 绘制裁剪路径', () => {
    const 文件 = ['components/聊天/气泡容器.vue', 'components/气泡主题选择器.vue', 'components/聊天/聊天预览.vue', 'components/图片裁剪.vue']
    for (const ming of 文件) expect(读(ming), ming).not.toContain('clip-path: polygon(')
  })
})
