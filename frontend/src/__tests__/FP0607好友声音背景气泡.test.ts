import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import HaoYouLieBiao from '@/views/好友列表.vue'
import ShengYinYe from '@/views/声音设置.vue'
import { huoQuFanYi } from '@/config/translations'
import {
  SHENG_YIN_DANG_XUAN_XIANG,
  SHENG_YIN_MO_REN,
  guiYiHuaShengYin,
  shiHeFaShengYin,
} from '@/config/消息配置'
import { huoQuQiPaoCSSBianLiang, QI_PAO_YU_SHE_BIAO } from '@/config/气泡主题'

vi.mock('@/api/社交', () => ({
  souSuoHaoYou: vi.fn().mockResolvedValue([]),
  faSongHaoYouShenQing: vi.fn().mockResolvedValue(undefined),
  huoQuShouDaoShenQing: vi.fn().mockResolvedValue([]),
  huoQuFaChuShenQing: vi.fn().mockResolvedValue([]),
  jieShouHaoYouShenQing: vi.fn().mockResolvedValue(undefined),
  juJueHaoYouShenQing: vi.fn().mockResolvedValue(undefined),
  huoQuHaoYouLieBiao: vi.fn().mockResolvedValue([]),
  shanChuHaoYou: vi.fn().mockResolvedValue(undefined),
  huoQuYongHuSheZhi: vi.fn(),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  baoCunQiPao: vi.fn().mockResolvedValue(undefined),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
}))

const 聊天页源 = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
const 好友页源 = readFileSync(resolve(__dirname, '../views/好友聊天.vue'), 'utf8')
const 预览页源 = readFileSync(resolve(__dirname, '../views/账号与安全.vue'), 'utf8')
const 气泡页源 = readFileSync(resolve(__dirname, '../views/气泡设置.vue'), 'utf8')
const 选择器源 = readFileSync(resolve(__dirname, '../components/气泡主题选择器.vue'), 'utf8')
const 令牌源 = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')
const 路由源 = readFileSync(resolve(__dirname, '../router/index.ts'), 'utf8')
const 菜单源 = readFileSync(resolve(__dirname, '../components/全局菜单.vue'), 'utf8')
const 播放源 = readFileSync(resolve(__dirname, '../composables/use语音播放.ts'), 'utf8')
const 转写源 = readFileSync(resolve(__dirname, '../composables/use语音转文字.ts'), 'utf8')

function quChuZhuShi(源: string): string {
  return 源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
}

async function guaHaoYou() {
  setActivePinia(createPinia())
  const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: HaoYouLieBiao }] })
  router.push('/')
  await router.isReady()
  const wrapper = mount(HaoYouLieBiao, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

async function guaShengYin() {
  setActivePinia(createPinia())
  const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: ShengYinYe }] })
  router.push('/')
  await router.isReady()
  const wrapper = mount(ShengYinYe, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('FP-0607 需求10 好友页：通讯录分区索引结构', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('好友列表按首字母分区渲染且#兜底末尾', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuHaoYouLieBiao).mockResolvedValue([
      { id: 'u1', yong_hu_ming: 'zhang', ni_cheng: 'Alice', tou_xiang: null, qian_ming: null },
      { id: 'u2', yong_hu_ming: 'ali', ni_cheng: 'Bob', tou_xiang: null, qian_ming: null },
      { id: 'u3', yong_hu_ming: null, ni_cheng: null, tou_xiang: null, qian_ming: null },
    ])
    const wrapper = await guaHaoYou()
    await flushPromises()
    const fenQu = wrapper.findAll('.fen-qu-biao-ti')
    expect(fenQu.length).toBeGreaterThanOrEqual(2)
    expect(fenQu[fenQu.length - 1].text()).toBe('#')
    expect(wrapper.find('.suo-yin-lan').exists()).toBe(true)
    expect(wrapper.findAll('.suo-yin-xiang').length).toBe(fenQu.length)
    wrapper.unmount()
  })

  it('好友页无第二份分区实现：分区函数只在好友列表页定义', () => {
    expect(quChuZhuShi(好友页源)).not.toContain('haoYouFenQu')
    expect(聊天页源).not.toContain('haoYouFenQu')
  })

  it('好友页字重吃令牌单源：无 600/700 加粗字面量', () => {
    const haoYouYangShi = quChuZhuShi(好友页源)
    expect(haoYouYangShi).not.toMatch(/font-weight:\s*600/)
    expect(haoYouYangShi).not.toMatch(/font-weight:\s*700/)
  })

  it('新增会话与验证入口文案来自翻译文件', () => {
    expect(huoQuFanYi('haoYou', 'xinHaoYou')).toBeTruthy()
    expect(huoQuFanYi('haoYou', 'huiHuaLieBiao')).toBeTruthy()
    expect(huoQuFanYi('haoYou', 'faChuShenQing')).toBeTruthy()
  })
})

describe('FP-0607 需求11 声音页：六档并真实接播放链路', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('六档清单固定且非法回退跟随系统', () => {
    expect([...SHENG_YIN_DANG_XUAN_XIANG]).toEqual(['genSuiXiTong', 'jingYin', 'xiao', 'zhong', 'da', 'zuiDa'])
    expect(SHENG_YIN_MO_REN).toBe('genSuiXiTong')
    expect(shiHeFaShengYin('da')).toBe(true)
    expect(shiHeFaShengYin('buCunZai')).toBe(false)
    expect(guiYiHuaShengYin('buCunZai')).toBe('genSuiXiTong')
    expect(guiYiHuaShengYin(null)).toBe('genSuiXiTong')
  })

  it('声音页渲染六档且无预留标：全档位已真实消费', async () => {
    const wrapper = await guaShengYin()
    expect(wrapper.find('[data-testid="sheng-yin-ye"]').exists()).toBe(true)
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(6)
    expect(wrapper.text()).not.toContain('预留')
    expect(wrapper.find('.sheng-yin-yu-liu').exists()).toBe(false)
    wrapper.unmount()
  })

  it('选择档位持久化到本地且试听按钮按静音切换显隐', async () => {
    const wrapper = await guaShengYin()
    const anNiu = wrapper.findAll('[role="radio"]')
    await anNiu[1].trigger('click')
    await flushPromises()
    expect(localStorage.getItem('lian-ai-ba-sheng-yin')).toBe('jingYin')
    expect(wrapper.find('.sheng-yin-shi-ting').exists()).toBe(true)
    await anNiu[3].trigger('click')
    await flushPromises()
    expect(localStorage.getItem('lian-ai-ba-sheng-yin')).toBe('zhong')
    expect(wrapper.find('.sheng-yin-shi-ting').exists()).toBe(true)
    wrapper.unmount()
  })

  it('播放链路真实消费声音档：两页与转写均接音量口', () => {
    expect(播放源).toContain('huoQuYinLiang')
    expect(转写源).toContain('huoQuYinLiang')
    expect(聊天页源).toContain('duQuShengYinYinLiang')
    expect(好友页源).toContain('duQuShengYinYinLiang')
  })

  it('路由菜单全链路齐备：声音路由与菜单入口在位', () => {
    expect(路由源).toContain("path: 'sheng-yin'")
    expect(路由源).toContain("name: 'shengYin'")
    expect(菜单源).toContain('jinRuShengYin')
    expect(菜单源).toContain("router.push('/sheng-yin')")
  })
})

describe('FP-0607 需求13 背景：自定义命名删除确认与海洋之蓝纵向渐变', () => {
  it('背景名与删除确认文案来自翻译文件', () => {
    expect(huoQuFanYi('sheZhi', 'beiJingMingCheng')).toBeTruthy()
    expect(huoQuFanYi('sheZhi', 'beiJingMingChengWeiKong')).toBeTruthy()
    expect(huoQuFanYi('sheZhi', 'beiJingMingChengTaiChang')).toBeTruthy()
    expect(huoQuFanYi('sheZhi', 'queRenShanChuBeiJing')).toBeTruthy()
  })

  it('自定义区有名输入框且删除走确认', () => {
    expect(预览页源).toContain('zi-ding-yi-ming-cheng')
    expect(预览页源).toContain('beiJingMingCheng')
    expect(预览页源).toContain('beiJingMingChengTaiChang')
    expect(预览页源).toContain('queRenShanChuBeiJing')
    expect(预览页源).toContain('queRenShanChu')
  })

  it('海洋之蓝为浅蓝到深蓝纵向渐变且三处同吃令牌', () => {
    expect(令牌源).toContain('--liaotian-beijing-haiYangZhiLan: linear-gradient(to bottom, #7fb8f0, #2f6db3)')
    for (const 源 of [聊天页源, 好友页源, 预览页源, 气泡页源]) {
      expect(源).toContain('var(--liaotian-beijing-haiYangZhiLan)')
    }
    expect(聊天页源).not.toContain('#1a3a5c')
    expect(好友页源).not.toContain('#1a3a5c')
  })

  it('前后校验同形态：新签名与旧签名均放行', async () => {
    const { shiZiDingYiBeiJingURL } = await import('@/stores/用户设置')
    const 旧签名 = `/api/媒体/${'a'.repeat(64)}?e=9999999999&s=${'b'.repeat(64)}`
    const 新签名 = `/api/媒体/${'a'.repeat(64)}?e=9999999999&u=11111111-1111-4111-8111-111111111111&t=123&s=abc`
    expect(shiZiDingYiBeiJingURL(旧签名)).toBe(true)
    expect(shiZiDingYiBeiJingURL(新签名)).toBe(true)
    expect(shiZiDingYiBeiJingURL('http://mingwen.example.com/a.jpg')).toBe(false)
    expect(shiZiDingYiBeiJingURL('')).toBe(false)
  })
})

describe('FP-0607 需求14/15 预览复用真实消息行结构', () => {
  it('账号预览复用消息行类名：头像行气泡外壳气泡内容三件套齐备', () => {
    expect(预览页源).toContain('xiaoxi-hang jiaose-xiaoxi')
    expect(预览页源).toContain('xiaoxi-hang yonghu-xiaoxi')
    expect(预览页源).toContain('<TouXiang')
    expect(预览页源).toContain('qipao-waike')
    expect(预览页源).toContain('qipao-neirong')
  })

  it('气泡设置预览同框背景下承载气泡：背景类与内联样式同框', () => {
    expect(气泡页源).toContain('qipao-yu-lan-qu')
    expect(气泡页源).toContain('beiJingNeiLianYangShi')
    expect(气泡页源).toContain('qipao-neirong')
  })

  it('预览与聊天页气泡几何同源：同吃内边距圆角字号行高', () => {
    for (const 源 of [预览页源, 气泡页源]) {
      expect(源).toContain('var(--jiange-9)')
      expect(源).toContain('var(--jiange-13)')
      expect(源).toContain('border-radius: 6px')
      expect(源).toContain('font-size: 16px')
      expect(源).toContain('line-height: 1.45')
    }
  })
})

describe('FP-0607 需求17 气泡：字重单源消除加粗不一致', () => {
  it('字重令牌在位且值为 400', () => {
    expect(令牌源).toContain('--qipao-xuan-zhong-zi-zhong: 400')
  })

  it('选择器选中态无 currentcolor 边框漂移且无 600 加粗', () => {
    expect(选择器源).not.toContain('currentcolor')
    expect(选择器源).not.toContain('currentColor')
    expect(选择器源).not.toMatch(/font-weight:\s*600/)
    expect(选择器源).toContain('var(--qipao-xuan-zhong-zi-zhong)')
    expect(选择器源).toContain('var(--yanse-qiangdiao)')
  })

  it('气泡与预览字重同吃单源', () => {
    for (const 源 of [聊天页源, 好友页源, 预览页源, 气泡页源]) {
      expect(源).toContain('var(--qipao-xuan-zhong-zi-zhong)')
    }
    expect(quChuZhuShi(选择器源)).not.toMatch(/font-weight:\s*600/)
    expect(quChuZhuShi(气泡页源)).not.toMatch(/font-weight:\s*600/)
  })

  it('CSS 变量单源输出仍为四键', () => {
    const bianLiang = huoQuQiPaoCSSBianLiang('tianKongLan', 'anYe')
    expect(bianLiang['--qipao-ziJi-beiJing']).toBe(QI_PAO_YU_SHE_BIAO.tianKongLan.beiJing)
    expect(bianLiang['--qipao-ziJi-wenBen']).toBe(QI_PAO_YU_SHE_BIAO.tianKongLan.wenBen)
    expect(bianLiang['--qipao-duiFang-beiJing']).toBe(QI_PAO_YU_SHE_BIAO.anYe.beiJing)
    expect(bianLiang['--qipao-duiFang-wenBen']).toBe(QI_PAO_YU_SHE_BIAO.anYe.wenBen)
  })
})
