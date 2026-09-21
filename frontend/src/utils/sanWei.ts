export type SanWeiMoKuai = typeof import('three')
export type GLTFJiaZaiQiLeiXing = import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader

declare global {
  interface Window {
    THREE?: SanWeiMoKuai
    GLTFLoader?: new (...canShu: Array<unknown>) => GLTFJiaZaiQiLeiXing
  }
}

export type GLTFJiaZaiQiGouZao = NonNullable<Window['GLTFLoader']>

// 预热结果：三维库本体必然可用，GLTFLoader 子导入失败时仅为 null（不连累三维库）
export interface SanWeiJiuXu {
  THREE: SanWeiMoKuai
  GLTFLoader: GLTFJiaZaiQiGouZao | null
}

let jiuXuJiaZai: Promise<SanWeiJiuXu | null> | null = null

// 父帧三维库预热：把 three / GLTFLoader 挂到 window 上供草地背景 iframe 复用（避免多实例）。
// 返回的 Promise 在两个模块都「有结论」后才落地，调用方据此确定性地决定何时挂载 iframe；
// 硬失败（三维库本体取不到）返回 null。
export function yuJiaZaiSanWei(): Promise<SanWeiJiuXu | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!jiuXuJiaZai) {
    jiuXuJiaZai = (async (): Promise<SanWeiJiuXu | null> => {
      let moKuai: SanWeiMoKuai
      try {
        moKuai = window.THREE ?? (await import('three'))
      } catch {
        return null
      }
      if (!window.THREE) window.THREE = moKuai
      let jiaZaiQi: GLTFJiaZaiQiGouZao | null = window.GLTFLoader ?? null
      if (!jiaZaiQi) {
        try {
          const jiaZaiQiMoKuai = await import('three/examples/jsm/loaders/GLTFLoader.js')
          jiaZaiQi = jiaZaiQiMoKuai.GLTFLoader as unknown as GLTFJiaZaiQiGouZao
          if (!window.GLTFLoader) window.GLTFLoader = jiaZaiQi
        } catch {
          // GLTFLoader 子导入失败只丢加载器本身：三维库已就位且照常可用，结果如实上报为
          // {THREE, GLTFLoader: null}，由 iframe 侧按「缺加载器」降级为静态兜底图，
          // 不再出现「预热成功但加载器缺失」这种调用方无从判断的中间态
          jiaZaiQi = null
        }
      }
      return { THREE: moKuai, GLTFLoader: jiaZaiQi }
    })().then((jieGuo) => {
      // 成功结果永久缓存：并发与后续调用共用同一次导入流程，不再重复走导入；
      // 仅三维库本体硬失败时释放，留给下一次调用重试的机会
      if (!jieGuo) jiuXuJiaZai = null
      return jieGuo
    })
  }
  return jiuXuJiaZai
}
