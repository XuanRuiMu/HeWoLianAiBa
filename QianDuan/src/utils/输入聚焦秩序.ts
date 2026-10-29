let 上次聚焦字段: HTMLElement | null = null

export function 领取聚焦入场许可(字段: HTMLElement | null): boolean {
  if (!字段) return false
  const 是新字段 = 字段 !== 上次聚焦字段
  上次聚焦字段 = 字段
  return 是新字段
}

export function 重置聚焦秩序(): void {
  上次聚焦字段 = null
}
