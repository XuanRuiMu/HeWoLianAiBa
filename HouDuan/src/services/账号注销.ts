import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'
import { huoQuBenDiLuJing, cheXiaoYongHuMeiTiQianMing } from './媒体存储'
import fs from 'fs'
import { yanZhengLingPai, xieRuCheXiaoShiJianCuo } from '../utils/jwt'
import { shanChuYanZhengMa } from './短信'
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

  const meiTiJieGuo = await 数据库.query(
    `SELECT "SHA256" FROM "媒体文件" WHERE "上传者ID" = $1`,
    [yong_hu_id],
  )
  const daiShanWenJian: string[] = []
  for (const row of meiTiJieGuo.rows) {
    const sha256 = String(row.SHA256)
    const yinYongJieGuo = await 数据库.query(
      `SELECT 1 FROM "媒体文件" WHERE "SHA256" = $1 AND "上传者ID" <> $2 LIMIT 1`,
      [sha256, yong_hu_id],
    )
    if (yinYongJieGuo.rows.length > 0) {
      continue
    }
    const benDiLuJing = huoQuBenDiLuJing(sha256)
    if (benDiLuJing) {
      daiShanWenJian.push(benDiLuJing)
    }
  }

  const keHuDuan = await 数据库.connect()
  try {
    await keHuDuan.query('BEGIN')
    await keHuDuan.query(`DELETE FROM "媒体文件" WHERE "上传者ID" = $1`, [yong_hu_id])

    const 关联删行: Array<{ 表名: string; 语句: string }> = [
      { 表名: '媒体文件', 语句: `DELETE FROM "媒体文件" WHERE "上传者ID" = $1` },
      { 表名: '角色', 语句: `DELETE FROM "角色" WHERE "用户ID" = $1` },
      { 表名: '消息', 语句: `DELETE FROM "消息" WHERE "用户ID" = $1` },
      { 表名: '好感度', 语句: `DELETE FROM "好感度" WHERE "用户ID" = $1` },
      { 表名: '好感度增量统计', 语句: `DELETE FROM "好感度增量统计" WHERE "用户ID" = $1` },
      { 表名: '游戏档案', 语句: `DELETE FROM "游戏档案" WHERE "用户ID" = $1` },
      { 表名: '游戏结局', 语句: `DELETE FROM "游戏结局" WHERE "用户ID" = $1` },
      { 表名: '用户人设', 语句: `DELETE FROM "用户人设" WHERE "用户ID" = $1` },
      { 表名: '反馈', 语句: `DELETE FROM "反馈" WHERE "用户ID" = $1` },
      { 表名: '评估', 语句: `DELETE FROM "评估" WHERE "用户ID" = $1` },
      { 表名: '关键事件', 语句: `DELETE FROM "关键事件" WHERE "用户ID" = $1` },
      { 表名: '记忆', 语句: `DELETE FROM "记忆" WHERE "用户ID" = $1` },
      { 表名: '对话摘要', 语句: `DELETE FROM "对话摘要" WHERE "用户ID" = $1` },
      { 表名: '协议留痕', 语句: `DELETE FROM "协议留痕" WHERE "用户ID" = $1` },
      { 表名: '思考记录', 语句: `DELETE FROM "思考记录" WHERE "用户ID" = $1` },
      { 表名: '好友申请', 语句: `DELETE FROM "好友申请" WHERE "申请者ID" = $1 OR "接收者ID" = $1` },
      { 表名: '好友消息', 语句: `DELETE FROM "好友消息" WHERE "发送者ID" = $1 OR "接收者ID" = $1` },
      { 表名: '用户设置', 语句: `DELETE FROM "用户设置" WHERE "用户ID" = $1` },
      { 表名: '夺舍日志', 语句: `DELETE FROM "夺舍日志" WHERE "管理员ID" = $1` },
      { 表名: '账号封禁', 语句: `DELETE FROM "账号封禁" WHERE "用户ID" = $1` },
      { 表名: '挑战对局', 语句: `DELETE FROM "挑战对局" WHERE "用户ID" = $1` },
      { 表名: '挑战积分', 语句: `DELETE FROM "挑战积分" WHERE "用户ID" = $1` },
      { 表名: '通知', 语句: `DELETE FROM "通知" WHERE "接收者ID" = $1` },
    ]
    const 已有表 = new Set(
      (
        await keHuDuan.query(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
        )
      ).rows.map((行: { tablename: string }) => String(行.tablename)),
    )
    for (const { 表名, 语句 } of 关联删行) {
      if (!已有表.has(表名)) continue
      await keHuDuan.query(语句, [yong_hu_id])
    }

    await keHuDuan.query(
      `UPDATE "用户" SET
         "手机号" = $2,
         "用户名" = $3,
         "密码哈希" = NULL,
         "昵称" = NULL,
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

    const { cheXiaoYongHuSuoYouRefreshToken } = await import('../utils/jwt')
    await cheXiaoYongHuSuoYouRefreshToken(yong_hu_id).catch(() => undefined)
    const zaiHe = yanZhengLingPai(ling_pai)
    if (zaiHe.jti) {
      const guoQiMiao = Math.floor((zaiHe.exp! * 1000 - Date.now()) / 1000)
      if (guoQiMiao > 0) {
        await redis.set(`jwt_blacklist:${zaiHe.jti}`, '1', 'EX', guoQiMiao)
      }
    }
    await xieRuCheXiaoShiJianCuo(yong_hu_id)
    await cheXiaoYongHuMeiTiQianMing(yong_hu_id)

    await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
    await shanChuYanZhengMa(shouJiHao)
    await redis.del(`fa_song_jian_ge:${shouJiHao}`)

    await keHuDuan.query('COMMIT')
  } catch (cuoWu) {
    await keHuDuan.query('ROLLBACK').catch(() => undefined)
    keHuDuan.release()
    throw cuoWu
  }
  keHuDuan.release()

  await jiLuShenJiRiZhi({
    yong_hu_id,
    ip,
    shi_jian_lei_xing: huoQuFanYi('shenJi', 'zhuXiaoYongHu'),
    xiang_qing: { yong_hu_id },
    lei_xing: '安全',
  }).catch(() => undefined)

  for (const benDiLuJing of daiShanWenJian) {
    try {
      await fs.promises.unlink(benDiLuJing)
    } catch {
      // 文件不存在或已被并发清理，忽略
    }
  }

  try {
    const { huoQuIo } = await import('../socket/io')
    const io = huoQuIo()
    if (io) {
      const sockets = await io.in(yong_hu_id).fetchSockets()
      for (const socket of sockets) {
        try {
          socket.disconnect(true)
        } catch {
          // 忽略单连接断开失败
        }
      }
    }
  } catch {
    // 踢线失败不阻断注销
  }

  return { cheng_gong: true, ti_shi: huoQuFanYi('renZheng', 'zhuXiaoChengGong') }
}