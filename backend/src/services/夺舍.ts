import { redis } from '../redis'
import { 数据库 } from '../数据库'

const DUO_SHE_QIAN_ZHUI = '夺舍:'

function shengChengDuoSheJian(jiao_se_id: string): string {
  return `${DUO_SHE_QIAN_ZHUI}${jiao_se_id}`
}

export async function sheZhiDuoSheZhuangTai(
  jiao_se_id: string,
  guan_li_yuan_id: string,
): Promise<void> {
  await redis.set(shengChengDuoSheJian(jiao_se_id), guan_li_yuan_id)
}

export async function shanChuDuoSheZhuangTai(jiao_se_id: string): Promise<void> {
  await redis.del(shengChengDuoSheJian(jiao_se_id))
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
