export type SanWeiMoKuai = typeof import('three')
export type GLTFJiaZaiQiLeiXing = import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader

declare global {
  interface Window {
    THREE?: SanWeiMoKuai
    GLTFLoader?: new (...canShu: Array<unknown>) => GLTFJiaZaiQiLeiXing
  }
}

export type GLTFJiaZaiQiGouZao = NonNullable<Window['GLTFLoader']>

export interface SanWeiJiuXu {
  THREE: SanWeiMoKuai
  GLTFLoader: GLTFJiaZaiQiGouZao | null
}

let jiuXuJiaZai: Promise<SanWeiJiuXu | null> | null = null

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
          jiaZaiQi = null
        }
      }
      return { THREE: moKuai, GLTFLoader: jiaZaiQi }
    })().then((jieGuo) => {
      if (!jieGuo) jiuXuJiaZai = null
      return jieGuo
    })
  }
  return jiuXuJiaZai
}
