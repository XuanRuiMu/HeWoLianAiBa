import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { debug日志 } from '../utils/debug日志'
import { liaoTianXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import { 数据库 } from '../数据库'

const luYou = Router()

const LIAO_TIAN_BEI_JING_YU_SHE = new Set(['moRen', 'miWuSenLin', 'haiYangZhiLan', 'fenSeMengJing', 'yeKongXingHe', 'miSeTianYuan'])

async function queBaoSheZhiHang(yongHuId: string): Promise<Record<string, unknown>> {
  await 数据库.query(
    `INSERT INTO "用户设置" ("用户ID") VALUES ($1) ON CONFLICT ("用户ID") DO NOTHING`,
    [yongHuId],
  )
  const jieGuo = await 数据库.query(`SELECT * FROM "用户设置" WHERE "用户ID" = $1 LIMIT 1`, [yongHuId])
  return jieGuo.rows[0] as Record<string, unknown>
}

luYou.get('/', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    const sheZhi = await queBaoSheZhiHang(yongHu.yongHuId)
    const yongHuHang = await 数据库.query(
      `SELECT "ID", "手机号", "用户名", "昵称", "头像", "签名", "签名可见性", "签名白名单" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
      [yongHu.yongHuId],
    )
    const hang = yongHuHang.rows[0] as Record<string, unknown> | undefined
    const baiMingDanRaw = hang?.['签名白名单']
    return chengGongXiangYing(xiangYing, {
      uid: yongHu.yongHuId,
      shou_ji_hao: String(hang?.['手机号'] || ''),
      tou_xiang: hang?.['头像'] ? String(hang['头像']) : null,
      qian_ming: hang?.['签名'] ? String(hang['签名']) : null,
      qian_ming_ke_jian_xing: typeof hang?.['签名可见性'] === 'string' ? String(hang['签名可见性']) : 'gong_kai',
      qian_ming_bai_ming_dan: Array.isArray(baiMingDanRaw) ? baiMingDanRaw.map((x) => String(x)) : [],
      liao_tian_bei_jing: String(sheZhi['聊天背景'] || 'moRen'),
      gong_kai_zhang_hao: sheZhi['公开账号'] !== false,
      gong_kai_shou_ji_hao: sheZhi['公开手机号'] === true,
      gong_kai_you_xiang: sheZhi['公开邮箱'] === true,
      bang_ding_you_xiang: String(sheZhi['绑定邮箱'] || ''),
    })
  } catch (cuoWu) {
    debug日志.error('用户设置接口', '查询设置失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.put('/聊天背景', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const body = qingQiu.body as Record<string, unknown>
  const beiJing = typeof body['beiJing'] === 'string' ? body['beiJing'] : typeof body['bei_jing'] === 'string' ? String(body['bei_jing']) : ''
  if (!LIAO_TIAN_BEI_JING_YU_SHE.has(beiJing)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  }
  try {
    await queBaoSheZhiHang(yongHu.yongHuId)
    await 数据库.query(`UPDATE "用户设置" SET "聊天背景" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [beiJing, yongHu.yongHuId])
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('用户设置接口', '保存聊天背景失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.put('/隐私', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const body = qingQiu.body as Record<string, unknown>
  const quZhi = (jian: string, xiaHuaJian: string): boolean | null => {
    if (typeof body[jian] === 'boolean') return body[jian] as boolean
    if (typeof body[xiaHuaJian] === 'boolean') return body[xiaHuaJian] as boolean
    return null
  }
  const gongKaiZhangHao = quZhi('gongKaiZhangHao', 'gong_kai_zhang_hao')
  const gongKaiShouJi = quZhi('gongKaiShouJiHao', 'gong_kai_shou_ji_hao')
  const gongKaiYouXiang = quZhi('gongKaiYouXiang', 'gong_kai_you_xiang')
  try {
    await queBaoSheZhiHang(yongHu.yongHuId)
    if (gongKaiZhangHao !== null) {
      await 数据库.query(`UPDATE "用户设置" SET "公开账号" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [gongKaiZhangHao, yongHu.yongHuId])
    }
    if (gongKaiShouJi !== null) {
      await 数据库.query(`UPDATE "用户设置" SET "公开手机号" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [gongKaiShouJi, yongHu.yongHuId])
    }
    if (gongKaiYouXiang !== null) {
      await 数据库.query(`UPDATE "用户设置" SET "公开邮箱" = $1, "更新时间" = NOW() WHERE "用户ID" = $2`, [gongKaiYouXiang, yongHu.yongHuId])
    }
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('用户设置接口', '保存隐私设置失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/排位/清空', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    await 数据库.query(`DELETE FROM "挑战积分" WHERE "用户ID" = $1`, [yongHu.yongHuId])
    await 数据库.query(`DELETE FROM "挑战对局" WHERE "用户ID" = $1`, [yongHu.yongHuId])
    await queBaoSheZhiHang(yongHu.yongHuId)
    await 数据库.query(`UPDATE "用户设置" SET "清空排位时间" = NOW(), "更新时间" = NOW() WHERE "用户ID" = $1`, [yongHu.yongHuId])
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('用户设置接口', '清空排位赛数据失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
