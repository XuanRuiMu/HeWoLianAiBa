import { ref, watch, type Ref } from 'vue'

/**
 * FP-10c 第⑤刀真机暴露缺陷 #1 的修法本体：输入区「展开档」的**唯一判定真源**。
 *
 * 为什么会再长出这一个 composable（而不是把判定留在页面里）：
 * FP-10c 把 `use输入框.ts` 的 JS 量高链删成纯 CSS 两档（折叠吃 --shuru-danxing-gao-du、
 * 展开吃 --shuru-zhan-kai-gao-du）时，连带删掉了「内容变化 ⇒ 重新判定还需不需要展开档」
 * 那一条**复位触发源**。于是这个布尔量只剩「点按钮翻转」一条置位路径 + 发送/清面板两条复位路径，
 * 用户把输入区撑开后再删内容，展开态再也不退回收（真机取证：
 * FP-10c5 现场取证：暗/浅两档 × 两视口全复现。
 *
 * 复位判定用的是**内容结构**，不是像素高度：
 * `danHangDang()` ＝ 文字流里没有硬换行且没有图片/贴纸块。图片块 64px 高、比单行档（35px）高，
 * 所以块在一天，展开档就不许摘；硬换行在一天，内容就还在多行档。
 * 这里既不量元素高度、也不往元素上写内联高度样式 —— 那套量高链已被
 * __tests__/FP10c真内联输入区.test.ts:164 以「符号复活 = 第二套量高真源」钉死，不得走回来。
 *
 * 置位路径两条（FP-10c-⑥ 起）：
 *  ① 用户点击 .zhan-kai-anniu（纯文字多行溢出只走这一条 —— FP-05「折叠态溢出不得擅自自动展开」
 *     仍由 FP-05 相关契约把守）；
 *  ② 待发图文块出现 ⇒ 自动置位（块 64px > 折叠档 35px，不展就把图裁掉；用户删掉块且内容
 *     回到单行档 ⇒ 自动复位回落）。
 * 像素量高链依旧禁止（读滚动/裁剪尺寸再写内联高度那套被 FP10c真内联输入区 钉死）。
 */

interface Use输入区展开档依赖 {
  /** 输入区文字投影（页面真源 `shuRuNeiRong`） */
  shuRuNeiRong: Ref<string>
  /** 待发序列里有没有图片/贴纸块（use待发图文 的 `youTuPianKuai`） */
  youTuPianKuai: Ref<boolean>
}

export function use输入区展开档(yiLai: Use输入区展开档依赖) {
  const shuRuKuangZhanKai = ref(false)

  /** 单行档内容：既没有硬换行、也没有比一行高的图文块 ⇒ 展开档已经没必要 */
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
