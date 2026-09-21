import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'path'
import { use添加到表情, type TianJiaJieGuo } from '@/composables/use添加到表情'
import { use长按菜单 } from '@/composables/use长按菜单'
import { LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI, XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { BIAO_QING_QU_TU_PEI_ZHI, BIAO_QING_TIAN_JIA_PEI_ZHI } from '@/config/表情配置'
import { fanYi, huoQuFanYi } from '@/config/translations'
import { MO_REN_WEN_JIAN_MING, tianJiaBiaoQing } from '@/api/表情'
import { 使用表情仓库 } from '@/stores/表情'
import { chongQianMeiTiURL, huoQuXiaoXi } from '@/api/聊天'
import 聊天页面 from '@/views/聊天页面.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import type { 消息 } from '@/types'

const httpGetMock = vi.fn()
const httpPostMock = vi.fn()

vi.mock('@/api/请求', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/请求')>('@/api/请求')
  return {
    ...shiJi,
    default: {
      get: (...canShu: unknown[]) => httpGetMock(...canShu),
      post: (...canShu: unknown[]) => httpPostMock(...canShu),
      put: vi.fn(),
      delete: vi.fn(),
    },
  }
})

vi.mock('@/api/聊天', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return {
    ...shiJi,
    huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
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
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: null,
      jun_shi_zhi_dao_ji_lu: [],
      guan_jian_shi_jian: [],
      jia_zai_zhong: false,
    }),
    faSongXiaoXi: vi.fn(),
    shangChuanMeiTi: vi.fn(),
    cheHuiXiaoXi: vi.fn(),
    biaoJiYiDu: vi.fn(),
    fanYiWenBen: vi.fn(),
    zhuanXieYuYin: vi.fn(),
    chuangJianHuiHua: vi.fn(),
    huoQuJunShiLieBiao: vi.fn().mockResolvedValue({ junShiLieBiao: [] }),
    chongQianMeiTiURL: vi.fn().mockResolvedValue(null),
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

const QIAN_MING_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1893456000&u=u1&t=1&s=deadbeef'

function zaoXiaoXi(gengDuo: Partial<消息> = {}): 消息 {
  return {
    id: 'x1',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'u1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '[图片]',
    lei_xing: 'tuPian',
    shi_jian_chuo: Date.now(),
    yi_du: true,
    mei_ti_id: 'mt-1',
    mei_ti_url: QIAN_MING_URL,
    ...gengDuo,
  }
}

function zaoBiaoQingXiang(id: string, paiXu: number) {
  return {
    id,
    mei_ti_id: `mt-${id}`,
    sha256: id.padEnd(64, '0').slice(0, 64),
    mime: 'image/png',
    duan_ming: `表情${id}`,
    pai_xu: paiXu,
    chuang_jian_shi_jian: '2026-09-20T00:00:00.000Z',
    mei_ti_url: `/api/媒体/${id}?e=1&s=x`,
  }
}

function zaoXiangYing(gengDuo: Partial<{ ok: boolean; status: number; blob: Blob }> = {}) {
  const ok = gengDuo.ok ?? true
  return {
    ok,
    status: gengDuo.status ?? (ok ? 200 : 403),
    blob: async () => gengDuo.blob ?? new Blob(['png-bytes'], { type: 'image/png' }),
  } as unknown as Response
}

function zaoYiLai(gengDuo: Partial<Parameters<typeof use添加到表情>[0]> = {}) {
  const jiLu = {
    cuoWu: [] as string[],
    tiShi: [] as string[],
    tiJiao: [] as File[],
  }
  const yiLai: Parameters<typeof use添加到表情>[0] = {
    huoQuMeiTiURL: (xiaoXi) => xiaoXi.mei_ti_url,
    huoQuWenJianMing: (xiaoXi) => xiaoXi.mei_ti_yuan_shi_wen_jian_ming,
    tiJiaoWenJian: async (wenJian) => {
      jiLu.tiJiao.push(wenJian)
      return 'xinZeng'
    },
    sheZhiCuoWu: (xinXi) => jiLu.cuoWu.push(xinXi),
    sheZhiTiShi: (xinXi) => jiLu.tiShi.push(xinXi),
    ...gengDuo,
  }
  return { yiLai, jiLu }
}

describe('FP-20 use添加到表情：签名 URL → File 的取图段', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn().mockResolvedValue(zaoXiangYing())
    vi.stubGlobal('fetch', fetchMock)
  })

  function zaoCaoZuo(gengDuo?: Partial<Parameters<typeof use添加到表情>[0]>) {
    const { yiLai, jiLu } = zaoYiLai(gengDuo)
    return { ...use添加到表情(yiLai), yiLai, jiLu }
  }

  it('取图用消息自带的同源签名地址且不附加任何请求头（鉴权单源在 api/请求.ts）', async () => {
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo()
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [diZhi, peiZhi] = fetchMock.mock.calls[0] as [string, RequestInit | undefined]
    expect(diZhi).toBe(QIAN_MING_URL)
    expect(peiZhi?.headers).toBeUndefined()
    expect(peiZhi?.credentials).toBeUndefined()
    expect(jiLu.tiJiao).toHaveLength(1)
    expect(jiLu.tiShi).toEqual([huoQuFanYi('duoMeiTi', 'biaoQingYiTianJia')])
    expect(jiLu.cuoWu).toEqual([])
  })

  it('文件名取媒体原始名，无原始名时用 api 层缺省名；MIME 随 blob 透传', async () => {
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo()
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi({ mei_ti_yuan_shi_wen_jian_ming: 'AI 生的自拍.png' }))
    expect(jiLu.tiJiao[0].name).toBe('AI 生的自拍.png')
    expect(jiLu.tiJiao[0].type).toBe('image/png')
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi({ id: 'x2', mei_ti_yuan_shi_wen_jian_ming: null }))
    expect(jiLu.tiJiao[1].name).toBe(MO_REN_WEN_JIAN_MING)
  })

  it('服务端回 yi_cun_zai 时提示「已在我的表情里」且不写错误行', async () => {
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo({
      tiJiaoWenJian: async () => 'yiCunZai' satisfies TianJiaJieGuo,
    })
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    expect(jiLu.tiShi).toEqual([huoQuFanYi('duoMeiTi', 'biaoQingYiZaiKu')])
    expect(jiLu.cuoWu).toEqual([])
  })

  it('页面已提示（判定/授权/上传失败）时不重复提示', async () => {
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo({
      tiJiaoWenJian: async () => 'buTiShi' satisfies TianJiaJieGuo,
    })
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    expect(jiLu.tiShi).toEqual([])
    expect(jiLu.cuoWu).toEqual([])
  })

  it('无可用媒体地址：提示缺地址且零取回零提交', async () => {
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo({
      huoQuMeiTiURL: () => null,
    })
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(jiLu.tiJiao).toHaveLength(0)
    expect(jiLu.cuoWu).toEqual([huoQuFanYi('duoMeiTi', 'biaoQingDiZhiQueShi')])
  })

  it('网络异常/blob 抛错/无 fetch 环境一律安全失败，不抛未捕获异常', async () => {
    fetchMock.mockRejectedValueOnce(new Error('断网'))
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo()
    await expect(tianJiaTuPianDaoBiaoQing(zaoXiaoXi())).resolves.toBeUndefined()
    expect(jiLu.cuoWu).toEqual([huoQuFanYi('duoMeiTi', 'biaoQingQuTuShiBai')])

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, blob: () => Promise.reject(new Error('读流失败')) } as unknown as Response)
    await expect(tianJiaTuPianDaoBiaoQing(zaoXiaoXi())).resolves.toBeUndefined()
    expect(jiLu.cuoWu).toHaveLength(2)

    vi.stubGlobal('fetch', undefined)
    await expect(tianJiaTuPianDaoBiaoQing(zaoXiaoXi())).resolves.toBeUndefined()
    expect(jiLu.cuoWu).toHaveLength(3)
    vi.stubGlobal('fetch', fetchMock)
  })

  it('非签名类失败（500）不重签：只提示一次', async () => {
    const chongQian = vi.fn().mockResolvedValue('/api/媒体/新签名')
    fetchMock.mockResolvedValueOnce(zaoXiangYing({ ok: false, status: 500 }))
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo({ chongQianMeiTiURL: chongQian })
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    expect(chongQian).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(jiLu.cuoWu).toEqual([huoQuFanYi('duoMeiTi', 'biaoQingQuTuShiBai')])
  })

  it('签名过期（403/404）按既有入口重签一次再取，成功后照常提交', async () => {
    const chongQian = vi.fn().mockResolvedValue('/api/媒体/xin-qian-ming')
    fetchMock
      .mockResolvedValueOnce(zaoXiangYing({ ok: false, status: 403 }))
      .mockResolvedValueOnce(zaoXiangYing())
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo({ chongQianMeiTiURL: chongQian })
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    expect(chongQian).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((fetchMock.mock.calls[1] as [string])[0]).toBe('/api/媒体/xin-qian-ming')
    expect(jiLu.tiJiao).toHaveLength(1)
    expect(jiLu.cuoWu).toEqual([])
  })

  it('重签也拿不到新地址时只失败一次，绝不无限重试', async () => {
    const chongQian = vi.fn().mockResolvedValue(null)
    fetchMock.mockResolvedValue(zaoXiangYing({ ok: false, status: 404 }))
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo({ chongQianMeiTiURL: chongQian })
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(jiLu.cuoWu).toEqual([huoQuFanYi('duoMeiTi', 'biaoQingQuTuShiBai')])
  })

  it('提交口抛错也不外溢：落到取回失败提示', async () => {
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo({
      tiJiaoWenJian: async () => {
        throw new Error('仓库炸了')
      },
    })
    await expect(tianJiaTuPianDaoBiaoQing(zaoXiaoXi())).resolves.toBeUndefined()
    expect(jiLu.cuoWu).toEqual([huoQuFanYi('duoMeiTi', 'biaoQingQuTuShiBai')])
  })

  it('同一条消息并发二次触发只跑一次并给出「正在处理」提示', async () => {
    let jieFang: (() => void) | null = null
    fetchMock.mockImplementation(
      () =>
        new Promise((jieJue) => {
          jieFang = () => jieJue(zaoXiangYing())
        }),
    )
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo()
    const diYiCi = tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(jiLu.tiShi).toEqual([huoQuFanYi('duoMeiTi', 'biaoQingZhengZaiChuLi')])
    jieFang!()
    await diYiCi
    expect(jiLu.tiJiao).toHaveLength(1)
  })

  it('不同消息互不阻塞，处理完即可再次触发同一条', async () => {
    const { tianJiaTuPianDaoBiaoQing, jiLu } = zaoCaoZuo()
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi({ id: 'yi' }))
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi({ id: 'er' }))
    await tianJiaTuPianDaoBiaoQing(zaoXiaoXi({ id: 'yi' }))
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(jiLu.tiJiao).toHaveLength(3)
  })
})

describe('FP-20 取图超时与定时器回收', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('达到取图上限即中止请求，且不留待触发定时器', async () => {
    vi.useFakeTimers()
    let feiQiAbort = false
    const fetchMock = vi.fn(
      (_diZhi: string, peiZhi: RequestInit) =>
        new Promise((_jieJue, jieWu) => {
          peiZhi.signal?.addEventListener('abort', () => {
            feiQiAbort = true
            jieWu(new Error('aborted'))
          })
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const cuoWu: string[] = []
    const { tianJiaTuPianDaoBiaoQing } = use添加到表情({
      huoQuMeiTiURL: (xiaoXi) => xiaoXi.mei_ti_url,
      tiJiaoWenJian: async () => 'xinZeng',
      sheZhiCuoWu: (xinXi) => cuoWu.push(xinXi),
      sheZhiTiShi: () => undefined,
    })
    const xuYaoDengDai = tianJiaTuPianDaoBiaoQing(zaoXiaoXi())
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(BIAO_QING_QU_TU_PEI_ZHI.quTuChaoShiHaoMiao - 1)
    expect(feiQiAbort).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await xuYaoDengDai
    expect(feiQiAbort).toBe(true)
    expect(cuoWu).toEqual([huoQuFanYi('duoMeiTi', 'biaoQingQuTuShiBai')])
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('FP-20 图片菜单归属（use长按菜单第四套状态机）', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function zaoCaoZuo(gengDuo: Record<string, unknown> = {}) {
    return use长按菜单({
      dangQianShiJian: ref(Date.now()),
      cheHuiXiaoXi: vi.fn().mockResolvedValue(undefined),
      ...gengDuo,
    } as never)
  }

  it('菜单清单声明为「添加到表情 + 撤回」，撤回项按窗口期裁剪', () => {
    expect([...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.tuPianCaiDanXiang]).toEqual([
      'tianJiaDaoBiaoQing',
      'cheHui',
    ])
    const { huoQuTuPianCaiDanXiang } = zaoCaoZuo()
    expect(huoQuTuPianCaiDanXiang(zaoXiaoXi())).toEqual(['tianJiaDaoBiaoQing', 'cheHui'])
    expect(huoQuTuPianCaiDanXiang(zaoXiaoXi({ fa_song_zhe_lei_xing: 'jiaose' }))).toEqual([
      'tianJiaDaoBiaoQing',
    ])
    expect(
      huoQuTuPianCaiDanXiang(
        zaoXiaoXi({ shi_jian_chuo: Date.now() - XIAO_XI_PEI_ZHI.cheHuiShiXian - 1000 }),
      ),
    ).toEqual(['tianJiaDaoBiaoQing'])
  })

  it('右键图片气泡打开图片菜单并记录坐标', () => {
    const { tuPianCaiDanZhanKai, tuPianCaiDanYangShi, daKaiTuPianCaiDan } = zaoCaoZuo()
    daKaiTuPianCaiDan(zaoXiaoXi(), { clientY: 120, clientX: 88 } as MouseEvent)
    expect(tuPianCaiDanZhanKai.value).toBe(true)
    expect(tuPianCaiDanYangShi.value).toEqual({ top: '120px', left: '88px' })
  })

  it('非图片气泡一律不打开图片菜单', () => {
    const { tuPianCaiDanZhanKai, daKaiTuPianCaiDan } = zaoCaoZuo()
    daKaiTuPianCaiDan(zaoXiaoXi({ lei_xing: 'wenben' }), {} as MouseEvent)
    daKaiTuPianCaiDan(zaoXiaoXi({ lei_xing: 'biaoQingBao' }), {} as MouseEvent)
    daKaiTuPianCaiDan(zaoXiaoXi({ lei_xing: 'yuYin' }), {} as MouseEvent)
    daKaiTuPianCaiDan(zaoXiaoXi({ lei_xing: 'wenJian' }), {} as MouseEvent)
    daKaiTuPianCaiDan(zaoXiaoXi({ fa_song_zhe_lei_xing: 'xitong' }), {} as MouseEvent)
    daKaiTuPianCaiDan(zaoXiaoXi({ yi_che_hui: true }), {} as MouseEvent)
    expect(tuPianCaiDanZhanKai.value).toBe(false)
  })

  it('长按 500ms 打开图片菜单，提前松手取消', async () => {
    const { tuPianCaiDanZhanKai, chuMoKaiShiTuPian, chuMoJieShuTuPian } = zaoCaoZuo()
    chuMoKaiShiTuPian(zaoXiaoXi())
    chuMoJieShuTuPian()
    await vi.advanceTimersByTimeAsync(600)
    expect(tuPianCaiDanZhanKai.value).toBe(false)

    chuMoKaiShiTuPian(zaoXiaoXi())
    await vi.advanceTimersByTimeAsync(500)
    expect(tuPianCaiDanZhanKai.value).toBe(true)
  })

  it('长按非图片消息永不打开图片菜单（第四套状态机自带门，不依赖调用方分流）', async () => {
    const { tuPianCaiDanZhanKai, chuMoKaiShiTuPian } = zaoCaoZuo()
    chuMoKaiShiTuPian(zaoXiaoXi({ lei_xing: 'wenben' }))
    chuMoKaiShiTuPian(zaoXiaoXi({ lei_xing: 'biaoQingBao', id: 'b' }))
    chuMoKaiShiTuPian(zaoXiaoXi({ lei_xing: 'yuYin', id: 'y' }))
    chuMoKaiShiTuPian(zaoXiaoXi({ fa_song_zhe_lei_xing: 'xitong', id: 's' }))
    chuMoKaiShiTuPian(zaoXiaoXi({ yi_che_hui: true, id: 'c' }))
    await vi.advanceTimersByTimeAsync(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 100)
    expect(tuPianCaiDanZhanKai.value).toBe(false)
  })

  it('点「添加到表情」把选中的那条消息交给注入的提交口并关闭菜单', async () => {
    const tianJiaDaoBiaoQing = vi.fn().mockResolvedValue(undefined)
    const { tuPianCaiDanZhanKai, daKaiTuPianCaiDan, zhiXingTuPianCaiDanXiang } = zaoCaoZuo({
      tianJiaDaoBiaoQing,
    })
    const muBiao = zaoXiaoXi({ id: 'tu-9' })
    daKaiTuPianCaiDan(muBiao, {} as MouseEvent)
    await zhiXingTuPianCaiDanXiang('tianJiaDaoBiaoQing')
    expect(tianJiaDaoBiaoQing).toHaveBeenCalledTimes(1)
    expect(tianJiaDaoBiaoQing.mock.calls[0][0].id).toBe('tu-9')
    expect(tuPianCaiDanZhanKai.value).toBe(false)
  })

  it('点撤回走撤回口且不调用添加表情', async () => {
    const cheHuiXiaoXi = vi.fn().mockResolvedValue(undefined)
    const tianJiaDaoBiaoQing = vi.fn().mockResolvedValue(undefined)
    const { daKaiTuPianCaiDan, zhiXingTuPianCaiDanXiang } = zaoCaoZuo({
      cheHuiXiaoXi,
      tianJiaDaoBiaoQing,
    })
    daKaiTuPianCaiDan(zaoXiaoXi(), {} as MouseEvent)
    await zhiXingTuPianCaiDanXiang('cheHui')
    expect(cheHuiXiaoXi).toHaveBeenCalledWith('x1')
    expect(tianJiaDaoBiaoQing).not.toHaveBeenCalled()
  })

  it('图片菜单不污染文本/语音菜单，反向亦然', () => {
    const yiLai = {
      dangQianShiJian: ref(Date.now()),
      cheHuiXiaoXi: async () => undefined,
      tianJiaDaoBiaoQing: async () => undefined,
    }
    const caiDan = use长按菜单(yiLai)
    caiDan.daKaiWenBenCaiDan(zaoXiaoXi({ lei_xing: 'tuPian' }), {} as MouseEvent)
    caiDan.daKaiYuYinCaiDan(zaoXiaoXi({ lei_xing: 'tuPian' }), {} as MouseEvent)
    expect(caiDan.wenBenCaiDanZhanKai.value).toBe(false)
    expect(caiDan.yuYinCaiDanZhanKai.value).toBe(false)
    expect(caiDan.huoQuWenBenCaiDanXiang(zaoXiaoXi())).not.toContain('tianJiaDaoBiaoQing')
    expect(caiDan.huoQuYuYinCaiDanXiang()).not.toContain('tianJiaDaoBiaoQing')
    caiDan.daKaiTuPianCaiDan(zaoXiaoXi(), {} as MouseEvent)
    expect(caiDan.huoQuTuPianCaiDanXiang()).not.toContain('fuZhi')
    expect(caiDan.huoQuTuPianCaiDanXiang()).not.toContain('yinYong')
  })
})

describe('FP-20 上传契约：yi_cun_zai 是唯一「已在库」判定', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('api 层把服务端 yi_cun_zai 原样抬成布尔，缺字段时按新增处理', async () => {
    httpPostMock.mockResolvedValue({
      data: { cheng_gong: true, shu_ju: { biao_qing: zaoBiaoQingXiang('a1', 0), yi_cun_zai: true } },
    })
    await expect(tianJiaBiaoQing(new Blob(['x'], { type: 'image/png' }))).resolves.toEqual({
      xiang: expect.objectContaining({ id: 'a1' }),
      yiCunZai: true,
    })
    httpPostMock.mockResolvedValue({
      data: { cheng_gong: true, shu_ju: { biao_qing: zaoBiaoQingXiang('a2', 1) } },
    })
    await expect(tianJiaBiaoQing(new Blob(['x'], { type: 'image/png' }))).resolves.toEqual({
      xiang: expect.objectContaining({ id: 'a2' }),
      yiCunZai: false,
    })
  })

  it('仓库回传 yiCunZai 且列表按 id 幂等：同一表情重复添加只有一条', async () => {
    const cang = 使用表情仓库()
    httpGetMock.mockResolvedValue({
      data: { cheng_gong: true, shu_ju: { lie_biao: [], zong_shu: 0 } },
    })
    httpPostMock.mockResolvedValue({
      data: { cheng_gong: true, shu_ju: { biao_qing: zaoBiaoQingXiang('a9', 0) } },
    })
    await cang.jiaZai('u-jia')
    const diYiCi = await cang.tianJia(new File(['x'], 'a.png', { type: 'image/png' }))
    expect(diYiCi).toEqual({ xiang: expect.objectContaining({ id: 'a9' }), yiCunZai: false })
    httpPostMock.mockResolvedValue({
      data: {
        cheng_gong: true,
        shu_ju: { biao_qing: zaoBiaoQingXiang('a9', 0), yi_cun_zai: true },
      },
    })
    const diErCi = await cang.tianJia(new File(['x'], 'a.png', { type: 'image/png' }))
    expect(diErCi?.yiCunZai).toBe(true)
    expect(cang.woDeBiaoQing.map((xiang) => xiang.id)).toEqual(['a9'])
    expect(cang.cuoWuXinXi).toBeNull()
  })

  it('响应缺 shu_ju 时按失败处理且不抛（回落到翻译文案）', async () => {
    const cang = 使用表情仓库()
    httpPostMock.mockResolvedValue({ data: {} })
    await expect(cang.tianJia(new File(['x'], 'a.png', { type: 'image/png' }))).resolves.toBeNull()
    expect(cang.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'biaoQingTianJiaShiBai'))
  })
})

describe('FP-20 聊天页面：图片气泡长按/右键入口', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let qingLi: (() => void) | null = null

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    fetchMock = vi.fn().mockResolvedValue(
      zaoXiangYing({ blob: new Blob(['zhao-pian-bytes'], { type: 'image/png' }) }),
    )
    vi.stubGlobal('fetch', fetchMock)
    httpGetMock.mockResolvedValue({
      data: { cheng_gong: true, shu_ju: { lie_biao: [], zong_shu: 0 } },
    })
    httpPostMock.mockResolvedValue({
      data: { cheng_gong: true, shu_ju: { biao_qing: zaoBiaoQingXiang('xin-1', 0) } },
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    // 消息列表默认由取口给空，除复盘用例（它靠 store 真实加载路径渲染气泡）外都由 guaZai 直接写入
    vi.mocked(huoQuXiaoXi).mockResolvedValue({ lie_biao: [], zong_shu: 0 })
  })

  afterEach(() => {
    qingLi?.()
    qingLi = null
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  async function guaZai(xiaoXiLieBiao: 消息[], luJing = '/chat/h1') {
    const luYou = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 }],
    })
    await luYou.push(luJing)
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
      huo_yue_ren_she_id: null,
      hai_wang_fen_shu: 0,
      chuang_jian_shi_jian: new Date().toISOString(),
      geng_xin_shi_jian: new Date().toISOString(),
    }
    用户仓库.sheZhiTuPianShouQuan(true)
    用户仓库.令牌 = 'test-token'
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.jiaoSeXinXi = {
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
    }
    const wrapper = mount(聊天页面, {
      global: { plugins: [pinia, luYou] },
      attachTo: document.body,
    })
    qingLi = () => wrapper.unmount()
    await flushPromises()
    聊天仓库.xiaoXiLieBiao = xiaoXiLieBiao
    await flushPromises()
    return { wrapper, 聊天仓库, 用户仓库, 表情仓库: 使用表情仓库() }
  }

  function caiDanAnNiu(): HTMLElement[] {
    return Array.from(document.body.querySelectorAll('.chehui-caidan .chehui-xiangmu'))
  }

  async function daKaiDiTiaoQiPaoCaiDan(wrapper: ReturnType<typeof mount>, xuHao = 0) {
    const xiangMu = wrapper.findAll('.xiaoxi-xiangmu')
    await xiangMu[xuHao].trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
  }

  it('自己发的图片右键出「添加到表情」+「撤回」，点它即取图并上传一次', async () => {
    const { wrapper, 聊天仓库 } = await guaZai([zaoXiaoXi({ mei_ti_yuan_shi_wen_jian_ming: 'wo.png' })])
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    expect(caiDanAnNiu().map((anNiu) => anNiu.textContent)).toEqual([
      huoQuFanYi('liaoTian', 'tianJiaDaoBiaoQing'),
      huoQuFanYi('liaoTian', 'cheHui'),
    ])
    caiDanAnNiu()[0].click()
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(QIAN_MING_URL)
    const [luJing, formData] = httpPostMock.mock.calls[0] as [string, FormData]
    expect(luJing).toBe('/表情/我的')
    const wenJian = formData.get('file') as File
    expect(wenJian.name).toBe('wo.png')
    expect(wenJian.type).toBe('image/png')
    expect(聊天仓库.cuoWuXinXi).toBeFalsy()
    expect(document.body.textContent).toContain(huoQuFanYi('duoMeiTi', 'biaoQingYiTianJia'))
  })

  it('AI 发来的图同样可添加且无撤回项（自己发的图才谈撤回）', async () => {
    const { wrapper } = await guaZai([
      zaoXiaoXi({ id: 'ai-1', fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_id: 'j1' }),
    ])
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    expect(caiDanAnNiu().map((anNiu) => anNiu.textContent)).toEqual([
      huoQuFanYi('liaoTian', 'tianJiaDaoBiaoQing'),
    ])
    caiDanAnNiu()[0].click()
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(httpPostMock).toHaveBeenCalledTimes(1)
  })

  it('文本/语音/表情包/文件气泡都不出现「添加到表情」', async () => {
    const { wrapper } = await guaZai([
      zaoXiaoXi({ id: 'w1', lei_xing: 'wenben', nei_rong: '你好' }),
      zaoXiaoXi({ id: 'y1', lei_xing: 'yuYin', nei_rong: '' }),
      zaoXiaoXi({ id: 'b1', lei_xing: 'biaoQingBao', nei_rong: '' }),
      zaoXiaoXi({ id: 'f1', lei_xing: 'wenJian', nei_rong: '' }),
    ])
    const xiangMu = wrapper.findAll('.xiaoxi-xiangmu')
    for (let xuHao = 0; xuHao < xiangMu.length; xuHao++) {
      await xiangMu[xuHao].trigger('contextmenu', { clientX: 10, clientY: 10 })
      await flushPromises()
      expect(caiDanAnNiu().map((anNiu) => anNiu.textContent)).not.toContain(
        huoQuFanYi('liaoTian', 'tianJiaDaoBiaoQing'),
      )
      document.body.querySelector<HTMLElement>('.chehui-zhezhao')?.click()
      await flushPromises()
    }
  })

  it('长按图片气泡（触屏）出「添加到表情」，提前松手/滑动取消，菜单已开则滑动不得关掉它', async () => {
    vi.useFakeTimers()
    try {
      const { wrapper } = await guaZai([zaoXiaoXi({ id: 'chang-an' })])
      const haoMiao = LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao
      const qiPao = wrapper.findAll('.xiaoxi-xiangmu')[0]

      // 未到阈值就松手/移动：不得弹菜单（触屏抖动与滚动不得误触）
      await qiPao.trigger('touchstart')
      await qiPao.trigger('touchmove')
      await vi.advanceTimersByTimeAsync(haoMiao + 50)
      expect(document.body.querySelector('.chehui-zhezhao')).toBeNull()

      // 到阈值：出菜单，项集与右键同源（自己发的图 = 添加到表情 + 撤回）
      await qiPao.trigger('touchstart')
      await vi.advanceTimersByTimeAsync(haoMiao)
      expect(caiDanAnNiu().map((anNiu) => anNiu.textContent)).toEqual([
        huoQuFanYi('liaoTian', 'tianJiaDaoBiaoQing'),
        huoQuFanYi('liaoTian', 'cheHui'),
      ])

      // 菜单已弹出后浏览器补发的 touchmove/touchend 只清待触发定时器，不得把菜单收掉
      await qiPao.trigger('touchmove')
      await qiPao.trigger('touchend')
      expect(caiDanAnNiu()).toHaveLength(2)

      caiDanAnNiu()[0].click()
      await vi.advanceTimersByTimeAsync(0)
      await flushPromises()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect((fetchMock.mock.calls[0] as [string])[0]).toBe(QIAN_MING_URL)
      expect(httpPostMock).toHaveBeenCalledTimes(1)
      expect((httpPostMock.mock.calls[0] as [string])[0]).toBe('/表情/我的')
    } finally {
      vi.useRealTimers()
    }
  })

  it('长按非图片气泡一律不出「添加到表情」', async () => {
    vi.useFakeTimers()
    try {
      const { wrapper } = await guaZai([
        zaoXiaoXi({ id: 'w1', lei_xing: 'wenben', nei_rong: '你好' }),
        zaoXiaoXi({ id: 'y1', lei_xing: 'yuYin', nei_rong: '' }),
        zaoXiaoXi({ id: 'b1', lei_xing: 'biaoQingBao', nei_rong: '' }),
        zaoXiaoXi({ id: 'f1', lei_xing: 'wenJian', nei_rong: '' }),
      ])
      const xiangMu = wrapper.findAll('.xiaoxi-xiangmu')
      expect(xiangMu).toHaveLength(4)
      for (const yiGe of xiangMu) {
        await yiGe.trigger('touchstart')
        await vi.advanceTimersByTimeAsync(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao)
        expect(caiDanAnNiu().map((anNiu) => anNiu.textContent)).not.toContain(
          huoQuFanYi('liaoTian', 'tianJiaDaoBiaoQing'),
        )
        document.body.querySelector<HTMLElement>('.chehui-zhezhao')?.click()
        await vi.advanceTimersByTimeAsync(0)
      }
      expect(fetchMock).not.toHaveBeenCalled()
      expect(httpPostMock).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('复盘模式（只读回看）一律不派发图片菜单，也绝不写用户表情库', async () => {
    // 走 store 的真实加载路径拿气泡（复盘页的气泡由取口下发，不是页面自塞），再验只读门
    const fuPanXiaoXi = [zaoXiaoXi({ id: 'fu-pan' })]
    vi.mocked(huoQuXiaoXi).mockResolvedValue({ lie_biao: fuPanXiaoXi, zong_shu: 1 })
    const { wrapper } = await guaZai(fuPanXiaoXi, '/chat/h1?fuPan=1&dangAnId=d1')
    const xiangMu = wrapper.findAll('.xiaoxi-xiangmu')
    expect(xiangMu.length).toBeGreaterThan(0)
    await xiangMu[0].trigger('contextmenu', { clientX: 40, clientY: 40 })
    await flushPromises()
    expect(document.body.querySelector('.chehui-zhezhao')).toBeNull()
    await xiangMu[0].trigger('touchstart')
    await xiangMu[0].trigger('touchend')
    await flushPromises()
    expect(document.body.querySelector('.chehui-zhezhao')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(httpPostMock).not.toHaveBeenCalled()
  })

  it('重复添加：状态条给「已在我的表情里」，不出现红色错误行也不产生第二条', async () => {
    httpPostMock.mockResolvedValue({
      data: {
        cheng_gong: true,
        shu_ju: { biao_qing: zaoBiaoQingXiang('tong-yi-zhang', 0), yi_cun_zai: true },
      },
    })
    const { wrapper, 聊天仓库, 表情仓库 } = await guaZai([zaoXiaoXi({ id: 'chong-fu' })])
    表情仓库.woDeBiaoQing = [zaoBiaoQingXiang('tong-yi-zhang', 0)]
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    caiDanAnNiu()[0].click()
    await flushPromises()
    expect(聊天仓库.cuoWuXinXi).toBeFalsy()
    expect(wrapper.find('.fasong-cuowu').exists()).toBe(false)
    const zhuangTai = wrapper.find('[role="status"] .biaoqing-tishi')
    expect(zhuangTai.exists()).toBe(true)
    expect(zhuangTai.text()).toBe(huoQuFanYi('duoMeiTi', 'biaoQingYiZaiKu'))
    expect(表情仓库.woDeBiaoQing).toHaveLength(1)
  })

  it('取回失败（断网）：红色错误行走翻译文案，零上传，无未捕获异常', async () => {
    const weiZhuoFa: unknown[] = []
    const jiLu = (shiJian: Event) => weiZhuoFa.push(shiJian)
    window.addEventListener('unhandledrejection', jiLu)
    fetchMock.mockRejectedValue(new Error('网络断了'))
    const { wrapper, 聊天仓库 } = await guaZai([zaoXiaoXi({ id: 'wang-luo' })])
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    caiDanAnNiu()[0].click()
    await flushPromises()
    window.removeEventListener('unhandledrejection', jiLu)
    expect(weiZhuoFa).toEqual([])
    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'biaoQingQuTuShiBai'))
    expect(httpPostMock).not.toHaveBeenCalled()
    expect(document.body.querySelector('.chehui-zhezhao')).toBeNull()
  })

  it('服务端回不支持的格式：按 biaoqingshu 白名单本地拦下，零上传且提示走翻译', async () => {
    fetchMock.mockResolvedValue(
      zaoXiangYing({ blob: new Blob(['<svg/>'], { type: 'image/svg+xml' }) }),
    )
    const { wrapper, 聊天仓库 } = await guaZai([zaoXiaoXi({ id: 'svg-tu' })])
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    caiDanAnNiu()[0].click()
    await flushPromises()
    expect(httpPostMock).not.toHaveBeenCalled()
    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'biaoQingMIMEBuZhiChi'))
  })

  it('超出表情大小上限：本地拦下并提示，零上传', async () => {
    const chaoGuo = new Uint8Array(BIAO_QING_TIAN_JIA_PEI_ZHI.zuiDaZiJieZiJie + 1)
    fetchMock.mockResolvedValue(zaoXiangYing({ blob: new Blob([chaoGuo], { type: 'image/png' }) }))
    const { wrapper, 聊天仓库 } = await guaZai([zaoXiaoXi({ id: 'chao-da' })])
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    caiDanAnNiu()[0].click()
    await flushPromises()
    expect(httpPostMock).not.toHaveBeenCalled()
    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'biaoQingTuPianGuoDa'))
  })

  it('审核违规等业务失败：沿用后端 ti_shi 文案且不追加成功提示', async () => {
    httpPostMock.mockRejectedValue({
      response: { data: { cheng_gong: false, ti_shi: '图片包含违规内容' } },
    })
    const { wrapper, 聊天仓库 } = await guaZai([zaoXiaoXi({ id: 'wei-gui' })])
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    caiDanAnNiu()[0].click()
    await flushPromises()
    expect(聊天仓库.cuoWuXinXi).toBe('图片包含违规内容')
    expect(document.body.querySelector('.biaoqing-tishi')).toBeNull()
  })

  it('未开启图片理解授权时一律不外发：零上传并弹既有授权窗', async () => {
    const { wrapper, 用户仓库 } = await guaZai([zaoXiaoXi({ id: 'wei-shou-quan' })])
    用户仓库.sheZhiTuPianShouQuan(false)
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    caiDanAnNiu()[0].click()
    await flushPromises()
    expect(httpPostMock).not.toHaveBeenCalled()
    expect(document.body.querySelector('.shouquan-zhezhao')).not.toBeNull()
  })

  it('长按已出菜单时补发的 click 不再叠加图片预览', async () => {
    const { wrapper } = await guaZai([zaoXiaoXi({ id: 'yu-lan' })])
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    expect(document.body.querySelector('.chehui-zhezhao')).not.toBeNull()
    await wrapper.find('.tupian-qipao').trigger('click')
    await flushPromises()
    expect(wrapper.find('.tupian-yulan-zhezhao').exists()).toBe(false)
    expect(document.body.querySelector('.chehui-zhezhao')).not.toBeNull()
  })

  it('签名过期时按既有 V8 入口重签一次再取，页面不自建第二套签名口径', async () => {
    vi.mocked(chongQianMeiTiURL).mockResolvedValueOnce('/api/媒体/xin-qian-ming')
    fetchMock
      .mockResolvedValueOnce(zaoXiangYing({ ok: false, status: 403 }))
      .mockResolvedValueOnce(zaoXiangYing())
    const { wrapper, 聊天仓库 } = await guaZai([zaoXiaoXi({ id: 'guo-qi' })])
    await daKaiDiTiaoQiPaoCaiDan(wrapper)
    caiDanAnNiu()[0].click()
    await flushPromises()
    expect(chongQianMeiTiURL).toHaveBeenCalledWith('j1', 'mt-1')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((fetchMock.mock.calls[1] as [string])[0]).toBe('/api/媒体/xin-qian-ming')
    expect(httpPostMock).toHaveBeenCalledTimes(1)
    expect(聊天仓库.cuoWuXinXi).toBeFalsy()
  })

  it('反馈条到点自动消失，卸载即回收待触发定时器（不靠"别的定时器也被清"蒙对）', async () => {
    // 不启用 shouldAdvanceTime：真实耗时会自行推进假时钟，令「恰好多一只定时器」失去可判定性
    vi.useFakeTimers()
    try {
      // 用角色（AI 发来）的图片：本页对该消息不排撤回倒计时，故反馈条是唯一的增减项
      const { wrapper } = await guaZai([
        zaoXiaoXi({ id: 'zi-dong-xiao-shi', fa_song_zhe_lei_xing: 'jiaose', fa_song_zhe_id: 'j1' }),
      ])
      const jiZhun = vi.getTimerCount()
      await daKaiDiTiaoQiPaoCaiDan(wrapper)
      caiDanAnNiu()[0].click()
      await vi.advanceTimersByTimeAsync(0)
      await flushPromises()
      const tiShi = document.body.querySelector('.biaoqing-tishi')
      expect(tiShi?.textContent).toBe(huoQuFanYi('duoMeiTi', 'biaoQingYiTianJia'))
      expect(vi.getTimerCount()).toBe(jiZhun + 1)
      await vi.advanceTimersByTimeAsync(BIAO_QING_QU_TU_PEI_ZHI.tiShiXiaoShiHaoMiao)
      expect(document.body.querySelector('.biaoqing-tishi')).toBeNull()
      expect(vi.getTimerCount()).toBeLessThan(jiZhun + 1)

      const diErZhen = vi.getTimerCount()
      await daKaiDiTiaoQiPaoCaiDan(wrapper)
      caiDanAnNiu()[0].click()
      await vi.advanceTimersByTimeAsync(0)
      await flushPromises()
      expect(document.body.querySelector('.biaoqing-tishi')).not.toBeNull()
      // 此刻页面唯一在途定时器就是反馈条：卸载后必须归零（摘掉 qingLiUIMianBan 的回收即红）
      expect(vi.getTimerCount()).toBe(diErZhen + 1)
      qingLi?.()
      qingLi = null
      expect(vi.getTimerCount()).toBe(diErZhen)
      await vi.advanceTimersByTimeAsync(BIAO_QING_QU_TU_PEI_ZHI.tiShiXiaoShiHaoMiao * 2)
      expect(document.body.querySelector('.biaoqing-tishi')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('FP-20 单源与越界守卫（源码扫描）', () => {
  const quWen = (xiangDui: string) => readFileSync(resolve(__dirname, xiangDui), 'utf-8')
  const quWenJian = quWen('../composables/use添加到表情.ts')
  const caiDanWen = quWen('../composables/use长按菜单.ts')
  const yeMianWen = quWen('../views/聊天页面.vue')
  const biaoQingWen = quWen('../api/表情.ts')
  // 「本地文件 → 我的表情」的提交口与状态条已从页内私有升为共用实现（L-23/L-48(4) 连带收口），
  // 位置断言跟着钉到新文件，计数一条不放宽。
  const tiJiaoKouWen = quWen('../composables/use表情提交.ts')
  const tiShiTiaoWen = quWen('../composables/use表情提示条.ts')
  const shouQuanMenWen = quWen('../composables/use图片授权门.ts')
  const haoYouYeWen = quWen('../views/好友聊天.vue')

  function bianLi(muLu: string): string[] {
    const jieGuo: string[] = []
    for (const xiang of readdirSync(muLu)) {
      const wanZheng = resolve(muLu, xiang)
      if (statSync(wanZheng).isDirectory()) {
        if (xiang === '__tests__' || xiang === 'node_modules') continue
        jieGuo.push(...bianLi(wanZheng))
      } else if (/\.(ts|vue)$/.test(xiang)) jieGuo.push(wanZheng)
    }
    return jieGuo
  }
  const xiangDuiLuJing = (wenJian: string) => wenJian.replace(/\\/g, '/').split('/src/')[1]
  const mingZhong = (pianDuan: string) =>
    bianLi(resolve(__dirname, '..'))
      .filter((wenJian) => readFileSync(wenJian, 'utf-8').includes(pianDuan))
      .map(xiangDuiLuJing)
      .sort()

  it('取图段零鉴权头零上传：Authorization/Bearer/令牌/axios 一个都不出现在本文件', () => {
    for (const moShu of ['Authorization', 'Bearer', 'duQuLingPai', 'axios', 'http.post', 'FormData']) {
      expect(quWenJian).not.toContain(moShu)
    }
    expect(biaoQingWen).toContain("from './请求'")
  })

  it('上传仍只有 api/表情 一处，表情写入口与图片判定各只有一份实现', () => {
    // 提交口不再住在页面里：它在 use表情提交 只有一处，两个聊天页都只是消费方
    expect(tiJiaoKouWen.match(/表情仓库\.tianJia\(/g)).toHaveLength(1)
    expect(tiJiaoKouWen.match(/panDingTuPianJuJue\(/g)).toHaveLength(1)
    expect(mingZhong('表情仓库.tianJia(')).toEqual(['composables/use表情提交.ts'])
    expect(mingZhong('function tiJiaoBiaoQingWenJian')).toEqual(['composables/use表情提交.ts'])
    expect(yeMianWen).not.toContain('表情仓库.tianJia(')
    expect(yeMianWen).not.toContain('panDingTuPianJuJue(')
    expect(haoYouYeWen).not.toContain('表情仓库.tianJia(')
    expect(yeMianWen).not.toContain('clipboardData')
    const 全库上传 = readFileSync(resolve(__dirname, '../stores/表情.ts'), 'utf-8')
    expect(全库上传.match(/tianJiaBiaoQing\(/g)).toHaveLength(1)
  })

  it('图片气泡判定只用 lei_xing 真源，不引入按媒体字段/尺寸的第二套判定', () => {
    expect(caiDanWen).toContain("xiaoXi.lei_xing === 'tuPian'")
    expect(caiDanWen).not.toMatch(/mei_ti_id|mei_ti_lei_bie|ben_di_yu_lan_url/)
    expect(quWenJian).not.toMatch(/lei_xing\s*===/)
  })

  it('菜单文案全部落翻译文件且无中英数字混排空格', () => {
    expect(huoQuFanYi('liaoTian', 'tianJiaDaoBiaoQing')).toBe('添加到表情')
    const xinJian = [
      'biaoQingYiTianJia',
      'biaoQingYiZaiKu',
      'biaoQingQuTuShiBai',
      'biaoQingDiZhiQueShi',
      'biaoQingZhengZaiChuLi',
    ] as const
    for (const jian of xinJian) {
      const zhi = String(fanYi.duoMeiTi[jian as keyof typeof fanYi.duoMeiTi])
      expect(zhi.trim()).not.toBe('')
      expect(zhi).not.toMatch(/[一-龥]\s+[A-Za-z0-9]|[A-Za-z0-9]\s+[一-龥]/)
    }
    for (const yuanMa of [yeMianWen, caiDanWen, quWenJian]) {
      expect(yuanMa).not.toContain("'添加到表情'")
      expect(yuanMa).not.toContain('"添加到表情"')
    }
  })

  it('取图与反馈数值来自配置，源码零硬编码', () => {
    expect(quWenJian).toContain('BIAO_QING_QU_TU_PEI_ZHI.quTuChaoShiHaoMiao')
    // 反馈条的存活时长同样只有一处读数（状态条实现已升为 use表情提示条，两页共用）
    expect(tiShiTiaoWen).toContain('BIAO_QING_QU_TU_PEI_ZHI.tiShiXiaoShiHaoMiao')
    expect(mingZhong('tiShiXiaoShiHaoMiao')).toEqual([
      'composables/use表情提示条.ts',
      'config/表情配置.ts',
    ])
    expect(yeMianWen).not.toContain('tiShiXiaoShiHaoMiao')
    expect(BIAO_QING_QU_TU_PEI_ZHI.quTuChaoShiHaoMiao).toBeLessThan(
      BIAO_QING_TIAN_JIA_PEI_ZHI.chaoShiHaoMiao,
    )
  })

  it('复盘模式下模板直接不派发任何菜单（只读复盘不得改用户表情库）', () => {
    expect(yeMianWen).toContain(
      '@contextmenu.prevent="fuPanMoShi ? null : chuLiYouJianCaiDan(xiaoXi, $event)"',
    )
    expect(yeMianWen).toContain('@touchstart="fuPanMoShi ? null : chuLiChuMoKaiShi(xiaoXi)"')
  })

  it('同类点穷尽：图片气泡渲染点全库只有一处，长按/右键派发点各一处且判定只有一份', () => {
    const tuPianQiPao = mingZhong('tupian-xianshi')
    expect(tuPianQiPao).toEqual(['views/聊天页面.vue'])
    // 判定字面量站点 = 显式枚举清单，出现第四个文件即红。两处各有各的语义，均不得变成第二套：
    //   use长按菜单.ts —— 图片菜单判定的唯一真源 shiTuPianXiaoXi（FP-20）
    //   聊天页面.vue   —— 右键 + 长按两个派发点的分流（下方计数钉死恒 2）
    // （FP-21 的好友聊天页原先也写 `lei_xing === 'tuPian'`，现已收敛到 config/消息配置 的唯一
    //  清单 TU_PIAN_XIAO_XI_LEI_XING，故本清单由三处降为两处；好友页仍不派发任何菜单、不含表情上传，
    //  见下方「好友聊天页只渲染图片、不接表情入口」用例）
    const panDingDian = mingZhong("lei_xing === 'tuPian'")
    expect(panDingDian).toEqual(['composables/use长按菜单.ts', 'views/聊天页面.vue'])
    // 页面两处派发（右键 + 长按）只做分流，判定真源仍是 use长按菜单 的 shiTuPianXiaoXi
    expect(yeMianWen.match(/\n {2}if \(xiaoXi\.lei_xing === 'tuPian'\) \{/g)).toHaveLength(2)
    expect(caiDanWen.match(/shiTuPianXiaoXi\(/g)).toHaveLength(3)
  })

  it('「拉图 → 上传」不成为第二份上传实现：表情端点串与上传函数各自单源', () => {
    // 写口端点在整库只出现在 api/表情.ts（取图段与页面都不得自己发请求）
    expect(mingZhong("'/表情/我的'")).toEqual(['api/表情.ts'])
    // 唯一的表情上传函数：定义在 api 层，唯一调用方是 store；页面只经 表情仓库.tianJia 触达
    expect(mingZhong('tianJiaBiaoQing')).toEqual(['api/表情.ts', 'stores/表情.ts'])
    // 两处新代码自己绝不拼 multipart、绝不直连 XHR/axios
    for (const yuanMa of [yeMianWen, quWenJian]) {
      expect(yuanMa).not.toContain('new FormData')
      expect(yuanMa).not.toContain('XMLHttpRequest')
      expect(yuanMa).not.toContain('axios')
    }
  })

  it('好友聊天页必须复用同一份表情入口（FP-21 L-48(4)），且本页零第二份取图/上传实现', () => {
    const haoYouYe = haoYouYeWen
    // 正向守卫：契约是「任何具备图片气泡的入口都复用 use添加到表情」，负向钉法会把契约违背固化成绿灯
    expect(haoYouYe).toContain('use添加到表情')
    expect(haoYouYe).toContain('use表情提交')
    expect(haoYouYe).toContain('use图片授权门')
    expect(haoYouYe).toContain('use长按菜单')
    expect(haoYouYe).toContain('tianJiaTuPianDaoBiaoQing')
    expect(haoYouYe).toContain('@contextmenu.prevent="daKaiTuPianCaiDan(xiaoXi, $event)"')
    // 两个聊天页都不再自带授权门实现，全部指向唯一真源
    expect(mingZhong('function queRenTuPianShouQuan')).toEqual(['composables/use图片授权门.ts'])
    expect(shouQuanMenWen).toContain('queRenTuPianShouQuan')
    expect(yeMianWen).toContain('use图片授权门')
    // 真正要钉住的仍是「本页没有第二份取图→上传实现」
    expect(haoYouYe).not.toContain('/表情/我的')
    expect(haoYouYe).not.toContain('tianJiaBiaoQing')
    expect(haoYouYe).not.toContain('new FormData')
  })
})
