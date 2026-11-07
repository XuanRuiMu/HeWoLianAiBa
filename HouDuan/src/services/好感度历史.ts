import { 数据库 } from '../数据库'

export interface HaoGanDuLeiJiBianHua {
  lun_ci_shu: number
  xin_ren_du_bian_hua: number
  qin_mi_du_bian_hua: number
  qu_wei_du_bian_hua: number
  guan_huai_du_bian_hua: number
  zong_fen_bian_hua: number
}

function quZhengShu(zhi: unknown): number {
  const shu = Number(zhi)
  return Number.isSafeInteger(shu) ? shu : 0
}

export async function huoQuHaoGanDuLeiJiBianHua(
  yongHuId: string,
  jiaoSeId: string,
): Promise<HaoGanDuLeiJiBianHua> {
  const jieGuo = await 数据库.query(
    `SELECT
       COUNT(*)::integer AS "lunCiShu",
       COALESCE(SUM("信任度变化"), 0)::integer AS "xinRenDu",
       COALESCE(SUM("亲密度变化"), 0)::integer AS "qinMiDu",
       COALESCE(SUM("趣味度变化"), 0)::integer AS "quWeiDu",
       COALESCE(SUM("关怀度变化"), 0)::integer AS "guanHuaiDu",
       COALESCE(SUM("总分变化"), 0)::integer AS "zongFen"
     FROM "好感度变化历史"
     WHERE "用户ID" = $1 AND "角色ID" = $2`,
    [yongHuId, jiaoSeId],
  )
  const hang = jieGuo.rows[0] ?? {}
  return {
    lun_ci_shu: quZhengShu(hang.lunCiShu),
    xin_ren_du_bian_hua: quZhengShu(hang.xinRenDu),
    qin_mi_du_bian_hua: quZhengShu(hang.qinMiDu),
    qu_wei_du_bian_hua: quZhengShu(hang.quWeiDu),
    guan_huai_du_bian_hua: quZhengShu(hang.guanHuaiDu),
    zong_fen_bian_hua: quZhengShu(hang.zongFen),
  }
}
