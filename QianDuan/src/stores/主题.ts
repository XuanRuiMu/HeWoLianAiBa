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

// YH-088 多标签同步：主题变更广播，他标签页同主题
// YH-080 内联脚本键对齐：内联读lian-ai-ba-zhu-ti，此处双写兼容
function guangBoZhuTi(moShi: 主题模式) {
  try {
    localStorage.setItem('lian-ai-ba-zhu-ti', moShi === 浅色值 ? 'light' : 'an-se')
  } catch {
    // 忽略
  }
}

export const 使用主题仓库 = defineStore('主题', () => {
  const dangQianZhuti = ref<主题模式>(huoQuChuCunZhi())

  function qieHuanZhuti(moShi: 主题模式) {
    dangQianZhuti.value = moShi
    localStorage.setItem(主题键, moShi)
    document.documentElement.setAttribute('data-theme', huoQuDataTheme(moShi))
    guangBoZhuTi(moShi)
  }

  function chuShiHua() {
    qieHuanZhuti(dangQianZhuti.value)
    // YH-088 监听他页主题/登出广播
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (shiJian) => {
        if (shiJian.key === 'lian-ai-ba-zhu-ti' && shiJian.newValue) {
          const xin = shiJian.newValue === 'light' ? 浅色值 : 暗色值
          if (xin !== dangQianZhuti.value) {
            dangQianZhuti.value = xin
            document.documentElement.setAttribute('data-theme', huoQuDataTheme(xin))
          }
        }
      })
    }
  }

  return {
    dangQianZhuti,
    qieHuanZhuti,
    chuShiHua,
  }
})
