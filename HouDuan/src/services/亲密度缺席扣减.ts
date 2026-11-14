import { redis } from '../redis'
import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'

function duQuZhengShu(ming: string, moRen: number): number {
  const yuan = parseInt(process.env[ming] || '', 10)
  return Number.isFinite(yuan) && yuan > 0 ? yuan : moRen
}

export const QueXiChuFaXiaoShi = duQuZhengShu('QUE_XI_CHU_FA_XIAO_SHI', 12)
export const QueXiKouJianFen = duQuZhengShu('QUE_XI_KOU_JIAN_FEN', 1)

export async function chuLiQueXiKouJian(yongHuId: string, jiaoSeId: string): Promise<boolean> {
  const biaoJi = `que_xi_kou_jian:${yongHuId}:${jiaoSeId}`
  try {
    const yiKou = await redis.get(biaoJi)
    const qianYiHuDong = await 数据库.query(
      `SELECT "创建时间" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2 ORDER BY "创建时间" DESC LIMIT 1 OFFSET 1`,
      [yongHuId, jiaoSeId],
    )
    if (qianYiHuDong.rows.length === 0) return false
    const qianYiShiKe = new Date(String(qianYiHuDong.rows[0].创建时间)).getTime()
    const geShiHaoMiao = Date.now() - qianYiShiKe
    if (geShiHaoMiao < QueXiChuFaXiaoShi * 3600_000) {
      if (yiKou) await redis.del(biaoJi)
      return false
    }
    if (yiKou) return false

    const kouJian = QueXiKouJianFen
    const weiDuKouJian = Math.floor(kouJian / 4)
    const gengXin = await 数据库.query(
      `UPDATE "好感度" SET
         "信任度" = GREATEST(0, "信任度" - $2),
         "亲密度" = GREATEST(0, "亲密度" - $2),
         "趣味度" = GREATEST(0, "趣味度" - $2),
         "关怀度" = GREATEST(0, "关怀度" - $2),
         "总分" = GREATEST(0, "总分" - $1)
       WHERE "用户ID" = $3 AND "角色ID" = $4
       RETURNING "总分"`,
      [kouJian, weiDuKouJian, yongHuId, jiaoSeId],
    )
    if (gengXin.rows.length === 0) return false
    await redis.set(biaoJi, '1')
    debug日志.info('缺席扣减', '用户缺席触发单次亲密度扣减', {
      xiang_qing: {
        yong_hu_id: yongHuId,
        jiao_se_id: jiaoSeId,
        ge_shi_xiao_shi: Math.round(geShiHaoMiao / 3600_000),
        kou_jian: kouJian,
        kou_hou_zong_fen: Number(gengXin.rows[0].总分),
      },
    })
    return true
  } catch (cuoWu) {
    debug日志.warn('缺席扣减', '缺席检查失败，本轮跳过', {
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return false
  }
}
