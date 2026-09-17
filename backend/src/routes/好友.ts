import { Router } from 'express'
import type { Response } from 'express'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { debug日志 } from '../utils/debug日志'
import { liaoTianXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import { 数据库 } from '../数据库'
import { yanZhengUUID } from '../utils/验证'
import { panDuanKeJian, shiHeFaKeJianXing } from '../services/可见性'
import { shenHeNeiRongAnQuan } from '../services/安全审核'
import { chaXunZhangHaoFengJin, jiLuZhangHaoWeiGui } from '../services/账号封禁'
import { 获取IP } from '../services/IP封禁'

const luYou = Router()

function huoQuZiFuChuan(body: Record<string, unknown>, jian: string): string {
  const zhi = body[jian]
  return typeof zhi === 'string' ? zhi : ''
}

function yanMaShouJiHao(wenBen: string, gongKai: boolean): string {
  if (gongKai) return wenBen
  if (/^1[3-9]\d{9}$/.test(wenBen)) return `${wenBen.slice(0, 3)}****${wenBen.slice(7)}`
  return wenBen
}

async function shiHaoYou(a: string, b: string): Promise<boolean> {
  const jieGuo = await 数据库.query(
    `SELECT 1 FROM "好友申请" WHERE "状态" = 'accepted' AND (("申请者ID" = $1 AND "接收者ID" = $2) OR ("申请者ID" = $2 AND "接收者ID" = $1)) LIMIT 1`,
    [a, b],
  )
  return jieGuo.rows.length > 0
}

luYou.get('/搜索', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const guanJianZi = String(qingQiu.query.q || '').trim().slice(0, 50)
  if (!guanJianZi) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'queShaoCanShu'), 'CAN_SHU_CUO_WU')
  // YH-028 好友搜索统一码：命中与未命中返回同一成功形态，禁404探测枚举
  if (!yanZhengUUID(guanJianZi) && !/^1[3-9]\d{9}$/.test(guanJianZi) && !/^[\u4e00-\u9fa5A-Za-z0-9_-]{1,30}$/.test(guanJianZi)) {
    return chengGongXiangYing(xiangYing, { lie_biao: [] })
  }
  try {
    const jieGuo = await 数据库.query(
      `SELECT u."ID", u."手机号", u."用户名", u."昵称", u."头像", u."签名", u."签名可见性", u."签名白名单", s."公开账号", s."公开手机号"
       FROM "用户" u LEFT JOIN "用户设置" s ON s."用户ID" = u."ID"
       WHERE (u."手机号" = $1 OR u."用户名" = $1 OR u."ID"::text = $1) AND u."ID" <> $2 LIMIT 10`,
      [guanJianZi, yongHu.yongHuId],
    )
    const lieBiao = []
    for (const row of jieGuo.rows) {
      if (row['公开账号'] === false) continue
      const duiFangId = String(row['ID'])
      const youShiHaoYou = await shiHaoYou(yongHu.yongHuId, duiFangId)
      const keJianXingRaw = row['签名可见性']
      const keJianXing = shiHeFaKeJianXing(keJianXingRaw) ? keJianXingRaw : 'gong_kai'
      const baiMingDanRaw = row['签名白名单']
      const baiMingDan = Array.isArray(baiMingDanRaw) ? baiMingDanRaw.map((x) => String(x)) : []
      const qianMing = row['签名']
        ? panDuanKeJian(keJianXing, {
            chaKanZheId: yongHu.yongHuId,
            yongYouZheId: duiFangId,
            shiHaoYou: youShiHaoYou,
            baiMingDan,
          })
          ? String(row['签名'])
          : null
        : null
      lieBiao.push({
        id: duiFangId,
        yong_hu_ming: row['用户名'],
        ni_cheng: row['昵称'],
        tou_xiang: row['头像'],
        qian_ming: qianMing,
        shou_ji_hao: yanMaShouJiHao(String(row['手机号'] || ''), row['公开手机号'] === true),
        shi_hao_you: youShiHaoYou,
      })
    }
    if (!lieBiao.length) return chengGongXiangYing(xiangYing, { lie_biao: [] })
    return chengGongXiangYing(xiangYing, { lie_biao: lieBiao })
  } catch (cuoWu) {
    debug日志.error('好友接口', '搜索用户失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/申请', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const body = qingQiu.body as Record<string, unknown>
  const jieShouZheId = huoQuZiFuChuan(body, 'jieShouZheId') || huoQuZiFuChuan(body, 'jie_shou_zhe_id')
  if (!yanZhengUUID(jieShouZheId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  if (jieShouZheId === yongHu.yongHuId) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('haoYou', 'buNengTianJiaZiJi'))
  try {
    const muBiao = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "ID" = $1 LIMIT 1`, [jieShouZheId])
    if (!muBiao.rows.length) return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    const sheZhi = await 数据库.query(`SELECT "公开账号" FROM "用户设置" WHERE "用户ID" = $1 LIMIT 1`, [jieShouZheId])
    if (sheZhi.rows.length > 0 && sheZhi.rows[0]['公开账号'] === false) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('haoYou', 'duiFangJuJueTianJia'))
    }
    if (await shiHaoYou(yongHu.yongHuId, jieShouZheId)) {
      return shiBaiXiangYing(xiangYing, 409, huoQuFanYi('haoYou', 'yiShiHaoYou'))
    }
    const yiCun = await 数据库.query(
      `SELECT "ID", "状态" FROM "好友申请" WHERE (("申请者ID" = $1 AND "接收者ID" = $2) OR ("申请者ID" = $2 AND "接收者ID" = $1)) AND "状态" = 'pending' LIMIT 1`,
      [yongHu.yongHuId, jieShouZheId],
    )
    if (yiCun.rows.length > 0) {
      return shiBaiXiangYing(xiangYing, 409, huoQuFanYi('haoYou', 'yiFaSongShenQing'))
    }
    await 数据库.query(
      `INSERT INTO "好友申请" ("申请者ID", "接收者ID", "状态") VALUES ($1, $2, 'pending')
       ON CONFLICT ("申请者ID", "接收者ID") DO UPDATE SET "状态" = 'pending', "更新时间" = NOW()`,
      [yongHu.yongHuId, jieShouZheId],
    )
    try {
      const { chuangJianTongZhi } = await import('../services/通知')
      await chuangJianTongZhi({ jie_shou_zhe_id: jieShouZheId, biao_ti: '新的好友申请', nei_rong: '有人请求添加你为好友，请前往好友列表确认' })
    } catch {
      /* 通知失败不阻断申请 */
    }
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('好友接口', '发送好友申请失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/申请/收到的', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    const jieGuo = await 数据库.query(
      `SELECT a."ID", a."申请者ID", a."创建时间", u."用户名", u."昵称", u."头像"
       FROM "好友申请" a JOIN "用户" u ON u."ID" = a."申请者ID"
       WHERE a."接收者ID" = $1 AND a."状态" = 'pending' ORDER BY a."创建时间" DESC LIMIT 50`,
      [yongHu.yongHuId],
    )
    return chengGongXiangYing(xiangYing, {
      lie_biao: jieGuo.rows.map((r) => ({
        id: String(r['ID']),
        shen_qing_zhe_id: String(r['申请者ID']),
        yong_hu_ming: r['用户名'],
        ni_cheng: r['昵称'],
        tou_xiang: r['头像'],
        chuang_jian_shi_jian: r['创建时间'],
      })),
    })
  } catch (cuoWu) {
    debug日志.error('好友接口', '查询收到的申请失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/申请/发出的', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    const jieGuo = await 数据库.query(
      `SELECT a."ID", a."接收者ID", a."状态", a."创建时间", u."用户名", u."昵称", u."头像"
       FROM "好友申请" a JOIN "用户" u ON u."ID" = a."接收者ID"
       WHERE a."申请者ID" = $1 AND a."状态" = 'pending' ORDER BY a."创建时间" DESC LIMIT 50`,
      [yongHu.yongHuId],
    )
    return chengGongXiangYing(xiangYing, {
      lie_biao: jieGuo.rows.map((r) => ({
        id: String(r['ID']),
        jie_shou_zhe_id: String(r['接收者ID']),
        zhuang_tai: r['状态'],
        yong_hu_ming: r['用户名'],
        ni_cheng: r['昵称'],
        tou_xiang: r['头像'],
        chuang_jian_shi_jian: r['创建时间'],
      })),
    })
  } catch (cuoWu) {
    debug日志.error('好友接口', '查询发出的申请失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/申请/:id/接受', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const shenQingId = String(qingQiu.params.id || '')
  if (!yanZhengUUID(shenQingId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  try {
    const jieGuo = await 数据库.query(
      `UPDATE "好友申请" SET "状态" = 'accepted', "更新时间" = NOW()
       WHERE "ID" = $1 AND "接收者ID" = $2 AND "状态" = 'pending' RETURNING "申请者ID"`,
      [shenQingId, yongHu.yongHuId],
    )
    if (!jieGuo.rows.length) return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('haoYou', 'shenQingBuCunZai'))
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('好友接口', '接受好友申请失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/申请/:id/拒绝', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const shenQingId = String(qingQiu.params.id || '')
  if (!yanZhengUUID(shenQingId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  try {
    const jieGuo = await 数据库.query(
      `UPDATE "好友申请" SET "状态" = 'rejected', "更新时间" = NOW()
       WHERE "ID" = $1 AND "接收者ID" = $2 AND "状态" = 'pending' RETURNING "ID"`,
      [shenQingId, yongHu.yongHuId],
    )
    if (!jieGuo.rows.length) return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('haoYou', 'shenQingBuCunZai'))
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('好友接口', '拒绝好友申请失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.get('/列表', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  try {
    const jieGuo = await 数据库.query(
      `SELECT DISTINCT CASE WHEN a."申请者ID" = $1 THEN a."接收者ID" ELSE a."申请者ID" END AS "好友ID",
        u."用户名", u."昵称", u."头像", u."签名", u."签名可见性", u."签名白名单"
       FROM "好友申请" a JOIN "用户" u ON u."ID" = CASE WHEN a."申请者ID" = $1 THEN a."接收者ID" ELSE a."申请者ID" END
       WHERE a."状态" = 'accepted' AND (a."申请者ID" = $1 OR a."接收者ID" = $1) ORDER BY "好友ID" LIMIT 200`,
      [yongHu.yongHuId],
    )
    return chengGongXiangYing(xiangYing, {
      lie_biao: jieGuo.rows.map((r) => {
        const haoYouId = String(r['好友ID'])
        const keJianXingRaw = r['签名可见性']
        const keJianXing = shiHeFaKeJianXing(keJianXingRaw) ? keJianXingRaw : 'gong_kai'
        const baiMingDanRaw = r['签名白名单']
        const baiMingDan = Array.isArray(baiMingDanRaw) ? baiMingDanRaw.map((x) => String(x)) : []
        const qianMing = r['签名']
          ? panDuanKeJian(keJianXing, {
              chaKanZheId: yongHu.yongHuId,
              yongYouZheId: haoYouId,
              shiHaoYou: true,
              baiMingDan,
            })
            ? String(r['签名'])
            : null
          : null
        return {
          id: haoYouId,
          yong_hu_ming: r['用户名'],
          ni_cheng: r['昵称'],
          tou_xiang: r['头像'],
          qian_ming: qianMing,
        }
      }),
    })
  } catch (cuoWu) {
    debug日志.error('好友接口', '查询好友列表失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.delete('/:haoYouId', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const haoYouId = String(qingQiu.params.haoYouId || '')
  if (!yanZhengUUID(haoYouId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  try {
    await 数据库.query(
      `UPDATE "好友申请" SET "状态" = 'rejected', "更新时间" = NOW()
       WHERE "状态" = 'accepted' AND (("申请者ID" = $1 AND "接收者ID" = $2) OR ("申请者ID" = $2 AND "接收者ID" = $1))`,
      [yongHu.yongHuId, haoYouId],
    )
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('好友接口', '删除好友失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

const HAO_YOU_XIAO_XI_LEI_XING = new Set(['wenben', 'tuPian', 'yuYin', 'wenJian', 'biaoQingBao'])

luYou.get('/消息/:haoYouId', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const haoYouId = String(qingQiu.params.haoYouId || '')
  if (!yanZhengUUID(haoYouId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  const xianZhi = Math.max(1, Math.min(50, parseInt(String(qingQiu.query.limit || '20'), 10) || 20))
  try {
    if (!(await shiHaoYou(yongHu.yongHuId, haoYouId))) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('haoYou', 'feiHaoYou'))
    }
    const jieGuo = await 数据库.query(
      `SELECT "ID", "发送者ID", "接收者ID", "内容", "类型", "媒体ID", "已读", "撤回", "创建时间"
       FROM "好友消息" WHERE (("发送者ID" = $1 AND "接收者ID" = $2) OR ("发送者ID" = $2 AND "接收者ID" = $1))
       ORDER BY "创建时间" DESC LIMIT $3`,
      [yongHu.yongHuId, haoYouId, xianZhi],
    )
    return chengGongXiangYing(xiangYing, {
      lie_biao: jieGuo.rows
        .map((r) => ({
          id: String(r['ID']),
          fa_song_zhe_id: String(r['发送者ID']),
          jie_shou_zhe_id: String(r['接收者ID']),
          nei_rong: r['撤回'] ? '' : String(r['内容'] || ''),
          lei_xing: String(r['类型']),
          mei_ti_id: r['媒体ID'] ? String(r['媒体ID']) : null,
          yi_du: r['已读'] === true,
          yi_che_hui: r['撤回'] === true,
          shi_jian_chuo: new Date(r['创建时间']).getTime(),
        }))
        .reverse(),
    })
  } catch (cuoWu) {
    debug日志.error('好友接口', '查询好友消息失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.post('/消息', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const body = qingQiu.body as Record<string, unknown>
  const jieShouZheId = huoQuZiFuChuan(body, 'jieShouZheId') || huoQuZiFuChuan(body, 'jie_shou_zhe_id')
  const neiRong = (huoQuZiFuChuan(body, 'neiRong') || huoQuZiFuChuan(body, 'nei_rong')).trim().slice(0, 500)
  const leiXing = huoQuZiFuChuan(body, 'leiXing') || huoQuZiFuChuan(body, 'lei_xing') || 'wenben'
  const meiTiId = huoQuZiFuChuan(body, 'meiTiId') || huoQuZiFuChuan(body, 'mei_ti_id') || null
  if (!yanZhengUUID(jieShouZheId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  if (!HAO_YOU_XIAO_XI_LEI_XING.has(leiXing)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  if (!neiRong && !meiTiId) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('haoYou', 'xiaoXiWeiKong'))
  try {
    if (!(await shiHaoYou(yongHu.yongHuId, jieShouZheId))) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('haoYou', 'feiHaoYou'))
    }
    // 任务3：账号封禁中禁止发送好友消息；文本先审后存，违规拦截在落库前
    const haoYouFengJin = await chaXunZhangHaoFengJin(yongHu.yongHuId)
    if (haoYouFengJin.beiFengJin) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
    }
    // YH-013 好友媒体IDOR+审核绕过：复用AI链路媒体归属函数统一校验+不可用统一拦截
    const { yanZhengHaoYouMeiTiGuiShu } = await import('../services/好友媒体')
    if (leiXing !== 'wenben' || meiTiId) {
      if (!meiTiId || !yanZhengUUID(meiTiId)) {
        return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu'))
      }
      const guiShu = await yanZhengHaoYouMeiTiGuiShu(meiTiId, yongHu.yongHuId)
      if (!guiShu.he_fa) {
        return shiBaiXiangYing(xiangYing, 400, guiShu.ti_shi)
      }
    }
    if (neiRong) {
      let shenHe: Awaited<ReturnType<typeof shenHeNeiRongAnQuan>>
      try {
        shenHe = await shenHeNeiRongAnQuan(neiRong)
      } catch (cuoWu) {
        debug日志.error('好友接口', '好友消息审核异常拦截', { xiang_qing: { cuo_wu: String(cuoWu) } })
        return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
      // YH-013 统一审核不可用策略：与AI链路一致降级拦截（文本不可用=不可发）
      // 注意：VITEST无mock外呼时审核必回不可用，测试链路用sheZhiMockTiaoYong注入后通过
      if (shenHe.wei_gui) {
        if (shenHe.lei_xing !== '审核服务不可用') {
          await jiLuZhangHaoWeiGui({
            yongHuId: yongHu.yongHuId,
            ip: 获取IP(qingQiu),
            yuanYin: shenHe.li_you || shenHe.lei_xing || '内容违规',
            leiXing: '好友聊天',
          })
          return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'xiaoXiNeiRongWeiGui'))
        }
        return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
    }
    // YH-013 纯媒体零审核：媒体消息同样走AI归属审核函数（查库归属已在上步完成，此处补文本化审核）
    if (!neiRong && meiTiId) {
      const { shenHeHaoYouMeiTi } = await import('../services/好友媒体')
      const meiTiShenHe = await shenHeHaoYouMeiTi(meiTiId)
      if (meiTiShenHe.wei_gui) {
        if (meiTiShenHe.lei_xing !== '审核服务不可用') {
          await jiLuZhangHaoWeiGui({
            yongHuId: yongHu.yongHuId,
            ip: 获取IP(qingQiu),
            yuanYin: meiTiShenHe.li_you || meiTiShenHe.lei_xing || '媒体违规',
            leiXing: '好友媒体',
          })
          return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'xiaoXiNeiRongWeiGui'))
        }
        return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
    }
    const chaRu = await 数据库.query(
      `INSERT INTO "好友消息" ("发送者ID", "接收者ID", "内容", "类型", "媒体ID") VALUES ($1, $2, $3, $4, $5) RETURNING "ID", "创建时间"`,
      [yongHu.yongHuId, jieShouZheId, neiRong, leiXing, meiTiId || null],
    )
    try {
      const { chuangJianTongZhi } = await import('../services/通知')
      await chuangJianTongZhi({ jie_shou_zhe_id: jieShouZheId, biao_ti: '新的好友消息', nei_rong: neiRong.slice(0, 50) || '你收到一条新的好友消息' })
    } catch {
      /* 通知失败不阻断发送 */
    }
    return chengGongXiangYing(xiangYing, {
      id: String(chaRu.rows[0]['ID']),
      shi_jian_chuo: new Date(chaRu.rows[0]['创建时间']).getTime(),
    })
  } catch (cuoWu) {
    debug日志.error('好友接口', '发送好友消息失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.put('/消息/:id/撤回', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const xiaoXiId = String(qingQiu.params.id || '')
  if (!yanZhengUUID(xiaoXiId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  try {
    const chaXun = await 数据库.query(`SELECT "发送者ID", "创建时间" FROM "好友消息" WHERE "ID" = $1 LIMIT 1`, [xiaoXiId])
    if (!chaXun.rows.length) return shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
    if (String(chaXun.rows[0]['发送者ID']) !== yongHu.yongHuId) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('haoYou', 'wuQuanXian'))
    }
    if (Date.now() - new Date(chaXun.rows[0]['创建时间']).getTime() > 2 * 60 * 1000) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('haoYou', 'cheHuiChaoShi'))
    }
    await 数据库.query(`UPDATE "好友消息" SET "撤回" = TRUE WHERE "ID" = $1`, [xiaoXiId])
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('好友接口', '撤回好友消息失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

luYou.put('/消息/已读/:haoYouId', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const haoYouId = String(qingQiu.params.haoYouId || '')
  if (!yanZhengUUID(haoYouId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  try {
    await 数据库.query(`UPDATE "好友消息" SET "已读" = TRUE WHERE "发送者ID" = $1 AND "接收者ID" = $2 AND "已读" = FALSE`, [
      haoYouId,
      yongHu.yongHuId,
    ])
    return chengGongXiangYing(xiangYing, { cheng_gong: true })
  } catch (cuoWu) {
    debug日志.error('好友接口', '标记好友消息已读失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

export default luYou
