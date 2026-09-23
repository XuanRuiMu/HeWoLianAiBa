import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import 聊天页面 from '@/views/聊天页面.vue'
import DuoMeiTiShouQuanDanChuang from '@/components/多媒体授权弹窗.vue'
import { use粘贴图片 } from '@/composables/use粘贴图片'
import { ZHAN_TIE_TU_PIAN_PEI_ZHI } from '@/config/消息配置'
import { YA_SUO_CHANG_BIAN_SHANG_XIAN, YA_SUO_ZHI_LIANG } from '@/utils/图片压缩'
import { huoQuFanYi, fanYi } from '@/config/translations'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { duQuShuRuQuText } from './输入区夹具'

/**
 * FP-06a 剪贴板图片粘贴发送。
 *
 * 三段：① `use粘贴图片` 判定矩阵（QQ 口径：一次粘贴只认第一张 image/*，图文同存按图片处理，
 * 无图片项绝不拦截原生文本粘贴）；② 与 `backend/src/config/媒体配置.ts` 的 tupian 白名单/大小上限
 * 同源（两侧边界必须双向一致）；③ 聊天页真实链路 paste → C4 图片授权 → yaSuoTuPiang 压缩 →
 * faSongMeiTiXiaoXi 上传，并钉住「全库只有一份粘贴实现」「聊天输入框同类点清单」防漏。
 */

const shangChuanMeiTiMock = vi.fn()
const faSongXiaoXiApiMock = vi.fn()

vi.mock('@/api/聊天', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return {
    ...shiJi,
    huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
    faSongXiaoXi: (...canShu: unknown[]) => faSongXiaoXiApiMock(...canShu),
    shangChuanMeiTi: (...canShu: unknown[]) => shangChuanMeiTiMock(...canShu),
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
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: null,
      jun_shi_zhi_dao_ji_lu: [],
      guan_jian_shi_jian: [],
      jia_zai_zhong: false,
    }),
    chuangJianHuiHua: vi.fn(),
    huoQuJunShiLieBiao: vi.fn().mockResolvedValue({ junShiLieBiao: [] }),
  }
})

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

interface JiaXiang {
  kind: string
  type: string
  wenJian?: File | null
  yeChuang?: 'zheng-chang' | 'fang-kong' | 'pao-yi-chang'
}

function jiaShuJu(xiangList: JiaXiang[], files: File[] = []) {
  const items = xiangList.map((xiang) => ({
    kind: xiang.kind,
    type: xiang.type,
    getAsFile: () => {
      if (xiang.yeChuang === 'pao-yi-chang') throw new Error('clipboard unavailable')
      return xiang.wenJian === undefined ? null : xiang.wenJian
    },
  }))
  // 真 DataTransfer 恒有 getData（FP-10c 的图文输入区就按这一条兜纯文本粘贴）。桩不给 getData 会让
  // 组件在 clipboardData.getData(...) 上抛 TypeError，用例只是"运气好地"在 preventDefault 之前崩掉，
  // 于是把"组件拦截了原生粘贴"这一真实终态伪装成 defaultPrevented === false 的假绿。
  return { items, files, getData: (leiXing: string) => (leiXing === 'text/plain' ? '' : '') }
}

function jiaZhanTieShiJian(shuJu: unknown) {
  const fangZhiMoRen = vi.fn()
  const shiJian = {
    clipboardData: shuJu,
    preventDefault: fangZhiMoRen,
  } as unknown as ClipboardEvent
  return { shiJian, fangZhiMoRen }
}

function tuPianWenJian(mime: string, ming = 'zhan-tie.png'): File {
  return new File([new Uint8Array(64)], ming, { type: mime })
}

function xuShiComposable() {
  const fanJiaTuPian = vi.fn().mockResolvedValue(undefined)
  const sheZhiCuoWu = vi.fn()
  return { ...use粘贴图片({ fanJiaTuPian, sheZhiCuoWu }), fanJiaTuPian, sheZhiCuoWu }
}

describe('FP-06a use粘贴图片 判定矩阵', () => {
  it.each(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])(
    '白名单 %s：拦截原生粘贴并把原文件交既有发送链路',
    (mime) => {
      const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
      const wenJian = tuPianWenJian(mime)
      const { shiJian, fangZhiMoRen } = jiaZhanTieShiJian(
        jiaShuJu([{ kind: 'file', type: mime, wenJian }]),
      )
      chuLiZhanTie(shiJian)
      expect(fanJiaTuPian).toHaveBeenCalledTimes(1)
      expect(fanJiaTuPian).toHaveBeenCalledWith(wenJian)
      expect(fangZhiMoRen).toHaveBeenCalledTimes(1)
      expect(sheZhiCuoWu).not.toHaveBeenCalled()
    },
  )

  it.each(['image/svg+xml', 'image/tiff', 'image/heic', 'image/avif'])(
    '非白名单 %s：翻译提示且零发送（服务端同一白名单二次把守）',
    (mime) => {
      const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
      const { shiJian, fangZhiMoRen } = jiaZhanTieShiJian(
        jiaShuJu([{ kind: 'file', type: mime, wenJian: tuPianWenJian(mime) }]),
      )
      chuLiZhanTie(shiJian)
      expect(fanJiaTuPian).not.toHaveBeenCalled()
      expect(sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('duoMeiTi', 'zhanTieMIMEBuZhiChi'))
      expect(fangZhiMoRen).toHaveBeenCalledTimes(1)
    },
  )

  it('MIME 为空但 kind=file：按非白名单拒绝而非猜测类型', () => {
    const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: { size: 10, type: '' } as File }]),
    )
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).not.toHaveBeenCalled()
    expect(sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('duoMeiTi', 'zhanTieMIMEBuZhiChi'))
  })

  it('超过配置上限：提示且零发送', () => {
    const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
    const chaoGuo = { size: ZHAN_TIE_TU_PIAN_PEI_ZHI.zuiDaZiJieZiJie + 1, type: 'image/png' } as File
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: chaoGuo }]),
    )
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).not.toHaveBeenCalled()
    expect(sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('duoMeiTi', 'zhanTieTuPianGuoDa'))
  })

  it('恰好等于上限不拦（上限口径与后端一致为「不得超过」）', () => {
    const { chuLiZhanTie, fanJiaTuPian } = xuShiComposable()
    const bianJie = { size: ZHAN_TIE_TU_PIAN_PEI_ZHI.zuiDaZiJieZiJie, type: 'image/png' } as File
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: bianJie }]),
    )
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).toHaveBeenCalledWith(bianJie)
  })

  it('0 字节图片：提示且零发送', () => {
    const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([
        {
          kind: 'file',
          type: 'image/png',
          wenJian: new File([], 'kong.png', { type: 'image/png' }),
        },
      ]),
    )
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).not.toHaveBeenCalled()
    expect(sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('duoMeiTi', 'zhanTieTuPianWeiKong'))
  })

  it('纯文本粘贴：不拦截、不发送、不提示（textarea 原生行为保持）', () => {
    const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
    const { shiJian, fangZhiMoRen } = jiaZhanTieShiJian(
      jiaShuJu([{ kind: 'string', type: 'text/plain' }]),
    )
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).not.toHaveBeenCalled()
    expect(sheZhiCuoWu).not.toHaveBeenCalled()
    expect(fangZhiMoRen).not.toHaveBeenCalled()
  })

  it('剪贴板为空（无 items 无 files）：零副作用且不抛异常', () => {
    const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
    const { shiJian, fangZhiMoRen } = jiaZhanTieShiJian(jiaShuJu([]))
    expect(() => chuLiZhanTie(shiJian)).not.toThrow()
    expect(fanJiaTuPian).not.toHaveBeenCalled()
    expect(sheZhiCuoWu).not.toHaveBeenCalled()
    expect(fangZhiMoRen).not.toHaveBeenCalled()
  })

  it('clipboardData 整体缺失（旧引擎）：零副作用且不抛异常', () => {
    const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
    const { shiJian } = jiaZhanTieShiJian(null)
    expect(() => chuLiZhanTie(shiJian)).not.toThrow()
    expect(fanJiaTuPian).not.toHaveBeenCalled()
    expect(sheZhiCuoWu).not.toHaveBeenCalled()
  })

  it('剪贴板权限被拒：有 image 项却取不到文件 → 提示且零发送', () => {
    const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: null }]),
    )
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).not.toHaveBeenCalled()
    expect(sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('duoMeiTi', 'zhanTieShuJuBuKeYong'))
  })

  it('getAsFile 抛异常（iOS/Android WebView 差异）：归一为不可读提示，异常不外溢', () => {
    const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: null, yeChuang: 'pao-yi-chang' }]),
    )
    expect(() => chuLiZhanTie(shiJian)).not.toThrow()
    expect(fanJiaTuPian).not.toHaveBeenCalled()
    expect(sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('duoMeiTi', 'zhanTieShuJuBuKeYong'))
  })

  it('图文同存（复制富文本带图）：按 QQ 口径只发图片并拦文本', () => {
    const { chuLiZhanTie, fanJiaTuPian } = xuShiComposable()
    const wenJian = tuPianWenJian('image/png')
    const { shiJian, fangZhiMoRen } = jiaZhanTieShiJian(
      jiaShuJu([
        { kind: 'string', type: 'text/plain' },
        { kind: 'file', type: 'image/png', wenJian },
      ]),
    )
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).toHaveBeenCalledTimes(1)
    expect(fanJiaTuPian).toHaveBeenCalledWith(wenJian)
    expect(fangZhiMoRen).toHaveBeenCalledTimes(1)
  })

  it('一次粘贴多图：按出现顺序全部交给同一条待发序列，不各自成一条刷屏', () => {
    // FP-10b（缺陷9）收口：旧口径「只认第一张 + 立即发出」正是用户投诉的点。
    // 现在 N 张图进的是**同一条**消息的待发块序列 ⇒ 既一张不丢，也不会连发 N 条刷屏。
    const { chuLiZhanTie, fanJiaTuPian } = xuShiComposable()
    const diYiZhang = tuPianWenJian('image/png')
    const diErZhang = tuPianWenJian('image/jpeg')
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([
        { kind: 'file', type: 'image/png', wenJian: diYiZhang },
        { kind: 'file', type: 'image/jpeg', wenJian: diErZhang },
      ]),
    )
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).toHaveBeenCalledTimes(2)
    expect(fanJiaTuPian.mock.calls[0][0]).toBe(diYiZhang)
    expect(fanJiaTuPian.mock.calls[1][0]).toBe(diErZhang)
  })

  it('items 无图片项时退化到 files（部分 WebView 只填 files）', () => {
    const { chuLiZhanTie, fanJiaTuPian } = xuShiComposable()
    const wenJian = tuPianWenJian('image/webp')
    const { shiJian } = jiaZhanTieShiJian(jiaShuJu([], [wenJian]))
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).toHaveBeenCalledWith(wenJian)
  })

  it('files 里只有非图片文件：不拦截，交回原生粘贴', () => {
    const { chuLiZhanTie, fanJiaTuPian, sheZhiCuoWu } = xuShiComposable()
    const { shiJian, fangZhiMoRen } = jiaZhanTieShiJian(
      jiaShuJu([], [new File(['shu-ju'], 'wenjian.pdf', { type: 'application/pdf' })]),
    )
    chuLiZhanTie(shiJian)
    expect(fanJiaTuPian).not.toHaveBeenCalled()
    expect(sheZhiCuoWu).not.toHaveBeenCalled()
    expect(fangZhiMoRen).not.toHaveBeenCalled()
  })

  it('发送链路异步失败：提示发送失败且不产生未捕获异常', async () => {
    const fanJiaTuPian = vi.fn().mockRejectedValue(new Error('wang-luo'))
    const sheZhiCuoWu = vi.fn()
    const { chuLiZhanTie } = use粘贴图片({ fanJiaTuPian, sheZhiCuoWu })
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: tuPianWenJian('image/png') }]),
    )
    expect(() => chuLiZhanTie(shiJian)).not.toThrow()
    await flushPromises()
    expect(sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('duoMeiTi', 'faSongShiBai'))
  })

  it('发送链路同步抛异常：同样就地提示', () => {
    const fanJiaTuPian = vi.fn(() => {
      throw new Error('boom')
    })
    const sheZhiCuoWu = vi.fn()
    const { chuLiZhanTie } = use粘贴图片({ fanJiaTuPian, sheZhiCuoWu })
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: tuPianWenJian('image/png') }]),
    )
    expect(() => chuLiZhanTie(shiJian)).not.toThrow()
    expect(sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('duoMeiTi', 'faSongShiBai'))
  })

  it('粘贴本身不建预览 URL：blob URL 生命周期仍由既有 dengJiYuLanURL 独占', () => {
    const createSpy = vi.fn(() => 'blob:bu-gai-chuang-jian')
    URL.createObjectURL = createSpy as typeof URL.createObjectURL
    const { chuLiZhanTie } = xuShiComposable()
    const { shiJian } = jiaZhanTieShiJian(
      jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: tuPianWenJian('image/png') }]),
    )
    chuLiZhanTie(shiJian)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('四条粘贴文案全部来自翻译文件且无占位残留', () => {
    const ziJian = fanYi.duoMeiTi as unknown as Record<string, string>
    for (const jian of [
      'zhanTieMIMEBuZhiChi',
      'zhanTieTuPianGuoDa',
      'zhanTieTuPianWeiKong',
      'zhanTieShuJuBuKeYong',
    ]) {
      expect(ziJian[jian]).toBeTruthy()
      expect(ziJian[jian]).not.toMatch(/undefined|\{|\}/)
    }
  })
})

describe('FP-06a 客户端与后端 tupian 边界同源（读后端源文件把守）', () => {
  const 后端源 = readFileSync(resolve(__dirname, '../../../backend/src/config/媒体配置.ts'), 'utf-8')

  function chuoKuai(ming: string): string {
    const 命中 = new RegExp(`${ming}:\\s*\\{([\\s\\S]*?)\\n  \\}`).exec(后端源)
    if (!命中) throw new Error(`后端媒体配置里找不到 ${ming} 段`)
    return 命中[1]
  }

  it('MIME 白名单逐项一致（顺序不敏感）', () => {
    const 命中 = /tupian:\s*\[([^\]]*)\]/.exec(chuoKuai('mimeBaiMingDan'))
    if (!命中) throw new Error('后端 mimeBaiMingDan 里找不到 tupian 白名单')
    const 后端 = [...命中[1].matchAll(/'([^']+)'/g)]
      .map((xiang) => xiang[1])
      .sort()
    expect([...ZHAN_TIE_TU_PIAN_PEI_ZHI.yunXuMIME].sort()).toEqual(后端)
  })

  it('大小上限数值一致（含 ZI_JIE 单位换算）', () => {
    const 命中 = /tupian:\s*([^\n,]+)/.exec(chuoKuai('daXiaoShangXianZiJie'))
    if (!命中) throw new Error('后端 daXiaoShangXianZiJie 里找不到 tupian 上限')
    const ziJie = Number(/const ZI_JIE = (\d+)/.exec(后端源)?.[1])
    if (!Number.isFinite(ziJie) || ziJie <= 0) throw new Error('后端 ZI_JIE 单位解析失败')
    const yinZi = 命中[1]
      .replace(/ZI_JIE/g, String(ziJie))
      .split('*')
      .map((xiang) => Number(xiang.trim()))
    if (yinZi.some((xiang) => !Number.isFinite(xiang) || xiang <= 0)) {
      throw new Error(`后端 tupian 上限无法求值：${命中[1]}`)
    }
    expect(yinZi.reduce((cheng, xiang) => cheng * xiang, 1)).toBe(
      ZHAN_TIE_TU_PIAN_PEI_ZHI.zuiDaZiJieZiJie,
    )
  })
})

describe('FP-06a 同类点穷尽', () => {
  const yuanGenLu = resolve(__dirname, '..')
  const cangGenLu = resolve(__dirname, '../..')

  function hanShiJian(mingLing: RegExp): string[] {
    return readdirSync(yuanGenLu, { recursive: true })
      .map((xiang) => String(xiang).replace(/\\/g, '/'))
      .filter((luJing) => /\.(vue|ts)$/.test(luJing) && !luJing.startsWith('__tests__/'))
      .filter((luJing) => mingLing.test(readFileSync(resolve(yuanGenLu, luJing), 'utf-8')))
      .map((luJing) => relative(cangGenLu, resolve(yuanGenLu, luJing)).replace(/\\/g, '/'))
      .sort()
  }

  /** 剥掉行注释与块注释，只留代码体：让「不得出现某端点」这类负向断言不被解释性文字误伤 */
  function quDiaoZhuShi(源文本: string): string {
    return 源文本
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((yiHang) => !yiHang.trimStart().startsWith('//'))
      .join('\n')
  }

  // FP-10c 契约演进：载体从"页面里的 textarea"换成共用的 contenteditable 组件，于是
  // clipboardData / class="shuru-kuang" / @paste 三处命中点都搬了家。旧断言钉的是"命中在哪两个文件"，
  // 钉不出"实现是否只有一份"。下面三条各自升级为**正向唯一 + 反向越界即红**两条断言，是收紧：
  //  ① clipboardData 允许出现的文件集合精确到两枚，且组件那一枚只准读 text/plain（图片项一律交回
  //     use粘贴图片，绝不在组件里长出第二条取文件通路）；
  //  ② "输入框同类点恒为两处"变为"输入框实现恒为一处 + 两页必须各自接上它"（少接一页就是假功能）；
  //  ③ 原生 paste 监听器全库唯一（在组件上），页面侧改为监听组件再抛出的 zhan-tie，
  //     少一处绑定 = 那一页粘贴失效；多一处原生监听 = 第二套通路。
  it('剪贴板读取全库只有一份实现，未另起第二套粘贴通路', () => {
    expect(hanShiJian(/clipboardData/)).toEqual([
      'src/components/聊天/图文输入区.vue',
      'src/composables/use粘贴图片.ts',
    ])
    const 组件源 = quDiaoZhuShi(
      readFileSync(resolve(yuanGenLu, 'components/聊天/图文输入区.vue'), 'utf-8'),
    )
    // 组件这一侧只准碰纯文本：读 items / files / getData 之外的任何剪贴板面就是第二条通路
    expect(组件源.match(/clipboardData[^\n]*/g)).toEqual([
      "clipboardData?.getData('text/plain') ?? ''",
    ])
    expect(组件源).not.toMatch(/clipboardData[^\n]*\.(items|files)/)
  })

  it('聊天输入框实现恒为一处且两页都接上它（出现第二处裸输入框即失败）', () => {
    expect(hanShiJian(/class="shuru-kuang"/)).toEqual(['src/components/聊天/图文输入区.vue'])
    expect(hanShiJian(/<TuWenShuRuQu\b/)).toEqual([
      'src/views/好友聊天.vue',
      'src/views/聊天页面.vue',
    ])
  })

  it('粘贴入口恒绑定在两处聊天页（少绑一处即假功能，多出一处即第二套通路）', () => {
    expect(hanShiJian(/@paste=/)).toEqual(['src/components/聊天/图文输入区.vue'])
    expect(hanShiJian(/@zhan-tie="chuLiZhanTie"/)).toEqual([
      'src/views/好友聊天.vue',
      'src/views/聊天页面.vue',
    ])
  })

  it('好友聊天已具备媒体通路（FP-21）：粘贴实现唯一、上传走好友端点、不借 AI 会话端点', () => {
    const yeMianYuan = readFileSync(resolve(yuanGenLu, 'views/好友聊天.vue'), 'utf-8')
    const apiYuan = readFileSync(resolve(yuanGenLu, 'api/社交.ts'), 'utf-8')
    // 负向断言只看代码体：注释里出现端点名是解释性文字，不构成调用点
    const yeMianDaiMa = quDiaoZhuShi(yeMianYuan)
    const apiDaiMa = quDiaoZhuShi(apiYuan)

    // ① 具备媒体发送点，且必须绑唯一粘贴实现（原「一旦出现就必须绑定」的触发条件已成立，此处直接断言）
    expect(/shangChuanHaoYouMeiTi/.test(`${yeMianDaiMa}\n${apiDaiMa}`)).toBe(true)
    expect(/@zhan-tie="chuLiZhanTie"/.test(yeMianDaiMa)).toBe(true)
    expect(yeMianDaiMa.includes('use粘贴图片')).toBe(true)

    // ② 页面侧不得另起第二套剪贴板读取或第二份压缩实现
    expect(yeMianDaiMa).not.toMatch(/clipboardData/)
    expect(yeMianDaiMa).not.toMatch(/createImageBitmap|toBlob\(/)

    // ③ 归属模型：好友媒体上传只走 /好友/媒体，禁止借用按 AI 会话归属校验的会话端点
    expect(apiDaiMa).toMatch(/http\.post[^]*'\/好友\/媒体'/)
    expect(`${yeMianDaiMa}\n${apiDaiMa}`).not.toMatch(/\/聊天\/会话\/[^/]*\/媒体/)
  })
})

// ------------------------------------------------------------ 聊天页真实发送链路

function anzhuangCanvasZhuangZhi() {
  const yuanShiChuangJian = document.createElement.bind(document)
  const chuJianBlob = new Blob(['ya-suo-hou'], { type: 'image/jpeg' })
  const toBlobSpy = vi.fn((huiTiao: (blob: Blob | null) => void) => {
    setTimeout(() => huiTiao(chuJianBlob), 0)
  })
  const canvasStub = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({ drawImage: vi.fn() })),
    toBlob: toBlobSpy,
  } as unknown as HTMLCanvasElement
  const jianShi = vi
    .spyOn(document, 'createElement')
    .mockImplementation(((biaoQian: string) =>
      biaoQian === 'canvas'
        ? canvasStub
        : yuanShiChuangJian(biaoQian)) as typeof document.createElement)
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width: 3000, height: 2000, close: vi.fn() }),
  )
  return {
    toBlobSpy,
    canvasStub,
    chuJianBlob,
    huiFu: () => {
      jianShi.mockRestore()
      // 只回收本用例自己 stub 的 createImageBitmap：vi.unstubAllGlobals 会连带抹掉
      // setup.ts 里全局 stub 的 ResizeObserver，导致后续挂载抛 ReferenceError
      delete (globalThis as unknown as Record<string, unknown>).createImageBitmap
    },
  }
}

async function miaoShuTuLiaoTianYe() {
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
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    geng_xin_shi_jian: new Date().toISOString(),
  }
  const 聊天仓库 = 使用聊天仓库()
  聊天仓库.dangQianHuiHuaId = 'h1'
  const wrapper = mount(聊天页面, { global: { plugins: [pinia, luYou] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, 聊天仓库, 用户仓库 }
}

async function chuFaZhanTie(muBiao: Element, shuJu: unknown): Promise<boolean> {
  const shiJian = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(shiJian, 'clipboardData', { value: shuJu })
  muBiao.dispatchEvent(shiJian)
  await flushPromises()
  return shiJian.defaultPrevented
}

describe('FP-06a 聊天页 paste → 授权门 → 压缩 → 既有媒体发送链路', () => {
  let qingLi: (() => void) | null = null

  beforeEach(() => {
    localStorage.clear()
    shangChuanMeiTiMock.mockReset()
    faSongXiaoXiApiMock.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:yulan-mo-ni') as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL
    faSongXiaoXiApiMock.mockResolvedValue({
      xiaoXi: {
        id: 'srv-1',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '',
        lei_xing: 'tuPian',
        shi_jian_chuo: Date.now(),
        yi_du: true,
        ke_hu_duan_xu_hao: 1,
        mei_ti_id: 'm1',
        mei_ti_url: '/api/media/qianming',
      },
      shiMiJi: false,
    })
  })

  afterEach(() => {
    qingLi?.()
    qingLi = null
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('未开启图片授权时粘贴：只进待发区（不弹窗零上传），点发送才弹既有授权窗', async () => {
    const { wrapper, 用户仓库 } = await miaoShuTuLiaoTianYe()
    qingLi = () => wrapper.unmount()
    用户仓库.sheZhiTuPianShouQuan(false)

    const lanJie = await chuFaZhanTie(
      wrapper.find('.shuru-kuang').element,
      jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: tuPianWenJian('image/png') }]),
    )
    await flushPromises()

    expect(lanJie).toBe(true)
    // FP-10b（缺陷9）：粘贴只是把图留在本地 ⇒ C4 授权门后移到「发送那一刻」，一个请求都不该发
    expect(wrapper.find('.shuru-kuang .dai-fa-kuai--tu').exists()).toBe(true)
    expect(wrapper.findComponent(DuoMeiTiShouQuanDanChuang).props('xianShi')).toBe(false)
    expect(shangChuanMeiTiMock).not.toHaveBeenCalled()

    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(DuoMeiTiShouQuanDanChuang).props('xianShi')).toBe(true)
    expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
  })

  it('授权窗未关时连贴三张：三条都发出（队列承载，聊天页 L-23 的单变量缺陷不得回来）', async () => {
    const { wrapper, 用户仓库 } = await miaoShuTuLiaoTianYe()
    qingLi = () => wrapper.unmount()
    用户仓库.sheZhiTuPianShouQuan(false)
    shangChuanMeiTiMock.mockResolvedValue({
      // 图文混排提交侧按后端同一口径要求媒体 ID 是 UUID（keTiJiaoKuai），非 UUID 的块逐块丢弃
      mediaId: '3f2b7c9d-4a1e-4f6b-9c2d-1e5f7a3b8c0d',
      sha256: 'abc',
      mime: 'image/jpeg',
      daXiao: 100,
      leiBie: 'tupian',
      yuanShiWenJianMing: 'image.png',
      mei_ti_url: '/api/media/qianming',
    })
    const zhuangZhi = anzhuangCanvasZhuangZhi()
    try {
      for (const ci of [1, 2, 3]) {
        await chuFaZhanTie(
          wrapper.find('.shuru-kuang').element,
          jiaShuJu([
            { kind: 'file', type: 'image/png', wenJian: tuPianWenJian('image/png', `di-${ci}.png`) },
          ]),
        )
      }
      // FP-10b：三次粘贴落在**同一条**消息的待发块序列里，三张三张都不丢、也一条都没发出去
      expect(wrapper.findAll('.dai-fa-kuai--tu')).toHaveLength(3)
      expect(shangChuanMeiTiMock).not.toHaveBeenCalled()

      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      const danChuang = wrapper.findComponent(DuoMeiTiShouQuanDanChuang)
      expect(danChuang.props('xianShi')).toBe(true)
      expect(shangChuanMeiTiMock).not.toHaveBeenCalled()

      danChuang.vm.$emit('queRen')
      await vi.waitFor(() => expect(shangChuanMeiTiMock).toHaveBeenCalledTimes(3))
      expect(wrapper.findComponent(DuoMeiTiShouQuanDanChuang).props('xianShi')).toBe(false)
      expect(用户仓库.tuPianShouQuan).toBe(true)
    } finally {
      zhuangZhi.huiFu()
    }
  })

  it('粘贴图片：先进待发区压缩，点发送才以 tupian 类别上传 jpeg，输入框不被写入文本', async () => {
    const { wrapper, 用户仓库, 聊天仓库 } = await miaoShuTuLiaoTianYe()
    qingLi = () => wrapper.unmount()
    用户仓库.sheZhiTuPianShouQuan(true)
    shangChuanMeiTiMock.mockResolvedValue({
      // 图文混排提交侧按后端同一口径要求媒体 ID 是 UUID（keTiJiaoKuai），非 UUID 的块逐块丢弃
      mediaId: '3f2b7c9d-4a1e-4f6b-9c2d-1e5f7a3b8c0d',
      sha256: 'abc',
      mime: 'image/jpeg',
      daXiao: 100,
      leiBie: 'tupian',
      yuanShiWenJianMing: 'image.png',
      mei_ti_url: '/api/media/qianming',
    })
    const zhuangZhi = anzhuangCanvasZhuangZhi()
    try {
      const yuanWenJian = tuPianWenJian('image/png', 'image.png')
      const lanJie = await chuFaZhanTie(
        wrapper.find('.shuru-kuang').element,
        jiaShuJu([{ kind: 'file', type: 'image/png', wenJian: yuanWenJian }]),
      )
      // FP-10b：粘贴这一刻零请求（压缩已在后台跑）；点发送才上传，且发送会先等在途压缩落回块里
      expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
      await wrapper.find('.fasong-anniu').trigger('click')
      await vi.waitFor(() => expect(shangChuanMeiTiMock).toHaveBeenCalledTimes(1))

      expect(lanJie).toBe(true)
      expect(zhuangZhi.toBlobSpy).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        YA_SUO_ZHI_LIANG,
      )
      expect(zhuangZhi.canvasStub.width).toBe(YA_SUO_CHANG_BIAN_SHANG_XIAN)
      const shangChuanWenJian = shangChuanMeiTiMock.mock.calls[0][1] as Blob
      expect(shangChuanWenJian).toBe(zhuangZhi.chuJianBlob)
      expect(shangChuanWenJian).not.toBe(yuanWenJian)
      expect(shangChuanMeiTiMock.mock.calls[0][0]).toBe('h1')
      expect(shangChuanMeiTiMock.mock.calls[0][2]).toBe('tupian')
      expect(duQuShuRuQuText(wrapper)).toBe('')
      expect(聊天仓库.cuoWuXinXi).toBeNull()
      await vi.waitFor(() =>
        expect(聊天仓库.xiaoXiLieBiao.some((xiaoXi) => xiaoXi.lei_xing === 'tuPian')).toBe(true),
      )
    } finally {
      zhuangZhi.huiFu()
    }
  })

  it('粘贴非白名单图片：页面内联提示翻译文案且零上传零异常', async () => {
    const { wrapper, 用户仓库, 聊天仓库 } = await miaoShuTuLiaoTianYe()
    qingLi = () => wrapper.unmount()
    用户仓库.sheZhiTuPianShouQuan(true)

    await chuFaZhanTie(
      wrapper.find('.shuru-kuang').element,
      jiaShuJu([{ kind: 'file', type: 'image/tiff', wenJian: tuPianWenJian('image/tiff') }]),
    )
    await flushPromises()

    expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'zhanTieMIMEBuZhiChi'))
    expect(wrapper.find('.tishi-dai-cuowu').text()).toBe(huoQuFanYi('duoMeiTi', 'zhanTieMIMEBuZhiChi'))
  })

  it('粘贴纯文本：交图文输入区按纯文本插入（拦截原生），页面零媒体上传', async () => {
    const { wrapper, 用户仓库 } = await miaoShuTuLiaoTianYe()
    qingLi = () => wrapper.unmount()
    用户仓库.sheZhiTuPianShouQuan(true)

    const lanJie = await chuFaZhanTie(
      wrapper.find('.shuru-kuang').element,
      jiaShuJu([{ kind: 'string', type: 'text/plain' }]),
    )
    await flushPromises()

    // 契约演进（FP-10c）：旧判定「纯文本粘贴不拦截、交回浏览器原生行为」随 textarea 载体失效——
    // 图文输入区对纯文本一律 preventDefault 后自己插纯文本，绝不让浏览器塞富文本
    // （同口径见 __tests__/FP10c真内联输入区.test.ts ③）。本用例守的仍是页面侧零上传这条不变式。
    expect(lanJie).toBe(true)
    expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
  })

  it('剪贴板无文件：页面零副作用', async () => {
    const { wrapper, 用户仓库, 聊天仓库 } = await miaoShuTuLiaoTianYe()
    qingLi = () => wrapper.unmount()
    用户仓库.sheZhiTuPianShouQuan(true)

    const lanJie = await chuFaZhanTie(wrapper.find('.shuru-kuang').element, jiaShuJu([]))
    await flushPromises()

    // 契约演进（FP-10c）：同上——空剪贴板也被输入区拦下（插入结果为空），但页面一个请求都不发、
    // 不产生错误提示，这三条才是本用例的实质。
    expect(lanJie).toBe(true)
    expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
    expect(聊天仓库.cuoWuXinXi).toBeNull()
  })
})
