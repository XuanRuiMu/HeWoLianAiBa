






































































































































































































































  if (jieGuo.length === 0) {
    jieGuo.push({ lei_xing: 消息块LeiXing.wenZi, nei_rong: '' })
  }
  return jieGuo
}

export function qingLiLuoKuKuai(zhi: unknown, xiaoXiId: string): 消息块[] | null {
  const shuZu = Array.isArray(zhi) ? zhi : null
  if (!shuZu) {
    if (zhi !== undefined && zhi !== null) {
      debug日志.warn('消息内容块', '库内内容块形状非数组，回退为按行反构', {
        xiang_qing: { xiao_xi_id: xiaoXiId },
      })
    }
    return null
  }
  const jieGuo: 消息块[] = []
  for (const yuan of shuZu) {
    if (typeof yuan !== 'object' || yuan === null || Array.isArray(yuan)) continue
    const xiang = yuan as Record<string, unknown>
    if (!isKuaiLeiXing(xiang.lei_xing)) continue
    if (xiang.lei_xing === 消息块LeiXing.tuPian) {
      const meiTiId = typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id : ''
      if (!meiTiId || !yanZhengUUID(meiTiId)) continue
      jieGuo.push({ lei_xing: 消息块LeiXing.tuPian, mei_ti_id: meiTiId })
      continue
    }
    const wenZi = typeof xiang.nei_rong === 'string' ? xiang.nei_rong : ''
    jieGuo.push({ lei_xing: 消息块LeiXing.wenZi, nei_rong: wenZi })
  }
  if (jieGuo.length === 0) {
    debug日志.warn('消息内容块', '库内内容块无一可解析，回退为按行反构', {
      xiang_qing: { xiao_xi_id: xiaoXiId, yuan_shi_kuai_shu: shuZu.length },
    })
    return null
  }
  return jieGuo
}

export function jiLuKuaiDiuQi(diuQi: KuaiDiuQiYuanYin[], changDing: string, 用户ID?: string): void {
  if (diuQi.length === 0) return
  const zhiFangTu: Record<string, number> = {}
  for (const yin of diuQi) zhiFangTu[yin] = (zhiFangTu[yin] ?? 0) + 1
  debug日志.warn('消息内容块', '内容块脏数据已丢弃', {
    xiang_qing: { chang_ding: changDing, yong_hu_id: 用户ID ?? '', diu_qi: zhiFangTu },
  })
}

export function kuaiShenHeWenBen(kuai: 消息块[]): string {
  return kuai
