import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import HaoYouLiaoTian from '@/views/好友聊天.vue'
import ShouQuanDanChuang from '@/components/多媒体授权弹窗.vue'
import { huoQuFanYi } from '@/config/translations'
import {
  LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI,
  MEI_TI_XIAO_XI_LEI_XING,
  TU_PIAN_XIAO_XI_LEI_XING,
} from '@/config/消息配置'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用表情仓库 } from '@/stores/表情'
import type { HaoYouXiaoXi } from '@/api/社交'

/**
 * FP-21 好友聊天媒体通路的前端行为用例（补 L-48(3)：此前该页的媒体能力只有源码扫描，
 * 一条挂载级行为断言都没有）。
 *
 * 覆盖：相册/文件/粘贴三个入口、图片与文件两种气泡、乐观气泡与失败回滚、
 * 发送中（blob 预览）态、签名过期时的合并重拉、blob 地址在刷新与离页两处的回收、
 * 授权 Promise 队列（连点不吞前一条，即聊天页 L-23 的反面）、撤回行不出图、
 * 以及「前端不写第二份媒体清单/第二套压缩」的同类点穷尽。
 */

const 我的编号 = '11111111-1111-4111-8111-111111111111'
const 好友编号 = '22222222-2222-4222-8222-222222222222'

const 取消息 = vi.fn()
const 发消息 = vi.fn()
const 撤回消息 = vi.fn()
const 标已读 = vi.fn()
const 取列表 = vi.fn()
const 传媒体 = vi.fn()
const 取名片 = vi.fn()
const 压缩图片 = vi.fn()

vi.mock('@/api/社交', () => ({
  huoQuHaoYouXiaoXi: (...c: unknown[]) => 取消息(...c),
  faSongHaoYouXiaoXi: (...c: unknown[]) => 发消息(...c),
  cheHuiHaoYouXiaoXi: (...c: unknown[]) => 撤回消息(...c),
  biaoJiHaoYouYiDu: (...c: unknown[]) => 标已读(...c),
  huoQuHaoYouLieBiao: (...c: unknown[]) => 取列表(...c),
  shangChuanHaoYouMeiTi: (...c: unknown[]) => 传媒体(...c),
  huoQuYongHuSheZhi: vi.fn().mockResolvedValue({
    uid: 'u',
    shou_ji_hao: '',
    tou_xiang: null,
    qian_ming: null,
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: 'moRen',
    qi_pao_zi_ji: 'weiXinLv',
    qi_pao_ai: 'yunBai',
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  }),
}))

vi.mock('@/api/资料', () => ({
  huoQuMingPian: (...c: unknown[]) => 取名片(...c),
}))

const 表情写入 = vi.fn()

vi.mock('@/api/表情', () => ({
  tianJiaBiaoQing: (...c: unknown[]) => 表情写入(...c),
  huoQuWoDeBiaoQing: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  shanChuBiaoQing: vi.fn().mockResolvedValue(undefined),
  baoCunBiaoQingPaiXu: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  MO_REN_WEN_JIAN_MING: 'biaoqing.png',
}))

vi.mock('@/utils/图片压缩', () => ({
  yaSuoTuPiang: (...c: unknown[]) => 压缩图片(...c),
  YA_SUO_CHANG_BIAN_SHANG_XIAN: 1280,
  YA_SUO_ZHI_LIANG: 0.8,
}))

function 媒体消息(覆盖: Partial<HaoYouXiaoXi> = {}): HaoYouXiaoXi {
  return {
    id: 'x-1',
    fa_song_zhe_id: 好友编号,
    jie_shou_zhe_id: 我的编号,
    nei_rong: '',
    lei_xing: 'tuPian',
    mei_ti_id: '33333333-3333-4333-8333-333333333333',
    mei_ti_url: '/api/媒体/' + 'a'.repeat(64) + '?e=9999999999&u=2&t=3&s=4',
    mei_ti_lei_bie: 'tupian',
    mei_ti_yuan_shi_wen_jian_ming: 'pet.png',
    mei_ti_da_xiao_zi_jie: 2 * 1024 * 1024,
    yi_du: false,
    yi_che_hui: false,
    shi_jian_chuo: Date.now(),
    ...覆盖,
  } as HaoYouXiaoXi
}

async function 挂载(初始列表: HaoYouXiaoXi[] = []) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const 用户仓库 = 使用用户仓库()
  用户仓库.dangQianYongHu = {
    id: 我的编号,
    shou_ji_hao: '13900000001',
    yong_hu_ming: 'self',
    ni_cheng: '我',
    tou_xiang: null,
  } as never
  用户仓库.sheZhiTuPianShouQuan(true)
  取消息.mockResolvedValue(初始列表)
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/hao-you/:haoYouId', component: HaoYouLiaoTian }],
  })
  router.push(`/hao-you/${好友编号}`)
  await router.isReady()
  const wrapper = mount(HaoYouLiaoTian, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function 文件(名称 = '我方狗头.png', 类型 = 'image/png'): File {
  return new File([new Uint8Array(64)], 名称, { type: 类型 })
}

/** 真 Event + 真 clipboardData：paste 走 DOM 派发，才能同时验到「命中图片即拦截原生粘贴」 */
function 假粘贴事件(项列表: Array<{ kind: string; 类型: string; 文件?: File | null }>) {
  const 事件 = new Event('paste', { bubbles: true, cancelable: true }) as Event & {
    clipboardData: unknown
  }
  事件.clipboardData = {
    items: 项列表.map((项) => ({
      kind: 项.kind,
      type: 项.类型,
      getAsFile: () => (项.文件 === undefined ? null : 项.文件),
    })),
    files: [],
  }
  return 事件
}

function 贴入(wrapper: ReturnType<typeof mount>, 项列表: Array<{ kind: string; 类型: string; 文件?: File | null }>) {
  const 事件 = 假粘贴事件(项列表)
  wrapper.find('textarea.shuru-kuang').element.dispatchEvent(事件)
  return 事件
}

function 拒绝(status: number, 提示: string) {
  return { isAxiosError: true, response: { status, data: { cheng_gong: false, ti_shi: 提示 } } }
}

beforeEach(() => {
  vi.clearAllMocks()
  撤回消息.mockResolvedValue(undefined)
  标已读.mockResolvedValue(undefined)
  取列表.mockResolvedValue([{ id: 好友编号, yong_hu_ming: 'ta', ni_cheng: 'TA', tou_xiang: null, qian_ming: null }])
  取名片.mockResolvedValue({ qi_pao_zi_ji: 'yunBai' })
  取消息.mockResolvedValue([])
  发消息.mockResolvedValue({ id: 'x-9', shi_jian_chuo: Date.now() })
  传媒体.mockResolvedValue({
    mediaId: '33333333-3333-4333-8333-333333333333',
    sha256: 'a'.repeat(64),
    mime: 'image/png',
    daXiao: 64,
    leiBie: 'tupian',
    yuanShiWenJianMing: '我方狗头.png',
    mei_ti_url: '/api/媒体/signed',
  })
  压缩图片.mockImplementation(async (文: File) => 文)
  ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:yu-lan')
  ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FP-21 好友媒体气泡渲染', () => {
  it('图片消息出 .tupian-qipao，src 就是服务端现签的绑定读者地址', async () => {
    const 地址 = '/api/媒体/' + 'b'.repeat(64) + '?e=1&u=2&t=3&s=4'
    const wrapper = await 挂载([媒体消息({ mei_ti_url: 地址 })])
    const 图 = wrapper.find('img.tupian-qipao')
    expect(图.exists()).toBe(true)
    expect(图.attributes('src')).toBe(地址)
    expect(图.attributes('alt')).toBe(huoQuFanYi('duoMeiTi', 'tuPianYuLan'))
    expect(wrapper.find('.wenjian-qipao').exists()).toBe(false)
    expect(wrapper.find('.qipao-neirong').exists()).toBe(false)
    wrapper.unmount()
  })

  it('文件消息出文件泡：文件名 + 大小 + 带 download 的链接；缺名时回落翻译文案', async () => {
    const wrapper = await 挂载([
      媒体消息({ lei_xing: 'wenJian', mei_ti_lei_bie: 'wenjian', mei_ti_yuan_shi_wen_jian_ming: '笔记.pdf' }),
      媒体消息({ id: 'x-2', lei_xing: 'wenJian', mei_ti_yuan_shi_wen_jian_ming: null }),
    ])
    const 泡 = wrapper.findAll('.wenjian-qipao')
    expect(泡).toHaveLength(2)
    expect(泡[0].find('.wenjian-ming').text()).toBe('笔记.pdf')
    expect(泡[0].find('.wenjian-daxiao').text()).toBe('2.0MB')
    const 链 = 泡[0].find('a.wenjian-xiazai')
    expect(链.attributes('download')).toBe('笔记.pdf')
    expect(链.text()).toBe(huoQuFanYi('duoMeiTi', 'xiaZaiWenJian'))
    expect(泡[1].find('.wenjian-ming').text()).toBe(huoQuFanYi('haoYou', 'weiMingMing'))
    wrapper.unmount()
  })

  it('类型清单只有一个真源：表情包走图片泡、语音/文件走文件泡，都不各写一份', async () => {
    const wrapper = await 挂载([
      媒体消息({ id: 'a', lei_xing: 'biaoQingBao', mei_ti_lei_bie: 'biaoqingshu' }),
      媒体消息({ id: 'b', lei_xing: 'yuYin', mei_ti_lei_bie: 'yuyin' }),
    ])
    expect(wrapper.findAll('img.tupian-qipao')).toHaveLength(1)
    expect(wrapper.findAll('.wenjian-qipao')).toHaveLength(1)
    expect([...MEI_TI_XIAO_XI_LEI_XING].sort()).toEqual(['biaoQingBao', 'tuPian', 'wenJian', 'yuYin'])
    expect([...TU_PIAN_XIAO_XI_LEI_XING].sort()).toEqual(['biaoQingBao', 'tuPian'])
    wrapper.unmount()
  })

  it('mei_ti_url 缺失（已撤回/媒体行被回收）⇒ 回落文本泡而不是破图', async () => {
    const wrapper = await 挂载([媒体消息({ mei_ti_url: null, nei_rong: '' })])
    expect(wrapper.find('img.tupian-qipao').exists()).toBe(false)
    expect(wrapper.find('.wenjian-qipao').exists()).toBe(false)
    expect(wrapper.find('.qipao-neirong').exists()).toBe(true)
    wrapper.unmount()
  })

  it('撤回行不出图也不出文件泡，只显示撤回文案（服务端已把内容与地址一起剥掉）', async () => {
    const wrapper = await 挂载([
      媒体消息({ yi_che_hui: true, nei_rong: '', mei_ti_id: null, mei_ti_url: null, mei_ti_lei_bie: null }),
    ])
    expect(wrapper.find('img.tupian-qipao').exists()).toBe(false)
    expect(wrapper.find('.wenjian-qipao').exists()).toBe(false)
    expect(wrapper.find('.qipao-neirong').text()).toBe(
      huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi'),
    )
    wrapper.unmount()
  })
})

describe('FP-21 三个发送入口：相册 / 文件 / 粘贴', () => {
  it('相册入口：压缩后按 tupian 上传，再按 tuPian 发送，成功后回收 blob 预览地址', async () => {
    const wrapper = await 挂载()
    const 原图 = 文件()
    压缩图片.mockResolvedValueOnce(原图)
    const 输入 = wrapper.find('input.yincang-wenjian-shuru')
    Object.defineProperty(输入.element, 'files', { value: [原图], configurable: true })
    await 输入.trigger('change')
    await flushPromises()
    expect(压缩图片).toHaveBeenCalledTimes(1)
    expect(传媒体).toHaveBeenCalledTimes(1)
    expect(传媒体.mock.calls[0][0]).toBe(好友编号)
    expect(传媒体.mock.calls[0][2]).toBe('tupian')
    expect(发消息.mock.calls[0][3]).toEqual({
      leiXing: 'tuPian',
      meiTiId: '33333333-3333-4333-8333-333333333333',
    })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:yu-lan')
    expect(wrapper.find('.fasong-tishi').exists()).toBe(false)
    wrapper.unmount()
  })

  it('文件入口：按 wenjian 类别上传、按 wenJian 类型发送，压缩一步不参与', async () => {
    const wrapper = await 挂载()
    const 输入列表 = wrapper.findAll('input.yincang-wenjian-shuru')
    const 文件输入 = 输入列表[1]
    const 文 = 文件('报告.pdf', 'application/pdf')
    Object.defineProperty(文件输入.element, 'files', { value: [文], configurable: true })
    await 文件输入.trigger('change')
    await flushPromises()
    expect(压缩图片).not.toHaveBeenCalled()
    expect(传媒体.mock.calls[0][1]).toBe(文)
    expect(传媒体.mock.calls[0][2]).toBe('wenjian')
    expect(发消息.mock.calls[0][3]).toEqual({
      leiXing: 'wenJian',
      meiTiId: '33333333-3333-4333-8333-333333333333',
    })
    wrapper.unmount()
  })

  it('粘贴入口复用唯一实现：白名单图片走同一条上传链，非白名单只提示零发送', async () => {
    const wrapper = await 挂载()
    const 图 = 文件('clip.png', 'image/png')
    const 事件 = 贴入(wrapper, [{ kind: 'file', 类型: 'image/png', 文件: 图 }])
    await flushPromises()
    expect(事件.defaultPrevented).toBe(true)
    expect(传媒体).toHaveBeenCalledTimes(1)
    expect(传媒体.mock.calls[0][1]).toBe(图)
    expect(发消息).toHaveBeenCalledTimes(1)

    传媒体.mockClear()
    发消息.mockClear()
    const 拒绝事件 = 贴入(wrapper, [{ kind: 'file', 类型: 'image/svg+xml', 文件: 文件('x.svg', 'image/svg+xml') }])
    await flushPromises()
    expect(拒绝事件.defaultPrevented).toBe(true)
    expect(传媒体).not.toHaveBeenCalled()
    expect(发消息).not.toHaveBeenCalled()
    expect(wrapper.find('.fasong-tishi').text()).toBe(huoQuFanYi('duoMeiTi', 'zhanTieMIMEBuZhiChi'))

    // 纯文本粘贴完全不拦截：交回浏览器原生行为
    const 文本事件 = 贴入(wrapper, [{ kind: 'string', 类型: 'text/plain' }])
    expect(文本事件.defaultPrevented).toBe(false)
    wrapper.unmount()
  })

  it('未开启图片授权时不外发：拒绝即提示，一个请求都不发；确认后同一文件立即发出', async () => {
    const wrapper = await 挂载()
    const 用户仓库 = 使用用户仓库()
    用户仓库.sheZhiTuPianShouQuan(false)
    const 原图 = 文件()
    const 输入 = wrapper.find('input.yincang-wenjian-shuru')
    Object.defineProperty(输入.element, 'files', { value: [原图], configurable: true })
    await 输入.trigger('change')
    await flushPromises()
    const 弹窗 = wrapper.findComponent(ShouQuanDanChuang)
    expect(弹窗.exists()).toBe(true)
    expect(传媒体).not.toHaveBeenCalled()
    弹窗.vm.$emit('ju-jue')
    await flushPromises()
    expect(wrapper.find('.fasong-tishi').text()).toBe(huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi'))
    expect(传媒体).not.toHaveBeenCalled()

    Object.defineProperty(输入.element, 'files', { value: [原图], configurable: true })
    await 输入.trigger('change')
    await flushPromises()
    const 第二个 = wrapper.findComponent(ShouQuanDanChuang)
    第二个.vm.$emit('que-ren')
    await flushPromises()
    expect(传媒体).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('授权窗未关时连点两次：两条都发出去（队列承载，不复制聊天页 L-23 的单变量缺陷）', async () => {
    const wrapper = await 挂载()
    使用用户仓库().sheZhiTuPianShouQuan(false)
    const 输入 = wrapper.find('input.yincang-wenjian-shuru')
    for (const 次 of [1, 2]) {
      Object.defineProperty(输入.element, 'files', { value: [文件(`第${次}张.png`)], configurable: true })
      await 输入.trigger('change')
      await flushPromises()
    }
    expect(传媒体).not.toHaveBeenCalled()
    wrapper.findComponent(ShouQuanDanChuang).vm.$emit('que-ren')
    await flushPromises()
    expect(传媒体).toHaveBeenCalledTimes(2)
    expect(发消息).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})

describe('FP-21 发送中/失败态与资源回收', () => {
  it('上传在途时先出乐观气泡（blob 预览地址），成功后由服务端签名地址接管', async () => {
    const wrapper = await 挂载()
    let 放行: (值: unknown) => void = () => undefined
    传媒体.mockReturnValueOnce(new Promise((resolve) => (放行 = resolve)))
    const 输入 = wrapper.find('input.yincang-wenjian-shuru')
    Object.defineProperty(输入.element, 'files', { value: [文件()], configurable: true })
    await 输入.trigger('change')
    await flushPromises()
    const 在途 = wrapper.findAll('img.tupian-qipao')
    expect(在途).toHaveLength(1)
    expect(在途[0].attributes('src')).toBe('blob:yu-lan')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.fasong-tishi').exists()).toBe(false)
    放行({ mediaId: '33333333-3333-4333-8333-333333333333' })
    await flushPromises()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:yu-lan')
    wrapper.unmount()
  })

  it('上传失败：乐观气泡撤掉、就地显示后端文案，不整页崩', async () => {
    const wrapper = await 挂载([媒体消息({ id: '保-1' })])
    传媒体.mockRejectedValueOnce(拒绝(413, '文件超出大小限制'))
    const 输入 = wrapper.find('input.yincang-wenjian-shuru')
    Object.defineProperty(输入.element, 'files', { value: [文件()], configurable: true })
    await 输入.trigger('change')
    await flushPromises()
    expect(wrapper.findAll('.xiaoxi-xiangmu')).toHaveLength(1)
    expect(wrapper.find('.fasong-tishi').text()).toBe('文件超出大小限制')
    expect(wrapper.find('img.tupian-qipao').attributes('src')).not.toContain('blob:')
    wrapper.unmount()
  })

  it('发送消息失败（上传已成功）：同样回滚乐观气泡并提示', async () => {
    const wrapper = await 挂载()
    发消息.mockRejectedValueOnce(拒绝(403, '对方还不是你的好友'))
    const 输入 = wrapper.find('input.yincang-wenjian-shuru')
    Object.defineProperty(输入.element, 'files', { value: [文件()], configurable: true })
    await 输入.trigger('change')
    await flushPromises()
    expect(wrapper.findAll('.xiaoxi-xiangmu')).toHaveLength(0)
    expect(wrapper.find('.fasong-tishi').text()).toBe('对方还不是你的好友')
    wrapper.unmount()
  })

  it('压缩抛错也只提示不抛出：零未捕获异常、零上传', async () => {
    const 未捕获: unknown[] = []
    const 记录 = (事: PromiseRejectedResult) => 未捕获.push(事.reason)
    ;(globalThis as unknown as { addEventListener: (k: string, f: unknown) => void }).addEventListener(
      'unhandledrejection',
      记录 as never,
    )
    const wrapper = await 挂载()
    压缩图片.mockRejectedValueOnce(new Error('浏览器拒绝解码'))
    const 输入 = wrapper.find('input.yincang-wenjian-shuru')
    Object.defineProperty(输入.element, 'files', { value: [文件()], configurable: true })
    await 输入.trigger('change')
    await flushPromises()
    expect(传媒体).not.toHaveBeenCalled()
    expect(wrapper.find('.fasong-tishi').text()).toContain('浏览器拒绝解码')
    ;(globalThis as unknown as { removeEventListener: (k: string, f: unknown) => void }).removeEventListener(
      'unhandledrejection',
      记录 as never,
    )
    expect(未捕获).toHaveLength(0)
    wrapper.unmount()
  })

  it('签名过期：一屏多张失效图只合并成一次重拉，同一条不再触发第二次', async () => {
    const wrapper = await 挂载([
      媒体消息({ id: 'm1' }),
      媒体消息({ id: 'm2' }),
      媒体消息({ id: 'm3' }),
      媒体消息({ id: 'm4' }),
    ])
    const 起点 = 取消息.mock.calls.length
    const 图 = wrapper.findAll('img.tupian-qipao')
    expect(图).toHaveLength(4)
    // 四张图在同一批事件循环里各自报失效：整页只允许发一次重拉（旧实现是四次整表重拉）
    await Promise.all(图.map((一张) => 一张.trigger('error')))
    await flushPromises()
    expect(取消息.mock.calls.length - 起点).toBe(1)
    // 同一批消息再报一次也不加请求：每条在一个页面生命周期内只登记一次
    await Promise.all(wrapper.findAll('img.tupian-qipao').map((一张) => 一张.trigger('error')))
    await flushPromises()
    expect(取消息.mock.calls.length - 起点).toBe(1)
    wrapper.unmount()
  })

  it('上传在途中离页：预览地址当场回收，但在途那条不被静默丢弃（发完为止）', async () => {
    const wrapper = await 挂载()
    let 放行: (值: unknown) => void = () => undefined
    传媒体.mockReturnValueOnce(new Promise((解决) => (放行 = 解决)))
    const 输入 = wrapper.find('input.yincang-wenjian-shuru')
    Object.defineProperty(输入.element, 'files', { value: [文件()], configurable: true })
    await 输入.trigger('change')
    await flushPromises()
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:yu-lan')
    放行({ mediaId: '33333333-3333-4333-8333-333333333333' })
    await flushPromises()
    // 预览地址是本地资源，离页即回收；上传已发生的这条则照发，不静默丢用户的东西
    expect(发消息).toHaveBeenCalledTimes(1)
  })

  it('授权弹窗未决时离页：待确认的 Promise 有终态，零未捕获异常、零上传', async () => {
    const 未捕获: unknown[] = []
    const 记录 = (事: PromiseRejectedResult) => 未捕获.push(事.reason)
    window.addEventListener('unhandledrejection', 记录 as never)
    const wrapper = await 挂载()
    使用用户仓库().sheZhiTuPianShouQuan(false)
    const 输入 = wrapper.find('input.yincang-wenjian-shuru')
    Object.defineProperty(输入.element, 'files', { value: [文件()], configurable: true })
    await 输入.trigger('change')
    await flushPromises()
    expect(wrapper.findComponent(ShouQuanDanChuang).exists()).toBe(true)
    wrapper.unmount()
    await flushPromises()
    window.removeEventListener('unhandledrejection', 记录 as never)
    expect(未捕获).toHaveLength(0)
    expect(传媒体).not.toHaveBeenCalled()
  })
})

describe('FP-21/FP-20 好友页图片气泡「添加到表情」（与聊天页同一份实现）', () => {
  const 原取图 = globalThis.fetch
  let 取图: ReturnType<typeof vi.fn>

  const 旧地址 = '/api/媒体/' + 'c'.repeat(64) + '?e=1&u=2&t=3&s=4'
  const 新地址 = '/api/媒体/' + 'd'.repeat(64) + '?e=2&u=2&t=3&s=4'

  function 菜单按钮(): HTMLElement[] {
    return Array.from(document.body.querySelectorAll('.chehui-caidan .chehui-xiangmu'))
  }

  async function 右键第几条(wrapper: ReturnType<typeof mount>, 序号 = 0) {
    const 项 = wrapper.findAll('.xiaoxi-xiangmu')
    await 项[序号].trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
  }

  beforeEach(() => {
    取图 = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['qu-tu'], { type: 'image/png' }),
    })
    globalThis.fetch = 取图 as unknown as typeof fetch
    表情写入.mockReset()
    表情写入.mockResolvedValue({
      xiang: {
        id: 'b-1',
        mei_ti_id: '33333333-3333-4333-8333-333333333333',
        sha256: 'a'.repeat(64),
        mime: 'image/png',
        duan_ming: 'pet.png',
        pai_xu: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
        mei_ti_url: '/api/媒体/signed',
      },
      yiCunZai: false,
    })
  })

  afterEach(() => {
    globalThis.fetch = 原取图
  })

  it('图片气泡右键只出「添加到表情」，点它即取图一次、写入一次并亮状态条', async () => {
    const wrapper = await 挂载([媒体消息({ mei_ti_url: 旧地址 })])
    await 右键第几条(wrapper)
    expect(菜单按钮().map((钮) => 钮.textContent?.trim())).toEqual([
      huoQuFanYi('liaoTian', 'tianJiaDaoBiaoQing'),
    ])
    菜单按钮()[0].click()
    await flushPromises()
    expect(取图).toHaveBeenCalledTimes(1)
    expect((取图.mock.calls[0] as [string])[0]).toBe(旧地址)
    expect(表情写入).toHaveBeenCalledTimes(1)
    expect((表情写入.mock.calls[0][0] as File).name).toBe('pet.png')
    expect(wrapper.find('.biaoqing-tishi').text()).toBe(
      huoQuFanYi('duoMeiTi', 'biaoQingYiTianJia'),
    )
    expect(wrapper.find('.fasong-tishi').exists()).toBe(false)
    expect(使用表情仓库().woDeBiaoQing.map((项) => 项.id)).toEqual(['b-1'])
    wrapper.unmount()
  })

  it('服务端回 yi_cun_zai：状态条是「已在我的表情里」而非「已添加」，两句可区分且不算错误', async () => {
    表情写入.mockResolvedValueOnce({ xiang: { id: 'b-1' }, yiCunZai: true })
    const wrapper = await 挂载([媒体消息({ mei_ti_url: 旧地址 })])
    await 右键第几条(wrapper)
    菜单按钮()[0].click()
    await flushPromises()
    expect(wrapper.find('.biaoqing-tishi').text()).toBe(huoQuFanYi('duoMeiTi', 'biaoQingYiZaiKu'))
    expect(wrapper.find('.biaoqing-tishi').text()).not.toBe(
      huoQuFanYi('duoMeiTi', 'biaoQingYiTianJia'),
    )
    expect(wrapper.find('.fasong-tishi').exists()).toBe(false)
    wrapper.unmount()
  })

  it('文件/文本/已撤回/表情包气泡一律不出菜单，也不写任何请求', async () => {
    const wrapper = await 挂载([
      媒体消息({ id: 'f-1', lei_xing: 'wenJian', mei_ti_lei_bie: 'wenjian' }),
      媒体消息({ id: 't-1', lei_xing: 'wenben', mei_ti_id: null, mei_ti_url: null, nei_rong: '在吗' }),
      媒体消息({
        id: 'c-1',
        yi_che_hui: true,
        nei_rong: '',
        mei_ti_id: null,
        mei_ti_url: null,
        mei_ti_lei_bie: null,
      }),
      媒体消息({ id: 'e-1', lei_xing: 'biaoQingBao', mei_ti_lei_bie: 'biaoqingshu' }),
    ])
    for (const 序号 of [0, 1, 2, 3]) {
      await 右键第几条(wrapper, 序号)
      expect(document.body.querySelector('.chehui-zhezhao')).toBeNull()
    }
    expect(取图).not.toHaveBeenCalled()
    expect(表情写入).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('未开启图片授权：走同一个授权门，拒绝即提示零写入，同意后立即写入', async () => {
    const wrapper = await 挂载([媒体消息({ mei_ti_url: 旧地址 })])
    使用用户仓库().sheZhiTuPianShouQuan(false)
    await 右键第几条(wrapper)
    菜单按钮()[0].click()
    await flushPromises()
    expect(wrapper.findComponent(ShouQuanDanChuang).props('xianShi')).toBe(true)
    wrapper.findComponent(ShouQuanDanChuang).vm.$emit('juJue')
    await flushPromises()
    expect(wrapper.find('.fasong-tishi').text()).toBe(
      huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi'),
    )
    expect(表情写入).not.toHaveBeenCalled()

    await 右键第几条(wrapper)
    菜单按钮()[0].click()
    await flushPromises()
    wrapper.findComponent(ShouQuanDanChuang).vm.$emit('queRen')
    await flushPromises()
    expect(表情写入).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.biaoqing-tishi').exists()).toBe(true)
    wrapper.unmount()
  })

  it('取图失败（断网）：错误落在本页提示行、零写入，且不外溢成未捕获异常', async () => {
    const 未捕获: unknown[] = []
    const 记录 = (事: PromiseRejectedResult) => 未捕获.push(事.reason)
    window.addEventListener('unhandledrejection', 记录 as never)
    取图.mockRejectedValue(new Error('wang-luo'))
    const wrapper = await 挂载([媒体消息({ mei_ti_url: 旧地址 })])
    await 右键第几条(wrapper)
    菜单按钮()[0].click()
    await flushPromises()
    expect(wrapper.find('.fasong-tishi').text()).toBe(huoQuFanYi('duoMeiTi', 'biaoQingQuTuShiBai'))
    expect(表情写入).not.toHaveBeenCalled()
    window.removeEventListener('unhandledrejection', 记录 as never)
    expect(未捕获).toHaveLength(0)
    wrapper.unmount()
  })

  it('签名过期：整表重拉一次取新地址后再取图，不另起第二套签名口径', async () => {
    const wrapper = await 挂载([媒体消息({ mei_ti_url: 旧地址 })])
    取图.mockResolvedValueOnce({ ok: false, status: 403, blob: async () => new Blob(['wu']) })
    取消息.mockResolvedValue([媒体消息({ mei_ti_url: 新地址 })])
    const 起点 = 取消息.mock.calls.length
    await 右键第几条(wrapper)
    菜单按钮()[0].click()
    await flushPromises()
    expect(取消息.mock.calls.length - 起点).toBe(1)
    expect(取图).toHaveBeenCalledTimes(2)
    expect((取图.mock.calls[1] as [string])[0]).toBe(新地址)
    expect(表情写入).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('长按 500ms 出同一菜单；提前松手不出（与聊天页同一状态机）', async () => {
    const wrapper = await 挂载([媒体消息({ mei_ti_url: 旧地址 })])
    const 项 = wrapper.findAll('.xiaoxi-xiangmu')[0]
    await 项.trigger('touchstart')
    await 项.trigger('touchend')
    await flushPromises()
    expect(document.body.querySelector('.chehui-zhezhao')).toBeNull()

    await 项.trigger('touchstart')
    await new Promise((解决) => setTimeout(解决, LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 120))
    expect(document.body.querySelector('.chehui-zhezhao')).not.toBeNull()
    expect(菜单按钮()).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('FP-21 同类点穷尽（前端不写第二套）', () => {
  const 前端根 = resolve(__dirname, '..')
  const 仓库根 = resolve(__dirname, '../..')
  const 后端配置 = resolve(仓库根, '../backend/src/config/媒体配置.ts')

  function 剥注释(源: string): string {
    return 源
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((行) => !行.trimStart().startsWith('//'))
      .join('\n')
  }

  function 命中(模式: RegExp): string[] {
    return readdirSync(前端根, { recursive: true })
      .map((项) => String(项).replace(/\\/g, '/'))
      .filter((路) => /\.(vue|ts)$/.test(路) && !路.startsWith('__tests__/'))
      .filter((路) => 模式.test(剥注释(readFileSync(resolve(前端根, 路), 'utf-8'))))
      .map((路) => relative(仓库根, resolve(前端根, 路)).replace(/\\/g, '/'))
      .sort()
  }

  it('好友页零第二套：不读剪贴板、不自己压缩、不拼 multipart、不直连上传原语', () => {
    const 源 = 剥注释(readFileSync(resolve(前端根, 'views/好友聊天.vue'), 'utf-8'))
    expect(源).not.toMatch(/clipboardData/)
    expect(源).not.toMatch(/createImageBitmap|toBlob\(/)
    expect(源).not.toMatch(/new FormData|XMLHttpRequest|axios/)
    expect(源).toContain('yaSuoTuPiang')
    expect(源).toContain('use粘贴图片')
    // 端点串只在 api 层出现一次
    expect(命中(/'\/好友\/媒体'/)).toEqual(['src/api/社交.ts'])
  })

  it('媒体类型码清单全库只有一份（页面不再各列一份，第三份必然漂移）', () => {
    expect(命中(/\['tuPian',\s*'biaoQingBao',\s*'yuYin',\s*'wenJian'\]/)).toEqual([
      'src/config/消息配置.ts',
    ])
    expect(命中(/new Set\(\['tuPian'/)).toEqual([])
  })

  it('前端那份清单与后端 LEI_BIE_DAO_XIAO_XI_LEI_XING 同集合（跨端同一份实现）', () => {
    const 后端源 = readFileSync(后端配置, 'utf-8')
    const 段 = /LEI_BIE_DAO_XIAO_XI_LEI_XING: Record<MeiTiLeiBie, string> = \{([\s\S]*?)\}/.exec(后端源)
    expect(段, '未找到后端类别→类型映射').toBeTruthy()
    const 后端值 = [...段![1].matchAll(/:\s*'([^']+)'/g)].map((项) => 项[1]).sort()
    expect([...MEI_TI_XIAO_XI_LEI_XING].sort()).toEqual(后端值)
    // 图片类清单 = 后端 tupian + biaoqingshu 两类映射出来的类型码
    expect([...TU_PIAN_XIAO_XI_LEI_XING].sort()).toEqual(
      ['tuPian', 'biaoQingBao'].filter((码) => 后端值.includes(码)).sort(),
    )
  })

  it('好友页与聊天页共用同一份粘贴预检（MIME/大小口径只有一处定义）', () => {
    expect(命中(/ZHAN_TIE_TU_PIAN_PEI_ZHI/)).toEqual([
      'src/composables/use粘贴图片.ts',
      'src/config/消息配置.ts',
    ])
    expect(命中(/yaSuoTuPiang/)).toEqual([
      'src/utils/图片压缩.ts',
      'src/views/好友聊天.vue',
      'src/views/聊天页面.vue',
      'src/views/账号与安全.vue',
    ])
    const 聊天页 = readFileSync(resolve(前端根, 'views/聊天页面.vue'), 'utf-8')
    expect(聊天页).toContain('new Set<string>(MEI_TI_XIAO_XI_LEI_XING)')
  })
})
