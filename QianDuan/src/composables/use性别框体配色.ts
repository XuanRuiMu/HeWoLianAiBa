import { computed, toValue, type CSSProperties, type MaybeRefOrGetter } from 'vue'
import { 解析性别框体色档, type 性别二档 } from '@/utils/性别'

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

const 淡填充色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-tan-beijing)',
  nv: 'var(--xingbie-nv-tan-beijing)',
}

const 深边框色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-shen-biankuang)',
  nv: 'var(--xingbie-nv-shen-biankuang)',
}

const 淡填充文字色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-tan-wenben)',
  nv: 'var(--xingbie-nv-tan-wenben)',
}

const 环色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-xuan-huan)',
  nv: 'var(--xingbie-nv-xuan-huan)',
}

const 光晕色: Record<性别二档, string> = {
  nan: 'var(--xingbie-nan-xuan-guangyun)',
  nv: 'var(--xingbie-nv-xuan-guangyun)',
}

function 组装选中样式(
  自身色档: 性别二档,
  对象色档: 性别二档,
  带光晕: boolean,
): CSSProperties {
  const 选中环 = `0 0 0 3px ${环色[自身色档]}`
  return {
    backgroundColor: 淡填充色[自身色档],
    borderColor: 深边框色[对象色档],
    color: 淡填充文字色[自身色档],
    boxShadow: 带光晕 ? `${选中环}, 0 10px 26px ${光晕色[自身色档]}` : 选中环,
  }
}

export interface 性别框体配色输入 {
  自身性别: MaybeRefOrGetter<unknown>
  默认性别: MaybeRefOrGetter<unknown>
  对象性别?: MaybeRefOrGetter<unknown>
}

function 解析输入色档(输入: 性别框体配色输入) {
  return computed<性别二档>(() =>
    解析性别框体色档(toValue(输入.自身性别), toValue(输入.默认性别)),
  )
}

export function 使用性别框体配色(输入: 性别框体配色输入) {
  const 色档 = 解析输入色档(输入)
  const 样式 = computed<CSSProperties>(() => ({
    backgroundColor: 填充色[色档.value],
    borderColor: 边框色[色档.value],
    color: 文字色[色档.value],
    boxShadow: `0 0 0 3px ${环色[色档.value]}, 0 10px 26px ${光晕色[色档.value]}`,
  }))
  return { 色档, 样式 }
}

export function 使用默认性别卡配色(输入: 性别框体配色输入) {
  const 色档 = 解析输入色档(输入)
  const 样式 = computed<CSSProperties>(() => 组装选中样式(色档.value, 色档.value, true))
  return { 色档, 样式 }
}

export interface 通用性别框体配色输入 {
  自身性别: MaybeRefOrGetter<unknown>
  对象性别?: MaybeRefOrGetter<unknown>
}

const 通用框体对象兜底色档: 性别二档 = 'nv'

export function 使用通用性别框体配色(输入: 通用性别框体配色输入) {
  const 自身色档 = computed<性别二档>(() =>
    解析性别框体色档(toValue(输入.自身性别), null),
  )
  const 对象色档 = computed<性别二档>(() =>
    解析性别框体色档(toValue(输入.对象性别), null, 通用框体对象兜底色档),
  )
  const 样式 = computed<CSSProperties>(() =>
    组装选中样式(自身色档.value, 对象色档.value, false),
  )
  return { 自身色档, 对象色档, 样式 }
}
