import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'
import { huoQuBenDiLuJing, cheXiaoYongHuMeiTiQianMing } from './媒体存储'
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

  // YH-069 事务只做行变更：文件IO禁入事务，先查出待删文件清单，事务只删行
  // 根因：慢IO占连接，失败还不可逆；收敛为事务外标记+事务内删行+事务外GC
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

    // 显式删除关联数据（因为是软删用户，ON DELETE CASCADE 不会触发）
    // YH-070 补全关联表：记忆/对话摘要/协议留痕/审计日志残留+LLM用量/思考记录/好友链/设置/媒体悬空
    // 存在性守卫：缺表迁移库（014/015/018等）直接DELETE会炸整事务（SQLSTATE 42P01），
    // 用信息模式判存再删；有CASCADE外键的表删行无残留但显式删可保断言语义，不存在则跳过
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

    // YH-070 吊销全部refresh加踢线：注销事务内吊销全部refresh，事务外踢在线socket
    // 根因：只吊销当前jti+时间戳，存量refresh与在线socket没清干净
    const { cheXiaoYongHuSuoYouRefreshToken } = await import('../utils/jwt')
    await cheXiaoYongHuSuoYouRefreshToken(yong_hu_id).catch(() => undefined)
    const zaiHe = yanZhengLingPai(ling_pai)
    if (zaiHe.jti) {
      const guoQiMiao = Math.floor((zaiHe.exp! * 1000 - Date.now()) / 1000)
      if (guoQiMiao > 0) {
        await redis.set(`jwt_blacklist:${zaiHe.jti}`, '1', 'EX', guoQiMiao)
      }
    }
    // 用户级吊销时间戳：注销后该用户全部存量令牌立即失效（与 jti 黑名单双保险）
    await xieRuCheXiaoShiJianCuo(yong_hu_id)
    await cheXiaoYongHuMeiTiQianMing(yong_hu_id)

    await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
    await redis.del(`yan_zheng_ma:${shouJiHao}`)
    await redis.del(`fa_song_jian_ge:${shouJiHao}`)

    // 注销审计留痕改为事务外直连写入：审计日志.用户ID外键ON DELETE SET NULL，
    // 事务内删行+留痕同事务必锁等待；事务外写入用户已匿名化，外键置空不断言用户存在
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

  // YH-069 事务外GC物理文件：事务已提交再删文件，失败仅记日志不回滚行变更
  for (const benDiLuJing of daiShanWenJian) {
    try {
      await fs.promises.unlink(benDiLuJing)
    } catch {
      // 文件不存在或已被并发清理，忽略
    }
  }

  // YH-070 事务外踢线：断开该用户全部在线socket，防注销后残留会话
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