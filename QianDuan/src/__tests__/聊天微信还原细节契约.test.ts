import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import 引用条 from '@/components/聊天/引用条.vue'
import 图片预览 from '@/components/聊天/图片预览.vue'
import 消息行 from '@/components/聊天/消息行.vue'
import 语音气泡 from '@/components/聊天/语音气泡.vue'
import { huoQuFanYi } from '@/config/翻译表'

const 根 = resolve(__dirname, '..')
const 读 = (xiangDui: string): string => readFileSync(resolve(根, xiangDui), 'utf8')

const 聊天页源 = 读('views/聊天页面.vue')
const 好友页源 = 读('views/好友聊天.vue')
const 引用条源 = 读('components/聊天/引用条.vue')
const 输入区源 = 读('components/聊天/图文输入区.vue')
const 图片气泡源 = 读('components/聊天/图片气泡.vue')
const 图文块源 = 读('components/聊天/图文块.vue')
const 输入栏源 = 读('components/聊天/输入工具栏.vue')
const 更多面板源 = 读('components/聊天/更多面板.vue')

function 取规则(源: string, 选择器: string): string {
  const 命中 = new RegExp(`${选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*\\}`).exec(源)
  return 命中 ? 命中[0] : ''
}

function 取函数(源: string, 声明: string): string {
  const 起点 = 源.indexOf(声明)
  if (起点 < 0) return ''
  const 终点 = 源.indexOf('\n}', 起点)
  return 终点 < 0 ? '' : 源.slice(起点, 终点 + 2)
}

describe('聊天页大图预览收编为共享组件', () => {
  it('页面只留一份预览实现，内联遮罩整套删除', () => {
    expect(聊天页源).toContain("import TuPianYuLan from '@/components/聊天/图片预览.vue'")
    expect(聊天页源).toContain('<TuPianYuLan')
    expect(聊天页源).toContain('@geng-xin-xia-biao="yuLanXiaBiao = $event"')
    expect(聊天页源).not.toContain('tuPianYuLanURL')
    expect(聊天页源).not.toContain('tupian-yulan-zhezhao')
    expect(聊天页源).not.toContain('tupian-yulan-da-tu')
    expect(聊天页源).not.toContain('tupian-yulan-guanbi')
  })

  it('预览列表按消息时间收集图文块与独立图片消息', () => {
    expect(聊天页源).toContain('const quanBuTuPianDiZhi = computed')
    const 收集 = 取函数(聊天页源, 'const quanBuTuPianDiZhi = computed')
    expect(收集).toContain('聊天仓库.xiaoXiLieBiao')
    expect(收集).toContain('huoQuXianShiKuai(xiaoXi)')
    expect(收集).toContain("kuai.lei_xing === 'tupian'")
    expect(收集).toContain('TU_PIAN_YU_LAN_LEI_XING')
    expect(聊天页源).toContain('new Set<string>(TU_PIAN_XIAO_XI_LEI_XING)')
    expect(收集).toContain('xiaoXi.yi_che_hui')
    const 打开 = 取函数(聊天页源, 'function daKaiTuPianYuLan')
    expect(打开).toContain('quanBuTuPianDiZhi.value')
    expect(打开).toContain('indexOf(diZhi)')
    expect(打开).toContain('yuLanXiaBiao.value = suoYin >= 0 ? suoYin : 0')
    expect(取函数(聊天页源, 'function guanBiTuPianYuLan')).toContain('yuLanXiaBiao.value = null')
  })

  it('表情包走同一图片气泡组件，外壳档经消息行下发，光标可放大', () => {
    expect(聊天页源).toContain(':wai-ke-lei-ming="qiPaoWaiKeLeiMing(xiaoXi)"')
    expect(聊天页源).toContain("return 'biaoqingbao-waike'")
    expect(聊天页源).toContain('<TuPianQiPao')
    expect(聊天页源).toContain(`:shi-biao-qing-bao="xiaoXi.lei_xing === 'biaoQingBao'"`)
    expect(聊天页源).toContain('@dian-ji="daKaiTuPianYuLan(xiaoXi, $event)"')
    expect(取规则(图片气泡源, '.tupian-qipao')).toContain('cursor: zoom-in')
    expect(图片气泡源).toContain('.biaoqingbao-tu')
  })

  it('图片外壳只有组件一份皮肤，两页不再自造，等比不裁且可点放大', () => {
    expect(取规则(图片气泡源, '.tupian-xianshi')).toContain('max-height: var(--tuwen-tu-zuida-gao)')
    expect(取规则(图片气泡源, '.tupian-xianshi')).toContain('max-width: var(--tuwen-tu-zuidakuan)')
    expect(取规则(图片气泡源, '.tupian-xianshi')).not.toContain('object-fit: cover')
    expect(取规则(图片气泡源, '.tupian-qipao')).toContain('cursor: zoom-in')
    expect(取规则(图文块源, '.tuwen-kuai-tu')).toContain('cursor: zoom-in')
    for (const 页 of [聊天页源, 好友页源]) {
      expect(页).toContain('<TuPianQiPao')
      expect(页).toContain('<TuWenKuai')
      expect(页).not.toContain('class="tupian-qipao"')
      expect(页).not.toContain('class="tupian-xianshi"')
      expect(页).not.toContain('.tupian-xianshi {')
      expect(页).not.toContain('.tuwen-kuai-tu {')
    }
    expect(更多面板源).toContain('class="gengduo-rukou"')
  })
})

describe('输入栏还原微信顺序并收成唯一真源', () => {
  function 输入栏片段(): string {
    const 起点 = 输入栏源.indexOf('<div class="shuru-rongqi">')
    return 起点 < 0 ? '' : 输入栏源.slice(起点)
  }

  it('语音在最左，输入框挂载点居中，表情在右，发送在扩展面板左侧', () => {
    const 栏 = 输入栏片段()
    expect(栏.length).toBeGreaterThan(0)
    const 序 = [
      'class="yuyin-anniu"',
      '<slot />',
      'class="biaoqing-anniu"',
      'class="fasong-anniu"',
      'class="gengduo-plus-anniu"',
    ]
    let 上个 = -1
    for (const 记 of 序) {
      const 当前 = 栏.indexOf(记)
      expect(当前, `输入栏缺少或错位：${记}`).toBeGreaterThan(上个)
      上个 = 当前
    }
  })

  it('两页只接线，输入栏与更多面板皮肤各只剩组件一份', () => {
    for (const 页 of [聊天页源, 好友页源]) {
      expect(页).toContain('<ShuRuGongJuLan')
      expect(页).toContain('<GengDuoMianBan')
      expect(页).not.toContain('.shuru-rongqi {')
      expect(页).not.toContain('.meiti-rukou')
      expect(页).not.toContain('.gengduo-rukou')
      expect(页).not.toContain('.fasong-anniu {')
    }
    expect(输入栏源).toContain('.yuyin-anniu')
    expect(输入栏源).toContain('.gengduo-plus-anniu')
    expect(输入栏源).toContain('.fasong-anniu {')
    expect(更多面板源).toContain('.gengduo-mianban {')
    expect(更多面板源).toContain('.gengduo-rukou {')
  })

  it('字数计数器与手动展开档删除，展开档走输入区 prop', () => {
    expect(聊天页源).not.toContain('zifu-jishu')
    expect(聊天页源).not.toContain('.zifu-chaochu')
    expect(聊天页源).not.toContain('.shuru-dibu-hang')
    expect(聊天页源).not.toContain('.zhan-kai-anniu')
    expect(聊天页源).toContain(':zhan-kai="shuRuKuangZhanKai"')
  })

  it('有可发内容时右侧槽换成发送，且发送态收起扩展面板', () => {
    const 栏 = 输入栏片段()
    const 发送位 = 栏.indexOf('v-if="keFaSong"')
    const 加位 = 栏.indexOf('class="gengduo-plus-anniu"')
    expect(发送位).toBeGreaterThan(-1)
    expect(加位).toBeGreaterThan(发送位)
    expect(栏).toContain('v-else')
    expect(聊天页源).toContain(':ke-fa-song="keYiFaSong"')
    expect(好友页源).toContain(':ke-fa-song="youKeFaSong"')
    const 联动 = 取函数(聊天页源, 'watch(keYiFaSong')
    expect(联动).toContain('guanBiGengDuoMianBan()')
  })
})

describe('历史消息只留滚动到顶自动加载', () => {
  it('顶部常驻按钮与死样式删除，自动触发保留加载中互斥', () => {
    expect(聊天页源).not.toContain('jiazaigengduo')
    expect(聊天页源).not.toContain('chehui-anniu')
    const 滚动 = 取函数(聊天页源, 'function chuLiGunDong')
    expect(滚动).toContain('scrollTop <= 20')
    expect(滚动).toContain('!聊天仓库.jiaZaiGengDuoZhong')
    expect(滚动).toContain('jiaZaiGengDuo()')
    expect(取函数(聊天页源, 'async function jiaZaiGengDuo')).toContain(
      'if (!聊天仓库.haiYouGengDuo || 聊天仓库.jiaZaiGengDuoZhong) return',
    )
  })
})

describe('引用条只剩昵称与摘要', () => {
  it('不再前置「引用」二字', () => {
    expect(引用条源).not.toContain("huoQuFanYi('liaoTian', 'yinYong')")
    expect(引用条源).not.toContain('yinyong-tiao-biaoti')
    const 包 = mount(引用条, { props: { zhaiYao: '今晚月色真美', faSongZheMing: '林小满' } })
    expect(包.get('.yinyong-tiao-zhaiyao').text()).toBe('林小满: 今晚月色真美')
    expect(包.text()).not.toContain('引用')
  })

  it('缺发送者名时只渲染摘要', () => {
    const 包 = mount(引用条, { props: { zhaiYao: '只在远处凝望' } })
    expect(包.get('.yinyong-tiao-zhaiyao').text()).toBe('只在远处凝望')
  })
})

describe('共享大图预览承担会话内连续翻看', () => {
  const 三张 = ['http://localhost/1.png', 'http://localhost/2.png', 'http://localhost/3.png']

  function 挂预览(tu: string[], xiaBiao: number | null) {
    return mount(图片预览, {
      props: { tu, xiaBiao },
      global: { stubs: { teleport: true } },
      attachTo: document.body,
    })
  }

  it('多张显示页码并支持方向键循环切换', async () => {
    const 包 = 挂预览(三张, 0)
    const 遮罩 = 包.get('.tupian-yulan-zhezhao')
    expect(包.get('.tupian-yulan-da-tu').attributes('src')).toBe(三张[0])
    expect(包.get('.tupian-yulan-ye-ma').text()).toBe('1/3')
    await 遮罩.trigger('keydown.right')
    expect(包.emitted('geng-xin-xia-biao')?.[0]).toEqual([1])
    await 遮罩.trigger('keydown.left')
    await 遮罩.trigger('keydown.left')
    expect(包.emitted('geng-xin-xia-biao')?.[1]).toEqual([2])
    包.unmount()
  })

  it('点背景与关闭按钮都退出预览', async () => {
    const 包 = 挂预览(三张, 1)
    await 包.get('.tupian-yulan-zhezhao').trigger('click')
    expect(包.emitted('guan-bi')).toHaveLength(1)
    await 包.get('.tupian-yulan-guanbi').trigger('click')
    expect(包.emitted('guan-bi')).toHaveLength(2)
    包.unmount()
  })

  it('单张不显示页码，下标为空时不渲染遮罩', () => {
    const 单张 = 挂预览([三张[0]], 0)
    expect(单张.find('.tupian-yulan-ye-ma').exists()).toBe(false)
    单张.unmount()
    const 关闭 = 挂预览(三张, null)
    expect(关闭.find('.tupian-yulan-zhezhao').exists()).toBe(false)
    关闭.unmount()
  })
})

describe('待发图片删除按钮落在右上角', () => {
  it('定位由 left 改为 right，删除入口仍走无障碍按钮', () => {
    const 规则 = 取规则(输入区源, '.dai-fa-kuai-shanchu')
    expect(规则).toContain('right: 0')
    expect(规则).not.toContain('left: 0')
    expect(输入区源).toContain("shanChu.className = 'dai-fa-kuai-shanchu'")
    expect(输入区源).toContain("huoQuFanYi('duoMeiTi', 'kuaiShanChu')")
  })
})

describe('语音转写徽标由语音气泡独占渲染', () => {
  function 挂语音气泡(属性: Record<string, unknown>) {
    return mount(语音气泡, {
      props: {
        xiaoXi: { mei_ti_shi_chang_hao_miao: 5000 },
        boFangZhong: false,
        jinDuMiao: 0,
        zongMiao: 5,
        ...属性,
      },
    })
  }

  it('转写中只出状态行，文案走翻译表', () => {
    const 包 = 挂语音气泡({ zhuanXieZhong: true })
    expect(包.find('.yuyin-zhuanwenzi-zhuangtai').exists()).toBe(true)
    expect(包.get('.yuyin-zhuanwenzi-zhuangtai').text()).toBe(
      huoQuFanYi('liaoTian', 'yuYinZhuanWenZiZhong'),
    )
    expect(包.find('.yuyin-zhuanwenzi').exists()).toBe(false)
    包.unmount()
  })

  it('展开态是可点按钮，点击回到组件的折叠事件并带上折叠读屏文案', async () => {
    const 包 = 挂语音气泡({ zhuanWenZhanKai: true, zhuanWenBen: '今晚月色真美', shiBenRen: true })
    const 按钮 = 包.get('button.yuyin-zhuanwenzi')
    expect(按钮.text()).toBe('今晚月色真美')
    expect(按钮.attributes('aria-label')).toBe(huoQuFanYi('liaoTian', 'zheDie'))
    expect(按钮.classes()).toContain('yuyin-zhuanwenzi--benren')
    await 按钮.trigger('click')
    expect(包.emitted('qieHuanZhuanWenZi')).toHaveLength(1)
    expect(包.emitted('qieHuan')).toBeUndefined()
    包.unmount()
  })

  it('失败态只出红色文本档，不带按钮语义', () => {
    const 包 = 挂语音气泡({ zhuanWenShiBai: true })
    const 徽标 = 包.get('.yuyin-zhuanwenzi')
    expect(徽标.element.tagName).toBe('SPAN')
    expect(徽标.classes()).toContain('yuyin-zhuanwenzi--shibai')
    expect(徽标.text()).toBe(huoQuFanYi('liaoTian', 'yuYinZhuanWenZiShiBai'))
    包.unmount()
  })
})

describe('发送状态角标由消息行独占渲染', () => {
  function 挂行(属性: Record<string, unknown>) {
    return mount(消息行, { props: { shiBenRen: true, xianShiTouXiang: false, ...属性 } })
  }

  it('两个状态都不给时不渲染角标容器', () => {
    const 包 = 挂行({})
    expect(包.find('.fasong-zhuangtai').exists()).toBe(false)
    包.unmount()
  })

  it('发送中渲染转圈，失败渲染可点按钮并派发重新发送', async () => {
    const 圈 = 挂行({ faSongZhong: true, faSongTiShi: huoQuFanYi('liaoTian', 'faSongZhong') })
    expect(圈.get('.fasong-zhuangtai').classes()).toContain('fasong-zhuangtai')
    expect(圈.find('.fasong-zhuangtai-zhuanquan').exists()).toBe(true)
    expect(圈.find('.fasong-shibai-jiaobiao').exists()).toBe(false)
    圈.unmount()

    const 包 = 挂行({ faSongShiBai: true, faSongTiShi: huoQuFanYi('liaoTian', 'chongXinFaSong') })
    const 按钮 = 包.get('button.fasong-shibai-jiaobiao')
    expect(按钮.attributes('type')).toBe('button')
    expect(按钮.attributes('aria-label')).toBe(huoQuFanYi('liaoTian', 'chongXinFaSong'))
    await 按钮.trigger('click')
    expect(包.emitted('chongXinFaSong')).toHaveLength(1)
    包.unmount()
  })
})
