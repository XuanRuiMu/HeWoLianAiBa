import { defineStore } from 'pinia'
import { ref } from 'vue'

export type 主题模式 = '浅色' | '暗色'
export const 主题键 = '主题'
export const 浅色值: 主题模式 = '浅色'
export const 暗色值: 主题模式 = '暗色'

function huoQuDataTheme(moShi: 主题模式): 'dark' | 'light' {
  return moShi === 浅色值 ? 'light' : 'dark'
}

function huoQuMoShi(zhi: string | null): 主题模式 {
  return zhi === 浅色值 ? 浅色值 : 暗色值
}

function huoQuChuCunZhi(): 主题模式 {
  if (typeof window === 'undefined') return 暗色值
  return huoQuMoShi(localStorage.getItem(主题键))
}

function yingYongZhuTi(moShi: 主题模式) {
  document.documentElement.setAttribute('data-theme', huoQuDataTheme(moShi))
}

export const 使用主题仓库 = defineStore('主题', () => {
  const dangQianZhuti = ref<主题模式>(huoQuChuCunZhi())

  function qieHuanZhuti(moShi: 主题模式) {
    dangQianZhuti.value = moShi
    localStorage.setItem(主题键, moShi)
    yingYongZhuTi(moShi)
  }

  function chuShiHua() {
    yingYongZhuTi(dangQianZhuti.value)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (shiJian) => {
        if (shiJian.key !== 主题键) return
        const xin = huoQuMoShi(shiJian.newValue)
        if (xin === dangQianZhuti.value) return
        dangQianZhuti.value = xin
        yingYongZhuTi(xin)
      })
    }
  }

  return {
    dangQianZhuti,
    qieHuanZhuti,
    chuShiHua,
  }
})
