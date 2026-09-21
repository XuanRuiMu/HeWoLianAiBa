import { describe, it, expect, beforeEach, vi } from 'vitest'

// three / GLTFLoader 子块导入逐例编排（vi.doMock + resetModules）：
// 成功、挂起、失败三态都要能压出来，才能真正验证 yuJiaZaiSanWei 的
// 「可靠返回可用模块 + 并发共享同一次导入 + 失败可重试」语义。
type SanWeiMoKuai = typeof import('three')
type GLTFJiaZaiQiGouZao = NonNullable<Window['GLTFLoader']>
type YuJiaZai = (typeof import('@/utils/sanWei'))['yuJiaZaiSanWei']

const SAN_WEI_LU_JING = 'three'
const JIA_ZAI_QI_LU_JING = 'three/examples/jsm/loaders/GLTFLoader.js'

function moSanWeiZhi(zhi: SanWeiMoKuai) {
  vi.doMock(SAN_WEI_LU_JING, () => zhi)
}

function moJiaZaiQiZhi(zhi: { GLTFLoader: GLTFJiaZaiQiGouZao }) {
  vi.doMock(JIA_ZAI_QI_LU_JING, () => zhi)
}

async function yinRuGongJu(): Promise<YuJiaZai> {
  const moKuai = await import('@/utils/sanWei')
  return moKuai.yuJiaZaiSanWei
}

describe('父帧三维库预热 yuJiaZaiSanWei', () => {
  beforeEach(() => {
    vi.resetModules()
    delete window.THREE
    delete window.GLTFLoader
  })

  it('成功预热时同时把 THREE 与 GLTFLoader 挂到 window 并返回两者', async () => {
    moSanWeiZhi({ danYuan: 'three-mock' } as unknown as SanWeiMoKuai)
    moJiaZaiQiZhi({ GLTFLoader: function GLTFLoaderMock() {} } as unknown as {
      GLTFLoader: GLTFJiaZaiQiGouZao
    })

    const yuJiaZai = await yinRuGongJu()
    const jieGuo = await yuJiaZai()

    expect(jieGuo).not.toBeNull()
    expect(window.THREE).toBeTruthy()
    expect(jieGuo?.THREE).toBe(window.THREE)
    expect(typeof window.GLTFLoader).toBe('function')
    expect(jieGuo?.GLTFLoader).toBe(window.GLTFLoader)
  })

  it('并发调用共用同一次导入流程，不重复拉取三维块', async () => {
    let jieSuan!: (zhi: unknown) => void
    const chongFeng = new Promise((resolve) => {
      jieSuan = resolve
    })
    vi.doMock(SAN_WEI_LU_JING, () => chongFeng as unknown as SanWeiMoKuai)
    moJiaZaiQiZhi({ GLTFLoader: function GLTFLoaderMock() {} } as unknown as {
      GLTFLoader: GLTFJiaZaiQiGouZao
    })

    const yuJiaZai = await yinRuGongJu()
    const diYi = yuJiaZai()
    const diEr = yuJiaZai()
    // 同一 Promise 实例：并发第二个调用不再另起一次导入
    expect(diYi).toBe(diEr)
    expect(window.THREE).toBeUndefined()

    jieSuan({ danYuan: 'three-mock' })
    const [a, b] = await Promise.all([diYi, diEr])

    expect(a).toBe(b)
    expect(a?.THREE).toBeTruthy()
    expect(a?.GLTFLoader).toBeTruthy()
    expect(window.THREE).toBe(a?.THREE)
  })

  it('预热成功后再次调用直接复用同一结果，不重复走导入流程', async () => {
    let ciShu = 0
    vi.doMock(SAN_WEI_LU_JING, () => {
      ciShu += 1
      return { danYuan: 'three-mock' } as unknown as SanWeiMoKuai
    })
    moJiaZaiQiZhi({ GLTFLoader: function GLTFLoaderMock() {} } as unknown as {
      GLTFLoader: GLTFJiaZaiQiGouZao
    })

    const yuJiaZai = await yinRuGongJu()
    const diYi = await yuJiaZai()
    const diEr = await yuJiaZai()
    const diSan = await yuJiaZai()

    expect(ciShu).toBe(1)
    expect(diYi).toBe(diEr)
    expect(diEr).toBe(diSan)
  })

  it('GLTFLoader 子导入失败时保留已就位的三维库，不连它一起作废', async () => {
    moSanWeiZhi({ danYuan: 'three-mock' } as unknown as SanWeiMoKuai)
    vi.doMock(JIA_ZAI_QI_LU_JING, () => Promise.reject(new Error('zi-kuai-shi-bai')))

    const yuJiaZai = await yinRuGongJu()
    const jieGuo = await yuJiaZai()

    expect(jieGuo).not.toBeNull()
    expect(jieGuo?.THREE).toBeTruthy()
    expect(window.THREE).toBe(jieGuo?.THREE)
    expect(jieGuo?.GLTFLoader).toBeNull()
    expect(window.GLTFLoader).toBeUndefined()
  })

  it('三维库本体导入失败返回 null，且释放缓存让下次调用可重试', async () => {
    moJiaZaiQiZhi({ GLTFLoader: function GLTFLoaderMock() {} } as unknown as {
      GLTFLoader: GLTFJiaZaiQiGouZao
    })
    let yiShiBai = true
    vi.doMock(SAN_WEI_LU_JING, () => {
      if (yiShiBai) {
        yiShiBai = false
        return Promise.reject(new Error('mo-kuai-404'))
      }
      return { danYuan: 'three-mock' } as unknown as SanWeiMoKuai
    })

    const yuJiaZai = await yinRuGongJu()
    expect(await yuJiaZai()).toBeNull()

    const chongShi = await yuJiaZai()
    expect(chongShi).not.toBeNull()
    expect(chongShi?.THREE).toBeTruthy()
    expect(window.THREE).toBeTruthy()
  })

  it('window 已具备三维库时直接复用，不再拉取三维块与加载器', async () => {
    const yiYouSanWei = { yiYou: true } as unknown as SanWeiMoKuai
    const yiYouJiaZaiQi = function YiYouJiaZaiQi() {} as unknown as GLTFJiaZaiQiGouZao
    window.THREE = yiYouSanWei
    window.GLTFLoader = yiYouJiaZaiQi
    vi.doMock(SAN_WEI_LU_JING, () => {
      throw new Error('bu-ying-zai-dao-ru')
    })
    vi.doMock(JIA_ZAI_QI_LU_JING, () => {
      throw new Error('bu-ying-zai-dao-ru')
    })

    const yuJiaZai = await yinRuGongJu()
    const jieGuo = await yuJiaZai()

    expect(jieGuo?.THREE).toBe(yiYouSanWei)
    expect(jieGuo?.GLTFLoader).toBe(yiYouJiaZaiQi)
  })
})
