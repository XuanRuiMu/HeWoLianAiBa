import { randomUUID } from 'node:crypto'
import { 数据库 } from '../数据库'
import { huoQuFanYi } from '../config/translations'
import { HaoGanDuPeiZhi, HaoGanDuJieDuanYingShe, GuiFanGuanXiJieDuanMing } from '../config/好感度配置'
import { chuLiYouXiJieShu } from './胜利失败条件'
import { debug日志, jiLuHaoGanDuBianHua } from '../utils/debug日志'
import type { HaoGanDuXinXi, GongKaiHaoGanDuXinXi, WanZhengHaoGanDuXinXi } from '../types'
import { jiLuZengLiang } from './好感度缓存'

export interface HaoGanDuSiWeiBianHua {
  xin_ren_du_bian_hua: number
  qin_mi_du_bian_hua: number
  qu_wei_du_bian_hua: number
  guan_huai_du_bian_hua: number
}

export interface HaoGanDuZengLiangShiJian {
  shi_jian_id: string
  jiao_se_id: string
  xin_ren_du_bian_hua: number
  qin_mi_du_bian_hua: number
  qu_wei_du_bian_hua: number
  guan_huai_du_bian_hua: number
  zong_fen_bian_hua: number
}

export interface HaoGanDuGengXinJieGuo {
  cheng_gong: boolean
  hao_gan_du?: HaoGanDuXinXi
  ti_shi?: string
  zhuang_tai_ma?: number
  shuaiJianHouZengLiang?: number
  zeng_liang_shi_jian?: HaoGanDuZengLiangShiJian
}

function qieGeFanWei(zhi: number, zuiDi: number, zuiGao: number): number {
  return Math.max(zuiDi, Math.min(zuiGao, zhi))
}

export function miJiKouLingPiPei(shuRu: string): boolean {
  const kouLing = HaoGanDuPeiZhi.miJi.miLing
  if (kouLing.length === 0) return false
  if (typeof shuRu !== 'string' || shuRu.length !== kouLing.length) return false
  let chaZhi = 0
  for (let xuHao = 0; xuHao < kouLing.length; xuHao += 1) {
    chaZhi |= kouLing.charCodeAt(xuHao) ^ shuRu.charCodeAt(xuHao)
  }
  return chaZhi === 0
}

export function jiSuanZongFen(siWei: { xin_ren_du: number; qin_mi_du: number; qu_wei_du: number; guan_huai_du: number }): number {
  const { quanZhong } = HaoGanDuPeiZhi
  const fenShu =
    siWei.xin_ren_du * quanZhong.xinRenDu +
    siWei.qin_mi_du * quanZhong.qinMiDu +
    siWei.qu_wei_du * quanZhong.quWeiDu +
    siWei.guan_huai_du * quanZhong.guanHuaiDu

  return Math.round(qieGeFanWei(fenShu, HaoGanDuPeiZhi.fanWei.zuiDiFen, HaoGanDuPeiZhi.fanWei.zuiGaoFen))
}

export function jiSuanShuaiJianBianHua(dangQianFen: number, bianHua: number): number {
  const qieGeFen = qieGeFanWei(dangQianFen, HaoGanDuPeiZhi.fanWei.zuiDiFen, HaoGanDuPeiZhi.fanWei.zuiGaoFen)
  const shuaiJianXiShu = Math.max(
    1 - qieGeFen / HaoGanDuPeiZhi.fanWei.zuiGaoFen,
    HaoGanDuPeiZhi.shuaiJian.zuiDiBaoLiu,
  )
  return bianHua * shuaiJianXiShu
}

export function fenJieSiWei(zongFen: number): Omit<HaoGanDuXinXi, 'guan_xi_jie_duan'> {
  const qieGeFen = qieGeFanWei(zongFen, HaoGanDuPeiZhi.fanWei.zuiDiFen, HaoGanDuPeiZhi.fanWei.zuiGaoFen)
  const { quanZhong } = HaoGanDuPeiZhi

  return {
    xin_ren_du: Math.round(qieGeFen * quanZhong.xinRenDu),
    qin_mi_du: Math.round(qieGeFen * quanZhong.qinMiDu),
    qu_wei_du: Math.round(qieGeFen * quanZhong.quWeiDu),
    guan_huai_du: Math.round(qieGeFen * quanZhong.guanHuaiDu),
    zong_fen: qieGeFen,
  }
}

export function huoQuJieDuanXinXi(zongFen: number): HaoGanDuJieDuanYingShe {
  const qieGeFen = qieGeFanWei(zongFen, HaoGanDuPeiZhi.fanWei.zuiDiFen, HaoGanDuPeiZhi.fanWei.zuiGaoFen)

  const jieDuanLieBiao = Object.values(HaoGanDuPeiZhi.jieDuan)
  for (const jieDuan of jieDuanLieBiao) {
    if (qieGeFen >= jieDuan.xiaXian && qieGeFen <= jieDuan.shangXian) {
      return jieDuan
    }
  }

  return jieDuanLieBiao[0]
}

export function huoQuJieDuanMing(zongFen: number): string {
  return huoQuJieDuanXinXi(zongFen).jieDuanMing
}

export function huoQuXinQing(zongFen: number): string {
  return huoQuJieDuanXinXi(zongFen).xinQing
}

export function jiSuanSiWeiBianHuaHouDeZongFen(
  dangQianFen: number,
  bianHua: HaoGanDuSiWeiBianHua,
): number {
  const { quanZhong } = HaoGanDuPeiZhi
  const yuanShiBianHua =
    bianHua.xin_ren_du_bian_hua * quanZhong.xinRenDu +
    bianHua.qin_mi_du_bian_hua * quanZhong.qinMiDu +
    bianHua.qu_wei_du_bian_hua * quanZhong.quWeiDu +
    bianHua.guan_huai_du_bian_hua * quanZhong.guanHuaiDu

  const shiJiBianHua = jiSuanShuaiJianBianHua(dangQianFen, yuanShiBianHua)
  return qieGeFanWei(Math.round(dangQianFen + shiJiBianHua), HaoGanDuPeiZhi.fanWei.zuiDiFen, HaoGanDuPeiZhi.fanWei.zuiGaoFen)
}

export async function huoQuWanZhengHaoGanDu(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<WanZhengHaoGanDuXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT * FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2 LIMIT 1`,
    [yong_hu_id, jiao_se_id],
  )

  if (jieGuo.rows.length === 0) return null

  const shuJuHang = jieGuo.rows[0]
  return {
    yong_hu_id,
    jiao_se_id,
    xin_ren_du: Number(shuJuHang.信任度 || 0),
    qin_mi_du: Number(shuJuHang.亲密度 || 0),
    qu_wei_du: Number(shuJuHang.趣味度 || 0),
    guan_huai_du: Number(shuJuHang.关怀度 || 0),
    zong_fen: Number(shuJuHang.总分 || 0),
    guan_xi_jie_duan: GuiFanGuanXiJieDuanMing(shuJuHang.关系阶段 || Number(shuJuHang.总分 || 0)),
    互动次数: Number.isFinite(Number(shuJuHang.互动次数)) && Number(shuJuHang.互动次数) >= 0
      ? Math.floor(Number(shuJuHang.互动次数))
      : 0,
  }
}

export async function huoQuGongKaiHaoGanDuXinXi(
  yong_hu_id: string,
  jiao_se_id: string,
): Promise<GongKaiHaoGanDuXinXi | null> {
  const haoGanDu = await huoQuWanZhengHaoGanDu(yong_hu_id, jiao_se_id)
  if (!haoGanDu) return null

  const jieDuanXinXi = huoQuJieDuanXinXi(haoGanDu.zong_fen)
  return {
    jie_duan: jieDuanXinXi.jieDuanMing,
    xin_qing: jieDuanXinXi.xinQing,
  }
}

