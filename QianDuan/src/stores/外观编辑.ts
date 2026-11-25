import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { BeiJingXiangMu } from '@/stores/用户设置'

export interface 背景编辑目标 {
  区: 'beiJing'
  键: string
  模式: 'qian' | 'shen'
  项: BeiJingXiangMu
}

export interface 气泡编辑目标 {
  区: 'qiPao'
  键: string
  类型: 'yuShe' | 'ziDingYi'
  标识: string
  名称: string
  文字颜色: string
}

export type 外观编辑目标 = 背景编辑目标 | 气泡编辑目标

export interface 外观编辑预览 {
  mingCheng: string
  wenZiYanSe: string
}

export const 使用外观编辑仓库 = defineStore('外观编辑', () => {
  const 当前目标 = shallowRef<外观编辑目标 | null>(null)
  const 预览值 = shallowRef<外观编辑预览 | null>(null)
  const 错误文案 = ref('')
  const 保存中 = ref(false)
  const 聚焦序号 = ref(0)

  function 清空(): void {
    当前目标.value = null
    预览值.value = null
    错误文案.value = ''
  }

  function 是当前(muBiao: 外观编辑目标): boolean {
    return 当前目标.value?.区 === muBiao.区 && 当前目标.value?.键 === muBiao.键
  }

  function 打开(muBiao: 外观编辑目标): void {
    if (是当前(muBiao)) {
      聚焦序号.value += 1
      return
    }
    当前目标.value = muBiao
    预览值.value = null
    错误文案.value = ''
  }

  function 关闭(muBiao: 外观编辑目标): void {
    if (!是当前(muBiao)) return
    清空()
  }

  function 更新预览(zhi: 外观编辑预览): void {
    预览值.value = zhi
  }

  function 记下错误(wenAn: string): void {
    错误文案.value = wenAn
  }

  return { 当前目标, 预览值, 错误文案, 保存中, 聚焦序号, 打开, 关闭, 清空, 是当前, 更新预览, 记下错误 }
})
