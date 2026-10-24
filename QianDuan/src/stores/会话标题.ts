import { defineStore } from 'pinia'
import { ref } from 'vue'

export const 使用会话标题仓库 = defineStore('会话标题', () => {
  const biaoTi = ref('')

  function sheZhi(mingCheng: string): void {
    biaoTi.value = mingCheng
  }

  function qingKong(): void {
    biaoTi.value = ''
  }

  return { biaoTi, sheZhi, qingKong }
})
