import { randomInt } from 'node:crypto'
import { HaoGanDuPeiZhi } from '../config/好感度配置'
import { haoGanDuJiChuFanWei } from '../config/角色配置'
import { 按权重分配整数 } from '../utils/整数分配'

export type MBTI键 = keyof typeof haoGanDuJiChuFanWei

function 取区间(mbti: string): [number, number] {
  const 键 = String(mbti ?? '').trim().toUpperCase() as MBTI键
  const 区间 = haoGanDuJiChuFanWei[键]
  if (Array.isArray(区间) && 区间.length === 2) return [区间[0], 区间[1]]
  return haoGanDuJiChuFanWei.INTJ
}

function 规范化IE(zhi: string): 'I' | 'E' {
  return String(zhi ?? '').trim().toUpperCase() === 'E' ? 'E' : 'I'
}

export function 生成人设初始分(mbti: string, shiFouZhaXing: boolean, ieLeiXing: string): number {
  const [下界, 上界] = 取区间(mbti)
  const 人设分 = randomInt(下界, 上界 + 1)
  if (!shiFouZhaXing) return 人设分
  const 加成 = HaoGanDuPeiZhi.zhaXing.eWaiJiaFen[规范化IE(ieLeiXing)]
  const 加成分 = randomInt(加成.zuiDi, 加成.zuiGao + 1)
  const 合计 = 人设分 + 加成分
  return Math.max(0, Math.min(HaoGanDuPeiZhi.fanWei.zuiGaoFen, Math.min(加成.shangXian, 合计)))
}

export function 生成四维初值(zongFen: number): {
  xin_ren_du: number
  qin_mi_du: number
  qu_wei_du: number
  guan_huai_du: number
  zong_fen: number
} {
  const { quanZhong } = HaoGanDuPeiZhi
  const 目标 = Math.max(0, Math.round(zongFen))
  const 分配 = 按权重分配整数(目标, [quanZhong.xinRenDu, quanZhong.qinMiDu, quanZhong.quWeiDu, quanZhong.guanHuaiDu])
  return {
    xin_ren_du: 分配[0] ?? 0,
    qin_mi_du: 分配[1] ?? 0,
    qu_wei_du: 分配[2] ?? 0,
    guan_huai_du: 分配[3] ?? 0,
    zong_fen: 目标,
  }
}
