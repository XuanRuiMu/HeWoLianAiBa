import { computed, nextTick, ref, watch, type Ref } from 'vue'

interface Use输入框依赖 {
  shuruKuangRef: Ref<HTMLTextAreaElement | null>
  shuRuNeiRong: Ref<string>
}

export function use输入框(yiLai: Use输入框依赖) {
  const shuRuKuangZhanKai = ref(false)
  const neiRongGaoDu = ref(0)
  const danXingGaoDu = ref(32)
  const shiKouGaoDu = ref(typeof window !== 'undefined' ? window.innerHeight : 0)
  const shuRuKuangKeZhanKai = computed(() => neiRongGaoDu.value > danXingGaoDu.value + 1)

  // 展开态必须始终保留收起出口：只按「内容是否超过单行」禁用按钮会让状态机变成只进不出
  const zhanKaiAnNiuKeYong = computed(() => shuRuKuangZhanKai.value || shuRuKuangKeZhanKai.value)

  function jiSuanDanXingGaoDu(el: HTMLTextAreaElement): number {
    const cs = getComputedStyle(el)
    // jsdom无布局时lineHeight常为normal/空，此时有限用clientHeight兜底，禁NaN误算55px
    const lineHeight = parseFloat(cs.lineHeight)
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
      return el.clientHeight || 0
    }
    const fontSize = parseFloat(cs.fontSize)
    const xingGao = Number.isFinite(fontSize) && fontSize > 0 ? Math.max(lineHeight, fontSize * 1.4) : lineHeight
    const padShang = parseFloat(cs.paddingTop) || 0
    const padXia = parseFloat(cs.paddingBottom) || 0
    const bianKuang = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0)
    const jiSuanZhi = xingGao + padShang + padXia + bianKuang
    // 折叠态精确单行高度：行高 + 上下内边距 + 上下边框，使占位符"输入消息..."完美契合单行
    // 无布局环境（jsdom 等）下 getComputedStyle 不可靠，降级为 clientHeight（单元测试已 mock）
    if (!Number.isFinite(jiSuanZhi) || jiSuanZhi <= 0) {
      return el.clientHeight || 0
    }
    return Math.ceil(jiSuanZhi)
  }

  const shuRuKuangYangShi = computed(() => {
    if (shuRuKuangZhanKai.value) {
      const zhanKaiShangXian = Math.round(shiKouGaoDu.value * 0.5)
      const muBiaoGaoDu = Math.min(neiRongGaoDu.value, zhanKaiShangXian)
      return {
        height: `${muBiaoGaoDu}px`,
        maxHeight: `${zhanKaiShangXian}px`,
      }
    }
    return {
      maxHeight: `${danXingGaoDu.value}px`,
    }
  })

  function ceLiangShuRuKuang() {
    const el = yiLai.shuruKuangRef.value
    if (!el) return
    // 测量前临时将高度置为 auto，读取自然内容高度，使「加字增高、删字缩行」均成立；
    // 读取后立即还原，最终应用高度仍完全由 computed :style 派生，此处绝不写最终高度
    const yuanShiGaoDu = el.style.height
    el.style.height = 'auto'
    neiRongGaoDu.value = el.scrollHeight
    el.style.height = yuanShiGaoDu
    danXingGaoDu.value = jiSuanDanXingGaoDu(el)
  }

  function qieHuanShuRuKuangZhanKai() {
    shuRuKuangZhanKai.value = !shuRuKuangZhanKai.value
    ceLiangShuRuKuang()
    nextTick(() => {
      yiLai.shuruKuangRef.value?.focus()
    })
  }

  // 视口尺寸变化（如软键盘收起、旋转）时同步视口高度并重测内容；折叠态重测为精确单行，展开态重测 50vh 封顶
  function chongSuanShuRuKuangGaoDu() {
    shiKouGaoDu.value = typeof window !== 'undefined' ? window.innerHeight : 0
    ceLiangShuRuKuang()
  }

  watch(() => yiLai.shuRuNeiRong.value, ceLiangShuRuKuang, { flush: 'post' })

  // 内容高度回落到单行后展开态已失去依据，必须自动退出，否则展开态只能靠发送/离开页面才能解除。
  // neiRongGaoDu 由 height:auto 实测得到，与展开态无关；展开态仅改变滚动条样式且此时不溢出，
  // 故该判据不会被自身状态反馈影响，配合 danXingGaoDu + 1 的 1px 容差不会在临界高度横跳
  watch(shuRuKuangKeZhanKai, (keZhanKai) => {
    if (!keZhanKai) shuRuKuangZhanKai.value = false
  })

  return {
    shuRuKuangZhanKai,
    shuRuKuangKeZhanKai,
    zhanKaiAnNiuKeYong,
    shuRuKuangYangShi,
    ceLiangShuRuKuang,
    qieHuanShuRuKuangZhanKai,
    chongSuanShuRuKuangGaoDu,
  }
}
