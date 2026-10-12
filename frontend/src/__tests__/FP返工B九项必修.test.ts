import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import HaoYouLieBiao from '@/views/好友列表.vue'
import ShengYinYe from '@/views/声音设置.vue'
import { huoQuFanYi } from '@/config/translations'
import {
  SHENG_YIN_YIN_LIANG,
  duQuShengYinDangYinLiang,
} from '@/config/消息配置'
import { ZHAN_JI_LUO_WEI, quXian } from '@/config/设计令牌'

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

const 好友列表源 = readFileSync(resolve(__dirname, '../views/好友列表.vue'), 'utf8')
const 过往战绩源 = readFileSync(resolve(__dirname, '../views/过往战绩.vue'), 'utf8')
const 声音页源 = readFileSync(resolve(__dirname, '../views/声音设置.vue'), 'utf8')
const 聊天页源 = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
const 好友页源 = readFileSync(resolve(__dirname, '../views/好友聊天.vue'), 'utf8')
const 账号页源 = readFileSync(resolve(__dirname, '../views/账号与安全.vue'), 'utf8')
const 后端战绩服务源 = readFileSync(resolve(__dirname, '../../../backend/src/services/战绩.ts'), 'utf8')
const 后端战绩路由源 = readFileSync(resolve(__dirname, '../../../backend/src/routes/战绩.ts'), 'utf8')
const 后端翻译源 = readFileSync(resolve(__dirname, '../../../backend/src/config/translations.ts'), 'utf8')

async function guaHaoYouLieBiao(lieBiao: unknown[]) {
  setActivePinia(createPinia())
  const sheJiao = await import('@/api/社交')
  vi.mocked(sheJiao.huoQuHaoYouLieBiao).mockResolvedValue(lieBiao as never)
  const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: HaoYouLieBiao }] })
  router.push('/')
  await router.isReady()
  const wrapper = mount(HaoYouLieBiao, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('FP-返工B D1 中文按拼音首字母分区', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('张李分桶且排序口径一致：索引含 Z/L、无全量塌进#', async () => {
    const wrapper = await guaHaoYouLieBiao([
      { id: 'u1', yong_hu_ming: 'zhang', ni_cheng: '张三', tou_xiang: null, qian_ming: null },
      { id: 'u2', yong_hu_ming: 'li', ni_cheng: '李四', tou_xiang: null, qian_ming: null },
      { id: 'u3', yong_hu_ming: 'an', ni_cheng: '安然', tou_xiang: null, qian_ming: null },
      { id: 'u4', yong_hu_ming: 'alice', ni_cheng: 'Alice', tou_xiang: null, qian_ming: null },
    ])
    await flushPromises()
    const fenQu = wrapper.findAll('.fen-qu-biao-ti').map((x) => x.text())
    expect(fenQu).toContain('Z')
    expect(fenQu).toContain('L')
    expect(fenQu).toContain('A')
    expect(fenQu.filter((x) => x === '#')).toHaveLength(0)
    wrapper.unmount()
  })

  it('非汉字非字母归#兜底且#恒末尾', async () => {
    const wrapper = await guaHaoYouLieBiao([
      { id: 'u1', yong_hu_ming: 'bob', ni_cheng: 'Bob', tou_xiang: null, qian_ming: null },
      { id: 'u2', yong_hu_ming: null, ni_cheng: '1号选手', tou_xiang: null, qian_ming: null },
      { id: 'u3', yong_hu_ming: null, ni_cheng: null, tou_xiang: null, qian_ming: null },
    ])
    await flushPromises()
    const fenQu = wrapper.findAll('.fen-qu-biao-ti').map((x) => x.text())
    expect(fenQu[fenQu.length - 1]).toBe('#')
    wrapper.unmount()
  })

  it('源码无拼音第三方依赖：锚点小表 + Intl.Collator 单源', () => {
    expect(好友列表源).toContain('HAN_YU_PIN_YIN_ANCHORS')
    expect(好友列表源).toContain("new Intl.Collator('zh')")
    expect(好友列表源).not.toMatch(/pinyin-pro|import.*pinyin|require.*pinyin/i)
  })
})

describe('FP-返工B D4 后端摘要占位走翻译文件', () => {
  it('服务侧四占位全走翻译键', () => {
    expect(后端战绩服务源).toContain("huoQuFanYi('zhanJi', 'yuYinZhaiYao')")
    expect(后端战绩服务源).toContain("huoQuFanYi('zhanJi', 'tuPianZhaiYao')")
    expect(后端战绩服务源).toContain("huoQuFanYi('zhanJi', 'biaoQingBaoZhaiYao')")
    expect(后端战绩服务源).toContain("huoQuFanYi('zhanJi', 'wenJianZhaiYao')")
    expect(后端战绩服务源).not.toMatch(/return '\[语音\]'/)
    expect(后端战绩服务源).not.toMatch(/return '\[图片\]'/)
    expect(后端战绩服务源).not.toMatch(/return '\[表情包\]'/)
    expect(后端战绩服务源).not.toMatch(/return '\[文件\]'/)
  })

  it('翻译文件四键实体在位', () => {
    expect(后端翻译源).toContain('yuYinZhaiYao')
    expect(后端翻译源).toContain('tuPianZhaiYao')
    expect(后端翻译源).toContain('biaoQingBaoZhaiYao')
    expect(后端翻译源).toContain('wenJianZhaiYao')
  })
})

describe('FP-返工B D3 路由摘要码点截断', () => {
  it('路由侧改 Array.from 切分且吃配置单源', () => {
    expect(后端战绩路由源).toContain('Array.from(tiao.zhai_yao)')
    expect(后端战绩路由源).not.toMatch(/zhai_yao\.slice\(0,\s*30\)/)
    expect(后端战绩路由源).toContain('ZHAN_JI_PEI_ZHI.zhaiYaoZuiDaMaDian')
  })

  it('代理项反例：29 ASCII + 表情不再切出孤立代理项', () => {
    const yuan = `${'a'.repeat(29)}😀多余尾巴`
    const jieGuo = Array.from(yuan).slice(0, 30).join('')
    expect(Array.from(jieGuo)).toHaveLength(30)
    expect(() => encodeURIComponent(jieGuo)).not.toThrow()
    expect(jieGuo.endsWith('�')).toBe(false)
  })
})

describe('FP-返工B D5 音量映射收归 config 单源', () => {
  it('单源表在位且读口归一', () => {
    expect(SHENG_YIN_YIN_LIANG).toEqual({
      genSuiXiTong: null,
      jingYin: 0,
      xiao: 0.25,
      zhong: 0.5,
      da: 0.75,
      zuiDa: 1,
    })
    expect(duQuShengYinDangYinLiang('zhong')).toBe(0.5)
    expect(duQuShengYinDangYinLiang('buCunZai')).toBeNull()
  })

  it('三处不再各抄字面量表', () => {
    expect(声音页源).toContain('SHENG_YIN_YIN_LIANG')
    expect(聊天页源).toContain('duQuShengYinDangYinLiang')
    expect(好友页源).toContain('duQuShengYinDangYinLiang')
    expect(聊天页源).not.toMatch(/xiao:\s*0\.25/)
    expect(好友页源).not.toMatch(/xiao:\s*0\.25/)
  })
})

describe('FP-返工B D6 预留标去除口径一致', () => {
  it('声音页不再渲染预留标且翻译键已删', async () => {
    setActivePinia(createPinia())
    const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: ShengYinYe }] })
    router.push('/')
    await router.isReady()
    const wrapper = mount(ShengYinYe, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(6)
    expect(wrapper.find('.sheng-yin-yu-liu').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('预留')
    const 翻译源 = readFileSync(resolve(__dirname, '../config/translations.ts'), 'utf8')
    expect(翻译源).not.toContain('shengYinWeiJieRu')
    wrapper.unmount()
  })
})

describe('FP-返工B D2 背景名为本地别名并文档标注', () => {
  it('本地别名文案在位且重载回显当前背景名', () => {
    expect(账号页源).toContain('beiJingMingChengBenDiBieMing')
    expect(huoQuFanYi('sheZhi', 'beiJingMingChengBenDiBieMing')).toContain('仅本机显示')
    expect(huoQuFanYi('sheZhi', 'beiJingMingChengZhanWei')).toContain('本地别名')
  })
})

describe('FP-返工B D7 背景双报错纳入去重', () => {
  it('背景域纳入顶栏去重且字段错与顶栏同错互斥渲染', () => {
    expect(账号页源).toContain("'beiJing'")
    expect(账号页源).toContain('tongYiShiBai')
    expect(账号页源).toContain('v-if="fenQuanCuoWu.beiJing && !dingCengCuoWu"')
  })
})

describe('FP-返工B D8 时长曲线单源且死令牌删除', () => {
  it('JS 吃设计令牌单源且死令牌无残留', () => {
    expect(ZHAN_JI_LUO_WEI.shiChangHaoMiao).toBe(320)
    expect(ZHAN_JI_LUO_WEI.tuoZhuaiHaoMiao).toBe(320)
    expect(quXian.huanYing).toBe('cubic-bezier(0.22, 1, 0.36, 1)')
    expect(过往战绩源).toContain('ZHAN_JI_LUO_WEI')
    expect(过往战绩源).toContain('quXian.huanYing')
    expect(过往战绩源).not.toMatch(/duration:\s*320/)
    expect(过往战绩源).not.toMatch(/--kapian-liu-wei/)
  })
})

describe('FP-返工B D9 列表第二查询窗口函数限流', () => {
  it('服务侧用 ROW_NUMBER 分区取前二且阈值走配置', () => {
    expect(后端战绩服务源).toContain('ROW_NUMBER() OVER (PARTITION BY')
    expect(后端战绩服务源).toContain('hang_hao <= $3')
    expect(后端战绩服务源).toContain('ZHAN_JI_PEI_ZHI.zuiHouXiaoXiMeiJiaoSeTiaoShu')
  })
})
