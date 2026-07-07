import { defineStore } from 'pinia'
import { ref } from 'vue'

export type 主题模式 = '浅色' | '深色'

export const 使用主题仓库 = defineStore('主题', () => {
  const dangQianZhuti = ref<主题模式>((localStorage.getItem('zhuti') as 主题模式) || '深色')

  function qieHuanZhuti(moShi: 主题模式) {
    dangQianZhuti.value = moShi
    localStorage.setItem('zhuti', moShi)
    if (moShi === '深色') {
      document.documentElement.classList.add('深色')
      document.documentElement.classList.remove('浅色')
      document.documentElement.setAttribute('data-theme', '深色')
    } else {
      document.documentElement.classList.add('浅色')
      document.documentElement.classList.remove('深色')
      document.documentElement.setAttribute('data-theme', '浅色')
    }
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
