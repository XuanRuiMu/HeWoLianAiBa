import { Router } from 'express'
import type { Response } from 'express'
import Busboy from 'busboy'
import { huoQuFanYi } from '../config/translations'
import { chengGongXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { debug日志 } from '../utils/debug日志'
import { liaoTianXianLiu } from '../middleware/限流'
import type { RenZhengQingQiu } from '../middleware/认证'
import { 数据库 } from '../数据库'
import { yanZhengUUID } from '../utils/验证'
import { SHEN_HE_FU_WU_BU_KE_YONG_JIAN, YUN_XU_XIAO_XI_LEI_XING, shiHaoYouShangChuanLeiBie } from '../config/媒体配置'
import { liuShiBaoCunMeiTi, MeiTiCunChuCuoWu, shengChengQianMingURL } from '../services/媒体存储'
import { panDingMeiTiShenHeChuCan } from '../services/媒体审核出参'
import { panDuanKeJian, shiHeFaKeJianXing } from '../services/可见性'
import { shenHeNeiRongAnQuan } from '../services/安全审核'
import { chaXunZhangHaoFengJin, jiLuZhangHaoWeiGui } from '../services/账号封禁'
import { 获取IP } from '../services/IP封禁'
// FP-21：内容块与引用槽一律复用 AI 链路那**一份**算式（清洗 / 派生 / 裁定 / 投影全在 services/消息.ts）。
// 好友侧不得再写第二份 —— 两页两套判定必然漂移，正是 R5 病灶的原形态。
import {
  HAO_YOU_BEI_YIN_YONG_MIAN_XIANG,
  gouKuaiShangXiaWen,
  haoYouKuaiTouYing,
  qingLiXiaoXiKuaiXieRu,
  yanZhengBeiYinYong,
  yingSheKuaiChuCan,
  type KuaiShangXiaWen,
} from '../services/消息'
import { kuaiShenHeWenBen } from '../services/消息内容块'
import type { HaoYouXiaoXiChuCan } from '../types'

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
      await chuangJianTongZhi({ jie_shou_zhe_id: jieShouZheId, biao_ti: huoQuFanYi('tongZhi', 'xinHaoYouShenQingBiaoTi'), nei_rong: huoQuFanYi('tongZhi', 'xinHaoYouShenQingZhengWen') })
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

/**
 * 好友消息类型白名单：与 AI 链路同一个单源清单 config/媒体配置.ts::YUN_XU_XIAO_XI_LEI_XING，
 * 也与迁移 027 给 好友消息.类型 加的 CHECK 同集合（等值由 迁移027好友媒体列.test.ts 把守）。
 * 三处一旦各写一份，就会出现「网页能发、库里拒收」或反之的跨端不一致。
 */
const HAO_YOU_XIAO_XI_LEI_XING = new Set<string>(YUN_XU_XIAO_XI_LEI_XING)

/**
 * 本路由用到的好友消息语句。导出是为了让真库测试原样执行同一串 SQL，
 * 不存在「测试跑通、路由里是另一串」（同 routes/表情.ts::BIAO_QING_YU_JU 的口径）。
 */
export const HAO_YOU_YU_JU = {
  查消息列表: `
  SELECT m."ID", m."发送者ID", m."接收者ID", m."内容", m."类型", m."媒体ID",
         m."已读", m."撤回", m."创建时间", m."内容块", m."被引用消息ID",
         f."SHA256", f."类别", f."原始文件名", f."大小字节"
    FROM "好友消息" m
    LEFT JOIN "媒体文件" f ON f."ID" = m."媒体ID"
   WHERE ((m."发送者ID" = $1 AND m."接收者ID" = $2)
       OR (m."发送者ID" = $2 AND m."接收者ID" = $1))
   ORDER BY m."创建时间" DESC LIMIT $3`,
  插入消息: `
  INSERT INTO "好友消息" ("发送者ID", "接收者ID", "内容", "类型", "媒体ID", "内容块", "被引用消息ID")
  VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
  RETURNING "ID", "创建时间"`,
} as const

/**
 * FP-21 出参收口：媒体引用换成**绑定读者**的新鲜签名 URL（同 services/消息.ts::yingSheXiaoXi 的
 * 签发口径，读者用户编号进 HMAC，故 URL 换不了人、也不可枚举）。
 * 已撤回的消息既不回内容也不回媒体地址——撤回语义是「对方再也看不到这条」，
 * 留着 URL 等于让撤回失效（媒体读取判定 services/媒体存储.ts::MEI_TI_KE_DU_YU_JU 同步排除撤回行）。
 * FP-21（迁移 036）追加两键，口径与 AI 侧逐字同构：
 *  - `nei_rong_kuai` 恒非空：投影算式就是 AI 侧那一份 `yingSheKuaiChuCan`（好友面只交出
 *    「撤回列名 + 签名主体是读者 + 本行 JOIN 媒体用的原始列名」这三个差异点）；
 *    撤回行只给一条与 `nei_rong` 逐字相同的空文字块，图文顺序里含着的正文与图片不外泄；
 *  - `bei_yong_xiao_xi_id` 恒在（未引用为 null 而非缺键），且**只给身份不给摘要副本**。
 */
function yingSheHaoYouXiaoXi(
  row: Record<string, unknown>,
  duZheId: string,
  kuaiShangXiaWen: KuaiShangXiaWen,
): HaoYouXiaoXiChuCan {
  const yiCheHui = row['撤回'] === true
  const sha256 = row['SHA256'] ? String(row['SHA256']).toLowerCase() : ''
  return {
    id: String(row['ID']),
    fa_song_zhe_id: String(row['发送者ID']),
    jie_shou_zhe_id: String(row['接收者ID']),
    nei_rong: yiCheHui ? '' : String(row['内容'] || ''),
    lei_xing: String(row['类型']),
    nei_rong_kuai: yingSheKuaiChuCan(row, kuaiShangXiaWen, '', haoYouKuaiTouYing(duZheId)),
    bei_yong_xiao_xi_id: row['被引用消息ID'] ? String(row['被引用消息ID']) : null,
    mei_ti_id: yiCheHui || !row['媒体ID'] ? null : String(row['媒体ID']),
    mei_ti_url: yiCheHui || sha256 === '' ? null : shengChengQianMingURL(sha256, duZheId),
    mei_ti_lei_bie: yiCheHui || !row['类别'] ? null : String(row['类别']),
    mei_ti_yuan_shi_wen_jian_ming:
      yiCheHui || !row['原始文件名'] ? null : String(row['原始文件名']),
    mei_ti_da_xiao_zi_jie: yiCheHui || row['大小字节'] == null ? null : Number(row['大小字节']),
    yi_du: row['已读'] === true,
    yi_che_hui: yiCheHui,
    shi_jian_chuo: new Date(row['创建时间'] as string | Date).getTime(),
  }
}

luYou.get('/消息/:haoYouId', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const haoYouId = String(qingQiu.params.haoYouId || '')
  if (!yanZhengUUID(haoYouId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  const xianZhi = Math.max(1, Math.min(50, parseInt(String(qingQiu.query.limit || '20'), 10) || 20))
  try {
    // 归属先判好友关系：非好友拿不到消息，也拿不到任何签名 URL
    if (!(await shiHaoYou(yongHu.yongHuId, haoYouId))) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('haoYou', 'feiHaoYou'))
    }
    const jieGuo = await 数据库.query(HAO_YOU_YU_JU.查消息列表, [yongHu.yongHuId, haoYouId, xianZhi])
    const hangLie = jieGuo.rows as Record<string, unknown>[]
    // 块里的图片要出签名地址就得拿到每个媒体 ID 的 SHA256 与类别：按页一次性批量补查（禁逐条 N+1）。
    // 取数口与 AI 侧同为 services/消息.ts::gouKuaiShangXiaWen（好友面只交出列名/签名主体这几个差异点）。
    const kuaiShangXiaWen = await gouKuaiShangXiaWen(hangLie, haoYouKuaiTouYing(yongHu.yongHuId))
    return chengGongXiangYing(xiangYing, {
      lie_biao: hangLie
        .map((r) => yingSheHaoYouXiaoXi(r, yongHu.yongHuId, kuaiShangXiaWen))
        .reverse(),
    })
  } catch (cuoWu) {
    debug日志.error('好友接口', '查询好友消息失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
})

/**
 * FP-21 好友媒体上传。与 AI 链路的 POST /api/聊天/会话/:huiHuaId/媒体 的根本区别：
 * 归属校验只看「好友关系 + 双方用户编号」，**不接受任何会话编号**（好友会话不是 AI 会话，
 * 拿 huiHuaId 当身份用会把归属判成别人，见 PROGRESS L-22）。
 * 存储侧零新实现：仍走唯一入口 services/媒体存储.ts::liuShiBaoCunMeiTi
 * （SHA256 内容寻址 + 大小/MIME 白名单 + 魔数嗅探 + 查毒 + 视觉审核 + 违规销毁都在它里面）。
 * 本路由自带的白名单只有「类别」这一项（HAO_YOU_SHANG_CHUAN_LEI_BIE），
 * 不再抄一份字节上限或 MIME 清单——两页两套白名单必然漂移。
 * 参数全走 query 而非 multipart 字段：busboy 的 field 事件可能晚于 file 到达，
 * 若在 file 回调里才拿到接收者，归属校验就发生在读完文件体之后，非法请求已消耗了带宽。
 */
luYou.post('/媒体', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))

  const fengJin = await chaXunZhangHaoFengJin(yongHu.yongHuId)
  if (fengJin.beiFengJin) {
    return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
  }

  const leiBie = String(qingQiu.query.leiBie ?? '')
  if (!shiHaoYouShangChuanLeiBie(leiBie)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiLeiXingFeiFa'))
  }

  const jieShouZheId = String(qingQiu.query.jieShouZheId ?? qingQiu.query.jie_shou_zhe_id ?? '')
  if (!yanZhengUUID(jieShouZheId)) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  }
  if (jieShouZheId === yongHu.yongHuId) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('haoYou', 'buNengTianJiaZiJi'))
  }
  try {
    if (!(await shiHaoYou(yongHu.yongHuId, jieShouZheId))) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('haoYou', 'feiHaoYou'))
    }
  } catch (cuoWu) {
    debug日志.error('好友接口', '好友媒体上传前好友关系校验失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }

  const contentType = String(qingQiu.headers['content-type'] || '')
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiQueShaoWenJian'))
  }

  await new Promise<void>((jieJue) => {
    let yiXiangYing = false
    let chuLiGuoWenJian = false
    const huiYing = (zhi: () => void) => {
      if (yiXiangYing) return
      yiXiangYing = true
      zhi()
    }
    // defParamCharset: 'utf8' —— 中文文件名按 RFC 5987 UTF-8 解码，与 AI 链路同一口径
    const busboy = Busboy({ headers: qingQiu.headers, defParamCharset: 'utf8', limits: { files: 1 } })

    busboy.on('file', (_fieldMing, wenJianLiu, xinXi) => {
      if (yiXiangYing || chuLiGuoWenJian) {
        wenJianLiu.resume()
        return
      }
      chuLiGuoWenJian = true
      liuShiBaoCunMeiTi(wenJianLiu, xinXi.filename || 'weimingming', xinXi.mimeType || '', leiBie, yongHu.yongHuId)
        .then((jieGuo) => {
          huiYing(() =>
            chengGongXiangYing(xiangYing, {
              mediaId: jieGuo.mediaId,
              sha256: jieGuo.sha256,
              mime: jieGuo.mime,
              daXiao: jieGuo.daXiao,
              leiBie: jieGuo.leiBie,
              yuanShiWenJianMing: jieGuo.yuanShiWenJianMing,
              mei_ti_url: shengChengQianMingURL(jieGuo.sha256, yongHu.yongHuId),
            }),
          )
        })
        .catch(async (cuoWu) => {
          if (cuoWu instanceof MeiTiCunChuCuoWu) {
            const jian = String(cuoWu.fanYiJian)
            const chuCan = panDingMeiTiShenHeChuCan(jian)
            // 审核服务自身不可用不是用户的错 ⇒ 不记账号违规（与 AI/表情链路口径一致）
            if (chuCan.xuYaoJiWeiGui) {
              await jiLuZhangHaoWeiGui({
                yongHuId: yongHu.yongHuId,
                ip: 获取IP(qingQiu),
                yuanYin: jian,
                leiXing: '好友媒体',
              })
            }
            huiYing(() => shiBaiXiangYing(xiangYing, chuCan.zhuangTaiMa, chuCan.tiShi))
            return
          }
          debug日志.error('好友接口', '好友媒体上传失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
          huiYing(() => shiBaiXiangYing(xiangYing, 500, huoQuFanYi('liaoTian', 'meiTiShangChuanShiBai')))
        })
        .finally(() => {
          // 校验失败时服务可能未消费文件流；排空以免 busboy 因背压挂起
          if (!wenJianLiu.readableEnded) wenJianLiu.resume()
        })
    })

    busboy.on('error', (cuoWu) => {
      debug日志.error('好友接口', '好友媒体解析失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      huiYing(() => shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa')))
    })

    busboy.on('close', () => {
      if (!chuLiGuoWenJian) {
        huiYing(() => shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiQueShaoWenJian')))
      }
      jieJue()
    })

    qingQiu.pipe(busboy)
  })
})

luYou.post('/消息', liaoTianXianLiu, async (qingQiu: RenZhengQingQiu, xiangYing: Response) => {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) return shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
  const body = qingQiu.body as Record<string, unknown>
  const jieShouZheId = huoQuZiFuChuan(body, 'jieShouZheId') || huoQuZiFuChuan(body, 'jie_shou_zhe_id')
  const yuanNeiRong = (huoQuZiFuChuan(body, 'neiRong') || huoQuZiFuChuan(body, 'nei_rong')).trim().slice(0, 500)
  const yuanLeiXing = huoQuZiFuChuan(body, 'leiXing') || huoQuZiFuChuan(body, 'lei_xing') || 'wenben'
  const yuanMeiTiId = huoQuZiFuChuan(body, 'meiTiId') || huoQuZiFuChuan(body, 'mei_ti_id') || null
  if (!yanZhengUUID(jieShouZheId)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  if (!HAO_YOU_XIAO_XI_LEI_XING.has(yuanLeiXing)) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
  // FP-21（迁移 036）新增两个入参：内容块 与 引用槽（别名键与 AI 链路逐字相同）。
  // 两者的**判定**都不在本路由里做：块走 services/消息.ts 那一份清洗序列、引用走
  // yanZhengBeiYinYong 那一条裁定（好友面向）。这里只取值，不判形状 —— 判形状就是第二份实现。
  const tiJiaoKuaiZhi = body['nei_rong_kuai'] ?? body['neiRongKuai'] ?? body['内容块']
  const yuanShiBeiYongZhi = body['beiYongXiaoXiId'] ?? body['bei_yong_xiao_xi_id'] ?? body['被引用消息ID']
  try {
    if (!(await shiHaoYou(yongHu.yongHuId, jieShouZheId))) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('haoYou', 'feiHaoYou'))
    }
    // 任务3：账号封禁中禁止发送好友消息；文本先审后存，违规拦截在落库前
    const haoYouFengJin = await chaXunZhangHaoFengJin(yongHu.yongHuId)
    if (haoYouFengJin.beiFengJin) {
      return shiBaiXiangYing(xiangYing, 403, huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
    }
    // FP-21（迁移 036）图文混排：块是唯一真源。清洗与派生一律走 AI 链路那一份
    // （services/消息.ts::qingLiXiaoXiKuaiXieRu：结构清洗 → 长度策略 → 媒体判定 → 丢弃留痕 → 兼容投影）。
    // 带了块 ⇒ 内容/类型/媒体ID 由块派生，客户端同时上报的那三个字段被忽略（不给第二套值留活口）。
    const kuaiXieRu = await qingLiXiaoXiKuaiXieRu(tiJiaoKuaiZhi, yongHu.yongHuId, '好友消息发送')
    if (!kuaiXieRu.cheng_gong) {
      return shiBaiXiangYing(
        xiangYing,
        kuaiXieRu.zhuang_tai_ma ?? 400,
        kuaiXieRu.ti_shi ?? huoQuFanYi('tongYong', 'canShuBuHeFa'),
      )
    }
    const luoKuKuai = kuaiXieRu.kuai
    const jianYing = kuaiXieRu.jianYing
    const leiXing = jianYing ? jianYing.lei_xing : yuanLeiXing
    const meiTiId = jianYing ? jianYing.mei_ti_id : yuanMeiTiId
    const neiRong = jianYing ? jianYing.nei_rong : yuanNeiRong
    // 派生出的类型仍然只认那一份白名单（不给第二套值域留开口）
    if (!HAO_YOU_XIAO_XI_LEI_XING.has(leiXing)) {
      return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'))
    }
    if (!neiRong && !meiTiId) return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('haoYou', 'xiaoXiWeiKong'))
    // 送审文本：有块就取块里用户自己打的那些字 —— 图文混排的文字必须逐字进安全审核，
    // 「带块」绝不是绕过审核的口子（与 routes/消息.ts 的 shenHeWenBen 同一口径）。
    const shenHeWenBen = luoKuKuai ? kuaiShenHeWenBen(luoKuKuai) : neiRong
    // YH-013 好友媒体IDOR+审核绕过：复用AI链路媒体归属函数统一校验+不可用统一拦截
    // 归属之外还判「类型↔类别」对应（tuPian 只能挂 tupian 行），否则前端按图片渲染得到破图。
    // FP-21：这道闸只覆盖**老口径**（无块、单媒体）。带了块时同一件事已由 yingYongMeiTiPanDing
    // 逐块判过（存在 + 归属 + 图像类别）；而图文行的 类型 按投影规则是 wenben 却带着首个图片块的
    // 媒体ID，套老规则会把合法图文消息当成「文本消息带媒体ID」误杀。
    const { yanZhengHaoYouMeiTiGuiShu } = await import('../services/好友媒体')
    if (luoKuKuai === null && (leiXing !== 'wenben' || meiTiId)) {
      if (!meiTiId || !yanZhengUUID(meiTiId)) {
        return shiBaiXiangYing(xiangYing, 400, huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu'))
      }
      const guiShu = await yanZhengHaoYouMeiTiGuiShu(meiTiId, yongHu.yongHuId, leiXing)
      if (!guiShu.he_fa) {
        return shiBaiXiangYing(xiangYing, 400, guiShu.ti_shi)
      }
    }
    if (shenHeWenBen) {
      let shenHe: Awaited<ReturnType<typeof shenHeNeiRongAnQuan>>
      try {
        shenHe = await shenHeNeiRongAnQuan(shenHeWenBen)
      } catch (cuoWu) {
        debug日志.error('好友接口', '好友消息审核异常拦截', { xiang_qing: { cuo_wu: String(cuoWu) } })
        return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
      }
      // YH-013 统一审核不可用策略：与AI链路一致降级拦截（文本不可用=不可发）
      // 注意：VITEST无mock外呼时审核必回不可用，测试链路用sheZhiMockTiaoYong注入后通过
      if (shenHe.wei_gui) {
        if (shenHe.lei_xing !== SHEN_HE_FU_WU_BU_KE_YONG_JIAN) {
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
        if (meiTiShenHe.lei_xing !== SHEN_HE_FU_WU_BU_KE_YONG_JIAN) {
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
    // FP-21 引用槽：裁定一律走 services/消息.ts::yanZhengBeiYinYong 那**一条**判定（好友面向）。
    // 与 AI 侧同理，脏引用绝不容忍成「降级为无引用后继续落库」：幂等键脏了只影响去重，
    // 引用脏了是把别人的对话内容当成本对话渲染出来的越权读取面。六种非法形态一律 4xx。
    const beiYong = await yanZhengBeiYinYong(
      yuanShiBeiYongZhi,
      yongHu.yongHuId,
      jieShouZheId,
      HAO_YOU_BEI_YIN_YONG_MIAN_XIANG,
    )
    if (!beiYong.cheng_gong) {
      return shiBaiXiangYing(
        xiangYing,
        beiYong.zhuang_tai_ma ?? 400,
        beiYong.ti_shi ?? huoQuFanYi('liaoTian', 'yinYongXiaoXiFeiFa'),
      )
    }
    // 自引用（第六种非法形态）在好友链路上构造不出：新行 ID 由建表语句的 gen_random_uuid() 现生成，
    // 且本路由没有 幂等键 重放口径；判据仍是 services/消息.ts::shiZiYinYong 那一份，
    // 结构面由迁移 036 的 CHECK ("ID" <> "被引用消息ID") 兜底（任何写口都落不进自引用）。
    const chaRu = await 数据库.query(HAO_YOU_YU_JU.插入消息, [
      yongHu.yongHuId,
      jieShouZheId,
      neiRong,
      leiXing,
      meiTiId || null,
      luoKuKuai ? JSON.stringify(luoKuKuai) : null,
      beiYong.id ?? null,
    ])
    try {
      const { chuangJianTongZhi } = await import('../services/通知')
      await chuangJianTongZhi({ jie_shou_zhe_id: jieShouZheId, biao_ti: huoQuFanYi('tongZhi', 'xinHaoYouXiaoXiBiaoTi'), nei_rong: neiRong.slice(0, 50) || huoQuFanYi('tongZhi', 'xinHaoYouXiaoXiFallback') })
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
