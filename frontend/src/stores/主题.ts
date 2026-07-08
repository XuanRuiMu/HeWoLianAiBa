import { defineStore } from 'pinia'
import { ref } from 'vue'

export type 主题模式 = '浅色' | '暗色'
export const 主题键 = '主题'
export const 浅色值: 主题模式 = '浅色'
export const 暗色值: 主题模式 = '暗色'

function huoQuDataTheme(moShi: 主题模式): 'dark' | 'light' {
  return moShi === 浅色值 ? 'light' : 'dark'
}

function huoQuChuCunZhi(): 主题模式 {
  if (typeof window === 'undefined') return 暗色值
  const cunChuZhi = localStorage.getItem(主题键) as 主题模式 | null
  return cunChuZhi === 浅色值 ? 浅色值 : 暗色值
}

export const 使用主题仓库 = defineStore('主题', () => {
  const dangQianZhuti = ref<主题模式>(huoQuChuCunZhi())

  function qieHuanZhuti(moShi: 主题模式) {
    dangQianZhuti.value = moShi
    localStorage.setItem(主题键, moShi)
    document.documentElement.setAttribute('data-theme', huoQuDataTheme(moShi))
  }

  function chuShiHua() {
    qieHuanZhuti(dangQianZhuti.value)
  }

  return {
    dangQianZhuti,
    qieHuanZhuti,
    chuShiHua,
  }
})
