import { computed, toValue, type CSSProperties, type MaybeRefOrGetter } from 'vue'
import { 解析性别框体边框档, 解析性别框体填充档, type 性别二档 } from '@/utils/性别'

const 填充色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-xuan-beijing)',
  nv: 'var(--xingbie-nv-xuan-beijing)',
}

const 边框色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-xuan-biankuang)',
  nv: 'var(--xingbie-nv-xuan-biankuang)',
}

const 文字色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-xuan-wenben)',
  nv: 'var(--xingbie-nv-xuan-wenben)',
}

const 环色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-xuan-huan)',
  nv: 'var(--xingbie-nv-xuan-huan)',
}

const 光晕色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-xuan-guangyun)',
  nv: 'var(--xingbie-nv-xuan-guangyun)',
}

export interface 性别框体配色输入 {
  自身性别: MaybeRefOrGetter<unknown>
  对象性别: MaybeRefOrGetter<unknown>
  默认性别: MaybeRefOrGetter<unknown>
}

export function 使用性别框体配色(输入: 性别框体配色输入) {
  const 填充档 = computed<性别二档>(() =>
    解析性别框体填充档(toValue(输入.自身性别), toValue(输入.默认性别), toValue(输入.对象性别)),
  )
  const 边框档 = computed<性别二档>(() =>
    解析性别框体边框档(toValue(输入.对象性别), toValue(输入.默认性别)),
  )
  const 样式 = computed<CSSProperties>(() => ({
    backgroundColor: 填充色[填充档.value],
    borderColor: 边框色[边框档.value],
    color: 文字色[填充档.value],
    boxShadow: `0 0 0 3px ${环色[边框档.value]}, 0 10px 26px ${光晕色[边框档.value]}`,
  }))
  return { 填充档, 边框档, 样式 }
}
