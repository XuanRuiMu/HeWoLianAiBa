import { ref, watch, type Ref } from 'vue'


interface Use输入区展开档依赖 {
  shuRuNeiRong: Ref<string>
  youTuPianKuai: Ref<boolean>
}

export function use输入区展开档(yiLai: Use输入区展开档依赖) {
  const shuRuKuangZhanKai = ref(false)

  function danHangDang(): boolean {
    return !yiLai.shuRuNeiRong.value.includes('\n') && !yiLai.youTuPianKuai.value
  }

  watch([yiLai.shuRuNeiRong, yiLai.youTuPianKuai], () => {
    if (yiLai.youTuPianKuai.value) {
      shuRuKuangZhanKai.value = true
      return
    }
    if (shuRuKuangZhanKai.value && danHangDang()) shuRuKuangZhanKai.value = false
  })

  function qieHuanZhanKaiDang(): void {
    shuRuKuangZhanKai.value = !shuRuKuangZhanKai.value
  }

  function shouQiZhanKaiDang(): void {
    shuRuKuangZhanKai.value = false
  }

  return {
    shuRuKuangZhanKai,
    danHangDang,
    qieHuanZhanKaiDang,
    shouQiZhanKaiDang,
  }
}
