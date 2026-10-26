import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import 聊天预览 from '@/components/聊天/聊天预览.vue'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { huoQuQiPaoCSSBianLiang } from '@/config/气泡主题'
import { huoQuFanYi } from '@/config/翻译表'
import {
  MO_REN_BEI_JING,
  ZI_DING_YI_BEI_JING_LEI_MING,
  huoQuLiaoTianBeiJingLeiMing,
} from '@/composables/use聊天皮肤'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string): string => readFileSync(resolve(源码根, 相对), 'utf8')

const 预览源 = 读('components/聊天/聊天预览.vue')
const 行源 = 读('components/聊天/消息行.vue')
const 面板源 = 读('components/聊天/聊天面板.vue')
const 容器源 = 读('components/聊天/气泡容器.vue')
const 时间条源 = 读('components/聊天/时间条.vue')
const 语音源 = 读('components/聊天/语音气泡.vue')
const 聊天页源 = 读('views/聊天页面.vue')
const 好友页源 = 读('views/好友聊天.vue')
const 军师记录源 = 读('views/军师记录详情.vue')

const 背景预设 = [
  'moRen',
  'chenWuQing',
  'muZiXingYe',
  'miWuSenLin',
  'haiYangZhiLan',
  'fenSeMengJing',
  'yeKongXingHe',
  'miSeTianYuan',
]

function 列出Vue(目录 = 源码根): string[] {
  const 出: string[] = []
  for (const 项 of readdirSync(目录)) {
    const 全 = join(目录, 项)
    if (statSync(全).isDirectory()) {
      if (项 === 'node_modules' || 项 === '__tests__') continue
      出.push(...列出Vue(全))
    } else if (项.endsWith('.vue')) {
      出.push(relative(源码根, 全).replace(/\\/g, '/'))
    }
  }
  return 出.sort()
}

function 持有皮肤的文件(特征: RegExp): string[] {
  return 列出Vue().filter((文件) => 特征.test(读(文件)))
}

function 取规则(源: string, 选择器: string): string {
  const 命中 = new RegExp(
    `${选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*\\}`,
  ).exec(源)
  return 命中 ? 命中[0] : ''
}

const 待收编背景页面: string[] = []
const 待收编行皮肤页面: string[] = []

const 时段前缀 = (
  ['lingChen', 'zaoShang', 'shangWu', 'zhongWu', 'xiaWu', 'wanShang'] as const
).map((jian) => huoQuFanYi('shiJian', jian))

describe('聊天预览复用真实聊天页的渲染实现', () => {
  it('预览只装配共享组件，不再自造气泡', () => {
    expect(预览源).toContain("import QiPaoRongQi from '@/components/聊天/气泡容器.vue'")
    expect(预览源).toContain("import ShiJianTiao from '@/components/聊天/时间条.vue'")
    expect(预览源).toContain("import XiaoXiHang from '@/components/聊天/消息行.vue'")
    expect(预览源).toContain("import LiaoTianMianBan from '@/components/聊天/聊天面板.vue'")
    expect(预览源).toContain('<QiPaoRongQi :shi-ben-ren=')
    expect(预览源).toContain('<XiaoXiHang')
    expect(预览源).toContain('<ShiJianTiao :shi-jian=')
    expect(预览源).toContain('<LiaoTianMianBan')
  })

  it('预览里不存在第二份气泡皮肤：内边距/圆角/字号/行高/尾巴/最大宽度全部删净', () => {
    for (const 特征 of [
      '.qipao-neirong',
      '.qipao-waike',
      '.xiaoxi-wei',
      '.xiaoxi-xiangmu',
      '.shijian-biaoqian',
      '::after',
      'border-left:',
      'border-right:',
      'line-height: 1.45',
      'line-height: var(--qipao-hangao)',
      'border-radius: 6px',
      'font-size: 16px',
      'font-size: 15px',
      'padding: var(--jiange-9)',
      'max-width: min(calc(100vw',
      '@media (max-width: 480px)',
    ]) {
      expect(预览源, `预览仍保留自造样式 ${特征}`).not.toContain(特征)
    }
    expect(预览源).not.toMatch(/background:\s*var\(--qipao/)
    expect(预览源).not.toMatch(/color:\s*var\(--qipao/)
  })

  it('预览不再自带聊天背景与背景预设类，背景档收编进聊天面板', () => {
    expect(预览源).not.toMatch(/beijing-(moRen|ziDingYi|chenWuQing|miWuSenLin|yeKongXingHe)/)
    expect(预览源).not.toContain('liaotian-beijing')
    expect(预览源).not.toContain('ziJiQiPaoCSSBianLiang')
    expect(预览源).not.toContain('beiJingNeiLianYangShi')
    expect(持有皮肤的文件(/\.beijing-chenWuQing\s*\{/)).toEqual([
      'components/聊天/聊天面板.vue',
      ...待收编背景页面,
    ])
  })

  it('消息行是行布局与头像位的唯一真源', () => {
    expect(行源).toContain('margin-bottom: var(--jiange-zhong)')
    expect(行源).toContain('flex-direction: row-reverse')
    expect(行源).toContain('align-self: flex-end')
    expect(行源).toContain('background: var(--touxiang-beijing-moren)')
    expect(行源).toContain('margin-left: var(--jiange-10)')
    expect(行源).toContain('margin-right: var(--jiange-10)')
    expect(行源).toContain('max-width: min(calc(100vw - 126px), 520px)')
    expect(行源).toContain('max-width: min(calc(100vw - 120px), 420px)')
    expect(行源).toContain('@media (max-width: 480px)')
    expect(行源).toContain('<TouXiang')
    expect(持有皮肤的文件(/\.xiaoxi-wei\s*\{/)).toEqual([
      'components/聊天/消息行.vue',
      ...待收编行皮肤页面,
    ])
  })

  it('消息行独占气泡外壳宽度、撤回居中与本人态语音右对齐', () => {
    expect(行源).toContain('.qipao-waike {')
    expect(行源).toContain('.xiaoxi-xiangmu.xitong-xiaoxi,')
    expect(行源).toContain('.xiaoxi-xiangmu.chehui-xiaoxi {')
    expect(行源).toContain('justify-content: center')
    expect(行源).toContain('.yonghu-xiaoxi .qipao-waike.yuyin-waike {')
    expect(行源).toContain('align-items: flex-end')
    expect(持有皮肤的文件(/^\.qipao-waike \{$/m)).toEqual([
      'components/聊天/消息行.vue',
      ...待收编行皮肤页面,
    ])
    expect(持有皮肤的文件(/^\.yonghu-xiaoxi \.yuyin-waike \{$/m)).toEqual([])
  })

  it('聊天面板承载全部预设背景档，且气泡变量与背景内联样式同源', () => {
    for (const 预设 of 背景预设) {
      expect(面板源, `聊天面板缺背景档 ${预设}`).toContain(`.beijing-${预设}`)
    }
    expect(面板源).toContain('background: var(--liaotian-beijing)')
    expect(面板源).toContain('padding: var(--jiange-12) var(--jiange-zhong)')
    expect(面板源).toContain('padding: var(--jiange-10) var(--jiange-12)')
    expect(面板源.match(/font-family:\s*([^;]+);/)?.[1]?.trim(), '面板字体栈必须只引用 --ziti-jiazu 令牌').toBe(
      'var(--ziti-jiazu)',
    )
    expect(面板源).not.toMatch(/-apple-system|BlinkMacSystemFont|PingFang SC|Segoe UI|Helvetica|Arial/)
    expect(面板源).toContain('use聊天皮肤')
    expect(面板源).toContain('beiJingYangShi')
    expect(面板源).toContain('qiPaoYangShi')
  })

  it('真实聊天页收编账本：背景档与行皮肤例外均为零', () => {
    const 仍自造气泡皮肤 = 持有皮肤的文件(/\.yonghu-xiaoxi \.qipao-neirong|\.jiaose-xiaoxi \.qipao-neirong/)
    expect(仍自造气泡皮肤).toEqual([])
    const 仍自带行皮肤 = 持有皮肤的文件(/^\.xiaoxi-wei \{$/m).filter(
      (文件) => 文件 !== 'components/聊天/消息行.vue',
    )
    expect(仍自带行皮肤.sort()).toEqual(待收编行皮肤页面)
    expect(待收编行皮肤页面).toEqual([])
    expect(待收编背景页面).toEqual([])
  })

  it('.xiaoxi-xiangmu 只表示消息行皮肤：页面不再压行皮肤，日志行已改名', () => {
    expect(持有皮肤的文件(/^\.xiaoxi-xiangmu[^{\n]*\{/m)).toEqual(['components/聊天/消息行.vue'])
    expect(持有皮肤的文件(/^\.chehui-xiaoxi[^{\n]*\{/m)).toEqual([])
    expect(军师记录源).not.toContain('xiaoxi-xiangmu')
    expect(军师记录源).not.toContain('chehui-xiaoxi')
    expect(军师记录源).toContain('.jilu-hang {')
    expect(军师记录源).toContain('class="jilu-hang"')
  })

  it('语音转写徽标只有语音气泡一份皮肤，两页零残留', () => {
    expect(持有皮肤的文件(/^\.yuyin-zhuanwenzi[^{\n]*\{/m)).toEqual(['components/聊天/语音气泡.vue'])
    for (const 页 of [聊天页源, 好友页源]) {
      expect(页).not.toContain('yuyin-zhuanwenzi')
    }
    const 徽标 = 取规则(语音源, '.yuyin-zhuanwenzi')
    expect(徽标).toContain('font-size: var(--zhuanwenzi-zihao)')
    expect(徽标).toContain('line-height: var(--zhuanwenzi-hangao)')
    expect(徽标).toContain('margin-top: var(--jiange-6)')
    expect(徽标).toContain('padding: var(--jiange-xiao) var(--jiange-12)')
    expect(徽标).toContain('border-radius: var(--qipao-yuanjiao)')
    expect(取规则(语音源, '.yuyin-zhuanwenzi--benren')).toContain('var(--qipao-ziJi-beiJing')
    expect(取规则(语音源, '.yuyin-zhuanwenzi-zhuangtai')).toContain('margin-top: var(--jiange-6)')
    expect(取规则(语音源, '.yuyin-zhuanwenzi-zhuangtai')).toContain('font-size: var(--ziti-xiao)')
    expect(语音源).toContain('class="yuyin-zhuanwenzi"')
    expect(语音源).toContain("@click.stop=\"emit('qieHuanZhuanWenZi')\"")
    expect(聊天页源).toContain(':zhuan-wen-zhan-kai="shiZhuanWenZiZhanKai(xiaoXi)"')
    expect(好友页源).toContain(':zhuan-wen-zhan-kai="shiZhuanWenZiZhanKai(xiaoXi as unknown as 消息)"')
  })

  it('发送状态角标只有消息行一份皮肤，两页零残留', () => {
    expect(持有皮肤的文件(/^\.fasong-shibai-jiaobiao[^{\n]*\{/m)).toEqual([
      'components/聊天/消息行.vue',
    ])
    expect(持有皮肤的文件(/^\.fasong-zhuangtai[^{\n]*\{/m)).toEqual(['components/聊天/消息行.vue'])
    for (const 页 of [聊天页源, 好友页源]) {
      expect(页).not.toContain('fasong-shibai-jiaobiao')
      expect(页).not.toContain('fasong-zhuangtai')
      expect(页).not.toContain('#wei-jiao')
    }
    const 角标 = 取规则(行源, '.fasong-shibai-jiaobiao')
    expect(角标).toContain('width: var(--jiaobiao-chicun)')
    expect(角标).toContain('height: var(--jiaobiao-chicun)')
    expect(角标).toContain('font-size: var(--jiaobiao-zihao)')
    expect(取规则(行源, '.fasong-zhuangtai-zhuanquan')).toContain(
      'border: var(--jiaobiao-biankuang) solid',
    )
    expect(行源).toContain("@click.stop=\"emit('chongXinFaSong')\"")
    expect(聊天页源).toContain(':fa-song-ti-shi="huoQuFaSongZhuangTaiTiShi(xiaoXi)"')
    expect(聊天页源).toContain(':fa-song-zhong=')
    expect(好友页源).toContain(':fa-song-zhong="shiFaSongZhong(xiaoXi)"')
    expect(好友页源).toContain(':fa-song-shi-bai="shiFaSongShiBai(xiaoXi)"')
    expect(好友页源).toContain("return faSongZhuangTai.value.get(xiaoXi.id) === 'fa_song_zhong'")
    expect(好友页源).toContain("return faSongZhuangTai.value.get(xiaoXi.id) === 'shi_bai'")
  })

  it('预览时间条走真实页同一个分组函数，不再自己拼时间', () => {
    expect(预览源).toContain('fenZuXiaoXiAnShiJian')
    expect(预览源).not.toContain('geShiHuaXiaoXiShiJian')
  })
})

describe('聊天皮肤真源函数', () => {
  it('预设背景按档位出类名，自定义背景统一走内联样式档', () => {
    expect(huoQuLiaoTianBeiJingLeiMing(true, 'chenWuQing')).toBe('beijing-chenWuQing')
    expect(huoQuLiaoTianBeiJingLeiMing(true, '')).toBe(`beijing-${MO_REN_BEI_JING}`)
    expect(huoQuLiaoTianBeiJingLeiMing(true, null)).toBe(`beijing-${MO_REN_BEI_JING}`)
    expect(huoQuLiaoTianBeiJingLeiMing(false, 'https://x/自定义.jpg')).toBe(ZI_DING_YI_BEI_JING_LEI_MING)
  })
})

describe('聊天预览挂载后与真实聊天页同构', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function 挂预览() {
    return mount(聊天预览, {
      props: {
        biaoTi: huoQuFanYi('sheZhi', 'liaoTianYuLan'),
        dangQianMing: '微信绿/云白',
      },
    })
  }

  it('渲染出真实页的行结构：面板 + 时间条 + 消息行 + 气泡容器', () => {
    const 包 = 挂预览()
    const 面板 = 包.get('.yu-lan-xiao-xi-qu')
    expect(面板.classes()).toContain('liao-tian-mian-ban')
    expect(面板.classes()).toContain(`beijing-${MO_REN_BEI_JING}`)
    expect(面板.attributes('aria-label')).toBe(huoQuFanYi('sheZhi', 'liaoTianYuLan'))
    expect(包.findAll('.shijian-biaoqian')).toHaveLength(1)
    const 行们 = 包.findAll('.xiaoxi-xiangmu')
    expect(行们).toHaveLength(2)
    expect(行们[0].classes()).toContain('jiaose-xiaoxi')
    expect(行们[1].classes()).toContain('yonghu-xiaoxi')
    expect(包.findAll('.xiaoxi-wei')).toHaveLength(2)
    expect(包.findAll('.qipao-waike')).toHaveLength(2)
    const 气泡们 = 包.findAll('.qipao-neirong')
    expect(气泡们).toHaveLength(2)
    expect(气泡们[0].classes()).toContain('qipao-neirong--jiaose')
    expect(气泡们[1].classes()).toContain('qipao-neirong--benren')
    expect(气泡们[0].text()).toBe(huoQuFanYi('sheZhi', 'yuLanQiPaoLai'))
    expect(气泡们[1].text()).toBe(huoQuFanYi('sheZhi', 'yuLanQiPaoQu'))
    包.unmount()
  })

  it('时间条文本沿用真实页的微信十二小时制带时段前缀', () => {
    const 包 = 挂预览()
    const 文本 = 包.get('.shijian-biaoqian').text()
    const 正则 = new RegExp(
      `^(?:(?:昨天|星期[一二三四五六日]|\\d{1,2}月\\d{1,2}日|\\d{4}年\\d{1,2}月\\d{1,2}日)\\s)?(?:${时段前缀.join('|')})\\d{1,2}:\\d{2}$`,
    )
    expect(文本).toMatch(正则)
    expect(包.get('.shijian-biaoqian').attributes('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    包.unmount()
  })

  it('气泡变量注入与真实页同一份计算结果，并随所选主题实时变化', async () => {
    const 仓 = 使用用户设置仓库()
    const 包 = 挂预览()
    const 面板 = 包.get('.yu-lan-xiao-xi-qu').element as HTMLElement
    const 初值 = huoQuQiPaoCSSBianLiang(仓.qiPaoZiJi, 仓.qiPaoAI)
    for (const [令牌, 值] of Object.entries(初值)) {
      expect(面板.style.getPropertyValue(令牌), `${令牌} 未注入`).toBe(值)
    }
    仓.qiPaoZiJi = 'anYe'
    仓.qiPaoAI = 'douShaLv'
    await 包.vm.$nextTick()
    const 新值 = huoQuQiPaoCSSBianLiang('anYe', 'douShaLv')
    for (const [令牌, 值] of Object.entries(新值)) {
      expect(面板.style.getPropertyValue(令牌), `${令牌} 未跟随选择变化`).toBe(值)
    }
    包.unmount()
  })

  it('预览不再往页面根节点重复注入气泡变量', () => {
    const 气泡设置源 = 读('views/气泡设置.vue')
    expect(气泡设置源).not.toContain('ziJiQiPaoCSSBianLiang')
    expect(气泡设置源).toContain('<LiaoTianYuLan')
  })

  it('共享组件的气泡皮肤仍然只有气泡容器一份', () => {
    expect(容器源).toContain('padding: var(--jiange-9) var(--jiange-13)')
    expect(容器源).toContain('border-radius: var(--qipao-yuanjiao)')
    expect(容器源).toContain('font-size: var(--qipao-zihao)')
    expect(容器源).toContain('line-height: var(--qipao-hangao)')
    expect(时间条源).toContain('background: var(--shijian-biaoqian-beijing)')
    expect(时间条源).toContain('align-self: center')
  })
})
