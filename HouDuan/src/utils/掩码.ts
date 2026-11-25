export function yinBiShouJiHao(shouJiHao: string): string {
  if (!shouJiHao || typeof shouJiHao !== 'string') {
    return ''
  }
  const qingLi = shouJiHao.trim()
  if (qingLi.length < 7) {
    return '*'.repeat(qingLi.length)
  }
  const qianSan = qingLi.slice(0, 3)
  const houSi = qingLi.slice(-4)
  return `${qianSan}****${houSi}`
}

export function yinBiMinGanZiDuan(
  obj: Record<string, unknown>,
  ziDuanMing: string[] = ['shou_ji_hao', 'shouJiHao', '手机号', '手机'],
): Record<string, unknown> {
  const jieGuo = { ...obj }
  for (const key of Object.keys(jieGuo)) {
    if (ziDuanMing.includes(key) && typeof jieGuo[key] === 'string') {
      jieGuo[key] = yinBiShouJiHao(jieGuo[key] as string)
    }
  }
  return jieGuo
}