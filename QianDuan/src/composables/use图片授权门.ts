import { getCurrentInstance, onBeforeUnmount, ref, type Ref } from 'vue'

interface Use图片授权门依赖 {
  huoQuYiShouQuan: () => boolean
  sheZhiYiShouQuan: (yunXu: boolean) => void
}

interface Use图片授权门返回值 {
  xianShi: Ref<boolean>
  queRenTuPianShouQuan: () => Promise<boolean>
  shouQuanQueRen: () => void
  shouQuanJuJue: () => void
}

export function use图片授权门(yiLai: Use图片授权门依赖): Use图片授权门返回值 {
  const xianShi = ref(false)
  let dengDaiZhe: Array<(yunXu: boolean) => void> = []

  function jieSuanDengDaiZhe(yunXu: boolean): void {
    const dangQian = dengDaiZhe
    dengDaiZhe = []
    for (const jieJue of dangQian) jieJue(yunXu)
  }

  function queRenTuPianShouQuan(): Promise<boolean> {
    if (yiLai.huoQuYiShouQuan()) return Promise.resolve(true)
    return new Promise((jieJue) => {
      dengDaiZhe.push(jieJue)
      xianShi.value = true
    })
  }

  function shouQuanQueRen(): void {
    yiLai.sheZhiYiShouQuan(true)
    xianShi.value = false
    jieSuanDengDaiZhe(true)
  }

  function shouQuanJuJue(): void {
    xianShi.value = false
    jieSuanDengDaiZhe(false)
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      xianShi.value = false
      jieSuanDengDaiZhe(false)
    })
  }

  return { xianShi, queRenTuPianShouQuan, shouQuanQueRen, shouQuanJuJue }
}
