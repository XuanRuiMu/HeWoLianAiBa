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

/**
 * C4 首次多媒体授权门（L-23 的唯一实现）：未开启图片理解授权时弹窗征得同意，把答案回给每个调用方。
 *
 * 待确认的 resolver 用队列承载。弹窗未关时的第二次触发（相册连点、Ctrl+V 连贴）若共用单个变量，
 * 前一条的 Promise 永不 settle ⇒ 图片被静默丢弃且无报错；队列让一次结算把全部等待者一起答掉。
 * 授权开关本身仍是 stores/用户 的 tuPianShouQuan 单一真源，由调用方注入读写，此处不复制状态。
 */
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

  // 卸载即结算：弹窗随页面消失，再没有人能答这些等待者。收在 composable 里而不是让每个页面
  // 自己在 onBeforeUnmount 补一句——漏一个页面就复现一次「Promise 永不 settle、图片静默丢弃」。
  // getCurrentInstance 守卫让纯函数式调用（单测直接调本 composable）不触发 Vue 生命周期告警。
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      xianShi.value = false
      jieSuanDengDaiZhe(false)
    })
  }

  return { xianShi, queRenTuPianShouQuan, shouQuanQueRen, shouQuanJuJue }
}
