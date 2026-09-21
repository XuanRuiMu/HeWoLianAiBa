import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { use图片授权门 } from '@/composables/use图片授权门'
import { use表情提交, type TianJiaJieGuo } from '@/composables/use表情提交'
import { use表情提示条 } from '@/composables/use表情提示条'
import { huoQuFanYi } from '@/config/translations'
import { BIAO_QING_QU_TU_PEI_ZHI } from '@/config/表情配置'
import { 使用表情仓库 } from '@/stores/表情'

/**
 * L-23 与 C4 授权门的单一真源验收。
 *
 * 三段：① `use图片授权门` 的队列语义（弹窗未关时连触 N 次，一次结算必须把 N 个 Promise 全答掉——
 * 聊天页原来的单变量实现做不到，故第一组用例对单变量实现必然红灯）；② `use表情提交` 这一处唯一
 * 写入口的判定/授权/上传次序，以及「两页的错误各落各的横幅」；③ 源码扫描钉住实现只有一处、两页只是消费方。
 */

const 添加表情 = vi.fn()

vi.mock('@/api/表情', () => ({
  tianJiaBiaoQing: (...canShu: unknown[]) => 添加表情(...canShu),
  huoQuWoDeBiaoQing: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  shanChuBiaoQing: vi.fn().mockResolvedValue(undefined),
  baoCunBiaoQingPaiXu: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  MO_REN_WEN_JIAN_MING: 'biaoqing.png',
}))

const DAI_QUE_REN = 'wei-jie-suan' as const

/** 只观察「这一条到底 settle 没 settle」：永不 settle 时返回哨兵值，而不是把用例拖到超时 */
async function ceDingZhuangTai(cheng: Promise<boolean>): Promise<boolean | typeof DAI_QUE_REN> {
  return Promise.race([cheng, Promise.resolve(DAI_QUE_REN)])
}

function 授权门(初始已授权 = false) {
  let kaiGuanZhi = 初始已授权
  const xieZhiJiLu: boolean[] = []
  const menInstance = use图片授权门({
    huoQuYiShouQuan: () => kaiGuanZhi,
    sheZhiYiShouQuan: (yunXu) => {
      kaiGuanZhi = yunXu
      xieZhiJiLu.push(yunXu)
    },
  })
  return { ...menInstance, kaiGuan: () => kaiGuanZhi, xieZhiJiLu }
}

function 图片文件(名称 = 'pet.png', 类型 = 'image/png'): File {
  return new File([new Uint8Array(64)], 名称, { type: 类型 })
}

describe('use图片授权门 C4 授权门（L-23 的唯一实现）', () => {
  it('弹窗未关时连触三次：一次确认让三条 Promise 全部 settle 为 true', async () => {
    const { xianShi, queRenTuPianShouQuan, shouQuanQueRen } = 授权门()
    const dengDai = [queRenTuPianShouQuan(), queRenTuPianShouQuan(), queRenTuPianShouQuan()]
    expect(xianShi.value).toBe(true)
    shouQuanQueRen()
    expect(await Promise.all(dengDai.map((cheng) => ceDingZhuangTai(cheng)))).toEqual([
      true,
      true,
      true,
    ])
    expect(xianShi.value).toBe(false)
  })

  it('弹窗未关时连触三次：一次拒绝让三条 Promise 全部 settle 为 false 且不写开关', async () => {
    const { queRenTuPianShouQuan, shouQuanJuJue, kaiGuan, xieZhiJiLu } = 授权门()
    const dengDai = [queRenTuPianShouQuan(), queRenTuPianShouQuan(), queRenTuPianShouQuan()]
    shouQuanJuJue()
    expect(await Promise.all(dengDai.map((cheng) => ceDingZhuangTai(cheng)))).toEqual([
      false,
      false,
      false,
    ])
    expect(xieZhiJiLu).toEqual([])
    expect(kaiGuan()).toBe(false)
  })

  it('结算哨兵本身可信：单变量承载 resolver 的旧形态下，前一条 Promise 永不 settle', async () => {
    // 这一条钉的是「上面的队列用例真的有证伪力」：把聊天页被删掉的单变量形态原地复现一遍
    let daiQueRenHuiDiao: ((yunXu: boolean) => void) | null = null
    const chuFa = () =>
      new Promise<boolean>((jieJue) => {
        daiQueRenHuiDiao = jieJue
      })
    const diYiTiao = chuFa()
    const diErTiao = chuFa()
    daiQueRenHuiDiao?.(true)
    await expect(ceDingZhuangTai(diErTiao)).resolves.toBe(true)
    await expect(ceDingZhuangTai(diYiTiao)).resolves.toBe(DAI_QUE_REN)
  })

  it('授权已开启：直接 resolve(true) 且不弹窗、不写开关', async () => {
    const { xianShi, queRenTuPianShouQuan, xieZhiJiLu } = 授权门(true)
    await expect(queRenTuPianShouQuan()).resolves.toBe(true)
    expect(xianShi.value).toBe(false)
    expect(xieZhiJiLu).toEqual([])
  })

  it('结算后队列即清空：拒绝后再次触发重新弹窗，且上一轮不会被重复答一次', async () => {
    const { xianShi, queRenTuPianShouQuan, shouQuanJuJue, shouQuanQueRen } = 授权门()
    const diYiTiao = queRenTuPianShouQuan()
    shouQuanJuJue()
    await expect(diYiTiao).resolves.toBe(false)
    expect(xianShi.value).toBe(false)
    const diErTiao = queRenTuPianShouQuan()
    expect(xianShi.value).toBe(true)
    shouQuanQueRen()
    await expect(diErTiao).resolves.toBe(true)
    await expect(diYiTiao).resolves.toBe(false)
  })

  it('组件卸载即结算未决 Promise：答 false、不写开关（结算挂在 composable 自己身上，页面无需各记一遍）', async () => {
    let kaiGuanZhi = false
    const xieZhiJiLu: boolean[] = []
    let men!: ReturnType<typeof use图片授权门>
    const ZuJian = defineComponent({
      setup() {
        men = use图片授权门({
          huoQuYiShouQuan: () => kaiGuanZhi,
          sheZhiYiShouQuan: (yunXu) => {
            kaiGuanZhi = yunXu
            xieZhiJiLu.push(yunXu)
          },
        })
        return () => null
      },
    })
    const jiaZai = mount(ZuJian)
    const diYiTiao = men.queRenTuPianShouQuan()
    const diErTiao = men.queRenTuPianShouQuan()
    expect(men.xianShi.value).toBe(true)
    jiaZai.unmount()
    // 两条都不能永久 pending：单变量实现时代第一条会被第二条覆盖掉，永远等不到答案
    expect(await Promise.all([ceDingZhuangTai(diYiTiao), ceDingZhuangTai(diErTiao)])).toEqual([
      false,
      false,
    ])
    expect(kaiGuanZhi).toBe(false)
    expect(xieZhiJiLu).toEqual([])
  })
})

describe('use表情提交 全库唯一的「本地文件 → 我的表情」写入口', () => {
  function 提交(已授权: boolean, 收集: (xinXi: string) => void) {
    const men = 授权门(已授权)
    return {
      men,
      ...use表情提交({ queRenTuPianShouQuan: men.queRenTuPianShouQuan, sheZhiCuoWu: 收集 }),
    }
  }

  /** 仓库的失败文案取后端 ti_shi，构造一个同形状的拒绝即可，不必真发请求 */
  function 拒绝(提示: string) {
    return { isAxiosError: true, response: { status: 400, data: { cheng_gong: false, ti_shi: 提示 } } }
  }

  let cuoWuA: string[]
  let cuoWuB: string[]

  beforeEach(() => {
    setActivePinia(createPinia())
    使用表情仓库().qingKong()
    添加表情.mockReset()
    添加表情.mockResolvedValue({ xiang: { id: 'b1' }, yiCunZai: false })
    cuoWuA = []
    cuoWuB = []
  })

  it('白名单内的图片才上传：一次判定一次写入，结果按服务端 yi_cun_zai 归一', async () => {
    const { tiJiaoBiaoQingWenJian } = 提交(true, (xinXi) => cuoWuA.push(xinXi))
    await expect(tiJiaoBiaoQingWenJian(图片文件())).resolves.toBe('xinZeng')
    expect(添加表情).toHaveBeenCalledTimes(1)
    expect(添加表情.mock.calls[0][0]).toBeInstanceOf(File)
    expect(添加表情.mock.calls[0][1]).toBe('pet.png')
    expect(cuoWuA).toEqual([])

    添加表情.mockResolvedValueOnce({ xiang: { id: 'b1' }, yiCunZai: true })
    await expect(tiJiaoBiaoQingWenJian(图片文件())).resolves.toBe('yiCunZai')
  })

  it('非白名单/空文件/超限三条预检各自文案且零上传', async () => {
    const { tiJiaoBiaoQingWenJian } = 提交(true, (xinXi) => cuoWuA.push(xinXi))
    const chaoXian = 图片文件('da.png')
    Object.defineProperty(chaoXian, 'size', { value: 11 * 1024 * 1024 })
    const 用例: Array<[File, 'biaoQingMIMEBuZhiChi' | 'biaoQingTuPianWeiKong' | 'biaoQingTuPianGuoDa']> =
      [
        [图片文件('x.svg', 'image/svg+xml'), 'biaoQingMIMEBuZhiChi'],
        [new File([], 'kong.png', { type: 'image/png' }), 'biaoQingTuPianWeiKong'],
        [chaoXian, 'biaoQingTuPianGuoDa'],
      ]
    for (const [wenJian, jian] of 用例) {
      const jieGuo: TianJiaJieGuo = await tiJiaoBiaoQingWenJian(wenJian)
      expect(jieGuo).toBe('buTiShi')
      expect(cuoWuA.at(-1)).toBe(huoQuFanYi('duoMeiTi', jian))
    }
    expect(添加表情).not.toHaveBeenCalled()
  })

  it('未授权一律不外发：走同一个授权门，拒绝时零上传、同意后立即上传', async () => {
    const { men, tiJiaoBiaoQingWenJian } = 提交(false, (xinXi) => cuoWuA.push(xinXi))
    const jieGuo = tiJiaoBiaoQingWenJian(图片文件())
    expect(men.xianShi.value).toBe(true)
    expect(添加表情).not.toHaveBeenCalled()
    men.shouQuanJuJue()
    await expect(jieGuo).resolves.toBe('buTiShi')
    expect(cuoWuA).toEqual([huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi')])
    expect(添加表情).not.toHaveBeenCalled()

    men.shouQuanQueRen()
    await expect(tiJiaoBiaoQingWenJian(图片文件())).resolves.toBe('xinZeng')
    expect(添加表情).toHaveBeenCalledTimes(1)
  })

  it('仓库写入失败：沿用后端文案且回 buTiShi，异常不外溢', async () => {
    const { tiJiaoBiaoQingWenJian } = 提交(true, (xinXi) => cuoWuA.push(xinXi))
    添加表情.mockRejectedValueOnce(拒绝('内容审核未通过'))
    await expect(tiJiaoBiaoQingWenJian(图片文件())).resolves.toBe('buTiShi')
    expect(cuoWuA).toEqual(['内容审核未通过'])
    expect(使用表情仓库().cuoWuXinXi).toBe('内容审核未通过')
  })

  it('两页各注入自己的错误出口：好友页的失败不会串到聊天页的横幅', async () => {
    const jia = 提交(true, (xinXi) => cuoWuA.push(xinXi))
    const hao = 提交(true, (xinXi) => cuoWuB.push(xinXi))
    添加表情.mockRejectedValueOnce(拒绝('甲页提示'))
    await jia.tiJiaoBiaoQingWenJian(图片文件())
    添加表情.mockRejectedValueOnce(拒绝('乙页提示'))
    await hao.tiJiaoBiaoQingWenJian(图片文件())
    expect(cuoWuA).toEqual(['甲页提示'])
    expect(cuoWuB).toEqual(['乙页提示'])
  })
})

describe('use表情提示条 两页共用的状态条', () => {
  it('到点自动消失；yinXia 立即收回并清掉待触发定时器', () => {
    vi.useFakeTimers()
    try {
      const { tiShi, xianShi, yinXia } = use表情提示条()
      xianShi('已添加')
      expect(tiShi.value).toBe('已添加')
      vi.advanceTimersByTime(BIAO_QING_QU_TU_PEI_ZHI.tiShiXiaoShiHaoMiao)
      expect(tiShi.value).toBeNull()

      xianShi('已在库')
      yinXia()
      expect(tiShi.value).toBeNull()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('连续两次显示只保留最后一条，且第一条到点不会把新的抹掉', () => {
    vi.useFakeTimers()
    try {
      const { tiShi, xianShi } = use表情提示条()
      xianShi(huoQuFanYi('duoMeiTi', 'biaoQingYiTianJia'))
      vi.advanceTimersByTime(1000)
      xianShi(huoQuFanYi('duoMeiTi', 'biaoQingYiZaiKu'))
      vi.advanceTimersByTime(1000)
      expect(tiShi.value).toBe(huoQuFanYi('duoMeiTi', 'biaoQingYiZaiKu'))
      vi.advanceTimersByTime(BIAO_QING_QU_TU_PEI_ZHI.tiShiXiaoShiHaoMiao - 1000)
      expect(tiShi.value).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('成功与「已在库」是两句不同文案（两页共用同一口径）', () => {
    const chengGong = huoQuFanYi('duoMeiTi', 'biaoQingYiTianJia')
    const zaiKu = huoQuFanYi('duoMeiTi', 'biaoQingYiZaiKu')
    expect(chengGong).not.toBe(zaiKu)
    expect(chengGong.trim()).not.toBe('')
    expect(zaiKu.trim()).not.toBe('')
  })
})

describe('授权门与表情写入口单一真源（源码扫描）', () => {
  const 前端根 = resolve(__dirname, '..')
  const 仓库根 = resolve(__dirname, '../..')

  // 扫描按原始源码匹配：模板里的 `accept="image/..."` 那类写法会让「先剥块注释再匹配」的口径
  // 从那里一路吞到下一个块注释结尾，把派发点误判成不存在（本组断言全是标识符级，不需要剥注释）
  function 命中(模式: RegExp): string[] {
    return readdirSync(前端根, { recursive: true })
      .map((项) => String(项).replace(/\\/g, '/'))
      .filter((路) => /\.(vue|ts)$/.test(路) && !路.startsWith('__tests__/'))
      .filter((路) => 模式.test(readFileSync(resolve(前端根, 路), 'utf-8')))
      .map((路) => relative(仓库根, resolve(前端根, 路)).replace(/\\/g, '/'))
      .sort()
  }

  function 页面(名: string): string {
    return readFileSync(resolve(前端根, 'views', 名), 'utf-8')
  }

  it('queRenTuPianShouQuan 全库只有一处实现，两个聊天页都只是消费方', () => {
    expect(命中(/function queRenTuPianShouQuan/)).toEqual(['src/composables/use图片授权门.ts'])
    expect(命中(/use图片授权门/)).toEqual([
      'src/composables/use图片授权门.ts',
      'src/views/好友聊天.vue',
      'src/views/聊天页面.vue',
    ])
    // 两份被删的本地实现不得以另一种形态回来（页内单变量 resolver / 页内私有队列）
    expect(命中(/shouQuanDaiQueRenHuiDiao|let shouQuanDengDaiZhe/)).toEqual([])
    for (const 名 of ['聊天页面.vue', '好友聊天.vue']) {
      const 源 = 页面(名)
      expect(源).toContain('queRenTuPianShouQuan')
      expect(源).toContain('@que-ren="shouQuanQueRen"')
      expect(源).toContain('@ju-jue="shouQuanJuJue"')
      expect(源).toContain(':xian-shi="shouQuanDanChuangXianShi"')
    }
  })

  it('表情写入口与状态条各只有一处实现，页面里不再留第二份', () => {
    expect(命中(/function tiJiaoBiaoQingWenJian/)).toEqual(['src/composables/use表情提交.ts'])
    expect(命中(/BIAO_QING_QU_TU_PEI_ZHI\.tiShiXiaoShiHaoMiao/)).toEqual([
      'src/composables/use表情提示条.ts',
    ])
    expect(命中(/function xianShiBiaoQingTiShi|function tingZhiBiaoQingTiShi/)).toEqual([])
    for (const 名 of ['聊天页面.vue', '好友聊天.vue']) {
      expect(页面(名)).not.toContain('tiShiXiaoShiHaoMiao')
      expect(页面(名)).not.toContain('panDingTuPianJuJue(')
    }
  })

  it('图片菜单派发点两页各一处、判定仍只有一份；菜单与状态条样式只有一处真源', () => {
    expect(命中(/daKaiTuPianCaiDan\(/)).toEqual([
      'src/composables/use长按菜单.ts',
      'src/views/好友聊天.vue',
      'src/views/聊天页面.vue',
    ])
    const 样式源 = readFileSync(resolve(前端根, 'styles/liao-tian-qi-pao.css'), 'utf-8')
    for (const 类名 of [
      '.chehui-zhezhao',
      '.chehui-caidan',
      '.chehui-xiangmu',
      '.shuru-fu-zhu',
      '.biaoqing-tishi',
    ]) {
      expect(样式源).toContain(类名)
      expect(页面('聊天页面.vue')).not.toContain(`${类名} {`)
      expect(页面('好友聊天.vue')).not.toContain(`${类名} {`)
    }
    expect(readFileSync(resolve(前端根, 'main.ts'), 'utf-8')).toContain(
      "import './styles/liao-tian-qi-pao.css'",
    )
  })
})
