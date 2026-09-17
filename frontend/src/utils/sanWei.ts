export type SanWeiMoKuai = typeof import('three')
export type GLTFJiaZaiQiLeiXing = import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader

declare global {
  interface Window {
    THREE?: SanWeiMoKuai
    GLTFLoader?: new (...canShu: Array<unknown>) => GLTFJiaZaiQiLeiXing
  }
}

let sanWeiJiaZaiZhong: Promise<SanWeiMoKuai | null> | null = null

export function yuJiaZaiSanWei(): Promise<SanWeiMoKuai | null> {
  if (typeof window !== 'undefined' && window.THREE) return Promise.resolve(window.THREE)
  if (!sanWeiJiaZaiZhong) {
    sanWeiJiaZaiZhong = (async () => {
      try {
        const moKuai = await import('three')
        if (typeof window !== 'undefined' && !window.THREE) window.THREE = moKuai
        try {
          const jiaZaiQiMoKuai = await import('three/examples/jsm/loaders/GLTFLoader.js')
          if (typeof window !== 'undefined' && !window.GLTFLoader)
            window.GLTFLoader = jiaZaiQiMoKuai.GLTFLoader as unknown as NonNullable<
              Window['GLTFLoader']
            >
        } catch {
          return moKuai
        }
        return moKuai
      } catch {
        return null
      } finally {
        sanWeiJiaZaiZhong = null
      }
    })()
  }
  return sanWeiJiaZaiZhong
}
