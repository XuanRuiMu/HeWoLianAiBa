import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import type { Socket } from 'socket.io-client'
import TongHuaJieMian from '@/components/通话界面.vue'
import 聊天页面 from '@/views/聊天页面.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用通话仓库 } from '@/stores/通话'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi, fanYi } from '@/config/translations'
import type { 角色, 消息 } from '@/types'
import { qiDongZhenLing, tingZhiZhenLing } from '@/utils/通话铃声'

vi.mock('@/api/聊天', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return {
    ...shiJi,
    huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
    faSongXiaoXi: vi.fn(),
    shangChuanMeiTi: vi.fn(),
    cheHuiXiaoXi: vi.fn(),
    biaoJiYiDu: vi.fn(),
    huoQuJiaoSeXiangQing: vi.fn().mockResolvedValue({
      jiao_se: {
        id: 'j1',
        ming_zi: '测试角色',
        wei_xin_ming: '小甜心',
        tou_xiang: '',
        xing_bie: 'nv',
        nian_ling: 22,
        wai_mao: '',
        xing_ge: '',
        bei_jing_gu_shi: '',
        xi_hao: [],
        yan_yu_feng_ge: '',
        biao_qian: [],
        re_du: 0,
        chuang_jian_shi_jian: new Date().toISOString(),
      },
      dang_an_zhuang_tai: null,
    }),
    huoQuFuPan: vi.fn().mockResolvedValue({
      fu_pan_nei_rong: null,
      fu_pan_pi_zhu: null,
      jia_zai_zhong: false,
    }),
  }
})

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

// ─── Web Audio 假件 ───
class JiaZhenDangQi {
  frequency = { value: 0 }
  type = 'sine'
  onended: (() => void) | null = null
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
  disconnect = vi.fn()
}

class JiaZengYiQi {
  gain = {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
  connect = vi.fn()
  disconnect = vi.fn()
}

class JiaYinPinShangXiaWen {
  static shiLiBiao: JiaYinPinShangXiaWen[] = []
  static zhenDangQiLieBiao: JiaZhenDangQi[] = []

  static chongZhi() {
    this.shiLiBiao = []
    this.zhenDangQiLieBiao = []
  }

  state = 'running'
  currentTime = 0
  destination = { x: 'mudi' }
  resume = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
  createOscillator = vi.fn(() => {
    const zhenDangQi = new JiaZhenDangQi()
    JiaYinPinShangXiaWen.zhenDangQiLieBiao.push(zhenDangQi)
    return zhenDangQi
  })
  createGain = vi.fn(() => new JiaZengYiQi())

  constructor() {
    JiaYinPinShangXiaWen.shiLiBiao.push(this)
  }
}

function anzhuangMeiTiSheBei(getUserMediaMock: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: getUserMediaMock },
    configurable: true,
  })
}

function yiChuMeiTiSheBei() {
  delete (navigator as unknown as { mediaDevices?: MediaDevices }).mediaDevices
}

interface JiaGuiDao {
  kind: string
  enabled: boolean
  stop: ReturnType<typeof vi.fn>
}

function chuangJianJiaMeiTiLiu() {
  const yinPinGuiDao: JiaGuiDao = { kind: 'audio', enabled: true, stop: vi.fn() }
  const shiPinGuiDao: JiaGuiDao = { kind: 'video', enabled: true, stop: vi.fn() }
  const liu = {
    getTracks: () => [yinPinGuiDao, shiPinGuiDao] as unknown as MediaStreamTrack[],
    getAudioTracks: () => [yinPinGuiDao as unknown as MediaStreamTrack],
    getVideoTracks: () => [shiPinGuiDao as unknown as MediaStreamTrack],
  } as unknown as MediaStream
  return { liu, yinPinGuiDao, shiPinGuiDao }
}

// ─── 信令假 socket ───
interface JiaSocket {
  connected: boolean
  on: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

interface EmitJiLu {
  shiJianMing: string
  zaiHe: unknown
}

function chuangJianJiaSocket() {
  const jianTingQi = new Map<string, (zaiHe?: unknown) => void>()
  const emitJiLu: EmitJiLu[] = []
  const moKeAck = {
    yaoQing: { chengGong: true, tongHuaId: 't-1' },
    guaDuan: { chengGong: true, shiChangMiao: 3 },
    quXiao: { chengGong: true },
  }
  const socket: JiaSocket = {
    connected: true,
    on: vi.fn((shiJianMing: string, huiDiao: (zaiHe?: unknown) => void) => {
      jianTingQi.set(shiJianMing, huiDiao)
    }),
    emit: vi.fn((shiJianMing: string, zaiHe?: unknown, huiDiao?: (jieGuo: unknown) => void) => {
      emitJiLu.push({ shiJianMing, zaiHe })
      if (!huiDiao) return
      if (shiJianMing === '通话邀请') huiDiao(moKeAck.yaoQing)
      else if (shiJianMing === '通话挂断') huiDiao(moKeAck.guaDuan)
      else if (shiJianMing === '通话取消') huiDiao(moKeAck.quXiao)
    }),
    disconnect: vi.fn(),
  }
  return { socket, jianTingQi, emitJiLu, moKeAck }
}

function jiaoSeJiaJian(): 角色 {
  return {
    id: 'j1',
    ming_zi: '测试角色',
    wei_xin_ming: '小甜心',
    xing_bie: 'nv',
    nian_ling: 22,
    wai_mao: '',
    xing_ge: '',
    bei_jing_gu_shi: '',
    xi_hao: [],
    yan_yu_feng_ge: '',
    tou_xiang: '',
    bei_jing_tu: null,
    biao_qian: [],
    re_du: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
  }
}

async function chuangJianTongHuaHuanJing() {
  setActivePinia(createPinia())
  const 聊天仓库 = 使用聊天仓库()
  聊天仓库.jiaoSeXinXi = jiaoSeJiaJian()
  const { socket, jianTingQi, emitJiLu, moKeAck } = chuangJianJiaSocket()
  聊天仓库.socketLianJie = socket as unknown as Socket
  const 通话仓库 = 使用通话仓库()
  await flushPromises()
  return { 通话仓库, 聊天仓库, jianTingQi, emitJiLu, moKeAck }
}

beforeEach(() => {
  localStorage.clear()
  JiaYinPinShangXiaWen.chongZhi()
  vi.stubGlobal('AudioContext', JiaYinPinShangXiaWen)
})

afterEach(() => {
  vi.useRealTimers()
  yiChuMeiTiSheBei()
})

describe('FP-21 通话仓库状态机', () => {
  it('完整流转：发起→振铃→接通计时递增→挂断→终态清理→3秒归位', async () => {
    vi.useFakeTimers()
    const getUserMediaMock = vi.fn()
    anzhuangMeiTiSheBei(getUserMediaMock)
    const { liu, yinPinGuiDao, shiPinGuiDao } = chuangJianJiaMeiTiLiu()
    getUserMediaMock.mockResolvedValue(liu)

    const { 通话仓库, jianTingQi, emitJiLu } = await chuangJianTongHuaHuanJing()
    expect(通话仓库.zhuangTai).toBe('kongXian')

    // 发起视频通话：先取媒体，再发邀请
    const daYing = 通话仓库.faQiTongHua('j1', 'shiPin')
    await Promise.resolve()
    expect(getUserMediaMock).toHaveBeenCalledWith({ video: true, audio: true })
    expect(emitJiLu.length).toBe(1)
    expect(emitJiLu[0].shiJianMing).toBe('通话邀请')
    expect(emitJiLu[0].zaiHe).toEqual({ jiaoSeId: 'j1', leiXing: 'shiPin' })
    expect(await daYing).toBe(true)

    expect(通话仓库.zhuangTai).toBe('zhenLing')
    expect(通话仓库.tongHuaId).toBe('t-1')
    expect(通话仓库.duiFangNiCheng).toBe('小甜心')
    expect(通话仓库.benDiLiu).not.toBeNull()

    // 振铃音已启动（振荡器已创建）
    const qiDongShiZhenDangQiShu = JiaYinPinShangXiaWen.zhenDangQiLieBiao.length
    expect(qiDongShiZhenDangQiShu).toBeGreaterThan(0)

    // 服务端推送接通 → 计时开始
    jianTingQi.get('通话接受')?.({
      tongHuaId: 't-1',
      leiXing: 'shiPin',
      jieTongShiJian: Date.now(),
    })
    expect(通话仓库.zhuangTai).toBe('yiJieTong')
    expect(通话仓库.jiShiMiao).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(通话仓库.jiShiMiao).toBe(1)
    vi.advanceTimersByTime(2000)
    expect(通话仓库.jiShiMiao).toBe(3)

    // 用户挂断：ack 成功
    通话仓库.guaDuanTongHua()
    const guaDuanJiLu = emitJiLu.find((x) => x.shiJianMing === '通话挂断')
    expect(guaDuanJiLu?.zaiHe).toEqual({ tongHuaId: 't-1' })

    // 服务端终态事件 → 终态清理
    jianTingQi.get('通话结束')?.({
      tongHuaId: 't-1',
      zhuangTai: 'yiJieTong',
      shiChangMiao: 3,
    })
    expect(通话仓库.zhuangTai).toBe('yiJieShu')
    // 本地轨道停止、铃声停止
    expect(yinPinGuiDao.stop).toHaveBeenCalled()
    expect(shiPinGuiDao.stop).toHaveBeenCalled()
    const zuiHouZhenDangQi =
      JiaYinPinShangXiaWen.zhenDangQiLieBiao[JiaYinPinShangXiaWen.zhenDangQiLieBiao.length - 1]
    expect(zuiHouZhenDangQi?.stop).toHaveBeenCalled()
    expect(JiaYinPinShangXiaWen.shiLiBiao[0]?.close).toHaveBeenCalled()

    // 计时已停
    const zhongTaiJiShi = 通话仓库.jiShiMiao
    vi.advanceTimersByTime(2000)
    expect(通话仓库.jiShiMiao).toBe(zhongTaiJiShi)

    // 3 秒后自动归位空闲并清理
    vi.advanceTimersByTime(3000)
    expect(通话仓库.zhuangTai).toBe('kongXian')
    expect(通话仓库.tongHuaId).toBeNull()
    expect(通话仓库.benDiLiu).toBeNull()
  })

  it('振铃期收到 通话结束(yiQuXiao) 直接进入终态并记录原因', async () => {
    vi.useFakeTimers()
    const { 通话仓库, jianTingQi } = await chuangJianTongHuaHuanJing()
    await expect(通话仓库.faQiTongHua('j1', 'yuYin')).resolves.toBe(true)
    expect(通话仓库.zhuangTai).toBe('zhenLing')

    jianTingQi.get('通话结束')?.({ tongHuaId: 't-1', zhuangTai: 'yiQuXiao', shiChangMiao: 0 })
    expect(通话仓库.zhuangTai).toBe('yiJieShu')
    expect(通话仓库.zuiHouZhongTai).toBe('yiQuXiao')
    expect(JiaYinPinShangXiaWen.shiLiBiao[0]?.close).toHaveBeenCalled()

    vi.advanceTimersByTime(3000)
    expect(通话仓库.zhuangTai).toBe('kongXian')
    expect(通话仓库.zuiHouZhongTai).toBeNull()
  })

  it('getUserMedia 被拒：报翻译错误且不进入振铃、不发邀请', async () => {
    const getUserMediaMock = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    anzhuangMeiTiSheBei(getUserMediaMock)
    const { 通话仓库, 聊天仓库, emitJiLu } = await chuangJianTongHuaHuanJing()

    await expect(通话仓库.faQiTongHua('j1', 'shiPin')).resolves.toBe(false)
    expect(getUserMediaMock).toHaveBeenCalledTimes(1)
    expect(通话仓库.zhuangTai).toBe('kongXian')
    expect(通话仓库.benDiLiu).toBeNull()
    expect(emitJiLu.length).toBe(0)
    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('tongHua', 'kaiQiSheXiangTouShiBai'))
  })

  it('非空闲态忽略重复邀请（防抖），不产生第二次信令', async () => {
    vi.useFakeTimers()
    const { 通话仓库, emitJiLu } = await chuangJianTongHuaHuanJing()
    await expect(通话仓库.faQiTongHua('j1', 'yuYin')).resolves.toBe(true)
    expect(通话仓库.zhuangTai).toBe('zhenLing')
    expect(emitJiLu.length).toBe(1)

    await expect(通话仓库.faQiTongHua('j1', 'yuYin')).resolves.toBe(false)
    expect(emitJiLu.length).toBe(1)
  })

  it('邀请 ack 失败：报服务端提示、不进入振铃、本地轨道释放', async () => {
    const getUserMediaMock = vi.fn()
    anzhuangMeiTiSheBei(getUserMediaMock)
    const { liu, yinPinGuiDao, shiPinGuiDao } = chuangJianJiaMeiTiLiu()
    getUserMediaMock.mockResolvedValue(liu)

    const { 通话仓库, 聊天仓库, emitJiLu, moKeAck } = await chuangJianTongHuaHuanJing()
    moKeAck.yaoQing = { chengGong: false, tiShi: '游戏已结束，无法发起通话' }

    await expect(通话仓库.faQiTongHua('j1', 'shiPin')).resolves.toBe(false)
    expect(emitJiLu.length).toBe(1)
    expect(通话仓库.zhuangTai).toBe('kongXian')
    expect(yinPinGuiDao.stop).toHaveBeenCalled()
    expect(shiPinGuiDao.stop).toHaveBeenCalled()
    expect(聊天仓库.cuoWuXinXi).toBe('游戏已结束，无法发起通话')
  })
})

describe('FP-21 通话铃声（Web Audio 合成）', () => {
  it('启动创建振荡器且两音交替；停止后振荡器停摆、上下文关闭', async () => {
    vi.useFakeTimers()
    expect(qiDongZhenLing()).toBe(true)
    const wenBenQu = JiaYinPinShangXiaWen.shiLiBiao[0]
    expect(wenBenQu).toBeDefined()
    expect(wenBenQu.resume).toHaveBeenCalled()
    expect(JiaYinPinShangXiaWen.zhenDangQiLieBiao.length).toBe(1)
    expect(JiaYinPinShangXiaWen.zhenDangQiLieBiao[0].frequency.value).toBe(440)
    expect(JiaYinPinShangXiaWen.zhenDangQiLieBiao[0].start).toHaveBeenCalled()

    // 400ms 后切换到第二音
    vi.advanceTimersByTime(400)
    expect(JiaYinPinShangXiaWen.zhenDangQiLieBiao.length).toBe(2)
    expect(JiaYinPinShangXiaWen.zhenDangQiLieBiao[1].frequency.value).toBe(480)

    tingZhiZhenLing()
    const zuiHou = JiaYinPinShangXiaWen.zhenDangQiLieBiao[1]
    expect(zuiHou.stop).toHaveBeenCalledWith()
    expect(wenBenQu.close).toHaveBeenCalledTimes(1)

    // 停止后循环不再产生新振荡器
    const tingZhiHouShuLiang = JiaYinPinShangXiaWen.zhenDangQiLieBiao.length
    vi.advanceTimersByTime(1200)
    expect(JiaYinPinShangXiaWen.zhenDangQiLieBiao.length).toBe(tingZhiHouShuLiang)
  })

  it('环境无 AudioContext 时静默降级不抛错', async () => {
    const quanJu = globalThis as unknown as { AudioContext?: unknown }
    const yuanShi = quanJu.AudioContext
    quanJu.AudioContext = undefined
    try {
      expect(qiDongZhenLing()).toBe(false)
      expect(() => tingZhiZhenLing()).not.toThrow()
    } finally {
      quanJu.AudioContext = yuanShi
    }
  })
})

describe('FP-21 通话界面组件渲染', () => {
  function guaZaiZuJian() {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 通话仓库 = 使用通话仓库()
    const wrapper = mount(TongHuaJieMian, { global: { plugins: [pinia] } })
    return { wrapper, 通话仓库 }
  }

  it('语音振铃态：等待文本+头像+呼吸光圈+取消按钮', async () => {
    const { wrapper, 通话仓库 } = guaZaiZuJian()
    通话仓库.duiFangNiCheng = '小甜心'
    通话仓库.duiFangTouXiang = '😀'
    通话仓库.leiXing = 'yuYin'
    通话仓库.zhuangTai = 'zhenLing'
    await nextTick()

    expect(wrapper.find('.duifang-nicheng').text()).toBe('小甜心')
    expect(wrapper.find('.zhuangtai-wenben').text()).toBe(
      huoQuFanYi('tongHua', 'zhengZaiDengDaiDuiFangJieShu'),
    )
    expect(wrapper.find('.tonghua-touxiang').exists()).toBe(true)
    expect(wrapper.find('.huxi-waiquan').exists()).toBe(true)

    const quXiaoAn = wrapper.find('.quxiao-cijian')
    expect(quXiaoAn.exists()).toBe(true)
    expect(quXiaoAn.text()).toBe(huoQuFanYi('tongHua', 'quXiao'))

    const guaDuanAn = wrapper.find('.guaduan-an')
    expect(guaDuanAn.exists()).toBe(true)
    const quXiaoJianShi = vi.spyOn(通话仓库, 'quXiaoTongHua').mockImplementation(() => {})
    await quXiaoAn.trigger('click')
    expect(quXiaoJianShi).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('语音接通态：MM:SS 大字计时+挂断按钮触发挂断动作', async () => {
    const { wrapper, 通话仓库 } = guaZaiZuJian()
    通话仓库.leiXing = 'yuYin'
    通话仓库.zhuangTai = 'yiJieTong'
    通话仓库.jiShiMiao = 65
    await nextTick()

    expect(wrapper.find('.zhuangtai-wenben').exists()).toBe(false)
    expect(wrapper.find('.jishi-da-ziti').text()).toBe('01:05')
    expect(wrapper.find('.quxiao-cijian').exists()).toBe(false)

    const guaDuanJianShi = vi.spyOn(通话仓库, 'guaDuanTongHua').mockImplementation(() => {})
    await wrapper.find('.guaduan-an').trigger('click')
    expect(guaDuanJianShi).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('视频形态：video 元素与三个控制钮齐全', async () => {
    const { liu } = chuangJianJiaMeiTiLiu()
    const { wrapper, 通话仓库 } = guaZaiZuJian()
    通话仓库.leiXing = 'shiPin'
    通话仓库.zhuangTai = 'yiJieTong'
    通话仓库.benDiLiu = liu
    await nextTick()
    await nextTick()

    const shiPing = wrapper.find('video.bendi-shiping')
    expect(shiPing.exists()).toBe(true)
    expect((shiPing.element as HTMLVideoElement).muted).toBe(true)
    expect(shiPing.attributes('playsinline')).toBeDefined()
    expect(shiPing.attributes('autoplay')).toBeDefined()
    expect((shiPing.element as HTMLVideoElement).srcObject).toBeTruthy()

    const kongZhiAn = wrapper.findAll('.kongzhi-an')
    expect(kongZhiAn.length).toBe(3)
    expect(wrapper.find('.guaduan-an').exists()).toBe(true)
    expect(wrapper.find('.bendi-chuang').exists()).toBe(true)
    wrapper.unmount()
  })

  it('点击麦克风钮切换 aria-pressed 与关闭样式类并禁用音频轨道', async () => {
    const { liu, yinPinGuiDao } = chuangJianJiaMeiTiLiu()
    const { wrapper, 通话仓库 } = guaZaiZuJian()
    通话仓库.leiXing = 'shiPin'
    通话仓库.zhuangTai = 'yiJieTong'
    通话仓库.benDiLiu = liu
    await nextTick()
    await nextTick()

    const maiKeFengAn = wrapper.findAll('.kongzhi-an')[0]
    expect(maiKeFengAn.attributes('aria-pressed')).toBe('true')
    expect(maiKeFengAn.classes()).not.toContain('yiguanbi')

    await maiKeFengAn.trigger('click')
    expect(通话仓库.maiKeFengKaiQi).toBe(false)
    expect(yinPinGuiDao.enabled).toBe(false)
    expect(maiKeFengAn.attributes('aria-pressed')).toBe('false')
    expect(maiKeFengAn.classes()).toContain('yiguanbi')

    await maiKeFengAn.trigger('click')
    expect(通话仓库.maiKeFengKaiQi).toBe(true)
    expect(yinPinGuiDao.enabled).toBe(true)
    wrapper.unmount()
  })

  it('视频形态控制栏不含独立取消按钮，挂断钮在振铃期为取消语义', async () => {
    const { wrapper, 通话仓库 } = guaZaiZuJian()
    通话仓库.leiXing = 'shiPin'
    通话仓库.zhuangTai = 'zhenLing'
    await nextTick()

    expect(wrapper.find('.quxiao-cijian').exists()).toBe(false)
    expect(wrapper.find('video').exists()).toBe(true)

    const guaDuanJianShi = vi.spyOn(通话仓库, 'guaDuanTongHua').mockImplementation(() => {})
    const quXiaoJianShi = vi.spyOn(通话仓库, 'quXiaoTongHua').mockImplementation(() => {})
    await wrapper.find('.guaduan-an').trigger('click')
    expect(quXiaoJianShi).toHaveBeenCalledTimes(1)
    expect(guaDuanJianShi).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('组件卸载兜底清理铃声资源', async () => {
    const { wrapper } = guaZaiZuJian()
    qiDongZhenLing()
    wrapper.unmount()
    expect(JiaYinPinShangXiaWen.shiLiBiao.at(-1)?.close).toHaveBeenCalled()
  })
})

describe('FP-21 翻译键存在性', () => {
  it('tongHua 全部新键存在于 translations.ts', () => {
    const qiWangJian = [
      'zhengZaiDengDaiDuiFangJieShu',
      'yiLianJie',
      'yiJieShu',
      'tongHuaYiQuXiao',
      'quXiao',
      'guaDuan',
      'kaiQiSheXiangTouShiBai',
      'maiKeFeng',
      'sheXiangTou',
      'duiFangHuaMianZanShiBuKeYong',
      'weiLianJieWangLuo',
      'faQiShiBai',
    ] as const

    for (const jian of qiWangJian) {
      expect((fanYi.tongHua as Record<string, string>)[jian]).toBeTruthy()
    }
  })
})

describe('FP-21 聊天页系统消息渲染', () => {
  function chuangJianXiTongXiaoXi(buFen: Partial<消息>): 消息 {
    return {
      id: 'x-tonghua-xitong',
      hui_hua_id: 'h1',
      fa_song_zhe_id: '',
      fa_song_zhe_lei_xing: 'xitong',
      nei_rong: '[语音通话] 时长 00:12',
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      yi_du: true,
      ...buFen,
    }
  }

  async function guaZaiLiaoTianYeMian() {
    const luYou = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
        { path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 },
      ],
    })
    await luYou.push('/chat/h1')
    const pinia = createPinia()
    setActivePinia(pinia)

    const 用户仓库 = 使用用户仓库()
    用户仓库.dangQianYongHu = {
      id: 'u1',
      shou_ji_hao: '13800138000',
      yong_hu_ming: '测试用户',
      ni_cheng: '测试昵称',
      xing_bie: 'male',
      mu_biao_xing_bie: 'female',
      xing_ge_xuan_ze: 'INTJ',
      ren_she_biao_qian: 'neiLianXueBa',
      yun_xu_zha_nan_zha_nv: false,
      tou_xiang: null,
      sheng_ri: null,
      qian_ming: null,
      guan_li_yuan: false,
      huo_yue_ren_she_id: null,
      hai_wang_fen_shu: 0,
      chuang_jian_shi_jian: new Date().toISOString(),
      geng_xin_shi_jian: new Date().toISOString(),
    }

    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.jiaoSeXinXi = jiaoSeJiaJian()

    const wrapper = mount(
      {
        components: { 聊天页面 },
        template: '<div><router-view /></div>',
      },
      { global: { plugins: [pinia, luYou] }, attachTo: document.body },
    )
    await flushPromises()
    return { wrapper, 聊天仓库 }
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('通话系统消息（发送者=xitong）渲染为居中灰色小字分支，无头像无气泡', async () => {
    const { wrapper, 聊天仓库 } = await guaZaiLiaoTianYeMian()
    聊天仓库.xiaoXiLieBiao = [
      chuangJianXiTongXiaoXi({ nei_rong: '[语音通话] 时长 00:12' }),
      chuangJianXiTongXiaoXi({ id: 'x2', nei_rong: '[视频通话] 已取消' }),
    ]
    await flushPromises()

    const xiTongXiangMu = wrapper.findAll('.xiaoxi-xiangmu.xitong-xiaoxi')
    expect(xiTongXiangMu.length).toBe(2)
    const wenBenLieBiao = xiTongXiangMu.map((xiang) => xiang.text())
    expect(wenBenLieBiao.some((wen) => wen.includes('[语音通话] 时长 00:12'))).toBe(true)
    expect(wenBenLieBiao.some((wen) => wen.includes('[视频通话] 已取消'))).toBe(true)
    for (const xiang of xiTongXiangMu) {
      expect(xiang.find('.xitong-neirong').exists()).toBe(true)
      expect(xiang.find('.qipao-neirong').exists()).toBe(false)
      expect(xiang.find('.xiaoxi-touxiang').exists()).toBe(false)
    }
    wrapper.unmount()
  })

  it('传统 lei_xing=xitong 消息仍走系统样式分支（回归保护）', async () => {
    const { wrapper, 聊天仓库 } = await guaZaiLiaoTianYeMian()
    聊天仓库.xiaoXiLieBiao = [
      chuangJianXiTongXiaoXi({ id: 'x3', nei_rong: '本局游戏已结束', lei_xing: 'xitong' }),
    ]
    await flushPromises()

    const xiang = wrapper.find('.xiaoxi-xiangmu.xitong-xiaoxi')
    expect(xiang.exists()).toBe(true)
    expect(xiang.find('.xitong-neirong').text()).toContain('本局游戏已结束')
    wrapper.unmount()
  })
})
