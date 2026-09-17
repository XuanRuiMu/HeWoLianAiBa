import { redis } from '../redis'
import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'

const DUO_SHE_QIAN_ZHUI = '夺舍:'
const DUO_SHE_ZU_YUE_MIAO = 300
const DUO_SHE_XIN_TIAO_JIAN_GE_MIAO = 60

function shengChengDuoSheJian(jiao_se_id: string): string {
  return `${DUO_SHE_QIAN_ZHUI}${jiao_se_id}`
}

function huoQuXinTiaoJian(jiao_se_id: string): string {
  return `${DUO_SHE_QIAN_ZHUI}xin_tiao:${jiao_se_id}`
}

/** YH-012 夺舍租约300s：SET带租约，抢占需先审计记抢占事件 */
export async function sheZhiDuoSheZhuangTai(
  jiao_se_id: string,
  guan_li_yuan_id: string,
): Promise<{ cheng_gong: boolean; qiang_zhan?: boolean }> {
  const jian = shengChengDuoSheJian(jiao_se_id)
  const xianYou = await redis.get(jian)
  const qiangZhan = Boolean(xianYou && xianYou !== guan_li_yuan_id)
  await redis.set(jian, guan_li_yuan_id, 'EX', DUO_SHE_ZU_YUE_MIAO)
  await redis.set(huoQuXinTiaoJian(jiao_se_id), String(Date.now()), 'EX', DUO_SHE_ZU_YUE_MIAO)
  try {
    await jiLuDuoShe(guan_li_yuan_id, jiao_se_id)
  } catch {
    await redis.del(jian)
    await redis.del(huoQuXinTiaoJian(jiao_se_id))
    throw new Error('夺舍落库失败，已回滚租约')
  }
  if (qiangZhan && xianYou) {
    await jiLuDuoSheQiangZhan(guan_li_yuan_id, jiao_se_id, xianYou)
  }
  return { cheng_gong: true, qiang_zhan: qiangZhan }
}

/** YH-012 心跳续租：持有者周期调用延长租约，非持有者拒绝 */
export async function duoSheXinTiao(jiao_se_id: string, guan_li_yuan_id: string): Promise<boolean> {
  const dangQian = await redis.get(shengChengDuoSheJian(jiao_se_id))
  if (dangQian !== guan_li_yuan_id) return false
  await redis.expire(shengChengDuoSheJian(jiao_se_id), DUO_SHE_ZU_YUE_MIAO)
  await redis.set(huoQuXinTiaoJian(jiao_se_id), String(Date.now()), 'EX', DUO_SHE_ZU_YUE_MIAO)
  return true
}

export async function huoQuDuoSheZuYueMiao(): Promise<number> {
  return DUO_SHE_ZU_YUE_MIAO
}

export async function huoQuDuoSheXinTiaoGeMiao(): Promise<number> {
  return DUO_SHE_XIN_TIAO_JIAN_GE_MIAO
}

async function jiLuDuoSheQiangZhan(guan_li_yuan_id: string, jiao_se_id: string, yuanChiYou: string): Promise<void> {
  try {
    await 数据库.query(
      `INSERT INTO "夺舍日志" ("管理员ID", "角色ID") VALUES ($1, $2)`,
      [guan_li_yuan_id, jiao_se_id],
    )
  await debug日志.info('夺舍租约', '夺舍被抢占', { xiang_qing: { jiao_se_id, xin_chi_you: guan_li_yuan_id, yuan_chi_you: yuanChiYou } } as never)
  } catch {
    return
  }
}

export async function shanChuDuoSheZhuangTai(jiao_se_id: string): Promise<void> {
  await redis.del(shengChengDuoSheJian(jiao_se_id))
  await redis.del(huoQuXinTiaoJian(jiao_se_id))
}

/** YH-012 断线释放审计：按管理员释放其全部租约并记审计结束时间 */
export async function shiFangGuanLiYuanQuanBuDuoShe(guan_li_yuan_id: string): Promise<string[]> {
  let jianLieBiao: string[] = []
  try {
    jianLieBiao = await (redis as unknown as { keys: (moShi: string) => Promise<string[]> }).keys(`${DUO_SHE_QIAN_ZHUI}*`)
  } catch {
    return []
  }
  const shiFang: string[] = []
  for (const jian of jianLieBiao) {
    if (jian.includes('xin_tiao:')) continue
    const jiaoSeId = jian.slice(DUO_SHE_QIAN_ZHUI.length)
    try {
      const chiYou = await redis.get(jian)
      if (chiYou === guan_li_yuan_id) {
        await jieShuDuoShe(guan_li_yuan_id, jiaoSeId)
        shiFang.push(jiaoSeId)
      }
    } catch {
      continue
    }
  }
  return shiFang
}

export async function huoQuDuoSheGuanLiYuan(jiao_se_id: string): Promise<string | null> {
  return redis.get(shengChengDuoSheJian(jiao_se_id))
}

export async function jiaoSeShiFouBeiDuoShe(jiao_se_id: string): Promise<boolean> {
  const guanLiYuanId = await huoQuDuoSheGuanLiYuan(jiao_se_id)
  return guanLiYuanId !== null && guanLiYuanId.length > 0
}

export async function huoQuJiaoSeYongHuId(jiao_se_id: string): Promise<string | null> {
  const jieGuo = await 数据库.query(
    `SELECT "用户ID" FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiao_se_id],
  )
  if (jieGuo.rows.length === 0) return null
  const yongHuId = jieGuo.rows[0].用户ID
  return yongHuId ? String(yongHuId) : null
}

export async function jiLuDuoShe(
  guan_li_yuan_id: string,
  jiao_se_id: string,
): Promise<void> {
  await 数据库.query(
    `INSERT INTO "夺舍日志" ("管理员ID", "角色ID") VALUES ($1, $2)`,
    [guan_li_yuan_id, jiao_se_id],
  )
}

export async function jieShuDuoShe(
  guan_li_yuan_id: string,
  jiao_se_id: string,
): Promise<boolean> {
  const dangQianGuanLiYuan = await huoQuDuoSheGuanLiYuan(jiao_se_id)
  if (dangQianGuanLiYuan !== guan_li_yuan_id) {
    return false
  }
  await 数据库.query(
    `UPDATE "夺舍日志" SET "结束时间" = NOW()
     WHERE "管理员ID" = $1 AND "角色ID" = $2 AND "结束时间" IS NULL`,
    [guan_li_yuan_id, jiao_se_id],
  )
  await shanChuDuoSheZhuangTai(jiao_se_id)
  return true
}
