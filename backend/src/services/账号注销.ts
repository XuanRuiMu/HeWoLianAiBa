import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'
import { huoQuBenDiLuJing } from './媒体存储'
import fs from 'fs'
import { yanZhengLingPai, xieRuCheXiaoShiJianCuo } from '../utils/jwt'
import { jiLuShenJiRiZhi } from './审计日志'

export async function zhuXiaoYongHu(
  yong_hu_id: string,
  ling_pai: string,
  ip: string,
): Promise<{ cheng_gong: boolean; ti_shi?: string }> {
  const yongHu = await 数据库.query(`SELECT * FROM "用户" WHERE "ID" = $1 LIMIT 1`, [yong_hu_id])
  if (yongHu.rows.length === 0) {
    return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'ziYuanBuCunZai') }
  }

  const yongHuXinXi = yongHu.rows[0]
  const shouJiHao = String(yongHuXinXi.手机号)
  const zhuXiaoBiaoJi = `注销_${yong_hu_id.slice(0, 8)}`

  await 数据库.query('BEGIN')

  try {
    const meiTiJieGuo = await 数据库.query(
      `SELECT "SHA256" FROM "媒体文件" WHERE "上传者ID" = $1`,
      [yong_hu_id],
    )

    for (const row of meiTiJieGuo.rows) {
      const sha256 = String(row.SHA256)
      // CAS 共享：仅当该 SHA256 不再被其他用户的记录引用时才删除物理文件
      const yinYongJieGuo = await 数据库.query(
        `SELECT 1 FROM "媒体文件" WHERE "SHA256" = $1 AND "上传者ID" <> $2 LIMIT 1`,
        [sha256, yong_hu_id],
      )
      if (yinYongJieGuo.rows.length > 0) {
        continue
      }
      const benDiLuJing = huoQuBenDiLuJing(sha256)
      if (benDiLuJing) {
        try {
          await fs.promises.unlink(benDiLuJing)
        } catch {
          // 文件不存在或已被并发清理，忽略
        }
      }
    }

    await 数据库.query(`DELETE FROM "媒体文件" WHERE "上传者ID" = $1`, [yong_hu_id])

    // 显式删除关联数据（因为是软删用户，ON DELETE CASCADE 不会触发）
    await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "游戏结局" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "用户人设" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "反馈" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "评估" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "关键事件" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "挑战对局" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "挑战积分" WHERE "用户ID" = $1`, [yong_hu_id])
    await 数据库.query(`DELETE FROM "通知" WHERE "接收者ID" = $1`, [yong_hu_id])

    await 数据库.query(
      `UPDATE "用户" SET
         "手机号" = $2,
         "用户名" = $3,
         "密码哈希" = NULL,
         "昵称" = NULL,
         "性别" = NULL,
         "目标性别" = NULL,
         "默认性别" = NULL,
         "性格选择" = NULL,
         "人设标签" = NULL,
         "渣男渣女变体" = FALSE,
         "管理员" = FALSE,
         "头像" = NULL,
         "生日" = NULL,
         "签名" = NULL,
         "活跃角色ID" = NULL,
         "更新时间" = NOW()
       WHERE "ID" = $1`,
      [yong_hu_id, zhuXiaoBiaoJi, zhuXiaoBiaoJi],
    )

    const zaiHe = yanZhengLingPai(ling_pai)
    if (zaiHe.jti) {
      const guoQiMiao = Math.floor((zaiHe.exp! * 1000 - Date.now()) / 1000)
      if (guoQiMiao > 0) {
        await redis.set(`jwt_blacklist:${zaiHe.jti}`, '1', 'EX', guoQiMiao)
      }
    }
    // 用户级吊销时间戳：注销后该用户全部存量令牌立即失效（与 jti 黑名单双保险）
    await xieRuCheXiaoShiJianCuo(yong_hu_id)

    const allTokensJieGuo = await redis.keys(`deng_lu_shi_bai:${shouJiHao}`)
    for (const key of allTokensJieGuo) {
      await redis.del(key)
    }
    await redis.del(`yan_zheng_ma:${shouJiHao}`)
    await redis.del(`fa_song_jian_ge:${shouJiHao}`)

    await jiLuShenJiRiZhi({
      yong_hu_id,
      ip,
      shi_jian_lei_xing: huoQuFanYi('shenJi', 'zhuXiaoYongHu'),
      xiang_qing: { yong_hu_id },
      lei_xing: '安全',
    })

    await 数据库.query('COMMIT')

    return { cheng_gong: true, ti_shi: huoQuFanYi('renZheng', 'zhuXiaoChengGong') }
  } catch (cuoWu) {
    await 数据库.query('ROLLBACK')
    throw cuoWu
  }
}