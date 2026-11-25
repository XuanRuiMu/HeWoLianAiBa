let xiTongTiShiXuHao = 0

export function shengChengXiTongTiShiId(): string {
  xiTongTiShiXuHao += 1
  return `sys-${Date.now()}-${xiTongTiShiXuHao}`
}
