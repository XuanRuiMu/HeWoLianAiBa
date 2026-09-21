function duQuZhengShu(ming: string, moRen: number, zuiXiao: number, zuiDa: number): number {
  const yuan = parseInt(process.env[ming] || '', 10)
  if (!Number.isFinite(yuan)) return moRen
  return Math.max(zuiXiao, Math.min(zuiDa, yuan))
}

export const SHI_JIAN_CHANG_JING_PEI_ZHI = {
  qiYong: (process.env['SHI_JIAN_CHANG_JING_QI_YONG'] || 'true').trim().toLowerCase() !== 'false',
  huanCunMiao: duQuZhengShu('SHI_JIAN_CHANG_JING_HUAN_CUN_MIAO', 60, 0, 3600),
} as const

export type ShiJianDuan = 'shenYe' | 'lingChen' | 'qingChen' | 'shangWu' | 'zhengWu' | 'wuHou' | 'bangWan' | 'yeWan'

export interface ShiJianChangJing {
  duan: ShiJianDuan
  xiaoShi: number
  changJingWenBen: string
  yuQiCeLue: string
}

const DUAN_YU_QI: Record<ShiJianDuan, string> = {
  shenYe: '深夜了，说话放轻一点，别太闹腾，可以带点困意和温柔',
  lingChen: '凌晨夜深人静，语气放缓，多一点陪伴感，别吵',
  qingChen: '清晨刚醒，语气清爽轻快，带点起床气的真实感也行',
  shangWu: '上午时段，语气自然干脆，像边忙边回消息',
  zhengWu: '正午前后，语气轻松，可以聊聊吃饭午休',
  wuHou: '午后时段，语气慵懒随意一点',
  bangWan: '傍晚时分，语气放松，带点一天结束的松弛感',
  yeWan: '晚上时段，语气柔和，适合聊聊今天发生的事',
}

function panDuanDuan(xiaoShi: number): ShiJianDuan {
  if (xiaoShi >= 0 && xiaoShi < 5) return xiaoShi < 3 ? 'shenYe' : 'lingChen'
  if (xiaoShi < 7) return 'qingChen'
  if (xiaoShi < 11) return 'shangWu'
  if (xiaoShi < 14) return 'zhengWu'
  if (xiaoShi < 18) return 'wuHou'
  if (xiaoShi < 22) return 'bangWan'
  return 'shenYe'
}

export function jiSuanShiJianChangJing(riQi: Date = new Date()): ShiJianChangJing {
  const xiaoShi = riQi.getHours()
  const duan = panDuanDuan(xiaoShi)
  return {
    duan,
    xiaoShi,
    changJingWenBen: `现在是${String(xiaoShi).padStart(2, '0')}点`,
    yuQiCeLue: DUAN_YU_QI[duan],
  }
}

let huanCun: { wenBen: string; guoQi: number } | null = null

export function huoQuShiJianChangJingWenBen(riQi: Date = new Date()): string {
  if (!SHI_JIAN_CHANG_JING_PEI_ZHI.qiYong) return '正常聊天时间'
  const xianZai = Date.now()
  if (huanCun && xianZai < huanCun.guoQi) return huanCun.wenBen
  const jieGuo = jiSuanShiJianChangJing(riQi)
  const wenBen = `${jieGuo.changJingWenBen}（${jieGuo.yuQiCeLue}）`
  if (SHI_JIAN_CHANG_JING_PEI_ZHI.huanCunMiao > 0) {
    huanCun = { wenBen, guoQi: xianZai + SHI_JIAN_CHANG_JING_PEI_ZHI.huanCunMiao * 1000 }
  }
  return wenBen
}

export function qingChuShiJianChangJingHuanCun(): void {
  huanCun = null
}
